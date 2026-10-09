/**
 * Geometria de Cones e Áreas de Efeito (D&D 3.5) — TASK_011.
 *
 * Módulo puro:
 * - Calcula a projeção geométrica discreta de cones em uma grade de 5 pés (1,5 m).
 * - Identifica as células afetadas e os combatentes interceptados pela área.
 * - Fornece dados vetoriais (polígono e gradientes) para a camada de renderização VFX.
 */

import { METROS_POR_QUADRADO } from './tabuleiro35.js';

export const TEMAS_CONE = {
  fogo: {
    corPrincipal: 'rgba(239, 68, 68, 0.55)',
    corCentro: 'rgba(254, 240, 138, 0.85)',
    corBorda: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.6)',
    nome: 'Fogo',
  },
  frio: {
    corPrincipal: 'rgba(56, 189, 248, 0.55)',
    corCentro: 'rgba(240, 249, 255, 0.9)',
    corBorda: '#0284c7',
    glow: 'rgba(56, 189, 248, 0.7)',
    nome: 'Frio',
  },
  acido: {
    corPrincipal: 'rgba(132, 204, 22, 0.55)',
    corCentro: 'rgba(236, 252, 203, 0.85)',
    corBorda: '#65a30d',
    glow: 'rgba(132, 204, 22, 0.6)',
    nome: 'Ácido',
  },
  gas: {
    corPrincipal: 'rgba(168, 85, 247, 0.45)',
    corCentro: 'rgba(243, 232, 255, 0.75)',
    corBorda: '#9333ea',
    glow: 'rgba(168, 85, 247, 0.5)',
    nome: 'Gás',
  },
  eletricidade: {
    corPrincipal: 'rgba(99, 102, 241, 0.55)',
    corCentro: 'rgba(224, 231, 255, 0.9)',
    corBorda: '#4f46e5',
    glow: 'rgba(99, 102, 241, 0.7)',
    nome: 'Eletricidade',
  },
};

/** Identifica o tema visual a partir da descrição ou tipo de energia */
export function detectarTemaCone(tipoEnergia, nomeAcao = '') {
  const texto = `${tipoEnergia || ''} ${nomeAcao || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (/fogo|chama|flamejante|quente/.test(texto)) return 'fogo';
  if (/frio|gelo|glacial|congelante/.test(texto)) return 'frio';
  if (/acido|corrosivo|caustico/.test(texto)) return 'acido';
  if (/eletricidade|relampago|raio|eletrico/.test(texto)) return 'eletricidade';
  if (/gas|sono|paralisia|veneno|nevoa/.test(texto)) return 'gas';
  return 'fogo'; // fallback padrão
}

/**
 * Calcula a geometria do cone no tabuleiro.
 * 
 * @param {Object} atacantePos - Posição do atacante no grid { col, row, span, lado }
 * @param {Object} alvoPos - Posição do alvo principal { col, row, span } (ou direção implícita)
 * @param {number} alcanceMetros - Comprimento do cone em metros (ex.: 4.5, 9, 15, 18)
 * @param {Object} gridDims - Dimensões do tabuleiro { cols, rows }
 * @param {Array} combatentes - Lista de combatentes posicionados
 */
export function calcularCone({
  atacantePos,
  alvoPos = null,
  alcanceMetros = 9,
  gridDims = { cols: 20, rows: 12 },
  combatentes = [],
  tipoEnergia = 'fogo',
  nomeAcao = '',
}) {
  const alcanceQuadrados = Math.max(2, Math.round(alcanceMetros / METROS_POR_QUADRADO));
  const tema = detectarTemaCone(tipoEnergia, nomeAcao);

  // Determina o ponto de origem na borda do atacante voltada para o inimigo
  const atacanteCentroY = atacantePos.row + atacantePos.span / 2;
  const lado = atacantePos.lado || 'A';
  
  // Direção padrão: Lado A atira para a direita (+1), Lado B atira para a esquerda (-1)
  let dirX = lado === 'A' ? 1 : -1;
  let dirY = 0;

  let origemX;
  if (dirX > 0) {
    origemX = atacantePos.col + atacantePos.span; // borda direita
  } else {
    origemX = atacantePos.col; // borda esquerda
  }
  const origemY = atacanteCentroY;

  // Se houver um alvo específico, ajusta o vetor de direção do cone
  if (alvoPos) {
    const alvoCentroX = alvoPos.col + alvoPos.span / 2;
    const alvoCentroY = alvoPos.row + alvoPos.span / 2;
    const vdx = alvoCentroX - origemX;
    const vdy = alvoCentroY - origemY;
    const len = Math.hypot(vdx, vdy);
    if (len > 0.001) {
      dirX = vdx / len;
      dirY = vdy / len;
    }
  }

  // Ângulo central do cone em radianos
  const anguloCentro = Math.atan2(dirY, dirX);
  const meiaAbertura = (Math.PI / 4); // 45 graus (abertura total de 90 graus na 3.5)

  // Vértices do polígono do cone para renderização gráfica contínua (VFX overlay)
  const poligono = [
    { x: origemX, y: origemY },
    {
      x: origemX + alcanceQuadrados * Math.cos(anguloCentro - meiaAbertura),
      y: origemY + alcanceQuadrados * Math.sin(anguloCentro - meiaAbertura),
    },
    {
      x: origemX + alcanceQuadrados * Math.cos(anguloCentro),
      y: origemY + alcanceQuadrados * Math.sin(anguloCentro),
    },
    {
      x: origemX + alcanceQuadrados * Math.cos(anguloCentro + meiaAbertura),
      y: origemY + alcanceQuadrados * Math.sin(anguloCentro + meiaAbertura),
    },
  ];

  // Identifica células discretas da grade abrangidas pelo cone
  const celulasAfetadas = [];
  const { cols, rows } = gridDims;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Centro da célula da grade
      const cx = c + 0.5;
      const cy = r + 0.5;

      const dx = cx - origemX;
      const dy = cy - origemY;
      const dist = Math.hypot(dx, dy);

      // Deve estar dentro do raio do alcance
      if (dist <= alcanceQuadrados + 0.5 && dist >= 0.2) {
        const anguloPonto = Math.atan2(dy, dx);
        let diffAngulo = Math.abs(anguloPonto - anguloCentro);
        while (diffAngulo > Math.PI) diffAngulo = Math.abs(diffAngulo - 2 * Math.PI);

        if (diffAngulo <= meiaAbertura + 0.1) {
          celulasAfetadas.push({ col: c, row: r });
        }
      }
    }
  }

  // Identifica quais combatentes são atingidos pelo cone
  const combatentesAtingidos = [];
  for (const c of combatentes) {
    if (c.uid === atacantePos.uid) continue; // o próprio atacante não se atinge com o cone frontal

    // Verifica se qualquer célula ocupada pelo combatente está nas células afetadas
    let atingido = false;
    for (let cr = c.row; cr < c.row + c.span; cr++) {
      for (let cc = c.col; cc < c.col + c.span; cc++) {
        if (celulasAfetadas.some(cell => cell.col === cc && cell.row === cr)) {
          atingido = true;
          break;
        }
      }
      if (atingido) break;
    }

    if (atingido) {
      combatentesAtingidos.push(c);
    }
  }

  return {
    origem: { x: origemX, y: origemY },
    angulo: anguloCentro,
    alcanceMetros,
    alcanceQuadrados,
    poligono,
    celulasAfetadas,
    combatentesAtingidos,
    tema: TEMAS_CONE[tema],
    tipoTema: tema,
  };
}
