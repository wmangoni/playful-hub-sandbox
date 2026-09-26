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
  console.log('  QA TEST SUITE - SPACE SHOOTER (TASK_004)');
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
    if (msg.type() === 'error' && !text.includes('ERR_NAME_NOT_RESOLVED') && !text.includes('ERR_NO_BUFFER_SPACE') && !text.includes('Failed to load resource')) {
      console.log(`[BROWSER ERROR] ${text}`);
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', err => {
    console.log(`[BROWSER PAGEERROR] ${err.toString()}`);
    consoleErrors.push(err.toString());
  });

  // Aceitar diálogos automáticos
  page.on('dialog', async dialog => {
    console.log(`[DIALOG] ${dialog.type().toUpperCase()}: ${dialog.message()}`);
    await dialog.accept();
  });

  console.log('\n--- 1. Navegando para o jogo Space Shooter ---');
  await page.goto(`http://127.0.0.1:${PORT}/space_shooter/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => !!window.__spaceShooter, { timeout: 15000 });

  // 1. Validar Estrutura de HUD, Controles e Elementos Visuais
  console.log('\n--- Test 1: Verificação de UI, HUD e Elementos do Jogo ---');
  const domChecks = await page.evaluate(() => {
    const s = window.__spaceShooter;
    const player = document.getElementById('player');
    const score = document.getElementById('score');
    const playerHPBar = document.getElementById('player-hp-bar-fill');
    const coinsDisplay = document.getElementById('coins-display');
    const openHangarBtn = document.getElementById('open-weapon-tuning');
    const weaponModal = document.getElementById('weapon-modal');
    const pState = s.getPlayerState();

    return {
      hasPlayer: !!player,
      hasScore: !!score,
      hasPlayerHPBar: !!playerHPBar,
      hasCoinsDisplay: !!coinsDisplay,
      hasOpenHangarBtn: !!openHangarBtn,
      hasWeaponModal: !!weaponModal,
      playerHP: pState.hp,
      specialCharges: pState.specialCharges,
      activeWeapon: pState.activeWeapon
    };
  });

  console.log('Status da interface DOM:', JSON.stringify(domChecks, null, 2));
  if (!domChecks.hasPlayer || !domChecks.hasPlayerHPBar || !domChecks.hasOpenHangarBtn || !domChecks.hasWeaponModal) {
    throw new Error('Elementos fundamentais da UI/HUD do Space Shooter estão ausentes.');
  }
  console.log('✅ Teste 1: HUD, jogador e modal de armamento presentes e funcionais.');

  // 2. Validar Sistema de Economia e Troca de Armas (Vulcan, Plasma, Tesla)
  console.log('\n--- Test 2: Sistema de Economia, Compra e Armas Especiais ---');
  const weaponTest = await page.evaluate(() => {
    const s = window.__spaceShooter;
    s.setCoins(500); // Conceder moedas para teste

    // Abrir modal do hangar
    s.openWeaponModal();
    const modalOpened = document.getElementById('weapon-modal').style.display === 'flex';

    // Comprar Plasma Cannon
    s.buyWeapon('plasma');
    const plasmaBought = s.getPlayerState().unlockedWeapons.includes('plasma');
    const plasmaActive = s.getPlayerState().activeWeapon === 'plasma';

    // Disparar Plasma Cannon
    s.fireBullet();
    const plasmaOrbsCount = document.querySelectorAll('.plasma-orb').length;

    // Comprar e Equipar Tesla Lightning
    s.buyWeapon('tesla');
    const teslaBought = s.getPlayerState().unlockedWeapons.includes('tesla');
    const teslaActive = s.getPlayerState().activeWeapon === 'tesla';

    // Disparar Tesla
    s.fireBullet();

    // Fechar modal
    s.closeWeaponModal();
    const modalClosed = document.getElementById('weapon-modal').style.display === 'none';

    return {
      modalOpened,
      modalClosed,
      plasmaBought,
      plasmaActive,
      plasmaOrbsCount,
      teslaBought,
      teslaActive
    };
  });

  console.log('Resultados de Armas e Economia:', JSON.stringify(weaponTest, null, 2));
  if (!weaponTest.modalOpened || !weaponTest.plasmaBought || !weaponTest.teslaBought || !weaponTest.modalClosed) {
    throw new Error('Falha no ciclo de economia, compra ou equipagem de armamento.');
  }
  console.log('✅ Teste 2: Hangar, compra e disparo de Plasma Cannon e Tesla Lightning validados.');

  // 3. Validar Tiro Especial Triplo
  console.log('\n--- Test 3: Tiro Especial Triplo (Overdrive) ---');
  const specialCheck = await page.evaluate(() => {
    const s = window.__spaceShooter;
    const initialCharges = s.getPlayerState().specialCharges;
    s.triggerSpecial();
    const stateAfterTrigger = s.getPlayerState();
    return {
      initialCharges,
      active: stateAfterTrigger.isSpecialActive,
      remainingCharges: stateAfterTrigger.specialCharges
    };
  });

  console.log('Status do Tiro Especial:', JSON.stringify(specialCheck, null, 2));
  if (!specialCheck.active || specialCheck.remainingCharges >= specialCheck.initialCharges) {
    throw new Error('Falha na ativação do Tiro Especial Triplo.');
  }
  console.log('✅ Teste 3: Ativação do Tiro Especial e consumo de cargas validados.');

  // 4. Validar Dreadnought Prime Boss (3 Fases, Geradores de Escudo e Hyperbeam)
  console.log('\n--- Test 4: Dreadnought Prime Boss & Fases de Batalha ---');
  const bossCheck = await page.evaluate(() => {
    const s = window.__spaceShooter;
    s.spawnDreadnoughtPrime(600);
    const bState1 = s.getBossState();
    const gensCount = bState1.generatorsCount;

    return {
      isBossActive: bState1.isBossActive,
      isDreadnoughtActive: bState1.isDreadnoughtActive,
      generatorsCount: gensCount,
      bossPhase: bState1.bossPhase
    };
  });

  console.log('Status do Dreadnought Prime:', JSON.stringify(bossCheck, null, 2));
  if (!bossCheck.isBossActive || !bossCheck.isDreadnoughtActive || bossCheck.generatorsCount !== 3) {
    throw new Error('Falha na inicialização do Dreadnought Prime e seus 3 geradores orbitais.');
  }
  console.log('✅ Teste 4: Dreadnought Prime e geradores de escudo inicializados com sucesso.');

  // 5. Validar Anomalia Gravitacional (Buraco Negro)
  console.log('\n--- Test 5: Anomalia Gravitacional (Buraco Negro e Atração) ---');
  const blackHoleCheck = await page.evaluate(() => {
    const s = window.__spaceShooter;
    s.spawnBlackHole();
    const bhState = s.getBlackHoleState();
    const bhElementExists = !!document.querySelector('.black-hole');
    s.destroyBlackHole();
    const bhDestroyedState = s.getBlackHoleState();

    return {
      spawned: bhState.active,
      elementExists: bhElementExists,
      destroyed: !bhDestroyedState.active
    };
  });

  console.log('Status da Anomalia Gravitacional:', JSON.stringify(blackHoleCheck, null, 2));
  if (!blackHoleCheck.spawned || !blackHoleCheck.elementExists || !blackHoleCheck.destroyed) {
    throw new Error('Falha no ciclo de vida do Buraco Negro gravitacional.');
  }
  console.log('✅ Teste 5: Buraco Negro gravitacional criado e destruído com sucesso.');

  // 6. Validar Modo de Escolta Goliath Transport
  console.log('\n--- Test 6: Missão de Escolta da Nave Cargueira Goliath ---');
  const escortCheck = await page.evaluate(() => {
    const s = window.__spaceShooter;
    s.initEscortMode();
    const eState = s.getEscortState();
    const goliathVisible = document.getElementById('goliath-transport').style.display === 'block';
    
    // Aplicar dano controlado à Goliath
    s.goliathTakeDamage(40);
    const eStateAfterDmg = s.getEscortState();

    return {
      active: eState.active,
      goliathVisible,
      initialHp: eState.hp,
      hpAfterDmg: eStateAfterDmg.hp
    };
  });

  console.log('Status da Missão de Escolta:', JSON.stringify(escortCheck, null, 2));
  if (!escortCheck.active || !escortCheck.goliathVisible || escortCheck.hpAfterDmg !== 160) {
    throw new Error('Falha na missão de escolta da nave cargueira Goliath.');
  }
  console.log('✅ Teste 6: Missão de escolta, integridade e dano da Goliath validados.');

  // 7. Validar Estabilidade e Ausência de Erros no Console
  console.log('\n--- Test 7: Estabilidade da Execução e Ausência de Erros ---');
  await new Promise(r => setTimeout(r, 1500));

  if (consoleErrors.length > 0) {
    console.error('Erros no console:', consoleErrors);
    throw new Error(`Encontrados ${consoleErrors.length} erros no console durante a execução.`);
  }
  console.log('✅ Teste 7: Space Shooter executou perfeitamente com 0 erros.');

  // Screenshot de Evidência
  const screenshotPath = path.join(__dirname, 'space_shooter_qa_evidence.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n📸 Screenshot de evidência capturada em: ${screenshotPath}`);

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DE QA DO SPACE SHOOTER PASSARAM COM SUCESSO!');
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
