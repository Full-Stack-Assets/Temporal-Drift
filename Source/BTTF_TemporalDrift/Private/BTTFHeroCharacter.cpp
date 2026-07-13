#include "BTTFHeroCharacter.h"
#include "VehicleInteractionComponent.h"
#include "KeyboardCameraComponent.h"
#include "MissionInteractable.h"
#include "DialogueInteractable.h"
#include "DialogueSubsystem.h"
#include "MissionCoordinatorSubsystem.h"
#include "HeroCombatComponent.h"
#include "HeroStealthComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "GameFramework/PlayerController.h"
#include "Camera/CameraComponent.h"
#include "Components/InputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "Engine/SkeletalMesh.h"
#include "EngineUtils.h"
#include "DeLoreanVehicle.h"
#include "InputCoreTypes.h"

ABTTFHeroCharacter::ABTTFHeroCharacter()
{
    PrimaryActorTick.bCanEverTick = true;
    bUseControllerRotationYaw = false;
    GetCharacterMovement()->bOrientRotationToMovement = true;
    GetCharacterMovement()->RotationRate = FRotator(0, 540, 0);
    GetCharacterMovement()->MaxWalkSpeed = WalkSpeed;
    GetCharacterMovement()->JumpZVelocity = 520.0f;
    GetCharacterMovement()->AirControl = 0.35f;
    GetCharacterMovement()->MaxAcceleration = 1800.0f;
    GetCharacterMovement()->BrakingDecelerationWalking = 1400.0f;
    GetCharacterMovement()->GroundFriction = 7.5f;

    static ConstructorHelpers::FObjectFinder<USkeletalMesh> MannyMesh(
        TEXT("/Game/Characters/Hero/SK_Hero1985.SK_Hero1985"));
    if (MannyMesh.Succeeded())
    {
        GetMesh()->SetSkeletalMesh(MannyMesh.Object);
        GetMesh()->SetRelativeLocation(FVector(0.0f, 0.0f, -88.0f));
        GetMesh()->SetRelativeRotation(FRotator(0.0f, -90.0f, 0.0f));
    }

    CameraBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
    CameraBoom->SetupAttachment(RootComponent);
    CameraBoom->TargetArmLength = 350.0f;
    CameraBoom->bUsePawnControlRotation = false;
    CameraBoom->bEnableCameraLag = true;
    CameraBoom->CameraLagSpeed = 10.0f;
    CameraBoom->bDoCollisionTest = true;
    CameraBoom->bInheritRoll = false;

    FollowCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("FollowCamera"));
    FollowCamera->SetupAttachment(CameraBoom, USpringArmComponent::SocketName);
    FollowCamera->bUsePawnControlRotation = false;

    KeyboardCamera = CreateDefaultSubobject<UKeyboardCameraComponent>(TEXT("KeyboardCamera"));

    VehicleInteraction = CreateDefaultSubobject<UVehicleInteractionComponent>(TEXT("VehicleInteraction"));
    Combat = CreateDefaultSubobject<UHeroCombatComponent>(TEXT("Combat"));
    Stealth = CreateDefaultSubobject<UHeroStealthComponent>(TEXT("Stealth"));
}

void ABTTFHeroCharacter::BeginPlay()
{
    Super::BeginPlay();
    SafeTransform = GetActorTransform();
    bHasSafeTransform = true;

    if (KeyboardCamera && CameraBoom)
    {
        TArray<FKeyboardCameraPreset> Presets;
        FKeyboardCameraPreset Chase;
        Chase.TargetArmLength = 350.0f;
        Chase.RelativeLocation = FVector::ZeroVector;
        Chase.RelativeRotation = FRotator::ZeroRotator;
        Chase.ChasePitchOffset = -12.0f;
        Presets.Add(Chase);

        FKeyboardCameraPreset Shoulder;
        Shoulder.TargetArmLength = 210.0f;
        Shoulder.RelativeLocation = FVector(0.0f, 55.0f, 35.0f);
        Shoulder.RelativeRotation = FRotator::ZeroRotator;
        Shoulder.ChasePitchOffset = -8.0f;
        Presets.Add(Shoulder);

        KeyboardCamera->ConfigureSpringArm(CameraBoom, Presets);
        KeyboardCamera->ResetCameraState();
    }

    InstallHeroInputMapping();
}

void ABTTFHeroCharacter::PawnClientRestart()
{
    Super::PawnClientRestart();
    InstallHeroInputMapping();
    if (KeyboardCamera)
    {
        KeyboardCamera->ResetCameraState();
    }
}

void ABTTFHeroCharacter::InstallHeroInputMapping()
{
    if (APlayerController* PlayerController = Cast<APlayerController>(GetController()))
    {
        if (UEnhancedInputLocalPlayerSubsystem* Subsystem =
                ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(PlayerController->GetLocalPlayer()))
        {
            if (UInputMappingContext* VehicleContext = LoadObject<UInputMappingContext>(
                    nullptr, TEXT("/Game/Input/IMC_DeLorean.IMC_DeLorean")))
            {
                Subsystem->RemoveMappingContext(VehicleContext);
            }
            if (HeroMappingContext)
            {
                Subsystem->RemoveMappingContext(HeroMappingContext);
                Subsystem->AddMappingContext(HeroMappingContext, 0);
            }
        }
    }
}

void ABTTFHeroCharacter::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);
    UpdateMovementFacingYaw();
}

void ABTTFHeroCharacter::UpdateMovementFacingYaw()
{
    if (!Controller || !KeyboardCamera)
    {
        return;
    }

    const float CameraYaw = GetActorRotation().Yaw + KeyboardCamera->GetOrbitYaw();
    FRotator ControlRotation = Controller->GetControlRotation();
    ControlRotation.Yaw = CameraYaw;
    ControlRotation.Pitch = KeyboardCamera->GetOrbitPitch();
    Controller->SetControlRotation(ControlRotation);
}

void ABTTFHeroCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
    Super::SetupPlayerInputComponent(PlayerInputComponent);
    PlayerInputComponent->BindAxis(TEXT("MoveForward"), this, &ABTTFHeroCharacter::MoveForward);
    PlayerInputComponent->BindAxis(TEXT("MoveRight"), this, &ABTTFHeroCharacter::MoveRight);
    PlayerInputComponent->BindAxis(TEXT("CameraOrbitYaw"), this, &ABTTFHeroCharacter::CameraOrbitYaw);
    PlayerInputComponent->BindAxis(TEXT("CameraOrbitPitch"), this, &ABTTFHeroCharacter::CameraOrbitPitch);
    PlayerInputComponent->BindAction(TEXT("Jump"), IE_Pressed, this, &ACharacter::Jump);
    PlayerInputComponent->BindAction(TEXT("Jump"), IE_Released, this, &ACharacter::StopJumping);
    PlayerInputComponent->BindAction(TEXT("Sprint"), IE_Pressed, this, &ABTTFHeroCharacter::BeginSprint);
    PlayerInputComponent->BindAction(TEXT("Sprint"), IE_Released, this, &ABTTFHeroCharacter::EndSprint);
    PlayerInputComponent->BindAction(TEXT("Crouch"), IE_Pressed, this, &ABTTFHeroCharacter::ToggleCrouch);
    PlayerInputComponent->BindAction(TEXT("Interact"), IE_Pressed, this, &ABTTFHeroCharacter::Interact);
    PlayerInputComponent->BindKey(EKeys::C, IE_Pressed, this, &ABTTFHeroCharacter::CycleCameraPreset);
    PlayerInputComponent->BindKey(EKeys::V, IE_Pressed, this, &ABTTFHeroCharacter::ToggleAutoChase);
}

void ABTTFHeroCharacter::CameraOrbitYaw(float Value)
{
    if (!KeyboardCamera || FMath::IsNearlyZero(Value))
    {
        return;
    }

    const float DeltaTime = GetWorld() ? GetWorld()->GetDeltaSeconds() : 0.016f;
    KeyboardCamera->ApplyOrbitInput(Value, 0.0f, DeltaTime);
}

void ABTTFHeroCharacter::CameraOrbitPitch(float Value)
{
    if (!KeyboardCamera || FMath::IsNearlyZero(Value))
    {
        return;
    }

    const float DeltaTime = GetWorld() ? GetWorld()->GetDeltaSeconds() : 0.016f;
    KeyboardCamera->ApplyOrbitInput(0.0f, Value, DeltaTime);
}

void ABTTFHeroCharacter::CycleCameraPreset()
{
    if (KeyboardCamera)
    {
        KeyboardCamera->CyclePreset();
    }
}

void ABTTFHeroCharacter::ToggleAutoChase()
{
    if (KeyboardCamera)
    {
        KeyboardCamera->ToggleAutoChase();
    }
}

void ABTTFHeroCharacter::SetSprinting(bool bEnabled)
{
    bSprinting = bEnabled;
    if (UCharacterMovementComponent* Movement = GetCharacterMovement())
    {
        if (!Movement->IsCrouching())
        {
            const float TargetSpeed = bSprinting ? SprintSpeed : WalkSpeed;
            Movement->MaxWalkSpeed = FMath::FInterpTo(Movement->MaxWalkSpeed, TargetSpeed,
                GetWorld() ? GetWorld()->GetDeltaSeconds() : 0.016f, 8.0f);
        }
    }
}

void ABTTFHeroCharacter::BeginSprint() { SetSprinting(true); }
void ABTTFHeroCharacter::EndSprint() { SetSprinting(false); }

void ABTTFHeroCharacter::ToggleCrouch()
{
    if (!GetCharacterMovement()) return;
    if (GetCharacterMovement()->IsCrouching())
    {
        UnCrouch();
        GetCharacterMovement()->MaxWalkSpeed = bSprinting ? SprintSpeed : WalkSpeed;
    }
    else
    {
        Crouch();
        GetCharacterMovement()->MaxWalkSpeed = CrouchSpeed;
    }
}

void ABTTFHeroCharacter::Interact()
{
    if (!GetWorld()) return;

    if (UGameInstance* GameInstance = GetWorld()->GetGameInstance())
    {
        if (UDialogueSubsystem* Dialogue = GameInstance->GetSubsystem<UDialogueSubsystem>())
        {
            if (Dialogue->IsConversationActive())
            {
                if (!Dialogue->GetAvailableChoices().IsEmpty())
                {
                    const TArray<FDialogueChoice> Choices = Dialogue->GetAvailableChoices();
                    Dialogue->SelectChoice(Choices[0].ChoiceId);
                }
                else if (Dialogue->CanAdvanceConversation())
                {
                    Dialogue->AdvanceConversation();
                }
                return;
            }
        }
    }

    ADialogueInteractable* NearestDialogue = nullptr;
    float NearestDialogueDistanceSq = TNumericLimits<float>::Max();
    for (TActorIterator<ADialogueInteractable> It(GetWorld()); It; ++It)
    {
        const float DistanceSq = FVector::DistSquared(GetActorLocation(), It->GetActorLocation());
        if (DistanceSq < NearestDialogueDistanceSq)
        {
            NearestDialogueDistanceSq = DistanceSq;
            NearestDialogue = *It;
        }
    }
    if (NearestDialogue && NearestDialogue->TryStartConversation(this))
    {
        return;
    }

    AMissionInteractable* NearestInteractable = nullptr;
    float NearestInteractableDistanceSq = TNumericLimits<float>::Max();
    for (TActorIterator<AMissionInteractable> It(GetWorld()); It; ++It)
    {
        if (!It->CanInteract(this))
        {
            continue;
        }
        const float DistanceSq = FVector::DistSquared(GetActorLocation(), It->GetActorLocation());
        if (DistanceSq < NearestInteractableDistanceSq)
        {
            NearestInteractableDistanceSq = DistanceSq;
            NearestInteractable = *It;
        }
    }
    if (NearestInteractable && NearestInteractable->Interact(this))
    {
        return;
    }

    if (TryInteractMissionTaggedActor())
    {
        return;
    }

    ADeLoreanVehicle* NearestVehicle = nullptr;
    float NearestDistanceSq = TNumericLimits<float>::Max();
    for (TActorIterator<ADeLoreanVehicle> It(GetWorld()); It; ++It)
    {
        const float DistanceSq = FVector::DistSquared(GetActorLocation(), It->GetActorLocation());
        if (DistanceSq < NearestDistanceSq)
        {
            NearestDistanceSq = DistanceSq;
            NearestVehicle = *It;
        }
    }
    if (NearestVehicle && VehicleInteraction->CanEnterVehicle(NearestVehicle))
    {
        VehicleInteraction->EnterVehicle(NearestVehicle);
    }
}

bool ABTTFHeroCharacter::TryInteractMissionTaggedActor()
{
    if (!GetWorld())
    {
        return false;
    }

    UMissionCoordinatorSubsystem* Coordinator = GetWorld()->GetSubsystem<UMissionCoordinatorSubsystem>();
    if (!Coordinator)
    {
        return false;
    }

    const float RadiusSq = FMath::Square(MissionTagInteractRadius);
    AActor* NearestTaggedActor = nullptr;
    FName NearestEventId = NAME_None;
    float NearestDistanceSq = TNumericLimits<float>::Max();

    for (TActorIterator<AActor> It(GetWorld()); It; ++It)
    {
        if (It->IsA<AMissionInteractable>() || *It == this)
        {
            continue;
        }

        FName EventId = NAME_None;
        for (const FName& Tag : It->Tags)
        {
            const FString TagString = Tag.ToString();
            if (TagString.StartsWith(TEXT("MissionEvent_")))
            {
                EventId = FName(*TagString.RightChop(13));
                break;
            }
        }

        if (EventId.IsNone())
        {
            continue;
        }

        const float DistanceSq = FVector::DistSquared(GetActorLocation(), It->GetActorLocation());
        if (DistanceSq > RadiusSq || DistanceSq >= NearestDistanceSq)
        {
            continue;
        }

        NearestDistanceSq = DistanceSq;
        NearestTaggedActor = *It;
        NearestEventId = EventId;
    }

    return NearestTaggedActor && Coordinator->SubmitMissionEvent(NearestEventId);
}

void ABTTFHeroCharacter::ResetToSafeTransform()
{
    if (!bHasSafeTransform) return;
    if (UCharacterMovementComponent* Movement = GetCharacterMovement())
    {
        Movement->StopMovementImmediately();
    }
    SetActorTransform(SafeTransform, false, nullptr, ETeleportType::TeleportPhysics);
}

void ABTTFHeroCharacter::MoveForward(float Value)
{
    if (Controller && !FMath::IsNearlyZero(Value))
    {
        const FRotator Rotation(0, Controller->GetControlRotation().Yaw, 0);
        AddMovementInput(FRotationMatrix(Rotation).GetUnitAxis(EAxis::X), Value);
    }
}

void ABTTFHeroCharacter::MoveRight(float Value)
{
    if (Controller && !FMath::IsNearlyZero(Value))
    {
        const FRotator Rotation(0, Controller->GetControlRotation().Yaw, 0);
        AddMovementInput(FRotationMatrix(Rotation).GetUnitAxis(EAxis::Y), Value);
    }
}
