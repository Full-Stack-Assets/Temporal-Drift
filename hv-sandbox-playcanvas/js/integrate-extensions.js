/**
 * integrate-extensions.js — flag panel, save, triggers, AI, loader, audio beds.
 * Physics and touch are owned by main.js so they are not double-wired.
 */

import { FlagPanel } from './ui/FlagPanel.js';
import { SaveStateCompressor } from './storage/SaveStateCompressor.js';
import { AssetPipelineLoader } from './loader/AssetPipelineLoader.js';
import { ChasePhysicsController } from './ai/ChasePhysicsController.js';
import { TemporalPathfinder } from './ai/TemporalPathfinder.js';
import { RadioManager } from './audio/RadioManager.js';
import { AmbientBed } from './audio/AmbientBed.js';
import { ButterflyTriggers } from './temporal/ButterflyTriggers.js';
import * as pc from 'playcanvas';

function setLoading(msg, pct) {
  const status = document.getElementById('loading-status');
  const fill = document.getElementById('loading-fill');
  if (status) status.textContent = msg;
  if (fill && pct != null) fill.style.width = `${Math.round(pct * 100)}%`;
}

/**
 * @param {object} ctx
 */
export async function initExtensions(ctx) {
  const {
    app, arcade, butterfly, timeMachine, audio, paradox,
    sceneRefs, updateButterflyHUD, vehicle, worldProps
  } = ctx;

  const flagPanel = new FlagPanel(butterfly, () => {
    butterfly.evaluateAndMutateAssets(timeMachine.getCurrentEra(), sceneRefs);
    updateButterflyHUD();
    saveNow();
  });

  const save = new SaveStateCompressor();
  function saveNow() {
    save.save({
      flagMask: butterfly.toBitmask(),
      era: timeMachine.getCurrentEra()
    });
  }

  const triggers = new ButterflyTriggers(butterfly);
  triggers.addZone({ id: 'pine_hit', center: { x: -14, y: 0, z: 16 }, radius: 3.5, flag: 'pine_tree_destroyed_1885', eraRequired: '1885' });
  triggers.addZone({ id: 'clock_strike', center: { x: 0, y: 0, z: -12 }, radius: 5, flag: 'courthouse_clock_stopped_1955', eraRequired: '1955' });
  triggers.addZone({ id: 'lab_raid', center: { x: 24, y: 0, z: -18 }, radius: 6, flag: 'doc_lab_raided_1985', eraRequired: '1985' });
  triggers.addZone({ id: 'jukebox', center: { x: -22, y: 0, z: 8 }, radius: 4.5, flag: 'diner_jukebox_unplugged_1955', eraRequired: '1955' });
  triggers.addZone({ id: 'truck_crash', center: { x: -8, y: 0, z: 28 }, radius: 5, flag: 'box_truck_crashed_2015', eraRequired: '2015' });
  triggers.onTrigger = () => {
    butterfly.evaluateAndMutateAssets(timeMachine.getCurrentEra(), sceneRefs);
    updateButterflyHUD();
    saveNow();
  };

  const chase = new ChasePhysicsController(app);
  const pathfinder = new TemporalPathfinder();
  pathfinder.setEra(timeMachine.getCurrentEra());

  let radio = null;
  let ambient = null;
  if (audio.ctx) {
    radio = new RadioManager(audio.ctx, audio.masterGain);
    ambient = new AmbientBed(audio.ctx, audio.masterGain);
    radio.setEra(timeMachine.getCurrentEra());
    ambient.setEra(timeMachine.getCurrentEra());
  }

  const persistentRoot = worldProps || app.root;
  const loader = new AssetPipelineLoader(app, {
    onProgress: (done, total, id) => {
      setLoading(`Loading ${id} (${done}/${total})`, 0.4 + 0.5 * (done / Math.max(total, 1)));
      const el = document.getElementById('status-bar');
      if (el) el.textContent = `Loading ${id} (${done}/${total})`;
    },
    onComplete: () => {
      const el = document.getElementById('status-bar');
      if (el) el.textContent = 'Hill Valley · Assets ready';
    }
  });

  let manifest = { models: [] };
  try {
    const res = await fetch(new URL('../assets/manifest.json', import.meta.url));
    manifest = await res.json();
  } catch (e) {
    console.warn('[Loader] manifest missing, using fallback truck', e);
    manifest = {
      models: [{
        id: 'cesium_milk_truck',
        url: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb',
        type: 'container',
        persistent: true,
        position: [22, 0, 32],
        scale: 1.8,
        euler: [0, -40, 0],
        visibleEras: ['1985', '2015', '2045']
      }]
    };
  }

  const loadedModels = [];
  for (const spec of manifest.models || []) {
    loader.enqueue({
      id: spec.id,
      url: spec.url,
      type: spec.type || 'container',
      parent: spec.persistent ? persistentRoot : app.root,
      onLoaded: (result) => {
        if (!result.entity) return;
        if (spec.position) result.entity.setLocalPosition(spec.position[0], spec.position[1], spec.position[2]);
        if (spec.scale) result.entity.setLocalScale(spec.scale, spec.scale, spec.scale);
        if (spec.euler) result.entity.setLocalEulerAngles(spec.euler[0], spec.euler[1], spec.euler[2]);
        loadedModels.push({ entity: result.entity, visibleEras: spec.visibleEras || null });
        const era = timeMachine.getCurrentEra();
        if (spec.visibleEras) result.entity.enabled = spec.visibleEras.includes(era);
        console.log('[Loader]', spec.id, 'instantiated on persistent root');
      }
    });
  }

  const onEra = (era) => {
    pathfinder.setEra(era);
    radio?.setEra(era);
    ambient?.setEra(era);
    for (const item of loadedModels) {
      if (item.visibleEras) item.entity.enabled = item.visibleEras.includes(era);
    }
    saveNow();
  };
  timeMachine.addEraListener(onEra);

  const loaded = save.load();
  if (loaded) {
    butterfly.fromBitmask(loaded.flagMask);
    if (loaded.era && loaded.era !== timeMachine.getCurrentEra()) {
      timeMachine.applyEra(loaded.era);
    } else {
      butterfly.evaluateAndMutateAssets(timeMachine.getCurrentEra(), sceneRefs);
    }
    updateButterflyHUD();
    flagPanel._refresh();
    console.log('[Save] Restored flags/era from LocalStorage', loaded.era);
  }
  setInterval(saveNow, 15000);

  app.on('update', (dt) => {
    const pos = vehicle.getPosition();
    triggers.update(pos, timeMachine.getCurrentEra());

    const stars = paradox.getStars();
    pathfinder.setPanic(stars >= 3);
    pathfinder.setEra(timeMachine.getCurrentEra());

    chase.syncChasers(stars, vehicle, () => {
      const c = new pc.Entity('Chaser');
      c.addComponent('render', { type: 'box' });
      c.setLocalScale(2, 0.8, 4);
      const mat = new pc.StandardMaterial();
      mat.diffuse = new pc.Color(0.6, 0.1, 0.1);
      mat.update();
      c.render.meshInstances[0].material = mat;
      app.root.addChild(c);
      return c;
    });
    chase.update(dt, vehicle, arcade.getVelocity(), () => {
      const v = arcade.getVelocity();
      arcade.setVelocity(
        v.x * 0.7 + (Math.random() - 0.5) * 8,
        v.y + 2,
        v.z * 0.7 + (Math.random() - 0.5) * 8
      );
    });
  });

  console.log('[Extensions] FlagPanel, Save, Triggers, AI, Loader ready');
  return { flagPanel, save, triggers, chase, pathfinder, loader, radio, ambient, onEra, saveNow };
}
