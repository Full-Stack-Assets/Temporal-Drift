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

void UTimeTravelPresentationComponent::HandlePhaseChanged(ETimeTravelPhase NewPhase)
{
    PresentationPhase = NewPhase;
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
