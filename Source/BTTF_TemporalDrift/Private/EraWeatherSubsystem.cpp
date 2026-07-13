#include "EraWeatherSubsystem.h"

void UEraWeatherSubsystem::SetWorldClock(const FEraWorldClock& NewClock)
{
    Clock=NewClock;Clock.SecondsSinceMidnight=FMath::Clamp(Clock.SecondsSinceMidnight,0.0f,86399.999f);
    bLightningEventBroadcast=false;EvaluateScheduledWeather();
}

void UEraWeatherSubsystem::AdvanceWorldTime(float RealDeltaSeconds,float GameTimeScale)
{
    if(RealDeltaSeconds<=0.0f||GameTimeScale<0.0f)return;
    Clock.SecondsSinceMidnight+=RealDeltaSeconds*GameTimeScale;
    while(Clock.SecondsSinceMidnight>=86400.0f){Clock.SecondsSinceMidnight-=86400.0f;++Clock.Day;}
    EvaluateScheduledWeather();
}

void UEraWeatherSubsystem::SetWeather(EWeatherState NewWeather)
{
    if(Weather==NewWeather)return;const EWeatherState Previous=Weather;Weather=NewWeather;OnWeatherChanged.Broadcast(Previous,Weather);
}

void UEraWeatherSubsystem::SetLightningSchedule(const FClocktowerLightningSchedule& NewSchedule)
{
    LightningSchedule=NewSchedule;bLightningEventBroadcast=false;EvaluateScheduledWeather();
}

float UEraWeatherSubsystem::GetClocktowerLightningCountdown()const
{
    const FClocktowerLightningSchedule& S=LightningSchedule;
    if(Clock.Era!=S.Era||Clock.Year!=S.Year||Clock.Month!=S.Month||Clock.Day!=S.Day)return -1.0f;
    return FMath::Max(0.0f,S.StrikeSecondsSinceMidnight-Clock.SecondsSinceMidnight);
}

void UEraWeatherSubsystem::EvaluateScheduledWeather()
{
    const float Countdown=GetClocktowerLightningCountdown();
    const bool bStormDate=Countdown>=0.0f;
    if(bStormDate&&Countdown<=LightningSchedule.StormLeadSeconds&&Countdown>0.0f)SetWeather(EWeatherState::Thunderstorm);
    bLightningWindowActive=bStormDate&&Countdown<=LightningSchedule.WindowSeconds;
    if(bLightningWindowActive&&!bLightningEventBroadcast){bLightningEventBroadcast=true;OnClocktowerLightningWindow.Broadcast();}
}

FName UEraWeatherSubsystem::GetSeasonId()const
{
    if(Clock.Month==12||Clock.Month<=2)return TEXT("Winter");
    if(Clock.Month<=5)return TEXT("Spring");
    if(Clock.Month<=8)return TEXT("Summer");
    return TEXT("Autumn");
}
