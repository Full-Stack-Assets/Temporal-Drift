// KeyboardCameraStateComponent.h
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "KeyboardCameraStateComponent.generated.h"

class USpringArmComponent;

/** One camera framing preset (chase / hood / bumper / cockpit for the vehicle,
 *  chase / shoulder for the hero). Orbit offsets are applied on top of this. */
USTRUCT(BlueprintType)
struct FKeyboardCameraPreset
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Keyboard Camera")
    FName PresetName = NAME_None;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Keyboard Camera")
    float ArmLength = 525.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Keyboard Camera")
    FVector ArmSocketOffset = FVector::ZeroVector;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Keyboard Camera")
    FRotator ArmRotation = FRotator::ZeroRotator;
};

/**
 * Shared keyboard-only camera state for both pawns.
 *
 * W/A/S/D drive a clamped yaw/pitch orbit on top of the active framing preset.
 * Manual input suspends auto-chase; when auto-chase is enabled the orbit
 * recenters smoothly after RecenterDelaySeconds of inactivity. `C` cycles
 * presets, `V` toggles auto-chase. Roll is never applied so a rolling/hovering
 * vehicle spring arm stays level. All rates are frame-rate independent.
 */
UCLASS(ClassGroup = (BTTF), meta = (BlueprintSpawnableComponent))
class BTTF_TEMPORALDRIFT_API UKeyboardCameraStateComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UKeyboardCameraStateComponent();

    // --- Tuning ---------------------------------------------------------
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Keyboard Camera")
    float YawRateDegreesPerSecond = 90.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Keyboard Camera")
    float PitchRateDegreesPerSecond = 70.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Keyboard Camera")
    float MinPitchDegrees = -75.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Keyboard Camera")
    float MaxPitchDegrees = 30.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Keyboard Camera")
    float MaxYawDegrees = 180.0f;

    /** Inactivity before auto-chase recentering begins. Contract: 1.5 seconds. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Keyboard Camera")
    float RecenterDelaySeconds = 1.5f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Keyboard Camera")
    float RecenterInterpSpeed = 4.0f;

    // --- Input ----------------------------------------------------------
    /** A/D orbit. AxisValue in [-1,1]; positive orbits right. */
    void ApplyYawInput(float AxisValue, float DeltaSeconds);

    /** W/S orbit. AxisValue in [-1,1]; positive pitches up. */
    void ApplyPitchInput(float AxisValue, float DeltaSeconds);

    /** `V` toggles auto-chase recentering. */
    void ToggleAutoChase();
    void SetAutoChaseEnabled(bool bEnabled);
    bool IsAutoChaseEnabled() const { return bAutoChaseEnabled; }

    /** True once the inactivity delay has elapsed and orbit is off-center. */
    bool IsRecentering() const;

    /** Advance inactivity timing and, when eligible, recenter the orbit.
     *  Called from TickComponent; exposed for deterministic testing. */
    void AdvanceRecenter(float DeltaSeconds);

    /** `C` advances to the next preset, wrapping. Returns the new index. */
    int32 CyclePreset();
    int32 GetActivePresetIndex() const { return ActivePresetIndex; }
    void SetActivePresetIndex(int32 Index);

    void SetPresets(const TArray<FKeyboardCameraPreset>& InPresets);
    int32 GetPresetCount() const { return Presets.Num(); }

    // --- State readback (tests / HUD) -----------------------------------
    float GetOrbitYaw() const { return OrbitYaw; }
    float GetOrbitPitch() const { return OrbitPitch; }
    float GetSecondsSinceManualInput() const { return SecondsSinceManualInput; }

    /** Preset rotation plus orbit offset. Roll is always zero. */
    FRotator GetDesiredArmRotation() const;

    /** Push length/offset/rotation onto a spring arm (roll isolated). */
    void ApplyToSpringArm(USpringArmComponent* SpringArm) const;

    /** Optional: a spring arm the component keeps in sync every tick. */
    void SetManagedSpringArm(USpringArmComponent* SpringArm);

    virtual void TickComponent(float DeltaTime, ELevelTick TickType,
        FActorComponentTickFunction* ThisTickFunction) override;

private:
    void RegisterManualInput();

    float OrbitYaw = 0.0f;
    float OrbitPitch = 0.0f;
    float SecondsSinceManualInput = 0.0f;
    bool bAutoChaseEnabled = true;
    int32 ActivePresetIndex = 0;

    UPROPERTY()
    TArray<FKeyboardCameraPreset> Presets;

    UPROPERTY()
    TWeakObjectPtr<USpringArmComponent> ManagedSpringArm;
};
