/**
 * tests/unit/scoreEngine.test.ts
 * Suíte de testes unitários para o motor de pontuação oficial de Beach Tennis (ITF / CBT).
 * Executada sob Vitest.
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialScore,
  awardPoint,
  addPoint,
  formatScore,
  formatPoints,
  formatGames,
  type MatchMode,
  type AwardPointResult,
} from '../../src/engine/scoreEngine';
import type { PlayerId, ScoreState } from '../../src/engine/types';

describe('scoreEngine - Beach Tennis Official Scoring System', () => {
  // ==========================================================================
  // 1. CRIAÇÃO DE ESTADO INICIAL
  // ==========================================================================
  describe('createInitialScore', () => {
    it('deve inicializar com placar zerado no modo SHORT_SET_4', () => {
      const score = createInitialScore('SHORT_SET_4');

      expect(score.matchFormat).toBe('SHORT_SET_4');
      expect(score.playerGames).toBe(0);
      expect(score.aiGames).toBe(0);
      expect(score.playerPoints).toBe(0);
      expect(score.aiPoints).toBe(0);
      expect(score.isDeuce).toBe(false);
      expect(score.isNoAdPoint).toBe(false);
      expect(score.isTieBreak).toBe(false);
      expect(score.playerTieBreakPoints).toBe(0);
      expect(score.aiTieBreakPoints).toBe(0);
      expect(score.currentServer).toBe('PLAYER');
      expect(score.nextGameServer).toBe('AI');
      expect(score.setWinner).toBeNull();
      expect(score.matchWinner).toBeNull();
      expect(score.completedSets).toEqual([]);
    });

    it('deve respeitar o sacador inicial customizado (AI)', () => {
      const score = createInitialScore('FULL_SET_6', 'AI');

      expect(score.currentServer).toBe('AI');
      expect(score.nextGameServer).toBe('PLAYER');
    });

    it('deve suportar os 3 formatos de partida oficiais', () => {
      const formats: MatchMode[] = ['FAST_1_GAME', 'SHORT_SET_4', 'FULL_SET_6'];
      for (const fmt of formats) {
        const score = createInitialScore(fmt);
        expect(score.matchFormat).toBe(fmt);
      }
    });
  });

  // ==========================================================================
  // 2. PROGRESSÃO PADRÃO DE PONTOS (0 -> 15 -> 30 -> 40)
  // ==========================================================================
  describe('Progressão Padrão de Pontos', () => {
    it('deve progredir sequencialmente os pontos do PLAYER: 0 -> 15 -> 30 -> 40', () => {
      let score = createInitialScore('SHORT_SET_4');

      // 0 -> 15
      let res = awardPoint(score, 'PLAYER');
      expect(res.nextScore.playerPoints).toBe(15);
      expect(res.nextScore.aiPoints).toBe(0);
      expect(res.gameWonBy).toBeUndefined();

      // 15 -> 30
      res = awardPoint(res.nextScore, 'PLAYER');
      expect(res.nextScore.playerPoints).toBe(30);
      expect(res.nextScore.aiPoints).toBe(0);

      // 30 -> 40
      res = awardPoint(res.nextScore, 'PLAYER');
      expect(res.nextScore.playerPoints).toBe(40);
      expect(res.nextScore.aiPoints).toBe(0);
      expect(res.isNoAdPoint).toBe(false);
    });

    it('deve progredir os pontos da AI independentemente', () => {
      let score = createInitialScore('SHORT_SET_4');

      let res = awardPoint(score, 'AI');
      expect(res.nextScore.aiPoints).toBe(15);

      res = awardPoint(res.nextScore, 'AI');
      expect(res.nextScore.aiPoints).toBe(30);

      res = awardPoint(res.nextScore, 'AI');
      expect(res.nextScore.aiPoints).toBe(40);
      expect(res.nextScore.playerPoints).toBe(0);
    });

    it('deve fechar o game direto a partir do 40-0', () => {
      let score = createInitialScore('SHORT_SET_4');
      for (let i = 0; i < 3; i++) {
        score = awardPoint(score, 'PLAYER').nextScore;
      }
      expect(score.playerPoints).toBe(40);

      const res = awardPoint(score, 'PLAYER');
      expect(res.gameWonBy).toBe('PLAYER');
      expect(res.nextScore.playerGames).toBe(1);
      expect(res.nextScore.aiGames).toBe(0);
      expect(res.nextScore.playerPoints).toBe(0);
      expect(res.nextScore.aiPoints).toBe(0);
    });
  });

  // ==========================================================================
  // 3. REGRA DO NO-AD (PONTO DECISIVO NO 40-40)
  // ==========================================================================
  describe('Regra No-Ad (Ponto Decisivo)', () => {
    it('ao empatar em 40-40 deve sinalizar isDeuce=true e isNoAdPoint=true', () => {
      let score = createInitialScore('SHORT_SET_4');

      // Leva a 30-40
      score = awardPoint(score, 'PLAYER').nextScore; // 15-0
      score = awardPoint(score, 'PLAYER').nextScore; // 30-0
      score = awardPoint(score, 'AI').nextScore;     // 30-15
      score = awardPoint(score, 'AI').nextScore;     // 30-30
      score = awardPoint(score, 'AI').nextScore;     // 30-40

      expect(score.playerPoints).toBe(30);
      expect(score.aiPoints).toBe(40);
      expect(score.isNoAdPoint).toBe(false);

      // PLAYER faz o ponto -> 40-40 (Ponto Decisivo)
      const res = awardPoint(score, 'PLAYER');
      expect(res.nextScore.playerPoints).toBe(40);
      expect(res.nextScore.aiPoints).toBe(40);
      expect(res.nextScore.isDeuce).toBe(true);
      expect(res.nextScore.isNoAdPoint).toBe(true);
      expect(res.isNoAdPoint).toBe(true);
      expect(res.gameWonBy).toBeUndefined();
    });

    it('no 40-40, vitória do PLAYER fecha o game imediatamente sem vantagem', () => {
      let score = createInitialScore('SHORT_SET_4');
      score.playerPoints = 40;
      score.aiPoints = 40;
      score.isDeuce = true;
      score.isNoAdPoint = true;

      const res = awardPoint(score, 'PLAYER');
      expect(res.gameWonBy).toBe('PLAYER');
      expect(res.nextScore.playerGames).toBe(1);
      expect(res.nextScore.playerPoints).toBe(0);
      expect(res.nextScore.aiPoints).toBe(0);
      expect(res.nextScore.isDeuce).toBe(false);
      expect(res.nextScore.isNoAdPoint).toBe(false);
    });

    it('no 40-40, vitória da AI fecha o game imediatamente sem vantagem', () => {
      let score = createInitialScore('SHORT_SET_4');
      score.playerPoints = 40;
      score.aiPoints = 40;
      score.isDeuce = true;
      score.isNoAdPoint = true;

      const res = awardPoint(score, 'AI');
      expect(res.gameWonBy).toBe('AI');
      expect(res.nextScore.aiGames).toBe(1);
      expect(res.nextScore.playerPoints).toBe(0);
      expect(res.nextScore.aiPoints).toBe(0);
    });

    it('pontuação nunca deve registrar "AD" ou valor superior a 40', () => {
      let score = createInitialScore('SHORT_SET_4');
      score.playerPoints = 40;
      score.aiPoints = 40;
      score.isDeuce = true;
      score.isNoAdPoint = true;

      const res = awardPoint(score, 'PLAYER');
      expect(res.nextScore.playerPoints).toBe(0);
      expect(res.nextScore.aiPoints).toBe(0);
    });
  });

  // ==========================================================================
  // 4. TRANSIÇÃO DE GAMES E ALTERNÂNCIA DE SAQUE
  // ==========================================================================
  describe('Alternância de Saque entre Games', () => {
    function winGame(score: ScoreState, winner: PlayerId): AwardPointResult {
      let s = score;
      let res!: AwardPointResult;
      for (let i = 0; i < 4; i++) {
        res = awardPoint(s, winner);
        s = res.nextScore;
        if (res.gameWonBy) break;
      }
      return res;
    }

    it('deve alternar o sacador após cada game finalizado', () => {
      let score = createInitialScore('SHORT_SET_4', 'PLAYER');
      expect(score.currentServer).toBe('PLAYER');
      expect(score.nextGameServer).toBe('AI');

      // Game 1 ganho pelo PLAYER
      const res1 = winGame(score, 'PLAYER');
      expect(res1.gameWonBy).toBe('PLAYER');
      expect(res1.nextScore.currentServer).toBe('AI');
      expect(res1.nextScore.nextGameServer).toBe('PLAYER');

      // Game 2 ganho pela AI
      const res2 = winGame(res1.nextScore, 'AI');
      expect(res2.gameWonBy).toBe('AI');
      expect(res2.nextScore.currentServer).toBe('PLAYER');
      expect(res2.nextScore.nextGameServer).toBe('AI');
    });
  });

  // ==========================================================================
  // 5. MODO FAST_1_GAME (PARTIDA RÁPIDA DE 1 GAME)
  // ==========================================================================
  describe('Modo FAST_1_GAME', () => {
    it('deve encerrar o set e a partida assim que 1 game for vencido', () => {
      let score = createInitialScore('FAST_1_GAME', 'PLAYER');

      for (let i = 0; i < 3; i++) {
        score = awardPoint(score, 'PLAYER').nextScore;
      }

      const res = awardPoint(score, 'PLAYER');
      expect(res.gameWonBy).toBe('PLAYER');
      expect(res.setWonBy).toBe('PLAYER');
      expect(res.matchWonBy).toBe('PLAYER');
      expect(res.nextScore.setWinner).toBe('PLAYER');
      expect(res.nextScore.matchWinner).toBe('PLAYER');
      expect(res.nextScore.completedSets).toEqual([{ playerGames: 1, aiGames: 0 }]);
    });

    it('chamadas adicionais de awardPoint após término da partida devem ser idempotentes e seguras', () => {
      let score = createInitialScore('FAST_1_GAME');
      for (let i = 0; i < 4; i++) {
        score = awardPoint(score, 'PLAYER').nextScore;
      }
      expect(score.matchWinner).toBe('PLAYER');

      // Tenta marcar outro ponto
      const extraRes = awardPoint(score, 'AI');
      expect(extraRes.matchWonBy).toBe('PLAYER');
      expect(extraRes.nextScore.playerGames).toBe(1);
      expect(extraRes.nextScore.aiGames).toBe(0);
    });
  });

  // ==========================================================================
  // 6. MODO SHORT_SET_4 (SET CURTO ATÉ 4 GAMES)
  // ==========================================================================
  describe('Modo SHORT_SET_4', () => {
    function winGame(score: ScoreState, winner: PlayerId): AwardPointResult {
      let s = score;
      let res!: AwardPointResult;
      for (let i = 0; i < 4; i++) {
        res = awardPoint(s, winner);
        s = res.nextScore;
        if (res.gameWonBy) break;
      }
      return res;
    }

    it('deve vencer o set em 4x0, 4x1 ou 4x2 (vantagem de 2)', () => {
      let score = createInitialScore('SHORT_SET_4');

      // 4x0 direto para o PLAYER
      for (let g = 0; g < 3; g++) {
        score = winGame(score, 'PLAYER').nextScore;
      }
      expect(score.playerGames).toBe(3);
      expect(score.setWinner).toBeNull();

      const res4 = winGame(score, 'PLAYER');
      expect(res4.setWonBy).toBe('PLAYER');
      expect(res4.matchWonBy).toBe('PLAYER');
      expect(res4.nextScore.playerGames).toBe(4);
      expect(res4.nextScore.aiGames).toBe(0);
    });

    it('em 4x3 a partida não acaba; fechando em 5x3 vence o set', () => {
      let score = createInitialScore('SHORT_SET_4');

      // 3x3
      for (let g = 0; g < 3; g++) {
        score = winGame(score, 'PLAYER').nextScore;
        score = winGame(score, 'AI').nextScore;
      }
      expect(score.playerGames).toBe(3);
      expect(score.aiGames).toBe(3);

      // Game 7 ganho pelo PLAYER -> 4x3
      const g7 = winGame(score, 'PLAYER');
      expect(g7.setWonBy).toBeUndefined();
      expect(g7.nextScore.playerGames).toBe(4);
      expect(g7.nextScore.aiGames).toBe(3);

      // Game 8 ganho pelo PLAYER -> 5x3 (vence com 2 de vantagem)
      const g8 = winGame(g7.nextScore, 'PLAYER');
      expect(g8.setWonBy).toBe('PLAYER');
      expect(g8.matchWonBy).toBe('PLAYER');
      expect(g8.nextScore.playerGames).toBe(5);
      expect(g8.nextScore.aiGames).toBe(3);
    });

    it('em 4x4 deve ativar o Tie-Break de 7 pontos', () => {
      let score = createInitialScore('SHORT_SET_4');

      // 3x3
      for (let g = 0; g < 3; g++) {
        score = winGame(score, 'PLAYER').nextScore;
        score = winGame(score, 'AI').nextScore;
      }

      // 4x3 para PLAYER
      score = winGame(score, 'PLAYER').nextScore;
      // 4x4 pela AI
      const g8 = winGame(score, 'AI');

      expect(g8.isTieBreak).toBe(true);
      expect(g8.nextScore.isTieBreak).toBe(true);
      expect(g8.nextScore.playerGames).toBe(4);
      expect(g8.nextScore.aiGames).toBe(4);
      expect(g8.nextScore.playerTieBreakPoints).toBe(0);
      expect(g8.nextScore.aiTieBreakPoints).toBe(0);
    });
  });

  // ==========================================================================
  // 7. MODO FULL_SET_6 (SET OFICIAL ATÉ 6 GAMES)
  // ==========================================================================
  describe('Modo FULL_SET_6', () => {
    function winGame(score: ScoreState, winner: PlayerId): AwardPointResult {
      let s = score;
      let res!: AwardPointResult;
      for (let i = 0; i < 4; i++) {
        res = awardPoint(s, winner);
        s = res.nextScore;
        if (res.gameWonBy) break;
      }
      return res;
    }

    it('deve vencer o set em 6x4 ou 7x5', () => {
      let score = createInitialScore('FULL_SET_6');

      // 5x5
      for (let g = 0; g < 5; g++) {
        score = winGame(score, 'PLAYER').nextScore;
        score = winGame(score, 'AI').nextScore;
      }
      expect(score.playerGames).toBe(5);
      expect(score.aiGames).toBe(5);

      // 6x5
      const g11 = winGame(score, 'PLAYER');
      expect(g11.setWonBy).toBeUndefined();

      // 7x5 -> Set fechado
      const g12 = winGame(g11.nextScore, 'PLAYER');
      expect(g12.setWonBy).toBe('PLAYER');
      expect(g12.matchWonBy).toBe('PLAYER');
      expect(g12.nextScore.playerGames).toBe(7);
      expect(g12.nextScore.aiGames).toBe(5);
    });

    it('em 6x6 deve ativar o Tie-Break de 7 pontos', () => {
      let score = createInitialScore('FULL_SET_6');

      for (let g = 0; g < 5; g++) {
        score = winGame(score, 'PLAYER').nextScore;
        score = winGame(score, 'AI').nextScore;
      }
      // 6x5
      score = winGame(score, 'PLAYER').nextScore;
      // 6x6
      const g12 = winGame(score, 'AI');

      expect(g12.isTieBreak).toBe(true);
      expect(g12.nextScore.isTieBreak).toBe(true);
      expect(g12.nextScore.playerGames).toBe(6);
      expect(g12.nextScore.aiGames).toBe(6);
    });
  });

  // ==========================================================================
  // 8. TIE-BREAK: PONTUAÇÃO E ROTAÇÃO OFICIAL DE SAQUE (1-2-2-2...)
  // ==========================================================================
  describe('Tie-Break: Pontuação e Alternância de Saque (1-2-2-2...)', () => {
    it('deve alternar o saque exatamente no padrão: S1 serve ponto 1, S2 serve pontos 2 e 3, S1 serve pontos 4 e 5...', () => {
      let score = createInitialScore('SHORT_SET_4', 'PLAYER');
      // Ativa tie-break artificialmente com PLAYER sacando o ponto 1
      score.isTieBreak = true;
      score.currentServer = 'PLAYER';
      score.nextGameServer = 'AI';

      const serverHistory: PlayerId[] = [score.currentServer];

      // Joga 12 pontos no tie-break
      for (let pt = 0; pt < 12; pt++) {
        const winner: PlayerId = pt % 2 === 0 ? 'PLAYER' : 'AI';
        const res = awardPoint(score, winner);
        score = res.nextScore;
        serverHistory.push(score.currentServer);
      }

      // Padrão esperado para os primeiros 13 estados de servidor (antes do ponto 1 até o ponto 13):
      // Ponto 1: PLAYER
      // Ponto 2: AI
      // Ponto 3: AI
      // Ponto 4: PLAYER
      // Ponto 5: PLAYER
      // Ponto 6: AI
      // Ponto 7: AI
      // Ponto 8: PLAYER
      // Ponto 9: PLAYER
      // Ponto 10: AI
      // Ponto 11: AI
      // Ponto 12: PLAYER
      // Ponto 13: PLAYER
      expect(serverHistory).toEqual([
        'PLAYER', // Ponto 1
        'AI',     // Ponto 2
        'AI',     // Ponto 3
        'PLAYER', // Ponto 4
        'PLAYER', // Ponto 5
        'AI',     // Ponto 6
        'AI',     // Ponto 7
        'PLAYER', // Ponto 8
        'PLAYER', // Ponto 9
        'AI',     // Ponto 10
        'AI',     // Ponto 11
        'PLAYER', // Ponto 12
        'PLAYER', // Ponto 13
      ]);
    });

    it('deve fechar o tie-break em 7x0 com vantagem mínima de 2', () => {
      let score = createInitialScore('SHORT_SET_4');
      score.playerGames = 4;
      score.aiGames = 4;
      score.isTieBreak = true;

      for (let i = 0; i < 6; i++) {
        score = awardPoint(score, 'PLAYER').nextScore;
      }
      expect(score.playerTieBreakPoints).toBe(6);
      expect(score.aiTieBreakPoints).toBe(0);

      const res7 = awardPoint(score, 'PLAYER');
      expect(res7.matchWonBy).toBe('PLAYER');
      expect(res7.setWonBy).toBe('PLAYER');
      expect(res7.gameWonBy).toBe('PLAYER');
      expect(res7.isTieBreak).toBe(false);
      expect(res7.nextScore.playerGames).toBe(5);
      expect(res7.nextScore.aiGames).toBe(4);
      expect(res7.nextScore.completedSets).toEqual([{ playerGames: 5, aiGames: 4 }]);
    });

    it('em 6x6 no tie-break, 7x6 NÃO fecha o jogo; exige diferença de 2 (8x6)', () => {
      let score = createInitialScore('FULL_SET_6');
      score.playerGames = 6;
      score.aiGames = 6;
      score.isTieBreak = true;

      // 6x6
      for (let i = 0; i < 6; i++) {
        score = awardPoint(score, 'PLAYER').nextScore;
        score = awardPoint(score, 'AI').nextScore;
      }
      expect(score.playerTieBreakPoints).toBe(6);
      expect(score.aiTieBreakPoints).toBe(6);

      // Ponto 13: PLAYER faz 7x6 -> NÃO VENCE
      const p13 = awardPoint(score, 'PLAYER');
      expect(p13.matchWonBy).toBeUndefined();
      expect(p13.isTieBreak).toBe(true);
      expect(p13.nextScore.playerTieBreakPoints).toBe(7);
      expect(p13.nextScore.aiTieBreakPoints).toBe(6);

      // Ponto 14: PLAYER faz 8x6 -> VENCE!
      const p14 = awardPoint(p13.nextScore, 'PLAYER');
      expect(p14.matchWonBy).toBe('PLAYER');
      expect(p14.setWonBy).toBe('PLAYER');
      expect(p14.nextScore.playerGames).toBe(7);
      expect(p14.nextScore.aiGames).toBe(6);
      expect(p14.nextScore.completedSets).toEqual([{ playerGames: 7, aiGames: 6 }]);
    });

    it('suporta tie-break prolongado (10x8)', () => {
      let score = createInitialScore('FULL_SET_6');
      score.playerGames = 6;
      score.aiGames = 6;
      score.isTieBreak = true;

      // Leva até 8x8
      for (let i = 0; i < 8; i++) {
        score = awardPoint(score, 'PLAYER').nextScore;
        score = awardPoint(score, 'AI').nextScore;
      }
      expect(score.playerTieBreakPoints).toBe(8);
      expect(score.aiTieBreakPoints).toBe(8);

      // 9x8 para AI
      score = awardPoint(score, 'AI').nextScore;
      expect(score.matchWinner).toBeNull();

      // 10x8 para AI -> Vitória da AI!
      const res = awardPoint(score, 'AI');
      expect(res.matchWonBy).toBe('AI');
      expect(res.nextScore.playerGames).toBe(6);
      expect(res.nextScore.aiGames).toBe(7);
      expect(res.nextScore.completedSets).toEqual([{ playerGames: 6, aiGames: 7 }]);
    });
  });

  // ==========================================================================
  // 9. IMUTABILIDADE E FUNÇÕES PURAS
  // ==========================================================================
  describe('Garantias de Imutabilidade e Pureza', () => {
    it('awardPoint não deve mutar o objeto currentScore de entrada', () => {
      const original = createInitialScore('SHORT_SET_4');
      const clone = JSON.parse(JSON.stringify(original));

      awardPoint(original, 'PLAYER');
      expect(original).toEqual(clone);
    });

    it('addPoint deve ser um alias idêntico para awardPoint', () => {
      expect(addPoint).toBe(awardPoint);
    });
  });

  // ==========================================================================
  // 10. UTILITÁRIOS DE FORMATAÇÃO (formatScore, formatPoints, formatGames)
  // ==========================================================================
  describe('Formatação de Placar', () => {
    it('deve formatar placar padrão em game regular', () => {
      const score = createInitialScore('SHORT_SET_4');
      score.playerPoints = 30;
      score.aiPoints = 15;
      score.playerGames = 2;
      score.aiGames = 1;

      expect(formatScore(score)).toBe(
        'Pontos: 30-15 | Games: 2-1 | Saque: PLAYER'
      );
      expect(formatPoints(score)).toBe('30-15');
      expect(formatGames(score)).toBe('2-1');
    });

    it('deve destacar o Ponto Decisivo (No-Ad) no 40-40', () => {
      const score = createInitialScore('SHORT_SET_4');
      score.playerPoints = 40;
      score.aiPoints = 40;
      score.isDeuce = true;
      score.isNoAdPoint = true;

      expect(formatScore(score)).toContain('Ponto Decisivo / No-Ad');
      expect(formatPoints(score)).toBe('40-40 (Ponto Decisivo)');
    });

    it('deve formatar tie-break em andamento', () => {
      const score = createInitialScore('SHORT_SET_4');
      score.isTieBreak = true;
      score.playerGames = 4;
      score.aiGames = 4;
      score.playerTieBreakPoints = 5;
      score.aiTieBreakPoints = 4;

      expect(formatScore(score)).toBe(
        'Tie-Break: 5-4 | Games: 4-4 | Saque: PLAYER'
      );
      expect(formatPoints(score)).toBe('TB 5-4');
    });

    it('deve formatar tela de vitória final', () => {
      const score = createInitialScore('SHORT_SET_4');
      score.matchWinner = 'PLAYER';
      score.completedSets = [{ playerGames: 5, aiGames: 3 }];

      expect(formatScore(score)).toBe(
        'Fim de Partida | Vitória de PLAYER (5-3)'
      );
    });
  });
});
