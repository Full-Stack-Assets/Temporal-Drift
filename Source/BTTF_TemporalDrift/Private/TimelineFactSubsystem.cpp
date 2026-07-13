#include "TimelineFactSubsystem.h"

bool UTimelineFactSubsystem::LoadDefinitions(UTimelineFactDataAsset* Data)
{
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
    return true;
}

bool UTimelineFactSubsystem::GetFact(FName FactId, bool& bFound) const
{
    if (const bool* Value=ComputedValues.Find(FactId)) { bFound=true; return *Value; }
    bFound=false; return false;
}

bool UTimelineFactSubsystem::RestoreOverrideSnapshot(const TMap<FName, bool>& Snapshot)
{
    BaseOverrides = Snapshot;
    return RecomputeFacts();
}
