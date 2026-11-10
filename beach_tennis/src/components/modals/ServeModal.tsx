import React from 'react';
import { motion } from 'framer-motion';
import type { ServeNumber, ServeResult } from '../../engine/types';
import { Sparkles, ShieldCheck, Zap } from 'lucide-react';

export interface ServeModalProps {
  isOpen: boolean;
  isServer: boolean;
  onSelectZone: (zone: ServeNumber) => void;
  onSelectReceiveZones: (zones: ServeNumber[]) => void;
  onConfirmDuel: () => void;
  selectedZone: ServeNumber | null;
  selectedReceiveZones: ServeNumber[];
  duelResult?: ServeResult | null;
  isRevealing?: boolean;
}

export const ServeModal: React.FC<ServeModalProps> = ({
  isOpen,
  isServer,
  onSelectZone,
  onSelectReceiveZones,
  onConfirmDuel,
  selectedZone,
  selectedReceiveZones,
  duelResult,
  isRevealing = false,
}) => {
  if (!isOpen) return null;

  const handleReceiveToggle = (zone: ServeNumber) => {
    if (isRevealing || duelResult) return;
    if (selectedReceiveZones.includes(zone)) {
      const next = selectedReceiveZones.filter((z) => z !== zone);
      onSelectReceiveZones(next);
    } else {
      if (selectedReceiveZones.length >= 2) {
        // Replace oldest selection so 2 zones stay selected
        const next: ServeNumber[] = [selectedReceiveZones[1]!, zone];
        onSelectReceiveZones(next);
      } else {
        const next: ServeNumber[] = [...selectedReceiveZones, zone];
        onSelectReceiveZones(next);
      }
    }
  };

  const isConfirmedReady = isServer ? selectedZone !== null : selectedReceiveZones.length === 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-center"
      >
        {/* Title */}
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
          <Zap className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-black text-amber-400 uppercase tracking-wide">
          {isServer ? 'Fase de Saque (Você Saca)' : 'Fase de Recepção (Você Recebe)'}
        </h3>
        <p className="text-sm text-slate-300 mt-1 mb-6">
          {isServer
            ? 'Escolha secretamente 1 zona para direcionar a bola (1, 2 ou 3).'
            : 'Escolha secretamente 2 zonas para cobrir e defender o saque.'}
        </p>

        {/* 3 Zone Interactive Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {([1, 2, 3] as ServeNumber[]).map((zone) => {
            const isSelected = isServer
              ? selectedZone === zone
              : selectedReceiveZones.includes(zone);

            return (
              <motion.div
                key={zone}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => (isServer ? onSelectZone(zone) : handleReceiveToggle(zone))}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center ${
                  isSelected
                    ? 'border-orange-400 bg-orange-500/25 shadow-[0_0_15px_rgba(249,115,22,0.5)]'
                    : 'border-slate-700 bg-slate-800/80 hover:border-slate-600'
                }`}
              >
                <span className="text-2xl font-black text-orange-400 mb-1">{zone}</span>
                <span className="text-xs font-bold text-slate-300">
                  {zone === 1 ? 'Esquerda' : zone === 2 ? 'Centro' : 'Direita'}
                </span>
                {isSelected && (
                  <span className="mt-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                    Selecionado
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Duel Result Celebration View */}
        {duelResult && (
          <div className="my-4 p-4 rounded-2xl bg-slate-800 border border-amber-500/40 text-center">
            {duelResult.isAce ? (
              <div className="flex flex-col items-center">
                <Sparkles className="w-8 h-8 text-amber-400 animate-spin mb-1" />
                <h4 className="text-2xl font-black text-amber-400">💥 ACE!</h4>
                <p className="text-xs text-slate-300 mt-1">
                  O sacador acertou a Zona {duelResult.serverPick} desprotegida! Ponto imediato!
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ShieldCheck className="w-8 h-8 text-sky-400 mb-1" />
                <h4 className="text-2xl font-black text-sky-400">🛡️ DEFESA EFETUADA!</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Saque defendido na Zona {duelResult.serverPick}! Puxando 1 carta do Monte Azul...
                </p>
              </div>
            )}
          </div>
        )}

        {/* Confirm Duel Button */}
        {!duelResult && (
          <button
            disabled={!isConfirmedReady || isRevealing}
            onClick={onConfirmDuel}
            className={`w-full py-3 rounded-xl font-black text-sm uppercase tracking-wider transition ${
              isConfirmedReady && !isRevealing
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 shadow-lg cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isRevealing ? 'Revelando Saque...' : 'Confirmar Escolha'}
          </button>
        )}
      </motion.div>
    </div>
  );
};

export default ServeModal;
