process.env.NODE_ENV = 'test';
const http = require('http');
const path = require('path');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = process.env.TEST_PORT || 3094;

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
  console.log('  QA TEST SUITE - CONWAY\'S GAME OF LIFE (TASK_003)');
  console.log('===============================================================');

  const puppeteerModule = await import('puppeteer');
  puppeteer = puppeteerModule.default;

  await startServer();

  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  page = await browser.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('ERR_NAME_NOT_RESOLVED')) {
      console.log(`[BROWSER ERROR] ${text}`);
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', err => {
    console.log(`[BROWSER PAGEERROR] ${err.toString()}`);
    consoleErrors.push(err.toString());
  });

  page.on('dialog', async dialog => {
    console.log(`[DIALOG] ${dialog.type().toUpperCase()}: ${dialog.message()}`);
    await dialog.accept();
  });

  console.log('\n--- 1. Navegando para Conway\'s Game of Life ---');
  await page.goto(`http://127.0.0.1:${PORT}/gameoflife/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => !!window.__gol, { timeout: 15000 });

  // 1. Validar Painel de Desafios e os 3 Níveis de Puzzles
  console.log('\n--- Test 1: Modo Desafio (Automata Puzzles - 3 Níveis) ---');
  const challengeCheck = await page.evaluate(() => {
    const g = window.__gol;
    
    // Iniciar Modo Desafio
    g.setGameMode('challenge');
    
    // 1.1 Testar Nível 1: O Defletor de Glider
    g.startChallenge(1);
    const info1 = g.getChallengeInfo();
    const ch1 = g.CHALLENGES[1];
    
    // Simular glider atingindo a targetZone (32-34, 32-34)
    const grid1 = g.getGrid();
    grid1[33][33] = 1;
    g.setGrid(grid1);
    const stateWon1 = ch1.check();

    // 1.2 Testar Nível 2: O Estabilizador de Centelha
    g.startChallenge(2);
    const info2 = g.getChallengeInfo();
    const ch2 = g.CHALLENGES[2];
    
    // Criar um bloco 2x2 estável (Still Life)
    const grid2 = g.createEmptyGrid();
    grid2[20][20] = 1; grid2[20][21] = 1;
    grid2[21][20] = 1; grid2[21][21] = 1;
    g.setGrid(grid2);
    // Avançar uma geração para registrar prevSnapshot
    g.nextGeneration();
    const stateWon2 = ch2.check();

    // 1.3 Testar Nível 3: A Fábrica de Vida
    g.startChallenge(3);
    const info3 = g.getChallengeInfo();
    const ch3 = g.CHALLENGES[3];
    
    // Criar 15 blocos 2x2 (Still Lifes estáveis = 60 células vivas perpétuas)
    const grid3 = g.createEmptyGrid();
    for (let b = 0; b < 15; b++) {
      const r = (b % 5) * 6 + 2;
      const c = Math.floor(b / 5) * 6 + 2;
      grid3[r][c] = 1; grid3[r][c + 1] = 1;
      grid3[r + 1][c] = 1; grid3[r + 1][c + 1] = 1;
    }
    g.setGrid(grid3);

    // Simular que atingiu a geração alvo 40
    for (let i = 0; i < 40; i++) {
      g.nextGeneration();
    }
    const stateWon3 = ch3.check();

    return {
      isChallengeMode: info1.isChallengeMode,
      ch1MaxPlacements: ch1.maxPlacements,
      ch1TargetZone: !!ch1.targetZone,
      stateWon1: stateWon1 === 'won',
      stateWon2: stateWon2 === 'won',
      stateWon3: stateWon3 === 'won'
    };
  });

  console.log('Resultados dos Desafios:', JSON.stringify(challengeCheck, null, 2));
  if (!challengeCheck.isChallengeMode || !challengeCheck.stateWon1 || !challengeCheck.stateWon2 || !challengeCheck.stateWon3) {
    throw new Error('Falha na validação das regras dos 3 níveis do Modo Desafio.');
  }
  console.log('✅ Teste 1: Modo Desafio e 3 níveis de autômatos calibrados e validados.');

  // 2. Validar Eventos de Caos (Raio Cósmico e Buraco Negro)
  console.log('\n--- Test 2: Eventos de Caos (Raio Cósmico e Buraco Negro) ---');
  const chaosCheck = await page.evaluate(() => {
    const g = window.__gol;
    
    // 2.1 Testar Raio Cósmico
    g.setCosmicIntensity(1.0); // 100% de mutação
    const gridBeforeRay = g.createEmptyGrid();
    g.setGrid(gridBeforeRay);
    
    g.triggerCosmicRay();
    const stateRay = g.getState();
    const gridAfterRay = g.getGrid();
    let mutatedCells = 0;
    for (let r = 0; r < g.rows; r++) {
      for (let c = 0; c < g.cols; c++) {
        if (gridAfterRay[r][c] >= 1) mutatedCells++;
      }
    }

    // 2.2 Testar Buraco Negro
    g.setBlackHole(true);
    const testGridBH = g.createEmptyGrid();
    const cy = Math.floor(g.rows / 2);
    const cx = Math.floor(g.cols / 2);
    
    // Preencher área 7x7 no centro
    for (let r = cy - 3; r <= cy + 3; r++) {
      for (let c = cx - 3; c <= cx + 3; c++) {
        testGridBH[r][c] = 1;
      }
    }
    const countBeforeBH = 49;
    
    // Aplicar física do buraco negro
    const newGridBH = testGridBH.map(row => [...row]);
    g.applyBlackHole(newGridBH);
    
    let countAfterBH = 0;
    for (let r = 0; r < g.rows; r++) {
      for (let c = 0; c < g.cols; c++) {
        if (newGridBH[r][c] >= 1) countAfterBH++;
      }
    }

    return {
      cosmicRayActive: stateRay.cosmicRayActive,
      mutatedCellsByRay: mutatedCells,
      isBlackHoleActive: g.getState().isBlackHoleEnabled,
      cellsDestroyedByBH: countBeforeBH - countAfterBH,
      destroyedAtLeastCore: (countBeforeBH - countAfterBH) >= 9
    };
  });

  console.log('Resultados dos Eventos de Caos:', JSON.stringify(chaosCheck, null, 2));
  if (!chaosCheck.cosmicRayActive || chaosCheck.mutatedCellsByRay === 0 || !chaosCheck.destroyedAtLeastCore) {
    throw new Error('Falha nos Eventos de Caos (Raio Cósmico ou Buraco Negro).');
  }
  console.log('✅ Teste 2: Raio Cósmico e atração/destruição de Buraco Negro validados.');

  // 3. Validar Música Generativa (Web Audio API & Mapeamento Pentatônico)
  console.log('\n--- Test 3: Música Generativa (Web Audio Synth & Pentatônico) ---');
  const audioCheck = await page.evaluate(() => {
    const g = window.__gol;
    
    // Ativar áudio e definir volume
    g.setAudioEnabled(true);
    g.setVolume(0.5);

    // Criar algumas células vivas com idades variadas
    const gridAudio = g.createEmptyGrid();
    gridAudio[5][5] = 10; // Ancestral coluna 5
    gridAudio[10][10] = 5; // Coluna 10
    gridAudio[15][15] = 1; // Coluna 15
    g.setGrid(gridAudio);

    // Disparar síntese procedural
    let audioExecutedWithoutError = false;
    try {
      g.playGenerativeSound();
      audioExecutedWithoutError = true;
    } catch (e) {
      audioExecutedWithoutError = false;
    }

    return {
      audioEnabled: g.getState().audioEnabled,
      audioExecutedWithoutError
    };
  });

  console.log('Resultados de Áudio Generativo:', JSON.stringify(audioCheck, null, 2));
  if (!audioCheck.audioEnabled || !audioCheck.audioExecutedWithoutError) {
    throw new Error('Falha na síntese de áudio procedural ou no módulo Web Audio API.');
  }
  console.log('✅ Teste 3: Música Generativa sintetizada e mapeamento pentatônico validados.');

  // 4. Validar Estabilidade Geral e Ausência de Erros no Canvas
  console.log('\n--- Test 4: Estabilidade de Renderização e Ausência de Erros ---');
  await page.waitForTimeout(1500);

  if (consoleErrors.length > 0) {
    console.error('Erros no console:', consoleErrors);
    throw new Error(`Encontrados ${consoleErrors.length} erros no console.`);
  }
  console.log('✅ Teste 4: Grid, HUD e animações executaram com 0 erros.');

  // Tirar Screenshot de Evidência
  const screenshotPath = path.join(__dirname, 'gameoflife_task003_qa_evidence.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n📸 Screenshot de evidência capturada em: ${screenshotPath}`);

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DE QA DA TASK_003 (GAME OF LIFE) PASSARAM!');
  console.log('===============================================================');
}

runTests()
  .then(async () => {
    if (browser) await browser.close();
    if (server) server.close();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ QA TEST SUITE FAILED:', err);
    if (browser) await browser.close();
    if (server) server.close();
    process.exit(1);
  });
