import bpy
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
EXPORT = ROOT / "Exports" / "HeroTimeMachine.fbx"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.unit_settings.system = 'METRIC'
bpy.context.scene.unit_settings.scale_length = 0.01

def material(name, color, metallic=0.0, roughness=0.45, emission=None):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1.0)
        bsdf.inputs['Emission Strength'].default_value = 4.0
    return mat

STEEL = material('M_BrushedSteel', (0.48, 0.52, 0.54), 0.82, 0.28)
TRIM = material('M_DarkTrim', (0.018, 0.023, 0.027), 0.15, 0.33)
GLASS = material('M_SmokedGlass', (0.018, 0.055, 0.075), 0.2, 0.12)
RUBBER = material('M_Rubber', (0.008, 0.009, 0.01), 0.0, 0.7)
ALLOY = material('M_Alloy', (0.32, 0.35, 0.37), 0.9, 0.2)
INTERIOR = material('M_Interior', (0.025, 0.028, 0.031), 0.0, 0.52)
LAMPS = material('M_Lamps', (0.7, 0.78, 0.82), 0.25, 0.18, (0.7, 0.8, 1.0))
EMISSIVE = material('M_TimeEmissive', (0.02, 0.2, 0.28), 0.25, 0.2, (0.02, 0.65, 1.0))

collection = bpy.data.collections.new('HeroTimeMachine')
bpy.context.scene.collection.children.link(collection)

def move_to_collection(obj):
    for col in list(obj.users_collection): col.objects.unlink(obj)
    collection.objects.link(obj)

def bevel(obj, amount=2.0, segments=3):
    mod = obj.modifiers.new('EdgeBevel', 'BEVEL')
    mod.width = amount; mod.segments = segments
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_smooth_by_angle()

def box(name, location, scale, mat, bevel_width=1.5, rotation=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object; obj.name = name; obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat); bevel(obj, bevel_width); move_to_collection(obj)
    return obj

def wedge(name, xs, widths, heights, bottoms, mat):
    verts=[]
    for x,w,h,b in zip(xs,widths,heights,bottoms):
        verts += [(x,-w,b),(x,w,b),(x,-w,h),(x,w,h)]
    faces=[]
    for i in range(len(xs)-1):
        a=i*4; n=(i+1)*4
        faces += [(a,n,n+2,a+2),(a+1,a+3,n+3,n+1),(a,a+1,n+1,n),(a+2,n+2,n+3,a+3)]
    faces += [(0,2,3,1),(len(verts)-4,len(verts)-3,len(verts)-1,len(verts)-2)]
    mesh=bpy.data.meshes.new(name+'Mesh'); mesh.from_pydata(verts,[],faces); mesh.update()
    obj=bpy.data.objects.new(name,mesh); collection.objects.link(obj); obj.data.materials.append(mat)
    bevel(obj,2.2,3); return obj

# Body: forward is +X, dimensions are centimeters.
body = wedge('BodyShell', [-210,-170,-85,30,125,190,210],
             [68,88,92,92,88,74,58], [63,76,88,92,86,71,63],
             [35,30,27,27,30,34,39], STEEL)
box('FrontFascia',(195,0,54),(17,73,13),TRIM,2.5)
box('RearFascia',(-197,0,57),(14,78,15),TRIM,2.5)
box('BeltTrim',(0,91,73),(155,2.2,5),TRIM,1.2)
box('BeltTrim_R',(0,-91,73),(155,2.2,5),TRIM,1.2)

# Cabin and glass use tapered wedges to avoid the rejected block silhouette.
roof = wedge('RoofShell',[-90,-45,45,98],[58,68,64,48],[118,142,136,112],[88,89,90,88],GLASS)
wind = wedge('GlassSet',[54,96],[65,53],[142,118],[96,91],GLASS)
rear_glass = wedge('RearGlass',[-92,-52],[56,66],[116,137],[91,93],GLASS)
box('DoorSeam_L',(3,91.8,102),(72,1.0,26),TRIM,0.6,rotation=(0,0,math.radians(-2)))
box('DoorSeam_R',(3,-91.8,102),(72,1.0,26),TRIM,0.6,rotation=(0,0,math.radians(-2)))

# Interior visible from cockpit camera.
box('Interior',(0,0,82),(85,58,7),INTERIOR,3)
for y in (-34,34):
    box('Seat_L' if y<0 else 'Seat_R',(-25,y,101),(28,20,30),INTERIOR,5,rotation=(0,math.radians(-8),0))
box('Dashboard',(58,0,111),(15,64,10),INTERIOR,3)
bpy.ops.mesh.primitive_torus_add(major_radius=18,minor_radius=2.2,location=(48,-31,126),rotation=(math.radians(90),0,0))
steer=bpy.context.object; steer.name='SteeringWheel'; steer.data.materials.append(INTERIOR); move_to_collection(steer)
box('TimeCircuits',(30,21,119),(20,11,6),EMISSIVE,1.5)

# Wheels with independent axle-center origins.
wheel_positions={'Wheel_FL':(125,-92,48),'Wheel_FR':(125,92,48),'Wheel_RL':(-125,-92,48),'Wheel_RR':(-125,92,48)}
for name,pos in wheel_positions.items():
    bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=34,depth=22,location=pos,rotation=(math.radians(90),0,0))
    wheel=bpy.context.object; wheel.name=name; wheel.data.materials.append(RUBBER); bevel(wheel,1.2,2); move_to_collection(wheel)
    bpy.ops.mesh.primitive_cylinder_add(vertices=20,radius=22,depth=23,location=pos,rotation=(math.radians(90),0,0))
    hub=bpy.context.object; hub.name=name+'_Hub'; hub.data.materials.append(ALLOY); bevel(hub,1,2); move_to_collection(hub)

# Original rear time apparatus: rails, reactor, coils, and emissive conduits.
box('TimeMachinery',(-138,0,101),(48,49,10),TRIM,3)
for y in (-48,0,48): box('FluxRail_'+str(y),(-135,y,126),(48,3,4),ALLOY,1)
bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=11,depth=26,location=(-151,0,121),rotation=(0,math.radians(90),0))
reactor=bpy.context.object; reactor.name='FluxReactor'; reactor.data.materials.append(EMISSIVE); bevel(reactor,1.5); move_to_collection(reactor)
for y in (-62,62): box('EmissiveConduit_'+str(y),(-112,y,132),(58,2.5,2.5),EMISSIVE,1)
for y in (-43,43): box('HeadLamp_'+str(y),(210,y,59),(2,17,6),LAMPS,1)
for y in (-49,0,49): box('TailLamp_'+str(y),(-211,y,61),(2,15,6),LAMPS,1)

# Simple collision hulls and deterministic reduced LOD silhouette objects.
box('UCX_BodyShell_00',(0,0,59),(195,82,28),STEEL,4)
collection.objects['UCX_BodyShell_00'].hide_render=True
for lod, factor in ((1,0.995),(2,0.99)):
    dup=body.copy(); dup.data=body.data.copy(); dup.name=f'LOD{lod}_BodyShell'; collection.objects.link(dup)
    dup.scale=(factor,factor,factor); dup.hide_viewport=True; dup.hide_render=True

# UV unwrap every authored mesh and apply transforms.
for obj in collection.objects:
    if obj.type=='MESH':
        bpy.context.view_layer.objects.active=obj; obj.select_set(True)
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        if len(obj.data.uv_layers)==0: obj.data.uv_layers.new(name='UVMap')
        obj.select_set(False)

bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'HeroTimeMachine.blend'))
EXPORT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='DESELECT')
for obj in collection.objects:
    if obj.type=='MESH' and not obj.name.startswith(('UCX_','LOD1_','LOD2_')):
        obj.select_set(True)
bpy.ops.export_scene.fbx(filepath=str(EXPORT), use_selection=True, apply_scale_options='FBX_SCALE_UNITS', axis_forward='-Y', axis_up='Z', add_leaf_bones=False, mesh_smooth_type='FACE', use_mesh_modifiers=True)
print(f'HERO_EXPORT={EXPORT}')
