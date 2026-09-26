// Entrada estilo World of Warcraft:
//  - botão esquerdo arrastado: gira só a câmera
//  - botão direito arrastado: gira câmera + personagem (A/D viram strafe)
//  - os dois botões: anda para frente
//  - clique simples (sem arrastar): seleciona (esq.) / interage (dir.)
const GAME_KEYS = new Set(['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Slash']);

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.buttons = [false, false, false];
    this.mx = window.innerWidth / 2;
    this.my = window.innerHeight / 2;
    this.dx = 0;
    this.dy = 0;
    this.wheel = 0;
    this.dragging = false;
    this.clicks = [];
    this.enabled = true;
    this.pointerLock = false;
    this.overCanvas = true;
    this._down = { x: 0, y: 0, t: 0, button: -1, moved: 0 };
    this.onKey = null; // callback(code, event) para atalhos de UI
    this._bind();
  }

  get left() { return this.buttons[0]; }
  get right() { return this.buttons[2]; }
  get anyButton() { return this.buttons[0] || this.buttons[2]; }
  down(code) { return this.keys.has(code); }
  hit(code) { return this.pressed.has(code); }

  _isTyping(e) {
    const t = e.target;
    if (!t) return false;
    if (t.tagName === 'TEXTAREA' || t.isContentEditable) return true;
    return t.tagName === 'INPUT' && /^(text|search|password|email|number)?$/.test(t.type || 'text');
  }

  _bind() {
    const c = this.canvas;
    c.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
      if (e.button !== 0 && e.button !== 2) return;
      if (!this.anyButton) this._down = { x: e.clientX, y: e.clientY, t: performance.now(), button: e.button, moved: 0 };
      else this._down.button = -1; // acorde de botões não conta como clique
      this.buttons[e.button] = true;
    });
    window.addEventListener('mousemove', (e) => {
      this.mx = e.clientX;
      this.my = e.clientY;
      if (this.anyButton && e.buttons === 0) this._releaseAll();
      if (!this.anyButton) return;
      const mx = e.movementX || 0, my = e.movementY || 0;
      this._down.moved += Math.abs(mx) + Math.abs(my);
      if (!this.dragging && this._down.moved > 5) {
        this.dragging = true;
        document.body.classList.add('dragging');
        if (this.pointerLock && c.requestPointerLock) {
          try { c.requestPointerLock(); } catch { /* sem suporte */ }
        }
      }
      if (this.dragging) {
        this.dx += mx;
        this.dy += my;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button !== 0 && e.button !== 2) return;
      if (!this.buttons[e.button]) return;
      this.buttons[e.button] = false;
      if (!this.dragging && this._down.button === e.button && performance.now() - this._down.t < 650) {
        this.clicks.push({ button: e.button, x: e.clientX, y: e.clientY });
      }
      if (!this.anyButton) this._endDrag();
    });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('wheel', (e) => {
        e.preventDefault();
        const d = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
        this.wheel += Math.max(-3, Math.min(3, d / 100));
      }, { passive: false });
    c.addEventListener('mouseenter', () => (this.overCanvas = true));
    c.addEventListener('mouseleave', () => (this.overCanvas = false));
    window.addEventListener('keydown', (e) => {
      if (this._isTyping(e)) return;
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      if (!e.repeat) {
        this.pressed.add(e.code);
        if (this.onKey && this.onKey(e.code, e) === true) e.preventDefault();
      }
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this._releaseAll();
    });
    // botões e controles da interface não seguram o foco (senão o Espaço "clica" de novo)
    document.addEventListener('click', (e) => {
      if (e.target.closest?.('button')) setTimeout(() => document.activeElement?.blur?.(), 0);
    });
    document.addEventListener('change', (e) => {
      if (e.target.tagName === 'SELECT' || e.target.type === 'checkbox') setTimeout(() => e.target.blur(), 0);
    });
    document.addEventListener('pointerup', (e) => {
      if (e.target.type === 'range') setTimeout(() => e.target.blur(), 0);
    });
  }

  _releaseAll() {
    this.buttons[0] = this.buttons[2] = false;
    this._endDrag();
  }

  _endDrag() {
    this.dragging = false;
    document.body.classList.remove('dragging');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  endFrame() {
    this.pressed.clear();
    this.dx = this.dy = 0;
    this.wheel = 0;
    this.clicks.length = 0;
  }
}
