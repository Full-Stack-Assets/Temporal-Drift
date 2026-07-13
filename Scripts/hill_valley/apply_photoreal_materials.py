"""Ensure photoreal library exists and upgrade legacy flat materials on placed level actors."""
import os
import sys

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

import photoreal_material_library as library
import unreal

MATERIAL_PATH = "/Game/Materials/HillValley"
LEVEL_PATH = "/Game/Levels/LVL_TimeTravelTest"

LEGACY_TO_PBR = {
    "M_FlatColor": "M_HV_Concrete",
    "M_HV_Flat": "M_HV_Concrete",
    "M_HV_Default": "M_HV_Concrete",
    "M_HV_AsphaltFlat": "M_HV_Asphalt",
    "M_HV_BrickFlat": "M_HV_Brick_Red",
    "M_HV_GrassFlat": "M_HV_Grass",
}


def resolve_pbr_material(material_name):
    if not material_name:
        return None

    for legacy_key, target_name in LEGACY_TO_PBR.items():
        if legacy_key in material_name:
            path = f"{MATERIAL_PATH}/{target_name}"
            if unreal.EditorAssetLibrary.does_asset_exist(path):
                return unreal.EditorAssetLibrary.load_asset(path)
    return None


def upgrade_level_materials():
    library.build_library()
    library.load_material_map()

    upgraded_slots = 0
    inspected_actors = 0

    subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    all_actors = subsystem.get_all_level_actors() if subsystem else []

    for actor in all_actors:
        if actor.get_class().get_name() != "StaticMeshActor":
            continue

        inspected_actors += 1
        mesh_component = actor.static_mesh_component
        if not mesh_component:
            continue

        materials = mesh_component.get_materials()
        for slot_index, material in enumerate(materials):
            if material is None:
                continue

            replacement = resolve_pbr_material(material.get_name())
            if replacement is not None:
                mesh_component.set_material(slot_index, replacement)
                upgraded_slots += 1

    unreal.log(
        "PHOTOREAL_MATERIALS: upgraded {} material slots across {} static mesh actors".format(
            upgraded_slots, inspected_actors))
    unreal.log("PHOTOREAL_MATERIALS_APPLY_SUCCESS")


if __name__ == "__main__":
    upgrade_level_materials()
