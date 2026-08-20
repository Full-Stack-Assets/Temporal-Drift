/**
 * AmbientBed — wind / town / future hum layers by era.
 */

export class AmbientBed {
  constructor(audioCtx, masterGain) {
    this.ctx = audioCtx;
    this.master = masterGain;
    this.nodes = [];
    this.gain = null;
  }

  setEra(era) {
    this.stop();
    if (!this.ctx) return;

    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0.08;
    this.gain.connect(this.master);

    // Noise bed
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const profiles = {
      '1885': 400,
      '1955': 600,
      '1985': 900,
      '2015': 1400,
      '2045': 200
    };
    filter.frequency.value = profiles[era] || 700;
    filter.Q.value = 0.6;

    noise.connect(filter);
    filter.connect(this.gain);
    noise.start();
    this.nodes = [noise, filter];
  }

  stop() {
    this.nodes.forEach(n => {
      try { if (n.stop) n.stop(); } catch (_) {}
      try { n.disconnect(); } catch (_) {}
    });
    this.nodes = [];
    if (this.gain) {
      try { this.gain.disconnect(); } catch (_) {}
      this.gain = null;
    }
  }
}
