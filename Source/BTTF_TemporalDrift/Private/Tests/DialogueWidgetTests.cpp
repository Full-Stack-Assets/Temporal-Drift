#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "DialogueViewModel.h"
#include "DialogueWidget.h"
#include "DialogueDataAsset.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFDialogueViewModelTest,
    "BTTF.Dialogue.SubtitleViewModel",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFDialogueViewModelTest::RunTest(const FString& Parameters)
{
    UDialogueViewModel* ViewModel = NewObject<UDialogueViewModel>();
    FDialogueNode Node;
    Node.SpeakerId = TEXT("Vale");
    Node.SpeakerDisplayName = FText::FromString(TEXT("Dr. Emmett Vale"));
    Node.Line = FText::FromString(TEXT("Reach the courthouse square."));
    Node.bWaitForVoiceBeforeAdvance = true;

    ViewModel->UpdateFromNode(Node, {}, false, true);
    const FDialogueDisplayState State = ViewModel->GetDisplayState();
    TestTrue(TEXT("Subtitle visible during conversation"), State.bVisible);
    TestEqual(TEXT("Speaker display name resolves"), State.SpeakerName.ToString(),
        FString(TEXT("Dr. Emmett Vale")));
    TestEqual(TEXT("Line text surfaces"), State.LineText.ToString(),
        FString(TEXT("Reach the courthouse square.")));
    TestTrue(TEXT("Voice playing state exposed"), State.bVoicePlaying);

    ViewModel->ClearDisplay();
    TestFalse(TEXT("Subtitle hides after conversation"), ViewModel->GetDisplayState().bVisible);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFDialogueWidgetContractTest,
    "BTTF.Dialogue.WidgetContract",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFDialogueWidgetContractTest::RunTest(const FString& Parameters)
{
    const UDialogueWidget* WidgetDefaults = GetDefault<UDialogueWidget>();
    TestNotNull(TEXT("Runtime dialogue widget class exists"), WidgetDefaults);
    TestTrue(TEXT("Subtitle base font is readable"), WidgetDefaults->BaseFontSize >= 22);
    TestTrue(TEXT("Subtitle scale is configurable"), WidgetDefaults->TextScale >= 0.75f);
    TestTrue(TEXT("Subtitle background opacity configured"), WidgetDefaults->BackgroundOpacity >= 0.5f);
    return !HasAnyErrors();
}

#endif
