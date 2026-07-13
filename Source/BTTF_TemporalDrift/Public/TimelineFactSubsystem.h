#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "TimelineFactDataAsset.h"
#include "TimelineFactSubsystem.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FOnTimelineFactChanged, FName, FactId, bool, PreviousValue, bool, NewValue);

UCLASS()
class BTTF_TEMPORALDRIFT_API UTimelineFactSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()
public:
    UFUNCTION(BlueprintCallable) bool LoadDefinitions(UTimelineFactDataAsset* Data);
    UFUNCTION(BlueprintCallable) bool SetBaseFact(FName FactId, bool Value);
    UFUNCTION(BlueprintCallable) bool RecomputeFacts();
    UFUNCTION(BlueprintPure) bool GetFact(FName FactId, bool& bFound) const;
    UFUNCTION(BlueprintPure) bool HasDependencyCycle() const { return bDependencyCycle; }
    UFUNCTION(BlueprintPure) TArray<FName> GetChangedFacts() const { return ChangedFacts; }
    UFUNCTION(BlueprintPure) TMap<FName, bool> GetOverrideSnapshot() const { return BaseOverrides; }
    UFUNCTION(BlueprintCallable) bool RestoreOverrideSnapshot(const TMap<FName, bool>& Snapshot);

    UPROPERTY(BlueprintAssignable) FOnTimelineFactChanged OnFactChanged;

private:
    bool VisitFact(FName FactId, TSet<FName>& Visiting, TSet<FName>& Visited, TArray<FName>& Order);

    UPROPERTY() TMap<FName, FTimelineFactDefinition> Definitions;
    UPROPERTY() TMap<FName, bool> BaseOverrides;
    UPROPERTY() TMap<FName, bool> ComputedValues;
    UPROPERTY() TArray<FName> ChangedFacts;
    bool bDependencyCycle = false;
};
