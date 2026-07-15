# Temporal Drift Asset Intake

Last updated: 2026-07-13

## Purpose

Temporal Drift needs a broad, legally safe starter library for Hill Valley across 1885, 1955, 1985, 1985-A, 2015, and 2045. The immediate production rule is:

- use direct-download CC0 or royalty-free assets for automated intake;
- keep large raw downloads out of git under `ExternalAssets/`;
- import into Unreal with project scripts;
- claim/import Fab and Epic Marketplace content manually through the user's logged-in Epic/Fab account.

## What is automated now

Run from the repo root:

```powershell
python Scripts\Assets\download_cc0_starter_assets.py --resolution 1k
```

This downloads a curated Poly Haven starter batch into:

```text
ExternalAssets/CC0/PolyHaven/
```

It also writes:

```text
ExternalAssets/asset_manifest.local.json
```

Then import and apply the textures through Unreal:

```powershell
$UE = 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe'
$PROJ = (Resolve-Path .\BTTF_TemporalDrift.uproject).Path
& $UE $PROJ -unattended -nop4 -nosplash -NullRHI -run=pythonscript '-script=Scripts/Assets/import_cc0_textures_to_unreal.py' -log
```

The Unreal importer creates source texture/material assets under:

```text
/Game/ExternalAssets/CC0/PolyHaven/
/Game/ExternalAssets/CC0/PolyHaven/
/Game/Materials/HillValley/PBR/
```

The Hill Valley generator now prefers `/Game/Materials/HillValley/PBR/M_PH_*` materials when they exist, so newly generated town geometry receives real PBR texture materials without needing to overwrite locked legacy material files. If you want to force-overwrite mapped legacy materials, close Unreal Editor and pass `--apply-targets` to the importer script.

## Current curated starter coverage

| Timeline | Material focus |
| --- | --- |
| 1885 | dry mud, dirt, gravel, raw planks, weathered planks, corrugated iron |
| 1955 | clean brick, checkered diner tile, painted plaster, roof tile, sidewalks |
| 1985 | asphalt, concrete, brick, garage floors, storefront shutters |
| 1985-A | cracked concrete, rusty metal, peeling walls, dirty tile, damaged brick |
| 2015 | metal plate, blue metal, concrete panels, clean tile |
| 2045 | brushed concrete, panelized concrete, future metal, industrial/rust contrast |

## Sources and license notes

- Poly Haven assets are CC0. Their API requires a unique User-Agent and notes that API usage is free for non-commercial/academic use; contact Poly Haven for commercial API usage. Downloaded assets themselves are CC0.
- ambientCG assets are CC0 and can be included in a game project. They are approved for future direct-download expansion.
- TextureCan textures are royalty-free and can be used commercially; its terms allow redistribution together with projects and 3D assets. They are approved for future expansion.
- Fab/Epic free content is useful but usually requires the user's Epic/Fab login/session and should be claimed/imported manually through Fab, Epic Launcher, or Fab in Unreal.

## Fab/Epic manual claim queue

Use Fab search and filter for Unreal Engine + Free. Claim/download/import these categories first:

1. Modular American town / small city / main street kits
2. Courthouse, clocktower, civic building, or modular government building kits
3. 1950s diner, gas station, motel, and vintage storefront props
4. Old West town, saloon, sheriff office, stable, barn, rail, and water tower kits
5. Modern/suburban house packs, school/campus props, mall/store interiors
6. Sci-fi city, clean future panels, neon signs, hologram/VFX kits
7. Industrial decay, junkyard, broken road, barricade, graffiti, rust decals
8. Civilian NPC packs, animation starter packs, vehicle props, and interactable item packs

Do not import exact copyrighted Back to the Future likenesses, logos, music, or trademarked assets unless properly licensed.

## Next expansion steps

1. Rerun the Poly Haven script at `--resolution 2k` once the 1K pass is verified in Unreal.
2. Add ambientCG and TextureCan download adapters if more material variety is needed.
3. Add a second importer pass for downloaded models/props once source packs are selected.
4. Rebuild `LVL_TimeTravelTest` and regenerate Hill Valley so actors receive the upgraded materials.
5. Take screenshots for each era and update `Docs/QA/VerticalSliceChecklist.md`.
