#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "TemporalKernel/TemporalKernelTypes.h"
#include "TemporalCommandConsumerComponent.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
    FOnTemporalCommandReceived,
    const FSimulationCommandRecord&,
    Command);

UCLASS(ClassGroup=(Temporal), meta=(BlueprintSpawnableComponent))
class BTTF_TEMPORALDRIFT_API UTemporalCommandConsumerComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UTemporalCommandConsumerComponent();

    virtual void BeginPlay() override;
    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

    UFUNCTION(BlueprintPure, Category="Temporal Adapter")
    bool CanHandleCommand(const FSimulationCommandRecord& Command) const;

    UFUNCTION(BlueprintCallable, Category="Temporal Adapter")
    bool ReceiveTemporalCommand(const FSimulationCommandRecord& Command);

    UFUNCTION(BlueprintPure, Category="Temporal Adapter")
    bool HasAppliedCommand(const FGuid& CommandId) const { return AppliedCommandIds.Contains(CommandId); }

    UFUNCTION(BlueprintPure, Category="Temporal Adapter")
    FName GetConsumerId() const { return ConsumerId; }

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Temporal Adapter")
    FName ConsumerId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Temporal Adapter")
    TArray<FName> SupportedCommandTypes;

    UPROPERTY(BlueprintAssignable, Category="Temporal Adapter")
    FOnTemporalCommandReceived OnCommandReceived;

private:
    UPROPERTY()
    TArray<FGuid> AppliedCommandIds;
};
