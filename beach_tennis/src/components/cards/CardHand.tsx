import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CardInstance } from '../../engine/types';
import { CardComponent } from './CardComponent';

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
    <div className={`relative flex items-center justify-center px-2 sm:px-4 pt-3 pb-1 min-h-[9.5rem] sm:min-h-[10.5rem] ${className}`}>
      {/* Turn status indicator tag */}
      {!isAI && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap">
          <span
            className={`text-[10px] sm:text-xs font-black px-3.5 py-0.5 rounded-full shadow-lg uppercase tracking-wider border -skew-x-6 inline-block ${
              isPlayerTurn
                ? 'bg-emerald-500 text-slate-950 border-emerald-300 animate-pulse'
                : 'bg-slate-900/95 text-slate-300 border-slate-700'
            }`}
          >
            {isPlayerTurn ? 'Sua Vez de Jogar' : 'Aguardando Oponente...'}
          </span>
        </div>
      )}

      {/* Fan-out layout container (responsive scale on mobile & laptop so 6 cards fit without vertical overflow) */}
      <div className="flex items-center justify-center -space-x-10 xs:-space-x-8 sm:-space-x-4 pb-0.5 scale-[0.76] xs:scale-[0.84] sm:scale-[0.88] origin-bottom">
        <AnimatePresence>
          {cards.map((card, index) => {
            const isPlayable = !isAI && isPlayerTurn && legalIdsSet.has(card.instanceId);
            const isDisabled = !isAI && (!isPlayerTurn || !isPlayable);

            // Subtle natural card fan curvature without pushing cards down off screen
            const middle = (totalCards - 1) / 2;
            const offset = index - middle;
            const rotation = offset * 2.5;
            const translateY = Math.abs(offset) * 2;

            return (
              <motion.div
                key={card.instanceId}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.85 }}
                animate={{
                  opacity: 1,
                  y: isPlayable ? translateY - 14 : translateY - 4,
                  rotate: rotation,
                  scale: 1,
                }}
                exit={{ opacity: 0, y: -40, scale: 0.7 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
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
    </div>
  );
};

export default CardHand;
