# Temporal Drift Comprehensive Remaining Work Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the current UE 5.8 development build into an accepted keyboard-playable vertical slice, then a content-complete Hill Valley campaign, and finally the five-era master game described by the existing 27-task roadmap.

**Architecture:** Keep authoritative gameplay state in focused C++ systems, use Enhanced Input for possession-safe control contexts, and use one World Partition Hill Valley map with Data Layers for era and timeline variants. Treat generated assets as reproducible source output, keep every milestone playable, and require automation plus live packaged evidence before advancing a release gate.

**Tech Stack:** Unreal Engine 5.8, C++20, Enhanced Input, Chaos Vehicles, World Partition, Data Layers, UMG, Niagara, Unreal Python commandlets, PowerShell build scripts, Unreal Automation Tests, Git/GitHub.

## Global Constraints

- Preserve `/Game/Levels/LVL_TimeTravelTest` as the working map until vertical-slice acceptance.
- Arrow keys move the possessed character or vehicle; `W/A/S/D` control the camera only.
- Gameplay camera uses no mouse input; the cursor remains visible.
- `G` enters/exits the DeLorean, `C` cycles presets, and `V` toggles auto-chase.
- Manual camera input suspends auto-chase; it recenters smoothly after 1.5 seconds when enabled.
- The gameplay time-jump threshold remains at or below 40 MPH.
- 1985 and 1955 are the release-critical eras for the vertical slice.
- Every production-code bug fix or behavior change begins with a failing automation test.
- Every milestone ends with a buildable, launchable game; no long content-only integration branch.
- Do not claim a gate complete from generated assets or unit tests alone when the gate requires PIE or packaged evidence.

---

## Release Gate A: Playable and Stable Vertical Slice

### Task 1: Preserve and Verify the Current Integration Baseline

**Files:**
- Modify: `Docs/QA/RoadmapStatus.md`
- Modify: `Docs/QA/VerticalSliceChecklist.md`
- Inspect: `Source/BTTF_TemporalDrift/Private/Tests/`
- Inspect: `Content/Levels/LVL_TimeTravelTest.umap`
- Inspect: `Content/__ExternalActors__/Levels/LVL_TimeTravelTest/`

**Produces:** A reviewable checkpoint containing the existing UE 5.8 compile fixes, regenerated Hill Valley assets, and an exact list of failing tests.

- [ ] Stop the running game and confirm no editor process holds build binaries.
- [ ] Review the large dirty worktree by category: C++, tests, scripts, mission assets, map, and external actors; remove only confirmed transient files such as `__pycache__`.
- [ ] Run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\build_editor.ps1`; expect `Result: Succeeded`.
- [ ] Run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\run_automation.ps1 -Filter BTTF`; record total, passed, and failed tests.
- [ ] Confirm `BTTF.Hero.VehicleHandoff` and `BTTF.World.HillValleyComplete` after the latest handoff fix and map regeneration.
- [ ] Commit the baseline in coherent commits so code fixes and generated world output remain independently reviewable.

### Task 2: Implement the Final Keyboard Input Contract

**Files:**
- Modify: `Source/BTTF_TemporalDrift/Public/BTTF_PlayerController.h`
- Modify: `Source/BTTF_TemporalDrift/Private/BTTF_PlayerController.cpp`
- Modify: `Source/BTTF_TemporalDrift/Public/DeLoreanVehicle.h`
- Modify: `Source/BTTF_TemporalDrift/Private/DeLoreanVehicle.cpp`
- Modify: `Source/BTTF_TemporalDrift/Public/BTTFHeroCharacter.h`
- Modify: `Source/BTTF_TemporalDrift/Private/BTTFHeroCharacter.cpp`
- Modify: `Scripts/create_complete_vehicle_input.py`
- Modify: `Source/BTTF_TemporalDrift/Private/Tests/VehicleInputTests.cpp`
- Modify: `Source/BTTF_TemporalDrift/Private/Tests/HeroCharacterTests.cpp`
- Modify: `Source/BTTF_TemporalDrift/Private/Tests/EnhancedInputAssetTests.cpp`

**Produces:** Possession-safe arrow movement and keyboard-only camera mappings for both pawns.

- [ ] Add failing tests proving arrows move/steer, `W/A/S/D` do not move either pawn, and possession swaps mapping contexts exactly once.
- [ ] Run focused `BTTF.Vehicle.Input`, `BTTF.Hero`, and `BTTF.Input` tests; expect the new assertions to fail.
- [ ] Add separate Enhanced Input actions for pawn movement and camera orbit; map arrows only to movement and `W/A/S/D` only to orbit.
- [ ] Route direct-key fallbacks through the same handlers and guard against duplicate Enhanced Input invocation.
- [ ] Disable mouse-look bindings and set the gameplay controller to keep the cursor visible.
- [ ] Rebuild and rerun focused tests; expect all new input-contract tests to pass.

### Task 3: Fix Reliable `G` Vehicle Entry and Exit

**Files:**
- Modify: `Source/BTTF_TemporalDrift/Private/BTTF_PlayerController.cpp`
- Modify: `Source/BTTF_TemporalDrift/Private/VehicleInteractionComponent.cpp`
- Modify: `Source/BTTF_TemporalDrift/Public/VehicleInteractionComponent.h`
- Modify: `Source/BTTF_TemporalDrift/Private/Tests/HeroCharacterTests.cpp`

**Produces:** One controller-owned `G` action that works before and after possession and cannot strand the player.

- [ ] Add failing tests for nearest-vehicle entry, left-side exit, right-side fallback, rear fallback, fully blocked exit, and repeat enter/exit possession.
- [ ] Run `BTTF.Hero.VehicleHandoff`; verify failures identify missing runtime behavior rather than fixture errors.
- [ ] Make the player controller own the interaction action across pawn possession.
- [ ] Evaluate left, right, then rear exit candidates with the hero and occupied vehicle ignored in collision queries.
- [ ] Preserve vehicle possession and show a short message when every exit is blocked.
- [ ] Rerun the handoff suite and perform ten consecutive `G` enter/exit cycles in PIE.

### Task 4: Add Shared Manual and Auto-Chase Cameras

**Files:**
- Create: `Source/BTTF_TemporalDrift/Public/KeyboardCameraStateComponent.h`
- Create: `Source/BTTF_TemporalDrift/Private/KeyboardCameraStateComponent.cpp`
- Create: `Source/BTTF_TemporalDrift/Private/Tests/KeyboardCameraTests.cpp`
- Modify: `Source/BTTF_TemporalDrift/Private/DeLoreanVehicle.cpp`
- Modify: `Source/BTTF_TemporalDrift/Private/BTTFHeroCharacter.cpp`
- Modify: `Scripts/create_complete_vehicle_input.py`

**Produces:** Shared clamped orbit state, chase toggling, preset cycling, and 1.5-second recentering.

- [ ] Add failing tests for yaw/pitch input, pitch clamps, chase suspension, the exact 1.5-second delay, smooth recenter, `V` persistence, `C` cycling, and hover roll isolation.
- [ ] Run `BTTF.Camera`; expect failures because the shared component does not exist.
- [ ] Implement the component with frame-rate-independent yaw/pitch rates, inactivity timing, and interpolation to preset orientation.
- [ ] Connect both pawn spring arms to the component; ensure the vehicle spring arm never inherits roll.
- [ ] Add character chase/shoulder presets and preserve the vehicle's chase/hood/bumper/cockpit presets.
- [ ] Rerun camera and vehicle tests, then verify arrows plus `W/A/S/D`, `C`, and `V` in driving, walking, and hover modes.

### Task 5: Complete the Hero DeLorean Gameplay Gate

**Files:**
- Modify: `Source/BTTF_TemporalDrift/Private/DeLoreanVehicle.cpp`
- Modify: `Source/BTTF_TemporalDrift/Public/DeLoreanTuningData.h`
- Modify: `Source/BTTF_TemporalDrift/Private/Tests/VehicleTuningTests.cpp`
- Modify: `Docs/QA/HeroVehicleAcceptance.md`

**Produces:** Stable forward, reverse, steering, braking, handbrake, hover, reset, and camera behavior at the 40-MPH threshold.

- [ ] Add failing regression tests for reverse from rest, forward-to-reverse transition, hover yaw steering, hover camera stability, and reset recovery.
- [ ] Tune Chaos torque, braking, steering curve, suspension, center of mass, hover stabilization, and camera response one variable at a time.
- [ ] Run the complete vehicle suite after every confirmed root-cause fix.
- [ ] Complete the marked course in ground and hover modes without rollover, persistent oscillation, or loss of steering.
- [ ] Record speed, reverse, hover, camera, and reset evidence in `Docs/QA/HeroVehicleAcceptance.md`.

### Task 6: Upgrade Hill Valley to a Photoreal Material and Lighting Baseline

**Files:**
- Create: `Scripts/hill_valley/create_photoreal_material_library.py`
- Create: `Scripts/hill_valley/apply_photoreal_materials.py`
- Create: `Scripts/hill_valley/validate_photoreal_materials.py`
- Modify: `Scripts/hill_valley/build_hill_valley_square.py`
- Modify: `Scripts/hill_valley/hill_valley_era_dressing_common.py`
- Modify: `Scripts/fix_level_lighting.py`
- Create: `Source/BTTF_TemporalDrift/Private/Tests/PhotorealMaterialTests.cpp`
- Modify assets: `/Game/Materials/HillValley/`

**Produces:** Reusable PBR masters and instances for roads, concrete, masonry, storefronts, glass, metals, terrain, vegetation, water, and era weathering.

- [ ] Add failing validation for master parent references, non-flat roughness, normal/detail inputs, valid UV scale, and representative actor assignments.
- [ ] Build opaque, masked, translucent-glass, and layered-weathering master materials with exposed instance parameters.
- [ ] Generate material instances using repository-owned maps or deterministic procedural detail; do not download unlicensed textures.
- [ ] Replace flat-color assignments in courthouse square, roads, sidewalks, buildings, landscape, river, and dressing scripts.
- [ ] Calibrate daylight, skylight, Lumen, reflection, exposure, and post-process values after material migration.
- [ ] Run the material validator twice to prove idempotence and capture matching courthouse/street/terrain screenshots.

### Task 7: Close Hill Valley Region and Streaming Gaps

**Files:**
- Modify: `Scripts/hill_valley/build_hill_valley_square.py`
- Modify: `Scripts/hill_valley/place_mission_volumes.py`
- Modify: `Source/BTTF_TemporalDrift/Private/Tests/HillValleyWorldTests.cpp`
- Modify: `Docs/QA/HillValleyRegionEvidence.md`

**Produces:** Traversable courthouse, downtown, school, suburb, industrial, river/rail, and rural approach circuit with valid collision and streaming.

- [ ] Rerun square, 1955, 1885, 1985-A, 2015, and 2045 generation from a clean commandlet process.
- [ ] Fix generator warnings that return nonzero commandlet status despite successful asset output.
- [ ] Verify road continuity, reset volumes, landscape boundaries, mission-volume placement, and named destination signage.
- [ ] Generate navigation and traffic/pedestrian route data without contaminating mission spaces.
- [ ] Profile a complete driving circuit and record streaming hitches, frame time, and memory.
- [ ] Close Task 13 only after live evidence satisfies `Docs/QA/HillValleyRegionEvidence.md`.

### Task 8: Finish the 1985-to-1955 Vertical-Slice Loop

**Files:**
- Modify: `Source/BTTF_TemporalDrift/Private/TimeTravelPresentationComponent.cpp`
- Modify: `Source/BTTF_TemporalDrift/Private/TimeCircuitsWidget.cpp`
- Modify: `Scripts/create_presentation_assets.py`
- Modify: `Scripts/create_presentation_vfx_audio.py`
- Modify: `Scripts/create_ui_widgets.py`
- Modify: `Docs/QA/VerticalSliceChecklist.md`

**Produces:** Final scalable HUD, readable time circuits, five consecutive player-driven jumps, and complete M02 return loop.

- [ ] Replace remaining Canvas debug presentation with authored UMG at 1080p.
- [ ] Finish departure charge, distortion, flash, fire trails, arrival frost, audio duck/crossfade, and reduced-flash variants.
- [ ] Import user-owned/licensed era music and verify live crossfades; placeholders remain valid when licensed files are absent.
- [ ] Perform five consecutive player-driven 1985-to-1955 jumps without QA commands.
- [ ] Complete M02 from new game through return to 1985 using placed actors and no editor intervention.
- [ ] Verify accessibility settings, readable warnings, destination date, lightning countdown, consequence summary, and fading photograph.

### Task 9: Harden Save, Recovery, Packaging, and Acceptance

**Files:**
- Modify: `Source/BTTF_TemporalDrift/Private/BTTFSaveSubsystem.cpp`
- Modify: `Source/BTTF_TemporalDrift/Private/Tests/SaveGameTests.cpp`
- Modify: `Scripts/Build/package_smoke_test.ps1`
- Modify: `Docs/QA/VerticalSliceChecklist.md`

**Produces:** A clean-machine Windows Development and Shipping build that survives checkpoint quit/continue and force-close recovery.

- [ ] Add or extend failing save tests for hero/vehicle possession, transforms, mission objective, era, timeline facts, dialogue, settings, and schema migration.
- [ ] Verify save/quit/continue at every M02 objective boundary.
- [ ] Force-close during play and confirm recovery never spawns below the world or repeats a consequence.
- [ ] Package Development and Shipping; run launch/drive/jump/save/load smoke tests outside the editor.
- [ ] Test keyboard-only 1080p acceptance, then retain controller testing as a compatibility gate without changing the keyboard contract.
- [ ] Record logs, artifact paths, hardware, frame rate, and every accepted exception.

---

## Release Gate B: Expanded Hill Valley Campaign

### Task 10: Complete M01-M05, Dialogue, Population, and Consequences

**Files:**
- Modify: `Scripts/create_campaign_missions.py`
- Modify: `Scripts/create_dialogue_assets.py`
- Modify: `Scripts/hill_valley/place_mission_volumes.py`
- Modify: `Source/BTTF_TemporalDrift/Private/MissionCoordinatorSubsystem.cpp`
- Modify: `Source/BTTF_TemporalDrift/Private/DialogueSubsystem.cpp`
- Modify: `Source/BTTF_TemporalDrift/Private/PopulationSpawnSubsystem.cpp`
- Modify: `Source/BTTF_TemporalDrift/Private/Tests/MissionCampaignTests.cpp`

**Produces:** A guided five-mission campaign with branching dialogue, ambient citizens, traffic, checkpoints, and visible timeline consequences.

- [ ] Finish live objective actors, dialogue graphs, fail/retry paths, checkpoints, and map markers for M01 through M05.
- [ ] Add spline traffic, named-citizen schedules, era-safe spawning, and mission-zone exclusions.
- [ ] Complete two side missions as production templates before scaling side content.
- [ ] Verify every fact mutation is deterministic across time travel and save/load.
- [ ] Run a blind new-player playthrough without developer instructions and resolve every progression blocker.
- [ ] Package and complete the entire campaign before accepting Gate B.

---

## Release Gate C: Five-Era Master Game

### Task 11: Complete Era Production and Core Player Systems

**Files:**
- Modify: `Scripts/hill_valley/build_1885_dressing.py`
- Modify: `Scripts/hill_valley/build_1985_alternate_dressing.py`
- Modify: `Scripts/hill_valley/build_2015_dressing.py`
- Modify: `Scripts/hill_valley/build_2045_dressing.py`
- Modify: `Source/BTTF_TemporalDrift/Private/TimelineFactSubsystem.cpp`
- Modify: `Source/BTTF_TemporalDrift/Private/TemporalDriveSubsystem.cpp`
- Modify: `Source/BTTF_TemporalDrift/Private/CraftingSubsystem.cpp`

**Produces:** Complete 1885, 1955, 1985, 1985-A, 2015, and 2045 traversal, economy, population, missions, audiovisual identity, and deterministic cross-era facts.

- [ ] Promote every era script from dressing scaffold to complete architecture, interiors, landscape, weather, population, traffic, missions, and audio.
- [ ] Complete Marty outfits, traversal, skill progression, boards, reputation, and chicken system.
- [ ] Complete DeLorean damage, repair, upgrades, fuel economies, direct date entry, and era-specific configurations.
- [ ] Complete combat, stealth, gadgets, detection, nonlethal paths, and accessibility assists.
- [ ] Validate every era's ground/air route, streaming, collision, navigation, missions, and save/load.

### Task 12: Complete Content Scale, Online Features, Tools, and Final Acceptance

**Files:**
- Modify: `Docs/superpowers/plans/2026-07-12-temporal-drift-game-upgrade-roadmap.md`
- Modify: `Docs/QA/RoadmapStatus.md`
- Create acceptance evidence under: `Docs/QA/`

**Produces:** The full five-act campaign, endings, 40+ side missions, world activities, optional modern features, and accepted Shipping build.

- [ ] Complete the branching five-act campaign and test every ending for reachability.
- [ ] Deliver at least 40 side missions, mini-games, collectibles, and random events with deterministic cleanup and persistence.
- [ ] Add full-era traffic/population simulation, photo mode, schematic map/GPS, crafting UI, and safe mod validation.
- [ ] Add multiplayer, competitive modes, leaderboards, and achievements only after single-player timeline authority is stable.
- [ ] Replace remaining placeholder visuals/audio, complete accessibility/localization, profile CPU/GPU/memory/streaming, and eliminate Shipping blockers.
- [ ] Run two-machine multiplayer tests plus clean-machine single-player five-era campaign tests.
- [ ] Mark Task 27 complete only when every master-game gate in the original roadmap has objective evidence.

---

## Recommended Execution Sequence

1. Tasks 1-5: restore trust in the playable controls and vehicle.
2. Tasks 6-7: raise Hill Valley visual quality and traversal integrity.
3. Tasks 8-9: accept and package the vertical slice.
4. Task 10: expand the accepted slice into the complete Hill Valley campaign.
5. Tasks 11-12: build and accept the five-era master game.

## Completion Reporting

After each task, update `Docs/QA/RoadmapStatus.md` with one of: **Not started**, **In progress**, **Code complete**, **Content complete**, or **Accepted**. Only **Accepted** means every automated, live PIE, and packaged gate for that task has evidence. Keep the original 27-task roadmap as the requirements source; this document controls execution order and release gating.
