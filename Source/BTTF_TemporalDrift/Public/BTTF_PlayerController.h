// BTTF_PlayerController.h
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "BTTF_PlayerController.generated.h"

class UInputMappingContext;
class UInputAction;
class ABTTFHeroCharacter;
class UPauseMenuWidget;

UCLASS()
class BTTF_TEMPORALDRIFT_API ABTTF_PlayerController : public APlayerController
{
    GENERATED_BODY()

public:
    ABTTF_PlayerController();
    virtual void PlayerTick(float DeltaTime) override;

    UFUNCTION(BlueprintCallable, Category="Vehicle")
    bool ToggleVehicleHeroPossession();

    void HandleToggleVehicleHeroPossession();
    void HandleToggleAutoChaseCamera();

    UFUNCTION(BlueprintPure, Category="Vehicle")
    bool ShouldPollVehicleToggleInTick() const { return false; }

    UFUNCTION(BlueprintCallable, Category = "UI")
    void TogglePauseMenu();

    UFUNCTION(BlueprintPure, Category = "UI")
    bool IsMenuPaused() const { return bMenuPaused; }

    void EnsurePauseMenuWidget();

    UFUNCTION(BlueprintPure, Category="Vehicle")
    ABTTFHeroCharacter* GetCachedHero() const { return CachedHero; }

    UFUNCTION(Exec)
    void QAJumpTo1955();

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

    UPROPERTY(Transient)
    TObjectPtr<UPauseMenuWidget> PauseMenuWidget;

    bool bMenuPaused = false;
};
