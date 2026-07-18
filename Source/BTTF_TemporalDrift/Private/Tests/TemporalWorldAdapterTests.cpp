#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "TemporalKernel/TemporalCommandConsumerComponent.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFTemporalCommandConsumerIdempotencyTest,
    "BTTF.TemporalKernel.Adapters.ConsumerIdempotency",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFTemporalCommandConsumerIdempotencyTest::RunTest(const FString& Parameters)
{
    UTemporalCommandConsumerComponent* Consumer = NewObject<UTemporalCommandConsumerComponent>();
    Consumer->ConsumerId = TEXT("Adapter.Test.DowntownPower");
    Consumer->SupportedCommandTypes = {TEXT("Command.World.SetPowerState")};

    FSimulationCommandRecord Supported;
    Supported.CommandId = FGuid(1, 2, 3, 4);
    Supported.CommandType = TEXT("Command.World.SetPowerState");
    Supported.Target = TEXT("District.HillValley.Downtown");

    FSimulationCommandRecord Unsupported;
    Unsupported.CommandId = FGuid(5, 6, 7, 8);
    Unsupported.CommandType = TEXT("Command.Audio.QueueRadioBulletin");

    TestTrue(TEXT("Configured command type is supported"), Consumer->CanHandleCommand(Supported));
    TestFalse(TEXT("Unconfigured command type is rejected"), Consumer->CanHandleCommand(Unsupported));
    TestTrue(TEXT("First delivery applies"), Consumer->ReceiveTemporalCommand(Supported));
    TestTrue(TEXT("Command is recorded as applied"), Consumer->HasAppliedCommand(Supported.CommandId));
    TestTrue(TEXT("Duplicate delivery succeeds idempotently"), Consumer->ReceiveTemporalCommand(Supported));
    TestFalse(TEXT("Unsupported delivery is not applied"), Consumer->ReceiveTemporalCommand(Unsupported));
    TestFalse(TEXT("Unsupported command is not recorded"), Consumer->HasAppliedCommand(Unsupported.CommandId));
    return !HasAnyErrors();
}

#endif
