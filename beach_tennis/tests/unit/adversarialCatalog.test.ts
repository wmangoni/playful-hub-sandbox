/**
 * tests/unit/adversarialCatalog.test.ts
 *
 * EMPIRICAL ADVERSARIAL STRESS HARNESS
 * Milestone M0: Setup do Projeto, Contrato de Tipos e Catálogo Oficial
 *
 * Exhaustively probes:
 * 1. 19 x 19 = 361 raw card transition combinations (all Pink Sheet rules, non-response to serves, rejection of illegal cards)
 * 2. Wildcard masquerading attacks (normal cards trying to declare, green wildcard trying to defend, illegal declarations)
 * 3. Incoming wildcard declarations across all 19 possible types
 * 4. 10,000-iteration stochastic fuzzing with random valid and invalid payloads
 * 5. Deck generation invariant stress tests across 1,000 runs
 * 6. Immutability, edge cases, and type safety boundaries
 */

import { describe, it, expect } from 'vitest';
import {
  CARDS_CATALOG,
  ALL_CARDS,
  PINK_SHEET_TRANSITIONS,
  RESPONSE_GROUPS,
  getCardDefinition,
  getCardsByColor,
  isValidResponse,
  getValidWildcardDeclarations,
  createInitialDeckList,
} from '../../src/engine/cardsCatalog';
import type { CardType, CardColor } from '../../src/engine/types';

const ALL_19_TYPES: CardType[] = [
  'SAQUE_1',
  'SAQUE_2',
  'SAQUE_3',
  'DEF_CURTA',
  'DEF_NEUTRA',
  'DEF_LOB',
  'DEF_UBT_CORINGA',
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

const ORANGE_TYPES: CardType[] = ['SAQUE_1', 'SAQUE_2', 'SAQUE_3'];


const PINK_SHEET_14_REGULAR: Array<keyof typeof PINK_SHEET_TRANSITIONS> = [
  'DEF_CURTA',
  'VOLEIO_PINGADA',
  'BANDEJA_CURTA',
  'DEF_NEUTRA',
  'BANDEJA_LOB_CHUTADO',
  'VOLEIO_ACELERADO',
  'SMASH',
  'GANCHO_ATA',
  'VERONICA_ATA',
  'DEF_LOB',
  'VOLEIO_LOB',
  'BANDEJA_LOB',
  'GANCHO_DEF',
  'VERONICA_DEF',
];

describe('Empirical Adversarial Stress Harness - M0', () => {
  // ==========================================================================
  // HARNESS 1: EXHAUSTIVE 19x19 RAW COMBINATION PROBE (361 PAIRS)
  // ==========================================================================
  describe('Harness 1: Exhaustive 19x19 Raw Transitions Probe', () => {
    it('Orange serve cards must NEVER accept ANY card via isValidResponse (57/57 rejected)', () => {
      let tested = 0;
      let rejected = 0;

      for (const orange of ORANGE_TYPES) {
        for (const candidate of ALL_19_TYPES) {
          tested++;
          const valid = isValidResponse(orange, candidate);
          if (!valid) rejected++;
        }
      }

      expect(tested).toBe(57);
      expect(rejected).toBe(57);
    });

    it('Undeclared wildcards as incoming shots must reject ALL 19 cards (38/38 rejected)', () => {
      let tested = 0;
      let rejected = 0;

      for (const wildcard of ['DEF_UBT_CORINGA', 'GOLPE_UBT_CORINGA'] as CardType[]) {
        for (const candidate of ALL_19_TYPES) {
          tested++;
          const valid = isValidResponse(wildcard, candidate);
          if (!valid) rejected++;
        }
      }

      expect(tested).toBe(38);
      expect(rejected).toBe(38);
    });

    it('All 14 regular Pink Sheet cards must strictly accept ONLY their official responses and reject all others (266 transitions probed)', () => {
      let totalProbed = 0;
      let totalValid = 0;
      let totalInvalid = 0;

      for (const incoming of PINK_SHEET_14_REGULAR) {
        const required = PINK_SHEET_TRANSITIONS[incoming];
        const groupSpec = RESPONSE_GROUPS[required];

        for (const played of ALL_19_TYPES) {
          totalProbed++;
          const actualResult = isValidResponse(incoming, played);

          let expectedResult = false;
          if (required === 'DEFESAS') {
            expectedResult = CARDS_CATALOG[played].color === 'BLUE';
          } else {
            const isAllowedNormal = groupSpec.allowedCards.includes(played);
            const isGreenWildcardAllowed = groupSpec.allowsGreenWildcard && played === 'GOLPE_UBT_CORINGA';
            expectedResult = isAllowedNormal || isGreenWildcardAllowed;
          }

          expect(
            actualResult,
            `Transition ${incoming} -> ${played} (demands ${required}): expected ${expectedResult}, got ${actualResult}`
          ).toBe(expectedResult);

          if (actualResult) totalValid++;
          else totalInvalid++;
        }
      }

      expect(totalProbed).toBe(14 * 19); // 266
      // Let's verify exact distribution of valid transitions:
      // 3 BANDEJAS incoming (DEF_CURTA, VOLEIO_PINGADA, BANDEJA_CURTA) * 4 allowed = 12
      // 2 VOLEIOS incoming (DEF_NEUTRA, BANDEJA_LOB_CHUTADO) * 4 allowed = 8
      // 4 DEFESAS incoming (VOLEIO_ACELERADO, SMASH, GANCHO_ATA, VERONICA_ATA) * 4 allowed = 16
      // 5 FUNDO incoming (DEF_LOB, VOLEIO_LOB, BANDEJA_LOB, GANCHO_DEF, VERONICA_DEF) * 6 allowed = 30
      // Total valid = 12 + 8 + 16 + 30 = 66
      expect(totalValid).toBe(66);
      expect(totalInvalid).toBe(266 - 66); // 200
    });
  });

  // ==========================================================================
  // HARNESS 2: MASQUERADING AND WILDCARD HIJACKING ATTACKS
  // ==========================================================================
  describe('Harness 2: Masquerading & Type Hijacking Attacks', () => {
    it('Normal non-wildcard cards CANNOT masquerade as another card via playedDeclaredType', () => {
      // An attacker attempts to play SMASH while passing playedDeclaredType = 'BANDEJA_CURTA' against DEF_CURTA
      const attackSmashAsBandeja = isValidResponse(
        'DEF_CURTA',
        'SMASH',
        'BANDEJA_CURTA'
      );
      expect(attackSmashAsBandeja).toBe(false);

      // An attacker attempts to play BANDEJA_CURTA while passing playedDeclaredType = 'DEF_CURTA' against SMASH
      const attackBandejaAsDefCurta = isValidResponse(
        'SMASH',
        'BANDEJA_CURTA',
        'DEF_CURTA'
      );
      expect(attackBandejaAsDefCurta).toBe(false);

      // Exhaustive test: For ALL 17 non-wildcard cards, passing ANY playedDeclaredType must NEVER make an illegal move legal
      let attackAttempts = 0;
      let attackSuccesses = 0;

      const nonWildcards = ALL_19_TYPES.filter(
        (t) => t !== 'GOLPE_UBT_CORINGA' && t !== 'DEF_UBT_CORINGA'
      );

      for (const incoming of PINK_SHEET_14_REGULAR) {
        for (const played of nonWildcards) {
          const naturallyLegal = isValidResponse(incoming, played);
          if (!naturallyLegal) {
            // Attempt to forge with every possible declared type
            for (const forgedDeclaration of ALL_19_TYPES) {
              attackAttempts++;
              const result = isValidResponse(incoming, played, forgedDeclaration);
              if (result) {
                attackSuccesses++;
              }
            }
          }
        }
      }

      expect(attackAttempts).toBeGreaterThan(3000);
      expect(attackSuccesses).toBe(0); // ZERO masquerade vulnerabilities allowed!
    });

    it('GOLPE_UBT_CORINGA CANNOT defend against attacks requiring DEFESAS regardless of declaration (19/19 rejected)', () => {
      const attackIncoming: CardType[] = ['SMASH', 'VOLEIO_ACELERADO', 'GANCHO_ATA', 'VERONICA_ATA'];

      for (const incoming of attackIncoming) {
        // Undeclared green wildcard
        expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA')).toBe(false);

        // Green wildcard declared as any of the 19 cards
        for (const declared of ALL_19_TYPES) {
          const result = isValidResponse(incoming, 'GOLPE_UBT_CORINGA', declared);
          expect(
            result,
            `Green wildcard declared as ${declared} against ${incoming} MUST be rejected!`
          ).toBe(false);
        }
      }
    });

    it('GOLPE_UBT_CORINGA declared with an out-of-group card must be rejected', () => {
      // Incoming DEF_CURTA requires BANDEJAS
      // Declaring VOLEIO_PINGADA (Voleio) -> REJECT
      expect(isValidResponse('DEF_CURTA', 'GOLPE_UBT_CORINGA', 'VOLEIO_PINGADA')).toBe(false);
      // Declaring SMASH (Fundo) -> REJECT
      expect(isValidResponse('DEF_CURTA', 'GOLPE_UBT_CORINGA', 'SMASH')).toBe(false);
      // Declaring DEF_CURTA (Defesa) -> REJECT
      expect(isValidResponse('DEF_CURTA', 'GOLPE_UBT_CORINGA', 'DEF_CURTA')).toBe(false);
      // Declaring SAQUE_1 (Saque) -> REJECT
      expect(isValidResponse('DEF_CURTA', 'GOLPE_UBT_CORINGA', 'SAQUE_1')).toBe(false);

      // Declaring BANDEJA_CURTA -> ACCEPT
      expect(isValidResponse('DEF_CURTA', 'GOLPE_UBT_CORINGA', 'BANDEJA_CURTA')).toBe(true);
      // Declaring BANDEJA_LOB_CHUTADO -> ACCEPT
      expect(isValidResponse('DEF_CURTA', 'GOLPE_UBT_CORINGA', 'BANDEJA_LOB_CHUTADO')).toBe(true);
      // Declaring BANDEJA_LOB -> ACCEPT
      expect(isValidResponse('DEF_CURTA', 'GOLPE_UBT_CORINGA', 'BANDEJA_LOB')).toBe(true);
    });

    it('DEF_UBT_CORINGA cannot be played to respond to BANDEJAS, VOLEIOS, or FUNDO', () => {
      const nonDefesasIncoming: CardType[] = [
        'DEF_CURTA', // requires BANDEJAS
        'DEF_NEUTRA', // requires VOLEIOS
        'DEF_LOB', // requires FUNDO
      ];

      for (const incoming of nonDefesasIncoming) {
        expect(isValidResponse(incoming, 'DEF_UBT_CORINGA')).toBe(false);

        // Even with declaredType passed
        for (const declared of ALL_19_TYPES) {
          expect(isValidResponse(incoming, 'DEF_UBT_CORINGA', declared)).toBe(false);
        }
      }
    });
  });

  // ==========================================================================
  // HARNESS 3: INCOMING WILDCARDS WITH DECLARATIONS
  // ==========================================================================
  describe('Harness 3: Incoming Wildcard Declarations Probe', () => {
    it('Incoming DEF_UBT_CORINGA properly enforces response group of its declared card', () => {
      // Declared as DEF_CURTA -> requires BANDEJAS
      expect(isValidResponse('DEF_UBT_CORINGA', 'BANDEJA_CURTA', undefined, 'DEF_CURTA')).toBe(true);
      expect(isValidResponse('DEF_UBT_CORINGA', 'VOLEIO_PINGADA', undefined, 'DEF_CURTA')).toBe(false);

      // Declared as DEF_NEUTRA -> requires VOLEIOS
      expect(isValidResponse('DEF_UBT_CORINGA', 'VOLEIO_PINGADA', undefined, 'DEF_NEUTRA')).toBe(true);
      expect(isValidResponse('DEF_UBT_CORINGA', 'BANDEJA_CURTA', undefined, 'DEF_NEUTRA')).toBe(false);

      // Declared as DEF_LOB -> requires FUNDO
      expect(isValidResponse('DEF_UBT_CORINGA', 'SMASH', undefined, 'DEF_LOB')).toBe(true);
      expect(isValidResponse('DEF_UBT_CORINGA', 'BANDEJA_CURTA', undefined, 'DEF_LOB')).toBe(false);
    });

    it('Incoming GOLPE_UBT_CORINGA properly enforces response group of its declared card', () => {
      // Declared as SMASH -> requires DEFESAS
      expect(isValidResponse('GOLPE_UBT_CORINGA', 'DEF_CURTA', undefined, 'SMASH')).toBe(true);
      expect(isValidResponse('GOLPE_UBT_CORINGA', 'SMASH', undefined, 'SMASH')).toBe(false);

      // Declared as VOLEIO_PINGADA -> requires BANDEJAS
      expect(isValidResponse('GOLPE_UBT_CORINGA', 'BANDEJA_CURTA', undefined, 'VOLEIO_PINGADA')).toBe(true);
      expect(isValidResponse('GOLPE_UBT_CORINGA', 'VOLEIO_PINGADA', undefined, 'VOLEIO_PINGADA')).toBe(false);
    });

    it('Incoming wildcard with invalid/missing declaration returns false', () => {
      expect(isValidResponse('DEF_UBT_CORINGA', 'BANDEJA_CURTA')).toBe(false);
      expect(isValidResponse('GOLPE_UBT_CORINGA', 'BANDEJA_CURTA')).toBe(false);
      expect(isValidResponse('DEF_UBT_CORINGA', 'BANDEJA_CURTA', undefined, undefined)).toBe(false);
      expect(isValidResponse('GOLPE_UBT_CORINGA', 'BANDEJA_CURTA', undefined, undefined)).toBe(false);
    });
  });

  // ==========================================================================
  // HARNESS 4: STOCHASTIC RANDOM FUZZING (10,000 ITERATIONS)
  // ==========================================================================
  describe('Harness 4: Stochastic Random Fuzzing (10,000 Iterations)', () => {
    it('Robustness under 10,000 random card and declaration combinations with zero crashes', () => {
      const allTypesWithUndefined: Array<CardType | undefined> = [...ALL_19_TYPES, undefined];

      let trueCount = 0;
      let falseCount = 0;

      for (let i = 0; i < 10000; i++) {
        const incoming = ALL_19_TYPES[Math.floor(Math.random() * ALL_19_TYPES.length)]!;
        const played = ALL_19_TYPES[Math.floor(Math.random() * ALL_19_TYPES.length)]!;
        const playedDecl = allTypesWithUndefined[Math.floor(Math.random() * allTypesWithUndefined.length)];
        const incomingDecl = allTypesWithUndefined[Math.floor(Math.random() * allTypesWithUndefined.length)];

        // Call isValidResponse; must not throw
        let result: boolean;
        expect(() => {
          result = isValidResponse(incoming, played, playedDecl, incomingDecl);
        }).not.toThrow();

        result = isValidResponse(incoming, played, playedDecl, incomingDecl);
        if (result) {
          trueCount++;
          // Invariant 1: If true, incoming must not be ORANGE
          expect(ORANGE_TYPES).not.toContain(incoming);

          // Invariant 2: If incoming was a wildcard, incomingDecl must be defined
          if (incoming === 'DEF_UBT_CORINGA' || incoming === 'GOLPE_UBT_CORINGA') {
            expect(incomingDecl).toBeDefined();
          }

          // Invariant 3: If played is an orange card, result can never be true
          expect(ORANGE_TYPES).not.toContain(played);
        } else {
          falseCount++;
        }
      }

      // Assert that fuzzing explored both valid and invalid branches
      expect(trueCount).toBeGreaterThan(500);
      expect(falseCount).toBeGreaterThan(5000);
    });
  });

  // ==========================================================================
  // HARNESS 5: DECK GENERATION INVARIANTS (1,000 RUNS)
  // ==========================================================================
  describe('Harness 5: Deck Generation Invariant Stress Tests (1,000 Runs)', () => {
    it('Repeated generation of GREEN deck produces exact count and 0 duplicates/missing across 1,000 runs', () => {
      const greenDefs = getCardsByColor('GREEN');
      expect(greenDefs).toHaveLength(12);

      for (let run = 0; run < 1000; run++) {
        const deck = createInitialDeckList('GREEN');

        expect(deck).toHaveLength(24);

        const histogram = new Map<CardType, number>();
        for (const type of deck) {
          histogram.set(type, (histogram.get(type) || 0) + 1);
        }

        // Must have exactly 12 unique types
        expect(histogram.size).toBe(12);

        // Each unique type must have exactly 2 copies
        for (const def of greenDefs) {
          expect(histogram.get(def.type)).toBe(2);
        }

        // Total count must be 24
        const total = Array.from(histogram.values()).reduce((a, b) => a + b, 0);
        expect(total).toBe(24);
      }
    });

    it('Repeated generation of BLUE deck produces exact count and 0 duplicates/missing across 1,000 runs', () => {
      const blueDefs = getCardsByColor('BLUE');
      expect(blueDefs).toHaveLength(4);

      for (let run = 0; run < 1000; run++) {
        const deck = createInitialDeckList('BLUE');

        expect(deck).toHaveLength(8);

        const histogram = new Map<CardType, number>();
        for (const type of deck) {
          histogram.set(type, (histogram.get(type) || 0) + 1);
        }

        expect(histogram.size).toBe(4);

        for (const def of blueDefs) {
          expect(histogram.get(def.type)).toBe(2);
        }

        const total = Array.from(histogram.values()).reduce((a, b) => a + b, 0);
        expect(total).toBe(8);
      }
    });

    it('Repeated generation of ORANGE cards produces exact 1v1 set (1..3) across 1,000 runs', () => {
      for (let run = 0; run < 1000; run++) {
        const deck = createInitialDeckList('ORANGE');
        expect(deck).toEqual(['SAQUE_1', 'SAQUE_2', 'SAQUE_3']);
      }
    });

    it('Deck generation for unknown colors returns empty array without throwing', () => {
      const invalidDeck = createInitialDeckList('RED' as unknown as CardColor);
      expect(invalidDeck).toEqual([]);
    });

    it('Output of createInitialDeckList is a new array and does not mutate internal catalog', () => {
      const deck1 = createInitialDeckList('GREEN');
      const deck2 = createInitialDeckList('GREEN');

      expect(deck1).not.toBe(deck2); // Distinct array references

      // Mutate deck1 and verify deck2 and catalog are unaffected
      deck1.pop();
      expect(deck1).toHaveLength(23);
      expect(deck2).toHaveLength(24);
      expect(createInitialDeckList('GREEN')).toHaveLength(24);
    });
  });

  // ==========================================================================
  // HARNESS 6: CATALOG IMMUTABILITY & SPEC CONTRACT COMPLIANCE
  // ==========================================================================
  describe('Harness 6: Catalog Immutability & Contract Robustness', () => {
    it('ALL_CARDS is frozen and cannot be mutated', () => {
      expect(Object.isFrozen(ALL_CARDS)).toBe(true);

      expect(() => {
        // @ts-expect-error Testing runtime freeze protection
        ALL_CARDS.push({} as any);
      }).toThrow();
    });

    it('Every card definition has immutable invariants', () => {
      for (const card of ALL_CARDS) {
        expect(card.quantityInDeck).toBeGreaterThan(0);
        if (card.color === 'ORANGE') {
          expect(card.quantityInDeck).toBe(1);
          expect(card.belongsToGroups).toHaveLength(0);
          expect(card.requiredResponse).toBeUndefined();
          expect(card.isAttack).toBe(false);
          expect(card.isWildcard).toBe(false);
          expect([1, 2, 3]).toContain(card.serveNumber);
        } else if (card.color === 'BLUE') {
          expect(card.quantityInDeck).toBe(2);
          expect(card.belongsToGroups).toEqual(['DEFESAS']);
          expect(card.isAttack).toBe(false);
          expect(card.serveNumber).toBeUndefined();
        } else if (card.color === 'GREEN') {
          expect(card.quantityInDeck).toBe(2);
          expect(card.serveNumber).toBeUndefined();
          if (card.isAttack) {
            expect(card.requiredResponse).toBe('DEFESAS');
          }
        }
      }
    });

    it('getCardDefinition throws error on invalid inputs', () => {
      const badInputs = ['', 'null', 'INVALID_CARD', 'undefined', '123'];
      for (const bad of badInputs) {
        expect(() => getCardDefinition(bad as CardType)).toThrowError(
          /Tipo de carta desconhecido/
        );
      }
    });
  });

  // ==========================================================================
  // HARNESS 7: MALFORMED INPUTS & WILDCARD FENCING BOUNDARIES
  // ==========================================================================
  describe('Harness 7: Malformed Inputs & Wildcard Fencing Boundaries', () => {
    it('isValidResponse safely rejects malformed or uncast strings without throwing', () => {
      const malformed: CardType[] = [
        '' as unknown as CardType,
        'INVALID' as unknown as CardType,
        'foo_bar' as unknown as CardType,
        null as unknown as CardType,
        undefined as unknown as CardType,
      ];

      for (const bad of malformed) {
        // Bad incoming
        expect(isValidResponse(bad, 'BANDEJA_CURTA')).toBe(false);
        // Bad played
        expect(isValidResponse('DEF_CURTA', bad)).toBe(false);
        // Both bad
        expect(isValidResponse(bad, bad)).toBe(false);
      }
    });

    it('getValidWildcardDeclarations strictly partitions legal declarations between Blue and Green', () => {
      // Blue wildcard declarations MUST be strictly 3 Blue defenses
      const blueDeclarations = getValidWildcardDeclarations('DEF_UBT_CORINGA');
      expect(blueDeclarations).toEqual(['DEF_CURTA', 'DEF_NEUTRA', 'DEF_LOB']);
      for (const decl of blueDeclarations) {
        expect(CARDS_CATALOG[decl].color).toBe('BLUE');
        expect(CARDS_CATALOG[decl].isWildcard).toBe(false);
      }

      // Green wildcard under DEFESAS MUST return empty array (strictly forbidden from defending)
      expect(getValidWildcardDeclarations('GOLPE_UBT_CORINGA', 'DEFESAS')).toEqual([]);

      // Green wildcard under BANDEJAS must return strictly the 3 Bandejas
      expect(getValidWildcardDeclarations('GOLPE_UBT_CORINGA', 'BANDEJAS')).toEqual([
        'BANDEJA_CURTA',
        'BANDEJA_LOB_CHUTADO',
        'BANDEJA_LOB',
      ]);

      // Green wildcard under VOLEIOS must return strictly the 3 Voleios
      expect(getValidWildcardDeclarations('GOLPE_UBT_CORINGA', 'VOLEIOS')).toEqual([
        'VOLEIO_PINGADA',
        'VOLEIO_ACELERADO',
        'VOLEIO_LOB',
      ]);

      // Green wildcard under FUNDO must return strictly the 5 Fundo strokes
      expect(getValidWildcardDeclarations('GOLPE_UBT_CORINGA', 'FUNDO')).toEqual([
        'SMASH',
        'GANCHO_ATA',
        'GANCHO_DEF',
        'VERONICA_ATA',
        'VERONICA_DEF',
      ]);

      // Normal non-wildcard cards return empty array
      expect(getValidWildcardDeclarations('SMASH')).toEqual([]);
      expect(getValidWildcardDeclarations('SAQUE_1')).toEqual([]);
      expect(getValidWildcardDeclarations('DEF_CURTA')).toEqual([]);
    });
  });
});

