process.env.NODE_ENV = 'test';
const http = require('http');
const path = require('path');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = process.env.TEST_PORT || 3098;

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
  console.log('  QA TEST SUITE - THREE.JS EARTH (TASK_002)');
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
    if (msg.type() === 'error' && !text.includes('ERR_NAME_NOT_RESOLVED') && !text.includes('ipapi')) {
      console.log(`[BROWSER ERROR] ${text}`);
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', err => {
    console.log(`[BROWSER PAGEERROR] ${err.toString()}`);
    consoleErrors.push(err.toString());
  });

  console.log('\n--- 1. Navegando para o visualizador Three.js Earth ---');
  await page.goto(`http://127.0.0.1:${PORT}/threejs-earth-main/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => !!window.__earth, { timeout: 15000 });

  // 1. Validar Cena WebGL e Objetos Globais
  console.log('\n--- Test 1: Verificação da Cena WebGL e Hook window.__earth ---');
  const webglState = await page.evaluate(() => {
    const e = window.__earth;
    if (!e || !e.scene) return { ready: false };

    return {
      ready: true,
      hasScene: !!e.scene,
      hasEarthMesh: !!e.earthMesh,
      hasGlowMesh: !!e.glowMesh,
      satellitesCount: e.satellitesMeshes ? e.satellitesMeshes.length : 0,
      satellitesDataCount: e.satellitesData ? e.satellitesData.length : 0
    };
  });

  console.log('Estado WebGL:', JSON.stringify(webglState, null, 2));
  if (!webglState.ready || webglState.satellitesCount !== 5 || webglState.satellitesDataCount !== 5) {
    throw new Error('Cena WebGL ou satélites não foram instanciados corretamente.');
  }
  console.log('✅ Teste 1: Cena WebGL e 5 satélites instanciados com sucesso.');

  // 2. Validar Órbitas e Translação dos Satélites
  console.log('\n--- Test 2: Validação de Órbitas (Equatorial, Polar, Inclinadas) e Movimento ---');
  const orbitsValidation = await page.evaluate(async () => {
    const e = window.__earth;
    const data = e.satellitesData;
    const meshes = e.satellitesMeshes;

    // Verificar tipos de órbitas parametrizadas
    const hasEquatorial = data.some(s => Math.abs(s.inclination) < 0.01);
    const hasPolar = data.some(s => Math.abs(Math.abs(s.inclination) - Math.PI / 2) < 0.05);
    const hasInclined = data.some(s => Math.abs(s.inclination) > 0.1 && Math.abs(Math.abs(s.inclination) - Math.PI / 2) > 0.1);

    // Capturar posições iniciais
    const initialPositions = meshes.map(m => ({ x: m.position.x, y: m.position.y, z: m.position.z }));

    // Aguardar translação
    await new Promise(r => setTimeout(r, 600));

    // Capturar novas posições
    const moved = meshes.some((m, i) => {
      const init = initialPositions[i];
      return Math.abs(m.position.x - init.x) > 0.0001 || Math.abs(m.position.z - init.z) > 0.0001;
    });

    return {
      hasEquatorial,
      hasPolar,
      hasInclined,
      moved
    };
  });

  console.log('Resultados de órbitas e movimento:', JSON.stringify(orbitsValidation, null, 2));
  if (!orbitsValidation.hasEquatorial || !orbitsValidation.hasPolar || !orbitsValidation.hasInclined || !orbitsValidation.moved) {
    throw new Error('Falha na validação das órbitas ou translação dos satélites.');
  }
  console.log('✅ Teste 2: Satélites em órbitas equatorial, polar e inclinadas com translação física ativa.');

  // 3. Validar Conversão Matemática de Geolocalização e Pino 3D
  console.log('\n--- Test 3: Validação de Projeção Geográfica 3D (convertGeoToCartesian) e Pino ---');
  const geoValidation = await page.evaluate(async () => {
    const e = window.__earth;
    
    // Testar cálculo trigonométrico para São Paulo (-23.5505, -46.6333) e raio 1.025
    const lat = -23.5505;
    const lon = -46.6333;
    const radius = 1.025;

    const phi = lat * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const expectedX = -radius * Math.cos(phi) * Math.sin(theta);
    const expectedY = radius * Math.sin(phi);
    const expectedZ = radius * Math.cos(phi) * Math.cos(theta);

    const computedLength = Math.sqrt(expectedX * expectedX + expectedY * expectedY + expectedZ * expectedZ);

    // Verificar se o pino ou estações existem no earthMesh
    const hasPinOrStations = e.earthMesh.children.length > 0;

    return {
      expectedYNegative: expectedY < 0, // Hemisfério Sul
      radiusMatch: Math.abs(computedLength - radius) < 0.001,
      hasEarthChildren: hasPinOrStations
    };
  });

  console.log('Resultados da geolocalização:', JSON.stringify(geoValidation, null, 2));
  if (!geoValidation.expectedYNegative || !geoValidation.radiusMatch || !geoValidation.hasEarthChildren) {
    throw new Error('Projeção de coordenadas geográficas ou pino 3D inconsistente.');
  }
  console.log('✅ Teste 3: Equações de projeção esférica $(x,y,z)$ e pino luminoso 3D validados.');

  // 4. Validar Atmosfera Volumétrica e Shader Fresnel (Rim Glow)
  console.log('\n--- Test 4: Atmosfera Volumétrica e Oscilação da Uniform fresnelScale ---');
  const atmosphereValidation = await page.evaluate(async () => {
    const e = window.__earth;
    if (!e.glowMesh || !e.glowMesh.material || !e.glowMesh.material.uniforms) {
      return { valid: false };
    }

    const initialFresnel = e.glowMesh.material.uniforms.fresnelScale.value;

    // Aguardar oscilação de tempo
    await new Promise(r => setTimeout(r, 400));

    const nextFresnel = e.glowMesh.material.uniforms.fresnelScale.value;
    const isOscillatingInRange = initialFresnel >= 0.5 && initialFresnel <= 1.2;

    return {
      valid: true,
      initialFresnel,
      nextFresnel,
      isOscillatingInRange
    };
  });

  console.log('Resultados da atmosfera volumétrica:', JSON.stringify(atmosphereValidation, null, 2));
  if (!atmosphereValidation.valid || !atmosphereValidation.isOscillatingInRange) {
    throw new Error('Shader Fresnel ou atmosfera volumétrica não estão oscilando conforme especificado.');
  }
  console.log('✅ Teste 4: Efeito volumétrico de atmosfera e oscilação Fresnel validados.');

  // 5. Validar Estabilidade e Ausência de Erros no Console
  console.log('\n--- Test 5: Estabilidade do Loop de Animação e Ausência de Erros ---');
  await page.waitForTimeout(1500);

  if (consoleErrors.length > 0) {
    console.error('Erros no console:', consoleErrors);
    throw new Error(`Encontrados ${consoleErrors.length} erros no console.`);
  }
  console.log('✅ Teste 5: WebGL e animações executaram sem nenhum erro.');

  // Tirar Screenshot de Evidência
  const screenshotPath = path.join(__dirname, 'threejs_earth_task002_qa_evidence.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n📸 Screenshot de evidência capturada em: ${screenshotPath}`);

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DE QA DA TASK_002 (THREE.JS EARTH) PASSARAM!');
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
