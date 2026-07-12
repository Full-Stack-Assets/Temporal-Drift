#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "TimeTravelTypes.h"
#include "EraWorldManager.generated.h"

class UDataLayerAsset;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnEraWorldChanged, ETimelineState, PreviousEra, ETimelineState, NewEra);

UCLASS()
class BTTF_TEMPORALDRIFT_API UEraWorldManager : public UWorldSubsystem
{
    GENERATED_BODY()

public:
    UEraWorldManager();

    UFUNCTION(BlueprintPure, Category="Era")
    TSoftObjectPtr<UDataLayerAsset> GetDataLayerForEra(ETimelineState Era) const;

    UFUNCTION(BlueprintCallable, Category="Era")
    bool SwitchToEra(ETimelineState NewEra);

    UFUNCTION(BlueprintPure, Category="Era")
    ETimelineState GetActiveEra() const { return ActiveEra; }

    UPROPERTY(BlueprintAssignable, Category="Era")
    FOnEraWorldChanged OnEraChanged;

private:
    UPROPERTY()
    TMap<ETimelineState, TSoftObjectPtr<UDataLayerAsset>> EraLayers;

    UPROPERTY()
    ETimelineState ActiveEra = ETimelineState::Present1985;
};
