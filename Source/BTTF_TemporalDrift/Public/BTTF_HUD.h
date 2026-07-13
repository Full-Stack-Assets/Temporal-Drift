// BTTF_HUD.h - Canvas HUD: speedometer, flux charge, time circuits, era
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "DialogueDataAsset.h"
#include "EraMusicTypes.h"
#include "BTTF_HUD.generated.h"

class UTimeCircuitsViewModel;
class UTimeCircuitsWidget;
class UDialogueViewModel;
class UDialogueWidget;

UCLASS()
class BTTF_TEMPORALDRIFT_API ABTTF_HUD : public AHUD
{
    GENERATED_BODY()

public:
    virtual void BeginPlay() override;
    virtual void DrawHUD() override;

    UFUNCTION(BlueprintCallable, Category = "Accessibility")
    void ApplyAccessibilitySettings(float UIScale, float SubtitleScale = 1.0f);

private:
    void EnsureRuntimeWidget();
    void EnsureDialogueWidget();
    void RefreshTimeCircuitsDisplay();

    UFUNCTION()
    void HandleDialogueNodeChanged(FDialogueNode Node);

    UFUNCTION()
    void HandleDialogueConversationEnded();

    UFUNCTION()
    void HandleEraMusicChanged(FEraMusicTrackInfo ActiveTrack);

    void DrawBar(float X, float Y, float Width, float Height, float Percent, const FLinearColor& FillColor);

    UPROPERTY(Transient)
    TObjectPtr<UTimeCircuitsViewModel> TimeCircuitsViewModel;

    UPROPERTY(Transient)
    TObjectPtr<UTimeCircuitsWidget> TimeCircuitsWidget;

    UPROPERTY(Transient)
    TObjectPtr<UDialogueViewModel> DialogueViewModel;

    UPROPERTY(Transient)
    TObjectPtr<UDialogueWidget> DialogueWidget;
};
