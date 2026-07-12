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
combined_options.import_materials = False
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

unreal.log('Hero vehicle import complete: '+', '.join(REQUIRED))
