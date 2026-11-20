import React from 'react';
import { motion } from 'framer-motion';
import type { ServeNumber } from '../../engine/types';
import { CoffeeCupProp, GoldenEyeMedallion } from '../tabletop/TabletopArtwork';
import { assetUrl } from '../../utils/assetUrl';

export interface CourtProps {
  children?: React.ReactNode;
  activeServeZone?: ServeNumber | null;
  ballPosition?: 'TOP' | 'NET' | 'BOTTOM' | 'CENTER';
  isShaking?: boolean;
  onOpenRules?: () => void;
  className?: string;
}

export const Court: React.FC<CourtProps> = ({
  children,
  activeServeZone,
  ballPosition = 'CENTER',
  isShaking = false,
  onOpenRules,
  className = '',
}) => {
  const woodTextureUrl = assetUrl('/assets/table/wood-texture.png');
  const feltTextureUrl = assetUrl('/assets/table/felt-texture.png');

  return (
    <motion.div
      animate={isShaking ? { x: [-4, 4, -4, 4, 0], y: [-2, 2, -2, 2, 0] } : {}}
      transition={{ duration: 0.3 }}
      className={`relative w-full max-w-6xl mx-auto min-h-[24rem] sm:min-h-[27.5rem] lg:min-h-[29.5rem] flex flex-col justify-between select-none ${className}`}
    >
      {/* ===================================================================== */}
      {/* TRUE 3D PERSPECTIVE TRAPEZOID WOODEN-FRAMED BLACK FELT CARD TABLE     */}
      {/* ===================================================================== */}
      <svg
        viewBox="0 0 1200 560"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-[0_26px_45px_rgba(0,0,0,0.85)]"
        aria-hidden="true"
      >
        <defs>
          {/* Real honey-oak wood grain pattern */}
          <pattern
            id="oakWoodPattern"
            patternUnits="userSpaceOnUse"
            width="512"
            height="256"
          >
            <image
              href={woodTextureUrl}
              width="512"
              height="256"
              preserveAspectRatio="none"
            />
          </pattern>

          {/* Real charcoal-black wool felt pattern */}
          <pattern
            id="blackFeltPattern"
            patternUnits="userSpaceOnUse"
            width="320"
            height="320"
          >
            <image
              href={feltTextureUrl}
              width="320"
              height="320"
              preserveAspectRatio="none"
            />
          </pattern>

          {/* Warm sunlit bevel lighting for wooden rails */}
          <linearGradient id="topRailLight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fff1cf" stopOpacity="0.48" />
            <stop offset="55%" stopColor="#d99a4a" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#3b1d07" stopOpacity="0.42" />
          </linearGradient>

          <linearGradient id="leftRailLight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2a1305" stopOpacity="0.42" />
            <stop offset="45%" stopColor="#ffdfa3" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2c1506" stopOpacity="0.5" />
          </linearGradient>

          <linearGradient id="rightRailLight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2c1506" stopOpacity="0.5" />
            <stop offset="55%" stopColor="#ffdfa3" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2a1305" stopOpacity="0.42" />
          </linearGradient>

          <linearGradient id="bottomRailLight" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffe8ba" stopOpacity="0.38" />
            <stop offset="55%" stopColor="#d18b3a" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#291204" stopOpacity="0.45" />
          </linearGradient>

          <linearGradient id="frontApronGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8f5322" />
            <stop offset="55%" stopColor="#5c3111" />
            <stop offset="100%" stopColor="#2b1406" />
          </linearGradient>

          {/* Overhead warm cafe lamp lighting on the felt */}
          <radialGradient id="feltSpotlight" cx="50%" cy="42%" r="64%">
            <stop offset="0%" stopColor="#fff1d4" stopOpacity="0.09" />
            <stop offset="58%" stopColor="#0f1012" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.72" />
          </radialGradient>

          {/* Recessed drop shadow cast by upper/side oak rails onto the felt */}
          <linearGradient id="feltTopShadow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.72" />
            <stop offset="14%" stopColor="#000000" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 1. 3D Front Wooden Apron / Tabletop Thickness facing player */}
        <polygon
          points="8,524 1192,524 1184,554 16,554"
          fill="url(#frontApronGrad)"
          stroke="#220f04"
          strokeWidth="2"
        />

        {/* 2. Top Horizontal Oak Rail (narrower far edge in perspective) */}
        <polygon points="150,8 1050,8 1020,38 180,38" fill="url(#oakWoodPattern)" />
        <polygon points="150,8 1050,8 1020,38 180,38" fill="url(#topRailLight)" />

        {/* 3. Left Flaring Oak Rail (diagonally widening toward player) */}
        <polygon points="150,8 180,38 56,488 8,524" fill="url(#oakWoodPattern)" />
        <polygon points="150,8 180,38 56,488 8,524" fill="url(#leftRailLight)" />

        {/* 4. Right Flaring Oak Rail (diagonally widening toward player) */}
        <polygon points="1050,8 1192,524 1144,488 1020,38" fill="url(#oakWoodPattern)" />
        <polygon points="1050,8 1192,524 1144,488 1020,38" fill="url(#rightRailLight)" />

        {/* 5. Bottom Horizontal Oak Rail (thick foreground rim) */}
        <polygon points="8,524 56,488 1144,488 1192,524" fill="url(#oakWoodPattern)" />
        <polygon points="8,524 56,488 1144,488 1192,524" fill="url(#bottomRailLight)" />

        {/* 6. Crisp 45-degree Mitered Wood Join Lines & Outer Bevel Rim */}
        <g stroke="#4b270d" strokeWidth="1.8" opacity="0.75">
          <line x1="150" y1="8" x2="180" y2="38" />
          <line x1="1050" y1="8" x2="1020" y2="38" />
          <line x1="8" y1="524" x2="56" y2="488" />
          <line x1="1192" y1="524" x2="1144" y2="488" />
        </g>
        <polygon
          points="150,8 1050,8 1192,524 8,524"
          fill="none"
          stroke="#f5d398"
          strokeWidth="2"
          opacity="0.5"
        />

        {/* 7. Inner Recessed Dark Lip */}
        <polygon
          points="177,36 1023,36 1148,491 52,491"
          fill="#1b0e05"
          stroke="#090502"
          strokeWidth="3"
        />

        {/* 8. Trapezoid Matte Charcoal-Black Wool Felt Playing Surface */}
        <polygon points="183,41 1017,41 1140,485 60,485" fill="#141517" />
        <polygon points="183,41 1017,41 1140,485 60,485" fill="url(#blackFeltPattern)" opacity="0.92" />
        <polygon points="183,41 1017,41 1140,485 60,485" fill="url(#feltSpotlight)" />
        <polygon points="183,41 1017,41 1140,485 60,485" fill="url(#feltTopShadow)" />

        {/* Inner gold-lit bevel highlight along bottom felt rim */}
        <polyline
          points="60,485 1140,485"
          fill="none"
          stroke="#f0c884"
          strokeWidth="1.5"
          opacity="0.35"
        />
      </svg>

      {/* ===================================================================== */}
      {/* TABLETOP PROPS (Matching Reference Placement)                         */}
      {/* ===================================================================== */}
      {/* Porcelain Coffee Cup perched right on the top-left wooden corner */}
      <CoffeeCupProp className="hidden sm:block absolute -top-9 left-[13%] sm:left-[14.5%] w-24 sm:w-28 z-30" />

      {/* Golden Eye Medallion inside the top-right corner of the black felt */}
      <div className="hidden sm:block absolute top-5 sm:top-6 right-[16%] sm:right-[17%] z-30">
        <GoldenEyeMedallion onClick={onOpenRules} />
      </div>

      {/* ===================================================================== */}
      {/* PERSPECTIVE-PROJECTED BEACH TENNIS FELT MARKINGS                      */}
      {/* ===================================================================== */}
      <div
        className="absolute inset-x-[15%] sm:inset-x-[16%] top-[9%] bottom-[13%] pointer-events-none flex flex-col justify-between"
        style={{
          transform: 'perspective(820px) rotateX(18deg)',
          transformOrigin: '50% 50%',
        }}
      >
        {/* Top Half: AI Zone */}
        <div className="relative flex-1 flex flex-col justify-start pt-1">
          <div className="absolute top-0 left-2 text-[9px] font-bold tracking-widest text-[#d4b072]/45 uppercase">
            Quadra IA
          </div>
          <div className="w-3/5 sm:w-1/2 mx-auto grid grid-cols-3 h-7 border-b border-[#c8a263]/20 text-center">
            {([1, 2, 3] as ServeNumber[]).map((zone) => (
              <div
                key={zone}
                className={`flex items-center justify-center border-r last:border-r-0 border-[#c8a263]/20 text-[10px] font-bold transition-colors ${
                  activeServeZone === zone
                    ? 'bg-amber-400/25 text-amber-200 font-black rounded-sm'
                    : 'text-[#d4b072]/40'
                }`}
              >
                Zona {zone}
              </div>
            ))}
          </div>
        </div>

        {/* Subtle Tabletop Net Divider Line */}
        <div className="relative w-full h-5 flex items-center justify-between px-4 opacity-50">
          <div className="w-1.5 h-3 bg-rose-500/75 rounded-sm" title="Antena Esquerda" />
          <div className="flex-1 h-[1px] mx-2 bg-gradient-to-r from-transparent via-[#d4b072]/55 to-transparent" />
          <div className="text-[9px] font-bold tracking-[0.22em] text-[#d4b072]/75 uppercase">
            REDE (1.70M)
          </div>
          <div className="flex-1 h-[1px] mx-2 bg-gradient-to-r from-transparent via-[#d4b072]/55 to-transparent" />
          <div className="w-1.5 h-3 bg-rose-500/75 rounded-sm" title="Antena Direita" />
        </div>

        {/* Bottom Half: Player Zone */}
        <div className="relative flex-1 flex flex-col justify-end pb-1">
          <div className="w-3/5 sm:w-1/2 mx-auto grid grid-cols-3 h-7 border-t border-[#c8a263]/20 text-center mt-auto">
            {([1, 2, 3] as ServeNumber[]).map((zone) => (
              <div
                key={zone}
                className={`flex items-center justify-center border-r last:border-r-0 border-[#c8a263]/20 text-[10px] font-bold transition-colors ${
                  activeServeZone === zone
                    ? 'bg-amber-400/25 text-amber-200 font-black rounded-sm'
                    : 'text-[#d4b072]/40'
                }`}
              >
                Zona {zone}
              </div>
            ))}
          </div>
          <div className="absolute bottom-0 left-2 text-[9px] font-bold tracking-widest text-[#d4b072]/45 uppercase">
            Sua Quadra
          </div>
        </div>
      </div>

      {/* Subtle Ball Position Indicator */}
      <motion.div
        animate={{
          top:
            ballPosition === 'TOP'
              ? '16%'
              : ballPosition === 'BOTTOM'
              ? '84%'
              : '50%',
          left: '50%',
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="absolute -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none opacity-80"
      >
        <div className="w-4 h-4 rounded-full bg-yellow-300/90 border border-yellow-500 shadow-[0_0_12px_rgba(253,224,71,0.65)] flex items-center justify-center text-[9px]">
          🎾
        </div>
      </motion.div>

      {/* ===================================================================== */}
      {/* INTERACTIVE TABLE CONTENTS (Decks on Flaring Sides + Center Stage)    */}
      {/* ===================================================================== */}
      <div className="relative w-full flex-1 flex items-center justify-center z-20 pt-7 pb-10 sm:pt-8 sm:pb-12 px-6 sm:px-[10%] lg:px-[11%] pointer-events-auto">
        {children}
      </div>
    </motion.div>
  );
};

export default Court;
