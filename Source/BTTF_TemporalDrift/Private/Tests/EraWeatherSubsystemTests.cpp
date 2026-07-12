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
#endif
