#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "BTTFHeroCharacter.generated.h"

class USpringArmComponent;
class UCameraComponent;
class UVehicleInteractionComponent;
class UHeroCombatComponent;
class UHeroStealthComponent;

UCLASS()
class BTTF_TEMPORALDRIFT_API ABTTFHeroCharacter : public ACharacter
{
    GENERATED_BODY()

public:
    ABTTFHeroCharacter();
    virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;

    UFUNCTION(BlueprintPure, Category="Interaction")
    UVehicleInteractionComponent* GetVehicleInteractionComponent() const { return VehicleInteraction; }
    UFUNCTION(BlueprintPure,Category="Combat") UHeroCombatComponent* GetCombatComponent()const{return Combat;}
    UFUNCTION(BlueprintPure,Category="Stealth") UHeroStealthComponent* GetStealthComponent()const{return Stealth;}

protected:
    void MoveForward(float Value);
    void MoveRight(float Value);

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Camera")
    USpringArmComponent* CameraBoom;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Camera")
    UCameraComponent* FollowCamera;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Interaction")
    UVehicleInteractionComponent* VehicleInteraction;
    UPROPERTY(VisibleAnywhere,BlueprintReadOnly,Category="Combat") UHeroCombatComponent* Combat;
    UPROPERTY(VisibleAnywhere,BlueprintReadOnly,Category="Stealth") UHeroStealthComponent* Stealth;
};
