/**
 * src/engine/aiController.ts
 * Controlador de Inteligência Artificial para o Beach Tennis Card Game (UBT).
 * Implementa os 3 níveis de dificuldade (Fácil, Médio, Difícil) com suporte a:
 * - Escolha de Saque e Recepção (Cartas Laranjas 1..3)
 * - Escolha tática de Rali (Mão Verde, Cavação, Defesa Azul)
 * - Declaração inteligente de Coringas (Azul e Verde)
 * - Rastreamento heurístico de padrões e contagem de cartas (AIHistoryTracker)
 * - Cadência humanizada configurável (600ms - 1200ms)
 *
 * Módulo TypeScript 100% puro (Zero dependências de React/DOM).
 */

import type {
  AIDifficulty,
  AIHistoryTracker,
  AIRallyChoice,
  CardDefinition,
  CardInstance,
  CardType,
  RequiredResponse,
  RNG,
  ServeNumber,
} from './types';
import { CARDS_CATALOG } from './cardsCatalog';
import {
  getLegalMoves,
  getRequiredResponse,
  getValidDeclarationsForResponse,
} from './rallyValidator';

declare module './types' {
  interface AIHistoryTracker {
    serveHistory?: ServeNumber[];
    lastServeZone?: ServeNumber | null;
    totalServesRecorded?: number;
    discardedCardsInPoint?: CardType[];
    discardedCardsInMatch?: CardType[];
    cardDiscardsInPoint?: Partial<Record<CardType, number>>;
  }
}

// ============================================================================
// CONSTANTES DE LINHA DE BASE DO BARALHO (MODO 1V1)
// ============================================================================

export const INITIAL_GROUP_COUNTS: Readonly<Record<RequiredResponse, number>> = Object.freeze({
  BANDEJAS: 6,
  VOLEIOS: 6,
  DEFESAS: 8,
  FUNDO: 10,
});

// ============================================================================
// 1. FÁBRICA E MANIPULAÇÃO DO AIHistoryTracker
// ============================================================================

/**
 * Cria uma nova instância inicializada e vazia de AIHistoryTracker.
 */
export function createAIHistoryTracker(): AIHistoryTracker {
  return {
    playerServeFrequency: { 1: 0, 2: 0, 3: 0 },
    playerReceiveFrequency: { 1: 0, 2: 0, 3: 0 },
    playerDiscardedGroupsInPoint: {
      BANDEJAS: 0,
      VOLEIOS: 0,
      DEFESAS: 0,
      FUNDO: 0,
    },
    consecutiveSameServeCount: 0,
    serveHistory: [],
    lastServeZone: null,
    totalServesRecorded: 0,
    discardedCardsInPoint: [],
    discardedCardsInMatch: [],
    cardDiscardsInPoint: {},
  };
}

/**
 * Registra a zona de saque escolhida pelo jogador humano (1, 2 ou 3).
 * Atualiza contagens, histórico cronológico e contagem de saques consecutivos na mesma zona.
 * Retorna uma nova instância imutável do tracker.
 */
export function recordPlayerServe(
  tracker: AIHistoryTracker,
  zone: number | ServeNumber
): AIHistoryTracker {
  if (!Number.isInteger(zone) || zone < 1 || zone > 3) {
    throw new Error(
      `[aiController] Zona de saque inválida: ${zone}. Deve ser 1, 2 ou 3.`
    );
  }

  const serveZone = zone as ServeNumber;
  const currentCount = tracker.playerServeFrequency?.[serveZone] || 0;
  const isConsecutive = tracker.lastServeZone === serveZone;
  const newConsecutive = isConsecutive ? (tracker.consecutiveSameServeCount || 0) + 1 : 1;

  const currentHistory = tracker.serveHistory || [];
  const totalServes = (tracker.totalServesRecorded || currentHistory.length) + 1;

  return {
    ...tracker,
    playerServeFrequency: {
      ...(tracker.playerServeFrequency || { 1: 0, 2: 0, 3: 0 }),
      [serveZone]: currentCount + 1,
    },
    consecutiveSameServeCount: newConsecutive,
    lastServeZone: serveZone,
    serveHistory: [...currentHistory, serveZone],
    totalServesRecorded: totalServes,
  };
}

/**
 * Registra as duas zonas de recepção escolhidas pelo jogador humano (ex: [1, 2]).
 * Retorna uma nova instância imutável do tracker.
 */
export function recordPlayerReceive(
  tracker: AIHistoryTracker,
  zones: [number, number] | [ServeNumber, ServeNumber]
): AIHistoryTracker {
  if (
    !Array.isArray(zones) ||
    zones.length !== 2 ||
    zones[0] === zones[1] ||
    zones.some((z) => !Number.isInteger(z) || z < 1 || z > 3)
  ) {
    throw new Error(
      `[aiController] Zonas de recepção inválidas: [${zones}]. Devem ser 2 números distintos entre 1 e 3.`
    );
  }

  const newFreq = { ...(tracker.playerReceiveFrequency || { 1: 0, 2: 0, 3: 0 }) };
  newFreq[zones[0] as ServeNumber] = (newFreq[zones[0] as ServeNumber] || 0) + 1;
  newFreq[zones[1] as ServeNumber] = (newFreq[zones[1] as ServeNumber] || 0) + 1;

  return {
    ...tracker,
    playerReceiveFrequency: newFreq,
  };
}

/**
 * Registra o descarte de uma carta no ponto atual.
 * Mapeia a carta para os grupos canônicos da Folha Rosa e incrementa contadores.
 * Retorna uma nova instância imutável do tracker.
 */
export function recordDiscardedCard(
  tracker: AIHistoryTracker,
  card: CardType | CardInstance
): AIHistoryTracker {
  const cardType: CardType =
    typeof card === 'object' && card !== null && 'definition' in card
      ? card.definition.type
      : (card as CardType);

  const def = CARDS_CATALOG[cardType];
  if (!def) {
    throw new Error(`[aiController] Unknown card type: "${cardType}"`);
  }

  // Cartas laranjas de saque não afetam contagem de rally
  if (def.color === 'ORANGE') {
    return tracker;
  }

  const updatedGroups: Record<RequiredResponse, number> = {
    ...(tracker.playerDiscardedGroupsInPoint || {
      BANDEJAS: 0,
      VOLEIOS: 0,
      DEFESAS: 0,
      FUNDO: 0,
    }),
  };

  if (cardType !== 'GOLPE_UBT_CORINGA') {
    for (const group of def.belongsToGroups) {
      updatedGroups[group] = (updatedGroups[group] || 0) + 1;
    }
  }

  const currentPointDiscards = tracker.discardedCardsInPoint || [];
  const currentMatchDiscards = tracker.discardedCardsInMatch || [];
  const currentCardCounts = { ...(tracker.cardDiscardsInPoint || {}) };
  currentCardCounts[cardType] = (currentCardCounts[cardType] || 0) + 1;

  return {
    ...tracker,
    playerDiscardedGroupsInPoint: updatedGroups,
    discardedCardsInPoint: [...currentPointDiscards, cardType],
    discardedCardsInMatch: [...currentMatchDiscards, cardType],
    cardDiscardsInPoint: currentCardCounts,
  };
}

/**
 * Calcula a quantidade de cartas restantes por grupo de resposta na mão/baralho do oponente.
 */
export function getRemainingCardsByGroup(
  tracker: AIHistoryTracker
): Record<RequiredResponse, number> {
  const discards = tracker.playerDiscardedGroupsInPoint || {
    BANDEJAS: 0,
    VOLEIOS: 0,
    DEFESAS: 0,
    FUNDO: 0,
  };

  return {
    BANDEJAS: Math.max(0, INITIAL_GROUP_COUNTS.BANDEJAS - (discards.BANDEJAS || 0)),
    VOLEIOS: Math.max(0, INITIAL_GROUP_COUNTS.VOLEIOS - (discards.VOLEIOS || 0)),
    DEFESAS: Math.max(0, INITIAL_GROUP_COUNTS.DEFESAS - (discards.DEFESAS || 0)),
    FUNDO: Math.max(0, INITIAL_GROUP_COUNTS.FUNDO - (discards.FUNDO || 0)),
  };
}

/**
 * Identifica o grupo de resposta mais escasso do jogador humano no ponto atual.
 *
 * Hierarquia de decisão:
 * 1. Se o Monte Azul estiver esgotado (DEFESAS = 0), retorna DEFESAS (ataque garante Winner imediato).
 * 2. Entre os grupos de rali da mão verde (BANDEJAS, VOLEIOS, FUNDO), retorna o de menor contagem restante.
 * 3. Critério de desempate determinístico: BANDEJAS > VOLEIOS > FUNDO.
 */
export function getScarcestResponseGroup(
  tracker: AIHistoryTracker
): RequiredResponse {
  const remaining = getRemainingCardsByGroup(tracker);

  if (remaining.DEFESAS === 0) {
    return 'DEFESAS';
  }

  const remBandejas = remaining.BANDEJAS;
  const remVoleios = remaining.VOLEIOS;
  const remFundo = remaining.FUNDO;

  const minGreen = Math.min(remBandejas, remVoleios, remFundo);

  if (remBandejas === minGreen) {
    return 'BANDEJAS';
  }
  if (remVoleios === minGreen) {
    return 'VOLEIOS';
  }
  return 'FUNDO';
}

/**
 * Reinicia os contadores de descarte específicos do ponto ao iniciar um novo rali,
 * preservando o histórico cumulativo de saques e recepções da partida.
 */
export function resetPointDiscards(
  tracker: AIHistoryTracker
): AIHistoryTracker {
  return {
    ...tracker,
    playerDiscardedGroupsInPoint: {
      BANDEJAS: 0,
      VOLEIOS: 0,
      DEFESAS: 0,
      FUNDO: 0,
    },
    discardedCardsInPoint: [],
    cardDiscardsInPoint: {},
  };
}

/**
 * Retorna a distribuição empírica de probabilidades de saque do adversário.
 */
export function getServeProbabilities(
  tracker: AIHistoryTracker
): Record<ServeNumber, number> {
  const f1 = tracker.playerServeFrequency?.[1] || 0;
  const f2 = tracker.playerServeFrequency?.[2] || 0;
  const f3 = tracker.playerServeFrequency?.[3] || 0;
  const total = f1 + f2 + f3;

  if (total === 0) {
    return { 1: 1 / 3, 2: 1 / 3, 3: 1 / 3 };
  }

  return {
    1: f1 / total,
    2: f2 / total,
    3: f3 / total,
  };
}

/**
 * Retorna a zona de saque mais frequentemente escolhida pelo jogador humano.
 * Retorna `null` se nenhum saque tiver sido registrado ainda.
 * Em caso de empate, desempata pela zona jogada mais recentemente; se ainda empatado, default Zona 2.
 */
export function getMostFrequentServeZone(
  tracker: AIHistoryTracker
): ServeNumber | null {
  const f1 = tracker.playerServeFrequency?.[1] || 0;
  const f2 = tracker.playerServeFrequency?.[2] || 0;
  const f3 = tracker.playerServeFrequency?.[3] || 0;
  const total = f1 + f2 + f3;

  if (total === 0) {
    return null;
  }

  const maxVal = Math.max(f1, f2, f3);
  const candidates: ServeNumber[] = [];
  if (f1 === maxVal) candidates.push(1);
  if (f2 === maxVal) candidates.push(2);
  if (f3 === maxVal) candidates.push(3);

  if (candidates.length === 1) {
    return candidates[0]!;
  }

  // Desempate por recência no histórico
  const history = tracker.serveHistory || [];
  for (let i = history.length - 1; i >= 0; i--) {
    const zone = history[i]!;
    if (candidates.includes(zone)) {
      return zone;
    }
  }

  // Desempate tático padrão: preferir Zona 2 (meio de quadra), depois Zona 1
  if (candidates.includes(2)) return 2;
  if (candidates.includes(1)) return 1;
  return candidates[0]!;
}

/**
 * Retorna as duas melhores zonas de quadra para a IA cobrir durante a recepção.
 * Ordenadas em tupla [min, max].
 */
export function getTopTwoReceiveZones(
  tracker: AIHistoryTracker
): [ServeNumber, ServeNumber] {
  const primary = getMostFrequentServeZone(tracker);

  if (primary === null) {
    return [1, 2];
  }

  const remaining = ([1, 2, 3] as ServeNumber[]).filter((z) => z !== primary);

  remaining.sort((a, b) => {
    const diff = (tracker.playerServeFrequency?.[b] || 0) - (tracker.playerServeFrequency?.[a] || 0);
    if (diff !== 0) return diff;
    if (b === 2) return 1;
    if (a === 2) return -1;
    return a - b;
  });

  const secondary = remaining[0]!;
  return [
    Math.min(primary, secondary) as ServeNumber,
    Math.max(primary, secondary) as ServeNumber,
  ];
}

/**
 * Retorna a zona de recepção menos coberta pelo jogador humano (alvo de Ace).
 */
export function getLeastCoveredReceiveZone(
  tracker: AIHistoryTracker
): ServeNumber {
  const f1 = tracker.playerReceiveFrequency?.[1] || 0;
  const f2 = tracker.playerReceiveFrequency?.[2] || 0;
  const f3 = tracker.playerReceiveFrequency?.[3] || 0;

  const minVal = Math.min(f1, f2, f3);
  const candidates: ServeNumber[] = [];
  if (f1 === minVal) candidates.push(1);
  if (f2 === minVal) candidates.push(2);
  if (f3 === minVal) candidates.push(3);

  if (candidates.includes(1)) return 1;
  if (candidates.includes(3)) return 3;
  return candidates[0]!;
}

// ============================================================================
// 2. ESCOLHA DE SAQUE (CARTAS LARANJAS 1..3)
// ============================================================================

export function chooseServeZone(
  difficulty: AIDifficulty,
  history?: AIHistoryTracker,
  rng: RNG = Math.random
): ServeNumber {
  const allZones: ServeNumber[] = [1, 2, 3];

  // 1. Fácil: Uniforme puro
  if (difficulty === 'EASY') {
    return allZones[Math.floor(rng() * allZones.length)]!;
  }

  // 2. Médio: Heurística anti-repetição
  if (difficulty === 'MEDIUM') {
    if (history && history.consecutiveSameServeCount >= 2 && history.lastServeZone) {
      const alternativeZones = allZones.filter((z) => z !== history.lastServeZone);
      return alternativeZones[Math.floor(rng() * alternativeZones.length)]!;
    }
    return allZones[Math.floor(rng() * allZones.length)]!;
  }

  // 3. Difícil: Leitura de padrões de recepção do jogador humano
  if (history) {
    const totalReceives =
      (history.playerReceiveFrequency?.[1] || 0) +
      (history.playerReceiveFrequency?.[2] || 0) +
      (history.playerReceiveFrequency?.[3] || 0);

    if (totalReceives > 0) {
      const leastCovered = getLeastCoveredReceiveZone(history);
      // Epsilon-Greedy: 75% saca na zona menos coberta, 25% sorteia
      if (rng() < 0.75) {
        return leastCovered;
      }
    }
  }

  return allZones[Math.floor(rng() * allZones.length)]!;
}

// ============================================================================
// 3. ESCOLHA DE RECEPÇÃO (DUAS ZONAS DISTINTAS EM 1..3)
// ============================================================================

export function chooseReceiveZones(
  difficulty: AIDifficulty,
  history?: AIHistoryTracker,
  rng: RNG = Math.random
): [ServeNumber, ServeNumber] {
  const allPairs: [ServeNumber, ServeNumber][] = [
    [1, 2],
    [1, 3],
    [2, 3],
  ];

  // 1. Fácil: Uniforme aleatório entre os 3 pares possíveis
  if (difficulty === 'EASY') {
    return allPairs[Math.floor(rng() * allPairs.length)]!;
  }

  // 2. Médio: Protege sempre o meio de quadra (Zona 2) + varia entre 1 e 3
  if (difficulty === 'MEDIUM') {
    return rng() < 0.5 ? [1, 2] : [2, 3];
  }

  // 3. Difícil: Cobre prioritariamente as zonas mais frequentes de saque do humano
  if (history) {
    const totalServes =
      (history.playerServeFrequency?.[1] || 0) +
      (history.playerServeFrequency?.[2] || 0) +
      (history.playerServeFrequency?.[3] || 0);

    if (totalServes > 0) {
      return getTopTwoReceiveZones(history);
    }
  }

  return rng() < 0.5 ? [1, 2] : [2, 3];
}

// ============================================================================
// 4. DECLARAÇÃO DE CORINGAS
// ============================================================================

export function chooseBlueDefenseDeclaration(
  difficulty: AIDifficulty,
  history?: AIHistoryTracker,
  rng: RNG = Math.random
): CardType {
  if (difficulty === 'EASY') {
    const options: CardType[] = ['DEF_CURTA', 'DEF_NEUTRA', 'DEF_LOB'];
    return options[Math.floor(rng() * options.length)]!;
  }

  // Médio e Difícil: NUNCA declara DEF_LOB
  if (difficulty === 'MEDIUM' || !history) {
    return rng() < 0.5 ? 'DEF_CURTA' : 'DEF_NEUTRA';
  }

  const discardedBandejas = history.playerDiscardedGroupsInPoint?.BANDEJAS ?? 0;
  const discardedVoleios = history.playerDiscardedGroupsInPoint?.VOLEIOS ?? 0;

  if (discardedBandejas > discardedVoleios) {
    return 'DEF_CURTA';
  } else if (discardedVoleios > discardedBandejas) {
    return 'DEF_NEUTRA';
  }

  return rng() < 0.5 ? 'DEF_CURTA' : 'DEF_NEUTRA';
}

export const chooseBlueWildcardDeclaration = chooseBlueDefenseDeclaration;

export function chooseGreenWildcardDeclaration(
  requiredResponse: RequiredResponse,
  difficulty: AIDifficulty,
  _hand: CardInstance[] = [],
  history?: AIHistoryTracker,
  rng: RNG = Math.random
): CardType {
  const allowed = getValidDeclarationsForResponse(requiredResponse);
  if (allowed.length === 0) {
    throw new Error(
      `[aiController] Nenhuma declaração válida para a exigência "${requiredResponse}".`
    );
  }

  if (difficulty === 'EASY') {
    return allowed[Math.floor(rng() * allowed.length)]!;
  }

  if (requiredResponse === 'FUNDO') {
    return 'SMASH';
  }

  if (requiredResponse === 'VOLEIOS') {
    return 'VOLEIO_ACELERADO';
  }

  // BANDEJAS
  if (difficulty === 'MEDIUM' || !history) {
    return rng() < 0.5 ? 'BANDEJA_CURTA' : 'BANDEJA_LOB_CHUTADO';
  }

  const discardedBandejas = history.playerDiscardedGroupsInPoint?.BANDEJAS ?? 0;
  const discardedVoleios = history.playerDiscardedGroupsInPoint?.VOLEIOS ?? 0;

  if (discardedBandejas >= discardedVoleios) {
    return 'BANDEJA_CURTA';
  }
  return 'BANDEJA_LOB_CHUTADO';
}

// ============================================================================
// 5. ESCOLHA DE JOGADA DE RALI (CHOOSE_RALLY_PLAY)
// ============================================================================

export function chooseRallyPlay(
  hand: CardInstance[],
  incomingCard: CardInstance | CardDefinition,
  difficulty: AIDifficulty,
  history?: AIHistoryTracker,
  rng: RNG = Math.random
): AIRallyChoice {
  const declaredAs =
    typeof incomingCard === 'object' && incomingCard !== null && 'declaredAs' in incomingCard
      ? incomingCard.declaredAs
      : undefined;

  const legalMoves = getLegalMoves(hand, incomingCard, declaredAs);

  // Invariante 1: Sob ataque acelerado -> compra obrigatória do Monte Azul
  if (legalMoves.requiresBlueDefense) {
    return {
      action: 'DRAW_BLUE_DEFENSE',
      confidence: 1.0,
      reasoning: 'Sob ataque: compra obrigatória de defesa do Monte Azul.',
    };
  }

  // Invariante 2: Sem cartas jogáveis na mão ou mão vazia -> Cavação
  if (!hand || hand.length === 0 || legalMoves.playableCards.length === 0) {
    return {
      action: 'DIG',
      confidence: legalMoves.canDig ? 1.0 : 0.5,
      reasoning: 'Sem cartas compatíveis na mão: cavar no Monte Verde.',
    };
  }

  const playable = legalMoves.playableCards;

  // --------------------------------------------------------------------------
  // Nível Fácil: Escolha puramente aleatória uniforme
  // --------------------------------------------------------------------------
  if (difficulty === 'EASY') {
    const chosen = playable[Math.floor(rng() * playable.length)]!;
    if (chosen.definition.type === 'GOLPE_UBT_CORINGA') {
      const required = getRequiredResponse(incomingCard, declaredAs);
      const decl = chooseGreenWildcardDeclaration(required, 'EASY', hand, history, rng);
      return {
        action: 'PLAY_WILDCARD',
        cardInstance: chosen,
        declaredCardType: decl,
        confidence: 0.5,
        reasoning: 'Fácil: Coringa verde jogado aleatoriamente.',
      };
    }

    return {
      action: 'PLAY_HAND',
      cardInstance: chosen,
      confidence: 0.5,
      reasoning: 'Fácil: Carta jogada aleatoriamente.',
    };
  }

  // --------------------------------------------------------------------------
  // Nível Médio & Difícil: Preservação de Coringa Verde
  // --------------------------------------------------------------------------
  const normalPlayable = playable.filter((c) => c.definition.type !== 'GOLPE_UBT_CORINGA');
  const coringaPlayable = playable.filter((c) => c.definition.type === 'GOLPE_UBT_CORINGA');

  // Se tiver carta normal, NUNCA joga o Coringa Verde!
  if (normalPlayable.length === 0 && coringaPlayable.length > 0) {
    const required = getRequiredResponse(incomingCard, declaredAs);
    const decl = chooseGreenWildcardDeclaration(required, difficulty, hand, history, rng);
    return {
      action: 'PLAY_WILDCARD',
      cardInstance: coringaPlayable[0]!,
      declaredCardType: decl,
      confidence: difficulty === 'HARD' ? 0.95 : 0.9,
      reasoning: `${difficulty}: Coringa verde utilizado por ser a única salvação na mão.`,
    };
  }

  // --------------------------------------------------------------------------
  // Nível Médio: Prioridade Ofensiva e Restrição 33,3% vs 50%
  // --------------------------------------------------------------------------
  if (difficulty === 'MEDIUM') {
    // 1. Ataques
    const attackCards = normalPlayable.filter((c) => c.definition.isAttack);
    if (attackCards.length > 0) {
      const chosen = attackCards[Math.floor(rng() * attackCards.length)]!;
      return {
        action: 'PLAY_HAND',
        cardInstance: chosen,
        confidence: 0.85,
        reasoning: 'Médio: Priorizou ataque para forçar Monte Azul do oponente.',
      };
    }

    // 2. Bolas que exigem BANDEJAS ou VOLEIOS (33,3% de cobertura)
    const restrictiveCards = normalPlayable.filter(
      (c) =>
        c.definition.requiredResponse === 'BANDEJAS' ||
        c.definition.requiredResponse === 'VOLEIOS'
    );
    if (restrictiveCards.length > 0) {
      const chosen = restrictiveCards[Math.floor(rng() * restrictiveCards.length)]!;
      return {
        action: 'PLAY_HAND',
        cardInstance: chosen,
        confidence: 0.75,
        reasoning: 'Médio: Enviou bola curta/média para restringir opções do adversário.',
      };
    }

    // 3. Demais cartas (Lobs/Fundo)
    const chosen = normalPlayable[Math.floor(rng() * normalPlayable.length)]!;
    return {
      action: 'PLAY_HAND',
      cardInstance: chosen,
      confidence: 0.65,
      reasoning: 'Médio: Jogou bola de fundo.',
    };
  }

  // --------------------------------------------------------------------------
  // Nível Difícil: Função de Utilidade com Contagem de Descarte & Pressão Azul
  // --------------------------------------------------------------------------
  const targetScarcity = history ? getScarcestResponseGroup(history) : null;
  const remaining = history ? getRemainingCardsByGroup(history) : null;

  const scoredCards = normalPlayable.map((card) => {
    let score = 0;
    const req = card.definition.requiredResponse;

    if (card.definition.isAttack) {
      score += 50; // Ataques sempre possuem alto valor
      if (remaining && remaining.DEFESAS <= 3) {
        score += 30; // Pressão de exaustão do Monte Azul
      }
      if (remaining && remaining.DEFESAS === 0) {
        score += 100; // Vitória imediata por falta de fôlego defensivo
      }
    }

    if (targetScarcity && req === targetScarcity) {
      score += 35; // Foco prioritário no grupo mais escasso do adversário
    }

    if (req === 'BANDEJAS') {
      score += 20;
      const discards = history?.playerDiscardedGroupsInPoint?.BANDEJAS ?? 0;
      score += discards * 15;
    } else if (req === 'VOLEIOS') {
      score += 20;
      const discards = history?.playerDiscardedGroupsInPoint?.VOLEIOS ?? 0;
      score += discards * 15;
    } else if (req === 'FUNDO') {
      score -= 15; // Penalidade para lobs que oferecem Smash ao oponente
      const discards = history?.playerDiscardedGroupsInPoint?.FUNDO ?? 0;
      score += discards * 10;
    }

    return { card, score };
  });

  scoredCards.sort((a, b) => b.score - a.score);

  // Em caso de empate no topo, desempata estocasticamente com RNG
  const topScore = scoredCards[0]!.score;
  const topTied = scoredCards.filter((sc) => sc.score === topScore);
  const bestChoice = topTied[Math.floor(rng() * topTied.length)]!.card;

  return {
    action: 'PLAY_HAND',
    cardInstance: bestChoice,
    confidence: 0.95,
    reasoning: `Difícil: Escolha tática otimizada (score: ${topScore}) explorando contagem e pressão.`,
  };
}

// ============================================================================
// 6. CADÊNCIA E DELAY HUMANIZADO (600ms - 1200ms)
// ============================================================================

export function getAIDelay(difficulty: AIDifficulty, rng: RNG = Math.random): number {
  switch (difficulty) {
    case 'EASY':
      return Math.floor(600 + rng() * 200); // 600..800ms
    case 'MEDIUM':
      return Math.floor(800 + rng() * 200); // 800..1000ms
    case 'HARD':
      return Math.floor(900 + rng() * 300); // 900..1200ms
    default:
      return 800;
  }
}

export async function simulateAIThinking(
  difficulty: AIDifficulty,
  rng: RNG = Math.random
): Promise<number> {
  const delayMs = getAIDelay(difficulty, rng);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return delayMs;
}

// ============================================================================
// 7. FUNÇÕES DE CONVENIÊNCIA / COMPATIBILIDADE DE CONTRATO
// ============================================================================

export function chooseServe(
  handOrDiff?: CardInstance[] | AIDifficulty,
  diff?: AIDifficulty,
  history?: AIHistoryTracker,
  rng?: RNG
): ServeNumber {
  const difficulty: AIDifficulty = typeof handOrDiff === 'string' ? handOrDiff : (diff ?? 'MEDIUM');
  return chooseServeZone(difficulty, history, rng);
}

export function chooseReceive(
  handOrDiff?: CardInstance[] | AIDifficulty,
  diff?: AIDifficulty,
  history?: AIHistoryTracker,
  rng?: RNG
): [ServeNumber, ServeNumber] {
  const difficulty: AIDifficulty = typeof handOrDiff === 'string' ? handOrDiff : (diff ?? 'MEDIUM');
  return chooseReceiveZones(difficulty, history, rng);
}
