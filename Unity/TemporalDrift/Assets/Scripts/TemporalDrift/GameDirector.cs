using UnityEngine;

namespace TemporalDrift
{
    [DefaultExecutionOrder(-100)]
    public sealed class GameDirector : MonoBehaviour
    {
        public TimeTravelSystem TimeTravel { get; private set; }
        public TimelineFactGraph Facts { get; private set; }
        public MissionSystem Missions { get; private set; }
        public DialogueSystem Dialogue { get; private set; }
        public VehicleTuningData Tuning { get; private set; }

        [SerializeField] HeroTimeMachineController vehicle;
        [SerializeField] Transform eraRoot1955;
        [SerializeField] Transform eraRoot1985;

        void Awake()
        {
            var settings = GameJson.Load<TimeTravelSettingsData>("TimeTravelSettings");
            Tuning = GameJson.Load<VehicleTuningData>("VehicleTuning");
            TimeTravel = new TimeTravelSystem(settings);
            Facts = new TimelineFactGraph(GameJson.Load<TimelineFactsData>("TimelineFacts"));
            Missions = new MissionSystem(GameJson.Load<MissionsData>("Missions"), Facts, TimeTravel);
            Dialogue = new DialogueSystem(GameJson.Load<DialogueCatalogData>("Dialogue"));
            Missions.StartMission("M01.FirstTestRun");

            if (vehicle != null)
            {
                vehicle.TimeTravel = TimeTravel;
                vehicle.Tuning = Tuning;
            }

            TimeTravel.EraSwitchRequested += _ => ApplyEraVisuals();
            ApplyEraVisuals();
        }

        void Update()
        {
            TimeTravel.Tick(Time.deltaTime);
            if (Input.GetKeyDown(KeyCode.Return) && Dialogue.IsOpen)
            {
                var missionEvent = Dialogue.Advance();
                if (!string.IsNullOrEmpty(missionEvent))
                {
                    Missions.SubmitEvent(missionEvent);
                }
            }

            if (Input.GetKeyDown(KeyCode.G) && !Dialogue.IsOpen)
            {
                Dialogue.StartConversation("M01.GarageTutorial");
            }
        }

        void ApplyEraVisuals()
        {
            var in1955 = TimeTravel.CurrentTimelineState == TimelineState.Past1955;
            if (eraRoot1955 != null) eraRoot1955.gameObject.SetActive(in1955);
            if (eraRoot1985 != null) eraRoot1985.gameObject.SetActive(!in1955);
            RenderSettings.ambientLight = in1955
                ? new Color(0.55f, 0.48f, 0.38f)
                : new Color(0.42f, 0.5f, 0.58f);
        }

        void OnGUI()
        {
            const int width = 420;
            GUILayout.BeginArea(new Rect(16, 16, width, 280), GUI.skin.box);
            GUILayout.Label($"ERA {TimeTravel.CurrentTimelineState}  →  {vehicle?.Destination}");
            GUILayout.Label($"SPEED {vehicle?.SpeedMph:0} MPH   FLUX {TimeTravel.FluxChargePercent * 100f:0}%");
            GUILayout.Label($"CIRCUITS {(TimeTravel.TimeCircuitsArmed ? "ARMED" : "OFF")}   PHASE {TimeTravel.Phase}");
            GUILayout.Label($"PARADOX {TimeTravel.CurrentParadoxLevel:0.0}  {TimeTravel.ParadoxStatusText}");
            GUILayout.Label(Missions.ActiveObjectiveDescription);
            if (!string.IsNullOrEmpty(TimeTravel.LastJumpFailureReason))
            {
                GUILayout.Label(TimeTravel.LastJumpFailureReason);
            }

            if (Dialogue.IsOpen)
            {
                GUILayout.Space(8);
                GUILayout.Label($"{Dialogue.Current.speakerDisplayName}: {Dialogue.Current.line}");
                GUILayout.Label("[Enter] continue");
            }
            else
            {
                GUILayout.Label("Arrows drive  T circuits  F jump  Q/E era  H hover  G talk");
            }

            GUILayout.EndArea();
        }
    }
}
