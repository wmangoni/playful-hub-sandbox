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
  console.log('  QA TEST SUITE - VOXEL ARENA (TASK_002: Roguelite & Stamina)');
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

  // 1. Validar Configuração de Inimigos (Brute e Stalker)
  console.log('\n--- Test 1: Novos Inimigos Dinâmicos (Voxel Brute e Shadow Stalker) ---');
  const enemiesCheck = await page.evaluate(() => {
    const a = window.__arena;
    const cfg = a.ENEMY_CONFIG;

    const brute = a.makeEnemy('brute');
    const stalker = a.makeEnemy('stalker');

    return {
      hasBruteConfig: cfg.brute.hp === 120 && cfg.brute.damage === 15 && cfg.brute.scale === 1.8 && cfg.brute.xp === 40,
      hasStalkerConfig: cfg.stalker.hp === 25 && cfg.stalker.speed === 9 && cfg.stalker.attackCd === 0.8 && cfg.stalker.xp === 20,
      bruteMeshScale: brute.mesh.scale.x,
      stalkerMeshScale: stalker.mesh.scale.x
    };
  });

  console.log('Resultados dos Inimigos:', JSON.stringify(enemiesCheck, null, 2));
  if (!enemiesCheck.hasBruteConfig || !enemiesCheck.hasStalkerConfig || enemiesCheck.bruteMeshScale !== 1.8 || enemiesCheck.stalkerMeshScale !== 0.7) {
    throw new Error('Falha na configuração e escala dos novos inimigos Brute e Stalker.');
  }
  console.log('✅ Teste 1: Voxel Brute (Elite) e Shadow Stalker validados com sucesso.');

  // 2. Validar Sistema de Ondas Dinâmicas (WAVE_CONFIG e Distribuição)
  console.log('\n--- Test 2: Sistema de 5 Ondas Dinâmicas ---');
  const waveCheck = await page.evaluate(() => {
    const a = window.__arena;
    const waves = a.WAVE_CONFIG;

    const wave1Type = a.selectType(1);
    
    // Testar seleção probabilística na onda 5
    let hasBruteOrStalker = false;
    for (let i = 0; i < 30; i++) {
      const t = a.selectType(5);
      if (t === 'brute' || t === 'stalker') {
        hasBruteOrStalker = true;
        break;
      }
    }

    return {
      waveCount: Object.keys(waves).length,
      wave1Type,
      wave5HasVariety: hasBruteOrStalker,
      wave1MaxEnemies: waves[1].maxEnemies,
      wave5MaxEnemies: waves[5].maxEnemies
    };
  });

  console.log('Resultados de Ondas:', JSON.stringify(waveCheck, null, 2));
  if (waveCheck.waveCount !== 5 || waveCheck.wave1Type !== 'basic' || !waveCheck.wave5HasVariety || waveCheck.wave5MaxEnemies !== 25) {
    throw new Error('Falha na estrutura ou seleção de ondas dinâmicas.');
  }
  console.log('✅ Teste 2: Sistema de 5 Ondas e spawn progressivo validados.');

  // 3. Validar XP Orbs e Atração Magnética
  console.log('\n--- Test 3: XP Orbs, Atração Magnética e Absorção de XP ---');
  const xpCheck = await page.evaluate(() => {
    const a = window.__arena;
    const player = a.game.player;
    const orbManager = a.game.xpOrbManager;

    const initialXp = player.xp;
    
    // Spawnar orb a 5 unidades do jogador (dentro do alcance magnético de 8.0)
    const orbPos = player.mesh.position.clone().add(new a.THREE.Vector3(5, 0, 0));
    orbManager.spawnOrb(orbPos, 40);

    const initialOrbCount = a.orbCount();
    const orb = orbManager.orbs[orbManager.orbs.length - 1];
    const initialDist = orb.mesh.position.distanceTo(player.mesh.position);

    // Simular atualização de magnetismo por 0.5s
    orbManager.update(0.5);
    const postDist = orb.mesh.position.distanceTo(player.mesh.position);

    // Colocar a orb colada ao jogador e atualizar para simular absorção
    orb.mesh.position.copy(player.mesh.position);
    orbManager.update(0.016);

    const finalXp = player.xp;

    return {
      initialOrbCount,
      attractedCloser: postDist < initialDist,
      xpGained: finalXp - initialXp
    };
  });

  console.log('Resultados de XP Orbs:', JSON.stringify(xpCheck, null, 2));
  if (!xpCheck.attractedCloser || xpCheck.xpGained < 40) {
    throw new Error('Falha na atração magnética ou absorção de XP Orbs.');
  }
  console.log('✅ Teste 3: Atração magnética e ganho de XP validados.');

  // 4. Validar Draft de Upgrades Roguelite (Level Up e Pausa)
  console.log('\n--- Test 4: Painel de Upgrades Roguelite (Draft Modal & Modificadores) ---');
  const draftCheck = await page.evaluate(() => {
    const a = window.__arena;
    const game = a.game;
    const player = game.player;

    // Conceder XP suficiente para Level Up (Level 1 requer 120 XP)
    player.gainXP(150);

    const isModalVisible = !document.getElementById('upgrade-modal').classList.contains('hidden');
    const cards = document.querySelectorAll('.upgrade-card');
    const cardsCount = cards.length;

    const initialLevel = player.level;
    const initialDmgMult = player.damageMultiplier;

    // Clicar no primeiro card de upgrade
    if (cardsCount > 0) {
      cards[0].click();
    }

    const isModalClosedAfterChoice = document.getElementById('upgrade-modal').classList.contains('hidden');

    return {
      levelAfterGain: initialLevel,
      isModalVisible,
      cardsCount,
      isModalClosedAfterChoice
    };
  });

  console.log('Resultados do Draft Roguelite:', JSON.stringify(draftCheck, null, 2));
  if (draftCheck.levelAfterGain < 2 || draftCheck.cardsCount !== 3 || !draftCheck.isModalClosedAfterChoice) {
    throw new Error('Falha no sistema de Draft Roguelite ou no Level Up modal.');
  }
  console.log('✅ Teste 4: Draft Roguelite (3 cartas aleatórias, level up e retomada) validado.');

  // 5. Validar Gestão de Stamina e Bloqueio de Exaustão
  console.log('\n--- Test 5: Combate Tático e Gestão de Stamina ---');
  const staminaCheck = await page.evaluate(() => {
    const a = window.__arena;
    const player = a.game.player;

    // Reduzir stamina para 5
    player.stats.stamina = 5;

    // Tentar gastar 50 de stamina (Ultimate)
    const ultBlocked = !player.trySpendStamina(50);

    // Restaurar stamina para 100
    player.stats.stamina = 100;
    const spinAllowed = player.trySpendStamina(20);
    const remainingStamina = player.stats.stamina;

    return {
      ultBlocked,
      spinAllowed,
      remainingStamina
    };
  });

  console.log('Resultados de Stamina:', JSON.stringify(staminaCheck, null, 2));
  if (!staminaCheck.ultBlocked || !staminaCheck.spinAllowed || staminaCheck.remainingStamina !== 80) {
    throw new Error('Falha no consumo ou bloqueio por exaustão de stamina.');
  }
  console.log('✅ Teste 5: Gestão tática de Stamina e bloqueio por exaustão validados.');

  // 6. Validar Estabilidade Geral
  console.log('\n--- Test 6: Estabilidade do Loop e Ausência de Erros ---');
  await page.waitForTimeout(1500);

  if (consoleErrors.length > 0) {
    console.error('Erros no console:', consoleErrors);
    throw new Error(`Encontrados ${consoleErrors.length} erros no console.`);
  }
  console.log('✅ Teste 6: Simulação executou com 0 erros.');

  // Tirar Screenshot de Evidência
  const screenshotPath = path.join(__dirname, 'voxel_arena_task002_qa_evidence.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n📸 Screenshot de evidência capturada em: ${screenshotPath}`);

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DE QA DA TASK_002 (VOXEL ARENA) PASSARAM!');
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
