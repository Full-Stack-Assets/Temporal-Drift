#include "KeyboardCameraComponent.h"
#include "GameFramework/SpringArmComponent.h"

UKeyboardCameraComponent::UKeyboardCameraComponent()
{
    PrimaryComponentTick.bCanEverTick = true;
}

void UKeyboardCameraComponent::ConfigureSpringArm(
    USpringArmComponent* SpringArm,
    const TArray<FKeyboardCameraPreset>& Presets)
{
    BoundSpringArm = SpringArm;
    CameraPresets = Presets;
    ActivePresetIndex = 0;
    if (SpringArm)
    {
        SpringArm->bInheritRoll = false;
        ApplyPresetToSpringArm(SpringArm);
    }
}

void UKeyboardCameraComponent::TickComponent(
    float DeltaTime,
    ELevelTick TickType,
    FActorComponentTickFunction* ThisTickFunction)
{
    Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

    if (!BoundSpringArm)
    {
        return;
    }

    if (bManualInputThisFrame)
    {
        TimeSinceLastManualInput = 0.0f;
    }
    else
    {
        TimeSinceLastManualInput += DeltaTime;
    }
    bManualInputThisFrame = false;

    UpdateAutoChase(DeltaTime);
    ApplyPresetToSpringArm(BoundSpringArm);
}

void UKeyboardCameraComponent::ApplyOrbitInput(float YawAxis, float PitchAxis, float DeltaTime)
{
    if (!FMath::IsNearlyZero(YawAxis) || !FMath::IsNearlyZero(PitchAxis))
    {
        OrbitYaw += YawAxis * OrbitYawSpeed * DeltaTime;
        OrbitPitch = FMath::Clamp(
            OrbitPitch + PitchAxis * OrbitPitchSpeed * DeltaTime,
            MinPitch,
            MaxPitch);
        bManualInputThisFrame = true;
        TimeSinceLastManualInput = 0.0f;
    }
}

void UKeyboardCameraComponent::CyclePreset()
{
    if (CameraPresets.IsEmpty())
    {
        return;
    }

    ActivePresetIndex = (ActivePresetIndex + 1) % CameraPresets.Num();
    OrbitPitch = FMath::Clamp(OrbitPitch, MinPitch, MaxPitch);
    if (const FKeyboardCameraPreset* Preset = GetActivePreset())
    {
        OrbitYaw = Preset->ChaseYawOffset;
        OrbitPitch = FMath::Clamp(Preset->ChasePitchOffset, MinPitch, MaxPitch);
    }
    TimeSinceLastManualInput = 0.0f;
}

void UKeyboardCameraComponent::ToggleAutoChase()
{
    bAutoChaseEnabled = !bAutoChaseEnabled;
}

void UKeyboardCameraComponent::ResetCameraState()
{
    OrbitYaw = 0.0f;
    OrbitPitch = -7.0f;
    ActivePresetIndex = 0;
    TimeSinceLastManualInput = 0.0f;
    bManualInputThisFrame = false;
    if (const FKeyboardCameraPreset* Preset = GetActivePreset())
    {
        OrbitPitch = FMath::Clamp(Preset->ChasePitchOffset, MinPitch, MaxPitch);
        OrbitYaw = Preset->ChaseYawOffset;
    }
}

void UKeyboardCameraComponent::UpdateAutoChase(float DeltaTime)
{
    if (!bAutoChaseEnabled || TimeSinceLastManualInput < AutoChaseDelay)
    {
        return;
    }

    const FKeyboardCameraPreset* Preset = GetActivePreset();
    const float TargetYaw = Preset ? Preset->ChaseYawOffset : 0.0f;
    const float TargetPitch = Preset ? Preset->ChasePitchOffset : -7.0f;
    const float Alpha = FMath::Clamp(RecenterInterpSpeed * DeltaTime, 0.0f, 1.0f);
    OrbitYaw = FMath::Lerp(OrbitYaw, TargetYaw, Alpha);
    OrbitPitch = FMath::Lerp(OrbitPitch, TargetPitch, Alpha);
}

void UKeyboardCameraComponent::ApplyPresetToSpringArm(USpringArmComponent* SpringArm)
{
    const FKeyboardCameraPreset* Preset = GetActivePreset();
    if (!Preset || !SpringArm)
    {
        return;
    }

    SpringArm->TargetArmLength = Preset->TargetArmLength;
    SpringArm->SetRelativeLocation(Preset->RelativeLocation);
    SpringArm->SocketOffset = Preset->SocketOffset;
    SpringArm->SetRelativeRotation(
        FRotator(OrbitPitch, OrbitYaw, 0.0f) + Preset->RelativeRotation);
    SpringArm->bInheritRoll = false;
}

const FKeyboardCameraPreset* UKeyboardCameraComponent::GetActivePreset() const
{
    return CameraPresets.IsValidIndex(ActivePresetIndex)
        ? &CameraPresets[ActivePresetIndex]
        : nullptr;
}
