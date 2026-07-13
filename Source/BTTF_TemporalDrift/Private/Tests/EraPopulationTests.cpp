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

// Covers the PopulationSpawnSubsystem reservation-wipe fix at the manager-contract level:
// era activation must precede named-citizen reservations. When it does, a reservation made for
// the active era survives and duplicate reservations for the same id are rejected. When a
// reservation is (incorrectly) made before activation, SetActiveEra wipes it -- which is exactly
// the ordering hazard the subsystem fix removes.
IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFNamedCitizenReservationOrderTest,"BTTF.Population.NamedCitizenReservationOrder",EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FBTTFNamedCitizenReservationOrderTest::RunTest(const FString& Parameters)
{
    UWorld* World=UWorld::CreateWorld(EWorldType::None,false);UEraPopulationManager* Manager=NewObject<UEraPopulationManager>(World);

    // Corrected ordering: activate the era first, then reserve. The reservation must persist.
    Manager->SetActiveEra(ETimelineState::Past1955);
    TestTrue(TEXT("Named citizen reserved after era activation"),Manager->ReserveNamedCitizen(TEXT("McFly.George"),FVector::ZeroVector));
    TestTrue(TEXT("Reservation survives era activation"),Manager->IsNamedCitizenReserved(TEXT("McFly.George")));
    TestFalse(TEXT("Duplicate reservation for same id rejected"),Manager->ReserveNamedCitizen(TEXT("McFly.George"),FVector::ZeroVector));

    // Contract that motivates the fix: activating an era clears reservations, so a reservation
    // made BEFORE activation is wiped. The subsystem now always calls SetActiveEra first.
    Manager->SetActiveEra(ETimelineState::Past1955);
    TestFalse(TEXT("Reservation made before activation is wiped"),Manager->IsNamedCitizenReserved(TEXT("McFly.George")));

    World->DestroyWorld(false);return !HasAnyErrors();
}
#endif
