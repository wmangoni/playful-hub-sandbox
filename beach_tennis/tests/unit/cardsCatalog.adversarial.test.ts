/**
 * tests/unit/cardsCatalog.adversarial.test.ts
 *
 * EMPIRICAL ADVERSARIAL VERIFICATION SUITE - MILESTONE M0
 * Challenger Agent: challenger_m0_2
 *
 * Exhaustive empirical verification of boundary conditions, illegal transitions,
 * undeclared wildcards, and the complete 19x19 interaction matrix.
 */

import { describe, it, expect } from 'vitest';
import {
  getCardRequiredResponse,
  isCardLegalForResponse,
  isValidResponse,
  getValidWildcardDeclarations,
} from '../../src/engine/cardsCatalog';
import type {
  CardType,
  OrangeCardType,
  BlueCardType,
  GreenCardType,
} from '../../src/engine/types';

const ALL_19_CARD_TYPES: CardType[] = [
  // 3 Orange
  'SAQUE_1',
  'SAQUE_2',
  'SAQUE_3',
  // 4 Blue
  'DEF_CURTA',
  'DEF_NEUTRA',
  'DEF_LOB',
  'DEF_UBT_CORINGA',
  // 12 Green
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

const ORANGE_CARDS: OrangeCardType[] = ['SAQUE_1', 'SAQUE_2', 'SAQUE_3'];

const ATTACK_CARDS: GreenCardType[] = [
  'SMASH',
  'VOLEIO_ACELERADO',
  'GANCHO_ATA',
  'VERONICA_ATA',
];

const GREEN_NON_WILDCARDS: GreenCardType[] = [
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
];

describe('Empirical Adversarial Verification Suite (challenger_m0_2)', () => {
  // ==========================================================================
  // CHALLENGE 1: GOLPE_UBT_CORINGA against ATTACKS (declaredAs: 'SMASH' vs 'SMASH')
  // ==========================================================================
  describe('Challenge 1: GOLPE_UBT_CORINGA against Attacks is Strictly Prohibited', () => {
    it("playing GOLPE_UBT_CORINGA declaredAs 'SMASH' against SMASH must be ILLEGAL (false)", () => {
      const result = isValidResponse('SMASH', 'GOLPE_UBT_CORINGA', 'SMASH');
      expect(result).toBe(false);
    });

    it('playing GOLPE_UBT_CORINGA undeclared against SMASH must be ILLEGAL (false)', () => {
      const result = isValidResponse('SMASH', 'GOLPE_UBT_CORINGA');
      expect(result).toBe(false);
    });

    it('playing GOLPE_UBT_CORINGA with ANY of the 19 card types as declaredAs against SMASH must be ILLEGAL', () => {
      for (const declared of ALL_19_CARD_TYPES) {
        const result = isValidResponse('SMASH', 'GOLPE_UBT_CORINGA', declared);
        expect(result).toBe(false);
      }
    });

    it('playing GOLPE_UBT_CORINGA against ALL 4 attack cards must be ILLEGAL for ALL possible declarations', () => {
      for (const attack of ATTACK_CARDS) {
        // Undeclared attempt
        expect(isValidResponse(attack, 'GOLPE_UBT_CORINGA')).toBe(false);

        // Every possible declared type attempt
        for (const declared of ALL_19_CARD_TYPES) {
          expect(isValidResponse(attack, 'GOLPE_UBT_CORINGA', declared)).toBe(false);
        }
      }
    });

    it('getValidWildcardDeclarations for GOLPE_UBT_CORINGA under DEFESAS requirement must return empty array', () => {
      const declarations = getValidWildcardDeclarations('GOLPE_UBT_CORINGA', 'DEFESAS');
      expect(declarations).toEqual([]);
    });

    it('isCardLegalForResponse must explicitly reject GOLPE_UBT_CORINGA when requiredResponse is DEFESAS', () => {
      expect(isCardLegalForResponse('GOLPE_UBT_CORINGA', 'DEFESAS')).toBe(false);
      expect(isCardLegalForResponse('GOLPE_UBT_CORINGA', 'DEFESAS', 'SMASH')).toBe(false);
      expect(isCardLegalForResponse('GOLPE_UBT_CORINGA', 'DEFESAS', 'DEF_CURTA')).toBe(false);
    });
  });

  // ==========================================================================
  // CHALLENGE 2: Undeclared DEF_UBT_CORINGA and GOLPE_UBT_CORINGA
  // ==========================================================================
  describe('Challenge 2: Undeclared Wildcards Must Require Declaration', () => {
    it('getCardRequiredResponse for DEF_UBT_CORINGA without declaredAs must return undefined', () => {
      expect(getCardRequiredResponse('DEF_UBT_CORINGA')).toBeUndefined();
      expect(getCardRequiredResponse('DEF_UBT_CORINGA', undefined)).toBeUndefined();
    });

    it('getCardRequiredResponse for GOLPE_UBT_CORINGA without declaredAs must return undefined', () => {
      expect(getCardRequiredResponse('GOLPE_UBT_CORINGA')).toBeUndefined();
      expect(getCardRequiredResponse('GOLPE_UBT_CORINGA', undefined)).toBeUndefined();
    });

    it('when DEF_UBT_CORINGA is the incoming card and is undeclared, NO played card in the entire 19-card catalog can be legal', () => {
      let legalCount = 0;
      for (const played of ALL_19_CARD_TYPES) {
        const isLegal = isValidResponse('DEF_UBT_CORINGA', played, undefined, undefined);
        if (isLegal) legalCount++;
        expect(isLegal).toBe(false);
      }
      expect(legalCount).toBe(0);
    });

    it('when GOLPE_UBT_CORINGA is the incoming card and is undeclared, NO played card in the entire 19-card catalog can be legal', () => {
      let legalCount = 0;
      for (const played of ALL_19_CARD_TYPES) {
        const isLegal = isValidResponse('GOLPE_UBT_CORINGA', played, undefined, undefined);
        if (isLegal) legalCount++;
        expect(isLegal).toBe(false);
      }
      expect(legalCount).toBe(0);
    });

    it('when DEF_UBT_CORINGA is declared, it correctly enforces the declared defense type', () => {
      // Declared as DEF_CURTA -> requires BANDEJAS
      expect(isValidResponse('DEF_UBT_CORINGA', 'BANDEJA_CURTA', undefined, 'DEF_CURTA')).toBe(true);
      expect(isValidResponse('DEF_UBT_CORINGA', 'BANDEJA_LOB_CHUTADO', undefined, 'DEF_CURTA')).toBe(true);
      expect(isValidResponse('DEF_UBT_CORINGA', 'BANDEJA_LOB', undefined, 'DEF_CURTA')).toBe(true);
      expect(isValidResponse('DEF_UBT_CORINGA', 'VOLEIO_PINGADA', undefined, 'DEF_CURTA')).toBe(false);
      expect(isValidResponse('DEF_UBT_CORINGA', 'SMASH', undefined, 'DEF_CURTA')).toBe(false);

      // Declared as DEF_NEUTRA -> requires VOLEIOS
      expect(isValidResponse('DEF_UBT_CORINGA', 'VOLEIO_PINGADA', undefined, 'DEF_NEUTRA')).toBe(true);
      expect(isValidResponse('DEF_UBT_CORINGA', 'VOLEIO_ACELERADO', undefined, 'DEF_NEUTRA')).toBe(true);
      expect(isValidResponse('DEF_UBT_CORINGA', 'VOLEIO_LOB', undefined, 'DEF_NEUTRA')).toBe(true);
      expect(isValidResponse('DEF_UBT_CORINGA', 'BANDEJA_CURTA', undefined, 'DEF_NEUTRA')).toBe(false);
      expect(isValidResponse('DEF_UBT_CORINGA', 'SMASH', undefined, 'DEF_NEUTRA')).toBe(false);

      // Declared as DEF_LOB -> requires FUNDO
      expect(isValidResponse('DEF_UBT_CORINGA', 'SMASH', undefined, 'DEF_LOB')).toBe(true);
      expect(isValidResponse('DEF_UBT_CORINGA', 'GANCHO_ATA', undefined, 'DEF_LOB')).toBe(true);
      expect(isValidResponse('DEF_UBT_CORINGA', 'GANCHO_DEF', undefined, 'DEF_LOB')).toBe(true);
      expect(isValidResponse('DEF_UBT_CORINGA', 'VERONICA_ATA', undefined, 'DEF_LOB')).toBe(true);
      expect(isValidResponse('DEF_UBT_CORINGA', 'VERONICA_DEF', undefined, 'DEF_LOB')).toBe(true);
      expect(isValidResponse('DEF_UBT_CORINGA', 'BANDEJA_CURTA', undefined, 'DEF_LOB')).toBe(false);
      expect(isValidResponse('DEF_UBT_CORINGA', 'VOLEIO_PINGADA', undefined, 'DEF_LOB')).toBe(false);
    });

    it('getValidWildcardDeclarations for DEF_UBT_CORINGA must return strictly the 3 defense types', () => {
      const allowed = getValidWildcardDeclarations('DEF_UBT_CORINGA');
      expect(allowed.sort()).toEqual(['DEF_CURTA', 'DEF_NEUTRA', 'DEF_LOB'].sort());
    });
  });

  // ==========================================================================
  // CHALLENGE 3: Complete 19 x 19 Interaction Matrix (361 pairs)
  // ==========================================================================
  describe('Challenge 3: Complete 19 x 19 Card Interaction Pairs Matrix', () => {
    it('empirically evaluates all 361 pairs and asserts exact legal (66) and illegal (295) counts', () => {
      let totalPairs = 0;
      let legalCount = 0;
      let illegalCount = 0;

      const matrixResults: Record<string, boolean> = {};

      for (const incoming of ALL_19_CARD_TYPES) {
        for (const played of ALL_19_CARD_TYPES) {
          totalPairs++;
          const isLegal = isValidResponse(incoming, played);
          matrixResults[`${incoming}->${played}`] = isLegal;

          if (isLegal) {
            legalCount++;
          } else {
            illegalCount++;
          }
        }
      }

      expect(totalPairs).toBe(361);
      expect(legalCount).toBe(66);
      expect(illegalCount).toBe(295);
      expect(legalCount + illegalCount).toBe(361);
    });

    it('verifies that Orange cards can never legally be involved in rally transitions', () => {
      // Orange cards as incoming (3 * 19 = 57 pairs)
      for (const orange of ORANGE_CARDS) {
        for (const played of ALL_19_CARD_TYPES) {
          expect(isValidResponse(orange, played)).toBe(false);
        }
      }

      // Orange cards as played (19 * 3 = 57 pairs)
      for (const incoming of ALL_19_CARD_TYPES) {
        for (const orange of ORANGE_CARDS) {
          expect(isValidResponse(incoming, orange)).toBe(false);
        }
      }
    });

    it('verifies Pink Sheet transitions for Bolas Curtas (DEF_CURTA, VOLEIO_PINGADA, BANDEJA_CURTA)', () => {
      const shortBalls: CardType[] = ['DEF_CURTA', 'VOLEIO_PINGADA', 'BANDEJA_CURTA'];
      const expectedLegalPlayed: CardType[] = [
        'BANDEJA_CURTA',
        'BANDEJA_LOB_CHUTADO',
        'BANDEJA_LOB',
        'GOLPE_UBT_CORINGA',
      ];

      for (const incoming of shortBalls) {
        for (const played of ALL_19_CARD_TYPES) {
          const isLegal = isValidResponse(incoming, played);
          if (expectedLegalPlayed.includes(played)) {
            expect(isLegal).toBe(true);
          } else {
            expect(isLegal).toBe(false);
          }
        }
      }
    });

    it('verifies Pink Sheet transitions for Bolas Neutras/Médias (DEF_NEUTRA, BANDEJA_LOB_CHUTADO)', () => {
      const neutralBalls: CardType[] = ['DEF_NEUTRA', 'BANDEJA_LOB_CHUTADO'];
      const expectedLegalPlayed: CardType[] = [
        'VOLEIO_PINGADA',
        'VOLEIO_ACELERADO',
        'VOLEIO_LOB',
        'GOLPE_UBT_CORINGA',
      ];

      for (const incoming of neutralBalls) {
        for (const played of ALL_19_CARD_TYPES) {
          const isLegal = isValidResponse(incoming, played);
          if (expectedLegalPlayed.includes(played)) {
            expect(isLegal).toBe(true);
          } else {
            expect(isLegal).toBe(false);
          }
        }
      }
    });

    it('verifies Pink Sheet transitions for Bolas de Ataque (VOLEIO_ACELERADO, SMASH, GANCHO_ATA, VERONICA_ATA)', () => {
      const attackBalls: CardType[] = ['VOLEIO_ACELERADO', 'SMASH', 'GANCHO_ATA', 'VERONICA_ATA'];
      const expectedLegalPlayed: CardType[] = [
        'DEF_CURTA',
        'DEF_NEUTRA',
        'DEF_LOB',
        'DEF_UBT_CORINGA',
      ];

      for (const incoming of attackBalls) {
        for (const played of ALL_19_CARD_TYPES) {
          const isLegal = isValidResponse(incoming, played);
          if (expectedLegalPlayed.includes(played)) {
            expect(isLegal).toBe(true);
          } else {
            expect(isLegal).toBe(false);
          }
        }
      }
    });

    it('verifies Pink Sheet transitions for Lobs e Bolas Altas (DEF_LOB, VOLEIO_LOB, BANDEJA_LOB, GANCHO_DEF, VERONICA_DEF)', () => {
      const lobBalls: CardType[] = [
        'DEF_LOB',
        'VOLEIO_LOB',
        'BANDEJA_LOB',
        'GANCHO_DEF',
        'VERONICA_DEF',
      ];
      const expectedLegalPlayed: CardType[] = [
        'SMASH',
        'GANCHO_ATA',
        'GANCHO_DEF',
        'VERONICA_ATA',
        'VERONICA_DEF',
        'GOLPE_UBT_CORINGA',
      ];

      for (const incoming of lobBalls) {
        for (const played of ALL_19_CARD_TYPES) {
          const isLegal = isValidResponse(incoming, played);
          if (expectedLegalPlayed.includes(played)) {
            expect(isLegal).toBe(true);
          } else {
            expect(isLegal).toBe(false);
          }
        }
      }
    });
  });

  // ==========================================================================
  // CHALLENGE 4: Incompatible Declarations for Green Wildcard
  // ==========================================================================
  describe('Challenge 4: Incompatible Green Wildcard Declarations', () => {
    it('when incoming requires BANDEJAS, GOLPE_UBT_CORINGA cannot be declared as VOLEIO or FUNDO', () => {
      const incoming = 'DEF_CURTA'; // requires BANDEJAS

      // Legal declarations (Bandejas)
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'BANDEJA_CURTA')).toBe(true);
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'BANDEJA_LOB_CHUTADO')).toBe(true);
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'BANDEJA_LOB')).toBe(true);

      // Illegal declarations (Voleios)
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'VOLEIO_PINGADA')).toBe(false);
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'VOLEIO_ACELERADO')).toBe(false);
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'VOLEIO_LOB')).toBe(false);

      // Illegal declarations (Fundo)
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'SMASH')).toBe(false);
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'GANCHO_ATA')).toBe(false);
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'VERONICA_ATA')).toBe(false);
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'GANCHO_DEF')).toBe(false);
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'VERONICA_DEF')).toBe(false);

      // Illegal declarations (Non-green)
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'DEF_CURTA')).toBe(false);
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'SAQUE_1')).toBe(false);
    });

    it('when incoming requires VOLEIOS, GOLPE_UBT_CORINGA cannot be declared as BANDEJA or FUNDO', () => {
      const incoming = 'DEF_NEUTRA'; // requires VOLEIOS

      // Legal declarations (Voleios)
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'VOLEIO_PINGADA')).toBe(true);
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'VOLEIO_ACELERADO')).toBe(true);
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'VOLEIO_LOB')).toBe(true);

      // Illegal declarations (Bandejas)
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'BANDEJA_CURTA')).toBe(false);
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'BANDEJA_LOB_CHUTADO')).toBe(false);
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'BANDEJA_LOB')).toBe(false);

      // Illegal declarations (Fundo)
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'SMASH')).toBe(false);
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'GANCHO_ATA')).toBe(false);
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'VERONICA_ATA')).toBe(false);
    });

    it('when incoming requires FUNDO, GOLPE_UBT_CORINGA cannot be declared as BANDEJA or VOLEIO', () => {
      const incoming = 'DEF_LOB'; // requires FUNDO

      // Legal declarations (Fundo)
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'SMASH')).toBe(true);
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'GANCHO_ATA')).toBe(true);
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'VERONICA_ATA')).toBe(true);
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'GANCHO_DEF')).toBe(true);
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'VERONICA_DEF')).toBe(true);

      // Illegal declarations (Bandejas)
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'BANDEJA_CURTA')).toBe(false);
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'BANDEJA_LOB')).toBe(false);

      // Illegal declarations (Voleios)
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'VOLEIO_PINGADA')).toBe(false);
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'VOLEIO_ACELERADO')).toBe(false);
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', 'VOLEIO_LOB')).toBe(false);
    });
  });

  // ==========================================================================
  // CHALLENGE 5: GOLPE_UBT_CORINGA Declared as Incoming Shot
  // ==========================================================================
  describe('Challenge 5: GOLPE_UBT_CORINGA as Incoming Card with Declarations', () => {
    it('when GOLPE_UBT_CORINGA was declared as SMASH, opponent MUST respond with Blue Defenses', () => {
      const incoming = 'GOLPE_UBT_CORINGA';
      const incomingDeclared = 'SMASH';

      // Blue cards must be legal
      expect(isValidResponse(incoming, 'DEF_CURTA', undefined, incomingDeclared)).toBe(true);
      expect(isValidResponse(incoming, 'DEF_NEUTRA', undefined, incomingDeclared)).toBe(true);
      expect(isValidResponse(incoming, 'DEF_LOB', undefined, incomingDeclared)).toBe(true);
      expect(isValidResponse(incoming, 'DEF_UBT_CORINGA', undefined, incomingDeclared)).toBe(true);

      // Green cards (including green wildcard) must be illegal
      for (const green of GREEN_NON_WILDCARDS) {
        expect(isValidResponse(incoming, green, undefined, incomingDeclared)).toBe(false);
      }
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', undefined, incomingDeclared)).toBe(false);
    });

    it('when GOLPE_UBT_CORINGA was declared as BANDEJA_CURTA, opponent MUST respond with Bandejas', () => {
      const incoming = 'GOLPE_UBT_CORINGA';
      const incomingDeclared = 'BANDEJA_CURTA';

      expect(isValidResponse(incoming, 'BANDEJA_CURTA', undefined, incomingDeclared)).toBe(true);
      expect(isValidResponse(incoming, 'BANDEJA_LOB_CHUTADO', undefined, incomingDeclared)).toBe(true);
      expect(isValidResponse(incoming, 'BANDEJA_LOB', undefined, incomingDeclared)).toBe(true);
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', undefined, incomingDeclared)).toBe(true);

      expect(isValidResponse(incoming, 'VOLEIO_PINGADA', undefined, incomingDeclared)).toBe(false);
      expect(isValidResponse(incoming, 'SMASH', undefined, incomingDeclared)).toBe(false);
      expect(isValidResponse(incoming, 'DEF_CURTA', undefined, incomingDeclared)).toBe(false);
    });

    it('when GOLPE_UBT_CORINGA was declared as VOLEIO_PINGADA, opponent MUST respond with Bandejas', () => {
      const incoming = 'GOLPE_UBT_CORINGA';
      const incomingDeclared = 'VOLEIO_PINGADA';

      expect(isValidResponse(incoming, 'BANDEJA_CURTA', undefined, incomingDeclared)).toBe(true);
      expect(isValidResponse(incoming, 'BANDEJA_LOB_CHUTADO', undefined, incomingDeclared)).toBe(true);
      expect(isValidResponse(incoming, 'BANDEJA_LOB', undefined, incomingDeclared)).toBe(true);
      expect(isValidResponse(incoming, 'GOLPE_UBT_CORINGA', undefined, incomingDeclared)).toBe(true);

      expect(isValidResponse(incoming, 'VOLEIO_PINGADA', undefined, incomingDeclared)).toBe(false);
      expect(isValidResponse(incoming, 'SMASH', undefined, incomingDeclared)).toBe(false);
    });
  });

  // ==========================================================================
  // CHALLENGE 6: Matrix of All 11 Green Declarations as Incoming Cards (11 x 19 = 209 transitions)
  // ==========================================================================
  describe('Challenge 6: Exhaustive Matrix of GOLPE_UBT_CORINGA declared as all 11 green shots', () => {
    it('matches the exact response pattern of the underlying declared shot across all 19 cards', () => {
      let declaredPairCount = 0;

      for (const greenShot of GREEN_NON_WILDCARDS) {
        for (const played of ALL_19_CARD_TYPES) {
          declaredPairCount++;
          const directResult = isValidResponse(greenShot, played);
          const wildcardResult = isValidResponse('GOLPE_UBT_CORINGA', played, undefined, greenShot);

          expect(wildcardResult).toBe(directResult);
        }
      }

      expect(declaredPairCount).toBe(11 * 19); // 209 pairs
    });
  });

  // ==========================================================================
  // CHALLENGE 7: Matrix of All 3 Blue Declarations as Incoming Cards (3 x 19 = 57 transitions)
  // ==========================================================================
  describe('Challenge 7: Exhaustive Matrix of DEF_UBT_CORINGA declared as all 3 defense types', () => {
    it('matches the exact response pattern of the underlying declared defense across all 19 cards', () => {
      const blueDefenseTypes: BlueCardType[] = ['DEF_CURTA', 'DEF_NEUTRA', 'DEF_LOB'];
      let declaredPairCount = 0;

      for (const defType of blueDefenseTypes) {
        for (const played of ALL_19_CARD_TYPES) {
          declaredPairCount++;
          const directResult = isValidResponse(defType, played);
          const wildcardResult = isValidResponse('DEF_UBT_CORINGA', played, undefined, defType);

          expect(wildcardResult).toBe(directResult);
        }
      }

      expect(declaredPairCount).toBe(3 * 19); // 57 pairs
    });
  });

  // ==========================================================================
  // CHALLENGE 8: Wildcard-on-Wildcard Legal and Illegal Chains
  // ==========================================================================
  describe('Challenge 8: Wildcard Responding to Wildcard', () => {
    it('GOLPE_UBT_CORINGA responding to DEF_UBT_CORINGA (declared as DEF_CURTA) with legal declaration', () => {
      // DEF_UBT_CORINGA declared as DEF_CURTA requires BANDEJAS
      // GOLPE_UBT_CORINGA played declaring BANDEJA_CURTA
      expect(
        isValidResponse(
          'DEF_UBT_CORINGA',
          'GOLPE_UBT_CORINGA',
          'BANDEJA_CURTA',
          'DEF_CURTA'
        )
      ).toBe(true);

      // GOLPE_UBT_CORINGA played declaring SMASH (illegal for BANDEJAS)
      expect(
        isValidResponse(
          'DEF_UBT_CORINGA',
          'GOLPE_UBT_CORINGA',
          'SMASH',
          'DEF_CURTA'
        )
      ).toBe(false);
    });

    it('DEF_UBT_CORINGA drawn in response to GOLPE_UBT_CORINGA (declared as SMASH)', () => {
      // GOLPE_UBT_CORINGA declared as SMASH requires DEFESAS
      // Drawing DEF_UBT_CORINGA from blue deck is legal
      expect(
        isValidResponse(
          'GOLPE_UBT_CORINGA',
          'DEF_UBT_CORINGA',
          undefined,
          'SMASH'
        )
      ).toBe(true);
    });
  });
});
