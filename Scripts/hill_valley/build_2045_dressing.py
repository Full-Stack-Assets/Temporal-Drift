"""2045 deep-future dressing on DL_2045."""
import os
import sys

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

import hill_valley_era_dressing_common as era

GENERATED = unreal.Name("HV_2045_Generated")
ERA_TAG = unreal.Name("HV_Era2045")
MAT_PATH = "/Game/Environment/HillValley/2045/Materials"
LAYER_PATH = "/Game/Data/DataLayers/DL_2045.DL_2045"
SPHERE = "/Engine/BasicShapes/Sphere.Sphere"


def main():
    era.load_map()
    actors, levels, layers = era.get_subsystems()
    era.cleanup_generated(actors, GENERATED)
    layer = era.get_layer_instance(layers, LAYER_PATH)

    corrupted = era.material(MAT_PATH, "M_2045_Corrupted", (0.18, 0.04, 0.22), 0.55)
    tier = era.material(MAT_PATH, "M_2045_TierGlass", (0.05, 0.12, 0.18), 0.2)
    ash = era.material(MAT_PATH, "M_2045_Ash", (0.32, 0.3, 0.28), 0.92)

    # Tier-three Tannen corporate spire (visible when timeline corrupted).
    for index in range(5):
        height = 1800 + index * 1100
        era.block(actors, layers, f"HV2045_TierSpire_{index}", (0, 2200, height), (2600 - index * 220, 2600 - index * 220, 900),
                  tier, ("HV_2045_TannenTier", "HV_TimelineAnchor"), layer, GENERATED, ERA_TAG)
    era.sign(actors, layers, "HV2045_TannenSign", "TANNEN DYNASTY TIER III", (0, 800, 7200), layer, GENERATED, ERA_TAG, scale=2.8)

    # Heritage district ruins versus intact memorial path.
    era.block(actors, layers, "HV2045_HeritageRuin_A", (-9200, 11600, 420), (3200, 2400, 840), corrupted,
              ("HV_2045_Heritage", "HV_TimelineAnchor"), layer, GENERATED, ERA_TAG)
    era.block(actors, layers, "HV2045_HeritageRuin_B", (8200, 11600, 360), (3000, 2200, 720), ash,
              ("HV_2045_Heritage", "HV_TimelineAnchor"), layer, GENERATED, ERA_TAG)
    era.sign(actors, layers, "HV2045_HeritageSign", "HERITAGE DISTRICT — RESTRICTED", (-9200, 10200, 900),
             layer, GENERATED, ERA_TAG, scale=1.8)

    # Paradox storm orbs over courthouse.
    for index, (x, y) in enumerate(((-1200, 2600), (1200, 2600), (0, 4200))):
        era.spawn_mesh(actors, layers, f"HV2045_ParadoxOrb_{index}", SPHERE, (x, y, 2400), (2.2, 2.2, 2.2), corrupted,
                       ("HV_2045_Paradox",), layer, GENERATED, ERA_TAG)

    fog = actors.spawn_actor_from_class(unreal.ExponentialHeightFog, era.world_vector((0, 0, 0)), unreal.Rotator())
    fog.set_actor_label("HV2045_Atmosphere")
    fog.tags = [GENERATED, ERA_TAG, unreal.Name("HV_2045_Lighting")]
    fog.is_spatially_loaded = False
    fog_comp = fog.get_component_by_class(unreal.ExponentialHeightFogComponent)
    fog_comp.set_editor_property("fog_density", 0.028)
    fog_comp.set_editor_property("fog_inscattering_luminance", unreal.LinearColor(0.42, 0.18, 0.32, 1))
    era.assign_layer(layers, fog, layer)

    era.finish_era_build(levels, layer, layers, LAYER_PATH, "HILL_VALLEY_2045_BUILD_SUCCESS", [MAT_PATH])


if __name__ == "__main__":
    main()
