import * as THREE from 'three';
import { esc } from './windows.js';
import { clamp } from '../util/math.js';

const _v = new THREE.Vector3();

/** Parte da interface ligada ao combate: vida do jogador e do alvo, placas das criaturas, tela de morte. */
export class CombatHud {
  constructor(game, ui) {
    this.game = game;
    this.ui = ui;
    this.plates = new Map();
    const pf = (this.pf = ui.q('.unit.player'));
    this.hpI = pf.querySelector('.bar.hp i');
    this.hpS = pf.querySelector('.bar.hp span');
    this.tf = ui.q('.unit.target');
    this.thpI = this.tf.querySelector('.bar.hp i');
    this.thpS = this.tf.querySelector('.bar.hp span');
    // ficha do personagem ao passar o mouse no retrato
    pf.classList.add('pe');
    pf.onmousemove = (e) => ui.showTooltip('pf', this.statsHTML(), e.clientX, e.clientY);
    pf.onmouseleave = () => ui.hideTooltip('pf');
    this.low = document.createElement('div');
    this.low.id = 'lowhp';
    ui.root.appendChild(this.low);
    const d = (this.death = document.createElement('div'));
    d.id = 'death';
    d.className = 'frame-dark pe hidden';
    d.innerHTML = '<div class="d0">✝</div><div class="d1">Você bateu as botas!</div><div class="d2"></div><div class="d3"></div><button class="wbtn">Voltar à Praça</button>';
    d.querySelector('button').onclick = () => game.combat.release();
    ui.root.appendChild(d);
  }

  statsHTML() {
    const c = this.game.combat, s = c.st, P = this.game.progress;
    const pct = (v) => `${Math.round(v * 100)}%`;
    return `<div class="tt-name" style="color:#ffd100">${esc(this.game.player.name)}</div><div class="tt-lvl">Nível ${P.level}</div>
      <div class="tt-stats"><div><span>Vida</span><b>${Math.ceil(c.hp)} / ${s.maxHp}</b></div><div><span>Lanternada</span><b>${s.min}–${s.max}</b></div>
      <div><span>Crítico</span><b>${pct(s.crit)}</b></div><div><span>Golpe a cada</span><b>${s.swing.toFixed(2).replace('.', ',')} s</b></div>
      <div><span>Resistência</span><b>${pct(s.armor)}</b></div></div><div class="tt-flavor">Cada nível deixa o Vicente mais forte.</div>`;
  }

  showDeath(killer, line) {
    this.death.querySelector('.d2').textContent = `Derrotado por: ${killer}`;
    this.death.querySelector('.d3').textContent = line;
    this.death.classList.remove('hidden');
    document.body.classList.add('is-dead');
  }
  hideDeath() {
    this.death.classList.add('hidden');
    document.body.classList.remove('is-dead');
  }

  update(dt) {
    const g = this.game, c = g.combat, ui = this.ui;
    // vida do jogador
    const max = c.st.maxHp, hp = Math.ceil(c.hp);
    const key = `${hp}/${max}`;
    if (key !== this._hpKey) {
      this._hpKey = key;
      this.hpI.style.width = `${(hp / max) * 100}%`;
      this.hpS.textContent = `${hp} / ${max}`;
    }
    const inCombat = c.inCombat && !c.dead;
    if (inCombat !== this._ic) {
      this._ic = inCombat;
      this.pf.classList.toggle('combat', inCombat);
    }
    const low = c.dead ? 0 : clamp((0.35 - c.hp / max) / 0.25, 0, 1);
    if (Math.abs(low - (this._low ?? -1)) > 0.02) {
      this._low = low;
      this.low.style.opacity = low.toFixed(2);
    }
    // vida do alvo (criatura)
    const t = ui.target;
    if (t?.mob) {
      const m = t.mob, pct = Math.max(0, m.hp / m.maxHp);
      const tk = `${m.inter.level}|${Math.ceil(pct * 100)}|${g.progress.level}`;
      if (tk !== this._tKey) {
        this._tKey = tk;
        this.thpI.style.width = `${pct * 100}%`;
        this.thpS.textContent = `${Math.ceil(pct * 100)}%`;
        const lv = this.tf.querySelector('.level');
        lv.textContent = m.inter.level;
        lv.style.color = ui.levelColor(m.inter.level);
      }
    } else if (this._tKey) {
      this._tKey = null;
      this.thpI.style.width = '100%';
      this.tf.querySelector('.level').style.color = '';
    }
    this.updatePlates();
  }

  /** placas de nome com barra de vida sobre as criaturas por perto, brigando ou selecionadas */
  updatePlates() {
    const g = this.game, cam = g.camera, ui = this.ui;
    const W = window.innerWidth, H = window.innerHeight;
    const tgt = g.interaction.target;
    for (const m of g.combat.mobs) {
      let p = this.plates.get(m);
      const d = cam.position.distanceTo(m.pos);
      const sel = tgt === m.inter;
      const show = m.targetable && (m.engaged || sel || d < 26 || m.hp < m.maxHp);
      let s = null;
      if (show && d < 60) {
        const h = (m.rig.height ?? 1) * m.rig.root.scale.y;
        s = ui.project(_v.set(m.pos.x, m.pos.y + m.hopY + h + 0.3, m.pos.z));
      }
      if (!s || s.x < -80 || s.x > W + 80 || s.y < -80 || s.y > H + 80) {
        if (p?.vis) {
          p.el.style.display = 'none';
          p.vis = false;
        }
        continue;
      }
      if (!p) {
        const el = document.createElement('div');
        el.className = `mp ${m.inter.reaction}`;
        el.innerHTML = '<div class="nm"><b></b><span></span></div><div class="hb"><i></i></div>';
        el.querySelector('span').textContent = m.type.name;
        ui.overlay.appendChild(el);
        p = { el, lv: el.querySelector('b'), bar: el.querySelector('i'), key: '', vis: true };
        this.plates.set(m, p);
      }
      if (!p.vis) {
        p.el.style.display = '';
        p.vis = true;
      }
      const pct = Math.max(0, m.hp / m.maxHp);
      const key = `${m.level}|${g.progress.level}|${Math.round(pct * 100)}|${sel}|${m.engaged}`;
      if (key !== p.key) {
        p.key = key;
        p.lv.textContent = m.level;
        p.lv.style.color = ui.levelColor(m.level);
        p.bar.style.width = `${pct * 100}%`;
        p.el.classList.toggle('sel', sel);
        p.el.classList.toggle('fight', m.engaged);
      }
      const sc = clamp(14 / Math.max(d, 1), 0.6, 1.1);
      p.el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) translate(-50%, -100%) scale(${sc})`;
      p.el.style.zIndex = String(900 - Math.round(d));
    }
  }
}
