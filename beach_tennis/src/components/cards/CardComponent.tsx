import React from 'react';
import { motion } from 'framer-motion';
import type { CardDefinition, CardInstance, CardType, RequiredResponse } from '../../engine/types';
import { CardIllustration } from './CardIllustration';
import { Flame, Feather, Activity, ShieldAlert, ArrowUp, Crown } from 'lucide-react';

export interface CardComponentProps {
  card: CardInstance | CardDefinition;
  isPlayable?: boolean;
  isDisabled?: boolean;
  isSelected?: boolean;
  isFaceDown?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showDetails?: boolean;
  onClick?: () => void;
  className?: string;
}

export const CardComponent: React.FC<CardComponentProps> = ({
  card,
  isPlayable = false,
  isDisabled = false,
  isSelected = false,
  isFaceDown = false,
  size = 'md',
  showDetails = true,
  onClick,
  className = '',
}) => {
  // Extract definition and possible runtime declaredAs
  const def: CardDefinition = 'definition' in card ? card.definition : card;
  const declaredAs: CardType | undefined = 'declaredAs' in card ? card.declaredAs : undefined;

  // Responsive size styles (with full-art 70% image ratio & Hero Spotlight size="xl")
  const sizeStyles = {
    sm: {
      container: 'w-24 h-36 rounded-xl text-xs',
      imageH: 'h-20',
      title: 'text-[10px] leading-tight font-black tracking-tight',
      badge: 'text-[8px] px-1.5 py-0.5',
      corner: 'w-2.5 h-2.5',
    },
    md: {
      container: 'w-36 h-52 rounded-xl text-sm',
      imageH: 'h-32',
      title: 'text-[11px] font-black leading-tight tracking-tight',
      badge: 'text-[9px] px-2 py-0.5',
      corner: 'w-3 h-3',
    },
    lg: {
      container: 'w-48 h-72 rounded-xl text-base',
      imageH: 'h-48',
      title: 'text-sm font-black tracking-tight',
      badge: 'text-xs px-2.5 py-1',
      corner: 'w-3.5 h-3.5',
    },
    xl: {
      container: 'w-40 h-56 sm:w-44 sm:h-56 rounded-xl text-sm',
      imageH: 'h-32 sm:h-36',
      title: 'text-xs sm:text-sm font-black tracking-tight',
      badge: 'text-[10px] sm:text-xs px-2 py-0.5',
      corner: 'w-3.5 h-3.5',
    },
  }[size];

  // Multi-Layered Seinen Manga TCG Frame styling
  const getColorClasses = () => {
    if (def.isWildcard) {
      return {
        border: 'border-amber-400 bg-gradient-to-b from-amber-950/95 via-slate-900 to-amber-950/95',
        glow: 'shadow-[0_0_24px_rgba(251,191,36,0.65)]',
        header: 'text-amber-300',
        ribbon: 'bg-gradient-to-r from-amber-600/90 via-yellow-500/90 to-amber-600/90 text-slate-950 border-amber-300',
        corner: 'border-amber-300',
      };
    }
    switch (def.color) {
      case 'ORANGE':
        return {
          border: 'border-orange-500 bg-gradient-to-b from-orange-950/95 via-slate-950 to-orange-950/95',
          glow: 'shadow-[0_0_20px_rgba(249,115,22,0.55)]',
          header: 'text-orange-400',
          ribbon: 'bg-gradient-to-r from-orange-600/95 via-amber-500/95 to-orange-600/95 text-slate-950 border-orange-300',
          corner: 'border-orange-400',
        };
      case 'BLUE':
        return {
          border: 'border-blue-500 bg-gradient-to-b from-blue-950/95 via-slate-950 to-blue-950/95',
          glow: 'shadow-[0_0_20px_rgba(37,99,235,0.55)]',
          header: 'text-blue-400',
          ribbon: 'bg-gradient-to-r from-blue-700/95 via-sky-600/95 to-cyan-500/95 text-white border-sky-300',
          corner: 'border-sky-400',
        };
      case 'GREEN':
      default:
        return def.isAttack
          ? {
              border: 'border-emerald-500 bg-gradient-to-b from-rose-950/95 via-slate-950 to-emerald-950/95',
              glow: 'shadow-[0_0_24px_rgba(244,63,94,0.65)]',
              header: 'text-emerald-400',
              ribbon: 'bg-gradient-to-r from-rose-700/95 via-red-600/95 to-amber-600/95 text-white border-rose-300',
              corner: 'border-rose-400',
            }
          : {
              border: 'border-emerald-500 bg-gradient-to-b from-emerald-950/95 via-slate-950 to-emerald-950/95',
              glow: 'shadow-[0_0_20px_rgba(16,185,129,0.55)]',
              header: 'text-emerald-400',
              ribbon: 'bg-gradient-to-r from-emerald-700/95 via-emerald-600/95 to-teal-500/95 text-white border-emerald-300',
              corner: 'border-emerald-400',
            };
    }
  };

  const theme = getColorClasses();

  // Helper for Response Badges
  const renderResponseBadge = (response?: RequiredResponse) => {
    if (!response) return null;
    switch (response) {
      case 'BANDEJAS':
        return (
          <span className={`inline-flex items-center gap-1 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 ${sizeStyles.badge}`}>
            <Feather className="w-3 h-3" />
            <span>BANDEJAS</span>
          </span>
        );
      case 'VOLEIOS':
        return (
          <span className={`inline-flex items-center gap-1 rounded-full font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 ${sizeStyles.badge}`}>
            <Activity className="w-3 h-3" />
            <span>VOLEIOS</span>
          </span>
        );
      case 'DEFESAS':
        return (
          <span className={`inline-flex items-center gap-1 rounded-full font-bold bg-rose-500/25 text-rose-300 border border-rose-500/50 ${sizeStyles.badge}`}>
            <ShieldAlert className="w-3 h-3" />
            <span>DEFESA (AZUL)</span>
          </span>
        );
      case 'FUNDO':
        return (
          <span className={`inline-flex items-center gap-1 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 ${sizeStyles.badge}`}>
            <ArrowUp className="w-3 h-3" />
            <span>FUNDO</span>
          </span>
        );
    }
  };

  // Face-down card rendering (Deck or AI Hand)
  if (isFaceDown) {
    return (
      <div
        className={`relative ${sizeStyles.container} border-2 border-slate-700 bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 shadow-xl flex flex-col items-center justify-center p-2 select-none overflow-hidden ${className}`}
      >
        <div className="w-full h-full border border-sky-500/30 rounded-md flex flex-col items-center justify-center relative">
          <div className="w-10 h-10 rounded-full border border-sky-400/50 bg-sky-500/10 flex items-center justify-center text-sky-400 font-black text-sm">
            UBT
          </div>
          <span className="text-[10px] tracking-widest text-sky-400/80 font-bold mt-2 uppercase">
            Beach Tennis
          </span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={!isDisabled && isPlayable ? { y: -10, scale: 1.05 } : {}}
      whileTap={!isDisabled && isPlayable ? { scale: 0.98 } : {}}
      onClick={!isDisabled && isPlayable ? onClick : undefined}
      className={`relative ${sizeStyles.container} border-2 ${theme.border} ${theme.glow} ${
        isPlayable ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900 cursor-pointer' : ''
      } ${isSelected ? 'ring-4 ring-amber-400 shadow-2xl scale-105' : ''} ${
        isDisabled ? 'opacity-40 grayscale-[50%] cursor-not-allowed' : ''
      } flex flex-col p-1.5 select-none overflow-hidden transition-all duration-200 ${className}`}
    >
      {/* Metallic Manga Bevel Corners */}
      <div className={`
        absolute top-0.5 left-0.5 ${sizeStyles.corner} border-t-2 border-l-2 ${theme.corner} rounded-tl-md pointer-events-none z-20
      `} />
      <div className={`
        absolute top-0.5 right-0.5 ${sizeStyles.corner} border-t-2 border-r-2 ${theme.corner} rounded-tr-md pointer-events-none z-20
      `} />
      <div className={`
        absolute bottom-0.5 left-0.5 ${sizeStyles.corner} border-b-2 border-l-2 ${theme.corner} rounded-bl-md pointer-events-none z-20
      `} />
      <div className={`
        absolute bottom-0.5 right-0.5 ${sizeStyles.corner} border-b-2 border-r-2 ${theme.corner} rounded-br-md pointer-events-none z-20
      `} />

      {/* Prismatic Foil Shimmer for Wildcards */}
      {def.isWildcard && (
        <div className="absolute inset-0 pointer-events-none z-20 bg-[linear-gradient(125deg,transparent_30%,rgba(251,191,36,0.22)_50%,transparent_70%)] animate-pulse" />
      )}

      {/* Angled Seinen Manga Ribbon Header */}
      <div className={`flex items-center justify-between gap-1 mb-1 px-2 py-0.5 rounded-md border -skew-x-6 shadow-md z-10 ${theme.ribbon}`}>
        <h4 className={`${sizeStyles.title} ${theme.header} !text-current uppercase truncate skew-x-6`}>
          {def.name}
        </h4>
        <div className="skew-x-6 flex items-center flex-shrink-0">
          {def.isWildcard ? (
            <Crown className="w-3.5 h-3.5 text-amber-200 flex-shrink-0 drop-shadow" />
          ) : def.isAttack ? (
            <Flame className="w-3.5 h-3.5 text-amber-200 flex-shrink-0 animate-pulse drop-shadow" />
          ) : null}
        </div>
      </div>

      {/* Dominant Full-Art Window (Seinen Manga Ink Grading & Vignette) */}
      <div className={`relative w-full ${sizeStyles.imageH} flex-1 rounded-lg overflow-hidden bg-slate-950 border border-slate-700/90 shadow-inner`}>
        <CardIllustration
          card={def}
          forceVector={false}
          className="contrast-[1.12] saturate-[1.12] scale-[1.03]"
        />

        {/* Manga Halftone & Ink Vignette Overlay */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_18px_rgba(2,6,23,0.75)]" />

        {/* Radial Manga Speedlines on Attack Cards */}
        {def.isAttack && (
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,transparent_52%,rgba(244,63,94,0.28)_100%)]" />
        )}

        {/* Declared overlay if wildcard */}
        {declaredAs && (
          <div className="absolute inset-x-0 bottom-0 bg-amber-950/95 text-amber-300 text-[10px] font-black py-0.5 text-center border-t border-amber-400/70 uppercase tracking-wide z-10">
            Decl: {declaredAs.replace(/_/g, ' ')}
          </div>
        )}
      </div>

      {/* Tactical Beveled Bottom Rule Plate */}
      {showDetails && (
        <div className="mt-1 pt-1 pb-0.5 px-1 rounded-md bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-1 z-10">
          <span className="text-[8px] text-slate-400 uppercase tracking-tighter font-extrabold">
            {def.color === 'ORANGE' ? `Zona ${def.serveNumber}` : 'Exige:'}
          </span>
          {renderResponseBadge(def.requiredResponse)}
        </div>
      )}
    </motion.div>
  );
};

export default CardComponent;
