#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "DialogueDataAsset.h"
#include "DialogueViewModel.generated.h"

USTRUCT(BlueprintType)
struct FDialogueDisplayState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly) bool bVisible = false;
    UPROPERTY(BlueprintReadOnly) FText SpeakerName;
    UPROPERTY(BlueprintReadOnly) FText LineText;
    UPROPERTY(BlueprintReadOnly) TArray<FDialogueChoice> Choices;
    UPROPERTY(BlueprintReadOnly) bool bAwaitingAdvance = false;
    UPROPERTY(BlueprintReadOnly) bool bVoicePlaying = false;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnDialogueDisplayChanged, FDialogueDisplayState, DisplayState);

UCLASS(BlueprintType)
class BTTF_TEMPORALDRIFT_API UDialogueViewModel : public UObject
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category="Dialogue")
    void UpdateFromNode(const FDialogueNode& Node, const TArray<FDialogueChoice>& Choices,
        bool bAwaitingAdvance, bool bVoicePlaying);

    UFUNCTION(BlueprintCallable, Category="Dialogue")
    void ClearDisplay();

    UFUNCTION(BlueprintPure, Category="Dialogue")
    FDialogueDisplayState GetDisplayState() const { return DisplayState; }

    UPROPERTY(BlueprintAssignable, Category="Dialogue")
    FOnDialogueDisplayChanged OnDisplayChanged;

private:
    static FText ResolveSpeakerName(const FDialogueNode& Node);

    UPROPERTY()
    FDialogueDisplayState DisplayState;
};
