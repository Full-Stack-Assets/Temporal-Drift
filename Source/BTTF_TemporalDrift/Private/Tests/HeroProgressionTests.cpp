#if WITH_DEV_AUTOMATION_TESTS
#include "Misc/AutomationTest.h"
#include "HeroProgressionSubsystem.h"
#include "Engine/GameInstance.h"
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFHeroProgressionTest,"BTTF.Hero.ProgressionAndTemperance",EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FBTTFHeroProgressionTest::RunTest(const FString& Parameters)
{
    FHeroSkillDefinition Guitar;Guitar.SkillId=TEXT("Performance.GuitarBasics");Guitar.Tree=EHeroSkillTree::Performance;Guitar.PointCost=1;
    FHeroSkillDefinition Showstopper;Showstopper.SkillId=TEXT("Performance.Showstopper");Showstopper.Tree=EHeroSkillTree::Performance;Showstopper.PointCost=2;Showstopper.Prerequisites={Guitar.SkillId};
    FHeroSkillDefinition Skitch;Skitch.SkillId=TEXT("Board.Skitch");Skitch.Tree=EHeroSkillTree::BoardMastery;Skitch.PointCost=2;
    UGameInstance* GI=NewObject<UGameInstance>();UHeroProgressionSubsystem* System=NewObject<UHeroProgressionSubsystem>(GI);
    TestTrue(TEXT("Skill definitions load"),System->LoadSkillDefinitions({Guitar,Showstopper,Skitch}));
    System->AwardSkillPoints(4);TestFalse(TEXT("Prerequisite enforced"),System->UnlockSkill(Showstopper.SkillId));
    TestTrue(TEXT("Basic skill unlocks"),System->UnlockSkill(Guitar.SkillId));TestTrue(TEXT("Dependent skill unlocks"),System->UnlockSkill(Showstopper.SkillId));
    TestEqual(TEXT("Points spent exactly"),System->GetSnapshot().AvailableSkillPoints,1);
    System->ResolveChickenProvocation(true);System->ResolveChickenProvocation(true);System->ResolveChickenProvocation(true);
    TestTrue(TEXT("Temperance ending condition unlocked"),System->HasTemperanceEndingCondition());
    FHeroProgressionSnapshot Saved=System->GetSnapshot();UGameInstance* GI2=NewObject<UGameInstance>();UHeroProgressionSubsystem* Restored=NewObject<UHeroProgressionSubsystem>(GI2);Restored->LoadSkillDefinitions({Guitar,Showstopper,Skitch});
    TestTrue(TEXT("Progress restores"),Restored->RestoreSnapshot(Saved));TestTrue(TEXT("Unlocked skill persists"),Restored->IsSkillUnlocked(Showstopper.SkillId));
    return !HasAnyErrors();
}
#endif
