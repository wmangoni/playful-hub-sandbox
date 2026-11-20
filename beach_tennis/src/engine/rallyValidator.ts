/**
 * src/engine/rallyValidator.ts
 * Motor de validação de rali, matriz da Folha Rosa, travas de ataque e declaração de coringas.
 * Módulo puro em TypeScript (zero dependências de React/DOM).
 */

import {
  CARDS_CATALOG,
  RESPONSE_GROUPS,
} from './cardsCatalog';
import type {
  CardDefinition,
  CardInstance,
  CardType,
  RequiredResponse,
  CardColor,
} from './types';

// ============================================================================
// 1. CONTRATOS DE RETORNO DO VALIDADOR
// ============================================================================

export interface LegalMovesResult {
  /** Cartas da mão que satisfazem a exigência da jogada atual. */
  playableCards: CardInstance[];
  /** Verdadeiro estritamente quando não há cartas jogáveis na mão e a bola não é um ataque. */
  canDig: boolean;
  /** Verdadeiro estritamente quando a bola recebida é um ataque acelerado (exige Monte Azul). */
  requiresBlueDefense: boolean;
}

export interface TurnValidationResult {
  /** Verdadeiro se a jogada for estritamente válida segundo as regras. */
  isValid: boolean;
  /** Mensagem descritiva de erro caso a jogada seja inválida. */
  error?: string;
}

// ============================================================================
// 2. FUNÇÕES INTERNAS DE NORMALIZAÇÃO
// ============================================================================

interface NormalizedCard {
  type: CardType;
  color: CardColor;
  name: string;
  isWildcard: boolean;
  isAttack: boolean;
  belongsToGroups: RequiredResponse[];
  requiredResponse?: RequiredResponse;
  declaredAs?: CardType;
}

function isCardInstance(card: CardInstance | CardDefinition): card is CardInstance {
  return 'instanceId' in card;
}

function normalizeCard(
  card: CardInstance | CardDefinition,
  explicitDeclaredAs?: CardType
): NormalizedCard {
  if (isCardInstance(card)) {
    const def = card.definition;
    return {
      type: def.type,
      color: def.color,
      name: def.name,
      isWildcard: def.isWildcard,
      isAttack: def.isAttack,
      belongsToGroups: def.belongsToGroups,
      requiredResponse: def.requiredResponse,
      declaredAs: explicitDeclaredAs ?? card.declaredAs,
    };
  }

  return {
    type: card.type,
    color: card.color,
    name: card.name,
    isWildcard: card.isWildcard,
    isAttack: card.isAttack,
    belongsToGroups: card.belongsToGroups,
    requiredResponse: card.requiredResponse,
    declaredAs: explicitDeclaredAs,
  };
}

// ============================================================================
// 3. DETERMINAÇÃO DA RESPOSTA EXIGIDA (PINK SHEET)
// ============================================================================

/**
 * Retorna o grupo de resposta exigido por uma carta jogada na quadra.
 * - Cartas regulares (14 tipos): consulta direta à Folha Rosa.
 * - DEF_UBT_CORINGA: exige declaração (DEF_CURTA -> BANDEJAS, DEF_NEUTRA -> VOLEIOS, DEF_LOB -> FUNDO).
 * - GOLPE_UBT_CORINGA: exige declaração do golpe verde executado.
 * Lança erro descritivo caso a declaração esteja ausente ou seja inválida.
 */
export function getRequiredResponse(
  incomingCard: CardInstance | CardDefinition,
  declaredAs?: CardType
): RequiredResponse {
  const norm = normalizeCard(incomingCard, declaredAs);

  // 1. Coringa Azul (DEF_UBT_CORINGA)
  if (norm.type === 'DEF_UBT_CORINGA') {
    if (!norm.declaredAs) {
      throw new Error(
        '[rallyValidator] DEF_UBT_CORINGA exige declaração (DEF_CURTA, DEF_NEUTRA ou DEF_LOB) para determinar a resposta exigida.'
      );
    }

    switch (norm.declaredAs) {
      case 'DEF_CURTA':
        return 'BANDEJAS';
      case 'DEF_NEUTRA':
        return 'VOLEIOS';
      case 'DEF_LOB':
        return 'FUNDO';
      default:
        throw new Error(
          `[rallyValidator] Declaração "${norm.declaredAs}" é inválida para DEF_UBT_CORINGA. Permitidas: DEF_CURTA, DEF_NEUTRA, DEF_LOB.`
        );
    }
  }

  // 2. Coringa Verde (GOLPE_UBT_CORINGA)
  if (norm.type === 'GOLPE_UBT_CORINGA') {
    if (!norm.declaredAs) {
      throw new Error(
        '[rallyValidator] GOLPE_UBT_CORINGA exige declaração de golpe verde para determinar a resposta exigida.'
      );
    }

    const declaredDef = CARDS_CATALOG[norm.declaredAs];
    if (
      !declaredDef ||
      declaredDef.color !== 'GREEN' ||
      declaredDef.isWildcard
    ) {
      throw new Error(
        `[rallyValidator] Declaração "${norm.declaredAs}" é inválida para GOLPE_UBT_CORINGA. Deve ser um dos 11 golpes verdes regulares.`
      );
    }

    if (!declaredDef.requiredResponse) {
      throw new Error(
        `[rallyValidator] O golpe declarado "${norm.declaredAs}" não possui resposta exigida definida.`
      );
    }

    return declaredDef.requiredResponse;
  }

  // 3. Cartas Regulares de Rali (14 tipos)
  if (norm.requiredResponse) {
    return norm.requiredResponse;
  }

  throw new Error(
    `[rallyValidator] A carta "${norm.name}" (${norm.type}) não impõe resposta de rali válida.`
  );
}

// ============================================================================
// 4. IDENTIFICADOR DE GOLPES DE ATAQUE
// ============================================================================

/**
 * Retorna se um golpe na quadra é um ataque acelerado que força defesa pelo Monte Azul.
 * Cobre os 4 ataques regulares (SMASH, VOLEIO_ACELERADO, GANCHO_ATA, VERONICA_ATA)
 * e o Coringa Verde declarado como qualquer um desses ataques.
 */
export function isAttackShot(
  card: CardInstance | CardDefinition,
  declaredAs?: CardType
): boolean {
  const norm = normalizeCard(card, declaredAs);

  if (norm.type === 'GOLPE_UBT_CORINGA') {
    if (!norm.declaredAs) return false;
    const def = CARDS_CATALOG[norm.declaredAs];
    return def ? def.isAttack : false;
  }

  const def = CARDS_CATALOG[norm.type];
  return def ? def.isAttack : false;
}

// ============================================================================
// 5. CÁLCULO DE MOVIMENTOS LEGAIS (HAND, DEFESA & CAVAÇÃO)
// ============================================================================

/**
 * Avalia a mão do jogador contra a bola recebida na quadra:
 * - Se a bola for um ataque: trava a mão (playableCards = []), proíbe cavação (canDig = false) e ativa requiresBlueDefense = true.
 * - Se a bola for normal: filtra cartas compatíveis da mão (incluindo Coringa Verde) e habilita canDig estritamente se playableCards for vazio.
 */
export function getLegalMoves(
  hand: CardInstance[],
  incomingCard: CardInstance | CardDefinition,
  incomingDeclaredAs?: CardType
): LegalMovesResult {
  const isAttack = isAttackShot(incomingCard, incomingDeclaredAs);

  // Caso 1: Ataque Acelerado -> Trava total da mão verde, compra obrigatória do Monte Azul
  if (isAttack) {
    return {
      playableCards: [],
      canDig: false,
      requiresBlueDefense: true,
    };
  }

  // Caso 2: Bola de Rali Regular -> Avaliação de compatibilidade da mão
  const required = getRequiredResponse(incomingCard, incomingDeclaredAs);

  const playableCards = hand.filter((card) => {
    // Apenas cartas verdes são elegíveis durante o rali a partir da mão
    if (card.definition.color !== 'GREEN') {
      return false;
    }

    // Coringa Verde pode responder a qualquer exigência verde (BANDEJAS, VOLEIOS, FUNDO)
    if (card.definition.type === 'GOLPE_UBT_CORINGA') {
      return true;
    }

    // Carta regular: deve pertencer ao grupo exigido
    return card.definition.belongsToGroups.includes(required);
  });

  // canDig é VERDADEIRO ESTRITAMENTE SE não há nenhuma carta jogável na mão e a bola não é um ataque
  const canDig = playableCards.length === 0;

  return {
    playableCards,
    canDig,
    requiresBlueDefense: false,
  };
}

// ============================================================================
// 6. VALIDAÇÃO ESTRITA DE JOGADA DE TURNO
// ============================================================================

/**
 * Valida minuciosamente se uma carta jogada (com eventual declaração) é legal frente à bola recebida.
 * Retorna `{ isValid: true }` ou `{ isValid: false, error: '...' }`.
 */
export function validateTurnPlay(
  incomingCard: CardInstance | CardDefinition,
  playedCard: CardInstance | CardDefinition,
  declaredAs?: CardType
): TurnValidationResult {
  if (!incomingCard || !playedCard) {
    return {
      isValid: false,
      error: 'Cartas de entrada e jogada são obrigatórias.',
    };
  }

  const incomingNorm = normalizeCard(incomingCard);
  const playedNorm = normalizeCard(playedCard, declaredAs);

  // 1. Verificações de integridade da carta recebida
  if (incomingNorm.color === 'ORANGE') {
    return {
      isValid: false,
      error: 'Cartas de saque laranjas não são cartas de rali diretas.',
    };
  }

  if (incomingNorm.type === 'DEF_UBT_CORINGA') {
    if (!incomingNorm.declaredAs) {
      return {
        isValid: false,
        error: 'Carta recebida (DEF_UBT_CORINGA) não possui declaração válida.',
      };
    }
    if (!['DEF_CURTA', 'DEF_NEUTRA', 'DEF_LOB'].includes(incomingNorm.declaredAs)) {
      return {
        isValid: false,
        error: `Declaração "${incomingNorm.declaredAs}" é inválida para a carta recebida DEF_UBT_CORINGA.`,
      };
    }
  }

  if (incomingNorm.type === 'GOLPE_UBT_CORINGA') {
    if (!incomingNorm.declaredAs) {
      return {
        isValid: false,
        error: 'Carta recebida (GOLPE_UBT_CORINGA) não possui declaração válida.',
      };
    }
    const declDef = CARDS_CATALOG[incomingNorm.declaredAs];
    if (!declDef || declDef.color !== 'GREEN' || declDef.isWildcard) {
      return {
        isValid: false,
        error: `Declaração "${incomingNorm.declaredAs}" é inválida para a carta recebida GOLPE_UBT_CORINGA.`,
      };
    }
  }

  // 2. Determinação da resposta exigida
  let requiredResponse: RequiredResponse;
  try {
    requiredResponse = getRequiredResponse(incomingCard, incomingNorm.declaredAs);
  } catch (err) {
    return {
      isValid: false,
      error:
        err instanceof Error
          ? err.message
          : 'Não foi possível determinar a resposta exigida para a carta recebida.',
    };
  }

  const incomingIsAttack = isAttackShot(incomingCard, incomingNorm.declaredAs);

  // 3. Regra de Ataque (Trava de Defesa Azul)
  if (incomingIsAttack || requiredResponse === 'DEFESAS') {
    if (playedNorm.color === 'GREEN') {
      return {
        isValid: false,
        error:
          'Golpes de ataque acelerado não podem ser defendidos com cartas verdes da mão. É obrigatório puxar do Monte Azul.',
      };
    }

    if (playedNorm.color === 'ORANGE') {
      return {
        isValid: false,
        error: 'Cartas de saque laranjas não podem ser jogadas para defender ataques.',
      };
    }

    // Carta deve ser do Monte Azul
    if (playedNorm.color !== 'BLUE') {
      return {
        isValid: false,
        error: 'Ataques só podem ser defendidos com cartas do Monte Azul.',
      };
    }

    if (playedNorm.type === 'DEF_UBT_CORINGA') {
      if (!playedNorm.declaredAs) {
        return {
          isValid: false,
          error: 'DEF_UBT_CORINGA exige declaração (DEF_CURTA, DEF_NEUTRA ou DEF_LOB).',
        };
      }
      if (!['DEF_CURTA', 'DEF_NEUTRA', 'DEF_LOB'].includes(playedNorm.declaredAs)) {
        return {
          isValid: false,
          error: `Declaração "${playedNorm.declaredAs}" é inválida para DEF_UBT_CORINGA. Permitidas: DEF_CURTA, DEF_NEUTRA, DEF_LOB.`,
        };
      }
      return { isValid: true };
    }

    if (['DEF_CURTA', 'DEF_NEUTRA', 'DEF_LOB'].includes(playedNorm.type)) {
      return { isValid: true };
    }

    return {
      isValid: false,
      error: `Carta de defesa azul desconhecida: "${playedNorm.type}".`,
    };
  }

  // 4. Regra de Rali Normal (Bandejas, Voleios, Fundo)
  if (playedNorm.color === 'BLUE') {
    return {
      isValid: false,
      error: 'Cartas de defesa azul só podem ser utilizadas contra ataques ou após o saque.',
    };
  }

  if (playedNorm.color === 'ORANGE') {
    return {
      isValid: false,
      error: 'Cartas de saque laranjas não podem ser jogadas durante o rali.',
    };
  }

  if (playedNorm.color !== 'GREEN') {
    return {
      isValid: false,
      error: 'Apenas cartas verdes de rali podem ser jogadas.',
    };
  }

  // 4.1 Coringa Verde jogado da mão
  if (playedNorm.type === 'GOLPE_UBT_CORINGA') {
    if (!playedNorm.declaredAs) {
      return {
        isValid: false,
        error: 'GOLPE_UBT_CORINGA exige declaração do golpe executado.',
      };
    }

    const allowed = RESPONSE_GROUPS[requiredResponse].allowedCards;
    if (!allowed.includes(playedNorm.declaredAs)) {
      return {
        isValid: false,
        error: `Declaração "${playedNorm.declaredAs}" não é compatível com a exigência "${requiredResponse}". Golpes válidos: ${allowed.join(', ')}.`,
      };
    }

    return { isValid: true };
  }

  // 4.2 Carta Verde regular jogada da mão
  if (playedNorm.belongsToGroups.includes(requiredResponse)) {
    return { isValid: true };
  }

  return {
    isValid: false,
    error: `Carta "${playedNorm.name}" (${playedNorm.type}) não satisfaz a exigência "${requiredResponse}". Exige uma das cartas: ${RESPONSE_GROUPS[requiredResponse].allowedCards.join(', ')}.`,
  };
}

// ============================================================================
// 7. MÉTODOS DE CONVENIÊNCIA E CONSULTA
// ============================================================================

/**
 * Validação simplificada com retorno booleano compatível com o contrato de cardsCatalog.
 */
export function isValidResponse(
  incomingCard: CardInstance | CardDefinition,
  playedCard: CardInstance | CardDefinition,
  declaredAs?: CardType,
  incomingDeclaredAs?: CardType
): boolean {
  let normalizedIncoming: CardInstance | CardDefinition = incomingCard;

  if (incomingDeclaredAs) {
    if (isCardInstance(incomingCard)) {
      normalizedIncoming = {
        ...incomingCard,
        declaredAs: incomingCard.declaredAs ?? incomingDeclaredAs,
      };
    } else {
      normalizedIncoming = {
        instanceId: 'temp_incoming',
        cardId: incomingCard.id,
        definition: incomingCard,
        owner: 'AI',
        declaredAs: incomingDeclaredAs,
      };
    }
  }

  return validateTurnPlay(
    normalizedIncoming,
    playedCard,
    declaredAs
  ).isValid;
}

/**
 * Retorna a lista de golpes válidos que o Coringa Verde pode declarar para uma exigência.
 */
export function getValidDeclarationsForResponse(
  requiredResponse: RequiredResponse
): CardType[] {
  if (requiredResponse === 'DEFESAS') {
    return []; // Coringa Verde nunca pode defender ataques
  }
  const group = RESPONSE_GROUPS[requiredResponse];
  return group ? [...group.allowedCards] : [];
}

/**
 * Retorna as declarações válidas permitidas para o Coringa Azul.
 */
export function getValidBlueWildcardDeclarations(): CardType[] {
  return ['DEF_CURTA', 'DEF_NEUTRA', 'DEF_LOB'];
}
