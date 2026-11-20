import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { CardType, RequiredResponse } from '../../engine/types';
import { CARDS_CATALOG } from '../../engine/cardsCatalog';
import { Crown, Check } from 'lucide-react';

export interface CoringaModalProps {
  isOpen: boolean;
  wildcardType: 'DEF_UBT_CORINGA' | 'GOLPE_UBT_CORINGA';
  currentRequiredResponse?: RequiredResponse | null;
  allowedCards: CardType[];
  onConfirmDeclaration: (declaredType: CardType) => void;
  onCancel?: () => void;
}

export const CoringaModal: React.FC<CoringaModalProps> = ({
  isOpen,
  wildcardType,
  currentRequiredResponse,
  allowedCards,
  onConfirmDeclaration,
  onCancel,
}) => {
  const [selected, setSelected] = useState<CardType | null>(allowedCards[0] || null);

  useEffect(() => {
    if (isOpen) {
      setSelected((prev) => (prev && allowedCards.includes(prev) ? prev : allowedCards[0] || null));
    }
  }, [isOpen, allowedCards]);

  if (!isOpen) return null;

  const isGreen = wildcardType === 'GOLPE_UBT_CORINGA';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        className="w-full max-w-xl bg-slate-900 border-2 border-amber-400/60 rounded-3xl p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-amber-400 uppercase tracking-wide">
              {isGreen ? 'Declarar Golpe do Coringa Verde' : 'Declarar Defesa do Coringa Azul'}
            </h3>
            <p className="text-xs text-slate-300">
              {isGreen
                ? `Substitui qualquer golpe de [${currentRequiredResponse || 'Rali'}]. Declare o golpe executado:`
                : 'Defesa concluída! Declare como a bola volta para o oponente:'}
            </p>
          </div>
        </div>

        {/* Declaration Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1 my-4">
          {allowedCards.map((type) => {
            const def = CARDS_CATALOG[type];
            const isSelected = selected === type;

            return (
              <div
                key={type}
                onClick={() => setSelected(type)}
                className={`p-3 rounded-xl border-2 cursor-pointer transition flex items-center justify-between ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/20 shadow-md'
                    : 'border-slate-800 bg-slate-800/60 hover:border-slate-700'
                }`}
              >
                <div>
                  <h4 className="text-xs font-black text-slate-100">{def?.name || type}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Exige do rival: <strong className="text-amber-300">{def?.requiredResponse || 'N/A'}</strong>
                  </p>
                </div>
                {isSelected && <Check className="w-4 h-4 text-amber-400" />}
              </div>
            );
          })}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 mt-6">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition"
            >
              Cancelar
            </button>
          )}
          <button
            disabled={!selected}
            onClick={() => selected && onConfirmDeclaration(selected)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg hover:from-amber-400 hover:to-yellow-300 transition cursor-pointer disabled:opacity-50"
          >
            Confirmar Declaração
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default CoringaModal;
