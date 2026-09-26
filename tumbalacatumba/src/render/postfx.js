import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';
import { Pass } from 'three/addons/postprocessing/Pass.js';

/** objetos nessa camada NÃO recebem contorno (céu, água, partículas, transparências) */
export const LAYER_FX = 1;

/** Renderiza normais + profundidade só dos objetos contornáveis (camada 0). */
class NormalDepthPass extends Pass {
  constructor(scene, camera) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.needsSwap = false;
    this.material = new THREE.MeshNormalMaterial();
    this.rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.UnsignedByteType });
    this.rt.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
    this._clear = new THREE.Color(0.5, 0.5, 1.0);
    this._old = new THREE.Color();
  }
  setSize(w, h) {
    this.rt.setSize(w, h);
  }
  render(renderer) {
    const { scene, camera } = this;
    const oldOverride = scene.overrideMaterial, oldBg = scene.background, oldMask = camera.layers.mask;
    const oldAuto = renderer.shadowMap.autoUpdate;
    renderer.getClearColor(this._old);
    const oldAlpha = renderer.getClearAlpha();
    scene.overrideMaterial = this.material;
    scene.background = null;
    camera.layers.set(0);
    renderer.shadowMap.autoUpdate = false;
    renderer.setClearColor(this._clear, 1);
    renderer.setRenderTarget(this.rt);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setClearColor(this._old, oldAlpha);
    renderer.shadowMap.autoUpdate = oldAuto;
    camera.layers.mask = oldMask;
    scene.overrideMaterial = oldOverride;
    scene.background = oldBg;
  }
  dispose() {
    this.rt.dispose();
    this.material.dispose();
  }
}

const OutlineShader = {
  name: 'InkOutline',
  uniforms: {
    tDiffuse: { value: null },
    tNormal: { value: null },
    tDepth: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    cameraNear: { value: 0.1 },
    cameraFar: { value: 1000 },
    uColor: { value: new THREE.Color(0x120a1a) },
    uStrength: { value: 0.92 },
    uThickness: { value: 1.0 },
    uFogColor: { value: new THREE.Color() },
    uFogDensity: { value: 0.008 },
    uTime: { value: 0 },
    uBoil: { value: 0.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    #include <packing>
    uniform sampler2D tDiffuse, tNormal, tDepth;
    uniform vec2 resolution;
    uniform float cameraNear, cameraFar, uStrength, uThickness, uFogDensity, uTime, uBoil;
    uniform vec3 uColor, uFogColor;
    varying vec2 vUv;
    float vz(vec2 uv) { return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cameraNear, cameraFar); }
    vec3 nrm(vec2 uv) { return texture2D(tNormal, uv).xyz * 2.0 - 1.0; }
    float h21(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      vec2 px = uThickness / resolution;
      vec2 uv = vUv;
      if (uBoil > 0.0) {
        vec2 cell = floor(vUv * resolution / 4.0) + floor(uTime * 6.0) * 7.0;
        uv += (vec2(h21(cell), h21(cell + 3.7)) - 0.5) * px * uBoil;
      }
      float z0 = vz(uv);
      float zL = vz(uv - vec2(px.x, 0.0)), zR = vz(uv + vec2(px.x, 0.0));
      float zD = vz(uv - vec2(0.0, px.y)), zU = vz(uv + vec2(0.0, px.y));
      // laplaciano relativo de 1/z: zero em planos, forte em silhuetas
      float w0 = 1.0 / z0;
      float lap = abs(1.0 / zL + 1.0 / zR + 1.0 / zD + 1.0 / zU - 4.0 * w0) / w0;
      float eDepth = smoothstep(0.06, 0.2, lap);
      vec3 n0 = nrm(uv);
      float nd = max(max(1.0 - dot(n0, nrm(uv - vec2(px.x, 0.0))), 1.0 - dot(n0, nrm(uv + vec2(px.x, 0.0)))),
                     max(1.0 - dot(n0, nrm(uv - vec2(0.0, px.y))), 1.0 - dot(n0, nrm(uv + vec2(0.0, px.y)))));
      float eNormal = smoothstep(0.3, 0.6, nd);
      float zmin = min(z0, min(min(zL, zR), min(zD, zU)));
      float e = max(eDepth, eNormal * (1.0 - smoothstep(40.0, 110.0, zmin)));
      e *= 1.0 - smoothstep(170.0, 320.0, zmin);
      // a linha também "entra" na neblina
      float fogF = 1.0 - exp(-uFogDensity * uFogDensity * zmin * zmin);
      vec3 ink = mix(uColor, uFogColor, fogF * 0.92);
      vec3 col = mix(base.rgb, ink, e * uStrength);
      gl_FragColor = vec4(col, base.a);
    }
  `,
};

const GradeShader = {
  name: 'Grade',
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uVignette: { value: 0.42 },
    uGrain: { value: 0.035 },
    uSaturation: { value: 1.05 },
    uContrast: { value: 1.09 },
    uShadowTint: { value: new THREE.Color(0.32, 0.18, 0.52) },
    uHighlightTint: { value: new THREE.Color(1.0, 0.86, 0.62) },
    uSplit: { value: 0.1 },
    uFade: { value: 0 },
    uFadeColor: { value: new THREE.Color(0, 0, 0) },
    uFlash: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float uTime, uVignette, uGrain, uSaturation, uContrast, uSplit, uFade, uFlash;
    uniform vec3 uShadowTint, uHighlightTint, uFadeColor;
    varying vec2 vUv;
    float h(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, uSaturation);
      c = (c - 0.5) * uContrast + 0.5;
      // split toning: sombras arroxeadas, luzes quentes
      c += (uShadowTint - 0.5) * (1.0 - smoothstep(0.0, 0.55, l)) * uSplit;
      c += (uHighlightTint - 0.5) * smoothstep(0.55, 1.0, l) * uSplit * 0.6;
      // vinheta
      vec2 d = (vUv - 0.5) * vec2(resolution.x / resolution.y, 1.0);
      float v = smoothstep(1.05, 0.25, length(d));
      c *= mix(1.0 - uVignette, 1.0, v);
      c += uFlash;
      // granulação
      float g = h(vUv * resolution + fract(uTime * 13.7) * 311.0) - 0.5;
      c += g * uGrain * (0.6 + 0.4 * (1.0 - l));
      c = mix(c, uFadeColor, uFade);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }
  `,
};

export class PostFX {
  constructor(renderer, scene, camera, { msaa = false, bloom = true } = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    const size = renderer.getSize(new THREE.Vector2());
    const pr = renderer.getPixelRatio();
    const rt = new THREE.WebGLRenderTarget(Math.max(1, size.x * pr), Math.max(1, size.y * pr), {
      type: THREE.HalfFloatType,
      samples: msaa ? 4 : 0,
    });
    this.composer = new EffectComposer(renderer, rt);
    this.normalPass = new NormalDepthPass(scene, camera);
    this.renderPass = new RenderPass(scene, camera);
    this.outlinePass = new ShaderPass(OutlineShader);
    this.outlinePass.uniforms.tNormal.value = this.normalPass.rt.texture;
    this.outlinePass.uniforms.tDepth.value = this.normalPass.rt.depthTexture;
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.55, 0.5, 1.0);
    this.bloomPass.enabled = bloom;
    this.outputPass = new OutputPass();
    this.fxaaPass = new FXAAPass();
    this.gradePass = new ShaderPass(GradeShader);
    for (const p of [this.normalPass, this.renderPass, this.outlinePass, this.bloomPass, this.outputPass, this.fxaaPass, this.gradePass]) {
      this.composer.addPass(p);
    }
    this.grade = this.gradePass.uniforms;
    this.outline = this.outlinePass.uniforms;
    this.setSize(size.x, size.y);
  }

  setSize(w, h) {
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    const pr = this.renderer.getPixelRatio();
    const pw = Math.max(1, Math.floor(w * pr)), ph = Math.max(1, Math.floor(h * pr));
    this.outline.resolution.value.set(pw, ph);
    this.grade.resolution.value.set(pw, ph);
    // linhas um pouco mais grossas em telas grandes
    this.outline.uThickness.value = Math.max(1, Math.min(2, ph / 900));
  }

  render(dt, time) {
    const cam = this.camera;
    this.outline.cameraNear.value = cam.near;
    this.outline.cameraFar.value = cam.far;
    this.outline.uTime.value = time;
    const fog = this.scene.fog;
    if (fog) {
      this.outline.uFogColor.value.copy(fog.color);
      this.outline.uFogDensity.value = fog.near;
    }
    this.grade.uTime.value = time;
    this.composer.render(dt);
  }
}
