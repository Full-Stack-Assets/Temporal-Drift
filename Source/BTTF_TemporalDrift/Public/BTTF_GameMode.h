// BTTF_GameMode.h
// BTTF_TemporalDrift - Game Mode Class
// Unreal Engine 5.8

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "TimeTravelSubsystem.h"
#include "BTTF_GameMode.generated.h"

UCLASS()
class BTTF_TEMPORALDRIFT_API ABTTF_GameMode : public AGameModeBase
{
    GENERATED_BODY()

public:
    ABTTF_GameMode();

    virtual void BeginPlay() override;

    // ==================== ERA MANAGEMENT ====================
    UFUNCTION(BlueprintCallable, Category = "Time Travel")
    void SwitchToEra(ETimelineState NewEra);

    UFUNCTION(BlueprintCallable, Category = "Time Travel")
    void ReturnToPreviousEra();

    UFUNCTION(BlueprintPure, Category = "Time Travel")
    ETimelineState GetCurrentEra() const;

    // ==================== GAME STATE ====================
    UFUNCTION(BlueprintCallable, Category = "Game State")
    void StartNewGame();

    UFUNCTION(BlueprintCallable, Category = "Game State")
    void SaveCurrentProgress();

    UFUNCTION(BlueprintCallable, Category = "Game State")
    void StartVerticalSliceMission();

    UFUNCTION(BlueprintCallable, Category = "Game State")
    void StartFullCampaign();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Game State")
    bool bAutoLoadSaveOnStart = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Game State")
    bool bStartFullCampaignOnNewGame = false;

protected:
    UPROPERTY()
    UTimeTravelSubsystem* TimeTravelSubsystem;

private:
    void InitializeTimeTravelSubsystem();
};
