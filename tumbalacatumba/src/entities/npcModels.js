import * as THREE from 'three';
import { Builder, S, curlPoints } from '../render/builder.js';
import { GLOW, SHARED, toonMat } from '../render/toon.js';
import { LAYER_FX } from '../render/postfx.js';
import { Rig } from './rig.js';
import { eyeGeo, stripedLimb } from './models.js';
import { RNG } from '../util/rng.js';
import { TAU, lerp, clamp, damp } from '../util/math.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const _c = new THREE.Color();

// ---------------------------------------------------------------------------
// material dos fantasmas: translúcido com brilho nas bordas
// ---------------------------------------------------------------------------
export function ghostMat() {
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uNight: { value: 0 }, uHighlight: { value: 0 } }]),
    vertexShader: /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>
      varying vec3 vN; varying vec3 vV; varying vec3 vCol;
      void main() {
        vCol = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      uniform float uNight, uHighlight;
      varying vec3 vN; varying vec3 vV; varying vec3 vCol;
      void main() {
        float fr = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
        vec3 c = vCol * (0.5 + 0.75 * fr) * (0.72 + 0.55 * uNight) + uHighlight * 0.12;
        float lum = dot(vCol, vec3(0.33));
        float a = clamp(0.45 + 0.5 * fr + (1.0 - smoothstep(0.05, 0.25, lum)) * 0.5, 0.0, 0.96);
        gl_FragColor = vec4(c, a);
        #include <fog_fragment>
      }`,
    transparent: true,
    vertexColors: true,
    fog: true,
  });
  m.uniforms.uNight = SHARED.uNight;
  return m;
}

function limb(b, len, r0, r1, col, seg = 7) {
  b.add(S.cyl(r1, r0, len, seg), col, { p: [0, -len / 2, 0] });
}
function hand(b, y, col, s = 1) {
  b.add(S.sphere(0.065 * s, 8, 6), col, { p: [0, y, 0.01], s: [0.9, 1.1, 0.8] });
  b.add(S.sphere(0.028 * s, 5, 4), col, { p: [-0.045 * s, y + 0.02, 0.04] });
}
function boot(b, y, col, curl = true) {
  b.add(S.sphere(0.09, 10, 7), col, { p: [0, y, 0.05], s: [1.1, 0.7, 1.8] });
  if (curl) b.add(S.tube(curlPoints(V3(0, y + 0.02, 0.2), V3(0, 0, 1), V3(0, 1, 0), 0.08, 0.9, 7, 0.6), (t) => 0.04 * (1 - t * 0.8), 5), col);
}

// ---------------------------------------------------------------------------
// PREFEITO ABÓBORA — cabeça gira entre o rosto feliz e o preocupado
// ---------------------------------------------------------------------------
export function createMayor() {
  const rig = new Rig('Prefeito Abóbora');
  const C = { suit: '#1e1a26', suit2: '#2e2838', shirt: '#e6dcc6', sash: '#b8343a', glove: '#f2efe6', pants1: '#2a2632', pants2: '#5a5668' };
  rig.joint('hips', null, [0, 0.9, 0]);
  for (const [n, x] of [['legL', 0.11], ['legR', -0.11]]) {
    rig.joint(n, 'hips', [x, 0, 0]);
    const b = new Builder();
    stripedLimb(b, 0.82, 0.06, 0.05, 8, C.pants1, C.pants2, 8);
    boot(b, -0.86, '#1a1418');
    rig.attach(n, b.build());
  }
  rig.joint('torso', 'hips', [0, 0, 0]);
  {
    const b = new Builder();
    b.add(S.cyl(0.2, 0.24, 0.66, 12), C.suit, { p: [0, 0.3, 0], s: [1, 1, 0.8] });
    b.add(S.box(0.2, 0.5, 0.02), C.shirt, { p: [0, 0.38, 0.17] });
    b.add(S.cone(0.06, 0.12, 3), '#b8343a', { p: [0, 0.6, 0.18], r: [Math.PI, 0, 0] });
    // fraque com abas
    for (const s of [-1, 1]) b.add(S.box(0.2, 0.6, 0.05), C.suit2, { p: [s * 0.1, -0.15, -0.17], r: [0.18, 0, s * 0.12] });
    // faixa de prefeito
    b.add(S.box(0.1, 0.8, 0.03), C.sash, { p: [0.02, 0.3, 0.19], r: [0, 0, 0.62] });
    b.add(S.sphere(0.06, 8, 6), '#f0c040', { p: [-0.12, 0.08, 0.2] });
    b.add(S.cyl(0.12, 0.06, 0.12, 8), C.suit, { p: [0, 0.68, 0] });
    rig.attach('torso', b.build());
  }
  for (const [n, x, s] of [['armL', 0.24, 1], ['armR', -0.24, -1]]) {
    rig.joint(n, 'torso', [x, 0.58, 0]);
    const b = new Builder();
    limb(b, 0.6, 0.06, 0.045, C.suit);
    hand(b, -0.66, C.glove);
    rig.attach(n, b.build());
  }
  rig.joint('head', 'torso', [0, 0.74, 0]);
  {
    const b = new Builder();
    const g = new Builder();
    b.add(S.pumpkin(0.4, 9, 22, 14), (x, y) => _c.set('#b8561e').lerp(new THREE.Color('#ec8a3a'), clamp(0.5 + y, 0, 1)), { p: [0, 0.38, 0] });
    // rosto feliz (+z)
    const face = (zs, happy) => {
      const zf = 0.36 * zs;
      const eye = (sx) => {
        const pts = happy ? [[-0.07, 0], [0.07, 0], [0, 0.1]] : [[-0.07, 0.08], [0.07, 0.03], [0.02, -0.04]];
        g.add(S.extrude(pts.map(([x, y]) => [x * sx, y]), 0.04, 1), '#fff', { p: [sx * 0.13 * zs, 0.47, zf], r: [0, zs < 0 ? Math.PI : 0, 0] });
      };
      eye(-1);
      eye(1);
      const pts = [];
      for (let i = 0; i <= 8; i++) {
        const t = i / 8, x = (t - 0.5) * 0.44;
        const y = happy ? -Math.sin(t * Math.PI) * 0.12 : Math.sin(t * Math.PI) * 0.07 - 0.02;
        pts.push([x, y + (i % 2 ? -0.02 : 0.01)]);
      }
      for (let i = 8; i >= 0; i--) {
        const t = i / 8, x = (t - 0.5) * 0.44;
        const y = happy ? -Math.sin(t * Math.PI) * 0.12 - 0.07 : Math.sin(t * Math.PI) * 0.07 - 0.07;
        pts.push([x, y]);
      }
      g.add(S.extrude(pts, 0.04, 1), '#fff', { p: [0, 0.3, zf - 0.02 * zs], r: [0, zs < 0 ? Math.PI : 0, 0] });
    };
    face(1, true);
    face(-1, false);
    // cartola com aranha
    b.add(S.cylB(0.2, 0.19, 0.5, 14), C.suit, { p: [0, 0.72, 0], r: [0.05, 0, 0.08] });
    b.add(S.cylB(0.34, 0.34, 0.03, 16), C.suit, { p: [0, 0.72, 0], r: [0.05, 0, 0.08] });
    b.add(S.cylB(0.205, 0.205, 0.07, 14), '#d8662a', { p: [0.006, 0.76, 0.004], r: [0.05, 0, 0.08] });
    b.add(S.sphere(0.05, 6, 5), '#111', { p: [0.02, 0.8, 0.2] });
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) b.add(S.cyl(0.006, 0.006, 0.09, 3), '#111', { p: [0.02 + s * 0.05, 0.8 - 0.01 * i, 0.2], r: [0, 0, s * (0.6 + i * 0.25)] });
    b.add(S.cone(0.05, 0.14, 5), '#4d5a2a', { p: [0, 0.74, 0] });
    rig.attach('head', b.build());
    rig.faceMesh = rig.attach('head', g.build(), GLOW.jack, { cast: false });
  }
  rig.mood = 0; // 0 = feliz, 1 = preocupado
  rig.spin = 0;
  rig.gag = 0;
  rig.gagT = 9 + Math.random() * 6;
  rig.extra = (dt, s, r) => {
    r.spin = damp(r.spin, r.mood ? Math.PI : 0, 4, dt);
    r.gagT -= dt;
    if (r.gagT < 0) {
      r.gag += dt * 7;
      if (r.gag >= Math.PI * 2) {
        r.gag = 0;
        r.gagT = 14 + Math.random() * 10;
      }
    }
    r.j.head.rotation.y += r.spin + r.gag + Math.sin(r.t * 2) * 0.03;
  };
  rig.height = 2.35;
  rig.portraitY = 1.95;
  return rig;
}

// ---------------------------------------------------------------------------
// DONA ARANHILDA — vizinha dos gatos
// ---------------------------------------------------------------------------
export function createAranhilda() {
  const rig = new Rig('Dona Aranhilda');
  const C = { skin: '#d8cce8', dress: '#5a3a7a', dress2: '#4a2e66', shawl: '#2e4a3a', hair: '#9a90aa', shoe: '#1e1a22' };
  rig.joint('hips', null, [0, 0.72, 0]);
  {
    const b = new Builder();
    b.add(S.cyl(0.2, 0.46, 0.82, 16), (x, y) => (Math.floor((y + 0.5) * 9) % 2 ? _c.set(C.dress) : _c.set(C.dress2)), { p: [0, -0.33, 0] });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      b.add(S.cone(0.08, 0.14, 4), C.dress2, { p: [Math.cos(a) * 0.44, -0.74, Math.sin(a) * 0.44], r: [Math.PI, 0, 0] });
    }
    b.add(S.sphere(0.07, 6, 5), C.shoe, { p: [0.12, -0.72, 0.28], s: [1, 0.6, 1.6] });
    b.add(S.sphere(0.07, 6, 5), C.shoe, { p: [-0.12, -0.72, 0.28], s: [1, 0.6, 1.6] });
    rig.attach('hips', b.build());
  }
  rig.joint('torso', 'hips', [0, 0, 0]);
  {
    const b = new Builder();
    b.add(S.cyl(0.16, 0.2, 0.5, 12), C.dress, { p: [0, 0.22, 0], s: [1, 1, 0.85] });
    b.add(S.torus(0.18, 0.08, 6, 14), C.shawl, { p: [0, 0.44, 0.0], r: [Math.PI / 2 + 0.2, 0, 0] });
    b.add(S.cone(0.28, 0.4, 10), C.shawl, { p: [0, 0.3, -0.06], s: [1, 1, 0.5], r: [0.1, 0, 0] });
    for (let i = 0; i < 3; i++) b.add(S.sphere(0.025, 5, 4), '#e8e0d0', { p: [0, 0.38 - i * 0.1, 0.17] });
    rig.attach('torso', b.build());
  }
  for (const [n, x] of [['armL', 0.19], ['armR', -0.19]]) {
    rig.joint(n, 'torso', [x, 0.42, 0]);
    const b = new Builder();
    limb(b, 0.5, 0.05, 0.035, C.dress);
    hand(b, -0.55, C.skin, 0.9);
    if (n === 'armR') {
      b.add(S.cyl(0.018, 0.018, 1.0, 5), '#3a2a22', { p: [0, -0.9, 0.08] });
      b.add(S.tube(curlPoints(V3(0, -0.42, 0.08), V3(0, 1, 0), V3(0, 0, 1), 0.08, 0.6, 6, 0.3), 0.02, 4), '#3a2a22');
    }
    rig.attach(n, b.build());
  }
  rig.joint('head', 'torso', [0, 0.5, 0.03]);
  {
    const b = new Builder();
    b.add(S.sphere(0.24, 16, 12), C.skin, { p: [0, 0.22, 0] });
    b.add(S.tube([V3(0, 0.2, 0.2), V3(0, 0.15, 0.36), V3(0, 0.08, 0.42)], (t) => 0.05 * (1 - t * 0.7), 6), '#c8b8d8');
    b.add(S.torus(0.05, 0.01, 4, 10, Math.PI), '#6a3a4a', { p: [0, 0.06, 0.22], r: [0.3, 0, Math.PI] });
    for (const s of [-1, 1]) {
      b.add(S.torus(0.075, 0.014, 5, 14), '#2a2230', { p: [s * 0.09, 0.26, 0.22] });
      b.add(S.disc(0.07, 12), '#eef4ff', { p: [s * 0.09, 0.26, 0.215] });
    }
    b.add(S.box(0.05, 0.012, 0.012), '#2a2230', { p: [0, 0.27, 0.23] });
    // penteado-colmeia com aranhas
    let y = 0.36;
    for (let i = 0; i < 5; i++) {
      const r = 0.27 - i * 0.035;
      b.add(S.sphere(r, 14, 10), (x, yy) => _c.set(C.hair).multiplyScalar(0.85 + 0.15 * Math.sin(yy * 30)), { p: [0.02 * i, y + r * 0.6, -0.04], s: [1, 0.85, 1] });
      y += r * 1.05;
    }
    const rng = new RNG(4);
    for (let k = 0; k < 3; k++) {
      const a = rng.range(-1.2, 1.2), yy = 0.55 + k * 0.28;
      const px = Math.sin(a) * 0.24, pz = Math.cos(a) * 0.2 - 0.04;
      b.add(S.sphere(0.04, 6, 5), '#111', { p: [px, yy, pz] });
      for (let l = 0; l < 4; l++) for (const s of [-1, 1]) b.add(S.cyl(0.005, 0.005, 0.1, 3), '#111', { p: [px + s * 0.05, yy - 0.01 + l * 0.012, pz], r: [0, a, s * (0.9 + l * 0.2)] });
    }
    rig.attach('head', b.build());
  }
  rig.joint('eyes', 'head', [0, 0.26, 0.2]);
  rig.attach('eyes', eyeGeo({ sep: 0.09, r: 0.04, pupil: 0.022 }));
  rig.poseBias = { torsoX: 0.28, headX: -0.25 };
  rig.height = 1.95;
  rig.portraitY = 1.35;
  return rig;
}

// ---------------------------------------------------------------------------
// JUVENAL — esqueleto festeiro (perdeu ossos no baile)
// ---------------------------------------------------------------------------
export function createSkeleton() {
  const rig = new Rig('Juvenal');
  const B = '#ece6d4', D = '#c8bfa8';
  rig.joint('hips', null, [0, 0.82, 0]);
  {
    const b = new Builder();
    b.add(S.torus(0.13, 0.05, 6, 12), B, { p: [0, 0, 0], r: [Math.PI / 2, 0, 0], s: [1.2, 0.9, 1] });
    rig.attach('hips', b.build());
  }
  for (const [n, x] of [['legL', 0.1], ['legR', -0.1]]) {
    rig.joint(n, 'hips', [x, -0.02, 0]);
    const b = new Builder();
    b.add(S.cyl(0.028, 0.028, 0.38, 6), B, { p: [0, -0.2, 0] });
    b.add(S.sphere(0.045, 6, 5), D, { p: [0, -0.4, 0.01] });
    b.add(S.cyl(0.024, 0.024, 0.36, 6), B, { p: [0, -0.6, 0] });
    b.add(S.box(0.1, 0.05, 0.22), B, { p: [0, -0.8, 0.06] });
    rig.legMeshes = rig.legMeshes || {};
    rig.legMeshes[n] = rig.attach(n, b.build());
  }
  rig.joint('torso', 'hips', [0, 0.02, 0]);
  {
    const b = new Builder();
    for (let i = 0; i < 6; i++) b.add(S.sphere(0.035, 6, 5), D, { p: [0, 0.05 + i * 0.08, -0.06] });
    for (let i = 0; i < 4; i++) b.add(S.torus(0.14 - i * 0.012, 0.018, 4, 12, Math.PI * 1.5), B, { p: [0, 0.2 + i * 0.085, 0.0], r: [Math.PI / 2, 0, Math.PI * 0.75], s: [1, 0.8, 1] });
    b.add(S.box(0.035, 0.28, 0.03), B, { p: [0, 0.3, 0.12] });
    b.add(S.cyl(0.02, 0.02, 0.4, 5), B, { p: [0, 0.54, 0], r: [0, 0, Math.PI / 2] });
    b.add(S.cyl(0.025, 0.025, 0.16, 5), D, { p: [0, 0.63, -0.02] });
    rig.attach('torso', b.build());
  }
  for (const [n, x] of [['armL', 0.21], ['armR', -0.21]]) {
    rig.joint(n, 'torso', [x, 0.54, 0]);
    const b = new Builder();
    b.add(S.sphere(0.04, 6, 5), D, {});
    b.add(S.cyl(0.022, 0.022, 0.3, 6), B, { p: [0, -0.16, 0] });
    b.add(S.sphere(0.035, 6, 5), D, { p: [0, -0.32, 0] });
    b.add(S.cyl(0.02, 0.02, 0.28, 6), B, { p: [0, -0.47, 0] });
    b.add(S.sphere(0.045, 6, 5), B, { p: [0, -0.63, 0] });
    for (let f = 0; f < 3; f++) b.add(S.cyl(0.008, 0.008, 0.07, 3), B, { p: [-0.02 + f * 0.02, -0.69, 0.01] });
    rig.armMeshes = rig.armMeshes || {};
    rig.armMeshes[n] = rig.attach(n, b.build());
  }
  rig.joint('head', 'torso', [0, 0.7, 0]);
  {
    const b = new Builder();
    const g = new Builder();
    b.add(S.sphere(0.22, 16, 12), B, { p: [0, 0.2, 0], s: [1, 1.05, 1.1] });
    for (const s of [-1, 1]) {
      b.add(S.sphere(0.075, 8, 6), '#1a1418', { p: [s * 0.085, 0.22, 0.19], s: [1, 1.15, 0.6] });
      g.add(S.sphere(0.022, 6, 5), '#fff', { p: [s * 0.085, 0.22, 0.225] });
    }
    b.add(S.cone(0.03, 0.05, 3), '#1a1418', { p: [0, 0.14, 0.23], r: [Math.PI, 0, 0] });
    // chapéu de festa torto
    b.add(S.cone(0.1, 0.3, 10), (x, y) => (Math.floor(y * 22) % 2 ? _c.set('#d8662a') : _c.set('#5a2a6a')), { p: [0.08, 0.5, -0.02], r: [0.1, 0, -0.35] });
    b.add(S.sphere(0.035, 6, 5), '#f0d060', { p: [0.13, 0.64, -0.01] });
    rig.attach('head', b.build());
    rig.attach('head', g.build(), GLOW.eyes, { cast: false });
  }
  rig.joint('jaw', 'head', [0, 0.11, 0.02]);
  {
    const b = new Builder();
    b.add(new THREE.SphereGeometry(0.13, 10, 6, 0, TAU, Math.PI / 2, Math.PI / 2), B, { s: [1, 0.6, 1.1] });
    for (let i = 0; i < 6; i++) b.add(S.box(0.022, 0.03, 0.02), '#fff', { p: [-0.06 + i * 0.024, 0.0, 0.13] });
    rig.attach('jaw', b.build());
  }
  rig.complete = false;
  rig.setComplete = (v) => {
    rig.complete = v;
    rig.armMeshes.armL.visible = v;
    rig.legMeshes.legR.visible = v;
  };
  rig.setComplete(false);
  rig.extra = (dt, s, r) => {
    r.j.jaw.rotation.x = s.action === 'talk' ? Math.max(0, Math.sin(r.t * 14)) * 0.35 : Math.max(0, Math.sin(r.t * 1.3)) * 0.05;
    if (!r.complete && !s.action) {
      // pulinhos numa perna só
      r.body.position.y = Math.abs(Math.sin(r.t * 3)) * 0.06;
      r.j.legL.rotation.x = -0.1;
      r.j.torso.rotation.z = Math.sin(r.t * 3) * 0.06;
    }
  };
  rig.height = 1.8;
  rig.portraitY = 1.72;
  return rig;
}

// ---------------------------------------------------------------------------
// COVEIRO TONICO
// ---------------------------------------------------------------------------
export function createGravedigger() {
  const rig = new Rig('Coveiro Tonico');
  const C = { coat: '#4a3a2e', coat2: '#3a2c22', skin: '#c8b8a8', cap: '#3a3a44', pants: '#2e2a30', boot: '#1e1814' };
  rig.joint('hips', null, [0, 0.72, 0]);
  for (const [n, x] of [['legL', 0.1], ['legR', -0.1]]) {
    rig.joint(n, 'hips', [x, 0, 0]);
    const b = new Builder();
    limb(b, 0.66, 0.065, 0.055, C.pants);
    boot(b, -0.68, C.boot, false);
    rig.attach(n, b.build());
  }
  rig.joint('torso', 'hips', [0, 0, 0]);
  {
    const b = new Builder();
    b.add(S.cyl(0.22, 0.3, 0.9, 12), (x, y) => (y < -0.2 ? _c.set(C.coat2) : _c.set(C.coat)), { p: [0, 0.18, 0], s: [1, 1, 0.85] });
    b.add(S.sphere(0.2, 10, 8), C.coat, { p: [0, 0.55, -0.1], s: [1.2, 0.7, 0.9] });
    for (let i = 0; i < 4; i++) b.add(S.sphere(0.025, 5, 4), '#8a7a4a', { p: [0.04, 0.5 - i * 0.14, 0.23] });
    b.add(S.box(0.5, 0.06, 0.4), '#2a1e18', { p: [0, 0.1, 0], s: [1, 1, 1] });
    // lanterna apagada na cintura
    b.add(S.cylB(0.06, 0.07, 0.16, 6), '#2a2632', { p: [0.24, -0.1, 0.1] });
    rig.attach('torso', b.build());
    const lg = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: '#1a1a14' }));
    lg.position.set(0.24, -0.02, 0.1);
    rig.j.torso.add(lg);
    rig.lanternGlow = lg;
  }
  for (const [n, x] of [['armL', 0.25], ['armR', -0.25]]) {
    rig.joint(n, 'torso', [x, 0.56, 0]);
    const b = new Builder();
    limb(b, 0.58, 0.07, 0.055, C.coat);
    hand(b, -0.64, C.skin);
    if (n === 'armR') {
      b.add(S.cyl(0.025, 0.025, 1.6, 5), '#6a4a32', { p: [0, -0.5, 0.12], r: [0.1, 0, 0] });
      b.add(S.box(0.26, 0.34, 0.03), '#6a6a74', { p: [0, -1.36, 0.2], r: [0.1, 0, 0] });
    }
    rig.attach(n, b.build());
  }
  rig.joint('head', 'torso', [0, 0.66, 0.06]);
  {
    const b = new Builder();
    b.add(S.sphere(0.25, 14, 12), C.skin, { p: [0, 0.2, 0], s: [1, 1.05, 1] });
    b.add(S.sphere(0.09, 8, 6), '#b89a8a', { p: [0, 0.15, 0.26], s: [1, 1.1, 1.3] });
    for (const s of [-1, 1]) b.add(S.box(0.13, 0.05, 0.05), '#eeeeee', { p: [s * 0.09, 0.33, 0.21], r: [0, 0, s * -0.3] });
    b.add(S.torus(0.06, 0.012, 4, 10, Math.PI), '#3a2230', { p: [0, 0.05, 0.22], r: [0.3, 0, Math.PI] });
    for (let i = 0; i < 14; i++) b.add(S.sphere(0.01, 3, 3), '#6a6a6a', { p: [Math.sin(i * 1.7) * 0.14, -0.01 + (i % 3) * 0.03, 0.2 + Math.cos(i) * 0.02] });
    b.add(S.cylB(0.26, 0.27, 0.12, 14), C.cap, { p: [0, 0.36, -0.02], r: [-0.12, 0, 0.06] });
    b.add(S.box(0.3, 0.03, 0.16), C.cap, { p: [0, 0.37, 0.24], r: [-0.25, 0, 0.06] });
    rig.attach('head', b.build());
  }
  rig.joint('eyes', 'head', [0, 0.24, 0.2]);
  {
    const b = new Builder();
    b.add(S.sphere(0.065, 10, 8), '#fff', { p: [0.09, 0, 0.03], s: [1, 1, 0.7] });
    b.add(S.sphere(0.035, 8, 6), '#fff', { p: [-0.08, 0, 0.03], s: [1, 1, 0.7] });
    b.add(S.sphere(0.028, 6, 5), '#111', { p: [0.09, 0, 0.075], s: [1, 1, 0.5] });
    b.add(S.sphere(0.018, 6, 5), '#111', { p: [-0.08, 0, 0.055], s: [1, 1, 0.5] });
    b.add(S.torus(0.07, 0.008, 4, 12), '#c9a24a', { p: [0.09, 0, 0.07] });
    rig.attach('eyes', b.build());
  }
  rig.poseBias = { torsoX: 0.22, headX: -0.18 };
  rig.height = 1.85;
  rig.portraitY = 1.55;
  return rig;
}

// ---------------------------------------------------------------------------
// SEU CUSTÓDIO — fazendeiro de retalhos (costurado)
// ---------------------------------------------------------------------------
export function createFarmer() {
  const rig = new Rig('Seu Custódio');
  const C = { skin: '#b8c8a0', over: '#4a5a7a', boot: '#3a2a1e', hat: '#c9a24a', hat2: '#a8823a' };
  const plaid = (x, y, z) => {
    const a = Math.floor(Math.atan2(z, x) * 3 + 20) % 2, b2 = Math.floor(y * 10 + 20) % 2;
    return a ^ b2 ? _c.set('#8a2a2a') : _c.set(a && b2 ? '#1e1a22' : '#b8343a');
  };
  rig.joint('hips', null, [0, 0.74, 0]);
  for (const [n, x] of [['legL', 0.13], ['legR', -0.13]]) {
    rig.joint(n, 'hips', [x, 0, 0]);
    const b = new Builder();
    limb(b, 0.66, 0.085, 0.075, C.over);
    b.add(S.box(0.07, 0.07, 0.02), '#5a7a9a', { p: [0, -0.3, 0.085] });
    boot(b, -0.7, C.boot, false);
    rig.attach(n, b.build());
  }
  rig.joint('torso', 'hips', [0, 0, 0]);
  {
    const b = new Builder();
    b.add(S.cyl(0.27, 0.31, 0.58, 14), plaid, { p: [0, 0.3, 0], s: [1, 1, 0.8] });
    b.add(S.cyl(0.285, 0.315, 0.32, 14), C.over, { p: [0, 0.12, 0.005], s: [1, 1, 0.82] });
    b.add(S.box(0.3, 0.3, 0.05), C.over, { p: [0, 0.38, 0.24] });
    for (const s of [-1, 1]) {
      b.add(S.box(0.05, 0.4, 0.03), C.over, { p: [s * 0.12, 0.45, 0.24], r: [0, 0, s * 0.1] });
      b.add(S.sphere(0.03, 5, 4), '#d0c060', { p: [s * 0.12, 0.5, 0.265] });
    }
    // remendos costurados
    b.add(S.box(0.12, 0.1, 0.02), '#8a7a4a', { p: [-0.1, 0.12, 0.25] });
    rig.attach('torso', b.build());
  }
  for (const [n, x] of [['armL', 0.3], ['armR', -0.3]]) {
    rig.joint(n, 'torso', [x, 0.54, 0]);
    const b = new Builder();
    b.add(S.cyl(0.075, 0.085, 0.3, 8), plaid, { p: [0, -0.15, 0] });
    b.add(S.cyl(0.055, 0.065, 0.28, 8), C.skin, { p: [0, -0.43, 0] });
    for (let i = 0; i < 4; i++) b.add(S.box(0.13, 0.012, 0.012), '#2a2a22', { p: [0, -0.35 - i * 0.04, 0.065] });
    hand(b, -0.62, C.skin, 1.2);
    if (n === 'armL') {
      b.add(S.cyl(0.022, 0.022, 1.9, 5), '#6a4a32', { p: [0, -0.4, 0.1] });
      for (const dx of [-0.08, 0, 0.08]) b.add(S.cone(0.018, 0.3, 4), '#8a8a94', { p: [dx, 0.62, 0.1] });
      b.add(S.box(0.2, 0.03, 0.03), '#8a8a94', { p: [0, 0.47, 0.1] });
    }
    rig.attach(n, b.build());
  }
  rig.joint('head', 'torso', [0, 0.64, 0]);
  {
    const b = new Builder();
    b.add(S.sphere(0.26, 14, 12), C.skin, { p: [0, 0.2, 0], s: [1.05, 1, 1] });
    // costuras
    b.add(S.box(0.3, 0.012, 0.012), '#2a2a22', { p: [0, 0.34, 0.22], r: [0.4, 0, 0.1] });
    for (let i = 0; i < 6; i++) b.add(S.box(0.012, 0.05, 0.012), '#2a2a22', { p: [-0.12 + i * 0.05, 0.34, 0.225], r: [0.4, 0, 0.1] });
    b.add(S.sphere(0.07, 8, 6), '#a8b890', { p: [0, 0.15, 0.26] });
    // bigodão
    for (const s of [-1, 1]) b.add(S.tube([V3(0, 0.1, 0.26), V3(s * 0.1, 0.08, 0.25), V3(s * 0.17, 0.12, 0.2)], (t) => 0.035 * (1 - t * 0.5), 5), '#5a3a22');
    // chapéu de palha
    b.add(S.cylB(0.2, 0.24, 0.2, 14), C.hat, { p: [0, 0.36, 0], r: [0, 0, -0.08] });
    b.add(S.cylB(0.46, 0.46, 0.03, 18), C.hat2, { p: [0, 0.37, 0], r: [0.08, 0, -0.08] });
    b.add(S.cylB(0.205, 0.205, 0.05, 14), '#8a2a2a', { p: [0, 0.4, 0], r: [0, 0, -0.08] });
    rig.attach('head', b.build());
  }
  rig.joint('eyes', 'head', [0, 0.25, 0.21]);
  rig.attach('eyes', eyeGeo({ sep: 0.09, r: 0.05, pupil: 0.026 }));
  rig.height = 1.95;
  rig.portraitY = 1.55;
  return rig;
}

// ---------------------------------------------------------------------------
// ZÉ PALHA — espantalho insone (fica pendurado na estaca)
// ---------------------------------------------------------------------------
export function createScarecrow() {
  const rig = new Rig('Zé Palha');
  const C = { burlap: '#b09a6a', shirt: '#5a6a4a', patch1: '#8a3a3a', patch2: '#4a4a7a', straw: '#d8b85a', hat: '#2e3a2e', pants: '#6a5a4a' };
  {
    const b = new Builder();
    b.add(S.cylB(0.06, 0.07, 2.6, 6), '#5a4232', { p: [0, 0, -0.1] });
    b.add(S.cyl(0.05, 0.05, 1.7, 6), '#5a4232', { p: [0, 2.0, -0.12], r: [0, 0, Math.PI / 2] });
    rig.attach(rig.body, b.build());
  }
  rig.joint('hips', null, [0, 1.25, 0]);
  for (const [n, x] of [['legL', 0.1], ['legR', -0.1]]) {
    rig.joint(n, 'hips', [x, 0, 0]);
    const b = new Builder();
    limb(b, 0.6, 0.08, 0.07, C.pants);
    for (let i = 0; i < 5; i++) b.add(S.cone(0.025, 0.2, 3), C.straw, { p: [Math.cos(i * 1.3) * 0.05, -0.66, Math.sin(i * 1.3) * 0.05], r: [Math.PI + Math.cos(i) * 0.4, 0, Math.sin(i) * 0.4] });
    rig.attach(n, b.build());
  }
  rig.joint('torso', 'hips', [0, 0, 0]);
  {
    const b = new Builder();
    b.add(S.cyl(0.22, 0.24, 0.66, 10), C.shirt, { p: [0, 0.3, 0], s: [1, 1, 0.7] });
    b.add(S.box(0.14, 0.14, 0.02), C.patch1, { p: [0.08, 0.2, 0.17], r: [0, 0, 0.2] });
    b.add(S.box(0.12, 0.1, 0.02), C.patch2, { p: [-0.1, 0.42, 0.17], r: [0, 0, -0.3] });
    for (let i = 0; i < 7; i++) b.add(S.cone(0.025, 0.2, 3), C.straw, { p: [Math.cos(i) * 0.08, 0.66, Math.sin(i) * 0.06], r: [Math.cos(i) * 0.5, 0, Math.sin(i) * 0.5] });
    rig.attach('torso', b.build());
  }
  for (const [n, x, s] of [['armL', 0.22, 1], ['armR', -0.22, -1]]) {
    rig.joint(n, 'torso', [x, 0.56, 0]);
    const b = new Builder();
    b.add(S.cyl(0.06, 0.07, 0.62, 8), C.shirt, { p: [0, -0.31, 0] });
    for (let i = 0; i < 6; i++) b.add(S.cone(0.022, 0.22, 3), C.straw, { p: [Math.cos(i * 1.1) * 0.04, -0.68, Math.sin(i * 1.1) * 0.04], r: [Math.PI + Math.cos(i) * 0.5, 0, Math.sin(i) * 0.5] });
    rig.attach(n, b.build());
  }
  rig.joint('head', 'torso', [0, 0.7, 0]);
  {
    const b = new Builder();
    b.add(S.sphere(0.25, 12, 10), (x, y, z) => _c.set(C.burlap).multiplyScalar(0.85 + 0.15 * Math.sin(x * 60) * Math.sin(y * 60)), { p: [0, 0.22, 0], s: [1, 1.1, 0.95] });
    b.add(S.cone(0.1, 0.12, 6), C.burlap, { p: [0, 0.0, 0], r: [Math.PI, 0, 0] });
    b.add(S.torus(0.11, 0.02, 4, 10), '#6a5a3a', { p: [0, 0.02, 0], r: [Math.PI / 2, 0, 0] });
    // olhos de botão e boca costurada
    b.add(S.cyl(0.06, 0.06, 0.02, 10), '#1e1a22', { p: [0.09, 0.28, 0.22], r: [Math.PI / 2, 0, 0] });
    b.add(S.cyl(0.04, 0.04, 0.02, 10), '#3a2a5a', { p: [-0.09, 0.26, 0.225], r: [Math.PI / 2, 0, 0] });
    for (const [x, y] of [[0.09, 0.28], [-0.09, 0.26]]) for (const d of [-1, 1]) b.add(S.sphere(0.008, 3, 3), '#e6dcc6', { p: [x + d * 0.012, y + d * 0.012, 0.235] });
    b.add(S.torus(0.1, 0.008, 3, 12, Math.PI), '#1e1a22', { p: [0, 0.14, 0.2], r: [0.35, 0, Math.PI] });
    for (let i = 0; i < 7; i++) b.add(S.box(0.008, 0.05, 0.008), '#1e1a22', { p: [-0.09 + i * 0.03, 0.11 - Math.sin((i / 6) * Math.PI) * 0.03, 0.225] });
    // chapéu mole de bruxa
    b.add(S.cylB(0.4, 0.4, 0.03, 16), C.hat, { p: [0, 0.4, 0], r: [0.1, 0, 0.1] });
    b.add(S.tube([V3(0, 0.4, 0), V3(0, 0.62, -0.02), V3(0.08, 0.8, -0.05), V3(0.26, 0.82, -0.08)], (t) => 0.22 * (1 - t) + 0.02, 10), C.hat);
    rig.attach('head', b.build());
  }
  rig.poseBias = { armLz: 1.4, armRz: -1.4, legL: 0, headZ: 0.25 };
  rig.extra = (dt, s, r) => {
    r.j.head.rotation.z = 0.25 + Math.sin(r.t * 0.8) * 0.12;
    r.j.armL.rotation.z = 1.35 + Math.sin(r.t * 1.3) * 0.08 + (s.action === 'talk' ? Math.sin(r.t * 8) * 0.15 : 0);
    r.j.armR.rotation.z = -1.35 - Math.sin(r.t * 1.1) * 0.08;
    r.j.legL.rotation.x = Math.sin(r.t * 1.5) * 0.1;
    r.j.legR.rotation.x = -Math.sin(r.t * 1.5) * 0.1;
  };
  rig.fixedPose = true;
  rig.height = 2.9;
  rig.portraitY = 2.2;
  rig.portraitDist = 1.9;
  return rig;
}

// ---------------------------------------------------------------------------
// CONDE DENTÚCIO — vampiro banguela
// ---------------------------------------------------------------------------
export function createVampire() {
  const rig = new Rig('Conde Dentúcio');
  const C = { skin: '#c8d0e0', suit: '#16141c', vest: '#7a1a2a', cape: '#121018', capeIn: '#8a1a2a', hair: '#0e0c12' };
  rig.joint('hips', null, [0, 0.95, 0]);
  for (const [n, x] of [['legL', 0.1], ['legR', -0.1]]) {
    rig.joint(n, 'hips', [x, 0, 0]);
    const b = new Builder();
    limb(b, 0.9, 0.06, 0.05, C.suit);
    boot(b, -0.92, '#0a0a0e');
    rig.attach(n, b.build());
  }
  rig.joint('torso', 'hips', [0, 0, 0]);
  {
    const b = new Builder();
    b.add(S.cyl(0.2, 0.17, 0.72, 12), C.suit, { p: [0, 0.34, 0], s: [1, 1, 0.8] });
    b.add(S.box(0.2, 0.55, 0.02), C.vest, { p: [0, 0.38, 0.14] });
    b.add(S.box(0.08, 0.3, 0.021), '#eeeae0', { p: [0, 0.52, 0.145] });
    b.add(S.sphere(0.04, 6, 5), '#b8343a', { p: [0, 0.6, 0.16] });
    rig.attach('torso', b.build(), rig.material);
    // capa: cone aberto atrás + gola alta (dupla-face para o forro vermelho aparecer)
    const cape = new Builder();
    cape.add(new THREE.ConeGeometry(0.62, 1.7, 16, 1, true, Math.PI * 0.62, Math.PI * 0.76), C.cape, { p: [0, -0.15, -0.05] });
    cape.add(new THREE.ConeGeometry(0.6, 1.68, 16, 1, true, Math.PI * 0.62, Math.PI * 0.76), C.capeIn, { p: [0, -0.15, -0.04] });
    for (const s of [-1, 1]) {
      cape.add(S.box(0.36, 0.5, 0.02), C.cape, { p: [s * 0.2, 0.9, -0.1], r: [-0.35, s * 0.5, s * 0.25] });
      cape.add(S.box(0.34, 0.48, 0.02), C.capeIn, { p: [s * 0.2, 0.9, -0.085], r: [-0.35, s * 0.5, s * 0.25] });
    }
    const capeMat = toonMat({ vertexColors: true, side: THREE.DoubleSide });
    rig.extraMats = [capeMat];
    rig.attach('torso', cape.build(), capeMat);
  }
  for (const [n, x] of [['armL', 0.21], ['armR', -0.21]]) {
    rig.joint(n, 'torso', [x, 0.64, 0]);
    const b = new Builder();
    limb(b, 0.68, 0.055, 0.042, C.suit);
    hand(b, -0.73, C.skin, 1.1);
    for (let f = 0; f < 3; f++) b.add(S.cone(0.012, 0.12, 3), C.skin, { p: [-0.02 + f * 0.02, -0.82, 0.03], r: [Math.PI, 0, 0] });
    rig.attach(n, b.build());
  }
  rig.joint('head', 'torso', [0, 0.76, 0]);
  {
    const b = new Builder();
    b.add(S.sphere(0.23, 16, 12), C.skin, { p: [0, 0.22, 0], s: [0.9, 1.18, 0.95] });
    b.add(S.sphere(0.24, 14, 10), C.hair, { p: [0, 0.32, -0.04], s: [0.93, 0.95, 1.0] });
    b.add(S.cone(0.08, 0.18, 4), C.hair, { p: [0, 0.42, 0.18], r: [Math.PI + 0.5, 0, 0] });
    for (const s of [-1, 1]) {
      b.add(S.cone(0.05, 0.16, 4), C.skin, { p: [s * 0.21, 0.26, -0.02], r: [0, 0, s * -1.2] });
      b.add(S.box(0.12, 0.025, 0.03), C.hair, { p: [s * 0.08, 0.34, 0.2], r: [0, 0, s * 0.35] });
    }
    b.add(S.cone(0.04, 0.12, 4), '#b8c0d0', { p: [0, 0.2, 0.25], r: [Math.PI / 2 + 0.3, 0, 0] });
    b.add(S.sphere(0.035, 8, 6), '#3a1a2a', { p: [0, 0.09, 0.2], s: [1.2, 0.8, 0.5] });
    rig.attach('head', b.build());
    const fangs = new Builder();
    for (const s of [-1, 1]) fangs.add(S.cone(0.018, 0.07, 4), '#ffffff', { p: [s * 0.03, 0.06, 0.21], r: [Math.PI, 0, 0] });
    rig.fangs = rig.attach('head', fangs.build());
    rig.fangs.visible = false;
  }
  rig.joint('eyes', 'head', [0, 0.27, 0.19]);
  rig.attach('eyes', eyeGeo({ sep: 0.08, r: 0.045, pupil: 0.018, pupilCol: '#8a0a1a' }));
  rig.poseBias = { armL: -0.55, armR: -0.55, armLz: -0.2, armRz: 0.2 };
  rig.height = 2.3;
  rig.portraitY = 1.95;
  return rig;
}

// ---------------------------------------------------------------------------
// MADAME VESGA — bruxa do pântano
// ---------------------------------------------------------------------------
export function createWitch() {
  const rig = new Rig('Madame Vesga');
  const C = { skin: '#8fae6a', dress: '#221c2a', patch: '#5a2a6a', hair: '#6a3d8a', hat: '#1e1826', band: '#8a6a2a' };
  rig.joint('hips', null, [0, 0.72, 0]);
  for (const [n, x] of [['legL', 0.09], ['legR', -0.09]]) {
    rig.joint(n, 'hips', [x, -0.25, 0]);
    const b = new Builder();
    stripedLimb(b, 0.42, 0.045, 0.04, 6, '#6a3d8a', '#16121c', 7);
    boot(b, -0.44, '#16121c');
    rig.attach(n, b.build());
  }
  rig.joint('torso', 'hips', [0, 0, 0]);
  {
    const b = new Builder();
    b.add(S.cyl(0.16, 0.42, 0.6, 14), C.dress, { p: [0, -0.2, 0] });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      b.add(S.cone(0.08, 0.16, 3), C.dress, { p: [Math.cos(a) * 0.4, -0.52, Math.sin(a) * 0.4], r: [Math.PI, 0, 0] });
    }
    b.add(S.cyl(0.15, 0.17, 0.5, 12), C.dress, { p: [0, 0.3, 0], s: [1, 1, 0.85] });
    b.add(S.box(0.14, 0.14, 0.02), C.patch, { p: [0.1, -0.15, 0.33], r: [0.4, 0, 0.3] });
    b.add(S.box(0.1, 0.1, 0.02), '#3a5a3a', { p: [-0.05, 0.3, 0.14], r: [0, 0, -0.3] });
    b.add(S.box(0.44, 0.05, 0.3), '#4a2a1a', { p: [0, 0.08, 0] });
    rig.attach('torso', b.build());
  }
  for (const [n, x] of [['armL', 0.17], ['armR', -0.17]]) {
    rig.joint(n, 'torso', [x, 0.5, 0]);
    const b = new Builder();
    b.add(S.cyl(0.045, 0.1, 0.46, 8), C.dress, { p: [0, -0.23, 0] });
    hand(b, -0.52, C.skin);
    for (let f = 0; f < 3; f++) b.add(S.cone(0.012, 0.09, 3), '#2a1a2a', { p: [-0.02 + f * 0.02, -0.6, 0.03], r: [Math.PI, 0, 0] });
    if (n === 'armR') {
      b.add(S.cyl(0.018, 0.018, 0.9, 5), '#6a4a32', { p: [0, -0.8, 0.12], r: [0.3, 0, 0] });
      b.add(S.sphere(0.07, 8, 6), '#4a4a4a', { p: [0, -1.22, 0.25], s: [1, 0.5, 1] });
    }
    rig.attach(n, b.build());
  }
  rig.joint('head', 'torso', [0, 0.56, 0.02]);
  {
    const b = new Builder();
    b.add(S.sphere(0.23, 14, 12), C.skin, { p: [0, 0.2, 0], s: [0.95, 1.1, 1] });
    // narigão torto com verruga
    b.add(S.tube([V3(0, 0.22, 0.2), V3(0.02, 0.17, 0.34), V3(0.07, 0.08, 0.44), V3(0.05, 0.02, 0.46)], (t) => 0.05 * (1 - t * 0.75) + 0.01, 7), '#7a9a5a');
    b.add(S.sphere(0.022, 6, 5), '#5a4a2a', { p: [0.05, 0.14, 0.36] });
    b.add(S.torus(0.06, 0.012, 4, 10, Math.PI), '#2a1a2a', { p: [0, 0.05, 0.2], r: [0.3, 0, Math.PI] });
    b.add(S.box(0.02, 0.03, 0.01), '#ffffff', { p: [0.03, 0.035, 0.215] });
    // cabelo desgrenhado
    const rng = new RNG(66);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 1.6 + Math.PI * 0.7;
      const sx = Math.cos(a) * 0.2, sz = Math.sin(a) * 0.2 - 0.02;
      b.add(S.tube([V3(sx, 0.32, sz), V3(sx * 1.3, 0.1, sz * 1.3), V3(sx * 1.4 + rng.range(-0.05, 0.05), -0.15 - rng.range(0, 0.15), sz * 1.3)], (t) => 0.03 * (1 - t * 0.6), 4), C.hair);
    }
    // chapéu pontudo torto
    b.add(S.cylB(0.44, 0.44, 0.03, 18), C.hat, { p: [0, 0.36, -0.02], r: [-0.08, 0, 0.06] });
    b.add(S.cylB(0.23, 0.23, 0.06, 14), C.band, { p: [0, 0.38, -0.02], r: [-0.08, 0, 0.06] });
    b.add(S.tube([V3(0, 0.38, -0.02), V3(0, 0.62, -0.06), V3(-0.02, 0.88, -0.1), V3(0.14, 1.02, -0.12), V3(0.3, 0.98, -0.1)], (t) => 0.23 * Math.pow(1 - t, 1.3) + 0.012, 12, { capStart: true }), C.hat);
    rig.attach('head', b.build());
  }
  rig.joint('eyes', 'head', [0, 0.26, 0.19]);
  rig.attach('eyes', eyeGeo({ sep: 0.085, r: 0.055, pupil: 0.026, cross: 0.9, white: '#fff8d8' }));
  rig.poseBias = { torsoX: 0.12 };
  rig.height = 2.0;
  rig.portraitY = 1.42;
  return rig;
}

// ---------------------------------------------------------------------------
// FANTASMAS
// ---------------------------------------------------------------------------
function sheetGhost(b, H = 1.5, R = 0.5, col = '#d8ecff', hemSeed = 0) {
  const pts = [[0, H]];
  for (let i = 1; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 0.5;
    pts.push([Math.sin(a) * R, H - R + Math.cos(a) * R]);
  }
  pts.push([R * 1.08, H * 0.45], [R * 1.25, 0.12]);
  const g = S.lathe(pts, 18);
  // barra ondulada
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y < 0.2) {
      const a = Math.atan2(p.getZ(i), p.getX(i));
      p.setY(i, y + Math.sin(a * 7 + hemSeed) * 0.08);
    }
  }
  g.computeVertexNormals();
  b.add(g, col, {});
}

export function createGhost(name = 'Suspiro', { lady = false } = {}) {
  const rig = new Rig(name);
  rig.material = ghostMat();
  const col = lady ? '#e6eeff' : '#d0e8ff';
  rig.joint('torso', null, [0, 0.35, 0]);
  {
    const b = new Builder();
    if (lady) {
      // vestido longo de noiva + véu (homenagem à Noiva Cadáver)
      b.add(S.lathe([[0, 1.9], [0.14, 1.88], [0.2, 1.72], [0.16, 1.5], [0.2, 1.2], [0.36, 0.7], [0.62, 0.05], [0.7, 0]], 18), col);
      b.add(S.sphere(0.2, 14, 12), '#eef2ff', { p: [0, 1.88, 0], s: [0.9, 1.1, 0.95] });
      b.add(S.tube([V3(0, 2.02, -0.02), V3(0, 1.9, -0.25), V3(0, 1.3, -0.45), V3(0, 0.4, -0.55)], (t) => 0.2 + t * 0.35, 10), '#f4f8ff');
      for (let i = 0; i < 5; i++) b.add(S.sphere(0.05, 6, 5), '#5a3a6a', { p: [Math.cos(i) * 0.06, 1.1, 0.26 + Math.sin(i) * 0.04] });
      b.add(S.cyl(0.01, 0.01, 0.3, 3), '#3a5a3a', { p: [0, 0.95, 0.26] });
      for (let i = 0; i < 9; i++) b.add(S.tube([V3(Math.cos(i * 0.7 + 2) * 0.18, 2.0, Math.sin(i * 0.7 + 2) * 0.12 - 0.05), V3(Math.cos(i * 0.7 + 2) * 0.25, 1.6, -0.1), V3(Math.cos(i * 0.7 + 2) * 0.22, 1.2, -0.2)], 0.025, 4), '#c8d4f0');
      for (const s of [-1, 1]) {
        b.add(S.sphere(0.03, 6, 5), '#e8a8c8', { p: [s * 0.1, 1.8, 0.16] });
      }
    } else {
      sheetGhost(b, 1.5, 0.5, col, 1);
      for (const s of [-1, 1]) b.add(S.sphere(0.07, 8, 6), '#f0a8c0', { p: [s * 0.24, 1.08, 0.4], s: [1, 0.6, 0.4] });
      b.add(S.torus(0.06, 0.015, 4, 10, Math.PI), '#1a1a2a', { p: [0, 0.98, 0.47], r: [0.2, 0, 0] });
    }
    rig.attach('torso', b.build(), rig.material);
  }
  for (const [n, x] of [['armL', lady ? 0.18 : 0.46], ['armR', lady ? -0.18 : -0.46]]) {
    rig.joint(n, 'torso', [x, lady ? 1.55 : 0.95, 0]);
    const b = new Builder();
    if (lady) {
      b.add(S.cyl(0.035, 0.03, 0.5, 6), col, { p: [0, -0.25, 0] });
      b.add(S.sphere(0.045, 6, 5), col, { p: [0, -0.52, 0.02] });
    } else b.add(S.sphere(0.13, 8, 6), col, { p: [0, -0.1, 0.05], s: [0.8, 1.3, 0.8] });
    rig.attach(n, b.build(), rig.material);
  }
  rig.joint('head', 'torso', [0, lady ? 1.8 : 1.05, lady ? 0.12 : 0.36]);
  rig.joint('eyes', 'head', [0, lady ? 0.06 : 0.12, lady ? 0.02 : 0.04]);
  {
    const b = new Builder();
    for (const s of [-1, 1]) {
      if (lady) {
        b.add(S.sphere(0.045, 8, 6), '#0e0e1e', { p: [s * 0.075, 0, 0.02], s: [1, 1.3, 0.5] });
        b.add(S.box(0.06, 0.008, 0.01), '#0e0e1e', { p: [s * 0.085, 0.045, 0.03], r: [0, 0, s * 0.4] });
      } else {
        b.add(S.sphere(0.09, 10, 8), '#0e0e1e', { p: [s * 0.14, 0, 0], s: [0.8, 1.2, 0.4] });
        b.add(S.sphere(0.022, 5, 4), '#ffffff', { p: [s * 0.12, 0.04, 0.04] });
      }
    }
    rig.attach('eyes', b.build(), rig.material);
  }
  if (!lady) {
    const b = new Builder();
    b.add(S.box(0.24, 0.16, 0.02), '#f4e8d0', { p: [0, 0, 0] });
    b.add(S.cone(0.12, 0.08, 3), '#e8dcc4', { p: [0, 0.03, 0.012], r: [0, 0, Math.PI], s: [1, 1, 0.1] });
    b.add(S.sphere(0.025, 6, 5), '#b8343a', { p: [0, 0.0, 0.02] });
    const letter = rig.attach('armR', b.build(), toonMat({ vertexColors: true }));
    letter.position.set(0.05, -0.18, 0.18);
    letter.rotation.set(-0.3, 0.3, 0.2);
    rig.letter = letter;
  }
  rig.float = true;
  rig.extra = (dt, s, r) => {
    r.body.position.y = 0.25 + Math.sin(r.t * 1.6) * 0.12;
    r.j.torso.rotation.z = Math.sin(r.t * 1.1) * 0.05;
    if (!lady) r.j.torso.scale.y = 1 + Math.sin(r.t * 0.9) * 0.03;
  };
  for (const m of rig.meshes) m.layers.set(LAYER_FX);
  rig.fixedPose = true;
  rig.height = lady ? 2.4 : 1.95;
  rig.portraitY = lady ? 2.12 : 1.3;
  rig.portraitDist = lady ? 1.4 : 2.1;
  return rig;
}

// ---------------------------------------------------------------------------
// ZÉ ZUMBI — maratonista desde 1952 (corre em volta da praça)
// ---------------------------------------------------------------------------
export function createZombie() {
  const rig = new Rig('Zé Zumbi');
  const C = { skin: '#8fa878', shirt: '#b8b0a0', shorts: '#3a4a6a', sock: '#e6e0d0', shoe: '#e0e0e0', band: '#c8342a' };
  rig.joint('hips', null, [0, 0.8, 0]);
  for (const [n, x] of [['legL', 0.1], ['legR', -0.1]]) {
    rig.joint(n, 'hips', [x, 0, 0]);
    const b = new Builder();
    b.add(S.cyl(0.085, 0.075, 0.2, 8), C.shorts, { p: [0, -0.08, 0] });
    limb(b, 0.6, 0.055, 0.05, C.skin);
    b.add(S.cyl(0.056, 0.052, 0.2, 8), C.sock, { p: [0, -0.62, 0] });
    b.add(S.sphere(0.085, 10, 7), C.shoe, { p: [0, -0.74, 0.05], s: [1.1, 0.65, 1.7] });
    rig.attach(n, b.build());
  }
  rig.joint('torso', 'hips', [0, 0, 0]);
  {
    const b = new Builder();
    b.add(S.cyl(0.18, 0.2, 0.56, 12), (x, y, z) => (Math.abs(Math.sin(x * 40) * Math.cos(y * 30)) > 0.92 ? _c.set('#5a6a4a') : _c.set(C.shirt)), { p: [0, 0.3, 0], s: [1, 1, 0.85] });
    b.add(S.box(0.2, 0.16, 0.02), '#ffffff', { p: [0, 0.34, 0.17] });
    b.add(S.box(0.06, 0.08, 0.021), '#1a1a1a', { p: [-0.04, 0.34, 0.172] });
    b.add(S.box(0.06, 0.08, 0.021), '#1a1a1a', { p: [0.04, 0.34, 0.172] });
    b.add(S.cyl(0.05, 0.06, 0.1, 8), C.skin, { p: [0, 0.6, 0] });
    rig.attach('torso', b.build());
  }
  for (const [n, x] of [['armL', 0.2], ['armR', -0.2]]) {
    rig.joint(n, 'torso', [x, 0.5, 0]);
    const b = new Builder();
    limb(b, 0.55, 0.048, 0.04, C.skin);
    hand(b, -0.6, C.skin);
    if (n === 'armR') b.add(S.box(0.08, 0.05, 0.08), '#e6e0d0', { p: [0, -0.12, 0] });
    rig.attach(n, b.build());
  }
  rig.joint('head', 'torso', [0, 0.64, 0]);
  {
    const b = new Builder();
    b.add(S.sphere(0.24, 14, 12), C.skin, { p: [0, 0.2, 0], s: [1, 1.08, 1] });
    b.add(S.torus(0.225, 0.035, 5, 16), C.band, { p: [0, 0.32, 0], r: [Math.PI / 2 + 0.15, 0, 0] });
    b.add(S.box(0.26, 0.012, 0.012), '#2a2a1a', { p: [0.02, 0.4, 0.2], r: [0.3, 0.2, 0.25] });
    for (let i = 0; i < 5; i++) b.add(S.box(0.012, 0.04, 0.012), '#2a2a1a', { p: [-0.08 + i * 0.045, 0.4 + i * 0.012, 0.205], r: [0.3, 0, 0.25] });
    b.add(S.sphere(0.06, 8, 6), '#c86a7a', { p: [0.02, 0.02, 0.2], s: [0.8, 1.3, 0.5] });
    b.add(S.torus(0.07, 0.014, 4, 10, Math.PI), '#2a1a1a', { p: [0, 0.07, 0.21], r: [0.2, 0, Math.PI] });
    for (let i = 0; i < 6; i++) b.add(S.sphere(0.02, 4, 3), '#3a4a2a', { p: [Math.cos(i) * 0.15, 0.45 + (i % 2) * 0.03, Math.sin(i) * 0.12 - 0.05] });
    rig.attach('head', b.build());
  }
  rig.joint('eyes', 'head', [0, 0.24, 0.19]);
  {
    const b = new Builder();
    b.add(S.sphere(0.075, 10, 8), '#f0f0c8', { p: [0.08, 0.02, 0.03], s: [1, 1, 0.7] });
    b.add(S.sphere(0.045, 8, 6), '#f0f0c8', { p: [-0.085, -0.01, 0.03], s: [1, 1, 0.7] });
    b.add(S.sphere(0.022, 6, 5), '#1a1a1a', { p: [0.1, 0.0, 0.085] });
    b.add(S.sphere(0.016, 6, 5), '#1a1a1a', { p: [-0.07, -0.02, 0.06] });
    rig.attach('eyes', b.build());
  }
  rig.poseBias = { armL: -0.6, torsoX: 0.12 };
  rig.height = 1.95;
  rig.portraitY = 1.62;
  rig.portraitDist = 1.6;
  return rig;
}

/** coruja numa árvore (gira a cabeça 180°) */
export function createOwl() {
  const rig = new Rig('Coruja');
  rig.joint('torso', null, [0, 0.22, 0]);
  {
    const b = new Builder();
    b.add(S.sphere(0.2, 12, 10), (x, y) => _c.set('#6a5a4a').lerp(new THREE.Color('#b8a888'), clamp(-y * 3 + 0.3, 0, 1) * 0.6), { s: [1, 1.2, 0.95] });
    for (const s of [-1, 1]) b.add(S.sphere(0.1, 8, 6), '#4a3e32', { p: [s * 0.17, -0.02, -0.02], s: [0.5, 1.5, 0.9] });
    for (const s of [-1, 1]) b.add(S.cone(0.03, 0.08, 4), '#e0b040', { p: [s * 0.06, -0.24, 0.04] });
    rig.attach('torso', b.build());
  }
  rig.joint('head', 'torso', [0, 0.22, 0]);
  {
    const b = new Builder();
    b.add(S.sphere(0.16, 12, 10), '#6a5a4a', { s: [1.1, 0.95, 1] });
    for (const s of [-1, 1]) {
      b.add(S.cone(0.05, 0.12, 4), '#4a3e32', { p: [s * 0.12, 0.13, 0], r: [0, 0, -s * 0.4] });
      b.add(S.sphere(0.07, 10, 8), '#e8dcc0', { p: [s * 0.065, 0.01, 0.12], s: [1, 1, 0.5] });
    }
    b.add(S.cone(0.025, 0.07, 4), '#d8a040', { p: [0, -0.04, 0.16], r: [Math.PI / 2 + 0.3, 0, 0] });
    rig.attach('head', b.build());
    const g = new Builder();
    for (const s of [-1, 1]) g.add(S.sphere(0.035, 8, 6), '#fff', { p: [s * 0.065, 0.015, 0.155] });
    rig.attach('head', g.build(), GLOW.eyes, { cast: false });
  }
  rig.fixedPose = true;
  rig.spinT = 4;
  rig.extra = (dt, s, r) => {
    r.spinT -= dt;
    let target = Math.sin(r.t * 0.4) * 0.6;
    if (r.spinT < 0) {
      target = Math.PI;
      if (r.spinT < -2.5) r.spinT = 6 + Math.random() * 8;
    }
    r.j.head.rotation.y = damp(r.j.head.rotation.y, target, 4, dt);
    r.j.head.rotation.z = Math.sin(r.t * 0.9) * 0.1;
  };
  rig.height = 0.6;
  return rig;
}
