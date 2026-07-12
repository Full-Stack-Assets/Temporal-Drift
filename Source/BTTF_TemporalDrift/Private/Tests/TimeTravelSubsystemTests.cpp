#if WITH_DEV_AUTOMATION_TESTS

#include "Misc/AutomationTest.h"
#include "TimeTravelSubsystem.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FBTTFTimeTravelStateMachineTest,
    "BTTF.TimeTravel.DeterministicStateMachine",
    EAutomationTestFlags::EditorContext | EAutomationTestFlags::EngineFilter)

bool FBTTFTimeTravelStateMachineTest::RunTest(const FString& Parameters)
{
    UTimeTravelSubsystem* System = NewObject<UTimeTravelSubsystem>();
    System->ResetTimeTravelState();

    System->AddFluxEnergy(-50.0f);
    TestEqual(TEXT("Energy clamps at zero"), System->CurrentFluxEnergy, 0.0f);
    System->AddFluxEnergy(System->FluxCapacitorMaxEnergy * 2.0f);
    TestEqual(TEXT("Energy clamps at maximum"), System->CurrentFluxEnergy, System->FluxCapacitorMaxEnergy);

    FTimeTravelRequest Request;
    Request.Destination = ETimelineState::Past1955;
    Request.EntrySpeedMph = 87.9f;
    TestFalse(TEXT("Unarmed request is rejected"), System->RequestTimeTravel(Request));

    System->SetTimeCircuitsArmed(true);
    TestEqual(TEXT("Arming enters Armed phase"), System->GetTimeTravelPhase(), ETimeTravelPhase::Armed);
    TestFalse(TEXT("Sub-threshold request is rejected"), System->RequestTimeTravel(Request));

    Request.EntrySpeedMph = 88.0f;
    TestTrue(TEXT("Valid request begins departure"), System->RequestTimeTravel(Request));
    TestEqual(TEXT("Threshold is reached first"), System->GetTimeTravelPhase(), ETimeTravelPhase::ThresholdReached);
    TestFalse(TEXT("Duplicate request is rejected"), System->RequestTimeTravel(Request));

    TestTrue(TEXT("Advance to departing"), System->AdvanceTimeTravelPhase());
    TestEqual(TEXT("Departing phase"), System->GetTimeTravelPhase(), ETimeTravelPhase::Departing);
    TestTrue(TEXT("Advance to switching era"), System->AdvanceTimeTravelPhase());
    TestEqual(TEXT("Switching phase"), System->GetTimeTravelPhase(), ETimeTravelPhase::SwitchingEra);
    TestTrue(TEXT("Advance to arriving"), System->AdvanceTimeTravelPhase());
    TestEqual(TEXT("Arriving phase"), System->GetTimeTravelPhase(), ETimeTravelPhase::Arriving);
    TestTrue(TEXT("Advance to cooldown"), System->AdvanceTimeTravelPhase());
    TestEqual(TEXT("Cooldown phase"), System->GetTimeTravelPhase(), ETimeTravelPhase::Cooldown);
    TestTrue(TEXT("Cooldown completes"), System->AdvanceTimeTravelPhase());
    TestEqual(TEXT("Returns to idle"), System->GetTimeTravelPhase(), ETimeTravelPhase::Idle);
    TestEqual(TEXT("Energy consumed once"), System->CurrentFluxEnergy,
        System->FluxCapacitorMaxEnergy - System->EnergyDrainOnJump);
    TestEqual(TEXT("Era changed once"), System->GetCurrentEra(), ETimelineState::Past1955);
    return !HasAnyErrors();
}

#endif
