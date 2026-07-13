#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "BTTFHeroCharacter.h"
#include "VehicleInteractionComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "UObject/SoftObjectPath.h"

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

#endif
