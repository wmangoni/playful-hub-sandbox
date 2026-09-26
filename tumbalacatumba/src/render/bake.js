import * as THREE from 'three';

const QUAD_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

/** Renderiza um shader de tela cheia numa textura (uma vez só). */
export function bakeTexture(renderer, size, fragmentShader, uniforms = {}, { repeat = false, mipmaps = true } = {}) {
  const rt = new THREE.WebGLRenderTarget(size, size, {
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    depthBuffer: false,
    generateMipmaps: mipmaps,
    minFilter: mipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping,
    wrapT: repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping,
  });
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: QUAD_VERT, fragmentShader, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const cam = new THREE.Camera();
  const prev = renderer.getRenderTarget();
  const oldAuto = renderer.shadowMap.autoUpdate;
  renderer.shadowMap.autoUpdate = false;
  renderer.setRenderTarget(rt);
  renderer.render(scene, cam);
  renderer.setRenderTarget(prev);
  renderer.shadowMap.autoUpdate = oldAuto;
  mat.dispose();
  quad.geometry.dispose();
  rt.texture.userData.rt = rt;
  return rt.texture;
}

/** funções GLSL de ruído compartilhadas pelos shaders de "assar" */
export const NOISE_GLSL = /* glsl */ `
float bHash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float bNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(bHash(i), bHash(i + vec2(1.0, 0.0)), u.x), mix(bHash(i + vec2(0.0, 1.0)), bHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float bFbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * bNoise(p); p = p * 2.07 + vec2(13.1, 7.7); a *= 0.5; }
  return s;
}
// versões periódicas (período P em células) para texturas que repetem
float pHash(vec2 p, float P) { return bHash(mod(p, P)); }
float pNoise(vec2 p, float P) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(pHash(i, P), pHash(i + vec2(1.0, 0.0), P), u.x), mix(pHash(i + vec2(0.0, 1.0), P), pHash(i + vec2(1.0, 1.0), P), u.x), u.y);
}
float pFbm(vec2 p, float P) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * pNoise(p, P); p *= 2.0; P *= 2.0; a *= 0.5; }
  return s / 0.97;
}
`;

/** ruído periódico (4 canais independentes) para detalhes finos e nuvens */
export function bakeTileNoise(renderer, size = 256, cells = 32) {
  return bakeTexture(
    renderer,
    size,
    /* glsl */ `
    ${NOISE_GLSL}
    varying vec2 vUv;
    void main() {
      vec2 p = vUv * ${cells.toFixed(1)};
      float P = ${cells.toFixed(1)};
      gl_FragColor = vec4(pNoise(p, P), pNoise(p + 17.0, P), pFbm(p * 0.25, P * 0.25), pFbm(p * 0.25 + 31.0, P * 0.25));
    }`,
    {},
    { repeat: true }
  );
}

/** Voronoi periódico: R = distância à borda, G = id da célula */
export function bakeVoronoi(renderer, size = 512, cells = 16) {
  return bakeTexture(
    renderer,
    size,
    /* glsl */ `
    ${NOISE_GLSL}
    varying vec2 vUv;
    const float P = ${cells.toFixed(1)};
    vec2 off(vec2 c) { vec2 m = mod(c, P); return vec2(bHash(m), bHash(m + 17.3)); }
    void main() {
      vec2 x = vUv * P;
      vec2 n = floor(x), f = fract(x);
      vec2 mg = vec2(0.0), mr = vec2(0.0);
      float md = 8.0;
      for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 r = g + off(n + g) * 0.85 + 0.075 - f;
        float d = dot(r, r);
        if (d < md) { md = d; mr = r; mg = g; }
      }
      md = 8.0;
      for (int j = -2; j <= 2; j++) for (int i = -2; i <= 2; i++) {
        vec2 g = mg + vec2(float(i), float(j));
        vec2 r = g + off(n + g) * 0.85 + 0.075 - f;
        if (dot(mr - r, mr - r) > 0.00001) md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
      }
      gl_FragColor = vec4(clamp(md * 2.0, 0.0, 1.0), bHash(mod(n + mg, P) + 3.1), 0.0, 1.0);
    }`,
    {},
    { repeat: true, mipmaps: false }
  );
}
