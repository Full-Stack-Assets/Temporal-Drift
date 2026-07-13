#pragma once
#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "TimeTravelTypes.h"
#include "EraWeatherSubsystem.generated.h"

UENUM(BlueprintType)
enum class EWeatherState:uint8 { Clear,Overcast,Rain,Fog,Snow,Thunderstorm };

USTRUCT(BlueprintType)
struct FEraWorldClock
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere,BlueprintReadWrite) ETimelineState Era=ETimelineState::Present1985;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 Year=1985;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 Month=10;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 Day=26;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) float SecondsSinceMidnight=43200.0f;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnWeatherChanged,EWeatherState,Previous,EWeatherState,Current);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnClocktowerLightningWindow);

UCLASS()
class BTTF_TEMPORALDRIFT_API UEraWeatherSubsystem:public UGameInstanceSubsystem
{
    GENERATED_BODY()
public:
    UFUNCTION(BlueprintCallable) void SetWorldClock(const FEraWorldClock& NewClock);
    UFUNCTION(BlueprintCallable) void AdvanceWorldTime(float RealDeltaSeconds,float GameTimeScale=1.0f);
    UFUNCTION(BlueprintCallable) void SetWeather(EWeatherState NewWeather);
    UFUNCTION(BlueprintPure) FEraWorldClock GetWorldClock()const{return Clock;}
    UFUNCTION(BlueprintPure) EWeatherState GetWeather()const{return Weather;}
    UFUNCTION(BlueprintPure) float GetClocktowerLightningCountdown()const;
    UFUNCTION(BlueprintPure) bool IsClocktowerLightningWindowActive()const{return bLightningWindowActive;}
    UFUNCTION(BlueprintPure) FName GetSeasonId()const;
    UPROPERTY(BlueprintAssignable) FOnWeatherChanged OnWeatherChanged;
    UPROPERTY(BlueprintAssignable) FOnClocktowerLightningWindow OnClocktowerLightningWindow;
private:
    void EvaluateScheduledWeather();
    UPROPERTY() FEraWorldClock Clock;
    UPROPERTY() EWeatherState Weather=EWeatherState::Clear;
    bool bLightningWindowActive=false;
    bool bLightningEventBroadcast=false;
};
