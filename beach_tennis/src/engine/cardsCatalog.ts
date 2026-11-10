/**
 * cardsCatalog.ts
 * Catálogo canônico de cartas e matriz oficial da Folha Rosa para o Beach Tennis Card Game.
 * Módulo puro em TypeScript (zero dependências de React/DOM).
 */

import type {
  CardColor,
  CardDefinition,
  CardType,
  RequiredResponse,
  OrangeCardType,
} from './types';

// ============================================================================
// 1. DICIONÁRIO OFICIAL DAS 19 CARTAS ÚNICAS (MODO 1V1)
// ============================================================================

export const CARDS_CATALOG: Record<CardType, CardDefinition> = {
  // --------------------------------------------------------------------------
  // Cartas Laranjas: Saque e Recepção (Zonas 1 a 3)
  // --------------------------------------------------------------------------
  SAQUE_1: {
    id: 'saque_1',
    type: 'SAQUE_1',
    color: 'ORANGE',
    name: 'Saque 1',
    description: 'Saque direcionado ou cobertura de recepção na Zona 1 da quadra.',
    requiredResponse: undefined,
    belongsToGroups: [],
    quantityInDeck: 1,
    illustrationPath: '/assets/cards/saque_1.jpg',
    isWildcard: false,
    isAttack: false,
    serveNumber: 1,
  },
  SAQUE_2: {
    id: 'saque_2',
    type: 'SAQUE_2',
    color: 'ORANGE',
    name: 'Saque 2',
    description: 'Saque direcionado ou cobertura de recepção na Zona 2 (meio de quadra).',
    requiredResponse: undefined,
    belongsToGroups: [],
    quantityInDeck: 1,
    illustrationPath: '/assets/cards/saque_2.jpg',
    isWildcard: false,
    isAttack: false,
    serveNumber: 2,
  },
  SAQUE_3: {
    id: 'saque_3',
    type: 'SAQUE_3',
    color: 'ORANGE',
    name: 'Saque 3',
    description: 'Saque direcionado ou cobertura de recepção na Zona 3 da quadra.',
    requiredResponse: undefined,
    belongsToGroups: [],
    quantityInDeck: 1,
    illustrationPath: '/assets/cards/saque_3.jpg',
    isWildcard: false,
    isAttack: false,
    serveNumber: 3,
  },

  // --------------------------------------------------------------------------
  // Cartas Azuis: Monte de Defesa (8 cartas por jogador, 2 de cada tipo)
  // --------------------------------------------------------------------------
  DEF_CURTA: {
    id: 'def_curta',
    type: 'DEF_CURTA',
    color: 'BLUE',
    name: 'Def Curta',
    description: 'Devolução defensiva amortecida curta rente à rede. Obriga o adversário a responder com BANDEJAS.',
    requiredResponse: 'BANDEJAS',
    belongsToGroups: ['DEFESAS'],
    quantityInDeck: 2,
    illustrationPath: '/assets/cards/def_curta.jpg',
    isWildcard: false,
    isAttack: false,
  },
  DEF_NEUTRA: {
    id: 'def_neutra',
    type: 'DEF_NEUTRA',
    color: 'BLUE',
    name: 'Def Neutra',
    description: 'Devolução defensiva média no centro da quadra. Obriga o adversário a responder com VOLEIOS.',
    requiredResponse: 'VOLEIOS',
    belongsToGroups: ['DEFESAS'],
    quantityInDeck: 2,
    illustrationPath: '/assets/cards/def_neutra.jpg',
    isWildcard: false,
    isAttack: false,
  },
  DEF_LOB: {
    id: 'def_lob',
    type: 'DEF_LOB',
    color: 'BLUE',
    name: 'Def Lob',
    description: 'Devolução defensiva em balão alto no fundo de quadra. Obriga o adversário a responder com FUNDO.',
    requiredResponse: 'FUNDO',
    belongsToGroups: ['DEFESAS'],
    quantityInDeck: 2,
    illustrationPath: '/assets/cards/def_lob.jpg',
    isWildcard: false,
    isAttack: false,
  },
  DEF_UBT_CORINGA: {
    id: 'def_ubt_coringa',
    type: 'DEF_UBT_CORINGA',
    color: 'BLUE',
    name: 'Def UBT Coringa',
    description: 'Coringa defensivo do Monte Azul. O jogador escolhe e declara se a bola volta como Curta, Neutra ou Lob.',
    requiredResponse: undefined, // Determinado dinamicamente na declaração
    belongsToGroups: ['DEFESAS'],
    quantityInDeck: 2,
    illustrationPath: '/assets/cards/def_ubt_coringa.jpg',
    isWildcard: true,
    isAttack: false,
  },

  // --------------------------------------------------------------------------
  // Cartas Verdes: Monte de Golpes e Rali (24 cartas por jogador, 2 de cada tipo)
  // --------------------------------------------------------------------------
  BANDEJA_CURTA: {
    id: 'bandeja_curta',
    type: 'BANDEJA_CURTA',
    color: 'GREEN',
    name: 'Bandeja Curta',
    description: 'Bandeja suave colocada rente à rede. Obriga o adversário a responder com BANDEJAS.',
    requiredResponse: 'BANDEJAS',
    belongsToGroups: ['BANDEJAS'],
    quantityInDeck: 2,
    illustrationPath: '/assets/cards/bandeja_curta.jpg',
    isWildcard: false,
    isAttack: false,
  },
  BANDEJA_LOB_CHUTADO: {
    id: 'bandeja_lob_chutado',
    type: 'BANDEJA_LOB_CHUTADO',
    color: 'GREEN',
    name: 'Bandeja Lob Chutado',
    description: 'Bandeja rápida, tensa e esticada a meia altura. Obriga o adversário a responder com VOLEIOS.',
    requiredResponse: 'VOLEIOS',
    belongsToGroups: ['BANDEJAS'],
    quantityInDeck: 2,
    illustrationPath: '/assets/cards/bandeja_lob_chutado.jpg',
    isWildcard: false,
    isAttack: false,
  },
  BANDEJA_LOB: {
    id: 'bandeja_lob',
    type: 'BANDEJA_LOB',
    color: 'GREEN',
    name: 'Bandeja Lob',
    description: 'Bandeja alta em arco profundo no fundo da quadra. Obriga o adversário a responder com FUNDO.',
    requiredResponse: 'FUNDO',
    belongsToGroups: ['BANDEJAS'],
    quantityInDeck: 2,
    illustrationPath: '/assets/cards/bandeja_lob.jpg',
    isWildcard: false,
    isAttack: false,
  },

  VOLEIO_PINGADA: {
    id: 'voleio_pingada',
    type: 'VOLEIO_PINGADA',
    color: 'GREEN',
    name: 'Voleio Pingada',
    description: 'Toque sutil de voleio amortecido na rede. Obriga o adversário a responder com BANDEJAS.',
    requiredResponse: 'BANDEJAS',
    belongsToGroups: ['VOLEIOS'],
    quantityInDeck: 2,
    illustrationPath: '/assets/cards/voleio_pingada.jpg',
    isWildcard: false,
    isAttack: false,
  },
  VOLEIO_ACELERADO: {
    id: 'voleio_acelerado',
    type: 'VOLEIO_ACELERADO',
    color: 'GREEN',
    name: 'Voleio Acelerado',
    description: 'Voleio potente e rasante no corpo do adversário. Ataque que obriga o oponente a puxar 1 carta do Monte Azul.',
    requiredResponse: 'DEFESAS',
    belongsToGroups: ['VOLEIOS'],
    quantityInDeck: 2,
    illustrationPath: '/assets/cards/voleio_acelerado.jpg',
    isWildcard: false,
    isAttack: true,
  },
  VOLEIO_LOB: {
    id: 'voleio_lob',
    type: 'VOLEIO_LOB',
    color: 'GREEN',
    name: 'Voleio Lob',
    description: 'Voleio em cobertura alta por cima do adversário adiantado. Obriga o oponente a responder com FUNDO.',
    requiredResponse: 'FUNDO',
    belongsToGroups: ['VOLEIOS'],
    quantityInDeck: 2,
    illustrationPath: '/assets/cards/voleio_lob.jpg',
    isWildcard: false,
    isAttack: false,
  },

  SMASH: {
    id: 'smash',
    type: 'SMASH',
    color: 'GREEN',
    name: 'Smash',
    description: 'Golpe aéreo vertical devastador de cima para baixo. Ataque potente que obriga o oponente a puxar 1 carta do Monte Azul.',
    requiredResponse: 'DEFESAS',
    belongsToGroups: ['FUNDO'],
    quantityInDeck: 2,
    illustrationPath: '/assets/cards/smash.jpg',
    isWildcard: false,
    isAttack: true,
  },
  GANCHO_ATA: {
    id: 'gancho_ata',
    type: 'GANCHO_ATA',
    color: 'GREEN',
    name: 'Gancho Ataque',
    description: 'Gancho ofensivo veloz e angular no fundo. Ataque que obriga o oponente a puxar 1 carta do Monte Azul.',
    requiredResponse: 'DEFESAS',
    belongsToGroups: ['FUNDO'],
    quantityInDeck: 2,
    illustrationPath: '/assets/cards/gancho_ata.jpg',
    isWildcard: false,
    isAttack: true,
  },
  VERONICA_ATA: {
    id: 'veronica_ata',
    type: 'VERONICA_ATA',
    color: 'GREEN',
    name: 'Verônica Ataque',
    description: 'Golpe acrobático de costas ofensivo e acelerado. Ataque que obriga o oponente a puxar 1 carta do Monte Azul.',
    requiredResponse: 'DEFESAS',
    belongsToGroups: ['FUNDO'],
    quantityInDeck: 2,
    illustrationPath: '/assets/cards/veronica_ata.jpg',
    isWildcard: false,
    isAttack: true,
  },

  GANCHO_DEF: {
    id: 'gancho_def',
    type: 'GANCHO_DEF',
    color: 'GREEN',
    name: 'Gancho Defesa',
    description: 'Gancho defensivo alto de recuperação no fundo da quadra. Obriga o adversário a responder com FUNDO.',
    requiredResponse: 'FUNDO',
    belongsToGroups: ['FUNDO'],
    quantityInDeck: 2,
    illustrationPath: '/assets/cards/gancho_def.jpg',
    isWildcard: false,
    isAttack: false,
  },
  VERONICA_DEF: {
    id: 'veronica_def',
    type: 'VERONICA_DEF',
    color: 'GREEN',
    name: 'Verônica Defesa',
    description: 'Verônica defensiva alta de recuperação no fundo da quadra. Obriga o adversário a responder com FUNDO.',
    requiredResponse: 'FUNDO',
    belongsToGroups: ['FUNDO'],
    quantityInDeck: 2,
    illustrationPath: '/assets/cards/veronica_def.jpg',
    isWildcard: false,
    isAttack: false,
  },

  GOLPE_UBT_CORINGA: {
    id: 'golpe_ubt_coringa',
    type: 'GOLPE_UBT_CORINGA',
    color: 'GREEN',
    name: 'Golpe UBT Coringa',
    description: 'Coringa de golpe verde. Pode substituir qualquer golpe verde exigido (Bandejas, Voleios ou Fundo). Não defende ataques acelerados.',
    requiredResponse: undefined, // Determinado dinamicamente pelo golpe declarado
    belongsToGroups: ['BANDEJAS', 'VOLEIOS', 'FUNDO'],
    quantityInDeck: 2,
    illustrationPath: '/assets/cards/golpe_ubt_coringa.jpg',
    isWildcard: true,
    isAttack: false,
  },
};

/**
 * Array imutável contendo todas as 19 definições de cartas do catálogo.
 */
export const ALL_CARDS: readonly CardDefinition[] = Object.freeze(
  Object.values(CARDS_CATALOG)
);

// ============================================================================
// 2. MATRIZ OFICIAL DA FOLHA ROSA (14 TRANSIÇÕES)
// ============================================================================

/**
 * Dicionário das 14 transições de cartas regulares (não-coringas) de rali
 * para o grupo de resposta exigido conforme a transcrição literal da Folha Rosa.
 */
export const PINK_SHEET_TRANSITIONS: Record<
  Exclude<CardType, 'DEF_UBT_CORINGA' | 'GOLPE_UBT_CORINGA' | OrangeCardType>,
  RequiredResponse
> = {
  // Bolas Curtas -> BANDEJAS
  DEF_CURTA: 'BANDEJAS',
  VOLEIO_PINGADA: 'BANDEJAS',
  BANDEJA_CURTA: 'BANDEJAS',

  // Bolas Médias/Neutras -> VOLEIOS
  DEF_NEUTRA: 'VOLEIOS',
  BANDEJA_LOB_CHUTADO: 'VOLEIOS',

  // Bolas de Ataque / Aceleradas -> DEFESAS
  VOLEIO_ACELERADO: 'DEFESAS',
  SMASH: 'DEFESAS',
  GANCHO_ATA: 'DEFESAS',
  VERONICA_ATA: 'DEFESAS',

  // Lobs e Bolas Altas -> FUNDO
  DEF_LOB: 'FUNDO',
  VOLEIO_LOB: 'FUNDO',
  BANDEJA_LOB: 'FUNDO',
  GANCHO_DEF: 'FUNDO',
  VERONICA_DEF: 'FUNDO',
};

/**
 * Grupos canônicos de resposta e os tipos de cartas que os satisfazem nativamente.
 */
export const RESPONSE_GROUPS: Record<
  RequiredResponse,
  {
    name: string;
    description: string;
    allowedCards: readonly CardType[];
    allowsGreenWildcard: boolean;
  }
> = {
  BANDEJAS: {
    name: 'Bandejas',
    description: 'Bolas curtas amortecidas na rede.',
    allowedCards: ['BANDEJA_CURTA', 'BANDEJA_LOB_CHUTADO', 'BANDEJA_LOB'],
    allowsGreenWildcard: true,
  },
  VOLEIOS: {
    name: 'Voleios',
    description: 'Bolas médias e neutras no meio de quadra.',
    allowedCards: ['VOLEIO_PINGADA', 'VOLEIO_ACELERADO', 'VOLEIO_LOB'],
    allowsGreenWildcard: true,
  },
  DEFESAS: {
    name: 'Defesas',
    description: 'Ataques rápidos exigindo compra automática do Monte Azul.',
    allowedCards: ['DEF_CURTA', 'DEF_NEUTRA', 'DEF_LOB', 'DEF_UBT_CORINGA'],
    allowsGreenWildcard: false, // Ataques NÃO podem ser defendidos com cartas verdes da mão!
  },
  FUNDO: {
    name: 'Fundo / Aéreos',
    description: 'Lobs altos e balões no fundo de quadra.',
    allowedCards: ['SMASH', 'GANCHO_ATA', 'GANCHO_DEF', 'VERONICA_ATA', 'VERONICA_DEF'],
    allowsGreenWildcard: true,
  },
};

// ============================================================================
// 3. COMPOSIÇÃO OFICIAL DOS BARALHOS (1V1)
// ============================================================================

export const DECK_COMPOSITION = {
  greenDeckCount: 24,
  blueDeckCount: 8,
  orangeServeCount: 3,
  totalRallyCards: 32,
  totalPlayerCards: 35,
} as const;

// ============================================================================
// 4. FUNÇÕES DE CONSULTA E VALIDAÇÃO (HELPERS)
// ============================================================================

/**
 * Retorna a definição canônica de uma carta a partir do seu CardType.
 * Lança erro descritivo caso o tipo seja inválido.
 */
export function getCardDefinition(type: CardType): CardDefinition {
  const def = CARDS_CATALOG[type];
  if (!def) {
    throw new Error(`[cardsCatalog] Tipo de carta desconhecido: "${type}"`);
  }
  return def;
}

/**
 * Retorna o grupo de resposta exigido pela carta jogada na mesa.
 * - Para cartas normais de rali, consulta diretamente o catálogo.
 * - Para coringas declarados, consulta a exigência do golpe declarado.
 * - Para cartas não declaradas ou de saque, retorna undefined.
 */
export function getCardRequiredResponse(
  type: CardType,
  declaredAs?: CardType
): RequiredResponse | undefined {
  if (type === 'DEF_UBT_CORINGA' || type === 'GOLPE_UBT_CORINGA') {
    if (!declaredAs) return undefined;
    const declaredDef = CARDS_CATALOG[declaredAs];
    return declaredDef?.requiredResponse;
  }
  return CARDS_CATALOG[type]?.requiredResponse;
}

/**
 * Retorna todas as cartas do catálogo como um array imutável.
 */
export function getAllCards(): readonly CardDefinition[] {
  return ALL_CARDS;
}

/**
 * Retorna todas as cartas de uma cor específica.
 */
export function getCardsByColor(color: CardColor): CardDefinition[] {
  return ALL_CARDS.filter((card) => card.color === color);
}

/**
 * Retorna todas as cartas que exigem uma determinada categoria de resposta do oponente.
 */
export function getCardsByRequiredResponse(response: RequiredResponse): CardDefinition[] {
  return ALL_CARDS.filter((card) => card.requiredResponse === response);
}

/**
 * Retorna as definições das cartas que são elegíveis para responder a uma categoria.
 * @param response Grupo de resposta exigido
 * @param includeWildcards Se deve incluir cartas coringa (padrão: true)
 */
export function getCardsSatisfyingResponse(
  response: RequiredResponse,
  includeWildcards = true
): CardDefinition[] {
  return ALL_CARDS.filter((card) => {
    if (card.isWildcard && !includeWildcards) return false;
    if (response === 'DEFESAS' && card.type === 'GOLPE_UBT_CORINGA') return false;
    return card.belongsToGroups.includes(response);
  });
}

/**
 * Retorna a lista de CardType legais que satisfazem um determinado grupo de resposta.
 */
export function getLegalResponseTypes(
  response: RequiredResponse,
  includeWildcards = true
): CardType[] {
  const group = RESPONSE_GROUPS[response];
  if (!group) return [];

  const types = [...group.allowedCards];
  if (includeWildcards && group.allowsGreenWildcard) {
    types.push('GOLPE_UBT_CORINGA');
  }
  return types;
}

/**
 * Verifica puramente se uma carta jogada (com eventual declaração de coringa)
 * satisfaz a exigência atual.
 */
export function isCardLegalForResponse(
  playedType: CardType,
  requiredResponse: RequiredResponse,
  declaredType?: CardType
): boolean {
  if (requiredResponse === 'DEFESAS') {
    // Defesa só é satisfeita por cartas puxadas do Monte Azul
    if (playedType === 'GOLPE_UBT_CORINGA') return false;
    const def = CARDS_CATALOG[playedType];
    return def?.color === 'BLUE';
  }

  // Se a carta jogada for o Coringa Verde
  if (playedType === 'GOLPE_UBT_CORINGA') {
    if (!declaredType) return true; // Coringa em si é elegível para a exigência verde
    // Mas se declarou, a declaração precisa pertencer ao grupo exigido
    const targetGroup = RESPONSE_GROUPS[requiredResponse];
    return targetGroup.allowedCards.includes(declaredType);
  }

  // Para cartas normais
  const targetGroup = RESPONSE_GROUPS[requiredResponse];
  return targetGroup.allowedCards.includes(playedType);
}

/**
 * Valida uma transição completa entre a carta recebida na quadra e a carta jogada.
 * Cobre as 14 transições da Folha Rosa e declarações de Coringa Azul e Verde.
 */
export function isValidResponse(
  incomingType: CardType,
  playedType: CardType,
  playedDeclaredType?: CardType,
  incomingDeclaredType?: CardType
): boolean {
  // Determina qual exigência a carta anterior impôs
  let required: RequiredResponse | undefined;

  if (incomingType === 'DEF_UBT_CORINGA' || incomingType === 'GOLPE_UBT_CORINGA') {
    if (!incomingDeclaredType) return false;
    required = getCardRequiredResponse(incomingDeclaredType);
  } else {
    required = getCardRequiredResponse(incomingType);
  }

  if (!required) return false;

  return isCardLegalForResponse(playedType, required, playedDeclaredType);
}

/**
 * Retorna as declarações válidas permitidas para uma carta coringa.
 */
export function getValidWildcardDeclarations(
  wildcardType: CardType,
  currentRequiredResponse?: RequiredResponse
): CardType[] {
  if (wildcardType === 'DEF_UBT_CORINGA') {
    return ['DEF_CURTA', 'DEF_NEUTRA', 'DEF_LOB'];
  }

  if (wildcardType === 'GOLPE_UBT_CORINGA') {
    if (currentRequiredResponse === 'DEFESAS') {
      return []; // Proibido para defender ataques
    }
    if (currentRequiredResponse) {
      return [...RESPONSE_GROUPS[currentRequiredResponse].allowedCards];
    }
    // Caso não haja contexto, retorna todos os 11 golpes verdes normais
    return [
      'BANDEJA_CURTA',
      'BANDEJA_LOB_CHUTADO',
      'BANDEJA_LOB',
      'VOLEIO_PINGADA',
      'VOLEIO_ACELERADO',
      'VOLEIO_LOB',
      'SMASH',
      'GANCHO_ATA',
      'VERONICA_ATA',
      'GANCHO_DEF',
      'VERONICA_DEF',
    ];
  }

  return [];
}

/**
 * Retorna a composição oficial de baralhos para o modo 1v1.
 */
export function getDeckComposition() {
  return DECK_COMPOSITION;
}

/**
 * Cria a lista inicial de tipos de cartas para montar os baralhos de um jogador:
 * - 'GREEN': 24 cartas (2 cópias de cada um dos 12 tipos verdes)
 * - 'BLUE': 8 cartas (2 cópias de cada um dos 4 tipos azuis)
 * - 'ORANGE': 3 cartas (1 cópia de SAQUE_1, SAQUE_2, SAQUE_3)
 */
export function createInitialDeckList(color: CardColor): CardType[] {
  const cardsOfColor = ALL_CARDS.filter((c) => c.color === color);
  const deckList: CardType[] = [];

  for (const card of cardsOfColor) {
    for (let i = 0; i < card.quantityInDeck; i++) {
      deckList.push(card.type);
    }
  }

  return deckList;
}
