#if WITH_DEV_AUTOMATION_TESTS
#include "Misc/AutomationTest.h"
#include "HeroStealthComponent.h"
#include "TimeTravelTypes.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFEncounterAIStealthRoutingTest,"BTTF.AI.StealthDetectionRouting",EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FBTTFEncounterAIStealthRoutingTest::RunTest(const FString& Parameters)
{
    UHeroStealthComponent* Stealth = NewObject<UHeroStealthComponent>();
    TestNotNull(TEXT("Stealth component constructs"), Stealth);

    // The controller derives MovementNoise from hero speed (cm/s) * SpeedToNoiseScale.
    // A moving, visible hero must produce a positive detection rate to route.
    const float MovementNoise = FMath::Clamp(500.0f * 0.1f, 0.0f, 100.0f); // 50
    const float DetectionRate = Stealth->CalculateDetectionRate(
        ETimelineState::Present1985, MovementNoise, 60.0f, NAME_None, false);
    TestTrue(TEXT("Speed-derived detection rate is positive"), DetectionRate > 0.0f);

    // Routing contract: accumulated awareness climbs toward detection.
    TestFalse(TEXT("Starts undetected"), Stealth->IsDetected());
    Stealth->UpdateAwareness(DetectionRate, 0.5f);
    const float PartialAwareness = Stealth->GetAwareness();
    TestTrue(TEXT("Awareness accumulates from an update"), PartialAwareness > 0.0f);
    TestFalse(TEXT("Single small update does not yet fully detect"), Stealth->IsDetected());

    // Enough accumulation crosses the detection threshold.
    for (int32 i = 0; i < 20; ++i)
    {
        Stealth->UpdateAwareness(DetectionRate, 1.0f);
    }
    TestTrue(TEXT("Sustained awareness reaches detection"), Stealth->IsDetected());
    TestEqual(TEXT("Awareness clamps at max"), Stealth->GetAwareness(), 100.0f);

    // Non-lethal break: clearing awareness resets the routing state.
    Stealth->ClearAwareness();
    TestEqual(TEXT("ClearAwareness resets to zero"), Stealth->GetAwareness(), 0.0f);
    TestFalse(TEXT("Undetected after break of line-of-sight"), Stealth->IsDetected());

    // Non-positive delta is a no-op guard the controller relies on.
    Stealth->UpdateAwareness(DetectionRate, 0.0f);
    TestEqual(TEXT("Zero delta does not change awareness"), Stealth->GetAwareness(), 0.0f);

    return !HasAnyErrors();
}
#endif
