#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "KeyboardCameraComponent.generated.h"

class USpringArmComponent;

USTRUCT(BlueprintType)
struct FKeyboardCameraPreset
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Camera")
    float TargetArmLength = 525.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Camera")
    FVector RelativeLocation = FVector::ZeroVector;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Camera")
    FRotator RelativeRotation = FRotator::ZeroRotator;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Camera")
    FVector SocketOffset = FVector::ZeroVector;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Camera")
    float ChaseYawOffset = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Camera")
    float ChasePitchOffset = -7.0f;
};

UCLASS(ClassGroup=(Camera), meta=(BlueprintSpawnableComponent))
class BTTF_TEMPORALDRIFT_API UKeyboardCameraComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UKeyboardCameraComponent();

    virtual void TickComponent(float DeltaTime, ELevelTick TickType,
        FActorComponentTickFunction* ThisTickFunction) override;

    UFUNCTION(BlueprintCallable, Category="Camera")
    void ApplyOrbitInput(float YawAxis, float PitchAxis, float DeltaTime);

    UFUNCTION(BlueprintCallable, Category="Camera")
    void CyclePreset();

    UFUNCTION(BlueprintCallable, Category="Camera")
    void ToggleAutoChase();

    UFUNCTION(BlueprintCallable, Category="Camera")
    void ResetCameraState();

    UFUNCTION(BlueprintPure, Category="Camera")
    bool IsAutoChaseEnabled() const { return bAutoChaseEnabled; }

    UFUNCTION(BlueprintPure, Category="Camera")
    int32 GetActivePresetIndex() const { return ActivePresetIndex; }

    UFUNCTION(BlueprintPure, Category="Camera")
    float GetOrbitYaw() const { return OrbitYaw; }

    UFUNCTION(BlueprintPure, Category="Camera")
    float GetOrbitPitch() const { return OrbitPitch; }

    UFUNCTION(BlueprintPure, Category="Camera")
    float GetTimeSinceLastManualInput() const { return TimeSinceLastManualInput; }

    void ConfigureSpringArm(USpringArmComponent* SpringArm, const TArray<FKeyboardCameraPreset>& Presets);

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Camera|Orbit")
    float OrbitYawSpeed = 90.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Camera|Orbit")
    float OrbitPitchSpeed = 60.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Camera|Orbit")
    float MinPitch = -75.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Camera|Orbit")
    float MaxPitch = 45.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Camera|AutoChase")
    float AutoChaseDelay = 1.5f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Camera|AutoChase")
    float RecenterInterpSpeed = 4.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Camera|AutoChase")
    bool bAutoChaseEnabled = true;

protected:
    void UpdateAutoChase(float DeltaTime);
    void ApplyPresetToSpringArm(USpringArmComponent* SpringArm);
    const FKeyboardCameraPreset* GetActivePreset() const;

    UPROPERTY(Transient)
    TObjectPtr<USpringArmComponent> BoundSpringArm;

    TArray<FKeyboardCameraPreset> CameraPresets;
    int32 ActivePresetIndex = 0;
    float OrbitYaw = 0.0f;
    float OrbitPitch = 0.0f;
    float TimeSinceLastManualInput = 0.0f;
    bool bManualInputThisFrame = false;
};
