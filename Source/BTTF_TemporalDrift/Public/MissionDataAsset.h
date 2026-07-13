#pragma once
#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "MissionDataAsset.generated.h"

UENUM(BlueprintType)
enum class EMissionObjectiveState:uint8 { Inactive,Active,Completed,Failed };

USTRUCT(BlueprintType)
struct FMissionObjectiveDefinition
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere,BlueprintReadWrite) FName ObjectiveId;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) FText Description;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) FName CompletionEvent;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) FName CheckpointId;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) float ParadoxDelta=0.0f;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) bool bOptional=false;
};

UCLASS(BlueprintType)
class BTTF_TEMPORALDRIFT_API UMissionDataAsset:public UPrimaryDataAsset
{
    GENERATED_BODY()
public:
    UPROPERTY(EditAnywhere,BlueprintReadOnly) FName MissionId;
    UPROPERTY(EditAnywhere,BlueprintReadOnly) FText DisplayName;
    UPROPERTY(EditAnywhere,BlueprintReadOnly) TArray<FMissionObjectiveDefinition> Objectives;
};
