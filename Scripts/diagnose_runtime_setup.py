"""Log the DeLorean camera and level lighting defaults used by PIE."""
import unreal

bp_class = unreal.EditorAssetLibrary.load_blueprint_class("/Game/Blueprints/BP_DeLorean")
if not bp_class:
    raise RuntimeError("Could not load BP_DeLorean generated class")

cdo = unreal.get_default_object(bp_class)
unreal.log(f"DIAG pawn_class={bp_class.get_name()} cdo={cdo.get_name()}")
for camera in cdo.get_components_by_class(unreal.CameraComponent):
    settings = camera.get_editor_property("post_process_settings")
    unreal.log(
        "DIAG camera="
        f"{camera.get_name()} active={camera.get_editor_property('auto_activate')} "
        f"blend={camera.get_editor_property('post_process_blend_weight')} "
        f"min_override={settings.get_editor_property('override_auto_exposure_min_brightness')} "
        f"max_override={settings.get_editor_property('override_auto_exposure_max_brightness')} "
        f"min={settings.get_editor_property('auto_exposure_min_brightness')} "
        f"max={settings.get_editor_property('auto_exposure_max_brightness')}"
    )

les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
les.load_level("/Game/Maps/LVL_TimeTravelTest")
for actor in eas.get_all_level_actors():
    if isinstance(actor, unreal.DirectionalLight):
        c = actor.light_component
        unreal.log(
            f"DIAG sun={actor.get_actor_label()} rotation={actor.get_actor_rotation()} "
            f"intensity={c.get_editor_property('intensity')} visible={not actor.is_hidden_ed()}"
        )
    elif isinstance(actor, unreal.SkyLight):
        c = actor.light_component
        unreal.log(
            f"DIAG skylight={actor.get_actor_label()} intensity={c.get_editor_property('intensity')} "
            f"realtime={c.get_editor_property('real_time_capture')}"
        )
    elif isinstance(actor, unreal.PostProcessVolume):
        s = actor.get_editor_property("settings")
        unreal.log(
            f"DIAG ppv={actor.get_actor_label()} unbound={actor.get_editor_property('unbound')} "
            f"min_override={s.get_editor_property('override_auto_exposure_min_brightness')} "
            f"max_override={s.get_editor_property('override_auto_exposure_max_brightness')}"
        )
