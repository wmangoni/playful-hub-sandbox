/**
 * tests/unit/challenger_m1.test.ts
 *
 * EMPIRICAL ADVERSARIAL STRESS HARNESS - MILESTONE M1
 * Core Engine Desacoplado e Regras Oficiais
 *
 * Challenger Tasks:
 * 1. 10,000 randomized 1v1 serve duels: Empirical Ace rate convergence to 33.3%.
 * 2. Cavação Monte Verde fuzzing: 5,000 simulated cavações.
 *    - Always forces play if 1st card valid?
 *    - Draws 2nd card if 1st invalid?
 *    - Point loss triggers on 2nd miss?
 *    - Throws error if hand already holds valid card?
 *    - Prohibits digging for DEFESAS?
 *    - Handles empty and 1-card decks gracefully?
 * 3. Blue Deck defense exhaustion:
 *    - Does point loss trigger deterministically when blue deck reaches 0?
 *    - 1,000 simulated exhaustion cycles.
 *    - Integration with serve defense and offensive rally attacks.
 */

import { describe, it, expect } from 'vitest';
import type {
  CardInstance,
  CardType,
  RequiredResponse,
  ServeNumber,
} from '../../src/engine/types';
import {
  isCardLegalForResponse,
} from '../../src/engine/cardsCatalog';
import {
  createCardInstance,
  createDecks,
  digCards,
  digSingleStep,
  drawDefenseCard,
  hasValidCardInHand,
} from '../../src/engine/deckManager';
import {
  calculateAceProbability,
  getAllPossibleReceiverPairs,
  resolveServe,
  resolveServeExtended,
  resolveServeAndDrawDefense,
} from '../../src/engine/serveResolver';
import {
  getLegalMoves,
} from '../../src/engine/rallyValidator';
import {
  awardPoint,
  createInitialScore,
} from '../../src/engine/scoreEngine';

// Simple deterministic PRNG (Mulberry32) for perfectly reproducible fuzzing
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('Empirical Challenger M1 - Task 1: 10,000 Randomized 1v1 Serve Duels', () => {
  it('converges to 33.3% Ace rate within 3-sigma tolerance over 10,000 duels', () => {
    const rng = mulberry32(0xdeadbeef);
    const TOTAL_DUELS = 10_000;
    const receiverPairs = getAllPossibleReceiverPairs(); // [[1,2], [1,3], [2,3]]

    let aceCount = 0;
    let defenseCount = 0;

    // Track zone distribution for uniformity
    const serverZoneCounts: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
    const receiverPairCounts: number[] = [0, 0, 0];

    for (let i = 0; i < TOTAL_DUELS; i++) {
      // Server chooses uniformly in {1, 2, 3}
      const sPick = (Math.floor(rng() * 3) + 1) as 1 | 2 | 3;
      serverZoneCounts[sPick] = (serverZoneCounts[sPick] ?? 0) + 1;

      // Receiver chooses uniformly in 3 possible pairs
      const rPairIndex = Math.floor(rng() * 3);
      receiverPairCounts[rPairIndex] = (receiverPairCounts[rPairIndex] ?? 0) + 1;
      const rPicks = receiverPairs[rPairIndex]!;

      const result = resolveServe(sPick, rPicks, 'PLAYER', 'AI');

      if (result.isAce) {
        aceCount++;
        expect(result.defenseSuccess).toBe(false);
        expect(result.winningPlayer).toBe('PLAYER');
      } else {
        defenseCount++;
        expect(result.defenseSuccess).toBe(true);
        expect(result.winningPlayer).toBeUndefined();
      }

      // Invariant: Ace iff sPick is not in rPicks
      const expectedAce = !rPicks.includes(sPick);
      expect(result.isAce).toBe(expectedAce);
    }

    // Invariant: sum must be exactly 10,000
    expect(aceCount + defenseCount).toBe(TOTAL_DUELS);

    const empiricalAceRate = aceCount / TOTAL_DUELS;
    const theoreticalAceRate = calculateAceProbability('1v1'); // 1/3 ~ 0.33333333

    // Standard deviation for binomial(N=10000, p=1/3):
    // sigma = sqrt(p * (1 - p) / N) = sqrt((1/3) * (2/3) / 10000) = sqrt(2/9 / 10000) ~ 0.004714 (0.471%)
    // 3 * sigma ~ 0.01414 (1.414%)
    const sigma = Math.sqrt((theoreticalAceRate * (1 - theoreticalAceRate)) / TOTAL_DUELS);
    const maxDeviation = 3 * sigma; // 99.73% confidence interval

    const absoluteError = Math.abs(empiricalAceRate - theoreticalAceRate);

    // Diagnostic console output for verification report
    console.log(`[Task 1 Serve Duels] Total: ${TOTAL_DUELS}, Aces: ${aceCount} (${(empiricalAceRate * 100).toFixed(2)}%), Defenses: ${defenseCount} (${((defenseCount / TOTAL_DUELS) * 100).toFixed(2)}%)`);
    console.log(`[Task 1 Serve Duels] Theoretical: ${(theoreticalAceRate * 100).toFixed(2)}%, StdDev: ${(sigma * 100).toFixed(3)}%, Absolute Error: ${(absoluteError * 100).toFixed(3)}%, 3-Sigma Bound: ${(maxDeviation * 100).toFixed(3)}%`);

    expect(absoluteError).toBeLessThan(maxDeviation);

    // Server picks and receiver pairs must be roughly uniform (~3333 each)
    for (const zone of [1, 2, 3] as ServeNumber[]) {
      expect(serverZoneCounts[zone]).toBeGreaterThan(3100);
      expect(serverZoneCounts[zone]).toBeLessThan(3550);
    }
    for (let p = 0; p < 3; p++) {
      expect(receiverPairCounts[p]).toBeGreaterThan(3100);
      expect(receiverPairCounts[p]).toBeLessThan(3550);
    }
  });

  it('rejects illegal, malformed, or out-of-bounds serve inputs with descriptive errors', () => {
    // Server pick out of range
    expect(() => resolveServe(0, [1, 2])).toThrow();
    expect(() => resolveServe(4, [1, 2])).toThrow();
    expect(() => resolveServe(1.5, [1, 2])).toThrow();

    // Receiver picks invalid count
    expect(() => resolveServe(1, [1])).toThrow();
    expect(() => resolveServe(1, [1, 2, 3])).toThrow();
    expect(() => resolveServe(1, [])).toThrow();

    // Receiver picks duplicates
    expect(() => resolveServe(1, [2, 2])).toThrow();
    expect(() => resolveServe(1, [1, 1])).toThrow();

    // Receiver picks out of bounds
    expect(() => resolveServe(1, [1, 4])).toThrow();
    expect(() => resolveServe(1, [0, 2])).toThrow();
  });

  it('verifies 2v2 extended serve convergence to 20.0% Ace rate over 10,000 duels', () => {
    const rng = mulberry32(0x12345678);
    const TOTAL_DUELS = 10_000;
    let aceCount = 0;

    for (let i = 0; i < TOTAL_DUELS; i++) {
      const sPick = Math.floor(rng() * 5) + 1; // 1..5
      // Receiver picks 4 out of 5 (omit 1 zone uniformly)
      const omittedZone = Math.floor(rng() * 5) + 1;
      const rPicks = [1, 2, 3, 4, 5].filter((z) => z !== omittedZone);

      const result = resolveServeExtended(sPick, rPicks, 'PLAYER', 'AI', '2v2');
      if (result.isAce) aceCount++;
    }

    const empiricalRate = aceCount / TOTAL_DUELS;
    const theoreticalRate = 0.20;
    const sigma = Math.sqrt((theoreticalRate * (1 - theoreticalRate)) / TOTAL_DUELS); // sqrt(0.16/10000) = 0.004 (0.4%)
    const maxDeviation = 3 * sigma; // 0.012 (1.2%)

    console.log(`[Task 1 Extended 2v2 Serve] Aces: ${aceCount} (${(empiricalRate * 100).toFixed(2)}%), Error: ${(Math.abs(empiricalRate - theoreticalRate) * 100).toFixed(3)}%, 3-Sigma: ${(maxDeviation * 100).toFixed(3)}%`);
    expect(Math.abs(empiricalRate - theoreticalRate)).toBeLessThan(maxDeviation);
  });
});

describe('Empirical Challenger M1 - Task 2: Cavação Monte Verde Fuzzing (5,000 Simulations)', () => {
  const RESPONSE_GROUPS: RequiredResponse[] = ['BANDEJAS', 'VOLEIOS', 'FUNDO'];

  it('throws error strictly if hand already holds at least 1 valid card (1,000 iterations)', () => {
    const rng = mulberry32(0xcaface);
    let testedCases = 0;

    for (let i = 0; i < 1000; i++) {
      const req = RESPONSE_GROUPS[Math.floor(rng() * RESPONSE_GROUPS.length)]!;
      const { greenDeck } = createDecks({ rng });

      // Generate a hand containing at least one valid card
      const hand = greenDeck.slice(0, 6);
      const remainingDeck = greenDeck.slice(6);

      const hasValid = hasValidCardInHand(hand, req);
      if (hasValid) {
        testedCases++;
        // Calling digCards MUST throw
        expect(() => digCards(hand, remainingDeck, req)).toThrowError(
          /não pode cavar: a mão já possui carta/
        );
        // Calling digSingleStep step 1 MUST throw
        expect(() => digSingleStep(hand, remainingDeck, req, 1)).toThrowError(
          /não pode cavar: a mão já possui carta/
        );
      }
    }

    console.log(`[Task 2 Guard] Verified ${testedCases} cases where hand held a valid card and threw correctly.`);
    expect(testedCases).toBeGreaterThan(500);
  });

  it('prohibits Cavação for DEFESAS strictly and unconditionally', () => {
    const { greenDeck } = createDecks();
    const hand = greenDeck.slice(0, 6);
    const remainingDeck = greenDeck.slice(6);

    expect(() => digCards(hand, remainingDeck, 'DEFESAS')).toThrowError(
      /Cavação proibida para DEFESAS/
    );
    expect(() => digSingleStep(hand, remainingDeck, 'DEFESAS', 1)).toThrowError(
      /Cavação proibida para DEFESAS/
    );
  });

  it('fuzzes 5,000 simulated cavações: verifies 1st card play, 2nd card draw, 2nd miss point loss, and invariants', () => {
    const rng = mulberry32(0x5eedf00d);
    const SIMULATION_COUNT = 5000;

    let firstCardValidCount = 0;
    let secondCardValidCount = 0;
    let bothCardsInvalidCount = 0;
    let deckExhaustedCount = 0;

    for (let i = 0; i < SIMULATION_COUNT; i++) {
      const req = RESPONSE_GROUPS[Math.floor(rng() * RESPONSE_GROUPS.length)]!;
      const { greenDeck } = createDecks({ rng });

      // Partition greenDeck into valid cards and invalid cards for req
      const validCards: CardInstance[] = [];
      const invalidCards: CardInstance[] = [];

      for (const card of greenDeck) {
        if (isCardLegalForResponse(card.definition.type, req)) {
          validCards.push(card);
        } else {
          invalidCards.push(card);
        }
      }

      // Guarantee an empty hand with respect to req (only invalid cards in hand)
      const handSize = Math.floor(rng() * 7); // 0 to 6 cards in hand
      const hand: CardInstance[] = invalidCards.slice(0, handSize);
      const remainingInvalid = invalidCards.slice(handSize);

      // Verify prerequisite: hand has 0 valid cards
      expect(hasValidCardInHand(hand, req)).toBe(false);

      // Randomly construct the draw pile with a chosen test scenario
      const scenarioChoice = Math.floor(rng() * 5);
      let testDeck: CardInstance[];

      if (scenarioChoice === 0) {
        // Scenario 0: Empty deck
        testDeck = [];
      } else if (scenarioChoice === 1) {
        // Scenario 1: Only 1 invalid card in deck
        testDeck = remainingInvalid.slice(0, 1);
      } else if (scenarioChoice === 2) {
        // Scenario 2: Card 1 is VALID (card 2 can be anything)
        const validPick = validCards[Math.floor(rng() * validCards.length)]!;
        testDeck = [validPick, ...remainingInvalid];
      } else if (scenarioChoice === 3) {
        // Scenario 3: Card 1 is INVALID, Card 2 is VALID
        if (remainingInvalid.length >= 1 && validCards.length >= 1) {
          const invPick = remainingInvalid[0]!;
          const validPick = validCards[Math.floor(rng() * validCards.length)]!;
          testDeck = [invPick, validPick, ...remainingInvalid.slice(1)];
        } else {
          testDeck = [...validCards];
        }
      } else {
        // Scenario 4: Card 1 is INVALID, Card 2 is INVALID
        testDeck = remainingInvalid.slice(0, Math.min(remainingInvalid.length, 5));
      }

      const initialDeckLength = testDeck.length;
      const initialHandLength = hand.length;

      // Execute digCards
      const result = digCards(hand, testDeck, req);

      // Invariant verification based on scenario
      if (initialDeckLength === 0) {
        // Deck was empty: point loss immediately
        expect(result.pointLost).toBe(true);
        expect(result.drawnCard).toBeNull();
        expect(result.reason).toBe('GREEN_DECK_EMPTY');
        expect(result.canDigAgain).toBe(false);
        expect(result.mustPlayImmediately).toBe(false);
        expect(result.updatedGreenDeck.length).toBe(0);
        expect(result.updatedHand.length).toBe(initialHandLength);
        deckExhaustedCount++;
      } else if (isCardLegalForResponse(testDeck[0]!.definition.type, req)) {
        // Sub-test 1: 1st card is VALID -> MUST force play immediately, cannot dig 2nd card!
        expect(result.isValid).toBe(true);
        expect(result.mustPlayImmediately).toBe(true);
        expect(result.canDigAgain).toBe(false);
        expect(result.pointLost).toBe(false);
        expect(result.attemptNumber).toBe(1);
        expect(result.reason).toBe('LEGAL_CARD_DRAWN');
        expect(result.drawnCard?.instanceId).toBe(testDeck[0]!.instanceId);
        expect(result.updatedGreenDeck.length).toBe(initialDeckLength - 1);
        // Valid card goes directly to the court, NOT kept in hand
        expect(result.updatedHand.length).toBe(initialHandLength);
        firstCardValidCount++;

        // Verify that step 1 of digSingleStep gives identical outcome
        const step1 = digSingleStep(hand, testDeck, req, 1);
        expect(step1.mustPlayImmediately).toBe(true);
        expect(step1.canDigAgain).toBe(false);
        expect(step1.pointLost).toBe(false);
        expect(step1.drawnCard?.instanceId).toBe(testDeck[0]!.instanceId);
      } else {
        // 1st card is INVALID:
        if (initialDeckLength === 1) {
          // Deck had only 1 card and it was invalid -> Point lost due to exhaustion
          expect(result.pointLost).toBe(true);
          expect(result.mustPlayImmediately).toBe(false);
          expect(result.canDigAgain).toBe(false);
          expect(result.reason).toBe('GREEN_DECK_EMPTY');
          expect(result.updatedHand.length).toBe(initialHandLength + 1);
          deckExhaustedCount++;
        } else if (isCardLegalForResponse(testDeck[1]!.definition.type, req)) {
          // Sub-test 2: 1st card INVALID, 2nd card VALID -> draws 2nd card, must play immediately!
          expect(result.isValid).toBe(true);
          expect(result.mustPlayImmediately).toBe(true);
          expect(result.canDigAgain).toBe(false);
          expect(result.pointLost).toBe(false);
          expect(result.attemptNumber).toBe(2);
          expect(result.reason).toBe('LEGAL_CARD_DRAWN');
          expect(result.drawnCard?.instanceId).toBe(testDeck[1]!.instanceId);
          expect(result.updatedGreenDeck.length).toBe(initialDeckLength - 2);
          // 1st invalid card was incorporated into hand, 2nd valid card was played
          expect(result.updatedHand.length).toBe(initialHandLength + 1);
          expect(result.updatedHand.some((c) => c.instanceId === testDeck[0]!.instanceId)).toBe(true);
          secondCardValidCount++;

          // Verify step-by-step equivalent
          const step1 = digSingleStep(hand, testDeck, req, 1);
          expect(step1.canDigAgain).toBe(true);
          expect(step1.pointLost).toBe(false);
          const step2 = digSingleStep(step1.updatedHand, step1.updatedGreenDeck, req, 2);
          expect(step2.mustPlayImmediately).toBe(true);
          expect(step2.pointLost).toBe(false);
        } else {
          // Sub-test 3: Both cards INVALID -> POINT LOSS TRIGGERS on 2nd miss!
          expect(result.pointLost).toBe(true);
          expect(result.isValid).toBe(false);
          expect(result.mustPlayImmediately).toBe(false);
          expect(result.canDigAgain).toBe(false);
          expect(result.attemptNumber).toBe(2);
          expect(result.reason).toBe('SECOND_ATTEMPT_INVALID');
          expect(result.drawnCard?.instanceId).toBe(testDeck[1]!.instanceId);
          expect(result.updatedGreenDeck.length).toBe(initialDeckLength - 2);
          // Both invalid cards were incorporated into hand
          expect(result.updatedHand.length).toBe(initialHandLength + 2);
          expect(result.updatedHand.some((c) => c.instanceId === testDeck[0]!.instanceId)).toBe(true);
          expect(result.updatedHand.some((c) => c.instanceId === testDeck[1]!.instanceId)).toBe(true);
          bothCardsInvalidCount++;

          // Verify step-by-step equivalent
          const step1 = digSingleStep(hand, testDeck, req, 1);
          expect(step1.canDigAgain).toBe(true);
          const step2 = digSingleStep(step1.updatedHand, step1.updatedGreenDeck, req, 2);
          expect(step2.pointLost).toBe(true);
          expect(step2.canDigAgain).toBe(false);
          expect(step2.reason).toBe('SECOND_ATTEMPT_INVALID');
        }
      }
    }

    console.log(`[Task 2 Cavação Fuzzing] 5,000 Iterations Breakdown:`);
    console.log(` - 1st card valid (forced play): ${firstCardValidCount}`);
    console.log(` - 2nd card valid (1st kept in hand, 2nd played): ${secondCardValidCount}`);
    console.log(` - Both cards invalid (point loss on 2nd miss): ${bothCardsInvalidCount}`);
    console.log(` - Green deck exhausted: ${deckExhaustedCount}`);

    expect(firstCardValidCount).toBeGreaterThan(500);
    expect(secondCardValidCount).toBeGreaterThan(500);
    expect(bothCardsInvalidCount).toBeGreaterThan(500);
    expect(deckExhaustedCount).toBeGreaterThan(500);
    expect(
      firstCardValidCount + secondCardValidCount + bothCardsInvalidCount + deckExhaustedCount
    ).toBe(SIMULATION_COUNT);
  });
});

describe('Empirical Challenger M1 - Task 3: Blue Deck Defense Exhaustion', () => {
  it('triggers point loss deterministically across 1,000 full exhaustion cycles', () => {
    const rng = mulberry32(0xbeefbabe);
    const CYCLES = 1000;

    for (let c = 0; c < CYCLES; c++) {
      const { blueDeck } = createDecks({ rng });
      expect(blueDeck.length).toBe(8);

      let currentDeck = blueDeck;

      // Draw exactly 8 times: every single draw must succeed and reduce deck size by 1
      for (let draw = 1; draw <= 8; draw++) {
        const result = drawDefenseCard(currentDeck, 'PLAYER', 'AI');
        expect(result.isExhausted).toBe(false);
        expect(result.drawnCard).not.toBeNull();
        expect(result.winner).toBeUndefined();
        expect(result.updatedBlueDeck.length).toBe(8 - draw);
        currentDeck = result.updatedBlueDeck;
      }

      // Deck is now at 0 cards
      expect(currentDeck.length).toBe(0);

      // Draw 9 (and subsequent draws up to 15): MUST deterministically return isExhausted=true, winner='AI'
      for (let extra = 1; extra <= 5; extra++) {
        const result = drawDefenseCard(currentDeck, 'PLAYER', 'AI');
        expect(result.isExhausted).toBe(true);
        expect(result.drawnCard).toBeNull();
        expect(result.winner).toBe('AI');
        expect(result.updatedBlueDeck.length).toBe(0);
      }
    }

    console.log(`[Task 3 Exhaustion] Verified 1,000 exhaustion cycles (8 successful draws followed by 5 deterministic losses per cycle = 13,000 draw checks).`);
  });

  it('determines winner correctly when AI is defender vs when PLAYER is defender', () => {
    const emptyDeck: CardInstance[] = [];

    // Player defending, AI attacking
    const playerDefending = drawDefenseCard(emptyDeck, 'PLAYER', 'AI');
    expect(playerDefending.isExhausted).toBe(true);
    expect(playerDefending.winner).toBe('AI');

    // AI defending, Player attacking
    const aiDefending = drawDefenseCard(emptyDeck, 'AI', 'PLAYER');
    expect(aiDefending.isExhausted).toBe(true);
    expect(aiDefending.winner).toBe('PLAYER');

    // Default fallback when attacker is omitted
    const fallbackPlayer = drawDefenseCard(emptyDeck, 'PLAYER');
    expect(fallbackPlayer.winner).toBe('AI');
    const fallbackAI = drawDefenseCard(emptyDeck, 'AI');
    expect(fallbackAI.winner).toBe('PLAYER');
  });

  it('verifies serve reception failure when receiver blue deck is exhausted', () => {
    // When serve is covered (server 1, receiver [1, 2])
    // but receiver has 0 blue cards
    const emptyDeck: CardInstance[] = [];
    const outcome = resolveServeAndDrawDefense(1, [1, 2], emptyDeck, 'PLAYER', 'AI');

    expect(outcome.serveResult.isAce).toBe(false);
    expect(outcome.serveResult.defenseSuccess).toBe(true);
    expect(outcome.defenseResult).not.toBeNull();
    expect(outcome.defenseResult?.isExhausted).toBe(true);
    expect(outcome.defenseResult?.winner).toBe('PLAYER');
  });

  it('integrates blue deck exhaustion with rally score engine point awarding', () => {
    let score = createInitialScore('FAST_1_GAME', 'PLAYER');
    expect(score.playerPoints).toBe(0);
    expect(score.aiPoints).toBe(0);

    // AI attacks, Player's blue deck is exhausted
    const defenseResult = drawDefenseCard([], 'PLAYER', 'AI');
    expect(defenseResult.isExhausted).toBe(true);
    expect(defenseResult.winner).toBe('AI');

    // Award point to AI
    const afterPoint1 = awardPoint(score, defenseResult.winner!);
    expect(afterPoint1.nextScore.aiPoints).toBe(15);
    expect(afterPoint1.nextScore.playerPoints).toBe(0);

    // AI attacks again, Player's blue deck still empty
    const afterPoint2 = awardPoint(afterPoint1.nextScore, defenseResult.winner!);
    expect(afterPoint2.nextScore.aiPoints).toBe(30);

    const afterPoint3 = awardPoint(afterPoint2.nextScore, defenseResult.winner!);
    expect(afterPoint3.nextScore.aiPoints).toBe(40);

    // 4th point closes game (FAST_1_GAME closes match!)
    const afterPoint4 = awardPoint(afterPoint3.nextScore, defenseResult.winner!);
    expect(afterPoint4.gameWonBy).toBe('AI');
    expect(afterPoint4.matchWonBy).toBe('AI');
    expect(afterPoint4.nextScore.matchWinner).toBe('AI');
  });
});

describe('Empirical Challenger M1 - Integrated Invariants: Legal Moves, Attacks & Wildcards', () => {
  it('correctly locks hand and demands blue defense on all 4 attack shots + wildcard attacks', () => {
    const { greenDeck } = createDecks();
    const hand = greenDeck.slice(0, 6);

    const attacks: CardType[] = ['SMASH', 'VOLEIO_ACELERADO', 'GANCHO_ATA', 'VERONICA_ATA'];

    for (const atkType of attacks) {
      const atkCard = createCardInstance(atkType, 'PLAYER', 0);
      const moves = getLegalMoves(hand, atkCard);

      expect(moves.requiresBlueDefense).toBe(true);
      expect(moves.canDig).toBe(false);
      expect(moves.playableCards).toEqual([]);
    }

    // Coringa Verde declared as attack
    const wildcard = createCardInstance('GOLPE_UBT_CORINGA', 'PLAYER', 0);
    for (const atkType of attacks) {
      const moves = getLegalMoves(hand, wildcard, atkType);
      expect(moves.requiresBlueDefense).toBe(true);
      expect(moves.canDig).toBe(false);
      expect(moves.playableCards).toEqual([]);
    }
  });

  it('correctly opens canDig strictly when no cards in hand match incoming non-attack shot', () => {
    const bandejasOnly: CardInstance[] = [
      createCardInstance('BANDEJA_CURTA', 'PLAYER', 0),
      createCardInstance('BANDEJA_LOB', 'PLAYER', 0),
    ];

    // Incoming Def Neutra requires VOLEIOS
    const defNeutra = createCardInstance('DEF_NEUTRA', 'AI', 0);
    const moves = getLegalMoves(bandejasOnly, defNeutra);

    expect(moves.requiresBlueDefense).toBe(false);
    expect(moves.playableCards.length).toBe(0);
    expect(moves.canDig).toBe(true);

    // If we add a Voleio to hand, canDig must become false
    const handWithVoleio = [...bandejasOnly, createCardInstance('VOLEIO_PINGADA', 'PLAYER', 0)];
    const moves2 = getLegalMoves(handWithVoleio, defNeutra);

    expect(moves2.playableCards.length).toBe(1);
    expect(moves2.canDig).toBe(false);

    // If we add Coringa Verde to hand, canDig must become false
    const handWithWildcard = [...bandejasOnly, createCardInstance('GOLPE_UBT_CORINGA', 'PLAYER', 0)];
    const moves3 = getLegalMoves(handWithWildcard, defNeutra);

    expect(moves3.playableCards.length).toBe(1);
    expect(moves3.canDig).toBe(false);
  });
});
