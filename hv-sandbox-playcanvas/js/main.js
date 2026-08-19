/**
 * Hill Valley Multi-Era Sandbox — PlayCanvas
 * Full base map · Characters · Expanded butterflies · Mobile / iOS PWA
 */

import * as pc from 'playcanvas';
import { RaycastArcadeController } from './vehicle/RaycastArcadeController.js';
import { TimeStateMachine } from './temporal/TimeStateMachine.js';
import { ParadoxEnforcementManager } from './temporal/ParadoxEnforcementManager.js';
import { ButterflyEffectManager } from './temporal/ButterflyEffectManager.js';
import { RepairActions } from './temporal/RepairActions.js';
import { KeypadController } from './ui/KeypadController.js';
import { TouchControls } from './ui/TouchControls.js';
import { InteractPrompt } from './ui/InteractPrompt.js';
import { AudioManager } from './audio/AudioManager.js';
import { createMarty, createDoc, createTownsfolk, SimpleWander } from './characters/CharacterFactory.js';
import { bootstrapAmmo, isPhysicsReady, makeStaticColliderFromScale } from './vehicle/PhysicsBootstrap.js';
import { runJumpStressTest } from './tests/jump-loop.js';
import { initExtensions } from './integrate-extensions.js';

function setLoading(msg, pct) {
  const status = document.getElementById('loading-status');
  const fill = document.getElementById('loading-fill');
  if (status) status.textContent = msg;
  if (fill && pct != null) fill.style.width = `${Math.round(pct * 100)}%`;
}

function hideLoading() {
  const el = document.getElementById('loading-overlay');
  if (el) el.classList.add('hidden');
}

async function boot() {
setLoading('Loading physics…', 0.08);
const physicsOk = await bootstrapAmmo();
setLoading(physicsOk ? 'Starting Hill Valley…' : 'Starting (plane fallback)…', 0.22);

// ---------------------------------------------------------------------------
// App
const canvas = document.getElementById('application-canvas');
const app = new pc.Application(canvas, {
  mouse: new pc.Mouse(canvas),
  keyboard: new pc.Keyboard(window),
  graphicsDeviceOptions: { alpha: false, antialias: true, preferWebGl2: true }
});
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.start();
window.addEventListener('resize', () => app.resizeCanvas());
if (physicsOk && app.systems?.rigidbody?.onLibraryLoaded && !app.systems.rigidbody.dynamicsWorld) {
  try {
    app.systems.rigidbody.onLibraryLoaded();
  } catch (e) {
    console.warn('[Physics] onLibraryLoaded failed', e);
  }
}

// Prevent iOS rubber-band / gesture noise
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('gesturechange', e => e.preventDefault());

// ---------------------------------------------------------------------------
function hexToColor(hex) {
  const h = hex.replace('#', '');
  return new pc.Color(
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255
  );
}
function createMaterial(hex, opts = {}) {
  const mat = new pc.StandardMaterial();
  mat.diffuse = hexToColor(hex);
  mat.specular = new pc.Color(opts.spec ?? 0.12, opts.spec ?? 0.12, opts.spec ?? 0.12);
  mat.shininess = opts.shine ?? 40;
  if (opts.emissive) {
    mat.emissive = hexToColor(opts.emissive);
    mat.emissiveIntensity = opts.emissiveIntensity ?? 0.55;
  }
  mat.update();
  return mat;
}
function box(name, sx, sy, sz, x, y, z, color, parent, opts) {
  const e = new pc.Entity(name);
  e.addComponent('render', { type: 'box' });
  e.setLocalScale(sx, sy, sz);
  e.setLocalPosition(x, y, z);
  e.render.meshInstances[0].material = createMaterial(color, opts);
  (parent || app.root).addChild(e);
  return e;
}
function cyl(name, sx, sy, sz, x, y, z, color, parent, opts) {
  const e = new pc.Entity(name);
  e.addComponent('render', { type: 'cylinder' });
  e.setLocalScale(sx, sy, sz);
  e.setLocalPosition(x, y, z);
  e.render.meshInstances[0].material = createMaterial(color, opts);
  (parent || app.root).addChild(e);
  return e;
}
function cone(name, sx, sy, sz, x, y, z, color, parent, opts) {
  const e = new pc.Entity(name);
  e.addComponent('render', { type: 'cone' });
  e.setLocalScale(sx, sy, sz);
  e.setLocalPosition(x, y, z);
  e.render.meshInstances[0].material = createMaterial(color, opts);
  (parent || app.root).addChild(e);
  return e;
}
function sphere(name, s, x, y, z, color, parent, opts) {
  const e = new pc.Entity(name);
  e.addComponent('render', { type: 'sphere' });
  e.setLocalScale(s, s, s);
  e.setLocalPosition(x, y, z);
  e.render.meshInstances[0].material = createMaterial(color, opts);
  (parent || app.root).addChild(e);
  return e;
}

// ---------------------------------------------------------------------------
// Lighting
const sun = new pc.Entity('Sun');
sun.addComponent('light', {
  type: 'directional', color: new pc.Color(1, 0.95, 0.85),
  intensity: 1.15, castShadows: true, shadowBias: 0.2, shadowResolution: 1024
});
sun.setLocalEulerAngles(48, 40, 0);
app.root.addChild(sun);
const fill = new pc.Entity('Fill');
fill.addComponent('light', { type: 'directional', color: new pc.Color(0.28, 0.34, 0.45), intensity: 0.42 });
fill.setLocalEulerAngles(-25, 150, 0);
app.root.addChild(fill);

// ---------------------------------------------------------------------------
// BASE MAP — Courthouse Square + canonical buildings
// ---------------------------------------------------------------------------

// Ground
box('Ground', 110, 0.3, 110, 0, -0.15, 0, '#2a352a');

// Roads (asphalt cross + mall spur)
box('RoadNS', 12, 0.06, 90, 0, 0.03, 0, '#333333', null, { spec: 0.04, shine: 15 });
box('RoadEW', 90, 0.06, 12, 0, 0.03, 0, '#333333', null, { spec: 0.04, shine: 15 });
box('RoadMall', 12, 0.06, 40, 28, 0.03, 30, '#333333', null, { spec: 0.04, shine: 15 });

// Sidewalks / square plaza
box('Plaza', 22, 0.08, 22, 0, 0.05, 0, '#5a5a52');
[[-9,-9],[9,-9],[-9,9],[9,9]].forEach(([x,z], i) => {
  box(`Walk_${i}`, 7, 0.1, 7, x, 0.07, z, '#6a6a60');
});

// === CLOCK TOWER / COURTHOUSE ===
box('TowerBody', 5, 18, 5, 0, 9, -12, '#6a5a48');
cone('TowerRoof', 7, 4, 7, 0, 20, -12, '#3a2a18');
const clockFace = box('ClockFace', 2.4, 2.4, 0.18, 0, 13, -9.4, '#e8e0c0', null, { emissive: '#ffeebb', emissiveIntensity: 0.35 });
box('TowerDoor', 1.6, 3, 0.2, 0, 1.5, -9.4, '#2a1a10');
// Courthouse wings
box('WingL', 8, 6, 4, -7, 3, -12, '#7a6a58');
box('WingR', 8, 6, 4, 7, 3, -12, '#7a6a58');

// === LOU'S / DINER (exterior + simple interior volume) ===
const diner = new pc.Entity('Diner');
app.root.addChild(diner);
box('DinerBody', 10, 4.5, 7, -22, 2.25, 8, '#c8b090', diner);
box('DinerRoof', 11, 0.4, 8, -22, 4.6, 8, '#8a3030', diner);
const dinerNeon = box('DinerNeon', 6, 0.6, 0.25, -22, 4.0, 11.6, '#ff4060', diner, { emissive: '#ff4060', emissiveIntensity: 1.0 });
box('DinerWindowL', 2.5, 2, 0.15, -25, 2.2, 11.5, '#80c0e0', diner, { spec: 0.4, shine: 70 });
box('DinerWindowR', 2.5, 2, 0.15, -19, 2.2, 11.5, '#80c0e0', diner, { spec: 0.4, shine: 70 });
box('DinerDoor', 1.5, 2.8, 0.15, -22, 1.4, 11.5, '#3a2a1a', diner);
// Interior counter + stools (visible through "open" concept)
box('Counter', 6, 1.2, 1.2, -22, 1.0, 7, '#5a4030', diner);
[-24, -22, -20].forEach((x, i) => {
  cyl(`Stool_${i}`, 0.35, 0.5, 0.35, x, 0.6, 8.5, '#2a2a2a', diner);
});
const dinerInteriorLight = new pc.Entity('DinerLight');
dinerInteriorLight.addComponent('light', {
  type: 'point', color: new pc.Color(1, 0.9, 0.7), intensity: 0.8, range: 14
});
dinerInteriorLight.setLocalPosition(-22, 4, 8);
diner.addChild(dinerInteriorLight);

// === DOC'S GARAGE / LAB ===
const docLab = new pc.Entity('DocLab');
app.root.addChild(docLab);
box('LabBody', 12, 5, 9, 24, 2.5, -18, '#6a6a58', docLab);
box('LabRoof', 13, 0.5, 10, 24, 5.2, -18, '#3a3a30', docLab);
box('LabDoor', 3, 3.5, 0.2, 24, 1.75, -13.4, '#2a2a20', docLab);
box('LabWindow', 3, 2, 0.15, 28, 3, -13.4, '#a0d0e0', docLab, { spec: 0.35, shine: 60 });
// Clutter (clean state)
const docLabClean = new pc.Entity('LabClean');
docLab.addChild(docLabClean);
box('Crate1', 1.5, 1.5, 1.5, 20, 0.75, -15, '#8a6a40', docLabClean);
box('Crate2', 1.2, 1.8, 1.2, 21.5, 0.9, -16.5, '#6a5a30', docLabClean);
cyl('Drum', 0.7, 1.4, 0.7, 27, 0.7, -15, '#3a5a3a', docLabClean);
// Raided state (debris)
const docLabRaided = new pc.Entity('LabRaided');
docLabRaided.enabled = false;
docLab.addChild(docLabRaided);
box('Debris1', 2, 0.4, 1.5, 21, 0.2, -14, '#4a3a2a', docLabRaided);
box('Debris2', 1.5, 0.3, 2, 26, 0.15, -16, '#3a2a1a', docLabRaided);
box('Debris3', 1, 0.8, 1, 23, 0.4, -17, '#5a4a30', docLabRaided);

// === TWIN PINES / LONE PINE MALL ===
const mall = new pc.Entity('Mall');
app.root.addChild(mall);
box('MallBody', 28, 6, 14, 30, 3, 42, '#8a9aaa', mall);
box('MallRoof', 30, 0.5, 16, 30, 6.3, 42, '#4a5a6a', mall);
box('MallEntrance', 6, 4, 0.3, 30, 2, 34.9, '#2a3a4a', mall);
const twinPinesSign = box('TwinPinesSign', 8, 1.6, 0.35, 30, 5.5, 34.8, '#1a4a1a', mall, { emissive: '#33ff66', emissiveIntensity: 0.7 });
const lonePineSign = box('LonePineSign', 8, 1.6, 0.35, 30, 5.5, 34.8, '#3a2a0a', mall, { emissive: '#ffaa33', emissiveIntensity: 0.7 });
lonePineSign.enabled = false;
// Parking lot markers
for (let i = 0; i < 6; i++) {
  box(`Park_${i}`, 2.5, 0.05, 5, 18 + (i % 3) * 8, 0.04, 28 + Math.floor(i / 3) * 8, '#444444', mall);
}
// Flood plane (2045 flag)
const mallFlood = box('MallFlood', 30, 0.15, 20, 30, 0.12, 36, '#2a4a6a', mall, { spec: 0.5, shine: 80 });
mallFlood.enabled = false;

// === PINE TREE ===
const pineTree = cone('PineTree', 3, 7, 3, -14, 3.8, 16, '#1a4a1a');
const pineTrunk = cyl('PineTrunk', 0.55, 1.8, 0.55, -14, 0.9, 16, '#3a2a18');

// === STOREFRONTS around square ===
const storeColors = ['#7a5a4a', '#4a6a5a', '#5a5a7a', '#7a6a3a', '#6a4a5a', '#4a5a6a'];
for (let i = 0; i < 6; i++) {
  const side = i < 3 ? -1 : 1;
  const z = (i % 3) * 12 - 12;
  box(`Store_${i}`, 6, 4 + (i % 2), 5, side * 18, 2.2, z, storeColors[i]);
  box(`Awning_${i}`, 6.2, 0.25, 1.5, side * 18, 3.8, z + side * 2.6, '#c04040');
}

// === EMMETT BROWN ENTERPRISES BOX TRUCK ===
const boxTruck = new pc.Entity('BoxTruck');
app.root.addChild(boxTruck);
boxTruck.setPosition(-8, 0, 28);
// Cab
box('TruckCab', 2.4, 2.2, 2.2, 0, 1.3, 2.2, '#e8e0d0', boxTruck);
box('TruckWindow', 2.0, 0.9, 0.1, 0, 1.7, 3.3, '#60a0c0', boxTruck, { spec: 0.4, shine: 70 });
// Box
box('TruckBox', 2.6, 2.8, 5.5, 0, 1.6, -1.5, '#d0c8b0', boxTruck);
// Text proxy stripe
box('TruckStripe', 2.65, 0.5, 5.4, 0, 2.2, -1.5, '#2a5a2a', boxTruck, { emissive: '#44aa44', emissiveIntensity: 0.3 });
// Wheels
[[-1.1, 0.4, 1.8], [1.1, 0.4, 1.8], [-1.1, 0.4, -3], [1.1, 0.4, -3]].forEach((p, i) => {
  const w = cyl(`TW_${i}`, 0.45, 0.25, 0.45, p[0], p[1], p[2], '#111111', boxTruck);
  w.setLocalEulerAngles(0, 0, 90);
});
// Wrecked variant
const boxTruckWreck = new pc.Entity('BoxTruckWreck');
boxTruckWreck.enabled = false;
boxTruckWreck.setPosition(-6, 0.3, 30);
boxTruckWreck.setLocalEulerAngles(0, 0, 25);
app.root.addChild(boxTruckWreck);
box('WreckBox', 2.6, 2.2, 5, 0, 1.2, 0, '#5a4a3a', boxTruckWreck);
box('WreckCab', 2.2, 1.5, 2, 0, 1.0, 3, '#4a3a2a', boxTruckWreck);

// Plaza curbs (Slice 3 — hit a curb)
box('CurbN', 22, 0.45, 0.7, 0, 0.22, -11.4, '#6a6a60');
box('CurbS', 22, 0.45, 0.7, 0, 0.22, 11.4, '#6a6a60');
box('CurbE', 0.7, 0.45, 22, 11.4, 0.22, 0, '#6a6a60');
box('CurbW', 0.7, 0.45, 22, -11.4, 0.22, 0, '#6a6a60');

const worldProps = new pc.Entity('WorldProps');
app.root.addChild(worldProps);

const physicsReady = physicsOk && isPhysicsReady(app);
if (physicsReady) {
  const names = [
    'Ground', 'TowerBody', 'WingL', 'WingR',
    'MallBody', 'LabBody', 'DinerBody',
    'CurbN', 'CurbS', 'CurbE', 'CurbW'
  ];
  for (const name of names) {
    const ent = app.root.findByName(name);
    if (ent) makeStaticColliderFromScale(ent, name === 'Ground' ? 0.9 : 0.75);
  }
  console.log('[Physics] Static colliders on ground, buildings, curbs');
}

// ---------------------------------------------------------------------------
// Era tint roots (cosmetic sky / ground wash)
const eraRoots = {};
const eraColors = {
  '1885': { ground: '#5c4a28', accent: '#8a6a38', sky: '#c0a870' },
  '1955': { ground: '#4a6a48', accent: '#d8c898', sky: '#87b0d0' },
  '1985': { ground: '#3a4a3a', accent: '#6a7a8a', sky: '#6a8aaa' },
  '2015': { ground: '#2a3a4a', accent: '#38b0d0', sky: '#1a3048' },
  '2045': { ground: '#2a1818', accent: '#d03828', sky: '#1a1010' }
};
for (const era of Object.keys(eraColors)) {
  const root = new pc.Entity(`Era_${era}`);
  root.enabled = (era === '1985');
  const tint = box(`Tint_${era}`, 108, 0.03, 108, 0, 0.01, 0, eraColors[era].ground, root);
  // Floating era marker
  sphere(`Mark_${era}`, 1.3, 0, 22, -12, (era === '2015' || era === '2045') ? '#40f0ff' : '#ffcc00', root, {
    emissive: (era === '2015' || era === '2045') ? '#40f0ff' : '#ffcc00', emissiveIntensity: 0.9
  });
  app.root.addChild(root);
  eraRoots[era] = root;
}

// ---------------------------------------------------------------------------
// DeLorean (enhanced + hover thruster slots)
function buildDeLorean() {
  const root = new pc.Entity('DeLorean');
  root.setPosition(0, 1.05, 16);

  box('Body', 2.2, 0.55, 4.5, 0, 0.2, 0, '#9aabb8', root, { spec: 0.55, shine: 85 });
  box('Cabin', 1.9, 0.55, 1.75, 0, 0.58, -0.1, '#1a2228', root, { spec: 0.3, shine: 60 });
  box('Hood', 1.7, 0.12, 1.3, 0, 0.45, 1.35, '#7a8a98', root, { spec: 0.4, shine: 70 });
  box('Rear', 2.05, 0.38, 0.95, 0, 0.38, -1.95, '#6a7a88', root, { spec: 0.35, shine: 65 });
  box('TimeStrip', 1.5, 0.08, 0.14, 0, 0.58, 0.65, '#00ff41', root, { emissive: '#00ff41', emissiveIntensity: 1.3 });

  // Gull-wing hint lines
  box('DoorLineL', 0.04, 0.5, 1.6, -1.05, 0.45, 0, '#2a3a4a', root);
  box('DoorLineR', 0.04, 0.5, 1.6, 1.05, 0.45, 0, '#2a3a4a', root);

  // Wheels
  [[0.98, -0.28, 1.4], [-0.98, -0.28, 1.4], [0.98, -0.28, -1.4], [-0.98, -0.28, -1.4]].forEach((p, i) => {
    const w = cyl(`W_${i}`, 0.4, 0.22, 0.4, p[0], p[1], p[2], '#111111', root);
    w.setLocalEulerAngles(0, 0, 90);
  });

  // Side skirts
  [-1, 1].forEach(s => box('Skirt', 0.12, 0.18, 4.0, s * 1.15, -0.08, 0, '#2a3a4a', root));

  // Hover thrusters (enabled by flag / future eras)
  const thrusters = [];
  [[-0.7, -0.35, -1.8], [0.7, -0.35, -1.8], [-0.7, -0.35, 1.6], [0.7, -0.35, 1.6]].forEach((p, i) => {
    const t = cyl(`Thrust_${i}`, 0.25, 0.12, 0.25, p[0], p[1], p[2], '#40f0ff', root, {
      emissive: '#40f0ff', emissiveIntensity: 1.0
    });
    t.enabled = false;
    thrusters.push(t);
  });
  root._hoverThrusters = thrusters;

  app.root.addChild(root);
  return root;
}
const vehicle = buildDeLorean();

// ---------------------------------------------------------------------------
// Characters
const marty = createMarty(app);
marty.setPosition(4, 0, 6);
marty.setLocalEulerAngles(0, -30, 0);
app.root.addChild(marty);

const doc = createDoc(app);
doc.setPosition(22, 0, -14);
doc.setLocalEulerAngles(0, 200, 0);
app.root.addChild(doc);

const wanderers = [];
const npcSpawns = [
  [-20, 6], [-18, 10], [6, 10], [-6, -6], [12, 4], [-10, 12]
];
npcSpawns.forEach((p, i) => {
  const npc = createTownsfolk(app, i);
  npc.setPosition(p[0], 0, p[1]);
  app.root.addChild(npc);
  wanderers.push(new SimpleWander(npc, { speed: 0.9 + Math.random() * 0.5, radius: 10 }));
});

// ---------------------------------------------------------------------------
// Camera
const camera = new pc.Entity('Camera');
camera.addComponent('camera', {
  clearColor: hexToColor(eraColors['1985'].sky),
  fov: 58, nearClip: 0.25, farClip: 300
});
camera.setPosition(0, 6.5, 26);
app.root.addChild(camera);

// ---------------------------------------------------------------------------
// Systems
const audio = new AudioManager();
const butterfly = new ButterflyEffectManager();
const paradox = new ParadoxEnforcementManager();
const arcade = new RaycastArcadeController(vehicle, app, { maxSpeed: 52, acceleration: 32 });
arcade.setPhysicsRaycast(physicsReady);

// Scene refs for butterfly
const sceneRefs = {
  twinPinesSign,
  lonePineSign,
  pineTree,
  pineTrunk,
  clockFace,
  dinerInteriorLight,
  dinerNeon,
  docLabClean,
  docLabRaided,
  boxTruck,
  boxTruckWreck,
  mallFlood,
  hoverThrusters: vehicle._hoverThrusters
};

const timeMachine = new TimeStateMachine(app, {
  vehicle: arcade,
  getEraRoot: (era) => eraRoots[era] || null,
  onEraChange: (newEra, oldEra) => {
    console.log(`[Time] ${oldEra} → ${newEra}`);
    const c = eraColors[newEra];
    if (c && camera.camera) camera.camera.clearColor = hexToColor(c.sky);
    arcade.setHoverAllowed(newEra === '2015' || newEra === '2045');
    paradox.reduceScore(25);
    butterfly.evaluateAndMutateAssets(newEra, sceneRefs);
    audio.playLightning(vehicle.getPosition().x, vehicle.getPosition().z);
    updateButterflyHUD();
  }
});

const keypad = new KeypadController({
  onSubmitDate: (mm, dd, yyyy) => {
    timeMachine.setDestinationFromDate(mm, dd, yyyy);
    audio.unlock();
  }
});

const touch = new TouchControls({
  onKeypad: () => { keypad.toggle(); audio.unlock(); }
});
const origRead = arcade._readInput.bind(arcade);
arcade._readInput = function () {
  origRead();
  const s = touch.getState();
  if (Math.abs(s.steer) > 0.05) this.input.steer = s.steer;
  if (Math.abs(s.throttle) > 0.05) this.input.throttle = s.throttle;
  if (s.handbrake) this.input.handbrake = true;
  if (s.boost) this.input.boost = true;
};

const interact = new InteractPrompt();
const repairs = new RepairActions(butterfly, paradox);

function updateButterflyHUD() {
  const el = document.getElementById('butterfly-flag');
  if (!el) return;
  const active = butterfly.getFlagList().filter(k => butterfly.getFlag(k));
  if (active.length === 0) {
    el.textContent = 'FLAGS: none';
    el.style.color = '#7a8a6a';
  } else {
    el.textContent = 'FLAGS: ' + active.map(k => k.split('_')[0]).join(', ');
    el.style.color = '#ffaa44';
  }
}

// Flag hotkeys: P and number keys 1-7
const flagKeys = butterfly.getFlagList();
window.addEventListener('keydown', e => {
  audio.unlock();
  if (e.code === 'KeyE' && interact.tryActivate()) {
    e.preventDefault();
    return;
  }
  if (e.code === 'KeyP') {
    butterfly.toggleFlag('pine_tree_destroyed_1885');
    butterfly.evaluateAndMutateAssets(timeMachine.getCurrentEra(), sceneRefs);
    updateButterflyHUD();
  }
  // Digit1-7 toggle flags
  if (e.code.startsWith('Digit')) {
    const idx = parseInt(e.code.replace('Digit', ''), 10) - 1;
    if (idx >= 0 && idx < flagKeys.length) {
      butterfly.toggleFlag(flagKeys[idx]);
      butterfly.evaluateAndMutateAssets(timeMachine.getCurrentEra(), sceneRefs);
      updateButterflyHUD();
    }
  }
});

butterfly.evaluateAndMutateAssets('1985', sceneRefs);
updateButterflyHUD();

// ---------------------------------------------------------------------------
// Main loop
app.on('update', (dt) => {
  dt = Math.min(dt, 0.05);
  arcade.update(dt);
  timeMachine.update(dt);
  paradox.update(dt, {
    speedMPH: arcade.speedMPH,
    hoverMode: arcade.hoverMode,
    currentEra: timeMachine.getCurrentEra()
  });
  audio.updateEngine(arcade.speedMPH, arcade.hoverMode, arcade.input.throttle);
  wanderers.forEach(w => w.update(dt));

  const vp = vehicle.getPosition();
  const zone = repairs.update(vp, timeMachine.getCurrentEra());
  if (zone) {
    interact.show(zone.label, () => {
      if (repairs.repairActive()) {
        butterfly.evaluateAndMutateAssets(timeMachine.getCurrentEra(), sceneRefs);
        updateButterflyHUD();
        window.__hvExtensions?.flagPanel?._refresh?.();
        window.__hvExtensions?.saveNow?.();
        interact.hide();
      }
    });
  } else if (interact.isVisible()) {
    interact.hide();
  }

  const fwd = vehicle.forward;
  const target = new pc.Vec3(vp.x - fwd.x * 12, vp.y + 5.4, vp.z - fwd.z * 12);
  const cp = camera.getPosition();
  cp.lerp(cp, target, 1 - Math.pow(0.001, dt));
  camera.setPosition(cp);
  camera.lookAt(vp.x, vp.y + 1.15, vp.z);
});

const status = document.getElementById('status-bar');
if (status) {
  status.textContent = physicsReady
    ? 'Hill Valley · Physics ON · Slice 3/4'
    : 'Hill Valley · Plane fallback · Slice 3/4';
}

console.log('%cHill Valley Full Map Prototype', 'color:#00ff41;font-size:14px;font-weight:bold');
console.log('Flags: P or keys 1-7 toggle. Tab = keypad. E = repair. 88 MPH = jump.');
console.log('Flag list:', flagKeys);
console.log('[Physics]', physicsReady ? 'raycast suspension + colliders' : 'plane fallback');

try {
  const ext = await initExtensions({
    app,
    arcade,
    butterfly,
    timeMachine,
    audio,
    paradox,
    sceneRefs,
    updateButterflyHUD,
    keypad,
    vehicle,
    worldProps,
    ground: app.root.findByName('Ground')
  });
  window.__hvExtensions = ext;
  if (status) {
    status.textContent = physicsReady
      ? 'Hill Valley · Physics ON · glTF + flags live'
      : 'Hill Valley · Plane fallback · glTF + flags live';
  }
} catch (e) {
  console.warn('[Extensions] init failed', e);
}

hideLoading();

if (new URLSearchParams(location.search).get('test') === 'jumps') {
  await runJumpStressTest({ timeMachine, arcade, cycles: 30 });
}
}

boot().catch(err => {
  console.error('[Hill Valley] boot failed', err);
  setLoading('Boot failed — see console', 1);
});
