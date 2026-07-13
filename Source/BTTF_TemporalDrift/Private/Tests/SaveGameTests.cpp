#if WITH_DEV_AUTOMATION_TESTS
#include "Misc/AutomationTest.h"
#include "BTTF_SaveGame.h"
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
    return !HasAnyErrors();
}
#endif
