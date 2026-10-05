// Controles de toque (celular e tablet). Não mexe no jogo: traduz os dedos para os mesmos campos do Input.
//  - lado esquerdo: joystick que nasce onde o dedo encosta (input.move, relativo à câmera)
//  - resto da tela: arrastar gira a câmera (dx/dy + touchLook), pinça dá zoom (wheel)
//  - em qualquer lado, dedo que não anda: solto logo vira um clique 'tap'; parado vira input.hold
//    (mostra a dica, como o mouse por cima)
//  - botões de pular / subir / descer viram teclas virtuais (Espaço e X)
//  - joystick arrastado para cima até o cadeado e solto: corre sozinho (o R do teclado), para onde a câmera
//    aponta (girar a câmera muda o rumo); encostar o polegar no joystick de novo faz parar
// Os tempos (toque rápido, toque longo) correm no tempo do jogo (update), então o e2e consegue simular.

const STICK_ZONE = 0.42; // fração da largura onde o dedo vira joystick
const STICK_R = 56; // raio do joystick (px CSS)
const TAP_MOVE = 12; // até quantos px do ponto inicial o dedo ainda conta como parado
const HOLD_T = 0.5; // parado por mais que isso: toque longo (antes disso, solto = toque rápido)
const PINCH_PX = 45; // px de pinça por "clique" da roda
const PINCH_NEAR = 0.3; // dois dedos mais perto que isso (fração da largura) são pinça, não joystick + câmera
const PINCH_T = 0.15; // ...e encostando quase juntos (em segundos); depois disso, o 2º dedo é a outra mão
const LOCK_RISE = 1.9; // o cadeado da corrida fica a isso × raio acima de onde o polegar encostou (e é preciso subir tudo isso)
const LOCK_ICON = '<svg viewBox="0 0 24 24"><path d="M7 10V8a5 5 0 0 1 10 0v2h1.5v11h-13V10zm2.5 0h5V8a2.5 2.5 0 0 0-5 0z"/></svg>';

const UP_ICON = '<svg viewBox="0 0 24 24"><path d="M12 4l7 8h-4.5v8h-5v-8H5z"/></svg>';
const DOWN_ICON = '<svg viewBox="0 0 24 24"><path d="M12 20l-7-8h4.5V4h5v8H19z"/></svg>';

/** o aparelho tem tela de toque como entrada principal? */
export function prefersTouch() {
  const mm = (q) => window.matchMedia?.(q).matches;
  return !!(mm('(pointer: coarse)') || (navigator.maxTouchPoints > 0 && !mm('(any-pointer: fine)')));
}

export class TouchControls {
  constructor(input, game) {
    this.input = input;
    this.game = game;
    // identifier → { role: 'stick'|'look'|'ignore', sx, sy (início), x0, y0 (centro lógico do joystick), x, y, t0, dist, held, pinch, drag,
    //                lockArmed (em cima do cadeado), noTap (o toque que destravou a corrida não vira toque no mundo) }
    this.fingers = new Map();
    this.time = 0;
    this.pinchD = 0;
    this.enabled = true; // false com a opção "Nunca": os dedos voltam a ser do navegador
    this._buildDom();
    this._bind();
    this._bindHudTaps();
  }

  _buildDom() {
    const el = (this.root = document.createElement('div'));
    el.id = 'touch';
    el.innerHTML = `
      <div class="ghost"></div>
      <div class="stick"><div class="knob">${LOCK_ICON}</div></div>
      <div class="runlock" aria-hidden="true">${LOCK_ICON}</div>
      <div class="tbtns">
        <button class="tbtn down" data-key="KeyX" aria-label="Descer">${DOWN_ICON}<span>Descer</span></button>
        <button class="tbtn jump" data-key="Space" aria-label="Pular">${UP_ICON}<span>Pular</span></button>
      </div>`;
    document.body.appendChild(el);
    // celular em pé: o jogo é para jogar deitado (o touch.css só mostra isso em retrato)
    const rot = document.createElement('div');
    rot.id = 'rotate';
    rot.innerHTML = `<svg viewBox="0 0 64 64"><rect x="20" y="6" width="24" height="44" rx="5" fill="none" stroke="#efe6d2" stroke-width="3"/><circle cx="32" cy="43" r="2.5" fill="#efe6d2"/><path d="M50 44a18 18 0 0 1-12 12" fill="none" stroke="#ff8a2a" stroke-width="3" stroke-linecap="round"/><path d="M36 52l2 4 4-2" fill="none" stroke="#ff8a2a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <b>Vire o celular</b><span>O Vale Assombrado é para jogar com o aparelho deitado.</span>`;
    document.body.appendChild(rot);
    this.stick = el.querySelector('.stick');
    this.knob = el.querySelector('.knob');
    this.lockEl = el.querySelector('.runlock');
    this.runLock = false;
    this.jumpBtn = el.querySelector('.jump');
    this.jumpLabel = this.jumpBtn.querySelector('span');
    this.downBtn = el.querySelector('.down');
    // botões: eventos de ponteiro (servem para dedo e mouse), segurar = tecla apertada
    for (const b of el.querySelectorAll('.tbtn')) {
      const code = b.dataset.key;
      const press = (e) => {
        e.preventDefault();
        if (e.pointerType !== 'mouse') this.input.lastPointer = 'touch';
        if (!this.input.keys.has(code)) this.input.pressed.add(code);
        this.input.keys.add(code);
        b.classList.add('on');
      };
      const release = () => {
        this.input.keys.delete(code);
        b.classList.remove('on');
      };
      b.addEventListener('pointerdown', press);
      for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, release);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  }

  _bind() {
    const c = this.input.canvas;
    const opt = { passive: false };
    c.addEventListener('touchstart', (e) => this._start(e), opt);
    c.addEventListener('touchmove', (e) => this._move(e), opt);
    c.addEventListener('touchend', (e) => this._end(e), opt);
    c.addEventListener('touchcancel', (e) => this._end(e, true), opt);
    // a página nunca rola nem dá zoom com os dedos (gestos são do jogo)
    document.addEventListener('gesturestart', (e) => this.enabled && e.preventDefault(), opt);
    // trocou de aba ou de app no meio de um gesto: solta tudo (senão o personagem segue andando sozinho)
    window.addEventListener('blur', () => this.reset());
    document.addEventListener('visibilitychange', () => document.hidden && this.reset());
  }

  /**
   * Com um dedo já na tela (o polegar no joystick), o navegador costuma não gerar click para o toque do outro
   * dedo num botão da interface (menu do topo, janelas, minimapa). Aqui o toque rápido vira click; o
   * preventDefault no touchend garante que não saia um segundo click quando o navegador gerar o dele.
   */
  _bindHudTaps() {
    const starts = new Map();
    const inUi = (el) => !!el?.closest?.('#hud, #popup');
    const cap = { capture: true, passive: false };
    document.addEventListener('touchstart', (e) => {
      if (!this.enabled) return;
      for (const t of e.changedTouches) if (inUi(t.target)) starts.set(t.identifier, { x: t.clientX, y: t.clientY, t: performance.now() });
    }, cap);
    document.addEventListener('touchend', (e) => {
      if (!this.enabled) return;
      for (const t of e.changedTouches) {
        const st = starts.get(t.identifier);
        starts.delete(t.identifier);
        if (!st || e.touches.length === 0) continue; // dedo sozinho: o click normal do navegador resolve
        const el = t.target;
        if (!inUi(el) || /^(INPUT|SELECT|TEXTAREA|OPTION)$/.test(el.tagName)) continue;
        if (Math.hypot(t.clientX - st.x, t.clientY - st.y) > 12 || performance.now() - st.t > 600) continue;
        e.preventDefault();
        // o ícone da opção de conversa é um <svg>, que não tem .click(): sobe até o que é clicável
        const hit = el.closest?.('button, li, .qi, .q, .slot, .tog, [data-a], [data-item], canvas, a') ?? el;
        hit.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window, clientX: t.clientX, clientY: t.clientY }));
      }
    }, cap);
    document.addEventListener('touchcancel', (e) => {
      for (const t of e.changedTouches) starts.delete(t.identifier);
    }, cap);
  }

  /** liga/desliga (opção "Nunca"): desligado, não segura nenhum evento e solta o que estava apertado */
  setEnabled(v) {
    if (this.enabled === v) return;
    this.enabled = v;
    this.reset();
  }

  _start(e) {
    if (!this.enabled) return;
    // sem preventDefault o navegador ainda gera mousedown/click de compatibilidade (e o toque viraria dois cliques)
    e.preventDefault();
    this.input.lastPointer = 'touch';
    // um touchend que se perdeu (alerta do sistema, gesto da borda) deixaria um dedo fantasma preso
    const alive = new Set([...e.touches].map((t) => t.identifier));
    for (const id of [...this.fingers.keys()]) if (!alive.has(id)) this._drop(id, true);
    for (const t of e.changedTouches) {
      const fs = [...this.fingers.values()];
      const stick = fs.find((f) => f.role === 'stick');
      const hasLook = fs.some((f) => f.role === 'look');
      const inZone = t.clientX < window.innerWidth * STICK_ZONE;
      let role = 'look';
      if (inZone && !stick) role = 'stick';
      // terceiro dedo no lado do joystick (já tem joystick e câmera): ignorado, não faz pinça com a câmera.
      // O segundo dedo, mesmo desse lado, é a outra mão: toca PNJ e gira a câmera normalmente
      else if (inZone && stick && hasLook) role = 'ignore';
      // dois dedos juntos (no espaço e no tempo) são pinça, mesmo que o primeiro tenha caído no lado do joystick
      if (stick && !stick.drag && !stick.held && this.time - stick.t0 < PINCH_T && Math.hypot(t.clientX - stick.x, t.clientY - stick.y) < window.innerWidth * PINCH_NEAR) {
        this._toLook(stick);
        role = 'look';
      }
      const f = { role, sx: t.clientX, sy: t.clientY, x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY, t0: this.time, dist: 0, held: false, pinch: false, drag: false };
      if (role === 'stick' && this.runLock) {
        // o polegar voltou ao joystick: a corrida travada acaba e ele assume. Esse toque só para: não conversa nem
        // ataca o que estiver embaixo do dedo
        this.setRunLock(false);
        f.noTap = true;
      }
      if (role === 'stick') {
        // o centro lógico é onde o dedo encostou; só o desenho da base é empurrado para caber na tela
        this.stick.classList.add('on');
        this.root.classList.add('sticking');
        this._drawStick(f);
      }
      this.fingers.set(t.identifier, f);
    }
    this._syncPinch();
  }

  /** o dedo do joystick virou parte de uma pinça */
  _toLook(f) {
    f.role = 'look';
    this._clearStick();
  }

  _clearStick() {
    const mv = this.input.move;
    mv.x = mv.y = mv.m = 0;
    this.lockEl.classList.remove('show', 'armed');
    this.stick.classList.remove('on');
    this.root.classList.remove('sticking');
  }

  _move(e) {
    if (!this.enabled) return;
    e.preventDefault();
    const looks = [];
    for (const t of e.changedTouches) {
      const f = this.fingers.get(t.identifier);
      if (!f || f.role === 'ignore') continue;
      const ddx = t.clientX - f.x, ddy = t.clientY - f.y;
      f.x = t.clientX;
      f.y = t.clientY;
      // distância do ponto inicial (o tremor do dedo não soma)
      f.dist = Math.max(f.dist, Math.hypot(f.x - f.sx, f.y - f.sy));
      if (f.dist > TAP_MOVE && !f.drag) {
        f.drag = true;
        if (f.held) {
          f.held = false;
          this.input.hold = null;
        }
      }
      if (f.role === 'stick') this._stickTo(f);
      else looks.push([f, ddx, ddy]);
    }
    const lookFingers = [...this.fingers.values()].filter((f) => f.role === 'look');
    if (lookFingers.length >= 2) {
      // pinça: afastar os dedos aproxima a câmera
      const [a, b] = lookFingers;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinchD) this.input.wheel += (this.pinchD - d) / PINCH_PX;
      this.pinchD = d;
      for (const f of lookFingers) f.pinch = true;
      this.input.touchLook = false;
      return;
    }
    for (const [f, ddx, ddy] of looks) {
      if (f.pinch || !f.drag) continue;
      // virou arrasto: gira a câmera
      this.input.touchLook = true;
      this.input.dx += ddx;
      this.input.dy += ddy;
    }
  }

  _end(e, cancel = false) {
    if (!this.enabled) return;
    e.preventDefault();
    for (const t of e.changedTouches) {
      const f = this.fingers.get(t.identifier);
      if (f) f.x = t.clientX, f.y = t.clientY;
      this._drop(t.identifier, cancel);
    }
    // a pinça acabou: o dedo que ficou volta a girar a câmera (sem dar um pulo)
    const looks = [...this.fingers.values()].filter((f) => f.role === 'look');
    if (looks.length === 1 && looks[0].pinch) {
      looks[0].pinch = false;
      looks[0].drag = true;
    }
    this.input.touchLook = looks.some((f) => !f.pinch && f.drag);
    this._syncPinch();
  }

  /** um dedo saiu: solta o joystick, ou vira toque rápido se não andou nem ficou parado tempo demais */
  _drop(id, cancel) {
    const f = this.fingers.get(id);
    if (!f) return;
    this.fingers.delete(id);
    // soltou em cima do cadeado: corre sozinho
    if (f.role === 'stick' && f.lockArmed && !cancel) return this.setRunLock(true, f);
    if (f.role === 'stick') this._clearStick();
    if (f.role === 'ignore') return;
    const tap = !cancel && !f.noTap && !f.pinch && !f.held && !f.drag && this.time - f.t0 < HOLD_T;
    if (tap) this.input.clicks.push({ button: 'tap', x: f.sx, y: f.sy, stick: f.role === 'stick' });
    if (f.held) this.input.hold = null;
  }

  _syncPinch() {
    const looks = [...this.fingers.values()].filter((f) => f.role === 'look');
    this.pinchD = looks.length >= 2 ? Math.hypot(looks[0].x - looks[1].x, looks[0].y - looks[1].y) : 0;
  }

  _stickTo(f) {
    let dx = f.x - f.x0, dy = f.y - f.y0;
    const d = Math.hypot(dx, dy);
    // passou da borda: o centro acompanha o dedo (joystick que "anda")
    if (d > STICK_R) {
      f.x0 += (dx / d) * (d - STICK_R);
      f.y0 += (dy / d) * (d - STICK_R);
      dx = f.x - f.x0;
      dy = f.y - f.y0;
    }
    this._drawStick(f);
    const mv = this.input.move;
    // enquanto o dedo não saiu do lugar (pode ser um toque), o personagem não anda
    if (!f.drag) {
      mv.x = mv.y = mv.m = 0;
    } else {
      mv.x = dx / STICK_R;
      mv.y = -dy / STICK_R;
      mv.m = Math.min(1, Math.hypot(dx, dy) / STICK_R);
    }
    // cadeado da corrida: aparece quando o polegar sobe e arma quando ele sobe LOCK_RISE × raio inteiro (o
    // passo normal de andar fica em 1–1,25 raio). O alvo fica parado acima de onde o polegar encostou, mesmo com
    // a base do joystick seguindo o dedo; perto do topo ele é só desenhado mais baixo, a subida exigida é a mesma
    const up = f.drag && mv.m > 0.5 && mv.y > 0.85 * mv.m && this.canLock();
    const rise = f.sy - f.y;
    f.lockArmed = up && rise >= STICK_R * LOCK_RISE - 8;
    this.lockEl.classList.toggle('show', up && rise > STICK_R * 0.6);
    this.lockEl.classList.toggle('armed', f.lockArmed);
    const ly = Math.max(30, f.sy - STICK_R * LOCK_RISE);
    this.lockEl.style.transform = `translate(${Math.min(window.innerWidth - 40, Math.max(40, f.sx))}px, ${ly}px)`;
  }

  /** dá para correr sozinho agora? (no voo, sentado, conversando, conjurando, preso ou morto a trava cairia já) */
  canLock() {
    const g = this.game, p = g.player;
    return !!p && !(p.sitting || p.seat || p.frozen || p.flying || g.combat?.dead || g.ui?.dialog?.open || g.ui?.casting || g.portraitPaused);
  }

  /**
   * corrida travada: o personagem segue em frente (para onde a câmera aponta) sem o polegar na tela. A base volta
   * para onde o polegar encostou (subindo ela ficava em cima do quadro do alvo) e o knob, em cima, vira o cadeado
   */
  setRunLock(v, f = null) {
    if (v && !this.canLock()) v = false;
    if (this.runLock === v) {
      if (!v) this._clearStick();
      return;
    }
    this.runLock = v;
    this.root.classList.toggle('runlocked', v);
    this.lockEl.classList.remove('show', 'armed');
    if (!v) return this._clearStick();
    if (f) this._drawStick({ x0: f.sx, y0: f.sy, x: f.sx, y: f.sy - STICK_R });
    const mv = this.input.move;
    mv.x = 0;
    mv.y = mv.m = 1;
    if (!this._lockHint) {
      this._lockHint = true;
      this.game.ui?.info('Correndo sozinho: toque no joystick para parar.');
    }
  }

  /** desenha a base (empurrada para caber na tela) e o knob onde o dedo está, relativo a essa base */
  _drawStick(f) {
    const m = STICK_R + 10;
    const bx = Math.min(window.innerWidth - m, Math.max(m, f.x0));
    const by = Math.min(window.innerHeight - m, Math.max(m, f.y0));
    this.stick.style.transform = `translate(${bx}px, ${by}px)`;
    let kx = f.x - bx, ky = f.y - by;
    const kd = Math.hypot(kx, ky);
    if (kd > STICK_R) {
      kx *= STICK_R / kd;
      ky *= STICK_R / kd;
    }
    this.knob.style.transform = `translate(${kx}px, ${ky}px)`;
  }

  /** chamado a cada quadro (tempo do jogo): toque longo, corrida travada e botões do voo */
  update(dt) {
    this.time += dt;
    if (this.runLock) {
      // como o R do teclado: sentar, voar, conversar, conjurar (abrir o baú, acender o farol; montar e a lápide já
      // recusam com o jogador andando, igual no desktop), morrer, ficar preso (porta da mansão), pôr o celular em pé
      // ou andar pelo teclado (tablet) param a corrida
      const K = this.input.keys;
      const keyMove = ['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown'].some((k) => K.has(k));
      if (!this.canLock() || keyMove) this.setRunLock(false);
      else {
        const mv = this.input.move;
        mv.x = 0;
        mv.y = mv.m = 1;
      }
    }
    for (const f of this.fingers.values()) {
      if (f.role === 'ignore' || f.held || f.pinch || f.drag || this.time - f.t0 < HOLD_T) continue;
      f.held = true;
      this.input.hold = { x: f.sx, y: f.sy };
    }
    const p = this.game.player;
    const flying = !!p?.flying;
    if (flying !== this._flying) {
      this._flying = flying;
      this.downBtn.classList.toggle('show', flying);
      this.jumpLabel.textContent = flying ? 'Subir' : 'Pular';
      this.jumpBtn.setAttribute('aria-label', flying ? 'Subir' : 'Pular');
    }
  }

  /** solta tudo (janela perdeu o foco, troca de modo) */
  reset() {
    this.setRunLock(false);
    this.fingers.clear();
    this.pinchD = 0;
    const i = this.input;
    i.touchLook = false;
    i.hold = null;
    i.keys.delete('Space');
    i.keys.delete('KeyX');
    this._clearStick();
    for (const b of this.root.querySelectorAll('.tbtn.on')) b.classList.remove('on');
  }
}
