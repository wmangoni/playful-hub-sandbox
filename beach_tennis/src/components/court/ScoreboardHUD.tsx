import React from 'react';
import { Volume2, VolumeX, HelpCircle, RotateCcw } from 'lucide-react';
import type { GamePoint, PlayerId } from '../../engine/types';

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
    <div className={`w-full max-w-4xl mx-auto flex flex-col gap-2 ${className}`}>
      {/* Broadcast Bar */}
      <div className="w-full bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl px-3 sm:px-4 py-2 shadow-2xl flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        {/* Left: Player vs AI Score Table */}
        <div className="flex items-center gap-2 sm:gap-6">
          {/* Player Score */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="relative">
              <span className="font-bold text-xs sm:text-base text-slate-100 uppercase truncate max-w-[110px] inline-block align-bottom">
                {playerLabel}
              </span>
              {currentServer === 'PLAYER' && (
                <span className="absolute -top-1 -right-3 text-xs" title="Sacador Atual">
                  🎾
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-950 px-2 sm:px-3 py-1 rounded-lg border border-slate-800">
              <span className="text-[10px] sm:text-xs text-slate-400 font-semibold">G:</span>
              <span className="text-sm sm:text-base font-black text-amber-400">{playerGames}</span>
              <span className="text-xs text-slate-500 mx-0.5 sm:mx-1">|</span>
              <span className="text-[10px] sm:text-xs text-slate-400 font-semibold">PTS:</span>
              <span className="text-sm sm:text-base font-black text-emerald-400">
                {isTieBreak ? playerTieBreakPoints : playerPoints}
              </span>
            </div>
          </div>

          <span className="text-slate-600 font-bold text-xs sm:text-sm">VS</span>

          {/* AI Score */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="relative">
              <span className="font-bold text-xs sm:text-base text-slate-100 uppercase truncate max-w-[110px] inline-block align-bottom">
                {opponentLabel}
              </span>
              {currentServer === 'AI' && (
                <span className="absolute -top-1 -right-3 text-xs" title="Sacador Atual">
                  🎾
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-950 px-2 sm:px-3 py-1 rounded-lg border border-slate-800">
              <span className="text-[10px] sm:text-xs text-slate-400 font-semibold">G:</span>
              <span className="text-sm sm:text-base font-black text-amber-400">{aiGames}</span>
              <span className="text-xs text-slate-500 mx-0.5 sm:mx-1">|</span>
              <span className="text-[10px] sm:text-xs text-slate-400 font-semibold">PTS:</span>
              <span className="text-sm sm:text-base font-black text-sky-400">
                {isTieBreak ? aiTieBreakPoints : aiPoints}
              </span>
            </div>
          </div>
        </div>

        {/* Center / Right: Rally Info & Action Buttons */}
        <div className="flex items-center gap-3">
          {rallyLength > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-md text-xs text-slate-300 font-medium">
              <span>Trocas:</span>
              <span className="font-bold text-amber-400">{rallyLength}</span>
            </div>
          )}

          {/* Completed Sets Summary (if applicable) */}
          {completedSets.length > 0 && (
            <div className="hidden md:flex items-center gap-1 bg-slate-950/60 px-2 py-1 rounded border border-slate-800 text-[11px] text-slate-400">
              <span>Sets:</span>
              {completedSets.map((s, idx) => (
                <span key={idx} className="font-bold text-slate-200 ml-1">
                  {s.playerGames}-{s.aiGames}
                </span>
              ))}
            </div>
          )}

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            aria-label="Toggle Sound"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Rules Modal Drawer Trigger */}
          <button
            onClick={onOpenRules}
            aria-label="Open Rules Drawer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Folha Rosa</span>
          </button>

          {/* Restart Button */}
          {onRestartMatch && (
            <button
              onClick={onRestartMatch}
              aria-label="Restart Match"
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 transition"
              title="Reiniciar Partida"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Special Badges: No-Ad or Tie-Break */}
      {isNoAdPoint && (
        <div className="w-full py-1.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-400/30 to-amber-500/20 border border-amber-400/60 shadow-lg text-center animate-pulse">
          <span className="text-xs sm:text-sm font-black text-amber-300 tracking-wider uppercase">
            ⚡ PONTO DECISIVO (NO-AD) — QUEM VENCER ESTE PONTO FECHA O GAME!
          </span>
        </div>
      )}

      {isTieBreak && (
        <div className="w-full py-1.5 px-4 rounded-xl bg-gradient-to-r from-sky-500/20 via-cyan-400/30 to-sky-500/20 border border-sky-400/60 shadow-lg text-center">
          <span className="text-xs sm:text-sm font-black text-sky-300 tracking-wider uppercase">
            🎾 TIE-BREAK EM DISPUTA (PRIMEIRO A 7 PONTOS COM +2)
          </span>
        </div>
      )}
    </div>
  );
};

export default ScoreboardHUD;
