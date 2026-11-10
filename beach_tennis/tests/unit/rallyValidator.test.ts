/**
 * tests/unit/rallyValidator.test.ts
 * Suíte completa de testes unitários para o validador de rali, travas de ataque e coringas.
 * Executada sob Vitest.
 */

import { describe, it, expect } from 'vitest';
import {
  getRequiredResponse,
  isAttackShot,
  getLegalMoves,
  validateTurnPlay,
  isValidResponse,
  getValidDeclarationsForResponse,
  getValidBlueWildcardDeclarations,
} from '../../src/engine/rallyValidator';
import { CARDS_CATALOG } from '../../src/engine/cardsCatalog';
import type {
  CardInstance,
  CardType,
  PlayerId,
} from '../../src/engine/types';

// Helper para instanciar cartas nos testes
function createCardInstance(
  type: CardType,
  owner: PlayerId = 'PLAYER',
  declaredAs?: CardType,
  instanceId?: string
): CardInstance {
  const definition = CARDS_CATALOG[type];
  if (!definition) {
    throw new Error(`Tipo de carta desconhecido para o teste: ${type}`);
  }
  return {
    instanceId: instanceId ?? `${owner.toLowerCase()}_${type.toLowerCase()}_${Math.random()}`,
    cardId: definition.id,
    definition,
    owner,
    declaredAs,
  };
}

describe('rallyValidator', () => {
  // ==========================================================================
  // 1. DETERMINAÇÃO DA RESPOSTA EXIGIDA (getRequiredResponse)
  // ==========================================================================
  describe('getRequiredResponse', () => {
    it('deve mapear corretamente as 14 transições regulares da Folha Rosa para CardDefinition', () => {
      // BANDEJAS
      expect(getRequiredResponse(CARDS_CATALOG.DEF_CURTA)).toBe('BANDEJAS');
      expect(getRequiredResponse(CARDS_CATALOG.VOLEIO_PINGADA)).toBe('BANDEJAS');
      expect(getRequiredResponse(CARDS_CATALOG.BANDEJA_CURTA)).toBe('BANDEJAS');

      // VOLEIOS
      expect(getRequiredResponse(CARDS_CATALOG.DEF_NEUTRA)).toBe('VOLEIOS');
      expect(getRequiredResponse(CARDS_CATALOG.BANDEJA_LOB_CHUTADO)).toBe('VOLEIOS');

      // DEFESAS (Ataques)
      expect(getRequiredResponse(CARDS_CATALOG.VOLEIO_ACELERADO)).toBe('DEFESAS');
      expect(getRequiredResponse(CARDS_CATALOG.SMASH)).toBe('DEFESAS');
      expect(getRequiredResponse(CARDS_CATALOG.GANCHO_ATA)).toBe('DEFESAS');
      expect(getRequiredResponse(CARDS_CATALOG.VERONICA_ATA)).toBe('DEFESAS');

      // FUNDO
      expect(getRequiredResponse(CARDS_CATALOG.DEF_LOB)).toBe('FUNDO');
      expect(getRequiredResponse(CARDS_CATALOG.VOLEIO_LOB)).toBe('FUNDO');
      expect(getRequiredResponse(CARDS_CATALOG.BANDEJA_LOB)).toBe('FUNDO');
      expect(getRequiredResponse(CARDS_CATALOG.GANCHO_DEF)).toBe('FUNDO');
      expect(getRequiredResponse(CARDS_CATALOG.VERONICA_DEF)).toBe('FUNDO');
    });

    it('deve suportar CardInstance com e sem encapsulamento', () => {
      const smashInstance = createCardInstance('SMASH');
      expect(getRequiredResponse(smashInstance)).toBe('DEFESAS');

      const defCurtaInstance = createCardInstance('DEF_CURTA');
      expect(getRequiredResponse(defCurtaInstance)).toBe('BANDEJAS');
    });

    describe('DEF_UBT_CORINGA', () => {
      it('deve retornar BANDEJAS quando declarada como DEF_CURTA', () => {
        expect(getRequiredResponse(CARDS_CATALOG.DEF_UBT_CORINGA, 'DEF_CURTA')).toBe('BANDEJAS');
        const instance = createCardInstance('DEF_UBT_CORINGA', 'PLAYER', 'DEF_CURTA');
        expect(getRequiredResponse(instance)).toBe('BANDEJAS');
      });

      it('deve retornar VOLEIOS quando declarada como DEF_NEUTRA', () => {
        expect(getRequiredResponse(CARDS_CATALOG.DEF_UBT_CORINGA, 'DEF_NEUTRA')).toBe('VOLEIOS');
        const instance = createCardInstance('DEF_UBT_CORINGA', 'PLAYER', 'DEF_NEUTRA');
        expect(getRequiredResponse(instance)).toBe('VOLEIOS');
      });

      it('deve retornar FUNDO quando declarada como DEF_LOB', () => {
        expect(getRequiredResponse(CARDS_CATALOG.DEF_UBT_CORINGA, 'DEF_LOB')).toBe('FUNDO');
        const instance = createCardInstance('DEF_UBT_CORINGA', 'PLAYER', 'DEF_LOB');
        expect(getRequiredResponse(instance)).toBe('FUNDO');
      });

      it('deve lançar erro se não for fornecida declaração', () => {
        expect(() => getRequiredResponse(CARDS_CATALOG.DEF_UBT_CORINGA)).toThrowError(
          /DEF_UBT_CORINGA exige declaração/
        );
        const undeclaredInstance = createCardInstance('DEF_UBT_CORINGA');
        expect(() => getRequiredResponse(undeclaredInstance)).toThrowError(
          /DEF_UBT_CORINGA exige declaração/
        );
      });

      it('deve lançar erro se a declaração for inválida', () => {
        expect(() =>
          getRequiredResponse(CARDS_CATALOG.DEF_UBT_CORINGA, 'SMASH' as CardType)
        ).toThrowError(/Declaração "SMASH" é inválida para DEF_UBT_CORINGA/);
      });
    });

    describe('GOLPE_UBT_CORINGA', () => {
      it('deve retornar a exigência correspondente ao golpe verde declarado', () => {
        expect(getRequiredResponse(CARDS_CATALOG.GOLPE_UBT_CORINGA, 'BANDEJA_CURTA')).toBe('BANDEJAS');
        expect(getRequiredResponse(CARDS_CATALOG.GOLPE_UBT_CORINGA, 'BANDEJA_LOB_CHUTADO')).toBe('VOLEIOS');
        expect(getRequiredResponse(CARDS_CATALOG.GOLPE_UBT_CORINGA, 'SMASH')).toBe('DEFESAS');
        expect(getRequiredResponse(CARDS_CATALOG.GOLPE_UBT_CORINGA, 'VOLEIO_ACELERADO')).toBe('DEFESAS');
        expect(getRequiredResponse(CARDS_CATALOG.GOLPE_UBT_CORINGA, 'BANDEJA_LOB')).toBe('FUNDO');
        expect(getRequiredResponse(CARDS_CATALOG.GOLPE_UBT_CORINGA, 'GANCHO_DEF')).toBe('FUNDO');
      });

      it('deve lançar erro se não houver declaração', () => {
        expect(() => getRequiredResponse(CARDS_CATALOG.GOLPE_UBT_CORINGA)).toThrowError(
          /GOLPE_UBT_CORINGA exige declaração/
        );
      });

      it('deve lançar erro se a declaração não for um golpe verde regular', () => {
        expect(() =>
          getRequiredResponse(CARDS_CATALOG.GOLPE_UBT_CORINGA, 'DEF_CURTA' as CardType)
        ).toThrowError(/Declaração "DEF_CURTA" é inválida para GOLPE_UBT_CORINGA/);

        expect(() =>
          getRequiredResponse(CARDS_CATALOG.GOLPE_UBT_CORINGA, 'GOLPE_UBT_CORINGA' as CardType)
        ).toThrowError(/Declaração "GOLPE_UBT_CORINGA" é inválida para GOLPE_UBT_CORINGA/);
      });
    });

    it('deve lançar erro para cartas sem resposta de rali (ex: SAQUE_1)', () => {
      expect(() => getRequiredResponse(CARDS_CATALOG.SAQUE_1)).toThrowError(
        /não impõe resposta de rali válida/
      );
    });
  });

  // ==========================================================================
  // 2. IDENTIFICADOR DE ATAQUES (isAttackShot)
  // ==========================================================================
  describe('isAttackShot', () => {
    it('deve retornar true estritamente para os 4 ataques regulares', () => {
      expect(isAttackShot(CARDS_CATALOG.SMASH)).toBe(true);
      expect(isAttackShot(CARDS_CATALOG.VOLEIO_ACELERADO)).toBe(true);
      expect(isAttackShot(CARDS_CATALOG.GANCHO_ATA)).toBe(true);
      expect(isAttackShot(CARDS_CATALOG.VERONICA_ATA)).toBe(true);

      // Não-ataques devem retornar false
      expect(isAttackShot(CARDS_CATALOG.DEF_CURTA)).toBe(false);
      expect(isAttackShot(CARDS_CATALOG.BANDEJA_CURTA)).toBe(false);
      expect(isAttackShot(CARDS_CATALOG.VOLEIO_PINGADA)).toBe(false);
      expect(isAttackShot(CARDS_CATALOG.GANCHO_DEF)).toBe(false);
      expect(isAttackShot(CARDS_CATALOG.VERONICA_DEF)).toBe(false);
    });

    it('deve retornar true para Coringa Verde declarado como ataque', () => {
      expect(isAttackShot(CARDS_CATALOG.GOLPE_UBT_CORINGA, 'SMASH')).toBe(true);
      expect(isAttackShot(CARDS_CATALOG.GOLPE_UBT_CORINGA, 'VOLEIO_ACELERADO')).toBe(true);
      expect(isAttackShot(CARDS_CATALOG.GOLPE_UBT_CORINGA, 'GANCHO_ATA')).toBe(true);
      expect(isAttackShot(CARDS_CATALOG.GOLPE_UBT_CORINGA, 'VERONICA_ATA')).toBe(true);

      expect(isAttackShot(CARDS_CATALOG.GOLPE_UBT_CORINGA, 'BANDEJA_CURTA')).toBe(false);
      expect(isAttackShot(CARDS_CATALOG.GOLPE_UBT_CORINGA)).toBe(false);
    });
  });

  // ==========================================================================
  // 3. CÁLCULO DE MOVIMENTOS LEGAIS (getLegalMoves)
  // ==========================================================================
  describe('getLegalMoves', () => {
    describe('Trava de Ataque (requiresBlueDefense === true)', () => {
      it('sob ataque de SMASH, deve bloquear a mão verde, travar cavação e exigir defesa azul', () => {
        const hand = [
          createCardInstance('BANDEJA_CURTA'),
          createCardInstance('VOLEIO_PINGADA'),
          createCardInstance('SMASH'),
          createCardInstance('GOLPE_UBT_CORINGA'),
        ];
        const incoming = createCardInstance('SMASH', 'AI');

        const moves = getLegalMoves(hand, incoming);
        expect(moves.requiresBlueDefense).toBe(true);
        expect(moves.playableCards).toEqual([]);
        expect(moves.canDig).toBe(false);
      });

      it('sob ataque de VOLEIO_ACELERADO, deve travar a mão mesmo que contenha Coringa Verde', () => {
        const hand = [createCardInstance('GOLPE_UBT_CORINGA')];
        const incoming = createCardInstance('VOLEIO_ACELERADO', 'AI');

        const moves = getLegalMoves(hand, incoming);
        expect(moves.requiresBlueDefense).toBe(true);
        expect(moves.playableCards).toHaveLength(0);
        expect(moves.canDig).toBe(false);
      });

      it('sob Coringa Verde do adversário declarado como GANCHO_ATA, deve ativar trava de ataque', () => {
        const hand = [createCardInstance('BANDEJA_CURTA')];
        const incoming = createCardInstance('GOLPE_UBT_CORINGA', 'AI', 'GANCHO_ATA');

        const moves = getLegalMoves(hand, incoming);
        expect(moves.requiresBlueDefense).toBe(true);
        expect(moves.playableCards).toHaveLength(0);
        expect(moves.canDig).toBe(false);
      });
    });

    describe('Filtragem de Mão para Golpes Não-Ataque', () => {
      it('sob exigência de BANDEJAS (ex: DEF_CURTA), deve filtrar apenas bandejas e coringas verdes', () => {
        const c1 = createCardInstance('BANDEJA_CURTA');
        const c2 = createCardInstance('BANDEJA_LOB_CHUTADO');
        const c3 = createCardInstance('VOLEIO_PINGADA');
        const c4 = createCardInstance('SMASH');
        const c5 = createCardInstance('GOLPE_UBT_CORINGA');

        const hand = [c1, c2, c3, c4, c5];
        const incoming = createCardInstance('DEF_CURTA', 'AI');

        const moves = getLegalMoves(hand, incoming);
        expect(moves.requiresBlueDefense).toBe(false);
        expect(moves.playableCards).toEqual([c1, c2, c5]);
        expect(moves.canDig).toBe(false);
      });

      it('sob exigência de VOLEIOS (ex: DEF_NEUTRA), deve filtrar apenas voleios e coringas verdes', () => {
        const c1 = createCardInstance('VOLEIO_PINGADA');
        const c2 = createCardInstance('VOLEIO_ACELERADO');
        const c3 = createCardInstance('BANDEJA_CURTA');

        const hand = [c1, c2, c3];
        const incoming = createCardInstance('DEF_NEUTRA', 'AI');

        const moves = getLegalMoves(hand, incoming);
        expect(moves.requiresBlueDefense).toBe(false);
        expect(moves.playableCards).toEqual([c1, c2]);
        expect(moves.canDig).toBe(false);
      });

      it('sob exigência de FUNDO (ex: DEF_LOB), deve filtrar smashes, ganchos e verônicas', () => {
        const c1 = createCardInstance('SMASH');
        const c2 = createCardInstance('GANCHO_ATA');
        const c3 = createCardInstance('GANCHO_DEF');
        const c4 = createCardInstance('VERONICA_ATA');
        const c5 = createCardInstance('VERONICA_DEF');
        const c6 = createCardInstance('VOLEIO_PINGADA');

        const hand = [c1, c2, c3, c4, c5, c6];
        const incoming = createCardInstance('DEF_LOB', 'AI');

        const moves = getLegalMoves(hand, incoming);
        expect(moves.requiresBlueDefense).toBe(false);
        expect(moves.playableCards).toEqual([c1, c2, c3, c4, c5]);
        expect(moves.canDig).toBe(false);
      });
    });

    describe('Ativação Estrita de Cavação (canDig)', () => {
      it('deve habilitar canDig = true se e somente se playableCards.length === 0 em bola sem ataque', () => {
        const handSemBandejas = [
          createCardInstance('VOLEIO_PINGADA'),
          createCardInstance('SMASH'),
          createCardInstance('GANCHO_DEF'),
        ];
        const incoming = createCardInstance('DEF_CURTA', 'AI'); // Exige BANDEJAS

        const moves = getLegalMoves(handSemBandejas, incoming);
        expect(moves.playableCards).toHaveLength(0);
        expect(moves.canDig).toBe(true);
        expect(moves.requiresBlueDefense).toBe(false);
      });

      it('deve proibir canDig = false se o jogador tiver GOLPE_UBT_CORINGA na mão', () => {
        const handComCoringa = [
          createCardInstance('VOLEIO_PINGADA'),
          createCardInstance('GOLPE_UBT_CORINGA'),
        ];
        const incoming = createCardInstance('DEF_CURTA', 'AI'); // Exige BANDEJAS

        const moves = getLegalMoves(handComCoringa, incoming);
        expect(moves.playableCards).toHaveLength(1);
        expect(moves.canDig).toBe(false);
      });

      it('com mão vazia (hand = []), canDig deve ser true para bola normal e false para ataque', () => {
        const incomingNormal = createCardInstance('DEF_NEUTRA', 'AI');
        const movesNormal = getLegalMoves([], incomingNormal);
        expect(movesNormal.playableCards).toHaveLength(0);
        expect(movesNormal.canDig).toBe(true);
        expect(movesNormal.requiresBlueDefense).toBe(false);

        const incomingAttack = createCardInstance('SMASH', 'AI');
        const movesAttack = getLegalMoves([], incomingAttack);
        expect(movesAttack.playableCards).toHaveLength(0);
        expect(movesAttack.canDig).toBe(false);
        expect(movesAttack.requiresBlueDefense).toBe(true);
      });
    });
  });

  // ==========================================================================
  // 4. VALIDAÇÃO DE JOGADA DE TURNO (validateTurnPlay)
  // ==========================================================================
  describe('validateTurnPlay', () => {
    describe('Jogadas Regulares de Rali', () => {
      it('deve validar respostas corretas da Folha Rosa', () => {
        const incoming = createCardInstance('DEF_CURTA', 'AI');
        const validPlay = createCardInstance('BANDEJA_CURTA', 'PLAYER');

        const result = validateTurnPlay(incoming, validPlay);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('deve rejeitar respostas incompatíveis com a categoria exigida', () => {
        const incoming = createCardInstance('DEF_CURTA', 'AI'); // Exige BANDEJAS
        const invalidPlay = createCardInstance('VOLEIO_PINGADA', 'PLAYER');

        const result = validateTurnPlay(incoming, invalidPlay);
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/não satisfaz a exigência "BANDEJAS"/);
      });

      it('deve rejeitar jogar cartas de saque laranjas durante o rali', () => {
        const incoming = createCardInstance('DEF_CURTA', 'AI');
        const orangePlay = createCardInstance('SAQUE_1', 'PLAYER');

        const result = validateTurnPlay(incoming, orangePlay);
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/Cartas de saque laranjas não podem ser jogadas/);
      });

      it('deve rejeitar jogar cartas de defesa azul contra bola normal de rali', () => {
        const incoming = createCardInstance('DEF_CURTA', 'AI');
        const bluePlay = createCardInstance('DEF_LOB', 'PLAYER');

        const result = validateTurnPlay(incoming, bluePlay);
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/Cartas de defesa azul só podem ser utilizadas contra ataques/);
      });
    });

    describe('Defesa contra Ataques (SMASH, VOLEIO_ACELERADO, GANCHO_ATA, VERONICA_ATA)', () => {
      it('deve permitir cartas do Monte Azul quando atacado', () => {
        const incoming = createCardInstance('SMASH', 'AI');
        const blueDef = createCardInstance('DEF_CURTA', 'PLAYER');

        const result = validateTurnPlay(incoming, blueDef);
        expect(result.isValid).toBe(true);
      });

      it('deve rejeitar cartas verdes da mão quando atacado', () => {
        const incoming = createCardInstance('SMASH', 'AI');
        const greenPlay = createCardInstance('BANDEJA_CURTA', 'PLAYER');

        const result = validateTurnPlay(incoming, greenPlay);
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/não podem ser defendidos com cartas verdes da mão/);
      });

      it('deve rejeitar GOLPE_UBT_CORINGA contra ataques', () => {
        const incoming = createCardInstance('VOLEIO_ACELERADO', 'AI');
        const coringaPlay = createCardInstance('GOLPE_UBT_CORINGA', 'PLAYER', 'DEF_CURTA');

        const result = validateTurnPlay(incoming, coringaPlay);
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/não podem ser defendidos com cartas verdes da mão/);
      });

      it('deve validar DEF_UBT_CORINGA contra ataque se declarada corretamente', () => {
        const incoming = createCardInstance('SMASH', 'AI');
        const coringaAzul = createCardInstance('DEF_UBT_CORINGA', 'PLAYER', 'DEF_LOB');

        const result = validateTurnPlay(incoming, coringaAzul);
        expect(result.isValid).toBe(true);
      });

      it('deve rejeitar DEF_UBT_CORINGA sem declaração contra ataque', () => {
        const incoming = createCardInstance('SMASH', 'AI');
        const coringaAzulUndeclared = createCardInstance('DEF_UBT_CORINGA', 'PLAYER');

        const result = validateTurnPlay(incoming, coringaAzulUndeclared);
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/DEF_UBT_CORINGA exige declaração/);
      });
    });

    describe('Coringas e Declarações Dinâmicas', () => {
      it('deve validar GOLPE_UBT_CORINGA com declaração compatível com a exigência', () => {
        const incoming = createCardInstance('DEF_CURTA', 'AI'); // Exige BANDEJAS
        const coringaVerde = createCardInstance('GOLPE_UBT_CORINGA', 'PLAYER');

        const result = validateTurnPlay(incoming, coringaVerde, 'BANDEJA_CURTA');
        expect(result.isValid).toBe(true);
      });

      it('deve rejeitar GOLPE_UBT_CORINGA com declaração incompatível com a exigência', () => {
        const incoming = createCardInstance('DEF_CURTA', 'AI'); // Exige BANDEJAS
        const coringaVerde = createCardInstance('GOLPE_UBT_CORINGA', 'PLAYER');

        const result = validateTurnPlay(incoming, coringaVerde, 'SMASH'); // Incompatível com BANDEJAS
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/não é compatível com a exigência "BANDEJAS"/);
      });

      it('deve rejeitar GOLPE_UBT_CORINGA jogado sem declaração', () => {
        const incoming = createCardInstance('DEF_CURTA', 'AI');
        const coringaVerde = createCardInstance('GOLPE_UBT_CORINGA', 'PLAYER');

        const result = validateTurnPlay(incoming, coringaVerde);
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/GOLPE_UBT_CORINGA exige declaração/);
      });

      it('deve validar resposta quando a bola recebida era um Coringa Azul declarado', () => {
        const incomingCoringaAzul = createCardInstance('DEF_UBT_CORINGA', 'AI', 'DEF_CURTA');
        const responseCard = createCardInstance('BANDEJA_CURTA', 'PLAYER');

        const result = validateTurnPlay(incomingCoringaAzul, responseCard);
        expect(result.isValid).toBe(true);
      });

      it('deve rejeitar se a bola recebida for um Coringa Azul sem declaração', () => {
        const incomingUndeclared = createCardInstance('DEF_UBT_CORINGA', 'AI');
        const responseCard = createCardInstance('BANDEJA_CURTA', 'PLAYER');

        const result = validateTurnPlay(incomingUndeclared, responseCard);
        expect(result.isValid).toBe(false);
        expect(result.error).toMatch(/não possui declaração válida/);
      });
    });
  });

  // ==========================================================================
  // 5. HELPER isValidResponse
  // ==========================================================================
  describe('isValidResponse', () => {
    it('deve manter 100% de paridade com validateTurnPlay', () => {
      expect(isValidResponse(CARDS_CATALOG.DEF_CURTA, CARDS_CATALOG.BANDEJA_CURTA)).toBe(true);
      expect(isValidResponse(CARDS_CATALOG.DEF_CURTA, CARDS_CATALOG.VOLEIO_PINGADA)).toBe(false);
      expect(isValidResponse(CARDS_CATALOG.SMASH, CARDS_CATALOG.DEF_CURTA)).toBe(true);
      expect(isValidResponse(CARDS_CATALOG.SMASH, CARDS_CATALOG.BANDEJA_CURTA)).toBe(false);
    });

    it('deve lidar com coringas declarados via parâmetros', () => {
      expect(
        isValidResponse(
          CARDS_CATALOG.DEF_CURTA,
          CARDS_CATALOG.GOLPE_UBT_CORINGA,
          'BANDEJA_CURTA'
        )
      ).toBe(true);

      expect(
        isValidResponse(
          CARDS_CATALOG.DEF_CURTA,
          CARDS_CATALOG.GOLPE_UBT_CORINGA,
          'SMASH'
        )
      ).toBe(false);
    });
  });

  // ==========================================================================
  // 6. DECLARAÇÕES DE CORINGA AUXILIARES
  // ==========================================================================
  describe('Helpers de Declaração de Coringas', () => {
    it('getValidDeclarationsForResponse deve listar apenas cartas do grupo correspondente', () => {
      expect(getValidDeclarationsForResponse('BANDEJAS')).toEqual([
        'BANDEJA_CURTA',
        'BANDEJA_LOB_CHUTADO',
        'BANDEJA_LOB',
      ]);

      expect(getValidDeclarationsForResponse('VOLEIOS')).toEqual([
        'VOLEIO_PINGADA',
        'VOLEIO_ACELERADO',
        'VOLEIO_LOB',
      ]);

      expect(getValidDeclarationsForResponse('FUNDO')).toEqual([
        'SMASH',
        'GANCHO_ATA',
        'GANCHO_DEF',
        'VERONICA_ATA',
        'VERONICA_DEF',
      ]);

      expect(getValidDeclarationsForResponse('DEFESAS')).toEqual([]);
    });

    it('getValidBlueWildcardDeclarations deve retornar as 3 defesas regulares', () => {
      expect(getValidBlueWildcardDeclarations()).toEqual([
        'DEF_CURTA',
        'DEF_NEUTRA',
        'DEF_LOB',
      ]);
    });
  });
});
