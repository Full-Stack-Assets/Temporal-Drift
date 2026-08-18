using System.Collections.Generic;

namespace TemporalDrift
{
    public sealed class MissionRuntime
    {
        public MissionDefinitionData Definition;
        public int ActiveObjectiveIndex;
        public readonly Dictionary<string, ObjectiveState> States = new Dictionary<string, ObjectiveState>();
        public bool Complete;
    }

    public sealed class MissionSystem
    {
        readonly List<MissionDefinitionData> _missions;
        readonly TimelineFactGraph _facts;
        readonly TimeTravelSystem _timeTravel;
        MissionRuntime _active;

        public MissionRuntime Active => _active;
        public string ActiveMissionId => _active?.Definition.id;
        public string ActiveObjectiveDescription
        {
            get
            {
                if (_active == null || _active.Complete) return "No active mission";
                var objectives = _active.Definition.objectives;
                if (objectives == null || objectives.Count == 0) return _active.Definition.displayName;
                var index = _active.ActiveObjectiveIndex;
                if (index < 0 || index >= objectives.Count) return _active.Definition.displayName;
                return objectives[index].description;
            }
        }

        public MissionSystem(MissionsData data, TimelineFactGraph facts, TimeTravelSystem timeTravel)
        {
            _missions = data?.missions ?? new List<MissionDefinitionData>();
            _facts = facts;
            _timeTravel = timeTravel;
        }

        public bool StartMission(string missionId)
        {
            var definition = _missions.Find(m => m.id == missionId);
            if (definition == null) return false;
            _active = new MissionRuntime { Definition = definition, ActiveObjectiveIndex = 0 };
            foreach (var objective in definition.objectives)
            {
                _active.States[objective.id] = ObjectiveState.Inactive;
            }

            if (definition.objectives.Count > 0)
            {
                _active.States[definition.objectives[0].id] = ObjectiveState.Active;
            }

            return true;
        }

        public bool SubmitEvent(string eventId)
        {
            if (_active == null || _active.Complete) return false;
            var objectives = _active.Definition.objectives;
            if (_active.ActiveObjectiveIndex >= objectives.Count) return false;
            var current = objectives[_active.ActiveObjectiveIndex];
            if (current.completionEvent != eventId) return false;

            _active.States[current.id] = ObjectiveState.Completed;
            if (current.paradoxDelta != 0f)
            {
                _timeTravel?.ApplyDirectParadoxDelta(current.paradoxDelta);
            }

            ApplyMissionFacts(eventId);
            _active.ActiveObjectiveIndex++;
            if (_active.ActiveObjectiveIndex >= objectives.Count)
            {
                _active.Complete = true;
                return true;
            }

            _active.States[objectives[_active.ActiveObjectiveIndex].id] = ObjectiveState.Active;
            return true;
        }

        void ApplyMissionFacts(string eventId)
        {
            if (_facts == null) return;
            switch (eventId)
            {
                case "ClocktowerCalibrated":
                    _facts.SetBaseFact("C_PlaqueChanged", true);
                    break;
                case "DiscrepanciesInspected":
                    _facts.SetBaseFact("C_DinerRenamed", true);
                    _facts.SetBaseFact("C_SchoolDedication", true);
                    _facts.SetBaseFact("C_FounderMissing", true);
                    break;
                case "CampaignResolved":
                    _facts.SetBaseFact("C_PlaqueChanged", true);
                    _facts.SetBaseFact("C_DinerRenamed", true);
                    _facts.SetBaseFact("C_SchoolDedication", true);
                    _facts.SetBaseFact("C_FounderMissing", true);
                    _facts.SetBaseFact("C_CampaignComplete", true);
                    break;
                case "1885LandDisputeResolved":
                    _facts.SetBaseFact("1885.LandDisputeWon", true);
                    break;
                case "1885SaloonStandoffResolved":
                    _facts.SetBaseFact("1885.SaloonStandoffResolved", true);
                    break;
                case "1885RailSurveyApproved":
                    _facts.SetBaseFact("1885.RailSurveyApproved", true);
                    break;
            }
        }
    }
}
