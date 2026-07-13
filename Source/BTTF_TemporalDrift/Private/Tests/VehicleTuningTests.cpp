#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "DeLoreanTuningData.h"
#include "DeLoreanVehicle.h"
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
