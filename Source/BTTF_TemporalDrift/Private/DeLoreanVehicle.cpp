// DeLoreanVehicle.cpp - Updated Implementation
#include "DeLoreanVehicle.h"
#include "TemporalDriftSettings.h"
#include "DeLoreanWheel.h"
#include "TimeTravelSubsystem.h"
#include "ChaosVehicleMovementComponent.h"
#include "ChaosWheeledVehicleMovementComponent.h"
#include "ChaosVehicleWheel.h"
#include "GameFramework/SpringArmComponent.h"
#include "Camera/CameraComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Components/SceneComponent.h"
#include "NiagaraComponent.h"
#include "NiagaraSystem.h"
#include "TimeTravelPresentationComponent.h"
#include "KeyboardCameraStateComponent.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "InputActionValue.h"
#include "InputCoreTypes.h"
#include "GameFramework/PlayerController.h"
#include "PhysicsEngine/PhysicsAsset.h"
#include "DeLoreanTuningData.h"
#include "TemporalDriveSubsystem.h"

ADeLoreanVehicle::ADeLoreanVehicle()
{
    PrimaryActorTick.bCanEverTick = true;

    CurrentSpeedMph = 0.0f;
    InputTargetDate = UTemporalDriveSubsystem::GetDefaultDateForEra(InputTargetEra);
    // Redundant with the on-screen HUD and causes overlapping/ghosted world-space
    // text at certain camera angles, so keep it off by default. Toggle in the
    // editor per-instance if you need raw debug values while tuning.
    bShowDebugInfo = false;

    TimeTravelNiagaraComponent = CreateDefaultSubobject<UNiagaraComponent>(TEXT("TimeTravelNiagara"));
    TimeTravelNiagaraComponent->SetupAttachment(RootComponent);
    TimeTravelNiagaraComponent->SetAutoActivate(false);
    static ConstructorHelpers::FObjectFinder<UNiagaraSystem> TemporalVortexAsset(
        TEXT("/Game/Niagara/NS_TemporalVortex.NS_TemporalVortex"));
    if (TemporalVortexAsset.Succeeded())
    {
        TimeTravelNiagaraComponent->SetAsset(TemporalVortexAsset.Object);
    }

    TimeTravelPresentationComponent = CreateDefaultSubobject<UTimeTravelPresentationComponent>(TEXT("TimeTravelPresentation"));

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
    VisualCarBody->SetVisibility(false, true);
    VisualCarBody->SetHiddenInGame(true, true);

    HeroVisualRoot = CreateDefaultSubobject<USceneComponent>(TEXT("HeroVisualRoot"));
    HeroVisualRoot->SetupAttachment(GetMesh());

    UStaticMeshComponent* HeroPresentation = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("HeroPresentation"));
    HeroPresentation->SetupAttachment(HeroVisualRoot);
    HeroPresentation->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    HeroPresentation->SetGenerateOverlapEvents(false);
    static ConstructorHelpers::FObjectFinder<UStaticMesh> HeroMeshAsset(
        TEXT("/Game/Vehicles/DeLorean/Hero/SM_HeroTimeMachine.SM_HeroTimeMachine"));
    if (HeroMeshAsset.Succeeded())
    {
        HeroPresentation->SetStaticMesh(HeroMeshAsset.Object);
        HeroVisualMeshes.Add(HeroPresentation);
    }

    // Chase camera
    CameraSpringArm = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraSpringArm"));
    CameraSpringArm->SetupAttachment(RootComponent);
    CameraSpringArm->TargetArmLength = 525.0f;
    CameraSpringArm->SetRelativeLocation(FVector(0.0f, 0.0f, 105.0f));
    CameraSpringArm->SetRelativeRotation(FRotator(-7.0f, 0.0f, 0.0f));
    CameraSpringArm->SocketOffset = FVector(0.0f, 0.0f, 45.0f);
    // The prototype's giant cube floor can collapse a spring arm to the pawn
    // origin, hiding the vehicle. Keep a stable chase view in the test level.
    CameraSpringArm->bDoCollisionTest = false;
    CameraSpringArm->bEnableCameraLag = true;
    CameraSpringArm->CameraLagSpeed = 8.0f;
    CameraSpringArm->bInheritRoll = false;

    ChaseCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("ChaseCamera"));
    ChaseCamera->SetupAttachment(CameraSpringArm);

    KeyboardCamera = CreateDefaultSubobject<UKeyboardCameraStateComponent>(TEXT("KeyboardCamera"));
    TArray<FKeyboardCameraPreset> VehicleCameraPresets;
    {
        FKeyboardCameraPreset Chase;
        Chase.PresetName = TEXT("Chase");
        Chase.ArmLength = 525.0f;
        Chase.ArmSocketOffset = FVector(0.0f, 0.0f, 45.0f);
        Chase.ArmRotation = FRotator(-7.0f, 0.0f, 0.0f);
        VehicleCameraPresets.Add(Chase);

        FKeyboardCameraPreset Hood;
        Hood.PresetName = TEXT("Hood");
        Hood.ArmLength = 220.0f;
        Hood.ArmSocketOffset = FVector(205.0f, 0.0f, 50.0f);
        Hood.ArmRotation = FRotator(-8.0f, 0.0f, 0.0f);
        VehicleCameraPresets.Add(Hood);

        FKeyboardCameraPreset Bumper;
        Bumper.PresetName = TEXT("Bumper");
        Bumper.ArmLength = 55.0f;
        Bumper.ArmSocketOffset = FVector(275.0f, 0.0f, -20.0f);
        Bumper.ArmRotation = FRotator(-3.0f, 0.0f, 0.0f);
        VehicleCameraPresets.Add(Bumper);

        FKeyboardCameraPreset Cockpit;
        Cockpit.PresetName = TEXT("Cockpit");
        Cockpit.ArmLength = 0.0f;
        Cockpit.ArmSocketOffset = FVector(35.0f, -35.0f, 20.0f);
        Cockpit.ArmRotation = FRotator(0.0f, 0.0f, 0.0f);
        VehicleCameraPresets.Add(Cockpit);
    }
    KeyboardCamera->SetPresets(VehicleCameraPresets);
    KeyboardCamera->SetManagedSpringArm(CameraSpringArm);

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

        Movement->bLegacyWheelFrictionPosition = true;
    }

    ApplyTuningData(GetDefault<UDeLoreanTuningData>());
}

void ADeLoreanVehicle::ApplyTuningData(const UDeLoreanTuningData* TuningData)
{
    if (!TuningData)
    {
        return;
    }

    UChaosWheeledVehicleMovementComponent* Movement =
        Cast<UChaosWheeledVehicleMovementComponent>(GetVehicleMovementComponent());
    if (!Movement)
    {
        return;
    }

    Movement->Mass = TuningData->MassKg;
    Movement->EngineSetup.MaxRPM = TuningData->MaxRPM;
    Movement->EngineSetup.MaxTorque = TuningData->MaxTorqueNm;
    Movement->EngineSetup.TorqueCurve = TuningData->TorqueCurve;
    Movement->TransmissionSetup.ForwardGearRatios = TuningData->ForwardGearRatios;
    Movement->TransmissionSetup.ReverseGearRatios = {
        FMath::Abs(TuningData->ReverseGearRatio)};
    Movement->TransmissionSetup.FinalRatio = TuningData->FinalDriveRatio;

    const int32 WheelCount = Movement->GetNumWheels();
    for (int32 WheelIndex = 0; WheelIndex < WheelCount; ++WheelIndex)
    {
        if (UChaosVehicleWheel* Wheel = Movement->Wheels.IsValidIndex(WheelIndex)
            ? Movement->Wheels[WheelIndex].Get() : nullptr)
        {
            Wheel->SuspensionMaxRaise = TuningData->SuspensionMaxRaiseCm;
            Wheel->SuspensionMaxDrop = TuningData->SuspensionMaxDropCm;
            if (Wheel->AxleType == EAxleType::Front)
            {
                Wheel->MaxSteerAngle = TuningData->MaxSteerAngleDegrees;
            }
        }
    }
}

void ADeLoreanVehicle::BeginPlay()
{
    Super::BeginPlay();

    LastSafeTransform = GetActorTransform();
    ApplyTuningData(TuningDataAsset ? TuningDataAsset : GetDefault<UDeLoreanTuningData>());

    if (USkeletalMeshComponent* VehicleMesh = GetMesh())
    {
        // BP_DeLorean had Simulate Physics disabled in its saved component
        // defaults. Chaos can accept input in that state, but it cannot apply
        // drivetrain forces to the vehicle body.
        VehicleMesh->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
        VehicleMesh->SetSimulatePhysics(true);
        VehicleMesh->WakeAllRigidBodies();

        VehicleMesh->SetVisibility(false, false);
        VehicleMesh->SetHiddenInGame(true, false);
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

    InstallVehicleInputMapping();
}

void ADeLoreanVehicle::PawnClientRestart()
{
    Super::PawnClientRestart();
    InstallVehicleInputMapping();
}

void ADeLoreanVehicle::InstallVehicleInputMapping()
{
    if (APlayerController* PlayerController = Cast<APlayerController>(GetController()))
    {
        if (UEnhancedInputLocalPlayerSubsystem* Subsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(PlayerController->GetLocalPlayer()))
        {
            if (VehicleMappingContext)
            {
                Subsystem->RemoveMappingContext(VehicleMappingContext);
                Subsystem->AddMappingContext(VehicleMappingContext, 1);
                UE_LOG(LogTemp, Log, TEXT("DeLorean Enhanced Input context installed after possession"));
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
        if (HandbrakeAction)
        {
            EnhancedInputComponent->BindAction(HandbrakeAction, ETriggerEvent::Triggered, this, &ADeLoreanVehicle::HandleHandbrake);
            EnhancedInputComponent->BindAction(HandbrakeAction, ETriggerEvent::Completed, this, &ADeLoreanVehicle::HandleHandbrake);
        }
        if (ReverseAction)
        {
            EnhancedInputComponent->BindAction(ReverseAction, ETriggerEvent::Triggered, this, &ADeLoreanVehicle::HandleReverse);
            EnhancedInputComponent->BindAction(ReverseAction, ETriggerEvent::Completed, this, &ADeLoreanVehicle::HandleReverse);
        }
        if (ResetVehicleAction)
            EnhancedInputComponent->BindAction(ResetVehicleAction, ETriggerEvent::Triggered, this, &ADeLoreanVehicle::ResetVehicle);
        if (TimeCircuitsAction)
            EnhancedInputComponent->BindAction(TimeCircuitsAction, ETriggerEvent::Triggered, this, &ADeLoreanVehicle::ToggleTimeCircuits);
        if (TimeJumpAction)
            EnhancedInputComponent->BindAction(TimeJumpAction, ETriggerEvent::Triggered, this, &ADeLoreanVehicle::TryTimeTravelFromInput);
        if (ToggleCameraAction)
            EnhancedInputComponent->BindAction(ToggleCameraAction, ETriggerEvent::Triggered, this, &ADeLoreanVehicle::ToggleCamera);
        if (CycleDestinationAction)
            EnhancedInputComponent->BindAction(CycleDestinationAction, ETriggerEvent::Triggered, this, &ADeLoreanVehicle::HandleCycleDestination);
    }

    PlayerInputComponent->BindKey(EKeys::Up, IE_Pressed, this, &ADeLoreanVehicle::BeginForward);
    PlayerInputComponent->BindKey(EKeys::Up, IE_Released, this, &ADeLoreanVehicle::EndForward);
    PlayerInputComponent->BindKey(EKeys::Left, IE_Pressed, this, &ADeLoreanVehicle::BeginSteerLeft);
    PlayerInputComponent->BindKey(EKeys::Left, IE_Released, this, &ADeLoreanVehicle::EndSteerLeft);
    PlayerInputComponent->BindKey(EKeys::Right, IE_Pressed, this, &ADeLoreanVehicle::BeginSteerRight);
    PlayerInputComponent->BindKey(EKeys::Right, IE_Released, this, &ADeLoreanVehicle::EndSteerRight);
    PlayerInputComponent->BindKey(EKeys::Down, IE_Pressed, this, &ADeLoreanVehicle::BeginReverse);
    PlayerInputComponent->BindKey(EKeys::Down, IE_Released, this, &ADeLoreanVehicle::EndReverse);
    PlayerInputComponent->BindKey(EKeys::Gamepad_FaceButton_Right, IE_Pressed, this, &ADeLoreanVehicle::BeginReverse);
    PlayerInputComponent->BindKey(EKeys::Gamepad_FaceButton_Right, IE_Released, this, &ADeLoreanVehicle::EndReverse);
    PlayerInputComponent->BindKey(EKeys::H, IE_Pressed, this, &ADeLoreanVehicle::ToggleHoverMode);
    PlayerInputComponent->BindKey(EKeys::Gamepad_DPad_Up, IE_Pressed, this, &ADeLoreanVehicle::ToggleHoverMode);
    // Keep the core time-circuit loop independent of an optional Enhanced
    // Input asset or diagnostic polling fallback.
    PlayerInputComponent->BindKey(EKeys::Q, IE_Pressed, this, &ADeLoreanVehicle::SelectPreviousDestination);
    PlayerInputComponent->BindKey(EKeys::E, IE_Pressed, this, &ADeLoreanVehicle::SelectNextDestination);
    PlayerInputComponent->BindKey(EKeys::T, IE_Pressed, this, &ADeLoreanVehicle::ToggleTimeCircuits);
    PlayerInputComponent->BindKey(EKeys::F, IE_Pressed, this, &ADeLoreanVehicle::TryTimeTravelFromInput);
    PlayerInputComponent->BindKey(EKeys::C, IE_Pressed, this, &ADeLoreanVehicle::ToggleCamera);
    PlayerInputComponent->BindKey(EKeys::R, IE_Pressed, this, &ADeLoreanVehicle::ResetVehicle);
}

void ADeLoreanVehicle::SelectPreviousDestination()
{
    CycleDestinationEra(-1);
}

void ADeLoreanVehicle::SelectNextDestination()
{
    CycleDestinationEra(1);
}

void ADeLoreanVehicle::HandleThrottle(const FInputActionValue& Value)
{
    TargetThrottleInput = Value.Get<float>();
}

void ADeLoreanVehicle::HandleSteering(const FInputActionValue& Value)
{
    TargetSteeringInput = Value.Get<float>();
}

void ADeLoreanVehicle::HandleBrake(const FInputActionValue& Value)
{
    TargetBrakeInput = Value.Get<float>();
}

void ADeLoreanVehicle::HandleHandbrake(const FInputActionValue& Value)
{
    if (UChaosVehicleMovementComponent* Movement = GetVehicleMovementComponent())
    {
        Movement->SetHandbrakeInput(Value.Get<bool>());
    }
}

void ADeLoreanVehicle::HandleReverse(const FInputActionValue& Value)
{
    bReverseKeyPressed = Value.Get<bool>();
    ApplyDigitalDriveInput(bForwardKeyPressed, bReverseKeyPressed, bLeftKeyPressed, bRightKeyPressed);
}

void ADeLoreanVehicle::BeginReverse()
{
    bReverseKeyPressed = true;
    ApplyDigitalDriveInput(bForwardKeyPressed, bReverseKeyPressed, bLeftKeyPressed, bRightKeyPressed);
}

void ADeLoreanVehicle::EndReverse()
{
    bReverseKeyPressed = false;
    ApplyDigitalDriveInput(bForwardKeyPressed, bReverseKeyPressed, bLeftKeyPressed, bRightKeyPressed);
}

void ADeLoreanVehicle::BeginForward()
{
    bForwardKeyPressed = true;
    ApplyDigitalDriveInput(bForwardKeyPressed, bReverseKeyPressed, bLeftKeyPressed, bRightKeyPressed);
}

void ADeLoreanVehicle::EndForward()
{
    bForwardKeyPressed = false;
    ApplyDigitalDriveInput(bForwardKeyPressed, bReverseKeyPressed, bLeftKeyPressed, bRightKeyPressed);
}

void ADeLoreanVehicle::BeginSteerLeft()
{
    bLeftKeyPressed = true;
    ApplyDigitalDriveInput(bForwardKeyPressed, bReverseKeyPressed, bLeftKeyPressed, bRightKeyPressed);
}

void ADeLoreanVehicle::EndSteerLeft()
{
    bLeftKeyPressed = false;
    ApplyDigitalDriveInput(bForwardKeyPressed, bReverseKeyPressed, bLeftKeyPressed, bRightKeyPressed);
}

void ADeLoreanVehicle::BeginSteerRight()
{
    bRightKeyPressed = true;
    ApplyDigitalDriveInput(bForwardKeyPressed, bReverseKeyPressed, bLeftKeyPressed, bRightKeyPressed);
}

void ADeLoreanVehicle::EndSteerRight()
{
    bRightKeyPressed = false;
    ApplyDigitalDriveInput(bForwardKeyPressed, bReverseKeyPressed, bLeftKeyPressed, bRightKeyPressed);
}

void ADeLoreanVehicle::HandleCycleDestination(const FInputActionValue& Value)
{
    const float Direction = Value.Get<float>();
    if (!FMath::IsNearlyZero(Direction))
    {
        CycleDestinationEra(Direction < 0.0f ? -1 : 1);
    }
}

void ADeLoreanVehicle::ToggleTimeCircuits()
{
    bTimeCircuitsOn = !bTimeCircuitsOn;
    if (TimeTravelSubsystem)
    {
        TimeTravelSubsystem->SetTimeCircuitsArmed(bTimeCircuitsOn);
    }
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
    if (USkeletalMeshComponent* Body = GetMesh())
    {
        Body->SetEnableGravity(!bHoverModeActive);
        Body->SetPhysicsAngularVelocityInRadians(FVector::ZeroVector);
        if (bHoverModeActive)
        {
            Body->SetPhysicsLinearVelocity(
                FVector(Body->GetPhysicsLinearVelocity().X, Body->GetPhysicsLinearVelocity().Y, 0.0f));
        }
    }
    if (UChaosVehicleMovementComponent* Movement = GetVehicleMovementComponent())
    {
        Movement->SetThrottleInput(0.0f);
        Movement->SetBrakeInput(0.0f);
        Movement->SetSteeringInput(0.0f);
        Movement->SetHandbrakeInput(false);
        Movement->SetUseAutomaticGears(!bHoverModeActive);
    }
    UE_LOG(LogTemp, Log, TEXT("Hover mode %s"), bHoverModeActive ? TEXT("ENGAGED") : TEXT("DISENGAGED"));
    if (GEngine)
    {
        GEngine->AddOnScreenDebugMessage(
            -1, 1.5f, bHoverModeActive ? FColor::Cyan : FColor::Silver,
            bHoverModeActive ? TEXT("Hover mode ON") : TEXT("Hover mode OFF"));
    }
}

void ADeLoreanVehicle::UpdateHoverMode(float DeltaTime)
{
    UPrimitiveComponent* Body = GetMesh();
    if (!Body || !Body->IsSimulatingPhysics())
    {
        return;
    }

    if (!bHoverModeActive)
    {
        Body->SetEnableGravity(true);
        return;
    }
    Body->SetEnableGravity(false);

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
        const float VerticalAcceleration = FMath::Clamp(
            Gravity + SpringForce, -HoverMaxVerticalAcceleration, HoverMaxVerticalAcceleration);
        const FVector Force = FVector(0, 0, VerticalAcceleration) * Body->GetMass();
        Body->AddForce(Force);
    }

    const FVector StabilizationTorque = CalculateHoverStabilizationTorque(
        GetActorUpVector(), Body->GetPhysicsAngularVelocityInRadians(), Body->GetMass());
    Body->AddTorqueInRadians(StabilizationTorque, NAME_None, false);

    const APlayerController* PlayerController = Cast<APlayerController>(GetController());
    const bool bLiveForward = bForwardKeyPressed ||
        (PlayerController && PlayerController->IsInputKeyDown(EKeys::Up));
    const bool bLiveReverse = bReverseKeyPressed ||
        (PlayerController && PlayerController->IsInputKeyDown(EKeys::Down));
    const bool bLiveLeft = bLeftKeyPressed ||
        (PlayerController && PlayerController->IsInputKeyDown(EKeys::Left));
    const bool bLiveRight = bRightKeyPressed ||
        (PlayerController && PlayerController->IsInputKeyDown(EKeys::Right));

    const float ForwardCommand = (bLiveForward ? 1.0f : 0.0f) - (bLiveReverse ? 1.0f : 0.0f);
    Body->AddForce(GetActorForwardVector() * ForwardCommand * HoverForwardAcceleration * Body->GetMass());

    const float DigitalYaw = (bLiveRight ? 1.0f : 0.0f) - (bLiveLeft ? 1.0f : 0.0f);
    const float AnalogYaw = GetVehicleMovementComponent()
        ? GetVehicleMovementComponent()->GetSteeringInput() : 0.0f;
    const float YawCommand = FMath::Clamp(
        FMath::Abs(DigitalYaw) > KINDA_SMALL_NUMBER ? DigitalYaw : AnalogYaw, -1.0f, 1.0f);
    Body->AddTorqueInRadians(
        FVector::UpVector * YawCommand * HoverYawAcceleration, NAME_None, true);
}

FVector ADeLoreanVehicle::CalculateHoverStabilizationTorque(const FVector& CurrentUp,
    const FVector& AngularVelocityRadians, float BodyMass) const
{
    const FVector NormalizedUp = CurrentUp.GetSafeNormal(SMALL_NUMBER, FVector::UpVector);
    const FVector TiltAxis = FVector::CrossProduct(NormalizedUp, FVector::UpVector);
    const float YawRate = FVector::DotProduct(AngularVelocityRadians, FVector::UpVector);
    const FVector TiltAngularVelocity = AngularVelocityRadians - FVector::UpVector * YawRate;
    return (TiltAxis * HoverStabilizationStrength - TiltAngularVelocity * HoverAngularDamping) *
        FMath::Max(BodyMass, 1.0f);
}

void ADeLoreanVehicle::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);

    if (bEnableDiagnosticKeyboardFallback)
    {
        ApplyKeyboardFallback();
    }
    UpdateSpeedometer();
    UpdateFluxCapacitor(DeltaTime);
    UpdateKeyboardCameraInput(DeltaTime);
    UpdateHoverMode(DeltaTime);
    if (!bReverseKeyPressed && !bHoverModeActive)
    {
        ApplySmoothedVehicleInput(DeltaTime);
    }
    UpdateSpeedResponsiveCamera(DeltaTime);
    UpdateSafeTransformIfStable();

    if (bReverseKeyPressed && !bHoverModeActive)
    {
        if (UChaosVehicleMovementComponent* Movement = GetVehicleMovementComponent())
        {
            Movement->SetUseAutomaticGears(false);
            Movement->SetTargetGear(-1, true);
            Movement->SetBrakeInput(0.0f);
            Movement->SetThrottleInput(1.0f);
        }

        // The prototype Chaos rig can select reverse without producing usable
        // wheel torque on every machine. Apply a bounded physical assist so the
        // reverse control always results in visible backward motion while still
        // retaining steering, collision, suspension, and the configured gearbox.
        if (USkeletalMeshComponent* Body = GetMesh(); Body && Body->IsSimulatingPhysics())
        {
            const float BackwardSpeedCmPerSecond =
                -FVector::DotProduct(Body->GetPhysicsLinearVelocity(), GetActorForwardVector());
            const float MaxReverseSpeedCmPerSecond = ReverseAssistMaxSpeedMph * 44.704f;
            if (BackwardSpeedCmPerSecond < MaxReverseSpeedCmPerSecond)
            {
                Body->AddForce(-GetActorForwardVector() * ReverseAssistAcceleration * Body->GetMass());
            }
        }
    }

    if (bShowDebugInfo && TimeTravelSubsystem)
    {
        TimeTravelSubsystem->DebugDrawFluxStatus(this);
    }

    if (TimeTravelPresentationComponent && TimeTravelSubsystem)
    {
        TimeTravelPresentationComponent->UpdateVehicleDrivingContext(
            CurrentSpeedMph, TimeTravelSubsystem->GetFluxChargePercent(), TimeTravelSubsystem->CurrentParadoxLevel);
    }
}

void ADeLoreanVehicle::UpdateKeyboardCameraInput(float DeltaTime)
{
    APlayerController* PlayerController = Cast<APlayerController>(GetController());
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

    KeyboardCamera->ApplyYawInput(YawInput, DeltaTime);
    KeyboardCamera->ApplyPitchInput(PitchInput, DeltaTime);
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
    const bool bReversePressed = PlayerController->IsInputKeyDown(EKeys::Down);
    const float Throttle = PlayerController->IsInputKeyDown(EKeys::Up) ? 1.0f : 0.0f;
    const float Steering =
        (PlayerController->IsInputKeyDown(EKeys::Right) ? 1.0f : 0.0f) -
        (PlayerController->IsInputKeyDown(EKeys::Left) ? 1.0f : 0.0f);
    const float Brake = PlayerController->IsInputKeyDown(EKeys::SpaceBar) ? 1.0f : 0.0f;

    if (bReversePressed != bLastKeyboardReverse)
    {
        ApplyReverseInput(bReversePressed);
        bLastKeyboardReverse = bReversePressed;
    }
    ApplyVehicleInput(bReversePressed ? 1.0f : Throttle, Steering, Brake, PlayerController->IsInputKeyDown(EKeys::SpaceBar));

    if (PlayerController->WasInputKeyJustPressed(EKeys::R))
    {
        ResetVehicle();
    }
    if (PlayerController->WasInputKeyJustPressed(EKeys::C))
    {
        ToggleCamera();
    }
    if (PlayerController->WasInputKeyJustPressed(EKeys::V))
    {
        ToggleAutoChaseCamera();
    }
    if (PlayerController->WasInputKeyJustPressed(EKeys::Q))
    {
        CycleDestinationEra(-1);
    }
    if (PlayerController->WasInputKeyJustPressed(EKeys::E))
    {
        CycleDestinationEra(1);
    }
    if (PlayerController->WasInputKeyJustPressed(EKeys::T))
    {
        ToggleTimeCircuits();
    }
    if (PlayerController->WasInputKeyJustPressed(EKeys::F))
    {
        TryTimeTravelFromInput();
    }
    if (PlayerController->WasInputKeyJustPressed(EKeys::H))
    {
        ToggleHoverMode();
    }

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
    TargetThrottleInput = FMath::Clamp(Throttle, -1.0f, 1.0f);
    TargetSteeringInput = FMath::Clamp(Steering, -1.0f, 1.0f);
    TargetBrakeInput = FMath::Clamp(Brake, 0.0f, 1.0f);
    SmoothedThrottleInput = TargetThrottleInput;
    SmoothedSteeringInput = TargetSteeringInput;
    SmoothedBrakeInput = TargetBrakeInput;
    if (UChaosVehicleMovementComponent* Movement = GetVehicleMovementComponent())
    {
        Movement->SetThrottleInput(SmoothedThrottleInput);
        Movement->SetSteeringInput(SmoothedSteeringInput);
        Movement->SetBrakeInput(SmoothedBrakeInput);
        Movement->SetHandbrakeInput(bHandbrake);
    }
}

void ADeLoreanVehicle::ApplySmoothedVehicleInput(float DeltaTime)
{
    const float Alpha = FMath::Clamp(InputSmoothingRate * DeltaTime, 0.0f, 1.0f);
    SmoothedThrottleInput = FMath::Lerp(SmoothedThrottleInput, TargetThrottleInput, Alpha);
    SmoothedSteeringInput = FMath::Lerp(SmoothedSteeringInput, TargetSteeringInput, Alpha);
    SmoothedBrakeInput = FMath::Lerp(SmoothedBrakeInput, TargetBrakeInput, Alpha);

    if (UChaosVehicleMovementComponent* Movement = GetVehicleMovementComponent())
    {
        Movement->SetThrottleInput(SmoothedThrottleInput);
        Movement->SetSteeringInput(SmoothedSteeringInput);
        Movement->SetBrakeInput(SmoothedBrakeInput);
    }
}

void ADeLoreanVehicle::UpdateSpeedResponsiveCamera(float DeltaTime)
{
    if (!ChaseCamera || ActiveCameraIndex != 0)
    {
        return;
    }

    const UDeLoreanTuningData* Tuning = TuningDataAsset ? TuningDataAsset : GetDefault<UDeLoreanTuningData>();
    const float SpeedAlpha = FMath::Clamp(
        (CurrentSpeedMph - 20.0f) / FMath::Max(Tuning->ChaseHighSpeedMph - 20.0f, 1.0f), 0.0f, 1.0f);
    const float TargetFov = FMath::Lerp(Tuning->ChaseBaseFov, Tuning->ChaseHighSpeedFov, SpeedAlpha);
    ChaseCamera->FieldOfView = FMath::FInterpTo(ChaseCamera->FieldOfView, TargetFov, DeltaTime, 4.0f);

    if (CameraSpringArm)
    {
        const float TargetLag = FMath::Lerp(8.0f, 5.0f, SpeedAlpha);
        CameraSpringArm->CameraLagSpeed = FMath::FInterpTo(CameraSpringArm->CameraLagSpeed, TargetLag, DeltaTime, 3.0f);
        if (TimeTravelPresentationComponent && TimeTravelPresentationComponent->IsCueActive())
        {
            const float Shake = FMath::Sin(GetWorld()->GetTimeSeconds() * 24.0f)
                * TimeTravelPresentationComponent->GetCueIntensity() * 0.35f;
            ChaseCamera->FieldOfView = FMath::Clamp(ChaseCamera->FieldOfView + Shake, 65.0f, 100.0f);
        }
    }
}

void ADeLoreanVehicle::UpdateSafeTransformIfStable()
{
    if (CurrentSpeedMph < 3.0f && !bIsTimeTraveling && !bHoverModeActive)
    {
        LastSafeTransform = GetActorTransform();
    }
}

void ADeLoreanVehicle::ApplyDigitalDriveInput(bool bForward, bool bReverse, bool bLeft, bool bRight)
{
    bForwardKeyPressed = bForward;
    bReverseKeyPressed = bReverse;
    bLeftKeyPressed = bLeft;
    bRightKeyPressed = bRight;

    if (bReverse)
    {
        ApplyReverseInput(true);
        bDigitalReverseApplied = true;
    }
    else
    {
        if (bDigitalReverseApplied)
        {
            ApplyReverseInput(false);
            bDigitalReverseApplied = false;
        }
        if (UChaosVehicleMovementComponent* Movement = GetVehicleMovementComponent())
        {
            TargetThrottleInput = (!bHoverModeActive && bForward) ? 1.0f : 0.0f;
            SmoothedThrottleInput = TargetThrottleInput;
            Movement->SetThrottleInput(SmoothedThrottleInput);
        }
    }

    TargetSteeringInput = (bRight ? 1.0f : 0.0f) - (bLeft ? 1.0f : 0.0f);
    SmoothedSteeringInput = TargetSteeringInput;
    if (UChaosVehicleMovementComponent* Movement = GetVehicleMovementComponent())
    {
        Movement->SetSteeringInput(bHoverModeActive ? 0.0f : SmoothedSteeringInput);
    }
}

void ADeLoreanVehicle::ApplyReverseInput(bool bPressed)
{
    if (UChaosVehicleMovementComponent* Movement = GetVehicleMovementComponent())
    {
        Movement->SetUseAutomaticGears(false);
        Movement->SetTargetGear(bPressed ? -1 : 1, true);
        Movement->SetBrakeInput(0.0f);
        Movement->SetThrottleInput(bPressed ? 1.0f : 0.0f);
        if (!bPressed)
        {
            Movement->SetUseAutomaticGears(true);
        }
        UE_LOG(
            LogTemp,
            Log,
            TEXT("Reverse input %s: targetGear=%d throttle=%.1f"),
            bPressed ? TEXT("PRESSED") : TEXT("RELEASED"),
            Movement->GetTargetGear(),
            Movement->GetThrottleInput());
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

void ADeLoreanVehicle::ToggleCamera()
{
    if (KeyboardCamera)
    {
        ActiveCameraIndex = KeyboardCamera->CyclePreset();
        return;
    }

    ActiveCameraIndex = (ActiveCameraIndex + 1) % 4;
    if (!CameraSpringArm)
    {
        return;
    }

    static const float ArmLengths[] = {525.0f, 220.0f, 55.0f, 0.0f};
    static const FVector ArmLocations[] = {
        FVector(0.0f, 0.0f, 105.0f),
        FVector(205.0f, 0.0f, 155.0f),
        FVector(275.0f, 0.0f, 85.0f),
        FVector(35.0f, -35.0f, 125.0f)};
    static const FRotator ArmRotations[] = {
        FRotator(-7.0f, 0.0f, 0.0f),
        FRotator(-8.0f, 0.0f, 0.0f),
        FRotator(-3.0f, 0.0f, 0.0f),
        FRotator(0.0f, 0.0f, 0.0f)};

    CameraSpringArm->TargetArmLength = ArmLengths[ActiveCameraIndex];
    CameraSpringArm->SetRelativeLocation(ArmLocations[ActiveCameraIndex]);
    CameraSpringArm->SetRelativeRotation(ArmRotations[ActiveCameraIndex]);
}

void ADeLoreanVehicle::ToggleAutoChaseCamera()
{
    if (KeyboardCamera)
    {
        KeyboardCamera->ToggleAutoChase();
        if (GEngine)
        {
            GEngine->AddOnScreenDebugMessage(
                -1, 1.5f, FColor::Cyan,
                KeyboardCamera->IsAutoChaseEnabled()
                    ? TEXT("Auto-chase camera ON")
                    : TEXT("Auto-chase camera OFF"));
        }
    }
}

void ADeLoreanVehicle::CycleDestinationEra(int32 Direction)
{
    static const ETimelineState SupportedEras[] = {
        ETimelineState::Past1955,
        ETimelineState::Present1985,
        ETimelineState::Alternate1985,
        ETimelineState::Future2015,
        ETimelineState::DeepFuture2045,
        ETimelineState::WildWest1885};

    int32 CurrentIndex = 0;
    for (int32 Index = 0; Index < UE_ARRAY_COUNT(SupportedEras); ++Index)
    {
        if (SupportedEras[Index] == InputTargetEra)
        {
            CurrentIndex = Index;
            break;
        }
    }

    const int32 Step = Direction < 0 ? -1 : 1;
    CurrentIndex = (CurrentIndex + Step + UE_ARRAY_COUNT(SupportedEras)) % UE_ARRAY_COUNT(SupportedEras);
    InputTargetEra = SupportedEras[CurrentIndex];
    InputTargetDate = UTemporalDriveSubsystem::GetDefaultDateForEra(InputTargetEra);
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

    const UTemporalDriftSettings* TravelSettings = GetDefault<UTemporalDriftSettings>();
    const bool bAboveChargeSpeed = CurrentSpeedMph >= TravelSettings->FluxChargeStartSpeedMph;
    TimeTravelSubsystem->SetFluxCharging(bAboveChargeSpeed);
    if (bAboveChargeSpeed)
    {
        float ChargeRate = TravelSettings->EnergyPerSecondAtThreshold * DeltaTime;

        if (CurrentSpeedMph >= TravelSettings->JumpSpeedThresholdMph)
            ChargeRate *= 1.4f;

        TimeTravelSubsystem->AddFluxEnergy(ChargeRate);
    }
}

void ADeLoreanVehicle::TryTimeTravel(ETimelineState TargetEra)
{
    if (TimeTravelSubsystem)
    {
        FTimeTravelRequest Request;
        Request.Destination = TargetEra;
        Request.Origin = GetActorLocation();
        Request.EntrySpeedMph = CurrentSpeedMph;
        if (TimeTravelSubsystem->RequestTimeTravel(Request))
        {
            StartTimeTravelEffects();
        }
    }
}

void ADeLoreanVehicle::StartTimeTravelEffects()
{
    bIsTimeTraveling = true;
    if (TimeTravelPresentationComponent)
    {
        TimeTravelPresentationComponent->HandlePhaseChanged(
            TimeTravelSubsystem ? TimeTravelSubsystem->GetTimeTravelPhase() : ETimeTravelPhase::Departing);
    }
}

void ADeLoreanVehicle::EndTimeTravelEffects()
{
    bIsTimeTraveling = false;
    if (TimeTravelPresentationComponent)
    {
        TimeTravelPresentationComponent->HandlePhaseChanged(ETimeTravelPhase::Idle);
    }
}

void ADeLoreanVehicle::ApplyRadiationDamage(float Amount)
{
    // Apply damage to vehicle health or flux capacitor stability
    UE_LOG(LogTemp, Warning, TEXT("DeLorean took %.1f Hawking Radiation damage"), Amount);
}
