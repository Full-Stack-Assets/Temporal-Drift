#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "MissionDataAsset.h"
#include "MissionSubsystem.h"
#include "TimeTravelTypes.h"
#include "MissionCoordinatorSubsystem.generated.h"

class UMissionSubsystem;
class UTimeTravelSubsystem;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnMissionCheckpointSaved, FName, CheckpointId);

UCLASS()
class BTTF_TEMPORALDRIFT_API UMissionCoordinatorSubsystem : public UWorldSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;

    UFUNCTION(BlueprintCallable, Category = "Mission")
    bool StartVerticalSliceMission();

    UFUNCTION(BlueprintCallable, Category = "Mission")
    bool StartMissionByAssetPath(const FString& AssetPath);

    UFUNCTION(BlueprintCallable, Category = "Mission")
    bool SubmitMissionEvent(FName EventId);

    UFUNCTION(BlueprintCallable, Category = "Mission")
    void NotifyJumpArrived(ETimelineState DestinationEra);

#if WITH_DEV_AUTOMATION_TESTS
    void InjectMissionSubsystemForTests(UMissionSubsystem* InMission) { MissionSubsystem = InMission; }
#endif

    UFUNCTION(BlueprintPure, Category = "Mission")
    bool IsVerticalSliceMissionActive() const;

    UPROPERTY(BlueprintAssignable, Category = "Mission")
    FOnMissionCheckpointSaved OnCheckpointSaved;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission")
    FString VerticalSliceMissionPath =
        TEXT("/Game/Data/Missions/Campaign/DA_Mission_M02_ClocktowerCalibration.DA_Mission_M02_ClocktowerCalibration");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission")
    FString DefaultSaveSlot = TEXT("BTTF_SaveSlot");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mission")
    bool bAutoSaveOnCheckpoint = true;

private:
    UFUNCTION()
    void HandleJumpArrived(FTimeTravelRequest Request);

    UFUNCTION()
    void HandleObjectiveChanged(FName ObjectiveId, EMissionObjectiveState State);

    void BindMissionDelegates();
    void UnbindMissionDelegates();
    void TryAutoSaveCheckpoint();

    UPROPERTY()
    TObjectPtr<UMissionSubsystem> MissionSubsystem;

    UPROPERTY()
    TObjectPtr<UTimeTravelSubsystem> TimeTravelSubsystem;

    bool bDelegatesBound = false;
};
