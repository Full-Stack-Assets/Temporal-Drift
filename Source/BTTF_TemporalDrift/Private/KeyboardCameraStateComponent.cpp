// KeyboardCameraStateComponent.cpp
#include "KeyboardCameraStateComponent.h"
#include "GameFramework/SpringArmComponent.h"

UKeyboardCameraStateComponent::UKeyboardCameraStateComponent()
{
    PrimaryComponentTick.bCanEverTick = true;
}

void UKeyboardCameraStateComponent::ApplyYawInput(float AxisValue, float DeltaSeconds)
{
    if (FMath::IsNearlyZero(AxisValue) || DeltaSeconds <= 0.0f)
    {
        return;
    }
    OrbitYaw = FMath::Clamp(
        OrbitYaw + AxisValue * YawRateDegreesPerSecond * DeltaSeconds,
        -MaxYawDegrees, MaxYawDegrees);
    RegisterManualInput();
}

void UKeyboardCameraStateComponent::ApplyPitchInput(float AxisValue, float DeltaSeconds)
{
    if (FMath::IsNearlyZero(AxisValue) || DeltaSeconds <= 0.0f)
    {
        return;
    }
    OrbitPitch = FMath::Clamp(
        OrbitPitch + AxisValue * PitchRateDegreesPerSecond * DeltaSeconds,
        MinPitchDegrees, MaxPitchDegrees);
    RegisterManualInput();
}

void UKeyboardCameraStateComponent::RegisterManualInput()
{
    // Any manual orbit input suspends auto-chase recentering.
    SecondsSinceManualInput = 0.0f;
}

void UKeyboardCameraStateComponent::ToggleAutoChase()
{
    SetAutoChaseEnabled(!bAutoChaseEnabled);
}

void UKeyboardCameraStateComponent::SetAutoChaseEnabled(bool bEnabled)
{
    bAutoChaseEnabled = bEnabled;
    if (bEnabled)
    {
        // Restart the inactivity clock so a re-enable does not instantly snap.
        SecondsSinceManualInput = 0.0f;
    }
}

bool UKeyboardCameraStateComponent::IsRecentering() const
{
    if (!bAutoChaseEnabled || SecondsSinceManualInput < RecenterDelaySeconds)
    {
        return false;
    }
    return !FMath::IsNearlyZero(OrbitYaw, 0.01f) || !FMath::IsNearlyZero(OrbitPitch, 0.01f);
}

void UKeyboardCameraStateComponent::AdvanceRecenter(float DeltaSeconds)
{
    if (DeltaSeconds <= 0.0f)
    {
        return;
    }

    SecondsSinceManualInput += DeltaSeconds;

    if (!bAutoChaseEnabled || SecondsSinceManualInput < RecenterDelaySeconds)
    {
        return;
    }

    OrbitYaw = FMath::FInterpTo(OrbitYaw, 0.0f, DeltaSeconds, RecenterInterpSpeed);
    OrbitPitch = FMath::FInterpTo(OrbitPitch, 0.0f, DeltaSeconds, RecenterInterpSpeed);

    if (FMath::IsNearlyZero(OrbitYaw, 0.01f))
    {
        OrbitYaw = 0.0f;
    }
    if (FMath::IsNearlyZero(OrbitPitch, 0.01f))
    {
        OrbitPitch = 0.0f;
    }
}

int32 UKeyboardCameraStateComponent::CyclePreset()
{
    const int32 Count = Presets.Num();
    if (Count <= 0)
    {
        ActivePresetIndex = 0;
        return ActivePresetIndex;
    }
    ActivePresetIndex = (ActivePresetIndex + 1) % Count;
    return ActivePresetIndex;
}

void UKeyboardCameraStateComponent::SetActivePresetIndex(int32 Index)
{
    if (Presets.Num() <= 0)
    {
        ActivePresetIndex = 0;
        return;
    }
    ActivePresetIndex = ((Index % Presets.Num()) + Presets.Num()) % Presets.Num();
}

void UKeyboardCameraStateComponent::SetPresets(const TArray<FKeyboardCameraPreset>& InPresets)
{
    Presets = InPresets;
    if (ActivePresetIndex >= Presets.Num())
    {
        ActivePresetIndex = 0;
    }
}

FRotator UKeyboardCameraStateComponent::GetDesiredArmRotation() const
{
    FRotator Base = FRotator::ZeroRotator;
    if (Presets.IsValidIndex(ActivePresetIndex))
    {
        Base = Presets[ActivePresetIndex].ArmRotation;
    }
    // Roll is intentionally forced to zero so a hovering/rolling vehicle spring
    // arm never tilts the horizon.
    return FRotator(Base.Pitch + OrbitPitch, Base.Yaw + OrbitYaw, 0.0f);
}

void UKeyboardCameraStateComponent::ApplyToSpringArm(USpringArmComponent* SpringArm) const
{
    if (!SpringArm)
    {
        return;
    }
    SpringArm->bInheritRoll = false;
    if (Presets.IsValidIndex(ActivePresetIndex))
    {
        const FKeyboardCameraPreset& Preset = Presets[ActivePresetIndex];
        SpringArm->TargetArmLength = Preset.ArmLength;
        SpringArm->SocketOffset = Preset.ArmSocketOffset;
    }
    SpringArm->SetRelativeRotation(GetDesiredArmRotation());
}

void UKeyboardCameraStateComponent::SetManagedSpringArm(USpringArmComponent* SpringArm)
{
    ManagedSpringArm = SpringArm;
}

void UKeyboardCameraStateComponent::TickComponent(float DeltaTime, ELevelTick TickType,
    FActorComponentTickFunction* ThisTickFunction)
{
    Super::TickComponent(DeltaTime, TickType, ThisTickFunction);
    AdvanceRecenter(DeltaTime);
    if (USpringArmComponent* SpringArm = ManagedSpringArm.Get())
    {
        ApplyToSpringArm(SpringArm);
    }
}
