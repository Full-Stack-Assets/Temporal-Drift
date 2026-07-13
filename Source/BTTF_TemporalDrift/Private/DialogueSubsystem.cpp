#include "DialogueSubsystem.h"
#include "Kismet/GameplayStatics.h"
#include "Components/AudioComponent.h"
#include "Sound/SoundBase.h"
#include "Engine/World.h"

bool UDialogueSubsystem::StartConversation(UDialogueDataAsset* Conversation)
{
    if (!Conversation || Conversation->EntryNodeId.IsNone() || bActive)
    {
        return false;
    }

    ActiveConversation = Conversation;
    PendingParadoxDelta = 0.0f;
    bActive = true;
    return MoveToNode(Conversation->EntryNodeId);
}

bool UDialogueSubsystem::MoveToNode(FName NodeId)
{
    if (!ActiveConversation || !ActiveConversation->FindNode(NodeId))
    {
        return false;
    }

    StopActiveVoice();
    CurrentNodeId = NodeId;
    const FDialogueNode* Node = ActiveConversation->FindNode(NodeId);
    RequiredDisplaySeconds = Node ? Node->MinimumDisplaySeconds : 0.0f;
    NodeDisplayStartTime = GetWorld() ? GetWorld()->GetTimeSeconds() : 0.0f;
    bVoiceFinished = true;
    DispatchCurrentNodeEventOnce();
    if (Node)
    {
        PlayNodeVoice(*Node);
        OnNodeChanged.Broadcast(*Node);
    }
    return true;
}

void UDialogueSubsystem::PlayNodeVoice(const FDialogueNode& Node)
{
    if (Node.VoiceAudioPath.IsNull())
    {
        return;
    }

    UWorld* World = GetWorld();
    if (!World)
    {
        return;
    }

    if (USoundBase* Sound = Cast<USoundBase>(Node.VoiceAudioPath.TryLoad()))
    {
        ActiveVoiceComponent = UGameplayStatics::SpawnSound2D(World, Sound, DialogueVolume);
        if (ActiveVoiceComponent)
        {
            bVoiceFinished = false;
            ActiveVoiceComponent->OnAudioFinished.AddDynamic(this, &UDialogueSubsystem::HandleVoiceFinished);
        }
    }
}

void UDialogueSubsystem::HandleVoiceFinished()
{
    bVoiceFinished = true;
    if (ActiveVoiceComponent)
    {
        ActiveVoiceComponent->OnAudioFinished.RemoveDynamic(this, &UDialogueSubsystem::HandleVoiceFinished);
        ActiveVoiceComponent = nullptr;
    }
}

void UDialogueSubsystem::StopActiveVoice()
{
    if (ActiveVoiceComponent)
    {
        ActiveVoiceComponent->OnAudioFinished.RemoveDynamic(this, &UDialogueSubsystem::HandleVoiceFinished);
        ActiveVoiceComponent->Stop();
        ActiveVoiceComponent = nullptr;
    }
    bVoiceFinished = true;
}

bool UDialogueSubsystem::HasMetDisplayRequirements() const
{
    const FDialogueNode Node = GetCurrentNode();
    if (Node.bWaitForVoiceBeforeAdvance && !bVoiceFinished)
    {
        return false;
    }

    if (RequiredDisplaySeconds <= 0.0f)
    {
        return true;
    }

    const UWorld* World = GetWorld();
    if (!World)
    {
        return true;
    }

    return (World->GetTimeSeconds() - NodeDisplayStartTime) >= RequiredDisplaySeconds;
}

bool UDialogueSubsystem::CanAdvanceConversation() const
{
    if (!bActive)
    {
        return false;
    }

    const FDialogueNode Node = GetCurrentNode();
    if (!Node.Choices.IsEmpty())
    {
        return false;
    }

    return HasMetDisplayRequirements();
}

void UDialogueSubsystem::DispatchCurrentNodeEventOnce()
{
    const FDialogueNode* Node = ActiveConversation ? ActiveConversation->FindNode(CurrentNodeId) : nullptr;
    if (!Node || Node->MissionEvent.IsNone())
    {
        return;
    }

    const FName EventKey(*FString::Printf(TEXT("%s.%s.%s"),
        *ActiveConversation->ConversationId.ToString(), *Node->NodeId.ToString(), *Node->MissionEvent.ToString()));
    if (!DispatchedEventKeys.Contains(EventKey))
    {
        DispatchedEventKeys.Add(EventKey);
        OnMissionEvent.Broadcast(Node->MissionEvent, Node->NodeId);
    }
}

bool UDialogueSubsystem::AdvanceConversation()
{
    const FDialogueNode Node = GetCurrentNode();
    if (!bActive || !Node.Choices.IsEmpty() || !CanAdvanceConversation())
    {
        return false;
    }

    if (Node.AutomaticNextNodeId.IsNone())
    {
        EndConversation();
        return true;
    }

    return MoveToNode(Node.AutomaticNextNodeId);
}

bool UDialogueSubsystem::SelectChoice(FName ChoiceId)
{
    if (!bActive)
    {
        return false;
    }

    const TArray<FDialogueChoice> Choices = GetAvailableChoices();
    const FDialogueChoice* Choice = Choices.FindByPredicate(
        [ChoiceId](const FDialogueChoice& Item) { return Item.ChoiceId == ChoiceId; });
    if (!Choice)
    {
        return false;
    }

    if (!Choice->GrantedFlag.IsNone())
    {
        StoryFlags.Add(Choice->GrantedFlag);
    }
    PendingParadoxDelta += Choice->ParadoxDelta;
    if (Choice->NextNodeId.IsNone())
    {
        EndConversation();
        return true;
    }
    return MoveToNode(Choice->NextNodeId);
}

void UDialogueSubsystem::InterruptConversation()
{
    if (!bActive)
    {
        return;
    }

    StopActiveVoice();
    InterruptedNodeId = CurrentNodeId;
    bActive = false;
}

bool UDialogueSubsystem::ResumeConversation()
{
    if (bActive || !ActiveConversation || InterruptedNodeId.IsNone())
    {
        return false;
    }

    bActive = true;
    const FName NodeToResume = InterruptedNodeId;
    InterruptedNodeId = NAME_None;
    return MoveToNode(NodeToResume);
}

void UDialogueSubsystem::EndConversation()
{
    StopActiveVoice();
    bActive = false;
    CurrentNodeId = NAME_None;
    InterruptedNodeId = NAME_None;
    ActiveConversation = nullptr;
    OnDialogueEnded.Broadcast();
}

void UDialogueSubsystem::SetDialogueVolume(float Volume)
{
    DialogueVolume = FMath::Clamp(Volume, 0.0f, 1.0f);
    if (ActiveVoiceComponent)
    {
        ActiveVoiceComponent->SetVolumeMultiplier(DialogueVolume);
    }
}

FDialogueNode UDialogueSubsystem::GetCurrentNode() const
{
    if (const FDialogueNode* Node = ActiveConversation ? ActiveConversation->FindNode(CurrentNodeId) : nullptr)
    {
        return *Node;
    }
    return FDialogueNode();
}

TArray<FDialogueChoice> UDialogueSubsystem::GetAvailableChoices() const
{
    TArray<FDialogueChoice> Result;
    for (const FDialogueChoice& Choice : GetCurrentNode().Choices)
    {
        if (Choice.RequiredFlag.IsNone() || StoryFlags.Contains(Choice.RequiredFlag))
        {
            Result.Add(Choice);
        }
    }
    return Result;
}

void UDialogueSubsystem::SetStoryFlag(FName Flag, bool bEnabled)
{
    if (bEnabled)
    {
        StoryFlags.Add(Flag);
    }
    else
    {
        StoryFlags.Remove(Flag);
    }
}

bool UDialogueSubsystem::HasStoryFlag(FName Flag) const
{
    return StoryFlags.Contains(Flag);
}

FDialogueProgressSnapshot UDialogueSubsystem::GetProgressSnapshot() const
{
    FDialogueProgressSnapshot Snapshot;
    if (ActiveConversation)
    {
        Snapshot.ActiveConversationPath = ActiveConversation;
    }
    Snapshot.CurrentNodeId = CurrentNodeId;
    Snapshot.InterruptedNodeId = InterruptedNodeId;
    Snapshot.bConversationActive = bActive;
    Snapshot.StoryFlags = StoryFlags.Array();
    Snapshot.DispatchedEventKeys = DispatchedEventKeys.Array();
    return Snapshot;
}

bool UDialogueSubsystem::RestoreProgressSnapshot(const FDialogueProgressSnapshot& Snapshot)
{
    StopActiveVoice();
    bActive = false;
    ActiveConversation = nullptr;
    CurrentNodeId = NAME_None;
    InterruptedNodeId = NAME_None;
    StoryFlags.Reset();
    DispatchedEventKeys.Reset();

    for (const FName Flag : Snapshot.StoryFlags)
    {
        StoryFlags.Add(Flag);
    }
    for (const FName EventKey : Snapshot.DispatchedEventKeys)
    {
        DispatchedEventKeys.Add(EventKey);
    }

    if (Snapshot.ActiveConversationPath.IsNull())
    {
        return true;
    }

    UDialogueDataAsset* Conversation = Cast<UDialogueDataAsset>(Snapshot.ActiveConversationPath.TryLoad());
    if (!Conversation)
    {
        return false;
    }

    ActiveConversation = Conversation;
    CurrentNodeId = Snapshot.CurrentNodeId;
    InterruptedNodeId = Snapshot.InterruptedNodeId;
    bActive = Snapshot.bConversationActive;
    if (bActive && !CurrentNodeId.IsNone())
    {
        OnNodeChanged.Broadcast(GetCurrentNode());
    }
    return true;
}
