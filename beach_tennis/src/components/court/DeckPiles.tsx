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
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Monte Verde (Golpes) */}
      <div className="flex flex-col items-center">
        <div
          className={`relative w-20 h-28 rounded-xl border-2 transition-all flex flex-col items-center justify-between p-2 shadow-lg ${
            canDig
              ? 'border-emerald-400 ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900 bg-emerald-950 cursor-pointer animate-bounce'
              : 'border-emerald-800 bg-emerald-950/70'
          }`}
          onClick={canDig ? onDig : undefined}
        >
          {/* 3D Stack Layer Simulation */}
          <div className="absolute -top-1 -right-1 w-full h-full rounded-xl bg-emerald-900 border border-emerald-700 -z-10" />
          <div className="absolute -top-2 -right-2 w-full h-full rounded-xl bg-emerald-950 border border-emerald-800 -z-20" />

          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">
            Monte Verde
          </span>
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-sm">
            {greenDeckCount}
          </div>
          <span className="text-[9px] text-emerald-300 font-semibold">
            {canDig ? (digAttemptsThisTurn === 0 ? 'Cavar 1/2' : 'Cavar 2/2') : 'Golpes'}
          </span>
        </div>

        {/* Cavar Trigger Button */}
        {canDig && !isAI && onDig && (
          <button
            onClick={onDig}
            className="mt-2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] shadow-lg animate-pulse"
          >
            <Pickaxe className="w-3.5 h-3.5" />
            <span>Cavar ({digAttemptsThisTurn + 1}/2)</span>
          </button>
        )}
      </div>

      {/* Monte Azul (Defesas) */}
      <div className="flex flex-col items-center">
        <div
          className={`relative w-20 h-28 rounded-xl border-2 transition-all flex flex-col items-center justify-between p-2 shadow-lg ${
            requiresBlueDefense
              ? 'border-rose-400 ring-2 ring-rose-500 ring-offset-2 ring-offset-slate-900 bg-blue-950 cursor-pointer animate-pulse'
              : blueDeckCount === 0
              ? 'border-red-600 bg-red-950/50'
              : 'border-blue-800 bg-blue-950/70'
          }`}
          onClick={requiresBlueDefense ? onDrawBlueDefense : undefined}
        >
          {/* 3D Stack Layer Simulation */}
          <div className="absolute -top-1 -right-1 w-full h-full rounded-xl bg-blue-900 border border-blue-700 -z-10" />
          <div className="absolute -top-2 -right-2 w-full h-full rounded-xl bg-blue-950 border border-blue-800 -z-20" />

          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">
            Monte Azul
          </span>
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-black text-sm">
            {blueDeckCount}
          </div>
          <span className="text-[9px] text-blue-300 font-semibold">
            {blueDeckCount === 0 ? 'Esgotado!' : 'Defesas'}
          </span>
        </div>

        {/* Defense Trigger Button or Warning */}
        {requiresBlueDefense && !isAI && onDrawBlueDefense && (
          <button
            onClick={onDrawBlueDefense}
            className="mt-2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500 hover:bg-rose-400 text-white font-black text-[11px] shadow-lg animate-bounce"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Defender!</span>
          </button>
        )}
        {blueDeckCount === 0 && (
          <div className="mt-1 flex items-center gap-1 text-[9px] text-rose-400 font-bold">
            <AlertTriangle className="w-3 h-3" />
            <span>Sem Defesa</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeckPiles;
