#include "DialogueViewModel.h"

void UDialogueViewModel::UpdateFromNode(const FDialogueNode& Node, const TArray<FDialogueChoice>& Choices,
    bool bAwaitingAdvance, bool bVoicePlaying)
{
    DisplayState.bVisible = true;
    DisplayState.SpeakerName = ResolveSpeakerName(Node);
    DisplayState.LineText = Node.Line;
    DisplayState.Choices = Choices;
    DisplayState.bAwaitingAdvance = bAwaitingAdvance;
    DisplayState.bVoicePlaying = bVoicePlaying;
    OnDisplayChanged.Broadcast(DisplayState);
}

void UDialogueViewModel::ClearDisplay()
{
    DisplayState = FDialogueDisplayState();
    OnDisplayChanged.Broadcast(DisplayState);
}

FText UDialogueViewModel::ResolveSpeakerName(const FDialogueNode& Node)
{
    if (!Node.SpeakerDisplayName.IsEmpty())
    {
        return Node.SpeakerDisplayName;
    }
    if (!Node.SpeakerId.IsNone())
    {
        return FText::FromName(Node.SpeakerId);
    }
    return FText::GetEmpty();
}
