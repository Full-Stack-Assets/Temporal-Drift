#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "DialogueDataAsset.generated.h"

USTRUCT(BlueprintType)
struct FDialogueChoice
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName ChoiceId;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FText Text;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName NextNodeId;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName RequiredFlag;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName GrantedFlag;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) float ParadoxDelta = 0.0f;
};

USTRUCT(BlueprintType)
struct FDialogueNode
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName NodeId;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName SpeakerId;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FText Line;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName LocalizationKey;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FText SpeakerDisplayName;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FSoftObjectPath VoiceAudioPath;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bWaitForVoiceBeforeAdvance = false;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) TArray<FDialogueChoice> Choices;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName AutomaticNextNodeId;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName MissionEvent;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) float MinimumDisplaySeconds = 1.5f;
};

UCLASS(BlueprintType)
class BTTF_TEMPORALDRIFT_API UDialogueDataAsset : public UPrimaryDataAsset
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FName ConversationId;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) FName EntryNodeId;
    UPROPERTY(EditAnywhere, BlueprintReadOnly) TArray<FDialogueNode> Nodes;

    const FDialogueNode* FindNode(FName NodeId) const;
};
