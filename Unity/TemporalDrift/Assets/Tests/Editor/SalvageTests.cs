using NUnit.Framework;

namespace TemporalDrift.Tests
{
    public sealed class TimeTravelSystemTests
    {
        TimeTravelSystem System()
        {
            var settings = JsonUtilityWrap.TimeTravel();
            var system = new TimeTravelSystem(settings);
            system.SetTimeCircuitsArmed(true);
            system.AddFluxEnergy(settings.fluxCapacitorMaxEnergy);
            return system;
        }

        [Test]
        public void DefaultJumpThresholdIsFortyMph()
        {
            Assert.AreEqual(40f, new TimeTravelSystem(JsonUtilityWrap.TimeTravel()).JumpSpeedThresholdMph);
        }

        [Test]
        public void RejectsJumpWhenCircuitsAreOff()
        {
            var system = new TimeTravelSystem(JsonUtilityWrap.TimeTravel());
            system.AddFluxEnergy(1210f);
            Assert.IsFalse(system.RequestTimeTravel(new TimeTravelRequest
            {
                Destination = TimelineState.Past1955,
                EntrySpeedMph = 40f
            }));
            Assert.AreEqual("Arm the time circuits first.", system.LastJumpFailureReason);
        }

        [Test]
        public void RejectsSameEraAndLowSpeed()
        {
            var system = System();
            Assert.IsFalse(system.RequestTimeTravel(new TimeTravelRequest
            {
                Destination = TimelineState.Present1985,
                EntrySpeedMph = 40f
            }));
            system.SetTimeCircuitsArmed(true);
            system.AddFluxEnergy(1210f);
            Assert.IsFalse(system.RequestTimeTravel(new TimeTravelRequest
            {
                Destination = TimelineState.Past1955,
                EntrySpeedMph = 39.9f
            }));
        }

        [Test]
        public void CompletesJumpPhaseMachineTo1955()
        {
            var system = System();
            Assert.IsTrue(system.RequestTimeTravel(new TimeTravelRequest
            {
                Destination = TimelineState.Past1955,
                EntrySpeedMph = 40f
            }));
            Assert.AreEqual(TimeTravelPhase.ThresholdReached, system.Phase);
            while (system.IsTimeTraveling)
            {
                system.Tick(1f);
            }

            Assert.AreEqual(TimelineState.Past1955, system.CurrentTimelineState);
            Assert.AreEqual(1, system.TotalJumpsMade);
            Assert.AreEqual(TimeTravelPhase.Idle, system.Phase);
            Assert.Less(system.CurrentFluxEnergy, 1210f * 0.1f);
        }
    }

    public sealed class TimelineFactGraphTests
    {
        [Test]
        public void LandDisputePropagatesToStreetName()
        {
            var graph = new TimelineFactGraph(JsonUtilityWrap.Facts());
            Assert.IsTrue(graph.GetFact("1985.StreetRenamed"), "Unset 1885 land dispute should rename the street.");
            Assert.IsTrue(graph.SetBaseFact("1885.LandDisputeWon", true));
            Assert.IsTrue(graph.GetFact("1955.MallSiteOwned"));
            Assert.IsFalse(graph.GetFact("1985.StreetRenamed"));
        }

        [Test]
        public void GraphIsAcyclic()
        {
            Assert.DoesNotThrow(() => new TimelineFactGraph(JsonUtilityWrap.Facts()).Recompute());
        }
    }

    public sealed class MissionDialogueTests
    {
        [Test]
        public void M01AdvancesOnTalkedToVale()
        {
            var settings = JsonUtilityWrap.TimeTravel();
            var timeTravel = new TimeTravelSystem(settings);
            var facts = new TimelineFactGraph(JsonUtilityWrap.Facts());
            var missions = new MissionSystem(JsonUtilityWrap.Missions(), facts, timeTravel);
            Assert.IsTrue(missions.StartMission("M01.FirstTestRun"));
            Assert.IsTrue(missions.SubmitEvent("TalkedToVale"));
            Assert.AreEqual("Collect the calibration parts, install them on the time machine, then complete the courthouse course.",
                missions.ActiveObjectiveDescription);
        }

        [Test]
        public void GarageDialogueEmitsMissionEvent()
        {
            var dialogue = new DialogueSystem(JsonUtilityWrap.Dialogue());
            Assert.IsTrue(dialogue.StartConversation("M01.GarageTutorial"));
            Assert.AreEqual("Dr. Emmett Vale", dialogue.Current.speakerDisplayName);
            Assert.AreEqual("TalkedToVale", dialogue.Advance());
            Assert.IsFalse(dialogue.IsOpen);
        }
    }

    static class JsonUtilityWrap
    {
        public static TimeTravelSettingsData TimeTravel() =>
            UnityEngine.JsonUtility.FromJson<TimeTravelSettingsData>(Read("TimeTravelSettings"));

        public static TimelineFactsData Facts() =>
            UnityEngine.JsonUtility.FromJson<TimelineFactsData>(Read("TimelineFacts"));

        public static MissionsData Missions() =>
            UnityEngine.JsonUtility.FromJson<MissionsData>(Read("Missions"));

        public static DialogueCatalogData Dialogue() =>
            UnityEngine.JsonUtility.FromJson<DialogueCatalogData>(Read("Dialogue"));

        static string Read(string name)
        {
            var asset = UnityEngine.Resources.Load<UnityEngine.TextAsset>("TemporalDrift/" + name);
            Assert.IsNotNull(asset, name);
            return asset.text;
        }
    }
}
