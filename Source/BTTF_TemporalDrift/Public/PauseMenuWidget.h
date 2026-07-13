#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "PauseMenuWidget.generated.h"

class UTextBlock;
class UVerticalBox;
class UButton;
class USettingsWidget;

UCLASS(BlueprintType, Blueprintable)
class BTTF_TEMPORALDRIFT_API UPauseMenuWidget : public UUserWidget
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "UI")
    void RefreshMenuState(bool bHasSaveGame);

    UFUNCTION(BlueprintCallable, Category = "UI")
    void ShowSettings(bool bShow);

    UFUNCTION(BlueprintPure, Category = "UI")
    bool IsSettingsVisible() const;

protected:
    virtual void NativeOnInitialized() override;

private:
    void BuildWidgetTree();
    UTextBlock* AddMenuLine(UVerticalBox* Parent, const FText& Label, const FLinearColor& Color, int32 SizeOffset = 0);

    UFUNCTION() void HandleResumeClicked();
    UFUNCTION() void HandleSettingsClicked();
    UFUNCTION() void HandleContinueClicked();
    UFUNCTION() void HandleNewGameClicked();
    UFUNCTION() void HandleQuitClicked();

    UPROPERTY(Transient) TObjectPtr<class UBorder> Panel;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> TitleText;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> ResumeText;
    UPROPERTY(Transient) TObjectPtr<UButton> ContinueButton;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> SettingsText;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> NewGameText;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> QuitText;
    UPROPERTY(Transient) TObjectPtr<USettingsWidget> SettingsWidget;
};
