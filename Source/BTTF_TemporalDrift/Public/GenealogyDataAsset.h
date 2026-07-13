#pragma once
#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "GenealogyDataAsset.generated.h"

USTRUCT(BlueprintType)
struct FCitizenGenealogyRecord
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName CitizenId;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName FamilyId;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 BirthYear = 1900;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 DeathYear = 2100;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) TArray<FName> ParentIds;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) TMap<int32,FName> EraScheduleIds;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) TArray<FName> PersonalityTags;
};

UCLASS(BlueprintType)
class BTTF_TEMPORALDRIFT_API UGenealogyDataAsset : public UPrimaryDataAsset
{
    GENERATED_BODY()
public:
    UPROPERTY(EditAnywhere, BlueprintReadOnly) TArray<FCitizenGenealogyRecord> Citizens;
};
