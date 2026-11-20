import React from 'react';
import { motion } from 'framer-motion';
import { X, Feather, Activity, ShieldAlert, ArrowUp, AlertCircle } from 'lucide-react';

export interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-sm">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-md h-full bg-slate-900 border-l border-slate-700 p-6 flex flex-col overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-black text-rose-400 uppercase tracking-wide">
              Folha Rosa Oficial
            </h3>
            <p className="text-xs text-slate-400">Cartas e suas Respostas Permitidas</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Categorized Sections */}
        <div className="flex flex-col gap-4 my-5">
          {/* 1. Bandejas */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2 mb-2 text-amber-300 font-bold text-xs uppercase">
              <Feather className="w-4 h-4" />
              <span>Responde com BANDEJAS</span>
            </div>
            <p className="text-[11px] text-slate-300 mb-1">
              Forçado por: <strong>Def Curta, Voleio Pingada, Bandeja Curta</strong>
            </p>
            <p className="text-[11px] text-slate-400">
              Respostas válidas: Bandeja Curta, Bandeja Lob, Bandeja Lob Chutado ou Coringa Verde.
            </p>
          </div>

          {/* 2. Voleios */}
          <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
            <div className="flex items-center gap-2 mb-2 text-cyan-300 font-bold text-xs uppercase">
              <Activity className="w-4 h-4" />
              <span>Responde com VOLEIOS</span>
            </div>
            <p className="text-[11px] text-slate-300 mb-1">
              Forçado por: <strong>Def Neutra, Bandeja Lob Chutado</strong>
            </p>
            <p className="text-[11px] text-slate-400">
              Respostas válidas: Voleio Pingada, Voleio Acelerado, Voleio Lob ou Coringa Verde.
            </p>
          </div>

          {/* 3. Defesas Azuis */}
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
            <div className="flex items-center gap-2 mb-2 text-rose-300 font-bold text-xs uppercase">
              <ShieldAlert className="w-4 h-4" />
              <span>Responde com DEFESAS (Monte Azul)</span>
            </div>
            <p className="text-[11px] text-slate-300 mb-1">
              Forçado por: <strong>Smash, Voleio Acelerado, Gancho Ata, Verônica Ata</strong>
            </p>
            <p className="text-[11px] text-slate-400">
              Puxa 1 carta automática do Monte Azul. Coringa Verde NÃO defende ataques!
            </p>
          </div>

          {/* 4. Fundo / Lobs */}
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30">
            <div className="flex items-center gap-2 mb-2 text-purple-300 font-bold text-xs uppercase">
              <ArrowUp className="w-4 h-4" />
              <span>Responde com FUNDO / AÉREO</span>
            </div>
            <p className="text-[11px] text-slate-300 mb-1">
              Forçado por: <strong>Def Lob, Voleio Lob, Bandeja Lob, Gancho Def, Verônica Def</strong>
            </p>
            <p className="text-[11px] text-slate-400">
              Respostas válidas: Smash, Gancho (Ata/Def), Verônica (Ata/Def) ou Coringa Verde.
            </p>
          </div>
        </div>

        {/* Special Rules Card */}
        <div className="mt-auto p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-2">
            <AlertCircle className="w-4 h-4" />
            <span>Regras Importantes de Mesa</span>
          </div>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Cavação (1 a 2 cartas):</strong> Só permitida se tiver 0 cartas válidas na mão. Se a 1ª servir, uso imediato obrigatório!</li>
            <li><strong>Monte Azul:</strong> Possui 8 cartas por ponto. Ao esgotar, o próximo ataque é ponto direto (Winner).</li>
            <li><strong>Ponto Decisivo (No-Ad):</strong> Em 40-40, quem fizer o próximo ponto fecha o Game.</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
};

export default RulesModal;
