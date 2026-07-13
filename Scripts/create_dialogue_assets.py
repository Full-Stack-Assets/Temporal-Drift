"""Create campaign dialogue assets for M01 tutorial and M03 archive briefing."""
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


def save_dialogue(asset_name, conversation_id, entry_node_id, nodes):
    path = f"{DIALOGUE_DEST}/{asset_name}"
    asset = unreal.load_asset(path)
    if not asset:
        unreal.EditorAssetLibrary.make_directory(DIALOGUE_DEST)
        factory = unreal.DataAssetFactory()
        factory.set_editor_property("data_asset_class", unreal.DialogueDataAsset)
        asset = TOOLS.create_asset(asset_name, DIALOGUE_DEST, unreal.DialogueDataAsset, factory)

    asset.set_editor_property("conversation_id", conversation_id)
    asset.set_editor_property("entry_node_id", entry_node_id)
    asset.set_editor_property("nodes", nodes)
    unreal.EditorAssetLibrary.save_asset(path, only_if_is_dirty=False)
    unreal.log(f"DIALOGUE_ASSET_SAVED {path}")


def build_m01_garage_tutorial():
    voice_path = ensure_sound("VO_M01_ValeTutorial")
    node = unreal.DialogueNode()
    node.set_editor_property("node_id", "ValeTutorial")
    node.set_editor_property("speaker_id", "Vale")
    node.set_editor_property("speaker_display_name", "Dr. Emmett Vale")
    node.set_editor_property("line", "Collect the calibration parts, install them on the DeLorean, then complete the courthouse course.")
    node.set_editor_property("localization_key", "dialogue.m01.vale.tutorial")
    node.set_editor_property("voice_audio_path", voice_path)
    node.set_editor_property("minimum_display_seconds", 2.0)
    node.set_editor_property("mission_event", "TalkedToVale")
    save_dialogue("DA_Dialogue_M01_GarageTutorial", "M01.GarageTutorial", "ValeTutorial", [node])


def build_m02_briefing():
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
    node2.set_editor_property("speaker_display_name", "June Parker")
    node2.set_editor_property("line", "When you reach the square in 1955, calibrate the clocktower sensor carefully.")
    node2.set_editor_property("minimum_display_seconds", 1.5)
    save_dialogue("DA_Dialogue_M02_CourthouseBriefing", "M02.CourthouseBriefing", "ValeGreeting", [node, node2])


def build_m03_archive_briefing():
    voice_path = ensure_sound("VO_M03_JuneArchive")
    node = unreal.DialogueNode()
    node.set_editor_property("node_id", "JuneArchive")
    node.set_editor_property("speaker_id", "June")
    node.set_editor_property("speaker_display_name", "June Parker")
    node.set_editor_property("line", "The courthouse archives changed overnight. Inspect the diner sign, school dedication, and founder portrait.")
    node.set_editor_property("localization_key", "dialogue.m03.june.archive")
    node.set_editor_property("voice_audio_path", voice_path)
    node.set_editor_property("minimum_display_seconds", 2.0)
    node.set_editor_property("mission_event", "ArchiveBriefingComplete")
    save_dialogue("DA_Dialogue_M03_ArchiveBriefing", "M03.ArchiveBriefing", "JuneArchive", [node])


def main():
    build_m01_garage_tutorial()
    build_m02_briefing()
    build_m03_archive_briefing()
    unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
    unreal.log("DIALOGUE_ASSETS_SUCCESS")


main()
