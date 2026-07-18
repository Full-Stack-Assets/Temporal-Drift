#include "TimelineFactSubsystem.h"

#include "TemporalKernel/TemporalKernelSubsystem.h"

bool UTimelineFactSubsystem::LoadDefinitions(UTimelineFactDataAsset* Data)
{
    if (UGameInstance* GameInstance = GetGameInstance())
    {
        if (UTemporalKernelSubsystem* Kernel = GameInstance->GetSubsystem<UTemporalKernelSubsystem>())
        {
            bSuppressNextKernelMirror = Kernel->GetSimulationTick() > 0;
        }
    }

    Definitions.Reset(); BaseOverrides.Reset(); ComputedValues.Reset(); ChangedFacts.Reset(); bDependencyCycle=false;
    if (!Data) return false;
    for (const FTimelineFactDefinition& Fact : Data->Facts)
    {
        if (Fact.FactId.IsNone() || Definitions.Contains(Fact.FactId)) return false;
        Definitions.Add(Fact.FactId, Fact);
        ComputedValues.Add(Fact.FactId, Fact.DefaultValue);
    }
    return RecomputeFacts();
}

bool UTimelineFactSubsystem::SetBaseFact(FName FactId, bool Value)
{
    if (FactId.IsNone()) return false;
    if (!Definitions.Contains(FactId))
    {
        FTimelineFactDefinition DynamicFact;
        DynamicFact.FactId = FactId;
        DynamicFact.DefaultValue = false;
        Definitions.Add(FactId, DynamicFact);
        ComputedValues.Add(FactId, false);
    }
    BaseOverrides.Add(FactId, Value);
    return RecomputeFacts();
}

bool UTimelineFactSubsystem::VisitFact(FName FactId, TSet<FName>& Visiting, TSet<FName>& Visited, TArray<FName>& Order)
{
    if (Visited.Contains(FactId)) return true;
    if (Visiting.Contains(FactId)) { bDependencyCycle=true; return false; }
    const FTimelineFactDefinition* Fact=Definitions.Find(FactId);
    if (!Fact) return false;
    Visiting.Add(FactId);
    for (const FTimelineFactDependency& Dependency : Fact->Dependencies)
    {
        if (!Definitions.Contains(Dependency.FactId) || !VisitFact(Dependency.FactId,Visiting,Visited,Order)) return false;
    }
    Visiting.Remove(FactId); Visited.Add(FactId); Order.Add(FactId); return true;
}

bool UTimelineFactSubsystem::RecomputeFacts()
{
    bDependencyCycle=false; ChangedFacts.Reset();
    TSet<FName> Visiting,Visited; TArray<FName> Order;
    TArray<FName> FactIds; Definitions.GetKeys(FactIds);
    FactIds.Sort(FNameLexicalLess());
    for (FName FactId : FactIds) if (!VisitFact(FactId,Visiting,Visited,Order)) return false;
    TSet<FName> ActivatedFacts;
    for (FName FactId : Order)
    {
        const FTimelineFactDefinition& Fact=Definitions[FactId];
        bool NewValue=Fact.DefaultValue;
        if (const bool* Override=BaseOverrides.Find(FactId))
        {
            NewValue=*Override;
            ActivatedFacts.Add(FactId);
        }
        else if (!Fact.Dependencies.IsEmpty())
        {
            bool bCausallyActivated=false;
            for (const FTimelineFactDependency& Dependency : Fact.Dependencies)
                bCausallyActivated |= ActivatedFacts.Contains(Dependency.FactId);
            if (bCausallyActivated)
            {
                bool bSatisfied=true;
                for (const FTimelineFactDependency& Dependency : Fact.Dependencies)
                    bSatisfied &= ComputedValues.FindRef(Dependency.FactId)==Dependency.RequiredValue;
                NewValue=bSatisfied ? Fact.ValueWhenDependenciesSatisfied : Fact.DefaultValue;
                ActivatedFacts.Add(FactId);
            }
        }
        const bool Previous=ComputedValues.FindRef(FactId);
        ComputedValues.Add(FactId,NewValue);
        if (Previous!=NewValue) { ChangedFacts.Add(FactId); OnFactChanged.Broadcast(FactId,Previous,NewValue); }
    }

    MirrorComputedFactsToKernel(TEXT("Compatibility.TimelineFactSubsystem"));
    return true;
}

bool UTimelineFactSubsystem::GetFact(FName FactId, bool& bFound) const
{
    if (const bool* Value=ComputedValues.Find(FactId)) { bFound=true; return *Value; }
    bFound=false; return false;
}

bool UTimelineFactSubsystem::RestoreOverrideSnapshot(const TMap<FName, bool>& Snapshot)
{
    for (const TPair<FName, bool>& Pair : Snapshot)
    {
        if (!Definitions.Contains(Pair.Key))
        {
            FTimelineFactDefinition DynamicFact;
            DynamicFact.FactId = Pair.Key;
            DynamicFact.DefaultValue = false;
            Definitions.Add(Pair.Key, DynamicFact);
            ComputedValues.Add(Pair.Key, false);
        }
    }

    BaseOverrides = Snapshot;
    return RecomputeFacts();
}

void UTimelineFactSubsystem::MirrorComputedFactsToKernel(FName SourceId)
{
    if (bSuppressNextKernelMirror)
    {
        bSuppressNextKernelMirror = false;
        return;
    }

    UGameInstance* GameInstance = GetGameInstance();
    UTemporalKernelSubsystem* Kernel = GameInstance ? GameInstance->GetSubsystem<UTemporalKernelSubsystem>() : nullptr;
    if (!Kernel)
    {
        return;
    }

    TArray<FName> FactIds;
    ComputedValues.GetKeys(FactIds);
    FactIds.Sort(FNameLexicalLess());

    FTemporalTransactionRequest Request;
    Request.SourceId = SourceId;
    for (const FName FactId : FactIds)
    {
        const bool ComputedValue = ComputedValues.FindRef(FactId);
        FTemporalFactRecord KernelFact;
        if (!Kernel->TryGetFact(FactId, KernelFact))
        {
            const FTimelineFactDefinition* Definition = Definitions.Find(FactId);
            const bool DefaultValue = Definition ? Definition->DefaultValue : false;
            if (!Kernel->RegisterFact(FactId, FTemporalValue::MakeBool(DefaultValue)))
            {
                UE_LOG(LogTemp, Warning, TEXT("Timeline fact '%s' could not be registered in the Living Timeline kernel."), *FactId.ToString());
                continue;
            }

            if (!Kernel->TryGetFact(FactId, KernelFact))
            {
                continue;
            }
        }

        if (KernelFact.Value.Type != ETemporalValueType::Boolean)
        {
            UE_LOG(LogTemp, Warning, TEXT("Timeline fact '%s' conflicts with a non-Boolean kernel fact."), *FactId.ToString());
            continue;
        }
        if (KernelFact.Value.BoolValue == ComputedValue)
        {
            continue;
        }

        FTemporalMutation Mutation;
        Mutation.MutationId = FName(*(TEXT("Compatibility.Mirror.") + FactId.ToString()));
        Mutation.FactId = FactId;
        Mutation.Operation = ETemporalMutationOperation::Set;
        Mutation.Value = FTemporalValue::MakeBool(ComputedValue);
        Request.PrimaryMutations.Add(Mutation);
    }

    if (!Request.PrimaryMutations.IsEmpty())
    {
        const FTemporalTransactionResult Result = Kernel->SubmitTransaction(Request);
        if (!Result.bCommitted)
        {
            UE_LOG(LogTemp, Warning, TEXT("Timeline fact mirror transaction failed: %s"), *Result.Error);
        }
    }
}
