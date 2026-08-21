process.env.NODE_ENV = 'test';
const http = require('http');
const assert = require('assert');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = process.env.TEST_PORT || 3109;

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
  console.log('  QA TEST SUITE - PINBALL MULTIBALL LIMIT & ANTI-LOOP VALIDATION');
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

  console.log('\n--- 1. Carregando jogo do Pinball ---');
  await page.goto(`http://127.0.0.1:${PORT}/pinball/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });

  // Teste 1: Limite máximo de 9 bolinhas na tela (Cap de Performance)
  console.log('\n--- Test 1: Limite Máximo de 9 Bolinhas Simultâneas (Performance Cap) ---');
  const ballCapResult = await page.evaluate(() => {
    const pinball = window.__pinball;

    // Tenta spawnar multiball repetidamente 10 vezes (teoricamente criaria 20+ bolinhas)
    for (let i = 0; i < 10; i++) {
      pinball.spawnMultiball();
    }

    const totalBalls = pinball.getActiveBalls().length;
    return { totalBalls };
  });

  console.log(`Total de bolinhas ativas após múltiplas tentativas de spawn: ${ballCapResult.totalBalls}`);
  assert(ballCapResult.totalBalls <= 9, `Total de bolinhas (${ballCapResult.totalBalls}) não deve exceder 9`);
  assert(ballCapResult.totalBalls >= 2, 'Multiball deve ter spawnado até atingir o limite');
  console.log(' [PASS] Limite rígido de no máximo 9 bolinhas ativas validado com sucesso.');

  // Teste 2: Mecanismo de detecção e quebra de loop infinito entre 2 bumpers (Anti-Ping-Pong)
  console.log('\n--- Test 2: Prevenção de Loop Infinito / Ping-Pong entre Superfícies ---');
  const pingPongEscapeResult = await page.evaluate(() => {
    const pinball = window.__pinball;
    const b = pinball.getBall();

    // Posiciona a bola no eixo intermediário exato entre os bumpers superiores
    // Bumper 1: (100, 150), Bumper 3: (300, 150)
    b.x = 100;
    b.y = 150;
    b.speedX = 6.0; // Dispara diretamente em direção ao bumper 3
    b.speedY = 0;   // Eixo perfeitamente horizontal (propenso a ressonância 1D)
    b.isLaunched = true;

    const recordedPositions = [];
    const stepDt = 0.016;

    // Simula 240 frames (cerca de 4 segundos de física)
    for (let f = 0; f < 240; f++) {
      pinball.update(performance.now() + f * 16);
      if (f % 10 === 0) {
        recordedPositions.push({ x: b.x, y: b.y, speedY: b.speedY });
      }
    }

    // A bola deve ter variado no eixo Y e descido em direção às aletas (escapou do loop 1D)
    const initialY = 150;
    const finalY = b.y;
    const maxYVariation = Math.max(...recordedPositions.map(p => Math.abs(p.y - initialY)));

    return {
      initialY,
      finalY,
      maxYVariation,
      escapedHorizontalLoop: maxYVariation > 20 || finalY > 200
    };
  });

  console.log('Evolução da bola a partir do eixo 1D:', pingPongEscapeResult);
  assert(
    pingPongEscapeResult.escapedHorizontalLoop,
    'A bola deve desviar organicamente do eixo 1D e descer em direção à mesa sem ficar presa em loop infinito'
  );
  console.log(' [PASS] Mecanismo anti-loop e desvio suave imperceptível validado com sucesso.');

  // Teste 3: Detecção de confinamento contínuo em área restrita
  console.log('\n--- Test 3: Detecção de Confinamento Espacial (Oscillation / Trapped Area Breaker) ---');
  const trappedAreaResult = await page.evaluate(() => {
    const pinball = window.__pinball;
    const b = pinball.getBall();

    b.x = 200;
    b.y = 200;
    b.speedX = 3.0;
    b.speedY = 3.0;
    b.isLaunched = true;
    b.oscillationTimer = 1.3; // Simula bola presa por > 1.2s em área restrita
    b.anchorPos = { x: 200, y: 200, timer: 1.3 };

    // Executa um ciclo de verificação
    pinball.update(performance.now());

    return {
      newSpeedY: b.speedY,
      oscillationTimerAfter: b.oscillationTimer
    };
  });

  console.log('Resposta do Confinamento:', trappedAreaResult);
  assert(trappedAreaResult.oscillationTimerAfter < 1.0, 'Timer de oscilação deve ser resetado após a deflexão');
  console.log(' [PASS] Detector de confinamento espacial e injeção de saída suave validados.');

  console.log('\n===============================================================');
  console.log('  ALL PERFORMANCE & ANTI-LOOP TESTS PASSED SUCCESSFULLY! (100%)');
  console.log('===============================================================');

  await browser.close();
  server.close();
  process.exit(0);
}

runTests().catch(async (err) => {
  console.error('\n[FATAL TEST FAILURE]:', err);
  if (browser) await browser.close();
  if (server) server.close();
  process.exit(1);
});
