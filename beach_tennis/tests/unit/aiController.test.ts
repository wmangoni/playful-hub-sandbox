/**
 * tests/unit/aiController.test.ts
 * Comprehensive Vitest Unit Test Suite for AI Controller (Milestone M2).
 * Validates Easy, Medium, and Hard Bot behaviors, heuristic rules, edge cases,
 * history tracking, Blue deck exhaustion, and deterministic RNG execution.
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
  chooseServeZone,
  chooseReceiveZones,
  chooseRallyPlay,
  chooseBlueDefenseDeclaration,
  chooseBlueWildcardDeclaration,
  chooseGreenWildcardDeclaration,
  createAIHistoryTracker,
  recordPlayerServe,
  recordPlayerReceive,
  recordDiscardedCard,
  getMostFrequentServeZone,
  getScarcestResponseGroup,
  getTopTwoReceiveZones,
  getLeastCoveredReceiveZone,
  getRemainingCardsByGroup,
  getServeProbabilities,
  resetPointDiscards,
  getAIDelay,
  simulateAIThinking,
  chooseServe,
  chooseReceive,
} from '../../src/engine/aiController';

// ============================================================================
// TEST FIXTURES & DETERMINISTIC HELPERS
// ============================================================================

function makeCard(type: CardType, owner: PlayerId = 'AI', instanceId?: string): CardInstance {
  const def = CARDS_CATALOG[type];
  if (!def) throw new Error(`[TestFixture] Unknown card type: ${type}`);
  return {
    instanceId: instanceId ?? `test_${owner.toLowerCase()}_${type}_${Math.random()}`,
    cardId: def.id,
    definition: def,
    owner,
    declaredAs: undefined,
  };
}

function mulberry32(seed: number): RNG {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t >>> 0) / 4294967296;
  };
}

describe('aiController Unit Test Suite', () => {
  // ==========================================================================
  // 1. EASY BOT TESTS
  // ==========================================================================
  describe('Easy Bot (Uniform Random & Strict Legality)', () => {
    it('always selects a serve zone within valid bounds (1..3)', () => {
      const rng = mulberry32(101);
      for (let i = 0; i < 50; i++) {
        const zone = chooseServeZone('EASY', undefined, rng);
        expect(Number.isInteger(zone)).toBe(true);
        expect(zone).toBeGreaterThanOrEqual(1);
        expect(zone).toBeLessThanOrEqual(3);
      }
    });

    it('always selects receive zones as two distinct numbers within bounds (1..3)', () => {
      const rng = mulberry32(102);
      for (let i = 0; i < 50; i++) {
        const zones = chooseReceiveZones('EASY', undefined, rng);
        expect(Array.isArray(zones)).toBe(true);
        expect(zones).toHaveLength(2);
        const [z1, z2] = zones;
        expect(Number.isInteger(z1)).toBe(true);
        expect(Number.isInteger(z2)).toBe(true);
        expect(z1).toBeGreaterThanOrEqual(1);
        expect(z1).toBeLessThanOrEqual(3);
        expect(z2).toBeGreaterThanOrEqual(1);
        expect(z2).toBeLessThanOrEqual(3);
        expect(z1).not.toBe(z2);
      }
    });

    it('demonstrates uniform distribution across all serve zones over 300 trials', () => {
      const rng = mulberry32(103);
      const counts: Record<ServeNumber, number> = { 1: 0, 2: 0, 3: 0 };
      const trials = 300;

      for (let i = 0; i < trials; i++) {
        const zone = chooseServeZone('EASY', undefined, rng);
        counts[zone]++;
      }

      // Each zone expected ~100 times (+- 40 for 3-sigma tolerance)
      expect(counts[1]).toBeGreaterThanOrEqual(60);
      expect(counts[2]).toBeGreaterThanOrEqual(60);
      expect(counts[3]).toBeGreaterThanOrEqual(60);
    });

    it('always picks strictly legal moves returned by getLegalMoves', () => {
      const rng = mulberry32(104);
      const incomingCards: CardInstance[] = [
        makeCard('DEF_CURTA', 'PLAYER'),  // Requires BANDEJAS
        makeCard('DEF_NEUTRA', 'PLAYER'), // Requires VOLEIOS
        makeCard('DEF_LOB', 'PLAYER'),    // Requires FUNDO
      ];

      for (const incoming of incomingCards) {
        const hand = [
          makeCard('BANDEJA_CURTA'),
          makeCard('VOLEIO_PINGADA'),
          makeCard('SMASH'),
          makeCard('GOLPE_UBT_CORINGA'),
        ];

        const legal = getLegalMoves(hand, incoming);
        expect(legal.playableCards.length).toBeGreaterThan(0);

        for (let i = 0; i < 20; i++) {
          const choice = chooseRallyPlay(hand, incoming, 'EASY', undefined, rng);
          expect(['PLAY_HAND', 'PLAY_WILDCARD']).toContain(choice.action);
          expect(choice.cardInstance).toBeDefined();

          // Card must be one of the legal cards
          const isLegalInstance = legal.playableCards.some(
            (c) => c.instanceId === choice.cardInstance?.instanceId
          );
          expect(isLegalInstance).toBe(true);

          // Must validate with engine turn validator
          const valid = isValidResponse(
            incoming,
            choice.cardInstance!,
            choice.declaredCardType
          );
          expect(valid).toBe(true);
        }
      }
    });

    it('never plays an invalid card when hand contains both legal and illegal cards', () => {
      const rng = mulberry32(105);
      const incoming = makeCard('DEF_CURTA', 'PLAYER'); // Requires BANDEJAS
      const hand = [
        makeCard('SMASH'),            // Invalid (Fundo)
        makeCard('VOLEIO_ACELERADO'), // Invalid (Voleios)
        makeCard('GANCHO_DEF'),        // Invalid (Fundo)
        makeCard('BANDEJA_CURTA'),     // Valid! (Bandejas)
      ];

      for (let i = 0; i < 30; i++) {
        const choice = chooseRallyPlay(hand, incoming, 'EASY', undefined, rng);
        expect(choice.action).toBe('PLAY_HAND');
        expect(choice.cardInstance?.definition.type).toBe('BANDEJA_CURTA');
      }
    });
  });

  // ==========================================================================
  // 2. MEDIUM BOT TESTS
  // ==========================================================================
  describe('Medium Bot (Heuristics & Value Preservation)', () => {
    it('conserves Green Wildcard: NEVER plays GOLPE_UBT_CORINGA when normal valid card is available', () => {
      const rng = mulberry32(201);
      const incoming = makeCard('DEF_CURTA', 'PLAYER'); // Requires BANDEJAS
      const hand = [
        makeCard('BANDEJA_CURTA'),     // Normal valid card
        makeCard('GOLPE_UBT_CORINGA'), // Wildcard
        makeCard('SMASH'),             // Invalid
      ];

      for (let i = 0; i < 50; i++) {
        const choice = chooseRallyPlay(hand, incoming, 'MEDIUM', undefined, rng);
        expect(choice.action).toBe('PLAY_HAND');
        expect(choice.cardInstance?.definition.type).toBe('BANDEJA_CURTA');
        expect(choice.cardInstance?.definition.isWildcard).toBe(false);
      }
    });

    it('plays Green Wildcard when it is the ONLY valid card in hand', () => {
      const rng = mulberry32(202);
      const incoming = makeCard('DEF_CURTA', 'PLAYER'); // Requires BANDEJAS
      const hand = [
        makeCard('SMASH'),             // Invalid
        makeCard('VOLEIO_PINGADA'),    // Invalid
        makeCard('GOLPE_UBT_CORINGA'), // Only valid option!
      ];

      const choice = chooseRallyPlay(hand, incoming, 'MEDIUM', undefined, rng);
      expect(choice.action).toBe('PLAY_WILDCARD');
      expect(choice.cardInstance?.definition.type).toBe('GOLPE_UBT_CORINGA');
      expect(choice.declaredCardType).toBeDefined();

      // Declared card must belong to required group (BANDEJAS)
      expect(['BANDEJA_CURTA', 'BANDEJA_LOB', 'BANDEJA_LOB_CHUTADO']).toContain(
        choice.declaredCardType
      );
    });

    it('prioritizes attack cards when holding both attack and non-attack valid cards', () => {
      const rng = mulberry32(203);
      const incoming = makeCard('DEF_LOB', 'PLAYER'); // Requires FUNDO
      const hand = [
        makeCard('GANCHO_DEF'), // Non-attack valid
        makeCard('SMASH'),      // Attack valid!
      ];

      let attackPicks = 0;
      const trials = 100;

      for (let i = 0; i < trials; i++) {
        const choice = chooseRallyPlay(hand, incoming, 'MEDIUM', undefined, rng);
        expect(choice.action).toBe('PLAY_HAND');
        if (choice.cardInstance?.definition.isAttack) {
          attackPicks++;
        }
      }

      // Medium AI prioritizes attack: should pick SMASH on >= 80% of trials
      expect(attackPicks).toBeGreaterThanOrEqual(80);
    });

    it('prefers restrictive shots (BANDEJAS/VOLEIOS) over delivering LOB (FUNDO) when no attacks are available', () => {
      const rng = mulberry32(205);
      const incoming = makeCard('DEF_CURTA', 'PLAYER'); // Requires BANDEJAS
      const hand = [
        makeCard('BANDEJA_LOB'),   // Forces FUNDO (permissive)
        makeCard('BANDEJA_CURTA'), // Forces BANDEJAS (restrictive 33.3%)
      ];

      for (let i = 0; i < 30; i++) {
        const choice = chooseRallyPlay(hand, incoming, 'MEDIUM', undefined, rng);
        expect(choice.action).toBe('PLAY_HAND');
        expect(choice.cardInstance?.definition.type).toBe('BANDEJA_CURTA');
      }
    });

    it('declaring Blue Coringa: NEVER declares DEF_LOB', () => {
      const rng = mulberry32(204);
      for (let i = 0; i < 50; i++) {
        const decl = chooseBlueDefenseDeclaration('MEDIUM', undefined, rng);
        expect(['DEF_CURTA', 'DEF_NEUTRA']).toContain(decl);
        expect(decl).not.toBe('DEF_LOB');
      }
    });
  });

  // ==========================================================================
  // 3. HARD BOT TESTS
  // ==========================================================================
  describe('Hard Bot (Pattern Countering & Scarcity Exploitation)', () => {
    it('serve pattern counter: simulates human serving zone 2 five times in a row -> Hard Bot covers zone 2 with 100% certainty', () => {
      const rng = mulberry32(301);
      let tracker = createAIHistoryTracker();

      // Simulate human serving zone 2 five times consecutively
      for (let i = 0; i < 5; i++) {
        tracker = recordPlayerServe(tracker, 2);
      }

      expect(getMostFrequentServeZone(tracker)).toBe(2);

      // Verify over 50 trials that receive zones ALWAYS include zone 2
      for (let i = 0; i < 50; i++) {
        const receiveZones = chooseReceiveZones('HARD', tracker, rng);
        expect(receiveZones.includes(2)).toBe(true);
      }
    });

    it('serve pattern counter: simulates human serving zone 1 five times in a row -> Hard Bot covers zone 1 with 100% certainty', () => {
      const rng = mulberry32(302);
      let tracker = createAIHistoryTracker();

      for (let i = 0; i < 5; i++) {
        tracker = recordPlayerServe(tracker, 1);
      }

      expect(getMostFrequentServeZone(tracker)).toBe(1);

      for (let i = 0; i < 50; i++) {
        const receiveZones = chooseReceiveZones('HARD', tracker, rng);
        expect(receiveZones.includes(1)).toBe(true);
      }
    });

    it('scarcity exploitation: selects shots requiring opponent most exhausted group (BANDEJAS)', () => {
      const rng = mulberry32(303);
      let tracker = createAIHistoryTracker();

      // Opponent discarded multiple BANDEJAS cards
      tracker = recordDiscardedCard(tracker, 'BANDEJA_CURTA');
      tracker = recordDiscardedCard(tracker, 'BANDEJA_LOB');
      tracker = recordDiscardedCard(tracker, 'BANDEJA_LOB_CHUTADO');

      expect(getScarcestResponseGroup(tracker)).toBe('BANDEJAS');

      // AI holds BANDEJA_CURTA (forces BANDEJAS) and BANDEJA_LOB (forces FUNDO) against DEF_CURTA
      const incoming = makeCard('DEF_CURTA', 'PLAYER'); // Requires BANDEJAS
      const hand = [
        makeCard('BANDEJA_CURTA'), // Requires opponent to respond with BANDEJAS
        makeCard('BANDEJA_LOB'),   // Requires opponent to respond with FUNDO
      ];

      const choice = chooseRallyPlay(hand, incoming, 'HARD', tracker, rng);
      expect(choice.action).toBe('PLAY_HAND');
      expect(choice.cardInstance?.definition.type).toBe('BANDEJA_CURTA');
      expect(choice.cardInstance?.definition.requiredResponse).toBe('BANDEJAS');
    });

    it('scarcity exploitation: selects shots requiring opponent most exhausted group (VOLEIOS)', () => {
      const rng = mulberry32(304);
      let tracker = createAIHistoryTracker();

      // Opponent discarded multiple VOLEIOS cards
      tracker = recordDiscardedCard(tracker, 'VOLEIO_PINGADA');
      tracker = recordDiscardedCard(tracker, 'VOLEIO_ACELERADO');
      tracker = recordDiscardedCard(tracker, 'VOLEIO_LOB');

      expect(getScarcestResponseGroup(tracker)).toBe('VOLEIOS');

      const incoming = makeCard('DEF_CURTA', 'PLAYER'); // Requires BANDEJAS
      const hand = [
        makeCard('BANDEJA_CURTA'),        // Requires BANDEJAS
        makeCard('BANDEJA_LOB_CHUTADO'), // Requires VOLEIOS (exploits scarcity!)
      ];

      const choice = chooseRallyPlay(hand, incoming, 'HARD', tracker, rng);
      expect(choice.action).toBe('PLAY_HAND');
      expect(choice.cardInstance?.definition.type).toBe('BANDEJA_LOB_CHUTADO');
      expect(choice.cardInstance?.definition.requiredResponse).toBe('VOLEIOS');
    });

    it('blue deck exhaustion: targets DEFESAS when opponent blue deck has 0 cards remaining', () => {
      let tracker = createAIHistoryTracker();

      // Simulate opponent exhausting all 8 blue cards
      for (let i = 0; i < 8; i++) {
        tracker = recordDiscardedCard(tracker, 'DEF_CURTA');
      }

      expect(getRemainingCardsByGroup(tracker).DEFESAS).toBe(0);
      expect(getScarcestResponseGroup(tracker)).toBe('DEFESAS');

      // AI holds an attack card (SMASH) and non-attack (GANCHO_DEF) against DEF_LOB
      const incoming = makeCard('DEF_LOB', 'PLAYER'); // Requires FUNDO
      const hand = [
        makeCard('GANCHO_DEF'), // Non-attack
        makeCard('SMASH'),      // Attack (exploits exhausted blue deck!)
      ];

      const choice = chooseRallyPlay(hand, incoming, 'HARD', tracker);
      expect(choice.action).toBe('PLAY_HAND');
      expect(choice.cardInstance?.definition.type).toBe('SMASH');
      expect(choice.cardInstance?.definition.isAttack).toBe(true);
    });

    it('serve selection exploits opponent least covered receive zone with epsilon-greedy', () => {
      const rng = mulberry32(305);
      let tracker = createAIHistoryTracker();

      // Human covers [1, 2] repeatedly, leaving zone 3 uncovered
      for (let i = 0; i < 10; i++) {
        tracker = recordPlayerReceive(tracker, [1, 2]);
      }

      expect(getLeastCoveredReceiveZone(tracker)).toBe(3);

      let zone3Serves = 0;
      const trials = 100;
      for (let i = 0; i < trials; i++) {
        const zone = chooseServeZone('HARD', tracker, rng);
        if (zone === 3) zone3Serves++;
      }

      // Hard bot should exploit zone 3 with dominant frequency (>= 60%)
      expect(zone3Serves).toBeGreaterThanOrEqual(60);
    });
  });

  // ==========================================================================
  // 4. EDGE CASE & BOUNDARY TESTS
  // ==========================================================================
  describe('Edge Cases & Deterministic RNG', () => {
    it('chooses DIG action when hand has 0 legal cards and digging is legal', () => {
      const incoming = makeCard('DEF_CURTA', 'PLAYER'); // Requires BANDEJAS
      const handWithNoLegalCards = [
        makeCard('VOLEIO_PINGADA'),
        makeCard('SMASH'),
        makeCard('GANCHO_DEF'),
      ];

      const legal = getLegalMoves(handWithNoLegalCards, incoming);
      expect(legal.playableCards).toHaveLength(0);
      expect(legal.canDig).toBe(true);
      expect(legal.requiresBlueDefense).toBe(false);

      // Verify across all three difficulties
      for (const diff of ['EASY', 'MEDIUM', 'HARD'] as const) {
        const choice = chooseRallyPlay(handWithNoLegalCards, incoming, diff);
        expect(choice.action).toBe('DIG');
        expect(choice.cardInstance).toBeUndefined();
      }
    });

    it('chooses DRAW_BLUE_DEFENSE when incoming ball is an attack (requiresBlueDefense === true)', () => {
      const incomingAttack = makeCard('SMASH', 'PLAYER'); // Attack shot!
      const handWithCards = [
        makeCard('SMASH'),
        makeCard('BANDEJA_CURTA'),
        makeCard('GOLPE_UBT_CORINGA'),
      ];

      const legal = getLegalMoves(handWithCards, incomingAttack);
      expect(legal.requiresBlueDefense).toBe(true);
      expect(legal.canDig).toBe(false);
      expect(legal.playableCards).toHaveLength(0);

      // Verify across all three difficulties
      for (const diff of ['EASY', 'MEDIUM', 'HARD'] as const) {
        const choice = chooseRallyPlay(handWithCards, incomingAttack, diff);
        expect(choice.action).toBe('DRAW_BLUE_DEFENSE');
        expect(choice.cardInstance).toBeUndefined();
      }
    });

    it('verifies 100% deterministic output with seeded RNG across all decisions', () => {
      const seed = 9999;
      const hand = [
        makeCard('BANDEJA_CURTA'),
        makeCard('BANDEJA_LOB_CHUTADO'),
        makeCard('BANDEJA_LOB'),
      ];
      const incoming = makeCard('DEF_CURTA', 'PLAYER');

      // Run 1 with seed
      const rng1 = mulberry32(seed);
      const serve1 = chooseServeZone('EASY', undefined, rng1);
      const receive1 = chooseReceiveZones('EASY', undefined, rng1);
      const rally1 = chooseRallyPlay(hand, incoming, 'EASY', undefined, rng1);
      const def1 = chooseBlueDefenseDeclaration('EASY', undefined, rng1);

      // Run 2 with identical seed
      const rng2 = mulberry32(seed);
      const serve2 = chooseServeZone('EASY', undefined, rng2);
      const receive2 = chooseReceiveZones('EASY', undefined, rng2);
      const rally2 = chooseRallyPlay(hand, incoming, 'EASY', undefined, rng2);
      const def2 = chooseBlueDefenseDeclaration('EASY', undefined, rng2);

      expect(serve1).toBe(serve2);
      expect(receive1).toEqual(receive2);
      expect(rally1.cardInstance?.definition.type).toBe(rally2.cardInstance?.definition.type);
      expect(def1).toBe(def2);
    });

    it('handles completely empty hand (0 cards) by choosing DIG', () => {
      const incoming = makeCard('DEF_CURTA', 'PLAYER');
      const emptyHand: CardInstance[] = [];

      const choice = chooseRallyPlay(emptyHand, incoming, 'HARD');
      expect(choice.action).toBe('DIG');
    });

    it('handles unpopulated history tracker gracefully without runtime exceptions', () => {
      const emptyTracker = createAIHistoryTracker();
      expect(getMostFrequentServeZone(emptyTracker)).toBeNull();

      const zone = chooseServeZone('HARD', emptyTracker);
      expect([1, 2, 3]).toContain(zone);

      const receive = chooseReceiveZones('HARD', emptyTracker);
      expect(receive).toHaveLength(2);
      expect(receive[0]).not.toBe(receive[1]);
    });
  });

  // ==========================================================================
  // 5. HISTORY TRACKER MODULE & UTILITY TESTS
  // ==========================================================================
  describe('AIHistoryTracker & Utilities', () => {
    it('initializes tracker with empty zeroed values', () => {
      const tracker = createAIHistoryTracker();
      expect(tracker.playerServeFrequency).toEqual({ 1: 0, 2: 0, 3: 0 });
      expect(tracker.playerReceiveFrequency).toEqual({ 1: 0, 2: 0, 3: 0 });
      expect(tracker.playerDiscardedGroupsInPoint).toEqual({
        BANDEJAS: 0,
        VOLEIOS: 0,
        DEFESAS: 0,
        FUNDO: 0,
      });
      expect(tracker.consecutiveSameServeCount).toBe(0);
      expect(tracker.serveHistory).toEqual([]);
      expect(tracker.lastServeZone).toBeNull();
      expect(tracker.totalServesRecorded).toBe(0);
    });

    it('records serve zone choices and tracks consecutive streaks immutably', () => {
      const t0 = createAIHistoryTracker();
      const t1 = recordPlayerServe(t0, 2);
      expect(t1.playerServeFrequency[2]).toBe(1);
      expect(t1.consecutiveSameServeCount).toBe(1);
      expect(t1.lastServeZone).toBe(2);
      expect(t0.playerServeFrequency[2]).toBe(0); // Immutability

      const t2 = recordPlayerServe(t1, 2);
      expect(t2.consecutiveSameServeCount).toBe(2);

      const t3 = recordPlayerServe(t2, 1);
      expect(t3.consecutiveSameServeCount).toBe(1);
      expect(t3.lastServeZone).toBe(1);
      expect(t3.serveHistory).toEqual([2, 2, 1]);
    });

    it('throws when recording invalid serve zones', () => {
      const tracker = createAIHistoryTracker();
      expect(() => recordPlayerServe(tracker, 0 as any)).toThrow();
      expect(() => recordPlayerServe(tracker, 4 as any)).toThrow();
      expect(() => recordPlayerServe(tracker, 1.5 as any)).toThrow();
    });

    it('records receive zones correctly and rejects invalid inputs', () => {
      const tracker = createAIHistoryTracker();
      const t1 = recordPlayerReceive(tracker, [1, 3]);
      expect(t1.playerReceiveFrequency[1]).toBe(1);
      expect(t1.playerReceiveFrequency[2]).toBe(0);
      expect(t1.playerReceiveFrequency[3]).toBe(1);

      // Rejects same numbers or out of bounds
      expect(() => recordPlayerReceive(t1, [2, 2])).toThrow();
      expect(() => recordPlayerReceive(t1, [1, 4] as any)).toThrow();
    });

    it('records discarded cards by mapping to their canonical group', () => {
      let tracker = createAIHistoryTracker();
      tracker = recordDiscardedCard(tracker, 'BANDEJA_CURTA');
      tracker = recordDiscardedCard(tracker, makeCard('VOLEIO_PINGADA'));
      tracker = recordDiscardedCard(tracker, 'SMASH');
      tracker = recordDiscardedCard(tracker, 'DEF_NEUTRA');

      expect(tracker.playerDiscardedGroupsInPoint.BANDEJAS).toBe(1);
      expect(tracker.playerDiscardedGroupsInPoint.VOLEIOS).toBe(1);
      expect(tracker.playerDiscardedGroupsInPoint.FUNDO).toBe(1);
      expect(tracker.playerDiscardedGroupsInPoint.DEFESAS).toBe(1);

      // Orange cards are safely ignored
      const prevDiscards = { ...tracker.playerDiscardedGroupsInPoint };
      tracker = recordDiscardedCard(tracker, 'SAQUE_1');
      expect(tracker.playerDiscardedGroupsInPoint).toEqual(prevDiscards);
    });

    it('throws when recording unknown card type in recordDiscardedCard', () => {
      const tracker = createAIHistoryTracker();
      expect(() => recordDiscardedCard(tracker, 'INVALID_CARD' as any)).toThrow();
    });

    it('resets point discards while preserving match serve history', () => {
      let tracker = createAIHistoryTracker();
      tracker = recordPlayerServe(tracker, 2);
      tracker = recordDiscardedCard(tracker, 'BANDEJA_CURTA');

      const reset = resetPointDiscards(tracker);
      expect(reset.playerDiscardedGroupsInPoint.BANDEJAS).toBe(0);
      expect(reset.playerServeFrequency[2]).toBe(1);
      expect(reset.lastServeZone).toBe(2);
    });

    it('computes empirical serve probabilities accurately', () => {
      let tracker = createAIHistoryTracker();
      expect(getServeProbabilities(tracker)).toEqual({ 1: 1 / 3, 2: 1 / 3, 3: 1 / 3 });

      tracker = recordPlayerServe(tracker, 1);
      tracker = recordPlayerServe(tracker, 1);
      tracker = recordPlayerServe(tracker, 2);

      const probs = getServeProbabilities(tracker);
      expect(probs[1]).toBeCloseTo(2 / 3);
      expect(probs[2]).toBeCloseTo(1 / 3);
      expect(probs[3]).toBe(0);
    });

    it('breaks ties in getMostFrequentServeZone by recency', () => {
      let tracker = createAIHistoryTracker();
      tracker = recordPlayerServe(tracker, 1);
      tracker = recordPlayerServe(tracker, 3);
      // Both have count 1, but 3 was more recent
      expect(getMostFrequentServeZone(tracker)).toBe(3);
    });

    it('getTopTwoReceiveZones returns default [1, 2] on cold start', () => {
      const tracker = createAIHistoryTracker();
      expect(getTopTwoReceiveZones(tracker)).toEqual([1, 2]);
    });

    it('provides alias chooseBlueWildcardDeclaration equivalent to chooseBlueDefenseDeclaration', () => {
      expect(chooseBlueWildcardDeclaration).toBe(chooseBlueDefenseDeclaration);
    });

    it('provides convenience wrappers chooseServe and chooseReceive', () => {
      const zone = chooseServe('EASY');
      expect([1, 2, 3]).toContain(zone);

      const receive = chooseReceive('EASY');
      expect(receive).toHaveLength(2);
      expect([1, 2, 3]).toContain(receive[0]);
      expect([1, 2, 3]).toContain(receive[1]);
      expect(receive[0]).not.toBe(receive[1]);
    });

    it('chooseGreenWildcardDeclaration handles all response categories across difficulties', () => {
      const rng = mulberry32(401);
      // Easy
      const easyDecl = chooseGreenWildcardDeclaration('BANDEJAS', 'EASY', [], undefined, rng);
      expect(['BANDEJA_CURTA', 'BANDEJA_LOB', 'BANDEJA_LOB_CHUTADO']).toContain(easyDecl);

      // Medium/Hard for FUNDO -> SMASH
      expect(chooseGreenWildcardDeclaration('FUNDO', 'MEDIUM')).toBe('SMASH');
      expect(chooseGreenWildcardDeclaration('FUNDO', 'HARD')).toBe('SMASH');

      // Medium/Hard for VOLEIOS -> VOLEIO_ACELERADO
      expect(chooseGreenWildcardDeclaration('VOLEIOS', 'MEDIUM')).toBe('VOLEIO_ACELERADO');
      expect(chooseGreenWildcardDeclaration('VOLEIOS', 'HARD')).toBe('VOLEIO_ACELERADO');
    });

    it('getAIDelay produces numbers within expected ranges for all difficulties', () => {
      const rng = mulberry32(501);
      for (let i = 0; i < 30; i++) {
        const easyDelay = getAIDelay('EASY', rng);
        expect(easyDelay).toBeGreaterThanOrEqual(600);
        expect(easyDelay).toBeLessThanOrEqual(800);

        const medDelay = getAIDelay('MEDIUM', rng);
        expect(medDelay).toBeGreaterThanOrEqual(800);
        expect(medDelay).toBeLessThanOrEqual(1000);

        const hardDelay = getAIDelay('HARD', rng);
        expect(hardDelay).toBeGreaterThanOrEqual(900);
        expect(hardDelay).toBeLessThanOrEqual(1200);
      }
    });

    it('simulateAIThinking resolves with simulated delay', async () => {
      const rng = () => 0.5;
      const delay = await simulateAIThinking('EASY', rng);
      expect(delay).toBe(700); // 600 + 0.5 * 200 = 700ms
    });
  });
});
