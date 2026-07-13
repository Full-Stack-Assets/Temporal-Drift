# Temporal Drift — Codebase Code Review

**Date:** 2026-07-13
**Scope:** Entire codebase (`Source/BTTF_TemporalDrift`, `Scripts/`, `Config/`)
**Method:** 8 independent finder passes (correctness, removed-behavior, cross-file, reuse, simplification, efficiency, altitude, conventions) → deduped → single-vote adversarial verification against source.

## Summary

Two independent showstoppers plus a shipping-build blocker top the list:

- **The campaign cannot be completed** — required mission events have no producer.
- **Core time-travel is unreachable** through normal input — the time-circuits action is bound twice and cancels itself.
- **Shipping builds will not compile** — an editor-only API is called on a runtime path.

Every finding below was confirmed (or rated plausible) against the actual code.

---

## Top 10 findings (most severe first)

### 1. The campaign can never be completed — key mission events have no producer
**`Source/BTTF_TemporalDrift/Private/MissionCoordinatorSubsystem.cpp`** (data authored in `Scripts/create_campaign_missions.py:14`)

M01's final objective completes only on the event `M01Returned`; `WorkshopLocated`, `ResearchChoiceResolved`, and `LightningJumpComplete` are likewise required by later missions. None of these strings is ever submitted by any mission volume, interactable, dialogue node, or C++ path (`HandleJumpArrived` only emits `Arrived1955`/`Returned1985`). M01 can never complete, so `bAutoAdvanceCampaign` never reaches M02 — the campaign is unfinishable end-to-end.

### 2. Time circuits can never be armed — `IA_TimeCircuits` is bound twice
**`Source/BTTF_TemporalDrift/Private/BTTF_PlayerController.cpp:143`** + **`Source/BTTF_TemporalDrift/Private/DeLoreanVehicle.cpp:316`**

The same input asset is bound in both the possessed player controller and the DeLorean, and both handlers call `ToggleTimeCircuits()`. One key press fires both, flipping `bTimeCircuitsOn` on then off — a net no-op. The circuits can't be armed from Enhanced Input, so time travel is unreachable through the normal control path. (`IA_TimeJump` has the same double-bind.)

### 3. Shipping build will not compile — `SetActorLabel` outside `WITH_EDITOR`
**`Source/BTTF_TemporalDrift/Private/HillValleyAmbientPedestrian.cpp:62`**

`SetCitizenLabel` calls `AActor::SetActorLabel` (declared only under `#if WITH_EDITOR`) with no guard, on a runtime path invoked by `PopulationSpawnSubsystem::SpawnNamedCitizens`. Editor builds compile; any packaged/shipping build fails to compile here. The game cannot ship as-is.

### 4. A failed jump permanently bricks time travel
**`Source/BTTF_TemporalDrift/Private/DeLoreanVehicle.cpp:203`**

`EndTimeTravelEffects` is bound only to `OnTimeTravelCompleted`, never to `OnJumpFailed`. If a jump fails mid-flight (e.g. `EraWorldManager::RequestEra` fails during `SwitchingEra`), the subsystem broadcasts `OnJumpFailed` and the vehicle's `bIsTimeTraveling` stays `true` forever. `UpdateFluxCapacitor` early-returns on that flag (`:950`), so flux never recharges and time travel is dead for the rest of the session.

### 5. Save/load leaves the wrong era's world loaded
**`Source/BTTF_TemporalDrift/Private/BTTF_GameInstance.cpp:191`**

`LoadTimelineState` writes `CurrentTimelineState` straight into the subsystem but never calls `EraWorldManager::RequestEra`/`SwitchToEra`. Load a save made in 1955: gameplay, HUD, missions, and paradox logic all report 1955 while `EraWorldManager::ActiveEra` stays at its default 1985 and the 1985 data layers/pedestrians stay rendered. The player is "in 1955" standing in the 1985 world.

### 6. Save/load silently drops dynamically-created timeline facts
**`Source/BTTF_TemporalDrift/Private/TimelineFactSubsystem.cpp:91`**

`SetBaseFact` auto-creates a `Definitions` entry for unknown fact IDs (facts the mission coordinator sets at runtime, e.g. `C_PlaqueChanged`). On load, `LoadDefinitions` resets `Definitions` to the data asset and `RecomputeFacts` only iterates `Definitions` keys, so a restored override for a non-asset fact is never recomputed — `GetFact` returns not-found and every world consequence driven by that fact vanishes after any save/load.

### 7. Soft-lock in the settings menu — dead "Back" control
**`Source/BTTF_TemporalDrift/Private/SettingsWidget.cpp:77`**

`[ Back ]` is built as a plain `UTextBlock` with no button/`OnClicked`; `HandleBackClicked` (`:227`) is bound to nothing. Opening Settings collapses the pause `Panel` (which holds Resume/Quit), so with no working Back and ESC disabled while paused (see #8), there is no visible control to leave settings — the game is stuck paused.

### 8. ESC cannot close the pause menu
**`Source/BTTF_TemporalDrift/Private/BTTF_PlayerController.cpp:138`**

Escape is bound via `InputComponent->BindKey` without `bExecuteWhenPaused = true`. Once `TogglePauseMenu` calls `SetPause(true)`, the paused input system ignores the binding, so a second ESC never re-fires `TogglePauseMenu` — contradicting the on-screen "Press ESC to resume."

### 9. Timeline facts applied before the mission event is accepted
**`Source/BTTF_TemporalDrift/Private/MissionCoordinatorSubsystem.cpp:233`**

`ApplyTimelineFactsForMissionEvent` runs unconditionally *before* `MissionSubsystem::SubmitMissionEvent`. When the event is rejected (wrong/inactive objective, no mission), the fact has already been permanently set, and because `MissionEventVolume` only sets `bHasFired` on success, re-entering the volume re-applies the fact on every overlap. World consequences flip permanently and out of story order.

### 10. Hero movement circles instead of moving straight
**`Source/BTTF_TemporalDrift/Private/BTTFHeroCharacter.cpp:137`**

`UpdateMovementFacingYaw` sets `ControlRotation.Yaw = GetActorRotation().Yaw + OrbitYaw` every tick while `bOrientRotationToMovement` is on. Movement input steers by control yaw, the actor rotates toward it, and next tick the control yaw follows the new actor yaw — a positive feedback loop. Holding a direction walks the character in a circle, and controller pitch/yaw are stomped each frame.

---

## Also confirmed (cut for the 10-item cap)

All real, mostly progression/UX:

| Finding | Location |
|---|---|
| M04's fact trigger checks objective ID `RegulatorInstalled` but the authored ID is `InstallRegulator`, so `1885.RailSurveyApproved` never fires | `MissionCoordinatorSubsystem.cpp:36` |
| Two objectives sharing one CompletionEvent soft-lock via `ConsumedEventIds` | `MissionSubsystem.cpp:27` |
| Sprint uses a one-shot `FInterpTo`, so it never reaches sprint speed | `BTTFHeroCharacter.cpp:207` |
| Diagnostic keyboard fallback double-fires every key also bound via `BindKey` | `DeLoreanVehicle.cpp:658` |
| Post-jump, the vehicle's `bTimeCircuitsOn` desyncs from the subsystem so re-arming needs two presses | `TimeTravelSubsystem.cpp:178` |
| `EraMusicSubsystem`'s sticky `bDelegatesBound` is never cleared on level travel, so music stops switching | `EraMusicSubsystem.cpp:34` |
| Named-citizen reservations are wiped by `SetActiveEra` right after being made, allowing duplicates | `PopulationSpawnSubsystem.cpp:170` |
| `TotalTimeJumps` increments on every save rather than per jump | `BTTF_GameInstance.cpp:178` |
| Two game-instance/world subsystem pairs bind without `InitializeDependency` (init-order race) | `WorldConsequenceSubsystem.cpp:9`, `MissionCoordinatorSubsystem.cpp:88` |
| Legacy jump path flips era without streaming and dereferences `GetWorld()` unguarded | `TimeTravelSubsystem.cpp:230` |
| "New Game" in the pause menu is resurrected by the next autosave (no subsystem reset) | `PauseMenuWidget.cpp:157` |

---

## Cleanup themes (recommended follow-up pass)

- **Era data should be data-driven.** Era → data-layer / music / asset paths are hardcoded in 3+ places (`EraWorldManager`, `EraMusicSubsystem`, `HillValleyWorldValidator`) instead of reading `UEraDataAsset`.
- **Duplicated canonical constants.** The M05 clocktower-lightning date/time is duplicated across three files (`EraWeatherSubsystem`, `TemporalDriveSubsystem`, `MissionCoordinatorSubsystem`).
- **Copy-pasted lighting rigs.** Five `Scripts/*.py` builders carry divergent lighting setups; `fix_black_screen.py` / `fix_level_lighting.py` patch the generator's *output* instead of fixing the generator.
- **Reimplemented widget helper.** The styled text-line builder is copied into four widgets (`TimeCircuitsWidget::AddReadout` is the canonical version).
- **Mission sequencing / fact wiring in C++.** Campaign order and objective→fact mappings are hardcoded if-chains keyed on raw strings that live in a Python generator; they belong on `UMissionDataAsset`.

---

## Suggested first fixes (small, contained)

1. **#2 double input bind** — remove the duplicate binding (keep it in one place).
2. **#3 `WITH_EDITOR` guard** — wrap the `SetActorLabel` call.
3. **#4 `OnJumpFailed` binding** — also bind `EndTimeTravelEffects` to `OnJumpFailed`.
