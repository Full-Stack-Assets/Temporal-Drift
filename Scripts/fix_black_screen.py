"""Fix black-screen: brighten sun, link it to SkyAtmosphere, and clamp auto-exposure."""
import unreal

LEVEL_PATH = "/Game/Maps/LVL_TimeTravelTest"

les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)

if not les.load_level(LEVEL_PATH):
    raise RuntimeError("Failed to load level")

for actor in eas.get_all_level_actors():
    if isinstance(actor, unreal.DirectionalLight):
        actor.set_actor_rotation(
            unreal.Rotator(roll=0.0, pitch=-45.0, yaw=30.0), False
        )
        c = actor.light_component
        c.set_editor_property("mobility", unreal.ComponentMobility.MOVABLE)
        c.set_editor_property("intensity", 10.0)
        c.set_editor_property("atmosphere_sun_light", True)
        unreal.log(f"Sun: intensity=50000 lux, atmosphere sun light ON")
    elif isinstance(actor, unreal.SkyLight):
        c = actor.light_component
        c.set_editor_property("mobility", unreal.ComponentMobility.MOVABLE)
        c.set_editor_property("real_time_capture", True)
        c.set_editor_property("intensity", 1.0)
        unreal.log("SkyLight: movable, real-time capture, intensity 1.0")

# Unbound PostProcessVolume clamping standard-range auto-exposure so the scene
# cannot sit at black. Reuse the existing volume when this script is rerun.
global_ppvs = [
    actor
    for actor in eas.get_all_level_actors()
    if isinstance(actor, unreal.PostProcessVolume)
    and actor.get_actor_label() == "GlobalPostProcess"
]
ppv = global_ppvs[0] if global_ppvs else None
for duplicate in global_ppvs[1:]:
    eas.destroy_actor(duplicate)
    unreal.log(f"Removed duplicate post-process volume: {duplicate.get_name()}")
if ppv is None:
    ppv = eas.spawn_actor_from_class(
        unreal.PostProcessVolume, unreal.Vector(0, 0, 0), unreal.Rotator(0, 0, 0)
    )
    ppv.set_actor_label("GlobalPostProcess")
ppv.set_editor_property("unbound", True)
settings = ppv.get_editor_property("settings")
settings.set_editor_property("override_auto_exposure_min_brightness", False)
settings.set_editor_property("override_auto_exposure_max_brightness", False)
ppv.set_editor_property("settings", settings)
unreal.log("PostProcessVolume: local exposure overrides disabled")

les.save_current_level()
unreal.log("Level saved - black screen fix applied")
