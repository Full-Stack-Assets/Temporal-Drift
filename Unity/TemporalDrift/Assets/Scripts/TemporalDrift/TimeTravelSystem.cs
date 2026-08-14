using System;
using System.Collections.Generic;

namespace TemporalDrift
{
    public sealed class TimeTravelSystem
    {
        public TimeTravelSettingsData Settings { get; }
        public float CurrentFluxEnergy { get; private set; }
        public float CurrentParadoxLevel { get; private set; }
        public float WormholeStability { get; private set; } = 100f;
        public float TiplerCharge { get; private set; }
        public int TotalJumpsMade { get; private set; }
        public TimelineState CurrentTimelineState { get; private set; } = TimelineState.Present1985;
        public TimelineState PreviousTimelineState { get; private set; } = TimelineState.Present1985;
        public TimeTravelPhase Phase { get; private set; } = TimeTravelPhase.Idle;
        public string LastJumpFailureReason { get; private set; } = string.Empty;
        public TimeTravelRequest ActiveRequest { get; private set; }

        public bool TimeCircuitsArmed { get; private set; }
        public bool IsTimeTraveling { get; private set; }

        public event Action<TimeTravelPhase, TimeTravelPhase> PhaseChanged;
        public event Action<TimeTravelRequest> JumpDeparted;
        public event Action<TimeTravelRequest> EraSwitchRequested;
        public event Action<TimeTravelRequest> JumpArrived;
        public event Action JumpCompleted;
        public event Action<TimeTravelRequest, string> JumpFailed;
        public event Action<float> TimelineInstability;

        float _phaseElapsed;
        bool _eraSwitchRequested;
        bool _eraReady = true;

        public TimeTravelSystem(TimeTravelSettingsData settings)
        {
            Settings = settings ?? new TimeTravelSettingsData();
        }

        public float JumpSpeedThresholdMph => Settings.jumpSpeedThresholdMph;
        public float FluxChargePercent => Clamp01(CurrentFluxEnergy / Settings.fluxCapacitorMaxEnergy);
        public bool HasEnoughEnergyForJump =>
            CurrentFluxEnergy >= Settings.fluxCapacitorMaxEnergy * Settings.fluxEnergyRequiredFraction;

        public void AddFluxEnergy(float amount)
        {
            CurrentFluxEnergy = Clamp(CurrentFluxEnergy + amount, 0f, Settings.fluxCapacitorMaxEnergy);
        }

        public void SetTimeCircuitsArmed(bool armed)
        {
            TimeCircuitsArmed = armed;
            if (!IsTimeTraveling)
            {
                LastJumpFailureReason = string.Empty;
                SetPhase(armed ? TimeTravelPhase.Armed : TimeTravelPhase.Idle);
            }
        }

        public void SetFluxCharging(bool charging)
        {
            if (IsTimeTraveling || !TimeCircuitsArmed)
            {
                return;
            }

            SetPhase(charging ? TimeTravelPhase.Charging : TimeTravelPhase.Armed);
        }

        public void ChargeFromSpeed(float speedMph, float deltaTime)
        {
            if (!TimeCircuitsArmed || IsTimeTraveling)
            {
                return;
            }

            if (speedMph >= Settings.fluxChargeStartSpeedMph)
            {
                SetFluxCharging(true);
                var t = Clamp01((speedMph - Settings.fluxChargeStartSpeedMph) /
                                Math.Max(1f, JumpSpeedThresholdMph - Settings.fluxChargeStartSpeedMph));
                AddFluxEnergy(Settings.energyPerSecondAtThreshold * t * deltaTime);
            }
            else if (Phase == TimeTravelPhase.Charging)
            {
                SetFluxCharging(false);
            }
        }

        public bool RequestTimeTravel(TimeTravelRequest request)
        {
            if (IsTimeTraveling || Phase == TimeTravelPhase.Cooldown)
            {
                return false;
            }

            if (!TimeCircuitsArmed)
            {
                return Fail(request, "Arm the time circuits first.");
            }

            if (request.Destination == CurrentTimelineState)
            {
                return Fail(request, "Select a different destination era.");
            }

            if (request.EntrySpeedMph < JumpSpeedThresholdMph)
            {
                return Fail(request, $"Reach {JumpSpeedThresholdMph:0} MPH to initiate time travel.");
            }

            if (!HasEnoughEnergyForJump)
            {
                return Fail(request, "Flux energy is below the jump requirement.");
            }

            ActiveRequest = request;
            LastJumpFailureReason = string.Empty;
            _eraSwitchRequested = false;
            IsTimeTraveling = true;
            ConsumeEnergyForTimeTravel();
            SetPhase(TimeTravelPhase.ThresholdReached);
            return true;
        }

        public void MarkEraReady(bool ready) => _eraReady = ready;

        public bool Tick(float deltaTime)
        {
            UpdateParadoxOverTime(deltaTime);
            if (!IsTimeTraveling)
            {
                return false;
            }

            _phaseElapsed += deltaTime;
            var duration = Phase == TimeTravelPhase.Cooldown
                ? Settings.cooldownDurationSeconds
                : Settings.phaseDurationSeconds;
            if (_phaseElapsed >= duration)
            {
                return AdvancePhase();
            }

            return false;
        }

        public bool AdvancePhase()
        {
            switch (Phase)
            {
                case TimeTravelPhase.ThresholdReached:
                    SetPhase(TimeTravelPhase.Departing);
                    JumpDeparted?.Invoke(ActiveRequest);
                    return true;
                case TimeTravelPhase.Departing:
                    SetPhase(TimeTravelPhase.SwitchingEra);
                    EraSwitchRequested?.Invoke(ActiveRequest);
                    return true;
                case TimeTravelPhase.SwitchingEra:
                    if (!_eraSwitchRequested)
                    {
                        _eraSwitchRequested = true;
                    }

                    if (!_eraReady)
                    {
                        return false;
                    }

                    PreviousTimelineState = CurrentTimelineState;
                    CurrentTimelineState = ActiveRequest.Destination;
                    TotalJumpsMade++;
                    ApplyHawkingRadiation(Settings.hawkingBaseJumpRisk * ParadoxMultiplierFor(CurrentTimelineState));
                    SetPhase(TimeTravelPhase.Arriving);
                    JumpArrived?.Invoke(ActiveRequest);
                    return true;
                case TimeTravelPhase.Arriving:
                    SetPhase(TimeTravelPhase.Cooldown);
                    return true;
                case TimeTravelPhase.Cooldown:
                    IsTimeTraveling = false;
                    TimeCircuitsArmed = false;
                    _eraSwitchRequested = false;
                    SetPhase(TimeTravelPhase.Idle);
                    JumpCompleted?.Invoke();
                    return true;
                default:
                    return false;
            }
        }

        public bool TryTiplerJump(TimelineState destination)
        {
            if (TiplerCharge < Settings.tiplerJumpChargeRequired || IsTimeTraveling)
            {
                return false;
            }

            TiplerCharge = 0f;
            AddParadox(Settings.tiplerJumpParadox);
            var request = new TimeTravelRequest { Destination = destination, EntrySpeedMph = JumpSpeedThresholdMph };
            ActiveRequest = request;
            IsTimeTraveling = true;
            SetPhase(TimeTravelPhase.ThresholdReached);
            return true;
        }

        public void ChargeTipler(float amount)
        {
            TiplerCharge = Math.Min(100f, TiplerCharge + amount);
        }

        public void ApplyParadoxFromAction(float severity)
        {
            AddParadox(severity * Settings.paradoxIncreasePerMajorChange);
        }

        public void ApplyDirectParadoxDelta(float delta) => AddParadox(delta);

        public ParadoxLevel CurrentParadoxBand
        {
            get
            {
                if (CurrentParadoxLevel >= 90f) return ParadoxLevel.Collapse;
                if (CurrentParadoxLevel >= 70f) return ParadoxLevel.Dangerous;
                if (CurrentParadoxLevel >= 50f) return ParadoxLevel.Unstable;
                if (CurrentParadoxLevel >= 25f) return ParadoxLevel.MinorRipple;
                return ParadoxLevel.Stable;
            }
        }

        public string ParadoxStatusText => CurrentParadoxBand switch
        {
            ParadoxLevel.Stable => "Timeline Stable",
            ParadoxLevel.MinorRipple => "Minor Timeline Ripples Detected",
            ParadoxLevel.Unstable => "Timeline Unstable - Reality Distortion Increasing",
            ParadoxLevel.Dangerous => "DANGER: Timeline Integrity Failing",
            ParadoxLevel.Collapse => "CRITICAL: Timeline Collapse Imminent",
            _ => "Unknown"
        };

        public void CycleDestination(ref TimelineState destination, int direction)
        {
            var values = (TimelineState[])Enum.GetValues(typeof(TimelineState));
            var index = Array.IndexOf(values, destination);
            if (index < 0) index = 0;
            index = (index + direction + values.Length) % values.Length;
            destination = values[index];
            if (destination == CurrentTimelineState)
            {
                index = (index + direction + values.Length) % values.Length;
                destination = values[index];
            }
        }

        public void Reset()
        {
            IsTimeTraveling = false;
            TimeCircuitsArmed = false;
            _eraSwitchRequested = false;
            SetPhase(TimeTravelPhase.Idle);
            CurrentTimelineState = TimelineState.Present1985;
            PreviousTimelineState = TimelineState.Present1985;
            CurrentFluxEnergy = 0f;
            TotalJumpsMade = 0;
            LastJumpFailureReason = string.Empty;
        }

        void ConsumeEnergyForTimeTravel()
        {
            CurrentFluxEnergy = Math.Max(0f, CurrentFluxEnergy - Settings.energyDrainOnJump);
        }

        void ApplyHawkingRadiation(float jumpRisk)
        {
            WormholeStability = Math.Max(0f, WormholeStability - jumpRisk * Settings.hawkingRadiationScale);
            if (WormholeStability < Settings.hawkingUnstableThreshold)
            {
                AddParadox(Settings.hawkingUnstableParadox);
            }
        }

        void UpdateParadoxOverTime(float deltaTime)
        {
            if (CurrentParadoxLevel > 0f)
            {
                AddParadox(-(Settings.paradoxDecayRatePerMinute * (deltaTime / 60f)));
            }
        }

        void AddParadox(float amount)
        {
            CurrentParadoxLevel = Clamp(CurrentParadoxLevel + amount, 0f, Settings.maxParadoxLevel);
            if (amount > 0f && CurrentParadoxLevel >= 70f)
            {
                TimelineInstability?.Invoke(CurrentParadoxLevel);
            }
        }

        float ParadoxMultiplierFor(TimelineState era)
        {
            if (Settings.eras == null) return 1f;
            var name = era.ToString();
            foreach (var definition in Settings.eras)
            {
                if (definition.id == name) return definition.paradoxMultiplier;
            }

            return 1f;
        }

        bool Fail(TimeTravelRequest request, string reason)
        {
            LastJumpFailureReason = reason;
            SetPhase(TimeTravelPhase.Failed);
            JumpFailed?.Invoke(request, reason);
            return false;
        }

        void SetPhase(TimeTravelPhase next)
        {
            if (Phase == next) return;
            var previous = Phase;
            Phase = next;
            _phaseElapsed = 0f;
            PhaseChanged?.Invoke(previous, next);
        }

        static float Clamp(float value, float min, float max) => Math.Min(max, Math.Max(min, value));
        static float Clamp01(float value) => Clamp(value, 0f, 1f);
    }
}
