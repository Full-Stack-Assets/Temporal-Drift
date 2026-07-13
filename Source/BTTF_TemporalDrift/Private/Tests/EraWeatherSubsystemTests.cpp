#if WITH_DEV_AUTOMATION_TESTS
#include "Misc/AutomationTest.h"
#include "EraWeatherSubsystem.h"
#include "Engine/GameInstance.h"
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFClocktowerWeatherTest,"BTTF.World.ClocktowerWeather",EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FBTTFClocktowerWeatherTest::RunTest(const FString& Parameters)
{
    UGameInstance* GI=NewObject<UGameInstance>();UEraWeatherSubsystem* System=NewObject<UEraWeatherSubsystem>(GI);
    FEraWorldClock Clock;Clock.Era=ETimelineState::Past1955;Clock.Year=1955;Clock.Month=11;Clock.Day=12;Clock.SecondsSinceMidnight=21*3600+59*60;
    System->SetWorldClock(Clock);
    TestEqual(TEXT("Five-minute countdown"),System->GetClocktowerLightningCountdown(),300.0f);
    TestEqual(TEXT("Scheduled storm active"),System->GetWeather(),EWeatherState::Thunderstorm);
    TestEqual(TEXT("November is autumn"),System->GetSeasonId(),FName(TEXT("Autumn")));
    System->AdvanceWorldTime(298.5f);
    TestTrue(TEXT("Lightning window activates"),System->IsClocktowerLightningWindowActive());
    System->AdvanceWorldTime(5.0f);
    TestEqual(TEXT("Countdown never negative"),System->GetClocktowerLightningCountdown(),0.0f);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFLightningScheduleDataDrivenTest,"BTTF.World.LightningScheduleDataDriven",EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FBTTFLightningScheduleDataDrivenTest::RunTest(const FString& Parameters)
{
    UGameInstance* GI=NewObject<UGameInstance>();UEraWeatherSubsystem* System=NewObject<UEraWeatherSubsystem>(GI);
    // Retarget the strike to a non-1955 date/time to prove the window follows the schedule, not a baked-in date.
    FClocktowerLightningSchedule Schedule;Schedule.Era=ETimelineState::Future2015;Schedule.Year=2015;Schedule.Month=10;Schedule.Day=21;
    Schedule.StrikeSecondsSinceMidnight=20.0f*3600.0f;Schedule.StormLeadSeconds=600.0f;Schedule.WindowSeconds=2.0f;
    System->SetLightningSchedule(Schedule);
    // The canonical 1955 date must no longer schedule lightning now that the schedule moved.
    FEraWorldClock Old;Old.Era=ETimelineState::Past1955;Old.Year=1955;Old.Month=11;Old.Day=12;Old.SecondsSinceMidnight=22*3600+3*60;
    System->SetWorldClock(Old);
    TestEqual(TEXT("1955 no longer schedules lightning"),System->GetClocktowerLightningCountdown(),-1.0f);
    // The scheduled 2015 date/time drives the countdown and the storm lead-in.
    FEraWorldClock Now;Now.Era=ETimelineState::Future2015;Now.Year=2015;Now.Month=10;Now.Day=21;Now.SecondsSinceMidnight=20*3600-300;
    System->SetWorldClock(Now);
    TestEqual(TEXT("Five-minute countdown to scheduled strike"),System->GetClocktowerLightningCountdown(),300.0f);
    TestEqual(TEXT("Scheduled storm active within lead window"),System->GetWeather(),EWeatherState::Thunderstorm);
    System->AdvanceWorldTime(300.0f);
    TestTrue(TEXT("Lightning window activates at scheduled strike"),System->IsClocktowerLightningWindowActive());
    return !HasAnyErrors();
}
#endif
