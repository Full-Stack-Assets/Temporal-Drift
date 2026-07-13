// BTTF_PlayerController.h
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "BTTF_PlayerController.generated.h"

class UInputMappingContext;
class UInputAction;
class ABTTFHeroCharacter;

UCLASS()
class BTTF_TEMPORALDRIFT_API ABTTF_PlayerController : public APlayerController
{
    GENERATED_BODY()

public:
    ABTTF_PlayerController();
    virtual void PlayerTick(float DeltaTime) override;

    UFUNCTION(BlueprintCallable, Category="Vehicle")
    bool ToggleVehicleHeroPossession();

    UFUNCTION(BlueprintPure, Category="Vehicle")
    ABTTFHeroCharacter* GetCachedHero() const { return CachedHero; }

protected:
    virtual void BeginPlay() override;
    virtual void SetupInputComponent() override;

    // ==================== INPUT ====================
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Input")
    UInputMappingContext* DefaultMappingContext;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Input")
    UInputAction* TimeCircuitsToggleAction;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Input")
    UInputAction* TimeJumpAction;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Input")
    UInputAction* HoverModeAction;

    // Input Handlers
    void ToggleTimeCircuits();
    void RequestTimeJump();
    void ToggleHoverMode();

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category="Vehicle")
    TSubclassOf<ABTTFHeroCharacter> HeroClass;

    UPROPERTY(Transient)
    TObjectPtr<ABTTFHeroCharacter> CachedHero;
};
