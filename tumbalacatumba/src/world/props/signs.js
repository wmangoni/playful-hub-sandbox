import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Builder, S } from '../../render/builder.js';
import { toonMat, MAT } from '../../render/toon.js';
import { Model } from './batch.js';
import { PAL } from './palette.js';
import { RNG } from '../../util/rng.js';

export const SIGN_TEXTS = [
  'Praça', 'Cemitério', 'Pântano', 'Sítio', 'Mansão', 'Lago', 'Colina Espiral', 'Bosque Retorcido', 'Fendas', 'Farol',
  'CEMITÉRIO SORRIDENTE', 'SÍTIO DO SEU CUSTÓDIO', 'Bem-vindo a Tumbalacatumba', 'Pop. 312 (alguns vivos)',
  'Proibido ressuscitar após as 22h', 'Não alimente os sapos', 'Cuidado: abóboras mordem', 'Mansão Dentúcio',
  'Visitas só à noite', 'Poções da Vesga', 'Fiado só amanhã', 'Pesca proibida (os peixes mordem)',
];

let atlas = null;

/** atlas de placas: cada linha tem um texto sobre madeira */
export async function buildSignAtlas() {
  try {
    await document.fonts.load('52px Griffy');
  } catch {
    /* segue com fonte de fallback */
  }
  const W = 1024, RH = 64;
  const rows = SIGN_TEXTS.length;
  const H = THREE.MathUtils.ceilPowerOfTwo(rows * RH);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  const rng = new RNG(5);
  const entries = [];
  SIGN_TEXTS.forEach((text, i) => {
    const y0 = i * RH;
    g.font = '44px Griffy, "Marcellus", serif';
    const tw = Math.min(W - 40, g.measureText(text).width + 60);
    const x0 = (W - tw) / 2;
    // madeira
    const grd = g.createLinearGradient(0, y0, 0, y0 + RH);
    grd.addColorStop(0, '#6a4a34');
    grd.addColorStop(0.5, '#5a3e2c');
    grd.addColorStop(1, '#4a3222');
    g.fillStyle = grd;
    g.fillRect(x0, y0, tw, RH);
    g.strokeStyle = 'rgba(30,18,10,0.35)';
    g.lineWidth = 2;
    for (let k = 0; k < 5; k++) {
      g.beginPath();
      const yy = y0 + 8 + k * 12 + rng.range(-3, 3);
      g.moveTo(x0, yy);
      g.bezierCurveTo(x0 + tw * 0.3, yy + rng.range(-4, 4), x0 + tw * 0.7, yy + rng.range(-4, 4), x0 + tw, yy);
      g.stroke();
    }
    g.fillStyle = 'rgba(20,12,8,0.6)';
    for (const px of [x0 + 12, x0 + tw - 12]) {
      g.beginPath();
      g.arc(px, y0 + RH / 2, 4, 0, Math.PI * 2);
      g.fill();
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 6;
    g.strokeStyle = '#1a0e08';
    g.strokeText(text, W / 2, y0 + RH / 2 + 2);
    g.fillStyle = '#f0e2c0';
    g.fillText(text, W / 2, y0 + RH / 2 + 2);
    entries.push({ u0: x0 / W, u1: (x0 + tw) / W, v0: 1 - (y0 + RH) / H, v1: 1 - y0 / H, aspect: tw / RH });
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  atlas = { tex, entries, mat: toonMat({ map: tex }) };
  return atlas;
}

/** plano de texto com UV do atlas; altura h em metros, centrado em (0,0,0) virado para +z */
export function signPlane(index, h = 0.5) {
  const e = atlas.entries[index];
  const w = h * e.aspect;
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) ? e.u1 : e.u0, uv.getY(i) ? e.v1 : e.v0);
  }
  return { geo: g, w };
}

function textModel(parts, name) {
  const m = new Model(name);
  const list = parts.map(({ geo, m: mat4 }) => geo.applyMatrix4(mat4));
  if (list.length) m.part(mergeGeometries(list, false), atlas.mat, { cast: false });
  return m;
}

/** poste com placas-seta: arrows = [{ text: índice, yaw }] */
export function makeSignpost(arrows, seed = 0) {
  const rng = new RNG(seed + 12);
  const b = new Builder();
  b.add(S.boxB(0.16, 3.0, 0.16), PAL.woodDark, { r: [0, 0, rng.range(-0.05, 0.05)] });
  b.add(S.cone(0.14, 0.2, 4), PAL.woodDark, { p: [0, 3.08, 0], r: [0, Math.PI / 4, 0] });
  const texts = [];
  arrows.forEach((a, i) => {
    const y = 2.55 - i * 0.55;
    const { geo, w } = signPlane(a.text, 0.4);
    const bw = w + 0.35;
    const tilt = rng.range(-0.08, 0.08);
    const m4 = new THREE.Matrix4().compose(new THREE.Vector3(0, y, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a.yaw, tilt, 'YXZ')), new THREE.Vector3(1, 1, 1));
    const board = new THREE.BoxGeometry(bw, 0.46, 0.06).translate(bw / 2 - 0.05, 0, 0);
    const tip = new THREE.ConeGeometry(0.26, 0.3, 3).rotateZ(-Math.PI / 2).scale(1, 1, 0.2).translate(bw - 0.05 + 0.13, 0, 0);
    b.add(board, PAL.wood, { m: m4 });
    b.add(tip, PAL.wood, { m: m4 });
    for (const zs of [1, -1]) {
      const mm = m4.clone().multiply(new THREE.Matrix4().makeTranslation(w / 2 + 0.1, 0, zs * 0.035)).multiply(new THREE.Matrix4().makeRotationY(zs < 0 ? Math.PI : 0));
      texts.push({ geo: geo.clone(), m: mm });
    }
  });
  const m = textModel(texts, 'signtext');
  m.parts.unshift({ geo: b.build(), mat: MAT.vc, cast: true, receive: true, layer: 0 });
  m.colliders.push({ type: 'c', x: 0, z: 0, r: 0.2 });
  return m;
}

/** placa pendurada/solta com um texto: retorna só o texto (a base de madeira vem do atlas) */
export function makeTextBoard(index, h = 0.55, doubleSided = true) {
  const { geo, w } = signPlane(index, h);
  const b = new Builder();
  b.add(S.box(w + 0.12, h + 0.12, 0.08), PAL.woodDark, { p: [0, 0, -0.045] });
  const texts = [{ geo: geo.clone(), m: new THREE.Matrix4().makeTranslation(0, 0, 0.001) }];
  if (doubleSided) texts.push({ geo: geo.clone(), m: new THREE.Matrix4().makeRotationY(Math.PI).setPosition(0, 0, -0.091) });
  const m = textModel(texts, 'boardtext');
  m.parts.unshift({ geo: b.build(), mat: MAT.vc, cast: true, receive: true, layer: 0 });
  m.width = w;
  return m;
}

export function makeStandingSign(index, seed = 0, h = 0.5) {
  const rng = new RNG(seed + 3);
  const board = makeTextBoard(index, h);
  const b = new Builder();
  for (const s of [-1, 1]) b.add(S.boxB(0.1, 1.5, 0.1), PAL.woodDark, { p: [(s * board.width) / 2.4, 0, -0.1], r: [0, 0, s * rng.range(0, 0.06)] });
  const tilt = rng.range(-0.1, 0.1);
  const mat4 = new THREE.Matrix4().compose(new THREE.Vector3(0, 1.3, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, tilt)), new THREE.Vector3(1, 1, 1));
  const m = new Model('standingsign');
  m.part(b.build(), MAT.vc);
  for (const p of board.parts) m.part(p.geo.clone().applyMatrix4(mat4), p.mat, p);
  m.colliders.push({ type: 'box', x: 0, z: 0, hw: board.width / 2, hd: 0.15, rot: 0 });
  return m;
}
