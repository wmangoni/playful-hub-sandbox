/**
 * Beach Tennis Card Game (UBT) - Score Engine
 * Pure, decoupled TypeScript implementation of official Beach Tennis (ITF / CBT) scoring.
 *
 * Covers:
 * - Standard game points (0 -> 15 -> 30 -> 40)
 * - No-Ad Golden Point at 40-40 (Ponto Decisivo, no Advantage/Vantagem)
 * - Server rotation after games
 * - Match modes (FAST_1_GAME, SHORT_SET_4, FULL_SET_6)
 * - Tie-break to 7 points with minimum 2-point margin
 * - Official Tie-Break Server Alternation (1-2-2-2...)
 *
 * NO DOM, NO REACT IMPORTS ALLOWED.
 */

import type {
  GamePoint,
  MatchFormat,
  PlayerId,
  ScoreState,
} from './types';

// ============================================================================
// 1. TYPE DEFINITIONS & BACKWARD-COMPATIBLE ALIASES
// ============================================================================

/**
 * Supported match modes (alias for canonical MatchFormat).
 */
export type MatchMode = MatchFormat;

/**
 * Result returned after awarding a point.
 */
export interface AwardPointResult {
  /** The new immutable score state after the point has been applied. */
  nextScore: ScoreState;

  /** Player who won the current game, if a game concluded on this point. */
  gameWonBy?: PlayerId;

  /** Player who won the current set, if a set concluded on this point. */
  setWonBy?: PlayerId;

  /** Player who won the match, if the match concluded on this point. */
  matchWonBy?: PlayerId;

  /** Whether the match is currently in a Tie-Break after this point. */
  isTieBreak: boolean;

  /** Whether the next point is a Deciding Golden Point (No-Ad at 40-40). */
  isNoAdPoint: boolean;
}

/**
 * Backward compatibility aliases.
 */
export type ScoreResult = AwardPointResult;
export type MatchScore = ScoreState;

// ============================================================================
// 2. TIE-BREAK SERVER ROTATION HELPER
// ============================================================================

/**
 * Computes the server for the upcoming tie-break point based on the official
 * ITF / CBT rule: Server S1 serves 1 point, then S2 serves 2 points, S1 serves 2, etc.
 *
 * Formula:
 * For completed points T, upcoming point is served by S1 if floor((T + 1) / 2) % 2 === 0,
 * otherwise by S2.
 *
 * @param currentServer Server of the point that was just played
 * @param prevTotalPoints Total points completed before the point that was just played
 * @returns The PlayerId who must serve the next point
 */
function getNextTieBreakServer(
  currentServer: PlayerId,
  prevTotalPoints: number
): PlayerId {
  // Determine who was S1 (the server of Point 1)
  const wasS1 = Math.floor((prevTotalPoints + 1) / 2) % 2 === 0;
  const s1: PlayerId = wasS1
    ? currentServer
    : currentServer === 'PLAYER'
      ? 'AI'
      : 'PLAYER';
  const s2: PlayerId = s1 === 'PLAYER' ? 'AI' : 'PLAYER';

  const nextTotalPoints = prevTotalPoints + 1;
  const isNextS1 = Math.floor((nextTotalPoints + 1) / 2) % 2 === 0;
  return isNextS1 ? s1 : s2;
}

// ============================================================================
// 3. FACTORY: INITIAL SCORE CREATION
// ============================================================================

/**
 * Creates a clean, immutable initial ScoreState for a given match format.
 *
 * @param mode The match format ('FAST_1_GAME', 'SHORT_SET_4', 'FULL_SET_6')
 * @param initialServer The player serving the first game (defaults to 'PLAYER')
 * @returns A fresh ScoreState snapshot
 */
export function createInitialScore(
  mode: MatchMode,
  initialServer: PlayerId = 'PLAYER'
): ScoreState {
  const nextGameServer: PlayerId = initialServer === 'PLAYER' ? 'AI' : 'PLAYER';

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
    completedSets: [],
  };
}

// ============================================================================
// 4. POINT AWARD TRANSITION ENGINE
// ============================================================================

/**
 * Pure transition function that awards a point to `winner` and derives
 * the resulting ScoreState, handling standard points, No-Ad Golden Points,
 * game wins, server rotations, tie-breaks, and match conclusions.
 *
 * @param currentScore Current immutable score snapshot
 * @param winner The player who won the point ('PLAYER' or 'AI')
 * @returns AwardPointResult containing nextScore and domain event flags
 */
export function awardPoint(
  currentScore: ScoreState,
  winner: PlayerId
): AwardPointResult {
  // Guard: If match is already completed, return a safe cloned state with no mutations
  if (currentScore.matchWinner !== null) {
    return {
      nextScore: {
        ...currentScore,
        completedSets: currentScore.completedSets.map((s) => ({ ...s })),
      },
      matchWonBy: currentScore.matchWinner,
      setWonBy: currentScore.setWinner ?? currentScore.matchWinner,
      isTieBreak: currentScore.isTieBreak,
      isNoAdPoint: currentScore.isNoAdPoint,
    };
  }

  // ==========================================================================
  // BRANCH A: ACTIVE TIE-BREAK
  // ==========================================================================
  if (currentScore.isTieBreak) {
    const nextPlayerTB =
      winner === 'PLAYER'
        ? currentScore.playerTieBreakPoints + 1
        : currentScore.playerTieBreakPoints;
    const nextAiTB =
      winner === 'AI'
        ? currentScore.aiTieBreakPoints + 1
        : currentScore.aiTieBreakPoints;

    const winnerTB = winner === 'PLAYER' ? nextPlayerTB : nextAiTB;
    const opponentTB = winner === 'PLAYER' ? nextAiTB : nextPlayerTB;

    // Tie-break win condition: at least 7 points AND at least 2 points lead
    const isTieBreakWon = winnerTB >= 7 && winnerTB - opponentTB >= 2;

    if (isTieBreakWon) {
      const newPlayerGames =
        winner === 'PLAYER'
          ? currentScore.playerGames + 1
          : currentScore.playerGames;
      const newAiGames =
        winner === 'AI'
          ? currentScore.aiGames + 1
          : currentScore.aiGames;

      const completedSets = [
        ...currentScore.completedSets.map((s) => ({ ...s })),
        { playerGames: newPlayerGames, aiGames: newAiGames },
      ];

      const nextScore: ScoreState = {
        ...currentScore,
        playerGames: newPlayerGames,
        aiGames: newAiGames,
        playerPoints: 0,
        aiPoints: 0,
        isDeuce: false,
        isNoAdPoint: false,
        isTieBreak: false,
        playerTieBreakPoints: nextPlayerTB,
        aiTieBreakPoints: nextAiTB,
        setWinner: winner,
        matchWinner: winner,
        completedSets,
      };

      return {
        nextScore,
        gameWonBy: winner,
        setWonBy: winner,
        matchWonBy: winner,
        isTieBreak: false,
        isNoAdPoint: false,
      };
    }

    // Tie-break continues: compute next server rotation
    const prevTotalPoints =
      currentScore.playerTieBreakPoints + currentScore.aiTieBreakPoints;
    const nextServer = getNextTieBreakServer(
      currentScore.currentServer,
      prevTotalPoints
    );

    const nextScore: ScoreState = {
      ...currentScore,
      playerTieBreakPoints: nextPlayerTB,
      aiTieBreakPoints: nextAiTB,
      currentServer: nextServer,
      completedSets: currentScore.completedSets.map((s) => ({ ...s })),
    };

    return {
      nextScore,
      isTieBreak: true,
      isNoAdPoint: false,
    };
  }

  // ==========================================================================
  // BRANCH B: REGULAR GAME POINT
  // ==========================================================================
  const pP = currentScore.playerPoints;
  const aP = currentScore.aiPoints;
  const winnerPoints = winner === 'PLAYER' ? pP : aP;

  // Case 1: Winner has < 40 points -> regular point increment
  if (winnerPoints < 40) {
    const nextWinnerPoints: GamePoint =
      winnerPoints === 0 ? 15 : winnerPoints === 15 ? 30 : 40;

    const nextPlayerPoints: GamePoint =
      winner === 'PLAYER' ? nextWinnerPoints : pP;
    const nextAiPoints: GamePoint =
      winner === 'AI' ? nextWinnerPoints : aP;

    // Golden Point check: 40-40 triggers No-Ad Golden Point
    const isDeuce = nextPlayerPoints === 40 && nextAiPoints === 40;
    const isNoAdPoint = isDeuce;

    const nextScore: ScoreState = {
      ...currentScore,
      playerPoints: nextPlayerPoints,
      aiPoints: nextAiPoints,
      isDeuce,
      isNoAdPoint,
      completedSets: currentScore.completedSets.map((s) => ({ ...s })),
    };

    return {
      nextScore,
      isTieBreak: false,
      isNoAdPoint,
    };
  }

  // Case 2: Winner had 40 points -> GAME IS WON (No-Ad Golden Point rule applies at 40-40)
  const newPlayerGames =
    winner === 'PLAYER' ? currentScore.playerGames + 1 : currentScore.playerGames;
  const newAiGames =
    winner === 'AI' ? currentScore.aiGames + 1 : currentScore.aiGames;

  const winnerGames = winner === 'PLAYER' ? newPlayerGames : newAiGames;
  const opponentGames = winner === 'PLAYER' ? newAiGames : newPlayerGames;

  // Server alternation for regular games
  const nextCurrentServer = currentScore.nextGameServer;
  const nextScheduledServer = currentScore.currentServer;

  const format = currentScore.matchFormat;

  // Format 1: FAST_1_GAME -> First to 1 game wins match immediately
  if (format === 'FAST_1_GAME') {
    const completedSets = [
      ...currentScore.completedSets.map((s) => ({ ...s })),
      { playerGames: newPlayerGames, aiGames: newAiGames },
    ];

    const nextScore: ScoreState = {
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
      completedSets,
    };

    return {
      nextScore,
      gameWonBy: winner,
      setWonBy: winner,
      matchWonBy: winner,
      isTieBreak: false,
      isNoAdPoint: false,
    };
  }

  // Format 2 & 3: SHORT_SET_4 (target 4) and FULL_SET_6 (target 6)
  const targetGames = format === 'SHORT_SET_4' ? 4 : 6;
  const setWon = winnerGames >= targetGames && winnerGames - opponentGames >= 2;
  const tieBreakReached =
    newPlayerGames === targetGames && newAiGames === targetGames;

  // Sub-case 2.1: Set won with minimum 2-game margin (e.g. 4-2, 5-3, 6-4, 7-5)
  if (setWon) {
    const completedSets = [
      ...currentScore.completedSets.map((s) => ({ ...s })),
      { playerGames: newPlayerGames, aiGames: newAiGames },
    ];

    const nextScore: ScoreState = {
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
      completedSets,
    };

    return {
      nextScore,
      gameWonBy: winner,
      setWonBy: winner,
      matchWonBy: winner,
      isTieBreak: false,
      isNoAdPoint: false,
    };
  }

  // Sub-case 2.2: Games tied at 4-4 or 6-6 -> Activate Tie-Break
  if (tieBreakReached) {
    const nextScore: ScoreState = {
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
      completedSets: currentScore.completedSets.map((s) => ({ ...s })),
    };

    return {
      nextScore,
      gameWonBy: winner,
      isTieBreak: true,
      isNoAdPoint: false,
    };
  }

  // Sub-case 2.3: Regular game ends, set continues (e.g. 1-0, 3-2, 4-3, 6-5)
  const nextScore: ScoreState = {
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
    completedSets: currentScore.completedSets.map((s) => ({ ...s })),
  };

  return {
    nextScore,
    gameWonBy: winner,
    isTieBreak: false,
    isNoAdPoint: false,
  };
}

/**
 * Backward compatibility alias for awardPoint.
 */
export const addPoint = awardPoint;

// ============================================================================
// 5. SCORE FORMATTING UTILITIES
// ============================================================================

/**
 * Formats a score state into a comprehensive human-readable summary.
 *
 * @param score Score snapshot to format
 * @returns Human-readable string representation
 */
export function formatScore(score: ScoreState): string {
  if (score.matchWinner !== null) {
    const setsStr = score.completedSets
      .map((s) => `${s.playerGames}-${s.aiGames}`)
      .join(', ');
    const displaySets = setsStr
      ? ` (${setsStr})`
      : ` (${score.playerGames}-${score.aiGames})`;
    return `Fim de Partida | Vitória de ${score.matchWinner}${displaySets}`;
  }

  if (score.isTieBreak) {
    return `Tie-Break: ${score.playerTieBreakPoints}-${score.aiTieBreakPoints} | Games: ${score.playerGames}-${score.aiGames} | Saque: ${score.currentServer}`;
  }

  if (score.isNoAdPoint || score.isDeuce) {
    return `Pontos: 40-40 (Ponto Decisivo / No-Ad) | Games: ${score.playerGames}-${score.aiGames} | Saque: ${score.currentServer}`;
  }

  return `Pontos: ${score.playerPoints}-${score.aiPoints} | Games: ${score.playerGames}-${score.aiGames} | Saque: ${score.currentServer}`;
}

/**
 * Formats only the active points or tiebreak points.
 */
export function formatPoints(score: ScoreState): string {
  if (score.isTieBreak) {
    return `TB ${score.playerTieBreakPoints}-${score.aiTieBreakPoints}`;
  }
  if (score.isNoAdPoint || score.isDeuce) {
    return '40-40 (Ponto Decisivo)';
  }
  return `${score.playerPoints}-${score.aiPoints}`;
}

/**
 * Formats the current games count.
 */
export function formatGames(score: ScoreState): string {
  return `${score.playerGames}-${score.aiGames}`;
}
