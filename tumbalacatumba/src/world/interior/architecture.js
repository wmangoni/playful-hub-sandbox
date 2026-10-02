// Estrutura da mansão: pisos, forros, paredes com portas e janelas, escadas, patamar e telhado do sótão.
// Também gera o que a física precisa: superfícies de piso, forros e colisores (em coordenadas do mundo).
import * as THREE from 'three';
import { S } from '../../render/builder.js';
import { PAL } from '../props/palette.js';
import { RNG } from '../../util/rng.js';
import { clamp, TAU } from '../../util/math.js';
import { uvPlane } from './kit.js';
import { rugUV } from './textures.js';
import {
  INTERIOR, WALL_T, LV, ROOMS, ROOM, DOORS, WINDOWS, STAIRS, LANDING, HOLES, roomTop, atticRoofY, ATTIC_RIDGE,
} from './plan.js';

const T = WALL_T;
const HT = T / 2;
const _c = new THREE.Color();
const shade = (hex, k) => _c.set(hex).multiplyScalar(k).clone();

const WALL_MAT = { damask: 'damask', stripes: 'stripes', plaster: 'plaster', panel: 'woodPanel', tileBath: 'tileBath', stone: 'stone', planks: 'planks' };
const TRIM = {
  saguao: '#3a2230', jantar: '#3e2418', estar: '#2e2a22', cozinha: '#5a4632', musica: '#3a2a1a',
  biblioteca: '#2e1c12', quarto: '#2a1418', banheiro: '#e8e0d8', cripta: '#4a4652', lavanderia: '#4e4844', adega: '#4a3e3a', sotao: '#4a3828',
};
const CURTAIN = { saguao: '#4a1a4a', jantar: '#6a1420', estar: '#1e4a3e', musica: '#5a3a12', biblioteca: '#3a2a1a', quarto: '#5a0e1a', cozinha: '#8a7a5a' };

/** faces das paredes internas de um cômodo (u corre ao longo da parede, olhando de dentro) */
function roomFaces(r) {
  const y = LV[r.level].y;
  return [
    { edge: 'n', axis: 'z', at: r.z0, L: r.x1 - r.x0 - T, o: [r.x0 + HT, y, r.z0 + HT], ry: 0, u: (c) => c - (r.x0 + HT) },
    { edge: 's', axis: 'z', at: r.z1, L: r.x1 - r.x0 - T, o: [r.x1 - HT, y, r.z1 - HT], ry: Math.PI, u: (c) => r.x1 - HT - c },
    { edge: 'w', axis: 'x', at: r.x0, L: r.z1 - r.z0 - T, o: [r.x0 + HT, y, r.z1 - HT], ry: Math.PI / 2, u: (c) => r.z1 - HT - c },
    { edge: 'e', axis: 'x', at: r.x1, L: r.z1 - r.z0 - T, o: [r.x1 - HT, y, r.z0 + HT], ry: -Math.PI / 2, u: (c) => c - (r.z0 + HT) },
  ];
}
/** ponto local da face (u, v, afastamento d) → cômodo */
function facePt(f, u, v, d = 0) {
  const c = Math.cos(f.ry), s = Math.sin(f.ry);
  return [f.o[0] + u * c + d * s, f.o[1] + v, f.o[2] - u * s + d * c];
}
function openingsOn(r, f) {
  const y = LV[r.level].y;
  const out = [];
  for (const d of DOORS) {
    if (d.axis !== f.axis || Math.abs(d.at - f.at) > 0.01 || !d.rooms.includes(r.id)) continue;
    out.push({ kind: 'door', d, u0: f.u(d.c) - d.w / 2, u1: f.u(d.c) + d.w / 2, v0: d.y0 - y, v1: d.y0 - y + d.h, arch: d.arch, w: d.w, closed: d.closed });
  }
  for (const w of WINDOWS) {
    if (w.room !== r.id || w.axis !== f.axis || Math.abs(w.at - f.at) > 0.01) continue;
    out.push({ kind: 'win', win: w, u0: f.u(w.c) - w.w / 2, u1: f.u(w.c) + w.w / 2, v0: w.y - y, v1: w.y - y + w.h, round: w.kind === 'round' || w.kind === 'rose', w: w.w });
  }
  return out;
}
/** caminho do buraco (retângulo, arco ou círculo) no espaço (u,v) da face */
function holePath(o) {
  const p = new THREE.Path();
  if (o.round) {
    const r = o.w / 2, cu = (o.u0 + o.u1) / 2, cv = (o.v0 + o.v1) / 2;
    p.absarc(cu, cv, r, 0, TAU, true);
    return p;
  }
  p.moveTo(o.u0, o.v0);
  if (o.arch) {
    const r = (o.u1 - o.u0) / 2, spring = o.v1 - r;
    p.lineTo(o.u0, spring);
    p.absarc(o.u0 + r, spring, r, Math.PI, 0, true);
    p.lineTo(o.u1, o.v0);
  } else {
    p.lineTo(o.u0, o.v1);
    p.lineTo(o.u1, o.v1);
    p.lineTo(o.u1, o.v0);
  }
  p.lineTo(o.u0, o.v0);
  return p;
}
/** intervalos [a,b] ao longo de u que não cruzam aberturas que alcançam a altura v */
function freeSpans(L, openings, v, pad = 0.02) {
  let spans = [[0, L]];
  for (const o of openings) {
    if (v < o.v0 - 0.01 || v > o.v1 + 0.01) continue;
    const a = o.u0 - pad, b = o.u1 + pad;
    const next = [];
    for (const [s0, s1] of spans) {
      if (b <= s0 || a >= s1) next.push([s0, s1]);
      else {
        if (a > s0) next.push([s0, a]);
        if (b < s1) next.push([b, s1]);
      }
    }
    spans = next;
  }
  return spans.filter(([a, b]) => b - a > 0.05);
}

// ---------------------------------------------------------------------------
export class Architecture {
  constructor(indoors, kits, M) {
    this.io = indoors;
    this.kits = kits; // id do cômodo → IKit
    this.M = M;
    this.rng = new RNG(1703);
    this.surfaces = []; // pisos: {x0,x1,z0,z1,y,level} | rampas {ramp}
    this.ceilings = []; // forros: {x0,x1,z0,z1,y,holes}
    this.windowInfo = []; // janelas (para fachos de luz): {pos, n, w, h, room, kind}
    this.doorInfo = {};
    this.colliders = indoors.game.world.colliders;
  }

  // colisor em coordenadas locais → mundo
  box(cx, cz, hw, hd, y0, y1, camera = true) {
    this.colliders.addBox(INTERIOR.x + cx, INTERIOR.z + cz, hw, hd, 0, { y0: INTERIOR.y + y0, y1: INTERIOR.y + y1, camera });
  }
  circle(cx, cz, r, y0, y1) {
    this.colliders.addCircle(INTERIOR.x + cx, INTERIOR.z + cz, r, { y0: INTERIOR.y + y0, y1: INTERIOR.y + y1 });
  }

  build() {
    for (const r of ROOMS) {
      if (r.level === 'A') continue;
      this.floor(r);
      this.ceiling(r);
      for (const f of roomFaces(r)) this.wallFace(r, f);
    }
    this.doorways();
    this.stairs();
    this.landing();
    this.attic();
    this.wallColliders();
    this.physics();
  }

  // ------------------------------------------------------------ pisos e forros
  floor(r) {
    const k = this.kits[r.id], y = LV[r.level].y;
    const shape = new THREE.Shape([new THREE.Vector2(r.x0, -r.z0), new THREE.Vector2(r.x1, -r.z0), new THREE.Vector2(r.x1, -r.z1), new THREE.Vector2(r.x0, -r.z1)]);
    for (const h of HOLES[r.level] ?? []) {
      if (h.x1 <= r.x0 || h.x0 >= r.x1 || h.z1 <= r.z0 || h.z0 >= r.z1) continue;
      shape.holes.push(new THREE.Path([new THREE.Vector2(h.x0, -h.z0), new THREE.Vector2(h.x0, -h.z1), new THREE.Vector2(h.x1, -h.z1), new THREE.Vector2(h.x1, -h.z0)]));
    }
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(-Math.PI / 2);
    const tint = r.floor === 'parquet' ? '#d8c8b8' : r.floor === 'stone' ? '#b8b0b8' : '#ffffff';
    k.tex(this.M[r.floor]).add(g, tint, { p: [0, y + 0.002, 0] });
  }
  ceiling(r) {
    const k = this.kits[r.id], top = roomTop(r);
    const up = r.level === 'B' ? 'G' : r.level === 'G' ? (r.id === 'saguao' ? 'A' : 'U') : 'A';
    const shape = new THREE.Shape([new THREE.Vector2(r.x0, r.z0), new THREE.Vector2(r.x1, r.z0), new THREE.Vector2(r.x1, r.z1), new THREE.Vector2(r.x0, r.z1)]);
    const holes = [];
    for (const h of HOLES[up] ?? []) {
      if (h.x1 <= r.x0 || h.x0 >= r.x1 || h.z1 <= r.z0 || h.z0 >= r.z1) continue;
      holes.push(h);
      shape.holes.push(new THREE.Path([new THREE.Vector2(h.x0, h.z0), new THREE.Vector2(h.x0, h.z1), new THREE.Vector2(h.x1, h.z1), new THREE.Vector2(h.x1, h.z0)]));
    }
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(Math.PI / 2);
    const col = r.level === 'B' ? '#6a6272' : r.id === 'biblioteca' ? '#5a3a28' : r.id === 'cozinha' ? '#c8bca8' : '#d8cec4';
    const mat = r.level === 'B' ? this.M.stone : r.id === 'biblioteca' ? this.M.woodPanel : this.M.plaster;
    k.tex(mat).add(g, col, { p: [0, top - 0.002, 0] });
    this.ceilings.push({ x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1, y: top, holes });
    // vigas / caixotões
    const trim = TRIM[r.id];
    const w = r.x1 - r.x0, d = r.z1 - r.z0;
    if (r.level === 'B') {
      // abóbadas de tijolo: arcos a cada 3 m
      for (let z = r.z0 + 3; z < r.z1 - 1; z += 3) {
        k.b.add(new THREE.CylinderGeometry(w / 2 - HT, w / 2 - HT, 0.5, 14, 1, true, -Math.PI / 2, Math.PI), shade(PAL.brick, 0.9), {
          p: [(r.x0 + r.x1) / 2, top - (w / 2 - HT) * 0.28, z], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.28],
        });
      }
    } else if (r.id === 'biblioteca' || r.id === 'cozinha' || r.id === 'sotao') {
      for (let x = r.x0 + 1.4; x < r.x1 - 0.5; x += 2.2) k.b.add(S.box(0.26, 0.32, d - T), shade(trim, 1.25), { p: [x, top - 0.16, (r.z0 + r.z1) / 2] });
    } else if (r.id === 'saguao') {
      // caixotões no teto alto do saguão
      for (let x = r.x0 + 1.25; x < r.x1; x += 2.5) {
        for (let z = r.z0 + 1.25; z < r.z1; z += 2.5) {
          k.b.add(S.box(2.1, 0.08, 2.1), '#b8a8c0', { p: [x, top - 0.04, z] });
          k.b.add(S.box(1.6, 0.05, 1.6), '#c8bcd0', { p: [x, top - 0.1, z] });
          k.b.add(S.sphere(0.09, 8, 6), '#c8a84a', { p: [x, top - 0.13, z] });
        }
      }
      for (let x = r.x0 + 2.5; x < r.x1 - 0.1; x += 2.5) k.b.add(S.box(0.2, 0.22, d - T), shade(trim, 1.4), { p: [x, top - 0.11, (r.z0 + r.z1) / 2] });
      for (let z = r.z0 + 2.5; z < r.z1 - 0.1; z += 2.5) k.b.add(S.box(w - T, 0.22, 0.2), shade(trim, 1.4), { p: [(r.x0 + r.x1) / 2, top - 0.11, z] });
    } else {
      // medalhão de gesso no centro
      const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
      k.b.add(S.cyl(0.9, 1.0, 0.06, 20), '#e0d6cc', { p: [cx, top - 0.03, cz] });
      k.b.add(S.torus(0.75, 0.05, 5, 20), '#c8b8a8', { p: [cx, top - 0.07, cz], r: [Math.PI / 2, 0, 0] });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        k.b.add(S.sphere(0.12, 6, 5), '#d8ccc0', { p: [cx + Math.cos(a) * 0.55, top - 0.06, cz + Math.sin(a) * 0.55], s: [1, 0.35, 1] });
      }
    }
  }

  // ------------------------------------------------------------ paredes
  wallFace(r, f) {
    const k = this.kits[r.id];
    const H = roomTop(r) - LV[r.level].y;
    const op = openingsOn(r, f);
    // parede com buracos reais (portas em arco, janelas redondas)
    const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(f.L, 0), new THREE.Vector2(f.L, H), new THREE.Vector2(0, H)]);
    for (const o of op) shape.holes.push(holePath(o));
    const g = new THREE.ShapeGeometry(shape, 8);
    const [ox, oy, oz] = f.o;
    const matName = WALL_MAT[r.wall] ?? 'plaster';
    k.tex(this.M[matName]).add(g, r.tint, { p: [ox, oy, oz], r: [0, f.ry, 0] });
    const trim = TRIM[r.id];
    // rodapé, lambri, roda-meio, roda-teto
    if (r.level !== 'B' && r.level !== 'A') {
      for (const [a, b] of freeSpans(f.L, op, 0.12)) {
        const len = b - a, mid = (a + b) / 2;
        k.b.add(S.box(len, 0.22, 0.05), trim, { p: facePt(f, mid, 0.11, 0.025), r: [0, f.ry, 0] });
      }
      if (r.wains === 'wood') {
        const wh = r.id === 'saguao' ? 1.35 : 1.1;
        for (const [a, b] of freeSpans(f.L, op, wh * 0.5)) {
          const len = b - a, mid = (a + b) / 2;
          k.b.add(S.box(len, wh - 0.22, 0.03), shade(trim, 1.3), { p: facePt(f, mid, 0.22 + (wh - 0.22) / 2, 0.015), r: [0, f.ry, 0] });
          const n = Math.max(1, Math.round(len / 0.95));
          for (let i = 0; i < n; i++) {
            const u = a + ((i + 0.5) * len) / n;
            k.b.add(S.box(len / n - 0.18, wh - 0.6, 0.04), shade(trim, 1.55), { p: facePt(f, u, 0.22 + (wh - 0.22) / 2, 0.035), r: [0, f.ry, 0] });
          }
        }
        for (const [a, b] of freeSpans(f.L, op, wh)) k.b.add(S.box(b - a, 0.08, 0.07), trim, { p: facePt(f, (a + b) / 2, wh, 0.035), r: [0, f.ry, 0] });
      } else if (r.wains === 'tile') {
        for (const [a, b] of freeSpans(f.L, op, 0.7)) {
          const len = b - a;
          k.tex(this.M.tile).add(uvPlane(len, 1.3, 1), '#e8e0d0', { p: facePt(f, (a + b) / 2, 0.87, 0.02), r: [0, f.ry, 0] });
          k.b.add(S.box(len, 0.06, 0.05), '#5a7a6a', { p: facePt(f, (a + b) / 2, 1.53, 0.03), r: [0, f.ry, 0] });
        }
      }
      for (const [a, b] of freeSpans(f.L, op, H - 0.2)) {
        k.b.add(S.box(b - a, 0.14, 0.12), shade(trim, 1.1), { p: facePt(f, (a + b) / 2, H - 0.07, 0.06), r: [0, f.ry, 0] });
        k.b.add(S.box(b - a, 0.06, 0.2), shade(trim, 1.3), { p: facePt(f, (a + b) / 2, H - 0.17, 0.1), r: [0, f.ry, 0] });
      }
      // no saguão, uma cinta na altura do patamar
      if (r.id === 'saguao') for (const [a, b] of freeSpans(f.L, op, LV.U.y - 0.2)) k.b.add(S.box(b - a, 0.3, 0.14), shade(trim, 1.2), { p: facePt(f, (a + b) / 2, LV.U.y - 0.2, 0.07), r: [0, f.ry, 0] });
    } else if (r.level === 'B') {
      // pilares de pedra a cada 3 m
      for (let u = 1.5; u < f.L - 0.5; u += 3) {
        if (op.some((o) => u > o.u0 - 0.4 && u < o.u1 + 0.4)) continue;
        k.b.add(S.box(0.5, H, 0.22), '#6a6474', { p: facePt(f, u, H / 2, 0.11), r: [0, f.ry, 0] });
      }
    }
    // janelas desta face
    for (const o of op) if (o.kind === 'win') this.windowAt(r, f, o);
  }

  windowAt(r, f, o) {
    const k = this.kits[r.id];
    const w = o.win;
    const cu = (o.u0 + o.u1) / 2, cv = (o.v0 + o.v1) / 2;
    const trim = w.kind === 'grate' ? PAL.iron : TRIM[r.id] === '#e8e0d8' ? '#c8c0b8' : shade(TRIM[r.id], 1.6);
    const n = [Math.sin(f.ry), 0, Math.cos(f.ry)];
    const world = facePt(f, cu, cv, 0);
    // vista (céu de dia/noite) do lado de fora do vão
    const back = -T - 0.02;
    if (w.kind === 'rose') {
      k.glow(this.M.rose).addRaw(new THREE.CircleGeometry(o.w / 2 + 0.02, 40), { p: facePt(f, cu, cv, back + 0.08), r: [0, f.ry, 0] });
      k.glow(this.M.viewNight).addRaw(new THREE.CircleGeometry(o.w / 2 + 0.05, 28), { p: facePt(f, cu, cv, back), r: [0, f.ry, 0] });
      k.b.add(S.torus(o.w / 2 + 0.06, 0.12, 6, 40), trim, { p: facePt(f, cu, cv, 0.04), r: [0, f.ry, 0] });
      k.b.add(S.torus(o.w / 2 + 0.24, 0.06, 5, 40), shade(TRIM[r.id], 1.2), { p: facePt(f, cu, cv, 0.06), r: [0, f.ry, 0] });
      k.d.add(new THREE.CylinderGeometry(o.w / 2 + 0.02, o.w / 2 + 0.02, T, 32, 1, true), shade(TRIM[r.id], 0.9), { p: facePt(f, cu, cv, -HT), r: [Math.PI / 2, f.ry, 0], order: 'YXZ' });
    } else if (o.round) {
      k.glow(this.M.viewNight).addRaw(new THREE.CircleGeometry(o.w / 2 + 0.05, 24), { p: facePt(f, cu, cv, back), r: [0, f.ry, 0] });
      k.glow(this.M.viewDay).addRaw(new THREE.CircleGeometry(o.w / 2 + 0.05, 24), { p: facePt(f, cu, cv, back - 0.01), r: [0, f.ry, 0] });
      k.b.add(S.torus(o.w / 2 + 0.04, 0.09, 6, 28), trim, { p: facePt(f, cu, cv, 0.03), r: [0, f.ry, 0] });
      k.b.add(S.box(0.06, o.w, 0.06), trim, { p: facePt(f, cu, cv, -0.1), r: [0, f.ry, 0] });
      k.b.add(S.box(o.w, 0.06, 0.06), trim, { p: facePt(f, cu, cv, -0.1), r: [0, f.ry, 0] });
      k.d.add(new THREE.CylinderGeometry(o.w / 2 + 0.02, o.w / 2 + 0.02, T, 24, 1, true), shade(TRIM[r.id] ?? '#4a3a2a', 0.9), { p: facePt(f, cu, cv, -HT), r: [Math.PI / 2, f.ry, 0], order: 'YXZ' });
    } else {
      const ww = o.w, hh = o.v1 - o.v0;
      const view = (mat, dd) => k.glow(mat).addRaw(new THREE.PlaneGeometry(ww + 0.04, hh + 0.04), { p: facePt(f, cu, cv, back - dd), r: [0, f.ry, 0] });
      view(this.M.viewNight, 0);
      view(this.M.viewDay, 0.01);
      // vão (espessura da parede)
      for (const s of [-1, 1]) k.b.add(S.box(0.04, hh, T), shade(trim, 0.8), { p: facePt(f, cu + s * (ww / 2 + 0.02), cv, -HT), r: [0, f.ry, 0] });
      k.b.add(S.box(ww + 0.08, 0.04, T), shade(trim, 0.8), { p: facePt(f, cu, o.v1 + 0.02, -HT), r: [0, f.ry, 0] });
      k.b.add(S.box(ww + 0.08, 0.04, T), shade(trim, 0.7), { p: facePt(f, cu, o.v0 - 0.02, -HT), r: [0, f.ry, 0] });
      if (w.kind === 'grate') {
        for (let i = 1; i < 5; i++) k.b.add(S.cyl(0.02, 0.02, hh, 5), PAL.iron, { p: facePt(f, o.u0 + (i * ww) / 5, cv, -0.08) });
        return;
      }
      // caixilho com moldura, travessas e parapeito
      k.b.add(S.box(ww + 0.3, 0.12, 0.08), trim, { p: facePt(f, cu, o.v1 + 0.08, 0.04), r: [0, f.ry, 0] });
      for (const s of [-1, 1]) k.b.add(S.box(0.12, hh + 0.2, 0.08), trim, { p: facePt(f, cu + s * (ww / 2 + 0.06), cv, 0.04), r: [0, f.ry, 0] });
      k.b.add(S.box(ww + 0.44, 0.08, 0.26), trim, { p: facePt(f, cu, o.v0 - 0.02, 0.1), r: [0, f.ry, 0] });
      k.b.add(S.box(0.05, hh, 0.05), PAL.ink, { p: facePt(f, cu, cv, -0.12), r: [0, f.ry, 0] });
      for (const t of [0.33, 0.66]) k.b.add(S.box(ww, 0.05, 0.05), PAL.ink, { p: facePt(f, cu, o.v0 + hh * t, -0.12), r: [0, f.ry, 0] });
      // bandeira em arco sobre as janelas altas
      k.b.add(S.torus(ww / 2 + 0.02, 0.06, 5, 16, Math.PI), trim, { p: facePt(f, cu, o.v1 + 0.12, 0.04), r: [0, f.ry, 0] });
      // cortinas de veludo com bandô
      const cc = CURTAIN[r.id];
      if (cc) {
        for (const s of [-1, 1]) this.curtain(k, f, cu + s * (ww / 2 + 0.34), o.v1 + 0.35, hh + 0.35 + (o.v0 - 0.05), cc, s);
        k.b.add(S.box(ww + 1.3, 0.3, 0.14), shade(cc, 0.85), { p: facePt(f, cu, o.v1 + 0.45, 0.2), r: [0, f.ry, 0] });
        for (let i = 0; i < 7; i++) k.b.add(S.cone(0.09, 0.18, 4), '#c8a84a', { p: facePt(f, cu - ww / 2 - 0.5 + (i * (ww + 1.0)) / 6, o.v1 + 0.24, 0.27), r: [Math.PI, f.ry, 0] });
      }
    }
    this.windowInfo.push({ pos: world, n, w: o.w, h: o.v1 - o.v0, room: r.id, kind: w.kind, level: r.level });
  }

  /** cortina franzida (plano ondulado), presa por uma braçadeira */
  curtain(k, f, u, vTop, len, col, side) {
    const g = new THREE.PlaneGeometry(0.62, len, 10, 6);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      const t = (len / 2 - y) / len; // 0 em cima, 1 embaixo
      // amarrada no meio: aperta a largura na braçadeira
      const tie = 1 - 0.55 * Math.exp(-((t - 0.62) ** 2) * 40);
      p.setX(i, x * tie - side * 0.1 * (1 - tie));
      p.setZ(i, Math.sin(x * 26 + t * 2) * 0.05 + 0.04);
    }
    g.computeVertexNormals();
    const c0 = new THREE.Color(col), c1 = c0.clone().multiplyScalar(0.65);
    k.d.add(g, (x) => _c.copy(c0).lerp(c1, 0.5 + 0.5 * Math.sin(x * 26)), { p: facePt(f, u, vTop - len / 2, 0.14), r: [0, f.ry, 0] });
    k.b.add(S.torus(0.08, 0.025, 4, 10), '#c8a84a', { p: facePt(f, u - side * 0.08, vTop - len * 0.62, 0.2), r: [0, f.ry, 0] });
  }

  // ------------------------------------------------------------ portas (vãos, batentes, folhas)
  doorways() {
    for (const d of DOORS) {
      const r = ROOM[d.rooms[0]];
      const k = this.kits[r.id];
      const trim = shade(TRIM[r.id], 1.2);
      const along = d.axis === 'x' ? 'z' : 'x';
      // posição local: centro do vão
      const px = d.axis === 'x' ? d.at : d.c, pz = d.axis === 'x' ? d.c : d.at;
      const ry = d.axis === 'x' ? Math.PI / 2 : 0;
      const put = (lx, ly, lz) => {
        // lx ao longo da parede, lz atravessando
        const c = Math.cos(ry), s = Math.sin(ry);
        return [px + lx * c + lz * s, d.y0 + ly, pz - lx * s + lz * c];
      };
      const spring = d.arch ? d.h - d.w / 2 : d.h;
      for (const s of [-1, 1]) {
        k.b.add(S.box(0.06, spring, T + 0.02), shade(trim, 0.75), { p: put(s * (d.w / 2 + 0.03), spring / 2, 0), r: [0, ry, 0] });
        // alizares nos dois lados
        for (const face of [-1, 1]) k.b.add(S.box(0.16, spring + (d.arch ? 0 : 0.1), 0.06), trim, { p: put(s * (d.w / 2 + 0.08), (spring + (d.arch ? 0 : 0.1)) / 2, face * (HT + 0.03)), r: [0, ry, 0] });
      }
      if (d.arch) {
        const R = d.w / 2;
        // meio cilindro (a metade de cima) atravessando a parede: o intradorso do arco
        k.d.add(new THREE.CylinderGeometry(R + 0.03, R + 0.03, T + 0.02, 18, 1, true, Math.PI / 2, Math.PI), shade(trim, 0.75), {
          p: put(0, spring, 0), r: [Math.PI / 2, ry, 0], order: 'YXZ',
        });
        for (const face of [-1, 1]) {
          k.b.add(S.torus(R + 0.1, 0.07, 5, 18, Math.PI), trim, { p: put(0, spring, face * (HT + 0.03)), r: [0, ry, 0] });
          k.b.add(S.box(0.2, 0.3, 0.1), shade(trim, 1.2), { p: put(0, d.h + 0.08, face * (HT + 0.05)), r: [0, ry, 0] });
        }
      } else {
        k.b.add(S.box(d.w + 0.12, 0.06, T + 0.02), shade(trim, 0.75), { p: put(0, d.h + 0.03, 0), r: [0, ry, 0] });
        for (const face of [-1, 1]) k.b.add(S.box(d.w + 0.4, 0.18, 0.07), trim, { p: put(0, d.h + 0.1, face * (HT + 0.035)), r: [0, ry, 0] });
      }
      // soleira
      k.b.add(S.box(d.w + 0.06, 0.03, T + 0.1), shade(trim, 0.6), { p: put(0, 0.015, 0), r: [0, ry, 0] });
      this.doorInfo[d.id] = { pos: put(0, 0, 0), ry, d };
      if (d.closed) this.frontDoor(k, d, put, ry);
      else if (d.gate) this.gate(k, d, put, ry);
      else if (!d.arch) this.openLeaf(k, d, put, ry, TRIM[r.id]);
    }
  }
  /** porta dupla da frente (fechada, é por ela que se sai) */
  frontDoor(k, d, put, ry) {
    const wood = '#3a1e2a';
    const spring = d.h - d.w / 2;
    for (const s of [-1, 1]) {
      const cx = s * d.w / 4;
      k.b.add(S.box(d.w / 2 - 0.02, spring, 0.12), wood, { p: put(cx, spring / 2, -0.02), r: [0, ry, 0] });
      for (const [v, h] of [[0.9, 1.1], [2.1, 0.9]]) k.b.add(S.box(d.w / 2 - 0.3, h, 0.05), shade(wood, 1.3), { p: put(cx, v, -0.1), r: [0, ry, 0] });
      k.b.add(S.torus(0.09, 0.02, 4, 12), '#c8a84a', { p: put(s * 0.18, 1.35, -0.12), r: [0, ry, 0] });
      k.b.add(S.sphere(0.05, 8, 6), '#c8a84a', { p: put(s * 0.18, 1.45, -0.13) });
    }
    k.b.add(new THREE.CircleGeometry(d.w / 2, 18, 0, Math.PI), wood, { p: put(0, spring, -0.03), r: [0, ry + Math.PI, 0] });
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (0.1 + (i / 4) * 0.8);
      k.b.add(S.box(0.04, d.w / 2 - 0.1, 0.04), '#c8a84a', { p: put(Math.cos(a) * d.w * 0.22, spring + Math.sin(a) * d.w * 0.22, -0.08), r: [0, ry, a - Math.PI / 2] });
    }
    // aldrava de morcego e dobradiças de ferro
    k.b.add(S.box(0.4, 0.14, 0.04), PAL.iron, { p: put(0, 2.6, -0.1), r: [0, ry, 0] });
    for (const s of [-1, 1]) for (const v of [0.5, 1.6, 2.6]) k.b.add(S.box(0.4, 0.07, 0.03), PAL.iron, { p: put(s * (d.w / 2 - 0.22), v, -0.1), r: [0, ry, 0] });
  }
  /** folha de porta aberta encostada na parede */
  openLeaf(k, d, put, ry, trim) {
    const wood = shade(trim, 1.4);
    const h = d.h - 0.04;
    // dobradiça num batente; a folha abre ~77° para o lado -lz e fica quase encostada na parede
    const phi = 1.35;
    const dl = [Math.cos(phi), -Math.sin(phi)];
    const lx = -d.w / 2 + dl[0] * (d.w / 2), lz = -HT - 0.04 + dl[1] * (d.w / 2);
    const c = Math.cos(ry), s = Math.sin(ry);
    const wx = dl[0] * c + dl[1] * s, wz = -dl[0] * s + dl[1] * c;
    const psi = Math.atan2(-wz, wx);
    const [cx, , cz] = put(lx, 0, lz);
    k.b.add(S.box(d.w - 0.04, h, 0.06), wood, { p: [cx, d.y0 + h / 2, cz], r: [0, psi, 0] });
    for (const v of [0.72, 0.28]) k.b.add(S.box(d.w - 0.35, h * 0.35, 0.09), shade(wood, 1.25), { p: [cx, d.y0 + h * v, cz], r: [0, psi, 0] });
    const [hx, , hz] = put(lx + dl[0] * (d.w * 0.4), 0, lz + dl[1] * (d.w * 0.4));
    k.b.add(S.sphere(0.05, 6, 5), '#c8a84a', { p: [hx, d.y0 + 1.05, hz], s: [1, 1, 2.2] });
  }
  /** portão de ferro aberto da cripta */
  gate(k, d, put, ry) {
    for (const sd of [-1, 1]) {
      const a = sd * 1.25;
      const hx = put(sd * (d.w / 2), 0, -HT - 0.05);
      const lw = d.w / 2;
      for (let i = 0; i <= 6; i++) {
        const t = (i / 6) * lw;
        const x = hx[0] - Math.cos(ry + a) * t * sd, z = hx[2] + Math.sin(ry + a) * t * sd;
        const hh = d.h - 0.3 - Math.sin((i / 6) * Math.PI) * 0.2;
        k.b.add(S.cyl(0.025, 0.025, hh, 5), PAL.iron, { p: [x, d.y0 + hh / 2, z] });
        k.b.add(S.cone(0.05, 0.14, 4), PAL.iron, { p: [x, d.y0 + hh + 0.07, z] });
      }
      for (const v of [0.3, 1.4, d.h - 0.6]) {
        const mx = hx[0] - Math.cos(ry + a) * lw * 0.5 * sd, mz = hx[2] + Math.sin(ry + a) * lw * 0.5 * sd;
        k.b.add(S.box(lw, 0.05, 0.04), PAL.iron, { p: [mx, d.y0 + v, mz], r: [0, ry + a, 0] });
      }
    }
  }

  // ------------------------------------------------------------ escadas
  stairs() {
    for (const st of STAIRS) {
      const owner = st.id === 'grande' ? 'saguao' : st.id === 'sotao' ? 'biblioteca' : 'cozinha';
      const k = this.kits[owner];
      const len = Math.abs(st.to - st.from), rise = st.y1 - st.y0;
      const n = Math.round(Math.abs(rise) / 0.22);
      const dir = Math.sign(st.to - st.from);
      const width = st.a1 - st.a0, am = (st.a0 + st.a1) / 2;
      const tread = len / n;
      const P = (s, a, y) => (st.along === 'z' ? [a, y, s] : [s, y, a]);
      const ry = st.along === 'z' ? 0 : Math.PI / 2;
      const woodC = st.id === 'porao' ? '#5a4a3e' : st.id === 'sotao' ? '#5a3a26' : '#3e2230';
      // degraus: espelho + piso (desce do y0 para o y1)
      for (let i = 0; i < n; i++) {
        const s0 = st.from + dir * i * tread;
        const yTop = st.y0 + (rise * (i + 1)) / n;
        const yBot = st.y0 + (rise * i) / n;
        const hi = Math.max(yTop, yBot), lo = Math.min(yTop, yBot);
        const sm = s0 + dir * tread / 2;
        const step = hi - Math.min(lo, st.y0 + rise * 0) + 0.05;
        const yy = rise > 0 ? yTop : yBot;
        // bloco do degrau até embaixo (a escada é maciça)
        const base = Math.min(st.y0, st.y1);
        const hBlock = Math.max(0.08, yy - base);
        k.b.add(S.box(st.along === 'z' ? width : tread + 0.01, hBlock, st.along === 'z' ? tread + 0.01 : width), shade(woodC, 0.85 + (i % 2) * 0.05), { p: P(sm, am, base + hBlock / 2) });
        k.b.add(S.box(st.along === 'z' ? width + 0.04 : tread + 0.05, 0.05, st.along === 'z' ? tread + 0.05 : width + 0.04), shade(woodC, 1.35), { p: P(sm, am, yy + 0.025) });
        void step;
      }
      // passadeira vermelha com varetas de latão (só na escadaria grande)
      if (st.id === 'grande') {
        const cw = width * 0.62;
        for (let i = 0; i < n; i++) {
          const s0 = st.from + dir * i * tread;
          const yy = st.y0 + (rise * (i + 1)) / n;
          k.tex(this.M.rugs).add(new THREE.PlaneGeometry(cw, tread).rotateX(-Math.PI / 2), '#ffffff', { p: P(s0 + dir * tread / 2, am, yy + 0.056), uv: rugUV(2) });
          k.tex(this.M.rugs).add(new THREE.PlaneGeometry(cw, rise / n), '#d8c8c8', { p: P(s0, am, yy - rise / n / 2 + 0.05), r: [0, dir > 0 ? Math.PI : 0, 0], uv: rugUV(2) });
          k.b.add(S.cyl(0.015, 0.015, cw + 0.1, 5), '#d8b04a', { p: P(s0 + dir * 0.02, am, yy - rise / n + 0.07), r: [0, 0, Math.PI / 2], order: 'YXZ' });
        }
      }
      // corrimãos e balaústres nos lados abertos
      const sides = st.id === 'grande' ? [st.a0, st.a1] : st.id === 'sotao' ? [st.a0] : [st.a1];
      for (const a of sides) {
        // o primeiro metro da ponta de BAIXO fica aberto: dá para subir (ou sair) pelo lado
        const open = st.id === 'grande' ? 0 : 1.0;
        const lowAtEnd = st.y1 < st.y0;
        const f0 = lowAtEnd ? 0 : open, f1 = lowAtEnd ? len - open : len; // trecho com corrimão (distância a partir de "from")
        const yAt = (f) => st.y0 + rise * (f / len);
        const pts = [];
        for (let i = 0; i <= 12; i++) {
          const f = f0 + (f1 - f0) * (i / 12);
          pts.push(new THREE.Vector3(...P(st.from + dir * f, a, yAt(f) + 1.02)));
        }
        k.b.add(S.tube(pts, 0.05, 6, { segments: 24 }), shade(woodC, 1.2));
        const nb = Math.floor((f1 - f0) / 0.22);
        for (let i = 0; i <= nb; i++) {
          const f = f0 + i * 0.22;
          const y = yAt(f);
          k.b.add(S.cyl(0.028, 0.035, 1.0, 6), '#2a1a22', { p: P(st.from + dir * f, a, y + 0.5) });
          if (i % 3 === 0) k.b.add(S.sphere(0.05, 6, 5), '#2a1a22', { p: P(st.from + dir * f, a, y + 0.35) });
        }
        // pilar na ponta de baixo com remate (caveira na escadaria grande)
        const fl = lowAtEnd ? f1 : f0;
        const s0 = st.from + dir * fl, y0 = yAt(fl);
        k.b.add(S.boxB(0.2, 1.25, 0.2), shade(woodC, 1.1), { p: P(s0, a, y0) });
        k.b.add(S.sphere(0.13, 10, 8), st.id === 'grande' ? PAL.bone : shade(woodC, 1.3), { p: P(s0, a, y0 + 1.35) });
        if (st.id === 'grande') for (const e of [-1, 1]) k.b.add(S.sphere(0.03, 5, 4), PAL.ink, { p: P(s0 - dir * 0.1, a + e * 0.045, y0 + 1.37) });
        // colisor lateral (corrimão; embaixo dele o vão fica fechado)
        const smid = st.from + dir * ((f0 + f1) / 2);
        const lenC = f1 - f0;
        const yLo = Math.min(st.y0, st.y1) - 0.1, yHi = Math.max(st.y0, st.y1) + 1.2;
        if (st.along === 'z') this.box(a, smid, 0.1, lenC / 2, yLo, yHi);
        else this.box(smid, a, lenC / 2, 0.1, yLo, yHi);
      }
      // lados encostados na parede ganham rodapé inclinado (espelho lateral)
      if (st.id === 'grande') {
        // painéis debaixo da escadaria, com uma portinhola de armário
        for (const a of [st.a0, st.a1]) {
          // lado oeste olha para -x, lado leste para +x (u avança para o norte, rumo ao patamar)
          const sg = a < 0 ? -1 : 1;
          const sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(sg * len, 0), new THREE.Vector2(sg * len, rise), new THREE.Vector2(0, 0.05)]);
          const g = new THREE.ShapeGeometry(sh);
          k.tex(this.M.woodPanel).add(g, '#b8a0a8', { p: [a + sg * 0.12, 0, st.from], r: [0, sg * Math.PI / 2, 0] });
        }
        k.b.add(S.box(0.9, 1.6, 0.05), '#2a1418', { p: [st.a1 + 0.03, 0.8, -1.2], r: [0, Math.PI / 2, 0] });
        k.b.add(S.sphere(0.04, 6, 5), '#c8a84a', { p: [st.a1 + 0.07, 0.85, -0.9] });
      }
      this.surfaces.push({ ramp: true, along: st.along, from: st.from, to: st.to, a0: st.a0, a1: st.a1, y0: st.y0, y1: st.y1 });
    }
    // vãos no piso: beiradas da laje e guarda-corpos
    const kc = this.kits.cozinha;
    kc.b.add(S.box(12.85 - 6.2, 0.35, 0.12), '#4a3a30', { p: [(6.2 + 12.85) / 2, -0.175, -7.45] });
    const ka = this.kits.sotao;
    ka.b.add(S.box(0.12, 0.35, 8.5 - 2.0), '#4a3828', { p: [-6.7, LV.A.y - 0.175, (2 + 8.5) / 2] });
    ka.b.add(S.box(0.12, 0.35, 8.5 - 2.0), '#4a3828', { p: [-5.15, LV.A.y - 0.175, (2 + 8.5) / 2] });
    this.rail(kc, 6.6, -7.38, 12.85, -7.38, 0, '#3a2a22');
    this.box((6.6 + 12.85) / 2, -7.38, (12.85 - 6.6) / 2, 0.08, -1.7, 1.2);
    this.rail(ka, -6.78, 2.3, -6.78, 8.55, LV.A.y, '#3a2818');
    this.rail(ka, -5.07, 2.3, -5.07, 8.55, LV.A.y, '#3a2818');
    this.rail(ka, -6.78, 8.55, -5.07, 8.55, LV.A.y, '#3a2818');
    this.box(-6.78, 5.4, 0.08, 3.1, LV.A.y - 0.1, LV.A.y + 1.2);
    this.box(-5.07, 5.4, 0.08, 3.1, LV.A.y - 0.1, LV.A.y + 1.2);
    this.box(-5.9, 8.55, 0.9, 0.08, LV.A.y - 0.1, LV.A.y + 1.2);
  }
  /** guarda-corpo reto de (x0,z0) a (x1,z1) na altura do piso y */
  rail(k, x0, z0, x1, z1, y, col, h = 1.05) {
    const len = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(x1 - x0, z1 - z0);
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    k.b.add(S.box(0.1, 0.08, len + 0.1), shade(col, 1.3), { p: [mx, y + h, mz], r: [0, ry, 0] });
    k.b.add(S.box(0.08, 0.05, len), col, { p: [mx, y + 0.1, mz], r: [0, ry, 0] });
    const n = Math.max(2, Math.round(len / 0.2));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      k.b.add(S.cyl(0.024, 0.03, h, 6), '#2a1a22', { p: [x0 + (x1 - x0) * t, y + h / 2, z0 + (z1 - z0) * t] });
    }
  }

  // ------------------------------------------------------------ patamar (balcão do saguão)
  landing() {
    const k = this.kits.saguao, L = LANDING;
    const w = L.x1 - L.x0, d = L.z1 - L.z0;
    k.b.add(S.box(w - T, 0.35, d - HT), '#3a2230', { p: [(L.x0 + L.x1) / 2, L.y - 0.175, (L.z0 + L.z1) / 2 + HT / 2] });
    k.tex(this.M.parquet).add(new THREE.PlaneGeometry(w - T, d - HT).rotateX(-Math.PI / 2), '#c8b0a8', { p: [(L.x0 + L.x1) / 2, L.y + 0.003, (L.z0 + L.z1) / 2 + HT / 2], uv: [w, d] });
    k.tex(this.M.rugs).add(new THREE.PlaneGeometry(2.4, d - 0.6).rotateX(-Math.PI / 2), '#ffffff', { p: [0, L.y + 0.008, (L.z0 + L.z1) / 2], uv: rugUV(2) });
    // mísulas embaixo do balcão
    for (const x of [-4.2, -2.6, 2.6, 4.2]) {
      k.b.add(S.box(0.3, 0.9, 0.5), '#4a2a38', { p: [x, L.y - 0.8, L.z1 - 0.2] });
      k.b.add(S.sphere(0.12, 8, 6), '#c8a84a', { p: [x, L.y - 1.3, L.z1 - 0.05] });
    }
    this.surfaces.push({ x0: L.x0, x1: L.x1, z0: L.z0, z1: L.z1, y: L.y, level: 'U' });
    this.ceilings.push({ x0: L.x0, x1: L.x1, z0: L.z0, z1: L.z1, y: L.y - 0.35, holes: [] });
    // guarda-corpo do balcão (menos onde chega a escadaria)
    for (const [a, b] of [[L.x0 + HT, -2], [2, L.x1 - HT]]) {
      this.rail(k, a, L.z1 + 0.05, b, L.z1 + 0.05, L.y, '#2a1420', 1.05);
      this.box((a + b) / 2, L.z1 + 0.05, (b - a) / 2, 0.12, 0, L.y + 1.2); // fecha também o vão embaixo do balcão
    }
    // parede sob o balcão (fecha o espaço) com lambri
    for (const [a, b] of [[L.x0 + HT, -2], [2, L.x1 - HT]]) {
      k.tex(this.M.damask).add(uvPlane(b - a, L.y - 0.35, 1), '#8a6aa0', { p: [(a + b) / 2, (L.y - 0.35) / 2, L.z1 + 0.02] });
      k.b.add(S.box(b - a, 1.2, 0.04), '#5a3a4a', { p: [(a + b) / 2, 0.6, L.z1 + 0.04] });
      k.b.add(S.box(b - a, 0.2, 0.06), '#3a2230', { p: [(a + b) / 2, 0.1, L.z1 + 0.05] });
    }
  }

  // ------------------------------------------------------------ sótão (telhado de duas águas)
  attic() {
    const r = ROOM.sotao, k = this.kits.sotao, y = LV.A.y;
    // piso de tábuas com o vão da escada
    const shape = new THREE.Shape([new THREE.Vector2(r.x0, -r.z0), new THREE.Vector2(r.x1, -r.z0), new THREE.Vector2(r.x1, -r.z1), new THREE.Vector2(r.x0, -r.z1)]);
    for (const h of HOLES.A) shape.holes.push(new THREE.Path([new THREE.Vector2(h.x0, -h.z0), new THREE.Vector2(h.x0, -h.z1), new THREE.Vector2(h.x1, -h.z1), new THREE.Vector2(h.x1, -h.z0)]));
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(-Math.PI / 2);
    k.tex(this.M.planks).add(g, '#d0c0b0', { p: [0, y + 0.002, 0] });
    // águas do telhado (planos inclinados de tábuas) e caibros
    const knee = LV.A.h, ridge = ATTIC_RIDGE;
    const run = 13, slopeLen = Math.hypot(run, ridge - knee), ang = Math.atan2(ridge - knee, run);
    const D = r.z1 - r.z0;
    for (const s of [-1, 1]) {
      const cx = (s * run) / 2, cy = y + knee + (ridge - knee) / 2;
      const plane = new THREE.PlaneGeometry(slopeLen, D);
      const uv = plane.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * slopeLen) / 1, (uv.getY(i) * D) / 1);
      // normal para dentro/baixo
      // deitado (virado para baixo) e depois inclinado para a cumeeira
      k.tex(this.M.planks).add(plane, '#9a8472', { p: [cx, cy, 0], r: [Math.PI / 2, 0, -s * ang], order: 'ZYX' });
      for (let z = r.z0 + 0.6; z < r.z1; z += 1.5) {
        k.b.add(S.box(slopeLen, 0.22, 0.14), '#4a3424', { p: [cx - s * 0.06, cy - 0.1, z], r: [0, 0, s * -ang] });
      }
      // parede baixa (joelho)
      k.tex(this.M.planks).add(uvPlane(D, knee, 1), '#8a7462', { p: [s * (run - 0.02), y + knee / 2, 0], r: [0, -s * Math.PI / 2, 0] });
    }
    // cumeeira
    k.b.add(S.box(0.3, 0.3, D), '#3a2818', { p: [0, y + ridge - 0.12, 0] });
    // oitões (triângulos nas pontas) com janelas redondas
    for (const s of [-1, 1]) {
      const zz = s * (9 - HT);
      const sh = new THREE.Shape([new THREE.Vector2(-13, 0), new THREE.Vector2(13, 0), new THREE.Vector2(13, knee), new THREE.Vector2(0, ridge), new THREE.Vector2(-13, knee)]);
      const win = WINDOWS.find((w) => w.room === 'sotao' && Math.sign(w.at) === s);
      if (win) {
        const p = new THREE.Path();
        p.absarc(win.c, win.y - y + win.h / 2, win.w / 2, 0, TAU, true);
        sh.holes.push(p);
      }
      const gg = new THREE.ShapeGeometry(sh, 10);
      k.tex(this.M.planks).add(gg, '#8a7462', { p: [0, y, zz], r: [0, s > 0 ? Math.PI : 0, 0] });
      if (win) {
        const f = { ry: s > 0 ? Math.PI : 0, o: [0, y, zz] };
        const cu = s > 0 ? -win.c : win.c;
        const cv = win.y - y + win.h / 2;
        const pt = (dd) => facePt(f, cu, cv, dd);
        k.glow(this.M.viewNight).addRaw(new THREE.CircleGeometry(win.w / 2 + 0.05, 24), { p: pt(-0.3), r: [0, f.ry, 0] });
        k.glow(this.M.viewDay).addRaw(new THREE.CircleGeometry(win.w / 2 + 0.05, 24), { p: pt(-0.31), r: [0, f.ry, 0] });
        k.b.add(S.torus(win.w / 2 + 0.05, 0.1, 6, 28), '#5a4232', { p: pt(0.03), r: [0, f.ry, 0] });
        for (let i = 0; i < 4; i++) k.b.add(S.box(0.05, win.w, 0.05), '#2a1a12', { p: pt(-0.1), r: [0, f.ry, (i / 4) * Math.PI] });
        this.windowInfo.push({ pos: pt(0), n: [Math.sin(f.ry), 0, Math.cos(f.ry)], w: win.w, h: win.h, room: 'sotao', kind: 'round', level: 'A' });
      }
    }
    // tesouras de madeira (triângulos) a cada 4 m
    for (let z = r.z0 + 2.5; z < r.z1 - 1; z += 4.2) {
      k.b.add(S.box(26, 0.22, 0.2), '#4a3424', { p: [0, y + knee + 1.3, z] });
      k.b.add(S.box(0.2, ridge - knee - 1.3, 0.2), '#4a3424', { p: [0, y + knee + 1.3 + (ridge - knee - 1.3) / 2, z] });
      for (const s of [-1, 1]) k.b.add(S.box(0.16, 2.6, 0.16), '#4a3424', { p: [s * 3.6, y + knee + 2.0, z], r: [0, 0, s * 0.6] });
    }
    this.surfaces.push({ x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1, y, level: 'A', holes: HOLES.A });
    // não deixa entrar onde o telhado fica mais baixo que a cabeça
    for (const s of [-1, 1]) this.box(s * 11.95, 0, 1.1, 9, y - 0.1, y + 2.4);
    for (const s of [-1, 1]) this.box(0, s * 9, 13, 0.2, y - 0.1, y + ridge);
  }

  // ------------------------------------------------------------ colisores das paredes
  wallColliders() {
    // faixas verticais por cômodo (o saguão ocupa térreo e andar de cima)
    for (const r of ROOMS) {
      if (r.level === 'A') continue;
      const bands = r.id === 'saguao' ? [[0, LV.U.y], [LV.U.y, roomTop(r)]] : [[LV[r.level].y, roomTop(r)]];
      for (const [b0, b1] of bands) {
        for (const f of roomFaces(r)) {
          // aberturas de porta que cortam esta faixa
          const doors = DOORS.filter((d) => !d.closed && d.axis === f.axis && Math.abs(d.at - f.at) < 0.01 && d.rooms.includes(r.id) && d.y0 >= b0 - 0.01 && d.y0 < b1 - 0.5);
          const lo = f.axis === 'z' ? r.x0 : r.z0, hi = f.axis === 'z' ? r.x1 : r.z1;
          let spans = [[lo, hi]];
          for (const d of doors) {
            const a = d.c - d.w / 2, b = d.c + d.w / 2;
            const next = [];
            for (const [s0, s1] of spans) {
              if (b <= s0 || a >= s1) next.push([s0, s1]);
              else {
                if (a > s0) next.push([s0, a]);
                if (b < s1) next.push([b, s1]);
              }
            }
            spans = next;
          }
          for (const [s0, s1] of spans) {
            if (s1 - s0 < 0.05) continue;
            const m = (s0 + s1) / 2, hl = (s1 - s0) / 2;
            // termina abaixo do piso de cima (senão prende quem anda no andar de cima)
            if (f.axis === 'z') this.box(m, f.at, hl, HT + 0.02, b0 - 0.1, b1 - 0.15);
            else this.box(f.at, m, HT + 0.02, hl, b0 - 0.1, b1 - 0.15);
          }
        }
      }
    }
  }

  // ------------------------------------------------------------ superfícies da física
  physics() {
    for (const r of ROOMS) {
      if (r.level === 'A') continue;
      const y = LV[r.level].y;
      this.surfaces.push({ x0: r.x0, x1: r.x1, z0: r.z0, z1: r.z1, y, level: r.level, holes: HOLES[r.level] ?? [] });
    }
  }
}

/** altura de uma rampa em (x,z), ou NaN fora dela */
export function rampY(s, x, z) {
  const along = s.along === 'z' ? z : x, across = s.along === 'z' ? x : z;
  if (across < s.a0 - 0.02 || across > s.a1 + 0.02) return NaN;
  const lo = Math.min(s.from, s.to), hi = Math.max(s.from, s.to);
  if (along < lo - 0.02 || along > hi + 0.02) return NaN;
  const t = clamp((along - s.from) / (s.to - s.from), 0, 1);
  return s.y0 + (s.y1 - s.y0) * t;
}
export { atticRoofY };
