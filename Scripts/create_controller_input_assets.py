"""Creates controller input assets (time circuits, time jump, hover) and BP_BTTF_PlayerController."""
import unreal

ASSET_PATH = "/Game/Input"
BP_PATH = "/Game/Blueprints"

asset_tools = unreal.AssetToolsHelpers.get_asset_tools()


def create_input_action(name, value_type):
    factory = unreal.DataAssetFactory()
    ia = asset_tools.create_asset(name, ASSET_PATH, unreal.InputAction, factory)
    ia.set_editor_property("value_type", value_type)
    return ia


# 1. Input Actions (all boolean)
ia_circuits = create_input_action("IA_TimeCircuits", unreal.InputActionValueType.BOOLEAN)
ia_jump = create_input_action("IA_TimeJump", unreal.InputActionValueType.BOOLEAN)
ia_hover = create_input_action("IA_HoverMode", unreal.InputActionValueType.BOOLEAN)

# 2. Mapping context: C = circuits, Enter = jump, H = hover
imc = asset_tools.create_asset("IMC_PlayerController", ASSET_PATH, unreal.InputMappingContext, unreal.DataAssetFactory())


def make_mapping(action, key_name):
    m = unreal.EnhancedActionKeyMapping()
    m.action = action
    key = unreal.Key()
    key.set_editor_property("key_name", key_name)
    m.key = key
    return m


mappings = [
    make_mapping(ia_circuits, "C"),
    make_mapping(ia_jump, "Enter"),
    make_mapping(ia_hover, "H"),
]
imc.set_editor_property("mappings", mappings)

# 3. BP_BTTF_PlayerController based on ABTTF_PlayerController
bp_factory = unreal.BlueprintFactory()
bp_factory.set_editor_property("parent_class", unreal.load_class(None, "/Script/BTTF_TemporalDrift.BTTF_PlayerController"))
bp = asset_tools.create_asset("BP_BTTF_PlayerController", BP_PATH, unreal.Blueprint, bp_factory)

bp_gc = unreal.load_object(None, bp.get_path_name() + "_C")
cdo = unreal.get_default_object(bp_gc)
cdo.set_editor_property("DefaultMappingContext", imc)
cdo.set_editor_property("TimeCircuitsToggleAction", ia_circuits)
cdo.set_editor_property("TimeJumpAction", ia_jump)
cdo.set_editor_property("HoverModeAction", ia_hover)

# 4. Save
unreal.EditorAssetLibrary.save_directory("/Game/Input")
unreal.EditorAssetLibrary.save_directory("/Game/Blueprints")
unreal.log("Controller input assets and BP_BTTF_PlayerController created")
