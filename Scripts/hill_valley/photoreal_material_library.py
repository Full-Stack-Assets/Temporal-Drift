"""Canonical PBR master materials and Hill Valley material instances."""
import unreal

MATERIAL_PATH = "/Game/Materials/HillValley"
PBR_PATH = "/Game/Materials/PBR"
TOOLS = unreal.AssetToolsHelpers.get_asset_tools()
BASIC_MATERIAL = "/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"

INSTANCE_SPECS = {
    "M_HV_Asphalt": ("MM_Asphalt", (0.035, 0.04, 0.045), 0.92, 0.0, 0.2),
    "M_HV_Concrete": ("MM_Concrete", (0.42, 0.43, 0.40), 0.82, 0.0, 0.45),
    "M_HV_Grass": ("MM_Grass", (0.08, 0.24, 0.07), 0.95, 0.0, 0.65),
    "M_HV_Stone_Light": ("MM_Concrete", (0.62, 0.59, 0.48), 0.78, 0.0, 0.35),
    "M_HV_Brick_Red": ("MM_Brick", (0.34, 0.08, 0.045), 0.84, 0.0, 0.55),
    "M_HV_Brick_RedBright": ("MM_Brick", (0.52, 0.05, 0.03), 0.81, 0.0, 0.5),
    "M_HV_Brick_Dark": ("MM_Brick", (0.16, 0.045, 0.03), 0.88, 0.0, 0.45),
    "M_HV_Plaster": ("MM_Plaster", (0.55, 0.43, 0.28), 0.86, 0.0, 0.3),
    "M_HV_Roof": ("MM_Metal", (0.07, 0.08, 0.09), 0.9, 0.2, 0.15),
    "M_HV_DarkMetal": ("MM_Metal", (0.025, 0.03, 0.035), 0.55, 0.85, 0.15),
    "M_HV_Trim": ("MM_Plaster", (0.72, 0.68, 0.52), 0.72, 0.0, 0.25),
    "M_HV_Window": ("MM_Glass", (0.025, 0.11, 0.16), 0.12, 0.0, 0.05),
    "M_HV_Wood": ("MM_Soil", (0.16, 0.07, 0.025), 0.9, 0.0, 0.4),
    "M_HV_Leaves": ("MM_Grass", (0.035, 0.18, 0.045), 0.96, 0.0, 0.7),
    "M_HV_Water": ("MM_Water", (0.04, 0.18, 0.32), 0.08, 0.0, 0.02),
    "M_HV_Sand": ("MM_Soil", (0.62, 0.54, 0.38), 0.9, 0.0, 0.35),
    "M_HV_YellowLine": ("MM_Plaster", (0.82, 0.72, 0.08), 0.7, 0.0, 0.1),
}

MATERIAL_KEY_ALIASES = {
    "asphalt": "M_HV_Asphalt",
    "concrete": "M_HV_Concrete",
    "grass": "M_HV_Grass",
    "stone": "M_HV_Stone_Light",
    "brick": "M_HV_Brick_Red",
    "brick_red": "M_HV_Brick_RedBright",
    "brick_dark": "M_HV_Brick_Dark",
    "plaster": "M_HV_Plaster",
    "roof": "M_HV_Roof",
    "dark": "M_HV_DarkMetal",
    "trim": "M_HV_Trim",
    "glass": "M_HV_Window",
    "trunk": "M_HV_Wood",
    "leaves": "M_HV_Leaves",
    "water": "M_HV_Water",
    "sand": "M_HV_Sand",
    "yellow_line": "M_HV_YellowLine",
}


def log(message):
    unreal.log(f"PHOTOREAL_MATERIALS: {message}")


def ensure_directory(path):
    if not unreal.EditorAssetLibrary.does_directory_exist(path):
        unreal.EditorAssetLibrary.make_directory(path)


def load_checked(path):
    asset = unreal.EditorAssetLibrary.load_asset(path)
    if asset is None:
        raise RuntimeError(f"Missing asset: {path}")
    return asset


def create_pbr_master(name, base_color, roughness=0.75, metallic=0.0, normal_strength=0.35):
    asset_path = f"{PBR_PATH}/{name}"
    if unreal.EditorAssetLibrary.does_asset_exist(asset_path):
        return load_checked(asset_path)

    material = TOOLS.create_asset(name, PBR_PATH, unreal.Material, unreal.MaterialFactoryNew())
    if material is None:
        log(f"master creation failed for {name}")
        return load_checked(BASIC_MATERIAL)

    color_node = unreal.MaterialEditingLibrary.create_material_expression(
        material, unreal.MaterialExpressionConstant3Vector, -500, -80)
    color_node.set_editor_property("constant", unreal.LinearColor(*base_color, 1.0))
    unreal.MaterialEditingLibrary.connect_material_property(
        color_node, "", unreal.MaterialProperty.MP_BASE_COLOR)

    roughness_node = unreal.MaterialEditingLibrary.create_material_expression(
        material, unreal.MaterialExpressionConstant, -500, 120)
    roughness_node.set_editor_property("r", float(roughness))
    unreal.MaterialEditingLibrary.connect_material_property(
        roughness_node, "", unreal.MaterialProperty.MP_ROUGHNESS)

    metallic_node = unreal.MaterialEditingLibrary.create_material_expression(
        material, unreal.MaterialExpressionConstant, -500, 260)
    metallic_node.set_editor_property("r", float(metallic))
    unreal.MaterialEditingLibrary.connect_material_property(
        metallic_node, "", unreal.MaterialProperty.MP_METALLIC)

    tex_coord = unreal.MaterialEditingLibrary.create_material_expression(
        material, unreal.MaterialExpressionTextureCoordinate, -760, 380)
    tex_coord.set_editor_property("utiling", 4.0)
    tex_coord.set_editor_property("vtiling", 4.0)

    noise = unreal.MaterialEditingLibrary.create_material_expression(
        material, unreal.MaterialExpressionNoise, -520, 380)
    noise.set_editor_property("scale", 2.5)
    unreal.MaterialEditingLibrary.connect_material_expressions(tex_coord, "", noise, "Position")

    normal_mul = unreal.MaterialEditingLibrary.create_material_expression(
        material, unreal.MaterialExpressionMultiply, -280, 380)
    normal_mul.set_editor_property("constb", float(normal_strength))
    unreal.MaterialEditingLibrary.connect_material_expressions(noise, "", normal_mul, "A")

    normal_vec = unreal.MaterialEditingLibrary.create_material_expression(
        material, unreal.MaterialExpressionAppendVector, -80, 380)
    unreal.MaterialEditingLibrary.connect_material_expressions(normal_mul, "", normal_vec, "G")
    unreal.MaterialEditingLibrary.connect_material_property(
        normal_vec, "", unreal.MaterialProperty.MP_NORMAL)

    unreal.MaterialEditingLibrary.recompile_material(material)
    unreal.EditorAssetLibrary.save_loaded_asset(material, False)
    return material


def create_instance(name, parent):
    asset_path = f"{MATERIAL_PATH}/{name}"
    if unreal.EditorAssetLibrary.does_asset_exist(asset_path):
        return load_checked(asset_path)

    factory = unreal.MaterialInstanceConstantFactoryNew()
    instance = TOOLS.create_asset(name, MATERIAL_PATH, unreal.MaterialInstanceConstant, factory)
    instance.set_editor_property("parent", parent)
    unreal.EditorAssetLibrary.save_loaded_asset(instance, False)
    return instance


def build_library():
    ensure_directory(PBR_PATH)
    ensure_directory(MATERIAL_PATH)

    masters = {}
    for _, (master_name, color, roughness, metallic, normal_strength) in INSTANCE_SPECS.items():
        if master_name not in masters:
            masters[master_name] = create_pbr_master(
                master_name, color, roughness, metallic, normal_strength)

    for instance_name, (master_name, *_rest) in INSTANCE_SPECS.items():
        create_instance(instance_name, masters[master_name])

    unreal.EditorAssetLibrary.save_directory(PBR_PATH)
    unreal.EditorAssetLibrary.save_directory(MATERIAL_PATH)
    log(f"built {len(masters)} masters and {len(INSTANCE_SPECS)} instances")
    return masters


def load_instance(asset_name):
    return load_checked(f"{MATERIAL_PATH}/{asset_name}")


def load_material_map():
    """Return builder-facing material dict keyed by hill_valley_common aliases."""
    result = {}
    for key, asset_name in MATERIAL_KEY_ALIASES.items():
        path = f"{MATERIAL_PATH}/{asset_name}"
        if unreal.EditorAssetLibrary.does_asset_exist(path):
            result[key] = load_instance(asset_name)
        else:
            raise RuntimeError(f"Photoreal instance missing: {path}. Run create_photoreal_material_library.py first.")
    return result


if __name__ == "__main__":
    build_library()
    unreal.log("PHOTOREAL_MATERIAL_LIBRARY_SUCCESS")
