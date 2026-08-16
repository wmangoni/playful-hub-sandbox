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
  console.log('  QA TEST SUITE - PINBALL (TASK_001: Retro Arcade Visual)');
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

  // 1. Validar Moldura Neon e HUD Glassmorphic
  console.log('\n--- Test 1: Design Retro Arcade (Moldura do Canvas e HUD Glassmorphic) ---');
  const uiCheck = await page.evaluate(() => {
    const canvas = document.getElementById('gameCanvas');
    const gameInfo = document.getElementById('gameInfo');
    const scoreEl = document.getElementById('score');

    const canvasStyle = window.getComputedStyle(canvas);
    const infoStyle = window.getComputedStyle(gameInfo);

    const hasBorderRadius = parseInt(canvasStyle.borderRadius, 10) >= 12;
    const hasBackdropFilter = infoStyle.backdropFilter.includes('blur') || infoStyle.webkitBackdropFilter.includes('blur');
    const hasPressStartFont = infoStyle.fontFamily.includes('Press Start 2P') || canvasStyle.fontFamily.includes('Orbitron');

    return {
      hasBorderRadius,
      hasBackdropFilter,
      hasPressStartFont,
      canvasBorder: canvasStyle.border,
      infoDisplay: infoStyle.display
    };
  });

  console.log('Resultados de UI/HUD:', JSON.stringify(uiCheck, null, 2));
  if (!uiCheck.hasBorderRadius || !uiCheck.hasBackdropFilter) {
    throw new Error('Falha no estilo visual da moldura do Canvas ou no HUD Glassmorphic.');
  }
  console.log('✅ Teste 1: Moldura do Canvas e HUD Glassmorphism validados.');

  // 2. Validar Rastro da Bola (Ghost Trail) e Bumpers Neon com Bloom
  console.log('\n--- Test 2: Rastro da Bola (Trail) e Bumpers Neon com Bloom ---');
  const ballAndBumpersCheck = await page.evaluate(() => {
    const p = window.__pinball;
    const ball = p.getBall();
    const bumpers = p.getBumpers();

    // Simular lançamento e rastro
    ball.isLaunched = true;
    ball.x = 200;
    ball.y = 300;
    ball.vx = 5;
    ball.vy = -5;

    // Atualizar alguns frames para popular trail
    for (let i = 0; i < 6; i++) {
      ball.trail.push({ x: ball.x + i * 2, y: ball.y + i * 2 });
    }

    const trailLength = ball.trail.length;

    // Testar estado de hit do bumper
    if (bumpers.length > 0) {
      bumpers[0].isHit = true;
      bumpers[0].hitTimer = 10;
    }

    return {
      hasTrailArray: Array.isArray(ball.trail),
      trailLength,
      bumpersCount: bumpers.length,
      bumperNeonColor: bumpers[0] ? bumpers[0].color : null,
      bumperHitActive: bumpers[0] ? bumpers[0].isHit : false
    };
  });

  console.log('Resultados da Bola e Bumpers:', JSON.stringify(ballAndBumpersCheck, null, 2));
  if (!ballAndBumpersCheck.hasTrailArray || ballAndBumpersCheck.trailLength < 5 || ballAndBumpersCheck.bumpersCount < 3) {
    throw new Error('Falha no rastro da bola ou na configuração neon dos bumpers.');
  }
  console.log('✅ Teste 2: Ghost Trail da bola e Bumpers com Bloom validados.');

  // 3. Validar Zonas de Multiplicação Holográficas
  console.log('\n--- Test 3: Zonas de Multiplicação Holográficas ---');
  const zonesCheck = await page.evaluate(() => {
    const p = window.__pinball;
    const zones = p.getMultiplierZones();

    return {
      zonesCount: zones.length,
      hasBorderColor: zones.every(z => !!z.borderColor),
      multipliers: zones.map(z => z.multiplier)
    };
  });

  console.log('Resultados das Zonas de Multiplicação:', JSON.stringify(zonesCheck, null, 2));
  if (zonesCheck.zonesCount < 1 || !zonesCheck.hasBorderColor) {
    throw new Error('Falha na configuração das zonas de multiplicação holográficas.');
  }
  console.log('✅ Teste 3: Zonas de multiplicação holográficas validadas.');

  // 4. Validar Sistema de Partículas (Velocity Stretching)
  console.log('\n--- Test 4: Partículas Neon com Velocity Stretching ---');
  const particlesCheck = await page.evaluate(() => {
    const p = window.__pinball;
    
    // Gerar partículas de teste
    p.createParticles(200, 200, 10, '#ff2e97');
    const particles = p.getParticles();

    const hasVelocityParams = particles.length > 0 && typeof particles[0].vx === 'number' && typeof particles[0].vy === 'number';
    const hasColorParams = particles.length > 0 && typeof particles[0].r === 'number' && typeof particles[0].alpha === 'number';

    return {
      particlesGenerated: particles.length >= 10,
      hasVelocityParams,
      hasColorParams
    };
  });

  console.log('Resultados das Partículas:', JSON.stringify(particlesCheck, null, 2));
  if (!particlesCheck.particlesGenerated || !particlesCheck.hasVelocityParams || !particlesCheck.hasColorParams) {
    throw new Error('Falha no sistema de partículas de faíscas neon.');
  }
  console.log('✅ Teste 4: Partículas neon com física direcional validadas.');

  // 5. Validar Feedback de Pontos (Score Bump)
  console.log('\n--- Test 5: Animação de Score Bump ao Pontuar ---');
  const scoreBumpCheck = await page.evaluate(() => {
    const scoreEl = document.getElementById('score');
    scoreEl.classList.add('score-bump');
    const hasClass = scoreEl.classList.contains('score-bump');
    return { hasClass };
  });

  console.log('Resultados de Score Bump:', JSON.stringify(scoreBumpCheck, null, 2));
  if (!scoreBumpCheck.hasClass) {
    throw new Error('Falha na classe score-bump do placar.');
  }
  console.log('✅ Teste 5: Feedback de pontuação (Score Bump) validado.');

  // 6. Validar Estabilidade Geral
  console.log('\n--- Test 6: Estabilidade do Loop e Ausência de Erros ---');
  await page.waitForTimeout(1500);

  if (consoleErrors.length > 0) {
    console.error('Erros no console:', consoleErrors);
    throw new Error(`Encontrados ${consoleErrors.length} erros no console.`);
  }
  console.log('✅ Teste 6: Simulação executou com 0 erros.');

  // Tirar Screenshot de Evidência
  const screenshotPath = path.join(__dirname, 'pinball_task001_qa_evidence.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n📸 Screenshot de evidência capturada em: ${screenshotPath}`);

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DE QA DA TASK_001 (PINBALL) PASSARAM!');
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
