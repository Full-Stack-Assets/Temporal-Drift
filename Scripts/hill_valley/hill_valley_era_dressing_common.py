"""Shared helpers for Hill Valley era-specific data layer dressing scripts."""
import unreal

LEVEL = "/Game/Levels/LVL_TimeTravelTest"
OFFSET_Y = 7600.0


def load_map():
    if not unreal.EditorLoadingAndSavingUtils.load_map(LEVEL):
        raise RuntimeError(f"Could not load Hill Valley map: {LEVEL}")


def get_subsystems():
    return (
        unreal.get_editor_subsystem(unreal.EditorActorSubsystem),
        unreal.get_editor_subsystem(unreal.LevelEditorSubsystem),
        unreal.get_editor_subsystem(unreal.DataLayerEditorSubsystem),
    )


def asset(path):
    result = unreal.EditorAssetLibrary.load_asset(path)
    if not result:
        raise RuntimeError(f"Missing required asset {path}")
    return result


def material(mat_path, name, color, roughness=0.78):
    full_path = f"{mat_path}/{name}"
    existing = unreal.EditorAssetLibrary.load_asset(full_path)
    if existing:
        return existing
    unreal.EditorAssetLibrary.make_directory(mat_path)
    result = unreal.AssetToolsHelpers.get_asset_tools().create_asset(
        name, mat_path, unreal.Material, unreal.MaterialFactoryNew()
    )
    color_node = unreal.MaterialEditingLibrary.create_material_expression(
        result, unreal.MaterialExpressionConstant3Vector, -300, 0
    )
    color_node.constant = unreal.LinearColor(*color, 1)
    unreal.MaterialEditingLibrary.connect_material_property(
        color_node, "", unreal.MaterialProperty.MP_BASE_COLOR
    )
    rough = unreal.MaterialEditingLibrary.create_material_expression(
        result, unreal.MaterialExpressionConstant, -300, 150
    )
    rough.r = roughness
    unreal.MaterialEditingLibrary.connect_material_property(
        rough, "", unreal.MaterialProperty.MP_ROUGHNESS
    )
    unreal.MaterialEditingLibrary.recompile_material(result)
    unreal.EditorAssetLibrary.save_loaded_asset(result, False)
    return result


def cleanup_generated(actors, generated_tag):
    for actor in list(actors.get_all_level_actors()):
        if generated_tag in actor.tags:
            actors.destroy_actor(actor)


def get_layer_instance(layers, layer_asset_path):
    layer_asset = asset(layer_asset_path)
    layer = layers.get_data_layer_instance(layer_asset)
    if not layer:
        raise RuntimeError(f"Data layer instance missing in level: {layer_asset_path}")
    return layer


def assign_layer(layers, actor, layer):
    if not layers.add_actor_to_data_layer(actor, layer):
        raise RuntimeError(f"Could not add {actor.get_actor_label()} to data layer")


def world_vector(local_xyz):
    return unreal.Vector(local_xyz[0], local_xyz[1] + OFFSET_Y, local_xyz[2])


def spawn_mesh(actors, layers, name, mesh, loc, scale, mat, tags, layer, generated_tag, era_tag,
               rot=(0, 0, 0), collision=False):
    actor = actors.spawn_actor_from_class(
        unreal.StaticMeshActor, world_vector(loc), unreal.Rotator(rot[0], rot[1], rot[2])
    )
    actor.set_actor_label(name)
    actor.tags = [generated_tag, era_tag] + [unreal.Name(t) for t in tags]
    actor.is_spatially_loaded = False
    actor.set_actor_scale3d(unreal.Vector(*scale))
    comp = actor.get_component_by_class(unreal.StaticMeshComponent)
    comp.set_editor_property("static_mesh", asset(mesh))
    comp.set_material(0, mat)
    comp.set_collision_enabled(
        unreal.CollisionEnabled.QUERY_AND_PHYSICS if collision else unreal.CollisionEnabled.NO_COLLISION
    )
    assign_layer(layers, actor, layer)
    return actor


def block(actors, layers, name, loc, size, mat, tags, layer, generated_tag, era_tag, collision=False):
    return spawn_mesh(
        actors, layers, name, "/Engine/BasicShapes/Cube.Cube", loc,
        (size[0] / 100, size[1] / 100, size[2] / 100), mat, tags, layer, generated_tag, era_tag,
        collision=collision,
    )


def sign(actors, layers, name, text, loc, layer, generated_tag, era_tag, scale=2.2, extra_tags=()):
    actor = actors.spawn_actor_from_class(
        unreal.TextRenderActor, world_vector(loc), unreal.Rotator(0, 0, 90)
    )
    actor.set_actor_label(name)
    actor.tags = [generated_tag, era_tag, unreal.Name("HV_EraSign")] + [unreal.Name(t) for t in extra_tags]
    actor.is_spatially_loaded = False
    comp = actor.get_component_by_class(unreal.TextRenderComponent)
    comp.set_editor_property("text", unreal.Text(text))
    comp.set_editor_property("world_size", 32)
    comp.set_editor_property("text_render_color", unreal.Color(245, 210, 100, 255))
    comp.set_editor_property("horizontal_alignment", unreal.HorizTextAligment.EHTA_CENTER)
    actor.set_actor_scale3d(unreal.Vector(scale, scale, scale))
    assign_layer(layers, actor, layer)
    return actor


def finish_era_build(levels, layer, layers, layer_asset_path, success_token, save_dirs=()):
    layers.set_data_layer_visibility(layer, False)
    layers.set_data_layer_is_loaded_in_editor(layer, True, True)
    if not levels.save_current_level():
        raise RuntimeError(f"Could not save era dressing for {layer_asset_path}")
    for directory in save_dirs:
        unreal.EditorAssetLibrary.save_directory(directory, True, True)
    unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
    unreal.log(success_token)
