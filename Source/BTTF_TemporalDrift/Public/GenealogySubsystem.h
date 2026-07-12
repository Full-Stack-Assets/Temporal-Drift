#pragma once
#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "GenealogyDataAsset.h"
#include "GenealogySubsystem.generated.h"

UCLASS()
class BTTF_TEMPORALDRIFT_API UGenealogySubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()
public:
    UFUNCTION(BlueprintCallable) bool LoadGenealogy(UGenealogyDataAsset* Data);
    UFUNCTION(BlueprintPure) bool IsCitizenAliveInYear(FName CitizenId,int32 Year) const;
    UFUNCTION(BlueprintPure) TArray<FName> GetChildren(FName CitizenId) const;
    UFUNCTION(BlueprintPure) TArray<FName> GetDescendants(FName CitizenId) const;
    UFUNCTION(BlueprintPure) FName GetScheduleForYear(FName CitizenId,int32 Year) const;
    UFUNCTION(BlueprintPure) bool HasGenealogyCycle() const { return bHasCycle; }

private:
    bool VisitParentChain(FName CitizenId,TSet<FName>& Visiting,TSet<FName>& Visited);
    UPROPERTY() TMap<FName,FCitizenGenealogyRecord> Records;
    TMultiMap<FName,FName> ChildrenByParent;
    bool bHasCycle=false;
};
