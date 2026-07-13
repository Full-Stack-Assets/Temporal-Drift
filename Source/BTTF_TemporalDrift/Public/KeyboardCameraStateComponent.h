#pragma once

#include "CoreMinimal.h"
#include "KeyboardCameraComponent.h"
#include "KeyboardCameraStateComponent.generated.h"

/**
 * Architectural alias for the shared keyboard camera contract.
 * Retains spring-arm orbit behavior from UKeyboardCameraComponent while exposing
 * the ReceiveManualInput entry point used by automation and blueprint callers.
 */
UCLASS(ClassGroup=(Camera), meta=(BlueprintSpawnableComponent))
class BTTF_TEMPORALDRIFT_API UKeyboardCameraStateComponent : public UKeyboardCameraComponent
{
    GENERATED_BODY()

public:
    void ReceiveManualInput(float PitchDelta, float YawDelta);

    UFUNCTION(BlueprintCallable, Category="Camera Control")
    void SetAutoChaseEnabled(bool bEnable) { bAutoChaseEnabled = bEnable; }
};
