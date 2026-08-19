/**
 * TimeStateMachine — monitors 88 mph and orchestrates era swaps.
 * White flash + asynchronous layer enable/disable + velocity restore.
 */

import * as pc from 'playcanvas';

const ERAS = ['1885', '1955', '1985', '2015', '2045'];

export class TimeStateMachine {
  /**
   * @param {pc.AppBase} app
   * @param {object} deps
   * @param {import('../vehicle/RaycastArcadeController.js').RaycastArcadeController} deps.vehicle
   * @param {Function} deps.onEraChange - callback(newEra, oldEra)
   * @param {Function} deps.getEraRoot - (era) => pc.Entity | null
   */
  constructor(app, deps) {
    this.app = app;
    this.vehicle = deps.vehicle;
    this.onEraChange = deps.onEraChange || (() => {});
    this.getEraRoot = deps.getEraRoot || (() => null);

    this.currentEra = '1985';
    this.destinationEra = '1985';
    this.lastDepartedEra = null;
    this.isJumping = false;
    this.jumpCooldown = 0;
    this._eraListeners = [];

    // DOM references
    this.flashEl = document.getElementById('time-flash');
    this.destEl = document.getElementById('dest-time');
    this.presentEl = document.getElementById('present-time');
    this.lastEl = document.getElementById('last-time');
    this.eraLabel = document.getElementById('era-label');
    this.speedEl = document.getElementById('speed-display');
  }

  setDestinationEra(era) {
    if (!ERAS.includes(era)) return;
    this.destinationEra = era;
    this._updateHUD();
  }

  addEraListener(fn) {
    if (typeof fn === 'function') this._eraListeners.push(fn);
  }

  _notifyEraChange(newEra, oldEra) {
    this.onEraChange(newEra, oldEra);
    for (const fn of this._eraListeners) {
      try { fn(newEra, oldEra); } catch (e) { console.error('[Time] era listener', e); }
    }
  }

  /**
   * Swap era layers without the 88 mph flash (save restore / tests).
   */
  applyEra(era) {
    if (!ERAS.includes(era) || era === this.currentEra) {
      this._updateHUD();
      return;
    }
    const fromEra = this.currentEra;
    const fromRoot = this.getEraRoot(fromEra);
    const toRoot = this.getEraRoot(era);
    if (fromRoot) fromRoot.enabled = false;
    if (toRoot) toRoot.enabled = true;
    this.lastDepartedEra = fromEra;
    this.currentEra = era;
    this._notifyEraChange(era, fromEra);
    this._updateHUD();
  }

  async forceJumpTo(era) {
    if (!ERAS.includes(era) || this.isJumping || era === this.currentEra) return;
    this.destinationEra = era;
    await this._beginJump();
  }

  setDestinationFromDate(mm, dd, yyyy) {
    const year = parseInt(yyyy, 10);
    let era = '1985';
    if (year <= 1920) era = '1885';
    else if (year <= 1970) era = '1955';
    else if (year <= 2000) era = '1985';
    else if (year <= 2030) era = '2015';
    else era = '2045';

    this.setDestinationEra(era);

    // Pretty format for HUD
    const formatted = `${String(mm).padStart(2, '0')} ${String(dd).padStart(2, '0')} ${yyyy}`;
    if (this.destEl) this.destEl.textContent = formatted;
  }

  update(dt) {
    if (this.jumpCooldown > 0) this.jumpCooldown -= dt;

    // Speed display
    const mph = Math.round(this.vehicle.speedMPH);
    if (this.speedEl) {
      this.speedEl.textContent = `${mph} MPH`;
      this.speedEl.classList.toggle('over88', mph >= 88);
    }

    // Trigger condition
    if (
      !this.isJumping &&
      this.jumpCooldown <= 0 &&
      this.vehicle.speedMPH >= 88 &&
      this.destinationEra !== this.currentEra
    ) {
      this._beginJump();
    }
  }

  async _beginJump() {
    this.isJumping = true;
    const fromEra = this.currentEra;
    const toEra = this.destinationEra;

    // 1. Capture velocity
    const savedVel = this.vehicle.getVelocity();

    // 2. White flash ON
    if (this.flashEl) {
      this.flashEl.classList.add('active');
    }

    // 3. Brief hold so the flash is visible
    await this._wait(180);

    // 4. Swap layers
    await this._swapEraLayers(fromEra, toEra);

    // 5. Update state
    this.lastDepartedEra = fromEra;
    this.currentEra = toEra;

    // 6. Restore velocity with a small boost (film style)
    this.vehicle.setVelocity(
      savedVel.x * 1.08,
      savedVel.y,
      savedVel.z * 1.08
    );

    // 7. Notify systems (butterfly, audio, paradox, pathfinder…)
    this._notifyEraChange(toEra, fromEra);

    // 8. Minimum visual buffer
    await this._wait(220);

    // 9. Fade flash
    if (this.flashEl) {
      this.flashEl.classList.remove('active');
    }

    this._updateHUD();
    this.isJumping = false;
    this.jumpCooldown = 1.2; // prevent instant re-trigger
  }

  async _swapEraLayers(fromEra, toEra) {
    const fromRoot = this.getEraRoot(fromEra);
    const toRoot = this.getEraRoot(toEra);

    if (fromRoot) fromRoot.enabled = false;
    if (toRoot) toRoot.enabled = true;

    // Tiny yield so the engine can process the hierarchy change
    await this._wait(16);
  }

  _updateHUD() {
    const eraDates = {
      '1885': '09 02 1885',
      '1955': '11 05 1955',
      '1985': '10 26 1985',
      '2015': '10 21 2015',
      '2045': '06 15 2045'
    };

    if (this.presentEl) this.presentEl.textContent = eraDates[this.currentEra] || this.currentEra;
    if (this.lastEl && this.lastDepartedEra) {
      this.lastEl.textContent = eraDates[this.lastDepartedEra] || this.lastDepartedEra;
    }
    if (this.eraLabel) {
      this.eraLabel.textContent = `ERA: ${this.currentEra} — HILL VALLEY`;
    }
  }

  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** External systems can query */
  getCurrentEra() { return this.currentEra; }
  getDestinationEra() { return this.destinationEra; }
  isInHoverEra() { return this.currentEra === '2015' || this.currentEra === '2045'; }
}
