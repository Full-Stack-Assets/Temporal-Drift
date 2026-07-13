#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "TimeCircuitsViewModel.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFTimeCircuitsViewModelTest,
    "BTTF.UI.TimeCircuitsViewModel",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFTimeCircuitsViewModelTest::RunTest(const FString& Parameters)
{
    UTimeCircuitsViewModel* ViewModel = NewObject<UTimeCircuitsViewModel>();
    ViewModel->UpdateDisplay(39.6f, 0.75f, ETimelineState::Present1985,
        ETimelineState::Past1955, ETimeTravelPhase::Charging, 12.0f, 92.0f, FText::GetEmpty());

    const FTimeCircuitsDisplayState Charging = ViewModel->GetDisplayState();
    TestEqual(TEXT("Speed rounds for legibility"), Charging.SpeedText.ToString(), FString(TEXT("40 MPH")));
    TestEqual(TEXT("Flux formats as a percentage"), Charging.FluxText.ToString(), FString(TEXT("75%")));
    TestEqual(TEXT("Present era is friendly"), Charging.CurrentEraText.ToString(), FString(TEXT("1985")));
    TestEqual(TEXT("Destination era is friendly"), Charging.DestinationEraText.ToString(), FString(TEXT("1955")));
    TestEqual(TEXT("Charging phase is actionable"), Charging.PhaseText.ToString(), FString(TEXT("BUILDING FLUX")));
    TestTrue(TEXT("No warning in stable state"), Charging.WarningText.IsEmpty());
    TestFalse(TEXT("Jump not ready below full flux"), Charging.bJumpReady);

    ViewModel->UpdateDisplay(40.0f, 1.0f, ETimelineState::Present1985,
        ETimelineState::Past1955, ETimeTravelPhase::Armed, 78.0f, 32.0f,
        FText::FromString(TEXT("Destination streaming delayed.")));
    const FTimeCircuitsDisplayState Dangerous = ViewModel->GetDisplayState();
    TestTrue(TEXT("Threshold and flux make jump ready"), Dangerous.bJumpReady);
    TestTrue(TEXT("Explicit failure reason wins warning priority"),
        Dangerous.WarningText.ToString().Contains(TEXT("Destination streaming delayed")));
    TestTrue(TEXT("Danger state is accessibility text, not color alone"), Dangerous.bDangerWarning);

    TestEqual(TEXT("Forward era cycle reaches alternate 1985"),
        ViewModel->CycleDestination(ETimelineState::Present1985, 1), ETimelineState::Alternate1985);
    TestEqual(TEXT("Backward era cycle wraps to 1885"),
        ViewModel->CycleDestination(ETimelineState::Past1955, -1), ETimelineState::WildWest1885);
    return !HasAnyErrors();
}

#endif
