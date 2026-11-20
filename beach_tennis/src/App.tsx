import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMatchStore } from './store/useMatchStore';
import { getLegalMoves } from './engine/rallyValidator';
import type { AIDifficulty, MatchFormat } from './engine/types';
import { ScoreboardHUD } from './components/court/ScoreboardHUD';
import { Court } from './components/court/Court';
import { DeckPiles } from './components/court/DeckPiles';
import { CardHand } from './components/cards/CardHand';
import { CardSlot } from './components/cards/CardSlot';
import { OpponentHandsAndCards } from './components/tabletop/TabletopArtwork';
import { ServeModal } from './components/modals/ServeModal';
import { CoringaModal } from './components/modals/CoringaModal';
import { DigResultModal } from './components/modals/DigResultModal';
import { MatchResultModal } from './components/modals/MatchResultModal';
import { RulesModal } from './components/modals/RulesModal';
import { OnlineLobby } from './components/modals/OnlineLobby';
import { detectRoomIdFromLocation } from './net/onlineClient';
import { assetUrl } from './utils/assetUrl';
import {
  Play,
  HelpCircle,
  Trophy,
  Cpu,
  Volume2,
  VolumeX,
  ArrowRightCircle,
  Sparkles,
  Users,
  Wifi,
  WifiOff,
  Clock,
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
    isOnline,
    roomId,
    roomPhase,
    onlineSeat,
    isHost,
    onlineConnected,
    playerName,
    opponentName,
    opponentConnected,
    opponentGraceUntil,
    turnDeadline,
    onlinePlayers,
    onlineError,
    selfServeReady,
    opponentServeReady,
    selfNextPointReady,
    opponentNextPointReady,
    selfRematchReady,
    opponentRematchReady,
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
    joinOnlineRoom,
    updateOnlinePlayerName,
    setOnlineFormat,
    startOnlineMatch,
    leaveOnlineRoom,
  } = useMatchStore();

  const [menuDifficulty, setMenuDifficulty] = useState<AIDifficulty>(difficulty);
  const [menuFormat, setMenuFormat] = useState<MatchFormat>(matchFormat);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  // Detecta automaticamente na montagem se a URL é uma sala online (/beach_tennis/sala/:roomId)
  useEffect(() => {
    const detectedRoom = detectRoomIdFromLocation();
    if (detectedRoom) {
      joinOnlineRoom(detectedRoom);
    }
  }, [joinOnlineRoom]);

  // Atualiza contador visual de tempo de turno / reconexão a cada 1s quando em modo online
  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOnline]);

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

  const turnRemainingSec = useMemo(() => {
    if (!isOnline || !turnDeadline) return null;
    return Math.max(0, Math.ceil((turnDeadline - nowTick) / 1000));
  }, [isOnline, turnDeadline, nowTick]);

  const graceRemainingSec = useMemo(() => {
    if (!isOnline || opponentConnected || !opponentGraceUntil) return null;
    return Math.max(0, Math.ceil((opponentGraceUntil - nowTick) / 1000));
  }, [isOnline, opponentConnected, opponentGraceUntil, nowTick]);

  const cafeBgUrl = assetUrl('/assets/table/cafe-bg.jpg');
  const avatarLarissaUrl = assetUrl('/assets/table/avatar-larissa.jpg');

  const cafeBackdropStyle = {
    backgroundImage: `radial-gradient(ellipse at 50% 25%, rgba(255,220,170,0.06) 0%, rgba(16,10,6,0.28) 70%, rgba(10,5,3,0.55) 100%), url(${cafeBgUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center top',
  };

  // ==========================================================================
  // TELA DE LOBBY ONLINE 1v1 (/beach_tennis/sala/:roomId)
  // ==========================================================================
  if (isOnline && roomId && roomPhase === 'lobby') {
    return (
      <>
        <OnlineLobby
          roomId={roomId}
          seat={onlineSeat}
          isHost={isHost}
          isConnected={onlineConnected}
          format={matchFormat}
          players={onlinePlayers}
          playerName={playerName}
          onlineError={onlineError}
          onUpdatePlayerName={updateOnlinePlayerName}
          onChangeFormat={setOnlineFormat}
          onStartMatch={startOnlineMatch}
          onLeaveLobby={leaveOnlineRoom}
          onOpenRules={() => setRulesOpen(true)}
        />
        <RulesModal isOpen={isRulesOpen} onClose={() => setRulesOpen(false)} />
      </>
    );
  }

  // ==========================================================================
  // TELA DE MENU PRINCIPAL / CONFIGURAÇÃO
  // ==========================================================================
  if (phase === 'MENU') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 text-[#f7ebd4] select-none"
        style={cafeBackdropStyle}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full bg-[#120d09]/92 backdrop-blur-md border-2 border-[#c8a263]/70 rounded-3xl p-6 sm:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.85)]"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-5">
            <span className="px-3 py-1 rounded-full bg-[#241a10] border border-[#c8a263]/50 text-[#f0cf88] text-xs font-black uppercase tracking-wider">
              UBT • 1v1 vs IA & Online
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSound}
                aria-label="Alternar Som"
                className="p-2 rounded-full border border-[#c8a263]/40 bg-[#1c140d] hover:bg-[#2a1f14] text-[#e8c884] transition cursor-pointer"
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-500" />
                )}
              </button>
              <button
                onClick={() => setRulesOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#241a10] border border-[#c8a263]/50 hover:bg-[#322416] text-[#f0cf88] text-xs font-bold transition cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Folha Rosa</span>
              </button>
            </div>
          </div>

          {/* Hero Title with Opponent Avatar */}
          <div className="text-center mb-6">
            <div className="relative w-20 h-20 mx-auto mb-3">
              <img
                src={avatarLarissaUrl}
                alt="Larissa — Oponente"
                className="w-20 h-20 rounded-full object-cover border-2 border-[#d6b16b] shadow-[0_0_24px_rgba(214,177,107,0.4)]"
              />
              <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#16100a] border border-[#d6b16b] flex items-center justify-center text-sm shadow">
                🎾
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#f5d38c] tracking-tight uppercase">
              Beach Tennis Card Game
            </h1>
            <p className="text-xs sm:text-sm text-[#cbb593] mt-1">
              Desafie <strong className="text-[#f5d38c]">Larissa</strong> na mesa ou convide um amigo — Saque Laranja, Defesa Azul e Golpes Verdes
            </p>
          </div>

          {/* Difficulty Selector */}
          <div className="mb-5">
            <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#e5be70] mb-2">
              <Cpu className="w-4 h-4" />
              <span>Nível da Oponente (IA)</span>
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
                      ? 'border-[#e5be70] bg-[#302212]/90 shadow-md'
                      : 'border-[#3a2c1e] bg-[#1a130d]/70 hover:border-[#6e5437]'
                  }`}
                >
                  <div className="text-xs font-black text-[#f7ebd4]">{item.label}</div>
                  <div className="text-[10px] text-[#b49d7d] mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Match Format Selector */}
          <div className="mb-6">
            <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-lime-400 mb-2">
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
                      ? 'border-lime-400 bg-lime-950/50 shadow-md'
                      : 'border-[#3a2c1e] bg-[#1a130d]/70 hover:border-[#6e5437]'
                  }`}
                >
                  <div className="text-xs font-black text-[#f7ebd4]">{fmt.label}</div>
                  <div className="text-[10px] text-[#b49d7d] mt-0.5">{fmt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Start Match CTA (vs IA) */}
          <button
            onClick={() => startMatch(menuDifficulty, menuFormat)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#d4a44f] via-[#f0ca78] to-[#c99640] hover:from-[#e0b25d] hover:to-[#d8a54e] text-[#171008] font-black text-sm uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Play className="w-5 h-5 fill-[#171008]" />
            <span>Sentar à Mesa (vs IA)</span>
          </button>

          {/* Create Online Room CTA (1v1 Multiplayer) */}
          <button
            type="button"
            onClick={() => {
              window.location.href = '/beach_tennis/online';
            }}
            data-testid="create-online-room-btn"
            className="w-full mt-3 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-400 hover:from-sky-400 hover:to-teal-300 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Users className="w-5 h-5" />
            <span>Jogar Online com Amigo (Criar Sala)</span>
          </button>
        </motion.div>

        <RulesModal isOpen={isRulesOpen} onClose={() => setRulesOpen(false)} />
      </div>
    );
  }

  // ==========================================================================
  // TELA PRINCIPAL DA PARTIDA (MESA DE CAFÉ EM PERSPECTIVA 3D)
  // ==========================================================================
  const displayOpponentName = isOnline ? opponentName : 'Larissa';

  return (
    <div
      className="min-h-screen flex flex-col justify-start text-[#f7ebd4] overflow-x-hidden select-none relative"
      style={cafeBackdropStyle}
    >
      {/* 1. HUD Superior estilo Café/Mesa */}
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
        playerLabel={isOnline ? playerName : 'VOCÊ'}
        opponentLabel={isOnline ? opponentName : 'MÁQUINA'}
      />

      {/* Banner de Desconexão do Oponente em Modo Online */}
      {isOnline && !opponentConnected && phase !== 'MATCH_OVER' && (
        <div className="w-full max-w-4xl mx-auto mt-1 px-3 py-1.5 rounded-full bg-rose-950/90 border border-rose-400/70 text-rose-200 text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 animate-pulse z-40">
          <WifiOff className="w-4 h-4 text-rose-400" />
          <span>
            {opponentName} desconectou — aguardando reconexão
            {graceRemainingSec !== null ? ` (${graceRemainingSec}s para W.O.)` : '...'}
          </span>
        </div>
      )}

      {/* 2. Área Superior da Oponente: Torso rente ao HUD + Mãos apoiadas na borda superior da mesa */}
      <div className="relative w-full max-w-6xl mx-auto px-2 sm:px-4 mt-0 -mb-6 sm:-mb-8 z-30 flex items-end justify-center">
        {/* Mãos da oponente segurando o leque de cartas viradas */}
        <OpponentHandsAndCards
          cardCount={ai.hand.length}
          isThinking={!isOnline && isAIThinking}
        />

        {/* Pill flutuante com Nome e Avatar da Oponente no canto superior direito */}
        <div className="absolute right-2 sm:right-6 top-2.5 flex items-center">
          <div className="pr-10 sm:pr-12 pl-3 sm:pl-4 py-1 sm:py-1.5 rounded-full bg-[#0f0b08]/90 border border-[#c8a263]/80 shadow-[0_8px_20px_rgba(0,0,0,0.8)] flex flex-col items-start">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-black tracking-wide text-[#f7ebd4] truncate max-w-[110px]">
                {displayOpponentName}
              </span>
              {isOnline ? (
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-400/40 inline-flex items-center gap-1">
                  <Wifi className="w-2.5 h-2.5" />
                  <span>Sala #{roomId}</span>
                </span>
              ) : (
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-[#2a1f13] text-[#e6c178] border border-[#c8a263]/40">
                  IA • {difficulty}
                </span>
              )}
            </div>
            <span className="text-[10px] text-[#bfa786] font-semibold">
              {ai.hand.length} {ai.hand.length === 1 ? 'carta' : 'cartas'} na mão
            </span>
          </div>

          <div className="relative -ml-9 sm:-ml-11">
            <img
              src={avatarLarissaUrl}
              alt={displayOpponentName}
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-[#e4be74] shadow-[0_6px_18px_rgba(0,0,0,0.85)]"
            />
            {!isOnline && isAIThinking && (
              <span
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow animate-spin"
                title="IA pensando..."
              >
                <Sparkles className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>

        {/* Badge de pensamento da IA ou cronômetro online no canto superior esquerdo */}
        {!isOnline && isAIThinking && (
          <div className="hidden md:flex absolute left-4 top-2.5 items-center gap-1.5 px-3 py-1 rounded-full bg-[#1a130b]/95 border border-[#e6be70]/70 text-[#ffd985] text-xs font-bold shadow-lg animate-pulse">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>Larissa preparando resposta...</span>
          </div>
        )}

        {isOnline && turnRemainingSec !== null && phase !== 'POINT_ENDED' && phase !== 'MATCH_OVER' && (
          <div
            className={`absolute left-2 sm:left-6 top-2.5 flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold shadow-lg ${
              turnRemainingSec <= 10
                ? 'bg-rose-950/90 border-rose-400 text-rose-200 animate-pulse'
                : 'bg-[#1a130b]/95 border-[#e6be70]/60 text-[#ffd985]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              {rally.currentTurnPlayer === 'PLAYER' ? 'Sua vez' : `Vez de ${opponentName}`}: {turnRemainingSec}s
            </span>
          </div>
        )}
      </div>

      {/* 3. Centro: Mesa em Perspectiva (Trapézio) de Feltro Preto + Moldura de Madeira */}
      <div className="w-full px-1 sm:px-3 z-20 flex-1 flex items-stretch justify-center">
        <Court
          activeServeZone={serveDuel.serverPick}
          ballPosition={ballPosition}
          isShaking={isCourtShaking}
          onOpenRules={() => setRulesOpen(true)}
        >
          <div className="relative w-full h-full flex items-center justify-between px-1 sm:px-2 py-2 gap-2">
            {/* Montes da Oponente (Esquerda da mesa em perspectiva) */}
            <div className="hidden sm:flex flex-col items-center justify-center z-20 -ml-2 lg:-ml-4">
              <DeckPiles
                greenDeckCount={ai.greenDeck.length}
                blueDeckCount={ai.blueDeck.length}
                isAI={true}
                orientation="column"
                side="left"
                className="scale-[0.80] lg:scale-90 origin-left opacity-95"
              />
            </div>

            {/* Centro da Mesa: Carta Jogada + Banner de Fim de Ponto */}
            <div className="relative flex-1 flex flex-col items-center justify-center z-20 min-w-0">
              <CardSlot
                currentCard={rally.lastPlayedCard}
                previousCard={previousPlayedCard}
                declaredAs={rally.lastPlayedCard?.declaredAs}
                requiredResponse={phase === 'POINT_ENDED' ? null : rally.requiredResponse}
                lastPlayer={rally.lastPlayedCard?.owner || null}
                opponentLabel={isOnline ? opponentName : 'Máquina (IA)'}
                className={
                  phase === 'POINT_ENDED' && rally.lastPlayedCard
                    ? 'scale-[0.80] -translate-y-8 sm:-translate-y-9 transition-transform duration-200'
                    : 'transition-transform duration-200'
                }
              />

              {/* Banner de Fim de Ponto centralizado sobre o feltro */}
              <AnimatePresence>
                {phase === 'POINT_ENDED' && (
                  <div className="absolute -bottom-1 inset-x-0 flex justify-center z-40 px-2 pointer-events-none">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="pointer-events-auto w-full max-w-md py-2 px-4 rounded-2xl bg-[#110c08]/95 border-2 border-[#e5be70] shadow-[0_0_32px_rgba(0,0,0,0.9)] text-center backdrop-blur-md"
                    >
                      <p
                        className={`text-xs sm:text-sm font-black uppercase tracking-wide mb-1.5 ${
                          pointWinner === 'PLAYER' ? 'text-lime-400' : 'text-rose-400'
                        }`}
                      >
                        {pointBannerMessage}
                      </p>
                      {isOnline && opponentNextPointReady && !selfNextPointReady && (
                        <p className="text-[11px] font-bold text-sky-300 mb-1">
                          ✓ {opponentName} já está pronto para o próximo ponto!
                        </p>
                      )}
                      <button
                        disabled={isOnline && selfNextPointReady}
                        onClick={() => startNextPoint()}
                        className={`px-5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 mx-auto transition ${
                          isOnline && selfNextPointReady
                            ? 'bg-neutral-800 text-neutral-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-[#d4a44f] to-[#f2ce7e] hover:from-[#e4b660] hover:to-[#f8dc96] text-[#171008] cursor-pointer'
                        }`}
                      >
                        <span>
                          {isOnline && selfNextPointReady
                            ? `Aguardando ${opponentName}...`
                            : 'Próximo Ponto'}
                        </span>
                        <ArrowRightCircle className="w-4 h-4" />
                      </button>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Montes do Jogador (Direita da mesa em perspectiva — Interativos para Cavar / Defender) */}
            <div className="flex flex-col items-center justify-center z-30 -mr-2 lg:-mr-4">
              <DeckPiles
                greenDeckCount={player.greenDeck.length}
                blueDeckCount={player.blueDeck.length}
                canDig={isPlayerTurn && legalMoves.canDig}
                digAttemptsThisTurn={player.digAttemptsThisTurn}
                onDig={digCard}
                requiresBlueDefense={isPlayerTurn && legalMoves.requiresBlueDefense}
                onDrawBlueDefense={() => defendWithBlue()}
                orientation="column"
                side="right"
                className="scale-[0.75] sm:scale-[0.84] lg:scale-95 origin-right"
              />
            </div>
          </div>
        </Court>
      </div>

      {/* 4. Base da Tela: Log de Ação discreto + Mão do Jogador em Leque (1ª Pessoa com Polegar) */}
      <div className="relative w-full max-w-6xl mx-auto -mt-14 sm:-mt-16 pb-0 z-30 flex flex-col items-center overflow-hidden">
        {actionLog.length > 0 && (
          <div className="relative z-40 mb-3 px-3.5 py-0.5 rounded-full bg-[#110c08]/90 border border-[#c8a263]/45 text-[10px] sm:text-[11px] text-[#f0d192] font-semibold truncate max-w-[92vw] sm:max-w-lg text-center shadow-md">
            {actionLog[0]}
          </div>
        )}
        <CardHand
          cards={player.hand}
          playableCardIds={playableCardIds}
          isPlayerTurn={isPlayerTurn}
          onPlayCard={(card) => playCard(card.instanceId)}
        />
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
        waitingOpponent={isOnline && selfServeReady && phase === 'SERVE_SELECTION'}
        opponentReady={isOnline && opponentServeReady && phase === 'SERVE_SELECTION'}
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
        opponentLabel={isOnline ? opponentName : 'Máquina (IA)'}
        rematchPending={isOnline && selfRematchReady}
        opponentRematchReady={isOnline && opponentRematchReady}
      />

      <RulesModal isOpen={isRulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  );
}

export default App;
