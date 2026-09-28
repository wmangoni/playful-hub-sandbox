import * as THREE from 'three';
import { StaticBatch, InstanceSet, Model, matrixFrom } from './props/batch.js';
import * as SM from './props/small.js';
import * as TR from './props/trees.js';
import * as BL from './props/buildings.js';
import * as SG from './props/signs.js';
import { Builder, S } from '../render/builder.js';
import { MAT, GLOW, flameMat } from '../render/toon.js';
import { LAYER_FX } from '../render/postfx.js';
import { RNG } from '../util/rng.js';
import { clamp, lerp, TAU } from '../util/math.js';
import {
  HALF, PLAY_LIMIT, WATER_LEVEL, CLOCK_TOWER, FOUNTAIN, CEMETERY,
  cemToWorld, MANOR, MANOR_GATE, BARN, FARMHOUSE, WINDMILL,
  WITCH_HUT, ISLAND, LIGHTHOUSE, SKULL_ROCK, SPIRAL_HILL, NEST,
  VENTS, WOODS, SWAMP, PUMPKIN_FIELD, CROP_FIELD, NPC_SPOTS,
} from './layout.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

function inCemetery(x, z, margin = 0) {
  const dx = x - CEMETERY.x, dz = z - CEMETERY.z;
  const c = Math.cos(CEMETERY.rot), s = Math.sin(CEMETERY.rot);
  const lx = dx * c - dz * s, lz = dx * s + dz * c;
  return Math.abs(lx) < CEMETERY.hw + margin && Math.abs(lz) < CEMETERY.hd + margin;
}
function inRect(f, x, z, margin = 0) {
  const dx = x - f.x, dz = z - f.z;
  const c = Math.cos(-f.rot), s = Math.sin(-f.rot);
  const lx = dx * c - dz * s, lz = dx * s + dz * c;
  return Math.abs(lx) < f.hw + margin && Math.abs(lz) < f.hd + margin;
}

// ---------------------------------------------------------------------------
// Etapa 1: planejar construções (antes de fechar o terreno) e achatar o chão sob elas
// ---------------------------------------------------------------------------
export function planWorld(world) {
  const T = world.terrain;
  const rng = new RNG(99);
  const plan = { houses: [], special: [], occupied: [] };
  const occ = plan.occupied;
  const free = (x, z, r) => !occ.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + r);
  const add = (type, x, z, rot, r, padR = null, extra = {}) => {
    plan.special.push({ type, x, z, rot, ...extra });
    occ.push({ x, z, r });
    if (padR) T.addPad(x, z, padR, 3, extra.padH ?? null);
  };
  add('clock', CLOCK_TOWER.x, CLOCK_TOWER.z, 0, 5);
  add('fountain', FOUNTAIN.x, FOUNTAIN.z, 0, 4);
  add('manor', MANOR.x, MANOR.z, MANOR.rot, 15, 12);
  const [chx, chz] = cemToWorld(12, -11);
  add('chapel', chx, chz, CEMETERY.rot, 7, 6.5);
  add('barn', BARN.x, BARN.z, Math.PI + BARN.rot, 9, 8.5);
  add('farmhouse', FARMHOUSE.x, FARMHOUSE.z, Math.PI + FARMHOUSE.rot, 5.5, 5, { house: { w: 6, d: 5, floors: 2, wall: '#9a8a7a', roof: '#523a2a', style: 'gable', porch: true, chimney: true } });
  add('windmill', WINDMILL.x, WINDMILL.z, -Math.PI / 2 - 0.35, 4.5, 3.8);
  add('witchhut', WITCH_HUT.x, WITCH_HUT.z, 0.55, 5);
  add('gazebo', ISLAND.x, ISLAND.z, 0.3, 4.2, 4.2);
  add('lighthouse', LIGHTHOUSE.x, LIGHTHOUSE.z, -0.4, 4, 4);
  add('skullrock', SKULL_ROCK.x, SKULL_ROCK.z, 0.6, 5.5);
  add('spiral', SPIRAL_HILL.x, SPIRAL_HILL.z, 0.8, 14);
  const [shx, shz] = cemToWorld(-12, 26);
  add('shack', shx, shz, CEMETERY.rot + 0.5, 4, 4, { house: { w: 4.2, d: 4, floors: 1, wall: '#6f6a5a', roof: '#35463a', style: 'gable', porch: true } });
  add('aranhilda', -36, 20.5, Math.PI - 0.25, 5, 4.5, { house: { w: 5.2, d: 4.6, floors: 3, wall: '#8a6aa8', roof: '#3a2a4a', style: 'tower', shutter: '#3a2a4a', lit: 0.9, topHeavy: 0.1 } });
  for (const [lx, lz, r] of [[-14, -9, 0.2], [14, -6, -0.2], [-4, -12, 0.05]]) {
    const [x, z] = cemToWorld(lx, lz);
    add('crypt', x, z, CEMETERY.rot + r, 4, 3.5);
  }
  // áreas de PNJ e missões ficam livres
  for (const s of Object.values(NPC_SPOTS)) occ.push({ x: s.x, z: s.z, r: 3 });

  // casas da vila ao longo das ruas
  const villageRoads = ['norte', 'nordeste', 'leste', 'sul', 'oeste', 'noroeste', 'bosque'];
  let seed = 1;
  for (const id of villageRoads) {
    const road = T.roads.find((r) => r.id === id);
    let side = rng.sign();
    for (let i = 8; i < road.samples.length; i += rng.int(11, 16)) {
      const p = road.samples[i];
      const dc = Math.hypot(p.x, p.z);
      if (dc < 24 || dc > 74) continue;
      side = -side;
      const w = rng.range(4.4, 6.2), d = rng.range(4.0, 5.4);
      const nx = -p.tz * side, nz = p.tx * side;
      const set = road.hw + 3.2 + d / 2 + rng.range(0, 2);
      const x = p.x + nx * set, z = p.z + nz * set;
      const R = Math.max(w, d) / 2 + 1.4;
      if (!free(x, z, R)) continue;
      if (T.roadDistAt(x, z) < d / 2 + 0.8) continue;
      if (inCemetery(x, z, 6)) continue;
      const h = T.heightAt(x, z);
      if (h < 0.9) continue;
      const nrm = T.normalAt(x, z);
      if (nrm.y < 0.93) continue;
      const rot = Math.atan2(-nx, -nz);
      plan.houses.push({ x, z, rot, seed: seed++, w, d });
      occ.push({ x, z, r: R });
      T.addPad(x, z, Math.max(w, d) / 2 + 0.9, 3);
    }
  }
  return plan;
}

// ---------------------------------------------------------------------------
// Etapa 2: colocar tudo no mundo
// ---------------------------------------------------------------------------
export async function populateWorld(world, plan, progress = () => {}) {
  const T = world.terrain;
  const scene = world.scene;
  const C = world.colliders;
  const batch = new StaticBatch(scene, 44);
  InstanceSet.batch = batch;
  const rng = new RNG(7);
  const out = {
    map: { houses: [], trees: [], graves: [], lamps: [], lines: [], circles: [], pumpkins: [], rocks: [], bushes: [], decks: [] },
    lights: [],
    smoke: [],
    anchors: {},
    animated: [],
    braziers: [],
  };
  const M = out.map;
  await SG.buildSignAtlas();

  const hAt = (x, z) => T.heightAt(x, z);
  const regColliders = (model, x, y, z, rot, s = 1) => {
    const c = Math.cos(rot), sn = Math.sin(rot);
    for (const cl of model.colliders) {
      const wx = x + (cl.x * c + cl.z * sn) * s, wz = z + (-cl.x * sn + cl.z * c) * s;
      if (cl.type === 'c') C.addCircle(wx, wz, cl.r * s, { y0: y - 1, y1: y + (model.height ?? 3) * s });
      else C.addBox(wx, wz, cl.hw * s, cl.hd * s, rot + (cl.rot || 0), { y0: y + (cl.y0 ?? -1) * s, y1: y + (cl.y1 ?? 3) * s, camera: (cl.y1 ?? 3) > 2.5 });
    }
  };
  const place = (model, x, z, rot = 0, o = {}) => {
    const y = o.y ?? hAt(x, z) + (o.yOff ?? 0);
    const m4 = matrixFrom(x, y, z, rot, o.scale ?? 1, o.rx ?? 0, o.rz ?? 0);
    batch.addModel(model, m4);
    if (o.collide !== false) regColliders(model, x, y, z, rot, typeof o.scale === 'number' ? o.scale : 1);
    return { x, y, z, rot, m4 };
  };
  const toWorld = (x, y, z, rot, v) => {
    const c = Math.cos(rot), s = Math.sin(rot);
    return V3(x + v.x * c + v.z * s, y + v.y, z - v.x * s + v.z * c);
  };
  const mapRect = (x, z, rot, w, d, roof, extra = {}) => M.houses.push({ x, z, rot, w, d, roof, ...extra });

  // ----- construções especiais -----
  progress(0.4, 'Erguendo casas tortas…');
  for (const sp of plan.special) {
    const { x, z, rot } = sp;
    switch (sp.type) {
      case 'clock': {
        const m = BL.makeClockTower();
        const p = place(m, x, z, rot);
        const hands = BL.makeClockHands();
        const handMat = MAT.vc;
        const group = [];
        for (const f of m.anchors.faces) {
          const wp = toWorld(x, p.y, z, rot, f.pos);
          const pivot = new THREE.Group();
          pivot.position.copy(wp);
          pivot.rotation.y = rot + f.ry;
          const hh = new THREE.Mesh(hands.hour, handMat);
          const mh = new THREE.Mesh(hands.minute, handMat);
          hh.position.z = 0.03;
          mh.position.z = 0.07;
          pivot.add(hh, mh);
          scene.add(pivot);
          group.push({ hh, mh });
        }
        out.anchors.clockHands = group;
        mapRect(x, z, rot, m.map.w, m.map.d, m.map.roof, { tall: true, label: 'Relógio' });
        break;
      }
      case 'fountain': {
        const m = BL.makeFountain();
        const p = place(m, x, z, rot);
        out.anchors.fountain = V3(x, p.y + 3.4, z + 0.5);
        M.circles.push({ x, z, r: 3.3, fill: '#5a6a78', water: true });
        break;
      }
      case 'manor': {
        const m = BL.makeManor();
        const p = place(m, x, z, rot);
        out.anchors.manorTowers = m.anchors.towerTops.map((v) => toWorld(x, p.y, z, rot, v));
        out.anchors.manorDoor = toWorld(x, p.y, z, rot, m.anchors.door);
        mapRect(x, z, rot, m.map.w, m.map.d, m.map.roof, { tall: true });
        break;
      }
      case 'chapel': {
        const m = BL.makeChapel();
        place(m, x, z, rot);
        mapRect(x, z, rot, m.map.w, m.map.d, m.map.roof, { tall: true });
        break;
      }
      case 'barn': {
        const m = BL.makeBarn();
        place(m, x, z, rot);
        mapRect(x, z, rot, m.map.w, m.map.d, m.map.roof);
        break;
      }
      case 'farmhouse':
      case 'shack':
      case 'aranhilda': {
        const m = BL.makeHouse(sp.type.length * 97, sp.house);
        const p = place(m, x, z, rot);
        if (m.anchors.smoke) out.smoke.push(toWorld(x, p.y, z, rot, m.anchors.smoke));
        out.lights.push({ ...toWorld(x, p.y, z, rot, V3(0.8, 2.4, 2.6)), r: 4.5, i: 0.7 });
        mapRect(x, z, rot, m.map.w, m.map.d, m.map.roof);
        if (sp.type === 'aranhilda') out.anchors.aranhildaDoor = toWorld(x, p.y, z, rot, m.anchors.door);
        break;
      }
      case 'windmill': {
        const m = BL.makeWindmillTower();
        const p = place(m, x, z, rot);
        const blades = new THREE.Mesh(BL.makeWindmillBlades(), MAT.vc);
        blades.castShadow = true;
        const hub = toWorld(x, p.y, z, rot, m.anchors.hub);
        const piv = new THREE.Group();
        piv.position.copy(hub);
        piv.rotation.y = rot;
        piv.add(blades);
        scene.add(piv);
        out.animated.push({ update: (dt) => (blades.rotation.z += dt * 0.55) });
        M.circles.push({ x, z, r: 2.8, fill: '#3a3052', tall: true });
        break;
      }
      case 'witchhut': {
        const m = BL.makeWitchHut();
        const y = Math.max(hAt(x, z), WATER_LEVEL - 0.2);
        const p = place(m, x, z, rot, { y });
        out.smoke.push({ ...toWorld(x, p.y, z, rot, m.anchors.smoke), green: true });
        mapRect(x, z, rot, m.map.w, m.map.d, m.map.roof);
        // caldeirão da bruxa na frente
        const cz = toWorld(x, 0, z, rot, V3(3.6, 0, 5.2));
        const cm = SM.makeCauldron(3);
        const cp = place(cm, cz.x, cz.z, 0, { y: Math.max(hAt(cz.x, cz.z), 0.1) });
        out.anchors.cauldron = V3(cz.x, cp.y + 0.85, cz.z);
        out.lights.push({ x: cz.x, z: cz.z, r: 5, i: 0.9 });
        break;
      }
      case 'gazebo': {
        const m = BL.makeGazebo();
        place(m, x, z, rot);
        M.circles.push({ x, z, r: 3.6, fill: '#4a4a6a' });
        const wm = TR.makeWillow(3, 1.1);
        place(wm, x - 5.5, z + 2.5, 0.4, { collide: true });
        M.trees.push({ x: x - 5.5, z: z + 2.5, r: 3.2, kind: 'willow' });
        break;
      }
      case 'lighthouse': {
        const m = BL.makeLighthouse();
        const p = place(m, x, z, rot);
        const lamp = toWorld(x, p.y, z, rot, m.anchors.lamp);
        const beamGeo = new THREE.ConeGeometry(2.4, 30, 16, 1, true).translate(0, -15, 0).rotateZ(Math.PI / 2);
        const beamMat = new THREE.ShaderMaterial({
          uniforms: { opacity: { value: 0.1 } },
          vertexShader: 'varying float vT; varying vec3 vN; varying vec3 vV; void main(){ vT = clamp(position.x / 30.0, 0.0, 1.0); vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
          fragmentShader: 'uniform float opacity; varying float vT; varying vec3 vN; varying vec3 vV; void main(){ float edge = pow(abs(dot(vN, vV)), 2.0); float a = opacity * pow(1.0 - vT, 2.5) * edge; gl_FragColor = vec4(vec3(1.0, 0.9, 0.6) * a, 1.0); }',
          transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.layers.set(LAYER_FX);
        const piv = new THREE.Group();
        piv.position.copy(lamp);
        piv.add(beam);
        const beam2 = beam.clone();
        beam2.rotation.y = Math.PI;
        piv.add(beam2);
        scene.add(piv);
        // lit: o farol fica apagado até a missão do casamento (questWorld.applyState)
        const lh = (out.anchors.lighthouse = { lamp, door: toWorld(x, p.y, z, rot, m.anchors.door), lit: true });
        out.animated.push({ update: (dt, t, g) => { piv.rotation.y += dt * 0.6; beamMat.uniforms.opacity.value = 0.22 * (g?.dayNight?.lamps ?? 1) * (lh.lit ? 1 : 0); piv.visible = beamMat.uniforms.opacity.value > 0.01; } });
        M.circles.push({ x, z, r: 2.4, fill: '#8a2a2e', tall: true });
        break;
      }
      case 'skullrock': {
        const m = BL.makeSkullRock();
        place(m, x, z, rot, { yOff: -0.6 });
        M.circles.push({ x, z, r: 4.2, fill: '#8a8894' });
        break;
      }
      case 'spiral': {
        const m = BL.makeSpiralHill();
        place(m, x, z, rot, { yOff: -0.8, scale: 1.35 });
        M.circles.push({ x, z, r: 6, fill: '#4d6a62', spiral: true, rot });
        break;
      }
      case 'crypt': {
        const m = BL.makeCrypt(Math.round(x * 3));
        place(m, x, z, rot);
        mapRect(x, z, rot, m.map.w, m.map.d, m.map.roof);
        break;
      }
      default:
        break;
    }
  }

  // ----- casas da vila -----
  for (const hp of plan.houses) {
    const m = BL.makeHouse(hp.seed, { w: hp.w, d: hp.d });
    const p = place(m, hp.x, hp.z, hp.rot);
    if (m.anchors.smoke) out.smoke.push(toWorld(hp.x, p.y, hp.z, hp.rot, m.anchors.smoke));
    out.lights.push({ ...toWorld(hp.x, p.y, hp.z, hp.rot, V3(0.8, 2.4, hp.d / 2 + 0.3)), r: 4.5, i: 0.75 });
    mapRect(hp.x, hp.z, hp.rot, m.map.w, m.map.d, m.map.roof);
    // cerquinha branca torta em algumas
    if (rng.chance(0.45)) {
      const fence = SM.makePicketFence(2.2, hp.seed);
      const c = Math.cos(hp.rot), s = Math.sin(hp.rot);
      const fz = hp.d / 2 + 3.2;
      for (let k = -2; k <= 2; k++) {
        if (k === 0) continue;
        const lx = k * 2.2 + (k > 0 ? -0.6 : 0.6);
        const wx = hp.x + lx * c + fz * s, wz = hp.z - lx * s + fz * c;
        if (T.roadDistAt(wx, wz) < 0.6) continue;
        place(fence, wx, wz, hp.rot, { collide: false });
        C.addSegment(wx - 1.1 * c, wz + 1.1 * s, wx + 1.1 * c, wz - 1.1 * s, 0.15);
        M.lines.push({ x0: wx - 1.1 * c, z0: wz + 1.1 * s, x1: wx + 1.1 * c, z1: wz - 1.1 * s, c: '#b8b0a0', w: 0.5 });
      }
    }
  }

  // ----- decks (píer, ponte, passarela) -----
  for (const d of world.decks) {
    const m = BL.makeDeck(d, T);
    batch.addModel(m, new THREE.Matrix4());
    M.decks.push({ pts: d.samples.map((s) => [s.x, s.z]), w: d.w });
    if (d.kind === 'bridge' || d.kind === 'pier') {
      // corrimãos como colisão
      const sm = d.samples;
      // corrimão só no meio: as pontas ficam abertas para entrar de qualquer ângulo
      for (let i = 5; i < sm.length - 6; i += 2) {
        const a = sm[i], b = sm[Math.min(i + 2, sm.length - 1)];
        const nx = -(b.z - a.z), nz = b.x - a.x;
        const l = Math.hypot(nx, nz) || 1;
        for (const s of [-1, 1]) {
          const ox = (nx / l) * d.hw * s, oz = (nz / l) * d.hw * s;
          const push = 0.25 * s;
          C.addSegment(a.x + ox + (nx / l) * push, a.z + oz + (nz / l) * push, b.x + ox + (nx / l) * push, b.z + oz + (nz / l) * push, 0.5, { y0: -5, y1: 6 });
        }
      }
    }
  }
  // ponte de pedra sobre o riacho (onde as estradas cruzam)
  for (const road of T.roads) {
    for (let i = 0; i < road.samples.length - 1; i++) {
      const p = road.samples[i];
      if (T.streamDistAt(p.x, p.z) < 0.5) {
        const br = makeStoneBridge(Math.atan2(p.tx, p.tz), road.w);
        const gy = Math.max(0.35, (hAt(p.x - p.tx * 6, p.z - p.tz * 6) + hAt(p.x + p.tx * 6, p.z + p.tz * 6)) / 2);
        batch.addModel(br, matrixFrom(p.x, gy - 0.6, p.z, Math.atan2(p.tx, p.tz)));
        world.decks.push({ id: 'ponte-' + road.id, kind: 'bridge', hw: road.w / 2 + 0.2, h: gy + 0.15, arch: 0.5, samples: bridgeSamples(p, 7) });
        M.decks.push({ pts: [[p.x - p.tx * 6, p.z - p.tz * 6], [p.x + p.tx * 6, p.z + p.tz * 6]], w: road.w + 0.6, stone: true });
        i += 20;
      }
    }
  }

  // ----- praça -----
  progress(0.45, 'Montando a feira da praça…');
  {
    const stallCols = [['#5a2a6a', '#e6dcc6'], ['#1e1a22', '#d8662a'], ['#2e4a5a', '#e0d0b0'], ['#6a2a2a', '#1e1a22']];
    [[42, 12.5], [128, 12.8], [-62, 13], [-118, 12.5]].forEach(([deg, r], i) => {
      const a = (deg * Math.PI) / 180;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const st = BL.makeStall(i, ...stallCols[i]);
      place(st, x, z, Math.atan2(-x, -z));
      mapRect(x, z, Math.atan2(-x, -z), st.map.w, st.map.d, st.map.roof);
    });
    const bench = SM.makeBench();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.5;
      const x = FOUNTAIN.x + Math.cos(a) * 6.2, z = FOUNTAIN.z + Math.sin(a) * 6.2;
      if (Math.hypot(x - CLOCK_TOWER.x, z - CLOCK_TOWER.z) < 5) continue;
      place(bench, x, z, Math.atan2(FOUNTAIN.x - x, FOUNTAIN.z - z) + Math.PI);
    }
    // cordões de luzinhas partindo do relógio
    out.stringLights = [];
    const top = V3(CLOCK_TOWER.x, hAt(0, 0) + 12, CLOCK_TOWER.z);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + 0.3;
      out.stringLights.push({ a: top.clone().add(V3(Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2)), b: V3(Math.cos(a) * 17.5, hAt(0, 0) + 4.2, CLOCK_TOWER.z + Math.sin(a) * 17.5 + 4) });
    }
  }

  // ----- postes de luz ao longo das estradas -----
  progress(0.5, 'Pendurando lanternas…');
  const lampModel = SM.makeLampPost();
  const lamps = new InstanceSet(scene, 'postes', [lampModel], { cell: 96 });
  const lampPos = [];
  const addLamp = (x, z, rot) => {
    if (lampPos.some((l) => Math.hypot(l.x - x, l.z - z) < 9)) return;
    if (C.overlaps(x, z, 0.6)) return;
    if (T.roadDistAt(x, z) < 0.4) return;
    const y = hAt(x, z);
    if (y < 0.3) return;
    lamps.add(0, matrixFrom(x, y, z, rot));
    regColliders(lampModel, x, y, z, rot);
    const L = toWorld(x, y, z, rot, lampModel.anchors.light);
    lampPos.push(L);
    out.lights.push({ x: L.x, z: L.z, r: 7.5, i: 1, y: L.y });
    M.lamps.push({ x, z });
  };
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.18;
    addLamp(Math.cos(a) * 16.5, Math.sin(a) * 16.5, -a + Math.PI);
  }
  for (const road of T.roads) {
    if (road.id.startsWith('cem-')) continue;
    const step = road.id === 'farol' || road.id === 'bosque' ? 22 : 17;
    let side = 1;
    for (let i = 6; i < road.samples.length - 3; i += step) {
      const p = road.samples[i];
      side = -side;
      const nx = -p.tz * side, nz = p.tx * side;
      const x = p.x + nx * (road.hw + 1.1), z = p.z + nz * (road.hw + 1.1);
      if (Math.hypot(x, z) < 19) continue;
      addLamp(x, z, Math.atan2(-nx, -nz) + Math.PI / 2);
    }
  }
  out.lampPositions = lampPos;

  // ----- cemitério -----
  progress(0.55, 'Cavando covas…');
  {
    const graves = [0, 1, 2, 3, 4, 5].map((k) => SM.makeGrave(k, k + 1));
    const gset = new InstanceSet(scene, 'lapides', graves, { cell: 64 });
    const candles = SM.makeCandles(1);
    const cset = new InstanceSet(scene, 'velas', [candles], { cell: 64 });
    for (let lz = -15; lz <= 14; lz += 2.9) {
      for (let lx = -22; lx <= 22; lx += 2.3) {
        if (Math.abs(lx) < 2.2 || Math.abs(lz - 1.2) < 2.0) continue; // caminhos
        if (rng.chance(0.18)) continue;
        const jx = lx + rng.range(-0.3, 0.3), jz = lz + rng.range(-0.3, 0.3);
        const [x, z] = cemToWorld(jx, jz);
        if (C.overlaps(x, z, 0.8)) continue;
        if (Object.values(NPC_SPOTS).some((s) => Math.hypot(s.x - x, s.z - z) < 3.2)) continue;
        const v = rng.int(0, 5);
        const rot = CEMETERY.rot + (jz < 1 ? 0 : Math.PI) + rng.range(-0.25, 0.25);
        const y = hAt(x, z);
        gset.add(v, matrixFrom(x, y - 0.05, z, rot, rng.range(0.9, 1.15), rng.range(-0.12, 0.12), rng.range(-0.12, 0.12)));
        regColliders(graves[v], x, y, z, rot);
        M.graves.push({ x, z, rot });
        if (rng.chance(0.2)) {
          const cx = x + Math.sin(rot) * 0.55, cz = z + Math.cos(rot) * 0.55;
          cset.add(0, matrixFrom(cx, y, cz, rng.range(0, TAU)));
          out.lights.push({ x: cx, z: cz, y: y + 0.35, r: 2.2, i: 0.45, candle: true });
        }
      }
    }
    // cerca de ferro com portão no lado +z
    const fence = SM.makeIronFence(2.4, 1.35, 3);
    const fset = new InstanceSet(scene, 'cercaferro', [fence], { cell: 64 });
    const pillar = SM.makePillar(2, 'skull');
    const pillarB = SM.makePillar(3, 'ball', 1.5);
    const corners = [[-CEMETERY.hw, -CEMETERY.hd], [CEMETERY.hw, -CEMETERY.hd], [CEMETERY.hw, CEMETERY.hd], [-CEMETERY.hw, CEMETERY.hd]];
    for (let e = 0; e < 4; e++) {
      const [ax, az] = corners[e], [bx, bz] = corners[(e + 1) % 4];
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.round(len / 2.4);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const lx = lerp(ax, bx, t), lz = lerp(az, bz, t);
        if (e === 2 && Math.abs(lx) < 3.2) continue; // portão
        const [x, z] = cemToWorld(lx, lz);
        const segRot = CEMETERY.rot + Math.atan2(-(bz - az), bx - ax);
        const y = hAt(x, z);
        fset.add(0, matrixFrom(x, y - 0.05, z, segRot, [len / n / 2.4, 1, 1], 0, rng.range(-0.04, 0.04)));
        if (i % 4 === 0) place(pillarB, x, z, segRot);
      }
      const [cx, cz] = cemToWorld(ax, az);
      place(pillar, cx, cz, CEMETERY.rot);
      const [wx0, wz0] = cemToWorld(ax, az), [wx1, wz1] = cemToWorld(bx, bz);
      if (e === 2) {
        const [g0x, g0z] = cemToWorld(3.2, CEMETERY.hd), [g1x, g1z] = cemToWorld(-3.2, CEMETERY.hd);
        C.addSegment(wx0, wz0, g0x, g0z, 0.25);
        C.addSegment(g1x, g1z, wx1, wz1, 0.25);
        M.lines.push({ x0: wx0, z0: wz0, x1: g0x, z1: g0z, c: '#16121c', w: 0.8 }, { x0: g1x, z0: g1z, x1: wx1, z1: wz1, c: '#16121c', w: 0.8 });
      } else {
        C.addSegment(wx0, wz0, wx1, wz1, 0.25);
        M.lines.push({ x0: wx0, z0: wz0, x1: wx1, z1: wz1, c: '#16121c', w: 0.8 });
      }
    }
    // portão com placa
    const [gx, gz] = cemToWorld(0, CEMETERY.hd);
    const gate = BL.makeGateArch(6.2, 'iron');
    const gp = place(gate, gx, gz, CEMETERY.rot);
    for (const l of gate.anchors.lanterns) out.lights.push({ ...toWorld(gx, gp.y, gz, CEMETERY.rot, l), r: 5, i: 0.9, lantern: true });
    const board = SG.makeTextBoard(10, 0.55);
    batch.addModel(board, matrixFrom(gx, gp.y + 4.05, gz, CEMETERY.rot).multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.08)));
    const rule = SG.makeStandingSign(14, 3, 0.36);
    const [rx, rz] = cemToWorld(5.5, CEMETERY.hd + 2.5);
    place(rule, rx, rz, CEMETERY.rot + 0.2);
    // covas abertas, pás, caixões
    const coffin = SM.makeCoffin(2);
    const [cx1, cz1] = cemToWorld(-12, 25);
    place(coffin, cx1 + 2.8, cz1 - 1.5, CEMETERY.rot + 0.3, { rx: -0.25 });
    place(SM.makeCoffin(5), cx1 + 3.8, cz1 - 0.6, CEMETERY.rot + 0.1, { rx: -0.2 });
    out.anchors.cemGate = V3(gx, hAt(gx, gz), gz);
    gset.build();
    cset.build();
    fset.build();
  }

  // ----- sítio: campos, abóboras, milho, cercas -----
  progress(0.6, 'Plantando abóboras…');
  {
    const pumpkins = [0, 1, 2].map((k) => SM.makePumpkin(k, 0.36 + k * 0.08));
    const jack = SM.makePumpkin(9, 0.42, true);
    const pset = new InstanceSet(scene, 'aboboras', [...pumpkins, jack], { cell: 64 });
    const f = PUMPKIN_FIELD;
    for (let lz = -f.hd + 1.2; lz < f.hd - 0.8; lz += 1.9) {
      for (let lx = -f.hw + 1; lx < f.hw - 0.8; lx += rng.range(1.6, 2.6)) {
        if (Math.hypot(lx, lz) < 3.2) continue; // espantalho no meio
        if (rng.chance(0.25)) continue;
        const c = Math.cos(f.rot), s = Math.sin(f.rot);
        const x = f.x + lx * c + lz * s, z = f.z - lx * s + lz * c;
        const v = rng.chance(0.06) ? 3 : rng.int(0, 2);
        pset.add(v, matrixFrom(x, hAt(x, z) - 0.05, z, rng.range(0, TAU), rng.range(0.8, 1.3)));
        M.pumpkins.push({ x, z });
      }
    }
    // abóboras-lanterna pela vila (portas e praça)
    for (const hp of plan.houses) {
      if (!rng.chance(0.55)) continue;
      const c = Math.cos(hp.rot), s = Math.sin(hp.rot);
      const lx = rng.sign() * rng.range(0.9, 1.6), lz = hp.d / 2 + 0.7;
      const x = hp.x + lx * c + lz * s, z = hp.z - lx * s + lz * c;
      pset.add(3, matrixFrom(x, hAt(x, z), z, hp.rot + rng.range(-0.4, 0.4), rng.range(0.7, 0.95)));
      out.lights.push({ x, z, r: 2.5, i: 0.5 });
    }
    pset.build();
    // milharal seco
    const corn = makeCorn();
    const cset = new InstanceSet(scene, 'milho', [corn], { cell: 64, cast: true });
    const g = CROP_FIELD;
    for (let lz = -g.hd + 0.6; lz < g.hd - 0.4; lz += 1.1) {
      for (let lx = -g.hw + 0.5; lx < g.hw - 0.3; lx += 0.95) {
        if (rng.chance(0.12)) continue;
        const c = Math.cos(g.rot), s = Math.sin(g.rot);
        const x = g.x + lx * c + lz * s + rng.range(-0.2, 0.2), z = g.z - lx * s + lz * c + rng.range(-0.2, 0.2);
        cset.add(0, matrixFrom(x, hAt(x, z), z, rng.range(0, TAU), rng.range(0.8, 1.2), rng.range(-0.1, 0.1), rng.range(-0.1, 0.1)));
      }
    }
    cset.build();
    // cercas de madeira nos campos
    const wf = SM.makeWoodFence(2.6, 1);
    const wset = new InstanceSet(scene, 'cercamadeira', [wf], { cell: 64 });
    for (const fld of [PUMPKIN_FIELD, CROP_FIELD]) {
      const hw = fld.hw + 0.8, hd = fld.hd + 0.8;
      const cs = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
      const c = Math.cos(fld.rot), s = Math.sin(fld.rot);
      const W = (lx, lz) => [fld.x + lx * c + lz * s, fld.z - lx * s + lz * c];
      for (let e = 0; e < 4; e++) {
        const [ax, az] = cs[e], [bx, bz] = cs[(e + 1) % 4];
        const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / 2.6);
        for (let i = 0; i < n; i++) {
          const t = (i + 0.5) / n;
          const lx = lerp(ax, bx, t), lz = lerp(az, bz, t);
          if (Math.abs(lx) < 2.2 && e === 0) continue; // entrada norte
          if (rng.chance(0.08)) continue;
          const [x, z] = W(lx, lz);
          const rot = fld.rot + Math.atan2(-(bz - az), bx - ax);
          wset.add(0, matrixFrom(x, hAt(x, z), z, rot, [len / n / 2.6, 1, 1], 0, rng.range(-0.08, 0.08)));
          C.addSegment(x - (Math.cos(rot) * len) / n / 2, z + (Math.sin(rot) * len) / n / 2, x + (Math.cos(rot) * len) / n / 2, z - (Math.sin(rot) * len) / n / 2, 0.2);
        }
        const [x0, z0] = W(ax, az), [x1, z1] = W(bx, bz);
        M.lines.push({ x0, z0, x1, z1, c: '#5a4232', w: 0.5 });
      }
    }
    wset.build();
    // portão do sítio, feno, carroça, poço
    const arch = BL.makeGateArch(5.4, 'wood');
    const ap = place(arch, 6, 79.5, Math.PI);
    for (const l of arch.anchors.lanterns) out.lights.push({ ...toWorld(6, ap.y, 79.5, Math.PI, l), r: 5, i: 0.9, lantern: true });
    batch.addModel(SG.makeTextBoard(11, 0.5), matrixFrom(6, ap.y + 3.95, 79.5, Math.PI).multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.1)));
    for (const [x, z, r, round] of [[22, 112, 0.3, true], [24, 110, 1.2, true], [40, 114, 0.2, false], [41, 115.2, 0.1, false], [40.5, 114.6, 1.4, false], [-2, 116, 0.5, true]]) {
      const hb = SM.makeHayBale(1, round);
      place(hb, x, z, r, { yOff: round ? 0 : 0 });
    }
    place(SM.makeCart(), 16, 108, 0.6);
    place(SM.makeWell(), -20, 114, 0);
    M.circles.push({ x: -20, z: 114, r: 1.1, fill: '#5a5868' });
    place(SG.makeStandingSign(16, 5, 0.34), 0, 83, Math.PI + 0.3);
    // ninho + braseiros (o fogo acende na missão)
    const nest = BL.makeNest();
    place(nest, NEST.x, NEST.z, 0, { collide: false });
    M.circles.push({ x: NEST.x, z: NEST.z, r: 1.8, fill: '#7a5a34' });
    const bz = BL.makeBrazier();
    const coalMat = flameMat('#3a2018', '#ff7a2a', 3.5);
    coalMat.userData.base = coalMat.color.clone();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      const x = NEST.x + Math.cos(a) * 3.2, z = NEST.z + Math.sin(a) * 3.2;
      const p = place(bz.base, x, z, a);
      const coals = new THREE.Mesh(bz.coals, new THREE.MeshBasicMaterial({ color: '#2a1810' }));
      coals.position.set(x, p.y, z);
      coals.rotation.y = a;
      scene.add(coals);
      C.addCircle(x, z, 0.4);
      out.braziers.push({ mesh: coals, pos: V3(x, p.y + 1.3, z), lit: false });
    }
  }

  // ----- mansão: portão, cerca, topiarias -----
  {
    const g = MANOR_GATE;
    const gate = BL.makeGateArch(5.6, 'iron');
    const rot = Math.atan2(103 - 93, 12 - 16);
    const gp = place(gate, g.x, g.z, rot);
    for (const l of gate.anchors.lanterns) out.lights.push({ ...toWorld(g.x, gp.y, g.z, rot, l), r: 5, i: 0.9, lantern: true, color: '#ff8a6a' });
    batch.addModel(SG.makeTextBoard(17, 0.5), matrixFrom(g.x, gp.y + 4.05, g.z, rot).multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.1)));
    place(SG.makeStandingSign(18, 2, 0.32), g.x + 4.2 * Math.cos(rot) + 1.5 * Math.sin(rot), g.z - 4.2 * Math.sin(rot) + 1.5 * Math.cos(rot), rot + 0.35);
    const fence = SM.makeIronFence(2.4, 1.6, 8);
    const fset = new InstanceSet(scene, 'cercamansao', [fence], { cell: 64 });
    const c = Math.cos(rot), s = Math.sin(rot);
    for (let i = 1; i <= 7; i++) {
      for (const sd of [-1, 1]) {
        const lx = sd * (2.8 + i * 2.4 - 1.2);
        const x = g.x + lx * c, z = g.z - lx * s;
        fset.add(0, matrixFrom(x, hAt(x, z) - 0.05, z, rot));
      }
    }
    for (const sd of [-1, 1]) {
      const x0 = g.x + sd * 2.8 * c, z0 = g.z - sd * 2.8 * s, x1 = g.x + sd * 19.6 * c, z1 = g.z - sd * 19.6 * s;
      C.addSegment(x0, z0, x1, z1, 0.25);
      M.lines.push({ x0, z0, x1, z1, c: '#16121c', w: 0.8 });
    }
    fset.build();
    const top = [0, 1, 2].map((k) => TR.makeSpiralTopiary(k));
    for (let i = 0; i < 8; i++) {
      const t = (i + 0.5) / 8;
      const road = T.roads.find((r) => r.id === 'mansao');
      const sm = road.samples[Math.floor(t * (road.samples.length - 1))];
      for (const sd of [-1, 1]) {
        const x = sm.x - sm.tz * sd * 3.6, z = sm.z + sm.tx * sd * 3.6;
        if (C.overlaps(x, z, 0.9)) continue;
        place(top[(i + (sd > 0 ? 1 : 0)) % 3], x, z, rng.range(0, TAU));
        M.bushes.push({ x, z, r: 0.8, c: '#2f4a3a' });
      }
    }
  }

  // ----- pântano: passarela já existe; vitórias-régias, taboas, cogumelos -----
  progress(0.65, 'Enchendo o pântano de sapos…');
  const lily = [0, 1, 2].map((k) => SM.makeLilyPad(k));
  const lset = new InstanceSet(scene, 'vitorias', lily, { cell: 64, cast: false });
  const cat = [0, 1].map((k) => SM.makeCattails(k));
  const catSet = new InstanceSet(scene, 'taboas', cat, { cell: 64 });
  for (let i = 0; i < 2600 && lset.count < 170; i++) {
    const x = rng.range(-150, 60), z = rng.range(-135, 60);
    const depth = WATER_LEVEL - hAt(x, z);
    if (depth > 0.15 && depth < 1.6 && rng.chance(Math.hypot(x - SWAMP.x, z - SWAMP.z) < SWAMP.r * 1.1 ? 1 : 0.35)) {
      if (world.onDeck(x, z)) continue;
      lset.add(rng.int(0, 2), matrixFrom(x, WATER_LEVEL + 0.01, z, rng.range(0, TAU), rng.range(0.8, 1.4)));
    }
  }
  for (let i = 0; i < 4000 && catSet.count < 140; i++) {
    const x = rng.range(-150, 60), z = rng.range(-135, 60);
    const h = hAt(x, z);
    if (h > -0.5 && h < 0.35 && !world.onDeck(x, z) && T.roadDistAt(x, z) > 1) {
      catSet.add(rng.int(0, 1), matrixFrom(x, h, z, rng.range(0, TAU), rng.range(0.8, 1.3)));
    }
  }
  lset.build();
  catSet.build();

  // ----- árvores -----
  progress(0.7, 'Entortando árvores…');
  const deadV = [0, 1, 2, 3].map((k) => TR.makeDeadTree(k + 1, 1));
  const faceV = [TR.makeDeadTree(21, 1.1, true)];
  const pineV = [0, 1, 2].map((k) => TR.makePine(k + 1));
  const lolV = [0, 1].map((k) => TR.makeLollipop(k + 1));
  const swampV = [0, 1].map((k) => TR.makeSwampTree(k + 1));
  const sets = {
    dead: new InstanceSet(scene, 'arvoresmortas', deadV, { cell: 96 }),
    face: new InstanceSet(scene, 'arvoresrosto', faceV, { cell: 96 }),
    pine: new InstanceSet(scene, 'pinheiros', pineV, { cell: 96 }),
    lol: new InstanceSet(scene, 'pirulitos', lolV, { cell: 96 }),
    swamp: new InstanceSet(scene, 'arvorespantano', swampV, { cell: 96 }),
  };
  const treePts = [];
  const treeOk = (x, z, r) => {
    for (const t of treePts) if (Math.abs(t.x - x) < r + t.r && Math.hypot(t.x - x, t.z - z) < r + t.r) return false;
    return true;
  };
  const placeTree = (kind, x, z, scale, forceRot) => {
    const set = sets[kind];
    const variants = set.variants;
    const v = rng.int(0, variants.length - 1);
    const y = hAt(x, z);
    const rot = forceRot ?? rng.range(0, TAU);
    set.add(v, matrixFrom(x, y - 0.1, z, rot, scale, rng.range(-0.05, 0.05), rng.range(-0.05, 0.05)));
    regColliders(variants[v], x, y, z, rot, scale);
    treePts.push({ x, z, r: 2.2 * scale });
    M.trees.push({ x, z, r: (kind === 'pine' ? 2.2 : kind === 'lol' ? 1.8 : 1.6) * scale, kind });
  };
  for (let i = 0; i < 26000; i++) {
    const x = rng.range(-HALF + 6, HALF - 6), z = rng.range(-HALF + 6, HALF - 6);
    const edge = Math.max(Math.abs(x), Math.abs(z));
    const dCenter = Math.hypot(x, z);
    const inWoods = Math.hypot(x - WOODS.x, z - WOODS.z) < WOODS.r;
    const inSwamp = Math.hypot(x - SWAMP.x, z - SWAMP.z) < SWAMP.r * 1.1;
    let dens = 0.05;
    if (dCenter < 30) dens = 0;
    else if (dCenter < 70) dens = 0.06;
    if (inWoods) dens = 0.9;
    if (inSwamp) dens = 0.3;
    if (edge > 128) dens = 0.55;
    if (edge > 152) dens = 0.25;
    if (inCemetery(x, z, 1)) dens = 0.04;
    if (inRect(PUMPKIN_FIELD, x, z, 3) || inRect(CROP_FIELD, x, z, 3)) dens = 0;
    if (Math.hypot(x - VENTS.x, z - VENTS.z) < VENTS.r) dens = 0.02;
    if (Math.hypot(x - MANOR.x, z - MANOR.z) < 16) dens = 0;
    if (!rng.chance(dens)) continue;
    const h = hAt(x, z);
    if (h < (inSwamp ? -0.45 : 0.4)) continue;
    if (h > 40) continue;
    if (T.roadDistAt(x, z) < 2.2) continue;
    if (T.streamDistAt(x, z) < 1.5) continue;
    if (world.onDeck(x, z)) continue;
    const sc = rng.range(0.85, 1.3) * (edge > 128 ? 1.25 : 1);
    if (!treeOk(x, z, 2.2 * sc)) continue;
    if (C.overlaps(x, z, 2.2)) continue;
    const nrm = T.normalAt(x, z);
    if (nrm.y < 0.7) continue;
    let kind = 'dead';
    const r = rng.next();
    if (inSwamp && h < 0.6) kind = r < 0.8 ? 'swamp' : 'dead';
    else if (inWoods) kind = r < 0.1 ? 'face' : r < 0.62 ? 'dead' : r < 0.9 ? 'pine' : 'lol';
    else if (edge > 126) kind = r < 0.55 ? 'pine' : 'dead';
    else if (dCenter < 75) kind = r < 0.45 ? 'lol' : r < 0.9 ? 'dead' : 'pine';
    else kind = r < 0.06 ? 'face' : r < 0.7 ? 'dead' : 'pine';
    placeTree(kind, x, z, sc);
    if (treePts.length > 420) break;
  }
  // algumas árvores com rosto em pontos estratégicos
  for (const [x, z, rot] of [[-70, 84, 0.8], [-96, 108, 2.2], [66, -80, 3.5], [-88, -82, 0.4], [-60, 110, -0.6]]) {
    if (treeOk(x, z, 2) && !C.overlaps(x, z, 2)) placeTree('face', x, z, 1.1, rot);
  }
  for (const s of Object.values(sets)) s.build();

  // ----- pedras, arbustos, tocos, troncos, cogumelos, caveiras -----
  progress(0.78, 'Espalhando pedras e cogumelos…');
  const rockV = [1, 2, 3, 4].map((k) => SM.makeRock(k, 0.5 + k * 0.18));
  const rset = new InstanceSet(scene, 'pedras', rockV, { cell: 96 });
  const bushV = [SM.makeBush(1), SM.makeBush(2), SM.makeBush(3, true)];
  const bset = new InstanceSet(scene, 'arbustos', bushV, { cell: 96 });
  const mushV = [SM.makeMushroom(1), SM.makeMushroom(2), SM.makeMushroom(3, GLOW.mushroom), SM.makeMushroom(4, GLOW.mushroomPink)];
  const mset = new InstanceSet(scene, 'cogumelos', mushV, { cell: 96, cast: false });
  const stumpV = [SM.makeStump(1), SM.makeLog(2), SM.makeLog(3)];
  const sset = new InstanceSet(scene, 'tocos', stumpV, { cell: 96 });
  const skullV = [SM.makeSkull(1, 1.2), SM.makeBonePile(2)];
  const kset = new InstanceSet(scene, 'caveiras', skullV, { cell: 96, cast: false });
  const tryScatter = (n, fn) => {
    for (let i = 0; i < n; i++) fn(rng.range(-PLAY_LIMIT, PLAY_LIMIT), rng.range(-PLAY_LIMIT, PLAY_LIMIT));
  };
  tryScatter(4200, (x, z) => {
    if (rset.count > 230) return;
    const h = hAt(x, z);
    if (h < -0.3 || T.roadDistAt(x, z) < 1.2 || Math.hypot(x, z) < 22 || world.onDeck(x, z)) return;
    if (inRect(PUMPKIN_FIELD, x, z, 1) || inRect(CROP_FIELD, x, z, 1)) return;
    const edge = Math.max(Math.abs(x), Math.abs(z));
    const nearVents = Math.hypot(x - VENTS.x, z - VENTS.z) < VENTS.r + 6;
    if (!rng.chance(edge > 120 ? 0.6 : nearVents ? 0.9 : 0.14)) return;
    const v = rng.int(0, 3);
    const s = rng.range(0.6, 1.5) * (nearVents ? 1.3 : 1);
    if (C.overlaps(x, z, s)) return;
    const rot = rng.range(0, TAU);
    rset.add(v, matrixFrom(x, h - 0.15 * s, z, rot, s), nearVents ? '#b07a5a' : null);
    regColliders(rockV[v], x, h, z, rot, s);
    M.rocks.push({ x, z, r: s * 0.8 });
  });
  tryScatter(3000, (x, z) => {
    if (bset.count > 200) return;
    const h = hAt(x, z);
    if (h < 0.3 || T.roadDistAt(x, z) < 1.5 || Math.hypot(x, z) < 21 || world.onDeck(x, z)) return;
    if (inRect(PUMPKIN_FIELD, x, z, 1) || inRect(CROP_FIELD, x, z, 1) || inCemetery(x, z, 0)) return;
    const inWoods = Math.hypot(x - WOODS.x, z - WOODS.z) < WOODS.r + 8;
    if (!rng.chance(inWoods ? 0.7 : 0.18)) return;
    if (C.overlaps(x, z, 1)) return;
    const v = rng.chance(0.3) ? 2 : rng.int(0, 1);
    const rot = rng.range(0, TAU);
    const s = rng.range(0.7, 1.3);
    bset.add(v, matrixFrom(x, h - 0.1, z, rot, s));
    if (v !== 2) regColliders(bushV[v], x, h, z, rot, s * 0.7);
    M.bushes.push({ x, z, r: 0.9 * s, c: v === 2 ? '#3a2e36' : '#35524a' });
  });
  tryScatter(2500, (x, z) => {
    if (mset.count > 260) return;
    const h = hAt(x, z);
    if (h < 0.05 || T.roadDistAt(x, z) < 1 || world.onDeck(x, z)) return;
    const inWoods = Math.hypot(x - WOODS.x, z - WOODS.z) < WOODS.r + 5;
    const inSwamp = Math.hypot(x - SWAMP.x, z - SWAMP.z) < SWAMP.r + 5;
    if (!rng.chance(inWoods ? 0.8 : inSwamp ? 0.7 : 0.05)) return;
    const v = inSwamp || inWoods ? (rng.chance(0.55) ? rng.int(2, 3) : rng.int(0, 1)) : rng.int(0, 1);
    mset.add(v, matrixFrom(x, h - 0.02, z, rng.range(0, TAU), rng.range(0.8, 1.6)));
    if (v >= 2) out.lights.push({ x, z, r: 2.2, i: 0.35, c: 'teal' });
  });
  tryScatter(1500, (x, z) => {
    if (sset.count > 40) return;
    const h = hAt(x, z);
    if (h < 0.3 || T.roadDistAt(x, z) < 2 || Math.hypot(x, z) < 30 || world.onDeck(x, z)) return;
    const inWoods = Math.hypot(x - WOODS.x, z - WOODS.z) < WOODS.r + 10;
    if (!rng.chance(inWoods ? 0.5 : 0.04)) return;
    const v = rng.int(0, 2);
    const rot = rng.range(0, TAU);
    if (C.overlaps(x, z, 1.8)) return;
    sset.add(v, matrixFrom(x, h - 0.05, z, rot));
    regColliders(stumpV[v], x, h, z, rot);
  });
  tryScatter(1200, (x, z) => {
    if (kset.count > 36) return;
    const h = hAt(x, z);
    if (h < 0.2 || T.roadDistAt(x, z) < 0.8 || world.onDeck(x, z)) return;
    const special = inCemetery(x, z, 4) || Math.hypot(x - SWAMP.x, z - SWAMP.z) < SWAMP.r || Math.hypot(x - WOODS.x, z - WOODS.z) < WOODS.r;
    if (!rng.chance(special ? 0.25 : 0.01)) return;
    kset.add(rng.int(0, 1), matrixFrom(x, h, z, rng.range(0, TAU), rng.range(0.8, 1.2), rng.range(-0.3, 0.3)));
  });
  for (const s of [rset, bset, mset, sset, kset]) s.build();

  // ----- barris e caixotes pela vila -----
  {
    const barrel = SM.makeBarrel(), crate = SM.makeCrate();
    const iset = new InstanceSet(scene, 'barris', [barrel, crate], { cell: 96 });
    for (const hp of plan.houses) {
      const n = rng.int(0, 3);
      const c = Math.cos(hp.rot), s = Math.sin(hp.rot);
      for (let i = 0; i < n; i++) {
        const lx = rng.sign() * (hp.w / 2 + rng.range(0.6, 1.2)), lz = rng.range(-hp.d / 2, hp.d / 2);
        const x = hp.x + lx * c + lz * s, z = hp.z - lx * s + lz * c;
        if (C.overlaps(x, z, 0.5) || T.roadDistAt(x, z) < 0.6) continue;
        const v = rng.int(0, 1);
        const rot = rng.range(0, TAU);
        iset.add(v, matrixFrom(x, hAt(x, z), z, rot, rng.range(0.85, 1.1)));
        regColliders(v ? crate : barrel, x, hAt(x, z), z, rot);
      }
    }
    iset.build();
  }

  // ----- placas de direção -----
  const post = (x, z, arrows, seed) => {
    const m = SG.makeSignpost(arrows, seed);
    place(m, x, z, 0);
  };
  const toward = (fx, fz, tx, tz) => Math.atan2(-(tz - fz), tx - fx);
  post(-20, -6, [{ text: 6, yaw: toward(-20, -6, -96, -92) }, { text: 2, yaw: toward(-20, -6, -110, 20) }], 1);
  post(20, -7, [{ text: 1, yaw: toward(20, -7, 62, -52) }, { text: 4, yaw: toward(20, -7, 110, 8) }, { text: 5, yaw: toward(20, -7, 3, -80) }], 2);
  post(5, 24, [{ text: 3, yaw: toward(5, 24, 6, 80) }, { text: 7, yaw: toward(5, 24, -70, 95) }], 3);
  post(33, -86, [{ text: 9, yaw: toward(33, -86, 47, -124) }, { text: 5, yaw: toward(33, -86, 20, -105) }], 4);
  post(12, 84, [{ text: 8, yaw: toward(12, 84, 88, 106) }, { text: 0, yaw: toward(12, 84, 0, 0) }], 5);
  place(SG.makeStandingSign(12, 8, 0.42), -2.5, 27, 0.05);
  place(SG.makeStandingSign(13, 9, 0.3), 2.2, 27.4, -0.1);
  place(SG.makeStandingSign(15, 10, 0.32), -84, 18.5, 1.4);
  place(SG.makeStandingSign(19, 11, 0.32), -118, 17, 0.9);
  place(SG.makeStandingSign(21, 12, 0.3), 6.5, -72, Math.PI);
  place(SG.makeStandingSign(20, 13, 0.3), 14, 3.5, -1.4);

  // ----- grama e flores (sem colisão) -----
  progress(0.85, 'Penteando a grama…');
  const q = world.game.quality?.grass ?? 0.75;
  const grassV = [SM.makeGrassTuft(1), SM.makeGrassTuft(2), SM.makeGrassTuft(3, true)];
  const gset = new InstanceSet(scene, 'grama', grassV, { cell: 48, cast: false, colorize: true });
  const flowerV = [SM.makeFlowers(1), SM.makeFlowers(2)];
  const flset = new InstanceSet(scene, 'flores', flowerV, { cell: 48, cast: false });
  const col = new THREE.Color();
  const cAttr = T.geometry.attributes.color;
  const tcol = (x, z) => {
    const ix = Math.round((x + HALF) / T.cell), iz = Math.round((z + HALF) / T.cell);
    const i = clamp(iz, 0, T.N - 1) * T.N + clamp(ix, 0, T.N - 1);
    return col.setRGB(cAttr.getX(i), cAttr.getY(i), cAttr.getZ(i));
  };
  const target = Math.round(7000 * q);
  for (let i = 0; i < target * 4 && gset.count < target; i++) {
    const x = rng.range(-PLAY_LIMIT, PLAY_LIMIT), z = rng.range(-PLAY_LIMIT, PLAY_LIMIT);
    const h = hAt(x, z);
    if (h < 0.15 || h > 30) continue;
    const sp = T.splatAt(x, z);
    if (sp[0] > 0.42 || sp[1] > 0.4 || sp[2] > 0.45) continue;
    if (world.onDeck(x, z)) continue;
    const near = Math.hypot(x, z) < 70 ? 1 : 0.6;
    if (!rng.chance(near)) continue;
    const c = tcol(x, z).clone().multiplyScalar(1.5);
    gset.add(rng.chance(0.2) ? 2 : rng.int(0, 1), matrixFrom(x, h - 0.03, z, rng.range(0, TAU), rng.range(0.7, 1.4)), c);
    if (rng.chance(0.05)) flset.add(rng.int(0, 1), matrixFrom(x + 0.5, h, z + 0.3, rng.range(0, TAU), rng.range(0.8, 1.2)));
  }
  gset.build();
  flset.build();

  batch.build();
  T.bakeLamps(out.lights);
  world.animated.push(...out.animated);
  return out;
}

// ---------------------------------------------------------------------------
function bridgeSamples(p, half) {
  const out = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const s = (t - 0.5) * 2 * half;
    out.push({ x: p.x + p.tx * s, z: p.z + p.tz * s, t });
  }
  return out;
}

function makeStoneBridge(rot, w) {
  const b = new Builder();
  const col = SM.mossy('#8a8494', 0.5, 0.8, 4);
  const L = 14;
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const z = (t - 0.5) * L;
    const y = Math.sin(t * Math.PI) * 0.5;
    b.add(S.box(w + 0.6, 0.5, L / 12 + 0.05), col, { p: [0, 0.5 + y, z], r: [Math.cos(t * Math.PI) * -0.08, 0, 0] });
    for (const s of [-1, 1]) b.add(S.box(0.35, 0.7, L / 12 + 0.05), col, { p: [s * (w / 2 + 0.3), 1.05 + y, z] });
  }
  b.add(S.torus(2.2, 0.35, 5, 12, Math.PI), col, { p: [0, -0.8, 0], r: [0, Math.PI / 2, 0] });
  return new Model('stonebridge').part(b.build());
}

function makeCorn() {
  const b = new Builder();
  b.add(S.cylB(0.025, 0.035, 2.0, 4), '#a08a4a');
  for (let i = 0; i < 5; i++) {
    const y = 0.5 + i * 0.3, a = i * 2.3;
    b.add(S.tube([V3(0, y, 0), V3(Math.cos(a) * 0.35, y + 0.2, Math.sin(a) * 0.35), V3(Math.cos(a) * 0.6, y - 0.25, Math.sin(a) * 0.6)], (t) => 0.05 * (1 - t), 3), i % 2 ? '#b89a5a' : '#8a7a44');
  }
  b.add(S.capsule(0.05, 0.25, 2, 5), '#c9a24a', { p: [0.06, 1.3, 0], r: [0, 0, 0.3] });
  const m = new Model('corn').part(b.build());
  return m;
}
