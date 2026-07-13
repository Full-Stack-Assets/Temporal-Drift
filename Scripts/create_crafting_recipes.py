"""Create crafting recipe data asset for vertical-slice sensor package crafting."""
import unreal

DEST = "/Game/Data/Crafting"
TOOLS = unreal.AssetToolsHelpers.get_asset_tools()


def main():
    path = f"{DEST}/DA_Crafting_VerticalSlice"
    asset = unreal.load_asset(path)
    if not asset:
        unreal.EditorAssetLibrary.make_directory(DEST)
        factory = unreal.DataAssetFactory()
        asset = TOOLS.create_asset(
            "DA_Crafting_VerticalSlice", DEST, unreal.CraftingRecipeDataAsset, factory)
        unreal.log(f"CRAFTING_PLACEHOLDER {path}")

    unreal.EditorAssetLibrary.save_asset(path, only_if_is_dirty=False)
    unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
    unreal.log("CRAFTING_RECIPES_SUCCESS")


main()
