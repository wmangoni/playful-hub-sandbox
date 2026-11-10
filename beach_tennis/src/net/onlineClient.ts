/**
 * src/net/onlineClient.ts
 * Cliente WebSocket para partidas online 1v1 do Beach Tennis Card Game.
 * Gerencia conexão, reconexão automática, persistência de token em sessionStorage
 * e roteamento de mensagens do servidor autoritativo.
 */

import type { DomainEvent, MatchFormat, OnlineAction, ProjectedMatchView } from '../engine';

export interface RoomPlayerSummary {
  seat: 'A' | 'B';
  name: string;
  connected: boolean;
  graceUntil: number | null;
}

export interface RoomStatePayload {
  roomId: string;
  phase: 'lobby' | 'playing' | 'finished';
  format: MatchFormat;
  hostSeat: 'A' | 'B';
  version: number;
  turnDeadline: number | null;
  players: RoomPlayerSummary[];
}

export interface JoinedPayload {
  roomId: string;
  seat: 'A' | 'B';
  token: string;
  name: string;
}

export interface MatchStatePayload {
  roomId: string;
  seat: 'A' | 'B';
  version: number;
  phase: 'lobby' | 'playing' | 'finished';
  turnDeadline: number | null;
  playerName: string;
  opponentName: string;
  opponentConnected: boolean;
  opponentGraceUntil: number | null;
  view: ProjectedMatchView;
  events: DomainEvent[];
}

export interface OpponentStatusPayload {
  connected: boolean;
  graceUntil: number | null;
  name: string;
}

export interface ServerErrorPayload {
  code: string;
  message: string;
}

export interface OnlineClientCallbacks {
  onJoined: (payload: JoinedPayload) => void;
  onRoomState: (payload: RoomStatePayload) => void;
  onMatchState: (payload: MatchStatePayload) => void;
  onOpponentStatus: (payload: OpponentStatusPayload) => void;
  onError: (payload: ServerErrorPayload) => void;
  onConnectionChange: (connected: boolean) => void;
}

const TOKEN_PREFIX = 'bt_room_token_';
const NAME_STORAGE_KEY = 'bt_online_player_name';

export function getSavedPlayerName(): string {
  try {
    return localStorage.getItem(NAME_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function savePlayerName(name: string): void {
  try {
    localStorage.setItem(NAME_STORAGE_KEY, name.trim().slice(0, 24));
  } catch {
    // ignore storage errors
  }
}

export function getSavedRoomToken(roomId: string): string {
  try {
    return sessionStorage.getItem(`${TOKEN_PREFIX}${roomId}`) || '';
  } catch {
    return '';
  }
}

export function saveRoomToken(roomId: string, token: string): void {
  try {
    sessionStorage.setItem(`${TOKEN_PREFIX}${roomId}`, token);
  } catch {
    // ignore storage errors
  }
}

export function clearRoomToken(roomId: string): void {
  try {
    sessionStorage.removeItem(`${TOKEN_PREFIX}${roomId}`);
  } catch {
    // ignore
  }
}

export function detectRoomIdFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const pathname = window.location.pathname;
  const match = pathname.match(/\/beach_tennis\/sala\/([A-Za-z0-9]{4,16})/);
  if (match && match[1]) {
    return match[1];
  }
  const params = new URLSearchParams(window.location.search);
  const queryRoom = params.get('sala') || params.get('room');
  if (queryRoom && /^[A-Za-z0-9]{4,16}$/.test(queryRoom)) {
    return queryRoom;
  }
  return null;
}

export class OnlineMatchClient {
  private ws: WebSocket | null = null;
  private roomId: string;
  private playerName: string;
  private callbacks: OnlineClientCallbacks;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private manuallyClosed = false;

  constructor(roomId: string, playerName: string, callbacks: OnlineClientCallbacks) {
    this.roomId = roomId;
    this.playerName = playerName;
    this.callbacks = callbacks;
  }

  public connect(): void {
    this.manuallyClosed = false;
    this.clearReconnect();

    if (typeof window === 'undefined') return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/beach-tennis`;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempt = 0;
      this.callbacks.onConnectionChange(true);
      const token = getSavedRoomToken(this.roomId);
      this.sendRaw('join', {
        roomId: this.roomId,
        name: this.playerName,
        token: token || undefined,
      });
    };

    this.ws.onmessage = (event) => {
      let msg: { type?: string; payload?: unknown };
      try {
        msg = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (!msg || typeof msg.type !== 'string') return;

      switch (msg.type) {
        case 'joined': {
          const p = msg.payload as JoinedPayload;
          if (p && p.roomId && p.token) {
            saveRoomToken(p.roomId, p.token);
          }
          this.callbacks.onJoined(p);
          break;
        }
        case 'room_state':
          this.callbacks.onRoomState(msg.payload as RoomStatePayload);
          break;
        case 'match_state':
          this.callbacks.onMatchState(msg.payload as MatchStatePayload);
          break;
        case 'opponent_status':
          this.callbacks.onOpponentStatus(msg.payload as OpponentStatusPayload);
          break;
        case 'error':
          this.callbacks.onError(msg.payload as ServerErrorPayload);
          break;
        default:
          break;
      }
    };

    this.ws.onclose = () => {
      this.callbacks.onConnectionChange(false);
      if (!this.manuallyClosed) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // handled in onclose
    };
  }

  public updateNameAndRejoin(newName: string): void {
    this.playerName = newName;
    savePlayerName(newName);
    const token = getSavedRoomToken(this.roomId);
    this.sendRaw('join', {
      roomId: this.roomId,
      name: this.playerName,
      token: token || undefined,
    });
  }

  public sendConfig(format: MatchFormat): void {
    this.sendRaw('config', { format });
  }

  public sendStart(): void {
    this.sendRaw('start', {});
  }

  public sendAction(action: OnlineAction, version?: number): void {
    this.sendRaw('action', { version, action });
  }

  public sendRematch(): void {
    this.sendRaw('rematch', {});
  }

  public leaveAndClose(): void {
    this.manuallyClosed = true;
    this.clearReconnect();
    clearRoomToken(this.roomId);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendRaw('leave', {});
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }

  public disconnectWithoutLeaving(): void {
    this.manuallyClosed = true;
    this.clearReconnect();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }

  private sendRaw(type: string, payload: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnect();
    if (this.manuallyClosed) return;
    const delays = [1000, 2000, 4000, 8000];
    const delay = delays[Math.min(this.reconnectAttempt, delays.length - 1)] || 4000;
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}
