import * as THREE from 'three';
import { Builder, S } from '../render/builder.js';
import { glowMat, flameMat } from '../render/toon.js';
import { Rig } from './rig.js';
import { stripedLimb, stripedTorso } from './models.js';
import { RNG } from '../util/rng.js';
import { TAU, clamp, damp, lerp } from '../util/math.js';
import { noise3 } from '../util/noise.js';

// Criaturas hostis do vale. Cada rig recebe no animate: speed, atk (0..1 durante o ataque, -1 fora),
// hurt (1 no impacto, decai) e dead (segundos desde a morte, -1 viva). O tombo da morte fica no Mob.

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const _c = new THREE.Color();
const _c2 = new THREE.Color();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _one = new THREE.Vector3(1, 1, 1);
const UP = new THREE.Vector3(0, 1, 0);

const EYES_RED = glowMat('#ff4a3a', '#ff5a3a', 3.2);
const EYES_GREEN = glowMat('#6aff7a', '#7aff8a', 3.6);
const CANDLE = flameMat('#ffe0a0', '#ffb04a', 4.5);

/** sino 0→1→0 entre a e b */
const bell = (u, a, b) => (u <= a || u >= b ? 0 : Math.sin(((u - a) / (b - a)) * Math.PI));
/** rampa 0→1 entre a e b */
const ramp = (u, a, b) => clamp((u - a) / (b - a), 0, 1);
const easeOut = (k) => 1 - (1 - k) * (1 - k);

/** matriz que alinha o eixo +y de uma peça com a direção dir, em pos */
function along(pos, dir) {
  _q.setFromUnitVectors(UP, dir);
  return _m.clone().compose(pos, _q, _one);
}

// ---------------------------------------------------------------------------
// RATO-ZUMBI — costurado, com um olho de botão e as costelas de fora
// ---------------------------------------------------------------------------
export function createZombieRat() {
  const rig = new Rig('Rato-Zumbi');
  const F = '#7a8670', F2 = '#98a488', BELLY = '#b8bc9e', PINK = '#d89aa4', STITCH = '#2a1c22', BONE = '#ece4cc';
  rig.joint('torso', null, [0, 0.27, 0]);
  {
    const b = new Builder();
    // corpo de pera: traseiro gordo, peito fino
    b.add(S.sphere(0.2, 14, 10), (x, y, z) => (y < -0.07 ? _c.set(BELLY) : _c.set(F).lerp(_c2.set(F2), clamp((noise3(x * 9, y * 9, z * 9) + 1) * 0.4, 0, 1))), { p: [0, 0, -0.06], s: [1, 0.88, 1.35] });
    b.add(S.sphere(0.14, 12, 9), F, { p: [0, 0.02, 0.15], s: [1, 0.9, 1.1] });
    // costura em zigue-zague nas costas
    b.add(S.box(0.012, 0.012, 0.44), STITCH, { p: [0, 0.178, -0.04] });
    for (let i = 0; i < 6; i++) b.add(S.box(0.08, 0.012, 0.012), STITCH, { p: [0, 0.176, -0.22 + i * 0.07], r: [0, i % 2 ? 0.6 : -0.6, 0] });
    // buraco com costelas à mostra no flanco esquerdo
    b.add(S.sphere(0.1, 8, 6), '#3a262c', { p: [0.155, 0, -0.07], s: [0.35, 0.75, 1.1] });
    for (let i = 0; i < 3; i++) {
      const z = -0.14 + i * 0.055;
      b.add(S.tube([V3(0.16, 0.07, z), V3(0.19, 0, z), V3(0.16, -0.06, z)], 0.012, 4), BONE);
    }
    rig.attach('torso', b.build());
  }
  rig.joint('head', 'torso', [0, 0.05, 0.25]);
  {
    const b = new Builder();
    b.add(S.sphere(0.12, 12, 10), F, { s: [1, 0.92, 1.1] });
    b.add(S.cone(0.085, 0.2, 10), F2, { p: [0, -0.025, 0.14], r: [Math.PI / 2, 0, 0], s: [1, 0.85, 1] });
    b.add(S.sphere(0.03, 8, 6), '#d86a7a', { p: [0, -0.02, 0.245] });
    for (const s of [-1, 1]) {
      // orelhas (a esquerda mordida)
      const e = s > 0 ? 0.8 : 1;
      b.add(S.sphere(0.075 * e, 10, 6), F, { p: [s * 0.1, 0.1, -0.02], s: [1, 1, 0.3], r: [0, s * 0.4, -s * 0.3] });
      b.add(S.sphere(0.055 * e, 10, 6), PINK, { p: [s * 0.103, 0.1, -0.004], s: [0.85, 0.85, 0.2], r: [0, s * 0.4, -s * 0.3] });
      b.add(S.box(0.03, 0.05, 0.015), '#f4ecc8', { p: [s * 0.017, -0.065, 0.2], r: [0.15, 0, 0] });
      for (let k = 0; k < 2; k++) b.add(S.box(0.16, 0.005, 0.005), '#d8d0c0', { p: [s * 0.09, -0.03 + k * 0.015, 0.2], r: [0, s * 0.35, s * (0.15 - k * 0.3)] });
    }
    // olho bom esbugalhado e olho de botão costurado
    b.add(S.sphere(0.05, 10, 8), '#f4f0dc', { p: [-0.065, 0.045, 0.085] });
    b.add(S.sphere(0.018, 6, 5), '#140e12', { p: [-0.068, 0.05, 0.133] });
    b.add(S.cyl(0.036, 0.036, 0.016, 10), '#6a2a3a', { p: [0.065, 0.045, 0.1], r: [Math.PI / 2, 0.45, 0], order: 'YXZ' });
    for (const a of [0.8, -0.8]) b.add(S.box(0.052, 0.008, 0.008), STITCH, { p: [0.07, 0.045, 0.111], r: [0, 0.45, a], order: 'YXZ' });
    rig.attach('head', b.build());
  }
  for (const [n, z, th] of [['legsF', 0.14, 0.028], ['legsB', -0.12, 0.04]]) {
    rig.joint(n, 'torso', [0, -0.07, z]);
    const b = new Builder();
    for (const s of [-1, 1]) {
      if (n === 'legsB') b.add(S.sphere(0.07, 8, 6), F, { p: [s * 0.1, 0, 0], s: [0.7, 1, 1.1] });
      b.add(S.cyl(th * 0.8, th, 0.2, 6), F, { p: [s * 0.09, -0.1, 0] });
      b.add(S.sphere(0.035, 6, 5), PINK, { p: [s * 0.09, -0.19, 0.03], s: [1, 0.55, 1.5] });
    }
    rig.attach(n, b.build(), undefined, { cast: false });
  }
  rig.joint('tail', 'torso', [0, 0.02, -0.3]);
  {
    const b = new Builder();
    b.add(S.tube([V3(0, 0, 0), V3(0, 0.02, -0.15), V3(0.04, 0.1, -0.32), V3(-0.02, 0.2, -0.42), V3(0.03, 0.22, -0.5)], (t) => 0.028 * (1 - t * 0.75), 5), '#c89aa0');
    b.add(S.cyl(0.03, 0.03, 0.05, 6), '#e8e0c8', { p: [0.025, 0.07, -0.25], r: [0.9, 0, 0] });
    rig.attach('tail', b.build(), undefined, { cast: false });
  }
  rig.fixedPose = true;
  rig.extra = (dt, s, r) => {
    const j = r.j, sp = s.speed || 0, u = s.atk ?? -1, dead = s.dead ?? -1;
    let legF = 0, legB = 0, y = 0, pitch = 0, headX = -0.05, headY = 0, lz = 0;
    if (sp > 0.3) {
      r.phase += dt * (9 + sp * 1.6);
      const a = Math.sin(r.phase);
      legF = a * 0.9;
      legB = -a * 0.9;
      y = Math.abs(Math.cos(r.phase)) * 0.07;
      pitch = a * 0.12;
      headX = -pitch * 0.5;
    } else {
      // fareja o ar e olha em volta
      headX += Math.sin(r.t * 14) * 0.05 * (Math.sin(r.t * 0.9) > 0.3 ? 1 : 0);
      headY = Math.sin(r.t * 0.7) * 0.45;
    }
    if (u >= 0) {
      // encolhe, dá o bote e morde
      const crouch = ramp(u, 0, 0.4) * (1 - ramp(u, 0.42, 0.52));
      const lunge = bell(u, 0.4, 0.9);
      pitch = crouch * 0.3 - lunge * 0.28;
      y = -crouch * 0.06 + lunge * 0.14;
      lz = -crouch * 0.1 + lunge * 0.45;
      headX = -lunge * 0.5 + bell(u, 0.52, 0.66) * 0.7;
      headY = 0;
      legF = -lunge * 1.1;
      legB = lunge * 0.8;
    }
    if (dead >= 0) {
      // patinhas pra cima, tremendo
      const tw = Math.sin(r.t * 38) * 0.35 * Math.max(0, 1 - dead / 1.6);
      legF = -0.6 + tw;
      legB = 0.5 - tw;
      pitch = 0;
      headX = 0.3;
    }
    if (s.hurt > 0) {
      headX -= s.hurt * 0.5;
      pitch -= s.hurt * 0.25;
    }
    const k = u >= 0 ? 32 : 14;
    j.legsF.rotation.x = damp(j.legsF.rotation.x, legF, k, dt);
    j.legsB.rotation.x = damp(j.legsB.rotation.x, legB, k, dt);
    j.torso.rotation.set(damp(j.torso.rotation.x, pitch, k, dt), 0, 0);
    j.head.rotation.set(damp(j.head.rotation.x, headX, k, dt), damp(j.head.rotation.y, headY, 6, dt), 0);
    j.tail.rotation.y = Math.sin(r.t * (sp > 0.3 ? 9 : 2.5)) * 0.35;
    j.tail.rotation.x = sp > 0.3 ? -0.3 : 0;
    r.body.position.y = damp(r.body.position.y, y, k, dt);
    r.body.position.z = damp(r.body.position.z, lz, k, dt);
  };
  rig.height = 0.55;
  rig.portraitY = 0.34;
  rig.portraitDist = 1.05;
  return rig;
}

// ---------------------------------------------------------------------------
// CAVEIRA SALTITANTE — pula na própria mandíbula como dentadura de corda
// ---------------------------------------------------------------------------
export function createHoppingSkull() {
  const rig = new Rig('Caveira Saltitante');
  const BONE = '#ece4cc', BONE2 = '#c8bc9c', DARK = '#1c1418', TEETH = '#fbf6e6';
  rig.joint('skull', null, [0, 0.12, -0.05]);
  {
    const b = new Builder();
    // crânio com rachaduras
    b.add(S.sphere(0.3, 18, 14), (x, y, z) => {
      if (y > 0.35 && Math.abs(noise3(x * 7, y * 7, z * 7)) < 0.03) return _c.set('#5a4a3a');
      return _c.set(BONE).lerp(_c2.set(BONE2), clamp(0.55 - y * 1.1, 0, 1) * 0.7);
    }, { p: [0, 0.32, 0.05], s: [1, 0.92, 1.05] });
    b.add(S.box(0.32, 0.09, 0.24), BONE, { p: [0, 0.06, 0.16] });
    for (const s of [-1, 1]) {
      b.add(S.sphere(0.085, 10, 8), DARK, { p: [s * 0.11, 0.3, 0.3], s: [1, 1.15, 0.6] });
      b.add(S.sphere(0.07, 8, 6), BONE, { p: [s * 0.2, 0.17, 0.22], s: [0.8, 0.6, 0.8] });
    }
    b.add(S.cone(0.045, 0.08, 3), DARK, { p: [0, 0.19, 0.335], r: [0, 0, Math.PI], s: [1, 1, 0.5] });
    for (let i = 0; i < 6; i++) b.add(S.box(0.036, 0.05, 0.03), TEETH, { p: [-0.1 + i * 0.04, 0.0, 0.27] });
    // vela derretida no cocuruto
    b.add(S.cyl(0.045, 0.05, 0.16, 10), '#f4eed8', { p: [0.08, 0.66, 0.02], r: [0, 0, -0.15] });
    b.add(S.sphere(0.075, 10, 6), '#ece6d0', { p: [0.07, 0.585, 0.02], s: [1.3, 0.35, 1.3] });
    for (const [x, z, h] of [[0.125, 0.04, 0.07], [0.045, -0.03, 0.05], [0.11, -0.02, 0.1]]) b.add(S.capsule(0.013, h, 3, 5), '#f4eed8', { p: [x, 0.6 - h / 2, z] });
    b.add(S.cyl(0.005, 0.005, 0.03, 3), '#1a1a1a', { p: [0.093, 0.755, 0.02] });
    rig.attach('skull', b.build());
    const e = new Builder();
    for (const s of [-1, 1]) e.add(S.sphere(0.028, 8, 6), '#fff', { p: [s * 0.11, 0.29, 0.34] });
    rig.attach('skull', e.build(), EYES_GREEN, { cast: false });
    const f = new Builder();
    f.add(S.cone(0.028, 0.09, 8), '#fff', { p: [0.093, 0.81, 0.02] });
    rig.flame = rig.attach('skull', f.build(), CANDLE, { cast: false });
  }
  rig.joint('jaw', 'skull', [0, 0, 0]);
  {
    const b = new Builder();
    b.add(S.box(0.32, 0.08, 0.28), BONE, { p: [0, -0.07, 0.16] });
    for (const s of [-1, 1]) b.add(S.box(0.05, 0.12, 0.1), BONE2, { p: [s * 0.15, -0.02, 0.03] });
    for (let i = 0; i < 6; i++) b.add(S.box(0.034, 0.045, 0.03), TEETH, { p: [-0.1 + i * 0.04, -0.012, 0.27] });
    rig.attach('jaw', b.build());
  }
  rig.fixedPose = true;
  rig.hop = 0;
  rig.extra = (dt, s, r) => {
    const sp = s.speed || 0, u = s.atk ?? -1, dead = s.dead ?? -1;
    let y, open = 0.1 + Math.max(0, Math.sin(r.t * 28)) * 0.14, tilt = 0, fz = 0, sq = 0;
    if (sp > 0.3) {
      r.hop += dt * (5.5 + sp * 0.9);
      const h = Math.abs(Math.sin(r.hop));
      y = h * 0.42;
      sq = h < 0.2 ? (0.2 - h) * 1.4 : 0;
      tilt = Math.cos(r.hop) * 0.12;
    } else {
      r.hop += dt * 2.4;
      const h = Math.max(0, Math.sin(r.hop));
      y = h * h * 0.12;
      sq = h < 0.1 ? (0.1 - h) : 0;
    }
    if (u >= 0) {
      // escancara a boca, pula em cima e fecha com tudo
      const wind = ramp(u, 0, 0.42) * (1 - ramp(u, 0.46, 0.52));
      const jump = bell(u, 0.42, 0.92);
      open = u < 0.55 ? easeOut(ramp(u, 0.05, 0.4)) * 1.0 : 1.0 * (1 - ramp(u, 0.55, 0.61)) + bell(u, 0.7, 0.95) * 0.25;
      y = jump * 0.6;
      fz = jump * 0.5;
      sq = wind * 0.28;
      tilt = -wind * 0.15 + jump * 0.3;
    }
    if (s.hurt > 0) tilt -= s.hurt * 0.4;
    r.body.position.y = y;
    r.body.position.z = damp(r.body.position.z, fz, 30, dt);
    r.body.scale.set(1 + sq, 1 - sq * 1.5, 1 + sq);
    r.j.skull.rotation.x = -open * 0.55 + tilt;
    r.j.skull.rotation.z = Math.sin(r.t * 3) * 0.06;
    r.j.jaw.rotation.x = open * 0.55 - tilt * 0.6;
    r.flame.visible = dead < 0;
    r.flame.scale.set(1 + Math.sin(r.t * 17) * 0.12, 1 + Math.sin(r.t * 13) * 0.25, 1);
  };
  rig.height = 0.9;
  rig.portraitY = 0.45;
  rig.portraitDist = 1.45;
  return rig;
}

// ---------------------------------------------------------------------------
// ARANHA CABELUDA — listrada, oito olhos e monocelha brava
// ---------------------------------------------------------------------------
export function createHairySpider() {
  const rig = new Rig('Aranha Cabeluda');
  const K = '#241830', K2 = '#3a2848', HAIR = '#140c1a', STRIPE = '#c8b8dc', LEG_A = '#1a1220', LEG_B = '#a898bc';
  const rng = new RNG(66);
  rig.joint('torso', null, [0, 0.42, 0]);
  {
    const b = new Builder();
    b.add(S.sphere(0.2, 14, 10), K2, { p: [0, 0, 0.2], s: [1, 0.8, 1.05] });
    // abdômen com listras claras
    const AB = V3(0, 0.1, -0.26);
    b.add(S.sphere(0.36, 18, 14), (x, y, z) => (y > 0.14 && Math.sin((z + 0.26) * 20) > 0.6 ? _c.set(STRIPE) : _c.set(K)), { p: [0, 0.1, -0.26], s: [1.05, 0.9, 1.15] });
    // tufos de pelo espetado
    for (let i = 0; i < 34; i++) {
      const a = rng.range(0, TAU), el = rng.range(-0.1, 1.2);
      const dir = V3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el));
      const p = AB.clone().add(V3(dir.x * 0.37, dir.y * 0.32, dir.z * 0.41)).addScaledVector(dir, 0.03);
      b.add(S.cone(0.022, rng.range(0.08, 0.14), 4), HAIR, { m: along(p, dir) });
    }
    for (let i = 0; i < 10; i++) {
      const a = rng.range(0.4, Math.PI - 0.4), dir = V3(Math.cos(a), Math.sin(a), rng.range(-0.3, 0.3)).normalize();
      b.add(S.cone(0.018, 0.08, 4), HAIR, { m: along(V3(dir.x * 0.18, dir.y * 0.15, 0.2 + dir.z * 0.1), dir) });
    }
    // monocelha brava e presas
    for (const s of [-1, 1]) b.add(S.box(0.12, 0.035, 0.03), '#0e0810', { p: [s * 0.05, 0.12, 0.335], r: [0.3, 0, s * 0.35] });
    for (const s of [-1, 1]) {
      b.add(S.sphere(0.055, 8, 6), K2, { p: [s * 0.055, -0.07, 0.35] });
      b.add(S.cone(0.028, 0.14, 5), '#efe4cc', { p: [s * 0.05, -0.15, 0.37], r: [Math.PI + 0.25, 0, s * 0.25] });
    }
    rig.attach('torso', b.build());
    const e = new Builder();
    for (const [x, y, z, r] of [[0.055, 0.07, 0.37, 0.042], [0.125, 0.04, 0.33, 0.03], [0.03, 0.12, 0.36, 0.022], [0.15, 0.1, 0.28, 0.02]]) {
      for (const s of [-1, 1]) e.add(S.sphere(r, 8, 6), '#fff', { p: [s * x, y, z] });
    }
    rig.attach('torso', e.build(), EYES_RED, { cast: false });
  }
  // patas em dois grupos alternados (marcha em tetrápode): A = E1 D2 E3 D4, B = D1 E2 D3 E4
  const ANG = [0.62, 0.22, -0.22, -0.62];
  for (const grp of ['legsA', 'legsB']) {
    rig.joint(grp, 'torso', [0, 0, 0.1]);
    const b = new Builder();
    for (let i = 0; i < 4; i++) {
      const s = (grp === 'legsA') === (i % 2 === 0) ? 1 : -1;
      const dx = s * Math.cos(ANG[i]), dz = Math.sin(ANG[i]);
      const hip = V3(s * 0.13, 0, 0.1 - i * 0.07);
      const knee = hip.clone().add(V3(dx * 0.34, 0.3, dz * 0.34));
      const foot = hip.clone().add(V3(dx * 0.78, -0.42, dz * 0.78));
      b.add(S.tube([hip, knee, foot], (t) => 0.04 - t * 0.024, 5, { segments: 14 }), (x, y, z) => (Math.floor(Math.hypot(x - hip.x, y - hip.y, z - hip.z) / 0.09) % 2 ? _c.set(LEG_B) : _c.set(LEG_A)));
    }
    rig.attach(grp, b.build());
  }
  rig.fixedPose = true;
  rig.extra = (dt, s, r) => {
    const j = r.j, sp = s.speed || 0, u = s.atk ?? -1, dead = s.dead ?? -1;
    let swing = 0, liftA = 0, liftB = 0, pitch = 0, y = 0, fz = 0;
    if (sp > 0.3) {
      r.phase += dt * (7 + sp * 1.8);
      swing = Math.sin(r.phase) * 0.24;
      liftA = Math.max(0, Math.cos(r.phase)) * 0.05;
      liftB = Math.max(0, -Math.cos(r.phase)) * 0.05;
      y = Math.abs(Math.sin(r.phase)) * 0.03;
    } else {
      swing = Math.sin(r.t * 1.3) * 0.03;
      y = Math.sin(r.t * 2.1) * 0.012;
    }
    if (u >= 0) {
      // empina as patas da frente e crava as presas
      const rear = ramp(u, 0, 0.45) * (1 - ramp(u, 0.5, 0.6));
      const stab = bell(u, 0.48, 0.85);
      pitch = -rear * 0.6 + stab * 0.3;
      y = rear * 0.12 - stab * 0.05;
      fz = -rear * 0.08 + stab * 0.32;
      swing = Math.sin(r.t * 30) * 0.05 * rear;
    }
    if (dead >= 0) {
      const tw = Math.max(0, 1 - dead / 1.8);
      swing = Math.sin(r.t * 26) * 0.2 * tw;
      liftA = liftB = 0;
    }
    if (s.hurt > 0) pitch -= s.hurt * 0.25;
    const k = u >= 0 ? 30 : 12;
    j.legsA.rotation.y = swing;
    j.legsB.rotation.y = -swing;
    j.legsA.position.y = liftA;
    j.legsB.position.y = liftB;
    j.torso.rotation.set(damp(j.torso.rotation.x, pitch, k, dt), 0, 0);
    j.torso.scale.set(1, 1 + Math.sin(r.t * 2.2) * 0.02, 1);
    r.body.position.y = damp(r.body.position.y, y, k, dt);
    r.body.position.z = damp(r.body.position.z, fz, k, dt);
  };
  rig.height = 0.95;
  rig.portraitY = 0.5;
  rig.portraitDist = 1.9;
  return rig;
}

// ---------------------------------------------------------------------------
// MORCEGO DENTUÇO — orelhudo, olhos arregalados e dois dentões (um lascado)
// ---------------------------------------------------------------------------
export function createFangBat() {
  const rig = new Rig('Morcego Dentuço');
  const FUR = '#3a2a40', FUR2 = '#5e4664', MEM = '#2a1c30', MEM2 = '#7a4468', PINK = '#d88a9a';
  rig.joint('torso', null, [0, 0.26, 0]);
  {
    const b = new Builder();
    b.add(S.sphere(0.24, 16, 12), (x, y, z) => (z > 0.08 && y < 0.02 ? _c.set(FUR2) : _c.set(FUR)), { s: [1, 1.05, 0.95] });
    for (const s of [-1, 1]) {
      b.add(S.cone(0.1, 0.3, 6), FUR, { p: [s * 0.13, 0.28, -0.02], r: [0, 0, -s * 0.35], s: [1, 1, 0.45] });
      b.add(S.cone(0.065, 0.22, 6), PINK, { p: [s * 0.132, 0.27, 0.018], r: [0, 0, -s * 0.35], s: [1, 1, 0.3] });
      b.add(S.sphere(0.075, 10, 8), '#fffbe8', { p: [s * 0.09, 0.07, 0.19], s: [1, 1.15, 0.6] });
      b.add(S.box(0.09, 0.02, 0.02), '#1a1020', { p: [s * 0.1, 0.15, 0.165], r: [0.4, 0, s * 0.35] });
      b.add(S.cone(0.025, 0.08, 4), '#2a1c28', { p: [s * 0.07, -0.26, -0.02], r: [Math.PI, 0, 0] });
    }
    // focinho de porquinho, boca e os dentões
    b.add(S.sphere(0.05, 8, 6), PINK, { p: [0, 0, 0.225], s: [1.2, 0.8, 0.6] });
    for (const s of [-1, 1]) b.add(S.sphere(0.012, 5, 4), '#3a1a24', { p: [s * 0.018, 0, 0.255] });
    b.add(S.torus(0.05, 0.01, 4, 10, Math.PI), '#2a1020', { p: [0, -0.04, 0.222], r: [0.25, 0, Math.PI] });
    b.add(S.cone(0.034, 0.15, 6), '#fffaf0', { p: [0.036, -0.12, 0.205], r: [Math.PI + 0.12, 0, 0] });
    b.add(S.cone(0.034, 0.1, 6), '#fffaf0', { p: [-0.036, -0.095, 0.205], r: [Math.PI + 0.12, 0, 0] });
    b.add(S.cone(0.03, 0.1, 4), FUR, { p: [0, 0.25, 0.04], r: [0.4, 0, 0.2] });
    rig.attach('torso', b.build());
    const e = new Builder();
    for (const s of [-1, 1]) e.add(S.sphere(0.03, 8, 6), '#fff', { p: [s * 0.095, 0.065, 0.232] });
    rig.attach('torso', e.build(), EYES_RED, { cast: false });
  }
  // asas de membrana com "dedos" (forma no plano XY, deitada para o plano XZ)
  const shape = [[0, 0.06], [0.18, 0.16], [0.42, 0.22], [0.62, 0.12], [0.72, -0.02], [0.57, -0.05], [0.49, -0.17], [0.37, -0.07], [0.26, -0.19], [0.14, -0.07], [0, -0.1]];
  for (const [n, s] of [['wingL', 1], ['wingR', -1]]) {
    rig.joint(n, 'torso', [s * 0.18, 0.04, -0.02]);
    const b = new Builder();
    const pts = s > 0 ? shape : shape.map(([x, y]) => [-x, y]).reverse();
    b.add(S.extrude(pts, 0.016, 1), (x) => _c.set(MEM).lerp(_c2.set(MEM2), clamp(Math.abs(x) * 0.9, 0, 0.6)), { r: [Math.PI / 2, 0, 0] });
    for (const [x, y] of [[0.42, 0.22], [0.72, -0.02], [0.49, -0.17], [0.26, -0.19]]) {
      b.add(S.tube([V3(0, 0.012, 0.02), V3(s * x * 0.55, 0.02, y * 0.4 + 0.06), V3(s * x, 0.014, y)], 0.012, 4), '#4a3650');
    }
    rig.attach(n, b.build(), undefined, { cast: true });
  }
  rig.fixedPose = true;
  rig.flapPh = Math.random() * TAU;
  rig.extra = (dt, s, r) => {
    const j = r.j, u = s.atk ?? -1, dead = s.dead ?? -1;
    let amp = 0.85, speed = 15, fold = 0, pitch = Math.sin(r.t * 1.3) * 0.08;
    if (u >= 0) {
      // sobe, fecha as asas e mergulha de dentes
      const up = ramp(u, 0, 0.4) * (1 - ramp(u, 0.42, 0.5));
      const dive = bell(u, 0.4, 0.85);
      speed = 15 + up * 10;
      amp = 0.85 + up * 0.25 - dive * 0.7;
      fold = dive;
      pitch = -up * 0.3 + dive * 0.7;
    }
    if (dead >= 0) {
      amp = 0.15 * Math.max(0, 1 - dead);
      fold = 0.35;
      pitch = 0;
    }
    r.flapPh += dt * speed;
    const f = Math.sin(r.flapPh);
    j.wingL.rotation.set(0, fold * 1.1, 0.1 + f * amp);
    j.wingR.rotation.set(0, -fold * 1.1, -0.1 - f * amp);
    j.torso.rotation.x = damp(j.torso.rotation.x, pitch - (s.hurt || 0) * 0.5, 12, dt);
    r.body.position.y = dead >= 0 ? 0 : -f * 0.045;
  };
  rig.height = 0.62;
  rig.portraitY = 0.38;
  rig.portraitDist = 1.25;
  return rig;
}

// ---------------------------------------------------------------------------
// MARUJO AFOGADO — inchado, listrado, cheio de algas e armado com uma âncora
// ---------------------------------------------------------------------------
export function createDrownedSailor() {
  const rig = new Rig('Marujo Afogado');
  const C = { skin: '#86ada2', skin2: '#628c80', navy: '#1e2a4e', white: '#e6e2d4', pants: '#3a3e52', cap: '#eeeae0', band: '#2a3a6a', weed: '#3f6e2e', iron: '#3a3a46', rust: '#8a5a32' };
  rig.joint('hips', null, [0, 0.82, 0]);
  for (const [n, x] of [['legL', 0.13], ['legR', -0.13]]) {
    rig.joint(n, 'hips', [x, 0, 0]);
    const b = new Builder();
    b.add(S.cyl(0.1, 0.09, 0.42, 9), C.pants, { p: [0, -0.2, 0] });
    b.add(S.cyl(0.098, 0.1, 0.06, 9), '#2e3246', { p: [0, -0.42, 0] });
    b.add(S.cyl(0.06, 0.055, 0.34, 8), C.skin, { p: [0, -0.6, 0] });
    b.add(S.sphere(0.09, 10, 7), C.skin, { p: [0, -0.79, 0.06], s: [1.05, 0.55, 1.7] });
    for (let i = 0; i < 3; i++) b.add(S.sphere(0.024, 5, 4), C.skin2, { p: [-0.04 + i * 0.04, -0.79, 0.19] });
    rig.attach(n, b.build());
  }
  rig.joint('torso', 'hips', [0, 0, 0]);
  {
    const b = new Builder();
    stripedTorso(b, 0.66, [0.26, 0.34, 0.32, 0.24], 7, C.navy, C.white, 14, 1, 0.9);
    b.add(S.box(0.42, 0.16, 0.03), C.band, { p: [0, 0.6, -0.2], r: [0.25, 0, 0] });
    b.add(S.cone(0.09, 0.18, 4), '#c8342a', { p: [0, 0.54, 0.22], r: [Math.PI + 0.35, 0, 0], s: [1, 1, 0.3] });
    b.add(S.cyl(0.08, 0.09, 0.12, 8), C.skin, { p: [0, 0.7, 0] });
    // remendo e peixinho no bolso
    b.add(S.box(0.1, 0.1, 0.02), '#8a6a3a', { p: [0.14, 0.28, 0.29], r: [0, 0.35, 0.2] });
    rig.attach('torso', b.build());
  }
  for (const [n, x] of [['armL', 0.31], ['armR', -0.31]]) {
    rig.joint(n, 'torso', [x, 0.58, 0]);
    const b = new Builder();
    b.add(S.sphere(0.09, 8, 6), C.navy);
    stripedLimb(b, 0.2, 0.078, 0.072, 2, C.navy, C.white, 8);
    b.add(S.cyl(0.058, 0.064, 0.36, 8), C.skin, { p: [0, -0.38, 0] });
    b.add(S.sphere(0.085, 9, 7), C.skin, { p: [0, -0.6, 0.02], s: [1, 1.1, 0.8] });
    if (n === 'armL') {
      // tatuagem de coração com "MAMÃE" borrado
      b.add(S.sphere(0.03, 6, 5), '#2a3a6a', { p: [0.01, -0.33, 0.055], s: [1, 1, 0.3] });
      b.add(S.box(0.07, 0.012, 0.01), '#2a3a6a', { p: [0.01, -0.39, 0.06] });
    }
    rig.attach(n, b.build());
  }
  rig.joint('anchor', 'armR', [0, -0.63, 0.05]);
  {
    const b = new Builder();
    b.add(S.torus(0.06, 0.018, 5, 12), C.iron, { p: [0, 0.07, 0], r: [0, Math.PI / 2, 0] });
    b.add(S.cyl(0.03, 0.03, 0.74, 7), (x, y, z) => (noise3(x * 30, y * 12, z * 30) > 0.25 ? _c.set(C.rust) : _c.set(C.iron)), { p: [0, -0.35, 0] });
    b.add(S.box(0.05, 0.05, 0.36), C.iron, { p: [0, -0.08, 0] });
    b.add(S.torus(0.24, 0.036, 5, 14, Math.PI), (x, y, z) => (noise3(x * 20, y * 20, z * 20) > 0.2 ? _c.set(C.rust) : _c.set(C.iron)), { p: [0, -0.48, 0], r: [0, 0, Math.PI] });
    for (const s of [-1, 1]) b.add(S.cone(0.065, 0.13, 4), C.iron, { p: [s * 0.24, -0.43, 0], r: [0, 0, s * 0.3] });
    rig.attach('anchor', b.build());
  }
  rig.joint('head', 'torso', [0, 0.76, 0]);
  {
    const b = new Builder();
    b.add(S.sphere(0.25, 16, 12), (x, y, z) => _c.set(C.skin).lerp(_c2.set(C.skin2), clamp((noise3(x * 8, y * 8, z * 8) + 0.4) * 0.7, 0, 1)), { p: [0, 0.2, 0], s: [1.05, 1, 1] });
    b.add(S.sphere(0.16, 10, 8), C.skin, { p: [0, 0.05, 0.08], s: [1.3, 0.8, 1] });
    b.add(S.sphere(0.05, 8, 6), '#142222', { p: [0.03, 0.06, 0.235], s: [1, 1.2, 0.5] });
    b.add(S.sphere(0.055, 8, 6), '#8a6a9a', { p: [0, 0.16, 0.25] });
    b.add(S.sphere(0.075, 10, 8), '#f0f4e0', { p: [-0.09, 0.26, 0.19] });
    b.add(S.sphere(0.028, 6, 5), '#101818', { p: [-0.095, 0.27, 0.262] });
    b.add(S.sphere(0.045, 8, 6), '#f0f4e0', { p: [0.095, 0.25, 0.21] });
    b.add(S.sphere(0.018, 5, 4), '#101818', { p: [0.1, 0.25, 0.25] });
    // gorro de marinheiro com fita e um peixinho preso
    b.add(S.cyl(0.26, 0.24, 0.14, 14), C.cap, { p: [0, 0.41, -0.01], r: [-0.15, 0, 0.12] });
    b.add(S.cyl(0.247, 0.247, 0.045, 14), C.band, { p: [0, 0.355, 0], r: [-0.15, 0, 0.12] });
    for (const s of [-1, 1]) b.add(S.box(0.05, 0.2, 0.01), C.band, { p: [s * 0.05, 0.25, -0.26], r: [0.3, 0, s * 0.15] });
    b.add(S.cone(0.05, 0.1, 4), '#e8803a', { p: [0.16, 0.52, -0.02], r: [0, 0, -0.9], s: [1, 1, 0.3] });
    b.add(S.sphere(0.04, 6, 5), '#e8803a', { p: [0.11, 0.49, -0.02], s: [1.4, 0.8, 0.5] });
    // algas penduradas
    const rng = new RNG(8);
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 2 + 0.95 + (i / 7) * (TAU - 1.9), x = Math.cos(a) * 0.25, z = Math.sin(a) * 0.25 - 0.02;
      const len = rng.range(0.18, 0.34);
      b.add(S.tube([V3(x, 0.34, z), V3(x * 1.08 + rng.range(-0.03, 0.03), 0.34 - len * 0.5, z * 1.08), V3(x * 1.02, 0.34 - len, z * 1.1)], (t) => 0.02 * (1 - t * 0.5), 4), C.weed);
    }
    rig.attach('head', b.build());
  }
  rig.poseBias = { armL: -0.35, torsoX: 0.1 };
  rig.extra = (dt, s, r) => {
    const j = r.j, u = s.atk ?? -1;
    if (u < 0) {
      j.anchor.rotation.x = damp(j.anchor.rotation.x, 0.25, 8, dt);
      return;
    }
    // ÂNCORADA: ergue a âncora por cima da cabeça e bate no chão
    const up = easeOut(ramp(u, 0, 0.5)), down = ramp(u, 0.52, 0.63), back = ramp(u, 0.78, 1);
    const arm = lerp(lerp(-0.2, -3.0, up), -0.45, down);
    j.armR.rotation.x = lerp(arm, j.armR.rotation.x, back);
    j.armR.rotation.z = -0.15;
    j.armL.rotation.x = lerp(lerp(-0.35, -2.7, up), -0.5, down) * (1 - back) + j.armL.rotation.x * back;
    j.armL.rotation.z = 0.35 * (1 - back);
    j.torso.rotation.x = lerp(lerp(0.1, -0.28, up), 0.42, down) * (1 - back) + 0.1 * back;
    j.anchor.rotation.x = lerp(0.25, 0.6, down);
    r.body.position.y = -down * (1 - back) * 0.12;
  };
  rig.height = 2.0;
  rig.portraitY = 1.72;
  rig.portraitDist = 1.75;
  return rig;
}
