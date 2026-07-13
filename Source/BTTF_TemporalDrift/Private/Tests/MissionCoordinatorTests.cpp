#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "MissionCoordinatorSubsystem.h"
#include "MissionSubsystem.h"
#include "MissionDataAsset.h"
#include "Engine/GameInstance.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFMissionCoordinatorJumpBridgeTest,
    "BTTF.Mission.CoordinatorJumpBridge",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFMissionCoordinatorJumpBridgeTest::RunTest(const FString& Parameters)
{
    UGameInstance* GameInstance = NewObject<UGameInstance>();
    GameInstance->Init();
    UMissionCoordinatorSubsystem* Coordinator = NewObject<UMissionCoordinatorSubsystem>();
    UMissionSubsystem* Mission = GameInstance->GetSubsystem<UMissionSubsystem>();
    Coordinator->InjectMissionSubsystemForTests(Mission);
    TestNotNull(TEXT("Mission subsystem exists"), Mission);

    UMissionDataAsset* MissionData = NewObject<UMissionDataAsset>();
    MissionData->MissionId = TEXT("M02.ClocktowerCalibration");
    FMissionObjectiveDefinition Brief;
    Brief.ObjectiveId = TEXT("Briefing");
    Brief.CompletionEvent = TEXT("TalkedToValeAndJune");
    FMissionObjectiveDefinition Jump;
    Jump.ObjectiveId = TEXT("Jump1955");
    Jump.CompletionEvent = TEXT("Arrived1955");
    Jump.CheckpointId = TEXT("M02_Arrived1955");
    FMissionObjectiveDefinition Return;
    Return.ObjectiveId = TEXT("Return1985");
    Return.CompletionEvent = TEXT("Returned1985");
    MissionData->Objectives = {Brief, Jump, Return};

    TestTrue(TEXT("Mission starts"), Mission->StartMission(MissionData));
    TestTrue(TEXT("Briefing completes"), Coordinator->SubmitMissionEvent(TEXT("TalkedToValeAndJune")));
    TestEqual(TEXT("Jump objective active"), Mission->GetActiveObjectiveId(), Jump.ObjectiveId);

    Coordinator->NotifyJumpArrived(ETimelineState::Past1955);
    TestEqual(TEXT("Arrival advances mission"), Mission->GetActiveObjectiveId(), Return.ObjectiveId);

    Coordinator->NotifyJumpArrived(ETimelineState::Present1985);
    TestTrue(TEXT("Mission completes after return"), Mission->GetProgressSnapshot().bMissionCompleted);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFMissionM02VerticalSliceTest,
    "BTTF.Mission.M02VerticalSliceContract",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFMissionM02VerticalSliceTest::RunTest(const FString& Parameters)
{
    UGameInstance* GameInstance = NewObject<UGameInstance>();
    GameInstance->Init();
    UMissionCoordinatorSubsystem* Coordinator = NewObject<UMissionCoordinatorSubsystem>();
    UMissionSubsystem* Mission = GameInstance->GetSubsystem<UMissionSubsystem>();
    Coordinator->InjectMissionSubsystemForTests(Mission);

    UMissionDataAsset* MissionData = NewObject<UMissionDataAsset>();
    MissionData->MissionId = TEXT("M02.ClocktowerCalibration");

    auto MakeObjective = [](const TCHAR* Id, const TCHAR* Event, const TCHAR* Checkpoint, float Paradox = 0.0f)
    {
        FMissionObjectiveDefinition Objective;
        Objective.ObjectiveId = Id;
        Objective.CompletionEvent = Event;
        Objective.CheckpointId = Checkpoint;
        Objective.ParadoxDelta = Paradox;
        return Objective;
    };

    MissionData->Objectives = {
        MakeObjective(TEXT("Briefing"), TEXT("TalkedToValeAndJune"), TEXT("M02_Briefing")),
        MakeObjective(TEXT("InstallSensorVehicle"), TEXT("SensorInstalledVehicle"), TEXT("M02_SensorInstalledVehicle")),
        MakeObjective(TEXT("Jump1955"), TEXT("Arrived1955"), TEXT("M02_Arrived1955")),
        MakeObjective(TEXT("ReachClocktower"), TEXT("ClocktowerReached"), TEXT("M02_ClocktowerReached")),
        MakeObjective(TEXT("Calibrate"), TEXT("ClocktowerCalibrated"), TEXT("M02_Calibrated"), -3.0f),
        MakeObjective(TEXT("Return1985"), TEXT("Returned1985"), TEXT("M02_Returned1985")),
    };

    TestTrue(TEXT("M02 starts"), Mission->StartMission(MissionData));
    TestTrue(TEXT("Briefing completes"), Coordinator->SubmitMissionEvent(TEXT("TalkedToValeAndJune")));
    TestTrue(TEXT("Vehicle sensor installs"), Coordinator->SubmitMissionEvent(TEXT("SensorInstalledVehicle")));
    TestEqual(TEXT("Jump objective active"), Mission->GetActiveObjectiveId(), FName(TEXT("Jump1955")));

    Coordinator->NotifyJumpArrived(ETimelineState::Past1955);
    TestEqual(TEXT("Clocktower reach active"), Mission->GetActiveObjectiveId(), FName(TEXT("ReachClocktower")));
    TestTrue(TEXT("Courthouse reached"), Coordinator->SubmitMissionEvent(TEXT("ClocktowerReached")));

    TestTrue(TEXT("Calibration completes"), Coordinator->SubmitMissionEvent(TEXT("ClocktowerCalibrated")));
    TestEqual(TEXT("Calibration paradox recorded"), Mission->GetProgressSnapshot().AccumulatedParadoxDelta, -3.0f);
    TestEqual(TEXT("Return objective active"), Mission->GetActiveObjectiveId(), FName(TEXT("Return1985")));

    Coordinator->NotifyJumpArrived(ETimelineState::Present1985);
    TestTrue(TEXT("M02 completes after return"), Mission->GetProgressSnapshot().bMissionCompleted);
    TestEqual(TEXT("Final checkpoint stored"), Mission->GetProgressSnapshot().LastCheckpointId,
        FName(TEXT("M02_Returned1985")));
    return !HasAnyErrors();
}

#endif
