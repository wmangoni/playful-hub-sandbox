import { describe, it, expect, beforeEach } from 'vitest';
import { useMatchStore } from '../../src/store/useMatchStore';
import { createCardInstance } from '../../src/engine/deckManager';

describe('useMatchStore — Full Match Flow Integration (M4)', () => {
  beforeEach(() => {
    useMatchStore.getState().exitToMenu();
  });

  it('starts in MENU phase and transitions to SERVE_SELECTION when starting a match', () => {
    expect(useMatchStore.getState().phase).toBe('MENU');

    useMatchStore.getState().startMatch('MEDIUM', 'FAST_1_GAME');
    const state = useMatchStore.getState();

    expect(state.phase).toBe('SERVE_SELECTION');
    expect(state.difficulty).toBe('MEDIUM');
    expect(state.matchFormat).toBe('FAST_1_GAME');
    expect(state.player.hand).toHaveLength(6);
    expect(state.player.greenDeck).toHaveLength(18);
    expect(state.player.blueDeck).toHaveLength(8);
    expect(state.ai.hand).toHaveLength(6);
    expect(state.ai.greenDeck).toHaveLength(18);
    expect(state.ai.blueDeck).toHaveLength(8);
  });

  it('resolves a Serve Duel as ACE when AI does not cover the chosen zone', () => {
    // Deterministic RNG = 0 -> AI Medium covers [1, 2]
    const fixedRng = () => 0;
    useMatchStore.getState().startMatch('MEDIUM', 'SHORT_SET_4', fixedRng);

    // Player picks Zone 3 (uncovered by [1, 2])
    useMatchStore.getState().selectServeZone(3);
    useMatchStore.getState().confirmServeDuel(fixedRng);

    const revealState = useMatchStore.getState();
    expect(revealState.phase).toBe('SERVE_REVEAL');
    expect(revealState.lastServeResult?.isAce).toBe(true);

    // Complete reveal immediately
    useMatchStore.getState().completeServeReveal(fixedRng);

    const afterAce = useMatchStore.getState();
    expect(afterAce.phase).toBe('POINT_ENDED');
    expect(afterAce.pointWinner).toBe('PLAYER');
    expect(afterAce.score.playerPoints).toBe(15);
    expect(afterAce.stats.acesPlayer).toBe(1);
  });

  it('resolves a Defended Serve, draws from Blue Deck, and transitions to Rally', () => {
    const fixedRng = () => 0; // AI Medium covers [1, 2]
    useMatchStore.getState().startMatch('MEDIUM', 'SHORT_SET_4', fixedRng);

    // Ensure AI top blue card is DEF_CURTA (requires BANDEJAS)
    useMatchStore.setState((prev) => ({
      ai: {
        ...prev.ai,
        blueDeck: [
          createCardInstance('DEF_CURTA', 'AI', 0),
          ...prev.ai.blueDeck.slice(1),
        ],
      },
    }));

    // Player serves into Zone 1 (covered by AI)
    useMatchStore.getState().selectServeZone(1);
    useMatchStore.getState().confirmServeDuel(fixedRng);
    useMatchStore.getState().completeServeReveal(fixedRng);

    const rallyState = useMatchStore.getState();
    expect(rallyState.phase).toBe('RALLY_PLAYER_TURN');
    expect(rallyState.rally.currentTurnPlayer).toBe('PLAYER');
    expect(rallyState.rally.requiredResponse).toBe('BANDEJAS');
    expect(rallyState.ai.blueDeck).toHaveLength(7);
  });

  it('validates playing a legal Green card from hand and triggers AI response', () => {
    const fixedRng = () => 0;
    useMatchStore.getState().startMatch('EASY', 'SHORT_SET_4', fixedRng);

    const bandejaCard = createCardInstance('BANDEJA_CURTA', 'PLAYER', 0);
    const defCurta = createCardInstance('DEF_CURTA', 'AI', 0);

    useMatchStore.setState((prev) => ({
      phase: 'RALLY_PLAYER_TURN',
      player: {
        ...prev.player,
        hand: [bandejaCard, ...prev.player.hand.slice(1)],
      },
      rally: {
        ...prev.rally,
        lastPlayedCard: defCurta,
        requiredResponse: 'BANDEJAS',
        currentTurnPlayer: 'PLAYER',
        rallyLength: 1,
      },
    }));

    useMatchStore.getState().playCard(bandejaCard.instanceId, undefined, fixedRng);

    const afterPlay = useMatchStore.getState();
    expect(afterPlay.phase).toBe('RALLY_AI_TURN');
    expect(afterPlay.rally.currentTurnPlayer).toBe('AI');
    expect(afterPlay.rally.lastPlayedCard?.definition.type).toBe('BANDEJA_CURTA');
    expect(afterPlay.rally.requiredResponse).toBe('BANDEJAS');
  });

  it('opens CoringaModal when playing GOLPE_UBT_CORINGA and applies declared stroke', () => {
    const fixedRng = () => 0;
    useMatchStore.getState().startMatch('EASY', 'SHORT_SET_4', fixedRng);

    const coringaVerde = createCardInstance('GOLPE_UBT_CORINGA', 'PLAYER', 0);
    const defNeutra = createCardInstance('DEF_NEUTRA', 'AI', 0);

    useMatchStore.setState((prev) => ({
      phase: 'RALLY_PLAYER_TURN',
      player: {
        ...prev.player,
        hand: [coringaVerde],
      },
      rally: {
        ...prev.rally,
        lastPlayedCard: defNeutra,
        requiredResponse: 'VOLEIOS',
        currentTurnPlayer: 'PLAYER',
        rallyLength: 1,
      },
    }));

    // Play wildcard without declaration -> opens WILDCARD_DECLARING
    useMatchStore.getState().playCard(coringaVerde.instanceId);
    expect(useMatchStore.getState().phase).toBe('WILDCARD_DECLARING');
    expect(useMatchStore.getState().rally.pendingWildcard?.allowedDeclarations).toEqual([
      'VOLEIO_PINGADA',
      'VOLEIO_ACELERADO',
      'VOLEIO_LOB',
    ]);

    // Declare VOLEIO_ACELERADO (which is an attack requiring DEFESAS)
    useMatchStore.getState().confirmWildcardDeclaration('VOLEIO_ACELERADO', fixedRng);

    const afterDecl = useMatchStore.getState();
    expect(afterDecl.phase).toBe('RALLY_AI_TURN');
    expect(afterDecl.rally.requiredResponse).toBe('DEFESAS');
    expect(afterDecl.rally.lastPlayedCard?.declaredAs).toBe('VOLEIO_ACELERADO');
  });

  it('handles Cavação (digging 1 to 2 cards) and awards point to AI on 2nd failure', () => {
    useMatchStore.getState().startMatch('MEDIUM', 'SHORT_SET_4');

    const smash1 = createCardInstance('SMASH', 'PLAYER', 0);
    const smash2 = createCardInstance('SMASH', 'PLAYER', 1);
    const defCurta = createCardInstance('DEF_CURTA', 'AI', 0);

    // Player needs BANDEJAS, has 0 valid cards in hand, and top 2 cards in greenDeck are SMASH
    useMatchStore.setState((prev) => ({
      phase: 'RALLY_PLAYER_TURN',
      player: {
        ...prev.player,
        hand: [],
        greenDeck: [smash1, smash2],
        digAttemptsThisTurn: 0,
      },
      rally: {
        ...prev.rally,
        lastPlayedCard: defCurta,
        requiredResponse: 'BANDEJAS',
        currentTurnPlayer: 'PLAYER',
        rallyLength: 1,
      },
    }));

    // Attempt 1 -> invalid, kept in hand, canDigAgain = true
    useMatchStore.getState().digCard();
    let st = useMatchStore.getState();
    expect(st.phase).toBe('RALLY_DIGGING');
    expect(st.activeDigResult?.attemptNumber).toBe(1);
    expect(st.activeDigResult?.canDigAgain).toBe(true);
    expect(st.player.hand).toHaveLength(1);

    // Attempt 2 -> invalid, pointLost = true
    useMatchStore.getState().digCard();
    st = useMatchStore.getState();
    expect(st.activeDigResult?.attemptNumber).toBe(2);
    expect(st.activeDigResult?.pointLost).toBe(true);
    expect(st.player.hand).toHaveLength(2);

    // Close modal -> AI scores point
    useMatchStore.getState().closeDigFailedModal();
    st = useMatchStore.getState();
    expect(st.phase).toBe('POINT_ENDED');
    expect(st.pointWinner).toBe('AI');
    expect(st.score.aiPoints).toBe(15);
  });

  it('completes an entire FAST_1_GAME match and transitions to MATCH_OVER', () => {
    const fixedRng = () => 0;
    useMatchStore.getState().startMatch('MEDIUM', 'FAST_1_GAME', fixedRng);

    // Win 4 points in a row (0 -> 15 -> 30 -> 40 -> Game/Match)
    for (let i = 0; i < 4; i++) {
      useMatchStore.getState().selectServeZone(3);
      useMatchStore.getState().confirmServeDuel(fixedRng);
      useMatchStore.getState().completeServeReveal(fixedRng);
      if (i < 3) {
        expect(useMatchStore.getState().phase).toBe('POINT_ENDED');
        useMatchStore.getState().startNextPoint(fixedRng);
      }
    }

    const finalState = useMatchStore.getState();
    expect(finalState.phase).toBe('MATCH_OVER');
    expect(finalState.score.matchWinner).toBe('PLAYER');
    expect(finalState.score.playerGames).toBe(1);
    expect(finalState.stats.acesPlayer).toBe(4);
  });
});
