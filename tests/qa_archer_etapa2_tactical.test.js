/**
 * QA TEST SUITE - THE ARCHER: ETAPA 2 (VARIEDADE DE BALÕES TÁTICOS)
 * Validação automatizada via Puppeteer:
 * 1. Balão TNT: explosão em área, +2 alvos na onda, ricochete em obstáculos.
 * 2. Balão de Gelo: congelamento temporal (4.5s), paralisação de obstáculos e anulação do vento.
 * 3. Balão Blindado: resistência de 2 HP com feedback visual de armadura trincada e derretimento por flecha de fogo.
 * 4. Balão Caveira (Armadilha): penalidade de -2 flechas e quebra de combo.
 * 5. Síntese sonora procedural dos novos efeitos (Explosion, Freeze, Metal Hit, Penalty).
 * 6. Ausência de erros no console do navegador e captura de screenshot.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const PORT = 3096;
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
  console.log(`  QA TEST SUITE - THE ARCHER: ETAPA 2 (BALÕES TÁTICOS)`);
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
  // Teste 1: Balão TNT (Explosão em Área e Contagem Bônus de Alvos)
  // -------------------------------------------------------------
  console.log('\n--- Teste 1: Balão TNT (Explosão, Efeito Visual e Destruição Dupla) ---');
  const tntResults = await page.evaluate(() => {
    window.__archer.initGame();
    window.__archer.setBalloonType('tnt');

    const balloonEl = document.getElementById('balloon');
    const hasTntClass = balloonEl.classList.contains('tnt');
    const hasBombIcon = balloonEl.innerHTML.includes('💣');
    const stateBefore = window.__archer.getState();

    // Dispara flecha mirando no centro do balão TNT
    const targetX = window.__archer.balloonData.x;
    const targetY = window.__archer.balloonData.y + 15;
    window.__archer.spawnArrowAt(targetX - 20, targetY, 15, 0, 'normal');
    window.__archer.step(2);

    return {
      hasTntClass,
      hasBombIcon,
      initialWaveTargetsPopped: stateBefore.waveTargetsPopped
    };
  });

  // Aguarda processamento do frame
  await new Promise(r => setTimeout(r, 60));

  const tntAfter = await page.evaluate(() => {
    const state = window.__archer.getState();
    return {
      waveTargetsPopped: state.waveTargetsPopped,
      score: state.score,
      scoreIncreased: state.score >= 250
    };
  });

  console.log('Resultados do Balão TNT:', JSON.stringify({ ...tntResults, ...tntAfter }, null, 2));

  if (!tntResults.hasTntClass || !tntResults.hasBombIcon) {
    throw new Error('Falha no balão TNT: classe CSS ou ícone de bomba ausente.');
  }
  if (tntAfter.waveTargetsPopped < 2) {
    throw new Error(`Falha no balão TNT: explosão deveria contar múltiplos alvos (obtido: ${tntAfter.waveTargetsPopped}).`);
  }
  if (!tntAfter.scoreIncreased) {
    throw new Error('Falha no balão TNT: pontuação de explosão não foi computada corretamente.');
  }
  console.log('✅ Teste 1: Balão TNT com explosão e área de destruição validado com sucesso.');

  // -------------------------------------------------------------
  // Teste 2: Balão de Gelo (Congelamento Temporal, Vento Zero e Paralisação)
  // -------------------------------------------------------------
  console.log('\n--- Teste 2: Balão de Gelo (Congelamento Temporal & Vento Zero) ---');
  const iceResults = await page.evaluate(() => {
    window.__archer.initGame();
    window.__archer.setBalloonType('ice');

    const balloonEl = document.getElementById('balloon');
    const hasIceClass = balloonEl.classList.contains('ice');
    const hasSnowIcon = balloonEl.innerHTML.includes('❄️');

    // Dispara no balão de gelo
    const targetX = window.__archer.balloonData.x;
    const targetY = window.__archer.balloonData.y + 15;
    window.__archer.spawnArrowAt(targetX - 20, targetY, 15, 0, 'normal');
    window.__archer.step(2);

    return { hasIceClass, hasSnowIcon };
  });

  await new Promise(r => setTimeout(r, 60));

  const freezeState = await page.evaluate(() => {
    const state = window.__archer.getState();
    const container = document.getElementById('game-container');
    const isFrozenClass = container.classList.contains('frozen-active');
    const windText = document.getElementById('wind-val').textContent;

    // Guarda posições dos obstáculos sob congelamento
    const cloudX1 = window.__archer.stormCloud.x;
    const shieldAngle1 = window.__archer.woodenShield.angle;

    return {
      isFrozenState: state.isFrozen,
      isFrozenClass,
      windText,
      physicalWindSpeed: state.windSpeed,
      cloudX1,
      shieldAngle1
    };
  });

  // Aguarda 200ms para verificar que obstáculos não se moveram
  await new Promise(r => setTimeout(r, 200));

  const freezeMovementCheck = await page.evaluate((initial) => {
    const cloudX2 = window.__archer.stormCloud.x;
    const shieldAngle2 = window.__archer.woodenShield.angle;

    // Descongela para testar restauração
    window.__archer.deactivateFreezeTime();
    const stateAfterUnfreeze = window.__archer.getState();

    return {
      obstaclesStationary: (initial.cloudX1 === cloudX2 && initial.shieldAngle1 === shieldAngle2),
      unfreezeWorked: !stateAfterUnfreeze.isFrozen
    };
  }, freezeState);

  console.log('Resultados do Balão de Gelo:', JSON.stringify({ ...iceResults, ...freezeState, ...freezeMovementCheck }, null, 2));

  if (!iceResults.hasIceClass || !iceResults.hasSnowIcon) {
    throw new Error('Falha no balão de gelo: classe CSS ou ícone ausente.');
  }
  if (!freezeState.isFrozenState || !freezeState.isFrozenClass) {
    throw new Error('Falha no congelamento temporal: estado isFrozen ou classe CSS frozen-active ausente.');
  }
  if (!freezeState.windText.includes('0.0') || freezeState.physicalWindSpeed !== 0) {
    throw new Error(`Falha no vento congelado: texto esperado 0.0 (${freezeState.windText}), physicalWindSpeed esperado 0 (${freezeState.physicalWindSpeed})`);
  }
  if (!freezeMovementCheck.obstaclesStationary) {
    throw new Error('Falha: obstáculos continuaram se movendo durante o congelamento temporal!');
  }
  if (!freezeMovementCheck.unfreezeWorked) {
    throw new Error('Falha ao descongelar tempo.');
  }
  console.log('✅ Teste 2: Balão de Gelo e congelamento temporal validados com sucesso.');

  // -------------------------------------------------------------
  // Teste 3: Balão Blindado (Armadura 2 HP & Flecha de Fogo One-Shot)
  // -------------------------------------------------------------
  console.log('\n--- Teste 3: Balão Blindado (2 HP com Rachadura & Flecha de Fogo) ---');
  const armoredHit1 = await page.evaluate(() => {
    window.__archer.initGame();
    window.__archer.setBalloonType('armored');

    const balloonEl = document.getElementById('balloon');
    const hasArmoredClass = balloonEl.classList.contains('armored');
    const badgeEl = document.getElementById('balloon-hp-badge');
    const initialBadgeText = badgeEl ? badgeEl.textContent : '';

    // Primeiro tiro: flecha normal (deve subtrair 1 HP e sobreviver)
    const targetX = window.__archer.balloonData.x;
    const targetY = window.__archer.balloonData.y + 15;
    window.__archer.spawnArrowAt(targetX - 20, targetY, 15, 0, 'normal');
    window.__archer.step(2);

    return {
      hasArmoredClass,
      initialBadgeText
    };
  });

  await new Promise(r => setTimeout(r, 60));

  const armoredAfterHit1 = await page.evaluate(() => {
    const balloonEl = document.getElementById('balloon');
    const badgeEl = document.getElementById('balloon-hp-badge');
    const state = window.__archer.getState();

    const balloonStillVisible = balloonEl.style.display !== 'none';
    const isDamaged = balloonEl.classList.contains('damaged');
    const hpAfterHit = state.balloonHp;
    const badgeAfterHit = badgeEl ? badgeEl.textContent : '';

    return {
      balloonStillVisible,
      isDamaged,
      hpAfterHit,
      badgeAfterHit
    };
  });

  console.log('Resultado do 1º impacto no Balão Blindado:', JSON.stringify({ ...armoredHit1, ...armoredAfterHit1 }, null, 2));

  if (armoredAfterHit1.hpAfterHit !== 1 || armoredAfterHit1.badgeAfterHit !== '1') {
    throw new Error(`Falha no balão blindado: HP não reduziu para 1 após primeiro acerto (HP: ${armoredAfterHit1.hpAfterHit}).`);
  }
  if (!armoredAfterHit1.balloonStillVisible || !armoredAfterHit1.isDamaged) {
    throw new Error('Falha no balão blindado: deveria permanecer visível com classe damaged.');
  }

  // Segundo tiro no mesmo balão: flecha normal deve destruir
  await page.evaluate(() => {
    const targetX = window.__archer.balloonData.x;
    const targetY = window.__archer.balloonData.y + 15;
    window.__archer.spawnArrowAt(targetX - 20, targetY, 15, 0, 'normal');
    window.__archer.step(2);
  });

  await new Promise(r => setTimeout(r, 60));

  const armoredAfterHit2 = await page.evaluate(() => {
    const balloonEl = document.getElementById('balloon');
    const state = window.__archer.getState();
    return {
      balloonPopped: balloonEl.style.display === 'none',
      scoreGained: state.score >= 220
    };
  });

  if (!armoredAfterHit2.balloonPopped) {
    throw new Error('Falha no balão blindado: deveria ter sido destruído no 2º impacto.');
  }
  console.log('✅ Balão blindado destruído no 2º impacto conforme esperado.');

  // Teste de Flecha de Fogo: One-shot em Balão Blindado (derretimento instantâneo)
  await page.evaluate(() => {
    window.__archer.initGame();
    window.__archer.setBalloonType('armored');
    window.__archer.selectArrowType('fire');

    const targetX = window.__archer.balloonData.x;
    const targetY = window.__archer.balloonData.y + 15;
    window.__archer.spawnArrowAt(targetX - 20, targetY, 15, 0, 'fire');
    window.__archer.step(2);
  });

  await new Promise(r => setTimeout(r, 60));

  const fireOneShotResult = await page.evaluate(() => {
    const balloonEl = document.getElementById('balloon');
    return {
      poppedInstantly: balloonEl.style.display === 'none'
    };
  });

  console.log('Resultado da Flecha de Fogo no Balão Blindado:', fireOneShotResult);
  if (!fireOneShotResult.poppedInstantly) {
    throw new Error('Falha: flecha de fogo deveria derreter o balão blindado instantaneamente (1 hit)!');
  }
  console.log('✅ Teste 3: Balão Blindado com 2 HP e derretimento por Flecha de Fogo validado.');

  // -------------------------------------------------------------
  // Teste 4: Balão Caveira / Armadilha (-2 Flechas & Quebra de Combo)
  // -------------------------------------------------------------
  console.log('\n--- Teste 4: Balão Caveira (Penalidade de -2 Flechas & Quebra de Combo) ---');
  const skullResults = await page.evaluate(() => {
    window.__archer.initGame();
    const state1 = window.__archer.getState();
    const initialArrows = state1.arrowsLeft; // 5

    window.__archer.setBalloonType('skull');

    const balloonEl = document.getElementById('balloon');
    const hasSkullClass = balloonEl.classList.contains('skull');
    const hasSkullIcon = balloonEl.innerHTML.includes('☠️');

    // Atira no balão de caveira
    const targetX = window.__archer.balloonData.x;
    const targetY = window.__archer.balloonData.y + 15;
    window.__archer.spawnArrowAt(targetX - 20, targetY, 15, 0, 'normal');
    window.__archer.step(2);

    return {
      hasSkullClass,
      hasSkullIcon,
      initialArrows
    };
  });

  await new Promise(r => setTimeout(r, 120));

  const skullAfter = await page.evaluate(() => {
    const state = window.__archer.getState();
    return {
      arrowsLeft: state.arrowsLeft,
      comboStreak: state.comboStreak
    };
  });

  console.log('Resultados do Balão Caveira:', JSON.stringify({ ...skullResults, ...skullAfter }, null, 2));

  if (!skullResults.hasSkullClass || !skullResults.hasSkullIcon) {
    throw new Error('Falha no balão caveira: classe CSS ou ícone ausente.');
  }
  // 5 iniciais - penalidade de 2 = 3 flechas restantes
  if (skullAfter.arrowsLeft !== 3) {
    throw new Error(`Falha na penalidade do balão caveira: esperado 3 flechas restantes, obtido: ${skullAfter.arrowsLeft}`);
  }
  if (skullAfter.comboStreak !== 0) {
    throw new Error('Falha no balão caveira: combo streak deveria ter sido zerado.');
  }
  console.log('✅ Teste 4: Balão Caveira com penalidade severa de -2 flechas validado.');

  // -------------------------------------------------------------
  // Teste 5: Procedural Audio Synthesis para Efeitos Táticos
  // -------------------------------------------------------------
  console.log('\n--- Teste 5: Síntese de Efeitos Sonoros Táticos ---');
  const audioCheck = await page.evaluate(() => {
    try {
      window.__archer.playExplosionSound();
      window.__archer.playFreezeSound();
      window.__archer.playMetalHitSound();
      window.__archer.playPenaltySound();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.toString() };
    }
  });

  if (!audioCheck.success) {
    throw new Error(`Falha nos efeitos sonoros táticos: ${audioCheck.error}`);
  }
  console.log('✅ Teste 5: Síntese de áudio procedural para todos os balões táticos validada.');

  // -------------------------------------------------------------
  // Teste 6: Ausência de Erros no Console
  // -------------------------------------------------------------
  console.log('\n--- Teste 6: Ausência de Erros de Execução no Console ---');
  if (consoleErrors.length > 0) {
    throw new Error(`Erros detectados no console do navegador: ${consoleErrors.join(' | ')}`);
  }
  console.log('✅ Teste 6: 0 erros detectados no console.');

  // Screenshot de evidência
  const evidencePath = path.join(ROOT_DIR, 'tests', 'archer_etapa2_tactical_evidence.png');
  await page.screenshot({ path: evidencePath });
  console.log(`\n📸 Screenshot de evidência capturada em: ${evidencePath}`);

  await browser.close();
  server.close();

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DA ETAPA 2 PASSARAM COM SUCESSO!');
  console.log('===============================================================');
}

runTests().catch(err => {
  console.error('\n❌ ERRO NA EXECUÇÃO DOS TESTES:', err);
  if (server.listening) server.close();
  process.exit(1);
});
