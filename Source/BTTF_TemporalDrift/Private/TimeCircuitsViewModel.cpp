#include "TimeCircuitsViewModel.h"
#include "TemporalDriftSettings.h"

void UTimeCircuitsViewModel::UpdateDisplay(float SpeedMph, float FluxPercent,
    ETimelineState CurrentEra, ETimelineState DestinationEra, ETimeTravelPhase Phase,
    float ParadoxPercent, float StabilityPercent, const FText& ExplicitFailureReason,
    const FText& MissionObjective, const FText& NowPlaying)
{
    DisplayState.SpeedText = FText::FromString(FString::Printf(TEXT("%.0f MPH"), SpeedMph));
    DisplayState.FluxPercent = FMath::Clamp(FluxPercent, 0.0f, 1.0f);
    DisplayState.FluxText = FText::FromString(FString::Printf(TEXT("%.0f%%"), DisplayState.FluxPercent * 100.0f));
    DisplayState.CurrentEraText = FormatEra(CurrentEra);
    DisplayState.DestinationEraText = FormatEra(DestinationEra);
    DisplayState.PhaseText = FormatPhase(Phase);

    const float JumpThreshold = GetDefault<UTemporalDriftSettings>()->JumpSpeedThresholdMph;
    DisplayState.bJumpReady = SpeedMph >= JumpThreshold && DisplayState.FluxPercent >= 0.92f &&
        (Phase == ETimeTravelPhase::Armed || Phase == ETimeTravelPhase::Charging);
    DisplayState.bDangerWarning = !ExplicitFailureReason.IsEmpty() || ParadoxPercent >= 70.0f || StabilityPercent < 40.0f;

    if (!ExplicitFailureReason.IsEmpty())
    {
        DisplayState.WarningText = ExplicitFailureReason;
    }
    else if (ParadoxPercent >= 90.0f)
    {
        DisplayState.WarningText = FText::FromString(TEXT("CRITICAL: TIMELINE COLLAPSE"));
    }
    else if (ParadoxPercent >= 70.0f)
    {
        DisplayState.WarningText = FText::FromString(TEXT("DANGER: TIMELINE UNSTABLE"));
    }
    else if (StabilityPercent < 40.0f)
    {
        DisplayState.WarningText = FText::FromString(TEXT("WORMHOLE STABILITY LOW"));
    }
    else
    {
        DisplayState.WarningText = FText::GetEmpty();
    }

    DisplayState.MissionObjectiveText = MissionObjective;
    DisplayState.NowPlayingText = NowPlaying;
    OnDisplayChanged.Broadcast(DisplayState);
}

ETimelineState UTimeCircuitsViewModel::CycleDestination(ETimelineState CurrentDestination, int32 Direction) const
{
    static const ETimelineState SupportedEras[] = {
        ETimelineState::Past1955, ETimelineState::Present1985, ETimelineState::Alternate1985,
        ETimelineState::Future2015, ETimelineState::DeepFuture2045, ETimelineState::WildWest1885};
    int32 CurrentIndex = 0;
    for (int32 Index = 0; Index < UE_ARRAY_COUNT(SupportedEras); ++Index)
    {
        if (SupportedEras[Index] == CurrentDestination)
        {
            CurrentIndex = Index;
            break;
        }
    }
    const int32 Step = Direction < 0 ? -1 : 1;
    return SupportedEras[(CurrentIndex + Step + UE_ARRAY_COUNT(SupportedEras)) % UE_ARRAY_COUNT(SupportedEras)];
}

FText UTimeCircuitsViewModel::FormatEra(ETimelineState Era)
{
    switch (Era)
    {
    case ETimelineState::WildWest1885: return FText::FromString(TEXT("1885"));
    case ETimelineState::Past1955: return FText::FromString(TEXT("1955"));
    case ETimelineState::Present1985: return FText::FromString(TEXT("1985"));
    case ETimelineState::Alternate1985: return FText::FromString(TEXT("1985-A"));
    case ETimelineState::Future2015: return FText::FromString(TEXT("2015"));
    case ETimelineState::DeepFuture2045: return FText::FromString(TEXT("2045"));
    default: return FText::FromString(TEXT("UNKNOWN"));
    }
}

FText UTimeCircuitsViewModel::FormatPhase(ETimeTravelPhase Phase)
{
    switch (Phase)
    {
    case ETimeTravelPhase::Idle: return FText::FromString(TEXT("CIRCUITS OFF"));
    case ETimeTravelPhase::Armed: return FText::FromString(TEXT("TIME CIRCUITS ARMED"));
    case ETimeTravelPhase::Charging: return FText::FromString(TEXT("BUILDING FLUX"));
    case ETimeTravelPhase::ThresholdReached: return FText::FromString(TEXT("JUMP THRESHOLD REACHED"));
    case ETimeTravelPhase::Departing: return FText::FromString(TEXT("TEMPORAL DEPARTURE"));
    case ETimeTravelPhase::SwitchingEra: return FText::FromString(TEXT("ERA STREAMING"));
    case ETimeTravelPhase::Arriving: return FText::FromString(TEXT("TEMPORAL ARRIVAL"));
    case ETimeTravelPhase::Cooldown: return FText::FromString(TEXT("SYSTEM COOLDOWN"));
    case ETimeTravelPhase::Failed: return FText::FromString(TEXT("JUMP ABORTED"));
    default: return FText::GetEmpty();
    }
}

