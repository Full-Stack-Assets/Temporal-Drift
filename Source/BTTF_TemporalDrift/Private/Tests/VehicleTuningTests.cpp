#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "DeLoreanTuningData.h"
#include "DeLoreanVehicle.h"

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
        Tuning->TargetTopSpeedMph >= 95.0f);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFHeroVehicleContractTest,
    "BTTF.Vehicle.Hero.Contract",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFHeroVehicleContractTest::RunTest(const FString& Parameters)
{
    const ADeLoreanVehicle* Vehicle = GetDefault<ADeLoreanVehicle>();
    TestNotNull(TEXT("Hero visual root exists"), Vehicle->GetHeroVisualRoot());
    TestTrue(TEXT("At least one imported hero visual mesh is assigned"),
        Vehicle->GetHeroVisualMeshCount() > 0);
    TestFalse(TEXT("Prototype visual presentation is disabled"),
        Vehicle->HasPrototypeVisuals());
    TestEqual(TEXT("Vehicle exposes four camera modes"),
        Vehicle->GetCameraModeCount(), 4);
    return !HasAnyErrors();
}

#endif
