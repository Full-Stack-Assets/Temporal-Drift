#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "DialogueSubsystem.h"
#include "Engine/GameInstance.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFDialogueBranchingTest, "BTTF.Dialogue.BranchingAndResume",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFDialogueBranchingTest::RunTest(const FString& Parameters)
{
    UDialogueDataAsset* Data = NewObject<UDialogueDataAsset>();
    Data->ConversationId = TEXT("ValeIntro"); Data->EntryNodeId = TEXT("Start");
    FDialogueNode Start; Start.NodeId=TEXT("Start"); Start.SpeakerId=TEXT("Vale"); Start.Line=FText::FromString(TEXT("Ready?")); Start.LocalizationKey=TEXT("dialogue.vale.ready");
    FDialogueChoice Safe; Safe.ChoiceId=TEXT("Safe"); Safe.Text=FText::FromString(TEXT("Explain the rules.")); Safe.NextNodeId=TEXT("Rules"); Safe.GrantedFlag=TEXT("AskedRules");
    FDialogueChoice Risky; Risky.ChoiceId=TEXT("Risky"); Risky.Text=FText::FromString(TEXT("Skip it.")); Risky.NextNodeId=TEXT("End"); Risky.ParadoxDelta=5.0f;
    Start.Choices={Safe,Risky};
    FDialogueNode Rules; Rules.NodeId=TEXT("Rules"); Rules.SpeakerId=TEXT("Vale"); Rules.Line=FText::FromString(TEXT("Reach 88 safely.")); Rules.AutomaticNextNodeId=TEXT("End");
    FDialogueNode End; End.NodeId=TEXT("End"); End.SpeakerId=TEXT("Vale"); End.Line=FText::FromString(TEXT("Good luck."));
    Data->Nodes={Start,Rules,End};

    UGameInstance* GameInstance=NewObject<UGameInstance>();
    UDialogueSubsystem* System=NewObject<UDialogueSubsystem>(GameInstance);
    TestTrue(TEXT("Conversation starts"),System->StartConversation(Data));
    TestEqual(TEXT("Entry node selected"),System->GetCurrentNode().NodeId,FName(TEXT("Start")));
    TestTrue(TEXT("Valid branch selected"),System->SelectChoice(TEXT("Safe")));
    TestTrue(TEXT("Choice grants flag"),System->HasStoryFlag(TEXT("AskedRules")));
    TestEqual(TEXT("Rules node selected"),System->GetCurrentNode().NodeId,FName(TEXT("Rules")));
    System->InterruptConversation(); TestFalse(TEXT("Interruption releases active state"),System->IsConversationActive());
    TestTrue(TEXT("Conversation resumes"),System->ResumeConversation());
    TestEqual(TEXT("Resume restores node"),System->GetCurrentNode().NodeId,FName(TEXT("Rules")));
    TestTrue(TEXT("Automatic advance works"),System->AdvanceConversation());
    TestEqual(TEXT("End node reached"),System->GetCurrentNode().NodeId,FName(TEXT("End")));
    TestTrue(TEXT("Terminal node ends"),System->AdvanceConversation());
    TestFalse(TEXT("Conversation ended"),System->IsConversationActive());
    return !HasAnyErrors();
}

#endif
