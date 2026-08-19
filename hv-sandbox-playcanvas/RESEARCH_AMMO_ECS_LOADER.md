# Research Notes: Ammo Collision · PlayCanvas ECS · AssetPipelineLoader

## 1. Ammo.js Collision Detection (PlayCanvas)

PlayCanvas wraps Bullet via ammo.js. Collision is exposed primarily through:

### Components
- **collision** — shape only (box, sphere, capsule, cylinder, mesh, cone, compound)
- **rigidbody** — static | dynamic | kinematic + mass/friction/restitution

Both must be present for an entity to participate in the simulation.

### Raycasting (used for vehicle suspension)
```js
// Closest hit
const hit = app.systems.rigidbody.raycastFirst(startVec3, endVec3);
// hit.entity, hit.point, hit.normal, hit.fraction

// All hits (with optional filters)
const hits = app.systems.rigidbody.raycastAll(start, end, {
  filterTags: ['ground', 'curb'],
  filterCallback: (entity) => entity.tags.has('drivable'),
  sort: true
});
```

Under the hood this builds an Ammo `ClosestRayResultCallback` / `AllHitsRayResultCallback` and calls `dynamicsWorld.rayTest`.

### Contact events
```js
entity.collision.on('contact', (result) => { /* other entity, points, normals */ });
entity.collision.on('collisionstart', ...);
entity.collision.on('collisionend', ...);
entity.collision.on('triggerenter', ...); // for isTrigger volumes
```

### CCD (fast movers)
```js
const body = entity.rigidbody.body; // Ammo.btRigidBody
body.setCcdMotionThreshold(1);
body.setCcdSweptSphereRadius(0.2);
```

### Hill Valley application
- Ground + buildings → static box colliders (Slice 3)
- Vehicle → kinematic or velocity-driven with 4 raycasts (not full RaycastVehicle yet)
- Chasers → simple dynamic boxes or kinematic interceptors
- Triggers → invisible collision with `isTrigger: true` for butterfly zones

### Pitfalls
- WASM must load before any rigidbody component is added
- Mesh colliders are expensive on mobile — prefer primitives
- iOS memory: keep total convex shapes modest

---

## 2. PlayCanvas “ECS”

PlayCanvas is **entity–component**, not a pure data-oriented ECS like bitECS.

| Concept | PlayCanvas |
|---------|------------|
| Entity | `pc.Entity` — scene-graph node |
| Component | Built-ins: render, rigidbody, collision, script, light, camera, … |
| System | `app.systems.rigidbody`, `app.systems.script`, … |
| Script | Classic `pc.createScript` or **ESM `class extends Script`** (recommended 2025+) |

### ESM Script pattern (current best practice)
```js
import { Script } from 'playcanvas';

export class HoverThruster extends Script {
  static scriptName = 'hoverThruster';
  /** @attribute */
  strength = 12;

  update(dt) {
    if (this.entity.rigidbody) {
      this.entity.rigidbody.applyForce(0, this.strength, 0);
    }
  }
}
```

### How our project maps
- We mostly use **standalone ESM modules** (RaycastArcadeController, TimeStateMachine, …) orchestrated from `main.js`, not ScriptComponents.
- This is valid for engine-only apps and maps cleanly to ECS thinking: systems operate on entity state each frame.
- Future Editor port: wrap each system as an ESM Script attached to a bootstrap entity.

### Optional pure ECS
Libraries like `@typeonce/ecs` or bitecs can sit beside PlayCanvas if we need thousands of pure-data NPCs. Not required for the 4×4 block scope.

---

## 3. AssetPipelineLoader (authoritative copy)

Location: `js/loader/AssetPipelineLoader.js`

### Chosen public models (jsDelivr · Khronos Sample Models)
| ID | URL | Placement |
|----|-----|-----------|
| `cesium_milk_truck` | https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb | Near mall, under Era_1985 |
| `khronos_duck` | https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Duck/glTF-Binary/Duck.glb | Near diner |
| `damaged_helmet` | https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb | Doc lab area |

All return HTTP 200 with CORS `*`.

### Usage
```js
import { AssetPipelineLoader } from './loader/AssetPipelineLoader.js';

const loader = new AssetPipelineLoader(app, {
  onProgress: (done, total, id) => console.log(done, total, id),
  onComplete: (map) => console.log('all loaded', map.size)
});

loader.enqueue({
  id: 'cesium_milk_truck',
  url: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb',
  type: 'container',
  parent: eraRoots['1985'],
  onLoaded: ({ entity }) => {
    if (entity) {
      entity.setLocalPosition(22, 0, 32);
      entity.setLocalScale(1.8, 1.8, 1.8);
    }
  }
});
```

### Internals
1. Queue items with retry count
2. For `type: 'container'` → `new pc.Asset(id, 'container', { url })` → `app.assets.load`
3. On load → `asset.resource.instantiateRenderEntity()` → parent under `item.parent`
4. Yield 30 ms between items to keep main thread responsive
5. Generic `fetch` path for JSON / ArrayBuffer

---

## Slice 3 confirmation checklist
- [x] Public glTF URLs selected and verified (200 + CORS)
- [x] Enqueued from `assets/manifest.json` onto persistent `WorldProps`
- [x] AssetPipelineLoader code present and documented
- [x] Ammo.js self-hosted in `assets/lib/ammo.js` and loaded before `pc.Application`
- [x] Static colliders on ground, courthouse, mall, lab, diner, plaza curbs
- [x] `RaycastArcadeController` uses `raycastWheels()` when physics is ready
- [ ] Runtime confirm in browser (open app; look for `[Physics] Ammo.js ready` and `[Loader] cesium_milk_truck`)
- [ ] Optional: `/?test=jumps` for 30 consecutive jumps without NaN velocities
