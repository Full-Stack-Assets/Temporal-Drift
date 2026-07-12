"""Assigns the SportsCar skeletal mesh + anim BP to BP_DeLorean's Mesh component."""
import unreal

bp = unreal.load_object(None, "/Game/Blueprints/BP_DeLorean.BP_DeLorean")
bp_gc = unreal.load_object(None, "/Game/Blueprints/BP_DeLorean.BP_DeLorean_C")
cdo = unreal.get_default_object(bp_gc)

# Load skeleton first so the anim BP can resolve it
skeleton = unreal.load_object(None, "/Game/Vehicles/SportsCar/SK_SportsCar.SK_SportsCar")
skm = unreal.load_object(None, "/Game/Vehicles/SportsCar/SKM_SportsCar.SKM_SportsCar")
abp = unreal.load_object(None, "/Game/Vehicles/SportsCar/ABP_SportsCar.ABP_SportsCar_C")

mesh = cdo.get_editor_property("mesh")
mesh.set_editor_property("skeletal_mesh_asset", skm)
if abp:
    mesh.set_editor_property("anim_class", abp)
else:
    unreal.log_warning("ABP_SportsCar could not be loaded; anim class not set")

unreal.EditorAssetLibrary.save_loaded_asset(bp)
unreal.log("Mesh assigned to BP_DeLorean")
