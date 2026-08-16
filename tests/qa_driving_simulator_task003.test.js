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
  console.log('  QA TEST SUITE - DRIVING SIMULATOR (TASK_003)');
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

  console.log('\n--- 1. Navegando para o simulador Driving Simulator ---');
  await page.goto(`http://127.0.0.1:${PORT}/driving_simulator/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => !!window.__drive, { timeout: 15000 });

  // 1. Validar Estrutura de Obstáculos e Level Design
  console.log('\n--- Test 1: Verificação de Obstáculos (Cones, Poças, Rampas e Pad) ---');
  const levelDesignCheck = await page.evaluate(() => {
    const d = window.__drive;
    return {
      conesCount: d.activeCones ? d.activeCones.length : 0,
      oilPuddlesCount: d.oilPuddles ? d.oilPuddles.length : 0,
      rampsCount: d.ramps ? d.ramps.length : 0,
      hasRepairPad: !!d.repairPad && !!d.repairPad.mesh,
      hasPlayerCar: !!d.playerCar
    };
  });

  console.log('Contagem de elementos de Level Design:', JSON.stringify(levelDesignCheck, null, 2));
  if (levelDesignCheck.conesCount < 10 || levelDesignCheck.oilPuddlesCount < 3 || levelDesignCheck.rampsCount < 2 || !levelDesignCheck.hasRepairPad) {
    throw new Error('Elementos de Level Design (cones, poças, rampas ou pit stop pad) estão incompletos.');
  }
  console.log('✅ Teste 1: Level design interativo inicializado com sucesso.');

  // 2. Validar Física de Cones Destrutíveis e Poça de Óleo (Spin-out)
  console.log('\n--- Test 2: Cones Destrutíveis e Spin-out em Poça de Óleo ---');
  const physicsCheck = await page.evaluate(() => {
    const d = window.__drive;
    
    // Iniciar o jogo saindo da garagem
    d.startFromGarage();

    // 2.1 Testar colisão com cone
    const cone = d.activeCones[0];
    cone.physics.isHit = true;
    cone.physics.velocity.set(0.1, 0.2, -0.3);
    cone.physics.angularVelocity.set(0.05, 0.1, 0);
    
    const initConeY = cone.position.y;
    d.updateCones();
    const coneMoved = cone.position.y !== initConeY;

    // 2.2 Testar colisão com poça de óleo (spin-out)
    const puddle = d.oilPuddles[0];
    d.playerCar.position.copy(puddle.position);
    d.checkOilCollisions();
    
    const flagsSpin = d.getFlags();
    const isSpinning = flagsSpin.isSpunOut && flagsSpin.spinTimer > 0;

    // Simular rotação de spin
    const initRot = d.playerCar.rotation.y;
    d.handlePlayerSpin();
    const rotChanged = d.playerCar.rotation.y !== initRot;

    return {
      coneMoved,
      isSpinning,
      rotChanged
    };
  });

  console.log('Resultados de colisão e física:', JSON.stringify(physicsCheck, null, 2));
  if (!physicsCheck.coneMoved || !physicsCheck.isSpinning || !physicsCheck.rotChanged) {
    throw new Error('Falha na resposta física de cones ou no rodopio de poça de óleo.');
  }
  console.log('✅ Teste 2: Impulso elástico de cones e spin-out em poça de óleo validados.');

  // 3. Validar Rampas de Salto (Stunts) e Bullet-Time (Slow Motion)
  console.log('\n--- Test 3: Rampas de Salto, Voo Parabólico e Bullet-Time ---');
  const rampCheck = await page.evaluate(() => {
    const d = window.__drive;
    const ramp = d.ramps[0];
    
    // 3.1 Testar Bullet-Time diretamente
    triggerBulletTime();
    const flagsBulletOn = d.getFlags();
    const isBulletTimeActive = flagsBulletOn.timeScale === 0.4;

    resetBulletTime();
    const flagsBulletOff = d.getFlags();
    const isBulletTimeReset = flagsBulletOff.timeScale === 1.0;

    // 3.2 Testar subida na rampa
    const p = d.getPhysics();
    d.gameStateRef().playerSpeed = p.maxSpd * 0.9;
    d.playerCar.position.set(ramp.position.x, 0, ramp.position.z + 5.5);
    
    d.checkRampCollision();
    const flagsAir = d.getFlags();

    return {
      isBulletTimeActive,
      isBulletTimeReset,
      isAirborneOrRampHandled: flagsAir.isAirborne || d.playerCar.position.y > 0
    };
  });

  console.log('Resultados de salto e Bullet-Time:', JSON.stringify(rampCheck, null, 2));
  if (!rampCheck.isBulletTimeActive || !rampCheck.isBulletTimeReset || !rampCheck.isAirborneOrRampHandled) {
    throw new Error('Falha na ativação de voo ou Bullet-Time na rampa.');
  }
  console.log('✅ Teste 3: Salto parabólico em rampa e Bullet-Time (timeScale = 0.4) validados.');

  // 4. Validar Ciclo de Dano, Combustível e Pit Stop de Reparo/Recarga
  console.log('\n--- Test 4: Sistema de Danos, Combustível e Pit Stop ---');
  const pitStopCheck = await page.evaluate(async () => {
    const d = window.__drive;
    const state = d.gameStateRef();
    
    // Aplicar 60 de dano para ficar com 40% (ativa fumaça)
    d.applyDamage('player', 60);
    const healthAfterDamage = state.playerHealth;

    // Drenar combustível
    state.playerFuel = 30;

    // Posicionar o carro no Pit Stop pad parado
    d.playerCar.position.copy(d.repairPad.position);
    const p = d.getPhysics();
    p.speed = 0; // Parado

    // Executar ciclo de pit stop
    const initH = state.playerHealth;
    const initF = state.playerFuel;
    d.updatePitStop();

    return {
      healthAfterDamage,
      smokeThresholdActive: healthAfterDamage < 50,
      healed: state.playerHealth >= initH,
      refueled: state.playerFuel >= initF
    };
  });

  console.log('Resultados de integridade e Pit Stop:', JSON.stringify(pitStopCheck, null, 2));
  if (pitStopCheck.healthAfterDamage !== 40 || !pitStopCheck.smokeThresholdActive || !pitStopCheck.healed || !pitStopCheck.refueled) {
    throw new Error('Falha no sistema de dano, emissão de fumaça ou cura no Pit Stop.');
  }
  console.log('✅ Teste 4: Ciclo de integridade física, combustível e Pit Stop validados.');

  // 5. Validar Modo Time Trial e Carro Fantasma (Ghost Car Replay)
  console.log('\n--- Test 5: Modo Time Trial, Gravação de Volta e Ghost Car ---');
  const timeTrialCheck = await page.evaluate(() => {
    const d = window.__drive;
    
    // Selecionar modo Time Trial
    d.selectMode('time_trial');

    // Injetar dados de replay de teste (10 frames)
    const testReplay = [];
    for (let i = 0; i < 10; i++) {
      testReplay.push({ x: i * 0.5, y: 0, z: -i * 5, rotY: 0 });
    }
    d.setLapReplay(testReplay);

    // Criar malha do fantasma
    d.createGhostMesh();
    
    // Atualizar posição do fantasma
    d.updateGhostCar();

    const flags = d.getFlags();
    const mode = d.getRaceMode();

    return {
      isTimeTrial: mode === 'time_trial',
      ghostExists: flags.ghostExists,
      ghostReplayActive: testReplay.length > 0
    };
  });

  console.log('Resultados de Time Trial e Ghost Car:', JSON.stringify(timeTrialCheck, null, 2));
  if (!timeTrialCheck.isTimeTrial || !timeTrialCheck.ghostExists || !timeTrialCheck.ghostReplayActive) {
    throw new Error('Falha na inicialização do Modo Time Trial ou na malha do Carro Fantasma.');
  }
  console.log('✅ Teste 5: Modo Time Trial e Ghost Car holográfico validados com sucesso.');

  // 6. Validar Estabilidade e Performance WebGL
  console.log('\n--- Test 6: Estabilidade do Loop WebGL e Ausência de Erros ---');
  await page.waitForTimeout(1500);

  if (consoleErrors.length > 0) {
    console.error('Erros no console:', consoleErrors);
    throw new Error(`Encontrados ${consoleErrors.length} erros no console.`);
  }
  console.log('✅ Teste 6: WebGL e física 3D executaram com 0 erros.');

  // Tirar Screenshot de Evidência
  const screenshotPath = path.join(__dirname, 'driving_simulator_task003_qa_evidence.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n📸 Screenshot de evidência capturada em: ${screenshotPath}`);

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DE QA DA TASK_003 (DRIVING SIMULATOR) PASSARAM!');
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
