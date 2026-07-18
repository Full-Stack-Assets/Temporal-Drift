#include "TemporalKernel/ClockTowerScenario.h"

#include "TemporalKernel/TemporalKernelSubsystem.h"

namespace ClockTowerScenarioPrivate
{
    FTemporalCondition BoolCondition(const TCHAR* FactId, bool Expected)
    {
        FTemporalCondition Condition;
        Condition.FactId = FName(FactId);
        Condition.Comparison = ETemporalComparison::Equal;
        Condition.ExpectedValue = FTemporalValue::MakeBool(Expected);
        return Condition;
    }

    FTemporalCondition NumericCondition(const TCHAR* FactId, ETemporalComparison Comparison, int64 Expected)
    {
        FTemporalCondition Condition;
        Condition.FactId = FName(FactId);
        Condition.Comparison = Comparison;
        Condition.ExpectedValue = FTemporalValue::MakeFixedPoint(Expected);
        return Condition;
    }

    FTemporalMutation SetBool(const TCHAR* MutationId, const TCHAR* FactId, bool Value)
    {
        FTemporalMutation Mutation;
        Mutation.MutationId = FName(MutationId);
        Mutation.FactId = FName(FactId);
        Mutation.Operation = ETemporalMutationOperation::Set;
        Mutation.Value = FTemporalValue::MakeBool(Value);
        return Mutation;
    }

    FTemporalMutation SetFixed(const TCHAR* MutationId, const TCHAR* FactId, int64 Value)
    {
        FTemporalMutation Mutation;
        Mutation.MutationId = FName(MutationId);
        Mutation.FactId = FName(FactId);
        Mutation.Operation = ETemporalMutationOperation::Set;
        Mutation.Value = FTemporalValue::MakeFixedPoint(Value);
        return Mutation;
    }

    FSimulationCommandTemplate Command(const TCHAR* Type, const TCHAR* Target, const TCHAR* PayloadName, const FTemporalValue& Payload)
    {
        FSimulationCommandTemplate Result;
        Result.CommandType = FName(Type);
        Result.Target = FName(Target);
        Result.PayloadName = FName(PayloadName);
        Result.PayloadValue = Payload;
        return Result;
    }
}

bool FClockTowerScenario::Install(UTemporalKernelSubsystem* Kernel, FString& OutError)
{
    using namespace ClockTowerScenarioPrivate;

    if (!Kernel)
    {
        OutError = TEXT("Clock Tower scenario requires a Temporal Kernel subsystem.");
        return false;
    }

    Kernel->ResetKernel(19551112);

    auto Register = [Kernel, &OutError](const TCHAR* Id, const FTemporalValue& Value, bool bDerived = false, const TCHAR* Owner = nullptr)
    {
        if (!Kernel->RegisterFact(FName(Id), Value, bDerived, Owner ? FName(Owner) : NAME_None))
        {
            OutError = FString::Printf(TEXT("Failed to register fact '%s'."), Id);
            return false;
        }
        return true;
    };

    if (!Register(TEXT("ClockTower.ElectricalStress"), FTemporalValue::MakeFixedPoint(200))) return false;
    if (!Register(TEXT("ClockTower.AnomalyActive"), FTemporalValue::MakeBool(false), true, TEXT("Rule.ClockTower.HighStress"))) return false;
    if (!Register(TEXT("HillValley.PowerGrid.Stress"), FTemporalValue::MakeFixedPoint(200), true, TEXT("Rule.PowerGrid.ClockTowerLoad"))) return false;
    if (!Register(TEXT("HillValley.PowerGrid.AtRisk"), FTemporalValue::MakeBool(false), true, TEXT("Rule.PowerGrid.AtRisk"))) return false;
    if (!Register(TEXT("HillValley.PowerGrid.Online"), FTemporalValue::MakeBool(true), true, TEXT("Event.HillValley.LocalPowerOutage"))) return false;
    if (!Register(TEXT("Timeline.TemporalStress"), FTemporalValue::MakeFixedPoint(100))) return false;
    if (!Register(TEXT("Timeline.CanonicalDivergence"), FTemporalValue::MakeInteger(0))) return false;
    if (!Register(TEXT("Timeline.ContradictionPressure"), FTemporalValue::MakeInteger(0))) return false;
    if (!Register(TEXT("Timeline.RepairComplete"), FTemporalValue::MakeBool(false))) return false;
    if (!Register(TEXT("Timeline.Stability"), FTemporalValue::MakeFixedPoint(920), true, TEXT("System.Stability"))) return false;
    if (!Register(TEXT("Timeline.StabilityBand"), FTemporalValue::MakeName(TEXT("Stable")), true, TEXT("System.Stability"))) return false;
    if (!Register(TEXT("Event.HillValley.LocalPowerOutage.Active"), FTemporalValue::MakeBool(false), true, TEXT("Event.HillValley.LocalPowerOutage"))) return false;

    FTemporalRuleDefinition HighStress;
    HighStress.RuleId = TEXT("Rule.ClockTower.HighStress");
    HighStress.Phase = ETemporalRulePhase::DirectConsequences;
    HighStress.Priority = 100;
    HighStress.Conditions = {NumericCondition(TEXT("ClockTower.ElectricalStress"), ETemporalComparison::GreaterOrEqual, 700)};
    HighStress.TrueMutations = {SetBool(TEXT("ClockTower.Anomaly.On"), TEXT("ClockTower.AnomalyActive"), true)};
    HighStress.FalseMutations = {SetBool(TEXT("ClockTower.Anomaly.Off"), TEXT("ClockTower.AnomalyActive"), false)};
    if (!Kernel->RegisterRule(HighStress))
    {
        OutError = TEXT("Failed to register Clock Tower stress rule.");
        return false;
    }

    FTemporalRuleDefinition GridLoad;
    GridLoad.RuleId = TEXT("Rule.PowerGrid.ClockTowerLoad");
    GridLoad.Phase = ETemporalRulePhase::WorldState;
    GridLoad.Priority = 90;
    GridLoad.Conditions = {BoolCondition(TEXT("ClockTower.AnomalyActive"), true)};
    GridLoad.TrueMutations = {SetFixed(TEXT("PowerGrid.Stress.High"), TEXT("HillValley.PowerGrid.Stress"), 720)};
    GridLoad.FalseMutations = {SetFixed(TEXT("PowerGrid.Stress.Normal"), TEXT("HillValley.PowerGrid.Stress"), 200)};
    if (!Kernel->RegisterRule(GridLoad))
    {
        OutError = TEXT("Failed to register Clock Tower grid-load rule.");
        return false;
    }

    FTemporalRuleDefinition GridRisk;
    GridRisk.RuleId = TEXT("Rule.PowerGrid.AtRisk");
    GridRisk.Phase = ETemporalRulePhase::WorldState;
    GridRisk.Priority = 80;
    GridRisk.Conditions = {NumericCondition(TEXT("HillValley.PowerGrid.Stress"), ETemporalComparison::GreaterOrEqual, 700)};
    GridRisk.TrueMutations = {SetBool(TEXT("PowerGrid.Risk.On"), TEXT("HillValley.PowerGrid.AtRisk"), true)};
    GridRisk.FalseMutations = {SetBool(TEXT("PowerGrid.Risk.Off"), TEXT("HillValley.PowerGrid.AtRisk"), false)};
    if (!Kernel->RegisterRule(GridRisk))
    {
        OutError = TEXT("Failed to register power-grid risk rule.");
        return false;
    }

    FTemporalEventDefinition PowerOutage;
    PowerOutage.EventId = TEXT("Event.HillValley.LocalPowerOutage");
    PowerOutage.Priority = 100;
    PowerOutage.EligibilityConditions = {
        BoolCondition(TEXT("ClockTower.AnomalyActive"), true),
        NumericCondition(TEXT("HillValley.PowerGrid.Stress"), ETemporalComparison::GreaterOrEqual, 700),
        NumericCondition(TEXT("Timeline.Stability"), ETemporalComparison::Less, 850)};
    PowerOutage.ExclusionConditions = {BoolCondition(TEXT("Event.HillValley.LocalPowerOutage.Active"), true)};
    PowerOutage.FactMutations = {
        SetBool(TEXT("PowerGrid.Offline"), TEXT("HillValley.PowerGrid.Online"), false),
        SetBool(TEXT("PowerOutage.Active"), TEXT("Event.HillValley.LocalPowerOutage.Active"), true)};
    PowerOutage.Commands = {
        Command(TEXT("Command.World.SetPowerState"), TEXT("District.HillValley.Downtown"), TEXT("Online"), FTemporalValue::MakeBool(false)),
        Command(TEXT("Command.Weather.ApplyElectricalDisturbance"), TEXT("District.HillValley.ClockTower"), TEXT("Intensity"), FTemporalValue::MakeFixedPoint(350)),
        Command(TEXT("Command.Population.ApplyConcernModifier"), TEXT("District.HillValley.Downtown"), TEXT("Concern"), FTemporalValue::MakeFixedPoint(200)),
        Command(TEXT("Command.Mission.UnlockOpportunity"), TEXT("Mission.InvestigateClockTowerAnomaly"), TEXT("Unlocked"), FTemporalValue::MakeBool(true)),
        Command(TEXT("Command.Audio.QueueRadioBulletin"), TEXT("Radio.HillValleyEmergency"), TEXT("Story"), FTemporalValue::MakeName(TEXT("News.ClockTower.ElectricalDisturbance")))};
    PowerOutage.MaxOccurrences = 1;
    PowerOutage.CooldownTicks = 600;
    PowerOutage.DurationTicks = 300;

    FTemporalNewsTemplate OutageNews;
    OutageNews.StoryId = TEXT("News.ClockTower.ElectricalDisturbance");
    OutageNews.EraId = TEXT("Era.1955");
    OutageNews.DistrictId = TEXT("District.HillValley.Downtown");
    OutageNews.LifetimeTicks = 3600;
    OutageNews.Context.Add(TEXT("Location"), FTemporalValue::MakeName(TEXT("ClockTowerDistrict")));
    OutageNews.Context.Add(TEXT("GridStatus"), FTemporalValue::MakeName(TEXT("Offline")));
    OutageNews.Context.Add(TEXT("CauseClassification"), FTemporalValue::MakeName(TEXT("UnknownElectricalSurge")));
    PowerOutage.News = {OutageNews};

    if (!Kernel->RegisterEvent(PowerOutage))
    {
        OutError = TEXT("Failed to register Local Power Outage event.");
        return false;
    }

    FTemporalEventDefinition ElectricalSurge;
    ElectricalSurge.EventId = TEXT("Event.ClockTower.ElectricalSurge");
    ElectricalSurge.Priority = 80;
    ElectricalSurge.EligibilityConditions = {BoolCondition(TEXT("ClockTower.AnomalyActive"), true)};
    ElectricalSurge.ExclusionConditions = {BoolCondition(TEXT("Event.HillValley.LocalPowerOutage.Active"), true)};
    ElectricalSurge.Commands = {
        Command(TEXT("Command.Weather.ApplyElectricalDisturbance"), TEXT("District.HillValley.ClockTower"), TEXT("Intensity"), FTemporalValue::MakeFixedPoint(200))};
    ElectricalSurge.MaxOccurrences = 1;
    ElectricalSurge.DurationTicks = 120;
    if (!Kernel->RegisterEvent(ElectricalSurge))
    {
        OutError = TEXT("Failed to register Clock Tower Electrical Surge event.");
        return false;
    }

    FTemporalEventDefinition PublicRumor;
    PublicRumor.EventId = TEXT("Event.Public.AnomalyRumor");
    PublicRumor.Priority = 30;
    PublicRumor.EligibilityConditions = {BoolCondition(TEXT("ClockTower.AnomalyActive"), true)};
    PublicRumor.ExclusionConditions = {BoolCondition(TEXT("Event.HillValley.LocalPowerOutage.Active"), true)};
    PublicRumor.MaxOccurrences = 1;
    PublicRumor.DurationTicks = 60;
    FTemporalNewsTemplate RumorNews;
    RumorNews.StoryId = TEXT("News.Public.ClockTowerRumor");
    RumorNews.EraId = TEXT("Era.1955");
    RumorNews.DistrictId = TEXT("District.HillValley.Downtown");
    RumorNews.Context.Add(TEXT("Reliability"), FTemporalValue::MakeName(TEXT("Unconfirmed")));
    PublicRumor.News = {RumorNews};
    if (!Kernel->RegisterEvent(PublicRumor))
    {
        OutError = TEXT("Failed to register public anomaly-rumor event.");
        return false;
    }

    OutError.Reset();
    return true;
}

FTemporalTransactionResult FClockTowerScenario::SubmitDisturbance(UTemporalKernelSubsystem* Kernel)
{
    FTemporalTransactionResult Result;
    if (!Kernel)
    {
        Result.Error = TEXT("Clock Tower scenario requires a Temporal Kernel subsystem.");
        return Result;
    }

    FTemporalMutation ElectricalStress;
    ElectricalStress.MutationId = TEXT("Gameplay.ClockTower.Activation.ElectricalStress");
    ElectricalStress.FactId = TEXT("ClockTower.ElectricalStress");
    ElectricalStress.Operation = ETemporalMutationOperation::Set;
    ElectricalStress.Value = FTemporalValue::MakeFixedPoint(850);

    FTemporalMutation TemporalStress;
    TemporalStress.MutationId = TEXT("Gameplay.ClockTower.Activation.TemporalStress");
    TemporalStress.FactId = TEXT("Timeline.TemporalStress");
    TemporalStress.Operation = ETemporalMutationOperation::Add;
    TemporalStress.Value = FTemporalValue::MakeFixedPoint(100);

    FTemporalTransactionRequest Request;
    Request.SourceId = TEXT("Gameplay.ClockTower.TemporalComponentActivation");
    Request.PrimaryMutations = {ElectricalStress, TemporalStress};
    return Kernel->SubmitTransaction(Request);
}
