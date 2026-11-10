/**
 * tests/unit/deckManager.test.ts
 * Suíte de testes unitários para o deckManager.ts do Beach Tennis Card Game.
 * Executada sob Vitest.
 */

import { describe, it, expect } from 'vitest';
import {
  createCardInstance,
  shuffleDeck,
  createDecks,
  createOrangeDeck,
  dealInitialHand,
  drawInitialHand,
  hasValidCardInHand,
  getValidCardsInHand,
  digCards,
  digSingleStep,
  drawDefenseCard,
} from '../../src/engine/deckManager';
import { CARDS_CATALOG } from '../../src/engine/cardsCatalog';
import type { CardInstance, RNG } from '../../src/engine/types';

// Helper: PRNG pseudoaleatório Mulberry32 para testes determinísticos
function createMulberry32(seed: number): RNG {
  let s = seed >>> 0;
  return function () {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('deckManager', () => {
  // ==========================================================================
  // 1. CRIAÇÃO DE INSTÂNCIAS E MONTAGEM DE BARALHOS
  // ==========================================================================
  describe('Criação de Instâncias e Montagem de Baralhos', () => {
    it('createCardInstance deve gerar id único com owner, cor e índice', () => {
      const card = createCardInstance('SMASH', 'PLAYER', 1);
      expect(card.instanceId).toBe('player_green_smash_1');
      expect(card.cardId).toBe('smash');
      expect(card.definition).toBe(CARDS_CATALOG.SMASH);
      expect(card.owner).toBe('PLAYER');
      expect(card.declaredAs).toBeUndefined();
    });

    it('createDecks deve retornar 24 cartas verdes e 8 cartas azuis', () => {
      const { greenDeck, blueDeck } = createDecks();
      expect(greenDeck).toHaveLength(24);
      expect(blueDeck).toHaveLength(8);
    });

    it('Monte Verde deve conter exatamente 2 cópias de cada um dos 12 tipos verdes', () => {
      const { greenDeck } = createDecks({ shuffle: false });
      const counts: Record<string, number> = {};
      for (const card of greenDeck) {
        expect(card.definition.color).toBe('GREEN');
        counts[card.definition.type] = (counts[card.definition.type] || 0) + 1;
      }
      expect(Object.keys(counts)).toHaveLength(12);
      for (const type of Object.keys(counts)) {
        expect(counts[type]).toBe(2);
      }
    });

    it('Monte Azul deve conter exatamente 2 cópias de cada um dos 4 tipos azuis', () => {
      const { blueDeck } = createDecks({ shuffle: false });
      const counts: Record<string, number> = {};
      for (const card of blueDeck) {
        expect(card.definition.color).toBe('BLUE');
        counts[card.definition.type] = (counts[card.definition.type] || 0) + 1;
      }
      expect(Object.keys(counts)).toHaveLength(4);
      for (const type of Object.keys(counts)) {
        expect(counts[type]).toBe(2);
      }
    });

    it('todas as cartas criadas devem possuir instanceIds distintos entre si', () => {
      const { greenDeck, blueDeck } = createDecks();
      const allCards = [...greenDeck, ...blueDeck];
      const idSet = new Set(allCards.map((c) => c.instanceId));
      expect(idSet.size).toBe(32);
    });

    it('createDecks aceita atribuir propriedade owner para AI', () => {
      const { greenDeck, blueDeck } = createDecks({ owner: 'AI' });
      for (const card of [...greenDeck, ...blueDeck]) {
        expect(card.owner).toBe('AI');
        expect(card.instanceId.startsWith('ai_')).toBe(true);
      }
    });

    it('createOrangeDeck deve gerar exatamente 3 cartas laranjas (SAQUE 1, 2 e 3)', () => {
      const orangeCards = createOrangeDeck('PLAYER');
      expect(orangeCards).toHaveLength(3);
      expect(orangeCards.map((c) => c.definition.type)).toEqual([
        'SAQUE_1',
        'SAQUE_2',
        'SAQUE_3',
      ]);
      expect(orangeCards.map((c) => c.definition.serveNumber)).toEqual([1, 2, 3]);
    });
  });

  // ==========================================================================
  // 2. EMBARALHAMENTO DETERMINÍSTICO (FISHER-YATES)
  // ==========================================================================
  describe('Embaralhamento Determinístico (Fisher-Yates)', () => {
    it('shuffleDeck com o mesmo RNG semeado deve produzir permutações idênticas', () => {
      const { greenDeck } = createDecks({ shuffle: false });
      const rng1 = createMulberry32(12345);
      const rng2 = createMulberry32(12345);

      const shuffled1 = shuffleDeck(greenDeck, rng1);
      const shuffled2 = shuffleDeck(greenDeck, rng2);

      expect(shuffled1.map((c) => c.instanceId)).toEqual(
        shuffled2.map((c) => c.instanceId)
      );
    });

    it('shuffleDeck com sementes diferentes deve produzir ordens distintas', () => {
      const { greenDeck } = createDecks({ shuffle: false });
      const rng1 = createMulberry32(1111);
      const rng2 = createMulberry32(9999);

      const s1 = shuffleDeck(greenDeck, rng1);
      const s2 = shuffleDeck(greenDeck, rng2);

      expect(s1.map((c) => c.instanceId)).not.toEqual(s2.map((c) => c.instanceId));
    });

    it('shuffleDeck não deve mutar o array original nem perder nenhum elemento', () => {
      const { greenDeck } = createDecks({ shuffle: false });
      const originalIds = greenDeck.map((c) => c.instanceId);
      const shuffled = shuffleDeck(greenDeck);

      expect(greenDeck.map((c) => c.instanceId)).toEqual(originalIds);
      expect(shuffled).toHaveLength(24);
      expect(new Set(shuffled.map((c) => c.instanceId)).size).toBe(24);
    });
  });

  // ==========================================================================
  // 3. DISTRIBUIÇÃO DA MÃO INICIAL
  // ==========================================================================
  describe('Distribuição da Mão Inicial', () => {
    it('dealInitialHand deve distribuir 6 cartas para a mão e deixar 18 no monte verde', () => {
      const { greenDeck } = createDecks();
      const { hand, remainingDeck } = dealInitialHand(greenDeck);

      expect(hand).toHaveLength(6);
      expect(remainingDeck).toHaveLength(18);
      expect([...hand, ...remainingDeck].map((c) => c.instanceId)).toEqual(
        greenDeck.map((c) => c.instanceId)
      );
    });

    it('dealInitialHand deve ser imutável e preservar o baralho de entrada', () => {
      const { greenDeck } = createDecks();
      const originalLength = greenDeck.length;
      dealInitialHand(greenDeck);
      expect(greenDeck).toHaveLength(originalLength);
    });

    it('drawInitialHand deve ser um alias idêntico para dealInitialHand', () => {
      expect(drawInitialHand).toBe(dealInitialHand);
    });

    it('deve lançar erro descritivo caso o baralho possua menos de 6 cartas', () => {
      const shortDeck = [createCardInstance('SMASH', 'PLAYER', 0)];
      expect(() => dealInitialHand(shortDeck)).toThrow(
        /Não é possível distribuir a mão de 6 cartas/
      );
    });
  });

  // ==========================================================================
  // 4. INSPEÇÃO DE MÃO (hasValidCardInHand e getValidCardsInHand)
  // ==========================================================================
  describe('Inspeção de Mão', () => {
    it('hasValidCardInHand deve identificar cartas válidas para BANDEJAS', () => {
      const hand = [
        createCardInstance('SMASH'),
        createCardInstance('BANDEJA_CURTA'),
        createCardInstance('DEF_NEUTRA'),
      ];
      expect(hasValidCardInHand(hand, 'BANDEJAS')).toBe(true);
      expect(getValidCardsInHand(hand, 'BANDEJAS')).toHaveLength(1);
      expect(getValidCardsInHand(hand, 'BANDEJAS')[0]?.definition.type).toBe('BANDEJA_CURTA');
    });

    it('GOLPE_UBT_CORINGA deve ser reconhecido como válido para BANDEJAS, VOLEIOS e FUNDO', () => {
      const hand = [createCardInstance('GOLPE_UBT_CORINGA')];
      expect(hasValidCardInHand(hand, 'BANDEJAS')).toBe(true);
      expect(hasValidCardInHand(hand, 'VOLEIOS')).toBe(true);
      expect(hasValidCardInHand(hand, 'FUNDO')).toBe(true);
    });

    it('hasValidCardInHand deve retornar false para DEFESAS mesmo com Coringa Verde na mão', () => {
      const hand = [
        createCardInstance('GOLPE_UBT_CORINGA'),
        createCardInstance('SMASH'),
        createCardInstance('BANDEJA_CURTA'),
      ];
      expect(hasValidCardInHand(hand, 'DEFESAS')).toBe(false);
      expect(getValidCardsInHand(hand, 'DEFESAS')).toHaveLength(0);
    });
  });

  // ==========================================================================
  // 5. REGRA OFICIAL DE CAVAÇÃO (digCards)
  // ==========================================================================
  describe('Regra Oficial de Cavação (digCards)', () => {
    it('deve PROIBIR cavação se o jogador já possuir carta válida na mão', () => {
      const hand = [createCardInstance('BANDEJA_CURTA')];
      const greenDeck = [createCardInstance('SMASH')];

      expect(() => digCards(hand, greenDeck, 'BANDEJAS')).toThrow(
        /Jogador não pode cavar: a mão já possui carta\(s\) válida\(s\)/
      );
    });

    it('deve PROIBIR cavação para a exigência DEFESAS', () => {
      const hand = [createCardInstance('BANDEJA_CURTA')];
      const greenDeck = [createCardInstance('SMASH')];

      expect(() => digCards(hand, greenDeck, 'DEFESAS')).toThrow(
        /Cavação proibida para DEFESAS/
      );
    });

    it('Cenário 1: 1ª carta comprada é válida -> Joga imediatamente, NÃO compra a 2ª carta', () => {
      const hand = [createCardInstance('SMASH')]; // Mão sem Bandejas
      const validCard = createCardInstance('BANDEJA_CURTA');
      const secondCard = createCardInstance('BANDEJA_LOB');
      const greenDeck = [validCard, secondCard];

      const result = digCards(hand, greenDeck, 'BANDEJAS');

      expect(result.isValid).toBe(true);
      expect(result.mustPlayImmediately).toBe(true);
      expect(result.attemptNumber).toBe(1);
      expect(result.canDigAgain).toBe(false);
      expect(result.pointLost).toBe(false);
      expect(result.reason).toBe('LEGAL_CARD_DRAWN');
      expect(result.drawnCard?.instanceId).toBe(validCard.instanceId);

      // Baralho deve ter consumido apenas 1 carta
      expect(result.updatedGreenDeck).toHaveLength(1);
      expect(result.updatedGreenDeck[0]?.instanceId).toBe(secondCard.instanceId);

      // Mão não é poluída com a carta válida jogada
      expect(result.updatedHand).toHaveLength(1);
    });

    it('Cenário 2: 1ª carta é GOLPE_UBT_CORINGA -> Válida e jogada imediatamente', () => {
      const hand = [createCardInstance('BANDEJA_CURTA')];
      const wildcard = createCardInstance('GOLPE_UBT_CORINGA');
      const greenDeck = [wildcard, createCardInstance('SMASH')];

      const result = digCards(hand, greenDeck, 'VOLEIOS');

      expect(result.isValid).toBe(true);
      expect(result.mustPlayImmediately).toBe(true);
      expect(result.attemptNumber).toBe(1);
      expect(result.pointLost).toBe(false);
      expect(result.reason).toBe('LEGAL_CARD_DRAWN');
    });

    it('Cenário 3: 1ª carta inválida, 2ª carta válida -> 1ª entra na mão, 2ª é jogada imediatamente', () => {
      const hand = [createCardInstance('SMASH')]; // Exige Bandejas
      const invalidCard = createCardInstance('VOLEIO_ACELERADO');
      const validCard = createCardInstance('BANDEJA_LOB');
      const greenDeck = [invalidCard, validCard, createCardInstance('GANCHO_ATA')];

      const result = digCards(hand, greenDeck, 'BANDEJAS');

      expect(result.isValid).toBe(true);
      expect(result.mustPlayImmediately).toBe(true);
      expect(result.attemptNumber).toBe(2);
      expect(result.pointLost).toBe(false);
      expect(result.reason).toBe('LEGAL_CARD_DRAWN');
      expect(result.drawnCard?.instanceId).toBe(validCard.instanceId);

      // A 1ª carta inválida foi incorporada à mão
      expect(result.updatedHand).toHaveLength(2);
      expect(result.updatedHand.map((c) => c.instanceId)).toContain(invalidCard.instanceId);

      // O baralho consumiu exatamente 2 cartas
      expect(result.updatedGreenDeck).toHaveLength(1);
    });

    it('Cenário 4: 1ª carta inválida E 2ª carta inválida -> Perde o ponto imediatamente', () => {
      const hand = [createCardInstance('SMASH')]; // Exige Bandejas
      const invalidCard1 = createCardInstance('VOLEIO_ACELERADO');
      const invalidCard2 = createCardInstance('GANCHO_ATA');
      const greenDeck = [invalidCard1, invalidCard2];

      const result = digCards(hand, greenDeck, 'BANDEJAS');

      expect(result.isValid).toBe(false);
      expect(result.mustPlayImmediately).toBe(false);
      expect(result.attemptNumber).toBe(2);
      expect(result.pointLost).toBe(true);
      expect(result.reason).toBe('SECOND_ATTEMPT_INVALID');

      // Ambas as cartas inválidas foram incorporadas à mão
      expect(result.updatedHand).toHaveLength(3);
      expect(result.updatedGreenDeck).toHaveLength(0);
    });

    it('Cenário 5: Monte Verde com 0 cartas no início da cavação -> Perde o ponto imediatamente', () => {
      const hand = [createCardInstance('SMASH')];
      const emptyDeck: CardInstance[] = [];

      const result = digCards(hand, emptyDeck, 'BANDEJAS');

      expect(result.isValid).toBe(false);
      expect(result.pointLost).toBe(true);
      expect(result.reason).toBe('GREEN_DECK_EMPTY');
      expect(result.drawnCard).toBeNull();
    });

    it('Cenário 6: Monte Verde com apenas 1 carta e ela é inválida -> Perde o ponto por falta de baralho', () => {
      const hand = [createCardInstance('SMASH')];
      const oneCardDeck = [createCardInstance('VOLEIO_ACELERADO')];

      const result = digCards(hand, oneCardDeck, 'BANDEJAS');

      expect(result.isValid).toBe(false);
      expect(result.pointLost).toBe(true);
      expect(result.reason).toBe('GREEN_DECK_EMPTY');
      expect(result.attemptNumber).toBe(2);
    });
  });

  // ==========================================================================
  // 6. CAVAÇÃO PASSO A PASSO (digSingleStep)
  // ==========================================================================
  describe('Cavação Passo a Passo (digSingleStep)', () => {
    it('tentativa 1 com carta inválida deve retornar canDigAgain = true e FIRST_ATTEMPT_INVALID', () => {
      const hand = [createCardInstance('SMASH')];
      const greenDeck = [
        createCardInstance('VOLEIO_ACELERADO'),
        createCardInstance('BANDEJA_CURTA'),
      ];

      const step1 = digSingleStep(hand, greenDeck, 'BANDEJAS', 1);

      expect(step1.isValid).toBe(false);
      expect(step1.canDigAgain).toBe(true);
      expect(step1.pointLost).toBe(false);
      expect(step1.reason).toBe('FIRST_ATTEMPT_INVALID');
      expect(step1.updatedHand).toHaveLength(2);
      expect(step1.updatedGreenDeck).toHaveLength(1);
    });
  });

  // ==========================================================================
  // 7. COMPRA DE DEFESA NO MONTE AZUL (drawDefenseCard)
  // ==========================================================================
  describe('Compra de Defesa no Monte Azul (drawDefenseCard)', () => {
    it('deve retirar a carta do topo do Monte Azul e reduzir o baralho em 1', () => {
      const { blueDeck } = createDecks();
      const topCardId = blueDeck[0]?.instanceId;

      const result = drawDefenseCard(blueDeck, 'PLAYER', 'AI');

      expect(result.isExhausted).toBe(false);
      expect(result.winner).toBeUndefined();
      expect(result.drawnCard?.instanceId).toBe(topCardId);
      expect(result.updatedBlueDeck).toHaveLength(7);
      expect(blueDeck).toHaveLength(8); // Imutabilidade preservada
    });

    it('quando o Monte Azul esgota (0 cartas), defensor perde o ponto imediatamente', () => {
      const emptyBlueDeck: CardInstance[] = [];

      const result = drawDefenseCard(emptyBlueDeck, 'PLAYER', 'AI');

      expect(result.isExhausted).toBe(true);
      expect(result.drawnCard).toBeNull();
      expect(result.winner).toBe('AI');
      expect(result.updatedBlueDeck).toHaveLength(0);
    });

    it('drenagem sequencial de 8 cartas de defesa até o winner do atacante', () => {
      let { blueDeck } = createDecks();
      expect(blueDeck).toHaveLength(8);

      // Puxa as 8 defesas
      for (let i = 0; i < 8; i++) {
        const res = drawDefenseCard(blueDeck, 'PLAYER', 'AI');
        expect(res.isExhausted).toBe(false);
        expect(res.drawnCard).not.toBeNull();
        blueDeck = res.updatedBlueDeck;
      }

      expect(blueDeck).toHaveLength(0);

      // O 9º ataque esgota o Monte Azul -> Ponto do atacante!
      const exhaustionResult = drawDefenseCard(blueDeck, 'PLAYER', 'AI');
      expect(exhaustionResult.isExhausted).toBe(true);
      expect(exhaustionResult.drawnCard).toBeNull();
      expect(exhaustionResult.winner).toBe('AI');
    });
  });
});
