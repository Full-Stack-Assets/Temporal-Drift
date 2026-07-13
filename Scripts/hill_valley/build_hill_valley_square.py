import unreal


LEVEL = "/Game/Levels/LVL_TimeTravelTest"
GENERATED_TAG = unreal.Name("HV_Generated")
CUBE = "/Engine/BasicShapes/Cube.Cube"
CYLINDER = "/Engine/BasicShapes/Cylinder.Cylinder"
SPHERE = "/Engine/BasicShapes/Sphere.Sphere"
BASIC_MATERIAL = "/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"
MATERIAL_PATH = "/Game/Materials/HillValley"
TOWN_OFFSET_Y = 7600.0

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


def delete_previous_generated():
    deleted = 0
    for actor in actor_subsystem.get_all_level_actors():
        if GENERATED_TAG in actor.get_editor_property("tags"):
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
    world_location = (location[0], location[1] + TOWN_OFFSET_Y, location[2])
    actor = actor_subsystem.spawn_actor_from_class(
        unreal.StaticMeshActor,
        unreal.Vector(*world_location),
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
    world_location = (location[0], location[1] + TOWN_OFFSET_Y, location[2])
    actor = actor_subsystem.spawn_actor_from_class(
        unreal.TextRenderActor, unreal.Vector(*world_location), make_rotator(*rotation)
    )
    if actor is None:
        raise RuntimeError(f"Unable to spawn sign: {name}")
    actor.set_actor_label(name)
    actor.set_editor_property("tags", [GENERATED_TAG, unreal.Name("HV_Signage")] + [unreal.Name(tag) for tag in tags])
    actor.set_editor_property("is_spatially_loaded", False)
    component = actor.get_component_by_class(unreal.TextRenderComponent)
    component.set_editor_property("text", unreal.Text(text))
    component.set_editor_property("text_render_color", unreal.Color(int(color[0]*255), int(color[1]*255), int(color[2]*255), int(color[3]*255)))
    component.set_editor_property("horizontal_alignment", unreal.HorizTextAligment.EHTA_CENTER)
    component.set_editor_property("world_size", 34.0)
    actor.set_actor_scale3d(unreal.Vector(scale, scale, scale))
    return actor


def create_block_series(prefix, entries, material, tags):
    for name, location, size in entries:
        spawn_block(name, location, size, material, tags=tags)


def build_roads_and_square(materials):
    asphalt = materials["asphalt"]
    concrete = materials["concrete"]
    grass = materials["grass"]

    road_segments = [
        ("HV_Road_South", (0, -4200, 20), (9000, 1900, 40)),
        ("HV_Road_North", (0, 1900, 20), (9000, 1700, 40)),
        ("HV_Road_West", (-3650, -1150, 20), (1700, 6100, 40)),
        ("HV_Road_East", (3650, -1150, 20), (1700, 6100, 40)),
        ("HV_Road_Approach", (0, -7600, 20), (1900, 5000, 40)),
    ]
    for name, location, size in road_segments:
        spawn_block(name, location, size, asphalt, tags=("HV_Road",))

    curb_segments = [
        ("HV_Curb_South_Inner", (0, -3320, 82), (5600, 110, 54)),
        ("HV_Curb_North_Inner", (0, 1030, 82), (5600, 110, 54)),
        ("HV_Curb_West_Inner", (-2885, -1145, 82), (110, 3850, 54)),
        ("HV_Curb_East_Inner", (2885, -1145, 82), (110, 3850, 54)),
        ("HV_Curb_South_Outer", (0, -5400, 82), (9200, 110, 54)),
        ("HV_Curb_North_Outer", (0, 3040, 82), (9200, 110, 54)),
        ("HV_Curb_West_Outer", (-4850, -1150, 82), (110, 6250, 54)),
        ("HV_Curb_East_Outer", (4850, -1150, 82), (110, 6250, 54)),
    ]
    create_block_series("HV_Curb", curb_segments, concrete, ("HV_Sidewalk",))

    sidewalk_segments = [
        ("HV_Sidewalk_South_Inner", (0, -3100, 55), (5400, 300, 70)),
        ("HV_Sidewalk_North_Inner", (0, 850, 55), (5400, 300, 70)),
        ("HV_Sidewalk_West_Inner", (-2700, -1125, 55), (300, 3650, 70)),
        ("HV_Sidewalk_East_Inner", (2700, -1125, 55), (300, 3650, 70)),
        ("HV_Sidewalk_South_Outer", (0, -5250, 55), (9000, 300, 70)),
        ("HV_Sidewalk_North_Outer", (0, 2900, 55), (9000, 300, 70)),
        ("HV_Sidewalk_West_Outer", (-4700, -1150, 55), (300, 6100, 70)),
        ("HV_Sidewalk_East_Outer", (4700, -1150, 55), (300, 6100, 70)),
    ]
    for name, location, size in sidewalk_segments:
        spawn_block(name, location, size, concrete, tags=("HV_Sidewalk",))

    crossing_segments = [
        ("HV_Crossing_South", (0, -3300, 92), (700, 280, 12)),
        ("HV_Crossing_North", (0, 1000, 92), (700, 280, 12)),
        ("HV_Crossing_West", (-2850, -1150, 92), (280, 700, 12)),
        ("HV_Crossing_East", (2850, -1150, 92), (280, 700, 12)),
    ]
    create_block_series("HV_Crossing", crossing_segments, materials["trim"], ("HV_Sidewalk", "HV_Crossing"))

    parking_segments = [
        ("HV_Parking_West", (-4200, -1150, 42), (900, 4200, 24)),
        ("HV_Parking_East", (4200, -1150, 42), (900, 4200, 24)),
        ("HV_Parking_South", (0, -4550, 42), (5200, 650, 24)),
    ]
    create_block_series("HV_Parking", parking_segments, asphalt, ("HV_Road", "HV_Parking"))

    spawn_block("HV_Civic_Lawn", (0, -1150, 60), (5100, 3450, 80), grass, tags=("HV_Landscape",))
    spawn_block("HV_Civic_Path_NS", (0, -1150, 110), (420, 3450, 25), concrete, tags=("HV_Landscape",))
    spawn_block("HV_Civic_Path_EW", (0, -1100, 112), (5100, 360, 25), concrete, tags=("HV_Landscape",))
    spawn_block("HV_Courthouse_Plaza", (0, 2550, 70), (4800, 750, 90), concrete, tags=("HV_Landscape",))


def build_courthouse(materials):
    stone = materials["stone"]
    roof = materials["roof"]
    dark = materials["dark"]

    spawn_block("HV_Courthouse_Main", (0, 4300, 950), (4300, 2200, 1800), stone, tags=("HV_Courthouse",))
    spawn_block("HV_Courthouse_Wing_L", (-2600, 4450, 700), (1400, 1800, 1300), stone, tags=("HV_Courthouse",))
    spawn_block("HV_Courthouse_Wing_R", (2600, 4450, 700), (1400, 1800, 1300), stone, tags=("HV_Courthouse",))
    spawn_block("HV_Courthouse_Rear", (0, 5300, 780), (3600, 1400, 1450), stone, tags=("HV_Courthouse",))
    spawn_block("HV_Courthouse_Rear_Wing_L", (-2200, 5450, 620), (1100, 1300, 1100), stone, tags=("HV_Courthouse",))
    spawn_block("HV_Courthouse_Rear_Wing_R", (2200, 5450, 620), (1100, 1300, 1100), stone, tags=("HV_Courthouse",))
    spawn_block("HV_Courthouse_Portico", (0, 3000, 950), (2500, 450, 350), stone, tags=("HV_Courthouse",))

    for index, x in enumerate((-900, -300, 300, 900)):
        spawn_static_mesh(
            f"HV_Courthouse_Column_{index}",
            CYLINDER,
            (x, 2720, 980),
            (2.0, 2.0, 12.5),
            material=stone,
            tags=("HV_Courthouse",),
        )

    for index in range(6):
        spawn_block(
            f"HV_Courthouse_Step_{index}",
            (0, 2450 - index * 115, 300 - index * 38),
            (3000 + index * 240, 240, 80),
            stone,
            tags=("HV_Courthouse",),
        )

    spawn_block("HV_Courthouse_Pediment", (0, 2850, 1850), (2800, 500, 280), roof, tags=("HV_Courthouse",))
    spawn_block("HV_Clocktower_Base", (0, 4150, 2200), (1650, 1450, 850), stone, tags=("HV_Clocktower",))
    spawn_block("HV_Clocktower_Upper", (0, 4120, 2880), (1150, 1100, 520), stone, tags=("HV_Clocktower",))
    spawn_block("HV_Clocktower_Cap", (0, 4120, 3260), (1450, 1350, 240), roof, tags=("HV_Clocktower",))
    spawn_static_mesh(
        "HV_Clock_Face",
        CYLINDER,
        (0, 3525, 2850),
        (5.2, 5.2, 0.35),
        rotation=(90.0, 0.0, 0.0),
        material=dark,
        tags=("HV_Clocktower",),
    )
    spawn_static_mesh(
        "HV_Clock_Center",
        SPHERE,
        (0, 3475, 2850),
        (0.65, 0.65, 0.65),
        material=stone,
        tags=("HV_Clocktower",),
    )


def spawn_storefront(label, location, yaw, width, depth, floors, material, trim):
    x, y, z = location
    height = floors * 430
    body = spawn_block(
        f"{label}_Body",
        (x, y, z + height / 2),
        (width, depth, height),
        material,
        tags=("HV_Storefront",),
        rotation=(0.0, yaw, 0.0),
    )
    forward = unreal.Vector(1.0, 0.0, 0.0).rotate_angle_axis(yaw, unreal.Vector(0.0, 0.0, 1.0))
    facade_x = x + forward.x * (depth / 2 + 30)
    facade_y = y + forward.y * (depth / 2 + 30)
    spawn_block(
        f"{label}_SignPanel",
        (facade_x, facade_y, z + 390),
        (width * 0.82, 55, 150),
        trim,
        tags=("HV_Storefront_DressingHook",),
        rotation=(0.0, yaw + 90.0, 0.0),
    )
    spawn_block(
        f"{label}_Cornice",
        (x, y, z + height + 35),
        (width + 90, depth + 70, 70),
        trim,
        tags=("HV_Storefront",),
        rotation=(0.0, yaw, 0.0),
    )
    for floor in range(floors):
        for bay in (-0.28, 0.28):
            spawn_block(
                f"{label}_Window_{floor}_{bay}",
                (facade_x + (-forward.y) * width * bay, facade_y + forward.x * width * bay, z + 250 + floor * 420),
                (190, 35, 190),
                materials_global["glass"],
                tags=("HV_Storefront",),
                rotation=(0.0, yaw + 90.0, 0.0),
            )
            spawn_block(
                f"{label}_WindowBacking_{floor}_{bay}",
                (
                    facade_x - forward.x * 55 + (-forward.y) * width * bay,
                    facade_y - forward.y * 55 + forward.x * width * bay,
                    z + 250 + floor * 420,
                ),
                (180, 20, 180),
                materials_global["dark"],
                tags=("HV_Storefront",),
                rotation=(0.0, yaw + 90.0, 0.0),
            )
    return body


def build_storefronts(materials):
    palette = [materials["brick"], materials["plaster"], materials["stone"], materials["brick_dark"]]
    trim = materials["trim"]

    for index, y in enumerate((-4300, -3000, -1700, -400, 900, 2100)):
        spawn_storefront(f"HV_WestShop_{index}", (-5550, y, 100), 0.0, 1100, 1000, 2 + (index % 2), palette[index % len(palette)], trim)
        spawn_storefront(f"HV_EastShop_{index}", (5550, y, 100), 180.0, 1100, 1000, 2 + ((index + 1) % 2), palette[(index + 2) % len(palette)], trim)

    for index, x in enumerate((-3900, -2600, -1300, 1300, 2600, 3900)):
        spawn_storefront(f"HV_SouthShop_{index}", (x, -6100, 100), 90.0, 1100, 1000, 2 + (index % 2), palette[(index + 1) % len(palette)], trim)


def spawn_tree(name, location, materials, scale=1.0):
    x, y, z = location
    spawn_static_mesh(name + "_Trunk", CYLINDER, (x, y, z + 220 * scale), (0.6 * scale, 0.6 * scale, 4.5 * scale), material=materials["trunk"], tags=("HV_Landscape", "HV_Foliage", "HV_Prop"))
    spawn_static_mesh(name + "_Crown", SPHERE, (x, y, z + 520 * scale), (2.8 * scale, 2.8 * scale, 3.2 * scale), material=materials["leaves"], tags=("HV_Landscape", "HV_Foliage", "HV_Prop"))


def spawn_marker(name, location, tags):
    world_location = (location[0], location[1] + TOWN_OFFSET_Y, location[2])
    actor = actor_subsystem.spawn_actor_from_class(unreal.TargetPoint, unreal.Vector(*world_location))
    actor.set_actor_label(name)
    actor.set_editor_property("tags", [GENERATED_TAG] + [unreal.Name(tag) for tag in tags])
    actor.set_editor_property("is_spatially_loaded", False)
    return actor


def build_streetscape(materials):
    tree_positions = [
        (-2100, -2500, 120), (2100, -2500, 120), (-2100, 250, 120), (2100, 250, 120),
        (-6200, -4700, 100), (6200, -4700, 100), (-6200, -2200, 100), (6200, -2200, 100),
        (-6200, 500, 100), (6200, 500, 100), (-6000, 3000, 100), (6000, 3000, 100),
        (-7600, 4300, 100), (7600, 4300, 100), (-7600, -6000, 100), (7600, -6000, 100),
    ]
    for index, position in enumerate(tree_positions):
        spawn_tree(f"HV_Tree_{index}", position, materials, 0.9 + (index % 3) * 0.12)

    lamp_positions = [(-3000, -2900), (3000, -2900), (-3000, 600), (3000, 600), (-4550, -4200), (4550, -4200), (-4550, 1800), (4550, 1800)]
    for index, (x, y) in enumerate(lamp_positions):
        spawn_static_mesh(f"HV_Lamp_{index}_Post", CYLINDER, (x, y, 360), (0.22, 0.22, 6.0), material=materials["dark"], tags=("HV_Prop",))
        spawn_static_mesh(f"HV_Lamp_{index}_Globe", SPHERE, (x, y, 690), (0.55, 0.55, 0.7), material=materials["stone"], tags=("HV_Prop",))

    for index, (x, y, yaw) in enumerate(((-1700, -2500, 0), (1700, -2500, 0), (-1700, 150, 180), (1700, 150, 180))):
        spawn_block(f"HV_Bench_{index}", (x, y, 170), (500, 90, 70), materials["trunk"], tags=("HV_Prop",), rotation=(0.0, yaw, 0.0))
        spawn_block(f"HV_Bench_{index}_Back", (x, y, 310), (500, 55, 220), materials["trunk"], tags=("HV_Prop",), rotation=(0.0, yaw, 0.0))

    for index, (x, y) in enumerate(((-2350, -2850), (2350, -2850), (-2350, 550), (2350, 550))):
        spawn_block(f"HV_Planter_{index}", (x, y, 155), (420, 420, 180), materials["brick_dark"], tags=("HV_Prop", "HV_Landscape"))
        spawn_static_mesh(f"HV_Planter_{index}_Shrub", SPHERE, (x, y, 330), (1.8, 1.8, 1.4), material=materials["leaves"], tags=("HV_Prop", "HV_Landscape"))

    for index, (x, y, sx, sy) in enumerate(((-7600, 6000, 30, 20), (7600, 6000, 30, 20), (-8500, -3500, 24, 30), (8500, -3500, 24, 30))):
        spawn_block(f"HV_Berm_{index}", (x, y, -50), (sx * 100, sy * 100, 500), materials["grass"], tags=("HV_Landscape",))

    hydrant_positions = [(-3950, -5100), (3950, -5100), (-5200, -1000), (5200, -1000), (-5200, 2200), (5200, 2200)]
    for index, (x, y) in enumerate(hydrant_positions):
        spawn_static_mesh(
            f"HV_Hydrant_{index}",
            CYLINDER,
            (x, y, 160),
            (0.22, 0.22, 1.4),
            material=materials["brick_red"],
            tags=("HV_Prop",),
        )

    trash_positions = [(-4700, -4300), (4700, -4300), (-4700, -1500), (4700, -1500), (-4700, 1200), (4700, 1200)]
    for index, (x, y) in enumerate(trash_positions):
        spawn_static_mesh(
            f"HV_TrashCan_{index}",
            CYLINDER,
            (x, y, 130),
            (0.35, 0.35, 1.1),
            material=materials["dark"],
            tags=("HV_Prop",),
        )

    for index, (x, y) in enumerate(((-6200, -4700), (6200, -4700), (-6200, -2200), (6200, -2200), (-6200, 500), (6200, 500))):
        spawn_block(f"HV_TreeWell_{index}", (x, y, 92), (520, 520, 12), materials["concrete"], tags=("HV_Landscape", "HV_Prop"))


def set_default_era_data_layer():
    data_layer_paths = {
        "DL_1885": "/Game/Data/DataLayers/DL_1885.DL_1885",
        "DL_1955": "/Game/Data/DataLayers/DL_1955.DL_1955",
        "DL_1985_Present": "/Game/Data/DataLayers/DL_1985_Present.DL_1985_Present",
        "DL_1985_Alternate": "/Game/Data/DataLayers/DL_1985_Alternate.DL_1985_Alternate",
        "DL_2015": "/Game/Data/DataLayers/DL_2015.DL_2015",
        "DL_2045": "/Game/Data/DataLayers/DL_2045.DL_2045",
    }

    subsystem = unreal.get_editor_subsystem(unreal.DataLayerEditorSubsystem)
    if subsystem is None:
        log("data layer subsystem unavailable; skipping default era setup")
        return

    for name, asset_path in data_layer_paths.items():
        data_layer_asset = unreal.EditorAssetLibrary.load_asset(asset_path)
        if data_layer_asset is None:
            log(f"missing data layer asset for default setup: {asset_path}")
            continue

        should_enable = name == "DL_1985_Present"
        try:
            if hasattr(subsystem, "set_data_layer_visibility"):
                subsystem.set_data_layer_visibility(data_layer_asset, should_enable)
            if hasattr(subsystem, "set_data_layer_is_loaded_in_editor"):
                subsystem.set_data_layer_is_loaded_in_editor(data_layer_asset, should_enable)
        except TypeError:
            log(f"UE 5.8 requires a DataLayerInstance for editor visibility; runtime manager will activate {name}")

    log("applied default era data layer state (DL_1985_Present active)")


def build_complete_region(materials):
    # Connected district roads surrounding the courthouse-square core.
    road_specs = (
        ("HV_RegionalRoad_North", (0, 10500, 15), (1800, 12000, 30)),
        ("HV_RegionalRoad_South", (0, -10500, 15), (1800, 12000, 30)),
        ("HV_RegionalRoad_West", (-11500, 0, 15), (12000, 1800, 30)),
        ("HV_RegionalRoad_East", (11500, 0, 15), (12000, 1800, 30)),
        ("HV_RuralApproach", (0, -19500, 10), (1500, 9000, 25)),
    )
    for name, location, size in road_specs:
        spawn_block(name, location, size, materials["asphalt"], tags=("HV_Road", "HV_Regional"))

    for index, (x, y, sx, sy) in enumerate((
        (-11500, 0, 900, 1800), (11500, 0, 900, 1800),
        (0, 10500, 1800, 900), (0, -10500, 1800, 900))):
        spawn_block(f"HV_RegionalCrossing_{index}", (x, y, 38),
                    (sx, sy, 6), materials["concrete"], tags=("HV_Crossing", "HV_RoadMarking"))

    # Terrain basin and surrounding hills establish a readable town boundary.
    spawn_block("HV_RegionalGround", (0, 0, -135), (36000, 43000, 250), materials["grass"], tags=("HV_Landscape", "HV_Regional"))
    hill_specs = ((-17000,-15000,2.2),(17000,-15000,2.0),(-17000,14500,2.5),(17000,14500,2.3),(0,20500,2.8))
    for index,(x,y,scale) in enumerate(hill_specs):
        spawn_static_mesh(f"HV_RegionalHill_{index}", SPHERE, (x,y,250), (28*scale,20*scale,7*scale), material=materials["grass"], tags=("HV_Landscape","HV_Regional"))

    destinations = (
        ("HV_HighSchool", "HILL VALLEY HIGH SCHOOL", (-11200, 7600), (4200, 3000, 1500), materials["brick_red"], "HV_District_School"),
        ("HV_ValeGarage", "VALE SCIENTIFIC GARAGE", (10800, -8200), (3200, 2800, 1050), materials["brick_dark"], "HV_District_Industrial"),
        ("HV_ServiceStation", "TWIN PINES SERVICE", (9800, 7800), (3000, 2300, 850), materials["plaster"], "HV_District_Commercial"),
        ("HV_HillValleyDiner", "HILL VALLEY DINER", (-9400, -7600), (3200, 2200, 900), materials["brick"], "HV_District_Commercial"),
        ("HV_Archive", "HILL VALLEY ARCHIVES", (8200, 11600), (3000, 2400, 1100), materials["stone"], "HV_District_Civic"),
    )
    for name, sign, (x,y), size, material, district in destinations:
        spawn_block(name, (x,y,size[2]/2), size, material, tags=("HV_Building", district, "HV_Destination"))
        spawn_block(name+"_Roof", (x,y,size[2]+110), (size[0]+180,size[1]+180,220), materials["roof"], tags=("HV_Building",district))
        sign_y = y - size[1]/2 - 30
        spawn_text_sign(name+"_Sign", sign, (x,sign_y,size[2]*0.72), rotation=(0,0,90), tags=(district,"HV_DestinationSign"), scale=3.0)

        # Mission-critical buildings receive a collision-safe readable lobby.
        interior_y = y - size[1] * 0.2
        spawn_block(name+"_InteriorFloor", (x, interior_y, 35),
                    (size[0]*0.62, size[1]*0.45, 35), materials["concrete"],
                    tags=("HV_Interior", "HV_MissionAccess", district))
        spawn_block(name+"_InteriorBackWall", (x, interior_y+size[1]*0.225, 360),
                    (size[0]*0.62, 35, 650), material,
                    tags=("HV_InteriorCollision", "HV_MissionAccess", district))

    # Residential blocks with varied houses, porches, garages, yards, and unique street signs.
    for side in (-1, 1):
        for index in range(8):
            x = side * (7000 + (index % 2) * 1700)
            y = -2500 + index * 1900
            house = f"HV_Residence_{'W' if side < 0 else 'E'}_{index:02d}"
            body_mat = materials["plaster"] if index % 2 == 0 else materials["brick"]
            spawn_block(house, (x,y,420), (2100,1450,840), body_mat, tags=("HV_Building","HV_District_Residential"))
            spawn_block(house+"_Roof", (x,y,930), (2300,1650,260), materials["roof"], tags=("HV_Building","HV_District_Residential"))
            spawn_block(house+"_Porch", (x-side*1170,y,140), (320,900,180), materials["concrete"], tags=("HV_Prop","HV_District_Residential"))
            spawn_block(house+"_Garage", (x,y+1050,280), (1450,650,560), body_mat, tags=("HV_Building","HV_District_Residential"))

    street_signs = (("MAPLE STREET",-7200,-5200),("LYON ESTATES",7200,-5200),("RIVER ROAD",0,-15000),("SCHOOL AVENUE",-10500,4800))
    for index,(text,x,y) in enumerate(street_signs):
        spawn_block(f"HV_StreetSignPost_{index}",(x,y,190),(16,16,380),materials["dark"],tags=("HV_Prop","HV_Signage"))
        spawn_text_sign(f"HV_StreetSign_{index}",text,(x,y,410),rotation=(0,0,90),tags=("HV_StreetSign",),scale=1.8)

    # Industrial/service edge and rural farm structures.
    for index in range(5):
        x = 9300 + (index%2)*3300; y = -13500 - (index//2)*2800
        spawn_block(f"HV_Industrial_{index}",(x,y,600),(2800,2100,1200),materials["brick_dark"],tags=("HV_Building","HV_District_Industrial"))
    spawn_block("HV_TwinPinesBarn",(-10500,-17800,700),(4200,2800,1400),materials["brick_red"],tags=("HV_Building","HV_District_Rural","HV_Destination"))
    spawn_text_sign("HV_TwinPinesBarn_Sign","TWIN PINES RANCH",(-10500,-19220,900),rotation=(0,0,90),tags=("HV_District_Rural","HV_DestinationSign"),scale=2.6)

    # Authoritative route/reset markers consumed by later population and mission systems.
    navigation_points = (
        (0,-19000),(0,-15000),(0,-10500),(0,-6000),(0,-1500),(0,2500),
        (0,8000),(0,12000),(-11500,0),(11500,0),(-11200,7600),(9800,7800))
    for index, (x, y) in enumerate(navigation_points):
        spawn_marker(f"HV_Navigation_{index:02d}", (x,y,120), ("HV_Navigation", "HV_PedestrianNode"))

    for index, (x, y) in enumerate(((0,-18000),(0,-9000),(0,0),(0,9000),(-11000,0),(11000,0))):
        spawn_marker(f"HV_TrafficRoute_{index:02d}", (x,y,90), ("HV_TrafficRoute", "HV_ParkingNode"))

    for index, (x, y) in enumerate(((0,-20500),(0,13500),(-14500,0),(14500,0))):
        spawn_marker(f"HV_ResetVolume_{index:02d}", (x,y,100), ("HV_ResetVolume", "HV_EmergencyRecovery"))

    # Regional vegetation and street furniture.
    for index in range(44):
        side = -1 if index % 2 == 0 else 1
        x = side * (4500 + (index % 5) * 2500)
        y = -18500 + (index // 2) * 1800
        spawn_tree(f"HV_RegionalTree_{index}", (x, y, 0), materials, 0.75 + (index % 4) * 0.12)

    log("complete Hill Valley regional districts generated")


def main():
    global materials_global
    if not unreal.EditorLoadingAndSavingUtils.load_map(LEVEL):
        raise RuntimeError(f"Unable to load level: {LEVEL}")
    delete_previous_generated()

    materials_global = {
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
    }

    build_roads_and_square(materials_global)
    build_courthouse(materials_global)
    build_storefronts(materials_global)
    build_streetscape(materials_global)
    build_complete_region(materials_global)
    set_default_era_data_layer()
    if not level_subsystem.save_current_level():
        raise RuntimeError("Unable to save the current Hill Valley level")
    unreal.EditorAssetLibrary.save_directory(MATERIAL_PATH, True, True)
    unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
    log("courthouse square generation complete")


main()
