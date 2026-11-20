import React from 'react';
import { Pickaxe, Shield, AlertTriangle } from 'lucide-react';

export interface DeckPilesProps {
  greenDeckCount: number;
  blueDeckCount: number;
  canDig?: boolean;
  digAttemptsThisTurn?: number;
  onDig?: () => void;
  requiresBlueDefense?: boolean;
  onDrawBlueDefense?: () => void;
  isAI?: boolean;
  orientation?: 'row' | 'column';
  side?: 'left' | 'right';
  className?: string;
}

export const DeckPiles: React.FC<DeckPilesProps> = ({
  greenDeckCount,
  blueDeckCount,
  canDig = false,
  digAttemptsThisTurn = 0,
  onDig,
  requiresBlueDefense = false,
  onDrawBlueDefense,
  isAI = false,
  orientation = 'row',
  side,
  className = '',
}) => {
  // True 3D tabletop perspective transforms matching the trapezoid rails:
  // Left decks lean outward-left (\) and right decks lean outward-right (/)
  const topDeckStyle: React.CSSProperties | undefined =
    side === 'left'
      ? {
          transform: 'perspective(620px) rotateX(22deg) skewX(-11deg) rotateZ(-3deg)',
        }
      : side === 'right'
      ? {
          transform: 'perspective(620px) rotateX(22deg) skewX(11deg) rotateZ(3deg)',
        }
      : undefined;

  // Lower deck is closer to camera in perspective, so slightly wider & offset outward along rail
  const bottomDeckStyle: React.CSSProperties | undefined =
    side === 'left'
      ? {
          transform: 'translateX(-14px) scale(1.06) perspective(620px) rotateX(20deg) skewX(-12deg) rotateZ(-3deg)',
        }
      : side === 'right'
      ? {
          transform: 'translateX(14px) scale(1.06) perspective(620px) rotateX(20deg) skewX(12deg) rotateZ(3deg)',
        }
      : undefined;

  // Card stack thickness direction follows perspective lighting
  const stackDir = side === 'left' ? 'left' : 'right';

  return (
    <div
      className={`flex ${
        orientation === 'column' ? 'flex-col gap-5 sm:gap-6' : 'flex-row gap-3 sm:gap-4'
      } items-center ${className}`}
    >
      {/* Monte Verde (Golpes — UBT Carbon Black & Lime 3D Stack) */}
      <div className="flex flex-col items-center">
        <div className="relative" style={topDeckStyle}>
          {/* Thick Multi-Layer Physical 3D Card Stack Edges */}
          <div
            className={`absolute top-3 ${
              stackDir === 'left' ? 'left-3' : '-left-3'
            } w-full h-full rounded-xl bg-[#0c0d0f] border border-neutral-700 shadow-[0_14px_22px_rgba(0,0,0,0.95)] pointer-events-none`}
          />
          <div
            className={`absolute top-2 ${
              stackDir === 'left' ? 'left-2' : '-left-2'
            } w-full h-full rounded-xl bg-neutral-400/75 border border-neutral-500 pointer-events-none`}
          />
          <div
            className={`absolute top-1 ${
              stackDir === 'left' ? 'left-1' : '-left-1'
            } w-full h-full rounded-xl bg-[#1a1c1f] border border-neutral-400/70 pointer-events-none`}
          />

          {/* Top Card Face */}
          <div
            className={`relative z-10 w-24 h-32 sm:w-28 sm:h-36 rounded-xl border transition-all flex flex-col items-center justify-between p-2.5 shadow-[0_10px_22px_rgba(0,0,0,0.9)] ${
              canDig
                ? 'border-lime-400 ring-2 ring-lime-400 ring-offset-2 ring-offset-[#141517] bg-gradient-to-br from-[#232b24] via-[#121613] to-[#1a221c] cursor-pointer animate-bounce'
                : 'border-neutral-400/70 bg-gradient-to-br from-[#272a2f] via-[#111316] to-[#1b1e23]'
            }`}
            onClick={canDig ? onDig : undefined}
          >
            {/* Subtle Inner Metallic Border */}
            <div className="absolute inset-1 rounded-lg border border-lime-400/25 pointer-events-none" />

            <span className="text-[9px] font-extrabold text-lime-400 uppercase tracking-tight z-10">
              Monte Verde
            </span>

            {/* UBT Crest */}
            <div className="flex flex-col items-center justify-center z-10">
              <span className="text-lg sm:text-xl font-black tracking-tight text-white leading-none drop-shadow">
                UBT
              </span>
              <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-lime-400 to-transparent my-1" />
              <span className="text-[7px] uppercase tracking-widest text-neutral-300 font-bold">
                Beach Tennis
              </span>
            </div>

            <div className="flex items-center gap-1.5 z-10">
              <span className="px-2 py-0.5 rounded-full bg-black/80 border border-lime-400/50 text-lime-300 font-black text-[10px]">
                {greenDeckCount}
              </span>
              <span className="text-[8px] text-neutral-300 font-semibold">
                {canDig ? (digAttemptsThisTurn === 0 ? 'Cavar 1/2' : 'Cavar 2/2') : 'Golpes'}
              </span>
            </div>
          </div>
        </div>

        {/* Cavar Trigger Button */}
        {canDig && !isAI && onDig && (
          <button
            onClick={onDig}
            className="mt-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] sm:text-[11px] shadow-[0_0_16px_rgba(16,185,129,0.65)] animate-pulse cursor-pointer z-20"
          >
            <Pickaxe className="w-3.5 h-3.5" />
            <span>Cavar ({digAttemptsThisTurn + 1}/2)</span>
          </button>
        )}
      </div>

      {/* Monte Azul (Defesas — UBT Carbon Black & Defesa 3D Stack) */}
      <div className="flex flex-col items-center">
        <div className="relative" style={bottomDeckStyle}>
          {/* Thick Multi-Layer Physical 3D Card Stack Edges */}
          <div
            className={`absolute top-3 ${
              stackDir === 'left' ? 'left-3' : '-left-3'
            } w-full h-full rounded-xl bg-[#0c0d0f] border border-neutral-700 shadow-[0_14px_22px_rgba(0,0,0,0.95)] pointer-events-none`}
          />
          <div
            className={`absolute top-2 ${
              stackDir === 'left' ? 'left-2' : '-left-2'
            } w-full h-full rounded-xl bg-neutral-400/75 border border-neutral-500 pointer-events-none`}
          />
          <div
            className={`absolute top-1 ${
              stackDir === 'left' ? 'left-1' : '-left-1'
            } w-full h-full rounded-xl bg-[#1a1c1f] border border-neutral-400/70 pointer-events-none`}
          />

          {/* Top Card Face */}
          <div
            className={`relative z-10 w-24 h-32 sm:w-28 sm:h-36 rounded-xl border transition-all flex flex-col items-center justify-between p-2.5 shadow-[0_10px_22px_rgba(0,0,0,0.9)] ${
              requiresBlueDefense
                ? 'border-sky-400 ring-2 ring-rose-500 ring-offset-2 ring-offset-[#141517] bg-gradient-to-br from-[#1b2738] via-[#0f141e] to-[#192434] cursor-pointer animate-pulse'
                : blueDeckCount === 0
                ? 'border-red-600/80 bg-red-950/80'
                : 'border-neutral-400/70 bg-gradient-to-br from-[#242831] via-[#111317] to-[#1a1f28]'
            }`}
            onClick={requiresBlueDefense ? onDrawBlueDefense : undefined}
          >
            {/* Subtle Inner Border */}
            <div className="absolute inset-1 rounded-lg border border-sky-400/25 pointer-events-none" />

            <span className="text-[9px] font-extrabold text-sky-400 uppercase tracking-tight z-10">
              Monte Azul
            </span>

            {/* UBT + Defesa Label matching reference deck */}
            <div className="flex flex-col items-center justify-center z-10">
              <span className="text-base sm:text-lg font-black tracking-tight text-white leading-none drop-shadow">
                UBT
              </span>
              <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-lime-400 to-transparent my-0.5" />
              <span className="text-xs sm:text-sm font-black text-white tracking-wide leading-tight">
                Defesa
              </span>
            </div>

            <div className="flex items-center gap-1.5 z-10">
              <span className="px-2 py-0.5 rounded-full bg-black/80 border border-sky-400/50 text-sky-300 font-black text-[10px]">
                {blueDeckCount}
              </span>
              <span className="text-[8px] text-neutral-300 font-semibold">
                {blueDeckCount === 0 ? 'Esgotado!' : 'Defesas'}
              </span>
            </div>
          </div>
        </div>

        {/* Defense Trigger Button or Warning */}
        {requiresBlueDefense && !isAI && onDrawBlueDefense && (
          <button
            onClick={onDrawBlueDefense}
            className="mt-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500 hover:bg-rose-400 text-white font-black text-[10px] sm:text-[11px] shadow-[0_0_16px_rgba(244,63,94,0.65)] animate-bounce cursor-pointer z-20"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Defender!</span>
          </button>
        )}
        {blueDeckCount === 0 && (
          <div className="mt-2 flex items-center gap-1 text-[9px] text-rose-400 font-bold">
            <AlertTriangle className="w-3 h-3" />
            <span>Sem Defesa</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeckPiles;
