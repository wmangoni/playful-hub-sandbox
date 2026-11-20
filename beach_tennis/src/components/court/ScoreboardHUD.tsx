import React from 'react';
import { Volume2, VolumeX, HelpCircle, ArrowLeft, Menu } from 'lucide-react';
import type { GamePoint, PlayerId } from '../../engine/types';
import { MatchstickTally } from '../tabletop/TabletopArtwork';

export interface ScoreboardHUDProps {
  playerGames: number;
  aiGames: number;
  playerPoints: GamePoint;
  aiPoints: GamePoint;
  isNoAdPoint: boolean;
  isTieBreak: boolean;
  playerTieBreakPoints?: number;
  aiTieBreakPoints?: number;
  currentServer: PlayerId;
  completedSets?: Array<{ playerGames: number; aiGames: number }>;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenRules: () => void;
  onRestartMatch?: () => void;
  rallyLength?: number;
  playerLabel?: string;
  opponentLabel?: string;
  className?: string;
}

export const ScoreboardHUD: React.FC<ScoreboardHUDProps> = ({
  playerGames,
  aiGames,
  playerPoints,
  aiPoints,
  isNoAdPoint,
  isTieBreak,
  playerTieBreakPoints = 0,
  aiTieBreakPoints = 0,
  currentServer,
  completedSets = [],
  soundEnabled,
  onToggleSound,
  onOpenRules,
  onRestartMatch,
  rallyLength = 0,
  playerLabel = 'VOCÊ',
  opponentLabel = 'MÁQUINA',
  className = '',
}) => {
  return (
    <div className={`w-full flex flex-col gap-1.5 z-40 ${className}`}>
      {/* Classic Tabletop Top Bar (Dark Espresso + Warm Gold Trim) */}
      <div className="w-full bg-[#0c0907]/95 backdrop-blur-md border-b-2 border-[#c8a263]/70 px-3 sm:px-5 py-1.5 shadow-[0_6px_24px_rgba(0,0,0,0.85)] flex flex-wrap items-center justify-between gap-2">
        {/* Left: Circular Gold Back / Menu Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onRestartMatch && (
            <button
              onClick={onRestartMatch}
              aria-label="Restart Match"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-[#c8a263]/80 bg-[#1a130d] hover:bg-[#2c2015] text-[#e8c884] flex items-center justify-center transition cursor-pointer shadow-inner"
              title="Reiniciar Partida"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Center: Player vs Opponent Matchstick Tally & Score */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Player Score */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <div className="relative flex items-center gap-1">
              <span className="font-bold text-xs sm:text-sm tracking-wide text-[#f7ebd4] uppercase truncate max-w-[110px] inline-block align-bottom">
                {playerLabel}
              </span>
              {currentServer === 'PLAYER' && (
                <span className="text-xs" title="Sacador Atual">
                  🎾
                </span>
              )}
            </div>

            <MatchstickTally count={playerGames} boxes={3} className="hidden md:inline-flex" />

            <div className="flex items-center gap-1 bg-[#18120d] px-2 py-0.5 rounded-md border border-[#c8a263]/40">
              <span className="text-[10px] text-[#bda27a] font-semibold">G:</span>
              <span className="text-xs sm:text-sm font-black text-[#f0c878]">{playerGames}</span>
              <span className="text-[10px] text-[#6d5940] mx-0.5">|</span>
              <span className="text-[10px] text-[#bda27a] font-semibold">PTS:</span>
              <span className="text-xs sm:text-sm font-black text-emerald-400">
                {isTieBreak ? playerTieBreakPoints : playerPoints}
              </span>
            </div>
          </div>

          <span className="text-[#785e3c] font-black text-[10px] sm:text-xs">•</span>

          {/* AI / Online Opponent Score */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <div className="relative flex items-center gap-1">
              <span className="font-bold text-xs sm:text-sm tracking-wide text-[#f7ebd4] uppercase truncate max-w-[110px] inline-block align-bottom">
                {opponentLabel}
              </span>
              {currentServer === 'AI' && (
                <span className="text-xs" title="Sacador Atual">
                  🎾
                </span>
              )}
            </div>

            <MatchstickTally count={aiGames} boxes={3} className="hidden md:inline-flex" />

            <div className="flex items-center gap-1 bg-[#18120d] px-2 py-0.5 rounded-md border border-[#c8a263]/40">
              <span className="text-[10px] text-[#bda27a] font-semibold">G:</span>
              <span className="text-xs sm:text-sm font-black text-[#f0c878]">{aiGames}</span>
              <span className="text-[10px] text-[#6d5940] mx-0.5">|</span>
              <span className="text-[10px] text-[#bda27a] font-semibold">PTS:</span>
              <span className="text-xs sm:text-sm font-black text-sky-400">
                {isTieBreak ? aiTieBreakPoints : aiPoints}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Rally Medallion, Sets, Sound & Rules */}
        <div className="flex items-center gap-2">
          {rallyLength > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1a130c] border border-[#c8a263]/70 text-[11px] text-[#e8c884] font-bold">
              <span>Trocas:</span>
              <span className="font-black text-[#ffd985]">{rallyLength}</span>
            </div>
          )}

          {completedSets.length > 0 && (
            <div className="hidden lg:flex items-center gap-1 bg-[#17110b] px-2 py-0.5 rounded border border-[#c8a263]/35 text-[11px] text-[#c4ab87]">
              <span>Sets:</span>
              {completedSets.map((s, idx) => (
                <span key={idx} className="font-bold text-[#f7ebd4] ml-1">
                  {s.playerGames}-{s.aiGames}
                </span>
              ))}
            </div>
          )}

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            aria-label="Toggle Sound"
            className="w-8 h-8 rounded-full border border-[#c8a263]/60 bg-[#1a130d] hover:bg-[#2c2015] flex items-center justify-center transition cursor-pointer"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Rules Modal Drawer Trigger */}
          <button
            onClick={onOpenRules}
            aria-label="Open Rules Drawer"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1d150e] border border-[#c8a263]/80 hover:bg-[#2d2115] text-[#f0d08a] text-xs font-bold transition cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Folha Rosa</span>
            <Menu className="w-3.5 h-3.5 sm:hidden" />
          </button>
        </div>
      </div>

      {/* Special Badges: No-Ad or Tie-Break */}
      {isNoAdPoint && (
        <div className="w-full max-w-3xl mx-auto py-1 px-4 rounded-full bg-gradient-to-r from-[#2c1c08]/95 via-[#4e330d]/95 to-[#2c1c08]/95 border border-[#e6be70] shadow-lg text-center animate-pulse">
          <span className="text-[11px] sm:text-xs font-black text-[#ffe094] tracking-wider uppercase">
            ⚡ PONTO DECISIVO (NO-AD) — QUEM VENCER ESTE PONTO FECHA O GAME!
          </span>
        </div>
      )}

      {isTieBreak && (
        <div className="w-full max-w-3xl mx-auto py-1 px-4 rounded-full bg-gradient-to-r from-[#0e1f33]/95 via-[#183857]/95 to-[#0e1f33]/95 border border-sky-400/70 shadow-lg text-center">
          <span className="text-[11px] sm:text-xs font-black text-sky-300 tracking-wider uppercase">
            🎾 TIE-BREAK EM DISPUTA (PRIMEIRO A 7 PONTOS COM +2)
          </span>
        </div>
      )}
    </div>
  );
};

export default ScoreboardHUD;
