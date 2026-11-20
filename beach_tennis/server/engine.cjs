"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/engine/index.ts
var index_exports = {};
__export(index_exports, {
  ALL_CARDS: () => ALL_CARDS,
  CARDS_CATALOG: () => CARDS_CATALOG,
  DECK_COMPOSITION: () => DECK_COMPOSITION,
  DEFAULT_LABELS: () => DEFAULT_LABELS,
  INITIAL_GROUP_COUNTS: () => INITIAL_GROUP_COUNTS,
  PINK_SHEET_TRANSITIONS: () => PINK_SHEET_TRANSITIONS,
  RESPONSE_GROUPS: () => RESPONSE_GROUPS,
  addPoint: () => addPoint,
  applyEngineAction: () => applyEngineAction,
  awardPoint: () => awardPoint,
  buildFreshPlayerState: () => buildFreshPlayerState,
  calculateAceProbability: () => calculateAceProbability,
  chooseAutoTimeoutAction: () => chooseAutoTimeoutAction,
  chooseBlueDefenseDeclaration: () => chooseBlueDefenseDeclaration,
  chooseBlueWildcardDeclaration: () => chooseBlueWildcardDeclaration,
  chooseGreenWildcardDeclaration: () => chooseGreenWildcardDeclaration,
  chooseRallyPlay: () => chooseRallyPlay,
  chooseReceive: () => chooseReceive,
  chooseReceiveZones: () => chooseReceiveZones,
  chooseServe: () => chooseServe,
  chooseServeZone: () => chooseServeZone,
  createAIHistoryTracker: () => createAIHistoryTracker,
  createCardInstance: () => createCardInstance,
  createDecks: () => createDecks,
  createEngineMatch: () => createEngineMatch,
  createInitialDeckList: () => createInitialDeckList,
  createInitialRallyState: () => createInitialRallyState,
  createInitialScore: () => createInitialScore,
  createInitialServeDuel: () => createInitialServeDuel,
  createInitialStats: () => createInitialStats,
  createOrangeDeck: () => createOrangeDeck,
  dealInitialHand: () => dealInitialHand,
  digCards: () => digCards,
  digSingleStep: () => digSingleStep,
  drawDefenseCard: () => drawDefenseCard,
  drawInitialHand: () => drawInitialHand,
  finalizeEnginePoint: () => finalizeEnginePoint,
  formatGames: () => formatGames,
  formatPoints: () => formatPoints,
  formatScore: () => formatScore,
  getAIDelay: () => getAIDelay,
  getAllCards: () => getAllCards,
  getAllPossibleReceiverPairs: () => getAllPossibleReceiverPairs,
  getAllPossibleServeZones: () => getAllPossibleServeZones,
  getCardDefinition: () => getCardDefinition,
  getCardRequiredResponse: () => getCardRequiredResponse,
  getCardsByColor: () => getCardsByColor,
  getCardsByRequiredResponse: () => getCardsByRequiredResponse,
  getCardsSatisfyingResponse: () => getCardsSatisfyingResponse,
  getDeckComposition: () => getDeckComposition,
  getLeastCoveredReceiveZone: () => getLeastCoveredReceiveZone,
  getLegalMoves: () => getLegalMoves,
  getLegalResponseTypes: () => getLegalResponseTypes,
  getMostFrequentServeZone: () => getMostFrequentServeZone,
  getRemainingCardsByGroup: () => getRemainingCardsByGroup,
  getRequiredResponse: () => getRequiredResponse,
  getScarcestResponseGroup: () => getScarcestResponseGroup,
  getServeProbabilities: () => getServeProbabilities,
  getTopTwoReceiveZones: () => getTopTwoReceiveZones,
  getValidBlueWildcardDeclarations: () => getValidBlueWildcardDeclarations,
  getValidCardsInHand: () => getValidCardsInHand,
  getValidDeclarationsForResponse: () => getValidDeclarationsForResponse,
  getValidWildcardDeclarations: () => getValidWildcardDeclarations,
  hasValidCardInHand: () => hasValidCardInHand,
  isAttackShot: () => isAttackShot,
  isCardLegalForResponse: () => isCardLegalForResponse,
  isValidDefenseDeclaration: () => isValidDefenseDeclaration,
  isValidResponse: () => isValidResponse,
  mapSeatPerspective: () => mapSeatPerspective,
  projectDomainEvent: () => projectDomainEvent,
  projectMatchView: () => projectMatchView,
  recordDiscardedCard: () => recordDiscardedCard,
  recordPlayerReceive: () => recordPlayerReceive,
  recordPlayerServe: () => recordPlayerServe,
  resetPointDiscards: () => resetPointDiscards,
  resolveServe: () => resolveServe,
  resolveServeAndDrawDefense: () => resolveServeAndDrawDefense,
  resolveServeExtended: () => resolveServeExtended,
  shuffleDeck: () => shuffleDeck,
  simulateAIThinking: () => simulateAIThinking,
  startNewEnginePoint: () => startNewEnginePoint,
  validateTurnPlay: () => validateTurnPlay
});
module.exports = __toCommonJS(index_exports);

// src/engine/cardsCatalog.ts
var CARDS_CATALOG = {
  // --------------------------------------------------------------------------
  // Cartas Laranjas: Saque e Recepção (Zonas 1 a 3)
  // --------------------------------------------------------------------------
  SAQUE_1: {
    id: "saque_1",
    type: "SAQUE_1",
    color: "ORANGE",
    name: "Saque 1",
    description: "Saque direcionado ou cobertura de recep\xE7\xE3o na Zona 1 da quadra.",
    requiredResponse: void 0,
    belongsToGroups: [],
    quantityInDeck: 1,
    illustrationPath: "/assets/cards/saque_1.jpg",
    isWildcard: false,
    isAttack: false,
    serveNumber: 1
  },
  SAQUE_2: {
    id: "saque_2",
    type: "SAQUE_2",
    color: "ORANGE",
    name: "Saque 2",
    description: "Saque direcionado ou cobertura de recep\xE7\xE3o na Zona 2 (meio de quadra).",
    requiredResponse: void 0,
    belongsToGroups: [],
    quantityInDeck: 1,
    illustrationPath: "/assets/cards/saque_2.jpg",
    isWildcard: false,
    isAttack: false,
    serveNumber: 2
  },
  SAQUE_3: {
    id: "saque_3",
    type: "SAQUE_3",
    color: "ORANGE",
    name: "Saque 3",
    description: "Saque direcionado ou cobertura de recep\xE7\xE3o na Zona 3 da quadra.",
    requiredResponse: void 0,
    belongsToGroups: [],
    quantityInDeck: 1,
    illustrationPath: "/assets/cards/saque_3.jpg",
    isWildcard: false,
    isAttack: false,
    serveNumber: 3
  },
  // --------------------------------------------------------------------------
  // Cartas Azuis: Monte de Defesa (8 cartas por jogador, 2 de cada tipo)
  // --------------------------------------------------------------------------
  DEF_CURTA: {
    id: "def_curta",
    type: "DEF_CURTA",
    color: "BLUE",
    name: "Def Curta",
    description: "Devolu\xE7\xE3o defensiva amortecida curta rente \xE0 rede. Obriga o advers\xE1rio a responder com BANDEJAS.",
    requiredResponse: "BANDEJAS",
    belongsToGroups: ["DEFESAS"],
    quantityInDeck: 2,
    illustrationPath: "/assets/cards/def_curta.jpg",
    isWildcard: false,
    isAttack: false
  },
  DEF_NEUTRA: {
    id: "def_neutra",
    type: "DEF_NEUTRA",
    color: "BLUE",
    name: "Def Neutra",
    description: "Devolu\xE7\xE3o defensiva m\xE9dia no centro da quadra. Obriga o advers\xE1rio a responder com VOLEIOS.",
    requiredResponse: "VOLEIOS",
    belongsToGroups: ["DEFESAS"],
    quantityInDeck: 2,
    illustrationPath: "/assets/cards/def_neutra.jpg",
    isWildcard: false,
    isAttack: false
  },
  DEF_LOB: {
    id: "def_lob",
    type: "DEF_LOB",
    color: "BLUE",
    name: "Def Lob",
    description: "Devolu\xE7\xE3o defensiva em bal\xE3o alto no fundo de quadra. Obriga o advers\xE1rio a responder com FUNDO.",
    requiredResponse: "FUNDO",
    belongsToGroups: ["DEFESAS"],
    quantityInDeck: 2,
    illustrationPath: "/assets/cards/def_lob.jpg",
    isWildcard: false,
    isAttack: false
  },
  DEF_UBT_CORINGA: {
    id: "def_ubt_coringa",
    type: "DEF_UBT_CORINGA",
    color: "BLUE",
    name: "Def UBT Coringa",
    description: "Coringa defensivo do Monte Azul. O jogador escolhe e declara se a bola volta como Curta, Neutra ou Lob.",
    requiredResponse: void 0,
    // Determinado dinamicamente na declaração
    belongsToGroups: ["DEFESAS"],
    quantityInDeck: 2,
    illustrationPath: "/assets/cards/def_ubt_coringa.jpg",
    isWildcard: true,
    isAttack: false
  },
  // --------------------------------------------------------------------------
  // Cartas Verdes: Monte de Golpes e Rali (24 cartas por jogador, 2 de cada tipo)
  // --------------------------------------------------------------------------
  BANDEJA_CURTA: {
    id: "bandeja_curta",
    type: "BANDEJA_CURTA",
    color: "GREEN",
    name: "Bandeja Curta",
    description: "Bandeja suave colocada rente \xE0 rede. Obriga o advers\xE1rio a responder com BANDEJAS.",
    requiredResponse: "BANDEJAS",
    belongsToGroups: ["BANDEJAS"],
    quantityInDeck: 2,
    illustrationPath: "/assets/cards/bandeja_curta.jpg",
    isWildcard: false,
    isAttack: false
  },
  BANDEJA_LOB_CHUTADO: {
    id: "bandeja_lob_chutado",
    type: "BANDEJA_LOB_CHUTADO",
    color: "GREEN",
    name: "Bandeja Lob Chutado",
    description: "Bandeja r\xE1pida, tensa e esticada a meia altura. Obriga o advers\xE1rio a responder com VOLEIOS.",
    requiredResponse: "VOLEIOS",
    belongsToGroups: ["BANDEJAS"],
    quantityInDeck: 2,
    illustrationPath: "/assets/cards/bandeja_lob_chutado.jpg",
    isWildcard: false,
    isAttack: false
  },
  BANDEJA_LOB: {
    id: "bandeja_lob",
    type: "BANDEJA_LOB",
    color: "GREEN",
    name: "Bandeja Lob",
    description: "Bandeja alta em arco profundo no fundo da quadra. Obriga o advers\xE1rio a responder com FUNDO.",
    requiredResponse: "FUNDO",
    belongsToGroups: ["BANDEJAS"],
    quantityInDeck: 2,
    illustrationPath: "/assets/cards/bandeja_lob.jpg",
    isWildcard: false,
    isAttack: false
  },
  VOLEIO_PINGADA: {
    id: "voleio_pingada",
    type: "VOLEIO_PINGADA",
    color: "GREEN",
    name: "Voleio Pingada",
    description: "Toque sutil de voleio amortecido na rede. Obriga o advers\xE1rio a responder com BANDEJAS.",
    requiredResponse: "BANDEJAS",
    belongsToGroups: ["VOLEIOS"],
    quantityInDeck: 2,
    illustrationPath: "/assets/cards/voleio_pingada.jpg",
    isWildcard: false,
    isAttack: false
  },
  VOLEIO_ACELERADO: {
    id: "voleio_acelerado",
    type: "VOLEIO_ACELERADO",
    color: "GREEN",
    name: "Voleio Acelerado",
    description: "Voleio potente e rasante no corpo do advers\xE1rio. Ataque que obriga o oponente a puxar 1 carta do Monte Azul.",
    requiredResponse: "DEFESAS",
    belongsToGroups: ["VOLEIOS"],
    quantityInDeck: 2,
    illustrationPath: "/assets/cards/voleio_acelerado.jpg",
    isWildcard: false,
    isAttack: true
  },
  VOLEIO_LOB: {
    id: "voleio_lob",
    type: "VOLEIO_LOB",
    color: "GREEN",
    name: "Voleio Lob",
    description: "Voleio em cobertura alta por cima do advers\xE1rio adiantado. Obriga o oponente a responder com FUNDO.",
    requiredResponse: "FUNDO",
    belongsToGroups: ["VOLEIOS"],
    quantityInDeck: 2,
    illustrationPath: "/assets/cards/voleio_lob.jpg",
    isWildcard: false,
    isAttack: false
  },
  SMASH: {
    id: "smash",
    type: "SMASH",
    color: "GREEN",
    name: "Smash",
    description: "Golpe a\xE9reo vertical devastador de cima para baixo. Ataque potente que obriga o oponente a puxar 1 carta do Monte Azul.",
    requiredResponse: "DEFESAS",
    belongsToGroups: ["FUNDO"],
    quantityInDeck: 2,
    illustrationPath: "/assets/cards/smash.jpg",
    isWildcard: false,
    isAttack: true
  },
  GANCHO_ATA: {
    id: "gancho_ata",
    type: "GANCHO_ATA",
    color: "GREEN",
    name: "Gancho Ataque",
    description: "Gancho ofensivo veloz e angular no fundo. Ataque que obriga o oponente a puxar 1 carta do Monte Azul.",
    requiredResponse: "DEFESAS",
    belongsToGroups: ["FUNDO"],
    quantityInDeck: 2,
    illustrationPath: "/assets/cards/gancho_ata.jpg",
    isWildcard: false,
    isAttack: true
  },
  VERONICA_ATA: {
    id: "veronica_ata",
    type: "VERONICA_ATA",
    color: "GREEN",
    name: "Ver\xF4nica Ataque",
    description: "Golpe acrob\xE1tico de costas ofensivo e acelerado. Ataque que obriga o oponente a puxar 1 carta do Monte Azul.",
    requiredResponse: "DEFESAS",
    belongsToGroups: ["FUNDO"],
    quantityInDeck: 2,
    illustrationPath: "/assets/cards/veronica_ata.jpg",
    isWildcard: false,
    isAttack: true
  },
  GANCHO_DEF: {
    id: "gancho_def",
    type: "GANCHO_DEF",
    color: "GREEN",
    name: "Gancho Defesa",
    description: "Gancho defensivo alto de recupera\xE7\xE3o no fundo da quadra. Obriga o advers\xE1rio a responder com FUNDO.",
    requiredResponse: "FUNDO",
    belongsToGroups: ["FUNDO"],
    quantityInDeck: 2,
    illustrationPath: "/assets/cards/gancho_def.jpg",
    isWildcard: false,
    isAttack: false
  },
  VERONICA_DEF: {
    id: "veronica_def",
    type: "VERONICA_DEF",
    color: "GREEN",
    name: "Ver\xF4nica Defesa",
    description: "Ver\xF4nica defensiva alta de recupera\xE7\xE3o no fundo da quadra. Obriga o advers\xE1rio a responder com FUNDO.",
    requiredResponse: "FUNDO",
    belongsToGroups: ["FUNDO"],
    quantityInDeck: 2,
    illustrationPath: "/assets/cards/veronica_def.jpg",
    isWildcard: false,
    isAttack: false
  },
  GOLPE_UBT_CORINGA: {
    id: "golpe_ubt_coringa",
    type: "GOLPE_UBT_CORINGA",
    color: "GREEN",
    name: "Golpe UBT Coringa",
    description: "Coringa de golpe verde. Pode substituir qualquer golpe verde exigido (Bandejas, Voleios ou Fundo). N\xE3o defende ataques acelerados.",
    requiredResponse: void 0,
    // Determinado dinamicamente pelo golpe declarado
    belongsToGroups: ["BANDEJAS", "VOLEIOS", "FUNDO"],
    quantityInDeck: 2,
    illustrationPath: "/assets/cards/golpe_ubt_coringa.jpg",
    isWildcard: true,
    isAttack: false
  }
};
var ALL_CARDS = Object.freeze(
  Object.values(CARDS_CATALOG)
);
var PINK_SHEET_TRANSITIONS = {
  // Bolas Curtas -> BANDEJAS
  DEF_CURTA: "BANDEJAS",
  VOLEIO_PINGADA: "BANDEJAS",
  BANDEJA_CURTA: "BANDEJAS",
  // Bolas Médias/Neutras -> VOLEIOS
  DEF_NEUTRA: "VOLEIOS",
  BANDEJA_LOB_CHUTADO: "VOLEIOS",
  // Bolas de Ataque / Aceleradas -> DEFESAS
  VOLEIO_ACELERADO: "DEFESAS",
  SMASH: "DEFESAS",
  GANCHO_ATA: "DEFESAS",
  VERONICA_ATA: "DEFESAS",
  // Lobs e Bolas Altas -> FUNDO
  DEF_LOB: "FUNDO",
  VOLEIO_LOB: "FUNDO",
  BANDEJA_LOB: "FUNDO",
  GANCHO_DEF: "FUNDO",
  VERONICA_DEF: "FUNDO"
};
var RESPONSE_GROUPS = {
  BANDEJAS: {
    name: "Bandejas",
    description: "Bolas curtas amortecidas na rede.",
    allowedCards: ["BANDEJA_CURTA", "BANDEJA_LOB_CHUTADO", "BANDEJA_LOB"],
    allowsGreenWildcard: true
  },
  VOLEIOS: {
    name: "Voleios",
    description: "Bolas m\xE9dias e neutras no meio de quadra.",
    allowedCards: ["VOLEIO_PINGADA", "VOLEIO_ACELERADO", "VOLEIO_LOB"],
    allowsGreenWildcard: true
  },
  DEFESAS: {
    name: "Defesas",
    description: "Ataques r\xE1pidos exigindo compra autom\xE1tica do Monte Azul.",
    allowedCards: ["DEF_CURTA", "DEF_NEUTRA", "DEF_LOB", "DEF_UBT_CORINGA"],
    allowsGreenWildcard: false
    // Ataques NÃO podem ser defendidos com cartas verdes da mão!
  },
  FUNDO: {
    name: "Fundo / A\xE9reos",
    description: "Lobs altos e bal\xF5es no fundo de quadra.",
    allowedCards: ["SMASH", "GANCHO_ATA", "GANCHO_DEF", "VERONICA_ATA", "VERONICA_DEF"],
    allowsGreenWildcard: true
  }
};
var DECK_COMPOSITION = {
  greenDeckCount: 24,
  blueDeckCount: 8,
  orangeServeCount: 3,
  totalRallyCards: 32,
  totalPlayerCards: 35
};
function getCardDefinition(type) {
  const def = CARDS_CATALOG[type];
  if (!def) {
    throw new Error(`[cardsCatalog] Tipo de carta desconhecido: "${type}"`);
  }
  return def;
}
function getCardRequiredResponse(type, declaredAs) {
  if (type === "DEF_UBT_CORINGA" || type === "GOLPE_UBT_CORINGA") {
    if (!declaredAs) return void 0;
    const declaredDef = CARDS_CATALOG[declaredAs];
    return declaredDef?.requiredResponse;
  }
  return CARDS_CATALOG[type]?.requiredResponse;
}
function getAllCards() {
  return ALL_CARDS;
}
function getCardsByColor(color) {
  return ALL_CARDS.filter((card) => card.color === color);
}
function getCardsByRequiredResponse(response) {
  return ALL_CARDS.filter((card) => card.requiredResponse === response);
}
function getCardsSatisfyingResponse(response, includeWildcards = true) {
  return ALL_CARDS.filter((card) => {
    if (card.isWildcard && !includeWildcards) return false;
    if (response === "DEFESAS" && card.type === "GOLPE_UBT_CORINGA") return false;
    return card.belongsToGroups.includes(response);
  });
}
function getLegalResponseTypes(response, includeWildcards = true) {
  const group = RESPONSE_GROUPS[response];
  if (!group) return [];
  const types = [...group.allowedCards];
  if (includeWildcards && group.allowsGreenWildcard) {
    types.push("GOLPE_UBT_CORINGA");
  }
  return types;
}
function isCardLegalForResponse(playedType, requiredResponse, declaredType) {
  if (requiredResponse === "DEFESAS") {
    if (playedType === "GOLPE_UBT_CORINGA") return false;
    const def = CARDS_CATALOG[playedType];
    return def?.color === "BLUE";
  }
  if (playedType === "GOLPE_UBT_CORINGA") {
    if (!declaredType) return true;
    const targetGroup2 = RESPONSE_GROUPS[requiredResponse];
    return targetGroup2.allowedCards.includes(declaredType);
  }
  const targetGroup = RESPONSE_GROUPS[requiredResponse];
  return targetGroup.allowedCards.includes(playedType);
}
function isValidResponse(incomingType, playedType, playedDeclaredType, incomingDeclaredType) {
  let required;
  if (incomingType === "DEF_UBT_CORINGA" || incomingType === "GOLPE_UBT_CORINGA") {
    if (!incomingDeclaredType) return false;
    required = getCardRequiredResponse(incomingDeclaredType);
  } else {
    required = getCardRequiredResponse(incomingType);
  }
  if (!required) return false;
  return isCardLegalForResponse(playedType, required, playedDeclaredType);
}
function getValidWildcardDeclarations(wildcardType, currentRequiredResponse) {
  if (wildcardType === "DEF_UBT_CORINGA") {
    return ["DEF_CURTA", "DEF_NEUTRA", "DEF_LOB"];
  }
  if (wildcardType === "GOLPE_UBT_CORINGA") {
    if (currentRequiredResponse === "DEFESAS") {
      return [];
    }
    if (currentRequiredResponse) {
      return [...RESPONSE_GROUPS[currentRequiredResponse].allowedCards];
    }
    return [
      "BANDEJA_CURTA",
      "BANDEJA_LOB_CHUTADO",
      "BANDEJA_LOB",
      "VOLEIO_PINGADA",
      "VOLEIO_ACELERADO",
      "VOLEIO_LOB",
      "SMASH",
      "GANCHO_ATA",
      "VERONICA_ATA",
      "GANCHO_DEF",
      "VERONICA_DEF"
    ];
  }
  return [];
}
function getDeckComposition() {
  return DECK_COMPOSITION;
}
function createInitialDeckList(color) {
  const cardsOfColor = ALL_CARDS.filter((c) => c.color === color);
  const deckList = [];
  for (const card of cardsOfColor) {
    for (let i = 0; i < card.quantityInDeck; i++) {
      deckList.push(card.type);
    }
  }
  return deckList;
}

// src/engine/deckManager.ts
function createCardInstance(type, owner = "PLAYER", copyIndex = 0) {
  const definition = getCardDefinition(type);
  const instanceId = `${owner.toLowerCase()}_${definition.color.toLowerCase()}_${definition.id}_${copyIndex}`;
  return {
    instanceId,
    cardId: definition.id,
    definition,
    owner,
    declaredAs: void 0
  };
}
function shuffleDeck(deck, rng = Math.random) {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}
function createDecks(optionsOrRng, maybeRng) {
  let owner = "PLAYER";
  let rng = Math.random;
  let shouldShuffle = true;
  if (typeof optionsOrRng === "function") {
    rng = optionsOrRng;
  } else if (typeof optionsOrRng === "string") {
    owner = optionsOrRng;
    if (maybeRng) rng = maybeRng;
  } else if (optionsOrRng && typeof optionsOrRng === "object") {
    if (optionsOrRng.owner) owner = optionsOrRng.owner;
    if (optionsOrRng.rng) rng = optionsOrRng.rng;
    if (optionsOrRng.shuffle !== void 0) shouldShuffle = optionsOrRng.shuffle;
  }
  const greenTypes = createInitialDeckList("GREEN");
  const greenTypeCounts = {};
  const greenCards = greenTypes.map((type) => {
    const idx = greenTypeCounts[type] || 0;
    greenTypeCounts[type] = idx + 1;
    return createCardInstance(type, owner, idx);
  });
  const blueTypes = createInitialDeckList("BLUE");
  const blueTypeCounts = {};
  const blueCards = blueTypes.map((type) => {
    const idx = blueTypeCounts[type] || 0;
    blueTypeCounts[type] = idx + 1;
    return createCardInstance(type, owner, idx);
  });
  return {
    greenDeck: shouldShuffle ? shuffleDeck(greenCards, rng) : greenCards,
    blueDeck: shouldShuffle ? shuffleDeck(blueCards, rng) : blueCards
  };
}
function createOrangeDeck(owner = "PLAYER") {
  const orangeTypes = createInitialDeckList("ORANGE");
  return orangeTypes.map((type, idx) => createCardInstance(type, owner, idx));
}
function dealInitialHand(deck, handSize = 6) {
  if (deck.length < handSize) {
    throw new Error(
      `[deckManager] N\xE3o \xE9 poss\xEDvel distribuir a m\xE3o de ${handSize} cartas: o baralho possui apenas ${deck.length} cartas.`
    );
  }
  return {
    hand: deck.slice(0, handSize),
    remainingDeck: deck.slice(handSize)
  };
}
var drawInitialHand = dealInitialHand;
function hasValidCardInHand(hand, requiredResponse) {
  if (requiredResponse === "DEFESAS") {
    return false;
  }
  return hand.some(
    (card) => isCardLegalForResponse(card.definition.type, requiredResponse)
  );
}
function getValidCardsInHand(hand, requiredResponse) {
  if (requiredResponse === "DEFESAS") {
    return [];
  }
  return hand.filter(
    (card) => isCardLegalForResponse(card.definition.type, requiredResponse)
  );
}
function digCards(hand, greenDeck, requiredResponse, _rng) {
  if (requiredResponse === "DEFESAS") {
    throw new Error(
      "[deckManager] Cava\xE7\xE3o proibida para DEFESAS: golpes de ataque devem ser defendidos com o Monte Azul."
    );
  }
  if (hasValidCardInHand(hand, requiredResponse)) {
    throw new Error(
      `[deckManager] Jogador n\xE3o pode cavar: a m\xE3o j\xE1 possui carta(s) v\xE1lida(s) para a exig\xEAncia "${requiredResponse}".`
    );
  }
  if (greenDeck.length === 0) {
    return {
      drawnCard: null,
      attemptNumber: 1,
      isValid: false,
      mustPlayImmediately: false,
      canDigAgain: false,
      pointLost: true,
      reason: "GREEN_DECK_EMPTY",
      updatedGreenDeck: [],
      updatedHand: [...hand]
    };
  }
  const card1 = greenDeck[0];
  const remainingAfter1 = greenDeck.slice(1);
  const isCard1Valid = isCardLegalForResponse(card1.definition.type, requiredResponse);
  if (isCard1Valid) {
    return {
      drawnCard: card1,
      attemptNumber: 1,
      isValid: true,
      mustPlayImmediately: true,
      canDigAgain: false,
      pointLost: false,
      reason: "LEGAL_CARD_DRAWN",
      updatedGreenDeck: remainingAfter1,
      updatedHand: [...hand]
      // Carta não entra na mão, vai direto pra quadra
    };
  }
  const handWithCard1 = [...hand, card1];
  if (remainingAfter1.length === 0) {
    return {
      drawnCard: card1,
      attemptNumber: 2,
      isValid: false,
      mustPlayImmediately: false,
      canDigAgain: false,
      pointLost: true,
      reason: "GREEN_DECK_EMPTY",
      updatedGreenDeck: [],
      updatedHand: handWithCard1
    };
  }
  const card2 = remainingAfter1[0];
  const remainingAfter2 = remainingAfter1.slice(1);
  const isCard2Valid = isCardLegalForResponse(card2.definition.type, requiredResponse);
  if (isCard2Valid) {
    return {
      drawnCard: card2,
      attemptNumber: 2,
      isValid: true,
      mustPlayImmediately: true,
      canDigAgain: false,
      pointLost: false,
      reason: "LEGAL_CARD_DRAWN",
      updatedGreenDeck: remainingAfter2,
      updatedHand: handWithCard1
    };
  }
  const finalHand = [...handWithCard1, card2];
  return {
    drawnCard: card2,
    attemptNumber: 2,
    isValid: false,
    mustPlayImmediately: false,
    canDigAgain: false,
    pointLost: true,
    reason: "SECOND_ATTEMPT_INVALID",
    updatedGreenDeck: remainingAfter2,
    updatedHand: finalHand
  };
}
function digSingleStep(hand, greenDeck, requiredResponse, attemptNumber = 1) {
  if (requiredResponse === "DEFESAS") {
    throw new Error(
      "[deckManager] Cava\xE7\xE3o proibida para DEFESAS: golpes de ataque devem ser defendidos com o Monte Azul."
    );
  }
  if (attemptNumber === 1 && hasValidCardInHand(hand, requiredResponse)) {
    throw new Error(
      `[deckManager] Jogador n\xE3o pode cavar: a m\xE3o j\xE1 possui carta(s) v\xE1lida(s) para a exig\xEAncia "${requiredResponse}".`
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
      reason: "GREEN_DECK_EMPTY",
      updatedGreenDeck: [],
      updatedHand: [...hand]
    };
  }
  const card = greenDeck[0];
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
      reason: "LEGAL_CARD_DRAWN",
      updatedGreenDeck: remaining,
      updatedHand: [...hand]
    };
  }
  const updatedHand = [...hand, card];
  if (attemptNumber === 1) {
    if (remaining.length === 0) {
      return {
        drawnCard: card,
        attemptNumber: 1,
        isValid: false,
        mustPlayImmediately: false,
        canDigAgain: false,
        pointLost: true,
        reason: "GREEN_DECK_EMPTY",
        updatedGreenDeck: [],
        updatedHand
      };
    }
    return {
      drawnCard: card,
      attemptNumber: 1,
      isValid: false,
      mustPlayImmediately: false,
      canDigAgain: true,
      pointLost: false,
      reason: "FIRST_ATTEMPT_INVALID",
      updatedGreenDeck: remaining,
      updatedHand
    };
  }
  return {
    drawnCard: card,
    attemptNumber: 2,
    isValid: false,
    mustPlayImmediately: false,
    canDigAgain: false,
    pointLost: true,
    reason: "SECOND_ATTEMPT_INVALID",
    updatedGreenDeck: remaining,
    updatedHand
  };
}
function drawDefenseCard(blueDeck, defenderId = "PLAYER", attackerId) {
  const winner = attackerId ?? (defenderId === "PLAYER" ? "AI" : "PLAYER");
  if (blueDeck.length === 0) {
    return {
      drawnCard: null,
      isExhausted: true,
      winner,
      updatedBlueDeck: []
    };
  }
  const drawnCard = blueDeck[0];
  return {
    drawnCard,
    isExhausted: false,
    winner: void 0,
    updatedBlueDeck: blueDeck.slice(1)
  };
}

// src/engine/serveResolver.ts
function resolveServe(serverZone, receiverZones, server = "PLAYER", receiver = "AI") {
  if (!Number.isInteger(serverZone) || serverZone < 1 || serverZone > 3) {
    throw new Error(
      `[serveResolver] Zona de saque inv\xE1lida: ${serverZone}. No modo 1v1, a zona do sacador deve ser um n\xFAmero inteiro entre 1 e 3.`
    );
  }
  if (!Array.isArray(receiverZones)) {
    throw new Error(
      `[serveResolver] Zonas de recep\xE7\xE3o inv\xE1lidas: esperado um array, recebido ${typeof receiverZones}.`
    );
  }
  if (receiverZones.length !== 2) {
    throw new Error(
      `[serveResolver] Quantidade de zonas de recep\xE7\xE3o inv\xE1lida: ${receiverZones.length}. No modo 1v1, o recebedor deve escolher exatamente 2 zonas distintas.`
    );
  }
  const [z1, z2] = receiverZones;
  if (z1 === void 0 || z2 === void 0 || !Number.isInteger(z1) || z1 < 1 || z1 > 3 || !Number.isInteger(z2) || z2 < 1 || z2 > 3) {
    throw new Error(
      `[serveResolver] Zonas de recep\xE7\xE3o fora dos limites: [${receiverZones.join(", ")}]. Cada zona deve ser um n\xFAmero inteiro entre 1 e 3.`
    );
  }
  if (z1 === z2) {
    throw new Error(
      `[serveResolver] Zonas de recep\xE7\xE3o duplicadas: [${receiverZones.join(", ")}]. O recebedor deve escolher 2 zonas distintas.`
    );
  }
  const isCovered = receiverZones.includes(serverZone);
  if (!isCovered) {
    return {
      isAce: true,
      defenseSuccess: false,
      server,
      receiver,
      serverPick: serverZone,
      receiverPicks: receiverZones,
      winningPlayer: server
    };
  }
  return {
    isAce: false,
    defenseSuccess: true,
    server,
    receiver,
    serverPick: serverZone,
    receiverPicks: receiverZones,
    winningPlayer: void 0
  };
}
function resolveServeExtended(serverZone, receiverZones, server = "PLAYER", receiver = "AI", mode = "1v1") {
  const maxZone = mode === "1v1" ? 3 : 5;
  const requiredReceiverCount = mode === "1v1" ? 2 : 4;
  if (!Number.isInteger(serverZone) || serverZone < 1 || serverZone > maxZone) {
    throw new Error(
      `[serveResolver] Zona de saque inv\xE1lida para o modo ${mode}: ${serverZone}. Deve ser entre 1 e ${maxZone}.`
    );
  }
  if (!Array.isArray(receiverZones) || receiverZones.length !== requiredReceiverCount) {
    throw new Error(
      `[serveResolver] No modo ${mode}, o recebedor deve escolher exatamente ${requiredReceiverCount} zonas.`
    );
  }
  const uniqueZones = new Set(receiverZones);
  if (uniqueZones.size !== requiredReceiverCount) {
    throw new Error(
      `[serveResolver] Zonas de recep\xE7\xE3o cont\xEAm duplicatas: [${receiverZones.join(", ")}].`
    );
  }
  for (const z of receiverZones) {
    if (!Number.isInteger(z) || z < 1 || z > maxZone) {
      throw new Error(
        `[serveResolver] Zona de recep\xE7\xE3o fora dos limites: ${z}. Deve ser entre 1 e ${maxZone}.`
      );
    }
  }
  const isCovered = receiverZones.includes(serverZone);
  return {
    isAce: !isCovered,
    defenseSuccess: isCovered,
    server,
    receiver,
    serverPick: serverZone,
    receiverPicks: receiverZones,
    winningPlayer: !isCovered ? server : void 0
  };
}
function resolveServeAndDrawDefense(serverZone, receiverZones, blueDeck, server = "PLAYER", receiver = "AI") {
  const serveResult = resolveServe(serverZone, receiverZones, server, receiver);
  if (serveResult.isAce) {
    return {
      serveResult,
      defenseResult: null
    };
  }
  const defenseResult = drawDefenseCard(blueDeck, receiver, server);
  return {
    serveResult,
    defenseResult
  };
}
function isValidDefenseDeclaration(declaredType) {
  return declaredType === "DEF_CURTA" || declaredType === "DEF_NEUTRA" || declaredType === "DEF_LOB";
}
function getAllPossibleServeZones(mode = "1v1") {
  return mode === "1v1" ? [1, 2, 3] : [1, 2, 3, 4, 5];
}
function getAllPossibleReceiverPairs() {
  return [
    [1, 2],
    [1, 3],
    [2, 3]
  ];
}
function calculateAceProbability(mode = "1v1") {
  return mode === "1v1" ? 1 / 3 : 1 / 5;
}

// src/engine/rallyValidator.ts
function isCardInstance(card) {
  return "instanceId" in card;
}
function normalizeCard(card, explicitDeclaredAs) {
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
      declaredAs: explicitDeclaredAs ?? card.declaredAs
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
    declaredAs: explicitDeclaredAs
  };
}
function getRequiredResponse(incomingCard, declaredAs) {
  const norm = normalizeCard(incomingCard, declaredAs);
  if (norm.type === "DEF_UBT_CORINGA") {
    if (!norm.declaredAs) {
      throw new Error(
        "[rallyValidator] DEF_UBT_CORINGA exige declara\xE7\xE3o (DEF_CURTA, DEF_NEUTRA ou DEF_LOB) para determinar a resposta exigida."
      );
    }
    switch (norm.declaredAs) {
      case "DEF_CURTA":
        return "BANDEJAS";
      case "DEF_NEUTRA":
        return "VOLEIOS";
      case "DEF_LOB":
        return "FUNDO";
      default:
        throw new Error(
          `[rallyValidator] Declara\xE7\xE3o "${norm.declaredAs}" \xE9 inv\xE1lida para DEF_UBT_CORINGA. Permitidas: DEF_CURTA, DEF_NEUTRA, DEF_LOB.`
        );
    }
  }
  if (norm.type === "GOLPE_UBT_CORINGA") {
    if (!norm.declaredAs) {
      throw new Error(
        "[rallyValidator] GOLPE_UBT_CORINGA exige declara\xE7\xE3o de golpe verde para determinar a resposta exigida."
      );
    }
    const declaredDef = CARDS_CATALOG[norm.declaredAs];
    if (!declaredDef || declaredDef.color !== "GREEN" || declaredDef.isWildcard) {
      throw new Error(
        `[rallyValidator] Declara\xE7\xE3o "${norm.declaredAs}" \xE9 inv\xE1lida para GOLPE_UBT_CORINGA. Deve ser um dos 11 golpes verdes regulares.`
      );
    }
    if (!declaredDef.requiredResponse) {
      throw new Error(
        `[rallyValidator] O golpe declarado "${norm.declaredAs}" n\xE3o possui resposta exigida definida.`
      );
    }
    return declaredDef.requiredResponse;
  }
  if (norm.requiredResponse) {
    return norm.requiredResponse;
  }
  throw new Error(
    `[rallyValidator] A carta "${norm.name}" (${norm.type}) n\xE3o imp\xF5e resposta de rali v\xE1lida.`
  );
}
function isAttackShot(card, declaredAs) {
  const norm = normalizeCard(card, declaredAs);
  if (norm.type === "GOLPE_UBT_CORINGA") {
    if (!norm.declaredAs) return false;
    const def2 = CARDS_CATALOG[norm.declaredAs];
    return def2 ? def2.isAttack : false;
  }
  const def = CARDS_CATALOG[norm.type];
  return def ? def.isAttack : false;
}
function getLegalMoves(hand, incomingCard, incomingDeclaredAs) {
  const isAttack = isAttackShot(incomingCard, incomingDeclaredAs);
  if (isAttack) {
    return {
      playableCards: [],
      canDig: false,
      requiresBlueDefense: true
    };
  }
  const required = getRequiredResponse(incomingCard, incomingDeclaredAs);
  const playableCards = hand.filter((card) => {
    if (card.definition.color !== "GREEN") {
      return false;
    }
    if (card.definition.type === "GOLPE_UBT_CORINGA") {
      return true;
    }
    return card.definition.belongsToGroups.includes(required);
  });
  const canDig = playableCards.length === 0;
  return {
    playableCards,
    canDig,
    requiresBlueDefense: false
  };
}
function validateTurnPlay(incomingCard, playedCard, declaredAs) {
  if (!incomingCard || !playedCard) {
    return {
      isValid: false,
      error: "Cartas de entrada e jogada s\xE3o obrigat\xF3rias."
    };
  }
  const incomingNorm = normalizeCard(incomingCard);
  const playedNorm = normalizeCard(playedCard, declaredAs);
  if (incomingNorm.color === "ORANGE") {
    return {
      isValid: false,
      error: "Cartas de saque laranjas n\xE3o s\xE3o cartas de rali diretas."
    };
  }
  if (incomingNorm.type === "DEF_UBT_CORINGA") {
    if (!incomingNorm.declaredAs) {
      return {
        isValid: false,
        error: "Carta recebida (DEF_UBT_CORINGA) n\xE3o possui declara\xE7\xE3o v\xE1lida."
      };
    }
    if (!["DEF_CURTA", "DEF_NEUTRA", "DEF_LOB"].includes(incomingNorm.declaredAs)) {
      return {
        isValid: false,
        error: `Declara\xE7\xE3o "${incomingNorm.declaredAs}" \xE9 inv\xE1lida para a carta recebida DEF_UBT_CORINGA.`
      };
    }
  }
  if (incomingNorm.type === "GOLPE_UBT_CORINGA") {
    if (!incomingNorm.declaredAs) {
      return {
        isValid: false,
        error: "Carta recebida (GOLPE_UBT_CORINGA) n\xE3o possui declara\xE7\xE3o v\xE1lida."
      };
    }
    const declDef = CARDS_CATALOG[incomingNorm.declaredAs];
    if (!declDef || declDef.color !== "GREEN" || declDef.isWildcard) {
      return {
        isValid: false,
        error: `Declara\xE7\xE3o "${incomingNorm.declaredAs}" \xE9 inv\xE1lida para a carta recebida GOLPE_UBT_CORINGA.`
      };
    }
  }
  let requiredResponse;
  try {
    requiredResponse = getRequiredResponse(incomingCard, incomingNorm.declaredAs);
  } catch (err) {
    return {
      isValid: false,
      error: err instanceof Error ? err.message : "N\xE3o foi poss\xEDvel determinar a resposta exigida para a carta recebida."
    };
  }
  const incomingIsAttack = isAttackShot(incomingCard, incomingNorm.declaredAs);
  if (incomingIsAttack || requiredResponse === "DEFESAS") {
    if (playedNorm.color === "GREEN") {
      return {
        isValid: false,
        error: "Golpes de ataque acelerado n\xE3o podem ser defendidos com cartas verdes da m\xE3o. \xC9 obrigat\xF3rio puxar do Monte Azul."
      };
    }
    if (playedNorm.color === "ORANGE") {
      return {
        isValid: false,
        error: "Cartas de saque laranjas n\xE3o podem ser jogadas para defender ataques."
      };
    }
    if (playedNorm.color !== "BLUE") {
      return {
        isValid: false,
        error: "Ataques s\xF3 podem ser defendidos com cartas do Monte Azul."
      };
    }
    if (playedNorm.type === "DEF_UBT_CORINGA") {
      if (!playedNorm.declaredAs) {
        return {
          isValid: false,
          error: "DEF_UBT_CORINGA exige declara\xE7\xE3o (DEF_CURTA, DEF_NEUTRA ou DEF_LOB)."
        };
      }
      if (!["DEF_CURTA", "DEF_NEUTRA", "DEF_LOB"].includes(playedNorm.declaredAs)) {
        return {
          isValid: false,
          error: `Declara\xE7\xE3o "${playedNorm.declaredAs}" \xE9 inv\xE1lida para DEF_UBT_CORINGA. Permitidas: DEF_CURTA, DEF_NEUTRA, DEF_LOB.`
        };
      }
      return { isValid: true };
    }
    if (["DEF_CURTA", "DEF_NEUTRA", "DEF_LOB"].includes(playedNorm.type)) {
      return { isValid: true };
    }
    return {
      isValid: false,
      error: `Carta de defesa azul desconhecida: "${playedNorm.type}".`
    };
  }
  if (playedNorm.color === "BLUE") {
    return {
      isValid: false,
      error: "Cartas de defesa azul s\xF3 podem ser utilizadas contra ataques ou ap\xF3s o saque."
    };
  }
  if (playedNorm.color === "ORANGE") {
    return {
      isValid: false,
      error: "Cartas de saque laranjas n\xE3o podem ser jogadas durante o rali."
    };
  }
  if (playedNorm.color !== "GREEN") {
    return {
      isValid: false,
      error: "Apenas cartas verdes de rali podem ser jogadas."
    };
  }
  if (playedNorm.type === "GOLPE_UBT_CORINGA") {
    if (!playedNorm.declaredAs) {
      return {
        isValid: false,
        error: "GOLPE_UBT_CORINGA exige declara\xE7\xE3o do golpe executado."
      };
    }
    const allowed = RESPONSE_GROUPS[requiredResponse].allowedCards;
    if (!allowed.includes(playedNorm.declaredAs)) {
      return {
        isValid: false,
        error: `Declara\xE7\xE3o "${playedNorm.declaredAs}" n\xE3o \xE9 compat\xEDvel com a exig\xEAncia "${requiredResponse}". Golpes v\xE1lidos: ${allowed.join(", ")}.`
      };
    }
    return { isValid: true };
  }
  if (playedNorm.belongsToGroups.includes(requiredResponse)) {
    return { isValid: true };
  }
  return {
    isValid: false,
    error: `Carta "${playedNorm.name}" (${playedNorm.type}) n\xE3o satisfaz a exig\xEAncia "${requiredResponse}". Exige uma das cartas: ${RESPONSE_GROUPS[requiredResponse].allowedCards.join(", ")}.`
  };
}
function getValidDeclarationsForResponse(requiredResponse) {
  if (requiredResponse === "DEFESAS") {
    return [];
  }
  const group = RESPONSE_GROUPS[requiredResponse];
  return group ? [...group.allowedCards] : [];
}
function getValidBlueWildcardDeclarations() {
  return ["DEF_CURTA", "DEF_NEUTRA", "DEF_LOB"];
}

// src/engine/scoreEngine.ts
function getNextTieBreakServer(currentServer, prevTotalPoints) {
  const wasS1 = Math.floor((prevTotalPoints + 1) / 2) % 2 === 0;
  const s1 = wasS1 ? currentServer : currentServer === "PLAYER" ? "AI" : "PLAYER";
  const s2 = s1 === "PLAYER" ? "AI" : "PLAYER";
  const nextTotalPoints = prevTotalPoints + 1;
  const isNextS1 = Math.floor((nextTotalPoints + 1) / 2) % 2 === 0;
  return isNextS1 ? s1 : s2;
}
function createInitialScore(mode, initialServer = "PLAYER") {
  const nextGameServer = initialServer === "PLAYER" ? "AI" : "PLAYER";
  return {
    matchFormat: mode,
    playerGames: 0,
    aiGames: 0,
    playerPoints: 0,
    aiPoints: 0,
    isDeuce: false,
    isNoAdPoint: false,
    isTieBreak: false,
    playerTieBreakPoints: 0,
    aiTieBreakPoints: 0,
    currentServer: initialServer,
    nextGameServer,
    setWinner: null,
    matchWinner: null,
    completedSets: []
  };
}
function awardPoint(currentScore, winner) {
  if (currentScore.matchWinner !== null) {
    return {
      nextScore: {
        ...currentScore,
        completedSets: currentScore.completedSets.map((s) => ({ ...s }))
      },
      matchWonBy: currentScore.matchWinner,
      setWonBy: currentScore.setWinner ?? currentScore.matchWinner,
      isTieBreak: currentScore.isTieBreak,
      isNoAdPoint: currentScore.isNoAdPoint
    };
  }
  if (currentScore.isTieBreak) {
    const nextPlayerTB = winner === "PLAYER" ? currentScore.playerTieBreakPoints + 1 : currentScore.playerTieBreakPoints;
    const nextAiTB = winner === "AI" ? currentScore.aiTieBreakPoints + 1 : currentScore.aiTieBreakPoints;
    const winnerTB = winner === "PLAYER" ? nextPlayerTB : nextAiTB;
    const opponentTB = winner === "PLAYER" ? nextAiTB : nextPlayerTB;
    const isTieBreakWon = winnerTB >= 7 && winnerTB - opponentTB >= 2;
    if (isTieBreakWon) {
      const newPlayerGames2 = winner === "PLAYER" ? currentScore.playerGames + 1 : currentScore.playerGames;
      const newAiGames2 = winner === "AI" ? currentScore.aiGames + 1 : currentScore.aiGames;
      const completedSets = [
        ...currentScore.completedSets.map((s) => ({ ...s })),
        { playerGames: newPlayerGames2, aiGames: newAiGames2 }
      ];
      const nextScore3 = {
        ...currentScore,
        playerGames: newPlayerGames2,
        aiGames: newAiGames2,
        playerPoints: 0,
        aiPoints: 0,
        isDeuce: false,
        isNoAdPoint: false,
        isTieBreak: false,
        playerTieBreakPoints: nextPlayerTB,
        aiTieBreakPoints: nextAiTB,
        setWinner: winner,
        matchWinner: winner,
        completedSets
      };
      return {
        nextScore: nextScore3,
        gameWonBy: winner,
        setWonBy: winner,
        matchWonBy: winner,
        isTieBreak: false,
        isNoAdPoint: false
      };
    }
    const prevTotalPoints = currentScore.playerTieBreakPoints + currentScore.aiTieBreakPoints;
    const nextServer = getNextTieBreakServer(
      currentScore.currentServer,
      prevTotalPoints
    );
    const nextScore2 = {
      ...currentScore,
      playerTieBreakPoints: nextPlayerTB,
      aiTieBreakPoints: nextAiTB,
      currentServer: nextServer,
      completedSets: currentScore.completedSets.map((s) => ({ ...s }))
    };
    return {
      nextScore: nextScore2,
      isTieBreak: true,
      isNoAdPoint: false
    };
  }
  const pP = currentScore.playerPoints;
  const aP = currentScore.aiPoints;
  const winnerPoints = winner === "PLAYER" ? pP : aP;
  if (winnerPoints < 40) {
    const nextWinnerPoints = winnerPoints === 0 ? 15 : winnerPoints === 15 ? 30 : 40;
    const nextPlayerPoints = winner === "PLAYER" ? nextWinnerPoints : pP;
    const nextAiPoints = winner === "AI" ? nextWinnerPoints : aP;
    const isDeuce = nextPlayerPoints === 40 && nextAiPoints === 40;
    const isNoAdPoint = isDeuce;
    const nextScore2 = {
      ...currentScore,
      playerPoints: nextPlayerPoints,
      aiPoints: nextAiPoints,
      isDeuce,
      isNoAdPoint,
      completedSets: currentScore.completedSets.map((s) => ({ ...s }))
    };
    return {
      nextScore: nextScore2,
      isTieBreak: false,
      isNoAdPoint
    };
  }
  const newPlayerGames = winner === "PLAYER" ? currentScore.playerGames + 1 : currentScore.playerGames;
  const newAiGames = winner === "AI" ? currentScore.aiGames + 1 : currentScore.aiGames;
  const winnerGames = winner === "PLAYER" ? newPlayerGames : newAiGames;
  const opponentGames = winner === "PLAYER" ? newAiGames : newPlayerGames;
  const nextCurrentServer = currentScore.nextGameServer;
  const nextScheduledServer = currentScore.currentServer;
  const format = currentScore.matchFormat;
  if (format === "FAST_1_GAME") {
    const completedSets = [
      ...currentScore.completedSets.map((s) => ({ ...s })),
      { playerGames: newPlayerGames, aiGames: newAiGames }
    ];
    const nextScore2 = {
      ...currentScore,
      playerGames: newPlayerGames,
      aiGames: newAiGames,
      playerPoints: 0,
      aiPoints: 0,
      isDeuce: false,
      isNoAdPoint: false,
      isTieBreak: false,
      currentServer: nextCurrentServer,
      nextGameServer: nextScheduledServer,
      setWinner: winner,
      matchWinner: winner,
      completedSets
    };
    return {
      nextScore: nextScore2,
      gameWonBy: winner,
      setWonBy: winner,
      matchWonBy: winner,
      isTieBreak: false,
      isNoAdPoint: false
    };
  }
  const targetGames = format === "SHORT_SET_4" ? 4 : 6;
  const setWon = winnerGames >= targetGames && winnerGames - opponentGames >= 2;
  const tieBreakReached = newPlayerGames === targetGames && newAiGames === targetGames;
  if (setWon) {
    const completedSets = [
      ...currentScore.completedSets.map((s) => ({ ...s })),
      { playerGames: newPlayerGames, aiGames: newAiGames }
    ];
    const nextScore2 = {
      ...currentScore,
      playerGames: newPlayerGames,
      aiGames: newAiGames,
      playerPoints: 0,
      aiPoints: 0,
      isDeuce: false,
      isNoAdPoint: false,
      isTieBreak: false,
      currentServer: nextCurrentServer,
      nextGameServer: nextScheduledServer,
      setWinner: winner,
      matchWinner: winner,
      completedSets
    };
    return {
      nextScore: nextScore2,
      gameWonBy: winner,
      setWonBy: winner,
      matchWonBy: winner,
      isTieBreak: false,
      isNoAdPoint: false
    };
  }
  if (tieBreakReached) {
    const nextScore2 = {
      ...currentScore,
      playerGames: newPlayerGames,
      aiGames: newAiGames,
      playerPoints: 0,
      aiPoints: 0,
      isDeuce: false,
      isNoAdPoint: false,
      isTieBreak: true,
      playerTieBreakPoints: 0,
      aiTieBreakPoints: 0,
      currentServer: nextCurrentServer,
      nextGameServer: nextScheduledServer,
      completedSets: currentScore.completedSets.map((s) => ({ ...s }))
    };
    return {
      nextScore: nextScore2,
      gameWonBy: winner,
      isTieBreak: true,
      isNoAdPoint: false
    };
  }
  const nextScore = {
    ...currentScore,
    playerGames: newPlayerGames,
    aiGames: newAiGames,
    playerPoints: 0,
    aiPoints: 0,
    isDeuce: false,
    isNoAdPoint: false,
    isTieBreak: false,
    currentServer: nextCurrentServer,
    nextGameServer: nextScheduledServer,
    completedSets: currentScore.completedSets.map((s) => ({ ...s }))
  };
  return {
    nextScore,
    gameWonBy: winner,
    isTieBreak: false,
    isNoAdPoint: false
  };
}
var addPoint = awardPoint;
function formatScore(score) {
  if (score.matchWinner !== null) {
    const setsStr = score.completedSets.map((s) => `${s.playerGames}-${s.aiGames}`).join(", ");
    const displaySets = setsStr ? ` (${setsStr})` : ` (${score.playerGames}-${score.aiGames})`;
    return `Fim de Partida | Vit\xF3ria de ${score.matchWinner}${displaySets}`;
  }
  if (score.isTieBreak) {
    return `Tie-Break: ${score.playerTieBreakPoints}-${score.aiTieBreakPoints} | Games: ${score.playerGames}-${score.aiGames} | Saque: ${score.currentServer}`;
  }
  if (score.isNoAdPoint || score.isDeuce) {
    return `Pontos: 40-40 (Ponto Decisivo / No-Ad) | Games: ${score.playerGames}-${score.aiGames} | Saque: ${score.currentServer}`;
  }
  return `Pontos: ${score.playerPoints}-${score.aiPoints} | Games: ${score.playerGames}-${score.aiGames} | Saque: ${score.currentServer}`;
}
function formatPoints(score) {
  if (score.isTieBreak) {
    return `TB ${score.playerTieBreakPoints}-${score.aiTieBreakPoints}`;
  }
  if (score.isNoAdPoint || score.isDeuce) {
    return "40-40 (Ponto Decisivo)";
  }
  return `${score.playerPoints}-${score.aiPoints}`;
}
function formatGames(score) {
  return `${score.playerGames}-${score.aiGames}`;
}

// src/engine/aiController.ts
var INITIAL_GROUP_COUNTS = Object.freeze({
  BANDEJAS: 6,
  VOLEIOS: 6,
  DEFESAS: 8,
  FUNDO: 10
});
function createAIHistoryTracker() {
  return {
    playerServeFrequency: { 1: 0, 2: 0, 3: 0 },
    playerReceiveFrequency: { 1: 0, 2: 0, 3: 0 },
    playerDiscardedGroupsInPoint: {
      BANDEJAS: 0,
      VOLEIOS: 0,
      DEFESAS: 0,
      FUNDO: 0
    },
    consecutiveSameServeCount: 0,
    serveHistory: [],
    lastServeZone: null,
    totalServesRecorded: 0,
    discardedCardsInPoint: [],
    discardedCardsInMatch: [],
    cardDiscardsInPoint: {}
  };
}
function recordPlayerServe(tracker, zone) {
  if (!Number.isInteger(zone) || zone < 1 || zone > 3) {
    throw new Error(
      `[aiController] Zona de saque inv\xE1lida: ${zone}. Deve ser 1, 2 ou 3.`
    );
  }
  const serveZone = zone;
  const currentCount = tracker.playerServeFrequency?.[serveZone] || 0;
  const isConsecutive = tracker.lastServeZone === serveZone;
  const newConsecutive = isConsecutive ? (tracker.consecutiveSameServeCount || 0) + 1 : 1;
  const currentHistory = tracker.serveHistory || [];
  const totalServes = (tracker.totalServesRecorded || currentHistory.length) + 1;
  return {
    ...tracker,
    playerServeFrequency: {
      ...tracker.playerServeFrequency || { 1: 0, 2: 0, 3: 0 },
      [serveZone]: currentCount + 1
    },
    consecutiveSameServeCount: newConsecutive,
    lastServeZone: serveZone,
    serveHistory: [...currentHistory, serveZone],
    totalServesRecorded: totalServes
  };
}
function recordPlayerReceive(tracker, zones) {
  if (!Array.isArray(zones) || zones.length !== 2 || zones[0] === zones[1] || zones.some((z) => !Number.isInteger(z) || z < 1 || z > 3)) {
    throw new Error(
      `[aiController] Zonas de recep\xE7\xE3o inv\xE1lidas: [${zones}]. Devem ser 2 n\xFAmeros distintos entre 1 e 3.`
    );
  }
  const newFreq = { ...tracker.playerReceiveFrequency || { 1: 0, 2: 0, 3: 0 } };
  newFreq[zones[0]] = (newFreq[zones[0]] || 0) + 1;
  newFreq[zones[1]] = (newFreq[zones[1]] || 0) + 1;
  return {
    ...tracker,
    playerReceiveFrequency: newFreq
  };
}
function recordDiscardedCard(tracker, card) {
  const cardType = typeof card === "object" && card !== null && "definition" in card ? card.definition.type : card;
  const def = CARDS_CATALOG[cardType];
  if (!def) {
    throw new Error(`[aiController] Unknown card type: "${cardType}"`);
  }
  if (def.color === "ORANGE") {
    return tracker;
  }
  const updatedGroups = {
    ...tracker.playerDiscardedGroupsInPoint || {
      BANDEJAS: 0,
      VOLEIOS: 0,
      DEFESAS: 0,
      FUNDO: 0
    }
  };
  if (cardType !== "GOLPE_UBT_CORINGA") {
    for (const group of def.belongsToGroups) {
      updatedGroups[group] = (updatedGroups[group] || 0) + 1;
    }
  }
  const currentPointDiscards = tracker.discardedCardsInPoint || [];
  const currentMatchDiscards = tracker.discardedCardsInMatch || [];
  const currentCardCounts = { ...tracker.cardDiscardsInPoint || {} };
  currentCardCounts[cardType] = (currentCardCounts[cardType] || 0) + 1;
  return {
    ...tracker,
    playerDiscardedGroupsInPoint: updatedGroups,
    discardedCardsInPoint: [...currentPointDiscards, cardType],
    discardedCardsInMatch: [...currentMatchDiscards, cardType],
    cardDiscardsInPoint: currentCardCounts
  };
}
function getRemainingCardsByGroup(tracker) {
  const discards = tracker.playerDiscardedGroupsInPoint || {
    BANDEJAS: 0,
    VOLEIOS: 0,
    DEFESAS: 0,
    FUNDO: 0
  };
  return {
    BANDEJAS: Math.max(0, INITIAL_GROUP_COUNTS.BANDEJAS - (discards.BANDEJAS || 0)),
    VOLEIOS: Math.max(0, INITIAL_GROUP_COUNTS.VOLEIOS - (discards.VOLEIOS || 0)),
    DEFESAS: Math.max(0, INITIAL_GROUP_COUNTS.DEFESAS - (discards.DEFESAS || 0)),
    FUNDO: Math.max(0, INITIAL_GROUP_COUNTS.FUNDO - (discards.FUNDO || 0))
  };
}
function getScarcestResponseGroup(tracker) {
  const remaining = getRemainingCardsByGroup(tracker);
  if (remaining.DEFESAS === 0) {
    return "DEFESAS";
  }
  const remBandejas = remaining.BANDEJAS;
  const remVoleios = remaining.VOLEIOS;
  const remFundo = remaining.FUNDO;
  const minGreen = Math.min(remBandejas, remVoleios, remFundo);
  if (remBandejas === minGreen) {
    return "BANDEJAS";
  }
  if (remVoleios === minGreen) {
    return "VOLEIOS";
  }
  return "FUNDO";
}
function resetPointDiscards(tracker) {
  return {
    ...tracker,
    playerDiscardedGroupsInPoint: {
      BANDEJAS: 0,
      VOLEIOS: 0,
      DEFESAS: 0,
      FUNDO: 0
    },
    discardedCardsInPoint: [],
    cardDiscardsInPoint: {}
  };
}
function getServeProbabilities(tracker) {
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
    3: f3 / total
  };
}
function getMostFrequentServeZone(tracker) {
  const f1 = tracker.playerServeFrequency?.[1] || 0;
  const f2 = tracker.playerServeFrequency?.[2] || 0;
  const f3 = tracker.playerServeFrequency?.[3] || 0;
  const total = f1 + f2 + f3;
  if (total === 0) {
    return null;
  }
  const maxVal = Math.max(f1, f2, f3);
  const candidates = [];
  if (f1 === maxVal) candidates.push(1);
  if (f2 === maxVal) candidates.push(2);
  if (f3 === maxVal) candidates.push(3);
  if (candidates.length === 1) {
    return candidates[0];
  }
  const history = tracker.serveHistory || [];
  for (let i = history.length - 1; i >= 0; i--) {
    const zone = history[i];
    if (candidates.includes(zone)) {
      return zone;
    }
  }
  if (candidates.includes(2)) return 2;
  if (candidates.includes(1)) return 1;
  return candidates[0];
}
function getTopTwoReceiveZones(tracker) {
  const primary = getMostFrequentServeZone(tracker);
  if (primary === null) {
    return [1, 2];
  }
  const remaining = [1, 2, 3].filter((z) => z !== primary);
  remaining.sort((a, b) => {
    const diff = (tracker.playerServeFrequency?.[b] || 0) - (tracker.playerServeFrequency?.[a] || 0);
    if (diff !== 0) return diff;
    if (b === 2) return 1;
    if (a === 2) return -1;
    return a - b;
  });
  const secondary = remaining[0];
  return [
    Math.min(primary, secondary),
    Math.max(primary, secondary)
  ];
}
function getLeastCoveredReceiveZone(tracker) {
  const f1 = tracker.playerReceiveFrequency?.[1] || 0;
  const f2 = tracker.playerReceiveFrequency?.[2] || 0;
  const f3 = tracker.playerReceiveFrequency?.[3] || 0;
  const minVal = Math.min(f1, f2, f3);
  const candidates = [];
  if (f1 === minVal) candidates.push(1);
  if (f2 === minVal) candidates.push(2);
  if (f3 === minVal) candidates.push(3);
  if (candidates.includes(1)) return 1;
  if (candidates.includes(3)) return 3;
  return candidates[0];
}
function chooseServeZone(difficulty, history, rng = Math.random) {
  const allZones = [1, 2, 3];
  if (difficulty === "EASY") {
    return allZones[Math.floor(rng() * allZones.length)];
  }
  if (difficulty === "MEDIUM") {
    if (history && history.consecutiveSameServeCount >= 2 && history.lastServeZone) {
      const alternativeZones = allZones.filter((z) => z !== history.lastServeZone);
      return alternativeZones[Math.floor(rng() * alternativeZones.length)];
    }
    return allZones[Math.floor(rng() * allZones.length)];
  }
  if (history) {
    const totalReceives = (history.playerReceiveFrequency?.[1] || 0) + (history.playerReceiveFrequency?.[2] || 0) + (history.playerReceiveFrequency?.[3] || 0);
    if (totalReceives > 0) {
      const leastCovered = getLeastCoveredReceiveZone(history);
      if (rng() < 0.75) {
        return leastCovered;
      }
    }
  }
  return allZones[Math.floor(rng() * allZones.length)];
}
function chooseReceiveZones(difficulty, history, rng = Math.random) {
  const allPairs = [
    [1, 2],
    [1, 3],
    [2, 3]
  ];
  if (difficulty === "EASY") {
    return allPairs[Math.floor(rng() * allPairs.length)];
  }
  if (difficulty === "MEDIUM") {
    return rng() < 0.5 ? [1, 2] : [2, 3];
  }
  if (history) {
    const totalServes = (history.playerServeFrequency?.[1] || 0) + (history.playerServeFrequency?.[2] || 0) + (history.playerServeFrequency?.[3] || 0);
    if (totalServes > 0) {
      return getTopTwoReceiveZones(history);
    }
  }
  return rng() < 0.5 ? [1, 2] : [2, 3];
}
function chooseBlueDefenseDeclaration(difficulty, history, rng = Math.random) {
  if (difficulty === "EASY") {
    const options = ["DEF_CURTA", "DEF_NEUTRA", "DEF_LOB"];
    return options[Math.floor(rng() * options.length)];
  }
  if (difficulty === "MEDIUM" || !history) {
    return rng() < 0.5 ? "DEF_CURTA" : "DEF_NEUTRA";
  }
  const discardedBandejas = history.playerDiscardedGroupsInPoint?.BANDEJAS ?? 0;
  const discardedVoleios = history.playerDiscardedGroupsInPoint?.VOLEIOS ?? 0;
  if (discardedBandejas > discardedVoleios) {
    return "DEF_CURTA";
  } else if (discardedVoleios > discardedBandejas) {
    return "DEF_NEUTRA";
  }
  return rng() < 0.5 ? "DEF_CURTA" : "DEF_NEUTRA";
}
var chooseBlueWildcardDeclaration = chooseBlueDefenseDeclaration;
function chooseGreenWildcardDeclaration(requiredResponse, difficulty, _hand = [], history, rng = Math.random) {
  const allowed = getValidDeclarationsForResponse(requiredResponse);
  if (allowed.length === 0) {
    throw new Error(
      `[aiController] Nenhuma declara\xE7\xE3o v\xE1lida para a exig\xEAncia "${requiredResponse}".`
    );
  }
  if (difficulty === "EASY") {
    return allowed[Math.floor(rng() * allowed.length)];
  }
  if (requiredResponse === "FUNDO") {
    return "SMASH";
  }
  if (requiredResponse === "VOLEIOS") {
    return "VOLEIO_ACELERADO";
  }
  if (difficulty === "MEDIUM" || !history) {
    return rng() < 0.5 ? "BANDEJA_CURTA" : "BANDEJA_LOB_CHUTADO";
  }
  const discardedBandejas = history.playerDiscardedGroupsInPoint?.BANDEJAS ?? 0;
  const discardedVoleios = history.playerDiscardedGroupsInPoint?.VOLEIOS ?? 0;
  if (discardedBandejas >= discardedVoleios) {
    return "BANDEJA_CURTA";
  }
  return "BANDEJA_LOB_CHUTADO";
}
function chooseRallyPlay(hand, incomingCard, difficulty, history, rng = Math.random) {
  const declaredAs = typeof incomingCard === "object" && incomingCard !== null && "declaredAs" in incomingCard ? incomingCard.declaredAs : void 0;
  const legalMoves = getLegalMoves(hand, incomingCard, declaredAs);
  if (legalMoves.requiresBlueDefense) {
    return {
      action: "DRAW_BLUE_DEFENSE",
      confidence: 1,
      reasoning: "Sob ataque: compra obrigat\xF3ria de defesa do Monte Azul."
    };
  }
  if (!hand || hand.length === 0 || legalMoves.playableCards.length === 0) {
    return {
      action: "DIG",
      confidence: legalMoves.canDig ? 1 : 0.5,
      reasoning: "Sem cartas compat\xEDveis na m\xE3o: cavar no Monte Verde."
    };
  }
  const playable = legalMoves.playableCards;
  if (difficulty === "EASY") {
    const chosen = playable[Math.floor(rng() * playable.length)];
    if (chosen.definition.type === "GOLPE_UBT_CORINGA") {
      const required = getRequiredResponse(incomingCard, declaredAs);
      const decl = chooseGreenWildcardDeclaration(required, "EASY", hand, history, rng);
      return {
        action: "PLAY_WILDCARD",
        cardInstance: chosen,
        declaredCardType: decl,
        confidence: 0.5,
        reasoning: "F\xE1cil: Coringa verde jogado aleatoriamente."
      };
    }
    return {
      action: "PLAY_HAND",
      cardInstance: chosen,
      confidence: 0.5,
      reasoning: "F\xE1cil: Carta jogada aleatoriamente."
    };
  }
  const normalPlayable = playable.filter((c) => c.definition.type !== "GOLPE_UBT_CORINGA");
  const coringaPlayable = playable.filter((c) => c.definition.type === "GOLPE_UBT_CORINGA");
  if (normalPlayable.length === 0 && coringaPlayable.length > 0) {
    const required = getRequiredResponse(incomingCard, declaredAs);
    const decl = chooseGreenWildcardDeclaration(required, difficulty, hand, history, rng);
    return {
      action: "PLAY_WILDCARD",
      cardInstance: coringaPlayable[0],
      declaredCardType: decl,
      confidence: difficulty === "HARD" ? 0.95 : 0.9,
      reasoning: `${difficulty}: Coringa verde utilizado por ser a \xFAnica salva\xE7\xE3o na m\xE3o.`
    };
  }
  if (difficulty === "MEDIUM") {
    const attackCards = normalPlayable.filter((c) => c.definition.isAttack);
    if (attackCards.length > 0) {
      const chosen2 = attackCards[Math.floor(rng() * attackCards.length)];
      return {
        action: "PLAY_HAND",
        cardInstance: chosen2,
        confidence: 0.85,
        reasoning: "M\xE9dio: Priorizou ataque para for\xE7ar Monte Azul do oponente."
      };
    }
    const restrictiveCards = normalPlayable.filter(
      (c) => c.definition.requiredResponse === "BANDEJAS" || c.definition.requiredResponse === "VOLEIOS"
    );
    if (restrictiveCards.length > 0) {
      const chosen2 = restrictiveCards[Math.floor(rng() * restrictiveCards.length)];
      return {
        action: "PLAY_HAND",
        cardInstance: chosen2,
        confidence: 0.75,
        reasoning: "M\xE9dio: Enviou bola curta/m\xE9dia para restringir op\xE7\xF5es do advers\xE1rio."
      };
    }
    const chosen = normalPlayable[Math.floor(rng() * normalPlayable.length)];
    return {
      action: "PLAY_HAND",
      cardInstance: chosen,
      confidence: 0.65,
      reasoning: "M\xE9dio: Jogou bola de fundo."
    };
  }
  const targetScarcity = history ? getScarcestResponseGroup(history) : null;
  const remaining = history ? getRemainingCardsByGroup(history) : null;
  const scoredCards = normalPlayable.map((card) => {
    let score = 0;
    const req = card.definition.requiredResponse;
    if (card.definition.isAttack) {
      score += 50;
      if (remaining && remaining.DEFESAS <= 3) {
        score += 30;
      }
      if (remaining && remaining.DEFESAS === 0) {
        score += 100;
      }
    }
    if (targetScarcity && req === targetScarcity) {
      score += 35;
    }
    if (req === "BANDEJAS") {
      score += 20;
      const discards = history?.playerDiscardedGroupsInPoint?.BANDEJAS ?? 0;
      score += discards * 15;
    } else if (req === "VOLEIOS") {
      score += 20;
      const discards = history?.playerDiscardedGroupsInPoint?.VOLEIOS ?? 0;
      score += discards * 15;
    } else if (req === "FUNDO") {
      score -= 15;
      const discards = history?.playerDiscardedGroupsInPoint?.FUNDO ?? 0;
      score += discards * 10;
    }
    return { card, score };
  });
  scoredCards.sort((a, b) => b.score - a.score);
  const topScore = scoredCards[0].score;
  const topTied = scoredCards.filter((sc) => sc.score === topScore);
  const bestChoice = topTied[Math.floor(rng() * topTied.length)].card;
  return {
    action: "PLAY_HAND",
    cardInstance: bestChoice,
    confidence: 0.95,
    reasoning: `Dif\xEDcil: Escolha t\xE1tica otimizada (score: ${topScore}) explorando contagem e press\xE3o.`
  };
}
function getAIDelay(difficulty, rng = Math.random) {
  switch (difficulty) {
    case "EASY":
      return Math.floor(600 + rng() * 200);
    // 600..800ms
    case "MEDIUM":
      return Math.floor(800 + rng() * 200);
    // 800..1000ms
    case "HARD":
      return Math.floor(900 + rng() * 300);
    // 900..1200ms
    default:
      return 800;
  }
}
async function simulateAIThinking(difficulty, rng = Math.random) {
  const delayMs = getAIDelay(difficulty, rng);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return delayMs;
}
function chooseServe(handOrDiff, diff, history, rng) {
  const difficulty = typeof handOrDiff === "string" ? handOrDiff : diff ?? "MEDIUM";
  return chooseServeZone(difficulty, history, rng);
}
function chooseReceive(handOrDiff, diff, history, rng) {
  const difficulty = typeof handOrDiff === "string" ? handOrDiff : diff ?? "MEDIUM";
  return chooseReceiveZones(difficulty, history, rng);
}

// src/engine/match.ts
var DEFAULT_LABELS = {
  PLAYER: "VOC\xCA",
  AI: "M\xC1QUINA (IA)"
};
function buildFreshPlayerState(id, rng = Math.random) {
  const { greenDeck, blueDeck } = createDecks(id, rng);
  const { hand, remainingDeck } = dealInitialHand(greenDeck, 6);
  const orangeCards = createOrangeDeck(id);
  return {
    id,
    hand,
    greenDeck: remainingDeck,
    blueDeck,
    discardedCards: [],
    orangeCards,
    digAttemptsThisTurn: 0
  };
}
function createInitialRallyState(server) {
  return {
    lastPlayedCard: null,
    declaredCard: null,
    requiredResponse: null,
    currentTurnPlayer: server,
    rallyLength: 0,
    steps: [],
    pendingWildcard: void 0
  };
}
function createInitialServeDuel(server) {
  const receiver = server === "PLAYER" ? "AI" : "PLAYER";
  return {
    server,
    receiver,
    serverPick: null,
    receiverPicks: [],
    isResolved: false
  };
}
function createInitialStats() {
  return {
    acesPlayer: 0,
    acesAI: 0,
    winnersPlayer: 0,
    winnersAI: 0,
    longestRally: 0,
    totalBlueDefenses: 0
  };
}
function createEngineMatch(format = "SHORT_SET_4", initialServer = "PLAYER", rng = Math.random) {
  const initialScore = createInitialScore(format, initialServer);
  const playerState = buildFreshPlayerState("PLAYER", rng);
  const aiState = buildFreshPlayerState("AI", rng);
  return {
    phase: "SERVE_SELECTION",
    matchFormat: format,
    initialServer,
    score: initialScore,
    player: playerState,
    ai: aiState,
    rally: createInitialRallyState(initialServer),
    serveDuel: createInitialServeDuel(initialServer),
    aiTracker: createAIHistoryTracker(),
    lastServeResult: null,
    activeDigResult: null,
    activeDigPlayer: null,
    pointWinner: null,
    pointEndReason: null,
    pointBannerMessage: null,
    lastEvent: null,
    actionLog: ["\u{1F3BE} Partida iniciada! Escolha a zona de saque."],
    stats: createInitialStats(),
    nextPointReady: { PLAYER: false, AI: false },
    rematchReady: { PLAYER: false, AI: false }
  };
}
function getSeatState(state, seat) {
  return seat === "PLAYER" ? state.player : state.ai;
}
function setSeatState(state, seat, playerState) {
  return seat === "PLAYER" ? { ...state, player: playerState } : { ...state, ai: playerState };
}
function finalizeEnginePoint(state, winner, reason, labels = DEFAULT_LABELS, customBanner) {
  const awardRes = awardPoint(state.score, winner);
  const newStats = { ...state.stats };
  if (reason === "ACE") {
    if (winner === "PLAYER") newStats.acesPlayer += 1;
    else newStats.acesAI += 1;
  } else {
    if (winner === "PLAYER") newStats.winnersPlayer += 1;
    else newStats.winnersAI += 1;
  }
  const winnerLabel = labels[winner];
  let reasonLabel = "";
  switch (reason) {
    case "ACE":
      reasonLabel = `\u{1F4A5} ACE! Saque indefens\xE1vel \u2014 Ponto para ${winnerLabel}!`;
      break;
    case "ATTACK_WINNER":
      reasonLabel = `\u{1F525} WINNER DE ATAQUE! Monte Azul esgotado \u2014 Ponto para ${winnerLabel}!`;
      break;
    case "DIG_FAILED_SECOND_CARD":
      reasonLabel = `\u274C Falha na 2\xAA tentativa de Cava\xE7\xE3o \u2014 Ponto para ${winnerLabel}!`;
      break;
    case "DIG_FAILED_DECK_EMPTY":
      reasonLabel = `\u274C Monte Verde esgotado na Cava\xE7\xE3o \u2014 Ponto para ${winnerLabel}!`;
      break;
    case "FORFEIT":
      reasonLabel = `\u{1F3F3}\uFE0F W.O. por desconex\xE3o \u2014 Vit\xF3ria para ${winnerLabel}!`;
      break;
    default:
      reasonLabel = `\u{1F3BE} Ponto para ${winnerLabel}!`;
  }
  const banner = customBanner || reasonLabel;
  const nextPhase = reason === "FORFEIT" || awardRes.matchWonBy ? "MATCH_OVER" : "POINT_ENDED";
  const nextScore = reason === "FORFEIT" ? { ...awardRes.nextScore, matchWinner: winner, setWinner: winner } : awardRes.nextScore;
  const pointEvent = {
    type: "EVENT_POINT_SCORED",
    payload: { winner, reason, newScore: nextScore }
  };
  const events = [pointEvent];
  if (awardRes.gameWonBy) {
    events.push({
      type: "EVENT_GAME_WON",
      payload: {
        winner,
        newGamesCount: winner === "PLAYER" ? nextScore.playerGames : nextScore.aiGames
      }
    });
  }
  if (awardRes.setWonBy) {
    events.push({ type: "EVENT_SET_WON", payload: { winner } });
  }
  if (awardRes.matchWonBy || reason === "FORFEIT") {
    events.push({ type: "EVENT_MATCH_WON", payload: { winner } });
  }
  return {
    state: {
      ...state,
      phase: nextPhase,
      score: nextScore,
      pointWinner: winner,
      pointEndReason: reason,
      pointBannerMessage: banner,
      activeDigResult: null,
      activeDigPlayer: null,
      stats: newStats,
      lastEvent: pointEvent,
      actionLog: [banner, ...state.actionLog].slice(0, 30),
      nextPointReady: { PLAYER: false, AI: false },
      rematchReady: { PLAYER: false, AI: false }
    },
    events
  };
}
function applyBlueDefenseToState(state, drawnCard, defender, declaredAs, updatedBlueDeck, isServeDefense, labels) {
  const opponent = defender === "PLAYER" ? "AI" : "PLAYER";
  const cardWithDecl = declaredAs ? { ...drawnCard, declaredAs } : drawnCard;
  const reqAfter = getRequiredResponse(cardWithDecl, declaredAs);
  const nextRallyLength = state.rally.rallyLength + 1;
  const step = {
    stepNumber: state.rally.steps.length + 1,
    player: defender,
    actionType: isServeDefense ? "SERVE_DEFENSE" : "DRAW_DEFENSE",
    card: cardWithDecl,
    declaredAs,
    requiredResponseBefore: state.rally.requiredResponse,
    requiredResponseAfter: reqAfter,
    descriptionText: `${labels[defender]} defendeu com ${drawnCard.definition.name}${declaredAs ? ` (${CARDS_CATALOG[declaredAs]?.name || declaredAs})` : ""} -> Exige ${reqAfter}`,
    timestamp: Date.now()
  };
  const defenderState = getSeatState(state, defender);
  const updatedDefenderState = {
    ...defenderState,
    blueDeck: updatedBlueDeck,
    discardedCards: [...defenderState.discardedCards, cardWithDecl],
    digAttemptsThisTurn: 0
  };
  const nextTracker = defender === "PLAYER" ? recordDiscardedCard(state.aiTracker, drawnCard) : state.aiTracker;
  const nextPhase = opponent === "AI" ? "RALLY_AI_TURN" : "RALLY_PLAYER_TURN";
  const defEvent = {
    type: "EVENT_DEFENSE_DRAWN",
    payload: { defender, cardType: drawnCard.definition.type }
  };
  let nextState = setSeatState(state, defender, updatedDefenderState);
  nextState = {
    ...nextState,
    phase: nextPhase,
    aiTracker: nextTracker,
    stats: {
      ...state.stats,
      longestRally: Math.max(state.stats.longestRally, nextRallyLength),
      totalBlueDefenses: state.stats.totalBlueDefenses + 1
    },
    rally: {
      lastPlayedCard: cardWithDecl,
      declaredCard: declaredAs ? {
        ...cardWithDecl,
        definition: CARDS_CATALOG[declaredAs]
      } : null,
      requiredResponse: reqAfter,
      currentTurnPlayer: opponent,
      rallyLength: nextRallyLength,
      steps: [...state.rally.steps, step],
      pendingWildcard: void 0
    },
    lastEvent: defEvent,
    actionLog: [step.descriptionText, ...state.actionLog].slice(0, 30)
  };
  return { state: nextState, events: [defEvent, { type: "EVENT_SAND_BOUNCE" }] };
}
function applyGreenCardToState(state, card, actor, declaredAs, updatedHand, updatedGreenDeck, labels) {
  const opponent = actor === "PLAYER" ? "AI" : "PLAYER";
  const cardWithDecl = declaredAs ? { ...card, declaredAs } : card;
  const reqAfter = getRequiredResponse(cardWithDecl, declaredAs);
  const attack = isAttackShot(cardWithDecl, declaredAs);
  const nextRallyLength = state.rally.rallyLength + 1;
  const step = {
    stepNumber: state.rally.steps.length + 1,
    player: actor,
    actionType: "PLAY_CARD",
    card: cardWithDecl,
    declaredAs,
    requiredResponseBefore: state.rally.requiredResponse,
    requiredResponseAfter: reqAfter,
    descriptionText: `${labels[actor]} jogou ${card.definition.name}${declaredAs ? ` (como ${CARDS_CATALOG[declaredAs]?.name || declaredAs})` : ""} -> Exige ${reqAfter}`,
    timestamp: Date.now()
  };
  const actorState = getSeatState(state, actor);
  const updatedActorState = {
    ...actorState,
    hand: updatedHand,
    greenDeck: updatedGreenDeck,
    discardedCards: [...actorState.discardedCards, cardWithDecl],
    digAttemptsThisTurn: 0
  };
  const nextTracker = actor === "PLAYER" ? recordDiscardedCard(state.aiTracker, cardWithDecl) : state.aiTracker;
  let nextPhase;
  if (opponent === "AI") {
    nextPhase = attack ? "RALLY_DEFENSE_DRAW" : "RALLY_AI_TURN";
  } else {
    nextPhase = attack ? "RALLY_DEFENSE_DRAW" : "RALLY_PLAYER_TURN";
  }
  const hitEvent = {
    type: "EVENT_BALL_HIT",
    payload: { cardType: card.definition.type, isAttack: attack }
  };
  let nextState = setSeatState(state, actor, updatedActorState);
  nextState = {
    ...nextState,
    phase: nextPhase,
    aiTracker: nextTracker,
    activeDigResult: null,
    activeDigPlayer: null,
    stats: {
      ...state.stats,
      longestRally: Math.max(state.stats.longestRally, nextRallyLength)
    },
    rally: {
      lastPlayedCard: cardWithDecl,
      declaredCard: declaredAs ? {
        ...cardWithDecl,
        definition: CARDS_CATALOG[declaredAs]
      } : null,
      requiredResponse: reqAfter,
      currentTurnPlayer: opponent,
      rallyLength: nextRallyLength,
      steps: [...state.rally.steps, step],
      pendingWildcard: void 0
    },
    lastEvent: hitEvent,
    actionLog: [step.descriptionText, ...state.actionLog].slice(0, 30)
  };
  return { state: nextState, events: [hitEvent] };
}
function startNewEnginePoint(state, rng = Math.random) {
  if (state.score.matchWinner !== null) {
    return { ...state, phase: "MATCH_OVER" };
  }
  const server = state.score.currentServer;
  const playerState = buildFreshPlayerState("PLAYER", rng);
  const aiState = buildFreshPlayerState("AI", rng);
  const nextTracker = resetPointDiscards(state.aiTracker);
  return {
    ...state,
    phase: "SERVE_SELECTION",
    player: playerState,
    ai: aiState,
    rally: createInitialRallyState(server),
    serveDuel: createInitialServeDuel(server),
    aiTracker: nextTracker,
    lastServeResult: null,
    activeDigResult: null,
    activeDigPlayer: null,
    pointWinner: null,
    pointEndReason: null,
    pointBannerMessage: null,
    nextPointReady: { PLAYER: false, AI: false }
  };
}
function applyEngineAction(state, seat, action, rng = Math.random, labels = DEFAULT_LABELS) {
  const opponent = seat === "PLAYER" ? "AI" : "PLAYER";
  if (action.type === "FORFEIT") {
    const res = finalizeEnginePoint(state, opponent, "FORFEIT", labels);
    return { ok: true, state: res.state, events: res.events };
  }
  switch (action.type) {
    case "SERVE_PICK": {
      if (state.phase !== "SERVE_SELECTION") {
        return { ok: false, error: "INVALID_PHASE", state, events: [] };
      }
      if (state.serveDuel.server !== seat) {
        return { ok: false, error: "NOT_SERVER", state, events: [] };
      }
      if (![1, 2, 3].includes(action.zone)) {
        return { ok: false, error: "INVALID_ZONE", state, events: [] };
      }
      const nextDuel = {
        ...state.serveDuel,
        serverPick: action.zone
      };
      let nextTracker = seat === "PLAYER" ? recordPlayerServe(state.aiTracker, action.zone) : state.aiTracker;
      if (nextDuel.receiverPicks.length === 2) {
        const serveResult = resolveServe(
          action.zone,
          nextDuel.receiverPicks,
          nextDuel.server,
          nextDuel.receiver
        );
        const events = [
          { type: "EVENT_BALL_HIT", payload: { cardType: "SAQUE_1", isAttack: false } }
        ];
        if (serveResult.isAce) {
          events.push({
            type: "EVENT_ACE",
            payload: { server: nextDuel.server, zone: action.zone }
          });
        }
        return {
          ok: true,
          state: {
            ...state,
            phase: "SERVE_REVEAL",
            aiTracker: nextTracker,
            lastServeResult: serveResult,
            serveDuel: { ...nextDuel, isResolved: true }
          },
          events
        };
      }
      return {
        ok: true,
        state: {
          ...state,
          aiTracker: nextTracker,
          serveDuel: nextDuel
        },
        events: []
      };
    }
    case "RECEIVE_PICK": {
      if (state.phase !== "SERVE_SELECTION") {
        return { ok: false, error: "INVALID_PHASE", state, events: [] };
      }
      if (state.serveDuel.receiver !== seat) {
        return { ok: false, error: "NOT_RECEIVER", state, events: [] };
      }
      if (!Array.isArray(action.zones) || action.zones.length !== 2 || action.zones[0] === action.zones[1] || !action.zones.every((z) => [1, 2, 3].includes(z))) {
        return { ok: false, error: "INVALID_RECEIVE_ZONES", state, events: [] };
      }
      const nextDuel = {
        ...state.serveDuel,
        receiverPicks: [action.zones[0], action.zones[1]]
      };
      let nextTracker = seat === "PLAYER" ? recordPlayerReceive(state.aiTracker, [action.zones[0], action.zones[1]]) : state.aiTracker;
      if (nextDuel.serverPick !== null) {
        const serveResult = resolveServe(
          nextDuel.serverPick,
          nextDuel.receiverPicks,
          nextDuel.server,
          nextDuel.receiver
        );
        const events = [
          { type: "EVENT_BALL_HIT", payload: { cardType: "SAQUE_1", isAttack: false } }
        ];
        if (serveResult.isAce) {
          events.push({
            type: "EVENT_ACE",
            payload: { server: nextDuel.server, zone: nextDuel.serverPick }
          });
        }
        return {
          ok: true,
          state: {
            ...state,
            phase: "SERVE_REVEAL",
            aiTracker: nextTracker,
            lastServeResult: serveResult,
            serveDuel: { ...nextDuel, isResolved: true }
          },
          events
        };
      }
      return {
        ok: true,
        state: {
          ...state,
          aiTracker: nextTracker,
          serveDuel: nextDuel
        },
        events: []
      };
    }
    case "COMPLETE_SERVE_REVEAL": {
      if (state.phase !== "SERVE_REVEAL" || !state.lastServeResult) {
        return { ok: false, error: "INVALID_PHASE", state, events: [] };
      }
      const serveResult = state.lastServeResult;
      if (serveResult.isAce) {
        const res2 = finalizeEnginePoint(state, serveResult.server, "ACE", labels);
        return { ok: true, state: res2.state, events: res2.events };
      }
      const receiver = serveResult.receiver;
      const server = serveResult.server;
      const receiverState = getSeatState(state, receiver);
      const defDraw = drawDefenseCard(receiverState.blueDeck, receiver, server);
      if (defDraw.isExhausted || !defDraw.drawnCard) {
        const res2 = finalizeEnginePoint(state, server, "ATTACK_WINNER", labels);
        return { ok: true, state: res2.state, events: res2.events };
      }
      const drawnCard = defDraw.drawnCard;
      if (drawnCard.definition.type === "DEF_UBT_CORINGA") {
        const updatedReceiver = {
          ...receiverState,
          blueDeck: defDraw.updatedBlueDeck
        };
        const nextState = setSeatState(state, receiver, updatedReceiver);
        return {
          ok: true,
          state: {
            ...nextState,
            phase: "WILDCARD_DECLARING",
            rally: {
              ...state.rally,
              currentTurnPlayer: receiver,
              pendingWildcard: {
                card: drawnCard,
                player: receiver,
                allowedDeclarations: getValidBlueWildcardDeclarations()
              }
            }
          },
          events: [
            {
              type: "EVENT_DEFENSE_DRAWN",
              payload: { defender: receiver, cardType: drawnCard.definition.type }
            }
          ]
        };
      }
      const res = applyBlueDefenseToState(
        state,
        drawnCard,
        receiver,
        void 0,
        defDraw.updatedBlueDeck,
        true,
        labels
      );
      return { ok: true, state: res.state, events: res.events };
    }
    case "PLAY_CARD": {
      if (state.rally.currentTurnPlayer !== seat) {
        return { ok: false, error: "NOT_YOUR_TURN", state, events: [] };
      }
      if (state.phase !== "RALLY_PLAYER_TURN" && state.phase !== "RALLY_AI_TURN" && state.phase !== "WILDCARD_DECLARING") {
        return { ok: false, error: "INVALID_PHASE", state, events: [] };
      }
      const actorState = getSeatState(state, seat);
      const card = actorState.hand.find((c) => c.instanceId === action.instanceId);
      if (!card) {
        return { ok: false, error: "CARD_NOT_IN_HAND", state, events: [] };
      }
      if (card.definition.type === "GOLPE_UBT_CORINGA" && !action.declaredAs) {
        if (!state.rally.requiredResponse || state.rally.requiredResponse === "DEFESAS") {
          return { ok: false, error: "ILLEGAL_WILDCARD", state, events: [] };
        }
        const allowed = getValidDeclarationsForResponse(state.rally.requiredResponse);
        return {
          ok: true,
          state: {
            ...state,
            phase: "WILDCARD_DECLARING",
            rally: {
              ...state.rally,
              pendingWildcard: {
                card,
                player: seat,
                allowedDeclarations: allowed
              }
            }
          },
          events: []
        };
      }
      if (!state.rally.lastPlayedCard) {
        return { ok: false, error: "NO_CARD_ON_COURT", state, events: [] };
      }
      const validation = validateTurnPlay(
        state.rally.lastPlayedCard,
        card,
        action.declaredAs
      );
      if (!validation.isValid) {
        return { ok: false, error: "ILLEGAL_CARD_PLAY", state, events: [] };
      }
      const updatedHand = actorState.hand.filter(
        (c) => c.instanceId !== action.instanceId
      );
      const res = applyGreenCardToState(
        state,
        card,
        seat,
        action.declaredAs,
        updatedHand,
        actorState.greenDeck,
        labels
      );
      return { ok: true, state: res.state, events: res.events };
    }
    case "DECLARE_WILDCARD": {
      const pending = state.rally.pendingWildcard;
      if (state.phase !== "WILDCARD_DECLARING" || !pending) {
        return { ok: false, error: "NO_PENDING_WILDCARD", state, events: [] };
      }
      if (pending.player !== seat) {
        return { ok: false, error: "NOT_YOUR_TURN", state, events: [] };
      }
      if (!pending.allowedDeclarations.includes(action.declaredType)) {
        return { ok: false, error: "INVALID_DECLARATION", state, events: [] };
      }
      const actorState = getSeatState(state, seat);
      const { card } = pending;
      if (card.definition.type === "DEF_UBT_CORINGA") {
        const res2 = applyBlueDefenseToState(
          state,
          card,
          seat,
          action.declaredType,
          actorState.blueDeck,
          state.rally.rallyLength === 0,
          labels
        );
        return { ok: true, state: res2.state, events: res2.events };
      }
      const updatedHand = actorState.hand.filter(
        (c) => c.instanceId !== card.instanceId
      );
      const res = applyGreenCardToState(
        state,
        card,
        seat,
        action.declaredType,
        updatedHand,
        actorState.greenDeck,
        labels
      );
      return { ok: true, state: res.state, events: res.events };
    }
    case "CANCEL_WILDCARD": {
      const pending = state.rally.pendingWildcard;
      if (state.phase !== "WILDCARD_DECLARING" || !pending || pending.player !== seat) {
        return { ok: false, error: "INVALID_ACTION", state, events: [] };
      }
      if (pending.card.definition.type === "DEF_UBT_CORINGA") {
        return { ok: false, error: "CANNOT_CANCEL_BLUE_WILDCARD", state, events: [] };
      }
      return {
        ok: true,
        state: {
          ...state,
          phase: seat === "AI" ? "RALLY_AI_TURN" : "RALLY_PLAYER_TURN",
          rally: {
            ...state.rally,
            pendingWildcard: void 0
          }
        },
        events: []
      };
    }
    case "DEFEND_BLUE": {
      if (state.rally.currentTurnPlayer !== seat || state.rally.requiredResponse !== "DEFESAS") {
        return { ok: false, error: "NOT_UNDER_ATTACK", state, events: [] };
      }
      const defenderState = getSeatState(state, seat);
      const defDraw = drawDefenseCard(defenderState.blueDeck, seat, opponent);
      if (defDraw.isExhausted || !defDraw.drawnCard) {
        const res2 = finalizeEnginePoint(state, opponent, "ATTACK_WINNER", labels);
        return { ok: true, state: res2.state, events: res2.events };
      }
      const drawnCard = defDraw.drawnCard;
      if (drawnCard.definition.type === "DEF_UBT_CORINGA") {
        const updatedDefender = {
          ...defenderState,
          blueDeck: defDraw.updatedBlueDeck
        };
        const nextState = setSeatState(state, seat, updatedDefender);
        return {
          ok: true,
          state: {
            ...nextState,
            phase: "WILDCARD_DECLARING",
            rally: {
              ...state.rally,
              pendingWildcard: {
                card: drawnCard,
                player: seat,
                allowedDeclarations: getValidBlueWildcardDeclarations()
              }
            }
          },
          events: [
            {
              type: "EVENT_DEFENSE_DRAWN",
              payload: { defender: seat, cardType: drawnCard.definition.type }
            }
          ]
        };
      }
      const res = applyBlueDefenseToState(
        state,
        drawnCard,
        seat,
        void 0,
        defDraw.updatedBlueDeck,
        false,
        labels
      );
      return { ok: true, state: res.state, events: res.events };
    }
    case "DIG_CARD": {
      if (state.rally.currentTurnPlayer !== seat) {
        return { ok: false, error: "NOT_YOUR_TURN", state, events: [] };
      }
      if (!state.rally.requiredResponse || state.rally.requiredResponse === "DEFESAS") {
        return { ok: false, error: "CANNOT_DIG_NOW", state, events: [] };
      }
      const actorState = getSeatState(state, seat);
      const nextAttempt = actorState.digAttemptsThisTurn === 0 ? 1 : 2;
      try {
        const digRes = digSingleStep(
          actorState.hand,
          actorState.greenDeck,
          state.rally.requiredResponse,
          nextAttempt
        );
        const updatedActor = {
          ...actorState,
          hand: digRes.updatedHand,
          greenDeck: digRes.updatedGreenDeck,
          digAttemptsThisTurn: nextAttempt
        };
        const nextState = setSeatState(state, seat, updatedActor);
        const events = [];
        if (digRes.isValid && digRes.drawnCard) {
          events.push({
            type: "EVENT_DIG_SUCCESS",
            payload: {
              player: seat,
              cardType: digRes.drawnCard.definition.type,
              attempt: nextAttempt
            }
          });
        } else if (digRes.pointLost) {
          events.push({
            type: "EVENT_DIG_FAILED",
            payload: { player: seat, attempt: nextAttempt }
          });
        }
        return {
          ok: true,
          state: {
            ...nextState,
            phase: "RALLY_DIGGING",
            activeDigResult: digRes,
            activeDigPlayer: seat
          },
          events
        };
      } catch {
        return { ok: false, error: "HAS_VALID_CARD_IN_HAND", state, events: [] };
      }
    }
    case "PLAY_DRAWN_DIG_CARD": {
      if (state.phase !== "RALLY_DIGGING" || state.activeDigPlayer !== seat || !state.activeDigResult?.drawnCard || !state.activeDigResult.isValid || !state.rally.requiredResponse) {
        return { ok: false, error: "NO_VALID_DIG_CARD", state, events: [] };
      }
      const card = state.activeDigResult.drawnCard;
      const actorState = getSeatState(state, seat);
      if (card.definition.type === "GOLPE_UBT_CORINGA") {
        const allowed = getValidDeclarationsForResponse(state.rally.requiredResponse);
        return {
          ok: true,
          state: {
            ...state,
            phase: "WILDCARD_DECLARING",
            activeDigResult: null,
            activeDigPlayer: null,
            rally: {
              ...state.rally,
              pendingWildcard: {
                card,
                player: seat,
                allowedDeclarations: allowed
              }
            }
          },
          events: []
        };
      }
      const res = applyGreenCardToState(
        state,
        card,
        seat,
        void 0,
        actorState.hand,
        actorState.greenDeck,
        labels
      );
      return { ok: true, state: res.state, events: res.events };
    }
    case "CONCEDE_DIG_FAILURE": {
      if (state.phase !== "RALLY_DIGGING" || state.activeDigPlayer !== seat || !state.activeDigResult?.pointLost) {
        return { ok: false, error: "INVALID_ACTION", state, events: [] };
      }
      const reason = state.activeDigResult.reason === "GREEN_DECK_EMPTY" ? "DIG_FAILED_DECK_EMPTY" : "DIG_FAILED_SECOND_CARD";
      const res = finalizeEnginePoint(state, opponent, reason, labels);
      return { ok: true, state: res.state, events: res.events };
    }
    case "NEXT_POINT": {
      if (state.phase !== "POINT_ENDED") {
        return { ok: false, error: "INVALID_PHASE", state, events: [] };
      }
      const updatedReady = { ...state.nextPointReady, [seat]: true };
      if (updatedReady.PLAYER && updatedReady.AI) {
        return {
          ok: true,
          state: startNewEnginePoint({ ...state, nextPointReady: updatedReady }, rng),
          events: []
        };
      }
      return {
        ok: true,
        state: { ...state, nextPointReady: updatedReady },
        events: []
      };
    }
    case "REMATCH": {
      if (state.phase !== "MATCH_OVER") {
        return { ok: false, error: "INVALID_PHASE", state, events: [] };
      }
      const updatedRematch = { ...state.rematchReady, [seat]: true };
      if (updatedRematch.PLAYER && updatedRematch.AI) {
        const nextInitialServer = state.initialServer === "PLAYER" ? "AI" : "PLAYER";
        return {
          ok: true,
          state: createEngineMatch(state.matchFormat, nextInitialServer, rng),
          events: []
        };
      }
      return {
        ok: true,
        state: { ...state, rematchReady: updatedRematch },
        events: []
      };
    }
    default:
      return { ok: false, error: "UNKNOWN_ACTION", state, events: [] };
  }
}
function chooseAutoTimeoutAction(state, seat, rng = Math.random) {
  if (state.phase === "SERVE_SELECTION") {
    if (state.serveDuel.server === seat && state.serveDuel.serverPick === null) {
      const zones = [1, 2, 3];
      const pick = zones[Math.floor(rng() * 3)] || 1;
      return { type: "SERVE_PICK", zone: pick };
    }
    if (state.serveDuel.receiver === seat && state.serveDuel.receiverPicks.length !== 2) {
      const pairs = [
        [1, 2],
        [1, 3],
        [2, 3]
      ];
      const pick = pairs[Math.floor(rng() * 3)] || [1, 2];
      return { type: "RECEIVE_PICK", zones: pick };
    }
    return null;
  }
  if (state.phase === "WILDCARD_DECLARING" && state.rally.pendingWildcard?.player === seat) {
    const allowed = state.rally.pendingWildcard.allowedDeclarations;
    if (allowed.length > 0) {
      return { type: "DECLARE_WILDCARD", declaredType: allowed[0] };
    }
  }
  if (state.phase === "RALLY_DIGGING" && state.activeDigPlayer === seat && state.activeDigResult) {
    if (state.activeDigResult.isValid && state.activeDigResult.drawnCard) {
      return { type: "PLAY_DRAWN_DIG_CARD" };
    }
    if (state.activeDigResult.canDigAgain) {
      return { type: "DIG_CARD" };
    }
    return { type: "CONCEDE_DIG_FAILURE" };
  }
  if ((state.phase === "RALLY_PLAYER_TURN" || state.phase === "RALLY_AI_TURN" || state.phase === "RALLY_DEFENSE_DRAW") && state.rally.currentTurnPlayer === seat && state.rally.lastPlayedCard) {
    const seatState = getSeatState(state, seat);
    const legal = getLegalMoves(
      seatState.hand,
      state.rally.lastPlayedCard,
      state.rally.lastPlayedCard.declaredAs
    );
    if (legal.requiresBlueDefense) {
      return { type: "DEFEND_BLUE" };
    }
    if (legal.playableCards.length > 0) {
      const first = legal.playableCards[0];
      if (first.definition.type === "GOLPE_UBT_CORINGA" && state.rally.requiredResponse) {
        const decls = getValidDeclarationsForResponse(state.rally.requiredResponse);
        return {
          type: "PLAY_CARD",
          instanceId: first.instanceId,
          declaredAs: decls[0]
        };
      }
      return { type: "PLAY_CARD", instanceId: first.instanceId };
    }
    if (legal.canDig) {
      return { type: "DIG_CARD" };
    }
  }
  return null;
}

// src/engine/viewProjection.ts
var REDACTED_CARD_DEF = CARDS_CATALOG.BANDEJA_CURTA;
function createRedactedCardList(count, owner, prefix) {
  return Array.from({ length: count }, (_, idx) => ({
    instanceId: `redacted_${prefix}_${idx}`,
    cardId: "redacted",
    definition: REDACTED_CARD_DEF,
    owner
  }));
}
function mapSeatPerspective(id, viewerSeat) {
  if (viewerSeat === "PLAYER") return id;
  return id === "PLAYER" ? "AI" : "PLAYER";
}
function mapCardOwner(card, viewerSeat) {
  return {
    ...card,
    owner: mapSeatPerspective(card.owner, viewerSeat)
  };
}
function projectMatchView(state, viewerSeat) {
  const selfRaw = viewerSeat === "PLAYER" ? state.player : state.ai;
  const oppRaw = viewerSeat === "PLAYER" ? state.ai : state.player;
  const projectedSelf = {
    id: "PLAYER",
    hand: selfRaw.hand.map((c) => mapCardOwner(c, viewerSeat)),
    greenDeck: createRedactedCardList(selfRaw.greenDeck.length, "PLAYER", "self_green"),
    blueDeck: createRedactedCardList(selfRaw.blueDeck.length, "PLAYER", "self_blue"),
    discardedCards: selfRaw.discardedCards.map((c) => mapCardOwner(c, viewerSeat)),
    orangeCards: selfRaw.orangeCards.map((c) => mapCardOwner(c, viewerSeat)),
    digAttemptsThisTurn: selfRaw.digAttemptsThisTurn
  };
  const projectedOpp = {
    id: "AI",
    hand: createRedactedCardList(oppRaw.hand.length, "AI", "opp_hand"),
    greenDeck: createRedactedCardList(oppRaw.greenDeck.length, "AI", "opp_green"),
    blueDeck: createRedactedCardList(oppRaw.blueDeck.length, "AI", "opp_blue"),
    discardedCards: oppRaw.discardedCards.map((c) => mapCardOwner(c, viewerSeat)),
    orangeCards: [],
    digAttemptsThisTurn: oppRaw.digAttemptsThisTurn
  };
  const s = state.score;
  const projectedScore = viewerSeat === "PLAYER" ? { ...s } : {
    ...s,
    playerGames: s.aiGames,
    aiGames: s.playerGames,
    playerPoints: s.aiPoints,
    aiPoints: s.playerPoints,
    playerTieBreakPoints: s.aiTieBreakPoints,
    aiTieBreakPoints: s.playerTieBreakPoints,
    currentServer: mapSeatPerspective(s.currentServer, viewerSeat),
    nextGameServer: mapSeatPerspective(s.nextGameServer, viewerSeat),
    setWinner: s.setWinner ? mapSeatPerspective(s.setWinner, viewerSeat) : null,
    matchWinner: s.matchWinner ? mapSeatPerspective(s.matchWinner, viewerSeat) : null,
    completedSets: s.completedSets.map((setItem) => ({
      playerGames: setItem.aiGames,
      aiGames: setItem.playerGames
    }))
  };
  const isViewerServer = state.serveDuel.server === viewerSeat;
  const serverReady = state.serveDuel.serverPick !== null;
  const receiverReady = state.serveDuel.receiverPicks.length === 2;
  const projectedServeDuel = {
    server: mapSeatPerspective(state.serveDuel.server, viewerSeat),
    receiver: mapSeatPerspective(state.serveDuel.receiver, viewerSeat),
    serverPick: state.serveDuel.isResolved || isViewerServer ? state.serveDuel.serverPick : null,
    receiverPicks: state.serveDuel.isResolved || !isViewerServer ? [...state.serveDuel.receiverPicks] : [],
    isResolved: state.serveDuel.isResolved,
    serverReady,
    receiverReady
  };
  const projectedServeResult = state.lastServeResult ? {
    ...state.lastServeResult,
    server: mapSeatPerspective(state.lastServeResult.server, viewerSeat),
    receiver: mapSeatPerspective(state.lastServeResult.receiver, viewerSeat),
    winningPlayer: state.lastServeResult.winningPlayer ? mapSeatPerspective(state.lastServeResult.winningPlayer, viewerSeat) : void 0
  } : null;
  const mappedTurn = mapSeatPerspective(state.rally.currentTurnPlayer, viewerSeat);
  const canSeePendingWildcard = state.rally.pendingWildcard?.player === viewerSeat;
  const projectedRally = {
    lastPlayedCard: state.rally.lastPlayedCard ? mapCardOwner(state.rally.lastPlayedCard, viewerSeat) : null,
    declaredCard: state.rally.declaredCard ? mapCardOwner(state.rally.declaredCard, viewerSeat) : null,
    requiredResponse: state.rally.requiredResponse,
    currentTurnPlayer: mappedTurn,
    rallyLength: state.rally.rallyLength,
    steps: state.rally.steps.map((step) => ({
      ...step,
      player: mapSeatPerspective(step.player, viewerSeat),
      card: mapCardOwner(step.card, viewerSeat)
    })),
    pendingWildcard: canSeePendingWildcard && state.rally.pendingWildcard ? {
      card: mapCardOwner(state.rally.pendingWildcard.card, viewerSeat),
      player: "PLAYER",
      allowedDeclarations: [...state.rally.pendingWildcard.allowedDeclarations]
    } : void 0
  };
  let projectedPhase = state.phase;
  if (state.phase === "RALLY_PLAYER_TURN" || state.phase === "RALLY_AI_TURN" || state.phase === "RALLY_DEFENSE_DRAW") {
    if (mappedTurn === "PLAYER") {
      projectedPhase = state.rally.requiredResponse === "DEFESAS" ? "RALLY_DEFENSE_DRAW" : "RALLY_PLAYER_TURN";
    } else {
      projectedPhase = "RALLY_AI_TURN";
    }
  } else if (state.phase === "WILDCARD_DECLARING") {
    projectedPhase = canSeePendingWildcard ? "WILDCARD_DECLARING" : "RALLY_AI_TURN";
  } else if (state.phase === "RALLY_DIGGING") {
    projectedPhase = state.activeDigPlayer === viewerSeat ? "RALLY_DIGGING" : "RALLY_AI_TURN";
  }
  const projectedDigResult = state.activeDigPlayer === viewerSeat && state.activeDigResult ? {
    ...state.activeDigResult,
    drawnCard: state.activeDigResult.drawnCard ? mapCardOwner(state.activeDigResult.drawnCard, viewerSeat) : null,
    updatedGreenDeck: createRedactedCardList(
      state.activeDigResult.updatedGreenDeck.length,
      "PLAYER",
      "dig_green"
    ),
    updatedHand: state.activeDigResult.updatedHand.map(
      (c) => mapCardOwner(c, viewerSeat)
    )
  } : null;
  const projectedStats = viewerSeat === "PLAYER" ? { ...state.stats } : {
    ...state.stats,
    acesPlayer: state.stats.acesAI,
    acesAI: state.stats.acesPlayer,
    winnersPlayer: state.stats.winnersAI,
    winnersAI: state.stats.winnersPlayer
  };
  const oppSeat = viewerSeat === "PLAYER" ? "AI" : "PLAYER";
  return {
    phase: projectedPhase,
    matchFormat: state.matchFormat,
    score: projectedScore,
    player: projectedSelf,
    ai: projectedOpp,
    rally: projectedRally,
    serveDuel: projectedServeDuel,
    lastServeResult: projectedServeResult,
    activeDigResult: projectedDigResult,
    pointWinner: state.pointWinner ? mapSeatPerspective(state.pointWinner, viewerSeat) : null,
    pointEndReason: state.pointEndReason,
    pointBannerMessage: state.pointBannerMessage,
    actionLog: [...state.actionLog],
    stats: projectedStats,
    selfNextPointReady: state.nextPointReady[viewerSeat],
    opponentNextPointReady: state.nextPointReady[oppSeat],
    selfRematchReady: state.rematchReady[viewerSeat],
    opponentRematchReady: state.rematchReady[oppSeat]
  };
}
function projectDomainEvent(event, viewerSeat) {
  switch (event.type) {
    case "EVENT_ACE":
      return {
        ...event,
        payload: {
          ...event.payload,
          server: mapSeatPerspective(event.payload.server, viewerSeat)
        }
      };
    case "EVENT_DEFENSE_DRAWN":
      return {
        ...event,
        payload: {
          ...event.payload,
          defender: mapSeatPerspective(event.payload.defender, viewerSeat)
        }
      };
    case "EVENT_DIG_SUCCESS":
      return {
        type: "EVENT_DIG_SUCCESS",
        payload: {
          ...event.payload,
          player: mapSeatPerspective(event.payload.player, viewerSeat)
        }
      };
    case "EVENT_DIG_FAILED":
      return {
        type: "EVENT_DIG_FAILED",
        payload: {
          ...event.payload,
          player: mapSeatPerspective(event.payload.player, viewerSeat)
        }
      };
    case "EVENT_POINT_SCORED":
      return {
        type: "EVENT_POINT_SCORED",
        payload: {
          ...event.payload,
          winner: mapSeatPerspective(event.payload.winner, viewerSeat)
        }
      };
    case "EVENT_GAME_WON":
      return {
        type: "EVENT_GAME_WON",
        payload: {
          ...event.payload,
          winner: mapSeatPerspective(event.payload.winner, viewerSeat)
        }
      };
    case "EVENT_SET_WON":
      return {
        type: "EVENT_SET_WON",
        payload: {
          winner: mapSeatPerspective(event.payload.winner, viewerSeat)
        }
      };
    case "EVENT_MATCH_WON":
      return {
        type: "EVENT_MATCH_WON",
        payload: {
          winner: mapSeatPerspective(event.payload.winner, viewerSeat)
        }
      };
    default:
      return event;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ALL_CARDS,
  CARDS_CATALOG,
  DECK_COMPOSITION,
  DEFAULT_LABELS,
  INITIAL_GROUP_COUNTS,
  PINK_SHEET_TRANSITIONS,
  RESPONSE_GROUPS,
  addPoint,
  applyEngineAction,
  awardPoint,
  buildFreshPlayerState,
  calculateAceProbability,
  chooseAutoTimeoutAction,
  chooseBlueDefenseDeclaration,
  chooseBlueWildcardDeclaration,
  chooseGreenWildcardDeclaration,
  chooseRallyPlay,
  chooseReceive,
  chooseReceiveZones,
  chooseServe,
  chooseServeZone,
  createAIHistoryTracker,
  createCardInstance,
  createDecks,
  createEngineMatch,
  createInitialDeckList,
  createInitialRallyState,
  createInitialScore,
  createInitialServeDuel,
  createInitialStats,
  createOrangeDeck,
  dealInitialHand,
  digCards,
  digSingleStep,
  drawDefenseCard,
  drawInitialHand,
  finalizeEnginePoint,
  formatGames,
  formatPoints,
  formatScore,
  getAIDelay,
  getAllCards,
  getAllPossibleReceiverPairs,
  getAllPossibleServeZones,
  getCardDefinition,
  getCardRequiredResponse,
  getCardsByColor,
  getCardsByRequiredResponse,
  getCardsSatisfyingResponse,
  getDeckComposition,
  getLeastCoveredReceiveZone,
  getLegalMoves,
  getLegalResponseTypes,
  getMostFrequentServeZone,
  getRemainingCardsByGroup,
  getRequiredResponse,
  getScarcestResponseGroup,
  getServeProbabilities,
  getTopTwoReceiveZones,
  getValidBlueWildcardDeclarations,
  getValidCardsInHand,
  getValidDeclarationsForResponse,
  getValidWildcardDeclarations,
  hasValidCardInHand,
  isAttackShot,
  isCardLegalForResponse,
  isValidDefenseDeclaration,
  isValidResponse,
  mapSeatPerspective,
  projectDomainEvent,
  projectMatchView,
  recordDiscardedCard,
  recordPlayerReceive,
  recordPlayerServe,
  resetPointDiscards,
  resolveServe,
  resolveServeAndDrawDefense,
  resolveServeExtended,
  shuffleDeck,
  simulateAIThinking,
  startNewEnginePoint,
  validateTurnPlay
});
