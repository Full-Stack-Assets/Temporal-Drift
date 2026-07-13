"""Place traffic route spline anchors along Hill Valley metro corridors."""
import os
import sys
import unreal

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from hill_valley_common import GENERATED_TAG, LEVEL, log, spawn_marker

GENERATED_TRAFFIC_TAG = unreal.Name("HV_TrafficGenerated")

ROUTE_SPECS = (
    ("HV_Traffic_NS_Center", ((-6000, -30000, 90), (0, 30000, 90), 12)),
    ("HV_Traffic_EW_Center", ((-34000, 0, 90), (34000, 0, 90), 12)),
    ("HV_Traffic_Highway_West", ((-42000, -6000, 90), (-12000, -6000, 90), 8)),
    ("HV_Traffic_Highway_East", ((12000, 6000, 90), (42000, 6000, 90), 8)),
    ("HV_Traffic_RiverRoad", ((8200, -22000, 90), (24800, 22000, 90), 10)),
)


def cleanup_generated():
    actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    for actor in actor_subsystem.get_all_level_actors():
        tags = actor.get_editor_property("tags")
        if GENERATED_TRAFFIC_TAG in tags:
            actor_subsystem.destroy_actor(actor)


def spawn_route_points(prefix, start, end, count):
    start_x, start_y, start_z = start
    end_x, end_y, end_z = end
    for index in range(count):
        alpha = index / max(1, count - 1)
        x = start_x + (end_x - start_x) * alpha
        y = start_y + (end_y - start_y) * alpha
        z = start_z + (end_z - start_z) * alpha
        actor = spawn_marker(
            f"{prefix}_{index:02d}",
            (x, y, z),
            ("HV_TrafficRoute", "HV_TrafficSpline", "HV_Metro"),
        )
        actor.tags.append(GENERATED_TRAFFIC_TAG)


def main():
    if not unreal.EditorLoadingAndSavingUtils.load_map(LEVEL):
        raise RuntimeError(f"Unable to load level: {LEVEL}")
    cleanup_generated()
    for prefix, (start, end, count) in ROUTE_SPECS:
        spawn_route_points(prefix, start, end, count)
    unreal.EditorLoadingAndSavingUtils.save_current_level()
    log("HILL_VALLEY_TRAFFIC_ROUTES_SUCCESS")


if __name__ == "__main__":
    main()
