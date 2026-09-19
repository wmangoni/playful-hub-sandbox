const { WebSocketServer } = require('ws');
const crypto = require('crypto');

const DECK = [0, 1, 2, 3, 5, 8, 13, 21, 34, '?', '\u221E'];
const MAX_PLAYERS = 15;
const MAX_NAME_LENGTH = 24;
const ROOM_ID_LENGTH = 6;
const ROOM_ID_REGEX = /^[A-Za-z0-9]{4,16}$/;
const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const HEARTBEAT_INTERVAL = 30000;
const HEARTBEAT_LIMIT = 2;
const ROOM_TTL_MS = 30 * 60 * 1000;
const ROOM_CLEANUP_MS = 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 5000;
const RATE_LIMIT_MAX = 40;

const rooms = new Map();

const WS_PATH = '/ws/planning-poker';

function isValidVote(value) {
  return DECK.some((v) => String(v) === String(value));
}

function normalizeName(rawName) {
  const name = String(rawName || '').trim();
  if (!name || name.length > MAX_NAME_LENGTH) return null;
  return name;
}

function generateRoomId() {
  for (let attempt = 0; attempt < 16; attempt++) {
    let id = '';
    for (let i = 0; i < ROOM_ID_LENGTH; i++) {
      id += BASE62[crypto.randomInt(0, BASE62.length)];
    }
    if (!rooms.has(id)) return id;
  }
  throw new Error('Não foi possível gerar um id de sala único');
}

function createRoom(id) {
  const room = {
    id,
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    phase: 'voting',
    votesRevealed: false,
    players: new Map()
  };
  rooms.set(id, room);
  return room;
}

function touchRoom(room) {
  room.lastActivityAt = Date.now();
}

function buildPlayer(socket, name) {
  return {
    id: socket._ppId,
    name,
    vote: null,
    hasVoted: false,
    socket
  };
}

function roomStatePayload(room) {
  const players = Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    hasVoted: p.hasVoted,
    vote: room.votesRevealed ? p.vote : null
  }));
  const votesList = room.votesRevealed
    ? Array.from(room.players.values()).map((p) => ({ playerId: p.id, playerName: p.name, vote: p.vote }))
    : null;
  return {
    roomId: room.id,
    phase: room.phase,
    votesRevealed: room.votesRevealed,
    players,
    votes: votesList,
    stats: room.votesRevealed ? computeStats(votesList) : null
  };
}

function computeStats(votesList) {
  const values = votesList.map((v) => v.vote);
  const numeric = values.filter((v) => typeof v === 'number' && isFinite(v));
  const counts = {};
  values.forEach((v) => {
    counts[String(v)] = (counts[String(v)] || 0) + 1;
  });
  let mode = null;
  let modeCount = 0;
  Object.keys(counts).forEach((k) => {
    if (counts[k] > modeCount) {
      modeCount = counts[k];
      mode = isNaN(Number(k)) ? k : Number(k);
    }
  });
  return {
    total: values.length,
    mean: numeric.length ? numeric.reduce((a, b) => a + b, 0) / numeric.length : null,
    meanRounded: numeric.length ? Math.round((numeric.reduce((a, b) => a + b, 0) / numeric.length) * 10) / 10 : null,
    mode,
    min: numeric.length ? Math.min(...numeric) : null,
    max: numeric.length ? Math.max(...numeric) : null
  };
}

function send(socket, payload) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function broadcast(room, payload) {
  room.players.forEach((p) => send(p.socket, payload));
}

function removePlayerFromRoomSocket(wss, socket) {
  const roomId = socket._ppRoomId;
  if (!roomId) return;
  const room = rooms.get(roomId);
  socket._ppRoomId = null;
  if (!room) return;
  const player = room.players.get(socket._ppId);
  room.players.delete(socket._ppId);
  if (room.players.size === 0) {
    rooms.delete(roomId);
    return;
  }
  touchRoom(room);
  broadcast(room, { type: 'player_left', payload: { playerId: socket._ppId } });
  broadcast(room, { type: 'room_state', payload: roomStatePayload(room) });
}

function findPlayerRoom(socket) {
  const roomId = socket._ppRoomId;
  return roomId ? rooms.get(roomId) : null;
}

function handleJoin(wss, socket, received) {
  const name = normalizeName(received.name);
  if (!name) {
    return send(socket, { type: 'error', payload: { message: 'Nome é obrigatório (máx. 24 caracteres).' } });
  }
  let roomId = String(received.roomId || '');
  if (!ROOM_ID_REGEX.test(roomId)) {
    return send(socket, { type: 'error', payload: { message: 'Sala inválida.' } });
  }
  removePlayerFromRoomSocket(wss, socket);

  let room = rooms.get(roomId);
  if (!room) room = createRoom(roomId);

  if (room.players.size >= MAX_PLAYERS) {
    send(socket, { type: 'error', payload: { message: 'Sala cheia (max ' + MAX_PLAYERS + ' participantes).' } });
    if (room.players.size === 0) rooms.delete(roomId);
    return;
  }

  const player = buildPlayer(socket, name);
  room.players.set(player.id, player);
  socket._ppRoomId = roomId;
  touchRoom(room);

  if (room.players.size > 1) {
    broadcast(room, {
      type: 'player_joined',
      payload: { player: { id: player.id, name: player.name, hasVoted: false } }
    });
  }
  const selfState = roomStatePayload(room);
  selfState.selfId = player.id;
  send(socket, { type: 'room_state', payload: selfState });
  broadcast(room, { type: 'room_state', payload: roomStatePayload(room) });
}

function handleVote(wss, socket, received) {
  const room = findPlayerRoom(socket);
  if (!room) {
    return send(socket, { type: 'error', payload: { message: 'Você não está em uma sala.' } });
  }
  if (room.phase !== 'voting' || room.votesRevealed) {
    return send(socket, { type: 'error', payload: { message: 'A rodada já foi revelada.' } });
  }
  if (!isValidVote(received.value)) {
    return send(socket, { type: 'error', payload: { message: 'Valor de voto inválido.' } });
  }
  const player = room.players.get(socket._ppId);
  if (player) {
    player.vote = received.value;
    player.hasVoted = true;
    touchRoom(room);
  }
  broadcast(room, { type: 'vote_cast', payload: { playerId: socket._ppId, hasVoted: true } });
  broadcast(room, { type: 'room_state', payload: roomStatePayload(room) });
}

function handleReveal(wss, socket) {
  const room = findPlayerRoom(socket);
  if (!room) {
    return send(socket, { type: 'error', payload: { message: 'Você não está em uma sala.' } });
  }
  if (room.votesRevealed) return;
  room.votesRevealed = true;
  room.phase = 'revealed';
  touchRoom(room);
  const votesList = Array.from(room.players.values()).map((p) => ({
    playerId: p.id,
    playerName: p.name,
    vote: p.vote
  }));
  broadcast(room, {
    type: 'revealed',
    payload: { votes: votesList, stats: computeStats(votesList) }
  });
  broadcast(room, { type: 'room_state', payload: roomStatePayload(room) });
}

function handleReset(wss, socket) {
  const room = findPlayerRoom(socket);
  if (!room) {
    return send(socket, { type: 'error', payload: { message: 'Você não está em uma sala.' } });
  }
  room.votesRevealed = false;
  room.phase = 'voting';
  room.players.forEach((p) => {
    p.vote = null;
    p.hasVoted = false;
  });
  touchRoom(room);
  broadcast(room, { type: 'reset_round', payload: { phase: 'voting' } });
  broadcast(room, { type: 'room_state', payload: roomStatePayload(room) });
}

function handleMessage(wss, socket, message) {
  const now = Date.now();
  socket._ppRateTimes = (socket._ppRateTimes || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (socket._ppRateTimes.length >= RATE_LIMIT_MAX) {
    return socket.terminate();
  }
  socket._ppRateTimes.push(now);

  let data;
  try {
    data = JSON.parse(message);
  } catch (e) {
    return;
  }
  const type = data && data.type;
  const payload = (data && data.payload) || {};
  switch (type) {
    case 'join':
      handleJoin(wss, socket, payload);
      break;
    case 'vote':
      handleVote(wss, socket, payload);
      break;
    case 'reveal':
      handleReveal(wss, socket);
      break;
    case 'reset':
      handleReset(wss, socket);
      break;
    default:
      break;
  }
}

function heartbeat(wss) {
  wss.clients.forEach((socket) => {
    if (!socket.isAlive) {
      socket._ppStrikes = (socket._ppStrikes || 0) + 1;
      if (socket._ppStrikes >= HEARTBEAT_LIMIT) {
        socket.terminate();
      }
      return;
    }
    socket.isAlive = false;
    socket._ppStrikes = 0;
    socket.ping();
  });
}

function cleanupStaleRooms(wss) {
  const now = Date.now();
  rooms.forEach((room, id) => {
    if (room.players.size === 0 && now - room.createdAt > ROOM_TTL_MS) {
      rooms.delete(id);
    }
  });
}

/**
 * Atrela o WebSocketServer ao servidor HTTP existente.
 * @param {import('http').Server} httpServer
 */
function attach(httpServer, options) {
  const wss = new WebSocketServer({
    server: httpServer,
    path: (options && options.path) || WS_PATH
  });

  wss.on('connection', (socket) => {
    socket._ppId = crypto.randomUUID();
    socket.isAlive = true;
    socket._ppStrikes = 0;
    socket.on('pong', () => {
      socket.isAlive = true;
    });
    socket.on('error', () => {});
    socket.on('message', (data) => handleMessage(wss, socket, data));
    socket.on('close', () => removePlayerFromRoomSocket(wss, socket));
  });

  const heartbeatTimer = setInterval(() => heartbeat(wss), HEARTBEAT_INTERVAL);
  const cleanupTimer = setInterval(() => cleanupStaleRooms(wss), ROOM_CLEANUP_MS);
  if (typeof heartbeatTimer.unref === 'function') heartbeatTimer.unref();
  if (typeof cleanupTimer.unref === 'function') cleanupTimer.unref();

  wss.on('close', () => {
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
  DECK,
  WS_PATH
};