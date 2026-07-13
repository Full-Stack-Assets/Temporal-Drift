// DeLoreanVehicle.h - Updated with Flux, Paradox, Hawking & Tipler Support
#pragma once

#include "CoreMinimal.h"
#include "WheeledVehiclePawn.h"
#include "TimeTravelSubsystem.h"
#include "TemporalDriveSubsystem.h"
#include "DeLoreanVehicle.generated.h"

class UNiagaraComponent;
class UTimeTravelPresentationComponent;
class UInputMappingContext;
class UInputAction;
class USpringArmComponent;
class UCameraComponent;
class UStaticMeshComponent;
class USceneComponent;
class UDeLoreanTuningData;
class UKeyboardCameraComponent;
struct FInputActionValue;

UCLASS()
class BTTF_TEMPORALDRIFT_API ADeLoreanVehicle : public AWheeledVehiclePawn
{
    GENERATED_BODY()

public:
    ADeLoreanVehicle();

protected:
    virtual void BeginPlay() override;
    virtual void Tick(float DeltaTime) override;
    virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;
    virtual void PawnClientRestart() override;

public:
    // Enhanced Input
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Input")
    UInputMappingContext* VehicleMappingContext;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Input")
    UInputAction* ThrottleAction;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Input")
    UInputAction* SteeringAction;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Input")
    UInputAction* BrakeAction;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Input")
    UInputAction* HandbrakeAction;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Input")
    UInputAction* ReverseAction;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Input")
    UInputAction* HoverModeAction;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Input")
    UInputAction* ResetVehicleAction;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Input")
    UInputAction* TimeCircuitsAction;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Input")
    UInputAction* TimeJumpAction;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Input")
    UInputAction* CycleDestinationAction;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Input")
    UInputAction* ToggleCameraAction;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Input")
    UInputAction* ToggleAutoChaseAction;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Input")
    UInputAction* CameraOrbitYawAction;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Input")
    UInputAction* CameraOrbitPitchAction;

    // Era targeted when the time travel input is pressed
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Time Travel")
    ETimelineState InputTargetEra = ETimelineState::Past1955;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Time Travel")
    FTemporalDestinationDate InputTargetDate;

    // Components
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Camera")
    USpringArmComponent* CameraSpringArm;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Camera")
    UCameraComponent* ChaseCamera;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Camera")
    UKeyboardCameraComponent* KeyboardCamera;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Time Travel")
    UNiagaraComponent* TimeTravelNiagaraComponent;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Time Travel|Presentation", meta=(AllowPrivateAccess="true"))
    TObjectPtr<UTimeTravelPresentationComponent> TimeTravelPresentationComponent;

    // High-detail visible body. The lightweight skeletal import is retained as
    // the Chaos physics root, while this component supplies the actual car art.
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Vehicle")
    UStaticMeshComponent* VisualCarBody;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Vehicle|Hero")
    USceneComponent* HeroVisualRoot;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Vehicle|Hero")
    TArray<TObjectPtr<UStaticMeshComponent>> HeroVisualMeshes;

    UFUNCTION(BlueprintPure, Category = "Vehicle|Hero")
    USceneComponent* GetHeroVisualRoot() const { return HeroVisualRoot; }

    UFUNCTION(BlueprintPure, Category = "Vehicle|Hero")
    int32 GetHeroVisualMeshCount() const { return HeroVisualMeshes.Num(); }

    UFUNCTION(BlueprintPure, Category = "Vehicle|Hero")
    bool HasPrototypeVisuals() const { return bPrototypeVisualsEnabled; }

    UFUNCTION(BlueprintPure, Category = "Camera")
    int32 GetCameraModeCount() const { return 4; }

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Vehicle|Tuning")
    UDeLoreanTuningData* TuningDataAsset;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Vehicle|Input", meta=(ClampMin="1.0"))
    float InputSmoothingRate = 12.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Vehicle|Tuning", meta=(ClampMin="100.0"))
    float ReverseAssistAcceleration = 650.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Vehicle|Tuning", meta=(ClampMin="1.0"))
    float ReverseAssistMaxSpeedMph = 15.0f;

    UPROPERTY(BlueprintReadOnly, Category = "Time Travel")
    UTimeTravelSubsystem* TimeTravelSubsystem;

    // Vehicle State
    UPROPERTY(BlueprintReadOnly, VisibleAnywhere, Category = "Vehicle")
    float CurrentSpeedMph;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Debug")
    bool bShowDebugInfo = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Debug")
    bool bEnableDiagnosticKeyboardFallback = false;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Debug")
    bool bPrototypeVisualsEnabled = false;

    UPROPERTY(BlueprintReadOnly, VisibleAnywhere, Category = "Time Travel")
    bool bIsTimeTraveling = false;

    UPROPERTY(BlueprintReadOnly, VisibleAnywhere, Category = "Time Travel")
    bool bTimeCircuitsOn = false;

    UPROPERTY(BlueprintReadOnly, VisibleAnywhere, Category = "Hover Mode")
    bool bHoverModeActive = false;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Hover Mode")
    float HoverTargetHeight = 250.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Hover Mode")
    float HoverSpringStrength = 12.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Hover Mode")
    float HoverDamping = 3.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Hover Mode")
    float HoverStabilizationStrength = 8.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Hover Mode")
    float HoverAngularDamping = 5.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Hover Mode")
    float HoverMaxVerticalAcceleration = 1600.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Hover Mode")
    float HoverForwardAcceleration = 500.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Hover Mode")
    float HoverYawAcceleration = 1.5f;

    // Functions
    UFUNCTION(BlueprintCallable, Category = "Time Travel")
    void ToggleTimeCircuits();

    UFUNCTION(BlueprintCallable, Category = "Time Travel")
    void TryTimeTravelFromInput();

    UFUNCTION(BlueprintCallable, Category = "Hover Mode")
    void ToggleHoverMode();

    UFUNCTION(BlueprintPure, Category = "Vehicle")
    float GetCurrentSpeedMph() const;

    UFUNCTION(BlueprintCallable, Category = "Vehicle")
    void UpdateSpeedometer();

    UFUNCTION(BlueprintCallable, Category = "Vehicle|Input")
    void ApplyVehicleInput(float Throttle, float Steering, float Brake, bool bHandbrake);

    UFUNCTION(BlueprintCallable, Category = "Vehicle|Input")
    void ApplyReverseInput(bool bPressed);

    UFUNCTION(BlueprintCallable, Category = "Vehicle|Input")
    void ApplyDigitalDriveInput(bool bForward, bool bReverse, bool bLeft, bool bRight);

    UFUNCTION(BlueprintPure, Category = "Hover Mode")
    FVector CalculateHoverStabilizationTorque(const FVector& CurrentUp,
        const FVector& AngularVelocityRadians, float BodyMass) const;

    UFUNCTION(BlueprintCallable, Category = "Vehicle|Recovery")
    void ResetVehicle();

    UFUNCTION(BlueprintCallable, Category = "Vehicle|Recovery")
    void SetLastSafeTransform(const FTransform& SafeTransform);

    UFUNCTION(BlueprintCallable, Category = "Camera")
    void ToggleCamera();

    UFUNCTION(BlueprintCallable, Category = "Camera")
    void ToggleAutoChaseCamera();

    UFUNCTION(BlueprintPure, Category = "Camera")
    int32 GetActiveCameraIndex() const;

    UFUNCTION(BlueprintPure, Category = "Camera")
    UKeyboardCameraComponent* GetKeyboardCameraComponent() const { return KeyboardCamera; }

    UFUNCTION(BlueprintCallable, Category = "Time Travel")
    void CycleDestinationEra(int32 Direction);

    UFUNCTION(BlueprintCallable, Category = "Flux Capacitor")
    void UpdateFluxCapacitor(float DeltaTime);

    UFUNCTION(BlueprintCallable, Category = "Time Travel")
    void TryTimeTravel(ETimelineState TargetEra);

    UFUNCTION(BlueprintCallable, Category = "Time Travel")
    void StartTimeTravelEffects();

    UFUNCTION(BlueprintCallable, Category = "Time Travel")
    void EndTimeTravelEffects();

    UFUNCTION(BlueprintCallable, Category = "Hawking Radiation")
    void ApplyRadiationDamage(float Amount);

protected:
    void InitializeTimeTravelSubsystem();
    void ApplyTuningData(const UDeLoreanTuningData* TuningData);
    void UpdateHoverMode(float DeltaTime);
    void UpdateSpeedResponsiveCamera(float DeltaTime);
    void ApplySmoothedVehicleInput(float DeltaTime);
    void UpdateSafeTransformIfStable();
    void ApplyKeyboardFallback();
    void InstallVehicleInputMapping();
    void InitializeKeyboardCameraPresets();
    void HandleCameraOrbitYaw(const FInputActionValue& Value);
    void HandleCameraOrbitPitch(const FInputActionValue& Value);
    void CameraOrbitYawAxis(float Value);
    void CameraOrbitPitchAxis(float Value);

    float LastKeyboardThrottle = 0.0f;
    float LastKeyboardSteering = 0.0f;
    float LastKeyboardBrake = 0.0f;
    bool bLastKeyboardReverse = false;
    float SmoothedThrottleInput = 0.0f;
    float SmoothedSteeringInput = 0.0f;
    float SmoothedBrakeInput = 0.0f;
    float TargetThrottleInput = 0.0f;
    float TargetSteeringInput = 0.0f;
    float TargetBrakeInput = 0.0f;

    UPROPERTY(VisibleInstanceOnly, Category = "Vehicle|Recovery")
    FTransform LastSafeTransform;

    // Input handlers
    void HandleThrottle(const FInputActionValue& Value);
    void HandleSteering(const FInputActionValue& Value);
    void HandleBrake(const FInputActionValue& Value);
    void HandleHandbrake(const FInputActionValue& Value);
    void HandleReverse(const FInputActionValue& Value);
    void HandleCycleDestination(const FInputActionValue& Value);
    void BeginReverse();
    void EndReverse();
    void SelectPreviousDestination();
    void SelectNextDestination();
    void BeginForward();
    void EndForward();
    void BeginSteerLeft();
    void EndSteerLeft();
    void BeginSteerRight();
    void EndSteerRight();

    bool bForwardKeyPressed = false;
    bool bReverseKeyPressed = false;
    bool bLeftKeyPressed = false;
    bool bRightKeyPressed = false;
    bool bDigitalReverseApplied = false;
};
