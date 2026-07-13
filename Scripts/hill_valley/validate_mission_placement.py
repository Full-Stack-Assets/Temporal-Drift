"""Validate mission placement markers in LVL_TimeTravelTest."""
import unreal

LEVEL = "/Game/Levels/LVL_TimeTravelTest"
REQUIRED_EVENTS = {
    "TalkedToValeAndJune",
    "ClocktowerReached",
    "SensorInstalledVehicle",
    "ClocktowerCalibrated",
}


def main():
    unreal.EditorLoadingAndSavingUtils.load_map(LEVEL)
    actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()
    found = set()
    for actor in actors:
        for tag in actor.tags:
            tag_name = str(tag)
            if tag_name.startswith("MissionEvent_"):
                found.add(tag_name.replace("MissionEvent_", ""))

    missing = sorted(REQUIRED_EVENTS - found)
    if missing:
        raise RuntimeError(
            "Mission placement validation failed; missing MissionEvent tags: " + ", ".join(missing)
        )

    unreal.log(f"MISSION_PLACEMENT_VALIDATION_SUCCESS events={len(found)}")
    return True


if __name__ == "__main__":
    main()
