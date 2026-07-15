#!/usr/bin/env python3
"""Download a curated CC0/royalty-free material starter library for Temporal Drift.

The script intentionally stores large binaries in ExternalAssets/, which is
ignored by git. Run this from the repository root with normal Python:

    python Scripts/Assets/download_cc0_starter_assets.py --resolution 1k

It currently downloads directly from Poly Haven using their public files API.
Downloaded assets are CC0; see Docs/Assets/TemporalDriftAssetIntake.md.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import time
import urllib.error
import urllib.request


USER_AGENT = "TemporalDriftAssetIngest/0.1 (local prototype; contact project owner)"
FILES_ENDPOINT = "https://api.polyhaven.com/files/{asset_id}"
DEFAULT_OUTPUT = Path("ExternalAssets") / "CC0" / "PolyHaven"
LOCAL_MANIFEST = Path("ExternalAssets") / "asset_manifest.local.json"


ASSET_BATCH = [
    {
        "id": "asphalt_02",
        "eras": ["1955", "1985", "1985_Alternate", "2015"],
        "usage": "main roads, parking lots, square perimeter",
        "targets": ["/Game/Materials/HillValley/M_HV_Asphalt"],
    },
    {
        "id": "asphalt_05",
        "eras": ["1985", "1985_Alternate"],
        "usage": "aged road patches and alleys",
        "targets": [],
    },
    {
        "id": "brick_wall_001",
        "eras": ["1955", "1985"],
        "usage": "courthouse square storefront brick",
        "targets": ["/Game/Materials/HillValley/M_HV_Brick_Red"],
    },
    {
        "id": "brick_wall_09",
        "eras": ["1985_Alternate"],
        "usage": "darker altered-timeline brick",
        "targets": ["/Game/Materials/HillValley/M_HV_Brick_Dark"],
    },
    {
        "id": "brick_pavement_02",
        "eras": ["1955", "1985"],
        "usage": "town square sidewalks and plaza accents",
        "targets": [],
    },
    {
        "id": "concrete_floor_worn_001",
        "eras": ["1985", "1985_Alternate"],
        "usage": "garage floors, service alleys, old civic interiors",
        "targets": ["/Game/Materials/HillValley/M_HV_Concrete"],
    },
    {
        "id": "concrete_pavement_03",
        "eras": ["1955", "1985", "2015"],
        "usage": "sidewalks and curb strips",
        "targets": [],
    },
    {
        "id": "cracked_concrete_02",
        "eras": ["1985_Alternate", "2045"],
        "usage": "damaged alternate timeline hardscape",
        "targets": [],
    },
    {
        "id": "brown_mud_dry",
        "eras": ["1885"],
        "usage": "frontier streets and dusty outskirts",
        "targets": ["/Game/Materials/HillValley/M_HV_Sand", "/Game/Environment/HillValley/1885/Materials/M_1885_Dust"],
    },
    {
        "id": "dirt_floor",
        "eras": ["1885"],
        "usage": "stables, barn interiors, trail shoulders",
        "targets": [],
    },
    {
        "id": "gravel",
        "eras": ["1885", "1985"],
        "usage": "rail beds, alleys, courthouse service lanes",
        "targets": [],
    },
    {
        "id": "wooden_planks",
        "eras": ["1885"],
        "usage": "frontier storefronts and boardwalks",
        "targets": ["/Game/Materials/HillValley/M_HV_Wood", "/Game/Environment/HillValley/1885/Materials/M_1885_Wood"],
    },
    {
        "id": "weathered_planks",
        "eras": ["1885", "1985_Alternate"],
        "usage": "aged barns, abandoned facades, dystopian repairs",
        "targets": ["/Game/Environment/HillValley/1885/Materials/M_1885_Saloon"],
    },
    {
        "id": "raw_plank_wall",
        "eras": ["1885"],
        "usage": "saloon, blacksmith, depot facades",
        "targets": [],
    },
    {
        "id": "dark_wooden_planks",
        "eras": ["1885", "1985_Alternate"],
        "usage": "dark trim, old interiors, damaged structures",
        "targets": [],
    },
    {
        "id": "corrugated_iron_02",
        "eras": ["1885", "1985_Alternate"],
        "usage": "sheds, roof patches, dystopian barricades",
        "targets": [],
    },
    {
        "id": "rusty_metal_04",
        "eras": ["1985_Alternate", "2045"],
        "usage": "alternate timeline industrial decay",
        "targets": ["/Game/Materials/HillValley/M_HV_DarkMetal"],
    },
    {
        "id": "metal_plate_02",
        "eras": ["2015", "2045"],
        "usage": "near-future service panels and lab floors",
        "targets": [],
    },
    {
        "id": "blue_metal_plate",
        "eras": ["2015", "2045"],
        "usage": "future-era civic panels and time lab trim",
        "targets": [],
    },
    {
        "id": "painted_metal_shutter",
        "eras": ["1955", "1985", "1985_Alternate"],
        "usage": "store shutters and alley doors",
        "targets": [],
    },
    {
        "id": "checkered_pavement_tiles",
        "eras": ["1955"],
        "usage": "diner flooring and mid-century interiors",
        "targets": ["/Game/Environment/HillValley/1955/Materials/M_1955_White"],
    },
    {
        "id": "blue_floor_tiles_01",
        "eras": ["1955", "2015"],
        "usage": "diner/restroom tile and clean future interiors",
        "targets": ["/Game/Environment/HillValley/1955/Materials/M_1955_Teal"],
    },
    {
        "id": "floor_tiles_06",
        "eras": ["1955"],
        "usage": "shops, civic corridors, diner back rooms",
        "targets": [],
    },
    {
        "id": "painted_plaster_wall",
        "eras": ["1955", "1985"],
        "usage": "small-town storefront walls and interiors",
        "targets": ["/Game/Materials/HillValley/M_HV_Plaster"],
    },
    {
        "id": "peeling_painted_wall",
        "eras": ["1985_Alternate"],
        "usage": "altered timeline decay and neglected interiors",
        "targets": [],
    },
    {
        "id": "grey_roof_tiles_02",
        "eras": ["1955", "1985"],
        "usage": "courthouse square rooflines",
        "targets": ["/Game/Materials/HillValley/M_HV_Roof"],
    },
    {
        "id": "ceramic_roof_01",
        "eras": ["1955", "1985"],
        "usage": "neighborhood houses and civic annex roofs",
        "targets": [],
    },
    {
        "id": "grass_path_3",
        "eras": ["1885", "1955", "1985"],
        "usage": "park edges, farm transitions, courthouse lawn wear",
        "targets": ["/Game/Materials/HillValley/M_HV_Grass"],
    },
    {
        "id": "forest_floor",
        "eras": ["1885", "1955", "1985"],
        "usage": "wooded edges and rural outskirts",
        "targets": [],
    },
    {
        "id": "concrete_panels",
        "eras": ["2015", "2045"],
        "usage": "future city modular wall panels",
        "targets": [],
    },
    {
        "id": "brushed_concrete_03",
        "eras": ["2015", "2045"],
        "usage": "clean future civic structures",
        "targets": [],
    },
    {
        "id": "dirty_tiles",
        "eras": ["1985_Alternate"],
        "usage": "grim interiors, corrupted timeline basements",
        "targets": [],
    },
]


MAPS = {
    "Diffuse": "basecolor",
    "nor_dx": "normal",
    "Rough": "roughness",
}


def request_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def download(url: str, destination: Path, expected_md5: str | None, dry_run: bool) -> dict:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        status = "exists"
    elif dry_run:
        status = "dry-run"
    else:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=120) as response:
            with destination.open("wb") as out:
                while True:
                    chunk = response.read(1024 * 256)
                    if not chunk:
                        break
                    out.write(chunk)
        status = "downloaded"

    md5 = None
    if destination.exists():
        digest = hashlib.md5()
        with destination.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        md5 = digest.hexdigest()
        if expected_md5 and md5 != expected_md5:
            raise RuntimeError(f"Checksum mismatch for {destination}: expected {expected_md5}, got {md5}")

    return {"status": status, "path": str(destination), "md5": md5, "url": url}


def pick_file(files: dict, map_name: str, resolution: str) -> dict | None:
    by_map = files.get(map_name)
    if not isinstance(by_map, dict):
        return None
    by_resolution = by_map.get(resolution)
    if not isinstance(by_resolution, dict):
        return None
    for extension in ("jpg", "png"):
        candidate = by_resolution.get(extension)
        if isinstance(candidate, dict) and candidate.get("url"):
            return {"extension": extension, **candidate}
    return None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--resolution", default="1k", choices=("1k", "2k", "4k"), help="Texture resolution to download.")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Download root.")
    parser.add_argument("--limit", type=int, default=0, help="Optional max number of material sets.")
    parser.add_argument("--dry-run", action="store_true", help="Build manifest without downloading binaries.")
    args = parser.parse_args()

    output_root = Path(args.output)
    selected_assets = ASSET_BATCH[: args.limit] if args.limit else ASSET_BATCH
    manifest = {
        "schema": 1,
        "generated_by": Path(__file__).as_posix(),
        "generated_at_unix": int(time.time()),
        "source": "Poly Haven",
        "source_license": "CC0",
        "source_license_url": "https://polyhaven.com/license",
        "resolution": args.resolution,
        "assets": [],
    }

    failures: list[str] = []
    for item in selected_assets:
        asset_id = item["id"]
        print(f"[asset] {asset_id}")
        try:
            files = request_json(FILES_ENDPOINT.format(asset_id=asset_id))
            maps: dict[str, dict] = {}
            for polyhaven_map, local_name in MAPS.items():
                picked = pick_file(files, polyhaven_map, args.resolution)
                if not picked:
                    print(f"  - missing {polyhaven_map}; skipping map")
                    continue
                filename = f"{asset_id}_{local_name}_{args.resolution}.{picked['extension']}"
                downloaded = download(
                    picked["url"],
                    output_root / asset_id / filename,
                    picked.get("md5"),
                    args.dry_run,
                )
                maps[local_name] = downloaded
                print(f"  - {local_name}: {downloaded['status']}")
            if "basecolor" not in maps:
                failures.append(f"{asset_id}: no basecolor map")
                continue
            manifest["assets"].append({**item, "maps": maps})
        except (urllib.error.URLError, TimeoutError, RuntimeError, json.JSONDecodeError) as exc:
            failures.append(f"{asset_id}: {exc}")

    LOCAL_MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    LOCAL_MANIFEST.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"\nWrote {LOCAL_MANIFEST} with {len(manifest['assets'])} material sets.")
    if failures:
        print("\nFailures:")
        for failure in failures:
            print(f"  - {failure}")
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
