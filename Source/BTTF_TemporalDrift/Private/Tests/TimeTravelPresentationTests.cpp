#if WITH_DEV_AUTOMATION_TESTS
#include "Misc/AutomationTest.h"
#include "TimeTravelPresentationComponent.h"
#include "Materials/Material.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFTimeTravelPresentationContract,
    "BTTF.Presentation.TimeTravelPhaseContract",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFTimeTravelPresentationContract::RunTest(const FString& Parameters)
{
    UTimeTravelPresentationComponent* Presentation = NewObject<UTimeTravelPresentationComponent>();
    TestNotNull(TEXT("Presentation component can be created"), Presentation);
    if (!Presentation)
    {
        return false;
    }

    Presentation->SetReducedFlash(true);
    TestTrue(TEXT("Reduced flash setting is retained"), Presentation->IsReducedFlashEnabled());
    Presentation->HandlePhaseChanged(ETimeTravelPhase::Charging);
    TestEqual(TEXT("Charging phase is exposed"), Presentation->GetPresentationPhase(), ETimeTravelPhase::Charging);
    TestTrue(TEXT("Charging cue is active"), Presentation->IsCueActive());
    TestEqual(TEXT("Reduced-flash charging intensity is capped"), Presentation->GetCueIntensity(), 0.35f);
    Presentation->HandlePhaseChanged(ETimeTravelPhase::Cooldown);
    TestEqual(TEXT("Cooldown phase is exposed"), Presentation->GetPresentationPhase(), ETimeTravelPhase::Cooldown);
    TestEqual(TEXT("Reduced-flash cooldown intensity is restrained"), Presentation->GetCueIntensity(), 0.15f);
    Presentation->SetReducedFlash(false);
    Presentation->HandlePhaseChanged(ETimeTravelPhase::Departing);
    TestEqual(TEXT("Full departure intensity is available"), Presentation->GetCueIntensity(), 1.0f);
    Presentation->HandlePhaseChanged(ETimeTravelPhase::Idle);
    TestFalse(TEXT("Idle has no active cue"), Presentation->IsCueActive());
    TestEqual(TEXT("Idle intensity is zero"), Presentation->GetCueIntensity(), 0.0f);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFTimeTravelPresentationAssets,
    "BTTF.Presentation.PresentationAssetsLoad",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFTimeTravelPresentationAssets::RunTest(const FString& Parameters)
{
    const TCHAR* Paths[] = {
        TEXT("/Game/Materials/PostProcess/M_TemporalDistortion.M_TemporalDistortion"),
        TEXT("/Game/Materials/PostProcess/M_TemporalDistortion_ReducedFlash.M_TemporalDistortion_ReducedFlash"),
        TEXT("/Game/Materials/PostProcess/M_TemporalArrivalFrost.M_TemporalArrivalFrost")
    };
    for (const TCHAR* Path : Paths)
    {
        TestNotNull(FString::Printf(TEXT("Presentation asset loads: %s"), Path), LoadObject<UMaterial>(nullptr, Path));
    }
    return !HasAnyErrors();
}
#endif
