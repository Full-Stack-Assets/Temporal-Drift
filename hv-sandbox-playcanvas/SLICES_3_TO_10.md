# Hill Valley Multi-Era Sandbox — Exhaustive Plans for Slices 3–10

These slices continue from the current prototype (Slice 0–2 complete: mechanical core, first jump, paradox, butterfly, audio, characters, base map, mobile PWA).

---

## Slice 3 — Real Assets & Physics Foundation (Target: Weeks 10–14)

### Goals
- Ammo.js WASM integrated and stable on desktop + iOS Safari
- True 4-point raycast suspension replaces plane ground check
- AssetPipelineLoader loads at least one real glTF (Courthouse or car) from URL
- Static colliders on major buildings / curbs

### Deliverables
1. `PhysicsBootstrap.bootstrapAmmo()` succeeds ≥95% on target devices
2. `RaycastArcadeController` uses `raycastWheels()` when physics ready, else plane fallback
3. Ground + Courthouse + Mall + Lab have `collision` + `rigidbody static`
4. Loader demo: enqueue a public-domain glTF (e.g. Khronos CarConcept or Quaternius town piece), parent under era root
5. Performance budget: 60 fps mid-range phone while driving; era swap < 400 ms felt time

### Tasks
- Wire `bootstrapAmmo` before `app.start` or right after, gate rigidbody components
- Add physics materials (friction) for asphalt vs dirt eras
- Create `assets/manifest.json` listing per-era glTF URLs
- Loading UI overlay driven by `AssetPipelineLoader.onProgress`
- Automated test: 30 consecutive jumps with physics on, no NaN velocities

### Risks
- iOS Safari WASM memory limits → keep collision mesh budget low
- CORS on external glTF → prefer self-hosted or jsDelivr/GitHub raw with correct headers

### Exit Gate
Drive on real suspension, hit a curb, load one external model, jump eras without crash.

---

## Slice 4 — Content Density & Butterfly Depth (Weeks 14–17)

### Goals
- 5–8 authored landmark props per era (signs, props, vehicles)
- Butterfly triggers (proximity) not only hotkeys
- “Fix the paradox” interactions (restore pine, reset clock)
- Save/load flags + era via SaveStateCompressor

### Deliverables
1. `ButterflyTriggers` zones: pine, clock, diner jukebox, lab door, truck
2. At least 3 repair actions that clear flags and reduce anomaly score
3. Persistent save across refresh
4. Era-specific ambient props (barrels 1885, cars 1955/1985, drones 2015, wrecks 2045)

### Tasks
- Interaction prompt UI (“Press E / tap to repair”)
- FlagPanel polish + mobile-friendly
- Doc lab interior volume (enterable)
- Diner interior camera optional volume

### Exit Gate
Destroy pine by driving through it in 1885 → see Lone Pine in 1985 → repair action restores Twin Pines.

---

## Slice 5 — AI & Wanted Loop (Weeks 17–20)

### Goals
- ChasePhysicsController live at 2★+
- TemporalPathfinder drives pedestrians with panic at high stars
- Period-correct chase skins (horse proxy 1885, sedan later)
- Wanted decay + cross-era heat residue

### Deliverables
1. Chasers spawn/despawn with stars
2. Ram applies impulse to player velocity
3. Pedestrians flee when stars ≥ 3
4. Audio stingers on star up / chase start

### Tasks
- Chaser entity factory (reuse box truck scaled or simple cars)
- Pathfinder nodes expanded to mall + lab
- ParadoxEnforcementManager: more infractions (ram NPC, enter restricted era zone)

### Exit Gate
Reach 5★, get rammed, escape by time jump, feel heat residue on arrival.

---

## Slice 6 — Audio & Juice (Weeks 20–22)

### Goals
- Full Web Audio graph: engine, radio, ambient, lightning, UI beeps
- Era radio stations (placeholder → real buffers)
- Screen FX: chromatic flash, speed lines optional, better desaturation shader

### Deliverables
1. RadioManager + AmbientBed wired to era changes
2. Spatial tire screech / landing thump
3. Time-circuit keypad beep + success/fail tones
4. Master volume + mute settings in UI

### Tasks
- Load real AudioBuffers via AssetPipelineLoader (type audio)
- iOS unlock path hardened (any pointerdown)
- Mix bus: SFX / Music / Voice gains

### Exit Gate
Play 5 minutes with headphones; every jump and chase is readable in audio alone.

---

## Slice 7 — Mobile Hardening & PWA Store-Ready (Weeks 22–24)

### Goals
- iOS + Android stable 30–60 fps
- Installable PWA with offline shell
- Touch controls refined; optional gyroscope lean steer
- Texture/quality tiers

### Deliverables
1. Service worker caches shell + icons + critical JS
2. Quality settings: Low / Med / High (shadows, draw distance)
3. Battery-aware particle reduction
4. Landscape lock hint + orientation handler

### Tasks
- Three.js-inspired mobile notes applied to PlayCanvas (see MOBILE_NOTES.md)
- Reduce overdraw on mall/diner
- Dynamic resolution scale under load

### Exit Gate
Add to Home Screen on iPhone 12-class; 20-minute session without tab crash; install works offline for shell.

---

## Slice 8 — Narrative Lite & Photo Mode (Weeks 24–27)

### Goals
- Optional “missions” that set butterfly flags intentionally
- Photo mode (freeze, FOV, hide HUD, screenshot)
- Timeline journal UI listing flags & eras visited

### Deliverables
1. 3 short objectives (e.g. “Make Lone Pine real”, “Stop the clock”, “Survive 2045 heat”)
2. Journal panel
3. Photo mode with share sheet on mobile

### Exit Gate
Complete one objective chain; export a screenshot.

---

## Slice 9 — Multiplayer-Lite / Spectate (Optional Stretch, Weeks 27–30)

### Goals
- Read-only spectate of another player’s era jump stream (WebRTC or relay)
- Or local split hot-seat era viewer
- **Not** full authoritative multiplayer (out of scope for core fantasy)

### Deliverables
1. Design doc + spike only unless core is rock solid
2. If spiked: share seed + flag bitmask + era for ghost playback

### Exit Gate
Spike demo or explicit deferral recorded in ADR.

---

## Slice 10 — Polish, Telemetry, Ship (Weeks 30–34)

### Goals
- Full pass on art, audio, UX
- Telemetry: jump success rate, crash signatures, flag popularity
- Legal pass (no trademarked audio; original or licensed models)
- Store / itch / web release package

### Deliverables
1. Known Limitations doc published
2. Performance report on 3 device tiers
3. Credits + build number in HUD
4. Final vertical slice video

### Exit Gate
Public playable build; no severity-1 bugs in 1-hour playtest script.

---

## Cross-Cutting Principles (All Slices)

- **Web-first primary**; UE5 remains stretch only
- **Persistent 4×4 grid**; era skins never duplicate structure
- **Vertical slice gates** before expanding content
- **Flag bitmask causality** over quest graphs
- **Mobile memory budget** checked every slice
- **IP safety**: procedural or licensed assets only
