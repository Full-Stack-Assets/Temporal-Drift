#include "TemporalKernel/TemporalCommandConsumerComponent.h"

#include "TemporalKernel/TemporalWorldAdapterSubsystem.h"
#include "Engine/World.h"

UTemporalCommandConsumerComponent::UTemporalCommandConsumerComponent()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UTemporalCommandConsumerComponent::BeginPlay()
{
    Super::BeginPlay();

    if (UWorld* World = GetWorld())
    {
        if (UTemporalWorldAdapterSubsystem* Adapter = World->GetSubsystem<UTemporalWorldAdapterSubsystem>())
        {
            Adapter->RegisterConsumer(this);
        }
    }
}

void UTemporalCommandConsumerComponent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    if (UWorld* World = GetWorld())
    {
        if (UTemporalWorldAdapterSubsystem* Adapter = World->GetSubsystem<UTemporalWorldAdapterSubsystem>())
        {
            Adapter->UnregisterConsumer(this);
        }
    }

    Super::EndPlay(EndPlayReason);
}

bool UTemporalCommandConsumerComponent::CanHandleCommand(const FSimulationCommandRecord& Command) const
{
    if (ConsumerId.IsNone() || !SupportedCommandTypes.Contains(Command.CommandType))
    {
        return false;
    }

    return SupportedTargets.IsEmpty() || SupportedTargets.Contains(Command.Target);
}

bool UTemporalCommandConsumerComponent::ReceiveTemporalCommand(const FSimulationCommandRecord& Command)
{
    if (!CanHandleCommand(Command))
    {
        return false;
    }

    if (AppliedCommandIds.Contains(Command.CommandId))
    {
        return true;
    }

    AppliedCommandIds.Add(Command.CommandId);
    OnCommandReceived.Broadcast(Command);
    return true;
}
