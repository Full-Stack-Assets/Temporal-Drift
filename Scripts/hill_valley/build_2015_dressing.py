"""2015 future dressing on DL_2015."""
import os
import sys

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

import hill_valley_era_dressing_common as era

GENERATED = unreal.Name("HV_2015_Generated")
ERA_TAG = unreal.Name("HV_Era2015")
MAT_PATH = "/Game/Environment/HillValley/2015/Materials"
LAYER_PATH = "/Game/Data/DataLayers/DL_2015.DL_2015"
CYLINDER = "/Engine/BasicShapes/Cylinder.Cylinder"


def main():
    era.load_map()
    actors, levels, layers = era.get_subsystems()
    era.cleanup_generated(actors, GENERATED)
    layer = era.get_layer_instance(layers, LAYER_PATH)

    chrome = era.material(MAT_PATH, "M_2015_Chrome", (0.55, 0.62, 0.7), 0.25)
    holo = era.material(MAT_PATH, "M_2015_Holo", (0.1, 0.75, 0.95), 0.15)
    plaza = era.material(MAT_PATH, "M_2015_Plaza", (0.82, 0.84, 0.88), 0.4)

    # Skyway ring above courthouse square.
    for index, y in enumerate((-2800, 0, 2800)):
        era.block(actors, layers, f"HV2015_Skyway_{index}", (0, y, 1800), (7200, 420, 180), chrome,
                  ("HV_2015_Skyway",), layer, GENERATED, ERA_TAG)
        era.spawn_mesh(actors, layers, f"HV2015_SkywayPillar_{index}", CYLINDER, (3200, y, 900), (.8, .8, 18.0), chrome,
                       ("HV_2015_Skyway",), layer, GENERATED, ERA_TAG)

    # Cafe 80s facade on east square.
    era.block(actors, layers, "HV2015_Cafe80s", (5600, -800, 620), (2800, 1800, 1240), holo,
              ("HV_2015_Cafe80s", "HV_District_Commercial"), layer, GENERATED, ERA_TAG, collision=True)
    era.sign(actors, layers, "HV2015_CafeSign", "CAFE 80'S", (5600, -1750, 980), layer, GENERATED, ERA_TAG, scale=2.4)

    # Hover conversion pads in parking lanes.
    for index, x in enumerate((-3600, -1200, 1200, 3600)):
        era.block(actors, layers, f"HV2015_HoverPad_{index}", (x, -4300, 60), (900, 900, 40), plaza,
                  ("HV_2015_HoverPad",), layer, GENERATED, ERA_TAG)

    era.sign(actors, layers, "HV2015_Welcome", "WELCOME TO THE FUTURE", (0, 3200, 1200), layer, GENERATED, ERA_TAG, scale=2.0)

    fog = actors.spawn_actor_from_class(unreal.ExponentialHeightFog, era.world_vector((0, 0, 0)), unreal.Rotator())
    fog.set_actor_label("HV2015_Atmosphere")
    fog.tags = [GENERATED, ERA_TAG, unreal.Name("HV_2015_Lighting")]
    fog.is_spatially_loaded = False
    fog_comp = fog.get_component_by_class(unreal.ExponentialHeightFogComponent)
    fog_comp.set_editor_property("fog_density", 0.008)
    fog_comp.set_editor_property("fog_inscattering_luminance", unreal.LinearColor(0.62, 0.72, 0.85, 1))
    era.assign_layer(layers, fog, layer)

    era.finish_era_build(levels, layer, layers, LAYER_PATH, "HILL_VALLEY_2015_BUILD_SUCCESS", [MAT_PATH])


if __name__ == "__main__":
    main()
