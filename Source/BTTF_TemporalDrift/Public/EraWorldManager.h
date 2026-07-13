#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "Tickable.h"
#include "TimeTravelTypes.h"
#include "EraWorldManager.generated.h"

class UDataLayerAsset;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnEraWorldChanged, ETimelineState, PreviousEra, ETimelineState, NewEra);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnEraReady, ETimelineState, ReadyEra);

UCLASS()
class BTTF_TEMPORALDRIFT_API UEraWorldManager : public UTickableWorldSubsystem
{
    GENERATED_BODY()

public:
    UEraWorldManager();

    virtual void Tick(float DeltaTime) override;
    virtual TStatId GetStatId() const override;

    UFUNCTION(BlueprintPure, Category="Era")
    TSoftObjectPtr<UDataLayerAsset> GetDataLayerForEra(ETimelineState Era) const;

    UFUNCTION(BlueprintCallable, Category="Era")
    bool SwitchToEra(ETimelineState NewEra);

    UFUNCTION(BlueprintCallable, Category="Era")
    bool RequestEra(ETimelineState NewEra);

    /**
     * Begins loading (but not activating) the target era's Data Layer ahead of the
     * actual swap, so the visible transition has less left to stream. Safe no-op if
     * the world or Data Layer manager is unavailable, or the era has no mapped layer.
     */
    UFUNCTION(BlueprintCallable, Category="Era")
    void PrewarmEra(ETimelineState Era);

    UFUNCTION(BlueprintPure, Category="Era")
    bool IsEraReady() const { return bEraReady; }

    UFUNCTION(BlueprintPure, Category="Era")
    bool IsTransitionInFlight() const { return bTransitionInFlight; }

    UFUNCTION(BlueprintPure, Category="Era")
    ETimelineState GetActiveEra() const { return ActiveEra; }

    UPROPERTY(BlueprintAssignable, Category="Era")
    FOnEraWorldChanged OnEraChanged;

    UPROPERTY(BlueprintAssignable, Category="Era")
    FOnEraReady OnEraReady;

private:
    UPROPERTY()
    TMap<ETimelineState, TSoftObjectPtr<UDataLayerAsset>> EraLayers;

    UPROPERTY()
    ETimelineState ActiveEra = ETimelineState::Present1985;

    UPROPERTY()
    ETimelineState PendingEra = ETimelineState::Present1985;

    bool bEraReady = true;

    // True only while an era load is streaming in. Gates per-frame streaming polling
    // in Tick() so the subsystem does no work when idle.
    bool bTransitionInFlight = false;
};
