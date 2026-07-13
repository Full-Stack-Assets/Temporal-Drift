#include "TimeTravelPresentationComponent.h"
#include "TimeTravelSubsystem.h"
#include "Components/PostProcessComponent.h"
#include "NiagaraComponent.h"
#include "NiagaraFunctionLibrary.h"
#include "Components/AudioComponent.h"
#include "Kismet/GameplayStatics.h"
#include "Materials/MaterialInterface.h"
#include "Sound/SoundBase.h"

UTimeTravelPresentationComponent::UTimeTravelPresentationComponent()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UTimeTravelPresentationComponent::BeginPlay()
{
    Super::BeginPlay();
    EnsureRuntimeComponents();

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
    ClearPresentationEffects();
    Super::EndPlay(EndPlayReason);
}

void UTimeTravelPresentationComponent::EnsureRuntimeComponents()
{
    AActor* Owner = GetOwner();
    if (!Owner)
    {
        return;
    }

    if (!PostProcessComponent)
    {
        PostProcessComponent = NewObject<UPostProcessComponent>(Owner, TEXT("TemporalPostProcess"));
        PostProcessComponent->SetupAttachment(Owner->GetRootComponent());
        PostProcessComponent->bUnbound = true;
        PostProcessComponent->Priority = 10.0f;
        Owner->AddInstanceComponent(PostProcessComponent);
        PostProcessComponent->RegisterComponent();
    }

    if (!PresentationNiagaraComponent)
    {
        PresentationNiagaraComponent = NewObject<UNiagaraComponent>(Owner, TEXT("TemporalNiagara"));
        PresentationNiagaraComponent->SetupAttachment(Owner->GetRootComponent());
        PresentationNiagaraComponent->bAutoActivate = false;
        Owner->AddInstanceComponent(PresentationNiagaraComponent);
        PresentationNiagaraComponent->RegisterComponent();
    }

    if (!PresentationAudioComponent)
    {
        PresentationAudioComponent = NewObject<UAudioComponent>(Owner, TEXT("TemporalAudio"));
        PresentationAudioComponent->SetupAttachment(Owner->GetRootComponent());
        PresentationAudioComponent->bAutoActivate = false;
        Owner->AddInstanceComponent(PresentationAudioComponent);
        PresentationAudioComponent->RegisterComponent();
    }
}

void UTimeTravelPresentationComponent::SetReducedFlash(bool bEnabled)
{
    bReducedFlash = bEnabled;
    ApplyPresentationEffects();
}

void UTimeTravelPresentationComponent::SetPresentationEnabled(bool bEnabled)
{
    bPresentationEnabled = bEnabled;
    if (!bPresentationEnabled)
    {
        ClearPresentationEffects();
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
        ClearPresentationEffects();
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
    ApplyPresentationEffects();
}

void UTimeTravelPresentationComponent::HandleSubsystemPhaseChanged(ETimeTravelPhase PreviousPhase, ETimeTravelPhase NewPhase)
{
    HandlePhaseChanged(NewPhase);
}

void UTimeTravelPresentationComponent::ApplyPresentationEffects()
{
    EnsureRuntimeComponents();
    if (!bPresentationEnabled || !bCueActive)
    {
        ClearPresentationEffects();
        return;
    }

    if (PostProcessComponent)
    {
        FPostProcessSettings& Settings = PostProcessComponent->Settings;
        Settings.WeightedBlendables.Array.Reset();

        const FSoftObjectPath MaterialPath = (PresentationPhase == ETimeTravelPhase::Arriving
            || PresentationPhase == ETimeTravelPhase::Cooldown)
            ? GetActiveArrivalMaterialPath()
            : GetActiveDistortionMaterialPath();

        if (UMaterialInterface* Material = Cast<UMaterialInterface>(MaterialPath.TryLoad()))
        {
            FWeightedBlendable Blendable;
            Blendable.Object = Material;
            Blendable.Weight = CueIntensity;
            Settings.WeightedBlendables.Array.Add(Blendable);
        }
        PostProcessComponent->BlendWeight = CueIntensity;
    }

    if (PresentationNiagaraComponent)
    {
        const FSoftObjectPath NiagaraPath = GetPhaseNiagaraPath(PresentationPhase);
        if (UNiagaraSystem* NiagaraSystem = Cast<UNiagaraSystem>(NiagaraPath.TryLoad()))
        {
            PresentationNiagaraComponent->SetAsset(NiagaraSystem);
            PresentationNiagaraComponent->SetFloatParameter(TEXT("CueIntensity"), CueIntensity);
            if (!PresentationNiagaraComponent->IsActive())
            {
                PresentationNiagaraComponent->Activate(true);
            }
        }
        else
        {
            PresentationNiagaraComponent->Deactivate();
        }
    }

    if (PresentationAudioComponent)
    {
        const FSoftObjectPath AudioPath = GetPhaseAudioPath(PresentationPhase);
        if (USoundBase* Sound = Cast<USoundBase>(AudioPath.TryLoad()))
        {
            if (PresentationAudioComponent->Sound != Sound)
            {
                PresentationAudioComponent->SetSound(Sound);
            }
            PresentationAudioComponent->SetVolumeMultiplier(CueIntensity);
            if (!PresentationAudioComponent->IsPlaying())
            {
                PresentationAudioComponent->Play();
            }
        }
        else
        {
            PresentationAudioComponent->Stop();
        }
    }
}

void UTimeTravelPresentationComponent::ClearPresentationEffects()
{
    if (PostProcessComponent)
    {
        PostProcessComponent->Settings.WeightedBlendables.Array.Reset();
        PostProcessComponent->BlendWeight = 0.0f;
    }
    if (PresentationNiagaraComponent)
    {
        PresentationNiagaraComponent->Deactivate();
    }
    if (PresentationAudioComponent)
    {
        PresentationAudioComponent->Stop();
    }
}
