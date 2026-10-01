// Biblioteca de móveis procedurais do interior. Cada função monta a peça num IKit em coordenadas locais
// (y = 0 no piso, frente virada para +z) e devolve pontos úteis (chamas, âncoras) no mesmo espaço.
import * as THREE from 'three';
import { S, curlPoints } from '../../render/builder.js';
import { PAL } from '../props/palette.js';
import { TAU, lerp, clamp } from '../../util/math.js';
import { labelUV, portraitUV, rugUV, TEX_TILE } from './textures.js';
import { uvPlane } from './kit.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const _c = new THREE.Color();
const sh = (hex, k) => _c.set(hex).multiplyScalar(k).clone();
const WAX = '#efe4c8', BRASS = '#c8a24a', IRON = '#24202c', GOLD = '#d8b04a';

// ---------------------------------------------------------------------------
// luzes
// ---------------------------------------------------------------------------
/** vela com pingos; devolve a posição da chama */
export function candle(k, M, { h = 0.22, r = 0.03, x = 0, y = 0, z = 0, wax = WAX } = {}) {
  k.b.add(S.cylB(r, r * 1.08, h, 7), wax, { p: [x, y, z] });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + h * 9;
    k.b.add(S.capsule(r * 0.28, h * 0.25, 2, 4), wax, { p: [x + Math.cos(a) * r, y + h * (0.7 - i * 0.12), z + Math.sin(a) * r] });
  }
  k.b.add(S.cyl(0.003, 0.003, 0.03, 3), '#1a1410', { p: [x, y + h + 0.015, z] });
  k.glow(M.candle).add(S.sphere(r * 0.75, 7, 5), '#fff', { p: [x, y + h + 0.05, z], s: [1, 1.9, 1] });
  return V3(x, y + h + 0.06, z);
}
export function candelabra(k, M, { arms = 3, h = 0.55, span = 0.32, metal = BRASS } = {}) {
  const f = [];
  k.b.add(S.cylB(0.1, 0.13, 0.04, 10), metal);
  k.b.add(S.cylB(0.022, 0.03, h, 7), metal, { p: [0, 0.04, 0] });
  k.b.add(S.sphere(0.045, 8, 6), metal, { p: [0, h * 0.45, 0] });
  const n = arms;
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = lerp(-span, span, t);
    if (Math.abs(x) > 0.01) {
      const pts = [V3(0, h * 0.8, 0), V3(x * 0.5, h * 0.72, 0), V3(x, h * 0.9, 0), V3(x, h + 0.02, 0)];
      k.b.add(S.tube(pts, 0.012, 5, { segments: 10 }), metal);
    }
    const yb = Math.abs(x) > 0.01 ? h + 0.02 : h + 0.1;
    k.b.add(S.cyl(0.035, 0.02, 0.04, 8), metal, { p: [x, yb, 0] });
    f.push(candle(k, M, { x, y: yb + 0.02, z: 0, h: 0.16, r: 0.02 }));
  }
  return f;
}
/** lustre de ferro com velas em anéis; y = 0 no gancho do teto, pendurado para baixo */
export function chandelier(k, M, { R = 1.1, drop = 1.6, tiers = 2, n = 10, metal = IRON } = {}) {
  const f = [];
  k.b.add(S.cyl(0.14, 0.14, 0.06, 10), metal, { p: [0, -0.03, 0] });
  for (let i = 0; i < 8; i++) k.b.add(S.torus(0.05, 0.012, 4, 8), metal, { p: [0, -0.1 - i * 0.1, 0], r: [0, (i * Math.PI) / 2, 0] });
  const y0 = -drop;
  k.b.add(S.sphere(0.12, 10, 8), metal, { p: [0, y0 + 0.1, 0] });
  k.b.add(S.cone(0.1, 0.4, 8), metal, { p: [0, y0 - 0.2, 0], r: [Math.PI, 0, 0] });
  for (let tr = 0; tr < tiers; tr++) {
    const rr = R * (1 - tr * 0.42), yy = y0 + tr * 0.45, nn = Math.round(n * (1 - tr * 0.4));
    k.b.add(S.torus(rr, 0.03, 5, 28), metal, { p: [0, yy, 0], r: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < nn; i++) {
      const a = (i / nn) * TAU;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      // braço em S até o centro
      k.b.add(S.tube([V3(0, yy + 0.25, 0), V3(x * 0.5, yy + 0.05, z * 0.5), V3(x, yy - 0.02, z)], 0.012, 4, { segments: 8 }), metal);
      k.b.add(S.cyl(0.05, 0.03, 0.04, 8), metal, { p: [x, yy + 0.02, z] });
      f.push(candle(k, M, { x, y: yy + 0.04, z, h: 0.18, r: 0.024 }));
      // pingentes de cristal (gotinhas escuras) e morceguinho de ferro
      k.b.add(S.sphere(0.022, 5, 4), '#b8a0d0', { p: [x, yy - 0.1, z], s: [1, 1.8, 1] });
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.3;
      k.b.add(S.tube([V3(0, 0, 0), V3(Math.cos(a) * rr * 0.4, y0 * 0.6, Math.sin(a) * rr * 0.4), V3(Math.cos(a) * rr, yy, Math.sin(a) * rr)], 0.008, 3, { segments: 8 }), metal);
    }
  }
  return f;
}
/** arandela de parede (frente para +z, encostada em z = 0) */
export function sconce(k, M, { metal = BRASS } = {}) {
  k.b.add(S.box(0.12, 0.22, 0.04), metal, { p: [0, 0, 0.02] });
  k.b.add(S.tube([V3(0, -0.05, 0.03), V3(0, -0.02, 0.16), V3(0, 0.08, 0.22)], 0.014, 5, { segments: 8 }), metal);
  k.b.add(S.cyl(0.05, 0.03, 0.03, 8), metal, { p: [0, 0.09, 0.22] });
  return [candle(k, M, { x: 0, y: 0.1, z: 0.22, h: 0.15, r: 0.022 })];
}

// ---------------------------------------------------------------------------
// mesas, cadeiras, sofás
// ---------------------------------------------------------------------------
export function table(k, { w = 1.4, d = 0.8, h = 0.78, wood = PAL.woodDark, cloth = null, legs = 'turned' } = {}) {
  k.b.add(S.box(w, 0.06, d), sh(wood, 1.15), { p: [0, h - 0.03, 0] });
  k.b.add(S.box(w - 0.1, 0.1, d - 0.1), wood, { p: [0, h - 0.11, 0] });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = sx * (w / 2 - 0.08), z = sz * (d / 2 - 0.08);
    if (legs === 'turned') {
      k.b.add(S.lathe([[0.001, 0], [0.045, 0], [0.03, 0.08], [0.05, 0.25], [0.025, 0.45], [0.04, 0.6], [0.035, h - 0.14], [0.001, h - 0.14]], 8), wood, { p: [x, 0, z] });
      k.b.add(S.sphere(0.035, 6, 5), sh(wood, 0.8), { p: [x, 0.02, z], s: [1.4, 0.8, 1.4] });
    } else k.b.add(S.boxB(0.07, h - 0.14, 0.07), wood, { p: [x, 0, z] });
  }
  if (cloth) {
    // toalha com caimento e franja
    const g = new THREE.PlaneGeometry(w + 0.5, d + 0.5, 16, 10).rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i);
      const ox = Math.max(0, Math.abs(x) - w / 2), oz = Math.max(0, Math.abs(z) - d / 2);
      const o = Math.max(ox, oz);
      p.setXYZ(i, Math.sign(x) * Math.min(Math.abs(x), w / 2 + 0.03), -o * 1.2 + Math.sin(x * 14 + z * 9) * 0.015 * (o > 0 ? 1 : 0), Math.sign(z) * Math.min(Math.abs(z), d / 2 + 0.03));
    }
    g.computeVertexNormals();
    const c0 = new THREE.Color(cloth);
    k.d.add(g, (x, y) => _c.copy(c0).multiplyScalar(1 + y * 0.5), { p: [0, h + 0.005, 0] });
    k.b.add(S.box(w * 0.35, 0.004, d + 0.52), sh(cloth, 1.35), { p: [0, h + 0.008, 0] });
  }
  return { top: h };
}
export function chair(k, { wood = PAL.woodDark, seat = '#6a1a2a', high = true, rot = 0 } = {}) {
  const sH = 0.46;
  k.b.add(S.box(0.46, 0.06, 0.46), wood, { p: [0, sH, 0] });
  k.b.add(S.box(0.4, 0.06, 0.4), seat, { p: [0, sH + 0.05, 0.01] });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.b.add(S.boxB(0.05, sH, 0.05), wood, { p: [sx * 0.2, 0, sz * 0.2] });
  const bh = high ? 1.05 : 0.6;
  for (const sx of [-1, 1]) {
    k.b.add(S.boxB(0.06, bh, 0.06), wood, { p: [sx * 0.2, sH, -0.2] });
    k.b.add(S.cone(0.04, 0.14, 4), wood, { p: [sx * 0.2, sH + bh + 0.07, -0.2] });
  }
  // encosto gótico em arco pontudo
  const shape = new THREE.Shape();
  shape.moveTo(-0.17, 0);
  shape.lineTo(-0.17, bh * 0.62);
  shape.quadraticCurveTo(-0.14, bh * 0.92, 0, bh);
  shape.quadraticCurveTo(0.14, bh * 0.92, 0.17, bh * 0.62);
  shape.lineTo(0.17, 0);
  shape.lineTo(-0.17, 0);
  const hole = new THREE.Path();
  hole.moveTo(-0.08, bh * 0.2);
  hole.lineTo(-0.08, bh * 0.6);
  hole.quadraticCurveTo(0, bh * 0.82, 0.08, bh * 0.6);
  hole.lineTo(0.08, bh * 0.2);
  hole.lineTo(-0.08, bh * 0.2);
  shape.holes.push(hole);
  k.b.add(S.extrude(shape, 0.035, 6), wood, { p: [0, sH + 0.03, -0.2], flat: true });
  k.b.add(S.box(0.16, bh * 0.4, 0.02), seat, { p: [0, sH + 0.03 + bh * 0.4, -0.2] });
  void rot;
}
/** poltrona de orelhas capitonê */
export function armchair(k, { col = '#5a1a3a', wood = PAL.woodDark } = {}) {
  const c2 = sh(col, 0.75);
  k.b.add(S.box(0.86, 0.34, 0.8), col, { p: [0, 0.35, 0] });
  k.b.add(S.box(0.66, 0.14, 0.66), sh(col, 1.15), { p: [0, 0.56, 0.05] });
  k.b.add(S.box(0.86, 0.95, 0.2), col, { p: [0, 0.95, -0.32], r: [-0.12, 0, 0] });
  for (const s of [-1, 1]) {
    k.b.add(S.box(0.16, 0.36, 0.72), c2, { p: [s * 0.4, 0.62, 0.02] });
    k.b.add(S.cyl(0.1, 0.1, 0.72, 8), col, { p: [s * 0.4, 0.8, 0.02], r: [Math.PI / 2, 0, 0] });
    k.b.add(S.box(0.1, 0.55, 0.3), col, { p: [s * 0.42, 1.25, -0.28], r: [-0.12, s * 0.35, 0] });
  }
  // botões do capitonê
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) k.b.add(S.sphere(0.018, 5, 4), c2, { p: [-0.25 + i * 0.25, 0.7 + j * 0.25, -0.2 + j * 0.03] });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.b.add(S.cone(0.04, 0.2, 6), wood, { p: [sx * 0.36, 0.1, sz * 0.32], r: [Math.PI, 0, 0] });
}
export function sofa(k, { col = '#2a4a4a', len = 2.0 } = {}) {
  k.b.add(S.box(len, 0.36, 0.84), col, { p: [0, 0.36, 0] });
  for (let i = 0; i < 3; i++) k.b.add(S.box(len / 3 - 0.04, 0.14, 0.66), sh(col, 1.12), { p: [-len / 3 + (i * len) / 3, 0.6, 0.06] });
  k.b.add(S.box(len, 0.62, 0.2), col, { p: [0, 0.86, -0.34] });
  // encosto em "camelo"
  k.b.add(S.cyl(0.12, 0.12, len, 10), col, { p: [0, 1.16, -0.34], r: [0, 0, Math.PI / 2], s: [1, 1, 0.8] });
  for (const s of [-1, 1]) {
    k.b.add(S.box(0.18, 0.5, 0.84), sh(col, 0.85), { p: [s * (len / 2 - 0.05), 0.6, 0] });
    k.b.add(S.cyl(0.14, 0.14, 0.84, 10), col, { p: [s * (len / 2 - 0.05), 0.86, 0], r: [Math.PI / 2, 0, 0] });
  }
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.b.add(S.sphere(0.06, 6, 5), GOLD, { p: [sx * (len / 2 - 0.1), 0.08, sz * 0.34] });
  // almofadas com morcego
  k.b.add(S.box(0.4, 0.34, 0.14), '#8a2a3a', { p: [-len / 2 + 0.4, 0.82, -0.18], r: [-0.2, 0.2, 0.1] });
  k.b.add(S.box(0.36, 0.3, 0.14), '#c8a84a', { p: [len / 2 - 0.4, 0.8, -0.18], r: [-0.2, -0.3, -0.1] });
}

// ---------------------------------------------------------------------------
// estantes e livros
// ---------------------------------------------------------------------------
const BOOK = ['#6a1a2a', '#1e3a4a', '#3a2a1a', '#5a4a1a', '#2a4a2a', '#4a2a4a', '#7a5a2a', '#1a1a2a', '#8a3a1a', '#2a2a3a', '#6a6a4a'];
/** fileira de livros de x0 a x1 na altura y (lombadas para +z) */
export function books(k, rng, x0, x1, y, z, maxH = 0.32, depth = 0.22) {
  let x = x0;
  while (x < x1 - 0.03) {
    if (rng.chance(0.06)) {
      x += rng.range(0.06, 0.2);
      continue;
    }
    const w = rng.range(0.03, 0.075), h = rng.range(maxH * 0.62, maxH), d = rng.range(depth * 0.7, depth);
    if (x + w > x1) break;
    const col = rng.pick(BOOK);
    const lean = rng.chance(0.08) ? rng.range(0.15, 0.35) : 0;
    k.b.add(S.box(w, h, d), sh(col, rng.range(0.8, 1.15)), { p: [x + w / 2 + lean * h * 0.4, y + h / 2, z + (depth - d) / 2], r: [0, 0, -lean] });
    if (rng.chance(0.5)) k.b.add(S.box(w + 0.003, 0.012, d * 0.3), GOLD, { p: [x + w / 2, y + h * 0.8, z + depth / 2 - d * 0.1] });
    x += w + 0.004;
  }
}
export function bookshelf(k, rng, { w = 1.6, h = 2.6, d = 0.36, wood = '#3e2418', shelves = 6, gap = false } = {}) {
  k.b.add(S.box(w, h, 0.03), sh(wood, 0.7), { p: [0, h / 2, -d / 2 + 0.015] });
  for (const s of [-1, 1]) k.b.add(S.box(0.05, h, d), wood, { p: [s * (w / 2 - 0.025), h / 2, 0] });
  k.b.add(S.box(w + 0.12, 0.1, d + 0.06), sh(wood, 1.2), { p: [0, h + 0.05, 0.02] });
  k.b.add(S.box(w + 0.18, 0.05, d + 0.1), sh(wood, 1.35), { p: [0, h + 0.12, 0.03] });
  k.b.add(S.box(w, 0.1, d), sh(wood, 0.9), { p: [0, 0.05, 0] });
  const sp = (h - 0.12) / shelves;
  for (let i = 1; i <= shelves; i++) {
    const y = 0.1 + i * sp - 0.02;
    k.b.add(S.box(w - 0.08, 0.025, d - 0.02), sh(wood, 1.1), { p: [0, y, 0] });
  }
  for (let i = 0; i < shelves; i++) {
    const y = 0.1 + i * sp;
    if (gap && i === 2) continue;
    books(k, rng, -w / 2 + 0.06, w / 2 - 0.06, y + 0.005, -d / 2 + 0.03, Math.min(0.36, sp - 0.06), d - 0.06);
    if (rng.chance(0.18)) k.b.add(S.sphere(0.07, 8, 6), PAL.bone, { p: [rng.range(-w / 3, w / 3), y + 0.07, 0.02] });
  }
}
export function bookStack(k, rng, n = 5) {
  let y = 0;
  for (let i = 0; i < n; i++) {
    const h = rng.range(0.04, 0.08);
    k.b.add(S.box(rng.range(0.22, 0.34), h, rng.range(0.16, 0.24)), rng.pick(BOOK), { p: [rng.range(-0.02, 0.02), y + h / 2, 0], r: [0, rng.range(-0.4, 0.4), 0] });
    y += h;
  }
  return y;
}

// ---------------------------------------------------------------------------
// paredes: quadros, espelhos, tapetes, teias
// ---------------------------------------------------------------------------
/** quadro com moldura dourada; frente +z encostada em z = 0; centro em y */
export function portrait(k, M, idx, { w = 0.9, h = 1.3, y = 1.8, frame = '#b8902a' } = {}) {
  const fw = 0.12;
  const f2 = sh(frame, 0.7);
  for (const [x, yy, ww, hh] of [[0, y + h / 2 + fw / 2, w + fw * 2, fw], [0, y - h / 2 - fw / 2, w + fw * 2, fw], [-w / 2 - fw / 2, y, fw, h], [w / 2 + fw / 2, y, fw, h]]) {
    k.b.add(S.box(ww, hh, 0.07), frame, { p: [x, yy, 0.035] });
    k.b.add(S.box(ww * 0.96, hh * 0.4, 0.02), f2, { p: [x, yy, 0.075] });
  }
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.b.add(S.sphere(0.05, 6, 5), frame, { p: [sx * (w / 2 + fw / 2), y + sy * (h / 2 + fw / 2), 0.08] });
  k.b.add(S.sphere(0.07, 7, 5), frame, { p: [0, y + h / 2 + fw + 0.04, 0.05], s: [1.6, 1, 0.6] });
  k.tex(M.portraits).add(new THREE.PlaneGeometry(w, h), '#ffffff', { p: [0, y, 0.03], uv: portraitUV(idx) });
}
export function mirror(k, M, { w = 0.8, h = 1.2, y = 1.6, frame = GOLD, oval = true } = {}) {
  if (oval) {
    k.b.add(S.torus(0.5, 0.06, 6, 28), frame, { p: [0, y, 0.04], s: [w, h, 1] });
  } else {
    k.b.add(S.box(w + 0.14, h + 0.14, 0.05), frame, { p: [0, y, 0.025] });
  }
  // o espelho só reflete o quarto (nada de vampiro, nem você)
  const g = oval ? new THREE.CircleGeometry(0.47, 28) : new THREE.PlaneGeometry(w, h);
  // (na moldura retangular, a face da frente está em z 0,05: o vidro fica 6 mm à frente para não brigar com ela)
  k.glow(M.mirror).add(g, '#fff', { p: [0, y, oval ? 0.05 : 0.056], s: oval ? [w, h, 1] : [1, 1, 1] });
}
export function rug(k, M, idx, w, d, y = 0.012) {
  k.tex(M.rugs).add(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), '#ffffff', { p: [0, y, 0], uv: rugUV(idx) });
  // franja nas pontas
  for (const s of [-1, 1]) for (let i = 0; i < Math.floor(w / 0.06); i++) k.b.add(S.box(0.012, 0.004, 0.08), '#e8d8b0', { p: [-w / 2 + 0.03 + i * 0.06, y, s * (d / 2 + 0.03)] });
}
/** teia no canto (plano com textura); ry define para onde abre */
export function cobweb(k, M, s = 1) {
  k.glow(M.cobweb).addRaw(new THREE.PlaneGeometry(1, 1).translate(0.5, -0.5, 0), { s: [s, s, s] });
}
export function label(k, M, idx, w, h, t = {}) {
  k.tex(M.labels).add(new THREE.PlaneGeometry(w, h), '#ffffff', { ...t, uv: labelUV(idx) });
}

// ---------------------------------------------------------------------------
// saguão
// ---------------------------------------------------------------------------
export function suitOfArmor(k, { metal = '#8a8a9a' } = {}) {
  const m2 = sh(metal, 0.7);
  k.b.add(S.boxB(0.6, 0.18, 0.5), PAL.stoneDark);
  for (const s of [-1, 1]) {
    k.b.add(S.cylB(0.07, 0.09, 0.8, 8), metal, { p: [s * 0.11, 0.18, 0] });
    k.b.add(S.box(0.16, 0.08, 0.26), m2, { p: [s * 0.11, 0.22, 0.05] });
    k.b.add(S.sphere(0.08, 8, 6), m2, { p: [s * 0.11, 0.6, 0.02] });
  }
  k.b.add(S.cyl(0.2, 0.16, 0.25, 10), m2, { p: [0, 1.08, 0] });
  k.b.add(S.cyl(0.24, 0.2, 0.5, 10), metal, { p: [0, 1.45, 0], s: [1, 1, 0.8] });
  for (let i = 0; i < 4; i++) k.b.add(S.torus(0.2 - i * 0.005, 0.012, 3, 14), m2, { p: [0, 1.25 + i * 0.1, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.8, 1] });
  for (const s of [-1, 1]) {
    k.b.add(S.sphere(0.13, 10, 8), metal, { p: [s * 0.3, 1.65, 0], s: [1, 0.8, 1] });
    k.b.add(S.cyl(0.06, 0.05, 0.55, 8), m2, { p: [s * 0.33, 1.32, 0.04], r: [0.2, 0, s * 0.1] });
    k.b.add(S.sphere(0.07, 8, 6), metal, { p: [s * 0.34, 1.02, 0.12] });
  }
  // elmo com asas de morcego
  k.b.add(S.sphere(0.17, 12, 10), metal, { p: [0, 1.95, 0], s: [1, 1.2, 1.05] });
  k.b.add(S.box(0.2, 0.03, 0.02), '#0a0a0e', { p: [0, 1.95, 0.17] });
  for (let i = 0; i < 4; i++) k.b.add(S.box(0.02, 0.1, 0.02), '#0a0a0e', { p: [-0.06 + i * 0.04, 1.87, 0.17] });
  for (const s of [-1, 1]) {
    const sp = new THREE.Shape();
    sp.moveTo(0, 0);
    sp.quadraticCurveTo(0.2, 0.12, 0.36, 0.32);
    sp.quadraticCurveTo(0.26, 0.24, 0.24, 0.12);
    sp.quadraticCurveTo(0.16, 0.16, 0.14, 0.06);
    sp.quadraticCurveTo(0.08, 0.06, 0, 0);
    k.b.add(S.extrude(sp, 0.02, 4), m2, { p: [s * 0.14, 2.0, -0.02], s: [s, 1, 1], flat: true });
  }
  // alabarda
  k.b.add(S.cylB(0.022, 0.022, 2.6, 6), PAL.woodDark, { p: [0.42, 0.18, 0.15] });
  k.b.add(S.box(0.3, 0.26, 0.02), metal, { p: [0.52, 2.6, 0.15] });
  k.b.add(S.cone(0.05, 0.3, 4), metal, { p: [0.42, 2.9, 0.15] });
}
export function grandfatherClock(k, { wood = '#3a2218' } = {}) {
  k.b.add(S.boxB(0.62, 0.35, 0.4), sh(wood, 0.9));
  k.b.add(S.boxB(0.5, 1.35, 0.32), wood, { p: [0, 0.35, 0] });
  k.b.add(S.box(0.34, 1.0, 0.02), '#12101a', { p: [0, 1.05, 0.165] });
  k.b.add(S.boxB(0.66, 0.66, 0.42), wood, { p: [0, 1.7, 0] });
  k.b.add(S.cyl(0.24, 0.24, 0.03, 20), '#e8dcc0', { p: [0, 2.03, 0.215], r: [Math.PI / 2, 0, 0] });
  k.b.add(S.torus(0.25, 0.025, 4, 20), GOLD, { p: [0, 2.03, 0.225] });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    k.b.add(S.box(0.015, 0.04, 0.01), '#1a1410', { p: [Math.cos(a) * 0.2, 2.03 + Math.sin(a) * 0.2, 0.232], r: [0, 0, a + Math.PI / 2] });
  }
  // coroa em arco pontudo com morcego
  const s = new THREE.Shape();
  s.moveTo(-0.34, 0);
  s.lineTo(0.34, 0);
  s.quadraticCurveTo(0.3, 0.3, 0, 0.48);
  s.quadraticCurveTo(-0.3, 0.3, -0.34, 0);
  k.b.add(S.extrude(s, 0.44, 6), sh(wood, 1.2), { p: [0, 2.36, 0], flat: true });
  k.b.add(S.sphere(0.06, 6, 5), GOLD, { p: [0, 2.86, 0] });
  return { face: V3(0, 2.03, 0.24), pendulum: V3(0, 1.45, 0.14) };
}
export function coatRack(k, { wood = '#3a2218' } = {}) {
  k.b.add(S.cylB(0.22, 0.26, 0.05, 10), wood);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    k.b.add(S.box(0.06, 0.04, 0.4), wood, { p: [Math.cos(a) * 0.15, 0.03, Math.sin(a) * 0.15], r: [0, -a, 0] });
  }
  k.b.add(S.cylB(0.03, 0.035, 1.85, 7), wood, { p: [0, 0.05, 0] });
  k.b.add(S.sphere(0.06, 8, 6), wood, { p: [0, 1.93, 0] });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    k.b.add(S.tube([V3(0, 1.7, 0), V3(Math.cos(a) * 0.12, 1.78, Math.sin(a) * 0.12), V3(Math.cos(a) * 0.2, 1.72, Math.sin(a) * 0.2)], 0.015, 4, { segments: 6 }), BRASS);
  }
  // chapéu-coco num gancho e um guarda-chuva preto
  k.b.add(S.cylB(0.11, 0.1, 0.12, 12), '#1a1820', { p: [0.2, 1.68, 0] });
  k.b.add(S.cyl(0.18, 0.18, 0.015, 14), '#1a1820', { p: [0.2, 1.68, 0] });
}
export function umbrellaStand(k) {
  k.b.add(S.cylB(0.14, 0.12, 0.55, 10, true), '#4a3a2a');
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1;
    k.b.add(S.cylB(0.012, 0.012, 0.95, 5), '#1a1820', { p: [Math.cos(a) * 0.05, 0.1, Math.sin(a) * 0.05], r: [Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12] });
    k.b.add(S.torus(0.05, 0.012, 4, 8, Math.PI), '#1a1820', { p: [Math.cos(a) * 0.08, 1.05, Math.sin(a) * 0.08] });
  }
}
export function bust(k, { stone = '#b8b4c0' } = {}) {
  k.b.add(S.cylB(0.22, 0.26, 0.1, 10), sh(stone, 0.8));
  k.b.add(S.cylB(0.13, 0.16, 1.0, 10), stone, { p: [0, 0.1, 0] });
  k.b.add(S.cylB(0.22, 0.18, 0.08, 10), sh(stone, 0.9), { p: [0, 1.1, 0] });
  k.b.add(S.sphere(0.2, 12, 8), stone, { p: [0, 1.28, 0], s: [1.3, 0.7, 0.8] });
  k.b.add(S.sphere(0.15, 12, 10), stone, { p: [0, 1.52, 0], s: [0.9, 1.15, 1] });
  for (const s of [-1, 1]) k.b.add(S.cone(0.04, 0.12, 4), stone, { p: [s * 0.13, 1.56, 0], r: [0, 0, s * -1.1] });
  k.b.add(S.sphere(0.155, 10, 8), sh(stone, 0.85), { p: [0, 1.6, -0.02], s: [0.95, 0.8, 1] });
}
export function plantDead(k, rng) {
  k.b.add(S.cylB(0.18, 0.13, 0.36, 10), '#6a3a2a');
  k.b.add(S.cyl(0.17, 0.17, 0.02, 10), '#2a1a14', { p: [0, 0.34, 0] });
  for (let i = 0; i < 5; i++) {
    const a = rng.range(0, TAU);
    const pts = [V3(0, 0.34, 0), V3(Math.cos(a) * 0.1, 0.7, Math.sin(a) * 0.1), V3(Math.cos(a) * 0.3, 0.95 + rng.range(-0.1, 0.2), Math.sin(a) * 0.3)];
    pts.push(...curlPoints(pts[2], V3(Math.cos(a), -0.3, Math.sin(a)).normalize(), V3(0, -1, 0), 0.08, 0.9, 5, 0.6).slice(1));
    k.b.add(S.tube(pts, (t) => 0.02 * (1 - t * 0.7), 4, { segments: 12 }), '#3a3a22');
  }
}

// ---------------------------------------------------------------------------
// lareira e sala
// ---------------------------------------------------------------------------
/** lareira de pedra (frente +z, encostada em z = 0); devolve a posição do fogo */
export function fireplace(k, M, { w = 2.2, h = 1.6, stone = '#8a8290' } = {}) {
  const s2 = sh(stone, 0.8);
  k.b.add(S.boxB(w + 0.3, 0.12, 0.9), s2, { p: [0, 0, 0.35] });
  for (const s of [-1, 1]) {
    k.b.add(S.boxB(0.34, h, 0.5), stone, { p: [s * (w / 2 - 0.12), 0.12, 0.2] });
    for (let i = 0; i < 4; i++) k.b.add(S.box(0.38, 0.05, 0.54), s2, { p: [s * (w / 2 - 0.12), 0.3 + i * 0.35, 0.2] });
    k.b.add(S.sphere(0.12, 8, 6), stone, { p: [s * (w / 2 - 0.12), h + 0.05, 0.42], s: [1, 0.7, 0.7] });
  }
  k.b.add(S.box(w + 0.5, 0.14, 0.62), sh(stone, 1.1), { p: [0, h + 0.2, 0.24] });
  k.b.add(S.box(w + 0.36, 0.3, 0.5), stone, { p: [0, h, 0.2] });
  // coifa até o teto, revestida de pedra aparelhada (lisa, parecia um bloco de gesso)
  k.b.add(S.boxB(w - 0.1, 1.9, 0.36), s2, { p: [0, h + 0.27, 0.12] });
  if (M.stone) {
    const st = k.tex(M.stone), T = TEX_TILE.stone * 0.6;
    st.add(uvPlane(w - 0.1, 1.9, T), sh(stone, 1.25), { p: [0, h + 1.22, 0.302] });
    for (const s of [-1, 1]) st.add(uvPlane(0.36, 1.9, T), sh(stone, 1.1), { p: [s * ((w - 0.1) / 2 + 0.002), h + 1.22, 0.12], r: [0, s * Math.PI / 2, 0] });
  }
  // boca escura, cinzas, grelha, lenha e fogo
  k.glow(M.dark).add(S.box(w - 0.7, h - 0.2, 0.04), '#fff', { p: [0, 0.12 + (h - 0.2) / 2, 0.02] });
  k.b.add(S.box(w - 0.7, 0.04, 0.4), '#2a2226', { p: [0, 0.14, 0.22] });
  for (let i = 0; i < 6; i++) k.b.add(S.cylB(0.012, 0.012, 0.2, 4), IRON, { p: [-0.35 + i * 0.14, 0.16, 0.35] });
  k.b.add(S.box(0.9, 0.03, 0.03), IRON, { p: [0, 0.34, 0.35] });
  for (const [x, rz, ry] of [[-0.12, 0.2, 0.3], [0.15, -0.2, -0.2], [0, 0.05, 1.4]]) k.b.add(S.cyl(0.07, 0.08, 0.7, 7), '#4a2a1a', { p: [x, 0.26 + (ry > 1 ? 0.12 : 0), 0.25], r: [Math.PI / 2, ry, rz] });
  const fire = V3(0, 0.55, 0.26);
  for (const [x, hh, r] of [[0, 0.62, 0.16], [-0.2, 0.42, 0.11], [0.22, 0.46, 0.12], [0.08, 0.34, 0.09]]) k.glow(M.fire).add(S.cone(r, hh, 7), '#fff', { p: [x, 0.3 + hh / 2, 0.26] });
  k.glow(M.ember).add(S.box(0.7, 0.05, 0.25), '#fff', { p: [0, 0.2, 0.25] });
  return { fire };
}
export function mantelDecor(k, M, rng, w, y) {
  const f = [];
  f.push(...candelabra(k, M, { arms: 3, h: 0.35, span: 0.18 }).map((p) => p.add(V3(-w / 2 + 0.3, y, 0))));
  f.push(...candelabra(k, M, { arms: 3, h: 0.35, span: 0.18 }).map((p) => p.add(V3(w / 2 - 0.3, y, 0))));
  k.b.add(S.sphere(0.11, 10, 8), PAL.bone, { p: [0.2, y + 0.11, 0], s: [1, 1.1, 1.05] });
  for (const s of [-1, 1]) k.b.add(S.sphere(0.03, 5, 4), PAL.ink, { p: [0.2 + s * 0.04, y + 0.13, 0.09] });
  // relógio de lareira
  k.b.add(S.box(0.3, 0.22, 0.12), '#3a2218', { p: [-0.25, y + 0.11, 0] });
  k.b.add(S.cyl(0.07, 0.07, 0.02, 12), '#e8dcc0', { p: [-0.25, y + 0.14, 0.065], r: [Math.PI / 2, 0, 0] });
  return f;
}
export function gramophone(k) {
  k.b.add(S.box(0.4, 0.2, 0.4), '#4a2a1a', { p: [0, 0.1, 0] });
  k.b.add(S.cyl(0.16, 0.16, 0.01, 16), '#1a1418', { p: [0, 0.205, 0] });
  k.b.add(S.tube([V3(0.12, 0.2, -0.1), V3(0.12, 0.35, -0.1), V3(0.05, 0.5, 0.05)], 0.012, 4), BRASS);
  const pts = [[0.02, 0], [0.04, 0.1], [0.08, 0.2], [0.18, 0.3], [0.32, 0.36]];
  k.d.add(S.lathe(pts, 14), BRASS, { p: [0.05, 0.5, 0.05], r: [-1.1, 0, 0.3] });
}

// ---------------------------------------------------------------------------
// quarto e banheiro
// ---------------------------------------------------------------------------
function coffinPts(w, l) {
  return [[0, -l / 2], [w * 0.32, -l / 2], [w / 2, l * 0.2], [w * 0.32, l / 2], [-w * 0.32, l / 2], [-w / 2, l * 0.2], [-w * 0.32, -l / 2]].map(([x, z]) => new THREE.Vector2(x, z));
}
/** cama-caixão com dossel de veludo (cabeceira em -z) */
export function coffinBed(k, { wood = '#2a1418', velvet = '#6a0e1e' } = {}) {
  const w = 1.3, l = 2.4;
  k.b.add(S.boxB(w + 0.8, 0.25, l + 0.8), '#3a2a30', { p: [0, 0, 0] });
  const base = new THREE.Shape(coffinPts(w, l));
  const box = new THREE.ExtrudeGeometry(base, { depth: 0.55, bevelEnabled: false }).rotateX(Math.PI / 2).translate(0, 0.8, 0);
  k.b.add(box, wood, { flat: true });
  const inner = new THREE.ExtrudeGeometry(new THREE.Shape(coffinPts(w - 0.14, l - 0.14)), { depth: 0.05, bevelEnabled: false }).rotateX(Math.PI / 2).translate(0, 0.78, 0);
  k.b.add(inner, velvet);
  k.b.add(S.box(0.5, 0.14, 0.3), '#e8dce0', { p: [0, 0.82, -l / 2 + 0.4] });
  // tampa encostada de pé na cabeceira
  const lid = new THREE.ExtrudeGeometry(new THREE.Shape(coffinPts(w, l)), { depth: 0.08, bevelEnabled: false });
  k.b.add(lid, sh(wood, 1.25), { p: [0.1, 0.25, -l / 2 - 0.25], r: [-0.06, 0, 0], flat: true });
  k.b.add(S.box(0.18, 0.5, 0.04), GOLD, { p: [0.1, 1.5, -l / 2 - 0.15] });
  k.b.add(S.box(0.5, 0.12, 0.04), GOLD, { p: [0.1, 1.62, -l / 2 - 0.15] });
  // colunas e dossel
  const H = 3.2;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    k.b.add(S.cylB(0.06, 0.07, H, 8), wood, { p: [sx * (w / 2 + 0.3), 0.25, sz * (l / 2 + 0.3)] });
    k.b.add(S.cone(0.09, 0.3, 6), wood, { p: [sx * (w / 2 + 0.3), 0.25 + H + 0.15, sz * (l / 2 + 0.3)] });
  }
  k.b.add(S.box(w + 0.8, 0.14, l + 0.8), velvet, { p: [0, 0.25 + H - 0.05, 0] });
  for (const s of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const g = new THREE.PlaneGeometry(0.7, H - 0.2, 8, 6);
      const p = g.attributes.position;
      for (let j = 0; j < p.count; j++) {
        const x = p.getX(j), y = p.getY(j);
        const t = ((H - 0.2) / 2 - y) / (H - 0.2);
        const tie = 1 - 0.55 * Math.exp(-((t - 0.55) ** 2) * 30);
        p.setX(j, x * tie);
        p.setZ(j, Math.sin(x * 22) * 0.05);
      }
      g.computeVertexNormals();
      k.d.add(g, velvet, { p: [s * (w / 2 + 0.3) - s * 0.05, 0.25 + (H - 0.2) / 2 + 0.1, (i ? 1 : -1) * (l / 2 + 0.3) - (i ? 0.3 : -0.3)], r: [0, Math.PI / 2, 0] });
    }
  }
  // franja dourada e morcego no topo
  for (let i = 0; i < 16; i++) k.b.add(S.cone(0.03, 0.1, 4), GOLD, { p: [-w / 2 - 0.4 + (i * (w + 0.8)) / 15, 0.25 + H - 0.17, l / 2 + 0.4], r: [Math.PI, 0, 0] });
}
/** divã (chaise-longue) de veludo com braço enrolado e almofada de morcego (frente +z, cabeceira em -x) */
export function chaise(k, { col = '#6a0e1e', wood = '#2a1418' } = {}) {
  const L = 1.8, D = 0.7;
  k.b.add(S.box(L, 0.1, D), wood, { p: [0, 0.2, 0] });
  k.b.add(S.box(L - 0.06, 0.2, D - 0.06), col, { p: [0, 0.35, 0] });
  // encosto baixo que sobe para a cabeceira
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    k.b.add(S.box(L / 6, 0.2 + t * t * 0.45, 0.12), col, { p: [L / 2 - (L / 6) * (i + 0.5), 0.55 + t * t * 0.22, -D / 2 + 0.06] });
  }
  k.b.add(S.cyl(0.2, 0.2, D, 12), col, { p: [-L / 2 + 0.1, 0.6, 0], r: [Math.PI / 2, 0, 0] });
  k.b.add(S.torus(0.2, 0.025, 4, 12, Math.PI * 1.4), GOLD, { p: [-L / 2 + 0.1, 0.6, D / 2 + 0.005], r: [0, 0, -0.9] });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.b.add(S.cylB(0.03, 0.02, 0.2, 6), GOLD, { p: [sx * (L / 2 - 0.1), 0, sz * (D / 2 - 0.08)] });
  k.b.add(S.box(0.34, 0.26, 0.12), '#1e1826', { p: [-L / 2 + 0.4, 0.6, -0.1], r: [-0.3, 0.4, 0] });
  for (const e of [-1, 1]) k.b.add(S.cone(0.07, 0.14, 3), '#1e1826', { p: [-L / 2 + 0.4 + e * 0.18, 0.66, -0.1], r: [0, 0.4, e * 1.2] });
  // manta xadrez caída pela borda
  k.b.add(S.box(0.5, 0.02, D + 0.04), '#3a2a4a', { p: [0.45, 0.46, 0] });
  k.d.add(new THREE.PlaneGeometry(0.5, 0.3).translate(0, -0.15, 0), '#3a2a4a', { p: [0.45, 0.46, D / 2 + 0.02], r: [0.05, 0, 0] });
}
/** biombo de 3 folhas com morcegos pintados (frente +z) */
export function foldingScreen(k, { wood = '#2a1418', cloth = '#8a1a2a', h = 1.8 } = {}) {
  const pw = 0.6;
  for (let i = -1; i <= 1; i++) {
    const a = i * 0.45, cx = i * pw * Math.cos(0.45), cz = -Math.abs(i) * pw * Math.sin(0.45) * 0.5;
    const r = [0, -a, 0];
    for (const e of [-1, 1]) k.b.add(S.cylB(0.022, 0.022, h, 6), wood, { p: [cx + e * (pw / 2) * Math.cos(a), 0, cz + e * (pw / 2) * Math.sin(a)] });
    k.b.add(S.box(pw - 0.04, h - 0.25, 0.02), cloth, { p: [cx, h / 2 + 0.05, cz], r });
    k.b.add(S.box(pw - 0.04, 0.05, 0.04), wood, { p: [cx, h - 0.1, cz], r });
    k.b.add(S.box(pw - 0.04, 0.05, 0.04), wood, { p: [cx, 0.18, cz], r });
    // morcego pintado em cada folha
    const bx = cx + Math.sin(a) * 0.012, bz = cz + Math.cos(a) * 0.012;
    k.b.add(S.sphere(0.05, 6, 5), '#1a1014', { p: [bx, h * 0.62, bz], s: [1, 1.2, 0.3] });
    for (const e of [-1, 1]) k.b.add(S.cone(0.08, 0.2, 3), '#1a1014', { p: [bx + e * 0.12 * Math.cos(a), h * 0.62, bz + e * 0.12 * Math.sin(a)], r: [0, -a, e * 1.35], s: [1, 1, 0.3] });
  }
}
/** mesinha redonda de apoio com cálice e livro */
export function sideTable(k, { wood = '#2a1418' } = {}) {
  k.b.add(S.cylB(0.28, 0.28, 0.04, 14), wood, { p: [0, 0.62, 0] });
  k.b.add(S.cylB(0.04, 0.05, 0.62, 8), wood);
  k.b.add(S.cylB(0.18, 0.22, 0.04, 10), wood);
  k.b.add(S.lathe([[0.001, 0], [0.04, 0], [0.01, 0.02], [0.01, 0.1], [0.045, 0.14], [0.05, 0.2], [0.001, 0.12]], 8), '#b8c8d8', { p: [0.1, 0.66, 0.05] });
  k.b.add(S.cyl(0.04, 0.04, 0.02, 8), '#6a0a14', { p: [0.1, 0.8, 0.05] });
  k.b.add(S.box(0.2, 0.05, 0.14), '#3a1a2a', { p: [-0.08, 0.685, -0.06], r: [0, 0.4, 0] });
}
export function wardrobe(k, { wood = '#2e1a14', open = true } = {}) {
  const w = 1.6, h = 2.5, d = 0.62;
  k.b.add(S.box(w, h, 0.04), sh(wood, 0.6), { p: [0, h / 2, -d / 2] });
  for (const s of [-1, 1]) k.b.add(S.box(0.05, h, d), wood, { p: [s * (w / 2 - 0.025), h / 2, 0] });
  k.b.add(S.box(w + 0.1, 0.12, d + 0.08), sh(wood, 1.2), { p: [0, h + 0.06, 0.02] });
  k.b.add(S.box(w, 0.12, d), wood, { p: [0, 0.06, 0] });
  k.b.add(S.cyl(0.015, 0.015, w - 0.1, 5), BRASS, { p: [0, h - 0.25, 0], r: [0, 0, Math.PI / 2] });
  // capas pretas iguaizinhas (e um cabide vazio)
  for (let i = 0; i < 7; i++) {
    const x = -w / 2 + 0.2 + i * 0.2;
    k.b.add(S.torus(0.05, 0.008, 3, 8, Math.PI), BRASS, { p: [x, h - 0.28, 0], r: [0, Math.PI / 2, 0] });
    if (i === 4) {
      k.b.add(S.box(0.34, 0.02, 0.02), BRASS, { p: [x, h - 0.33, 0], r: [0, Math.PI / 2, 0] });
      continue;
    }
    k.d.add(new THREE.ConeGeometry(0.2, 1.5, 10, 1, true, Math.PI * 0.5, Math.PI), '#16121c', { p: [x, h - 1.1, -0.02], r: [0, Math.PI / 2, 0] });
    k.b.add(S.box(0.02, 0.2, 0.3), '#8a1a2a', { p: [x, h - 0.45, 0], r: [0, 0, 0] });
  }
  if (open) {
    for (const s of [-1, 1]) {
      k.b.add(S.box(w / 2, h - 0.2, 0.04), wood, { p: [s * (w / 2 + w / 4 * Math.cos(1.2)), h / 2, d / 2 + (w / 4) * Math.sin(1.2)], r: [0, s * -1.2, 0] });
    }
  }
}
export function vanity(k, M, { wood = '#3a2218' } = {}) {
  table(k, { w: 1.1, d: 0.5, h: 0.75, wood, legs: 'turned' });
  mirror(k, M, { w: 0.7, h: 0.9, y: 1.45, oval: true });
  k.b.add(S.box(0.1, 0.8, 0.05), wood, { p: [-0.42, 1.2, -0.2] });
  k.b.add(S.box(0.1, 0.8, 0.05), wood, { p: [0.42, 1.2, -0.2] });
  // copo com a dentadura de ouro, perfume e pente
  k.b.add(S.cylB(0.05, 0.045, 0.14, 10, true), '#b8d0d8', { p: [0.3, 0.78, 0.05] });
  k.b.add(S.box(0.06, 0.03, 0.04), GOLD, { p: [0.3, 0.84, 0.05] });
  k.b.add(S.sphere(0.05, 8, 6), '#a83a6a', { p: [-0.3, 0.83, 0.05] });
  k.b.add(S.cyl(0.012, 0.012, 0.06, 5), GOLD, { p: [-0.3, 0.9, 0.05] });
  k.b.add(S.box(0.2, 0.02, 0.05), '#1a1418', { p: [0, 0.77, 0.12] });
}
export function clawTub(k, { col = '#e8e4ec' } = {}) {
  const pts = [[0.001, 0.25], [0.35, 0.25], [0.42, 0.35], [0.44, 0.6], [0.46, 0.72], [0.42, 0.72], [0.38, 0.35], [0.001, 0.32]];
  k.b.add(S.lathe(pts, 18), col, { s: [1, 1, 2.1] });
  k.b.add(S.torus(0.44, 0.03, 5, 20), col, { p: [0, 0.72, 0], r: [Math.PI / 2, 0, 0], s: [1, 2.1, 1] });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    k.b.add(S.sphere(0.06, 6, 5), GOLD, { p: [sx * 0.28, 0.08, sz * 0.62] });
    k.b.add(S.cyl(0.03, 0.05, 0.2, 5), GOLD, { p: [sx * 0.3, 0.18, sz * 0.65], r: [sz * 0.3, 0, sx * -0.3] });
  }
  // água vermelha e espuma
  k.b.add(S.cyl(0.4, 0.4, 0.02, 18), '#8a1020', { p: [0, 0.62, 0], s: [1, 1, 2.05] });
  const rng = { v: 1 };
  for (let i = 0; i < 26; i++) {
    rng.v = (rng.v * 16807) % 2147483647;
    const r = (rng.v % 1000) / 1000;
    const a = r * TAU, d = 0.1 + ((i * 37) % 10) / 40;
    k.b.add(S.sphere(0.06 + (i % 4) * 0.02, 7, 5), i % 3 ? '#f4c8d0' : '#ffffff', { p: [Math.cos(a) * d, 0.66 + (i % 3) * 0.03, Math.sin(a) * d * 2] });
  }
  // torneira e patinho-morcego
  k.b.add(S.tube([V3(0, 0.6, -0.86), V3(0, 0.95, -0.9), V3(0, 1.0, -0.78), V3(0, 0.9, -0.72)], 0.025, 5), GOLD);
  k.b.add(S.sphere(0.07, 8, 6), '#2a1a2a', { p: [0.15, 0.7, 0.2] });
  k.b.add(S.sphere(0.045, 8, 6), '#2a1a2a', { p: [0.15, 0.78, 0.26] });
  k.b.add(S.cone(0.02, 0.05, 4), '#e0a02a', { p: [0.15, 0.78, 0.32], r: [Math.PI / 2, 0, 0] });
  for (const s of [-1, 1]) k.b.add(S.cone(0.05, 0.1, 3), '#2a1a2a', { p: [0.15 + s * 0.08, 0.74, 0.18], r: [0, 0, s * 1.2] });
}
export function sink(k, M) {
  k.b.add(S.lathe([[0.04, 0], [0.08, 0.05], [0.06, 0.6], [0.16, 0.78], [0.26, 0.85], [0.001, 0.85]], 12), '#e8e4ec');
  k.b.add(S.cyl(0.2, 0.2, 0.02, 12), '#c8c4d0', { p: [0, 0.84, 0] });
  k.b.add(S.tube([V3(0, 0.84, -0.22), V3(0, 1.02, -0.22), V3(0, 1.02, -0.1)], 0.015, 4), GOLD);
  mirror(k, M, { w: 0.6, h: 0.8, y: 1.55, oval: false, frame: GOLD });
}
export function towelRack(k) {
  k.b.add(S.boxB(0.04, 1.1, 0.04), GOLD, { p: [-0.35, 0, 0] });
  k.b.add(S.boxB(0.04, 1.1, 0.04), GOLD, { p: [0.35, 0, 0] });
  k.b.add(S.cyl(0.015, 0.015, 0.74, 5), GOLD, { p: [0, 1.0, 0], r: [0, 0, Math.PI / 2] });
  k.d.add(new THREE.PlaneGeometry(0.5, 0.7).translate(0, -0.35, 0), '#6a1a3a', { p: [0, 1.02, 0.02], r: [0, 0, 0] });
  k.d.add(new THREE.PlaneGeometry(0.5, 0.7).translate(0, -0.35, 0), '#4a1228', { p: [0, 1.02, -0.02] });
}

/** privada vitoriana: caixa de descarga alta de madeira, cano de latão e corrente com puxador (frente +z) */
export function toilet(k) {
  const por = '#e8e4ec';
  k.b.add(S.lathe([[0.1, 0], [0.13, 0.05], [0.1, 0.25], [0.2, 0.38], [0.001, 0.4]], 12), por, { s: [1, 1, 1.35], p: [0, 0, 0.05] });
  k.b.add(S.torus(0.17, 0.035, 5, 14), '#3a2218', { p: [0, 0.42, 0.07], r: [Math.PI / 2, 0, 0], s: [1, 1.3, 1] });
  // tampa de madeira aberta, encostada no cano
  k.b.add(S.box(0.36, 0.03, 0.46), '#3a2218', { p: [0, 0.62, -0.2], r: [-1.35, 0, 0] });
  k.b.add(S.box(0.28, 0.2, 0.2), por, { p: [0, 0.32, -0.16] });
  k.b.add(S.cyl(0.025, 0.025, 1.45, 6), BRASS, { p: [0, 1.1, -0.26] });
  // caixa de descarga com friso e morceguinho entalhado
  k.b.add(S.box(0.56, 0.3, 0.24), '#3a2218', { p: [0, 1.95, -0.2] });
  k.b.add(S.box(0.62, 0.05, 0.28), '#2a160e', { p: [0, 2.12, -0.2] });
  k.b.add(S.box(0.2, 0.08, 0.02), '#1a1014', { p: [0, 1.96, -0.075] });
  for (const s of [-1, 1]) {
    k.b.add(S.cone(0.06, 0.12, 3), '#1a1014', { p: [s * 0.1, 1.97, -0.075], r: [Math.PI / 2, 0, s * 1.3] });
    k.b.add(S.box(0.04, 0.16, 0.14), '#2a160e', { p: [s * 0.24, 1.76, -0.24], r: [0, 0, s * 0.5] });
  }
  // corrente e puxador de porcelana
  for (let i = 0; i < 9; i++) k.b.add(S.torus(0.012, 0.004, 3, 6), BRASS, { p: [0.24, 1.78 - i * 0.07, -0.1], r: [0, (i % 2) * Math.PI / 2, 0] });
  k.b.add(S.capsule(0.022, 0.07, 2, 6), por, { p: [0.24, 1.1, -0.1] });
}
/** armarinho de poções aberto: prateleiras com frascos à mostra, frontão e porta de vidro entreaberta */
export function potionCabinet(k, M, { wood = '#e8e0d8' } = {}) {
  const w = 0.84, h = 1.7, d = 0.34;
  k.b.add(S.box(w, h, 0.03), sh(wood, 0.72), { p: [0, h / 2, -d / 2 + 0.015] });
  for (const s of [-1, 1]) k.b.add(S.box(0.04, h, d), wood, { p: [s * (w / 2 - 0.02), h / 2, 0] });
  k.b.add(S.box(w, 0.06, d), wood, { p: [0, 0.03, 0] });
  k.b.add(S.box(w + 0.08, 0.06, d + 0.04), sh(wood, 1.08), { p: [0, h + 0.03, 0.01] });
  k.b.add(S.cone(0.12, 0.16, 3), sh(wood, 1.08), { p: [0, h + 0.14, 0.02] });
  const cols = ['#6aff9a', '#ff5a8a', '#9a7aff'];
  for (let i = 0; i < 4; i++) {
    const yy = 0.36 + i * 0.36;
    k.b.add(S.box(w - 0.08, 0.025, d - 0.04), sh(wood, 0.9), { p: [0, yy, 0.01] });
    for (let j = 0; j < 4; j++) {
      const x = -0.28 + j * 0.19, tall = (i + j) % 3 === 0;
      const r = tall ? 0.035 : 0.05, hh = tall ? 0.2 : 0.12;
      k.b.add(S.cylB(r, r, hh, 8), '#b8d0d8', { p: [x, yy + 0.012, 0.02] });
      k.b.add(S.cylB(r * 0.4, r * 0.45, 0.05, 6), '#6a4a32', { p: [x, yy + 0.012 + hh, 0.02] });
      if ((i + j) % 2) k.glow(M.potion).add(S.cylB(r * 0.8, r * 0.8, hh * 0.6, 6), cols[(i + j) % 3], { p: [x, yy + 0.014, 0.02] });
      else k.b.add(S.cylB(r * 0.82, r * 0.82, hh * 0.55, 6), sh(cols[(i * 2 + j) % 3], 0.55), { p: [x, yy + 0.014, 0.02] });
    }
  }
  // porta de vidro entreaberta (moldura + vidro fosco), dobradiça no lado direito
  const dw = w / 2 - 0.02, a = 0.9;
  const cx = w / 2 - 0.01 - Math.cos(a) * dw * 0.5, cz = d / 2 + Math.sin(a) * dw * 0.5, r = [0, a, 0];
  k.b.add(S.box(dw, 0.05, 0.03), wood, { p: [cx, h - 0.05, cz], r });
  k.b.add(S.box(dw, 0.05, 0.03), wood, { p: [cx, 0.1, cz], r });
  k.b.add(S.box(dw, h - 0.2, 0.01), '#cfe4ec', { p: [cx, h / 2, cz], r });
}
/** cesto de roupa de vime com uma capa preta escapando */
export function hamper(k) {
  k.b.add(S.cylB(0.24, 0.2, 0.62, 12, true), '#a08050');
  for (let i = 0; i < 5; i++) k.b.add(S.torus(0.215 + i * 0.008, 0.012, 3, 14), '#7a5a32', { p: [0, 0.08 + i * 0.13, 0], r: [Math.PI / 2, 0, 0] });
  k.b.add(S.cylB(0.26, 0.26, 0.04, 12), '#8a6a3a', { p: [0.06, 0.66, -0.02], r: [0.35, 0, 0] });
  k.d.add(new THREE.PlaneGeometry(0.3, 0.55, 1, 3).translate(0, -0.27, 0), '#16121c', { p: [0.2, 0.62, 0.12], r: [0.2, 0.8, -0.25] });
}
/** banquinho redondo de ferro (para as velas ao lado da banheira) */
export function stool(k, { top = '#3a2218', metal = IRON, h = 0.52 } = {}) {
  k.b.add(S.cylB(0.2, 0.2, 0.05, 12), top, { p: [0, h - 0.05, 0] });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    k.b.add(S.cylB(0.015, 0.015, h - 0.05, 4), metal, { p: [Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15], r: [Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12] });
  }
  k.b.add(S.torus(0.13, 0.01, 3, 12), metal, { p: [0, h * 0.35, 0], r: [Math.PI / 2, 0, 0] });
  return h;
}

// ---------------------------------------------------------------------------
// cozinha
// ---------------------------------------------------------------------------
export function stove(k, M) {
  k.b.add(S.boxB(1.8, 0.9, 0.8), IRON);
  k.b.add(S.box(1.9, 0.06, 0.86), '#3a3444', { p: [0, 0.93, 0] });
  for (let i = 0; i < 3; i++) {
    k.b.add(S.box(0.4, 0.3, 0.02), '#3a3444', { p: [-0.55 + i * 0.55, 0.45, 0.41] });
    k.b.add(S.box(0.12, 0.03, 0.04), BRASS, { p: [-0.55 + i * 0.55, 0.62, 0.43] });
  }
  k.glow(M.ember).add(S.box(0.3, 0.12, 0.02), '#fff', { p: [-0.55, 0.3, 0.415] });
  k.b.add(S.boxB(0.4, 1.4, 0.4), IRON, { p: [0.6, 0.96, -0.2] });
  // panelas e chaleira
  k.b.add(S.cylB(0.22, 0.2, 0.26, 12), '#5a5a64', { p: [-0.5, 0.96, 0.05] });
  k.b.add(S.cylB(0.23, 0.23, 0.03, 12), '#6a6a74', { p: [-0.5, 1.22, 0.05] });
  k.b.add(S.sphere(0.16, 10, 8), '#8a6a3a', { p: [0.05, 1.1, 0.1], s: [1, 0.8, 1] });
  k.b.add(S.tube([V3(0.2, 1.1, 0.1), V3(0.3, 1.2, 0.1), V3(0.34, 1.26, 0.1)], 0.025, 5), '#8a6a3a');
  return { steam: [V3(-0.5, 1.3, 0.05), V3(0.34, 1.28, 0.1)] };
}
export function cauldron(k, M) {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    k.b.add(S.cylB(0.03, 0.04, 0.5, 5), IRON, { p: [Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4], r: [Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3] });
  }
  k.b.add(S.lathe([[0.001, 0], [0.3, 0.05], [0.46, 0.3], [0.44, 0.55], [0.38, 0.65], [0.4, 0.68], [0.34, 0.68], [0.33, 0.6], [0.001, 0.6]], 14), '#1e1c24', { p: [0, 0.3, 0] });
  k.b.add(S.cyl(0.33, 0.33, 0.02, 14), '#c8401a', { p: [0, 0.9, 0] });
  k.glow(M.ember).add(S.cone(0.3, 0.25, 7), '#fff', { p: [0, 0.16, 0] });
  k.b.add(S.cylB(0.02, 0.02, 0.9, 5), '#6a4a2a', { p: [0.12, 0.8, 0], r: [0, 0, -0.4] });
  return { top: V3(0, 0.92, 0) };
}
export function potRack(k) {
  k.b.add(S.box(2.2, 0.06, 0.06), IRON);
  for (const s of [-1, 1]) k.b.add(S.cyl(0.01, 0.01, 1.0, 4), IRON, { p: [s * 1.0, 0.5, 0] });
  for (let i = 0; i < 7; i++) {
    const x = -0.95 + i * 0.32;
    k.b.add(S.cyl(0.006, 0.006, 0.2, 3), IRON, { p: [x, -0.1, 0] });
    if (i % 2) k.b.add(S.cylB(0.13, 0.11, 0.14, 10), '#6a4a3a', { p: [x, -0.42, 0], r: [0, 0, 0] });
    else {
      k.b.add(S.cyl(0.02, 0.02, 0.3, 4), '#5a5a64', { p: [x, -0.35, 0] });
      k.b.add(S.sphere(0.07, 8, 6), '#5a5a64', { p: [x, -0.52, 0], s: [1, 0.5, 1] });
    }
  }
  // réstias de... não, alho não. Linguiças e pimentas
  for (let i = 0; i < 6; i++) k.b.add(S.capsule(0.03, 0.1, 2, 6), '#8a2a1a', { p: [0.6 + i * 0.07, -0.25 - (i % 2) * 0.08, 0.05] });
}
export function shelfJars(k, M, rng, { w = 1.6, h = 2.2 } = {}) {
  const wood = '#5a4232';
  for (const s of [-1, 1]) k.b.add(S.boxB(0.05, h, 0.36), wood, { p: [s * (w / 2), 0, 0] });
  const labels = [0, 1, 2, 3, 13, 14, 15, 20];
  for (let r = 0; r < 4; r++) {
    const y = 0.35 + r * 0.5;
    k.b.add(S.box(w, 0.04, 0.36), wood, { p: [0, y, 0] });
    for (let i = 0; i < 5; i++) {
      const x = -w / 2 + 0.2 + i * (w - 0.3) / 4.5;
      const hh = rng.range(0.18, 0.3), rr = rng.range(0.06, 0.09);
      const kind = rng.int(0, 2);
      if (kind === 0) {
        k.b.add(S.cylB(rr, rr, hh, 10), '#a8c0c8', { p: [x, y + 0.02, 0] });
        const inside = r < 2 ? M.bloodGlow : M.potion;
        k.glow(inside).add(S.cylB(rr * 0.85, rr * 0.85, hh * 0.7, 8), '#fff', { p: [x, y + 0.03, 0] });
      } else {
        k.b.add(S.cylB(rr, rr * 1.05, hh, 10), rng.pick(['#8a6a4a', '#5a7a6a', '#6a4a6a', '#d8c8a8']), { p: [x, y + 0.02, 0] });
      }
      k.b.add(S.cylB(rr * 0.7, rr * 0.7, 0.04, 8), '#3a2a1a', { p: [x, y + 0.02 + hh, 0] });
      label(k, M, labels[(r * 5 + i) % labels.length], rr * 1.6, hh * 0.4, { p: [x, y + 0.02 + hh * 0.5, rr + 0.002] });
    }
  }
}
export function garlicCage(k, M) {
  k.b.add(S.boxB(0.5, 0.05, 0.5), IRON);
  k.b.add(S.box(0.5, 0.05, 0.5), IRON, { p: [0, 0.6, 0] });
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) {
    k.b.add(S.cylB(0.012, 0.012, 0.58, 4), IRON, { p: [-0.22 + i * 0.11, 0.03, s * 0.23] });
    k.b.add(S.cylB(0.012, 0.012, 0.58, 4), IRON, { p: [s * 0.23, 0.03, -0.22 + i * 0.11] });
  }
  for (let i = 0; i < 3; i++) {
    k.b.add(S.sphere(0.09, 10, 8), '#f0ecdc', { p: [-0.1 + i * 0.1, 0.13, 0], s: [1, 0.85, 1] });
    k.b.add(S.cone(0.03, 0.08, 5), '#e0dcc8', { p: [-0.1 + i * 0.1, 0.24, 0] });
  }
  k.b.add(S.box(0.1, 0.08, 0.1), '#8a6a2a', { p: [0.2, 0.3, 0.26] });
  label(k, M, 4, 0.5, 0.25, { p: [0, 0.8, 0.02] });
}

// ---------------------------------------------------------------------------
// música
// ---------------------------------------------------------------------------
/** órgão de tubos (frente +z); devolve teclas para animar */
export function pipeOrgan(k, M, rng) {
  const wood = '#2a1612';
  k.b.add(S.boxB(3.6, 1.1, 1.1), wood);
  // três teclados
  for (let m = 0; m < 3; m++) {
    const y = 0.95 + m * 0.1, z = 0.6 - m * 0.12;
    k.b.add(S.box(2.2, 0.04, 0.2), '#f0ecdc', { p: [0, y, z] });
    for (let i = 0; i < 26; i++) if (i % 7 !== 2 && i % 7 !== 6) k.b.add(S.box(0.045, 0.03, 0.11), '#16121a', { p: [-1.05 + i * 0.084 + 0.042, y + 0.03, z - 0.04] });
  }
  k.b.add(S.boxB(3.6, 0.9, 0.6), sh(wood, 1.1), { p: [0, 1.1, -0.25] });
  // registros (puxadores)
  for (let i = 0; i < 12; i++) k.b.add(S.cyl(0.025, 0.025, 0.08, 6), i % 3 ? '#f0ecdc' : '#b01020', { p: [(i < 6 ? -1.4 : 1.4) + (i % 2) * 0.1, 1.3 + Math.floor((i % 6) / 2) * 0.12, 0.08], r: [Math.PI / 2, 0, 0] });
  // tubos em leque
  const n = 17;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = -1.7 + t * 3.4;
    const hh = 1.0 + (1 - Math.abs(t - 0.5) * 2) * 1.55 + rng.range(-0.08, 0.08); // cabe no pé-direito de 5 m
    const r = 0.08 + (1 - Math.abs(t - 0.5) * 2) * 0.05;
    k.b.add(S.cylB(r, r, hh, 10), '#b8a0b8', { p: [x, 2.0, -0.35] });
    k.b.add(S.cone(r * 1.05, 0.22, 10), '#9a8098', { p: [x, 2.0 - 0.11, -0.35], r: [Math.PI, 0, 0] });
    k.b.add(S.box(r * 1.2, 0.05, 0.02), '#16121a', { p: [x, 2.35, -0.35 + r] });
  }
  k.b.add(S.box(3.8, 0.2, 0.5), sh(wood, 1.2), { p: [0, 2.0, -0.35] });
  // banco
  k.b.add(S.boxB(1.4, 0.5, 0.36), wood, { p: [0, 0, 1.25] });
  return { seat: V3(0, 0.5, 1.25) };
}
export function grandPiano(k) {
  const s = new THREE.Shape();
  s.moveTo(-0.75, 0.7);
  s.lineTo(0.75, 0.7);
  s.lineTo(0.75, -0.2);
  s.bezierCurveTo(0.75, -0.9, 0.2, -1.2, -0.2, -1.2);
  s.bezierCurveTo(-0.6, -1.2, -0.75, -0.9, -0.75, -0.5);
  s.lineTo(-0.75, 0.7);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.32, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, 0.62, 0);
  k.b.add(g, '#101014', { flat: true });
  // tampa aberta
  k.b.add(new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false }).rotateX(-Math.PI / 2), '#16161c', { p: [0.0, 0.95, 0], r: [0, 0, 0.7], flat: true });
  k.b.add(S.cylB(0.012, 0.012, 0.75, 4), '#16161c', { p: [0.6, 0.95, -0.4], r: [0, 0, -0.5] });
  k.b.add(S.box(1.4, 0.03, 0.18), '#f0ecdc', { p: [0, 0.8, 0.78] });
  for (let i = 0; i < 20; i++) if (i % 7 !== 2 && i % 7 !== 6) k.b.add(S.box(0.035, 0.03, 0.1), '#16121a', { p: [-0.68 + i * 0.07 + 0.035, 0.83, 0.74] });
  for (const [x, z] of [[-0.65, 0.6], [0.65, 0.6], [0, -1.0]]) k.b.add(S.lathe([[0.001, 0], [0.05, 0], [0.04, 0.2], [0.06, 0.5], [0.001, 0.62]], 8), '#101014', { p: [x, 0, z] });
  // partitura
  k.b.add(S.box(0.5, 0.35, 0.02), '#f0e8d8', { p: [0, 1.0, 0.55], r: [-0.3, 0, 0] });
  // por dentro: fundo de madeira clara, harpa dourada e cordas (sem isso, o piano era uma mancha escura)
  const inner = new THREE.ExtrudeGeometry(s, { depth: 0.01, bevelEnabled: false }).rotateX(-Math.PI / 2).scale(0.92, 1, 0.92);
  k.b.add(inner, '#b08050', { p: [0, 0.935, -0.02], flat: true });
  k.b.add(new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false }).rotateX(-Math.PI / 2).scale(0.8, 1, 0.8), '#c8a24a', { p: [0, 0.945, -0.05], flat: true });
  for (let i = 0; i < 14; i++) k.b.add(S.box(0.006, 0.004, 1.3 - Math.abs(i - 3) * 0.04), '#e8e0d0', { p: [-0.6 + i * 0.09, 0.958, -0.2 - i * 0.02] });
  // lado de baixo da tampa aberta, também de madeira clara
  k.b.add(new THREE.ExtrudeGeometry(s, { depth: 0.005, bevelEnabled: false }).rotateX(-Math.PI / 2).scale(0.94, 1, 0.94), '#8a5a34', { p: [0.0, 0.94, 0], r: [0, 0, 0.7], flat: true });
}
export function harp(k) {
  k.b.add(S.tube([V3(0, 0, 0), V3(0.05, 0.9, 0), V3(0.02, 1.7, 0)], 0.04, 6), GOLD);
  k.b.add(S.tube([V3(0, 0.1, 0), V3(0.5, 0.5, 0), V3(0.7, 1.2, 0), V3(0.3, 1.6, 0), V3(0.02, 1.7, 0)], 0.035, 6, { segments: 20 }), GOLD);
  for (let i = 1; i < 10; i++) {
    const t = i / 10;
    k.b.add(S.cyl(0.003, 0.003, 1.5 * (1 - t * 0.6), 3), '#f0e8c8', { p: [0.06 + t * 0.55, 0.85 + t * 0.2, 0] });
  }
}
/** violoncelo encostado (inclinado para trás, em -z) com o arco no chão */
export function cello(k) {
  const lean = 0.28, wood = '#8a3a14';
  const g = new THREE.Group();
  void g;
  const t = { r: [-lean, 0, 0] };
  const at = (y, z = 0) => [0, Math.cos(lean) * y, -Math.sin(lean) * y + z];
  k.b.add(S.sphere(0.24, 12, 8), wood, { p: at(0.38), s: [1, 1.15, 0.45], ...t });
  k.b.add(S.sphere(0.2, 12, 8), wood, { p: at(0.72), s: [1, 1.05, 0.45], ...t });
  k.b.add(S.box(0.05, 0.62, 0.05), '#1a1014', { p: at(1.12), ...t });
  k.b.add(S.torus(0.04, 0.015, 4, 8), '#1a1014', { p: at(1.46), r: [-lean, Math.PI / 2, 0] });
  for (let i = 0; i < 4; i++) k.b.add(S.box(0.004, 0.9, 0.004), '#d8d0c0', { p: [-0.03 + i * 0.02, Math.cos(lean) * 0.95, -Math.sin(lean) * 0.95 + 0.1], ...t });
  k.b.add(S.box(0.1, 0.04, 0.02), '#1a1014', { p: at(0.42, 0.11), ...t });
  k.b.add(S.cyl(0.008, 0.008, 0.16, 4), '#8a8a94', { p: [0, 0.06, 0.03] });
  // arco caído no chão
  k.b.add(S.cyl(0.008, 0.008, 0.72, 4), '#3a1e10', { p: [0.3, 0.012, 0.25], r: [0, 0.6, Math.PI / 2] });
}
/** pilhas de partituras amareladas */
export function sheetMusic(k, rng) {
  for (let i = 0; i < 3; i++) {
    const n = rng.int(4, 9);
    for (let j = 0; j < n; j++) k.b.add(S.box(0.3, 0.012, 0.4), j % 3 ? '#e8dcc0' : '#d8c8a0', { p: [i * 0.36 - 0.36, 0.006 + j * 0.013, rng.range(-0.02, 0.02)], r: [0, rng.range(-0.15, 0.15), 0] });
  }
}
export function musicStand(k) {
  k.b.add(S.cylB(0.015, 0.015, 1.1, 5), IRON);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    k.b.add(S.cyl(0.01, 0.01, 0.35, 4), IRON, { p: [Math.cos(a) * 0.12, 0.1, Math.sin(a) * 0.12], r: [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9] });
  }
  k.b.add(S.box(0.5, 0.35, 0.02), IRON, { p: [0, 1.2, 0], r: [-0.3, 0, 0] });
  k.b.add(S.box(0.46, 0.32, 0.01), '#f0e8d8', { p: [0, 1.2, 0.02], r: [-0.3, 0, 0] });
}

// ---------------------------------------------------------------------------
// biblioteca
// ---------------------------------------------------------------------------
export function globe(k) {
  k.b.add(S.cylB(0.18, 0.22, 0.06, 10), '#3a2218');
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    k.b.add(S.cyl(0.02, 0.025, 0.7, 5), '#3a2218', { p: [Math.cos(a) * 0.14, 0.4, Math.sin(a) * 0.14], r: [Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2] });
  }
  k.b.add(S.torus(0.36, 0.02, 4, 24), BRASS, { p: [0, 1.05, 0], r: [0, 0, 0.4] });
  const g = new THREE.SphereGeometry(0.32, 20, 14);
  k.b.add(g, (x, y, z) => {
    const n = Math.sin(x * 18 + y * 7) * Math.cos(z * 15 - y * 5);
    return n > 0.2 ? '#6a7a4a' : '#2a4a6a';
  }, { p: [0, 1.05, 0], r: [0, 0, 0.4] });
}
export function telescope(k) {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    k.b.add(S.cyl(0.02, 0.02, 1.2, 4), '#3a2218', { p: [Math.cos(a) * 0.25, 0.55, Math.sin(a) * 0.25], r: [Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25] });
  }
  k.b.add(S.cyl(0.07, 0.1, 1.2, 10), BRASS, { p: [0, 1.25, 0.2], r: [1.0, 0, 0] });
  k.b.add(S.cyl(0.11, 0.11, 0.06, 10), '#1a1418', { p: [0, 1.53, 0.72], r: [1.0, 0, 0] });
}
export function desk(k, M, rng) {
  table(k, { w: 1.6, d: 0.8, h: 0.78, wood: '#3a2218', legs: 'turned' });
  for (const s of [-1, 1]) k.b.add(S.boxB(0.5, 0.64, 0.7), '#3a2218', { p: [s * 0.52, 0.02, 0] });
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) k.b.add(S.sphere(0.02, 5, 4), BRASS, { p: [s * 0.52, 0.15 + i * 0.2, 0.36] });
  k.b.add(S.box(1.2, 0.01, 0.55), '#2a4a3a', { p: [0, 0.785, 0] });
  // tinteiro, pena, pilha de livros
  k.b.add(S.cylB(0.04, 0.05, 0.06, 8), '#16121a', { p: [0.5, 0.79, -0.15] });
  k.b.add(S.cone(0.012, 0.3, 4), PAL.bone, { p: [0.52, 0.95, -0.14], r: [0, 0, -0.35] });
  const k2 = { b: k.b };
  let y = 0.79;
  for (let i = 0; i < 4; i++) {
    const hh = rng.range(0.05, 0.08);
    k2.b.add(S.box(rng.range(0.24, 0.32), hh, rng.range(0.18, 0.24)), rng.pick(BOOK), { p: [-0.55, y + hh / 2, -0.1], r: [0, rng.range(-0.3, 0.3), 0] });
    y += hh;
  }
  const f = [candle(k, M, { x: -0.25, y: 0.79, z: -0.25, h: 0.12, r: 0.03 })];
  k.b.add(S.cylB(0.06, 0.07, 0.02, 10), BRASS, { p: [-0.25, 0.79, -0.25] });
  return f;
}
export function ladder(k, h = 3.2) {
  for (const s of [-1, 1]) k.b.add(S.boxB(0.05, h, 0.05), '#5a3a26', { p: [s * 0.24, 0, 0] });
  for (let i = 1; i < h / 0.3; i++) k.b.add(S.box(0.48, 0.035, 0.04), '#6a4a32', { p: [0, i * 0.3, 0] });
  k.b.add(S.cyl(0.04, 0.04, 0.6, 6), BRASS, { p: [0, h + 0.05, 0.05], r: [0, 0, Math.PI / 2] });
  for (const s of [-1, 1]) k.b.add(S.cyl(0.04, 0.04, 0.03, 8), IRON, { p: [s * 0.24, 0.04, 0.05], r: [0, 0, Math.PI / 2] });
}

// ---------------------------------------------------------------------------
// porão e sótão
// ---------------------------------------------------------------------------
export function barrel(k, { r = 0.42, h = 1.0, wood = '#6a4a32', lying = false } = {}) {
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    pts.push([r * (0.84 + 0.16 * Math.sin(t * Math.PI)), t * h]);
  }
  const g = S.lathe(pts, 14);
  const t = lying ? { r: [0, 0, Math.PI / 2], p: [h / 2, r, 0] } : {};
  k.b.add(g, (x, y) => sh(wood, 0.88 + 0.12 * Math.sin(Math.atan2(y, x) * 14)), t);
  for (const yy of [0.12, 0.35, 0.65, 0.88]) {
    const rr = r * (0.84 + 0.16 * Math.sin(yy * Math.PI)) + 0.01;
    k.b.add(S.torus(rr, 0.02, 3, 16), IRON, lying ? { p: [yy * h, r, 0], r: [0, Math.PI / 2, 0] } : { p: [0, yy * h, 0], r: [Math.PI / 2, 0, 0] });
  }
  if (!lying) k.b.add(S.cyl(r * 0.84, r * 0.84, 0.02, 14), sh(wood, 0.8), { p: [0, h, 0] });
  else {
    k.b.add(S.cyl(r * 0.84, r * 0.84, 0.02, 14), sh(wood, 0.8), { p: [h + 0.005, r, 0], r: [0, 0, Math.PI / 2] });
    k.b.add(S.cyl(0.03, 0.03, 0.12, 6), '#8a6a4a', { p: [h + 0.06, r * 0.6, 0], r: [0, 0, Math.PI / 2] });
  }
}
export function crate(k, { s = 0.7, wood = '#7a5a3a' } = {}) {
  k.b.add(S.boxB(s, s, s), wood);
  for (const y of [0.05, s - 0.05]) for (const zz of [-1, 1]) k.b.add(S.box(s + 0.02, 0.08, 0.02), sh(wood, 0.75), { p: [0, y, zz * (s / 2 + 0.01)] });
  for (const zz of [-1, 1]) k.b.add(S.box(0.08, s * 1.35, 0.02), sh(wood, 0.75), { p: [0, s / 2, zz * (s / 2 + 0.012)], r: [0, 0, 0.78] });
}
export function bottleRack(k, M, rng, { w = 2.0, h = 2.2 } = {}) {
  const wood = '#4a3426';
  for (const s of [-1, 1]) k.b.add(S.boxB(0.06, h, 0.45), wood, { p: [s * w / 2, 0, 0] });
  const rows = 7, cols = 9;
  for (let r = 0; r < rows; r++) {
    const y = 0.2 + r * 0.28;
    k.b.add(S.box(w, 0.03, 0.45), wood, { p: [0, y - 0.13, 0] });
    for (let c = 0; c < cols; c++) {
      if (rng.chance(0.15)) continue;
      const x = -w / 2 + 0.14 + c * ((w - 0.24) / (cols - 1));
      k.b.add(S.cyl(0.05, 0.05, 0.3, 7), rng.chance(0.8) ? '#3a0a14' : '#1a2a1a', { p: [x, y, 0.02], r: [Math.PI / 2, 0, 0] });
      k.glow(M.bloodGlow).add(S.cyl(0.022, 0.022, 0.02, 6), '#fff', { p: [x, y, 0.2], r: [Math.PI / 2, 0, 0] });
    }
  }
  label(k, M, 5, 0.34, 0.17, { p: [0, h - 0.1, 0.25] });
}
export function sarcophagus(k, M, labelIdx, { stone = '#8a8494' } = {}) {
  const s2 = sh(stone, 0.8);
  k.b.add(S.boxB(0.95, 0.2, 2.2), s2);
  k.b.add(S.boxB(0.85, 0.6, 2.1), stone, { p: [0, 0.2, 0] });
  for (let i = 0; i < 4; i++) k.b.add(S.box(0.02, 0.4, 0.3), s2, { p: [0.43, 0.5, -0.75 + i * 0.5] });
  // tampa com efígie
  k.b.add(S.box(0.95, 0.12, 2.25), sh(stone, 1.1), { p: [0, 0.86, 0] });
  k.b.add(S.sphere(0.16, 10, 8), stone, { p: [0, 1.02, -0.72], s: [1, 0.7, 1.1] });
  k.b.add(S.box(0.36, 0.14, 1.1), stone, { p: [0, 0.98, 0.1] });
  for (const s of [-1, 1]) k.b.add(S.box(0.1, 0.1, 0.5), stone, { p: [s * 0.1, 1.04, -0.22], r: [0, s * 0.5, 0] });
  k.b.add(S.box(0.1, 0.06, 0.4), stone, { p: [0, 1.06, -0.3] });
  label(k, M, labelIdx, 0.5, 0.2, { p: [0, 0.55, 1.056] });
}
export function washtub(k) {
  k.b.add(S.lathe([[0.001, 0], [0.45, 0], [0.52, 0.45], [0.5, 0.47], [0.43, 0.04], [0.001, 0.05]], 16), '#8a8a94', { p: [0, 0.4, 0] });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.4;
    k.b.add(S.cylB(0.03, 0.03, 0.42, 5), '#5a4232', { p: [Math.cos(a) * 0.38, 0, Math.sin(a) * 0.38] });
  }
  k.b.add(S.cyl(0.46, 0.46, 0.02, 16), '#8ab8c8', { p: [0, 0.78, 0] });
  for (let i = 0; i < 9; i++) k.b.add(S.sphere(0.07, 6, 5), '#f4f8ff', { p: [Math.cos(i * 2.3) * 0.28, 0.8, Math.sin(i * 2.3) * 0.25] });
  // tábua de esfregar
  k.b.add(S.box(0.42, 0.7, 0.03), '#8a6a4a', { p: [0.2, 0.95, 0.1], r: [-0.3, 0.2, 0] });
  for (let i = 0; i < 8; i++) k.b.add(S.box(0.36, 0.02, 0.02), '#b8b8c0', { p: [0.2, 0.75 + i * 0.05, 0.13 - i * 0.012], r: [-0.3, 0.2, 0] });
}
export function ironingBoard(k) {
  k.b.add(S.box(1.4, 0.04, 0.4), '#d8d0c8', { p: [0, 0.85, 0], s: [1, 1, 1] });
  k.b.add(S.cone(0.2, 0.35, 12), '#d8d0c8', { p: [0.86, 0.85, 0], r: [0, 0, -Math.PI / 2], s: [1, 1, 0.12] });
  for (const s of [-1, 1]) k.b.add(S.cyl(0.018, 0.018, 1.1, 5), '#5a5a64', { p: [s * 0.25, 0.43, 0], r: [0, 0, s * 0.55] });
  // ferro de brasa
  k.b.add(S.box(0.26, 0.1, 0.14), '#2a2a32', { p: [0.3, 0.92, 0.05] });
  k.b.add(S.torus(0.07, 0.015, 4, 10, Math.PI), '#6a4a2a', { p: [0.3, 0.97, 0.05] });
  // cabide vazio pendurado no pé (a capa ESTAVA aqui)
  k.b.add(S.torus(0.05, 0.008, 3, 8, Math.PI), BRASS, { p: [-0.55, 0.95, 0.24], r: [0, 0, 0] });
  k.b.add(S.box(0.4, 0.02, 0.02), BRASS, { p: [-0.55, 0.9, 0.24] });
}
/** varal entre dois pontos com peças (x de 0 a len) */
export function clothesline(k, len, rng) {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push(V3(t * len, -Math.sin(t * Math.PI) * 0.3, 0));
  }
  k.b.add(S.tube(pts, 0.008, 3, { segments: 24 }), '#d8d0c0');
  // peças com caimento (ondulam e embarrigam no meio) e prendedores de madeira de verdade
  const cols = ['#f0ece0', '#8a1a2a', '#3a4a6a', '#e8d8c0', '#6a3a8a', '#c8a84a', '#2a2a3a'];
  const cloth = (w, h, c, x, y, ox = 0) => {
    const g = new THREE.PlaneGeometry(w, h, 4, 5);
    const a = g.attributes.position;
    for (let j = 0; j < a.count; j++) {
      const px = a.getX(j), py = a.getY(j), t = (h / 2 - py) / h;
      a.setZ(j, Math.cos((px / w) * Math.PI) * 0.05 * t + Math.sin(py * 9 + x * 3) * 0.012);
      a.setX(j, px * (1 - t * 0.06));
    }
    g.computeVertexNormals();
    k.d.add(g.translate(ox, -h / 2, 0), c, { p: [x, y, 0] });
    for (const e of w > 0.2 ? [-1, 1] : [0]) k.b.add(S.box(0.025, 0.08, 0.035), '#b08a5a', { p: [x + ox + e * (w / 2 - 0.05), y + 0.005, 0] });
  };
  for (let x = 0.4; x < len - 0.3; x += rng.range(0.5, 0.75)) {
    const t = x / len;
    const y = -Math.sin(t * Math.PI) * 0.3;
    const kind = rng.int(0, 3);
    const c = rng.pick(cols);
    if (kind === 0) {
      // par de meias listradas
      for (const e of [-0.07, 0.07]) {
        cloth(0.1, 0.42, e < 0 ? c : '#f0ece0', x + e, y);
        k.d.add(new THREE.PlaneGeometry(0.14, 0.09).translate(0.04, -0.42, 0), e < 0 ? c : '#f0ece0', { p: [x + e, y, 0.004] });
      }
    } else if (kind === 1) {
      cloth(0.46, 0.62, c, x, y);
    } else if (kind === 2) {
      // ceroula comprida
      cloth(0.4, 0.4, '#e8d8c8', x, y);
      for (const s2 of [-1, 1]) k.d.add(new THREE.PlaneGeometry(0.16, 0.5).translate(s2 * 0.12, -0.6, 0.01), '#e8d8c8', { p: [x, y, 0] });
    } else {
      // capinha de morcego (roxa: as pretas estão todas no Conde)
      cloth(0.5, 0.78, '#3a2a4a', x, y);
      k.b.add(S.box(0.2, 0.05, 0.02), '#8a1a2a', { p: [x, y - 0.06, 0.03] });
    }
  }
}
/** varal de chão (cavalete de madeira) com capinhas pretas secando */
export function dryingRack(k, { wood = '#8a6a4a' } = {}) {
  for (const s of [-1, 1]) {
    for (const e of [-1, 1]) k.b.add(S.cyl(0.02, 0.02, 1.5, 5), wood, { p: [s * 0.55, 0.72, e * 0.2], r: [e * 0.28, 0, 0] });
  }
  for (const yy of [0.55, 1.05, 1.42]) {
    const zz = (1.42 - yy) * 0.29;
    for (const e of [-1, 1]) k.b.add(S.cyl(0.012, 0.012, 1.1, 4), wood, { p: [0, yy, e * zz], r: [0, 0, Math.PI / 2] });
  }
  const cols = ['#4a2a6a', '#6a1a2a', '#3a2a5a'];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.PlaneGeometry(0.32, 0.9, 1, 4);
    const a = g.attributes.position;
    for (let j = 0; j < a.count; j++) a.setZ(j, Math.sin(a.getY(j) * 3.2) * 0.02);
    g.computeVertexNormals();
    k.d.add(g.translate(0, -0.45, 0), cols[i], { p: [-0.36 + i * 0.36, 1.43, 0], r: [i === 1 ? 0.18 : -0.18, 0, 0] });
    k.b.add(S.box(0.3, 0.04, 0.03), '#8a1a2a', { p: [-0.36 + i * 0.36, 1.41, 0] });
  }
}
/** balde de zinco com esfregão encostado */
export function bucketMop(k) {
  k.b.add(S.cylB(0.18, 0.15, 0.32, 12, true), '#8a8a94');
  k.b.add(S.cyl(0.165, 0.165, 0.01, 12), '#6a8a9a', { p: [0, 0.26, 0] });
  k.b.add(S.torus(0.17, 0.008, 3, 10, Math.PI), '#5a5a64', { p: [0, 0.34, 0], r: [0, 0, 0] });
  k.b.add(S.cyl(0.018, 0.018, 1.45, 5), '#8a6a4a', { p: [0.05, 0.78, -0.12], r: [0.22, 0, 0.1] });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    k.b.add(S.capsule(0.018, 0.22, 2, 4), '#d8d0b8', { p: [0.08 + Math.cos(a) * 0.05, 0.14, 0.04 + Math.sin(a) * 0.05], r: [Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3] });
  }
}
/** mesinha de costura do Anselmo: almofada de alfinetes, carretéis, tesoura e uma capa pela metade */
export function sewingTable(k, { wood = '#4a3426' } = {}) {
  table(k, { w: 0.8, d: 0.55, h: 0.74, wood, legs: 'square' });
  k.b.add(S.sphere(0.07, 8, 6), '#a8203a', { p: [-0.25, 0.79, 0.08], s: [1, 0.6, 1] });
  for (let i = 0; i < 5; i++) k.b.add(S.cyl(0.003, 0.003, 0.06, 3), '#d8d8e0', { p: [-0.25 + Math.cos(i * 1.3) * 0.04, 0.83, 0.08 + Math.sin(i * 1.3) * 0.04], r: [Math.cos(i) * 0.4, 0, Math.sin(i) * 0.4] });
  const cols = ['#16121c', '#8a1a2a', '#e8dcc0', '#6a3a8a'];
  cols.forEach((c, i) => {
    k.b.add(S.cylB(0.022, 0.022, 0.07, 8), '#c8a878', { p: [0.05 + i * 0.07, 0.74, -0.15] });
    k.b.add(S.cylB(0.026, 0.026, 0.05, 8), c, { p: [0.05 + i * 0.07, 0.75, -0.15] });
  });
  for (const s of [-1, 1]) k.b.add(S.box(0.16, 0.008, 0.02), '#b8b8c0', { p: [0.2, 0.745, 0.12], r: [0, s * 0.2, 0] });
  k.b.add(S.torus(0.02, 0.005, 3, 8), '#1a1418', { p: [0.29, 0.745, 0.1], r: [Math.PI / 2, 0, 0] });
  // pano de capa preta sobre o tampo, caindo pela borda da frente
  k.b.add(S.box(0.42, 0.01, 0.3), '#16121c', { p: [-0.08, 0.745, 0.1] });
  k.d.add(new THREE.PlaneGeometry(0.42, 0.34).translate(0, -0.17, 0), '#16121c', { p: [-0.08, 0.745, 0.255], r: [0.08, 0, 0] });
}

/** mesa da festa dos morcegos: bolo de três andares com cobertura vermelha, taças e pratinhos */
export function partyTable(k, rng) {
  table(k, { w: 1.2, d: 0.8, h: 0.78, wood: '#4a3426', cloth: '#e8dce0', legs: 'square' });
  const cols = ['#3a1a2a', '#e8dce0', '#3a1a2a'];
  for (let i = 0; i < 3; i++) {
    const r = 0.22 - i * 0.06;
    k.b.add(S.cylB(r, r, 0.12, 16), cols[i], { p: [0, 0.8 + i * 0.12, 0] });
    k.b.add(S.torus(r, 0.02, 4, 16), '#b0102a', { p: [0, 0.92 + i * 0.12, 0], r: [Math.PI / 2, 0, 0] });
  }
  // fatia faltando e morceguinho de açúcar no topo
  k.b.add(S.box(0.1, 0.13, 0.12), '#e8dce0', { p: [0.3, 0.87, 0.18], r: [0, 0.5, 0] });
  k.b.add(S.sphere(0.03, 6, 5), '#1a1014', { p: [0, 1.2, 0] });
  for (const e of [-1, 1]) k.b.add(S.cone(0.04, 0.09, 3), '#1a1014', { p: [e * 0.05, 1.21, 0], r: [0, 0, e * 1.3] });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.4;
    k.b.add(S.cyl(0.08, 0.08, 0.01, 12), '#f0e8f0', { p: [Math.cos(a) * 0.42, 0.79, Math.sin(a) * 0.3] });
    if (i % 2) k.b.add(S.lathe([[0.001, 0], [0.04, 0], [0.01, 0.02], [0.01, 0.1], [0.045, 0.14], [0.05, 0.2], [0.001, 0.12]], 8), '#b8c8d8', { p: [Math.cos(a) * 0.36, 0.79, Math.sin(a) * 0.2 - 0.1] });
    else k.b.add(S.lathe([[0.001, 0], [0.04, 0], [0.01, 0.02], [0.01, 0.1], [0.045, 0.14], [0.05, 0.2], [0.001, 0.12]], 8), '#b8c8d8', { p: [Math.cos(a) * 0.36, 0.79, Math.sin(a) * 0.2 + 0.1], r: [0, 0, Math.PI / 2 - 0.1] });
  }
  void rng;
}
export function boiler(k, M) {
  k.b.add(S.cylB(0.6, 0.65, 2.0, 14), '#5a4a42');
  for (let i = 0; i < 4; i++) k.b.add(S.torus(0.62, 0.03, 4, 18), '#3a2e2a', { p: [0, 0.3 + i * 0.5, 0], r: [Math.PI / 2, 0, 0] });
  k.b.add(S.box(0.4, 0.34, 0.1), IRON, { p: [0, 0.45, 0.6] });
  k.glow(M.ember).add(S.box(0.3, 0.2, 0.02), '#fff', { p: [0, 0.45, 0.66] });
  k.b.add(S.cylB(0.12, 0.12, 2.0, 8), '#4a3e3a', { p: [0, 2.0, 0] });
  // manômetro
  k.b.add(S.cyl(0.1, 0.1, 0.04, 12), BRASS, { p: [0.3, 1.4, 0.55], r: [Math.PI / 2, 0, 0.3] });
  k.b.add(S.cyl(0.08, 0.08, 0.045, 12), '#f0ecdc', { p: [0.3, 1.4, 0.56], r: [Math.PI / 2, 0, 0.3] });
  return { glow: V3(0, 0.5, 0.7) };
}
export function trunk(k, { col = '#5a3a26', band = BRASS, open = 0 } = {}) {
  const w = 1.0, d = 0.6, h = 0.5;
  k.b.add(S.boxB(w, h, d), col);
  for (const x of [-0.35, 0.35]) k.b.add(S.box(0.06, h + 0.01, d + 0.01), band, { p: [x, h / 2, 0] });
  // tampa abaulada (aberta de "open" radianos)
  const lid = new THREE.CylinderGeometry(d / 2, d / 2, w, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(0);
  const pivotZ = -d / 2;
  if (open) {
    k.b.add(lid, sh(col, 1.15), { p: [0, h + Math.sin(open) * d / 2, pivotZ + Math.cos(open) * d / 2], r: [-open, 0, 0], s: [1, 0.55, 1] });
  } else k.b.add(lid, sh(col, 1.15), { p: [0, h, 0], s: [1, 0.55, 1] });
  k.b.add(S.box(0.12, 0.14, 0.03), band, { p: [0, h - 0.05, d / 2 + 0.01] });
}
export function rockingHorse(k) {
  for (const s of [-1, 1]) k.b.add(S.torus(0.8, 0.03, 4, 16, Math.PI * 0.5), '#6a4a32', { p: [0, 0.8, s * 0.18], r: [0, 0, Math.PI * 1.25] });
  k.b.add(S.capsule(0.18, 0.6, 3, 8), '#e8dcc8', { p: [0, 0.62, 0], r: [0, 0, Math.PI / 2] });
  k.b.add(S.capsule(0.1, 0.34, 3, 8), '#e8dcc8', { p: [0.45, 0.85, 0], r: [0, 0, -0.6] });
  k.b.add(S.box(0.3, 0.14, 0.16), '#e8dcc8', { p: [0.62, 0.98, 0], r: [0, 0, -0.3] });
  for (const [x, z] of [[-0.3, -0.12], [-0.3, 0.12], [0.3, -0.12], [0.3, 0.12]]) k.b.add(S.cyl(0.035, 0.03, 0.42, 5), '#e8dcc8', { p: [x, 0.35, z], r: [0, 0, x * 0.4] });
  for (let i = 0; i < 6; i++) k.b.add(S.box(0.05, 0.2, 0.04), '#3a2a2a', { p: [0.4 - i * 0.06, 0.98 - i * 0.04, 0], r: [0, 0, 0.6] });
  k.b.add(S.sphere(0.025, 5, 4), '#1a1418', { p: [0.66, 1.02, 0.08] });
}
export function mannequin(k, { cape = '#2a1a3a' } = {}) {
  k.b.add(S.cylB(0.2, 0.24, 0.05, 10), '#5a3a26');
  k.b.add(S.cylB(0.025, 0.025, 1.0, 5), '#5a3a26', { p: [0, 0.05, 0] });
  k.b.add(S.lathe([[0.001, 0], [0.18, 0.02], [0.2, 0.2], [0.16, 0.4], [0.22, 0.62], [0.12, 0.72], [0.001, 0.74]], 12), '#c8b8a0', { p: [0, 1.0, 0], s: [1, 1, 0.75] });
  k.d.add(new THREE.ConeGeometry(0.42, 1.2, 12, 1, true, Math.PI * 0.4, Math.PI * 1.2), cape, { p: [0, 1.15, -0.02] });
}
/** móvel coberto por um lençol (vira "fantasma") */
export function sheetCovered(k, { w = 1.0, h = 1.2, d = 0.7, col = '#d8d4dc' } = {}) {
  const g = new THREE.BoxGeometry(w, h, d, Math.max(8, Math.round(w * 14)), 8, Math.max(6, Math.round(d * 14)));
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = (h / 2 - y) / h; // 0 no tampo, 1 no chão
    const flare = 1 + t * t * 0.22 + (t > 0.9 ? (t - 0.9) * 1.2 : 0);
    // pregas verticais: mais fundas embaixo, onde o pano cai solto
    const fold = (Math.sin(x * 17 + z * 3) * 0.6 + Math.sin(z * 15 - x * 4) * 0.4) * 0.035 * (0.2 + t);
    const nx = Math.abs(x) > w / 2 - 0.001 ? Math.sign(x) : 0, nz = Math.abs(z) > d / 2 - 0.001 ? Math.sign(z) : 0;
    const sag = y > h / 2 - 0.001 ? -0.05 * (1 - (2 * x / w) ** 2) * (1 - (2 * z / d) ** 2) + Math.sin(x * 6) * 0.02 : 0;
    p.setXYZ(i, x * flare + fold * (nx || 0.3), y + sag, z * flare + fold * (nz || 0.3));
  }
  g.computeVertexNormals();
  k.b.add(g, col, { p: [0, h / 2, 0] });
  // bainha arrastando no chão
  k.b.add(S.box(w * 1.28, 0.02, d * 1.28), sh(col, 0.9), { p: [0, 0.01, 0] });
}
export function birdcage(k) {
  k.b.add(S.cylB(0.22, 0.22, 0.04, 12), BRASS);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    k.b.add(S.tube([V3(Math.cos(a) * 0.21, 0.04, Math.sin(a) * 0.21), V3(Math.cos(a) * 0.21, 0.5, Math.sin(a) * 0.21), V3(0, 0.72, 0)], 0.005, 3, { segments: 8 }), BRASS);
  }
  k.b.add(S.torus(0.05, 0.01, 3, 8), BRASS, { p: [0, 0.76, 0], r: [0, Math.PI / 2, 0] });
  k.b.add(S.cyl(0.004, 0.004, 0.36, 3), BRASS, { p: [0, 0.25, 0], r: [0, 0, Math.PI / 2] });
  // esqueletinho de passarinho no poleiro
  k.b.add(S.sphere(0.04, 6, 5), PAL.bone, { p: [0, 0.3, 0] });
  k.b.add(S.cone(0.012, 0.04, 3), '#d8b04a', { p: [0.04, 0.3, 0], r: [0, 0, -Math.PI / 2] });
}
/** morcego dormindo de cabeça para baixo (pendurado em y = 0) */
export function hangingBat(k, s = 1) {
  k.b.add(S.cyl(0.005, 0.005, 0.06, 3), '#1a1418', { p: [0, -0.03 * s, 0] });
  k.b.add(S.sphere(0.07, 8, 6), '#1e1826', { p: [0, -0.14 * s, 0], s: [s, 1.5 * s, s] });
  k.b.add(S.sphere(0.045, 7, 5), '#241e2c', { p: [0, -0.26 * s, 0.01], s: [s, s, s] });
  for (const e of [-1, 1]) k.b.add(S.cone(0.018, 0.05, 3), '#241e2c', { p: [e * 0.025 * s, -0.31 * s, 0], r: [Math.PI, 0, 0], s: [s, s, s] });
  // asas dobradas envolvendo o corpo
  for (const e of [-1, 1]) k.b.add(S.sphere(0.06, 6, 5), '#140f1a', { p: [e * 0.045 * s, -0.15 * s, 0.01], s: [0.5 * s, 1.5 * s, 0.9 * s] });
}
export function partyHat(k, col = '#e8b020') {
  k.b.add(S.cone(0.08, 0.22, 8), col, { p: [0, 0.11, 0] });
  k.b.add(S.sphere(0.025, 6, 5), '#ff4a8a', { p: [0, 0.23, 0] });
  k.b.add(S.torus(0.08, 0.008, 3, 10), '#ff4a8a', { p: [0, 0.01, 0], r: [Math.PI / 2, 0, 0] });
}
export function bloodFridge(k, M) {
  k.b.add(S.boxB(0.9, 1.8, 0.7), '#e8e4e0');
  k.b.add(S.box(0.86, 1.1, 0.03), '#f0ece8', { p: [0, 1.15, 0.36] });
  k.b.add(S.box(0.86, 0.55, 0.03), '#f0ece8', { p: [0, 0.35, 0.36] });
  for (const y of [1.15, 0.45]) k.b.add(S.box(0.06, 0.3, 0.05), '#b8b4b0', { p: [0.35, y, 0.4] });
  k.b.add(S.box(0.9, 0.08, 0.72), '#d8d4d0', { p: [0, 1.84, 0] });
  label(k, M, 21, 0.44, 0.22, { p: [0, 1.5, 0.376] });
  // bolsinhas de sangue penduradas por fora com pregador (festa de ontem)
  for (let i = 0; i < 3; i++) k.glow(M.bloodGlow).add(S.box(0.12, 0.18, 0.03), '#fff', { p: [-0.3 + i * 0.15, 0.95, 0.39] });
}
export function banner(k, M, w = 3) {
  // bandeirinhas e faixa "FESTA DOS MORCEGOS" (meio rasgada)
  const cols = ['#e8b020', '#ff4a8a', '#6a2a8a', '#4ab8e8'];
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    const x = -w / 2 + t * w, y = -Math.sin(t * Math.PI) * 0.35;
    k.d.add(new THREE.ConeGeometry(0.12, 0.26, 3), cols[i % 4], { p: [x, y - 0.12, 0], r: [Math.PI, 0, 0], s: [1, 1, 0.1] });
  }
  label(k, M, 10, 1.2, 0.6, { p: [0, -0.7, 0.02], r: [0, 0, 0.12] });
}
export function confetti(k, rng, n, rx, rz) {
  const cols = ['#e8b020', '#ff4a8a', '#6a2a8a', '#4ab8e8', '#9aff5a'];
  for (let i = 0; i < n; i++) k.b.add(S.box(0.03, 0.004, 0.03), rng.pick(cols), { p: [rng.range(-rx, rx), 0.006, rng.range(-rz, rz)], r: [0, rng.range(0, TAU), 0] });
}
export { clamp };
