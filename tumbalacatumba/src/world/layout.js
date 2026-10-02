// Planta do Vale Tumbalacatumba.
// Coordenadas em metros. +X = leste, -X = oeste, -Z = norte, +Z = sul (no mapa, norte fica em cima).

export const WORLD_SIZE = 320;
export const HALF = WORLD_SIZE / 2;
export const SEG = 256;
export const WATER_LEVEL = 0;
export const PLAY_LIMIT = 146;

export const ZONE_NAME = 'Vale Tumbalacatumba';

// ordem importa: a primeira zona que contém o ponto vence ("vila" é o anel externo da praça)
export const SUBZONES = [
  { id: 'praca', name: 'Praça do Relógio Torto', x: 0, z: 0, r: 27, color: '#ffd36b' },
  { id: 'cemiterio', name: 'Cemitério Sorridente', x: 74, z: -64, r: 38, color: '#c9c3ff' },
  { id: 'lago', name: 'Lago Lamentoso', x: 4, z: -100, r: 40, color: '#9fd8ff' },
  { id: 'colina', name: 'Colina Espiral', x: -98, z: -94, r: 36, color: '#b8e0c8' },
  { id: 'pantano', name: 'Pântano dos Sapos Tristes', x: -110, z: 22, r: 42, color: '#b5e36b' },
  { id: 'bosque', name: 'Bosque Retorcido', x: -80, z: 96, r: 38, color: '#9fe0b0' },
  { id: 'sitio', name: 'Sítio do Seu Custódio', x: 8, z: 98, r: 42, color: '#ffb86b' },
  { id: 'fendas', name: 'Fendas Sulfurosas', x: 90, z: 106, r: 26, color: '#ff8a5b' },
  { id: 'mansao', name: 'Mansão Dentúcio', x: 118, z: 6, r: 34, color: '#ff8fa3' },
  { id: 'farol', name: 'Farol Desalinhado', x: 44, z: -124, r: 18, color: '#ffe9a8' },
  { id: 'vila', name: 'Vila Tumbalacatumba', x: 0, z: 0, r: 68, color: '#ffd36b' },
];

// Estradas (polilinhas suavizadas). w = largura total em metros.
export const ROADS = [
  { id: 'norte', w: 4.4, pts: [[0, -17], [1, -34], [-2, -50], [2, -62], [3, -71]] },
  { id: 'nordeste', w: 4.0, pts: [[12, -12], [26, -23], [40, -34], [51, -43], [57, -48]] },
  { id: 'leste', w: 4.4, pts: [[17, 3], [38, 7], [58, 6], [76, 11], [93, 16]] },
  { id: 'sul', w: 4.4, pts: [[0, 17], [-2, 36], [3, 54], [6, 68], [6, 79]] },
  { id: 'oeste', w: 4.2, pts: [[-17, 3], [-38, 8], [-58, 12], [-72, 14], [-80, 15]] },
  { id: 'noroeste', w: 3.6, pts: [[-12, -12], [-30, -33], [-48, -54], [-62, -68], [-76, -80]] },
  { id: 'bosque', w: 3.4, pts: [[-2, 38], [-20, 52], [-42, 70], [-58, 86], [-68, 96]] },
  { id: 'fendas', w: 3.2, pts: [[6, 79], [30, 86], [54, 95], [76, 103]] },
  { id: 'lago', w: 3.0, pts: [[3, -71], [16, -74], [28, -82], [35, -92], [37, -101]] },
  { id: 'mansao', w: 3.6, pts: [[93, 16], [103, 12], [111, 6], [115, 3.5]] },
  { id: 'farol', w: 2.6, pts: [[35, -92], [44, -104], [46, -116]] },
  { id: 'sitio', w: 3.0, pts: [[6, 79], [8, 92], [2, 104], [-8, 112]] },
];

// caminhos de terra dentro do cemitério (calculados no fim do arquivo)
export const STREAM = { w: 3.4, pts: [[-24, -99], [-42, -89], [-56, -70], [-64, -50], [-74, -30], [-86, -12], [-98, 6]] };

export const PLAZA = { x: 0, z: 0, r: 17.5 };
export const LAKE = { x: 4, z: -100, r: 34 };
export const ISLAND = { x: 2, z: -106, r: 8.5 };
export const SWAMP = { x: -112, z: 24, r: 36 };

// colinas e depressões extras
export const BUMPS = [
  { x: 120, z: 5, r: 34, h: 8.5 }, // colina da mansão
  { x: -100, z: -96, r: 30, h: 6.5 }, // monte da colina espiral
  { x: 76, z: -66, r: 38, h: 2.2 }, // cemitério
  { x: -42, z: -58, r: 24, h: 3.2 },
  { x: 58, z: 48, r: 30, h: 4.0 },
  { x: -48, z: 36, r: 20, h: 2.4 },
  { x: 46, z: -124, r: 22, h: 6.0 }, // penhasco do farol
  { x: 30, z: -44, r: 16, h: 1.6 },
  { x: -86, z: 60, r: 22, h: 3.0 },
  { x: 100, z: 64, r: 26, h: 4.5 },
];

export const CEMETERY = { x: 76, z: -64, hw: 25, hd: 18, rot: -0.87 };
/** coordenadas locais do cemitério → mundo (portão fica no lado +z local, virado para a vila) */
export function cemToWorld(lx, lz) {
  const c = Math.cos(CEMETERY.rot), s = Math.sin(CEMETERY.rot);
  return [CEMETERY.x + lx * c + lz * s, CEMETERY.z - lx * s + lz * c];
}
export const CLOCK_TOWER = { x: 0, z: -8 };
export const FOUNTAIN = { x: 0, z: 5 };
export const MANOR = { x: 124, z: 3, rot: -Math.PI / 2 };
export const MANOR_GATE = { x: 101, z: 13 };
export const SPIRAL_HILL = { x: -102, z: -98 };
export const PUMPKIN_FIELD = { x: -20, z: 96, hw: 13, hd: 11, rot: 0.04 };
export const CROP_FIELD = { x: 30, z: 99, hw: 11, hd: 7.5, rot: -0.06 };
export const BARN = { x: 32, z: 117, rot: 0.15 };
export const FARMHOUSE = { x: -12, z: 119, rot: -0.1 };
export const WINDMILL = { x: 54, z: 84 };
export const NEST = { x: -40, z: 115 };
export const VENTS = { x: 90, z: 107, r: 15 };
export const WOODS = { x: -80, z: 98, r: 34 };
export const LIGHTHOUSE = { x: 47, z: -124 };
export const SKULL_ROCK = { x: -62, z: -26 };
export const WITCH_HUT = { x: -124, z: 10 };
export const CHAPEL = { x: 92, z: -84, rot: -0.5 };

// Estruturas caminháveis (píer, pontes, passarela) — o chão vira o deck
export const DECKS = [
  { id: 'pier', pts: [[3, -69], [3, -87]], w: 3.4, h: 0.95, kind: 'pier' },
  { id: 'ponte-ilha', pts: [[38.5, -102.6], [22, -105], [8.5, -106]], w: 3.3, h: 1.15, arch: 1.1, kind: 'bridge' },
  { id: 'passarela', pts: [[-80, 15], [-92, 12], [-104, 14], [-113, 10], [-120, 11]], w: 2.4, h: 0.55, kind: 'boardwalk' },
];

// Onde cada PNJ fica
export const NPC_SPOTS = {
  prefeito: { x: 5.5, z: 10, yaw: 0.3 },
  aranhilda: { x: -31, z: 13.5, yaw: 0.4 },
  tonico: { x: 56, z: -53.6, yaw: -0.9 },
  juvenal: { x: 74.9, z: -59.1, yaw: -0.6 },
  custodio: { x: 11, z: 84, yaw: -2.6 },
  zepalha: { x: -20, z: 96, yaw: 3.0 },
  conde: { x: 98, z: 16.5, yaw: -1.6 },
  vesga: { x: -121, z: 14.5, yaw: 1.1 },
  suspiro: { x: 3, z: -85, yaw: 0 },
  nevoa: { x: 1.5, z: -106, yaw: 1.2 },
};

// esconderijos do Sr. Bigodes (ele foge duas vezes antes de se render)
export const CAT_SPOTS = [
  { x: -76, z: -73 },
  { x: -91, z: -70 },
  { x: -86, z: -88 },
];

export const FROG_SPOT = { x: -100, z: 38 };
export const EGG_SPOT = { x: -40, z: 115 };
export const HOME_SPOT = { x: 0, z: 13, yaw: Math.PI }; // pedra de retorno

// áreas de objetivos (para o minimapa/mapa-múndi)
export const QUEST_AREAS = {
  ossos: { x: 76, z: -64, r: 24 },
  vagalumes: { x: -80, z: 98, r: 26 },
  brasas: { x: 90, z: 107, r: 14 },
  abobora: { x: -20, z: 96, r: 16 },
  corvos: { x: 8, z: 98, r: 30 },
  cogumelos: { x: -106, z: 26, r: 26 },
  gato: { x: -84, z: -78, r: 16 },
  dentadura: { x: -100, z: 38, r: 8 },
  pimenta: { x: 90, z: 107, r: 16 },
  baile: { x: 76, z: -64, r: 24 },
  pelo: { x: -82, z: 98, r: 26 },
  sotao: { x: 126, z: 3, r: 16 },
  casamento: { x: 45, z: -122, r: 12 },
  capa: { x: 118, z: 3, r: 7 }, // porta da mansão (as pistas ficam lá dentro)
};

// Nível das criaturas por região: fácil perto da vila e das primeiras missões, difícil nos cantos mais sinistros.
// A vila, o lago e as fendas não têm criaturas.
export const ZONE_LEVELS = {
  sitio: [1, 2], // fácil: corvos (neutros)
  colina: [1, 2], // fácil: ratos-zumbis
  cemiterio: [2, 3], // médio: caveiras saltitantes
  pantano: [3, 3], // médio: sapos (neutros)
  bosque: [3, 4], // médio-difícil: aranhas cabeludas
  mansao: [4, 5], // difícil: morcegos dentuços
  farol: [4, 5], // difícil: marujos afogados
};

// Onde nascem as criaturas hostis (círculo de sorteio; o nível vem de ZONE_LEVELS)
export const MOB_SPAWNS = [
  { zone: 'colina', type: 'rato', x: -94, z: -86, r: 22, count: 7 },
  { zone: 'cemiterio', type: 'caveira', x: 76, z: -64, r: 22, count: 6 },
  { zone: 'bosque', type: 'aranha', x: -82, z: 98, r: 24, count: 5 },
  { zone: 'mansao', type: 'morcego', x: 128, z: 2, r: 13, count: 5, safe: 24 },
  { zone: 'farol', type: 'marujo', x: 46, z: -126, r: 10, count: 4, maxZ: -116 },
];

ROADS.push(
  { id: 'cem-eixo', w: 2.6, pts: [[0, 21], [0, 8], [0.5, -4], [0, -10]].map(([x, z]) => cemToWorld(x, z)) },
  { id: 'cem-cruz', w: 2.2, pts: [[-20, 2], [-8, 1], [8, 1.5], [20, 1]].map(([x, z]) => cemToWorld(x, z)) },
);
