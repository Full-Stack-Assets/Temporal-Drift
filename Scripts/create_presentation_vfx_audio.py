"""Create placeholder Niagara and sound assets for the Task 8 presentation contract."""
import unreal

NIAGARA_DEST = "/Game/Niagara"
AUDIO_DEST = "/Game/Audio/MetaSounds"
TOOLS = unreal.AssetToolsHelpers.get_asset_tools()


def ensure_niagara(name):
    path = f"{NIAGARA_DEST}/{name}"
    if unreal.EditorAssetLibrary.does_asset_exist(path):
        return unreal.EditorAssetLibrary.load_asset(path)
    unreal.EditorAssetLibrary.make_directory(NIAGARA_DEST)
    factory = unreal.NiagaraSystemFactoryNew()
    asset = TOOLS.create_asset(name, NIAGARA_DEST, unreal.NiagaraSystem, factory)
    unreal.EditorAssetLibrary.save_loaded_asset(asset, False)
    unreal.log(f"PRESENTATION_NIAGARA_ASSET {path}")
    return asset


def ensure_sound(name):
    path = f"{AUDIO_DEST}/{name}"
    if unreal.EditorAssetLibrary.does_asset_exist(path):
        return unreal.EditorAssetLibrary.load_asset(path)
    unreal.EditorAssetLibrary.make_directory(AUDIO_DEST)
    factory = unreal.SoundCueFactoryNew()
    asset = TOOLS.create_asset(name, AUDIO_DEST, unreal.SoundCue, factory)
    if not asset:
        raise RuntimeError(f"Could not create placeholder sound cue {path}")
    unreal.EditorAssetLibrary.save_loaded_asset(asset, False)
    unreal.log(f"PRESENTATION_AUDIO_ASSET {path}")
    return asset


def main():
    for asset_name in ("NS_FluxCharge", "NS_TemporalVortex", "NS_FireTrails", "NS_ArrivalFrost"):
        ensure_niagara(asset_name)
    for asset_name in ("MS_FluxHum", "MS_TimeDeparture", "MS_TimeArrival"):
        ensure_sound(asset_name)
    unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
    unreal.log("PRESENTATION_VFX_AUDIO_ASSETS_SUCCESS")


main()
