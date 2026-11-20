import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { MatchFormat } from '../../engine/types';
import type { RoomPlayerSummary } from '../../net/onlineClient';
import {
  Copy,
  Check,
  Users,
  Trophy,
  Play,
  ArrowLeft,
  Wifi,
  WifiOff,
  Share2,
  UserCheck,
  Clock,
  HelpCircle,
} from 'lucide-react';

export interface OnlineLobbyProps {
  roomId: string;
  seat: 'A' | 'B' | null;
  isHost: boolean;
  isConnected: boolean;
  format: MatchFormat;
  players: RoomPlayerSummary[];
  playerName: string;
  onlineError: string | null;
  onUpdatePlayerName: (name: string) => void;
  onChangeFormat: (format: MatchFormat) => void;
  onStartMatch: () => void;
  onLeaveLobby: () => void;
  onOpenRules: () => void;
}

export const OnlineLobby: React.FC<OnlineLobbyProps> = ({
  roomId,
  seat,
  isHost,
  isConnected,
  format,
  players,
  playerName,
  onlineError,
  onUpdatePlayerName,
  onChangeFormat,
  onStartMatch,
  onLeaveLobby,
  onOpenRules,
}) => {
  const [nameInput, setNameInput] = useState(playerName);
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/beach_tennis/sala/${roomId}`
      : `/beach_tennis/sala/${roomId}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleShareNative = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Beach Tennis Card Game — Sala Online 1v1',
          text: `Entre na minha sala #${roomId} para jogar Beach Tennis Card Game online!`,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback to copy
      }
    }
    handleCopyLink();
  };

  const handleNameBlurOrSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = nameInput.trim().slice(0, 24);
    if (trimmed && trimmed !== playerName) {
      onUpdatePlayerName(trimmed);
    }
  };

  const bothConnected =
    players.length === 2 && players.every((p) => p.connected);

  const seatA = players.find((p) => p.seat === 'A') || null;
  const seatB = players.find((p) => p.seat === 'B') || null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-slate-950 via-sky-950 to-slate-900 text-slate-100 select-none">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full bg-slate-900/95 backdrop-blur-md border-2 border-sky-400/50 rounded-3xl p-5 sm:p-7 shadow-2xl"
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <button
            onClick={onLeaveLobby}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Menu Principal</span>
          </button>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border ${
                isConnected
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              }`}
            >
              {isConnected ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Online • Sala #{roomId}</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Reconectando...</span>
                </>
              )}
            </span>

            <button
              onClick={onOpenRules}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-300 text-xs font-bold transition cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Regras</span>
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-5">
          <h1 className="text-xl sm:text-2xl font-black text-amber-400 uppercase tracking-tight">
            Lobby Online 1 vs 1
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Compartilhe o link da sala com um amigo para iniciar o duelo na areia!
          </p>
        </div>

        {/* Error Banner */}
        {onlineError && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/20 border border-rose-400/50 text-rose-200 text-xs font-bold text-center">
            ⚠️ {onlineError}
          </div>
        )}

        {/* Shareable Link Box */}
        <div className="mb-5 p-3.5 rounded-2xl bg-slate-950/90 border border-sky-500/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-sky-400">
              Link de Convite da Sala
            </span>
            <span className="text-[11px] font-bold text-amber-300">
              Código: #{roomId}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              data-testid="room-share-url"
              className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono select-all focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                data-testid="copy-room-link-btn"
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleShareNative}
                title="Compartilhar"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 transition cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Player Name Input */}
        <form onSubmit={handleNameBlurOrSubmit} className="mb-5">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
            Seu Nome na Quadra
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              maxLength={24}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={() => handleNameBlurOrSubmit()}
              placeholder="Digite seu apelido..."
              data-testid="player-name-input"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 text-sm text-slate-100 font-bold focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-black uppercase tracking-wider transition cursor-pointer"
            >
              Salvar
            </button>
          </div>
        </form>

        {/* Connected Players Seats */}
        <div className="mb-5">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-400 mb-2">
            <Users className="w-4 h-4" />
            <span>Jogadores na Sala ({players.length}/2)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Seat A */}
            <div
              className={`p-3.5 rounded-2xl border-2 flex items-center justify-between ${
                seatA
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-dashed border-slate-700 bg-slate-950/50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center font-black text-amber-300 text-xs">
                  1
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-100 truncate">
                    {seatA ? seatA.name : 'Aguardando...'}
                    {seat === 'A' && (
                      <span className="ml-1.5 text-[10px] text-amber-300">(Você)</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Anfitrião • Saca no 1º Game
                  </div>
                </div>
              </div>
              {seatA && (
                <UserCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              )}
            </div>

            {/* Seat B */}
            <div
              className={`p-3.5 rounded-2xl border-2 flex items-center justify-between ${
                seatB
                  ? 'border-sky-500/50 bg-sky-500/10'
                  : 'border-dashed border-slate-700 bg-slate-950/50'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/50 flex items-center justify-center font-black text-sky-300 text-xs">
                  2
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-100 truncate">
                    {seatB ? seatB.name : 'Aguardando amigo...'}
                    {seat === 'B' && (
                      <span className="ml-1.5 text-[10px] text-sky-300">(Você)</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Desafiante • Recebe no 1º Game
                  </div>
                </div>
              </div>
              {seatB ? (
                <UserCheck className="w-4 h-4 text-sky-400 flex-shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-slate-500 animate-spin flex-shrink-0" />
              )}
            </div>
          </div>
        </div>

        {/* Match Format Selector */}
        <div className="mb-6">
          <label className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-amber-400 mb-2">
            <span className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4" />
              <span>Formato da Partida (ITF No-Ad)</span>
            </span>
            {!isHost && (
              <span className="text-[10px] text-slate-400 font-semibold">
                Definido pelo anfitrião
              </span>
            )}
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {(
              [
                { id: 'FAST_1_GAME', label: '1 Game', desc: 'Partida Rápida' },
                { id: 'SHORT_SET_4', label: 'Set Curto (4)', desc: 'Tie-Break 4x4' },
                { id: 'FULL_SET_6', label: 'Set Oficial (6)', desc: 'Tie-Break 6x6' },
              ] as const
            ).map((fmt) => (
              <button
                key={fmt.id}
                type="button"
                disabled={!isHost}
                onClick={() => isHost && onChangeFormat(fmt.id)}
                data-testid={`lobby-format-${fmt.id}`}
                className={`p-3 rounded-2xl border-2 text-left transition ${
                  format === fmt.id
                    ? 'border-amber-400 bg-amber-500/20 shadow-md'
                    : 'border-slate-800 bg-slate-800/60'
                } ${isHost ? 'cursor-pointer hover:border-slate-600' : 'opacity-80 cursor-default'}`}
              >
                <div className="text-xs font-black text-slate-100">{fmt.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{fmt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Start Match Button / Waiting Status */}
        {isHost ? (
          <button
            type="button"
            disabled={!bothConnected}
            onClick={onStartMatch}
            data-testid="start-online-match-btn"
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl flex items-center justify-center gap-2 transition ${
              bothConnected
                ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 hover:from-emerald-300 hover:to-sky-300 text-slate-950 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Play className="w-5 h-5 fill-current" />
            <span>
              {bothConnected
                ? 'Começar Partida Online!'
                : 'Aguardando 2º Jogador entrar pelo link...'}
            </span>
          </button>
        ) : (
          <div className="w-full py-4 px-4 rounded-2xl bg-slate-800/90 border border-sky-400/30 text-center text-xs sm:text-sm font-black text-sky-300 uppercase tracking-wider flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 animate-spin text-amber-400" />
            <span>Aguardando o anfitrião iniciar a partida...</span>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default OnlineLobby;
