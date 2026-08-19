/**
 * ButterflyEffectManager — multi-flag causality system.
 */

export function pineVisible(era, destroyed) {
  return (era === '1885' || era === '1955') && !destroyed;
}

export function mallSignState(era, destroyed) {
  return {
    twin: era === '1955' || ((era === '1985' || era === '2015') && !destroyed),
    lone: (era === '1985' || era === '2015' || era === '2045') && !!destroyed
  };
}

export class ButterflyEffectManager {
  constructor() {
    this.flags = {
      pine_tree_destroyed_1885: false,
      courthouse_clock_stopped_1955: false,
      diner_jukebox_unplugged_1955: false,
      doc_lab_raided_1985: false,
      box_truck_crashed_2015: false,
      mall_parking_flooded_2015: false,
      hover_conversion_complete_2015: false
    };
    this.listeners = new Map();
  }

  setFlag(key, value) {
    if (!(key in this.flags)) {
      console.warn('[Butterfly] Unknown flag:', key);
      return;
    }
    const prev = this.flags[key];
    this.flags[key] = !!value;
    if (prev !== this.flags[key]) {
      console.log('[Butterfly]', key, '=', this.flags[key]);
      this._emit(key, this.flags[key]);
      this._emit('*', this.flags);
    }
  }

  toggleFlag(key) {
    this.setFlag(key, !this.getFlag(key));
  }

  getFlag(key) {
    return !!this.flags[key];
  }

  getAllFlags() {
    return { ...this.flags };
  }

  on(key, cb) {
    if (!this.listeners.has(key)) this.listeners.set(key, []);
    this.listeners.get(key).push(cb);
  }

  _emit(key, payload) {
    for (const cb of (this.listeners.get(key) || [])) {
      try { cb(payload, this.flags); } catch (e) { console.error(e); }
    }
  }

  evaluateAndMutateAssets(era, refs = {}) {
    const f = this.flags;

    const destroyed = !!f.pine_tree_destroyed_1885;
    const signs = mallSignState(era, destroyed);
    if (refs.twinPinesSign) refs.twinPinesSign.enabled = signs.twin;
    if (refs.lonePineSign) refs.lonePineSign.enabled = signs.lone;
    const showPine = pineVisible(era, destroyed);
    if (refs.pineTree) refs.pineTree.enabled = showPine;
    if (refs.pineTrunk) refs.pineTrunk.enabled = showPine;

    if (refs.clockFace) {
      const mat = refs.clockFace.render?.meshInstances?.[0]?.material;
      if (mat) {
        if (f.courthouse_clock_stopped_1955 && era !== '1885') {
          mat.emissive.set(1, 0.2, 0.1);
          mat.emissiveIntensity = 0.95;
        } else {
          mat.emissive.set(1, 0.93, 0.67);
          mat.emissiveIntensity = 0.35;
        }
        mat.update();
      }
    }

    if (refs.dinerInteriorLight) {
      const dim = f.diner_jukebox_unplugged_1955 && (era === '1985' || era === '2015' || era === '2045');
      refs.dinerInteriorLight.enabled = !dim;
    }
    if (refs.dinerNeon) {
      refs.dinerNeon.enabled =
        era === '1955' || era === '1985' || (era === '2015' && !f.diner_jukebox_unplugged_1955);
    }

    if (refs.docLabClean) {
      refs.docLabClean.enabled = !f.doc_lab_raided_1985 || era === '1885' || era === '1955' || era === '1985';
    }
    if (refs.docLabRaided) {
      refs.docLabRaided.enabled = f.doc_lab_raided_1985 && (era === '2015' || era === '2045');
    }

    if (refs.boxTruck) {
      refs.boxTruck.enabled = (era === '1985' || era === '2015' || era === '2045') &&
        !(f.box_truck_crashed_2015 && era === '2045');
    }
    if (refs.boxTruckWreck) {
      refs.boxTruckWreck.enabled = f.box_truck_crashed_2015 && era === '2045';
    }

    if (refs.mallFlood) {
      refs.mallFlood.enabled = f.mall_parking_flooded_2015 && era === '2045';
    }

    if (refs.hoverThrusters) {
      const show = f.hover_conversion_complete_2015 || era === '2015' || era === '2045';
      refs.hoverThrusters.forEach(t => { if (t) t.enabled = show; });
    }

    console.log('[Butterfly] Evaluated for', era);
  }

  toBitmask() {
    let mask = 0;
    Object.keys(this.flags).forEach((k, i) => {
      if (this.flags[k]) mask |= (1 << i);
    });
    return mask;
  }

  fromBitmask(mask) {
    Object.keys(this.flags).forEach((k, i) => {
      this.flags[k] = !!(mask & (1 << i));
    });
    this._emit('*', this.flags);
  }

  getFlagList() {
    return Object.keys(this.flags);
  }
}
