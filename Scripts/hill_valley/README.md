# Hill Valley World Builders

Deterministic procedural builders for `/Game/Levels/LVL_TimeTravelTest`.

Generated actors carry `HV_Generated` (neutral) or `HV_1955_Generated` (1955 dressing). Rebuilds delete only tagged generated actors.

## Scripts

| Script | Purpose |
|--------|---------|
| `build_1885_dressing.py` | Wild West saloon, rail survey, land dispute anchors |
| `build_1985_alternate_dressing.py` | Casino dystopia on `DL_1985_Alternate` |
| `build_2015_dressing.py` | Skyway + Cafe 80's on `DL_2015` |
| `build_2045_dressing.py` | Tannen tier spire + heritage ruins on `DL_2045` |
| `build_timeline_variants.py` | Fact-gated present-timeline signage swaps |
| `validate_era_dressing.py` | All-era dressing validation |
| `hill_valley_coords.py` | Shared `TOWN_OFFSET_Y` and world/local conversion |
| `hill_valley_common.py` | Shared spawn helpers and materials |
| `build_hill_valley_square.py` | Courthouse square + regional core + metro expansion |
| `build_hill_valley_metro.py` | Metro districts (also invoked by square builder) |
| `build_1955_dressing.py` | 1955 era overlay on `DL_1955` |
| `place_mission_volumes.py` | Campaign mission volumes (offset-aware) |
| `place_traffic_routes.py` | Traffic route spline anchors |
| `validate_hill_valley_square.py` | Tag/asset validation |
| `validate_1955_dressing.py` | 1955 dressing validation |

See `Docs/Design/HillValleyMetro.md` for district and NPC details.

## Build

```powershell
.\Scripts\Build\setup_vertical_slice.ps1
```

Or run `build_hill_valley_square.py` via UnrealEditor-Cmd. Success token: `courthouse square generation complete`.

## Validate

Success tokens: `HILL_VALLEY_VALIDATION_SUCCESS`, `HILL_VALLEY_1955_VALIDATION_SUCCESS`, `ERA_DRESSING_VALIDATION_SUCCESS`.

See `Docs/Design/TimelineRipples.md` for cross-era fact propagation.

