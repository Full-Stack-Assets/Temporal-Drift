#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "PopulationSpawnSubsystem.h"
#include "HillValleyAmbientPedestrian.h"
#include "EraPopulationManager.h"
#include "Engine/World.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFPopulationSpawnContractTest,
    "BTTF.Population.SpawnSubsystemContract",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFPopulationSpawnContractTest::RunTest(const FString& Parameters)
{
    UWorld* World = UWorld::CreateWorld(EWorldType::Game, false);
    TestNotNull(TEXT("Test world creates"), World);

    UPopulationSpawnSubsystem* SpawnSystem = NewObject<UPopulationSpawnSubsystem>(World);
    TestNotNull(TEXT("Population spawn subsystem constructs"), SpawnSystem);

    UEraPopulationManager* Population = NewObject<UEraPopulationManager>(World);
    TestNotNull(TEXT("Population manager constructs"), Population);
    Population->SetActiveEra(ETimelineState::Present1985);
    TestEqual(TEXT("1985 pedestrian budget"), Population->GetActiveProfile().MaxPedestrians, 46);

    AHillValleyAmbientPedestrian* Pedestrian = World->SpawnActor<AHillValleyAmbientPedestrian>();
    TestNotNull(TEXT("Ambient pedestrian spawns"), Pedestrian);
    const TArray<FVector> Route = {
        FVector(0.0f, 0.0f, 100.0f),
        FVector(500.0f, 0.0f, 100.0f),
        FVector(1000.0f, 0.0f, 100.0f),
    };
    Pedestrian->InitializeWander(Route, 200.0f);
    Pedestrian->SetCitizenLabel(FText::FromString(TEXT("Test Citizen")));
    TestEqual(TEXT("Pedestrian starts on route"), Pedestrian->GetActorLocation(), Route[0]);

    World->DestroyWorld(false);
    return !HasAnyErrors();
}

#endif
