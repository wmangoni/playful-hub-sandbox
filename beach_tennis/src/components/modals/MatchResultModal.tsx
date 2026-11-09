import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { PlayerId, ScoreState } from '../../engine/types';
import { Trophy, Frown, RotateCcw } from 'lucide-react';

export interface MatchResultModalProps {
  isOpen: boolean;
  winner: PlayerId;
  finalScore: ScoreState;
  stats?: {
    acesPlayer: number;
    acesAI: number;
    winnersPlayer: number;
    winnersAI: number;
    longestRally: number;
    totalBlueDefenses: number;
  };
  onPlayAgain: () => void;
  onExitToMenu?: () => void;
}

export const MatchResultModal: React.FC<MatchResultModalProps> = ({
  isOpen,
  winner,
  finalScore,
  stats,
  onPlayAgain,
  onExitToMenu,
}) => {
  const isPlayerWinner = winner === 'PLAYER';

  useEffect(() => {
    if (isOpen && isPlayerWinner) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // Fallback for environments where canvas is not supported
      }
    }
  }, [isOpen, isPlayerWinner]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-lg bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl text-center"
      >
        {/* Victory/Defeat Icon */}
        <div
          className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center ${
            isPlayerWinner
              ? 'bg-amber-500/20 border border-amber-400 text-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)]'
              : 'bg-rose-500/20 border border-rose-400 text-rose-400'
          }`}
        >
          {isPlayerWinner ? <Trophy className="w-8 h-8" /> : <Frown className="w-8 h-8" />}
        </div>

        <h2
          className={`text-2xl sm:text-3xl font-black uppercase tracking-wider ${
            isPlayerWinner ? 'text-amber-400' : 'text-rose-400'
          }`}
        >
          {isPlayerWinner ? 'Vitória Espetacular!' : 'Fim de Jogo — Derrota'}
        </h2>
        <p className="text-sm text-slate-300 mt-1 mb-6">
          {isPlayerWinner
            ? 'Você dominou as areias e venceu a partida contra a IA!'
            : 'A máquina levou a melhor desta vez. Ajuste sua estratégia e tente novamente!'}
        </p>

        {/* Final Score Snapshot */}
        <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 mb-6 flex justify-around items-center">
          <div className="text-center">
            <span className="text-xs text-slate-400 font-bold uppercase">Você</span>
            <div className="text-3xl font-black text-amber-400">{finalScore.playerGames}</div>
          </div>
          <span className="text-slate-600 font-black text-xl">X</span>
          <div className="text-center">
            <span className="text-xs text-slate-400 font-bold uppercase">Máquina (IA)</span>
            <div className="text-3xl font-black text-sky-400">{finalScore.aiGames}</div>
          </div>
        </div>

        {/* Detailed Match Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-2 text-left mb-6 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="text-slate-400">
              Aces (Você / IA):{' '}
              <strong className="text-slate-200">
                {stats.acesPlayer} / {stats.acesAI}
              </strong>
            </div>
            <div className="text-slate-400">
              Winners (Você / IA):{' '}
              <strong className="text-slate-200">
                {stats.winnersPlayer} / {stats.winnersAI}
              </strong>
            </div>
            <div className="text-slate-400">
              Maior Rally:{' '}
              <strong className="text-amber-400">{stats.longestRally} trocas</strong>
            </div>
            <div className="text-slate-400">
              Defesas Azuis:{' '}
              <strong className="text-sky-400">{stats.totalBlueDefenses} cartas</strong>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onPlayAgain}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Jogar Novamente</span>
          </button>
          {onExitToMenu && (
            <button
              onClick={onExitToMenu}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition cursor-pointer"
            >
              Menu
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default MatchResultModal;
