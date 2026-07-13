# Temporal Drift Known Issues

Last updated: 2026-07-12

## Blocking vertical-slice acceptance

- The current vehicle and town architecture are authored prototype-quality assets, not final cinematic-quality art.
- The driving HUD is still Canvas/debug presentation and exposes enum-style era names.
- Time travel changes the era reliably, but final transition VFX, audio, camera treatment, and arrival feedback are incomplete.
- The 1955 dressing is visibly distinct at courthouse square but remains sparse and highly modular.
- The full Clocktower Calibration mission has not yet passed a start-to-finish packaged playthrough.
- Clean-machine Development and Shipping package acceptance is not yet recorded.

## Non-blocking development warnings

- Editor startup reports missing optional profiler DLLs (`aqProf`, VTune, WinPix); these are not game runtime dependencies.
- The test map's HLOD assets report missing editor-only `WorldPartitionHLODUtilities` classes when launched directly in game mode. HLOD assets must be regenerated or their runtime references cleaned before package acceptance.
- `r.EyeAdaptationQuality` reports a scalability-priority warning because the project setting intentionally overrides it.

