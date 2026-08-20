/**
 * InteractPrompt — on-screen “Press E / tap to repair” affordance.
 */

export class InteractPrompt {
  constructor(elementId = 'interact-prompt') {
    this.el = document.getElementById(elementId);
    this.action = null;
    this._bind();
  }

  _bind() {
    if (!this.el) return;
    const activate = (e) => {
      e.preventDefault();
      this.tryActivate();
    };
    // Pointer Events synthesize click; bind one path to avoid double repair.
    if (window.PointerEvent) {
      this.el.addEventListener('pointerdown', activate);
    } else {
      this.el.addEventListener('click', activate);
    }
  }

  show(label, action) {
    this.action = action;
    if (!this.el) return;
    this.el.textContent = label;
    this.el.hidden = false;
    this.el.classList.add('visible');
  }

  hide() {
    this.action = null;
    if (!this.el) return;
    this.el.hidden = true;
    this.el.classList.remove('visible');
  }

  isVisible() {
    return !!this.action;
  }

  tryActivate() {
    if (!this.action) return false;
    const fn = this.action;
    fn();
    return true;
  }
}
