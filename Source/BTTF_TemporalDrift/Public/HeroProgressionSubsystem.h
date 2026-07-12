#pragma once
#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "HeroProgressionSubsystem.generated.h"

UENUM(BlueprintType)
enum class EHeroSkillTree:uint8 { Performance,Marksmanship,BoardMastery,Tinkering };

USTRUCT(BlueprintType)
struct FHeroSkillDefinition
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere,BlueprintReadWrite) FName SkillId;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) EHeroSkillTree Tree=EHeroSkillTree::Performance;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 PointCost=1;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) TArray<FName> Prerequisites;
};

USTRUCT(BlueprintType)
struct FHeroProgressionSnapshot
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 AvailableSkillPoints=0;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) TArray<FName> UnlockedSkills;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 Temperance=0;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 ChickenChallengesAccepted=0;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 ChickenChallengesResisted=0;
};

UCLASS()
class BTTF_TEMPORALDRIFT_API UHeroProgressionSubsystem:public UGameInstanceSubsystem
{
    GENERATED_BODY()
public:
    UFUNCTION(BlueprintCallable) bool LoadSkillDefinitions(const TArray<FHeroSkillDefinition>& Definitions);
    UFUNCTION(BlueprintCallable) void AwardSkillPoints(int32 Amount);
    UFUNCTION(BlueprintCallable) bool UnlockSkill(FName SkillId);
    UFUNCTION(BlueprintPure) bool IsSkillUnlocked(FName SkillId)const;
    UFUNCTION(BlueprintCallable) void ResolveChickenProvocation(bool bResisted);
    UFUNCTION(BlueprintPure) bool HasTemperanceEndingCondition()const{return Progress.Temperance>=5&&Progress.ChickenChallengesResisted>=3;}
    UFUNCTION(BlueprintPure) FHeroProgressionSnapshot GetSnapshot()const{return Progress;}
    UFUNCTION(BlueprintCallable) bool RestoreSnapshot(const FHeroProgressionSnapshot& Snapshot);
private:
    UPROPERTY() TMap<FName,FHeroSkillDefinition> Skills;
    UPROPERTY() FHeroProgressionSnapshot Progress;
};
