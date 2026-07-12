# Hill Valley Courthouse Square Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a recognizable, drivable Hill Valley courthouse square around the existing `LVL_TimeTravelTest` level.

**Architecture:** Use one repeatable Unreal Editor Python builder to create tagged neutral-base actors from Engine primitive meshes, reusable materials, and deterministic transforms. Keep permanent geometry in the neutral level while retaining existing era Data Layer assets for later dressing; validate the generated layout with a separate read-only Unreal Python inspection script and a live vehicle run.

**Tech Stack:** Unreal Engine 5.8, Unreal Editor Python API, World Partition, Data Layers, Engine primitive static meshes, existing BTTF C++ vehicle code.

## Global Constraints

- Preserve the existing drivable DeLorean, Player Start, lighting, sky, post-process setup, and era Data Layer assets.
- Keep `DL_1985_Present` as the default active era.
- Do not require Lumen; the current stable non-Lumen Lit configuration remains authoritative.
- Neutral geometry must remain independent of era-specific dressing.
- Main roads and curb radii must support a complete DeLorean lap without collision traps.
- The first pass excludes detailed interiors, traffic AI, crowds, and film-accurate commercial signage.
- Git is unavailable on this machine; replace commit steps with saved-file and timestamped level-backup checkpoints.

---

## File Structure

- `Scripts/hill_valley/build_hill_valley_square.py`: deterministic editor builder; owns actor cleanup, reusable geometry helpers, material creation, courthouse, roads, storefronts, landscape props, and saving.
- `Scripts/hill_valley/validate_hill_valley_square.py`: read-only validation of required actor tags, counts, collision, spawn orientation, and active map.
- `Scripts/hill_valley/README.md`: exact editor and commandlet invocation, generated actor tags, and rebuild instructions.
- `Content/Levels/LVL_TimeTravelTest.umap`: modified level containing the neutral Hill Valley blockout.
- `Content/Materials/HillValley/`: generated neutral material assets.
- `Saved/Backups/LVL_TimeTravelTest_pre_hill_valley.umap`: pre-build level backup.

## Task 1: Deterministic Builder Foundation and Level Backup

**Files:**
- Create: `Scripts/hill_valley/build_hill_valley_square.py`
- Create: `Scripts/hill_valley/validate_hill_valley_square.py`
- Create: `Scripts/hill_valley/README.md`
- Create: `Saved/Backups/LVL_TimeTravelTest_pre_hill_valley.umap`

**Interfaces:**
- Consumes: `/Game/Levels/LVL_TimeTravelTest` and Engine primitives `/Engine/BasicShapes/Cube`, `Cylinder`, `Sphere`, and `Plane`.
- Produces: `spawn_static_mesh(name, mesh_path, location, scale, rotation, material, tags)` and generated actor tag `HV_Generated`.

- [ ] **Step 1: Back up the current map**

Run:

```powershell
Copy-Item -LiteralPath 'C:\Users\Shadow\Downloads\BTTF_TemporalDrift_v3\Content\Levels\LVL_TimeTravelTest.umap' -Destination 'C:\Users\Shadow\Downloads\BTTF_TemporalDrift_v3\Saved\Backups\LVL_TimeTravelTest_pre_hill_valley.umap' -Force
```

Expected: the destination exists and has the same byte length as the source.

- [ ] **Step 2: Write the initial failing validator**

Create `validate_hill_valley_square.py` with these required neutral actor groups:

```python
import unreal

LEVEL = "/Game/Levels/LVL_TimeTravelTest"
REQUIRED_TAGS = {
    "HV_Courthouse": 1,
    "HV_Clocktower": 1,
    "HV_Road": 5,
    "HV_Sidewalk": 8,
    "HV_Storefront": 12,
    "HV_Landscape": 8,
}

unreal.EditorLoadingAndSavingUtils.load_map(LEVEL)
actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors()

failures = []
for tag, minimum in REQUIRED_TAGS.items():
    count = sum(1 for actor in actors if unreal.Name(tag) in actor.tags)
    if count < minimum:
        failures.append(f"{tag}: expected at least {minimum}, found {count}")

if failures:
    raise RuntimeError("Hill Valley validation failed: " + "; ".join(failures))
print("HILL_VALLEY_VALIDATION_SUCCESS")
```

- [ ] **Step 3: Run the validator and verify it fails**

Run:

```powershell
& 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe' 'C:\Users\Shadow\Downloads\BTTF_TemporalDrift_v3\BTTF_TemporalDrift.uproject' -unattended -nop4 -nosplash -NullRHI -run=pythonscript '-script=C:\Users\Shadow\Downloads\BTTF_TemporalDrift_v3\Scripts\hill_valley\validate_hill_valley_square.py' -log
```

Expected: nonzero exit and `Hill Valley validation failed` listing missing actor tags.

- [ ] **Step 4: Implement builder helpers**

Add the following foundation to `build_hill_valley_square.py`:

```python
import unreal

LEVEL = "/Game/Levels/LVL_TimeTravelTest"
GENERATED_TAG = unreal.Name("HV_Generated")
actor_subsystem = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
asset_library = unreal.EditorAssetLibrary

unreal.EditorLoadingAndSavingUtils.load_map(LEVEL)

def delete_previous_generated():
    for actor in actor_subsystem.get_all_level_actors():
        if GENERATED_TAG in actor.tags:
            actor_subsystem.destroy_actor(actor)

def spawn_static_mesh(name, mesh_path, location, scale, rotation=(0, 0, 0), material=None, tags=()):
    mesh = asset_library.load_asset(mesh_path)
    actor = actor_subsystem.spawn_actor_from_class(unreal.StaticMeshActor, unreal.Vector(*location), unreal.Rotator(*rotation))
    actor.set_actor_label(name)
    actor.tags = [GENERATED_TAG] + [unreal.Name(tag) for tag in tags]
    actor.set_actor_scale3d(unreal.Vector(*scale))
    component = actor.static_mesh_component
    component.set_static_mesh(mesh)
    component.set_collision_enabled(unreal.CollisionEnabled.QUERY_AND_PHYSICS)
    if material:
        component.set_material(0, material)
    return actor

delete_previous_generated()
```

- [ ] **Step 5: Save the foundation checkpoint**

Run the builder once and verify that it exits successfully without deleting actors that lack `HV_Generated`. Save the three script files. Git commit is skipped because Git is unavailable.

## Task 2: Roads, Curbs, Sidewalks, and Central Square

**Files:**
- Modify: `Scripts/hill_valley/build_hill_valley_square.py`
- Modify: `Scripts/hill_valley/validate_hill_valley_square.py`
- Modify: `Content/Levels/LVL_TimeTravelTest.umap`

**Interfaces:**
- Consumes: `spawn_static_mesh(...)` from Task 1.
- Produces: road actors tagged `HV_Road`, sidewalk actors tagged `HV_Sidewalk`, and landscape actors tagged `HV_Landscape`.

- [ ] **Step 1: Extend the failing validator with road dimensions**

Require every `HV_Road` actor to have collision and require the south approach centerline to remain clear within `X=-350..350`, `Y=-6500..-1500`.

- [ ] **Step 2: Run the validator and verify road checks fail**

Expected: missing `HV_Road`, `HV_Sidewalk`, and `HV_Landscape` failures.

- [ ] **Step 3: Build the road loop**

Use cube primitives with these centimeter-space center transforms:

```python
ROAD_SEGMENTS = [
    ("HV_Road_South", (0, -4200, 5), (45, 10, 0.05)),
    ("HV_Road_North", (0, 2200, 5), (45, 10, 0.05)),
    ("HV_Road_West", (-3500, -1000, 5), (10, 32, 0.05)),
    ("HV_Road_East", (3500, -1000, 5), (10, 32, 0.05)),
    ("HV_Road_Approach", (0, -7600, 5), (10, 34, 0.05)),
]
for name, location, scale in ROAD_SEGMENTS:
    spawn_static_mesh(name, "/Engine/BasicShapes/Cube.Cube", location, scale, tags=("HV_Road",))
```

Keep the loop approximately 2,000 cm wide and use low curb blocks at road boundaries.

- [ ] **Step 4: Build sidewalks and the civic lawn**

Create eight sidewalk strips around the inner and outer road edges. Build a raised central lawn from `(-2400,-2700)` to `(2400,900)`, leaving paved pedestrian paths on both axes and a courthouse plaza at the north edge.

- [ ] **Step 5: Move the drivable spawn axis**

Find the possessed `BP_DeLorean` external actor and Player Start. Place the active vehicle near `(0,-8200,150)` with yaw `0`, facing the courthouse. Keep Player Start near `(0,-8700,120)`.

- [ ] **Step 6: Run validator and save**

Expected: road, sidewalk, and landscape checks pass. Save the level with `unreal.EditorLoadingAndSavingUtils.save_dirty_packages(True, True)`.

## Task 3: Courthouse and Clocktower Hero Landmark

**Files:**
- Modify: `Scripts/hill_valley/build_hill_valley_square.py`
- Modify: `Scripts/hill_valley/validate_hill_valley_square.py`
- Modify: `Content/Levels/LVL_TimeTravelTest.umap`

**Interfaces:**
- Consumes: neutral road/plaza coordinates from Task 2.
- Produces: courthouse assembly tagged `HV_Courthouse` and clocktower assembly tagged `HV_Clocktower`.

- [ ] **Step 1: Add failing courthouse visibility checks**

Require at least one courthouse-tagged actor north of `Y=2800`, a clocktower top above `Z=2500`, and an unobstructed south-facing landmark center within `X=-500..500`.

- [ ] **Step 2: Run validator and verify courthouse checks fail**

Expected: missing courthouse and clocktower failures.

- [ ] **Step 3: Build courthouse massing**

Create a symmetrical courthouse centered at `(0,4100,600)`:

```python
spawn_static_mesh("HV_Courthouse_Main", "/Engine/BasicShapes/Cube.Cube", (0, 4100, 700), (24, 12, 7), tags=("HV_Courthouse",))
spawn_static_mesh("HV_Courthouse_Wing_L", "/Engine/BasicShapes/Cube.Cube", (-1800, 4300, 550), (12, 10, 5.5), tags=("HV_Courthouse",))
spawn_static_mesh("HV_Courthouse_Wing_R", "/Engine/BasicShapes/Cube.Cube", (1800, 4300, 550), (12, 10, 5.5), tags=("HV_Courthouse",))
```

Add six broad stair slabs descending southward, a raised portico, four cylindrical columns, and a shallow pediment.

- [ ] **Step 4: Build the clocktower**

Stack a square tower above the center façade, add a smaller cap, and place a large cylinder rotated to face south as the clock face. The clock center must be approximately `(0,2860,2450)` and visually readable from the south approach.

- [ ] **Step 5: Validate hero silhouette and save**

Expected: courthouse and clocktower checks pass, and the clock face remains visible from the vehicle start in Lit mode.

## Task 4: Modular Storefront Perimeter

**Files:**
- Modify: `Scripts/hill_valley/build_hill_valley_square.py`
- Modify: `Scripts/hill_valley/validate_hill_valley_square.py`
- Modify: `Content/Levels/LVL_TimeTravelTest.umap`

**Interfaces:**
- Consumes: road outer edges from Task 2.
- Produces: east, west, and south building rows tagged `HV_Storefront`, with blank dressing panels suitable for era overlays.

- [ ] **Step 1: Add failing storefront distribution checks**

Require at least four storefront modules east of `X=4300`, four west of `X=-4300`, and four south of `Y=-5200`.

- [ ] **Step 2: Run validator and verify distribution checks fail**

Expected: each perimeter reports fewer than four storefronts.

- [ ] **Step 3: Implement reusable storefront module**

```python
def spawn_storefront(label, location, yaw, width=1200, depth=1000, floors=2):
    x, y, z = location
    body = spawn_static_mesh(
        f"{label}_Body", "/Engine/BasicShapes/Cube.Cube", (x, y, z + floors * 300),
        (width / 100, depth / 100, floors * 3), rotation=(0, yaw, 0), tags=("HV_Storefront",)
    )
    spawn_static_mesh(
        f"{label}_SignPanel", "/Engine/BasicShapes/Cube.Cube", (x, y, z + 420),
        (width / 110, 0.25, 0.8), rotation=(0, yaw, 0), tags=("HV_Storefront_DressingHook",)
    )
    return body
```

Add window inset blocks, doors, cornices, parapets, and varied roof heights without creating interiors.

- [ ] **Step 4: Populate three perimeter rows**

Place 5-7 modules along each side, leaving two side alleys and one wider south-center opening aligned with the approach road. Vary width, floor count, color, and parapet height while retaining the common grid.

- [ ] **Step 5: Validate collision clearances and save**

Expected: all three distribution checks pass and no storefront overlaps the road loop bounds.

## Task 5: Streetscape, Trees, Landscape Framing, and Materials

**Files:**
- Modify: `Scripts/hill_valley/build_hill_valley_square.py`
- Modify: `Scripts/hill_valley/validate_hill_valley_square.py`
- Modify: `Content/Levels/LVL_TimeTravelTest.umap`
- Create: `Content/Materials/HillValley/MI_HV_Asphalt.uasset`
- Create: `Content/Materials/HillValley/MI_HV_Concrete.uasset`
- Create: `Content/Materials/HillValley/MI_HV_Brick_Red.uasset`
- Create: `Content/Materials/HillValley/MI_HV_Stone_Light.uasset`
- Create: `Content/Materials/HillValley/MI_HV_Grass.uasset`

**Interfaces:**
- Consumes: completed neutral geometry.
- Produces: readable neutral palette and nonblocking streetscape actors tagged `HV_Prop` or `HV_Landscape`.

- [ ] **Step 1: Add failing material and prop checks**

Require the five material assets, at least twelve trees, eight streetlights, four benches, and four planters. Reject any prop whose bounds intersect the primary lane center regions.

- [ ] **Step 2: Run validator and verify checks fail**

Expected: missing material and prop-count failures.

- [ ] **Step 3: Create neutral material instances**

Use `/Engine/BasicShapes/BasicShapeMaterial` as the parent where available. Set distinct base colors and moderate roughness for asphalt, concrete, brick, stone, and grass. Save assets under `/Game/Materials/HillValley`.

- [ ] **Step 4: Dress the square without blocking driving**

Use cylinders and spheres for stylized trees, narrow cylinders/cubes for streetlights, and cubes for benches and planters. Keep props at least 250 cm behind curb edges and preserve courthouse sightlines.

- [ ] **Step 5: Shape the landscape frame**

Add low terrain berms and clustered trees beyond storefront rows, especially on the northwest and northeast horizons. Keep the south approach visually open.

- [ ] **Step 6: Validate and save**

Expected: material and prop checks pass, and the level remains readable in the stable Lit configuration.

## Task 6: Era Layer Hooks and End-to-End Play Verification

**Files:**
- Modify: `Scripts/hill_valley/build_hill_valley_square.py`
- Modify: `Scripts/hill_valley/validate_hill_valley_square.py`
- Modify: `Scripts/hill_valley/README.md`
- Modify: `Content/Levels/LVL_TimeTravelTest.umap`

**Interfaces:**
- Consumes: neutral storefront sign panels and completed square.
- Produces: documented era dressing hooks and verified playable level.

- [ ] **Step 1: Add failing era validation**

Check that Data Layer assets `DL_1885`, `DL_1955`, `DL_1985_Present`, `DL_1985_Alternate`, `DL_2015`, and `DL_2045` exist. Require `DL_1985_Present` as the intended default and require at least twelve `HV_Storefront_DressingHook` actors.

- [ ] **Step 2: Run validator and verify any missing hook fails**

Expected: all Data Layer assets exist; dressing-hook count fails until storefront hooks are complete.

- [ ] **Step 3: Finalize rebuild documentation**

Document exact builder and validator command lines, generated actor tags, backup path, default map, and the rule that era layers may replace dressing but not neutral structural geometry.

- [ ] **Step 4: Run complete automated validation**

Run the validator command from Task 1.

Expected: exit code `0` and `HILL_VALLEY_VALIDATION_SUCCESS` with no missing-tag, collision, spawn, material, or Data Layer failures.

- [ ] **Step 5: Run the vehicle regression suite**

Run:

```powershell
& 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe' 'C:\Users\Shadow\Downloads\BTTF_TemporalDrift_v3\BTTF_TemporalDrift.uproject' -unattended -nop4 -nosplash -NullRHI '-ExecCmds=Automation RunTests BTTF.Vehicle.DeLorean; Quit' '-TestExit=Automation Test Queue Empty' -log
```

Expected: `MeshSimulatesPhysics` and `WheelBonesExist` both report `Result={Success}`.

- [ ] **Step 6: Perform live Play-in-Editor verification**

Open `LVL_TimeTravelTest`, enter Play mode, and verify:

- The south approach frames the courthouse and clocktower.
- W/S, A/D, and Space control the DeLorean.
- The car can enter and complete the road loop.
- Curbs and props do not trap the vehicle.
- Storefront rows define the east, west, and south edges.
- Lit mode is readable with no black-screen or Lumen dependency.

- [ ] **Step 7: Save the final checkpoint**

Save all assets and record the final map timestamp and validator/test results in `Scripts/hill_valley/README.md`. Git commit is skipped because Git is unavailable.
