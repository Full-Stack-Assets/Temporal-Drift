#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "DeLoreanVehicle.h"
#include "ChaosWheeledVehicleMovementComponent.h"
#include "Components/SkeletalMeshComponent.h"
#include "Engine/SkeletalMesh.h"
#include "Engine/World.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FDeLoreanWheelBonesExistTest,
    "BTTF.Vehicle.DeLorean.WheelBonesExist",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FDeLoreanWheelBonesExistTest::RunTest(const FString& Parameters)
{
    const ADeLoreanVehicle* Vehicle = GetDefault<ADeLoreanVehicle>();
    const UChaosWheeledVehicleMovementComponent* Movement =
        Cast<UChaosWheeledVehicleMovementComponent>(Vehicle->GetVehicleMovementComponent());
    TestNotNull(TEXT("DeLorean has a Chaos wheeled movement component"), Movement);

    USkeletalMesh* SportsCarMesh = LoadObject<USkeletalMesh>(
        nullptr,
        TEXT("/Game/Vehicles/SportsCar/SKM_SportsCar.SKM_SportsCar"));
    TestNotNull(TEXT("Sports car skeletal mesh loads"), SportsCarMesh);

    if (!Movement || !SportsCarMesh)
    {
        return false;
    }

    TestEqual(TEXT("DeLorean has four wheel setups"), Movement->WheelSetups.Num(), 4);
    const FReferenceSkeleton& Skeleton = SportsCarMesh->GetRefSkeleton();
    for (const FChaosWheelSetup& WheelSetup : Movement->WheelSetups)
    {
        TestTrue(
            FString::Printf(TEXT("Wheel bone exists: %s"), *WheelSetup.BoneName.ToString()),
            Skeleton.FindBoneIndex(WheelSetup.BoneName) != INDEX_NONE);
    }

    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FDeLoreanMeshSimulatesPhysicsTest,
    "BTTF.Vehicle.DeLorean.MeshSimulatesPhysics",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FDeLoreanMeshSimulatesPhysicsTest::RunTest(const FString& Parameters)
{
    const UClass* BlueprintClass = LoadClass<ADeLoreanVehicle>(
        nullptr,
        TEXT("/Game/Blueprints/BP_DeLorean.BP_DeLorean_C"));
    TestNotNull(TEXT("DeLorean Blueprint class loads"), BlueprintClass);

    if (!BlueprintClass)
    {
        return false;
    }

    UWorld* TestWorld = UWorld::CreateWorld(EWorldType::Game, false, TEXT("DeLoreanPhysicsTestWorld"));
    TestNotNull(TEXT("Physics test world is created"), TestWorld);
    if (!TestWorld)
    {
        return false;
    }

    FActorSpawnParameters SpawnParameters;
    SpawnParameters.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
    ADeLoreanVehicle* Vehicle = TestWorld->SpawnActor<ADeLoreanVehicle>(
        const_cast<UClass*>(BlueprintClass),
        FVector(0.0f, 0.0f, 200.0f),
        FRotator::ZeroRotator,
        SpawnParameters);
    TestNotNull(TEXT("DeLorean Blueprint spawns"), Vehicle);
    if (!Vehicle)
    {
        TestWorld->DestroyWorld(false);
        return false;
    }

    Vehicle->DispatchBeginPlay();
    TestTrue(
        TEXT("DeLorean enables physics simulation when play begins"),
        Vehicle->GetMesh()->BodyInstance.bSimulatePhysics);

    const bool bPassed = !HasAnyErrors();
    TestWorld->DestroyWorld(false);
    return bPassed;
}

#endif
