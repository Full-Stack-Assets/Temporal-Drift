// DeLoreanVehicle.h - Updated with Flux, Paradox, Hawking & Tipler Support
#pragma once

#include "CoreMinimal.h"
#include "WheeledVehiclePawn.h"
#include "TimeTravelSubsystem.h"
#include "DeLoreanVehicle.generated.h"

class UNiagaraComponent;
class UInputMappingContext;
class UInputAction;
class USpringArmComponent;
class UCameraComponent;
class UStaticMeshComponent;
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

    // Era targeted when the time travel input is pressed
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Time Travel")
    ETimelineState InputTargetEra = ETimelineState::Past1955;

    // Components
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Camera")
    USpringArmComponent* CameraSpringArm;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Camera")
    UCameraComponent* ChaseCamera;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Time Travel")
    UNiagaraComponent* TimeTravelNiagaraComponent;

    // High-detail visible body. The lightweight skeletal import is retained as
    // the Chaos physics root, while this component supplies the actual car art.
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Vehicle")
    UStaticMeshComponent* VisualCarBody;

    UPROPERTY(BlueprintReadOnly, Category = "Time Travel")
    UTimeTravelSubsystem* TimeTravelSubsystem;

    // Vehicle State
    UPROPERTY(BlueprintReadOnly, VisibleAnywhere, Category = "Vehicle")
    float CurrentSpeedMph;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Debug")
    bool bShowDebugInfo = true;

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

    UFUNCTION(BlueprintCallable, Category = "Vehicle|Recovery")
    void ResetVehicle();

    UFUNCTION(BlueprintCallable, Category = "Vehicle|Recovery")
    void SetLastSafeTransform(const FTransform& SafeTransform);

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
    void UpdateHoverMode(float DeltaTime);
    void ApplyKeyboardFallback();

    float LastKeyboardThrottle = 0.0f;
    float LastKeyboardSteering = 0.0f;
    float LastKeyboardBrake = 0.0f;

    UPROPERTY(VisibleInstanceOnly, Category = "Vehicle|Recovery")
    FTransform LastSafeTransform;

    // Input handlers
    void HandleThrottle(const FInputActionValue& Value);
    void HandleSteering(const FInputActionValue& Value);
    void HandleBrake(const FInputActionValue& Value);
};
