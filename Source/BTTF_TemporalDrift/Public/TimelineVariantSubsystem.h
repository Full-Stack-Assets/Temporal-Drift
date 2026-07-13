#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "TimeTravelTypes.h"
#include "TimelineVariantSubsystem.generated.h"

UCLASS()
class BTTF_TEMPORALDRIFT_API UTimelineVariantSubsystem : public UWorldSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;

    UFUNCTION(BlueprintCallable, Category="Timeline Variants")
    void RefreshAllVariants();

    UFUNCTION(BlueprintCallable, Category="Timeline Variants")
    void ApplyVariantVisibilityForFact(FName FactId, bool bFactValue);

    UFUNCTION(BlueprintPure, Category="Timeline Variants")
    int32 GetRegisteredVariantActorCount() const { return VariantActors.Num(); }

private:
    UFUNCTION()
    void HandleFactChanged(FName FactId, bool PreviousValue, bool NewValue);

    UFUNCTION()
    void HandleEraReady(ETimelineState ReadyEra);

    void CollectVariantActors();
    bool ShouldActorBeVisible(AActor* Actor) const;
    bool MatchesGateTag(const FName& Tag, bool& bShowIf, FName& OutFactId) const;
    bool EvaluateFactValue(FName FactId) const;

    UPROPERTY()
    TArray<TObjectPtr<AActor>> VariantActors;

    bool bVariantsCollected = false;
};
