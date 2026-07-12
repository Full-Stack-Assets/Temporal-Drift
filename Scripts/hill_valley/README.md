# Hill Valley Square Builder

This folder contains the deterministic neutral-base builder and read-only validator for `/Game/Levels/LVL_TimeTravelTest`.

Generated actors always carry the `HV_Generated` tag. Rebuilds delete only loaded actors with that tag and never delete the DeLorean, Player Start, lighting, sky, post-process actors, or Data Layer assets.

## Build

```powershell
& 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe' 'C:\Users\Shadow\Downloads\BTTF_TemporalDrift_v3\BTTF_TemporalDrift.uproject' -unattended -nop4 -nosplash -NullRHI -run=pythonscript '-script=C:\Users\Shadow\Downloads\BTTF_TemporalDrift_v3\Scripts\hill_valley\build_hill_valley_square.py' -log
```

## Validate

```powershell
& 'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe' 'C:\Users\Shadow\Downloads\BTTF_TemporalDrift_v3\BTTF_TemporalDrift.uproject' -unattended -nop4 -nosplash -NullRHI -run=pythonscript '-script=C:\Users\Shadow\Downloads\BTTF_TemporalDrift_v3\Scripts\hill_valley\validate_hill_valley_square.py' -log
```

The final validator must emit `HILL_VALLEY_VALIDATION_SUCCESS` without Python errors.

## Backup

The pre-build map backup is `Saved/Backups/LVL_TimeTravelTest_pre_hill_valley.umap`.
