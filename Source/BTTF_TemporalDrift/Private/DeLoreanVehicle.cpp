// DeLoreanVehicle.cpp - Updated Implementation
#include "DeLoreanVehicle.h"
#include "DeLoreanWheel.h"
#include "TimeTravelSubsystem.h"
#include "ChaosVehicleMovementComponent.h"
#include "ChaosWheeledVehicleMovementComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "Camera/CameraComponent.h"
#include "Components/StaticMeshComponent.h"
#include "NiagaraComponent.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "InputActionValue.h"
#include "InputCoreTypes.h"
#include "GameFramework/PlayerController.h"
#include "PhysicsEngine/PhysicsAsset.h"

ADeLoreanVehicle::ADeLoreanVehicle()
{
    // Required for speedometer + flux charging; AActor defaults this to false.
    PrimaryActorTick.bCanEverTick = true;

    CurrentSpeedMph = 0.0f;
    // Redundant with the on-screen HUD and causes overlapping/ghosted world-space
    // text at certain camera angles, so keep it off by default. Toggle in the
    // editor per-instance if you need raw debug values while tuning.
    bShowDebugInfo = false;

    TimeTravelNiagaraComponent = CreateDefaultSubobject<UNiagaraComponent>(TEXT("TimeTravelNiagara"));
    TimeTravelNiagaraComponent->SetupAttachment(RootComponent);
    TimeTravelNiagaraComponent->SetAutoActivate(false);

    VisualCarBody = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("VisualCarBody"));
    VisualCarBody->SetupAttachment(GetMesh());
    VisualCarBody->SetRelativeRotation(FRotator::ZeroRotator);
    VisualCarBody->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    VisualCarBody->SetGenerateOverlapEvents(false);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> CarBodyAsset(
        TEXT("/Game/Vehicles/SportsCar/SM_SportsCar.SM_SportsCar"));
    if (CarBodyAsset.Succeeded())
    {
        VisualCarBody->SetStaticMesh(CarBodyAsset.Object);
    }

    // Chase camera
    CameraSpringArm = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraSpringArm"));
    CameraSpringArm->SetupAttachment(RootComponent);
    CameraSpringArm->TargetArmLength = 800.0f;
    CameraSpringArm->SetRelativeLocation(FVector(0.0f, 0.0f, 175.0f));
    CameraSpringArm->SetRelativeRotation(FRotator(-12.0f, 0.0f, 0.0f));
    CameraSpringArm->SocketOffset = FVector(0.0f, 0.0f, 100.0f);
    // The prototype's giant cube floor can collapse a spring arm to the pawn
    // origin, hiding the vehicle. Keep a stable chase view in the test level.
    CameraSpringArm->bDoCollisionTest = false;
    CameraSpringArm->bEnableCameraLag = true;
    CameraSpringArm->CameraLagSpeed = 8.0f;

    ChaseCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("ChaseCamera"));
    ChaseCamera->SetupAttachment(CameraSpringArm);

    // Chaos wheel setup (bone names match the UE5 SportsCar template skeleton)
    if (UChaosWheeledVehicleMovementComponent* Movement = Cast<UChaosWheeledVehicleMovementComponent>(GetVehicleMovementComponent()))
    {
        Movement->WheelSetups.SetNum(4);
        Movement->WheelSetups[0].WheelClass = UDeLoreanWheelFront::StaticClass();
        Movement->WheelSetups[0].BoneName = FName("Phys_Wheel_FL");
        Movement->WheelSetups[1].WheelClass = UDeLoreanWheelFront::StaticClass();
        Movement->WheelSetups[1].BoneName = FName("Phys_Wheel_FR");
        Movement->WheelSetups[2].WheelClass = UDeLoreanWheelRear::StaticClass();
        Movement->WheelSetups[2].BoneName = FName("Phys_Wheel_BL");
        Movement->WheelSetups[3].WheelClass = UDeLoreanWheelRear::StaticClass();
        Movement->WheelSetups[3].BoneName = FName("Phys_Wheel_BR");

        Movement->EngineSetup.MaxRPM = 6500.0f;
        Movement->EngineSetup.MaxTorque = 500.0f;
        // Chaos disables mechanical simulation when the normalized torque curve
        // is empty. Supply a broad street-engine curve so throttle can drive the
        // vehicle across the full RPM range.
        if (FRichCurve* TorqueCurve = Movement->EngineSetup.TorqueCurve.GetRichCurve())
        {
            TorqueCurve->Reset();
            TorqueCurve->AddKey(0.0f, 0.70f);
            TorqueCurve->AddKey(1500.0f, 0.90f);
            TorqueCurve->AddKey(3500.0f, 1.00f);
            TorqueCurve->AddKey(5500.0f, 0.85f);
            TorqueCurve->AddKey(6500.0f, 0.60f);
        }
        Movement->Mass = 1300.0f;
        Movement->bLegacyWheelFrictionPosition = true;
    }
}

void ADeLoreanVehicle::BeginPlay()
{
    Super::BeginPlay();

    LastSafeTransform = GetActorTransform();

    if (USkeletalMeshComponent* VehicleMesh = GetMesh())
    {
        // BP_DeLorean had Simulate Physics disabled in its saved component
        // defaults. Chaos can accept input in that state, but it cannot apply
        // drivetrain forces to the vehicle body.
        VehicleMesh->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
        VehicleMesh->SetSimulatePhysics(true);
        VehicleMesh->WakeAllRigidBodies();

        VehicleMesh->SetVisibility(true, true);
        VehicleMesh->SetHiddenInGame(false, true);
        VehicleMesh->SetOwnerNoSee(false);
        VehicleMesh->SetOnlyOwnerSee(false);
        VehicleMesh->SetRenderInMainPass(true);
        VehicleMesh->SetRenderInDepthPass(true);
        VehicleMesh->MarkRenderStateDirty();

        UE_LOG(
            LogTemp,
            Log,
            TEXT("DeLorean mesh runtime: actor=%s location=%s controller=%s asset=%s visible=%d hidden=%d materials=%d simulating=%d collision=%d physicsAsset=%s"),
            *GetName(),
            *GetActorLocation().ToCompactString(),
            *GetNameSafe(GetController()),
            VehicleMesh->GetSkeletalMeshAsset()
                ? *VehicleMesh->GetSkeletalMeshAsset()->GetPathName()
                : TEXT("None"),
            VehicleMesh->IsVisible() ? 1 : 0,
            VehicleMesh->bHiddenInGame ? 1 : 0,
            VehicleMesh->GetNumMaterials(),
            VehicleMesh->IsSimulatingPhysics() ? 1 : 0,
            static_cast<int32>(VehicleMesh->GetCollisionEnabled()),
            *GetNameSafe(VehicleMesh->GetPhysicsAsset()));
    }

    InitializeTimeTravelSubsystem();

    // Subsystem owns the 2.5s jump window; end vehicle-side effects when it completes,
    // otherwise bIsTimeTraveling stays true forever and flux charging is permanently blocked.
    if (TimeTravelSubsystem)
    {
        TimeTravelSubsystem->OnTimeTravelCompleted.AddDynamic(this, &ADeLoreanVehicle::EndTimeTravelEffects);
    }

    // Add input mapping context
    if (APlayerController* PlayerController = Cast<APlayerController>(GetController()))
    {
        if (UEnhancedInputLocalPlayerSubsystem* Subsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(PlayerController->GetLocalPlayer()))
        {
            if (VehicleMappingContext)
            {
                Subsystem->AddMappingContext(VehicleMappingContext, 0);
            }
        }
    }
}

void ADeLoreanVehicle::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
    Super::SetupPlayerInputComponent(PlayerInputComponent);

    if (UEnhancedInputComponent* EnhancedInputComponent = Cast<UEnhancedInputComponent>(PlayerInputComponent))
    {
        if (ThrottleAction)
        {
            EnhancedInputComponent->BindAction(ThrottleAction, ETriggerEvent::Triggered, this, &ADeLoreanVehicle::HandleThrottle);
            EnhancedInputComponent->BindAction(ThrottleAction, ETriggerEvent::Completed, this, &ADeLoreanVehicle::HandleThrottle);
        }
        if (SteeringAction)
        {
            EnhancedInputComponent->BindAction(SteeringAction, ETriggerEvent::Triggered, this, &ADeLoreanVehicle::HandleSteering);
            EnhancedInputComponent->BindAction(SteeringAction, ETriggerEvent::Completed, this, &ADeLoreanVehicle::HandleSteering);
        }
        if (BrakeAction)
        {
            EnhancedInputComponent->BindAction(BrakeAction, ETriggerEvent::Triggered, this, &ADeLoreanVehicle::HandleBrake);
            EnhancedInputComponent->BindAction(BrakeAction, ETriggerEvent::Completed, this, &ADeLoreanVehicle::HandleBrake);
        }
    }
}

void ADeLoreanVehicle::HandleThrottle(const FInputActionValue& Value)
{
    if (UChaosVehicleMovementComponent* Movement = Cast<UChaosVehicleMovementComponent>(GetVehicleMovementComponent()))
    {
        Movement->SetThrottleInput(Value.Get<float>());
    }
}

void ADeLoreanVehicle::HandleSteering(const FInputActionValue& Value)
{
    if (UChaosVehicleMovementComponent* Movement = Cast<UChaosVehicleMovementComponent>(GetVehicleMovementComponent()))
    {
        Movement->SetSteeringInput(Value.Get<float>());
    }
}

void ADeLoreanVehicle::HandleBrake(const FInputActionValue& Value)
{
    if (UChaosVehicleMovementComponent* Movement = Cast<UChaosVehicleMovementComponent>(GetVehicleMovementComponent()))
    {
        Movement->SetBrakeInput(Value.Get<float>());
    }
}

void ADeLoreanVehicle::ToggleTimeCircuits()
{
    bTimeCircuitsOn = !bTimeCircuitsOn;
    UE_LOG(LogTemp, Log, TEXT("Time circuits %s"), bTimeCircuitsOn ? TEXT("ON") : TEXT("OFF"));
}

void ADeLoreanVehicle::TryTimeTravelFromInput()
{
    if (!bTimeCircuitsOn)
    {
        UE_LOG(LogTemp, Warning, TEXT("Time jump requested but time circuits are off"));
        return;
    }
    TryTimeTravel(InputTargetEra);
}

void ADeLoreanVehicle::ToggleHoverMode()
{
    bHoverModeActive = !bHoverModeActive;
    UE_LOG(LogTemp, Log, TEXT("Hover mode %s"), bHoverModeActive ? TEXT("ENGAGED") : TEXT("DISENGAGED"));
}

void ADeLoreanVehicle::UpdateHoverMode(float DeltaTime)
{
    UPrimitiveComponent* Body = Cast<UPrimitiveComponent>(GetRootComponent());
    if (!Body || !Body->IsSimulatingPhysics())
    {
        return;
    }

    if (!bHoverModeActive)
    {
        return;
    }

    // Maintain the target hover height with a spring-damper force.
    FHitResult Hit;
    const FVector Start = GetActorLocation();
    const FVector End = Start - FVector(0, 0, HoverTargetHeight * 2.0f);
    FCollisionQueryParams Params;
    Params.AddIgnoredActor(this);

    if (GetWorld()->LineTraceSingleByChannel(Hit, Start, End, ECC_Visibility, Params))
    {
        const float CurrentHeight = Start.Z - Hit.ImpactPoint.Z;
        const float HeightError = HoverTargetHeight - CurrentHeight;
        const float VerticalVelocity = Body->GetPhysicsLinearVelocity().Z;

        // Spring force counteracts gravity plus corrects height; damping prevents oscillation.
        const float Gravity = -GetWorld()->GetGravityZ();
        const float SpringForce = HeightError * HoverSpringStrength - VerticalVelocity * HoverDamping;
        const FVector Force = FVector(0, 0, Gravity + SpringForce) * Body->GetMass();
        Body->AddForce(Force);
    }
}

void ADeLoreanVehicle::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);

    ApplyKeyboardFallback();
    UpdateSpeedometer();
    UpdateFluxCapacitor(DeltaTime);
    UpdateHoverMode(DeltaTime);

    if (bShowDebugInfo && TimeTravelSubsystem)
    {
        TimeTravelSubsystem->DebugDrawFluxStatus(this);
    }
}

void ADeLoreanVehicle::ApplyKeyboardFallback()
{
    APlayerController* PlayerController = Cast<APlayerController>(GetController());
    UChaosVehicleMovementComponent* Movement =
        Cast<UChaosVehicleMovementComponent>(GetVehicleMovementComponent());
    if (!PlayerController || !Movement || !IsLocallyControlled())
    {
        return;
    }

    // Poll the physical keys every frame. This remains dependable even if an
    // Enhanced Input mapping asset is missing, not applied, or initialized
    // before possession completes.
    const float Throttle =
        (PlayerController->IsInputKeyDown(EKeys::W) ? 1.0f : 0.0f) -
        (PlayerController->IsInputKeyDown(EKeys::S) ? 1.0f : 0.0f);
    const float Steering =
        (PlayerController->IsInputKeyDown(EKeys::D) ? 1.0f : 0.0f) -
        (PlayerController->IsInputKeyDown(EKeys::A) ? 1.0f : 0.0f);
    const float Brake = PlayerController->IsInputKeyDown(EKeys::SpaceBar) ? 1.0f : 0.0f;

    ApplyVehicleInput(Throttle, Steering, Brake, PlayerController->IsInputKeyDown(EKeys::SpaceBar));

    if (!FMath::IsNearlyEqual(Throttle, LastKeyboardThrottle) ||
        !FMath::IsNearlyEqual(Steering, LastKeyboardSteering) ||
        !FMath::IsNearlyEqual(Brake, LastKeyboardBrake))
    {
        const UChaosWheeledVehicleMovementComponent* WheeledMovement =
            Cast<UChaosWheeledVehicleMovementComponent>(Movement);
        UE_LOG(
            LogTemp,
            Log,
            TEXT("Keyboard vehicle input: actor=%s location=%s throttle=%.1f steering=%.1f brake=%.1f meshSim=%d forwardSpeed=%.1f gear=%d engineRPM=%.1f"),
            *GetName(),
            *GetActorLocation().ToCompactString(),
            Throttle,
            Steering,
            Brake,
            GetMesh() && GetMesh()->IsSimulatingPhysics() ? 1 : 0,
            Movement->GetForwardSpeed(),
            WheeledMovement ? WheeledMovement->GetCurrentGear() : 0,
            WheeledMovement ? WheeledMovement->GetEngineRotationSpeed() : 0.0f);
        LastKeyboardThrottle = Throttle;
        LastKeyboardSteering = Steering;
        LastKeyboardBrake = Brake;
    }
}

void ADeLoreanVehicle::ApplyVehicleInput(
    float Throttle,
    float Steering,
    float Brake,
    bool bHandbrake)
{
    if (UChaosVehicleMovementComponent* Movement = GetVehicleMovementComponent())
    {
        Movement->SetThrottleInput(FMath::Clamp(Throttle, -1.0f, 1.0f));
        Movement->SetSteeringInput(FMath::Clamp(Steering, -1.0f, 1.0f));
        Movement->SetBrakeInput(FMath::Clamp(Brake, 0.0f, 1.0f));
        Movement->SetHandbrakeInput(bHandbrake);
    }
}

void ADeLoreanVehicle::SetLastSafeTransform(const FTransform& SafeTransform)
{
    LastSafeTransform = SafeTransform;
}

void ADeLoreanVehicle::ResetVehicle()
{
    if (USkeletalMeshComponent* VehicleMesh = GetMesh())
    {
        VehicleMesh->SetPhysicsLinearVelocity(FVector::ZeroVector);
        VehicleMesh->SetPhysicsAngularVelocityInDegrees(FVector::ZeroVector);
    }

    SetActorTransform(LastSafeTransform, false, nullptr, ETeleportType::TeleportPhysics);

    if (USkeletalMeshComponent* VehicleMesh = GetMesh())
    {
        VehicleMesh->WakeAllRigidBodies();
    }
}

void ADeLoreanVehicle::InitializeTimeTravelSubsystem()
{
    TimeTravelSubsystem = GetWorld()->GetSubsystem<UTimeTravelSubsystem>();
}

float ADeLoreanVehicle::GetCurrentSpeedMph() const
{
    return CurrentSpeedMph;
}

void ADeLoreanVehicle::UpdateSpeedometer()
{
    if (const UChaosVehicleMovementComponent* Movement = GetVehicleMovementComponent())
    {
        // GetForwardSpeed() returns cm/s; 1 cm/s = 0.0223694 mph.
        CurrentSpeedMph = FMath::Abs(Movement->GetForwardSpeed()) * 0.0223694f;
    }
    else
    {
        CurrentSpeedMph = 0.0f;
    }
}

void ADeLoreanVehicle::UpdateFluxCapacitor(float DeltaTime)
{
    if (!TimeTravelSubsystem || bIsTimeTraveling) return;

    if (CurrentSpeedMph >= 80.0f)
    {
        float ChargeRate = TimeTravelSubsystem->EnergyPerSecondAt88mph * DeltaTime;

        if (CurrentSpeedMph >= 87.0f)
            ChargeRate *= 1.4f; // Bonus near 88 mph

        TimeTravelSubsystem->AddFluxEnergy(ChargeRate);
    }
}

void ADeLoreanVehicle::TryTimeTravel(ETimelineState TargetEra)
{
    if (TimeTravelSubsystem && TimeTravelSubsystem->CanPerformTimeTravel(this))
    {
        TimeTravelSubsystem->PerformTimeTravel(this, TargetEra);
        StartTimeTravelEffects();
    }
}

void ADeLoreanVehicle::StartTimeTravelEffects()
{
    bIsTimeTraveling = true;
    if (TimeTravelNiagaraComponent)
    {
        TimeTravelNiagaraComponent->Activate(true);
    }
}

void ADeLoreanVehicle::EndTimeTravelEffects()
{
    bIsTimeTraveling = false;
    if (TimeTravelNiagaraComponent)
    {
        TimeTravelNiagaraComponent->Deactivate();
    }
}

void ADeLoreanVehicle::ApplyRadiationDamage(float Amount)
{
    // Apply damage to vehicle health or flux capacitor stability
    UE_LOG(LogTemp, Warning, TEXT("DeLorean took %.1f Hawking Radiation damage"), Amount);
}
