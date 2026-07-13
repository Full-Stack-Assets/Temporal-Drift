#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "TimeTravelTypes.h"
#include "EraDataAsset.generated.h"

class UMaterialInterface;
class UDataLayerAsset;
class USoundBase;

UCLASS(BlueprintType)
class BTTF_TEMPORALDRIFT_API UEraDataAsset : public UPrimaryDataAsset
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Era Info")
    FString EraName;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Era Info")
    FText EraDescription;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Era Info")
    ETimelineState TimelineState = ETimelineState::Present1985;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Visuals")
    TSoftObjectPtr<UWorld> EraLevel;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Visuals")
    TSoftObjectPtr<UDataLayerAsset> DataLayerAsset;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Visuals")
    TArray<TSoftObjectPtr<UMaterialInterface>> EraMaterials;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "World")
    FTransform ArrivalTransform;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Audio")
    TSoftObjectPtr<USoundBase> AmbientLoop;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Audio")
    TSoftObjectPtr<USoundBase> EraMusicPrimary;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Audio")
    TSoftObjectPtr<USoundBase> EraMusicAlternate;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Audio")
    FText MusicPrimaryTitle;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Audio")
    FText MusicPrimaryArtist;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Audio")
    FText MusicAlternateTitle;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Audio")
    FText MusicAlternateArtist;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Audio")
    FText MusicFilmReference;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Audio", meta = (ClampMin = "0.0", ClampMax = "1.0"))
    float MusicDefaultVolume = 0.65f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Gameplay")
    float ParadoxMultiplier = 1.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Gameplay")
    bool bAllowsMajorChanges = true;
};
