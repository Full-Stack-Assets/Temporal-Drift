#include "BTTFHeroCharacter.h"
#include "VehicleInteractionComponent.h"
#include "MissionInteractable.h"
#include "DialogueInteractable.h"
#include "DialogueSubsystem.h"
#include "MissionCoordinatorSubsystem.h"
#include "HeroCombatComponent.h"
#include "HeroStealthComponent.h"
#include "KeyboardCameraStateComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "Camera/CameraComponent.h"
#include "Components/InputComponent.h"
#include "Engine/SkeletalMesh.h"
#include "EngineUtils.h"
#include "DeLoreanVehicle.h"
#include "GameFramework/PlayerController.h"
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

    KeyboardCamera = CreateDefaultSubobject<UKeyboardCameraStateComponent>(TEXT("KeyboardCamera"));
    TArray<FKeyboardCameraPreset> HeroCameraPresets;
    {
        FKeyboardCameraPreset Chase;
        Chase.PresetName = TEXT("Chase");
        Chase.ArmLength = 350.0f;
        Chase.ArmSocketOffset = FVector(0.0f, 45.0f, 45.0f);
        Chase.ArmRotation = FRotator(-12.0f, 0.0f, 0.0f);
        HeroCameraPresets.Add(Chase);

        FKeyboardCameraPreset Shoulder;
        Shoulder.PresetName = TEXT("Shoulder");
        Shoulder.ArmLength = 250.0f;
        Shoulder.ArmSocketOffset = FVector(0.0f, 85.0f, 35.0f);
        Shoulder.ArmRotation = FRotator(-8.0f, 18.0f, 0.0f);
        HeroCameraPresets.Add(Shoulder);
    }
    KeyboardCamera->SetPresets(HeroCameraPresets);
    KeyboardCamera->SetManagedSpringArm(CameraBoom);

    VehicleInteraction = CreateDefaultSubobject<UVehicleInteractionComponent>(TEXT("VehicleInteraction"));
    Combat = CreateDefaultSubobject<UHeroCombatComponent>(TEXT("Combat"));
    Stealth = CreateDefaultSubobject<UHeroStealthComponent>(TEXT("Stealth"));
}

void ABTTFHeroCharacter::BeginPlay()
{
    Super::BeginPlay();
    SafeTransform = GetActorTransform();
    bHasSafeTransform = true;
}

void ABTTFHeroCharacter::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);
    UpdateKeyboardCameraInput(DeltaSeconds);
}

void ABTTFHeroCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
    Super::SetupPlayerInputComponent(PlayerInputComponent);
    PlayerInputComponent->BindAxis(TEXT("MoveForward"), this, &ABTTFHeroCharacter::MoveForward);
    PlayerInputComponent->BindAxis(TEXT("MoveRight"), this, &ABTTFHeroCharacter::MoveRight);
    PlayerInputComponent->BindAction(TEXT("Jump"), IE_Pressed, this, &ACharacter::Jump);
    PlayerInputComponent->BindAction(TEXT("Jump"), IE_Released, this, &ACharacter::StopJumping);
    PlayerInputComponent->BindAction(TEXT("Sprint"), IE_Pressed, this, &ABTTFHeroCharacter::BeginSprint);
    PlayerInputComponent->BindAction(TEXT("Sprint"), IE_Released, this, &ABTTFHeroCharacter::EndSprint);
    PlayerInputComponent->BindAction(TEXT("Crouch"), IE_Pressed, this, &ABTTFHeroCharacter::ToggleCrouch);
    PlayerInputComponent->BindAction(TEXT("Interact"), IE_Pressed, this, &ABTTFHeroCharacter::Interact);
    PlayerInputComponent->BindKey(EKeys::C, IE_Pressed, this, &ABTTFHeroCharacter::CycleCameraPreset);
    PlayerInputComponent->BindKey(EKeys::V, IE_Pressed, this, &ABTTFHeroCharacter::ToggleAutoChaseCamera);
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

void ABTTFHeroCharacter::CycleCameraPreset()
{
    if (KeyboardCamera)
    {
        KeyboardCamera->CyclePreset();
    }
}

void ABTTFHeroCharacter::ToggleAutoChaseCamera()
{
    if (KeyboardCamera)
    {
        KeyboardCamera->ToggleAutoChase();
    }
}

void ABTTFHeroCharacter::UpdateKeyboardCameraInput(float DeltaSeconds)
{
    APlayerController* PlayerController = Cast<APlayerController>(Controller);
    if (!KeyboardCamera || !PlayerController || !IsLocallyControlled())
    {
        return;
    }

    const float YawInput =
        (PlayerController->IsInputKeyDown(EKeys::D) ? 1.0f : 0.0f) -
        (PlayerController->IsInputKeyDown(EKeys::A) ? 1.0f : 0.0f);
    const float PitchInput =
        (PlayerController->IsInputKeyDown(EKeys::W) ? 1.0f : 0.0f) -
        (PlayerController->IsInputKeyDown(EKeys::S) ? 1.0f : 0.0f);

    KeyboardCamera->ApplyYawInput(YawInput, DeltaSeconds);
    KeyboardCamera->ApplyPitchInput(PitchInput, DeltaSeconds);
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
