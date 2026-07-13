#include "TimeTravelPresentationComponent.h"
#include "TimeTravelSubsystem.h"

UTimeTravelPresentationComponent::UTimeTravelPresentationComponent()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UTimeTravelPresentationComponent::BeginPlay()
{
    Super::BeginPlay();
    if (UWorld* World = GetWorld())
    {
        if (UTimeTravelSubsystem* Subsystem = World->GetSubsystem<UTimeTravelSubsystem>())
        {
            Subsystem->OnPhaseChanged.AddDynamic(this, &UTimeTravelPresentationComponent::HandleSubsystemPhaseChanged);
            HandlePhaseChanged(Subsystem->GetTimeTravelPhase());
        }
    }
}

void UTimeTravelPresentationComponent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    if (UWorld* World = GetWorld())
    {
        if (UTimeTravelSubsystem* Subsystem = World->GetSubsystem<UTimeTravelSubsystem>())
        {
            Subsystem->OnPhaseChanged.RemoveDynamic(this, &UTimeTravelPresentationComponent::HandleSubsystemPhaseChanged);
        }
    }
    Super::EndPlay(EndPlayReason);
}

void UTimeTravelPresentationComponent::SetReducedFlash(bool bEnabled)
{
    bReducedFlash = bEnabled;
}

void UTimeTravelPresentationComponent::SetPresentationEnabled(bool bEnabled)
{
    bPresentationEnabled = bEnabled;
    if (!bPresentationEnabled)
    {
        bCueActive = false;
        CueIntensity = 0.0f;
    }
    else
    {
        HandlePhaseChanged(PresentationPhase);
    }
}

FSoftObjectPath UTimeTravelPresentationComponent::GetActiveDistortionMaterialPath() const
{
    return bReducedFlash ? ReducedFlashDistortionMaterialPath : DistortionMaterialPath;
}

FSoftObjectPath UTimeTravelPresentationComponent::GetActiveArrivalMaterialPath() const
{
    return ArrivalFrostMaterialPath;
}

FSoftObjectPath UTimeTravelPresentationComponent::GetPhaseNiagaraPath(ETimeTravelPhase Phase) const
{
    switch (Phase)
    {
    case ETimeTravelPhase::Charging:
    case ETimeTravelPhase::ThresholdReached:
        return FluxChargeNiagaraPath;
    case ETimeTravelPhase::Departing:
    case ETimeTravelPhase::SwitchingEra:
        return TemporalVortexNiagaraPath;
    case ETimeTravelPhase::Arriving:
        return ArrivalFrostNiagaraPath;
    case ETimeTravelPhase::Cooldown:
        return FireTrailsNiagaraPath;
    default:
        return FSoftObjectPath();
    }
}

FSoftObjectPath UTimeTravelPresentationComponent::GetPhaseAudioPath(ETimeTravelPhase Phase) const
{
    switch (Phase)
    {
    case ETimeTravelPhase::Charging:
    case ETimeTravelPhase::ThresholdReached:
        return FluxHumAudioPath;
    case ETimeTravelPhase::Departing:
    case ETimeTravelPhase::SwitchingEra:
        return DepartureAudioPath;
    case ETimeTravelPhase::Arriving:
    case ETimeTravelPhase::Cooldown:
        return ArrivalAudioPath;
    default:
        return FSoftObjectPath();
    }
}

void UTimeTravelPresentationComponent::HandlePhaseChanged(ETimeTravelPhase NewPhase)
{
    PresentationPhase = NewPhase;
    if (!bPresentationEnabled)
    {
        bCueActive = false;
        CueIntensity = 0.0f;
        return;
    }

    bCueActive = NewPhase != ETimeTravelPhase::Idle && NewPhase != ETimeTravelPhase::Failed;

    float BaseIntensity = 0.0f;
    switch (NewPhase)
    {
    case ETimeTravelPhase::Armed:
    case ETimeTravelPhase::Charging:
    case ETimeTravelPhase::ThresholdReached:
        BaseIntensity = 0.7f;
        break;
    case ETimeTravelPhase::Departing:
    case ETimeTravelPhase::SwitchingEra:
    case ETimeTravelPhase::Arriving:
        BaseIntensity = 1.0f;
        break;
    case ETimeTravelPhase::Cooldown:
        BaseIntensity = 0.3f;
        break;
    default:
        BaseIntensity = 0.0f;
        break;
    }
    CueIntensity = bReducedFlash ? BaseIntensity * 0.5f : BaseIntensity;
}

void UTimeTravelPresentationComponent::HandleSubsystemPhaseChanged(ETimeTravelPhase PreviousPhase, ETimeTravelPhase NewPhase)
{
    HandlePhaseChanged(NewPhase);
}
