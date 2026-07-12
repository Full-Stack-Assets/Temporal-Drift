# Hero Time-Machine Vehicle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rejected primitive body and generic sports-car presentation with an original Blender-authored stainless-steel time-machine coupe while preserving the working Chaos chassis, controls, and tuning.

**Architecture:** Keep `ADeLoreanVehicle` and its skeletal Chaos mesh authoritative for physics. Generate a deterministic multi-object Blender source asset, export it to FBX, import presentation meshes and material instances into `/Game/Vehicles/DeLorean`, and attach them beneath a dedicated visual root whose wheel components follow the existing wheel bones. Tests validate the asset contract, tuning, cameras, and absence of prototype presentation before live course verification.

**Tech Stack:** Unreal Engine 5.8, C++20, Chaos Vehicles, Unreal Automation Framework, Unreal Python editor scripting, Blender Python, FBX, Blueprint, Git/PowerShell.

## Global Constraints

- Preserve `/Game/Levels/LVL_TimeTravelTest` as the working map.
- Preserve vehicle possession, Chaos movement, four wheel bones, keyboard/controller input, reset behavior, and the working skeletal physics chassis.
- The visible vehicle must be original and legally distinct; do not import ripped, unlicensed, trademark-bearing, or branded assets.
- Normal gameplay must not expose the generic sports-car stand-in, cubes, cylinders, or other block-prototype parts.
- Approximate authored dimensions are 4.2 m long, 1.85 m wide, and 1.15 m tall.
- Author LOD0, LOD1, LOD2, simple collision, correct centimeter scale, documented axes, clean normals, UVs, named material slots, and independent wheel pivots.
- Retain `UDeLoreanTuningData` as the drivetrain source and keep mass between 1200 and 1600 kg.
- Build `BTTF_TemporalDriftEditor Win64 Development` and run `BTTF.Vehicle` after each C++ integration task.
- Use Computer Use for final Unreal Editor import inspection, camera verification, and live driving acceptance.

---

### Task 1: Replace the Prototype Test Contract

**Files:**
- Modify: `Source/BTTF_TemporalDrift/Private/Tests/VehicleTuningTests.cpp`
- Modify: `Source/BTTF_TemporalDrift/Public/DeLoreanVehicle.h`
- Modify: `Source/BTTF_TemporalDrift/Private/DeLoreanVehicle.cpp`

**Interfaces:**
- Consumes: `UDeLoreanTuningData`, existing wheel bones, existing camera cycle.
- Produces: `USceneComponent* HeroVisualRoot`, `TArray<UStaticMeshComponent*> HeroVisualMeshes`, `int32 GetHeroVisualMeshCount() const`, and `bool HasPrototypeVisuals() const`.

- [ ] **Step 1: Replace the authored-block assertion with failing hero-contract tests**

Add automation assertions that a spawned `ADeLoreanVehicle` has a non-null hero visual root, at least one hero visual mesh, four camera modes, no prototype visuals, and valid tuning. Use explicit failures named `BTTF.Vehicle.Hero.Contract` and retain the existing tuning range assertions.

- [ ] **Step 2: Run the focused tests and record the expected red state**

Run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\run_automation.ps1 -Filter BTTF.Vehicle
```

Expected: `BTTF.Vehicle.Hero.Contract` fails because the current implementation exposes authored cube/cylinder components and does not satisfy the imported-visual contract.

- [ ] **Step 3: Introduce the hero visual root and remove primitive construction**

In the constructor, create `HeroVisualRoot` attached to the skeletal chassis/root, remove the `AddHeroPart` lambda and every generated cube/cylinder part, clear the old `HeroBodyParts` API, and keep the physics skeletal mesh visible only through a developer diagnostic boolean. Implement `GetHeroVisualMeshCount()` from `HeroVisualMeshes.Num()` and `HasPrototypeVisuals()` as a direct contract check rather than a component-name heuristic.

- [ ] **Step 4: Build and rerun the focused tests**

Run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\build_editor.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\run_automation.ps1 -Filter BTTF.Vehicle
```

Expected: editor build succeeds; tuning tests pass; hero contract remains red only for missing imported hero meshes.

- [ ] **Step 5: Commit the clean runtime contract**

```powershell
git add Source/BTTF_TemporalDrift/Public/DeLoreanVehicle.h Source/BTTF_TemporalDrift/Private/DeLoreanVehicle.cpp Source/BTTF_TemporalDrift/Private/Tests/VehicleTuningTests.cpp
git commit -m "refactor: remove prototype vehicle body"
```

### Task 2: Generate the Blender Hero Asset

**Files:**
- Create: `SourceArt/Vehicles/DeLorean/generate_hero_vehicle.py`
- Create: `SourceArt/Vehicles/DeLorean/HeroTimeMachine.blend`
- Create: `SourceArt/Vehicles/DeLorean/Exports/HeroTimeMachine.fbx`
- Create: `SourceArt/Vehicles/DeLorean/README.md`
- Create: `Scripts/Build/generate_hero_vehicle.ps1`
- Test: `Scripts/Tests/test_hero_vehicle_source.ps1`

**Interfaces:**
- Consumes: Blender executable discovered from installed applications or `$env:BLENDER_EXE`.
- Produces: deterministic Blender collection `HeroTimeMachine` with objects `BodyShell`, `FrontFascia`, `BeltTrim`, `GlassSet`, `Interior`, `TimeMachinery`, `Wheel_FL`, `Wheel_FR`, `Wheel_RL`, `Wheel_RR`, plus `LOD1_*`, `LOD2_*`, and `UCX_*` collision objects.

- [ ] **Step 1: Write the failing source-art validation script**

`test_hero_vehicle_source.ps1` must fail unless the `.blend` and FBX exist, the FBX is larger than 100 KB, and Blender background inspection reports all required object and material names. The script exits nonzero and prints the missing names.

- [ ] **Step 2: Run validation and verify it fails for missing source art**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Tests\test_hero_vehicle_source.ps1
```

Expected: failure identifying `HeroTimeMachine.blend` and `HeroTimeMachine.fbx` as missing.

- [ ] **Step 3: Implement deterministic Blender generation**

Create beveled, UV-mapped mesh objects at centimeter-compatible scale for the wedge shell, recessed fascia, dark beltline, static gullwing seams, smoked windows, cockpit, wheels, lamps, and original rear machinery. Assign named materials `M_BrushedSteel`, `M_DarkTrim`, `M_SmokedGlass`, `M_Rubber`, `M_Alloy`, `M_Interior`, `M_Lamps`, and `M_TimeEmissive`. Apply transforms; align wheel origins with axle centers; create reduced LOD copies and convex `UCX_` hulls; save the `.blend`; export selected objects to FBX with `-Y` forward, `Z` up, applied units, smoothing, tangents, and custom properties.

- [ ] **Step 4: Add the repeatable PowerShell generator and documentation**

`generate_hero_vehicle.ps1` resolves Blender, runs `--background --python generate_hero_vehicle.py`, propagates the exit code, and verifies both outputs. `README.md` records the Blender version, dimensions, coordinate system, object names, material slots, regeneration command, and license statement that the geometry is original project-owned work.

- [ ] **Step 5: Generate and validate the source asset**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\generate_hero_vehicle.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Tests\test_hero_vehicle_source.ps1
```

Expected: both commands exit `0`; validation lists every required object/material and reports approximate dimensions within 5% of 420 x 185 x 115 cm.

- [ ] **Step 6: Commit the reproducible source art**

```powershell
git add SourceArt/Vehicles/DeLorean Scripts/Build/generate_hero_vehicle.ps1 Scripts/Tests/test_hero_vehicle_source.ps1
git commit -m "feat: author original hero time-machine mesh"
```

### Task 3: Import Assets and Materials into Unreal

**Files:**
- Create: `Scripts/import_hero_vehicle.py`
- Create assets under: `Content/Vehicles/DeLorean/Hero/`
- Modify: `Content/Blueprints/BP_DeLorean.uasset`
- Modify: `Source/BTTF_TemporalDrift/Private/Tests/VehicleTuningTests.cpp`

**Interfaces:**
- Consumes: `SourceArt/Vehicles/DeLorean/Exports/HeroTimeMachine.fbx`.
- Produces: `/Game/Vehicles/DeLorean/Hero/SM_HeroTimeMachine_*`, material instances `MI_Hero_*`, and Blueprint-assigned hero visual components.

- [ ] **Step 1: Extend the failing automation contract to exact Unreal asset paths**

Assert that the body, glass, interior, machinery, and four visual wheel assets load from `/Game/Vehicles/DeLorean/Hero`, required material instances resolve, and the Blueprint class default object reports no prototype presentation.

- [ ] **Step 2: Run the focused suite and confirm missing-asset failures**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\run_automation.ps1 -Filter BTTF.Vehicle.Hero
```

Expected: failure messages name the exact missing `/Game/Vehicles/DeLorean/Hero` assets.

- [ ] **Step 3: Implement idempotent Unreal Python import**

Import the FBX objects with combine-meshes disabled, generate lightmap UVs where needed, preserve LOD and collision naming, create or update project-owned material instances, set body/glass/interior/machinery/wheel assignments, save all packages, and fail loudly if any required object is absent. Re-running the script updates assets without creating suffixed duplicates.

- [ ] **Step 4: Run the import commandlet and inspect its log**

```powershell
& 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe' '.\BTTF_TemporalDrift.uproject' -ExecutePythonScript='.\Scripts\import_hero_vehicle.py' -unattended -nop4 -nosplash
```

Expected: exit `0`, required packages saved, no duplicate asset names, and no missing FBX node errors.

- [ ] **Step 5: Assign the imported presentation to the Blueprint**

Update `BP_DeLorean` so body, glass, interior, machinery, lights, and wheel visual components attach beneath `HeroVisualRoot`. Align the root to the hidden skeletal chassis; bind visual wheels to the corresponding wheel sockets/bones or update their transforms from Chaos wheel state without affecting collision.

- [ ] **Step 6: Build and turn the hero contract green**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\build_editor.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\run_automation.ps1 -Filter BTTF.Vehicle
```

Expected: editor build succeeds and every `BTTF.Vehicle` test passes.

- [ ] **Step 7: Commit imported assets and integration**

```powershell
git add Scripts/import_hero_vehicle.py Content/Vehicles/DeLorean/Hero Content/Blueprints/BP_DeLorean.uasset Source/BTTF_TemporalDrift/Private/Tests/VehicleTuningTests.cpp
git commit -m "feat: integrate hero vehicle presentation"
```

### Task 4: Finalize Cameras, Alignment, and Handling

**Files:**
- Modify: `Source/BTTF_TemporalDrift/Public/DeLoreanVehicle.h`
- Modify: `Source/BTTF_TemporalDrift/Private/DeLoreanVehicle.cpp`
- Modify: `Content/Vehicles/DeLorean/DA_DeLoreanTuning.uasset`
- Modify: `Content/Blueprints/BP_DeLorean.uasset`
- Modify: `Source/BTTF_TemporalDrift/Private/Tests/VehicleTuningTests.cpp`

**Interfaces:**
- Consumes: imported hero asset assembly and `UDeLoreanTuningData`.
- Produces: camera modes `Chase`, `Hood`, `Bumper`, `Cockpit` and stable tuned course behavior.

- [ ] **Step 1: Add failing camera and roadworthiness assertions**

Assert four distinct camera transforms, positive spring-arm distance for chase, near-body offsets for hood/bumper, interior offset for cockpit, valid torque/gears, stable suspension ranges, and four correctly named visual wheel attachments.

- [ ] **Step 2: Run the focused tests and verify missing camera-mode failures**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\run_automation.ps1 -Filter BTTF.Vehicle
```

Expected: camera count/transform assertions fail until bumper and cockpit presets are fully represented.

- [ ] **Step 3: Implement the four data-backed camera presets**

Cycle deterministically Chase -> Hood -> Bumper -> Cockpit -> Chase. Apply arm length, relative location, relative rotation, field of view, and control-rotation policy per preset. Hide only obstructive interior/exterior parts for a specific camera when necessary; never hide the full hero vehicle in chase view.

- [ ] **Step 4: Apply tuning data without visual side effects**

Use `DA_DeLoreanTuning` for torque, forward/reverse gears, mass, suspension travel, tire friction, steering response, braking, center-of-mass offset, drag, and top-speed behavior. Do not change mesh scale to tune physics.

- [ ] **Step 5: Build and run the complete vehicle suite**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\build_editor.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\run_automation.ps1 -Filter BTTF.Vehicle
```

Expected: build succeeds and all vehicle tests pass with zero failures.

- [ ] **Step 6: Commit cameras and tuning**

```powershell
git add Source/BTTF_TemporalDrift/Public/DeLoreanVehicle.h Source/BTTF_TemporalDrift/Private/DeLoreanVehicle.cpp Source/BTTF_TemporalDrift/Private/Tests/VehicleTuningTests.cpp Content/Vehicles/DeLorean/DA_DeLoreanTuning.uasset Content/Blueprints/BP_DeLorean.uasset
git commit -m "feat: finish hero vehicle cameras and tuning"
```

### Task 5: Live Acceptance and Roadmap Integration

**Files:**
- Modify: `docs/superpowers/plans/2026-07-12-temporal-drift-game-upgrade-roadmap.md`
- Create: `Docs/QA/HeroVehicleAcceptance.md`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: green `BTTF.Vehicle` suite and playable `LVL_TimeTravelTest`.
- Produces: Task 3 acceptance evidence and a clean continuation point for Task 4 of the main roadmap.

- [ ] **Step 1: Run the full editor and automation verification**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\build_editor.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\run_automation.ps1 -Filter BTTF
```

Expected: editor build succeeds and the full `BTTF` automation suite has zero failures.

- [ ] **Step 2: Perform live Computer Use visual inspection**

Open `LVL_TimeTravelTest`, enter PIE, verify automatic possession, and capture representative chase, hood, bumper, and cockpit views. Confirm coherent silhouette, brushed-metal response, correct glass/material separation, readable emissives, aligned wheels, no visible prototype shapes, and no camera clipping.

- [ ] **Step 3: Perform live Computer Use driving acceptance**

Accelerate, steer in both directions, brake, reverse, handbrake, reset, and cycle all cameras. Complete the marked course, check full-lock steering and suspension compression for wheel clipping, confirm no rollover or persistent oscillation, and reach the selected 88-MPH window while retaining control.

- [ ] **Step 4: Record evidence and update roadmap checkboxes**

Write exact build/test results, observed camera behavior, top-speed result, handling outcome, remaining non-blocking visual limitations, and screenshot paths to `Docs/QA/HeroVehicleAcceptance.md`. Mark only genuinely verified Task 3 roadmap items and its gate complete.

- [ ] **Step 5: Keep companion state out of source control and commit acceptance**

Add `.superpowers/` to `.gitignore`, verify `git status --short` contains no generated logs or caches, then commit:

```powershell
git add .gitignore Docs/QA/HeroVehicleAcceptance.md docs/superpowers/plans/2026-07-12-temporal-drift-game-upgrade-roadmap.md
git commit -m "test: accept hero vehicle milestone"
```

- [ ] **Step 6: Push the branch and continue the main roadmap**

```powershell
git push origin agent/batch-1-stability-controls
```

Expected: push succeeds and the next active item is Task 4, deterministic time-travel state machine.
