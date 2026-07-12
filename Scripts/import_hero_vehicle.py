import os
import unreal

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FBX = os.path.join(ROOT, 'SourceArt', 'Vehicles', 'DeLorean', 'Exports', 'HeroTimeMachine.fbx')
DEST = '/Game/Vehicles/DeLorean/Hero'
REQUIRED = ['BodyShell','GlassSet','Interior','TimeMachinery','Wheel_FL','Wheel_FR','Wheel_RL','Wheel_RR']

if not os.path.isfile(FBX):
    raise RuntimeError(f'Missing hero FBX: {FBX}')

asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
library = unreal.EditorAssetLibrary

task = unreal.AssetImportTask()
task.filename = FBX
task.destination_path = DEST
task.automated = True
task.replace_existing = True
task.save = True

options = unreal.FbxImportUI()
options.import_mesh = True
options.import_as_skeletal = False
options.import_materials = True
options.import_textures = False
options.static_mesh_import_data.combine_meshes = False
options.static_mesh_import_data.generate_lightmap_u_vs = True
options.static_mesh_import_data.auto_generate_collision = False
task.options = options
asset_tools.import_asset_tasks([task])

combined_task = unreal.AssetImportTask()
combined_task.filename = FBX
combined_task.destination_path = DEST
combined_task.destination_name = 'SM_HeroTimeMachine'
combined_task.automated = True
combined_task.replace_existing = True
combined_task.save = True
combined_options = unreal.FbxImportUI()
combined_options.import_mesh = True
combined_options.import_as_skeletal = False
combined_options.import_materials = True
combined_options.import_textures = False
combined_options.static_mesh_import_data.combine_meshes = True
combined_options.static_mesh_import_data.generate_lightmap_u_vs = True
combined_options.static_mesh_import_data.auto_generate_collision = False
combined_task.options = combined_options
asset_tools.import_asset_tasks([combined_task])

def locate(source_name):
    candidates = [
        f'{DEST}/{source_name}',
        f'{DEST}/SM_{source_name}',
        f'{DEST}/HeroTimeMachine_{source_name}',
        f'{DEST}/HeroTimeMachine/{source_name}',
    ]
    for path in candidates:
        if library.does_asset_exist(path):
            return path
    for path in library.list_assets(DEST, recursive=True, include_folder=False):
        leaf = path.rsplit('/',1)[-1].split('.')[0]
        if leaf == source_name or leaf.endswith('_'+source_name):
            return path.split('.')[0]
    return None

missing=[]
for name in REQUIRED:
    source=locate(name)
    target=f'{DEST}/SM_{name}'
    if not source:
        missing.append(name); continue
    if source != target:
        if library.does_asset_exist(target): library.delete_asset(target)
        if not library.rename_asset(source,target):
            raise RuntimeError(f'Could not rename {source} to {target}')
    library.save_asset(target, only_if_is_dirty=False)

if missing:
    raise RuntimeError('Imported FBX is missing required nodes: '+', '.join(missing))
if not library.does_asset_exist(f'{DEST}/SM_HeroTimeMachine'):
    raise RuntimeError('Combined hero presentation mesh was not created')

material_specs = {
    'M_BrushedSteel': ((0.34, 0.39, 0.42), 0.88, 0.28, None),
    'M_DarkTrim': ((0.012, 0.016, 0.02), 0.18, 0.38, None),
    'M_SmokedGlass': ((0.008, 0.035, 0.055), 0.25, 0.12, None),
    'M_Rubber': ((0.006, 0.007, 0.008), 0.0, 0.78, None),
    'M_Alloy': ((0.22, 0.26, 0.29), 0.92, 0.2, None),
    'M_Interior': ((0.018, 0.021, 0.024), 0.0, 0.58, None),
    'M_Lamps': ((0.35, 0.48, 0.62), 0.15, 0.2, (0.4, 0.7, 1.0)),
    'M_TimeEmissive': ((0.01, 0.12, 0.18), 0.25, 0.2, (0.0, 0.8, 1.0)),
}

def scalar(material, value, prop, x, y):
    node = unreal.MaterialEditingLibrary.create_material_expression(material, unreal.MaterialExpressionConstant, x, y)
    node.r = value
    unreal.MaterialEditingLibrary.connect_material_property(node, '', prop)

def vector(material, value, prop, x, y):
    node = unreal.MaterialEditingLibrary.create_material_expression(material, unreal.MaterialExpressionConstant3Vector, x, y)
    node.constant = unreal.LinearColor(*value, 1.0)
    unreal.MaterialEditingLibrary.connect_material_property(node, '', prop)

hero_materials = {}
for slot_name, (color, metallic, roughness, emission) in material_specs.items():
    asset_name = 'MAT_' + slot_name[2:]
    path = f'{DEST}/{asset_name}'
    material = unreal.load_asset(path)
    if not material:
        material = asset_tools.create_asset(asset_name, DEST, unreal.Material, unreal.MaterialFactoryNew())
    unreal.MaterialEditingLibrary.delete_all_material_expressions(material)
    vector(material, color, unreal.MaterialProperty.MP_BASE_COLOR, -500, 0)
    scalar(material, metallic, unreal.MaterialProperty.MP_METALLIC, -500, 120)
    scalar(material, roughness, unreal.MaterialProperty.MP_ROUGHNESS, -500, 240)
    if emission:
        vector(material, emission, unreal.MaterialProperty.MP_EMISSIVE_COLOR, -500, 360)
    unreal.MaterialEditingLibrary.recompile_material(material)
    library.save_asset(path, only_if_is_dirty=False)
    hero_materials[slot_name] = material

combined_mesh = unreal.load_asset(f'{DEST}/SM_HeroTimeMachine')
for index, static_material in enumerate(combined_mesh.static_materials):
    slot_name = str(static_material.material_slot_name)
    if slot_name in hero_materials:
        combined_mesh.set_material(index, hero_materials[slot_name])
library.save_asset(f'{DEST}/SM_HeroTimeMachine', only_if_is_dirty=False)

unreal.log('Hero vehicle import complete: '+', '.join(REQUIRED))
