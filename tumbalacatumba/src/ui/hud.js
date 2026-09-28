import * as THREE from 'three';
import { icon, cursorURL, coinsHTML, markerSVG } from './icons.js';
import { Minimap, WorldMap, paintWorldMap } from './minimap.js';
import { Portraits } from './portrait.js';
import { Dialog, QuestLog, Bags, Menu, esc } from './windows.js';
import { CombatHud } from './combatHud.js';
import { ITEMS, QUALITY_COLORS, ZONE_FLAVOR } from '../quests/data.js';
import { createPlayerModel } from '../entities/models.js';
import * as NM from '../entities/npcModels.js';
import * as CM from '../entities/creatureModels.js';
import { ZONE_NAME, QUEST_AREAS, ZONE_LEVELS } from '../world/layout.js';
import { Progress } from '../quests/progress.js';
import { clamp } from '../util/math.js';

const GRAD = `<defs><linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4d88a"/><stop offset=".45" stop-color="#b88a38"/><stop offset="1" stop-color="#4a3210"/></linearGradient></defs>`;
const GARGOYLE = `<svg viewBox="0 0 104 108">${GRAD}
<path d="M58 64 C44 30 26 14 4 16 C14 24 12 32 6 40 C16 42 18 50 12 58 C22 58 28 64 26 72 C36 68 46 70 52 80 Z" fill="url(#gb)" stroke="#1a1006" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M22 30 C32 34 40 44 46 56 M14 46 C26 48 34 56 40 66" fill="none" stroke="#5a3e14" stroke-width="2"/>
<path d="M60 106 C50 90 52 72 62 62 C66 52 64 42 70 36 L73 20 L81 32 C86 30 90 30 94 32 L101 19 L103 36 C107 44 105 54 97 60 C101 72 101 92 95 106 Z" fill="url(#gb)" stroke="#1a1006" stroke-width="2.5" stroke-linejoin="round"/>
<circle cx="82" cy="45" r="4.2" fill="#ffe14a" stroke="#1a1006" stroke-width="1.5"/><circle cx="95" cy="45" r="4.2" fill="#ffe14a" stroke="#1a1006" stroke-width="1.5"/>
<path d="M82 42.5 v5 M95 42.5 v5" stroke="#1a1006" stroke-width="1.6"/>
<path d="M84 54 q4.5 3 9 0" fill="none" stroke="#1a1006" stroke-width="1.8" stroke-linecap="round"/>
<path d="M62 102 C40 108 28 94 36 84 C42 76 54 82 48 90 C45 94 40 91 42 88" fill="none" stroke="#1a1006" stroke-width="7" stroke-linecap="round"/>
<path d="M62 102 C40 108 28 94 36 84 C42 76 54 82 48 90 C45 94 40 91 42 88" fill="none" stroke="url(#gb)" stroke-width="4" stroke-linecap="round"/></svg>`;
const WING = `<svg viewBox="0 0 56 44">${GRAD}<path d="M54 40 C44 18 28 6 2 4 C10 10 9 16 4 22 C12 22 15 27 11 33 C19 32 24 36 23 42 C32 37 42 38 54 40 Z" fill="url(#gb)" stroke="#1a1006" stroke-width="2" stroke-linejoin="round"/></svg>`;
function ringSVG() {
  let studs = '';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    studs += `<circle cx="${110 + Math.cos(a) * 101}" cy="${110 + Math.sin(a) * 101}" r="3.2" fill="#fff0b0" stroke="#3a2408" stroke-width="1.2"/>`;
  }
  return `<svg class="ring" viewBox="0 0 220 220"><defs><linearGradient id="rgl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe4a0"/><stop offset=".35" stop-color="#c8963c"/><stop offset=".7" stop-color="#6a4818"/><stop offset="1" stop-color="#e0b860"/></linearGradient></defs>
  <circle cx="110" cy="110" r="101" fill="none" stroke="#120a02" stroke-width="17"/>
  <circle cx="110" cy="110" r="101" fill="none" stroke="url(#rgl)" stroke-width="12"/>
  <circle cx="110" cy="110" r="94.5" fill="none" stroke="#1a1006" stroke-width="2"/>${studs}
  <path d="M110 0 l9 12 h-18 z" fill="url(#rgl)" stroke="#1a1006" stroke-width="1.5"/>
  <text x="110" y="23" text-anchor="middle" font-family="Cinzel,serif" font-weight="700" font-size="12" fill="#1a1006">N</text></svg>`;
}

export class UI {
  constructor(game) {
    this.game = game;
    this.windows = [];
    this.bubbles = [];
    this.tips = {};
    this.lastZone = null;
    const root = (this.root = document.createElement('div'));
    root.id = 'hud';
    root.className = 'hidden';
    root.innerHTML = `
    <div class="anchor tl"><div class="frames">
      <div class="unit player">
        <div class="wing l">${WING}</div><div class="wing r">${WING}</div>
        <div class="portrait"><canvas></canvas></div><div class="ring"></div>
        <div class="bars"><div class="name">Vicente</div><div class="bar hp"><i></i><span></span></div><div class="bar mp"><i></i><span></span></div></div>
        <div class="level">1</div>
      </div>
      <div class="unit target hidden">
        <div class="portrait"><canvas></canvas></div><div class="ring"></div>
        <div class="bars"><div class="name"></div><div class="sub"></div><div class="bar hp"><i></i><span></span></div></div>
        <div class="level"></div>
      </div>
    </div></div>
    <div id="fps" class="hidden"></div>
    <div class="anchor tr">
      <div id="minimap"><div class="zone"></div><div class="body pe"><canvas></canvas></div>${ringSVG()}
        <div class="dial"><canvas></canvas></div>
        <button class="btn zin pe" title="Aproximar">+</button><button class="btn zout pe" title="Afastar">−</button><button class="btn map pe" title="Mapa (M)">M</button>
        <div class="clock"></div></div>
      <div id="tracker" class="pe"><div class="head"><span>Missões</span><span class="tog">[−]</span></div><div class="list"></div></div>
    </div>
    <div class="anchor bl"><div id="chat" class="pe"><div class="tabs"><span class="on">Geral</span></div><div class="log"></div><input class="hidden" maxlength="140" spellcheck="false" placeholder="Diga algo... (/ajuda para comandos)"></div></div>
    <div class="anchor bc"><div id="bottom"><div class="gargoyle l">${GARGOYLE}</div><div class="bar-frame pe"></div><div class="gargoyle r">${GARGOYLE}</div>
      <div class="xp pe"><i></i><div class="ticks"></div><span></span></div></div></div>
    <div class="anchor br"><div id="micro" class="pe"><div class="money"></div></div></div>
    <div id="castbar" class="hidden"><img class="ico"><i></i><span></span></div>
    <div id="errors"></div>
    <div id="zonetext"><div class="z1"></div><div class="z2"></div></div>
    <div id="bigtext"></div>
    <div id="overlay"></div>
    <div id="tooltip" class="hidden"></div>`;
    document.body.appendChild(root);
    this.q = (s) => root.querySelector(s);
    this.overlay = this.q('#overlay');
    this.tooltip = this.q('#tooltip');
    this.errors = this.q('#errors');

    // cursores
    const st = document.documentElement.style;
    for (const k of ['default', 'talk', 'loot', 'use', 'attack']) st.setProperty(`--cur-${k}`, `url(${cursorURL(k)}) ${k === 'default' ? '1 1' : k === 'attack' ? '2 2' : '8 8'}`);
    document.body.classList.add('cur-default');

    // mapa pintado, minimapa, retratos
    game.worldMapCanvas = paintWorldMap(game.world, game.populated);
    this.minimap = new Minimap(game, this.q('#minimap'));
    this.q('#minimap .map').onclick = () => this.toggleMap();
    this.portraits = new Portraits();
    this.portraits.bind('player', this.q('.unit.player canvas'));
    this.portraits.bind('target', this.q('.unit.target canvas'));
    this.playerPortraitRig = createPlayerModel();
    this.portraits.setRig('player', this.playerPortraitRig);
    this.portraitCache = new Map();

    // janelas
    this.dialog = new Dialog(game, this);
    game.dialog = this.dialog;
    this.qlog = new QuestLog(game, this);
    this.bags = new Bags(game, this);
    this.menu = new Menu(game, this);
    this.mapWin = this.makeWin('worldmap', 'frame-dark', `<div class="wtitle">Mapa — Vale Tumbalacatumba</div><button class="close">×</button><div class="inner"><canvas></canvas><div class="legend"><span><b>!</b> Missão disponível</span><span><b>?</b> Pronta para entregar</span><span><b style="color:#bdbdbd">?</b> Em andamento</span><span><b style="color:#ffd100">◯</b> Área do objetivo</span></div></div><div class="coords"></div>`);
    this.mapWin.querySelector('.close').onclick = () => this.toggleMap(false);
    this.worldMap = new WorldMap(game, this.mapWin);
    this.tut = this.makeWin('tutorial', 'frame-dark', `<div class="inner"><div class="txt"></div><div class="foot"><button class="wbtn small">Entendi</button></div></div>`);
    this.tut.querySelector('button').onclick = () => this.nextTip(true);

    this.buildActionBar();
    this.buildMicro();
    this.buildChat();
    this.combatHud = new CombatHud(game, this);
    this.q('#tracker .tog').onclick = () => {
      this.trackerCollapsed = !this.trackerCollapsed;
      this.q('#tracker .tog').textContent = this.trackerCollapsed ? '[+]' : '[−]';
      this.renderTracker();
    };
    this.q('#tracker .list').addEventListener('click', (e) => {
      const q = e.target.closest('.q');
      if (q) this.qlog.toggle(true, q.dataset.id);
    });

    // eventos do progresso
    game.progress.on((type, d) => this.onProgress(type, d));
    window.addEventListener('resize', () => this.applyScale());
    this.applyScale();
    this.renderTracker();
    this.renderPlayer();
  }

  // ------------------------------------------------------------ utilidades
  makeWin(id, cls, html) {
    const e = document.createElement('div');
    e.id = id;
    e.className = `win hidden ${cls}`;
    e.innerHTML = html;
    this.root.appendChild(e);
    this.windows.push(e);
    return e;
  }
  showWin(e) {
    e.classList.remove('hidden');
    this.windows.splice(this.windows.indexOf(e), 1);
    this.windows.push(e);
    e.style.zIndex = 20 + this.windows.length;
  }
  hideWin(e) {
    e.classList.add('hidden');
  }
  anyWindowOpen() {
    return this.windows.some((w) => !w.classList.contains('hidden') && w.id !== 'tutorial');
  }
  /** a interface está capturando o mouse/teclado? */
  blocking() {
    return this.chatOpen || this.game.state !== 'play';
  }
  applyScale() {
    const s = clamp(window.innerHeight / 960, 0.72, 1.15) * (this.game.settings.uiScale ?? 1);
    this.scale = s;
    this.root.style.setProperty('--s', s.toFixed(3));
    for (const id of ['quest', 'qlog', 'bags', 'menu', 'options', 'tutorial']) {
      const w = this.q('#' + id);
      if (w) w.style.transform = `scale(${s})`;
    }
    this.worldMap.resize();
  }
  levelColor(lv) {
    const d = lv - this.game.progress.level;
    return d >= 3 ? '#ff8040' : d >= -2 ? '#ffd100' : d >= -4 ? '#40c040' : '#9d9d9d';
  }
  setCursor(kind) {
    if (this._cur === kind) return;
    document.body.classList.remove('cur-' + this._cur);
    this._cur = kind;
    document.body.classList.add('cur-' + kind);
  }

  // ------------------------------------------------------------ barra de ações
  buildActionBar() {
    const g = this.game, P = g.progress;
    this.slots = [
      { key: '1', code: 'Digit1', id: 'boo', name: 'Buu!', icon: 'boo', cd: 2.5, desc: 'Solta um "BUU!" apavorante. Espanta corvos num raio de 10 metros e faz as criaturas por perto fugirem de medo por 2,5 s.' },
      { key: '2', code: 'Digit2', id: 'dance', name: 'Dança Macabra', icon: 'dance', cd: 0.6, desc: 'Dança como se ninguém estivesse olhando. Todo mundo está olhando.' },
      { key: '3', code: 'Digit3', id: 'lantern', name: 'Lanterna', icon: 'lantern', cd: 0.4, desc: 'Acende ou apaga sua lanterna. Muito útil à noite.' },
      { key: '4', code: 'Digit4', id: 'pet', name: 'Belzebuzinho', icon: 'chick', cd: 2, desc: 'Chama ou dispensa seu filhote de avestruz demônio.', locked: () => !P.hasItem('belzebu') },
      { key: '5', code: 'Digit5', id: 'mount', name: 'Vassoura Velha', icon: 'broom', cd: 1, desc: 'Monta na vassoura (+65% de velocidade). Conjuração de 1,5 s.', locked: () => !P.hasItem('vassoura') },
      { key: '6', code: 'Digit6', id: 'hearth', name: 'Lápide de Regresso', icon: 'hearth', cd: 45, desc: 'Leva você de volta à Praça do Relógio Torto. Conjuração de 4 s.' },
      {
        key: '7', code: 'Digit7', id: 'attack', name: 'Lanternada', icon: 'lanternada', cd: 1, selfCd: true,
        desc: () => {
          const s = g.combat.st;
          return `Gira a lanterna num arco à sua frente: ${s.min}–${s.max} de dano no alvo e 60% em até mais duas criaturas grudadas nele. Liga o ataque automático. Um golpe a cada ${s.swing.toFixed(2).replace('.', ',')} s. Fica mais forte a cada nível.`;
        },
      },
    ];
    for (let i = 8; i <= 12; i++) this.slots.push({ key: i <= 9 ? String(i) : i === 10 ? '0' : i === 11 ? '-' : '=', empty: true });
    const bar = this.q('#bottom .bar-frame');
    for (const s of this.slots) {
      const e = document.createElement('div');
      e.className = 'slot';
      e.innerHTML = `${s.empty ? '' : `<img src="${icon(s.icon)}">`}<div class="cd"></div><span class="key">${s.key}</span>`;
      bar.appendChild(e);
      s.el = e;
      s.cdLeft = 0;
      if (s.empty) continue;
      e.onclick = () => this.useSlot(s);
      e.onmousemove = (ev) => {
        const lk = s.locked?.();
        const desc = typeof s.desc === 'function' ? s.desc() : s.desc;
        this.showTooltip('slot', `<div class="tt-name" style="color:#fff">${esc(s.name)}</div>${lk ? '<div class="tt-far">Ainda não aprendido</div>' : ''}<div class="tt-flavor" style="color:#ffd100">${esc(desc)}</div>${s.cd >= 2 ? `<div class="tt-sub">Recarga: ${s.cd} s</div>` : ''}`, ev.clientX, ev.clientY);
      };
      e.onmouseleave = () => this.hideTooltip('slot');
    }
  }
  useSlot(s) {
    if (s.empty) return;
    if (s.locked?.()) {
      this.error('Você ainda não tem isso.');
      return;
    }
    if (s.cdLeft > 0 && !s.selfCd) {
      this.error('Ainda não está pronto.');
      return;
    }
    const ok = this.game.abilities.use(s.id);
    if (ok !== false) {
      if (!s.selfCd) s.cdLeft = s.cd;
      s.el.classList.add('press');
      setTimeout(() => s.el.classList.remove('press'), 120);
    }
  }
  updateActionBar(dt) {
    const g = this.game;
    for (const s of this.slots) {
      if (s.empty) continue;
      if (s.cdLeft > 0) s.cdLeft = Math.max(0, s.cdLeft - dt);
      const cool = s.cdLeft > 0 && s.cd >= 0.75;
      s.el.classList.toggle('cooling', cool);
      if (cool) s.el.querySelector('.cd').style.background = `conic-gradient(rgba(0,0,0,0.7) ${(s.cdLeft / s.cd) * 360}deg, transparent 0)`;
      s.el.classList.toggle('locked', !!s.locked?.());
      const active = (s.id === 'lantern' && g.player.lanternOn) || (s.id === 'dance' && g.player.action === 'dance') || (s.id === 'pet' && g.questWorld.pet.active) || (s.id === 'mount' && g.player.mounted) || (s.id === 'attack' && g.combat.autoAttack);
      s.el.classList.toggle('active', active);
    }
  }

  // ------------------------------------------------------------ micromenu
  buildMicro() {
    const m = this.q('#micro');
    const btns = [
      ['questlog', 'Diário de Missões (L)', () => this.qlog.toggle()],
      ['map', 'Mapa (M)', () => this.toggleMap()],
      ['help', 'Controles', () => this.menu.showOptions('keys')],
      ['menu', 'Menu do Jogo (Esc)', () => this.menu.toggle()],
    ];
    for (const [ic, tip, fn] of btns) {
      const b = document.createElement('button');
      b.style.backgroundImage = `url(${icon(ic)})`;
      b.onclick = () => {
        this.game.audio?.sfx('click');
        fn();
      };
      b.onmousemove = (e) => this.showTooltip('micro', `<div class="tt-name" style="color:#fff">${tip}</div>`, e.clientX, e.clientY);
      b.onmouseleave = () => this.hideTooltip('micro');
      m.appendChild(b);
    }
    const bag = document.createElement('button');
    bag.className = 'bag';
    bag.style.backgroundImage = `url(${icon('bag')})`;
    bag.onclick = () => this.bags.toggle();
    bag.onmousemove = (e) => this.showTooltip('micro', `<div class="tt-name" style="color:#fff">Mochila de Caixão (B)</div>`, e.clientX, e.clientY);
    bag.onmouseleave = () => this.hideTooltip('micro');
    m.appendChild(bag);
  }

  // ------------------------------------------------------------ chat
  buildChat() {
    this.chatLog = this.q('#chat .log');
    this.chatInput = this.q('#chat input');
    this.chatOpen = false;
    this.chatInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const t = this.chatInput.value.trim();
        this.closeChat();
        if (t) this.game.abilities.chat(t);
      } else if (e.key === 'Escape') this.closeChat();
    });
    this.chatInput.addEventListener('blur', () => setTimeout(() => this.closeChat(), 50));
    this.chat('Bem-vindo ao Vale Tumbalacatumba!', 'system');
    this.chat('Dica: segure o botão direito do mouse e use W A S D para andar. Enter abre o chat.', 'system');
  }
  openChat() {
    this.chatOpen = true;
    this.chatInput.classList.remove('hidden');
    this.chatInput.value = '';
    this.chatInput.focus();
    for (const d of this.chatLog.children) d.classList.remove('fade');
  }
  closeChat() {
    if (!this.chatOpen) return;
    this.chatOpen = false;
    this.chatInput.classList.add('hidden');
    this.chatInput.blur();
  }
  chat(html, type = 'system', raw = false) {
    const d = document.createElement('div');
    d.className = type;
    d.innerHTML = raw ? html : esc(html);
    this.chatLog.appendChild(d);
    while (this.chatLog.children.length > 60) this.chatLog.firstChild.remove();
    setTimeout(() => {
      if (!this.chatOpen) d.classList.add('fade');
    }, 26000);
  }

  // ------------------------------------------------------------ mensagens
  error(t) {
    this.flashMsg(t, 'err');
    this.game.audio?.sfx('error');
  }
  info(t) {
    this.flashMsg(t, 'inf');
  }
  flashMsg(t, cls) {
    const last = this.errors.lastChild;
    if (last && last.textContent === t && !last.classList.contains('fade')) {
      clearTimeout(last._t);
      last._t = setTimeout(() => this.fadeMsg(last), 2600);
      return;
    }
    const d = document.createElement('div');
    d.className = cls;
    d.textContent = t;
    this.errors.appendChild(d);
    while (this.errors.children.length > 4) this.errors.firstChild.remove();
    d._t = setTimeout(() => this.fadeMsg(d), 2800);
  }
  fadeMsg(d) {
    d.classList.add('fade');
    setTimeout(() => d.remove(), 900);
  }
  big(html, cls = '') {
    const b = this.q('#bigtext');
    b.innerHTML = '';
    const d = document.createElement('div');
    d.className = cls;
    d.innerHTML = html;
    b.appendChild(d);
  }
  zoneText(name, sub) {
    const z = this.q('#zonetext');
    z.querySelector('.z1').textContent = name;
    z.querySelector('.z2').textContent = sub ?? '';
    z.classList.add('on');
    clearTimeout(this._zt);
    this._zt = setTimeout(() => z.classList.remove('on'), 3800);
  }
  floaty(text, cls, worldPos) {
    const d = document.createElement('div');
    d.className = 'floaty ' + (cls ?? '');
    d.textContent = text;
    const p = this.project(worldPos ?? _v.copy(this.game.player.pos).add(_up.set(0, 2.3, 0)));
    if (!p) return;
    d.style.left = p.x + 'px';
    d.style.top = p.y + 'px';
    this.overlay.appendChild(d);
    setTimeout(() => d.remove(), 1700);
  }

  // ------------------------------------------------------------ tooltip
  showTooltip(owner, html, x, y) {
    this.ttOwner = owner;
    const t = this.tooltip;
    t.innerHTML = html;
    t.classList.remove('hidden');
    if (x !== undefined) {
      t.classList.add('follow');
      const w = t.offsetWidth, h = t.offsetHeight;
      t.style.left = Math.min(window.innerWidth - w - 8, x + 16) + 'px';
      t.style.top = Math.max(8, Math.min(window.innerHeight - h - 8, y - h - 10)) + 'px';
    } else {
      t.classList.remove('follow');
      t.style.left = t.style.top = '';
      t.style.transform = `scale(${this.scale})`;
    }
  }
  hideTooltip(owner) {
    if (owner && this.ttOwner !== owner) return;
    this.tooltip.classList.add('hidden');
    this.ttOwner = null;
  }
  tooltipFor(it) {
    if (!it) return this.hideTooltip('world');
    if (it.kind === 'mob') {
      const m = it.mob;
      let h = `<div class="tt-name" style="color:${it.reaction === 'hostile' ? '#ff4030' : '#ffd100'}">${esc(it.name)}</div>`;
      h += `<div class="tt-lvl"><span style="color:${this.levelColor(m.level)}">Nível ${m.level}</span> ${esc(it.family)}</div>`;
      h += `<div class="tt-sub">${it.reaction === 'hostile' ? 'Hostil: ataca quem chega perto' : 'Neutro: só briga se provocado'}</div>`;
      if (m.hp < m.maxHp) h += `<div class="tt-sub">Vida: ${Math.ceil(m.hp)} / ${m.maxHp}</div>`;
      if (it.hint) h += `<div class="tt-hint">${esc(it.hint)}</div>`;
      if (this.game.interaction.distTo(it) > it.range) h += `<div class="tt-far">Longe demais</div>`;
      return this.showTooltip('world', h);
    }
    const reactColor = it.kind === 'item' ? '#ffffff' : it.reaction === 'friendly' ? '#3cff3c' : '#ffd100';
    let h = `<div class="tt-name" style="color:${reactColor}">${esc(it.name)}</div>`;
    if (it.subtitle) h += `<div class="tt-sub">&lt;${esc(it.subtitle)}&gt;</div>`;
    if (it.level) h += `<div class="tt-lvl">Nível ${it.level}</div>`;
    const P = this.game.progress;
    if (it.npc) {
      const mk = P.markerFor(it.npc.id);
      if (mk === 'avail') h += `<div class="tt-flavor">Tem uma missão para você!</div>`;
      if (mk === 'ready') h += `<div class="tt-flavor">Missão pronta para entregar.</div>`;
    }
    if (it.kind === 'item') {
      for (const q of P.activeQuests()) {
        const o = q.objectives.find((x) => x.key === it.pickupKey);
        if (o) h += `<div class="tt-flavor">${esc(q.title)}</div>`;
      }
    }
    if (it.hint) h += `<div class="tt-hint">${esc(it.hint)}</div>`;
    if (this.game.interaction.distTo(it) > it.range) h += `<div class="tt-far">Longe demais</div>`;
    this.showTooltip('world', h);
  }
  itemTooltip(id, x, y, inBag = false) {
    const it = ITEMS[id];
    let h = `<div class="tt-name" style="color:${QUALITY_COLORS[it.quality]}">${esc(it.name)}</div>`;
    if (it.quality === 'quest') h += '<div class="tt-sub">Item de missão</div>';
    if (it.desc) h += `<div class="tt-desc">${esc(it.desc)}</div>`;
    if (it.flavor) h += `<div class="tt-flavor">"${esc(it.flavor)}"</div>`;
    if (inBag && it.use) h += `<div class="tt-hint">Clique para usar</div>`;
    this.showTooltip('item', h, x, y);
  }

  // ------------------------------------------------------------ alvo e jogador
  setTarget(it) {
    const tf = this.q('.unit.target');
    this.target = it;
    if (!it) {
      tf.classList.add('hidden');
      this.portraits.setRig('target', null);
      return;
    }
    tf.classList.remove('hidden');
    tf.classList.remove('friendly', 'neutral', 'hostile', 'item');
    tf.classList.add(it.kind === 'item' ? 'item' : it.reaction);
    tf.querySelector('.name').textContent = it.name;
    tf.querySelector('.sub').textContent = it.subtitle ? `<${it.subtitle}>` : '';
    tf.querySelector('.level').textContent = it.level ?? '';
    tf.querySelector('.bar.hp span').textContent = '100%';
    this.portraits.setRig('target', this.portraitFor(it));
    this.game.audio?.sfx('target');
  }
  portraitFor(it) {
    const key = it.npc?.id ?? it.name;
    if (this.portraitCache.has(key)) return this.portraitCache.get(key);
    const F = {
      prefeito: NM.createMayor, aranhilda: NM.createAranhilda, juvenal: NM.createSkeleton, tonico: NM.createGravedigger, custodio: NM.createFarmer,
      zepalha: NM.createScarecrow, conde: NM.createVampire, zumbi: NM.createZombie, vesga: NM.createWitch, suspiro: () => NM.createGhost('Suspiro'), nevoa: () => NM.createGhost('Lady Névoa', { lady: true }),
      'Sr. Bigodes': CM.createCat, 'Abóbora Fujona': () => CM.createRebelPumpkin(1), 'Sapo Sorridente': () => CM.createFrog(true), 'Ovo do Capeta': CM.createEgg, Belzebuzinho: CM.createChick,
    };
    const f = F[key] ?? it.portrait;
    const rig = f ? f() : null;
    if (rig && key === 'juvenal') rig.setComplete(this.game.progress.status('ossos') === 'done');
    if (rig && key === 'conde') rig.fangs.visible = this.game.progress.status('dentadura') === 'done';
    if (rig && key === 'prefeito') rig.mood = this.game.questWorld.npcs.prefeito.rig.mood;
    this.portraitCache.set(key, rig);
    return rig;
  }
  renderPlayer() {
    const P = this.game.progress;
    const pf = this.q('.unit.player');
    pf.querySelector('.level').textContent = P.level;
    const xp = this.q('#bottom .xp');
    xp.querySelector('i').style.width = `${Math.min(1, P.xp / P.xpNeeded) * 100}%`;
    xp.querySelector('span').textContent = `XP: ${P.xp} / ${P.xpNeeded}`;
    this.q('#micro .money').innerHTML = coinsHTML(P.money);
    this.playerPortraitRig.hat.visible = !!P.flags.hat;
  }

  // ------------------------------------------------------------ rastreador
  renderTracker(flashId) {
    const P = this.game.progress;
    const list = this.q('#tracker .list');
    let qs = P.activeQuests().filter((q) => P.tracked.has(q.id));
    if (!qs.length) qs = P.activeQuests();
    this.q('#tracker').style.display = qs.length ? '' : 'none';
    if (this.trackerCollapsed) {
      list.innerHTML = '';
      return;
    }
    let h = '';
    for (const q of qs.slice(0, 7)) {
      const st = P.status(q.id);
      h += `<div class="q ${q.id === flashId ? 'flash' : ''}" data-id="${q.id}"><div class="t"><span class="lv">[${q.level}]</span> ${esc(q.title)}</div>`;
      if (st === 'complete') {
        const n = this.game.questWorld.npcs[q.turnIn];
        h += `<div class="o ready">- Volte para ${esc(n.info.name)}</div>`;
      } else if (q.startItem) {
        const n = this.game.questWorld.npcs[q.turnIn];
        h += `<div class="o">- Entregue a ${esc(n.info.name)}</div>`;
      } else {
        for (const o of q.objectives) {
          const c = P.count(q.id, o.key);
          h += `<div class="o ${c >= o.need ? 'done' : ''}">- ${esc(o.label)}: ${c}/${o.need}</div>`;
        }
        if (q.night && !this.game.dayNight.isNight) h += `<div class="o night">(aparecem só à noite)</div>`;
      }
      h += '</div>';
    }
    list.innerHTML = h;
  }

  // ------------------------------------------------------------ eventos
  onProgress(type, d) {
    const g = this.game;
    if (type === 'accept') {
      this.chat(`Missão aceita: ${d.title}`, 'system');
      this.info(`Missão aceita: ${d.title}`);
      g.audio?.sfx('accept');
      this.renderTracker(d.id);
      this.onTutorialEvent('accept');
    } else if (type === 'progress') {
      const { q, o, count } = d;
      this.info(`${o.label}: ${count}/${o.need}`);
      g.audio?.sfx('progress');
      this.renderTracker(q.id);
      if (!this.qlog.el.classList.contains('hidden')) this.qlog.render();
    } else if (type === 'ready') {
      this.info(`${d.title} (Completa)`);
      this.chat(`${d.title} completa.`, 'system');
      g.audio?.sfx('ready');
      this.renderTracker(d.id);
    } else if (type === 'turnin') {
      this.big(`Missão Concluída<small>${esc(d.title)}</small>`);
      this.chat(`${d.title} concluída.`, 'system');
      g.audio?.sfx('complete');
      this.renderTracker();
    } else if (type === 'xp') {
      this.chat(`Você ganhou ${d} de experiência.`, 'xp');
      this.floaty(`+${d} XP`, 'xp');
      this.renderPlayer();
    } else if (type === 'levelup') {
      this.big(`Nível ${d}!<small>Parabéns, você alcançou o nível ${d}!</small>`, 'lvl');
      this.chat(`Parabéns, você alcançou o nível ${d}!`, 'system');
      g.audio?.sfx('levelup');
      g.fx?.levelUp(g.player.pos);
      this.renderPlayer();
    } else if (type === 'money') {
      this.chat(`Você recebeu ${coinsHTML(d)}.`, 'money', true);
      this.renderPlayer();
    } else if (type === 'item') {
      if (!d.silent) {
        const it = d.def;
        this.chat(`Você recebeu o item: <span class="item" style="color:${QUALITY_COLORS[it.quality]}">[${esc(it.name)}]</span>.`, 'loot', true);
      }
      if (d.id === 'chapeu') {
        g.progress.setFlag('hat', true);
        g.player.setHat(true);
        this.info('Você colocou o Chapéu de Abóbora Oficial!');
      }
      if (this.bags.open) this.bags.render();
      this.renderPlayer();
    } else if (type === 'bag') {
      if (this.bags.open) this.bags.render();
    } else if (type === 'newquests') {
      this.chat(`Novas missões disponíveis: ${d.map((q) => q.title).join(', ')}.`, 'system');
    } else if (type === 'abandon') {
      this.chat(`Missão abandonada: ${d.title}`, 'system');
      this.renderTracker();
    }
  }

  useItem(id) {
    const g = this.game, it = ITEMS[id];
    if (!it?.use) return;
    if (it.use === 'hat') {
      const v = !g.progress.flags.hat;
      g.progress.setFlag('hat', v);
      g.player.setHat(v);
      this.renderPlayer();
    } else if (it.use === 'eat') {
      g.progress.removeItem(id);
      g.combat.heal(12);
      this.info('Você comeu o biscoito. Tinha gosto de... arrependimento.');
      g.audio?.sfx('eat');
    } else if (it.use === 'pet') g.abilities.use('pet');
    else if (it.use === 'mount') g.abilities.use('mount');
    else if (it.use === 'hearth') this.useSlot(this.slots.find((s) => s.id === 'hearth'));
  }

  toggleMap(v) {
    const open = !this.mapWin.classList.contains('hidden');
    v = v ?? !open;
    if (v) {
      this.worldMap.resize();
      this.showWin(this.mapWin);
      const s = this.worldMap.px;
      this.mapWin.style.marginLeft = `${-(s + 34) / 2}px`;
      this.mapWin.style.marginTop = `${-(s + 70) / 2}px`;
      this.game.audio?.sfx('map');
    } else this.hideWin(this.mapWin);
  }

  resetSave() {
    Progress.clearSave();
  }

  /** pop-up de confirmação estilo WoW (fica fora do #hud para funcionar também no título) */
  confirm(text, onYes, { yes = 'Sim', no = 'Não' } = {}) {
    let w = document.getElementById('popup');
    if (!w) {
      w = document.createElement('div');
      w.id = 'popup';
      w.className = 'frame-dark';
      w.innerHTML = '<p></p><div class="btns"><button class="wbtn small yes"></button><button class="wbtn small no"></button></div>';
      document.body.appendChild(w);
    }
    w.querySelector('p').textContent = text;
    const by = w.querySelector('.yes'), bn = w.querySelector('.no');
    by.textContent = yes;
    bn.textContent = no;
    w.style.display = 'block';
    this.popupOpen = true;
    const close = () => {
      w.style.display = 'none';
      this.popupOpen = false;
    };
    by.onclick = () => {
      close();
      this.game.audio?.sfx('click');
      onYes?.();
    };
    bn.onclick = () => {
      close();
      this.game.audio?.sfx('close');
    };
    this.game.audio?.sfx('open');
  }

  /** Esc: fecha o que estiver aberto, limpa o alvo ou abre o menu */
  escape() {
    if (this.popupOpen) return document.querySelector('#popup .no')?.click();
    if (this.chatOpen) return this.closeChat();
    if (this.casting) return this.cancelCast('Cancelado');
    for (let i = this.windows.length - 1; i >= 0; i--) {
      const w = this.windows[i];
      if (!w.classList.contains('hidden')) {
        if (w === this.dialog.el) this.dialog.close();
        else this.hideWin(w);
        this.hideTooltip();
        return;
      }
    }
    if (this.game.interaction.target) return this.game.interaction.setTarget(null);
    this.menu.toggle(true);
  }

  // ------------------------------------------------------------ conjuração
  cast(label, dur, { icon: ic, onDone, onCancel } = {}) {
    if (this.casting) this.cancelCast();
    const cb = this.q('#castbar');
    cb.classList.remove('hidden', 'fail', 'done');
    cb.querySelector('span').textContent = label;
    const img = cb.querySelector('.ico');
    img.style.display = ic ? '' : 'none';
    if (ic) img.src = icon(ic);
    this.casting = { t: 0, dur, onDone, onCancel, start: this.game.player.pos.clone() };
    this.game.audio?.sfx('castStart');
  }
  cancelCast(msg = 'Interrompido') {
    const c = this.casting;
    if (!c) return;
    this.casting = null;
    const cb = this.q('#castbar');
    cb.classList.add('fail');
    cb.querySelector('span').textContent = msg;
    setTimeout(() => cb.classList.add('hidden'), 700);
    c.onCancel?.();
    this.game.audio?.sfx('castFail');
  }
  updateCast(dt) {
    const c = this.casting;
    if (!c) return;
    const p = this.game.player;
    if (p.isMoving || !p.grounded || p.pos.distanceTo(c.start) > 0.3) {
      if (!p.seat) return this.cancelCast();
    }
    c.t += dt;
    const cb = this.q('#castbar');
    cb.querySelector('i').style.width = `${Math.min(100, (c.t / c.dur) * 100)}%`;
    if (c.t >= c.dur) {
      this.casting = null;
      cb.classList.add('done');
      setTimeout(() => cb.classList.add('hidden'), 400);
      c.onDone?.();
    }
  }

  // ------------------------------------------------------------ dormir até a noite
  sleepUntilNight() {
    const g = this.game;
    const fade = document.getElementById('fade');
    fade.classList.add('on');
    g.player.sitting = true;
    this.info('Você se encosta numa lápide e tira um cochilo...');
    setTimeout(() => {
      g.dayNight.setTime(20.2);
      setTimeout(() => {
        fade.classList.remove('on');
        g.player.sitting = false;
        this.big('A noite caiu...<small>Os vaga-lumes saíram para brincar no Bosque Retorcido.</small>');
        this.renderTracker();
      }, 700);
    }, 1000);
  }

  // ------------------------------------------------------------ balões e placas
  bubble(owner, text, dur = 4) {
    for (const b of this.bubbles) if (b.owner.rig === owner.rig) this.removeBubble(b, true);
    const el = document.createElement('div');
    el.className = 'bubble';
    el.textContent = text;
    this.overlay.appendChild(el);
    this.bubbles.push({ owner, el, t: dur });
  }
  removeBubble(b, now = false) {
    b.el.classList.add('fade');
    b.dead = true;
    setTimeout(() => b.el.remove(), now ? 0 : 400);
  }
  project(v) {
    _v.copy(v).project(this.game.camera);
    if (_v.z > 1 || _v.z < -1) return null;
    return { x: (_v.x * 0.5 + 0.5) * window.innerWidth, y: (-_v.y * 0.5 + 0.5) * window.innerHeight };
  }
  /** losango do objetivo rastreado, com distância (preso à borda da tela quando fora de vista) */
  updateWaypoint() {
    const g = this.game, P = g.progress;
    if (!this.wp) {
      this.wp = document.createElement('div');
      this.wp.className = 'waypoint';
      this.wp.innerHTML = '<div class="dia"></div><div class="dist"></div>';
      this.overlay.appendChild(this.wp);
    }
    const q = P.activeQuests().find((x) => P.tracked.has(x.id)) ?? P.activeQuests()[0];
    let target = null;
    if (q) {
      if (P.status(q.id) === 'complete' || q.startItem) {
        const n = g.questWorld.npcs[q.turnIn];
        target = { x: n.pos.x, y: n.pos.y + (n.rig.height ?? 2) + 1.2, z: n.pos.z };
      } else {
        const a = QUEST_AREAS[q.area] ?? (q.area === 'ovo' ? { x: -40, z: 115 } : null);
        if (a) target = { x: a.x, y: g.world.groundHeight(a.x, a.z) + 3, z: a.z };
      }
    }
    const p = g.player.pos;
    const d = target ? Math.hypot(target.x - p.x, target.z - p.z) : 0;
    if (!target || d < 14 || this.anyWindowOpen()) {
      this.wp.style.display = 'none';
      return;
    }
    const W = window.innerWidth, H = window.innerHeight;
    _v.set(target.x, target.y, target.z).project(g.camera);
    let x = (_v.x * 0.5 + 0.5) * W, y = (-_v.y * 0.5 + 0.5) * H;
    const behind = _v.z > 1;
    const m = 60;
    if (behind) {
      x = W - x;
      y = H - m;
    }
    const clamped = behind || x < m || x > W - m || y < m || y > H - m;
    x = clamp(x, m, W - m);
    y = clamp(y, m, H - m - 120);
    this.wp.style.display = '';
    this.wp.style.opacity = clamped ? '0.75' : '1';
    this.wp.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${this.scale})`;
    const txt = `${Math.round(d)} m`;
    if (this.wp._t !== txt) {
      this.wp._t = txt;
      this.wp.querySelector('.dist').textContent = txt;
    }
  }

  initNameplates() {
    this.plates = [];
    for (const npc of this.game.questWorld.npcList) {
      const el = document.createElement('div');
      el.className = 'np';
      el.innerHTML = `<div class="mk"></div><div class="nm"></div><div class="tl"></div>`;
      el.querySelector('.nm').textContent = npc.info.name;
      el.querySelector('.tl').textContent = `<${npc.info.title}>`;
      this.overlay.appendChild(el);
      this.plates.push({ npc, el, mk: el.querySelector('.mk'), last: '' });
    }
  }
  updateOverlay(dt) {
    const g = this.game, cam = g.camera, P = g.progress;
    const W = window.innerWidth, H = window.innerHeight;
    const tgt = g.interaction.target;
    for (const p of this.plates) {
      const n = p.npc;
      const d = cam.position.distanceTo(n.pos);
      const mk = P.markerFor(n.id);
      const showName = d < 34 || tgt?.npc === n;
      const show = (showName || (mk && d < 90)) && n.rig.root.visible;
      if (!show) {
        if (p.vis !== false) p.el.style.display = 'none';
        p.vis = false;
        continue;
      }
      const s = this.project(_v2.set(n.pos.x, n.pos.y + (n.rig.height ?? 2) + 0.25 + (n.rig.float ? 0.35 : 0), n.pos.z));
      if (!s || s.x < -100 || s.x > W + 100 || s.y < -100 || s.y > H + 100) {
        if (p.vis !== false) p.el.style.display = 'none';
        p.vis = false;
        continue;
      }
      if (p.vis !== true) p.el.style.display = '';
      p.vis = true;
      const key = `${mk}|${showName}|${tgt?.npc === n}`;
      if (key !== p.last) {
        p.last = key;
        p.mk.innerHTML = mk ? markerSVG(mk) : '';
        p.mk.className = 'mk' + (mk === 'wip' ? ' wip' : '');
        p.mk.style.display = mk ? '' : 'none';
        p.el.querySelector('.nm').style.display = showName ? '' : 'none';
        p.el.querySelector('.tl').style.display = showName ? '' : 'none';
        p.el.classList.toggle('sel', tgt?.npc === n);
      }
      const sc = clamp(16 / Math.max(d, 1), 0.55, 1.15);
      p.el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) translate(-50%, -100%) scale(${sc})`;
      p.el.style.zIndex = String(1000 - Math.round(d));
    }
    for (const b of this.bubbles) {
      if (b.dead) continue;
      b.t -= dt;
      if (b.t <= 0) {
        this.removeBubble(b);
        continue;
      }
      const o = b.owner;
      const h = (o.rig?.height ?? 1) + (o.rig?.float ? 0.45 : 0) + (o.yOff ?? 0) + (this.plates.some((pl) => pl.npc.rig === o.rig && pl.vis) ? 1.1 : 0.35);
      const pos = o.pos ?? o;
      const s = this.project(_v2.set(pos.x, pos.y + h, pos.z));
      const far = cam.position.distanceTo(pos) > 45;
      if (!s || far) {
        b.el.style.display = 'none';
        continue;
      }
      b.el.style.display = '';
      b.el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) translate(-50%, -100%)`;
    }
    this.bubbles = this.bubbles.filter((b) => !b.dead);
  }

  // ------------------------------------------------------------ tutorial
  startTutorial() {
    this.tipIndex = 0;
    this.tipSteps = [
      { text: 'Bem-vindo a <b>Tumbalacatumba</b>! Use <b>W A S D</b> para andar. Segure o <b>botão direito do mouse</b> e arraste para olhar ao redor — como no WoW.' },
      { text: 'Personagens com um <b>!</b> amarelo têm missões. O <b>Prefeito Abóbora</b> está logo ali na praça: clique nele com o <b>botão direito</b> para conversar.' },
      { text: 'Suas missões aparecem à direita e as áreas de objetivo ficam em <b>amarelo no minimapa</b>. Aperte <b>M</b> para o mapa e <b>L</b> para o diário.', on: 'accept' },
    ];
    this.showTip();
  }
  showTip() {
    const s = this.tipSteps?.[this.tipIndex];
    if (!s) return this.hideWin(this.tut);
    if (s.on && !this.tipFlags?.[s.on]) return this.hideWin(this.tut);
    this.tut.querySelector('.txt').innerHTML = s.text;
    this.showWin(this.tut);
    this.tut.style.transform = `scale(${this.scale})`;
  }
  nextTip(user) {
    this.tipIndex++;
    this.hideWin(this.tut);
    if (user) setTimeout(() => this.showTip(), 600);
  }
  onTutorialEvent(e) {
    this.tipFlags = this.tipFlags || {};
    this.tipFlags[e] = true;
    const s = this.tipSteps?.[this.tipIndex];
    if (s?.on === e) this.showTip();
  }

  // ------------------------------------------------------------ loop
  update(dt) {
    const g = this.game;
    if (g.state !== 'play') return;
    this.minimap.update(dt);
    if (!this.mapWin.classList.contains('hidden')) this.worldMap.draw();
    this.portraits.update(dt);
    this.updateActionBar(dt);
    this.updateCast(dt);
    this.updateOverlay(dt);
    this.combatHud.update(dt);
    this.updateWaypoint();
    this.dialog.update();
    this.q('#minimap .clock').textContent = g.dayNight.clockText();
    // zona
    const z = g.world.zoneAt(g.player.pos.x, g.player.pos.z);
    const zid = z?.id ?? 'wild';
    if (zid !== this.lastZone) {
      this.q('#minimap .zone').textContent = z?.name ?? ZONE_NAME;
      this.zoneSeen = this.zoneSeen || {};
      const now = g.time;
      if (this.lastZone !== null && z && !(now - (this.zoneSeen[z.id] ?? -999) < 45)) {
        const lv = ZONE_LEVELS[z.id];
        this.zoneText(z.name, (ZONE_FLAVOR[z.id] ?? '') + (lv ? ` · Criaturas de nível ${lv[0] === lv[1] ? lv[0] : `${lv[0]}–${lv[1]}`}` : ''));
        g.audio?.sfx('zone');
      }
      if (z) this.zoneSeen[z.id] = now;
      this.lastZone = zid;
    }
    // hora mudou de dia/noite → rastreador
    const night = g.dayNight.isNight;
    if (night !== this._night) {
      this._night = night;
      this.renderTracker();
    }
    if (g.settings.showFps) {
      this._fpsT = (this._fpsT ?? 0) - dt;
      if (this._fpsT < 0) {
        this._fpsT = 0.5;
        const f = this.q('#fps');
        f.classList.remove('hidden');
        f.textContent = `${Math.round(g.fps)} FPS · ${g.renderer.info.render.calls} draws`;
      }
    } else this.q('#fps').classList.add('hidden');
    const cour = Math.round(g.player.courage);
    if (cour !== this._cour) {
      this._cour = cour;
      const mp = this.q('.unit.player .bar.mp');
      mp.querySelector('i').style.width = cour + '%';
      mp.querySelector('span').textContent = `Coragem ${cour}%`;
    }
    // tooltip do alvo sob o mouse acompanha distância
    if (this.target) {
      const tf = this.q('.unit.target');
      tf.style.opacity = g.interaction.distTo(this.target) > this.target.range * 1.5 ? 0.7 : 1;
    }
  }

  show() {
    this.root.classList.remove('hidden');
    this.initNameplates();
  }
}

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _up = new THREE.Vector3();
