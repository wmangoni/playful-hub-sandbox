import * as THREE from 'three';
import { Builder, S, curlPoints } from '../render/builder.js';
import { flameMat, toonMat } from '../render/toon.js';
import { Rig } from './rig.js';
import { lerp, TAU } from '../util/math.js';
import { RNG } from '../util/rng.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/** cilindro listrado pendurado a partir da origem (vai de y=0 até y=-len) */
export function stripedLimb(b, len, r0, r1, n, colA, colB, seg = 8, x = 0, z = 0) {
  for (let i = 0; i < n; i++) {
    const a = i / n, c = (i + 1) / n;
    const ra = lerp(r0, r1, a), rc = lerp(r0, r1, c);
    const h = len / n;
    b.add(S.cyl(rc, ra, h * 1.02, seg), i % 2 ? colB : colA, { p: [x, -len * a - h / 2, z] });
  }
}

/** tronco listrado horizontal empilhado de y=0 para cima, raios por fração */
export function stripedTorso(b, h, radii, n, colA, colB, seg = 12, sx = 1, sz = 0.85) {
  for (let i = 0; i < n; i++) {
    const a = i / n, c = (i + 1) / n;
    const rb = sampleR(radii, a), rt = sampleR(radii, c);
    b.add(S.cyl(rt, rb, (h / n) * 1.01, seg), i % 2 ? colB : colA, { p: [0, h * a + h / n / 2, 0], s: [sx, 1, sz] });
  }
}
function sampleR(radii, t) {
  const f = t * (radii.length - 1);
  const i = Math.min(radii.length - 2, Math.floor(f));
  return lerp(radii[i], radii[i + 1], f - i);
}

/** olhos grandes de desenho animado (malha separada para piscar) */
export function eyeGeo({ sep = 0.115, r = 0.09, pupil = 0.037, white = '#ffffff', pupilCol = '#120f16', cross = 0, pupilY = 0.005, depth = 0.7, glow = false } = {}) {
  const b = new Builder();
  for (const s of [-1, 1]) {
    b.add(S.sphere(r, 14, 10), white, { p: [s * sep, 0, 0.05], s: [1, 1, depth] });
    const px = s * sep - s * cross * r * 0.45;
    b.add(S.sphere(pupil, 10, 8), pupilCol, { p: [px, pupilY, 0.05 + r * depth * 0.93], s: [1, 1, 0.5] });
    if (!glow) b.add(S.sphere(pupil * 0.32, 6, 5), '#ffffff', { p: [px - pupil * 0.35, pupilY + pupil * 0.45, 0.05 + r * depth * 0.93 + pupil * 0.3] });
  }
  return b.build();
}

function coffinShape(w, h) {
  return [
    [0, -h / 2], [w * 0.32, -h / 2], [w / 2, h * 0.18], [w * 0.32, h / 2], [-w * 0.32, h / 2], [-w / 2, h * 0.18], [-w * 0.32, -h / 2],
  ];
}

// ---------------------------------------------------------------------------
// VICENTE — o jogador
// ---------------------------------------------------------------------------
export function createPlayerModel() {
  const rig = new Rig('Vicente');
  const C = {
    skin: '#e9e6f5', bag: '#5a4870', hair: '#16121c', a: '#1c1a22', w: '#ebe6dc', scarf: '#d8452e',
    pants: '#26222e', sockA: '#6d3f8f', sockB: '#1c1a22', boot: '#2a1f1c', glove: '#f2efe6', wood: '#5a3e30',
  };
  rig.joint('hips', null, [0, 0.74, 0]);
  // pernas
  for (const [name, x] of [['legL', 0.1], ['legR', -0.1]]) {
    rig.joint(name, 'hips', [x, 0, 0]);
    const b = new Builder();
    b.add(S.cyl(0.075, 0.065, 0.12, 8), C.pants, { p: [0, -0.04, 0] });
    stripedLimb(b, 0.62, 0.052, 0.048, 7, C.sockA, C.sockB, 8);
    b.add(S.sphere(0.1, 12, 8), C.boot, { p: [0, -0.68, 0.05], s: [1.1, 0.72, 1.9] });
    b.add(S.tube(curlPoints(V3(0, -0.66, 0.22), V3(0, 0, 1), V3(0, 1, 0), 0.09, 0.9, 8, 0.6), (t) => 0.045 * (1 - t * 0.8), 6), C.boot);
    rig.attach(name, b.build());
  }
  // tronco
  rig.joint('torso', 'hips', [0, 0, 0]);
  {
    const b = new Builder();
    b.add(S.cyl(0.19, 0.2, 0.14, 12), C.pants, { p: [0, 0.02, 0], s: [1, 1, 0.85] });
    stripedTorso(b, 0.5, [0.21, 0.2, 0.17, 0.14], 6, C.a, C.w, 14);
    b.add(S.torus(0.12, 0.055, 6, 14), C.scarf, { p: [0, 0.5, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.85] });
    b.add(S.cyl(0.05, 0.055, 0.12, 8), C.skin, { p: [0, 0.56, 0] });
    // mochila-caixão
    b.add(S.extrude(coffinShape(0.28, 0.42), 0.1, 2), C.wood, { p: [0, 0.27, -0.2], flat: true });
    b.add(S.box(0.035, 0.18, 0.02), '#c9b27a', { p: [0, 0.3, -0.255] });
    b.add(S.box(0.12, 0.035, 0.02), '#c9b27a', { p: [0, 0.34, -0.255] });
    rig.attach('torso', b.build());
  }
  // ponta do cachecol (balança)
  rig.joint('scarf', 'torso', [0.07, 0.5, -0.1]);
  {
    const b = new Builder();
    b.add(S.box(0.09, 0.34, 0.03), C.scarf, { p: [0, -0.17, 0] });
    b.add(S.box(0.1, 0.03, 0.035), '#f0d060', { p: [0, -0.3, 0] });
    b.add(S.box(0.1, 0.03, 0.035), '#f0d060', { p: [0, -0.24, 0] });
    rig.attach('scarf', b.build());
  }
  // braços
  for (const [name, x, s] of [['armL', 0.19, 1], ['armR', -0.19, -1]]) {
    rig.joint(name, 'torso', [x, 0.44, 0]);
    const b = new Builder();
    b.add(S.sphere(0.06, 8, 6), C.a, { p: [0, 0, 0] });
    stripedLimb(b, 0.44, 0.046, 0.04, 5, C.a, C.w, 8);
    b.add(S.sphere(0.068, 10, 8), C.glove, { p: [0, -0.5, 0.01], s: [0.9, 1.1, 0.8] });
    b.add(S.sphere(0.03, 6, 5), C.glove, { p: [s * -0.05, -0.47, 0.045] });
    b.add(S.cyl(0.06, 0.05, 0.06, 8), C.glove, { p: [0, -0.43, 0] });
    rig.attach(name, b.build());
  }
  // cabeça
  rig.joint('head', 'torso', [0, 0.58, 0]);
  {
    const b = new Builder();
    b.add(S.sphere(0.3, 20, 16), C.skin, { p: [0, 0.3, 0], s: [1, 1.1, 0.96] });
    for (const s of [-1, 1]) {
      b.add(S.sphere(0.105, 12, 8), C.bag, { p: [s * 0.115, 0.31, 0.2], s: [1, 0.98, 0.6] });
      b.add(S.sphere(0.07, 8, 6), C.skin, { p: [s * 0.29, 0.28, 0], s: [0.45, 0.9, 0.7] });
    }
    b.add(S.sphere(0.028, 8, 6), '#d9c6d8', { p: [0, 0.245, 0.29] });
    b.add(S.torus(0.055, 0.011, 4, 10, Math.PI), '#3a2230', { p: [0, 0.175, 0.268], r: [0.35, 0, Math.PI] });
    // cabelo espetado
    b.add(S.sphere(0.31, 16, 10), C.hair, { p: [0, 0.39, -0.035], s: [1.03, 0.85, 1.03] });
    const rng = new RNG(11);
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * TAU;
      const rr = 0.18 + rng.range(-0.03, 0.05);
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr - 0.05;
      b.add(S.cone(rng.range(0.055, 0.085), rng.range(0.22, 0.36), 6), C.hair, {
        p: [x, 0.58 + rng.range(-0.02, 0.05), z], r: [z * 2.2 - 0.4, rng.range(-0.3, 0.3), -x * 2.2],
      });
    }
    b.add(S.tube(curlPoints(V3(0.05, 0.6, 0.2), V3(0, 0.3, 1).normalize(), V3(0, -1, 0.2).normalize(), 0.1, 1.1, 10, 0.7), (t) => 0.04 * (1 - t * 0.7), 5), C.hair);
    rig.attach('head', b.build());
  }
  rig.joint('eyes', 'head', [0, 0.33, 0.2]);
  rig.attach('eyes', eyeGeo({ sep: 0.115, r: 0.088, pupil: 0.036 }));

  // lanterna na mão esquerda
  rig.joint('lantern', 'armL', [0, -0.56, 0.04]);
  {
    const b = new Builder();
    const iron = '#2a2632';
    b.add(S.torus(0.04, 0.008, 4, 10, Math.PI), iron, { p: [0, 0.0, 0] });
    b.add(S.cone(0.07, 0.06, 6), iron, { p: [0, -0.05, 0] });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      b.add(S.cyl(0.007, 0.007, 0.13, 4), iron, { p: [Math.cos(a) * 0.055, -0.14, Math.sin(a) * 0.055] });
    }
    b.add(S.cyl(0.065, 0.07, 0.03, 8), iron, { p: [0, -0.215, 0] });
    rig.attach('lantern', b.build());
    const glowMatL = flameMat('#ffd9a0', '#ffc46b', 5);
    rig.lanternMat = glowMatL;
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), glowMatL);
    glow.position.set(0, -0.14, 0);
    rig.j.lantern.add(glow);
    rig.lanternGlow = glow;
  }

  // chapéu de abóbora (recompensa)
  {
    const b = new Builder();
    b.add(S.pumpkin(0.2, 8, 16, 10), '#e0742c', { p: [0, 0, 0] });
    b.add(S.cyl(0.02, 0.03, 0.09, 6), '#4a5a2a', { p: [0, 0.18, 0], r: [0, 0, 0.3] });
    b.add(S.tube(curlPoints(V3(0.02, 0.2, 0), V3(1, 0, 0), V3(0, 1, 0), 0.07, 1.2, 8, 0.6), 0.008, 4), '#5a7a2a');
    const hat = rig.attach('head', b.build());
    hat.position.set(0.03, 0.66, -0.02);
    hat.rotation.set(-0.15, 0, -0.2);
    hat.visible = false;
    rig.hat = hat;
  }

  // balanço do cachecol
  rig.extra = (dt, s, r) => {
    const sp = s.speed || 0;
    r.j.scarf.rotation.x = lerp(r.j.scarf.rotation.x, -0.25 - Math.min(sp, 9) * 0.1 + Math.sin(r.t * 9) * 0.06 * (sp > 0.5 ? 1 : 0.3), 0.15);
    r.j.scarf.rotation.z = Math.sin(r.t * 2.3) * 0.08;
  };
  rig.height = 1.9;
  rig.portraitY = 1.62;
  rig.portraitDist = 1.6;
  return rig;
}

/** vassoura (montaria) */
export function createBroomModel() {
  const b = new Builder();
  b.add(S.tube([V3(0, 0, -0.9), V3(0.02, 0.03, -0.2), V3(-0.01, 0.0, 0.4), V3(0.02, 0.06, 0.9)], 0.035, 6), '#6a4a32');
  b.add(S.cone(0.2, 0.62, 10), '#c9a24a', { p: [0, 0, -1.12], r: [-Math.PI / 2, 0, 0], s: [1, 1, 0.8] });
  b.add(S.torus(0.05, 0.015, 4, 10), '#8a2a3a', { p: [0, 0, -0.84] });
  b.add(S.torus(0.04, 0.012, 4, 10), '#8a2a3a', { p: [0, 0, -0.9] });
  const m = new THREE.Mesh(b.build(), toonMat({ vertexColors: true }));
  m.castShadow = true;
  return m;
}
