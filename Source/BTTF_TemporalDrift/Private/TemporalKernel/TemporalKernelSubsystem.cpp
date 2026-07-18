#include "TemporalKernel/TemporalKernelSubsystem.h"

#include "Algo/Sort.h"
#include "Misc/Crc.h"

DEFINE_LOG_CATEGORY_STATIC(LogTemporalKernel, Log, All);

namespace TemporalKernelPrivate
{
    constexpr int32 MaxRuleSettlingPasses = 64;
    constexpr uint64 FnvOffsetBasis = 1469598103934665603ull;
    constexpr uint64 FnvPrime = 1099511628211ull;

    FGuid MakeStableGuid(const FString& Key)
    {
        return FGuid(
            FCrc::StrCrc32(*Key),
            FCrc::StrCrc32(*(Key + TEXT("|B"))),
            FCrc::StrCrc32(*(Key + TEXT("|C"))),
            FCrc::StrCrc32(*(Key + TEXT("|D"))));
    }

    uint64 HashUtf8(const FString& Text)
    {
        uint64 Hash = FnvOffsetBasis;
        FTCHARToUTF8 Utf8(*Text);
        for (int32 Index = 0; Index < Utf8.Length(); ++Index)
        {
            Hash ^= static_cast<uint8>(Utf8.Get()[Index]);
            Hash *= FnvPrime;
        }
        return Hash;
    }

    FString GuidString(const FGuid& Guid)
    {
        return Guid.ToString(EGuidFormats::Digits);
    }

    bool CompareValues(const FTemporalValue& Actual, ETemporalComparison Comparison, const FTemporalValue& Expected)
    {
        if (Actual.IsNumeric() && Expected.IsNumeric())
        {
            const int64 Left = Actual.AsComparableInteger();
            const int64 Right = Expected.AsComparableInteger();
            switch (Comparison)
            {
            case ETemporalComparison::Equal: return Left == Right;
            case ETemporalComparison::NotEqual: return Left != Right;
            case ETemporalComparison::Less: return Left < Right;
            case ETemporalComparison::LessOrEqual: return Left <= Right;
            case ETemporalComparison::Greater: return Left > Right;
            case ETemporalComparison::GreaterOrEqual: return Left >= Right;
            default: return false;
            }
        }

        if (Comparison == ETemporalComparison::Equal)
        {
            return Actual == Expected;
        }
        if (Comparison == ETemporalComparison::NotEqual)
        {
            return Actual != Expected;
        }
        return false;
    }

    bool ConditionMatches(
        const TMap<FName, FTemporalFactRecord>& Facts,
        const FTemporalCondition& Condition,
        FName* OutFailedFact = nullptr)
    {
        const FTemporalFactRecord* Record = Facts.Find(Condition.FactId);
        const bool bMatches = Record && CompareValues(Record->Value, Condition.Comparison, Condition.ExpectedValue);
        if (!bMatches && OutFailedFact)
        {
            *OutFailedFact = Condition.FactId;
        }
        return bMatches;
    }

    bool ConditionsMatch(
        const TMap<FName, FTemporalFactRecord>& Facts,
        const TArray<FTemporalCondition>& Conditions,
        TArray<FName>* OutFailures = nullptr)
    {
        bool bAllMatch = true;
        for (const FTemporalCondition& Condition : Conditions)
        {
            FName FailedFact;
            if (!ConditionMatches(Facts, Condition, &FailedFact))
            {
                bAllMatch = false;
                if (OutFailures)
                {
                    OutFailures->AddUnique(FailedFact);
                }
            }
        }
        return bAllMatch;
    }

    bool AnyExclusionMatches(
        const TMap<FName, FTemporalFactRecord>& Facts,
        const TArray<FTemporalCondition>& Exclusions,
        TArray<FName>* OutFailures = nullptr)
    {
        for (const FTemporalCondition& Exclusion : Exclusions)
        {
            if (ConditionMatches(Facts, Exclusion))
            {
                if (OutFailures)
                {
                    OutFailures->AddUnique(Exclusion.FactId);
                }
                return true;
            }
        }
        return false;
    }

    FString CanonicalFacts(const TMap<FName, FTemporalFactRecord>& Facts)
    {
        TArray<FName> FactIds;
        Facts.GetKeys(FactIds);
        FactIds.Sort(FNameLexicalLess());

        FString Canonical;
        for (const FName FactId : FactIds)
        {
            const FTemporalFactRecord& Record = Facts.FindChecked(FactId);
            Canonical += FactId.ToString();
            Canonical += TEXT("=");
            Canonical += Record.Value.ToCanonicalString();
            Canonical += FString::Printf(
                TEXT("|r=%d|d=%d|o=%s;"),
                Record.Revision,
                Record.bDerived ? 1 : 0,
                *Record.OwningRuleId.ToString());
        }
        return Canonical;
    }

    bool ApplyMutation(
        TMap<FName, FTemporalFactRecord>& WorkingFacts,
        const FTemporalMutation& Mutation,
        const FGuid& TransactionId,
        FName SourceId,
        int64 Tick,
        bool bInternalMutation,
        FName InternalOwner,
        TArray<FTemporalMutation>& OutAppliedMutations,
        FString& OutError)
    {
        if (Mutation.FactId.IsNone())
        {
            OutError = TEXT("Mutation has no FactId.");
            return false;
        }

        FTemporalFactRecord* Record = WorkingFacts.Find(Mutation.FactId);
        if (!Record)
        {
            OutError = FString::Printf(TEXT("Unknown fact '%s'."), *Mutation.FactId.ToString());
            return false;
        }

        if (Record->bDerived)
        {
            if (!bInternalMutation)
            {
                OutError = FString::Printf(
                    TEXT("External mutation rejected for derived fact '%s'."),
                    *Mutation.FactId.ToString());
                return false;
            }
            if (!Record->OwningRuleId.IsNone() && Record->OwningRuleId != InternalOwner)
            {
                OutError = FString::Printf(
                    TEXT("Owner '%s' cannot mutate derived fact '%s' owned by '%s'."),
                    *InternalOwner.ToString(),
                    *Mutation.FactId.ToString(),
                    *Record->OwningRuleId.ToString());
                return false;
            }
        }

        if (Mutation.Operation == ETemporalMutationOperation::Remove)
        {
            OutError = FString::Printf(
                TEXT("Fact removal is not supported inside transactions for '%s'."),
                *Mutation.FactId.ToString());
            return false;
        }

        FTemporalValue NewValue = Record->Value;
        if (Mutation.Operation == ETemporalMutationOperation::Set)
        {
            if (Record->Value.Type != Mutation.Value.Type)
            {
                OutError = FString::Printf(
                    TEXT("Type mismatch for fact '%s'."),
                    *Mutation.FactId.ToString());
                return false;
            }
            NewValue = Mutation.Value;
        }
        else
        {
            if (!Record->Value.IsNumeric() || !Mutation.Value.IsNumeric() || Record->Value.Type != Mutation.Value.Type)
            {
                OutError = FString::Printf(
                    TEXT("Arithmetic mutation requires matching numeric types for '%s'."),
                    *Mutation.FactId.ToString());
                return false;
            }

            const int64 Delta = Mutation.Operation == ETemporalMutationOperation::Add
                ? Mutation.Value.AsComparableInteger()
                : -Mutation.Value.AsComparableInteger();

            switch (Record->Value.Type)
            {
            case ETemporalValueType::Integer:
                NewValue = FTemporalValue::MakeInteger(Record->Value.IntegerValue + Delta);
                break;
            case ETemporalValueType::FixedPoint:
                NewValue = FTemporalValue::MakeFixedPoint(Record->Value.FixedPointValue + Delta);
                break;
            case ETemporalValueType::SimulationTick:
                NewValue = FTemporalValue::MakeTick(Record->Value.TickValue + Delta);
                break;
            default:
                OutError = FString::Printf(TEXT("Unsupported arithmetic type for '%s'."), *Mutation.FactId.ToString());
                return false;
            }
        }

        if (NewValue == Record->Value)
        {
            return true;
        }

        Record->Value = NewValue;
        ++Record->Revision;
        Record->LastModifiedTick = Tick;
        Record->LastTransactionId = TransactionId;
        Record->SourceId = SourceId;
        OutAppliedMutations.Add(Mutation);
        return true;
    }

    FTemporalStabilityBreakdown CalculateStability(const TMap<FName, FTemporalFactRecord>& Facts)
    {
        auto GetBool = [&Facts](const TCHAR* Id) -> bool
        {
            if (const FTemporalFactRecord* Record = Facts.Find(FName(Id)))
            {
                return Record->Value.Type == ETemporalValueType::Boolean && Record->Value.BoolValue;
            }
            return false;
        };

        auto GetNumeric = [&Facts](const TCHAR* Id) -> int64
        {
            if (const FTemporalFactRecord* Record = Facts.Find(FName(Id)))
            {
                return Record->Value.IsNumeric() ? Record->Value.AsComparableInteger() : 0;
            }
            return 0;
        };

        FTemporalStabilityBreakdown Result;
        Result.CanonicalDivergenceCost = FMath::Clamp<int32>(static_cast<int32>(GetNumeric(TEXT("Timeline.CanonicalDivergence"))), 0, 300);
        Result.ContradictionCost = FMath::Clamp<int32>(static_cast<int32>(GetNumeric(TEXT("Timeline.ContradictionPressure"))), 0, 300);
        Result.ActiveAnomalyCost = GetBool(TEXT("ClockTower.AnomalyActive")) ? 80 : 0;
        Result.ActiveAnomalyCost += GetBool(TEXT("HillValley.PowerGrid.AtRisk")) ? 70 : 0;
        Result.TemporalStressCost = FMath::Clamp<int32>(static_cast<int32>(GetNumeric(TEXT("Timeline.TemporalStress")) / 4), 0, 250);
        Result.ActiveEventCost = GetBool(TEXT("Event.HillValley.LocalPowerOutage.Active")) ? 40 : 0;
        Result.RecoveryCredit = GetBool(TEXT("Timeline.RepairComplete")) ? 100 : 0;

        Result.Result = FMath::Clamp(
            Result.Baseline
            - Result.CanonicalDivergenceCost
            - Result.ContradictionCost
            - Result.ActiveAnomalyCost
            - Result.TemporalStressCost
            - Result.ActiveEventCost
            + Result.RecoveryCredit,
            0,
            1000);

        if (Result.Result >= 850) Result.Band = TEXT("Stable");
        else if (Result.Result >= 650) Result.Band = TEXT("Drift");
        else if (Result.Result >= 400) Result.Band = TEXT("Unstable");
        else if (Result.Result >= 150) Result.Band = TEXT("Critical");
        else Result.Band = TEXT("Collapse");
        return Result;
    }

    void AppendFactToCanonical(FString& Canonical, const FTemporalFactRecord& Record)
    {
        Canonical += Record.FactId.ToString();
        Canonical += TEXT("=");
        Canonical += Record.Value.ToCanonicalString();
        Canonical += FString::Printf(
            TEXT("|r=%d|t=%lld|d=%d|o=%s;"),
            Record.Revision,
            Record.LastModifiedTick,
            Record.bDerived ? 1 : 0,
            *Record.OwningRuleId.ToString());
    }
}

FTemporalValue FTemporalValue::MakeBool(bool Value)
{
    FTemporalValue Result;
    Result.Type = ETemporalValueType::Boolean;
    Result.BoolValue = Value;
    return Result;
}

FTemporalValue FTemporalValue::MakeInteger(int64 Value)
{
    FTemporalValue Result;
    Result.Type = ETemporalValueType::Integer;
    Result.IntegerValue = Value;
    return Result;
}

FTemporalValue FTemporalValue::MakeFixedPoint(int64 Value)
{
    FTemporalValue Result;
    Result.Type = ETemporalValueType::FixedPoint;
    Result.FixedPointValue = Value;
    return Result;
}

FTemporalValue FTemporalValue::MakeName(FName Value)
{
    FTemporalValue Result;
    Result.Type = ETemporalValueType::Name;
    Result.NameValue = Value;
    return Result;
}

FTemporalValue FTemporalValue::MakeTick(int64 Value)
{
    FTemporalValue Result;
    Result.Type = ETemporalValueType::SimulationTick;
    Result.TickValue = Value;
    return Result;
}

bool FTemporalValue::IsNumeric() const
{
    return Type == ETemporalValueType::Integer
        || Type == ETemporalValueType::FixedPoint
        || Type == ETemporalValueType::SimulationTick;
}

int64 FTemporalValue::AsComparableInteger() const
{
    switch (Type)
    {
    case ETemporalValueType::Integer: return IntegerValue;
    case ETemporalValueType::FixedPoint: return FixedPointValue;
    case ETemporalValueType::SimulationTick: return TickValue;
    case ETemporalValueType::Boolean: return BoolValue ? 1 : 0;
    default: return 0;
    }
}

FString FTemporalValue::ToCanonicalString() const
{
    switch (Type)
    {
    case ETemporalValueType::Boolean: return FString::Printf(TEXT("B:%d"), BoolValue ? 1 : 0);
    case ETemporalValueType::Integer: return FString::Printf(TEXT("I:%lld"), IntegerValue);
    case ETemporalValueType::FixedPoint: return FString::Printf(TEXT("F:%lld"), FixedPointValue);
    case ETemporalValueType::Name: return FString::Printf(TEXT("N:%s"), *NameValue.ToString());
    case ETemporalValueType::SimulationTick: return FString::Printf(TEXT("T:%lld"), TickValue);
    default: return TEXT("0:");
    }
}

bool FTemporalValue::operator==(const FTemporalValue& Other) const
{
    if (Type != Other.Type)
    {
        return false;
    }
    switch (Type)
    {
    case ETemporalValueType::Boolean: return BoolValue == Other.BoolValue;
    case ETemporalValueType::Integer: return IntegerValue == Other.IntegerValue;
    case ETemporalValueType::FixedPoint: return FixedPointValue == Other.FixedPointValue;
    case ETemporalValueType::Name: return NameValue == Other.NameValue;
    case ETemporalValueType::SimulationTick: return TickValue == Other.TickValue;
    default: return true;
    }
}

void UTemporalKernelSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    ResetKernel();
}

void UTemporalKernelSubsystem::ResetKernel(int64 NewTimelineSeed)
{
    Facts.Reset();
    Rules.Reset();
    EventDefinitions.Reset();
    EventInstances.Reset();
    Commands.Reset();
    NewsPublications.Reset();
    EventOccurrenceCounts.Reset();
    EventLastStartTicks.Reset();
    StabilityBreakdown = FTemporalStabilityBreakdown();
    LastTransactionTrace = FTemporalTransactionTrace();
    SimulationTick = 0;
    TimelineSeed = NewTimelineSeed;
    RecalculateHashes();
}

bool UTemporalKernelSubsystem::RegisterFact(FName FactId, const FTemporalValue& InitialValue, bool bDerived, FName OwningRuleId)
{
    if (FactId.IsNone() || InitialValue.Type == ETemporalValueType::None || Facts.Contains(FactId))
    {
        return false;
    }
    if (bDerived && OwningRuleId.IsNone())
    {
        return false;
    }

    FTemporalFactRecord Record;
    Record.FactId = FactId;
    Record.Value = InitialValue;
    Record.bDerived = bDerived;
    Record.OwningRuleId = OwningRuleId;
    Facts.Add(FactId, Record);
    RecalculateHashes();
    return true;
}

bool UTemporalKernelSubsystem::UnregisterFact(FName FactId)
{
    for (const FTemporalRuleDefinition& Rule : Rules)
    {
        for (const FTemporalCondition& Condition : Rule.Conditions)
        {
            if (Condition.FactId == FactId) return false;
        }
        for (const FTemporalMutation& Mutation : Rule.TrueMutations)
        {
            if (Mutation.FactId == FactId) return false;
        }
        for (const FTemporalMutation& Mutation : Rule.FalseMutations)
        {
            if (Mutation.FactId == FactId) return false;
        }
    }
    for (const FTemporalEventDefinition& EventDefinition : EventDefinitions)
    {
        for (const FTemporalCondition& Condition : EventDefinition.EligibilityConditions)
        {
            if (Condition.FactId == FactId) return false;
        }
        for (const FTemporalCondition& Condition : EventDefinition.ExclusionConditions)
        {
            if (Condition.FactId == FactId) return false;
        }
        for (const FTemporalMutation& Mutation : EventDefinition.FactMutations)
        {
            if (Mutation.FactId == FactId) return false;
        }
    }
    const bool bRemoved = Facts.Remove(FactId) > 0;
    if (bRemoved) RecalculateHashes();
    return bRemoved;
}

bool UTemporalKernelSubsystem::ValidateRegistration(const FTemporalRuleDefinition& Rule) const
{
    if (Rule.RuleId.IsNone()) return false;
    for (const FTemporalCondition& Condition : Rule.Conditions)
    {
        if (!Facts.Contains(Condition.FactId)) return false;
    }
    auto ValidateMutations = [this, &Rule](const TArray<FTemporalMutation>& Mutations)
    {
        for (const FTemporalMutation& Mutation : Mutations)
        {
            const FTemporalFactRecord* Record = Facts.Find(Mutation.FactId);
            if (!Record) return false;
            if (Record->bDerived && !Record->OwningRuleId.IsNone() && Record->OwningRuleId != Rule.RuleId) return false;
        }
        return true;
    };
    return ValidateMutations(Rule.TrueMutations) && ValidateMutations(Rule.FalseMutations);
}

bool UTemporalKernelSubsystem::RegisterRule(const FTemporalRuleDefinition& Rule)
{
    if (!ValidateRegistration(Rule)) return false;
    for (const FTemporalRuleDefinition& Existing : Rules)
    {
        if (Existing.RuleId == Rule.RuleId) return false;
    }

    auto ClaimOutputs = [this, &Rule](const TArray<FTemporalMutation>& Mutations)
    {
        for (const FTemporalMutation& Mutation : Mutations)
        {
            FTemporalFactRecord& Record = Facts.FindChecked(Mutation.FactId);
            Record.bDerived = true;
            Record.OwningRuleId = Rule.RuleId;
        }
    };
    ClaimOutputs(Rule.TrueMutations);
    ClaimOutputs(Rule.FalseMutations);

    Rules.Add(Rule);
    RebuildDefinitionOrdering();
    RecalculateHashes();
    return true;
}

bool UTemporalKernelSubsystem::UnregisterRule(FName RuleId)
{
    const int32 Removed = Rules.RemoveAll([RuleId](const FTemporalRuleDefinition& Rule)
    {
        return Rule.RuleId == RuleId;
    });
    if (Removed == 0) return false;

    for (TPair<FName, FTemporalFactRecord>& Pair : Facts)
    {
        if (Pair.Value.OwningRuleId == RuleId)
        {
            Pair.Value.bDerived = false;
            Pair.Value.OwningRuleId = NAME_None;
        }
    }
    RecalculateHashes();
    return true;
}

bool UTemporalKernelSubsystem::ValidateRegistration(const FTemporalEventDefinition& EventDefinition) const
{
    if (EventDefinition.EventId.IsNone() || EventDefinition.MaxOccurrences < 0 || EventDefinition.DurationTicks < 0)
    {
        return false;
    }
    for (const FTemporalCondition& Condition : EventDefinition.EligibilityConditions)
    {
        if (!Facts.Contains(Condition.FactId)) return false;
    }
    for (const FTemporalCondition& Condition : EventDefinition.ExclusionConditions)
    {
        if (!Facts.Contains(Condition.FactId)) return false;
    }
    for (const FTemporalMutation& Mutation : EventDefinition.FactMutations)
    {
        const FTemporalFactRecord* Record = Facts.Find(Mutation.FactId);
        if (!Record) return false;
        if (Record->bDerived && !Record->OwningRuleId.IsNone() && Record->OwningRuleId != EventDefinition.EventId) return false;
    }
    return true;
}

bool UTemporalKernelSubsystem::RegisterEvent(const FTemporalEventDefinition& EventDefinition)
{
    if (!ValidateRegistration(EventDefinition)) return false;
    for (const FTemporalEventDefinition& Existing : EventDefinitions)
    {
        if (Existing.EventId == EventDefinition.EventId) return false;
    }

    for (const FTemporalMutation& Mutation : EventDefinition.FactMutations)
    {
        FTemporalFactRecord& Record = Facts.FindChecked(Mutation.FactId);
        Record.bDerived = true;
        Record.OwningRuleId = EventDefinition.EventId;
    }

    EventDefinitions.Add(EventDefinition);
    RebuildDefinitionOrdering();
    RecalculateHashes();
    return true;
}

bool UTemporalKernelSubsystem::UnregisterEvent(FName EventId)
{
    const int32 Removed = EventDefinitions.RemoveAll([EventId](const FTemporalEventDefinition& EventDefinition)
    {
        return EventDefinition.EventId == EventId;
    });
    if (Removed == 0) return false;

    for (TPair<FName, FTemporalFactRecord>& Pair : Facts)
    {
        if (Pair.Value.OwningRuleId == EventId)
        {
            Pair.Value.bDerived = false;
            Pair.Value.OwningRuleId = NAME_None;
        }
    }
    RecalculateHashes();
    return true;
}

void UTemporalKernelSubsystem::RebuildDefinitionOrdering()
{
    Rules.Sort([](const FTemporalRuleDefinition& Left, const FTemporalRuleDefinition& Right)
    {
        if (Left.Phase != Right.Phase)
        {
            return static_cast<uint8>(Left.Phase) < static_cast<uint8>(Right.Phase);
        }
        if (Left.Priority != Right.Priority)
        {
            return Left.Priority > Right.Priority;
        }
        return Left.RuleId.LexicalLess(Right.RuleId);
    });

    EventDefinitions.Sort([](const FTemporalEventDefinition& Left, const FTemporalEventDefinition& Right)
    {
        if (Left.Priority != Right.Priority)
        {
            return Left.Priority > Right.Priority;
        }
        return Left.EventId.LexicalLess(Right.EventId);
    });
}

FTemporalTransactionResult UTemporalKernelSubsystem::SubmitTransaction(const FTemporalTransactionRequest& Request)
{
    using namespace TemporalKernelPrivate;

    FTemporalTransactionResult Result;
    FTemporalTransactionTrace Trace;
    Trace.TransactionId = Request.TransactionId.IsValid()
        ? Request.TransactionId
        : MakeStableGuid(FString::Printf(TEXT("TX|%lld|%s|%lld"), TimelineSeed, *Request.SourceId.ToString(), SimulationTick + 1));
    Trace.SourceId = Request.SourceId;
    Trace.SimulationTick = SimulationTick + 1;

    if (Request.SourceId.IsNone())
    {
        Result.Error = TEXT("Transaction source is required.");
        Trace.FailureReason = Result.Error;
        Result.Trace = Trace;
        return Result;
    }

    TMap<FName, FTemporalFactRecord> WorkingFacts = Facts;
    TArray<FTemporalEventInstance> WorkingEvents = EventInstances;
    TArray<FSimulationCommandRecord> WorkingCommands = Commands;
    TArray<FTemporalNewsPublication> WorkingNews = NewsPublications;
    TMap<FName, int32> WorkingOccurrenceCounts = EventOccurrenceCounts;
    TMap<FName, int64> WorkingLastStartTicks = EventLastStartTicks;
    FTemporalStabilityBreakdown WorkingStability = StabilityBreakdown;

    TArray<FTemporalMutation> SortedPrimaryMutations = Request.PrimaryMutations;
    SortedPrimaryMutations.Sort([](const FTemporalMutation& Left, const FTemporalMutation& Right)
    {
        if (Left.FactId != Right.FactId) return Left.FactId.LexicalLess(Right.FactId);
        return Left.MutationId.LexicalLess(Right.MutationId);
    });

    FString Error;
    for (const FTemporalMutation& Mutation : SortedPrimaryMutations)
    {
        if (!ApplyMutation(
            WorkingFacts,
            Mutation,
            Trace.TransactionId,
            Request.SourceId,
            Trace.SimulationTick,
            false,
            NAME_None,
            Trace.AppliedMutations,
            Error))
        {
            Result.Error = Error;
            Trace.FailureReason = Error;
            Result.Trace = Trace;
            return Result;
        }
    }

    auto SettleRules = [&](FString& OutFailure) -> bool
    {
        TSet<uint64> SeenPassHashes;
        for (int32 Pass = 0; Pass < MaxRuleSettlingPasses; ++Pass)
        {
            bool bAnyChanged = false;
            for (const FTemporalRuleDefinition& Rule : Rules)
            {
                const bool bConditionsMet = ConditionsMatch(WorkingFacts, Rule.Conditions);
                TArray<FTemporalMutation> RuleMutations = bConditionsMet ? Rule.TrueMutations : Rule.FalseMutations;
                RuleMutations.Sort([](const FTemporalMutation& Left, const FTemporalMutation& Right)
                {
                    if (Left.FactId != Right.FactId) return Left.FactId.LexicalLess(Right.FactId);
                    return Left.MutationId.LexicalLess(Right.MutationId);
                });

                const int32 BeforeCount = Trace.AppliedMutations.Num();
                for (const FTemporalMutation& Mutation : RuleMutations)
                {
                    if (!ApplyMutation(
                        WorkingFacts,
                        Mutation,
                        Trace.TransactionId,
                        Rule.RuleId,
                        Trace.SimulationTick,
                        true,
                        Rule.RuleId,
                        Trace.AppliedMutations,
                        OutFailure))
                    {
                        return false;
                    }
                }
                if (Trace.AppliedMutations.Num() > BeforeCount)
                {
                    bAnyChanged = true;
                    Trace.TriggeredRules.Add(Rule.RuleId);
                }
            }

            if (!bAnyChanged)
            {
                return true;
            }

            const uint64 PassHash = HashUtf8(CanonicalFacts(WorkingFacts));
            if (SeenPassHashes.Contains(PassHash))
            {
                Trace.bCycleDetected = true;
                OutFailure = TEXT("Consequence graph entered a repeated state.");
                return false;
            }
            SeenPassHashes.Add(PassHash);
        }

        Trace.bCycleDetected = true;
        OutFailure = FString::Printf(TEXT("Consequence graph exceeded %d settling passes."), MaxRuleSettlingPasses);
        return false;
    };

    if (!SettleRules(Error))
    {
        Result.Error = Error;
        Trace.FailureReason = Error;
        Result.Trace = Trace;
        return Result;
    }

    auto ApplyStability = [&]() -> bool
    {
        WorkingStability = CalculateStability(WorkingFacts);

        if (WorkingFacts.Contains(TEXT("Timeline.Stability")))
        {
            FTemporalMutation StabilityMutation;
            StabilityMutation.MutationId = TEXT("System.Stability.Score");
            StabilityMutation.FactId = TEXT("Timeline.Stability");
            StabilityMutation.Value = FTemporalValue::MakeFixedPoint(WorkingStability.Result);
            if (!ApplyMutation(
                WorkingFacts,
                StabilityMutation,
                Trace.TransactionId,
                TEXT("System.Stability"),
                Trace.SimulationTick,
                true,
                TEXT("System.Stability"),
                Trace.AppliedMutations,
                Error))
            {
                return false;
            }
        }

        if (WorkingFacts.Contains(TEXT("Timeline.StabilityBand")))
        {
            FTemporalMutation BandMutation;
            BandMutation.MutationId = TEXT("System.Stability.Band");
            BandMutation.FactId = TEXT("Timeline.StabilityBand");
            BandMutation.Value = FTemporalValue::MakeName(WorkingStability.Band);
            if (!ApplyMutation(
                WorkingFacts,
                BandMutation,
                Trace.TransactionId,
                TEXT("System.Stability"),
                Trace.SimulationTick,
                true,
                TEXT("System.Stability"),
                Trace.AppliedMutations,
                Error))
            {
                return false;
            }
        }
        return true;
    };

    if (!ApplyStability())
    {
        Result.Error = Error;
        Trace.FailureReason = Error;
        Result.Trace = Trace;
        return Result;
    }

    const FTemporalEventDefinition* SelectedEvent = nullptr;
    for (const FTemporalEventDefinition& EventDefinition : EventDefinitions)
    {
        FTemporalEventCandidate Candidate;
        Candidate.EventId = EventDefinition.EventId;
        Candidate.Priority = EventDefinition.Priority;

        const bool bEligibility = ConditionsMatch(WorkingFacts, EventDefinition.EligibilityConditions, &Candidate.FailedConditions);
        const bool bExcluded = AnyExclusionMatches(WorkingFacts, EventDefinition.ExclusionConditions, &Candidate.FailedConditions);
        const int32 Occurrences = WorkingOccurrenceCounts.FindRef(EventDefinition.EventId);
        const bool bOccurrenceLimitReached = EventDefinition.MaxOccurrences > 0 && Occurrences >= EventDefinition.MaxOccurrences;
        const int64 LastStartTick = WorkingLastStartTicks.FindRef(EventDefinition.EventId);
        const bool bCooldownActive = EventDefinition.CooldownTicks > 0
            && Occurrences > 0
            && Trace.SimulationTick - LastStartTick < EventDefinition.CooldownTicks;

        if (bOccurrenceLimitReached) Candidate.FailedConditions.AddUnique(TEXT("System.Event.MaxOccurrences"));
        if (bCooldownActive) Candidate.FailedConditions.AddUnique(TEXT("System.Event.Cooldown"));

        Candidate.bEligible = bEligibility && !bExcluded && !bOccurrenceLimitReached && !bCooldownActive;
        Trace.EventCandidates.Add(Candidate);
        if (!SelectedEvent && Candidate.bEligible)
        {
            SelectedEvent = &EventDefinition;
        }
    }

    if (SelectedEvent)
    {
        Trace.SelectedEventId = SelectedEvent->EventId;
        const int32 OccurrenceIndex = WorkingOccurrenceCounts.FindRef(SelectedEvent->EventId) + 1;
        WorkingOccurrenceCounts.Add(SelectedEvent->EventId, OccurrenceIndex);
        WorkingLastStartTicks.Add(SelectedEvent->EventId, Trace.SimulationTick);

        FTemporalEventInstance Instance;
        Instance.EventId = SelectedEvent->EventId;
        Instance.TriggeringTransactionId = Trace.TransactionId;
        Instance.StartTick = Trace.SimulationTick;
        Instance.ScheduledEndTick = Trace.SimulationTick + SelectedEvent->DurationTicks;
        Instance.State = ETemporalEventState::Active;
        Instance.OccurrenceIndex = OccurrenceIndex;
        Instance.InstanceId = MakeStableGuid(FString::Printf(
            TEXT("EVENT|%s|%s|%d"),
            *GuidString(Trace.TransactionId),
            *SelectedEvent->EventId.ToString(),
            OccurrenceIndex));

        TArray<FTemporalMutation> EventMutations = SelectedEvent->FactMutations;
        EventMutations.Sort([](const FTemporalMutation& Left, const FTemporalMutation& Right)
        {
            if (Left.FactId != Right.FactId) return Left.FactId.LexicalLess(Right.FactId);
            return Left.MutationId.LexicalLess(Right.MutationId);
        });
        for (const FTemporalMutation& Mutation : EventMutations)
        {
            if (!ApplyMutation(
                WorkingFacts,
                Mutation,
                Trace.TransactionId,
                SelectedEvent->EventId,
                Trace.SimulationTick,
                true,
                SelectedEvent->EventId,
                Trace.AppliedMutations,
                Error))
            {
                Result.Error = Error;
                Trace.FailureReason = Error;
                Result.Trace = Trace;
                return Result;
            }
        }

        if (!SettleRules(Error) || !ApplyStability())
        {
            Result.Error = Error;
            Trace.FailureReason = Error;
            Result.Trace = Trace;
            return Result;
        }

        for (int32 Index = 0; Index < SelectedEvent->Commands.Num(); ++Index)
        {
            const FSimulationCommandTemplate& Template = SelectedEvent->Commands[Index];
            FSimulationCommandRecord Command;
            Command.TriggeringTransactionId = Trace.TransactionId;
            Command.EventInstanceId = Instance.InstanceId;
            Command.CommandType = Template.CommandType;
            Command.Target = Template.Target;
            Command.PayloadName = Template.PayloadName;
            Command.PayloadValue = Template.PayloadValue;
            Command.IssuedTick = Trace.SimulationTick;
            Command.bPersistent = Template.bPersistent;
            Command.State = ETemporalCommandState::Pending;
            Command.CommandId = MakeStableGuid(FString::Printf(
                TEXT("COMMAND|%s|%s|%s|%s|%d"),
                *GuidString(Trace.TransactionId),
                *GuidString(Instance.InstanceId),
                *Template.CommandType.ToString(),
                *Template.Target.ToString(),
                Index));

            const bool bAlreadyExists = WorkingCommands.ContainsByPredicate([&Command](const FSimulationCommandRecord& Existing)
            {
                return Existing.CommandId == Command.CommandId;
            });
            if (!bAlreadyExists)
            {
                WorkingCommands.Add(Command);
                Instance.GeneratedCommandIds.Add(Command.CommandId);
                Trace.GeneratedCommandIds.Add(Command.CommandId);
            }
        }

        for (int32 Index = 0; Index < SelectedEvent->News.Num(); ++Index)
        {
            const FTemporalNewsTemplate& Template = SelectedEvent->News[Index];
            FTemporalNewsPublication Publication;
            Publication.StoryId = Template.StoryId;
            Publication.TriggeringTransactionId = Trace.TransactionId;
            Publication.RelatedEventInstanceId = Instance.InstanceId;
            Publication.EraId = Template.EraId;
            Publication.DistrictId = Template.DistrictId;
            Publication.PublicationTick = Trace.SimulationTick;
            Publication.ExpirationTick = Trace.SimulationTick + Template.LifetimeTicks;
            Publication.Context = Template.Context;
            Publication.PublicationId = MakeStableGuid(FString::Printf(
                TEXT("NEWS|%s|%s|%s|%d"),
                *GuidString(Trace.TransactionId),
                *GuidString(Instance.InstanceId),
                *Template.StoryId.ToString(),
                Index));

            for (uint8 ChannelIndex = 0; ChannelIndex <= static_cast<uint8>(ETemporalNewsChannel::Debugger); ++ChannelIndex)
            {
                FTemporalNewsChannelState ChannelState;
                ChannelState.Channel = static_cast<ETemporalNewsChannel>(ChannelIndex);
                Publication.ChannelStates.Add(ChannelState);
            }

            const bool bAlreadyExists = WorkingNews.ContainsByPredicate([&Publication](const FTemporalNewsPublication& Existing)
            {
                return Existing.PublicationId == Publication.PublicationId;
            });
            if (!bAlreadyExists)
            {
                WorkingNews.Add(Publication);
                Instance.GeneratedNewsIds.Add(Publication.PublicationId);
                Trace.GeneratedNewsIds.Add(Publication.PublicationId);
            }
        }

        WorkingEvents.Add(Instance);
    }

    const TMap<FName, FTemporalFactRecord> PreviousFacts = Facts;
    Facts = MoveTemp(WorkingFacts);
    EventInstances = MoveTemp(WorkingEvents);
    Commands = MoveTemp(WorkingCommands);
    NewsPublications = MoveTemp(WorkingNews);
    EventOccurrenceCounts = MoveTemp(WorkingOccurrenceCounts);
    EventLastStartTicks = MoveTemp(WorkingLastStartTicks);
    StabilityBreakdown = WorkingStability;
    SimulationTick = Trace.SimulationTick;
    RecalculateHashes();

    Trace.Stability = StabilityBreakdown;
    Trace.SimulationTruthHash = SimulationTruthHash;
    Trace.FullPersistenceHash = FullPersistenceHash;
    LastTransactionTrace = Trace;

    TArray<FName> ChangedFactIds;
    Facts.GetKeys(ChangedFactIds);
    ChangedFactIds.Sort(FNameLexicalLess());
    for (const FName FactId : ChangedFactIds)
    {
        const FTemporalFactRecord* Previous = PreviousFacts.Find(FactId);
        const FTemporalFactRecord& Current = Facts.FindChecked(FactId);
        if (Previous && Previous->Value != Current.Value)
        {
            OnFactChanged.Broadcast(FactId, Previous->Value, Current.Value);
        }
    }

    Result.bCommitted = true;
    Result.Trace = Trace;
    UE_LOG(
        LogTemporalKernel,
        Log,
        TEXT("Committed transaction %s from %s at tick %lld; event=%s truthHash=%lld persistenceHash=%lld"),
        *GuidString(Trace.TransactionId),
        *Trace.SourceId.ToString(),
        Trace.SimulationTick,
        *Trace.SelectedEventId.ToString(),
        SimulationTruthHash,
        FullPersistenceHash);
    return Result;
}

bool UTemporalKernelSubsystem::TryGetFact(FName FactId, FTemporalFactRecord& OutFact) const
{
    if (const FTemporalFactRecord* Record = Facts.Find(FactId))
    {
        OutFact = *Record;
        return true;
    }
    return false;
}

TArray<FTemporalFactRecord> UTemporalKernelSubsystem::GetFactSnapshot() const
{
    TArray<FTemporalFactRecord> Snapshot;
    Facts.GenerateValueArray(Snapshot);
    Snapshot.Sort([](const FTemporalFactRecord& Left, const FTemporalFactRecord& Right)
    {
        return Left.FactId.LexicalLess(Right.FactId);
    });
    return Snapshot;
}

TArray<FSimulationCommandRecord> UTemporalKernelSubsystem::GetPendingCommands(FName CommandType) const
{
    TArray<FSimulationCommandRecord> Pending;
    for (const FSimulationCommandRecord& Command : Commands)
    {
        const bool bPendingState = Command.State == ETemporalCommandState::Pending
            || Command.State == ETemporalCommandState::Delivered
            || Command.State == ETemporalCommandState::Applied;
        if (bPendingState && (CommandType.IsNone() || Command.CommandType == CommandType))
        {
            Pending.Add(Command);
        }
    }
    Pending.Sort([](const FSimulationCommandRecord& Left, const FSimulationCommandRecord& Right)
    {
        return TemporalKernelPrivate::GuidString(Left.CommandId) < TemporalKernelPrivate::GuidString(Right.CommandId);
    });
    return Pending;
}

bool UTemporalKernelSubsystem::MarkCommandDelivered(const FGuid& CommandId)
{
    for (FSimulationCommandRecord& Command : Commands)
    {
        if (Command.CommandId == CommandId)
        {
            if (Command.State == ETemporalCommandState::Pending)
            {
                Command.State = ETemporalCommandState::Delivered;
                RecalculateHashes();
            }
            return true;
        }
    }
    return false;
}

bool UTemporalKernelSubsystem::AcknowledgeCommand(const FGuid& CommandId, FName ConsumerId)
{
    if (ConsumerId.IsNone()) return false;
    for (FSimulationCommandRecord& Command : Commands)
    {
        if (Command.CommandId == CommandId)
        {
            Command.AcknowledgedConsumers.AddUnique(ConsumerId);
            Command.AcknowledgedConsumers.Sort(FNameLexicalLess());
            Command.State = ETemporalCommandState::Acknowledged;
            RecalculateHashes();
            return true;
        }
    }
    return false;
}

bool UTemporalKernelSubsystem::MarkNewsChannelDelivered(const FGuid& PublicationId, ETemporalNewsChannel Channel)
{
    for (FTemporalNewsPublication& Publication : NewsPublications)
    {
        if (Publication.PublicationId == PublicationId)
        {
            for (FTemporalNewsChannelState& ChannelState : Publication.ChannelStates)
            {
                if (ChannelState.Channel == Channel)
                {
                    ChannelState.bDelivered = true;
                    RecalculateHashes();
                    return true;
                }
            }
            return false;
        }
    }
    return false;
}

FTemporalKernelSaveData UTemporalKernelSubsystem::ExportSaveData() const
{
    FTemporalKernelSaveData SaveData;
    SaveData.KernelSchemaVersion = CurrentKernelSchemaVersion;
    SaveData.SimulationTick = SimulationTick;
    SaveData.TimelineSeed = TimelineSeed;
    SaveData.Facts = GetFactSnapshot();
    SaveData.EventInstances = EventInstances;
    SaveData.Commands = Commands;
    SaveData.News = NewsPublications;
    SaveData.EventOccurrenceCounts = EventOccurrenceCounts;
    SaveData.EventLastStartTicks = EventLastStartTicks;
    SaveData.Stability = StabilityBreakdown;
    SaveData.SimulationTruthHash = SimulationTruthHash;
    SaveData.FullPersistenceHash = FullPersistenceHash;
    return SaveData;
}

bool UTemporalKernelSubsystem::ImportSaveData(const FTemporalKernelSaveData& SaveData, FString& OutError)
{
    if (SaveData.KernelSchemaVersion != CurrentKernelSchemaVersion)
    {
        OutError = FString::Printf(
            TEXT("Unsupported kernel schema %d; expected %d."),
            SaveData.KernelSchemaVersion,
            CurrentKernelSchemaVersion);
        return false;
    }

    TMap<FName, FTemporalFactRecord> ImportedFacts;
    for (const FTemporalFactRecord& Record : SaveData.Facts)
    {
        if (Record.FactId.IsNone() || Record.Value.Type == ETemporalValueType::None || ImportedFacts.Contains(Record.FactId))
        {
            OutError = TEXT("Kernel save contains an invalid or duplicate fact.");
            return false;
        }
        ImportedFacts.Add(Record.FactId, Record);
    }

    const TMap<FName, FTemporalFactRecord> PreviousFacts = Facts;
    const TArray<FTemporalEventInstance> PreviousEvents = EventInstances;
    const TArray<FSimulationCommandRecord> PreviousCommands = Commands;
    const TArray<FTemporalNewsPublication> PreviousNews = NewsPublications;
    const TMap<FName, int32> PreviousOccurrences = EventOccurrenceCounts;
    const TMap<FName, int64> PreviousStarts = EventLastStartTicks;
    const FTemporalStabilityBreakdown PreviousStability = StabilityBreakdown;
    const int64 PreviousTick = SimulationTick;
    const int64 PreviousSeed = TimelineSeed;
    const int64 PreviousTruthHash = SimulationTruthHash;
    const int64 PreviousPersistenceHash = FullPersistenceHash;

    Facts = MoveTemp(ImportedFacts);
    EventInstances = SaveData.EventInstances;
    Commands = SaveData.Commands;
    NewsPublications = SaveData.News;
    EventOccurrenceCounts = SaveData.EventOccurrenceCounts;
    EventLastStartTicks = SaveData.EventLastStartTicks;
    StabilityBreakdown = SaveData.Stability;
    SimulationTick = SaveData.SimulationTick;
    TimelineSeed = SaveData.TimelineSeed;
    RecalculateHashes();

    if (SaveData.SimulationTruthHash != 0 && SaveData.SimulationTruthHash != SimulationTruthHash)
    {
        OutError = FString::Printf(
            TEXT("Simulation truth hash mismatch: saved=%lld loaded=%lld."),
            SaveData.SimulationTruthHash,
            SimulationTruthHash);
    }
    else if (SaveData.FullPersistenceHash != 0 && SaveData.FullPersistenceHash != FullPersistenceHash)
    {
        OutError = FString::Printf(
            TEXT("Full persistence hash mismatch: saved=%lld loaded=%lld."),
            SaveData.FullPersistenceHash,
            FullPersistenceHash);
    }

    if (!OutError.IsEmpty())
    {
        Facts = PreviousFacts;
        EventInstances = PreviousEvents;
        Commands = PreviousCommands;
        NewsPublications = PreviousNews;
        EventOccurrenceCounts = PreviousOccurrences;
        EventLastStartTicks = PreviousStarts;
        StabilityBreakdown = PreviousStability;
        SimulationTick = PreviousTick;
        TimelineSeed = PreviousSeed;
        SimulationTruthHash = PreviousTruthHash;
        FullPersistenceHash = PreviousPersistenceHash;
        return false;
    }

    return true;
}

void UTemporalKernelSubsystem::RecalculateHashes()
{
    using namespace TemporalKernelPrivate;

    FString TruthCanonical = FString::Printf(
        TEXT("schema=%d|tick=%lld|seed=%lld|stability=%d|band=%s;"),
        CurrentKernelSchemaVersion,
        SimulationTick,
        TimelineSeed,
        StabilityBreakdown.Result,
        *StabilityBreakdown.Band.ToString());

    const TArray<FTemporalFactRecord> SortedFacts = GetFactSnapshot();
    for (const FTemporalFactRecord& Fact : SortedFacts)
    {
        AppendFactToCanonical(TruthCanonical, Fact);
    }

    TArray<FTemporalEventInstance> SortedEvents = EventInstances;
    SortedEvents.Sort([](const FTemporalEventInstance& Left, const FTemporalEventInstance& Right)
    {
        return GuidString(Left.InstanceId) < GuidString(Right.InstanceId);
    });
    for (const FTemporalEventInstance& Event : SortedEvents)
    {
        TruthCanonical += FString::Printf(
            TEXT("event=%s|id=%s|tx=%s|start=%lld|end=%lld|state=%d|occ=%d;"),
            *Event.EventId.ToString(),
            *GuidString(Event.InstanceId),
            *GuidString(Event.TriggeringTransactionId),
            Event.StartTick,
            Event.ScheduledEndTick,
            static_cast<int32>(Event.State),
            Event.OccurrenceIndex);
    }

    const uint64 TruthHashUnsigned = HashUtf8(TruthCanonical);
    SimulationTruthHash = static_cast<int64>(TruthHashUnsigned);

    FString PersistenceCanonical = TruthCanonical;
    TArray<FSimulationCommandRecord> SortedCommands = Commands;
    SortedCommands.Sort([](const FSimulationCommandRecord& Left, const FSimulationCommandRecord& Right)
    {
        return GuidString(Left.CommandId) < GuidString(Right.CommandId);
    });
    for (const FSimulationCommandRecord& Command : SortedCommands)
    {
        PersistenceCanonical += FString::Printf(
            TEXT("cmd=%s|tx=%s|event=%s|type=%s|target=%s|payload=%s:%s|tick=%lld|state=%d|persistent=%d|acks="),
            *GuidString(Command.CommandId),
            *GuidString(Command.TriggeringTransactionId),
            *GuidString(Command.EventInstanceId),
            *Command.CommandType.ToString(),
            *Command.Target.ToString(),
            *Command.PayloadName.ToString(),
            *Command.PayloadValue.ToCanonicalString(),
            Command.IssuedTick,
            static_cast<int32>(Command.State),
            Command.bPersistent ? 1 : 0);
        TArray<FName> Acknowledgements = Command.AcknowledgedConsumers;
        Acknowledgements.Sort(FNameLexicalLess());
        for (const FName Consumer : Acknowledgements)
        {
            PersistenceCanonical += Consumer.ToString() + TEXT(",");
        }
        PersistenceCanonical += TEXT(";");
    }

    TArray<FTemporalNewsPublication> SortedNews = NewsPublications;
    SortedNews.Sort([](const FTemporalNewsPublication& Left, const FTemporalNewsPublication& Right)
    {
        return GuidString(Left.PublicationId) < GuidString(Right.PublicationId);
    });
    for (const FTemporalNewsPublication& Publication : SortedNews)
    {
        PersistenceCanonical += FString::Printf(
            TEXT("news=%s|story=%s|tx=%s|event=%s|era=%s|district=%s|pub=%lld|exp=%lld|ctx="),
            *GuidString(Publication.PublicationId),
            *Publication.StoryId.ToString(),
            *GuidString(Publication.TriggeringTransactionId),
            *GuidString(Publication.RelatedEventInstanceId),
            *Publication.EraId.ToString(),
            *Publication.DistrictId.ToString(),
            Publication.PublicationTick,
            Publication.ExpirationTick);

        TArray<FName> ContextKeys;
        Publication.Context.GetKeys(ContextKeys);
        ContextKeys.Sort(FNameLexicalLess());
        for (const FName Key : ContextKeys)
        {
            PersistenceCanonical += Key.ToString() + TEXT("=") + Publication.Context.FindChecked(Key).ToCanonicalString() + TEXT(",");
        }
        PersistenceCanonical += TEXT("|channels=");
        TArray<FTemporalNewsChannelState> Channels = Publication.ChannelStates;
        Channels.Sort([](const FTemporalNewsChannelState& Left, const FTemporalNewsChannelState& Right)
        {
            return static_cast<uint8>(Left.Channel) < static_cast<uint8>(Right.Channel);
        });
        for (const FTemporalNewsChannelState& Channel : Channels)
        {
            PersistenceCanonical += FString::Printf(TEXT("%d:%d,"), static_cast<int32>(Channel.Channel), Channel.bDelivered ? 1 : 0);
        }
        PersistenceCanonical += TEXT(";");
    }

    TArray<FName> OccurrenceKeys;
    EventOccurrenceCounts.GetKeys(OccurrenceKeys);
    OccurrenceKeys.Sort(FNameLexicalLess());
    for (const FName EventId : OccurrenceKeys)
    {
        PersistenceCanonical += FString::Printf(
            TEXT("occ=%s:%d:last=%lld;"),
            *EventId.ToString(),
            EventOccurrenceCounts.FindRef(EventId),
            EventLastStartTicks.FindRef(EventId));
    }

    FullPersistenceHash = static_cast<int64>(HashUtf8(PersistenceCanonical));
}
