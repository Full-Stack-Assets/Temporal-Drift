"""Validate all six era dressing layers exist with minimum generated content."""
import unreal

LEVEL = "/Game/Levels/LVL_TimeTravelTest"

ERA_REQUIREMENTS = {
    "HV_Era1955": 20,
    "HV_Era1885": 8,
    "HV_Era1985A": 6,
    "HV_Era2015": 6,
    "HV_Era2045": 6,
}

VARIANT_MINIMUM = 8

if not unreal.EditorLoadingAndSavingUtils.load_map(LEVEL):
    raise RuntimeError(f"Unable to load level: {LEVEL}")

actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()
failures = []

for tag, minimum in ERA_REQUIREMENTS.items():
    tag_name = unreal.Name(tag)
    count = sum(1 for actor in actors if tag_name in actor.get_editor_property("tags"))
    unreal.log(f"ERA_DRESSING_COUNT {tag}={count}")
    if count < minimum:
        failures.append(f"{tag}: expected at least {minimum}, found {count}")

variant_count = sum(
    1 for actor in actors
    if unreal.Name("HV_TimelineVariant") in actor.get_editor_property("tags")
)
unreal.log(f"TIMELINE_VARIANT_COUNT={variant_count}")
if variant_count < VARIANT_MINIMUM:
    failures.append(f"HV_TimelineVariant: expected at least {VARIANT_MINIMUM}, found {variant_count}")

for layer_path in (
    "/Game/Data/DataLayers/DL_1885",
    "/Game/Data/DataLayers/DL_1955",
    "/Game/Data/DataLayers/DL_1985_Alternate",
    "/Game/Data/DataLayers/DL_2015",
    "/Game/Data/DataLayers/DL_2045",
):
    if not unreal.EditorAssetLibrary.does_asset_exist(layer_path):
        failures.append(f"missing data layer asset: {layer_path}")

if failures:
    raise RuntimeError("Era dressing validation failed: " + "; ".join(failures))

unreal.log("ERA_DRESSING_VALIDATION_SUCCESS")
