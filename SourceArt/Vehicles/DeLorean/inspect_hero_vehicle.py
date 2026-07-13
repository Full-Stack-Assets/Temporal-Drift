import bpy, sys
required_objects={'BodyShell','FrontFascia','BeltTrim','GlassSet','Interior','TimeMachinery','Wheel_FL','Wheel_FR','Wheel_RL','Wheel_RR','LOD1_BodyShell','LOD2_BodyShell','UCX_BodyShell_00'}
required_materials={'M_BrushedSteel','M_DarkTrim','M_SmokedGlass','M_Rubber','M_Alloy','M_Interior','M_Lamps','M_TimeEmissive'}
missing_objects=sorted(required_objects-set(bpy.data.objects.keys()))
missing_materials=sorted(required_materials-set(bpy.data.materials.keys()))
body=bpy.data.objects.get('BodyShell')
dimensions=body.dimensions if body else (0,0,0)
valid_dimensions=399 <= dimensions.x <= 441 and 175 <= dimensions.y <= 195 and 55 <= dimensions.z <= 80
if missing_objects or missing_materials or not valid_dimensions:
    print('MISSING_OBJECTS='+','.join(missing_objects)); print('MISSING_MATERIALS='+','.join(missing_materials)); print('BODY_DIMENSIONS='+str(tuple(round(v,2) for v in dimensions))); sys.exit(2)
print('OBJECTS_OK='+','.join(sorted(required_objects))); print('MATERIALS_OK='+','.join(sorted(required_materials))); print('BODY_DIMENSIONS='+str(tuple(round(v,2) for v in dimensions)))
