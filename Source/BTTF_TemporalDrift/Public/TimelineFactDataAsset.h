#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "TimelineFactDataAsset.generated.h"

USTRUCT(BlueprintType)
struct FTimelineFactDependency
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName FactId;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool RequiredValue = true;
};

USTRUCT(BlueprintType)
struct FTimelineFactDefinition
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName FactId;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool DefaultValue = false;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) TArray<FTimelineFactDependency> Dependencies;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool ValueWhenDependenciesSatisfied = true;
};

UCLASS(BlueprintType)
class BTTF_TEMPORALDRIFT_API UTimelineFactDataAsset : public UPrimaryDataAsset
{
    GENERATED_BODY()
public:
    UPROPERTY(EditAnywhere, BlueprintReadOnly) TArray<FTimelineFactDefinition> Facts;
};
