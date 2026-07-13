#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "TimeTravelTypes.h"
#include "TimeTravelPresentationComponent.generated.h"

UCLASS(ClassGroup=(Temporal), BlueprintType, Blueprintable, meta=(BlueprintSpawnableComponent))
class BTTF_TEMPORALDRIFT_API UTimeTravelPresentationComponent : public UActorComponent
{
    GENERATED_BODY()

public:
    UTimeTravelPresentationComponent();

    virtual void BeginPlay() override;
    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

    UFUNCTION(BlueprintCallable, Category="Time Travel|Presentation")
    void SetReducedFlash(bool bEnabled);

    UFUNCTION(BlueprintPure, Category="Time Travel|Presentation")
    bool IsReducedFlashEnabled() const { return bReducedFlash; }

    UFUNCTION(BlueprintPure, Category="Time Travel|Presentation")
    ETimeTravelPhase GetPresentationPhase() const { return PresentationPhase; }

    UFUNCTION(BlueprintPure, Category="Time Travel|Presentation")
    bool IsCueActive() const { return bCueActive; }

    UFUNCTION(BlueprintPure, Category="Time Travel|Presentation")
    float GetCueIntensity() const { return CueIntensity; }

    // Public for Blueprint presentation graphs and deterministic automation tests.
    UFUNCTION(BlueprintCallable, Category="Time Travel|Presentation")
    void HandlePhaseChanged(ETimeTravelPhase NewPhase);

private:
    UFUNCTION()
    void HandleSubsystemPhaseChanged(ETimeTravelPhase PreviousPhase, ETimeTravelPhase NewPhase);

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Presentation", meta=(AllowPrivateAccess="true"))
    bool bReducedFlash = false;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Presentation", meta=(AllowPrivateAccess="true"))
    ETimeTravelPhase PresentationPhase = ETimeTravelPhase::Idle;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Presentation", meta=(AllowPrivateAccess="true"))
    bool bCueActive = false;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Presentation", meta=(AllowPrivateAccess="true"))
    float CueIntensity = 0.0f;
};
