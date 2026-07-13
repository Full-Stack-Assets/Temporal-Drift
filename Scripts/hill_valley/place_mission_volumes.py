"""Place mission trigger volumes and interactables for campaign scaffolding."""
import os
import sys
import unreal

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from hill_valley_coords import world_location

LEVEL = "/Game/Levels/LVL_TimeTravelTest"
GENERATED_TAG = unreal.Name("HV_MissionGenerated")

MISSION_VOLUME_CLASS = "/Script/BTTF_TemporalDrift.MissionEventVolume"
MISSION_INTERACTABLE_CLASS = "/Script/BTTF_TemporalDrift.MissionInteractable"
DIALOGUE_INTERACTABLE_CLASS = "/Script/BTTF_TemporalDrift.DialogueInteractable"
TRIGGER_BOX_CLASS = "/Script/Engine.TriggerBox"
TARGET_POINT_CLASS = "/Script/Engine.TargetPoint"

MISSION_VOLUMES = [
    ("MV_M01_ValeGarage", (-2400, 800, 120), (1400, 1400, 300), "TalkedToVale"),
    ("MV_M01_CourseFinish", (0, 5200, 120), (1600, 1600, 300), "TestCourseComplete"),
    ("MV_M02_CourthouseBriefing", (0, 3000, 200), (1800, 1800, 400), "TalkedToValeAndJune"),
    ("MV_M02_ClocktowerReach", (0, 4100, 200), (2200, 2200, 500), "ClocktowerReached"),
    ("MV_M03_DinerSign", (1800, 2600, 120), (1200, 1200, 300), "DiscrepanciesInspected"),
    ("MV_M03_SchoolDedication", (-2200, 3400, 120), (1200, 1200, 300), "WitnessesInterviewed"),
]

MISSION_INTERACTABLES = [
    ("MI_M01_PartsBench", (-2500, 600, 100), "CalibrationPartsCollected", "Collect calibration parts"),
    ("MI_M01_VehicleInstall", (-2300, 900, 100), "VehicleReady", "Install calibration parts"),
    ("MI_M02_SensorVehicle", (-800, 1200, 120), "SensorInstalledVehicle", "Install clocktower sensor"),
    ("MI_M02_ClocktowerCalibrate", (0, 4100, 220), "ClocktowerCalibrated", "Calibrate clocktower sensor"),
    ("MI_M03_FounderPortrait", (400, 3600, 180), "AlterationIdentified", "Identify the altered event"),
]

DIALOGUE_INTERACTABLES = [
    ("DI_M01_ValeGarage", (-2400, 800, 100),
     "/Game/Dialogue/DA_Dialogue_M01_GarageTutorial.DA_Dialogue_M01_GarageTutorial"),
    ("DI_M02_CourthouseBriefing", (0, 3000, 120),
     "/Game/Dialogue/DA_Dialogue_M02_CourthouseBriefing.DA_Dialogue_M02_CourthouseBriefing"),
    ("DI_M03_ArchiveBriefing", (200, 3200, 120),
     "/Game/Dialogue/DA_Dialogue_M03_ArchiveBriefing.DA_Dialogue_M03_ArchiveBriefing"),
    ("DI_M04_WorkshopBriefing", (5200, -1200, 100),
     "/Game/Dialogue/DA_Dialogue_M04_WorkshopBriefing.DA_Dialogue_M04_WorkshopBriefing"),
    ("DI_M05_LightningFinale", (-4000, 6000, 100),
     "/Game/Dialogue/DA_Dialogue_M05_LightningFinale.DA_Dialogue_M05_LightningFinale"),
]

SIDE_MISSION_VOLUMES = [
    ("MV_SideA_JuneArchive", (200, 3200, 120), (1400, 1400, 300), "SideA_Start"),
    ("MV_SideA_Resolve", (-1800, 2800, 120), (1200, 1200, 300), "SideA_Complete"),
    ("MV_SideB_Accept", (3600, -800, 120), (1200, 1200, 300), "SideB_Accepted"),
    ("MV_SideB_1955Handoff", (6200, 4800, 120), (1600, 1600, 300), "SideB_Complete"),
]

M04_M05_VOLUMES = [
    ("MV_M04_WorkshopLocated", (5000, -1400, 120), (1600, 1600, 300), "WorkshopLocated"),
    ("MV_M04_WorkshopApproach", (5200, -1200, 120), (1800, 1800, 350), "WorkshopEntered"),
    ("MV_M05_LightningApproach", (-4200, 6200, 120), (2400, 2400, 400), "FinalRunStarted"),
    ("MV_M05_ReturnSquare", (0, 3000, 120), (2000, 2000, 350), "ConsequencesInspected"),
]

M04_M05_INTERACTABLES = [
    ("MI_M04_RecoverComponents", (5400, -1000, 100), "ComponentsRecovered", "Recover alloy and regulator"),
    ("MI_M04_ResearchChoice", (5300, -1100, 100), "ResearchChoiceResolved", "Resolve Crane's research notes"),
    ("MI_M04_InstallRegulator", (-2400, 900, 100), "RegulatorInstalled", "Install temporal regulator"),
    ("MI_M05_PrepareRoute", (-4000, 6000, 100), "FinalePrepared", "Prepare lightning route"),
    ("MI_M05_FinalDialogue", (-2400, 700, 100), "CampaignResolved", "Resolve campaign with Vale"),
]

M01_COMPLETION = [
    ("MV_M01_ReturnToVale", (-2200, 950, 100), (1200, 1200, 280), "M01Returned", False),
]

VEHICLE_ONLY_VOLUMES = [
    ("MV_M05_LightningJump", (0, 4600, 180), (1800, 1800, 350), "LightningJumpComplete", True),
]


def load_actor_class(primary_path, fallback_path):
    actor_class = unreal.load_class(None, primary_path)
    if actor_class:
        unreal.log(f"MISSION_CLASS_LOADED {primary_path}")
        return actor_class, primary_path
    actor_class = unreal.load_class(None, fallback_path)
    if not actor_class:
        raise RuntimeError(f"Could not load mission actor classes: {primary_path} or {fallback_path}")
    unreal.log_warning(
        f"MISSION_CLASS_FALLBACK {primary_path} missing; using {fallback_path}. "
        "Rebuild BTTF_TemporalDriftEditor Win64 Development, then rerun this script."
    )
    return actor_class, fallback_path


def load_map():
    unreal.EditorLoadingAndSavingUtils.load_map(LEVEL)


def cleanup_generated():
    actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    for actor in actor_subsystem.get_all_level_actors():
        if GENERATED_TAG in actor.tags:
            actor_subsystem.destroy_actor(actor)


def set_trigger_extent(actor, extent):
    # TriggerBox root is a brush; scale for courthouse-scale coordinates.
    scale = unreal.Vector(extent[0] / 100.0, extent[1] / 100.0, extent[2] / 100.0)
    actor.set_actor_scale3d(scale)


def to_world_vector(local_xyz):
    return unreal.Vector(*world_location(local_xyz[0], local_xyz[1], local_xyz[2]))


def spawn_volume(name, location, extent, event_id, volume_class, class_path, require_vehicle=False):
    actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    volume = actor_subsystem.spawn_actor_from_class(
        volume_class, to_world_vector(location), unreal.Rotator(0, 0, 0)
    )
    volume.set_actor_label(name)
    tags = [GENERATED_TAG, unreal.Name("HV_MissionVolume"), unreal.Name(f"MissionEvent_{event_id}")]
    volume.tags = tags

    if class_path.endswith("MissionEventVolume"):
        volume.set_editor_property("mission_event_id", unreal.Name(event_id))
        if require_vehicle:
            volume.set_editor_property("b_require_vehicle_occupant", True)
        set_trigger_extent(volume, extent)
    else:
        set_trigger_extent(volume, extent)

    return volume


def spawn_interactable(name, location, event_id, prompt, interactable_class, class_path):
    actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    actor = actor_subsystem.spawn_actor_from_class(
        interactable_class, to_world_vector(location), unreal.Rotator(0, 0, 0)
    )
    actor.set_actor_label(name)
    actor.tags = [
        GENERATED_TAG,
        unreal.Name("HV_MissionInteractable"),
        unreal.Name(f"MissionEvent_{event_id}"),
    ]

    if class_path.endswith("MissionInteractable"):
        actor.set_editor_property("mission_event_id", unreal.Name(event_id))
        actor.set_editor_property("interaction_prompt", prompt)
    else:
        unreal.log_warning(
            f"Placed tagged interactable marker {name}; runtime interact requires MissionInteractable C++."
        )

    return actor


def spawn_dialogue_interactable(name, location, asset_path, dialogue_class, class_path):
    actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    actor = actor_subsystem.spawn_actor_from_class(
        dialogue_class, to_world_vector(location), unreal.Rotator(0, 0, 0)
    )
    actor.set_actor_label(name)
    actor.tags = [GENERATED_TAG, unreal.Name("HV_DialogueInteractable")]
    if class_path.endswith("DialogueInteractable"):
        asset = unreal.load_asset(asset_path)
        if asset:
            actor.set_editor_property("conversation_asset", asset)
        else:
            unreal.log_warning(f"Dialogue asset missing for {name}: {asset_path}")
    return actor


def main():
    volume_class, volume_class_path = load_actor_class(MISSION_VOLUME_CLASS, TRIGGER_BOX_CLASS)
    interactable_class, interactable_class_path = load_actor_class(
        MISSION_INTERACTABLE_CLASS, TARGET_POINT_CLASS
    )
    dialogue_class, dialogue_class_path = load_actor_class(
        DIALOGUE_INTERACTABLE_CLASS, TARGET_POINT_CLASS
    )

    load_map()
    cleanup_generated()

    for spec in MISSION_VOLUMES:
        spawn_volume(*spec, volume_class, volume_class_path)
    for spec in M01_COMPLETION:
        spawn_volume(*spec, volume_class, volume_class_path)
    for spec in VEHICLE_ONLY_VOLUMES:
        spawn_volume(*spec, volume_class, volume_class_path)
    for spec in M04_M05_VOLUMES:
        spawn_volume(*spec, volume_class, volume_class_path)
    for spec in SIDE_MISSION_VOLUMES:
        spawn_volume(*spec, volume_class, volume_class_path)
    for spec in MISSION_INTERACTABLES:
        spawn_interactable(*spec, interactable_class, interactable_class_path)
    for spec in M04_M05_INTERACTABLES:
        spawn_interactable(*spec, interactable_class, interactable_class_path)
    for spec in DIALOGUE_INTERACTABLES:
        spawn_dialogue_interactable(*spec, dialogue_class, dialogue_class_path)

    unreal.EditorLoadingAndSavingUtils.save_current_level()
    unreal.log("MISSION_VOLUME_PLACEMENT_SUCCESS")


if __name__ == "__main__":
    main()
