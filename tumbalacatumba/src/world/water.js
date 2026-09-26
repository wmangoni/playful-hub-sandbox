import * as THREE from 'three';
import { WORLD_SIZE, WATER_LEVEL, SWAMP } from './layout.js';
import { LAYER_FX } from '../render/postfx.js';
import { SHARED } from '../render/toon.js';

const vert = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec3 vW;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const frag = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform sampler2D uHeight;
uniform float uWorldSize, uTime, uNight;
uniform vec3 uDeep, uShallow, uSwDeep, uSwShallow, uFoam, uSky, uLightDir, uLightColor, uAlgae, uAmb;
uniform vec2 uSwampPos;
uniform float uSwampR;
varying vec3 vW;
float wh(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float wn(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(wh(i), wh(i + vec2(1, 0)), u.x), mix(wh(i + vec2(0, 1)), wh(i + vec2(1, 1)), u.x), u.y); }
void main() {
  vec2 uv = vW.xz / uWorldSize + 0.5;
  float th = texture2D(uHeight, uv).r;
  float depth = max(0.0, vW.y - th);
  if (depth <= 0.0) discard;
  float sw = 1.0 - smoothstep(0.85, 1.2, length(vW.xz - uSwampPos) / uSwampR);
  vec3 deep = mix(uDeep, uSwDeep, sw), shallow = mix(uShallow, uSwShallow, sw);
  vec3 col = mix(shallow, deep, smoothstep(0.0, 2.4, depth));
  vec2 p = vW.xz;
  float n1 = wn(p * 0.32 + uTime * vec2(0.05, 0.03));
  float n2 = wn(p * 0.9 - uTime * vec2(0.06, 0.08));
  float n = n1 * 0.65 + n2 * 0.35;
  // faixas de brilho toon
  col += smoothstep(0.66, 0.7, n) * 0.07 * (1.0 - sw * 0.5);
  col -= smoothstep(0.34, 0.3, n) * 0.04;
  // lentilha-d'água no pântano
  float al = smoothstep(0.55, 0.62, wn(p * 0.22 + 3.0) * 0.7 + wn(p * 1.3) * 0.3) * sw;
  col = mix(col, uAlgae * (0.8 + 0.4 * n2), al * 0.85);
  col *= uAmb;
  // reflexo do céu (fresnel)
  vec3 V = normalize(cameraPosition - vW);
  float fres = pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0);
  col = mix(col, uSky, fres * 0.55 * (1.0 - al));
  // brilho especular estilizado (sol/lua)
  vec3 N = normalize(vec3((n1 - 0.5) * 0.35, 1.0, (n2 - 0.5) * 0.35));
  vec3 R = reflect(-V, N);
  float spec = pow(max(dot(R, uLightDir), 0.0), 60.0);
  float streak = smoothstep(0.55, 0.62, wn(vec2(p.x * 0.9 + p.y * 0.2, p.y * 3.2) + uTime * vec2(0.3, 0.1)));
  col += smoothstep(0.25, 0.4, spec) * streak * uLightColor * 0.75 * (1.0 - al);
  // espuma na margem: linha fixa + ondinhas que chegam
  float edgeNoise = (wn(p * 1.7 + uTime * 0.2) - 0.5) * 0.08;
  float foam = 1.0 - smoothstep(0.05, 0.11, depth + edgeNoise);
  float wave = step(0.72, fract(depth * 2.6 - uTime * 0.28 + n1 * 0.4)) * (1.0 - smoothstep(0.1, 0.55, depth));
  col = mix(col, uFoam * uAmb, max(foam, wave * 0.55) * (1.0 - sw * 0.6));
  float alpha = mix(0.6, 0.93, smoothstep(0.0, 1.6, depth));
  alpha = max(alpha, foam);
  gl_FragColor = vec4(col, alpha);
  #include <fog_fragment>
}`;

const _c = new THREE.Color();

export class Water {
  constructor(terrain) {
    this.uniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uHeight: { value: null },
        uWorldSize: { value: WORLD_SIZE },
        uTime: { value: 0 },
        uNight: { value: 0 },
        uDeep: { value: new THREE.Color('#1c3450') },
        uShallow: { value: new THREE.Color('#3f7a88') },
        uSwDeep: { value: new THREE.Color('#1f3020') },
        uSwShallow: { value: new THREE.Color('#4a6a36') },
        uAlgae: { value: new THREE.Color('#6a9a3a') },
        uFoam: { value: new THREE.Color('#dfe8e0') },
        uSky: { value: new THREE.Color('#8090a0') },
        uLightDir: { value: new THREE.Vector3(0, 1, 0) },
        uLightColor: { value: new THREE.Color('#ffffff') },
        uAmb: { value: new THREE.Color(1, 1, 1) },
        uSwampPos: { value: new THREE.Vector2(SWAMP.x, SWAMP.z) },
        uSwampR: { value: SWAMP.r },
      },
    ]);
    this.uniforms.uHeight.value = terrain.heightTex;
    this.uniforms.uTime = SHARED.uTime;
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      fog: true,
    });
    const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 1, 1).rotateX(-Math.PI / 2);
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.y = WATER_LEVEL;
    this.mesh.layers.set(LAYER_FX);
    this.mesh.renderOrder = 2;
    this.mesh.name = 'agua';
  }
  update(dayNight) {
    const u = this.uniforms;
    u.uSky.value.copy(dayNight.cur.hor).lerp(dayNight.cur.top, 0.35);
    u.uLightDir.value.copy(dayNight.lightDir);
    u.uLightColor.value.copy(dayNight.cur.lc).multiplyScalar(Math.min(1.2, dayNight.sun.intensity * 0.6));
    // luz ambiente aproximada (hemisfério + direcional) para a água não "brilhar" à noite
    const hemi = dayNight.hemi, sun = dayNight.sun;
    _c.copy(sun.color).multiplyScalar(sun.intensity * 0.6);
    u.uAmb.value.copy(hemi.color).multiplyScalar(hemi.intensity).add(_c).multiplyScalar(1 / Math.PI);
    u.uSky.value.multiply(u.uAmb.value).multiplyScalar(1.6);
  }
}
