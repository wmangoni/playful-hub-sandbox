// Planta do interior da Mansão Dentúcio (coordenadas locais em metros).
// O interior fica longe do mapa (e acima da água): entrar pela porta leva o jogador para cá.
// +x = leste, +z = sul (a porta da frente fica em z = +9). Lá dentro a mansão é maior do que por fora:
// coisa de vampiro, explica o mordomo.

export const INTERIOR = { x: 0, y: 100, z: 460 };
export const BOUNDS = { x0: -14, x1: 14, z0: -10, z1: 10, y0: -6, y1: 18 };
export const WALL_T = 0.3; // espessura das paredes (centradas na linha)

// níveis: y do piso e pé-direito
export const LV = {
  B: { y: -4.15, h: 3.8, name: 'Porão' },
  G: { y: 0, h: 5.0, name: 'Térreo' },
  U: { y: 5.35, h: 4.0, name: 'Andar de Cima' },
  A: { y: 9.7, h: 1.2, name: 'Sótão' }, // h = parede baixa do sótão; o telhado sobe até a cumeeira
};
export const ATTIC_RIDGE = 6.0; // altura da cumeeira acima do piso do sótão (cumeeira ao longo de z, em x = 0)
/** altura do forro do sótão em x (telhado de duas águas) */
export const atticRoofY = (x) => LV.A.y + LV.A.h + (ATTIC_RIDGE - LV.A.h) * (1 - Math.min(1, Math.abs(x) / 13));

// Cômodos: retângulo, nível e acabamento. hTop = teto (o saguão tem pé-direito duplo).
export const ROOMS = [
  // térreo
  { id: 'saguao', name: 'Saguão', level: 'G', x0: -5, x1: 5, z0: -9, z1: 9, top: 9.35, wall: 'damask', tint: '#8a6aa0', floor: 'marble', wains: 'wood' },
  { id: 'jantar', name: 'Sala de Jantar', level: 'G', x0: -13, x1: -5, z0: -9, z1: 1, wall: 'damask', tint: '#a2505a', floor: 'parquet', wains: 'wood' },
  { id: 'estar', name: 'Sala da Lareira', level: 'G', x0: -13, x1: -5, z0: 1, z1: 9, wall: 'stripes', tint: '#5f8a80', floor: 'parquet', wains: 'wood' },
  { id: 'cozinha', name: 'Cozinha', level: 'G', x0: 5, x1: 13, z0: -9, z1: 1, wall: 'plaster', tint: '#b8a888', floor: 'stoneTile', wains: 'tile' },
  { id: 'musica', name: 'Sala de Música', level: 'G', x0: 5, x1: 13, z0: 1, z1: 9, wall: 'stripes', tint: '#b0904a', floor: 'parquet', wains: 'wood' },
  // andar de cima (o saguão continua subindo até 9,35)
  { id: 'biblioteca', name: 'Biblioteca', level: 'U', x0: -13, x1: -5, z0: -9, z1: 9, wall: 'panel', tint: '#6a4a38', floor: 'parquet', wains: 'wood' },
  { id: 'quarto', name: 'Quarto do Conde', level: 'U', x0: 5, x1: 13, z0: -9, z1: 2, wall: 'damask', tint: '#8a2a3a', floor: 'carpet', wains: 'wood' },
  { id: 'banheiro', name: 'Banheiro', level: 'U', x0: 5, x1: 13, z0: 2, z1: 9, wall: 'tileBath', tint: '#d8d0c8', floor: 'checker', wains: 'none' },
  // porão
  { id: 'cripta', name: 'Cripta da Família', level: 'B', x0: -13, x1: -5, z0: -9, z1: 9, wall: 'stone', tint: '#7a7488', floor: 'stone', wains: 'none' },
  { id: 'lavanderia', name: 'Lavanderia do Anselmo', level: 'B', x0: -5, x1: 5, z0: -9, z1: 9, wall: 'stone', tint: '#8a8078', floor: 'stone', wains: 'none' },
  { id: 'adega', name: 'Adega', level: 'B', x0: 5, x1: 13, z0: -9, z1: 9, wall: 'stone', tint: '#7a6a6a', floor: 'stone', wains: 'none' },
  // sótão
  { id: 'sotao', name: 'Sótão', level: 'A', x0: -13, x1: 13, z0: -9, z1: 9, wall: 'planks', tint: '#8a7460', floor: 'planks', wains: 'none' },
];
export const ROOM = Object.fromEntries(ROOMS.map((r) => [r.id, r]));

/** topo (teto) de um cômodo */
export function roomTop(r) {
  if (r.top) return r.top;
  return LV[r.level].y + LV[r.level].h;
}

// Portas e passagens. axis 'x' = parede em x = at (corre ao longo de z); 'z' = parede em z = at.
// c = centro ao longo da parede, y0 = piso da abertura, h = altura, arch = verga em arco.
export const DOORS = [
  { id: 'frente', axis: 'z', at: 9, c: 0, w: 2.4, y0: 0, h: 3.6, arch: true, closed: true, rooms: ['saguao'] },
  { id: 'sag-jan', axis: 'x', at: -5, c: -4.6, w: 1.9, y0: 0, h: 3.3, arch: true, rooms: ['saguao', 'jantar'] },
  { id: 'sag-est', axis: 'x', at: -5, c: 5.2, w: 1.9, y0: 0, h: 3.3, arch: true, rooms: ['saguao', 'estar'] },
  { id: 'sag-coz', axis: 'x', at: 5, c: -4.6, w: 1.7, y0: 0, h: 3.0, rooms: ['saguao', 'cozinha'] },
  { id: 'sag-mus', axis: 'x', at: 5, c: 5.2, w: 1.9, y0: 0, h: 3.3, arch: true, rooms: ['saguao', 'musica'] },
  { id: 'jan-est', axis: 'z', at: 1, c: -9, w: 1.7, y0: 0, h: 3.0, rooms: ['jantar', 'estar'] },
  // patamar do saguão → alas de cima
  { id: 'pat-bib', axis: 'x', at: -5, c: -7.4, w: 1.7, y0: 5.35, h: 3.0, arch: true, rooms: ['saguao', 'biblioteca'] },
  { id: 'pat-qua', axis: 'x', at: 5, c: -7.4, w: 1.7, y0: 5.35, h: 3.0, arch: true, rooms: ['saguao', 'quarto'] },
  { id: 'qua-ban', axis: 'z', at: 2, c: 10.5, w: 1.3, y0: 5.35, h: 2.7, rooms: ['quarto', 'banheiro'] },
  // porão
  { id: 'ade-lav', axis: 'x', at: 5, c: 0, w: 2.0, y0: -4.15, h: 2.9, arch: true, rooms: ['adega', 'lavanderia'] },
  { id: 'lav-cri', axis: 'x', at: -5, c: 0, w: 2.4, y0: -4.15, h: 3.0, arch: true, gate: true, rooms: ['lavanderia', 'cripta'] },
];

// Janelas (paredes externas). y = parapeito, h = altura; kind: 'tall', 'round', 'rose' (vitral), 'grate' (porão)
export const WINDOWS = [
  { room: 'saguao', axis: 'z', at: 9, c: -3.6, y: 1.1, w: 1.3, h: 3.2, kind: 'tall' },
  { room: 'saguao', axis: 'z', at: 9, c: 3.6, y: 1.1, w: 1.3, h: 3.2, kind: 'tall' },
  { room: 'saguao', axis: 'z', at: 9, c: 0, y: 5.9, w: 3.0, h: 3.0, kind: 'rose' },
  { room: 'jantar', axis: 'x', at: -13, c: -6.2, y: 1.0, w: 1.3, h: 2.8, kind: 'tall' },
  { room: 'jantar', axis: 'x', at: -13, c: -2.2, y: 1.0, w: 1.3, h: 2.8, kind: 'tall' },
  { room: 'jantar', axis: 'z', at: -9, c: -9, y: 1.0, w: 1.3, h: 2.8, kind: 'tall' },
  { room: 'estar', axis: 'x', at: -13, c: 2.7, y: 1.0, w: 1.4, h: 2.8, kind: 'tall' },
  { room: 'estar', axis: 'z', at: 9, c: -9, y: 1.0, w: 1.4, h: 2.8, kind: 'tall' },
  { room: 'cozinha', axis: 'x', at: 13, c: -3.2, y: 1.3, w: 1.2, h: 2.2, kind: 'tall' },
  { room: 'musica', axis: 'x', at: 13, c: 5, y: 1.0, w: 1.4, h: 2.8, kind: 'tall' },
  { room: 'musica', axis: 'z', at: 9, c: 9, y: 1.0, w: 1.4, h: 2.8, kind: 'tall' },
  { room: 'biblioteca', axis: 'x', at: -13, c: -4.5, y: 6.3, w: 1.2, h: 2.6, kind: 'tall' },
  { room: 'biblioteca', axis: 'x', at: -13, c: 4.5, y: 6.3, w: 1.2, h: 2.6, kind: 'tall' },
  { room: 'quarto', axis: 'x', at: 13, c: -3.6, y: 6.2, w: 1.3, h: 2.6, kind: 'tall' },
  { room: 'quarto', axis: 'z', at: -9, c: 9, y: 6.2, w: 1.3, h: 2.6, kind: 'tall' },
  { room: 'banheiro', axis: 'x', at: 13, c: 6, y: 7.0, w: 1.1, h: 1.1, kind: 'round' },
  { room: 'adega', axis: 'x', at: 13, c: 4, y: -1.35, w: 1.0, h: 0.6, kind: 'grate' },
  { room: 'cripta', axis: 'x', at: -13, c: 0, y: -1.35, w: 1.0, h: 0.6, kind: 'grate' },
  { room: 'lavanderia', axis: 'z', at: 9, c: -2, y: -1.35, w: 1.0, h: 0.6, kind: 'grate' },
  { room: 'sotao', axis: 'z', at: 9, c: 0, y: 12.3, w: 1.6, h: 1.6, kind: 'round' },
  { room: 'sotao', axis: 'z', at: -9, c: 0, y: 12.3, w: 1.6, h: 1.6, kind: 'round' },
];

// Escadas (rampas). along = eixo em que sobem; from/to = coordenada no eixo; a0..a1 = faixa no outro eixo.
export const STAIRS = [
  // escadaria do saguão: sobe para o norte até o patamar
  { id: 'grande', along: 'z', from: 1.2, to: -5.8, a0: -2, a1: 2, y0: 0, y1: 5.35 },
  // escada estreita da biblioteca até o sótão (encostada na parede leste)
  { id: 'sotao', along: 'z', from: 8.5, to: 2.0, a0: -6.7, a1: -5.15, y0: 5.35, y1: 9.7 },
  // escada da cozinha para o porão (encostada na parede norte, desce para o leste)
  { id: 'porao', along: 'x', from: 6.2, to: 12.3, a0: -8.85, a1: -7.45, y0: 0, y1: -4.15 },
];

// Patamar do saguão (balcão no andar de cima, com vista para o lustre)
export const LANDING = { x0: -5, x1: 5, z0: -9, z1: -5.8, y: 5.35 };

// Buracos nos pisos (vão das escadas): nível → retângulos
export const HOLES = {
  G: [{ x0: 6.2, x1: 12.85, z0: -8.85, z1: -7.45 }],
  A: [{ x0: -6.7, x1: -5.15, z0: 2.0, z1: 8.5 }],
};

// Pontos de chegada/saída
export const ENTRY = { x: 0, z: 7.4, yaw: Math.PI, y: 0 }; // logo depois da porta, olhando para a escadaria
export const FRONT_DOOR = { x: 0, z: 8.85, y: 0 };
