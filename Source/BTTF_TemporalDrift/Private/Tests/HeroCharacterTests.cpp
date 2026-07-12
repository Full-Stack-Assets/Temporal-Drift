#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "BTTFHeroCharacter.h"
#include "VehicleInteractionComponent.h"
#include "GameFramework/CharacterMovementComponent.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFHeroCharacterContractTest,
    "BTTF.Hero.CharacterContract",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFHeroCharacterContractTest::RunTest(const FString& Parameters)
{
    const ABTTFHeroCharacter* Hero = GetDefault<ABTTFHeroCharacter>();
    TestNotNull(TEXT("Hero has vehicle interaction"), Hero->GetVehicleInteractionComponent());
    TestNotNull(TEXT("Hero has combat component"),Hero->GetCombatComponent());
    TestNotNull(TEXT("Hero has stealth component"),Hero->GetStealthComponent());
    TestTrue(TEXT("Walk speed is playable"), Hero->GetCharacterMovement()->MaxWalkSpeed >= 350.0f);
    TestTrue(TEXT("Jump is enabled"), Hero->GetCharacterMovement()->JumpZVelocity >= 400.0f);
    TestTrue(TEXT("Interaction range is readable"),
        Hero->GetVehicleInteractionComponent()->InteractionRange >= 200.0f &&
        Hero->GetVehicleInteractionComponent()->InteractionRange <= 500.0f);
    TestTrue(TEXT("Exit clearance exceeds capsule width"),
        Hero->GetVehicleInteractionComponent()->ExitSideOffset >= 100.0f);
    return !HasAnyErrors();
}

#endif
