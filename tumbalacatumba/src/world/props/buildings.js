import * as THREE from 'three';
import { Builder, S, curlPoints, crookify } from '../../render/builder.js';
import { GLOW } from '../../render/toon.js';
import { Model } from './batch.js';
import { PAL } from './palette.js';
import { mossy } from './small.js';
import { RNG } from '../../util/rng.js';
import { TAU, lerp, clamp } from '../../util/math.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const _c = new THREE.Color();

/** conjunto de builders por material para um prédio */
class Kit {
  constructor() {
    this.b = new Builder(); // toon com cor por vértice
    this.win = new Builder(); // janelas acesas
    this.glow = new Map(); // outros brilhos: material -> builder
  }
  g(mat) {
    if (mat === GLOW.window) return this.win;
    let b = this.glow.get(mat);
    if (!b) this.glow.set(mat, (b = new Builder()));
    return b;
  }
  all() {
    return [this.b, this.win, ...this.glow.values()];
  }
  deform(fn) {
    for (const b of this.all()) b.deform(fn);
  }
  crook(opts) {
    for (const b of this.all()) crookify(b, opts);
  }
  model(name) {
    const m = new Model(name);
    m.part(this.b.build());
    if (!this.win.empty) m.part(this.win.build(), GLOW.window, { cast: false });
    for (const [mat, b] of this.glow) if (!b.empty) m.part(b.build(), mat, { cast: false });
    return m;
  }
}

/** janela retangular na face local (x,y) de uma parede cuja normal é +z (depois rotacionada por ry). */
function addWindow(k, rng, { x, y, z, ry = 0, w = 0.8, h = 1.1, trim, shutter, lit = true, round = false, glowMat = GLOW.window }) {
  const rot = [0, ry, 0];
  const place = (lx, ly, lz) => {
    const c = Math.cos(ry), s = Math.sin(ry);
    return [x + lx * c + lz * s, y + ly, z - lx * s + lz * c];
  };
  if (round) {
    const r = w / 2;
    k.b.add(S.torus(r, 0.07, 5, 14), trim, { p: place(0, 0, 0.04), r: rot });
    (lit ? k.g(glowMat) : k.b).add(S.disc(r, 14), lit ? '#fff' : PAL.glass, { p: place(0, 0, 0.03), r: rot });
    k.b.add(S.box(0.05, w, 0.04), PAL.ink, { p: place(0, 0, 0.05), r: rot });
    k.b.add(S.box(w, 0.05, 0.04), PAL.ink, { p: place(0, 0, 0.05), r: rot });
    return;
  }
  k.b.add(S.box(w + 0.18, h + 0.18, 0.08), trim, { p: place(0, 0, 0.0), r: rot });
  (lit ? k.g(glowMat) : k.b).add(S.box(w, h, 0.06), lit ? '#fff' : PAL.glass, { p: place(0, 0, 0.03), r: rot });
  k.b.add(S.box(0.05, h, 0.03), PAL.ink, { p: place(0, 0, 0.07), r: rot });
  k.b.add(S.box(w, 0.05, 0.03), PAL.ink, { p: place(0, h * 0.1, 0.07), r: rot });
  k.b.add(S.box(w + 0.34, 0.08, 0.16), trim, { p: place(0, -h / 2 - 0.1, 0.06), r: rot });
  if (shutter && rng.chance(0.75)) {
    for (const sx of [-1, 1]) {
      const tilt = rng.chance(0.3) ? rng.range(-0.25, 0.25) : 0;
      k.b.add(S.box(w * 0.42, h * 1.02, 0.05), shutter, { p: place(sx * (w / 2 + w * 0.26), 0, 0.05), r: [0, ry, tilt] });
      for (let i = 0; i < 3; i++) k.b.add(S.box(w * 0.34, 0.03, 0.02), PAL.ink, { p: place(sx * (w / 2 + w * 0.26), -h * 0.3 + i * h * 0.3, 0.08), r: [0, ry, tilt] });
    }
  }
}

function gableRoof(k, { w, d, y, rh, oh = 0.45, roof, wall, x = 0, shingles = true }) {
  const half = w / 2 + oh;
  const ang = Math.atan2(rh, w / 2);
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const len = half / ca + 0.06;
  const th = 0.2;
  for (const s of [-1, 1]) {
    // centro da placa = meio do segmento cumeeira→beiral, empurrado meia espessura para fora
    const mx = x + (s * half) / 2 + s * sa * th * 0.5;
    const my = y + (rh - oh * Math.tan(ang)) / 2 + ca * th * 0.5;
    k.b.add(S.box(len, th, d + oh * 2), roof, { p: [mx, my, 0], r: [0, 0, -s * ang] });
    if (shingles) {
      const rows = Math.floor(len / 0.42);
      const sc = _c.set(roof).multiplyScalar(0.72).clone();
      for (let i = 1; i < rows; i++) {
        const along = -len / 2 + i * (len / rows);
        const px = mx + s * ca * along + s * sa * (th * 0.5 + 0.02);
        const py = my - sa * along + ca * (th * 0.5 + 0.02);
        k.b.add(S.box(0.07, 0.05, d + oh * 2 + 0.02), sc, { p: [px, py, 0], r: [0, 0, -s * ang] });
      }
    }
  }
  k.b.add(S.prism(w, rh, d), wall, { p: [x, y, 0] });
  k.b.add(S.box(0.22, 0.22, d + oh * 2 + 0.1), _c.set(roof).multiplyScalar(0.6), { p: [x, y + rh + 0.04, 0], r: [0, 0, Math.PI / 4] });
  return y + rh;
}

/** chapéu de bruxa (telhado cônico com ponta dobrada) */
function witchRoof(k, { x = 0, y, z = 0, r, h, roof, bend = 0.6, seg = 10 }) {
  const dir = new THREE.Vector3(bend, 0, bend * 0.3);
  const pts = [V3(x, y, z), V3(x, y + h * 0.35, z), V3(x + dir.x * h * 0.18, y + h * 0.7, z + dir.z * h * 0.18), V3(x + dir.x * h * 0.55, y + h * 0.95, z + dir.z * h * 0.5)];
  const end = pts[3];
  const ed = end.clone().sub(pts[2]).normalize();
  const down = V3(0, -1, 0).sub(ed.clone().multiplyScalar(-ed.y)).normalize();
  pts.push(...curlPoints(end, ed, down, h * 0.08, 0.9, 6, 0.6).slice(1));
  k.b.add(S.tube(pts, (t) => (t < 0.02 ? r * 1.02 : r * Math.pow(1 - t, 1.6)) + 0.01, seg, { segments: 26, capStart: true }), (px, py) => _c.set(roof).multiplyScalar(0.85 + 0.25 * Math.sin(py * 3.5)));
  k.b.add(S.torus(r * 0.98, 0.09, 4, seg * 2), _c.set(roof).multiplyScalar(0.6), { p: [x, y + 0.05, z], r: [Math.PI / 2, 0, 0] });
}

// ---------------------------------------------------------------------------
// Casa torta
// ---------------------------------------------------------------------------
export function makeHouse(seed, opts = {}) {
  const rng = new RNG(seed * 31 + 7);
  const k = new Kit();
  const w = opts.w ?? rng.range(4.2, 6.2);
  const d = opts.d ?? rng.range(4.0, 5.6);
  const floors = opts.floors ?? rng.int(1, 3);
  const fh = opts.fh ?? rng.range(2.6, 3.0);
  const wall = opts.wall ?? rng.pick(PAL.walls);
  const roof = opts.roof ?? rng.pick(PAL.roofs);
  const trim = opts.trim ?? rng.pick(PAL.trims);
  const shutter = opts.shutter ?? rng.pick(PAL.shutters);
  const style = opts.style ?? rng.pick(['gable', 'gable', 'gable', 'witch', 'tower']);
  const litP = opts.lit ?? 0.72;
  const winGlow = opts.glowMat ?? GLOW.window;
  const found = 0.45;
  k.b.add(S.boxB(w + 0.35, found, d + 0.35), mossy(PAL.stoneDark, 0.5, 0.4, seed), { flat: true });
  let y = found;
  let topW = w, topD = d, topX = 0;
  const top = opts.topHeavy ?? rng.range(0.0, 0.12);
  for (let f = 0; f < floors; f++) {
    const fw = w * (1 + f * top), fd = d * (1 + f * top * 0.6);
    const fx = f * (opts.shift ?? rng.range(-0.25, 0.25));
    const wc = new THREE.Color(wall).multiplyScalar(1 - f * 0.05 + rng.range(-0.04, 0.04));
    k.b.add(S.box(fw, fh, fd), wc, { p: [fx, y + fh / 2, 0] });
    // tábuas verticais
    const boards = Math.floor(fw / 0.9);
    for (let i = 1; i < boards; i++) {
      const bx = fx - fw / 2 + (i * fw) / boards;
      k.b.add(S.box(0.06, fh * 0.98, 0.04), wc.clone().multiplyScalar(0.82), { p: [bx, y + fh / 2, fd / 2 + 0.01] });
      k.b.add(S.box(0.06, fh * 0.98, 0.04), wc.clone().multiplyScalar(0.82), { p: [bx, y + fh / 2, -fd / 2 - 0.01] });
    }
    // cantos e cinta
    for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.b.add(S.box(0.16, fh, 0.16), PAL.woodDark, { p: [fx + (cx * fw) / 2, y + fh / 2, (cz * fd) / 2] });
    k.b.add(S.box(fw + 0.12, 0.16, fd + 0.12), PAL.woodDark, { p: [fx, y + fh - 0.06, 0] });
    // janelas frontais / traseiras
    const nw = Math.max(1, Math.floor(fw / 1.7));
    for (let i = 0; i < nw; i++) {
      const wx = fx - fw / 2 + ((i + 0.5) * fw) / nw;
      if (f === 0 && Math.abs(wx - fx) < 0.9 && nw % 2 === 1) continue; // lugar da porta
      if (f === 0 && nw === 2) {
        /* porta vai no meio mesmo */
      }
      const round = f === floors - 1 && rng.chance(0.2);
      addWindow(k, rng, { x: wx, y: y + fh * 0.52, z: fd / 2 + 0.02, w: round ? 0.8 : rng.range(0.7, 0.95), h: rng.range(0.95, 1.25), trim, shutter, lit: rng.chance(litP), round, glowMat: winGlow });
      addWindow(k, rng, { x: wx, y: y + fh * 0.52, z: -fd / 2 - 0.02, ry: Math.PI, w: 0.75, h: 1.0, trim, shutter, lit: rng.chance(litP * 0.7), glowMat: winGlow });
    }
    const ns = Math.max(1, Math.floor(fd / 2.0));
    for (let i = 0; i < ns; i++) {
      const wz = -fd / 2 + ((i + 0.5) * fd) / ns;
      for (const sx of [-1, 1]) addWindow(k, rng, { x: fx + (sx * fw) / 2 + sx * 0.02, y: y + fh * 0.52, z: wz, ry: (sx * Math.PI) / 2, w: 0.7, h: 1.0, trim, shutter, lit: rng.chance(litP * 0.8), glowMat: winGlow });
    }
    y += fh;
    topW = fw;
    topD = fd;
    topX = fx;
  }
  // porta
  {
    const dw = 1.05, dh = 1.95;
    const door = opts.door ?? rng.pick([PAL.woodDark, '#4a2a3a', '#2a3a4a', '#5a2a2a']);
    k.b.add(S.box(dw + 0.24, dh + 0.14, 0.1), trim, { p: [0, found + dh / 2, d / 2 + 0.03] });
    k.b.add(S.box(dw, dh, 0.1), door, { p: [0, found + dh / 2 - 0.02, d / 2 + 0.06] });
    k.b.add(S.cyl(dw / 2, dw / 2, 0.1, 12, false), door, { p: [0, found + dh - 0.02, d / 2 + 0.06], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.55] });
    for (let i = 0; i < 3; i++) k.b.add(S.box(0.04, dh * 0.9, 0.03), PAL.ink, { p: [-dw / 3 + (i * dw) / 3, found + dh / 2, d / 2 + 0.12] });
    k.b.add(S.sphere(0.06, 6, 5), PAL.mustard, { p: [dw * 0.32, found + dh * 0.48, d / 2 + 0.14] });
    for (let i = 0; i < 2; i++) k.b.add(S.boxB(dw + 0.6 - i * 0.2, 0.18, 0.5 - i * 0.18), PAL.stone, { p: [0, found - 0.36 + i * 0.18, d / 2 + 0.42 - i * 0.12] });
    // lanterninha da porta
    k.b.add(S.box(0.18, 0.05, 0.3), PAL.iron, { p: [dw * 0.75, found + dh + 0.25, d / 2 + 0.2] });
    k.g(GLOW.lamp).add(S.sphere(0.1, 8, 6), '#fff', { p: [dw * 0.75, found + dh + 0.08, d / 2 + 0.32], s: [1, 1.3, 1] });
    if (opts.porch ?? rng.chance(0.45)) {
      const pw = dw + 1.6;
      k.b.add(S.box(pw, 0.12, 1.5), roof, { p: [0, found + dh + 0.55, d / 2 + 0.75], r: [0.28, 0, 0] });
      for (const sx of [-1, 1]) k.b.add(S.boxB(0.12, dh + 0.5, 0.12), PAL.woodDark, { p: [(sx * pw) / 2 - sx * 0.1, found - 0.1, d / 2 + 1.35] });
    }
  }
  // telhado
  let ridge = y;
  if (style === 'gable' || floors === 1) {
    const rh = topW * rng.range(0.55, 0.9);
    ridge = gableRoof(k, { w: topW, d: topD, y, rh, roof, wall, x: topX });
    if (rng.chance(0.6)) addWindow(k, rng, { x: topX, y: y + rh * 0.35, z: topD / 2 + 0.02, w: 0.65, h: 0.65, trim, round: true, lit: rng.chance(litP * 0.6), glowMat: winGlow });
  } else if (style === 'witch') {
    k.b.add(S.box(topW + 0.3, 0.25, topD + 0.3), roof, { p: [topX, y + 0.12, 0] });
    const r = Math.max(topW, topD) * 0.62;
    witchRoof(k, { x: topX, y: y + 0.2, r, h: topW * 1.5, roof, bend: rng.range(0.4, 0.9) * rng.sign() });
    ridge = y + topW * 1.3;
  } else {
    // torre: um andar estreito em cima com chapéu de bruxa
    const rh = topW * 0.5;
    gableRoof(k, { w: topW, d: topD, y, rh, roof, wall, x: topX });
    const tr = Math.min(topW, topD) * 0.28;
    const tx = topX + topW * 0.18;
    k.b.add(S.cylB(tr, tr * 1.05, fh * 0.95, 8), wall, { p: [tx, y + rh * 0.4, 0], flat: true });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + Math.PI / 2;
      addWindow(k, rng, { x: tx + Math.cos(a) * tr, y: y + rh * 0.4 + fh * 0.5, z: Math.sin(a) * tr, ry: Math.atan2(Math.cos(a), Math.sin(a)), w: 0.45, h: 0.7, trim, lit: rng.chance(litP), glowMat: winGlow });
    }
    witchRoof(k, { x: tx, y: y + rh * 0.4 + fh * 0.95, r: tr * 1.35, h: tr * 4.2, roof, bend: rng.range(0.4, 0.9) * rng.sign() });
    ridge = y + rh * 0.4 + fh + tr * 3.5;
  }
  // chaminé
  let smoke = null;
  if (opts.chimney ?? rng.chance(0.8)) {
    const cx = topX + topW * rng.range(0.15, 0.32) * rng.sign();
    const cz = topD * rng.range(-0.25, 0.25);
    const ch = rng.range(1.6, 2.6);
    const tilt = rng.range(-0.14, 0.14);
    const cy = y + 0.3;
    k.b.add(S.boxB(0.55, ch + (ridge - y) * 0.6, 0.55), PAL.brick, { p: [cx, cy, cz], r: [0, 0, tilt], flat: true });
    const topY = cy + ch + (ridge - y) * 0.6;
    k.b.add(S.boxB(0.72, 0.16, 0.72), PAL.brickDark, { p: [cx - Math.sin(tilt) * (topY - cy), topY, cz], r: [0, 0, tilt] });
    smoke = V3(cx - Math.sin(tilt) * (topY - cy), topY + 0.3, cz);
  }
  // cata-vento
  if (rng.chance(0.35)) {
    k.b.add(S.cyl(0.02, 0.02, 1.2, 4), PAL.iron, { p: [topX, ridge + 0.6, 0] });
    k.b.add(S.box(0.7, 0.04, 0.02), PAL.iron, { p: [topX, ridge + 1.0, 0] });
    k.b.add(S.cone(0.08, 0.18, 3), PAL.iron, { p: [topX + 0.4, ridge + 1.0, 0], r: [0, 0, -Math.PI / 2] });
  }
  // floreira com flores mortas
  if (rng.chance(0.5)) {
    const fx = -w * 0.3;
    k.b.add(S.box(1.0, 0.25, 0.3), PAL.woodDark, { p: [fx, found + fh * 0.52 - 0.72, d / 2 + 0.2] });
    for (let i = 0; i < 5; i++) k.b.add(S.sphere(0.07, 5, 4), rng.pick(['#6a3d8a', '#8a3a3a', '#c8a24a']), { p: [fx - 0.4 + i * 0.2, found + fh * 0.52 - 0.5, d / 2 + 0.2] });
  }
  const lean = opts.lean ?? rng.range(-0.05, 0.05);
  const H = ridge;
  k.crook({ lean, leanZ: rng.range(-0.03, 0.03), wobble: opts.wobble ?? rng.range(0.1, 0.3), freq: 0.5, seed: rng.range(0, 10), twist: rng.range(-0.08, 0.08), height: H });
  const m = k.model('house');
  m.colliders.push({ type: 'box', x: 0, z: 0, hw: w / 2 + 0.2, hd: d / 2 + 0.2, rot: 0, y0: -2, y1: H });
  m.anchors.door = V3(0, 0, d / 2 + 1.1);
  if (smoke) m.anchors.smoke = smoke;
  m.height = H;
  m.map = { w: w + 0.35, d: d + 0.35, roof, wall };
  return m;
}

// ---------------------------------------------------------------------------
// Torre do relógio torta (mostra a hora do jogo)
// ---------------------------------------------------------------------------
export function makeClockTower() {
  const rng = new RNG(1234);
  const k = new Kit();
  const W = 4.2, H1 = 13;
  const stone = mossy('#6e6878', 0.5, 2.0, 3);
  k.b.add(S.boxB(W + 1.2, 0.6, W + 1.2), PAL.stoneDark, { flat: true });
  k.b.add(S.boxB(W + 0.6, 1.2, W + 0.6), stone, { p: [0, 0.6, 0], flat: true });
  k.b.add(S.box(W, H1, W), stone, { p: [0, 1.8 + H1 / 2, 0] });
  for (let i = 1; i < 5; i++) k.b.add(S.box(W + 0.14, 0.18, W + 0.14), PAL.stoneDark, { p: [0, 1.8 + (i * H1) / 5, 0] });
  for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.b.add(S.box(0.4, H1, 0.4), PAL.stoneLight, { p: [(cx * W) / 2, 1.8 + H1 / 2, (cz * W) / 2] });
  // porta em arco
  k.b.add(S.box(1.5, 2.6, 0.2), PAL.woodDark, { p: [0, 3.0, W / 2 + 0.02] });
  k.b.add(S.cyl(0.75, 0.75, 0.2, 12), PAL.woodDark, { p: [0, 4.3, W / 2 + 0.02], r: [Math.PI / 2, 0, 0] });
  // janelas estreitas acesas
  for (let i = 0; i < 3; i++) {
    for (const ry of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const c = Math.cos(ry), s = Math.sin(ry);
      const y = 6 + i * 2.6;
      addWindow(k, rng, { x: s * (W / 2 + 0.02), y, z: c * (W / 2 + 0.02), ry, w: 0.5, h: 1.2, trim: PAL.stoneLight, lit: rng.chance(0.7) });
    }
  }
  // caixa do relógio (mais larga)
  const cy = 1.8 + H1 + 1.6;
  k.b.add(S.box(W + 1.0, 3.2, W + 1.0), '#5a5468', { p: [0, cy, 0] });
  k.b.add(S.box(W + 1.2, 0.3, W + 1.2), PAL.stoneDark, { p: [0, cy - 1.7, 0] });
  k.b.add(S.box(W + 1.2, 0.3, W + 1.2), PAL.stoneDark, { p: [0, cy + 1.7, 0] });
  const faces = [];
  for (const ry of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const c = Math.cos(ry), s = Math.sin(ry);
    const off = (W + 1.0) / 2 + 0.05;
    k.b.add(S.torus(1.25, 0.14, 6, 24), PAL.mustard, { p: [s * off, cy, c * off], r: [0, ry, 0] });
    k.g(GLOW.window).add(S.disc(1.2, 24), '#fff', { p: [s * (off - 0.02), cy, c * (off - 0.02)], r: [0, ry, 0] });
    for (let h = 0; h < 12; h++) {
      const a = (h / 12) * TAU;
      const lx = Math.sin(a) * 1.0, ly = Math.cos(a) * 1.0;
      k.b.add(S.box(h % 3 === 0 ? 0.1 : 0.05, h % 3 === 0 ? 0.26 : 0.16, 0.04), PAL.ink, { p: [s * (off + 0.02) + c * lx, cy + ly, c * (off + 0.02) - s * lx], r: [0, ry, -a] });
    }
    faces.push({ pos: V3(s * (off + 0.06), cy, c * (off + 0.06)), ry });
  }
  // telhado de bruxa enorme e sino
  witchRoof(k, { y: cy + 1.85, r: (W + 1.4) * 0.72, h: 9, roof: '#2e2a44', bend: 0.7, seg: 8 });
  k.b.add(S.cone(0.8, 1.0, 10), PAL.mustard, { p: [0, cy + 1.1, 0] });
  k.crook({ lean: 0.035, leanZ: -0.02, wobble: 0.45, freq: 0.22, seed: 2, twist: 0.12, height: 30 });
  const m = k.model('clocktower');
  m.colliders.push({ type: 'box', x: 0, z: 0, hw: W / 2 + 0.7, hd: W / 2 + 0.7, rot: 0, y0: -2, y1: 30 });
  m.anchors.faces = faces;
  m.anchors.clockY = cy;
  m.height = 30;
  m.map = { w: W + 1.2, d: W + 1.2, roof: '#2e2a44', round: true };
  return m;
}

/** ponteiros (malhas separadas que giram) */
export function makeClockHands() {
  const hour = new Builder();
  hour.add(S.box(0.12, 0.72, 0.05), PAL.ink, { p: [0, 0.3, 0] });
  hour.add(S.sphere(0.12, 8, 6), PAL.ink, { s: [1, 1, 0.4] });
  const min = new Builder();
  min.add(S.box(0.08, 1.02, 0.05), PAL.ink, { p: [0, 0.45, 0.03] });
  min.add(S.cone(0.1, 0.2, 3), PAL.ink, { p: [0, 0.98, 0.03] });
  return { hour: hour.build(), minute: min.build() };
}

// ---------------------------------------------------------------------------
export function makeFountain() {
  const k = new Kit();
  const stone = mossy(PAL.stone, 0.6, 0.8, 5);
  k.b.add(S.lathe([[0, 0], [3.2, 0], [3.3, 0.2], [3.2, 0.75], [2.9, 0.8], [2.9, 0.3], [0, 0.3]], 24), stone);
  k.b.add(S.cylB(0.45, 0.6, 1.8, 10), stone, { p: [0, 0.3, 0] });
  k.b.add(S.lathe([[0, 0], [1.4, 0.05], [1.5, 0.3], [1.3, 0.35], [0, 0.2]], 18), stone, { p: [0, 2.0, 0] });
  k.b.add(S.cylB(0.25, 0.3, 0.9, 8), stone, { p: [0, 2.3, 0] });
  // caveira sorridente no topo cuspindo água
  k.b.add(S.sphere(0.45, 12, 10), PAL.stoneLight, { p: [0, 3.55, 0], s: [1, 0.95, 1.08] });
  k.b.add(S.box(0.46, 0.22, 0.4), PAL.stoneLight, { p: [0, 3.18, 0.1] });
  for (const s of [-1, 1]) k.b.add(S.sphere(0.12, 8, 6), PAL.black, { p: [s * 0.17, 3.6, 0.38] });
  k.b.add(S.cone(0.06, 0.1, 3), PAL.black, { p: [0, 3.42, 0.46], r: [Math.PI, 0, 0] });
  for (let i = 0; i < 5; i++) k.b.add(S.box(0.06, 0.1, 0.04), PAL.stoneLight, { p: [-0.16 + i * 0.08, 3.22, 0.31] });
  const water = new Builder();
  water.add(S.disc(2.92, 24), '#fff', { p: [0, 0.62, 0], r: [-Math.PI / 2, 0, 0] });
  water.add(S.disc(1.32, 18), '#fff', { p: [0, 2.3, 0], r: [-Math.PI / 2, 0, 0] });
  const m = k.model('fountain');
  m.part(water.build(), GLOW.toxic, { cast: false });
  m.colliders.push({ type: 'c', x: 0, z: 0, r: 3.35 });
  m.map = { r: 3.3, water: true };
  return m;
}

export function makeStall(seed, stripeA = '#5a2a6a', stripeB = '#e6dcc6') {
  const rng = new RNG(seed + 500);
  const k = new Kit();
  const W = 3.2, D = 2.0;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.b.add(S.boxB(0.12, 2.6, 0.12), PAL.woodDark, { p: [(x * W) / 2, 0, (z * D) / 2], r: [0, 0, rng.range(-0.05, 0.05)] });
  k.b.add(S.boxB(W, 0.9, D * 0.8), PAL.wood, { p: [0, 0, 0] });
  k.b.add(S.box(W + 0.2, 0.08, D * 0.9), PAL.woodLight, { p: [0, 0.94, 0] });
  // toldo listrado
  const n = 8;
  for (let i = 0; i < n; i++) {
    k.b.add(S.box(W / n + 0.01, 0.06, D + 0.8), i % 2 ? stripeA : stripeB, { p: [-W / 2 + (i + 0.5) * (W / n), 2.75, 0.1], r: [0.22, 0, 0] });
    k.b.add(S.cone(W / n / 2, 0.3, 3), i % 2 ? stripeA : stripeB, { p: [-W / 2 + (i + 0.5) * (W / n), 2.35, D / 2 + 0.5], r: [Math.PI, 0, 0], s: [1, 1, 0.2] });
  }
  // mercadorias: potes, abóboras, peixes-esqueleto
  for (let i = 0; i < 5; i++) {
    const x = -W / 2 + 0.4 + i * 0.6;
    const t = rng.int(0, 2);
    if (t === 0) k.b.add(S.pumpkin(0.2, 8, 10, 8), PAL.pumpkin, { p: [x, 1.12, 0.1] });
    else if (t === 1) {
      k.b.add(S.cylB(0.12, 0.14, 0.3, 8), rng.pick(['#5a8a6a', '#8a5a9a', '#6a7aa8']), { p: [x, 0.98, 0.1] });
      k.g(GLOW.toxic).add(S.sphere(0.1, 6, 5), '#fff', { p: [x, 1.2, 0.1] });
    } else {
      k.b.add(S.cone(0.12, 0.5, 4), PAL.bone, { p: [x, 1.05, 0.1], r: [0, 0, Math.PI / 2], s: [1, 1, 0.3] });
    }
  }
  const m = k.model('stall');
  m.colliders.push({ type: 'box', x: 0, z: 0, hw: W / 2 + 0.1, hd: D / 2, rot: 0, y0: -1, y1: 3 });
  m.map = { w: W, d: D + 0.6, roof: stripeA };
  return m;
}

// ---------------------------------------------------------------------------
export function makeCrypt(seed) {
  const rng = new RNG(seed + 70);
  const k = new Kit();
  const W = rng.range(3.2, 4.2), D = rng.range(3.6, 4.6), H = rng.range(2.8, 3.4);
  const stone = mossy(rng.pick(['#7a7686', '#8a8478', '#6e7a78']), 0.7, 1.4, seed);
  k.b.add(S.boxB(W + 0.8, 0.4, D + 0.8), PAL.stoneDark, { flat: true });
  k.b.add(S.boxB(W, H, D), stone, { p: [0, 0.4, 0] });
  for (const x of [-1, 1]) k.b.add(S.cylB(0.22, 0.26, H, 10), PAL.stoneLight, { p: [(x * W) / 2 - x * 0.1, 0.4, D / 2 + 0.35] });
  k.b.add(S.box(W + 0.5, 0.3, 0.9), stone, { p: [0, 0.4 + H + 0.15, D / 2 + 0.1] });
  k.b.add(S.prism(W + 0.5, 1.1, D + 1.0), stone, { p: [0, 0.4 + H + 0.3, 0.05] });
  k.b.add(S.box(1.2, 1.9, 0.12), PAL.iron, { p: [0, 1.35, D / 2 + 0.02] });
  for (let i = 0; i < 5; i++) k.b.add(S.cyl(0.025, 0.025, 1.85, 4), PAL.ironHi, { p: [-0.45 + i * 0.22, 1.35, D / 2 + 0.1] });
  k.g(GLOW.windowGreen).add(S.box(1.0, 1.7, 0.04), '#fff', { p: [0, 1.35, D / 2 + 0.01] });
  // estátua de anjo/caveira no topo
  k.b.add(S.sphere(0.3, 10, 8), PAL.stoneLight, { p: [0, 0.4 + H + 1.6, D / 2 - 0.2] });
  for (const s of [-1, 1]) k.b.add(S.sphere(0.08, 6, 5), PAL.black, { p: [s * 0.11, 0.4 + H + 1.62, D / 2 + 0.06] });
  for (const s of [-1, 1]) k.b.add(S.box(0.8, 0.5, 0.06), PAL.stoneLight, { p: [s * 0.5, 0.4 + H + 1.55, D / 2 - 0.3], r: [0, s * 0.4, s * 0.4] });
  k.crook({ lean: rng.range(-0.04, 0.04), wobble: 0.08, freq: 0.6, seed, height: H + 2 });
  const m = k.model('crypt');
  m.colliders.push({ type: 'box', x: 0, z: 0, hw: W / 2 + 0.4, hd: D / 2 + 0.4, rot: 0, y0: -2, y1: H + 2 });
  m.map = { w: W + 0.8, d: D + 0.8, roof: '#5a5a66' };
  return m;
}

export function makeChapel() {
  const rng = new RNG(808);
  const k = new Kit();
  const W = 6, D = 9, H = 5.2;
  const wall = mossy('#8a8494', 0.5, 1.5, 9);
  k.b.add(S.boxB(W + 0.5, 0.45, D + 0.5), PAL.stoneDark, { flat: true });
  k.b.add(S.box(W, H, D), wall, { p: [0, 0.45 + H / 2, 0] });
  gableRoof(k, { w: W, d: D, y: 0.45 + H, rh: 4.2, roof: '#2e2a40', wall: '#8a8494' });
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) addWindow(k, rng, { x: s * (W / 2 + 0.02), y: 2.9, z: -D / 2 + 1.8 + i * 2.7, ry: (s * Math.PI) / 2, w: 0.7, h: 1.9, trim: PAL.stoneLight, lit: true, glowMat: GLOW.windowPurple });
  addWindow(k, rng, { x: 0, y: 0.45 + H + 1.4, z: D / 2 + 0.03, w: 1.5, round: true, trim: PAL.stoneLight, lit: true, glowMat: GLOW.windowPurple });
  k.b.add(S.box(1.6, 2.8, 0.14), PAL.woodDark, { p: [0, 1.85, D / 2 + 0.04] });
  k.b.add(S.cyl(0.8, 0.8, 0.14, 12), PAL.woodDark, { p: [0, 3.25, D / 2 + 0.04], r: [Math.PI / 2, 0, 0] });
  // campanário torto
  const bx = 0, bz = D / 2 - 1.2;
  k.b.add(S.box(2.2, 3.6, 2.2), wall, { p: [bx, 0.45 + H + 4.2 + 1.8, bz] });
  for (const ry of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const c = Math.cos(ry), s = Math.sin(ry);
    k.b.add(S.box(0.9, 1.6, 0.1), PAL.black, { p: [bx + s * 1.11, 0.45 + H + 4.2 + 2.2, bz + c * 1.11], r: [0, ry, 0] });
  }
  k.b.add(S.cone(0.45, 0.6, 10), PAL.mustard, { p: [bx, 0.45 + H + 4.2 + 2.1, bz] });
  witchRoof(k, { x: bx, y: 0.45 + H + 4.2 + 3.6, z: bz, r: 1.7, h: 6.5, roof: '#2e2a40', bend: -0.8, seg: 8 });
  k.crook({ lean: -0.03, wobble: 0.3, freq: 0.25, seed: 4, twist: 0.05, height: 24 });
  const m = k.model('chapel');
  m.colliders.push({ type: 'box', x: 0, z: 0, hw: W / 2 + 0.3, hd: D / 2 + 0.3, rot: 0, y0: -2, y1: 12 });
  m.map = { w: W + 0.5, d: D + 0.5, roof: '#2e2a40' };
  return m;
}

// ---------------------------------------------------------------------------
export function makeBarn() {
  const rng = new RNG(555);
  const k = new Kit();
  const W = 9, D = 12, H = 4.6;
  const red = '#8a3e3a';
  k.b.add(S.boxB(W + 0.4, 0.35, D + 0.4), PAL.stoneDark, { flat: true });
  k.b.add(S.box(W, H, D), red, { p: [0, 0.35 + H / 2, 0] });
  for (let i = 1; i < 9; i++) {
    for (const s of [-1, 1]) k.b.add(S.box(0.06, H, 0.04), '#6a2e2c', { p: [-W / 2 + (i * W) / 9, 0.35 + H / 2, s * (D / 2 + 0.01)] });
  }
  // telhado gambrel (quebrado em duas águas de cada lado)
  const y0 = 0.35 + H;
  const roof = '#3a3a48';
  for (const s of [-1, 1]) {
    k.b.add(S.box(3.3, 0.2, D + 0.8), roof, { p: [s * (W / 2 - 0.7), y0 + 1.35, 0], r: [0, 0, -s * 1.05] });
    k.b.add(S.box(3.4, 0.2, D + 0.8), roof, { p: [s * 1.45, y0 + 3.25, 0], r: [0, 0, -s * 0.42] });
  }
  const gam = new THREE.Shape([
    new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(W / 2 - 1.4, 2.7),
    new THREE.Vector2(0, 3.9), new THREE.Vector2(-W / 2 + 1.4, 2.7),
  ]);
  k.b.add(S.extrude(gam, D, 1), red, { p: [0, y0, 0], flat: true });
  // portas em X
  for (const s of [-1, 1]) {
    k.b.add(S.box(2.0, 3.4, 0.12), '#7a3432', { p: [s * 1.0, 0.35 + 1.7, D / 2 + 0.04] });
    k.b.add(S.box(2.0, 0.14, 0.06), PAL.cream, { p: [s * 1.0, 0.35 + 0.1, D / 2 + 0.12] });
    k.b.add(S.box(2.0, 0.14, 0.06), PAL.cream, { p: [s * 1.0, 0.35 + 3.3, D / 2 + 0.12] });
    k.b.add(S.box(0.14, 3.4, 0.06), PAL.cream, { p: [s * 1.93, 0.35 + 1.7, D / 2 + 0.12] });
    k.b.add(S.box(0.12, 3.9, 0.05), PAL.cream, { p: [s * 1.0, 0.35 + 1.7, D / 2 + 0.13], r: [0, 0, 0.53] });
    k.b.add(S.box(0.12, 3.9, 0.05), PAL.cream, { p: [s * 1.0, 0.35 + 1.7, D / 2 + 0.13], r: [0, 0, -0.53] });
  }
  addWindow(k, rng, { x: 0, y: y0 + 1.8, z: D / 2 + 0.03, w: 1.3, h: 1.2, trim: PAL.cream, lit: true });
  k.crook({ lean: 0.03, wobble: 0.2, freq: 0.4, seed: 1, height: 9 });
  const m = k.model('barn');
  m.colliders.push({ type: 'box', x: 0, z: 0, hw: W / 2 + 0.2, hd: D / 2 + 0.2, rot: 0, y0: -2, y1: 9 });
  m.map = { w: W + 0.4, d: D + 0.4, roof };
  return m;
}

export function makeWindmillTower() {
  const k = new Kit();
  const rng = new RNG(99);
  const H = 11;
  k.b.add(S.cylB(2.0, 2.8, H, 8), (x, y, z) => _c.set('#9a8a78').multiplyScalar(0.8 + 0.2 * Math.sin(y * 2.2)), { flat: true });
  for (let i = 1; i < 5; i++) k.b.add(S.torus(2.8 - (i * 0.8) / 5 - 0.02, 0.07, 3, 8), PAL.woodDark, { p: [0, (i * H) / 5, 0], r: [Math.PI / 2, 0, Math.PI / 8] });
  k.b.add(S.box(1.2, 2.0, 0.2), PAL.woodDark, { p: [0, 1.0, 2.55], r: [-0.08, 0, 0] });
  addWindow(k, rng, { x: 0, y: 5, z: 2.4, w: 0.6, h: 0.9, trim: PAL.cream, lit: true });
  addWindow(k, rng, { x: 0, y: 8, z: 2.2, w: 0.5, h: 0.7, trim: PAL.cream, lit: false });
  witchRoof(k, { y: H - 0.1, r: 2.5, h: 4.5, roof: '#3a3052', bend: 0.5, seg: 8 });
  k.b.add(S.cyl(0.25, 0.25, 1.6, 8), PAL.woodDark, { p: [0, H + 0.4, 2.1], r: [Math.PI / 2, 0, 0] });
  k.crook({ lean: 0.04, wobble: 0.3, freq: 0.35, seed: 6, height: 16 });
  const m = k.model('windmill');
  m.colliders.push({ type: 'c', x: 0, z: 0, r: 2.9 });
  m.anchors.hub = V3(0.44, H + 0.4, 2.9);
  m.map = { r: 2.8, roof: '#3a3052', round: true };
  return m;
}

export function makeWindmillBlades() {
  const b = new Builder();
  b.add(S.cyl(0.35, 0.35, 0.4, 8), PAL.woodDark, { r: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    const c = Math.cos(a), s = Math.sin(a);
    b.add(S.box(0.2, 6.2, 0.12), PAL.woodDark, { p: [s * 3.1, c * 3.1, 0.1], r: [0, 0, -a] });
    const cloth = i % 2 ? '#d8cfc0' : '#b8a898';
    b.add(S.box(1.3, 4.8, 0.05), cloth, { p: [s * 3.5 + c * 0.75, c * 3.5 - s * 0.75, 0.16], r: [0, 0, -a] });
    for (let j = 0; j < 5; j++) b.add(S.box(1.35, 0.05, 0.08), PAL.woodDark, { p: [s * (1.6 + j * 0.95) + c * 0.75, c * (1.6 + j * 0.95) - s * 0.75, 0.2], r: [0, 0, -a] });
  }
  return b.build();
}

// ---------------------------------------------------------------------------
export function makeWitchHut() {
  const rng = new RNG(4321);
  const k = new Kit();
  const W = 4.6, D = 4.2, H = 2.8, lift = 1.8;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1.1], [0, -1.1]]) k.b.add(S.cylB(0.13, 0.17, lift + 0.4, 6), PAL.woodDark, { p: [(x * W) / 2.2, -1.2, (z * D) / 2.2], r: [rng.range(-0.1, 0.1), 0, rng.range(-0.1, 0.1)] });
  k.b.add(S.boxB(W + 1.6, 0.18, D + 1.6), PAL.wood, { p: [0, lift - 0.18, 0] });
  k.b.add(S.box(W, H, D), '#5a6a4a', { p: [0, lift + H / 2, 0] });
  for (let i = 0; i < 6; i++) k.b.add(S.box(W + 0.02, 0.12, D + 0.02), '#465438', { p: [0, lift + 0.3 + i * 0.45, 0] });
  addWindow(k, rng, { x: -1.2, y: lift + 1.5, z: D / 2 + 0.02, w: 0.8, h: 0.8, trim: '#3a2a2a', lit: true, round: true, glowMat: GLOW.windowGreen });
  addWindow(k, rng, { x: W / 2 + 0.02, y: lift + 1.5, z: 0, ry: Math.PI / 2, w: 0.7, h: 1.0, trim: '#3a2a2a', lit: true, glowMat: GLOW.windowGreen });
  k.b.add(S.box(1.0, 1.9, 0.1), '#3a2030', { p: [0.9, lift + 0.95, D / 2 + 0.04] });
  witchRoof(k, { y: lift + H, r: 3.6, h: 5.6, roof: '#3a2a4a', bend: 1.0, seg: 9 });
  // chaminé torta com fumaça verde
  k.b.add(S.tube([V3(1.4, lift + H, -1.0), V3(1.6, lift + H + 1.8, -1.0), V3(2.2, lift + H + 3.2, -0.9), V3(2.9, lift + H + 3.6, -0.8)], 0.3, 6), PAL.brick);
  // escada
  for (let i = 0; i < 6; i++) k.b.add(S.box(1.1, 0.1, 0.34), PAL.wood, { p: [0.9, lift - 0.3 - i * 0.3, D / 2 + 1.0 + i * 0.36] });
  for (const s of [-1, 1]) k.b.add(S.box(0.08, 0.08, 2.4), PAL.woodDark, { p: [0.9 + s * 0.55, lift - 0.9, D / 2 + 1.8], r: [0.72, 0, 0] });
  // garrafas e caveiras penduradas
  for (let i = 0; i < 5; i++) {
    const x = -W / 2 + 0.5 + i * 0.9;
    k.b.add(S.cyl(0.006, 0.006, 0.6, 3), PAL.ink, { p: [x, lift + H - 0.3, D / 2 + 0.7] });
    if (i % 2) k.g(GLOW.toxic).add(S.sphere(0.1, 6, 5), '#fff', { p: [x, lift + H - 0.65, D / 2 + 0.7] });
    else k.b.add(S.sphere(0.1, 6, 5), PAL.bone, { p: [x, lift + H - 0.65, D / 2 + 0.7] });
  }
  k.crook({ lean: 0.06, wobble: 0.35, freq: 0.5, seed: 12, twist: 0.1, height: 12 });
  const m = k.model('witchhut');
  m.colliders.push({ type: 'box', x: 0, z: 0, hw: W / 2 + 0.8, hd: D / 2 + 0.8, rot: 0, y0: -2, y1: 12 });
  m.anchors.smoke = V3(3.0, lift + H + 3.8, -0.8);
  m.anchors.porch = V3(0.9, lift, D / 2 + 0.6);
  m.map = { w: W + 1.6, d: D + 1.6, roof: '#3a2a4a' };
  return m;
}

// ---------------------------------------------------------------------------
/** Mansão do Conde: corpo central, duas torres com chapéus pontudos, muitas janelas vermelhas. */
export function makeManor() {
  const rng = new RNG(1703);
  const k = new Kit();
  const W = 14, D = 10, FH = 3.2, floors = 3;
  const wall = '#5e5470', trim = '#c8bcd8', roof = '#2a2238';
  k.b.add(S.boxB(W + 1.2, 0.8, D + 1.2), PAL.stoneDark, { flat: true });
  let y = 0.8;
  for (let f = 0; f < floors; f++) {
    const fw = W - f * 0.6;
    k.b.add(S.box(fw, FH, D - f * 0.3), wall, { p: [0, y + FH / 2, 0] });
    k.b.add(S.box(fw + 0.3, 0.22, D - f * 0.3 + 0.3), PAL.stoneDark, { p: [0, y + FH, 0] });
    const n = 5;
    for (let i = 0; i < n; i++) {
      const x = -fw / 2 + ((i + 0.5) * fw) / n;
      if (f === 0 && i === 2) continue;
      addWindow(k, rng, { x, y: y + FH * 0.5, z: (D - f * 0.3) / 2 + 0.02, w: 0.85, h: 1.6, trim, shutter: '#3a2a3a', lit: rng.chance(0.65), glowMat: rng.chance(0.35) ? GLOW.windowRed : GLOW.window });
      addWindow(k, rng, { x, y: y + FH * 0.5, z: -(D - f * 0.3) / 2 - 0.02, ry: Math.PI, w: 0.85, h: 1.6, trim, lit: rng.chance(0.4), glowMat: GLOW.windowRed });
    }
    for (const s of [-1, 1]) addWindow(k, rng, { x: s * (fw / 2 + 0.02), y: y + FH * 0.5, z: 0, ry: (s * Math.PI) / 2, w: 0.85, h: 1.5, trim, lit: rng.chance(0.5), glowMat: GLOW.windowRed });
    y += FH;
  }
  gableRoof(k, { w: W - floors * 0.6 + 0.6, d: D - 0.9, y, rh: 5.2, roof, wall });
  // porta dupla, escadaria, sacada
  k.b.add(S.box(2.4, 3.0, 0.2), '#3a1e2a', { p: [0, 0.8 + 1.5, D / 2 + 0.05] });
  k.b.add(S.cyl(1.2, 1.2, 0.2, 14), '#3a1e2a', { p: [0, 0.8 + 3.0, D / 2 + 0.05], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.6] });
  for (let i = 0; i < 4; i++) k.b.add(S.boxB(4.4 - i * 0.4, 0.2, 1.8 - i * 0.35), PAL.stone, { p: [0, i * 0.2, D / 2 + 0.9 - i * 0.15] });
  k.b.add(S.box(5, 0.2, 1.6), PAL.stoneDark, { p: [0, 0.8 + FH + 0.1, D / 2 + 0.8] });
  for (let i = 0; i < 9; i++) k.b.add(S.cylB(0.05, 0.05, 0.8, 5), PAL.iron, { p: [-2.4 + i * 0.6, 0.8 + FH + 0.2, D / 2 + 1.55] });
  k.b.add(S.box(5, 0.08, 0.08), PAL.iron, { p: [0, 0.8 + FH + 1.0, D / 2 + 1.55] });
  // torres
  for (const s of [-1, 1]) {
    const tx = s * (W / 2 + 0.8), tz = D / 2 - 1.0, tr = 2.1, th = 13;
    k.b.add(S.cylB(tr, tr * 1.1, th, 10), wall, { p: [tx, 0.8, tz], flat: true });
    for (let i = 1; i < 4; i++) k.b.add(S.torus(tr + 0.02, 0.1, 4, 16), PAL.stoneDark, { p: [tx, 0.8 + i * 3.6, tz], r: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 3; i++) {
      for (const a of [0.2, 1.2, -0.8]) {
        addWindow(k, rng, { x: tx + Math.sin(a) * (tr + 0.02), y: 3 + i * 3.6, z: tz + Math.cos(a) * (tr + 0.02), ry: a, w: 0.55, h: 1.2, trim, lit: rng.chance(0.6), glowMat: GLOW.windowRed });
      }
    }
    witchRoof(k, { x: tx, y: 0.8 + th, z: tz, r: tr * 1.35, h: 8.5, roof, bend: s * 0.8, seg: 10 });
  }
  // chaminés altas e gárgulas
  for (const s of [-1, 1]) {
    k.b.add(S.boxB(0.7, 5, 0.7), PAL.brick, { p: [s * 3.5, y + 1, -1.5], r: [0, 0, s * 0.08], flat: true });
    k.b.add(S.sphere(0.35, 8, 6), PAL.stoneLight, { p: [s * (W / 2 - 1.3), y + 0.5, D / 2 - 0.5] });
    k.b.add(S.box(0.9, 0.5, 0.06), PAL.stoneLight, { p: [s * (W / 2 - 1.3), y + 0.6, D / 2 - 0.7], r: [0, 0, s * 0.5] });
  }
  k.crook({ lean: -0.025, wobble: 0.4, freq: 0.2, seed: 7, twist: 0.06, height: 24 });
  const m = k.model('manor');
  m.colliders.push({ type: 'box', x: 0, z: 0, hw: W / 2 + 0.6, hd: D / 2 + 0.6, rot: 0, y0: -2, y1: 18 });
  for (const s of [-1, 1]) m.colliders.push({ type: 'c', x: s * (W / 2 + 0.8), z: D / 2 - 1.0, r: 2.4 });
  m.anchors.door = V3(0, 0, D / 2 + 2.6);
  m.anchors.towerTops = [V3(-(W / 2 + 0.8), 22, D / 2 - 1), V3(W / 2 + 0.8, 22, D / 2 - 1)];
  m.map = { w: W + 5, d: D + 1.2, roof };
  return m;
}

// ---------------------------------------------------------------------------
export function makeGazebo() {
  const k = new Kit();
  const R = 3.2, H = 2.8;
  k.b.add(S.cylB(R + 0.3, R + 0.4, 0.4, 8), PAL.stoneLight, { flat: true });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    k.b.add(S.cylB(0.12, 0.14, H, 6), PAL.cream, { p: [Math.cos(a) * R, 0.4, Math.sin(a) * R] });
    if (i !== 2) {
      const a2 = ((i + 0.5) / 8) * TAU;
      k.b.add(S.box(2.3, 0.08, 0.08), PAL.cream, { p: [Math.cos(a2) * R * 0.95, 1.2, Math.sin(a2) * R * 0.95], r: [0, -a2 + Math.PI / 2, 0] });
      k.b.add(S.torus(0.35, 0.03, 3, 10, Math.PI), PAL.cream, { p: [Math.cos(a2) * R * 0.95, H + 0.1, Math.sin(a2) * R * 0.95], r: [0, -a2 + Math.PI / 2, Math.PI] });
    }
  }
  k.b.add(S.cyl(R + 0.5, R + 0.5, 0.25, 8), '#6a6a8a', { p: [0, H + 0.55, 0] });
  k.b.add(S.coneB(R + 0.6, 2.6, 8), '#4a4a6a', { p: [0, H + 0.65, 0] });
  k.b.add(S.sphere(0.25, 8, 6), PAL.mustard, { p: [0, H + 3.4, 0] });
  k.b.add(S.tube(curlPoints(V3(0, H + 3.6, 0), V3(0, 1, 0), V3(1, 0, 0), 0.25, 1.2, 8, 0.6), 0.03, 4), PAL.mustard);
  const m = k.model('gazebo');
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    m.colliders.push({ type: 'c', x: Math.cos(a) * R, z: Math.sin(a) * R, r: 0.25 });
  }
  m.map = { r: R + 0.4, roof: '#4a4a6a', round: true };
  return m;
}

export function makeLighthouse() {
  const k = new Kit();
  const rng = new RNG(71);
  const H = 15;
  k.b.add(S.cylB(3.2, 3.6, 1.2, 10), mossy(PAL.stone, 0.7, 1.2, 1), { flat: true });
  k.b.add(S.cylB(1.5, 2.4, H, 12), (x, y) => ((Math.floor(y / 2.2) % 2) ? _c.set('#e6dcc6') : _c.set('#8a2a2e')), { p: [0, 1.2, 0] });
  k.b.add(S.cylB(2.2, 2.2, 0.3, 12), PAL.iron, { p: [0, H + 1.2, 0] });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    k.b.add(S.cylB(0.04, 0.04, 0.9, 4), PAL.iron, { p: [Math.cos(a) * 2.1, H + 1.5, Math.sin(a) * 2.1] });
  }
  k.b.add(S.torus(2.1, 0.05, 3, 20), PAL.iron, { p: [0, H + 2.4, 0], r: [Math.PI / 2, 0, 0] });
  k.g(GLOW.window).add(S.cylB(1.1, 1.1, 1.8, 10), '#fff', { p: [0, H + 1.5, 0] });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    k.b.add(S.cylB(0.06, 0.06, 1.8, 4), PAL.iron, { p: [Math.cos(a) * 1.12, H + 1.5, Math.sin(a) * 1.12] });
  }
  witchRoof(k, { y: H + 3.3, r: 1.6, h: 3.5, roof: '#8a2a2e', bend: 0.6, seg: 10 });
  addWindow(k, rng, { x: 0, y: 6, z: 1.92, w: 0.5, h: 0.9, trim: PAL.cream, lit: true });
  addWindow(k, rng, { x: 0, y: 10.5, z: 1.72, w: 0.45, h: 0.8, trim: PAL.cream, lit: false });
  k.b.add(S.box(1.1, 2.0, 0.2), PAL.woodDark, { p: [0, 2.2, 2.28] });
  k.crook({ lean: 0.07, leanZ: 0.03, wobble: 0.35, freq: 0.3, seed: 3, twist: 0.1, height: 20 });
  const m = k.model('lighthouse');
  m.colliders.push({ type: 'c', x: 0, z: 0, r: 2.6 });
  m.anchors.lamp = V3(0.07 * (H + 2.4), H + 2.4, 0.03 * (H + 2.4));
  m.map = { r: 2.4, roof: '#8a2a2e', round: true };
  return m;
}

// ---------------------------------------------------------------------------
/** Arco de entrada com placa (a placa em si é desenhada à parte com texto). */
export function makeGateArch(width = 5, kind = 'iron') {
  const k = new Kit();
  const col = kind === 'iron' ? PAL.iron : PAL.woodDark;
  for (const s of [-1, 1]) {
    const pl = kind === 'iron' ? mossy(PAL.stone, 0.6, 0.8) : PAL.woodDark;
    if (kind === 'iron') {
      k.b.add(S.boxB(0.6, 3.2, 0.6), pl, { p: [(s * width) / 2, 0, 0] });
      k.b.add(S.boxB(0.75, 0.2, 0.75), PAL.stoneDark, { p: [(s * width) / 2, 3.2, 0] });
      k.b.add(S.sphere(0.25, 10, 8), PAL.boneDark, { p: [(s * width) / 2, 3.65, 0] });
      for (const e of [-1, 1]) k.b.add(S.sphere(0.06, 6, 5), PAL.black, { p: [(s * width) / 2 + e * 0.09, 3.67, 0.21] });
    } else {
      k.b.add(S.boxB(0.3, 3.8, 0.3), pl, { p: [(s * width) / 2, 0, 0], r: [0, 0, s * 0.03] });
    }
  }
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    pts.push(V3((t - 0.5) * width, 3.3 + Math.sin(t * Math.PI) * 1.0, 0));
  }
  k.b.add(S.tube(pts, 0.07, 5), col);
  for (const s of [-1, 1]) k.b.add(S.tube(curlPoints(V3(s * width * 0.18, 3.9, 0), V3(s, 0.3, 0).normalize(), V3(0, -1, 0), 0.35, 1.2, 10, 0.7), 0.04, 4), col);
  // lanternas penduradas perto dos pilares
  {
    for (const s of [-1, 1]) {
      const lx = s * (width / 2 - 0.9), ly = 3.35 + Math.sin(((s * (width / 2 - 0.9)) / width + 0.5) * Math.PI) * 1.0;
      k.b.add(S.cyl(0.008, 0.008, 0.5, 3), PAL.iron, { p: [lx, ly - 0.25, 0] });
      k.b.add(S.cone(0.14, 0.14, 6), PAL.iron, { p: [lx, ly - 0.52, 0] });
      k.b.add(S.cylB(0.1, 0.11, 0.05, 6), PAL.iron, { p: [lx, ly - 0.95, 0] });
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + 0.4;
        k.b.add(S.cyl(0.01, 0.01, 0.34, 3), PAL.iron, { p: [lx + Math.cos(a) * 0.1, ly - 0.76, Math.sin(a) * 0.1] });
      }
      k.g(GLOW.lamp).add(S.sphere(0.085, 8, 6), '#fff', { p: [lx, ly - 0.75, 0], s: [1, 1.3, 1] });
    }
  }
  const m = k.model('gate');
  for (const s of [-1, 1]) m.colliders.push({ type: 'box', x: (s * width) / 2, z: 0, hw: 0.35, hd: 0.35, rot: 0, y0: -1, y1: 4 });
  m.anchors.sign = V3(0, 3.55, 0.1);
  m.anchors.lanterns = [-1, 1].map((s) => {
    const lx = s * (width / 2 - 0.9);
    return V3(lx, 3.35 + Math.sin((lx / width + 0.5) * Math.PI) * 1.0 - 0.75, 0);
  });
  return m;
}

/** tábuas de píer/ponte/passarela seguindo as amostras do deck */
export function makeDeck(deck, terrain) {
  const b = new Builder();
  const sm = deck.samples;
  const rng = new RNG(sm.length * 7);
  const plank = 0.45;
  let acc = 0;
  const railPts = { l: [], r: [] };
  for (let i = 0; i < sm.length - 1; i++) {
    const a = sm[i], c = sm[i + 1];
    const seg = Math.hypot(c.x - a.x, c.z - a.z);
    const ang = Math.atan2(c.x - a.x, c.z - a.z);
    for (let s = 0; s < seg; s += plank) {
      const t = s / seg;
      const x = a.x + (c.x - a.x) * t, z = a.z + (c.z - a.z) * t;
      const tt = a.t + (c.t - a.t) * t;
      const h = deck.h + (deck.arch ? Math.sin(tt * Math.PI) * deck.arch : 0);
      const col = _c.set(PAL.wood).multiplyScalar(rng.range(0.75, 1.1));
      b.add(S.box(deck.w, 0.1, plank * 0.86), col.clone(), { p: [x, h - 0.05, z], r: [0, ang + rng.range(-0.03, 0.03), rng.range(-0.02, 0.02)] });
      acc += plank;
      if (acc > 2.2) {
        acc = 0;
        const gh = terrain.heightAt(x, z);
        const px = Math.cos(ang) * deck.w * 0.5, pz = -Math.sin(ang) * deck.w * 0.5;
        for (const sd of [-1, 1]) {
          const bx = x + px * sd, bz = z + pz * sd;
          const bottom = Math.min(gh, -0.5) - 0.5;
          b.add(S.cylB(0.1, 0.12, h - bottom + (deck.kind !== 'boardwalk' ? 1.0 : 0.3), 6), PAL.woodDark, { p: [bx, bottom, bz] });
          if (deck.kind !== 'boardwalk') railPts[sd < 0 ? 'l' : 'r'].push(V3(bx, h + 0.95, bz));
        }
      }
    }
  }
  for (const k of ['l', 'r']) {
    const p = railPts[k];
    if (p.length > 1) b.add(S.tube(p, 0.05, 4, { segments: p.length * 3 }), PAL.woodDark);
  }
  return new Model('deck').part(b.build());
}

/** A Colina Espiral: a grande curva enrolada (homenagem a "O Estranho Mundo de Jack"). */
export function makeSpiralHill() {
  const b = new Builder();
  const pts = [];
  // sobe como uma língua de terra e termina num caracol
  const base = [V3(-14, -1.5, 8), V3(-8, 1.5, 3), V3(-2, 6, 0), V3(2, 12, -1), V3(3.5, 17, -1.5)];
  pts.push(...base);
  const end = base[base.length - 1];
  const dir = V3(0.25, 1, -0.05).normalize();
  const perp = V3(1, -0.2, 0).normalize();
  pts.push(...curlPoints(end, dir, perp, 5.2, 1.55, 22, 0.86).slice(1));
  const col = new THREE.Color('#4d6a62'), top = new THREE.Color('#7a9a8a');
  b.add(S.tube(pts, (t) => (t < 0.35 ? 4.2 - t * 5 : Math.max(0.35, 2.5 * (1 - (t - 0.35) / 0.65) + 0.3)), 14, { segments: 120 }), (x, y) => _c.copy(col).lerp(top, clamp(y / 22, 0, 1)));
  // faixas em espiral mais escuras (textura de desenho)
  const m = new Model('spiralhill').part(b.build());
  m.colliders.push({ type: 'c', x: -8, z: 3, r: 4.5 }, { type: 'c', x: -2, z: 0, r: 3.5 }, { type: 'c', x: -13, z: 7.5, r: 3.5 });
  return m;
}

/** Pedra da Caveira (marco no oeste) — olhos brilham à noite */
export function makeSkullRock() {
  const k = new Kit();
  const stone = mossy('#7c7a86', 0.7, 3, 11);
  k.b.add(S.blob(4.2, 2, 0.08, 0.3, 5), stone, { p: [0, 3.6, 0], s: [1, 0.92, 1.05], flat: true });
  k.b.add(S.blob(2.6, 1, 0.1, 0.4, 7), stone, { p: [0, 1.2, 2.0], s: [1.2, 0.6, 1.0], flat: true });
  for (const s of [-1, 1]) {
    k.b.add(S.sphere(1.05, 12, 10), PAL.black, { p: [s * 1.5, 4.1, 3.2], s: [1, 1.15, 0.6] });
    k.g(GLOW.moonStone).add(S.sphere(0.35, 8, 6), '#fff', { p: [s * 1.5, 4.0, 3.6] });
  }
  k.b.add(S.cone(0.6, 1.0, 3), PAL.black, { p: [0, 2.9, 3.7], r: [Math.PI + 0.3, 0, 0] });
  for (let i = 0; i < 5; i++) k.b.add(S.boxB(0.5, 0.7, 0.4), PAL.stoneLight, { p: [-1.2 + i * 0.6, 1.3, 3.5 - Math.abs(i - 2) * 0.25], r: [0, (i - 2) * 0.2, 0] });
  const m = k.model('skullrock');
  m.colliders.push({ type: 'c', x: 0, z: 0.5, r: 4.3 });
  m.map = { r: 4.2, roof: '#8a8894', round: true };
  return m;
}

/** Ninho do avestruz demônio (galhos) */
export function makeNest() {
  const b = new Builder();
  const rng = new RNG(66);
  b.add(S.torus(1.3, 0.45, 7, 18), PAL.hayDark, { p: [0, 0.35, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.7] });
  for (let i = 0; i < 40; i++) {
    const a = rng.range(0, TAU), r = rng.range(0.9, 1.7);
    b.add(S.cyl(0.03, 0.03, rng.range(0.8, 1.6), 3), rng.pick([PAL.woodDark, PAL.hayDark, PAL.wood]), { p: [Math.cos(a) * r, 0.4 + rng.range(-0.1, 0.3), Math.sin(a) * r], r: [rng.range(-1.4, 1.4), a, Math.PI / 2 + rng.range(-0.4, 0.4)] });
  }
  b.add(S.disc(1.1, 14), '#5a4630', { p: [0, 0.18, 0], r: [-Math.PI / 2, 0, 0] });
  const m = new Model('nest').part(b.build());
  return m;
}

/** Braseiro (tripé + bacia) — o fogo é uma parte separada que acende na missão */
export function makeBrazier() {
  const b = new Builder();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    b.add(S.cyl(0.03, 0.03, 1.2, 4), PAL.iron, { p: [Math.cos(a) * 0.22, 0.55, Math.sin(a) * 0.22], r: [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35] });
  }
  b.add(S.lathe([[0, 0], [0.3, 0.02], [0.42, 0.22], [0.4, 0.26]], 10), PAL.iron, { p: [0, 1.05, 0] });
  const coals = new Builder();
  for (let i = 0; i < 6; i++) coals.add(S.ico(0.09, 0), '#fff', { p: [Math.cos(i) * 0.16, 1.24, Math.sin(i) * 0.16], flat: true });
  return { base: new Model('brazier').part(b.build()), coals: coals.build() };
}
