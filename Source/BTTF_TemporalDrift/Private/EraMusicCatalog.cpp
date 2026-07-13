#include "EraMusicTypes.h"

namespace
{
    FEraMusicTrackInfo MakeTrack(
        ETimelineState Era,
        const TCHAR* Title,
        const TCHAR* Artist,
        const TCHAR* FilmRef,
        const TCHAR* PrimaryPath,
        const TCHAR* AlternatePath = nullptr,
        const TCHAR* AlternateTitle = nullptr,
        const TCHAR* AlternateArtist = nullptr,
        float Volume = 0.65f)
    {
        FEraMusicTrackInfo Track;
        Track.Era = Era;
        Track.TrackTitle = FText::FromString(Title);
        Track.ArtistName = FText::FromString(Artist);
        Track.FilmReference = FText::FromString(FilmRef);
        Track.PrimaryMusicPath = FSoftObjectPath(PrimaryPath);
        if (AlternatePath)
        {
            Track.AlternateMusicPath = FSoftObjectPath(AlternatePath);
            if (AlternateTitle)
            {
                Track.AlternateTrackTitle = FText::FromString(AlternateTitle);
            }
            if (AlternateArtist)
            {
                Track.AlternateArtistName = FText::FromString(AlternateArtist);
            }
        }
        Track.DefaultVolume = Volume;
        return Track;
    }
}

TArray<FEraMusicTrackInfo> UEraMusicCatalog::GetDefaultCatalog()
{
    return {
        MakeTrack(
            ETimelineState::Present1985,
            TEXT("The Power of Love"),
            TEXT("Huey Lewis and the News"),
            TEXT("Back to the Future (1985)"),
            TEXT("/Game/Audio/Music/Eras/MUS_1985_PowerOfLove.MUS_1985_PowerOfLove"),
            TEXT("/Game/Audio/Music/Eras/MUS_1985_BackInTime.MUS_1985_BackInTime"),
            TEXT("Back in Time"),
            TEXT("Huey Lewis and the News"),
            0.70f),
        MakeTrack(
            ETimelineState::Past1955,
            TEXT("Earth Angel"),
            TEXT("The Penguins"),
            TEXT("Back to the Future — Enchantment Under the Sea"),
            TEXT("/Game/Audio/Music/Eras/MUS_1955_EarthAngel.MUS_1955_EarthAngel"),
            TEXT("/Game/Audio/Music/Eras/MUS_1955_JohnnyBGoode.MUS_1955_JohnnyBGoode"),
            TEXT("Johnny B. Goode"),
            TEXT("Chuck Berry"),
            0.60f),
        MakeTrack(
            ETimelineState::Alternate1985,
            TEXT("Alternate 1985 Underscore"),
            TEXT("Alan Silvestri (style reference)"),
            TEXT("Back to the Future Part II — dystopian Hill Valley"),
            TEXT("/Game/Audio/Music/Eras/MUS_1985A_Dystopian.MUS_1985A_Dystopian"),
            nullptr,
            0.55f),
        MakeTrack(
            ETimelineState::Future2015,
            TEXT("Future 2015 Underscore"),
            TEXT("Alan Silvestri (style reference)"),
            TEXT("Back to the Future Part II — Hill Valley 2015"),
            TEXT("/Game/Audio/Music/Eras/MUS_2015_Future.MUS_2015_Future"),
            nullptr,
            0.60f),
        MakeTrack(
            ETimelineState::WildWest1885,
            TEXT("Wild West Source"),
            TEXT("Period western source (licensed)"),
            TEXT("Back to the Future Part III — 1885"),
            TEXT("/Game/Audio/Music/Eras/MUS_1885_Western.MUS_1885_Western"),
            nullptr,
            0.55f),
        MakeTrack(
            ETimelineState::DeepFuture2045,
            TEXT("Deep Future Underscore"),
            TEXT("Alan Silvestri (style reference)"),
            TEXT("Back to the Future Part II — 2045"),
            TEXT("/Game/Audio/Music/Eras/MUS_2045_Dystopian.MUS_2045_Dystopian"),
            nullptr,
            0.50f),
    };
}

bool UEraMusicCatalog::TryGetTrackForEra(ETimelineState Era, FEraMusicTrackInfo& OutTrack)
{
    for (const FEraMusicTrackInfo& Track : GetDefaultCatalog())
    {
        if (Track.Era == Era)
        {
            OutTrack = Track;
            return true;
        }
    }
    return false;
}

FSoftObjectPath UEraMusicCatalog::GetDefaultMusicPathForEra(ETimelineState Era)
{
    FEraMusicTrackInfo Track;
    return TryGetTrackForEra(Era, Track) ? Track.PrimaryMusicPath : FSoftObjectPath();
}
