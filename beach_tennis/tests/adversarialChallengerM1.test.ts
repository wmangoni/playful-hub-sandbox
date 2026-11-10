/**
 * tests/adversarialChallengerM1.test.ts
 *
 * Empirical Adversarial Challenger Test Suite for Milestone M1:
 * - Score Engine Stress: 1,000 simulated games with random points.
 *   * Strict verification of No-Ad Golden Point (40-40 must resolve in exactly 1 point).
 *   * Absolute absence of any "advantage" state (points must remain in [0, 15, 30, 40]).
 *   * Tie-break fuzzing: extended tie-breaks (7-5, 8-6, 12-10, 20-18), strict min-2 lead enforcement.
 *   * Tie-break server alternation (1-2-2-2...) on every single point.
 * - Attack Defense Lock Stress:
 *   * Probe getLegalMoves across all 19 cards under attack.
 *   * Verification that playableCards is ALWAYS empty ([]) and canDig is ALWAYS false.
 *   * Verification that requiresBlueDefense is ALWAYS true.
 *   * Fuzzing across single-card hands, full catalog hands, and 1,000 random multi-card hands.
 *   * Direct turn play validation: rejection of all 12 green cards and 3 orange cards under attack.
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialScore,
  awardPoint,
  type MatchMode,
} from '../src/engine/scoreEngine';
import {
  getLegalMoves,
  isAttackShot,
  validateTurnPlay,
} from '../src/engine/rallyValidator';
import { CARDS_CATALOG, ALL_CARDS } from '../src/engine/cardsCatalog';
import type {
  CardInstance,
  CardType,
  PlayerId,
  ScoreState,
} from '../src/engine/types';

// Helper to instantiate any card from CARDS_CATALOG
function createCardInstance(
  type: CardType,
  owner: PlayerId = 'PLAYER',
  declaredAs?: CardType,
  instanceId?: string
): CardInstance {
  const definition = CARDS_CATALOG[type];
  if (!definition) {
    throw new Error(`Unknown card type for test: ${type}`);
  }
  return {
    instanceId: instanceId ?? `${owner.toLowerCase()}_${type.toLowerCase()}_${Math.random().toString(36).substring(2, 9)}`,
    cardId: definition.id,
    definition,
    owner,
    declaredAs,
  };
}

describe('Empirical Adversarial Verification - Milestone M1', () => {
  // ==========================================================================
  // HARNESS 1: SCORE ENGINE STRESS — 1,000 SIMULATED GAMES WITH RANDOM POINTS
  // ==========================================================================
  describe('Harness 1: Score Engine Stress (1,000 Simulated Games)', () => {
    it('executes 1,000 randomized games: strictly NO advantage state, 40-40 No-Ad resolves in 1 point', () => {
      const TOTAL_GAMES = 1000;
      let totalPointsPlayed = 0;
      let deuceCount = 0;
      let goldenPointsResolved = 0;
      const validPoints = new Set([0, 15, 30, 40]);

      const modes: MatchMode[] = ['FAST_1_GAME', 'SHORT_SET_4', 'FULL_SET_6'];

      for (let gameIdx = 0; gameIdx < TOTAL_GAMES; gameIdx++) {
        const mode = modes[gameIdx % modes.length]!;
        const initialServer: PlayerId = gameIdx % 2 === 0 ? 'PLAYER' : 'AI';
        let score: ScoreState = createInitialScore(mode, initialServer);

        let gameResolved = false;
        let pointsInCurrentGame = 0;

        while (!gameResolved) {
          // Verify current points are strictly in [0, 15, 30, 40]
          expect(validPoints.has(score.playerPoints)).toBe(true);
          expect(validPoints.has(score.aiPoints)).toBe(true);

          // Check if entering 40-40
          const wasAtDeuce = score.playerPoints === 40 && score.aiPoints === 40;
          if (wasAtDeuce) {
            deuceCount++;
            expect(score.isDeuce).toBe(true);
            expect(score.isNoAdPoint).toBe(true);
          }

          // Randomly select point winner
          const winner: PlayerId = Math.random() < 0.5 ? 'PLAYER' : 'AI';
          const result = awardPoint(score, winner);
          score = result.nextScore;
          pointsInCurrentGame++;
          totalPointsPlayed++;

          // If game was at 40-40, it MUST have resolved immediately in 1 point
          if (wasAtDeuce) {
            expect(result.gameWonBy).toBe(winner);
            expect(score.playerPoints).toBe(0);
            expect(score.aiPoints).toBe(0);
            expect(score.isDeuce).toBe(false);
            expect(score.isNoAdPoint).toBe(false);
            goldenPointsResolved++;
          }

          // Check if game resolved
          if (result.gameWonBy) {
            expect(result.gameWonBy).toBe(winner);
            // Game score reset verification
            expect(score.playerPoints).toBe(0);
            expect(score.aiPoints).toBe(0);
            expect(score.isDeuce).toBe(false);
            expect(score.isNoAdPoint).toBe(false);
            gameResolved = true;
          }

          // Safety guard against infinite loops
          expect(pointsInCurrentGame).toBeLessThanOrEqual(7); // Max points in a Beach Tennis game is 7 (30-40 -> 40-40 -> win = 4+3=7)
        }
      }

      // Assertions on the full batch
      expect(totalPointsPlayed).toBeGreaterThanOrEqual(TOTAL_GAMES * 4); // Min 4 points per game (love game)
      expect(goldenPointsResolved).toBe(deuceCount);
      expect(deuceCount).toBeGreaterThan(0); // With 1,000 games, deuce will statistically happen dozens/hundreds of times
    });

    it('rigorously tests all permutations leading to 40-40 (Golden Point)', () => {
      // There are 20 permutations of 3 wins for PLAYER and 3 wins for AI (6! / (3! * 3!) = 20)
      function generatePermutations(p: number, a: number, current: PlayerId[]): PlayerId[][] {
        if (p === 3 && a === 3) return [current];
        const res: PlayerId[][] = [];
        if (p < 3) res.push(...generatePermutations(p + 1, a, [...current, 'PLAYER']));
        if (a < 3) res.push(...generatePermutations(p, a + 1, [...current, 'AI']));
        return res;
      }

      const permutations = generatePermutations(0, 0, []);
      expect(permutations).toHaveLength(20);

      for (const perm of permutations) {
        // Test resolving for PLAYER
        {
          let score = createInitialScore('SHORT_SET_4');
          for (const winner of perm) {
            score = awardPoint(score, winner).nextScore;
          }
          expect(score.playerPoints).toBe(40);
          expect(score.aiPoints).toBe(40);
          expect(score.isDeuce).toBe(true);
          expect(score.isNoAdPoint).toBe(true);

          const goldenResult = awardPoint(score, 'PLAYER');
          expect(goldenResult.gameWonBy).toBe('PLAYER');
          expect(goldenResult.nextScore.playerPoints).toBe(0);
          expect(goldenResult.nextScore.aiPoints).toBe(0);
          expect(goldenResult.nextScore.isDeuce).toBe(false);
          expect(goldenResult.nextScore.isNoAdPoint).toBe(false);
        }

        // Test resolving for AI
        {
          let score = createInitialScore('SHORT_SET_4');
          for (const winner of perm) {
            score = awardPoint(score, winner).nextScore;
          }
          expect(score.playerPoints).toBe(40);
          expect(score.aiPoints).toBe(40);

          const goldenResult = awardPoint(score, 'AI');
          expect(goldenResult.gameWonBy).toBe('AI');
          expect(goldenResult.nextScore.playerPoints).toBe(0);
          expect(goldenResult.nextScore.aiPoints).toBe(0);
          expect(goldenResult.nextScore.isDeuce).toBe(false);
          expect(goldenResult.nextScore.isNoAdPoint).toBe(false);
        }
      }
    });
  });

  // ==========================================================================
  // HARNESS 2: TIE-BREAK FUZZING (EXTENDED SCORES & SERVER ALTERNATION)
  // ==========================================================================
  describe('Harness 2: Tie-break Fuzzing (Extended Scores & Server Alternation)', () => {
    it('strictly enforces minimum 2-point lead and >= 7 points across extended tie-break scenarios (7-5, 8-6, 12-10, 20-18)', () => {
      const scenarios: Array<{
        targetWinner: PlayerId;
        loserPoints: number;
        winnerPoints: number;
      }> = [
        { targetWinner: 'PLAYER', loserPoints: 0, winnerPoints: 7 },   // 7-0
        { targetWinner: 'AI', loserPoints: 3, winnerPoints: 7 },       // 7-3
        { targetWinner: 'PLAYER', loserPoints: 5, winnerPoints: 7 },   // 7-5
        { targetWinner: 'AI', loserPoints: 6, winnerPoints: 8 },       // 8-6
        { targetWinner: 'PLAYER', loserPoints: 8, winnerPoints: 10 },  // 10-8
        { targetWinner: 'AI', loserPoints: 10, winnerPoints: 12 },     // 12-10
        { targetWinner: 'PLAYER', loserPoints: 18, winnerPoints: 20 }, // 20-18
      ];

      for (const scenario of scenarios) {
        let score = createInitialScore('FULL_SET_6', 'PLAYER');
        // Set up 6-6 to reach tie-break
        score.playerGames = 6;
        score.aiGames = 6;
        score.isTieBreak = true;
        score.playerTieBreakPoints = 0;
        score.aiTieBreakPoints = 0;

        const { targetWinner, loserPoints, winnerPoints } = scenario;
        const opponent: PlayerId = targetWinner === 'PLAYER' ? 'AI' : 'PLAYER';

        // 1. Play both players up to loserPoints (tied at loserPoints - loserPoints)
        for (let i = 0; i < loserPoints; i++) {
          score = awardPoint(score, targetWinner).nextScore;
          expect(score.isTieBreak).toBe(true);
          expect(score.matchWinner).toBeNull();

          score = awardPoint(score, opponent).nextScore;
          expect(score.isTieBreak).toBe(true);
          expect(score.matchWinner).toBeNull();
        }

        // At this stage, score is loserPoints - loserPoints (tied)
        const currentP = targetWinner === 'PLAYER' ? score.playerTieBreakPoints : score.aiTieBreakPoints;
        expect(currentP).toBe(loserPoints);

        // 2. Winner scores up to winnerPoints - 1 (must all continue without winning)
        while ((targetWinner === 'PLAYER' ? score.playerTieBreakPoints : score.aiTieBreakPoints) < winnerPoints - 1) {
          score = awardPoint(score, targetWinner).nextScore;
          expect(score.isTieBreak).toBe(true);
          expect(score.matchWinner).toBeNull();
          expect(score.setWinner).toBeNull();
        }

        // 3. Winner scores the final point to reach winnerPoints (lead is >= 2 and points >= 7)
        const finalRes = awardPoint(score, targetWinner);
        expect(finalRes.isTieBreak).toBe(false);
        expect(finalRes.matchWonBy).toBe(targetWinner);
        expect(finalRes.setWonBy).toBe(targetWinner);
        expect(finalRes.nextScore.isTieBreak).toBe(false);
        expect(finalRes.nextScore.matchWinner).toBe(targetWinner);

        const expectedPlayerGames = targetWinner === 'PLAYER' ? 7 : 6;
        const expectedAiGames = targetWinner === 'AI' ? 7 : 6;
        expect(finalRes.nextScore.playerGames).toBe(expectedPlayerGames);
        expect(finalRes.nextScore.aiGames).toBe(expectedAiGames);
      }
    });

    it('fuzzes 1,000 extended tie-breaks with random walks verifying min 2 lead on every point', () => {
      const TOTAL_TIEBREAKS = 1000;

      for (let tb = 0; tb < TOTAL_TIEBREAKS; tb++) {
        let score = createInitialScore('SHORT_SET_4', tb % 2 === 0 ? 'PLAYER' : 'AI');
        score.playerGames = 4;
        score.aiGames = 4;
        score.isTieBreak = true;
        score.playerTieBreakPoints = 0;
        score.aiTieBreakPoints = 0;

        let tieBreakEnded = false;
        let pointsPlayed = 0;

        while (!tieBreakEnded) {
          const winner: PlayerId = Math.random() < 0.5 ? 'PLAYER' : 'AI';
          const res = awardPoint(score, winner);
          pointsPlayed++;
          score = res.nextScore;

          const pAfter = score.playerTieBreakPoints;
          const aAfter = score.aiTieBreakPoints;
          const maxPoints = Math.max(pAfter, aAfter);
          const diff = Math.abs(pAfter - aAfter);

          if (maxPoints >= 7 && diff >= 2) {
            // Must end!
            expect(res.isTieBreak).toBe(false);
            expect(res.matchWonBy).toBe(winner);
            expect(score.matchWinner).toBe(winner);
            expect(score.setWinner).toBe(winner);
            tieBreakEnded = true;
          } else {
            // Must NOT end!
            expect(res.isTieBreak).toBe(true);
            expect(res.matchWonBy).toBeUndefined();
            expect(score.matchWinner).toBeNull();
            expect(score.setWinner).toBeNull();
          }

          // Safety guard
          expect(pointsPlayed).toBeLessThan(100);
        }
      }
    });

    it('strictly verifies official tie-break server alternation (1-2-2-2...) on every point up to 50 points', () => {
      // Official formula:
      // Point 1 (p=1): S1
      // Point 2, 3: S2
      // Point 4, 5: S1
      // Point 6, 7: S2
      // ...
      // For any 1-indexed point p: isS1 = Math.floor(p / 2) % 2 === 0
      function expectedServerForPoint(p: number, s1: PlayerId): PlayerId {
        const s2: PlayerId = s1 === 'PLAYER' ? 'AI' : 'PLAYER';
        const isS1 = Math.floor(p / 2) % 2 === 0;
        return isS1 ? s1 : s2;
      }

      // Test with S1 = 'PLAYER' and S1 = 'AI'
      for (const s1 of ['PLAYER', 'AI'] as PlayerId[]) {
        let score = createInitialScore('FULL_SET_6', s1);
        score.playerGames = 6;
        score.aiGames = 6;
        score.isTieBreak = true;
        score.currentServer = s1;
        score.playerTieBreakPoints = 0;
        score.aiTieBreakPoints = 0;

        // Before point 1 is played, server is S1
        expect(score.currentServer).toBe(s1);

        // Keep tie-break alive by alternating winners so diff stays <= 1
        for (let p = 1; p <= 48; p++) {
          // Expected server FOR point p
          const expectedServer = expectedServerForPoint(p, s1);
          expect(score.currentServer).toBe(expectedServer);

          // Play point p: alternate winner to keep tie-break going (p%2 === 1 ? 'PLAYER' : 'AI')
          const winner: PlayerId = p % 2 === 1 ? 'PLAYER' : 'AI';
          const res = awardPoint(score, winner);
          score = res.nextScore;

          // Next point to be played will be (p + 1)
          if (p < 48) {
            const expectedNextServer = expectedServerForPoint(p + 1, s1);
            expect(score.currentServer).toBe(expectedNextServer);
          }
        }
      }
    });
  });

  // ==========================================================================
  // HARNESS 3: ATTACK DEFENSE LOCK STRESS
  // ==========================================================================
  describe('Harness 3: Attack Defense Lock Stress', () => {
    // The 4 attack cards from the catalog + green wildcard declared as attack
    const attackTypes: CardType[] = [
      'SMASH',
      'VOLEIO_ACELERADO',
      'GANCHO_ATA',
      'VERONICA_ATA',
    ];

    it('probes getLegalMoves across each of the 19 cards individually in hand under all attack shots: playableCards is ALWAYS empty, canDig is ALWAYS false, requiresBlueDefense is ALWAYS true', () => {
      // All 19 cards from catalog
      const all19CardTypes = ALL_CARDS.map((c) => c.type);
      expect(all19CardTypes).toHaveLength(19);

      // Test every attack shot in both definition and instance formats, plus Coringa declared as each attack
      const incomingAttacks: Array<{ card: CardInstance; declaredAs?: CardType; name: string }> = [];

      for (const atk of attackTypes) {
        incomingAttacks.push({
          card: createCardInstance(atk, 'AI'),
          name: `Direct ${atk}`,
        });
        incomingAttacks.push({
          card: createCardInstance('GOLPE_UBT_CORINGA', 'AI', atk),
          declaredAs: atk,
          name: `Wildcard declared as ${atk}`,
        });
      }

      expect(incomingAttacks).toHaveLength(8);

      for (const atk of incomingAttacks) {
        // 1. Verify isAttackShot returns true
        expect(isAttackShot(atk.card, atk.declaredAs)).toBe(true);

        // 2. Test with empty hand
        const emptyMoves = getLegalMoves([], atk.card, atk.declaredAs);
        expect(emptyMoves.playableCards).toEqual([]);
        expect(emptyMoves.canDig).toBe(false);
        expect(emptyMoves.requiresBlueDefense).toBe(true);

        // 3. Test with each of the 19 cards individually in hand
        for (const cardType of all19CardTypes) {
          const singleCardHand = [createCardInstance(cardType, 'PLAYER')];
          const moves = getLegalMoves(singleCardHand, atk.card, atk.declaredAs);

          expect(moves.playableCards).toEqual([]);
          expect(moves.canDig).toBe(false);
          expect(moves.requiresBlueDefense).toBe(true);
        }

        // 4. Test with all 19 cards simultaneously in hand
        const fullHandOfAll19 = all19CardTypes.map((type) => createCardInstance(type, 'PLAYER'));
        const fullHandMoves = getLegalMoves(fullHandOfAll19, atk.card, atk.declaredAs);
        expect(fullHandMoves.playableCards).toEqual([]);
        expect(fullHandMoves.canDig).toBe(false);
        expect(fullHandMoves.requiresBlueDefense).toBe(true);
      }
    });

    it('fuzzes 1,000 random hands (sizes 1 to 10) under randomized attacks: 0 violations of the defense lock', () => {
      const TOTAL_HAND_TESTS = 1000;
      const all19CardTypes = ALL_CARDS.map((c) => c.type);

      let totalTested = 0;

      for (let i = 0; i < TOTAL_HAND_TESTS; i++) {
        // Random hand of 1 to 10 cards
        const handSize = Math.floor(Math.random() * 10) + 1;
        const hand: CardInstance[] = [];
        for (let h = 0; h < handSize; h++) {
          const randomType = all19CardTypes[Math.floor(Math.random() * all19CardTypes.length)]!;
          hand.push(createCardInstance(randomType, 'PLAYER'));
        }

        // Random attack shot
        const atkType = attackTypes[Math.floor(Math.random() * attackTypes.length)]!;
        const isWildcard = Math.random() < 0.5;
        const incomingCard = isWildcard
          ? createCardInstance('GOLPE_UBT_CORINGA', 'AI', atkType)
          : createCardInstance(atkType, 'AI');
        const declaredAs = isWildcard ? atkType : undefined;

        const moves = getLegalMoves(hand, incomingCard, declaredAs);

        // Strict invariant assertions
        expect(moves.playableCards).toHaveLength(0);
        expect(moves.canDig).toBe(false);
        expect(moves.requiresBlueDefense).toBe(true);
        totalTested++;
      }

      expect(totalTested).toBe(TOTAL_HAND_TESTS);
    });

    it('verifies validateTurnPlay strictly rejects all 12 green cards and 3 orange cards when receiving an attack', () => {
      for (const atk of attackTypes) {
        const incoming = createCardInstance(atk, 'AI');

        // Test all green cards (11 regular + 1 coringa)
        const greenCards = ALL_CARDS.filter((c) => c.color === 'GREEN');
        expect(greenCards).toHaveLength(12);

        for (const green of greenCards) {
          const playedInstance = createCardInstance(green.type, 'PLAYER');
          const res = validateTurnPlay(incoming, playedInstance);
          expect(res.isValid).toBe(false);
          expect(res.error).toMatch(/não podem ser defendidos com cartas verdes da mão/);
        }

        // Test all orange cards (3 serve cards)
        const orangeCards = ALL_CARDS.filter((c) => c.color === 'ORANGE');
        expect(orangeCards).toHaveLength(3);

        for (const orange of orangeCards) {
          const playedInstance = createCardInstance(orange.type, 'PLAYER');
          const res = validateTurnPlay(incoming, playedInstance);
          expect(res.isValid).toBe(false);
          expect(res.error).toMatch(/Cartas de saque laranjas não podem ser jogadas/);
        }

        // Test blue cards: regular blue cards must be valid
        const regularBlueCards = ['DEF_CURTA', 'DEF_NEUTRA', 'DEF_LOB'] as CardType[];
        for (const blue of regularBlueCards) {
          const blueInstance = createCardInstance(blue, 'PLAYER');
          const res = validateTurnPlay(incoming, blueInstance);
          expect(res.isValid).toBe(true);
        }

        // Blue wildcard: valid with declaration, invalid without
        const blueWildcardValid = createCardInstance('DEF_UBT_CORINGA', 'PLAYER', 'DEF_CURTA');
        expect(validateTurnPlay(incoming, blueWildcardValid).isValid).toBe(true);

        const blueWildcardUndeclared = createCardInstance('DEF_UBT_CORINGA', 'PLAYER');
        expect(validateTurnPlay(incoming, blueWildcardUndeclared).isValid).toBe(false);
      }
    });
  });
});
