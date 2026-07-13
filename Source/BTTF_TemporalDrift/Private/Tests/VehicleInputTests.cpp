#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "DeLoreanVehicle.h"
#include "ChaosVehicleMovementComponent.h"
#include "Engine/World.h"
#include "GameFramework/SpringArmComponent.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFVehicleInputNormalizationTest,
    "BTTF.Vehicle.Input.NormalizesControlValues",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFVehicleInputNormalizationTest::RunTest(const FString& Parameters)
{
    UWorld* World = UWorld::CreateWorld(EWorldType::Game, false, TEXT("VehicleInputTestWorld"));
    UClass* VehicleClass = LoadClass<ADeLoreanVehicle>(
        nullptr, TEXT("/Game/Blueprints/BP_DeLorean.BP_DeLorean_C"));
    ADeLoreanVehicle* Vehicle = World->SpawnActor<ADeLoreanVehicle>(VehicleClass);
    TestNotNull(TEXT("Vehicle spawns"), Vehicle);
    if (!Vehicle)
    {
        return false;
    }

    Vehicle->ApplyVehicleInput(2.0f, -2.0f, 1.5f, true);
    UChaosVehicleMovementComponent* Movement =
        Vehicle->GetVehicleMovementComponent();

    TestEqual(TEXT("Throttle clamps to one"), Movement->GetThrottleInput(), 1.0f);
    TestEqual(TEXT("Steering clamps to negative one"), Movement->GetSteeringInput(), -1.0f);
    TestEqual(TEXT("Brake clamps to one"), Movement->GetBrakeInput(), 1.0f);
    TestTrue(TEXT("Handbrake is applied"), Movement->GetHandbrakeInput());
    TestFalse(TEXT("Diagnostic keyboard fallback is disabled by default"),
        Vehicle->bEnableDiagnosticKeyboardFallback);
    const bool bPassed = !HasAnyErrors();
    World->DestroyWorld(false);
    return bPassed;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFVehicleResetTest,
    "BTTF.Vehicle.Input.ResetRestoresSafeTransform",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFVehicleResetTest::RunTest(const FString& Parameters)
{
    UWorld* World = UWorld::CreateWorld(EWorldType::Game, false, TEXT("VehicleResetTestWorld"));
    UClass* VehicleClass = LoadClass<ADeLoreanVehicle>(
        nullptr, TEXT("/Game/Blueprints/BP_DeLorean.BP_DeLorean_C"));
    ADeLoreanVehicle* Vehicle = World->SpawnActor<ADeLoreanVehicle>(
        VehicleClass,
        FVector(100.0f, 200.0f, 300.0f), FRotator::ZeroRotator);
    TestNotNull(TEXT("Vehicle spawns"), Vehicle);
    if (!Vehicle)
    {
        return false;
    }

    const FTransform SafeTransform(FRotator(0.0f, 90.0f, 0.0f), FVector(500.0f, 600.0f, 700.0f));
    Vehicle->SetLastSafeTransform(SafeTransform);
    Vehicle->SetActorTransform(FTransform(FRotator(130.0f, 15.0f, 80.0f), FVector(0.0f, 0.0f, -1000.0f)));
    Vehicle->ResetVehicle();

    TestTrue(TEXT("Reset location matches safe location"),
        Vehicle->GetActorLocation().Equals(SafeTransform.GetLocation(), 1.0f));
    TestTrue(TEXT("Reset rotation is upright"),
        Vehicle->GetActorRotation().Equals(SafeTransform.Rotator(), 1.0f));
    const bool bPassed = !HasAnyErrors();
    World->DestroyWorld(false);
    return bPassed;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFVehicleReverseGearTest,
    "BTTF.Vehicle.Input.ReverseSelectsReverseGear",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFVehicleReverseGearTest::RunTest(const FString& Parameters)
{
    ADeLoreanVehicle* Vehicle = NewObject<ADeLoreanVehicle>();
    Vehicle->ApplyReverseInput(true);
    UChaosVehicleMovementComponent* Movement = Vehicle->GetVehicleMovementComponent();
    TestEqual(TEXT("Reverse input selects reverse gear"), Movement->GetTargetGear(), -1);
    TestEqual(TEXT("Reverse gear receives positive drive throttle"), Movement->GetThrottleInput(), 1.0f);

    Vehicle->ApplyReverseInput(false);
    TestEqual(TEXT("Releasing reverse restores first gear"), Movement->GetTargetGear(), 1);
    TestEqual(TEXT("Releasing reverse clears throttle"), Movement->GetThrottleInput(), 0.0f);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFVehicleArrowKeyContractTest,
    "BTTF.Vehicle.Input.ArrowKeysDriveDirectly",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFVehicleArrowKeyContractTest::RunTest(const FString& Parameters)
{
    ADeLoreanVehicle* Vehicle = NewObject<ADeLoreanVehicle>();
    UChaosVehicleMovementComponent* Movement = Vehicle->GetVehicleMovementComponent();

    Vehicle->ApplyDigitalDriveInput(true, false, true, false);
    TestEqual(TEXT("Up arrow applies full forward throttle"), Movement->GetThrottleInput(), 1.0f);
    TestEqual(TEXT("Left arrow applies full left steering"), Movement->GetSteeringInput(), -1.0f);

    Vehicle->ApplyDigitalDriveInput(false, false, false, true);
    TestEqual(TEXT("Released Up arrow clears throttle"), Movement->GetThrottleInput(), 0.0f);
    TestEqual(TEXT("Right arrow applies full right steering"), Movement->GetSteeringInput(), 1.0f);

    Vehicle->ApplyDigitalDriveInput(false, true, false, false);
    TestEqual(TEXT("Down arrow selects reverse gear"), Movement->GetTargetGear(), -1);
    TestEqual(TEXT("Down arrow applies reverse drive"), Movement->GetThrottleInput(), 1.0f);

    Vehicle->ApplyDigitalDriveInput(false, false, false, false);
    TestEqual(TEXT("Releasing all arrows restores first gear"), Movement->GetTargetGear(), 1);
    TestEqual(TEXT("Releasing all arrows clears steering"), Movement->GetSteeringInput(), 0.0f);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFVehicleHoverStabilityTest,
    "BTTF.Vehicle.Hover.StabilityContract",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFVehicleHoverStabilityTest::RunTest(const FString& Parameters)
{
    const ADeLoreanVehicle* Vehicle = GetDefault<ADeLoreanVehicle>();
    TestFalse(TEXT("Chase camera does not inherit vehicle roll"), Vehicle->CameraSpringArm->bInheritRoll);

    const FVector TiltedUp = FVector(0.0f, 0.5f, 0.8660254f).GetSafeNormal();
    const FVector CorrectiveAxis = FVector::CrossProduct(TiltedUp, FVector::UpVector).GetSafeNormal();
    const FVector Torque = Vehicle->CalculateHoverStabilizationTorque(
        TiltedUp, FVector::ZeroVector, 1500.0f);
    TestTrue(TEXT("Hover torque corrects vehicle tilt"), FVector::DotProduct(Torque, CorrectiveAxis) > 0.0f);
    TestTrue(TEXT("Hover torque remains finite"), !Torque.ContainsNaN());
    const FVector DampingTorque = Vehicle->CalculateHoverStabilizationTorque(
        FVector::UpVector, FVector(2.0f, 0.0f, 0.0f), 1500.0f);
    TestTrue(TEXT("Hover torque damps roll velocity"), DampingTorque.X < 0.0f);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFVehicleCameraCycleTest,
    "BTTF.Vehicle.Input.CameraCyclesAllPresets",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFVehicleCameraCycleTest::RunTest(const FString& Parameters)
{
    ADeLoreanVehicle* Vehicle = NewObject<ADeLoreanVehicle>();
    TestEqual(TEXT("Camera starts on chase preset"), Vehicle->GetActiveCameraIndex(), 0);

    Vehicle->ToggleCamera();
    TestEqual(TEXT("First toggle selects hood preset"), Vehicle->GetActiveCameraIndex(), 1);
    Vehicle->ToggleCamera();
    TestEqual(TEXT("Second toggle selects bumper preset"), Vehicle->GetActiveCameraIndex(), 2);
    Vehicle->ToggleCamera();
    TestEqual(TEXT("Third toggle selects cockpit preset"), Vehicle->GetActiveCameraIndex(), 3);
    Vehicle->ToggleCamera();
    TestEqual(TEXT("Fourth toggle wraps to chase preset"), Vehicle->GetActiveCameraIndex(), 0);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFDestinationCycleTest,
    "BTTF.Vehicle.Input.DestinationCyclesSupportedEras",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFDestinationCycleTest::RunTest(const FString& Parameters)
{
    ADeLoreanVehicle* Vehicle = NewObject<ADeLoreanVehicle>();
    Vehicle->InputTargetEra = ETimelineState::Past1955;

    Vehicle->CycleDestinationEra(1);
    TestEqual(TEXT("Forward cycle selects 1985"), Vehicle->InputTargetEra, ETimelineState::Present1985);
    Vehicle->CycleDestinationEra(-1);
    TestEqual(TEXT("Backward cycle returns to 1955"), Vehicle->InputTargetEra, ETimelineState::Past1955);
    Vehicle->CycleDestinationEra(-1);
    TestEqual(TEXT("Backward cycle wraps to 1885"), Vehicle->InputTargetEra, ETimelineState::WildWest1885);
    return true;
}

#endif
