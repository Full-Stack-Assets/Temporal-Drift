#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "Engine/World.h"
#include "GameFramework/GameModeBase.h"
#include "Engine/GameInstance.h"
#include "UObject/SoftObjectPath.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFProjectConfigurationTest,
    "BTTF.Project.Configuration.RequiredAssetsLoad",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFProjectConfigurationTest::RunTest(const FString& Parameters)
{
    const FSoftObjectPath DefaultMapPath(
        TEXT("/Game/Levels/LVL_TimeTravelTest.LVL_TimeTravelTest"));
    const FSoftClassPath GameModePath(
        TEXT("/Script/BTTF_TemporalDrift.BTTF_GameMode"));
    const FSoftClassPath GameInstancePath(
        TEXT("/Script/BTTF_TemporalDrift.BTTF_GameInstance"));
    const FSoftClassPath VehiclePath(
        TEXT("/Game/Blueprints/BP_DeLorean.BP_DeLorean_C"));

    TestNotNull(TEXT("Default Hill Valley map loads"),
        Cast<UWorld>(DefaultMapPath.TryLoad()));
    TestNotNull(TEXT("BTTF game mode class loads"),
        GameModePath.TryLoadClass<AGameModeBase>());
    TestNotNull(TEXT("BTTF game instance class loads"),
        GameInstancePath.TryLoadClass<UGameInstance>());
    TestNotNull(TEXT("DeLorean Blueprint class loads"),
        VehiclePath.TryLoadClass<APawn>());

    return true;
}

#endif
