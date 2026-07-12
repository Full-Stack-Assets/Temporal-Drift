#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "InputAction.h"
#include "InputMappingContext.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFEnhancedInputAssetsTest,
    "BTTF.Vehicle.Input.RequiredEnhancedInputAssetsLoad",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFEnhancedInputAssetsTest::RunTest(const FString& Parameters)
{
    static const TCHAR* ActionNames[] = {
        TEXT("IA_Throttle"),
        TEXT("IA_Steering"),
        TEXT("IA_Brake"),
        TEXT("IA_Handbrake"),
        TEXT("IA_Reverse"),
        TEXT("IA_ResetVehicle"),
        TEXT("IA_TimeCircuits"),
        TEXT("IA_TimeJump"),
        TEXT("IA_CycleDestination"),
        TEXT("IA_ToggleCamera")};

    for (const TCHAR* ActionName : ActionNames)
    {
        const FString Path = FString::Printf(
            TEXT("/Game/Input/%s.%s"), ActionName, ActionName);
        TestNotNull(
            FString::Printf(TEXT("Input action loads: %s"), ActionName),
            LoadObject<UInputAction>(nullptr, *Path));
    }

    TestNotNull(
        TEXT("DeLorean input mapping context loads"),
        LoadObject<UInputMappingContext>(
            nullptr, TEXT("/Game/Input/IMC_DeLorean.IMC_DeLorean")));
    return !HasAnyErrors();
}

#endif
