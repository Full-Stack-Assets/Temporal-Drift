#include "MissionCoordinatorSubsystem.h"
#include "BTTF_GameInstance.h"
#include "MissionSubsystem.h"
#include "TimeTravelSubsystem.h"
#include "MissionDataAsset.h"

void UMissionCoordinatorSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    if (UWorld* World = GetWorld())
    {
        TimeTravelSubsystem = World->GetSubsystem<UTimeTravelSubsystem>();
        if (TimeTravelSubsystem)
        {
            TimeTravelSubsystem->OnJumpArrived.AddDynamic(this, &UMissionCoordinatorSubsystem::HandleJumpArrived);
        }
    }
    if (UGameInstance* GameInstance = GetGameInstance())
    {
        MissionSubsystem = GameInstance->GetSubsystem<UMissionSubsystem>();
        BindMissionDelegates();
    }
}

void UMissionCoordinatorSubsystem::Deinitialize()
{
    UnbindMissionDelegates();
    if (TimeTravelSubsystem)
    {
        TimeTravelSubsystem->OnJumpArrived.RemoveDynamic(this, &UMissionCoordinatorSubsystem::HandleJumpArrived);
    }
    Super::Deinitialize();
}

void UMissionCoordinatorSubsystem::BindMissionDelegates()
{
    if (bDelegatesBound || !MissionSubsystem)
    {
        return;
    }
    MissionSubsystem->OnObjectiveChanged.AddDynamic(this, &UMissionCoordinatorSubsystem::HandleObjectiveChanged);
    bDelegatesBound = true;
}

void UMissionCoordinatorSubsystem::UnbindMissionDelegates()
{
    if (!bDelegatesBound || !MissionSubsystem)
    {
        return;
    }
    MissionSubsystem->OnObjectiveChanged.RemoveDynamic(this, &UMissionCoordinatorSubsystem::HandleObjectiveChanged);
    bDelegatesBound = false;
}

bool UMissionCoordinatorSubsystem::StartMissionByAssetPath(const FString& AssetPath)
{
    if (!MissionSubsystem)
    {
        return false;
    }
    UMissionDataAsset* Mission = LoadObject<UMissionDataAsset>(nullptr, *AssetPath);
    return Mission && MissionSubsystem->StartMission(Mission);
}

bool UMissionCoordinatorSubsystem::StartVerticalSliceMission()
{
    return StartMissionByAssetPath(VerticalSliceMissionPath);
}

bool UMissionCoordinatorSubsystem::SubmitMissionEvent(FName EventId)
{
    return MissionSubsystem && MissionSubsystem->SubmitMissionEvent(EventId);
}

void UMissionCoordinatorSubsystem::NotifyJumpArrived(ETimelineState DestinationEra)
{
    FTimeTravelRequest Request;
    Request.Destination = DestinationEra;
    HandleJumpArrived(Request);
}

bool UMissionCoordinatorSubsystem::IsVerticalSliceMissionActive() const
{
    return MissionSubsystem && MissionSubsystem->IsMissionActive();
}

void UMissionCoordinatorSubsystem::HandleJumpArrived(FTimeTravelRequest Request)
{
    if (!MissionSubsystem || !MissionSubsystem->IsMissionActive())
    {
        return;
    }

    if (Request.Destination == ETimelineState::Past1955)
    {
        SubmitMissionEvent(TEXT("Arrived1955"));
    }
    else if (Request.Destination == ETimelineState::Present1985)
    {
        SubmitMissionEvent(TEXT("Returned1985"));
    }
}

void UMissionCoordinatorSubsystem::HandleObjectiveChanged(FName ObjectiveId, EMissionObjectiveState State)
{
    if (State == EMissionObjectiveState::Completed)
    {
        TryAutoSaveCheckpoint();
    }
}

void UMissionCoordinatorSubsystem::TryAutoSaveCheckpoint()
{
    if (!bAutoSaveOnCheckpoint || !MissionSubsystem)
    {
        return;
    }

    const FMissionProgressSnapshot Snapshot = MissionSubsystem->GetProgressSnapshot();
    if (Snapshot.LastCheckpointId.IsNone())
    {
        return;
    }

    if (UBTTF_GameInstance* GameInstance = Cast<UBTTF_GameInstance>(GetGameInstance()))
    {
        if (GameInstance->SaveGameToSlot(DefaultSaveSlot))
        {
            OnCheckpointSaved.Broadcast(Snapshot.LastCheckpointId);
        }
    }
}
