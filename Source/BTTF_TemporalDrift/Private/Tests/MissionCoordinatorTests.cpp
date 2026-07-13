#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "MissionCoordinatorSubsystem.h"
#include "MissionSubsystem.h"
#include "MissionDataAsset.h"
#include "TimelineFactSubsystem.h"
#include "TimelineFactDataAsset.h"
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

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFMissionM01FlowTest,
    "BTTF.Mission.M01FirstTestRunContract",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFMissionM01FlowTest::RunTest(const FString& Parameters)
{
    UGameInstance* GameInstance = NewObject<UGameInstance>();
    GameInstance->Init();
    UMissionCoordinatorSubsystem* Coordinator = NewObject<UMissionCoordinatorSubsystem>();
    UMissionSubsystem* Mission = GameInstance->GetSubsystem<UMissionSubsystem>();
    Coordinator->InjectMissionSubsystemForTests(Mission);

    UMissionDataAsset* MissionData = NewObject<UMissionDataAsset>();
    MissionData->MissionId = TEXT("M01.FirstTestRun");
    auto Obj = [](const TCHAR* Id, const TCHAR* Event)
    {
        FMissionObjectiveDefinition O;
        O.ObjectiveId = Id;
        O.CompletionEvent = Event;
        return O;
    };
    MissionData->Objectives = {
        Obj(TEXT("MeetVale"), TEXT("TalkedToVale")),
        Obj(TEXT("CollectParts"), TEXT("CalibrationPartsCollected")),
        Obj(TEXT("InstallParts"), TEXT("VehicleReady")),
        Obj(TEXT("CompleteCourse"), TEXT("TestCourseComplete")),
        Obj(TEXT("ReturnToVale"), TEXT("M01Returned")),
    };

    TestTrue(TEXT("M01 starts"), Mission->StartMission(MissionData));
    TestTrue(TEXT("Vale met"), Coordinator->SubmitMissionEvent(TEXT("TalkedToVale")));
    TestTrue(TEXT("Parts collected"), Coordinator->SubmitMissionEvent(TEXT("CalibrationPartsCollected")));
    TestTrue(TEXT("Vehicle ready"), Coordinator->SubmitMissionEvent(TEXT("VehicleReady")));
    TestTrue(TEXT("Course complete"), Coordinator->SubmitMissionEvent(TEXT("TestCourseComplete")));
    TestTrue(TEXT("M01 completes"), Coordinator->SubmitMissionEvent(TEXT("M01Returned")));
    TestTrue(TEXT("M01 completion flag"), Mission->GetProgressSnapshot().bMissionCompleted);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFMissionM03FlowTest,
    "BTTF.Mission.M03TownOutOfTimeContract",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFMissionM03FlowTest::RunTest(const FString& Parameters)
{
    UGameInstance* GameInstance = NewObject<UGameInstance>();
    GameInstance->Init();
    UMissionCoordinatorSubsystem* Coordinator = NewObject<UMissionCoordinatorSubsystem>();
    UMissionSubsystem* Mission = GameInstance->GetSubsystem<UMissionSubsystem>();
    Coordinator->InjectMissionSubsystemForTests(Mission);

    UTimelineFactSubsystem* Facts = GameInstance->GetSubsystem<UTimelineFactSubsystem>();
    UTimelineFactDataAsset* FactData = NewObject<UTimelineFactDataAsset>();
    FTimelineFactDefinition Diner;
    Diner.FactId = TEXT("C_DinerRenamed");
    FactData->Facts = {Diner};
    Facts->LoadDefinitions(FactData);

    UMissionDataAsset* MissionData = NewObject<UMissionDataAsset>();
    MissionData->MissionId = TEXT("M03.TownOutOfTime");
    auto Obj = [](const TCHAR* Id, const TCHAR* Event, float Paradox = 0.0f)
    {
        FMissionObjectiveDefinition O;
        O.ObjectiveId = Id;
        O.CompletionEvent = Event;
        O.ParadoxDelta = Paradox;
        return O;
    };
    MissionData->Objectives = {
        Obj(TEXT("MeetJune"), TEXT("ArchiveBriefingComplete")),
        Obj(TEXT("InspectDiscrepancies"), TEXT("DiscrepanciesInspected"), 2.0f),
        Obj(TEXT("InterviewWitnesses"), TEXT("WitnessesInterviewed")),
        Obj(TEXT("IdentifyCause"), TEXT("AlterationIdentified")),
    };

    TestTrue(TEXT("M03 starts"), Mission->StartMission(MissionData));
    TestTrue(TEXT("Archive briefing"), Coordinator->SubmitMissionEvent(TEXT("ArchiveBriefingComplete")));
    TestTrue(TEXT("Evidence inspected"), Coordinator->SubmitMissionEvent(TEXT("DiscrepanciesInspected")));
    TestEqual(TEXT("M03 paradox from evidence"), Mission->GetProgressSnapshot().AccumulatedParadoxDelta, 2.0f);
    TestTrue(TEXT("Witnesses interviewed"), Coordinator->SubmitMissionEvent(TEXT("WitnessesInterviewed")));
    TestTrue(TEXT("Cause identified"), Coordinator->SubmitMissionEvent(TEXT("AlterationIdentified")));
    TestTrue(TEXT("M03 completes"), Mission->GetProgressSnapshot().bMissionCompleted);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFMissionM04FlowTest,
    "BTTF.Mission.M04MissingComponentContract",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFMissionM04FlowTest::RunTest(const FString& Parameters)
{
    UGameInstance* GameInstance = NewObject<UGameInstance>();
    GameInstance->Init();
    UMissionCoordinatorSubsystem* Coordinator = NewObject<UMissionCoordinatorSubsystem>();
    UMissionSubsystem* Mission = GameInstance->GetSubsystem<UMissionSubsystem>();
    Coordinator->InjectMissionSubsystemForTests(Mission);

    UMissionDataAsset* MissionData = NewObject<UMissionDataAsset>();
    MissionData->MissionId = TEXT("M04.MissingComponent");
    auto Obj = [](const TCHAR* Id, const TCHAR* Event)
    {
        FMissionObjectiveDefinition O;
        O.ObjectiveId = Id;
        O.CompletionEvent = Event;
        return O;
    };
    MissionData->Objectives = {
        Obj(TEXT("GatherClues"), TEXT("WorkshopLocated")),
        Obj(TEXT("InfiltrateWorkshop"), TEXT("WorkshopEntered")),
        Obj(TEXT("RecoverComponents"), TEXT("ComponentsRecovered")),
        Obj(TEXT("ResolveNotes"), TEXT("ResearchChoiceResolved")),
        Obj(TEXT("InstallRegulator"), TEXT("RegulatorInstalled")),
    };

    TestTrue(TEXT("M04 starts"), Mission->StartMission(MissionData));
    for (const TCHAR* Event : {
        TEXT("WorkshopLocated"), TEXT("WorkshopEntered"), TEXT("ComponentsRecovered"),
        TEXT("ResearchChoiceResolved"), TEXT("RegulatorInstalled")})
    {
        TestTrue(FString::Printf(TEXT("M04 event %s"), Event), Coordinator->SubmitMissionEvent(Event));
    }
    TestTrue(TEXT("M04 completes"), Mission->GetProgressSnapshot().bMissionCompleted);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFMissionM05FlowTest,
    "BTTF.Mission.M05RaceTheLightningContract",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFMissionM05FlowTest::RunTest(const FString& Parameters)
{
    UGameInstance* GameInstance = NewObject<UGameInstance>();
    GameInstance->Init();
    UMissionCoordinatorSubsystem* Coordinator = NewObject<UMissionCoordinatorSubsystem>();
    UMissionSubsystem* Mission = GameInstance->GetSubsystem<UMissionSubsystem>();
    Coordinator->InjectMissionSubsystemForTests(Mission);

    UMissionDataAsset* MissionData = NewObject<UMissionDataAsset>();
    MissionData->MissionId = TEXT("M05.RaceTheLightning");
    auto Obj = [](const TCHAR* Id, const TCHAR* Event)
    {
        FMissionObjectiveDefinition O;
        O.ObjectiveId = Id;
        O.CompletionEvent = Event;
        return O;
    };
    MissionData->Objectives = {
        Obj(TEXT("PrepareRoute"), TEXT("FinalePrepared")),
        Obj(TEXT("StartRun"), TEXT("FinalRunStarted")),
        Obj(TEXT("HitWire"), TEXT("LightningJumpComplete")),
        Obj(TEXT("InspectConsequences"), TEXT("ConsequencesInspected")),
        Obj(TEXT("FinalDialogue"), TEXT("CampaignResolved")),
    };

    TestTrue(TEXT("M05 starts"), Mission->StartMission(MissionData));
    for (const TCHAR* Event : {
        TEXT("FinalePrepared"), TEXT("FinalRunStarted"), TEXT("LightningJumpComplete"),
        TEXT("ConsequencesInspected"), TEXT("CampaignResolved")})
    {
        TestTrue(FString::Printf(TEXT("M05 event %s"), Event), Coordinator->SubmitMissionEvent(Event));
    }
    TestTrue(TEXT("M05 completes"), Mission->GetProgressSnapshot().bMissionCompleted);
    return !HasAnyErrors();
}

#endif
