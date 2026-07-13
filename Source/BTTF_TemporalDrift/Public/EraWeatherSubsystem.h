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

// Data-driven definition of a scheduled clocktower lightning strike. Defaults describe the
// canonical Back to the Future strike (Nov 12 1955, 22:04) so existing content keeps working,
// but any world clock date/time can be targeted without touching code.
USTRUCT(BlueprintType)
struct FClocktowerLightningSchedule
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere,BlueprintReadWrite) ETimelineState Era=ETimelineState::Past1955;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 Year=1955;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 Month=11;
    UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 Day=12;
    // 22:04 local — the authoritative strike time.
    UPROPERTY(EditAnywhere,BlueprintReadWrite) float StrikeSecondsSinceMidnight=22.0f*3600.0f+4.0f*60.0f;
    // The storm rolls in this many seconds before the strike.
    UPROPERTY(EditAnywhere,BlueprintReadWrite) float StormLeadSeconds=1800.0f;
    // The strike window reports active while the countdown is within this many seconds.
    UPROPERTY(EditAnywhere,BlueprintReadWrite) float WindowSeconds=2.0f;
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
    UFUNCTION(BlueprintCallable) void SetLightningSchedule(const FClocktowerLightningSchedule& NewSchedule);
    UFUNCTION(BlueprintPure) FClocktowerLightningSchedule GetLightningSchedule()const{return LightningSchedule;}
    UFUNCTION(BlueprintPure) FName GetSeasonId()const;
    UPROPERTY(BlueprintAssignable) FOnWeatherChanged OnWeatherChanged;
    UPROPERTY(BlueprintAssignable) FOnClocktowerLightningWindow OnClocktowerLightningWindow;
private:
    void EvaluateScheduledWeather();
    UPROPERTY() FEraWorldClock Clock;
    UPROPERTY() FClocktowerLightningSchedule LightningSchedule;
    UPROPERTY() EWeatherState Weather=EWeatherState::Clear;
    bool bLightningWindowActive=false;
    bool bLightningEventBroadcast=false;
};
