#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "TemporalWorldAdapterSubsystem.generated.h"

class UTemporalCommandConsumerComponent;

UCLASS()
class BTTF_TEMPORALDRIFT_API UTemporalWorldAdapterSubsystem : public UTickableWorldSubsystem
{
    GENERATED_BODY()

public:
    virtual void Tick(float DeltaTime) override;
    virtual TStatId GetStatId() const override;
    virtual bool IsTickable() const override { return RegisteredConsumers.Num() > 0; }

    UFUNCTION(BlueprintCallable, Category="Temporal Adapter")
    bool RegisterConsumer(UTemporalCommandConsumerComponent* Consumer);

    UFUNCTION(BlueprintCallable, Category="Temporal Adapter")
    void UnregisterConsumer(UTemporalCommandConsumerComponent* Consumer);

    UFUNCTION(BlueprintPure, Category="Temporal Adapter")
    int32 GetRegisteredConsumerCount() const;

private:
    UPROPERTY()
    TArray<TWeakObjectPtr<UTemporalCommandConsumerComponent>> RegisteredConsumers;
};
