"""Import downloaded CC0 textures and upgrade Temporal Drift materials.

Run through UnrealEditor-Cmd from the repo root after downloading assets.
By default this only creates the new PBR library and does not overwrite existing
project material assets, which may be locked while the editor is open:

    UnrealEditor-Cmd.exe BTTF_TemporalDrift.uproject -unattended -nop4 -nosplash -NullRHI -run=pythonscript -script=Scripts/Assets/import_cc0_textures_to_unreal.py -log

Add `--apply-targets` to the script args only when Unreal Editor is closed and
you explicitly want to overwrite mapped legacy material assets.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
import sys

import unreal


ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = ROOT / "ExternalAssets" / "asset_manifest.local.json"
DEST_ROOT = "/Game/ExternalAssets/CC0/PolyHaven"
ALIAS_ROOT = "/Game/Materials/HillValley/PBR"

asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
library = unreal.EditorAssetLibrary


def log(message: str) -> None:
    unreal.log(f"TEMPORAL_DRIFT_ASSETS: {message}")


def ensure_dir(path: str) -> None:
    if not library.does_directory_exist(path):
        library.make_directory(path)


def sanitize(name: str) -> str:
    return "".join(ch if ch.isalnum() else "_" for ch in name)


def import_texture(source_file: str, destination_path: str, asset_name: str) -> str:
    ensure_dir(destination_path)
    expected = f"{destination_path}/{asset_name}"
    if library.does_asset_exist(expected):
        return expected

    task = unreal.AssetImportTask()
    task.filename = source_file
    task.destination_path = destination_path
    task.destination_name = asset_name
    task.automated = True
    task.replace_existing = True
    task.save = True
    asset_tools.import_asset_tasks([task])
    if not library.does_asset_exist(expected):
        raise RuntimeError(f"Import failed for {source_file} -> {expected}")
    return expected


def make_texture_sample(material, texture, x: int, y: int):
    node = unreal.MaterialEditingLibrary.create_material_expression(
        material,
        unreal.MaterialExpressionTextureSample,
        x,
        y,
    )
    node.set_editor_property("texture", texture)
    return node


def create_or_update_material(material_path: str, texture_paths: dict[str, str]) -> None:
    folder, asset_name = material_path.rsplit("/", 1)
    ensure_dir(folder)
    material = library.load_asset(material_path)
    if material is None:
        material = asset_tools.create_asset(asset_name, folder, unreal.Material, unreal.MaterialFactoryNew())
    if material is None:
        raise RuntimeError(f"Could not create material {material_path}")

    unreal.MaterialEditingLibrary.delete_all_material_expressions(material)

    base = library.load_asset(texture_paths["basecolor"])
    base_node = make_texture_sample(material, base, -720, -120)
    unreal.MaterialEditingLibrary.connect_material_property(
        base_node,
        "RGB",
        unreal.MaterialProperty.MP_BASE_COLOR,
    )

    roughness_path = texture_paths.get("roughness")
    if roughness_path:
        rough = library.load_asset(roughness_path)
        if rough:
            rough.set_editor_property("srgb", False)
            rough_node = make_texture_sample(material, rough, -720, 140)
            unreal.MaterialEditingLibrary.connect_material_property(
                rough_node,
                "R",
                unreal.MaterialProperty.MP_ROUGHNESS,
            )

    normal_path = texture_paths.get("normal")
    if normal_path:
        normal = library.load_asset(normal_path)
        if normal:
            normal.set_editor_property("srgb", False)
            try:
                normal.set_editor_property("compression_settings", unreal.TextureCompressionSettings.TC_NORMALMAP)
            except Exception:
                pass
            normal_node = make_texture_sample(material, normal, -720, 400)
            unreal.MaterialEditingLibrary.connect_material_property(
                normal_node,
                "RGB",
                unreal.MaterialProperty.MP_NORMAL,
            )

    unreal.MaterialEditingLibrary.recompile_material(material)
    library.save_loaded_asset(material, only_if_is_dirty=False)
    log(f"updated material {material_path}")


def main() -> None:
    apply_targets = "--apply-targets" in sys.argv
    if not MANIFEST_PATH.exists():
        raise RuntimeError(f"Missing manifest: {MANIFEST_PATH}. Run download_cc0_starter_assets.py first.")

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    ensure_dir(DEST_ROOT)
    ensure_dir(ALIAS_ROOT)

    material_count = 0
    texture_count = 0
    for entry in manifest.get("assets", []):
        asset_id = entry["id"]
        unreal_folder = f"{DEST_ROOT}/{sanitize(asset_id)}"
        imported: dict[str, str] = {}
        for map_name, map_info in entry.get("maps", {}).items():
            source = os.path.normpath(str(ROOT / map_info["path"]))
            if not os.path.exists(source):
                log(f"missing downloaded map, skipping: {source}")
                continue
            asset_name = f"T_{sanitize(asset_id)}_{map_name}"
            imported[map_name] = import_texture(source, unreal_folder, asset_name)
            texture_count += 1

        if "basecolor" not in imported:
            log(f"skipping material creation for {asset_id}; no basecolor imported")
            continue

        alias_path = f"{ALIAS_ROOT}/M_PH_{sanitize(asset_id)}"
        create_or_update_material(alias_path, imported)
        material_count += 1

        if apply_targets:
            for target_path in entry.get("targets", []):
                create_or_update_material(target_path, imported)
                material_count += 1

    log(f"import complete: {texture_count} textures, {material_count} materials")


main()
