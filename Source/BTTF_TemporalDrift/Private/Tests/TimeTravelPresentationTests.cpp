#if WITH_DEV_AUTOMATION_TESTS
#include "Misc/AutomationTest.h"
#include "TimeTravelPresentationComponent.h"

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
    Presentation->HandlePhaseChanged(ETimeTravelPhase::Cooldown);
    TestEqual(TEXT("Cooldown phase is exposed"), Presentation->GetPresentationPhase(), ETimeTravelPhase::Cooldown);
    Presentation->HandlePhaseChanged(ETimeTravelPhase::Idle);
    TestFalse(TEXT("Idle has no active cue"), Presentation->IsCueActive());
    return !HasAnyErrors();
}
#endif
