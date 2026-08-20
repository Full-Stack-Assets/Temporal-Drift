/**
 * CharacterFactory — procedural low-poly hero & NPC figures for PlayCanvas.
 * Marty, Doc, and generic townsfolk.
 */

import * as pc from 'playcanvas';

function mat(hex, emissive) {
  const m = new pc.StandardMaterial();
  const h = hex.replace('#', '');
  m.diffuse = new pc.Color(
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255
  );
  m.specular = new pc.Color(0.1, 0.1, 0.1);
  m.shininess = 30;
  if (emissive) {
    const e = emissive.replace('#', '');
    m.emissive = new pc.Color(
      parseInt(e.substring(0, 2), 16) / 255,
      parseInt(e.substring(2, 4), 16) / 255,
      parseInt(e.substring(4, 6), 16) / 255
    );
    m.emissiveIntensity = 0.4;
  }
  m.update();
  return m;
}

/**
 * Build a simple biped: pelvis + torso + head + 2 arms + 2 legs.
 * Returns root entity.
 */
function buildHumanoid(name, colors) {
  const root = new pc.Entity(name);

  const pelvis = new pc.Entity('Pelvis');
  pelvis.addComponent('render', { type: 'box' });
  pelvis.setLocalScale(0.45, 0.25, 0.28);
  pelvis.setLocalPosition(0, 0.95, 0);
  pelvis.render.meshInstances[0].material = mat(colors.pants || '#2a2a4a');
  root.addChild(pelvis);

  const torso = new pc.Entity('Torso');
  torso.addComponent('render', { type: 'box' });
  torso.setLocalScale(0.5, 0.55, 0.3);
  torso.setLocalPosition(0, 1.35, 0);
  torso.render.meshInstances[0].material = mat(colors.shirt || '#c04040');
  root.addChild(torso);

  const head = new pc.Entity('Head');
  head.addComponent('render', { type: 'sphere' });
  head.setLocalScale(0.28, 0.32, 0.28);
  head.setLocalPosition(0, 1.82, 0);
  head.render.meshInstances[0].material = mat(colors.skin || '#e0b090');
  root.addChild(head);

  // Hair / hat
  if (colors.hair) {
    const hair = new pc.Entity('Hair');
    hair.addComponent('render', { type: 'sphere' });
    hair.setLocalScale(0.3, 0.18, 0.3);
    hair.setLocalPosition(0, 1.95, 0);
    hair.render.meshInstances[0].material = mat(colors.hair);
    root.addChild(hair);
  }

  // Arms
  [-1, 1].forEach(side => {
    const arm = new pc.Entity('Arm');
    arm.addComponent('render', { type: 'box' });
    arm.setLocalScale(0.14, 0.5, 0.14);
    arm.setLocalPosition(side * 0.38, 1.3, 0);
    arm.render.meshInstances[0].material = mat(colors.shirt || '#c04040');
    root.addChild(arm);

    const hand = new pc.Entity('Hand');
    hand.addComponent('render', { type: 'sphere' });
    hand.setLocalScale(0.12, 0.12, 0.12);
    hand.setLocalPosition(side * 0.38, 0.98, 0);
    hand.render.meshInstances[0].material = mat(colors.skin || '#e0b090');
    root.addChild(hand);
  });

  // Legs
  [-1, 1].forEach(side => {
    const leg = new pc.Entity('Leg');
    leg.addComponent('render', { type: 'box' });
    leg.setLocalScale(0.16, 0.55, 0.18);
    leg.setLocalPosition(side * 0.14, 0.55, 0);
    leg.render.meshInstances[0].material = mat(colors.pants || '#2a2a4a');
    root.addChild(leg);

    const foot = new pc.Entity('Foot');
    foot.addComponent('render', { type: 'box' });
    foot.setLocalScale(0.16, 0.1, 0.28);
    foot.setLocalPosition(side * 0.14, 0.22, 0.05);
    foot.render.meshInstances[0].material = mat(colors.shoes || '#1a1a1a');
    root.addChild(foot);
  });

  return root;
}

export function createMarty(app) {
  // Red puffy vest vibe, jeans, white sneakers, brown hair
  const m = buildHumanoid('Marty', {
    shirt: '#c02828',
    pants: '#2a3a6a',
    skin: '#e0b090',
    hair: '#4a3020',
    shoes: '#e8e8e8'
  });
  // Orange vest overlay
  const vest = new pc.Entity('Vest');
  vest.addComponent('render', { type: 'box' });
  vest.setLocalScale(0.56, 0.4, 0.34);
  vest.setLocalPosition(0, 1.35, 0);
  vest.render.meshInstances[0].material = mat('#e07020');
  m.addChild(vest);
  return m;
}

export function createDoc(app) {
  // White lab coat, wild white hair
  const d = buildHumanoid('Doc', {
    shirt: '#f0f0f0',
    pants: '#3a3a4a',
    skin: '#d8b898',
    hair: '#e8e8e8',
    shoes: '#2a2a2a'
  });
  // Wilder hair
  const wild = new pc.Entity('WildHair');
  wild.addComponent('render', { type: 'sphere' });
  wild.setLocalScale(0.42, 0.28, 0.42);
  wild.setLocalPosition(0, 2.05, 0);
  wild.render.meshInstances[0].material = mat('#f0f0f0');
  d.addChild(wild);
  return d;
}

export function createTownsfolk(app, variant = 0) {
  const palettes = [
    { shirt: '#4a7a4a', pants: '#3a3a3a', skin: '#c8a080', hair: '#2a1a10', shoes: '#1a1a1a' },
    { shirt: '#6a4a8a', pants: '#2a2a4a', skin: '#d0a888', hair: '#5a3a20', shoes: '#3a2a1a' },
    { shirt: '#3a6a8a', pants: '#4a3a2a', skin: '#e0b898', hair: '#1a1a1a', shoes: '#2a2a2a' },
    { shirt: '#8a4a3a', pants: '#2a3a4a', skin: '#c09870', hair: '#6a4a30', shoes: '#1a1a1a' }
  ];
  const p = palettes[variant % palettes.length];
  return buildHumanoid(`NPC_${variant}`, p);
}

/**
 * Very simple wander: slowly rotate and step forward on a timer.
 * Attach as a lightweight behaviour from the main loop.
 */
export class SimpleWander {
  constructor(entity, options = {}) {
    this.entity = entity;
    this.speed = options.speed || 1.2;
    this.turnTimer = 0;
    this.turnInterval = 3 + Math.random() * 4;
    this.heading = Math.random() * Math.PI * 2;
    this.radius = options.radius || 12;
    this.origin = entity.getPosition().clone();
  }

  update(dt) {
    this.turnTimer += dt;
    if (this.turnTimer > this.turnInterval) {
      this.turnTimer = 0;
      this.turnInterval = 2.5 + Math.random() * 4;
      this.heading += (Math.random() - 0.5) * 1.8;
    }
    const pos = this.entity.getPosition();
    const dx = Math.sin(this.heading) * this.speed * dt;
    const dz = Math.cos(this.heading) * this.speed * dt;
    let nx = pos.x + dx;
    let nz = pos.z + dz;
    // Stay near origin
    const ox = nx - this.origin.x;
    const oz = nz - this.origin.z;
    if (ox * ox + oz * oz > this.radius * this.radius) {
      this.heading += Math.PI * 0.6;
      return;
    }
    this.entity.setPosition(nx, pos.y, nz);
    this.entity.setLocalEulerAngles(0, this.heading * pc.math.RAD_TO_DEG, 0);
  }
}
