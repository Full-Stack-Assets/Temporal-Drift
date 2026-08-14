using System;
using System.Collections.Generic;

namespace TemporalDrift
{
    public enum TimelineState
    {
        Present1985,
        Alternate1985,
        Past1955,
        Future2015,
        DeepFuture2045,
        WildWest1885
    }

    public enum TimeTravelPhase
    {
        Idle, Armed, Charging, ThresholdReached, Departing, SwitchingEra, Arriving, Cooldown, Failed
    }

    public enum ParadoxLevel
    {
        Stable, MinorRipple, Unstable, Dangerous, Collapse
    }

    public enum ObjectiveState
    {
        Inactive, Active, Completed, Failed
    }

    [Serializable]
    public struct TimeTravelRequest
    {
        public TimelineState Destination;
        public float EntrySpeedMph;
    }

    [Serializable]
    public class EraDefinition
    {
        public string id;
        public int year;
        public string displayName;
        public float paradoxMultiplier = 1f;
        public bool paradoxRisk;
    }

    [Serializable]
    public class TimeTravelSettingsData
    {
        public float jumpSpeedThresholdMph = 40f;
        public float fluxChargeStartSpeedMph = 28f;
        public float energyPerSecondAtThreshold = 45f;
        public float fluxCapacitorMaxEnergy = 1210f;
        public float energyDrainOnJump = 1150f;
        public float fluxEnergyRequiredFraction = 0.92f;
        public float maxParadoxLevel = 100f;
        public float paradoxIncreasePerMajorChange = 15f;
        public float paradoxDecayRatePerMinute = 2f;
        public float hawkingBaseJumpRisk = 30f;
        public float hawkingRadiationScale = 0.8f;
        public float hawkingUnstableThreshold = 40f;
        public float hawkingUnstableParadox = 8f;
        public float tiplerJumpChargeRequired = 85f;
        public float tiplerJumpParadox = 35f;
        public float phaseDurationSeconds = 0.25f;
        public float cooldownDurationSeconds = 1f;
        public List<EraDefinition> eras = new List<EraDefinition>();
    }

    [Serializable]
    public class VehicleTuningData
    {
        public float massKg = 1320f;
        public float maxSteerAngleDegrees = 40f;
        public float targetTopSpeedMph = 125f;
        public float motorTorque = 1800f;
        public float brakeTorqueNm = 2800f;
        public float inputSmoothingRate = 12f;
        public float hoverTargetHeight = 2.5f;
        public float hoverSpringStrength = 12f;
        public float hoverDamping = 3f;
        public float hoverForwardAcceleration = 500f;
        public float hoverYawAcceleration = 1.5f;
        public float chaseHighSpeedMph = 65f;
        public float chaseBaseFov = 90f;
        public float chaseHighSpeedFov = 99f;
    }

    [Serializable]
    public class FactDependencyData
    {
        public string id;
        public bool requiredValue = true;
    }

    [Serializable]
    public class FactDefinitionData
    {
        public string id;
        public bool defaultValue;
        public bool valueWhenDependenciesSatisfied = true;
        public List<FactDependencyData> dependencies = new List<FactDependencyData>();
    }

    [Serializable]
    public class TimelineFactsData
    {
        public List<FactDefinitionData> facts = new List<FactDefinitionData>();
    }

    [Serializable]
    public class MissionObjectiveData
    {
        public string id;
        public string description;
        public string completionEvent;
        public string checkpointId;
        public float paradoxDelta;
    }

    [Serializable]
    public class MissionDefinitionData
    {
        public string id;
        public string displayName;
        public List<MissionObjectiveData> objectives = new List<MissionObjectiveData>();
    }

    [Serializable]
    public class MissionsData
    {
        public List<MissionDefinitionData> missions = new List<MissionDefinitionData>();
    }

    [Serializable]
    public class DialogueNodeData
    {
        public string id;
        public string speakerId;
        public string speakerDisplayName;
        public string line;
        public string missionEvent;
        public string automaticNextNodeId;
        public float minimumDisplaySeconds = 1.5f;
    }

    [Serializable]
    public class ConversationData
    {
        public string id;
        public string entryNodeId;
        public List<DialogueNodeData> nodes = new List<DialogueNodeData>();
    }

    [Serializable]
    public class DialogueCatalogData
    {
        public List<ConversationData> conversations = new List<ConversationData>();
    }
}
