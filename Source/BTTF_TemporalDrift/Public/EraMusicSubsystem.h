#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "EraMusicTypes.h"
#include "TimeTravelTypes.h"
#include "EraMusicSubsystem.generated.h"

class UAudioComponent;
class UEraDataAsset;
class UTimeTravelSubsystem;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnEraMusicChanged, FEraMusicTrackInfo, ActiveTrack);

UCLASS()
class BTTF_TEMPORALDRIFT_API UEraMusicSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void OnWorldBeginPlay(UWorld& InWorld) override;

    UFUNCTION(BlueprintCallable, Category = "Music")
    void PlayMusicForEra(ETimelineState Era, bool bUseAlternateTrack = false);

    UFUNCTION(BlueprintCallable, Category = "Music")
    void StopMusic(float FadeOutSeconds = 1.5f);

    UFUNCTION(BlueprintCallable, Category = "Music")
    void SetMusicVolume(float Volume);

    UFUNCTION(BlueprintCallable, Category = "Music")
    void SetMusicDucked(bool bDucked);

    UFUNCTION(BlueprintPure, Category = "Music")
    bool IsMusicPlaying() const;

    UFUNCTION(BlueprintPure, Category = "Music")
    FEraMusicTrackInfo GetActiveTrackInfo() const { return ActiveTrackInfo; }

    UFUNCTION(BlueprintPure, Category = "Music")
    ETimelineState GetActiveMusicEra() const { return ActiveMusicEra; }

    UPROPERTY(BlueprintAssignable, Category = "Music")
    FOnEraMusicChanged OnEraMusicChanged;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Music")
    float CrossfadeSeconds = 2.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Music")
    float TimeTravelDuckMultiplier = 0.25f;

private:
    UFUNCTION()
    void HandleEraReady(ETimelineState ReadyEra);

    UFUNCTION()
    void HandleTimeTravelPhaseChanged(ETimeTravelPhase PreviousPhase, ETimeTravelPhase NewPhase);

    void BindWorldDelegates(UWorld* World);
    void UnbindWorldDelegates(UWorld* World);
    bool ResolveTrackForEra(ETimelineState Era, bool bUseAlternateTrack, FEraMusicTrackInfo& OutTrack) const;
    void StartMusicFromTrack(const FEraMusicTrackInfo& Track);
    float GetEffectiveVolume() const;

    UPROPERTY(Transient)
    TObjectPtr<UAudioComponent> ActiveMusicComponent;

    UPROPERTY(Transient)
    TObjectPtr<UTimeTravelSubsystem> BoundTimeTravelSubsystem;

    FEraMusicTrackInfo ActiveTrackInfo;
    ETimelineState ActiveMusicEra = ETimelineState::Present1985;
    float MusicVolume = 1.0f;
    bool bMusicDucked = false;
    bool bDelegatesBound = false;
};
