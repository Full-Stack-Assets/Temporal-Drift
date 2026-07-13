#if WITH_DEV_AUTOMATION_TESTS
#include "Misc/AutomationTest.h"
#include "BTTF_SaveGame.h"
#include "MissionSubsystem.h"
#include "MissionDataAsset.h"
#include "Engine/GameInstance.h"
#include "Kismet/GameplayStatics.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFSaveSchemaTest,"BTTF.Save.SchemaAndMigration",EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FBTTFSaveSchemaTest::RunTest(const FString& Parameters)
{
    UBTTF_SaveGame* Save=NewObject<UBTTF_SaveGame>();
    TestEqual(TEXT("New save uses latest schema"),Save->SchemaVersion,UBTTF_SaveGame::LatestSchemaVersion);TestTrue(TEXT("New save valid"),Save->IsSaveDataValid());
    Save->SchemaVersion=1;Save->UnlockedEras.Reset();TestTrue(TEXT("Legacy save migrates"),Save->MigrateToLatestSchema());TestTrue(TEXT("Present era restored"),Save->UnlockedEras.Contains(ETimelineState::Present1985));
    Save->SavedParadoxLevel=101.0f;TestFalse(TEXT("Corrupt paradox rejected"),Save->IsSaveDataValid());Save->SavedParadoxLevel=25.0f;
    Save->SavedHeroTransform=FTransform(FRotator(0,90,0),FVector(100,200,300));
    Save->LastSafeVehicleTransform=FTransform(FRotator(0,45,0),FVector(400,500,600));
    Save->bPlayerInVehicle=false;
    TestFalse(TEXT("Hero transform persisted"),Save->SavedHeroTransform.Equals(FTransform::Identity));
    TestFalse(TEXT("Vehicle transform persisted"),Save->LastSafeVehicleTransform.Equals(FTransform::Identity));
    TestFalse(TEXT("Vehicle possession flag persisted"),Save->bPlayerInVehicle);
    Save->MissionProgress.MissionId=TEXT("M02.ClocktowerCalibration");Save->MissionProgress.ActiveObjectiveIndex=2;Save->HeroProgression.Temperance=6;Save->TemporalDrive.PlutoniumCells=2;
    TestEqual(TEXT("Mission stable ID stored"),Save->MissionProgress.MissionId,FName(TEXT("M02.ClocktowerCalibration")));TestEqual(TEXT("Hero progression stored"),Save->HeroProgression.Temperance,6);TestEqual(TEXT("Fuel stored"),Save->TemporalDrive.PlutoniumCells,2);
    const FString MissingSlot=TEXT("BTTF_Automation_MissingSlot_9E827");UGameplayStatics::DeleteGameInSlot(MissingSlot,0);TestFalse(TEXT("Missing file detected"),UGameplayStatics::DoesSaveGameExist(MissingSlot,0));
    UBTTF_ProfileSaveGame* Profile=NewObject<UBTTF_ProfileSaveGame>();
    Profile->bReducedFlash=true;Profile->UIScale=1.25f;
    TestTrue(TEXT("Profile reduced flash stored"),Profile->bReducedFlash);
    TestEqual(TEXT("Profile UI scale stored"),Profile->UIScale,1.25f);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFMissionCheckpointSnapshotTest,
    "BTTF.Save.MissionCheckpointSnapshot",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFMissionCheckpointSnapshotTest::RunTest(const FString& Parameters)
{
    UBTTF_SaveGame* Save = NewObject<UBTTF_SaveGame>();
    Save->MissionProgress.MissionId = TEXT("M02.ClocktowerCalibration");
    Save->MissionProgress.ActiveObjectiveIndex = 3;
    Save->MissionProgress.LastCheckpointId = TEXT("M02_Arrived1955");
    Save->MissionProgress.CompletedObjectiveIds = {
        FName(TEXT("Briefing")), FName(TEXT("InstallSensorVehicle")), FName(TEXT("Jump1955"))};
    Save->MissionProgress.AccumulatedParadoxDelta = -1.5f;
    Save->SavedTimelineState = ETimelineState::Past1955;
    Save->SavedParadoxLevel = 12.0f;

    TestTrue(TEXT("Checkpoint save schema valid"), Save->IsSaveDataValid());
    TestEqual(TEXT("Checkpoint ID persisted"), Save->MissionProgress.LastCheckpointId,
        FName(TEXT("M02_Arrived1955")));
    TestEqual(TEXT("Era at checkpoint persisted"), Save->SavedTimelineState, ETimelineState::Past1955);
    TestEqual(TEXT("Paradox at checkpoint persisted"), Save->SavedParadoxLevel, 12.0f);

    UMissionDataAsset* Mission = NewObject<UMissionDataAsset>();
    Mission->MissionId = TEXT("M02.ClocktowerCalibration");
    FMissionObjectiveDefinition Brief;
    Brief.ObjectiveId = TEXT("Briefing");
    Brief.CompletionEvent = TEXT("TalkedToValeAndJune");
    FMissionObjectiveDefinition Install;
    Install.ObjectiveId = TEXT("InstallSensorVehicle");
    Install.CompletionEvent = TEXT("SensorInstalledVehicle");
    FMissionObjectiveDefinition Jump;
    Jump.ObjectiveId = TEXT("Jump1955");
    Jump.CompletionEvent = TEXT("Arrived1955");
    FMissionObjectiveDefinition Reach;
    Reach.ObjectiveId = TEXT("ReachClocktower");
    Reach.CompletionEvent = TEXT("ClocktowerReached");
    Mission->Objectives = {Brief, Install, Jump, Reach};

    UGameInstance* GameInstance = NewObject<UGameInstance>();
    UMissionSubsystem* Restored = NewObject<UMissionSubsystem>(GameInstance);
    TestTrue(TEXT("Checkpoint progress restores"), Restored->RestoreProgress(Mission, Save->MissionProgress));
    TestEqual(TEXT("Restored objective index"), Restored->GetActiveObjectiveId(), Reach.ObjectiveId);
    return !HasAnyErrors();
}
#endif
