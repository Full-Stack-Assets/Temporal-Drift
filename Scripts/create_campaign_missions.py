import unreal

DEST = "/Game/Data/Missions/Campaign"

MISSIONS = {
    "M01_FirstTestRun": [
        ("MeetVale", "Meet Dr. Vale at the garage", "TalkedToVale", "M01_Start", 0.0),
        ("CollectParts", "Collect the oscillator, cable, and coolant cell", "CalibrationPartsCollected", "M01_PartsCollected", 0.0),
        ("InstallParts", "Install the calibration parts", "VehicleReady", "M01_VehicleReady", 0.0),
        ("CompleteCourse", "Complete the courthouse driving course", "TestCourseComplete", "M01_CourseStart", 0.0),
        ("ReturnToVale", "Return to Vale Garage", "M01Returned", "M01_Complete", 0.0),
    ],
    "M02_ClocktowerCalibration": [
        ("Briefing", "Meet Vale and June at the courthouse", "TalkedToValeAndJune", "M02_Briefing", 0.0),
        ("InstallSensorVehicle", "Install the clocktower sensor package", "SensorInstalledVehicle", "M02_SensorInstalledVehicle", 0.0),
        ("Jump1955", "Reach 88 MPH and travel to 1955", "Arrived1955", "M02_Arrived1955", 0.0),
        ("ReachClocktower", "Reach courthouse square on foot", "ClocktowerReached", "M02_ClocktowerReached", 0.0),
        ("Calibrate", "Install and calibrate the clocktower sensor", "ClocktowerCalibrated", "M02_Calibrated", -3.0),
        ("Return1985", "Return safely to 1985", "Returned1985", "M02_Returned1985", 0.0),
    ],
    "M03_TownOutOfTime": [
        ("MeetJune", "Investigate changed courthouse records", "ArchiveBriefingComplete", "M03_Briefing", 0.0),
        ("InspectDiscrepancies", "Inspect the diner, school, and founder discrepancies", "DiscrepanciesInspected", "M03_Evidence", 2.0),
        ("InterviewWitnesses", "Follow clues across Hill Valley", "WitnessesInterviewed", "M03_Witnesses", 0.0),
        ("IdentifyCause", "Identify the altered historical event", "AlterationIdentified", "M03_Complete", 0.0),
    ],
    "M04_MissingComponent": [
        ("GatherClues", "Question contacts in 1955", "WorkshopLocated", "M04_Clues", 0.0),
        ("InfiltrateWorkshop", "Enter Crane's workshop", "WorkshopEntered", "M04_Infiltration", 1.0),
        ("RecoverComponents", "Recover the alloy fragment and regulator", "ComponentsRecovered", "M04_Components", 0.0),
        ("ResolveNotes", "Choose the fate of Crane's research notes", "ResearchChoiceResolved", "M04_Choice", 5.0),
        ("InstallRegulator", "Install the regulator at Vale Garage", "RegulatorInstalled", "M04_Complete", 0.0),
    ],
    "M05_RaceTheLightning": [
        ("PrepareRoute", "Prepare cable, streets, and clock synchronization", "FinalePrepared", "M05_Ready", 0.0),
        ("StartRun", "Begin the rural lightning approach", "FinalRunStarted", "M05_Approach", 0.0),
        ("HitWire", "Reach the courthouse wire at the synchronized moment", "LightningJumpComplete", "M05_Jump", 0.0),
        ("InspectConsequences", "Inspect the consequence-altered 1985", "ConsequencesInspected", "M05_Consequences", 0.0),
        ("FinalDialogue", "Resolve the campaign with Vale", "CampaignResolved", "M05_Complete", 0.0),
    ],
}

asset_tools = unreal.AssetToolsHelpers.get_asset_tools()
unreal.EditorAssetLibrary.make_directory(DEST)

for mission_id, objective_specs in MISSIONS.items():
    name = "DA_Mission_" + mission_id
    path = f"{DEST}/{name}"
    asset = unreal.load_asset(path)
    if not asset:
        factory = unreal.DataAssetFactory()
        factory.set_editor_property("data_asset_class", unreal.MissionDataAsset)
        asset = asset_tools.create_asset(name, DEST, unreal.MissionDataAsset, factory)
    asset.set_editor_property("mission_id", mission_id)
    asset.set_editor_property("display_name", mission_id.replace("_", " "))
    objectives = []
    for objective_id, description, event_id, checkpoint_id, paradox_delta in objective_specs:
        objective = unreal.MissionObjectiveDefinition()
        objective.set_editor_property("objective_id", objective_id)
        objective.set_editor_property("description", description)
        objective.set_editor_property("completion_event", event_id)
        objective.set_editor_property("checkpoint_id", checkpoint_id)
        objective.set_editor_property("paradox_delta", paradox_delta)
        objectives.append(objective)
    asset.set_editor_property("objectives", objectives)
    unreal.EditorAssetLibrary.save_asset(path, only_if_is_dirty=False)
    unreal.log(f"CAMPAIGN_MISSION_SAVED {path} objectives={len(objectives)}")

unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
