# Temporal Drift Roadmap Status

Last updated: 2026-07-13

This document records verified completion against `Docs/superpowers/plans/2026-07-12-temporal-drift-game-upgrade-roadmap.md`.

## Tasks 1–8 (Vertical-slice foundation)

| Task | Status | Notes |
|------|--------|-------|
| 1 Stable baseline | **Code complete** | Build/automation/package scripts and configuration tests exist. Live PIE ×3 gate still requires editor verification. |
| 2 Input contract | **Code complete** | Enhanced Input assets, vehicle tests, reset/camera/destination cycling implemented. Live controller gate pending. |
| 3 Hero vehicle | **Partial** | Tuning data, hero mesh contract, and cameras implemented. SportsCar physics chassis remains; live course tuning gate pending. |
| 4 Time travel SM | **Code complete** | Deterministic state machine plus `BTTF.TimeTravel.FiveConsecutivePlayerJumps` automation added. |
| 5 Era switching | **Partial** | `EraWorldManager` async switching works. `UEraDataAsset` now includes data-layer and arrival fields; deeper era tests still thin. |
| 6 1955 dressing | **Code complete** | Python builders/validators pass; live blind-comparison screenshots still outstanding. |
| 7 Time-circuit UI | **Partial** | Runtime UMG + view model + mission objective row; `WBP_TimeCircuits` load fallback and profile UI scale added. Full accessibility pass still pending. |
| 8 Presentation | **Partial** | Phase contract, material paths, disable switch, profile reduced-flash sync, and asset script added. Niagara/audio asset binaries still editor-authored. |

## Tasks 13–14 (Region + hero)

| Task | Status | Notes |
|------|--------|-------|
| 13 Complete Hill Valley region | **Partial** | C++ validator + Python regional builder pass. Live full-circuit/streaming gate still open in `HillValleyRegionEvidence.md`. |
| 14 On-foot hero | **Partial** | Movement, vehicle handoff, interaction priority, and `BTTF.Hero.VehicleHandoff` test added. NPC/item dialogue gate still open. |

## New in this branch

- `UMissionCoordinatorSubsystem` bridges jump arrivals to mission events and auto-saves checkpoints.
- `AMissionEventVolume` and `AMissionInteractable` wire M02 objectives in-world.
- `Scripts/hill_valley/place_mission_volumes.py` places courthouse briefing, sensor install, clocktower reach, and calibration interactables.
- `UBTTF_GameInstance` now captures/restores hero and vehicle transforms during save/load, and persists profile accessibility settings (`BTTF_Profile` slot).
- `UTimeTravelPresentationComponent` exposes per-phase material/Niagara/audio contracts, a presentation disable switch, and reduced-flash profile sync.
- `ABTTF_HUD` loads authored `WBP_TimeCircuits` when present and surfaces active mission objectives.
- `ABTTF_PlayerController` Escape pause saves progress before pausing.
- Hero `Interact()` can complete objectives on actors tagged `MissionEvent_*`.

## Still required for vertical-slice acceptance

See `Docs/QA/VerticalSliceChecklist.md`:

- Live five player-driven jumps in PIE (automation contract now exists).
- Full M02 playthrough using placed mission actors.
- Save/quit/continue at each checkpoint in a packaged build.
- Shipping package and clean-machine smoke tests.
- 1080p keyboard/mouse and controller acceptance.

## Tasks 9–27

Campaign systems (dialogue, genealogy, combat, multiplayer, five-era production, etc.) remain scaffolded in C++ with content and live QA still outstanding. Complete the vertical-slice gates above before expanding scope.
