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

#endif
