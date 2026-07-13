# Temporal Drift Roadmap Status

Last updated: 2026-07-13

This document records verified completion against `Docs/superpowers/plans/2026-07-12-temporal-drift-game-upgrade-roadmap.md`.

## Integration Baseline Verification (2026-07-13)

Release Gate A · Task 1 ("Preserve and Verify the Current Integration Baseline"). Ran against the tip of `agent/batch-1-stability-controls` (commit `08e9a6a`) on the local UE 5.8 checkout. Worktree was already clean; no `__pycache__`/`.pyc` or other transient files were present to remove.

- **Editor build:** `Scripts/Build/build_editor.ps1` → `Result: Succeeded` (target already up to date; 0 compile actions).
- **Automation (baseline commit `08e9a6a`):** `run_automation.ps1 -Filter BTTF` → **59 found, 58 passed, 1 failed, 0 not-run.**
- **`BTTF.Hero.VehicleHandoff`:** ✅ passes (enter → possess vehicle → exit on clear side → repossess hero).
- **`BTTF.World.HillValleyComplete`:** was ❌ failing on the baseline — *"Playable region does not cover the required metro town and rural bounds."* `UHillValleyWorldValidator` measures the bounding box of `HV_Generated` **actor locations** and requires ≥70000×80000 UU. The metro layout reached local X ±42000 (84000, passes) but only local Y ±38000 (76000, fails). **Fixed under Task 7** (see below).

Full baseline log preserved; this build/automation checkpoint produced no PIE or packaged evidence, so no gate was claimed complete from it.

## Task 7 — Hill Valley Region Fix (2026-07-13)

Anchored on the failing `BTTF.World.HillValleyComplete` (constraint: every fix starts from a failing test). Root cause: the metro generator gave the East/West axis highway approaches at local X ±42000 but the North/South axis only reached ±38000 (reset volumes), leaving the Y location-span 4000 UU short of the required 80000.

- **Fix (`Scripts/hill_valley/build_hill_valley_metro.py`):** added North/South rural approach roads at local Y ±41000 (mirroring the E/W highway approaches), two destination signs, four approach nav nodes, and relocated the two N/S emergency-reset volumes to ±41000. Y location-span is now 82000 (≥80000). The validator was **not** modified.
- **Regenerated** `LVL_TimeTravelTest` via `build_hill_valley_square.py` (clean commandlet, exit 0, token `courthouse square generation complete`; removed 2389 prior generated actors, rebuilt).
- **Result:** `run_automation.ps1 -Filter BTTF` → **59 found, 59 passed, 0 failed.** `BTTF.World.HillValleyComplete` ✅.
- **Still open for Task 7 acceptance:** all-era clean regeneration (1885/1985-A/2015/2045), live driving-circuit profiling (frame time, streaming hitches, memory), and the live-evidence gates in `Docs/QA/HillValleyRegionEvidence.md`. Not claimed complete from generated assets + automation alone.

## Comprehensive Task 4 — Shared Keyboard Camera (2026-07-13)

Anchored on a failing `BTTF.Camera.PawnOwnership` test proving the hero and DeLorean did not yet own the shared keyboard camera component. The component tests were already present but untracked; they now compile and execute with pawn ownership covered.

- **Fix:** `ABTTFHeroCharacter` and `ADeLoreanVehicle` now create `UKeyboardCameraStateComponent`, assign pawn-specific camera presets, and keep their spring arms managed by the shared camera state.
- **Input behavior:** `W/A/S/D` continuously orbit the camera for both walking and driving. `C` cycles presets. `V` toggles auto-chase recentering. Hero mouse-look/controller-look axis bindings were removed from the pawn camera path, and both spring arms isolate roll.
- **Hover/camera stability:** vehicle presentation shake no longer writes roll onto the spring arm; it modulates camera FOV instead, preserving the level horizon during hover/roll events.
- **Verification:** `build_editor.ps1` → `Result: Succeeded`; `run_automation.ps1 -Filter BTTF.Camera` → **8 found, 8 passed**; `run_automation.ps1 -Filter BTTF.Vehicle.Input` → **7 found, 7 passed**; full `run_automation.ps1 -Filter BTTF` → **67 found, 67 passed**.
- **Still open for acceptance:** live PIE confirmation that `W/A/S/D`, `C`, and `V` behave correctly in walking, driving, and hover modes.

## Control and Presentation Stability Fixes (2026-07-13)

Follow-up to live playtest reports: `V` had no readable feedback, `G` could fail to appear to exit, hover mode was unstable, and `T` could turn the screen fully blue when merely arming time circuits.

- **`G` exit root cause:** controller handled `G` through both an input binding and `PlayerTick` polling. The tick polling path was removed so one key press cannot exit and immediately re-enter the vehicle.
- **`V` auto-chase:** auto-chase toggle is now controller-owned and displays a short on-screen `Auto-chase camera ON/OFF` message for both hero and vehicle.
- **Hover stability:** hover defaults were softened, gravity is disabled while hover is active, angular velocity is reset on hover entry, and wheel drivetrain inputs are prevented from fighting the hover controller.
- **`T` blue screen:** full-screen temporal post-process is now gated to actual departure/switching/arrival phases; arming or charging the time circuits no longer applies the distortion material.
- **Verification:** `build_editor.ps1` -> `Result: Succeeded`; focused automation passed: `BTTF.Hero` **6/6**, `BTTF.Vehicle` **13/13**, `BTTF.Presentation` **4/4**, `BTTF.Camera` **8/8**; full `run_automation.ps1 -Filter BTTF` -> **69 found, 69 passed**.
- **Live check:** fresh game launched in `/Game/Levels/LVL_TimeTravelTest`; tapping `T` armed the circuits without the full blue-screen post-process. Held-key hover/driving tuning still needs hands-on play confirmation.

## Tasks 1–8 (Vertical-slice foundation)

| Task | Status | Notes |
|------|--------|-------|
| 1 Stable baseline | **Code complete** | Build/automation/package scripts and configuration tests exist. 2026-07-13 baseline verified: editor build `Result: Succeeded`, automation 58/59 pass — `BTTF.World.HillValleyComplete` fails on region-bounds coverage (Task 7). See "Integration Baseline Verification (2026-07-13)" above. Live PIE ×3 gate still requires editor verification. |
| 2 Input contract | **Code complete** | Enhanced Input assets, vehicle tests, reset/camera/destination cycling implemented. Live controller gate pending. |
| 3 Hero vehicle | **Partial** | Full tuning apply (suspension/steer), input smoothing, speed-responsive chase camera, reverse action binding. SportsCar physics chassis remains. |
| 4 Time travel SM | **Code complete** | Deterministic state machine plus `BTTF.TimeTravel.FiveConsecutivePlayerJumps` automation added. |
| 5 Era switching | **Partial** | `EraWorldManager` async switching works. `UEraDataAsset` includes data-layer and arrival fields; deeper era tests still thin. |
| 6 1955 dressing | **Code complete** | Python builders/validators pass; live blind-comparison screenshots still outstanding. |
| 7 Time-circuit UI | **Partial** | Runtime UMG + view model + destination date, lightning countdown, consequence summary, polaroid widget; pause/settings C++ widgets; `WBP_*` fallbacks. |
| 8 Presentation | **Partial** | Phase contract, vehicle-driven Niagara parameters, audio fade, profile reduced-flash sync, and asset scripts added. |

## Tasks 9–12 (Mission, population, save, alpha)

| Task | Status | Notes |
|------|--------|-------|
| 9 Vertical-slice mission | **Partial** | M02 full flow; M01–M05 automation + volumes; campaign auto-advance chain. |
| 10 NPCs/traffic | **Partial** | `UPopulationSpawnSubsystem` + `AHillValleyAmbientPedestrian` wander NPCs; 60+ pedestrian nodes, named citizens, traffic route anchors; spline traffic vehicles pending. |
| 11 Save/load/settings | **Partial** | Schema v3 + crafting/timeline facts/dialogue restore; pause/settings UI. |
| 12 Windows alpha | **Partial** | Dev package scripts + checklist; Shipping smoke and 1080p controller acceptance pending on PC. |

## Tasks 13–14 (Region + hero)

| Task | Status | Notes |
|------|--------|-------|
| 13 Complete Hill Valley region | **Partial** | Metro expansion (~920m basin): civic, schools, suburbs, industrial, river/rail; C++ validator updated; live streaming perf gate still open. |
| 14 On-foot hero | **Partial** | Movement tuning, camera lag, dialogue interactables with subtitles/audio hooks, mission interact priority, vehicle enter range check. |

## Tasks 15–18 (Dialogue, campaign, facts)

| Task | Status | Notes |
|------|--------|-------|
| 15 Dialogue | **Partial** | Subsystem + widget + M01/M02/M03 dialogue scripts; full cast graphs pending. |
| 16 Campaign M01–M05 | **Partial** | Mission data assets, flow automation tests, M01–M05 volume/dialogue placement scripts; live playthrough pending. |
| 17 Five-era production | **Partial** | All six era dressing scripts + fact-gated variant signage; 1885/1985A/2015/2045 layers authored. |
| 18 Timeline facts/genealogy | **Partial** | Cross-era ripple graph (`1885` → `2045`), `UTimelineVariantSubsystem`, expanded consequences HUD. |

## Tasks 19–27 (Expanded master game)

Combat/stealth components, temporal drive, crafting, hero progression, and era music are scaffolded with automation tests. Marty outfits, skill trees, five-act endings, 40+ side missions, multiplayer, photo mode, mod support, and final AV polish remain design-scaffold or content-only.

## New in this branch (latest)

- `Docs/Design/GameElevation.md` — priority stack for spectacle, readability, and content density.
- `UWorldConsequenceSubsystem` — active `C_*` fact labels, HUD ripple summary, signage material paths.
- `UFadingPhotographWidget` — polaroid panel with opacity bar and paradox pulse (pairs with time-circuits HUD row).
- Time-circuits HUD: destination date (`InputTargetDate`), M05 lightning countdown, consequence summary.
- `DeLoreanVehicle` cycles destination era + default film date via `UTemporalDriveSubsystem::GetDefaultDateForEra`.
- M05 start sets Nov 12 1955 storm clock (~9:30 PM) for lightning countdown.
- `Scripts/create_world_consequence_signage.py` — placeholder consequence signage materials.
- Expanded dialogue scaffolding: M04 workshop (Vale), M05 finale (Vale, Elena, Crane).
- Side A/B mission volumes in `place_mission_volumes.py`; `WBP_FadingPhotograph` in `create_ui_widgets.py`.
- Automation: `BTTF.Timeline.WorldConsequenceSummary`, destination date formatting, elevated time-circuits fields, `BTTF.UI.FadingPhotographWidgetContract`.

## Prior branch additions

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
