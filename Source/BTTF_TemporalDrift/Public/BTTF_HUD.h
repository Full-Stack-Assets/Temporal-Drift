// BTTF_HUD.h - Canvas HUD: speedometer, flux charge, time circuits, era
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "BTTF_HUD.generated.h"

UCLASS()
class BTTF_TEMPORALDRIFT_API ABTTF_HUD : public AHUD
{
    GENERATED_BODY()

public:
    virtual void DrawHUD() override;

private:
    void DrawBar(float X, float Y, float Width, float Height, float Percent, const FLinearColor& FillColor);
};
