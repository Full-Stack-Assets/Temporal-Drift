#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "WorldConsequenceSubsystem.generated.h"

USTRUCT(BlueprintType)
struct FWorldConsequenceDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FName FactId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FText ShortLabel;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FText Description;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FSoftObjectPath SignageMaterialPath;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnWorldConsequenceActivated, FName, FactId, FText, ShortLabel);

UCLASS()
class BTTF_TEMPORALDRIFT_API UWorldConsequenceSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;

    UFUNCTION(BlueprintPure, Category = "Consequences")
    FText GetActiveConsequencesSummary() const;

    UFUNCTION(BlueprintPure, Category = "Consequences")
    TArray<FName> GetActiveFactIds() const;

    UFUNCTION(BlueprintPure, Category = "Consequences")
    bool IsFactActive(FName FactId) const;

    UFUNCTION(BlueprintPure, Category = "Consequences")
    FText GetShortLabelForFact(FName FactId) const;

    UPROPERTY(BlueprintAssignable, Category = "Consequences")
    FOnWorldConsequenceActivated OnConsequenceActivated;

private:
    UFUNCTION()
    void HandleFactChanged(FName FactId, bool PreviousValue, bool NewValue);

    void RegisterDefaultConsequences();

    UPROPERTY()
    TMap<FName, FWorldConsequenceDefinition> Definitions;

    UPROPERTY()
    TSet<FName> ActiveFacts;
};
