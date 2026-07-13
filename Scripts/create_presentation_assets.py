"""Create the reusable temporal post-process material assets for Task 8."""
import unreal

DEST = "/Game/Materials/PostProcess"
TOOLS = unreal.AssetToolsHelpers.get_asset_tools()


def material(name, strength, color):
    path = f"{DEST}/{name}"
    if unreal.EditorAssetLibrary.does_asset_exist(path):
        return unreal.EditorAssetLibrary.load_asset(path)
    unreal.EditorAssetLibrary.make_directory(DEST)
    asset = TOOLS.create_asset(name, DEST, unreal.Material, unreal.MaterialFactoryNew())
    asset.set_editor_property("material_domain", unreal.MaterialDomain.MD_POST_PROCESS)
    scalar = unreal.MaterialEditingLibrary.create_material_expression(
        asset, unreal.MaterialExpressionScalarParameter, -500, 0
    )
    scalar.set_editor_property("parameter_name", "TemporalDistortionStrength")
    scalar.set_editor_property("default_value", strength)
    tint = unreal.MaterialEditingLibrary.create_material_expression(
        asset, unreal.MaterialExpressionConstant3Vector, -500, 180
    )
    tint.set_editor_property("constant", unreal.LinearColor(*color, 1.0))
    multiply = unreal.MaterialEditingLibrary.create_material_expression(
        asset, unreal.MaterialExpressionMultiply, -200, 80
    )
    unreal.MaterialEditingLibrary.connect_material_expressions(scalar, "", multiply, "A")
    unreal.MaterialEditingLibrary.connect_material_expressions(tint, "", multiply, "B")
    unreal.MaterialEditingLibrary.connect_material_property(
        multiply, "", unreal.MaterialProperty.MP_EMISSIVE_COLOR
    )
    unreal.MaterialEditingLibrary.recompile_material(asset)
    unreal.EditorAssetLibrary.save_loaded_asset(asset, False)
    unreal.log(f"TEMPORAL_PRESENTATION_ASSET {path}")
    return asset


def main():
    material("M_TemporalDistortion", 0.65, (0.18, 0.55, 1.0))
    material("M_TemporalDistortion_ReducedFlash", 0.20, (0.12, 0.32, 0.55))
    material("M_TemporalArrivalFrost", 0.35, (0.55, 0.82, 1.0))
    unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
    unreal.log("TEMPORAL_PRESENTATION_ASSETS_SUCCESS")


main()
