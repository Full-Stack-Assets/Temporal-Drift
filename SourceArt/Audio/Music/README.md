# Music Intake

Drop owned or licensed `.wav` files into:

```text
SourceArt/Audio/Music/Intake/
```

Use the filenames from `MusicIntakeManifest.json`, for example:

```text
MUS_1985_Main.wav
AMB_1985_Town.wav
MUS_1955_Main.wav
AMB_1955_Diner.wav
```

Preferred export:

- WAV
- 44.1 kHz or 48 kHz
- 16-bit or 24-bit PCM
- Stereo for music/ambience; mono is fine for one-shot effects
- Loopable files are best for ambience

Do not provide unlicensed commercial songs or film score files unless you own the rights for game use. If you want the game to feel era-identifiable immediately, use original/royalty-free tracks that evoke the era rather than copying protected songs.

After adding files, run:

```powershell
$UE = 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe'
$PROJ = (Resolve-Path .\BTTF_TemporalDrift.uproject).Path
$SCRIPT = (Resolve-Path .\Scripts\Assets\import_music_intake_assets.py).Path
& $UE $PROJ -unattended -nop4 -nosplash -NullRHI -run=pythonscript "-script=$SCRIPT" -log
```
