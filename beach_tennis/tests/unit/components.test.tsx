/**
 * Unit test suite for UI Components & Card Illustrations
 * File: tests/unit/components.test.tsx
 *
 * Verifies:
 * 1. Procedural SVG illustration system for all 19 cards (Requirement R5: zero RPG stats/stars/borders).
 * 2. Card presentation components: CardIllustration, CardComponent, CardHand, CardSlot.
 * 3. Court and HUD components: Court, ScoreboardHUD, DeckPiles.
 * 4. Interactive modal dialogs: ServeModal, CoringaModal, DigResultModal, MatchResultModal, RulesModal.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';

// Engine types and catalog
import { CARDS_CATALOG } from '../../src/engine/cardsCatalog';
import type { CardInstance, CardType } from '../../src/engine/types';

// Components under test
import { CardIllustration } from '../../src/components/cards/CardIllustration';
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

// Helper to instantiate a test CardInstance
function createMockCard(type: CardType, index = 0): CardInstance {
  const def = CARDS_CATALOG[type];
  return {
    instanceId: `test_${type}_${index}`,
    cardId: def.id,
    definition: def,
    owner: 'PLAYER',
  };
}

// Strips React SSR comment boundaries (e.g. <!-- -->) so text assertions match DOM textContent
function stripSsrComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

describe('Milestone M3: Assets & UI Components Suite', () => {
  // ==========================================================================
  // 1. Procedural Card Illustration System (Requirement R5)
  // ==========================================================================
  describe('CardIllustration — Procedural SVG System (Requirement R5)', () => {
    const allCardTypes = Object.keys(CARDS_CATALOG) as CardType[];

    it('contains exactly 19 unique card definitions in CARDS_CATALOG for 1v1', () => {
      expect(allCardTypes.length).toBe(19);
    });

    allCardTypes.forEach((type) => {
      it(`renders procedural SVG for ${type} with valid viewBox and zero RPG stats`, () => {
        const def = CARDS_CATALOG[type];
        const rawHtml = renderToString(<CardIllustration card={def} forceVector={true} />);
        const html = stripSsrComments(rawHtml);

        // Must render an SVG element
        expect(html).toContain('<svg');
        expect(html).toContain('viewBox="0 0 300 400"');

        // Requirement R5: Absolutely NO RPG stats, HP, attack/defense power, stars, or levels
        const lowerHtml = html.toLowerCase();
        expect(lowerHtml).not.toContain('power shot');
        expect(lowerHtml).not.toContain('power:');
        expect(lowerHtml).not.toContain('lv.');
        expect(lowerHtml).not.toContain('level 5');
        expect(lowerHtml).not.toContain('mana');
        expect(lowerHtml).not.toContain('pontos de fogo');

        // Must contain sand and sky gradients
        expect(html).toContain('linearGradient');
        expect(html).toContain('circle');
      });
    });

    it('renders specific Serve zone visual guides for SAQUE_1, SAQUE_2, SAQUE_3', () => {
      const htmlZ1 = stripSsrComments(renderToString(<CardIllustration card={CARDS_CATALOG.SAQUE_1} forceVector={true} />));
      const htmlZ2 = stripSsrComments(renderToString(<CardIllustration card={CARDS_CATALOG.SAQUE_2} forceVector={true} />));
      const htmlZ3 = stripSsrComments(renderToString(<CardIllustration card={CARDS_CATALOG.SAQUE_3} forceVector={true} />));

      expect(htmlZ1).toContain('Z1');
      expect(htmlZ2).toContain('Z2');
      expect(htmlZ3).toContain('Z3');
    });

    it('renders golden solar mascot and orbit rings for GOLPE_UBT_CORINGA', () => {
      const html = stripSsrComments(renderToString(<CardIllustration card={CARDS_CATALOG.GOLPE_UBT_CORINGA} forceVector={true} />));
      expect(html).toContain('ellipse');
      expect(html).toContain('stroke-dasharray="6 4"');
    });
  });

  // ==========================================================================
  // 2. Card Presentation Components
  // ==========================================================================
  describe('CardComponent', () => {
    it('renders card title, borders, and required response badge', () => {
      const smashCard = createMockCard('SMASH');
      const html = stripSsrComments(renderToString(<CardComponent card={smashCard} size="md" showDetails={true} />));

      expect(html).toContain('Smash');
      expect(html).toContain('DEFESA (AZUL)');
      expect(html).toContain('border-emerald-500');
    });

    it('renders flame icon for attack cards (isAttack === true)', () => {
      const smashCard = createMockCard('SMASH');
      const defCurtaCard = createMockCard('DEF_CURTA');

      const smashHtml = stripSsrComments(renderToString(<CardComponent card={smashCard} />));
      const defHtml = stripSsrComments(renderToString(<CardComponent card={defCurtaCard} />));

      // Smash is an attack
      expect(smashHtml).toContain('lucide-flame');
      // Def Curta is not an attack
      expect(defHtml).not.toContain('lucide-flame');
    });

    it('renders crown icon and gold styling for Wildcards', () => {
      const coringa = createMockCard('GOLPE_UBT_CORINGA');
      const html = stripSsrComments(renderToString(<CardComponent card={coringa} />));

      expect(html).toContain('lucide-crown');
      expect(html).toContain('border-amber-400');
    });

    it('renders declared card badge when declaredAs is present', () => {
      const coringa = createMockCard('GOLPE_UBT_CORINGA');
      coringa.declaredAs = 'SMASH';

      const html = stripSsrComments(renderToString(<CardComponent card={coringa} />));
      expect(html).toContain('Decl: SMASH');
    });

    it('renders face-down card back with UBT logo when isFaceDown is true', () => {
      const card = createMockCard('VOLEIO_PINGADA');
      const html = stripSsrComments(renderToString(<CardComponent card={card} isFaceDown={true} />));

      expect(html).toContain('UBT');
      expect(html).toContain('Beach Tennis');
      expect(html).not.toContain('Voleio Pingada');
    });
  });

  describe('CardHand', () => {
    it('renders player hand cards with turn indicator', () => {
      const cards = [
        createMockCard('BANDEJA_CURTA', 0),
        createMockCard('VOLEIO_PINGADA', 1),
        createMockCard('SMASH', 2),
      ];

      const html = stripSsrComments(renderToString(
        <CardHand
          cards={cards}
          isPlayerTurn={true}
          playableCardIds={new Set(['test_BANDEJA_CURTA_0'])}
        />
      ));

      expect(html).toContain('Sua Vez de Jogar');
      expect(html).toContain('Bandeja Curta');
      expect(html).toContain('Voleio Pingada');
      expect(html).toContain('Smash');
    });

    it('renders waiting indicator when it is not player turn', () => {
      const cards = [createMockCard('SMASH', 0)];
      const html = stripSsrComments(renderToString(<CardHand cards={cards} isPlayerTurn={false} />));

      expect(html).toContain('Aguardando Oponente...');
    });
  });

  describe('CardSlot', () => {
    it('renders response requirement banner and played card', () => {
      const card = createMockCard('BANDEJA_CURTA');
      const html = stripSsrComments(renderToString(
        <CardSlot
          currentCard={card}
          requiredResponse="BANDEJAS"
          lastPlayer="AI"
        />
      ));

      expect(html).toContain('Responda com:');
      expect(html).toContain('BANDEJAS');
      expect(html).toContain('Bandeja Curta');
      expect(html).toContain('Jogada por: Máquina (IA)');
    });

    it('renders empty prompt when currentCard is null', () => {
      const html = stripSsrComments(renderToString(
        <CardSlot currentCard={null} requiredResponse={null} lastPlayer={null} />
      ));

      expect(html).toContain('Aguardando Saque / Golpe');
    });
  });

  // ==========================================================================
  // 3. Court and HUD System
  // ==========================================================================
  describe('Court & ScoreboardHUD', () => {
    it('renders sand court layout with zones and 3D net divider', () => {
      const html = stripSsrComments(renderToString(
        <Court activeServeZone={2} ballPosition="NET">
          <div data-testid="child-element">Slot</div>
        </Court>
      ));

      expect(html).toContain('REDE (1.70M)');
      expect(html).toContain('Quadra IA');
      expect(html).toContain('Sua Quadra');
      expect(html).toContain('Zona 1');
      expect(html).toContain('Zona 2');
      expect(html).toContain('Zona 3');
      expect(html).toContain('data-testid="child-element"');
    });

    it('renders ScoreboardHUD with points, games, and active server icon', () => {
      const html = stripSsrComments(renderToString(
        <ScoreboardHUD
          playerGames={4}
          aiGames={3}
          playerPoints={40}
          aiPoints={30}
          isNoAdPoint={false}
          isTieBreak={false}
          currentServer="PLAYER"
          soundEnabled={true}
          onToggleSound={vi.fn()}
          onOpenRules={vi.fn()}
          rallyLength={6}
        />
      ));

      expect(html).toContain('VOCÊ');
      expect(html).toContain('MÁQUINA');
      expect(html).toContain('4'); // Player games
      expect(html).toContain('3'); // AI games
      expect(html).toContain('40'); // Player points
      expect(html).toContain('30'); // AI points
      expect(html).toContain('Trocas:');
      expect(html).toContain('6');
      expect(html).toContain('Folha Rosa');
    });

    it('displays Ponto Decisivo (No-Ad) alert banner when isNoAdPoint is true', () => {
      const html = stripSsrComments(renderToString(
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
      ));

      expect(html).toContain('PONTO DECISIVO (NO-AD)');
    });

    it('displays Tie-Break alert banner when isTieBreak is true', () => {
      const html = stripSsrComments(renderToString(
        <ScoreboardHUD
          playerGames={6}
          aiGames={6}
          playerPoints={0}
          aiPoints={0}
          isNoAdPoint={false}
          isTieBreak={true}
          playerTieBreakPoints={5}
          aiTieBreakPoints={4}
          currentServer="PLAYER"
          soundEnabled={true}
          onToggleSound={vi.fn()}
          onOpenRules={vi.fn()}
        />
      ));

      expect(html).toContain('TIE-BREAK EM DISPUTA');
      expect(html).toContain('5'); // Player tie break points
      expect(html).toContain('4'); // AI tie break points
    });
  });

  describe('DeckPiles', () => {
    it('renders Monte Verde and Monte Azul with card counts', () => {
      const html = stripSsrComments(renderToString(
        <DeckPiles greenDeckCount={18} blueDeckCount={8} />
      ));

      expect(html).toContain('Monte Verde');
      expect(html).toContain('18');
      expect(html).toContain('Monte Azul');
      expect(html).toContain('8');
    });

    it('renders Cavar button when canDig is true', () => {
      const html = stripSsrComments(renderToString(
        <DeckPiles
          greenDeckCount={12}
          blueDeckCount={6}
          canDig={true}
          digAttemptsThisTurn={0}
          onDig={vi.fn()}
        />
      ));

      expect(html).toContain('Cavar (1/2)');
    });

    it('renders Defender! button when requiresBlueDefense is true', () => {
      const html = stripSsrComments(renderToString(
        <DeckPiles
          greenDeckCount={10}
          blueDeckCount={5}
          requiresBlueDefense={true}
          onDrawBlueDefense={vi.fn()}
        />
      ));

      expect(html).toContain('Defender!');
    });
  });

  // ==========================================================================
  // 4. Modals and Dialogs System
  // ==========================================================================
  describe('Modals & Dialogs', () => {
    describe('ServeModal', () => {
      it('renders serve selection for server player', () => {
        const html = stripSsrComments(renderToString(
          <ServeModal
            isOpen={true}
            isServer={true}
            selectedZone={2}
            selectedReceiveZones={[]}
            onSelectZone={vi.fn()}
            onSelectReceiveZones={vi.fn()}
            onConfirmDuel={vi.fn()}
          />
        ));

        expect(html).toContain('Fase de Saque (Você Saca)');
        expect(html).toContain('Esquerda');
        expect(html).toContain('Centro');
        expect(html).toContain('Direita');
        expect(html).toContain('Confirmar Escolha');
      });

      it('renders Ace celebration banner when duelResult indicates Ace', () => {
        const html = stripSsrComments(renderToString(
          <ServeModal
            isOpen={true}
            isServer={true}
            selectedZone={1}
            selectedReceiveZones={[]}
            onSelectZone={vi.fn()}
            onSelectReceiveZones={vi.fn()}
            onConfirmDuel={vi.fn()}
            duelResult={{
              isAce: true,
              defenseSuccess: false,
              server: 'PLAYER',
              receiver: 'AI',
              serverPick: 1,
              receiverPicks: [2, 3],
              winningPlayer: 'PLAYER',
            }}
          />
        ));

        expect(html).toContain('ACE!');
      });
    });

    describe('CoringaModal', () => {
      it('renders allowed declaration options and confirms selection', () => {
        const html = stripSsrComments(renderToString(
          <CoringaModal
            isOpen={true}
            wildcardType="GOLPE_UBT_CORINGA"
            currentRequiredResponse="BANDEJAS"
            allowedCards={['BANDEJA_CURTA', 'BANDEJA_LOB']}
            onConfirmDeclaration={vi.fn()}
          />
        ));

        expect(html).toContain('Declarar Golpe do Coringa Verde');
        expect(html).toContain('Bandeja Curta');
        expect(html).toContain('Bandeja Lob');
        expect(html).toContain('Confirmar Declaração');
      });
    });

    describe('DigResultModal', () => {
      it('renders drawn card and valid outcome feedback', () => {
        const drawnCard = createMockCard('BANDEJA_CURTA');
        const html = stripSsrComments(renderToString(
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
        ));

        expect(html).toContain('Cavação no Monte Verde — Tentativa 1 de 2');
        expect(html).toContain('Carta compatível! Obrigatório jogar imediatamente.');
        expect(html).toContain('Jogar Carta na Quadra');
      });

      it('renders point loss feedback on second attempt failure', () => {
        const drawnCard = createMockCard('SMASH');
        const html = stripSsrComments(renderToString(
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
        ));

        expect(html).toContain('Falha na 2ª tentativa! Ponto do oponente (Winner).');
        expect(html).toContain('Continuar');
      });
    });

    describe('MatchResultModal', () => {
      it('renders victory screen with match statistics when player wins', () => {
        const html = stripSsrComments(renderToString(
          <MatchResultModal
            isOpen={true}
            winner="PLAYER"
            finalScore={{
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
            }}
            stats={{
              acesPlayer: 3,
              acesAI: 1,
              winnersPlayer: 12,
              winnersAI: 8,
              longestRally: 14,
              totalBlueDefenses: 16,
            }}
            onPlayAgain={vi.fn()}
          />
        ));

        expect(html).toContain('Vitória Espetacular!');
        expect(html).toContain('6'); // Player games
        expect(html).toContain('4'); // AI games
        expect(html).toContain('Aces (Você / IA):');
        expect(html).toContain('3 / 1');
        expect(html).toContain('14 trocas');
        expect(html).toContain('Jogar Novamente');
      });

      it('renders defeat screen when AI wins', () => {
        const html = stripSsrComments(renderToString(
          <MatchResultModal
            isOpen={true}
            winner="AI"
            finalScore={{
              matchFormat: 'FULL_SET_6',
              playerGames: 3,
              aiGames: 6,
              playerPoints: 0,
              aiPoints: 0,
              isDeuce: false,
              isNoAdPoint: false,
              isTieBreak: false,
              playerTieBreakPoints: 0,
              aiTieBreakPoints: 0,
              currentServer: 'PLAYER',
              nextGameServer: 'AI',
              setWinner: 'AI',
              matchWinner: 'AI',
              completedSets: [{ playerGames: 3, aiGames: 6 }],
            }}
            onPlayAgain={vi.fn()}
          />
        ));

        expect(html).toContain('Fim de Jogo — Derrota');
      });
    });

    describe('RulesModal', () => {
      it('renders the 4 response categories of the official Folha Rosa', () => {
        const html = stripSsrComments(renderToString(<RulesModal isOpen={true} onClose={vi.fn()} />));

        expect(html).toContain('Folha Rosa Oficial');
        expect(html).toContain('Responde com BANDEJAS');
        expect(html).toContain('Responde com VOLEIOS');
        expect(html).toContain('Responde com DEFESAS (Monte Azul)');
        expect(html).toContain('Responde com FUNDO / AÉREO');
        expect(html).toContain('Cavação (1 a 2 cartas)');
        expect(html).toContain('Ponto Decisivo (No-Ad)');
      });
    });
  });
});
