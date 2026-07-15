# First-Tier Cast, Audio, and Visual Identity Bible

Last updated: 2026-07-13

## Goal

The playable slice should be immediately readable as a cinematic time-travel small-town adventure without relying on copyrighted actor likenesses, trademarked logos, or unlicensed music. The player should understand the fantasy within seconds: a strange time machine, a courthouse clock, shifting eras, urgent science, diner rumors, frontier danger, future systems, and timeline instability.

## First-tier characters

| Character | Role | Readable silhouette / visual target | Voice target |
| --- | --- | --- | --- |
| Dr. Emmett Vale | Inventor mentor | wild gray hair, lab coat or mechanic coveralls, goggles, glowing instruments | fast, brilliant, warm, urgent |
| June Parker | Player ally / mechanic | short jacket, tool belt, field tablet, practical stance | grounded, smart, dry humor |
| Officer Crane | Law contact | small-town police uniform, flashlight, radio, square patrol | firm, skeptical, protective |
| Elena Cruz | Historian / archive witness | blazer/cardigan, notebook, camera, archive badge | clear, calm, observant |
| Rex Strickland | Rival driver / bully | varsity or leather jacket, aggressive stance, car keys | cocky, taunting |
| Mabel Finch | Diner owner / rumor hub | diner apron, coffee pot, bright 1950s palette | warm, sharp, gossipy |
| Marshal Silas Reed | 1885 lawman | duster, hat, badge, revolver silhouette without combat focus | steady western drawl |
| Nova Vale | 2045 engineer | clean future jacket, illuminated visor/tablet, precise posture | controlled, futuristic |

## Immediate implementation

- Source manifest: `SourceArt/Audio/GeneratedVoice/FirstTierVoiceLines.json`
- Local generated WAV output: `SourceArt/Audio/GeneratedVoice/WAV/`
- Unreal import path: `/Game/Audio/Dialogue/FirstTier/`
- Dialogue asset path: `/Game/Dialogue/FirstTier/`

Generate local placeholder voices:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Scripts\Assets\generate_first_tier_voice_wavs.ps1
```

Import generated WAVs and create dialogue assets:

```powershell
$UE = 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe'
$PROJ = (Resolve-Path .\BTTF_TemporalDrift.uproject).Path
$SCRIPT = (Resolve-Path .\Scripts\Assets\import_first_tier_voice_assets.py).Path
& $UE $PROJ -unattended -nop4 -nosplash -NullRHI -run=pythonscript "-script=$SCRIPT" -log
```

## Photorealistic character upgrade path

1. Replace blocky placeholder characters with MetaHuman or similarly licensed realistic human assets.
2. Assign each first-tier character a unique wardrobe material palette per era.
3. Use high-resolution face/hair assets only from licensed packs or custom-generated original humans.
4. Keep all character likenesses original; do not recreate protected film actors.
5. Add idle, walk, talk, gesture, enter/exit vehicle, and interact animation sets.

## Audio upgrade path

The generated voices are placeholders for immediate playtesting. For production-quality voices:

1. Generate original voices from licensed TTS providers; do not clone actors without permission.
2. Export WAV at 44.1 kHz or 48 kHz.
3. Replace files in `SourceArt/Audio/GeneratedVoice/WAV/` with the same IDs.
4. Rerun the import script.
5. Add era beds:
   - 1885: dusty wind, horse/rail ambience, saloon piano-style licensed source music
   - 1955: diner room tone, jukebox-style licensed/royalty-free doo-wop inspiration
   - 1985: suburban traffic, mall/store ambience, bright synth-rock-inspired score
   - 1985-A: low drones, distant sirens, neon hum, industrial impacts
   - 2015/2045: clean electric hums, drones, soft UI beeps, vertical city ambience

## Music file intake

Put owned/licensed music and ambience files in:

```text
SourceArt/Audio/Music/Intake/
```

Use the filenames listed in:

```text
SourceArt/Audio/Music/MusicIntakeManifest.json
```

The first pass expects one music track and one ambience bed per major era. WAV is preferred: 44.1 kHz or 48 kHz, stereo for music/ambience, loopable if possible. Import with:

```powershell
$UE = 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe'
$PROJ = (Resolve-Path .\BTTF_TemporalDrift.uproject).Path
$SCRIPT = (Resolve-Path .\Scripts\Assets\import_music_intake_assets.py).Path
& $UE $PROJ -unattended -nop4 -nosplash -NullRHI -run=pythonscript "-script=$SCRIPT" -log
```

## Minimum “few hours playable” bar

- Stable driving and walking controls.
- No blue-screen time circuit toggle.
- Player can enter/exit vehicle reliably.
- The town has visible PBR materials.
- At least eight named first-tier characters have dialogue with audible placeholder voices.
- Era transitions have distinct music/ambience stubs.
- Missions can be played without requiring a GPT/debugging loop.
