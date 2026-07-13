"""Create the complete DeLorean Enhanced Input asset set and wire its Blueprint CDO."""
import unreal

INPUT_PATH = "/Game/Input"
BP_CLASS_PATH = "/Game/Blueprints/BP_DeLorean.BP_DeLorean_C"

asset_tools = unreal.AssetToolsHelpers.get_asset_tools()


def load_or_create_action(name, value_type):
    path = f"{INPUT_PATH}/{name}.{name}"
    action = unreal.load_object(None, path)
    if action is None:
        action = asset_tools.create_asset(
            name, INPUT_PATH, unreal.InputAction, unreal.DataAssetFactory())
    action.set_editor_property("value_type", value_type)
    return action


def make_mapping(action, key_name, negate=False):
    mapping = unreal.EnhancedActionKeyMapping()
    mapping.action = action
    key = unreal.Key()
    key.set_editor_property("key_name", key_name)
    mapping.key = key
    if negate:
        mapping.modifiers = [unreal.InputModifierNegate()]
    return mapping


actions = {
    "IA_Throttle": load_or_create_action("IA_Throttle", unreal.InputActionValueType.AXIS1D),
    "IA_Steering": load_or_create_action("IA_Steering", unreal.InputActionValueType.AXIS1D),
    "IA_Brake": load_or_create_action("IA_Brake", unreal.InputActionValueType.AXIS1D),
    "IA_Handbrake": load_or_create_action("IA_Handbrake", unreal.InputActionValueType.BOOLEAN),
    "IA_Reverse": load_or_create_action("IA_Reverse", unreal.InputActionValueType.BOOLEAN),
    "IA_HoverMode": load_or_create_action("IA_HoverMode", unreal.InputActionValueType.BOOLEAN),
    "IA_ResetVehicle": load_or_create_action("IA_ResetVehicle", unreal.InputActionValueType.BOOLEAN),
    "IA_TimeCircuits": load_or_create_action("IA_TimeCircuits", unreal.InputActionValueType.BOOLEAN),
    "IA_TimeJump": load_or_create_action("IA_TimeJump", unreal.InputActionValueType.BOOLEAN),
    "IA_CycleDestination": load_or_create_action("IA_CycleDestination", unreal.InputActionValueType.AXIS1D),
    "IA_ToggleCamera": load_or_create_action("IA_ToggleCamera", unreal.InputActionValueType.BOOLEAN),
}

context_path = f"{INPUT_PATH}/IMC_DeLorean.IMC_DeLorean"
context = unreal.load_object(None, context_path)
if context is None:
    context = asset_tools.create_asset(
        "IMC_DeLorean", INPUT_PATH, unreal.InputMappingContext, unreal.DataAssetFactory())

context.set_editor_property("mappings", [
    make_mapping(actions["IA_Throttle"], "Up"),
    make_mapping(actions["IA_Throttle"], "Gamepad_RightTriggerAxis"),
    make_mapping(actions["IA_Steering"], "Right"),
    make_mapping(actions["IA_Steering"], "Left", negate=True),
    make_mapping(actions["IA_Steering"], "Gamepad_LeftX"),
    make_mapping(actions["IA_Brake"], "Gamepad_LeftTriggerAxis"),
    make_mapping(actions["IA_Handbrake"], "SpaceBar"),
    make_mapping(actions["IA_Handbrake"], "Gamepad_FaceButton_Left"),
    make_mapping(actions["IA_Reverse"], "Down"),
    make_mapping(actions["IA_Reverse"], "Gamepad_FaceButton_Right"),
    make_mapping(actions["IA_HoverMode"], "H"),
    make_mapping(actions["IA_HoverMode"], "Gamepad_DPad_Up"),
    make_mapping(actions["IA_ResetVehicle"], "R"),
    make_mapping(actions["IA_TimeCircuits"], "T"),
    make_mapping(actions["IA_TimeJump"], "F"),
    make_mapping(actions["IA_CycleDestination"], "E"),
    make_mapping(actions["IA_CycleDestination"], "Q", negate=True),
    make_mapping(actions["IA_ToggleCamera"], "C"),
])

vehicle_class = unreal.load_class(None, BP_CLASS_PATH)
if vehicle_class is None:
    raise RuntimeError(f"Could not load {BP_CLASS_PATH}")
cdo = unreal.get_default_object(vehicle_class)
cdo.set_editor_property("VehicleMappingContext", context)
cdo.set_editor_property("ThrottleAction", actions["IA_Throttle"])
cdo.set_editor_property("SteeringAction", actions["IA_Steering"])
cdo.set_editor_property("BrakeAction", actions["IA_Brake"])
cdo.set_editor_property("HandbrakeAction", actions["IA_Handbrake"])
cdo.set_editor_property("ReverseAction", actions["IA_Reverse"])
cdo.set_editor_property("HoverModeAction", actions["IA_HoverMode"])
cdo.set_editor_property("ResetVehicleAction", actions["IA_ResetVehicle"])
cdo.set_editor_property("TimeCircuitsAction", actions["IA_TimeCircuits"])
cdo.set_editor_property("TimeJumpAction", actions["IA_TimeJump"])
cdo.set_editor_property("CycleDestinationAction", actions["IA_CycleDestination"])
cdo.set_editor_property("ToggleCameraAction", actions["IA_ToggleCamera"])

unreal.EditorAssetLibrary.save_directory(INPUT_PATH)
unreal.EditorAssetLibrary.save_asset("/Game/Blueprints/BP_DeLorean")
unreal.log("BTTF_COMPLETE_VEHICLE_INPUT_SUCCESS")
