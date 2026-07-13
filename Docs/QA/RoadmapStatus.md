# Temporal Drift Roadmap Status

Last updated: 2026-07-13

This document records verified completion against `Docs/superpowers/plans/2026-07-12-temporal-drift-game-upgrade-roadmap.md`.

## Tasks 1–8 (Vertical-slice foundation)

| Task | Status | Notes |
|------|--------|-------|
| 1 Stable baseline | **Code complete** | Build/automation/package scripts and configuration tests exist. Live PIE ×3 gate still requires editor verification. |
| 2 Input contract | **Code complete** | Enhanced Input assets, vehicle tests, reset/camera/destination cycling implemented. Live controller gate pending. |
| 3 Hero vehicle | **Partial** | Full tuning apply (suspension/steer), input smoothing, speed-responsive chase camera, reverse action binding. SportsCar physics chassis remains. |
| 4 Time travel SM | **Code complete** | Deterministic state machine plus `BTTF.TimeTravel.FiveConsecutivePlayerJumps` automation added. |
| 5 Era switching | **Partial** | `EraWorldManager` async switching works. `UEraDataAsset` includes data-layer and arrival fields; deeper era tests still thin. |
| 6 1955 dressing | **Code complete** | Python builders/validators pass; live blind-comparison screenshots still outstanding. |
| 7 Time-circuit UI | **Partial** | Runtime UMG + view model + mission objective + now-playing row; `WBP_TimeCircuits` fallback; pause/settings C++ widgets added. |
| 8 Presentation | **Partial** | Phase contract, vehicle-driven Niagara parameters, audio fade, profile reduced-flash sync, and asset scripts added. |

## Tasks 9–12 (Mission, population, save, alpha)

| Task | Status | Notes |
|------|--------|-------|
| 9 Vertical-slice mission | **Partial** | M02 full flow; M01–M05 automation + volumes; campaign auto-advance chain. |
| 10 NPCs/traffic | **Partial** | `EraPopulationManager` + budget tests; live splines/population sets pending. |
| 11 Save/load/settings | **Partial** | Schema v3 + crafting/timeline facts/dialogue restore; pause/settings UI. |
| 12 Windows alpha | **Partial** | Dev package scripts + checklist; Shipping smoke and 1080p controller acceptance pending on PC. |

## Tasks 13–14 (Region + hero)

| Task | Status | Notes |
|------|--------|-------|
| 13 Complete Hill Valley region | **Partial** | C++ validator + Python regional builder pass. Live full-circuit/streaming gate still open in `HillValleyRegionEvidence.md`. |
| 14 On-foot hero | **Partial** | Movement tuning, camera lag, dialogue interactables with subtitles/audio hooks, mission interact priority, vehicle enter range check. |

## Tasks 15–18 (Dialogue, campaign, facts)

| Task | Status | Notes |
|------|--------|-------|
| 15 Dialogue | **Partial** | Subsystem + widget + M01/M02/M03 dialogue scripts; full cast graphs pending. |
| 16 Campaign M01–M05 | **Partial** | Mission data assets, flow automation tests, M01–M05 volume/dialogue placement scripts; live playthrough pending. |
| 17 Five-era production | **Scaffolded** | Layer mappings + era music catalog; content for 1885/1985A/2015/2045 pending. |
| 18 Timeline facts/genealogy | **Partial** | Subsystems + tests + `create_timeline_data.py`; mission coordinator sets `C_*` flags on objective complete. |

## Tasks 19–27 (Expanded master game)

Combat/stealth components, temporal drive, crafting, hero progression, and era music are scaffolded with automation tests. Marty outfits, skill trees, five-act endings, 40+ side missions, multiplayer, photo mode, mod support, and final AV polish remain design-scaffold or content-only.

## New in this branch (latest)

- `UPauseMenuWidget` / `USettingsWidget` — Resume, Continue, New Game, Quit, profile sliders (music, dialogue, UI/subtitle scale, reduced flash).
- Campaign mission stable IDs (`M01.FirstTestRun` … `M05.RaceTheLightning`) aligned with save/restore via `BuildMissionAssetPathFromStableId`.
- Save/load restores crafting inventory and timeline fact overrides.
- `Scripts/create_timeline_data.py` — timeline fact + genealogy seed assets.
- Mission coordinator applies `C_PlaqueChanged`, `C_DinerRenamed`, `C_SchoolDedication`, `C_FounderMissing`, `C_CampaignComplete` on objective completion.
- Expanded `place_mission_volumes.py` and `create_dialogue_assets.py` for M01/M03 scaffolding.
- Campaign mission chaining (`M01` → `M05`) with `bAutoAdvanceCampaign` and optional `bStartFullCampaignOnNewGame` on GameMode.
- Dialogue progress snapshots saved/restored with story flags and conversation state.
- Fading photograph status row on time-circuits HUD driven by paradox level.
- `BootstrapCampaignSystems()` loads timeline facts, genealogy, and default crafting recipes on init.
- M04/M05 mission volume scaffolding + `Scripts/create_side_missions.py` (Side A/B).
- Automation: `BTTF.Mission.CampaignChainOrder`, dialogue snapshot restore in branching test.

## Still required for vertical-slice acceptance

See `Docs/QA/VerticalSliceChecklist.md`:

- Live five player-driven jumps in PIE.
- Full M02 playthrough using placed mission actors.
- Save/quit/continue at each checkpoint in a packaged build.
- Shipping package and clean-machine smoke tests.
- 1080p keyboard/mouse and controller acceptance.
- Licensed music import and live crossfade verification.

## On your PC

```powershell
git pull origin cursor/visuals-audio-movement-dialogue-492a
.\Scripts\Build\setup_vertical_slice.ps1
```

Rebuild if the editor reports 0 compile actions (touch a `.cpp` and rebuild). Run PIE, automation (`run_automation.ps1 -Filter BTTF`), and `package_smoke_test.ps1`.
