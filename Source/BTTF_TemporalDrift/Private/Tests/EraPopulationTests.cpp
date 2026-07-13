#if WITH_DEV_AUTOMATION_TESTS
#include "Misc/AutomationTest.h"
#include "EraPopulationManager.h"
#include "Engine/World.h"
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFEraPopulationBudgetTest,"BTTF.Population.EraBudgets",EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FBTTFEraPopulationBudgetTest::RunTest(const FString& Parameters)
{
    UWorld* World=UWorld::CreateWorld(EWorldType::None,false);UEraPopulationManager* Manager=NewObject<UEraPopulationManager>(World);
    Manager->SetActiveEra(ETimelineState::WildWest1885);
    TestTrue(TEXT("Horse allowed in 1885"),Manager->ReserveTraffic(EEraTrafficType::Horse,FVector::ZeroVector));
    TestFalse(TEXT("Sedan rejected in 1885"),Manager->ReserveTraffic(EEraTrafficType::Sedan,FVector::ZeroVector));
    TestTrue(TEXT("Named citizen reserved"),Manager->ReserveNamedCitizen(TEXT("Tannen.Buford"),FVector::ZeroVector));
    TestFalse(TEXT("Duplicate named citizen rejected"),Manager->ReserveNamedCitizen(TEXT("Tannen.Buford"),FVector::ZeroVector));
    FPopulationExclusionZone Zone;Zone.Center=FVector(1000,0,0);Zone.Radius=300;Manager->SetMissionExclusionZones({Zone});
    TestFalse(TEXT("Mission zone blocks spawn"),Manager->ReserveAmbientPedestrian(FVector(1100,0,0)));
    TestTrue(TEXT("Outside zone allows spawn"),Manager->ReserveAmbientPedestrian(FVector(2000,0,0)));
    World->DestroyWorld(false);return !HasAnyErrors();
}
#endif
