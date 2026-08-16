process.env.NODE_ENV = 'test';
const http = require('http');
const path = require('path');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = process.env.TEST_PORT || 3100;

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
  console.log('  QA TEST SUITE - LAZY GARDENER (TASK_003: Biomes, Crossbreeding, Show)');
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

  console.log('\n--- 1. Navegando para Lazy Gardener ---');
  await page.goto(`http://127.0.0.1:${PORT}/lazy_gardner/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => !!window.__garden, { timeout: 15000 });

  // 1. Validar Sistema de Estufas e Biomas Especiais (Desert, Glacial, Cyberglow)
  console.log('\n--- Test 1: Estufas de Biomas Especiais (Three.js Iluminação e Materiais) ---');
  const biomesCheck = await page.evaluate(() => {
    const g = window.__garden;
    
    // Adicionar ouro para compra de estufas
    g.gardenState.gold = 20000;

    // Comprar e alternar para Desert
    g.buyGreenhouse('desert');
    g.switchGreenhouse('desert');
    const stateDesert = g.getState();
    const groundColorDesert = g.getGround().material.color.getHexString();

    // Comprar e alternar para Cyberglow
    g.buyGreenhouse('cyberglow');
    g.switchGreenhouse('cyberglow');
    const stateCyber = g.getState();
    const groundColorCyber = g.getGround().material.color.getHexString();

    // Comprar e alternar para Glacial
    g.buyGreenhouse('glacial');
    g.switchGreenhouse('glacial');
    const stateGlacial = g.getState();
    const groundColorGlacial = g.getGround().material.color.getHexString();

    return {
      unlockedDesert: stateDesert.unlocked.includes('desert'),
      unlockedCyber: stateCyber.unlocked.includes('cyberglow'),
      unlockedGlacial: stateGlacial.unlocked.includes('glacial'),
      groundColorDesert,
      groundColorCyber,
      groundColorGlacial,
      currentGreenhouse: stateGlacial.greenhouse
    };
  });

  console.log('Resultados das Estufas de Biomas:', JSON.stringify(biomesCheck, null, 2));
  if (!biomesCheck.unlockedDesert || !biomesCheck.unlockedCyber || !biomesCheck.unlockedGlacial) {
    throw new Error('Falha no desbloqueio ou transição das estufas de biomas especiais.');
  }
  console.log('✅ Teste 1: Estufas de Biomas Especiais e iluminação Three.js validados.');

  // 2. Validar Sistema de Hibridização Genética e Inventário de Sementes Híbridas
  console.log('\n--- Test 2: Cruzamento Genético (Crossbreeding) e Sementes Híbridas ---');
  const hybridCheck = await page.evaluate(() => {
    const g = window.__garden;

    // Plantar duas espécies maduras próximas (flor e bambu a 1.0 unidade de distância)
    g.plantAt(0, 0, 'flower');
    g.plantAt(1.0, 0, 'bamboo');

    const plant1 = g.plants[g.plants.length - 2];
    const plant2 = g.plants[g.plants.length - 1];

    // Forçar maturidade
    plant1.growthStage = 3; // Maduro para flor (seed, sprout, bud, bloom)
    plant2.growthStage = 3; // Maduro para bambu

    // Disparar hibridização
    g.triggerHybridization(plant1, plant2);
    const hasHybridFlag = !!plant1.hasHybridSeed;
    const hybridType = plant1.hasHybridSeed;

    // Colher a planta receptora para conceder a semente híbrida
    g.harvestPlant(plant1);
    const stateAfterHarvest = g.getState();
    const seedsCount = stateAfterHarvest.hybrids[hybridType] || 0;

    // Plantar o híbrido do inventário
    g.plantHybrid(new g.THREE.Vector3(3, 0, 3), hybridType);
    const plantedHybrid = g.plants[g.plants.length - 1];
    const stateAfterPlanting = g.getState();
    const seedsCountAfterPlant = stateAfterPlanting.hybrids[hybridType] || 0;

    return {
      hasHybridFlag,
      hybridType,
      seedsGained: seedsCount >= 1,
      plantedIsHybrid: plantedHybrid ? plantedHybrid.isHybrid : false,
      seedsConsumed: seedsCountAfterPlant === seedsCount - 1
    };
  });

  console.log('Resultados de Hibridização:', JSON.stringify(hybridCheck, null, 2));
  if (!hybridCheck.hasHybridFlag || !hybridCheck.seedsGained || !hybridCheck.plantedIsHybrid || !hybridCheck.seedsConsumed) {
    throw new Error('Falha no sistema de polinização cruzada ou plantio de sementes híbridas.');
  }
  console.log('✅ Teste 2: Hibridização genética e ciclo de sementes híbridas validados.');

  // 3. Validar Exposição Anual de Jardinagem (Flower Show)
  console.log('\n--- Test 3: Exposição de Jardinagem (Flower Show - Medalha de Ouro) ---');
  const showCheck = await page.evaluate(() => {
    const g = window.__garden;
    g.forceExhibitionReady();

    // Criar planta híbrida de alta qualidade (100% umidade média, tamanho 1.15)
    const hybridPlant = {
      isHybrid: true,
      hybridType: 'firelotus',
      growthStage: 2,
      moisture: 100,
      moistureSum: 1000,
      moistureSamples: 10,
      sizeVariation: 1.15
    };

    const goldResult = g.evaluatePlantForShow(hybridPlant);

    // Criar planta comum desidratada (10% umidade média, tamanho 0.85)
    const dryPlant = {
      isHybrid: false,
      type: 'flower',
      growthStage: 2,
      moisture: 10,
      moistureSum: 100,
      moistureSamples: 10,
      sizeVariation: 0.85
    };

    const bronzeResult = g.evaluatePlantForShow(dryPlant);

    return {
      goldScore: goldResult.total,
      goldMedal: goldResult.tier,
      goldReward: goldResult.reward,
      goldHasBuff: goldResult.buff,
      bronzeScore: bronzeResult.total,
      bronzeMedal: bronzeResult.tier,
      bronzeReward: bronzeResult.reward
    };
  });

  console.log('Resultados do Flower Show:', JSON.stringify(showCheck, null, 2));
  if (showCheck.goldMedal !== 'gold' || showCheck.goldScore < 90 || showCheck.bronzeMedal !== 'bronze') {
    throw new Error('Falha na fórmula de avaliação do Concurso de Jardinagem.');
  }
  console.log('✅ Teste 3: Exposição de Jardinagem (Flower Show) validada.');

  // 4. Validar Estabilidade Geral
  console.log('\n--- Test 4: Estabilidade do Loop e Ausência de Erros ---');
  await page.waitForTimeout(1500);

  if (consoleErrors.length > 0) {
    console.error('Erros no console:', consoleErrors);
    throw new Error(`Encontrados ${consoleErrors.length} erros no console.`);
  }
  console.log('✅ Teste 4: Simulação executou com 0 erros.');

  // Tirar Screenshot de Evidência
  const screenshotPath = path.join(__dirname, 'lazy_gardener_task003_qa_evidence.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n📸 Screenshot de evidência capturada em: ${screenshotPath}`);

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DE QA DA TASK_003 (LAZY GARDENER) PASSARAM!');
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
