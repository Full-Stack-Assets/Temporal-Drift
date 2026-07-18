#include "TemporalKernel/TemporalWorldAdapterSubsystem.h"

#include "TemporalKernel/TemporalCommandConsumerComponent.h"
#include "TemporalKernel/TemporalKernelSubsystem.h"
#include "Engine/GameInstance.h"
#include "Engine/World.h"

void UTemporalWorldAdapterSubsystem::Tick(float DeltaTime)
{
    RegisteredConsumers.RemoveAll([](const TWeakObjectPtr<UTemporalCommandConsumerComponent>& Consumer)
    {
        return !Consumer.IsValid();
    });

    UWorld* World = GetWorld();
    UGameInstance* GameInstance = World ? World->GetGameInstance() : nullptr;
    UTemporalKernelSubsystem* Kernel = GameInstance ? GameInstance->GetSubsystem<UTemporalKernelSubsystem>() : nullptr;
    if (!Kernel)
    {
        return;
    }

    TArray<UTemporalCommandConsumerComponent*> Consumers;
    for (const TWeakObjectPtr<UTemporalCommandConsumerComponent>& WeakConsumer : RegisteredConsumers)
    {
        if (UTemporalCommandConsumerComponent* Consumer = WeakConsumer.Get())
        {
            Consumers.Add(Consumer);
        }
    }
    Consumers.Sort([](const UTemporalCommandConsumerComponent& Left, const UTemporalCommandConsumerComponent& Right)
    {
        return Left.GetConsumerId().LexicalLess(Right.GetConsumerId());
    });

    const TArray<FSimulationCommandRecord> PendingCommands = Kernel->GetPendingCommands();
    for (const FSimulationCommandRecord& Command : PendingCommands)
    {
        for (UTemporalCommandConsumerComponent* Consumer : Consumers)
        {
            if (!Consumer || !Consumer->CanHandleCommand(Command))
            {
                continue;
            }

            const FName ConsumerId = Consumer->GetConsumerId();
            if (Command.AcknowledgedConsumers.Contains(ConsumerId))
            {
                continue;
            }

            Kernel->MarkCommandDelivered(Command.CommandId);
            if (Consumer->ReceiveTemporalCommand(Command))
            {
                Kernel->AcknowledgeCommand(Command.CommandId, ConsumerId);
            }
        }
    }
}

TStatId UTemporalWorldAdapterSubsystem::GetStatId() const
{
    RETURN_QUICK_DECLARE_CYCLE_STAT(UTemporalWorldAdapterSubsystem, STATGROUP_Tickables);
}

bool UTemporalWorldAdapterSubsystem::RegisterConsumer(UTemporalCommandConsumerComponent* Consumer)
{
    if (!Consumer || Consumer->GetConsumerId().IsNone())
    {
        return false;
    }

    const bool bDuplicateId = RegisteredConsumers.ContainsByPredicate([Consumer](const TWeakObjectPtr<UTemporalCommandConsumerComponent>& Existing)
    {
        return Existing.IsValid()
            && Existing.Get() != Consumer
            && Existing->GetConsumerId() == Consumer->GetConsumerId();
    });
    if (bDuplicateId)
    {
        return false;
    }

    RegisteredConsumers.AddUnique(Consumer);
    return true;
}

void UTemporalWorldAdapterSubsystem::UnregisterConsumer(UTemporalCommandConsumerComponent* Consumer)
{
    RegisteredConsumers.RemoveAll([Consumer](const TWeakObjectPtr<UTemporalCommandConsumerComponent>& Existing)
    {
        return !Existing.IsValid() || Existing.Get() == Consumer;
    });
}

int32 UTemporalWorldAdapterSubsystem::GetRegisteredConsumerCount() const
{
    int32 Count = 0;
    for (const TWeakObjectPtr<UTemporalCommandConsumerComponent>& Consumer : RegisteredConsumers)
    {
        Count += Consumer.IsValid() ? 1 : 0;
    }
    return Count;
}
