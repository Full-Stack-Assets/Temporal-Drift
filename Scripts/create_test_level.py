"""Creates LVL_TimeTravelTest: large floor, light, sky, PlayerStart."""
import unreal

LEVEL_PATH = "/Game/Maps/LVL_TimeTravelTest"

les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)

# 1. New empty level
if not les.new_level(LEVEL_PATH):
    raise RuntimeError("Failed to create level")

# 2. Floor: scaled cube with enough room to reach the 40 MPH jump threshold
floor_mesh = unreal.load_object(None, "/Engine/BasicShapes/Cube.Cube")
floor = eas.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(0, 0, -50), unreal.Rotator(0, 0, 0))
floor.set_actor_label("Floor")
floor_comp = floor.static_mesh_component
floor_comp.set_editor_property("static_mesh", floor_mesh)
floor.set_actor_scale3d(unreal.Vector(500.0, 500.0, 1.0))
floor_comp.set_editor_property("mobility", unreal.ComponentMobility.STATIC)

# 3. Lighting
sun = eas.spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(0, 0, 1000), unreal.Rotator(-45, 30, 0))
sun.set_actor_label("Sun")
sun.light_component.set_editor_property("intensity", 10.0)

sky_light = eas.spawn_actor_from_class(unreal.SkyLight, unreal.Vector(0, 0, 1000), unreal.Rotator(0, 0, 0))
sky_light.set_actor_label("SkyLight")
sky_light.light_component.set_editor_property("real_time_capture", True)

sky_atmo = eas.spawn_actor_from_class(unreal.SkyAtmosphere, unreal.Vector(0, 0, 0), unreal.Rotator(0, 0, 0))
sky_atmo.set_actor_label("SkyAtmosphere")

fog = eas.spawn_actor_from_class(unreal.ExponentialHeightFog, unreal.Vector(0, 0, 0), unreal.Rotator(0, 0, 0))
fog.set_actor_label("HeightFog")

# 4. PlayerStart
player_start = eas.spawn_actor_from_class(unreal.PlayerStart, unreal.Vector(0, 0, 100), unreal.Rotator(0, 0, 0))
player_start.set_actor_label("PlayerStart")

# 5. Save
les.save_current_level()
unreal.log("LVL_TimeTravelTest created and saved")
