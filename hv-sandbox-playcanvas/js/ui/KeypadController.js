/**
 * KeypadController — Tab-activated MMDDYYYY time circuits input.
 * Pure DOM; talks to TimeStateMachine via callback.
 */

export class KeypadController {
  /**
   * @param {object} options
   * @param {Function} options.onSubmitDate - (mm, dd, yyyy) => void
   */
  constructor(options = {}) {
    this.onSubmitDate = options.onSubmitDate || (() => {});
    this.buffer = '';
    this.visible = false;

    this.overlay = document.getElementById('keypad-overlay');
    this.display = document.getElementById('keypad-display');

    this._bind();
  }

  _bind() {
    // Tab toggle
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        this.toggle();
      }
      if (!this.visible) return;

      if (e.code.startsWith('Digit') || e.code.startsWith('Numpad')) {
        const digit = e.code.replace('Digit', '').replace('Numpad', '');
        if (digit >= '0' && digit <= '9') this.append(digit);
      }
      if (e.code === 'Backspace') this.backspace();
      if (e.code === 'Enter') this.submit();
      if (e.code === 'Escape') this.hide();
    });

    // On-screen buttons
    document.querySelectorAll('#keypad .key').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        if (key === 'C') this.clear();
        else if (key === 'ENTER') this.submit();
        else this.append(key);
      });
    });
  }

  toggle() {
    this.visible ? this.hide() : this.show();
  }

  show() {
    this.visible = true;
    if (this.overlay) this.overlay.classList.add('visible');
    this._render();
  }

  hide() {
    this.visible = false;
    if (this.overlay) this.overlay.classList.remove('visible');
  }

  append(digit) {
    if (this.buffer.length >= 8) return;
    this.buffer += digit;
    this._render();
  }

  backspace() {
    this.buffer = this.buffer.slice(0, -1);
    this._render();
  }

  clear() {
    this.buffer = '';
    this._render();
  }

  submit() {
    if (this.buffer.length !== 8) {
      this.display.textContent = 'INVALID';
      setTimeout(() => this._render(), 600);
      return;
    }
    const mm = this.buffer.slice(0, 2);
    const dd = this.buffer.slice(2, 4);
    const yyyy = this.buffer.slice(4, 8);

    const month = parseInt(mm, 10);
    const day = parseInt(dd, 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      this.display.textContent = 'BAD DATE';
      setTimeout(() => this._render(), 600);
      return;
    }

    this.onSubmitDate(mm, dd, yyyy);
    this.hide();
    this.buffer = '';
  }

  _render() {
    if (!this.display) return;
    if (this.buffer.length === 0) {
      this.display.textContent = 'MMDDYYYY';
      return;
    }
    // Visual grouping: MM DD YYYY
    let s = this.buffer;
    if (s.length > 2) s = s.slice(0, 2) + ' ' + s.slice(2);
    if (s.length > 5) s = s.slice(0, 5) + ' ' + s.slice(5);
    this.display.textContent = s.padEnd(10, ' ');
  }
}
