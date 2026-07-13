"""Seed timeline fact and genealogy data assets for cross-era ripple consequences."""
import unreal

TIMELINE_DEST = "/Game/Data/Timeline"
TOOLS = unreal.AssetToolsHelpers.get_asset_tools()


def ensure_fact_asset():
    path = f"{TIMELINE_DEST}/DA_TimelineFacts"
    asset = unreal.load_asset(path)
    if not asset:
        unreal.EditorAssetLibrary.make_directory(TIMELINE_DEST)
        factory = unreal.DataAssetFactory()
        factory.set_editor_property("data_asset_class", unreal.TimelineFactDataAsset)
        asset = TOOLS.create_asset("DA_TimelineFacts", TIMELINE_DEST, unreal.TimelineFactDataAsset, factory)

    facts = []

    def add_fact(fact_id, default_value=False, deps=None, value_when_satisfied=True):
        fact = unreal.TimelineFactDefinition()
        fact.set_editor_property("fact_id", fact_id)
        fact.set_editor_property("default_value", default_value)
        fact.set_editor_property("value_when_dependencies_satisfied", value_when_satisfied)
        if deps:
            dep_list = []
            for dep_id, required in deps:
                dep = unreal.TimelineFactDependency()
                dep.set_editor_property("fact_id", dep_id)
                dep.set_editor_property("required_value", required)
                dep_list.append(dep)
            fact.set_editor_property("dependencies", dep_list)
        facts.append(fact)

    # --- 1885 Wild West interventions (player sets these in the past) ---
    add_fact("1885.SaloonStandoffResolved")
    add_fact("1885.LandDisputeWon")
    add_fact("1885.RailSurveyApproved")

    # --- 1955 consequences propagated from 1885 ---
    add_fact("1955.MallSiteOwned", deps=[("1885.LandDisputeWon", True)])
    add_fact("1955.DinerLegacyIntact", deps=[("1885.SaloonStandoffResolved", True)])
    add_fact("1955.ClocktowerFunded", deps=[("1885.RailSurveyApproved", True)])

    # --- 1985 present: mission-set and propagated facts ---
    add_fact("C_PlaqueChanged")
    add_fact("C_DinerRenamed", deps=[("1955.DinerLegacyIntact", False)])
    add_fact("C_SchoolDedication")
    add_fact("C_FounderMissing")
    add_fact("1985.StreetRenamed", deps=[("1955.MallSiteOwned", False)])

    # --- Alternate 1985 branch when timeline corrupts before campaign resolution ---
    add_fact("A_TimelineCorrupted", deps=[
        ("C_DinerRenamed", True),
        ("C_FounderMissing", True),
        ("C_CampaignComplete", False),
    ])

    # --- 2015 future state ---
    add_fact("2015.SkywayLitigation", deps=[("1985.StreetRenamed", True)])
    add_fact("2015.Cafe80sThriving", deps=[
        ("C_CampaignComplete", True),
        ("A_TimelineCorrupted", False),
    ])

    # --- 2045 deep future ---
    add_fact("2045.TierThreeTannenOwned", default_value=True, deps=[("1985.StreetRenamed", True)], value_when_satisfied=False)
    add_fact("2045.HeritageDistrictIntact", deps=[("2045.TierThreeTannenOwned", False)])

    # --- Campaign finale stabilizes present timeline ---
    add_fact("C_CampaignComplete", deps=[
        ("C_PlaqueChanged", True),
        ("C_DinerRenamed", True),
        ("C_SchoolDedication", True),
        ("C_FounderMissing", True),
    ])

    asset.set_editor_property("facts", facts)
    unreal.EditorAssetLibrary.save_asset(path, only_if_is_dirty=False)
    unreal.log(f"TIMELINE_FACTS_SAVED {path} facts={len(facts)}")
    return path


def ensure_genealogy_asset():
    path = f"{TIMELINE_DEST}/DA_Genealogy_HillValley"
    asset = unreal.load_asset(path)
    if not asset:
        unreal.EditorAssetLibrary.make_directory(TIMELINE_DEST)
        factory = unreal.DataAssetFactory()
        factory.set_editor_property("data_asset_class", unreal.GenealogyDataAsset)
        asset = TOOLS.create_asset("DA_Genealogy_HillValley", TIMELINE_DEST, unreal.GenealogyDataAsset, factory)

    citizens = []

    def add_citizen(citizen_id, family_id, birth, death, parents=None, tags=None):
        record = unreal.CitizenGenealogyRecord()
        record.set_editor_property("citizen_id", citizen_id)
        record.set_editor_property("family_id", family_id)
        record.set_editor_property("birth_year", birth)
        record.set_editor_property("death_year", death)
        record.set_editor_property("parent_ids", parents or [])
        record.set_editor_property("personality_tags", tags or [])
        citizens.append(record)

    add_citizen("Vale.Emmett", "Vale", 1920, 2100, tags=["Inventor", "Mentor"])
    add_citizen("Parker.June", "Parker", 1960, 2100, tags=["Archivist"])
    add_citizen("Diaz.Rosa", "Diaz", 1962, 2100, tags=["DinerOwner"])
    add_citizen("Diaz.Elena", "Diaz", 1930, 1998, tags=["DinerOwner1955"])
    add_citizen("Crane.Victor", "Crane", 1965, 2100, tags=["Rival"])
    add_citizen("Crane.Ancestor", "Crane", 1928, 1988, tags=["Industrialist1955"])
    add_citizen("Tannen.Buford", "Tannen", 1936, 1990, tags=["Bulldog1955"])
    add_citizen("Tannen.Biff", "Tannen", 1937, 2015, parents=["Tannen.Buford"], tags=["Dynasty"])
    add_citizen("McFly.William", "McFly", 1880, 1950, tags=["Founder1885"])
    add_citizen("Wilson.Goldie", "Wilson", 1930, 2010, tags=["Mayor1955"])

    asset.set_editor_property("citizens", citizens)
    unreal.EditorAssetLibrary.save_asset(path, only_if_is_dirty=False)
    unreal.log(f"GENEALOGY_SAVED {path} citizens={len(citizens)}")
    return path


def main():
    ensure_fact_asset()
    ensure_genealogy_asset()
    unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
    unreal.log("TIMELINE_DATA_SUCCESS")


main()
