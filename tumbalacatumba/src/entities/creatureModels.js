import * as THREE from 'three';
import { Builder, S, curlPoints } from '../render/builder.js';
import { GLOW, glowMat, flameMat, toonMat } from '../render/toon.js';
import { Rig } from './rig.js';
import { eyeGeo } from './models.js';
import { RNG } from '../util/rng.js';
import { TAU, clamp, damp, lerp } from '../util/math.js';
import { noise3 } from '../util/noise.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const _c = new THREE.Color();
const CAT_EYES = glowMat('#e8c830', '#ffe14a', 3.2);

// ---------------------------------------------------------------------------
// SR. BIGODES — gato de três olhos
// ---------------------------------------------------------------------------
export function createCat() {
  const rig = new Rig('Sr. Bigodes');
  const F = '#1e1a26', F2 = '#2e2838';
  rig.joint('torso', null, [0, 0.34, 0]);
  {
    const b = new Builder();
    b.add(S.capsule(0.12, 0.34, 4, 10), (x, y) => (y > 0.05 ? _c.set(F2) : _c.set(F)), { r: [Math.PI / 2, 0, 0] });
    rig.attach('torso', b.build());
  }
  for (const [n, x, z] of [['fl', 0.07, 0.17], ['fr', -0.07, 0.17], ['bl', 0.07, -0.17], ['br', -0.07, -0.17]]) {
    rig.joint(n, 'torso', [x, -0.02, z]);
    const b = new Builder();
    b.add(S.cyl(0.028, 0.032, 0.3, 6), F, { p: [0, -0.15, 0] });
    b.add(S.sphere(0.04, 6, 5), F, { p: [0, -0.3, 0.02], s: [1, 0.7, 1.2] });
    rig.attach(n, b.build());
  }
  rig.joint('head', 'torso', [0, 0.12, 0.25]);
  {
    const b = new Builder();
    b.add(S.sphere(0.14, 14, 10), F, { s: [1.05, 0.95, 1] });
    b.add(S.cone(0.06, 0.13, 4), F, { p: [0.08, 0.14, -0.01], r: [0, 0, -0.3] });
    b.add(S.cone(0.055, 0.08, 4), F, { p: [-0.08, 0.12, -0.01], r: [0, 0, 0.35] }); // orelha mastigada
    b.add(S.sphere(0.02, 6, 5), '#c86a8a', { p: [0, -0.01, 0.14] });
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) b.add(S.box(0.16, 0.006, 0.006), '#d8d0c0', { p: [s * 0.1, -0.02 + k * 0.012, 0.12], r: [0, s * 0.3, s * (0.25 - k * 0.2) + (k === 1 && s > 0 ? 0.5 : 0)] });
    rig.attach('head', b.build());
    const e = new Builder();
    for (const [x, y, r] of [[-0.055, 0.02, 0.032], [0.055, 0.02, 0.032], [0, 0.08, 0.026]]) {
      e.add(S.sphere(r, 8, 6), '#fff', { p: [x, y, 0.12], s: [1, 1.2, 0.6] });
    }
    rig.attach('head', e.build(), CAT_EYES, { cast: false });
    const p = new Builder();
    for (const [x, y] of [[-0.055, 0.02], [0.055, 0.02], [0, 0.08]]) p.add(S.box(0.008, 0.03, 0.01), '#111', { p: [x, y, 0.14] });
    rig.attach('head', p.build());
  }
  rig.joint('tail', 'torso', [0, 0.05, -0.26]);
  {
    const b = new Builder();
    const pts = [V3(0, 0, 0), V3(0, 0.12, -0.1), V3(0, 0.3, -0.12)];
    pts.push(...curlPoints(V3(0, 0.3, -0.12), V3(0, 1, 0), V3(0, 0, 1), 0.08, 1.3, 10, 0.7).slice(1));
    b.add(S.tube(pts, (t) => 0.03 * (1 - t * 0.6), 6), F);
    rig.attach('tail', b.build());
  }
  rig.fixedPose = true;
  rig.extra = (dt, s, r) => {
    const sp = s.speed || 0;
    if (sp > 0.3) {
      r.phase += dt * (6 + sp * 1.4);
      const a = Math.sin(r.phase) * 0.8;
      r.j.fl.rotation.x = -a;
      r.j.br.rotation.x = -a;
      r.j.fr.rotation.x = a;
      r.j.bl.rotation.x = a;
      r.body.position.y = Math.abs(Math.sin(r.phase)) * 0.08;
      r.j.torso.rotation.x = Math.sin(r.phase * 2) * 0.08;
      r.j.tail.rotation.x = -0.6;
    } else {
      // sentado, lambendo a pata de vez em quando
      const sit = s.sit ? 1 : 0.5;
      r.j.bl.rotation.x = damp(r.j.bl.rotation.x, -1.2 * sit, 8, dt);
      r.j.br.rotation.x = damp(r.j.br.rotation.x, -1.2 * sit, 8, dt);
      r.j.fl.rotation.x = damp(r.j.fl.rotation.x, 0.2 * sit, 8, dt);
      r.j.fr.rotation.x = damp(r.j.fr.rotation.x, 0.2 * sit, 8, dt);
      r.j.torso.rotation.x = damp(r.j.torso.rotation.x, -0.45 * sit, 8, dt);
      r.body.position.y = damp(r.body.position.y, -0.08 * sit, 8, dt);
      r.j.tail.rotation.z = Math.sin(r.t * 2.2) * 0.4;
      r.j.tail.rotation.x = damp(r.j.tail.rotation.x, 0.2, 5, dt);
      r.j.head.rotation.z = Math.sin(r.t * 0.7) * 0.2;
    }
  };
  rig.height = 0.75;
  rig.portraitY = 0.5;
  rig.portraitDist = 0.95;
  return rig;
}

// ---------------------------------------------------------------------------
export function createRebelPumpkin(seed = 0) {
  const rig = new Rig('Abóbora Fujona');
  const rng = new RNG(seed + 77);
  const r = rng.range(0.3, 0.38);
  rig.joint('torso', null, [0, 0, 0]);
  {
    const b = new Builder();
    b.add(S.pumpkin(r, 8, 18, 12), (x, y) => _c.set('#c8561e').lerp(new THREE.Color('#f08a3a'), clamp(0.5 + y / r, 0, 1)), { p: [0, r * 0.75, 0] });
    b.add(S.cyl(r * 0.07, r * 0.1, r * 0.4, 5), '#4d5a2a', { p: [0, r * 1.45, 0], r: [0, 0, 0.3] });
    for (const s of [-1, 1]) b.add(S.cone(r * 0.25, r * 0.5, 4), '#5a7a2a', { p: [s * r * 0.35, r * 1.5, 0], r: [0, 0, -s * 1.1], s: [1, 1, 0.3] });
    for (const s of [-1, 1]) b.add(S.sphere(r * 0.13, 6, 5), '#4a2a14', { p: [s * r * 0.45, r * 0.12, r * 0.3], s: [1, 0.6, 1.4] });
    rig.attach('torso', b.build());
    const g = new Builder();
    for (const s of [-1, 1]) g.add(S.extrude([[-0.05, 0], [0.05, 0.02], [0, 0.07]].map(([x, y]) => [x * s, y]), 0.03, 1), '#fff', { p: [s * r * 0.35, r * 0.92, r * 0.9], r: [-0.2, s * 0.35, s * 0.2] });
    const mouth = [];
    for (let i = 0; i <= 6; i++) mouth.push([(i / 6 - 0.5) * r * 1.1, -Math.sin((i / 6) * Math.PI) * r * 0.2 + (i % 2 ? 0.02 : 0)]);
    for (let i = 6; i >= 0; i--) mouth.push([(i / 6 - 0.5) * r * 1.1, -Math.sin((i / 6) * Math.PI) * r * 0.32]);
    g.add(S.extrude(mouth, 0.03, 1), '#fff', { p: [0, r * 0.62, r * 0.93], r: [0.25, 0, 0] });
    rig.attach('torso', g.build(), GLOW.jack, { cast: false });
  }
  rig.fixedPose = true;
  rig.hop = 0;
  rig.extra = (dt, s, rr) => {
    const sp = s.speed || 0;
    if (sp > 0.2) rr.hop += dt * (4 + sp * 0.8);
    else rr.hop += dt * 1.2;
    const h = Math.abs(Math.sin(rr.hop));
    const amp = sp > 0.2 ? 0.55 : 0.08;
    rr.body.position.y = h * amp;
    const sq = h < 0.15 ? (0.15 - h) * 2 : 0;
    rr.body.scale.set(1 + sq, 1 - sq * 1.6 + h * 0.08, 1 + sq);
    rr.j.torso.rotation.z = Math.sin(rr.hop) * 0.15;
  };
  rig.height = 0.9;
  rig.portraitY = 0.45;
  rig.portraitDist = 1.4;
  return rig;
}

// ---------------------------------------------------------------------------
export function createCrow() {
  const rig = new Rig('Corvo');
  const K = '#1a1822', K2 = '#2c2838';
  rig.joint('torso', null, [0, 0.2, 0]);
  {
    const b = new Builder();
    b.add(S.sphere(0.14, 10, 8), K, { s: [0.9, 0.85, 1.3] });
    b.add(S.cone(0.1, 0.25, 4), K2, { p: [0, 0.02, -0.25], r: [-Math.PI / 2 - 0.3, 0, 0], s: [1.3, 1, 0.3] });
    for (const s of [-1, 1]) b.add(S.cyl(0.008, 0.008, 0.14, 3), '#c8a040', { p: [s * 0.04, -0.14, 0.02] });
    rig.attach('torso', b.build());
  }
  rig.joint('head', 'torso', [0, 0.12, 0.13]);
  {
    const b = new Builder();
    b.add(S.sphere(0.09, 10, 8), K);
    b.add(S.cone(0.035, 0.16, 4), '#d8a040', { p: [0, -0.01, 0.13], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.7] });
    for (const s of [-1, 1]) {
      b.add(S.sphere(0.028, 6, 5), '#ffffff', { p: [s * 0.05, 0.03, 0.06] });
      b.add(S.sphere(0.013, 5, 4), '#111', { p: [s * 0.055, 0.03, 0.08] });
    }
    for (let i = 0; i < 3; i++) b.add(S.cone(0.012, 0.07, 3), K, { p: [0, 0.08, -0.02 - i * 0.02], r: [-0.6 - i * 0.2, 0, 0] });
    rig.attach('head', b.build());
  }
  for (const [n, x, s] of [['wingL', 0.1, 1], ['wingR', -0.1, -1]]) {
    rig.joint(n, 'torso', [x, 0.06, 0.02]);
    const b = new Builder();
    // asa aponta para trás (-z); em voo gira para fora
    b.add(S.cone(0.11, 0.38, 4), K2, { p: [s * 0.02, 0, -0.17], r: [-Math.PI / 2, 0, 0], s: [0.35, 1, 1] });
    rig.attach(n, b.build());
  }
  rig.fixedPose = true;
  rig.flying = false;
  rig.extra = (dt, s, r) => {
    if (r.flying) {
      const f = Math.sin(r.t * 22);
      r.j.wingL.rotation.y = 1.45;
      r.j.wingR.rotation.y = -1.45;
      r.j.wingL.rotation.z = 0.3 + f * 0.9;
      r.j.wingR.rotation.z = -0.3 - f * 0.9;
      r.j.torso.rotation.x = -0.3;
    } else {
      r.j.wingL.rotation.y = damp(r.j.wingL.rotation.y, 0.12, 10, dt);
      r.j.wingR.rotation.y = damp(r.j.wingR.rotation.y, -0.12, 10, dt);
      r.j.wingL.rotation.z = damp(r.j.wingL.rotation.z, 0.1, 10, dt);
      r.j.wingR.rotation.z = damp(r.j.wingR.rotation.z, -0.1, 10, dt);
      r.j.head.rotation.y = Math.sin(r.t * 1.3) * 0.5 + Math.sin(r.t * 3.1) * 0.2;
      r.j.head.rotation.x = Math.max(0, Math.sin(r.t * 0.9)) * 0.3;
      r.j.torso.rotation.x = damp(r.j.torso.rotation.x, 0, 5, dt);
    }
  };
  rig.height = 0.5;
  rig.portraitY = 0.33;
  rig.portraitDist = 0.75;
  return rig;
}

// ---------------------------------------------------------------------------
export function createFrog(withDentures = true) {
  const rig = new Rig('Sapo Sorridente');
  const G = '#4f7a34', G2 = '#6a9a44', Y = '#d8c870';
  rig.joint('torso', null, [0, 0.02, 0]);
  {
    const b = new Builder();
    b.add(S.sphere(0.34, 14, 10), (x, y, z) => (z > 0.18 && y < 0.25 ? _c.set(Y) : _c.set(G).lerp(new THREE.Color(G2), (noise3(x * 8, y * 8, z * 8) + 1) * 0.3)), { p: [0, 0.26, 0], s: [1.25, 0.8, 1.05] });
    for (const s of [-1, 1]) {
      b.add(S.sphere(0.12, 8, 6), G, { p: [s * 0.36, 0.1, -0.1], s: [1, 0.7, 1.6] });
      b.add(S.sphere(0.07, 6, 5), G, { p: [s * 0.28, 0.05, 0.25], s: [1.4, 0.5, 1] });
      b.add(S.sphere(0.1, 10, 8), G, { p: [s * 0.16, 0.5, 0.12] });
      b.add(S.sphere(0.075, 10, 8), '#f4eecc', { p: [s * 0.16, 0.53, 0.17] });
      b.add(S.sphere(0.035, 6, 5), '#111', { p: [s * 0.16, 0.54, 0.23], s: [1.3, 0.7, 0.6] });
    }
    b.add(S.torus(0.22, 0.012, 3, 14, Math.PI), '#2a3a1a', { p: [0, 0.28, 0.3], r: [0.3, 0, Math.PI] });
    rig.attach('torso', b.build());
  }
  if (withDentures) {
    const b = new Builder();
    b.add(S.torus(0.16, 0.035, 5, 14, Math.PI), '#c8342a', { p: [0, 0.22, 0.34], r: [0.25, 0, Math.PI] });
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      const fang = i === 1 || i === 7;
      b.add(fang ? S.cone(0.025, 0.1, 4) : S.box(0.032, 0.05, 0.03), i % 3 === 0 ? '#f0d060' : '#fffaf0', { p: [Math.cos(a) * 0.15, 0.22 + Math.sin(a) * 0.15 * 0.3 - 0.02, 0.36 + Math.sin(a) * -0.04], r: [fang ? Math.PI : 0, 0, 0] });
    }
    rig.dentures = rig.attach('torso', b.build());
  }
  rig.fixedPose = true;
  rig.extra = (dt, s, r) => {
    r.j.torso.scale.y = 1 + Math.max(0, Math.sin(r.t * 2.5)) * 0.06;
    r.j.torso.scale.x = 1 + Math.max(0, Math.sin(r.t * 2.5)) * 0.03;
  };
  rig.height = 0.7;
  rig.portraitY = 0.4;
  rig.portraitDist = 1.5;
  return rig;
}

// ---------------------------------------------------------------------------
export function createEgg() {
  const rig = new Rig('Ovo do Capeta');
  rig.joint('torso', null, [0, 0.3, 0]);
  {
    const b = new Builder();
    b.add(S.sphere(0.55, 22, 18), (x, y, z) => {
      const n = noise3(x * 4, y * 4, z * 4);
      return n > 0.35 ? _c.set('#2a0e10') : _c.set('#8a1a1e').lerp(new THREE.Color('#b8342a'), clamp(0.5 + y, 0, 1) * 0.6);
    }, { p: [0, 0.45, 0], s: [1, 1.35, 1] });
    for (const s of [-1, 1]) b.add(S.tube([V3(s * 0.12, 1.1, 0.02), V3(s * 0.2, 1.3, 0.05), V3(s * 0.16, 1.45, 0.1)], (t) => 0.06 * (1 - t) + 0.01, 5), '#2a1a1a');
    rig.attach('torso', b.build());
    const g = new Builder();
    const rng = new RNG(3);
    for (let k = 0; k < 3; k++) {
      let a = rng.range(0, TAU), y = rng.range(0.2, 0.7);
      for (let i = 0; i < 6; i++) {
        const na = a + rng.range(-0.25, 0.25), ny = y + 0.09;
        const p0 = V3(Math.sin(a) * 0.555, 0.45 + (y - 0.45) * 1.35, Math.cos(a) * 0.555);
        const p1 = V3(Math.sin(na) * 0.555, 0.45 + (ny - 0.45) * 1.35, Math.cos(na) * 0.555);
        g.add(S.tube([p0, p1], 0.014, 3, { segments: 1 }), '#fff');
        a = na;
        y = ny;
      }
    }
    rig.cracks = rig.attach('torso', g.build(), glowMat('#3a1810', '#ffb040', 4), { cast: false });
    rig.cracks.visible = false;
  }
  rig.fixedPose = true;
  rig.wobble = 0.2;
  rig.extra = (dt, s, r) => {
    r.j.torso.rotation.z = Math.sin(r.t * 5) * 0.06 * r.wobble + Math.sin(r.t * 17) * 0.02 * r.wobble;
    r.j.torso.rotation.x = Math.cos(r.t * 4.3) * 0.04 * r.wobble;
    if (r.cracks.visible) r.cracks.material.color.setScalar(2 + Math.sin(r.t * 6) * 1.5);
  };
  rig.height = 1.8;
  rig.portraitY = 0.95;
  rig.portraitDist = 2.6;
  return rig;
}

// ---------------------------------------------------------------------------
// BELZEBUZINHO — filhote de avestruz demônio (pet)
// ---------------------------------------------------------------------------
export function createChick() {
  const rig = new Rig('Belzebuzinho');
  const R = '#c8342a', R2 = '#e8704a', L = '#e8a040';
  rig.joint('hips', null, [0, 0.36, 0]);
  for (const [n, x] of [['legL', 0.08], ['legR', -0.08]]) {
    rig.joint(n, 'hips', [x, 0, 0]);
    const b = new Builder();
    b.add(S.cyl(0.018, 0.02, 0.34, 5), L, { p: [0, -0.17, 0] });
    for (const a of [-0.5, 0, 0.5]) b.add(S.cyl(0.012, 0.012, 0.12, 3), L, { p: [Math.sin(a) * 0.05, -0.35, Math.cos(a) * 0.05], r: [Math.PI / 2, 0, -a] });
    rig.attach(n, b.build());
  }
  rig.joint('torso', 'hips', [0, 0, 0]);
  {
    const b = new Builder();
    b.add(S.sphere(0.24, 14, 10), (x, y, z) => (z > 0.1 && y < 0.1 ? _c.set(R2) : _c.set(R)), { p: [0, 0.14, -0.04], s: [1, 0.9, 1.1] });
    for (const s of [-1, 1]) b.add(S.sphere(0.1, 8, 6), '#a8281e', { p: [s * 0.22, 0.16, -0.06], s: [0.35, 0.8, 1.2], r: [0.3, 0, 0] });
    b.add(S.cone(0.1, 0.22, 5), '#8a1a14', { p: [0, 0.2, -0.3], r: [-Math.PI / 2 - 0.5, 0, 0], s: [1, 1, 0.4] });
    b.add(S.tube([V3(0, 0.25, 0.12), V3(0, 0.45, 0.15), V3(0, 0.62, 0.1)], 0.045, 6), R);
    rig.attach('torso', b.build());
  }
  rig.joint('head', 'torso', [0, 0.68, 0.1]);
  {
    const b = new Builder();
    b.add(S.sphere(0.15, 14, 10), R, { s: [1, 0.95, 1.05] });
    b.add(S.cone(0.05, 0.14, 5), L, { p: [0, -0.03, 0.18], r: [Math.PI / 2, 0, 0], s: [1.2, 1, 0.6] });
    for (const s of [-1, 1]) b.add(S.tube([V3(s * 0.06, 0.1, 0), V3(s * 0.1, 0.18, 0), V3(s * 0.08, 0.24, 0.03)], (t) => 0.025 * (1 - t) + 0.004, 4), '#2a1010');
    rig.attach('head', b.build());
    const fl = new Builder();
    fl.add(S.cone(0.06, 0.2, 6), '#fff', { p: [0, 0.2, -0.02] });
    fl.add(S.cone(0.04, 0.14, 6), '#fff', { p: [0.04, 0.17, 0.02], r: [0, 0, -0.4] });
    rig.flame = rig.attach('head', fl.build(), flameMat('#ff8a2a', '#ffa03a', 3.5), { cast: false });
  }
  rig.joint('eyes', 'head', [0, 0.04, 0.1]);
  rig.attach('eyes', eyeGeo({ sep: 0.065, r: 0.055, pupil: 0.03 }));
  rig.extra = (dt, s, r) => {
    r.flame.scale.set(1 + Math.sin(r.t * 17) * 0.1, 1 + Math.sin(r.t * 13) * 0.2, 1);
    if ((s.speed || 0) < 0.3) r.j.head.rotation.x = Math.max(0, Math.sin(r.t * 0.8)) * 0.6 * (Math.sin(r.t * 0.27) > 0.6 ? 1 : 0.1);
  };
  rig.height = 1.0;
  rig.portraitY = 0.72;
  rig.portraitDist = 1.0;
  return rig;
}

// ---------------------------------------------------------------------------
// Itens de missão (malhas simples que brilham e giram)
// ---------------------------------------------------------------------------
export const ITEM_MODELS = {
  bone() {
    const b = new Builder();
    b.add(S.cyl(0.05, 0.05, 0.5, 7), '#ece6d4', { r: [0, 0, Math.PI / 2] });
    for (const x of [-0.27, 0.27]) for (const z of [-0.05, 0.05]) b.add(S.sphere(0.075, 8, 6), '#ece6d4', { p: [x, 0, z] });
    return new THREE.Mesh(b.build(), toonMat({ vertexColors: true }));
  },
  ember() {
    const g = new THREE.Group();
    const b = new Builder();
    b.add(S.ico(0.22, 0), '#3a2018', { flat: true });
    g.add(new THREE.Mesh(b.build(), toonMat({ vertexColors: true })));
    const c = new Builder();
    for (let i = 0; i < 5; i++) c.add(S.ico(0.1, 0), '#fff', { p: [Math.cos(i * 1.3) * 0.12, 0.08 + (i % 2) * 0.05, Math.sin(i * 1.3) * 0.12], flat: true });
    g.add(new THREE.Mesh(c.build(), GLOW.lava));
    return g;
  },
  mushroom() {
    const g = new THREE.Group();
    const b = new Builder();
    b.add(S.cylB(0.05, 0.07, 0.28, 7), '#f0e8d8');
    for (const s of [-1, 1]) b.add(S.sphere(0.018, 5, 4), '#1a1a1a', { p: [s * 0.03, 0.14, 0.06] });
    b.add(S.torus(0.025, 0.007, 3, 8, Math.PI), '#1a1a1a', { p: [0, 0.1, 0.065], r: [0, 0, Math.PI] });
    g.add(new THREE.Mesh(b.build(), toonMat({ vertexColors: true })));
    const c = new Builder();
    c.add(S.hemi(0.2, 12, 6), '#fff', { p: [0, 0.26, 0], s: [1, 0.7, 1] });
    for (let i = 0; i < 5; i++) c.add(S.sphere(0.035, 5, 4), '#fff', { p: [Math.cos(i * 1.25) * 0.12, 0.36, Math.sin(i * 1.25) * 0.12] });
    g.add(new THREE.Mesh(c.build(), GLOW.mushroomPink));
    return g;
  },
  firefly() {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), glowMat('#e8ff80', '#d8ff6a', 5));
    return m;
  },
};
