#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "KeyboardCameraComponent.h"
#include "KeyboardCameraStateComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "Components/SceneComponent.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFKeyboardCameraOrbitClampTest,
    "BTTF.Camera.Keyboard.OrbitClampsPitch",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFKeyboardCameraOrbitClampTest::RunTest(const FString& Parameters)
{
    UKeyboardCameraComponent* Camera = NewObject<UKeyboardCameraComponent>();
    Camera->MinPitch = -75.0f;
    Camera->MaxPitch = 45.0f;

    Camera->ApplyOrbitInput(0.0f, 10.0f, 1.0f);
    TestTrue(TEXT("Pitch clamps below maximum"), Camera->GetOrbitPitch() <= Camera->MaxPitch);

    Camera->ApplyOrbitInput(0.0f, -20.0f, 1.0f);
    TestTrue(TEXT("Pitch clamps above minimum"), Camera->GetOrbitPitch() >= Camera->MinPitch);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFKeyboardCameraAutoChaseDelayTest,
    "BTTF.Camera.Keyboard.AutoChaseDelay",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFKeyboardCameraAutoChaseDelayTest::RunTest(const FString& Parameters)
{
    UKeyboardCameraComponent* Camera = NewObject<UKeyboardCameraComponent>();
    Camera->AutoChaseDelay = 1.5f;
    Camera->bAutoChaseEnabled = true;
    Camera->ApplyOrbitInput(1.0f, 0.0f, 0.1f);
    TestEqual(TEXT("Manual input resets delay timer"), Camera->GetTimeSinceLastManualInput(), 0.0f);
    TestTrue(TEXT("Auto-chase remains enabled"), Camera->IsAutoChaseEnabled());
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFKeyboardCameraPresetCycleTest,
    "BTTF.Camera.Keyboard.CyclesPresets",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFKeyboardCameraPresetCycleTest::RunTest(const FString& Parameters)
{
    UKeyboardCameraComponent* Camera = NewObject<UKeyboardCameraComponent>();

    TArray<FKeyboardCameraPreset> Presets;
    FKeyboardCameraPreset A;
    A.TargetArmLength = 300.0f;
    Presets.Add(A);
    FKeyboardCameraPreset B;
    B.TargetArmLength = 150.0f;
    Presets.Add(B);

    Camera->ConfigureSpringArm(nullptr, Presets);
    TestEqual(TEXT("Starts on first preset"), Camera->GetActivePresetIndex(), 0);
    Camera->CyclePreset();
    TestEqual(TEXT("Cycles to second preset"), Camera->GetActivePresetIndex(), 1);
    Camera->CyclePreset();
    TestEqual(TEXT("Wraps to first preset"), Camera->GetActivePresetIndex(), 0);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFKeyboardCameraAutoChaseToggleTest,
    "BTTF.Camera.Keyboard.AutoChaseTogglePersists",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFKeyboardCameraAutoChaseToggleTest::RunTest(const FString& Parameters)
{
    UKeyboardCameraComponent* Camera = NewObject<UKeyboardCameraComponent>();
    TestTrue(TEXT("Auto-chase enabled by default"), Camera->IsAutoChaseEnabled());
    Camera->ToggleAutoChase();
    TestFalse(TEXT("Toggle disables auto-chase"), Camera->IsAutoChaseEnabled());
    Camera->ToggleAutoChase();
    TestTrue(TEXT("Second toggle re-enables auto-chase"), Camera->IsAutoChaseEnabled());
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFKeyboardCameraStateAliasTest,
    "BTTF.Camera.Keyboard.StateComponentAlias",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFKeyboardCameraStateAliasTest::RunTest(const FString& Parameters)
{
    UKeyboardCameraStateComponent* Camera = NewObject<UKeyboardCameraStateComponent>();
    const float InitialYaw = Camera->GetOrbitYaw();
    Camera->ReceiveManualInput(0.0f, 15.0f);
    TestTrue(TEXT("ReceiveManualInput updates orbit yaw"), !FMath::IsNearlyEqual(Camera->GetOrbitYaw(), InitialYaw));
    Camera->SetAutoChaseEnabled(false);
    TestFalse(TEXT("SetAutoChaseEnabled disables chase"), Camera->IsAutoChaseEnabled());
    return !HasAnyErrors();
}

#endif
