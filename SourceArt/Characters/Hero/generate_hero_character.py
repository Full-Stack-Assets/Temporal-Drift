import bpy
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
EXPORT = ROOT / 'Exports' / 'Hero1985.fbx'

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.unit_settings.system = 'METRIC'
bpy.context.scene.unit_settings.scale_length = 0.01

def mat(name, color, rough=0.55):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1.0)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = rough
    return material

SKIN = mat('M_HeroSkin', (0.62, 0.36, 0.23), 0.6)
HAIR = mat('M_HeroHair', (0.025, 0.018, 0.015), 0.72)
VEST = mat('M_HeroVest', (0.55, 0.035, 0.025), 0.52)
DENIM = mat('M_HeroDenim', (0.035, 0.12, 0.28), 0.68)
SHIRT = mat('M_HeroShirt', (0.72, 0.72, 0.68), 0.58)
SHOES = mat('M_HeroShoes', (0.75, 0.72, 0.62), 0.64)

parts = []

def weight_all(obj, bone):
    group = obj.vertex_groups.new(name=bone)
    group.add(range(len(obj.data.vertices)), 1.0, 'REPLACE')
    parts.append(obj)
    return obj

def cube(name, loc, scale, material, bone, bevel=2.0):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    mod = obj.modifiers.new('SoftEdges', 'BEVEL'); mod.width = bevel; mod.segments = 2
    return weight_all(obj, bone)

def sphere(name, loc, radius, material, bone, scale=(1,1,1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=radius, location=loc)
    obj = bpy.context.object; obj.name = name; obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    return weight_all(obj, bone)

def cylinder(name, loc, radius, depth, material, bone, rotation=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=radius, depth=depth, location=loc, rotation=rotation)
    obj=bpy.context.object; obj.name=name; obj.data.materials.append(material)
    mod=obj.modifiers.new('SoftEdges','BEVEL'); mod.width=1.5; mod.segments=2
    return weight_all(obj,bone)

# Original stylized 1985 hero: red vest, pale shirt, denim, high-top shoes.
cube('Pelvis',(0,0,96),(18,12,12),DENIM,'pelvis',3)
cube('Torso',(0,0,133),(23,13,28),SHIRT,'spine_01',4)
cube('VestFront',(3,-14,137),(21,2,25),VEST,'spine_01',2)
sphere('Head',(0,0,181),18,SKIN,'head',scale=(0.88,0.82,1.05))
sphere('Hair',(0,1,194),17,HAIR,'head',scale=(0.9,0.85,0.45))

for side, y in (('l',-1),('r',1)):
    cylinder(f'UpperArm_{side}',(0, y*34, 140),7,42,SHIRT,f'upperarm_{side}',rotation=(math.radians(8),0,0))
    cylinder(f'LowerArm_{side}',(2, y*35, 103),6,34,SKIN,f'lowerarm_{side}',rotation=(math.radians(5),0,0))
    sphere(f'Hand_{side}',(3,y*36,82),7,SKIN,f'hand_{side}',scale=(0.8,0.65,1.0))
    cylinder(f'Thigh_{side}',(0,y*11,65),9,50,DENIM,f'thigh_{side}')
    cylinder(f'Calf_{side}',(0,y*11,25),7.5,36,DENIM,f'calf_{side}')
    cube(f'Shoe_{side}',(8,y*11,3),(15,8,6),SHOES,f'foot_{side}',3)

# Armature with stable semantic bone names for future animation retargeting.
bpy.ops.object.armature_add(enter_editmode=True, location=(0,0,0))
arm = bpy.context.object; arm.name='SK_Hero1985_Armature'; arm.data.name='Hero1985_Skeleton'
edit = arm.data.edit_bones
edit.remove(edit[0])

def bone(name, head, tail, parent=None):
    b=edit.new(name); b.head=head; b.tail=tail
    if parent: b.parent=edit.get(parent)
    return b

bone('root',(0,0,0),(0,0,15))
bone('pelvis',(0,0,88),(0,0,108),'root')
bone('spine_01',(0,0,108),(0,0,157),'pelvis')
bone('neck',(0,0,157),(0,0,169),'spine_01')
bone('head',(0,0,169),(0,0,201),'neck')
for side,y in (('l',-1),('r',1)):
    bone(f'upperarm_{side}',(0,0,151),(0,y*35,137),'spine_01')
    bone(f'lowerarm_{side}',(0,y*35,137),(2,y*36,98),f'upperarm_{side}')
    bone(f'hand_{side}',(2,y*36,98),(3,y*36,78),f'lowerarm_{side}')
    bone(f'thigh_{side}',(0,y*11,92),(0,y*11,48),'pelvis')
    bone(f'calf_{side}',(0,y*11,48),(0,y*11,10),f'thigh_{side}')
    bone(f'foot_{side}',(0,y*11,10),(24,y*11,3),f'calf_{side}')
bpy.ops.object.mode_set(mode='OBJECT')

# Join rigid-weighted pieces into one skinned mesh.
bpy.ops.object.select_all(action='DESELECT')
for part in parts: part.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.object.join()
mesh=bpy.context.object; mesh.name='SK_Hero1985'
modifier=mesh.modifiers.new('HeroArmature','ARMATURE'); modifier.object=arm
mesh.parent=arm

bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'Hero1985.blend'))
EXPORT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='DESELECT'); mesh.select_set(True); arm.select_set(True)
bpy.context.view_layer.objects.active=arm
bpy.ops.export_scene.fbx(filepath=str(EXPORT),use_selection=True,apply_scale_options='FBX_SCALE_UNITS',axis_forward='-Y',axis_up='Z',add_leaf_bones=False,bake_anim=False,use_mesh_modifiers=True)
print(f'HERO_CHARACTER_EXPORT={EXPORT}')
