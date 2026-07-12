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

### Task 13: Build the Complete Playable Hill Valley Region

**Files:**
- Create: `Source/BTTF_TemporalDrift/Public/HillValleyWorldValidator.h`
- Create: `Source/BTTF_TemporalDrift/Private/HillValleyWorldValidator.cpp`
- Create: `Source/BTTF_TemporalDrift/Private/Tests/HillValleyWorldTests.cpp`
- Create/modify assets under: `/Game/Environment/HillValley/Neutral`, `/1985`, `/1955`, `/Landscape`, `/Foliage`, `/Roads`, `/Buildings`, `/Signage`, `/Props`
- Modify: `/Game/Levels/LVL_TimeTravelTest`

**Interfaces:**
- Produces: a World Partition Hill Valley region with courthouse square, civic blocks, residential streets, commercial streets, school district, rural edge, road network, terrain, vegetation, signed buildings, interiors for mission-critical locations, and navigation coverage.

- [ ] Back up the map and write validator tests for required districts, road connectivity, terrain bounds, landscape materials, foliage density, building counts, named signage, collision, navigation, spawn clearance, era-layer assignment, and World Partition streaming cells.
- [ ] Run `BTTF.World.HillValleyComplete`; expect failures listing missing districts and content categories.
- [ ] Sculpt a complete playable landscape with town basin, surrounding hills, rural approaches, creek/drainage, road grades, sidewalks, alleys, parking, and traversal-safe boundaries.
- [ ] Build a modular architecture kit covering courthouse/civic, 1950s and 1980s commercial façades, residential homes, school structures, service buildings, garages, and rural structures.
- [ ] Finish courthouse square with a readable clocktower, plaza, lawns, paths, monuments, storefront perimeter, alleys, parking, and mission access points.
- [ ] Add unique readable signs for every major business and civic destination; prohibit placeholder text and repeated storefront names within the same block.
- [ ] Add landscape material blending, grass, shrubs, deciduous trees, planters, utility poles, street lamps, benches, bins, hydrants, mailboxes, phone booths, fences, road markings, and traffic signage.
- [ ] Create collision and simplified interiors for the courthouse, diner, garage/lab, school entry, and mission-critical storefronts; keep non-enterable buildings visually opaque and clearly closed.
- [ ] Assign neutral geography permanently and era-specific architecture, signs, vehicles, props, vegetation, lighting, and construction states to the correct Data Layers.
- [ ] Generate navigation data, pedestrian sidewalks, crossings, traffic splines, parking nodes, and emergency/reset volumes across the complete region.
- [ ] Profile streaming while driving a full circuit at top speed; eliminate visible holes, blocking hitches, unloaded road cells, and below-world reset failures.
- [ ] Gate: drive from rural edge through every district and around courthouse square without collision holes or dead ends; every destination is identifiable by architecture or signage; 1955 and 1985 are immediately distinguishable while geography remains consistent.

### Task 14: Add a Playable On-Foot Hero Character

**Files:**
- Create: `Source/BTTF_TemporalDrift/Public/BTTFHeroCharacter.h`
- Create: `Source/BTTF_TemporalDrift/Private/BTTFHeroCharacter.cpp`
- Create: `Source/BTTF_TemporalDrift/Public/VehicleInteractionComponent.h`
- Create: `Source/BTTF_TemporalDrift/Private/VehicleInteractionComponent.cpp`
- Create: `Source/BTTF_TemporalDrift/Private/Tests/HeroCharacterTests.cpp`
- Create assets under: `/Game/Characters/Hero`, `/Game/Input/Hero`, `/Game/Animations/Hero`

**Interfaces:**
- Produces: walk, run, jump, crouch, interact, enter/exit vehicle, conversation targeting, mission item use, safe spawn/reset, and camera switching.

- [ ] Write tests for movement configuration, input assets, possession handoff, nearest-door selection, blocked exit rejection, safe exit placement, vehicle re-entry, interaction range, and checkpoint restoration.
- [ ] Create or license a legally usable fully rigged hero model with LODs, facial/viseme support, clothing appropriate to the 1985 base era, physics asset, animation Blueprint, and retargeted locomotion set.
- [ ] Implement third-person movement, camera collision, sprint stamina, crouch, jump, interaction trace, and accessible input prompts using Enhanced Input for keyboard/mouse and controller.
- [ ] Implement deterministic enter/exit handoff between `ABTTFHeroCharacter` and `ADeLoreanVehicle`, preserving vehicle state and placing the hero only on a clear navigable side.
- [ ] Add interaction interfaces for doors, pickups, mission devices, NPC conversations, vehicle controls, and contextual prompts.
- [ ] Add safe reset, fall recovery, out-of-bounds recovery, and checkpoint restore without duplicating the pawn or losing the PlayerController.
- [ ] Gate: start on foot, enter the DeLorean, drive, stop, exit on either clear side, talk to an NPC, collect/use a mission item, re-enter, and save/load the exact hero/vehicle state.

### Task 15: Implement Dialogue, Conversation, and Cinematic Delivery

**Files:**
- Create: `Source/BTTF_TemporalDrift/Public/DialogueSubsystem.h`
- Create: `Source/BTTF_TemporalDrift/Private/DialogueSubsystem.cpp`
- Create: `Source/BTTF_TemporalDrift/Public/DialogueDataAsset.h`
- Create: `Source/BTTF_TemporalDrift/Private/DialogueDataAsset.cpp`
- Create: `Source/BTTF_TemporalDrift/Private/Tests/DialogueSubsystemTests.cpp`
- Create assets under: `/Game/Dialogue`, `/Game/UI/Dialogue`, `/Game/Sequences/Dialogue`

**Interfaces:**
- Produces: conversation nodes, speaker IDs, localized lines, response choices, conditions, mission events, paradox consequences, subtitle timing, skip/advance behavior, and save-safe conversation state.

- [ ] Write tests for node order, conditional branches, unavailable choices, repeated conversations, interruption/resume, mission-event dispatch, paradox consequences, localization keys, subtitle timing, and save/load restoration.
- [ ] Create data-driven conversation assets; dialogue text, conditions, responses, and events must not be hard-coded in widgets or actor Blueprints.
- [ ] Implement interact-to-talk, speaker focus, camera framing, response selection, input lock policy, distance interruption, skip-safe progression, and restoration of player control.
- [ ] Build subtitle-safe UMG with speaker name, line text, response choices, continue indicator, controller glyphs, text-size setting, background opacity, and configurable auto-advance.
- [ ] Add optional voice slots, facial animation/viseme hooks, gesture montages, look-at behavior, and short Level Sequence support without making voice audio mandatory for comprehension.
- [ ] Connect dialogue conditions and events to mission objectives, era, inventory, paradox, prior choices, and save data through stable IDs.
- [ ] Author baseline conversations for the hero, Doc-equivalent inventor, courthouse contact, diner staff, school contact, antagonist/rival, and ambient townspeople in both 1985 and 1955.
- [ ] Gate: complete branching conversations with keyboard and controller, skip/replay safely, interrupt by leaving range, reload mid-conversation, and preserve every mission/paradox consequence exactly once.

### Task 16: Expand Into a Multi-Mission Hill Valley Campaign

**Files:**
- Modify: `Source/BTTF_TemporalDrift/Public/MissionSubsystem.h`
- Modify: `Source/BTTF_TemporalDrift/Private/MissionSubsystem.cpp`
- Create: `Docs/Design/MissionCampaign.md`
- Create mission assets under: `/Game/Data/Missions/Campaign`
- Create mission actors/sequences under: `/Game/Blueprints/Missions/Campaign`, `/Game/Sequences/Missions`

**Interfaces:**
- Consumes: hero interaction, DeLorean driving/time travel, full Hill Valley map, dialogue, NPC/traffic, save/load, paradox, and era layers.
- Produces: a campaign graph with objectives, checkpoints, optional actions, fail/recovery paths, dialogue, consequences, rewards, and return-to-free-roam state.

- [ ] Write `Docs/Design/MissionCampaign.md` with the campaign premise, character roster, location roster, mission dependency graph, objective-by-objective flows, dialogue beats, optional choices, paradox consequences, rewards, checkpoints, failure recovery, and required assets.
- [ ] Mission 1 — **First Test Run:** meet the inventor in 1985, learn on-foot/vehicle controls, collect calibration parts across town, install them, and complete a timed driving test.
- [ ] Mission 2 — **Clocktower Calibration:** charge flux, select 1955, cross 88 MPH, arrive safely, reach courthouse square on foot, install the clocktower sensor, and avoid one documented paradox action.
- [ ] Mission 3 — **A Town Out of Time:** investigate changed storefront signs and NPC memories, follow dialogue clues through the diner/school/courthouse, and identify the altered historical event.
- [ ] Mission 4 — **The Missing Component:** use driving, pedestrian exploration, dialogue choices, and a restricted-area interaction to recover a time-machine component without exposing future technology.
- [ ] Mission 5 — **Race the Lightning:** prepare the courthouse route, coordinate NPC positions through dialogue, complete a checkpointed high-speed finale, trigger the return jump, and arrive in consequence-altered 1985.
- [ ] Add at least two optional side missions using existing districts: a pedestrian favor/investigation and a vehicle courier/time-trial, each with era-specific outcomes.
- [ ] Implement objective markers, map destinations, dialogue triggers, inventory items, fail-safe resets, skip-safe cinematics, checkpoint saves, mission exclusion zones, and post-mission free roam.
- [ ] Connect at least three player choices to visible signage, prop, population, dialogue, or access changes in returned 1985; record paradox change and stable consequence IDs.
- [ ] Run new-player usability tests and tune the critical path to 60-120 minutes while keeping each mission independently restartable from its last checkpoint.
- [ ] Gate: a new player can complete the full campaign without developer guidance, every required objective works on keyboard/controller, save/quit/continue preserves exact state, and all consequence changes survive era travel and packaging.

---

### Task 17: Complete Five-Era Hill Valley Production

**Files:** Create era content under `/Game/Environment/HillValley/1885`, `/1955`, `/1985`, `/1985A`, `/2015`, `/2045`; modify `LVL_TimeTravelTest`; extend Hill Valley validators.

- [ ] Preserve one persistent World Partition street grid and finish separate dressing, architecture, interiors, navigation, lighting, weather, traffic routes, and population profiles for 1885, 1955, 1985, systemic 1985-A, 2015, and 2045.
- [ ] Build the era landmarks specified by the expanded master plan: frontier courthouse/saloon/blacksmith/mine/ravine; 1955 square/cafe/records/theater/school/Lyon Estates/Brown Mansion; 1985 mall/garage/fitness center; 1985-A casino/patrol/toxic industry; 2015 skyways/Cafe 80's/Hilldale; 2045 three-tier city/Heritage District/slipstreams/Tannen skyline variants.
- [ ] Make all authored buildings explorable with era-consistent interiors, interactive props, readable changing newspapers, secrets, and a five-era wall-cavity treasure chain.
- [ ] Add seasonal, day/night, rain, fog, snow, and scheduled thunderstorm profiles, including a gameplay-authoritative November 12, 1955 countdown.
- [ ] Gate: validators pass for every era; a full ground/air traversal circuit has no holes or streaming blockers; blind screenshots identify every era and timeline-health variant.

### Task 18: Implement Ripple Facts, Genealogy, and the Fading Photograph

**Files:** Create `TimelineFactSubsystem`, `TimelineFactDataAsset`, `GenealogySubsystem`, `FadingPhotographViewModel`, tests, and assets under `/Game/Data/Timeline`.

- [ ] Implement a stable-ID dependency graph evaluated on era transitions, with deterministic recomputation, cycle detection, provenance, save migration, and debug visualization.
- [ ] Connect facts to newspapers, storefront names, road names, interiors, family trees, radio lines, weather anomalies, access state, population profiles, 1985-A threshold, and 2045 physical rearrangement.
- [ ] Simulate roughly 60 named cross-era citizens with ancestry/descendant links, schedules, relationships, dialogue conditions, and consequence-safe spawn IDs; scale ambient pedestrians separately through pooling.
- [ ] Implement the inventory photograph as the universal failure indicator with progressive subject fading, critical hand-fade warning, accessibility-safe reduced-flash mode, and exact recovery rules.
- [ ] Add paradox glitches—duplicate citizens, wrong-era weather/props, and 2045 Temporal Enforcement—only through deterministic fact/paradox events.
- [ ] Gate: a fixed set of historical mutations produces identical five-era facts across repeated runs, save/load, and packaged builds.

### Task 19: Finish Marty Character, Outfits, Skills, Boards, and Chicken System

**Files:** Extend `BTTFHeroCharacter`; create outfit, skill, board, parkour, temperance, and tests under `/Game/Characters/Marty`.

- [ ] Replace placeholder presentation with a legally authorized/usable rigged Marty character, facial rig, LODs, physics, animation Blueprint, and era-reactive outfit system.
- [ ] Implement orange vest, 2015 auto-fit/power-lace outfit, Eastwood poncho/hat, radiation suit, and 2045 reenactor disguise with explicit NPC disposition/traversal/intimidation modifiers.
- [ ] Implement Performance, Marksmanship, Board Mastery, and Tinkering skill trees with stable unlock IDs, costs, UI, save persistence, and mission gates.
- [ ] Add climbing, vaulting, sliding, ledge movement, rooftop chains, skateboard/hoverboard locomotion, skitching, and safe moving-vehicle/skyway grabs.
- [ ] Implement dialogue-driven chicken provocations, risky optional objectives, hidden Temperance growth, resistance feedback, and ending conditions.
- [ ] Gate: all traversal/outfit/skill paths work with keyboard/controller, recover safely, persist, and affect dialogue/world facts exactly as specified.

### Task 20: Build the Full Branching Five-Act Campaign and Endings

**Files:** Expand `MissionCampaign.md`, mission subsystem/data, dialogue, sequences, and tests under `/Game/Data/Missions/MainCampaign`.

- [ ] Author the trilogy-spine objectives—parents' first kiss, dance, lightning run, Almanac recovery, 1985-A dismantling, Buford conflict—plus the new 2045 reconciliation act.
- [ ] Allow safe re-ordering after era unlocks through explicit dependency/availability rules; every branch has checkpoint, fail/recovery, cinematic skip, dialogue variant, and fact consequence.
- [ ] Produce canonical-happy, Tannen-owned 2045, Doc's Choice, and intermediate endings from paradox history, Temperance, Tannen outcomes, ravine state, and McFly family facts.
- [ ] Add fully authored subtitle/voice/gesture/camera slots for every required cinematic while keeping all comprehension accessible without voice audio.
- [ ] Gate: automated graph coverage proves no unreachable required mission/endings; new-player playthroughs complete every ending without editor intervention.

### Task 21: Deliver 40+ Side Missions, Mini-Games, Collectibles, and World Events

**Files:** Create data/assets under `/Game/Data/Missions/Side`, `/MiniGames`, `/Collectibles`, `/WorldEvents`; add subsystem tests.

- [ ] Author at least eight side missions per era, including cross-era parts delivery, Goldie campaign, Uncle Joey, manure rivalry, Needles races, and preservation-society chain.
- [ ] Implement Wild Gunman, poker, faro, dance rhythm performance, hoverboard parks, slipstream races, hydrating pizza, horse shoeing, stagecoach escort, festival performance, and era economies.
- [ ] Add Tales from Space issues, Telegraph front pages, Doc marginalia blueprints, 88 lightning bolts, and completion/reward tracking.
- [ ] Add deterministic pooled random events with cooldowns, spawn budgets, failure cleanup, and cross-era echo events.
- [ ] Gate: all content can start, finish/fail, save/reload, and cleanly release actors; collectible counts and rewards survive schema migration.

### Task 22: Implement Combat, Stealth, Gadgets, and Era Detection Rules

**Files:** Create combat/stealth/gadget components, AI perception/state trees, tests, and content under `/Game/Combat`, `/Stealth`, `/Gadgets`.

- [ ] Implement non-lethal-first hand-to-hand combat, block/dodge/counters, Tannen archetypes, environmental takedowns, manure interactions, and the learned parking-lot left hook.
- [ ] Implement stealth spaces and era rules for Tannen household, Strickland office, casino tower, Delgado mine, and 2045 headquarters, including hearing differences and drone surveillance.
- [ ] Implement camcorder evidence, alpha-rhythm device, walkie-talkies, binoculars, hoverboard variants, and portable Mr. Fusion with crafting/mission gates.
- [ ] Gate: combat and stealth encounters support recovery, accessibility assists, controller play, save/checkpoints, and no mandatory lethal outcome where the design specifies alternatives.

### Task 23: Complete DeLorean Damage, Upgrades, Date Entry, and Fuel Economies

**Files:** Extend vehicle/tuning/time circuits; create damage, upgrade, fuel, date-entry data and tests under `/Game/Vehicles/DeLorean`.

- [ ] Add visual/mechanical damage, repair, hover conversion, whitewalls, railroad wheels, mag-lev skids, and stable handling profiles for each configuration.
- [ ] Implement diegetic destination date entry that honors valid mistyped dates through authored date/content routing and safely rejects impossible/unavailable destinations.
- [ ] Keep physical 88-MPH runway planning authoritative in ground eras and full 3D corridor travel in 2045.
- [ ] Implement plutonium, scheduled lightning, Mr. Fusion, and era-appropriate repair/fuel economies with inventory/crafting/save support.
- [ ] Gate: every configuration completes its era test course, damages/repairs deterministically, jumps correctly, and passes clean-package controller smoke tests.

### Task 24: Add Era Traffic, Hijacking/Hitching, and Full Population Simulation

**Files:** Extend `EraPopulationManager`; create traffic vehicles, mounts, splines, pooling, schedule/genealogy integration, and tests.

- [ ] Implement horses/wagons/stagecoaches, tail-fin cruisers, 1980s sedans, skyway flyers, and 2045 autonomous swarms with era filtering, reaction, collision, pooling, and performance budgets.
- [ ] Support authorized gameplay interactions: hitching rides, board skitching, horse mounting, mission vehicle commandeering, and skyway grabs, with safe placement/recovery.
- [ ] Populate sidewalks/interiors with hundreds of pooled ambient citizens and persistent named-cast routines without duplicate stable IDs across layer switches.
- [ ] Gate: traffic/population swaps across every era without long hitch, duplicate named citizens, mission-zone contamination, or frame-budget violation.

### Task 25: Add Multiplayer, Competitive Modes, Leaderboards, and Achievements

**Files:** Create networked game modes, replicated mission/time state, online interfaces, tests, and content under `/Game/Multiplayer`.

- [ ] Implement cooperative campaign synchronization, including the real-time two-role clocktower run, shared fact/ripple authority, reconnect, host migration policy, and walkie-talkie voice routing.
- [ ] Implement hoverboard racing, Almanac Heist, and Paradox Royale with matchmaking/session lifecycle, anti-stall rules, spectating, results, and cleanup.
- [ ] Add leaderboards and named achievements from the master plan with offline queue/retry and platform-safe identifiers.
- [ ] Gate: two-machine packaged tests pass join, mission, era switch, disconnect/reconnect, results, and clean shutdown without divergent timeline facts.

### Task 26: Deliver Photo Mode, Schematic Map/GPS, Crafting, and Mod Support

**Files:** Create photo/map/crafting/mod subsystems, UIs, schemas, tests, and developer documentation.

- [ ] Implement photo mode with camera controls and five era film-stock filters while preventing mission/network exploits.
- [ ] Implement Doc's schematic map/GPS with cross-era pushpin/string cause-effect overlays, discovered destinations, and accessibility navigation.
- [ ] Implement data-driven crafting for gadgets, outfits, vehicle parts, and 1885 workarounds with recipes, inventory, economy, and migration.
- [ ] Expose versioned mod manifests, custom era/data-layer registration, timeline facts, missions/dialogue, validation, packaging examples, and safe failure isolation.
- [ ] Gate: features work in Shipping, save correctly, support controller/UI scaling, and invalid mods fail with actionable logs rather than corrupting saves.

### Task 27: Final Five-Era Audio, Visuals, Optimization, Packaging, and Acceptance

**Files:** Extend audio/presentation/settings/QA/package scripts and content across `/Game/Audio`, `/VFX`, `/Materials`, `/UI`, `Docs/QA`.

- [ ] Produce era-aware adaptive orchestral layers, original in-style radio libraries, flux/sonic-boom/fire-trail/hover sounds, city ambience, dialogue mix, subtitles, and full volume/accessibility controls.
- [ ] Deliver brushed-steel reflections, era materials, 10:04 PM clocktower shadows, volumetric storm lightning, healthy/corrupted grading, paradox glitches, scalable Lumen/Nanite settings, reduced-flash variants, and photo filters.
- [ ] Profile every era, traversal mode, population peak, combat, mission finale, multiplayer mode, ripple recompute, save/load, and package startup against explicit CPU/GPU/memory/streaming/network budgets.
- [ ] Run full automation, validators, campaign/endings, 40+ side content audit, two-machine multiplayer, accessibility, keyboard/controller, Development/Shipping, clean-machine, alt-tab, crash-recovery, and mod smoke tests.
- [ ] Publish source and reproducible builds to GitHub with licenses, third-party attribution, QA evidence, known issues, crash-log instructions, and signed versioned Windows packages.
- [ ] Gate: the five-era game and all required modern features complete on a machine without Unreal Editor, with no blocker and actionable logs for every non-blocking known issue.

---

## Definition of Done for the Vertical Slice

- The player can start a new game, drive a recognizable DeLorean, operate complete controls, charge flux, select 1955, cross 88 MPH, see/hear a polished transition, arrive safely in transformed Hill Valley, complete the clocktower mission, return to a visibly affected 1985, save, quit, and continue.
- No required action depends on debug text, Output Log inspection, or editor-only intervention.
- The full automation suite, map validators, editor build, cook, and Windows package succeed from documented PowerShell commands.
- Known non-blocking limitations are recorded in `Docs/QA/KnownIssues.md` with reproduction steps.

## Definition of Done for the Expanded Campaign

- The World Partition map contains a complete landscaped Hill Valley region with traversable connected districts, recognizable signed destinations, collision/navigation coverage, populated sidewalks and roads, and visibly distinct 1985/1955 era dressing.
- The player can freely transition between the on-foot hero and the DeLorean, explore, interact, converse, collect/use mission items, recover from invalid positions, and save/load either state.
- Data-driven dialogue supports branching choices, localization-ready subtitles, mission/paradox events, interruption, skip-safe cinematics, controller navigation, and exact-once persistence.
- The five-mission campaign and two side missions complete from a new game through the return to consequence-altered 1985 without editor intervention or developer guidance.
- Full automation, world validators, campaign playthrough, save/recovery tests, Development package, Shipping package, keyboard/mouse smoke test, and controller smoke test all pass with evidence recorded under `Docs/QA`.

## Definition of Done for the Expanded Master Game

- 1885, 1955, 1985, systemic 1985-A, 2015, and 2045 share one learned Hill Valley geography while providing complete era-specific architecture, interiors, landscaping, weather, population, traffic, traversal, economy, missions, and audiovisual identity.
- Timeline facts, genealogy, photograph fading, paradox glitches, signs, newspapers, schedules, dialogue, and 2045 rearrangement recompute deterministically from player choices and survive save migration and multiplayer synchronization.
- Marty supports the specified outfits, four skill trees, parkour, boards, vehicle grabs, Chicken/Temperance choices, combat, stealth, gadgets, interaction, and all DeLorean configurations/fuel/date-entry systems.
- The branching five-act campaign, multiple endings, at least 40 side missions, mini-games, collectibles, and random events are content-complete, accessible, checkpointed, and playable without editor intervention.
- Cooperative campaign, three competitive modes, leaderboards, achievements, photo mode, schematic map/GPS, crafting, and documented versioned mod support pass their packaged acceptance suites.
- Final Windows Development and Shipping packages pass five-era, campaign/endings, side-content, multiplayer, accessibility, keyboard/controller, performance, clean-machine, recovery, and mod smoke tests with evidence and known issues published to GitHub.
