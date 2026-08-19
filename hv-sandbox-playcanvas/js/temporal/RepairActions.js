/**
 * RepairActions — paradox-fix interactions that clear butterfly flags.
 */

function distSq(pos, center) {
  const dx = pos.x - center.x;
  const dz = pos.z - center.z;
  return dx * dx + dz * dz;
}

export const REPAIR_ZONES = [
  {
    id: 'restore_pine_1885',
    flag: 'pine_tree_destroyed_1885',
    era: '1885',
    center: { x: -14, y: 0, z: 16 },
    radius: 5,
    label: 'Press E / tap to restore the pine'
  },
  {
    id: 'restore_twin_pines_1985',
    flag: 'pine_tree_destroyed_1885',
    era: '1985',
    center: { x: 30, y: 0, z: 35 },
    radius: 8,
    label: 'Press E / tap to restore Twin Pines'
  },
  {
    id: 'reset_clock',
    flag: 'courthouse_clock_stopped_1955',
    era: '1955',
    center: { x: 0, y: 0, z: -12 },
    radius: 6,
    label: 'Press E / tap to reset the clock'
  },
  {
    id: 'plug_jukebox',
    flag: 'diner_jukebox_unplugged_1955',
    era: '1955',
    center: { x: -22, y: 0, z: 8 },
    radius: 5,
    label: 'Press E / tap to plug in the jukebox'
  }
];

export class RepairActions {
  /**
   * @param {import('./ButterflyEffectManager.js').ButterflyEffectManager} butterfly
   * @param {import('./ParadoxEnforcementManager.js').ParadoxEnforcementManager} paradox
   * @param {object[]} [zones]
   */
  constructor(butterfly, paradox, zones = REPAIR_ZONES) {
    this.butterfly = butterfly;
    this.paradox = paradox;
    this.zones = zones;
    this.active = null;
  }

  /**
   * @param {{x:number,z:number}} playerPos
   * @param {string} era
   * @returns {object|null} active repair zone
   */
  update(playerPos, era) {
    this.active = null;
    for (const z of this.zones) {
      if (z.era !== era) continue;
      if (!this.butterfly.getFlag(z.flag)) continue;
      if (distSq(playerPos, z.center) <= z.radius * z.radius) {
        this.active = z;
        break;
      }
    }
    return this.active;
  }

  /**
   * Clear the active zone's flag and reduce paradox.
   * @returns {boolean}
   */
  repairActive() {
    if (!this.active) return false;
    this.butterfly.setFlag(this.active.flag, false);
    this.paradox?.reduceScore(40);
    console.log('[Repair]', this.active.id);
    this.active = null;
    return true;
  }
}
