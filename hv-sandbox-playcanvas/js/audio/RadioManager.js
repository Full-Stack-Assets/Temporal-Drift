/**
 * RadioManager — era-specific station beds (procedural placeholders).
 * Switches loop character when era changes.
 */

export class RadioManager {
  constructor(audioCtx, masterGain) {
    this.ctx = audioCtx;
    this.master = masterGain;
    this.current = null;
    this.gain = null;
    this.enabled = true;
    this.volume = 0.12;
  }

  /**
   * Start or switch to an era station.
   * Uses simple oscillator beds as placeholders until real audio buffers are loaded.
   */
  setEra(era) {
    if (!this.ctx || !this.enabled) return;
    this.stop();

    const profiles = {
      '1885': { type: 'triangle', freq: 110, mod: 2.5 },
      '1955': { type: 'square', freq: 220, mod: 4 },
      '1985': { type: 'sawtooth', freq: 165, mod: 6 },
      '2015': { type: 'sine', freq: 330, mod: 8 },
      '2045': { type: 'sawtooth', freq: 55, mod: 1.5 }
    };
    const p = profiles[era] || profiles['1985'];

    this.gain = this.ctx.createGain();
    this.gain.gain.value = this.volume;
    this.gain.connect(this.master);

    const osc = this.ctx.createOscillator();
    osc.type = p.type;
    osc.frequency.value = p.freq;

    // Gentle LFO for motion
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = p.mod;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = p.freq * 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    osc.connect(filter);
    filter.connect(this.gain);
    osc.start();
    lfo.start();

    this.current = { osc, lfo, filter };
  }

  stop() {
    if (this.current) {
      try { this.current.osc.stop(); } catch (_) {}
      try { this.current.lfo.stop(); } catch (_) {}
      this.current = null;
    }
    if (this.gain) {
      try { this.gain.disconnect(); } catch (_) {}
      this.gain = null;
    }
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.gain) this.gain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1);
  }
}
