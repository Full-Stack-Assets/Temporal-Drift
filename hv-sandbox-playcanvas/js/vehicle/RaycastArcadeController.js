/**
 * RaycastArcadeController — Vice City style arcade vehicle for PlayCanvas
 * Kinematic / velocity-based with suspension feel.
 * Uses 4-point rigidbody raycasts when physics is ready; otherwise a ground plane.
 */

import * as pc from 'playcanvas';
import { raycastWheels } from './PhysicsBootstrap.js';

export class RaycastArcadeController {
  /**
   * @param {pc.Entity} entity
   * @param {pc.AppBase} app
   * @param {object} options
   */
  constructor(entity, app, options = {}) {
    this.entity = entity;
    this.app = app;

    this.config = {
      maxSpeed: 55,                 // m/s ≈ 123 mph
      acceleration: 28,
      reverseAccel: 18,
      turnSpeed: 2.4,
      turnSpeedHigh: 1.1,
      drag: 0.55,
      lateralFriction: 9.0,
      driftLateralFriction: 1.15,
      suspensionRest: 0.55,
      suspensionStiffness: 38,
      suspensionDamping: 7.0,
      gravity: 18,
      hoverHeight: 1.9,
      hoverStiffness: 24,
      hoverDamping: 5.5,
      boostMultiplier: 1.55,
      ...options
    };

    this.velocity = new pc.Vec3();
    this.angularVelocity = 0;
    this.speedMPH = 0;
    this.onGround = false;
    this.hoverMode = false;
    this.groundY = 0;
    this.hoverAllowed = false;

    this.input = {
      throttle: 0,
      steer: 0,
      handbrake: false,
      boost: false
    };

    this._keys = {};
    this._prevH = false;
    this._setupInput();

    this._tmp = new pc.Vec3();
    this._forward = new pc.Vec3();
    this._right = new pc.Vec3();
    this.usePhysicsRaycast = false;
    this.wheelLocalPoints = [
      new pc.Vec3(0.98, -0.05, 1.4),
      new pc.Vec3(-0.98, -0.05, 1.4),
      new pc.Vec3(0.98, -0.05, -1.4),
      new pc.Vec3(-0.98, -0.05, -1.4)
    ];
  }

  setPhysicsRaycast(enabled) {
    this.usePhysicsRaycast = !!enabled;
  }

  _setupInput() {
    const onKey = (e, down) => {
      this._keys[e.code] = down;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', e => onKey(e, true));
    window.addEventListener('keyup', e => onKey(e, false));
  }

  _readInput() {
    const k = this._keys;
    this.input.throttle = 0;
    this.input.steer = 0;

    if (k['KeyW'] || k['ArrowUp']) this.input.throttle += 1;
    if (k['KeyS'] || k['ArrowDown']) this.input.throttle -= 1;
    if (k['KeyA'] || k['ArrowLeft']) this.input.steer += 1;
    if (k['KeyD'] || k['ArrowRight']) this.input.steer -= 1;

    this.input.handbrake = !!k['Space'];
    this.input.boost = !!(k['ShiftLeft'] || k['ShiftRight']);

    if (k['KeyH'] && !this._prevH && this.hoverAllowed) {
      this.hoverMode = !this.hoverMode;
    }
    this._prevH = !!k['KeyH'];
  }

  update(dt) {
    this._readInput();

    const pos = this.entity.getPosition();
    const config = this.config;

    this._forward.copy(this.entity.forward);
    this._right.cross(pc.Vec3.UP, this._forward).normalize();

    const vehicleHalfHeight = 0.45;
    this.onGround = false;
    let suspensionForce = 0;
    let restHeight = vehicleHalfHeight + config.suspensionRest;

    if (this.usePhysicsRaycast && this.app.systems?.rigidbody?.raycastFirst) {
      const wheels = raycastWheels(this.app, this.entity, this.wheelLocalPoints, 1.7);
      this.onGround = wheels.onGround;
      if (wheels.onGround) {
        const hits = wheels.points.filter(p => p.hit);
        const avgY = hits.reduce((sum, p) => sum + p.point.y, 0) / hits.length;
        this.groundY = avgY;
        restHeight = avgY + vehicleHalfHeight + config.suspensionRest;
        const heightAboveRest = pos.y - restHeight;
        const spring = (-heightAboveRest) * config.suspensionStiffness;
        const damper = -this.velocity.y * config.suspensionDamping;
        suspensionForce = spring + damper;
      }
    } else {
      const groundPlaneY = 0.0;
      restHeight = groundPlaneY + vehicleHalfHeight + config.suspensionRest;
      const heightAboveRest = pos.y - restHeight;
      if (heightAboveRest < 1.2) {
        this.onGround = true;
        this.groundY = groundPlaneY;
        const spring = (-heightAboveRest) * config.suspensionStiffness;
        const damper = -this.velocity.y * config.suspensionDamping;
        suspensionForce = spring + damper;
      }
    }

    // --- Acceleration ---
    let accel = 0;
    if (this.input.throttle > 0) {
      accel = config.acceleration * this.input.throttle;
      if (this.input.boost) accel *= config.boostMultiplier;
    } else if (this.input.throttle < 0) {
      accel = config.reverseAccel * this.input.throttle;
    }

    this._tmp.copy(this._forward).mulScalar(accel * dt);
    this.velocity.add(this._tmp);

    // --- Lateral friction / drift ---
    const lateralFriction = this.input.handbrake
      ? config.driftLateralFriction
      : config.lateralFriction;

    const lateralSpeed = this.velocity.dot(this._right);
    this._tmp.copy(this._right).mulScalar(-lateralSpeed * Math.min(1, lateralFriction * dt));
    this.velocity.add(this._tmp);

    // Drag
    this.velocity.x *= (1 - config.drag * dt);
    this.velocity.z *= (1 - config.drag * dt);

    // Gravity / Hover
    if (this.hoverMode && this.hoverAllowed) {
      const targetY = this.groundY + config.hoverHeight;
      const error = targetY - pos.y;
      const hoverForce = error * config.hoverStiffness - this.velocity.y * config.hoverDamping;
      this.velocity.y += hoverForce * dt;
      if (pos.y > this.groundY + config.hoverHeight * 2.4) {
        this.velocity.y -= 12 * dt;
      }
    } else {
      this.velocity.y -= config.gravity * dt;
      if (this.onGround) {
        this.velocity.y += suspensionForce * dt;
        if (pos.y < restHeight - 0.15 && this.velocity.y < 0) {
          this.velocity.y = Math.max(this.velocity.y, 0);
          // Soft snap
          this.entity.setPosition(pos.x, Math.max(pos.y, restHeight - 0.3), pos.z);
        }
      }
    }

    // Clamp horizontal speed
    const horizontal = new pc.Vec3(this.velocity.x, 0, this.velocity.z);
    const speed = horizontal.length();
    if (speed > config.maxSpeed) {
      horizontal.normalize().mulScalar(config.maxSpeed);
      this.velocity.x = horizontal.x;
      this.velocity.z = horizontal.z;
    }

    // Steering
    const speedFactor = Math.min(1, speed / 12);
    const turnRate = pc.math.lerp(config.turnSpeed, config.turnSpeedHigh, speedFactor);
    if (Math.abs(this.input.throttle) > 0.1 || speed > 1.2) {
      this.angularVelocity = this.input.steer * turnRate * (this.input.throttle < 0 ? -1 : 1);
    } else {
      this.angularVelocity *= 0.82;
    }

    this._blockObstacles();

    // Integrate position
    this._tmp.copy(this.velocity).mulScalar(dt);
    const newPos = this.entity.getPosition();
    this.entity.setPosition(
      newPos.x + this._tmp.x,
      newPos.y + this._tmp.y,
      newPos.z + this._tmp.z
    );

    if (Math.abs(this.angularVelocity) > 0.001) {
      this.entity.rotate(0, this.angularVelocity * dt * pc.math.RAD_TO_DEG, 0);
    }

    this.speedMPH = speed * 2.2369;
  }

  _blockObstacles() {
    if (!this.usePhysicsRaycast || !this.app.systems?.rigidbody?.raycastFirst) return;
    const pos = this.entity.getPosition();
    const fwd = this._forward;
    const start = new pc.Vec3(pos.x + fwd.x * 1.1, pos.y + 0.35, pos.z + fwd.z * 1.1);
    const end = new pc.Vec3(pos.x + fwd.x * 2.8, pos.y + 0.35, pos.z + fwd.z * 2.8);
    const hit = this.app.systems.rigidbody.raycastFirst(start, end);
    if (!hit || !hit.entity || hit.entity.name === 'Ground') return;
    const vn = this.velocity.dot(fwd);
    if (vn > 0) {
      this.velocity.x -= fwd.x * vn;
      this.velocity.z -= fwd.z * vn;
    }
  }

  setVelocity(x, y, z) {
    this.velocity.set(x, y, z);
  }

  getVelocity() {
    return this.velocity.clone();
  }

  setHoverAllowed(allowed) {
    this.hoverAllowed = !!allowed;
    if (!allowed) this.hoverMode = false;
  }
}
