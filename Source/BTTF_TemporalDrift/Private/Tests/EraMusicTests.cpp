#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "EraMusicTypes.h"
#include "EraMusicSubsystem.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFEraMusicCatalogTest,
    "BTTF.Music.EraFilmTrackCatalog",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFEraMusicCatalogTest::RunTest(const FString& Parameters)
{
    const TArray<FEraMusicTrackInfo> Catalog = UEraMusicCatalog::GetDefaultCatalog();
    TestEqual(TEXT("All six timelines have music entries"), Catalog.Num(), 6);

    FEraMusicTrackInfo Track1985;
    TestTrue(TEXT("1985 track resolves"), UEraMusicCatalog::TryGetTrackForEra(ETimelineState::Present1985, Track1985));
    TestTrue(TEXT("1985 uses Power of Love"), Track1985.TrackTitle.ToString().Contains(TEXT("Power of Love")));
    TestTrue(TEXT("1985 artist is Huey Lewis and the News"),
        Track1985.ArtistName.ToString().Contains(TEXT("Huey Lewis")));
    TestFalse(TEXT("1985 primary path empty"), Track1985.PrimaryMusicPath.IsNull());
    TestFalse(TEXT("1985 alternate Back in Time path empty"), Track1985.AlternateMusicPath.IsNull());

    FEraMusicTrackInfo Track1955;
    TestTrue(TEXT("1955 track resolves"), UEraMusicCatalog::TryGetTrackForEra(ETimelineState::Past1955, Track1955));
    TestTrue(TEXT("1955 uses Earth Angel"), Track1955.TrackTitle.ToString().Contains(TEXT("Earth Angel")));
    TestTrue(TEXT("1955 alternate is Johnny B. Goode"),
        Track1955.AlternateMusicPath.ToString().Contains(TEXT("JohnnyBGoode")));
    TestTrue(TEXT("1955 alternate title is Johnny B. Goode"),
        Track1955.AlternateTrackTitle.ToString().Contains(TEXT("Johnny B. Goode")));

    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFEraMusicSubsystemContractTest,
    "BTTF.Music.SubsystemContracts",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFEraMusicSubsystemContractTest::RunTest(const FString& Parameters)
{
    UEraMusicSubsystem* Music = NewObject<UEraMusicSubsystem>();
    TestNotNull(TEXT("Music subsystem constructs"), Music);
    Music->SetMusicVolume(0.5f);
    Music->SetMusicDucked(true);
    TestEqual(TEXT("Duck multiplier applied"), Music->GetClass()->GetDefaultObject<UEraMusicSubsystem>()->TimeTravelDuckMultiplier, 0.25f);
    return !HasAnyErrors();
}

#endif
