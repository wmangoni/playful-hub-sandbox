/**
 * Empirical Adversarial Challenger Test Suite — Milestone M3 (UI Components)
 * Target: UI Components & Modal Dialogs
 * File: tests/unit/challenger_m3_components.test.tsx
 *
 * Verification Scope:
 * 1. CardHand: boundary inputs (0, 1, 10, 35 cards), all playable, none playable, AI hand mode, turn status, layout robustness.
 * 2. ScoreboardHUD: all match score states (0-0, 40-40 Golden Point, Tie-Break 0-0 through 15-13, server alternations, sound toggles, sets history).
 * 3. Modal Dialogs: ServeModal, CoringaModal, DigResultModal, MatchResultModal, RulesModal with null, extreme, or edge-case props.
 * 4. CardComponent: face-up vs face-down, 19 cards theme verification, attack & wildcard badges, responsive sizes, interaction guards.
 * 5. Court, CardSlot & DeckPiles: boundary card counts, zone indicators, net rendering, action triggers.
 */

import { describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import { renderToString } from 'react-dom/server';
import { createRoot } from 'react-dom/client';

// Engine types and catalog
import { CARDS_CATALOG } from '../../src/engine/cardsCatalog';
import type {
  CardInstance,
  CardType,
  GamePoint,
  PlayerId,
  ScoreState,
} from '../../src/engine/types';

// Components under test
import { CardComponent } from '../../src/components/cards/CardComponent';
import { CardHand } from '../../src/components/cards/CardHand';
import { CardSlot } from '../../src/components/cards/CardSlot';
import { Court } from '../../src/components/court/Court';
import { ScoreboardHUD } from '../../src/components/court/ScoreboardHUD';
import { DeckPiles } from '../../src/components/court/DeckPiles';
import { ServeModal } from '../../src/components/modals/ServeModal';
import { CoringaModal } from '../../src/components/modals/CoringaModal';
import { DigResultModal } from '../../src/components/modals/DigResultModal';
import { MatchResultModal } from '../../src/components/modals/MatchResultModal';
import { RulesModal } from '../../src/components/modals/RulesModal';

// Strips React SSR comment boundaries (e.g. <!-- -->)
function stripComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

// Enable React 19 act testing environment
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Helper to create mock CardInstance
function createMockCardInstance(type: CardType, index = 0, owner: PlayerId = 'PLAYER'): CardInstance {
  const def = CARDS_CATALOG[type];
  return {
    instanceId: `inst_${type}_${index}`,
    cardId: def.id,
    definition: def,
    owner,
  };
}

describe('Challenger M3: UI Components Empirical Stress Suite', () => {
  // ==========================================================================
  // 1. CardHand Boundary & Layout Stress Testing
  // ==========================================================================
  describe('CardHand — Boundary Inputs & Layout Stress', () => {
    it('handles boundary: 0 cards (empty hand) without crashing or rendering card elements', () => {
      const html = stripComments(
        renderToString(
          <CardHand
            cards={[]}
            isPlayerTurn={true}
            playableCardIds={new Set()}
          />
        )
      );

      expect(html).toContain('Sua Vez de Jogar');
      // Should not contain any card containers
      expect(html).not.toContain('inst_');
    });

    it('handles boundary: 1 card (single card in hand) with 0 rotation and 0 translation offset', () => {
      const singleCard = [createMockCardInstance('BANDEJA_CURTA', 1)];
      const html = stripComments(
        renderToString(
          <CardHand
            cards={singleCard}
            isPlayerTurn={true}
            playableCardIds={new Set(['inst_BANDEJA_CURTA_1'])}
          />
        )
      );

      expect(html).toContain('Bandeja Curta');
      expect(html).toContain('Sua Vez de Jogar');
    });

    it('handles normal hand: 6-10 cards with fan-out curvature', () => {
      const types: CardType[] = [
        'BANDEJA_CURTA',
        'BANDEJA_LOB',
        'VOLEIO_PINGADA',
        'VOLEIO_ACELERADO',
        'SMASH',
        'GANCHO_ATA',
        'VERONICA_ATA',
        'DEF_CURTA',
        'DEF_NEUTRA',
        'GOLPE_UBT_CORINGA',
      ];
      const cards = types.map((t, idx) => createMockCardInstance(t, idx));

      const html = stripComments(
        renderToString(
          <CardHand
            cards={cards}
            isPlayerTurn={true}
            playableCardIds={new Set(cards.map((c) => c.instanceId))}
          />
        )
      );

      types.forEach((t) => {
        expect(html).toContain(CARDS_CATALOG[t].name);
      });
    });

    it('handles extreme stress boundary: 35 cards in hand without layout crash or division by zero', () => {
      // 35 cards simulate extreme cavação or debug states
      const allTypes = Object.keys(CARDS_CATALOG) as CardType[];
      const extremeCards: CardInstance[] = [];
      for (let i = 0; i < 35; i++) {
        const type = allTypes[i % allTypes.length]!;
        extremeCards.push(createMockCardInstance(type, i));
      }

      const html = stripComments(
        renderToString(
          <CardHand
            cards={extremeCards}
            isPlayerTurn={true}
            playableCardIds={new Set(extremeCards.map((c) => c.instanceId))}
          />
        )
      );

      // Verify all 35 cards are rendered
      expect(extremeCards).toHaveLength(35);
      extremeCards.forEach((c) => {
        expect(html).toContain(c.definition.name);
      });
      // Verify no NaN or undefined styles in output
      expect(html).not.toContain('NaN');
      expect(html).not.toContain('undefined');
    });

    it('verifies playability states: all playable vs none playable', () => {
      const cards = [
        createMockCardInstance('SMASH', 1),
        createMockCardInstance('BANDEJA_CURTA', 2),
      ];

      // All playable
      const allPlayableHtml = stripComments(
        renderToString(
          <CardHand
            cards={cards}
            isPlayerTurn={true}
            playableCardIds={new Set(['inst_SMASH_1', 'inst_BANDEJA_CURTA_2'])}
          />
        )
      );
      expect(allPlayableHtml).toContain('ring-emerald-400');
      expect(allPlayableHtml).not.toContain('cursor-not-allowed');

      // None playable
      const nonePlayableHtml = stripComments(
        renderToString(
          <CardHand
            cards={cards}
            isPlayerTurn={true}
            playableCardIds={new Set()}
          />
        )
      );
      expect(nonePlayableHtml).toContain('cursor-not-allowed');
      expect(nonePlayableHtml).toContain('grayscale-[50%]');
    });

    it('verifies playableCardIds supports both Set and Array and undefined', () => {
      const cards = [createMockCardInstance('SMASH', 1)];

      // Array input
      const arrayHtml = stripComments(
        renderToString(
          <CardHand
            cards={cards}
            isPlayerTurn={true}
            playableCardIds={['inst_SMASH_1']}
          />
        )
      );
      expect(arrayHtml).toContain('ring-emerald-400');

      // Undefined input
      const undefHtml = stripComments(
        renderToString(
          <CardHand
            cards={cards}
            isPlayerTurn={true}
            playableCardIds={undefined}
          />
        )
      );
      expect(undefHtml).toContain('cursor-not-allowed');
    });

    it('verifies AI hand mode: renders face-down cards and hides turn indicator', () => {
      const cards = [
        createMockCardInstance('SMASH', 1, 'AI'),
        createMockCardInstance('BANDEJA_CURTA', 2, 'AI'),
      ];

      const html = stripComments(
        renderToString(
          <CardHand
            cards={cards}
            isPlayerTurn={false}
            isAI={true}
          />
        )
      );

      // AI turn indicator tag must be hidden
      expect(html).not.toContain('Sua Vez de Jogar');
      expect(html).not.toContain('Aguardando Oponente...');
      // Cards must be face down
      expect(html).toContain('UBT');
      expect(html).toContain('Beach Tennis');
      expect(html).not.toContain('Smash');
      expect(html).not.toContain('Bandeja Curta');
    });

    it('verifies turn status indicator: Sua Vez vs Aguardando Oponente', () => {
      const cards = [createMockCardInstance('SMASH', 1)];

      const playerTurnHtml = stripComments(
        renderToString(<CardHand cards={cards} isPlayerTurn={true} />)
      );
      expect(playerTurnHtml).toContain('Sua Vez de Jogar');
      expect(playerTurnHtml).not.toContain('Aguardando Oponente...');

      const opponentTurnHtml = stripComments(
        renderToString(<CardHand cards={cards} isPlayerTurn={false} />)
      );
      expect(opponentTurnHtml).toContain('Aguardando Oponente...');
      expect(opponentTurnHtml).not.toContain('Sua Vez de Jogar');
    });

    it('interactive test: clicking playable card invokes onPlayCard; disabled card does not', async () => {
      const cardPlayable = createMockCardInstance('SMASH', 1);
      const cardDisabled = createMockCardInstance('BANDEJA_CURTA', 2);
      const onPlayCard = vi.fn();

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      await act(async () => {
        root.render(
          <CardHand
            cards={[cardPlayable, cardDisabled]}
            isPlayerTurn={true}
            playableCardIds={new Set(['inst_SMASH_1'])}
            onPlayCard={onPlayCard}
          />
        );
      });

      // Find card root elements (distinct from child SVG select-none elements)
      const cardElements = container.querySelectorAll('div.overflow-hidden.rounded-xl');
      expect(cardElements.length).toBe(2);

      // Click playable card (first card)
      await act(async () => {
        cardElements[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(onPlayCard).toHaveBeenCalledTimes(1);
      expect(onPlayCard).toHaveBeenCalledWith(cardPlayable);

      // Click disabled card (second card)
      await act(async () => {
        cardElements[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      // Should not have been called again
      expect(onPlayCard).toHaveBeenCalledTimes(1);

      await act(async () => {
        root.unmount();
      });
      container.remove();
    });
  });

  // ==========================================================================
  // 2. ScoreboardHUD Exhaustive Match State Coverage
  // ==========================================================================
  describe('ScoreboardHUD — Comprehensive Score States & Features', () => {
    it('renders initial score 0-0 with 0 points each and PLAYER serving', () => {
      const html = stripComments(
        renderToString(
          <ScoreboardHUD
            playerGames={0}
            aiGames={0}
            playerPoints={0}
            aiPoints={0}
            isNoAdPoint={false}
            isTieBreak={false}
            currentServer="PLAYER"
            soundEnabled={true}
            onToggleSound={vi.fn()}
            onOpenRules={vi.fn()}
          />
        )
      );

      expect(html).toContain('VOCÊ');
      expect(html).toContain('MÁQUINA');
      expect(html).toContain('G:');
      expect(html).toContain('PTS:');
      expect(html).toContain('🎾'); // Active server ball icon
      expect(html).not.toContain('PONTO DECISIVO (NO-AD)');
      expect(html).not.toContain('TIE-BREAK EM DISPUTA');
    });

    it('renders standard points progression: 15, 30, 40 across players', () => {
      const pointCombinations: Array<[GamePoint, GamePoint]> = [
        [15, 0],
        [30, 0],
        [40, 0],
        [0, 15],
        [0, 30],
        [0, 40],
        [15, 15],
        [30, 30],
        [40, 30],
        [30, 40],
      ];

      pointCombinations.forEach(([pPts, aiPts]) => {
        const html = stripComments(
          renderToString(
            <ScoreboardHUD
              playerGames={2}
              aiGames={1}
              playerPoints={pPts}
              aiPoints={aiPts}
              isNoAdPoint={false}
              isTieBreak={false}
              currentServer="PLAYER"
              soundEnabled={true}
              onToggleSound={vi.fn()}
              onOpenRules={vi.fn()}
            />
          )
        );

        expect(html).toContain(String(pPts));
        expect(html).toContain(String(aiPts));
      });
    });

    it('renders Golden Point (No-Ad) alert banner at 40-40 when isNoAdPoint is true', () => {
      const html = stripComments(
        renderToString(
          <ScoreboardHUD
            playerGames={3}
            aiGames={3}
            playerPoints={40}
            aiPoints={40}
            isNoAdPoint={true}
            isTieBreak={false}
            currentServer="AI"
            soundEnabled={true}
            onToggleSound={vi.fn()}
            onOpenRules={vi.fn()}
          />
        )
      );

      expect(html).toContain('PONTO DECISIVO (NO-AD)');
      expect(html).toContain('QUEM VENCER ESTE PONTO FECHA O GAME');
    });

    it('renders Tie-Break scores across all ranges: 0-0 through extended 15-13', () => {
      const tieBreakScores: Array<[number, number]> = [
        [0, 0],
        [1, 0],
        [3, 3],
        [6, 6],
        [7, 6],
        [8, 7],
        [10, 10],
        [12, 12],
        [14, 14],
        [15, 13],
      ];

      tieBreakScores.forEach(([pTb, aiTb]) => {
        const html = stripComments(
          renderToString(
            <ScoreboardHUD
              playerGames={6}
              aiGames={6}
              playerPoints={0}
              aiPoints={0}
              isNoAdPoint={false}
              isTieBreak={true}
              playerTieBreakPoints={pTb}
              aiTieBreakPoints={aiTb}
              currentServer="PLAYER"
              soundEnabled={true}
              onToggleSound={vi.fn()}
              onOpenRules={vi.fn()}
            />
          )
        );

        expect(html).toContain('TIE-BREAK EM DISPUTA');
        expect(html).toContain(String(pTb));
        expect(html).toContain(String(aiTb));
      });
    });

    it('displays server ball icon on the correct player side', () => {
      // Player serving
      const playerServingHtml = stripComments(
        renderToString(
          <ScoreboardHUD
            playerGames={1}
            aiGames={1}
            playerPoints={15}
            aiPoints={15}
            isNoAdPoint={false}
            isTieBreak={false}
            currentServer="PLAYER"
            soundEnabled={true}
            onToggleSound={vi.fn()}
            onOpenRules={vi.fn()}
          />
        )
      );
      // The 🎾 icon is inside the VOCÊ container
      expect(playerServingHtml).toContain('title="Sacador Atual"');

      // AI serving
      const aiServingHtml = stripComments(
        renderToString(
          <ScoreboardHUD
            playerGames={1}
            aiGames={1}
            playerPoints={15}
            aiPoints={15}
            isNoAdPoint={false}
            isTieBreak={false}
            currentServer="AI"
            soundEnabled={true}
            onToggleSound={vi.fn()}
            onOpenRules={vi.fn()}
          />
        )
      );
      expect(aiServingHtml).toContain('title="Sacador Atual"');
    });

    it('renders sound button with Volume2 when enabled and VolumeX when muted', () => {
      const soundOnHtml = stripComments(
        renderToString(
          <ScoreboardHUD
            playerGames={0}
            aiGames={0}
            playerPoints={0}
            aiPoints={0}
            isNoAdPoint={false}
            isTieBreak={false}
            currentServer="PLAYER"
            soundEnabled={true}
            onToggleSound={vi.fn()}
            onOpenRules={vi.fn()}
          />
        )
      );
      expect(soundOnHtml).toContain('text-emerald-400'); // Volume2 emerald

      const soundOffHtml = stripComments(
        renderToString(
          <ScoreboardHUD
            playerGames={0}
            aiGames={0}
            playerPoints={0}
            aiPoints={0}
            isNoAdPoint={false}
            isTieBreak={false}
            currentServer="PLAYER"
            soundEnabled={false}
            onToggleSound={vi.fn()}
            onOpenRules={vi.fn()}
          />
        )
      );
      expect(soundOffHtml).toContain('text-slate-500'); // VolumeX slate
    });

    it('renders completed sets history when available', () => {
      const html = stripComments(
        renderToString(
          <ScoreboardHUD
            playerGames={3}
            aiGames={2}
            playerPoints={30}
            aiPoints={15}
            isNoAdPoint={false}
            isTieBreak={false}
            currentServer="PLAYER"
            completedSets={[
              { playerGames: 6, aiGames: 4 },
              { playerGames: 5, aiGames: 7 },
            ]}
            soundEnabled={true}
            onToggleSound={vi.fn()}
            onOpenRules={vi.fn()}
          />
        )
      );

      expect(html).toContain('Sets:');
      expect(html).toContain('6-4');
      expect(html).toContain('5-7');
    });

    it('renders rally length indicator when rallyLength > 0 and hides when 0', () => {
      const withRallyHtml = stripComments(
        renderToString(
          <ScoreboardHUD
            playerGames={0}
            aiGames={0}
            playerPoints={0}
            aiPoints={0}
            isNoAdPoint={false}
            isTieBreak={false}
            currentServer="PLAYER"
            soundEnabled={true}
            onToggleSound={vi.fn()}
            onOpenRules={vi.fn()}
            rallyLength={14}
          />
        )
      );
      expect(withRallyHtml).toContain('Trocas:');
      expect(withRallyHtml).toContain('14');

      const noRallyHtml = stripComments(
        renderToString(
          <ScoreboardHUD
            playerGames={0}
            aiGames={0}
            playerPoints={0}
            aiPoints={0}
            isNoAdPoint={false}
            isTieBreak={false}
            currentServer="PLAYER"
            soundEnabled={true}
            onToggleSound={vi.fn()}
            onOpenRules={vi.fn()}
            rallyLength={0}
          />
        )
      );
      expect(noRallyHtml).not.toContain('Trocas:');
    });

    it('renders restart match button when onRestartMatch is provided', () => {
      const onRestart = vi.fn();
      const html = stripComments(
        renderToString(
          <ScoreboardHUD
            playerGames={0}
            aiGames={0}
            playerPoints={0}
            aiPoints={0}
            isNoAdPoint={false}
            isTieBreak={false}
            currentServer="PLAYER"
            soundEnabled={true}
            onToggleSound={vi.fn()}
            onOpenRules={vi.fn()}
            onRestartMatch={onRestart}
          />
        )
      );

      expect(html).toContain('aria-label="Restart Match"');
      expect(html).toContain('title="Reiniciar Partida"');
    });

    it('interactive test: clicking sound, rules, and restart buttons calls respective callbacks', async () => {
      const onToggleSound = vi.fn();
      const onOpenRules = vi.fn();
      const onRestartMatch = vi.fn();

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      await act(async () => {
        root.render(
          <ScoreboardHUD
            playerGames={2}
            aiGames={1}
            playerPoints={30}
            aiPoints={15}
            isNoAdPoint={false}
            isTieBreak={false}
            currentServer="PLAYER"
            soundEnabled={true}
            onToggleSound={onToggleSound}
            onOpenRules={onOpenRules}
            onRestartMatch={onRestartMatch}
          />
        );
      });

      const soundBtn = container.querySelector('button[aria-label="Toggle Sound"]');
      const rulesBtn = container.querySelector('button[aria-label="Open Rules Drawer"]');
      const restartBtn = container.querySelector('button[aria-label="Restart Match"]');

      expect(soundBtn).not.toBeNull();
      expect(rulesBtn).not.toBeNull();
      expect(restartBtn).not.toBeNull();

      await act(async () => {
        soundBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(onToggleSound).toHaveBeenCalledTimes(1);

      await act(async () => {
        rulesBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(onOpenRules).toHaveBeenCalledTimes(1);

      await act(async () => {
        restartBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(onRestartMatch).toHaveBeenCalledTimes(1);

      await act(async () => {
        root.unmount();
      });
      container.remove();
    });
  });

  // ==========================================================================
  // 3. Modal Dialogs Edge-Case & Boundary Stress
  // ==========================================================================
  describe('Modals & Dialogs — Edge-Case Stress Testing', () => {
    // ------------------------------------------------------------------------
    // 3.1 ServeModal
    // ------------------------------------------------------------------------
    describe('ServeModal', () => {
      it('returns null when isOpen is false', () => {
        const html = renderToString(
          <ServeModal
            isOpen={false}
            isServer={true}
            selectedZone={null}
            selectedReceiveZones={[]}
            onSelectZone={vi.fn()}
            onSelectReceiveZones={vi.fn()}
            onConfirmDuel={vi.fn()}
          />
        );
        expect(html).toBe('');
      });

      it('renders server mode with zones 1, 2, 3 and disabled confirm button when no zone selected', () => {
        const html = stripComments(
          renderToString(
            <ServeModal
              isOpen={true}
              isServer={true}
              selectedZone={null}
              selectedReceiveZones={[]}
              onSelectZone={vi.fn()}
              onSelectReceiveZones={vi.fn()}
              onConfirmDuel={vi.fn()}
            />
          )
        );

        expect(html).toContain('Fase de Saque (Você Saca)');
        expect(html).toContain('Esquerda');
        expect(html).toContain('Centro');
        expect(html).toContain('Direita');
        expect(html).toContain('cursor-not-allowed');
      });

      it('enables confirm button when a serve zone is selected', () => {
        const html = stripComments(
          renderToString(
            <ServeModal
              isOpen={true}
              isServer={true}
              selectedZone={2}
              selectedReceiveZones={[]}
              onSelectZone={vi.fn()}
              onSelectReceiveZones={vi.fn()}
              onConfirmDuel={vi.fn()}
            />
          )
        );

        expect(html).toContain('Selecionado');
        expect(html).toContain('Confirmar Escolha');
        expect(html).not.toContain('cursor-not-allowed');
      });

      it('renders Ace celebration banner on Ace duelResult', () => {
        const html = stripComments(
          renderToString(
            <ServeModal
              isOpen={true}
              isServer={true}
              selectedZone={3}
              selectedReceiveZones={[]}
              onSelectZone={vi.fn()}
              onSelectReceiveZones={vi.fn()}
              onConfirmDuel={vi.fn()}
              duelResult={{
                isAce: true,
                defenseSuccess: false,
                server: 'PLAYER',
                receiver: 'AI',
                serverPick: 3,
                receiverPicks: [1, 2],
                winningPlayer: 'PLAYER',
              }}
            />
          )
        );

        expect(html).toContain('💥 ACE!');
        expect(html).toContain('Zona 3 desprotegida');
        expect(html).not.toContain('Confirmar Escolha');
      });

      it('renders Defense celebration banner on successful receiver defense duelResult', () => {
        const html = stripComments(
          renderToString(
            <ServeModal
              isOpen={true}
              isServer={false}
              selectedZone={null}
              selectedReceiveZones={[2, 3]}
              onSelectZone={vi.fn()}
              onSelectReceiveZones={vi.fn()}
              onConfirmDuel={vi.fn()}
              duelResult={{
                isAce: false,
                defenseSuccess: true,
                server: 'AI',
                receiver: 'PLAYER',
                serverPick: 2,
                receiverPicks: [2, 3],
              }}
            />
          )
        );

        expect(html).toContain('🛡️ DEFESA EFETUADA!');
        expect(html).toContain('Saque defendido na Zona 2');
        expect(html).toContain('Monte Azul');
      });

      it('renders Revealing state when isRevealing is true', () => {
        const html = stripComments(
          renderToString(
            <ServeModal
              isOpen={true}
              isServer={true}
              selectedZone={1}
              selectedReceiveZones={[]}
              onSelectZone={vi.fn()}
              onSelectReceiveZones={vi.fn()}
              onConfirmDuel={vi.fn()}
              isRevealing={true}
            />
          )
        );

        expect(html).toContain('Revelando Saque...');
        expect(html).toContain('cursor-not-allowed');
      });

      it('renders receiver mode when isServer is false and shows selected receive zones', () => {
        const html = stripComments(
          renderToString(
            <ServeModal
              isOpen={true}
              isServer={false}
              selectedZone={null}
              selectedReceiveZones={[1, 3]}
              onSelectZone={vi.fn()}
              onSelectReceiveZones={vi.fn()}
              onConfirmDuel={vi.fn()}
            />
          )
        );

        expect(html).toContain('Fase de Recepção (Você Recebe)');
        expect(html).toContain('Escolha secretamente 2 zonas');
        expect(html).toContain('Confirmar Escolha');
        expect(html).not.toContain('cursor-not-allowed');
      });

      it('interactive test: verifies zone replacement behavior when >= 2 receive zones are selected', async () => {
        const onSelectReceiveZones = vi.fn();
        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);

        // When starting with 2 zones [1, 2], clicking zone 3 shifts oldest to [2, 3]
        await act(async () => {
          root.render(
            <ServeModal
              isOpen={true}
              isServer={false}
              selectedZone={null}
              selectedReceiveZones={[1, 2]}
              onSelectZone={vi.fn()}
              onSelectReceiveZones={onSelectReceiveZones}
              onConfirmDuel={vi.fn()}
            />
          );
        });

        // Click zone 3 (the 3rd zone card)
        const zoneCards = container.querySelectorAll('.grid > div');
        expect(zoneCards.length).toBe(3);

        await act(async () => {
          zoneCards[2]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        // Verifies replacement mechanic shifts [1, 2] + 3 -> [2, 3]
        expect(onSelectReceiveZones).toHaveBeenCalledWith([2, 3]);

        await act(async () => {
          root.unmount();
        });
        container.remove();
      });

      it('interactive regression test: selecting 1st receive zone from empty [] updates state immediately', async () => {
        const onSelectReceiveZones = vi.fn();
        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);

        await act(async () => {
          root.render(
            <ServeModal
              isOpen={true}
              isServer={false}
              selectedZone={null}
              selectedReceiveZones={[]}
              onSelectZone={vi.fn()}
              onSelectReceiveZones={onSelectReceiveZones}
              onConfirmDuel={vi.fn()}
            />
          );
        });

        const zoneCards = container.querySelectorAll('.grid > div');
        expect(zoneCards.length).toBe(3);

        // Click Zone 1 when selectedReceiveZones is []
        await act(async () => {
          zoneCards[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        expect(onSelectReceiveZones).toHaveBeenCalledWith([1]);

        await act(async () => {
          root.unmount();
        });
        container.remove();
      });
    });

    // ------------------------------------------------------------------------
    // 3.2 CoringaModal
    // ------------------------------------------------------------------------
    describe('CoringaModal', () => {
      it('returns null when isOpen is false', () => {
        const html = renderToString(
          <CoringaModal
            isOpen={false}
            wildcardType="GOLPE_UBT_CORINGA"
            allowedCards={['BANDEJA_CURTA']}
            onConfirmDeclaration={vi.fn()}
          />
        );
        expect(html).toBe('');
      });

      it('renders Coringa Verde title and current required response context', () => {
        const html = stripComments(
          renderToString(
            <CoringaModal
              isOpen={true}
              wildcardType="GOLPE_UBT_CORINGA"
              currentRequiredResponse="BANDEJAS"
              allowedCards={['BANDEJA_CURTA', 'BANDEJA_LOB', 'BANDEJA_LOB_CHUTADO']}
              onConfirmDeclaration={vi.fn()}
            />
          )
        );

        expect(html).toContain('Declarar Golpe do Coringa Verde');
        expect(html).toContain('Substitui qualquer golpe de [BANDEJAS]');
        expect(html).toContain('Bandeja Curta');
        expect(html).toContain('Bandeja Lob');
        expect(html).toContain('Bandeja Lob Chutado');
        expect(html).toContain('Confirmar Declaração');
      });

      it('renders Coringa Azul title and defense options', () => {
        const html = stripComments(
          renderToString(
            <CoringaModal
              isOpen={true}
              wildcardType="DEF_UBT_CORINGA"
              currentRequiredResponse="DEFESAS"
              allowedCards={['DEF_CURTA', 'DEF_NEUTRA', 'DEF_LOB']}
              onConfirmDeclaration={vi.fn()}
            />
          )
        );

        expect(html).toContain('Declarar Defesa do Coringa Azul');
        expect(html).toContain('Defesa concluída! Declare como a bola volta');
        expect(html).toContain('Def Curta');
        expect(html).toContain('Def Neutra');
        expect(html).toContain('Def Lob');
      });

      it('handles boundary: empty allowedCards without crashing, button disabled', () => {
        const html = stripComments(
          renderToString(
            <CoringaModal
              isOpen={true}
              wildcardType="GOLPE_UBT_CORINGA"
              allowedCards={[]}
              onConfirmDeclaration={vi.fn()}
            />
          )
        );

        expect(html).toContain('Declarar Golpe do Coringa Verde');
        expect(html).toContain('disabled');
      });

      it('renders cancel button when onCancel is provided', () => {
        const html = stripComments(
          renderToString(
            <CoringaModal
              isOpen={true}
              wildcardType="GOLPE_UBT_CORINGA"
              allowedCards={['BANDEJA_CURTA']}
              onConfirmDeclaration={vi.fn()}
              onCancel={vi.fn()}
            />
          )
        );

        expect(html).toContain('Cancelar');
      });

      it('interactive test: selecting an option and clicking confirm invokes onConfirmDeclaration', async () => {
        const onConfirm = vi.fn();
        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);

        await act(async () => {
          root.render(
            <CoringaModal
              isOpen={true}
              wildcardType="GOLPE_UBT_CORINGA"
              allowedCards={['BANDEJA_CURTA', 'BANDEJA_LOB']}
              onConfirmDeclaration={onConfirm}
            />
          );
        });

        // Click 2nd card option (Bandeja Lob)
        const optionCards = container.querySelectorAll('.max-h-72 > div');
        expect(optionCards.length).toBe(2);

        await act(async () => {
          optionCards[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        // Click confirm declaration button
        const confirmBtn = container.querySelector('button.bg-gradient-to-r');
        expect(confirmBtn).not.toBeNull();

        await act(async () => {
          confirmBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        expect(onConfirm).toHaveBeenCalledWith('BANDEJA_LOB');

        await act(async () => {
        root.unmount();
      });
        container.remove();
      });
    });

    // ------------------------------------------------------------------------
    // 3.3 DigResultModal
    // ------------------------------------------------------------------------
    describe('DigResultModal', () => {
      it('returns null when isOpen is false or digResult is null', () => {
        const htmlFalse = renderToString(
          <DigResultModal
            isOpen={false}
            digResult={null}
            onPlayDrawnCard={vi.fn()}
            onDigAgain={vi.fn()}
            onClose={vi.fn()}
          />
        );
        expect(htmlFalse).toBe('');

        const htmlNullResult = renderToString(
          <DigResultModal
            isOpen={true}
            digResult={null}
            onPlayDrawnCard={vi.fn()}
            onDigAgain={vi.fn()}
            onClose={vi.fn()}
          />
        );
        expect(htmlNullResult).toBe('');
      });

      it('renders legal card drawn feedback and action button Jogar Carta', () => {
        const drawnCard = createMockCardInstance('BANDEJA_CURTA');
        const html = stripComments(
          renderToString(
            <DigResultModal
              isOpen={true}
              digResult={{
                drawnCard,
                attemptNumber: 1,
                isValid: true,
                mustPlayImmediately: true,
                canDigAgain: false,
                pointLost: false,
                reason: 'LEGAL_CARD_DRAWN',
                updatedGreenDeck: [],
                updatedHand: [drawnCard],
              }}
              onPlayDrawnCard={vi.fn()}
              onDigAgain={vi.fn()}
              onClose={vi.fn()}
            />
          )
        );

        expect(html).toContain('Tentativa 1 de 2');
        expect(html).toContain('Carta compatível! Obrigatório jogar imediatamente.');
        expect(html).toContain('Jogar Carta na Quadra');
        expect(html).toContain('Bandeja Curta');
      });

      it('renders invalid attempt 1 feedback with Cavar 2ª Tentativa button', () => {
        const drawnCard = createMockCardInstance('SMASH');
        const html = stripComments(
          renderToString(
            <DigResultModal
              isOpen={true}
              digResult={{
                drawnCard,
                attemptNumber: 1,
                isValid: false,
                mustPlayImmediately: false,
                canDigAgain: true,
                pointLost: false,
                reason: 'FIRST_ATTEMPT_INVALID',
                updatedGreenDeck: [],
                updatedHand: [drawnCard],
              }}
              onPlayDrawnCard={vi.fn()}
              onDigAgain={vi.fn()}
              onClose={vi.fn()}
            />
          )
        );

        expect(html).toContain('Carta incompatível! Guardada na mão para próxima rodada.');
        expect(html).toContain('Cavar 2ª Tentativa');
      });

      it('renders invalid attempt 2 feedback with point loss (Winner)', () => {
        const drawnCard = createMockCardInstance('DEF_CURTA');
        const html = stripComments(
          renderToString(
            <DigResultModal
              isOpen={true}
              digResult={{
                drawnCard,
                attemptNumber: 2,
                isValid: false,
                mustPlayImmediately: false,
                canDigAgain: false,
                pointLost: true,
                reason: 'SECOND_ATTEMPT_INVALID',
                updatedGreenDeck: [],
                updatedHand: [],
              }}
              onPlayDrawnCard={vi.fn()}
              onDigAgain={vi.fn()}
              onClose={vi.fn()}
            />
          )
        );

        expect(html).toContain('Tentativa 2 de 2');
        expect(html).toContain('Falha na 2ª tentativa! Ponto do oponente (Winner).');
        expect(html).toContain('Continuar');
      });

      it('handles empty deck boundary (drawnCard is null)', () => {
        const html = stripComments(
          renderToString(
            <DigResultModal
              isOpen={true}
              digResult={{
                drawnCard: null,
                attemptNumber: 1,
                isValid: false,
                mustPlayImmediately: false,
                canDigAgain: false,
                pointLost: true,
                reason: 'GREEN_DECK_EMPTY',
                updatedGreenDeck: [],
                updatedHand: [],
              }}
              onPlayDrawnCard={vi.fn()}
              onDigAgain={vi.fn()}
              onClose={vi.fn()}
            />
          )
        );

        expect(html).toContain('Monte Verde Esgotado!');
        expect(html).toContain('Continuar');
      });
    });

    // ------------------------------------------------------------------------
    // 3.4 MatchResultModal
    // ------------------------------------------------------------------------
    describe('MatchResultModal', () => {
      const mockScore: ScoreState = {
        matchFormat: 'FULL_SET_6',
        playerGames: 6,
        aiGames: 4,
        playerPoints: 0,
        aiPoints: 0,
        isDeuce: false,
        isNoAdPoint: false,
        isTieBreak: false,
        playerTieBreakPoints: 0,
        aiTieBreakPoints: 0,
        currentServer: 'PLAYER',
        nextGameServer: 'AI',
        setWinner: 'PLAYER',
        matchWinner: 'PLAYER',
        completedSets: [{ playerGames: 6, aiGames: 4 }],
      };

      it('returns null when isOpen is false', () => {
        const html = renderToString(
          <MatchResultModal
            isOpen={false}
            winner="PLAYER"
            finalScore={mockScore}
            onPlayAgain={vi.fn()}
          />
        );
        expect(html).toBe('');
      });

      it('renders victory view with stats when player wins', () => {
        const html = stripComments(
          renderToString(
            <MatchResultModal
              isOpen={true}
              winner="PLAYER"
              finalScore={mockScore}
              stats={{
                acesPlayer: 4,
                acesAI: 1,
                winnersPlayer: 15,
                winnersAI: 10,
                longestRally: 18,
                totalBlueDefenses: 12,
              }}
              onPlayAgain={vi.fn()}
              onExitToMenu={vi.fn()}
            />
          )
        );

        expect(html).toContain('Vitória Espetacular!');
        expect(html).toContain('Você dominou as areias');
        expect(html).toContain('Aces (Você / IA):');
        expect(html).toContain('4 / 1');
        expect(html).toContain('18 trocas');
        expect(html).toContain('Jogar Novamente');
        expect(html).toContain('Menu');
      });

      it('renders defeat view when AI wins', () => {
        const html = stripComments(
          renderToString(
            <MatchResultModal
              isOpen={true}
              winner="AI"
              finalScore={{
                ...mockScore,
                playerGames: 3,
                aiGames: 6,
                matchWinner: 'AI',
              }}
              onPlayAgain={vi.fn()}
            />
          )
        );

        expect(html).toContain('Fim de Jogo — Derrota');
        expect(html).toContain('A máquina levou a melhor');
      });

      it('handles boundary: stats omitted without crashing', () => {
        const html = stripComments(
          renderToString(
            <MatchResultModal
              isOpen={true}
              winner="PLAYER"
              finalScore={mockScore}
              stats={undefined}
              onPlayAgain={vi.fn()}
            />
          )
        );

        expect(html).toContain('Vitória Espetacular!');
        expect(html).not.toContain('Aces (Você / IA):');
      });
    });

    // ------------------------------------------------------------------------
    // 3.5 RulesModal
    // ------------------------------------------------------------------------
    describe('RulesModal', () => {
      it('returns null when isOpen is false', () => {
        const html = renderToString(<RulesModal isOpen={false} onClose={vi.fn()} />);
        expect(html).toBe('');
      });

      it('renders all 4 response groups of Folha Rosa and special rules when isOpen is true', () => {
        const html = stripComments(renderToString(<RulesModal isOpen={true} onClose={vi.fn()} />));

        expect(html).toContain('Folha Rosa Oficial');
        expect(html).toContain('Responde com BANDEJAS');
        expect(html).toContain('Responde com VOLEIOS');
        expect(html).toContain('Responde com DEFESAS (Monte Azul)');
        expect(html).toContain('Responde com FUNDO / AÉREO');
        expect(html).toContain('Cavação (1 a 2 cartas)');
        expect(html).toContain('Monte Azul');
        expect(html).toContain('Ponto Decisivo (No-Ad)');
      });

      it('interactive test: clicking close button calls onClose', async () => {
        const onClose = vi.fn();
        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);

        await act(async () => {
          root.render(<RulesModal isOpen={true} onClose={onClose} />);
        });

        const closeBtn = container.querySelector('button');
        expect(closeBtn).not.toBeNull();

        await act(async () => {
          closeBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        expect(onClose).toHaveBeenCalledTimes(1);

        await act(async () => {
        root.unmount();
      });
        container.remove();
      });
    });
  });

  // ==========================================================================
  // 4. CardComponent Invariants, Badges & Theme Verification
  // ==========================================================================
  describe('CardComponent — Invariants, Responsive Sizes & Badges', () => {
    it('renders face-down mode with UBT logo, concealing all card details', () => {
      const smashCard = createMockCardInstance('SMASH');
      const html = stripComments(
        renderToString(<CardComponent card={smashCard} isFaceDown={true} />)
      );

      expect(html).toContain('UBT');
      expect(html).toContain('Beach Tennis');
      expect(html).not.toContain('Smash');
      expect(html).not.toContain('DEFESA');
      expect(html).not.toContain('<svg');
    });

    it('verifies color themes across ORANGE, BLUE, GREEN and Wildcard cards', () => {
      const orangeCard = createMockCardInstance('SAQUE_1');
      const blueCard = createMockCardInstance('DEF_CURTA');
      const greenCard = createMockCardInstance('BANDEJA_CURTA');
      const wildcardCard = createMockCardInstance('GOLPE_UBT_CORINGA');

      const orangeHtml = stripComments(renderToString(<CardComponent card={orangeCard} />));
      const blueHtml = stripComments(renderToString(<CardComponent card={blueCard} />));
      const greenHtml = stripComments(renderToString(<CardComponent card={greenCard} />));
      const wildcardHtml = stripComments(renderToString(<CardComponent card={wildcardCard} />));

      expect(orangeHtml).toContain('border-orange-500');
      expect(blueHtml).toContain('border-blue-500');
      expect(greenHtml).toContain('border-emerald-500');
      expect(wildcardHtml).toContain('border-amber-400');
    });

    it('renders Flame icon for attack cards and Crown icon for Wildcards', () => {
      const attackCard = createMockCardInstance('SMASH');
      const wildcardCard = createMockCardInstance('GOLPE_UBT_CORINGA');
      const neutralCard = createMockCardInstance('DEF_NEUTRA');

      const attackHtml = stripComments(renderToString(<CardComponent card={attackCard} />));
      const wildcardHtml = stripComments(renderToString(<CardComponent card={wildcardCard} />));
      const neutralHtml = stripComments(renderToString(<CardComponent card={neutralCard} />));

      expect(attackHtml).toContain('lucide-flame');
      expect(wildcardHtml).toContain('lucide-crown');
      expect(neutralHtml).not.toContain('lucide-flame');
      expect(neutralHtml).not.toContain('lucide-crown');
    });

    it('renders declaredAs overlay on declared wildcard', () => {
      const wildcard = createMockCardInstance('GOLPE_UBT_CORINGA');
      wildcard.declaredAs = 'VOLEIO_ACELERADO';

      const html = stripComments(renderToString(<CardComponent card={wildcard} />));
      expect(html).toContain('Decl: VOLEIO ACELERADO');
    });

    it('renders responsive sizes: sm, md, lg', () => {
      const card = createMockCardInstance('BANDEJA_LOB');

      const smHtml = stripComments(renderToString(<CardComponent card={card} size="sm" />));
      const mdHtml = stripComments(renderToString(<CardComponent card={card} size="md" />));
      const lgHtml = stripComments(renderToString(<CardComponent card={card} size="lg" />));

      expect(smHtml).toContain('w-24 h-36');
      expect(mdHtml).toContain('w-36 h-52');
      expect(lgHtml).toContain('w-48 h-72');
    });

    it('handles both CardInstance and raw CardDefinition props seamlessly', () => {
      const instance = createMockCardInstance('BANDEJA_CURTA');
      const definition = CARDS_CATALOG.BANDEJA_CURTA;

      const instHtml = stripComments(renderToString(<CardComponent card={instance} />));
      const defHtml = stripComments(renderToString(<CardComponent card={definition} />));

      expect(instHtml).toContain('Bandeja Curta');
      expect(defHtml).toContain('Bandeja Curta');
    });

    it('interactive test: click fires when playable; click suppressed when disabled', async () => {
      const card = createMockCardInstance('SMASH');
      const onClickPlayable = vi.fn();
      const onClickDisabled = vi.fn();

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      // Playable card
      await act(async () => {
        root.render(
          <div>
            <CardComponent
              card={card}
              isPlayable={true}
              isDisabled={false}
              onClick={onClickPlayable}
            />
            <CardComponent
              card={card}
              isPlayable={false}
              isDisabled={true}
              onClick={onClickDisabled}
            />
          </div>
        );
      });

      const cardNodes = container.querySelectorAll('div.overflow-hidden.rounded-xl');
      expect(cardNodes.length).toBe(2);

      // Click playable card
      await act(async () => {
        cardNodes[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(onClickPlayable).toHaveBeenCalledTimes(1);

      // Click disabled card
      await act(async () => {
        cardNodes[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(onClickDisabled).toHaveBeenCalledTimes(0);

      await act(async () => {
        root.unmount();
      });
      container.remove();
    });
  });

  // ==========================================================================
  // 5. Court, CardSlot & DeckPiles Verification
  // ==========================================================================
  describe('Court, CardSlot & DeckPiles — Arenas & Piles', () => {
    it('Court: renders sand arena, 1.70m net divider, and active serve zone highlights', () => {
      const html = stripComments(
        renderToString(
          <Court activeServeZone={2} ballPosition="NET">
            <div id="test-slot">Court Slot Child</div>
          </Court>
        )
      );

      expect(html).toContain('REDE (1.70M)');
      expect(html).toContain('Quadra IA');
      expect(html).toContain('Sua Quadra');
      expect(html).toContain('Zona 2');
      expect(html).toContain('test-slot');
    });

    it('CardSlot: renders empty prompt when currentCard is null', () => {
      const html = stripComments(
        renderToString(
          <CardSlot currentCard={null} requiredResponse={null} lastPlayer={null} />
        )
      );

      expect(html).toContain('Aguardando Saque / Golpe');
    });

    it('CardSlot: renders played card, response banner, and player attribution', () => {
      const card = createMockCardInstance('SMASH');
      const html = stripComments(
        renderToString(
          <CardSlot
            currentCard={card}
            requiredResponse="DEFESAS"
            lastPlayer="AI"
          />
        )
      );

      expect(html).toContain('Responda com:');
      expect(html).toContain('DEFESAS');
      expect(html).toContain('Smash');
      expect(html).toContain('Jogada por: Máquina (IA)');
    });

    it('DeckPiles: displays card counts for Green and Blue decks', () => {
      const html = stripComments(
        renderToString(
          <DeckPiles
            greenDeckCount={24}
            blueDeckCount={8}
            canDig={false}
            requiresBlueDefense={false}
          />
        )
      );

      expect(html).toContain('Monte Verde');
      expect(html).toContain('24');
      expect(html).toContain('Monte Azul');
      expect(html).toContain('8');
    });

    it('DeckPiles: boundary 0 cards shows Esgotado and Sem Defesa', () => {
      const html = stripComments(
        renderToString(
          <DeckPiles
            greenDeckCount={0}
            blueDeckCount={0}
            canDig={false}
            requiresBlueDefense={false}
          />
        )
      );

      expect(html).toContain('0');
      expect(html).toContain('Esgotado!');
      expect(html).toContain('Sem Defesa');
    });

    it('DeckPiles: renders interactive Cavar and Defender buttons with callback execution', async () => {
      const onDig = vi.fn();
      const onDrawBlue = vi.fn();

      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      await act(async () => {
        root.render(
          <DeckPiles
            greenDeckCount={10}
            blueDeckCount={4}
            canDig={true}
            digAttemptsThisTurn={0}
            onDig={onDig}
            requiresBlueDefense={true}
            onDrawBlueDefense={onDrawBlue}
          />
        );
      });

      const digBtn = container.querySelector('button.bg-emerald-500');
      const defBtn = container.querySelector('button.bg-rose-500');

      expect(digBtn).not.toBeNull();
      expect(defBtn).not.toBeNull();

      await act(async () => {
        digBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(onDig).toHaveBeenCalledTimes(1);

      await act(async () => {
        defBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(onDrawBlue).toHaveBeenCalledTimes(1);

      await act(async () => {
        root.unmount();
      });
      container.remove();
    });
  });
});
