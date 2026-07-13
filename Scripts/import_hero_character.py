import os
import unreal

root=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
fbx=os.path.join(root,'SourceArt','Characters','Hero','Exports','Hero1985.fbx')
dest='/Game/Characters/Hero'
if not os.path.isfile(fbx): raise RuntimeError(f'Missing hero FBX: {fbx}')

task=unreal.AssetImportTask(); task.filename=fbx; task.destination_path=dest; task.destination_name='SK_Hero1985'; task.automated=True; task.replace_existing=True; task.save=True
options=unreal.FbxImportUI(); options.import_as_skeletal=True; options.import_mesh=True; options.import_animations=False; options.import_materials=True; options.import_textures=False; options.create_physics_asset=True
task.options=options
unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])

library=unreal.EditorAssetLibrary
target=f'{dest}/SK_Hero1985'
if not library.does_asset_exist(target):
    candidates=[p.split('.')[0] for p in library.list_assets(dest,recursive=True,include_folder=False) if 'Hero1985' in p and 'Skeleton' not in p and 'PhysicsAsset' not in p]
    if not candidates: raise RuntimeError('Hero skeletal mesh was not imported')
    if not library.rename_asset(candidates[0],target): raise RuntimeError(f'Could not rename {candidates[0]} to {target}')
library.save_directory(dest)
unreal.log('BTTF_HERO_CHARACTER_IMPORT_SUCCESS')
