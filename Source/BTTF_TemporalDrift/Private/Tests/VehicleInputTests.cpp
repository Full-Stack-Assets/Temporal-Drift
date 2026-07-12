#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "DeLoreanVehicle.h"
#include "ChaosVehicleMovementComponent.h"
#include "Engine/World.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFVehicleInputNormalizationTest,
    "BTTF.Vehicle.Input.NormalizesControlValues",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFVehicleInputNormalizationTest::RunTest(const FString& Parameters)
{
    UWorld* World = UWorld::CreateWorld(EWorldType::Game, false, TEXT("VehicleInputTestWorld"));
    UClass* VehicleClass = LoadClass<ADeLoreanVehicle>(
        nullptr, TEXT("/Game/Blueprints/BP_DeLorean.BP_DeLorean_C"));
    ADeLoreanVehicle* Vehicle = World->SpawnActor<ADeLoreanVehicle>(VehicleClass);
    TestNotNull(TEXT("Vehicle spawns"), Vehicle);
    if (!Vehicle)
    {
        return false;
    }

    Vehicle->ApplyVehicleInput(2.0f, -2.0f, 1.5f, true);
    UChaosVehicleMovementComponent* Movement =
        Vehicle->GetVehicleMovementComponent();

    TestEqual(TEXT("Throttle clamps to one"), Movement->GetThrottleInput(), 1.0f);
    TestEqual(TEXT("Steering clamps to negative one"), Movement->GetSteeringInput(), -1.0f);
    TestEqual(TEXT("Brake clamps to one"), Movement->GetBrakeInput(), 1.0f);
    TestTrue(TEXT("Handbrake is applied"), Movement->GetHandbrakeInput());
    const bool bPassed = !HasAnyErrors();
    World->DestroyWorld(false);
    return bPassed;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFVehicleResetTest,
    "BTTF.Vehicle.Input.ResetRestoresSafeTransform",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFVehicleResetTest::RunTest(const FString& Parameters)
{
    UWorld* World = UWorld::CreateWorld(EWorldType::Game, false, TEXT("VehicleResetTestWorld"));
    UClass* VehicleClass = LoadClass<ADeLoreanVehicle>(
        nullptr, TEXT("/Game/Blueprints/BP_DeLorean.BP_DeLorean_C"));
    ADeLoreanVehicle* Vehicle = World->SpawnActor<ADeLoreanVehicle>(
        VehicleClass,
        FVector(100.0f, 200.0f, 300.0f), FRotator::ZeroRotator);
    TestNotNull(TEXT("Vehicle spawns"), Vehicle);
    if (!Vehicle)
    {
        return false;
    }

    const FTransform SafeTransform(FRotator(0.0f, 90.0f, 0.0f), FVector(500.0f, 600.0f, 700.0f));
    Vehicle->SetLastSafeTransform(SafeTransform);
    Vehicle->SetActorTransform(FTransform(FRotator(130.0f, 15.0f, 80.0f), FVector(0.0f, 0.0f, -1000.0f)));
    Vehicle->ResetVehicle();

    TestTrue(TEXT("Reset location matches safe location"),
        Vehicle->GetActorLocation().Equals(SafeTransform.GetLocation(), 1.0f));
    TestTrue(TEXT("Reset rotation is upright"),
        Vehicle->GetActorRotation().Equals(SafeTransform.Rotator(), 1.0f));
    const bool bPassed = !HasAnyErrors();
    World->DestroyWorld(false);
    return bPassed;
}

#endif
