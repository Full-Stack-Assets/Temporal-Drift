"""Import user-provided licensed music/ambience WAV files into Unreal.

Put files in SourceArt/Audio/Music/Intake using the names in
SourceArt/Audio/Music/MusicIntakeManifest.json.
"""

from __future__ import annotations

import json
from pathlib import Path

import unreal


ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "SourceArt" / "Audio" / "Music" / "MusicIntakeManifest.json"
INTAKE = ROOT / "SourceArt" / "Audio" / "Music" / "Intake"

TOOLS = unreal.AssetToolsHelpers.get_asset_tools()
LIBRARY = unreal.EditorAssetLibrary


def log(message: str) -> None:
    unreal.log(f"MUSIC_INTAKE: {message}")


def ensure_dir(path: str) -> None:
    if not LIBRARY.does_directory_exist(path):
        LIBRARY.make_directory(path)


def split_dest(destination: str) -> tuple[str, str]:
    folder, asset_name = destination.rsplit("/", 1)
    return folder, asset_name


def import_wav(source: Path, destination: str) -> bool:
    folder, asset_name = split_dest(destination)
    ensure_dir(folder)
    task = unreal.AssetImportTask()
    task.filename = str(source)
    task.destination_path = folder
    task.destination_name = asset_name
    task.automated = True
    task.replace_existing = True
    task.save = True
    TOOLS.import_asset_tasks([task])
    exists = LIBRARY.does_asset_exist(destination)
    log(f"{'imported' if exists else 'failed'} {source.name} -> {destination}")
    return exists


def main() -> None:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    INTAKE.mkdir(parents=True, exist_ok=True)
    imported = 0
    missing = []
    for track in data["tracks"]:
        source = INTAKE / track["file"]
        if not source.exists():
            missing.append(track["file"])
            continue
        if import_wav(source, track["destination"]):
            imported += 1
    unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
    log(f"import complete: {imported} imported, {len(missing)} missing")
    if missing:
        log("missing files: " + ", ".join(missing))


main()
