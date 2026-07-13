#include "EraMusicSubsystem.h"
#include "EraWorldManager.h"
#include "EraDataAsset.h"
#include "TimeTravelSubsystem.h"
#include "BTTF_GameInstance.h"
#include "Kismet/GameplayStatics.h"
#include "Components/AudioComponent.h"
#include "Sound/SoundBase.h"

void UEraMusicSubsystem::OnWorldBeginPlay(UWorld& InWorld)
{
    if (UBTTF_GameInstance* GameInstance = Cast<UBTTF_GameInstance>(GetGameInstance()))
    {
        MusicVolume = GameInstance->GetMusicVolume();
    }

    BindWorldDelegates(&InWorld);
    PlayMusicForEra(ETimelineState::Present1985);
}

void UEraMusicSubsystem::BindWorldDelegates(UWorld* World)
{
    if (!World || bDelegatesBound)
    {
        return;
    }

    if (UEraWorldManager* EraManager = World->GetSubsystem<UEraWorldManager>())
    {
        EraManager->OnEraReady.AddDynamic(this, &UEraMusicSubsystem::HandleEraReady);
    }

    if (UTimeTravelSubsystem* TimeTravel = World->GetSubsystem<UTimeTravelSubsystem>())
    {
        BoundTimeTravelSubsystem = TimeTravel;
        TimeTravel->OnPhaseChanged.AddDynamic(this, &UEraMusicSubsystem::HandleTimeTravelPhaseChanged);
    }

    bDelegatesBound = true;
}

void UEraMusicSubsystem::UnbindWorldDelegates(UWorld* World)
{
    if (!World || !bDelegatesBound)
    {
        return;
    }

    if (UEraWorldManager* EraManager = World->GetSubsystem<UEraWorldManager>())
    {
        EraManager->OnEraReady.RemoveDynamic(this, &UEraMusicSubsystem::HandleEraReady);
    }

    if (BoundTimeTravelSubsystem)
    {
        BoundTimeTravelSubsystem->OnPhaseChanged.RemoveDynamic(this, &UEraMusicSubsystem::HandleTimeTravelPhaseChanged);
        BoundTimeTravelSubsystem = nullptr;
    }

    bDelegatesBound = false;
}

void UEraMusicSubsystem::HandleEraReady(ETimelineState ReadyEra)
{
    PlayMusicForEra(ReadyEra);
}

void UEraMusicSubsystem::HandleTimeTravelPhaseChanged(ETimeTravelPhase PreviousPhase, ETimeTravelPhase NewPhase)
{
    const bool bShouldDuck = NewPhase == ETimeTravelPhase::Departing
        || NewPhase == ETimeTravelPhase::SwitchingEra
        || NewPhase == ETimeTravelPhase::Arriving;
    SetMusicDucked(bShouldDuck);

    if (NewPhase == ETimeTravelPhase::Idle && PreviousPhase == ETimeTravelPhase::Cooldown)
    {
        if (UWorld* World = GetWorld())
        {
            if (UTimeTravelSubsystem* TimeTravel = World->GetSubsystem<UTimeTravelSubsystem>())
            {
                PlayMusicForEra(TimeTravel->GetCurrentEra());
            }
        }
    }
}

bool UEraMusicSubsystem::ResolveTrackForEra(
    ETimelineState Era, bool bUseAlternateTrack, FEraMusicTrackInfo& OutTrack) const
{
    auto EraAssetPath = [](ETimelineState State) -> FString
    {
        switch (State)
        {
        case ETimelineState::Present1985: return TEXT("/Game/Data/EraDataAssets/DA_Era_1985.DA_Era_1985");
        case ETimelineState::Past1955: return TEXT("/Game/Data/EraDataAssets/DA_Era_1955.DA_Era_1955");
        case ETimelineState::Alternate1985: return TEXT("/Game/Data/EraDataAssets/DA_Era_1985A.DA_Era_1985A");
        case ETimelineState::Future2015: return TEXT("/Game/Data/EraDataAssets/DA_Era_2015.DA_Era_2015");
        case ETimelineState::WildWest1885: return TEXT("/Game/Data/EraDataAssets/DA_Era_1885.DA_Era_1885");
        case ETimelineState::DeepFuture2045: return TEXT("/Game/Data/EraDataAssets/DA_Era_2045.DA_Era_2045");
        default: return FString();
        }
    };

    if (const FString AssetPath = EraAssetPath(Era); !AssetPath.IsEmpty())
    {
        if (UEraDataAsset* EraData = LoadObject<UEraDataAsset>(nullptr, *AssetPath))
        {
            OutTrack.Era = Era;
            OutTrack.TrackTitle = EraData->MusicPrimaryTitle;
            OutTrack.ArtistName = EraData->MusicPrimaryArtist;
            OutTrack.FilmReference = EraData->MusicFilmReference;
            OutTrack.DefaultVolume = EraData->MusicDefaultVolume;
            OutTrack.PrimaryMusicPath = EraData->EraMusicPrimary.ToSoftObjectPath();
            OutTrack.AlternateMusicPath = EraData->EraMusicAlternate.ToSoftObjectPath();
            OutTrack.AlternateTrackTitle = EraData->MusicAlternateTitle;
            OutTrack.AlternateArtistName = EraData->MusicAlternateArtist;
            if (!OutTrack.PrimaryMusicPath.IsNull())
            {
                if (bUseAlternateTrack && !OutTrack.AlternateMusicPath.IsNull())
                {
                    OutTrack.PrimaryMusicPath = OutTrack.AlternateMusicPath;
                    if (!OutTrack.AlternateTrackTitle.IsEmpty())
                    {
                        OutTrack.TrackTitle = OutTrack.AlternateTrackTitle;
                    }
                    if (!OutTrack.AlternateArtistName.IsEmpty())
                    {
                        OutTrack.ArtistName = OutTrack.AlternateArtistName;
                    }
                }
                return true;
            }
        }
    }

    if (!UEraMusicCatalog::TryGetTrackForEra(Era, OutTrack))
    {
        return false;
    }

    if (bUseAlternateTrack && !OutTrack.AlternateMusicPath.IsNull())
    {
        OutTrack.PrimaryMusicPath = OutTrack.AlternateMusicPath;
        if (!OutTrack.AlternateTrackTitle.IsEmpty())
        {
            OutTrack.TrackTitle = OutTrack.AlternateTrackTitle;
        }
        if (!OutTrack.AlternateArtistName.IsEmpty())
        {
            OutTrack.ArtistName = OutTrack.AlternateArtistName;
        }
    }
    return !OutTrack.PrimaryMusicPath.IsNull();
}

void UEraMusicSubsystem::PlayMusicForEra(ETimelineState Era, bool bUseAlternateTrack)
{
    FEraMusicTrackInfo Track;
    if (!ResolveTrackForEra(Era, bUseAlternateTrack, Track))
    {
        return;
    }

    if (ActiveMusicEra == Era && ActiveMusicComponent && ActiveMusicComponent->IsPlaying()
        && ActiveTrackInfo.PrimaryMusicPath == Track.PrimaryMusicPath)
    {
        return;
    }

    StartMusicFromTrack(Track);
    ActiveMusicEra = Era;
    ActiveTrackInfo = Track;
    OnEraMusicChanged.Broadcast(ActiveTrackInfo);
}

void UEraMusicSubsystem::StartMusicFromTrack(const FEraMusicTrackInfo& Track)
{
    UWorld* World = GetWorld();
    if (!World)
    {
        return;
    }

    if (USoundBase* Sound = Cast<USoundBase>(Track.PrimaryMusicPath.TryLoad()))
    {
        if (ActiveMusicComponent && ActiveMusicComponent->IsPlaying())
        {
            ActiveMusicComponent->FadeOut(CrossfadeSeconds, 0.0f);
        }

        ActiveMusicComponent = UGameplayStatics::SpawnSound2D(
            World, Sound, GetEffectiveVolume() * Track.DefaultVolume, 1.0f, 0.0f, nullptr, true, false);
    }
}

void UEraMusicSubsystem::StopMusic(float FadeOutSeconds)
{
    if (ActiveMusicComponent)
    {
        ActiveMusicComponent->FadeOut(FadeOutSeconds, 0.0f);
        ActiveMusicComponent = nullptr;
    }
}

void UEraMusicSubsystem::SetMusicVolume(float Volume)
{
    MusicVolume = FMath::Clamp(Volume, 0.0f, 1.0f);
    if (ActiveMusicComponent)
    {
        ActiveMusicComponent->SetVolumeMultiplier(GetEffectiveVolume() * ActiveTrackInfo.DefaultVolume);
    }
}

void UEraMusicSubsystem::SetMusicDucked(bool bDucked)
{
    bMusicDucked = bDucked;
    if (ActiveMusicComponent)
    {
        ActiveMusicComponent->SetVolumeMultiplier(GetEffectiveVolume() * ActiveTrackInfo.DefaultVolume);
    }
}

bool UEraMusicSubsystem::IsMusicPlaying() const
{
    return ActiveMusicComponent && ActiveMusicComponent->IsPlaying();
}

float UEraMusicSubsystem::GetEffectiveVolume() const
{
    return MusicVolume * (bMusicDucked ? TimeTravelDuckMultiplier : 1.0f);
}
