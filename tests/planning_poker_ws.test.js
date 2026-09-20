const http = require('http');
const assert = require('assert');
const WebSocket = require('ws');
const app = require('../server');
const planningPoker = require('../planning_poker/ws.js');

const PORT = process.env.TEST_PORT || 3091;
const WS_URL = `ws://127.0.0.1:${PORT}${planningPoker.WS_PATH}`;

let server;
let used;

function connectClient() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const inbox = [];
    ws.on('open', () => resolve({ ws, inbox }));
    ws.on('message', (data) => inbox.push(JSON.parse(data.toString())));
    ws.on('error', reject);
  });
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function send(client, type, payload) {
  client.ws.send(JSON.stringify({ type, payload: payload || {} }));
}

(async () => {
  server = http.createServer(app);
  planningPoker.attach(server);
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

  try {
    // ---- 1. HTTP: /planning_poker redireciona (302) com id 6 chars ----
    const res = await new Promise((resolve, reject) => {
      const req = http.request({ hostname: '127.0.0.1', port: PORT, path: '/planning_poker', method: 'GET' }, resolve);
      req.on('error', reject);
      req.end();
    });
    assert.strictEqual(res.statusCode, 302, 'GET /planning_poker deve redirecionar (302)');
    const location = res.headers.location;
    assert.ok(/^\/planning_poker\/[A-Za-z0-9]{6}$/.test(location), `Location inesperada: ${location}`);
    const roomId = location.split('/').pop();
    console.log('1. Redirect OK ->', location);

    // ---- 2. HTTP: página da sala responde 200 ----
    const page = await new Promise((resolve, reject) => {
      const req = http.request({ hostname: '127.0.0.1', port: PORT, path: location, method: 'GET' }, (resp) => {
        let body = '';
        resp.on('data', (c) => (body += c));
        resp.on('end', () => resolve({ status: resp.statusCode, body }));
      });
      req.on('error', reject);
      req.end();
    });
    assert.strictEqual(page.status, 200, 'Pagina da sala deve responder 200');
    assert.ok(/Planning Poker/.test(page.body), 'Pagina da sala deve conter o titulo');
    console.log('2. Pagina da sala OK');

    // ---- 3. página SEO ----
    const seo = await new Promise((resolve, reject) => {
      const req = http.request({ hostname: '127.0.0.1', port: PORT, path: '/jogos/planning_poker', method: 'GET' }, (resp) => {
        let body = '';
        resp.on('data', (c) => (body += c));
        resp.on('end', () => resolve({ status: resp.statusCode, body }));
      });
      req.on('error', reject);
      req.end();
    });
    assert.strictEqual(seo.status, 200, 'Pagina SEO deve responder 200');
    console.log('3. Pagina SEO OK');

    // ---- 4. Dois clientes entram na mesma sala ----
    const alice = await connectClient();
    send(alice, 'join', { roomId, name: 'Alice' });
    await wait(100);

    const bob = await connectClient();
    send(bob, 'join', { roomId, name: 'Bob' });
    await wait(150);

    assert.strictEqual(planningPoker.getRoom(roomId).players.size, 2, 'Sala deve ter 2 jogadores');
    const aliceStates = alice.inbox.filter((m) => m.type === 'room_state');
    assert.ok(aliceStates.length >= 2, 'Alice deve receber múltiplos room_state (join + entrada do Bob)');
    const aliceState = aliceStates[aliceStates.length - 1];
    assert.strictEqual(aliceState.payload.players.length, 2, 'Alice deve ver 2 jogadores');
    assert.ok(aliceState.payload.players.some((p) => p.name === 'Bob'), 'Alice deve ver Bob');
    console.log('4. Join e sincronizacao OK (2 jogadores)');

    // ---- 5. Voto secreto: Bob vota 5, Alice nao recebe o valor ----
    send(bob, 'vote', { value: 5 });
    await wait(100);
    const bobVoteCast = bob.inbox.find((m) => m.type === 'vote_cast');
    assert.ok(bobVoteCast, 'Bob deve receber vote_cast');
    assert.strictEqual(bobVoteCast.payload.hasVoted, true);
    const aliceState2 = alice.inbox.filter((m) => m.type === 'room_state').pop();
    assert.ok(aliceState2.payload.players.every((p) => p.vote === null), 'Alice não deve ver valor do voto antes da revelação');
    console.log('5. Voto secreto OK');

    // ---- 6. Votos invalidos sao rejeitados ----
    send(bob, 'vote', { value: 99 });
    await wait(80);
    const err = bob.inbox.find((m) => m.type === 'error');
    assert.ok(err && /inválido/.test(err.payload.message), 'Voto invalido deve gerar error');
    // Alice vota 8
    send(alice, 'vote', { value: 8 });
    await wait(100);
    console.log('6. Validacao de voto OK');

    // ---- 7. Revelacao mostra votos + stats ----
    send(bob, 'reveal');
    await wait(120);
    const revealed = bob.inbox.filter((m) => m.type === 'revealed').pop();
    assert.ok(revealed, 'Bob deve receber evento revealed');
    assert.strictEqual(revealed.payload.votes.length, 2, 'Revelacao deve ter 2 votos');
    assert.deepStrictEqual(revealed.payload.stats.mean, 6.5, 'Media de 5 e 8 é 6.5');
    const rState = alice.inbox.filter((m) => m.type === 'room_state').pop();
    assert.strictEqual(rState.payload.votesRevealed, true, 'Estado revelado após reveal');
    assert.ok(rState.payload.players.every((p) => typeof p.vote !== 'undefined' || p.vote !== null), 'Votos visíveis após reveal');
    console.log('7. Revelacao e stats OK (media 6.5)');

    // ---- 8. Reset limpa a rodada ----
    send(alice, 'reset');
    await wait(120);
    const afterReset = alice.inbox.filter((m) => m.type === 'room_state').pop();
    assert.strictEqual(afterReset.payload.votesRevealed, false, 'Reset volta para voting');
    assert.ok(afterReset.payload.players.every((p) => p.hasVoted === false), 'Reset limpa votos');
    assert.strictEqual(planningPoker.getRoom(roomId).players.size, 2, 'Reset mantém jogadores');
    console.log('8. Reset OK');

    // ---- 9. Desconexao remove o jogador ----
    const bobPlayerId = Array.from(planningPoker.getRoom(roomId).players.values()).find((p) => p.name === 'Bob').id;
    bob.ws.close();
    await wait(200);
    assert.strictEqual(planningPoker.getRoom(roomId).players.size, 1, 'Bob deve sair da sala ao desconectar');
    const playerLeft = alice.inbox.find((m) => m.type === 'player_left');
    assert.ok(playerLeft && playerLeft.payload.playerId === bobPlayerId, 'Alice deve receber player_left');
    console.log('9. Desconexao OK');

    // ---- 10. Sala vazia é removida ----
    alice.ws.close();
    await wait(200);
    assert.strictEqual(planningPoker.getRoom(roomId), undefined, 'Sala vazia deve ser removida do Map');
    console.log('10. Cleanup de sala OK');

    console.log('ALL PLANNING POKER WS TESTS PASSED');
    process.exit(0);
  } catch (err) {
    console.error('PLANNING POKER WS TESTS FAILED:', err.message || err);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
})();