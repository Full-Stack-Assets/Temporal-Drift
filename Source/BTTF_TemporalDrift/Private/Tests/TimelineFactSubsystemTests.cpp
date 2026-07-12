#if WITH_DEV_AUTOMATION_TESTS
#include "Misc/AutomationTest.h"
#include "TimelineFactSubsystem.h"
#include "Engine/GameInstance.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFTimelineFactGraphTest,"BTTF.Timeline.FactDependencyGraph",EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FBTTFTimelineFactGraphTest::RunTest(const FString& Parameters)
{
    UTimelineFactDataAsset* Data=NewObject<UTimelineFactDataAsset>();
    FTimelineFactDefinition Land; Land.FactId=TEXT("1885.LandDisputeWon");
    FTimelineFactDefinition Mall; Mall.FactId=TEXT("1955.MallSiteOwned"); Mall.Dependencies={{Land.FactId,true}};
    FTimelineFactDefinition Street; Street.FactId=TEXT("1985.StreetRenamed"); Street.Dependencies={{Mall.FactId,true}};
    FTimelineFactDefinition Skyline; Skyline.FactId=TEXT("2045.TierThreeTannenOwned"); Skyline.DefaultValue=true; Skyline.Dependencies={{Street.FactId,true}}; Skyline.ValueWhenDependenciesSatisfied=false;
    Data->Facts={Land,Mall,Street,Skyline};
    UGameInstance* GI=NewObject<UGameInstance>(); UTimelineFactSubsystem* System=NewObject<UTimelineFactSubsystem>(GI);
    TestTrue(TEXT("Definitions load"),System->LoadDefinitions(Data));
    bool bFound=false; TestTrue(TEXT("Default corrupted skyline"),System->GetFact(Skyline.FactId,bFound)); TestTrue(TEXT("Skyline fact found"),bFound);
    TestTrue(TEXT("Historical fact changes"),System->SetBaseFact(Land.FactId,true));
    TestTrue(TEXT("1955 consequence recomputed"),System->GetFact(Mall.FactId,bFound));
    TestTrue(TEXT("1985 consequence recomputed"),System->GetFact(Street.FactId,bFound));
    TestFalse(TEXT("2045 corruption prevented"),System->GetFact(Skyline.FactId,bFound));
    TestFalse(TEXT("Acyclic graph"),System->HasDependencyCycle());
    return !HasAnyErrors();
}
#endif
