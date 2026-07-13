"""Creates controller input assets and BP_BTTF_PlayerController (vehicle actions stay on the DeLorean)."""
import unreal

ASSET_PATH = "/Game/Input"
BP_PATH = "/Game/Blueprints"

asset_tools = unreal.AssetToolsHelpers.get_asset_tools()


def load_or_create_context(name):
    path = f"{ASSET_PATH}/{name}.{name}"
    context = unreal.load_object(None, path)
    if context is None:
        context = asset_tools.create_asset(name, ASSET_PATH, unreal.InputMappingContext, unreal.DataAssetFactory())
    return context


imc_path = f"{ASSET_PATH}/IMC_PlayerController.IMC_PlayerController"
imc = unreal.load_object(None, imc_path)
if imc is None:
    imc = asset_tools.create_asset(
        "IMC_PlayerController", ASSET_PATH, unreal.InputMappingContext, unreal.DataAssetFactory())

# Controller context is intentionally empty — time circuits, jump, and hover bind on the DeLorean pawn.
imc.set_editor_property("mappings", [])

movement_context = load_or_create_context("IMC_Movement")
camera_context = load_or_create_context("IMC_CameraOrbit")

bp_path = f"{BP_PATH}/BP_BTTF_PlayerController.BP_BTTF_PlayerController_C"
bp_gc = unreal.load_object(None, bp_path)
if bp_gc is None:
    bp_factory = unreal.BlueprintFactory()
    bp_factory.set_editor_property(
        "parent_class",
        unreal.load_class(None, "/Script/BTTF_TemporalDrift.BTTF_PlayerController"))
    bp = asset_tools.create_asset("BP_BTTF_PlayerController", BP_PATH, unreal.Blueprint, bp_factory)
    bp_gc = unreal.load_object(None, bp.get_path_name() + "_C")

cdo = unreal.get_default_object(bp_gc)
cdo.set_editor_property("DefaultMappingContext", imc)
cdo.set_editor_property("MovementMappingContext", movement_context)
cdo.set_editor_property("CameraMappingContext", camera_context)
cdo.set_editor_property("TimeCircuitsToggleAction", None)
cdo.set_editor_property("TimeJumpAction", None)
cdo.set_editor_property("HoverModeAction", None)

unreal.EditorAssetLibrary.save_directory("/Game/Input")
unreal.EditorAssetLibrary.save_directory("/Game/Blueprints")
unreal.log("Controller input assets and BP_BTTF_PlayerController created")
