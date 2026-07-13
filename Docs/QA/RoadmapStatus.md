# Temporal Drift Roadmap Status

Last updated: 2026-07-13

Execution order follows `Docs/superpowers/plans/2026-07-13-temporal-drift-comprehensive-remaining-work.md`. Requirements source remains `Docs/superpowers/plans/2026-07-12-temporal-drift-game-upgrade-roadmap.md`.

## Release Gate A — Playable vertical slice

| Task | Status | Notes |
|------|--------|-------|
| 1 Baseline verification | **In progress** | UE 5.8 compile fixes, Hill Valley generators, automation catalog documented. Live editor automation counts require PC run. |
| 2 Keyboard input contract | **Code complete** | Possession-safe `OnPossess`/`OnUnPossess` mapping layers (`IMC_Movement`/`IMC_CameraOrbit`), arrow movement, WASD camera-only orbit, mouse look removed. `BTTF.Vehicle.InputContractVerification`. Live PIE gate pending. |
| 3 G enter/exit | **Code complete** | Controller-owned `G`, left/right/behind exit with sweep + ground snap, `AttemptVehicleExit`, blocked-exit feedback. |
| 4 Shared keyboard camera | **Code complete** | `UKeyboardCameraComponent` + `UKeyboardCameraStateComponent` alias: clamps, 1.5s auto-chase, `C`/`V`, hero + DeLorean presets, hover roll isolation. |
| 5 Hero DeLorean gameplay | **Code complete** | Tuning data drives reverse/hover/input; `BTTF.Vehicle.Gameplay.ReverseHoverAndResetContracts` + `Docs/QA/HeroVehicleAcceptance.md`. Live PIE pending. |
| 6 Photoreal materials/lighting | **Code complete** | `photoreal_material_library.py`, builder migration, validator; `apply_photoreal_materials.py` upgrades legacy flat materials on placed actors. Screenshots pending. |
| 7 Hill Valley region gaps | **Partial** | Metro basin, six era dressings, mission volumes (incl. M01 return, M04/M05 producers). Streaming perf evidence open. |
| 8 1985→1955 loop | **Partial** | Five-jump automation, M02 bridge, presentation scaffold. Live player jumps + full M02 playthrough pending. |
| 9 Save/packaging acceptance | **Partial** | Schema v3, era restore on load, dynamic fact restore, jump-failure recovery. Packaged smoke + force-close recovery pending. |

## Code review fixes (2026-07-13)

| Finding | Status |
|---------|--------|
| Campaign events without producers | **Code complete** | Added `M01Returned`, `WorkshopLocated`, `ResearchChoiceResolved`, `LightningJumpComplete` volumes/interactables in `place_mission_volumes.py`. |
| Double time-circuits bind | **Code complete** | Removed duplicate Enhanced Input bindings from `ABTTF_PlayerController`; vehicle owns circuits/jump/hover. |
| `SetActorLabel` shipping compile | **Code complete** | Guarded with `#if WITH_EDITOR` in `HillValleyAmbientPedestrian.cpp`. |
| Failed jump bricks travel | **Code complete** | `OnJumpFailed` → `HandleTimeTravelJumpFailed` clears vehicle traveling state. |
| Save/load wrong era world | **Code complete** | `LoadTimelineState` calls `EraWorldManager::RequestEra`. |
| Dynamic timeline facts dropped | **Code complete** | `RestoreOverrideSnapshot` materializes unknown fact IDs before recompute. |
| Settings Back dead | **Code complete** | Working `UButton` wired to `ShowSettings(false)`. |
| ESC cannot unpause | **Code complete** | Escape binding uses `bExecuteWhenPaused = true`. |
| Facts before mission accept | **Code complete** | `SubmitMissionEvent` applies facts only after `UMissionSubsystem` accepts. |
| Hero movement circle | **Code complete** | Movement uses `GetMovementYaw()` without controller-yaw feedback loop. |
| M04 `RegulatorInstalled` typo | **Code complete** | Coordinator accepts both `RegulatorInstalled` and `InstallRegulator` objective IDs. |
| `TotalTimeJumps` on every save | **Code complete** | Save reads `UTimeTravelSubsystem::TotalJumpsMade` instead of incrementing per save. |

## Release Gate B — Expanded campaign

| Task | Status |
|------|--------|
| 10 M01–M05 campaign | **Partial** — mission assets, coordinator chain, dialogue/volume scaffolding; blind playthrough pending. |

## Release Gate C — Master game

Tasks 11–12 remain design scaffolds. Detailed tasks 13–33 (hero animation, traversal, skills, interiors, endings, side content, combat, economy, tutorials, accessibility, photo/mod, multiplayer, CI, legal) are **Not started** unless noted in the 27-task roadmap table below.

## Original 27-task roadmap (summary)

| Tasks | Status |
|-------|--------|
| 1–8 Foundation | Partial — see Gate A |
| 9–12 Mission/save/alpha | Partial |
| 13–14 Region/hero | Partial |
| 15–18 Dialogue/campaign/facts | Partial |
| 19–27 Master game systems | Scaffold / not started |

## Branches

| Branch | Focus |
|--------|-------|
| `cursor/keyboard-camera-photorealism-492a` | Keyboard camera, photoreal scripts, input contract (PR #10) |
| `cursor/code-review-fixes-492a` | Showstopper fixes + Gate A Tasks 5–6 + Release Gate A architecture integration (PR #13) |

## On your PC

```powershell
git pull origin cursor/code-review-fixes-492a
.\Scripts\Build\setup_vertical_slice.ps1
.\Scripts\Build\run_automation.ps1 -Filter BTTF
```

See `Docs/PC_Setup_Guide.md` and `Docs/QA/VerticalSliceChecklist.md` for acceptance gates.
