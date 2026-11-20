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
  opponentLabel?: string;
  className?: string;
}

export const CardSlot: React.FC<CardSlotProps> = ({
  currentCard,
  previousCard = null,
  declaredAs,
  requiredResponse,
  lastPlayer,
  opponentLabel = 'Máquina (IA)',
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
            className="mb-1.5 z-30"
          >
            <div className="px-3.5 py-0.5 rounded-full bg-[#120d09]/95 border border-[#d6b16b] shadow-[0_0_18px_rgba(214,177,107,0.35)] flex items-center gap-1.5">
              <span className="text-[11px] text-[#d6c2a0] font-bold">Responda com:</span>
              <span className="text-xs font-black tracking-wide text-[#ffd984] uppercase">
                {requiredResponse}
              </span>
              <Sparkles className="w-3 h-3 text-[#ffd984] animate-spin" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center Tabletop Card Stage: Previous Card + Active Played Card */}
      <div className="relative flex items-center justify-center">
        {/* Previous Played Card sitting on the felt to the left */}
        <AnimatePresence mode="popLayout">
          {previousCard && currentCard && previousCard.instanceId !== currentCard.instanceId && (
            <motion.div
              key={`prev_${previousCard.instanceId}`}
              initial={{ opacity: 0, x: 30, scale: 0.7 }}
              animate={{ opacity: 0.9, x: 0, scale: 0.8, rotate: -5 }}
              exit={{ opacity: 0, x: -20, scale: 0.65 }}
              transition={{ type: 'spring', stiffness: 240, damping: 22 }}
              className="hidden md:flex absolute -left-32 top-1/2 -translate-y-1/2 flex-col items-center bg-[#12100e]/85 border border-[#c8a263]/45 rounded-2xl p-1.5 shadow-[0_14px_26px_rgba(0,0,0,0.85)] backdrop-blur-sm z-10"
            >
              <span className="text-[9px] font-black uppercase tracking-wider text-[#d9c4a0] mb-1 px-2 py-0.5 rounded-full bg-[#241c14]">
                Anterior ({previousCard.owner === 'PLAYER' ? 'Você' : opponentLabel})
              </span>
              <CardComponent
                card={previousCard}
                size="sm"
                showDetails={false}
              />
              <ArrowRight className="w-3.5 h-3.5 text-[#e6c178] mt-0.5 animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Played Card on Felt */}
        <div className="relative flex flex-col items-center justify-center">
          <AnimatePresence mode="popLayout">
            {currentCard ? (
              <motion.div
                key={currentCard.instanceId}
                initial={{
                  opacity: 0,
                  y: lastPlayer === 'PLAYER' ? 70 : -70,
                  scale: 0.5,
                  rotate: lastPlayer === 'PLAYER' ? -4 : 4,
                }}
                animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                className="relative flex flex-col items-center p-1.5 rounded-2xl bg-[#100e0c]/80 border border-[#c8a263]/75 shadow-[0_16px_38px_rgba(0,0,0,0.9),0_0_24px_rgba(200,162,99,0.22)] backdrop-blur-sm"
              >
                {/* Subtle Tabletop Glow Behind Active Card */}
                <div
                  className={`absolute -inset-2 rounded-3xl -z-10 blur-lg opacity-50 animate-pulse ${
                    currentCard.definition.isAttack
                      ? 'bg-rose-500/40'
                      : lastPlayer === 'PLAYER'
                      ? 'bg-emerald-500/30'
                      : 'bg-amber-500/30'
                  }`}
                />

                {/* Owner Spotlight Header Badge */}
                <div
                  className={`mb-1 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow ${
                    lastPlayer === 'PLAYER'
                      ? 'bg-emerald-950/85 border-emerald-400/70 text-emerald-200'
                      : 'bg-[#2a1f14]/90 border-[#d6b16b]/70 text-[#f7dfb0]'
                  }`}
                >
                  <span>
                    {lastPlayer === 'PLAYER' ? '⚡ Jogada por: Você' : `🎾 Jogada por: ${opponentLabel}`}
                  </span>
                </div>

                {/* HERO CARD XL (CardComponent untouched) */}
                <CardComponent
                  card={declaredAs ? { ...currentCard, declaredAs } : currentCard}
                  size="xl"
                  showDetails={true}
                />

                {/* 3-Second Visual Persistence Progress Bar */}
                <div className="w-full h-1.5 bg-[#1b1510] rounded-full overflow-hidden mt-1 border border-[#c8a263]/40 shadow-inner">
                  <motion.div
                    key={`timer_${currentCard.instanceId}`}
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 3.0, ease: 'linear' }}
                    className={`h-full ${
                      currentCard.definition.isAttack
                        ? 'bg-gradient-to-r from-orange-500 to-rose-500'
                        : lastPlayer === 'PLAYER'
                        ? 'bg-gradient-to-r from-emerald-400 to-lime-300'
                        : 'bg-gradient-to-r from-[#e5be70] to-[#fff0c2]'
                    }`}
                  />
                </div>
              </motion.div>
            ) : (
              <div className="w-36 h-48 sm:w-40 sm:h-52 rounded-2xl border-2 border-dashed border-[#c8a263]/35 bg-black/30 backdrop-blur-[1px] flex flex-col items-center justify-center text-center p-4 shadow-[inset_0_0_25px_rgba(0,0,0,0.65)]">
                <ArrowDown className="w-6 h-6 text-[#d6b16b]/70 mx-auto mb-2 animate-bounce" />
                <p className="text-xs font-black text-[#e6c88c]/85 tracking-wider uppercase">
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
