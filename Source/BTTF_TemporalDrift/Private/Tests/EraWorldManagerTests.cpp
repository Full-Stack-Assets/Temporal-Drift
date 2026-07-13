#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "EraWorldManager.h"
#include "WorldPartition/DataLayer/DataLayerAsset.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFEraWorldMappingTest,
    "BTTF.World.EraLayerMapping",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFEraWorldMappingTest::RunTest(const FString& Parameters)
{
    UEraWorldManager* Manager = NewObject<UEraWorldManager>();
    const TArray<ETimelineState> RequiredEras = {
        ETimelineState::Present1985, ETimelineState::Past1955,
        ETimelineState::Alternate1985, ETimelineState::Future2015,
        ETimelineState::DeepFuture2045,
        ETimelineState::WildWest1885};
    for (ETimelineState Era : RequiredEras)
    {
        const TSoftObjectPtr<UDataLayerAsset> Layer = Manager->GetDataLayerForEra(Era);
        TestFalse(FString::Printf(TEXT("Era %s has a layer path"), *UEnum::GetValueAsString(Era)), Layer.IsNull());
        TestNotNull(FString::Printf(TEXT("Era %s layer resolves"), *UEnum::GetValueAsString(Era)), Layer.LoadSynchronous());
    }
    TestEqual(TEXT("Default era is 1985"), Manager->GetActiveEra(), ETimelineState::Present1985);
    TestTrue(TEXT("Default era begins ready"), Manager->IsEraReady());
    TestFalse(TEXT("A worldless request fails safely"), Manager->RequestEra(ETimelineState::Past1955));
    TestTrue(TEXT("Failed request leaves current era ready"), Manager->IsEraReady());
    TestEqual(TEXT("Failed request preserves active era"), Manager->GetActiveEra(), ETimelineState::Present1985);
    return !HasAnyErrors();
}

#endif
