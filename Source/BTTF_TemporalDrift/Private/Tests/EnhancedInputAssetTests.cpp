#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "InputAction.h"
#include "InputMappingContext.h"
#include "DeLoreanVehicle.h"

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
        TEXT("IA_HoverMode"),
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

    const UClass* VehicleClass = LoadClass<ADeLoreanVehicle>(
        nullptr, TEXT("/Game/Blueprints/BP_DeLorean.BP_DeLorean_C"));
    TestNotNull(TEXT("Vehicle Blueprint class loads"), VehicleClass);
    if (VehicleClass)
    {
        const ADeLoreanVehicle* Vehicle = GetDefault<ADeLoreanVehicle>(VehicleClass);
        TestNotNull(TEXT("Reverse action is assigned on the vehicle"), Vehicle->ReverseAction);
        TestNotNull(TEXT("Hover mode action is assigned on the vehicle"), Vehicle->HoverModeAction);
    }
    return !HasAnyErrors();
}

#endif
