"""Create the on-foot Hero Enhanced Input contract."""
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


def mapping(input_action, key_name):
    result = unreal.EnhancedActionKeyMapping()
    result.action = input_action
    key = unreal.Key()
    key.set_editor_property("key_name", key_name)
    result.key = key
    return result


context = unreal.load_asset(f"{PATH}/IMC_Hero")
if not context:
    context = TOOLS.create_asset("IMC_Hero", PATH, unreal.InputMappingContext, unreal.DataAssetFactory())

move = action("IA_HeroMove", unreal.InputActionValueType.AXIS2D)
look = action("IA_HeroLook", unreal.InputActionValueType.AXIS2D)
sprint = action("IA_HeroSprint", unreal.InputActionValueType.BOOLEAN)
crouch = action("IA_HeroCrouch", unreal.InputActionValueType.BOOLEAN)
interact = action("IA_HeroInteract", unreal.InputActionValueType.BOOLEAN)

context.set_editor_property("mappings", [
    mapping(move, "W"), mapping(move, "S"), mapping(move, "A"), mapping(move, "D"),
    mapping(look, "Mouse2D"), mapping(sprint, "LeftShift"),
    mapping(crouch, "LeftControl"), mapping(interact, "E"),
])
unreal.EditorAssetLibrary.save_directory(PATH)
unreal.log("BTTF_HERO_INPUT_SUCCESS")
