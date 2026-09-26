import * as THREE from 'three';
import { LAYER_FX } from '../render/postfx.js';
import { SHARED } from '../render/toon.js';

/** textura de brilho radial (halo) */
export function glowTexture(size = 128, inner = 'rgba(255,255,255,1)', mid = 'rgba(255,220,160,0.35)') {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.18, mid);
  grd.addColorStop(0.5, 'rgba(255,200,140,0.08)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const haloVert = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
attribute float aPhase;
uniform float uTime;
uniform float uScale;
varying vec3 vColor;
varying float vFlick;
#include <fog_pars_vertex>
void main() {
  vColor = aColor;
  vFlick = 0.85 + 0.15 * sin(uTime * 9.0 + aPhase * 6.28) * sin(uTime * 5.3 + aPhase * 12.0);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(1.0, -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const haloFrag = /* glsl */ `
uniform sampler2D uMap;
uniform float uIntensity;
varying vec3 vColor;
varying float vFlick;
#include <fog_pars_fragment>
void main() {
  vec4 t = texture2D(uMap, gl_PointCoord);
  // aditivo: a neblina só apaga o brilho (não soma cor de neblina)
  float fogD = 1.0 - exp(-fogNear * fogNear * vFogDepth * vFogDepth);
  gl_FragColor = vec4(vColor * t.rgb * t.a * uIntensity * vFlick * (1.0 - fogD * 0.85), 1.0);
}`;

/** Halos de todas as lâmpadas num único Points aditivo. */
export class Halos {
  constructor(scene) {
    this.items = [];
    this.scene = scene;
  }
  add(pos, size = 1, color = '#ffc46b') {
    this.items.push({ pos, size, color: new THREE.Color(color) });
  }
  build() {
    const n = this.items.length;
    const pos = new Float32Array(n * 3), size = new Float32Array(n), col = new Float32Array(n * 3), ph = new Float32Array(n);
    this.items.forEach((it, i) => {
      pos.set([it.pos.x, it.pos.y, it.pos.z], i * 3);
      size[i] = it.size;
      col.set([it.color.r, it.color.g, it.color.b], i * 3);
      ph[i] = Math.random();
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
    this.uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uMap: { value: glowTexture() }, uIntensity: { value: 1 }, uScale: { value: 400 }, uTime: { value: 0 } }]);
    this.uniforms.uTime = SHARED.uTime;
    const m = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: haloVert, fragmentShader: haloFrag,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true,
    });
    this.points = new THREE.Points(g, m);
    this.points.layers.set(LAYER_FX);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    this.scene.add(this.points);
  }
  update(lamps, viewportH) {
    this.uniforms.uIntensity.value = lamps * 1.6;
    this.uniforms.uScale.value = viewportH * 0.9;
    this.points.visible = lamps > 0.02;
  }
}

/** Poucas PointLights reais que "seguem" as lâmpadas mais próximas do jogador. */
export class LightPool {
  constructor(scene, count = 6) {
    this.lights = [];
    for (let i = 0; i < count; i++) {
      const l = new THREE.PointLight('#ffb35c', 0, 14, 1.7);
      l.position.set(0, -100, 0);
      scene.add(l);
      this.lights.push(l);
    }
    this.sources = [];
    this._t = 0;
    this.range = 34;
  }
  update(dt, focus, lamps) {
    this._t -= dt;
    if (this._t <= 0) {
      this._t = 0.3;
      const sorted = this.sources
        .map((s) => ({ s, d: (s.x - focus.x) ** 2 + (s.z - focus.z) ** 2 }))
        .sort((a, b) => a.d - b.d)
        .slice(0, this.lights.length);
      this.lights.forEach((l, i) => {
        const it = sorted[i];
        if (!it) {
          l.userData.src = null;
          return;
        }
        l.userData.src = it.s;
        l.position.set(it.s.x, it.s.y - 0.35, it.s.z);
      });
    }
    for (const l of this.lights) {
      const s = l.userData.src;
      if (!s) {
        l.intensity = 0;
        continue;
      }
      const d = Math.hypot(s.x - focus.x, s.z - focus.z);
      const fade = 1 - Math.min(1, Math.max(0, (d - this.range * 0.6) / (this.range * 0.4)));
      l.intensity = 26 * lamps * fade * (s.i ?? 1);
    }
  }
}
