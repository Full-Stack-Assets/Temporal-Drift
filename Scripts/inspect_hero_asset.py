import unreal
mesh=unreal.load_asset('/Game/Vehicles/DeLorean/Hero/SM_HeroTimeMachine')
if not mesh: raise RuntimeError('Hero mesh missing')
bounds=mesh.get_bounds()
unreal.log(f'HERO_BOUNDS origin={bounds.origin} extent={bounds.box_extent} radius={bounds.sphere_radius}')
for index, material in enumerate(mesh.get_editor_property('static_materials')):
    unreal.log(f'HERO_MATERIAL[{index}] slot={material.material_slot_name} asset={material.material_interface}')
