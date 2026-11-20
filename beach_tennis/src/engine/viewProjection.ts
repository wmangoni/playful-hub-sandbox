/**
 * src/engine/viewProjection.ts
 * Projeção de estado com espelhamento de perspectiva e ocultação estrita de informação secreta.
 * Garante que cada cliente receba apenas o que tem permissão de ver e sempre enxergue a si mesmo como 'PLAYER'.
 */

import type {
  CardDefinition,
  CardInstance,
  DomainEvent,
  MatchPhase,
  PlayerId,
  PlayerState,
  RallyState,
  ScoreState,
  ServeDuelState,
  ServeResult,
} from './types';
import { CARDS_CATALOG } from './cardsCatalog';
import type { EngineMatchState, EngineMatchStatistics } from './match';

const REDACTED_CARD_DEF: CardDefinition = CARDS_CATALOG.BANDEJA_CURTA;

function createRedactedCardList(count: number, owner: PlayerId, prefix: string): CardInstance[] {
  return Array.from({ length: count }, (_, idx) => ({
    instanceId: `redacted_${prefix}_${idx}`,
    cardId: 'redacted',
    definition: REDACTED_CARD_DEF,
    owner,
  }));
}

export function mapSeatPerspective(id: PlayerId, viewerSeat: PlayerId): PlayerId {
  if (viewerSeat === 'PLAYER') return id;
  return id === 'PLAYER' ? 'AI' : 'PLAYER';
}

function mapCardOwner(card: CardInstance, viewerSeat: PlayerId): CardInstance {
  return {
    ...card,
    owner: mapSeatPerspective(card.owner, viewerSeat),
  };
}

export interface ProjectedServeDuelState extends ServeDuelState {
  serverReady: boolean;
  receiverReady: boolean;
}

export interface ProjectedMatchView {
  phase: MatchPhase;
  matchFormat: EngineMatchState['matchFormat'];
  score: ScoreState;
  player: PlayerState;
  ai: PlayerState;
  rally: RallyState;
  serveDuel: ProjectedServeDuelState;
  lastServeResult: ServeResult | null;
  activeDigResult: EngineMatchState['activeDigResult'];
  pointWinner: PlayerId | null;
  pointEndReason: EngineMatchState['pointEndReason'];
  pointBannerMessage: string | null;
  actionLog: string[];
  stats: EngineMatchStatistics;
  selfNextPointReady: boolean;
  opponentNextPointReady: boolean;
  selfRematchReady: boolean;
  opponentRematchReady: boolean;
}

export function projectMatchView(
  state: EngineMatchState,
  viewerSeat: PlayerId
): ProjectedMatchView {
  const selfRaw = viewerSeat === 'PLAYER' ? state.player : state.ai;
  const oppRaw = viewerSeat === 'PLAYER' ? state.ai : state.player;

  // 1. Filtra estados de cartas (própria mão visível; mão do oponente e montes sempre ocultos)
  const projectedSelf: PlayerState = {
    id: 'PLAYER',
    hand: selfRaw.hand.map((c) => mapCardOwner(c, viewerSeat)),
    greenDeck: createRedactedCardList(selfRaw.greenDeck.length, 'PLAYER', 'self_green'),
    blueDeck: createRedactedCardList(selfRaw.blueDeck.length, 'PLAYER', 'self_blue'),
    discardedCards: selfRaw.discardedCards.map((c) => mapCardOwner(c, viewerSeat)),
    orangeCards: selfRaw.orangeCards.map((c) => mapCardOwner(c, viewerSeat)),
    digAttemptsThisTurn: selfRaw.digAttemptsThisTurn,
  };

  const projectedOpp: PlayerState = {
    id: 'AI',
    hand: createRedactedCardList(oppRaw.hand.length, 'AI', 'opp_hand'),
    greenDeck: createRedactedCardList(oppRaw.greenDeck.length, 'AI', 'opp_green'),
    blueDeck: createRedactedCardList(oppRaw.blueDeck.length, 'AI', 'opp_blue'),
    discardedCards: oppRaw.discardedCards.map((c) => mapCardOwner(c, viewerSeat)),
    orangeCards: [],
    digAttemptsThisTurn: oppRaw.digAttemptsThisTurn,
  };

  // 2. Placar espelhado para a perspectiva do jogador
  const s = state.score;
  const projectedScore: ScoreState =
    viewerSeat === 'PLAYER'
      ? { ...s }
      : {
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
            aiGames: setItem.playerGames,
          })),
        };

  // 3. Duelo de Saque (escolhas secretas ocultas até isResolved = true)
  const isViewerServer = state.serveDuel.server === viewerSeat;
  const serverReady = state.serveDuel.serverPick !== null;
  const receiverReady = state.serveDuel.receiverPicks.length === 2;

  const projectedServeDuel: ProjectedServeDuelState = {
    server: mapSeatPerspective(state.serveDuel.server, viewerSeat),
    receiver: mapSeatPerspective(state.serveDuel.receiver, viewerSeat),
    serverPick:
      state.serveDuel.isResolved || isViewerServer ? state.serveDuel.serverPick : null,
    receiverPicks:
      state.serveDuel.isResolved || !isViewerServer ? [...state.serveDuel.receiverPicks] : [],
    isResolved: state.serveDuel.isResolved,
    serverReady,
    receiverReady,
  };

  const projectedServeResult: ServeResult | null = state.lastServeResult
    ? {
        ...state.lastServeResult,
        server: mapSeatPerspective(state.lastServeResult.server, viewerSeat),
        receiver: mapSeatPerspective(state.lastServeResult.receiver, viewerSeat),
        winningPlayer: state.lastServeResult.winningPlayer
          ? mapSeatPerspective(state.lastServeResult.winningPlayer, viewerSeat)
          : undefined,
      }
    : null;

  // 4. Rali e carta pendente de Coringa
  const mappedTurn = mapSeatPerspective(state.rally.currentTurnPlayer, viewerSeat);
  const canSeePendingWildcard = state.rally.pendingWildcard?.player === viewerSeat;

  const projectedRally: RallyState = {
    lastPlayedCard: state.rally.lastPlayedCard
      ? mapCardOwner(state.rally.lastPlayedCard, viewerSeat)
      : null,
    declaredCard: state.rally.declaredCard
      ? mapCardOwner(state.rally.declaredCard, viewerSeat)
      : null,
    requiredResponse: state.rally.requiredResponse,
    currentTurnPlayer: mappedTurn,
    rallyLength: state.rally.rallyLength,
    steps: state.rally.steps.map((step) => ({
      ...step,
      player: mapSeatPerspective(step.player, viewerSeat),
      card: mapCardOwner(step.card, viewerSeat),
    })),
    pendingWildcard:
      canSeePendingWildcard && state.rally.pendingWildcard
        ? {
            card: mapCardOwner(state.rally.pendingWildcard.card, viewerSeat),
            player: 'PLAYER',
            allowedDeclarations: [...state.rally.pendingWildcard.allowedDeclarations],
          }
        : undefined,
  };

  // 5. Fase mapeada para a perspectiva do cliente
  let projectedPhase: MatchPhase = state.phase;
  if (
    state.phase === 'RALLY_PLAYER_TURN' ||
    state.phase === 'RALLY_AI_TURN' ||
    state.phase === 'RALLY_DEFENSE_DRAW'
  ) {
    if (mappedTurn === 'PLAYER') {
      projectedPhase =
        state.rally.requiredResponse === 'DEFESAS'
          ? 'RALLY_DEFENSE_DRAW'
          : 'RALLY_PLAYER_TURN';
    } else {
      projectedPhase = 'RALLY_AI_TURN';
    }
  } else if (state.phase === 'WILDCARD_DECLARING') {
    projectedPhase = canSeePendingWildcard ? 'WILDCARD_DECLARING' : 'RALLY_AI_TURN';
  } else if (state.phase === 'RALLY_DIGGING') {
    projectedPhase = state.activeDigPlayer === viewerSeat ? 'RALLY_DIGGING' : 'RALLY_AI_TURN';
  }

  // 6. Resultado de Cavação visível apenas para quem está cavando
  const projectedDigResult =
    state.activeDigPlayer === viewerSeat && state.activeDigResult
      ? {
          ...state.activeDigResult,
          drawnCard: state.activeDigResult.drawnCard
            ? mapCardOwner(state.activeDigResult.drawnCard, viewerSeat)
            : null,
          updatedGreenDeck: createRedactedCardList(
            state.activeDigResult.updatedGreenDeck.length,
            'PLAYER',
            'dig_green'
          ),
          updatedHand: state.activeDigResult.updatedHand.map((c) =>
            mapCardOwner(c, viewerSeat)
          ),
        }
      : null;

  // 7. Estatísticas espelhadas
  const projectedStats: EngineMatchStatistics =
    viewerSeat === 'PLAYER'
      ? { ...state.stats }
      : {
          ...state.stats,
          acesPlayer: state.stats.acesAI,
          acesAI: state.stats.acesPlayer,
          winnersPlayer: state.stats.winnersAI,
          winnersAI: state.stats.winnersPlayer,
        };

  const oppSeat: PlayerId = viewerSeat === 'PLAYER' ? 'AI' : 'PLAYER';

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
    pointWinner: state.pointWinner
      ? mapSeatPerspective(state.pointWinner, viewerSeat)
      : null,
    pointEndReason: state.pointEndReason,
    pointBannerMessage: state.pointBannerMessage,
    actionLog: [...state.actionLog],
    stats: projectedStats,
    selfNextPointReady: state.nextPointReady[viewerSeat],
    opponentNextPointReady: state.nextPointReady[oppSeat],
    selfRematchReady: state.rematchReady[viewerSeat],
    opponentRematchReady: state.rematchReady[oppSeat],
  };
}

export function projectDomainEvent(
  event: DomainEvent,
  viewerSeat: PlayerId
): DomainEvent {
  switch (event.type) {
    case 'EVENT_ACE':
      return {
        ...event,
        payload: {
          ...event.payload,
          server: mapSeatPerspective(event.payload.server, viewerSeat),
        },
      };
    case 'EVENT_DEFENSE_DRAWN':
      return {
        ...event,
        payload: {
          ...event.payload,
          defender: mapSeatPerspective(event.payload.defender, viewerSeat),
        },
      };
    case 'EVENT_DIG_SUCCESS':
      return {
        type: 'EVENT_DIG_SUCCESS',
        payload: {
          ...event.payload,
          player: mapSeatPerspective(event.payload.player, viewerSeat),
        },
      };
    case 'EVENT_DIG_FAILED':
      return {
        type: 'EVENT_DIG_FAILED',
        payload: {
          ...event.payload,
          player: mapSeatPerspective(event.payload.player, viewerSeat),
        },
      };
    case 'EVENT_POINT_SCORED':
      return {
        type: 'EVENT_POINT_SCORED',
        payload: {
          ...event.payload,
          winner: mapSeatPerspective(event.payload.winner, viewerSeat),
        },
      };
    case 'EVENT_GAME_WON':
      return {
        type: 'EVENT_GAME_WON',
        payload: {
          ...event.payload,
          winner: mapSeatPerspective(event.payload.winner, viewerSeat),
        },
      };
    case 'EVENT_SET_WON':
      return {
        type: 'EVENT_SET_WON',
        payload: {
          winner: mapSeatPerspective(event.payload.winner, viewerSeat),
        },
      };
    case 'EVENT_MATCH_WON':
      return {
        type: 'EVENT_MATCH_WON',
        payload: {
          winner: mapSeatPerspective(event.payload.winner, viewerSeat),
        },
      };
    default:
      return event;
  }
}
