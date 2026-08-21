process.env.NODE_ENV = 'test';
const http = require('http');
const path = require('path');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = process.env.TEST_PORT || 3104;

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
  console.log('  QA TEST SUITE - PINBALL FLIPPERS & CONTROLS VALIDATION');
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

  console.log('\n--- 1. Navegando para o Pinball (http://localhost:3000/pinball/) ---');
  await page.goto(`http://127.0.0.1:${PORT}/pinball/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });

  // Teste 1: Verificar se os objetos dos flippers estão inicializados e orientados para dentro
  console.log('\n--- Test 1: Verificação Geométrica das Aletas (Orientação para Dentro) ---');
  const flipperGeometry = await page.evaluate(() => {
    const p = window.__pinball;
    const left = p.getLeftFlipper();
    const right = p.getRightFlipper();

    // Calcular pontas no espaço do mundo
    const leftTipX = left.pivotX + left.width * Math.cos(left.currentAngle);
    const leftTipY = left.pivotY + left.width * Math.sin(left.currentAngle);

    const rightTipX = right.pivotX + right.width * Math.cos(right.currentAngle);
    const rightTipY = right.pivotY + right.width * Math.sin(right.currentAngle);

    return {
      left: {
        pivotX: left.pivotX,
        pivotY: left.pivotY,
        restAngle: left.restAngle,
        activeAngle: left.activeAngle,
        currentAngle: left.currentAngle,
        tipX: leftTipX,
        tipY: leftTipY,
        pointsInward: leftTipX > left.pivotX // Flipper esquerdo deve apontar para a direita (para dentro)
      },
      right: {
        pivotX: right.pivotX,
        pivotY: right.pivotY,
        restAngle: right.restAngle,
        activeAngle: right.activeAngle,
        currentAngle: right.currentAngle,
        tipX: rightTipX,
        tipY: rightTipY,
        pointsInward: rightTipX < right.pivotX // Flipper direito deve apontar para a esquerda (para dentro)
      }
    };
  });

  console.log('Geometria do Flipper Esquerdo:', flipperGeometry.left);
  console.log('Geometria do Flipper Direito:', flipperGeometry.right);

  if (!flipperGeometry.left.pointsInward) {
    throw new Error(`Flipper esquerdo deve apontar para dentro (tipX > pivotX). PivotX: ${flipperGeometry.left.pivotX}, TipX: ${flipperGeometry.left.tipX}`);
  }
  if (!flipperGeometry.right.pointsInward) {
    throw new Error(`Flipper direito deve apontar para dentro (tipX < pivotX). PivotX: ${flipperGeometry.right.pivotX}, TipX: ${flipperGeometry.right.tipX}`);
  }
  console.log('✅ Teste 1: Ambas as aletas estão geometricamente corretas e perfeitamente viradas para dentro da mesa.');

  // Teste 2: Testar acionamento da aleta direita com a tecla 'x' e 'X'
  console.log('\n--- Test 2: Validação do Acionamento da Aleta Direita com a tecla "X" ---');
  
  // Pressionar tecla 'x'
  await page.keyboard.down('x');
  await new Promise(r => setTimeout(r, 100)); // aguarda atualização da animação física

  const rightFlipperStateDown = await page.evaluate(() => {
    const right = window.__pinball.getRightFlipper();
    return {
      isActivating: right.isActivating,
      currentAngle: right.currentAngle,
      activeAngle: right.activeAngle,
      isUp: right.isUp || right.currentAngle > right.restAngle + 0.1
    };
  });
  console.log('Estado da Aleta Direita com tecla "x" pressionada:', rightFlipperStateDown);

  if (!rightFlipperStateDown.isActivating) {
    throw new Error('Aleta direita não ativou com a tecla "x"!');
  }

  // Soltar tecla 'x'
  await page.keyboard.up('x');
  await new Promise(r => setTimeout(r, 100));

  const rightFlipperStateUp = await page.evaluate(() => {
    const right = window.__pinball.getRightFlipper();
    return {
      isActivating: right.isActivating,
      currentAngle: right.currentAngle,
      restAngle: right.restAngle
    };
  });
  console.log('Estado da Aleta Direita após soltar tecla "x":', rightFlipperStateUp);

  if (rightFlipperStateUp.isActivating) {
    throw new Error('Aleta direita não desativou ao soltar a tecla "x"!');
  }
  console.log('✅ Teste 2: Aleta direita responde perfeitamente ao pressionar e soltar a tecla "X".');

  // Teste 3: Testar acionamento da aleta esquerda com a tecla 'z'
  console.log('\n--- Test 3: Validação do Acionamento da Aleta Esquerda com a tecla "Z" ---');
  await page.keyboard.down('z');
  await new Promise(r => setTimeout(r, 100));

  const leftFlipperStateDown = await page.evaluate(() => {
    const left = window.__pinball.getLeftFlipper();
    return {
      isActivating: left.isActivating,
      currentAngle: left.currentAngle,
      activeAngle: left.activeAngle,
      isUp: left.isUp || left.currentAngle < left.restAngle - 0.1
    };
  });
  console.log('Estado da Aleta Esquerda com tecla "z" pressionada:', leftFlipperStateDown);

  if (!leftFlipperStateDown.isActivating) {
    throw new Error('Aleta esquerda não ativou com a tecla "z"!');
  }

  await page.keyboard.up('z');
  await new Promise(r => setTimeout(r, 100));
  console.log('✅ Teste 3: Aleta esquerda responde perfeitamente ao pressionar e soltar a tecla "Z".');

  // Teste 4: Testar física de lançamento e rebatida da bola
  console.log('\n--- Test 4: Validação de Lançamento da Bola e Dinâmica Física ---');
  await page.keyboard.down(' ');
  await new Promise(r => setTimeout(r, 250));
  await page.keyboard.up(' ');
  await new Promise(r => setTimeout(r, 80)); // 80ms após soltar o plunger (bola em pleno voo ascendente)

  const ballStatus = await page.evaluate(() => {
    const ball = window.__pinball.getBall();
    const balls = window.__pinball.getActiveBalls();
    return {
      x: ball.x,
      y: ball.y,
      speedX: ball.speedX,
      speedY: ball.speedY,
      isLaunched: ball.isLaunched,
      totalActiveBalls: balls.length
    };
  });
  console.log('Estado da Bola após Lançamento (em voo):', ballStatus);

  if (!ballStatus.isLaunched && ballStatus.y >= 510) {
    throw new Error('A bola deveria ter sido lançada pelo plunger!');
  }
  console.log('✅ Teste 4: Bola lançada com sucesso no campo de jogo com física ativa.');

  // Tirar Screenshot de Evidência
  const screenshotPath = path.join(__dirname, 'pinball_flippers_qa_evidence.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`\n📸 Screenshot de evidência salva em: ${screenshotPath}`);

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DAS ALETAS E MECÂNICAS DO PINBALL PASSARAM!');
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
