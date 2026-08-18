# Unity Clean Build Evaluation

**Question:** Should Temporal Drift restart as a clean Unity project, and what from the current Unreal 5.8 repo is worth keeping?

**Answer:** Yes. Start a **new Unity 6 URP project**. Do not convert `BTTF_TemporalDrift.uproject`. Most of the Unreal `Content/` tree is not salvageable as Unity assets. The portable value is **source meshes, authored game rules, campaign/timeline data, design docs, and the engine-agnostic Ripple City prototype**.

A starter Unity project that imports those pieces lives in `Unity/TemporalDrift/`.

## Recommendation

Rebuild in Unity. Keep the Unreal tree as a frozen reference until a Unity vertical slice (drive, 1985↔1955 jump, one mission loop) is playable.

| Factor | Unreal 5.8 today | Clean Unity 6 URP |
| --- | --- | --- |
| What is actually in git | C++ systems + Python commandlets + ~2,750 `.uasset` binaries | Text YAML/C#, FBX, JSON |
| Visual fidelity in-repo | Primitive cubes/cylinders generated as Hill Valley; not using Lumen as a content advantage | Same fidelity is achievable immediately with primitives + URP |
| Agent / student workflow | Windows + local UE 5.8 required; cloud agents cannot PIE | C# compiles in-editor; no engine license server |
| Vehicle physics | Chaos Vehicles (not portable) | WheelCollider / custom rigidbody (rewrite) |
| Era switching | World Partition Data Layers | Additive scenes or GameObject layers |
| VFX | Niagara binaries | URP VFX Graph (rebuild from docs, not files) |

The Unreal project is a **tooling-heavy prototype**, not a content-complete game. A clean Unity rebuild is cheaper than maintaining a UE 5.8 Windows pipeline for cube-built town dressing.

## What is salvageable

### Keep and import (high value)

| Asset | Location | Unity use |
| --- | --- | --- |
| Hero time-machine mesh | `SourceArt/Vehicles/DeLorean/Exports/HeroTimeMachine.fbx` | Vehicle visual (original geometry, not a film mesh) |
| Hero character mesh | `SourceArt/Characters/Hero/Exports/Hero1985.fbx` | Player visual + armature names |
| Blender sources + generators | `SourceArt/**/*.blend`, `generate_*.py` | Regenerable art; keep as source of truth |
| Concept stills | `Assets/ConceptArt/*.jpg` (43 images) | Mood/reference boards only |
| Time-travel rules | `TimeTravelSubsystem` + `TemporalDriftSettings` | C# `TimeTravelSystem` |
| Timeline fact graph | `Scripts/create_timeline_data.py` | JSON + `TimelineFactGraph` |
| Campaign + side missions | `create_campaign_missions.py`, `create_side_missions.py` | JSON + `MissionSystem` |
| Dialogue lines | `Scripts/create_dialogue_assets.py` | JSON conversations |
| Vehicle tuning numbers | `DeLoreanTuningData.h` | JSON / ScriptableObject |
| Hill Valley layout | `Scripts/hill_valley/*.py` | JSON block layout + mission volumes |
| Original cast / campaign | `Docs/Design/MissionCampaign.md` | Vale, Parker, Diaz, Crane, Ward |
| Ripple City prototype | `CausalCityPrototype/` | Keep as a sibling WebGL/browser sim; later JSON-bridge into Unity |
| Design / QA docs | `Docs/` | Requirements for the Unity slice |

### Keep as reference only (rewrite, do not import)

- All C++ under `Source/BTTF_TemporalDrift/` — rules port, engine types do not
- Unreal Python builders — layout numbers port, `unreal.*` API does not
- Input action *design* (`IMC_DeLorean`, keyboard contract) — recreate with Unity Input System
- Niagara / post-process *intent* in `Docs/Niagara_Systems_Guide.md` and `Docs/PostProcess_TemporalDistortion.md`

### Do not bring across

| Item | Why |
| --- | --- |
| `Content/**/*.uasset` and `*.umap` (~2,750 files, including World Partition hashes) | Unreal-only binaries; no Unity importer |
| `Content/Vehicles/SportsCar/` | Unreal starter content |
| Niagara systems, UMG widgets, Chaos vehicle setup, Data Layer assets | Engine-specific |
| Placeholder `SoundWave` / MetaSound assets | Empty shells; no licensed audio in git |
| Film-track music catalog | Licensed BTTF / Huey Lewis / Chuck Berry recordings must not be committed |
| Genealogy rows `McFly.*`, `Tannen.*`, `Wilson.Goldie` | Trademark-bearing names; original cast already exists |
| PowerShell `UnrealEditor-Cmd` pipeline | Replaced by Unity Editor scripts / CI |

## Legal / IP boundary (Unity must be stricter)

The Unreal repo is labeled Back to the Future-inspired and still contains franchise-adjacent names, music targets, and concept images of a gull-wing stainless coupe and clocktower lightning.

For the Unity project:

- Ship the **Hero Time Machine** (already documented as original geometry) and **Hero 1985**, not a DeLorean product likeness as the product name
- Keep original characters: Dr. Emmett Vale, June Parker, Rosa/Elena Diaz, Victor Crane, Principal Ward
- Drop McFly / Tannen / Biff / Goldie Wilson from genealogy
- Do not import film audio; commission original era loops
- Treat `Assets/ConceptArt` as **private reference**, not store-page or in-game art, until legal review

## Suggested Unity stack

- **Unity 6 LTS (6000.0)** + **URP**
- **Input System** + **Cinemachine**
- **UGUI** (or UI Toolkit) for time circuits
- Additive scenes per era (`Era_1985`, `Era_1955`, …) instead of Data Layers
- JSON in `Resources` or Addressables for missions, facts, dialogue, layout
- Keep `CausalCityPrototype` as a browser tool until a C# adapter is needed

## First Unity vertical slice (do this, not a full port)

1. Import `HeroTimeMachine.fbx`, apply URP lit materials from the Blender slots
2. Drive + hover with the salvaged tuning numbers (1320 kg, 40° steer, 40 MPH jump gate)
3. Rebuild courthouse square from `HillValleyLayout.json` (primitives first)
4. Arm circuits → 40 MPH → 1985→1955 additive-scene swap
5. Run M01 → M02 from `Missions.json`
6. Show fact-gated signage from `TimelineFacts.json`

Stop there. Do not port combat, genealogy, crafting, Niagara, or metro expansion until that loop is playable.

## Effort (technical, not calendar)

- **Invasive:** entire runtime, physics, UI, world, VFX, and build pipeline
- **Not invasive:** data and meshes listed above; they copy as files
- **Risk:** trying to “open Unreal content in Unity” or wrapping Chaos/Niagara. That path is a dead end
- **Dependency:** a Windows or Mac machine with Unity 6 to generate `.meta` GUIDs, materials, and the first playable scene. This repo’s C#/JSON is ready before that step

## Proof in this branch

`Unity/TemporalDrift/` contains the salvaged FBX, concept reference, JSON extracted from Unreal Python, and C# ports of time travel, facts, missions, and dialogue. Engine-agnostic tests live in `Scripts/Unity/test_unity_salvage.py`.
