import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CardInstance } from '../../engine/types';
import { CardComponent } from './CardComponent';
import { PlayerHandThumbOverlay } from '../tabletop/TabletopArtwork';

export interface CardHandProps {
  cards: CardInstance[];
  playableCardIds?: Set<string> | string[];
  isPlayerTurn: boolean;
  isAI?: boolean;
  onPlayCard?: (card: CardInstance) => void;
  className?: string;
}

export const CardHand: React.FC<CardHandProps> = ({
  cards,
  playableCardIds,
  isPlayerTurn,
  isAI = false,
  onPlayCard,
  className = '',
}) => {
  const legalIdsSet = React.useMemo(() => {
    if (!playableCardIds) return new Set<string>();
    return playableCardIds instanceof Set ? playableCardIds : new Set(playableCardIds);
  }, [playableCardIds]);

  const totalCards = cards.length;

  return (
    <div
      className={`relative flex items-end justify-center px-2 sm:px-4 pt-5 pb-2 min-h-[11rem] sm:min-h-[12.5rem] ${className}`}
    >
      {/* Turn status indicator tag */}
      {!isAI && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-40 whitespace-nowrap">
          <span
            className={`text-[10px] sm:text-xs font-black px-4 py-0.5 rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.75)] uppercase tracking-wider border inline-block ${
              isPlayerTurn
                ? 'bg-gradient-to-r from-lime-400 to-emerald-400 text-slate-950 border-lime-200 animate-pulse'
                : 'bg-[#17110c]/95 text-[#d6be96] border-[#c8a263]/60'
            }`}
          >
            {isPlayerTurn ? 'Sua Vez de Jogar' : 'Aguardando Oponente...'}
          </span>
        </div>
      )}

      {/* First-person curved fan-out layout (CardComponent untouched) */}
      <div className="relative flex items-end justify-center -space-x-10 xs:-space-x-7 sm:-space-x-2 pb-3 scale-[0.76] xs:scale-[0.84] sm:scale-[0.94] origin-bottom">
        <AnimatePresence>
          {cards.map((card, index) => {
            const isPlayable = !isAI && isPlayerTurn && legalIdsSet.has(card.instanceId);
            const isDisabled = !isAI && (!isPlayerTurn || !isPlayable);

            // Natural wide fan arc matching the first-person tabletop perspective
            const middle = (totalCards - 1) / 2;
            const offset = index - middle;
            const maxSpreadDeg = totalCards > 8 ? Math.max(1.2, 24 / totalCards) : 4.2;
            const rotation = offset * maxSpreadDeg;
            const translateY = Math.min(26, Math.abs(offset) * Math.abs(offset) * 1.8);

            return (
              <motion.div
                key={card.instanceId}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.85 }}
                animate={{
                  opacity: 1,
                  y: isPlayable ? translateY - 16 : translateY - 2,
                  rotate: rotation,
                  scale: 1,
                }}
                whileHover={
                  isPlayable
                    ? { y: translateY - 34, scale: 1.06, zIndex: 50 }
                    : undefined
                }
                exit={{ opacity: 0, y: -50, scale: 0.7 }}
                transition={{ type: 'spring', stiffness: 340, damping: 24 }}
                className="relative"
                style={{ zIndex: index + 1 }}
              >
                <CardComponent
                  card={card}
                  isPlayable={isPlayable}
                  isDisabled={isDisabled}
                  isFaceDown={isAI}
                  size="md"
                  onClick={() => onPlayCard && onPlayCard(card)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* First-person player thumb gripping the bottom center of the card fan */}
      {!isAI && totalCards > 0 && (
        <PlayerHandThumbOverlay className="absolute -bottom-5 sm:-bottom-6 left-1/2 -translate-x-1/2 w-40 sm:w-52 z-30" />
      )}
    </div>
  );
};

export default CardHand;
