"""Shared procedural spawn utilities for Hill Valley world builders."""
import os
import sys
import unreal

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from hill_valley_coords import TOWN_OFFSET_Y, world_location

LEVEL = "/Game/Levels/LVL_TimeTravelTest"
GENERATED_TAG = unreal.Name("HV_Generated")
CUBE = "/Engine/BasicShapes/Cube.Cube"
CYLINDER = "/Engine/BasicShapes/Cylinder.Cylinder"
SPHERE = "/Engine/BasicShapes/Sphere.Sphere"
BASIC_MATERIAL = "/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"
MATERIAL_PATH = "/Game/Materials/HillValley"

actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
level_subsystem = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)


def log(message):
    unreal.log(f"HILL_VALLEY: {message}")


def make_rotator(pitch=0.0, yaw=0.0, roll=0.0):
    return unreal.Rotator(pitch=float(pitch), yaw=float(yaw), roll=float(roll))


def load_asset_checked(asset_path):
    asset = unreal.EditorAssetLibrary.load_asset(asset_path)
    if asset is None:
        raise RuntimeError(f"Unable to load required asset: {asset_path}")
    return asset


def delete_previous_generated(extra_tags=()):
    deleted = 0
    tags_to_clear = {GENERATED_TAG}
    for tag in extra_tags:
        tags_to_clear.add(unreal.Name(tag))
    for actor in actor_subsystem.get_all_level_actors():
        actor_tags = actor.get_editor_property("tags")
        if any(tag in actor_tags for tag in tags_to_clear):
            if actor_subsystem.destroy_actor(actor):
                deleted += 1
    log(f"removed {deleted} previously generated loaded actors")


def spawn_static_mesh(
    name,
    mesh_path,
    location,
    scale,
    rotation=(0.0, 0.0, 0.0),
    material=None,
    tags=(),
):
    pitch, yaw, roll = rotation
    actor = actor_subsystem.spawn_actor_from_class(
        unreal.StaticMeshActor,
        unreal.Vector(*world_location(location[0], location[1], location[2])),
        make_rotator(pitch=pitch, yaw=yaw, roll=roll),
    )
    if actor is None:
        raise RuntimeError(f"Unable to spawn actor: {name}")

    actor.set_actor_label(name)
    actor.set_editor_property(
        "tags",
        [GENERATED_TAG] + [unreal.Name(tag) for tag in tags],
    )
    actor.set_editor_property("is_spatially_loaded", False)
    actor.set_actor_scale3d(unreal.Vector(*scale))

    component = actor.get_component_by_class(unreal.StaticMeshComponent)
    component.set_editor_property("static_mesh", load_asset_checked(mesh_path))
    component.set_editor_property("mobility", unreal.ComponentMobility.STATIC)
    component.set_collision_enabled(unreal.CollisionEnabled.QUERY_AND_PHYSICS)
    if material is not None:
        component.set_material(0, material)
    return actor


def create_color_material(name, color, roughness=0.75):
    asset_path = f"{MATERIAL_PATH}/{name}"
    if unreal.EditorAssetLibrary.does_asset_exist(asset_path):
        return load_asset_checked(asset_path)

    unreal.EditorAssetLibrary.make_directory(MATERIAL_PATH)
    material = unreal.AssetToolsHelpers.get_asset_tools().create_asset(
        name,
        MATERIAL_PATH,
        unreal.Material,
        unreal.MaterialFactoryNew(),
    )
    if material is None:
        log(f"material creation failed for {name}; using BasicShapeMaterial")
        return load_asset_checked(BASIC_MATERIAL)

    color_node = unreal.MaterialEditingLibrary.create_material_expression(
        material, unreal.MaterialExpressionConstant3Vector, -350, -50
    )
    color_node.set_editor_property("constant", unreal.LinearColor(*color, 1.0))
    unreal.MaterialEditingLibrary.connect_material_property(
        color_node, "", unreal.MaterialProperty.MP_BASE_COLOR
    )
    roughness_node = unreal.MaterialEditingLibrary.create_material_expression(
        material, unreal.MaterialExpressionConstant, -350, 150
    )
    roughness_node.set_editor_property("r", float(roughness))
    unreal.MaterialEditingLibrary.connect_material_property(
        roughness_node, "", unreal.MaterialProperty.MP_ROUGHNESS
    )
    unreal.MaterialEditingLibrary.recompile_material(material)
    unreal.EditorAssetLibrary.save_loaded_asset(material, False)
    return material


def spawn_block(name, location, size, material, tags=(), rotation=(0.0, 0.0, 0.0)):
    return spawn_static_mesh(
        name,
        CUBE,
        location,
        (size[0] / 100.0, size[1] / 100.0, size[2] / 100.0),
        rotation=rotation,
        material=material,
        tags=tags,
    )


def spawn_text_sign(name, text, location, rotation=(0.0, 0.0, 0.0), color=(1.0, 0.82, 0.22, 1.0), scale=5.0, tags=()):
    actor = actor_subsystem.spawn_actor_from_class(
        unreal.TextRenderActor,
        unreal.Vector(*world_location(location[0], location[1], location[2])),
        make_rotator(*rotation),
    )
    if actor is None:
        raise RuntimeError(f"Unable to spawn sign: {name}")
    actor.set_actor_label(name)
    actor.set_editor_property(
        "tags",
        [GENERATED_TAG, unreal.Name("HV_Signage")] + [unreal.Name(tag) for tag in tags],
    )
    actor.set_editor_property("is_spatially_loaded", False)
    component = actor.get_component_by_class(unreal.TextRenderComponent)
    component.set_editor_property("text", unreal.Text(text))
    component.set_editor_property(
        "text_render_color",
        unreal.Color(int(color[0] * 255), int(color[1] * 255), int(color[2] * 255), int(color[3] * 255)),
    )
    component.set_editor_property("horizontal_alignment", unreal.HorizTextAligment.EHTA_CENTER)
    component.set_editor_property("world_size", 34.0)
    actor.set_actor_scale3d(unreal.Vector(scale, scale, scale))
    return actor


def spawn_marker(name, location, tags):
    actor = actor_subsystem.spawn_actor_from_class(
        unreal.TargetPoint,
        unreal.Vector(*world_location(location[0], location[1], location[2])),
    )
    actor.set_actor_label(name)
    actor.set_editor_property("tags", [GENERATED_TAG] + [unreal.Name(tag) for tag in tags])
    actor.set_editor_property("is_spatially_loaded", False)
    return actor


def spawn_tree(name, location, materials, scale=1.0):
    x, y, z = location
    spawn_static_mesh(
        name + "_Trunk", CYLINDER, (x, y, z + 220 * scale),
        (0.6 * scale, 0.6 * scale, 4.5 * scale),
        material=materials["trunk"],
        tags=("HV_Landscape", "HV_Foliage", "HV_Prop"),
    )
    spawn_static_mesh(
        name + "_Crown", SPHERE, (x, y, z + 520 * scale),
        (2.8 * scale, 2.8 * scale, 3.2 * scale),
        material=materials["leaves"],
        tags=("HV_Landscape", "HV_Foliage", "HV_Prop"),
    )


def build_destination_facade(name, x, y, size, materials, district):
    width, depth, height = size
    front_y = y - depth / 2.0 - 18.0
    for index in range(max(2, int(width // 900))):
        window_x = x - width * 0.5 + 480.0 + index * 900.0
        spawn_block(
            f"{name}_Window_{index:02d}", (window_x, front_y, height * 0.60),
            (560, 36, 420), materials["glass"], tags=("HV_Architecture", district),
        )
        spawn_block(
            f"{name}_WindowTrim_{index:02d}", (window_x, front_y - 24.0, height * 0.60),
            (620, 26, 480), materials["trim"], tags=("HV_Architecture", district),
        )
    spawn_block(
        f"{name}_Door", (x, front_y - 4.0, 300), (520, 60, 720),
        materials["dark"], tags=("HV_Interior", "HV_MissionAccess", district),
    )
    spawn_block(
        f"{name}_Awning", (x, front_y - 70.0, height * 0.43),
        (min(width * 0.82, 3400), 160, 70), materials["trim"],
        tags=("HV_Architecture", "HV_Streetscape", district),
    )


def spawn_named_citizen_node(citizen_id, display_name, location):
    spawn_marker(
        f"HV_NamedCitizen_{citizen_id}",
        location,
        ("HV_Navigation", "HV_PedestrianNode", "HV_NamedCitizen", f"HV_Citizen_{citizen_id}"),
    )
    spawn_text_sign(
        f"HV_NamedCitizenSign_{citizen_id}",
        display_name,
        (location[0], location[1], location[2] + 220),
        rotation=(0, 0, 90),
        scale=1.4,
        tags=("HV_NamedCitizen", f"HV_Citizen_{citizen_id}"),
    )


def create_default_materials():
    try:
        import photoreal_material_library as photoreal
        return photoreal.load_material_map()
    except Exception as exc:
        log(f"photoreal library unavailable ({exc}); falling back to flat-color materials")

    return {
        "asphalt": create_color_material("M_HV_Asphalt", (0.035, 0.04, 0.045), 0.92),
        "concrete": create_color_material("M_HV_Concrete", (0.42, 0.43, 0.40), 0.82),
        "grass": create_color_material("M_HV_Grass", (0.08, 0.24, 0.07), 0.95),
        "stone": create_color_material("M_HV_Stone_Light", (0.62, 0.59, 0.48), 0.78),
        "brick": create_color_material("M_HV_Brick_Red", (0.34, 0.08, 0.045), 0.84),
        "brick_red": create_color_material("M_HV_Brick_RedBright", (0.52, 0.05, 0.03), 0.81),
        "brick_dark": create_color_material("M_HV_Brick_Dark", (0.16, 0.045, 0.03), 0.88),
        "plaster": create_color_material("M_HV_Plaster", (0.55, 0.43, 0.28), 0.86),
        "roof": create_color_material("M_HV_Roof", (0.07, 0.08, 0.09), 0.9),
        "dark": create_color_material("M_HV_DarkMetal", (0.025, 0.03, 0.035), 0.55),
        "trim": create_color_material("M_HV_Trim", (0.72, 0.68, 0.52), 0.72),
        "glass": create_color_material("M_HV_Window", (0.025, 0.11, 0.16), 0.28),
        "trunk": create_color_material("M_HV_Wood", (0.16, 0.07, 0.025), 0.9),
        "leaves": create_color_material("M_HV_Leaves", (0.035, 0.18, 0.045), 0.96),
        "water": create_color_material("M_HV_Water", (0.04, 0.18, 0.32), 0.15),
        "sand": create_color_material("M_HV_Sand", (0.62, 0.54, 0.38), 0.9),
        "yellow_line": create_color_material("M_HV_YellowLine", (0.82, 0.72, 0.08), 0.7),
    }
