#include "EraWorldManager.h"
#include "WorldPartition/DataLayer/DataLayerAsset.h"
#include "WorldPartition/DataLayer/DataLayerInstance.h"
#include "WorldPartition/DataLayer/DataLayerManager.h"
#include "WorldPartition/WorldPartitionSubsystem.h"

UEraWorldManager::UEraWorldManager()
{
    EraLayers.Add(ETimelineState::Present1985, TSoftObjectPtr<UDataLayerAsset>(FSoftObjectPath(TEXT("/Game/Data/DataLayers/DL_1985_Present.DL_1985_Present"))));
    EraLayers.Add(ETimelineState::Past1955, TSoftObjectPtr<UDataLayerAsset>(FSoftObjectPath(TEXT("/Game/Data/DataLayers/DL_1955.DL_1955"))));
    EraLayers.Add(ETimelineState::Alternate1985, TSoftObjectPtr<UDataLayerAsset>(FSoftObjectPath(TEXT("/Game/Data/DataLayers/DL_1985_Alternate.DL_1985_Alternate"))));
    EraLayers.Add(ETimelineState::Future2015, TSoftObjectPtr<UDataLayerAsset>(FSoftObjectPath(TEXT("/Game/Data/DataLayers/DL_2015.DL_2015"))));
    EraLayers.Add(ETimelineState::DeepFuture2045, TSoftObjectPtr<UDataLayerAsset>(FSoftObjectPath(TEXT("/Game/Data/DataLayers/DL_2045.DL_2045"))));
    EraLayers.Add(ETimelineState::WildWest1885, TSoftObjectPtr<UDataLayerAsset>(FSoftObjectPath(TEXT("/Game/Data/DataLayers/DL_1885.DL_1885"))));
}

TSoftObjectPtr<UDataLayerAsset> UEraWorldManager::GetDataLayerForEra(ETimelineState Era) const
{
    if (const TSoftObjectPtr<UDataLayerAsset>* Layer = EraLayers.Find(Era))
    {
        return *Layer;
    }
    return nullptr;
}

bool UEraWorldManager::SwitchToEra(ETimelineState NewEra)
{
    return RequestEra(NewEra);
}

bool UEraWorldManager::RequestEra(ETimelineState NewEra)
{
    UWorld* World = GetWorld();
    UDataLayerManager* Manager = World ? UDataLayerManager::GetDataLayerManager(World) : nullptr;
    UDataLayerAsset* TargetLayer = GetDataLayerForEra(NewEra).LoadSynchronous();
    if (!Manager || !TargetLayer)
    {
        return false;
    }

    if (bEraReady && NewEra == ActiveEra)
    {
        return true;
    }

    for (const TPair<ETimelineState, TSoftObjectPtr<UDataLayerAsset>>& Pair : EraLayers)
    {
        if (UDataLayerAsset* Layer = Pair.Value.LoadSynchronous())
        {
            Manager->SetDataLayerRuntimeState(Layer,
                Pair.Key == NewEra ? EDataLayerRuntimeState::Activated : EDataLayerRuntimeState::Unloaded);
        }
    }

    PendingEra = NewEra;
    bEraReady = false;
    bTransitionInFlight = true;
    return true;
}

void UEraWorldManager::PrewarmEra(ETimelineState Era)
{
    UWorld* World = GetWorld();
    UDataLayerManager* Manager = World ? UDataLayerManager::GetDataLayerManager(World) : nullptr;
    UDataLayerAsset* TargetLayer = GetDataLayerForEra(Era).LoadSynchronous();
    if (!Manager || !TargetLayer)
    {
        return;
    }

    // Bring the target layer to a loaded-but-not-active state so the eventual swap
    // has less to stream. This must not disturb the currently active era, so we only
    // touch the target layer and never downgrade one that is already Activated.
    const UDataLayerInstance* TargetInstance = Manager->GetDataLayerInstanceFromAsset(TargetLayer);
    if (TargetInstance && TargetInstance->GetEffectiveRuntimeState() == EDataLayerRuntimeState::Activated)
    {
        return;
    }

    Manager->SetDataLayerRuntimeState(TargetLayer, EDataLayerRuntimeState::Loaded);
}

void UEraWorldManager::Tick(float DeltaTime)
{
    // Only poll streaming while a transition is actually in flight; do zero work when idle.
    if (!bTransitionInFlight || bEraReady)
    {
        return;
    }

    UWorld* World = GetWorld();
    UDataLayerManager* Manager = World ? UDataLayerManager::GetDataLayerManager(World) : nullptr;
    UDataLayerAsset* TargetLayer = GetDataLayerForEra(PendingEra).Get();
    const UDataLayerInstance* TargetInstance = Manager && TargetLayer
        ? Manager->GetDataLayerInstanceFromAsset(TargetLayer)
        : nullptr;
    if (!TargetInstance || TargetInstance->GetEffectiveRuntimeState() != EDataLayerRuntimeState::Activated)
    {
        return;
    }

    const UWorldPartitionSubsystem* PartitionSubsystem = World->GetSubsystem<UWorldPartitionSubsystem>();
    if (PartitionSubsystem && !PartitionSubsystem->IsStreamingCompleted())
    {
        return;
    }

    const ETimelineState PreviousEra = ActiveEra;
    ActiveEra = PendingEra;
    bEraReady = true;
    bTransitionInFlight = false;
    OnEraChanged.Broadcast(PreviousEra, ActiveEra);
    OnEraReady.Broadcast(ActiveEra);
}

TStatId UEraWorldManager::GetStatId() const
{
    RETURN_QUICK_DECLARE_CYCLE_STAT(UEraWorldManager, STATGROUP_Tickables);
}
