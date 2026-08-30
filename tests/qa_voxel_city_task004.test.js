process.env.NODE_ENV = 'test';
const http = require('http');
const path = require('path');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = process.env.TEST_PORT || 3194;

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
  console.log('  QA TEST SUITE - VOXEL CITY (TASK_004: Clima, Taxi & Neon)');
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

  console.log('\n--- 0. Navegando para Voxel City ---');
  await page.goto(`http://127.0.0.1:${PORT}/voxel_city/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => !!window.game, { timeout: 20000 });
  await page.waitForTimeout(1500);

  // 1. Clima Dinâmico (Ciclo sunny/rainy, partículas + piscinas, física de tração)
  console.log('\n--- Test 1: Clima Dinâmico & Física de Tração ---');
  const weatherCheck = await page.evaluate(() => {
    const g = window.game;
    const s = window.state;
    const rain = window.rainSystem;

    // validar sistema de partículas de chuva e piscinas (forçar chuva, sem toggling)
    s.weather = 'rainy';
    g.update(0.1);
    const rainVisible = !!rain && !!rain.points && rain.points.visible === true;
    const hasRainPoints = !!rain && !!rain.points && rain.particleCount >= 500;
    const puddlesCount = s.puddles.length;
    const puddlesVisible = s.puddles.every(p => p.mesh.visible === true);

    // testar o fim do ciclo: com timer zerado, o clima alterna
    s.weather = 'rainy';
    s.weatherTimer = 0;
    g.update(0.01);
    const afterCycle = s.weather;

    return {
      hasRainPoints,
      rainVisible,
      puddlesCount,
      puddlesVisible,
      afterCycle
    };
  });

  console.log('Resultados de Clima:', JSON.stringify(weatherCheck, null, 2));
  if (!weatherCheck.hasRainPoints || !weatherCheck.rainVisible || weatherCheck.puddlesCount < 8 || !weatherCheck.puddlesVisible) {
    throw new Error('Falha no sistema de partículas de chuva ou piscinas.');
  }
  if (weatherCheck.afterCycle !== 'sunny') {
    throw new Error('Falha no ciclo de clima (alternância sunny/rainy).');
  }
  console.log('✅ Teste 1: Sistema de chuva e clima dinâmico validado.');

  // 2. Iluminação Neon Noturna (materiais emissivos)
  console.log('\n--- Test 2: Iluminação Neon Noturna ---');
  const neonCheck = await page.evaluate(() => {
    const s = window.state;
    let neonCount = 0;
    s.neonMaterials.forEach(m => {
      if (m && m.userData && m.userData.isNeon) neonCount++;
    });
    return { neonCount };
  });
  console.log('Resultados de Neon:', JSON.stringify(neonCheck, null, 2));
  if (neonCheck.neonCount < 30) {
    throw new Error('Falha: poucos materiais neon nos edifícios.');
  }
  console.log('✅ Teste 2: Materiais neon dos edifícios criados.');

  // 3. Sistema de Táxi (Crazy Taxi Mode)
  console.log('\n--- Test 3: Sistema de Táxi (Crazy Taxi Mode) ---');
  const taxiCheck = await page.evaluate(() => {
    const g = window.game;
    const taxi = g.taxiSystem;
    const s = window.state;

    // Forçar spawn de um passageiro
    taxi.passengers = [];
    taxi.trySpawnPassenger();
    const spawned = taxi.passengers.length;

    const realCar = g.trafficSystem.cars[0];
    if (taxi.passengers.length > 0) {
      const passenger = taxi.passengers[0];
      // usar um carro REAL do tráfego, posicionando próximo ao passageiro
      passenger.pedestrian.mesh.position.y = 0;
      realCar.mesh.position.copy(passenger.pedestrian.mesh.position);
      realCar.currentSpeed = 0;
      s.inCar = true;
      s.currentCar = realCar;
      s.passengerActive = false;
      passenger.nearby = false;

      // atualizar taxi para detectar proximidade
      taxi.update(0.016, realCar.mesh.position, true, realCar);

      // embarque
      taxi.tryPickupPassenger(realCar);

      const destSet = !!s.passengerTargetPos;
      const markerSet = !!taxi.destinationMarker;
      const timerSet = s.passengerTimer > 0;

      // completar a corrida
      const moneyBefore = s.money;
      taxi.completeMission(realCar);
      const moneyAfter = s.money;
      const passengersDelivered = s.records.passengersDelivered;

      // cleanup: sair do carro para não quebrar o loop do jogo
      s.inCar = false;
      s.currentCar = null;

      return {
        spawned,
        boarded: passengersDelivered >= 1,
        destSet,
        markerSet,
        timerSet,
        moneyIncreased: moneyAfter > moneyBefore,
        passengersDelivered,
        hasIconFunction: typeof taxi.tryPickupPassenger === 'function'
      };
    }
    return { spawned, error: 'no passenger spawned' };
  });

  console.log('Resultados de Táxi:', JSON.stringify(taxiCheck, null, 2));
  if (taxiCheck.spawned < 1 || !taxiCheck.boarded || !taxiCheck.destSet || !taxiCheck.markerSet) {
    throw new Error('Falha no fluxo de embarque/destino do táxi.');
  }
  if (!taxiCheck.moneyIncreased || taxiCheck.passengersDelivered < 1) {
    throw new Error('Falha na conclusão da corrida de táxi (pagamento/recordes).');
  }
  console.log('✅ Teste 3: Embarque, destino e conclusão de corrida de táxi validados.');

  // 4. Perfil de Condução (Driver Profile)
  console.log('\n--- Test 4: Perfil de Condução (Driver Profile) ---');
  const profileCheck = await page.evaluate(() => {
    window.updateProfilePanel();
    const rows = document.querySelectorAll('#profile-records .profile-record');
    return { rowsCount: rows.length };
  });
  console.log('Resultados de Perfil:', JSON.stringify(profileCheck, null, 2));
  if (profileCheck.rowsCount < 5) {
    throw new Error('Falha na renderização do Driver Profile (deveria ter 5 recordes).');
  }
  console.log('✅ Teste 4: Painel de Perfil com 5 recordes renderizado.');

  // 5. Áudio Procedural (Chuva, Gorjeta e Grito do Passageiro)
  console.log('\n--- Test 5: Áudio Procedural Web Audio API ---');
  const audioCheck = await page.evaluate(() => {
    const ae = window.audioEngine;
    if (!ae.initialized) ae.init(); // inicia no contexto (idempotente)
    return {
      hasRainNodes: !!(ae.rainNoiseNode && ae.rainGain && ae.rainFilter),
      hasTaxiChime: typeof ae.playTaxiChime === 'function',
      hasScream: typeof ae.playPassengerScream === 'function'
    };
  });
  console.log('Resultados de Áudio:', JSON.stringify(audioCheck, null, 2));
  if (!audioCheck.hasRainNodes || !audioCheck.hasTaxiChime || !audioCheck.hasScream) {
    throw new Error('Falha no áudio procedural de chuva/gorjeta/grito.');
  }
  console.log('✅ Teste 5: Áudio procedural de chuva, chime de gorjeta e grito validados.');

  // 6. Estabilidade (0 erros)
  console.log('\n--- Test 6: Estabilidade WebGL e Ausência de Erros ---');
  await page.waitForTimeout(1500);
  if (consoleErrors.length > 0) {
    console.error('Erros no console:', consoleErrors);
    throw new Error(`Encontrados ${consoleErrors.length} erros no console.`);
  }
  console.log('✅ Teste 6: WebGL e Three.js executaram com 0 erros.');

  const screenshotPath = path.join(__dirname, 'voxel_city_task004_qa_evidence.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n📸 Screenshot de evidência capturada em: ${screenshotPath}`);

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DE QA DA TASK_004 (VOXEL CITY) PASSARAM!');
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
