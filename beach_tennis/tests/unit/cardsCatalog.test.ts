/**
 * tests/unit/cardsCatalog.test.ts
 * Suíte completa de testes unitários para o catálogo de cartas e matriz da folha rosa.
 * Executada sob Vitest.
 */

import { describe, it, expect } from 'vitest';
import {
  CARDS_CATALOG,
  ALL_CARDS,
  PINK_SHEET_TRANSITIONS,
  RESPONSE_GROUPS,
  DECK_COMPOSITION,
  getCardDefinition,
  getCardRequiredResponse,
  getAllCards,
  getCardsByColor,
  getCardsByRequiredResponse,
  getCardsSatisfyingResponse,
  getLegalResponseTypes,
  isCardLegalForResponse,
  isValidResponse,
  getValidWildcardDeclarations,
  getDeckComposition,
  createInitialDeckList,
} from '../../src/engine/cardsCatalog';
import type { CardType, RequiredResponse } from '../../src/engine/types';

describe('cardsCatalog', () => {
  // ==========================================================================
  // 1. INTEGRIDADE E ESTRUTURA DO CATÁLOGO
  // ==========================================================================
  describe('Integridade Estrutural e Contagens', () => {
    it('deve conter exatamente 19 cartas únicas no catálogo 1v1', () => {
      const keys = Object.keys(CARDS_CATALOG);
      expect(keys).toHaveLength(19);
      expect(ALL_CARDS).toHaveLength(19);
    });

    it('cada entrada do catálogo deve ter seu id correspondente ao tipo em snake_case', () => {
      for (const card of ALL_CARDS) {
        expect(card.id).toBe(card.type.toLowerCase());
        expect(CARDS_CATALOG[card.type]).toBe(card);
      }
    });

    it('deve distribuir as cores corretamente: 3 Laranjas, 4 Azuis e 12 Verdes', () => {
      const orangeCards = getCardsByColor('ORANGE');
      const blueCards = getCardsByColor('BLUE');
      const greenCards = getCardsByColor('GREEN');

      expect(orangeCards).toHaveLength(3);
      expect(blueCards).toHaveLength(4);
      expect(greenCards).toHaveLength(12);
    });

    it('todas as cartas devem conter campos obrigatórios não vazios', () => {
      for (const card of ALL_CARDS) {
        expect(card.name).toBeTruthy();
        expect(card.description).toBeTruthy();
        expect(card.illustrationPath).toMatch(/^\/assets\/cards\/[a-z0-9_]+\.jpg$/);
        expect(Array.isArray(card.belongsToGroups)).toBe(true);
        expect(typeof card.isWildcard).toBe('boolean');
        expect(typeof card.isAttack).toBe('boolean');
      }
    });

    it('deve definir serveNumber (1..3) estritamente para as 3 cartas Laranjas', () => {
      expect(CARDS_CATALOG.SAQUE_1.serveNumber).toBe(1);
      expect(CARDS_CATALOG.SAQUE_2.serveNumber).toBe(2);
      expect(CARDS_CATALOG.SAQUE_3.serveNumber).toBe(3);

      // Nenhuma carta azul ou verde pode ter serveNumber
      for (const card of ALL_CARDS) {
        if (card.color !== 'ORANGE') {
          expect(card.serveNumber).toBeUndefined();
        }
      }
    });

    it('deve definir isWildcard = true estritamente para os 2 coringas', () => {
      const wildcards = ALL_CARDS.filter((c) => c.isWildcard);
      expect(wildcards).toHaveLength(2);
      expect(wildcards.map((c) => c.type).sort()).toEqual(
        ['DEF_UBT_CORINGA', 'GOLPE_UBT_CORINGA'].sort()
      );
    });

    it('deve definir isAttack = true estritamente para os 4 golpes de ataque acelerado', () => {
      const attackCards = ALL_CARDS.filter((c) => c.isAttack);
      expect(attackCards).toHaveLength(4);
      expect(attackCards.map((c) => c.type).sort()).toEqual(
        ['GANCHO_ATA', 'SMASH', 'VERONICA_ATA', 'VOLEIO_ACELERADO'].sort()
      );
    });
  });

  // ==========================================================================
  // 2. COMPOSIÇÃO DOS BARALHOS (1V1)
  // ==========================================================================
  describe('Composição e Geração de Baralhos (1v1)', () => {
    it('deve retornar as contagens oficiais de composição de baralhos', () => {
      const comp = getDeckComposition();
      expect(comp).toEqual(DECK_COMPOSITION);
      expect(comp.greenDeckCount).toBe(24);
      expect(comp.blueDeckCount).toBe(8);
      expect(comp.orangeServeCount).toBe(3);
      expect(comp.totalRallyCards).toBe(32);
      expect(comp.totalPlayerCards).toBe(35);
    });

    it('createInitialDeckList deve gerar exatamente 24 cartas verdes (12 pares)', () => {
      const greenDeck = createInitialDeckList('GREEN');
      expect(greenDeck).toHaveLength(24);

      // Cada um dos 12 tipos verdes deve aparecer exatamente duas vezes
      const counts: Record<string, number> = {};
      for (const type of greenDeck) {
        counts[type] = (counts[type] || 0) + 1;
      }

      const greenTypes = getCardsByColor('GREEN').map((c) => c.type);
      expect(Object.keys(counts)).toHaveLength(12);
      for (const type of greenTypes) {
        expect(counts[type]).toBe(2);
      }
    });

    it('createInitialDeckList deve gerar exatamente 8 cartas azuis (4 pares)', () => {
      const blueDeck = createInitialDeckList('BLUE');
      expect(blueDeck).toHaveLength(8);

      const counts: Record<string, number> = {};
      for (const type of blueDeck) {
        counts[type] = (counts[type] || 0) + 1;
      }

      const blueTypes = getCardsByColor('BLUE').map((c) => c.type);
      expect(Object.keys(counts)).toHaveLength(4);
      for (const type of blueTypes) {
        expect(counts[type]).toBe(2);
      }
    });

    it('createInitialDeckList deve gerar exatamente 3 cartas laranjas (1 de cada)', () => {
      const orangeDeck = createInitialDeckList('ORANGE');
      expect(orangeDeck).toEqual(['SAQUE_1', 'SAQUE_2', 'SAQUE_3']);
    });
  });

  // ==========================================================================
  // 3. MATRIZ DA FOLHA ROSA (14 TRANSIÇÕES)
  // ==========================================================================
  describe('Matriz Oficial da Folha Rosa (14 Transições)', () => {
    it('deve conter exatamente 14 transições de cartas na matriz', () => {
      const entries = Object.entries(PINK_SHEET_TRANSITIONS);
      expect(entries).toHaveLength(14);
    });

    it('Bolas Curtas: DEF_CURTA, VOLEIO_PINGADA e BANDEJA_CURTA exigem BANDEJAS', () => {
      expect(PINK_SHEET_TRANSITIONS.DEF_CURTA).toBe('BANDEJAS');
      expect(PINK_SHEET_TRANSITIONS.VOLEIO_PINGADA).toBe('BANDEJAS');
      expect(PINK_SHEET_TRANSITIONS.BANDEJA_CURTA).toBe('BANDEJAS');

      expect(CARDS_CATALOG.DEF_CURTA.requiredResponse).toBe('BANDEJAS');
      expect(CARDS_CATALOG.VOLEIO_PINGADA.requiredResponse).toBe('BANDEJAS');
      expect(CARDS_CATALOG.BANDEJA_CURTA.requiredResponse).toBe('BANDEJAS');
    });

    it('Bolas Neutras/Médias: DEF_NEUTRA e BANDEJA_LOB_CHUTADO exigem VOLEIOS', () => {
      expect(PINK_SHEET_TRANSITIONS.DEF_NEUTRA).toBe('VOLEIOS');
      expect(PINK_SHEET_TRANSITIONS.BANDEJA_LOB_CHUTADO).toBe('VOLEIOS');

      expect(CARDS_CATALOG.DEF_NEUTRA.requiredResponse).toBe('VOLEIOS');
      expect(CARDS_CATALOG.BANDEJA_LOB_CHUTADO.requiredResponse).toBe('VOLEIOS');
    });

    it('Bolas de Ataque: VOLEIO_ACELERADO, SMASH, GANCHO_ATA e VERONICA_ATA exigem DEFESAS', () => {
      expect(PINK_SHEET_TRANSITIONS.VOLEIO_ACELERADO).toBe('DEFESAS');
      expect(PINK_SHEET_TRANSITIONS.SMASH).toBe('DEFESAS');
      expect(PINK_SHEET_TRANSITIONS.GANCHO_ATA).toBe('DEFESAS');
      expect(PINK_SHEET_TRANSITIONS.VERONICA_ATA).toBe('DEFESAS');

      expect(CARDS_CATALOG.VOLEIO_ACELERADO.requiredResponse).toBe('DEFESAS');
      expect(CARDS_CATALOG.SMASH.requiredResponse).toBe('DEFESAS');
      expect(CARDS_CATALOG.GANCHO_ATA.requiredResponse).toBe('DEFESAS');
      expect(CARDS_CATALOG.VERONICA_ATA.requiredResponse).toBe('DEFESAS');
    });

    it('Lobs e Altas: DEF_LOB, VOLEIO_LOB, BANDEJA_LOB, GANCHO_DEF e VERONICA_DEF exigem FUNDO', () => {
      expect(PINK_SHEET_TRANSITIONS.DEF_LOB).toBe('FUNDO');
      expect(PINK_SHEET_TRANSITIONS.VOLEIO_LOB).toBe('FUNDO');
      expect(PINK_SHEET_TRANSITIONS.BANDEJA_LOB).toBe('FUNDO');
      expect(PINK_SHEET_TRANSITIONS.GANCHO_DEF).toBe('FUNDO');
      expect(PINK_SHEET_TRANSITIONS.VERONICA_DEF).toBe('FUNDO');

      expect(CARDS_CATALOG.DEF_LOB.requiredResponse).toBe('FUNDO');
      expect(CARDS_CATALOG.VOLEIO_LOB.requiredResponse).toBe('FUNDO');
      expect(CARDS_CATALOG.BANDEJA_LOB.requiredResponse).toBe('FUNDO');
      expect(CARDS_CATALOG.GANCHO_DEF.requiredResponse).toBe('FUNDO');
      expect(CARDS_CATALOG.VERONICA_DEF.requiredResponse).toBe('FUNDO');
    });

    it('deve ter a distribuição correta de exigências: 3 Bandejas, 2 Voleios, 4 Defesas e 5 Fundo', () => {
      const counts: Record<RequiredResponse, number> = {
        BANDEJAS: 0,
        VOLEIOS: 0,
        DEFESAS: 0,
        FUNDO: 0,
      };

      for (const req of Object.values(PINK_SHEET_TRANSITIONS)) {
        counts[req]++;
      }

      expect(counts.BANDEJAS).toBe(3);
      expect(counts.VOLEIOS).toBe(2);
      expect(counts.DEFESAS).toBe(4);
      expect(counts.FUNDO).toBe(5);
    });
  });

  // ==========================================================================
  // 4. GRUPOS DE RESPOSTA E CARTAS LEGAIS
  // ==========================================================================
  describe('Grupos de Resposta e Cartas Legais', () => {
    it('grupo BANDEJAS deve permitir apenas Bandejas e Coringa Verde', () => {
      const legalTypes = getLegalResponseTypes('BANDEJAS', true);
      expect(legalTypes.sort()).toEqual(
        ['BANDEJA_CURTA', 'BANDEJA_LOB_CHUTADO', 'BANDEJA_LOB', 'GOLPE_UBT_CORINGA'].sort()
      );
    });

    it('grupo VOLEIOS deve permitir apenas Voleios e Coringa Verde', () => {
      const legalTypes = getLegalResponseTypes('VOLEIOS', true);
      expect(legalTypes.sort()).toEqual(
        ['VOLEIO_PINGADA', 'VOLEIO_ACELERADO', 'VOLEIO_LOB', 'GOLPE_UBT_CORINGA'].sort()
      );
    });

    it('grupo DEFESAS deve permitir estritamente cartas azuis do Monte Azul e PROIBIR Coringa Verde', () => {
      const legalTypes = getLegalResponseTypes('DEFESAS', true);
      expect(legalTypes.sort()).toEqual(
        ['DEF_CURTA', 'DEF_NEUTRA', 'DEF_LOB', 'DEF_UBT_CORINGA'].sort()
      );
      expect(legalTypes).not.toContain('GOLPE_UBT_CORINGA');
    });

    it('grupo FUNDO deve permitir os 5 golpes de fundo e Coringa Verde', () => {
      const legalTypes = getLegalResponseTypes('FUNDO', true);
      expect(legalTypes.sort()).toEqual(
        ['SMASH', 'GANCHO_ATA', 'GANCHO_DEF', 'VERONICA_ATA', 'VERONICA_DEF', 'GOLPE_UBT_CORINGA'].sort()
      );
    });

    it('isCardLegalForResponse deve bloquear Coringa Verde para exigência de DEFESAS', () => {
      expect(isCardLegalForResponse('GOLPE_UBT_CORINGA', 'DEFESAS')).toBe(false);
      expect(isCardLegalForResponse('GOLPE_UBT_CORINGA', 'DEFESAS', 'DEF_CURTA')).toBe(false);
    });

    it('isCardLegalForResponse deve aprovar cartas compatíveis com o grupo exigido', () => {
      expect(isCardLegalForResponse('BANDEJA_CURTA', 'BANDEJAS')).toBe(true);
      expect(isCardLegalForResponse('VOLEIO_PINGADA', 'BANDEJAS')).toBe(false);

      expect(isCardLegalForResponse('VOLEIO_ACELERADO', 'VOLEIOS')).toBe(true);
      expect(isCardLegalForResponse('BANDEJA_CURTA', 'VOLEIOS')).toBe(false);

      expect(isCardLegalForResponse('SMASH', 'FUNDO')).toBe(true);
      expect(isCardLegalForResponse('VOLEIO_LOB', 'FUNDO')).toBe(false);

      expect(isCardLegalForResponse('DEF_CURTA', 'DEFESAS')).toBe(true);
      expect(isCardLegalForResponse('SMASH', 'DEFESAS')).toBe(false);
    });
  });

  // ==========================================================================
  // 5. LOOKUP HELPERS E FILTRAGENS
  // ==========================================================================
  describe('Funções de Consulta (Lookup Helpers)', () => {
    it('getAllCards deve retornar todas as 19 cartas do catálogo', () => {
      const cards = getAllCards();
      expect(cards).toHaveLength(19);
      expect(cards).toBe(ALL_CARDS);
    });

    it('RESPONSE_GROUPS deve ter as 4 categorias de resposta configuradas', () => {
      expect(Object.keys(RESPONSE_GROUPS)).toEqual(['BANDEJAS', 'VOLEIOS', 'DEFESAS', 'FUNDO']);
    });

    it('getCardsSatisfyingResponse deve retornar cartas que pertencem ao grupo', () => {
      const bandejas = getCardsSatisfyingResponse('BANDEJAS', false);
      expect(bandejas.map((c) => c.type).sort()).toEqual(
        ['BANDEJA_CURTA', 'BANDEJA_LOB', 'BANDEJA_LOB_CHUTADO'].sort()
      );
    });

    it('getCardDefinition deve retornar a definição correta para todas as 19 cartas', () => {
      for (const card of ALL_CARDS) {
        expect(getCardDefinition(card.type)).toBe(card);
      }
    });

    it('getCardDefinition deve lançar erro se o tipo for desconhecido', () => {
      expect(() => getCardDefinition('CARTA_INEXISTENTE' as unknown as CardType)).toThrowError(
        /Tipo de carta desconhecido/
      );
    });

    it('getCardRequiredResponse deve retornar o grupo correto para cartas regulares', () => {
      expect(getCardRequiredResponse('SMASH')).toBe('DEFESAS');
      expect(getCardRequiredResponse('DEF_CURTA')).toBe('BANDEJAS');
      expect(getCardRequiredResponse('DEF_LOB')).toBe('FUNDO');
      expect(getCardRequiredResponse('BANDEJA_LOB_CHUTADO')).toBe('VOLEIOS');
      expect(getCardRequiredResponse('SAQUE_1')).toBeUndefined();
    });

    it('getCardRequiredResponse com Coringa declarado deve retornar a exigência da declaração', () => {
      // Coringa Verde declarado como Bandeja Curta -> exige BANDEJAS
      expect(getCardRequiredResponse('GOLPE_UBT_CORINGA', 'BANDEJA_CURTA')).toBe('BANDEJAS');

      // Coringa Verde declarado como Smash -> exige DEFESAS
      expect(getCardRequiredResponse('GOLPE_UBT_CORINGA', 'SMASH')).toBe('DEFESAS');

      // Coringa Azul declarado como Def Lob -> exige FUNDO
      expect(getCardRequiredResponse('DEF_UBT_CORINGA', 'DEF_LOB')).toBe('FUNDO');

      // Coringa não declarado -> undefined
      expect(getCardRequiredResponse('GOLPE_UBT_CORINGA')).toBeUndefined();
      expect(getCardRequiredResponse('DEF_UBT_CORINGA')).toBeUndefined();
    });

    it('getCardsByRequiredResponse deve retornar as cartas correspondentes', () => {
      const defesasRequirers = getCardsByRequiredResponse('DEFESAS');
      expect(defesasRequirers.map((c) => c.type).sort()).toEqual(
        ['GANCHO_ATA', 'SMASH', 'VERONICA_ATA', 'VOLEIO_ACELERADO'].sort()
      );
    });

    it('getValidWildcardDeclarations deve restringir opções de acordo com o contexto', () => {
      // Coringa Azul só pode declarar as 3 defesas azuis
      expect(getValidWildcardDeclarations('DEF_UBT_CORINGA')).toEqual([
        'DEF_CURTA',
        'DEF_NEUTRA',
        'DEF_LOB',
      ]);

      // Coringa Verde sob BANDEJAS
      expect(getValidWildcardDeclarations('GOLPE_UBT_CORINGA', 'BANDEJAS')).toEqual([
        'BANDEJA_CURTA',
        'BANDEJA_LOB_CHUTADO',
        'BANDEJA_LOB',
      ]);

      // Coringa Verde sob DEFESAS deve retornar vazio (proibido)
      expect(getValidWildcardDeclarations('GOLPE_UBT_CORINGA', 'DEFESAS')).toEqual([]);
    });
  });

  // ==========================================================================
  // 6. VALIDAÇÃO DE TRANSIÇÕES (isValidResponse)
  // ==========================================================================
  describe('Validação de Transições de Jogo (isValidResponse)', () => {
    it('deve validar transições diretas padrão entre cartas regulares', () => {
      // DEF CURTA -> exige BANDEJAS
      expect(isValidResponse('DEF_CURTA', 'BANDEJA_CURTA')).toBe(true);
      expect(isValidResponse('DEF_CURTA', 'BANDEJA_LOB_CHUTADO')).toBe(true);
      expect(isValidResponse('DEF_CURTA', 'BANDEJA_LOB')).toBe(true);
      expect(isValidResponse('DEF_CURTA', 'SMASH')).toBe(false);
      expect(isValidResponse('DEF_CURTA', 'VOLEIO_PINGADA')).toBe(false);

      // VOLEIO PINGADA -> exige BANDEJAS
      expect(isValidResponse('VOLEIO_PINGADA', 'BANDEJA_CURTA')).toBe(true);
      expect(isValidResponse('VOLEIO_PINGADA', 'VOLEIO_ACELERADO')).toBe(false);

      // DEF NEUTRA -> exige VOLEIOS
      expect(isValidResponse('DEF_NEUTRA', 'VOLEIO_PINGADA')).toBe(true);
      expect(isValidResponse('DEF_NEUTRA', 'VOLEIO_ACELERADO')).toBe(true);
      expect(isValidResponse('DEF_NEUTRA', 'VOLEIO_LOB')).toBe(true);
      expect(isValidResponse('DEF_NEUTRA', 'BANDEJA_CURTA')).toBe(false);

      // SMASH -> exige DEFESAS (Monte Azul)
      expect(isValidResponse('SMASH', 'DEF_CURTA')).toBe(true);
      expect(isValidResponse('SMASH', 'DEF_NEUTRA')).toBe(true);
      expect(isValidResponse('SMASH', 'DEF_LOB')).toBe(true);
      expect(isValidResponse('SMASH', 'DEF_UBT_CORINGA')).toBe(true);
      expect(isValidResponse('SMASH', 'BANDEJA_CURTA')).toBe(false);
      expect(isValidResponse('SMASH', 'SMASH')).toBe(false);

      // DEF LOB -> exige FUNDO
      expect(isValidResponse('DEF_LOB', 'SMASH')).toBe(true);
      expect(isValidResponse('DEF_LOB', 'GANCHO_ATA')).toBe(true);
      expect(isValidResponse('DEF_LOB', 'VERONICA_ATA')).toBe(true);
      expect(isValidResponse('DEF_LOB', 'GANCHO_DEF')).toBe(true);
      expect(isValidResponse('DEF_LOB', 'VERONICA_DEF')).toBe(true);
      expect(isValidResponse('DEF_LOB', 'VOLEIO_PINGADA')).toBe(false);
    });

    it('deve validar jogadas com Coringa Verde declarado adequadamente', () => {
      // Exigência BANDEJAS respondida com Coringa Verde declarado como Bandeja Curta
      expect(
        isValidResponse('DEF_CURTA', 'GOLPE_UBT_CORINGA', 'BANDEJA_CURTA')
      ).toBe(true);

      // Exigência BANDEJAS respondida com Coringa Verde declarado como Smash (INVÁLIDO)
      expect(
        isValidResponse('DEF_CURTA', 'GOLPE_UBT_CORINGA', 'SMASH')
      ).toBe(false);

      // Exigência VOLEIOS respondida com Coringa Verde declarado como Voleio Acelerado
      expect(
        isValidResponse('DEF_NEUTRA', 'GOLPE_UBT_CORINGA', 'VOLEIO_ACELERADO')
      ).toBe(true);

      // Ataque de SMASH tentando ser respondido com Coringa Verde (SEMPRE INVÁLIDO)
      expect(
        isValidResponse('SMASH', 'GOLPE_UBT_CORINGA', 'DEF_CURTA')
      ).toBe(false);
    });

    it('deve validar respostas quando a carta anterior foi um Coringa Azul declarado', () => {
      // Coringa Azul declarado como DEF_CURTA exige BANDEJAS
      expect(
        isValidResponse('DEF_UBT_CORINGA', 'BANDEJA_CURTA', undefined, 'DEF_CURTA')
      ).toBe(true);
      expect(
        isValidResponse('DEF_UBT_CORINGA', 'SMASH', undefined, 'DEF_CURTA')
      ).toBe(false);

      // Coringa Azul declarado como DEF_LOB exige FUNDO
      expect(
        isValidResponse('DEF_UBT_CORINGA', 'SMASH', undefined, 'DEF_LOB')
      ).toBe(true);
      expect(
        isValidResponse('DEF_UBT_CORINGA', 'BANDEJA_CURTA', undefined, 'DEF_LOB')
      ).toBe(false);

      // Coringa Azul não declarado não permite validação
      expect(isValidResponse('DEF_UBT_CORINGA', 'BANDEJA_CURTA')).toBe(false);
    });
  });
});
