#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "WorldConsequenceSubsystem.h"
#include "TimelineFactSubsystem.h"
#include "Engine/GameInstance.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFWorldConsequenceSummaryTest,
    "BTTF.Timeline.WorldConsequenceSummary",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFWorldConsequenceSummaryTest::RunTest(const FString& Parameters)
{
    UGameInstance* GameInstance = NewObject<UGameInstance>();
    GameInstance->Init();

    UWorldConsequenceSubsystem* Consequences = GameInstance->GetSubsystem<UWorldConsequenceSubsystem>();
    UTimelineFactSubsystem* Facts = GameInstance->GetSubsystem<UTimelineFactSubsystem>();
    TestNotNull(TEXT("World consequence subsystem registers"), Consequences);
    TestNotNull(TEXT("Timeline fact subsystem registers"), Facts);
    if (!Consequences || !Facts)
    {
        return false;
    }

    TestTrue(TEXT("Empty summary when no facts"), Consequences->GetActiveConsequencesSummary().IsEmpty());
    TestFalse(TEXT("Plaque inactive initially"), Consequences->IsFactActive(FName(TEXT("C_PlaqueChanged"))));

    TestEqual(TEXT("Known fact label resolves"),
        Consequences->GetShortLabelForFact(FName(TEXT("C_PlaqueChanged"))).ToString(),
        FString(TEXT("Plaque altered")));
    TestTrue(TEXT("Unknown fact label empty"),
        Consequences->GetShortLabelForFact(FName(TEXT("C_Unknown"))).IsEmpty());

    TestTrue(TEXT("Plaque fact activates"), Facts->SetBaseFact(FName(TEXT("C_PlaqueChanged")), true));
    TestTrue(TEXT("Plaque tracked as active"), Consequences->IsFactActive(FName(TEXT("C_PlaqueChanged"))));
    TestTrue(TEXT("Summary includes plaque"),
        Consequences->GetActiveConsequencesSummary().ToString().Contains(TEXT("Plaque altered")));

    TestTrue(TEXT("Diner fact activates"), Facts->SetBaseFact(FName(TEXT("C_DinerRenamed")), true));
    const FString Summary = Consequences->GetActiveConsequencesSummary().ToString();
    TestTrue(TEXT("Summary prefix present"), Summary.StartsWith(TEXT("RIPPLES:")));
    TestTrue(TEXT("Summary includes diner"), Summary.Contains(TEXT("Diner renamed")));

    const TArray<FName> ActiveIds = Consequences->GetActiveFactIds();
    TestEqual(TEXT("Two active consequences"), ActiveIds.Num(), 2);

    TestTrue(TEXT("Fact deactivation clears summary entry"), Facts->SetBaseFact(FName(TEXT("C_PlaqueChanged")), false));
    TestFalse(TEXT("Plaque inactive after clear"), Consequences->IsFactActive(FName(TEXT("C_PlaqueChanged"))));
    TestFalse(TEXT("Summary no longer mentions plaque"),
        Consequences->GetActiveConsequencesSummary().ToString().Contains(TEXT("Plaque altered")));

    return !HasAnyErrors();
}

#endif
