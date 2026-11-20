import { describe, it, expect } from 'vitest';
import {
  createEngineMatch,
  applyEngineAction,
  chooseAutoTimeoutAction,
  projectMatchView,
} from '../../src/engine';
import type { EngineMatchState, PlayerId } from '../../src/engine';

function assertZeroHiddenCardLeakage(state: EngineMatchState) {
  for (const viewer of ['PLAYER', 'AI'] as PlayerId[]) {
    const opp: PlayerId = viewer === 'PLAYER' ? 'AI' : 'PLAYER';
    const view = projectMatchView(state, viewer);
    const json = JSON.stringify(view);

    const selfState = viewer === 'PLAYER' ? state.player : state.ai;
    const oppState = opp === 'PLAYER' ? state.player : state.ai;

    // 1. Nenhuma carta da mão do adversário pode vazar na visão
    for (const c of oppState.hand) {
      expect(json).not.toContain(`"${c.instanceId}"`);
    }
    // 2. Nenhuma carta oculta nos montes Verde/Azul (próprios ou do oponente) pode vazar
    for (const c of [
      ...selfState.greenDeck,
      ...selfState.blueDeck,
      ...oppState.greenDeck,
      ...oppState.blueDeck,
    ]) {
      expect(json).not.toContain(`"${c.instanceId}"`);
    }
    // 3. Enquanto o duelo de saque não foi resolvido, a escolha do oponente é secreta
    if (!state.serveDuel.isResolved) {
      if (state.serveDuel.server === viewer) {
        expect(view.serveDuel.receiverPicks).toEqual([]);
      } else {
        expect(view.serveDuel.serverPick).toBeNull();
      }
    }
    // 4. O próprio jogador é sempre 'PLAYER' na visão projetada
    expect(view.player.id).toBe('PLAYER');
    expect(view.ai.id).toBe('AI');
    expect(view.player.hand.length).toBe(selfState.hand.length);
    expect(view.ai.hand.length).toBe(oppState.hand.length);
  }
}

describe('Motor Puro (match.ts) & Projeção Filtrada (viewProjection.ts)', () => {
  it('resolve saque secreto apenas quando ambos enviam suas escolhas e oculta antes da revelação', () => {
    let state = createEngineMatch('FAST_1_GAME', 'PLAYER');
    assertZeroHiddenCardLeakage(state);

    // Recebedor ('AI') tenta sacar -> erro
    const wrongRole = applyEngineAction(state, 'AI', { type: 'SERVE_PICK', zone: 2 });
    expect(wrongRole.ok).toBe(false);
    expect(wrongRole.error).toBe('NOT_SERVER');

    // Sacador ('PLAYER') escolhe zona 2
    const step1 = applyEngineAction(state, 'PLAYER', { type: 'SERVE_PICK', zone: 2 });
    expect(step1.ok).toBe(true);
    state = step1.state;
    expect(state.phase).toBe('SERVE_SELECTION');
    expect(state.serveDuel.isResolved).toBe(false);

    // Visão do recebedor ('AI') vê que o sacador está pronto, mas serverPick é null
    const viewReceiver = projectMatchView(state, 'AI');
    expect(viewReceiver.serveDuel.serverReady).toBe(true);
    expect(viewReceiver.serveDuel.serverPick).toBeNull();
    assertZeroHiddenCardLeakage(state);

    // Recebedor tenta escolher 2 zonas iguais -> erro
    const invalidRec = applyEngineAction(state, 'AI', {
      type: 'RECEIVE_PICK',
      zones: [1, 1],
    });
    expect(invalidRec.ok).toBe(false);
    expect(invalidRec.error).toBe('INVALID_RECEIVE_ZONES');

    // Recebedor escolhe [1, 3] (não cobriu 2 -> ACE!)
    const step2 = applyEngineAction(state, 'AI', {
      type: 'RECEIVE_PICK',
      zones: [1, 3],
    });
    expect(step2.ok).toBe(true);
    state = step2.state;
    expect(state.phase).toBe('SERVE_REVEAL');
    expect(state.serveDuel.isResolved).toBe(true);
    expect(state.lastServeResult?.isAce).toBe(true);

    // Concluir revelação -> POINT_ENDED com ponto para PLAYER
    const step3 = applyEngineAction(state, 'PLAYER', { type: 'COMPLETE_SERVE_REVEAL' });
    expect(step3.ok).toBe(true);
    state = step3.state;
    expect(state.phase).toBe('POINT_ENDED');
    expect(state.pointWinner).toBe('PLAYER');
    expect(state.score.playerPoints).toBe(15);

    // Na perspectiva de 'AI', o vencedor do ponto é 'AI' (o oponente dele) e aiPoints dele é 15
    const viewB = projectMatchView(state, 'AI');
    expect(viewB.pointWinner).toBe('AI');
    expect(viewB.score.playerPoints).toBe(0);
    expect(viewB.score.aiPoints).toBe(15);
  });

  it('rejeita jogadas fora de vez e cartas inexistentes na mão', () => {
    let state = createEngineMatch('FAST_1_GAME', 'PLAYER');
    // Saque na zona 1, recebedor cobre [1, 2] -> Defesa!
    state = applyEngineAction(state, 'PLAYER', { type: 'SERVE_PICK', zone: 1 }).state;
    state = applyEngineAction(state, 'AI', { type: 'RECEIVE_PICK', zones: [1, 2] }).state;
    state = applyEngineAction(state, 'PLAYER', { type: 'COMPLETE_SERVE_REVEAL' }).state;

    if (state.phase === 'WILDCARD_DECLARING') {
      const allowed = state.rally.pendingWildcard!.allowedDeclarations[0]!;
      state = applyEngineAction(state, 'AI', {
        type: 'DECLARE_WILDCARD',
        declaredType: allowed,
      }).state;
    }

    expect(state.rally.currentTurnPlayer).toBe('PLAYER');
    // 'AI' tenta jogar no turno de 'PLAYER'
    const outOfTurn = applyEngineAction(state, 'AI', {
      type: 'PLAY_CARD',
      instanceId: state.ai.hand[0]!.instanceId,
    });
    expect(outOfTurn.ok).toBe(false);
    expect(outOfTurn.error).toBe('NOT_YOUR_TURN');

    // 'PLAYER' tenta jogar carta da mão de 'AI'
    const stolenCard = applyEngineAction(state, 'PLAYER', {
      type: 'PLAY_CARD',
      instanceId: state.ai.hand[0]!.instanceId,
    });
    expect(stolenCard.ok).toBe(false);
    expect(stolenCard.error).toBe('CARD_NOT_IN_HAND');
  });

  it('executa 200 pontos completos usando chooseAutoTimeoutAction com zero vazamento de cartas ocultas', () => {
    let state = createEngineMatch('FULL_SET_6', 'PLAYER');

    for (let point = 0; point < 200; point++) {
      let guard = 0;
      while (state.phase !== 'POINT_ENDED' && state.phase !== 'MATCH_OVER' && guard++ < 100) {
        assertZeroHiddenCardLeakage(state);

        if (state.phase === 'SERVE_REVEAL') {
          const res = applyEngineAction(state, 'PLAYER', { type: 'COMPLETE_SERVE_REVEAL' });
          expect(res.ok).toBe(true);
          state = res.state;
          continue;
        }

        let progressed = false;
        for (const seat of ['PLAYER', 'AI'] as PlayerId[]) {
          const autoAction = chooseAutoTimeoutAction(state, seat);
          if (autoAction) {
            const res = applyEngineAction(state, seat, autoAction);
            expect(res.ok).toBe(true);
            state = res.state;
            progressed = true;
            break;
          }
        }
        expect(progressed).toBe(true);
      }

      assertZeroHiddenCardLeakage(state);

      if (state.phase === 'POINT_ENDED') {
        state = applyEngineAction(state, 'PLAYER', { type: 'NEXT_POINT' }).state;
        expect(state.phase).toBe('POINT_ENDED'); // precisa dos dois
        state = applyEngineAction(state, 'AI', { type: 'NEXT_POINT' }).state;
        expect(state.phase).toBe('SERVE_SELECTION');
      } else if (state.phase === 'MATCH_OVER') {
        const prevInitial = state.initialServer;
        state = applyEngineAction(state, 'PLAYER', { type: 'REMATCH' }).state;
        state = applyEngineAction(state, 'AI', { type: 'REMATCH' }).state;
        expect(state.phase).toBe('SERVE_SELECTION');
        expect(state.initialServer).toBe(prevInitial === 'PLAYER' ? 'AI' : 'PLAYER');
      }
    }
  }, 15000);
});
