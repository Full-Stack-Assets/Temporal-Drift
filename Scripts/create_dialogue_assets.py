"""Create M02 briefing dialogue assets and placeholder voice lines."""
import unreal

DIALOGUE_DEST = "/Game/Dialogue"
AUDIO_DEST = "/Game/Audio/Dialogue"
TOOLS = unreal.AssetToolsHelpers.get_asset_tools()


def ensure_sound(name):
    path = f"{AUDIO_DEST}/{name}"
    if unreal.EditorAssetLibrary.does_asset_exist(path):
        return path
    unreal.EditorAssetLibrary.make_directory(AUDIO_DEST)
    asset = TOOLS.create_asset(name, AUDIO_DEST, unreal.SoundWave, unreal.SoundFactory())
    unreal.EditorAssetLibrary.save_loaded_asset(asset, False)
    unreal.log(f"DIALOGUE_AUDIO_ASSET {path}")
    return path


def build_m02_briefing():
    path = f"{DIALOGUE_DEST}/DA_Dialogue_M02_CourthouseBriefing"
    asset = unreal.load_asset(path)
    if not asset:
        unreal.EditorAssetLibrary.make_directory(DIALOGUE_DEST)
        factory = unreal.DataAssetFactory()
        factory.set_editor_property("data_asset_class", unreal.DialogueDataAsset)
        asset = TOOLS.create_asset(
            "DA_Dialogue_M02_CourthouseBriefing", DIALOGUE_DEST, unreal.DialogueDataAsset, factory
        )

    asset.set_editor_property("conversation_id", "M02.CourthouseBriefing")
    asset.set_editor_property("entry_node_id", "ValeGreeting")

    voice_path = ensure_sound("VO_M02_ValeGreeting")

    node = unreal.DialogueNode()
    node.set_editor_property("node_id", "ValeGreeting")
    node.set_editor_property("speaker_id", "Vale")
    node.set_editor_property("speaker_display_name", "Dr. Emmett Vale")
    node.set_editor_property("line", "June and I need you at the courthouse. Install the sensor package, then jump to 1955.")
    node.set_editor_property("localization_key", "dialogue.m02.vale.greeting")
    node.set_editor_property("voice_audio_path", voice_path)
    node.set_editor_property("minimum_display_seconds", 2.0)
    node.set_editor_property("mission_event", "TalkedToValeAndJune")
    node.set_editor_property("automatic_next_node_id", "JuneReminder")

    node2 = unreal.DialogueNode()
    node2.set_editor_property("node_id", "JuneReminder")
    node2.set_editor_property("speaker_id", "June")
    node2.set_editor_property("speaker_display_name", "June Vale")
    node2.set_editor_property("line", "When you reach the square in 1955, calibrate the clocktower sensor carefully.")
    node2.set_editor_property("minimum_display_seconds", 1.5)

    asset.set_editor_property("nodes", [node, node2])
    unreal.EditorAssetLibrary.save_asset(path, only_if_is_dirty=False)
    unreal.log(f"DIALOGUE_ASSET_SAVED {path}")


def main():
    build_m02_briefing()
    unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
    unreal.log("DIALOGUE_ASSETS_SUCCESS")


main()
