import * as THREE from 'three';
import { icon, cursorURL, coinsHTML, markerSVG } from './icons.js';
import { Minimap, WorldMap, paintWorldMap } from './minimap.js';
import { Portraits } from './portrait.js';
import { Dialog, QuestLog, Bags, Menu, esc } from './windows.js';
import { CombatHud } from './combatHud.js';
import { ITEMS, QUALITY_COLORS, ZONE_FLAVOR, XP_TABLE } from '../quests/data.js';
import { createPlayerModel } from '../entities/models.js';
import * as NM from '../entities/npcModels.js';
import * as CM from '../entities/creatureModels.js';
import { ZONE_NAME, QUEST_AREAS, ZONE_LEVELS } from '../world/layout.js';
import { Progress } from '../quests/progress.js';
import { clamp } from '../util/math.js';

const INK = '#16101d', BONE = '#efe6d2';

/** ponta da barra de ações: um caracol listrado (como o da Colina Espiral) saindo do chão, com uma lapidezinha */
function curlSVG() {
  const cx = 60, cy = 42, r0 = 25, turns = 1.75;
  const pts = [];
  // haste: sobe da base e chega na vertical ao ponto mais à esquerda do caracol
  for (let i = 0; i <= 14; i++) {
    const t = i / 14, u = 1 - t;
    pts.push([u * u * u * 24 + 3 * u * u * t * 24 + 3 * u * t * t * (cx - r0) + t * t * t * (cx - r0), u * u * u * 106 + 3 * u * u * t * 80 + 3 * u * t * t * 62 + t * t * t * cy]);
  }
  // espiral no sentido horário, fechando até quase o centro
  for (let i = 1; i <= 64; i++) {
    const k = i / 64, a = Math.PI + k * turns * Math.PI * 2, r = r0 * (1 - k * 0.9);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  const d = 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L');
  const line = (stroke, w, extra = '') => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
  return `<svg viewBox="0 0 104 108">
  <g transform="rotate(7 78 92)"><path d="M67 107 V86 Q67 75 78 75 Q89 75 89 86 V107 Z" fill="#cbbf9f" stroke="${INK}" stroke-width="3"/>
  <path d="M78 81 v13 M73 86 h10" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/></g>
  <path d="M8 107 q4 -9 7 0 M16 107 q3 -7 6 0 M90 107 q3 -8 6 0" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
  ${line(INK, 14)}${line(BONE, 7)}${line(INK, 7, 'stroke-dasharray="6 8" stroke-linecap="butt"')}</svg>`;
}

/** moldura do minimapa: listras preto-e-osso, pontos de costura por dentro e o N numa etiqueta */
function ringSVG() {
  const stripe = ((Math.PI * 2 * 101) / 28).toFixed(2);
  // pontos de costura: um círculo tracejado grosso (tracinhos radiais), num elemento só
  const stitch = ((Math.PI * 2 * 92.3) / 40).toFixed(2);
  return `<svg class="ring" viewBox="0 0 220 220">
  <circle cx="110" cy="110" r="101" fill="none" stroke="${INK}" stroke-width="19"/>
  <circle cx="110" cy="110" r="101" fill="none" stroke="${BONE}" stroke-width="12"/>
  <circle cx="110" cy="110" r="101" fill="none" stroke="${INK}" stroke-width="12" stroke-dasharray="${stripe} ${stripe}"/>
  <circle cx="110" cy="110" r="92.3" fill="none" stroke="${BONE}" stroke-width="5.5" stroke-dasharray="1.8 ${(stitch - 1.8).toFixed(2)}" opacity=".75"/>
  <g transform="rotate(-6 110 10)"><path d="M100 1 h20 q3 0 3 3 v12 q0 3 -3 3 h-20 q-3 0 -3 -3 v-12 q0 -3 3 -3 z" fill="${BONE}" stroke="${INK}" stroke-width="2"/>
  <text x="110" y="16" text-anchor="middle" font-family="Mountains of Christmas, serif" font-weight="700" font-size="16" fill="${INK}">N</text></g></svg>`;
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
    <div class="anchor bc"><div id="bottom"><div class="curl l">${curlSVG()}</div><div class="bar-frame pe"></div><div class="curl r">${curlSVG()}</div>
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
    this.mapWin = this.makeWin('worldmap', 'frame-dark', `<div class="wtitle">Mapa — Vale Tumbalacatumba</div><button class="close">×</button><div class="inner"><canvas></canvas><div class="legend"><span><b>!</b> Missão disponível</span><span><b>?</b> Pronta para entregar</span><span><b style="color:#bdbdbd">?</b> Em andamento</span><span><b style="color:#ff8a2a">◯</b> Área do objetivo</span></div></div><div class="coords"></div>`);
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
    return d >= 3 ? '#ff6a3a' : d >= -2 ? '#ffc84a' : d >= -4 ? '#9ee05a' : '#9d958e';
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
      {
        key: '4', code: 'Digit4', id: 'pet', name: 'Belzebuzinho', icon: 'chick', cd: 2, locked: () => !P.hasItem('belzebu'),
        desc: () => 'Chama ou dispensa seu filhote de avestruz demônio.' + (P.flags.petFire ? ' Ele cospe bolas de fogo (dano baixo) nas criaturas que brigam com você.' : ''),
      },
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
    this.slots.push({
      key: '8', code: 'Digit8', id: 'fly', name: 'Voar', icon: 'batcape', cd: 0.8, locked: () => !P.hasItem('capinha'),
      desc: 'Abre a Capinha de Morcego Filhote e voa (60% mais rápido que correr). Espaço sobe, X desce; segure X rente ao chão para pousar. Use de novo no ar para descer planando. Não funciona debaixo de teto.',
    });
    for (let i = 9; i <= 12; i++) this.slots.push({ key: i <= 9 ? String(i) : i === 10 ? '0' : i === 11 ? '-' : '=', empty: true });
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
        this.showTooltip('slot', `<div class="tt-name" style="color:#fff">${esc(s.name)}</div>${lk ? '<div class="tt-far">Ainda não aprendido</div>' : ''}<div class="tt-flavor">${esc(desc)}</div>${s.cd >= 2 ? `<div class="tt-sub">Recarga: ${s.cd} s</div>` : ''}`, ev.clientX, ev.clientY);
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
      const active = (s.id === 'lantern' && g.player.lanternOn) || (s.id === 'dance' && g.player.action === 'dance') || (s.id === 'pet' && g.questWorld.pet.active) || (s.id === 'mount' && g.player.mounted) || (s.id === 'attack' && g.combat.autoAttack) || (s.id === 'fly' && (g.player.flying || g.player.gliding));
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
  /** letreiro de zona; room = cômodo da mansão (menor e mais alto, para não brigar com as placas dos PNJs) */
  zoneText(name, sub, room = false) {
    const z = this.q('#zonetext');
    z.querySelector('.z1').textContent = name;
    z.querySelector('.z2').textContent = sub ?? '';
    z.classList.toggle('room', room);
    z.classList.add('on');
    clearTimeout(this._zt);
    this._zt = setTimeout(() => z.classList.remove('on'), room ? 2600 : 3800);
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
      let h = `<div class="tt-name" style="color:${it.reaction === 'hostile' ? '#ff5a4a' : '#ffc84a'}">${esc(it.name)}</div>`;
      h += `<div class="tt-lvl"><span style="color:${this.levelColor(m.level)}">Nível ${m.level}</span> ${esc(it.family)}</div>`;
      h += `<div class="tt-sub">${it.reaction === 'hostile' ? 'Hostil: ataca quem chega perto' : 'Neutro: só briga se provocado'}</div>`;
      if (m.hp < m.maxHp) h += `<div class="tt-sub">Vida: ${Math.ceil(m.hp)} / ${m.maxHp}</div>`;
      if (it.hint) h += `<div class="tt-hint">${esc(it.hint)}</div>`;
      if (this.game.interaction.distTo(it) > it.range) h += `<div class="tt-far">Longe demais</div>`;
      return this.showTooltip('world', h);
    }
    const reactColor = it.kind === 'item' ? '#efe6d2' : it.reaction === 'friendly' ? '#b4f05a' : '#ffc84a';
    let h = `<div class="tt-name" style="color:${reactColor}">${esc(it.name)}</div>`;
    if (it.subtitle) h += `<div class="tt-sub">~ ${esc(it.subtitle)} ~</div>`;
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
    tf.querySelector('.sub').textContent = it.subtitle ? `~ ${it.subtitle} ~` : '';
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
    const maxed = P.level >= XP_TABLE.length - 1;
    xp.querySelector('i').style.width = `${maxed ? 100 : Math.min(1, P.xp / P.xpNeeded) * 100}%`;
    xp.querySelector('span').textContent = maxed ? 'Nível máximo' : `XP: ${P.xp} / ${P.xpNeeded}`;
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
    } else if (it.use === 'tonic') {
      // o frasco da Vesga se enche sozinho: não some, só tem recarga
      const left = 60 - (g.time - (this._tonicT ?? -999));
      if (g.combat.dead) return this.error('Você está morto.');
      if (g.combat.hp >= g.combat.st.maxHp) return this.error('Você já está com a vida cheia.');
      if (left > 0) return this.error(`O tônico ainda está borbulhando (${Math.ceil(left)} s).`);
      this._tonicT = g.time;
      g.combat.heal(40);
      g.audio?.sfx('drink');
      this.info('Você bebe o tônico. Sua nuca fica toda arrepiada.');
    } else if (it.use === 'pet') g.abilities.use('pet');
    else if (it.use === 'mount') g.abilities.use('mount');
    else if (it.use === 'fly') this.useSlot(this.slots.find((s) => s.id === 'fly'));
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

  /** pop-up de confirmação (fica fora do #hud para funcionar também no título) */
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
    // dentro da mansão: aponta para a próxima pista (ou para a porta, se já está tudo pronto)
    const io = g.indoors;
    if (io?.active) {
      const t = g.questWorld.mansion?.indoorTarget();
      if (t) target = { x: t.x, y: t.y + 0.9, z: t.z };
      else if (q && P.status(q.id) === 'complete') target = { x: io.doorIn.x, y: io.doorIn.y + 2.6, z: io.doorIn.z };
      else target = null;
    }
    const p = g.player.pos;
    const d = target ? Math.hypot(target.x - p.x, target.z - p.z) + (io?.active ? Math.abs(target.y - p.y) : 0) : 0;
    if (!target || d < (io?.active ? 2.5 : 14) || this.anyWindowOpen()) {
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
      el.querySelector('.tl').textContent = `~ ${npc.info.title} ~`;
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
      const show = (showName || (mk && d < 90)) && n.rig.root.visible && !n.occluded;
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
      { text: 'Bem-vindo a <b>Tumbalacatumba</b>! Use <b>W A S D</b> para andar. Segure o <b>botão direito do mouse</b> e arraste para olhar ao redor.' },
      { text: 'Personagens com um <b>!</b> cor de abóbora têm missões. O <b>Prefeito Abóbora</b> está logo ali na praça: clique nele com o <b>botão direito</b> para conversar.' },
      { text: 'Suas missões aparecem à direita e as áreas de objetivo ficam em <b>laranja no minimapa</b>. Aperte <b>M</b> para o mapa e <b>L</b> para o diário.', on: 'accept' },
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
    // só mexe no DOM quando o texto muda (reescrever todo quadro repinta a etiqueta do relógio)
    const clock = g.dayNight.clockText();
    if (clock !== this._clock) {
      this._clock = clock;
      (this._clockEl ??= this.q('#minimap .clock')).textContent = clock;
    }
    // zona
    const z = g.world.zoneAt(g.player.pos.x, g.player.pos.z, g.player.pos.y);
    const zid = z?.id ?? 'wild';
    if (zid !== this.lastZone) {
      this.q('#minimap .zone').textContent = z?.name ?? ZONE_NAME;
      this.zoneSeen = this.zoneSeen || {};
      const now = g.time;
      if (this.lastZone !== null && z && !(now - (this.zoneSeen[z.id] ?? -999) < 45)) {
        const lv = ZONE_LEVELS[z.id];
        this.zoneText(z.name, (z.flavor ?? ZONE_FLAVOR[z.id] ?? '') + (lv ? ` · Criaturas de nível ${lv[0] === lv[1] ? lv[0] : `${lv[0]}–${lv[1]}`}` : ''), z.id.startsWith('m-'));
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
      const op = g.interaction.distTo(this.target) > this.target.range * 1.5 ? '0.7' : '1';
      if (tf.style.opacity !== op) tf.style.opacity = op;
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
