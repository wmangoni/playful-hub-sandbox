import * as THREE from 'three';
import { LAYER_FX } from '../render/postfx.js';
import { SHARED } from '../render/toon.js';
import { getSparkleTexture } from '../entities/npc.js';
import { RNG } from '../util/rng.js';
import { TAU } from '../util/math.js';
import { WOODS, SWAMP, CEMETERY, LAKE, VENTS, PLAY_LIMIT } from '../world/layout.js';

const rng = new RNG(9090);

function puffTexture() {
  const S = 64;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.5, 'rgba(255,255,255,0.55)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  return t;
}
function batTexture() {
  // 2 quadros lado a lado: asas para cima / para baixo
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  const bat = (ox, up) => {
    g.save();
    g.translate(ox + 32, 34);
    g.beginPath();
    g.ellipse(0, 0, 5, 8, 0, 0, TAU);
    g.fill();
    g.beginPath();
    g.arc(0, -9, 4.5, 0, TAU);
    g.fill();
    g.beginPath();
    g.moveTo(-3, -12); g.lineTo(-5, -18); g.lineTo(-1, -13); g.moveTo(3, -12); g.lineTo(5, -18); g.lineTo(1, -13);
    g.fill();
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(0, -2);
      const wy = up ? -16 : 10;
      g.quadraticCurveTo(s * 14, wy - 6, s * 30, wy);
      g.quadraticCurveTo(s * 22, wy + 4, s * 20, wy + 10);
      g.quadraticCurveTo(s * 14, wy + 4, s * 10, wy + 10);
      g.quadraticCurveTo(s * 6, 2, 0, 4);
      g.fill();
    }
    g.restore();
  };
  bat(0, true);
  bat(64, false);
  return new THREE.CanvasTexture(c);
}
function leafTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.beginPath();
  g.moveTo(16, 2);
  g.quadraticCurveTo(30, 12, 16, 30);
  g.quadraticCurveTo(2, 12, 16, 2);
  g.fill();
  return new THREE.CanvasTexture(c);
}

// ---------------------------------------------------------------------------
// Partículas de CPU para efeitos pontuais
// ---------------------------------------------------------------------------
const BURST_VERT = /* glsl */ `
attribute float aSize; attribute vec4 aColor; attribute float aRot;
uniform float uScale;
varying vec4 vColor; varying float vRot;
#include <fog_pars_vertex>
void main() {
  vColor = aColor; vRot = aRot;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(0.5, -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const BURST_FRAG = /* glsl */ `
uniform sampler2D uMap;
varying vec4 vColor; varying float vRot;
#include <fog_pars_fragment>
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float c = cos(vRot), s = sin(vRot);
  p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5;
  vec4 t = texture2D(uMap, p);
  gl_FragColor = vec4(vColor.rgb * t.rgb, t.a * vColor.a);
  if (gl_FragColor.a < 0.01) discard;
  #include <fog_fragment>
}`;

class Bursts {
  constructor(scene, map, max = 700, additive = false) {
    this.max = max;
    this.parts = [];
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.col = new Float32Array(max * 4);
    this.rot = new Float32Array(max);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aRot', new THREE.BufferAttribute(this.rot, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uMap: { value: map }, uScale: { value: 500 } }]);
    const m = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: BURST_VERT, fragmentShader: BURST_FRAG, transparent: true, depthWrite: false, fog: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    this.points.layers.set(LAYER_FX);
    this.points.renderOrder = 8;
    scene.add(this.points);
  }
  spawn(p) {
    if (this.parts.length >= this.max) this.parts.shift();
    this.parts.push({ t: 0, life: 1, g: 0, drag: 1.5, grow: 1, size: 0.5, rot: rng.range(0, TAU), spin: rng.range(-2, 2), a: 1, ...p });
  }
  update(dt, scale) {
    this.uniforms.uScale.value = scale;
    const P = this.parts;
    let n = 0;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.t += dt;
      if (p.t >= p.life) {
        P.splice(i, 1);
        continue;
      }
    }
    for (const p of P) {
      const k = p.t / p.life;
      p.v.y -= p.g * dt;
      p.v.multiplyScalar(Math.exp(-p.drag * dt));
      p.p.addScaledVector(p.v, dt);
      p.rot += p.spin * dt;
      this.pos[n * 3] = p.p.x;
      this.pos[n * 3 + 1] = p.p.y;
      this.pos[n * 3 + 2] = p.p.z;
      this.size[n] = p.size * (1 + (p.grow - 1) * k);
      const fade = p.fadeIn ? Math.min(1, p.t / p.fadeIn) : 1;
      this.col[n * 4] = p.c.r;
      this.col[n * 4 + 1] = p.c.g;
      this.col[n * 4 + 2] = p.c.b;
      this.col[n * 4 + 3] = p.a * (1 - k) * (1 - k * 0.3) * fade;
      this.rot[n] = p.rot;
      n++;
    }
    this.geo.setDrawRange(0, n);
    for (const k of ['position', 'aSize', 'aColor', 'aRot']) this.geo.attributes[k].needsUpdate = true;
  }
}

// ---------------------------------------------------------------------------
// Partículas ambientes animadas inteiramente na GPU
// ---------------------------------------------------------------------------
const AMB_VERT = /* glsl */ `
attribute vec3 aHome; attribute vec4 aParam; attribute vec3 aColor;
uniform float uTime, uScale, uNight;
varying vec3 vColor; varying float vAlpha; varying float vFrame;
#include <fog_pars_vertex>
void main() {
  vec3 p = aHome;
  float ph = aParam.x, sp = aParam.y, size = aParam.z;
  float a = 1.0;
  vFrame = 0.0;
  #if defined(FIREFLY)
    p += vec3(sin(uTime * 0.7 * sp + ph) * 1.6, sin(uTime * 1.3 * sp + ph * 2.0) * 0.5 + 0.4, cos(uTime * 0.6 * sp + ph * 1.7) * 1.6);
    a = pow(max(0.0, sin(uTime * 2.2 * sp + ph * 5.0)), 3.0) * uNight;
  #elif defined(WISP)
    p += vec3(sin(uTime * 0.05 * sp + ph) * 6.0, sin(uTime * 0.2 + ph) * 0.2, cos(uTime * 0.04 * sp + ph) * 6.0);
    a = (0.55 + 0.45 * sin(uTime * 0.15 + ph * 3.0)) * aParam.w;
  #elif defined(LEAF)
    float fall = mod(uTime * 0.6 * sp + ph * 10.0, 10.0);
    p += vec3(sin(uTime * 1.5 + ph) * 1.2, -fall, cos(uTime * 1.1 + ph) * 1.2);
    a = smoothstep(0.0, 1.0, fall) * smoothstep(10.0, 8.5, fall);
    vFrame = uTime * 3.0 * sp + ph;
  #elif defined(EMBER)
    float rise = mod(uTime * 0.8 * sp + ph * 5.0, 5.0);
    p += vec3(sin(uTime * 2.0 + ph) * 0.4, rise, cos(uTime * 1.7 + ph) * 0.4);
    a = smoothstep(5.0, 1.0, rise);
  #elif defined(BUBBLE)
    float rise = mod(uTime * 0.35 * sp + ph * 3.0, 1.0);
    p += vec3(0.0, rise * 0.6, 0.0);
    a = smoothstep(0.0, 0.2, rise) * smoothstep(1.0, 0.7, rise);
  #elif defined(BAT)
    float r = aParam.w;
    float ang = uTime * 0.55 * sp + ph;
    p += vec3(cos(ang) * r, sin(uTime * 1.3 + ph) * 1.5 + sin(ang * 3.0) * 0.8, sin(ang) * r * 0.8);
    a = smoothstep(0.2, 0.6, uNight) * 0.95 + 0.05;
    vFrame = step(0.5, fract(uTime * 7.0 * sp + ph));
  #endif
  vColor = aColor;
  vAlpha = a;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = size * uScale / max(0.5, -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const AMB_FRAG = /* glsl */ `
uniform sampler2D uMap;
varying vec3 vColor; varying float vAlpha; varying float vFrame;
#include <fog_pars_fragment>
void main() {
  vec2 uv = gl_PointCoord;
  #if defined(BAT)
    uv.x = uv.x * 0.5 + vFrame * 0.5;
  #elif defined(LEAF)
    vec2 q = uv - 0.5; float c = cos(vFrame), s = sin(vFrame);
    uv = vec2(c * q.x - s * q.y, s * q.x + c * q.y) + 0.5;
  #endif
  vec4 t = texture2D(uMap, uv);
  float alpha = t.a * vAlpha;
  if (alpha < 0.01) discard;
  #if defined(ADDITIVE)
    float fogD = 1.0 - exp(-fogNear * fogNear * vFogDepth * vFogDepth);
    gl_FragColor = vec4(vColor * t.rgb * alpha * (1.0 - fogD * 0.9), 1.0);
  #else
    gl_FragColor = vec4(vColor * t.rgb, alpha);
    #include <fog_fragment>
  #endif
}`;

class Ambient {
  constructor(scene, type, items, map, { additive = false } = {}) {
    const n = items.length;
    const home = new Float32Array(n * 3), param = new Float32Array(n * 4), col = new Float32Array(n * 3), pos = new Float32Array(n * 3);
    items.forEach((it, i) => {
      home.set([it.x, it.y, it.z], i * 3);
      pos.set([it.x, it.y, it.z], i * 3);
      param.set([it.phase ?? rng.range(0, TAU), it.speed ?? rng.range(0.7, 1.3), it.size ?? 0.3, it.w ?? 1], i * 4);
      const c = new THREE.Color(it.color ?? '#ffffff');
      col.set([c.r, c.g, c.b], i * 3);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aHome', new THREE.BufferAttribute(home, 3));
    g.setAttribute('aParam', new THREE.BufferAttribute(param, 4));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    this.uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uMap: { value: map }, uScale: { value: 500 }, uTime: { value: 0 }, uNight: { value: 0 } }]);
    this.uniforms.uTime = SHARED.uTime;
    this.uniforms.uNight = SHARED.uNight;
    const m = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: AMB_VERT, fragmentShader: AMB_FRAG, transparent: true, depthWrite: false, fog: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, defines: { [type]: 1, ...(additive ? { ADDITIVE: 1 } : {}) },
    });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    this.points.layers.set(LAYER_FX);
    this.points.renderOrder = 7;
    scene.add(this.points);
  }
}

// ---------------------------------------------------------------------------
export class Effects {
  constructor(game) {
    this.game = game;
    const scene = game.scene;
    const puff = puffTexture();
    this.puffTex = puff;
    this.smokeB = new Bursts(scene, puff, 900, false);
    this.glowB = new Bursts(scene, getSparkleTexture(), 500, true);
    this.softGlow = new Bursts(scene, puff, 300, true);
    const W = game.world;
    const T = W.terrain;
    const hAt = (x, z) => W.groundHeight(x, z);
    // vaga-lumes ambientes (noite)
    const ff = [];
    for (let i = 0; i < 4000 && ff.length < 260; i++) {
      const x = rng.range(-PLAY_LIMIT, PLAY_LIMIT), z = rng.range(-PLAY_LIMIT, PLAY_LIMIT);
      const h = hAt(x, z);
      if (h < 0.1 || h > 20) continue;
      const w = Math.hypot(x - WOODS.x, z - WOODS.z) < WOODS.r + 10 || Math.hypot(x - SWAMP.x, z - SWAMP.z) < SWAMP.r + 5 ? 1 : 0.25;
      if (!rng.chance(w)) continue;
      ff.push({ x, y: h + rng.range(0.3, 1.6), z, size: rng.range(0.1, 0.18), color: rng.chance(0.8) ? '#d8ff6a' : '#8affe0' });
    }
    this.fireflies = new Ambient(scene, 'FIREFLY', ff, getSparkleTexture(), { additive: true });
    // névoa rasteira
    const wisps = [];
    const addW = (cx, cz, r, n, col, alpha = 0.3) => {
      for (let i = 0; i < n; i++) {
        const a = rng.range(0, TAU), d = Math.sqrt(rng.next()) * r;
        const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
        wisps.push({ x, y: Math.max(hAt(x, z), 0) + rng.range(0.4, 1.4), z, size: rng.range(7, 13), color: col, speed: rng.range(0.5, 1.5), w: alpha * rng.range(0.6, 1) });
      }
    };
    addW(SWAMP.x, SWAMP.z, SWAMP.r, 34, '#b8d8b0', 0.28);
    addW(CEMETERY.x, CEMETERY.z, 24, 22, '#d0d0f0', 0.26);
    addW(LAKE.x, LAKE.z, 28, 20, '#c8d8f0', 0.2);
    addW(WOODS.x, WOODS.z, 30, 16, '#c0d8d0', 0.2);
    this.wisps = new Ambient(scene, 'WISP', wisps, puff);
    // folhas caindo no bosque
    const leaves = [];
    for (let i = 0; i < 120; i++) {
      const a = rng.range(0, TAU), d = Math.sqrt(rng.next()) * WOODS.r;
      const x = WOODS.x + Math.cos(a) * d, z = WOODS.z + Math.sin(a) * d;
      leaves.push({ x, y: hAt(x, z) + 10, z, size: rng.range(0.18, 0.3), color: rng.pick(['#c8762a', '#a0522a', '#d8a040', '#7a3a2a']) });
    }
    this.leaves = new Ambient(scene, 'LEAF', leaves, leafTexture());
    // brasas nas fendas
    const embers = [];
    for (let i = 0; i < 70; i++) {
      const a = rng.range(0, TAU), d = Math.sqrt(rng.next()) * VENTS.r;
      const x = VENTS.x + Math.cos(a) * d, z = VENTS.z + Math.sin(a) * d;
      embers.push({ x, y: hAt(x, z), z, size: rng.range(0.08, 0.16), color: rng.pick(['#ff8a2a', '#ffb84a', '#ff5a1a']) });
    }
    this.embers = new Ambient(scene, 'EMBER', embers, getSparkleTexture(), { additive: true });
    // bolhas no pântano
    const bub = [];
    for (let i = 0; i < 400 && bub.length < 60; i++) {
      const a = rng.range(0, TAU), d = Math.sqrt(rng.next()) * SWAMP.r;
      const x = SWAMP.x + Math.cos(a) * d, z = SWAMP.z + Math.sin(a) * d;
      if (hAt(x, z) > -0.1) continue;
      bub.push({ x, y: 0.02, z, size: rng.range(0.1, 0.22), color: '#b8e890' });
    }
    const cauldron = game.populated.anchors.cauldron;
    if (cauldron) for (let i = 0; i < 12; i++) bub.push({ x: cauldron.x + rng.range(-0.3, 0.3), y: cauldron.y, z: cauldron.z + rng.range(-0.3, 0.3), size: rng.range(0.12, 0.2), color: '#a8ff6a', speed: 2.5 });
    this.bubbles = new Ambient(scene, 'BUBBLE', bub, puff, { additive: true });
    // morcegos: em volta das torres da mansão e voando pela vila à noite
    const bats = [];
    for (const t of game.populated.anchors.manorTowers ?? []) {
      for (let i = 0; i < 9; i++) bats.push({ x: t.x, y: t.y + rng.range(-2, 3), z: t.z, size: rng.range(0.5, 0.8), color: '#1a1422', w: rng.range(4, 9), speed: rng.range(0.8, 1.4) * rng.sign() });
    }
    for (let i = 0; i < 16; i++) {
      const x = rng.range(-110, 110), z = rng.range(-110, 110);
      bats.push({ x, y: hAt(x, z) + rng.range(10, 18), z, size: rng.range(0.5, 0.75), color: '#1a1422', w: rng.range(10, 24), speed: rng.range(0.4, 0.8) * rng.sign() });
    }
    this.bats = new Ambient(scene, 'BAT', bats, batTexture());
    // fumaça das chaminés
    this.emitters = (game.populated.smoke ?? []).map((s) => ({ p: new THREE.Vector3(s.x, s.y, s.z), t: rng.range(0, 1), green: !!s.green }));
    this._smokeC = new THREE.Color();
    // cria o rastro do golpe já visível (e transparente) para o shader compilar no carregamento
    this.swoosh(game.player);
    this._sw.t = 1;
    this._sw.m.material.uniforms.uA.value = 0;
  }

  poof(pos, color = '#b8b0c8', scale = 1) {
    const c = new THREE.Color(color);
    for (let i = 0; i < 16; i++) {
      const v = new THREE.Vector3(rng.range(-1, 1), rng.range(0.2, 1.2), rng.range(-1, 1)).normalize().multiplyScalar(rng.range(1.5, 3.5) * scale);
      this.smokeB.spawn({ p: new THREE.Vector3(pos.x, pos.y + 0.5, pos.z), v, life: rng.range(0.6, 1.1), size: rng.range(0.5, 0.9) * scale, grow: 2.5, drag: 3, c: c.clone().multiplyScalar(rng.range(0.8, 1.2)), a: 0.85 });
    }
    this.sparkleBurst(pos, '#fff4c0', 6);
  }
  splash(pos) {
    const c = new THREE.Color('#dfe8f0');
    for (let i = 0; i < 7; i++) {
      const a = rng.range(0, TAU);
      this.smokeB.spawn({ p: new THREE.Vector3(pos.x + Math.cos(a) * 0.3, 0.05, pos.z + Math.sin(a) * 0.3), v: new THREE.Vector3(Math.cos(a) * 1.2, rng.range(1.5, 2.6), Math.sin(a) * 1.2), life: rng.range(0.35, 0.55), size: rng.range(0.12, 0.2), g: 9, drag: 0.5, grow: 1, c: c.clone(), a: 0.8 });
    }
  }
  dust(pos) {
    const c = new THREE.Color('#8a7a6a');
    for (let i = 0; i < 3; i++) {
      this.smokeB.spawn({ p: new THREE.Vector3(pos.x + rng.range(-0.2, 0.2), pos.y + 0.08, pos.z + rng.range(-0.2, 0.2)), v: new THREE.Vector3(rng.range(-0.3, 0.3), rng.range(0.2, 0.5), rng.range(-0.3, 0.3)), life: rng.range(0.5, 0.8), size: rng.range(0.25, 0.4), grow: 2.2, drag: 2, c: c.clone(), a: 0.3 });
    }
  }
  sparkleBurst(pos, color = '#ffd84a', n = 18) {
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(rng.range(-1, 1), rng.range(0.5, 1.6), rng.range(-1, 1)).multiplyScalar(rng.range(1.5, 4));
      this.glowB.spawn({ p: new THREE.Vector3(pos.x, pos.y + 0.6, pos.z), v, life: rng.range(0.5, 1.0), size: rng.range(0.25, 0.5), g: 3, drag: 1.5, c: c.clone().multiplyScalar(2), a: 1 });
    }
  }
  shells(pos) {
    const c = new THREE.Color('#9a1e1e');
    for (let i = 0; i < 26; i++) {
      const v = new THREE.Vector3(rng.range(-1, 1), rng.range(1.2, 2.5), rng.range(-1, 1)).multiplyScalar(rng.range(1.5, 3.2));
      this.smokeB.spawn({ p: new THREE.Vector3(pos.x, pos.y + 0.9, pos.z), v, life: rng.range(0.8, 1.4), size: rng.range(0.14, 0.24), g: 12, drag: 0.4, grow: 1, c: c.clone().multiplyScalar(rng.range(0.6, 1.3)), a: 1 });
    }
  }
  levelUp(pos) {
    const c = new THREE.Color('#ffd84a');
    for (let i = 0; i < 70; i++) {
      const a = rng.range(0, TAU), r = rng.range(0.3, 1.1);
      this.glowB.spawn({ p: new THREE.Vector3(pos.x + Math.cos(a) * r, pos.y + rng.range(0, 0.5), pos.z + Math.sin(a) * r), v: new THREE.Vector3(0, rng.range(2, 6), 0), life: rng.range(0.9, 2.0), size: rng.range(0.25, 0.55), drag: 0.4, c: c.clone().multiplyScalar(2.2), a: 1 });
    }
    // pilar de luz
    const geo = new THREE.CylinderGeometry(1.1, 1.3, 12, 20, 1, true).translate(0, 6, 0);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uA: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform float uA; varying vec2 vUv; void main(){ float a = (1.0 - vUv.y) * uA * (0.6 + 0.4 * sin(vUv.x * 40.0)); gl_FragColor = vec4(vec3(1.0, 0.85, 0.4) * a * 0.75, 1.0); }',
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(pos);
    m.layers.set(LAYER_FX);
    this.game.scene.add(m);
    this.pillar = { m, t: 0 };
  }
  hearthFx(pos) {
    const c = new THREE.Color('#8affc0');
    for (let i = 0; i < 40; i++) {
      const a = rng.range(0, TAU);
      this.glowB.spawn({ p: new THREE.Vector3(pos.x + Math.cos(a) * 0.8, pos.y + rng.range(0, 2), pos.z + Math.sin(a) * 0.8), v: new THREE.Vector3(-Math.cos(a) * 0.5, rng.range(1, 3), -Math.sin(a) * 0.5), life: rng.range(0.6, 1.2), size: rng.range(0.2, 0.4), drag: 0.8, c: c.clone().multiplyScalar(2), a: 1 });
    }
  }
  /** rastro luminoso da Lanternada: um arco na frente do jogador que varre da esquerda para a direita */
  swoosh(player, color = '#ffc070') {
    if (!this._sw) {
      const seg = 28, a0 = 1.35, a1 = -1.35, r0 = 0.42, r1 = 1.22;
      const pos = [], uv = [], idx = [];
      for (let i = 0; i <= seg; i++) {
        const u = i / seg, a = a0 + (a1 - a0) * u;
        for (const [r, v] of [[r0, 0], [r1, 1]]) {
          pos.push(Math.sin(a) * r, 0, Math.cos(a) * r);
          uv.push(u, v);
        }
        if (i < seg) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      const mat = new THREE.ShaderMaterial({
        uniforms: { uHead: { value: 0 }, uA: { value: 0 }, uColor: { value: new THREE.Color() } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: /* glsl */ `
          uniform float uHead, uA; uniform vec3 uColor; varying vec2 vUv;
          void main() {
            float k = clamp((vUv.x - (uHead - 0.6)) / 0.6, 0.0, 1.0);
            float a = step(vUv.x, uHead) * k * k;
            a *= smoothstep(0.0, 0.75, vUv.y) * (1.0 - smoothstep(0.86, 1.0, vUv.y)) * uA;
            if (a < 0.003) discard;
            gl_FragColor = vec4(uColor * (0.6 + 0.8 * k), a);
          }`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      });
      const m = new THREE.Mesh(geo, mat);
      m.layers.set(LAYER_FX);
      m.renderOrder = 9;
      m.frustumCulled = false;
      m.position.set(0, 1.18, 0.1);
      m.rotation.z = -0.22;
      this._sw = { m, t: 1 };
    }
    const s = this._sw;
    if (s.m.parent !== player.object) player.object.add(s.m);
    s.m.material.uniforms.uColor.value.set(color).multiplyScalar(1.7);
    s.t = 0;
    s.m.visible = true;
  }
  /** faíscas + clarão rápido no ponto do impacto */
  hitSpark(pos, color = '#fff0c8', n = 10, scale = 1) {
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(rng.range(-1, 1), rng.range(-0.3, 1), rng.range(-1, 1)).normalize().multiplyScalar(rng.range(3, 7) * scale);
      this.glowB.spawn({ p: pos.clone(), v, life: rng.range(0.18, 0.38), size: rng.range(0.18, 0.32) * scale, g: 6, drag: 4, c: c.clone().multiplyScalar(2.2), a: 1 });
    }
    this.softGlow.spawn({ p: pos.clone(), v: new THREE.Vector3(), life: 0.14, size: 1.3 * scale, grow: 1.6, drag: 0, c: c.clone().multiplyScalar(1.4), a: 0.9 });
  }
  /** rastro da bola de fogo do Belzebuzinho: faíscas e um fiozinho de fumaça */
  fireTrail(pos, dt) {
    // por tempo, não por quadro: sem limite de FPS isso viraria uma avalanche de partículas
    this._trailT = (this._trailT ?? 0) + dt;
    if (this._trailT < 1 / 40) return;
    this._trailT = 0;
    const c = this._fireC ?? (this._fireC = new THREE.Color('#ff9a3a'));
    for (let i = 0; i < 2; i++) {
      this.glowB.spawn({ p: pos.clone(), v: new THREE.Vector3(rng.range(-0.6, 0.6), rng.range(0.2, 1.2), rng.range(-0.6, 0.6)), life: rng.range(0.2, 0.4), size: rng.range(0.18, 0.3), g: -1, drag: 2, c: c.clone().multiplyScalar(2.2), a: 1 });
    }
    if (rng.chance(0.4)) this.smokeB.spawn({ p: pos.clone(), v: new THREE.Vector3(0, 0.6, 0), life: 0.6, size: 0.25, grow: 2.2, drag: 1, c: new THREE.Color('#4a3a3a'), a: 0.35 });
  }
  /** caveira se desmanchando em ossinhos */
  bones(pos) {
    const c = new THREE.Color('#ece4cc');
    for (let i = 0; i < 24; i++) {
      const v = new THREE.Vector3(rng.range(-1, 1), rng.range(1.2, 2.6), rng.range(-1, 1)).multiplyScalar(rng.range(1.4, 3.2));
      this.smokeB.spawn({ p: new THREE.Vector3(pos.x, pos.y + 0.4, pos.z), v, life: rng.range(0.9, 1.4), size: rng.range(0.1, 0.2), g: 12, drag: 0.4, grow: 1, c: c.clone().multiplyScalar(rng.range(0.8, 1.1)), a: 1 });
    }
    this.poof(pos, '#c8c0a8', 0.6);
  }
  /** respingo de água (marujo) */
  splashBurst(pos, n = 18) {
    const c = new THREE.Color('#a8dcec');
    for (let i = 0; i < n; i++) {
      const a = rng.range(0, TAU), sp = rng.range(1.2, 3);
      this.smokeB.spawn({ p: new THREE.Vector3(pos.x, pos.y + 0.6, pos.z), v: new THREE.Vector3(Math.cos(a) * sp, rng.range(2, 4.5), Math.sin(a) * sp), life: rng.range(0.4, 0.8), size: rng.range(0.12, 0.24), g: 10, drag: 0.5, grow: 1, c: c.clone(), a: 0.85 });
    }
  }
  castSparkles(pos, color = '#b8a0ff') {
    const c = new THREE.Color(color);
    const a = rng.range(0, TAU);
    this.glowB.spawn({ p: new THREE.Vector3(pos.x + Math.cos(a) * 0.7, pos.y + 0.2, pos.z + Math.sin(a) * 0.7), v: new THREE.Vector3(0, rng.range(1.2, 2.5), 0), life: 0.9, size: 0.25, drag: 0.5, c: c.clone().multiplyScalar(2), a: 1 });
  }

  update(dt) {
    const g = this.game;
    const scale = g.renderer.domElement.height / (2 * Math.tan((g.camera.fov * Math.PI) / 360));
    // fumaça das chaminés (só perto da câmera)
    const cam = g.camera.position;
    const night = g.dayNight.night;
    for (const e of this.emitters) {
      if (Math.abs(e.p.x - cam.x) > 90 || Math.abs(e.p.z - cam.z) > 90) continue;
      e.t -= dt;
      if (e.t > 0) continue;
      e.t = rng.range(0.35, 0.6);
      const c = this._smokeC.set(e.green ? '#8ad86a' : night > 0.5 ? '#6a6480' : '#b8b0c0');
      this.smokeB.spawn({
        p: e.p.clone().add(new THREE.Vector3(rng.range(-0.1, 0.1), 0, rng.range(-0.1, 0.1))), v: new THREE.Vector3(0.5 + rng.range(-0.2, 0.3), rng.range(0.9, 1.4), rng.range(-0.2, 0.2)),
        life: rng.range(3.2, 4.5), size: rng.range(0.45, 0.7), grow: 4.5, drag: 0.25, c: c.clone(), a: e.green ? 0.55 : 0.4, fadeIn: 0.4, spin: rng.range(-0.5, 0.5),
      });
    }
    // halo verde do caldeirão
    this.smokeB.update(dt, scale);
    this.glowB.update(dt, scale);
    this.softGlow.update(dt, scale);
    for (const a of [this.fireflies, this.wisps, this.leaves, this.embers, this.bubbles, this.bats]) a.uniforms.uScale.value = scale;
    this.fireflies.points.visible = night > 0.05;
    const sw = this._sw;
    if (sw?.m.visible) {
      sw.t += dt;
      const u = sw.m.material.uniforms;
      u.uHead.value = Math.min(1.6, sw.t / 0.12);
      u.uA.value = 1 - Math.min(1, Math.max(0, (sw.t - 0.1) / 0.22));
      if (sw.t > 0.34) sw.m.visible = false;
    }
    if (this.pillar) {
      this.pillar.t += dt;
      this.pillar.m.material.uniforms.uA.value = Math.max(0, 1 - this.pillar.t / 2.2);
      this.pillar.m.position.copy(g.player.pos);
      if (this.pillar.t > 2.2) {
        g.scene.remove(this.pillar.m);
        this.pillar = null;
      }
    }
  }
}
