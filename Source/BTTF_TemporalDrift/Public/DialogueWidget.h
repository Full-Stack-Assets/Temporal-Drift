#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "DialogueViewModel.h"
#include "DialogueWidget.generated.h"

class UTextBlock;
class UVerticalBox;

UCLASS(BlueprintType, Blueprintable)
class BTTF_TEMPORALDRIFT_API UDialogueWidget : public UUserWidget
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Accessibility", meta=(ClampMin="18", ClampMax="48"))
    int32 BaseFontSize = 26;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Accessibility", meta=(ClampMin="0.75", ClampMax="2.0"))
    float TextScale = 1.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Accessibility", meta=(ClampMin="0.0", ClampMax="1.0"))
    float BackgroundOpacity = 0.82f;

    UFUNCTION(BlueprintCallable, Category="Dialogue")
    void BindViewModel(UDialogueViewModel* InViewModel);

protected:
    virtual void NativeOnInitialized() override;

private:
    UFUNCTION()
    void HandleDisplayChanged(FDialogueDisplayState NewState);

    void BuildWidgetTree();
    UTextBlock* AddLine(UVerticalBox* Parent, const FText& InitialText, const FLinearColor& Color, int32 SizeOffset = 0);

    UPROPERTY(Transient) TObjectPtr<UDialogueViewModel> ViewModel;
    UPROPERTY(Transient) TObjectPtr<class UBorder> Panel;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> SpeakerText;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> LineText;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> PromptText;
    UPROPERTY(Transient) TObjectPtr<UVerticalBox> ChoiceStack;
};
