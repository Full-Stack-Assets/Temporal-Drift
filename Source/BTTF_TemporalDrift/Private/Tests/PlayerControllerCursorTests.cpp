#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "BTTF_PlayerController.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFPlayerControllerCursorTest,
    "BTTF.Input.Cursor.RemainsVisible",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFPlayerControllerCursorTest::RunTest(const FString& Parameters)
{
    const ABTTF_PlayerController* Controller = GetDefault<ABTTF_PlayerController>();
    TestTrue(TEXT("Mouse cursor is visible by default"), Controller->bShowMouseCursor);
    TestTrue(TEXT("Mouse clicks remain enabled"), Controller->bEnableClickEvents);
    TestTrue(TEXT("Mouse-over events remain enabled"), Controller->bEnableMouseOverEvents);
    return !HasAnyErrors();
}

#endif
