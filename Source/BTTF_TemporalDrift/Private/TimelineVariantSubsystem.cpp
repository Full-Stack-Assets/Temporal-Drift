#include "TimelineVariantSubsystem.h"

#include "EraWorldManager.h"
#include "TimelineFactSubsystem.h"
#include "Engine/World.h"
#include "GameFramework/Actor.h"
#include "Kismet/GameplayStatics.h"

namespace
{
    constexpr TCHAR ShowIfPrefix[] = TEXT("HV_ShowIf_");
    constexpr TCHAR HideIfPrefix[] = TEXT("HV_HideIf_");
}

void UTimelineVariantSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);

    if (UGameInstance* GameInstance = GetWorld()->GetGameInstance())
    {
        if (UTimelineFactSubsystem* Facts = GameInstance->GetSubsystem<UTimelineFactSubsystem>())
        {
            Facts->OnFactChanged.AddDynamic(this, &UTimelineVariantSubsystem::HandleFactChanged);
        }
    }

    if (UEraWorldManager* EraManager = GetWorld()->GetSubsystem<UEraWorldManager>())
    {
        EraManager->OnEraReady.AddDynamic(this, &UTimelineVariantSubsystem::HandleEraReady);
    }
}

void UTimelineVariantSubsystem::Deinitialize()
{
    VariantActors.Reset();
    Super::Deinitialize();
}

void UTimelineVariantSubsystem::HandleFactChanged(FName FactId, bool PreviousValue, bool NewValue)
{
    ApplyVariantVisibilityForFact(FactId, NewValue);
}

void UTimelineVariantSubsystem::HandleEraReady(ETimelineState ReadyEra)
{
    RefreshAllVariants();
}

void UTimelineVariantSubsystem::CollectVariantActors()
{
    VariantActors.Reset();
    TArray<AActor*> FoundActors;
    UGameplayStatics::GetAllActorsWithTag(GetWorld(), TEXT("HV_TimelineVariant"), FoundActors);
    for (AActor* Actor : FoundActors)
    {
        if (IsValid(Actor))
        {
            VariantActors.Add(Actor);
        }
    }
    bVariantsCollected = true;
}

bool UTimelineVariantSubsystem::EvaluateFactValue(FName FactId) const
{
    if (UGameInstance* GameInstance = GetWorld()->GetGameInstance())
    {
        if (const UTimelineFactSubsystem* Facts = GameInstance->GetSubsystem<UTimelineFactSubsystem>())
        {
            bool bFound = false;
            return Facts->GetFact(FactId, bFound) && bFound;
        }
    }
    return false;
}

bool UTimelineVariantSubsystem::MatchesGateTag(const FName& Tag, bool& bShowIf, FName& OutFactId) const
{
    const FString TagString = Tag.ToString();
    if (TagString.StartsWith(ShowIfPrefix))
    {
        bShowIf = true;
        OutFactId = FName(*TagString.RightChop(UE_ARRAY_COUNT(ShowIfPrefix) - 1));
        return true;
    }
    if (TagString.StartsWith(HideIfPrefix))
    {
        bShowIf = false;
        OutFactId = FName(*TagString.RightChop(UE_ARRAY_COUNT(HideIfPrefix) - 1));
        return true;
    }
    return false;
}

bool UTimelineVariantSubsystem::ShouldActorBeVisible(AActor* Actor) const
{
    if (!IsValid(Actor))
    {
        return false;
    }

    bool bHasGate = false;
    bool bVisible = true;

    for (const FName Tag : Actor->Tags)
    {
        bool bShowIf = true;
        FName FactId = NAME_None;
        if (!MatchesGateTag(Tag, bShowIf, FactId))
        {
            continue;
        }

        bHasGate = true;
        const bool bFactValue = EvaluateFactValue(FactId);
        const bool bGateVisible = bShowIf ? bFactValue : !bFactValue;
        bVisible &= bGateVisible;
    }

    return !bHasGate || bVisible;
}

void UTimelineVariantSubsystem::ApplyVariantVisibilityForFact(FName FactId, bool bFactValue)
{
    (void)bFactValue;
    if (!bVariantsCollected)
    {
        CollectVariantActors();
    }

    for (AActor* Actor : VariantActors)
    {
        if (!IsValid(Actor))
        {
            continue;
        }

        bool bRelevant = false;
        for (const FName Tag : Actor->Tags)
        {
            bool bShowIf = true;
            FName GateFactId = NAME_None;
            if (MatchesGateTag(Tag, bShowIf, GateFactId) && GateFactId == FactId)
            {
                bRelevant = true;
                break;
            }
        }

        if (bRelevant)
        {
            const bool bVisible = ShouldActorBeVisible(Actor);
            Actor->SetActorHiddenInGame(!bVisible);
            Actor->SetActorEnableCollision(bVisible);
        }
    }
}

void UTimelineVariantSubsystem::RefreshAllVariants()
{
    CollectVariantActors();
    for (AActor* Actor : VariantActors)
    {
        if (!IsValid(Actor))
        {
            continue;
        }
        const bool bVisible = ShouldActorBeVisible(Actor);
        Actor->SetActorHiddenInGame(!bVisible);
        Actor->SetActorEnableCollision(bVisible);
    }
}
