import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MAT } from '../../render/toon.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _e = new THREE.Euler();
const _c = new THREE.Color();
const _box = new THREE.Box3();

/** Modelo em espaço local: várias partes (geometria + material), colisores e âncoras. */
export class Model {
  constructor(name = 'model') {
    this.name = name;
    this.parts = [];
    this.colliders = []; // {type:'box', x,z,hw,hd,rot,y0,y1} | {type:'c', x,z,r}
    this.anchors = {};
    this.height = 3;
  }
  part(geo, mat = MAT.vc, opts = {}) {
    if (geo) this.parts.push({ geo, mat, cast: opts.cast ?? true, receive: opts.receive ?? true, layer: opts.layer ?? 0 });
    return this;
  }
  /** acrescenta todas as partes de um Builder de brilho/cor conforme o material */
  fromBuilders(list) {
    for (const [b, mat, opts] of list) if (b && !b.empty) this.part(b.build(), mat, opts);
    return this;
  }
}

export function matrixFrom(x, y, z, rotY = 0, scale = 1, rotX = 0, rotZ = 0) {
  _e.set(rotX, rotY, rotZ, 'YXZ');
  _q.setFromEuler(_e);
  const s = typeof scale === 'number' ? _s.set(scale, scale, scale) : _s.set(...scale);
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q, s);
}

function normalizeAttrs(list) {
  const names = new Map();
  for (const g of list) for (const [k, a] of Object.entries(g.attributes)) names.set(k, a.itemSize);
  for (const g of list) {
    for (const [k, size] of names) {
      if (!g.attributes[k]) {
        const arr = new Float32Array(g.attributes.position.count * size);
        if (k === 'color') arr.fill(1);
        g.setAttribute(k, new THREE.BufferAttribute(arr, size));
      }
    }
    for (const k of Object.keys(g.attributes)) if (!names.has(k)) g.deleteAttribute(k);
    if (!g.index) {
      const n = g.attributes.position.count;
      const idx = new Uint32Array(n);
      for (let i = 0; i < n; i++) idx[i] = i;
      g.setIndex(new THREE.BufferAttribute(idx, 1));
    }
  }
}

/** Geometria estática mesclada por célula espacial e material (poucas draw calls, com culling). */
export class StaticBatch {
  constructor(scene, cell = 44) {
    this.scene = scene;
    this.cell = cell;
    this.groups = new Map();
    this.meshes = [];
  }
  addGeometry(geo, mat, matrix, opts = {}, tint = null) {
    const g = geo.clone();
    g.applyMatrix4(matrix);
    if (tint && g.attributes.color) {
      _c.set(tint);
      const a = g.attributes.color;
      for (let i = 0; i < a.count; i++) a.setXYZ(i, a.getX(i) * _c.r, a.getY(i) * _c.g, a.getZ(i) * _c.b);
    }
    g.computeBoundingBox();
    g.boundingBox.getCenter(_p);
    const cx = Math.floor(_p.x / this.cell), cz = Math.floor(_p.z / this.cell);
    const key = `${cx},${cz}|${mat.uuid}|${opts.cast ?? true}|${opts.layer ?? 0}`;
    let grp = this.groups.get(key);
    if (!grp) this.groups.set(key, (grp = { mat, list: [], cast: opts.cast ?? true, receive: opts.receive ?? true, layer: opts.layer ?? 0 }));
    grp.list.push(g);
  }
  addModel(model, matrix, tint = null, cast = true) {
    for (const p of model.parts) this.addGeometry(p.geo, p.mat, matrix, cast ? p : { ...p, cast: false }, tint);
  }
  build() {
    for (const grp of this.groups.values()) {
      normalizeAttrs(grp.list);
      const geo = mergeGeometries(grp.list, false);
      if (!geo) continue;
      geo.computeBoundingSphere();
      const m = new THREE.Mesh(geo, grp.mat);
      m.castShadow = grp.cast;
      m.receiveShadow = grp.receive;
      if (grp.layer) m.layers.set(grp.layer);
      m.matrixAutoUpdate = false;
      m.updateMatrix();
      this.scene.add(m);
      this.meshes.push(m);
    }
    this.groups.clear();
    return this.meshes;
  }
}

/**
 * Conjunto de "instâncias" que na verdade são mescladas no StaticBatch compartilhado
 * (uma malha por célula e material → pouquíssimas draw calls na GPU integrada).
 */
export class InstanceSet {
  static batch = null;
  constructor(scene, name, variants, { cast = true, colorize = false } = {}) {
    this.name = name;
    this.variants = variants;
    this.cast = cast;
    this.colorize = colorize;
    this.count = 0;
  }
  add(variant, matrix, color = null) {
    const model = this.variants[variant % this.variants.length];
    InstanceSet.batch.addModel(model, matrix, this.colorize || color ? color : null, this.cast);
    this.count++;
  }
  build() {}
}

export function geoHeight(geo) {
  geo.computeBoundingBox();
  _box.copy(geo.boundingBox);
  return _box.max.y - _box.min.y;
}
