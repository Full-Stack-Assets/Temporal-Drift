// TimeTravelSubsystem.cpp - Fully Expanded Implementation
#include "TimeTravelSubsystem.h"
#include "DeLoreanVehicle.h"
#include "EraDataAsset.h"
#include "EraWorldManager.h"
#include "Kismet/GameplayStatics.h"
#include "Engine/World.h"
#include "TimerManager.h"
#include "DrawDebugHelpers.h"

UTimeTravelSubsystem::UTimeTravelSubsystem()
{
    CurrentFluxEnergy = 0.0f;
    CurrentParadoxLevel = 0.0f;
    WormholeStability = 100.0f;
    TiplerCharge = 0.0f;
    bIsTimeTraveling = false;
}

void UTimeTravelSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    CurrentTimelineState = ETimelineState::Present1985;
    PreviousTimelineState = ETimelineState::Present1985;
}

void UTimeTravelSubsystem::Deinitialize()
{
    if (UWorld* World = GetWorld())
    {
        World->GetTimerManager().ClearTimer(TimeTravelResetHandle);
    }
    Super::Deinitialize();
}

void UTimeTravelSubsystem::Tick(float DeltaTime)
{
    UpdateParadoxOverTime(DeltaTime);
    if (bIsTimeTraveling)
    {
        PhaseElapsedSeconds += DeltaTime;
        const float PhaseDuration = TimeTravelPhase == ETimeTravelPhase::Cooldown ? 1.0f : 0.25f;
        if (PhaseElapsedSeconds >= PhaseDuration)
        {
            AdvanceTimeTravelPhase();
        }
    }
}

TStatId UTimeTravelSubsystem::GetStatId() const
{
    RETURN_QUICK_DECLARE_CYCLE_STAT(UTimeTravelSubsystem, STATGROUP_Tickables);
}

#pragma region Flux Capacitor

float UTimeTravelSubsystem::GetFluxChargePercent() const
{
    return FMath::Clamp(CurrentFluxEnergy / FluxCapacitorMaxEnergy, 0.0f, 1.0f);
}

bool UTimeTravelSubsystem::HasEnoughEnergyForJump() const
{
    return CurrentFluxEnergy >= (FluxCapacitorMaxEnergy * 0.92f);
}

void UTimeTravelSubsystem::AddFluxEnergy(float Amount)
{
    CurrentFluxEnergy = FMath::Clamp(CurrentFluxEnergy + Amount, 0.0f, FluxCapacitorMaxEnergy);
}

void UTimeTravelSubsystem::ConsumeEnergyForTimeTravel()
{
    CurrentFluxEnergy = FMath::Max(0.0f, CurrentFluxEnergy - EnergyDrainOnJump);
}

void UTimeTravelSubsystem::SetTimeCircuitsArmed(bool bArmed)
{
    bTimeCircuitsArmed = bArmed;
    if (!bIsTimeTraveling)
    {
        SetTimeTravelPhase(bArmed ? ETimeTravelPhase::Armed : ETimeTravelPhase::Idle);
    }
}

bool UTimeTravelSubsystem::RequestTimeTravel(const FTimeTravelRequest& Request)
{
    if (!bTimeCircuitsArmed || bIsTimeTraveling || TimeTravelPhase == ETimeTravelPhase::Cooldown ||
        Request.Destination == CurrentTimelineState || Request.EntrySpeedMph < 88.0f || !HasEnoughEnergyForJump())
    {
        return false;
    }

    ActiveTravelRequest = Request;
    bIsTimeTraveling = true;
    SetTimeTravelPhase(ETimeTravelPhase::ThresholdReached);
    ConsumeEnergyForTimeTravel();
    return true;
}

bool UTimeTravelSubsystem::AdvanceTimeTravelPhase()
{
    switch (TimeTravelPhase)
    {
    case ETimeTravelPhase::ThresholdReached:
        SetTimeTravelPhase(ETimeTravelPhase::Departing); OnJumpDeparted.Broadcast(ActiveTravelRequest); return true;
    case ETimeTravelPhase::Departing:
        SetTimeTravelPhase(ETimeTravelPhase::SwitchingEra); OnEraSwitchRequested.Broadcast(ActiveTravelRequest); return true;
    case ETimeTravelPhase::SwitchingEra:
        if (UWorld* World = GetWorld())
        {
            if (UEraWorldManager* EraManager = World->GetSubsystem<UEraWorldManager>())
            {
                EraManager->SwitchToEra(ActiveTravelRequest.Destination);
            }
        }
        PreviousTimelineState = CurrentTimelineState;
        CurrentTimelineState = ActiveTravelRequest.Destination;
        ++TotalJumpsMade;
        UpdateTimelineFlagsInternal(CurrentTimelineState);
        SetTimeTravelPhase(ETimeTravelPhase::Arriving);
        OnJumpArrived.Broadcast(ActiveTravelRequest);
        return true;
    case ETimeTravelPhase::Arriving: SetTimeTravelPhase(ETimeTravelPhase::Cooldown); return true;
    case ETimeTravelPhase::Cooldown:
        bIsTimeTraveling = false;
        bTimeCircuitsArmed = false;
        SetTimeTravelPhase(ETimeTravelPhase::Idle);
        OnTimeTravelCompleted.Broadcast();
        return true;
    default: return false;
    }
}

void UTimeTravelSubsystem::ResetTimeTravelState()
{
    bIsTimeTraveling = false;
    bTimeCircuitsArmed = false;
    SetTimeTravelPhase(ETimeTravelPhase::Idle);
    CurrentTimelineState = ETimelineState::Present1985;
    PreviousTimelineState = ETimelineState::Present1985;
    CurrentFluxEnergy = 0.0f;
    TotalJumpsMade = 0;
}

void UTimeTravelSubsystem::SetTimeTravelPhase(ETimeTravelPhase NewPhase)
{
    if (TimeTravelPhase == NewPhase)
    {
        return;
    }
    const ETimeTravelPhase PreviousPhase = TimeTravelPhase;
    TimeTravelPhase = NewPhase;
    PhaseElapsedSeconds = 0.0f;
    OnPhaseChanged.Broadcast(PreviousPhase, NewPhase);
}

#pragma endregion

#pragma region Timeline & Time Travel

bool UTimeTravelSubsystem::CanPerformTimeTravel(const ADeLoreanVehicle* DeLorean) const
{
    return DeLorean != nullptr && !bIsTimeTraveling && HasEnoughEnergyForJump();
}

void UTimeTravelSubsystem::PerformTimeTravel(ADeLoreanVehicle* DeLorean, ETimelineState TargetEra, UEraDataAsset* EraData)
{
    if (!CanPerformTimeTravel(DeLorean))
        return;

    ConsumeEnergyForTimeTravel();
    ExecuteJumpInternal(TargetEra, EraData);
}

void UTimeTravelSubsystem::ExecuteJumpInternal(ETimelineState TargetEra, UEraDataAsset* EraData)
{
    bIsTimeTraveling = true;

    PreviousTimelineState = CurrentTimelineState;
    CurrentTimelineState = TargetEra;
    ++TotalJumpsMade;

    const float ParadoxMultiplier = EraData ? EraData->ParadoxMultiplier : 1.0f;
    ApplyHawkingRadiationFeedback(30.0f * ParadoxMultiplier); // Base radiation cost, scaled by era risk

    UpdateTimelineFlagsInternal(TargetEra);

    // Broadcast event
    OnTimelineInstability.Broadcast(CurrentParadoxLevel);

    // Reset flag after delay; weak lambda guards against world teardown mid-timer,
    // and the stored handle prevents overlapping jumps from double-scheduling.
    GetWorld()->GetTimerManager().SetTimer(TimeTravelResetHandle,
        FTimerDelegate::CreateWeakLambda(this, [this]()
        {
            bIsTimeTraveling = false;
            OnTimeTravelCompleted.Broadcast();
        }), 2.5f, false);
}

ETimelineState UTimeTravelSubsystem::GetCurrentEra() const
{
    return CurrentTimelineState;
}

FString UTimeTravelSubsystem::GetCurrentEraName() const
{
    return UEnum::GetValueAsString(CurrentTimelineState);
}

void UTimeTravelSubsystem::UpdateTimelineFlagsInternal(ETimelineState NewEra)
{
    TimelineFlags.CurrentParadoxLevel = CurrentParadoxLevel;

    switch (NewEra)
    {
    case ETimelineState::Alternate1985:
        TimelineFlags.bParadoxRisk = true;
        break;
    case ETimelineState::WildWest1885:
        TimelineFlags.bParadoxRisk = true;
        break;
    default:
        TimelineFlags.bParadoxRisk = false;
        break;
    }
}

#pragma endregion

#pragma region Paradox System

void UTimeTravelSubsystem::AddParadoxInternal(float Amount)
{
    CurrentParadoxLevel = FMath::Clamp(CurrentParadoxLevel + Amount, 0.0f, MaxParadoxLevel);
    TimelineFlags.CurrentParadoxLevel = CurrentParadoxLevel;

    if (Amount > 0.0f && CurrentParadoxLevel >= 70.0f)
    {
        OnTimelineInstability.Broadcast(CurrentParadoxLevel);
    }
}

void UTimeTravelSubsystem::ApplyParadoxFromAction(float Severity)
{
    AddParadoxInternal(Severity * ParadoxIncreasePerMajorChange);
}

void UTimeTravelSubsystem::UpdateParadoxOverTime(float DeltaTime)
{
    if (CurrentParadoxLevel > 0.0f)
    {
        AddParadoxInternal(-(ParadoxDecayRatePerMinute * (DeltaTime / 60.0f)));
    }
}

EParadoxLevel UTimeTravelSubsystem::GetCurrentParadoxLevelEnum() const
{
    if (CurrentParadoxLevel >= 90.0f) return EParadoxLevel::Collapse;
    if (CurrentParadoxLevel >= 70.0f) return EParadoxLevel::Dangerous;
    if (CurrentParadoxLevel >= 50.0f) return EParadoxLevel::Unstable;
    if (CurrentParadoxLevel >= 25.0f) return EParadoxLevel::MinorRipple;
    return EParadoxLevel::Stable;
}

FString UTimeTravelSubsystem::GetParadoxStatusText() const
{
    switch (GetCurrentParadoxLevelEnum())
    {
    case EParadoxLevel::Stable:       return TEXT("Timeline Stable");
    case EParadoxLevel::MinorRipple:  return TEXT("Minor Timeline Ripples Detected");
    case EParadoxLevel::Unstable:     return TEXT("Timeline Unstable - Reality Distortion Increasing");
    case EParadoxLevel::Dangerous:    return TEXT("DANGER: Timeline Integrity Failing");
    case EParadoxLevel::Collapse:     return TEXT("CRITICAL: Timeline Collapse Imminent");
    default: return TEXT("Unknown");
    }
}

#pragma endregion

#pragma region Hawking Radiation & Tipler

void UTimeTravelSubsystem::ApplyHawkingRadiationFeedback(float JumpRisk)
{
    float Radiation = JumpRisk * 0.8f;
    WormholeStability = FMath::Max(0.0f, WormholeStability - Radiation);

    if (WormholeStability < 40.0f)
    {
        AddParadoxInternal(8.0f);
    }
}

void UTimeTravelSubsystem::ChargeTiplerCylinder(float Amount)
{
    TiplerCharge = FMath::Min(TiplerCharge + Amount, 100.0f);
}

bool UTimeTravelSubsystem::TryTiplerJump(ETimelineState TargetEra)
{
    if (TiplerCharge < 85.0f || bIsTimeTraveling) return false;

    // High-risk jump: bypasses the flux capacitor entirely, spends Tipler charge instead.
    TiplerCharge = 0.0f;
    AddParadoxInternal(35.0f);
    ExecuteJumpInternal(TargetEra, nullptr);
    return true;
}

#pragma endregion

#pragma region Debug

void UTimeTravelSubsystem::DebugDrawFluxStatus(const ADeLoreanVehicle* DeLorean) const
{
    if (!DeLorean || !GetWorld()) return;

    FVector Location = DeLorean->GetActorLocation() + FVector(0, 0, 250);
    FString Text = FString::Printf(TEXT("Flux: %.1f%% | Paradox: %.1f | Era: %s"),
        GetFluxChargePercent() * 100.0f,
        CurrentParadoxLevel,
        *GetCurrentEraName());

    DrawDebugString(GetWorld(), Location, Text, nullptr, FColor::Cyan, 0.0f, true);
}

#pragma endregion
