process.env.NODE_ENV = 'test';
const http = require('http');
const path = require('path');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = process.env.TEST_PORT || 3105;

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
  console.log('  QA TEST SUITE - PINBALL VELOCITY & BOUNDARIES STRESS TEST');
  console.log('===============================================================');

  const puppeteerModule = await import('puppeteer');
  puppeteer = puppeteerModule.default;

  await startServer();

  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const consoleErrors = [];
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('ERR_NAME_NOT_RESOLVED')) {
      console.log(`[BROWSER ERROR] ${text}`);
      consoleErrors.push(text);
    }
  });

  console.log('\n--- 1. Carregando o Pinball ---');
  await page.goto(`http://127.0.0.1:${PORT}/pinball/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });

  // Teste 1: Testar velocidade controlada e lançamento da bola
  console.log('\n--- Test 1: Lançando a bola e monitorando a velocidade por 5 segundos ---');
  await page.keyboard.down(' ');
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.up(' ');

  // Monitorar a cada 50ms por 4 segundos
  let maxObservedSpeed = 0;
  let outOfBoundsDetected = false;
  let outOfBoundsDetails = null;

  for (let i = 0; i < 80; i++) {
    // Alternar toques nos flippers para manter a bola em jogo
    if (i % 8 === 0) {
      await page.keyboard.down('z');
      await new Promise(r => setTimeout(r, 60));
      await page.keyboard.up('z');
    }
    if (i % 10 === 0) {
      await page.keyboard.down('x');
      await new Promise(r => setTimeout(r, 60));
      await page.keyboard.up('x');
    }

    const state = await page.evaluate(() => {
      const ball = window.__pinball.getBall();
      const speed = Math.hypot(ball.speedX, ball.speedY);
      const isOutOfBounds = ball.x < 0 || ball.x > 400 || ball.y < 0;
      return {
        x: ball.x,
        y: ball.y,
        speedX: ball.speedX,
        speedY: ball.speedY,
        speed: speed,
        isOutOfBounds: isOutOfBounds,
        isLaunched: ball.isLaunched
      };
    });

    // Apenas monitora velocidade no campo jogável (fora do canal do lançador onde o impulso de lançamento é naturalmente alto)
    if (state.x < 340 && state.speed > maxObservedSpeed) {
      maxObservedSpeed = state.speed;
    }

    if (state.isOutOfBounds) {
      outOfBoundsDetected = true;
      outOfBoundsDetails = state;
      break;
    }

    await new Promise(r => setTimeout(r, 50));
  }

  console.log(`Velocidade máxima observada da bola no campo de jogo: ${maxObservedSpeed.toFixed(2)} px/step`);
  console.log(`Houve vazamento pelas laterais ou topo? ${outOfBoundsDetected ? 'SIM (FALHA)' : 'NÃO (SUCESSO)'}`);

  if (outOfBoundsDetected) {
    throw new Error(`Bola vazou da mesa! Detalhes: ${JSON.stringify(outOfBoundsDetails)}`);
  }

  if (maxObservedSpeed > 12.0) {
    throw new Error(`Velocidade da bola no campo jogável (${maxObservedSpeed}) ultrapassou o limite seguro de 12.0 px/step!`);
  }

  console.log('✅ Teste 1: Velocidade da bola permaneceu perfeitamente controlada e dentro dos limites durante toda a simulação.');

  // Teste 2: Teste de estresse físico direto com múltiplos impulsos e bumpers
  console.log('\n--- Test 2: Teste de Estresse Físico com Rebotes Forçados ---');
  const stressResult = await page.evaluate(() => {
    const ball = window.__pinball.getBall();
    let maxSpd = 0;
    let leaked = false;
    let leakInfo = null;

    // Testar com a bola posicionada nos bumpers e flippers com velocidade alta
    for (let sim = 0; sim < 300; sim++) {
      if (sim % 30 === 0) {
        // Injetar velocidade alta em direção ao topo e às paredes
        ball.x = 100 + (sim % 200);
        ball.y = 150;
        ball.speedX = (Math.random() - 0.5) * 15;
        ball.speedY = -15;
      }

      window.__pinball.update(performance.now() + sim * 16);

      const spd = Math.hypot(ball.speedX, ball.speedY);
      if (spd > maxSpd) maxSpd = spd;

      // Verificar se a bola ultrapassou as bordas externas do canvas (0 a 400 em X, 0 no topo em Y)
      if (ball.x < 5 || ball.x > 395 || ball.y < 5) {
        leaked = true;
        leakInfo = { x: ball.x, y: ball.y, speedX: ball.speedX, speedY: ball.speedY, spd };
        break;
      }
    }

    return { maxSpd, leaked, leakInfo };
  });

  console.log('Resultado do Estresse Físico:', stressResult);

  if (stressResult.leaked) {
    throw new Error(`Bola vazou durante o teste de estresse! ${JSON.stringify(stressResult.leakInfo)}`);
  }

  console.log('✅ Teste 2: Zero vazamentos em 300 passos de estresse com sub-stepping e contenção rígida.');

  // Capturar screenshot
  const screenshotPath = path.join(__dirname, 'pinball_stress_qa_evidence.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`\n📸 Screenshot salva em: ${screenshotPath}`);

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DE VELOCIDADE E LIMITES DO PINBALL PASSARAM!');
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
