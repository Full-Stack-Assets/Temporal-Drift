#include "BTTFHeroCharacter.h"
#include "VehicleInteractionComponent.h"
#include "MissionInteractable.h"
#include "MissionCoordinatorSubsystem.h"
#include "HeroCombatComponent.h"
#include "HeroStealthComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "Camera/CameraComponent.h"
#include "Components/InputComponent.h"
#include "Engine/SkeletalMesh.h"
#include "EngineUtils.h"
#include "DeLoreanVehicle.h"

ABTTFHeroCharacter::ABTTFHeroCharacter()
{
    PrimaryActorTick.bCanEverTick = false;
    bUseControllerRotationYaw = false;
    GetCharacterMovement()->bOrientRotationToMovement = true;
    GetCharacterMovement()->RotationRate = FRotator(0, 540, 0);
    GetCharacterMovement()->MaxWalkSpeed = WalkSpeed;
    GetCharacterMovement()->JumpZVelocity = 520.0f;
    GetCharacterMovement()->AirControl = 0.35f;

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
    CameraBoom->bUsePawnControlRotation = true;

    FollowCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("FollowCamera"));
    FollowCamera->SetupAttachment(CameraBoom, USpringArmComponent::SocketName);
    FollowCamera->bUsePawnControlRotation = false;

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

void ABTTFHeroCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
    Super::SetupPlayerInputComponent(PlayerInputComponent);
    PlayerInputComponent->BindAxis(TEXT("MoveForward"), this, &ABTTFHeroCharacter::MoveForward);
    PlayerInputComponent->BindAxis(TEXT("MoveRight"), this, &ABTTFHeroCharacter::MoveRight);
    PlayerInputComponent->BindAxis(TEXT("Turn"), this, &APawn::AddControllerYawInput);
    PlayerInputComponent->BindAxis(TEXT("LookUp"), this, &APawn::AddControllerPitchInput);
    PlayerInputComponent->BindAction(TEXT("Jump"), IE_Pressed, this, &ACharacter::Jump);
    PlayerInputComponent->BindAction(TEXT("Jump"), IE_Released, this, &ACharacter::StopJumping);
    PlayerInputComponent->BindAction(TEXT("Sprint"), IE_Pressed, this, &ABTTFHeroCharacter::BeginSprint);
    PlayerInputComponent->BindAction(TEXT("Sprint"), IE_Released, this, &ABTTFHeroCharacter::EndSprint);
    PlayerInputComponent->BindAction(TEXT("Crouch"), IE_Pressed, this, &ABTTFHeroCharacter::ToggleCrouch);
    PlayerInputComponent->BindAction(TEXT("Interact"), IE_Pressed, this, &ABTTFHeroCharacter::Interact);
}

void ABTTFHeroCharacter::SetSprinting(bool bEnabled)
{
    bSprinting = bEnabled;
    if (GetCharacterMovement() && !GetCharacterMovement()->IsCrouching())
    {
        GetCharacterMovement()->MaxWalkSpeed = bSprinting ? SprintSpeed : WalkSpeed;
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
    if (NearestVehicle)
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
