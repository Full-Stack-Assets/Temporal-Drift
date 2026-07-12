"""Create World Partition Data Layer assets/instances for each Temporal Drift era."""
import unreal

ERA_NAMES = (
    "DL_1885",
    "DL_1955",
    "DL_1985_Present",
    "DL_1985_Alternate",
    "DL_2015",
    "DL_2045",
)
ASSET_PATH = "/Game/Data/DataLayers"

asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
subsystem = unreal.get_editor_subsystem(unreal.DataLayerEditorSubsystem)
if not subsystem:
    raise RuntimeError("DataLayerEditorSubsystem unavailable; open the World Partition map first")

instances_by_name = {
    instance.get_editor_property("data_layer_asset").get_name(): instance
    for instance in subsystem.get_all_data_layers()
    if instance.get_editor_property("data_layer_asset")
}

for era_name in ERA_NAMES:
    asset_path = f"{ASSET_PATH}/{era_name}"
    asset = unreal.EditorAssetLibrary.load_asset(asset_path)
    if not asset:
        asset = asset_tools.create_asset(
            era_name, ASSET_PATH, unreal.DataLayerAsset, unreal.DataLayerFactory()
        )
        if not asset:
            raise RuntimeError(f"Failed to create {asset_path}")
        unreal.EditorAssetLibrary.save_loaded_asset(asset)

    instance = instances_by_name.get(era_name)
    if not instance:
        params = unreal.DataLayerCreationParameters()
        params.set_editor_property("data_layer_asset", asset)
        params.set_editor_property("is_private", False)
        instance = subsystem.create_data_layer_instance(params)
        if not instance:
            raise RuntimeError(f"Failed to create Data Layer instance for {era_name}")
        instances_by_name[era_name] = instance

    is_present = era_name == "DL_1985_Present"
    subsystem.set_data_layer_visibility(instance, is_present)
    subsystem.set_data_layer_is_loaded_in_editor(instance, True, False)
    subsystem.set_data_layer_initial_runtime_state(
        instance,
        unreal.DataLayerRuntimeState.ACTIVATED
        if is_present
        else unreal.DataLayerRuntimeState.UNLOADED,
    )
    unreal.log(f"ERA_LAYER ready {era_name} present={is_present}")

# Assign the simple era-test buildings across eras, leaving gameplay/lighting shared.
actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()
era_cycle = ("DL_1885", "DL_1955", "DL_1985_Alternate", "DL_2015")
for actor in actors:
    label = actor.get_actor_label()
    if label.startswith("EraTestBuilding_"):
        index = int(label.rsplit("_", 1)[1]) - 1
        target = instances_by_name[era_cycle[index % len(era_cycle)]]
        subsystem.add_actor_to_data_layer(actor, target)
        unreal.log(
            f"ERA_LAYER assigned {label} to "
            f"{target.get_editor_property('data_layer_asset').get_name()}"
        )

unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).save_current_level()
unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
unreal.log("ERA_LAYER all era Data Layers created and saved")
