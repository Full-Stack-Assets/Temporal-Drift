/**
 * SaveStateCompressor — bitmask + LocalStorage persistence for butterfly flags + era.
 */

export class SaveStateCompressor {
  constructor(storageKey = 'hv_sandbox_save_v1') {
    this.key = storageKey;
    this.version = 1;
  }

  /**
   * @param {object} state
   * @param {number} state.flagMask
   * @param {string} state.era
   * @param {object} [state.extra]
   */
  save(state) {
    try {
      const payload = {
        v: this.version,
        flags: state.flagMask >>> 0,
        era: state.era || '1985',
        extra: state.extra || {},
        ts: Date.now()
      };
      // Compact base36 for flags
      payload.flags36 = payload.flags.toString(36);
      localStorage.setItem(this.key, JSON.stringify(payload));
      return true;
    } catch (e) {
      console.warn('[Save] failed', e);
      return false;
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data.v !== this.version) return null;
      return {
        flagMask: data.flags ?? parseInt(data.flags36 || '0', 36),
        era: data.era || '1985',
        extra: data.extra || {},
        ts: data.ts
      };
    } catch (e) {
      console.warn('[Save] load failed', e);
      return null;
    }
  }

  clear() {
    try { localStorage.removeItem(this.key); } catch (_) {}
  }
}
