#include "MissionSubsystem.h"

bool UMissionSubsystem::StartMission(UMissionDataAsset* Mission)
{
    if(!Mission||Mission->MissionId.IsNone()||Mission->Objectives.IsEmpty()||IsMissionActive())return false;
    TSet<FName> Ids;
    for(const FMissionObjectiveDefinition& Objective:Mission->Objectives)
        if(Objective.ObjectiveId.IsNone()||Objective.CompletionEvent.IsNone()||Ids.Contains(Objective.ObjectiveId))return false;else Ids.Add(Objective.ObjectiveId);
    ActiveMission=Mission;Progress=FMissionProgressSnapshot();Progress.MissionId=Mission->MissionId;return ActivateNextRequiredObjective();
}

bool UMissionSubsystem::ActivateNextRequiredObjective()
{
    if(!ActiveMission)return false;
    for(int32 Index=Progress.ActiveObjectiveIndex+1;Index<ActiveMission->Objectives.Num();++Index)
    {
        if(!Progress.CompletedObjectiveIds.Contains(ActiveMission->Objectives[Index].ObjectiveId))
        {
            Progress.ActiveObjectiveIndex=Index;OnObjectiveChanged.Broadcast(ActiveMission->Objectives[Index].ObjectiveId,EMissionObjectiveState::Active);return true;
        }
    }
    Progress.ActiveObjectiveIndex=INDEX_NONE;Progress.bMissionCompleted=true;OnMissionCompleted.Broadcast(Progress.MissionId);return true;
}

bool UMissionSubsystem::SubmitMissionEvent(FName EventId)
{
    if(!IsMissionActive()||EventId.IsNone()||Progress.ConsumedEventIds.Contains(EventId)||!ActiveMission->Objectives.IsValidIndex(Progress.ActiveObjectiveIndex))return false;
    const FMissionObjectiveDefinition& Objective=ActiveMission->Objectives[Progress.ActiveObjectiveIndex];
    if(Objective.CompletionEvent!=EventId)return false;
    Progress.ConsumedEventIds.Add(EventId);Progress.CompletedObjectiveIds.Add(Objective.ObjectiveId);Progress.AccumulatedParadoxDelta+=Objective.ParadoxDelta;
    if(!Objective.CheckpointId.IsNone())Progress.LastCheckpointId=Objective.CheckpointId;
    OnObjectiveChanged.Broadcast(Objective.ObjectiveId,EMissionObjectiveState::Completed);return ActivateNextRequiredObjective();
}

bool UMissionSubsystem::FailActiveObjective()
{
    if(!IsMissionActive()||!ActiveMission->Objectives.IsValidIndex(Progress.ActiveObjectiveIndex))return false;
    OnObjectiveChanged.Broadcast(ActiveMission->Objectives[Progress.ActiveObjectiveIndex].ObjectiveId,EMissionObjectiveState::Failed);return true;
}

bool UMissionSubsystem::RestoreProgress(UMissionDataAsset* Mission,const FMissionProgressSnapshot& Snapshot)
{
    if(!Mission||Mission->MissionId!=Snapshot.MissionId)return false;
    if(!Snapshot.bMissionCompleted&&!Mission->Objectives.IsValidIndex(Snapshot.ActiveObjectiveIndex))return false;
    ActiveMission=Mission;Progress=Snapshot;return true;
}

FName UMissionSubsystem::GetActiveObjectiveId()const
{
    return ActiveMission&&ActiveMission->Objectives.IsValidIndex(Progress.ActiveObjectiveIndex)?ActiveMission->Objectives[Progress.ActiveObjectiveIndex].ObjectiveId:NAME_None;
}
