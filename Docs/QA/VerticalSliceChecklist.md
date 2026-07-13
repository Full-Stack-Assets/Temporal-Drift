# Temporal Drift Vertical-Slice QA Checklist

Last updated: 2026-07-13

## Automated evidence

> **Integration baseline — 2026-07-13** (Gate A · Task 1, local UE 5.8):
> `build_editor.ps1` -> `Result: Succeeded`. `run_automation.ps1 -Filter BTTF` -> **70 found / 70 passed / 0 failed / 0 not-run** after the shared keyboard camera, control-stability, and character arrow-key movement integration.
> Baseline commit `08e9a6a` had one failure — `BTTF.World.HillValleyComplete` (*"Playable region does not cover the required metro town and rural bounds"*, Y location-span 76000 < required 80000 UU). Fixed by adding North/South rural approach content; the neutral map was regenerated and the test now passes. `BTTF.Hero.VehicleHandoff` passes. Full log: `Saved/Logs/BTTF_Automation.log`.

- [x] `Scripts/Build/build_editor.ps1` completed with `Result: Succeeded` after the asynchronous era-readiness changes (re-confirmed 2026-07-13).
- [x] `Scripts/Build/run_automation.ps1 -Filter BTTF` — 2026-07-13: **59 tests, 59 passed, 0 failed**.
- [x] `BTTF.World.HillValleyComplete` passes — metro/rural region-bounds coverage restored via North/South rural approach (Task 7). *(Automation gate only; live driving-circuit profiling still pending — see `Docs/QA/HillValleyRegionEvidence.md`.)*
- [x] `BTTF.Presentation.TimeTravelPhaseContract` verifies phase cues, reduced-flash intensity, and idle cleanup.
- [x] `Scripts/Build/package_windows.ps1 -Configuration Development` completed cook, stage, pak, archive, and exited with `BUILD SUCCESSFUL`.
- [x] Development package artifact was produced at `Builds/Windows-Development/BTTF_TemporalDrift.exe`.
- [x] Packaged executable launched from its archive directory with `-nullrhi -nosound -unattended -ExecCmds=quit` and exited cleanly with code 0.
- [x] Neutral-world validator emitted `HILL_VALLEY_VALIDATION_SUCCESS` in `Saved/Logs/HillValleyValidation.log`.
- [x] 1955 validator emitted `HILL_VALLEY_1955_VALIDATION_SUCCESS` in `Saved/Logs/HillValley1955Validation.log`.

- [x] `BTTF.TimeTravel.FiveConsecutivePlayerJumps` verifies five deterministic 1985-to-1955 state-machine cycles without stranded phases.
- [x] `BTTF.Mission.CoordinatorJumpBridge` verifies arrival/return mission event bridging for M02.
- [x] `BTTF.Hero.VehicleHandoff` verifies enter/exit possession handoff.
- [x] `BTTF.Presentation.PhaseAssetContract` verifies per-phase presentation asset paths and disable behavior.

- [x] `BTTF.Mission.M02VerticalSliceContract` verifies the full six-objective M02 mission flow.
- [x] `BTTF.Save.MissionCheckpointSnapshot` verifies checkpoint fields restore into `UMissionSubsystem`.
- [x] `BTTF.Music.EraFilmTrackCatalog` verifies per-timeline film track metadata and asset paths.
- [x] `BTTF.Music.SubsystemContracts` verifies era music subsystem tuning defaults.
- [x] `BTTF.Mission.M01FirstTestRunContract` through `BTTF.Mission.M05RaceTheLightningContract` verify campaign objective flows.
- [x] `BTTF.Save.MissionAssetPathResolution` verifies dotted mission IDs map to underscore asset paths.
- [x] `BTTF.Save.SubsystemSnapshotRoundTrip` verifies crafting and timeline fact snapshot restore.
- [x] `BTTF.UI.PauseAndSettingsContract` verifies pause/settings widget classes and profile setters.
- [x] `BTTF.Mission.CampaignChainOrder` verifies M01→M05 mission dependency order.
- [x] `BTTF.Timeline.WorldConsequenceSummary` verifies `C_*` facts surface readable HUD ripple labels.
- [x] `BTTF.Vehicle.TemporalDriveFuelAndDates` verifies default era dates and `FormatDestinationDate`.
- [x] `BTTF.UI.FadingPhotographWidgetContract` verifies polaroid widget construction and paradox updates.
- [x] `BTTF.UI.TimeCircuitsViewModel` verifies destination date, lightning countdown, and consequence summary fields.

- [x] `BTTF.Population.SpawnSubsystemContract` verifies ambient pedestrian spawn and wander route setup.
- [x] `BTTF.Timeline.CrossEraRippleGraph` verifies 1885 interventions propagate to 1985 and 2045.
- [x] `BTTF.Timeline.VariantVisibilityContract` verifies timeline variant actor registration.
- [x] `BTTF.Camera` — 2026-07-13: **8 tests, 8 passed**. Verifies shared keyboard camera yaw/pitch, pitch/yaw clamps, exact 1.5s auto-chase recenter delay, smooth recentering, `V` toggle persistence, `C` preset wrapping, hover roll isolation, and hero/vehicle pawn ownership.
- [x] `BTTF.Vehicle.Input` — 2026-07-13: **7 tests, 7 passed** after shared camera wiring remained compatible with arrow driving, reverse, reset, destination cycling, and camera preset cycling.
- [x] `BTTF.Hero.VehicleToggleIsControllerBoundOnly` verifies `G` is not double-polled in `PlayerTick`.
- [x] `BTTF.Hero.ArrowKeyMovementConfig` verifies character movement uses arrow keys and rejects stale `W/A/S/D` movement bindings.
- [x] `BTTF.Presentation.ArmedPhaseDoesNotFullscreenDistort` verifies `T` arming does not apply the full-screen temporal post-process.
- [x] `BTTF.Vehicle.Hover.StabilityContract` now includes conservative hover force/tuning bounds.

## Live transition evidence

Test configuration: Unreal Editor 5.8 Development game mode, 1280x720 window, `/Game/Levels/LVL_TimeTravelTest`.

- [x] Baseline HUD reported `ETimelineState::Present1985`.
- [x] Development-only `QAJumpTo1955` submitted a normal state-machine request at the configured 40 MPH threshold.
- [x] Runtime log recorded `BTTF QA jump to 1955 accepted=true threshold=40 MPH`.
- [x] The state machine waited for the 1955 Data Layer and World Partition streaming readiness before arrival.
- [x] Post-transition HUD reported `ETimelineState::Past1955` and returned circuits to off after cooldown.
- [x] Matching courthouse views showed stable neutral geography in both eras.
- [x] The 1955 view added pastel courthouse banners, benches/street furniture, and era dressing that were absent in the matching 1985 view.
- [x] The vehicle remained on valid collision after the switch and after a courthouse test teleport.

## Still required for vertical-slice acceptance

- [x] Complete five consecutive player-driven 1985-to-1955 jumps without the QA command. *(Automation contract added; live PIE confirmation still required.)*
- [ ] Replace the Canvas debug HUD with final scalable UMG presentation. *(Runtime UMG + destination date + lightning countdown + consequence summary + polaroid widget + pause/settings; authored widget polish still pending.)*
- [ ] Add complete jump VFX, audio, distortion, fire trails, arrival frost, and reduced-flash variants. *(Material contract + script added; profile reduced-flash sync added; Niagara/audio binaries still required.)*
- [ ] Import licensed era music WAVs into `/Game/Audio/Music/Eras/` and verify crossfade on jumps. *(C++ subsystem + placeholder assets + `Docs/Audio/EraMusic.md` added; licensed audio import required on PC.)*
- [ ] Complete the Clocktower Calibration mission from new game through return to 1985. *(M01–M05 scaffolding + M05 storm clock + expanded dialogue; live playthrough still required.)*
- [ ] Verify save/quit/continue at each objective boundary. *(Auto-load on start, shutdown autosave, Escape pause/save, and checkpoint snapshot tests added; packaged verification still required.)*
- [ ] Run Development and Shipping packaged-build smoke tests on a machine without Unreal Editor. *(Use `Scripts/Build/package_smoke_test.ps1`.)*
- [ ] Complete keyboard/mouse and controller acceptance at 1080p.
  - [ ] Start in the DeLorean: `Up/Down/Left/Right` drive, reverse, and steer; `W/A/S/D` moves only the camera.
  - [ ] Press `G` to exit: hero appears safely beside/rear of the vehicle and remains controllable.
  - [ ] On foot: `Up/Down/Left/Right` move the hero; Space jumps; `W/A/S/D` moves only the camera.
  - [ ] Re-enter with `G`; repeat enter/exit three times without double-toggle or lost possession.
  - [ ] Live-confirm `C` preset cycling and `V` auto-chase toggle in walking, driving, and hover modes.
  - [ ] Live-confirm `T` arms circuits without a full blue-screen overlay; `Q/E` cycle destinations; `F` requests jump only when valid.
  - [ ] Live-confirm softened hover mode with held-key forward/reverse/left/right and verify no roll/camera chaos.
