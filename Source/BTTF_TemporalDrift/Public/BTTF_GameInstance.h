// BTTF_GameInstance.h
// BTTF_TemporalDrift - Game Instance with Timeline Save System
// Unreal Engine 5.8

#pragma once

#include "CoreMinimal.h"
#include "Engine/GameInstance.h"
#include "TimeTravelSubsystem.h"
#include "BTTF_SaveGame.h"
#include "BTTF_GameInstance.generated.h"

UCLASS()
class BTTF_TEMPORALDRIFT_API UBTTF_GameInstance : public UGameInstance
{
    GENERATED_BODY()

public:
    UBTTF_GameInstance();

    // ==================== SAVE DATA ====================
    UPROPERTY(BlueprintReadOnly, Category = "Save Data")
    ETimelineState CurrentSavedTimelineState;

    UPROPERTY(BlueprintReadOnly, Category = "Save Data")
    float CurrentSavedParadoxLevel;

    UPROPERTY(BlueprintReadOnly, Category = "Save Data")
    TArray<ETimelineState> UnlockedEras;

    UPROPERTY(BlueprintReadOnly, Category = "Save Data")
    int32 TotalTimeJumpsMade;

    // ==================== FUNCTIONS ====================
    UFUNCTION(BlueprintCallable, Category = "Save System")
    void SaveTimelineState();

    UFUNCTION(BlueprintCallable, Category = "Save System")
    void LoadTimelineState();

    UFUNCTION(BlueprintCallable, Category = "Save System")
    bool SaveGameToSlot(const FString& SlotName = "BTTF_SaveSlot");

    UFUNCTION(BlueprintCallable, Category = "Save System")
    bool LoadGameFromSlot(const FString& SlotName = "BTTF_SaveSlot");

    UFUNCTION(BlueprintCallable, Category = "Save System")
    void InitializeNewGame();

protected:
    virtual void Init() override;
    virtual void Shutdown() override;

private:
    UPROPERTY()
    UBTTF_SaveGame* CurrentSaveGame;
};
