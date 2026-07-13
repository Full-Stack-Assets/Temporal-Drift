"""Create reusable PBR master materials and Hill Valley material instances."""
import unreal

MATERIAL_PATH = "/Game/Materials/HillValley"
PBR_PATH = "/Game/Materials/PBR"
TOOLS = unreal.AssetToolsHelpers.get_asset_tools()
BASIC_MATERIAL = "/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"


def log(message):
    unreal.log(f"PBR_MATERIALS: {message}")


def load_checked(path):
    asset = unreal.EditorAssetLibrary.load_asset(path)
    if asset is None:
        raise RuntimeError(f"Missing asset: {path}")
    return asset


def ensure_directory(path):
    if not unreal.EditorAssetLibrary.does_directory_exist(path):
        unreal.EditorAssetLibrary.make_directory(path)


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


def create_instance(name, parent, scalar_params=None, vector_params=None):
    asset_path = f"{MATERIAL_PATH}/{name}"
    if unreal.EditorAssetLibrary.does_asset_exist(asset_path):
        return load_checked(asset_path)

    factory = unreal.MaterialInstanceConstantFactoryNew()
    instance = TOOLS.create_asset(name, MATERIAL_PATH, unreal.MaterialInstanceConstant, factory)
    instance.set_editor_property("parent", parent)

    for key, value in (scalar_params or {}).items():
        unreal.MaterialEditingLibrary.set_material_instance_scalar_parameter_value(instance, key, value)
    for key, value in (vector_params or {}).items():
        unreal.MaterialEditingLibrary.set_material_instance_vector_parameter_value(
            instance, key, unreal.LinearColor(*value, 1.0))

    unreal.EditorAssetLibrary.save_loaded_asset(instance, False)
    return instance


ensure_directory(PBR_PATH)
ensure_directory(MATERIAL_PATH)

masters = {
    "MM_Asphalt": create_pbr_master("MM_Asphalt", (0.035, 0.04, 0.045), 0.92, 0.0, 0.2),
    "MM_Concrete": create_pbr_master("MM_Concrete", (0.42, 0.43, 0.40), 0.82, 0.0, 0.45),
    "MM_Brick": create_pbr_master("MM_Brick", (0.34, 0.08, 0.045), 0.84, 0.0, 0.55),
    "MM_Plaster": create_pbr_master("MM_Plaster", (0.55, 0.43, 0.28), 0.86, 0.0, 0.3),
    "MM_Metal": create_pbr_master("MM_Metal", (0.12, 0.13, 0.14), 0.35, 0.85, 0.15),
    "MM_Glass": create_pbr_master("MM_Glass", (0.025, 0.11, 0.16), 0.12, 0.0, 0.05),
    "MM_Grass": create_pbr_master("MM_Grass", (0.08, 0.24, 0.07), 0.95, 0.0, 0.65),
    "MM_Soil": create_pbr_master("MM_Soil", (0.22, 0.16, 0.10), 0.9, 0.0, 0.4),
    "MM_Water": create_pbr_master("MM_Water", (0.04, 0.18, 0.32), 0.08, 0.0, 0.02),
}

instances = {
    "M_HV_Asphalt": ("MM_Asphalt", {}, {}),
    "M_HV_Concrete": ("MM_Concrete", {"UVScale": 3.0}, {}),
    "M_HV_Brick_Red": ("MM_Brick", {"DirtAmount": 0.15}, {"Tint": (0.52, 0.05, 0.03)}),
    "M_HV_Plaster": ("MM_Plaster", {"Roughness": 0.88}, {"Tint": (0.55, 0.43, 0.28)}),
    "M_HV_DarkMetal": ("MM_Metal", {"Roughness": 0.42}, {}),
    "M_HV_Window": ("MM_Glass", {"Roughness": 0.06}, {}),
    "M_HV_Grass": ("MM_Grass", {"UVScale": 6.0}, {}),
    "M_HV_Wood": ("MM_Soil", {"Roughness": 0.92}, {"Tint": (0.16, 0.07, 0.025)}),
    "M_HV_Water": ("MM_Water", {}, {}),
}

invalid = []
for instance_name, (master_name, scalars, vectors) in instances.items():
    parent = masters.get(master_name)
    if parent is None:
        invalid.append(instance_name)
        continue
    create_instance(instance_name, parent, scalars, vectors)

if invalid:
    raise RuntimeError(f"Failed to create instances: {invalid}")

unreal.EditorAssetLibrary.save_directory(PBR_PATH)
unreal.EditorAssetLibrary.save_directory(MATERIAL_PATH)
unreal.log("PBR_MATERIALS_SUCCESS")
