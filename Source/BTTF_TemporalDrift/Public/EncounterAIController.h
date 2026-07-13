#pragma once

#include "CoreMinimal.h"
#include "AIController.h"
#include "Perception/AIPerceptionTypes.h"
#include "TimeTravelTypes.h"
#include "EncounterAIController.generated.h"

class UAIPerceptionComponent;
class UAISenseConfig_Sight;
class UAISenseConfig_Hearing;

/**
 * AI controller for hostile era encounters. Provides sight + hearing perception
 * and routes any detection of the hero through the hero's UHeroStealthComponent,
 * supporting a non-lethal break of line-of-sight (loss of LOS or high hero speed
 * clears accumulated awareness rather than dealing damage).
 */
UCLASS()
class BTTF_TEMPORALDRIFT_API AEncounterAIController : public AAIController
{
    GENERATED_BODY()

public:
    AEncounterAIController();

    virtual void BeginPlay() override;

    /** Era used to weight the routed stealth detection rate. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Encounter|Perception")
    ETimelineState EncounterEra = ETimelineState::Present1985;

    /** True when this AI observes via a drone/aerial sensor (affects stealth math). */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Encounter|Perception")
    bool bDroneObserver = false;

    /** Sight sense tuning. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Encounter|Sight")
    float SightRadius = 1600.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Encounter|Sight")
    float LoseSightRadius = 2000.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Encounter|Sight")
    float PeripheralVisionAngleDegrees = 60.0f;

    /** Hearing sense tuning. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Encounter|Hearing")
    float HearingRange = 1400.0f;

    /**
     * Hero speed (cm/s) above which line-of-sight is treated as broken and
     * accumulated awareness is cleared (non-lethal escape via fast movement).
     */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Encounter|Detection", meta=(ClampMin="0.0"))
    float BreakLineOfSightSpeed = 700.0f;

    /** Scales hero speed (cm/s) into the stealth component's MovementNoise input. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Encounter|Detection", meta=(ClampMin="0.0"))
    float SpeedToNoiseScale = 0.1f;

    /** Visibility estimate (0-100) fed to the stealth detection math. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Encounter|Detection", meta=(ClampMin="0.0", ClampMax="100.0"))
    float VisibilityEstimate = 60.0f;

    /** Delta accumulated per perception update when routing detection. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Encounter|Detection", meta=(ClampMin="0.0"))
    float PerceptionUpdateInterval = 0.5f;

protected:
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Encounter|Perception")
    UAIPerceptionComponent* EncounterPerception;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Encounter|Perception")
    UAISenseConfig_Sight* SightConfig;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Encounter|Perception")
    UAISenseConfig_Hearing* HearingConfig;

    /** Handles perception updates and routes hero detection through stealth. */
    UFUNCTION()
    void OnEncounterPerceptionUpdated(const TArray<AActor*>& UpdatedActors);
};
