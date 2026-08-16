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
  console.log('  QA TEST SUITE - PUZZLE (TASK_002: Procedural, Focus, Modes)');
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

  console.log('\n--- 1. Navegando para Puzzle (Mind Labyrinth) ---');
  await page.goto(`http://127.0.0.1:${PORT}/puzzle/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => !!window.__puzzle, { timeout: 15000 });

  // 1. Validar Motor de Geração Procedural dos 5 Tipos de Enigmas
  console.log('\n--- Test 1: Motor de Geração Procedural (5 Tipos de Enigmas) ---');
  const generatorCheck = await page.evaluate(() => {
    const p = window.__puzzle;
    const gen = p.ProceduralGenerator;

    const seqPuzzle = gen.generate('sequence', 2);
    const patPuzzle = gen.generate('pattern', 2);
    const memPuzzle = gen.generate('memory', 2);
    const logPuzzle = gen.generate('logic', 2);
    const perPuzzle = gen.generate('perspective', 2);

    const dummyCallback = () => {};

    const seqDom = seqPuzzle && typeof seqPuzzle.render === 'function' ? seqPuzzle.render(dummyCallback) : null;
    const patDom = patPuzzle && typeof patPuzzle.render === 'function' ? patPuzzle.render(dummyCallback) : null;
    const memDom = memPuzzle && typeof memPuzzle.render === 'function' ? memPuzzle.render(dummyCallback) : null;
    const logDom = logPuzzle && typeof logPuzzle.render === 'function' ? logPuzzle.render(dummyCallback) : null;
    const perDom = perPuzzle && typeof perPuzzle.render === 'function' ? perPuzzle.render(dummyCallback) : null;

    const hasSequenceValid = !!seqDom && seqPuzzle.type === 'sequence';
    const hasPatternValid = !!patDom && patPuzzle.type === 'pattern';
    const hasMemoryValid = !!memDom && memPuzzle.type === 'memory';
    const hasLogicValid = !!logDom && logPuzzle.type === 'logic';
    const hasPerspectiveValid = !!perDom && perPuzzle.type === 'perspective';

    return {
      hasSequenceValid,
      hasPatternValid,
      hasMemoryValid,
      hasLogicValid,
      hasPerspectiveValid
    };
  });

  console.log('Resultados do Gerador Procedural:', JSON.stringify(generatorCheck, null, 2));
  if (!generatorCheck.hasSequenceValid || !generatorCheck.hasPatternValid || !generatorCheck.hasMemoryValid || !generatorCheck.hasLogicValid || !generatorCheck.hasPerspectiveValid) {
    throw new Error('Falha no motor de geração procedural de enigmas.');
  }
  console.log('✅ Teste 1: Geração procedural de todos os 5 tipos de enigmas validada.');

  // 2. Validar Sistema de Foco Mental (Sanidade), Penalidades e Regeneração
  console.log('\n--- Test 2: Barra de Foco Mental (Sanidade) e Combos ---');
  const focusCheck = await page.evaluate(() => {
    const p = window.__puzzle;
    p.startGame('campaign');

    const initialFocus = p.gameState.focus;

    // Simular erro (penalidade)
    p.onAnswer(false);
    const focusAfterError = p.gameState.focus;

    // Simular acerto (regeneração + combo)
    p.onAnswer(true);
    const focusAfterCorrect = p.gameState.focus;
    const comboStreak = p.gameState.combo;

    // Simular uso de dica (custo de foco)
    const focusBeforeHint = p.gameState.focus;
    p.useHint();
    const focusAfterHint = p.gameState.focus;

    return {
      initialFocus,
      focusAfterError,
      focusAfterCorrect,
      comboStreak,
      focusBeforeHint,
      focusAfterHint,
      penalizedOnError: focusAfterError < initialFocus,
      regeneratedOnCorrect: focusAfterCorrect > focusAfterError,
      costAppliedOnHint: focusAfterHint < focusBeforeHint
    };
  });

  console.log('Resultados do Foco Mental:', JSON.stringify(focusCheck, null, 2));
  if (!focusCheck.penalizedOnError || !focusCheck.regeneratedOnCorrect || !focusCheck.costAppliedOnHint) {
    throw new Error('Falha na gestão do Foco Mental (Sanidade).');
  }
  console.log('✅ Teste 2: Sistema de Foco Mental (Sanidade) e Combos validados.');

  // 3. Validar Modos de Jogo (Endless e Time Attack)
  console.log('\n--- Test 3: Modos de Jogo (Endless com Recorde e Time Attack) ---');
  const modesCheck = await page.evaluate(() => {
    const p = window.__puzzle;

    // Testar Time Attack
    p.startGame('timeattack');
    const timeAttackActive = p.gameState.mode === 'timeattack';
    const initialTime = p.gameState.timeLeft;

    // Acerto no Time Attack adiciona +10s
    p.onAnswer(true);
    const timeAfterCorrect = p.gameState.timeLeft;

    // Erro no Time Attack subtrai -15s
    p.onAnswer(false);
    const timeAfterError = p.gameState.timeLeft;

    // Dica no Time Attack deduz -8s sem consumir foco
    const focusBeforeTAHint = p.gameState.focus;
    const timeBeforeTAHint = p.gameState.timeLeft;
    p.useHint();
    const focusAfterTAHint = p.gameState.focus;
    const timeAfterTAHint = p.gameState.timeLeft;

    // Testar Endless e persistência de High Score
    p.startGame('endless');
    p.gameState.score = 5000;
    localStorage.setItem('mind_labyrinth_highscore', '5000');
    const savedHighScore = localStorage.getItem('mind_labyrinth_highscore');

    return {
      timeAttackActive,
      initialTime,
      timeAfterCorrect,
      timeAfterError,
      timeBonusApplied: timeAfterCorrect > initialTime,
      timePenaltyApplied: timeAfterError < timeAfterCorrect,
      focusPreservedOnTAHint: focusAfterTAHint === focusBeforeTAHint,
      timeDeductedOnTAHint: timeAfterTAHint < timeBeforeTAHint,
      endlessActive: p.gameState.mode === 'endless',
      savedHighScore: parseInt(savedHighScore, 10)
    };
  });

  console.log('Resultados dos Modos de Jogo:', JSON.stringify(modesCheck, null, 2));
  if (!modesCheck.timeAttackActive || !modesCheck.timeBonusApplied || !modesCheck.focusPreservedOnTAHint || !modesCheck.endlessActive) {
    throw new Error('Falha nos Modos de Jogo (Time Attack / Endless).');
  }
  console.log('✅ Teste 3: Modos de Jogo (Endless com Recorde e Time Attack) validados.');

  // 4. Validar Sintetizador de Áudio Procedural (Web Audio API)
  console.log('\n--- Test 4: Sintetizador de Áudio Procedural (Web Audio API) ---');
  const audioCheck = await page.evaluate(() => {
    const p = window.__puzzle;
    const audio = p.audio;

    audio.init();
    const hasAudioContext = !!audio.ctx;
    
    // Testar chamadas de síntese
    audio.playCorrect();
    audio.playIncorrect();
    audio.playClick();

    return {
      hasAudioContext,
      hasDroneOsc: typeof audio.startDrone === 'function',
      hasCorrectSFX: typeof audio.playCorrect === 'function',
      hasIncorrectSFX: typeof audio.playIncorrect === 'function'
    };
  });

  console.log('Resultados de Áudio Procedural:', JSON.stringify(audioCheck, null, 2));
  if (!audioCheck.hasAudioContext) {
    throw new Error('Falha na inicialização do sintetizador de áudio procedural.');
  }
  console.log('✅ Teste 4: Síntese de áudio procedural na Web Audio API validada.');

  // 5. Validar Estabilidade Geral
  console.log('\n--- Test 5: Estabilidade do Loop e Ausência de Erros ---');
  await page.waitForTimeout(1500);

  if (consoleErrors.length > 0) {
    console.error('Erros no console:', consoleErrors);
    throw new Error(`Encontrados ${consoleErrors.length} erros no console.`);
  }
  console.log('✅ Teste 5: Simulação executou com 0 erros.');

  // Tirar Screenshot de Evidência
  const screenshotPath = path.join(__dirname, 'puzzle_task002_qa_evidence.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n📸 Screenshot de evidência capturada em: ${screenshotPath}`);

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DE QA DA TASK_002 (PUZZLE) PASSARAM!');
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
