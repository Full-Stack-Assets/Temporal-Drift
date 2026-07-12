"""Create the clean Temporal Drift test level and preserve the legacy map."""
import unreal

LEGACY_SOURCE = "/Game/Maps/LVL_TimeTravelTest"
LEGACY_BACKUP = "/Game/Maps/LVL_TimeTravelTest_Legacy"
LEVEL_PATH = "/Game/Levels/LVL_TimeTravelTest"

for folder in (
    "/Game/Blueprints/Vehicles",
    "/Game/Blueprints/UI",
    "/Game/Blueprints/AI",
    "/Game/Levels",
    "/Game/Materials/PostProcess",
    "/Game/Niagara",
    "/Game/Data/EraDataAssets",
    "/Game/Data/DataLayers",
    "/Game/Audio",
):
    unreal.EditorAssetLibrary.make_directory(folder)

if unreal.EditorAssetLibrary.does_asset_exist(LEGACY_SOURCE) and not unreal.EditorAssetLibrary.does_asset_exist(LEGACY_BACKUP):
    if not unreal.EditorAssetLibrary.duplicate_asset(LEGACY_SOURCE, LEGACY_BACKUP):
        raise RuntimeError("Failed to back up the legacy test level")
    unreal.log(f"CLEAN_LEVEL backed up {LEGACY_SOURCE} to {LEGACY_BACKUP}")

les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
if not les.new_level(LEVEL_PATH):
    raise RuntimeError(f"Failed to create {LEVEL_PATH}")

cube = unreal.load_object(None, "/Engine/BasicShapes/Cube.Cube")

ground = eas.spawn_actor_from_class(
    unreal.StaticMeshActor, unreal.Vector(0, 0, -50), unreal.Rotator()
)
ground.set_actor_label("Ground")
ground.static_mesh_component.set_editor_property("static_mesh", cube)
ground.set_actor_scale3d(unreal.Vector(250.0, 250.0, 1.0))
ground.static_mesh_component.set_editor_property("mobility", unreal.ComponentMobility.STATIC)
ground.set_folder_path("Environment/Ground")

for index, location in enumerate(
    (
        unreal.Vector(2500, 1800, 250),
        unreal.Vector(2500, -1800, 400),
        unreal.Vector(5000, 1800, 600),
        unreal.Vector(5000, -1800, 300),
    ),
    start=1,
):
    prop = eas.spawn_actor_from_class(unreal.StaticMeshActor, location, unreal.Rotator())
    prop.set_actor_label(f"EraTestBuilding_{index:02d}")
    prop.static_mesh_component.set_editor_property("static_mesh", cube)
    prop.set_actor_scale3d(unreal.Vector(8.0, 8.0, 5.0 + index * 2.0))
    prop.set_folder_path("Environment/EraProps")

sun = eas.spawn_actor_from_class(
    unreal.DirectionalLight,
    unreal.Vector(0, 0, 1000),
    unreal.Rotator(roll=0.0, pitch=-45.0, yaw=30.0),
)
sun.set_actor_label("Sun")
sun.set_folder_path("Lighting")
sun.light_component.set_editor_property("mobility", unreal.ComponentMobility.MOVABLE)
sun.light_component.set_editor_property("intensity", 10.0)
sun.light_component.set_editor_property("atmosphere_sun_light", True)

skylight = eas.spawn_actor_from_class(unreal.SkyLight, unreal.Vector(0, 0, 1000), unreal.Rotator())
skylight.set_actor_label("SkyLight")
skylight.set_folder_path("Lighting")
skylight.light_component.set_editor_property("mobility", unreal.ComponentMobility.MOVABLE)
skylight.light_component.set_editor_property("real_time_capture", True)

atmosphere = eas.spawn_actor_from_class(unreal.SkyAtmosphere, unreal.Vector(), unreal.Rotator())
atmosphere.set_actor_label("SkyAtmosphere")
atmosphere.set_folder_path("Lighting")

fog = eas.spawn_actor_from_class(unreal.ExponentialHeightFog, unreal.Vector(), unreal.Rotator())
fog.set_actor_label("HeightFog")
fog.set_folder_path("Lighting")

ppv = eas.spawn_actor_from_class(unreal.PostProcessVolume, unreal.Vector(), unreal.Rotator())
ppv.set_actor_label("GlobalPostProcess")
ppv.set_folder_path("Lighting")
ppv.set_editor_property("unbound", True)

player_start = eas.spawn_actor_from_class(
    unreal.PlayerStart, unreal.Vector(-800, 0, 120), unreal.Rotator()
)
player_start.set_actor_label("PlayerStart")
player_start.set_folder_path("Gameplay")

vehicle_class = unreal.EditorAssetLibrary.load_blueprint_class("/Game/Blueprints/BP_DeLorean")
if not vehicle_class:
    raise RuntimeError("BP_DeLorean is missing")
vehicle = eas.spawn_actor_from_class(vehicle_class, unreal.Vector(0, 0, 150), unreal.Rotator())
vehicle.set_actor_label("BP_DeLoreanVehicle")
vehicle.set_folder_path("Gameplay")
vehicle.set_editor_property("auto_possess_player", unreal.AutoReceiveInput.PLAYER0)

les.save_current_level()
unreal.log(f"CLEAN_LEVEL created and saved {LEVEL_PATH}")
unreal.log("CLEAN_LEVEL vehicle uses BP_DeLorean and Auto Possess Player 0")
unreal.log("CLEAN_LEVEL DataLayer classes: " + ", ".join(name for name in dir(unreal) if "DataLayer" in name))
