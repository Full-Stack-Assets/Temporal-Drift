# Keyboard Camera and Photorealism Design

## Objective

Make Temporal Drift consistently playable without mouse input, eliminate the current vehicle-exit regression, provide predictable manual and automatic cameras for both playable pawns, and establish a reusable photoreal material and lighting pipeline for Hill Valley.

## Scope and Delivery Order

The work is divided into three sequential passes so each stage leaves a playable build:

1. Input and possession stability.
2. Manual and automatic camera behavior.
3. Environment materials, lighting, and post-processing.

The visual pass covers the generated Hill Valley environment and reusable world materials. A final hero-quality DeLorean model, bespoke character art, and licensed photo textures are outside this pass.

## Input Contract

### Shared bindings

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

Mouse movement must not control either pawn or camera. The cursor remains visible while gameplay has focus.

## Vehicle Entry and Exit

`ABTTF_PlayerController` owns the `G` action so the binding remains available across possession changes. When the hero is possessed, `G` finds the nearest valid DeLorean within interaction range and enters it. When the vehicle is possessed, `G` requests an exit through `UVehicleInteractionComponent`.

Exit placement checks candidate positions on both sides and behind the vehicle. It rejects obstructed locations, ignores the occupied vehicle and hero in its collision query, places the hero at the first safe location, transfers possession, and restores character input and camera state. If all candidates are blocked, the player stays in the vehicle and receives a short on-screen message.

## Camera Architecture

A small reusable keyboard-camera state component owns orbit yaw, pitch, auto-chase state, override timing, recenter interpolation, and clamping. The character and DeLorean retain their own spring arms and camera presets, but both consume the same state rules.

`W/A/S/D` applies frame-rate-independent orbit input. Pitch is clamped to avoid inversion or ground clipping. Manual input immediately suspends auto-chase. When auto-chase is enabled and no manual camera key has been held for 1.5 seconds, yaw and pitch smoothly interpolate to the active preset's chase orientation. Pressing `V` disables or enables automatic recentering; manual orbit remains available in either state.

`C` cycles available presets. The DeLorean exposes chase, hood, bumper, and cockpit views. Changing presets resets unsafe accumulated pitch but preserves a reasonable horizontal glance. The character uses chase and closer shoulder presets. Vehicle roll is excluded from the camera transform, especially in hover mode.

## Input Assets and Fallbacks

Enhanced Input remains the primary path. The setup generator creates or updates actions and mapping contexts for pawn movement, camera orbit, vehicle interaction, camera cycling, and chase toggling. Direct key bindings may remain only as a defensive fallback and must invoke the same handlers so duplicate events cannot produce double input.

Possession changes remove the old pawn's mapping context before adding the new one. Tests verify that the arrow keys never drive the camera and `W/A/S/D` never apply pawn movement.

## Photoreal Environment Pipeline

The visual pass replaces flat-color generated materials with a compact family of reusable physically based master materials and material instances:

- Asphalt and road markings.
- Concrete, pavement, and curbs.
- Brick, stone, plaster, and painted storefront surfaces.
- Glass and architectural metal.
- Soil, grass, vegetation, water, and sand.
- Era-specific grime, fading, wetness, dust, and damage overlays.

Every opaque surface uses plausible base color, roughness, normal detail, and scale-aware texture coordinates. Macro variation and edge breakup reduce visible tiling across large procedural buildings and terrain. Material instances expose tint, roughness, normal intensity, dirt amount, and UV scale so era dressing can reuse geometry without duplicating master materials.

Where source texture maps are available in the repository, the pipeline uses them. Missing maps use deterministic procedural or engine-provided detail rather than unlicensed web assets. Asset-generation scripts remain idempotent and validate references before saving.

## Lighting and Presentation

After material migration, the test map receives a consistent daylight setup with calibrated exposure, skylight contribution, reflection support, Lumen-compatible settings, restrained color grading, and a bounded post-process configuration. The goal is natural material response and readable driving visibility, not exaggerated cinematic contrast.

Era Data Layers may alter atmosphere, color temperature, surface aging, signage, and practical lights while sharing the neutral courthouse-square geometry.

## Failure Handling

- Blocked vehicle exit leaves possession unchanged and displays feedback.
- Missing material textures fall back to valid neutral parameters without generating checkerboards.
- Missing Enhanced Input assets are reported by validation and the defensive key path remains usable.
- Camera state is reset to safe clamps after possession, time travel, or hover-mode transitions.

## Verification

Automation tests are written before production changes and cover:

- Arrow-key movement for character and vehicle.
- `W/A/S/D` camera-only behavior.
- `G` entry, clear exit, blocked exit, and possession transfer.
- Manual camera orbit clamps.
- The 1.5-second chase delay and smooth recenter.
- Auto-chase toggle persistence during a possession session.
- All camera presets and hover-mode roll isolation.
- Required input assets and mappings.
- Material-instance parent validity and required physical parameters.

The editor build and full `BTTF` automation suite must pass. Final hands-on verification runs `LVL_TimeTravelTest`, drives forward and reverse, enters/exits repeatedly, tests all camera keys and presets on foot and in hover mode, then inspects representative courthouse, street, terrain, glass, and vegetation materials under the final lighting setup.

## Acceptance Criteria

The pass is complete when the documented keys work identically after fresh setup, possession transitions never strand the player, manual cameras work without a mouse, auto-chase reliably recenters after 1.5 seconds, hover mode does not rotate the camera with vehicle roll, representative Hill Valley surfaces use valid photoreal PBR instances, and all automated plus hands-on checks pass.
