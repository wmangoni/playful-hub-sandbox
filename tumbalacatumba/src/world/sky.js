import * as THREE from 'three';
import { LAYER_FX } from '../render/postfx.js';

/** textura da lua desenhada em canvas: crateras + um rostinho sonolento bem sutil */
function makeMoonTexture() {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(S * 0.42, S * 0.4, S * 0.05, S / 2, S / 2, S / 2);
  grd.addColorStop(0, '#fffbe6');
  grd.addColorStop(0.7, '#f3e7b8');
  grd.addColorStop(1, '#d9c98f');
  g.fillStyle = grd;
  g.beginPath();
  g.arc(S / 2, S / 2, S / 2 - 1, 0, Math.PI * 2);
  g.fill();
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * S * 0.4;
    const x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d, r = 4 + rnd() * 18;
    g.fillStyle = `rgba(170,150,100,${0.18 + rnd() * 0.22})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,255,240,0.25)';
    g.beginPath();
    g.arc(x - r * 0.25, y - r * 0.25, r * 0.55, 0, Math.PI * 2);
    g.fill();
  }
  // rosto quase imperceptível (olhos fechados e sorriso) — brincadeira de Burton
  g.strokeStyle = 'rgba(150,125,80,0.28)';
  g.lineWidth = 5;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(S * 0.36, S * 0.44, 16, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
  g.beginPath();
  g.arc(S * 0.64, S * 0.44, 16, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
  g.beginPath();
  g.arc(S * 0.5, S * 0.6, 34, 0.2 * Math.PI, 0.8 * Math.PI);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDir = wp.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * wp;
  gl_Position.z = gl_Position.w * 0.99999;
}`;

const skyFrag = /* glsl */ `
uniform vec3 uTop, uHorizon, uBottom, uSunDir, uSunColor, uMoonDir, uMoonGlow, uCloudLit, uCloudDark;
uniform float uStars, uTime, uMoonSize, uSunVis, uMoonVis;
uniform sampler2D uMoonTex;
uniform sampler2D uTile;
varying vec3 vDir;
float fT(vec2 x) { return texture2D(uTile, x * 0.125).b; }
float fT2(vec2 x) { return texture2D(uTile, x * 0.125).a; }
float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float h2(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main() {
  vec3 d = normalize(vDir);
  float y = d.y;
  float t = pow(clamp(y, 0.0, 1.0), 0.5);
  vec3 col = mix(uHorizon, uTop, t);
  col = mix(col, uBottom, smoothstep(0.0, -0.2, y));
  // sol: brilho + disco estilizado
  float sd = max(dot(d, uSunDir), 0.0);
  col += uSunColor * (pow(sd, 6.0) * 0.35 + pow(sd, 48.0) * 0.5) * uSunVis;
  col = mix(col, uSunColor * 3.0 + 0.4, smoothstep(0.99935, 0.99955, sd) * uSunVis);
  // estrelas
  if (uStars > 0.01 && y > -0.02) {
    vec3 p = d * 190.0;
    vec3 c = floor(p);
    float hs = h3(c);
    if (hs > 0.992) {
      vec3 f = fract(p) - 0.5;
      float size = 0.08 + 0.2 * h3(c + 3.1);
      float s = smoothstep(size, 0.0, length(f));
      float tw = 0.55 + 0.45 * sin(uTime * (1.5 + 4.0 * h3(c + 1.7)) + hs * 90.0);
      col += vec3(1.0, 0.95, 0.85) * s * tw * uStars * 1.6 * smoothstep(-0.02, 0.2, y);
    }
  }
  // lua gigante
  vec3 md = uMoonDir;
  float mdot = dot(d, md);
  col += uMoonGlow * (pow(max(mdot, 0.0), 10.0) * 0.28 + pow(max(mdot, 0.0), 120.0) * 0.5) * uMoonVis;
  vec3 right = normalize(cross(md, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(right, md);
  vec2 muv = vec2(dot(d, right), dot(d, up)) / uMoonSize;
  float mr = length(muv);
  if (mdot > 0.0 && mr < 1.02) {
    vec4 mt = texture2D(uMoonTex, muv * 0.5 + 0.5);
    float edge = 1.0 - smoothstep(0.96, 1.0, mr);
    col = mix(col, mt.rgb * 1.35, edge * uMoonVis);
  }
  // nuvens espiraladas (bem cartunescas: bordas duras e duas cores)
  if (y > 0.0) {
    vec2 uv = d.xz / (y + 0.12);
    uv = uv * 0.9 + vec2(uTime * 0.006, uTime * 0.002);
    vec2 w = vec2(fT(uv * 0.5), fT2(uv * 0.5 + 5.2));
    vec2 q = uv + (w - 0.5) * 2.6;
    float ang = fT2(q * 0.3) * 6.2831;
    q += vec2(cos(ang), sin(ang)) * 0.35;
    float cden = fT(q * 0.75);
    float horizonFade = smoothstep(0.02, 0.22, y);
    float cloud = smoothstep(0.585, 0.605, cden) * horizonFade;
    float lit = smoothstep(0.64, 0.7, fT(q * 0.75 + vec2(0.08, 0.05)));
    vec3 cc = mix(uCloudDark, uCloudLit, lit);
    // borda de "tinta" nas nuvens
    float rim = smoothstep(0.585, 0.59, cden) - smoothstep(0.59, 0.6, cden);
    cc = mix(cc, uCloudDark * 0.55, rim * 0.8);
    col = mix(col, cc, cloud * 0.92);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

export class Sky {
  constructor() {
    this.uniforms = {
      uTop: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uBottom: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uSunColor: { value: new THREE.Color() },
      uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
      uMoonGlow: { value: new THREE.Color('#aab8ff') },
      uCloudLit: { value: new THREE.Color() },
      uCloudDark: { value: new THREE.Color() },
      uStars: { value: 0 },
      uTime: { value: 0 },
      uMoonSize: { value: 0.085 },
      uSunVis: { value: 1 },
      uMoonVis: { value: 1 },
      uMoonTex: { value: makeMoonTexture() },
      uTile: { value: null },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(800, 48, 24), mat);
    this.mesh.layers.set(LAYER_FX);
    this.mesh.renderOrder = -100;
    this.mesh.frustumCulled = false;
    this.mesh.name = 'ceu';
  }
  update(camera, time) {
    this.mesh.position.copy(camera.position);
    this.uniforms.uTime.value = time;
  }
}
