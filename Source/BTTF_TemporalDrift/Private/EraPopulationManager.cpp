#include "EraPopulationManager.h"

UEraPopulationManager::UEraPopulationManager()
{
    FEraPopulationProfile Frontier;Frontier.MaxPedestrians=24;Frontier.MaxTraffic=8;Frontier.AllowedTraffic={EEraTrafficType::Horse,EEraTrafficType::Stagecoach};
    FEraPopulationProfile Golden;Golden.MaxPedestrians=52;Golden.MaxTraffic=18;Golden.AllowedTraffic={EEraTrafficType::Cruiser};
    FEraPopulationProfile Home;Home.MaxPedestrians=46;Home.MaxTraffic=20;Home.AllowedTraffic={EEraTrafficType::Sedan};
    FEraPopulationProfile Future;Future.MaxPedestrians=60;Future.MaxTraffic=26;Future.AllowedTraffic={EEraTrafficType::SkywayFlyer};
    FEraPopulationProfile DeepFuture;DeepFuture.MaxPedestrians=72;DeepFuture.MaxTraffic=32;DeepFuture.AllowedTraffic={EEraTrafficType::SkywayFlyer,EEraTrafficType::AutonomousSwarm};
    Profiles.Add(ETimelineState::WildWest1885,Frontier);Profiles.Add(ETimelineState::Past1955,Golden);Profiles.Add(ETimelineState::Present1985,Home);Profiles.Add(ETimelineState::Alternate1985,Home);Profiles.Add(ETimelineState::Future2015,Future);Profiles.Add(ETimelineState::DeepFuture2045,DeepFuture);
}

void UEraPopulationManager::SetActiveEra(ETimelineState Era){ActiveEra=Era;ActiveAmbientPedestrians=0;ActiveTraffic=0;ReservedNamedCitizens.Reset();}
FEraPopulationProfile UEraPopulationManager::GetActiveProfile()const{return Profiles.FindRef(ActiveEra);}
bool UEraPopulationManager::IsSpawnAllowed(const FVector& Location)const{for(const FPopulationExclusionZone& Zone:ExclusionZones)if(FVector::DistSquared(Location,Zone.Center)<FMath::Square(Zone.Radius))return false;return true;}
bool UEraPopulationManager::ReserveNamedCitizen(FName CitizenId,const FVector& SpawnLocation){if(CitizenId.IsNone()||ReservedNamedCitizens.Contains(CitizenId)||!IsSpawnAllowed(SpawnLocation))return false;ReservedNamedCitizens.Add(CitizenId);return true;}
void UEraPopulationManager::ReleaseNamedCitizen(FName CitizenId){ReservedNamedCitizens.Remove(CitizenId);}
bool UEraPopulationManager::IsNamedCitizenReserved(FName CitizenId)const{return ReservedNamedCitizens.Contains(CitizenId);}
bool UEraPopulationManager::ReserveAmbientPedestrian(const FVector& SpawnLocation){if(!IsSpawnAllowed(SpawnLocation)||ActiveAmbientPedestrians>=GetActiveProfile().MaxPedestrians)return false;++ActiveAmbientPedestrians;return true;}
bool UEraPopulationManager::ReserveTraffic(EEraTrafficType Type,const FVector& SpawnLocation){const FEraPopulationProfile Profile=GetActiveProfile();if(!IsSpawnAllowed(SpawnLocation)||ActiveTraffic>=Profile.MaxTraffic||!Profile.AllowedTraffic.Contains(Type))return false;++ActiveTraffic;return true;}
void UEraPopulationManager::ReleaseAmbientPedestrian(){ActiveAmbientPedestrians=FMath::Max(0,ActiveAmbientPedestrians-1);}
void UEraPopulationManager::ReleaseTraffic(){ActiveTraffic=FMath::Max(0,ActiveTraffic-1);}
void UEraPopulationManager::SetMissionExclusionZones(const TArray<FPopulationExclusionZone>& Zones){ExclusionZones=Zones;}
