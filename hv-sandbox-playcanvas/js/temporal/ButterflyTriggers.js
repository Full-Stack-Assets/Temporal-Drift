/**
 * ButterflyTriggers — proximity / action based flag setters.
 * Call update() each frame with player position + era.
 */

export class ButterflyTriggers {
  /**
   * @param {import('./ButterflyEffectManager.js').ButterflyEffectManager} butterfly
   * @param {object} zones - named { center: pc.Vec3, radius: number, flag: string, eraRequired?: string }[]
   */
  constructor(butterfly, zones = []) {
    this.butterfly = butterfly;
    this.zones = zones;
    this._latched = new Set();
    this.onTrigger = null;
  }

  /**
   * Add a trigger zone.
   * @param {object} zone
   * @param {string} zone.id
   * @param {object} zone.center - {x,y,z}
   * @param {number} zone.radius
   * @param {string} zone.flag
   * @param {string} [zone.eraRequired] - only active in this era
   * @param {boolean} [zone.once=true]
   */
  addZone(zone) {
    this.zones.push({ once: true, ...zone });
  }

  update(playerPos, currentEra) {
    for (const z of this.zones) {
      if (z.eraRequired && z.eraRequired !== currentEra) continue;
      if (z.once && this._latched.has(z.id)) continue;

      const dx = playerPos.x - z.center.x;
      const dz = playerPos.z - z.center.z;
      if (dx * dx + dz * dz <= z.radius * z.radius) {
        this.butterfly.setFlag(z.flag, true);
        if (z.once) this._latched.add(z.id);
        console.log(`[Trigger] ${z.id} → ${z.flag}`);
        if (this.onTrigger) this.onTrigger(z);
      }
    }
  }

  resetLatches() {
    this._latched.clear();
  }
}
