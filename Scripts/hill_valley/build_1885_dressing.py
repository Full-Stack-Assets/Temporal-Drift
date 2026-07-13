"""1885 Wild West dressing on DL_1885."""
import os
import sys

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

import hill_valley_era_dressing_common as era

GENERATED = unreal.Name("HV_1885_Generated")
ERA_TAG = unreal.Name("HV_Era1885")
MAT_PATH = "/Game/Environment/HillValley/1885/Materials"
LAYER_PATH = "/Game/Data/DataLayers/DL_1885.DL_1885"
CYLINDER = "/Engine/BasicShapes/Cylinder.Cylinder"
SPHERE = "/Engine/BasicShapes/Sphere.Sphere"


def main():
    era.load_map()
    actors, levels, layers = era.get_subsystems()
    era.cleanup_generated(actors, GENERATED)
    layer = era.get_layer_instance(layers, LAYER_PATH)

    dust = era.material(MAT_PATH, "M_1885_Dust", (0.58, 0.46, 0.28))
    wood = era.material(MAT_PATH, "M_1885_Wood", (0.22, 0.12, 0.05), 0.9)
    saloon = era.material(MAT_PATH, "M_1885_Saloon", (0.42, 0.14, 0.08))
    canvas = era.material(MAT_PATH, "M_1885_Canvas", (0.72, 0.66, 0.48))

    # Saloon row west of courthouse approach.
    era.block(actors, layers, "HV1885_Saloon_Main", (-6200, -1800, 520), (3600, 2800, 1040), saloon,
              ("HV_1885_Saloon", "HV_District_Rural"), layer, GENERATED, ERA_TAG, collision=True)
    era.sign(actors, layers, "HV1885_SaloonSign", "PALACE SALOON", (-6200, -3200, 900), layer, GENERATED, ERA_TAG)

    for index in range(4):
        x = -8200 + index * 1800
        era.block(actors, layers, f"HV1885_FrontierStore_{index}", (x, -4200, 360), (1500, 1200, 720), wood,
                  ("HV_1885_Storefront",), layer, GENERATED, ERA_TAG)
        era.block(actors, layers, f"HV1885_CanvasAwning_{index}", (x, -4900, 520), (1300, 80, 40), canvas,
                  ("HV_1885_Storefront",), layer, GENERATED, ERA_TAG)

    # Horse hitching posts and water troughs.
    for index, (x, y) in enumerate(((-5200, -2600), (-7200, -3600), (-4200, -3600))):
        era.spawn_mesh(actors, layers, f"HV1885_HitchPost_{index}", CYLINDER, (x, y, 120), (.2, .2, 1.8), wood,
                       ("HV_1885_StreetFurniture",), layer, GENERATED, ERA_TAG, collision=True)
        era.block(actors, layers, f"HV1885_Trough_{index}", (x + 300, y, 60), (420, 180, 120), wood,
                  ("HV_1885_StreetFurniture",), layer, GENERATED, ERA_TAG)

    # Rail survey camp (future mall site).
    era.block(actors, layers, "HV1885_RailCamp", (8200, -6200, 220), (2800, 2200, 440), canvas,
              ("HV_1885_RailSurvey", "HV_TimelineAnchor"), layer, GENERATED, ERA_TAG)
    era.sign(actors, layers, "HV1885_RailSign", "PACIFIC RAIL SURVEY", (8200, -7400, 420), layer, GENERATED, ERA_TAG)

    # Land dispute marker near Twin Pines analogue.
    era.block(actors, layers, "HV1885_LandDispute", (-10200, -17800, 180), (2200, 2200, 360), dust,
              ("HV_1885_LandDispute", "HV_TimelineAnchor"), layer, GENERATED, ERA_TAG)
    era.sign(actors, layers, "HV1885_LandSign", "TANNEN HOMESTEAD CLAIM", (-10200, -19000, 420), layer, GENERATED, ERA_TAG)

    fog = actors.spawn_actor_from_class(unreal.ExponentialHeightFog, era.world_vector((0, 0, 0)), unreal.Rotator())
    fog.set_actor_label("HV1885_Atmosphere")
    fog.tags = [GENERATED, ERA_TAG, unreal.Name("HV_1885_Lighting")]
    fog.is_spatially_loaded = False
    fog_comp = fog.get_component_by_class(unreal.ExponentialHeightFogComponent)
    fog_comp.set_editor_property("fog_density", 0.018)
    fog_comp.set_editor_property("fog_inscattering_luminance", unreal.LinearColor(0.72, 0.58, 0.42, 1))
    era.assign_layer(layers, fog, layer)

    era.finish_era_build(levels, layer, layers, LAYER_PATH, "HILL_VALLEY_1885_BUILD_SUCCESS", [MAT_PATH])


if __name__ == "__main__":
    main()
