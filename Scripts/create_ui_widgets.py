"""Create authored UMG widget blueprints backed by the C++ widget classes."""
import unreal

UI_DEST = "/Game/UI"
TOOLS = unreal.AssetToolsHelpers.get_asset_tools()


def widget_blueprint(name, parent_class_path):
    path = f"{UI_DEST}/{name}"
    if unreal.EditorAssetLibrary.does_asset_exist(path):
        unreal.log(f"UI_WIDGET_EXISTS {path}")
        return unreal.EditorAssetLibrary.load_asset(path)

    unreal.EditorAssetLibrary.make_directory(UI_DEST)
    parent_class = unreal.load_class(None, parent_class_path)
    factory = unreal.WidgetBlueprintFactory()
    factory.set_editor_property("parent_class", parent_class)
    asset = TOOLS.create_asset(name, UI_DEST, unreal.WidgetBlueprint, factory)
    unreal.EditorAssetLibrary.save_loaded_asset(asset, False)
    unreal.log(f"UI_WIDGET_CREATED {path}")
    return asset


def main():
    widget_blueprint("WBP_TimeCircuits", "/Script/BTTF_TemporalDrift.TimeCircuitsWidget")
    widget_blueprint("WBP_DrivingHUD", "/Script/BTTF_TemporalDrift.TimeCircuitsWidget")
    unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
    unreal.log("UI_WIDGETS_SUCCESS")


main()
