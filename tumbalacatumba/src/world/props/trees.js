import * as THREE from 'three';
import { Builder, S, curlPoints } from '../../render/builder.js';
import { GLOW } from '../../render/toon.js';
import { LAYER_FX } from '../../render/postfx.js';
import { Model } from './batch.js';
import { PAL } from './palette.js';
import { grassMat, gradY } from './small.js';
import { RNG } from '../../util/rng.js';
import { TAU, clamp } from '../../util/math.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const _c = new THREE.Color();
const UP = V3(0, 1, 0);

function hookPerp(dir) {
  // perpendicular apontando "para baixo" — faz o gancho enrolar para fora e para baixo
  const down = V3(0, -1, 0);
  const p = down.sub(dir.clone().multiplyScalar(dir.dot(down)));
  if (p.lengthSq() < 1e-4) p.set(1, 0, 0);
  return p.normalize();
}

/** Árvore morta retorcida com pontas em espiral. face=true: buracos de olhos que brilham à noite. */
export function makeDeadTree(seed, scale = 1, face = false) {
  const rng = new RNG(seed * 7 + 1);
  const b = new Builder();
  const g = new Builder();
  const H = rng.range(5.5, 8.5) * scale;
  const r0 = rng.range(0.28, 0.4) * scale;
  const lx = rng.range(-0.2, 0.2), lz = rng.range(-0.2, 0.2);
  const tw = rng.range(0.6, 1.4), ph = rng.range(0, TAU), wob = rng.range(0.3, 0.75) * scale;
  const trunk = [];
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    trunk.push(V3(Math.sin(t * 5 * tw + ph) * wob * t + lx * t * H, t * H - 0.3, Math.cos(t * 4 * tw + ph) * wob * t + lz * t * H));
  }
  const tipDir = trunk[n].clone().sub(trunk[n - 1]).normalize();
  const curl = curlPoints(trunk[n], tipDir, hookPerp(tipDir.clone()), 0.55 * scale, 1.15, 8, 0.72);
  const bark = gradY(PAL.bark, PAL.barkLight, 0, H);
  const radius = (t) => r0 * (1 - t * 0.9) * (1 + 0.9 * Math.max(0, 1 - t * 8)) + 0.012;
  b.add(S.tube([...trunk, ...curl.slice(1)], radius, 7, { step: 0.4 }), bark);
  const trunkCurve = new THREE.CatmullRomCurve3(trunk, false, 'centripetal');

  // raízes
  const nr = rng.int(3, 5);
  for (let k = 0; k < nr; k++) {
    const a = (k / nr) * TAU + rng.range(-0.4, 0.4);
    const ca = Math.cos(a), sa = Math.sin(a);
    b.add(S.tube([V3(ca * r0 * 0.4, 0.5, sa * r0 * 0.4), V3(ca * r0 * 2.0, 0.05, sa * r0 * 2.0), V3(ca * r0 * 3.4, -0.3, sa * r0 * 3.4)], (t) => r0 * 0.5 * (1 - t * 0.85), 5), bark);
  }
  // galhos
  const nb = rng.int(3, 6);
  for (let i = 0; i < nb; i++) {
    const tb = rng.range(0.4, 0.86);
    const p0 = trunkCurve.getPointAt(tb);
    const ang = rng.range(0, TAU), up = rng.range(0.25, 0.95);
    const dir = V3(Math.cos(ang), up, Math.sin(ang)).normalize();
    const L = H * rng.range(0.24, 0.42) * (1.15 - tb * 0.5);
    const p1 = p0.clone().addScaledVector(dir, L * 0.35).add(V3(rng.range(-0.2, 0.2), rng.range(-0.1, 0.2), rng.range(-0.2, 0.2)));
    const p2 = p0.clone().addScaledVector(dir, L * 0.7).add(V3(0, L * 0.12, 0));
    const p3 = p0.clone().addScaledVector(dir, L);
    const ed = p3.clone().sub(p2).normalize();
    const pts = [p0, p1, p2, p3, ...curlPoints(p3, ed, hookPerp(ed.clone()), L * 0.16, 1.2, 8, 0.72).slice(1)];
    const br = radius(tb) * 0.55;
    b.add(S.tube(pts, (t) => br * (1 - t * 0.9) + 0.01, 5, { step: 0.35 }), bark);
    const tw2 = rng.int(0, 2);
    for (let j = 0; j < tw2; j++) {
      const q0 = p1.clone().lerp(p2, rng.range(0.2, 0.8));
      const d2 = dir.clone().add(V3(rng.range(-0.8, 0.8), rng.range(0.2, 0.8), rng.range(-0.8, 0.8))).normalize();
      const l2 = L * rng.range(0.25, 0.4);
      const q1 = q0.clone().addScaledVector(d2, l2);
      b.add(S.tube([q0, q0.clone().addScaledVector(d2, l2 * 0.5), q1, ...curlPoints(q1, d2, hookPerp(d2.clone()), l2 * 0.2, 1.1, 6, 0.7).slice(1)], (t) => br * 0.45 * (1 - t * 0.85) + 0.006, 4, { step: 0.35 }), bark);
    }
  }
  const m = new Model('deadtree').part(b.build());
  if (face) {
    const fy = 1.9 * scale;
    const fp = trunkCurve.getPointAt(fy / H);
    const rr = radius(fy / H);
    for (const s of [-1, 1]) {
      b.add(S.sphere(rr * 0.33, 8, 6), PAL.black, { p: [fp.x + s * rr * 0.4, fp.y + rr * 0.3, fp.z + rr * 0.8], s: [1, 1.3, 0.6] });
      g.add(S.sphere(rr * 0.1, 6, 5), '#fff', { p: [fp.x + s * rr * 0.4, fp.y + rr * 0.3, fp.z + rr * 0.95] });
    }
    b.add(S.sphere(rr * 0.4, 8, 6), PAL.black, { p: [fp.x, fp.y - rr * 0.5, fp.z + rr * 0.78], s: [1.3, 0.55, 0.6] });
    m.parts.length = 0;
    m.part(b.build()).part(g.build(), GLOW.eyes, { cast: false });
  }
  m.colliders.push({ type: 'c', x: 0, z: 0, r: r0 * 1.4 });
  m.height = H;
  return m;
}

/** Pinheiro torto e serrilhado, com ponta enrolada. */
export function makePine(seed, scale = 1) {
  const rng = new RNG(seed * 11 + 3);
  const b = new Builder();
  const H = rng.range(6, 10) * scale;
  const bend = rng.range(-0.5, 0.5), bendZ = rng.range(-0.4, 0.4);
  const spine = (t) => V3(Math.sin(t * 2.2) * bend * t * 1.4, t * H, Math.sin(t * 1.7) * bendZ * t * 1.4);
  b.add(S.tube([spine(0).add(V3(0, -0.3, 0)), spine(0.3), spine(0.6), spine(0.92)], (t) => (0.24 - t * 0.18) * scale, 6), PAL.bark);
  const tiers = rng.int(4, 6);
  const dark = new THREE.Color(PAL.pine), light = new THREE.Color(PAL.pineLight);
  for (let i = 0; i < tiers; i++) {
    const t = 0.18 + (0.72 * i) / tiers;
    const p = spine(t);
    const r = ((1 - i / tiers) * 0.3 * H + 0.35) * rng.range(0.9, 1.1);
    const h = H * 0.3;
    const cone = new THREE.ConeGeometry(r, h, 9, 1);
    const pos = cone.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      if (pos.getY(k) < 0) {
        const j = 1 + (k % 2 ? 0.28 : -0.1) + rng.range(-0.08, 0.08);
        pos.setXYZ(k, pos.getX(k) * j, pos.getY(k) - (k % 2 ? 0.18 : 0), pos.getZ(k) * j);
      }
    }
    b.add(cone, (x, y) => _c.copy(dark).lerp(light, clamp(y / h + 0.5, 0, 1) * 0.8), {
      flat: true, p: [p.x, p.y + h * 0.35, p.z], r: [rng.range(-0.08, 0.08), rng.range(0, TAU), rng.range(-0.08, 0.08)],
    });
  }
  const top = spine(0.92);
  const td = V3(bend * 0.4, 1, bendZ * 0.4).normalize();
  b.add(S.tube([top, top.clone().addScaledVector(td, H * 0.08), ...curlPoints(top.clone().addScaledVector(td, H * 0.12), td, hookPerp(td.clone()), 0.3 * scale, 1.1, 7, 0.7)], (t) => 0.2 * scale * (1 - t) + 0.01, 5), PAL.pine);
  const m = new Model('pine').part(b.build());
  m.colliders.push({ type: 'c', x: 0, z: 0, r: 0.5 * scale });
  m.height = H;
  return m;
}

/** Árvore-pirulito: tronco fino e copa redonda facetada. */
export function makeLollipop(seed, scale = 1) {
  const rng = new RNG(seed * 5 + 9);
  const b = new Builder();
  const H = rng.range(3.4, 5) * scale;
  const tw = rng.range(-0.4, 0.4);
  const trunk = [V3(0, -0.2, 0), V3(tw * 0.5, H * 0.35, 0.1), V3(-tw * 0.3, H * 0.7, -0.1), V3(tw * 0.2, H, 0)];
  b.add(S.tube(trunk, (t) => (0.16 - t * 0.08) * scale, 6), gradY(PAL.bark, PAL.barkLight, 0, H));
  const col = new THREE.Color(rng.pick(['#5a4a6e', '#3e5e5a', '#6a4a5a', '#4a5a3a']));
  const R = rng.range(1.3, 1.9) * scale;
  b.add(S.blob(R, 1, 0.18, 0.7, seed), (x, y) => _c.copy(col).multiplyScalar(0.72 + 0.4 * clamp((y - H) / R * 0.5 + 0.5, 0, 1)), { flat: true, p: [tw * 0.2, H + R * 0.75, 0] });
  const m = new Model('lollipop').part(b.build());
  m.colliders.push({ type: 'c', x: 0, z: 0, r: 0.3 * scale });
  m.height = H + R * 1.6;
  return m;
}

/** Topiaria em espiral (vaso + hélice verde). */
export function makeSpiralTopiary(seed, scale = 1) {
  const rng = new RNG(seed + 44);
  const b = new Builder();
  b.add(S.cylB(0.55, 0.42, 0.6, 10), PAL.stoneLight, { s: scale });
  b.add(S.torus(0.55, 0.06, 4, 14), PAL.stone, { p: [0, 0.6 * scale, 0], r: [Math.PI / 2, 0, 0], s: scale });
  const pts = [];
  const turns = rng.range(3.2, 4.2), Hh = rng.range(2.4, 3.2);
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    const a = t * turns * TAU;
    const r = (1 - t) * 0.75 + 0.08;
    pts.push(V3(Math.cos(a) * r * scale, (0.75 + t * Hh) * scale, Math.sin(a) * r * scale));
  }
  const col = new THREE.Color(rng.pick(['#2f4a3a', '#35523e', '#2a4440']));
  b.add(S.tube(pts, (t) => ((1 - t) * 0.3 + 0.08) * scale, 7, { segments: 90 }), (x, y) => _c.copy(col).multiplyScalar(0.8 + 0.25 * Math.sin(y * 3)));
  b.add(S.sphere(0.18 * scale, 8, 6), col, { p: [pts[40].x, pts[40].y + 0.12 * scale, pts[40].z] });
  b.add(S.cyl(0.05 * scale, 0.06 * scale, Hh * scale, 5), PAL.bark, { p: [0, (0.6 + Hh / 2) * scale, 0] });
  const m = new Model('topiary').part(b.build());
  m.colliders.push({ type: 'c', x: 0, z: 0, r: 0.6 * scale });
  return m;
}

/** Árvore do pântano: raízes em arco + musgo pendurado (balança no vento). */
export function makeSwampTree(seed, scale = 1) {
  const rng = new RNG(seed * 3 + 17);
  const b = new Builder();
  const moss = new Builder();
  const H = rng.range(5.5, 8) * scale;
  const baseY = 1.1 * scale;
  const bark = gradY('#2a2a28', '#48443e', 0, H);
  const nr = rng.int(4, 6);
  for (let k = 0; k < nr; k++) {
    const a = (k / nr) * TAU + rng.range(-0.3, 0.3);
    const ca = Math.cos(a), sa = Math.sin(a), R = rng.range(1.2, 1.9) * scale;
    b.add(S.tube([V3(ca * 0.15, baseY + 0.3, sa * 0.15), V3(ca * R * 0.5, baseY + 0.25, sa * R * 0.5), V3(ca * R * 0.9, baseY * 0.5, sa * R * 0.9), V3(ca * R, -0.4, sa * R)], (t) => 0.16 * scale * (1 - t * 0.5), 5), bark);
  }
  const lean = rng.range(-0.25, 0.25);
  const trunk = [V3(0, baseY, 0), V3(lean * 0.5, H * 0.45, 0.1), V3(lean, H * 0.8, -0.1), V3(lean * 1.3, H, 0)];
  b.add(S.tube(trunk, (t) => (0.34 - t * 0.26) * scale, 7), bark);
  const curve = new THREE.CatmullRomCurve3(trunk);
  const nb = rng.int(3, 5);
  for (let i = 0; i < nb; i++) {
    const p0 = curve.getPointAt(rng.range(0.55, 0.95));
    const a = rng.range(0, TAU);
    const L = rng.range(1.8, 3.2) * scale;
    const d = V3(Math.cos(a), 0.35, Math.sin(a)).normalize();
    const p1 = p0.clone().addScaledVector(d, L * 0.5).add(V3(0, L * 0.15, 0));
    const p2 = p0.clone().addScaledVector(d, L).add(V3(0, -L * 0.15, 0));
    b.add(S.tube([p0, p1, p2], (t) => 0.13 * scale * (1 - t * 0.8), 5), bark);
    for (let k = 0; k < 7; k++) {
      const q = p0.clone().lerp(p2, 0.3 + k * 0.1).add(V3(rng.range(-0.15, 0.15), 0, rng.range(-0.15, 0.15)));
      const len = rng.range(0.5, 1.8) * scale;
      const pts = [];
      for (let i = 0; i <= 4; i++) pts.push(V3(q.x + Math.sin(i * 1.7 + k) * 0.06, q.y - (len * i) / 4, q.z + Math.cos(i * 1.3 + k) * 0.06));
      moss.add(S.tube(pts, (t) => 0.035 * (1 - t * 0.7), 3, { segments: 6 }), (x, y) => _c.set('#56644a').lerp(new THREE.Color('#9aa888'), clamp((q.y - y) / len, 0, 1)), {
        sway: (y) => clamp((q.y - y) / len, 0, 1) * 1.4,
      });
    }
  }
  const m = new Model('swamptree').part(b.build()).part(moss.build(), grassMat, { cast: false, layer: LAYER_FX });
  m.colliders.push({ type: 'c', x: 0, z: 0, r: 0.55 * scale });
  m.height = H;
  return m;
}

/** Salgueiro-chorão fantasmagórico (ilha do lago). */
export function makeWillow(seed, scale = 1) {
  const rng = new RNG(seed + 900);
  const b = new Builder();
  const strands = new Builder();
  const H = 5.5 * scale;
  b.add(S.tube([V3(0, -0.3, 0), V3(0.3, H * 0.4, 0.1), V3(-0.2, H * 0.8, 0), V3(0.1, H, 0)], (t) => (0.45 - t * 0.3) * scale, 8), gradY(PAL.bark, '#5a5060', 0, H));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    b.add(S.tube([V3(0, H * 0.8, 0), V3(Math.cos(a) * 1.4, H * 1.02, Math.sin(a) * 1.4), V3(Math.cos(a) * 2.6, H * 0.9, Math.sin(a) * 2.6)], (t) => 0.14 * (1 - t * 0.7) * scale, 5), PAL.bark);
  }
  for (let i = 0; i < 70; i++) {
    const a = rng.range(0, TAU), r = rng.range(0.6, 3.0) * scale;
    const top = H * (1.05 - (r / (3 * scale)) * 0.18);
    const len = rng.range(2.2, 4.2) * scale;
    strands.add(S.box(0.09, len, 0.02), (x, y) => _c.set('#6f8a6a').lerp(new THREE.Color('#b8c8a8'), clamp((top - y) / len, 0, 1)), {
      p: [Math.cos(a) * r, top - len / 2, Math.sin(a) * r], r: [0, a + Math.PI / 2, 0], sway: (y) => clamp((top - y) / len, 0, 1) * 1.6,
    });
  }
  const m = new Model('willow').part(b.build()).part(strands.build(), grassMat, { cast: false, layer: LAYER_FX });
  m.colliders.push({ type: 'c', x: 0, z: 0, r: 0.6 * scale });
  m.height = H;
  return m;
}
