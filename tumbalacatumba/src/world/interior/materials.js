import * as THREE from 'three';
import { toonMat, flameMat, glowMat, GLOW_ENTRY } from '../../render/toon.js';
import { LAYER_FX } from '../../render/postfx.js';

/** brilho que não depende do ciclo dia/noite (dentro da mansão as velas ficam sempre acesas) */
function alwaysLit(m, hex, intensity) {
  const e = GLOW_ENTRY.get(m);
  const c = new THREE.Color(hex).multiplyScalar(intensity);
  e.day.copy(c);
  e.night.copy(c);
  m.color.copy(c);
  return m;
}

export function makeInteriorMaterials(T) {
  const tx = (map, rim = 0.35, extra = {}) => {
    const m = toonMat({ map, vertexColors: true, ...extra }, rim);
    return m;
  };
  const M = {
    damask: tx(T.damask), stripes: tx(T.stripes), plaster: tx(T.plaster), woodPanel: tx(T.woodPanel),
    parquet: tx(T.parquet), marble: tx(T.marble), stone: tx(T.stone), stoneTile: tx(T.stoneTile),
    tile: tx(T.tile), tileBath: tx(T.tileBath), checker: tx(T.checker), planks: tx(T.planks), carpet: tx(T.carpet),
    rugs: tx(T.rugs, 0.2),
    portraits: tx(T.portraits, 0.1),
    labels: tx(T.labels, 0.1),
    // chamas: velas, lareira e forno (sempre acesas)
    candle: alwaysLit(flameMat('#ffb04a', '#ffb04a', 1), '#ffb04a', 4.4),
    fire: alwaysLit(flameMat('#ff7a2a', '#ff7a2a', 1), '#ff7a2a', 3.4),
    ember: alwaysLit(glowMat('#ff4a1a', '#ff4a1a', 1), '#ff5a1a', 2.2),
    bloodGlow: alwaysLit(glowMat('#b8102a', '#b8102a', 1), '#c8142e', 1.15),
    potion: alwaysLit(glowMat('#7aff5a', '#7aff5a', 1), '#7aff5a', 1.8),
    crystal: alwaysLit(glowMat('#9a7aff', '#9a7aff', 1), '#b89aff', 2.2),
    eyes: alwaysLit(glowMat('#ffd84a', '#ffd84a', 1), '#ffd84a', 2.6),
    ghostEye: alwaysLit(glowMat('#8affd8', '#8affd8', 1), '#8affd8', 2.4),
    // vitral e janelas: a cor é ajustada todo quadro conforme a hora lá fora
    rose: new THREE.MeshBasicMaterial({ map: T.rose, transparent: true, alphaTest: 0.5, color: '#ffffff' }),
    viewNight: new THREE.MeshBasicMaterial({ map: T.viewNight, color: '#ffffff' }),
    viewDay: new THREE.MeshBasicMaterial({ map: T.viewDay, color: '#ffffff' }),
    cobweb: new THREE.MeshBasicMaterial({ map: T.cobweb, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.55, fog: true }),
    shaft: new THREE.MeshBasicMaterial({ map: T.shaft, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, color: '#8a90c0', fog: false }),
    dark: new THREE.MeshBasicMaterial({ color: '#07060a' }), // fundo de buracos (lareira, ralo, espelho)
    mirror: toonMat({ color: '#2a3040', emissive: '#0a0c14' }, 1.4),
  };
  // brilhos, vidros e chamas não ganham contorno de tinta (e saem do passe de normais: menos draw calls)
  for (const k of ['rose', 'viewNight', 'viewDay', 'cobweb', 'shaft', 'candle', 'fire', 'ember', 'bloodGlow', 'potion', 'crystal', 'eyes', 'ghostEye']) M[k].userData.layer = LAYER_FX;
  M.cobweb.userData.layer = LAYER_FX;
  // superfícies com textura que projetam sombra (móveis revestidos); paredes/pisos não
  for (const k of ['woodPanel', 'rugs', 'portraits', 'labels']) M[k].userData.cast = false;
  return M;
}

/** material de piso/parede pelo nome usado na planta */
export function surfaceMat(M, name) {
  return M[name] ?? M.plaster;
}
