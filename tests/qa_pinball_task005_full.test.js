process.env.NODE_ENV = 'test';
const http = require('http');
const assert = require('assert');
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
  console.log('  QA TEST SUITE - PINBALL TASK_005 FULL VERIFICATION');
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

  // Teste 1: Slingshots e Kickback Savers
  console.log('\n--- Test 1: Slingshots e Kickback Savers ---');
  const data1 = await page.evaluate(() => {
    const p = window.__pinball;
    const slings = p.getSlingshots();
    const kickback = p.getKickbackState();
    return {
      count: slings ? slings.length : 0,
      leftPower: slings && slings[0] ? slings[0].kickPower : 0,
      rightPower: slings && slings[1] ? slings[1].kickPower : 0,
      kickbackActive: kickback ? kickback.leftActive : false
    };
  });

  assert.strictEqual(data1.count, 2, 'Devem existir 2 slingshots na mesa');
  assert(data1.leftPower >= 7.0, 'Slingshot esquerdo deve ter potência vigorosa');
  assert(data1.rightPower >= 7.0, 'Slingshot direito deve ter potência vigorosa');
  assert.strictEqual(data1.kickbackActive, true, 'Kickback esquerdo deve iniciar ativo');
  console.log(' [PASS] Slingshots e Kickback Savers verificados com sucesso.');

  // Teste 2: Sistema de Nudge e TILT
  console.log('\n--- Test 2: Mecânica de Empurrão da Mesa (Nudge) & TILT ---');
  const data2 = await page.evaluate(() => {
    const p = window.__pinball;

    // Nudge suave para cima
    p.triggerNudge(0, -1);
    const after1 = {
      stress: p.getTiltSystem().stressMeter,
      springVelY: p.getTiltSystem().springVel.y,
      isTilted: p.getTiltSystem().isTilted
    };

    // Nudges múltiplos para forçar TILT
    p.triggerNudge(1, -0.4);
    p.triggerNudge(-1, -0.4);
    p.triggerNudge(0, -1);

    const afterMax = {
      stress: p.getTiltSystem().stressMeter,
      isTilted: p.getTiltSystem().isTilted,
      warningText: p.getTiltSystem().warningText
    };

    return { after1, afterMax };
  });

  assert(data2.after1.stress >= 30, 'Nudge deve adicionar estresse ao sistema');
  assert(data2.after1.springVelY < 0, 'Nudge frontal deve deslocar a mola da mesa para cima');
  assert.strictEqual(data2.afterMax.isTilted, true, 'Estresse excessivo deve bloquear controles em TILT');
  assert(data2.afterMax.warningText.includes('TILT'), 'Aviso de TILT deve ser exibido');
  console.log(' [PASS] Nudge, estresse mecânico, amortecimento e TILT validados com sucesso.');

  // Teste 3: 3 Temas Dinâmicos
  console.log('\n--- Test 3: Seletor de Temas (Synthwave, Vaporwave, Cyber Matrix Void) ---');
  const data3 = await page.evaluate(() => {
    const p = window.__pinball;
    const initial = p.getTheme();

    p.setTheme('vaporwave');
    const vapor = p.getTheme();
    const vaporGravity = p.getGravity();

    p.setTheme('matrix_void');
    const matrix = p.getTheme();

    return { initial, vapor, vaporGravity, matrix };
  });

  assert.strictEqual(data3.initial, 'synthwave', 'Tema padrão deve ser synthwave');
  assert.strictEqual(data3.vapor, 'vaporwave', 'Deve alternar para tema vaporwave');
  assert(Math.abs(data3.vaporGravity - 0.14) < 0.01, 'Vaporwave deve ter gravidade leve 0.14');
  assert.strictEqual(data3.matrix, 'matrix_void', 'Deve alternar para matrix_void com chuva de código');
  console.log(' [PASS] Troca e física dos 3 temas validadas com sucesso.');

  // Teste 4: Display DMD e Minigame Cyber Lockpick
  console.log('\n--- Test 4: Display DMD e Minigame Cyber Lockpick ---');
  const data4 = await page.evaluate(() => {
    const p = window.__pinball;

    p.triggerDmdMinigame('CYBER_LOCKPICK');
    const dmdInit = {
      mode: p.getDmdSystem().activeMode,
      targetBit: p.getDmdSystem().lockTargetBit
    };

    // Resolver os 3 bits do minigame
    for (let step = 0; step < 3; step++) {
      const curBit = p.getDmdSystem().lockTargetBit;
      p.handleDmdInput(curBit);
    }

    const dmdFinal = {
      mode: p.getDmdSystem().activeMode,
      message: p.getDmdSystem().message,
      multiplier: p.getMultiplier()
    };

    return { dmdInit, dmdFinal };
  });

  assert.strictEqual(data4.dmdInit.mode, 'CYBER_LOCKPICK', 'Minigame Lockpick deve ser iniciado');
  assert.strictEqual(data4.dmdFinal.mode, 'DEFAULT', 'DMD deve voltar ao modo padrão após sucesso');
  assert(data4.dmdFinal.message.includes('JACKPOT'), 'Mensagem de JACKPOT deve ser exibida');
  assert(data4.dmdFinal.multiplier >= 5, 'Multiplicador deve subir para 5x ou mais');
  console.log(' [PASS] Display DMD e minigame com Jackpot resolvidos com sucesso.');

  // Teste 5: Kickback Outlane Salva-Vidas
  console.log('\n--- Test 5: Kickback Outlane Salva-Vidas ---');
  const data5 = await page.evaluate(() => {
    const p = window.__pinball;

    // Reseta estado e ativa kickback esquerdo
    p.getTiltSystem().isTilted = false;
    p.getKickbackState().leftActive = true;
    const b = p.getBall();

    // Coloca a bola descendo no canal de outlane esquerdo
    b.x = 28;
    b.y = 480;
    b.speedX = -0.5;
    b.speedY = 4.0;
    b.isLaunched = true;

    // Atualiza simulação
    p.update(performance.now());

    return {
      ballSpeedY: b.speedY,
      kickbackLeftActive: p.getKickbackState().leftActive
    };
  });

  assert(data5.ballSpeedY < -10, 'Kickback deve disparar a bola para cima com velocidade superior a 10');
  assert.strictEqual(data5.kickbackLeftActive, false, 'Kickback esquerdo deve ser desarmado após salvar');
  console.log(' [PASS] Kickback salvou a bola e consumiu a carga com sucesso.');

  console.log('\n===============================================================');
  console.log('  ALL 5 PINBALL TASK_005 TESTS PASSED SUCCESSFULLY! (100%)');
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
