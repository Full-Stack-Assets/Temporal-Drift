#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "TimeTravelTypes.h"
#include "EraMusicTypes.generated.h"

class USoundBase;

USTRUCT(BlueprintType)
struct FEraMusicTrackInfo
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Music")
    ETimelineState Era = ETimelineState::Present1985;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Music")
    FText TrackTitle;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Music")
    FText ArtistName;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Music")
    FText FilmReference;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Music")
    FSoftObjectPath PrimaryMusicPath;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Music")
    FSoftObjectPath AlternateMusicPath;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Music")
    FText AlternateTrackTitle;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Music")
    FText AlternateArtistName;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Music")
    float DefaultVolume = 0.65f;
};

UCLASS()
class BTTF_TEMPORALDRIFT_API UEraMusicCatalog : public UObject
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintPure, Category = "Music", meta = (DisplayName = "Get Default Era Music Catalog"))
    static TArray<FEraMusicTrackInfo> GetDefaultCatalog();

    UFUNCTION(BlueprintPure, Category = "Music")
    static bool TryGetTrackForEra(ETimelineState Era, FEraMusicTrackInfo& OutTrack);

    UFUNCTION(BlueprintPure, Category = "Music")
    static FSoftObjectPath GetDefaultMusicPathForEra(ETimelineState Era);
};
