# Keyboard Camera and Photorealism

This document tracks the keyboard-only play contract, shared camera component, vehicle exit fixes, and photoreal environment pipeline for Hill Valley.

## Input contract

| Input | Vehicle | Character |
| --- | --- | --- |
| Up Arrow | Accelerate forward | Move forward |
| Down Arrow | Brake/reverse | Move backward |
| Left Arrow | Steer left | Strafe left |
| Right Arrow | Steer right | Strafe right |
| W | Camera pitch up | Camera pitch up |
| S | Camera pitch down | Camera pitch down |
| A | Camera orbit left | Camera orbit left |
| D | Camera orbit right | Camera orbit right |
| G | Exit vehicle | Enter nearest usable vehicle |
| C | Cycle camera preset | Cycle supported camera preset |
| V | Toggle auto-chase | Toggle auto-chase |

Mouse movement does not control either pawn or camera. The cursor remains visible while gameplay has focus.

## Implementation map

- `UKeyboardCameraComponent` — shared orbit yaw/pitch, auto-chase delay (1.5s), preset cycling, pitch clamps.
- `UVehicleInteractionComponent` — left, right, and behind exit candidates with collision feedback.
- `ABTTF_PlayerController` — owns `G`, shows blocked-exit messages via `ShowGameplayMessage`.
- `ABTTFHeroCharacter` — arrow movement, WASD camera orbit, two camera presets.
- `ADeLoreanVehicle` — four camera presets, WASD orbit, `V` auto-chase, hover roll isolation.
- `Config/DefaultInput.ini` — arrow movement and WASD camera axes; no mouse look.
- `Scripts/create_hero_input.py` / `Scripts/create_complete_vehicle_input.py` — Enhanced Input assets.
- `Scripts/create_pbr_materials.py` — reusable PBR masters and Hill Valley instances.
- `Scripts/apply_photoreal_lighting.py` — daylight sun, skylight, exposure, post-process.

## Setup

After pulling this branch on a Windows machine with UE 5.8:

```powershell
git pull origin cursor/keyboard-camera-photorealism-492a
.\Scripts\Build\setup_vertical_slice.ps1
```

The setup script runs input asset generation, PBR material creation, and photoreal lighting configuration.

## Verification

Automation coverage lives under `BTTF.Camera.Keyboard.*`, `BTTF.Vehicle.Input.*`, and `BTTF.Hero.*`.

Hands-on checklist for `LVL_TimeTravelTest`:

1. On foot: arrow keys move, WASD orbits camera, `C` cycles presets, `V` toggles auto-chase.
2. Enter DeLorean with `G`, drive with arrows, orbit with WASD, cycle cameras with `C`.
3. Exit with `G` from clear and blocked positions; blocked exit keeps possession and shows feedback.
4. Engage hover mode; confirm camera does not roll with the vehicle.
5. Inspect courthouse, street, terrain, glass, and vegetation materials under daylight lighting.
