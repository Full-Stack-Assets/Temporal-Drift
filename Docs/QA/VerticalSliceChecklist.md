# Temporal Drift Vertical-Slice QA Checklist

Last updated: 2026-07-12

## Automated evidence

- [x] `Scripts/Build/build_editor.ps1` completed with `Result: Succeeded` after the asynchronous era-readiness changes.
- [x] `Scripts/Build/run_automation.ps1 -Filter BTTF` found 28 tests and completed all 28 with `Result={Success}`.
- [x] Neutral-world validator emitted `HILL_VALLEY_VALIDATION_SUCCESS` in `Saved/Logs/HillValleyValidation.log`.
- [x] 1955 validator emitted `HILL_VALLEY_1955_VALIDATION_SUCCESS` in `Saved/Logs/HillValley1955Validation.log`.

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

- [ ] Complete five consecutive player-driven 1985-to-1955 jumps without the QA command.
- [ ] Replace the Canvas debug HUD with final scalable UMG presentation.
- [ ] Add complete jump VFX, audio, distortion, fire trails, arrival frost, and reduced-flash variants.
- [ ] Complete the Clocktower Calibration mission from new game through return to 1985.
- [ ] Verify save/quit/continue at each objective boundary.
- [ ] Run Development and Shipping packaged-build smoke tests on a machine without Unreal Editor.
- [ ] Complete keyboard/mouse and controller acceptance at 1080p.

