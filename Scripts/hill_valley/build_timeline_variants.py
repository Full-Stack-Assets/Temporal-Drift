"""Fact-gated present-timeline variant signage (past changes affecting 1985)."""
import os
import sys

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

import hill_valley_era_dressing_common as era

GENERATED = unreal.Name("HV_Variant_Generated")
VARIANT_TAG = unreal.Name("HV_TimelineVariant")


def show_if_tag(fact_id):
    return unreal.Name(f"HV_ShowIf_{fact_id}")


def hide_if_tag(fact_id):
    return unreal.Name(f"HV_HideIf_{fact_id}")


def spawn_variant_sign(actors, name, text, location, fact_id, show_when_true, color=(245, 210, 100, 255), scale=2.0):
    gate_tag = show_if_tag(fact_id) if show_when_true else hide_if_tag(fact_id)
    actor = actors.spawn_actor_from_class(
        unreal.TextRenderActor, era.world_vector(location), unreal.Rotator(0, 0, 90)
    )
    actor.set_actor_label(name)
    actor.tags = [GENERATED, VARIANT_TAG, gate_tag, unreal.Name("HV_ConsequenceSign")]
    actor.is_spatially_loaded = False
    comp = actor.get_component_by_class(unreal.TextRenderComponent)
    comp.set_editor_property("text", unreal.Text(text))
    comp.set_editor_property("world_size", 30)
    comp.set_editor_property("text_render_color", unreal.Color(*color))
    comp.set_editor_property("horizontal_alignment", unreal.HorizTextAligment.EHTA_CENTER)
    actor.set_actor_scale3d(unreal.Vector(scale, scale, scale))
    return actor


def main():
    era.load_map()
    actors, levels, _layers = era.get_subsystems()
    for actor in list(actors.get_all_level_actors()):
        if GENERATED in actor.tags:
            actors.destroy_actor(actor)

    variants = (
        ("HVVariant_Plaque_Original", "A. HISTORY OF HILL VALLEY", (200, 3600, 520), "C_PlaqueChanged", False),
        ("HVVariant_Plaque_Changed", "A. HISTORY OF HILL VALLEY — REVISED", (200, 3600, 520), "C_PlaqueChanged", True, (255, 120, 80, 255)),
        ("HVVariant_Diner_Original", "LOU'S CAFE", (-9400, -8900, 520), "C_DinerRenamed", False),
        ("HVVariant_Diner_Changed", "ELENA'S DINER", (-9400, -8900, 520), "C_DinerRenamed", True, (255, 140, 90, 255)),
        ("HVVariant_School_Original", "DEDICATED TO WILLIAM McFLY", (-11200, 8900, 620), "C_SchoolDedication", False),
        ("HVVariant_School_Changed", "DEDICATED TO GOLDIE WILSON", (-11200, 8900, 620), "C_SchoolDedication", True, (255, 130, 70, 255)),
        ("HVVariant_Portrait_Original", "FOUNDER PORTRAIT", (400, 3600, 620), "C_FounderMissing", False),
        ("HVVariant_Portrait_Changed", "EMPTY FRAME", (400, 3600, 620), "C_FounderMissing", True, (200, 200, 200, 255)),
        ("HVVariant_Street_Original", "COURTHOUSE SQUARE", (0, -6800, 420), "1985.StreetRenamed", False),
        ("HVVariant_Street_Changed", "TANNEN BOULEVARD", (0, -6800, 420), "1985.StreetRenamed", True, (255, 90, 90, 255)),
        ("HVVariant_Mall_Original", "TOWN GREEN PRESERVED", (8200, -6200, 420), "1955.MallSiteOwned", True),
        ("HVVariant_Mall_Changed", "TANNEN MALL CONSTRUCTION", (8200, -6200, 420), "1955.MallSiteOwned", False, (255, 100, 100, 255)),
        ("HVVariant_2045_Warning_Off", "HERITAGE DISTRICT OPEN", (-9200, 10200, 900), "2045.TierThreeTannenOwned", False),
        ("HVVariant_2045_Warning_On", "TIER III LOCKDOWN", (-9200, 10200, 900), "2045.TierThreeTannenOwned", True, (255, 60, 120, 255)),
        ("HVVariant_Alternate_Off", "HILL VALLEY 1985", (0, -8200, 520), "A_TimelineCorrupted", False),
        ("HVVariant_Alternate_On", "TIMELINE BRANCH — 1985-A", (0, -8200, 520), "A_TimelineCorrupted", True, (255, 70, 70, 255)),
    )

    for spec in variants:
        name, text, location, fact_id, show_when_true = spec[:5]
        color = spec[5] if len(spec) > 5 else (245, 210, 100, 255)
        spawn_variant_sign(actors, name, text, location, fact_id, show_when_true, color=color)

    if not levels.save_current_level():
        raise RuntimeError("Could not save timeline variant signage")
    unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
    unreal.log("TIMELINE_VARIANTS_SUCCESS")


if __name__ == "__main__":
    main()
