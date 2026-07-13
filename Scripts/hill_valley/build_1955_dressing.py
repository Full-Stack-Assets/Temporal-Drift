import unreal

LEVEL='/Game/Levels/LVL_TimeTravelTest'
OFFSET_Y=7600.0
GEN=unreal.Name('HV_1955_Generated')
ERA=unreal.Name('HV_Era1955')
CUBE='/Engine/BasicShapes/Cube.Cube'
CYLINDER='/Engine/BasicShapes/Cylinder.Cylinder'
SPHERE='/Engine/BasicShapes/Sphere.Sphere'
MAT_PATH='/Game/Environment/HillValley/1955/Materials'

actors=unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
levels=unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
layers=unreal.get_editor_subsystem(unreal.DataLayerEditorSubsystem)

def asset(path):
    result=unreal.EditorAssetLibrary.load_asset(path)
    if not result: raise RuntimeError(f'Missing required asset {path}')
    return result

def material(name,color,roughness=.78):
    path=f'{MAT_PATH}/{name}'
    existing=unreal.EditorAssetLibrary.load_asset(path)
    if existing: return existing
    unreal.EditorAssetLibrary.make_directory(MAT_PATH)
    result=unreal.AssetToolsHelpers.get_asset_tools().create_asset(name,MAT_PATH,unreal.Material,unreal.MaterialFactoryNew())
    color_node=unreal.MaterialEditingLibrary.create_material_expression(result,unreal.MaterialExpressionConstant3Vector,-300,0)
    color_node.constant=unreal.LinearColor(*color,1)
    unreal.MaterialEditingLibrary.connect_material_property(color_node,'',unreal.MaterialProperty.MP_BASE_COLOR)
    rough=unreal.MaterialEditingLibrary.create_material_expression(result,unreal.MaterialExpressionConstant,-300,150)
    rough.r=roughness
    unreal.MaterialEditingLibrary.connect_material_property(rough,'',unreal.MaterialProperty.MP_ROUGHNESS)
    unreal.MaterialEditingLibrary.recompile_material(result)
    unreal.EditorAssetLibrary.save_loaded_asset(result,False)
    return result

def assign_layer(actor,instance):
    if not layers.add_actor_to_data_layer(actor,instance):
        raise RuntimeError(f'Could not add {actor.get_actor_label()} to DL_1955')

def spawn_mesh(name,mesh,loc,scale,mat,tags,layer,rot=(0,0,0),collision=False):
    actor=actors.spawn_actor_from_class(unreal.StaticMeshActor,unreal.Vector(loc[0],loc[1]+OFFSET_Y,loc[2]),unreal.Rotator(rot[0],rot[1],rot[2]))
    actor.set_actor_label(name); actor.tags=[GEN,ERA]+[unreal.Name(t) for t in tags]; actor.is_spatially_loaded=False
    actor.set_actor_scale3d(unreal.Vector(*scale))
    comp=actor.get_component_by_class(unreal.StaticMeshComponent); comp.set_editor_property('static_mesh',asset(mesh)); comp.set_material(0,mat)
    comp.set_collision_enabled(unreal.CollisionEnabled.QUERY_AND_PHYSICS if collision else unreal.CollisionEnabled.NO_COLLISION)
    assign_layer(actor,layer); return actor

def block(name,loc,size,mat,tags,layer,collision=False):
    return spawn_mesh(name,CUBE,loc,(size[0]/100,size[1]/100,size[2]/100),mat,tags,layer,collision=collision)

def sign(name,text,loc,layer,scale=2.2):
    actor=actors.spawn_actor_from_class(unreal.TextRenderActor,unreal.Vector(loc[0],loc[1]+OFFSET_Y,loc[2]),unreal.Rotator(0,0,90))
    actor.set_actor_label(name); actor.tags=[GEN,ERA,unreal.Name('HV_1955_Sign')]; actor.is_spatially_loaded=False
    comp=actor.get_component_by_class(unreal.TextRenderComponent); comp.set_editor_property('text',unreal.Text(text)); comp.set_editor_property('world_size',32); comp.set_editor_property('text_render_color',unreal.Color(245,210,100,255)); comp.set_editor_property('horizontal_alignment',unreal.HorizTextAligment.EHTA_CENTER)
    actor.set_actor_scale3d(unreal.Vector(scale,scale,scale)); assign_layer(actor,layer); return actor

def main():
    if not unreal.EditorLoadingAndSavingUtils.load_map(LEVEL): raise RuntimeError('Could not load Hill Valley map')
    for actor in list(actors.get_all_level_actors()):
        if GEN in actor.tags: actors.destroy_actor(actor)

    layer_asset=asset('/Game/Data/DataLayers/DL_1955.DL_1955')
    layer=layers.get_data_layer_instance(layer_asset)
    if not layer: raise RuntimeError('DL_1955 instance is not present in the level')

    cream=material('M_1955_Cream',(0.72,0.62,0.44)); mint=material('M_1955_Mint',(0.19,0.48,0.38)); coral=material('M_1955_Coral',(0.62,0.17,0.12)); teal=material('M_1955_Teal',(0.04,0.25,0.29)); chrome=material('M_1955_Chrome',(0.35,0.39,0.42),.25); dark=material('M_1955_Dark',(0.025,0.03,0.035),.5); green=material('M_1955_Green',(0.05,0.23,0.06)); white=material('M_1955_White',(0.75,0.73,0.64)); asphalt=asset('/Game/Materials/HillValley/M_HV_Concrete.M_HV_Concrete')

    # Courthouse election/festival dressing.
    for i,(x,z,text) in enumerate(((-1100,980,'WELCOME TO 1955'),(1100,980,'HILL VALLEY PROGRESS'),(-650,500,'GOLDIE WILSON'),(650,500,'A CLEANER FUTURE'))):
        block(f'HV1955_CourthouseBanner_{i}',(x,1780,z),(900,24,180),coral if i%2==0 else teal,('HV_1955_Courthouse',),layer)
        sign(f'HV1955_CourthouseText_{i}',text,(x,1750,z+10),layer,1.15)

    # Twelve pastel façade overlays around the square.
    storefronts=('LOU S CAFE','HILL VALLEY RECORDS','TOWN THEATER','WESTERN AUTO','RUTH S FROCKS','ELITE BARBER','CITY DRUGS','RADIO AND TV','FIVE AND DIME','CLOCK SHOP','MALT SHOP','TRAVEL SERVICE')
    for i,title in enumerate(storefronts):
        side=-1 if i<6 else 1; row=i if i<6 else i-6
        x=side*4580; y=-3500+row*1050; color=(mint,cream,coral,teal)[i%4]
        block(f'HV1955_StorefrontFacade_{i:02d}',(x,y,560),(46,900,820),color,('HV_1955_Storefront',),layer)
        block(f'HV1955_StorefrontAwning_{i:02d}',(x-side*55,y,680),(120,760,65),white,('HV_1955_Storefront',),layer)
        sign(f'HV1955_StorefrontSign_{i:02d}',title,(x-side*90,y,930),layer,1.0)

    # Period lamps, benches and phone booths.
    for i,(x,y) in enumerate(((-2600,-2600),(2600,-2600),(-2600,-500),(2600,-500),(-2600,1500),(2600,1500))):
        spawn_mesh(f'HV1955_Lamp_{i}',CYLINDER,(x,y,260),(.18,.18,2.6),dark,('HV_1955_StreetFurniture',),layer,collision=True)
        spawn_mesh(f'HV1955_LampGlobe_{i}',SPHERE,(x,y,540),(.34,.34,.34),white,('HV_1955_StreetFurniture',),layer)
    for i,(x,y) in enumerate(((-1800,-1500),(1800,-1500),(-1800,900),(1800,900))):
        block(f'HV1955_Bench_{i}',(x,y,90),(520,110,100),dark,('HV_1955_StreetFurniture',),layer,collision=True)
    for i,(x,y) in enumerate(((-3500,-2800),(3500,1250))):
        block(f'HV1955_PhoneBooth_{i}',(x,y,220),(180,180,440),coral,('HV_1955_StreetFurniture',),layer,collision=True)

    # Six tail-fin cruiser silhouettes.
    for i,(x,y) in enumerate(((-2800,-3900),(-900,-3900),(1000,-3900),(2900,-3900),(-3400,2500),(3400,2500))):
        body=(coral,mint,cream,teal)[i%4]
        block(f'HV1955_ParkedCarBody_{i}',(x,y,95),(520,210,120),body,('HV_1955_ParkedCar',),layer,collision=True)
        block(f'HV1955_ParkedCarCabin_{i}',(x-25,y,185),(230,185,90),dark,('HV_1955_ParkedCar',),layer)
        for w in (-1,1):
            spawn_mesh(f'HV1955_ParkedCarWheel_{i}_{w}',CYLINDER,(x+130*w,y-110,70),(.32,.32,.16),dark,('HV_1955_ParkedCar',),layer,rot=(90,0,0))

    for i,x in enumerate((-2400,-800,800,2400)):
        block(f'HV1955_RoadMarking_{i}',(x,-3050,45),(850,28,4),white,('HV_1955_RoadMarking',),layer)

    for i,(x,y) in enumerate(((-2100,1800),(-1500,2100),(-800,2200),(800,2200),(1500,2100),(2100,1800),(-3200,500),(3200,500))):
        spawn_mesh(f'HV1955_DeciduousTree_{i}',CYLINDER,(x,y,170),(.22,.22,1.7),dark,('HV_1955_Vegetation',),layer)
        spawn_mesh(f'HV1955_DeciduousCanopy_{i}',SPHERE,(x,y,420),(1.2,1.2,1.4),green,('HV_1955_Vegetation',),layer)

    fog=actors.spawn_actor_from_class(unreal.ExponentialHeightFog,unreal.Vector(0,OFFSET_Y,0),unreal.Rotator())
    fog.set_actor_label('HV1955_Atmosphere'); fog.tags=[GEN,ERA,unreal.Name('HV_1955_Lighting')]; fog.is_spatially_loaded=False
    fog_comp=fog.get_component_by_class(unreal.ExponentialHeightFogComponent); fog_comp.set_editor_property('fog_density',.012); fog_comp.set_editor_property('fog_inscattering_luminance',unreal.LinearColor(.55,.62,.68,1))
    assign_layer(fog,layer)

    layers.set_data_layer_visibility(layer,False); layers.set_data_layer_is_loaded_in_editor(layer,True,True)
    if not levels.save_current_level(): raise RuntimeError('Could not save 1955 dressing')
    unreal.EditorAssetLibrary.save_directory('/Game/Environment/HillValley/1955')
    unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True,True)
    unreal.log('HILL_VALLEY_1955_BUILD_SUCCESS')

main()
