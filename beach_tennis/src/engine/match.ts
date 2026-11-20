/**
 * src/engine/match.ts
 * Motor puro e determinístico de partida 1v1 (sem React, sem Zustand, sem timers).
 * Usado tanto pelo cliente (modo vs IA) quanto pelo servidor WebSocket (modo Online 1v1).
 */

import type {
  AIHistoryTracker,
  CardInstance,
  CardType,
  DigResult,
  DomainEvent,
  MatchFormat,
  MatchPhase,
  PlayerId,
  PlayerState,
  PointEndReason,
  RallyState,
  RallyStep,
  RNG,
  ScoreState,
  ServeDuelState,
  ServeNumber,
  ServeResult,
} from './types';
import { CARDS_CATALOG } from './cardsCatalog';
import {
  createDecks,
  createOrangeDeck,
  dealInitialHand,
  digSingleStep,
  drawDefenseCard,
} from './deckManager';
import { resolveServe } from './serveResolver';
import {
  getLegalMoves,
  getRequiredResponse,
  getValidBlueWildcardDeclarations,
  getValidDeclarationsForResponse,
  isAttackShot,
  validateTurnPlay,
} from './rallyValidator';
import { awardPoint, createInitialScore } from './scoreEngine';
import {
  createAIHistoryTracker,
  recordDiscardedCard,
  recordPlayerReceive,
  recordPlayerServe,
  resetPointDiscards,
} from './aiController';

export interface EngineMatchStatistics {
  acesPlayer: number;
  acesAI: number;
  winnersPlayer: number;
  winnersAI: number;
  longestRally: number;
  totalBlueDefenses: number;
}

export interface PlayerLabels {
  PLAYER: string;
  AI: string;
}

export const DEFAULT_LABELS: PlayerLabels = {
  PLAYER: 'VOCÊ',
  AI: 'MÁQUINA (IA)',
};

export interface EngineMatchState {
  phase: MatchPhase;
  matchFormat: MatchFormat;
  initialServer: PlayerId;
  score: ScoreState;
  player: PlayerState;
  ai: PlayerState;
  rally: RallyState;
  serveDuel: ServeDuelState;
  aiTracker: AIHistoryTracker;
  lastServeResult: ServeResult | null;
  activeDigResult: DigResult | null;
  activeDigPlayer: PlayerId | null;
  pointWinner: PlayerId | null;
  pointEndReason: PointEndReason | null;
  pointBannerMessage: string | null;
  lastEvent: DomainEvent | null;
  actionLog: string[];
  stats: EngineMatchStatistics;
  nextPointReady: Record<PlayerId, boolean>;
  rematchReady: Record<PlayerId, boolean>;
}

export type OnlineAction =
  | { type: 'SERVE_PICK'; zone: ServeNumber }
  | { type: 'RECEIVE_PICK'; zones: [ServeNumber, ServeNumber] }
  | { type: 'COMPLETE_SERVE_REVEAL' }
  | { type: 'PLAY_CARD'; instanceId: string; declaredAs?: CardType }
  | { type: 'DECLARE_WILDCARD'; declaredType: CardType }
  | { type: 'CANCEL_WILDCARD' }
  | { type: 'DEFEND_BLUE' }
  | { type: 'DIG_CARD' }
  | { type: 'PLAY_DRAWN_DIG_CARD'; instanceId?: string }
  | { type: 'CONCEDE_DIG_FAILURE' }
  | { type: 'NEXT_POINT' }
  | { type: 'REMATCH' }
  | { type: 'FORFEIT' };

export interface ApplyActionResult {
  ok: boolean;
  error?: string;
  state: EngineMatchState;
  events: DomainEvent[];
}

export function buildFreshPlayerState(id: PlayerId, rng: RNG = Math.random): PlayerState {
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
    digAttemptsThisTurn: 0,
  };
}

export function createInitialRallyState(server: PlayerId): RallyState {
  return {
    lastPlayedCard: null,
    declaredCard: null,
    requiredResponse: null,
    currentTurnPlayer: server,
    rallyLength: 0,
    steps: [],
    pendingWildcard: undefined,
  };
}

export function createInitialServeDuel(server: PlayerId): ServeDuelState {
  const receiver: PlayerId = server === 'PLAYER' ? 'AI' : 'PLAYER';
  return {
    server,
    receiver,
    serverPick: null,
    receiverPicks: [],
    isResolved: false,
  };
}

export function createInitialStats(): EngineMatchStatistics {
  return {
    acesPlayer: 0,
    acesAI: 0,
    winnersPlayer: 0,
    winnersAI: 0,
    longestRally: 0,
    totalBlueDefenses: 0,
  };
}

export function createEngineMatch(
  format: MatchFormat = 'SHORT_SET_4',
  initialServer: PlayerId = 'PLAYER',
  rng: RNG = Math.random
): EngineMatchState {
  const initialScore = createInitialScore(format, initialServer);
  const playerState = buildFreshPlayerState('PLAYER', rng);
  const aiState = buildFreshPlayerState('AI', rng);

  return {
    phase: 'SERVE_SELECTION',
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
    actionLog: ['🎾 Partida iniciada! Escolha a zona de saque.'],
    stats: createInitialStats(),
    nextPointReady: { PLAYER: false, AI: false },
    rematchReady: { PLAYER: false, AI: false },
  };
}

function getSeatState(state: EngineMatchState, seat: PlayerId): PlayerState {
  return seat === 'PLAYER' ? state.player : state.ai;
}

function setSeatState(
  state: EngineMatchState,
  seat: PlayerId,
  playerState: PlayerState
): EngineMatchState {
  return seat === 'PLAYER'
    ? { ...state, player: playerState }
    : { ...state, ai: playerState };
}

export function finalizeEnginePoint(
  state: EngineMatchState,
  winner: PlayerId,
  reason: PointEndReason,
  labels: PlayerLabels = DEFAULT_LABELS,
  customBanner?: string
): { state: EngineMatchState; events: DomainEvent[] } {
  const awardRes = awardPoint(state.score, winner);
  const newStats = { ...state.stats };
  if (reason === 'ACE') {
    if (winner === 'PLAYER') newStats.acesPlayer += 1;
    else newStats.acesAI += 1;
  } else {
    if (winner === 'PLAYER') newStats.winnersPlayer += 1;
    else newStats.winnersAI += 1;
  }

  const winnerLabel = labels[winner];
  let reasonLabel = '';
  switch (reason) {
    case 'ACE':
      reasonLabel = `💥 ACE! Saque indefensável — Ponto para ${winnerLabel}!`;
      break;
    case 'ATTACK_WINNER':
      reasonLabel = `🔥 WINNER DE ATAQUE! Monte Azul esgotado — Ponto para ${winnerLabel}!`;
      break;
    case 'DIG_FAILED_SECOND_CARD':
      reasonLabel = `❌ Falha na 2ª tentativa de Cavação — Ponto para ${winnerLabel}!`;
      break;
    case 'DIG_FAILED_DECK_EMPTY':
      reasonLabel = `❌ Monte Verde esgotado na Cavação — Ponto para ${winnerLabel}!`;
      break;
    case 'FORFEIT':
      reasonLabel = `🏳️ W.O. por desconexão — Vitória para ${winnerLabel}!`;
      break;
    default:
      reasonLabel = `🎾 Ponto para ${winnerLabel}!`;
  }

  const banner = customBanner || reasonLabel;
  const nextPhase: MatchPhase =
    reason === 'FORFEIT' || awardRes.matchWonBy ? 'MATCH_OVER' : 'POINT_ENDED';

  const nextScore: ScoreState =
    reason === 'FORFEIT'
      ? { ...awardRes.nextScore, matchWinner: winner, setWinner: winner }
      : awardRes.nextScore;

  const pointEvent: DomainEvent = {
    type: 'EVENT_POINT_SCORED',
    payload: { winner, reason, newScore: nextScore },
  };
  const events: DomainEvent[] = [pointEvent];
  if (awardRes.gameWonBy) {
    events.push({
      type: 'EVENT_GAME_WON',
      payload: {
        winner,
        newGamesCount:
          winner === 'PLAYER' ? nextScore.playerGames : nextScore.aiGames,
      },
    });
  }
  if (awardRes.setWonBy) {
    events.push({ type: 'EVENT_SET_WON', payload: { winner } });
  }
  if (awardRes.matchWonBy || reason === 'FORFEIT') {
    events.push({ type: 'EVENT_MATCH_WON', payload: { winner } });
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
      rematchReady: { PLAYER: false, AI: false },
    },
    events,
  };
}

function applyBlueDefenseToState(
  state: EngineMatchState,
  drawnCard: CardInstance,
  defender: PlayerId,
  declaredAs: CardType | undefined,
  updatedBlueDeck: CardInstance[],
  isServeDefense: boolean,
  labels: PlayerLabels
): { state: EngineMatchState; events: DomainEvent[] } {
  const opponent: PlayerId = defender === 'PLAYER' ? 'AI' : 'PLAYER';
  const cardWithDecl: CardInstance = declaredAs
    ? { ...drawnCard, declaredAs }
    : drawnCard;

  const reqAfter = getRequiredResponse(cardWithDecl, declaredAs);
  const nextRallyLength = state.rally.rallyLength + 1;

  const step: RallyStep = {
    stepNumber: state.rally.steps.length + 1,
    player: defender,
    actionType: isServeDefense ? 'SERVE_DEFENSE' : 'DRAW_DEFENSE',
    card: cardWithDecl,
    declaredAs,
    requiredResponseBefore: state.rally.requiredResponse,
    requiredResponseAfter: reqAfter,
    descriptionText: `${labels[defender]} defendeu com ${drawnCard.definition.name}${
      declaredAs ? ` (${CARDS_CATALOG[declaredAs]?.name || declaredAs})` : ''
    } -> Exige ${reqAfter}`,
    timestamp: Date.now(),
  };

  const defenderState = getSeatState(state, defender);
  const updatedDefenderState: PlayerState = {
    ...defenderState,
    blueDeck: updatedBlueDeck,
    discardedCards: [...defenderState.discardedCards, cardWithDecl],
    digAttemptsThisTurn: 0,
  };

  const nextTracker =
    defender === 'PLAYER'
      ? recordDiscardedCard(state.aiTracker, drawnCard)
      : state.aiTracker;

  const nextPhase: MatchPhase =
    opponent === 'AI' ? 'RALLY_AI_TURN' : 'RALLY_PLAYER_TURN';

  const defEvent: DomainEvent = {
    type: 'EVENT_DEFENSE_DRAWN',
    payload: { defender, cardType: drawnCard.definition.type },
  };

  let nextState = setSeatState(state, defender, updatedDefenderState);
  nextState = {
    ...nextState,
    phase: nextPhase,
    aiTracker: nextTracker,
    stats: {
      ...state.stats,
      longestRally: Math.max(state.stats.longestRally, nextRallyLength),
      totalBlueDefenses: state.stats.totalBlueDefenses + 1,
    },
    rally: {
      lastPlayedCard: cardWithDecl,
      declaredCard: declaredAs
        ? {
            ...cardWithDecl,
            definition: CARDS_CATALOG[declaredAs],
          }
        : null,
      requiredResponse: reqAfter,
      currentTurnPlayer: opponent,
      rallyLength: nextRallyLength,
      steps: [...state.rally.steps, step],
      pendingWildcard: undefined,
    },
    lastEvent: defEvent,
    actionLog: [step.descriptionText, ...state.actionLog].slice(0, 30),
  };

  return { state: nextState, events: [defEvent, { type: 'EVENT_SAND_BOUNCE' }] };
}

function applyGreenCardToState(
  state: EngineMatchState,
  card: CardInstance,
  actor: PlayerId,
  declaredAs: CardType | undefined,
  updatedHand: CardInstance[],
  updatedGreenDeck: CardInstance[],
  labels: PlayerLabels
): { state: EngineMatchState; events: DomainEvent[] } {
  const opponent: PlayerId = actor === 'PLAYER' ? 'AI' : 'PLAYER';
  const cardWithDecl: CardInstance = declaredAs ? { ...card, declaredAs } : card;

  const reqAfter = getRequiredResponse(cardWithDecl, declaredAs);
  const attack = isAttackShot(cardWithDecl, declaredAs);
  const nextRallyLength = state.rally.rallyLength + 1;

  const step: RallyStep = {
    stepNumber: state.rally.steps.length + 1,
    player: actor,
    actionType: 'PLAY_CARD',
    card: cardWithDecl,
    declaredAs,
    requiredResponseBefore: state.rally.requiredResponse,
    requiredResponseAfter: reqAfter,
    descriptionText: `${labels[actor]} jogou ${card.definition.name}${
      declaredAs ? ` (como ${CARDS_CATALOG[declaredAs]?.name || declaredAs})` : ''
    } -> Exige ${reqAfter}`,
    timestamp: Date.now(),
  };

  const actorState = getSeatState(state, actor);
  const updatedActorState: PlayerState = {
    ...actorState,
    hand: updatedHand,
    greenDeck: updatedGreenDeck,
    discardedCards: [...actorState.discardedCards, cardWithDecl],
    digAttemptsThisTurn: 0,
  };

  const nextTracker =
    actor === 'PLAYER'
      ? recordDiscardedCard(state.aiTracker, cardWithDecl)
      : state.aiTracker;

  let nextPhase: MatchPhase;
  if (opponent === 'AI') {
    nextPhase = attack ? 'RALLY_DEFENSE_DRAW' : 'RALLY_AI_TURN';
  } else {
    nextPhase = attack ? 'RALLY_DEFENSE_DRAW' : 'RALLY_PLAYER_TURN';
  }

  const hitEvent: DomainEvent = {
    type: 'EVENT_BALL_HIT',
    payload: { cardType: card.definition.type, isAttack: attack },
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
      longestRally: Math.max(state.stats.longestRally, nextRallyLength),
    },
    rally: {
      lastPlayedCard: cardWithDecl,
      declaredCard: declaredAs
        ? {
            ...cardWithDecl,
            definition: CARDS_CATALOG[declaredAs],
          }
        : null,
      requiredResponse: reqAfter,
      currentTurnPlayer: opponent,
      rallyLength: nextRallyLength,
      steps: [...state.rally.steps, step],
      pendingWildcard: undefined,
    },
    lastEvent: hitEvent,
    actionLog: [step.descriptionText, ...state.actionLog].slice(0, 30),
  };

  return { state: nextState, events: [hitEvent] };
}

export function startNewEnginePoint(
  state: EngineMatchState,
  rng: RNG = Math.random
): EngineMatchState {
  if (state.score.matchWinner !== null) {
    return { ...state, phase: 'MATCH_OVER' };
  }
  const server = state.score.currentServer;
  const playerState = buildFreshPlayerState('PLAYER', rng);
  const aiState = buildFreshPlayerState('AI', rng);
  const nextTracker = resetPointDiscards(state.aiTracker);

  return {
    ...state,
    phase: 'SERVE_SELECTION',
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
    nextPointReady: { PLAYER: false, AI: false },
  };
}

/**
 * Executa uma ação de um assento ('PLAYER' ou 'AI') sobre o estado da partida.
 */
export function applyEngineAction(
  state: EngineMatchState,
  seat: PlayerId,
  action: OnlineAction,
  rng: RNG = Math.random,
  labels: PlayerLabels = DEFAULT_LABELS
): ApplyActionResult {
  const opponent: PlayerId = seat === 'PLAYER' ? 'AI' : 'PLAYER';

  if (action.type === 'FORFEIT') {
    const res = finalizeEnginePoint(state, opponent, 'FORFEIT', labels);
    return { ok: true, state: res.state, events: res.events };
  }

  switch (action.type) {
    case 'SERVE_PICK': {
      if (state.phase !== 'SERVE_SELECTION') {
        return { ok: false, error: 'INVALID_PHASE', state, events: [] };
      }
      if (state.serveDuel.server !== seat) {
        return { ok: false, error: 'NOT_SERVER', state, events: [] };
      }
      if (![1, 2, 3].includes(action.zone)) {
        return { ok: false, error: 'INVALID_ZONE', state, events: [] };
      }
      const nextDuel: ServeDuelState = {
        ...state.serveDuel,
        serverPick: action.zone,
      };
      let nextTracker =
        seat === 'PLAYER'
          ? recordPlayerServe(state.aiTracker, action.zone)
          : state.aiTracker;

      if (nextDuel.receiverPicks.length === 2) {
        const serveResult = resolveServe(
          action.zone,
          nextDuel.receiverPicks,
          nextDuel.server,
          nextDuel.receiver
        );
        const events: DomainEvent[] = [
          { type: 'EVENT_BALL_HIT', payload: { cardType: 'SAQUE_1', isAttack: false } },
        ];
        if (serveResult.isAce) {
          events.push({
            type: 'EVENT_ACE',
            payload: { server: nextDuel.server, zone: action.zone },
          });
        }
        return {
          ok: true,
          state: {
            ...state,
            phase: 'SERVE_REVEAL',
            aiTracker: nextTracker,
            lastServeResult: serveResult,
            serveDuel: { ...nextDuel, isResolved: true },
          },
          events,
        };
      }

      return {
        ok: true,
        state: {
          ...state,
          aiTracker: nextTracker,
          serveDuel: nextDuel,
        },
        events: [],
      };
    }

    case 'RECEIVE_PICK': {
      if (state.phase !== 'SERVE_SELECTION') {
        return { ok: false, error: 'INVALID_PHASE', state, events: [] };
      }
      if (state.serveDuel.receiver !== seat) {
        return { ok: false, error: 'NOT_RECEIVER', state, events: [] };
      }
      if (
        !Array.isArray(action.zones) ||
        action.zones.length !== 2 ||
        action.zones[0] === action.zones[1] ||
        !action.zones.every((z) => [1, 2, 3].includes(z))
      ) {
        return { ok: false, error: 'INVALID_RECEIVE_ZONES', state, events: [] };
      }

      const nextDuel: ServeDuelState = {
        ...state.serveDuel,
        receiverPicks: [action.zones[0], action.zones[1]],
      };
      let nextTracker =
        seat === 'PLAYER'
          ? recordPlayerReceive(state.aiTracker, [action.zones[0], action.zones[1]])
          : state.aiTracker;

      if (nextDuel.serverPick !== null) {
        const serveResult = resolveServe(
          nextDuel.serverPick,
          nextDuel.receiverPicks,
          nextDuel.server,
          nextDuel.receiver
        );
        const events: DomainEvent[] = [
          { type: 'EVENT_BALL_HIT', payload: { cardType: 'SAQUE_1', isAttack: false } },
        ];
        if (serveResult.isAce) {
          events.push({
            type: 'EVENT_ACE',
            payload: { server: nextDuel.server, zone: nextDuel.serverPick },
          });
        }
        return {
          ok: true,
          state: {
            ...state,
            phase: 'SERVE_REVEAL',
            aiTracker: nextTracker,
            lastServeResult: serveResult,
            serveDuel: { ...nextDuel, isResolved: true },
          },
          events,
        };
      }

      return {
        ok: true,
        state: {
          ...state,
          aiTracker: nextTracker,
          serveDuel: nextDuel,
        },
        events: [],
      };
    }

    case 'COMPLETE_SERVE_REVEAL': {
      if (state.phase !== 'SERVE_REVEAL' || !state.lastServeResult) {
        return { ok: false, error: 'INVALID_PHASE', state, events: [] };
      }
      const serveResult = state.lastServeResult;
      if (serveResult.isAce) {
        const res = finalizeEnginePoint(state, serveResult.server, 'ACE', labels);
        return { ok: true, state: res.state, events: res.events };
      }

      const receiver = serveResult.receiver;
      const server = serveResult.server;
      const receiverState = getSeatState(state, receiver);
      const defDraw = drawDefenseCard(receiverState.blueDeck, receiver, server);

      if (defDraw.isExhausted || !defDraw.drawnCard) {
        const res = finalizeEnginePoint(state, server, 'ATTACK_WINNER', labels);
        return { ok: true, state: res.state, events: res.events };
      }

      const drawnCard = defDraw.drawnCard;
      if (drawnCard.definition.type === 'DEF_UBT_CORINGA') {
        const updatedReceiver: PlayerState = {
          ...receiverState,
          blueDeck: defDraw.updatedBlueDeck,
        };
        const nextState = setSeatState(state, receiver, updatedReceiver);
        return {
          ok: true,
          state: {
            ...nextState,
            phase: 'WILDCARD_DECLARING',
            rally: {
              ...state.rally,
              currentTurnPlayer: receiver,
              pendingWildcard: {
                card: drawnCard,
                player: receiver,
                allowedDeclarations: getValidBlueWildcardDeclarations(),
              },
            },
          },
          events: [
            {
              type: 'EVENT_DEFENSE_DRAWN',
              payload: { defender: receiver, cardType: drawnCard.definition.type },
            },
          ],
        };
      }

      const res = applyBlueDefenseToState(
        state,
        drawnCard,
        receiver,
        undefined,
        defDraw.updatedBlueDeck,
        true,
        labels
      );
      return { ok: true, state: res.state, events: res.events };
    }

    case 'PLAY_CARD': {
      if (state.rally.currentTurnPlayer !== seat) {
        return { ok: false, error: 'NOT_YOUR_TURN', state, events: [] };
      }
      if (
        state.phase !== 'RALLY_PLAYER_TURN' &&
        state.phase !== 'RALLY_AI_TURN' &&
        state.phase !== 'WILDCARD_DECLARING'
      ) {
        return { ok: false, error: 'INVALID_PHASE', state, events: [] };
      }

      const actorState = getSeatState(state, seat);
      const card = actorState.hand.find((c) => c.instanceId === action.instanceId);
      if (!card) {
        return { ok: false, error: 'CARD_NOT_IN_HAND', state, events: [] };
      }

      if (card.definition.type === 'GOLPE_UBT_CORINGA' && !action.declaredAs) {
        if (!state.rally.requiredResponse || state.rally.requiredResponse === 'DEFESAS') {
          return { ok: false, error: 'ILLEGAL_WILDCARD', state, events: [] };
        }
        const allowed = getValidDeclarationsForResponse(state.rally.requiredResponse);
        return {
          ok: true,
          state: {
            ...state,
            phase: 'WILDCARD_DECLARING',
            rally: {
              ...state.rally,
              pendingWildcard: {
                card,
                player: seat,
                allowedDeclarations: allowed,
              },
            },
          },
          events: [],
        };
      }

      if (!state.rally.lastPlayedCard) {
        return { ok: false, error: 'NO_CARD_ON_COURT', state, events: [] };
      }

      const validation = validateTurnPlay(
        state.rally.lastPlayedCard,
        card,
        action.declaredAs
      );
      if (!validation.isValid) {
        return { ok: false, error: 'ILLEGAL_CARD_PLAY', state, events: [] };
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

    case 'DECLARE_WILDCARD': {
      const pending = state.rally.pendingWildcard;
      if (state.phase !== 'WILDCARD_DECLARING' || !pending) {
        return { ok: false, error: 'NO_PENDING_WILDCARD', state, events: [] };
      }
      if (pending.player !== seat) {
        return { ok: false, error: 'NOT_YOUR_TURN', state, events: [] };
      }
      if (!pending.allowedDeclarations.includes(action.declaredType)) {
        return { ok: false, error: 'INVALID_DECLARATION', state, events: [] };
      }

      const actorState = getSeatState(state, seat);
      const { card } = pending;

      if (card.definition.type === 'DEF_UBT_CORINGA') {
        const res = applyBlueDefenseToState(
          state,
          card,
          seat,
          action.declaredType,
          actorState.blueDeck,
          state.rally.rallyLength === 0,
          labels
        );
        return { ok: true, state: res.state, events: res.events };
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

    case 'CANCEL_WILDCARD': {
      const pending = state.rally.pendingWildcard;
      if (state.phase !== 'WILDCARD_DECLARING' || !pending || pending.player !== seat) {
        return { ok: false, error: 'INVALID_ACTION', state, events: [] };
      }
      if (pending.card.definition.type === 'DEF_UBT_CORINGA') {
        return { ok: false, error: 'CANNOT_CANCEL_BLUE_WILDCARD', state, events: [] };
      }
      return {
        ok: true,
        state: {
          ...state,
          phase: seat === 'AI' ? 'RALLY_AI_TURN' : 'RALLY_PLAYER_TURN',
          rally: {
            ...state.rally,
            pendingWildcard: undefined,
          },
        },
        events: [],
      };
    }

    case 'DEFEND_BLUE': {
      if (
        state.rally.currentTurnPlayer !== seat ||
        state.rally.requiredResponse !== 'DEFESAS'
      ) {
        return { ok: false, error: 'NOT_UNDER_ATTACK', state, events: [] };
      }
      const defenderState = getSeatState(state, seat);
      const defDraw = drawDefenseCard(defenderState.blueDeck, seat, opponent);

      if (defDraw.isExhausted || !defDraw.drawnCard) {
        const res = finalizeEnginePoint(state, opponent, 'ATTACK_WINNER', labels);
        return { ok: true, state: res.state, events: res.events };
      }

      const drawnCard = defDraw.drawnCard;
      if (drawnCard.definition.type === 'DEF_UBT_CORINGA') {
        const updatedDefender = {
          ...defenderState,
          blueDeck: defDraw.updatedBlueDeck,
        };
        const nextState = setSeatState(state, seat, updatedDefender);
        return {
          ok: true,
          state: {
            ...nextState,
            phase: 'WILDCARD_DECLARING',
            rally: {
              ...state.rally,
              pendingWildcard: {
                card: drawnCard,
                player: seat,
                allowedDeclarations: getValidBlueWildcardDeclarations(),
              },
            },
          },
          events: [
            {
              type: 'EVENT_DEFENSE_DRAWN',
              payload: { defender: seat, cardType: drawnCard.definition.type },
            },
          ],
        };
      }

      const res = applyBlueDefenseToState(
        state,
        drawnCard,
        seat,
        undefined,
        defDraw.updatedBlueDeck,
        false,
        labels
      );
      return { ok: true, state: res.state, events: res.events };
    }

    case 'DIG_CARD': {
      if (state.rally.currentTurnPlayer !== seat) {
        return { ok: false, error: 'NOT_YOUR_TURN', state, events: [] };
      }
      if (!state.rally.requiredResponse || state.rally.requiredResponse === 'DEFESAS') {
        return { ok: false, error: 'CANNOT_DIG_NOW', state, events: [] };
      }
      const actorState = getSeatState(state, seat);
      const nextAttempt: 1 | 2 = actorState.digAttemptsThisTurn === 0 ? 1 : 2;
      try {
        const digRes = digSingleStep(
          actorState.hand,
          actorState.greenDeck,
          state.rally.requiredResponse,
          nextAttempt
        );
        const updatedActor: PlayerState = {
          ...actorState,
          hand: digRes.updatedHand,
          greenDeck: digRes.updatedGreenDeck,
          digAttemptsThisTurn: nextAttempt,
        };
        const nextState = setSeatState(state, seat, updatedActor);
        const events: DomainEvent[] = [];
        if (digRes.isValid && digRes.drawnCard) {
          events.push({
            type: 'EVENT_DIG_SUCCESS',
            payload: {
              player: seat,
              cardType: digRes.drawnCard.definition.type,
              attempt: nextAttempt,
            },
          });
        } else if (digRes.pointLost) {
          events.push({
            type: 'EVENT_DIG_FAILED',
            payload: { player: seat, attempt: nextAttempt },
          });
        }
        return {
          ok: true,
          state: {
            ...nextState,
            phase: 'RALLY_DIGGING',
            activeDigResult: digRes,
            activeDigPlayer: seat,
          },
          events,
        };
      } catch {
        return { ok: false, error: 'HAS_VALID_CARD_IN_HAND', state, events: [] };
      }
    }

    case 'PLAY_DRAWN_DIG_CARD': {
      if (
        state.phase !== 'RALLY_DIGGING' ||
        state.activeDigPlayer !== seat ||
        !state.activeDigResult?.drawnCard ||
        !state.activeDigResult.isValid ||
        !state.rally.requiredResponse
      ) {
        return { ok: false, error: 'NO_VALID_DIG_CARD', state, events: [] };
      }
      const card = state.activeDigResult.drawnCard;
      const actorState = getSeatState(state, seat);

      if (card.definition.type === 'GOLPE_UBT_CORINGA') {
        const allowed = getValidDeclarationsForResponse(state.rally.requiredResponse);
        return {
          ok: true,
          state: {
            ...state,
            phase: 'WILDCARD_DECLARING',
            activeDigResult: null,
            activeDigPlayer: null,
            rally: {
              ...state.rally,
              pendingWildcard: {
                card,
                player: seat,
                allowedDeclarations: allowed,
              },
            },
          },
          events: [],
        };
      }

      const res = applyGreenCardToState(
        state,
        card,
        seat,
        undefined,
        actorState.hand,
        actorState.greenDeck,
        labels
      );
      return { ok: true, state: res.state, events: res.events };
    }

    case 'CONCEDE_DIG_FAILURE': {
      if (
        state.phase !== 'RALLY_DIGGING' ||
        state.activeDigPlayer !== seat ||
        !state.activeDigResult?.pointLost
      ) {
        return { ok: false, error: 'INVALID_ACTION', state, events: [] };
      }
      const reason: PointEndReason =
        state.activeDigResult.reason === 'GREEN_DECK_EMPTY'
          ? 'DIG_FAILED_DECK_EMPTY'
          : 'DIG_FAILED_SECOND_CARD';
      const res = finalizeEnginePoint(state, opponent, reason, labels);
      return { ok: true, state: res.state, events: res.events };
    }

    case 'NEXT_POINT': {
      if (state.phase !== 'POINT_ENDED') {
        return { ok: false, error: 'INVALID_PHASE', state, events: [] };
      }
      const updatedReady = { ...state.nextPointReady, [seat]: true };
      if (updatedReady.PLAYER && updatedReady.AI) {
        return {
          ok: true,
          state: startNewEnginePoint({ ...state, nextPointReady: updatedReady }, rng),
          events: [],
        };
      }
      return {
        ok: true,
        state: { ...state, nextPointReady: updatedReady },
        events: [],
      };
    }

    case 'REMATCH': {
      if (state.phase !== 'MATCH_OVER') {
        return { ok: false, error: 'INVALID_PHASE', state, events: [] };
      }
      const updatedRematch = { ...state.rematchReady, [seat]: true };
      if (updatedRematch.PLAYER && updatedRematch.AI) {
        const nextInitialServer: PlayerId =
          state.initialServer === 'PLAYER' ? 'AI' : 'PLAYER';
        return {
          ok: true,
          state: createEngineMatch(state.matchFormat, nextInitialServer, rng),
          events: [],
        };
      }
      return {
        ok: true,
        state: { ...state, rematchReady: updatedRematch },
        events: [],
      };
    }

    default:
      return { ok: false, error: 'UNKNOWN_ACTION', state, events: [] };
  }
}

/**
 * Escolhe uma ação automática legal para quando o tempo de jogada (45s) expira no servidor.
 */
export function chooseAutoTimeoutAction(
  state: EngineMatchState,
  seat: PlayerId,
  rng: RNG = Math.random
): OnlineAction | null {
  if (state.phase === 'SERVE_SELECTION') {
    if (state.serveDuel.server === seat && state.serveDuel.serverPick === null) {
      const zones: ServeNumber[] = [1, 2, 3];
      const pick = zones[Math.floor(rng() * 3)] || 1;
      return { type: 'SERVE_PICK', zone: pick };
    }
    if (state.serveDuel.receiver === seat && state.serveDuel.receiverPicks.length !== 2) {
      const pairs: Array<[ServeNumber, ServeNumber]> = [
        [1, 2],
        [1, 3],
        [2, 3],
      ];
      const pick = pairs[Math.floor(rng() * 3)] || [1, 2];
      return { type: 'RECEIVE_PICK', zones: pick };
    }
    return null;
  }

  if (state.phase === 'WILDCARD_DECLARING' && state.rally.pendingWildcard?.player === seat) {
    const allowed = state.rally.pendingWildcard.allowedDeclarations;
    if (allowed.length > 0) {
      return { type: 'DECLARE_WILDCARD', declaredType: allowed[0]! };
    }
  }

  if (state.phase === 'RALLY_DIGGING' && state.activeDigPlayer === seat && state.activeDigResult) {
    if (state.activeDigResult.isValid && state.activeDigResult.drawnCard) {
      return { type: 'PLAY_DRAWN_DIG_CARD' };
    }
    if (state.activeDigResult.canDigAgain) {
      return { type: 'DIG_CARD' };
    }
    return { type: 'CONCEDE_DIG_FAILURE' };
  }

  if (
    (state.phase === 'RALLY_PLAYER_TURN' ||
      state.phase === 'RALLY_AI_TURN' ||
      state.phase === 'RALLY_DEFENSE_DRAW') &&
    state.rally.currentTurnPlayer === seat &&
    state.rally.lastPlayedCard
  ) {
    const seatState = getSeatState(state, seat);
    const legal = getLegalMoves(
      seatState.hand,
      state.rally.lastPlayedCard,
      state.rally.lastPlayedCard.declaredAs
    );
    if (legal.requiresBlueDefense) {
      return { type: 'DEFEND_BLUE' };
    }
    if (legal.playableCards.length > 0) {
      const first = legal.playableCards[0]!;
      if (first.definition.type === 'GOLPE_UBT_CORINGA' && state.rally.requiredResponse) {
        const decls = getValidDeclarationsForResponse(state.rally.requiredResponse);
        return {
          type: 'PLAY_CARD',
          instanceId: first.instanceId,
          declaredAs: decls[0],
        };
      }
      return { type: 'PLAY_CARD', instanceId: first.instanceId };
    }
    if (legal.canDig) {
      return { type: 'DIG_CARD' };
    }
  }

  return null;
}
