/**
 * Motor de Projeção Espacial e Tabuleiro Tático (D&D 3.5) — TASK_011.
 *
 * Módulo puro (sem dependência de DOM):
 * - Aplica a simplificação oficial da 3.5 para o espaço ocupado por miniaturas (Space N×N).
 * - Converte a distância métrica do combate em quadrados de grade (1 quadrado = 1,5 m / 5 pés).
 * - Projeta as posições 1D do motor de combate (combat30.js) em uma grade bidimensional com raias (lanes Y)
 *   sem sobreposição caótica de tokens.
 */

export const METROS_POR_QUADRADO = 1.5; // 5 pés no D&D

/**
 * Tabela de espaço ocupado uniforme (Space) segundo a simplificação da 3.5.
 * Toda criatura ocupa um quadrado simétrico de N×N casas na grade de 5 pés (1,5 m).
 */
export const ESPACO_35_QUADRADOS = {
  'Mínimo': 1,
  'Minúsculo': 1,
  'Miúdo': 1,
  'Pequeno': 1,
  'Médio': 1,
  'Grande': 2,
  'Enorme': 3,
  'Imenso': 4,
  'Gargantuesco': 4,
  'Colossal': 6,
};

/** Retorna a dimensão N (largura e altura em quadrados de 1,5m) para o tamanho informado. */
export function tamanhoEmQuadrados(tamanho) {
  if (!tamanho) return 1;
  const limpo = String(tamanho).trim();
  return ESPACO_35_QUADRADOS[limpo] || 1;
}

/**
 * Calcula as dimensões recomendadas do tabuleiro em número de quadrados.
 * Garante margens confortáveis para o Lado A (à esquerda), o vão central da luta e o Lado B (à direita).
 */
export function calcularDimensoesGrid(distanciaMetros = 9, combatentes = []) {
  const dist = Math.max(3, Number(distanciaMetros) || 9);
  const casasVao = Math.ceil(dist / METROS_POR_QUADRADO);
  
  // Encontra o maior token para garantir margens seguras
  const maiorToken = combatentes.reduce((max, c) => Math.max(max, tamanhoEmQuadrados(c.tamanho)), 1);
  const margemLateral = Math.max(2, maiorToken);

  // Largura: margem esquerda + vão da luta + margem direita
  const cols = Math.max(16, margemLateral * 2 + casasVao + 2);

  // Altura: deve comportar confortavelmente as miniaturas distribuídas em raias
  const contagemPorLado = Math.max(
    combatentes.filter(c => c.lado === 'A').length,
    combatentes.filter(c => c.lado === 'B').length,
    1
  );
  const espacoNecessarioY = contagemPorLado * maiorToken;
  const rows = Math.max(10, Math.min(16, 4 + espacoNecessarioY));

  return { cols, rows, margemA: margemLateral };
}

/**
 * Distância tática entre duas áreas na grade D&D 3.5 (em quadrados).
 * Considera os cantos mais próximos para criaturas maiores que 1x1.
 */
export function distanciaEmQuadrados(posA, posB) {
  const ax1 = posA.col, ax2 = posA.col + posA.span - 1;
  const ay1 = posA.row, ay2 = posA.row + posA.span - 1;

  const bx1 = posB.col, bx2 = posB.col + posB.span - 1;
  const by1 = posB.row, by2 = posB.row + posB.span - 1;

  const dx = Math.max(0, Math.max(ax1 - bx2, bx1 - ax2));
  const dy = Math.max(0, Math.max(ay1 - by2, by1 - ay2));

  // No D&D 3.5, a distância de engajamento é o máximo entre dx e dy (Chebyshev)
  return Math.max(dx, dy);
}

/**
 * Projeta as posições dos combatentes na grade 2D.
 * Recebe os combatentes atuais da luta (ou o objeto da batalha `b`).
 * 
 * Mantém a distância X proporcional a c.pos e distribui verticalmente em raias (linhas Y)
 * de forma estável (um combatente não pula aleatoriamente de linha entre turnos).
 */
export function projetarPosicoesGrid(b, opcoes = {}) {
  const combatentes = b?.combatentes || opcoes.combatentes || [];
  const distancia = b?.distancia ?? opcoes.distancia ?? 9;

  const { cols, rows, margemA } = calcularDimensoesGrid(distancia, combatentes);
  const centroY = Math.floor(rows / 2);

  // Alocação determinística de raias Y por combatente (mantendo a linha de combate)
  // Separa combatentes por lado
  const lados = { A: [], B: [] };
  for (const c of combatentes) {
    if (c.lado === 'B') lados.B.push(c);
    else lados.A.push(c);
  }

  const resultado = new Map();

  function alocarLado(lista, lado) {
    if (!lista.length) return;

    // Calcula o espaço total ocupado em Y pelas criaturas deste lado
    const alturas = lista.map(c => tamanhoEmQuadrados(c.tamanho));
    const alturaTotal = alturas.reduce((acc, h) => acc + h, 0) + (alturas.length - 1); // com 1 célula de espaçamento se couber

    // Ponto inicial Y para centralizar o grupo
    let startY = Math.max(1, Math.floor(centroY - alturaTotal / 2));

    lista.forEach((c, idx) => {
      const span = tamanhoEmQuadrados(c.tamanho);
      
      // Coordenada Coluna (X):
      // No motor combat30.js: lado A começa em 0, lado B começa em b.distancia.
      // À medida que avançam, c.pos de A aumenta e c.pos de B se aproxima de A.
      const colBase = Math.round(c.pos / METROS_POR_QUADRADO);
      
      let col;
      if (lado === 'A') {
        col = margemA + colBase;
      } else {
        // Para o lado B, garantimos que col fique posicionado corretamente
        // Se c.pos é relativo à origem 0, col = margemA + colBase
        col = margemA + colBase;
      }

      // Limita col para dentro dos limites do tabuleiro
      col = Math.max(0, Math.min(cols - span, col));

      // Coordenada Linha (Y):
      let row = startY;
      // Garante que a criatura caiba dentro da altura do tabuleiro
      if (row + span > rows) {
        row = Math.max(0, rows - span);
      }

      startY += span + 1; // avança para o próximo combatente

      resultado.set(c.uid, {
        uid: c.uid,
        nome: c.nome,
        lado: c.lado,
        tamanho: c.tamanho,
        span,
        col,
        row,
        pv: c.pv,
        pvMax: c.pvMax,
        estado: c.estado,
        cond: Object.keys(c.cond || {}),
        posMetros: c.pos,
        ref: c.ref,
        tipo: c.tipo,
      });
    });
  }

  alocarLado(lados.A, 'A');
  alocarLado(lados.B, 'B');

  return {
    dimensoes: { cols, rows, metrosPorQuadrado: METROS_POR_QUADRADO },
    posicoes: resultado,
    lista: Array.from(resultado.values()),
  };
}
