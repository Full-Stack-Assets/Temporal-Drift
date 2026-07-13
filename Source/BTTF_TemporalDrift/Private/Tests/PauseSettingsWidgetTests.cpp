#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "PauseMenuWidget.h"
#include "SettingsWidget.h"
#include "BTTF_GameInstance.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFUIWidgetContractTest,
    "BTTF.UI.PauseAndSettingsContract",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFUIWidgetContractTest::RunTest(const FString& Parameters)
{
    TestNotNull(TEXT("Pause menu class loads"), UPauseMenuWidget::StaticClass());
    TestNotNull(TEXT("Settings widget class loads"), USettingsWidget::StaticClass());

    UGameInstance* GameInstance = NewObject<UGameInstance>();
    GameInstance->Init();
    UBTTF_GameInstance* BTTFInstance = NewObject<UBTTF_GameInstance>();
    BTTFInstance->Init();
    BTTFInstance->SetMusicVolume(0.42f);
    BTTFInstance->SetUIScale(1.1f);
    TestEqual(TEXT("Profile music volume setter"), BTTFInstance->GetMusicVolume(), 0.42f);
    TestEqual(TEXT("Profile UI scale setter"), BTTFInstance->GetUIScale(), 1.1f);

    UPauseMenuWidget* PauseWidget = NewObject<UPauseMenuWidget>();
    TestNotNull(TEXT("Pause widget constructs"), PauseWidget);
    PauseWidget->RefreshMenuState(true);
    PauseWidget->RefreshMenuState(false);
  return !HasAnyErrors();
}

#endif
