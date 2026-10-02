import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Neblina customizada: distância exponencial + névoa rasteira que depende da altura.
// Usa THREE.Fog "hackeado": fog.near = densidade de distância, fog.far = intensidade da névoa rasteira.
// ---------------------------------------------------------------------------
THREE.ShaderChunk.fog_pars_vertex = /* glsl */ `
#ifdef USE_FOG
  varying float vFogDepth;
  varying float vFogHeight;
#endif
`;
THREE.ShaderChunk.fog_vertex = /* glsl */ `
#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  vFogHeight = ( transpose( mat3( viewMatrix ) ) * mvPosition.xyz + cameraPosition ).y;
#endif
`;
THREE.ShaderChunk.fog_pars_fragment = /* glsl */ `
#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth;
  varying float vFogHeight;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif
`;
THREE.ShaderChunk.fog_fragment = /* glsl */ `
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
  #else
    float fogD = 1.0 - exp( - fogNear * fogNear * vFogDepth * vFogDepth );
    float fogH = fogFar * exp( - max( vFogHeight - 0.3, 0.0 ) * 0.3 ) * ( 1.0 - exp( - vFogDepth * 0.035 ) );
    float fogFactor = clamp( fogD + fogH * ( 1.0 - fogD ), 0.0, 1.0 );
  #endif
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif
`;

/** Uniforms globais compartilhados por vários shaders. */
export const SHARED = {
  uTime: { value: 0 },
  uNight: { value: 0 },
  uWind: { value: 1 },
};

function makeGradient(values) {
  const data = new Uint8Array(values.length * 4);
  values.forEach((v, i) => {
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = Math.round(v * 255);
    data[i * 4 + 3] = 255;
  });
  const t = new THREE.DataTexture(data, values.length, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

// 3 faixas: sombra própria / meio-tom / luz
export const GRADIENT = makeGradient([0.2, 0.2, 0.2, 0.2, 0.58, 1, 1, 1]);
export const GRADIENT_SOFT = makeGradient([0.35, 0.35, 0.35, 0.5, 0.75, 1, 1, 1]);

/** cor do contorno de luz (luar à noite, quase nada de dia) — atualizada pelo DayNight */
SHARED.uRim = { value: new THREE.Color(0, 0, 0) };

function addRim(m, strength) {
  m.onBeforeCompile = (s) => {
    s.uniforms.uRim = SHARED.uRim;
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRim;')
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        float rimF = pow(1.0 - clamp(dot(geometryNormal, geometryViewDir), 0.0, 1.0), 3.0);
        reflectedLight.indirectDiffuse += uRim * rimF * (diffuseColor.rgb * 1.5 + 0.08) * ${strength.toFixed(2)};
        // segurança: luz pontual a milímetros de uma superfície passa do limite do half-float e o bloom espalharia o Inf
        reflectedLight.directDiffuse = min(reflectedLight.directDiffuse, vec3(24.0));`
      );
  };
  m.customProgramCacheKey = () => 'rim-' + strength;
  return m;
}

export function toonMat(opts = {}, rim = 1.0) {
  const m = new THREE.MeshToonMaterial({ gradientMap: GRADIENT, ...opts });
  return rim > 0 ? addRim(m, rim) : m;
}

/** material toon com cores por vértice — usado por quase todo o cenário */
export const MAT = {
  vc: toonMat({ vertexColors: true }, 0.55),
  vcDouble: toonMat({ vertexColors: true, side: THREE.DoubleSide }, 0.55),
};

// ---------------------------------------------------------------------------
// Materiais que brilham (janelas, lanternas...). A cor muda com o ciclo dia/noite.
// Cores > 1 viram HDR e ativam o bloom.
// ---------------------------------------------------------------------------
const glowRegistry = [];
/** entrada de cada material de brilho no ciclo dia/noite (num WeakMap: no userData viraria referência circular e quebraria o clone) */
export const GLOW_ENTRY = new WeakMap();

export function glowMat(dayHex, nightHex, nightIntensity = 3, opts = {}) {
  const m = new THREE.MeshBasicMaterial({ color: dayHex, ...opts });
  const entry = { m, day: new THREE.Color(dayHex), night: new THREE.Color(nightHex).multiplyScalar(nightIntensity) };
  glowRegistry.push(entry);
  GLOW_ENTRY.set(m, entry);
  return m;
}

/** Chama tremulante (velas, tochas). A fase vem da posição no mundo. */
export function flameMat(dayHex, nightHex, nightIntensity = 3, opts = {}) {
  const m = glowMat(dayHex, nightHex, nightIntensity, opts);
  m.onBeforeCompile = (s) => {
    s.uniforms.uTime = SHARED.uTime;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying float vFlick;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 fwp = vec4( transformed, 1.0 );
        #ifdef USE_INSTANCING
          fwp = instanceMatrix * fwp;
        #endif
        vec3 fp = floor( ( modelMatrix * fwp ).xyz * 1.3 );
        vFlick = 0.72 + 0.28 * sin( uTime * 13.0 + fp.x * 7.1 + fp.z * 3.7 ) * sin( uTime * 7.3 + fp.z * 5.3 + fp.y );`
      );
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vFlick;')
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse * vFlick, opacity );');
  };
  m.customProgramCacheKey = () => 'flame-v1';
  return m;
}

export function updateGlows(nightFactor) {
  for (const g of glowRegistry) g.m.color.copy(g.day).lerp(g.night, nightFactor);
}

/** Materiais de brilho padrão do cenário */
export const GLOW = {
  window: glowMat('#3b4658', '#ffc36a', 2.6),
  windowGreen: glowMat('#32463a', '#9dff7a', 2.4),
  windowRed: glowMat('#4a3040', '#ff6a4a', 2.4),
  windowPurple: glowMat('#3d3450', '#d69bff', 2.4),
  lamp: flameMat('#ffe7b0', '#ffc46b', 4.2),
  candle: flameMat('#ffe0a0', '#ffb04a', 4.5),
  jack: flameMat('#2a1206', '#ffa23a', 4.0),
  eyes: glowMat('#1a1a1a', '#ffe14a', 3.5),
  mushroom: glowMat('#6fd6c8', '#6fffe8', 2.2),
  mushroomPink: glowMat('#d68ac8', '#ff8ae8', 2.2),
  lava: flameMat('#ff6a2a', '#ff7a2a', 3.0),
  toxic: glowMat('#7aa84a', '#9fff5a', 1.8),
  moonStone: glowMat('#7a9a8a', '#8affc0', 2.5),
};
