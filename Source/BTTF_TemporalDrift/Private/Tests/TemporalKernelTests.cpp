#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "Engine/GameInstance.h"
#include "TemporalKernel/ClockTowerScenario.h"
#include "TemporalKernel/TemporalKernelSubsystem.h"

namespace TemporalKernelTestsPrivate
{
    UTemporalKernelSubsystem* MakeKernel()
    {
        UGameInstance* GameInstance = NewObject<UGameInstance>();
        UTemporalKernelSubsystem* Kernel = NewObject<UTemporalKernelSubsystem>(GameInstance);
        Kernel->ResetKernel();
        return Kernel;
    }

    bool ReadBool(UTemporalKernelSubsystem* Kernel, const TCHAR* FactId, bool& OutFound)
    {
        FTemporalFactRecord Record;
        OutFound = Kernel && Kernel->TryGetFact(FName(FactId), Record) && Record.Value.Type == ETemporalValueType::Boolean;
        return OutFound ? Record.Value.BoolValue : false;
    }

    int64 ReadNumeric(UTemporalKernelSubsystem* Kernel, const TCHAR* FactId, bool& OutFound)
    {
        FTemporalFactRecord Record;
        OutFound = Kernel && Kernel->TryGetFact(FName(FactId), Record) && Record.Value.IsNumeric();
        return OutFound ? Record.Value.AsComparableInteger() : 0;
    }

    FName ReadName(UTemporalKernelSubsystem* Kernel, const TCHAR* FactId, bool& OutFound)
    {
        FTemporalFactRecord Record;
        OutFound = Kernel && Kernel->TryGetFact(FName(FactId), Record) && Record.Value.Type == ETemporalValueType::Name;
        return OutFound ? Record.Value.NameValue : NAME_None;
    }

    FTemporalMutation SetBool(const TCHAR* MutationId, const TCHAR* FactId, bool Value)
    {
        FTemporalMutation Mutation;
        Mutation.MutationId = FName(MutationId);
        Mutation.FactId = FName(FactId);
        Mutation.Value = FTemporalValue::MakeBool(Value);
        return Mutation;
    }
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFTemporalKernelValueTest,
    "BTTF.TemporalKernel.TypedValues",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFTemporalKernelValueTest::RunTest(const FString& Parameters)
{
    const FTemporalValue BoolValue = FTemporalValue::MakeBool(true);
    const FTemporalValue IntegerValue = FTemporalValue::MakeInteger(42);
    const FTemporalValue FixedValue = FTemporalValue::MakeFixedPoint(725);
    const FTemporalValue NameValue = FTemporalValue::MakeName(TEXT("Drift"));
    const FTemporalValue TickValue = FTemporalValue::MakeTick(120);

    TestEqual(TEXT("Boolean type"), BoolValue.Type, ETemporalValueType::Boolean);
    TestTrue(TEXT("Boolean payload"), BoolValue.BoolValue);
    TestEqual(TEXT("Integer comparable value"), IntegerValue.AsComparableInteger(), static_cast<int64>(42));
    TestEqual(TEXT("Fixed-point comparable value"), FixedValue.AsComparableInteger(), static_cast<int64>(725));
    TestEqual(TEXT("Name payload"), NameValue.NameValue, FName(TEXT("Drift")));
    TestEqual(TEXT("Tick comparable value"), TickValue.AsComparableInteger(), static_cast<int64>(120));
    TestTrue(TEXT("Canonical values distinguish types"), IntegerValue.ToCanonicalString() != FixedValue.ToCanonicalString());
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFTemporalKernelClockTowerLoopTest,
    "BTTF.TemporalKernel.ClockTower.TransactionalLoop",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFTemporalKernelClockTowerLoopTest::RunTest(const FString& Parameters)
{
    using namespace TemporalKernelTestsPrivate;

    UTemporalKernelSubsystem* Kernel = MakeKernel();
    FString InstallError;
    TestTrue(TEXT("Clock Tower scenario installs"), FClockTowerScenario::Install(Kernel, InstallError));
    TestTrue(TEXT("Install error is empty"), InstallError.IsEmpty());

    const FTemporalTransactionResult Result = FClockTowerScenario::SubmitDisturbance(Kernel);
    TestTrue(TEXT("Clock Tower transaction commits"), Result.bCommitted);
    TestEqual(TEXT("Local Power Outage is selected"), Result.Trace.SelectedEventId, FName(TEXT("Event.HillValley.LocalPowerOutage")));

    bool bFound = false;
    TestTrue(TEXT("Clock Tower anomaly activates"), ReadBool(Kernel, TEXT("ClockTower.AnomalyActive"), bFound));
    TestTrue(TEXT("Clock Tower anomaly fact found"), bFound);
    TestEqual(TEXT("Power grid stress propagates"), ReadNumeric(Kernel, TEXT("HillValley.PowerGrid.Stress"), bFound), static_cast<int64>(720));
    TestTrue(TEXT("Power grid risk activates"), ReadBool(Kernel, TEXT("HillValley.PowerGrid.AtRisk"), bFound));
    TestFalse(TEXT("Power grid goes offline"), ReadBool(Kernel, TEXT("HillValley.PowerGrid.Online"), bFound));
    TestTrue(TEXT("Outage becomes active"), ReadBool(Kernel, TEXT("Event.HillValley.LocalPowerOutage.Active"), bFound));
    TestEqual(TEXT("Final stability includes active outage cost"), ReadNumeric(Kernel, TEXT("Timeline.Stability"), bFound), static_cast<int64>(760));
    TestEqual(TEXT("Stability band remains Drift"), ReadName(Kernel, TEXT("Timeline.StabilityBand"), bFound), FName(TEXT("Drift")));

    TestEqual(TEXT("Five adapter commands emitted"), Kernel->GetPendingCommands().Num(), 5);
    TestEqual(TEXT("One news publication emitted"), Kernel->GetNewsPublications().Num(), 1);
    TestEqual(TEXT("One event instance persisted"), Kernel->GetEventInstances().Num(), 1);
    TestTrue(TEXT("Truth hash is populated"), Kernel->GetSimulationTruthHash() != 0);
    TestTrue(TEXT("Persistence hash is populated"), Kernel->GetFullPersistenceHash() != 0);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFTemporalKernelDeterminismTest,
    "BTTF.TemporalKernel.Determinism.RepeatedScenario",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFTemporalKernelDeterminismTest::RunTest(const FString& Parameters)
{
    using namespace TemporalKernelTestsPrivate;

    UTemporalKernelSubsystem* First = MakeKernel();
    UTemporalKernelSubsystem* Second = MakeKernel();
    FString Error;
    TestTrue(TEXT("First scenario installs"), FClockTowerScenario::Install(First, Error));
    TestTrue(TEXT("Second scenario installs"), FClockTowerScenario::Install(Second, Error));

    const FTemporalTransactionResult FirstResult = FClockTowerScenario::SubmitDisturbance(First);
    const FTemporalTransactionResult SecondResult = FClockTowerScenario::SubmitDisturbance(Second);
    TestTrue(TEXT("First transaction commits"), FirstResult.bCommitted);
    TestTrue(TEXT("Second transaction commits"), SecondResult.bCommitted);
    TestEqual(TEXT("Selected event is reproducible"), FirstResult.Trace.SelectedEventId, SecondResult.Trace.SelectedEventId);
    TestEqual(TEXT("Truth hash is reproducible"), First->GetSimulationTruthHash(), Second->GetSimulationTruthHash());
    TestEqual(TEXT("Persistence hash is reproducible"), First->GetFullPersistenceHash(), Second->GetFullPersistenceHash());
    TestEqual(TEXT("Command IDs are reproducible"), FirstResult.Trace.GeneratedCommandIds, SecondResult.Trace.GeneratedCommandIds);
    TestEqual(TEXT("News IDs are reproducible"), FirstResult.Trace.GeneratedNewsIds, SecondResult.Trace.GeneratedNewsIds);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFTemporalKernelDerivedFactProtectionTest,
    "BTTF.TemporalKernel.Transactions.DerivedFactProtection",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFTemporalKernelDerivedFactProtectionTest::RunTest(const FString& Parameters)
{
    using namespace TemporalKernelTestsPrivate;

    UTemporalKernelSubsystem* Kernel = MakeKernel();
    FString Error;
    TestTrue(TEXT("Scenario installs"), FClockTowerScenario::Install(Kernel, Error));
    const int64 BeforeHash = Kernel->GetSimulationTruthHash();

    FTemporalMutation Mutation;
    Mutation.MutationId = TEXT("Test.OverrideStability");
    Mutation.FactId = TEXT("Timeline.Stability");
    Mutation.Value = FTemporalValue::MakeFixedPoint(1000);

    FTemporalTransactionRequest Request;
    Request.SourceId = TEXT("Test.ExternalAdapter");
    Request.PrimaryMutations = {Mutation};
    const FTemporalTransactionResult Result = Kernel->SubmitTransaction(Request);

    TestFalse(TEXT("External derived-fact mutation is rejected"), Result.bCommitted);
    TestTrue(TEXT("Failure explains derived ownership"), Result.Error.Contains(TEXT("derived fact")));
    TestEqual(TEXT("Rejected transaction leaves truth unchanged"), Kernel->GetSimulationTruthHash(), BeforeHash);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFTemporalKernelCycleRollbackTest,
    "BTTF.TemporalKernel.Rules.CycleRollback",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFTemporalKernelCycleRollbackTest::RunTest(const FString& Parameters)
{
    using namespace TemporalKernelTestsPrivate;

    UTemporalKernelSubsystem* Kernel = MakeKernel();
    TestTrue(TEXT("Cycle A fact registers"), Kernel->RegisterFact(TEXT("Cycle.A"), FTemporalValue::MakeBool(false), true, TEXT("Rule.Cycle.A")));
    TestTrue(TEXT("Cycle B fact registers"), Kernel->RegisterFact(TEXT("Cycle.B"), FTemporalValue::MakeBool(false), true, TEXT("Rule.Cycle.B")));

    FTemporalRuleDefinition RuleA;
    RuleA.RuleId = TEXT("Rule.Cycle.A");
    FTemporalCondition BFalse;
    BFalse.FactId = TEXT("Cycle.B");
    BFalse.ExpectedValue = FTemporalValue::MakeBool(false);
    RuleA.Conditions = {BFalse};
    RuleA.TrueMutations = {SetBool(TEXT("Cycle.A.On"), TEXT("Cycle.A"), true)};
    RuleA.FalseMutations = {SetBool(TEXT("Cycle.A.Off"), TEXT("Cycle.A"), false)};
    TestTrue(TEXT("Cycle rule A registers"), Kernel->RegisterRule(RuleA));

    FTemporalRuleDefinition RuleB;
    RuleB.RuleId = TEXT("Rule.Cycle.B");
    FTemporalCondition ATrue;
    ATrue.FactId = TEXT("Cycle.A");
    ATrue.ExpectedValue = FTemporalValue::MakeBool(true);
    RuleB.Conditions = {ATrue};
    RuleB.TrueMutations = {SetBool(TEXT("Cycle.B.On"), TEXT("Cycle.B"), true)};
    RuleB.FalseMutations = {SetBool(TEXT("Cycle.B.Off"), TEXT("Cycle.B"), false)};
    TestTrue(TEXT("Cycle rule B registers"), Kernel->RegisterRule(RuleB));

    const int64 BeforeHash = Kernel->GetSimulationTruthHash();
    FTemporalTransactionRequest Request;
    Request.SourceId = TEXT("Test.Cycle");
    const FTemporalTransactionResult Result = Kernel->SubmitTransaction(Request);

    TestFalse(TEXT("Cyclic transaction aborts"), Result.bCommitted);
    TestTrue(TEXT("Cycle is diagnosed"), Result.Trace.bCycleDetected);
    TestEqual(TEXT("Cycle rollback preserves truth"), Kernel->GetSimulationTruthHash(), BeforeHash);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFTemporalKernelSaveRoundTripTest,
    "BTTF.TemporalKernel.Persistence.SaveRoundTrip",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFTemporalKernelSaveRoundTripTest::RunTest(const FString& Parameters)
{
    using namespace TemporalKernelTestsPrivate;

    UTemporalKernelSubsystem* Source = MakeKernel();
    FString Error;
    TestTrue(TEXT("Source scenario installs"), FClockTowerScenario::Install(Source, Error));
    TestTrue(TEXT("Source transaction commits"), FClockTowerScenario::SubmitDisturbance(Source).bCommitted);

    const FTemporalKernelSaveData Snapshot = Source->ExportSaveData();
    UTemporalKernelSubsystem* Restored = MakeKernel();
    TestTrue(TEXT("Definitions install before restore"), FClockTowerScenario::Install(Restored, Error));
    TestTrue(TEXT("Kernel snapshot imports"), Restored->ImportSaveData(Snapshot, Error));
    TestTrue(TEXT("Restore error is empty"), Error.IsEmpty());
    TestEqual(TEXT("Truth hash survives round trip"), Restored->GetSimulationTruthHash(), Source->GetSimulationTruthHash());
    TestEqual(TEXT("Persistence hash survives round trip"), Restored->GetFullPersistenceHash(), Source->GetFullPersistenceHash());
    TestEqual(TEXT("Event is not duplicated"), Restored->GetEventInstances().Num(), 1);
    TestEqual(TEXT("Commands are not duplicated"), Restored->GetPendingCommands().Num(), 5);
    TestEqual(TEXT("News is not duplicated"), Restored->GetNewsPublications().Num(), 1);
    return !HasAnyErrors();
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(
    FBTTFTemporalKernelCommandIdempotencyTest,
    "BTTF.TemporalKernel.Commands.IdempotentAcknowledgement",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFTemporalKernelCommandIdempotencyTest::RunTest(const FString& Parameters)
{
    using namespace TemporalKernelTestsPrivate;

    UTemporalKernelSubsystem* Kernel = MakeKernel();
    FString Error;
    TestTrue(TEXT("Scenario installs"), FClockTowerScenario::Install(Kernel, Error));
    TestTrue(TEXT("Scenario transaction commits"), FClockTowerScenario::SubmitDisturbance(Kernel).bCommitted);

    const TArray<FSimulationCommandRecord> Commands = Kernel->GetPendingCommands();
    TestTrue(TEXT("At least one command exists"), !Commands.IsEmpty());
    if (!Commands.IsEmpty())
    {
        const FGuid CommandId = Commands[0].CommandId;
        TestTrue(TEXT("First acknowledgement succeeds"), Kernel->AcknowledgeCommand(CommandId, TEXT("Adapter.Test")));
        const int64 AfterFirst = Kernel->GetFullPersistenceHash();
        TestTrue(TEXT("Repeated acknowledgement succeeds idempotently"), Kernel->AcknowledgeCommand(CommandId, TEXT("Adapter.Test")));
        TestEqual(TEXT("Repeated acknowledgement does not change persistence"), Kernel->GetFullPersistenceHash(), AfterFirst);
    }
    return !HasAnyErrors();
}

#endif
