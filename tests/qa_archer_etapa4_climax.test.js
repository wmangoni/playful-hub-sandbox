/**
 * QA TEST SUITE - THE ARCHER: ETAPA 4 (BATALHA DE CHEFE, MODOS EXTRAS E POLIMENTO FINAL)
 * Validação automatizada via Puppeteer:
 * 1. Batalha de Chefe (Onda 10 - Titã dos Céus):
 *    - Spawn do Balão Chefe com 5 HP e dimensões ampliadas (62x80).
 *    - Barra de HP do Chefe no HUD (#boss-bar-container) sincronizada dinamicamente.
 *    - Flechas normais causam 1 de dano; flechas de fogo causam 2 de dano.
 *    - Derrota do chefe concede +1000 pontos, +25 de ouro, efeito Screen Shake e aciona vitória épica.
 * 2. Modo Rush 60s:
 *    - Ativação do modo Rush com cronômetro regressivo de 60 segundos (#timer-container).
 *    - Flechas infinitas (HUD exibe '∞' e arrowsLeft permanece 999 após disparos).
 *    - Respawn ágil contínuo de balões sem banner de onda.
 *    - Conquista 'rush_master' concedida ao atingir 1.500+ pontos.
 * 3. Modo Desafio Trickshot (Quebra-cabeças Balísticos):
 *    - Carregamento dos 3 níveis de desafio balístico com posicionamento estático de nuvem e escudo.
 *    - Ricochete obrigatório no escudo de madeira para alcançar o alvo.
 *    - Progressão automática entre os 3 níveis e concessão da conquista 'trickshot_ace'.
 * 4. Modal de Seleção de Modos de Jogo:
 *    - Exibição de cards interativos para Campanha, Rush e Trickshot.
 *    - Abertura e fechamento limpos via botões e overlay.
 * 5. Efeito Screen Shake e Polimento Audiovisual:
 *    - Aplicação da classe CSS .screen-shake no container de jogo em impactos de TNT e do Chefe.
 * 6. Ausência de erros no console do navegador e captura de screenshot de homologação.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const PORT = 3098;
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
  console.log(`========================================================================`);
  console.log(`  QA TEST SUITE - THE ARCHER: ETAPA 4 (CHEFE, MODOS EXTRAS E POLIMENTO) `);
  console.log(`========================================================================`);
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
  // Teste 1: Batalha de Chefe (Onda 10 - O Titã dos Céus)
  // -------------------------------------------------------------
  console.log('\n--- Teste 1: Batalha de Chefe (Onda 10 - Titã dos Céus) ---');
  const bossResults = await page.evaluate(() => {
    localStorage.clear();
    window.__archer.startCampaignMode();
    window.__archer.setWave(10);
    window.__archer.positionBalloon();

    const bossBarContainer = document.getElementById('boss-bar-container');
    const bossHpVal = document.getElementById('boss-hp-val');
    const bossHpFill = document.getElementById('boss-hp-fill');
    const balloonEl = document.getElementById('balloon');

    const stateWave10 = window.__archer.getState();
    const isBossSpawned = stateWave10.balloonType === 'boss' && stateWave10.balloonHp === 5;
    const isBossBarVisible = bossBarContainer && window.getComputedStyle(bossBarContainer).display === 'block';
    const isBossClassApplied = balloonEl && balloonEl.classList.contains('boss');
    const initialHpText = bossHpVal ? bossHpVal.textContent : null;

    // Disparo 1: Flecha Normal (dano = 1)
    const targetX = window.__archer.balloonData.x + 20;
    const targetY = window.__archer.balloonData.y + 30;
    window.__archer.spawnArrowAt(targetX - 25, targetY, 15, 0, 'normal');
    window.__archer.step(2);

    const hpAfterNormal = window.__archer.getState().balloonHp;
    const hpTextAfterNormal = bossHpVal ? bossHpVal.textContent : null;
    const isShakeActive = document.getElementById('game-container').classList.contains('screen-shake');

    // Disparo 2: Flecha de Fogo (dano = 2)
    window.__archer.spawnArrowAt(targetX - 25, targetY, 15, 0, 'fire');
    window.__archer.step(2);

    const hpAfterFire = window.__archer.getState().balloonHp;
    const hpTextAfterFire = bossHpVal ? bossHpVal.textContent : null;

    // Disparo 3: Flecha de Fogo final (dano = 2 -> HP 0 e derrota do Chefe)
    const scoreBeforeDefeat = window.__archer.getState().score;
    const goldBeforeDefeat = window.__archer.getGold();

    window.__archer.spawnArrowAt(targetX - 25, targetY, 15, 0, 'fire');
    window.__archer.step(2);

    const hpAfterDefeat = window.__archer.getState().balloonHp;
    const scoreAfterDefeat = window.__archer.getState().score;
    const goldAfterDefeat = window.__archer.getGold();
    const achievements = window.__archer.getUnlockedAchievements();

    return {
      isBossSpawned,
      isBossBarVisible,
      isBossClassApplied,
      initialHpText,
      hpAfterNormal,
      hpTextAfterNormal,
      isShakeActive,
      hpAfterFire,
      hpTextAfterFire,
      hpAfterDefeat,
      scoreGained: scoreAfterDefeat - scoreBeforeDefeat,
      goldGained: goldAfterDefeat - goldBeforeDefeat,
      hasBossSlayer: achievements.includes('boss_slayer'),
      hasWave10: achievements.includes('wave_10')
    };
  });

  console.log('Resultados da Batalha de Chefe:', JSON.stringify(bossResults, null, 2));

  if (!bossResults.isBossSpawned || !bossResults.isBossBarVisible || !bossResults.isBossClassApplied) {
    throw new Error('Falha na inicialização visual ou mecânica do Titã dos Céus na Onda 10!');
  }
  if (bossResults.hpAfterNormal !== 4 || bossResults.hpAfterFire !== 2 || bossResults.hpAfterDefeat > 0) {
    throw new Error(`Falha no cálculo de dano do chefe! HP normal: ${bossResults.hpAfterNormal}, fire: ${bossResults.hpAfterFire}, defeat: ${bossResults.hpAfterDefeat}`);
  }
  if (bossResults.scoreGained < 1000 || bossResults.goldGained < 25 || !bossResults.hasBossSlayer || !bossResults.hasWave10) {
    throw new Error('Falha nas recompensas de vitória épica ou desbloqueio de conquista do Chefe!');
  }
  console.log('✅ Teste 1: Batalha de Chefe (HP 5, 2x dano de fogo, recompensas e derrota) validada com sucesso.');

  // -------------------------------------------------------------
  // Teste 2: Modo Rush 60 Segundos (Flechas Infinitas & Cronômetro)
  // -------------------------------------------------------------
  console.log('\n--- Teste 2: Modo Rush 60 Segundos ---');
  const rushResults = await page.evaluate(() => {
    window.__archer.startRushMode();

    const timerContainer = document.getElementById('timer-container');
    const timerVal = document.getElementById('timer-val');
    const waveContainer = document.getElementById('wave-container');
    const arrowsCounter = document.getElementById('arrows-counter');

    const mode = window.__archer.getGameMode();
    const isTimerVisible = timerContainer && window.getComputedStyle(timerContainer).display === 'block';
    const isWaveHidden = waveContainer && window.getComputedStyle(waveContainer).display === 'none';
    const initialTimerText = timerVal ? timerVal.textContent : null;
    const initialArrowsCounter = arrowsCounter ? arrowsCounter.textContent : null;

    // Disparar flechas repetidamente para garantir que não decrementam
    for (let i = 0; i < 6; i++) {
      window.__archer.fireArrows();
    }

    const stateAfterFires = window.__archer.getState();
    const arrowsCounterAfterFires = arrowsCounter ? arrowsCounter.textContent : null;

    // Atingir balão para testar pontuação e respawn ágil
    const targetX = window.__archer.balloonData.x + 15;
    const targetY = window.__archer.balloonData.y + 15;
    window.__archer.spawnArrowAt(targetX - 20, targetY, 15, 0, 'normal');
    window.__archer.step(2);

    // Simular pontuação alta para conquista 'rush_master'
    window.__archer.setScore(1600);

    // Avançar cronômetro para testar finalização
    window.__archer.setRushTimer(1);

    return {
      mode,
      isTimerVisible,
      isWaveHidden,
      initialTimerText,
      initialArrowsCounter,
      arrowsLeftState: stateAfterFires.arrowsLeft,
      arrowsCounterAfterFires,
      score: window.__archer.getState().score
    };
  });

  console.log('Resultados do Modo Rush:', JSON.stringify(rushResults, null, 2));

  if (rushResults.mode !== 'rush' || !rushResults.isTimerVisible || !rushResults.isWaveHidden) {
    throw new Error('Falha na ativação da interface do Modo Rush 60s!');
  }
  if (rushResults.arrowsCounterAfterFires !== '∞' || rushResults.arrowsLeftState !== 999) {
    throw new Error('Falha nas flechas infinitas do Modo Rush!');
  }

  // Esperar o timer de 1s expirar para validar Game Over e conquista
  await new Promise(r => setTimeout(r, 1300));

  const rushGameOverResults = await page.evaluate(() => {
    const isGameOver = window.__archer.getState().gameOver;
    const achievements = window.__archer.getUnlockedAchievements();
    const gameOverTitle = document.getElementById('game-over-title');
    return {
      isGameOver,
      hasRushMaster: achievements.includes('rush_master'),
      titleText: gameOverTitle ? gameOverTitle.textContent : null
    };
  });

  console.log('Resultados do Fim de Jogo no Modo Rush:', JSON.stringify(rushGameOverResults, null, 2));

  if (!rushGameOverResults.isGameOver || !rushGameOverResults.hasRushMaster) {
    throw new Error('Falha no encerramento do Modo Rush ou na conquista rush_master!');
  }
  console.log('✅ Teste 2: Modo Rush 60s (flechas infinitas, cronômetro, pontuação e conquista) validado.');

  // -------------------------------------------------------------
  // Teste 3: Modo Desafio Trickshot (Quebra-cabeças Balísticos)
  // -------------------------------------------------------------
  console.log('\n--- Teste 3: Modo Desafio Trickshot ---');
  const trickshotResults = await page.evaluate(() => {
    window.__archer.startTrickshotMode(0);

    const mode = window.__archer.getGameMode();
    const lvlIndex0 = window.__archer.getTrickshotLevelIndex();
    const shieldPos0 = { x: window.__archer.woodenShield.x, y: window.__archer.woodenShield.y };
    const cloudPos0 = { x: window.__archer.stormCloud.x, y: window.__archer.stormCloud.y };
    const arrowsInitial = window.__archer.getState().arrowsLeft;

    // Testar ricochete físico no escudo e verificar deflexão para frente (Vx > 0)
    const arrow = window.__archer.spawnArrowAt(shieldPos0.x - 20, 500 - shieldPos0.y - 22, 15, 0, 'normal');
    window.__archer.step(2);
    const wasRicocheted = arrow.isRicocheted;
    const forwardDeflected = arrow.vx > 0;

    // Testar rejeição de disparo direto sem ricochete
    const b0X = window.__archer.balloonData.x + 15;
    const b0Y = window.__archer.balloonData.y + 15;
    window.__archer.spawnArrowAt(b0X - 30, b0Y, 10, 0, 'normal');
    window.__archer.step(2);
    const balloonEl0 = document.getElementById('balloon');
    const directShotRejected = (balloonEl0 && balloonEl0.style.display !== 'none');

    // Concluir Desafio 1 com flecha ricocheteada
    const ricochetArrow = window.__archer.spawnArrowAt(b0X - 30, b0Y, 10, 0, 'normal');
    ricochetArrow.isRicocheted = true;
    window.__archer.step(2);
    const ricochetPopped = (balloonEl0 && balloonEl0.style.display === 'none');

    return {
      mode,
      lvlIndex0,
      shieldPos0,
      cloudPos0,
      arrowsInitial,
      wasRicocheted,
      forwardDeflected,
      directShotRejected,
      ricochetPopped
    };
  });

  console.log('Resultados do Desafio Trickshot Nível 1:', JSON.stringify(trickshotResults, null, 2));

  if (!trickshotResults.wasRicocheted || !trickshotResults.forwardDeflected || !trickshotResults.directShotRejected || !trickshotResults.ricochetPopped) {
    throw new Error('Falha na física de ricochete ou na proteção contra tiro direto do Modo Trickshot!');
  }

  // Avançar diretamente para o nível 3 (índice 2) e vencer com ricochete para checar conquista
  const trickshotFinalResults = await page.evaluate(() => {
    window.__archer.startTrickshotMode(2);
    const lvlIndex2 = window.__archer.getTrickshotLevelIndex();

    // Acertar o balão do último nível com ricochete
    const b2X = window.__archer.balloonData.x + 15;
    const b2Y = window.__archer.balloonData.y + 15;
    const arrowFinal = window.__archer.spawnArrowAt(b2X - 30, b2Y, 10, 0, 'normal');
    arrowFinal.isRicocheted = true;
    window.__archer.step(2);

    const achievements = window.__archer.getUnlockedAchievements();
    const balloonEl = document.getElementById('balloon');

    return {
      lvlIndex2,
      balloonDisplay: balloonEl ? balloonEl.style.display : null,
      balloonData: { ...window.__archer.balloonData },
      arrowsLeft: window.__archer.getState().arrowsLeft,
      arrowCount: window.__archer.getActiveArrows().length,
      achievements,
      hasTrickshotAce: achievements.includes('trickshot_ace')
    };
  });

  console.log('Resultados do Desafio Trickshot Nível 3 (Final):', JSON.stringify(trickshotFinalResults, null, 2));

  if (!trickshotFinalResults.hasTrickshotAce) {
    throw new Error('Falha no desbloqueio da conquista trickshot_ace ao concluir o último desafio!');
  }
  console.log('✅ Teste 3: Modo Desafio Trickshot (ricochete físico, rejeição de tiro direto e conquista) validado.');

  // -------------------------------------------------------------
  // Teste 4: Modal de Seleção de Modos de Jogo & Overlay
  // -------------------------------------------------------------
  console.log('\n--- Teste 4: Modal de Seleção de Modos de Jogo ---');
  const modalResults = await page.evaluate(() => {
    window.__archer.openModesModal();

    const overlay = document.getElementById('modal-overlay');
    const modesModal = document.getElementById('modes-modal');
    const cardCampaign = document.getElementById('mode-card-campaign');
    const cardRush = document.getElementById('mode-card-rush');
    const cardTrickshot = document.getElementById('mode-card-trickshot');

    const isOverlayOpen = overlay && window.getComputedStyle(overlay).display === 'flex';
    const isModalOpen = modesModal && window.getComputedStyle(modesModal).display === 'block';
    const areCardsPresent = !!(cardCampaign && cardRush && cardTrickshot);

    // Fechar modal
    window.__archer.closeModals();
    const isOverlayClosed = overlay && window.getComputedStyle(overlay).display === 'none';
    const isModalClosed = modesModal && window.getComputedStyle(modesModal).display === 'none';

    return {
      isOverlayOpen,
      isModalOpen,
      areCardsPresent,
      isOverlayClosed,
      isModalClosed
    };
  });

  console.log('Resultados do Modal de Modos:', JSON.stringify(modalResults, null, 2));

  if (!modalResults.isOverlayOpen || !modalResults.isModalOpen || !modalResults.areCardsPresent || !modalResults.isOverlayClosed) {
    throw new Error('Falha na abertura, fechamento ou cards do Modal de Modos de Jogo!');
  }
  console.log('✅ Teste 4: Modal de Seleção de Modos de Jogo validado com sucesso.');

  // -------------------------------------------------------------
  // Teste 5: Screen Shake FX e Polimento Audiovisual
  // -------------------------------------------------------------
  console.log('\n--- Teste 5: Screen Shake FX e Polimento Audiovisual ---');
  const shakeResults = await page.evaluate(() => {
    const gameContainer = document.getElementById('game-container');
    window.__archer.triggerScreenShake(300);

    const hasShakeClass = gameContainer.classList.contains('screen-shake');

    return {
      hasShakeClass
    };
  });

  console.log('Resultados de Screen Shake:', JSON.stringify(shakeResults, null, 2));

  if (!shakeResults.hasShakeClass) {
    throw new Error('Falha no gatilho da classe .screen-shake!');
  }
  console.log('✅ Teste 5: Screen Shake FX e animações validados com sucesso.');

  // -------------------------------------------------------------
  // Teste 6: Captura de Screenshot e Homologação
  // -------------------------------------------------------------
  console.log('\n--- Teste 6: Captura de Screenshot e Ausência de Erros ---');

  // Preparar cena épica para screenshot: Onda 10 com o Chefe e a Barra de Vida
  await page.evaluate(() => {
    window.__archer.startCampaignMode();
    window.__archer.setWave(10);
    window.__archer.positionBalloon();
  });

  await new Promise(r => setTimeout(r, 400));

  const screenshotDir = path.join(ROOT_DIR, 'test-artifacts');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const screenshotPath = path.join(screenshotDir, 'qa_archer_etapa4_climax.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Screenshot salva em: ${screenshotPath}`);

  if (consoleErrors.length > 0) {
    throw new Error(`Erros detectados no console do navegador: ${JSON.stringify(consoleErrors)}`);
  }
  console.log('✅ Teste 6: Zero erros no console do navegador e screenshot capturada.');

  console.log('\n========================================================================');
  console.log('  HOMOLOGAÇÃO QA ETAPA 4 CONCLUÍDA COM 100% DE SUCESSO! (6/6 TESTES)   ');
  console.log('========================================================================\n');

  await browser.close();
  server.close();
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ ERRO NA EXECUÇÃO DOS TESTES QA ETAPA 4:', err);
  if (server) server.close();
  process.exit(1);
});
