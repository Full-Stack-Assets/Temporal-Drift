#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "DeLoreanTuningData.h"
#include "DeLoreanVehicle.h"
#include "ChaosVehicleMovementComponent.h"
#include "Engine/StaticMesh.h"
#include "Materials/MaterialInterface.h"
#include "GameFramework/SpringArmComponent.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFVehicleTuningDefaultsTest,
    "BTTF.Vehicle.Tuning.DefaultsAreRoadworthy",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFVehicleTuningDefaultsTest::RunTest(const FString& Parameters)
{
    const UDeLoreanTuningData* Tuning = GetDefault<UDeLoreanTuningData>();
    TestTrue(TEXT("Mass is within the approved range"),
        Tuning->MassKg >= 1200.0f && Tuning->MassKg <= 1600.0f);
    TestTrue(TEXT("Torque curve has at least four samples"),
        Tuning->TorqueCurve.GetRichCurveConst()->GetNumKeys() >= 4);
    TestTrue(TEXT("Forward transmission has at least four gears"),
        Tuning->ForwardGearRatios.Num() >= 4);
    TestTrue(TEXT("Reverse gear ratio is negative"),
        Tuning->ReverseGearRatio < 0.0f);
    TestTrue(TEXT("Suspension travel is stable"),
        Tuning->SuspensionMaxRaiseCm > 0.0f &&
        Tuning->SuspensionMaxDropCm > Tuning->SuspensionMaxRaiseCm);
    TestTrue(TEXT("Target top speed clears time-travel threshold"),
        Tuning->TargetTopSpeedMph >= 50.0f);
    TestTrue(TEXT("Steering angle is roadworthy"),
        Tuning->MaxSteerAngleDegrees >= 30.0f && Tuning->MaxSteerAngleDegrees <= 45.0f);
    TestTrue(TEXT("Chase camera FOV range configured"),
        Tuning->ChaseHighSpeedFov > Tuning->ChaseBaseFov);
    TestTrue(TEXT("Reverse assist acceleration configured"),
        Tuning->ReverseAssistAcceleration >= 400.0f);
    TestTrue(TEXT("Hover yaw acceleration configured"),
        Tuning->HoverYawAcceleration > 0.0f);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFVehicleGameplayRegressionTest,
    "BTTF.Vehicle.Gameplay.ReverseHoverAndResetContracts",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFVehicleGameplayRegressionTest::RunTest(const FString& Parameters)
{
    ADeLoreanVehicle* Vehicle = NewObject<ADeLoreanVehicle>();
    const UDeLoreanTuningData* Tuning = GetDefault<UDeLoreanTuningData>();
    Vehicle->ApplyTuningData(Tuning);

    TestEqual(TEXT("Tuning applies reverse assist acceleration"),
        Vehicle->ReverseAssistAcceleration, Tuning->ReverseAssistAcceleration);
    TestEqual(TEXT("Tuning applies hover target height"),
        Vehicle->HoverTargetHeight, Tuning->HoverTargetHeight);

    Vehicle->ApplyReverseInput(true);
    UChaosVehicleMovementComponent* Movement = Vehicle->GetVehicleMovementComponent();
    TestEqual(TEXT("Reverse from rest selects reverse gear"), Movement->GetTargetGear(), -1);

    Vehicle->ApplyReverseInput(false);
    Vehicle->ApplyDigitalDriveInput(true, false, true, false);
    TestEqual(TEXT("Forward after reverse restores drive gear"), Movement->GetTargetGear(), 1);
    TestEqual(TEXT("Forward throttle applied after reverse"), Movement->GetThrottleInput(), 1.0f);

    Vehicle->ToggleHoverMode();
    TestTrue(TEXT("Hover mode engages"), Vehicle->bHoverModeActive);
    TestFalse(TEXT("Hover mode keeps camera roll isolated"),
        Vehicle->CameraSpringArm->bInheritRoll);

    const FTransform SafeTransform(FRotator::ZeroRotator, FVector(100.0f, 200.0f, 300.0f));
    Vehicle->SetLastSafeTransform(SafeTransform);
    Vehicle->SetActorTransform(FTransform(FRotator(80.0f, 45.0f, 30.0f), FVector(0.0f, 0.0f, -500.0f)));
    Vehicle->ResetVehicle();
    TestTrue(TEXT("Reset restores safe transform location"),
        Vehicle->GetActorLocation().Equals(SafeTransform.GetLocation(), 1.0f));
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFHeroVehicleContractTest,
    "BTTF.Vehicle.Hero.Contract",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFHeroVehicleContractTest::RunTest(const FString& Parameters)
{
    const TCHAR* RequiredMeshes[] = {
        TEXT("/Game/Vehicles/DeLorean/Hero/SM_HeroTimeMachine.SM_HeroTimeMachine"),
        TEXT("/Game/Vehicles/DeLorean/Hero/SM_BodyShell.SM_BodyShell"),
        TEXT("/Game/Vehicles/DeLorean/Hero/SM_GlassSet.SM_GlassSet"),
        TEXT("/Game/Vehicles/DeLorean/Hero/SM_Interior.SM_Interior"),
        TEXT("/Game/Vehicles/DeLorean/Hero/SM_TimeMachinery.SM_TimeMachinery"),
        TEXT("/Game/Vehicles/DeLorean/Hero/SM_Wheel_FL.SM_Wheel_FL"),
        TEXT("/Game/Vehicles/DeLorean/Hero/SM_Wheel_FR.SM_Wheel_FR"),
        TEXT("/Game/Vehicles/DeLorean/Hero/SM_Wheel_RL.SM_Wheel_RL"),
        TEXT("/Game/Vehicles/DeLorean/Hero/SM_Wheel_RR.SM_Wheel_RR")
    };
    for (const TCHAR* AssetPath : RequiredMeshes)
    {
        TestNotNull(FString::Printf(TEXT("Hero mesh resolves: %s"), AssetPath),
            LoadObject<UStaticMesh>(nullptr, AssetPath));
    }

    const ADeLoreanVehicle* Vehicle = GetDefault<ADeLoreanVehicle>();
    TestNotNull(TEXT("Hero visual root exists"), Vehicle->GetHeroVisualRoot());
    TestTrue(TEXT("At least one imported hero visual mesh is assigned"),
        Vehicle->GetHeroVisualMeshCount() > 0);
    TestFalse(TEXT("Prototype visual presentation is disabled"),
        Vehicle->HasPrototypeVisuals());
    TestEqual(TEXT("Vehicle exposes four camera modes"),
        Vehicle->GetCameraModeCount(), 4);
    TestTrue(TEXT("Default chase camera frames the hero vehicle closely"),
        Vehicle->CameraSpringArm->TargetArmLength >= 450.0f &&
        Vehicle->CameraSpringArm->TargetArmLength <= 600.0f);
    return !HasAnyErrors();
}

#endif
