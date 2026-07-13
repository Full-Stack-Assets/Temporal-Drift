#if WITH_DEV_AUTOMATION_TESTS
#include "Misc/AutomationTest.h"
#include "FadingPhotographViewModel.h"
#include "FadingPhotographWidget.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFPhotographViewModelTest,"BTTF.Timeline.FadingPhotograph",EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FBTTFPhotographViewModelTest::RunTest(const FString& Parameters)
{
    UFadingPhotographViewModel* Model=NewObject<UFadingPhotographViewModel>();
    Model->UpdatePhotograph(0.0f,true,false); TestEqual(TEXT("Stable photo opaque"),Model->SubjectOpacity,1.0f); TestFalse(TEXT("Stable not critical"),Model->bCriticalHandFade);
    Model->UpdatePhotograph(90.0f,true,false); TestTrue(TEXT("High paradox fades subject"),Model->SubjectOpacity<0.3f); TestTrue(TEXT("High paradox critical"),Model->bCriticalHandFade); TestEqual(TEXT("Critical pulse active"),Model->WarningPulse,1.0f);
    Model->UpdatePhotograph(90.0f,true,true); TestEqual(TEXT("Reduced flash disables pulse"),Model->WarningPulse,0.0f);
    Model->UpdatePhotograph(10.0f,false,false); TestEqual(TEXT("Erased subject invisible"),Model->SubjectOpacity,0.0f); TestTrue(TEXT("Erasure critical"),Model->bCriticalHandFade);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFPhotographWidgetContractTest,
    "BTTF.UI.FadingPhotographWidgetContract",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFPhotographWidgetContractTest::RunTest(const FString& Parameters)
{
    const UFadingPhotographWidget* WidgetDefaults = GetDefault<UFadingPhotographWidget>();
    TestNotNull(TEXT("Fading photograph widget class exists"), WidgetDefaults);

    UFadingPhotographWidget* Widget = NewObject<UFadingPhotographWidget>();
    TestNotNull(TEXT("Fading photograph widget constructs"), Widget);
    Widget->UpdateFromParadox(5.0f, true, false);
    Widget->UpdateFromParadox(95.0f, true, true);
    return !HasAnyErrors();
}
#endif
