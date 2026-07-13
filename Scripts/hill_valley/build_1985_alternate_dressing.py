"""Alternate 1985 dystopia dressing on DL_1985_Alternate."""
import os
import sys

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

import hill_valley_era_dressing_common as era

GENERATED = unreal.Name("HV_1985A_Generated")
ERA_TAG = unreal.Name("HV_Era1985A")
MAT_PATH = "/Game/Environment/HillValley/1985A/Materials"
LAYER_PATH = "/Game/Data/DataLayers/DL_1985_Alternate.DL_1985_Alternate"
CYLINDER = "/Engine/BasicShapes/Cylinder.Cylinder"


def main():
    era.load_map()
    actors, levels, layers = era.get_subsystems()
    era.cleanup_generated(actors, GENERATED)
    layer = era.get_layer_instance(layers, LAYER_PATH)

    steel = era.material(MAT_PATH, "M_1985A_Steel", (0.12, 0.13, 0.15), 0.35)
    neon = era.material(MAT_PATH, "M_1985A_Neon", (0.9, 0.08, 0.45), 0.2)
    smog = era.material(MAT_PATH, "M_1985A_Smog", (0.25, 0.22, 0.2), 0.85)

    # Casino tower dominates courthouse square sightline.
    for index, height in enumerate((2200, 3600, 5000, 6200)):
        size = 3200 - index * 420
        era.block(actors, layers, f"HV1985A_CasinoTier_{index}", (0, 1200, height), (size, size, 1200), steel,
                  ("HV_1985A_Casino", "HV_District_Commercial"), layer, GENERATED, ERA_TAG)
    era.sign(actors, layers, "HV1985A_CasinoSign", "TANNEN FAMILY CASINO", (0, -200, 6800), layer, GENERATED, ERA_TAG, scale=3.2)

    # Industrial patrol barriers around square.
    for index, x in enumerate((-4200, -2100, 2100, 4200)):
        era.block(actors, layers, f"HV1985A_Barrier_{index}", (x, -1200, 180), (180, 900, 360), steel,
                  ("HV_1985A_Patrol",), layer, GENERATED, ERA_TAG, collision=True)
        era.spawn_mesh(actors, layers, f"HV1985A_Barrel_{index}", CYLINDER, (x, -1800, 120), (.35, .35, 1.0), neon,
                       ("HV_1985A_Patrol",), layer, GENERATED, ERA_TAG)

    # Toxic runoff channel replacing civic lawn accents.
    era.block(actors, layers, "HV1985A_SmogChannel", (0, -1150, 40), (6200, 900, 80), smog,
              ("HV_1985A_Industrial",), layer, GENERATED, ERA_TAG)
    era.sign(actors, layers, "HV1985A_Warning", "AUTHORIZED PERSONNEL ONLY", (0, -2200, 420), layer, GENERATED, ERA_TAG, scale=1.8)

    fog = actors.spawn_actor_from_class(unreal.ExponentialHeightFog, era.world_vector((0, 0, 0)), unreal.Rotator())
    fog.set_actor_label("HV1985A_Atmosphere")
    fog.tags = [GENERATED, ERA_TAG, unreal.Name("HV_1985A_Lighting")]
    fog.is_spatially_loaded = False
    fog_comp = fog.get_component_by_class(unreal.ExponentialHeightFogComponent)
    fog_comp.set_editor_property("fog_density", 0.022)
    fog_comp.set_editor_property("fog_inscattering_luminance", unreal.LinearColor(0.35, 0.32, 0.3, 1))
    era.assign_layer(layers, fog, layer)

    era.finish_era_build(levels, layer, layers, LAYER_PATH, "HILL_VALLEY_1985A_BUILD_SUCCESS", [MAT_PATH])


if __name__ == "__main__":
    main()
