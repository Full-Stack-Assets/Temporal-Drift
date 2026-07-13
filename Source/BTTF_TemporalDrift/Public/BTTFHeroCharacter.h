#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "BTTFHeroCharacter.generated.h"

class USpringArmComponent;
class UCameraComponent;
class UVehicleInteractionComponent;
class UHeroCombatComponent;
class UHeroStealthComponent;
class UKeyboardCameraComponent;
class UInputMappingContext;

UCLASS()
class BTTF_TEMPORALDRIFT_API ABTTFHeroCharacter : public ACharacter
{
    GENERATED_BODY()

public:
    ABTTFHeroCharacter();
    virtual void BeginPlay() override;
    virtual void Tick(float DeltaTime) override;
    virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;
    virtual void PawnClientRestart() override;

    UFUNCTION(BlueprintCallable, Category="Hero|Movement")
    void SetSprinting(bool bEnabled);
    UFUNCTION(BlueprintPure, Category="Hero|Movement") float GetWalkSpeed() const { return WalkSpeed; }
    UFUNCTION(BlueprintPure, Category="Hero|Movement") float GetSprintSpeed() const { return SprintSpeed; }
    UFUNCTION(BlueprintPure, Category="Hero|Movement") float GetCrouchSpeed() const { return CrouchSpeed; }
    UFUNCTION(BlueprintPure, Category="Hero|Movement") bool IsSprinting() const { return bSprinting; }
    UFUNCTION(BlueprintPure, Category="Hero|Movement") bool HasSafeTransform() const { return bHasSafeTransform; }

    UFUNCTION(BlueprintCallable, Category="Hero|Recovery")
    void ResetToSafeTransform();

    UFUNCTION(BlueprintPure, Category="Interaction")
    UVehicleInteractionComponent* GetVehicleInteractionComponent() const { return VehicleInteraction; }
    UFUNCTION(BlueprintPure,Category="Combat") UHeroCombatComponent* GetCombatComponent()const{return Combat;}
    UFUNCTION(BlueprintPure,Category="Stealth") UHeroStealthComponent* GetStealthComponent()const{return Stealth;}
    UFUNCTION(BlueprintPure, Category="Camera")
    UKeyboardCameraComponent* GetKeyboardCameraComponent() const { return KeyboardCamera; }

protected:
    void MoveForward(float Value);
    void MoveRight(float Value);
    void BeginSprint();
    void EndSprint();
    void ToggleCrouch();
    void Interact();
    bool TryInteractMissionTaggedActor();

    void CameraOrbitYaw(float Value);
    void CameraOrbitPitch(float Value);
    void CycleCameraPreset();
    void ToggleAutoChase();
    void InstallHeroInputMapping();
    void UpdateMovementFacingYaw();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Hero|Interaction")
    float MissionTagInteractRadius = 250.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Hero|Movement")
    float WalkSpeed = 500.0f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Hero|Movement") float SprintSpeed = 760.0f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Hero|Movement") float CrouchSpeed = 260.0f;
    UPROPERTY(BlueprintReadOnly, Category="Hero|Movement") bool bSprinting = false;
    UPROPERTY(BlueprintReadOnly, Category="Hero|Recovery") bool bHasSafeTransform = true;
    UPROPERTY(Transient) FTransform SafeTransform;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Input")
    UInputMappingContext* HeroMappingContext;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Camera")
    USpringArmComponent* CameraBoom;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Camera")
    UCameraComponent* FollowCamera;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Camera")
    UKeyboardCameraComponent* KeyboardCamera;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Interaction")
    UVehicleInteractionComponent* VehicleInteraction;
    UPROPERTY(VisibleAnywhere,BlueprintReadOnly,Category="Combat") UHeroCombatComponent* Combat;
    UPROPERTY(VisibleAnywhere,BlueprintReadOnly,Category="Stealth") UHeroStealthComponent* Stealth;
};
