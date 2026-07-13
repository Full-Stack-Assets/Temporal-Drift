"""Create campaign dialogue assets for M01 tutorial and M03 archive briefing."""
import unreal

DIALOGUE_DEST = "/Game/Dialogue"
AUDIO_DEST = "/Game/Audio/Dialogue"
TOOLS = unreal.AssetToolsHelpers.get_asset_tools()


def ensure_sound(name):
    path = f"{AUDIO_DEST}/{name}"
    if unreal.EditorAssetLibrary.does_asset_exist(path):
        return f"{path}.{name}"
    unreal.EditorAssetLibrary.make_directory(AUDIO_DEST)
    asset = TOOLS.create_asset(name, AUDIO_DEST, unreal.SoundCue, unreal.SoundCueFactoryNew())
    if not asset:
        raise RuntimeError(f"Could not create dialogue sound cue {path}")
    unreal.EditorAssetLibrary.save_loaded_asset(asset, False)
    unreal.log(f"DIALOGUE_AUDIO_ASSET {path}")
    return f"{path}.{name}"


def soft_object_path(path):
    result = unreal.SoftObjectPath()
    result.import_text(path)
    return result


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
    node.set_editor_property("voice_audio_path", soft_object_path(voice_path))
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
    node.set_editor_property("voice_audio_path", soft_object_path(voice_path))
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
    node.set_editor_property("voice_audio_path", soft_object_path(voice_path))
    node.set_editor_property("minimum_display_seconds", 2.0)
    node.set_editor_property("mission_event", "ArchiveBriefingComplete")
    save_dialogue("DA_Dialogue_M03_ArchiveBriefing", "M03.ArchiveBriefing", "JuneArchive", [node])


def build_m04_workshop_briefing():
    voice_path = ensure_sound("VO_M04_ValeWorkshop")
    node = unreal.DialogueNode()
    node.set_editor_property("node_id", "ValeWorkshop")
    node.set_editor_property("speaker_id", "Vale")
    node.set_editor_property("speaker_display_name", "Dr. Emmett Vale")
    node.set_editor_property("line", "The temporal regulator failed in transit. Recover the alloy and install the replacement before the storm window closes.")
    node.set_editor_property("localization_key", "dialogue.m04.vale.workshop")
    node.set_editor_property("voice_audio_path", soft_object_path(voice_path))
    node.set_editor_property("minimum_display_seconds", 2.0)
    node.set_editor_property("mission_event", "WorkshopEntered")
    save_dialogue("DA_Dialogue_M04_WorkshopBriefing", "M04.WorkshopBriefing", "ValeWorkshop", [node])


def build_m05_finale():
    voice_vale = ensure_sound("VO_M05_ValeFinale")
    voice_elena = ensure_sound("VO_M05_ElenaWitness")
    voice_crane = ensure_sound("VO_M05_CraneWarning")

    vale = unreal.DialogueNode()
    vale.set_editor_property("node_id", "ValeFinale")
    vale.set_editor_property("speaker_id", "Vale")
    vale.set_editor_property("speaker_display_name", "Dr. Emmett Vale")
    vale.set_editor_property("line", "The lightning will strike the clocktower at 10:04. Hit eighty-eight on the courthouse run and do not stop.")
    vale.set_editor_property("voice_audio_path", soft_object_path(voice_vale))
    vale.set_editor_property("minimum_display_seconds", 2.5)
    vale.set_editor_property("automatic_next_node_id", "ElenaWitness")

    elena = unreal.DialogueNode()
    elena.set_editor_property("node_id", "ElenaWitness")
    elena.set_editor_property("speaker_id", "Elena")
    elena.set_editor_property("speaker_display_name", "Elena Crane")
    elena.set_editor_property("line", "I will keep the square clear. When you return, inspect the plaque and tell us what changed.")
    elena.set_editor_property("voice_audio_path", soft_object_path(voice_elena))
    elena.set_editor_property("minimum_display_seconds", 2.0)
    elena.set_editor_property("automatic_next_node_id", "CraneWarning")

    crane = unreal.DialogueNode()
    crane.set_editor_property("node_id", "CraneWarning")
    crane.set_editor_property("speaker_id", "Crane")
    crane.set_editor_property("speaker_display_name", "Officer Crane")
    crane.set_editor_property("line", "Move the crowd back from the cable route. This storm is not a drill.")
    crane.set_editor_property("voice_audio_path", soft_object_path(voice_crane))
    crane.set_editor_property("minimum_display_seconds", 1.5)
    crane.set_editor_property("mission_event", "CampaignResolved")

    save_dialogue("DA_Dialogue_M05_LightningFinale", "M05.LightningFinale", "ValeFinale", [vale, elena, crane])


def main():
    build_m01_garage_tutorial()
    build_m02_briefing()
    build_m03_archive_briefing()
    build_m04_workshop_briefing()
    build_m05_finale()
    unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
    unreal.log("DIALOGUE_ASSETS_SUCCESS")


main()
