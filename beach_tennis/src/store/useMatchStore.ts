/**
 * src/store/useMatchStore.ts
 * Store Zustand completa orquestrando o fluxo de partida 1v1 contra a IA:
 * - Configuração de partida (Dificuldade e Formato)
 * - Preparação de ponto (24 Verdes, 8 Azuis, 6 na mão, 3 Laranjas de saque)
 * - Duelo de Saque (Cartas Laranjas 1..3) com resolução de Ace e Defesa
 * - Troca de bolas no Rali (Folha Rosa), Defesa no Monte Azul, Cavação (1/2 e 2/2) e Declaração de Coringas
 * - Turnos assíncronos da IA com cadência humanizada (600ms - 1200ms)
 * - Integração com sintetizador procedural Web Audio API (soundEffects.ts)
 */

import { create } from 'zustand';
import type {
  AIDifficulty,
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
} from '../engine/types';
import { CARDS_CATALOG } from '../engine/cardsCatalog';
import {
  createDecks,
  createOrangeDeck,
  dealInitialHand,
  digCards,
  digSingleStep,
  drawDefenseCard,
} from '../engine/deckManager';
import { resolveServe } from '../engine/serveResolver';
import {
  getRequiredResponse,
  getValidBlueWildcardDeclarations,
  getValidDeclarationsForResponse,
  isAttackShot,
  validateTurnPlay,
} from '../engine/rallyValidator';
import { awardPoint, createInitialScore } from '../engine/scoreEngine';
import {
  chooseBlueDefenseDeclaration,
  chooseGreenWildcardDeclaration,
  chooseRallyPlay,
  chooseReceiveZones,
  chooseServeZone,
  createAIHistoryTracker,
  getAIDelay,
  recordDiscardedCard,
  recordPlayerReceive,
  recordPlayerServe,
  resetPointDiscards,
} from '../engine/aiController';
import {
  getVolume,
  initAudio,
  isMuted,
  playAce,
  playApplause,
  playCardDraw,
  playFault,
  playPointWon,
  playRacketHit,
  playSandBounce,
  setVolume as setAudioVolume,
  toggleMute,
} from '../utils/soundEffects';
import {
  OnlineMatchClient,
  getSavedPlayerName,
  savePlayerName,
  type RoomPlayerSummary,
} from '../net/onlineClient';

export interface MatchStatistics {
  acesPlayer: number;
  acesAI: number;
  winnersPlayer: number;
  winnersAI: number;
  longestRally: number;
  totalBlueDefenses: number;
}

export interface MatchStoreState {
  // Configurações da Partida
  phase: MatchPhase;
  difficulty: AIDifficulty;
  matchFormat: MatchFormat;

  // Estados principais do Core Engine
  score: ScoreState;
  player: PlayerState;
  ai: PlayerState;
  rally: RallyState;
  serveDuel: ServeDuelState;
  aiTracker: AIHistoryTracker;

  // Estados de UI, Modais e Feedback
  lastServeResult: ServeResult | null;
  activeDigResult: DigResult | null;
  pointWinner: PlayerId | null;
  pointEndReason: PointEndReason | null;
  pointBannerMessage: string | null;
  isAIThinking: boolean;
  isCourtShaking: boolean;
  isRulesOpen: boolean;

  // Áudio e Telemetria
  soundEnabled: boolean;
  volume: number;
  lastEvent: DomainEvent | null;
  actionLog: string[];
  stats: MatchStatistics;

  // Estado Multiplayer Online 1v1
  isOnline: boolean;
  roomId: string | null;
  roomPhase: 'lobby' | 'playing' | 'finished' | null;
  onlineSeat: 'A' | 'B' | null;
  isHost: boolean;
  onlineConnected: boolean;
  playerName: string;
  opponentName: string;
  opponentConnected: boolean;
  opponentGraceUntil: number | null;
  turnDeadline: number | null;
  onlinePlayers: RoomPlayerSummary[];
  onlineError: string | null;
  onlineVersion: number;
  selfServeReady: boolean;
  opponentServeReady: boolean;
  selfNextPointReady: boolean;
  opponentNextPointReady: boolean;
  selfRematchReady: boolean;
  opponentRematchReady: boolean;

  // Actions
  startMatch: (difficulty?: AIDifficulty, format?: MatchFormat, rng?: RNG) => void;
  startNextPoint: (rng?: RNG) => void;
  selectServeZone: (zone: ServeNumber) => void;
  selectReceiveZones: (zones: [ServeNumber, ServeNumber] | ServeNumber[]) => void;
  confirmServeDuel: (rng?: RNG) => void;
  completeServeReveal: (rng?: RNG) => void;
  playCard: (instanceId: string, declaredAs?: CardType, rng?: RNG) => void;
  confirmWildcardDeclaration: (declaredType: CardType, rng?: RNG) => void;
  cancelWildcardDeclaration: () => void;
  defendWithBlue: (rng?: RNG) => void;
  digCard: () => void;
  playDrawnDigCard: (card: CardInstance) => void;
  closeDigFailedModal: () => void;
  executeAITurn: (rng?: RNG) => void;
  restartMatch: (rng?: RNG) => void;
  exitToMenu: () => void;
  toggleSound: () => void;
  setVolume: (vol: number) => void;
  setRulesOpen: (open: boolean) => void;

  // Online Actions
  joinOnlineRoom: (roomId: string, customName?: string) => void;
  updateOnlinePlayerName: (name: string) => void;
  setOnlineFormat: (format: MatchFormat) => void;
  startOnlineMatch: () => void;
  leaveOnlineRoom: () => void;
}

let aiTimerId: ReturnType<typeof setTimeout> | null = null;
let revealTimerId: ReturnType<typeof setTimeout> | null = null;
let onlineClient: OnlineMatchClient | null = null;

function clearTimers(): void {
  if (aiTimerId) {
    clearTimeout(aiTimerId);
    aiTimerId = null;
  }
  if (revealTimerId) {
    clearTimeout(revealTimerId);
    revealTimerId = null;
  }
}

function buildFreshPlayerState(id: PlayerId, rng: RNG = Math.random): PlayerState {
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

function createInitialRallyState(server: PlayerId): RallyState {
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

function createInitialServeDuel(server: PlayerId): ServeDuelState {
  const receiver: PlayerId = server === 'PLAYER' ? 'AI' : 'PLAYER';
  return {
    server,
    receiver,
    serverPick: null,
    receiverPicks: [],
    isResolved: false,
  };
}

function createInitialStats(): MatchStatistics {
  return {
    acesPlayer: 0,
    acesAI: 0,
    winnersPlayer: 0,
    winnersAI: 0,
    longestRally: 0,
    totalBlueDefenses: 0,
  };
}

export const useMatchStore = create<MatchStoreState>((set, get) => {
  // Helper interno para encerrar o ponto e computar o placar
  const finalizePoint = (winner: PlayerId, reason: PointEndReason, customBanner?: string) => {
    clearTimers();
    const state = get();
    const awardRes = awardPoint(state.score, winner);

    const newStats = { ...state.stats };
    if (reason === 'ACE') {
      if (winner === 'PLAYER') newStats.acesPlayer += 1;
      else newStats.acesAI += 1;
    } else {
      if (winner === 'PLAYER') newStats.winnersPlayer += 1;
      else newStats.winnersAI += 1;
    }

    const winnerLabel = winner === 'PLAYER' ? 'VOCÊ' : 'MÁQUINA (IA)';
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
      default:
        reasonLabel = `🎾 Ponto para ${winnerLabel}!`;
    }

    const banner = customBanner || reasonLabel;

    if (awardRes.matchWonBy) {
      playPointWon();
      playApplause();
    } else {
      playPointWon();
    }

    const nextPhase: MatchPhase = awardRes.matchWonBy ? 'MATCH_OVER' : 'POINT_ENDED';

    set({
      phase: nextPhase,
      score: awardRes.nextScore,
      pointWinner: winner,
      pointEndReason: reason,
      pointBannerMessage: banner,
      isAIThinking: false,
      activeDigResult: null,
      stats: newStats,
      lastEvent: {
        type: 'EVENT_POINT_SCORED',
        payload: { winner, reason, newScore: awardRes.nextScore },
      },
      actionLog: [banner, ...state.actionLog].slice(0, 30),
    });
  };

  // Helper interno para agendar turno da IA (mínimo de 3.2s em tela para destaque da carta jogada)
  const scheduleAITurnIfNeeded = (rng: RNG = Math.random) => {
    clearTimers();
    const state = get();
    if (state.phase !== 'RALLY_AI_TURN' || state.rally.currentTurnPlayer !== 'AI') {
      return;
    }

    const baseDelay = getAIDelay(state.difficulty, rng);
    // Garante pelo menos 3.2 segundos (3200ms) para que a carta jogada pelo jogador/defesa fique em destaque na tela
    const delay = rng === Math.random ? Math.max(3200, baseDelay + 2400) : baseDelay;
    set({ isAIThinking: true });

    aiTimerId = setTimeout(() => {
      aiTimerId = null;
      get().executeAITurn(rng);
    }, delay);
  };

  // Helper interno para colocar uma carta de defesa azul em quadra após ser revelada/declarada
  const applyBlueDefenseCardToCourt = (
    drawnCard: CardInstance,
    defender: PlayerId,
    declaredAs: CardType | undefined,
    updatedBlueDeck: CardInstance[],
    isServeDefense: boolean,
    rng: RNG = Math.random
  ) => {
    const state = get();
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
      descriptionText: `${
        defender === 'PLAYER' ? 'Você' : 'IA'
      } defendeu com ${drawnCard.definition.name}${
        declaredAs ? ` (${CARDS_CATALOG[declaredAs]?.name || declaredAs})` : ''
      } -> Exige ${reqAfter}`,
      timestamp: Date.now(),
    };

    const updatedDefenderState: PlayerState = {
      ...(defender === 'PLAYER' ? state.player : state.ai),
      blueDeck: updatedBlueDeck,
      discardedCards: [
        ...(defender === 'PLAYER' ? state.player.discardedCards : state.ai.discardedCards),
        cardWithDecl,
      ],
      digAttemptsThisTurn: 0,
    };

    const nextTracker =
      defender === 'PLAYER'
        ? recordDiscardedCard(state.aiTracker, drawnCard)
        : state.aiTracker;

    const nextPhase: MatchPhase =
      opponent === 'AI' ? 'RALLY_AI_TURN' : 'RALLY_PLAYER_TURN';

    playSandBounce();

    set({
      phase: nextPhase,
      player: defender === 'PLAYER' ? updatedDefenderState : state.player,
      ai: defender === 'AI' ? updatedDefenderState : state.ai,
      aiTracker: nextTracker,
      isAIThinking: opponent === 'AI',
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
      lastEvent: {
        type: 'EVENT_DEFENSE_DRAWN',
        payload: { defender, cardType: drawnCard.definition.type },
      },
      actionLog: [step.descriptionText, ...state.actionLog].slice(0, 30),
    });

    if (opponent === 'AI') {
      scheduleAITurnIfNeeded(rng);
    }
  };

  // Helper interno para colocar uma carta verde em quadra (da mão ou cavação)
  const applyGreenCardToCourt = (
    card: CardInstance,
    player: PlayerId,
    declaredAs: CardType | undefined,
    updatedHand: CardInstance[],
    updatedGreenDeck: CardInstance[],
    rng: RNG = Math.random
  ) => {
    const state = get();
    const opponent: PlayerId = player === 'PLAYER' ? 'AI' : 'PLAYER';
    const cardWithDecl: CardInstance = declaredAs ? { ...card, declaredAs } : card;

    const reqAfter = getRequiredResponse(cardWithDecl, declaredAs);
    const attack = isAttackShot(cardWithDecl, declaredAs);
    const nextRallyLength = state.rally.rallyLength + 1;

    if (attack) {
      playRacketHit('power');
    } else if (reqAfter === 'BANDEJAS') {
      playRacketHit('soft');
    } else {
      playRacketHit('normal');
    }

    const step: RallyStep = {
      stepNumber: state.rally.steps.length + 1,
      player,
      actionType: 'PLAY_CARD',
      card: cardWithDecl,
      declaredAs,
      requiredResponseBefore: state.rally.requiredResponse,
      requiredResponseAfter: reqAfter,
      descriptionText: `${player === 'PLAYER' ? 'Você' : 'IA'} jogou ${
        card.definition.name
      }${
        declaredAs ? ` (como ${CARDS_CATALOG[declaredAs]?.name || declaredAs})` : ''
      } -> Exige ${reqAfter}`,
      timestamp: Date.now(),
    };

    const currentActorState = player === 'PLAYER' ? state.player : state.ai;
    const updatedActorState: PlayerState = {
      ...currentActorState,
      hand: updatedHand,
      greenDeck: updatedGreenDeck,
      discardedCards: [...currentActorState.discardedCards, cardWithDecl],
      digAttemptsThisTurn: 0,
    };

    const nextTracker =
      player === 'PLAYER'
        ? recordDiscardedCard(state.aiTracker, cardWithDecl)
        : state.aiTracker;

    let nextPhase: MatchPhase;
    if (opponent === 'AI') {
      nextPhase = 'RALLY_AI_TURN';
    } else {
      nextPhase = attack ? 'RALLY_DEFENSE_DRAW' : 'RALLY_PLAYER_TURN';
    }

    set({
      phase: nextPhase,
      player: player === 'PLAYER' ? updatedActorState : state.player,
      ai: player === 'AI' ? updatedActorState : state.ai,
      aiTracker: nextTracker,
      activeDigResult: null,
      isAIThinking: opponent === 'AI',
      isCourtShaking: attack,
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
      lastEvent: {
        type: 'EVENT_BALL_HIT',
        payload: { cardType: card.definition.type, isAttack: attack },
      },
      actionLog: [step.descriptionText, ...state.actionLog].slice(0, 30),
    });

    if (attack) {
      setTimeout(() => {
        set({ isCourtShaking: false });
      }, 350);
    }

    if (opponent === 'AI') {
      scheduleAITurnIfNeeded(rng);
    }
  };

  return {
    phase: 'MENU',
    difficulty: 'MEDIUM',
    matchFormat: 'SHORT_SET_4',

    score: createInitialScore('SHORT_SET_4', 'PLAYER'),
    player: buildFreshPlayerState('PLAYER'),
    ai: buildFreshPlayerState('AI'),
    rally: createInitialRallyState('PLAYER'),
    serveDuel: createInitialServeDuel('PLAYER'),
    aiTracker: createAIHistoryTracker(),

    lastServeResult: null,
    activeDigResult: null,
    pointWinner: null,
    pointEndReason: null,
    pointBannerMessage: null,
    isAIThinking: false,
    isCourtShaking: false,
    isRulesOpen: false,

    soundEnabled: !isMuted(),
    volume: getVolume(),
    lastEvent: null,
    actionLog: [],
    stats: createInitialStats(),

    isOnline: false,
    roomId: null,
    roomPhase: null,
    onlineSeat: null,
    isHost: false,
    onlineConnected: false,
    playerName: getSavedPlayerName() || 'Jogador',
    opponentName: 'MÁQUINA (IA)',
    opponentConnected: true,
    opponentGraceUntil: null,
    turnDeadline: null,
    onlinePlayers: [],
    onlineError: null,
    onlineVersion: 0,
    selfServeReady: false,
    opponentServeReady: false,
    selfNextPointReady: false,
    opponentNextPointReady: false,
    selfRematchReady: false,
    opponentRematchReady: false,

    startMatch: (difficulty = 'MEDIUM', format = 'SHORT_SET_4', rng = Math.random) => {
      clearTimers();
      initAudio();
      if (onlineClient) {
        onlineClient.leaveAndClose();
        onlineClient = null;
      }

      const initialScore = createInitialScore(format, 'PLAYER');
      const playerState = buildFreshPlayerState('PLAYER', rng);
      const aiState = buildFreshPlayerState('AI', rng);

      set({
        isOnline: false,
        roomId: null,
        roomPhase: null,
        onlineSeat: null,
        opponentName: 'MÁQUINA (IA)',
        phase: 'SERVE_SELECTION',
        difficulty,
        matchFormat: format,
        score: initialScore,
        player: playerState,
        ai: aiState,
        rally: createInitialRallyState('PLAYER'),
        serveDuel: createInitialServeDuel('PLAYER'),
        aiTracker: createAIHistoryTracker(),
        lastServeResult: null,
        activeDigResult: null,
        pointWinner: null,
        pointEndReason: null,
        pointBannerMessage: null,
        isAIThinking: false,
        isCourtShaking: false,
        actionLog: ['🎾 Partida iniciada! Escolha a zona de saque.'],
        stats: createInitialStats(),
      });
    },

    startNextPoint: (rng = Math.random) => {
      const state = get();
      if (state.isOnline && onlineClient) {
        onlineClient.sendAction({ type: 'NEXT_POINT' }, state.onlineVersion);
        set({ selfNextPointReady: true });
        return;
      }
      clearTimers();
      if (state.score.matchWinner !== null) {
        set({ phase: 'MATCH_OVER' });
        return;
      }

      const server = state.score.currentServer;
      const playerState = buildFreshPlayerState('PLAYER', rng);
      const aiState = buildFreshPlayerState('AI', rng);
      const nextTracker = resetPointDiscards(state.aiTracker);

      playCardDraw();

      set({
        phase: 'SERVE_SELECTION',
        player: playerState,
        ai: aiState,
        rally: createInitialRallyState(server),
        serveDuel: createInitialServeDuel(server),
        aiTracker: nextTracker,
        lastServeResult: null,
        activeDigResult: null,
        pointWinner: null,
        pointEndReason: null,
        pointBannerMessage: null,
        isAIThinking: false,
        isCourtShaking: false,
      });
    },

    selectServeZone: (zone) => {
      const state = get();
      if (state.serveDuel.server !== 'PLAYER') return;
      if (state.isOnline && state.selfServeReady) return;
      set({
        serveDuel: {
          ...state.serveDuel,
          serverPick: zone,
        },
      });
    },

    selectReceiveZones: (zones) => {
      const state = get();
      if (state.serveDuel.receiver !== 'PLAYER') return;
      if (state.isOnline && state.selfServeReady) return;
      set({
        serveDuel: {
          ...state.serveDuel,
          receiverPicks: [...zones] as ServeNumber[],
        },
      });
    },

    confirmServeDuel: (rng = Math.random) => {
      const state = get();
      if (state.isOnline && onlineClient) {
        if (state.serveDuel.server === 'PLAYER') {
          if (!state.serveDuel.serverPick) return;
          playRacketHit('normal');
          set({ selfServeReady: true });
          onlineClient.sendAction(
            { type: 'SERVE_PICK', zone: state.serveDuel.serverPick },
            state.onlineVersion
          );
        } else {
          if (state.serveDuel.receiverPicks.length !== 2) return;
          playRacketHit('normal');
          set({ selfServeReady: true });
          onlineClient.sendAction(
            {
              type: 'RECEIVE_PICK',
              zones: [
                state.serveDuel.receiverPicks[0]!,
                state.serveDuel.receiverPicks[1]!,
              ],
            },
            state.onlineVersion
          );
        }
        return;
      }

      const { server, receiver } = state.serveDuel;

      let serverPick = state.serveDuel.serverPick;
      let receiverPicks = state.serveDuel.receiverPicks;
      let nextTracker = state.aiTracker;

      if (server === 'PLAYER') {
        if (!serverPick) return;
        receiverPicks = chooseReceiveZones(state.difficulty, state.aiTracker, rng);
        nextTracker = recordPlayerServe(state.aiTracker, serverPick);
      } else {
        if (receiverPicks.length !== 2) return;
        serverPick = chooseServeZone(state.difficulty, state.aiTracker, rng);
        nextTracker = recordPlayerReceive(
          state.aiTracker,
          receiverPicks as [ServeNumber, ServeNumber]
        );
      }

      const serveResult = resolveServe(serverPick, receiverPicks, server, receiver);
      playRacketHit('power');

      set({
        phase: 'SERVE_REVEAL',
        aiTracker: nextTracker,
        lastServeResult: serveResult,
        isCourtShaking: serveResult.isAce,
        serveDuel: {
          server,
          receiver,
          serverPick,
          receiverPicks,
          isResolved: true,
        },
      });

      if (serveResult.isAce) {
        playAce();
      }

      const revealDuration = rng === Math.random ? 2400 : 1100;
      revealTimerId = setTimeout(() => {
        revealTimerId = null;
        get().completeServeReveal(rng);
      }, revealDuration);
    },

    completeServeReveal: (rng = Math.random) => {
      clearTimers();
      const state = get();
      const serveResult = state.lastServeResult;
      if (!serveResult) return;

      set({ isCourtShaking: false });

      if (serveResult.isAce) {
        finalizePoint(serveResult.server, 'ACE');
        return;
      }

      // Saque defendido: recebedor puxa 1 carta do topo do Monte Azul
      const receiver = serveResult.receiver;
      const server = serveResult.server;
      const receiverState = receiver === 'PLAYER' ? state.player : state.ai;
      const defDraw = drawDefenseCard(receiverState.blueDeck, receiver, server);

      if (defDraw.isExhausted || !defDraw.drawnCard) {
        finalizePoint(server, 'ATTACK_WINNER');
        return;
      }

      const drawnCard = defDraw.drawnCard;
      playCardDraw();

      // Se saiu DEF_UBT_CORINGA
      if (drawnCard.definition.type === 'DEF_UBT_CORINGA') {
        if (receiver === 'PLAYER') {
          const updatedPlayer: PlayerState = {
            ...state.player,
            blueDeck: defDraw.updatedBlueDeck,
          };
          set({
            phase: 'WILDCARD_DECLARING',
            player: updatedPlayer,
            rally: {
              ...state.rally,
              currentTurnPlayer: 'PLAYER',
              pendingWildcard: {
                card: drawnCard,
                player: 'PLAYER',
                allowedDeclarations: getValidBlueWildcardDeclarations(),
              },
            },
          });
          return;
        } else {
          const aiDecl = chooseBlueDefenseDeclaration(state.difficulty, state.aiTracker, rng);
          applyBlueDefenseCardToCourt(
            drawnCard,
            'AI',
            aiDecl,
            defDraw.updatedBlueDeck,
            true,
            rng
          );
          return;
        }
      }

      // Carta de defesa regular (DEF_CURTA, DEF_NEUTRA, DEF_LOB)
      applyBlueDefenseCardToCourt(
        drawnCard,
        receiver,
        undefined,
        defDraw.updatedBlueDeck,
        true,
        rng
      );
    },

    playCard: (instanceId, declaredAs, rng = Math.random) => {
      const state = get();
      if (state.rally.currentTurnPlayer !== 'PLAYER') return;
      if (
        state.phase !== 'RALLY_PLAYER_TURN' &&
        state.phase !== 'WILDCARD_DECLARING'
      ) {
        return;
      }

      const card = state.player.hand.find((c) => c.instanceId === instanceId);
      if (!card) return;

      // Se for Coringa Verde sem declaração, abrir o CoringaModal localmente ou enviar ao servidor
      if (card.definition.type === 'GOLPE_UBT_CORINGA' && !declaredAs) {
        if (!state.rally.requiredResponse || state.rally.requiredResponse === 'DEFESAS') {
          playFault();
          return;
        }
        if (state.isOnline && onlineClient) {
          onlineClient.sendAction({ type: 'PLAY_CARD', instanceId }, state.onlineVersion);
          return;
        }
        const allowed = getValidDeclarationsForResponse(state.rally.requiredResponse);
        set({
          phase: 'WILDCARD_DECLARING',
          rally: {
            ...state.rally,
            pendingWildcard: {
              card,
              player: 'PLAYER',
              allowedDeclarations: allowed,
            },
          },
        });
        return;
      }

      if (!state.rally.lastPlayedCard) return;

      const validation = validateTurnPlay(
        state.rally.lastPlayedCard,
        card,
        declaredAs
      );
      if (!validation.isValid) {
        playFault();
        return;
      }

      if (state.isOnline && onlineClient) {
        onlineClient.sendAction(
          { type: 'PLAY_CARD', instanceId, declaredAs },
          state.onlineVersion
        );
        return;
      }

      const updatedHand = state.player.hand.filter((c) => c.instanceId !== instanceId);
      applyGreenCardToCourt(
        card,
        'PLAYER',
        declaredAs,
        updatedHand,
        state.player.greenDeck,
        rng
      );
    },

    confirmWildcardDeclaration: (declaredType, rng = Math.random) => {
      const state = get();
      if (state.isOnline && onlineClient) {
        onlineClient.sendAction(
          { type: 'DECLARE_WILDCARD', declaredType },
          state.onlineVersion
        );
        return;
      }
      const pending = state.rally.pendingWildcard;
      if (!pending) return;

      const { card, player } = pending;

      if (card.definition.type === 'DEF_UBT_CORINGA') {
        const currentDeck =
          player === 'PLAYER' ? state.player.blueDeck : state.ai.blueDeck;
        applyBlueDefenseCardToCourt(
          card,
          player,
          declaredType,
          currentDeck,
          state.rally.rallyLength === 0,
          rng
        );
        return;
      }

      // GOLPE_UBT_CORINGA (da mão ou cavação)
      const currentHand = (player === 'PLAYER' ? state.player.hand : state.ai.hand).filter(
        (c) => c.instanceId !== card.instanceId
      );
      const currentGreenDeck =
        player === 'PLAYER' ? state.player.greenDeck : state.ai.greenDeck;

      applyGreenCardToCourt(
        card,
        player,
        declaredType,
        currentHand,
        currentGreenDeck,
        rng
      );
    },

    cancelWildcardDeclaration: () => {
      const state = get();
      if (state.isOnline && onlineClient) {
        onlineClient.sendAction({ type: 'CANCEL_WILDCARD' }, state.onlineVersion);
        return;
      }
      const pending = state.rally.pendingWildcard;
      if (!pending) return;
      // Só permite cancelar se for Coringa Verde da mão (Coringa Azul já foi puxado do monte)
      if (pending.card.definition.type === 'DEF_UBT_CORINGA') return;

      set({
        phase: 'RALLY_PLAYER_TURN',
        rally: {
          ...state.rally,
          pendingWildcard: undefined,
        },
      });
    },

    defendWithBlue: (rng = Math.random) => {
      const state = get();
      if (
        state.rally.currentTurnPlayer !== 'PLAYER' ||
        state.rally.requiredResponse !== 'DEFESAS'
      ) {
        return;
      }
      if (state.isOnline && onlineClient) {
        onlineClient.sendAction({ type: 'DEFEND_BLUE' }, state.onlineVersion);
        return;
      }

      const defDraw = drawDefenseCard(state.player.blueDeck, 'PLAYER', 'AI');
      playCardDraw();

      if (defDraw.isExhausted || !defDraw.drawnCard) {
        playFault();
        finalizePoint('AI', 'ATTACK_WINNER');
        return;
      }

      const drawnCard = defDraw.drawnCard;

      if (drawnCard.definition.type === 'DEF_UBT_CORINGA') {
        set({
          phase: 'WILDCARD_DECLARING',
          player: {
            ...state.player,
            blueDeck: defDraw.updatedBlueDeck,
          },
          rally: {
            ...state.rally,
            pendingWildcard: {
              card: drawnCard,
              player: 'PLAYER',
              allowedDeclarations: getValidBlueWildcardDeclarations(),
            },
          },
        });
        return;
      }

      applyBlueDefenseCardToCourt(
        drawnCard,
        'PLAYER',
        undefined,
        defDraw.updatedBlueDeck,
        false,
        rng
      );
    },

    digCard: () => {
      const state = get();
      if (state.rally.currentTurnPlayer !== 'PLAYER') return;
      if (!state.rally.requiredResponse || state.rally.requiredResponse === 'DEFESAS') {
        return;
      }
      if (state.isOnline && onlineClient) {
        onlineClient.sendAction({ type: 'DIG_CARD' }, state.onlineVersion);
        return;
      }

      const nextAttempt: 1 | 2 = state.player.digAttemptsThisTurn === 0 ? 1 : 2;

      try {
        const digRes = digSingleStep(
          state.player.hand,
          state.player.greenDeck,
          state.rally.requiredResponse,
          nextAttempt
        );

        playCardDraw();
        if (digRes.pointLost) {
          playFault();
        }

        set({
          phase: 'RALLY_DIGGING',
          activeDigResult: digRes,
          player: {
            ...state.player,
            hand: digRes.updatedHand,
            greenDeck: digRes.updatedGreenDeck,
            digAttemptsThisTurn: nextAttempt,
          },
        });
      } catch {
        playFault();
      }
    },

    playDrawnDigCard: (card) => {
      const state = get();
      if (!state.rally.requiredResponse) return;
      if (state.isOnline && onlineClient) {
        onlineClient.sendAction(
          { type: 'PLAY_DRAWN_DIG_CARD', instanceId: card.instanceId },
          state.onlineVersion
        );
        return;
      }

      if (card.definition.type === 'GOLPE_UBT_CORINGA') {
        const allowed = getValidDeclarationsForResponse(state.rally.requiredResponse);
        set({
          phase: 'WILDCARD_DECLARING',
          activeDigResult: null,
          rally: {
            ...state.rally,
            pendingWildcard: {
              card,
              player: 'PLAYER',
              allowedDeclarations: allowed,
            },
          },
        });
        return;
      }

      applyGreenCardToCourt(
        card,
        'PLAYER',
        undefined,
        state.player.hand,
        state.player.greenDeck
      );
    },

    closeDigFailedModal: () => {
      const state = get();
      if (state.isOnline && onlineClient) {
        onlineClient.sendAction({ type: 'CONCEDE_DIG_FAILURE' }, state.onlineVersion);
        return;
      }
      const digRes = state.activeDigResult;
      const reason: PointEndReason =
        digRes?.reason === 'GREEN_DECK_EMPTY'
          ? 'DIG_FAILED_DECK_EMPTY'
          : 'DIG_FAILED_SECOND_CARD';

      finalizePoint('AI', reason);
    },

    executeAITurn: (rng = Math.random) => {
      clearTimers();
      const state = get();
      if (state.rally.currentTurnPlayer !== 'AI' || !state.rally.lastPlayedCard) {
        set({ isAIThinking: false });
        return;
      }

      const aiChoice = chooseRallyPlay(
        state.ai.hand,
        state.rally.lastPlayedCard,
        state.difficulty,
        state.aiTracker,
        rng
      );

      // 1. IA precisa puxar defesa do Monte Azul
      if (aiChoice.action === 'DRAW_BLUE_DEFENSE') {
        const defDraw = drawDefenseCard(state.ai.blueDeck, 'AI', 'PLAYER');
        playCardDraw();

        if (defDraw.isExhausted || !defDraw.drawnCard) {
          finalizePoint('PLAYER', 'ATTACK_WINNER');
          return;
        }

        const drawnCard = defDraw.drawnCard;
        const decl =
          drawnCard.definition.type === 'DEF_UBT_CORINGA'
            ? chooseBlueDefenseDeclaration(state.difficulty, state.aiTracker, rng)
            : undefined;

        applyBlueDefenseCardToCourt(
          drawnCard,
          'AI',
          decl,
          defDraw.updatedBlueDeck,
          false,
          rng
        );
        return;
      }

      // 2. IA joga carta da mão (normal ou Coringa Verde)
      if (
        (aiChoice.action === 'PLAY_HAND' || aiChoice.action === 'PLAY_WILDCARD') &&
        aiChoice.cardInstance
      ) {
        const played = aiChoice.cardInstance;
        const updatedHand = state.ai.hand.filter(
          (c) => c.instanceId !== played.instanceId
        );
        applyGreenCardToCourt(
          played,
          'AI',
          aiChoice.declaredCardType,
          updatedHand,
          state.ai.greenDeck,
          rng
        );
        return;
      }

      // 3. IA não tem carta compatível na mão -> Cavação (até 2 cartas)
      if (aiChoice.action === 'DIG' && state.rally.requiredResponse) {
        const digRes = digCards(
          state.ai.hand,
          state.ai.greenDeck,
          state.rally.requiredResponse,
          rng
        );
        playCardDraw();

        if (digRes.isValid && digRes.drawnCard) {
          const drawn = digRes.drawnCard;
          const decl =
            drawn.definition.type === 'GOLPE_UBT_CORINGA'
              ? chooseGreenWildcardDeclaration(
                  state.rally.requiredResponse,
                  state.difficulty,
                  digRes.updatedHand,
                  state.aiTracker,
                  rng
                )
              : undefined;

          applyGreenCardToCourt(
            drawn,
            'AI',
            decl,
            digRes.updatedHand,
            digRes.updatedGreenDeck,
            rng
          );
          return;
        }

        // IA falhou após cavar até 2 cartas -> Ponto para o Jogador!
        const reason: PointEndReason =
          digRes.reason === 'GREEN_DECK_EMPTY'
            ? 'DIG_FAILED_DECK_EMPTY'
            : 'DIG_FAILED_SECOND_CARD';

        set({
          ai: {
            ...state.ai,
            hand: digRes.updatedHand,
            greenDeck: digRes.updatedGreenDeck,
          },
        });
        finalizePoint('PLAYER', reason);
      }
    },

    restartMatch: (rng = Math.random) => {
      const state = get();
      if (state.isOnline && onlineClient) {
        onlineClient.sendRematch();
        set({ selfRematchReady: true });
        return;
      }
      get().startMatch(state.difficulty, state.matchFormat, rng);
    },

    exitToMenu: () => {
      clearTimers();
      if (onlineClient) {
        onlineClient.leaveAndClose();
        onlineClient = null;
      }
      if (typeof window !== 'undefined' && window.location.pathname.includes('/sala/')) {
        window.history.pushState({}, '', '/beach_tennis');
      }
      set({
        isOnline: false,
        roomId: null,
        roomPhase: null,
        onlineSeat: null,
        onlinePlayers: [],
        onlineError: null,
        opponentName: 'MÁQUINA (IA)',
        phase: 'MENU',
        isAIThinking: false,
        activeDigResult: null,
        lastServeResult: null,
      });
    },

    toggleSound: () => {
      const muted = toggleMute();
      set({ soundEnabled: !muted });
    },

    setVolume: (vol) => {
      setAudioVolume(vol);
      set({ volume: getVolume() });
    },

    setRulesOpen: (open) => {
      set({ isRulesOpen: open });
    },

    joinOnlineRoom: (roomId, customName) => {
      clearTimers();
      initAudio();

      if (onlineClient) {
        onlineClient.disconnectWithoutLeaving();
        onlineClient = null;
      }

      const initialName =
        (customName && customName.trim()) ||
        getSavedPlayerName() ||
        `Atleta ${Math.floor(100 + Math.random() * 900)}`;
      savePlayerName(initialName);

      set({
        isOnline: true,
        roomId,
        roomPhase: 'lobby',
        playerName: initialName,
        onlineError: null,
        onlineConnected: false,
      });

      const client = new OnlineMatchClient(roomId, initialName, {
        onJoined: (payload) => {
          set({
            onlineSeat: payload.seat,
            playerName: payload.name,
            onlineError: null,
          });
        },
        onRoomState: (payload) => {
          const cur = get();
          const mySeat = cur.onlineSeat;
          const opp = payload.players.find((p) => p.seat !== mySeat);
          set({
            roomPhase: payload.phase,
            matchFormat: payload.format,
            isHost: mySeat !== null && payload.hostSeat === mySeat,
            onlinePlayers: payload.players,
            turnDeadline: payload.turnDeadline,
            opponentName: opp ? opp.name : cur.opponentName,
            opponentConnected: opp ? opp.connected : false,
            opponentGraceUntil: opp ? opp.graceUntil : null,
          });
        },
        onMatchState: (payload) => {
          const cur = get();
          const view = payload.view;

          // Dispara efeitos sonoros para eventos recebidos da rede
          for (const ev of payload.events || []) {
            if (ev.type === 'EVENT_BALL_HIT') {
              playRacketHit(ev.payload.isAttack ? 'power' : 'normal');
            } else if (ev.type === 'EVENT_ACE') {
              playAce();
            } else if (ev.type === 'EVENT_DEFENSE_DRAWN' || ev.type === 'EVENT_DIG_SUCCESS') {
              playCardDraw();
            } else if (ev.type === 'EVENT_DIG_FAILED') {
              playFault();
            } else if (ev.type === 'EVENT_POINT_SCORED') {
              playPointWon();
            } else if (ev.type === 'EVENT_MATCH_WON') {
              playApplause();
            }
          }

          // Preserva escolha local de saque/recepção enquanto o duelo ainda não foi resolvido no servidor
          const localServeDuel = cur.serveDuel;
          const serverReady =
            view.serveDuel.server === 'PLAYER'
              ? view.serveDuel.serverReady
              : view.serveDuel.receiverReady;
          const oppReady =
            view.serveDuel.server === 'PLAYER'
              ? view.serveDuel.receiverReady
              : view.serveDuel.serverReady;

          const mergedServeDuel: ServeDuelState =
            view.phase === 'SERVE_SELECTION' && !view.serveDuel.isResolved
              ? {
                  server: view.serveDuel.server,
                  receiver: view.serveDuel.receiver,
                  serverPick:
                    view.serveDuel.server === 'PLAYER'
                      ? view.serveDuel.serverPick ?? localServeDuel.serverPick
                      : null,
                  receiverPicks:
                    view.serveDuel.receiver === 'PLAYER'
                      ? view.serveDuel.receiverPicks.length > 0
                        ? view.serveDuel.receiverPicks
                        : localServeDuel.receiverPicks
                      : [],
                  isResolved: false,
                }
              : {
                  server: view.serveDuel.server,
                  receiver: view.serveDuel.receiver,
                  serverPick: view.serveDuel.serverPick,
                  receiverPicks: view.serveDuel.receiverPicks,
                  isResolved: view.serveDuel.isResolved,
                };

          set({
            onlineVersion: payload.version,
            roomPhase: payload.phase,
            phase: view.phase,
            matchFormat: view.matchFormat,
            score: view.score,
            player: view.player,
            ai: view.ai,
            rally: view.rally,
            serveDuel: mergedServeDuel,
            lastServeResult: view.lastServeResult,
            activeDigResult: view.activeDigResult,
            pointWinner: view.pointWinner,
            pointEndReason: view.pointEndReason,
            pointBannerMessage: view.pointBannerMessage,
            actionLog: view.actionLog,
            stats: view.stats,
            playerName: payload.playerName || cur.playerName,
            opponentName: payload.opponentName || cur.opponentName,
            opponentConnected: payload.opponentConnected,
            opponentGraceUntil: payload.opponentGraceUntil,
            turnDeadline: payload.turnDeadline,
            selfServeReady: view.phase === 'SERVE_SELECTION' ? serverReady : false,
            opponentServeReady: view.phase === 'SERVE_SELECTION' ? oppReady : false,
            selfNextPointReady: view.selfNextPointReady,
            opponentNextPointReady: view.opponentNextPointReady,
            selfRematchReady: view.selfRematchReady,
            opponentRematchReady: view.opponentRematchReady,
            isAIThinking: false,
          });
        },
        onOpponentStatus: (payload) => {
          set({
            opponentConnected: payload.connected,
            opponentGraceUntil: payload.graceUntil,
            opponentName: payload.name || get().opponentName,
          });
        },
        onError: (payload) => {
          playFault();
          set({ onlineError: payload.message || 'Erro na sala online.' });
        },
        onConnectionChange: (connected) => {
          set({ onlineConnected: connected });
        },
      });

      onlineClient = client;
      client.connect();
    },

    updateOnlinePlayerName: (name) => {
      const cleaned = name.trim().slice(0, 24);
      if (!cleaned) return;
      savePlayerName(cleaned);
      set({ playerName: cleaned });
      if (onlineClient) {
        onlineClient.updateNameAndRejoin(cleaned);
      }
    },

    setOnlineFormat: (format) => {
      if (onlineClient) {
        onlineClient.sendConfig(format);
      }
    },

    startOnlineMatch: () => {
      if (onlineClient) {
        onlineClient.sendStart();
      }
    },

    leaveOnlineRoom: () => {
      get().exitToMenu();
    },
  };
});

export default useMatchStore;
