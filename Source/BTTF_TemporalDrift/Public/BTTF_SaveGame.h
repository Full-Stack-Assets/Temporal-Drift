// BTTF_SaveGame.h
// BTTF_TemporalDrift - Save Game Data Class
// Unreal Engine 5.8

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "TimeTravelSubsystem.h"
#include "BTTF_SaveGame.generated.h"

UCLASS()
class BTTF_TEMPORALDRIFT_API UBTTF_SaveGame : public USaveGame
{
    GENERATED_BODY()

public:
    UBTTF_SaveGame();

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
};
