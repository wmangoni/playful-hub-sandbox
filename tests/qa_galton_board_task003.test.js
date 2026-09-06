process.env.NODE_ENV = 'test';
const http = require('http');
const path = require('path');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = process.env.TEST_PORT || 3097;

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
  console.log('  QA TEST SUITE - TABULEIRO DE GALTON (TASK_003)');
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
    if (msg.type() === 'error' && !text.includes('ERR_NAME_NOT_RESOLVED') && !text.includes('favicon')) {
      console.log(`[BROWSER ERROR] ${text}`);
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', err => {
    console.log(`[BROWSER PAGEERROR] ${err.toString()}`);
    consoleErrors.push(err.toString());
  });

  console.log('\n--- 1. Carregando Tabuleiro de Galton ---');
  await page.goto(`http://127.0.0.1:${PORT}/tabuleiro_galton/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('#galtonCanvas', { timeout: 5000 });

  // 1. Validar Elementos DOM da Interface e Modo Desafio
  console.log('\n--- Teste 1: Validação de Componentes de UI e DOM ---');
  const domElements = await page.evaluate(() => {
    return {
      hasCanvas: !!document.getElementById('galtonCanvas'),
      hasChallengeSelector: !!document.getElementById('challengeSelector'),
      hasStartChallengeBtn: !!document.getElementById('startChallengeBtn'),
      hasCancelChallengeBtn: !!document.getElementById('cancelChallengeBtn'),
      hasChallengeInfoBox: !!document.getElementById('challengeInfoBox'),
      hasChallengeStatusBox: !!document.getElementById('challengeStatusBox'),
      hasMatchPercentDisplay: !!document.getElementById('matchPercentDisplay'),
      hasAddBallBtn: !!document.getElementById('addBallBtn'),
      hasAdd10BallsBtn: !!document.getElementById('add10BallsBtn'),
      hasResetBtn: !!document.getElementById('resetBtn'),
      hasLayoutSelector: !!document.getElementById('layoutSelector'),
      hasProbSlider: !!document.getElementById('probSlider'),
      hasGravitySlider: !!document.getElementById('gravitySlider'),
      hasElasticitySlider: !!document.getElementById('elasticitySlider'),
      hasShowGaussCheck: !!document.getElementById('showGaussCheck')
    };
  });

  console.log('Elementos DOM detectados:', JSON.stringify(domElements, null, 2));
  for (const [key, value] of Object.entries(domElements)) {
    if (!value) throw new Error(`Elemento DOM ausente: ${key}`);
  }
  console.log('✅ Teste 1: Todos os componentes de UI estão presentes no DOM.');

  // 2. Validar Pinos Especiais (Portal In/Out, Splitter, Vortex)
  console.log('\n--- Teste 2: Validação da Geração de Pinos Especiais ---');
  const specialPegsCheck = await page.evaluate(() => {
    const specialTypes = {};
    pegs.forEach(p => {
      if (p.type && p.type !== 'normal') {
        specialTypes[p.type] = {
          x: p.x,
          y: p.y,
          color: p.color,
          radius: p.radius
        };
      }
    });

    return {
      totalPegs: pegs.length,
      hasPortalIn: !!specialTypes['portal-in'],
      hasPortalOut: !!specialTypes['portal-out'],
      hasSplitter: !!specialTypes['splitter'],
      hasVortex: !!specialTypes['vortex'],
      portalInColor: specialTypes['portal-in']?.color,
      portalOutColor: specialTypes['portal-out']?.color,
      splitterColor: specialTypes['splitter']?.color,
      vortexColor: specialTypes['vortex']?.color
    };
  });

  console.log('Status dos Pinos Especiais:', JSON.stringify(specialPegsCheck, null, 2));
  if (!specialPegsCheck.hasPortalIn || specialPegsCheck.portalInColor !== '#00d2ff') {
    throw new Error('Pino Portal In (#00d2ff) ausente ou incorreto');
  }
  if (!specialPegsCheck.hasPortalOut || specialPegsCheck.portalOutColor !== '#ff9f43') {
    throw new Error('Pino Portal Out (#ff9f43) ausente ou incorreto');
  }
  if (!specialPegsCheck.hasSplitter || specialPegsCheck.splitterColor !== '#b833ff') {
    throw new Error('Pino Splitter (#b833ff) ausente ou incorreto');
  }
  if (!specialPegsCheck.hasVortex || specialPegsCheck.vortexColor !== '#00ffcc') {
    throw new Error('Pino Vortex (#00ffcc) ausente ou incorreto');
  }
  console.log('✅ Teste 2: Pinos especiais (Portal In/Out, Splitter, Vortex) gerados com propriedades corretas.');

  // 3. Validar Comportamento Físico dos Pinos Especiais
  console.log('\n--- Teste 3: Comportamento Físico de Teletransporte, Multiplicação e Gravidade Vortex ---');
  const physicsCheck = await page.evaluate(() => {
    // 3.1 Teste de Teletransporte
    const portalIn = pegs.find(p => p.type === 'portal-in');
    const portalOut = pegs.find(p => p.type === 'portal-out');

    balls = [];
    balls.push({
      x: portalIn.x,
      y: portalIn.y,
      vx: 0,
      vy: 1,
      radius: ballRadius,
      active: true,
      color: '#00ccff'
    });

    update(1.0);
    const teleportedBall = balls[0];
    const teleportSuccess = teleportedBall && (Math.abs(teleportedBall.x - portalOut.x) < 5) && (teleportedBall.y > portalOut.y);

    // 3.2 Teste de Multiplicação (Splitter)
    const splitter = pegs.find(p => p.type === 'splitter');
    balls = [];
    balls.push({
      x: splitter.x,
      y: splitter.y,
      vx: 0,
      vy: 1,
      radius: ballRadius,
      active: true,
      color: '#00ccff'
    });

    update(1.0);
    const activeBalls = balls.filter(b => b.active);
    const splitSuccess = activeBalls.length === 2 && activeBalls.every(b => b.color === '#39ff14');

    // 3.3 Teste do Vortex (Atração Radial)
    const vortex = pegs.find(p => p.type === 'vortex');
    balls = [];
    balls.push({
      x: vortex.x - 20,
      y: vortex.y,
      vx: 0,
      vy: 0,
      radius: ballRadius,
      active: true,
      color: '#00ccff'
    });

    update(1.0);
    const vortexBall = balls[0];
    const vortexAttracted = vortexBall && vortexBall.vx > 0;

    return {
      teleportSuccess,
      splitSuccess,
      vortexAttracted,
      activeBallsAfterSplit: activeBalls.length
    };
  });

  console.log('Resultados dos Testes Físicos dos Pinos Especiais:', JSON.stringify(physicsCheck, null, 2));
  if (!physicsCheck.teleportSuccess) throw new Error('Falha na mecânica de Teletransporte');
  if (!physicsCheck.splitSuccess) throw new Error('Falha na mecânica de Multiplicação do Splitter');
  if (!physicsCheck.vortexAttracted) throw new Error('Falha na força de atração gravitacional do Vortex');
  console.log('✅ Teste 3: Física de Teletransporte, Multiplicação e Atração Vortex funcionando perfeitamente.');

  // 4. Validar os 3 Níveis do Modo Desafio (Target Fitting)
  console.log('\n--- Teste 4: Modo Desafio (Target Fitting - 3 Níveis de Regras e Validações) ---');
  const challengeRulesCheck = await page.evaluate(() => {
    // 4.1 Desafio 1: Curva Inclinada (Skewed Right)
    CHALLENGES.skewed.setup();
    const ch1SetupProb = probabilityRight;
    const ch1Layout = layoutSelector.value;

    bins.forEach(b => { b.count = 0; });
    const M = bins.length;
    const p = 0.7;
    const mean = (M - 1) * p;
    const sigma = Math.sqrt((M - 1) * p * (1 - p));
    let totalAssigned = 0;

    for (let i = 0; i < M; i++) {
      const exponent = -Math.pow(i - mean, 2) / (2 * Math.pow(sigma, 2));
      const pdf = (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
      const count = Math.round(pdf * 100);
      bins[i].count = count;
      totalAssigned += count;
    }
    const diff = 100 - totalAssigned;
    bins[Math.round(mean)].count += diff;

    const ch1Result = CHALLENGES.skewed.check();

    // 4.2 Desafio 2: Twin Peaks (Bimodal)
    CHALLENGES.bimodal.setup();
    const ch2Layout = layoutSelector.value;
    bins.forEach(b => { b.count = 0; });
    bins[3].count = 26;
    bins[12].count = 27;
    bins[6].count = 2;
    bins[7].count = 2;
    bins[8].count = 2;
    bins[9].count = 2;

    const ch2Result = CHALLENGES.bimodal.check();

    // 4.3 Desafio 3: Grade Uniforme
    CHALLENGES.uniform.setup();
    const ch3Layout = layoutSelector.value;
    bins.forEach(b => { b.count = 0; });
    for (let i = 0; i < 16; i++) {
      bins[i].count = 7;
    }
    for (let i = 0; i < 8; i++) {
      bins[i].count += 1;
    }

    const ch3Result = CHALLENGES.uniform.check();

    return {
      ch1SetupProb,
      ch1Layout,
      ch1Success: ch1Result.success,
      ch1Match: ch1Result.match,
      ch2Layout,
      ch2Success: ch2Result.success,
      ch2Match: ch2Result.match,
      ch3Layout,
      ch3Success: ch3Result.success,
      ch3Match: ch3Result.match
    };
  });

  console.log('Resultados dos Desafios:', JSON.stringify(challengeRulesCheck, null, 2));
  if (challengeRulesCheck.ch1SetupProb !== 0.7 || !challengeRulesCheck.ch1Success) {
    throw new Error('Desafio 1 (Curva Inclinada) falhou no setup ou na validação MSE');
  }
  if (challengeRulesCheck.ch2Layout !== 'bimodal' || !challengeRulesCheck.ch2Success) {
    throw new Error('Desafio 2 (Twin Peaks) falhou no setup ou na validação das colunas');
  }
  if (challengeRulesCheck.ch3Layout !== 'uniform' || !challengeRulesCheck.ch3Success) {
    throw new Error('Desafio 3 (Grade Uniforme) falhou no setup ou na validação de balanceamento');
  }
  console.log('✅ Teste 4: Regras estatísticas e algoritmos dos 3 desafios validados com sucesso.');

  // 5. Validar Áudio Procedural Web Audio API
  console.log('\n--- Teste 5: Módulo de Áudio Procedural (Web Audio Synth) ---');
  const audioCheck = await page.evaluate(() => {
    let initOk = false;
    let toneOk = false;
    let teleportAudioOk = false;
    let splitAudioOk = false;
    let victoryAudioOk = false;

    try {
      initAudio();
      initOk = !!audioCtx;

      playCollisionTone(300);
      toneOk = true;

      playAudio('teleport');
      teleportAudioOk = true;

      playAudio('split');
      splitAudioOk = true;

      playAudio('victory');
      victoryAudioOk = true;
    } catch (e) {
      console.error('Erro no áudio:', e);
    }

    return {
      initOk,
      toneOk,
      teleportAudioOk,
      splitAudioOk,
      victoryAudioOk,
      audioCtxState: audioCtx ? audioCtx.state : null,
      scaleLength: PENTATONIC_SCALE.length
    };
  });

  console.log('Resultados do Módulo de Áudio:', JSON.stringify(audioCheck, null, 2));
  if (!audioCheck.initOk || !audioCheck.toneOk || !audioCheck.teleportAudioOk || !audioCheck.splitAudioOk || !audioCheck.victoryAudioOk) {
    throw new Error('Falha no sintetizador Web Audio API');
  }
  console.log('✅ Teste 5: Síntese de áudio procedural sem assets externos validada.');

  // 6. Teste de Interação de UI via Cliques e Simulação no Navegador
  console.log('\n--- Teste 6: Fluxo Interativo de UI (Botões, Seletores e Simulação Ativa) ---');
  await page.select('#challengeSelector', 'bimodal');
  await page.click('#startChallengeBtn');

  await page.click('#add10BallsBtn');
  await new Promise(r => setTimeout(r, 600));
  await page.click('#add10BallsBtn');
  await new Promise(r => setTimeout(r, 600));
  await page.click('#addBallBtn');
  await new Promise(r => setTimeout(r, 1200));

  const simulationState = await page.evaluate(() => {
    return {
      activeChallenge: activeChallengeKey,
      totalBalls: totalBallCount,
      activeBalls: balls.filter(b => b.active).length,
      collectedBalls: bins.reduce((sum, b) => sum + b.count, 0),
      matchText: matchPercentDisplay.textContent,
      challengeStatusVisible: challengeStatusBox.style.display !== 'none'
    };
  });

  console.log('Estado da Simulação Interativa:', JSON.stringify(simulationState, null, 2));
  if (simulationState.totalBalls < 21) {
    throw new Error(`Total de bolas geradas insuficiente: ${simulationState.totalBalls}`);
  }
  if (!simulationState.challengeStatusVisible) {
    throw new Error('Caixa de status do desafio não está visível');
  }
  console.log('✅ Teste 6: Fluxo de interação e simulação em tempo real validado.');

  // 7. Verificar Erros no Console
  if (consoleErrors.length > 0) {
    throw new Error(`Erros detectados no console do navegador: ${consoleErrors.join(', ')}`);
  }

  // 8. Capturar Screenshot de Evidência
  const screenshotPath = path.join(__dirname, 'galton_board_task003_qa_evidence.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n📸 Evidência visual salva com sucesso em: ${screenshotPath}`);

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DE QA DA TASK_003 (TABULEIRO DE GALTON) PASSARAM!');
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
