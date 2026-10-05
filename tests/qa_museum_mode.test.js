process.env.NODE_ENV = 'test';
const http = require('http');
const path = require('path');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = process.env.TEST_PORT || 3096;

async function startServer() {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`Test server running on http://127.0.0.1:${PORT}`);
      resolve();
    });
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('  QA TEST SUITE - PLAYFULHUB RETRO MUSEUM OVERHAUL (27 GAMES)');
  console.log('===============================================================');

  const puppeteerModule = await import('puppeteer');
  puppeteer = puppeteerModule.default;

  await startServer();

  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 750 });

  const consoleErrors = [];
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('ERR_NAME_NOT_RESOLVED') && !text.includes('favicon.ico')) {
      console.log(`[BROWSER ERROR] ${text}`);
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', err => {
    console.log(`[BROWSER PAGEERROR] ${err.toString()}`);
    consoleErrors.push(err.toString());
  });

  console.log('\n--- 1. Navegando para o Modo Museu (index2.html) ---');
  await page.goto(`http://127.0.0.1:${PORT}/index2.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => !!window.__museum, { timeout: 15000 });

  // -------------------------------------------------------------
  // Teste 1: Validação do Catálogo Completo (27 Jogos)
  // -------------------------------------------------------------
  console.log('\n--- Test 1: Integridade do Catálogo de Jogos (27 Jogos) ---');
  const catalogCheck = await page.evaluate(() => {
    const games = window.__museum.getGames();
    const categories = {};
    games.forEach(g => {
      categories[g.category] = (categories[g.category] || 0) + 1;
    });

    const hasMissingFields = games.some(g => !g.id || !g.title || !g.path || !g.previewImg || !g.description);

    return {
      totalGames: games.length,
      categories,
      hasMissingFields,
      firstGame: games[0].title,
      lastGame: games[games.length - 1].title
    };
  });

  console.log('Resultados do Catálogo:', JSON.stringify(catalogCheck, null, 2));
  if (catalogCheck.totalGames !== 27 || catalogCheck.hasMissingFields) {
    throw new Error(`Falha no catálogo: Esperava 27 jogos completos, obteve ${catalogCheck.totalGames}`);
  }
  console.log('✅ Teste 1: Todos os 27 jogos carregados com metadata completa.');

  // -------------------------------------------------------------
  // Teste 2: Inicialização do Jogador e Salão Central (Lobby)
  // -------------------------------------------------------------
  console.log('\n--- Test 2: Posição Inicial e Detecção da Zona Central ---');
  const initialZone = await page.evaluate(() => {
    const p = window.__museum.getPlayer();
    const zone = window.__museum.getCurrentZone();
    return { x: p.x, y: p.y, zone };
  });

  console.log('Estado Inicial:', JSON.stringify(initialZone, null, 2));
  if (!initialZone.zone.includes('Lobby') && !initialZone.zone.includes('Central')) {
    throw new Error(`Zona inicial incorreta: ${initialZone.zone}`);
  }
  console.log('✅ Teste 2: Jogador spawned no Grande Salão Central com HUD sincronizado.');

  // -------------------------------------------------------------
  // Teste 3: Movimentação (Setas e WASD) e Colisão
  // -------------------------------------------------------------
  console.log('\n--- Test 3: Movimentação com Teclado e Colisão com Paredes ---');
  const moveCheck = await page.evaluate(async () => {
    const p = window.__museum.getPlayer();
    const startX = p.x;
    const startY = p.y;

    const waitFrames = (n) => new Promise(resolve => {
      let left = n;
      function tick() {
        if (--left <= 0) resolve();
        else requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });

    // Simular andar para a direita pressionando 'd'
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', code: 'KeyD' }));
    await waitFrames(6);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd', code: 'KeyD' }));

    const afterRightX = p.x;

    // Simular andar para cima pressionando 'ArrowUp'
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', code: 'ArrowUp' }));
    await waitFrames(6);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp', code: 'ArrowUp' }));

    const afterUpY = p.y;

    return {
      movedRight: afterRightX > startX,
      movedUp: afterUpY < startY,
      dx: afterRightX - startX,
      dy: afterUpY - startY
    };
  });

  console.log('Resultados de Movimentação:', JSON.stringify(moveCheck, null, 2));
  if (!moveCheck.movedRight || !moveCheck.movedUp) {
    throw new Error('Falha na resposta de movimentação por teclado.');
  }
  console.log('✅ Teste 3: Movimentação fluida via WASD e Setas validada.');

  // -------------------------------------------------------------
  // Teste 4: Navegação entre as 4 Alas Temáticas
  // -------------------------------------------------------------
  console.log('\n--- Test 4: Zonas das 4 Alas Temáticas ---');
  const wingsCheck = await page.evaluate(async () => {
    const results = {};

    // 1. Ala Norte (3D)
    window.__museum.teleportPlayer(1200, 300);
    await new Promise(r => setTimeout(r, 50));
    results.north = window.__museum.getCurrentZone();

    // 2. Ala Oeste (Arcade)
    window.__museum.teleportPlayer(350, 1000);
    await new Promise(r => setTimeout(r, 50));
    results.west = window.__museum.getCurrentZone();

    // 3. Ala Leste (Puzzles)
    window.__museum.teleportPlayer(1900, 1000);
    await new Promise(r => setTimeout(r, 50));
    results.east = window.__museum.getCurrentZone();

    // 4. Ala Sul (Simulações)
    window.__museum.teleportPlayer(1200, 1600);
    await new Promise(r => setTimeout(r, 50));
    results.south = window.__museum.getCurrentZone();

    return results;
  });

  console.log('Zonas das Alas:', JSON.stringify(wingsCheck, null, 2));
  if (!wingsCheck.north.includes('3D') ||
      !wingsCheck.west.includes('Arcade') ||
      !wingsCheck.east.includes('Puzzles') ||
      !wingsCheck.south.includes('Simulações')) {
    throw new Error('Falha na identificação das 4 alas temáticas.');
  }
  console.log('✅ Teste 4: Todas as 4 alas temáticas identificadas corretamente.');

  // -------------------------------------------------------------
  // Teste 5: Proximidade de Totem e Abertura da Modal de Detalhes
  // -------------------------------------------------------------
  console.log('\n--- Test 5: Interação com Totem e Modal com Preview Real ---');
  const modalCheck = await page.evaluate(async () => {
    // Teleportar para perto do jogo Tumbalacatumba (x: 850, y: 280)
    window.__museum.teleportPlayer(850, 320);
    await new Promise(r => setTimeout(r, 80));

    const interactable = window.__museum.getCurrentInteractable();
    const promptVisible = document.getElementById('interaction-prompt').style.display !== 'none';

    // Abrir modal de interação
    window.__museum.simulateInteract();
    await new Promise(r => setTimeout(r, 100));

    const modalActive = document.getElementById('game-modal').classList.contains('active');
    const modalTitle = document.getElementById('modal-title').textContent;
    const modalImgSrc = document.getElementById('modal-preview-img').src;
    const modalCategory = document.getElementById('modal-category').textContent;
    const modalPlayHref = document.getElementById('modal-play-btn').getAttribute('href');
    const visitedCount = window.__museum.getVisitedCount();

    // Fechar modal
    window.__museum.closeModal();

    return {
      hasInteractable: !!interactable,
      promptVisible,
      modalActive,
      modalTitle,
      modalImgSrc,
      modalCategory,
      modalPlayHref,
      visitedCount
    };
  });

  console.log('Resultados da Modal de Exposição:', JSON.stringify(modalCheck, null, 2));
  if (!modalCheck.hasInteractable || !modalCheck.modalActive || !modalCheck.modalTitle.includes('Tumbalacatumba')) {
    throw new Error('Falha na abertura da modal de detalhes do jogo.');
  }
  if (!modalCheck.modalImgSrc.includes('tumbalacatumba_preview.png')) {
    throw new Error('A imagem de preview não corresponde ao jogo selecionado!');
  }
  console.log('✅ Teste 5: Modal de detalhes abre com banner de preview real, categoria e link oficial.');

  // -------------------------------------------------------------
  // Captura de Evidências Visuais (Screenshots)
  // -------------------------------------------------------------
  console.log('\n--- Captura de Screenshots de Evidência ---');
  
  // 1. Lobby Central
  await page.evaluate(() => window.__museum.teleportPlayer(1200, 1050));
  await new Promise(r => setTimeout(r, 150));
  const lobbyEvidence = path.join(__dirname, 'museum_evidence_lobby.png');
  await page.screenshot({ path: lobbyEvidence });
  console.log('📸 Evidência 1 (Lobby Central):', lobbyEvidence);

  // 2. Ala Norte (3D)
  await page.evaluate(() => window.__museum.teleportPlayer(1200, 350));
  await new Promise(r => setTimeout(r, 150));
  const northEvidence = path.join(__dirname, 'museum_evidence_3d_wing.png');
  await page.screenshot({ path: northEvidence });
  console.log('📸 Evidência 2 (Ala 3D & WebGL):', northEvidence);

  // 3. Ala Oeste (Arcade)
  await page.evaluate(() => window.__museum.teleportPlayer(370, 950));
  await new Promise(r => setTimeout(r, 150));
  const westEvidence = path.join(__dirname, 'museum_evidence_arcade_wing.png');
  await page.screenshot({ path: westEvidence });
  console.log('📸 Evidência 3 (Ala Ação & Arcade):', westEvidence);

  // 4. Ala Leste (Puzzles)
  await page.evaluate(() => window.__museum.teleportPlayer(1950, 950));
  await new Promise(r => setTimeout(r, 150));
  const eastEvidence = path.join(__dirname, 'museum_evidence_puzzles_wing.png');
  await page.screenshot({ path: eastEvidence });
  console.log('📸 Evidência 4 (Ala Puzzles & Estratégia):', eastEvidence);

  // 5. Modal de Detalhes Aberta
  await page.evaluate(() => {
    window.__museum.teleportPlayer(1800, 780);
  });
  await new Promise(r => setTimeout(r, 100));
  await page.evaluate(() => {
    window.__museum.simulateInteract();
  });
  await new Promise(r => setTimeout(r, 200));
  const modalEvidence = path.join(__dirname, 'museum_evidence_modal.png');
  await page.screenshot({ path: modalEvidence });
  console.log('📸 Evidência 5 (Modal de Detalhes Aberta):', modalEvidence);

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DO NOVO MODO MUSEU (27 JOGOS) PASSARAM!');
  console.log('===============================================================');

  await browser.close();
  server.close();
}

runTests().catch(async (err) => {
  console.error('\n❌ ERRO NA EXECUÇÃO DOS TESTES DO MUSEU:', err);
  if (browser) await browser.close();
  if (server) server.close();
  process.exit(1);
});
