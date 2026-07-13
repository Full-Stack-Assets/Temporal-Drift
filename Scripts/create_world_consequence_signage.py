"""Create placeholder consequence signage materials referenced by WorldConsequenceSubsystem."""
import unreal

SIGNAGE_DEST = "/Game/Environment/HillValley/Signage"
TOOLS = unreal.AssetToolsHelpers.get_asset_tools()

CONSEQUENCE_MATERIALS = [
    ("MI_Consequence_Plaque", "Courthouse commemorative plaque variant"),
    ("MI_Consequence_Diner", "Lou's Cafe renamed sign variant"),
    ("MI_Consequence_School", "Hill Valley High dedication variant"),
    ("MI_Consequence_Portrait", "Founder portrait empty-frame variant"),
]


def ensure_material(name, description):
    path = f"{SIGNAGE_DEST}/{name}"
    if unreal.EditorAssetLibrary.does_asset_exist(path):
        unreal.log(f"CONSEQUENCE_SIGNAGE_EXISTS {path}")
        return unreal.EditorAssetLibrary.load_asset(path)

    unreal.EditorAssetLibrary.make_directory(SIGNAGE_DEST)
    factory = unreal.MaterialFactoryNew()
    asset = TOOLS.create_asset(name, SIGNAGE_DEST, unreal.Material, factory)
    if not asset:
        raise RuntimeError(f"Could not create consequence material {path}")
    unreal.EditorAssetLibrary.save_loaded_asset(asset, False)
    unreal.log(f"CONSEQUENCE_SIGNAGE_CREATED {path}: {description}")
    return asset


def main():
    for material_name, description in CONSEQUENCE_MATERIALS:
        ensure_material(material_name, description)
    unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
    unreal.log("WORLD_CONSEQUENCE_SIGNAGE_SUCCESS")


main()
