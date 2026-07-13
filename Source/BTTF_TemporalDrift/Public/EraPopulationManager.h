#pragma once
#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "TimeTravelTypes.h"
#include "EraPopulationManager.generated.h"

UENUM(BlueprintType)
enum class EEraTrafficType:uint8 { Horse,Stagecoach,Cruiser,Sedan,SkywayFlyer,AutonomousSwarm };

USTRUCT(BlueprintType)
struct FEraPopulationProfile
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 MaxPedestrians=40;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 MaxTraffic=12;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) TArray<EEraTrafficType> AllowedTraffic;
};

USTRUCT(BlueprintType)
struct FPopulationExclusionZone
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere,BlueprintReadWrite) FVector Center=FVector::ZeroVector;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) float Radius=500.0f;
};

UCLASS()
class BTTF_TEMPORALDRIFT_API UEraPopulationManager:public UWorldSubsystem
{
    GENERATED_BODY()
public:
    UEraPopulationManager();
    UFUNCTION(BlueprintCallable) void SetActiveEra(ETimelineState Era);
    UFUNCTION(BlueprintPure) FEraPopulationProfile GetActiveProfile()const;
    UFUNCTION(BlueprintCallable) bool ReserveNamedCitizen(FName CitizenId,const FVector& SpawnLocation);
    UFUNCTION(BlueprintCallable) void ReleaseNamedCitizen(FName CitizenId);
    UFUNCTION(BlueprintPure) bool IsNamedCitizenReserved(FName CitizenId)const;
    UFUNCTION(BlueprintCallable) bool ReserveAmbientPedestrian(const FVector& SpawnLocation);
    UFUNCTION(BlueprintCallable) bool ReserveTraffic(EEraTrafficType Type,const FVector& SpawnLocation);
    UFUNCTION(BlueprintCallable) void ReleaseAmbientPedestrian();
    UFUNCTION(BlueprintCallable) void ReleaseTraffic();
    UFUNCTION(BlueprintCallable) void SetMissionExclusionZones(const TArray<FPopulationExclusionZone>& Zones);
    UFUNCTION(BlueprintPure) bool IsSpawnAllowed(const FVector& Location)const;
private:
    UPROPERTY() TMap<ETimelineState,FEraPopulationProfile> Profiles;
    UPROPERTY() TSet<FName> ReservedNamedCitizens;
    UPROPERTY() TArray<FPopulationExclusionZone> ExclusionZones;
    ETimelineState ActiveEra=ETimelineState::Present1985;
    int32 ActiveAmbientPedestrians=0;
    int32 ActiveTraffic=0;
};
