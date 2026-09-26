import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TAU } from '../util/math.js';
import { noise3 } from '../util/noise.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const _v = new THREE.Vector3();

/** mantém só position/normal e garante índice */
export function prep(geo, flat = false) {
  let g = geo;
  for (const name of Object.keys(g.attributes)) {
    if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
  }
  if (flat) {
    if (g.index) g = g.toNonIndexed();
    g.computeVertexNormals();
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.index) {
    const n = g.attributes.position.count;
    const idx = n > 65535 ? new Uint32Array(n) : new Uint16Array(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    g.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  return g;
}

/** t = { p:[x,y,z], r:[x,y,z], s: n|[x,y,z], order, m: Matrix4 } */
export function xform(g, t = {}) {
  if (t.p || t.r || t.s !== undefined) {
    const s = t.s === undefined ? [1, 1, 1] : typeof t.s === 'number' ? [t.s, t.s, t.s] : t.s;
    _e.set(...(t.r || [0, 0, 0]), t.order || 'XYZ');
    _q.setFromEuler(_e);
    _m.compose(_p.set(...(t.p || [0, 0, 0])), _q, _s.set(...s));
    g.applyMatrix4(_m);
  }
  if (t.m) g.applyMatrix4(t.m);
  return g;
}

/** cor constante (hex/Color) ou função (x,y,z,i) → hex|Color */
export function paint(g, color, name = 'color') {
  const pos = g.attributes.position;
  const n = pos.count;
  const col = new Float32Array(n * 3);
  if (typeof color === 'function') {
    for (let i = 0; i < n; i++) {
      const r = color(pos.getX(i), pos.getY(i), pos.getZ(i), i);
      if (r.isColor) _c.copy(r); else _c.set(r);
      col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b;
    }
  } else {
    _c.set(color);
    for (let i = 0; i < n; i++) {
      col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b;
    }
  }
  g.setAttribute(name, new THREE.BufferAttribute(col, 3));
  return g;
}

export class Builder {
  constructor() {
    this.parts = [];
  }
  get empty() {
    return this.parts.length === 0;
  }
  /** adiciona uma peça. t.flat = sombreamento facetado; t.sway = peso de vento (n ou fn(y)) */
  add(geo, color, t = {}) {
    const g = prep(geo, t.flat);
    xform(g, t);
    paint(g, color);
    if (t.sway !== undefined) {
      const pos = g.attributes.position;
      const a = new Float32Array(pos.count);
      for (let i = 0; i < pos.count; i++) a[i] = typeof t.sway === 'function' ? t.sway(pos.getY(i), pos.getX(i), pos.getZ(i)) : t.sway;
      g.setAttribute('sway', new THREE.BufferAttribute(a, 1));
    }
    this.parts.push(g);
    return g;
  }
  /** geometria sem cor (para malhas de brilho) */
  addRaw(geo, t = {}) {
    const g = prep(geo, t.flat);
    xform(g, t);
    this.parts.push(g);
    return g;
  }
  addBuilder(b, m) {
    for (const g of b.parts) {
      const c = g.clone();
      if (m) c.applyMatrix4(m);
      this.parts.push(c);
    }
  }
  /** aplica uma deformação (x,y,z,v) em tudo que já foi adicionado */
  deform(fn) {
    for (const g of this.parts) {
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        _v.set(p.getX(i), p.getY(i), p.getZ(i));
        fn(_v);
        p.setXYZ(i, _v.x, _v.y, _v.z);
      }
      p.needsUpdate = true;
    }
  }
  build(recomputeNormals = false) {
    if (!this.parts.length) return null;
    // união de atributos: completa com zeros o que faltar
    const names = new Map();
    for (const g of this.parts) for (const [k, a] of Object.entries(g.attributes)) names.set(k, a.itemSize);
    for (const g of this.parts) {
      for (const [k, size] of names) {
        if (!g.attributes[k]) {
          const arr = new Float32Array(g.attributes.position.count * size);
          if (k === 'color') arr.fill(1);
          g.setAttribute(k, new THREE.BufferAttribute(arr, size));
        }
      }
    }
    const g = mergeGeometries(this.parts, false);
    if (recomputeNormals) g.computeVertexNormals();
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

// ---------------------------------------------------------------------------
// Formas
// ---------------------------------------------------------------------------
export const S = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  boxB: (w, h, d) => new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0),
  cyl: (rt, rb, h, seg = 10, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open),
  cylB: (rt, rb, h, seg = 10, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open).translate(0, h / 2, 0),
  cone: (r, h, seg = 10) => new THREE.ConeGeometry(r, h, seg),
  coneB: (r, h, seg = 10) => new THREE.ConeGeometry(r, h, seg).translate(0, h / 2, 0),
  sphere: (r, ws = 12, hs = 9) => new THREE.SphereGeometry(r, ws, hs),
  hemi: (r, ws = 12, hs = 6) => new THREE.SphereGeometry(r, ws, hs, 0, TAU, 0, Math.PI / 2),
  torus: (R, r, rs = 6, ts = 16, arc = TAU) => new THREE.TorusGeometry(R, r, rs, ts, arc),
  lathe: (pts, seg = 12) => new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg),
  capsule: (r, len, cs = 3, rs = 8) => new THREE.CapsuleGeometry(r, len, cs, rs),
  ico: (r, d = 0) => new THREE.IcosahedronGeometry(r, d),
  dodeca: (r) => new THREE.DodecahedronGeometry(r, 0),
  plane: (w, h) => new THREE.PlaneGeometry(w, h),
  disc: (r, seg = 16) => new THREE.CircleGeometry(r, seg),
  ring: (r0, r1, seg = 24) => new THREE.RingGeometry(r0, r1, seg),

  /** extrusão de polígono 2D (pts = [[x,y],...]) centrada em z */
  extrude(pts, depth, curveSegments = 6, holes = []) {
    const shape = pts instanceof THREE.Shape ? pts : new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
    for (const h of holes) shape.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p[0], p[1]))));
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments });
    g.translate(0, 0, -depth / 2);
    return g;
  },

  /** prisma triangular (empena do telhado): base w em x, altura h em y, profundidade d em z */
  prism(w, h, d) {
    const hw = w / 2, hd = d / 2;
    const v = [
      -hw, 0, hd, hw, 0, hd, 0, h, hd, // frente
      hw, 0, -hd, -hw, 0, -hd, 0, h, -hd, // trás
      // lados
      -hw, 0, -hd, -hw, 0, hd, 0, h, hd, -hw, 0, -hd, 0, h, hd, 0, h, -hd,
      hw, 0, hd, hw, 0, -hd, 0, h, -hd, hw, 0, hd, 0, h, -hd, 0, h, hd,
      // base
      -hw, 0, -hd, hw, 0, -hd, hw, 0, hd, -hw, 0, -hd, hw, 0, hd, -hw, 0, hd,
    ];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.computeVertexNormals();
    return g;
  },

  /** tubo afunilado ao longo de uma curva (Vector3[]); radius = n ou fn(t) */
  tube(points, radius, radialSegments = 6, opts = {}) {
    const curve = points.isCurve ? points : new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const len = curve.getLength();
    const tubular = opts.segments ?? Math.max(3, Math.min(64, Math.ceil(len / (opts.step ?? 0.3))));
    const frames = curve.computeFrenetFrames(tubular, false);
    const pos = [], nor = [], idx = [];
    const P = new THREE.Vector3();
    for (let i = 0; i <= tubular; i++) {
      const t = i / tubular;
      curve.getPointAt(t, P);
      const N = frames.normals[i], B = frames.binormals[i];
      const r = typeof radius === 'function' ? radius(t) : radius;
      for (let j = 0; j <= radialSegments; j++) {
        const v = (j / radialSegments) * TAU;
        const sn = Math.sin(v), cs = -Math.cos(v);
        const nx = cs * N.x + sn * B.x, ny = cs * N.y + sn * B.y, nz = cs * N.z + sn * B.z;
        nor.push(nx, ny, nz);
        pos.push(P.x + r * nx, P.y + r * ny, P.z + r * nz);
      }
    }
    const rs1 = radialSegments + 1;
    for (let i = 0; i < tubular; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = rs1 * i + j, b = rs1 * (i + 1) + j, c = b + 1, d = a + 1;
        idx.push(a, b, d, b, c, d);
      }
    }
    if (opts.capStart) {
      curve.getPointAt(0, P);
      const ci = pos.length / 3;
      const T = frames.tangents[0];
      pos.push(P.x, P.y, P.z);
      nor.push(-T.x, -T.y, -T.z);
      for (let j = 0; j < radialSegments; j++) idx.push(ci, j + 1, j);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setIndex(idx);
    return g;
  },

  /** abóbora: esfera com gomos e achatada */
  pumpkin(r = 0.5, ribs = 8, ws = 24, hs = 14) {
    const g = new THREE.SphereGeometry(r, ws, hs);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const a = Math.atan2(z, x);
      const rib = 1 - 0.1 * Math.pow(Math.abs(Math.sin((ribs * a) / 2)), 1.4);
      const yn = y / r;
      const pole = 1 - 0.28 * Math.pow(Math.abs(yn), 6);
      x *= rib;
      z *= rib;
      y = y * 0.78 * pole;
      p.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals();
    return g;
  },

  /** bolha irregular (pedras, arbustos) */
  blob(r = 1, detail = 1, amp = 0.25, freq = 1.2, seed = 0) {
    const g = new THREE.IcosahedronGeometry(r, detail);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      _v.set(p.getX(i), p.getY(i), p.getZ(i));
      const n = noise3(_v.x * freq + seed, _v.y * freq + seed * 0.7, _v.z * freq - seed);
      _v.multiplyScalar(1 + n * amp);
      p.setXYZ(i, _v.x, _v.y, _v.z);
    }
    g.computeVertexNormals();
    return g;
  },
};

/** curva espiral (enrolada) no plano definido por dir e perp, começando em start */
export function curlPoints(start, dir, perp, radius, turns = 1.3, steps = 10, shrink = 0.75) {
  const pts = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const ang = t * turns * TAU;
    const r = radius * (1 - t * shrink);
    const x = Math.sin(ang) * r;
    const y = (1 - Math.cos(ang)) * r;
    pts.push(new THREE.Vector3().copy(start).addScaledVector(dir, x).addScaledVector(perp, y));
  }
  return pts;
}

/** deformação "torta" estilo Burton: inclina, ondula e torce conforme a altura */
export function crookify(b, { lean = 0, leanZ = 0, wobble = 0.12, freq = 0.45, seed = 0, twist = 0, height = 10 }) {
  b.deform((v) => {
    const k = Math.max(0, v.y) / height;
    let x = v.x + lean * v.y + Math.sin(v.y * freq + seed) * wobble * k;
    let z = v.z + leanZ * v.y + Math.cos(v.y * freq * 0.8 + seed * 1.7) * wobble * k;
    if (twist) {
      const a = twist * k, c = Math.cos(a), s = Math.sin(a);
      const nx = x * c - z * s;
      z = x * s + z * c;
      x = nx;
    }
    v.x = x;
    v.z = z;
  });
}

export function mesh(geo, mat, { cast = true, receive = true, layer = 0, name } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  if (layer) m.layers.set(layer);
  if (name) m.name = name;
  return m;
}
