"""Create the on-foot Hero Enhanced Input contract (keyboard-only movement and camera)."""
import unreal

PATH = "/Game/Input"
TOOLS = unreal.AssetToolsHelpers.get_asset_tools()


def action(name, value_type):
    existing = unreal.load_asset(f"{PATH}/{name}")
    if existing:
        return existing
    asset = TOOLS.create_asset(name, PATH, unreal.InputAction, unreal.DataAssetFactory())
    asset.set_editor_property("value_type", value_type)
    return asset


def mapping(input_action, key_name, negate=False):
    result = unreal.EnhancedActionKeyMapping()
    result.action = input_action
    key = unreal.Key()
    key.set_editor_property("key_name", key_name)
    result.key = key
    if negate:
        result.modifiers = [unreal.InputModifierNegate()]
    return result


def ensure_context(name):
    context = unreal.load_asset(f"{PATH}/{name}")
    if not context:
        context = TOOLS.create_asset(name, PATH, unreal.InputMappingContext, unreal.DataAssetFactory())
    return context


move = action("IA_HeroMove", unreal.InputActionValueType.AXIS2D)
camera_orbit = action("IA_HeroCameraOrbit", unreal.InputActionValueType.AXIS2D)
sprint = action("IA_HeroSprint", unreal.InputActionValueType.BOOLEAN)
crouch = action("IA_HeroCrouch", unreal.InputActionValueType.BOOLEAN)
interact = action("IA_HeroInteract", unreal.InputActionValueType.BOOLEAN)
cycle_camera = action("IA_HeroCycleCamera", unreal.InputActionValueType.BOOLEAN)
toggle_chase = action("IA_HeroToggleAutoChase", unreal.InputActionValueType.BOOLEAN)

movement_context = ensure_context("IMC_Movement")
movement_context.set_editor_property("mappings", [
    mapping(move, "Up"),
    mapping(move, "Down", negate=True),
    mapping(move, "Right"),
    mapping(move, "Left", negate=True),
])

camera_context = ensure_context("IMC_CameraOrbit")
camera_context.set_editor_property("mappings", [
    mapping(camera_orbit, "D"),
    mapping(camera_orbit, "A", negate=True),
    mapping(camera_orbit, "W"),
    mapping(camera_orbit, "S", negate=True),
])

hero_context = ensure_context("IMC_Hero")
hero_context.set_editor_property("mappings", [
    mapping(sprint, "LeftShift"),
    mapping(crouch, "LeftControl"),
    mapping(interact, "E"),
    mapping(cycle_camera, "C"),
    mapping(toggle_chase, "V"),
])

hero_class = unreal.load_class(None, "/Script/BTTF_TemporalDrift.BTTFHeroCharacter")
if hero_class:
    cdo = unreal.get_default_object(hero_class)
    cdo.set_editor_property("HeroMappingContext", hero_context)

controller_class = unreal.load_class(None, "/Script/BTTF_TemporalDrift.BTTF_PlayerController")
if controller_class:
    cdo = unreal.get_default_object(controller_class)
    cdo.set_editor_property("MovementMappingContext", movement_context)
    cdo.set_editor_property("CameraMappingContext", camera_context)

bp_path = "/Game/Blueprints/BP_BTTF_PlayerController.BP_BTTF_PlayerController_C"
bp_cdo = unreal.load_object(None, bp_path)
if bp_cdo:
    bp_cdo.set_editor_property("MovementMappingContext", movement_context)
    bp_cdo.set_editor_property("CameraMappingContext", camera_context)

unreal.EditorAssetLibrary.save_directory(PATH)
unreal.log("BTTF_HERO_INPUT_SUCCESS")
