/**
 * TouchControls — iOS-aware virtual stick + action buttons.
 * Isolated module for clearer ownership and reuse.
 */

export class TouchControls {
  /**
   * @param {object} options
   * @param {Function} options.onKeypad
   */
  constructor(options = {}) {
    this.state = {
      steer: 0,
      throttle: 0,
      handbrake: false,
      boost: false
    };
    this.onKeypad = options.onKeypad || (() => {});
    this._activePointers = new Map();
    this._setup();
  }

  _setup() {
    const tc = document.getElementById('touch-controls');
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch && tc) tc.classList.add('visible');

    // iOS-specific: prevent multi-touch gesture zoom on the game layer
    document.addEventListener('touchmove', e => {
      if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });

    const pad = document.getElementById('steer-pad');
    const knob = document.getElementById('steer-knob');
    if (!pad) return;

    const readSteer = (clientX, clientY) => {
      const rect = pad.getBoundingClientRect();
      const mx = rect.left + rect.width / 2;
      const my = rect.top + rect.height / 2;
      let dx = (clientX - mx) / (rect.width / 2);
      let dy = (clientY - my) / (rect.height / 2);
      dx = Math.max(-1, Math.min(1, dx));
      dy = Math.max(-1, Math.min(1, dy));
      this.state.steer = -dx;
      if (Math.abs(dy) > 0.25) this.state.throttle = -dy;
      if (knob) {
        knob.style.transform = `translate(calc(-50% + ${dx * 38}px), calc(-50% + ${dy * 38}px))`;
      }
    };

    const endSteer = () => {
      this.state.steer = 0;
      const thr = document.getElementById('throttle-btn');
      const brk = document.getElementById('brake-btn');
      if (!thr?.classList.contains('active') && !brk?.classList.contains('active')) {
        this.state.throttle = 0;
      }
      if (knob) knob.style.transform = 'translate(-50%, -50%)';
    };

    // Prefer Pointer Events when available (better iOS 13+)
    if (window.PointerEvent) {
      pad.addEventListener('pointerdown', e => {
        e.preventDefault();
        pad.setPointerCapture(e.pointerId);
        readSteer(e.clientX, e.clientY);
      });
      pad.addEventListener('pointermove', e => {
        if (pad.hasPointerCapture?.(e.pointerId)) readSteer(e.clientX, e.clientY);
      });
      pad.addEventListener('pointerup', endSteer);
      pad.addEventListener('pointercancel', endSteer);
    } else {
      pad.addEventListener('touchstart', e => {
        e.preventDefault();
        readSteer(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: false });
      pad.addEventListener('touchmove', e => {
        e.preventDefault();
        readSteer(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: false });
      pad.addEventListener('touchend', endSteer);
      pad.addEventListener('touchcancel', endSteer);
    }

    const bindBtn = (id, on, off) => {
      const el = document.getElementById(id);
      if (!el) return;
      const start = e => { e.preventDefault(); el.classList.add('active'); on(); };
      const end = e => { e.preventDefault(); el.classList.remove('active'); off(); };
      if (window.PointerEvent) {
        el.addEventListener('pointerdown', start);
        el.addEventListener('pointerup', end);
        el.addEventListener('pointercancel', end);
      } else {
        el.addEventListener('touchstart', start, { passive: false });
        el.addEventListener('touchend', end, { passive: false });
        el.addEventListener('touchcancel', end, { passive: false });
      }
      el.addEventListener('mousedown', start);
      el.addEventListener('mouseup', end);
      el.addEventListener('mouseleave', end);
    };

    bindBtn('throttle-btn', () => { this.state.throttle = 1; }, () => { this.state.throttle = 0; });
    bindBtn('brake-btn', () => { this.state.throttle = -1; }, () => { this.state.throttle = 0; });
    bindBtn('handbrake-btn', () => { this.state.handbrake = true; }, () => { this.state.handbrake = false; });
    bindBtn('boost-btn', () => { this.state.boost = true; }, () => { this.state.boost = false; });

    const kbtn = document.getElementById('keypad-btn');
    if (kbtn) {
      const open = e => { e.preventDefault(); this.onKeypad(); };
      kbtn.addEventListener('pointerdown', open);
      kbtn.addEventListener('touchstart', open, { passive: false });
      kbtn.addEventListener('click', open);
    }
  }

  getState() {
    return this.state;
  }
}
