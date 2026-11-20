/**
 * src/engine/serveResolver.ts
 * Resolução do duelo de saque e recepção (Cartas Laranjas 1..3 no 1v1 e 1..5 no 2v2)
 * e integração com compra de defesa do Monte Azul.
 *
 * Módulo puro em TypeScript (zero dependências de React/DOM).
 */

import type {
  CardInstance,
  CardType,
  DefenseDrawResult,
  ExtendedServeNumber,
  PlayerId,
  ServeNumber,
  ServeResult,
} from './types';
import { drawDefenseCard } from './deckManager';

// ============================================================================
// 1. RESOLUÇÃO DE SAQUE 1V1 (ZONAS 1 A 3)
// ============================================================================

/**
 * Resolve o duelo de saque no modo individual (1 vs 1):
 * - Sacador escolhe secretamente 1 zona (1, 2 ou 3).
 * - Recebedor escolhe secretamente 2 zonas distintas (dentre 1, 2 e 3).
 *
 * Resolução:
 * - Se a zona do sacador NÃO está entre as opções do recebedor -> ACE! Sacador vence o ponto imediatamente.
 * - Se a zona do sacador ESTÁ entre as opções do recebedor -> DEFESA EFETUADA!
 *
 * @param serverZone Número escolhido pelo sacador (1, 2 ou 3)
 * @param receiverZones Array contendo as 2 opções escolhidas pelo recebedor
 * @param server Identificador do jogador que saca (padrão: 'PLAYER')
 * @param receiver Identificador do jogador que recebe (padrão: 'AI')
 */
export function resolveServe(
  serverZone: number,
  receiverZones: number[],
  server: PlayerId = 'PLAYER',
  receiver: PlayerId = 'AI'
): ServeResult {
  // Validação da zona do sacador
  if (!Number.isInteger(serverZone) || serverZone < 1 || serverZone > 3) {
    throw new Error(
      `[serveResolver] Zona de saque inválida: ${serverZone}. No modo 1v1, a zona do sacador deve ser um número inteiro entre 1 e 3.`
    );
  }

  // Validação das zonas do recebedor
  if (!Array.isArray(receiverZones)) {
    throw new Error(
      `[serveResolver] Zonas de recepção inválidas: esperado um array, recebido ${typeof receiverZones}.`
    );
  }

  if (receiverZones.length !== 2) {
    throw new Error(
      `[serveResolver] Quantidade de zonas de recepção inválida: ${receiverZones.length}. No modo 1v1, o recebedor deve escolher exatamente 2 zonas distintas.`
    );
  }

  const [z1, z2] = receiverZones;
  if (
    z1 === undefined ||
    z2 === undefined ||
    !Number.isInteger(z1) ||
    z1 < 1 ||
    z1 > 3 ||
    !Number.isInteger(z2) ||
    z2 < 1 ||
    z2 > 3
  ) {
    throw new Error(
      `[serveResolver] Zonas de recepção fora dos limites: [${receiverZones.join(', ')}]. Cada zona deve ser um número inteiro entre 1 e 3.`
    );
  }

  if (z1 === z2) {
    throw new Error(
      `[serveResolver] Zonas de recepção duplicadas: [${receiverZones.join(', ')}]. O recebedor deve escolher 2 zonas distintas.`
    );
  }

  const isCovered = receiverZones.includes(serverZone);

  if (!isCovered) {
    // ACE! Sacador pontua imediatamente
    return {
      isAce: true,
      defenseSuccess: false,
      server,
      receiver,
      serverPick: serverZone as ServeNumber,
      receiverPicks: receiverZones as ServeNumber[],
      winningPlayer: server,
    };
  }

  // Saque coberto: defesa efetuada, ponto continua
  return {
    isAce: false,
    defenseSuccess: true,
    server,
    receiver,
    serverPick: serverZone as ServeNumber,
    receiverPicks: receiverZones as ServeNumber[],
    winningPlayer: undefined,
  };
}

// ============================================================================
// 2. SUPORTE ESTENDIDO PARA DUPLAS (2V2 - ZONAS 1 A 5)
// ============================================================================

/**
 * Resolve o duelo de saque com suporte a 1v1 (zonas 1..3) ou 2v2 (zonas 1..5).
 */
export function resolveServeExtended(
  serverZone: number,
  receiverZones: number[],
  server: PlayerId = 'PLAYER',
  receiver: PlayerId = 'AI',
  mode: '1v1' | '2v2' = '1v1'
): ServeResult {
  const maxZone = mode === '1v1' ? 3 : 5;
  const requiredReceiverCount = mode === '1v1' ? 2 : 4;

  if (!Number.isInteger(serverZone) || serverZone < 1 || serverZone > maxZone) {
    throw new Error(
      `[serveResolver] Zona de saque inválida para o modo ${mode}: ${serverZone}. Deve ser entre 1 e ${maxZone}.`
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
      `[serveResolver] Zonas de recepção contêm duplicatas: [${receiverZones.join(', ')}].`
    );
  }

  for (const z of receiverZones) {
    if (!Number.isInteger(z) || z < 1 || z > maxZone) {
      throw new Error(
        `[serveResolver] Zona de recepção fora dos limites: ${z}. Deve ser entre 1 e ${maxZone}.`
      );
    }
  }

  const isCovered = receiverZones.includes(serverZone);

  return {
    isAce: !isCovered,
    defenseSuccess: isCovered,
    server,
    receiver,
    serverPick: serverZone as ServeNumber,
    receiverPicks: receiverZones as ServeNumber[],
    winningPlayer: !isCovered ? server : undefined,
  };
}

// ============================================================================
// 3. FLUXO INTEGRADO: SAQUE -> DEFESA DO MONTE AZUL
// ============================================================================

export interface ServeAndDefenseOutcome {
  serveResult: ServeResult;
  defenseResult: DefenseDrawResult | null;
}

/**
 * Executa a resolução do saque e, caso defendido, realiza a compra automática
 * da carta de defesa do Monte Azul do recebedor.
 *
 * @param serverZone Zona do sacador (1..3)
 * @param receiverZones Zonas do recebedor
 * @param blueDeck Monte Azul do recebedor
 * @param server Jogador que saca
 * @param receiver Jogador que recebe
 */
export function resolveServeAndDrawDefense(
  serverZone: number,
  receiverZones: number[],
  blueDeck: CardInstance[],
  server: PlayerId = 'PLAYER',
  receiver: PlayerId = 'AI'
): ServeAndDefenseOutcome {
  const serveResult = resolveServe(serverZone, receiverZones, server, receiver);

  if (serveResult.isAce) {
    return {
      serveResult,
      defenseResult: null,
    };
  }

  // Saque defendido: recebedor puxa carta do Monte Azul
  const defenseResult = drawDefenseCard(blueDeck, receiver, server);

  return {
    serveResult,
    defenseResult,
  };
}

// ============================================================================
// 4. VALIDAÇÃO DE DECLARAÇÃO DO CORINGA AZUL
// ============================================================================

/**
 * Valida se a declaração feita pelo defensor para o Coringa Azul (DEF_UBT_CORINGA) é legal.
 * Conforme o GDD § 2.2 e § 4.A, o jogador deve declarar estritamente:
 * - DEF_CURTA (exige BANDEJAS)
 * - DEF_NEUTRA (exige VOLEIOS)
 * - DEF_LOB (exige FUNDO)
 */
export function isValidDefenseDeclaration(declaredType: CardType): boolean {
  return declaredType === 'DEF_CURTA' || declaredType === 'DEF_NEUTRA' || declaredType === 'DEF_LOB';
}

// ============================================================================
// 5. HELPERS DE PROBABILIDADE E COMBINATÓRIA
// ============================================================================

/**
 * Retorna todas as opções possíveis de saque para o modo especificado.
 */
export function getAllPossibleServeZones(mode?: '1v1'): ServeNumber[];
export function getAllPossibleServeZones(mode: '2v2'): ExtendedServeNumber[];
export function getAllPossibleServeZones(mode: '1v1' | '2v2' = '1v1'): ExtendedServeNumber[] {
  return mode === '1v1' ? [1, 2, 3] : [1, 2, 3, 4, 5];
}

/**
 * Retorna todos os 3 pares possíveis de recepção no modo 1v1:
 * [[1, 2], [1, 3], [2, 3]]
 */
export function getAllPossibleReceiverPairs(): [ServeNumber, ServeNumber][] {
  return [
    [1, 2],
    [1, 3],
    [2, 3],
  ];
}

/**
 * Retorna a probabilidade teórica de Ace:
 * - 1v1: 1 / 3 = ~33.33%
 * - 2v2: 1 / 5 = 20.00%
 */
export function calculateAceProbability(mode: '1v1' | '2v2' = '1v1'): number {
  return mode === '1v1' ? 1 / 3 : 1 / 5;
}
