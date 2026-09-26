import * as THREE from 'three';
import { Builder, S, curlPoints } from '../../render/builder.js';
import { MAT, GLOW, SHARED, toonMat } from '../../render/toon.js';
import { LAYER_FX } from '../../render/postfx.js';
import { Model } from './batch.js';
import { PAL } from './palette.js';
import { RNG } from '../../util/rng.js';
import { TAU, lerp, clamp } from '../../util/math.js';
import { noise3 } from '../../util/noise.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const _c = new THREE.Color();
const _c2 = new THREE.Color();

/** cor que puxa para musgo embaixo e varia com ruído */
export function mossy(base, amount = 0.6, height = 0.35, seed = 0) {
  const b = new THREE.Color(base), moss = new THREE.Color(PAL.moss), dark = new THREE.Color(PAL.stoneDark);
  return (x, y, z) => {
    const n = noise3(x * 3 + seed, y * 3, z * 3) * 0.5 + 0.5;
    _c.copy(b).lerp(dark, n * 0.35);
    const m = clamp((height - y) / height, 0, 1) * amount * (0.4 + 0.6 * n);
    return _c.lerp(moss, m);
  };
}

export function gradY(bottom, top, y0, y1) {
  const a = new THREE.Color(bottom), b = new THREE.Color(top);
  return (x, y) => _c.copy(a).lerp(b, clamp((y - y0) / (y1 - y0), 0, 1));
}

// ---------------------------------------------------------------------------
export function makeRock(seed, size = 1) {
  const b = new Builder();
  const base = new THREE.Color(PAL.stone), dark = new THREE.Color(PAL.stoneDark), moss = new THREE.Color(PAL.moss);
  b.add(S.blob(size, 1, 0.3, 1.1 / size, seed * 3.1), (x, y, z) => {
    const n = noise3(x * 2 + seed, y * 2, z * 2) * 0.5 + 0.5;
    _c.copy(base).lerp(dark, n * 0.6);
    if (y > size * 0.25) _c.lerp(moss, clamp((y / size - 0.25) * 1.6, 0, 0.7) * n);
    return _c;
  }, { flat: true, s: [1, 0.62, 0.9], p: [0, size * 0.25, 0] });
  const m = new Model('rock').part(b.build());
  m.colliders.push({ type: 'c', x: 0, z: 0, r: size * 0.85 });
  return m;
}

// ---------------------------------------------------------------------------
function archShape(w, h) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, h - w / 2);
  s.absarc(0, h - w / 2, w / 2, 0, Math.PI, false);
  s.lineTo(-w / 2, 0);
  return s;
}

/** lápides: 0 arredondada, 1 cruz, 2 obelisco, 3 com caveira, 4 torta/quebrada, 5 cruz celta */
export function makeGrave(kind, seed = 1) {
  const rng = new RNG(seed * 13 + kind);
  const b = new Builder();
  const st = rng.pick([PAL.stone, PAL.stoneLight, '#8a8a96', '#7f8a86', PAL.stoneWarm]);
  const col = mossy(st, 0.7, 0.45, seed);
  b.add(S.boxB(0.82, 0.14, 0.42), mossy(PAL.stoneDark, 0.8, 0.3, seed));
  const eng = PAL.stoneDark;
  switch (kind) {
    case 0: {
      const w = rng.range(0.55, 0.7), h = rng.range(0.85, 1.1);
      b.add(S.extrude(archShape(w, h), 0.15, 10), col, { p: [0, 0.12, 0] });
      b.add(S.box(0.05, 0.28, 0.02), eng, { p: [0, h * 0.62, 0.08] });
      b.add(S.box(0.2, 0.05, 0.02), eng, { p: [0, h * 0.68, 0.08] });
      for (let i = 0; i < 3; i++) b.add(S.box(w * 0.55, 0.025, 0.02), eng, { p: [0, 0.3 + i * 0.09, 0.08] });
      break;
    }
    case 1: {
      b.add(S.boxB(0.14, 1.15, 0.12), col, { p: [0, 0.12, 0] });
      b.add(S.box(0.58, 0.13, 0.12), col, { p: [0, 0.95, 0] });
      break;
    }
    case 2: {
      b.add(S.boxB(0.5, 0.2, 0.5), col, { p: [0, 0.12, 0] });
      b.add(S.cylB(0.13, 0.21, 1.3, 4), col, { p: [0, 0.3, 0], r: [0, Math.PI / 4, 0] });
      b.add(S.cone(0.15, 0.24, 4), col, { p: [0, 1.72, 0], r: [0, Math.PI / 4, 0] });
      break;
    }
    case 3: {
      b.add(S.boxB(0.6, 0.8, 0.16), col, { p: [0, 0.12, 0] });
      b.add(S.sphere(0.16, 10, 8), PAL.boneDark, { p: [0, 1.05, 0], s: [1, 0.95, 1.05] });
      b.add(S.box(0.16, 0.08, 0.14), PAL.boneDark, { p: [0, 0.93, 0.03] });
      for (const s of [-1, 1]) b.add(S.sphere(0.045, 6, 5), PAL.black, { p: [s * 0.06, 1.06, 0.13] });
      b.add(S.box(0.4, 0.04, 0.02), eng, { p: [0, 0.6, 0.085] });
      break;
    }
    case 4: {
      const s = new THREE.Shape();
      s.moveTo(-0.32, 0); s.lineTo(0.32, 0); s.lineTo(0.3, 0.55); s.lineTo(0.12, 0.72); s.lineTo(0.02, 0.6); s.lineTo(-0.12, 0.8); s.lineTo(-0.32, 0.66);
      b.add(S.extrude(s, 0.15, 1), col, { p: [0, 0.12, 0], flat: true });
      b.add(S.box(0.3, 0.12, 0.14), col, { p: [0.45, 0.2, 0.2], r: [0.3, 0.5, 1.2], flat: true });
      break;
    }
    default: {
      b.add(S.boxB(0.15, 1.3, 0.13), col, { p: [0, 0.12, 0] });
      b.add(S.box(0.6, 0.14, 0.13), col, { p: [0, 1.05, 0] });
      b.add(S.torus(0.2, 0.04, 5, 16), col, { p: [0, 1.05, 0] });
      break;
    }
  }
  // terra da cova
  b.add(S.sphere(0.5, 10, 6), PAL.dirt, { p: [0, -0.16, 0.95], s: [0.85, 0.38, 1.55] });
  const m = new Model('grave').part(b.build());
  m.colliders.push({ type: 'box', x: 0, z: 0, hw: 0.42, hd: 0.22, rot: 0 });
  return m;
}

// ---------------------------------------------------------------------------
export function makeIronFence(L = 2.4, h = 1.35, seed = 0) {
  const rng = new RNG(seed + 77);
  const b = new Builder();
  const bars = Math.round(L / 0.24);
  for (let i = 0; i < bars; i++) {
    const x = -L / 2 + ((i + 0.5) * L) / bars;
    const tilt = rng.range(-0.06, 0.06);
    const hh = h + (i % 2 ? 0 : 0.12) + rng.range(-0.06, 0.06);
    b.add(S.cylB(0.02, 0.022, hh, 5), PAL.iron, { p: [x, 0, 0], r: [0, 0, tilt] });
    b.add(S.cone(0.045, 0.15, 4), PAL.iron, { p: [x - Math.sin(tilt) * hh, hh + 0.06, 0] });
  }
  b.add(S.box(L, 0.05, 0.05), PAL.iron, { p: [0, 0.22, 0] });
  b.add(S.box(L, 0.05, 0.05), PAL.iron, { p: [0, h - 0.22, 0] });
  for (let i = 0; i < bars - 1; i += 2) {
    const x = -L / 2 + ((i + 1) * L) / bars;
    b.add(S.torus(0.06, 0.012, 3, 10), PAL.iron, { p: [x, h - 0.36, 0] });
  }
  return new Model('ironfence').part(b.build());
}

export function makePillar(seed = 0, finial = 'ball', h = 1.7) {
  const rng = new RNG(seed);
  const b = new Builder();
  const col = mossy(PAL.stone, 0.6, 0.6, seed);
  b.add(S.boxB(0.5, 0.2, 0.5), col);
  b.add(S.boxB(0.4, h - 0.3, 0.4), col, { p: [0, 0.2, 0] });
  b.add(S.boxB(0.54, 0.12, 0.54), col, { p: [0, h - 0.1, 0] });
  if (finial === 'ball') b.add(S.sphere(0.18, 10, 8), col, { p: [0, h + 0.2, 0] });
  else if (finial === 'skull') {
    b.add(S.sphere(0.17, 10, 8), PAL.boneDark, { p: [0, h + 0.2, 0], s: [1, 0.95, 1.1] });
    for (const s of [-1, 1]) b.add(S.sphere(0.045, 6, 5), PAL.black, { p: [s * 0.065, h + 0.22, 0.14] });
    b.add(S.box(0.16, 0.08, 0.14), PAL.boneDark, { p: [0, h + 0.07, 0.04] });
  } else if (finial === 'pumpkin') {
    b.add(S.pumpkin(0.2, 8, 12, 8), PAL.pumpkin, { p: [0, h + 0.18, 0] });
  }
  const m = new Model('pillar').part(b.build());
  m.colliders.push({ type: 'box', x: 0, z: 0, hw: 0.28, hd: 0.28, rot: 0 });
  return m;
}

export function makePicketFence(L = 2.2, seed = 0, color = PAL.woodPale) {
  const rng = new RNG(seed + 5);
  const b = new Builder();
  const n = Math.round(L / 0.26);
  const c0 = new THREE.Color(color);
  for (let i = 0; i < n; i++) {
    const x = -L / 2 + ((i + 0.5) * L) / n;
    const h = rng.range(0.8, 1.05);
    const tilt = rng.range(-0.1, 0.1);
    const cc = c0.clone().multiplyScalar(rng.range(0.8, 1.05));
    b.add(S.boxB(0.11, h, 0.035), cc, { p: [x, 0, 0], r: [rng.range(-0.05, 0.05), 0, tilt] });
    b.add(S.cone(0.08, 0.14, 4), cc, { p: [x - Math.sin(tilt) * h, h + 0.06, 0], r: [0, Math.PI / 4, 0], s: [1, 1, 0.45] });
  }
  b.add(S.box(L, 0.07, 0.04), PAL.woodDark, { p: [0, 0.28, -0.03] });
  b.add(S.box(L, 0.07, 0.04), PAL.woodDark, { p: [0, 0.68, -0.03], r: [0, 0, rng.range(-0.03, 0.03)] });
  return new Model('picket').part(b.build());
}

export function makeWoodFence(L = 2.6, seed = 0) {
  const rng = new RNG(seed + 9);
  const b = new Builder();
  for (const x of [-L / 2, L / 2]) b.add(S.boxB(0.14, 1.15, 0.14), PAL.woodDark, { p: [x, 0, 0], r: [0, 0, rng.range(-0.08, 0.08)] });
  for (const y of [0.45, 0.9]) b.add(S.box(L + 0.2, 0.12, 0.06), PAL.wood, { p: [0, y + rng.range(-0.05, 0.05), 0], r: [0, 0, rng.range(-0.06, 0.06)] });
  return new Model('woodfence').part(b.build());
}

// ---------------------------------------------------------------------------
/** poste curvo tipo "cajado" com lanterna pendurada */
export function makeLampPost(seed = 0) {
  const rng = new RNG(seed + 31);
  const b = new Builder();
  const g = new Builder();
  b.add(S.cylB(0.28, 0.36, 0.35, 8), mossy(PAL.stone, 0.5, 0.35), { flat: true });
  const pts = [V3(0, 0.3, 0), V3(0.03, 1.6, 0), V3(-0.04, 2.9, 0), V3(0.04, 3.7, 0), V3(0.3, 4.1, 0), V3(0.66, 4.02, 0), V3(0.8, 3.78, 0)];
  b.add(S.tube(pts, (t) => lerp(0.075, 0.035, t), 6, { step: 0.25 }), PAL.iron);
  b.add(S.tube(curlPoints(V3(0.02, 2.4, 0), V3(-1, 0.4, 0).normalize(), V3(0, 1, 0), 0.22, 1.2, 10, 0.75), (t) => 0.03 * (1 - t * 0.6), 4), PAL.iron);
  b.add(S.torus(0.09, 0.02, 4, 10), PAL.iron, { p: [0.03, 1.2, 0], r: [Math.PI / 2, 0, 0] });
  const lx = 0.8, ly = 3.42;
  b.add(S.cone(0.2, 0.2, 6), PAL.iron, { p: [lx, ly + 0.28, 0] });
  b.add(S.cylB(0.13, 0.15, 0.06, 6), PAL.iron, { p: [lx, ly - 0.22, 0] });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    b.add(S.cyl(0.012, 0.012, 0.42, 3), PAL.iron, { p: [lx + Math.cos(a) * 0.14, ly, Math.sin(a) * 0.14] });
  }
  b.add(S.cone(0.04, 0.12, 4), PAL.iron, { p: [lx, ly - 0.3, 0], r: [Math.PI, 0, 0] });
  g.add(S.sphere(0.12, 10, 8), '#fff', { p: [lx, ly, 0], s: [1, 1.25, 1] });
  const m = new Model('lamp').part(b.build()).part(g.build(), GLOW.lamp, { cast: false });
  m.anchors.light = V3(lx, ly, 0);
  m.colliders.push({ type: 'c', x: 0, z: 0, r: 0.35 });
  return m;
}

// ---------------------------------------------------------------------------
export function makeBench(seed = 0) {
  const b = new Builder();
  for (let i = 0; i < 3; i++) b.add(S.box(1.8, 0.05, 0.13), PAL.wood, { p: [0, 0.48, -0.16 + i * 0.16] });
  for (let i = 0; i < 2; i++) b.add(S.box(1.8, 0.12, 0.04), PAL.wood, { p: [0, 0.72 + i * 0.2, -0.3], r: [-0.18, 0, 0] });
  for (const x of [-0.75, 0.75]) {
    b.add(S.tube([V3(x, 0, 0.2), V3(x, 0.45, 0.15), V3(x, 0.48, -0.2), V3(x, 1.0, -0.36)], 0.03, 4), PAL.iron);
    b.add(S.tube([V3(x, 0, -0.25), V3(x, 0.44, -0.2)], 0.03, 4), PAL.iron);
    b.add(S.tube(curlPoints(V3(x, 0.45, 0.18), V3(0, 0, 1), V3(0, -1, 0), 0.08, 1.0, 8, 0.6), 0.02, 4), PAL.iron);
  }
  const m = new Model('bench').part(b.build());
  m.colliders.push({ type: 'box', x: 0, z: 0, hw: 0.95, hd: 0.3, rot: 0 });
  return m;
}

export function makeBarrel(seed = 0) {
  const b = new Builder();
  const prof = [[0, 0], [0.3, 0], [0.36, 0.2], [0.38, 0.45], [0.36, 0.7], [0.3, 0.9], [0, 0.9]];
  b.add(S.lathe(prof, 12), PAL.wood);
  for (const y of [0.14, 0.76]) b.add(S.torus(y < 0.5 ? 0.345 : 0.335, 0.018, 3, 14), PAL.iron, { p: [0, y, 0], r: [Math.PI / 2, 0, 0] });
  b.add(S.disc(0.3, 12), PAL.woodDark, { p: [0, 0.905, 0], r: [-Math.PI / 2, 0, 0] });
  const m = new Model('barrel').part(b.build());
  m.colliders.push({ type: 'c', x: 0, z: 0, r: 0.4 });
  return m;
}

export function makeCrate(seed = 0) {
  const b = new Builder();
  const s = 0.72;
  b.add(S.boxB(s, s, s), PAL.woodLight);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.add(S.boxB(0.08, s + 0.01, 0.08), PAL.woodDark, { p: [(x * s) / 2, 0, (z * s) / 2] });
  for (const y of [0.04, s - 0.04]) {
    b.add(S.box(s + 0.02, 0.07, 0.08), PAL.woodDark, { p: [0, y, s / 2] });
    b.add(S.box(s + 0.02, 0.07, 0.08), PAL.woodDark, { p: [0, y, -s / 2] });
    b.add(S.box(0.08, 0.07, s + 0.02), PAL.woodDark, { p: [s / 2, y, 0] });
    b.add(S.box(0.08, 0.07, s + 0.02), PAL.woodDark, { p: [-s / 2, y, 0] });
  }
  b.add(S.box(0.06, s * 1.3, 0.03), PAL.woodDark, { p: [0, s / 2, s / 2 + 0.02], r: [0, 0, 0.78] });
  const m = new Model('crate').part(b.build());
  m.colliders.push({ type: 'box', x: 0, z: 0, hw: 0.4, hd: 0.4, rot: 0 });
  return m;
}

// ---------------------------------------------------------------------------
/** abóbora; jack=true adiciona rosto brilhante */
export function makePumpkin(seed = 0, r = 0.4, jack = false) {
  const rng = new RNG(seed + 400);
  const b = new Builder();
  const g = new Builder();
  const col = new THREE.Color(PAL.pumpkin).lerp(new THREE.Color(rng.pick(['#e8a040', '#c85a20', '#d88a3a'])), rng.range(0, 0.6));
  const dark = col.clone().multiplyScalar(0.7);
  b.add(S.pumpkin(r, rng.int(7, 9), 18, 12), (x, y, z) => _c.copy(dark).lerp(col, clamp(0.5 + y / r, 0, 1)), { p: [0, r * 0.72, 0] });
  const sh = r * rng.range(0.28, 0.45);
  b.add(S.tube([V3(0, r * 1.35, 0), V3(0.02, r * 1.35 + sh * 0.6, 0.01), V3(r * 0.12, r * 1.35 + sh, 0.03)], (t) => r * 0.07 * (1 - t * 0.4), 5), PAL.stem);
  if (rng.chance(0.6)) b.add(S.tube(curlPoints(V3(0.02, r * 1.38, 0), V3(1, 0.2, 0.3).normalize(), V3(0, 1, 0), r * 0.25, 1.3, 8, 0.7), r * 0.015, 3), '#5a7a2a');
  if (jack) {
    const zf = r * 0.97;
    const eye = (sx) => {
      const s = [[-0.09, 0], [0.09, 0], [0.0, 0.12]].map(([x, y]) => [x * r * 2.2, y * r * 2.2]);
      g.add(S.extrude(s, 0.03, 1), '#fff', { p: [sx * r * 0.32, r * 0.88, zf * 0.93], r: [-0.25, sx * 0.32, 0] });
    };
    eye(-1);
    eye(1);
    const mouth = [];
    const W = r * 0.62, H = r * 0.22;
    mouth.push([-W, 0.05 * r]);
    for (let i = 0; i <= 6; i++) {
      const x = -W + (i / 6) * 2 * W;
      mouth.push([x, (i % 2 ? -H * 0.2 : H * 0.35) - Math.abs(x / W) * -H * 0.3]);
    }
    mouth.push([W, 0.05 * r]);
    for (let i = 6; i >= 0; i--) {
      const x = -W + (i / 6) * 2 * W;
      mouth.push([x, -H - (1 - Math.abs(x / W)) * H * 0.6 + (i % 2 ? H * 0.25 : 0)]);
    }
    g.add(S.extrude(mouth, 0.03, 1), '#fff', { p: [0, r * 0.52, zf * 0.92], r: [0.22, 0, 0] });
  }
  const m = new Model('pumpkin').part(b.build());
  if (jack) m.part(g.build(), GLOW.jack, { cast: false });
  m.colliders.push({ type: 'c', x: 0, z: 0, r: r * 0.9 });
  return m;
}

// ---------------------------------------------------------------------------
export function makeMushroom(seed = 0, glow = null) {
  const rng = new RNG(seed + 90);
  const b = new Builder();
  const g = new Builder();
  const n = rng.int(1, 4);
  for (let i = 0; i < n; i++) {
    const s = i === 0 ? 1 : rng.range(0.45, 0.8);
    const x = i === 0 ? 0 : rng.range(-0.25, 0.25), z = i === 0 ? 0 : rng.range(-0.25, 0.25);
    const h = rng.range(0.16, 0.34) * s, cr = rng.range(0.11, 0.2) * s;
    const tilt = rng.range(-0.25, 0.25);
    b.add(S.cylB(0.028 * s, 0.045 * s, h, 6), PAL.cream, { p: [x, 0, z], r: [tilt, 0, tilt * 0.5] });
    const capCol = glow ? '#fff' : rng.pick(['#b8343a', '#8a4a3a', '#7a4a8a', '#c86a3a']);
    const target = glow ? g : b;
    target.add(S.hemi(cr, 10, 5), capCol, { p: [x + tilt * 0.5 * h, h * 0.95, z - tilt * h], s: [1, 0.62, 1], r: [tilt, 0, tilt * 0.5] });
    if (!glow) for (let k = 0; k < 4; k++) {
      const a = rng.range(0, TAU), d = rng.range(0.2, 0.7) * cr;
      b.add(S.sphere(cr * 0.14, 5, 4), PAL.white, { p: [x + Math.cos(a) * d, h * 0.95 + cr * 0.5 * (1 - d / cr), z + Math.sin(a) * d] });
    }
  }
  const m = new Model('mushroom').part(b.build());
  if (glow) m.part(g.build(), glow, { cast: false });
  return m;
}

export function makeCandles(seed = 0, n = 3) {
  const rng = new RNG(seed + 60);
  const b = new Builder();
  const g = new Builder();
  for (let i = 0; i < n; i++) {
    const a = rng.range(0, TAU), d = i === 0 ? 0 : rng.range(0.08, 0.16);
    const x = Math.cos(a) * d, z = Math.sin(a) * d, h = rng.range(0.12, 0.34);
    b.add(S.cylB(0.035, 0.038, h, 7), PAL.wax, { p: [x, 0, z] });
    b.add(S.sphere(0.02, 5, 4), PAL.wax, { p: [x + 0.03, h * 0.7, z], s: [1, 1.8, 1] });
    b.add(S.cylB(0.004, 0.004, 0.03, 3), PAL.black, { p: [x, h, z] });
    g.add(S.sphere(0.026, 6, 5), '#fff', { p: [x, h + 0.05, z], s: [0.7, 1.5, 0.7] });
  }
  return new Model('candles').part(b.build()).part(g.build(), GLOW.candle, { cast: false });
}

export function makeSkull(seed = 0, s = 1) {
  const b = new Builder();
  b.add(S.sphere(0.12 * s, 10, 8), PAL.bone, { p: [0, 0.12 * s, 0], s: [1, 0.92, 1.12] });
  b.add(S.box(0.13 * s, 0.07 * s, 0.1 * s), PAL.boneDark, { p: [0, 0.035 * s, 0.07 * s] });
  for (const k of [-1, 1]) b.add(S.sphere(0.035 * s, 6, 5), PAL.black, { p: [k * 0.047 * s, 0.13 * s, 0.1 * s] });
  b.add(S.cone(0.018 * s, 0.03 * s, 3), PAL.black, { p: [0, 0.085 * s, 0.125 * s], r: [Math.PI, 0, 0] });
  return new Model('skull').part(b.build());
}

export function makeBonePile(seed = 0) {
  const rng = new RNG(seed + 3);
  const b = new Builder();
  for (let i = 0; i < 5; i++) {
    const L = rng.range(0.3, 0.55);
    const a = rng.range(0, TAU);
    const t = { p: [rng.range(-0.3, 0.3), 0.05, rng.range(-0.3, 0.3)], r: [Math.PI / 2, 0, a] };
    b.add(S.cyl(0.025, 0.025, L, 5), PAL.bone, t);
    const dx = Math.sin(a) * L * 0.5, dz = Math.cos(a) * L * 0.5;
    for (const k of [-1, 1]) {
      b.add(S.sphere(0.04, 6, 5), PAL.bone, { p: [t.p[0] - dx * k, 0.05, t.p[2] + dz * k] });
    }
  }
  const sk = makeSkull(seed, 0.9);
  b.addBuilder({ parts: [sk.parts[0].geo] }, new THREE.Matrix4().makeTranslation(0.1, 0.02, 0.05));
  return new Model('bones').part(b.build());
}

// ---------------------------------------------------------------------------
export function makeCattails(seed = 0) {
  const rng = new RNG(seed + 20);
  const b = new Builder();
  const n = rng.int(4, 7);
  for (let i = 0; i < n; i++) {
    const x = rng.range(-0.35, 0.35), z = rng.range(-0.35, 0.35), h = rng.range(1.0, 1.7), tilt = rng.range(-0.15, 0.15);
    b.add(S.cylB(0.012, 0.016, h, 4), '#5a6a3a', { p: [x, -0.1, z], r: [tilt, 0, tilt] });
    if (rng.chance(0.7)) b.add(S.capsule(0.035, 0.18, 2, 6), '#5a3a26', { p: [x + tilt * h, h - 0.12, z - tilt * h], r: [tilt, 0, tilt] });
  }
  for (let i = 0; i < 5; i++) {
    const a = rng.range(0, TAU);
    b.add(S.cone(0.03, rng.range(0.7, 1.2), 3), '#4d6a34', { p: [Math.cos(a) * 0.15, 0.35, Math.sin(a) * 0.15], r: [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35], s: [1, 1, 0.3] });
  }
  return new Model('cattails').part(b.build());
}

export function makeLilyPad(seed = 0) {
  const rng = new RNG(seed + 50);
  const b = new Builder();
  const r = rng.range(0.35, 0.7);
  b.add(new THREE.CircleGeometry(r, 14, 0.35, TAU - 0.7), rng.pick(['#4a6a3a', '#5a7a3a', '#3f5f3a']), { r: [-Math.PI / 2, 0, rng.range(0, TAU)], p: [0, 0.03, 0] });
  if (rng.chance(0.3)) {
    const fc = rng.pick(['#e8a8c8', '#f0e8f0', '#d8a0e0']);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      b.add(S.cone(0.05, 0.14, 4), fc, { p: [Math.cos(a) * 0.05, 0.1, Math.sin(a) * 0.05], r: [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6] });
    }
    b.add(S.sphere(0.04, 6, 5), '#f0d060', { p: [0, 0.1, 0] });
  }
  return new Model('lily').part(b.build(), MAT.vcDouble);
}

export function makeLog(seed = 0) {
  const rng = new RNG(seed + 70);
  const b = new Builder();
  const L = rng.range(2.2, 3.6), r = rng.range(0.22, 0.35);
  b.add(S.tube([V3(-L / 2, r, 0), V3(0, r + 0.05, 0.1), V3(L / 2, r, 0)], r, 8, { segments: 6 }), gradY(PAL.bark, PAL.barkLight, 0, r * 2));
  for (const s of [-1, 1]) {
    b.add(S.disc(r * 0.98, 10), '#8a6a4a', { p: [(s * L) / 2, r, 0], r: [0, (s * Math.PI) / 2, 0] });
    b.add(S.ring(r * 0.35, r * 0.45, 10), '#6a4a34', { p: [(s * L) / 2 + s * 0.005, r, 0], r: [0, (s * Math.PI) / 2, 0] });
  }
  const mush = makeMushroom(seed);
  b.addBuilder({ parts: [mush.parts[0].geo] }, new THREE.Matrix4().makeTranslation(rng.range(-0.5, 0.5), r * 1.8, 0.05));
  const m = new Model('log').part(b.build());
  m.colliders.push({ type: 'box', x: 0, z: 0, hw: L / 2, hd: r, rot: 0 });
  return m;
}

export function makeStump(seed = 0) {
  const rng = new RNG(seed + 80);
  const b = new Builder();
  const r = rng.range(0.32, 0.5);
  b.add(S.cylB(r, r * 1.25, 0.55, 10), gradY(PAL.bark, PAL.barkLight, 0, 0.55));
  b.add(S.disc(r * 0.98, 10), '#8a6a4a', { p: [0, 0.555, 0], r: [-Math.PI / 2, 0, 0] });
  for (const k of [0.35, 0.65]) b.add(S.ring(r * k, r * k + 0.02, 12), '#6a4a34', { p: [0, 0.558, 0], r: [-Math.PI / 2, 0, 0] });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + rng.range(0, 1);
    b.add(S.tube([V3(Math.cos(a) * r, 0.2, Math.sin(a) * r), V3(Math.cos(a) * r * 1.8, 0.02, Math.sin(a) * r * 1.8)], (t) => 0.1 * (1 - t * 0.7), 5), PAL.bark);
  }
  const m = new Model('stump').part(b.build());
  m.colliders.push({ type: 'c', x: 0, z: 0, r: r + 0.1 });
  return m;
}

export function makeBush(seed = 0, dead = false) {
  const rng = new RNG(seed + 110);
  const b = new Builder();
  if (dead) {
    for (let i = 0; i < 7; i++) {
      const a = rng.range(0, TAU), h = rng.range(0.6, 1.3);
      const dir = V3(Math.cos(a) * 0.5, 1, Math.sin(a) * 0.5).normalize();
      const end = dir.clone().multiplyScalar(h);
      const pts = [V3(0, 0, 0), dir.clone().multiplyScalar(h * 0.5).add(V3(rng.range(-0.1, 0.1), 0, rng.range(-0.1, 0.1))), end];
      const perp = V3(-dir.z, 0, dir.x).normalize();
      pts.push(...curlPoints(end, dir, perp, 0.12, 1.1, 6, 0.7).slice(1));
      b.add(S.tube(pts, (t) => 0.035 * (1 - t * 0.8), 4), PAL.bark);
    }
  } else {
    const col = new THREE.Color(rng.pick(['#35524a', '#3d4a5a', '#48583a', '#4a3a58']));
    for (let i = 0; i < 5; i++) {
      const s = rng.range(0.45, 0.75);
      b.add(S.blob(s, 1, 0.22, 1.5, seed + i), (x, y, z) => _c.copy(col).multiplyScalar(0.75 + 0.3 * clamp(y + 0.3, 0, 1)), {
        flat: true, p: [rng.range(-0.5, 0.5), s * 0.7, rng.range(-0.5, 0.5)], s: [1, 0.8, 1],
      });
    }
  }
  const m = new Model(dead ? 'deadbush' : 'bush').part(b.build());
  m.colliders.push({ type: 'c', x: 0, z: 0, r: dead ? 0.35 : 0.8 });
  return m;
}

// ---------------------------------------------------------------------------
/** tufos de grama: material com vento (sem contorno) */
export const grassMat = (() => {
  const m = toonMat({ vertexColors: true, side: THREE.DoubleSide });
  m.onBeforeCompile = (s) => {
    s.uniforms.uTime = SHARED.uTime;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nattribute float sway;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 gw = vec4( transformed, 1.0 );
        #ifdef USE_INSTANCING
          gw = instanceMatrix * gw;
        #endif
        gw = modelMatrix * gw;
        float ph = gw.x * 0.31 + gw.z * 0.23 + uTime * 1.6;
        float wv = sin( ph ) * 0.6 + sin( ph * 2.3 + 1.3 ) * 0.3;
        transformed.x += wv * sway * 0.13;
        transformed.z += cos( ph * 0.7 ) * sway * 0.07;`
      );
  };
  m.customProgramCacheKey = () => 'grass-v1';
  return m;
})();

export function makeGrassTuft(seed = 0, tall = false) {
  const rng = new RNG(seed + 300);
  const b = new Builder();
  const n = rng.int(5, 8);
  // tons de cinza: a cor real vem da instância (cor do terreno embaixo)
  const base = new THREE.Color('#9a9a9a'), tip = new THREE.Color(tall ? '#ffffe0' : '#f4fff0');
  for (let i = 0; i < n; i++) {
    const a = rng.range(0, TAU), d = rng.range(0, 0.12);
    const h = rng.range(0.25, 0.5) * (tall ? 1.9 : 1);
    const lean = rng.range(0.15, 0.55);
    b.add(S.cone(0.045, h, 3), (x, y) => _c.copy(base).lerp(tip, clamp(y / h + 0.5, 0, 1)), {
      p: [Math.cos(a) * d, h / 2, Math.sin(a) * d], r: [Math.sin(a) * lean, rng.range(0, TAU), -Math.cos(a) * lean], s: [1, 1, 0.25],
      sway: (y) => clamp(y / h, 0, 1),
    });
  }
  return new Model('grass').part(b.build(), grassMat, { cast: false, layer: LAYER_FX });
}

export function makeFlowers(seed = 0) {
  const rng = new RNG(seed + 330);
  const b = new Builder();
  const cols = ['#8a4a9a', '#c86a3a', '#d8d0e0', '#b83a5a', '#e0b040'];
  const n = rng.int(3, 6);
  for (let i = 0; i < n; i++) {
    const x = rng.range(-0.25, 0.25), z = rng.range(-0.25, 0.25), h = rng.range(0.25, 0.55);
    const tilt = rng.range(-0.3, 0.3);
    b.add(S.cylB(0.008, 0.01, h, 3), '#4a5a34', { p: [x, 0, z], r: [tilt, 0, tilt * 0.6], sway: (y) => y / h });
    b.add(S.sphere(0.045, 6, 5), rng.pick(cols), { p: [x + tilt * 0.6 * h, h, z - tilt * h], s: [1, 0.7, 1], sway: 1 });
  }
  return new Model('flowers').part(b.build(), grassMat, { cast: false, layer: LAYER_FX });
}

// ---------------------------------------------------------------------------
export function coffinPts(w, h) {
  return [[0, -h / 2], [w * 0.32, -h / 2], [w / 2, h * 0.2], [w * 0.34, h / 2], [-w * 0.34, h / 2], [-w / 2, h * 0.2], [-w * 0.32, -h / 2]];
}

export function makeCoffin(seed = 0) {
  const rng = new RNG(seed);
  const b = new Builder();
  const col = rng.pick([PAL.woodDark, PAL.wood, '#4a3040']);
  b.add(S.extrude(coffinPts(0.72, 1.95), 0.34, 1), col, { p: [0, 0.98, 0], flat: true });
  b.add(S.box(0.06, 0.6, 0.02), PAL.mustard, { p: [0, 1.25, 0.18] });
  b.add(S.box(0.34, 0.06, 0.02), PAL.mustard, { p: [0, 1.38, 0.18] });
  const m = new Model('coffin').part(b.build());
  m.colliders.push({ type: 'box', x: 0, z: 0, hw: 0.38, hd: 0.2, rot: 0 });
  return m;
}

export function makeCauldron(seed = 0, liquid = GLOW.toxic) {
  const b = new Builder();
  const g = new Builder();
  b.add(S.lathe([[0, 0.12], [0.3, 0.1], [0.55, 0.3], [0.62, 0.55], [0.56, 0.78], [0.5, 0.82]], 16), PAL.iron);
  b.add(S.torus(0.52, 0.05, 5, 16), PAL.ironHi, { p: [0, 0.82, 0], r: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    b.add(S.cyl(0.04, 0.03, 0.3, 5), PAL.iron, { p: [Math.cos(a) * 0.38, 0.12, Math.sin(a) * 0.38], r: [Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3] });
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.4;
    b.add(S.cyl(0.06, 0.06, 0.8, 5), PAL.woodDark, { p: [Math.cos(a) * 0.15, 0.06, Math.sin(a) * 0.15], r: [Math.PI / 2, a, 0] });
  }
  g.add(S.disc(0.5, 16), '#fff', { p: [0, 0.74, 0], r: [-Math.PI / 2, 0, 0] });
  for (let i = 0; i < 5; i++) g.add(S.sphere(0.06 + i * 0.01, 6, 5), '#fff', { p: [Math.cos(i * 2.1) * 0.25, 0.76, Math.sin(i * 2.1) * 0.25], s: [1, 0.5, 1] });
  const fire = new Builder();
  for (let i = 0; i < 3; i++) fire.add(S.cone(0.12 - i * 0.02, 0.35, 5), '#fff', { p: [Math.cos(i * 2.1) * 0.1, 0.18, Math.sin(i * 2.1) * 0.1] });
  const m = new Model('cauldron').part(b.build()).part(g.build(), liquid, { cast: false }).part(fire.build(), GLOW.lava, { cast: false });
  m.colliders.push({ type: 'c', x: 0, z: 0, r: 0.7 });
  m.anchors.top = V3(0, 0.8, 0);
  return m;
}

export function makeWell(seed = 0) {
  const b = new Builder();
  b.add(S.cylB(1.0, 1.05, 0.9, 14, true), mossy(PAL.stone, 0.6, 0.5));
  b.add(S.cylB(0.85, 0.85, 0.9, 14, true), PAL.stoneDark);
  b.add(S.torus(0.93, 0.1, 5, 16), PAL.stoneLight, { p: [0, 0.9, 0], r: [Math.PI / 2, 0, 0] });
  b.add(S.disc(0.86, 14), '#101418', { p: [0, 0.4, 0], r: [-Math.PI / 2, 0, 0] });
  for (const x of [-0.95, 0.95]) b.add(S.boxB(0.14, 2.2, 0.14), PAL.woodDark, { p: [x, 0.8, 0], r: [0, 0, x * -0.04] });
  b.add(S.cyl(0.07, 0.07, 2.1, 6), PAL.wood, { p: [0, 2.3, 0], r: [0, 0, Math.PI / 2] });
  for (const s of [-1, 1]) b.add(S.box(1.4, 0.08, 2.4), PAL.roofs[0], { p: [s * 0.62, 3.05, 0], r: [0, 0, s * -0.62] });
  b.add(S.cyl(0.01, 0.01, 1.0, 3), PAL.ink, { p: [0, 1.8, 0] });
  b.add(S.cylB(0.16, 0.13, 0.26, 8), PAL.wood, { p: [0, 1.2, 0] });
  const m = new Model('well').part(b.build());
  m.colliders.push({ type: 'c', x: 0, z: 0, r: 1.15 });
  return m;
}

export function makeHayBale(seed = 0, round = true) {
  const b = new Builder();
  if (round) {
    b.add(S.cyl(0.62, 0.62, 1.1, 14), (x, y, z) => _c.set(PAL.hay).lerp(_c2.set(PAL.hayDark), Math.abs(Math.sin(Math.atan2(y, z) * 6)) * 0.4), { p: [0, 0.62, 0], r: [0, 0, Math.PI / 2] });
    for (const x of [-0.25, 0.25]) b.add(S.torus(0.63, 0.02, 3, 16), PAL.hayDark, { p: [x, 0.62, 0], r: [0, Math.PI / 2, 0] });
  } else {
    b.add(S.boxB(1.2, 0.6, 0.7), PAL.hay);
    for (const x of [-0.3, 0.3]) b.add(S.box(0.04, 0.62, 0.72), PAL.hayDark, { p: [x, 0.3, 0] });
  }
  const m = new Model('hay').part(b.build());
  m.colliders.push({ type: 'box', x: 0, z: 0, hw: round ? 0.6 : 0.62, hd: round ? 0.62 : 0.37, rot: 0 });
  return m;
}

export function makeCart(seed = 0) {
  const b = new Builder();
  b.add(S.boxB(1.8, 0.5, 1.1), PAL.wood, { p: [0, 0.55, 0], r: [0, 0, 0.12] });
  b.add(S.boxB(1.9, 0.08, 1.2), PAL.woodDark, { p: [0, 0.52, 0], r: [0, 0, 0.12] });
  for (const z of [-0.62, 0.62]) {
    b.add(S.torus(0.45, 0.05, 5, 14), PAL.woodDark, { p: [0.2, 0.46, z] });
    for (let i = 0; i < 4; i++) b.add(S.box(0.86, 0.04, 0.04), PAL.woodDark, { p: [0.2, 0.46, z], r: [0, 0, (i * Math.PI) / 4] });
  }
  for (const z of [-0.4, 0.4]) b.add(S.cyl(0.035, 0.035, 1.4, 5), PAL.woodDark, { p: [-1.45, 0.4, z], r: [0, 0, 1.3] });
  const pk = makePumpkin(7, 0.3);
  b.addBuilder({ parts: [pk.parts[0].geo] }, new THREE.Matrix4().makeTranslation(0.3, 1.05, 0.1));
  const m = new Model('cart').part(b.build());
  m.colliders.push({ type: 'box', x: 0, z: 0, hw: 1.2, hd: 0.7, rot: 0 });
  return m;
}
