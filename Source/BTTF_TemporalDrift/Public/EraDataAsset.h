// EraDataAsset.h - Sample Era Data Asset
#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "EraDataAsset.generated.h"

class UMaterialInterface;

UCLASS(BlueprintType)
class BTTF_TEMPORALDRIFT_API UEraDataAsset : public UPrimaryDataAsset
{
    GENERATED_BODY()

public:
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Era Info")
    FString EraName;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Era Info")
    FText EraDescription;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Visuals")
    TSoftObjectPtr<UWorld> EraLevel;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Visuals")
    TArray<TSoftObjectPtr<UMaterialInterface>> EraMaterials;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Gameplay")
    float ParadoxMultiplier = 1.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Gameplay")
    bool bAllowsMajorChanges = true;
};
