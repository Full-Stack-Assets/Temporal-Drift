"""Place mission trigger volumes and interactables for the M02 vertical slice."""
import unreal

LEVEL = "/Game/Levels/LVL_TimeTravelTest"
GENERATED_TAG = unreal.Name("HV_MissionGenerated")

MISSION_VOLUME_CLASS = "/Script/BTTF_TemporalDrift.MissionEventVolume"
MISSION_INTERACTABLE_CLASS = "/Script/BTTF_TemporalDrift.MissionInteractable"
TRIGGER_BOX_CLASS = "/Script/Engine.TriggerBox"
TARGET_POINT_CLASS = "/Script/Engine.TargetPoint"

MISSION_VOLUMES = [
    ("MV_M02_CourthouseBriefing", (0, 3000, 200), (1800, 1800, 400), "TalkedToValeAndJune"),
    ("MV_M02_ClocktowerReach", (0, 4100, 200), (2200, 2200, 500), "ClocktowerReached"),
]

MISSION_INTERACTABLES = [
    ("MI_M02_SensorVehicle", (-800, 1200, 120), "SensorInstalledVehicle", "Install clocktower sensor"),
    ("MI_M02_ClocktowerCalibrate", (0, 4100, 220), "ClocktowerCalibrated", "Calibrate clocktower sensor"),
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
  # TriggerBox root is a brush; scale in meters-ish units for courthouse-scale coords.
    scale = unreal.Vector(extent[0] / 100.0, extent[1] / 100.0, extent[2] / 100.0)
    actor.set_actor_scale3d(scale)


def spawn_volume(name, location, extent, event_id, volume_class, class_path):
    actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    volume = actor_subsystem.spawn_actor_from_class(
        volume_class, unreal.Vector(*location), unreal.Rotator(0, 0, 0)
    )
    volume.set_actor_label(name)
    tags = [GENERATED_TAG, unreal.Name("HV_MissionVolume"), unreal.Name(f"MissionEvent_{event_id}")]
    volume.tags = tags

    if class_path.endswith("MissionEventVolume"):
        volume.set_editor_property("mission_event_id", unreal.Name(event_id))
        set_trigger_extent(volume, extent)
    else:
        set_trigger_extent(volume, extent)

    return volume


def spawn_interactable(name, location, event_id, prompt, interactable_class, class_path):
    actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    actor = actor_subsystem.spawn_actor_from_class(
        interactable_class, unreal.Vector(*location), unreal.Rotator(0, 0, 0)
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


def main():
    volume_class, volume_class_path = load_actor_class(MISSION_VOLUME_CLASS, TRIGGER_BOX_CLASS)
    interactable_class, interactable_class_path = load_actor_class(
        MISSION_INTERACTABLE_CLASS, TARGET_POINT_CLASS
    )

    load_map()
    cleanup_generated()

    for spec in MISSION_VOLUMES:
        spawn_volume(*spec, volume_class, volume_class_path)
    for spec in MISSION_INTERACTABLES:
        spawn_interactable(*spec, interactable_class, interactable_class_path)

    unreal.EditorLoadingAndSavingUtils.save_current_level()
    unreal.log("MISSION_VOLUME_PLACEMENT_SUCCESS")


if __name__ == "__main__":
    main()
