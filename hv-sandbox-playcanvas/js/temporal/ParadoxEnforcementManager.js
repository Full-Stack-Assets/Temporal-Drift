/**
 * ParadoxEnforcementManager — anachronism → anomaly score → wanted stars → desaturation / failure.
 * Lightweight implementation for the prototype.
 */

export class ParadoxEnforcementManager {
  constructor(options = {}) {
    this.anomalyScore = 0;
    this.stars = 0;
    this.paradoxTimer = 0;
    this.maxParadoxDuration = 45; // seconds at 5★ before timeline erasure
    this.active = true;

    this.starsEl = document.getElementById('stars-display');
    this.canvas = document.getElementById('application-canvas');

    // Thresholds
    this.thresholds = [0, 10, 30, 60, 100, 150];
  }

  /**
   * Call every frame with vehicle + time state.
   * @param {number} dt
   * @param {object} ctx
   * @param {number} ctx.speedMPH
   * @param {boolean} ctx.hoverMode
   * @param {string} ctx.currentEra
   */
  update(dt, ctx) {
    if (!this.active) return;

    let rate = 0;

    // Hover in pre-2015 is a major paradox
    if (ctx.hoverMode && ctx.currentEra !== '2015' && ctx.currentEra !== '2045') {
      rate += 25;
    }

    // Excessive speed in early eras
    if ((ctx.currentEra === '1885' || ctx.currentEra === '1955') && ctx.speedMPH > 50) {
      rate += 8;
    }

    if (rate > 0) {
      this.anomalyScore += rate * dt;
    } else {
      // Natural decay
      this.anomalyScore = Math.max(0, this.anomalyScore - 4 * dt);
    }

    // Update stars
    let newStars = 0;
    for (let i = 5; i >= 1; i--) {
      if (this.anomalyScore >= this.thresholds[i]) {
        newStars = i;
        break;
      }
    }
    this.stars = newStars;

    // 5★ timer
    if (this.stars >= 5) {
      this.paradoxTimer += dt;
      const t = Math.min(1, this.paradoxTimer / this.maxParadoxDuration);
      // CSS desaturation (prototype). Production should use a post-process shader.
      if (this.canvas) {
        this.canvas.style.filter = `saturate(${1 - t * 0.9}) brightness(${1 - t * 0.25})`;
      }
      if (this.paradoxTimer >= this.maxParadoxDuration) {
        this._triggerErasure();
      }
    } else {
      this.paradoxTimer = 0;
      if (this.canvas) this.canvas.style.filter = '';
    }

    this._renderStars();
  }

  _renderStars() {
    if (!this.starsEl) return;
    const filled = '★'.repeat(this.stars);
    const empty = '☆'.repeat(5 - this.stars);
    this.starsEl.textContent = filled + empty;
  }

  _triggerErasure() {
    this.active = false;
    alert('TIMELINE ERASURE — Paradox overload. The continuum has rejected this timeline.\n\nReloading…');
    location.reload();
  }

  /** Called when player successfully jumps or performs a repair action */
  reduceScore(amount = 40) {
    this.anomalyScore = Math.max(0, this.anomalyScore - amount);
  }

  getStars() { return this.stars; }
  getScore() { return this.anomalyScore; }
}
