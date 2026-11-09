/**
 * src/engine/deckManager.ts
 * Gerenciamento de baralhos, embaralhamento determinístico, distribuição de mão,
 * regra oficial de Cavação (compra de até 2 cartas) e compra de Defesa no Monte Azul.
 *
 * Módulo puro em TypeScript (zero dependências de React/DOM).
 */

import type {
  CardInstance,
  CardType,
  DefenseDrawResult,
  DigResult,
  PlayerId,
  RequiredResponse,
  RNG,
} from './types';
import {
  createInitialDeckList,
  getCardDefinition,
  isCardLegalForResponse,
} from './cardsCatalog';

// ============================================================================
// 1. CRIAÇÃO DE INSTÂNCIAS DE CARTAS
// ============================================================================

/**
 * Cria uma instância dinâmica em tempo de execução de uma carta.
 * @param type Tipo canônico da carta
 * @param owner Proprietário da carta ('PLAYER' | 'AI')
 * @param copyIndex Índice sequencial da cópia no baralho (0, 1, ...)
 */
export function createCardInstance(
  type: CardType,
  owner: PlayerId = 'PLAYER',
  copyIndex: number = 0
): CardInstance {
  const definition = getCardDefinition(type);
  const instanceId = `${owner.toLowerCase()}_${definition.color.toLowerCase()}_${definition.id}_${copyIndex}`;

  return {
    instanceId,
    cardId: definition.id,
    definition,
    owner,
    declaredAs: undefined,
  };
}

// ============================================================================
// 2. EMBARALHAMENTO DETERMINÍSTICO (FISHER-YATES)
// ============================================================================

/**
 * Embaralha um array de cartas de forma pura e determinística utilizando o algoritmo
 * Fisher-Yates com gerador de números pseudoaleatórios (RNG) injetável.
 * Não altera o array original.
 *
 * @param deck Array de cartas ou elementos a serem embaralhados
 * @param rng Função geradora de números no intervalo [0, 1). Padrão: Math.random
 */
export function shuffleDeck<T>(deck: readonly T[], rng: RNG = Math.random): T[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

// ============================================================================
// 3. MONTAGEM DOS BARALHOS OFICIAIS (VERDE, AZUL E LARANJA)
// ============================================================================

export interface CreateDecksOptions {
  owner?: PlayerId;
  rng?: RNG;
  shuffle?: boolean;
}

/**
 * Cria os baralhos de rali oficiais de um jogador para o início de um ponto:
 * - Monte Verde: 24 cartas (2 cópias de cada um dos 12 tipos verdes)
 * - Monte Azul: 8 cartas (2 cópias de cada um dos 4 tipos azuis)
 *
 * @param optionsOrRng RNG opcional ou objeto de opções (owner, rng, shuffle)
 * @param maybeRng RNG secundário caso o primeiro argumento seja PlayerId
 */
export function createDecks(
  optionsOrRng?: RNG | PlayerId | CreateDecksOptions,
  maybeRng?: RNG
): { greenDeck: CardInstance[]; blueDeck: CardInstance[] } {
  let owner: PlayerId = 'PLAYER';
  let rng: RNG = Math.random;
  let shouldShuffle = true;

  if (typeof optionsOrRng === 'function') {
    rng = optionsOrRng;
  } else if (typeof optionsOrRng === 'string') {
    owner = optionsOrRng;
    if (maybeRng) rng = maybeRng;
  } else if (optionsOrRng && typeof optionsOrRng === 'object') {
    if (optionsOrRng.owner) owner = optionsOrRng.owner;
    if (optionsOrRng.rng) rng = optionsOrRng.rng;
    if (optionsOrRng.shuffle !== undefined) shouldShuffle = optionsOrRng.shuffle;
  }

  // Gera as 24 cartas verdes (2 cópias de cada um dos 12 tipos)
  const greenTypes = createInitialDeckList('GREEN');
  const greenTypeCounts: Record<string, number> = {};
  const greenCards: CardInstance[] = greenTypes.map((type) => {
    const idx = greenTypeCounts[type] || 0;
    greenTypeCounts[type] = idx + 1;
    return createCardInstance(type, owner, idx);
  });

  // Gera as 8 cartas azuis (2 cópias de cada um dos 4 tipos)
  const blueTypes = createInitialDeckList('BLUE');
  const blueTypeCounts: Record<string, number> = {};
  const blueCards: CardInstance[] = blueTypes.map((type) => {
    const idx = blueTypeCounts[type] || 0;
    blueTypeCounts[type] = idx + 1;
    return createCardInstance(type, owner, idx);
  });

  return {
    greenDeck: shouldShuffle ? shuffleDeck(greenCards, rng) : greenCards,
    blueDeck: shouldShuffle ? shuffleDeck(blueCards, rng) : blueCards,
  };
}

/**
 * Cria o conjunto de cartas laranjas de Saque e Recepção (Zonas 1, 2 e 3 no 1v1).
 */
export function createOrangeDeck(owner: PlayerId = 'PLAYER'): CardInstance[] {
  const orangeTypes = createInitialDeckList('ORANGE');
  return orangeTypes.map((type, idx) => createCardInstance(type, owner, idx));
}

// ============================================================================
// 4. DISTRIBUIÇÃO DA MÃO INICIAL
// ============================================================================

/**
 * Distribui a mão inicial de 6 cartas a partir do Monte Verde (24 cartas),
 * restando 18 cartas no monte de compra.
 * Função pura e imutável.
 *
 * @param deck Monte Verde completo (24 cartas)
 * @param handSize Quantidade de cartas a distribuir (padrão: 6)
 */
export function dealInitialHand(
  deck: CardInstance[],
  handSize: number = 6
): { hand: CardInstance[]; remainingDeck: CardInstance[] } {
  if (deck.length < handSize) {
    throw new Error(
      `[deckManager] Não é possível distribuir a mão de ${handSize} cartas: o baralho possui apenas ${deck.length} cartas.`
    );
  }

  return {
    hand: deck.slice(0, handSize),
    remainingDeck: deck.slice(handSize),
  };
}

/**
 * Alias de compatibilidade com especificações do projeto.
 */
export const drawInitialHand = dealInitialHand;

// ============================================================================
// 5. INSPEÇÃO DE MÃO E VALIDAÇÃO DE RESPOSTAS
// ============================================================================

/**
 * Verifica se o jogador possui ao menos uma carta válida na mão para a exigência atual.
 * - Golpes normais: verifica se pertence ao grupo de resposta.
 * - GOLPE_UBT_CORINGA: válido para BANDEJAS, VOLEIOS e FUNDO.
 * - DEFESAS: sempre retorna false (ataques exigem compra do Monte Azul).
 */
export function hasValidCardInHand(
  hand: CardInstance[],
  requiredResponse: RequiredResponse
): boolean {
  if (requiredResponse === 'DEFESAS') {
    return false;
  }
  return hand.some((card) =>
    isCardLegalForResponse(card.definition.type, requiredResponse)
  );
}

/**
 * Retorna todas as cartas da mão que satisfazem legalmente a exigência atual.
 */
export function getValidCardsInHand(
  hand: CardInstance[],
  requiredResponse: RequiredResponse
): CardInstance[] {
  if (requiredResponse === 'DEFESAS') {
    return [];
  }
  return hand.filter((card) =>
    isCardLegalForResponse(card.definition.type, requiredResponse)
  );
}

// ============================================================================
// 6. REGRA OFICIAL DE CAVAÇÃO ("CAVAR ATÉ 2 CARTAS")
// ============================================================================

/**
 * Executa a regra oficial completa de Cavação:
 * 1. O jogador só tem direito a cavar se tiver 0 cartas compatíveis na mão.
 * 2. Compra a 1ª carta do Monte Verde:
 *    - Se for válida, DEVE jogá-la imediatamente (não pode comprar a 2ª carta).
 * 3. Se a 1ª carta for inválida:
 *    - Ela é incorporada à mão do jogador e ele compra a 2ª carta.
 * 4. Se a 2ª carta for válida, ela DEVE ser jogada imediatamente.
 * 5. Se a 2ª carta também for inválida (ou o baralho esgotar), o jogador PERDE O PONTO.
 *
 * @param hand Mão atual do jogador
 * @param greenDeck Monte Verde disponível
 * @param requiredResponse Grupo de resposta exigido (BANDEJAS, VOLEIOS, FUNDO)
 * @param _rng RNG injetável (opcional, para compatibilidade)
 */
export function digCards(
  hand: CardInstance[],
  greenDeck: CardInstance[],
  requiredResponse: RequiredResponse,
  _rng?: RNG
): DigResult {
  // Proibição 1: Não se cava no Monte Verde contra ataques (DEFESAS)
  if (requiredResponse === 'DEFESAS') {
    throw new Error(
      '[deckManager] Cavação proibida para DEFESAS: golpes de ataque devem ser defendidos com o Monte Azul.'
    );
  }

  // Proibição 2: Jogador só pode cavar se tiver 0 cartas válidas na mão
  if (hasValidCardInHand(hand, requiredResponse)) {
    throw new Error(
      `[deckManager] Jogador não pode cavar: a mão já possui carta(s) válida(s) para a exigência "${requiredResponse}".`
    );
  }

  // Caso A: Monte Verde vazio antes da 1ª compra -> Perde o ponto imediatamente
  if (greenDeck.length === 0) {
    return {
      drawnCard: null,
      attemptNumber: 1,
      isValid: false,
      mustPlayImmediately: false,
      canDigAgain: false,
      pointLost: true,
      reason: 'GREEN_DECK_EMPTY',
      updatedGreenDeck: [],
      updatedHand: [...hand],
    };
  }

  // Tentativa 1: Compra a 1ª carta do topo do Monte Verde
  const card1 = greenDeck[0]!;
  const remainingAfter1 = greenDeck.slice(1);
  const isCard1Valid = isCardLegalForResponse(card1.definition.type, requiredResponse);

  if (isCard1Valid) {
    // 1ª carta é válida: É OBRIGADO a jogá-la imediatamente! 2ª carta NÃO é comprada.
    return {
      drawnCard: card1,
      attemptNumber: 1,
      isValid: true,
      mustPlayImmediately: true,
      canDigAgain: false,
      pointLost: false,
      reason: 'LEGAL_CARD_DRAWN',
      updatedGreenDeck: remainingAfter1,
      updatedHand: [...hand], // Carta não entra na mão, vai direto pra quadra
    };
  }

  // 1ª carta é inválida: é incorporada à mão do jogador
  const handWithCard1: CardInstance[] = [...hand, card1];

  // Caso B: Monte Verde ficou vazio após a 1ª compra -> Não há 2ª carta, perde o ponto
  if (remainingAfter1.length === 0) {
    return {
      drawnCard: card1,
      attemptNumber: 2,
      isValid: false,
      mustPlayImmediately: false,
      canDigAgain: false,
      pointLost: true,
      reason: 'GREEN_DECK_EMPTY',
      updatedGreenDeck: [],
      updatedHand: handWithCard1,
    };
  }

  // Tentativa 2: Compra a 2ª carta do topo do Monte Verde
  const card2 = remainingAfter1[0]!;
  const remainingAfter2 = remainingAfter1.slice(1);
  const isCard2Valid = isCardLegalForResponse(card2.definition.type, requiredResponse);

  if (isCard2Valid) {
    // 2ª carta é válida: É OBRIGADO a jogá-la imediatamente!
    return {
      drawnCard: card2,
      attemptNumber: 2,
      isValid: true,
      mustPlayImmediately: true,
      canDigAgain: false,
      pointLost: false,
      reason: 'LEGAL_CARD_DRAWN',
      updatedGreenDeck: remainingAfter2,
      updatedHand: handWithCard1,
    };
  }

  // 2ª carta também é inválida: entra na mão e o jogador PERDE O PONTO!
  const finalHand: CardInstance[] = [...handWithCard1, card2];
  return {
    drawnCard: card2,
    attemptNumber: 2,
    isValid: false,
    mustPlayImmediately: false,
    canDigAgain: false,
    pointLost: true,
    reason: 'SECOND_ATTEMPT_INVALID',
    updatedGreenDeck: remainingAfter2,
    updatedHand: finalHand,
  };
}

/**
 * Executa uma tentativa unitária de Cavação (passo a passo para feedback na UI).
 * @param hand Mão atual
 * @param greenDeck Monte Verde disponível
 * @param requiredResponse Exigência de resposta
 * @param attemptNumber Qual tentativa está sendo feita (1 ou 2)
 */
export function digSingleStep(
  hand: CardInstance[],
  greenDeck: CardInstance[],
  requiredResponse: RequiredResponse,
  attemptNumber: 1 | 2 = 1
): DigResult {
  if (requiredResponse === 'DEFESAS') {
    throw new Error(
      '[deckManager] Cavação proibida para DEFESAS: golpes de ataque devem ser defendidos com o Monte Azul.'
    );
  }

  if (attemptNumber === 1 && hasValidCardInHand(hand, requiredResponse)) {
    throw new Error(
      `[deckManager] Jogador não pode cavar: a mão já possui carta(s) válida(s) para a exigência "${requiredResponse}".`
    );
  }

  if (greenDeck.length === 0) {
    return {
      drawnCard: null,
      attemptNumber,
      isValid: false,
      mustPlayImmediately: false,
      canDigAgain: false,
      pointLost: true,
      reason: 'GREEN_DECK_EMPTY',
      updatedGreenDeck: [],
      updatedHand: [...hand],
    };
  }

  const card = greenDeck[0]!;
  const remaining = greenDeck.slice(1);
  const isValid = isCardLegalForResponse(card.definition.type, requiredResponse);

  if (isValid) {
    return {
      drawnCard: card,
      attemptNumber,
      isValid: true,
      mustPlayImmediately: true,
      canDigAgain: false,
      pointLost: false,
      reason: 'LEGAL_CARD_DRAWN',
      updatedGreenDeck: remaining,
      updatedHand: [...hand],
    };
  }

  const updatedHand: CardInstance[] = [...hand, card];

  if (attemptNumber === 1) {
    if (remaining.length === 0) {
      return {
        drawnCard: card,
        attemptNumber: 1,
        isValid: false,
        mustPlayImmediately: false,
        canDigAgain: false,
        pointLost: true,
        reason: 'GREEN_DECK_EMPTY',
        updatedGreenDeck: [],
        updatedHand,
      };
    }
    return {
      drawnCard: card,
      attemptNumber: 1,
      isValid: false,
      mustPlayImmediately: false,
      canDigAgain: true,
      pointLost: false,
      reason: 'FIRST_ATTEMPT_INVALID',
      updatedGreenDeck: remaining,
      updatedHand,
    };
  }

  return {
    drawnCard: card,
    attemptNumber: 2,
    isValid: false,
    mustPlayImmediately: false,
    canDigAgain: false,
    pointLost: true,
    reason: 'SECOND_ATTEMPT_INVALID',
    updatedGreenDeck: remaining,
    updatedHand,
  };
}

// ============================================================================
// 7. COMPRA DE DEFESA NO MONTE AZUL
// ============================================================================

/**
 * Puxa a carta do topo do Monte Azul em resposta a um golpe ofensivo ou saque coberto.
 * Se o Monte Azul estiver esgotado (0 cartas), o defensor não tem fôlego e perde o ponto (Winner do atacante).
 *
 * @param blueDeck Monte Azul atual do defensor
 * @param defenderId Quem está defendendo ('PLAYER' | 'AI')
 * @param attackerId Quem atacou ('PLAYER' | 'AI', opcional)
 */
export function drawDefenseCard(
  blueDeck: CardInstance[],
  defenderId: PlayerId = 'PLAYER',
  attackerId?: PlayerId
): DefenseDrawResult {
  const winner = attackerId ?? (defenderId === 'PLAYER' ? 'AI' : 'PLAYER');

  if (blueDeck.length === 0) {
    return {
      drawnCard: null,
      isExhausted: true,
      winner,
      updatedBlueDeck: [],
    };
  }

  const drawnCard = blueDeck[0]!;
  return {
    drawnCard,
    isExhausted: false,
    winner: undefined,
    updatedBlueDeck: blueDeck.slice(1),
  };
}
