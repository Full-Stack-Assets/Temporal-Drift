#include "HeroStealthComponent.h"
float UHeroStealthComponent::CalculateDetectionRate(ETimelineState Era,float MovementNoise,float Visibility,FName OutfitId,bool bDroneObserver)const
{
    float Rate=FMath::Max(0.0f,MovementNoise)*0.55f+FMath::Max(0.0f,Visibility)*0.45f;
    if(Era==ETimelineState::WildWest1885)Rate*=1.25f;
    if(OutfitId==TEXT("Outfit.EastwoodPoncho")&&Era==ETimelineState::WildWest1885)Rate*=0.65f;
    if(OutfitId==TEXT("Outfit.2045Reenactor")&&Era==ETimelineState::DeepFuture2045)Rate*=0.55f;
    if(OutfitId==TEXT("Outfit.RadiationSuit")&&Era==ETimelineState::Past1955)Rate*=1.8f;
    if(bDroneObserver)
    {
        if(Era!=ETimelineState::DeepFuture2045&&Era!=ETimelineState::Future2015)return 0.0f;
        if(OutfitId==TEXT("Outfit.2045Reenactor"))Rate*=0.35f;
        else Rate*=1.35f;
    }
    return Rate;
}
void UHeroStealthComponent::UpdateAwareness(float DetectionRate,float DeltaSeconds){if(DeltaSeconds<=0.0f)return;Awareness=FMath::Clamp(Awareness+DetectionRate*DeltaSeconds,0.0f,100.0f);}
void UHeroStealthComponent::ClearAwareness(){Awareness=0.0f;}
