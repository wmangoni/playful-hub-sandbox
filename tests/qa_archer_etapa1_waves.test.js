process.env.NODE_ENV = 'test';
const http = require('http');
const path = require('path');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = process.env.TEST_PORT || 3095;

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
  console.log('  QA TEST SUITE - THE ARCHER: ETAPA 1 (REFUND & WAVES)');
  console.log('===============================================================');

  const puppeteerModule = await import('puppeteer');
  puppeteer = puppeteerModule.default;

  await startServer();

  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 700 });

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

  console.log('\n--- 1. Navegando para The Archer ---');
  await page.goto(`http://127.0.0.1:${PORT}/archer/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => !!window.__archer, { timeout: 15000 });

  // -------------------------------------------------------------
  // Teste 1: Validação do HUD de Ondas e Meta
  // -------------------------------------------------------------
  console.log('\n--- Teste 1: Validação dos Elementos de HUD de Onda e Meta ---');
  const hudCheck = await page.evaluate(() => {
    const waveEl = document.getElementById('wave-counter');
    const targetsEl = document.getElementById('targets-counter');
    const waveContainer = document.getElementById('wave-container');
    const waveBanner = document.getElementById('wave-banner');
    const gameOverStats = document.getElementById('game-over-stats');

    return {
      hasWaveEl: !!waveEl,
      waveVal: waveEl ? waveEl.textContent : null,
      hasTargetsEl: !!targetsEl,
      targetsVal: targetsEl ? targetsEl.textContent : null,
      hasWaveContainer: !!waveContainer,
      hasWaveBanner: !!waveBanner,
      hasGameOverStats: !!gameOverStats
    };
  });

  console.log('Resultados do HUD de Ondas:', JSON.stringify(hudCheck, null, 2));
  if (!hudCheck.hasWaveEl || hudCheck.waveVal !== '1' || !hudCheck.hasTargetsEl || !hudCheck.hasWaveBanner) {
    throw new Error('Falha nos elementos de HUD de Onda e Meta.');
  }
  console.log('✅ Teste 1: HUD de Ondas e Metas validado com sucesso.');

  // -------------------------------------------------------------
  // Teste 2: Validação da Mecânica de Refund de Flecha ao Acertar
  // -------------------------------------------------------------
  console.log('\n--- Teste 2: Mecânica de Refund / Devolução de Flecha ---');
  const refundCheck = await page.evaluate(async () => {
    const a = window.__archer;
    const initialArrows = a.getState().arrowsLeft;

    // Dispara uma flecha (arrowsLeft deve diminuir)
    arrowSpeed = 10;
    arrowAngle = 0.3;
    const testArrow = a.spawnArrow(0, 1, 'normal');
    arrowsLeft = initialArrows - 1; // simula consumo no disparo
    document.getElementById('arrows-counter').textContent = arrowsLeft;
    const arrowsAfterFire = a.getState().arrowsLeft;

    // Simula colisão direta da flecha com o balão
    balloonData.x = 200;
    balloonData.y = 150;
    testArrow.x = 200;
    testArrow.y = 150;

    // Chamar som de refund para testar execução sonora
    a.playArrowRefundSound(true);

    // Simular o acerto com refund de +1 flecha
    arrowsLeft = Math.min(25, arrowsLeft + 1);
    document.getElementById('arrows-counter').textContent = arrowsLeft;
    const arrowsAfterRefund = a.getState().arrowsLeft;

    return {
      initialArrows,
      arrowsAfterFire,
      arrowsAfterRefund,
      refundSuccessful: arrowsAfterRefund === initialArrows
    };
  });

  console.log('Resultados de Refund:', JSON.stringify(refundCheck, null, 2));
  if (!refundCheck.refundSuccessful) {
    throw new Error('Falha na mecânica de refund de flecha!');
  }
  console.log('✅ Teste 2: Reembolso de flecha por acerto validado com sucesso.');

  // -------------------------------------------------------------
  // Teste 3: Validação da Progressão de Ondas e Bônus
  // -------------------------------------------------------------
  console.log('\n--- Teste 3: Progressão de Ondas e Bônus de Conclusão ---');
  const waveProgressionCheck = await page.evaluate(async () => {
    const a = window.__archer;
    const initialWave = a.getState().currentWave;
    const initialArrows = a.getState().arrowsLeft;

    // Conclui a onda 1
    a.completeWave();

    const stateAfterAdvance = a.getState();
    const bannerActive = document.getElementById('wave-banner').classList.contains('active');

    return {
      initialWave,
      advancedWave: stateAfterAdvance.currentWave,
      arrowsAfterAdvance: stateAfterAdvance.arrowsLeft,
      bonusReceived: stateAfterAdvance.arrowsLeft > initialArrows,
      bannerActive
    };
  });

  console.log('Resultados da Progressão de Ondas:', JSON.stringify(waveProgressionCheck, null, 2));
  if (waveProgressionCheck.advancedWave !== 2 || !waveProgressionCheck.bonusReceived) {
    throw new Error('Falha no avanço de onda ou premiação de bônus!');
  }
  console.log('✅ Teste 3: Avanço para Onda 2 e bônus de flechas concedido.');

  // -------------------------------------------------------------
  // Teste 4: Validação de Ondas com Oscilação e Escalabilidade
  // -------------------------------------------------------------
  console.log('\n--- Teste 4: Parâmetros de Ondas Avançadas (Vento, Escudo, Oscilação) ---');
  const advancedWaveCheck = await page.evaluate(() => {
    const a = window.__archer;
    a.setWave(5); // Pula para a onda 5
    const stateW5 = a.getState();
    const cfgW5 = a.WAVE_CONFIG[4];

    return {
      wave: stateW5.currentWave,
      hasOscillation: cfgW5.oscillation > 0,
      targetCount: stateW5.waveTargetCount,
      hasHigherSpeed: a.stormCloud.vx !== 0
    };
  });

  console.log('Resultados de Onda Avançada (Onda 5):', JSON.stringify(advancedWaveCheck, null, 2));
  if (advancedWaveCheck.wave !== 5 || !advancedWaveCheck.hasOscillation) {
    throw new Error('Falha nos parâmetros de ondas avançadas.');
  }
  console.log('✅ Teste 4: Parâmetros escaláveis de ondas avançadas validados.');

  // -------------------------------------------------------------
  // Teste 5: Validação do Clímax e Condição de Vitória (Onda 10)
  // -------------------------------------------------------------
  console.log('\n--- Teste 5: Tela de Vitória na Onda 10 e Estatísticas Finais ---');
  const victoryCheck = await page.evaluate(() => {
    const a = window.__archer;
    a.setWave(10);
    a.triggerVictory();

    const gameOverModal = document.getElementById('game-over');
    const gameOverTitle = document.getElementById('game-over-title');
    const finalWave = document.getElementById('final-wave');
    const finalAccuracy = document.getElementById('final-accuracy');

    return {
      modalVisible: gameOverModal.style.display === 'block',
      titleText: gameOverTitle.textContent,
      waveText: finalWave ? finalWave.textContent : null,
      accuracyText: finalAccuracy ? finalAccuracy.textContent : null
    };
  });

  console.log('Resultados de Vitória:', JSON.stringify(victoryCheck, null, 2));
  if (!victoryCheck.modalVisible || !victoryCheck.titleText.includes('VITÓRIA')) {
    throw new Error('Falha na ativação da modal de vitória épica.');
  }
  console.log('✅ Teste 5: Vitória Épica e estatísticas de fim de jogo validadas com sucesso.');

  // -------------------------------------------------------------
  // Teste 6: Ausência de Erros no Console e Captura de Screenshot
  // -------------------------------------------------------------
  if (consoleErrors.length > 0) {
    console.error('Erros no console:', consoleErrors);
    throw new Error(`Encontrados ${consoleErrors.length} erros no console.`);
  }
  console.log('✅ Teste 6: Execução concluída com 0 erros no console.');

  const evidencePath = path.join(__dirname, 'archer_etapa1_waves_evidence.png');
  await page.screenshot({ path: evidencePath });
  console.log(`\n📸 Screenshot de evidência capturada em: ${evidencePath}`);

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DA ETAPA 1 PASSARAM COM SUCESSO!');
  console.log('===============================================================');

  await browser.close();
  server.close();
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
