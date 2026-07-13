# Hero Time-Machine Vehicle Design

**Date:** 2026-07-12  
**Status:** Approved direction; implementation pending  
**Roadmap scope:** Task 3, Build the Hero DeLorean Vehicle

## Objective

Replace the rejected primitive block body and generic sports-car presentation with an original, legally distinct 1980s stainless-steel time-machine coupe. The new hero asset must read clearly as a low wedge-shaped gullwing-era vehicle from all gameplay cameras while preserving the already working Chaos vehicle physics, possession, wheel bones, input, reset behavior, and tuning-data work.

## Chosen Approach

Author a purpose-built hero vehicle in Blender and import it into Unreal as a visual assembly attached to the proven Chaos skeletal chassis. The existing skeletal mesh remains the authoritative physics body and can remain hidden in normal play. The hero mesh supplies presentation only; it must not replace or destabilize the movement component during this milestone.

The design is inspired by the broad visual language of stainless-steel 1980s wedge coupes and cinematic time machines, but it will use original proportions, surface details, machinery layout, dashboard graphics, and branding. No ripped, unlicensed, or trademark-bearing model is acceptable.

## Visual Design

### Proportions and silhouette

- Approximate dimensions: 4.2 m long, 1.85 m wide, and 1.15 m tall.
- Low hood, rising beltline, sharply tapered nose, wide rear shoulders, and compact fastback cabin.
- Long side-door seams that communicate gullwing construction even though opening doors are deferred.
- Wheels fill their arches without clipping at full steering lock or suspension compression.
- Rear time apparatus remains visually distinct from the body and is visible from the chase camera.

### Exterior assembly

The authored source contains named, separable objects for the body shell, front fascia, hood, black belt trim, front and rear bumpers, side panels, static gullwing doors, window set, headlamps, tail lamps, four wheels, wheel hubs, and rear time apparatus. Small machinery can be consolidated by material and draw-call needs, but major semantic parts remain identifiable for testing and future animation.

The finish uses brushed stainless steel with controlled roughness variation, dark impact trim, smoked glass, rubber tires, machined alloy hubs, and emissive cyan, amber, and red time-machine components. It must avoid a mirror-chrome appearance.

### Interior

The cockpit includes two seats, dashboard, steering wheel, center console, time-circuit display, and flux-status display. Geometry is optimized for the cockpit camera rather than for detached cinematic closeups. Displays remain legible at 1080p and do not require debug Canvas text.

### Camera compatibility

The assembly supports chase, hood, bumper, and cockpit camera presets. No camera begins inside geometry or has its central view blocked by the rear apparatus, roof, dashboard, or hood. Cockpit near clipping is checked at the project field of view.

## Asset Pipeline

The Blender source is generated and maintained in a project-owned source-art directory. A deterministic Blender Python script may establish the base geometry, naming, pivots, materials, UV channels, and export settings; manual Blender refinement is allowed after the deterministic base is checked in.

Required deliverables:

- Editable `.blend` source and generation script.
- FBX or Unreal-supported interchange export with centimeters, forward-axis, and up-axis documented.
- LOD0, LOD1, and LOD2 meshes.
- Simple collision hulls that do not replace the Chaos chassis collision during gameplay.
- Correct object origins and independent wheel pivots.
- Named material slots for body metal, trim, glass, rubber, alloy, interior, lamps, and emissive machinery.
- Unreal static-mesh assets, material instances, and Blueprint integration under `/Game/Vehicles/DeLorean`.

The first implementation may use a static-mesh assembly for the body and interior while wheel visuals follow the existing wheel bone transforms. Animated gullwing doors are explicitly deferred until the driving, cameras, and test course gates pass.

## Runtime Integration

`ADeLoreanVehicle` retains the Chaos wheeled-vehicle movement component and the existing skeletal physics mesh. A dedicated hero-visual root attaches to the vehicle root using a documented alignment transform. Imported body, glass, interior, lighting, wheel, and machinery components attach beneath that root.

The rejected `AddHeroPart` cube/cylinder construction and its authored-part-count acceptance test are removed. The generic sports-car stand-in and primitive body are not visible during normal play. A developer diagnostic flag may reveal the physics chassis for alignment debugging.

The existing `UDeLoreanTuningData` remains the source for mass, torque, gears, suspension, steering, drag, braking, and target speed. Visual replacement must not silently alter these values. Alignment offsets and camera transforms may be data-driven rather than hard-coded when practical.

## Performance and LOD Policy

- LOD0 targets hero gameplay and close cockpit views with clean bevels and stable normals.
- LOD1 removes minor machinery and interior detail while preserving silhouette.
- LOD2 is a low-cost distance silhouette suitable for courthouse-square views.
- Material count and component count are kept modest; repeated small machinery uses atlases or shared materials.
- No per-frame mesh reconstruction or dynamic material-instance creation.
- The vehicle must not introduce a visible hitch when entering PIE or switching eras after assets are loaded.

Exact triangle and draw-call budgets will be recorded after the first Blender export and measured in Unreal; visual fidelity is adjusted without violating the stable gameplay frame-time target established in Task 12.

## Testing Strategy

### Automated checks

Vehicle automation tests verify:

- tuning data contains a non-empty torque curve, valid gears, roadworthy suspension values, and mass between 1200 and 1600 kg;
- all four wheel bones and visual wheel attachment points exist;
- required hero visual assets and material slots resolve;
- the hero visual root and required semantic components are present;
- primitive prototype components and the sports-car stand-in are not the normal visible presentation;
- all four camera presets exist and have valid transforms.

### Build and live verification

After each C++ integration step, build `BTTF_TemporalDriftEditor Win64 Development` and run the `BTTF.Vehicle` automation group. Live Computer Use verification then covers:

1. Launch PIE and confirm automatic possession.
2. Inspect stationary silhouette from chase, hood, bumper, and cockpit views.
3. Accelerate, steer, brake, reverse, handbrake, and reset.
4. Drive the marked test course and check rollover, oscillation, wheel clipping, and camera obstruction.
5. Reach the configured 40-MPH jump threshold predictably while retaining steering control.
6. Inspect brushed-metal response, glass, lamps, and emissive equipment in daylight and night lighting.

## Acceptance Criteria

Task 3 is accepted only when:

- the visible vehicle is a coherent authored mesh, not exposed cubes or other block primitives;
- its silhouette immediately communicates a low stainless-steel 1980s time-machine coupe;
- scale, wheelbase, wheel pivots, suspension travel, and steering clearance are visually correct;
- the generic sports-car stand-in and rejected block prototype are absent from normal gameplay;
- chase, hood, bumper, and cockpit cameras are usable and unobstructed;
- vehicle controls, reset, possession, physics, and input tests show no regression;
- the vehicle completes the marked course without rollover or persistent oscillation;
- it reaches the configured 40-MPH jump threshold predictably and remains controllable at top speed;
- the editor build and all `BTTF.Vehicle` automated tests pass;
- a final live playtest is approved from representative exterior and cockpit views.

## Failure Handling and Rollback

The working Chaos chassis is never deleted during visual iteration. If an imported visual revision has broken scale, pivots, materials, or performance, its Blueprint assignment is reverted while the playable physics chassis remains available for diagnosis. Failed visual candidates are not promoted into the main Blueprint. The rejected primitive implementation is removed from production code rather than retained as a fallback presentation.

## Deferred Work

Functional gullwing-door animation, damage deformation, cinematic-grade interior controls, rain effects, and alternate-era vehicle variants are outside this Task 3 replacement. They may be added after the hero asset passes the driving and camera gates and after the core vertical slice is stable.
