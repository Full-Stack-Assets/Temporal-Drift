"""Place deterministic M02 Clocktower Calibration trigger volumes in the working map."""
import unreal

LEVEL = "/Game/Levels/LVL_TimeTravelTest"
BACKUP = "/Game/Levels/LVL_TimeTravelTest_PreMissionVolumes_20260713"
GEN_TAG = unreal.Name("M02_MissionVolume")


def main():
    if not unreal.EditorLoadingAndSavingUtils.load_map(LEVEL):
        raise RuntimeError(f"Could not load {LEVEL}")
    actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    if not unreal.EditorAssetLibrary.does_asset_exist(BACKUP):
        if not unreal.EditorAssetLibrary.duplicate_asset(LEVEL, BACKUP):
            raise RuntimeError(f"Could not back up {LEVEL} to {BACKUP}")
    for actor in list(actors.get_all_level_actors()):
        if GEN_TAG in actor.tags:
            actors.destroy_actor(actor)

    specs = (
        ("M02_BriefingVolume", unreal.Vector(-900, 900, 140), unreal.Vector(500, 500, 180), "TalkedToValeAndJune"),
        ("M02_SensorInstallVolume", unreal.Vector(-900, 0, 140), unreal.Vector(450, 450, 180), "SensorInstalledVehicle"),
        ("M02_ClocktowerReachVolume", unreal.Vector(0, 1500, 180), unreal.Vector(700, 700, 220), "ClocktowerReached"),
        ("M02_CalibrationVolume", unreal.Vector(0, 1750, 220), unreal.Vector(450, 450, 220), "ClocktowerCalibrated"),
        ("M02_Return1985Volume", unreal.Vector(0, 0, 140), unreal.Vector(700, 700, 180), "Returned1985"),
    )
    trigger_class = unreal.load_class(None, "/Script/Engine.TriggerBox")
    if not trigger_class:
        raise RuntimeError("Unable to load /Script/Engine.TriggerBox")
    for label, location, extent, event_id in specs:
        volume = actors.spawn_actor_from_class(trigger_class, location, unreal.Rotator())
        volume.set_actor_label(label)
        volume.tags = [GEN_TAG, unreal.Name(event_id)]
        volume.set_folder_path("Gameplay/Missions/M02_ClocktowerCalibration")
        components = volume.get_components_by_class(unreal.BoxComponent)
        if not components:
            raise RuntimeError(f"TriggerBox {label} has no BoxComponent")
        components[0].set_editor_property("box_extent", extent)
        volume.is_spatially_loaded = False
    world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
    unreal.EditorLoadingAndSavingUtils.save_map(world, LEVEL)
    unreal.log(f"M02_MISSION_VOLUMES_SUCCESS count={len(specs)} backup={BACKUP}")


main()
