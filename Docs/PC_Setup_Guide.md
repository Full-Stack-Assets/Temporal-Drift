# Temporal Drift — PC Setup Guide

Last updated: 2026-07-13

Run everything below on your **Windows PC** with **Unreal Engine 5.8** installed. Cloud agents edit code in git; only your machine can build the editor, run Python commandlets, and play the game.

---

## Requirements

| Item | Detail |
|------|--------|
| OS | Windows 10/11 |
| Engine | UE 5.8 at `C:\Program Files\Epic Games\UE_5.8` |
| Shell | PowerShell |
| Repo | Clone of [Temporal-Drift](https://github.com/Full-Stack-Assets/Temporal-Drift) |

If UE is installed elsewhere, pass `-UeRoot 'C:\Path\To\UE_5.8'` to setup scripts.

---

## 1. Get the latest code

Open PowerShell in the repo root:

```powershell
git fetch origin
git checkout cursor/all-timelines-ripple-effects-492a
git pull origin cursor/all-timelines-ripple-effects-492a
```

After this branch merges, use `main` instead:

```powershell
git checkout main
git pull origin main
```

---

## 2. One-command setup (recommended)

From the repo root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Build\setup_vertical_slice.ps1
```

This script:

1. Builds `BTTF_TemporalDriftEditor` (Win64 Development)
2. Generates missions, timeline facts, dialogue, UI, music placeholders, and presentation assets
3. Builds Hill Valley (courthouse + metro), all six era dressings, and timeline variant signage
4. Places mission volumes and traffic routes
5. Runs validators and the `BTTF` automation suite

**Expect ~15–30 minutes** on first run (compile + commandlets). Later runs are faster if C++ is unchanged.

### Faster re-runs

```powershell
# Skip compile if you only pulled script/content changes
.\Scripts\Build\setup_vertical_slice.ps1 -SkipBuild

# Skip automation after a quick content rebuild
.\Scripts\Build\setup_vertical_slice.ps1 -SkipAutomation
```

---

## 3. Open the project

```powershell
# Option A — launch editor directly
start .\BTTF_TemporalDrift.uproject

# Option B — game window script
.\Scripts\Build\run_game.ps1
```

Default map: `/Game/Levels/LVL_TimeTravelTest`

If prompted to rebuild modules, accept. If the editor reports **0 compile actions** but C++ changed, close the editor and run:

```powershell
.\Scripts\Build\build_editor.ps1
```

---

## 4. Play in the editor (PIE)

1. Open `LVL_TimeTravelTest`
2. Press **Play**
3. Drive the DeLorean — **40 MPH** jump threshold

| Input | Action |
|-------|--------|
| WASD / arrows | Drive |
| `T` | Toggle time circuits |
| `Q` / `E` | Cycle destination era |
| `F` | Time jump (when armed) |
| `G` | Exit vehicle (on foot) |
| `Esc` | Pause + autosave |

### Quick verification

- HUD shows speed, flux, era, mission objective, and (when active) ripple summary
- Jump **1985 → 1955** — square dressing changes, era music crossfades
- Walk to courthouse — mission volumes and dialogue interactables respond
- Polaroid widget pulses when paradox is high

### Timeline ripple test

After setup, signage variants are placed for diner, plaque, school, and street name. In PIE, when mission facts flip (e.g. complete M03), returning to 1985 should swap visible signs. See `Docs/Design/TimelineRipples.md` for the full fact graph.

---

## 5. Run automation only

```powershell
.\Scripts\Build\run_automation.ps1 -Filter BTTF
```

Useful subsets:

```powershell
.\Scripts\Build\run_automation.ps1 -Filter BTTF.Timeline
.\Scripts\Build\run_automation.ps1 -Filter BTTF.Mission
.\Scripts\Build\run_automation.ps1 -Filter BTTF.World
```

All tests should pass. If `BTTF.World.HillValleyComplete` fails, re-run setup step 2 (Hill Valley builders must run in the editor).

---

## 6. Optional: licensed music

C++ era music is ready; audio files are not in git.

1. Read `Docs/Audio/EraMusic.md`
2. Import WAVs to `/Game/Audio/Music/Eras/`
3. Rebuild if needed, PIE test crossfade on era jumps

---

## 7. Optional: packaged build smoke test

```powershell
.\Scripts\Build\package_smoke_test.ps1 -Configuration Development
.\Scripts\Build\package_smoke_test.ps1 -Configuration Shipping
```

Confirms the game runs without the editor on a clean launch.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Unreal Engine 5.8 was not found` | Install UE 5.8 or pass `-UeRoot` |
| Modules out of date / compile errors | Close editor → `.\Scripts\Build\build_editor.ps1` |
| `0 compile actions` after pulling C++ | Touch a `.cpp` or run `build_editor.ps1` |
| Hill Valley empty or validation fails | Re-run `setup_vertical_slice.ps1` |
| Mission volumes missing | Check `Saved/Logs/place_mission_volumes.py.log` |
| Python `unreal` not found | Never use system Python — only `UnrealEditor-Cmd` via setup script |
| Black screen / no light | `UnrealEditor-Cmd … -script=Scripts/fix_level_lighting.py` |
| Save not continuing | `Esc` pause saves; relaunch with default `bAutoLoadSaveOnStart` |

Logs for commandlets: `Saved/Logs/<script-name>.log`

---

## What still needs the editor (not code)

- Niagara jump VFX (`NS_FluxCharge`, etc.) — author emitters; placeholders exist
- Hero DeLorean mesh unification
- Authored `WBP_TimeCircuits` art (C++ fallback HUD works)
- Live 1080p controller acceptance pass

---

## Deeper references

| Topic | Doc |
|-------|-----|
| Timeline ripples (past → future) | `Docs/Design/TimelineRipples.md` |
| Hill Valley metro map | `Docs/Design/HillValleyMetro.md` |
| Era music import | `Docs/Audio/EraMusic.md` |
| QA checklist | `Docs/QA/VerticalSliceChecklist.md` |
| Roadmap status | `Docs/QA/RoadmapStatus.md` |

---

## Agent ↔ PC workflow

1. Cloud agent commits and pushes to GitHub
2. You `git pull` on Windows
3. Run `setup_vertical_slice.ps1`
4. PIE playtest and note results in `Docs/QA/VerticalSliceChecklist.md` if validating a release
