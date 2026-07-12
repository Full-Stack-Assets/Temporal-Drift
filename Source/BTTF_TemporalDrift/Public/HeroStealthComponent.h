#pragma once
#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "TimeTravelTypes.h"
#include "HeroStealthComponent.generated.h"

UCLASS(ClassGroup=(Gameplay),meta=(BlueprintSpawnableComponent))
class BTTF_TEMPORALDRIFT_API UHeroStealthComponent:public UActorComponent
{
    GENERATED_BODY()
public:
    UFUNCTION(BlueprintPure) float CalculateDetectionRate(ETimelineState Era,float MovementNoise,float Visibility,FName OutfitId,bool bDroneObserver)const;
    UFUNCTION(BlueprintCallable) void UpdateAwareness(float DetectionRate,float DeltaSeconds);
    UFUNCTION(BlueprintCallable) void ClearAwareness();
    UFUNCTION(BlueprintPure) float GetAwareness()const{return Awareness;}
    UFUNCTION(BlueprintPure) bool IsDetected()const{return Awareness>=100.0f;}
private:
    UPROPERTY() float Awareness=0.0f;
};
