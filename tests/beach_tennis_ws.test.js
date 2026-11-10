const http = require('http');
const assert = require('assert');
const WebSocket = require('ws');
const app = require('../server');
const planningPoker = require('../planning_poker/ws.js');
const beachTennisWs = require('../beach_tennis/server/ws.js');

const PORT = process.env.TEST_PORT || 3092;
const WS_URL = `ws://127.0.0.1:${PORT}${beachTennisWs.WS_PATH}`;

let server;

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

function lastMsg(client, type) {
  const list = client.inbox.filter((m) => m.type === type);
  return list[list.length - 1];
}

(async () => {
  server = http.createServer(app);
  planningPoker.attach(server);
  beachTennisWs.attach(server, {
    serveRevealDelayMs: 60,
    nextPointAutoMs: 250,
    turnTimeoutMs: 400,
    disconnectGraceMs: 300,
  });
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

  try {
    // ---- 1. HTTP: /beach_tennis/online redireciona (302) para /beach_tennis/sala/:roomId ----
    const res = await new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: '127.0.0.1', port: PORT, path: '/beach_tennis/online', method: 'GET' },
        resolve
      );
      req.on('error', reject);
      req.end();
    });
    assert.strictEqual(res.statusCode, 302, 'GET /beach_tennis/online deve redirecionar (302)');
    const location = res.headers.location;
    assert.ok(
      /^\/beach_tennis\/sala\/[A-Za-z0-9]{6}$/.test(location),
      `Location inesperada: ${location}`
    );
    const roomId = location.split('/').pop();
    console.log('1. Redirect OK ->', location);

    // ---- 2. HTTP: página da sala responde 200 e rota inválida responde 404 ----
    const page = await new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: '127.0.0.1', port: PORT, path: location, method: 'GET' },
        (resp) => {
          let body = '';
          resp.on('data', (c) => (body += c));
          resp.on('end', () => resolve({ status: resp.statusCode, body }));
        }
      );
      req.on('error', reject);
      req.end();
    });
    assert.strictEqual(page.status, 200, 'Página da sala deve responder 200');
    assert.ok(/Beach Tennis/.test(page.body), 'Página da sala deve conter o título do jogo');

    const badPage = await new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: '127.0.0.1', port: PORT, path: '/beach_tennis/sala/ab', method: 'GET' },
        (resp) => resolve({ status: resp.statusCode })
      );
      req.on('error', reject);
      req.end();
    });
    assert.strictEqual(badPage.status, 404, 'RoomId inválido deve responder 404');
    console.log('2. Página da sala 200 e roomId inválido 404 OK');

    // ---- 3. Dois jogadores entram no lobby e 3º é recusado com ROOM_FULL ----
    const alice = await connectClient();
    send(alice, 'join', { roomId, name: 'Alice' });
    await wait(60);

    const aliceJoined = lastMsg(alice, 'joined');
    assert.ok(aliceJoined, 'Alice deve receber joined');
    assert.strictEqual(aliceJoined.payload.seat, 'A');
    const aliceToken = aliceJoined.payload.token;

    const bob = await connectClient();
    send(bob, 'join', { roomId, name: 'Bob' });
    await wait(60);

    const bobJoined = lastMsg(bob, 'joined');
    assert.ok(bobJoined, 'Bob deve receber joined');
    assert.strictEqual(bobJoined.payload.seat, 'B');
    const bobToken = bobJoined.payload.token;

    const charlie = await connectClient();
    send(charlie, 'join', { roomId, name: 'Charlie' });
    await wait(60);
    const charlieErr = lastMsg(charlie, 'error');
    assert.ok(charlieErr && charlieErr.payload.code === 'ROOM_FULL', '3º jogador deve receber ROOM_FULL');
    charlie.ws.close();
    console.log('3. Join 2 jogadores + bloqueio ROOM_FULL OK');

    // ---- 4. Host altera formato e inicia partida ----
    send(bob, 'config', { format: 'FAST_1_GAME' });
    await wait(50);
    const bobHostErr = lastMsg(bob, 'error');
    assert.ok(bobHostErr && bobHostErr.payload.code === 'NOT_HOST', 'Não-host não pode mudar formato');

    send(alice, 'config', { format: 'FAST_1_GAME' });
    await wait(50);
    assert.strictEqual(lastMsg(bob, 'room_state').payload.format, 'FAST_1_GAME');

    send(alice, 'start');
    await wait(60);
    const aliceMatch1 = lastMsg(alice, 'match_state');
    const bobMatch1 = lastMsg(bob, 'match_state');
    assert.ok(aliceMatch1 && bobMatch1, 'Ambos devem receber match_state ao iniciar');
    assert.strictEqual(aliceMatch1.payload.view.phase, 'SERVE_SELECTION');
    assert.strictEqual(aliceMatch1.payload.view.player.hand.length, 6);
    assert.strictEqual(bobMatch1.payload.view.player.hand.length, 6);
    console.log('4. Configuração pelo host e início da partida OK');

    // ---- 5. Anti-cheat: nenhuma carta da mão do oponente vaza no match_state ----
    const roomObj = beachTennisWs.getRoom(roomId);
    const realHandA = roomObj.matchState.player.hand.map((c) => c.instanceId);
    const realHandB = roomObj.matchState.ai.hand.map((c) => c.instanceId);
    const aliceJson = JSON.stringify(aliceMatch1.payload.view);
    const bobJson = JSON.stringify(bobMatch1.payload.view);
    for (const idB of realHandB) {
      assert.ok(!aliceJson.includes(`"${idB}"`), `Carta ${idB} de Bob vazou para Alice`);
    }
    for (const idA of realHandA) {
      assert.ok(!bobJson.includes(`"${idA}"`), `Carta ${idA} de Alice vazou para Bob`);
    }
    console.log('5. Anti-cheat (zero vazamento de cartas na rede) OK');

    // ---- 6. Saque secreto (commit simultâneo) + revelação automática ----
    send(alice, 'action', { action: { type: 'SERVE_PICK', zone: 3 } });
    await wait(50);
    const bobAfterServePick = lastMsg(bob, 'match_state');
    assert.strictEqual(bobAfterServePick.payload.view.serveDuel.serverReady, true);
    assert.strictEqual(
      bobAfterServePick.payload.view.serveDuel.serverPick,
      null,
      'Escolha de saque de Alice não pode aparecer para Bob antes de Bob escolher recepção'
    );

    // Bob escolhe zonas [1, 2] -> ACE para Alice na zona 3!
    send(bob, 'action', { action: { type: 'RECEIVE_PICK', zones: [1, 2] } });
    await wait(40);
    const bobReveal = lastMsg(bob, 'match_state');
    assert.strictEqual(bobReveal.payload.view.phase, 'SERVE_REVEAL');
    assert.strictEqual(bobReveal.payload.view.serveDuel.serverPick, 3);

    // Espera timer automático de SERVE_REVEAL (60ms no teste) -> POINT_ENDED
    await wait(90);
    const afterReveal = lastMsg(alice, 'match_state');
    assert.strictEqual(afterReveal.payload.view.phase, 'POINT_ENDED');
    assert.strictEqual(afterReveal.payload.view.score.playerPoints, 15);
    console.log('6. Saque secreto + revelação automática em SERVE_REVEAL OK');

    // ---- 7. Avanço para próximo ponto e bloqueio de jogada fora de turno ----
    send(alice, 'action', { action: { type: 'NEXT_POINT' } });
    send(bob, 'action', { action: { type: 'NEXT_POINT' } });
    await wait(60);
    const p2State = lastMsg(alice, 'match_state');
    assert.strictEqual(p2State.payload.view.phase, 'SERVE_SELECTION');

    // Alice saca na zona 1 e Bob defende [1, 2] -> entra em rally!
    send(alice, 'action', { action: { type: 'SERVE_PICK', zone: 1 } });
    send(bob, 'action', { action: { type: 'RECEIVE_PICK', zones: [1, 2] } });
    await wait(120);

    // Se caiu em WILDCARD_DECLARING da defesa azul de Bob, Bob declara primeiro
    let latestBob = lastMsg(bob, 'match_state');
    if (latestBob.payload.view.phase === 'WILDCARD_DECLARING') {
      const allowed = latestBob.payload.view.rally.pendingWildcard.allowedDeclarations[0];
      send(bob, 'action', { action: { type: 'DECLARE_WILDCARD', declaredType: allowed } });
      await wait(60);
    }

    // Agora é vez de Alice ('PLAYER'). Bob tenta jogar carta fora do turno dele -> erro NOT_YOUR_TURN
    latestBob = lastMsg(bob, 'match_state');
    const bobFirstCardId = latestBob.payload.view.player.hand[0].instanceId;
    send(bob, 'action', { action: { type: 'PLAY_CARD', instanceId: bobFirstCardId } });
    await wait(50);
    const outOfTurnErr = lastMsg(bob, 'error');
    assert.ok(
      outOfTurnErr && outOfTurnErr.payload.code === 'NOT_YOUR_TURN',
      'Jogada fora do turno deve ser rejeitada com NOT_YOUR_TURN'
    );
    console.log('7. Rejeição de jogada fora de turno OK');

    // ---- 8. Reconexão com token dentro da janela de tolerância ----
    bob.ws.close();
    await wait(60);
    const aliceOppStatus = lastMsg(alice, 'opponent_status');
    assert.ok(aliceOppStatus && aliceOppStatus.payload.connected === false, 'Alice deve ser avisada da queda de Bob');

    const bobReconnected = await connectClient();
    send(bobReconnected, 'join', { roomId, name: 'Bob', token: bobToken });
    await wait(60);
    const bobRejoined = lastMsg(bobReconnected, 'joined');
    assert.strictEqual(bobRejoined.payload.seat, 'B');
    const aliceOppBack = lastMsg(alice, 'opponent_status');
    assert.strictEqual(aliceOppBack.payload.connected, true, 'Alice deve ver Bob reconectado');
    console.log('8. Reconexão por token de sessão OK');

    // ---- 9. Expiração da janela de reconexão declara W.O. (FORFEIT) ----
    bobReconnected.ws.close();
    await wait(400); // disconnectGraceMs = 300ms no teste
    const aliceAfterForfeit = lastMsg(alice, 'match_state');
    assert.strictEqual(aliceAfterForfeit.payload.view.phase, 'MATCH_OVER');
    assert.strictEqual(aliceAfterForfeit.payload.view.pointEndReason, 'FORFEIT');
    assert.strictEqual(aliceAfterForfeit.payload.view.score.matchWinner, 'PLAYER');
    console.log('9. W.O. após expiração da janela de reconexão OK');

    // ---- 10. Limpeza de sala quando todos saem ----
    alice.ws.close();
    await wait(100);
    assert.strictEqual(beachTennisWs.getRoom(roomId), undefined, 'Sala vazia deve ser removida da memória');
    console.log('10. Limpeza de sala vazia OK');

    console.log('ALL BEACH TENNIS WS TESTS PASSED');
    process.exit(0);
  } catch (err) {
    console.error('BEACH TENNIS WS TESTS FAILED:', err.stack || err.message || err);
    process.exit(1);
  } finally {
    server.close();
  }
})();
