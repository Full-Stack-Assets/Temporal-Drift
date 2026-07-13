#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "BTTFHeroCharacter.h"
#include "BTTF_PlayerController.h"
#include "DeLoreanVehicle.h"
#include "VehicleInteractionComponent.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/InputSettings.h"
#include "InputCoreTypes.h"
#include "UObject/SoftObjectPath.h"
#include "Engine/World.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFHeroCharacterContractTest,
    "BTTF.Hero.CharacterContract",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFHeroCharacterContractTest::RunTest(const FString& Parameters)
{
    const ABTTFHeroCharacter* Hero = GetDefault<ABTTFHeroCharacter>();
    TestNotNull(TEXT("Hero has vehicle interaction"), Hero->GetVehicleInteractionComponent());
    TestNotNull(TEXT("Hero has combat component"),Hero->GetCombatComponent());
    TestNotNull(TEXT("Hero has stealth component"),Hero->GetStealthComponent());
    TestNotNull(TEXT("Hero has visible skeletal presentation"),Hero->GetMesh()->GetSkeletalMeshAsset());
    TestTrue(TEXT("Walk speed is playable"), Hero->GetCharacterMovement()->MaxWalkSpeed >= 350.0f);
    TestTrue(TEXT("Jump is enabled"), Hero->GetCharacterMovement()->JumpZVelocity >= 400.0f);
    TestTrue(TEXT("Interaction range is readable"),
        Hero->GetVehicleInteractionComponent()->InteractionRange >= 200.0f &&
        Hero->GetVehicleInteractionComponent()->InteractionRange <= 500.0f);
    TestTrue(TEXT("Exit clearance exceeds capsule width"),
        Hero->GetVehicleInteractionComponent()->ExitSideOffset >= 100.0f);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFHeroMovementContractTest,
    "BTTF.Hero.MovementContract",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFHeroMovementContractTest::RunTest(const FString& Parameters)
{
    const ABTTFHeroCharacter* Hero = GetDefault<ABTTFHeroCharacter>();
    TestTrue(TEXT("Sprint speed exceeds walk speed"), Hero->GetSprintSpeed() > Hero->GetWalkSpeed());
    TestTrue(TEXT("Crouch speed remains controllable"), Hero->GetCrouchSpeed() > 0.0f);
    TestTrue(TEXT("Hero exposes a safe recovery transform"), Hero->HasSafeTransform());
    TestTrue(TEXT("Hero input asset contract exists"),
        FSoftObjectPath(TEXT("/Game/Input/IMC_Hero.IMC_Hero")).TryLoad() != nullptr);
    return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFHeroArrowKeyMovementConfigTest,
    "BTTF.Hero.ArrowKeyMovementConfig",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFHeroArrowKeyMovementConfigTest::RunTest(const FString& Parameters)
{
    const UInputSettings* InputSettings = GetDefault<UInputSettings>();
    TestNotNull(TEXT("Input settings load"), InputSettings);
    if (!InputSettings)
    {
        return false;
    }

    TArray<FInputAxisKeyMapping> ForwardMappings;
    InputSettings->GetAxisMappingByName(TEXT("MoveForward"), ForwardMappings);

    TArray<FInputAxisKeyMapping> RightMappings;
    InputSettings->GetAxisMappingByName(TEXT("MoveRight"), RightMappings);

    auto HasMapping = [](const TArray<FInputAxisKeyMapping>& Mappings, const FKey& Key, float Scale)
    {
        return Mappings.ContainsByPredicate([&](const FInputAxisKeyMapping& Mapping)
        {
            return Mapping.Key == Key && FMath::IsNearlyEqual(Mapping.Scale, Scale);
        });
    };

    TestTrue(TEXT("Up Arrow moves hero forward"), HasMapping(ForwardMappings, EKeys::Up, 1.0f));
    TestTrue(TEXT("Down Arrow moves hero backward"), HasMapping(ForwardMappings, EKeys::Down, -1.0f));
    TestTrue(TEXT("Right Arrow moves hero right"), HasMapping(RightMappings, EKeys::Right, 1.0f));
    TestTrue(TEXT("Left Arrow moves hero left"), HasMapping(RightMappings, EKeys::Left, -1.0f));
    TestFalse(TEXT("W is not hero movement"), HasMapping(ForwardMappings, EKeys::W, 1.0f));
    TestFalse(TEXT("S is not hero movement"), HasMapping(ForwardMappings, EKeys::S, -1.0f));
    TestFalse(TEXT("D is not hero movement"), HasMapping(RightMappings, EKeys::D, 1.0f));
    TestFalse(TEXT("A is not hero movement"), HasMapping(RightMappings, EKeys::A, -1.0f));

    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFHeroVehicleHandoffTest,
    "BTTF.Hero.VehicleHandoff",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFHeroVehicleHandoffTest::RunTest(const FString& Parameters)
{
    UWorld* World = UWorld::CreateWorld(EWorldType::Game, false, TEXT("HeroHandoffWorld"));
    UClass* VehicleClass = LoadClass<ADeLoreanVehicle>(
        nullptr, TEXT("/Game/Blueprints/BP_DeLorean.BP_DeLorean_C"));
    ADeLoreanVehicle* Vehicle = World->SpawnActor<ADeLoreanVehicle>(VehicleClass, FVector(0, 0, 200), FRotator::ZeroRotator);
    ABTTFHeroCharacter* Hero = World->SpawnActor<ABTTFHeroCharacter>(
        ABTTFHeroCharacter::StaticClass(), FVector(300, 0, 200), FRotator::ZeroRotator);
    APlayerController* Controller = World->SpawnActor<APlayerController>();
    Controller->Possess(Hero);
    TestNotNull(TEXT("Vehicle spawns"), Vehicle);
    TestNotNull(TEXT("Hero spawns"), Hero);
    if (!Vehicle || !Hero)
    {
        World->DestroyWorld(false);
        return false;
    }

    UVehicleInteractionComponent* Interaction = Hero->GetVehicleInteractionComponent();
    TestTrue(TEXT("Hero can enter vehicle"), Interaction->EnterVehicle(Vehicle));
    TestTrue(TEXT("Controller possesses vehicle"), Controller->GetPawn() == Vehicle);
    TestTrue(TEXT("Hero hidden while in vehicle"), Hero->IsHidden());
    TestTrue(TEXT("Hero can exit on clear side"), Interaction->ExitVehicle(Vehicle));
    TestFalse(TEXT("Hero visible after exit"), Hero->IsHidden());
    TestTrue(TEXT("Controller repossesses hero"), Controller->GetPawn() == Hero);

    World->DestroyWorld(false);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFHeroVehicleToggleIsControllerBoundOnlyTest,
    "BTTF.Hero.VehicleToggleIsControllerBoundOnly",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFHeroVehicleToggleIsControllerBoundOnlyTest::RunTest(const FString& Parameters)
{
    const ABTTF_PlayerController* Controller = GetDefault<ABTTF_PlayerController>();
    TestFalse(TEXT("G handoff is not also polled in PlayerTick"),
        Controller->ShouldPollVehicleToggleInTick());
    return !HasAnyErrors();
}

#endif
