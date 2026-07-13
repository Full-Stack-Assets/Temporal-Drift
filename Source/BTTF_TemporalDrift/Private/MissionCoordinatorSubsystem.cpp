#include "MissionCoordinatorSubsystem.h"
#include "EraMusicSubsystem.h"
#include "BTTF_GameInstance.h"
#include "MissionSubsystem.h"
#include "DialogueSubsystem.h"
#include "TimeTravelSubsystem.h"
#include "TimelineFactSubsystem.h"
#include "EraWeatherSubsystem.h"
#include "MissionDataAsset.h"

namespace
{
    void ApplyTimelineFactsForObjective(FName MissionId, FName ObjectiveId, UGameInstance* GameInstance)
    {
        if (!GameInstance)
        {
            return;
        }

        UTimelineFactSubsystem* Facts = GameInstance->GetSubsystem<UTimelineFactSubsystem>();
        if (!Facts)
        {
            return;
        }

        if (MissionId == FName(TEXT("M02.ClocktowerCalibration")) && ObjectiveId == FName(TEXT("Return1985")))
        {
            Facts->SetBaseFact(FName(TEXT("C_PlaqueChanged")), true);
        }
        else if (MissionId == FName(TEXT("M03.TownOutOfTime")) && ObjectiveId == FName(TEXT("IdentifyCause")))
        {
            Facts->SetBaseFact(FName(TEXT("C_DinerRenamed")), true);
            Facts->SetBaseFact(FName(TEXT("C_SchoolDedication")), true);
            Facts->SetBaseFact(FName(TEXT("C_FounderMissing")), true);
        }
        else if (MissionId == FName(TEXT("M04.MissingComponent")) && ObjectiveId == FName(TEXT("RegulatorInstalled")))
        {
            Facts->SetBaseFact(FName(TEXT("1885.RailSurveyApproved")), true);
        }
        else if (MissionId == FName(TEXT("M05.RaceTheLightning")) && ObjectiveId == FName(TEXT("FinalDialogue")))
        {
            Facts->SetBaseFact(FName(TEXT("C_CampaignComplete")), true);
        }
    }

    void ApplyTimelineFactsForMissionEvent(FName EventId, UGameInstance* GameInstance)
    {
        if (!GameInstance)
        {
            return;
        }

        UTimelineFactSubsystem* Facts = GameInstance->GetSubsystem<UTimelineFactSubsystem>();
        if (!Facts)
        {
            return;
        }

        if (EventId == FName(TEXT("1885LandDisputeResolved")))
        {
            Facts->SetBaseFact(FName(TEXT("1885.LandDisputeWon")), true);
        }
        else if (EventId == FName(TEXT("1885SaloonStandoffResolved")))
        {
            Facts->SetBaseFact(FName(TEXT("1885.SaloonStandoffResolved")), true);
        }
        else if (EventId == FName(TEXT("1885RailSurveyApproved")))
        {
            Facts->SetBaseFact(FName(TEXT("1885.RailSurveyApproved")), true);
        }
        else if (EventId == FName(TEXT("1955ClocktowerFunded")))
        {
            Facts->SetBaseFact(FName(TEXT("1955.ClocktowerFunded")), true);
        }
    }
}

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
    MissionSubsystem->OnMissionCompleted.AddDynamic(this, &UMissionCoordinatorSubsystem::HandleMissionCompleted);
    bDelegatesBound = true;
}

void UMissionCoordinatorSubsystem::UnbindMissionDelegates()
{
    if (!bDelegatesBound || !MissionSubsystem)
    {
        return;
    }
    MissionSubsystem->OnObjectiveChanged.RemoveDynamic(this, &UMissionCoordinatorSubsystem::HandleObjectiveChanged);
    MissionSubsystem->OnMissionCompleted.RemoveDynamic(this, &UMissionCoordinatorSubsystem::HandleMissionCompleted);
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

bool UMissionCoordinatorSubsystem::StartFirstCampaignMission()
{
    return StartCampaignMission(FName(TEXT("M01.FirstTestRun")));
}

bool UMissionCoordinatorSubsystem::StartCampaignMission(FName MissionStableId)
{
    if (MissionStableId.IsNone())
    {
        return false;
    }

    if (MissionStableId == FName(TEXT("M05.RaceTheLightning")))
    {
        if (UGameInstance* GameInstance = GetGameInstance())
        {
            if (UEraWeatherSubsystem* Weather = GameInstance->GetSubsystem<UEraWeatherSubsystem>())
            {
                FEraWorldClock Clock;
                Clock.Era = ETimelineState::Past1955;
                Clock.Year = 1955;
                Clock.Month = 11;
                Clock.Day = 12;
                Clock.SecondsSinceMidnight = 21.5f * 3600.0f;
                Weather->SetWorldClock(Clock);
            }
        }
    }

    const FString Path = UBTTF_GameInstance::BuildMissionAssetPathFromStableId(MissionStableId);
    return StartMissionByAssetPath(Path);
}

FName UMissionCoordinatorSubsystem::GetNextCampaignMissionId(FName CompletedMissionId)
{
    if (CompletedMissionId == FName(TEXT("M01.FirstTestRun")))
    {
        return FName(TEXT("M02.ClocktowerCalibration"));
    }
    if (CompletedMissionId == FName(TEXT("M02.ClocktowerCalibration")))
    {
        return FName(TEXT("M03.TownOutOfTime"));
    }
    if (CompletedMissionId == FName(TEXT("M03.TownOutOfTime")))
    {
        return FName(TEXT("M04.MissingComponent"));
    }
    if (CompletedMissionId == FName(TEXT("M04.MissingComponent")))
    {
        return FName(TEXT("M05.RaceTheLightning"));
    }
    return NAME_None;
}

void UMissionCoordinatorSubsystem::HandleMissionCompleted(FName MissionId)
{
    if (!bAutoAdvanceCampaign)
    {
        return;
    }

    const FName NextMissionId = GetNextCampaignMissionId(MissionId);
    if (NextMissionId.IsNone())
    {
        return;
    }

    StartCampaignMission(NextMissionId);
}

bool UMissionCoordinatorSubsystem::SubmitMissionEvent(FName EventId)
{
    ApplyTimelineFactsForMissionEvent(EventId, GetGameInstance());
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

    if (MissionSubsystem)
    {
        const FMissionProgressSnapshot Snapshot = MissionSubsystem->GetProgressSnapshot();
        ApplyTimelineFactsForObjective(Snapshot.MissionId, ObjectiveId, GetGameInstance());
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
