process.env.NODE_ENV = 'test';
const http = require('http');
const path = require('path');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = process.env.TEST_PORT || 3106;

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
  console.log('  QA TEST SUITE - PINBALL PLUNGER & FULL LAUNCH TRAJECTORY');
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

  console.log('\n--- 1. Carregando o Pinball ---');
  await page.goto(`http://127.0.0.1:${PORT}/pinball/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });

  // Teste 1: Testar o disparo do plunger e rastrear toda a subida até entrar no campo jogável
  console.log('\n--- Test 1: Puxando o plunger (Barra de Espaço) e disparando a bola ---');
  await page.keyboard.down(' ');
  await new Promise(r => setTimeout(r, 350)); // carregar o plunger
  await page.keyboard.up(' ');

  let reachedTop = false;
  let enteredMainField = false;
  let minObservedY = 600;
  let finalState = null;

  const trajectory = [];

  for (let i = 0; i < 40; i++) {
    const ballState = await page.evaluate(() => {
      const ball = window.__pinball.getBall();
      return {
        x: ball.x,
        y: ball.y,
        speedX: ball.speedX,
        speedY: ball.speedY,
        isLaunched: ball.isLaunched
      };
    });

    trajectory.push(ballState);

    if (ballState.y < minObservedY) {
      minObservedY = ballState.y;
    }

    if (ballState.y <= 90) {
      reachedTop = true;
    }

    if (ballState.x < 345 && ballState.y <= 150) {
      enteredMainField = true;
    }

    finalState = ballState;
    await new Promise(r => setTimeout(r, 40));
  }

  console.log(`Menor altura atingida pela bola no lançamento (min Y): ${minObservedY.toFixed(1)}px (topo da mesa fica em ~10-60px)`);
  console.log(`A bola alcançou o topo da rampa (Y <= 90px)? ${reachedTop ? 'SIM ✅' : 'NÃO ❌'}`);
  console.log(`A bola entrou com sucesso no campo jogável (X < 345px, Y <= 150px)? ${enteredMainField ? 'SIM ✅' : 'NÃO ❌'}`);
  console.log('Posição final após lançamento:', finalState);

  if (!reachedTop) {
    throw new Error(`A bola não teve força suficiente para atingir o topo da rampa! Min Y atingido: ${minObservedY}px`);
  }

  if (!enteredMainField) {
    throw new Error(`A bola atingiu o topo mas não conseguiu contornar para entrar no campo jogável!`);
  }

  console.log('\n✅ Teste 1: Plunger lançou a bola com força total até o topo e a conduziu perfeitamente para o campo principal de jogo.');

  // Capturar screenshot da bola no campo de jogo
  const screenshotPath = path.join(__dirname, 'pinball_launch_qa_evidence.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`📸 Screenshot de evidência salva em: ${screenshotPath}`);

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DO PLUNGER E LANÇAMENTO PASSARAM!');
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
