import { QUESTS, ITEMS, QUALITY_COLORS } from '../quests/data.js';
import { icon, coinsHTML } from './icons.js';

const CHAT_ICON = '<svg width="20" height="18" viewBox="0 0 20 18"><path d="M3 2h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-5 4v-4H3a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#f4ecd8" stroke="#3a2410" stroke-width="1.5"/><circle cx="6" cy="7.5" r="1.2" fill="#3a2410"/><circle cx="10" cy="7.5" r="1.2" fill="#3a2410"/><circle cx="14" cy="7.5" r="1.2" fill="#3a2410"/></svg>';

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function itemRow(id) {
  const it = ITEMS[id];
  return `<div class="it" data-item="${id}"><img src="${icon(it.icon)}"><span style="color:${QUALITY_COLORS[it.quality]}">${esc(it.name)}</span></div>`;
}

function rewardsHTML(q) {
  const r = q.rewards;
  let h = '<h2>Recompensas</h2>';
  if (r.items?.length) h += `<p>Você receberá:</p><div class="rew">${r.items.map(itemRow).join('')}</div>`;
  if (r.money) h += `<div class="money">Dinheiro: ${coinsHTML(r.money)}</div>`;
  if (r.xp) h += `<div class="xpline">Experiência: ${r.xp}</div>`;
  return h;
}

// ---------------------------------------------------------------------------
export class Dialog {
  constructor(game, ui) {
    this.game = game;
    this.ui = ui;
    this.el = ui.makeWin('quest', 'frame-parch parch', '');
    this.el.innerHTML = `<div class="wtitle"></div><button class="close">×</button><div class="inner"><div class="scroll"></div><div class="btns"></div></div>`;
    this.titleEl = this.el.querySelector('.wtitle');
    this.body = this.el.querySelector('.scroll');
    this.btns = this.el.querySelector('.btns');
    this.el.querySelector('.close').onclick = () => this.close();
    this.npc = null;
    this.body.addEventListener('mousemove', (e) => {
      const it = e.target.closest?.('[data-item]');
      if (it) ui.itemTooltip(it.dataset.item, e.clientX, e.clientY);
      else ui.hideTooltip('item');
    });
    this.body.addEventListener('mouseleave', () => ui.hideTooltip('item'));
  }
  get open() {
    return !this.el.classList.contains('hidden');
  }

  openNPC(npc) {
    const P = this.game.progress;
    if (this.npc && this.npc !== npc) this.npc.talking = false;
    this.npc = npc;
    npc.talking = true;
    const opts = [];
    for (const q of QUESTS) {
      const st = P.status(q.id);
      if (q.turnIn === npc.id && st === 'complete') opts.push({ kind: 'ready', q });
    }
    for (const q of QUESTS) {
      const st = P.status(q.id);
      if (q.giver === npc.id && st === 'available') opts.push({ kind: 'avail', q });
      if (q.turnIn === npc.id && st === 'active') opts.push({ kind: 'wip', q });
    }
    const gossip = (npc.info.gossip ?? []).filter((g) => !(g.action === 'sleep' && this.game.dayNight.isNight));
    this.titleEl.textContent = npc.info.name;
    this.ui.showWin(this.el);
    this.game.audio?.sfx('open');
    if (opts.length === 1 && !gossip.length) this.showQuest(opts[0]);
    else this.showGossip(opts, gossip);
  }

  showGossip(opts, gossip) {
    const npc = this.npc;
    const P = this.game.progress;
    const greet = npc.id === 'juvenal' && P.status('ossos') === 'done' ? npc.info.greetDone : npc.info.greet;
    let h = `<p>${esc(greet)}</p><ul class="opts">`;
    opts.forEach((o, i) => {
      const glyph = o.kind === 'avail' ? '!' : '?';
      h += `<li data-q="${i}"><span class="ic ${o.kind === 'wip' ? 'wip' : ''}">${glyph}</span>${esc(o.q.title)} <span style="opacity:.7">(${o.q.level})</span></li>`;
    });
    gossip.forEach((g, i) => (h += `<li data-g="${i}"><span class="ic chat">${CHAT_ICON}</span>${esc(g.text)}</li>`));
    h += '</ul>';
    this.body.innerHTML = h;
    this.body.scrollTop = 0;
    this.body.querySelectorAll('li').forEach((li) => {
      li.onclick = () => {
        this.game.audio?.sfx('click');
        if (li.dataset.q !== undefined) this.showQuest(opts[+li.dataset.q]);
        else this.doGossip(gossip[+li.dataset.g]);
      };
    });
    this.setButtons([{ label: 'Adeus', fn: () => this.close() }]);
  }

  doGossip(g) {
    if (g.action === 'sleep') {
      this.close();
      this.ui.sleepUntilNight();
      return;
    }
    this.body.innerHTML = `<p>${esc(g.reply)}</p>`;
    this.setButtons([{ label: 'Voltar', fn: () => this.openNPC(this.npc) }, { label: 'Adeus', fn: () => this.close() }]);
  }

  showQuest({ kind, q }) {
    const P = this.game.progress;
    let h = `<h1>${esc(q.title)}</h1>`;
    if (kind === 'avail') {
      h += `<p>${esc(q.text)}</p><h2>Objetivos</h2><p>${esc(q.summary)}</p>`;
      if (q.night) h += `<p style="color:#4a2a8a"><i>Só pode ser feita à noite.</i></p>`;
      h += rewardsHTML(q);
      this.body.innerHTML = h;
      this.setButtons([
        { label: 'Aceitar', fn: () => this.accept(q) },
        { label: 'Recusar', fn: () => this.close() },
      ]);
    } else if (kind === 'wip') {
      h += `<p>${esc(q.progress)}</p>`;
      if (!q.startItem) {
        h += '<h2>Itens necessários</h2>';
        for (const o of q.objectives) h += `<div class="req">${esc(o.label)}: ${P.count(q.id, o.key)}/${o.need}</div>`;
      }
      this.body.innerHTML = h;
      this.setButtons([
        { label: 'Continuar', fn: () => {}, disabled: true },
        { label: 'Adeus', fn: () => this.close() },
      ]);
    } else {
      h += `<p>${esc(q.complete)}</p>` + rewardsHTML(q);
      this.body.innerHTML = h;
      this.setButtons([{ label: 'Completar Missão', fn: () => this.complete(q) }]);
    }
    this.body.scrollTop = 0;
  }

  setButtons(list) {
    this.btns.innerHTML = '';
    for (const b of list) {
      const e = document.createElement('button');
      e.className = 'wbtn';
      e.textContent = b.label;
      e.disabled = !!b.disabled;
      e.onclick = () => {
        this.game.audio?.sfx('click');
        b.fn();
      };
      this.btns.appendChild(e);
    }
    if (list.length === 1) this.btns.style.justifyContent = 'center';
    else this.btns.style.justifyContent = 'space-between';
  }

  accept(q) {
    this.game.progress.accept(q.id);
    const npc = this.npc;
    const more = QUESTS.some((x) => x.giver === npc.id && this.game.progress.status(x.id) === 'available');
    if (more) this.openNPC(npc);
    else this.close();
  }

  complete(q) {
    this.game.progress.turnIn(q.id);
    const npc = this.npc;
    const P = this.game.progress;
    const more = QUESTS.some((x) => (x.giver === npc.id && P.status(x.id) === 'available') || (x.turnIn === npc.id && P.status(x.id) === 'complete'));
    if (more) this.openNPC(npc);
    else this.close();
  }

  /** lê um bilhete/pista no pergaminho (sem PNJ) */
  openNote(title, text, btn = 'Fechar') {
    if (this.npc) this.npc.talking = false;
    this.npc = null;
    this.titleEl.textContent = title;
    this.body.innerHTML = `<div class="note">${text.split('\n\n').map((p) => `<p>${esc(p)}</p>`).join('')}</div>`;
    this.body.scrollTop = 0;
    this.setButtons([{ label: btn, fn: () => this.close() }]);
    this.ui.showWin(this.el);
    this.game.audio?.sfx('open');
  }

  close() {
    if (this.npc) this.npc.talking = false;
    this.npc = null;
    if (this.open) this.game.audio?.sfx('close');
    this.ui.hideWin(this.el);
    this.ui.hideTooltip('item');
  }

  update() {
    if (!this.npc || !this.open) return;
    const p = this.game.player.pos, n = this.npc.pos;
    if (Math.hypot(p.x - n.x, p.z - n.z) > 7.5) this.close();
  }
}

// ---------------------------------------------------------------------------
export class QuestLog {
  constructor(game, ui) {
    this.game = game;
    this.ui = ui;
    this.el = ui.makeWin('qlog', 'frame-dark', `<div class="wtitle">Diário de Missões</div><button class="close">×</button>
      <div class="inner"><div class="list"></div><div class="detail parch"></div></div>
      <div class="count"></div>
      <div class="bottom"><button class="wbtn small ab">Abandonar</button><button class="wbtn small tr">Rastrear</button><button class="wbtn small cl">Fechar</button></div>`);
    this.list = this.el.querySelector('.list');
    this.detail = this.el.querySelector('.detail');
    this.sel = null;
    this.el.querySelector('.close').onclick = () => this.toggle(false);
    this.el.querySelector('.cl').onclick = () => this.toggle(false);
    this.el.querySelector('.ab').onclick = () => {
      if (!this.sel) return;
      const q = QUESTS.find((x) => x.id === this.sel);
      ui.confirm(`Abandonar "${q.title}"?`, () => {
        game.progress.abandon(q.id);
        this.sel = null;
        this.render();
      }, { yes: 'Abandonar', no: 'Cancelar' });
    };
    this.el.querySelector('.tr').onclick = () => {
      if (!this.sel) return;
      const t = game.progress.tracked;
      if (t.has(this.sel)) t.delete(this.sel);
      else t.add(this.sel);
      ui.renderTracker();
      this.render();
    };
    this.detail.addEventListener('mousemove', (e) => {
      const it = e.target.closest?.('[data-item]');
      if (it) ui.itemTooltip(it.dataset.item, e.clientX, e.clientY);
      else ui.hideTooltip('item');
    });
  }
  get open() {
    return !this.el.classList.contains('hidden');
  }
  toggle(v = !this.open, sel = null) {
    if (sel) this.sel = sel;
    if (v) {
      this.render();
      this.ui.showWin(this.el);
      this.game.audio?.sfx('open');
    } else {
      if (this.open) this.game.audio?.sfx('close');
      this.ui.hideWin(this.el);
    }
  }
  render() {
    const P = this.game.progress;
    const qs = P.activeQuests();
    if (!this.sel || !qs.some((q) => q.id === this.sel)) this.sel = qs[0]?.id ?? null;
    let h = '<div class="zh">Vale Tumbalacatumba</div>';
    for (const q of qs) {
      const st = P.status(q.id);
      h += `<div class="qi ${q.id === this.sel ? 'sel' : ''}" data-id="${q.id}" style="color:${this.ui.levelColor(q.level)}">[${q.level}] ${esc(q.title)}${st === 'complete' ? '<span class="st">(Completa)</span>' : ''}</div>`;
    }
    if (!qs.length) h += '<div class="qi" style="color:#aaa">Nenhuma missão ativa. Procure por um <b style="color:#ff8a2a">!</b> cor de abóbora.</div>';
    this.list.innerHTML = h;
    this.list.querySelectorAll('.qi[data-id]').forEach((e) => (e.onclick = () => {
      this.sel = e.dataset.id;
      this.game.audio?.sfx('click');
      this.render();
    }));
    this.el.querySelector('.count').textContent = `Missões: ${qs.length}/20`;
    const q = QUESTS.find((x) => x.id === this.sel);
    if (!q) {
      this.detail.innerHTML = '<p style="opacity:.6;margin-top:40%;text-align:center">Nenhuma missão selecionada.</p>';
      return;
    }
    let d = `<h1>${esc(q.title)}</h1><p>${esc(q.summary)}</p>`;
    for (const o of q.objectives) {
      const c = P.count(q.id, o.key);
      d += `<div class="req ${c >= o.need ? 'ok' : ''}">- ${esc(o.label)}: ${c}/${o.need}</div>`;
    }
    const turn = this.game.questWorld.npcs[q.turnIn];
    if (P.status(q.id) === 'complete') d += `<p style="margin-top:8px;color:#1a6a10"><b>Volte para ${esc(turn.info.name)}.</b></p>`;
    d += `<h2>Descrição</h2><p>${esc(q.text)}</p>` + rewardsHTML(q);
    this.detail.innerHTML = d;
    this.el.querySelector('.tr').textContent = P.tracked.has(q.id) ? 'Parar de rastrear' : 'Rastrear';
  }
}

// ---------------------------------------------------------------------------
export class Bags {
  constructor(game, ui) {
    this.game = game;
    this.ui = ui;
    this.el = ui.makeWin('bags', 'frame-dark', `<div class="wtitle">Mochila de Caixão</div><button class="close">×</button><div class="inner"><div class="grid"></div><div class="foot"></div></div>`);
    this.grid = this.el.querySelector('.grid');
    this.foot = this.el.querySelector('.foot');
    this.el.querySelector('.close').onclick = () => this.toggle(false);
  }
  get open() {
    return !this.el.classList.contains('hidden');
  }
  toggle(v = !this.open) {
    if (v) {
      this.render();
      this.ui.showWin(this.el);
      this.game.audio?.sfx('bag');
    } else {
      this.ui.hideWin(this.el);
      this.ui.hideTooltip('item');
    }
  }
  render() {
    const P = this.game.progress;
    let h = '';
    for (let i = 0; i < 20; i++) {
      const b = P.bag[i];
      if (b) {
        const it = ITEMS[b.id];
        h += `<div class="slot" data-item="${b.id}" style="box-shadow:0 0 0 1px ${QUALITY_COLORS[it.quality]}88, inset 0 0 8px #000"><img src="${icon(it.icon)}">${b.count > 1 ? `<span class="cnt">${b.count}</span>` : ''}</div>`;
      } else h += '<div class="slot"></div>';
    }
    this.grid.innerHTML = h;
    this.foot.innerHTML = coinsHTML(P.money);
    this.grid.querySelectorAll('[data-item]').forEach((e) => {
      e.onmousemove = (ev) => this.ui.itemTooltip(e.dataset.item, ev.clientX, ev.clientY, true);
      e.onmouseleave = () => this.ui.hideTooltip('item');
      e.oncontextmenu = (ev) => {
        ev.preventDefault();
        this.ui.useItem(e.dataset.item);
        this.render();
      };
      e.onclick = () => {
        this.ui.useItem(e.dataset.item);
        this.render();
      };
    });
  }
}

// ---------------------------------------------------------------------------
export class Menu {
  constructor(game, ui) {
    this.game = game;
    this.ui = ui;
    this.el = ui.makeWin('menu', 'frame-dark', `<div class="wtitle">Menu do Jogo</div><div class="inner">
      <button class="wbtn" data-a="resume">Voltar ao Jogo</button>
      <button class="wbtn" data-a="options">Opções</button>
      <button class="wbtn" data-a="help">Controles</button>
      <button class="wbtn" data-a="save">Salvar Jogo</button>
      <button class="wbtn" data-a="reset">Recomeçar do Zero</button></div>`);
    this.el.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => this.act(b.dataset.a)));
    this.opt = ui.makeWin('options', 'frame-dark', '');
    this.buildOptions();
  }
  get open() {
    return !this.el.classList.contains('hidden');
  }
  toggle(v = !this.open) {
    if (v) {
      this.ui.showWin(this.el);
      this.game.audio?.sfx('open');
    } else this.ui.hideWin(this.el);
  }
  act(a) {
    this.game.audio?.sfx('click');
    if (a === 'resume') this.toggle(false);
    if (a === 'options') {
      this.toggle(false);
      this.showOptions('opts');
    }
    if (a === 'help') {
      this.toggle(false);
      this.showOptions('keys');
    }
    if (a === 'save') {
      this.game.progress.save();
      this.ui.info('Jogo salvo.');
      this.toggle(false);
    }
    if (a === 'reset') {
      this.ui.confirm('Apagar todo o progresso e recomeçar do zero?', () => {
        this.game.progress.noSave = true;
        this.ui.resetSave();
        location.reload();
      }, { yes: 'Apagar', no: 'Cancelar' });
    }
  }
  showOptions(tab) {
    this.ui.showWin(this.opt);
    this.opt.querySelector('.keys-sec').style.display = tab === 'keys' ? '' : 'none';
    this.opt.querySelector('.opt-sec').style.display = tab === 'keys' ? 'none' : '';
    this.opt.querySelector('.wtitle').textContent = tab === 'keys' ? 'Controles' : 'Opções';
  }
  buildOptions() {
    const g = this.game, s = g.settings;
    this.opt.innerHTML = `<div class="wtitle">Opções</div><button class="close">×</button><div class="inner">
      <div class="opt-sec">
      <h3>Som</h3>
      <div class="row">Volume geral <input type="range" min="0" max="1" step="0.05" data-k="master"></div>
      <div class="row">Música <input type="range" min="0" max="1" step="0.05" data-k="music"></div>
      <div class="row">Efeitos <input type="range" min="0" max="1" step="0.05" data-k="sfx"></div>
      <h3>Controles</h3>
      <div class="row">Sensibilidade do mouse <input type="range" min="0.0015" max="0.009" step="0.0005" data-k="sens"></div>
      <div class="row">Inverter eixo Y <input type="checkbox" data-k="invertY"></div>
      <div class="row">Travar cursor ao arrastar (pointer lock) <input type="checkbox" data-k="pointerLock"></div>
      <h3>Vídeo</h3>
      <div class="row">Qualidade gráfica <select data-k="quality"><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></div>
      <div class="row">Escala da interface <input type="range" min="0.7" max="1.3" step="0.05" data-k="uiScale"></div>
      <div class="row">Mostrar FPS <input type="checkbox" data-k="showFps"></div>
      <h3>Tempo</h3>
      <div class="row">Velocidade do dia <select data-k="daySpeed"><option value="0.5">Lenta (24 min)</option><option value="1">Normal (12 min)</option><option value="2">Rápida (6 min)</option><option value="4">Muito rápida (3 min)</option></select></div>
      <div class="row">Hora do dia <input type="range" min="0" max="23.9" step="0.1" data-k="hour"></div>
      </div>
      <div class="keys-sec" style="display:none"><div class="keys">
        <div><b>W / S</b> andar / recuar</div><div><b>A / D</b> girar (ou lateral c/ botão dir.)</div>
        <div><b>Q / E</b> passo lateral</div><div><b>Espaço</b> pular</div>
        <div><b>R / NumLock</b> correr sozinho</div><div><b>Botão esq.</b> girar câmera</div>
        <div><b>Botão dir.</b> câmera + personagem</div><div><b>Os dois botões</b> andar</div>
        <div><b>Roda</b> zoom</div><div><b>Clique dir.</b> conversar / pegar</div>
        <div><b>F</b> interagir</div><div><b>Tab</b> próximo alvo</div>
        <div><b>1–6</b> barra de ações</div><div><b>X</b> sentar</div>
        <div><b>7</b> Lanternada (atacar)</div><div><b>Clique dir.</b> em criatura: atacar</div>
        <div><b>L</b> diário de missões</div><div><b>M</b> mapa</div>
        <div><b>B</b> mochila</div><div><b>Enter</b> chat</div>
        <div><b>Esc</b> menu / fechar</div><div><b>Z</b> esconder interface</div>
      </div></div>
      <div class="foot"><button class="wbtn small ok">Fechar</button></div></div>`;
    const close = () => this.ui.hideWin(this.opt);
    this.opt.querySelector('.close').onclick = close;
    this.opt.querySelector('.ok').onclick = close;
    this.opt.querySelectorAll('[data-k]').forEach((inp) => {
      const k = inp.dataset.k;
      const cur = k === 'hour' ? g.dayNight.time : k === 'quality' ? g.qualityName : s[k];
      if (inp.type === 'checkbox') inp.checked = !!cur;
      else inp.value = cur;
      inp.addEventListener(inp.tagName === 'SELECT' || inp.type === 'checkbox' ? 'change' : 'input', () => {
        const v = inp.type === 'checkbox' ? inp.checked : inp.tagName === 'SELECT' && k === 'quality' ? inp.value : parseFloat(inp.value);
        g.applySetting(k, v);
      });
    });
  }
}
