#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "HillValleyWorldValidator.generated.h"

class UWorld;

USTRUCT(BlueprintType)
struct FHillValleyValidationReport
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly) bool bPassed = false;
    UPROPERTY(BlueprintReadOnly) TMap<FName, int32> TagCounts;
    UPROPERTY(BlueprintReadOnly) TArray<FString> Failures;
};

UCLASS()
class BTTF_TEMPORALDRIFT_API UHillValleyWorldValidator : public UObject
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category="Hill Valley|Validation")
    static FHillValleyValidationReport ValidateWorld(UWorld* World);

    static const TMap<FName, int32>& GetRequiredTagMinimums();
};
