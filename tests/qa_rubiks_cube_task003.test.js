process.env.NODE_ENV = 'test';
const http = require('http');
const path = require('path');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = process.env.TEST_PORT || 3101;

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
  console.log('  QA TEST SUITE - RUBIK\'S CUBE (TASK_003: Tutorial, WCA, Themes)');
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

  console.log('\n--- 1. Navegando para Rubik\'s Cube ---');
  await page.goto(`http://127.0.0.1:${PORT}/rubiks_cube/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => !!window.__rubik, { timeout: 15000 });

  // 1. Validar Gerador de Embaralhamento WCA Oficial (20 movimentos sem repetição de eixo)
  console.log('\n--- Test 1: Gerador de Embaralhamento Oficial WCA ---');
  const wcaCheck = await page.evaluate(() => {
    const r = window.__rubik;
    
    // Gerar 20 amostras de embaralhamento WCA e verificar regras
    const faceAxis = { "U": 1, "D": 1, "R": 0, "L": 0, "F": 2, "B": 2 };
    let allValid = true;

    for (let i = 0; i < 20; i++) {
      const scramble = r.generateWCAScramble();
      if (scramble.length !== 20) { allValid = false; break; }

      let lastAxis = -1, secondLastAxis = -1, lastFace = '';
      for (const token of scramble) {
        const face = token[0];
        const axis = faceAxis[face];
        if (face === lastFace) { allValid = false; break; }
        if (axis === lastAxis && axis === secondLastAxis) { allValid = false; break; }
        secondLastAxis = lastAxis;
        lastAxis = axis;
        lastFace = face;
      }
      if (!allValid) break;
    }

    const sampleScramble = r.generateWCAScramble().join(' ');
    const parsedMoves = r.parseAlgorithm(sampleScramble);

    return {
      allValid,
      sampleScramble,
      parsedMovesCount: parsedMoves.length
    };
  });

  console.log('Resultados de Embaralhamento WCA:', JSON.stringify(wcaCheck, null, 2));
  if (!wcaCheck.allValid || wcaCheck.parsedMovesCount < 20) {
    throw new Error('Falha no algoritmo de geração de embaralhamento oficial WCA.');
  }
  console.log('✅ Teste 1: Gerador WCA oficial de 20 lances validado.');

  // 2. Validar Modo Tutorial Interativo (Margarida e Cruz Branca com Foco Visual)
  console.log('\n--- Test 2: Modo Tutorial Interativo e Detecção Geométrica ---');
  const tutorialCheck = await page.evaluate(() => {
    const r = window.__rubik;

    // No cubo resolvido, tanto a Margarida quanto a Cruz Branca já satisfazem a normal mundial
    const isDaisyInSolved = r.checkDaisyFormed();
    const isCrossInSolved = r.checkWhiteCrossFormed();

    // Iniciar Tutorial
    r.startTutorial();
    const tutorialActive = r.tutorialState.active;
    const currentStep = r.tutorialState.currentStep;

    // Verificar se cubies não-alvo receberam opacidade reduzida
    const cubies = r.cubies();
    const someTransparent = cubies.some(c => Array.isArray(c.material) && c.material.some(m => m.transparent && m.opacity < 0.5));

    // Sair do Tutorial
    r.exitTutorial();
    const tutorialExited = !r.tutorialState.active;

    return {
      isDaisyInSolved,
      isCrossInSolved,
      tutorialActive,
      currentStep,
      someTransparent,
      tutorialExited
    };
  });

  console.log('Resultados do Tutorial:', JSON.stringify(tutorialCheck, null, 2));
  if (!tutorialCheck.tutorialActive || !tutorialCheck.someTransparent || !tutorialCheck.tutorialExited) {
    throw new Error('Falha no Modo Tutorial Interativo ou no filtro de foco visual.');
  }
  console.log('✅ Teste 2: Modo Tutorial Interativo e filtro de foco visual validados.');

  // 3. Validar Temas Visuais Avançados e Esquemas de Cores
  console.log('\n--- Test 3: Temas Visuais (Neon, Holographic, Classic) e Esquemas de Cores ---');
  const themesCheck = await page.evaluate(() => {
    const r = window.__rubik;
    const cubies = r.cubies();

    // Aplicar Tema Neon
    r.applyCubeTheme('neon');
    const externalMatNeon = cubies.flatMap(c => c.material).find(m => m.emissiveIntensity > 0);
    const isNeonEmissive = !!externalMatNeon && externalMatNeon.emissiveIntensity >= 0.7;

    // Aplicar Tema Holographic
    r.applyCubeTheme('holographic');
    const externalMatHolo = cubies.flatMap(c => c.material).find(m => m.transparent && m.opacity < 1.0);
    const isHoloTransparent = !!externalMatHolo && externalMatHolo.opacity <= 0.7;

    // Aplicar Esquema Japanese
    r.applyColorScheme(r.COLOR_SCHEMES.japanese);
    const colorsJapanese = r.colors;
    const isJapaneseDownBlue = colorsJapanese.down === 0x0000ff;

    // Restaurar Classic e WCA
    r.applyColorScheme(r.COLOR_SCHEMES.wca);
    r.applyCubeTheme('classic');

    return {
      isNeonEmissive,
      isHoloTransparent,
      isJapaneseDownBlue
    };
  });

  console.log('Resultados de Temas e Cores:', JSON.stringify(themesCheck, null, 2));
  if (!themesCheck.isNeonEmissive || !themesCheck.isHoloTransparent || !themesCheck.isJapaneseDownBlue) {
    throw new Error('Falha na aplicação dos Temas Visuais ou Esquemas de Cores.');
  }
  console.log('✅ Teste 3: Temas Visuais (Neon, Holographic) e Esquemas de Cores validados.');

  // 4. Validar Galeria de Padrões Clássicos
  console.log('\n--- Test 4: Galeria de Padrões Clássicos ---');
  const patternsCheck = await page.evaluate(() => {
    const r = window.__rubik;
    const patterns = r.PATTERNS;

    const hasCheckerboard = !!patterns.checkerboard;
    const hasCubeInCube = !!patterns.cubeincube;
    const hasAnaconda = !!patterns.anaconda;
    const hasSixSpots = !!patterns.sixspots;

    // Executar algoritmo do padrão Checkerboard
    const tokens = r.parseAlgorithm(patterns.checkerboard);
    const moves = tokens.flatMap(t => r.notationToMoves(t));

    return {
      hasCheckerboard,
      hasCubeInCube,
      hasAnaconda,
      hasSixSpots,
      checkerboardTokensCount: tokens.length,
      checkerboardMovesCount: moves.length
    };
  });

  console.log('Resultados dos Padrões:', JSON.stringify(patternsCheck, null, 2));
  if (!patternsCheck.hasCheckerboard || !patternsCheck.hasCubeInCube || !patternsCheck.hasAnaconda || !patternsCheck.hasSixSpots || patternsCheck.checkerboardMovesCount < 6) {
    throw new Error('Falha na Galeria de Padrões Clássicos.');
  }
  console.log('✅ Teste 4: Galeria de Padrões Clássicos validada.');

  // 5. Validar Estabilidade Geral
  console.log('\n--- Test 5: Estabilidade do Loop e Ausência de Erros ---');
  await page.waitForTimeout(1500);

  if (consoleErrors.length > 0) {
    console.error('Erros no console:', consoleErrors);
    throw new Error(`Encontrados ${consoleErrors.length} erros no console.`);
  }
  console.log('✅ Teste 5: Simulação executou com 0 erros.');

  // Tirar Screenshot de Evidência
  const screenshotPath = path.join(__dirname, 'rubiks_cube_task003_qa_evidence.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n📸 Screenshot de evidência capturada em: ${screenshotPath}`);

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DE QA DA TASK_003 (RUBIK\'S CUBE) PASSARAM!');
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
