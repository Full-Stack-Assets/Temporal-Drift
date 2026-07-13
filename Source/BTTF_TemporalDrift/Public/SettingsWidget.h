#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "SettingsWidget.generated.h"

class USlider;
class UCheckBox;
class UTextBlock;
class UButton;
class UPauseMenuWidget;

UCLASS(BlueprintType, Blueprintable)
class BTTF_TEMPORALDRIFT_API USettingsWidget : public UUserWidget
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "Settings")
    void RefreshFromProfile();

    UFUNCTION(BlueprintCallable, Category = "Settings")
    void ApplyToProfile();

    void SetOwnerPauseMenu(UPauseMenuWidget* InOwner) { OwnerPauseMenu = InOwner; }

protected:
    virtual void NativeOnInitialized() override;

private:
    void BuildWidgetTree();
    UTextBlock* AddLabel(class UVerticalBox* Parent, const FText& Label);

    UFUNCTION() void HandleMusicVolumeChanged(float Value);
    UFUNCTION() void HandleDialogueVolumeChanged(float Value);
    UFUNCTION() void HandleUIScaleChanged(float Value);
    UFUNCTION() void HandleSubtitleScaleChanged(float Value);
    UFUNCTION() void HandleReducedFlashChanged(bool bChecked);
    UFUNCTION() void HandleBackClicked();

    UPROPERTY(Transient) TObjectPtr<class UBorder> Panel;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> MusicValueText;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> DialogueValueText;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> UIScaleValueText;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> SubtitleScaleValueText;
    UPROPERTY(Transient) TObjectPtr<USlider> MusicSlider;
    UPROPERTY(Transient) TObjectPtr<USlider> DialogueSlider;
    UPROPERTY(Transient) TObjectPtr<USlider> UIScaleSlider;
    UPROPERTY(Transient) TObjectPtr<USlider> SubtitleScaleSlider;
    UPROPERTY(Transient) TObjectPtr<UCheckBox> ReducedFlashCheck;
    UPROPERTY(Transient) TObjectPtr<UPauseMenuWidget> OwnerPauseMenu;
    bool bApplyingProfile = false;
};
