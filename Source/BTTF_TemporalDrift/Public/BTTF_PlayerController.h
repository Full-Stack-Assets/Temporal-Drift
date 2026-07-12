// BTTF_PlayerController.h
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "BTTF_PlayerController.generated.h"

class UInputMappingContext;
class UInputAction;

UCLASS()
class BTTF_TEMPORALDRIFT_API ABTTF_PlayerController : public APlayerController
{
    GENERATED_BODY()

public:
    ABTTF_PlayerController();

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
};
