#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "TemporalKernel/TemporalKernelTypes.h"
#include "TemporalKernelSubsystem.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(
    FOnTemporalKernelFactChanged,
    FName,
    FactId,
    const FTemporalValue&,
    PreviousValue,
    const FTemporalValue&,
    NewValue);

UCLASS()
class BTTF_TEMPORALDRIFT_API UTemporalKernelSubsystem : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    static constexpr int32 CurrentKernelSchemaVersion = 1;

    virtual void Initialize(FSubsystemCollectionBase& Collection) override;

    UFUNCTION(BlueprintCallable, Category = "Temporal Kernel")
    void ResetKernel(int64 NewTimelineSeed = 19851112);

    UFUNCTION(BlueprintCallable, Category = "Temporal Kernel")
    bool RegisterFact(FName FactId, const FTemporalValue& InitialValue, bool bDerived = false, FName OwningRuleId = NAME_None);

    UFUNCTION(BlueprintCallable, Category = "Temporal Kernel")
    bool UnregisterFact(FName FactId);

    UFUNCTION(BlueprintCallable, Category = "Temporal Kernel")
    bool RegisterRule(const FTemporalRuleDefinition& Rule);

    UFUNCTION(BlueprintCallable, Category = "Temporal Kernel")
    bool UnregisterRule(FName RuleId);

    UFUNCTION(BlueprintCallable, Category = "Temporal Kernel")
    bool RegisterEvent(const FTemporalEventDefinition& EventDefinition);

    UFUNCTION(BlueprintCallable, Category = "Temporal Kernel")
    bool UnregisterEvent(FName EventId);

    UFUNCTION(BlueprintCallable, Category = "Temporal Kernel")
    FTemporalTransactionResult SubmitTransaction(const FTemporalTransactionRequest& Request);

    UFUNCTION(BlueprintPure, Category = "Temporal Kernel")
    bool TryGetFact(FName FactId, FTemporalFactRecord& OutFact) const;

    UFUNCTION(BlueprintPure, Category = "Temporal Kernel")
    TArray<FTemporalFactRecord> GetFactSnapshot() const;

    UFUNCTION(BlueprintPure, Category = "Temporal Kernel")
    TArray<FSimulationCommandRecord> GetPendingCommands(FName CommandType = NAME_None) const;

    UFUNCTION(BlueprintCallable, Category = "Temporal Kernel")
    bool MarkCommandDelivered(const FGuid& CommandId);

    UFUNCTION(BlueprintCallable, Category = "Temporal Kernel")
    bool AcknowledgeCommand(const FGuid& CommandId, FName ConsumerId);

    UFUNCTION(BlueprintPure, Category = "Temporal Kernel")
    TArray<FTemporalNewsPublication> GetNewsPublications() const { return NewsPublications; }

    UFUNCTION(BlueprintCallable, Category = "Temporal Kernel")
    bool MarkNewsChannelDelivered(const FGuid& PublicationId, ETemporalNewsChannel Channel);

    UFUNCTION(BlueprintPure, Category = "Temporal Kernel")
    FTemporalKernelSaveData ExportSaveData() const;

    UFUNCTION(BlueprintCallable, Category = "Temporal Kernel")
    bool ImportSaveData(const FTemporalKernelSaveData& SaveData, FString& OutError);

    UFUNCTION(BlueprintPure, Category = "Temporal Kernel")
    uint64 GetSimulationTruthHash() const { return SimulationTruthHash; }

    UFUNCTION(BlueprintPure, Category = "Temporal Kernel")
    uint64 GetFullPersistenceHash() const { return FullPersistenceHash; }

    UFUNCTION(BlueprintPure, Category = "Temporal Kernel")
    int64 GetSimulationTick() const { return SimulationTick; }

    UFUNCTION(BlueprintPure, Category = "Temporal Kernel")
    int64 GetTimelineSeed() const { return TimelineSeed; }

    UFUNCTION(BlueprintPure, Category = "Temporal Kernel")
    FTemporalStabilityBreakdown GetStabilityBreakdown() const { return StabilityBreakdown; }

    UFUNCTION(BlueprintPure, Category = "Temporal Kernel")
    FTemporalTransactionTrace GetLastTransactionTrace() const { return LastTransactionTrace; }

    UFUNCTION(BlueprintPure, Category = "Temporal Kernel")
    TArray<FTemporalEventInstance> GetEventInstances() const { return EventInstances; }

    UPROPERTY(BlueprintAssignable, Category = "Temporal Kernel")
    FOnTemporalKernelFactChanged OnFactChanged;

private:
    bool ValidateRegistration(const FTemporalRuleDefinition& Rule) const;
    bool ValidateRegistration(const FTemporalEventDefinition& EventDefinition) const;
    void RebuildDefinitionOrdering();
    void RecalculateHashes();

    UPROPERTY() TMap<FName, FTemporalFactRecord> Facts;
    UPROPERTY() TArray<FTemporalRuleDefinition> Rules;
    UPROPERTY() TArray<FTemporalEventDefinition> EventDefinitions;
    UPROPERTY() TArray<FTemporalEventInstance> EventInstances;
    UPROPERTY() TArray<FSimulationCommandRecord> Commands;
    UPROPERTY() TArray<FTemporalNewsPublication> NewsPublications;
    UPROPERTY() TMap<FName, int32> EventOccurrenceCounts;
    UPROPERTY() TMap<FName, int64> EventLastStartTicks;
    UPROPERTY() FTemporalStabilityBreakdown StabilityBreakdown;
    UPROPERTY() FTemporalTransactionTrace LastTransactionTrace;

    int64 SimulationTick = 0;
    int64 TimelineSeed = 19851112;
    uint64 SimulationTruthHash = 0;
    uint64 FullPersistenceHash = 0;
};
