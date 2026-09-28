import * as THREE from 'three';
import { WATER_LEVEL } from '../world/layout.js';

const _o = new THREE.Vector3();
const _d = new THREE.Vector3();
const _ndc = new THREE.Vector2();
const _ray = new THREE.Raycaster();

/** Algo com que o jogador pode interagir (PNJ, item, objeto). */
export class Interactable {
  constructor(opts) {
    Object.assign(
      this,
      {
        kind: 'object', name: '?', subtitle: '', radius: 0.7, height: 1.6, range: 4.5, cursor: 'use',
        reaction: 'friendly', level: null, selectable: true, enabled: () => true, hint: null, rig: null,
      },
      opts
    );
  }
}

/** teste raio × cápsula vertical (pos → pos + altura) */
function rayCapsule(o, d, p, h, r) {
  const w0x = o.x - p.x, w0y = o.y - p.y, w0z = o.z - p.z;
  const b = d.y;
  const dd = d.x * w0x + d.y * w0y + d.z * w0z;
  const e = w0y;
  const denom = 1 - b * b;
  let s = denom > 1e-6 ? (e - b * dd) / denom : 0;
  s = Math.max(0, Math.min(h, s));
  const qx = p.x, qy = p.y + s, qz = p.z;
  const t = (qx - o.x) * d.x + (qy - o.y) * d.y + (qz - o.z) * d.z;
  if (t < 0) return Infinity;
  const cx = o.x + d.x * t - qx, cy = o.y + d.y * t - qy, cz = o.z + d.z * t - qz;
  return cx * cx + cy * cy + cz * cz < r * r ? t : Infinity;
}

function ringTexture() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.5);
  grd.addColorStop(0, 'rgba(255,255,255,0)');
  grd.addColorStop(0.55, 'rgba(255,255,255,0.35)');
  grd.addColorStop(0.72, 'rgba(255,255,255,1)');
  grd.addColorStop(0.82, 'rgba(255,255,255,0.5)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);
  // pontos de costura em volta (como um retalho pregado no chão)
  g.strokeStyle = 'rgba(255,255,255,0.95)';
  g.lineWidth = 6;
  g.lineCap = 'round';
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    g.beginPath();
    g.moveTo(S / 2 + c * S * 0.39, S / 2 + s * S * 0.39);
    g.lineTo(S / 2 + c * S * 0.47, S / 2 + s * S * 0.47);
    g.stroke();
  }
  return new THREE.CanvasTexture(c);
}

export class Interaction {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.hover = null;
    this.target = null;
    // círculo de seleção no chão (verde-fantasma = amigável, vela = neutro, vermelho = hostil)
    this.ringMat = new THREE.MeshBasicMaterial({ map: ringTexture(), color: '#b4f05a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, fog: false });
    this.ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), this.ringMat);
    this.ring.layers.set(1);
    this.ring.renderOrder = 4;
    this.ring.visible = false;
    game.scene.add(this.ring);
  }
  add(it) {
    this.list.push(it);
    return it;
  }
  remove(it) {
    const i = this.list.indexOf(it);
    if (i >= 0) this.list.splice(i, 1);
    if (this.hover === it) this.hover = null;
    if (this.target === it) this.setTarget(null);
  }

  pick(mx, my) {
    const cam = this.game.camera;
    _ndc.set((mx / window.innerWidth) * 2 - 1, -(my / window.innerHeight) * 2 + 1);
    _ray.setFromCamera(_ndc, cam);
    _o.copy(_ray.ray.origin);
    _d.copy(_ray.ray.direction);
    let best = null, bt = 80;
    for (const it of this.list) {
      if (!it.enabled()) continue;
      const t = rayCapsule(_o, _d, it.pos, it.height, it.radius);
      if (t < bt) {
        bt = t;
        best = it;
      }
    }
    return best;
  }

  distTo(it) {
    const p = this.game.player.pos;
    return Math.hypot(it.pos.x - p.x, it.pos.z - p.z);
  }

  nearestInRange() {
    let best = null, bd = Infinity;
    for (const it of this.list) {
      if (!it.enabled()) continue;
      const d = this.distTo(it);
      if (d <= it.range && d < bd) {
        bd = d;
        best = it;
      }
    }
    return best;
  }

  setTarget(it) {
    if (this.target === it) return;
    this.target = it;
    this.game.ui?.setTarget(it);
    if (it) {
      this.ringMat.color.set(it.reaction === 'friendly' ? '#b4f05a' : it.reaction === 'hostile' ? '#ff5a4a' : '#ffc84a');
      const r = Math.max(0.9, (it.radius ?? 0.7) * 2.4);
      this.ring.scale.set(r, 1, r);
    }
  }

  updateRing() {
    const it = this.target;
    this.ring.visible = !!it && it.enabled();
    if (!this.ring.visible) return;
    const w = this.game.world;
    const gy = w.groundHeight(it.pos.x, it.pos.z);
    const y = it.ringGround ? Math.max(gy, WATER_LEVEL) : Math.max(gy, it.pos.y - (it.npc?.rig?.float ? 0.6 : 0));
    this.ring.position.set(it.pos.x, y + 0.06, it.pos.z);
    this.ring.rotation.y += 0.01;
    this.ringMat.opacity = 0.75 + Math.sin(this.game.time * 3) * 0.2;
  }

  tryInteract(it) {
    const g = this.game;
    if (!it.enabled()) return;
    if (g.combat?.dead) {
      g.ui.error('Você está morto.');
      return;
    }
    // criatura: seleciona e parte para a briga (o golpe cuida do alcance)
    if (it.kind === 'mob') {
      this.setTarget(it);
      it.onInteract?.(g, it);
      return;
    }
    if (this.distTo(it) > it.range) {
      g.ui.error('Você está muito longe.');
      return;
    }
    if (g.player.mounted && it.kind !== 'npc') {
      g.ui.error('Não dá para fazer isso montado.');
      return;
    }
    if (it.selectable) this.setTarget(it);
    it.onInteract?.(g, it);
  }

  update() {
    const g = this.game, input = g.input;
    let h = null;
    if (!input.dragging && input.overCanvas && !g.ui.blocking()) h = this.pick(input.mx, input.my);
    if (h !== this.hover) {
      this.hover?.rig?.setHighlight(0);
      this.hover?.onHover?.(false);
      this.hover = h;
      h?.rig?.setHighlight(1);
      h?.onHover?.(true);
      g.ui.setCursor(h ? h.cursor : 'default', h && this.distTo(h) > h.range);
      g.ui.tooltipFor(h);
    } else if (h) {
      g.ui.setCursor(h.cursor, this.distTo(h) > h.range);
      this._ttT = (this._ttT ?? 0) + 1;
      if (this._ttT % 20 === 0) g.ui.tooltipFor(h);
    }
    if (g.ui.blocking()) return;
    for (const c of input.clicks) {
      const it = this.pick(c.x, c.y);
      if (c.button === 0) {
        if (it?.selectable) this.setTarget(it);
      } else if (c.button === 2 && it) {
        this.tryInteract(it);
      }
    }
    if (input.hit('KeyF')) {
      const it = this.target && this.target.enabled() && this.distTo(this.target) <= this.target.range ? this.target : this.nearestInRange();
      if (it) this.tryInteract(it);
      else g.ui.error('Não há nada por perto.');
    }
    if (input.hit('Tab')) {
      // como no WoW: Tab alterna entre as criaturas por perto; sem nenhuma, entre os PNJs
      const near = this.list.filter((it) => it.enabled() && it.selectable && this.distTo(it) < 40);
      const foes = near.filter((it) => it.kind === 'mob' && this.distTo(it) < 30);
      const npcs = (foes.length ? foes : near).sort((a, b) => this.distTo(a) - this.distTo(b));
      if (npcs.length) {
        const i = npcs.indexOf(this.target);
        this.setTarget(npcs[(i + 1) % npcs.length]);
      }
    }
    if (this.target && (!this.target.enabled() || this.distTo(this.target) > 60)) this.setTarget(null);
    this.updateRing();
  }
}
