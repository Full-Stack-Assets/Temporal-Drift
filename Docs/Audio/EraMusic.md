# Era Music — Film Track Guide

Last updated: 2026-07-13

## Overview

`UEraMusicSubsystem` crossfades era-appropriate music when World Partition era layers become ready. The vertical slice prioritizes tracks featured in the **Back to the Future** films.

**Important:** This repository ships **placeholder** `SoundWave` assets only. You must import properly licensed audio on your Windows machine before shipping.

## Intended film tracks by timeline

| Timeline | Primary track | Artist | Film moment |
|----------|---------------|--------|-------------|
| **1985 Present** | The Power of Love | Huey Lewis and the News | Opening / driving energy |
| **1985 Present (alt)** | Back in Time | Huey Lewis and the News | End credits / return motif |
| **1955 Past** | Earth Angel | The Penguins | Enchantment Under the Sea dance |
| **1955 Past (alt)** | Johnny B. Goode | Chuck Berry | Marty on stage at the dance |
| **1985 Alternate** | Dystopian underscore | Alan Silvestri (style) | Biff's Hill Valley |
| **2015 Future** | Futuristic underscore | Alan Silvestri (style) | Hill Valley 2015 |
| **1885 Wild West** | Western source | Licensed period music | Part III frontier |
| **2045 Deep Future** | Dystopian underscore | Alan Silvestri (style) | Part II future |

## Asset paths

Primary loops live under `/Game/Audio/Music/Eras/`:

- `MUS_1985_PowerOfLove`
- `MUS_1985_BackInTime`
- `MUS_1955_EarthAngel`
- `MUS_1955_JohnnyBGoode`
- `MUS_1985A_Dystopian`
- `MUS_2015_Future`
- `MUS_1885_Western`
- `MUS_2045_Dystopian`

Era data assets under `/Game/Data/EraDataAssets/DA_Era_*` reference these paths.

## Setup on your PC

```powershell
git pull
.\Scripts\Build\setup_vertical_slice.ps1
```

Or run only the music step:

```powershell
$UE = 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe'
$PROJ = (Resolve-Path .\BTTF_TemporalDrift.uproject).Path
& $UE $PROJ -unattended -NullRHI -run=pythonscript '-script=.\Scripts\create_era_music_assets.py' -log
```

### Import licensed audio

1. Obtain licensed WAV/FLAC files for each track (store outside git).
2. In Unreal Editor, import into `/Game/Audio/Music/Eras/` **using the exact asset names above**.
3. Enable **Looping** on each `SoundWave` used as background music.
4. Play PIE — verify HUD shows `NOW PLAYING: …` and music crossfades on 1985 ↔ 1955 jumps.

## Runtime behavior

- Music starts on `Present1985` when the world begins play.
- `UEraWorldManager::OnEraReady` triggers a crossfade to the destination era track.
- Time-travel presentation phases duck music volume (`TimeTravelDuckMultiplier`).
- Reaching the **1955 courthouse** during M02 switches to **Johnny B. Goode** (alternate 1955 track).
- Profile `MusicVolume` in `BTTF_Profile` scales playback.

## Automation

- `BTTF.Music.EraFilmTrackCatalog` — verifies catalog metadata and paths.
- `BTTF.Music.SubsystemContracts` — verifies subsystem tuning defaults.

## Licensing reminder

Do not commit copyrighted master recordings to git. Use placeholders in the repo and import licensed files locally or through your publisher's audio pipeline.
