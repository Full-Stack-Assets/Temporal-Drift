# Hill Valley Multi-Era Sandbox — PlayCanvas

Full base map · Characters · 7+ butterfly flags · Physics + one stable glTF · Pine butterfly loop

## Run

```bash
cd hv-sandbox-playcanvas
python3 -m http.server 8080
```

Open http://localhost:8080 — on iPhone use Safari → Add to Home Screen.

Jump-loop smoke test: http://localhost:8080/?test=jumps

Unit test (no browser):

```bash
npm test
```

## Playtest: Twin Pines loop (Slice 4)

1. Open the keypad (Tab / TIME) and enter `09021885`.
2. Drive to 88 MPH to jump to 1885.
3. Drive through the pine west of the square — the tree vanishes.
4. Jump to 1985 (`10261985`). The mall sign reads Lone Pine.
5. Drive to the mall entrance and press **E** (or tap the prompt) to restore Twin Pines.

## What this pass wired

- Era listeners notify radio/ambient/save/glTF visibility on every jump
- Proximity triggers mutate the world and HUD immediately
- Save restores **flags and era**
- Single touch path (`TouchControls` only)
- Ammo.js loaded **before** `pc.Application` (local `assets/lib/ammo.js`)
- 4-point raycast suspension + static colliders (ground, courthouse, mall, lab, diner, curbs)
- Khronos CesiumMilkTruck loaded onto a persistent root from `assets/manifest.json`
- Repair prompt for pine / clock / jukebox

## Controls

- **WASD** drive · **Space** handbrake · **SHIFT** boost · **H** hover (2015/2045)
- **Tab** keypad · **E** repair · **P / 1–7** butterfly flags
- **Touch**: stick + GAS/BRAKE/HB/BOOST/TIME

## Slices

See `SLICES_3_TO_10.md`. Slice 3 physics + one glTF and Slice 4 pine loop are implemented in this folder; 5–10 remain.
