/**
 * tests/unit/challenger_m2.test.ts
 *
 * EMPIRICAL ADVERSARIAL STRESS HARNESS - MILESTONE M2
 * Controlador de Inteligência Artificial (aiController.ts)
 *
 * Verification Scope & Tasks:
 * 1. Serve Prediction Accuracy:
 *    - AIHistoryTracker with skewed human serve distributions (e.g. human serves zone 1 80% of the time).
 *    - Verify Hard Bot covers zone 1 >= 95% of the time across 1,000 online simulated serves and across skewed zones (1, 2, 3).
 * 2. Wildcard Conservation Invariant:
 *    - 1,000 hands for Medium Bot holding normal valid cards + Green Coringa -> Coringa played: strictly 0.
 *    - 1,000 hands for Hard Bot holding normal valid cards + Green Coringa -> Coringa played: strictly 0.
 *    - Contrast: When Coringa is the only valid card, it is played 100% of the time.
 * 3. Attack Prioritization:
 *    - 1,000 hands for Medium Bot holding attack and non-attack cards -> attack prioritized 100%.
 *    - 1,000 hands for Hard Bot holding attack and non-attack cards -> attack prioritized under neutral & low-defense states.
 *    - Analysis of Hard Bot's trade-off between attack (50 pts) and targeted scarcity exploitation.
 * 4. Adversarial Invariants & Failure Modes:
 *    - 5,000 randomized ralis: strict legality invariant across all 3 difficulties (0 invalid moves).
 *    - Mandatory blue defense under attack (1,000 checks, 100% DRAW_BLUE_DEFENSE).
 *    - Blue Coringa declaration safety: Medium & Hard never declare DEF_LOB (1,000 trials).
 *    - Empty hand / no playable cards: strictly triggers DIG.
 */

import { describe, it, expect } from 'vitest';
import type {
  CardInstance,
  CardType,
  PlayerId,
  ServeNumber,
  RNG,
} from '../../src/engine/types';
import { CARDS_CATALOG } from '../../src/engine/cardsCatalog';
import {
  getLegalMoves,
  isValidResponse,
} from '../../src/engine/rallyValidator';
import {
  chooseReceiveZones,
  chooseRallyPlay,
  chooseBlueDefenseDeclaration,
  createAIHistoryTracker,
  recordPlayerServe,
  recordDiscardedCard,
  getMostFrequentServeZone,
  getScarcestResponseGroup,
} from '../../src/engine/aiController';

// ============================================================================
// DETERMINISTIC PRNG (Mulberry32)
// ============================================================================
function mulberry32(seed: number): RNG {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t >>> 0) / 4294967296;
  };
}

function makeCard(type: CardType, owner: PlayerId = 'AI', idSuffix = ''): CardInstance {
  const def = CARDS_CATALOG[type];
  if (!def) throw new Error(`[TestFixture] Unknown card type: ${type}`);
  return {
    instanceId: `inst_${owner}_${type}_${idSuffix}`,
    cardId: def.id,
    definition: def,
    owner,
    declaredAs: undefined,
  };
}

describe('Empirical Adversarial Verification - Milestone M2 (AI Controller)', () => {

  // ==========================================================================
  // TASK 1: SERVE PREDICTION ACCURACY
  // ==========================================================================
  describe('Task 1: Serve Prediction Accuracy with Skewed Human Distributions', () => {
    it('Hard Bot covers zone 1 >= 95% of the time across 1,000 online sequential serves (80% Zone 1 skew)', () => {
      const rng = mulberry32(1001);
      let tracker = createAIHistoryTracker();
      const totalPoints = 1000;
      let zone1CoveredCount = 0;
      let totalActualServesZone1 = 0;

      for (let point = 0; point < totalPoints; point++) {
        // AI chooses receive zones before the serve
        const aiReceiveZones = chooseReceiveZones('HARD', tracker, rng);

        // Check if AI covers zone 1 on this point
        if (aiReceiveZones.includes(1)) {
          zone1CoveredCount++;
        }

        // Simulate human serve: 80% zone 1, 10% zone 2, 10% zone 3
        const r = rng();
        let humanServe: ServeNumber;
        if (r < 0.80) {
          humanServe = 1;
        } else if (r < 0.90) {
          humanServe = 2;
        } else {
          humanServe = 3;
        }

        if (humanServe === 1) {
          totalActualServesZone1++;
        }

        // Record the human serve in history tracker
        tracker = recordPlayerServe(tracker, humanServe);
      }

      const coverageRatio = zone1CoveredCount / totalPoints;
      const actualServeRatio = totalActualServesZone1 / totalPoints;

      console.log(`[Task 1 Serve Skew Zone 1] Total Points: ${totalPoints}`);
      console.log(`[Task 1 Serve Skew Zone 1] Human Zone 1 Serves: ${totalActualServesZone1} (${(actualServeRatio * 100).toFixed(2)}%)`);
      console.log(`[Task 1 Serve Skew Zone 1] Hard Bot Covered Zone 1: ${zone1CoveredCount} (${(coverageRatio * 100).toFixed(2)}%)`);

      // Invariant: Hard bot must cover zone 1 >= 95% of the time (requirement)
      expect(coverageRatio).toBeGreaterThanOrEqual(0.95);
      // In practice, once tracker registers zone 1 frequency, it covers zone 1 on >= 99% of turns
      expect(coverageRatio).toBeGreaterThanOrEqual(0.99);
    });

    it('verifies Hard Bot adaptation across all 3 zones with 80% skew (Zones 1, 2, and 3)', () => {
      const testZones: ServeNumber[] = [1, 2, 3];

      for (const targetZone of testZones) {
        const rng = mulberry32(2000 + targetZone);
        let tracker = createAIHistoryTracker();
        const totalPoints = 1000;
        let targetCoveredCount = 0;

        for (let point = 0; point < totalPoints; point++) {
          const aiReceiveZones = chooseReceiveZones('HARD', tracker, rng);
          if (aiReceiveZones.includes(targetZone)) {
            targetCoveredCount++;
          }

          // 80% target zone, 10% each of other two
          const r = rng();
          let humanServe: ServeNumber;
          const others = testZones.filter((z) => z !== targetZone);
          if (r < 0.80) {
            humanServe = targetZone;
          } else if (r < 0.90) {
            humanServe = others[0]!;
          } else {
            humanServe = others[1]!;
          }

          tracker = recordPlayerServe(tracker, humanServe);
        }

        const coverageRatio = targetCoveredCount / totalPoints;
        console.log(`[Task 1 Multi-Zone] Target Zone ${targetZone} Coverage: ${targetCoveredCount}/1000 (${(coverageRatio * 100).toFixed(2)}%)`);
        expect(coverageRatio).toBeGreaterThanOrEqual(0.95);
      }
    });

    it('verifies 100% deterministic coverage of dominant zone on pre-populated trackers', () => {
      const rng = mulberry32(3001);

      // Pre-populate tracker with 80 serves to zone 1, 10 to zone 2, 10 to zone 3
      let tracker = createAIHistoryTracker();
      for (let i = 0; i < 80; i++) tracker = recordPlayerServe(tracker, 1);
      for (let i = 0; i < 10; i++) tracker = recordPlayerServe(tracker, 2);
      for (let i = 0; i < 10; i++) tracker = recordPlayerServe(tracker, 3);

      expect(getMostFrequentServeZone(tracker)).toBe(1);

      // Over 500 independent decisions, Hard Bot must cover zone 1 in 100% of cases
      for (let i = 0; i < 500; i++) {
        const zones = chooseReceiveZones('HARD', tracker, rng);
        expect(zones.includes(1)).toBe(true);
      }
    });
  });

  // ==========================================================================
  // TASK 2: WILDCARD CONSERVATION INVARIANT
  // ==========================================================================
  describe('Task 2: Wildcard Conservation Invariant (1,000 Hands)', () => {
    it('Medium Bot: NEVER plays Green Coringa in 1,000 hands when a normal valid card is available (Strictly 0)', () => {
      const rng = mulberry32(4001);
      let coringaPlays = 0;
      let normalPlays = 0;
      const trials = 1000;

      // Pool of valid incoming cards and matching normal cards
      const testCases: { incoming: CardType; normalValid: CardType }[] = [
        { incoming: 'DEF_CURTA', normalValid: 'BANDEJA_CURTA' },
        { incoming: 'DEF_CURTA', normalValid: 'BANDEJA_LOB' },
        { incoming: 'DEF_NEUTRA', normalValid: 'VOLEIO_PINGADA' },
        { incoming: 'DEF_NEUTRA', normalValid: 'VOLEIO_ACELERADO' },
        { incoming: 'DEF_LOB', normalValid: 'SMASH' },
        { incoming: 'DEF_LOB', normalValid: 'GANCHO_DEF' },
      ];

      for (let i = 0; i < trials; i++) {
        const testCase = testCases[i % testCases.length]!;
        const incoming = makeCard(testCase.incoming, 'PLAYER', `in_${i}`);

        // Hand holds: normal valid card, Green Coringa, and an invalid card
        const hand: CardInstance[] = [
          makeCard(testCase.normalValid, 'AI', `valid_${i}`),
          makeCard('GOLPE_UBT_CORINGA', 'AI', `coringa_${i}`),
          makeCard(testCase.incoming === 'DEF_LOB' ? 'BANDEJA_CURTA' : 'SMASH', 'AI', `invalid_${i}`),
        ];

        const choice = chooseRallyPlay(hand, incoming, 'MEDIUM', undefined, rng);

        if (choice.action === 'PLAY_WILDCARD' || choice.cardInstance?.definition.type === 'GOLPE_UBT_CORINGA') {
          coringaPlays++;
        } else if (choice.action === 'PLAY_HAND') {
          normalPlays++;
        }
      }

      console.log(`[Task 2 Wildcard Medium] Trials: ${trials}, Coringa Plays: ${coringaPlays}, Normal Plays: ${normalPlays}`);
      // Invariant: Coringa plays MUST be strictly 0
      expect(coringaPlays).toBe(0);
      expect(normalPlays).toBe(trials);
    });

    it('Hard Bot: NEVER plays Green Coringa in 1,000 hands when a normal valid card is available (Strictly 0)', () => {
      const rng = mulberry32(5001);
      let coringaPlays = 0;
      let normalPlays = 0;
      const trials = 1000;

      const testCases: { incoming: CardType; normalValid: CardType }[] = [
        { incoming: 'DEF_CURTA', normalValid: 'BANDEJA_CURTA' },
        { incoming: 'DEF_CURTA', normalValid: 'BANDEJA_LOB_CHUTADO' },
        { incoming: 'DEF_NEUTRA', normalValid: 'VOLEIO_PINGADA' },
        { incoming: 'DEF_NEUTRA', normalValid: 'VOLEIO_ACELERADO' },
        { incoming: 'DEF_LOB', normalValid: 'SMASH' },
        { incoming: 'DEF_LOB', normalValid: 'VERONICA_ATA' },
      ];

      for (let i = 0; i < trials; i++) {
        const testCase = testCases[i % testCases.length]!;
        const incoming = makeCard(testCase.incoming, 'PLAYER', `in_${i}`);

        const hand: CardInstance[] = [
          makeCard(testCase.normalValid, 'AI', `valid_${i}`),
          makeCard('GOLPE_UBT_CORINGA', 'AI', `coringa_${i}`),
          makeCard(testCase.incoming === 'DEF_LOB' ? 'BANDEJA_CURTA' : 'SMASH', 'AI', `invalid_${i}`),
        ];

        const choice = chooseRallyPlay(hand, incoming, 'HARD', undefined, rng);

        if (choice.action === 'PLAY_WILDCARD' || choice.cardInstance?.definition.type === 'GOLPE_UBT_CORINGA') {
          coringaPlays++;
        } else if (choice.action === 'PLAY_HAND') {
          normalPlays++;
        }
      }

      console.log(`[Task 2 Wildcard Hard] Trials: ${trials}, Coringa Plays: ${coringaPlays}, Normal Plays: ${normalPlays}`);
      // Invariant: Coringa plays MUST be strictly 0
      expect(coringaPlays).toBe(0);
      expect(normalPlays).toBe(trials);
    });

    it('Contrast Check: Both Medium and Hard bots DO play Green Coringa when it is the ONLY valid card in hand', () => {
      const rng = mulberry32(6001);
      const incoming = makeCard('DEF_CURTA', 'PLAYER'); // Requires BANDEJAS
      const hand: CardInstance[] = [
        makeCard('SMASH', 'AI'),             // Invalid (Fundo)
        makeCard('VOLEIO_PINGADA', 'AI'),    // Invalid (Voleios)
        makeCard('GOLPE_UBT_CORINGA', 'AI'), // ONLY valid card!
      ];

      for (let i = 0; i < 100; i++) {
        const choiceMed = chooseRallyPlay(hand, incoming, 'MEDIUM', undefined, rng);
        expect(choiceMed.action).toBe('PLAY_WILDCARD');
        expect(choiceMed.cardInstance?.definition.type).toBe('GOLPE_UBT_CORINGA');

        const choiceHard = chooseRallyPlay(hand, incoming, 'HARD', undefined, rng);
        expect(choiceHard.action).toBe('PLAY_WILDCARD');
        expect(choiceHard.cardInstance?.definition.type).toBe('GOLPE_UBT_CORINGA');
      }
    });
  });

  // ==========================================================================
  // TASK 3: ATTACK PRIORITIZATION
  // ==========================================================================
  describe('Task 3: Attack Prioritization (1,000 Hands)', () => {
    it('Medium Bot: 1,000 hands holding attack and non-attack cards -> attacks prioritized 100% of the time', () => {
      const rng = mulberry32(7001);
      let attackPlays = 0;
      let nonAttackPlays = 0;
      const trials = 1000;

      // Incoming DEF_LOB requires FUNDO.
      // Valid attack cards: SMASH, GANCHO_ATA, VERONICA_ATA
      // Valid non-attack cards: GANCHO_DEF, VERONICA_DEF
      const incoming = makeCard('DEF_LOB', 'PLAYER');

      for (let i = 0; i < trials; i++) {
        const hand: CardInstance[] = [
          makeCard('GANCHO_DEF', 'AI', `nonatk_${i}`),
          makeCard('SMASH', 'AI', `atk_${i}`),
          makeCard('VERONICA_DEF', 'AI', `nonatk2_${i}`),
        ];

        const choice = chooseRallyPlay(hand, incoming, 'MEDIUM', undefined, rng);
        expect(choice.action).toBe('PLAY_HAND');
        expect(choice.cardInstance).toBeDefined();

        if (choice.cardInstance?.definition.isAttack) {
          attackPlays++;
        } else {
          nonAttackPlays++;
        }
      }

      console.log(`[Task 3 Medium Attack Priority] Trials: ${trials}, Attacks: ${attackPlays} (100%), Non-Attacks: ${nonAttackPlays}`);
      expect(attackPlays).toBe(trials);
      expect(nonAttackPlays).toBe(0);
    });

    it('Hard Bot: 1,000 hands holding attack and non-attack cards under neutral history -> attacks prioritized 100% of the time', () => {
      const rng = mulberry32(8001);
      let attackPlays = 0;
      let nonAttackPlays = 0;
      const trials = 1000;

      const incoming = makeCard('DEF_LOB', 'PLAYER');

      for (let i = 0; i < trials; i++) {
        const hand: CardInstance[] = [
          makeCard('GANCHO_DEF', 'AI', `nonatk_${i}`),
          makeCard('SMASH', 'AI', `atk_${i}`),
          makeCard('VERONICA_DEF', 'AI', `nonatk2_${i}`),
        ];

        const tracker = createAIHistoryTracker(); // neutral history
        const choice = chooseRallyPlay(hand, incoming, 'HARD', tracker, rng);
        expect(choice.action).toBe('PLAY_HAND');

        if (choice.cardInstance?.definition.isAttack) {
          attackPlays++;
        } else {
          nonAttackPlays++;
        }
      }

      console.log(`[Task 3 Hard Attack Neutral] Trials: ${trials}, Attacks: ${attackPlays} (100%), Non-Attacks: ${nonAttackPlays}`);
      expect(attackPlays).toBe(trials);
      expect(nonAttackPlays).toBe(0);
    });

    it('Hard Bot: attacks prioritized 100% when opponent Blue Deck has <= 3 defenses remaining', () => {
      const rng = mulberry32(8501);
      let attackPlays = 0;
      const trials = 500;
      const incoming = makeCard('DEF_LOB', 'PLAYER');

      for (let i = 0; i < trials; i++) {
        let tracker = createAIHistoryTracker();
        // Discard 6 blue defenses -> remaining DEFESAS = 2 (<= 3)
        for (let d = 0; d < 6; d++) {
          tracker = recordDiscardedCard(tracker, 'DEF_CURTA');
        }

        const hand: CardInstance[] = [
          makeCard('GANCHO_DEF', 'AI', `nonatk_${i}`),
          makeCard('SMASH', 'AI', `atk_${i}`),
        ];

        const choice = chooseRallyPlay(hand, incoming, 'HARD', tracker, rng);
        if (choice.cardInstance?.definition.isAttack) {
          attackPlays++;
        }
      }

      console.log(`[Task 3 Hard Low Blue Deck] Trials: ${trials}, Attacks: ${attackPlays} (100%)`);
      expect(attackPlays).toBe(trials);
    });

    it('Hard Bot: demonstrates deliberate tactical tradeoff between Attack and Scarcity Exploitation', () => {
      const rng = mulberry32(8601);
      let tracker = createAIHistoryTracker();

      // Simulate opponent having discarded multiple BANDEJAS cards (BANDEJAS is scarce in opponent hand)
      tracker = recordDiscardedCard(tracker, 'BANDEJA_CURTA');
      tracker = recordDiscardedCard(tracker, 'BANDEJA_LOB');
      tracker = recordDiscardedCard(tracker, 'BANDEJA_LOB_CHUTADO');

      expect(getScarcestResponseGroup(tracker)).toBe('BANDEJAS');

      // Hand against DEF_NEUTRA (requires VOLEIOS):
      // Option 1: VOLEIO_ACELERADO (Attack, forces DEFESAS: base 50 pts)
      // Option 2: VOLEIO_PINGADA (Non-attack, forces BANDEJAS: 35 scarcity + 20 bandejas + 45 discards = 100 pts)
      const incoming = makeCard('DEF_NEUTRA', 'PLAYER');
      const hand: CardInstance[] = [
        makeCard('VOLEIO_ACELERADO', 'AI'), // Attack
        makeCard('VOLEIO_PINGADA', 'AI'),   // Exploits opponent's scarce BANDEJAS
      ];

      const choice = chooseRallyPlay(hand, incoming, 'HARD', tracker, rng);
      // Hard Bot tactically prefers exploiting the scarce BANDEJAS group over a standard attack
      expect(choice.action).toBe('PLAY_HAND');
      expect(choice.cardInstance?.definition.type).toBe('VOLEIO_PINGADA');
      expect(choice.cardInstance?.definition.requiredResponse).toBe('BANDEJAS');
    });
  });

  // ==========================================================================
  // TASK 4: ADVERSARIAL STRESS & INVARIANTS HARNESS
  // ==========================================================================
  describe('Task 4: Adversarial Stress & Core Legality Invariants', () => {
    it('Strict Legality Invariant: 3,000 randomized ralis across all difficulties produce 0 illegal moves', () => {
      const rng = mulberry32(9001);
      const difficulties = ['EASY', 'MEDIUM', 'HARD'] as const;
      const allGreenCards: CardType[] = [
        'BANDEJA_CURTA', 'BANDEJA_LOB_CHUTADO', 'BANDEJA_LOB',
        'VOLEIO_PINGADA', 'VOLEIO_ACELERADO', 'VOLEIO_LOB',
        'SMASH', 'GANCHO_ATA', 'VERONICA_ATA',
        'GANCHO_DEF', 'VERONICA_DEF', 'GOLPE_UBT_CORINGA',
      ];
      const incomingCardPool: CardType[] = [
        'DEF_CURTA', 'DEF_NEUTRA', 'DEF_LOB',
        'BANDEJA_CURTA', 'BANDEJA_LOB_CHUTADO', 'BANDEJA_LOB',
        'VOLEIO_PINGADA', 'VOLEIO_LOB',
        'GANCHO_DEF', 'VERONICA_DEF',
      ];

      let totalLegalMovesVerified = 0;
      let totalDigs = 0;

      for (const diff of difficulties) {
        for (let i = 0; i < 1000; i++) {
          const incType = incomingCardPool[Math.floor(rng() * incomingCardPool.length)]!;
          const incoming = makeCard(incType, 'PLAYER', `in_${diff}_${i}`);

          // Build random hand of 1 to 5 green cards
          const handSize = Math.floor(rng() * 5) + 1;
          const hand: CardInstance[] = [];
          for (let h = 0; h < handSize; h++) {
            const cardType = allGreenCards[Math.floor(rng() * allGreenCards.length)]!;
            hand.push(makeCard(cardType, 'AI', `h_${diff}_${i}_${h}`));
          }

          const legal = getLegalMoves(hand, incoming);
          const choice = chooseRallyPlay(hand, incoming, diff, undefined, rng);

          if (legal.playableCards.length === 0) {
            // Hand has no playable cards -> must DIG
            expect(choice.action).toBe('DIG');
            totalDigs++;
          } else {
            // Must play a valid card
            expect(['PLAY_HAND', 'PLAY_WILDCARD']).toContain(choice.action);
            expect(choice.cardInstance).toBeDefined();

            // Must be among playableCards
            const isLegal = legal.playableCards.some(
              (c) => c.instanceId === choice.cardInstance?.instanceId
            );
            expect(isLegal).toBe(true);

            // Turn validator must accept the move
            const valid = isValidResponse(
              incoming,
              choice.cardInstance!,
              choice.declaredCardType
            );
            expect(valid).toBe(true);
            totalLegalMovesVerified++;
          }
        }
      }

      console.log(`[Task 4 Legality Fuzzing] 3,000 trials: ${totalLegalMovesVerified} legal plays, ${totalDigs} valid digs, 0 errors.`);
    });

    it('Mandatory Blue Defense: Incoming attack ALWAYS forces DRAW_BLUE_DEFENSE across 1,000 trials', () => {
      const rng = mulberry32(9501);
      const attackCards: CardType[] = ['SMASH', 'GANCHO_ATA', 'VERONICA_ATA', 'VOLEIO_ACELERADO'];

      for (let i = 0; i < 1000; i++) {
        const atkType = attackCards[i % attackCards.length]!;
        const incoming = makeCard(atkType, 'PLAYER', `atk_${i}`);

        // Even with a full hand of green cards and Coringas
        const hand = [
          makeCard('SMASH', 'AI'),
          makeCard('GOLPE_UBT_CORINGA', 'AI'),
          makeCard('BANDEJA_CURTA', 'AI'),
        ];

        for (const diff of ['EASY', 'MEDIUM', 'HARD'] as const) {
          const choice = chooseRallyPlay(hand, incoming, diff, undefined, rng);
          expect(choice.action).toBe('DRAW_BLUE_DEFENSE');
          expect(choice.cardInstance).toBeUndefined();
        }
      }
    });

    it('Blue Coringa Declaration: Medium and Hard bots NEVER declare DEF_LOB over 1,000 trials (Strictly 0)', () => {
      const rng = mulberry32(9801);
      let medLobCount = 0;
      let hardLobCount = 0;
      const trials = 1000;

      for (let i = 0; i < trials; i++) {
        const medDecl = chooseBlueDefenseDeclaration('MEDIUM', undefined, rng);
        if (medDecl === 'DEF_LOB') medLobCount++;

        const hardDecl = chooseBlueDefenseDeclaration('HARD', undefined, rng);
        if (hardDecl === 'DEF_LOB') hardLobCount++;
      }

      console.log(`[Task 4 Blue Coringa Safety] Trials: ${trials}, Medium DEF_LOB: ${medLobCount}, Hard DEF_LOB: ${hardLobCount}`);
      expect(medLobCount).toBe(0);
      expect(hardLobCount).toBe(0);
    });

    it('Empty Hand Guard: 0 cards in hand strictly produces DIG across all difficulties', () => {
      const incoming = makeCard('DEF_CURTA', 'PLAYER');
      const emptyHand: CardInstance[] = [];

      for (const diff of ['EASY', 'MEDIUM', 'HARD'] as const) {
        const choice = chooseRallyPlay(emptyHand, incoming, diff);
        expect(choice.action).toBe('DIG');
        expect(choice.cardInstance).toBeUndefined();
      }
    });
  });
});
