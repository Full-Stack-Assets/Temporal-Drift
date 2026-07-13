# Temporal Drift Known Issues

Last updated: 2026-07-13

## Blocking vertical-slice acceptance

- The current vehicle and town architecture are authored prototype-quality assets, not final cinematic-quality art.
- Time travel changes the era reliably, but final transition VFX binaries, licensed audio, and arrival feedback still require editor import.
- The 1955 dressing is visibly distinct at courthouse square but remains sparse and highly modular.
- Full Clocktower Calibration mission still requires a live packaged playthrough after running `Scripts/hill_valley/place_mission_volumes.py`.
- Licensed era music WAVs must be imported locally per `Docs/Audio/EraMusic.md`.
- Clean-machine Development and Shipping package acceptance is not yet recorded.

## Resolved in code (pending live PC verification)

- Mission coordinator, event volumes, and interactables wire M01–M03 scaffolding plus full M02 flow.
- Save/load captures hero/vehicle transforms, crafting inventory, timeline fact overrides, and mission checkpoints.
- Campaign mission assets now use stable dotted IDs (`M02.ClocktowerCalibration`) matching C++ save/restore.
- Runtime pause menu (`UPauseMenuWidget`) and settings (`USettingsWidget`) with profile volume/scale controls.
- Timeline fact data script (`Scripts/create_timeline_data.py`) seeds campaign consequence flags.

## Non-blocking development warnings

- Editor startup reports missing optional profiler DLLs (`aqProf`, VTune, WinPix); these are not game runtime dependencies.
- The test map's HLOD assets report missing editor-only `WorldPartitionHLODUtilities` classes when launched directly in game mode. HLOD assets must be regenerated or their runtime references cleaned before package acceptance.
- `r.EyeAdaptationQuality` reports a scalability-priority warning because the project setting intentionally overrides it.
- Legacy `Scripts/create_input_assets.py` (`IMC_Vehicle`) is superseded by `Scripts/create_complete_vehicle_input.py`.
