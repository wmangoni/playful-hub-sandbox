import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMatchStore } from './store/useMatchStore';
import { getLegalMoves } from './engine/rallyValidator';
import type { AIDifficulty, MatchFormat } from './engine/types';
import { ScoreboardHUD } from './components/court/ScoreboardHUD';
import { Court } from './components/court/Court';
import { DeckPiles } from './components/court/DeckPiles';
import { CardHand } from './components/cards/CardHand';
import { CardSlot } from './components/cards/CardSlot';
import { ServeModal } from './components/modals/ServeModal';
import { CoringaModal } from './components/modals/CoringaModal';
import { DigResultModal } from './components/modals/DigResultModal';
import { MatchResultModal } from './components/modals/MatchResultModal';
import { RulesModal } from './components/modals/RulesModal';
import {
  Play,
  HelpCircle,
  Trophy,
  Cpu,
  Volume2,
  VolumeX,
  ArrowRightCircle,
  Sparkles,
} from 'lucide-react';

export function App() {
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__useMatchStore = useMatchStore;
  }
  const {
    phase,
    difficulty,
    matchFormat,
    score,
    player,
    ai,
    rally,
    serveDuel,
    lastServeResult,
    activeDigResult,
    pointWinner,
    pointBannerMessage,
    isAIThinking,
    isCourtShaking,
    isRulesOpen,
    soundEnabled,
    actionLog,
    stats,
    startMatch,
    startNextPoint,
    selectServeZone,
    selectReceiveZones,
    confirmServeDuel,
    playCard,
    confirmWildcardDeclaration,
    cancelWildcardDeclaration,
    defendWithBlue,
    digCard,
    playDrawnDigCard,
    closeDigFailedModal,
    restartMatch,
    exitToMenu,
    toggleSound,
    setRulesOpen,
  } = useMatchStore();

  const [menuDifficulty, setMenuDifficulty] = useState<AIDifficulty>(difficulty);
  const [menuFormat, setMenuFormat] = useState<MatchFormat>(matchFormat);

  // Calcula jogadas legais para o jogador humano quando há uma carta na quadra
  const legalMoves = useMemo(() => {
    if (
      rally.currentTurnPlayer !== 'PLAYER' ||
      !rally.lastPlayedCard ||
      (phase !== 'RALLY_PLAYER_TURN' && phase !== 'RALLY_DEFENSE_DRAW')
    ) {
      return {
        playableCards: [],
        canDig: false,
        requiresBlueDefense: false,
      };
    }
    return getLegalMoves(
      player.hand,
      rally.lastPlayedCard,
      rally.lastPlayedCard.declaredAs
    );
  }, [phase, player.hand, rally.currentTurnPlayer, rally.lastPlayedCard]);

  const playableCardIds = useMemo(
    () => new Set(legalMoves.playableCards.map((c) => c.instanceId)),
    [legalMoves.playableCards]
  );

  const isPlayerTurn =
    (phase === 'RALLY_PLAYER_TURN' || phase === 'RALLY_DEFENSE_DRAW') &&
    rally.currentTurnPlayer === 'PLAYER';

  const ballPosition = useMemo(() => {
    if (phase === 'SERVE_SELECTION' || phase === 'SERVE_REVEAL') {
      return score.currentServer === 'PLAYER' ? 'BOTTOM' : 'TOP';
    }
    if (!rally.lastPlayedCard) return 'CENTER';
    if (rally.requiredResponse === 'BANDEJAS' || rally.requiredResponse === 'VOLEIOS') {
      return 'NET';
    }
    return rally.currentTurnPlayer === 'PLAYER' ? 'BOTTOM' : 'TOP';
  }, [phase, rally.currentTurnPlayer, rally.lastPlayedCard, rally.requiredResponse, score.currentServer]);

  const previousPlayedCard = useMemo(() => {
    if (rally.steps.length < 2) return null;
    return rally.steps[rally.steps.length - 2]?.card || null;
  }, [rally.steps]);

  // ==========================================================================
  // TELA DE MENU PRINCIPAL / CONFIGURAÇÃO
  // ==========================================================================
  if (phase === 'MENU') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-slate-950 via-sky-950 to-slate-900 text-slate-100 select-none">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full bg-slate-900/90 backdrop-blur-md border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-4">
            <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider">
              UBT • Modo 1 vs 1 vs IA
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSound}
                aria-label="Alternar Som"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                )}
              </button>
              <button
                onClick={() => setRulesOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 text-rose-300 text-xs font-bold transition cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Folha Rosa</span>
              </button>
            </div>
          </div>

          {/* Hero Title */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-3xl shadow-lg">
              🎾
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight uppercase">
              Beach Tennis Card Game
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Simulador tático de rali na areia — Saque Laranja, Defesa Azul e Golpes Verdes
            </p>
          </div>

          {/* Difficulty Selector */}
          <div className="mb-5">
            <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-sky-400 mb-2">
              <Cpu className="w-4 h-4" />
              <span>Nível da Máquina (IA)</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(
                [
                  { id: 'EASY', label: 'Fácil', desc: 'Casual / Iniciante' },
                  { id: 'MEDIUM', label: 'Médio', desc: 'Tático & Ataque' },
                  { id: 'HARD', label: 'Difícil', desc: 'Leitura de Jogo' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setMenuDifficulty(item.id)}
                  className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                    menuDifficulty === item.id
                      ? 'border-amber-400 bg-amber-500/20 shadow-md'
                      : 'border-slate-800 bg-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-black text-slate-100">{item.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Match Format Selector */}
          <div className="mb-6">
            <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-400 mb-2">
              <Trophy className="w-4 h-4" />
              <span>Formato da Partida (Regras ITF No-Ad)</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {(
                [
                  { id: 'FAST_1_GAME', label: '1 Game', desc: 'Partida Rápida' },
                  { id: 'SHORT_SET_4', label: 'Set Curto (4)', desc: 'Tie-Break 4x4' },
                  { id: 'FULL_SET_6', label: 'Set Oficial (6)', desc: 'Tie-Break 6x6' },
                ] as const
              ).map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setMenuFormat(fmt.id)}
                  className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                    menuFormat === fmt.id
                      ? 'border-emerald-400 bg-emerald-500/20 shadow-md'
                      : 'border-slate-800 bg-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-black text-slate-100">{fmt.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{fmt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Start Match CTA */}
          <button
            onClick={() => startMatch(menuDifficulty, menuFormat)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>Entrar em Quadra</span>
          </button>
        </motion.div>

        <RulesModal isOpen={isRulesOpen} onClose={() => setRulesOpen(false)} />
      </div>
    );
  }

  // ==========================================================================
  // TELA PRINCIPAL DA PARTIDA
  // ==========================================================================
  return (
    <div className="min-h-screen flex flex-col justify-start gap-1 px-2 sm:px-4 pt-1.5 pb-3 bg-gradient-to-b from-slate-950 via-sky-950 to-slate-900 text-slate-100 overflow-x-hidden select-none">
      {/* 1. HUD de Placar no Topo */}
      <ScoreboardHUD
        playerGames={score.playerGames}
        aiGames={score.aiGames}
        playerPoints={score.playerPoints}
        aiPoints={score.aiPoints}
        isNoAdPoint={score.isNoAdPoint}
        isTieBreak={score.isTieBreak}
        playerTieBreakPoints={score.playerTieBreakPoints}
        aiTieBreakPoints={score.aiTieBreakPoints}
        currentServer={score.currentServer}
        completedSets={score.completedSets}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onOpenRules={() => setRulesOpen(true)}
        onRestartMatch={exitToMenu}
        rallyLength={rally.rallyLength}
      />

      {/* 2. Área Superior: Mão da IA e Montes da IA */}
      <div className="w-full max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2 px-2">
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-bold text-sky-300 flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5" />
            <span>IA ({difficulty})</span>
            <span className="text-slate-400">• Mão: {ai.hand.length}</span>
          </div>
          {isAIThinking && (
            <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-bold animate-pulse flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>Carta em destaque (3s) • IA preparando resposta...</span>
            </span>
          )}
        </div>

        <DeckPiles
          greenDeckCount={ai.greenDeck.length}
          blueDeckCount={ai.blueDeck.length}
          isAI={true}
          className="hidden sm:flex scale-[0.55] origin-right -my-7"
        />
      </div>

      {/* 3. Centro: Quadra de Areia e Slot Central */}
      <div className="w-full">
        <Court
          activeServeZone={serveDuel.serverPick}
          ballPosition={ballPosition}
          isShaking={isCourtShaking}
        >
          <div className="relative w-full h-full flex flex-col items-center justify-center z-20 px-2">
            <CardSlot
              currentCard={rally.lastPlayedCard}
              previousCard={previousPlayedCard}
              declaredAs={rally.lastPlayedCard?.declaredAs}
              requiredResponse={phase === 'POINT_ENDED' ? null : rally.requiredResponse}
              lastPlayer={rally.lastPlayedCard?.owner || null}
              className={
                phase === 'POINT_ENDED' && rally.lastPlayedCard
                  ? 'scale-[0.80] -translate-y-8 sm:-translate-y-9 transition-transform duration-200'
                  : 'transition-transform duration-200'
              }
            />

            {/* Banner de Fim de Ponto centralizado dentro da quadra sem cortar elementos */}
            <AnimatePresence>
              {phase === 'POINT_ENDED' && (
                <div className="absolute bottom-1.5 inset-x-0 flex justify-center z-40 px-3 pointer-events-none">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="pointer-events-auto w-full max-w-md py-1.5 px-4 rounded-2xl bg-slate-950/95 border-2 border-amber-400 shadow-[0_0_30px_rgba(0,0,0,0.85)] text-center backdrop-blur-md"
                  >
                    <p
                      className={`text-xs sm:text-sm font-black uppercase tracking-wide mb-1 ${
                        pointWinner === 'PLAYER' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {pointBannerMessage}
                    </p>
                    <button
                      onClick={() => startNextPoint()}
                      className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 mx-auto transition cursor-pointer"
                    >
                      <span>Próximo Ponto</span>
                      <ArrowRightCircle className="w-4 h-4" />
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </Court>
      </div>

      {/* 4. Base da Tela Elevada (Mobile & Desktop): Montes Táticos + Mão de Cartas Verdes */}
      <div className="w-full max-w-5xl mx-auto -mt-2 sm:-mt-3 pb-2 sm:pb-3 z-30 flex flex-row items-center justify-between gap-1 sm:gap-4 px-2 sm:px-5 bg-slate-950/85 backdrop-blur-md border-2 border-slate-800/90 rounded-3xl shadow-[0_-10px_30px_rgba(0,0,0,0.6)] pt-1">
        <DeckPiles
          greenDeckCount={player.greenDeck.length}
          blueDeckCount={player.blueDeck.length}
          canDig={isPlayerTurn && legalMoves.canDig}
          digAttemptsThisTurn={player.digAttemptsThisTurn}
          onDig={digCard}
          requiresBlueDefense={isPlayerTurn && legalMoves.requiresBlueDefense}
          onDrawBlueDefense={() => defendWithBlue()}
          className="scale-[0.58] sm:scale-90 origin-left -my-6 -mr-14 sm:my-0 sm:mr-0 flex-shrink-0 z-40"
        />

        <div className="flex-1 flex flex-col items-center min-w-0">
          <CardHand
            cards={player.hand}
            playableCardIds={playableCardIds}
            isPlayerTurn={isPlayerTurn}
            onPlayCard={(card) => playCard(card.instanceId)}
          />
          {actionLog.length > 0 && (
            <div className="-mt-1 text-[10px] sm:text-[11px] text-amber-300/95 font-bold truncate max-w-full sm:max-w-lg text-center px-2">
              {actionLog[0]}
            </div>
          )}
        </div>
      </div>

      {/* 5. Camada de Modais */}
      <ServeModal
        isOpen={phase === 'SERVE_SELECTION' || phase === 'SERVE_REVEAL'}
        isServer={score.currentServer === 'PLAYER'}
        selectedZone={serveDuel.serverPick}
        selectedReceiveZones={serveDuel.receiverPicks}
        onSelectZone={selectServeZone}
        onSelectReceiveZones={selectReceiveZones}
        onConfirmDuel={() => confirmServeDuel()}
        duelResult={phase === 'SERVE_REVEAL' ? lastServeResult : null}
        isRevealing={phase === 'SERVE_REVEAL'}
      />

      <CoringaModal
        isOpen={phase === 'WILDCARD_DECLARING' && Boolean(rally.pendingWildcard)}
        wildcardType={
          rally.pendingWildcard?.card.definition.type === 'DEF_UBT_CORINGA'
            ? 'DEF_UBT_CORINGA'
            : 'GOLPE_UBT_CORINGA'
        }
        currentRequiredResponse={rally.requiredResponse}
        allowedCards={rally.pendingWildcard?.allowedDeclarations || []}
        onConfirmDeclaration={(decl) => confirmWildcardDeclaration(decl)}
        onCancel={
          rally.pendingWildcard?.card.definition.type === 'GOLPE_UBT_CORINGA'
            ? cancelWildcardDeclaration
            : undefined
        }
      />

      <DigResultModal
        isOpen={phase === 'RALLY_DIGGING' && Boolean(activeDigResult)}
        digResult={activeDigResult}
        onPlayDrawnCard={playDrawnDigCard}
        onDigAgain={digCard}
        onClose={closeDigFailedModal}
      />

      <MatchResultModal
        isOpen={phase === 'MATCH_OVER' && score.matchWinner !== null}
        winner={score.matchWinner || 'PLAYER'}
        finalScore={score}
        stats={stats}
        onPlayAgain={() => restartMatch()}
        onExitToMenu={exitToMenu}
      />

      <RulesModal isOpen={isRulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}

export default App;
