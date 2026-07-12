"""Fix lighting warnings in LVL_TimeTravelTest: make lights fully dynamic (Lumen)
so no static lighting build is required, eliminating the 'lighting needs to be
rebuilt' and 'no importance volume' warnings."""
import unreal

LEVEL_PATH = "/Game/Maps/LVL_TimeTravelTest"

les = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
eas = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)

if not les.load_level(LEVEL_PATH):
    raise RuntimeError("Failed to load level")

for actor in eas.get_all_level_actors():
    if isinstance(actor, unreal.DirectionalLight):
        actor.light_component.set_editor_property("mobility", unreal.ComponentMobility.MOVABLE)
        unreal.log(f"Set {actor.get_actor_label()} to Movable")
    elif isinstance(actor, unreal.SkyLight):
        actor.light_component.set_editor_property("mobility", unreal.ComponentMobility.MOVABLE)
        actor.light_component.set_editor_property("real_time_capture", True)
        unreal.log(f"Set {actor.get_actor_label()} to Movable + real-time capture")

# Force-disable static lighting in the world settings for this map so nothing asks for a bake.
world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
ws = world.get_world_settings()
ws.set_editor_property("force_no_precomputed_lighting", True)
unreal.log("World settings: ForceNoPrecomputedLighting = True")

les.save_current_level()
unreal.log("Level saved - lighting is now fully dynamic")
