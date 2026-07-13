#include "MissionCoordinatorSubsystem.h"
#include "EraMusicSubsystem.h"
#include "BTTF_GameInstance.h"
#include "MissionSubsystem.h"
#include "DialogueSubsystem.h"
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
        if (UDialogueSubsystem* Dialogue = GameInstance->GetSubsystem<UDialogueSubsystem>())
        {
            Dialogue->OnMissionEvent.AddDynamic(this, &UMissionCoordinatorSubsystem::HandleDialogueMissionEvent);
            Dialogue->OnDialogueEnded.AddDynamic(this, &UMissionCoordinatorSubsystem::HandleDialogueEnded);
        }
    }
}

void UMissionCoordinatorSubsystem::Deinitialize()
{
    UnbindMissionDelegates();
    if (UGameInstance* GameInstance = GetGameInstance())
    {
        if (UDialogueSubsystem* Dialogue = GameInstance->GetSubsystem<UDialogueSubsystem>())
        {
            Dialogue->OnMissionEvent.RemoveDynamic(this, &UMissionCoordinatorSubsystem::HandleDialogueMissionEvent);
            Dialogue->OnDialogueEnded.RemoveDynamic(this, &UMissionCoordinatorSubsystem::HandleDialogueEnded);
        }
    }
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
    if (State != EMissionObjectiveState::Completed)
    {
        return;
    }

    if (MissionSubsystem && TimeTravelSubsystem)
    {
        const float ParadoxDelta = MissionSubsystem->GetObjectiveParadoxDelta(ObjectiveId);
        if (!FMath::IsNearlyZero(ParadoxDelta))
        {
            TimeTravelSubsystem->ApplyDirectParadoxDelta(ParadoxDelta);
        }
    }

    if (State == EMissionObjectiveState::Completed && ObjectiveId == FName(TEXT("ReachClocktower")))
    {
        if (UGameInstance* GameInstance = GetGameInstance())
        {
            if (UEraMusicSubsystem* Music = GameInstance->GetSubsystem<UEraMusicSubsystem>())
            {
                Music->PlayMusicForEra(ETimelineState::Past1955, true);
            }
        }
    }

    TryAutoSaveCheckpoint();
}

void UMissionCoordinatorSubsystem::HandleDialogueMissionEvent(FName EventId, FName SourceNodeId)
{
    SubmitMissionEvent(EventId);
}

void UMissionCoordinatorSubsystem::HandleDialogueEnded()
{
    if (!TimeTravelSubsystem)
    {
        return;
    }

    if (UGameInstance* GameInstance = GetGameInstance())
    {
        if (UDialogueSubsystem* Dialogue = GameInstance->GetSubsystem<UDialogueSubsystem>())
        {
            const float ParadoxDelta = Dialogue->PendingParadoxDelta;
            if (!FMath::IsNearlyZero(ParadoxDelta))
            {
                TimeTravelSubsystem->ApplyDirectParadoxDelta(ParadoxDelta);
            }
            Dialogue->PendingParadoxDelta = 0.0f;
        }
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
