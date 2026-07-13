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
}

void UTimeTravelPresentationComponent::HandleSubsystemPhaseChanged(ETimeTravelPhase PreviousPhase, ETimeTravelPhase NewPhase)
{
    HandlePhaseChanged(NewPhase);
}
