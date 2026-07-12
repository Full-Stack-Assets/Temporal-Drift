#if WITH_DEV_AUTOMATION_TESTS
#include "Misc/AutomationTest.h"
#include "MissionSubsystem.h"
#include "Engine/GameInstance.h"
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFMissionProgressTest,"BTTF.Mission.ProgressAndCheckpoint",EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FBTTFMissionProgressTest::RunTest(const FString& Parameters)
{
    UMissionDataAsset* Mission=NewObject<UMissionDataAsset>();Mission->MissionId=TEXT("M02.ClocktowerCalibration");
    FMissionObjectiveDefinition Brief;Brief.ObjectiveId=TEXT("Briefing");Brief.CompletionEvent=TEXT("TalkedToVale");Brief.CheckpointId=TEXT("M02_Briefing");
    FMissionObjectiveDefinition Jump;Jump.ObjectiveId=TEXT("Jump1955");Jump.CompletionEvent=TEXT("Arrived1955");Jump.CheckpointId=TEXT("M02_Arrived1955");Jump.ParadoxDelta=3.0f;
    FMissionObjectiveDefinition Sensor;Sensor.ObjectiveId=TEXT("InstallSensor");Sensor.CompletionEvent=TEXT("SensorInstalled");Sensor.CheckpointId=TEXT("M02_Calibrated");
    Mission->Objectives={Brief,Jump,Sensor};
    UGameInstance* GI=NewObject<UGameInstance>();UMissionSubsystem* System=NewObject<UMissionSubsystem>(GI);
    TestTrue(TEXT("Mission starts"),System->StartMission(Mission));TestEqual(TEXT("First objective active"),System->GetActiveObjectiveId(),Brief.ObjectiveId);
    TestFalse(TEXT("Out-of-order event rejected"),System->SubmitMissionEvent(TEXT("Arrived1955")));
    TestTrue(TEXT("Briefing completes"),System->SubmitMissionEvent(TEXT("TalkedToVale")));TestEqual(TEXT("Jump objective active"),System->GetActiveObjectiveId(),Jump.ObjectiveId);
    TestFalse(TEXT("Duplicate event rejected"),System->SubmitMissionEvent(TEXT("TalkedToVale")));
    TestTrue(TEXT("Arrival completes"),System->SubmitMissionEvent(TEXT("Arrived1955")));
    FMissionProgressSnapshot Saved=System->GetProgressSnapshot();TestEqual(TEXT("Checkpoint advanced"),Saved.LastCheckpointId,FName(TEXT("M02_Arrived1955")));TestEqual(TEXT("Paradox accumulated"),Saved.AccumulatedParadoxDelta,3.0f);
    UGameInstance* GI2=NewObject<UGameInstance>();UMissionSubsystem* Restored=NewObject<UMissionSubsystem>(GI2);TestTrue(TEXT("Progress restores"),Restored->RestoreProgress(Mission,Saved));TestEqual(TEXT("Exact objective restored"),Restored->GetActiveObjectiveId(),Sensor.ObjectiveId);
    TestTrue(TEXT("Mission finishes"),Restored->SubmitMissionEvent(TEXT("SensorInstalled")));TestTrue(TEXT("Completion persisted"),Restored->GetProgressSnapshot().bMissionCompleted);
    return !HasAnyErrors();
}
#endif
