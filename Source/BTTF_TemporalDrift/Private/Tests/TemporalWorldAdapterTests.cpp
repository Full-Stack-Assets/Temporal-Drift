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
    Consumer->SupportedTargets = {TEXT("District.HillValley.Downtown")};

    FSimulationCommandRecord Supported;
    Supported.CommandId = FGuid(1, 2, 3, 4);
    Supported.CommandType = TEXT("Command.World.SetPowerState");
    Supported.Target = TEXT("District.HillValley.Downtown");

    FSimulationCommandRecord WrongTarget = Supported;
    WrongTarget.CommandId = FGuid(9, 10, 11, 12);
    WrongTarget.Target = TEXT("District.HillValley.Industrial");

    FSimulationCommandRecord Unsupported;
    Unsupported.CommandId = FGuid(5, 6, 7, 8);
    Unsupported.CommandType = TEXT("Command.Audio.QueueRadioBulletin");
    Unsupported.Target = TEXT("Radio.HillValleyEmergency");

    TestTrue(TEXT("Configured type and target are supported"), Consumer->CanHandleCommand(Supported));
    TestFalse(TEXT("Configured type with wrong target is rejected"), Consumer->CanHandleCommand(WrongTarget));
    TestFalse(TEXT("Unconfigured command type is rejected"), Consumer->CanHandleCommand(Unsupported));
    TestTrue(TEXT("First delivery applies"), Consumer->ReceiveTemporalCommand(Supported));
    TestTrue(TEXT("Command is recorded as applied"), Consumer->HasAppliedCommand(Supported.CommandId));
    TestTrue(TEXT("Duplicate delivery succeeds idempotently"), Consumer->ReceiveTemporalCommand(Supported));
    TestFalse(TEXT("Wrong-target delivery is not applied"), Consumer->ReceiveTemporalCommand(WrongTarget));
    TestFalse(TEXT("Unsupported delivery is not applied"), Consumer->ReceiveTemporalCommand(Unsupported));
    TestFalse(TEXT("Wrong-target command is not recorded"), Consumer->HasAppliedCommand(WrongTarget.CommandId));
    TestFalse(TEXT("Unsupported command is not recorded"), Consumer->HasAppliedCommand(Unsupported.CommandId));
    return !HasAnyErrors();
}

#endif
