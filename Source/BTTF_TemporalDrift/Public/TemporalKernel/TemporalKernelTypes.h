#pragma once

#include "CoreMinimal.h"
#include "TemporalKernelTypes.generated.h"

UENUM(BlueprintType)
enum class ETemporalValueType : uint8
{
    None,
    Boolean,
    Integer,
    FixedPoint,
    Name,
    SimulationTick
};

UENUM(BlueprintType)
enum class ETemporalMutationOperation : uint8
{
    Set,
    Add,
    Subtract,
    Remove
};

UENUM(BlueprintType)
enum class ETemporalComparison : uint8
{
    Equal,
    NotEqual,
    Less,
    LessOrEqual,
    Greater,
    GreaterOrEqual
};

UENUM(BlueprintType)
enum class ETemporalRulePhase : uint8
{
    DirectConsequences,
    WorldState,
    Contradictions,
    StabilityInputs,
    EventEligibilityInputs,
    PresentationMetadata
};

UENUM(BlueprintType)
enum class ETemporalEventState : uint8
{
    Scheduled,
    Active,
    Completed,
    Cancelled
};

UENUM(BlueprintType)
enum class ETemporalCommandState : uint8
{
    Pending,
    Delivered,
    Applied,
    Acknowledged,
    Failed,
    Expired,
    Superseded
};

UENUM(BlueprintType)
enum class ETemporalNewsChannel : uint8
{
    Radio,
    Newspaper,
    PublicNotice,
    AmbientDialogue,
    MissionJournal,
    Debugger
};

USTRUCT(BlueprintType)
struct BTTF_TEMPORALDRIFT_API FTemporalValue
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite) ETemporalValueType Type = ETemporalValueType::None;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool BoolValue = false;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int64 IntegerValue = 0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int64 FixedPointValue = 0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName NameValue;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int64 TickValue = 0;

    static FTemporalValue MakeBool(bool Value);
    static FTemporalValue MakeInteger(int64 Value);
    static FTemporalValue MakeFixedPoint(int64 Value);
    static FTemporalValue MakeName(FName Value);
    static FTemporalValue MakeTick(int64 Value);

    bool IsNumeric() const;
    int64 AsComparableInteger() const;
    FString ToCanonicalString() const;
    bool operator==(const FTemporalValue& Other) const;
    bool operator!=(const FTemporalValue& Other) const { return !(*this == Other); }
};

USTRUCT(BlueprintType)
struct BTTF_TEMPORALDRIFT_API FTemporalFactRecord
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName FactId;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FTemporalValue Value;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) int32 Revision = 0;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) int64 LastModifiedTick = 0;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FGuid LastTransactionId;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FName SourceId;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bDerived = false;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName OwningRuleId;
};

USTRUCT(BlueprintType)
struct BTTF_TEMPORALDRIFT_API FTemporalCondition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName FactId;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) ETemporalComparison Comparison = ETemporalComparison::Equal;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FTemporalValue ExpectedValue;
};

USTRUCT(BlueprintType)
struct BTTF_TEMPORALDRIFT_API FTemporalMutation
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName MutationId;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName FactId;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) ETemporalMutationOperation Operation = ETemporalMutationOperation::Set;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FTemporalValue Value;
};

USTRUCT(BlueprintType)
struct BTTF_TEMPORALDRIFT_API FTemporalRuleDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName RuleId;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) ETemporalRulePhase Phase = ETemporalRulePhase::DirectConsequences;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 Priority = 0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) TArray<FTemporalCondition> Conditions;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) TArray<FTemporalMutation> TrueMutations;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) TArray<FTemporalMutation> FalseMutations;
};

USTRUCT(BlueprintType)
struct BTTF_TEMPORALDRIFT_API FSimulationCommandTemplate
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName CommandType;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName Target;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName PayloadName;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FTemporalValue PayloadValue;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bPersistent = true;
};

USTRUCT(BlueprintType)
struct BTTF_TEMPORALDRIFT_API FTemporalNewsTemplate
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName StoryId;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName EraId;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName DistrictId;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int64 LifetimeTicks = 3600;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) TMap<FName, FTemporalValue> Context;
};

USTRUCT(BlueprintType)
struct BTTF_TEMPORALDRIFT_API FTemporalEventDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName EventId;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 Priority = 0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) TArray<FTemporalCondition> EligibilityConditions;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) TArray<FTemporalCondition> ExclusionConditions;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) TArray<FTemporalMutation> FactMutations;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) TArray<FSimulationCommandTemplate> Commands;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) TArray<FTemporalNewsTemplate> News;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 MaxOccurrences = 1;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int64 CooldownTicks = 0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int64 DurationTicks = 300;
};

USTRUCT(BlueprintType)
struct BTTF_TEMPORALDRIFT_API FTemporalEventCandidate
{
    GENERATED_BODY()

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FName EventId;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) bool bEligible = false;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) int32 Priority = 0;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TArray<FName> FailedConditions;
};

USTRUCT(BlueprintType)
struct BTTF_TEMPORALDRIFT_API FTemporalEventInstance
{
    GENERATED_BODY()

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FGuid InstanceId;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FName EventId;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FGuid TriggeringTransactionId;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) int64 StartTick = 0;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) int64 ScheduledEndTick = 0;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) ETemporalEventState State = ETemporalEventState::Scheduled;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) int32 OccurrenceIndex = 0;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TArray<FGuid> GeneratedCommandIds;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TArray<FGuid> GeneratedNewsIds;
};

USTRUCT(BlueprintType)
struct BTTF_TEMPORALDRIFT_API FSimulationCommandRecord
{
    GENERATED_BODY()

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FGuid CommandId;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FGuid TriggeringTransactionId;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FGuid EventInstanceId;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FName CommandType;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FName Target;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FName PayloadName;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FTemporalValue PayloadValue;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) int64 IssuedTick = 0;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) bool bPersistent = true;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) ETemporalCommandState State = ETemporalCommandState::Pending;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TArray<FName> AcknowledgedConsumers;
};

USTRUCT(BlueprintType)
struct BTTF_TEMPORALDRIFT_API FTemporalNewsChannelState
{
    GENERATED_BODY()

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) ETemporalNewsChannel Channel = ETemporalNewsChannel::Radio;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) bool bDelivered = false;
};

USTRUCT(BlueprintType)
struct BTTF_TEMPORALDRIFT_API FTemporalNewsPublication
{
    GENERATED_BODY()

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FGuid PublicationId;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FName StoryId;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FGuid TriggeringTransactionId;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FGuid RelatedEventInstanceId;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FName EraId;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FName DistrictId;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) int64 PublicationTick = 0;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) int64 ExpirationTick = 0;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TMap<FName, FTemporalValue> Context;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TArray<FTemporalNewsChannelState> ChannelStates;
};

USTRUCT(BlueprintType)
struct BTTF_TEMPORALDRIFT_API FTemporalStabilityBreakdown
{
    GENERATED_BODY()

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) int32 Baseline = 1000;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) int32 CanonicalDivergenceCost = 0;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) int32 ContradictionCost = 0;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) int32 ActiveAnomalyCost = 0;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) int32 TemporalStressCost = 0;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) int32 ActiveEventCost = 0;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) int32 RecoveryCredit = 0;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) int32 Result = 1000;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FName Band = TEXT("Stable");
};

USTRUCT(BlueprintType)
struct BTTF_TEMPORALDRIFT_API FTemporalTransactionRequest
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite) FGuid TransactionId;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FName SourceId;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) TArray<FTemporalMutation> PrimaryMutations;
};

USTRUCT(BlueprintType)
struct BTTF_TEMPORALDRIFT_API FTemporalTransactionTrace
{
    GENERATED_BODY()

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FGuid TransactionId;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FName SourceId;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) int64 SimulationTick = 0;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TArray<FTemporalMutation> AppliedMutations;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TArray<FName> TriggeredRules;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TArray<FTemporalEventCandidate> EventCandidates;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FName SelectedEventId;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TArray<FGuid> GeneratedCommandIds;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TArray<FGuid> GeneratedNewsIds;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FTemporalStabilityBreakdown Stability;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) uint64 SimulationTruthHash = 0;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) uint64 FullPersistenceHash = 0;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) bool bCycleDetected = false;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FString FailureReason;
};

USTRUCT(BlueprintType)
struct BTTF_TEMPORALDRIFT_API FTemporalTransactionResult
{
    GENERATED_BODY()

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) bool bCommitted = false;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FString Error;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FTemporalTransactionTrace Trace;
};

USTRUCT(BlueprintType)
struct BTTF_TEMPORALDRIFT_API FTemporalKernelSaveData
{
    GENERATED_BODY()

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) int32 KernelSchemaVersion = 0;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) int64 SimulationTick = 0;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) int64 TimelineSeed = 19851112;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TArray<FTemporalFactRecord> Facts;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TArray<FTemporalEventInstance> EventInstances;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TArray<FSimulationCommandRecord> Commands;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TArray<FTemporalNewsPublication> News;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TMap<FName, int32> EventOccurrenceCounts;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) TMap<FName, int64> EventLastStartTicks;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FTemporalStabilityBreakdown Stability;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) uint64 SimulationTruthHash = 0;
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly) uint64 FullPersistenceHash = 0;

    bool HasKernelState() const { return KernelSchemaVersion > 0; }
};
