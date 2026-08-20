/**
 * PhysicsBootstrap — load local ammo.js before the PlayCanvas Application
 * is created, then attach static colliders and wheel raycasts.
 */

import * as pc from 'playcanvas';

const LOCAL_AMMO_JS = new URL('../../assets/lib/ammo.js', import.meta.url).href;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-ammo="1"]`);
    if (existing && window.Ammo) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.dataset.ammo = '1';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function instantiateAmmo() {
  if (!window.Ammo) return false;
  if (typeof window.Ammo === 'function' && !window.Ammo.btVector3) {
    const result = window.Ammo();
    const impl = result && typeof result.then === 'function' ? await result : result;
    if (impl && impl.btVector3) {
      window.Ammo = impl;
    }
  }
  return !!window.Ammo?.btVector3;
}

/**
 * Load Ammo before `new pc.Application(...)`.
 * @returns {Promise<boolean>}
 */
export async function bootstrapAmmo() {
  try {
    if (await instantiateAmmo()) {
      console.log('[Physics] Ammo already present');
      return true;
    }
    await loadScript(LOCAL_AMMO_JS);
    const ok = await instantiateAmmo();
    if (ok) {
      console.log('[Physics] Ammo.js ready (local asm.js)');
      return true;
    }
    console.warn('[Physics] Ammo.js loaded but factory failed');
    return false;
  } catch (e) {
    console.warn('[Physics] Ammo load failed — plane suspension fallback', e);
    return false;
  }
}

export function isPhysicsReady(app) {
  return !!(app?.systems?.rigidbody?.raycastFirst && window.Ammo);
}

/**
 * Add static rigidbody + box collision. Default halfExtents 0.5 scale with the entity.
 */
export function makeStaticCollider(entity, halfExtents, friction = 0.8) {
  if (!entity || !entity.addComponent) return false;
  try {
    if (!entity.collision) {
      const opts = { type: 'box' };
      if (halfExtents) opts.halfExtents = halfExtents;
      entity.addComponent('collision', opts);
    }
    if (!entity.rigidbody) {
      entity.addComponent('rigidbody', { type: 'static', friction, restitution: 0.1 });
    }
    return true;
  } catch (e) {
    console.warn('[Physics] collider failed on', entity.name, e);
    return false;
  }
}

export function makeStaticColliderFromScale(entity, friction) {
  return makeStaticCollider(entity, undefined, friction);
}

/**
 * 4-point raycast suspension helper using rigidbody system.
 * @param {pc.AppBase} app
 * @param {pc.Entity} vehicleEntity
 * @param {pc.Vec3[]} localWheelPoints
 * @param {number} rayLength
 */
export function raycastWheels(app, vehicleEntity, localWheelPoints, rayLength = 1.2) {
  const result = { onGround: false, points: [] };
  if (!app.systems?.rigidbody?.raycastFirst) {
    return result;
  }

  const worldTransform = vehicleEntity.getWorldTransform();

  for (const local of localWheelPoints) {
    const start = new pc.Vec3();
    worldTransform.transformPoint(local, start);
    start.y += 0.2;
    const end = start.clone();
    end.y -= rayLength;

    const hit = app.systems.rigidbody.raycastFirst(start, end);
    if (hit) {
      result.onGround = true;
      result.points.push({
        hit: true,
        point: hit.point.clone(),
        normal: hit.normal ? hit.normal.clone() : pc.Vec3.UP.clone(),
        dist: start.y - hit.point.y,
        entity: hit.entity || null
      });
    } else {
      result.points.push({ hit: false, point: end, normal: pc.Vec3.UP.clone(), dist: rayLength, entity: null });
    }
  }
  return result;
}
