# BTTF Temporal Drift - Updated Project (v2)

**Back to the Future GTA-style Open World Unreal Engine 5.8 Prototype**

This package contains the latest iteration of the project scaffold, including:

- Expanded TimeTravelSubsystem with full Paradox, Hawking Radiation, and Tipler Cylinder mechanics
- All generated concept art (43 images)
- Documentation and design files

## Run the Playable Test

Open the test map in a forced 1280x720 window (the script also overrides Unreal's remembered narrow window geometry):

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\run_game.ps1
```

## What's Included

### Core Code (Latest)
- `Source/BTTF_TemporalDrift/Public/TimeTravelSubsystem.h` (Fully expanded with Paradox + Hawking + Tipler)

### Concept Art
Located in `Assets/ConceptArt/` — includes all generated scenes:
- DeLorean in different eras
- Flux Capacitor diagrams
- Time Circuits UMG mockups
- Key story moments (Marty vs Biff, train rescue, lightning strike, etc.)
- 2045 futuristic variations
- Branching story flowchart

### Documentation
See the `Docs/` folder for Phase prompts, Asset Lists, Niagara setups, etc.

## Next Steps to Complete the Project

See the full list at the end of this document.

---

## Complete List of Further Items Needed to Finish the Project

### 1. Core Systems (High Priority)
- Full `TimeTravelSubsystem.cpp` implementation (expanded version)
- Updated `DeLoreanVehicle.h` and `.cpp` with flux charging, radiation damage, and Tipler support
- GameInstance with timeline save/load system
- Custom GameMode
- Enhanced Input mappings for Time Circuits

### 2. UI / Time Circuits
- Actual UMG Widget files for Time Circuits (WBP_TimeCircuits)
- Blueprint implementation that reads from TimeTravelSubsystem
- Paradox warning indicators and Hawking radiation meter

### 3. VFX / Niagara
- Complete Niagara systems for:
  - Flux Capacitor pulsing + arcs
  - Temporal vortex / wormhole
  - Hawking radiation particle feedback
  - Tipler Cylinder charging effect
- Material instances for temporal distortion post-process

### 4. World & Level Design
- Data Layers for all eras (1885, 1955, 1985, 1985A, 2015, 2045)
- World Partition setup with era swapping
- At least 2–3 test levels with different eras
- Level Blueprints for testing time travel

### 5. Data Assets
- Multiple `UEraDataAsset` examples with building variants and Lumen scenarios
- Sample Wheel Data Assets for Chaos Vehicles
- Input Action and Input Mapping Context assets

### 6. Gameplay Mechanics
- Full Paradox consequence system (NPC changes, reality tears, timeline collapse events)
- Hawking Radiation damage and venting minigame
- Tipler Cylinder implementation as high-risk alternative
- Hover mode for 2015 DeLorean (Chaos force application)

### 7. Save & Progression
- SaveGame class for timeline state, paradox level, and discovered eras
- Persistent timeline flags across sessions

### 8. Polish & Content
- Sound design (time travel whoosh, flux charging hum, paradox warnings)
- More concept art / storyboards for cutscenes
- Basic AI for key characters (Biff, Doc, young Marty)
- At least one vertical slice level that demonstrates a full time jump with consequences

### 9. Technical
- ChaosVehicles plugin configuration and Wheel Data Assets
- Optimized DefaultEngine.ini for Lumen + Nanite + Niagara
- Packaging settings for Windows

---

**Status**: This v2 package contains the most up-to-date core systems and all visual concepts generated so far.

The project is now at a strong mid-prototype stage. The remaining work is mostly implementation of the systems already designed in the documentation.

## VS Code Development Commands

Open the repo root as your VS Code workspace, then use a PowerShell terminal.

**First-time Unreal connection:** see `Docs/QA/UnrealEditorConnection.md` and run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\setup_vertical_slice.ps1
```

**Daily commands:**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\build_editor.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\run_automation.ps1 -Filter BTTF
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\package_windows.ps1 -Configuration Development
```

Close Unreal Editor before compiling C++ from VS Code. If Unreal reports that modules are missing or were built with another engine version, run `build_editor.ps1`, confirm `Result: Succeeded`, and reopen `BTTF_TemporalDrift.uproject`. Automation output is written to `Saved\Logs\BTTF_Automation.log`; packaging output defaults to `Builds\Windows-Development` or `Builds\Windows-Shipping`.

## Vehicle Controls

- Up Arrow: accelerate
- Down Arrow: reverse
- Left/Right Arrow: steer
- Space: handbrake
- H: toggle hover mode
- R: reset vehicle
- C: cycle chase, hood, bumper, and cockpit cameras
- Q/E: select destination era
- T: toggle time circuits
- F: initiate time travel

Controller equivalents remain available through `/Game/Input/IMC_DeLorean`.
