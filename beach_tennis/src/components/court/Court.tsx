import React from 'react';
import { motion } from 'framer-motion';
import type { ServeNumber } from '../../engine/types';

export interface CourtProps {
  children?: React.ReactNode;
  activeServeZone?: ServeNumber | null;
  ballPosition?: 'TOP' | 'NET' | 'BOTTOM' | 'CENTER';
  isShaking?: boolean;
  className?: string;
}

export const Court: React.FC<CourtProps> = ({
  children,
  activeServeZone,
  ballPosition = 'CENTER',
  isShaking = false,
  className = '',
}) => {
  return (
    <motion.div
      animate={isShaking ? { x: [-4, 4, -4, 4, 0], y: [-2, 2, -2, 2, 0] } : {}}
      transition={{ duration: 0.3 }}
      className={`relative w-full max-w-4xl mx-auto rounded-3xl shadow-2xl border-4 border-amber-700/60 bg-gradient-to-b from-[#e6c28f] via-[#d4a373] to-[#bc8550] p-1.5 sm:p-2.5 select-none ${className}`}
    >
      {/* Sand grain & manga speed-hatch texture overlay */}
      <div className="absolute inset-0 rounded-3xl opacity-20 bg-[radial-gradient(#59300a_1px,transparent_1px)] [background-size:12px_12px] pointer-events-none" />

      {/* Official White Boundary Court Lines (Balanced height so all internal elements & bottom hand fit) */}
      <div className="relative w-full h-[20.5rem] sm:h-[21.5rem] lg:h-[22rem] border-4 border-white/85 rounded-xl flex flex-col justify-between shadow-[inset_0_0_25px_rgba(0,0,0,0.2)]">
        {/* Top Half: AI Zone */}
        <div className="relative flex-1 border-b-2 border-white/60 flex flex-col justify-start p-2.5 sm:p-3">
          <div className="absolute top-1.5 left-3 text-[10px] font-black tracking-widest text-white/50 uppercase">
            Quadra IA
          </div>

          {/* Serve Zones Guide (1..3) */}
          <div className="w-full grid grid-cols-3 h-9 sm:h-10 border-b border-white/30 text-center">
            {([1, 2, 3] as ServeNumber[]).map((zone) => (
              <div
                key={zone}
                className={`flex items-center justify-center border-r last:border-r-0 border-white/20 text-xs font-bold transition-colors ${
                  activeServeZone === zone
                    ? 'bg-amber-400/30 text-amber-950 font-black'
                    : 'text-white/40'
                }`}
              >
                Zona {zone}
              </div>
            ))}
          </div>
        </div>

        {/* 3D Beach Tennis Net Divider */}
        <div className="relative w-full h-6 sm:h-7 bg-gradient-to-r from-slate-200 via-white to-slate-200 shadow-md flex items-center justify-between px-2 z-10 border-y-2 border-slate-300">
          <div className="w-2.5 h-full bg-red-600 rounded-sm" title="Antena Esquerda" />
          {/* Net mesh pattern */}
          <div className="flex-1 h-full mx-2 opacity-35 bg-[repeating-linear-gradient(45deg,#000,#000_2px,transparent_2px,transparent_6px)]" />
          <div className="text-[10px] font-black tracking-widest text-slate-700 uppercase">
            REDE (1.70M)
          </div>
          <div className="flex-1 h-full mx-2 opacity-35 bg-[repeating-linear-gradient(45deg,#000,#000_2px,transparent_2px,transparent_6px)]" />
          <div className="w-2.5 h-full bg-red-600 rounded-sm" title="Antena Direita" />
        </div>

        {/* Bottom Half: Player Zone */}
        <div className="relative flex-1 border-t-2 border-white/60 flex flex-col justify-end p-2.5 sm:p-3">
          {/* Serve Zones Guide (1..3) */}
          <div className="w-full grid grid-cols-3 h-9 sm:h-10 border-t border-white/30 text-center mt-auto">
            {([1, 2, 3] as ServeNumber[]).map((zone) => (
              <div
                key={zone}
                className={`flex items-center justify-center border-r last:border-r-0 border-white/20 text-xs font-bold transition-colors ${
                  activeServeZone === zone
                    ? 'bg-amber-400/30 text-amber-950 font-black'
                    : 'text-white/40'
                }`}
              >
                Zona {zone}
              </div>
            ))}
          </div>
          <div className="absolute bottom-1.5 left-3 text-[10px] font-black tracking-widest text-white/50 uppercase">
            Sua Quadra
          </div>
        </div>

        {/* Ball Indicator Position */}
        <motion.div
          animate={{
            top:
              ballPosition === 'TOP'
                ? '20%'
                : ballPosition === 'BOTTOM'
                ? '80%'
                : ballPosition === 'NET'
                ? '50%'
                : '50%',
            left: '50%',
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
        >
          <div className="w-5 h-5 rounded-full bg-yellow-300 border-2 border-yellow-500 shadow-[0_0_12px_rgba(253,224,71,0.8)] flex items-center justify-center text-[10px]">
            🎾
          </div>
        </motion.div>

        {/* Dynamic Court Elements & Slots */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
          {children}
        </div>
      </div>
    </motion.div>
  );
};

export default Court;
