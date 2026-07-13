"""Create and assign the production DeLorean tuning data asset."""
import unreal

asset_path = "/Game/Vehicles/DeLorean"
asset_name = "DA_DeLoreanTuning"
full_path = f"{asset_path}/{asset_name}.{asset_name}"

tuning = unreal.load_object(None, full_path)
if tuning is None:
    tuning_class = unreal.load_class(
        None, "/Script/BTTF_TemporalDrift.DeLoreanTuningData")
    if tuning_class is None:
        raise RuntimeError("DeLoreanTuningData class did not load")
    factory = unreal.DataAssetFactory()
    factory.set_editor_property("data_asset_class", tuning_class)
    tuning = unreal.AssetToolsHelpers.get_asset_tools().create_asset(
        asset_name, asset_path, tuning_class, factory)

vehicle_class = unreal.load_class(
    None, "/Game/Blueprints/BP_DeLorean.BP_DeLorean_C")
if vehicle_class is None:
    raise RuntimeError("BP_DeLorean class did not load")

cdo = unreal.get_default_object(vehicle_class)
cdo.set_editor_property("TuningDataAsset", tuning)
unreal.EditorAssetLibrary.save_asset(f"{asset_path}/{asset_name}")
unreal.EditorAssetLibrary.save_asset("/Game/Blueprints/BP_DeLorean")
unreal.log("BTTF_DELOREAN_TUNING_ASSET_SUCCESS")
