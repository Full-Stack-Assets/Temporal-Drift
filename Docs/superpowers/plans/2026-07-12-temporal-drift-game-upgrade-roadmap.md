# BTTF Temporal Drift Game Upgrade Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current playable UE 5.8 prototype into a polished 1985 Hill Valley vertical slice with a convincing DeLorean, reliable time travel, one transformed era, missions, UI, audio, save/load, and a packaged Windows build.

**Architecture:** Keep authoritative gameplay state in focused C++ systems and expose events/settings to Blueprint for presentation. Keep one World Partition Hill Valley map as the shared spatial base; Data Layers and era data assets switch architecture, props, lighting, traffic, and NPC populations. Ship one complete 1985-to-1955 gameplay loop before adding 1885, Alternate 1985, 2015, or 2045 content.

**Tech Stack:** Unreal Engine 5.8, C++20, Blueprints, Chaos Vehicles, Enhanced Input, World Partition, Data Layers, UMG, Niagara, MetaSounds, Lumen/Nanite, Unreal Automation Framework, Python editor scripting.

## Global Constraints

- Preserve `/Game/Levels/LVL_TimeTravelTest` as the working map until the vertical slice is accepted.
- Preserve the currently working vehicle possession, physics, wheel bones, and keyboard controls.
- Build and test `BTTF_TemporalDriftEditor Win64 Development` after every C++ task.
- Use 1985 and 1955 only for the first vertical slice; other era layers remain inactive scaffolds.
- Keep runtime rules in C++; use Blueprint, UMG, Niagara, materials, and audio for presentation.
- Every milestone must end in a playable editor build; no long content-only branch without a working game loop.
- Create a dated backup of every modified `.umap` before commandlet or editor-script mutations.

---

## Current Baseline

- `ADeLoreanVehicle` drives with Chaos, exposes time-circuit and hover hooks, and has a chase camera.
- `UTimeTravelSubsystem` tracks flux, era, paradox, Hawking stability, and Tipler charge.
- `ABTTF_HUD`, `UBTTF_GameInstance`, and `UBTTF_SaveGame` provide prototype HUD and persistence shells.
- `/Game/Levels/LVL_TimeTravelTest` contains a generated neutral Hill Valley square with courthouse, clocktower, storefronts, roads, landscaping, and era dressing hooks.
- Six era Data Layer assets exist, but the runtime transition does not yet visibly transform the town.
- Two vehicle automation tests currently pass: mesh physics and wheel-bone configuration.
- The visible car is still a sports-car stand-in and the present HUD is debug-quality.

## Delivery Sequence

| Milestone | Player-visible result | Exit gate |
|---|---|---|
| M0 Stability | Repeatable launch, drive, reset, test, and package workflow | 10-minute smoke test without blocker |
| M1 Hero Vehicle | Recognizable DeLorean with tuned handling and cameras | Drive/stop/reverse/reset tests pass |
| M2 Time Travel Loop | Reach 88 MPH, trigger jump, arrive in 1955 | Automated state tests plus live transition |
| M3 Hill Valley 1955 | Courthouse square visibly changes era | Layer validation and performance budget pass |
| M4 Vertical Slice | One mission with consequence and return jump | Start-to-finish playthrough succeeds |
| M5 Presentation | Final HUD, VFX, audio, lighting, accessibility | No debug-only presentation required |
| M6 Windows Alpha | Save/load, settings, packaged build, crash logs | Clean-machine package smoke test passes |

---

### Task 1: Lock the Stable Development Baseline

**Files:**
- Create: `Scripts/Build/build_editor.ps1`
- Create: `Scripts/Build/run_automation.ps1`
- Create: `Scripts/Build/package_windows.ps1`
- Create: `Source/BTTF_TemporalDrift/Private/Tests/ProjectConfigurationTests.cpp`
- Modify: `README.md`

**Interfaces:**
- Produces: repeatable editor build, automation, and packaging commands used by all later tasks.

- [ ] Add a configuration automation test that loads the default map, game mode, game instance, and `BP_DeLoreanVehicle` class and asserts none are null.
- [ ] Run the new test before its implementation data is corrected; record any missing asset or class path as the expected failure.
- [ ] Add PowerShell wrappers around UE 5.8 `Build.bat`, `UnrealEditor-Cmd.exe`, and `RunUAT.bat BuildCookRun` with the project path resolved from `$PSScriptRoot`.
- [ ] Run `Scripts/Build/build_editor.ps1`; expect `Result: Succeeded`.
- [ ] Run `Scripts/Build/run_automation.ps1 BTTF`; expect all existing vehicle tests and the configuration test to pass.
- [ ] Document the exact VS Code terminal commands and recovery procedure in `README.md`.
- [ ] Gate: launch PIE, possess the vehicle, drive, steer, brake, reverse, reset, and exit PIE three consecutive times.

### Task 2: Replace Prototype Input Fallback with a Complete Control Contract

**Files:**
- Modify: `Source/BTTF_TemporalDrift/Public/DeLoreanVehicle.h`
- Modify: `Source/BTTF_TemporalDrift/Private/DeLoreanVehicle.cpp`
- Modify: `Source/BTTF_TemporalDrift/Private/BTTF_PlayerController.cpp`
- Create: `Source/BTTF_TemporalDrift/Private/Tests/VehicleInputTests.cpp`
- Create assets: `/Game/Input/IA_Throttle`, `IA_Steering`, `IA_Brake`, `IA_Handbrake`, `IA_Reverse`, `IA_ResetVehicle`, `IA_ToggleTimeCircuits`, `IA_TimeJump`, `IA_CycleDestination`, `IA_ToggleCamera`
- Create asset: `/Game/Input/IMC_DeLorean`

**Interfaces:**
- Produces: `ResetVehicle()`, `CycleDestinationEra(int32 Direction)`, and Enhanced Input actions consumed by UI and missions.

- [ ] Write tests that feed throttle, steering, brake, handbrake, and reset commands into a spawned vehicle and assert normalized movement inputs and a safe reset transform.
- [ ] Run `BTTF.Vehicle.Input`; expect failures for unimplemented handbrake/reset behavior.
- [ ] Bind keyboard and controller mappings in `IMC_DeLorean`; retain keyboard polling only as an opt-in diagnostic fallback.
- [ ] Implement reset using the last valid upright road transform, zeroing linear/angular velocity before teleport.
- [ ] Add camera toggle and destination cycling events for later UMG use.
- [ ] Run `BTTF.Vehicle`; expect all physics, wheel, and input tests to pass.
- [ ] Gate: W/S or trigger input accelerates/reverses, A/D or stick steers, Space handbrakes, R resets, C changes camera, and no control is frame-rate dependent.

### Task 3: Build the Hero DeLorean Vehicle

**Files:**
- Create: `Source/BTTF_TemporalDrift/Public/DeLoreanTuningData.h`
- Create: `Source/BTTF_TemporalDrift/Private/DeLoreanTuningData.cpp`
- Modify: `Source/BTTF_TemporalDrift/Private/DeLoreanWheel.cpp`
- Modify: `Source/BTTF_TemporalDrift/Private/DeLoreanVehicle.cpp`
- Create assets: `/Game/Vehicles/DeLorean/BP_DeLoreanVehicle`, skeletal mesh, physics asset, animation Blueprint, material instances, tuning data asset
- Create: `Source/BTTF_TemporalDrift/Private/Tests/VehicleTuningTests.cpp`

**Interfaces:**
- Produces: `UDeLoreanTuningData` containing mass, torque curve, gears, suspension, steering, drag, 0-60 target, and maximum speed.

- [ ] Write tests asserting four valid wheel bones, non-empty torque curve, forward/reverse gears, mass range 1200-1600 kg, and stable suspension values.
- [ ] Import or author a legally usable DeLorean-inspired exterior/interior mesh with LODs, collisions, wheel pivots, emissive flux components, doors, lights, and material slots.
- [ ] Move hard-coded drivetrain values from the constructor into `UDeLoreanTuningData` and apply them during initialization.
- [ ] Tune acceleration, braking distance, steering response, center of mass, suspension travel, tire friction, and chase camera using a marked test course.
- [ ] Add exterior, hood, bumper, and cockpit camera presets.
- [ ] Gate: vehicle completes the test course without rollover or oscillation, reaches the chosen 88-MPH window predictably, and remains controllable at top speed.

### Task 4: Make Time Travel a Deterministic State Machine

**Files:**
- Create: `Source/BTTF_TemporalDrift/Public/TimeTravelTypes.h`
- Modify: `Source/BTTF_TemporalDrift/Public/TimeTravelSubsystem.h`
- Modify: `Source/BTTF_TemporalDrift/Private/TimeTravelSubsystem.cpp`
- Modify: `Source/BTTF_TemporalDrift/Public/DeLoreanVehicle.h`
- Modify: `Source/BTTF_TemporalDrift/Private/DeLoreanVehicle.cpp`
- Create: `Source/BTTF_TemporalDrift/Private/Tests/TimeTravelSubsystemTests.cpp`

**Interfaces:**
- Produces: `ETimeTravelPhase { Idle, Armed, Charging, ThresholdReached, Departing, SwitchingEra, Arriving, Cooldown, Failed }`.
- Produces: `FTimeTravelRequest { ETimelineState Destination; FVector Origin; float EntrySpeedMph; }`.
- Produces delegates: `OnPhaseChanged`, `OnJumpDeparted`, `OnEraSwitchRequested`, `OnJumpArrived`, `OnJumpFailed`.

- [ ] Write tests for energy clamping, circuit arming, 88-MPH threshold, insufficient energy, duplicate request rejection, phase order, energy consumption, and cooldown completion.
- [ ] Run `BTTF.TimeTravel`; expect phase-transition tests to fail against the current boolean implementation.
- [ ] Replace the subsystem/vehicle pair of overlapping booleans with the enum state machine and one authoritative transition function.
- [ ] Require circuits on, valid destination, adequate flux, threshold speed, and stable cooldown before departure.
- [ ] Preserve vehicle transform and velocity intent across the era switch; restore the vehicle to the corresponding road location on arrival.
- [ ] Run `BTTF.TimeTravel`; expect all deterministic tests to pass.
- [ ] Gate: five consecutive 1985-to-1955 jumps complete once each, never strand input, and never leave effects active.

### Task 5: Implement Runtime Era Switching in World Partition

**Files:**
- Create: `Source/BTTF_TemporalDrift/Public/EraWorldManager.h`
- Create: `Source/BTTF_TemporalDrift/Private/EraWorldManager.cpp`
- Modify: `Source/BTTF_TemporalDrift/Public/EraDataAsset.h`
- Modify: `Source/BTTF_TemporalDrift/Private/TimeTravelSubsystem.cpp`
- Create: `Source/BTTF_TemporalDrift/Private/Tests/EraWorldManagerTests.cpp`
- Modify assets: `/Game/Data/EraDataAssets/DA_Era_1985`, `/Game/Data/EraDataAssets/DA_Era_1955`
- Modify map: `/Game/Levels/LVL_TimeTravelTest`

**Interfaces:**
- Produces: `RequestEra(ETimelineState Era)`, `IsEraReady()`, `GetActiveEra()` and `OnEraReady`.
- Consumes: `OnEraSwitchRequested` from Task 4.

- [ ] Write tests asserting exactly one era layer becomes active, the neutral base remains loaded, invalid era assets fail safely, and `OnEraReady` fires once.
- [ ] Add runtime Data Layer asset references, lighting profile, audio state, traffic set, NPC set, and arrival transform to each `UEraDataAsset`.
- [ ] Implement asynchronous layer activation/deactivation and wait for streaming completion before broadcasting `OnEraReady`.
- [ ] Divide the map into `DL_NeutralBase`, `DL_1985_Present`, and `DL_1955`; keep collision-critical roads in the neutral base.
- [ ] Run `BTTF.Era`; expect all layer-state tests to pass.
- [ ] Gate: switching eras changes visible buildings/props/lighting without falling through the road, duplicating actors, or moving the player to an invalid cell.

### Task 6: Author the 1955 Hill Valley Transformation

**Files:**
- Modify: `Scripts/hill_valley/build_hill_valley_square.py`
- Create: `Scripts/hill_valley/build_1955_dressing.py`
- Create: `Scripts/hill_valley/validate_1955_dressing.py`
- Modify map: `/Game/Levels/LVL_TimeTravelTest`
- Create assets under: `/Game/Environment/HillValley/1955`

**Interfaces:**
- Produces: populated `DL_1955` with era-specific courthouse dressing, storefront façades, signs, street furniture, vehicles, vegetation, and construction-state props.

- [ ] Back up the map and add validator checks for layer assignment, actor counts, collision, duplicate labels, always-loaded neutral geometry, and spawn clearance.
- [ ] Run the validator before generation; expect failures for missing 1955 dressing categories.
- [ ] Create modular 1950s storefront kits, courthouse banners/signage, period lamps, benches, phone booths, parked cars, road markings, and restrained set dressing.
- [ ] Assign all era-specific actors to `DL_1955` and preserve the neutral civic geometry beneath them.
- [ ] Add 1955 sky, exposure, grading, fog, and ambient sound profile through the era data asset.
- [ ] Run both Hill Valley validators and inspect the layer transition live from the arrival camera.
- [ ] Gate: a blind comparison screenshot makes 1955 immediately distinguishable from 1985 while the courthouse-square geography remains recognizable.

### Task 7: Deliver Final Time-Circuit UI, Feedback, and Accessibility

**Files:**
- Create: `Source/BTTF_TemporalDrift/Public/TimeCircuitsViewModel.h`
- Create: `Source/BTTF_TemporalDrift/Private/TimeCircuitsViewModel.cpp`
- Modify: `Source/BTTF_TemporalDrift/Private/BTTF_HUD.cpp`
- Create assets: `/Game/UI/WBP_DrivingHUD`, `/Game/UI/WBP_TimeCircuits`, `/Game/UI/WBP_PauseMenu`, `/Game/UI/WBP_Settings`
- Create: `Source/BTTF_TemporalDrift/Private/Tests/TimeCircuitsViewModelTests.cpp`

**Interfaces:**
- Produces: event-driven fields for speed, flux, current/destination era, time-travel phase, paradox, stability, objective, and warning text.

- [ ] Write view-model tests for display formatting, warning thresholds, destination cycling, and phase messages.
- [ ] Replace per-frame Canvas debug text with UMG bound to explicit view-model change events.
- [ ] Build readable speedometer, 88-MPH indicator, flux meter, destination/current/departed time rows, paradox/stability warnings, mission objective, and control prompts.
- [ ] Add scalable UI, subtitle-safe layout, color-blind-safe warnings, text-size options, reduced-flash setting, and controller glyph switching.
- [ ] Keep the Canvas HUD behind a developer-only console variable.
- [ ] Gate: all critical state is understandable at 1080p from couch distance without opening logs or Blueprint debugging.

### Task 8: Add the Time-Travel Presentation Stack

**Files:**
- Create: `Source/BTTF_TemporalDrift/Public/TimeTravelPresentationComponent.h`
- Create: `Source/BTTF_TemporalDrift/Private/TimeTravelPresentationComponent.cpp`
- Create assets: `/Game/Niagara/NS_FluxCharge`, `NS_TemporalVortex`, `NS_FireTrails`, `NS_ArrivalFrost`
- Create assets: `/Game/Materials/PostProcess/M_TemporalDistortion`, material instances for each phase
- Create assets: `/Game/Audio/MetaSounds/MS_FluxHum`, `MS_TimeDeparture`, `MS_TimeArrival`

**Interfaces:**
- Consumes: state-machine delegates from Task 4.
- Produces: phase-specific Niagara, material, camera, light, and audio cues with completion callbacks.

- [ ] Add a presentation smoke test that verifies every phase has assigned VFX/audio assets and reduced-flash variants.
- [ ] Implement charge arcs and pitch-rising flux hum tied to charge percent.
- [ ] Implement departure flash, distortion, vortex, fire trails, camera impulse, and audio transition without changing gameplay state.
- [ ] Implement arrival frost, sparks, cooldown audio, and brief camera recovery.
- [ ] Profile GPU and game thread during five consecutive jumps; keep the vertical slice within the selected frame-time budget.
- [ ] Gate: presentation can be disabled entirely and the deterministic jump tests still pass.

### Task 9: Implement One Complete Vertical-Slice Mission

**Files:**
- Create: `Source/BTTF_TemporalDrift/Public/MissionSubsystem.h`
- Create: `Source/BTTF_TemporalDrift/Private/MissionSubsystem.cpp`
- Create: `Source/BTTF_TemporalDrift/Public/MissionDataAsset.h`
- Create: `Source/BTTF_TemporalDrift/Private/Tests/MissionSubsystemTests.cpp`
- Create asset: `/Game/Data/Missions/DA_Mission_ClocktowerCalibration`
- Create Blueprint actors under: `/Game/Blueprints/Missions/ClocktowerCalibration`

**Interfaces:**
- Produces: objective states `Inactive, Active, Completed, Failed`, mission events, checkpoint IDs, and paradox effects.

- [ ] Write tests for objective order, checkpoint restore, invalid event rejection, paradox reward/penalty, and mission completion persistence.
- [ ] Build the loop: meet Doc in 1985, collect calibration equipment, charge the DeLorean, jump to 1955, reach courthouse square, install equipment, avoid a paradox action, and return to 1985.
- [ ] Add clear map markers, trigger volumes, fail-safe resets, dialogue subtitles, and skip-safe short cinematics.
- [ ] Connect one optional action to a visible 1985 consequence and paradox increase.
- [ ] Save at objective boundaries and restore the exact active objective and era.
- [ ] Gate: a new player can finish the mission without developer guidance in 15-25 minutes.

### Task 10: Add Lightweight NPCs, Traffic, and Era Population

**Files:**
- Create: `Source/BTTF_TemporalDrift/Public/EraPopulationManager.h`
- Create: `Source/BTTF_TemporalDrift/Private/EraPopulationManager.cpp`
- Create assets under: `/Game/AI/Pedestrians`, `/Game/AI/Traffic`, `/Game/Data/Population`
- Create: `Source/BTTF_TemporalDrift/Private/Tests/EraPopulationTests.cpp`

**Interfaces:**
- Consumes: active era and mission exclusion zones.
- Produces: pooled pedestrians/traffic with era-specific appearance and density.

- [ ] Write tests for spawn budgets, pooling, era filtering, despawn distance, and mission-zone exclusion.
- [ ] Add simple sidewalk splines, crossing points, traffic routes, avoidance, and reaction to the player vehicle.
- [ ] Create small 1955 and 1985 population sets using shared skeletons and era-specific clothing/materials.
- [ ] Suspend distant AI and cap active agents to the performance budget.
- [ ] Gate: courthouse square feels inhabited while driving and time travel swaps the population without duplicates or long hitches.

### Task 11: Harden Save/Load, Settings, and Recovery

**Files:**
- Modify: `Source/BTTF_TemporalDrift/Public/BTTF_SaveGame.h`
- Modify: `Source/BTTF_TemporalDrift/Private/BTTF_SaveGame.cpp`
- Modify: `Source/BTTF_TemporalDrift/Public/BTTF_GameInstance.h`
- Modify: `Source/BTTF_TemporalDrift/Private/BTTF_GameInstance.cpp`
- Create: `Source/BTTF_TemporalDrift/Private/Tests/SaveGameTests.cpp`

**Interfaces:**
- Produces: versioned save schema containing era, vehicle state, mission/checkpoint, paradox, unlocks, settings, and last safe transform.

- [ ] Write round-trip, missing-file, corrupt-file, schema-version migration, and checkpoint recovery tests.
- [ ] Separate profile settings from campaign progress and write saves atomically through a temporary slot.
- [ ] Save only stable identifiers and values; resolve actor references through IDs after world streaming is ready.
- [ ] Add New Game, Continue, Load Checkpoint, Reset Settings, and Delete Save confirmations.
- [ ] Gate: force-close during play, relaunch, and continue without losing the last completed objective or spawning below the world.

### Task 12: Optimize, Package, and Accept the Windows Alpha

**Files:**
- Modify: `Config/DefaultEngine.ini`
- Modify: `Config/DefaultGame.ini`
- Modify: `Config/DefaultInput.ini`
- Modify: `BTTF_TemporalDrift.uproject`
- Modify: `Scripts/Build/package_windows.ps1`
- Create: `Docs/QA/VerticalSliceChecklist.md`
- Create: `Docs/QA/KnownIssues.md`

**Interfaces:**
- Produces: reproducible Windows Development and Shipping packages plus acceptance evidence.

- [ ] Define budgets: target resolution, frame rate, game/GPU frame time, memory, streaming hitch, active AI, draw calls, and package size.
- [ ] Capture Unreal Insights traces for driving, layer switch, jump VFX, mission checkpoint, save/load, and courthouse-square population.
- [ ] Fix blocking errors, shader/asset load warnings, missing redirectors, invalid references, collision holes, and persistent streaming hitches.
- [ ] Run the full `BTTF` automation suite and both Hill Valley validators; expect zero failures.
- [ ] Package Development, complete the entire mission, then package Shipping and repeat a launch/drive/jump/save/load smoke test.
- [ ] Test keyboard/mouse and controller at 1080p, UI scaling, reduced flash, audio sliders, pause/resume, alt-tab, and clean quit.
- [ ] Gate: a packaged build on a machine without the Unreal Editor completes the vertical slice and produces actionable logs if it fails.

---

## Post-Vertical-Slice Expansion

Only after M6 passes:

1. Add Alternate 1985 as the second consequence-heavy layer.
2. Add 1885 with off-road/rail traversal and period mission content.
3. Add 2015 hover mode after ground driving and arrival placement are stable.
4. Add 2045 and Tipler-cylinder mechanics as optional late-game systems.
5. Expand Hill Valley beyond courthouse square using the same neutral-base/era-layer contract.
6. Add named-character AI, dialogue trees, additional missions, collectibles, upgrades, and a full campaign progression model.

## Definition of Done for the Vertical Slice

- The player can start a new game, drive a recognizable DeLorean, operate complete controls, charge flux, select 1955, cross 88 MPH, see/hear a polished transition, arrive safely in transformed Hill Valley, complete the clocktower mission, return to a visibly affected 1985, save, quit, and continue.
- No required action depends on debug text, Output Log inspection, or editor-only intervention.
- The full automation suite, map validators, editor build, cook, and Windows package succeed from documented PowerShell commands.
- Known non-blocking limitations are recorded in `Docs/QA/KnownIssues.md` with reproduction steps.
