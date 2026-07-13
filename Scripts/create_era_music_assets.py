"""Create era music placeholder assets and wire era data assets to film-track slots.

You must replace placeholder SoundWave assets with properly licensed audio on your PC.
See Docs/Audio/EraMusic.md for the intended Back to the Future film track list.
"""
import unreal

MUSIC_DEST = "/Game/Audio/Music/Eras"
ERA_DEST = "/Game/Data/EraDataAssets"
TOOLS = unreal.AssetToolsHelpers.get_asset_tools()

TRACKS = [
    {
        "asset": "MUS_1985_PowerOfLove",
        "title": "The Power of Love",
        "artist": "Huey Lewis and the News",
        "film": "Back to the Future (1985)",
        "era": "Present1985",
        "data_asset": "DA_Era_1985",
        "volume": 0.70,
        "alternate": "MUS_1985_BackInTime",
        "alternate_title": "Back in Time",
        "alternate_artist": "Huey Lewis and the News",
    },
    {
        "asset": "MUS_1985_BackInTime",
        "title": "Back in Time",
        "artist": "Huey Lewis and the News",
        "film": "Back to the Future (1985)",
        "era": "Present1985",
        "data_asset": None,
        "volume": 0.70,
    },
    {
        "asset": "MUS_1955_EarthAngel",
        "title": "Earth Angel",
        "artist": "The Penguins",
        "film": "Back to the Future — Enchantment Under the Sea",
        "era": "Past1955",
        "data_asset": "DA_Era_1955",
        "volume": 0.60,
        "alternate": "MUS_1955_JohnnyBGoode",
        "alternate_title": "Johnny B. Goode",
        "alternate_artist": "Chuck Berry",
    },
    {
        "asset": "MUS_1955_JohnnyBGoode",
        "title": "Johnny B. Goode",
        "artist": "Chuck Berry",
        "film": "Back to the Future — Enchantment Under the Sea",
        "era": "Past1955",
        "data_asset": None,
        "volume": 0.65,
    },
    {
        "asset": "MUS_1985A_Dystopian",
        "title": "Alternate 1985 Underscore",
        "artist": "Alan Silvestri (style reference)",
        "film": "Back to the Future Part II — dystopian Hill Valley",
        "era": "Alternate1985",
        "data_asset": "DA_Era_1985A",
        "volume": 0.55,
    },
    {
        "asset": "MUS_2015_Future",
        "title": "Future 2015 Underscore",
        "artist": "Alan Silvestri (style reference)",
        "film": "Back to the Future Part II — Hill Valley 2015",
        "era": "Future2015",
        "data_asset": "DA_Era_2015",
        "volume": 0.60,
    },
    {
        "asset": "MUS_1885_Western",
        "title": "Wild West Source",
        "artist": "Period western source (licensed)",
        "film": "Back to the Future Part III — 1885",
        "era": "WildWest1885",
        "data_asset": "DA_Era_1885",
        "volume": 0.55,
    },
    {
        "asset": "MUS_2045_Dystopian",
        "title": "Deep Future Underscore",
        "artist": "Alan Silvestri (style reference)",
        "film": "Back to the Future Part II — 2045",
        "era": "DeepFuture2045",
        "data_asset": "DA_Era_2045",
        "volume": 0.50,
    },
]


def ensure_music_asset(name):
    path = f"{MUSIC_DEST}/{name}"
    if unreal.EditorAssetLibrary.does_asset_exist(path):
        return path
    unreal.EditorAssetLibrary.make_directory(MUSIC_DEST)
    asset = TOOLS.create_asset(name, MUSIC_DEST, unreal.SoundWave, unreal.SoundFactory())
    unreal.EditorAssetLibrary.save_loaded_asset(asset, False)
    unreal.log(f"ERA_MUSIC_ASSET {path}")
    return path


def ensure_era_data_asset(spec, primary_path, alternate_path=None):
    data_name = spec["data_asset"]
    if not data_name:
        return
    path = f"{ERA_DEST}/{data_name}"
    asset = unreal.load_asset(path)
    if not asset:
        unreal.EditorAssetLibrary.make_directory(ERA_DEST)
        factory = unreal.DataAssetFactory()
        factory.set_editor_property("data_asset_class", unreal.EraDataAsset)
        asset = TOOLS.create_asset(data_name, ERA_DEST, unreal.EraDataAsset, factory)

    asset.set_editor_property("timeline_state", spec["era"])
    asset.set_editor_property("era_name", data_name.replace("DA_Era_", ""))
    asset.set_editor_property("music_primary_title", spec["title"])
    asset.set_editor_property("music_primary_artist", spec["artist"])
    asset.set_editor_property("music_film_reference", spec["film"])
    asset.set_editor_property("music_default_volume", spec["volume"])
    asset.set_editor_property("era_music_primary", primary_path)
    if alternate_path:
        asset.set_editor_property("era_music_alternate", alternate_path)
        if track.get("alternate_title"):
            asset.set_editor_property("music_alternate_title", track["alternate_title"])
        if track.get("alternate_artist"):
            asset.set_editor_property("music_alternate_artist", track["alternate_artist"])
    unreal.EditorAssetLibrary.save_asset(path, only_if_is_dirty=False)
    unreal.log(f"ERA_DATA_MUSIC_WIRED {path}")


def main():
    by_name = {}
    for track in TRACKS:
        by_name[track["asset"]] = ensure_music_asset(track["asset"])

    wired = set()
    for track in TRACKS:
        if not track.get("data_asset") or track["data_asset"] in wired:
            continue
        alt_name = track.get("alternate")
        alt_path = by_name.get(alt_name) if alt_name else None
        ensure_era_data_asset(track, by_name[track["asset"]], alt_path)
        wired.add(track["data_asset"])

    unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)
    unreal.log("ERA_MUSIC_ASSETS_SUCCESS")


main()
