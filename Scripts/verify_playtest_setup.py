"""Pre-playtest sanity check: verifies BP_DeLorean and controller assets are wired."""
import unreal

ok = True
lines = []

def check(label, value):
    global ok
    status = "OK" if value else "MISSING"
    if not value:
        ok = False
    lines.append(f"[CHECK] {label}: {status}")

# Vehicle
bp_gc = unreal.load_object(None, "/Game/Blueprints/BP_DeLorean.BP_DeLorean_C")
cdo = unreal.get_default_object(bp_gc)
check("BP_DeLorean class", bp_gc)
check("VehicleMappingContext", cdo.get_editor_property("VehicleMappingContext"))
check("ThrottleAction", cdo.get_editor_property("ThrottleAction"))
check("SteeringAction", cdo.get_editor_property("SteeringAction"))
check("BrakeAction", cdo.get_editor_property("BrakeAction"))
mesh = cdo.get_editor_property("mesh")
check("SkeletalMesh", mesh.get_editor_property("skeletal_mesh_asset"))
check("AnimClass", mesh.get_editor_property("anim_class"))

# Controller
pc_gc = unreal.load_object(None, "/Game/Blueprints/BP_BTTF_PlayerController.BP_BTTF_PlayerController_C")
pc_cdo = unreal.get_default_object(pc_gc)
check("BP_BTTF_PlayerController class", pc_gc)
check("DefaultMappingContext", pc_cdo.get_editor_property("DefaultMappingContext"))
check("TimeCircuitsToggleAction", pc_cdo.get_editor_property("TimeCircuitsToggleAction"))
check("TimeJumpAction", pc_cdo.get_editor_property("TimeJumpAction"))
check("HoverModeAction", pc_cdo.get_editor_property("HoverModeAction"))

lines.append("[CHECK] RESULT: " + ("ALL GOOD" if ok else "PROBLEMS FOUND"))
with open(r"C:\Users\Shadow\Downloads\BTTF_TemporalDrift_v3\Saved\verify_results.txt", "w") as f:
    f.write("\n".join(lines))
