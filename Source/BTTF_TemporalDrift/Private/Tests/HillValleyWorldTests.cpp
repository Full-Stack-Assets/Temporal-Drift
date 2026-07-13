#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "HillValleyWorldValidator.h"
#include "Engine/World.h"
#include "UObject/SoftObjectPath.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFHillValleyCompleteTest,
    "BTTF.World.HillValleyComplete",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFHillValleyCompleteTest::RunTest(const FString& Parameters)
{
    UWorld* World = Cast<UWorld>(FSoftObjectPath(
        TEXT("/Game/Levels/LVL_TimeTravelTest.LVL_TimeTravelTest")).TryLoad());
    TestNotNull(TEXT("Complete Hill Valley map loads"), World);
    if (!World)
    {
        return false;
    }

    const FHillValleyValidationReport Report = UHillValleyWorldValidator::ValidateWorld(World);
    for (const FString& Failure : Report.Failures)
    {
        AddError(Failure);
    }
    TestTrue(TEXT("Hill Valley complete-region contract passes"), Report.bPassed);
    return true;
}

#endif
