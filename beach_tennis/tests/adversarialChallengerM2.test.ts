/**
 * tests/adversarialChallengerM2.test.ts
 *
 * Empirical Adversarial Challenger Verification Suite for Milestone M2:
 * Controlador de Inteligência Artificial (`src/engine/aiController.ts`)
 *
 * Challenger: challenger_m2_1
 *
 * Comprehensive Empirical Stress Testing Requirements:
 * 1. 10,000 random rally situations across Easy, Medium, and Hard bots.
 * 2. Strict Legality: DOES THE AI EVER RETURN AN ILLEGAL MOVE? (Must be strictly 0 violations).
 * 3. Containment: If playableCards.length > 0, chosen card MUST be contained within playableCards.
 * 4. Attack Invariant: Under attack, AI action is ALWAYS DRAW_BLUE_DEFENSE.
 * 5. Dig Invariant: With 0 legal cards and canDig === true, AI action is ALWAYS DIG.
 * 6. Wildcard Conservation: Medium/Hard never burn GOLPE_UBT_CORINGA when normal cards are playable.
 * 7. Boundary & Stress: Empty hands, corrupted mixed-color hands, exhausted blue decks.
 */

import { describe, it, expect } from 'vitest';
import type {
  AIDifficulty,
  AIHistoryTracker,
  CardInstance,
  CardType,
  GreenCardType,
  BlueCardType,
  PlayerId,
  RNG,
} from '../src/engine/types';
import { CARDS_CATALOG, ALL_CARDS } from '../src/engine/cardsCatalog';
import {
  getLegalMoves,
  validateTurnPlay,
} from '../src/engine/rallyValidator';
import {
  chooseRallyPlay,
  chooseServeZone,
  chooseReceiveZones,
  createAIHistoryTracker,
  recordPlayerServe,
  recordPlayerReceive,
  recordDiscardedCard,
} from '../src/engine/aiController';

// ============================================================================
// DETERMINISTIC PSEUDO-RANDOM NUMBER GENERATOR (Mulberry32)
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

// ============================================================================
// ADVERSARIAL GENERATOR HELPERS
// ============================================================================

const ALL_GREEN_CARDS: GreenCardType[] = [
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
  'GOLPE_UBT_CORINGA',
];

const ATTACK_CARD_TYPES: GreenCardType[] = [
  'SMASH',
  'VOLEIO_ACELERADO',
  'GANCHO_ATA',
  'VERONICA_ATA',
];

let globalInstanceCounter = 0;

function createCard(
  type: CardType,
  owner: PlayerId = 'AI',
  declaredAs?: CardType
): CardInstance {
  const def = CARDS_CATALOG[type];
  if (!def) {
    throw new Error(`[Challenger] Unknown card type: ${type}`);
  }
  return {
    instanceId: `inst_${owner.toLowerCase()}_${type}_${++globalInstanceCounter}`,
    cardId: def.id,
    definition: def,
    owner,
    declaredAs,
  };
}

/**
 * Generates an incoming ball representing any legitimate rally situation:
 * - Regular green card
 * - Green attack card
 * - Green wildcard declared as attack or non-attack
 * - Regular blue defense card
 * - Blue wildcard declared as DEF_CURTA, DEF_NEUTRA, or DEF_LOB
 */
function generateRandomIncomingCard(rng: RNG): CardInstance {
  const r = rng();

  if (r < 0.25) {
    // 25% Attack cards
    const type = ATTACK_CARD_TYPES[Math.floor(rng() * ATTACK_CARD_TYPES.length)]!;
    return createCard(type, 'PLAYER');
  }

  if (r < 0.35) {
    // 10% Green Coringa declared as either attack or normal
    const declTypes: GreenCardType[] = ALL_GREEN_CARDS.filter((c) => c !== 'GOLPE_UBT_CORINGA');
    const declaredAs = declTypes[Math.floor(rng() * declTypes.length)]!;
    return createCard('GOLPE_UBT_CORINGA', 'PLAYER', declaredAs);
  }

  if (r < 0.70) {
    // 35% Regular green non-attack cards
    const nonAttacks: GreenCardType[] = ALL_GREEN_CARDS.filter(
      (c) => !ATTACK_CARD_TYPES.includes(c) && c !== 'GOLPE_UBT_CORINGA'
    );
    const type = nonAttacks[Math.floor(rng() * nonAttacks.length)]!;
    return createCard(type, 'PLAYER');
  }

  if (r < 0.90) {
    // 20% Regular blue defense cards
    const regularBlues: BlueCardType[] = ['DEF_CURTA', 'DEF_NEUTRA', 'DEF_LOB'];
    const type = regularBlues[Math.floor(rng() * regularBlues.length)]!;
    return createCard(type, 'PLAYER');
  }

  // 10% Blue Coringa with valid declaration
  const blueDecls: BlueCardType[] = ['DEF_CURTA', 'DEF_NEUTRA', 'DEF_LOB'];
  const decl = blueDecls[Math.floor(rng() * blueDecls.length)]!;
  return createCard('DEF_UBT_CORINGA', 'PLAYER', decl);
}

/**
 * Generates a randomized hand of cards with varying sizes and compositions.
 * Includes boundary conditions: 0 cards, 1 card, normal 6 cards, 8 cards,
 * pure coringas, zero legal cards, etc.
 */
function generateRandomHand(rng: RNG): CardInstance[] {
  const handSizeDistribution = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const handSize = handSizeDistribution[Math.floor(rng() * handSizeDistribution.length)]!;

  const hand: CardInstance[] = [];
  for (let i = 0; i < handSize; i++) {
    const cardType = ALL_GREEN_CARDS[Math.floor(rng() * ALL_GREEN_CARDS.length)]!;
    hand.push(createCard(cardType, 'AI'));
  }
  return hand;
}

/**
 * Generates an adversarial AIHistoryTracker with arbitrary serve/receive patterns
 * and discard states.
 */
function generateRandomHistoryTracker(rng: RNG): AIHistoryTracker | undefined {
  if (rng() < 0.2) {
    return undefined; // 20% cold-start / undefined tracker
  }

  let tracker = createAIHistoryTracker();

  // Simulate 0 to 15 serves
  const numServes = Math.floor(rng() * 16);
  for (let i = 0; i < numServes; i++) {
    const zone = (1 + Math.floor(rng() * 3)) as 1 | 2 | 3;
    tracker = recordPlayerServe(tracker, zone);
  }

  // Simulate 0 to 15 receives
  const numReceives = Math.floor(rng() * 16);
  for (let i = 0; i < numReceives; i++) {
    const z1 = (1 + Math.floor(rng() * 3)) as 1 | 2 | 3;
    let z2 = (1 + Math.floor(rng() * 3)) as 1 | 2 | 3;
    while (z2 === z1) {
      z2 = (1 + Math.floor(rng() * 3)) as 1 | 2 | 3;
    }
    tracker = recordPlayerReceive(tracker, [z1, z2]);
  }

  // Simulate 0 to 10 discards
  const numDiscards = Math.floor(rng() * 11);
  for (let i = 0; i < numDiscards; i++) {
    const card = ALL_CARDS[Math.floor(rng() * ALL_CARDS.length)]!;
    tracker = recordDiscardedCard(tracker, card.type);
  }

  return tracker;
}

describe('Empirical Adversarial Verification Suite - Milestone M2 (AI Controller)', () => {
  // ==========================================================================
  // HARNESS 1: 10,000 RANDOM RALLY SITUATIONS ACROSS EASY, MEDIUM, AND HARD
  // ==========================================================================
  describe('Harness 1: 10,000 Random Rally Situations (Zero Illegal Moves Assertion)', () => {
    it('executes 10,000 empirical randomized rally situations with strictly 0 illegal moves', () => {
      const TOTAL_RUNS = 10000;
      const rng = mulberry32(20261107);

      const difficulties: AIDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

      let illegalMovesCount = 0;
      let nonContainedCardCount = 0;
      let attackActionViolations = 0;
      let digActionViolations = 0;
      let wildcardDeclarationViolations = 0;
      let turnValidationViolations = 0;

      const actionDistribution: Record<string, number> = {
        PLAY_HAND: 0,
        PLAY_WILDCARD: 0,
        DIG: 0,
        DRAW_BLUE_DEFENSE: 0,
      };

      const difficultyCounts: Record<AIDifficulty, number> = {
        EASY: 0,
        MEDIUM: 0,
        HARD: 0,
      };

      for (let run = 0; run < TOTAL_RUNS; run++) {
        const difficulty = difficulties[run % 3]!;
        difficultyCounts[difficulty]++;

        const hand = generateRandomHand(rng);
        const incomingCard = generateRandomIncomingCard(rng);
        const history = generateRandomHistoryTracker(rng);

        const legalMoves = getLegalMoves(hand, incomingCard, incomingCard.declaredAs);
        const choice = chooseRallyPlay(hand, incomingCard, difficulty, history, rng);

        actionDistribution[choice.action] = (actionDistribution[choice.action] || 0) + 1;

        // --------------------------------------------------------------------
        // ASSERTION 1: UNDER ATTACK -> ALWAYS DRAW_BLUE_DEFENSE
        // --------------------------------------------------------------------
        if (legalMoves.requiresBlueDefense) {
          if (choice.action !== 'DRAW_BLUE_DEFENSE') {
            attackActionViolations++;
            illegalMovesCount++;
          }
          if (choice.cardInstance !== undefined) {
            attackActionViolations++;
            illegalMovesCount++;
          }
        }

        // --------------------------------------------------------------------
        // ASSERTION 2: 0 LEGAL CARDS & canDig === true -> ALWAYS DIG
        // --------------------------------------------------------------------
        if (!legalMoves.requiresBlueDefense && legalMoves.playableCards.length === 0) {
          expect(legalMoves.canDig).toBe(true);
          if (choice.action !== 'DIG') {
            digActionViolations++;
            illegalMovesCount++;
          }
          if (choice.cardInstance !== undefined) {
            digActionViolations++;
            illegalMovesCount++;
          }
        }

        // --------------------------------------------------------------------
        // ASSERTION 3: PLAYABLE CARDS AVAILABLE -> MUST CHOOSE FROM PLAYABLE
        // --------------------------------------------------------------------
        if (!legalMoves.requiresBlueDefense && legalMoves.playableCards.length > 0) {
          if (choice.action !== 'PLAY_HAND' && choice.action !== 'PLAY_WILDCARD') {
            illegalMovesCount++;
          }

          if (!choice.cardInstance) {
            nonContainedCardCount++;
            illegalMovesCount++;
          } else {
            // Verify chosen card is contained within legalMoves.playableCards
            const isContained = legalMoves.playableCards.some(
              (c) => c.instanceId === choice.cardInstance?.instanceId
            );
            if (!isContained) {
              nonContainedCardCount++;
              illegalMovesCount++;
            }

            // If regular play, must validate turn play
            if (choice.action === 'PLAY_HAND') {
              if (choice.cardInstance.definition.type === 'GOLPE_UBT_CORINGA') {
                illegalMovesCount++;
              }
              const turnResult = validateTurnPlay(incomingCard, choice.cardInstance);
              if (!turnResult.isValid) {
                turnValidationViolations++;
                illegalMovesCount++;
              }
            }

            // If wildcard play, must validate declaration
            if (choice.action === 'PLAY_WILDCARD') {
              if (choice.cardInstance.definition.type !== 'GOLPE_UBT_CORINGA') {
                illegalMovesCount++;
              }
              if (!choice.declaredCardType) {
                wildcardDeclarationViolations++;
                illegalMovesCount++;
              } else {
                const turnResult = validateTurnPlay(
                  incomingCard,
                  choice.cardInstance,
                  choice.declaredCardType
                );
                if (!turnResult.isValid) {
                  wildcardDeclarationViolations++;
                  illegalMovesCount++;
                }
              }
            }
          }
        }
      }

      console.log(`[Challenger M2 Harness 1] Summary for ${TOTAL_RUNS} iterations:`);
      console.log(` - Easy Bot runs: ${difficultyCounts.EASY}`);
      console.log(` - Medium Bot runs: ${difficultyCounts.MEDIUM}`);
      console.log(` - Hard Bot runs: ${difficultyCounts.HARD}`);
      console.log(` - Action Breakdown:`, actionDistribution);
      console.log(` - Attack Action Violations: ${attackActionViolations}`);
      console.log(` - Dig Action Violations: ${digActionViolations}`);
      console.log(` - Non-Contained Card Violations: ${nonContainedCardCount}`);
      console.log(` - Wildcard Declaration Violations: ${wildcardDeclarationViolations}`);
      console.log(` - Turn Validation Violations: ${turnValidationViolations}`);
      console.log(` - TOTAL ILLEGAL MOVES: ${illegalMovesCount}`);

      expect(attackActionViolations).toBe(0);
      expect(digActionViolations).toBe(0);
      expect(nonContainedCardCount).toBe(0);
      expect(wildcardDeclarationViolations).toBe(0);
      expect(turnValidationViolations).toBe(0);
      expect(illegalMovesCount).toBe(0);
    });
  });

  // ==========================================================================
  // HARNESS 2: DEDICATED ATTACK TRAPPING (2,000 SCENARIOS)
  // ==========================================================================
  describe('Harness 2: Dedicated Attack Trapping (2,000 Attack Scenarios)', () => {
    it('under attack: verifies 100% adherence to DRAW_BLUE_DEFENSE across 2,000 attack situations', () => {
      const TOTAL_ATTACKS = 2000;
      const rng = mulberry32(777);

      const attackOptions: { type: CardType; declaredAs?: CardType }[] = [
        { type: 'SMASH' },
        { type: 'VOLEIO_ACELERADO' },
        { type: 'GANCHO_ATA' },
        { type: 'VERONICA_ATA' },
        { type: 'GOLPE_UBT_CORINGA', declaredAs: 'SMASH' },
        { type: 'GOLPE_UBT_CORINGA', declaredAs: 'VOLEIO_ACELERADO' },
        { type: 'GOLPE_UBT_CORINGA', declaredAs: 'GANCHO_ATA' },
        { type: 'GOLPE_UBT_CORINGA', declaredAs: 'VERONICA_ATA' },
      ];

      const diffs: AIDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

      for (let i = 0; i < TOTAL_ATTACKS; i++) {
        const diff = diffs[i % 3]!;
        const opt = attackOptions[Math.floor(rng() * attackOptions.length)]!;
        const incoming = createCard(opt.type, 'PLAYER', opt.declaredAs);

        // Hand contains arbitrary cards (including coringas and normal cards)
        const hand = generateRandomHand(rng);
        const history = generateRandomHistoryTracker(rng);

        const legal = getLegalMoves(hand, incoming, incoming.declaredAs);
        expect(legal.requiresBlueDefense).toBe(true);
        expect(legal.playableCards).toHaveLength(0);
        expect(legal.canDig).toBe(false);

        const choice = chooseRallyPlay(hand, incoming, diff, history, rng);

        expect(choice.action).toBe('DRAW_BLUE_DEFENSE');
        expect(choice.cardInstance).toBeUndefined();
        expect(choice.confidence).toBe(1.0);
      }
    });
  });

  // ==========================================================================
  // HARNESS 3: DEDICATED ZERO-LEGAL & EMPTY HAND TRAPPING (2,000 DIG SCENARIOS)
  // ==========================================================================
  describe('Harness 3: Dedicated Zero-Legal & Empty Hand Trapping (2,000 Dig Scenarios)', () => {
    it('with 0 legal cards: verifies 100% adherence to DIG across 2,000 situations', () => {
      const TOTAL_DIGS = 2000;
      const rng = mulberry32(888);
      const diffs: AIDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

      for (let i = 0; i < TOTAL_DIGS; i++) {
        const diff = diffs[i % 3]!;
        // Choose a non-attack incoming card requiring BANDEJAS
        const incoming = createCard('DEF_CURTA', 'PLAYER'); // Requires BANDEJAS

        // Construct hand that has 0 cards satisfying BANDEJAS
        // Valid for BANDEJAS: BANDEJA_CURTA, BANDEJA_LOB, BANDEJA_LOB_CHUTADO, GOLPE_UBT_CORINGA
        // Disallowed: VOLEIOS and FUNDO cards only
        const invalidCards: GreenCardType[] = [
          'VOLEIO_PINGADA',
          'VOLEIO_ACELERADO',
          'VOLEIO_LOB',
          'SMASH',
          'GANCHO_ATA',
          'VERONICA_ATA',
          'GANCHO_DEF',
          'VERONICA_DEF',
        ];

        const handSize = Math.floor(rng() * 6); // 0 to 5 invalid cards
        const hand: CardInstance[] = [];
        for (let j = 0; j < handSize; j++) {
          const type = invalidCards[Math.floor(rng() * invalidCards.length)]!;
          hand.push(createCard(type, 'AI'));
        }

        const legal = getLegalMoves(hand, incoming);
        expect(legal.playableCards).toHaveLength(0);
        expect(legal.canDig).toBe(true);
        expect(legal.requiresBlueDefense).toBe(false);

        const choice = chooseRallyPlay(hand, incoming, diff, undefined, rng);

        expect(choice.action).toBe('DIG');
        expect(choice.cardInstance).toBeUndefined();
      }
    });
  });

  // ==========================================================================
  // HARNESS 4: WILDCARD CONSERVATION STRESS (1,000 SCENARIOS)
  // ==========================================================================
  describe('Harness 4: Medium & Hard Wildcard Conservation Stress (1,000 Scenarios)', () => {
    it('medium and hard AI never burn GOLPE_UBT_CORINGA when normal cards are playable', () => {
      const TRIALS = 1000;
      const rng = mulberry32(999);
      const incoming = createCard('DEF_CURTA', 'PLAYER'); // Requires BANDEJAS

      for (let i = 0; i < TRIALS; i++) {
        const diff: AIDifficulty = i % 2 === 0 ? 'MEDIUM' : 'HARD';

        // Hand has normal BANDEJA card AND Coringa Verde
        const hand = [
          createCard('BANDEJA_CURTA', 'AI'),
          createCard('GOLPE_UBT_CORINGA', 'AI'),
          createCard('SMASH', 'AI'), // Incompatible
        ];

        const choice = chooseRallyPlay(hand, incoming, diff, undefined, rng);

        // Must NEVER play Coringa!
        expect(choice.action).toBe('PLAY_HAND');
        expect(choice.cardInstance?.definition.type).toBe('BANDEJA_CURTA');
        expect(choice.cardInstance?.definition.isWildcard).toBe(false);
      }
    });

    it('medium and hard AI play GOLPE_UBT_CORINGA when it is the ONLY legal option in hand', () => {
      const TRIALS = 500;
      const rng = mulberry32(1111);
      const incoming = createCard('DEF_CURTA', 'PLAYER'); // Requires BANDEJAS

      for (let i = 0; i < TRIALS; i++) {
        const diff: AIDifficulty = i % 2 === 0 ? 'MEDIUM' : 'HARD';

        // Hand has ONLY Coringa Verde as legal card, plus incompatible normal cards
        const hand = [
          createCard('GOLPE_UBT_CORINGA', 'AI'),
          createCard('SMASH', 'AI'),
          createCard('VOLEIO_PINGADA', 'AI'),
        ];

        const choice = chooseRallyPlay(hand, incoming, diff, undefined, rng);

        expect(choice.action).toBe('PLAY_WILDCARD');
        expect(choice.cardInstance?.definition.type).toBe('GOLPE_UBT_CORINGA');
        expect(choice.declaredCardType).toBeDefined();

        const validDeclarations = ['BANDEJA_CURTA', 'BANDEJA_LOB', 'BANDEJA_LOB_CHUTADO'];
        expect(validDeclarations).toContain(choice.declaredCardType);
      }
    });
  });

  // ==========================================================================
  // HARNESS 5: SERVE AND RECEIVE STRICT BOUNDARY FUZZING (1,000 SCENARIOS)
  // ==========================================================================
  describe('Harness 5: Serve & Receive Boundaries (1,000 Scenarios)', () => {
    it('verifies chooseServeZone and chooseReceiveZones always produce strictly valid zones', () => {
      const TRIALS = 1000;
      const rng = mulberry32(2222);
      const diffs: AIDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

      for (let i = 0; i < TRIALS; i++) {
        const diff = diffs[i % 3]!;
        const history = generateRandomHistoryTracker(rng);

        // Serve
        const serveZone = chooseServeZone(diff, history, rng);
        expect(Number.isInteger(serveZone)).toBe(true);
        expect([1, 2, 3]).toContain(serveZone);

        // Receive
        const [z1, z2] = chooseReceiveZones(diff, history, rng);
        expect(Number.isInteger(z1)).toBe(true);
        expect(Number.isInteger(z2)).toBe(true);
        expect([1, 2, 3]).toContain(z1);
        expect([1, 2, 3]).toContain(z2);
        expect(z1).not.toBe(z2);
      }
    });
  });

  // ==========================================================================
  // HARNESS 6: CORRUPTED & MIXED-COLOR HAND RESILIENCE (500 SCENARIOS)
  // ==========================================================================
  describe('Harness 6: Corrupted & Mixed-Color Hands Resilience (500 Scenarios)', () => {
    it('never plays non-green cards even if erroneously present in hand', () => {
      const TRIALS = 500;
      const rng = mulberry32(3333);
      const incoming = createCard('DEF_CURTA', 'PLAYER'); // Requires BANDEJAS
      const diffs: AIDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

      for (let i = 0; i < TRIALS; i++) {
        const diff = diffs[i % 3]!;
        // Hand contains non-green cards mixed with green
        const hasValidGreen = i % 2 === 0;
        const hand: CardInstance[] = [
          createCard('SAQUE_1', 'AI'),
          createCard('SAQUE_2', 'AI'),
          createCard('DEF_CURTA', 'AI'),
          createCard('DEF_NEUTRA', 'AI'),
        ];

        if (hasValidGreen) {
          hand.push(createCard('BANDEJA_CURTA', 'AI'));
        }

        const choice = chooseRallyPlay(hand, incoming, diff, undefined, rng);

        if (hasValidGreen) {
          expect(['PLAY_HAND', 'PLAY_WILDCARD']).toContain(choice.action);
          expect(choice.cardInstance?.definition.color).toBe('GREEN');
          expect(choice.cardInstance?.definition.type).toBe('BANDEJA_CURTA');
        } else {
          // If no valid green cards, must DIG regardless of orange/blue cards in hand
          expect(choice.action).toBe('DIG');
          expect(choice.cardInstance).toBeUndefined();
        }
      }
    });
  });

  // ==========================================================================
  // HARNESS 7: EXTREME HISTORY TRACKER STRESS (500 SCENARIOS)
  // ==========================================================================
  describe('Harness 7: Extreme History Tracker Stress (500 Scenarios)', () => {
    it('hard AI strictly exploits extreme player serve/receive skewing and deck exhaustion', () => {
      const rng = mulberry32(4444);

      // Case A: Player served zone 3 one hundred times
      let trackerA = createAIHistoryTracker();
      for (let i = 0; i < 100; i++) {
        trackerA = recordPlayerServe(trackerA, 3);
      }
      for (let i = 0; i < 50; i++) {
        const receiveZones = chooseReceiveZones('HARD', trackerA, rng);
        expect(receiveZones.includes(3)).toBe(true);
      }

      // Case B: Player received [1, 2] one hundred times -> zone 3 is completely uncovered
      let trackerB = createAIHistoryTracker();
      for (let i = 0; i < 100; i++) {
        trackerB = recordPlayerReceive(trackerB, [1, 2]);
      }
      let zone3Count = 0;
      for (let i = 0; i < 100; i++) {
        const zone = chooseServeZone('HARD', trackerB, rng);
        if (zone === 3) zone3Count++;
      }
      // Epsilon-greedy 75% -> should be >= 65
      expect(zone3Count).toBeGreaterThanOrEqual(65);

      // Case C: Blue deck exhausted (8 blue cards discarded) -> Hard bot chooses attack for instant winner
      let trackerC = createAIHistoryTracker();
      for (let i = 0; i < 8; i++) {
        trackerC = recordDiscardedCard(trackerC, 'DEF_CURTA');
      }
      const incomingC = createCard('DEF_LOB', 'PLAYER'); // Requires FUNDO
      const handC = [
        createCard('GANCHO_DEF', 'AI'), // Non-attack FUNDO
        createCard('SMASH', 'AI'),      // Attack FUNDO
      ];
      for (let i = 0; i < 30; i++) {
        const choice = chooseRallyPlay(handC, incomingC, 'HARD', trackerC, rng);
        expect(choice.action).toBe('PLAY_HAND');
        expect(choice.cardInstance?.definition.type).toBe('SMASH');
      }
    });
  });

  // ==========================================================================
  // HARNESS 8: MULTI-STROKE RALLY CHAIN SIMULATION (100 FULL RALLIES)
  // ==========================================================================
  describe('Harness 8: Multi-Stroke Rally Chain Simulation (100 Rallies)', () => {
    it('simulates 100 complete AI-vs-AI multi-shot rallies verifying turn validity on EVERY shot', () => {
      const TOTAL_RALLIES = 100;
      const rng = mulberry32(5555);
      const diffs: AIDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

      let totalStrokesSimulated = 0;
      let zeroStrokesViolations = 0;

      for (let r = 0; r < TOTAL_RALLIES; r++) {
        const diffA = diffs[r % 3]!;
        const diffB = diffs[(r + 1) % 3]!;

        // Initial serve duel
        const serveZone = chooseServeZone(diffA, undefined, rng);
        const receiveZones = chooseReceiveZones(diffB, undefined, rng);

        const isAce = !receiveZones.includes(serveZone);
        if (isAce) {
          continue; // Point ended immediately on Ace
        }

        // Return from serve: Receiver plays a Blue defense card
        const blueCards: BlueCardType[] = ['DEF_CURTA', 'DEF_NEUTRA', 'DEF_LOB'];
        const initialDefType = blueCards[Math.floor(rng() * blueCards.length)]!;
        let currentBall: CardInstance = createCard(initialDefType, 'AI');

        let handA = [
          createCard('BANDEJA_CURTA', 'AI'),
          createCard('VOLEIO_PINGADA', 'AI'),
          createCard('SMASH', 'AI'),
          createCard('GANCHO_DEF', 'AI'),
          createCard('GOLPE_UBT_CORINGA', 'AI'),
        ];

        let handB = [
          createCard('BANDEJA_LOB', 'AI'),
          createCard('VOLEIO_ACELERADO', 'AI'),
          createCard('GANCHO_ATA', 'AI'),
          createCard('VERONICA_DEF', 'AI'),
          createCard('GOLPE_UBT_CORINGA', 'AI'),
        ];

        let currentTurn: 'A' | 'B' = 'A';
        let rallyOngoing = true;
        let strokeCount = 0;

        while (rallyOngoing && strokeCount < 30) {
          strokeCount++;
          totalStrokesSimulated++;

          const activeDiff = currentTurn === 'A' ? diffA : diffB;
          const activeHand = currentTurn === 'A' ? handA : handB;

          const legal = getLegalMoves(activeHand, currentBall, currentBall.declaredAs);
          const choice = chooseRallyPlay(activeHand, currentBall, activeDiff, undefined, rng);

          if (legal.requiresBlueDefense) {
            expect(choice.action).toBe('DRAW_BLUE_DEFENSE');
            // Defend with random blue card
            const blueDef = blueCards[Math.floor(rng() * blueCards.length)]!;
            currentBall = createCard(blueDef, currentTurn === 'A' ? 'PLAYER' : 'AI');
          } else if (choice.action === 'DIG') {
            expect(legal.playableCards.length).toBe(0);
            expect(legal.canDig).toBe(true);
            // End rally on dig for this simple chain test
            rallyOngoing = false;
            break;
          } else if (choice.action === 'PLAY_HAND') {
            expect(choice.cardInstance).toBeDefined();
            const valid = validateTurnPlay(currentBall, choice.cardInstance!);
            if (!valid.isValid) {
              zeroStrokesViolations++;
            }
            expect(valid.isValid).toBe(true);

            // Remove card from hand
            if (currentTurn === 'A') {
              handA = handA.filter((c) => c.instanceId !== choice.cardInstance?.instanceId);
            } else {
              handB = handB.filter((c) => c.instanceId !== choice.cardInstance?.instanceId);
            }
            currentBall = choice.cardInstance!;
          } else if (choice.action === 'PLAY_WILDCARD') {
            expect(choice.cardInstance).toBeDefined();
            expect(choice.declaredCardType).toBeDefined();
            const valid = validateTurnPlay(
              currentBall,
              choice.cardInstance!,
              choice.declaredCardType
            );
            if (!valid.isValid) {
              zeroStrokesViolations++;
            }
            expect(valid.isValid).toBe(true);

            // Set declaredAs
            const playedCoringa = {
              ...choice.cardInstance!,
              declaredAs: choice.declaredCardType,
            };

            if (currentTurn === 'A') {
              handA = handA.filter((c) => c.instanceId !== choice.cardInstance?.instanceId);
            } else {
              handB = handB.filter((c) => c.instanceId !== choice.cardInstance?.instanceId);
            }
            currentBall = playedCoringa;
          }

          currentTurn = currentTurn === 'A' ? 'B' : 'A';
        }
      }

      console.log(`[Challenger M2 Harness 8] Simulated ${totalStrokesSimulated} total rally strokes across ${TOTAL_RALLIES} games with ${zeroStrokesViolations} violations.`);
      expect(zeroStrokesViolations).toBe(0);
    });
  });
});

