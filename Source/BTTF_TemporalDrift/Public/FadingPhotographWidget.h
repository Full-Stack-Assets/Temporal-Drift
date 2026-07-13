#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "FadingPhotographViewModel.h"
#include "FadingPhotographWidget.generated.h"

class UBorder;
class UProgressBar;
class UTextBlock;

UCLASS(BlueprintType, Blueprintable)
class BTTF_TEMPORALDRIFT_API UFadingPhotographWidget : public UUserWidget
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "Photograph")
    void BindViewModel(UFadingPhotographViewModel* InViewModel);

    UFUNCTION(BlueprintCallable, Category = "Photograph")
    void UpdateFromParadox(float ParadoxPercent, bool bSubjectExists, bool bReducedFlash);

protected:
    virtual void NativeOnInitialized() override;

private:
    void BuildWidgetTree();

    UPROPERTY(Transient) TObjectPtr<UFadingPhotographViewModel> ViewModel;
    UPROPERTY(Transient) TObjectPtr<UBorder> PolaroidFrame;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> TitleText;
    UPROPERTY(Transient) TObjectPtr<UTextBlock> StatusText;
    UPROPERTY(Transient) TObjectPtr<UProgressBar> OpacityBar;
};
