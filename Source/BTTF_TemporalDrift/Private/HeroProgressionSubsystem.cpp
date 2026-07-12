#include "HeroProgressionSubsystem.h"

bool UHeroProgressionSubsystem::LoadSkillDefinitions(const TArray<FHeroSkillDefinition>& Definitions)
{
    Skills.Reset();
    for(const FHeroSkillDefinition& Skill:Definitions)
    {
        if(Skill.SkillId.IsNone()||Skill.PointCost<1||Skills.Contains(Skill.SkillId))return false;
        Skills.Add(Skill.SkillId,Skill);
    }
    for(const TPair<FName,FHeroSkillDefinition>& Pair:Skills)for(FName Prerequisite:Pair.Value.Prerequisites)if(!Skills.Contains(Prerequisite))return false;
    return !Skills.IsEmpty();
}

void UHeroProgressionSubsystem::AwardSkillPoints(int32 Amount){Progress.AvailableSkillPoints=FMath::Max(0,Progress.AvailableSkillPoints+Amount);}
bool UHeroProgressionSubsystem::IsSkillUnlocked(FName SkillId)const{return Progress.UnlockedSkills.Contains(SkillId);}
bool UHeroProgressionSubsystem::UnlockSkill(FName SkillId)
{
    const FHeroSkillDefinition* Skill=Skills.Find(SkillId);
    if(!Skill||IsSkillUnlocked(SkillId)||Progress.AvailableSkillPoints<Skill->PointCost)return false;
    for(FName Prerequisite:Skill->Prerequisites)if(!IsSkillUnlocked(Prerequisite))return false;
    Progress.AvailableSkillPoints-=Skill->PointCost;Progress.UnlockedSkills.Add(SkillId);Progress.UnlockedSkills.Sort(FNameLexicalLess());return true;
}

void UHeroProgressionSubsystem::ResolveChickenProvocation(bool bResisted)
{
    if(bResisted){++Progress.ChickenChallengesResisted;Progress.Temperance=FMath::Min(100,Progress.Temperance+2);}
    else{++Progress.ChickenChallengesAccepted;Progress.Temperance=FMath::Max(0,Progress.Temperance-1);}
}

bool UHeroProgressionSubsystem::RestoreSnapshot(const FHeroProgressionSnapshot& Snapshot)
{
    if(Snapshot.AvailableSkillPoints<0||Snapshot.Temperance<0)return false;
    for(FName SkillId:Snapshot.UnlockedSkills)if(!Skills.Contains(SkillId))return false;
    Progress=Snapshot;Progress.UnlockedSkills.Sort(FNameLexicalLess());return true;
}
