import React from 'react';
import { motion } from 'framer-motion';
import type { CardInstance, DigResult } from '../../engine/types';
import { CardComponent } from '../cards/CardComponent';
import { Pickaxe, CheckCircle2, XCircle } from 'lucide-react';

export interface DigResultModalProps {
  isOpen: boolean;
  digResult: DigResult | null;
  onPlayDrawnCard: (card: CardInstance) => void;
  onDigAgain: () => void;
  onClose: () => void;
}

export const DigResultModal: React.FC<DigResultModalProps> = ({
  isOpen,
  digResult,
  onPlayDrawnCard,
  onDigAgain,
  onClose,
}) => {
  if (!isOpen || !digResult) return null;

  const { drawnCard, attemptNumber, isValid, canDigAgain, pointLost } =
    digResult;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-md bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-6 shadow-2xl text-center"
      >
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
          <Pickaxe className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-black text-emerald-400 uppercase tracking-wide">
          Cavação no Monte Verde — Tentativa {attemptNumber} de 2
        </h3>

        {/* Drawn Card Display */}
        <div className="my-5 flex justify-center">
          {drawnCard ? (
            <CardComponent card={drawnCard} size="md" showDetails={true} />
          ) : (
            <div className="p-4 rounded-xl bg-slate-800 text-rose-400 text-xs font-bold">
              Monte Verde Esgotado!
            </div>
          )}
        </div>

        {/* Feedback message */}
        {isValid ? (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 mb-4">
            <CheckCircle2 className="w-4 h-4" />
            <span>Carta compatível! Obrigatório jogar imediatamente.</span>
          </div>
        ) : pointLost ? (
          <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 mb-4">
            <XCircle className="w-4 h-4" />
            <span>Falha na 2ª tentativa! Ponto do oponente (Winner).</span>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 mb-4">
            <XCircle className="w-4 h-4" />
            <span>Carta incompatível! Guardada na mão para próxima rodada.</span>
          </div>
        )}

        {/* Action Button */}
        {isValid && drawnCard && (
          <button
            onClick={() => onPlayDrawnCard(drawnCard)}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition cursor-pointer"
          >
            Jogar Carta na Quadra
          </button>
        )}

        {!isValid && canDigAgain && (
          <button
            onClick={onDigAgain}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition cursor-pointer"
          >
            Cavar 2ª Tentativa
          </button>
        )}

        {pointLost && (
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Continuar
          </button>
        )}
      </motion.div>
    </div>
  );
};

export default DigResultModal;
