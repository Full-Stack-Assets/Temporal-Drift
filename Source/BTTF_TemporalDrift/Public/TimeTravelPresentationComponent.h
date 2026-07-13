#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "TimeTravelTypes.h"
#include "TimeTravelPresentationComponent.generated.h"

class UMaterialInterface;
class UNiagaraSystem;
class USoundBase;

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

    UFUNCTION(BlueprintCallable, Category="Time Travel|Presentation")
    void SetPresentationEnabled(bool bEnabled);

    UFUNCTION(BlueprintPure, Category="Time Travel|Presentation")
    bool IsPresentationEnabled() const { return bPresentationEnabled; }

    UFUNCTION(BlueprintPure, Category="Time Travel|Presentation")
    bool IsReducedFlashEnabled() const { return bReducedFlash; }

    UFUNCTION(BlueprintPure, Category="Time Travel|Presentation")
    ETimeTravelPhase GetPresentationPhase() const { return PresentationPhase; }

    UFUNCTION(BlueprintPure, Category="Time Travel|Presentation")
    bool IsCueActive() const { return bCueActive && bPresentationEnabled; }

    UFUNCTION(BlueprintPure, Category="Time Travel|Presentation")
    float GetCueIntensity() const { return bPresentationEnabled ? CueIntensity : 0.0f; }

    UFUNCTION(BlueprintPure, Category="Time Travel|Presentation")
    FSoftObjectPath GetActiveDistortionMaterialPath() const;

    UFUNCTION(BlueprintPure, Category="Time Travel|Presentation")
    FSoftObjectPath GetActiveArrivalMaterialPath() const;

    UFUNCTION(BlueprintPure, Category="Time Travel|Presentation")
    FSoftObjectPath GetPhaseNiagaraPath(ETimeTravelPhase Phase) const;

    UFUNCTION(BlueprintPure, Category="Time Travel|Presentation")
    FSoftObjectPath GetPhaseAudioPath(ETimeTravelPhase Phase) const;

    UFUNCTION(BlueprintPure, Category="Time Travel|Presentation")
    bool ShouldApplyPostProcessForPhase(ETimeTravelPhase Phase) const;

    UFUNCTION(BlueprintCallable, Category="Time Travel|Presentation")
    void HandlePhaseChanged(ETimeTravelPhase NewPhase);

    UFUNCTION(BlueprintCallable, Category="Time Travel|Presentation")
    void UpdateVehicleDrivingContext(float SpeedMph, float FluxPercent, float ParadoxPercent);

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Presentation|Materials")
    FSoftObjectPath DistortionMaterialPath =
        FSoftObjectPath(TEXT("/Game/Materials/PostProcess/M_TemporalDistortion.M_TemporalDistortion"));

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Presentation|Materials")
    FSoftObjectPath ReducedFlashDistortionMaterialPath =
        FSoftObjectPath(TEXT("/Game/Materials/PostProcess/M_TemporalDistortion_ReducedFlash.M_TemporalDistortion_ReducedFlash"));

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Presentation|Materials")
    FSoftObjectPath ArrivalFrostMaterialPath =
        FSoftObjectPath(TEXT("/Game/Materials/PostProcess/M_TemporalArrivalFrost.M_TemporalArrivalFrost"));

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Presentation|Niagara")
    FSoftObjectPath FluxChargeNiagaraPath =
        FSoftObjectPath(TEXT("/Game/Niagara/NS_FluxCharge.NS_FluxCharge"));

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Presentation|Niagara")
    FSoftObjectPath TemporalVortexNiagaraPath =
        FSoftObjectPath(TEXT("/Game/Niagara/NS_TemporalVortex.NS_TemporalVortex"));

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Presentation|Niagara")
    FSoftObjectPath FireTrailsNiagaraPath =
        FSoftObjectPath(TEXT("/Game/Niagara/NS_FireTrails.NS_FireTrails"));

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Presentation|Niagara")
    FSoftObjectPath ArrivalFrostNiagaraPath =
        FSoftObjectPath(TEXT("/Game/Niagara/NS_ArrivalFrost.NS_ArrivalFrost"));

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Presentation|Audio")
    FSoftObjectPath FluxHumAudioPath =
        FSoftObjectPath(TEXT("/Game/Audio/MetaSounds/MS_FluxHum.MS_FluxHum"));

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Presentation|Audio")
    FSoftObjectPath DepartureAudioPath =
        FSoftObjectPath(TEXT("/Game/Audio/MetaSounds/MS_TimeDeparture.MS_TimeDeparture"));

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Presentation|Audio")
    FSoftObjectPath ArrivalAudioPath =
        FSoftObjectPath(TEXT("/Game/Audio/MetaSounds/MS_TimeArrival.MS_TimeArrival"));

private:
    void EnsureRuntimeComponents();
    void ApplyPresentationEffects();
    void ClearPresentationEffects();

    UFUNCTION()
    void HandleSubsystemPhaseChanged(ETimeTravelPhase PreviousPhase, ETimeTravelPhase NewPhase);

    UPROPERTY(Transient)
    TObjectPtr<class UPostProcessComponent> PostProcessComponent;

    UPROPERTY(Transient)
    TObjectPtr<class UNiagaraComponent> PresentationNiagaraComponent;

    UPROPERTY(Transient)
    TObjectPtr<class UAudioComponent> PresentationAudioComponent;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Presentation", meta=(AllowPrivateAccess="true"))
    bool bReducedFlash = false;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category="Presentation", meta=(AllowPrivateAccess="true"))
    bool bPresentationEnabled = true;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Presentation", meta=(AllowPrivateAccess="true"))
    ETimeTravelPhase PresentationPhase = ETimeTravelPhase::Idle;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Presentation", meta=(AllowPrivateAccess="true"))
    bool bCueActive = false;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category="Presentation", meta=(AllowPrivateAccess="true"))
    float CueIntensity = 0.0f;

    float CachedSpeedMph = 0.0f;
    float CachedFluxPercent = 0.0f;
    float CachedParadoxPercent = 0.0f;
};
