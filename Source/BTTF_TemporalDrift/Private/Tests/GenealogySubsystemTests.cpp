#if WITH_DEV_AUTOMATION_TESTS
#include "Misc/AutomationTest.h"
#include "GenealogySubsystem.h"
#include "Engine/GameInstance.h"
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFGenealogyTest,"BTTF.Population.Genealogy",EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FBTTFGenealogyTest::RunTest(const FString& Parameters)
{
    UGenealogyDataAsset* Data=NewObject<UGenealogyDataAsset>();
    FCitizenGenealogyRecord Elena;Elena.CitizenId=TEXT("Parker.Elena");Elena.FamilyId=TEXT("Parker");Elena.BirthYear=1930;Elena.DeathYear=2010;Elena.EraScheduleIds.Add(1955,TEXT("Diner.Day"));
    FCitizenGenealogyRecord June;June.CitizenId=TEXT("Parker.June");June.FamilyId=TEXT("Parker");June.BirthYear=1960;June.DeathYear=2040;June.ParentIds={Elena.CitizenId};June.EraScheduleIds.Add(1985,TEXT("Archive.Day"));
    FCitizenGenealogyRecord Nova;Nova.CitizenId=TEXT("Parker.Nova");Nova.FamilyId=TEXT("Parker");Nova.BirthYear=1995;Nova.DeathYear=2090;Nova.ParentIds={June.CitizenId};Nova.EraScheduleIds.Add(2045,TEXT("HeritageDistrict.Day"));
    Data->Citizens={Elena,June,Nova};
    UGameInstance* GI=NewObject<UGameInstance>();UGenealogySubsystem* System=NewObject<UGenealogySubsystem>(GI);
    TestTrue(TEXT("Genealogy loads"),System->LoadGenealogy(Data));
    TestTrue(TEXT("Elena exists in 1955"),System->IsCitizenAliveInYear(Elena.CitizenId,1955));
    TestFalse(TEXT("Nova not born in 1985"),System->IsCitizenAliveInYear(Nova.CitizenId,1985));
    TestEqual(TEXT("Two descendants"),System->GetDescendants(Elena.CitizenId).Num(),2);
    TestEqual(TEXT("2045 schedule selected"),System->GetScheduleForYear(Nova.CitizenId,2045),FName(TEXT("HeritageDistrict.Day")));
    TestFalse(TEXT("No cycle"),System->HasGenealogyCycle());return !HasAnyErrors();
}
#endif
