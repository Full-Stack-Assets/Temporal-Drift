/**
 * FlagPanel — optional on-screen butterfly flag toggles for mobile / debugging.
 */

export class FlagPanel {
  /**
   * @param {import('../temporal/ButterflyEffectManager.js').ButterflyEffectManager} butterfly
   * @param {Function} onChange - () => void after toggle
   */
  constructor(butterfly, onChange) {
    this.butterfly = butterfly;
    this.onChange = onChange || (() => {});
    this.el = null;
    this._build();
  }

  _build() {
    const existing = document.getElementById('flag-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'flag-panel';
    panel.style.cssText = `
      position:absolute; top:120px; left:8px; z-index:110;
      display:flex; flex-direction:column; gap:4px;
      max-width:160px; pointer-events:auto;
    `;

    this.butterfly.getFlagList().forEach((key, i) => {
      const btn = document.createElement('button');
      btn.textContent = `${i + 1}. ${key.split('_')[0]}`;
      btn.style.cssText = `
        font-family:Share Tech Mono,monospace; font-size:10px;
        padding:6px 8px; background:rgba(20,30,40,0.75);
        border:1px solid #2a4a3a; color:#8aba8a; border-radius:4px;
        cursor:pointer; text-align:left;
      `;
      btn.addEventListener('click', e => {
        e.preventDefault();
        this.butterfly.toggleFlag(key);
        this._refresh();
        this.onChange();
      });
      btn.addEventListener('touchend', e => {
        e.preventDefault();
        this.butterfly.toggleFlag(key);
        this._refresh();
        this.onChange();
      }, { passive: false });
      btn.dataset.flag = key;
      panel.appendChild(btn);
    });

    document.body.appendChild(panel);
    this.el = panel;
    this._refresh();
  }

  _refresh() {
    if (!this.el) return;
    this.el.querySelectorAll('button').forEach(btn => {
      const on = this.butterfly.getFlag(btn.dataset.flag);
      btn.style.borderColor = on ? '#00ff41' : '#2a4a3a';
      btn.style.color = on ? '#00ff41' : '#8aba8a';
    });
  }

  show() { if (this.el) this.el.style.display = 'flex'; }
  hide() { if (this.el) this.el.style.display = 'none'; }
}
