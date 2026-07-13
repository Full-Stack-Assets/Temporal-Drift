"""Apply calibrated daylight lighting and post-processing to LVL_TimeTravelTest."""
import unreal

LEVEL_PATH = "/Game/Maps/LVL_TimeTravelTest"

les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)

if not les.load_level(LEVEL_PATH):
    raise RuntimeError("Failed to load level")

for actor in eas.get_all_level_actors():
    if isinstance(actor, unreal.DirectionalLight):
        light = actor.light_component
        light.set_editor_property("mobility", unreal.ComponentMobility.MOVABLE)
        light.set_editor_property("intensity", 6.5)
        light.set_editor_property("light_color", unreal.LinearColor(1.0, 0.96, 0.88, 1.0))
        actor.set_actor_rotation(unreal.Rotator(-42.0, 135.0, 0.0), False)
        unreal.log(f"Configured sun: {actor.get_actor_label()}")
    elif isinstance(actor, unreal.SkyLight):
        light = actor.light_component
        light.set_editor_property("mobility", unreal.ComponentMobility.MOVABLE)
        light.set_editor_property("real_time_capture", True)
        light.set_editor_property("intensity", 1.1)
        unreal.log(f"Configured skylight: {actor.get_actor_label()}")
    elif isinstance(actor, unreal.ExponentialHeightFog):
        actor.set_editor_property("fog_density", 0.002)
        actor.set_editor_property("fog_inscattering_color", unreal.LinearColor(0.72, 0.78, 0.92, 1.0))
    elif isinstance(actor, unreal.PostProcessVolume):
        settings = actor.get_editor_property("settings")
        settings.set_editor_property("auto_exposure_method", unreal.AutoExposureMethod.AEM_HISTOGRAM)
        settings.set_editor_property("auto_exposure_bias", 0.35)
        settings.set_editor_property("auto_exposure_min_brightness", 0.4)
        settings.set_editor_property("auto_exposure_max_brightness", 2.0)
        settings.set_editor_property("bloom_intensity", 0.25)
        settings.set_editor_property("vignette_intensity", 0.18)
        settings.set_editor_property("color_saturation", unreal.Vector4(1.02, 1.02, 1.02, 1.0))
        settings.set_editor_property("color_contrast", unreal.Vector4(1.03, 1.03, 1.03, 1.0))
        actor.set_editor_property("settings", settings)
        actor.set_editor_property("unbound", True)
        unreal.log("Configured post-process volume")

world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
ws = world.get_world_settings()
ws.set_editor_property("force_no_precomputed_lighting", True)
unreal.log("World settings: ForceNoPrecomputedLighting = True")

les.save_current_level()
unreal.log("PHOTOREAL_LIGHTING_SUCCESS")
