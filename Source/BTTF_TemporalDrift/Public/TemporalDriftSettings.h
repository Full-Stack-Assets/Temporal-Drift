#pragma once

#include "CoreMinimal.h"
#include "Engine/DeveloperSettings.h"
#include "TemporalDriftSettings.generated.h"

UCLASS(Config=Game, DefaultConfig, meta=(DisplayName="Temporal Drift Gameplay"))
class BTTF_TEMPORALDRIFT_API UTemporalDriftSettings : public UDeveloperSettings
{
    GENERATED_BODY()

public:
    UPROPERTY(Config, EditAnywhere, BlueprintReadOnly, Category="Time Travel", meta=(ClampMin="10.0", ClampMax="40.0", Units="mph"))
    float JumpSpeedThresholdMph = 40.0f;

    UPROPERTY(Config, EditAnywhere, BlueprintReadOnly, Category="Time Travel", meta=(ClampMin="0.0", ClampMax="39.0", Units="mph"))
    float FluxChargeStartSpeedMph = 28.0f;

    UPROPERTY(Config, EditAnywhere, BlueprintReadOnly, Category="Time Travel", meta=(ClampMin="1.0"))
    float EnergyPerSecondAtThreshold = 45.0f;
};
