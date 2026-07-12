#include "EraWorldManager.h"
#include "WorldPartition/DataLayer/DataLayerAsset.h"
#include "WorldPartition/DataLayer/DataLayerManager.h"

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
    UWorld* World = GetWorld();
    UDataLayerManager* Manager = World ? UDataLayerManager::GetDataLayerManager(World) : nullptr;
    UDataLayerAsset* TargetLayer = GetDataLayerForEra(NewEra).LoadSynchronous();
    if (!Manager || !TargetLayer)
    {
        return false;
    }

    for (const TPair<ETimelineState, TSoftObjectPtr<UDataLayerAsset>>& Pair : EraLayers)
    {
        if (UDataLayerAsset* Layer = Pair.Value.LoadSynchronous())
        {
            Manager->SetDataLayerRuntimeState(Layer,
                Pair.Key == NewEra ? EDataLayerRuntimeState::Activated : EDataLayerRuntimeState::Unloaded);
        }
    }

    const ETimelineState PreviousEra = ActiveEra;
    ActiveEra = NewEra;
    OnEraChanged.Broadcast(PreviousEra, NewEra);
    return true;
}
