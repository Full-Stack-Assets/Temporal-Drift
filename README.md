# BTTF Temporal Drift

**A Windows-first Unreal Engine 5.8 vertical-slice prototype for a Back to the Future-inspired open-world time-travel game.**

Temporal Drift is no longer just a concept package. This repository contains a playable Unreal project scaffold with C++ gameplay systems, editor automation, deterministic world-building scripts, mission/content generation, and supporting concept/source art for a DeLorean-focused time-travel prototype.

## Current Status

The project is in a **mid-prototype / vertical-slice** stage.

What is already present in this repo:
- A real UE 5.8 project: `BTTF_TemporalDrift.uproject`
- C++ runtime code for the core vehicle, time-travel flow, UI, mission, save, and era systems
- PowerShell build / package / automation scripts in `Scripts/Build/`
- Unreal Python scripts that generate and validate content, input assets, dialogue, missions, and world state
- Hill Valley world-building and era-dressing automation in `Scripts/hill_valley/`
- Documentation for setup, design, implementation plans, and feature-specific systems
- Concept art and source art used to support the prototype

What is **not** true yet:
- This is not a finished game
- Some docs still describe planned systems or future expansion
- Several gameplay/content systems are scaffolded or partially implemented rather than fully production-complete

## Repository Layout

```text
BTTF_TemporalDrift.uproject   Unreal Engine 5.8 project file
Config/                       Maps, GameMode/GameInstance, renderer, input, project settings
Content/                      Unreal content root
Assets/                       Concept art and supporting visual assets
Docs/                         Setup guides, implementation notes, design docs, improvement log
Scripts/                      Unreal Python and utility scripts
  Build/                      Build, automation, packaging, and setup pipeline
  hill_valley/                Hill Valley generation, era dressing, placement, and validation
Source/                       C++ game code and build targets
  BTTF_TemporalDrift/         Runtime module
SourceArt/                    Source-owned hero vehicle art and regeneration notes
```

## Core Implemented Areas

### C++ Gameplay Systems
Key runtime code lives under `Source/BTTF_TemporalDrift/`.

Notable systems include:
- `TimeTravelSubsystem` — jump state flow, flux energy, paradox, Hawking radiation, Tipler jump support
- `DeLoreanVehicle` — driving, hover mode, camera presets, flux charging, time-jump initiation
- `BTTF_GameMode` / `BTTF_GameInstance` — startup flow, save/load, mission bootstrapping
- Mission systems — `MissionSubsystem`, `MissionCoordinatorSubsystem`, mission volumes and interactables
- UI / presentation systems — time circuits, dialogue, pause/settings widgets, fading photograph, presentation effects
- Era / world systems — timeline facts, timeline variants, era music, era weather, population/world support

### Build and Automation Pipeline
The main setup pipeline is:
- `Scripts/Build/setup_vertical_slice.ps1`

That script builds the editor, runs Unreal Python generators, builds Hill Valley and era variants, places mission volumes and traffic routes, validates content, and runs the `BTTF` automation suite.

### Hill Valley World Building
`Scripts/hill_valley/` contains deterministic procedural builders and validators for the main test level.

This includes:
- courthouse square generation
- metro expansion generation
- 1885 / 1955 / 1985A / 2015 / 2045 dressing
- timeline-variant signage swaps
- mission volume placement
- traffic route placement
- validation passes for square, 1955 dressing, era dressing, mission placement, and materials

## Requirements

Run this project on a **Windows PC** with:
- **Windows 10 or 11**
- **Unreal Engine 5.8**
- **PowerShell**

Default UE install path expected by scripts:

```text
C:\Program Files\Epic Games\UE_5.8
```

If your engine is installed elsewhere, pass `-UeRoot` to the setup script.

## Getting Started

See `Docs/PC_Setup_Guide.md` for the full playtest/setup guide.

### 1. Get the latest code

Current working branch for the latest vertical-slice updates:

```powershell
git fetch origin
git checkout cursor/all-timelines-ripple-effects-492a
git pull origin cursor/all-timelines-ripple-effects-492a
```

After that branch is merged, switch back to `main`:

```powershell
git checkout main
git pull origin main
```

### 2. Run the one-command setup

From the repo root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\setup_vertical_slice.ps1
```

This setup pipeline:
1. Builds `BTTF_TemporalDriftEditor`
2. Generates missions, timeline facts, dialogue, UI, music placeholders, and presentation assets
3. Builds Hill Valley plus all configured era dressing passes
4. Places mission volumes and traffic routes
5. Runs validators
6. Runs the `BTTF` automation suite

### 3. Open the project

```powershell
start .\BTTF_TemporalDrift.uproject
```

Or use:

```powershell
.\Scripts\Build\run_game.ps1
```

Default map:

```text
/Game/Levels/LVL_TimeTravelTest
```

## Daily Development Commands

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\build_editor.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\run_automation.ps1 -Filter BTTF
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\package_windows.ps1 -Configuration Development
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\package_smoke_test.ps1 -Configuration Development
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\package_smoke_test.ps1 -Configuration Shipping
```

## Playtest Controls

Keyboard controls currently documented and wired for the test flow include:
- Up Arrow: accelerate
- Down Arrow: reverse
- Left / Right Arrow: steer
- Space: handbrake
- H: toggle hover mode
- R: reset vehicle
- C: cycle chase / hood / bumper / cockpit cameras
- V: toggle auto-chase camera
- Q / E: cycle destination era
- T: toggle time circuits
- F: initiate time travel

Controller support is also wired through Unreal input assets such as `/Game/Input/IMC_DeLorean`.

## Important Notes

- Cloud coding agents can edit code, but **your Windows machine must run Unreal builds, commandlets, and playtests**
- If Unreal says modules were built with a different version or are missing, rerun `Scripts/Build/build_editor.ps1`
- Close Unreal Editor before rebuilding C++ from VS Code or PowerShell
- Some documentation files describe target-state systems that are only partially implemented today; treat `Source/` and the setup scripts as the best source of truth for what currently works

## Recommended Docs

Start here:
- `Docs/PC_Setup_Guide.md`
- `Docs/IMPROVEMENT_PLAN.md`
- `Docs/QA/UnrealEditorConnection.md`

Feature-specific docs worth reading:
- `Docs/Paradox_Consequences.md`
- `Docs/DataLayer_EraSwitching.md`
- `Docs/TimeCircuits_UMG_Implementation.md`
- `Docs/Niagara_Systems_Guide.md`
- `Docs/HoverMode_Implementation.md`

## Known Limitations

- The repo mixes implemented runtime systems with forward-looking design docs
- Some systems are scaffolds or prototype implementations rather than full content-complete features
- Packaging, world generation, and content creation depend on Unreal Editor commandlets and local engine installation
- The project is best understood as a **playable prototype and tooling-heavy vertical slice**, not a content-complete production game
