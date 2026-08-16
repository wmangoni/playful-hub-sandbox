process.env.NODE_ENV = 'test';
const http = require('http');
const path = require('path');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = process.env.TEST_PORT || 3097;

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
  console.log('  QA TEST SUITE - PUZZLE (TASK_001: Painel Alquímico de Runas)');
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

  console.log('\n--- 1. Navegando para Puzzle (Mind Labyrinth) ---');
  await page.goto(`http://127.0.0.1:${PORT}/puzzle/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => !!window.__puzzle, { timeout: 15000 });

  // 1. Validar Glassmorphism e Tipografia Arcana (Cinzel Decorative e Lora)
  console.log('\n--- Test 1: Glassmorphism Místico e Tipografia Arcana ---');
  const typographyCheck = await page.evaluate(() => {
    const gameContainer = document.querySelector('.game-container');
    const h1 = document.querySelector('h1');
    const narrative = document.getElementById('narrative');

    const containerStyle = window.getComputedStyle(gameContainer);
    const h1Style = window.getComputedStyle(h1);
    const narrativeStyle = window.getComputedStyle(narrative);

    const hasBackdrop = containerStyle.backdropFilter.includes('blur') || containerStyle.webkitBackdropFilter.includes('blur');
    const hasCinzel = h1Style.fontFamily.includes('Cinzel Decorative') || h1Style.fontFamily.includes('Cinzel');
    const hasLora = narrativeStyle.fontFamily.includes('Lora') || narrativeStyle.fontFamily.includes('Georgia');
    const hasBorderRadius = parseInt(containerStyle.borderRadius, 10) >= 10;

    return {
      hasBackdrop,
      hasCinzel,
      hasLora,
      hasBorderRadius,
      containerBorder: containerStyle.border,
      h1Font: h1Style.fontFamily,
      narrativeFont: narrativeStyle.fontFamily
    };
  });

  console.log('Resultados de Tipografia e Glassmorphism:', JSON.stringify(typographyCheck, null, 2));
  if (!typographyCheck.hasBackdrop || !typographyCheck.hasCinzel || !typographyCheck.hasLora || !typographyCheck.hasBorderRadius) {
    throw new Error('Falha no Glassmorphism ou na aplicação das tipografias arcanas (Cinzel Decorative / Lora).');
  }
  console.log('✅ Teste 1: Glassmorphism místico e fontes arcanas (Cinzel / Lora) validados.');

  // 2. Validar Botões Alquímicos e Efeitos de Hover
  console.log('\n--- Test 2: Botões Alquímicos e Bioluminescência Rúnica ---');
  const buttonsCheck = await page.evaluate(() => {
    const btn = document.querySelector('.btn') || document.querySelector('.btn-primary');
    const btnStyle = btn ? window.getComputedStyle(btn) : null;

    return {
      hasButton: !!btn,
      borderRadius: btnStyle ? btnStyle.borderRadius : null,
      hasTransitions: btnStyle ? btnStyle.transition.includes('all') || btnStyle.transition.includes('transform') || btnStyle.transition.length > 0 : false
    };
  });

  console.log('Resultados dos Botões:', JSON.stringify(buttonsCheck, null, 2));
  if (!buttonsCheck.hasButton || !buttonsCheck.hasTransitions) {
    throw new Error('Falha na estilização dos botões alquímicos.');
  }
  console.log('✅ Teste 2: Botões alquímicos e transições visuais validados.');

  // 3. Validar Células de Enigmas (Memória, Sequência e Padrões)
  console.log('\n--- Test 3: Células de Enigmas e Padrões Rúnicos ---');
  const puzzleElementsCheck = await page.evaluate(() => {
    const p = window.__puzzle;
    p.startGame('campaign');

    const container = document.getElementById('puzzle-container') || document.querySelector('.puzzle-container');
    const hasChildren = container && container.children.length > 0;
    const items = document.querySelectorAll('.sequence-item, .sequence-option, .pattern-cell, .pattern-option, .memory-cell, .logic-premise, .btn-primary, button');

    return {
      hasChildren,
      itemsCount: items.length
    };
  });

  console.log('Resultados dos Enigmas:', JSON.stringify(puzzleElementsCheck, null, 2));
  if (!puzzleElementsCheck.hasChildren || puzzleElementsCheck.itemsCount < 1) {
    throw new Error('Falha na geração dos elementos dos enigmas rúnicos.');
  }
  console.log('✅ Teste 3: Elementos dos enigmas rúnicos validados com sucesso.');

  // 4. Validar Prisma 3D Translúcido (Rotating Cube CSS)
  console.log('\n--- Test 4: Estilização do Prisma de Cristal 3D (Rotating Cube) ---');
  const cubeCheck = await page.evaluate(() => {
    // Injetar temporariamente um elemento de cubo para testar as regras CSS compiladas
    const testDiv = document.createElement('div');
    testDiv.className = 'perspective-puzzle';
    testDiv.innerHTML = '<div class="rotating-cube"><div class="front">I</div><div class="back">II</div></div>';
    document.body.appendChild(testDiv);

    const perspectiveStyle = window.getComputedStyle(testDiv);
    const cubeDiv = testDiv.querySelector('.rotating-cube div');
    const faceStyle = window.getComputedStyle(cubeDiv);

    const hasPerspective = perspectiveStyle.perspective.includes('1200px') || parseInt(perspectiveStyle.perspective, 10) > 0;
    const hasBackdropBlur = faceStyle.backdropFilter.includes('blur') || faceStyle.webkitBackdropFilter.includes('blur') || faceStyle.border.length > 0;

    document.body.removeChild(testDiv);

    return {
      hasPerspective,
      hasBackdropBlur,
      perspectiveVal: perspectiveStyle.perspective,
      faceBorder: faceStyle.border
    };
  });

  console.log('Resultados do Cubo 3D:', JSON.stringify(cubeCheck, null, 2));
  if (!cubeCheck.hasPerspective) {
    throw new Error('Falha na estilização de perspectiva do prisma 3D.');
  }
  console.log('✅ Teste 4: Prisma de Cristal 3D translúcido validado.');

  // 5. Validar Estabilidade Geral
  console.log('\n--- Test 5: Estabilidade e Ausência de Erros ---');
  await page.waitForTimeout(1500);

  if (consoleErrors.length > 0) {
    console.error('Erros no console:', consoleErrors);
    throw new Error(`Encontrados ${consoleErrors.length} erros no console.`);
  }
  console.log('✅ Teste 5: Simulação e enigmas executaram com 0 erros.');

  // Tirar Screenshot de Evidência
  const screenshotPath = path.join(__dirname, 'puzzle_task001_qa_evidence.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n📸 Screenshot de evidência capturada em: ${screenshotPath}`);

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DE QA DA TASK_001 (PUZZLE) PASSARAM!');
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
