import unreal


LEVEL = "/Game/Levels/LVL_TimeTravelTest"
REQUIRED_TAGS = {
    "HV_Courthouse": 1,
    "HV_Clocktower": 1,
    "HV_Road": 5,
    "HV_Sidewalk": 8,
    "HV_Crossing": 4,
    "HV_Parking": 3,
    "HV_Storefront": 12,
    "HV_Landscape": 8,
    "HV_Prop": 20,
    "HV_Storefront_DressingHook": 12,
}

REQUIRED_ASSETS = [
    "/Game/Materials/HillValley/M_HV_Asphalt",
    "/Game/Materials/HillValley/M_HV_Concrete",
    "/Game/Materials/HillValley/M_HV_Grass",
    "/Game/Materials/HillValley/M_HV_Stone_Light",
    "/Game/Materials/HillValley/M_HV_Brick_Red",
    "/Game/Data/DataLayers/DL_1885",
    "/Game/Data/DataLayers/DL_1955",
    "/Game/Data/DataLayers/DL_1985_Present",
    "/Game/Data/DataLayers/DL_1985_Alternate",
    "/Game/Data/DataLayers/DL_2015",
    "/Game/Data/DataLayers/DL_2045",
]


if not unreal.EditorLoadingAndSavingUtils.load_map(LEVEL):
    raise RuntimeError(f"Unable to load level: {LEVEL}")

actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()
failures = []
for tag, minimum in REQUIRED_TAGS.items():
    tag_name = unreal.Name(tag)
    count = sum(1 for actor in actors if tag_name in actor.get_editor_property("tags"))
    if count < minimum:
        failures.append(f"{tag}: expected at least {minimum}, found {count}")
    unreal.log(f"HILL_VALLEY_COUNT {tag}={count}")

for asset_path in REQUIRED_ASSETS:
    if not unreal.EditorAssetLibrary.does_asset_exist(asset_path):
        failures.append(f"missing asset: {asset_path}")

layer_subsystem = unreal.get_editor_subsystem(unreal.DataLayerEditorSubsystem)
if layer_subsystem is not None and hasattr(layer_subsystem, "is_data_layer_visible"):
    layer_assets = {
        "DL_1885": unreal.EditorAssetLibrary.load_asset("/Game/Data/DataLayers/DL_1885.DL_1885"),
        "DL_1955": unreal.EditorAssetLibrary.load_asset("/Game/Data/DataLayers/DL_1955.DL_1955"),
        "DL_1985_Present": unreal.EditorAssetLibrary.load_asset("/Game/Data/DataLayers/DL_1985_Present.DL_1985_Present"),
        "DL_1985_Alternate": unreal.EditorAssetLibrary.load_asset("/Game/Data/DataLayers/DL_1985_Alternate.DL_1985_Alternate"),
        "DL_2015": unreal.EditorAssetLibrary.load_asset("/Game/Data/DataLayers/DL_2015.DL_2015"),
        "DL_2045": unreal.EditorAssetLibrary.load_asset("/Game/Data/DataLayers/DL_2045.DL_2045"),
    }
    for name, layer_asset in layer_assets.items():
        if layer_asset is None:
            continue
        visible = layer_subsystem.is_data_layer_visible(layer_asset)
        unreal.log(f"HILL_VALLEY_DATALAYER_VIS {name}={visible}")
        if name == "DL_1985_Present" and not visible:
            failures.append("DL_1985_Present must be visible by default")
        if name != "DL_1985_Present" and visible:
            failures.append(f"{name} must be disabled by default for first pass")

generated = [
    actor
    for actor in actors
    if unreal.Name("HV_Generated") in actor.get_editor_property("tags")
]
spatial_generated = [
    actor.get_actor_label()
    for actor in generated
    if actor.get_editor_property("is_spatially_loaded")
]
if spatial_generated:
    failures.append(
        "generated neutral actors must be always loaded: " + ", ".join(spatial_generated[:10])
    )

player_starts = [actor for actor in actors if actor.get_class().get_name() == "PlayerStart"]
if not player_starts:
    failures.append("PlayerStart is missing")
else:
    start = player_starts[0]
    location = start.get_actor_location()
    if abs(location.y) > 500.0 or abs(location.x) > 1000.0:
        failures.append(
            f"PlayerStart must remain on the shifted south approach; location={location}"
        )

if failures:
    raise RuntimeError("Hill Valley validation failed: " + "; ".join(failures))

unreal.log("HILL_VALLEY_VALIDATION_SUCCESS")
