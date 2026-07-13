"""Validate photoreal material masters and Hill Valley instances."""
import os
import sys

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

import unreal
import photoreal_material_library as library

MATERIAL_PATH = "/Game/Materials/HillValley"
PBR_PATH = "/Game/Materials/PBR"
REQUIRED_MASTERS = sorted({spec[0] for spec in library.INSTANCE_SPECS.values()})
REQUIRED_INSTANCES = sorted(library.INSTANCE_SPECS.keys())


def validate_parent(instance_path):
    instance = unreal.EditorAssetLibrary.load_asset(instance_path)
    if instance is None:
        raise RuntimeError(f"Missing instance: {instance_path}")
    parent = instance.get_editor_property("parent")
    if parent is None:
        raise RuntimeError(f"Instance has no parent: {instance_path}")
    return parent


def main():
  for master in REQUIRED_MASTERS:
      path = f"{PBR_PATH}/{master}"
      if not unreal.EditorAssetLibrary.does_asset_exist(path):
          raise RuntimeError(f"Missing PBR master: {path}")

  for instance_name in REQUIRED_INSTANCES:
      instance_path = f"{MATERIAL_PATH}/{instance_name}"
      if not unreal.EditorAssetLibrary.does_asset_exist(instance_path):
          raise RuntimeError(f"Missing material instance: {instance_path}")
      validate_parent(instance_path)

  material_map = library.load_material_map()
  if len(material_map) != len(library.MATERIAL_KEY_ALIASES):
      raise RuntimeError("Material alias map incomplete")

  unreal.log(f"PHOTOREAL_MATERIAL_VALIDATION_SUCCESS instances={len(REQUIRED_INSTANCES)} masters={len(REQUIRED_MASTERS)}")


if __name__ == "__main__":
    main()
