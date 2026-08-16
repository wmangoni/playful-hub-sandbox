process.env.NODE_ENV = 'test';
const http = require('http');
const path = require('path');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = process.env.TEST_PORT || 3099;

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
  console.log('  QA TEST SUITE - TETRIS (TASK_003)');
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
    if (msg.type() === 'error') {
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

  console.log('\n--- 1. Navegando para o jogo Tetris ---');
  await page.goto(`http://127.0.0.1:${PORT}/tetris/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => !!window.__tetris, { timeout: 15000 });

  // 1. Validar Elementos de UI do Modo Sobrevivência e Seletor
  console.log('\n--- Test 1: Verificação de UI e Modos de Jogo ---');
  const uiCheck = await page.evaluate(() => {
    const select = document.getElementById('gameModeSelect');
    const startBtn = document.getElementById('startBtn');
    const survivalBox = document.getElementById('survivalBox');
    const survivalTimer = document.getElementById('survivalTimer');
    
    // Verificar se existe a opção de Modo Sobrevivência
    let hasSurvivalOption = false;
    if (select) {
      for (const opt of select.options) {
        if (opt.value === 'survival' || opt.text.toLowerCase().includes('sobrevivência')) {
          hasSurvivalOption = true;
          break;
        }
      }
    }

    return {
      hasSelect: !!select,
      hasStartBtn: !!startBtn,
      hasSurvivalBox: !!survivalBox,
      hasSurvivalTimer: !!survivalTimer,
      hasSurvivalOption
    };
  });

  console.log('Status dos elementos de UI:', JSON.stringify(uiCheck, null, 2));
  if (!uiCheck.hasSelect || !uiCheck.hasStartBtn || !uiCheck.hasSurvivalBox || !uiCheck.hasSurvivalOption) {
    throw new Error('Elementos de UI ou opção do Modo Sobrevivência estão ausentes.');
  }
  console.log('✅ Teste 1: Elementos de interface e opção de Modo Sobrevivência validados.');

  // 2. Validar Curva de Gravidade e Level Up
  console.log('\n--- Test 2: Curva de Gravidade e Banner de Level Up ---');
  const gravityCheck = await page.evaluate(() => {
    const t = window.__tetris;
    
    // Testar cálculo de velocidade para múltiplos níveis
    const speedLvl1 = calculateDropInterval(1);
    const speedLvl2 = calculateDropInterval(2);
    const speedLvl5 = calculateDropInterval(5);
    const speedLvl10 = calculateDropInterval(10);
    const speedLvl20 = calculateDropInterval(20);

    // Testar disparo de Level Up
    triggerLevelUpEffects(2);
    const bannerExists = !!document.querySelector('.level-up-banner');

    return {
      speedLvl1,
      speedLvl2,
      speedLvl5,
      speedLvl10,
      speedLvl20,
      isExponetialDecreasing: speedLvl1 > speedLvl2 && speedLvl2 > speedLvl5 && speedLvl5 > speedLvl10,
      hasCap50ms: speedLvl20 >= 50,
      bannerExists
    };
  });

  console.log('Resultados de gravidade e level up:', JSON.stringify(gravityCheck, null, 2));
  if (!gravityCheck.isExponetialDecreasing || !gravityCheck.hasCap50ms || !gravityCheck.bannerExists) {
    throw new Error('Falha no cálculo da curva de gravidade ou no banner de Level Up.');
  }
  console.log('✅ Teste 2: Curva de gravidade matemática e banner de Level Up validados com sucesso.');

  // 3. Validar Detecção de T-Spin (Regra dos 3 Cantos) e Combos
  console.log('\n--- Test 3: Detecção de T-Spin e Sistema de Combos ---');
  const tspinCheck = await page.evaluate(() => {
    const t = window.__tetris;
    
    // Iniciar jogo para ter playerInstance
    document.getElementById('startBtn').click();

    // Criar um tabuleiro de teste 20x10
    const testBoard = Array.from({ length: 20 }, () => Array(10).fill(0));
    
    // Montar um "T-Slot" em (x: 4, y: 15)
    testBoard[14][3] = 1; // Canto Superior Esquerdo
    testBoard[14][5] = 1; // Canto Superior Direito
    testBoard[16][3] = 1; // Canto Inferior Esquerdo
    t.setBoard(testBoard);
    
    // Criar uma peça T (tipo 6)
    const tPiece = {
      type: 6,
      pos: { x: 3, y: 14 },
      shape: [
        [0, 6, 0, 0],
        [6, 6, 6, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ]
    };
    t.setPiece(tPiece);

    // Caso A: última ação foi rotação -> T-Spin Detectado
    t.setLastAction('rotate');
    const isTSpinValid = t.detectTSpin();

    // Caso B: última ação foi movimento lateral -> T-Spin NÃO Detectado
    t.setLastAction('move');
    const isTSpinInvalidAction = t.detectTSpin();

    // Caso C: peça não é T (ex: peça I tipo 1) -> T-Spin NÃO Detectado
    const iPiece = { ...tPiece, type: 1 };
    t.setPiece(iPiece);
    t.setLastAction('rotate');
    const isTSpinInvalidType = t.detectTSpin();

    // Testar floating texts
    t.spawnFloatingText("T-SPIN DOUBLE +1200", 4, 15, '#9C5AFF');
    const state = t.getState();
    const hasFloatingTexts = state.floatingTexts > 0;

    return {
      isTSpinValid,
      isTSpinInvalidAction: !isTSpinInvalidAction,
      isTSpinInvalidType: !isTSpinInvalidType,
      hasFloatingTexts
    };
  });

  console.log('Resultados de T-Spin e Combos:', JSON.stringify(tspinCheck, null, 2));
  if (!tspinCheck.isTSpinValid || !tspinCheck.isTSpinInvalidAction || !tspinCheck.isTSpinInvalidType || !tspinCheck.hasFloatingTexts) {
    throw new Error('Falha no algoritmo de detecção de T-Spin (3-Corner Rule) ou Floating Texts.');
  }
  console.log('✅ Teste 3: Detecção de T-Spin pela Regra dos 3 Cantos e popups flutuantes validados.');

  // 4. Validar Modo Sobrevivência (Garbage Rows & Timer de 12s)
  console.log('\n--- Test 4: Modo Sobrevivência (Garbage Rows e Injeção de Linhas) ---');
  const survivalCheck = await page.evaluate(async () => {
    const t = window.__tetris;
    const select = document.getElementById('gameModeSelect');
    select.value = 'survival';
    select.dispatchEvent(new Event('change'));

    // Iniciar jogo em modo sobrevivência
    document.getElementById('startBtn').click();

    await new Promise(r => setTimeout(r, 200));

    // Verificar se o tabuleiro foi pré-populado com linhas de lixo na base
    const stateBoard = t.getBoard();
    const rows = stateBoard.length;
    const cols = stateBoard[0].length;

    // Verificar linhas de lixo (blocos cinza com valor 8)
    let garbageRowCount = 0;
    for (let y = rows - 1; y >= rows - 8; y--) {
      if (y >= 0) {
        const hasGarbage = stateBoard[y].some(cell => cell === 8);
        if (hasGarbage) garbageRowCount++;
      }
    }

    // Testar função insertGarbageRow() manualmente
    t.insertGarbageRow();
    const newBoard = t.getBoard();
    const newBottomRow = newBoard[rows - 1];
    const newGarbageCount = newBottomRow.filter(c => c === 8).length;

    return {
      isSurvivalMode: t.getState().gameMode === 'survival',
      initialGarbageRows: garbageRowCount,
      insertedRowHas9Blocks: newGarbageCount === 9,
      hasOneHole: newBottomRow.filter(c => c === 0).length === 1
    };
  });

  console.log('Resultados do Modo Sobrevivência:', JSON.stringify(survivalCheck, null, 2));
  if (!survivalCheck.isSurvivalMode || survivalCheck.initialGarbageRows < 4 || !survivalCheck.insertedRowHas9Blocks || !survivalCheck.hasOneHole) {
    throw new Error('Falha na inicialização do Modo Sobrevivência ou na geração de linhas de lixo.');
  }
  console.log('✅ Teste 4: Modo Sobrevivência com linhas de lixo cinza e inserção com 1 buraco validado.');

  // 5. Validar Estabilidade e Ausência de Erros no Console
  console.log('\n--- Test 5: Estabilidade de Execução e Ausência de Erros ---');
  await page.waitForTimeout(1500);

  if (consoleErrors.length > 0) {
    console.error('Erros encontrados no console:', consoleErrors);
    throw new Error(`Encontrados ${consoleErrors.length} erros no console.`);
  }
  console.log('✅ Teste 5: Motor de jogo e loop de animação executaram com 0 erros.');

  // Tirar Screenshot de Evidência
  const screenshotPath = path.join(__dirname, 'tetris_task003_qa_evidence.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n📸 Screenshot de evidência capturada em: ${screenshotPath}`);

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DE QA DA TASK_003 (TETRIS) PASSARAM COM SUCESSO!');
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
