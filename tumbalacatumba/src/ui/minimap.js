import * as THREE from 'three';
import { WORLD_SIZE, HALF, SUBZONES, QUEST_AREAS, SWAMP, ZONE_LEVELS } from '../world/layout.js';
import { clamp, lerp, TAU } from '../util/math.js';
import { drawMarker } from './icons.js';
import { RNG } from '../util/rng.js';

const MAP_RES = 1280;
const PX = MAP_RES / WORLD_SIZE; // pixels por metro

function toS(v) {
  return v <= 0.0031308 ? v * 12.92 * 255 : (1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255;
}

/** Pinta o mapa base do mundo num canvas (usado pelo minimapa e pelo mapa-múndi). */
export function paintWorldMap(world, populated) {
  const T = world.terrain;
  const cv = document.createElement('canvas');
  cv.width = cv.height = MAP_RES;
  const g = cv.getContext('2d');
  const img = g.createImageData(MAP_RES, MAP_RES);
  const D = img.data;
  const col = T.geometry.attributes.color;
  const N = T.N;
  const L = new THREE.Vector3(-0.55, 0.7, -0.45).normalize();
  const dirt = [120, 96, 76], cob = [128, 122, 138], soil = [84, 60, 44], mud = [78, 72, 50];
  const shallow = [82, 138, 150], deep = [34, 62, 96], swampW = [66, 96, 54], swampD = [44, 64, 40];
  const n = new THREE.Vector3();
  for (let py = 0; py < MAP_RES; py++) {
    const z = (py + 0.5) / PX - HALF;
    for (let px = 0; px < MAP_RES; px++) {
      const x = (px + 0.5) / PX - HALF;
      const h = T.heightAt(x, z);
      const i = (py * MAP_RES + px) * 4;
      // cor do terreno (vértice mais próximo)
      const ix = clamp(Math.round((x + HALF) / T.cell), 0, N - 1), iz = clamp(Math.round((z + HALF) / T.cell), 0, N - 1);
      const vi = iz * N + ix;
      let r = toS(col.getX(vi)), gg = toS(col.getY(vi)), b = toS(col.getZ(vi));
      const sp = T.splatAt(x, z);
      const mix = (c, t) => {
        r += (c[0] - r) * t;
        gg += (c[1] - gg) * t;
        b += (c[2] - b) * t;
      };
      mix(mud, clamp((sp[3] - 0.4) * 2.5, 0, 1));
      mix(soil, clamp((sp[2] - 0.45) * 8, 0, 1));
      mix(dirt, clamp((sp[0] - 0.44) * 9, 0, 1));
      mix(cob, clamp((sp[1] - 0.45) * 9, 0, 1));
      // relevo sombreado
      T.normalAt(x, z, n);
      const sh = clamp(0.62 + 0.55 * (n.dot(L) - 0.7), 0.45, 1.25);
      r *= sh;
      gg *= sh;
      b *= sh;
      if (h < 0) {
        const sw = Math.hypot(x - SWAMP.x, z - SWAMP.z) < SWAMP.r * 1.15;
        const t = clamp(-h / 2.4, 0, 1);
        const a = sw ? swampW : shallow, c2 = sw ? swampD : deep;
        const wr = lerp(a[0], c2[0], t), wg = lerp(a[1], c2[1], t), wb = lerp(a[2], c2[2], t);
        const k = clamp(-h * 6, 0, 1) * 0.85 + 0.15;
        r = lerp(r, wr, k);
        gg = lerp(gg, wg, k);
        b = lerp(b, wb, k);
        if (h > -0.12) {
          r *= 0.6;
          gg *= 0.6;
          b *= 0.65;
        }
      }
      // um pouco mais claro e saturado que o chão real, para ler bem no minimapa
      const lum = (r + gg + b) / 3;
      D[i] = Math.min(255, (lum + (r - lum) * 1.2) * 1.22);
      D[i + 1] = Math.min(255, (lum + (gg - lum) * 1.2) * 1.22);
      D[i + 2] = Math.min(255, (lum + (b - lum) * 1.2) * 1.22);
      D[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const W = (x) => (x + HALF) * PX;
  const M = populated.map;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  // decks
  for (const d of M.decks) {
    g.strokeStyle = d.stone ? '#8a8494' : '#6a4a32';
    g.lineWidth = d.w * PX;
    g.beginPath();
    d.pts.forEach(([x, z], i) => (i ? g.lineTo(W(x), W(z)) : g.moveTo(W(x), W(z))));
    g.stroke();
    g.strokeStyle = 'rgba(30,18,10,0.5)';
    g.lineWidth = 1;
    g.stroke();
  }
  // cercas
  for (const l of M.lines) {
    g.strokeStyle = l.c;
    g.lineWidth = Math.max(1.2, l.w * PX * 0.6);
    g.beginPath();
    g.moveTo(W(l.x0), W(l.z0));
    g.lineTo(W(l.x1), W(l.z1));
    g.stroke();
  }
  // lápides, pedras, abóboras
  g.fillStyle = '#b8b4c4';
  for (const gr of M.graves) {
    g.save();
    g.translate(W(gr.x), W(gr.z));
    g.rotate(-gr.rot);
    g.fillRect(-1.6, -0.9, 3.2, 1.8);
    g.restore();
  }
  for (const r of M.rocks) {
    g.fillStyle = '#6e6a7a';
    g.beginPath();
    g.arc(W(r.x), W(r.z), Math.max(1.2, r.r * PX), 0, TAU);
    g.fill();
  }
  g.fillStyle = '#e8742a';
  for (const p of M.pumpkins) g.fillRect(W(p.x) - 1, W(p.z) - 1, 2.2, 2.2);
  // arbustos
  for (const bu of M.bushes) {
    g.fillStyle = bu.c;
    g.beginPath();
    g.arc(W(bu.x), W(bu.z), Math.max(1.5, bu.r * PX), 0, TAU);
    g.fill();
  }
  // árvores (copas com sombra)
  const rng = new RNG(3);
  for (const t of M.trees) {
    const x = W(t.x), y = W(t.z), r = Math.max(2.4, t.r * PX);
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.beginPath();
    g.arc(x + r * 0.35, y + r * 0.35, r, 0, TAU);
    g.fill();
    if (t.kind === 'dead' || t.kind === 'face') {
      g.strokeStyle = '#2a2230';
      g.lineWidth = 1.4;
      g.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + rng.range(0, 1);
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 1.2);
      }
      g.stroke();
      g.fillStyle = '#3a2e40';
      g.beginPath();
      g.arc(x, y, r * 0.35, 0, TAU);
      g.fill();
    } else {
      const base = t.kind === 'pine' ? '#2c4a46' : t.kind === 'lol' ? '#5a4a6e' : t.kind === 'swamp' ? '#3e4a34' : '#6f8a6a';
      g.fillStyle = base;
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
      g.strokeStyle = 'rgba(10,8,14,0.7)';
      g.lineWidth = 1;
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.14)';
      g.beginPath();
      g.arc(x - r * 0.3, y - r * 0.3, r * 0.45, 0, TAU);
      g.fill();
    }
  }
  // círculos especiais
  for (const c of M.circles) {
    const x = W(c.x), y = W(c.z), r = c.r * PX;
    if (c.tall) {
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.beginPath();
      g.arc(x + r * 0.5, y + r * 0.5, r, 0, TAU);
      g.fill();
    }
    g.fillStyle = c.fill;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
    g.strokeStyle = '#120a14';
    g.lineWidth = 1.5;
    g.stroke();
    if (c.water) {
      g.fillStyle = '#7ac050';
      g.beginPath();
      g.arc(x, y, r * 0.8, 0, TAU);
      g.fill();
    }
    if (c.spiral) {
      g.strokeStyle = '#243a34';
      g.lineWidth = 3;
      g.beginPath();
      for (let a = 0; a < 16; a += 0.2) g.lineTo(x + Math.cos(a + c.rot) * a * 1.4, y + Math.sin(a + c.rot) * a * 1.4);
      g.stroke();
    }
  }
  // casas: telhado com cumeeira
  for (const h of M.houses) {
    const x = W(h.x), y = W(h.z);
    g.save();
    g.translate(x, y);
    g.rotate(-h.rot);
    const w = h.w * PX, d = h.d * PX;
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(-w / 2 + (h.tall ? 5 : 3), -d / 2 + (h.tall ? 5 : 3), w, d);
    g.fillStyle = h.roof;
    g.fillRect(-w / 2, -d / 2, w, d);
    const grd = g.createLinearGradient(-w / 2, 0, w / 2, 0);
    grd.addColorStop(0, 'rgba(255,255,255,0.18)');
    grd.addColorStop(0.5, 'rgba(255,255,255,0)');
    grd.addColorStop(0.5, 'rgba(0,0,0,0.12)');
    grd.addColorStop(1, 'rgba(0,0,0,0.3)');
    g.fillStyle = grd;
    g.fillRect(-w / 2, -d / 2, w, d);
    g.strokeStyle = '#120a14';
    g.lineWidth = 1.5;
    g.strokeRect(-w / 2, -d / 2, w, d);
    g.beginPath();
    g.moveTo(0, -d / 2);
    g.lineTo(0, d / 2);
    g.strokeStyle = 'rgba(0,0,0,0.45)';
    g.stroke();
    g.restore();
  }
  // postes
  for (const l of M.lamps) {
    g.fillStyle = '#ffd36b';
    g.beginPath();
    g.arc(W(l.x), W(l.z), 1.6, 0, TAU);
    g.fill();
  }
  // textura de papel
  const noise = g.createImageData(MAP_RES, MAP_RES);
  const ND = noise.data;
  for (let i = 0; i < ND.length; i += 4) {
    const v = Math.random() * 30;
    ND[i] = ND[i + 1] = ND[i + 2] = v;
    ND[i + 3] = 18;
  }
  const nc = document.createElement('canvas');
  nc.width = nc.height = MAP_RES;
  nc.getContext('2d').putImageData(noise, 0, 0);
  g.globalCompositeOperation = 'overlay';
  g.drawImage(nc, 0, 0);
  g.globalCompositeOperation = 'source-over';
  return cv;
}

// ---------------------------------------------------------------------------
const ZOOMS = [72, 52, 38, 27, 19];

export class Minimap {
  constructor(game, root) {
    this.game = game;
    this.map = game.worldMapCanvas;
    this.canvas = root.querySelector('.body canvas');
    this.ctx = this.canvas.getContext('2d');
    this.size = 192;
    this.res = 2;
    this.canvas.width = this.canvas.height = this.size * this.res;
    this.zoom = 1;
    this.dial = root.querySelector('.dial canvas');
    this.dial.width = this.dial.height = 72;
    this._t = 0;
    this.icons = [];
    root.querySelector('.zin').onclick = () => (this.zoom = Math.min(ZOOMS.length - 1, this.zoom + 1));
    root.querySelector('.zout').onclick = () => (this.zoom = Math.max(0, this.zoom - 1));
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom = clamp(this.zoom + (e.deltaY < 0 ? 1 : -1), 0, ZOOMS.length - 1);
    }, { passive: false });
    this.canvas.addEventListener('mousemove', (e) => this.hover(e));
    this.canvas.addEventListener('mouseleave', () => game.ui.hideTooltip('mm'));
    this.canvas.addEventListener('click', () => game.ui.toggleMap());
  }

  get radius() {
    return ZOOMS[this.zoom];
  }

  hover(e) {
    const r = this.canvas.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * this.size, my = ((e.clientY - r.top) / r.height) * this.size;
    let best = null, bd = 10;
    for (const ic of this.icons) {
      const d = Math.hypot(ic.sx - mx, ic.sy - my);
      if (d < bd) {
        bd = d;
        best = ic;
      }
    }
    if (best) this.game.ui.showTooltip('mm', `<div class="tt-name" style="color:${best.color ?? '#ffb86a'}">${best.title}</div>${best.sub ? `<div class="tt-sub">${best.sub}</div>` : ''}`, e.clientX, e.clientY);
    else this.game.ui.hideTooltip('mm');
  }

  /** marcadores de missão comuns ao minimapa e ao mapa-múndi */
  collectMarkers() {
    const g = this.game, P = g.progress;
    const out = [];
    for (const npc of g.questWorld.npcList) {
      const mk = P.markerFor(npc.id);
      out.push({ x: npc.pos.x, z: npc.pos.z, kind: mk ?? 'npc', title: npc.info.name, sub: npc.info.title });
    }
    for (const q of P.activeQuests()) {
      if (P.status(q.id) !== 'active' || !q.area) continue;
      const a = QUEST_AREAS[q.area] ?? (q.area === 'ovo' ? { x: -40, z: 115, r: 4 } : null);
      if (a) out.push({ x: a.x, z: a.z, r: a.r, kind: 'area', title: q.title, sub: q.summary, tracked: P.tracked.has(q.id) });
    }
    if (g.questWorld.pet.active) out.push({ x: g.questWorld.pet.w.pos.x, z: g.questWorld.pet.w.pos.z, kind: 'pet', title: 'Belzebuzinho' });
    return out;
  }

  update(dt) {
    this._t -= dt;
    if (this._t > 0) return;
    this._t = 1 / 24;
    const g = this.game;
    const ctx = this.ctx, S = this.size * this.res, R = this.radius;
    const p = g.player.pos;
    const scale = S / (2 * R); // px por metro no minimapa
    ctx.save();
    ctx.clearRect(0, 0, S, S);
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2, 0, TAU);
    ctx.clip();
    ctx.fillStyle = '#0c0a10';
    ctx.fillRect(0, 0, S, S);
    const sx = (p.x - R + HALF) * PX, sy = (p.z - R + HALF) * PX, sw = 2 * R * PX;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.map, sx, sy, sw, sw, 0, 0, S, S);
    // escurece levemente à noite
    const night = g.dayNight.night;
    if (night > 0.05) {
      ctx.fillStyle = `rgba(10,12,40,${night * 0.28})`;
      ctx.fillRect(0, 0, S, S);
    }
    const toS = (x, z) => [S / 2 + (x - p.x) * scale, S / 2 + (z - p.z) * scale];
    this.icons.length = 0;
    const markers = this.collectMarkers();
    // áreas de missão (seta dourada na borda quando estão fora do alcance)
    for (const m of markers) {
      if (m.kind !== 'area') continue;
      const [x, y] = toS(m.x, m.z);
      const rr = m.r * scale;
      const dd = Math.hypot(x - S / 2, y - S / 2);
      if (dd - rr > S / 2 - 6 * this.res) {
        const ang = Math.atan2(y - S / 2, x - S / 2);
        const ex = S / 2 + Math.cos(ang) * (S / 2 - 13 * this.res), ey = S / 2 + Math.sin(ang) * (S / 2 - 13 * this.res);
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(9 * this.res, 0);
        ctx.lineTo(-6 * this.res, -7 * this.res);
        ctx.lineTo(-3 * this.res, 0);
        ctx.lineTo(-6 * this.res, 7 * this.res);
        ctx.closePath();
        ctx.fillStyle = m.tracked ? '#ff8a2a' : 'rgba(255,138,42,0.55)';
        ctx.strokeStyle = '#16101d';
        ctx.lineWidth = 2 * this.res;
        ctx.stroke();
        ctx.fill();
        ctx.restore();
        this.icons.push({ sx: ex / this.res, sy: ey / this.res, title: m.title, sub: m.sub });
        continue;
      }
      const grd = ctx.createRadialGradient(x, y, rr * 0.2, x, y, rr);
      grd.addColorStop(0, 'rgba(255,138,42,0.3)');
      grd.addColorStop(0.85, 'rgba(255,138,42,0.24)');
      grd.addColorStop(1, 'rgba(255,138,42,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x, y, rr, 0, TAU);
      ctx.fill();
      this.icons.push({ sx: x / this.res, sy: y / this.res, title: m.title, sub: m.sub });
    }
    // ícones
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const edge = S / 2 - 12 * this.res;
    for (const m of markers) {
      if (m.kind === 'area') continue;
      let [x, y] = toS(m.x, m.z);
      const dx = x - S / 2, dy = y - S / 2, d = Math.hypot(dx, dy);
      const important = m.kind === 'ready';
      if (d > edge) {
        if (!important) continue;
        x = S / 2 + (dx / d) * edge;
        y = S / 2 + (dy / d) * edge;
      }
      if (m.kind === 'npc') {
        ctx.fillStyle = '#efe6d2';
        ctx.strokeStyle = '#16101d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 3.2 * this.res, 0, TAU);
        ctx.fill();
        ctx.stroke();
      } else if (m.kind === 'pet') {
        ctx.fillStyle = '#ff7a3a';
        ctx.beginPath();
        ctx.arc(x, y, 2.6 * this.res, 0, TAU);
        ctx.fill();
      } else {
        drawMarker(ctx, m.kind, x, y, 17 * this.res);
      }
      this.icons.push({ sx: x / this.res, sy: y / this.res, title: m.title, sub: m.sub, color: m.kind === 'npc' || m.kind === 'pet' ? '#b4f05a' : '#ffb86a' });
    }
    // seta do jogador
    const yaw = g.player.visualYaw;
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate(Math.atan2(Math.cos(yaw), Math.sin(yaw)));
    const a = 9 * this.res;
    ctx.beginPath();
    ctx.moveTo(a, 0);
    ctx.lineTo(-a * 0.7, -a * 0.65);
    ctx.lineTo(-a * 0.35, 0);
    ctx.lineTo(-a * 0.7, a * 0.65);
    ctx.closePath();
    ctx.fillStyle = '#efe6d2';
    ctx.strokeStyle = '#16101d';
    ctx.lineWidth = 2.5 * this.res;
    ctx.stroke();
    ctx.fill();
    ctx.restore();
    // cone de visão da câmera
    const cy = g.cam.yaw;
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate(Math.atan2(Math.cos(cy), Math.sin(cy)));
    const grd = ctx.createRadialGradient(0, 0, 4, 0, 0, S * 0.45);
    grd.addColorStop(0, 'rgba(255,255,255,0.2)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, S * 0.45, -0.5, 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
    this.drawDial();
  }

  drawDial() {
    const g = this.game, c = this.dial.getContext('2d'), S = 72;
    const t = g.dayNight.time;
    c.clearRect(0, 0, S, S);
    const night = g.dayNight.night;
    const grd = c.createLinearGradient(0, 0, 0, S);
    grd.addColorStop(0, night > 0.5 ? '#0a0e2a' : '#4a7ac0');
    grd.addColorStop(1, night > 0.5 ? '#2a1d4f' : '#e8c8a0');
    c.fillStyle = grd;
    c.fillRect(0, 0, S, S);
    const ang = ((t - 12) / 24) * TAU;
    for (const [kind, off] of [['sun', 0], ['moon', Math.PI]]) {
      const a = ang + off;
      const x = S / 2 + Math.sin(a) * 22, y = S / 2 + 14 - Math.cos(a) * 22;
      if (kind === 'sun') {
        c.fillStyle = '#ffd24a';
        c.beginPath();
        c.arc(x, y, 10, 0, TAU);
        c.fill();
        c.strokeStyle = '#ffb000';
        c.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const b = (i / 8) * TAU;
          c.beginPath();
          c.moveTo(x + Math.cos(b) * 12, y + Math.sin(b) * 12);
          c.lineTo(x + Math.cos(b) * 16, y + Math.sin(b) * 16);
          c.stroke();
        }
      } else {
        c.fillStyle = '#f4ecc4';
        c.beginPath();
        c.arc(x, y, 10, 0, TAU);
        c.fill();
        c.fillStyle = night > 0.5 ? '#0a0e2a' : '#4a7ac0';
        c.beginPath();
        c.arc(x + 4, y - 3, 8, 0, TAU);
        c.fill();
      }
    }
    c.fillStyle = '#3a4a2a';
    c.fillRect(0, S * 0.72, S, S);
  }
}

// ---------------------------------------------------------------------------
/** mapa-múndi (tecla M) */
export class WorldMap {
  constructor(game, el) {
    this.game = game;
    this.el = el;
    this.canvas = el.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.coords = el.querySelector('.coords');
    this.hoverZone = null;
    this.canvas.addEventListener('mousemove', (e) => {
      const { x, z } = this.toWorld(e);
      this.coords.textContent = `${Math.round(x)}, ${Math.round(z)}`;
      this.hoverZone = game.world.zoneAt(x, z);
    });
    this.canvas.addEventListener('mouseleave', () => (this.hoverZone = null));
  }
  toWorld(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * WORLD_SIZE - HALF, z: ((e.clientY - r.top) / r.height) * WORLD_SIZE - HALF };
  }
  resize() {
    const s = Math.floor(Math.min(window.innerWidth * 0.8, window.innerHeight * 0.78));
    this.px = s;
    this.canvas.width = this.canvas.height = s * 2;
    this.canvas.style.width = this.canvas.style.height = s + 'px';
  }
  draw() {
    const g = this.game, c = this.ctx, S = this.canvas.width;
    const k = S / WORLD_SIZE;
    const W = (v) => (v + HALF) * k;
    c.save();
    c.drawImage(g.worldMapCanvas, 0, 0, S, S);
    // tom de pergaminho
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = '#e8d2a0';
    c.fillRect(0, 0, S, S);
    c.globalCompositeOperation = 'source-over';
    const vg = c.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.75);
    vg.addColorStop(0, 'rgba(60,30,10,0)');
    vg.addColorStop(1, 'rgba(60,30,10,0.55)');
    c.fillStyle = vg;
    c.fillRect(0, 0, S, S);
    // nomes das zonas
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (const z of SUBZONES) {
      if (z.id === 'vila') continue;
      const hov = this.hoverZone?.id === z.id;
      c.font = `700 ${hov ? 34 : 30}px "Mountains of Christmas", serif`;
      c.lineWidth = 6;
      c.strokeStyle = 'rgba(20,10,4,0.85)';
      const y = W(z.z) - (z.id === 'praca' ? 70 : 0);
      c.strokeText(z.name, W(z.x), y);
      c.fillStyle = hov ? '#ffb86a' : '#f3ead6';
      c.fillText(z.name, W(z.x), y);
      // faixa de nível das criaturas da região
      const lv = ZONE_LEVELS[z.id];
      if (lv) {
        const t = lv[0] === lv[1] ? `Nível ${lv[0]}` : `Níveis ${lv[0]}–${lv[1]}`;
        c.font = '400 21px "Patrick Hand", sans-serif';
        c.lineWidth = 5;
        c.strokeText(t, W(z.x), y + 27);
        c.fillStyle = g.ui.levelColor(Math.round((lv[0] + lv[1]) / 2));
        c.fillText(t, W(z.x), y + 27);
      }
    }
    c.font = '700 52px "Mountains of Christmas", serif';
    c.lineWidth = 8;
    c.strokeStyle = 'rgba(20,10,4,0.9)';
    c.strokeText('Vale Tumbalacatumba', S / 2, 60);
    c.fillStyle = '#ffb86a';
    c.fillText('Vale Tumbalacatumba', S / 2, 60);
    // rosa dos ventos
    const rx = S - 120, ry = S - 120;
    c.save();
    c.translate(rx, ry);
    c.strokeStyle = '#3a2410';
    c.fillStyle = '#8a2a1a';
    c.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      c.rotate(Math.PI / 2);
      c.beginPath();
      c.moveTo(0, -70);
      c.lineTo(12, 0);
      c.lineTo(-12, 0);
      c.closePath();
      c.fillStyle = i % 2 ? '#e8d2a0' : '#8a2a1a';
      c.fill();
      c.stroke();
    }
    c.font = '700 30px "Mountains of Christmas", serif';
    c.fillStyle = '#2a1406';
    c.fillText('N', 0, -88);
    c.restore();
    // marcadores
    const mm = g.ui.minimap;
    for (const m of mm.collectMarkers()) {
      const x = W(m.x), y = W(m.z);
      if (m.kind === 'area') {
        c.fillStyle = 'rgba(255,200,0,0.25)';
        c.strokeStyle = 'rgba(160,110,0,0.9)';
        c.setLineDash([10, 8]);
        c.lineWidth = 3;
        c.beginPath();
        c.arc(x, y, m.r * k, 0, TAU);
        c.fill();
        c.stroke();
        c.setLineDash([]);
      } else if (m.kind === 'npc' || m.kind === 'pet') {
        c.fillStyle = m.kind === 'pet' ? '#ff7a3a' : '#efe6d2';
        c.strokeStyle = '#16101d';
        c.lineWidth = 2;
        c.beginPath();
        c.arc(x, y, 6, 0, TAU);
        c.fill();
        c.stroke();
      } else {
        drawMarker(c, m.kind, x, y, 44);
      }
    }
    // jogador
    const p = g.player.pos, yaw = g.player.visualYaw;
    c.save();
    c.translate(W(p.x), W(p.z));
    c.rotate(Math.atan2(Math.cos(yaw), Math.sin(yaw)));
    c.beginPath();
    c.moveTo(22, 0);
    c.lineTo(-16, -15);
    c.lineTo(-8, 0);
    c.lineTo(-16, 15);
    c.closePath();
    c.fillStyle = '#efe6d2';
    c.strokeStyle = '#16101d';
    c.lineWidth = 5;
    c.stroke();
    c.fill();
    c.restore();
    c.restore();
  }
}
