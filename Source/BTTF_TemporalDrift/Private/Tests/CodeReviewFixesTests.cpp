#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "MissionCoordinatorSubsystem.h"
#include "MissionSubsystem.h"
#include "MissionDataAsset.h"
#include "TimelineFactSubsystem.h"
#include "TimelineFactDataAsset.h"
#include "DeLoreanVehicle.h"
#include "TimeTravelSubsystem.h"
#include "VehicleInteractionComponent.h"
#include "BTTFHeroCharacter.h"
#include "Engine/GameInstance.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFMissionFactsApplyAfterAcceptTest,
    "BTTF.Mission.EventFactsApplyOnlyAfterAccept",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFMissionFactsApplyAfterAcceptTest::RunTest(const FString& Parameters)
{
    UGameInstance* GameInstance = NewObject<UGameInstance>();
    GameInstance->Init();

    UTimelineFactSubsystem* Facts = GameInstance->GetSubsystem<UTimelineFactSubsystem>();
    UTimelineFactDataAsset* FactData = NewObject<UTimelineFactDataAsset>();
    FTimelineFactDefinition LandDispute;
    LandDispute.FactId = TEXT("1885.LandDisputeWon");
    FactData->Facts = {LandDispute};
    Facts->LoadDefinitions(FactData);

    UMissionSubsystem* Mission = GameInstance->GetSubsystem<UMissionSubsystem>();
    UMissionCoordinatorSubsystem* Coordinator = NewObject<UMissionCoordinatorSubsystem>();
    Coordinator->InjectMissionSubsystemForTests(Mission);

    UMissionDataAsset* MissionData = NewObject<UMissionDataAsset>();
    MissionData->MissionId = TEXT("M02.ClocktowerCalibration");
    FMissionObjectiveDefinition Brief;
    Brief.ObjectiveId = TEXT("Briefing");
    Brief.CompletionEvent = TEXT("TalkedToValeAndJune");
    MissionData->Objectives = {Brief};
    TestTrue(TEXT("Mission starts"), Mission->StartMission(MissionData));

    TestFalse(TEXT("Out-of-order event rejected"),
        Coordinator->SubmitMissionEvent(TEXT("1885LandDisputeResolved")));

    bool bFound = false;
    TestFalse(TEXT("Rejected event does not mutate timeline facts"),
        Facts->GetFact(TEXT("1885.LandDisputeWon"), bFound) && bFound);

    TestTrue(TEXT("Valid event accepted"), Coordinator->SubmitMissionEvent(TEXT("TalkedToValeAndJune")));
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFRuntimeTimelineFactRestoreTest,
    "BTTF.Save.RuntimeTimelineFactOverridesRestore",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFRuntimeTimelineFactRestoreTest::RunTest(const FString& Parameters)
{
    UGameInstance* GameInstance = NewObject<UGameInstance>();
    GameInstance->Init();

    UTimelineFactSubsystem* Facts = GameInstance->GetSubsystem<UTimelineFactSubsystem>();
    UTimelineFactDataAsset* FactData = NewObject<UTimelineFactDataAsset>();
    FTimelineFactDefinition Plaque;
    Plaque.FactId = TEXT("C_PlaqueChanged");
    FactData->Facts = {Plaque};
    Facts->LoadDefinitions(FactData);

    TMap<FName, bool> Snapshot;
    Snapshot.Add(TEXT("C_RuntimeOnlyFact"), true);

    UGameInstance* RestoreInstance = NewObject<UGameInstance>();
    RestoreInstance->Init();
    UTimelineFactSubsystem* Restored = RestoreInstance->GetSubsystem<UTimelineFactSubsystem>();
    Restored->LoadDefinitions(FactData);
    TestTrue(TEXT("Runtime-only override restores"), Restored->RestoreOverrideSnapshot(Snapshot));

    bool bFound = false;
    TestTrue(TEXT("Runtime-only fact readable after restore"),
        Restored->GetFact(TEXT("C_RuntimeOnlyFact"), bFound) && bFound);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFVehicleJumpFailureRecoveryTest,
    "BTTF.Vehicle.TimeTravel.JumpFailureClearsVehicleState",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFVehicleJumpFailureRecoveryTest::RunTest(const FString& Parameters)
{
    ADeLoreanVehicle* Vehicle = NewObject<ADeLoreanVehicle>();
    Vehicle->StartTimeTravelEffects();
    TestTrue(TEXT("Vehicle marks traveling after jump start"), Vehicle->bIsTimeTraveling);

    Vehicle->HandleTimeTravelJumpFailed(FTimeTravelRequest(), FText::FromString(TEXT("Test failure")));
    TestFalse(TEXT("Jump failure clears vehicle traveling flag"), Vehicle->bIsTimeTraveling);
    TestFalse(TEXT("Jump failure disarms vehicle circuits"), Vehicle->bTimeCircuitsOn);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFVehicleInteractionExitContractTest,
    "BTTF.Hero.VehicleExitSupportsBehindOffset",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFVehicleInteractionExitContractTest::RunTest(const FString& Parameters)
{
    const ABTTFHeroCharacter* Hero = GetDefault<ABTTFHeroCharacter>();
    const UVehicleInteractionComponent* Interaction = Hero->GetVehicleInteractionComponent();
    TestTrue(TEXT("Behind exit offset configured"), Interaction->ExitBehindOffset >= 150.0f);
    TestTrue(TEXT("Side exit offset configured"), Interaction->ExitSideOffset >= 100.0f);
    return !HasAnyErrors();
}

#endif
