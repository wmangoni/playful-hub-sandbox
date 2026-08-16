process.env.NODE_ENV = 'test';
const http = require('http');
const path = require('path');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = process.env.TEST_PORT || 3098;

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
  console.log('  QA TEST SUITE - PINBALL (TASK_002: Missions, Multiball, Gravity)');
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

  console.log('\n--- 1. Navegando para Pinball ---');
  await page.goto(`http://127.0.0.1:${PORT}/pinball/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => !!window.__pinball, { timeout: 15000 });

  // 1. Validar Sistema de Multibolas (Spawning, Array e Colisão Elástica 2D)
  console.log('\n--- Test 1: Mecânica de Multibolas e Colisão Elástica 2D ---');
  const multiballCheck = await page.evaluate(() => {
    const p = window.__pinball;
    
    // Spawnar Multiball
    p.spawnMultiball();
    const balls = p.getActiveBalls();
    const ballsCount = balls.length;

    // Testar colisão elástica 2D entre 2 bolas
    const b1 = balls[0];
    const b2 = balls[1];
    b1.x = 100; b1.y = 100; b1.speedX = 4; b1.speedY = 0;
    b2.x = 110; b2.y = 100; b2.speedX = -2; b2.speedY = 0; // Sobreposição (< radius 8*2 = 16)

    p.checkBallToBallCollisions();

    const separationDist = Math.abs(b2.x - b1.x);
    const velocitiesExchanged = b1.speedX < 0 && b2.speedX > 0;

    return {
      ballsCount,
      separationDist,
      velocitiesExchanged,
      resolvedOverlap: separationDist >= 15.5
    };
  });

  console.log('Resultados de Multiball:', JSON.stringify(multiballCheck, null, 2));
  if (multiballCheck.ballsCount < 3 || !multiballCheck.resolvedOverlap || !multiballCheck.velocitiesExchanged) {
    throw new Error('Falha no sistema de Multibolas ou na colisão elástica 2D bola-bola.');
  }
  console.log('✅ Teste 1: Spawning de Multibolas e Colisão Elástica 2D validados.');

  // 2. Validar Multiplicador de Sobrevivência e Dreno Seguro
  console.log('\n--- Test 2: Multiplicador de Sobrevivência e Dreno com Múltiplas Bolas ---');
  const survivalAndDrainCheck = await page.evaluate(() => {
    const p = window.__pinball;
    const initialScore = p.getScore();
    const initialLives = p.getLives();

    // Adicionar 100 pontos base com 3 bolas ativas
    p.addScore(100);
    const scoreWith3Balls = p.getScore() - initialScore;

    // Drenar 1 bola (deve restar 2 bolas e manter as vidas)
    const balls = p.getActiveBalls();
    const drainedBall = balls[0];
    drainedBall.y = 9999;
    p.handleDrainCheck(drainedBall, 0);

    const ballsAfterOneDrain = p.getActiveBalls().length;
    const livesAfterOneDrain = p.getLives();

    return {
      scoreWith3Balls,
      expectedMinScore: 300,
      ballsAfterOneDrain,
      livesAfterOneDrain,
      livesMaintained: livesAfterOneDrain === initialLives
    };
  });

  console.log('Resultados de Sobrevivência e Dreno:', JSON.stringify(survivalAndDrainCheck, null, 2));
  if (survivalAndDrainCheck.scoreWith3Balls < 300 || survivalAndDrainCheck.ballsAfterOneDrain !== 2 || !survivalAndDrainCheck.livesMaintained) {
    throw new Error('Falha no multiplicador de sobrevivência ou na retenção de vidas durante o dreno em multibola.');
  }
  console.log('✅ Teste 2: Multiplicador de sobrevivência e dreno com múltiplas bolas validados.');

  // 3. Validar Modos de Gravidade Mutáveis (Low Gravity e Overdrive)
  console.log('\n--- Test 3: Modos de Gravidade Mutáveis (Low Gravity & Overdrive) ---');
  const gravityCheck = await page.evaluate(() => {
    const p = window.__pinball;

    // Ativar Low Gravity
    p.setPhysicsMode('low_gravity', 12);
    const lowGravMode = p.getPhysicsMode();
    const lowGravVal = p.getGravity();
    const lowFrictionVal = p.getFriction();

    // Ativar Overdrive
    p.setPhysicsMode('overdrive', 8);
    const overdriveMode = p.getPhysicsMode();
    const overdriveGravVal = p.getGravity();

    // Retornar a normal
    p.setPhysicsMode('normal', 0);

    return {
      lowGravMode,
      lowGravVal,
      lowFrictionVal,
      overdriveMode,
      overdriveGravVal
    };
  });

  console.log('Resultados de Modos de Gravidade:', JSON.stringify(gravityCheck, null, 2));
  if (gravityCheck.lowGravMode !== 'low_gravity' || gravityCheck.lowGravVal > 0.15 || gravityCheck.overdriveGravVal < 0.25) {
    throw new Error('Falha nos Modos de Gravidade Mutáveis.');
  }
  console.log('✅ Teste 3: Modos de Gravidade Mutáveis (Low Gravity e Overdrive) validados.');

  // 4. Validar Sistema de Missões e Alvos Firewall
  console.log('\n--- Test 4: Missões Ciber-Sintéticas e Alvos Firewall ---');
  const missionsCheck = await page.evaluate(() => {
    const p = window.__pinball;
    const targets = p.getFirewallTargets();
    const missions = p.getMissionsState();

    return {
      hasFirewallTargets: targets.length >= 3,
      hasMissionsHUD: !!missions,
      targetsCount: targets.length
    };
  });

  console.log('Resultados de Missões:', JSON.stringify(missionsCheck, null, 2));
  if (!missionsCheck.hasFirewallTargets || !missionsCheck.hasMissionsHUD) {
    throw new Error('Falha no Sistema de Missões ou alvos Firewall.');
  }
  console.log('✅ Teste 4: Sistema de Missões Ciber-Sintéticas validado.');

  // 5. Validar Estabilidade Geral
  console.log('\n--- Test 5: Estabilidade do Loop e Ausência de Erros ---');
  await page.waitForTimeout(1500);

  if (consoleErrors.length > 0) {
    console.error('Erros no console:', consoleErrors);
    throw new Error(`Encontrados ${consoleErrors.length} erros no console.`);
  }
  console.log('✅ Teste 5: Simulação executou com 0 erros.');

  // Tirar Screenshot de Evidência
  const screenshotPath = path.join(__dirname, 'pinball_task002_qa_evidence.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n📸 Screenshot de evidência capturada em: ${screenshotPath}`);

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DE QA DA TASK_002 (PINBALL) PASSARAM!');
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
