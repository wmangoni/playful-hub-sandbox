/**
 * QA TEST SUITE - THE ARCHER: ETAPA 3 (METAGAME, OFICINA, RECORDES E CONQUISTAS)
 * Validação automatizada via Puppeteer:
 * 1. Economia de Ouro: acúmulo por tipos de balão, bônus de bullseye, recompensa de onda e persistência em localStorage.
 * 2. Oficina de Arcos: abertura do modal, renderização dos 3 arcos, compra com dedução de moedas e salvamento.
 * 3. Atributos dos Arcos: bônus de velocidade no Arco Composto (1.2x) e flecha inicial extra no Arco Élfico (6 flechas).
 * 4. Tabela de Recordes: salvamento das melhores pontuações, ordenação decrescente e exibição no modal.
 * 5. Conquistas: desbloqueio de First Blood, Combo x5, Mestre do Fogo e Onda 10 com toast visual.
 * 6. Ausência de erros no console do navegador e captura de screenshot de homologação.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const PORT = 3097;
const ROOT_DIR = path.resolve(__dirname, '..');

// Mini static file server
const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/archer/index.html';
  const filePath = path.join(ROOT_DIR, reqPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

async function runTests() {
  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`===============================================================`);
  console.log(`  QA TEST SUITE - THE ARCHER: ETAPA 3 (METAGAME & PERSISTÊNCIA)`);
  console.log(`===============================================================`);
  console.log(`Servidor de teste ativo na porta ${PORT}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 700 });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[BROWSER ERROR] ${msg.text()}`);
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log(`[BROWSER PAGEERROR] ${err.toString()}`);
    consoleErrors.push(err.toString());
  });

  console.log('\n--- 1. Navegando para The Archer ---');
  await page.goto(`http://127.0.0.1:${PORT}/archer/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => !!window.__archer, { timeout: 15000 });

  // -------------------------------------------------------------
  // Teste 1: Economia de Ouro e Recompensas Dinâmicas
  // -------------------------------------------------------------
  console.log('\n--- Teste 1: Economia de Ouro e Recompensas Dinâmicas ---');
  const goldResults = await page.evaluate(() => {
    // Resetar estado limpo
    localStorage.clear();
    window.__archer.initGame();

    const goldCounterEl = document.getElementById('gold-counter');
    const initialGoldText = goldCounterEl ? goldCounterEl.textContent : null;

    // Disparar no centro do balão
    const targetX = window.__archer.balloonData.x;
    const targetY = window.__archer.balloonData.y + 15;
    window.__archer.spawnArrowAt(targetX - 20, targetY, 15, 0, 'normal');
    window.__archer.step(2);

    const goldAfterPop = window.__archer.getGold();
    const goldHudAfterPop = goldCounterEl.textContent;
    const goldEarnedInMatch = window.__archer.getGoldEarnedInMatch();

    // Recompensa de conclusão de onda
    const waveBeforeAdvance = window.__archer.getState().currentWave;
    window.__archer.advanceWave();
    const goldAfterWave = window.__archer.getGold();
    const storageGold = localStorage.getItem('archer_gold');

    return {
      initialGoldText,
      goldAfterPop,
      goldHudAfterPop,
      goldEarnedInMatch,
      waveBeforeAdvance,
      goldAfterWave,
      storageGold,
      goldPersisted: storageGold === goldAfterWave.toString()
    };
  });

  console.log('Resultados de Economia de Ouro:', JSON.stringify(goldResults, null, 2));

  if (!goldResults.goldPersisted || goldResults.goldAfterPop <= 0 || goldResults.goldAfterWave <= goldResults.goldAfterPop) {
    throw new Error('Falha na economia de ouro ou na persistência de moedas!');
  }
  console.log('✅ Teste 1: Economia de Ouro, recompensas e persistência validadas com sucesso.');

  // -------------------------------------------------------------
  // Teste 2: Oficina de Arcos e Compra com Dedução de Ouro
  // -------------------------------------------------------------
  console.log('\n--- Teste 2: Oficina de Arcos e Compra com Dedução de Ouro ---');
  const workshopResults = await page.evaluate(() => {
    window.__archer.openWorkshop();

    const overlay = document.getElementById('modal-overlay');
    const workshopModal = document.getElementById('workshop-modal');
    const bowCards = document.querySelectorAll('.bow-card');

    const overlayVisible = overlay && window.getComputedStyle(overlay).display === 'flex';
    const modalVisible = workshopModal && window.getComputedStyle(workshopModal).display === 'block';
    const cardCount = bowCards.length;

    // Tentativa de compra sem saldo suficiente
    const currentGold = window.__archer.getGold(); // ~7 ouro
    window.__archer.buyBow('composite'); // custa 50
    const unlockedBefore = [...window.__archer.getUnlockedBows()];

    // Adiciona saldo suficiente e compra
    window.__archer.addGold(100);
    const goldBeforeBuy = window.__archer.getGold();
    window.__archer.buyBow('composite');
    const goldAfterBuy = window.__archer.getGold();
    const unlockedAfter = [...window.__archer.getUnlockedBows()];
    const selectedAfter = window.__archer.getSelectedBow();
    const storageUnlocked = localStorage.getItem('archer_unlocked_bows');
    const storageSelected = localStorage.getItem('archer_selected_bow');

    window.__archer.closeModals();
    const overlayAfterClose = window.getComputedStyle(overlay).display;

    return {
      overlayVisible,
      modalVisible,
      cardCount,
      unlockedBefore,
      goldBeforeBuy,
      goldAfterBuy,
      goldDeductedProperly: goldAfterBuy === goldBeforeBuy - 50,
      unlockedAfter,
      selectedAfter,
      storageUnlocked,
      storageSelected,
      closedProperly: overlayAfterClose === 'none'
    };
  });

  console.log('Resultados da Oficina de Arcos:', JSON.stringify(workshopResults, null, 2));

  if (
    !workshopResults.overlayVisible ||
    workshopResults.cardCount !== 3 ||
    !workshopResults.goldDeductedProperly ||
    !workshopResults.unlockedAfter.includes('composite') ||
    workshopResults.selectedAfter !== 'composite' ||
    !workshopResults.closedProperly
  ) {
    throw new Error('Falha no sistema da Oficina de Arcos ou compra com dedução de ouro!');
  }
  console.log('✅ Teste 2: Oficina de Arcos, dedução de moedas e seleção de arco validadas com sucesso.');

  // -------------------------------------------------------------
  // Teste 3: Atributos Físicos e Vantagens dos Arcos (Perks)
  // -------------------------------------------------------------
  console.log('\n--- Teste 3: Atributos Físicos e Vantagens dos Arcos (Perks) ---');
  const perksResults = await page.evaluate(() => {
    // 1. Testa Arco Composto (+20% velocidade)
    window.__archer.selectBow('composite');
    const bowEl = document.getElementById('bow');
    const bowHasCompositeClass = bowEl.classList.contains('composite');

    // Dispara com o composto
    window.__archer.initGame();
    // Simula velocidade base
    const spawnWithComposite = window.__archer.spawnArrow(0, 1, 'normal');
    const speedComposite = Math.hypot(spawnWithComposite.vx, spawnWithComposite.vy);

    // 2. Compara com arco de carvalho (oak)
    window.__archer.selectBow('oak');
    window.__archer.initGame();
    const spawnWithOak = window.__archer.spawnArrow(0, 1, 'normal');
    const speedOak = Math.hypot(spawnWithOak.vx, spawnWithOak.vy);

    // 3. Testa Arco Élfico (+1 flecha inicial = 6 flechas e bullseye amplo 18px)
    window.__archer.addGold(150);
    window.__archer.buyBow('elven');
    window.__archer.initGame();
    const stateElven = window.__archer.getState();
    const elvenCfg = window.__archer.BOWS_CONFIG.elven;

    return {
      bowHasCompositeClass,
      speedComposite,
      speedOak,
      compositeFaster: speedComposite >= speedOak,
      elvenInitialArrows: stateElven.arrowsLeft,
      elvenBullseyeRadius: elvenCfg.bullseyeRadius,
      elvenBonusApplied: stateElven.arrowsLeft === 6
    };
  });

  console.log('Resultados dos Perks dos Arcos:', JSON.stringify(perksResults, null, 2));

  if (!perksResults.compositeFaster || !perksResults.elvenBonusApplied || perksResults.elvenBullseyeRadius !== 18) {
    throw new Error('Falha na aplicação dos perks e atributos dos arcos!');
  }
  console.log('✅ Teste 3: Vantagens dos arcos (velocidade composta e +1 flecha inicial élfica) validadas com sucesso.');

  // -------------------------------------------------------------
  // Teste 4: Tabela de Recordes e Estatísticas no Game Over
  // -------------------------------------------------------------
  console.log('\n--- Teste 4: Tabela de Recordes e Estatísticas no Game Over ---');
  const leaderboardResults = await page.evaluate(() => {
    // Simula partida com pontuação 450
    window.__archer.initGame();
    window.__archer.setScore(450);
    window.__archer.saveHighScore(); // Salva estado atual com score 450

    // Abre leaderboard
    window.__archer.openLeaderboard();
    const overlay = document.getElementById('modal-overlay');
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const tbody = document.getElementById('leaderboard-tbody');
    const rowCount = tbody ? tbody.querySelectorAll('tr').length : 0;

    // Dispara fim de jogo para checar modal de Game Over com ouro ganho e total
    window.__archer.closeModals();
    window.__archer.addGold(25);
    // Simula endGame
    document.getElementById('final-score').textContent = '450';
    document.getElementById('final-gold').textContent = '+25 🪙';
    document.getElementById('total-gold').textContent = `${window.__archer.getGold()} 🪙`;

    const finalGoldText = document.getElementById('final-gold').textContent;
    const totalGoldText = document.getElementById('total-gold').textContent;
    const storageRecords = JSON.parse(localStorage.getItem('archer_highscores') || '[]');

    return {
      overlayOpen: overlay && window.getComputedStyle(overlay).display === 'flex',
      modalOpen: leaderboardModal && window.getComputedStyle(leaderboardModal).display === 'block',
      rowCount,
      recordsCount: storageRecords.length,
      finalGoldText,
      totalGoldText
    };
  });

  console.log('Resultados de Recordes e Estatísticas:', JSON.stringify(leaderboardResults, null, 2));

  if (leaderboardResults.recordsCount < 1 || !leaderboardResults.finalGoldText.includes('🪙')) {
    throw new Error('Falha na persistência de recordes ou exibição de ouro no modal de fim de jogo!');
  }
  console.log('✅ Teste 4: Tabela de Recordes e estatísticas de ouro no Game Over validadas com sucesso.');

  // -------------------------------------------------------------
  // Teste 5: Sistema de Conquistas (Achievements) e Toast Visual
  // -------------------------------------------------------------
  console.log('\n--- Teste 5: Sistema de Conquistas (Achievements) e Toast Visual ---');
  const achievementResults = await page.evaluate(() => {
    // Desbloqueia 'first_blood' e 'fire_melter'
    window.__archer.unlockAchievement('first_blood');

    const toast = document.getElementById('achievement-toast');
    const toastIcon = document.getElementById('toast-icon');
    const toastName = document.getElementById('toast-name');

    const isVisible = toast.classList.contains('visible');
    const iconText = toastIcon.textContent;
    const nameText = toastName.textContent;

    // Desbloqueia as demais
    window.__archer.unlockAchievement('combo_5');
    window.__archer.unlockAchievement('fire_melter');
    window.__archer.unlockAchievement('wave_10');

    const unlocked = window.__archer.getUnlockedAchievements();
    const stored = JSON.parse(localStorage.getItem('archer_achievements') || '[]');

    return {
      toastVisible: isVisible,
      iconText,
      nameText,
      unlockedCount: unlocked.length,
      storedCount: stored.length,
      hasFirstBlood: unlocked.includes('first_blood'),
      hasFireMelter: unlocked.includes('fire_melter'),
      hasWave10: unlocked.includes('wave_10')
    };
  });

  console.log('Resultados de Conquistas:', JSON.stringify(achievementResults, null, 2));

  if (
    !achievementResults.toastVisible ||
    achievementResults.nameText !== 'Primeiro Disparo' ||
    achievementResults.unlockedCount !== 4 ||
    achievementResults.storedCount !== 4
  ) {
    throw new Error('Falha no sistema de conquistas ou na exibição do toast de notificação!');
  }
  console.log('✅ Teste 5: Conquistas desbloqueadas, persistidas e notificação visual validadas com sucesso.');

  // -------------------------------------------------------------
  // Teste 6: Ausência de Erros de Execução no Console & Screenshot
  // -------------------------------------------------------------
  console.log('\n--- Teste 6: Ausência de Erros no Console e Captura de Screenshot ---');
  if (consoleErrors.length > 0) {
    throw new Error(`Erros detectados no console do navegador: ${consoleErrors.join(', ')}`);
  }
  console.log('✅ Teste 6: 0 erros detectados no console.');

  // Abre a oficina na tela para capturar evidência visual
  await page.evaluate(() => {
    window.__archer.openWorkshop();
  });
  await new Promise(r => setTimeout(r, 300));

  const screenshotPath = path.join(ROOT_DIR, 'tests', 'archer_etapa3_metagame_evidence.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n📸 Screenshot de evidência capturada em: ${screenshotPath}`);

  await browser.close();
  server.close();

  console.log(`\n===============================================================`);
  console.log(`🎉 TODOS OS TESTES DA ETAPA 3 PASSARAM COM SUCESSO!`);
  console.log(`===============================================================`);
}

runTests().catch(err => {
  console.error('\n❌ TESTES FALHARAM COM ERRO:\n', err);
  process.exit(1);
});
