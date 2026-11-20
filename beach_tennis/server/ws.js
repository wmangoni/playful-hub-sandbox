/**
 * beach_tennis/server/ws.js
 * Servidor WebSocket autoritativo para salas 1v1 do Beach Tennis Card Game.
 * Usa o motor puro compilado em `./engine.cjs`.
 */

const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const {
  createEngineMatch,
  applyEngineAction,
  chooseAutoTimeoutAction,
  projectMatchView,
  projectDomainEvent,
} = require('./engine.cjs');

const WS_PATH = '/ws/beach-tennis';

const ROOM_TTL_MS = 30 * 60 * 1000;
const ROOM_CLEANUP_MS = 5 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 25 * 1000;
const HEARTBEAT_LIMIT = 2;
const RATE_LIMIT_WINDOW_MS = 5000;
const RATE_LIMIT_MAX = 40;
const MAX_PAYLOAD_BYTES = 4096;
const MAX_NAME_LEN = 24;

const DEFAULT_SERVE_REVEAL_DELAY_MS = 2400;
const DEFAULT_NEXT_POINT_AUTO_MS = 6500;
const DEFAULT_TURN_TIMEOUT_MS = 45 * 1000;
const DEFAULT_DISCONNECT_GRACE_MS = 90 * 1000;

const VALID_FORMATS = new Set(['FAST_1_GAME', 'SHORT_SET_4', 'FULL_SET_6']);
const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/** @type {Map<string, any>} */
const rooms = new Map();

function generateRoomId(len = 6) {
  for (let attempt = 0; attempt < 16; attempt++) {
    const bytes = crypto.randomBytes(len);
    let out = '';
    for (let i = 0; i < len; i++) {
      out += ID_ALPHABET[bytes[i] % ID_ALPHABET.length];
    }
    if (!rooms.has(out)) return out;
  }
  return crypto.randomBytes(6).toString('base64url').slice(0, 8);
}

function sanitizeRoomId(raw) {
  if (typeof raw !== 'string') return '';
  const cleaned = raw.trim().replace(/[^A-Za-z0-9]/g, '');
  if (cleaned.length < 4 || cleaned.length > 16) return '';
  return cleaned;
}

function sanitizeName(raw, fallbackSeat = 'A') {
  if (typeof raw !== 'string') return `Jogador ${fallbackSeat}`;
  const cleaned = raw
    .replace(/[\u0000-\u001F\u007F<>]/g, '')
    .trim()
    .slice(0, MAX_NAME_LEN);
  return cleaned || `Jogador ${fallbackSeat}`;
}

function createRoom(id, options = {}) {
  const now = Date.now();
  const room = {
    id,
    createdAt: now,
    updatedAt: now,
    phase: 'lobby', // 'lobby' | 'playing' | 'finished'
    format: 'SHORT_SET_4',
    hostSeat: 'A',
    version: 0,
    seats: {
      A: null, // { seat: 'A', engineSeat: 'PLAYER', name, token, socket, connected, disconnectedAt, graceUntil, graceTimer }
      B: null, // { seat: 'B', engineSeat: 'AI', name, token, socket, connected, disconnectedAt, graceUntil, graceTimer }
    },
    matchState: null,
    turnDeadline: null,
    turnTimer: null,
    serveRevealTimer: null,
    nextPointTimer: null,
    config: {
      serveRevealDelayMs:
        typeof options.serveRevealDelayMs === 'number'
          ? options.serveRevealDelayMs
          : DEFAULT_SERVE_REVEAL_DELAY_MS,
      nextPointAutoMs:
        typeof options.nextPointAutoMs === 'number'
          ? options.nextPointAutoMs
          : DEFAULT_NEXT_POINT_AUTO_MS,
      turnTimeoutMs:
        typeof options.turnTimeoutMs === 'number'
          ? options.turnTimeoutMs
          : DEFAULT_TURN_TIMEOUT_MS,
      disconnectGraceMs:
        typeof options.disconnectGraceMs === 'number'
          ? options.disconnectGraceMs
          : DEFAULT_DISCONNECT_GRACE_MS,
    },
  };
  rooms.set(id, room);
  return room;
}

function getOrCreateRoom(id, options) {
  return rooms.get(id) || createRoom(id, options);
}

function touchRoom(room) {
  room.updatedAt = Date.now();
}

function clearRoomTimers(room) {
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }
  if (room.serveRevealTimer) {
    clearTimeout(room.serveRevealTimer);
    room.serveRevealTimer = null;
  }
  if (room.nextPointTimer) {
    clearTimeout(room.nextPointTimer);
    room.nextPointTimer = null;
  }
  room.turnDeadline = null;
}

function clearAllSeatGraceTimers(room) {
  for (const k of ['A', 'B']) {
    const s = room.seats[k];
    if (s && s.graceTimer) {
      clearTimeout(s.graceTimer);
      s.graceTimer = null;
      s.graceUntil = null;
    }
  }
}

function destroyRoomIfEmpty(room) {
  const aActive = room.seats.A && (room.seats.A.connected || room.seats.A.graceTimer);
  const bActive = room.seats.B && (room.seats.B.connected || room.seats.B.graceTimer);
  if (!aActive && !bActive) {
    clearRoomTimers(room);
    clearAllSeatGraceTimers(room);
    rooms.delete(room.id);
  }
}

function send(socket, message) {
  if (socket && socket.readyState === 1) {
    try {
      socket.send(JSON.stringify(message));
    } catch {
      // ignore socket send errors
    }
  }
}

function sendError(socket, code, message) {
  send(socket, {
    type: 'error',
    payload: { code, message },
  });
}

function roomStatePayload(room) {
  const players = [];
  for (const key of ['A', 'B']) {
    const s = room.seats[key];
    if (s) {
      players.push({
        seat: s.seat,
        name: s.name,
        connected: Boolean(s.connected),
        graceUntil: s.graceUntil || null,
      });
    }
  }
  return {
    roomId: room.id,
    phase: room.phase,
    format: room.format,
    hostSeat: room.hostSeat,
    version: room.version,
    turnDeadline: room.turnDeadline,
    players,
  };
}

function broadcastRoomState(room) {
  const payload = roomStatePayload(room);
  for (const key of ['A', 'B']) {
    const s = room.seats[key];
    if (s && s.socket) {
      send(s.socket, { type: 'room_state', payload });
    }
  }
}

function getRoomLabels(room) {
  return {
    PLAYER: (room.seats.A && room.seats.A.name) || 'Jogador A',
    AI: (room.seats.B && room.seats.B.name) || 'Jogador B',
  };
}

function broadcastMatchState(room, events = []) {
  if (!room.matchState) return;
  for (const key of ['A', 'B']) {
    const seatObj = room.seats[key];
    if (!seatObj || !seatObj.socket) continue;
    const oppKey = key === 'A' ? 'B' : 'A';
    const oppObj = room.seats[oppKey];
    const viewerEngineSeat = seatObj.engineSeat;
    const view = projectMatchView(room.matchState, viewerEngineSeat);
    const projectedEvents = events.map((ev) =>
      projectDomainEvent(ev, viewerEngineSeat)
    );
    send(seatObj.socket, {
      type: 'match_state',
      payload: {
        roomId: room.id,
        seat: key,
        version: room.version,
        phase: room.phase,
        turnDeadline: room.turnDeadline,
        playerName: seatObj.name,
        opponentName: (oppObj && oppObj.name) || 'Adversário',
        opponentConnected: Boolean(oppObj && oppObj.connected),
        opponentGraceUntil: (oppObj && oppObj.graceUntil) || null,
        view,
        events: projectedEvents,
      },
    });
  }
}

/**
 * Agenda timers automáticos do servidor conforme a fase atual da partida:
 * - SERVE_REVEAL -> avança automaticamente após serveRevealDelayMs
 * - POINT_ENDED -> avança automaticamente após nextPointAutoMs se ambos não clicarem antes
 * - Fase ativa (SERVE_SELECTION, RALLY_*, WILDCARD_DECLARING) -> turnTimer (45s)
 */
function schedulePhaseTimers(room) {
  clearRoomTimers(room);
  const state = room.matchState;
  if (!state) return;

  if (state.phase === 'MATCH_OVER') {
    room.phase = 'finished';
    return;
  }

  room.phase = 'playing';

  if (state.phase === 'SERVE_REVEAL') {
    room.serveRevealTimer = setTimeout(() => {
      room.serveRevealTimer = null;
      if (!room.matchState || room.matchState.phase !== 'SERVE_REVEAL') return;
      const res = applyEngineAction(
        room.matchState,
        'PLAYER',
        { type: 'COMPLETE_SERVE_REVEAL' },
        Math.random,
        getRoomLabels(room)
      );
      if (res.ok) {
        room.matchState = res.state;
        room.version += 1;
        touchRoom(room);
        schedulePhaseTimers(room);
        broadcastRoomState(room);
        broadcastMatchState(room, res.events);
      }
    }, room.config.serveRevealDelayMs);
    if (typeof room.serveRevealTimer.unref === 'function') {
      room.serveRevealTimer.unref();
    }
    return;
  }

  if (state.phase === 'POINT_ENDED') {
    room.nextPointTimer = setTimeout(() => {
      room.nextPointTimer = null;
      if (!room.matchState || room.matchState.phase !== 'POINT_ENDED') return;
      let nextState = room.matchState;
      const r1 = applyEngineAction(
        nextState,
        'PLAYER',
        { type: 'NEXT_POINT' },
        Math.random,
        getRoomLabels(room)
      );
      nextState = r1.state;
      if (nextState.phase === 'POINT_ENDED') {
        const r2 = applyEngineAction(
          nextState,
          'AI',
          { type: 'NEXT_POINT' },
          Math.random,
          getRoomLabels(room)
        );
        nextState = r2.state;
      }
      room.matchState = nextState;
      room.version += 1;
      touchRoom(room);
      schedulePhaseTimers(room);
      broadcastRoomState(room);
      broadcastMatchState(room, []);
    }, room.config.nextPointAutoMs);
    if (typeof room.nextPointTimer.unref === 'function') {
      room.nextPointTimer.unref();
    }
    return;
  }

  // Fases de decisão do jogador: programa turnTimer de 45s
  room.turnDeadline = Date.now() + room.config.turnTimeoutMs;
  room.turnTimer = setTimeout(() => {
    room.turnTimer = null;
    if (!room.matchState) return;
    let current = room.matchState;
    let allEvents = [];
    let changed = false;

    for (const engineSeat of ['PLAYER', 'AI']) {
      const autoAction = chooseAutoTimeoutAction(current, engineSeat);
      if (autoAction) {
        const res = applyEngineAction(
          current,
          engineSeat,
          autoAction,
          Math.random,
          getRoomLabels(room)
        );
        if (res.ok) {
          current = res.state;
          allEvents = allEvents.concat(res.events);
          changed = true;
          if (current.phase !== 'SERVE_SELECTION') break;
        }
      }
    }

    if (changed) {
      room.matchState = current;
      room.version += 1;
      touchRoom(room);
      schedulePhaseTimers(room);
      broadcastRoomState(room);
      broadcastMatchState(room, allEvents);
    }
  }, room.config.turnTimeoutMs);
  if (typeof room.turnTimer.unref === 'function') {
    room.turnTimer.unref();
  }
}

function handleJoin(wss, socket, payload, roomOptions) {
  const roomId = sanitizeRoomId(payload.roomId);
  if (!roomId) {
    return sendError(socket, 'INVALID_ROOM', 'Código de sala inválido.');
  }

  // Se o socket já estava em outra sala, remove primeiro
  if (socket._btRoomId && socket._btRoomId !== roomId) {
    handleLeave(wss, socket);
  }

  const room = getOrCreateRoom(roomId, roomOptions);
  const providedToken = typeof payload.token === 'string' ? payload.token.trim() : '';

  // 1. Verifica reconexão por token de sessão
  let targetSeatKey = null;
  for (const key of ['A', 'B']) {
    const existing = room.seats[key];
    if (existing && existing.token && existing.token === providedToken) {
      targetSeatKey = key;
      break;
    }
  }

  if (targetSeatKey) {
    const seatObj = room.seats[targetSeatKey];
    if (seatObj.graceTimer) {
      clearTimeout(seatObj.graceTimer);
      seatObj.graceTimer = null;
    }
    seatObj.graceUntil = null;
    seatObj.disconnectedAt = null;
    seatObj.connected = true;
    if (payload.name) {
      seatObj.name = sanitizeName(payload.name, targetSeatKey);
    }
    if (seatObj.socket && seatObj.socket !== socket) {
      try {
        seatObj.socket._btReplaced = true;
        seatObj.socket.close();
      } catch {
        // ignore
      }
    }
    seatObj.socket = socket;
    socket._btRoomId = room.id;
    socket._btSeat = targetSeatKey;

    touchRoom(room);
    send(socket, {
      type: 'joined',
      payload: {
        roomId: room.id,
        seat: targetSeatKey,
        token: seatObj.token,
        name: seatObj.name,
      },
    });

    const oppKey = targetSeatKey === 'A' ? 'B' : 'A';
    const oppObj = room.seats[oppKey];
    if (oppObj && oppObj.socket) {
      send(oppObj.socket, {
        type: 'opponent_status',
        payload: { connected: true, graceUntil: null, name: seatObj.name },
      });
    }

    broadcastRoomState(room);
    if (room.matchState) {
      broadcastMatchState(room, []);
    }
    return;
  }

  // 2. Novo assento na sala
  if (!room.seats.A) {
    targetSeatKey = 'A';
  } else if (!room.seats.B) {
    targetSeatKey = 'B';
  } else {
    return sendError(
      socket,
      'ROOM_FULL',
      'Esta sala já está cheia (2/2 jogadores).'
    );
  }

  const token = crypto.randomBytes(16).toString('hex');
  const name = sanitizeName(payload.name, targetSeatKey);
  const engineSeat = targetSeatKey === 'A' ? 'PLAYER' : 'AI';

  room.seats[targetSeatKey] = {
    seat: targetSeatKey,
    engineSeat,
    name,
    token,
    socket,
    connected: true,
    disconnectedAt: null,
    graceUntil: null,
    graceTimer: null,
  };

  if (!room.seats[room.hostSeat]) {
    room.hostSeat = targetSeatKey;
  }

  socket._btRoomId = room.id;
  socket._btSeat = targetSeatKey;
  touchRoom(room);

  send(socket, {
    type: 'joined',
    payload: {
      roomId: room.id,
      seat: targetSeatKey,
      token,
      name,
    },
  });

  broadcastRoomState(room);
  if (room.matchState) {
    broadcastMatchState(room, []);
  }
}

function handleConfig(wss, socket, payload) {
  const room = rooms.get(socket._btRoomId);
  if (!room) return sendError(socket, 'NOT_IN_ROOM', 'Você não está em uma sala.');
  if (room.phase !== 'lobby') {
    return sendError(
      socket,
      'MATCH_ALREADY_STARTED',
      'Não é possível alterar o formato após o início da partida.'
    );
  }
  if (socket._btSeat !== room.hostSeat) {
    return sendError(
      socket,
      'NOT_HOST',
      'Apenas o anfitrião da sala pode alterar o formato da partida.'
    );
  }
  const format = payload && payload.format;
  if (!VALID_FORMATS.has(format)) {
    return sendError(socket, 'INVALID_FORMAT', 'Formato de partida inválido.');
  }
  room.format = format;
  touchRoom(room);
  broadcastRoomState(room);
}

function handleStart(wss, socket) {
  const room = rooms.get(socket._btRoomId);
  if (!room) return sendError(socket, 'NOT_IN_ROOM', 'Você não está em uma sala.');
  if (room.phase !== 'lobby') {
    return sendError(socket, 'ALREADY_STARTED', 'A partida já está em andamento.');
  }
  if (socket._btSeat !== room.hostSeat) {
    return sendError(socket, 'NOT_HOST', 'Apenas o anfitrião pode iniciar a partida.');
  }
  if (!room.seats.A || !room.seats.B || !room.seats.A.connected || !room.seats.B.connected) {
    return sendError(
      socket,
      'WAITING_OPPONENT',
      'Aguarde o segundo jogador entrar na sala para iniciar.'
    );
  }

  room.matchState = createEngineMatch(room.format, 'PLAYER');
  room.phase = 'playing';
  room.version += 1;
  touchRoom(room);
  schedulePhaseTimers(room);
  broadcastRoomState(room);
  broadcastMatchState(room, []);
}

function handleAction(wss, socket, payload) {
  const room = rooms.get(socket._btRoomId);
  if (!room || !room.matchState) {
    return sendError(socket, 'NO_ACTIVE_MATCH', 'Nenhuma partida ativa nesta sala.');
  }
  const seatObj = room.seats[socket._btSeat];
  if (!seatObj) {
    return sendError(socket, 'NOT_IN_ROOM', 'Assento inválido.');
  }

  const action = payload && payload.action;
  if (!action || typeof action.type !== 'string') {
    return sendError(socket, 'INVALID_ACTION', 'Ação inválida.');
  }

  const res = applyEngineAction(
    room.matchState,
    seatObj.engineSeat,
    action,
    Math.random,
    getRoomLabels(room)
  );

  if (!res.ok) {
    return sendError(socket, res.error || 'ILLEGAL_ACTION', `Jogada inválida: ${res.error}`);
  }

  room.matchState = res.state;
  room.version += 1;
  touchRoom(room);
  schedulePhaseTimers(room);
  broadcastRoomState(room);
  broadcastMatchState(room, res.events);
}

function handleRematch(wss, socket) {
  return handleAction(wss, socket, { action: { type: 'REMATCH' } });
}

function handleLeave(wss, socket) {
  const roomId = socket._btRoomId;
  const seatKey = socket._btSeat;
  socket._btRoomId = null;
  socket._btSeat = null;

  if (!roomId || !seatKey) return;
  const room = rooms.get(roomId);
  if (!room) return;

  const seatObj = room.seats[seatKey];
  if (!seatObj) return;

  if (seatObj.graceTimer) {
    clearTimeout(seatObj.graceTimer);
    seatObj.graceTimer = null;
  }

  const oppKey = seatKey === 'A' ? 'B' : 'A';

  if (room.phase === 'playing' && room.matchState && room.matchState.phase !== 'MATCH_OVER') {
    const res = applyEngineAction(
      room.matchState,
      seatObj.engineSeat,
      { type: 'FORFEIT' },
      Math.random,
      getRoomLabels(room)
    );
    room.matchState = res.state;
    room.phase = 'finished';
    room.version += 1;
    clearRoomTimers(room);
    broadcastMatchState(room, res.events);
  }

  room.seats[seatKey] = null;
  if (room.hostSeat === seatKey && room.seats[oppKey]) {
    room.hostSeat = oppKey;
  }

  touchRoom(room);
  broadcastRoomState(room);
  destroyRoomIfEmpty(room);
}

function handleSocketDisconnect(wss, socket) {
  if (socket._btReplaced) return;
  const roomId = socket._btRoomId;
  const seatKey = socket._btSeat;
  if (!roomId || !seatKey) return;

  const room = rooms.get(roomId);
  if (!room) return;
  const seatObj = room.seats[seatKey];
  if (!seatObj || seatObj.socket !== socket) return;

  const oppKey = seatKey === 'A' ? 'B' : 'A';
  const oppObj = room.seats[oppKey];

  // Se ainda estava no lobby ou partida já encerrada, libera o assento imediatamente
  if (room.phase === 'lobby' || room.phase === 'finished') {
    room.seats[seatKey] = null;
    if (room.hostSeat === seatKey && oppObj) {
      room.hostSeat = oppKey;
    }
    touchRoom(room);
    broadcastRoomState(room);
    destroyRoomIfEmpty(room);
    return;
  }

  // Em partida ativa: inicia janela de tolerância (90s por padrão) para reconexão
  const now = Date.now();
  const graceMs = room.config.disconnectGraceMs;
  seatObj.connected = false;
  seatObj.socket = null;
  seatObj.disconnectedAt = now;
  seatObj.graceUntil = now + graceMs;

  if (seatObj.graceTimer) {
    clearTimeout(seatObj.graceTimer);
  }

  seatObj.graceTimer = setTimeout(() => {
    seatObj.graceTimer = null;
    seatObj.graceUntil = null;
    if (!rooms.has(room.id)) return;
    if (seatObj.connected) return;

    if (room.matchState && room.matchState.phase !== 'MATCH_OVER') {
      const res = applyEngineAction(
        room.matchState,
        seatObj.engineSeat,
        { type: 'FORFEIT' },
        Math.random,
        getRoomLabels(room)
      );
      room.matchState = res.state;
      room.phase = 'finished';
      room.version += 1;
      clearRoomTimers(room);
      broadcastRoomState(room);
      broadcastMatchState(room, res.events);
    }
    room.seats[seatKey] = null;
    destroyRoomIfEmpty(room);
  }, graceMs);

  if (typeof seatObj.graceTimer.unref === 'function') {
    seatObj.graceTimer.unref();
  }

  if (oppObj && oppObj.socket) {
    send(oppObj.socket, {
      type: 'opponent_status',
      payload: {
        connected: false,
        graceUntil: seatObj.graceUntil,
        name: seatObj.name,
      },
    });
  }

  touchRoom(room);
  broadcastRoomState(room);
  if (room.matchState) {
    broadcastMatchState(room, []);
  }
}

function handleMessage(wss, socket, rawMessage, roomOptions) {
  const now = Date.now();
  socket._btRateTimes = (socket._btRateTimes || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (socket._btRateTimes.length >= RATE_LIMIT_MAX) {
    return socket.terminate();
  }
  socket._btRateTimes.push(now);

  let data;
  try {
    data = JSON.parse(rawMessage.toString());
  } catch {
    return;
  }

  const type = data && data.type;
  const payload = (data && data.payload) || {};

  switch (type) {
    case 'join':
      handleJoin(wss, socket, payload, roomOptions);
      break;
    case 'config':
      handleConfig(wss, socket, payload);
      break;
    case 'start':
      handleStart(wss, socket);
      break;
    case 'action':
      handleAction(wss, socket, payload);
      break;
    case 'rematch':
      handleRematch(wss, socket);
      break;
    case 'leave':
      handleLeave(wss, socket);
      break;
    default:
      sendError(socket, 'UNKNOWN_MESSAGE_TYPE', 'Tipo de mensagem desconhecido.');
      break;
  }
}

function heartbeat(wss) {
  wss.clients.forEach((socket) => {
    if (!socket.isAlive) {
      socket._btStrikes = (socket._btStrikes || 0) + 1;
      if (socket._btStrikes >= HEARTBEAT_LIMIT) {
        socket.terminate();
      }
      return;
    }
    socket.isAlive = false;
    socket._btStrikes = 0;
    socket.ping();
  });
}

function cleanupStaleRooms() {
  const now = Date.now();
  rooms.forEach((room, id) => {
    const aConnected = room.seats.A && room.seats.A.connected;
    const bConnected = room.seats.B && room.seats.B.connected;
    if (!aConnected && !bConnected && now - room.updatedAt > ROOM_TTL_MS) {
      clearRoomTimers(room);
      clearAllSeatGraceTimers(room);
      rooms.delete(id);
    }
  });
}

/**
 * Instala um roteador compartilhado de upgrade no httpServer para permitir múltiplos
 * WebSocketServers (`noServer: true`) coexistirem sem abortar conexões de outros caminhos.
 */
function ensureSharedUpgradeDispatcher(httpServer) {
  if (httpServer._sharedWsRoutes) {
    return httpServer._sharedWsRoutes;
  }

  const routes = new Map();
  httpServer._sharedWsRoutes = routes;

  httpServer.on('upgrade', (request, socket, head) => {
    let pathname = '';
    try {
      pathname = new URL(request.url, 'http://localhost').pathname;
    } catch {
      socket.destroy();
      return;
    }
    const targetWss = routes.get(pathname);
    if (targetWss) {
      targetWss.handleUpgrade(request, socket, head, (ws) => {
        targetWss.emit('connection', ws, request);
      });
    }
  });

  return routes;
}

function attach(httpServer, options = {}) {
  const wsPath = options.path || WS_PATH;
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: MAX_PAYLOAD_BYTES,
  });

  const routes = ensureSharedUpgradeDispatcher(httpServer);
  routes.set(wsPath, wss);

  wss.on('connection', (socket) => {
    socket._btId = crypto.randomUUID();
    socket.isAlive = true;
    socket._btStrikes = 0;
    socket.on('pong', () => {
      socket.isAlive = true;
    });
    socket.on('error', () => {});
    socket.on('message', (data) => handleMessage(wss, socket, data, options));
    socket.on('close', () => handleSocketDisconnect(wss, socket));
  });

  const heartbeatTimer = setInterval(() => heartbeat(wss), HEARTBEAT_INTERVAL_MS);
  const cleanupTimer = setInterval(() => cleanupStaleRooms(), ROOM_CLEANUP_MS);
  if (typeof heartbeatTimer.unref === 'function') heartbeatTimer.unref();
  if (typeof cleanupTimer.unref === 'function') cleanupTimer.unref();

  wss.on('close', () => {
    routes.delete(wsPath);
    clearInterval(heartbeatTimer);
    clearInterval(cleanupTimer);
  });

  return wss;
}

function issueRoomId() {
  return generateRoomId();
}

module.exports = {
  attach,
  issueRoomId,
  createRoom,
  getRoom: (id) => rooms.get(id),
  rooms,
  WS_PATH,
};
