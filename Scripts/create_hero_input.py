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


context = unreal.load_asset(f"{PATH}/IMC_Hero")
if not context:
    context = TOOLS.create_asset("IMC_Hero", PATH, unreal.InputMappingContext, unreal.DataAssetFactory())

move = action("IA_HeroMove", unreal.InputActionValueType.AXIS2D)
camera_orbit = action("IA_HeroCameraOrbit", unreal.InputActionValueType.AXIS2D)
sprint = action("IA_HeroSprint", unreal.InputActionValueType.BOOLEAN)
crouch = action("IA_HeroCrouch", unreal.InputActionValueType.BOOLEAN)
interact = action("IA_HeroInteract", unreal.InputActionValueType.BOOLEAN)
cycle_camera = action("IA_HeroCycleCamera", unreal.InputActionValueType.BOOLEAN)
toggle_chase = action("IA_HeroToggleAutoChase", unreal.InputActionValueType.BOOLEAN)

context.set_editor_property("mappings", [
    mapping(move, "Up"),
    mapping(move, "Down", negate=True),
    mapping(move, "Right"),
    mapping(move, "Left", negate=True),
    mapping(camera_orbit, "D"),
    mapping(camera_orbit, "A", negate=True),
    mapping(camera_orbit, "W"),
    mapping(camera_orbit, "S", negate=True),
    mapping(sprint, "LeftShift"),
    mapping(crouch, "LeftControl"),
    mapping(interact, "E"),
    mapping(cycle_camera, "C"),
    mapping(toggle_chase, "V"),
])

hero_class = unreal.load_class(None, "/Script/BTTF_TemporalDrift.BTTFHeroCharacter")
if hero_class:
    cdo = unreal.get_default_object(hero_class)
    cdo.set_editor_property("HeroMappingContext", context)

unreal.EditorAssetLibrary.save_directory(PATH)
unreal.log("BTTF_HERO_INPUT_SUCCESS")
