#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "TimeTravelTypes.h"
#include "PopulationSpawnSubsystem.generated.h"

class AHillValleyAmbientPedestrian;
class UEraPopulationManager;
class UEraWorldManager;

UCLASS()
class BTTF_TEMPORALDRIFT_API UPopulationSpawnSubsystem : public UTickableWorldSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;
    virtual void Tick(float DeltaTime) override;
    virtual TStatId GetStatId() const override;

    UFUNCTION(BlueprintCallable, Category="Population")
    void RefreshPopulationForEra(ETimelineState Era);

    UFUNCTION(BlueprintPure, Category="Population")
    int32 GetActivePedestrianCount() const { return ActivePedestrians.Num(); }

    UPROPERTY(EditAnywhere, Category="Population")
    float SpawnRadiusAroundPlayer = 18000.0f;

    UPROPERTY(EditAnywhere, Category="Population")
    int32 MaxAmbientPedestriansNearPlayer = 24;

private:
    UFUNCTION()
    void HandleEraReady(ETimelineState ReadyEra);

    void ClearSpawnedPopulation();
    void CollectWorldAnchors();
    void SpawnAmbientPopulation(ETimelineState Era);
    void SpawnNamedCitizens();
    TArray<FVector> BuildWanderRoute(const FVector& Origin, int32 PointCount) const;
    bool IsWithinSpawnRadius(const FVector& Location) const;

    UPROPERTY()
    TArray<TObjectPtr<AHillValleyAmbientPedestrian>> ActivePedestrians;

    UPROPERTY()
    TArray<FVector> PedestrianNodes;

    UPROPERTY()
    TMap<FName, FVector> NamedCitizenNodes;

    UPROPERTY()
    ETimelineState ActiveEra = ETimelineState::Present1985;

    bool bAnchorsCollected = false;
};
