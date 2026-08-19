/**
 * ChasePhysicsController — predictive intercept + ram (Vice City style).
 * Spawns/steers pursuit entities toward the player with lead prediction.
 */

import * as pc from 'playcanvas';

export class ChasePhysicsController {
  /**
   * @param {pc.AppBase} app
   * @param {object} options
   */
  constructor(app, options = {}) {
    this.app = app;
    this.chasers = [];
    this.enabled = true;
    this.leadPredictionScalar = options.leadPredictionScalar ?? 0.55;
    this.maxSpeed = options.maxSpeed ?? 38;
    this.ramDistance = options.ramDistance ?? 4.2;
    this.ramForce = options.ramForce ?? 18;
    this.spawnCooldown = 0;
  }

  /**
   * Ensure N chase vehicles exist for the given wanted level.
   * @param {number} stars
   * @param {pc.Entity} playerEntity
   * @param {Function} createChaserFn - () => pc.Entity
   */
  syncChasers(stars, playerEntity, createChaserFn) {
    if (!this.enabled) return;
    const desired = stars >= 5 ? 3 : stars >= 3 ? 2 : stars >= 2 ? 1 : 0;

    while (this.chasers.length < desired) {
      const c = createChaserFn();
      if (!c) break;
      // Spawn offset from player
      const p = playerEntity.getPosition();
      const ang = Math.random() * Math.PI * 2;
      c.setPosition(p.x + Math.cos(ang) * 28, 1.2, p.z + Math.sin(ang) * 28);
      this.chasers.push({
        entity: c,
        velocity: new pc.Vec3(),
        agility: 1.8 + Math.random() * 0.6
      });
    }
    while (this.chasers.length > desired) {
      const removed = this.chasers.pop();
      if (removed?.entity) removed.entity.destroy();
    }
  }

  /**
   * @param {number} dt
   * @param {pc.Entity} playerEntity
   * @param {pc.Vec3} playerVelocity
   * @param {Function} [onRam] - called when a ram occurs
   */
  update(dt, playerEntity, playerVelocity, onRam) {
    if (!this.enabled || this.chasers.length === 0) return;

    const pPos = playerEntity.getPosition();
    const pVel = playerVelocity || new pc.Vec3();

    for (const chaser of this.chasers) {
      const cPos = chaser.entity.getPosition();
      const dist = cPos.distance(pPos);

      // Lead point
      const lead = pVel.clone().mulScalar(dist * this.leadPredictionScalar);
      const target = pPos.clone().add(lead);

      const toTarget = target.clone().sub(cPos);
      toTarget.y = 0;
      const distXZ = toTarget.length();
      if (distXZ > 0.1) toTarget.normalize();

      // Steer velocity
      const desired = toTarget.mulScalar(this.maxSpeed);
      chaser.velocity.lerp(chaser.velocity, desired, 1 - Math.pow(0.02, dt * chaser.agility));

      // Integrate
      const move = chaser.velocity.clone().mulScalar(dt);
      chaser.entity.setPosition(cPos.x + move.x, 1.2, cPos.z + move.z);

      // Face movement
      if (chaser.velocity.length() > 1) {
        const yaw = Math.atan2(chaser.velocity.x, chaser.velocity.z) * pc.math.RAD_TO_DEG;
        chaser.entity.setLocalEulerAngles(0, yaw, 0);
      }

      // Ram
      if (dist < this.ramDistance) {
        if (onRam) onRam(chaser, this.ramForce);
        // Separate
        const push = cPos.clone().sub(pPos);
        push.y = 0;
        if (push.length() > 0.01) {
          push.normalize().mulScalar(6);
          chaser.velocity.add(push);
        }
      }
    }
  }

  clear() {
    this.chasers.forEach(c => c.entity?.destroy());
    this.chasers = [];
  }
}
