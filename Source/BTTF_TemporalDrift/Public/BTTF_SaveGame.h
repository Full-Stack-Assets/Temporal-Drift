// BTTF_SaveGame.h
// BTTF_TemporalDrift - Save Game Data Class
// Unreal Engine 5.8

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "TimeTravelSubsystem.h"
#include "MissionSubsystem.h"
#include "HeroProgressionSubsystem.h"
#include "TemporalDriveSubsystem.h"
#include "EraWeatherSubsystem.h"
#include "CraftingSubsystem.h"
#include "DialogueSubsystem.h"
#include "TemporalKernel/TemporalKernelTypes.h"
#include "BTTF_SaveGame.generated.h"

UCLASS()
class BTTF_TEMPORALDRIFT_API UBTTF_SaveGame : public USaveGame
{
    GENERATED_BODY()

public:
    static constexpr int32 LatestSchemaVersion = 4;
    UBTTF_SaveGame();

    UFUNCTION(BlueprintCallable) bool MigrateToLatestSchema();
    UFUNCTION(BlueprintPure) bool IsSaveDataValid() const;

    UPROPERTY(VisibleAnywhere, Category = "Schema") int32 SchemaVersion;

    // ==================== SAVED DATA ====================
    UPROPERTY(VisibleAnywhere, Category = "Timeline")
    ETimelineState SavedTimelineState;

    UPROPERTY(VisibleAnywhere, Category = "Timeline")
    float SavedParadoxLevel;

    UPROPERTY(VisibleAnywhere, Category = "Timeline")
    TArray<ETimelineState> UnlockedEras;

    UPROPERTY(VisibleAnywhere, Category = "Progress")
    int32 TotalTimeJumps;

    UPROPERTY(VisibleAnywhere, Category = "Progress")
    FString LastSaveDate;

    UPROPERTY(VisibleAnywhere, Category = "Settings")
    float MasterVolume;

    UPROPERTY(VisibleAnywhere, Category="Vehicle") FTransform LastSafeVehicleTransform;
    UPROPERTY(VisibleAnywhere, Category="Hero") FTransform SavedHeroTransform;
    UPROPERTY(VisibleAnywhere, Category="Hero") bool bPlayerInVehicle=false;
    UPROPERTY(VisibleAnywhere, Category="Mission") FMissionProgressSnapshot MissionProgress;
    UPROPERTY(VisibleAnywhere, Category="Hero") FHeroProgressionSnapshot HeroProgression;
    UPROPERTY(VisibleAnywhere, Category="Vehicle") FTemporalDriveSnapshot TemporalDrive;
    UPROPERTY(VisibleAnywhere, Category="World") FEraWorldClock WorldClock;
    UPROPERTY(VisibleAnywhere, Category="Timeline") TMap<FName,bool> TimelineFactOverrides;
    UPROPERTY(VisibleAnywhere, Category="Timeline") FTemporalKernelSaveData TemporalKernel;
    UPROPERTY(VisibleAnywhere, Category="Crafting") FCraftingSnapshot Crafting;
    UPROPERTY(VisibleAnywhere, Category="Dialogue") FDialogueProgressSnapshot DialogueProgress;
};

UCLASS()
class BTTF_TEMPORALDRIFT_API UBTTF_ProfileSaveGame : public USaveGame
{
    GENERATED_BODY()
public:
    UPROPERTY(VisibleAnywhere,Category="Schema") int32 SchemaVersion=1;
    UPROPERTY(VisibleAnywhere,Category="Audio") float MasterVolume=1.0f;
    UPROPERTY(VisibleAnywhere,Category="Audio") float MusicVolume=1.0f;
    UPROPERTY(VisibleAnywhere,Category="Audio") float EffectsVolume=1.0f;
    UPROPERTY(VisibleAnywhere,Category="Accessibility") bool bReducedFlash=false;
    UPROPERTY(VisibleAnywhere,Category="Accessibility") float UIScale=1.0f;
    UPROPERTY(VisibleAnywhere,Category="Accessibility") float SubtitleScale=1.0f;
    UPROPERTY(VisibleAnywhere,Category="Audio") float DialogueVolume=1.0f;
};
