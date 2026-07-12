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

float UEraWeatherSubsystem::GetClocktowerLightningCountdown()const
{
    if(Clock.Era!=ETimelineState::Past1955||Clock.Year!=1955||Clock.Month!=11||Clock.Day!=12)return -1.0f;
    constexpr float StrikeSeconds=22.0f*3600.0f+4.0f*60.0f;
    return FMath::Max(0.0f,StrikeSeconds-Clock.SecondsSinceMidnight);
}

void UEraWeatherSubsystem::EvaluateScheduledWeather()
{
    const float Countdown=GetClocktowerLightningCountdown();
    const bool bStormDate=Countdown>=0.0f;
    if(bStormDate&&Countdown<=1800.0f&&Countdown>0.0f)SetWeather(EWeatherState::Thunderstorm);
    bLightningWindowActive=bStormDate&&Countdown<=2.0f;
    if(bLightningWindowActive&&!bLightningEventBroadcast){bLightningEventBroadcast=true;OnClocktowerLightningWindow.Broadcast();}
}

FName UEraWeatherSubsystem::GetSeasonId()const
{
    if(Clock.Month==12||Clock.Month<=2)return TEXT("Winter");
    if(Clock.Month<=5)return TEXT("Spring");
    if(Clock.Month<=8)return TEXT("Summer");
    return TEXT("Autumn");
}
