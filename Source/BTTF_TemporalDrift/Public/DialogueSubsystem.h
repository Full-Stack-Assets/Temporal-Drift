#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "DialogueDataAsset.h"
#include "DialogueSubsystem.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnDialogueNodeChanged, FDialogueNode, Node);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnDialogueMissionEvent, FName, EventId, FName, SourceNodeId);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnDialogueEnded);

UCLASS()
class BTTF_TEMPORALDRIFT_API UDialogueSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable) bool StartConversation(UDialogueDataAsset* Conversation);
    UFUNCTION(BlueprintCallable) bool AdvanceConversation();
    UFUNCTION(BlueprintCallable) bool SelectChoice(FName ChoiceId);
    UFUNCTION(BlueprintCallable) void InterruptConversation();
    UFUNCTION(BlueprintCallable) bool ResumeConversation();
    UFUNCTION(BlueprintCallable) void EndConversation();
    UFUNCTION(BlueprintPure) bool IsConversationActive() const { return bActive; }
    UFUNCTION(BlueprintPure) FDialogueNode GetCurrentNode() const;
    UFUNCTION(BlueprintPure) TArray<FDialogueChoice> GetAvailableChoices() const;
    UFUNCTION(BlueprintCallable) void SetStoryFlag(FName Flag, bool bEnabled);
    UFUNCTION(BlueprintPure) bool HasStoryFlag(FName Flag) const;

    UPROPERTY(BlueprintAssignable) FOnDialogueNodeChanged OnNodeChanged;
    UPROPERTY(BlueprintAssignable) FOnDialogueMissionEvent OnMissionEvent;
    UPROPERTY(BlueprintAssignable) FOnDialogueEnded OnDialogueEnded;

    UPROPERTY(BlueprintReadOnly) float PendingParadoxDelta = 0.0f;

private:
    bool MoveToNode(FName NodeId);
    void DispatchCurrentNodeEventOnce();

    UPROPERTY() TObjectPtr<UDialogueDataAsset> ActiveConversation;
    UPROPERTY() FName CurrentNodeId;
    UPROPERTY() FName InterruptedNodeId;
    UPROPERTY() TSet<FName> StoryFlags;
    UPROPERTY() TSet<FName> DispatchedEventKeys;
    bool bActive = false;
};
