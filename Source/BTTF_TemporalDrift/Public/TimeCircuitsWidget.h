#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "TimeCircuitsViewModel.h"
#include "TimeCircuitsWidget.generated.h"

class UProgressBar;
class UTextBlock;

UCLASS(BlueprintType, Blueprintable)
class BTTF_TEMPORALDRIFT_API UTimeCircuitsWidget : public UUserWidget
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Accessibility", meta=(ClampMin="18", ClampMax="48"))
    int32 BaseFontSize = 24;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Accessibility", meta=(ClampMin="0.75", ClampMax="2.0"))
    float TextScale = 1.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Accessibility")
    bool bShowWarningText = true;

    UFUNCTION(BlueprintCallable, Category="Time Circuits")
    void BindViewModel(UTimeCircuitsViewModel* InViewModel);

protected:
    virtual void NativeOnInitialized() override;
    virtual void NativeConstruct() override;

private:
    UFUNCTION()
    void HandleDisplayChanged(FTimeCircuitsDisplayState NewState);

    void BuildWidgetTree();
    UTextBlock* AddReadout(class UVerticalBox* Parent, const FText& InitialText, const FLinearColor& Color, int32 SizeOffset = 0);

    UPROPERTY(Transient) TObjectPtr<UTimeCircuitsViewModel> ViewModel;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> SpeedText;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> FluxText;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> EraText;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> DestinationText;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> DestinationDateText;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> LightningCountdownText;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> PhaseText;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> WarningText;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> MissionObjectiveText;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> ConsequenceSummaryText;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> NowPlayingText;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> PhotographStatusText;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> ControlsText;
    UPROPERTY(Transient) TObjectPtr<UProgressBar> FluxBar;
};
