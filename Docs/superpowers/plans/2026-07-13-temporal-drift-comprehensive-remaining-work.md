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

## Detailed Backlog Previously Compressed or Omitted

Tasks 11-12 are release umbrellas. The following tasks make every substantial system hidden inside those umbrellas independently implementable and acceptable.

### Task 13: Finish the Playable Hero, Animation, and Era Outfits

**Files:** `BTTFHeroCharacter.*`, `/Game/Characters/Hero/`, animation Blueprints, outfit data assets, character automation tests.

**Produces:** A legally usable hero with production locomotion, facial presentation, LODs, physics, and era-reactive outfits.

- [ ] Replace the placeholder character with an authorized rig and document its license/provenance.
- [ ] Author idle, walk, run, crouch, jump, interact, vehicle entry/exit, board, combat, damage, and recovery animation states with foot IK and motion-warp targets.
- [ ] Implement vest, future outfit, frontier disguise, radiation suit, and 2045 disguise as data-driven equipment with NPC, traversal, and intimidation modifiers.
- [ ] Test rapid possession, outfit swaps, time travel, save/load, LOD transitions, and missing-animation fallbacks.
- [ ] Gate: every required animation and outfit works in all supported eras without mesh clipping, possession loss, or save drift.

### Task 14: Add Parkour, Skateboard, Hoverboard, and Vehicle-Grab Traversal

**Files:** Create focused parkour and board components under `Source/BTTF_TemporalDrift/`; create traversal data/assets under `/Game/Traversal/`; add traversal tests.

**Produces:** Climbing, vaulting, sliding, ledges, rooftop routes, boards, skitching, and safe moving-vehicle grabs.

- [ ] Implement query-driven vault, mantle, ledge, slide, board-mount, skitch, and grab eligibility with deterministic recovery locations.
- [ ] Author traversal routes and exclusion volumes without breaking vehicle roads or mission spaces.
- [ ] Add keyboard/controller mappings, tutorial prompts, stamina/skill hooks, and accessibility assists.
- [ ] Gate: complete each era traversal course, interrupt every action safely, and recover after save/load or era switching.

### Task 15: Implement Skills, Temperance, Reputation, and Progression Balance

**Files:** Create progression subsystem/data assets/UI under `/Game/Progression/`; extend save schema and tests.

**Produces:** Stable progression for Performance, Marksmanship, Board Mastery, Tinkering, hidden Temperance, and faction/citizen reputation.

- [ ] Define stable unlock IDs, prerequisites, costs, respec policy, mission gates, and migration rules.
- [ ] Connect chicken provocations to optional risk, readable resistance feedback, Temperance growth, dialogue, and endings.
- [ ] Add progression UI, reward pacing telemetry, exploit guards, and accessibility-friendly feedback.
- [ ] Gate: representative new-game and migrated saves produce identical progression and ending eligibility.

### Task 16: Complete Five-Era Architecture, Interiors, Weather, and Secrets

**Files:** Era builders under `Scripts/hill_valley/`; `/Game/Environment/HillValley/<Era>/`; weather/interior validators.

**Produces:** Complete era landmarks, explorable priority interiors, scheduled weather, day/night presentation, and cross-era secrets.

- [ ] Build the frontier courthouse/saloon/blacksmith/mine/ravine; 1955 cafe/records/theater/school/estates/mansion; 1985 mall/garage/fitness center; 1985-A casino/patrol/industry; 2015 skyways/Hilldale; and 2045 tiered city/Heritage District.
- [ ] Complete priority interiors with occlusion, collision, navigation, interaction, streaming, and era variants.
- [ ] Implement seasonal and scheduled rain, fog, snow, storms, and the authoritative November 12, 1955 lightning window.
- [ ] Add readable newspapers, interactive props, hidden routes, and the five-era wall-cavity treasure chain.
- [ ] Gate: blind screenshots identify every era and every landmark/interior passes ground or air traversal validation.

### Task 17: Complete Timeline Facts, Genealogy, and Paradox Anomalies

**Files:** `TimelineFactSubsystem.*`, genealogy and variant subsystems, `/Game/Data/Timeline/`, deterministic graph tests.

**Produces:** Cycle-safe provenance-aware facts affecting the entire five-era world and roughly 60 persistent named citizens.

- [ ] Finish dependency graph validation, cycle reporting, provenance, debug visualization, schema migration, and multiplayer authority boundaries.
- [ ] Connect facts to names, signs, newspapers, interiors, family trees, schedules, dialogue, weather, access, 1985-A activation, and 2045 rearrangement.
- [ ] Complete genealogy, relationship, and schedule records for named citizens while pooling ambient populations separately.
- [ ] Trigger duplicates, wrong-era props/weather, enforcement responses, and photograph fading only from deterministic paradox events.
- [ ] Gate: repeated mutation suites match across fresh run, save/load, packaging, and network synchronization.

### Task 18: Author the Full Five-Act Campaign and All Endings

**Files:** `/Game/Data/Missions/MainCampaign/`, mission/dialogue/sequence systems, campaign graph validator, ending tests.

**Produces:** A dependency-safe five-act campaign with canonical, Tannen-owned, Doc's Choice, and intermediate endings.

- [ ] Author parents' meeting, dance, lightning run, Almanac recovery, alternate-1985 dismantling, frontier conflict, and 2045 reconciliation objectives.
- [ ] Define era-unlock reordering, availability, checkpoints, failure recovery, skip-safe cinematics, dialogue variants, and exact-once fact effects.
- [ ] Add ending eligibility and presentation driven by Temperance, Tannen outcomes, ravine state, paradox history, and family facts.
- [ ] Gate: graph automation proves every required objective and ending reachable; packaged new-player runs complete every ending.

### Task 19: Produce Dialogue, Voice, Cinematics, and Localization-Ready Narrative

**Files:** Dialogue subsystem/assets, Level Sequences, camera/gesture slots, string tables, subtitle and narrative QA tests.

**Produces:** Complete comprehensible narrative delivery with or without recorded voice.

- [ ] Finish the full cast's branching graphs with era, mission, fact, paradox, inventory, reputation, and prior-choice conditions.
- [ ] Author gesture, facial, camera, staging, interruption, replay, and cinematic-skip behavior that dispatches events exactly once.
- [ ] Record or import properly licensed voice/audio, while keeping subtitles sufficient for all required comprehension.
- [ ] Move player-facing text into stable string tables and test expansion, glyph fallback, right-to-left readiness, and subtitle timing.
- [ ] Gate: every required conversation works silently, survives interruption/save/load, and passes narrative continuity review.

### Task 20: Deliver Side Missions, Mini-Games, Collectibles, and World Events

**Files:** `/Game/Data/Missions/Side/`, `/MiniGames/`, `/Collectibles/`, `/WorldEvents/`, associated subsystems and tests.

**Produces:** At least eight side missions per era, the specified activities, collectible sets, and deterministic random events.

- [ ] Author and playtest 40+ side missions including parts delivery, Goldie campaign, Uncle Joey, rivalry, races, and preservation chains.
- [ ] Build Wild Gunman, poker, faro, dance, board parks, slipstream races, pizza, horse shoeing, escort, and festival activities.
- [ ] Implement collectible tracking for publications, blueprints, lightning bolts, rewards, migration, and completion UI.
- [ ] Add pooled world events with cooldowns, budgets, cleanup, cross-era echoes, and mission-zone exclusions.
- [ ] Gate: every activity starts, succeeds/fails, cleans up, saves, reloads, and awards exactly once.

### Task 21: Implement Combat, Stealth, Gadgets, and Encounter AI

**Files:** Create `/Game/Combat/`, `/Game/Stealth/`, `/Game/Gadgets/`; focused C++ components, StateTrees/behavior assets, AI tests.

**Produces:** Nonlethal-first combat, authored stealth spaces, era detection rules, gadgets, and recoverable encounters.

- [ ] Implement strikes, blocks, dodges, counters, archetypes, environmental takedowns, manure interactions, damage, and recovery.
- [ ] Implement hearing, sight, suspicion, search, drone surveillance, alarm reset, and mission-safe fail states for required locations.
- [ ] Complete evidence camera, rhythm device, radios, binoculars, board variants, and portable fusion gadget with crafting gates.
- [ ] Add AI navigation, crowd separation, encounter budgets, accessibility assists, and deterministic checkpoints.
- [ ] Gate: all encounters support keyboard/controller, nonlethal routes where required, save recovery, and no persistent hostile-state contamination.

### Task 22: Complete DeLorean Damage, Upgrades, Fuel, and Date Entry

**Files:** Vehicle/tuning/time-circuit systems; `/Game/Vehicles/DeLorean/Damage`, `/Upgrades`, `/Fuel`, `/Dates`; tests.

**Produces:** Deterministic damage and repair, era configurations, direct date entry, and fuel/crafting economies.

- [ ] Add cosmetic and mechanical damage zones with repair, failure, reset, save, and network replication rules.
- [ ] Implement hover conversion, whitewalls, railroad wheels, mag-lev skids, and separately validated handling profiles.
- [ ] Implement diegetic date entry, valid authored routing, unavailable-era messaging, and impossible-date rejection.
- [ ] Complete plutonium, lightning, fusion, parts, crafting, shop, scarcity, and recovery economies without progression deadlocks.
- [ ] Gate: every configuration completes its era course and time jump under damage, repair, low-fuel, save/load, and packaged conditions.

### Task 23: Build Full Traffic, Population, Mounts, and Ride Interaction

**Files:** Population/traffic managers, splines, pooling, schedule assets, vehicles/mounts, simulation and performance tests.

**Produces:** Era-correct traffic and crowds plus safe hitching, skitching, mounting, commandeering, and skyway grabs.

- [ ] Build wagons/stagecoaches, tail-fin cars, 1980s sedans, skyway flyers, and autonomous swarms with reactions and collision rules.
- [ ] Integrate named schedules and genealogy without duplicate stable IDs while pooling hundreds of ambient agents.
- [ ] Implement safe interaction, dismount, invalid-position recovery, mission ownership, and law/reputation consequences.
- [ ] Gate: every era swaps population and traffic within budget without duplication, mission contamination, or long hitching.

### Task 24: Implement Economy, Inventory, Shops, Crafting, and Loot Balance

**Files:** `CraftingSubsystem.*`, inventory/economy/shop systems, recipes/items/vendors, UI, save and balance tests.

**Produces:** Era-aware currencies, vendors, recipes, item sinks, repair costs, mission rewards, and migration-safe inventory.

- [ ] Define item and currency stable IDs, value bands, availability, vendor schedules, scarcity, and cross-era conversion rules.
- [ ] Complete recipe discovery, workbench/shop flows, crafting failure prevention, capacity, sorting, and controller/keyboard UI.
- [ ] Simulate campaign resource flows to prevent soft locks, infinite-money exploits, and mandatory grinding.
- [ ] Gate: new-game and migrated campaign runs can afford required progression while optional upgrades retain meaningful tradeoffs.

### Task 25: Add Onboarding, Tutorials, Help, Map/GPS, and Objective Guidance

**Files:** Tutorial and prompt subsystem, input glyph data, schematic map/GPS, objective tracker, help/accessibility screens, tests.

**Produces:** A new player can learn movement, camera, vehicle, time circuits, interaction, recovery, traversal, combat, and crafting without developer help.

- [ ] Add contextual, dismissible, replayable tutorials keyed to stable milestones and the current keyboard contract.
- [ ] Build Doc's schematic map with discovered destinations, era filters, objective routing, accessible navigation, and cause-effect overlays.
- [ ] Add input remapping conflict detection and accurate glyphs for keyboard and supported controllers.
- [ ] Gate: blind onboarding playtests complete the vertical slice and representative advanced systems without external instructions.

### Task 26: Complete Accessibility, Settings, and Localization

**Files:** Player profile/settings, UMG styles, input remapping, subtitle/audio systems, string tables, accessibility automation and manual matrices.

**Produces:** Scalable UI, readable subtitles, high contrast, color-independent warnings, reduced effects, assists, remapping, and localization readiness.

- [ ] Add independent subtitle size/background/speaker labels, UI scale, high contrast, color filters, icon-coded warnings, camera shake, motion blur, flash, hold/toggle, aim/driving/stealth assists, and audio range controls.
- [ ] Ensure every essential cue has visual and audio alternatives and every timed sequence has an assist or retry path.
- [ ] Externalize all player text, remove text baked into required textures, and test pseudo-localization and font coverage.
- [ ] Gate: accessibility matrix passes for menus, campaign, driving, time travel, combat, cinematics, photo mode, and multiplayer.

### Task 27: Add Photo Mode, Replay Capture, and Safe Mod Support

**Files:** Photo/replay/mod subsystems, manifests, validators, UIs, samples, developer documentation, security tests.

**Produces:** Exploit-safe photo tools, reproducible replay evidence, and versioned isolated content mods.

- [ ] Implement free camera, focal controls, five era film stocks, framing guides, hide-UI, and mission/network restrictions.
- [ ] Add deterministic input/event replay capture for QA and shareable time-trial ghosts where authoritative.
- [ ] Define versioned mod manifests, era/layer registration, facts, missions, dialogue, dependency bounds, sandboxing, validation, and failure isolation.
- [ ] Gate: invalid mods cannot corrupt saves or execute outside allowed interfaces; photo/replay features work in Shipping.

### Task 28: Implement Multiplayer, Competitive Modes, Achievements, and Privacy

**Files:** Network game modes, replicated timeline authority, session/online interfaces, leaderboards, achievements, network and privacy tests.

**Produces:** Cooperative campaign, Clocktower roles, racing, Almanac Heist, Paradox Royale, reconnect, results, and platform-safe progression.

- [ ] Establish server authority for missions, facts, era switches, inventory, vehicle state, saves, and anti-cheat validation.
- [ ] Implement join, reconnect, host-loss policy, voice/privacy controls, block/report boundaries, matchmaking, spectating, results, and cleanup.
- [ ] Add offline-safe achievement and leaderboard queues with retry, deduplication, and platform-neutral IDs.
- [ ] Gate: two-machine packaged tests show no timeline divergence, duplication, privacy leak, or dirty shutdown.

### Task 29: Establish Performance Budgets, HLOD, Scalability, and Platform Matrix

**Files:** Device profiles, scalability config, World Partition/HLOD assets, profiling scripts, performance evidence under `Docs/QA/Performance/`.

**Produces:** Explicit CPU, GPU, memory, streaming, save, startup, and network budgets with scalable visual presets.

- [ ] Define target hardware tiers and budgets for 1080p frame time, era-switch hitch, memory, package size, startup, and network traffic.
- [ ] Regenerate HLODs, audit Nanite/Lumen/VSM, optimize materials/VFX/crowds/AI/audio, and validate low/medium/high/cinematic profiles.
- [ ] Profile every era, traversal mode, population peak, mission finale, combat encounter, multiplayer mode, save/load, and package startup.
- [ ] Gate: sustained packaged tests meet budgets without traversal holes, severe pop-in, or gameplay differences between scalability levels.

### Task 30: Add CI, Reproducible Asset Generation, and Release Automation

**Files:** GitHub workflows, PowerShell build scripts, commandlet generators, validators, artifact manifests, release documentation.

**Produces:** Repeatable source-to-Windows builds with deterministic generated assets, automated tests, and traceable artifacts.

- [ ] Make every generator idempotent, version its inputs, emit manifests, and distinguish expected missing optional assets from real commandlet errors.
- [ ] Add CI stages for compile, automation, validators, cook, Development/Shipping packaging, smoke launch, and artifact retention where licensed Unreal infrastructure permits.
- [ ] Add version stamping, changelog generation, checksums, symbol/crash artifact handling, rollback, and release-candidate promotion.
- [ ] Gate: documented clean checkout produces matching validated artifacts without manual editor repair.

### Task 31: Implement Diagnostics, Crash Recovery, Telemetry, and Supportability

**Files:** Structured logging/diagnostics, crash context, opt-in telemetry, QA replay hooks, support and privacy documentation.

**Produces:** Actionable failure reports without collecting unnecessary personal data.

- [ ] Add stable diagnostic event IDs for possession, mission, save, era switch, streaming, time travel, mods, and network failures.
- [ ] Add crash-safe autosave policy, corruption quarantine, rollback slots, log collection instructions, and reproducible QA replay attachment.
- [ ] Define opt-in telemetry, retention, redaction, consent, offline behavior, and deletion policy before collecting analytics.
- [ ] Gate: induced crashes and corrupted saves recover safely and produce actionable redacted reports.

### Task 32: Complete Legal Asset Provenance, Security, and Content Compliance

**Files:** `LICENSES/`, attribution manifests, asset provenance records, mod/security threat model, release checklist.

**Produces:** A distributable build with traceable rights, safe third-party handling, and documented security boundaries.

- [ ] Record source, author, license, modification, and redistribution permission for every model, texture, font, voice, music, sound, plugin, and code dependency.
- [ ] Replace or exclude unlicensed film music, likenesses, trademarks, and downloaded assets before public distribution.
- [ ] Threat-model saves, mods, network messages, filenames, external links, and user-generated content; validate and bound every untrusted input.
- [ ] Gate: release audit finds no unknown-provenance asset, embedded secret, unsafe mod path, or prohibited redistribution.

### Task 33: Final QA, Compatibility, Documentation, and Release Operations

**Files:** `Docs/QA/`, player manual, troubleshooting, credits, known issues, release notes, support runbook, GitHub release assets.

**Produces:** Signed, versioned Windows packages and complete evidence for vertical slice, expanded campaign, and master-game acceptance.

- [ ] Run automation, validators, every campaign ending, side-content audit, accessibility, localization, performance, multiplayer, mods, recovery, alt-tab, display modes, clean-machine, and upgrade tests.
- [ ] Test supported GPUs, drivers, resolutions, refresh rates, input devices, Windows versions, storage speeds, and offline mode.
- [ ] Publish setup, controls, tutorials, save locations, troubleshooting, crash reporting, mod authoring, credits, licenses, known issues, and rollback instructions.
- [ ] Gate: no blocker remains; each accepted non-blocker has reproduction, impact, workaround, owner, and target release.

---

## Recommended Execution Sequence

1. Tasks 1-5: restore trust in the playable controls and vehicle.
2. Tasks 6-7: raise Hill Valley visual quality and traversal integrity.
3. Tasks 8-9: accept and package the vertical slice.
4. Task 10: expand the accepted slice into the complete Hill Valley campaign.
5. Tasks 13-26: complete the detailed single-player master-game content and systems.
6. Tasks 27-28: add optional photo/mod/online features after single-player authority is stable.
7. Tasks 29-33: optimize, automate, secure, document, and accept the release.

## Completion Reporting

After each task, update `Docs/QA/RoadmapStatus.md` with one of: **Not started**, **In progress**, **Code complete**, **Content complete**, or **Accepted**. Only **Accepted** means every automated, live PIE, and packaged gate for that task has evidence. Keep the original 27-task roadmap as the requirements source; this document controls execution order and release gating.
