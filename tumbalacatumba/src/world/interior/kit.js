import * as THREE from 'three';
import { Builder, xform, paint } from '../../render/builder.js';
import { MAT } from '../../render/toon.js';
import { matrixFrom } from '../props/batch.js';

/** como o prep do Builder, mas mantém as coordenadas de textura (uv) */
function prepUV(geo) {
  let g = geo;
  for (const name of Object.keys(g.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  if (!g.index) {
    const n = g.attributes.position.count;
    const idx = n > 65535 ? new Uint32Array(n) : new Uint16Array(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    g.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  return g;
}

/** Builder que preserva uv. t.uv = [su, sv, ou, ov] escala/desloca as coordenadas antes de posicionar */
export class UVBuilder extends Builder {
  add(geo, color, t = {}) {
    const g = prepUV(geo);
    if (t.uv) {
      const [su, sv, ou = 0, ov = 0] = t.uv;
      const a = g.attributes.uv;
      for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * su + ou, a.getY(i) * sv + ov);
    }
    xform(g, t);
    paint(g, color);
    this.parts.push(g);
    return g;
  }
  addRaw(geo, t = {}) {
    const g = prepUV(geo);
    xform(g, t);
    this.parts.push(g);
    return g;
  }
}

/**
 * Kit de montagem do interior: um Builder por material.
 * b = toon com cor por vértice, d = dupla face, glow(mat) = brilhos, tex(mat) = superfícies com textura.
 */
export class IKit {
  constructor() {
    this.b = new Builder();
    this.d = new Builder();
    this.glows = new Map();
    this.texs = new Map();
    this.flat = new Builder(); // pisos e forros: recebem sombra, não projetam
  }
  glow(mat) {
    let b = this.glows.get(mat);
    // brilho com textura (vitral, vista da janela, teia, facho) precisa manter o uv
    if (!b) this.glows.set(mat, (b = mat.map ? new UVBuilder() : new Builder()));
    return b;
  }
  tex(mat) {
    let b = this.texs.get(mat);
    if (!b) this.texs.set(mat, (b = new UVBuilder()));
    return b;
  }
  /** incorpora outro kit (móvel montado em coordenadas locais) com uma matriz */
  merge(o, m) {
    this.b.addBuilder(o.b, m);
    this.d.addBuilder(o.d, m);
    this.flat.addBuilder(o.flat, m);
    for (const [mat, b] of o.glows) this.glow(mat).addBuilder(b, m);
    for (const [mat, b] of o.texs) this.tex(mat).addBuilder(b, m);
  }
  /** monta fn(kitLocal) e coloca em (x,y,z) girado ry (e escala s) */
  put(fn, x, y, z, ry = 0, s = 1, ...args) {
    const k = new IKit();
    fn(k, ...args);
    this.merge(k, matrixFrom(x, y, z, ry, s));
    return k;
  }
  /** gera as malhas deste kit */
  meshes({ cast = true } = {}) {
    const out = [];
    const mk = (b, mat, opts = {}) => {
      if (b.empty) return;
      const m = new THREE.Mesh(b.build(), mat);
      m.castShadow = opts.cast ?? cast;
      m.receiveShadow = opts.receive ?? true;
      if (opts.layer) m.layers.set(opts.layer);
      m.matrixAutoUpdate = false;
      m.updateMatrix();
      m.userData.canCast = m.castShadow;
      out.push(m);
    };
    mk(this.b, MAT.vc);
    mk(this.d, MAT.vcDouble);
    mk(this.flat, MAT.vc, { cast: false });
    for (const [mat, b] of this.texs) mk(b, mat, { cast: mat.userData.cast ?? false });
    for (const [mat, b] of this.glows) mk(b, mat, { cast: false, layer: mat.userData.layer });
    return out;
  }
}

export const at = (x, y, z, ry = 0, s = 1) => matrixFrom(x, y, z, ry, s);

/** plano vertical w×h com uv em metros (para texturas repetidas), normal +z */
export function uvPlane(w, h, tile = 1) {
  const g = new THREE.PlaneGeometry(w, h);
  const a = g.attributes.uv;
  for (let i = 0; i < a.count; i++) a.setXY(i, (a.getX(i) * w) / tile, (a.getY(i) * h) / tile);
  return g;
}
