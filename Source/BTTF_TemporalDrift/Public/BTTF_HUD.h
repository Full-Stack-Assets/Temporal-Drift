// BTTF_HUD.h - Canvas HUD: speedometer, flux charge, time circuits, era
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "BTTF_HUD.generated.h"

class UTimeCircuitsViewModel;
class UTimeCircuitsWidget;

UCLASS()
class BTTF_TEMPORALDRIFT_API ABTTF_HUD : public AHUD
{
    GENERATED_BODY()

public:
    virtual void BeginPlay() override;
    virtual void DrawHUD() override;

private:
    void EnsureRuntimeWidget();
    void DrawBar(float X, float Y, float Width, float Height, float Percent, const FLinearColor& FillColor);

    UPROPERTY(Transient)
    TObjectPtr<UTimeCircuitsViewModel> TimeCircuitsViewModel;

    UPROPERTY(Transient)
    TObjectPtr<UTimeCircuitsWidget> TimeCircuitsWidget;
};
