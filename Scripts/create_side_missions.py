"""Create optional side mission data assets for the Hill Valley campaign."""
import unreal

DEST = "/Game/Data/Missions/Side"
TOOLS = unreal.AssetToolsHelpers.get_asset_tools()

SIDE_MISSIONS = [
    {
        "stable_id": "SideA.FacesOfHillValley",
        "asset_suffix": "SideA_FacesOfHillValley",
        "objectives": [
            ("MeetJune", "Meet June at the courthouse archive", "SideA_Briefing", "SideA_Start", 0.0),
            ("IdentifyResidents", "Match four residents to altered photographs", "SideA_Identified", "SideA_Evidence", 0.0),
            ("ResolveConnection", "Choose whether to restore or preserve a family connection", "SideA_Resolved", "SideA_Complete", -1.0),
        ],
    },
    {
        "stable_id": "SideB.SpecialDelivery",
        "asset_suffix": "SideB_SpecialDelivery",
        "objectives": [
            ("AcceptDelivery", "Accept the timed delivery from the service station", "SideB_Accepted", "SideB_Start", 0.0),
            ("Complete1985Route", "Deliver the package across 1985 Hill Valley", "SideB_1985Complete", "SideB_1985", 0.0),
            ("Complete1955Route", "Complete the alternate 1955 rural handoff", "SideB_1955Complete", "SideB_Complete", 0.0),
        ],
    },
]

unreal.EditorAssetLibrary.make_directory(DEST)

for spec in SIDE_MISSIONS:
    name = "DA_Mission_" + spec["asset_suffix"]
    path = f"{DEST}/{name}"
    asset = unreal.load_asset(path)
    if not asset:
        factory = unreal.DataAssetFactory()
        factory.set_editor_property("data_asset_class", unreal.MissionDataAsset)
        asset = TOOLS.create_asset(name, DEST, unreal.MissionDataAsset, factory)
    asset.set_editor_property("mission_id", spec["stable_id"])
    asset.set_editor_property("display_name", spec["stable_id"].replace(".", " — "))
    objectives = []
    for objective_id, description, event_id, checkpoint_id, paradox_delta in spec["objectives"]:
        objective = unreal.MissionObjectiveDefinition()
        objective.set_editor_property("objective_id", objective_id)
        objective.set_editor_property("description", description)
        objective.set_editor_property("completion_event", event_id)
        objective.set_editor_property("checkpoint_id", checkpoint_id)
        objective.set_editor_property("paradox_delta", paradox_delta)
        objectives.append(objective)
    asset.set_editor_property("objectives", objectives)
    unreal.EditorAssetLibrary.save_asset(path, only_if_is_dirty=False)
    unreal.log(f"SIDE_MISSION_SAVED {path}")

unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
unreal.log("SIDE_MISSIONS_SUCCESS")
