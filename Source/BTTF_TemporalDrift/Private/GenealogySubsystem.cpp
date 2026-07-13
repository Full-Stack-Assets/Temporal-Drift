#include "GenealogySubsystem.h"

bool UGenealogySubsystem::LoadGenealogy(UGenealogyDataAsset* Data)
{
    Records.Reset(); ChildrenByParent.Reset(); bHasCycle=false;
    if(!Data) return false;
    for(const FCitizenGenealogyRecord& Citizen:Data->Citizens)
    {
        if(Citizen.CitizenId.IsNone()||Records.Contains(Citizen.CitizenId)||Citizen.DeathYear<Citizen.BirthYear) return false;
        Records.Add(Citizen.CitizenId,Citizen);
    }
    for(const TPair<FName,FCitizenGenealogyRecord>& Pair:Records)
        for(FName Parent:Pair.Value.ParentIds)
        {
            if(!Records.Contains(Parent)) return false;
            ChildrenByParent.Add(Parent,Pair.Key);
        }
    TSet<FName> Visiting,Visited;
    for(const TPair<FName,FCitizenGenealogyRecord>& Pair:Records)
        if(!VisitParentChain(Pair.Key,Visiting,Visited)) return false;
    return true;
}

bool UGenealogySubsystem::VisitParentChain(FName CitizenId,TSet<FName>& Visiting,TSet<FName>& Visited)
{
    if(Visited.Contains(CitizenId)) return true;
    if(Visiting.Contains(CitizenId)){bHasCycle=true;return false;}
    Visiting.Add(CitizenId);
    for(FName Parent:Records[CitizenId].ParentIds) if(!VisitParentChain(Parent,Visiting,Visited)) return false;
    Visiting.Remove(CitizenId);Visited.Add(CitizenId);return true;
}

bool UGenealogySubsystem::IsCitizenAliveInYear(FName CitizenId,int32 Year) const
{
    const FCitizenGenealogyRecord* Record=Records.Find(CitizenId);
    return Record&&Year>=Record->BirthYear&&Year<=Record->DeathYear;
}

TArray<FName> UGenealogySubsystem::GetChildren(FName CitizenId) const
{
    TArray<FName> Result;ChildrenByParent.MultiFind(CitizenId,Result);Result.Sort(FNameLexicalLess());return Result;
}

TArray<FName> UGenealogySubsystem::GetDescendants(FName CitizenId) const
{
    TArray<FName> Result,Queue=GetChildren(CitizenId);TSet<FName> Seen;
    while(!Queue.IsEmpty())
    {
        const FName Next=Queue[0];Queue.RemoveAt(0);
        if(Seen.Contains(Next))continue;Seen.Add(Next);Result.Add(Next);Queue.Append(GetChildren(Next));
    }
    Result.Sort(FNameLexicalLess());return Result;
}

FName UGenealogySubsystem::GetScheduleForYear(FName CitizenId,int32 Year) const
{
    const FCitizenGenealogyRecord* Record=Records.Find(CitizenId);if(!Record)return NAME_None;
    int32 BestYear=MIN_int32;FName Best=NAME_None;
    for(const TPair<int32,FName>& Pair:Record->EraScheduleIds)if(Pair.Key<=Year&&Pair.Key>BestYear){BestYear=Pair.Key;Best=Pair.Value;}
    return Best;
}
