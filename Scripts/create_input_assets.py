"""Creates Enhanced Input assets and the DeLorean Blueprint, then wires them together."""
import unreal

ASSET_PATH = "/Game/Input"
BP_PATH = "/Game/Blueprints"

asset_tools = unreal.AssetToolsHelpers.get_asset_tools()


def create_input_action(name, value_type):
    factory = unreal.DataAssetFactory()
    ia = asset_tools.create_asset(name, ASSET_PATH, unreal.InputAction, factory)
    ia.set_editor_property("value_type", value_type)
    return ia


# 1. Input Actions
ia_throttle = create_input_action("IA_Throttle", unreal.InputActionValueType.AXIS1D)
ia_steering = create_input_action("IA_Steering", unreal.InputActionValueType.AXIS1D)
ia_brake = create_input_action("IA_Brake", unreal.InputActionValueType.AXIS1D)
ia_timetravel = create_input_action("IA_TimeTravel", unreal.InputActionValueType.BOOLEAN)

# 2. Input Mapping Context with default bindings
imc = asset_tools.create_asset("IMC_Vehicle", ASSET_PATH, unreal.InputMappingContext, unreal.DataAssetFactory())

mappings = []

def make_mapping(action, key_name, negate=False):
    m = unreal.EnhancedActionKeyMapping()
    m.action = action
    key = unreal.Key()
    key.set_editor_property("key_name", key_name)
    m.key = key
    if negate:
        m.modifiers = [unreal.InputModifierNegate()]
    return m

mappings.append(make_mapping(ia_throttle, "W"))
mappings.append(make_mapping(ia_throttle, "S", negate=True))
mappings.append(make_mapping(ia_steering, "D"))
mappings.append(make_mapping(ia_steering, "A", negate=True))
mappings.append(make_mapping(ia_brake, "SpaceBar"))
mappings.append(make_mapping(ia_timetravel, "T"))

imc.set_editor_property("mappings", mappings)

# 3. DeLorean Blueprint based on ADeLoreanVehicle
bp_factory = unreal.BlueprintFactory()
bp_factory.set_editor_property("parent_class", unreal.load_class(None, "/Script/BTTF_TemporalDrift.DeLoreanVehicle"))
bp = asset_tools.create_asset("BP_DeLorean", BP_PATH, unreal.Blueprint, bp_factory)

# 4. Assign input assets on the Blueprint CDO
bp_gc = unreal.load_object(None, bp.get_path_name() + "_C")
cdo = unreal.get_default_object(bp_gc)
cdo.set_editor_property("VehicleMappingContext", imc)
cdo.set_editor_property("ThrottleAction", ia_throttle)
cdo.set_editor_property("SteeringAction", ia_steering)
cdo.set_editor_property("BrakeAction", ia_brake)
cdo.set_editor_property("TimeTravelAction", ia_timetravel)

# 5. Save everything
unreal.EditorAssetLibrary.save_directory("/Game/Input")
unreal.EditorAssetLibrary.save_directory("/Game/Blueprints")
unreal.log("Input assets and BP_DeLorean created successfully")
