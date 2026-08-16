process.env.NODE_ENV = 'test';
const http = require('http');
const path = require('path');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = process.env.TEST_PORT || 3095;

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
  console.log('  QA TEST SUITE - VOXEL ARENA (TASK_003: Boss Fight & Game Feel)');
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

  console.log('\n--- 1. Navegando para Voxel Arena ---');
  await page.goto(`http://127.0.0.1:${PORT}/voxel_arena/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => !!window.__arena, { timeout: 15000 });

  // 1. Validar Encontro Épico com o Chefe Colosso Voxel (Spawn e 3 Fases)
  console.log('\n--- Test 1: Chefe Colosso Voxel (Spawn, 3 Fases e Cristais Orbitais) ---');
  const bossCheck = await page.evaluate(() => {
    const a = window.__arena;
    const game = a.game;

    // Injetar Boss na cena
    a.spawnBoss();
    const boss = game.boss;
    const statePhase1 = a.bossState();

    // Validar Fase 1 (3 cristais orbitais)
    const has3Crystals = statePhase1.crystals === 3;
    const bossScale = boss.mesh.scale.x;

    // Destruir cristais para acionar Fase 2
    [...boss.crystals].forEach(c => boss.hitCrystal(c, 100, game));
    boss.update(0.1, game);
    const statePhase2 = a.bossState();

    // Reduzir vida do chefe para menos de 35% para acionar Fase 3
    boss.takeDamage(boss.maxHp * 0.7, game);
    boss.update(0.1, game);
    const statePhase3 = a.bossState();

    return {
      hasBoss: !!boss,
      bossScale,
      has3Crystals,
      phase1: statePhase1.phase,
      phase2: statePhase2.phase,
      phase3: statePhase3.phase,
      isPhase3Enraged: boss.phase === 3 || statePhase3.phase === 3
    };
  });

  console.log('Resultados do Boss:', JSON.stringify(bossCheck, null, 2));
  if (!bossCheck.hasBoss || bossCheck.bossScale !== 4.5 || !bossCheck.has3Crystals || !bossCheck.isPhase3Enraged) {
    throw new Error('Falha no spawn do Colosso Voxel ou na transição de suas 3 fases.');
  }
  console.log('✅ Teste 1: Colosso Voxel (3 Fases, Cristais e Escala 4.5x) validado.');

  // 2. Validar Armadilhas Ambientais (Lava Geysers e Gravity Nexus)
  console.log('\n--- Test 2: Armadilhas Ambientais (Lava Geysers e Fenda Gravitacional) ---');
  const hazardsCheck = await page.evaluate(() => {
    const a = window.__arena;
    const game = a.game;

    // Ativar Lava Geysers através de update na Onda 3
    game.geyserManager.update(8.0, 3, game);
    const geysersCount = a.geyserCount();

    // Ativar Gravity Nexus
    game.gravityNexus.setActive(true);
    const isNexusActive = a.isNexusActive();

    // Testar força gravitacional sobre o jogador
    game.player.mesh.position.set(15, 0, 15);
    game.gravityNexus.update(0.5, game);
    const postNexusPos = game.player.mesh.position.clone();
    const pulledTowardsCenter = postNexusPos.length() < 15 * Math.SQRT2;

    return {
      geysersCount,
      isNexusActive,
      pulledTowardsCenter
    };
  });

  console.log('Resultados de Armadilhas:', JSON.stringify(hazardsCheck, null, 2));
  if (hazardsCheck.geysersCount < 1 || !hazardsCheck.isNexusActive || !hazardsCheck.pulledTowardsCenter) {
    throw new Error('Falha nas armadilhas ambientais (Lava Geysers ou Gravity Nexus).');
  }
  console.log('✅ Teste 2: Armadilhas Ambientais (Lava Geysers e Gravity Nexus) validadas.');

  // 3. Validar Game Feel (Hitstop, Screen Shake e Damage Popups)
  console.log('\n--- Test 3: Game Feel (Hitstop, Screen Shake e Damage Popups com Pooling) ---');
  const gameFeelCheck = await page.evaluate(() => {
    const a = window.__arena;
    const game = a.game;

    // 1. Hitstop
    a.triggerHitstop(80);
    const hitstopActive = game.hitstopTimer > 0;

    // 2. Screen Shake
    a.triggerShake(1.5, 0.4);
    const shakeActive = game.shakeManager.timer > 0;

    // 3. Damage Popups
    a.spawnDamagePopup('120', '#00ffff', false);
    a.spawnDamagePopup('350 CRIT!', '#ffd700', true);
    a.spawnDamagePopup('SEM STAMINA!', '#ff3333', false);

    const popupContainer = document.getElementById('popup-container');
    const popupsCount = popupContainer ? popupContainer.querySelectorAll('.damage-popup').length : 0;

    return {
      hitstopActive,
      shakeActive,
      popupsSpawned: popupsCount >= 3
    };
  });

  console.log('Resultados de Game Feel:', JSON.stringify(gameFeelCheck, null, 2));
  if (!gameFeelCheck.hitstopActive || !gameFeelCheck.shakeActive || !gameFeelCheck.popupsSpawned) {
    throw new Error('Falha nos mecanismos de Game Feel (Hitstop, Screen Shake ou Popups).');
  }
  console.log('✅ Teste 3: Game Feel (Hitstop 80ms, Screen Shake e Damage Popups 3D) validado.');

  // 4. Validar Estabilidade Geral
  console.log('\n--- Test 4: Estabilidade do Loop e Ausência de Erros ---');
  await page.waitForTimeout(1500);

  if (consoleErrors.length > 0) {
    console.error('Erros no console:', consoleErrors);
    throw new Error(`Encontrados ${consoleErrors.length} erros no console.`);
  }
  console.log('✅ Teste 4: Simulação executou com 0 erros.');

  // Tirar Screenshot de Evidência
  const screenshotPath = path.join(__dirname, 'voxel_arena_task003_qa_evidence.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n📸 Screenshot de evidência capturada em: ${screenshotPath}`);

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DE QA DA TASK_003 (VOXEL ARENA) PASSARAM!');
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
