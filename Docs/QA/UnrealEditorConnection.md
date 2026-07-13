# Connecting Temporal Drift to Unreal Engine 5.8

Last updated: 2026-07-13

**Start here:** [`Docs/PC_Setup_Guide.md`](../PC_Setup_Guide.md) — concise pull → build → play instructions for Windows.

This file adds extra detail on commandlets and the agent workflow.

## Where Unreal runs

Unreal Editor **does not run inside the Cursor Cloud Agent**. The agent edits C++, scripts, and docs in git. You connect the project to Unreal on your **local Windows machine** where UE 5.8 is installed.

Expected install path (used by all build scripts):

`C:\Program Files\Epic Games\UE_5.8`

## One-command local setup

From the repo root in **PowerShell**:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\setup_vertical_slice.ps1
```

This script:

1. Verifies UE 5.8 and the `.uproject` exist
2. Builds `BTTF_TemporalDriftEditor Win64 Development`
3. Runs campaign mission asset generation
4. Runs presentation material + placeholder VFX/audio asset generation
5. Places M02 mission volumes in `LVL_TimeTravelTest`
6. Runs Hill Valley validators
7. Runs the full `BTTF` automation suite

## Manual connection (first time)

### 1. Get the latest branch

```powershell
git fetch origin
git checkout cursor/roadmap-vertical-slice-completion-492a
git pull
```

Or merge PR #4 into `main` and use `main`.

### 2. Open in Visual Studio / Rider

- Open `BTTF_TemporalDrift.uproject` and allow UE to regenerate project files, **or**
- Open the generated `BTTF_TemporalDrift.sln` after generating from the `.uproject`.

The repo includes `.vsconfig` with the Unreal VS workload components.

### 3. Build editor modules

Close Unreal Editor first, then:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\build_editor.ps1
```

Expect: `Result: Succeeded`

### 4. Open the project in Unreal Editor

Double-click `BTTF_TemporalDrift.uproject` or:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\run_game.ps1
```

Default map: `/Game/Levels/LVL_TimeTravelTest`

### 5. Run commandlets (headless editor)

Use `UnrealEditor-Cmd.exe` for Python builders without opening the UI:

```powershell
$UE = 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe'
$PROJ = (Resolve-Path .\BTTF_TemporalDrift.uproject).Path

& $UE $PROJ -unattended -nop4 -nosplash -NullRHI -run=pythonscript `
  '-script=.\Scripts\create_campaign_missions.py' -log

& $UE $PROJ -unattended -nop4 -nosplash -NullRHI -run=pythonscript `
  '-script=.\Scripts\create_presentation_assets.py' -log

& $UE $PROJ -unattended -nop4 -nosplash -NullRHI -run=pythonscript `
  '-script=.\Scripts\hill_valley\place_mission_volumes.py' -log
```

### 6. Verify in editor

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\run_automation.ps1 -Filter BTTF
```

## Live playtest checklist

1. PIE in `LVL_TimeTravelTest` — possess DeLorean, drive to 40 MPH
2. `T` circuits on, `Q/E` select 1955, `F` jump (five times, no `QAJumpTo1955`)
3. `G` exit vehicle at courthouse, interact with mission actors
4. Complete M02 through return to 1985
5. `Esc` pause — progress saves automatically; press `Esc` again to resume
6. Quit editor and relaunch — game continues from `BTTF_SaveSlot` when `bAutoLoadSaveOnStart` is enabled (default)
7. Run packaged smoke test:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\package_smoke_test.ps1 -Configuration Development
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\package_smoke_test.ps1 -Configuration Shipping
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Modules missing / wrong engine version | Run `build_editor.ps1`, reopen `.uproject` |
| Automation assets fail to load | Run `create_campaign_missions.py` and import scripts first |
| Mission volumes missing | Run `place_mission_volumes.py` |
| Black screen / no lighting | Run `Scripts/fix_level_lighting.py` |
| Python `unreal` module not found | Must run scripts through `UnrealEditor-Cmd.exe`, not system Python |

## Agent ↔ Editor workflow

1. Agent commits C++/scripts to git branch
2. You `git pull` on Windows
3. Run `setup_vertical_slice.ps1`
4. Record results in `Docs/QA/VerticalSliceChecklist.md`

The cloud agent cannot click in the editor or capture PIE screenshots; that evidence must be recorded on your machine.
