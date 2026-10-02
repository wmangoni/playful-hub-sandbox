// Botões do polegar direito no modo toque (a barra de 12 slots do desktop some no celular):
//  - Lanternada grande: sem alvo, mira na criatura mais próxima (preferindo as da frente)
//  - arco com 3 habilidades, escolhidas entre as que o jogador já tem (a lista muda sozinha)
//  - "⋯" abre o grimório com todas as habilidades e o Sentar
//  - botão contextual quando há algo ao alcance, com o verbo do objeto (Falar, Pegar, Sentar, Abrir, Entrar...)
// Tudo com eventos de ponteiro: com um dedo no joystick, o navegador nem sempre gera click para o outro dedo.
// Toque longo num botão de habilidade (ou num item da mochila, do diálogo e do diário) mostra a descrição,
// medido no tempo do jogo, como os toques da tela. Cada dedo segura o seu botão (dois botões ao mesmo tempo).
import { icon, cursorURL } from './icons.js';
import { esc } from './windows.js';

const ARC = ['fly', 'mount', 'boo', 'lantern', 'pet', 'dance', 'hearth']; // ordem de preferência do arco
const ARC_DARK = ['lantern', 'fly', 'mount', 'boo', 'pet', 'dance', 'hearth']; // à noite e dentro da mansão, a lanterna vem antes
const AUTO_RANGE = 20; // mira automática do ataque (m)
const HOLD_T = 0.5;
const CTX_LABEL = { talk: 'Falar', loot: 'Pegar', use: 'Usar' };
const SIT_ICON = '<svg class="glyph" viewBox="0 0 24 24"><path d="M7 3h3v9h7l2 9h-3l-1.5-6H8v6H5V12l2-1z"/></svg>';

export class TouchBar {
  constructor(game, ui, root) {
    this.game = game;
    this.ui = ui;
    this.root = root;
    this.byId = Object.fromEntries(ui.slots.filter((s) => !s.empty).map((s) => [s.id, s]));
    this.views = []; // { el, slot } para o resfriamento e o "ativo"
    this.arcIds = [];
    this._t = 0;
    this.held = new Map(); // pointerId → { b, t0, hold, shown, fn, onDown }
    this._build();
    this._bindItems();
  }

  _build() {
    const el = document.createElement('div');
    el.className = 'tbar';
    el.innerHTML = `
      <button class="tb atk" aria-label="Lanternada"><img src="${icon('lanternada')}"><i class="cd"></i></button>
      <button class="tb sk s0"><img><i class="cd"></i></button>
      <button class="tb sk s1"><img><i class="cd"></i></button>
      <button class="tb sk s2"><img><i class="cd"></i></button>
      <button class="tb more" aria-label="Todas as habilidades">⋯</button>
      <button class="tb ctx hidden"><img><span></span></button>
      <div class="tbook frame-dark hidden"><div class="ttl">Habilidades</div><div class="grid"></div></div>`;
    this.root.appendChild(el);
    this.el = el;
    const atk = el.querySelector('.atk');
    this.views.push({ el: atk, slot: this.byId.attack });
    this._press(atk, () => this.attack(), { onDown: true });
    this.arc = [...el.querySelectorAll('.sk')].map((b) => {
      const v = { el: b, slot: null };
      this.views.push(v);
      this._press(b, () => v.slot && this.ui.useSlot(v.slot), { hold: () => v.slot });
      return v;
    });
    this.book = el.querySelector('.tbook');
    this._press(el.querySelector('.more'), () => this.toggleBook());
    const grid = this.book.querySelector('.grid');
    const entries = [...Object.values(this.byId).map((s) => ({ slot: s })), { sit: true }];
    for (const e of entries) {
      const b = document.createElement('button');
      b.className = 'tb bk';
      b.innerHTML = e.sit ? `${SIT_ICON}<b>Sentar</b>` : `<img src="${icon(e.slot.icon)}"><i class="cd"></i><b>${esc(e.slot.name)}</b>`;
      grid.appendChild(b);
      if (e.slot) this.views.push({ el: b, slot: e.slot });
      this._press(b, () => {
        this.toggleBook(false);
        if (e.sit) this.game.abilities.sit();
        else this.ui.useSlot(e.slot);
      }, { hold: () => e.slot });
    }
    this.ctx = el.querySelector('.ctx');
    this.ctxLabel = this.ctx.querySelector('span');
    this.ctxImg = this.ctx.querySelector('img');
    this._press(this.ctx, () => this.ctxTarget && this.game.interaction.tryInteract(this.ctxTarget), { onDown: true });
    // tocar no jogo fecha o grimório
    this.game.input.canvas.addEventListener('touchstart', () => this.toggleBook(false), { passive: true });
  }

  /**
   * liga um botão: dispara ao soltar (ou ao encostar, onDown); toque longo mostra a dica (hold devolve o slot
   * ou o HTML da dica). Cada dedo tem o seu registro: dois botões apertados ao mesmo tempo funcionam
   */
  _press(b, fn, { onDown = false, hold = null } = {}) {
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.pointerType !== 'mouse') this.game.input.lastPointer = 'touch';
      b.classList.add('on');
      this.held.set(e.pointerId, { b, t0: this.game.time, hold, shown: false, fn, onDown });
      if (onDown) fn();
    });
    const up = (e, fire) => {
      const h = this.held.get(e.pointerId);
      if (!h || h.b !== b) return;
      this.held.delete(e.pointerId);
      b.classList.remove('on');
      if (h.shown) this.ui.hideTooltip('tslot');
      else if (fire && !onDown) fn();
    };
    b.addEventListener('pointerup', (e) => up(e, true));
    b.addEventListener('pointercancel', (e) => up(e, false));
    b.addEventListener('pointerleave', (e) => up(e, false));
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /**
   * itens nas janelas: na mochila, toque usa e toque longo mostra a dica; no diálogo e no diário (recompensas),
   * toque longo mostra a dica. Delegado nos contêineres (a mochila se redesenha a cada uso)
   */
  _bindItems() {
    const ui = this.ui;
    const spots = [
      [ui.q('#bags .grid'), (id) => { ui.useItem(id); ui.bags.render(); }],
      [ui.q('#quest .scroll'), null],
      [ui.q('#qlog .detail'), null],
    ];
    for (const [box, use] of spots) {
      if (!box) continue;
      box.addEventListener('pointerdown', (e) => {
        if (!this.game.touchMode) return;
        const el = e.target.closest?.('[data-item]');
        if (!el) return;
        if (use) e.preventDefault(); // na mochila o toque é nosso; no diálogo, o dedo ainda rola o texto
        this.held.set(e.pointerId, { b: el, t0: this.game.time, hold: () => ui.itemTooltipHTML(el.dataset.item, !!use), shown: false, item: true, x: e.clientX, y: e.clientY });
      });
      const up = (e, fire) => {
        const h = this.held.get(e.pointerId);
        if (!h?.item) return;
        this.held.delete(e.pointerId);
        if (h.shown) ui.hideTooltip('tslot');
        // arrastou e soltou longe (ou fora do item): não usa
        else if (fire && use && Math.hypot(e.clientX - h.x, e.clientY - h.y) <= 12) use(h.b.dataset.item);
      };
      box.addEventListener('pointerup', (e) => up(e, true));
      box.addEventListener('pointercancel', (e) => up(e, false));
      // rolar o texto com o dedo não é toque longo
      box.addEventListener('scroll', () => {
        for (const [id, h] of this.held) if (h.item && !h.shown) this.held.delete(id);
      }, { passive: true });
    }
  }

  toggleBook(v) {
    const open = v ?? this.book.classList.contains('hidden');
    this.book.classList.toggle('hidden', !open);
    this.root.classList.toggle('booking', open);
  }

  /** Lanternada: sem alvo no alcance, seleciona a criatura mais próxima (para o jogador saber aonde ir) */
  attack() {
    const g = this.game, C = g.combat;
    if (!C.target && !this.foeInReach()) {
      const m = this.nearestFoe();
      if (!m) {
        this.ui.error('Nenhuma criatura por perto.');
        return;
      }
      g.interaction.setTarget(m.inter);
    }
    this.ui.useSlot(this.byId.attack);
  }
  /** o que a Lanternada já pegaria sozinha (alcance do golpe, à frente) */
  foeInReach() {
    const g = this.game, C = g.combat, p = g.player, fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    return C.mobs.some((m) => {
      if (!m.targetable || !C.inReach(m, 1.5)) return false;
      const dx = m.pos.x - p.pos.x, dz = m.pos.z - p.pos.z, d = Math.hypot(dx, dz);
      return d <= 0.1 || (dx * fx + dz * fz) / d >= 0.3;
    });
  }
  nearestFoe() {
    const g = this.game, p = g.player, fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    let best = null, bs = Infinity;
    for (const m of g.combat.mobs) {
      if (!m.targetable || !m.inter.enabled()) continue;
      const dx = m.pos.x - p.pos.x, dz = m.pos.z - p.pos.z, d = Math.hypot(dx, dz);
      if (d > AUTO_RANGE || Math.abs(m.pos.y - p.pos.y) > 6) continue;
      const front = d < 0.1 || (dx * fx + dz * fz) / d > 0.3;
      const score = d * (front ? 1 : 1.7);
      if (score < bs) {
        bs = score;
        best = m;
      }
    }
    return best;
  }

  /** a cada quadro: resfriamento e "ativo"; de tempos em tempos: arco de habilidades e botão contextual */
  update(dt) {
    const ui = this.ui;
    for (const v of this.views) {
      const s = v.slot;
      if (!s) continue;
      const cool = s.cdLeft > 0 && s.cd >= 0.75;
      v.el.classList.toggle('cooling', cool);
      if (cool) v.el.querySelector('.cd').style.background = `conic-gradient(rgba(0,0,0,0.7) ${(s.cdLeft / s.cd) * 360}deg, transparent 0)`;
      v.el.classList.toggle('locked', !!s.locked?.());
      v.el.classList.toggle('active', ui.slotActive(s));
    }
    // toque longo num botão de habilidade ou num item: mostra a descrição
    for (const h of this.held.values()) {
      if (h.shown || !h.hold || this.game.time - h.t0 < HOLD_T) continue;
      const r = h.hold();
      if (!r) continue;
      h.shown = true;
      ui.showTooltip('tslot', typeof r === 'string' ? r : ui.slotTooltip(r));
    }
    // rastreador expandido cobre a área do polegar esquerdo: recolhe quando o joystick anda
    if (!ui.trackerCollapsed && this.game.input.move.m > 0.3) ui.setTrackerCollapsed(true);
    this._t -= dt;
    if (this._t > 0) return;
    this._t = 0.2;
    this.refreshArc();
    this.refreshContext();
  }

  refreshArc() {
    const g = this.game, dark = g.dayNight.night > 0.5 || !!g.indoors?.active;
    const ids = (dark ? ARC_DARK : ARC).filter((id) => this.byId[id] && !this.byId[id].locked?.()).slice(0, 3);
    if (ids.join() === this.arcIds.join()) return;
    this.arcIds = ids;
    this.arc.forEach((v, i) => {
      const s = this.byId[ids[i]] ?? null;
      v.slot = s;
      v.el.classList.toggle('hidden', !s);
      if (s) {
        v.el.querySelector('img').src = icon(s.icon);
        v.el.setAttribute('aria-label', s.name);
      }
    });
  }

  /**
   * Falar / Pegar / Usar: o alvo selecionado (se estiver ao alcance) ou o mais perto; criatura não conta.
   * O verbo vem do objeto (`verb`, texto ou função: Sentar, Abrir, Entrar...) ou do cursor dele
   */
  refreshContext() {
    const g = this.game, it = g.interaction;
    const ok = (x) => x && x.kind !== 'mob' && x.enabled() && it.distTo(x) <= x.range && Math.abs(g.player.pos.y - x.pos.y) <= (x.vRange ?? 4.5);
    let t = ok(it.target) ? it.target : null;
    if (!t) {
      let bd = Infinity;
      for (const x of it.list) {
        if (!ok(x)) continue;
        const d = it.distTo(x);
        if (d < bd) {
          bd = d;
          t = x;
        }
      }
    }
    this.ctxTarget = t;
    this.ctx.classList.toggle('hidden', !t || g.player.mounted && t.kind !== 'npc');
    if (!t) return;
    const label = (typeof t.verb === 'function' ? t.verb() : t.verb) ?? CTX_LABEL[t.cursor] ?? 'Usar';
    if (label !== this._ctxLabel) {
      this._ctxLabel = label;
      this.ctxLabel.textContent = label;
      this.ctxImg.src = cursorURL(CTX_LABEL[t.cursor] ? t.cursor : 'use');
    }
    this.ctx.setAttribute('aria-label', `${label}: ${t.name}`);
  }
}
