import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CardInstance, CardType, PlayerId, RequiredResponse } from '../../engine/types';
import { CardComponent } from './CardComponent';
import { Sparkles, ArrowDown, ArrowRight } from 'lucide-react';

export interface CardSlotProps {
  currentCard: CardInstance | null;
  previousCard?: CardInstance | null;
  declaredAs?: CardType;
  requiredResponse: RequiredResponse | null;
  lastPlayer: PlayerId | null;
  className?: string;
}

export const CardSlot: React.FC<CardSlotProps> = ({
  currentCard,
  previousCard = null,
  declaredAs,
  requiredResponse,
  lastPlayer,
  className = '',
}) => {
  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      {/* Response Requirement Banner */}
      <AnimatePresence mode="wait">
        {requiredResponse && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="mb-1 z-30"
          >
            <div className="px-3.5 py-0.5 rounded-full bg-slate-950/95 border-2 border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.4)] flex items-center gap-1.5 -skew-x-6">
              <span className="text-[11px] text-slate-300 font-bold skew-x-6">Responda com:</span>
              <span className="text-xs font-black tracking-wide text-amber-400 uppercase skew-x-6">
                {requiredResponse}
              </span>
              <Sparkles className="w-3 h-3 text-amber-400 animate-spin skew-x-6" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Spotlight Stage: Previous Card Floating Left + Giant XL Hero Card Center */}
      <div className="relative flex items-center justify-center">
        {/* Previous Played Card (Floating satellite on left so Hero Card stays 100% centered and huge) */}
        <AnimatePresence mode="popLayout">
          {previousCard && currentCard && previousCard.instanceId !== currentCard.instanceId && (
            <motion.div
              key={`prev_${previousCard.instanceId}`}
              initial={{ opacity: 0, x: 30, scale: 0.7 }}
              animate={{ opacity: 0.9, x: 0, scale: 0.82, rotate: -4 }}
              exit={{ opacity: 0, x: -20, scale: 0.65 }}
              transition={{ type: 'spring', stiffness: 240, damping: 22 }}
              className="hidden md:flex absolute -left-32 top-1/2 -translate-y-1/2 flex-col items-center bg-slate-950/85 border border-slate-700 rounded-2xl p-1.5 shadow-2xl backdrop-blur-md z-10"
            >
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-300 mb-1 px-2 py-0.5 rounded-full bg-slate-800">
                Anterior ({previousCard.owner === 'PLAYER' ? 'Você' : 'IA'})
              </span>
              <CardComponent
                card={previousCard}
                size="sm"
                showDetails={false}
              />
              <ArrowRight className="w-3.5 h-3.5 text-amber-400 mt-0.5 animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Giant Hero Spotlight Card Slot (size="xl") */}
        <div className="relative flex flex-col items-center justify-center">
          <AnimatePresence mode="popLayout">
            {currentCard ? (
              <motion.div
                key={currentCard.instanceId}
                initial={{
                  opacity: 0,
                  y: lastPlayer === 'PLAYER' ? 70 : -70,
                  scale: 0.5,
                  rotate: lastPlayer === 'PLAYER' ? -5 : 5,
                }}
                animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                className="relative flex flex-col items-center p-1.5 rounded-2xl bg-slate-950/90 border-2 border-amber-400/80 shadow-[0_0_32px_rgba(251,191,36,0.45)] backdrop-blur-md"
              >
                {/* Explosive Manga Aura Glow Behind Hero Card */}
                <div
                  className={`absolute -inset-2 rounded-3xl -z-10 blur-lg opacity-65 animate-pulse ${
                    currentCard.definition.isAttack
                      ? 'bg-rose-500/45'
                      : lastPlayer === 'PLAYER'
                      ? 'bg-emerald-500/35'
                      : 'bg-sky-500/35'
                  }`}
                />

                {/* Owner Spotlight Header Badge */}
                <div
                  className={`mb-1 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow -skew-x-6 ${
                    lastPlayer === 'PLAYER'
                      ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                      : 'bg-sky-500/30 border-sky-400 text-sky-200'
                  }`}
                >
                  <span className="inline-block skew-x-6">
                    {lastPlayer === 'PLAYER' ? '⚡ Jogada por: Você' : '🤖 Jogada por: Máquina (IA)'}
                  </span>
                </div>

                {/* HERO CARD XL (Huge Artwork Window) */}
                <CardComponent
                  card={declaredAs ? { ...currentCard, declaredAs } : currentCard}
                  size="xl"
                  showDetails={true}
                />

                {/* 3-Second Visual Persistence Progress Bar */}
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-1 border border-slate-700 shadow-inner">
                  <motion.div
                    key={`timer_${currentCard.instanceId}`}
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 3.0, ease: 'linear' }}
                    className={`h-full ${
                      currentCard.definition.isAttack
                        ? 'bg-gradient-to-r from-orange-500 to-rose-500'
                        : lastPlayer === 'PLAYER'
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-300'
                        : 'bg-gradient-to-r from-amber-400 to-yellow-300'
                    }`}
                  />
                </div>
              </motion.div>
            ) : (
              <div className="w-40 h-52 rounded-2xl border-2 border-dashed border-sky-400/40 bg-slate-950/50 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 shadow-inner">
                <ArrowDown className="w-6 h-6 text-amber-400/70 mx-auto mb-2 animate-bounce" />
                <p className="text-xs font-black text-amber-300/80 tracking-wider uppercase">
                  Aguardando Saque / Golpe
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default CardSlot;
