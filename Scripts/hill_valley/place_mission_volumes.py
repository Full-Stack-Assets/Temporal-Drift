"""Place mission trigger volumes and interactables for the M02 vertical slice."""
import unreal

LEVEL = "/Game/Levels/LVL_TimeTravelTest"
GENERATED_TAG = unreal.Name("HV_MissionGenerated")

MISSION_VOLUMES = [
    ("MV_M02_CourthouseBriefing", (0, 3000, 200), (1800, 1800, 400), "TalkedToValeAndJune"),
    ("MV_M02_ClocktowerReach", (0, 4100, 200), (2200, 2200, 500), "ClocktowerReached"),
]

MISSION_INTERACTABLES = [
    ("MI_M02_SensorVehicle", (-800, 1200, 120), "SensorInstalledVehicle", "Install clocktower sensor"),
    ("MI_M02_ClocktowerCalibrate", (0, 4100, 220), "ClocktowerCalibrated", "Calibrate clocktower sensor"),
]


def load_map():
    unreal.EditorLoadingAndSavingUtils.load_map(LEVEL)


def cleanup_generated():
    actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    for actor in actor_subsystem.get_all_level_actors():
        if GENERATED_TAG in actor.tags:
            actor_subsystem.destroy_actor(actor)


def spawn_volume(name, location, extent, event_id):
    actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    volume = actor_subsystem.spawn_actor_from_class(
        unreal.MissionEventVolume, unreal.Vector(*location), unreal.Rotator(0, 0, 0)
    )
    volume.set_actor_label(name)
    volume.tags = [GENERATED_TAG, unreal.Name("HV_MissionVolume")]
    volume.set_editor_property("mission_event_id", unreal.Name(event_id))
    brush = volume.get_editor_property("brush_component")
    brush.set_editor_property("brush_builder", unreal.CubeBuilder())
    brush.set_editor_property("relative_scale3d", unreal.Vector(extent[0] / 100.0, extent[1] / 100.0, extent[2] / 100.0))
    return volume


def spawn_interactable(name, location, event_id, prompt):
    actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    actor = actor_subsystem.spawn_actor_from_class(
        unreal.MissionInteractable, unreal.Vector(*location), unreal.Rotator(0, 0, 0)
    )
    actor.set_actor_label(name)
    actor.tags = [GENERATED_TAG, unreal.Name("HV_MissionInteractable")]
    actor.set_editor_property("mission_event_id", unreal.Name(event_id))
    actor.set_editor_property("interaction_prompt", prompt)
    return actor


def main():
    load_map()
    cleanup_generated()
    for spec in MISSION_VOLUMES:
        spawn_volume(*spec)
    for spec in MISSION_INTERACTABLES:
        spawn_interactable(*spec)
    unreal.EditorLoadingAndSavingUtils.save_current_level()
    unreal.log("MISSION_VOLUME_PLACEMENT_SUCCESS")


main()
