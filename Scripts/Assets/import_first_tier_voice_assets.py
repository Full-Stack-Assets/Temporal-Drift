"""Import generated first-tier character voice WAVs into Unreal dialogue assets."""

from __future__ import annotations

import json
from pathlib import Path

import unreal


ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / "SourceArt" / "Audio" / "GeneratedVoice" / "FirstTierVoiceLines.json"
WAV_DIR = ROOT / "SourceArt" / "Audio" / "GeneratedVoice" / "WAV"
AUDIO_DEST = "/Game/Audio/Dialogue/FirstTier"
DIALOGUE_DEST = "/Game/Dialogue/FirstTier"

TOOLS = unreal.AssetToolsHelpers.get_asset_tools()
LIBRARY = unreal.EditorAssetLibrary


def log(message: str) -> None:
    unreal.log(f"FIRST_TIER_CAST: {message}")


def ensure_dir(path: str) -> None:
    if not LIBRARY.does_directory_exist(path):
        LIBRARY.make_directory(path)


def import_wav(line_id: str) -> str:
    ensure_dir(AUDIO_DEST)
    wav = WAV_DIR / f"{line_id}.wav"
    if not wav.exists():
        raise RuntimeError(f"Missing generated WAV: {wav}")
    asset_path = f"{AUDIO_DEST}/{line_id}"
    if LIBRARY.does_asset_exist(asset_path):
        return f"{asset_path}.{line_id}"
    task = unreal.AssetImportTask()
    task.filename = str(wav)
    task.destination_path = AUDIO_DEST
    task.destination_name = line_id
    task.automated = True
    task.replace_existing = True
    task.save = True
    TOOLS.import_asset_tasks([task])
    if not LIBRARY.does_asset_exist(asset_path):
        raise RuntimeError(f"Could not import {wav}")
    return f"{asset_path}.{line_id}"


def soft_object_path(path: str):
    result = unreal.SoftObjectPath()
    result.import_text(path)
    return result


def save_character_dialogue(character: dict) -> None:
    ensure_dir(DIALOGUE_DEST)
    nodes = []
    for index, line in enumerate(character["lines"]):
        node = unreal.DialogueNode()
        node.set_editor_property("node_id", line["id"])
        node.set_editor_property("speaker_id", character["id"])
        node.set_editor_property("speaker_display_name", character["display_name"])
        node.set_editor_property("line", line["text"])
        node.set_editor_property("localization_key", f"dialogue.firsttier.{character['id'].lower()}.{index + 1:03d}")
        node.set_editor_property("voice_audio_path", soft_object_path(import_wav(line["id"])))
        node.set_editor_property("minimum_display_seconds", max(1.5, min(5.0, len(line["text"]) / 45.0)))
        if index + 1 < len(character["lines"]):
            node.set_editor_property("automatic_next_node_id", character["lines"][index + 1]["id"])
        nodes.append(node)

    asset_name = f"DA_Dialogue_FirstTier_{character['id']}"
    path = f"{DIALOGUE_DEST}/{asset_name}"
    asset = unreal.load_asset(path)
    if not asset:
        factory = unreal.DataAssetFactory()
        factory.set_editor_property("data_asset_class", unreal.DialogueDataAsset)
        asset = TOOLS.create_asset(asset_name, DIALOGUE_DEST, unreal.DialogueDataAsset, factory)
    asset.set_editor_property("conversation_id", f"FirstTier.{character['id']}")
    asset.set_editor_property("entry_node_id", character["lines"][0]["id"])
    asset.set_editor_property("nodes", nodes)
    LIBRARY.save_asset(path, only_if_is_dirty=False)
    log(f"saved {path}")


def main() -> None:
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    for character in data["cast"]:
        save_character_dialogue(character)
    unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
    log("first-tier voice import complete")


main()
