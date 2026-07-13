#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "TimelineVariantSubsystem.h"
#include "TimelineFactSubsystem.h"
#include "TimelineFactDataAsset.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFTimelineRippleGraphTest,
    "BTTF.Timeline.CrossEraRippleGraph",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFTimelineRippleGraphTest::RunTest(const FString& Parameters)
{
    UTimelineFactDataAsset* Data = NewObject<UTimelineFactDataAsset>();

    auto AddFact = [&Data](const TCHAR* Id, bool Default = false, bool ValueWhenSatisfied = true)
    {
        FTimelineFactDefinition Def;
        Def.FactId = Id;
        Def.DefaultValue = Default;
        Def.ValueWhenDependenciesSatisfied = ValueWhenSatisfied;
        Data->Facts.Add(Def);
    };

    auto AddDep = [&Data](const TCHAR* Id, const TCHAR* DepId, bool Required = true)
    {
        for (FTimelineFactDefinition& Def : Data->Facts)
        {
            if (Def.FactId == Id)
            {
                FTimelineFactDependency Dep;
                Dep.FactId = DepId;
                Dep.RequiredValue = Required;
                Def.Dependencies.Add(Dep);
                return;
            }
        }
    };

    AddFact(TEXT("1885.LandDisputeWon"));
    AddFact(TEXT("1955.MallSiteOwned"));
    AddDep(TEXT("1955.MallSiteOwned"), TEXT("1885.LandDisputeWon"), true);
    AddFact(TEXT("1985.StreetRenamed"));
    AddDep(TEXT("1985.StreetRenamed"), TEXT("1955.MallSiteOwned"), false);
    AddFact(TEXT("2045.TierThreeTannenOwned"), true, false);
    AddDep(TEXT("2045.TierThreeTannenOwned"), TEXT("1985.StreetRenamed"), true);

    UGameInstance* GameInstance = NewObject<UGameInstance>();
    GameInstance->Init();
    UTimelineFactSubsystem* Facts = GameInstance->GetSubsystem<UTimelineFactSubsystem>();
    TestTrue(TEXT("Ripple graph loads"), Facts->LoadDefinitions(Data));

    bool bFound = false;
    TestFalse(TEXT("Street not renamed initially"), Facts->GetFact(TEXT("1985.StreetRenamed"), bFound));
    TestTrue(TEXT("2045 corruption default"), Facts->GetFact(TEXT("2045.TierThreeTannenOwned"), bFound));

    TestTrue(TEXT("1885 intervention applies"), Facts->SetBaseFact(TEXT("1885.LandDisputeWon"), true));
    TestTrue(TEXT("1955 mall site preserved"), Facts->GetFact(TEXT("1955.MallSiteOwned"), bFound));
    TestTrue(TEXT("Mall site owned after dispute win"), bFound);
    TestFalse(TEXT("1985 street stays original"), Facts->GetFact(TEXT("1985.StreetRenamed"), bFound));
    TestFalse(TEXT("2045 corruption prevented"), Facts->GetFact(TEXT("2045.TierThreeTannenOwned"), bFound));

    TestTrue(TEXT("Losing mall site renames street"), Facts->SetBaseFact(TEXT("1885.LandDisputeWon"), false));
    TestFalse(TEXT("Mall site lost"), Facts->GetFact(TEXT("1955.MallSiteOwned"), bFound));
    TestTrue(TEXT("Street renamed when mall lost"), Facts->GetFact(TEXT("1985.StreetRenamed"), bFound));
    TestTrue(TEXT("2045 corruption returns"), Facts->GetFact(TEXT("2045.TierThreeTannenOwned"), bFound));

    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFTimelineVariantSubsystemTest,
    "BTTF.Timeline.VariantVisibilityContract",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFTimelineVariantSubsystemTest::RunTest(const FString& Parameters)
{
    TestNotNull(TEXT("Variant subsystem class loads"), UTimelineVariantSubsystem::StaticClass());
    return !HasAnyErrors();
}

#endif
