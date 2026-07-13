#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "TimeCircuitsViewModel.h"
#include "TimeCircuitsWidget.h"

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
        FText::FromString(TEXT("Destination streaming delayed.")),
        FText::FromString(TEXT("Install the clocktower sensor")));
    const FTimeCircuitsDisplayState Dangerous = ViewModel->GetDisplayState();
    TestTrue(TEXT("Threshold and flux make jump ready"), Dangerous.bJumpReady);
    TestTrue(TEXT("Explicit failure reason wins warning priority"),
        Dangerous.WarningText.ToString().Contains(TEXT("Destination streaming delayed")));
    TestTrue(TEXT("Danger state is accessibility text, not color alone"), Dangerous.bDangerWarning);
    TestEqual(TEXT("Mission objective surfaces in HUD state"),
        Dangerous.MissionObjectiveText.ToString(), FString(TEXT("Install the clocktower sensor")));

    TestEqual(TEXT("Forward era cycle reaches alternate 1985"),
        ViewModel->CycleDestination(ETimelineState::Present1985, 1), ETimelineState::Alternate1985);
    TestEqual(TEXT("Backward era cycle wraps to 1885"),
        ViewModel->CycleDestination(ETimelineState::Past1955, -1), ETimelineState::WildWest1885);

    ViewModel->UpdateDisplay(40.0f, 1.0f, ETimelineState::Present1985,
        ETimelineState::Past1955, ETimeTravelPhase::Armed, 12.0f, 88.0f, FText::GetEmpty(),
        FText::GetEmpty(), FText::GetEmpty(), FText::GetEmpty(), 0.82f,
        FText::FromString(TEXT("NOV 12 1955 10:04 PM")),
        FText::FromString(TEXT("LIGHTNING IN 1:30")),
        FText::FromString(TEXT("RIPPLES: Plaque altered")));
    const FTimeCircuitsDisplayState Elevated = ViewModel->GetDisplayState();
    TestEqual(TEXT("Destination date surfaces"), Elevated.DestinationDateText.ToString(),
        FString(TEXT("NOV 12 1955 10:04 PM")));
    TestEqual(TEXT("Lightning countdown surfaces"), Elevated.LightningCountdownText.ToString(),
        FString(TEXT("LIGHTNING IN 1:30")));
    TestEqual(TEXT("Consequence summary surfaces"), Elevated.ConsequenceSummaryText.ToString(),
        FString(TEXT("RIPPLES: Plaque altered")));
    TestEqual(TEXT("Photograph opacity clamped"), Elevated.PhotographOpacity, 0.82f);

    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFTimeCircuitsWidgetContractTest,
    "BTTF.UI.DrivingHUD.WidgetContract",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFTimeCircuitsWidgetContractTest::RunTest(const FString& Parameters)
{
    const UTimeCircuitsWidget* WidgetDefaults = GetDefault<UTimeCircuitsWidget>();
    TestNotNull(TEXT("Runtime driving HUD class exists"), WidgetDefaults);
    TestTrue(TEXT("HUD uses couch-readable base text"), WidgetDefaults->BaseFontSize >= 22);
    TestTrue(TEXT("HUD exposes scalable text"), WidgetDefaults->TextScale >= 0.75f && WidgetDefaults->TextScale <= 2.0f);
    TestTrue(TEXT("HUD keeps warnings readable without color"), WidgetDefaults->bShowWarningText);
    return !HasAnyErrors();
}

#endif
