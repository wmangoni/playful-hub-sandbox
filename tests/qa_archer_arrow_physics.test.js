process.env.NODE_ENV = 'test';
const http = require('http');
const path = require('path');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = process.env.TEST_PORT || 3094;

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
  console.log('  QA TEST SUITE - THE ARCHER: ARROW PHYSICS & AIMING BUGFIX');
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
  // Teste 1: Validação da Trajetória Preditiva e Pontos de Mira
  // -------------------------------------------------------------
  console.log('\n--- Test 1: Guia Visual de Trajetória Preditiva (Trajectory Dots) ---');
  const bounds = await page.evaluate(() => {
    const c = document.getElementById('game-container').getBoundingClientRect();
    return { x: c.x, y: c.y, w: c.width, h: c.height };
  });

  const startX = bounds.x + 250;
  const startY = bounds.y + 350;

  // Puxar arco para trás e para baixo (mira para o céu)
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 90, startY + 50);

  const trajectoryCheck = await page.evaluate(() => {
    const dots = window.__archer.getTrajectoryDots();
    const visibleDots = dots.filter(d => d.style.display !== 'none');
    const positions = visibleDots.map(d => ({
      left: parseFloat(d.style.left),
      bottom: parseFloat(d.style.bottom)
    }));

    return {
      totalDots: dots.length,
      visibleCount: visibleDots.length,
      firstDotBottom: positions[0] ? positions[0].bottom : 0,
      lastDotBottom: positions[positions.length - 1] ? positions[positions.length - 1].bottom : 0,
      arcAscends: positions.length > 2 && positions[1].bottom > positions[0].bottom
    };
  });

  console.log('Resultados dos Pontos de Trajetória:', JSON.stringify(trajectoryCheck, null, 2));
  if (trajectoryCheck.visibleCount < 5 || !trajectoryCheck.arcAscends) {
    throw new Error('Falha no guia visual de trajetória (pontos não visíveis ou arco não ascendente).');
  }
  console.log('✅ Teste 1: Trajetória preditiva pontilhada ascendente validada com sucesso.');

  // -------------------------------------------------------------
  // Teste 2: Disparo Balístico Real e Velocidade Vertical Positiva (vy > 0)
  // -------------------------------------------------------------
  console.log('\n--- Test 2: Disparo Balístico (vy Positivo e Voo Parabólico Ascendente) ---');
  await page.mouse.up(); // Solta o tiro

  // Observa o voo da flecha pelos próximos frames
  const flightHistory = [];
  for (let f = 0; f < 15; f++) {
    await new Promise(r => setTimeout(r, 25));
    const arrowState = await page.evaluate(() => {
      const arrows = window.__archer.getActiveArrows();
      if (!arrows.length) return null;
      const a = arrows[0];
      return {
        x: a.x,
        y: a.y,
        vx: a.vx,
        vy: a.vy,
        angleDeg: a.angle * 180 / Math.PI
      };
    });
    if (arrowState) flightHistory.push(arrowState);
  }

  console.log('Amostras de Voo da Flecha (Primeiros frames):', JSON.stringify(flightHistory.slice(0, 5), null, 2));
  if (flightHistory.length < 3) {
    throw new Error('A flecha colidiu ou desapareceu prematuramente!');
  }

  const initialVy = flightHistory[0].vy;
  const maxY = Math.max(...flightHistory.map(f => f.y));
  console.log(`Velocidade vertical inicial (vy): ${initialVy.toFixed(2)} px/frame`);
  console.log(`Altitude máxima atingida (y): ${maxY.toFixed(2)} px (spawn: 90px)`);

  if (initialVy <= 0) {
    throw new Error(`Falha crítica: vy não é positivo (${initialVy})! A flecha foi atirada para baixo.`);
  }
  if (maxY < 140) {
    throw new Error(`A flecha não atingiu altura suficiente para alcançar balões (maxY: ${maxY}).`);
  }
  console.log('✅ Teste 2: Flecha disparada com vy positivo e voo parabólico ascendente validado.');

  // -------------------------------------------------------------
  // Teste 3: Proteção contra Puxada para a Frente (Não Dispara para Trás)
  // -------------------------------------------------------------
  console.log('\n--- Test 3: Proteção de Puxada Frontal (dx <= 0) ---');
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Arrastar para a FRENTE (para a direita)
  await page.mouse.move(startX + 60, startY - 30);

  const forwardDragCheck = await page.evaluate(() => {
    const state = window.__archer.getState();
    const dots = window.__archer.getTrajectoryDots();
    const visibleDots = dots.filter(d => d.style.display !== 'none');
    return {
      arrowSpeed: state.arrowSpeed,
      visibleDotsCount: visibleDots.length,
      bowTransform: document.getElementById('bow').style.transform
    };
  });

  console.log('Resultados de Arraste para Frente:', JSON.stringify(forwardDragCheck, null, 2));
  await page.mouse.up();

  if (forwardDragCheck.arrowSpeed !== 0 || forwardDragCheck.visibleDotsCount !== 0) {
    throw new Error('Arrastar para frente não deveria gerar tensão ou exibir trajetória!');
  }
  console.log('✅ Teste 3: Proteção contra disparo invertido para trás validada.');

  // -------------------------------------------------------------
  // Teste 4: Limites de Ângulo (Clamping)
  // -------------------------------------------------------------
  console.log('\n--- Test 4: Limites Angulares Seguros (Clamping) ---');
  // Puxada quase vertical para baixo
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 20, startY + 120);

  const angleCheckHigh = await page.evaluate(() => {
    const angle = window.__archer.getState().arrowAngle;
    return { angleDeg: angle * 180 / Math.PI };
  });
  await page.mouse.up();

  // Puxada para cima (tiro para o solo)
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 90, startY - 80);

  const angleCheckLow = await page.evaluate(() => {
    const angle = window.__archer.getState().arrowAngle;
    return { angleDeg: angle * 180 / Math.PI };
  });
  await page.mouse.up();

  console.log(`Ângulo máximo clampado: ${angleCheckHigh.angleDeg.toFixed(1)}° (esperado ~79°)`);
  console.log(`Ângulo mínimo clampado: ${angleCheckLow.angleDeg.toFixed(1)}° (esperado ~-27°)`);

  if (angleCheckHigh.angleDeg > 80 || angleCheckLow.angleDeg < -30) {
    throw new Error('Falha nos limites angulares de mira.');
  }
  console.log('✅ Teste 4: Limites angulares de segurança validados.');

  // -------------------------------------------------------------
  // Teste 5: Acerto Real em Balão no Ar
  // -------------------------------------------------------------
  console.log('\n--- Test 5: Capacidade Real de Acerto em Balão ---');
  const hitSuccess = await page.evaluate(() => {
    // Posicionar balão em uma posição acessível
    window.__archer.balloonData.x = 450;
    window.__archer.balloonData.y = 180;
    const b = document.getElementById('balloon');
    const bs = document.getElementById('balloon-string');
    b.style.left = '450px';
    b.style.bottom = '180px';
    b.style.display = 'block';
    bs.style.left = '470px';
    bs.style.bottom = '150px';
    bs.style.display = 'block';

    const initialScore = window.__archer.getState().score;

    // Disparar uma flecha mira perfeita
    arrowSpeed = 22;
    arrowAngle = 0.42; // ~24 graus
    window.__archer.spawnArrow(0, 1, 'normal');

    return { initialScore };
  });

  // Aguarda até 3 segundos para a flecha alcançar o balão
  let popped = false;
  for (let t = 0; t < 30; t++) {
    await new Promise(r => setTimeout(r, 100));
    popped = await page.evaluate(() => {
      return document.getElementById('balloon').style.display === 'none' ||
             window.__archer.getState().score > 0;
    });
    if (popped) break;
  }

  const finalScore = await page.evaluate(() => window.__archer.getState().score);
  console.log(`Pontuação após disparo direto ao balão: ${finalScore}`);
  if (!popped || finalScore === 0) {
    throw new Error('A flecha não conseguiu acertar o balão posicionado!');
  }
  console.log('✅ Teste 5: Balão atingido com sucesso pela trajetória balística corrigida.');

  // Capturar screenshot de evidência
  const evidencePath = path.join(__dirname, 'archer_arrow_physics_evidence.png');
  await page.screenshot({ path: evidencePath });
  console.log(`\n📸 Screenshot de evidência capturada em: ${evidencePath}`);

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DE FÍSICA E MIRA DO THE ARCHER PASSARAM!');
  console.log('===============================================================');

  await browser.close();
  server.close();
}

runTests().catch(async (err) => {
  console.error('\n❌ ERRO NA EXECUÇÃO DOS TESTES:', err);
  if (browser) await browser.close();
  if (server) server.close();
  process.exit(1);
});
