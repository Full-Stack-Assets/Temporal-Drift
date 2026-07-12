#include "DialogueSubsystem.h"

bool UDialogueSubsystem::StartConversation(UDialogueDataAsset* Conversation)
{
    if (!Conversation || Conversation->EntryNodeId.IsNone() || bActive) return false;
    ActiveConversation = Conversation;
    PendingParadoxDelta = 0.0f;
    bActive = true;
    return MoveToNode(Conversation->EntryNodeId);
}

bool UDialogueSubsystem::MoveToNode(FName NodeId)
{
    if (!ActiveConversation || !ActiveConversation->FindNode(NodeId)) return false;
    CurrentNodeId = NodeId;
    DispatchCurrentNodeEventOnce();
    OnNodeChanged.Broadcast(*ActiveConversation->FindNode(NodeId));
    return true;
}

void UDialogueSubsystem::DispatchCurrentNodeEventOnce()
{
    const FDialogueNode* Node = ActiveConversation ? ActiveConversation->FindNode(CurrentNodeId) : nullptr;
    if (!Node || Node->MissionEvent.IsNone()) return;
    const FName EventKey(*FString::Printf(TEXT("%s.%s.%s"), *ActiveConversation->ConversationId.ToString(), *Node->NodeId.ToString(), *Node->MissionEvent.ToString()));
    if (!DispatchedEventKeys.Contains(EventKey))
    {
        DispatchedEventKeys.Add(EventKey);
        OnMissionEvent.Broadcast(Node->MissionEvent, Node->NodeId);
    }
}

bool UDialogueSubsystem::AdvanceConversation()
{
    const FDialogueNode Node = GetCurrentNode();
    if (!bActive || !Node.Choices.IsEmpty()) return false;
    if (Node.AutomaticNextNodeId.IsNone()) { EndConversation(); return true; }
    return MoveToNode(Node.AutomaticNextNodeId);
}

bool UDialogueSubsystem::SelectChoice(FName ChoiceId)
{
    if (!bActive) return false;
    const TArray<FDialogueChoice> Choices = GetAvailableChoices();
    const FDialogueChoice* Choice = Choices.FindByPredicate([ChoiceId](const FDialogueChoice& Item) { return Item.ChoiceId == ChoiceId; });
    if (!Choice) return false;
    if (!Choice->GrantedFlag.IsNone()) StoryFlags.Add(Choice->GrantedFlag);
    PendingParadoxDelta += Choice->ParadoxDelta;
    if (Choice->NextNodeId.IsNone()) { EndConversation(); return true; }
    return MoveToNode(Choice->NextNodeId);
}

void UDialogueSubsystem::InterruptConversation()
{
    if (!bActive) return;
    InterruptedNodeId = CurrentNodeId;
    bActive = false;
}

bool UDialogueSubsystem::ResumeConversation()
{
    if (bActive || !ActiveConversation || InterruptedNodeId.IsNone()) return false;
    bActive = true;
    const FName NodeToResume = InterruptedNodeId;
    InterruptedNodeId = NAME_None;
    return MoveToNode(NodeToResume);
}

void UDialogueSubsystem::EndConversation()
{
    bActive = false;
    CurrentNodeId = NAME_None;
    InterruptedNodeId = NAME_None;
    ActiveConversation = nullptr;
    OnDialogueEnded.Broadcast();
}

FDialogueNode UDialogueSubsystem::GetCurrentNode() const
{
    if (const FDialogueNode* Node = ActiveConversation ? ActiveConversation->FindNode(CurrentNodeId) : nullptr) return *Node;
    return FDialogueNode();
}

TArray<FDialogueChoice> UDialogueSubsystem::GetAvailableChoices() const
{
    TArray<FDialogueChoice> Result;
    for (const FDialogueChoice& Choice : GetCurrentNode().Choices)
    {
        if (Choice.RequiredFlag.IsNone() || StoryFlags.Contains(Choice.RequiredFlag)) Result.Add(Choice);
    }
    return Result;
}

void UDialogueSubsystem::SetStoryFlag(FName Flag, bool bEnabled)
{
    if (bEnabled) StoryFlags.Add(Flag); else StoryFlags.Remove(Flag);
}

bool UDialogueSubsystem::HasStoryFlag(FName Flag) const
{
    return StoryFlags.Contains(Flag);
}
