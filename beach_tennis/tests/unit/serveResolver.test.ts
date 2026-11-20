/**
 * tests/unit/serveResolver.test.ts
 * Suíte de testes unitários para o serveResolver.ts do Beach Tennis Card Game.
 * Executada sob Vitest.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveServe,
  resolveServeExtended,
  resolveServeAndDrawDefense,
  isValidDefenseDeclaration,
  getAllPossibleServeZones,
  getAllPossibleReceiverPairs,
  calculateAceProbability,
} from '../../src/engine/serveResolver';
import { createDecks } from '../../src/engine/deckManager';

describe('serveResolver', () => {
  // ==========================================================================
  // 1. RESOLUÇÃO DE SAQUE 1V1 (ZONAS 1..3)
  // ==========================================================================
  describe('Resolução de Saque 1v1 (Ace vs Defesa Coberta)', () => {
    it('deve resolver ACE quando a zona do sacador NÃO está entre as opções do recebedor', () => {
      // Zona 1 vs [2, 3] -> Ace!
      const res1 = resolveServe(1, [2, 3], 'PLAYER', 'AI');
      expect(res1.isAce).toBe(true);
      expect(res1.defenseSuccess).toBe(false);
      expect(res1.winningPlayer).toBe('PLAYER');
      expect(res1.serverPick).toBe(1);
      expect(res1.receiverPicks).toEqual([2, 3]);

      // Zona 2 vs [1, 3] -> Ace!
      const res2 = resolveServe(2, [1, 3], 'PLAYER', 'AI');
      expect(res2.isAce).toBe(true);
      expect(res2.defenseSuccess).toBe(false);
      expect(res2.winningPlayer).toBe('PLAYER');

      // Zona 3 vs [1, 2] -> Ace!
      const res3 = resolveServe(3, [1, 2], 'AI', 'PLAYER');
      expect(res3.isAce).toBe(true);
      expect(res3.defenseSuccess).toBe(false);
      expect(res3.winningPlayer).toBe('AI');
    });

    it('deve resolver DEFESA EFETUADA quando a zona do sacador ESTÁ entre as opções do recebedor', () => {
      // Zona 1 vs [1, 2] -> Coberto!
      const res1 = resolveServe(1, [1, 2], 'PLAYER', 'AI');
      expect(res1.isAce).toBe(false);
      expect(res1.defenseSuccess).toBe(true);
      expect(res1.winningPlayer).toBeUndefined();

      // Zona 1 vs [1, 3] -> Coberto!
      const res2 = resolveServe(1, [1, 3], 'PLAYER', 'AI');
      expect(res2.isAce).toBe(false);
      expect(res2.defenseSuccess).toBe(true);

      // Zona 2 vs [1, 2] -> Coberto!
      const res3 = resolveServe(2, [1, 2], 'PLAYER', 'AI');
      expect(res3.isAce).toBe(false);
      expect(res3.defenseSuccess).toBe(true);

      // Zona 2 vs [2, 3] -> Coberto!
      const res4 = resolveServe(2, [2, 3], 'PLAYER', 'AI');
      expect(res4.isAce).toBe(false);
      expect(res4.defenseSuccess).toBe(true);

      // Zona 3 vs [1, 3] -> Coberto!
      const res5 = resolveServe(3, [1, 3], 'PLAYER', 'AI');
      expect(res5.isAce).toBe(false);
      expect(res5.defenseSuccess).toBe(true);

      // Zona 3 vs [2, 3] -> Coberto!
      const res6 = resolveServe(3, [2, 3], 'PLAYER', 'AI');
      expect(res6.isAce).toBe(false);
      expect(res6.defenseSuccess).toBe(true);
    });

    it('matriz de todas as 9 combinações possíveis deve resultar em exatamente 3 Aces (33.3%) e 6 Defesas (66.7%)', () => {
      const serverZones = getAllPossibleServeZones('1v1');
      const receiverPairs = getAllPossibleReceiverPairs();

      let aceCount = 0;
      let defenseCount = 0;

      for (const s of serverZones) {
        for (const r of receiverPairs) {
          const outcome = resolveServe(s, r);
          if (outcome.isAce) aceCount++;
          if (outcome.defenseSuccess) defenseCount++;
        }
      }

      expect(aceCount + defenseCount).toBe(9);
      expect(aceCount).toBe(3);
      expect(defenseCount).toBe(6);
      expect(aceCount / 9).toBeCloseTo(1 / 3, 4);
      expect(defenseCount / 9).toBeCloseTo(2 / 3, 4);
    });
  });

  // ==========================================================================
  // 2. VALIDAÇÃO DE LIMITES E TRATAMENTO DE ERROS
  // ==========================================================================
  describe('Validação de Limites e Erros de Entrada', () => {
    it('deve lançar erro se serverZone não estiver no intervalo 1..3', () => {
      expect(() => resolveServe(0, [1, 2])).toThrow(/Zona de saque inválida/);
      expect(() => resolveServe(4, [1, 2])).toThrow(/Zona de saque inválida/);
      expect(() => resolveServe(-1, [1, 2])).toThrow(/Zona de saque inválida/);
      expect(() => resolveServe(1.5, [1, 2])).toThrow(/Zona de saque inválida/);
      expect(() => resolveServe(NaN, [1, 2])).toThrow(/Zona de saque inválida/);
    });

    it('deve lançar erro se receiverZones não for um array com exatamente 2 elementos distintos', () => {
      // Array com 1 elemento
      expect(() => resolveServe(1, [1])).toThrow(/Quantidade de zonas de recepção inválida/);

      // Array com 3 elementos
      expect(() => resolveServe(1, [1, 2, 3])).toThrow(/Quantidade de zonas de recepção inválida/);

      // Elementos duplicados
      expect(() => resolveServe(1, [2, 2])).toThrow(/Zonas de recepção duplicadas/);

      // Zonas fora do intervalo 1..3
      expect(() => resolveServe(1, [1, 4])).toThrow(/Zonas de recepção fora dos limites/);
      expect(() => resolveServe(1, [0, 2])).toThrow(/Zonas de recepção fora dos limites/);
    });
  });

  // ==========================================================================
  // 3. FLUXO INTEGRADO: SAQUE -> DEFESA DO MONTE AZUL
  // ==========================================================================
  describe('Fluxo Integrado: Saque -> Defesa do Monte Azul', () => {
    it('quando o saque é ACE, defenseResult deve ser null', () => {
      const { blueDeck } = createDecks();
      const outcome = resolveServeAndDrawDefense(1, [2, 3], blueDeck, 'PLAYER', 'AI');

      expect(outcome.serveResult.isAce).toBe(true);
      expect(outcome.defenseResult).toBeNull();
      expect(blueDeck).toHaveLength(8); // Nenhuma carta puxada
    });

    it('quando o saque é coberto, puxa 1 carta de defesa do Monte Azul do recebedor', () => {
      const { blueDeck } = createDecks();
      const outcome = resolveServeAndDrawDefense(1, [1, 2], blueDeck, 'PLAYER', 'AI');

      expect(outcome.serveResult.isAce).toBe(false);
      expect(outcome.serveResult.defenseSuccess).toBe(true);
      expect(outcome.defenseResult).not.toBeNull();
      expect(outcome.defenseResult?.drawnCard).toBeDefined();
      expect(outcome.defenseResult?.updatedBlueDeck).toHaveLength(7);
    });
  });

  // ==========================================================================
  // 4. VALIDAÇÃO DE DECLARAÇÃO DO CORINGA AZUL
  // ==========================================================================
  describe('Validação de Declaração do Coringa Azul', () => {
    it('deve aceitar estritamente DEF_CURTA, DEF_NEUTRA e DEF_LOB', () => {
      expect(isValidDefenseDeclaration('DEF_CURTA')).toBe(true);
      expect(isValidDefenseDeclaration('DEF_NEUTRA')).toBe(true);
      expect(isValidDefenseDeclaration('DEF_LOB')).toBe(true);
    });

    it('deve rejeitar Coringa Azul sem declaração ou cartas verdes/laranjas', () => {
      expect(isValidDefenseDeclaration('DEF_UBT_CORINGA')).toBe(false);
      expect(isValidDefenseDeclaration('SMASH')).toBe(false);
      expect(isValidDefenseDeclaration('BANDEJA_CURTA')).toBe(false);
      expect(isValidDefenseDeclaration('SAQUE_1')).toBe(false);
    });
  });

  // ==========================================================================
  // 5. SUPORTE A DUPLAS (2V2 - ZONAS 1 A 5) E HELPERS
  // ==========================================================================
  describe('Suporte a Duplas (2v2) e Funções Auxiliares', () => {
    it('resolveServeExtended no modo 2v2 deve resolver Ace em 1..5 com 4 zonas de cobertura', () => {
      // Sacador na zona 5, recebedores cobrem [1, 2, 3, 4] -> Ace!
      const aceRes = resolveServeExtended(5, [1, 2, 3, 4], 'PLAYER', 'AI', '2v2');
      expect(aceRes.isAce).toBe(true);
      expect(aceRes.winningPlayer).toBe('PLAYER');

      // Sacador na zona 3, recebedores cobrem [1, 2, 3, 4] -> Coberto!
      const defRes = resolveServeExtended(3, [1, 2, 3, 4], 'PLAYER', 'AI', '2v2');
      expect(defRes.isAce).toBe(false);
      expect(defRes.defenseSuccess).toBe(true);
    });

    it('calculateAceProbability deve retornar 1/3 para 1v1 e 1/5 para 2v2', () => {
      expect(calculateAceProbability('1v1')).toBeCloseTo(1 / 3, 4);
      expect(calculateAceProbability('2v2')).toBeCloseTo(0.2, 4);
    });
  });
});
