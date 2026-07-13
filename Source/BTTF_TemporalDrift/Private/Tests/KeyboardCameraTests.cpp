#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "KeyboardCameraStateComponent.h"
#include "BTTFHeroCharacter.h"
#include "DeLoreanVehicle.h"

namespace
{
    UKeyboardCameraStateComponent* MakeCameraState()
    {
        return NewObject<UKeyboardCameraStateComponent>();
    }
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFKeyboardCameraPawnOwnershipTest,
    "BTTF.Camera.PawnOwnership",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFKeyboardCameraPawnOwnershipTest::RunTest(const FString& Parameters)
{
    ADeLoreanVehicle* Vehicle = NewObject<ADeLoreanVehicle>();
    TestNotNull(TEXT("Vehicle owns shared keyboard camera component"),
        Vehicle->FindComponentByClass<UKeyboardCameraStateComponent>());

    ABTTFHeroCharacter* Hero = NewObject<ABTTFHeroCharacter>();
    TestNotNull(TEXT("Hero owns shared keyboard camera component"),
        Hero->FindComponentByClass<UKeyboardCameraStateComponent>());

    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFKeyboardCameraYawPitchTest,
    "BTTF.Camera.YawPitchInput",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFKeyboardCameraYawPitchTest::RunTest(const FString& Parameters)
{
    UKeyboardCameraStateComponent* Camera = MakeCameraState();
    Camera->YawRateDegreesPerSecond = 90.0f;
    Camera->PitchRateDegreesPerSecond = 70.0f;

    // Frame-rate independence: rate * dt.
    Camera->ApplyYawInput(1.0f, 0.5f);
    TestEqual(TEXT("Half second of full yaw input is 45 degrees"), Camera->GetOrbitYaw(), 45.0f);

    Camera->ApplyPitchInput(-1.0f, 0.5f);
    TestEqual(TEXT("Half second of full down pitch is -35 degrees"), Camera->GetOrbitPitch(), -35.0f);

    // Zero input does not move or reset the inactivity clock.
    Camera->AdvanceRecenter(0.1f);
    const float Before = Camera->GetSecondsSinceManualInput();
    Camera->ApplyYawInput(0.0f, 0.5f);
    TestEqual(TEXT("Zero yaw input leaves inactivity clock untouched"),
        Camera->GetSecondsSinceManualInput(), Before);

    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFKeyboardCameraPitchClampTest,
    "BTTF.Camera.PitchClamps",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFKeyboardCameraPitchClampTest::RunTest(const FString& Parameters)
{
    UKeyboardCameraStateComponent* Camera = MakeCameraState();
    Camera->MinPitchDegrees = -75.0f;
    Camera->MaxPitchDegrees = 30.0f;

    Camera->ApplyPitchInput(-1.0f, 100.0f);
    TestEqual(TEXT("Pitch clamps to minimum"), Camera->GetOrbitPitch(), -75.0f);

    Camera->ApplyPitchInput(1.0f, 100.0f);
    TestEqual(TEXT("Pitch clamps to maximum"), Camera->GetOrbitPitch(), 30.0f);

    Camera->MaxYawDegrees = 180.0f;
    Camera->ApplyYawInput(1.0f, 100.0f);
    TestEqual(TEXT("Yaw clamps to maximum"), Camera->GetOrbitYaw(), 180.0f);

    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFKeyboardCameraRecenterDelayTest,
    "BTTF.Camera.RecenterDelayIsExact",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFKeyboardCameraRecenterDelayTest::RunTest(const FString& Parameters)
{
    UKeyboardCameraStateComponent* Camera = MakeCameraState();
    Camera->RecenterDelaySeconds = 1.5f;
    Camera->SetAutoChaseEnabled(true);

    Camera->ApplyYawInput(1.0f, 1.0f);
    const float YawAfterInput = Camera->GetOrbitYaw();
    TestTrue(TEXT("Yaw is off-center after manual input"), YawAfterInput > 1.0f);

    // Just under the 1.5s delay: no recentering yet.
    Camera->AdvanceRecenter(1.4f);
    TestFalse(TEXT("Not recentering before 1.5s"), Camera->IsRecentering());
    TestEqual(TEXT("Yaw unchanged before delay"), Camera->GetOrbitYaw(), YawAfterInput);

    // Cross the threshold: recentering becomes active and yaw shrinks.
    Camera->AdvanceRecenter(0.2f);
    TestTrue(TEXT("Recentering after 1.5s"), Camera->IsRecentering());
    TestTrue(TEXT("Yaw shrinks toward center"), Camera->GetOrbitYaw() < YawAfterInput);

    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFKeyboardCameraSmoothRecenterTest,
    "BTTF.Camera.SmoothRecenter",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFKeyboardCameraSmoothRecenterTest::RunTest(const FString& Parameters)
{
    UKeyboardCameraStateComponent* Camera = MakeCameraState();
    Camera->RecenterDelaySeconds = 1.5f;
    Camera->RecenterInterpSpeed = 4.0f;
    Camera->SetAutoChaseEnabled(true);

    Camera->ApplyYawInput(1.0f, 1.0f);
    Camera->ApplyPitchInput(1.0f, 0.3f);
    Camera->AdvanceRecenter(1.5f); // reach the threshold

    float PreviousYaw = FMath::Abs(Camera->GetOrbitYaw());
    bool bMonotonic = true;
    for (int32 Step = 0; Step < 200; ++Step)
    {
        Camera->AdvanceRecenter(1.0f / 60.0f);
        const float CurrentYaw = FMath::Abs(Camera->GetOrbitYaw());
        if (CurrentYaw > PreviousYaw + 0.001f)
        {
            bMonotonic = false;
            break;
        }
        PreviousYaw = CurrentYaw;
    }
    TestTrue(TEXT("Recenter is monotonic toward center"), bMonotonic);
    TestTrue(TEXT("Yaw settles at center"), FMath::IsNearlyZero(Camera->GetOrbitYaw(), 0.05f));
    TestTrue(TEXT("Pitch settles at center"), FMath::IsNearlyZero(Camera->GetOrbitPitch(), 0.05f));

    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFKeyboardCameraAutoChaseToggleTest,
    "BTTF.Camera.AutoChaseTogglePersists",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFKeyboardCameraAutoChaseToggleTest::RunTest(const FString& Parameters)
{
    UKeyboardCameraStateComponent* Camera = MakeCameraState();
    Camera->RecenterDelaySeconds = 1.5f;

    // Disable auto-chase (V): orbit must persist indefinitely.
    Camera->SetAutoChaseEnabled(false);
    Camera->ApplyYawInput(1.0f, 1.0f);
    const float HeldYaw = Camera->GetOrbitYaw();
    Camera->AdvanceRecenter(100.0f);
    TestFalse(TEXT("Disabled auto-chase never recenters"), Camera->IsRecentering());
    TestEqual(TEXT("Orbit persists while auto-chase is off"), Camera->GetOrbitYaw(), HeldYaw);

    // Re-enable (V again): now it recenters after the delay.
    Camera->ToggleAutoChase();
    TestTrue(TEXT("Auto-chase re-enabled"), Camera->IsAutoChaseEnabled());
    Camera->AdvanceRecenter(100.0f);
    TestTrue(TEXT("Orbit recenters once auto-chase is back on"),
        FMath::IsNearlyZero(Camera->GetOrbitYaw(), 0.05f));

    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFKeyboardCameraPresetCycleTest,
    "BTTF.Camera.PresetCycleWraps",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFKeyboardCameraPresetCycleTest::RunTest(const FString& Parameters)
{
    UKeyboardCameraStateComponent* Camera = MakeCameraState();

    TArray<FKeyboardCameraPreset> Presets;
    for (int32 Index = 0; Index < 4; ++Index)
    {
        FKeyboardCameraPreset Preset;
        Preset.PresetName = *FString::Printf(TEXT("Preset%d"), Index);
        Preset.ArmRotation = FRotator(-10.0f * Index, 0.0f, 0.0f);
        Presets.Add(Preset);
    }
    Camera->SetPresets(Presets);

    TestEqual(TEXT("Starts on preset 0"), Camera->GetActivePresetIndex(), 0);
    TestEqual(TEXT("Cycle to 1"), Camera->CyclePreset(), 1);
    TestEqual(TEXT("Cycle to 2"), Camera->CyclePreset(), 2);
    TestEqual(TEXT("Cycle to 3"), Camera->CyclePreset(), 3);
    TestEqual(TEXT("Cycle wraps to 0"), Camera->CyclePreset(), 0);

    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFKeyboardCameraRollIsolationTest,
    "BTTF.Camera.HoverRollIsolation",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFKeyboardCameraRollIsolationTest::RunTest(const FString& Parameters)
{
    UKeyboardCameraStateComponent* Camera = MakeCameraState();

    // A preset that itself carries roll must never leak roll into the arm.
    TArray<FKeyboardCameraPreset> Presets;
    FKeyboardCameraPreset Preset;
    Preset.ArmRotation = FRotator(-7.0f, 20.0f, 45.0f);
    Presets.Add(Preset);
    Camera->SetPresets(Presets);

    Camera->ApplyYawInput(1.0f, 0.5f);
    Camera->ApplyPitchInput(1.0f, 0.2f);

    const FRotator Desired = Camera->GetDesiredArmRotation();
    TestEqual(TEXT("Spring arm roll is always zero"), Desired.Roll, 0.0);
    TestTrue(TEXT("Yaw combines preset and orbit"), Desired.Yaw > 20.0f);

    return !HasAnyErrors();
}

#endif
