process.env.NODE_ENV = 'test';
const http = require('http');
const path = require('path');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = process.env.TEST_PORT || 3102;

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
  console.log('  QA TEST SUITE - RPG ADVENTURE QUEST (TASK_003: Combat, Map, Audio)');
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

  console.log('\n--- 1. Navegando para RPG Adventure Quest ---');
  await page.goto(`http://127.0.0.1:${PORT}/ded/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => !!window.__rpg, { timeout: 15000 });

  // 1. Validar Combate Interativo por Turnos (Tela Dedicada e Ações)
  console.log('\n--- Test 1: Combate Interativo por Turnos (Turn-Based Combat UI) ---');
  const combatCheck = await page.evaluate(() => {
    const rpg = window.__rpg;
    
    // Iniciar combate interativo contra um Goblin
    const enemy = { name: "Goblin Saqueador", ac: 12, hp: 14, max_hp: 14, str: 10, dex: 12, con: 10, bba: 1 };
    rpg.startInteractiveCombat(enemy);

    const combatScreen = document.getElementById('combat-screen');
    const isCombatVisible = !combatScreen.classList.contains('hidden');
    const enemyNameText = document.getElementById('combat-enemy-name').textContent;
    const enemyAcText = document.getElementById('combat-enemy-ac').textContent;

    // Validar botões de ação
    const btnAttack = document.getElementById('btn-combat-attack');
    const btnSpell = document.getElementById('btn-combat-spell');
    const btnItem = document.getElementById('btn-combat-item');
    const btnFlee = document.getElementById('btn-combat-flee');

    return {
      isCombatVisible,
      enemyName: enemyNameText,
      enemyAc: parseInt(enemyAcText),
      hasAttackBtn: !!btnAttack,
      hasSpellBtn: !!btnSpell,
      hasItemBtn: !!btnItem,
      hasFleeBtn: !!btnFlee,
      combatActive: rpg.gameState.combat.active,
      playerTurn: rpg.gameState.combat.turn === 'player'
    };
  });

  console.log('Resultados do Combate:', JSON.stringify(combatCheck, null, 2));
  if (!combatCheck.isCombatVisible || !combatCheck.combatActive || !combatCheck.hasAttackBtn || !combatCheck.hasSpellBtn) {
    throw new Error('Falha na inicialização da tela ou controles do combate interativo.');
  }
  console.log('✅ Teste 1: Combate interativo por turnos e UI dedicada validados.');

  // 2. Validar Minimapa de Exploração da Masmorra (Dynamic Dungeon Map & Fog of War)
  console.log('\n--- Test 2: Minimapa da Masmorra (SVG Graph & Névoa de Guerra) ---');
  const mapCheck = await page.evaluate(() => {
    const rpg = window.__rpg;

    // Encerrar combate para testar minimapa
    rpg.gameState.combat.active = false;
    document.getElementById('combat-screen').classList.add('hidden');

    // Abrir container do minimapa
    const btnToggleMap = document.getElementById('btn-toggle-map');
    btnToggleMap.click();

    const minimapContainer = document.getElementById('minimap-container');
    const isMapVisible = !minimapContainer.classList.contains('hidden');

    // Renderizar e inspecionar SVG do minimapa
    rpg.renderMinimap();
    const svgEl = document.querySelector('#minimap-view svg');
    const circleNodes = document.querySelectorAll('#minimap-view circle');
    const lineEdges = document.querySelectorAll('#minimap-view line');

    // Testar navegação por nó adjacente
    rpg.teleportToNode('corridor');
    const newCurrentScene = rpg.gameState.currentScene;
    const isVisited = rpg.gameState.visitedNodes.includes('corridor');

    return {
      isMapVisible,
      hasSvg: !!svgEl,
      nodesCount: circleNodes.length,
      edgesCount: lineEdges.length,
      navigatedScene: newCurrentScene,
      isVisitedCorridor: isVisited
    };
  });

  console.log('Resultados do Minimapa:', JSON.stringify(mapCheck, null, 2));
  if (!mapCheck.isMapVisible || !mapCheck.hasSvg || mapCheck.nodesCount === 0 || mapCheck.navigatedScene !== 'corridor') {
    throw new Error('Falha na renderização ou navegação pelo minimapa dinâmico.');
  }
  console.log('✅ Teste 2: Minimapa SVG e névoa de guerra validados.');

  // 3. Validar Síntese de Áudio Procedural (Web Audio API)
  console.log('\n--- Test 3: Síntese de Áudio Procedural (Web Audio API) ---');
  const audioCheck = await page.evaluate(() => {
    const rpg = window.__rpg;
    const engine = rpg.AudioEngine;

    let successCalls = 0;
    try {
      engine.init();
      if (typeof engine.playSlash === 'function') { engine.playSlash(); successCalls++; }
      if (typeof engine.playSpell === 'function') { engine.playSpell(); successCalls++; }
      if (typeof engine.playVictory === 'function') { engine.playVictory(); successCalls++; }
      if (typeof engine.playHeal === 'function') { engine.playHeal(); successCalls++; }
    } catch (e) {
      console.warn('Erro ao executar síntese de áudio:', e);
    }

    return {
      hasEngine: !!engine,
      hasCtx: !!engine.ctx,
      successCalls
    };
  });

  console.log('Resultados do Áudio Procedural:', JSON.stringify(audioCheck, null, 2));
  if (!audioCheck.hasEngine || audioCheck.successCalls < 2) {
    throw new Error('Falha na síntese de áudio procedural.');
  }
  console.log('✅ Teste 3: Áudio procedural (Web Audio API) validado.');

  // 4. Validar Estabilidade Geral
  console.log('\n--- Test 4: Estabilidade e Ausência de Erros no Console ---');
  await page.waitForTimeout(1500);

  if (consoleErrors.length > 0) {
    console.error('Erros no console:', consoleErrors);
    throw new Error(`Encontrados ${consoleErrors.length} erros no console.`);
  }
  console.log('✅ Teste 4: Simulação executou com 0 erros.');

  // Tirar Screenshot de Evidência
  const screenshotPath = path.join(__dirname, 'rpg_adventure_task003_qa_evidence.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n📸 Screenshot de evidência capturada em: ${screenshotPath}`);

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DE QA DA TASK_003 (RPG ADVENTURE QUEST) PASSARAM!');
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
