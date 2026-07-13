#include "WorldConsequenceSubsystem.h"
#include "TimelineFactSubsystem.h"

void UWorldConsequenceSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    RegisterDefaultConsequences();

    if (UTimelineFactSubsystem* Facts = GetGameInstance()->GetSubsystem<UTimelineFactSubsystem>())
    {
        Facts->OnFactChanged.AddDynamic(this, &UWorldConsequenceSubsystem::HandleFactChanged);
        for (const TPair<FName, FWorldConsequenceDefinition>& Pair : Definitions)
        {
            bool bFound = false;
            if (Facts->GetFact(Pair.Key, bFound) && bFound)
            {
                ActiveFacts.Add(Pair.Key);
            }
        }
    }
}

void UWorldConsequenceSubsystem::RegisterDefaultConsequences()
{
    auto Add = [this](const TCHAR* Id, const TCHAR* Label, const TCHAR* Desc, const TCHAR* MaterialPath = nullptr)
    {
        FWorldConsequenceDefinition Def;
        Def.FactId = FName(Id);
        Def.ShortLabel = FText::FromString(Label);
        Def.Description = FText::FromString(Desc);
        if (MaterialPath)
        {
            Def.SignageMaterialPath = FSoftObjectPath(MaterialPath);
        }
        Definitions.Add(Def.FactId, Def);
    };

    Add(TEXT("C_PlaqueChanged"), TEXT("Plaque altered"),
        TEXT("Courthouse commemorative plaque text changed after the 1955 visit."),
        TEXT("/Game/Environment/HillValley/Signage/MI_Consequence_Plaque.MI_Consequence_Plaque"));
    Add(TEXT("C_DinerRenamed"), TEXT("Diner renamed"),
        TEXT("Lou's Cafe sign no longer matches archive photographs."),
        TEXT("/Game/Environment/HillValley/Signage/MI_Consequence_Diner.MI_Consequence_Diner"));
    Add(TEXT("C_SchoolDedication"), TEXT("School dedication changed"),
        TEXT("Hill Valley High dedication plaque shows a different name."),
        TEXT("/Game/Environment/HillValley/Signage/MI_Consequence_School.MI_Consequence_School"));
    Add(TEXT("C_FounderMissing"), TEXT("Founder portrait missing"),
        TEXT("Courthouse founder portrait was replaced with an empty frame."),
        TEXT("/Game/Environment/HillValley/Signage/MI_Consequence_Portrait.MI_Consequence_Portrait"));
    Add(TEXT("C_CampaignComplete"), TEXT("Timeline stabilized"),
        TEXT("First campaign resolved; Hill Valley enters post-story free roam."));
}

void UWorldConsequenceSubsystem::HandleFactChanged(FName FactId, bool PreviousValue, bool NewValue)
{
    if (NewValue)
    {
        ActiveFacts.Add(FactId);
        if (const FWorldConsequenceDefinition* Def = Definitions.Find(FactId))
        {
            OnConsequenceActivated.Broadcast(FactId, Def->ShortLabel);
        }
    }
    else
    {
        ActiveFacts.Remove(FactId);
    }
}

FText UWorldConsequenceSubsystem::GetActiveConsequencesSummary() const
{
    if (ActiveFacts.IsEmpty())
    {
        return FText::GetEmpty();
    }

    TArray<FString> Labels;
    for (FName FactId : ActiveFacts)
    {
        if (const FWorldConsequenceDefinition* Def = Definitions.Find(FactId))
        {
            Labels.Add(Def->ShortLabel.ToString());
        }
    }
    Labels.Sort();
    return FText::FromString(FString::Printf(TEXT("RIPPLES: %s"), *FString::Join(Labels, TEXT(" · "))));
}

TArray<FName> UWorldConsequenceSubsystem::GetActiveFactIds() const
{
    return ActiveFacts.Array();
}

bool UWorldConsequenceSubsystem::IsFactActive(FName FactId) const
{
    return ActiveFacts.Contains(FactId);
}

FText UWorldConsequenceSubsystem::GetShortLabelForFact(FName FactId) const
{
    if (const FWorldConsequenceDefinition* Def = Definitions.Find(FactId))
    {
        return Def->ShortLabel;
    }
    return FText::GetEmpty();
}
