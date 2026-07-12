#pragma once
#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "MissionDataAsset.h"
#include "MissionSubsystem.generated.h"

USTRUCT(BlueprintType)
struct FMissionProgressSnapshot
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere,BlueprintReadWrite) FName MissionId;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 ActiveObjectiveIndex=INDEX_NONE;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) FName LastCheckpointId;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) TArray<FName> CompletedObjectiveIds;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) TArray<FName> ConsumedEventIds;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) float AccumulatedParadoxDelta=0.0f;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) bool bMissionCompleted=false;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnMissionObjectiveChanged,FName,ObjectiveId,EMissionObjectiveState,State);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnMissionCompleted,FName,MissionId);

UCLASS()
class BTTF_TEMPORALDRIFT_API UMissionSubsystem:public UGameInstanceSubsystem
{
    GENERATED_BODY()
public:
    UFUNCTION(BlueprintCallable) bool StartMission(UMissionDataAsset* Mission);
    UFUNCTION(BlueprintCallable) bool SubmitMissionEvent(FName EventId);
    UFUNCTION(BlueprintCallable) bool FailActiveObjective();
    UFUNCTION(BlueprintCallable) bool RestoreProgress(UMissionDataAsset* Mission,const FMissionProgressSnapshot& Snapshot);
    UFUNCTION(BlueprintPure) FMissionProgressSnapshot GetProgressSnapshot()const{return Progress;}
    UFUNCTION(BlueprintPure) FName GetActiveObjectiveId()const;
    UFUNCTION(BlueprintPure) bool IsMissionActive()const{return ActiveMission!=nullptr&&!Progress.bMissionCompleted;}
    UPROPERTY(BlueprintAssignable) FOnMissionObjectiveChanged OnObjectiveChanged;
    UPROPERTY(BlueprintAssignable) FOnMissionCompleted OnMissionCompleted;
private:
    bool ActivateNextRequiredObjective();
    UPROPERTY() TObjectPtr<UMissionDataAsset> ActiveMission;
    UPROPERTY() FMissionProgressSnapshot Progress;
};
