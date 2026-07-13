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
    bool TryContinueGame(const FString& SlotName = TEXT(""));

    UFUNCTION(BlueprintPure, Category = "Save System")
    bool HasSaveGame(const FString& SlotName = TEXT("")) const;

    UFUNCTION(BlueprintCallable, Category = "Save System")
    bool DeleteSaveGame(const FString& SlotName = TEXT(""));

    UFUNCTION(BlueprintCallable, Category = "Save System")
    void InitializeNewGame();

    UFUNCTION(BlueprintCallable, Category = "Save System")
    void CapturePlayerState();

    UFUNCTION(BlueprintCallable, Category = "Save System")
    void RestorePlayerState();

    UFUNCTION(BlueprintCallable, Category = "Profile")
    bool LoadProfileSettings();

    UFUNCTION(BlueprintCallable, Category = "Profile")
    bool SaveProfileSettings();

    UFUNCTION(BlueprintCallable, Category = "Profile")
    void SetReducedFlashEnabled(bool bEnabled);

    UFUNCTION(BlueprintPure, Category = "Profile")
    bool IsReducedFlashEnabled() const;

    UFUNCTION(BlueprintPure, Category = "Profile")
    float GetUIScale() const;

    UFUNCTION(BlueprintPure, Category = "Profile")
    float GetSubtitleScale() const;

    UFUNCTION(BlueprintPure, Category = "Profile")
    float GetDialogueVolume() const;

    UFUNCTION(BlueprintPure, Category = "Profile")
    float GetMusicVolume() const;

    UFUNCTION(BlueprintPure, Category = "Profile")
    float GetEffectsVolume() const;

    UFUNCTION(BlueprintCallable, Category = "Profile")
    void SetUIScale(float Scale);

    UFUNCTION(BlueprintCallable, Category = "Profile")
    void SetSubtitleScale(float Scale);

    UFUNCTION(BlueprintCallable, Category = "Profile")
    void SetMusicVolume(float Volume);

    UFUNCTION(BlueprintCallable, Category = "Profile")
    void SetDialogueVolume(float Volume);

    UFUNCTION(BlueprintCallable, Category = "Profile")
    void SetEffectsVolume(float Volume);

    UFUNCTION(BlueprintCallable, Category = "Profile")
    void ApplyProfileAccessibility(UWorld* World);

    UFUNCTION(BlueprintCallable, Category = "Campaign")
    void BootstrapCampaignSystems();

    static FString BuildMissionAssetPathFromStableId(const FName& MissionStableId);

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Save System")
    FString DefaultSaveSlot = TEXT("BTTF_SaveSlot");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Save System")
    bool bAutoSaveOnShutdown = true;

protected:
    virtual void Init() override;
    virtual void Shutdown() override;

private:
    bool EnsureProfileLoaded();

    static const FString ProfileSlotName;

    UPROPERTY()
    UBTTF_SaveGame* CurrentSaveGame;

    UPROPERTY()
    UBTTF_ProfileSaveGame* ProfileSave;
};
