/**
 * AudioManager — Web Audio API engine loop + spatial lightning.
 * Doppler-ish pitch tracking and era-arrival stinger.
 */

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.started = false;
    this.enabled = true;
  }

  async init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.35;
      this.masterGain.connect(this.ctx.destination);

      // Engine: sawtooth + lowpass for a rough DeLorean-ish tone
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 45;

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 400;
      this.engineFilter.Q.value = 1.2;

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;

      this.engineOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      this.engineOsc.start();
      this.started = true;
      console.log('[Audio] Engine loop ready');
    } catch (e) {
      console.warn('[Audio] Init failed (autoplay policy?)', e);
      this.enabled = false;
    }
  }

  /** Must be called from a user gesture to unlock AudioContext */
  async unlock() {
    if (!this.ctx) await this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /**
   * Update engine pitch/volume from vehicle state.
   * @param {number} speedMPH
   * @param {boolean} hoverMode
   * @param {number} throttle - -1..1
   */
  updateEngine(speedMPH, hoverMode, throttle) {
    if (!this.started || !this.enabled) return;

    const base = hoverMode ? 70 : 42;
    const pitch = base + speedMPH * (hoverMode ? 1.8 : 1.35);
    const now = this.ctx.currentTime;

    this.engineOsc.frequency.setTargetAtTime(Math.min(pitch, 280), now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(
      hoverMode ? 900 + speedMPH * 4 : 350 + speedMPH * 3.5,
      now,
      0.1
    );

    // Volume follows throttle + speed
    const vol = Math.min(0.55, 0.05 + Math.abs(throttle) * 0.25 + speedMPH / 250);
    this.engineGain.gain.setTargetAtTime(vol, now, 0.06);
  }

  /** Lightning crack + thunder whoosh on time arrival */
  playLightning(x = 0, z = 0) {
    if (!this.started || !this.enabled) return;

    const now = this.ctx.currentTime;
    const duration = 1.4;

    // Noise buffer for crack
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2.5);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 0.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    // Simple stereo panner based on x
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, x / 30));

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + duration);

    // Low thunder tone
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.8);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1);
  }

  setMasterVolume(v) {
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), this.ctx.currentTime, 0.1);
    }
  }
}
