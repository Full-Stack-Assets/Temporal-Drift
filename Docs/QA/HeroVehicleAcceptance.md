# Hero DeLorean Gameplay Acceptance

Last updated: 2026-07-13

Gate A Task 5 evidence template. Record results on a Windows machine with UE 5.8 after `setup_vertical_slice.ps1`.

## Automated pre-checks

- [x] `BTTF.Vehicle.Tuning.DefaultsAreRoadworthy`
- [x] `BTTF.Vehicle.Gameplay.ReverseHoverAndResetContracts`
- [x] `BTTF.Vehicle.Input.ArrowKeysDriveDirectly`
- [x] `BTTF.Vehicle.Hover.StabilityContract`
- [x] `BTTF.Vehicle.Input.ResetRestoresSafeTransform`
- [x] `BTTF.Camera.Keyboard.CyclesPresets`

## Live PIE checklist (keyboard-only)

Map: `LVL_TimeTravelTest`

### Forward drive

- [ ] Hold **Up Arrow** from rest — vehicle accelerates smoothly without wheel spin oscillation.
- [ ] Reach **40 MPH** on courthouse approach without rollover.
- [ ] Release throttle — vehicle coasts and brakes predictably.

### Reverse

- [ ] Hold **Down Arrow** from rest — vehicle reverses with visible backward motion (reverse assist active).
- [ ] Transition **Up → Down → Up** without stuck gear or loss of steering.

### Steering and braking

- [ ] **Left/Right Arrow** at low speed — full steering response, no desync from camera orbit.
- [ ] **Space** handbrake — vehicle slows without physics explosion.

### Hover mode

- [ ] Press **H** — vehicle rises to stable hover height (~250 cm).
- [ ] Arrow keys drive and steer in hover without roll coupling to camera.
- [ ] Press **H** again — returns to ground mode without camera roll artifacts.

### Camera

- [ ] **W/A/S/D** orbit without moving vehicle.
- [ ] **C** cycles chase → hood → bumper → cockpit → chase.
- [ ] **V** toggles auto-chase; manual orbit suspends recenter for 1.5s.

### Reset and recovery

- [ ] Press **R** after driving off course — vehicle teleports to last safe transform upright.
- [ ] Enter/exit with **G** ten times — possession never strands player.

## Recorded evidence (fill on PC)

| Check | Result | Notes |
|-------|--------|-------|
| Max speed on straight | | MPH |
| Reverse from rest | | Pass/Fail |
| Hover stability 60s | | Pass/Fail |
| 40 MPH jump threshold | | Pass/Fail |
| Reset recovery | | Pass/Fail |

## Tuning data reference

Authoritative values live in `UDeLoreanTuningData` defaults and apply through `ADeLoreanVehicle::ApplyTuningData`:

- Mass, engine torque curve, gear ratios, suspension, steer angle
- Reverse assist acceleration / max reverse speed
- Hover height, spring, damping, stabilization, yaw acceleration
- Chase camera FOV range

Adjust one variable at a time in the data asset; rerun `BTTF.Vehicle.*` automation after each change.
