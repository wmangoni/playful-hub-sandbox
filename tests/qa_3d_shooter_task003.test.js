const http = require('http');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = 3057;
const BASE_URL = `http://127.0.0.1:${PORT}/3d_shooter`;
const SCREENSHOT = `${__dirname}/3d_shooter_task003_qa_evidence.png`;
const SCREENSHOT2 = `${__dirname}/3d_shooter_task003_qa_evidence_rocket.png`;

let totalPassed = 0;
let totalFailed = 0;

function assert(cond, label) {
  if (cond) {
    totalPassed++;
    console.log(`  ✅ PASS: ${label}`);
  } else {
    totalFailed++;
    console.log(`  ❌ FAIL: ${label}`);
    throw new Error(`Assertion failed: ${label}`);
  }
}

function suite(title) {
  console.log(`\n── ${title} ──`);
}

async function startServer() {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`QA server running on http://127.0.0.1:${PORT}`);
      resolve();
    });
  });
}

async function runTests() {
  console.log('=== STARTING QA SUITE: 3D Shooter TASK_003 (Arsenal, Cyber-Imp, Minimapa) ===');

  const puppeteerModule = await import('puppeteer');
  puppeteer = puppeteerModule.default;

  await startServer();

  browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--autoplay-policy=no-user-gesture-required'
    ]
  });

  page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 768 });

  const pageErrors = [];
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
    console.log(`    [PAGE ERROR] ${err.message}`);
  });

  console.log(`\nNavigating to ${BASE_URL} ...`);
  await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

  // Start the game
  await page.waitForSelector('#startButton');
  await page.click('#startButton');
  await new Promise((r) => setTimeout(r, 800));

  const started = await page.evaluate(() => gameStarted);
  assert(started === true, 'Jogo inicia ao clicar BEGIN CARNAGE (gameStarted === true)');

  // Freeze the game world + deterministic fresh state + manual audio init
  await page.evaluate(() => {
    initializeGame();
    isPaused = true;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(audioContext.destination);
    isAudioInitialized = true;
  });

  // ------------------------------------------------------------------
  suite('1. Arsenal de Armas Avançado — Rifle de Plasma (Arma 3)');
  // ------------------------------------------------------------------
  const plasmaWeapon = await page.evaluate(() => {
    switchWeapon(3);
    const w = player.weapons['plasma'];
    return { current: player.currentWeapon, name: w.name, fireRate: w.fireRate, damage: w.damage, maxAmmo: w.maxAmmo };
  });
  assert(plasmaWeapon.current === 'plasma', `switchWeapon(3) seleciona Plasma Rifle (currentWeapon = ${plasmaWeapon.current})`);
  assert(plasmaWeapon.fireRate === 0.1, `Rifle de Plasma cadência de tiro de 0.1s (fireRate = ${plasmaWeapon.fireRate})`);
  assert(plasmaWeapon.damage === 10, `Rifle de Plasma causa 10 de dano por impacto direto (damage = ${plasmaWeapon.damage})`);

  const plasmaShot = await page.evaluate(() => {
    projectiles = [];
    player.angle = 0; // apontando +X, corredor aberto na linha y=3.5
    player.weapons['plasma'].ammo = 50;
    player.lastShotTimestamp = 0;
    shoot();
    const p = projectiles[0];
    if (!p) return null;
    return {
      owner: p.owner, type: p.type, color: p.color,
      damage: p.damage, radius: p.radius, speed: Math.hypot(p.vx, p.vy),
      x: p.x, y: p.y
    };
  });
  assert(!!plasmaShot, 'Disparo do Plasma cria projeto físil no array global projectiles (não é hitscan)');
  assert(plasmaShot.owner === 'player' && plasmaShot.type === 'plasma', `Projeto físico com owner='player' e type='plasma'`);
  assert(plasmaShot.color === '#00f3ff', `Projétil de plasma com cor neon ciano #00f3ff (got ${plasmaShot.color})`);
  assert(plasmaShot.speed >= 11.5 && plasmaShot.speed <= 12.5, `Projétil de plasma viaja a 12 unidades/s (speed = ${plasmaShot.speed.toFixed(2)})`);
  assert(plasmaShot.damage === 10, `Projétil de plasma aplica 10 de dano no impacto`);
  assert(plasmaShot.radius === 0.15, `Projétil possui raio físico 0.15 (radius = ${plasmaShot.radius})`);

  // Movement over time
  const plasmaMove = await page.evaluate(() => {
    projectiles = [];
    player.angle = 0;
    player.weapons['plasma'].ammo = 50;
    player.lastShotTimestamp = 0;
    shoot();
    const p = projectiles[0];
    const x0 = p.x, y0 = p.y;
    updateProjectiles(0.1);
    const p2 = projectiles.find(q => q.active);
    if (!p2) return { moved: -1 };
    return { moved: Math.hypot(p2.x - x0, p2.y - y0) };
  });
  assert(plasmaMove.moved >= 1.0 && plasmaMove.moved <= 1.4, `Plasma translada fisicamente no loop update(dt) (~1.2u em 0.1s, got ${plasmaMove.moved.toFixed(2)})`);

  // Direct hit deals exactly 10 damage
  const plasmaHit = await page.evaluate(() => {
    const enemy = enemies[0];
    map[3][4] = 0; map[3][5] = 0; // garante corredor livre
    enemy.x = 5.5; enemy.y = 3.5; enemy.state = 'chase';
    enemy.currentHealth = 50;
    projectiles = [];
    spawnProjectile('player', 'plasma', enemy.x, enemy.y, 0, 12, 10, '#00f3ff');
    const before = enemy.currentHealth;
    updateProjectiles(0.05);
    return { before, after: enemy.currentHealth, activeCount: projectiles.filter(q => q.active).length };
  });
  assert(plasmaHit.after === plasmaHit.before - 10, `Impacto direto de plasma reduz exatamente 10 HP do inimigo (${plasmaHit.before} → ${plasmaHit.after})`);
  assert(plasmaHit.activeCount === 0, 'Projétil de plasma é destruído (active=false) após colidir com o inimigo');

  // ------------------------------------------------------------------
  suite('2. Arsenal de Armas Avançado — Lançador de Mísseis (Arma 4)');
  // ------------------------------------------------------------------
  const rocketWeapon = await page.evaluate(() => {
    switchWeapon(4);
    const w = player.weapons['rocket'];
    return { current: player.currentWeapon, name: w.name, fireRate: w.fireRate, damage: w.damage };
  });
  assert(rocketWeapon.current === 'rocket', `switchWeapon(4) seleciona Lançador de Mísseis (currentWeapon = ${rocketWeapon.current})`);
  assert(rocketWeapon.fireRate === 1.2, `Lançador de Mísseis cadência de 1.2s (fireRate = ${rocketWeapon.fireRate})`);
  assert(rocketWeapon.damage === 100, `Míssil dano central de 100 (damage = ${rocketWeapon.damage})`);

  const rocketShot = await page.evaluate(() => {
    projectiles = [];
    player.angle = 0;
    player.weapons['rocket'].ammo = 10;
    player.lastShotTimestamp = 0;
    shoot();
    const p = projectiles[0];
    if (!p) return null;
    return { owner: p.owner, type: p.type, color: p.color, damage: p.damage, speed: Math.hypot(p.vx, p.vy), radius: p.radius };
  });
  assert(!!rocketShot, 'Disparo do míssil cria projétil físico no array global projectiles');
  assert(rocketShot.type === 'rocket' && rocketShot.owner === 'player', 'Projétil físico de tipo rocket e owner=player');
  assert(rocketShot.color === '#ff3300', `Míssil com cor #ff3300 (got ${rocketShot.color})`);
  assert(rocketShot.speed >= 7.5 && rocketShot.speed <= 8.5, `Míssil viaja a 8 unidades/s (speed = ${rocketShot.speed.toFixed(2)})`);

  // Splash damage math (100 * (1 - d/1.8))
  const explosion = await page.evaluate(() => {
    // área livre ao redor de (10.5, 5.5)
    map[4][10] = 0; map[4][11] = 0; map[4][12] = 0;
    map[5][10] = 0; map[5][11] = 0; map[5][12] = 0;
    map[6][10] = 0; map[6][11] = 0; map[6][12] = 0;

    const eA = enemies[0];
    const eB = enemies[1];
    eA.x = 11.0; eA.y = 5.5; eA.state = 'chase'; eA.currentHealth = 500;
    eB.x = 12.0; eB.y = 5.5; eB.state = 'chase'; eB.currentHealth = 500;

    // jogador longe do raio: sem dano de fogo amigo
    player.x = 3.5; player.y = 3.5; player.health = 100;

    particlePool.forEach(p => p.active = false);
    screenShakeIntensity = 0;
    screenShakeTimer = 0;

    const hpA0 = eA.currentHealth;
    const hpB0 = eB.currentHealth;

    explodeRocket(10.5, 5.5);

    const activeParticles = particlePool.filter(p => p.active).length;
    return {
      hpA0, hpA1: eA.currentHealth, dmgA: hpA0 - eA.currentHealth, // d=0.5 → 72
      hpB0, hpB1: eB.currentHealth, dmgB: hpB0 - eB.currentHealth, // d=1.5 → 17
      particles: activeParticles,
      shakeIntensity: screenShakeIntensity,
      shakeTimer: screenShakeTimer,
      playerHealth: player.health
    };
  });
  assert(explosion.dmgA === 72, `Splash Damage central: inimigo a d=0.5 recebe 72 de dano (got ${explosion.dmgA})`);
  assert(explosion.dmgB === 17, `Decaimento linear do dano: inimigo a d=1.5 recebe 17 de dano (got ${explosion.dmgB})`);
  assert(explosion.particles >= 15 && explosion.particles <= 25, `Explosão ejeta 15–25 partículas de fogo/fumaça (got ${explosion.particles})`);
  assert(explosion.shakeIntensity === 15 && Math.abs(explosion.shakeTimer - 0.5) < 0.001, `Explosão dispara Screen Shake forte (15px por 0.5s) (int=${explosion.shakeIntensity}, t=${explosion.shakeTimer})`);
  assert(explosion.playerHealth === 100, 'Jogador fora do raio de 1.8u não sofre dano de fogo amigo');

  // Friendly fire (50% attenuado)
  const friendlyFire = await page.evaluate(() => {
    particlePool.forEach(p => p.active = false);
    player.x = 10.9; player.y = 5.5;
    player.health = 100;
    explodeRocket(10.5, 5.5);
    return { health: player.health, dmg: 100 - player.health }; // d=0.4 → round(38.89) = 39
  });
  assert(friendlyFire.dmg === 39, `Fogo amigo atenuado 50%: jogador a d=0.4 recebe 39 de dano (got ${friendlyFire.dmg})`);
  await page.evaluate(() => { player.health = 100; });

  // Full path: shoot rocket into an enemy → triggers explosion splash in the game loop
  const rocketImpact = await page.evaluate(() => {
    projectiles = [];
    map[3][4] = 0; map[3][5] = 0;
    particlePool.forEach(p => p.active = false);
    screenShakeIntensity = 0; screenShakeTimer = 0;
    const enemy = enemies[0];
    enemy.x = 5.5; enemy.y = 3.5; enemy.state = 'chase'; enemy.currentHealth = 500;
    player.x = 3.5; player.y = 3.5; player.angle = 0;
    player.weapons['rocket'].ammo = 10;
    player.lastShotTimestamp = 0;
    shoot(); // spawns rocket
    for (let i = 0; i < 10 && projectiles.length > 0; i++) {
      updateProjectiles(0.05);
    }
    return {
      remainingProjectiles: projectiles.length,
      enemyHp: enemy.currentHealth,
      shake: screenShakeIntensity
    };
  });
  assert(rocketImpact.remainingProjectiles === 0, 'Míssil detona ao colidir com o inimigo (projétil removido após explosão)');
  assert(rocketImpact.enemyHp < 500, `Míssil com impacto direto + splash danifica o inimigo (HP = ${rocketImpact.enemyHp})`);
  assert(rocketImpact.shake === 15, 'Explosão do míssil no loop de jogo aplica Screen Shake de amplitude 15px');

  // ------------------------------------------------------------------
  suite('3. Inimigo Conjurador à Distância (Cyber-Imp)');
  // ------------------------------------------------------------------
  const impStats = await page.evaluate(() => {
    initializeGame();
    isPaused = true;
    const t = enemyTypes['cyber_imp'];
    return { health: t.health, speed: t.speed, damage: t.damage, color: t.color, count: enemies.filter(e => e.type === 'cyber_imp').length };
  });
  assert(impStats.health === 80, `Cyber-Imp tem HP 80 (got ${impStats.health})`);
  assert(impStats.speed === 1.2, `Cyber-Imp tem velocidade 1.2 (got ${impStats.speed})`);
  assert(impStats.damage === 15, `Projétil do Cyber-Imp causa 15 de dano (got ${impStats.damage})`);
  assert(impStats.color === '#ff00ff', `Cyber-Imp é roxo/magenta neon #ff00ff (got ${impStats.color})`);
  assert(impStats.count === 2, `Mapa inicial contém 2 Cyber-Imps (enemies[6] e enemies[7]) (got ${impStats.count})`);

  // Retreat + ranged attack
  const impRetreat = await page.evaluate(() => {
    initializeGame();
    isPaused = true;
    const imp = enemies.find(e => e.type === 'cyber_imp');
    player.x = 3.5; player.y = 3.5;
    imp.x = 4.5; imp.y = 3.5; // dist = 1.0 (< 4.0 → recua)
    imp.state = 'idle';
    imp.lastAttackTimestamp = Date.now() - 50000; // força ataque à distância
    projectiles = [];
    const d0 = Math.hypot(player.x - imp.x, player.y - imp.y);
    updateCyberImpAI(imp, 0.1);
    const d1 = Math.hypot(player.x - imp.x, player.y - imp.y);
    const p = projectiles[0] || null;
    return {
      d0, d1,
      retreated: d1 > d0,
      projectileType: p && p.type,
      owner: p && p.owner,
      color: p && p.color,
      damage: p && p.damage,
      speed: p ? Math.hypot(p.vx, p.vy) : 0
    };
  });
  assert(impRetreat.retreated === true, `Cyber-Imp recua para manter distância tática de 4–6u (${impRetreat.d0.toFixed(2)} → ${impRetreat.d1.toFixed(2)})`);
  assert(impRetreat.projectileType === 'imp-ball', `Cyber-Imp conjura projétil de energia (type = ${impRetreat.projectileType})`);
  assert(impRetreat.owner === 'enemy', `Projétil inimigo tem owner='enemy'`);
  assert(impRetreat.color === '#ff00ff', `Projétil magenta #ff00ff (got ${impRetreat.color})`);
  assert(impRetreat.damage === 15, `Projétil inimigo causa 15 de dano (got ${impRetreat.damage})`);
  assert(impRetreat.speed >= 4.5 && impRetreat.speed <= 5.5, `Projétil inimigo viaja a 5 unidades/s (speed = ${impRetreat.speed.toFixed(2)})`);

  // Approach when too far
  const impApproach = await page.evaluate(() => {
    initializeGame();
    isPaused = true;
    const imp = enemies.find(e => e.type === 'cyber_imp');
    imp.x = 17.5; imp.y = 6.5;
    player.x = 10.5; player.y = 6.5; // dist = 7.0 (> 6.0 → aproxima)
    imp.lastAttackTimestamp = Date.now() - 1; // não ataca neste tick
    const d0 = Math.hypot(player.x - imp.x, player.y - imp.y);
    updateCyberImpAI(imp, 0.1);
    const d1 = Math.hypot(player.x - imp.x, player.y - imp.y);
    return { d0, d1, closed: d1 < d0 };
  });
  assert(impApproach.closed === true, `Cyber-Imp se aproxima quando jogador está além da distância ótima (${impApproach.d0.toFixed(2)} → ${impApproach.d1.toFixed(2)})`);

  // Imp projectile hits player for 15 damage
  const impHit = await page.evaluate(() => {
    initializeGame();
    isPaused = true;
    player.health = 100;
    projectiles = [];
    spawnProjectile('enemy', 'imp-ball', player.x, player.y, 0, 5.0, 15, '#ff00ff');
    updateProjectiles(0.05);
    return { health: player.health, damageTaken: 100 - player.health };
  });
  assert(impHit.damageTaken === 15, `Projétil do Cyber-Imp inflige 15 de dano ao jogador se não for esquivado (got ${impHit.damageTaken})`);

  // Dodging (strafe lateral) avoids the projectile
  const impDodge = await page.evaluate(() => {
    initializeGame();
    isPaused = true;
    projectiles = [];
    // Corredor aberto na linha y=6.5 (x=9..18)
    player.x = 14.5; player.y = 7.5; // fora da trajetória do projétil
    player.health = 100;
    spawnProjectile('enemy', 'imp-ball', 9.5, 6.5, 0, 5.0, 15, '#ff00ff');
    for (let i = 0; i < 400 && projectiles.length > 0; i++) {
      updateProjectiles(1 / 60);
    }
    const healthAfterDodge = player.health;
    // Agora sem esquivar: jogador na trajetória
    player.health = 100;
    player.x = 14.5; player.y = 6.5;
    spawnProjectile('enemy', 'imp-ball', 9.5, 6.5, 0, 5.0, 15, '#ff00ff');
    for (let i = 0; i < 400 && projectiles.length > 0; i++) {
      updateProjectiles(1 / 60);
    }
    return { healthAfterDodge, healthAfterNoDodge: player.health };
  });
  assert(impDodge.healthAfterDodge === 100, `Esquiva lateral (strafe) desvia o projétil do Cyber-Imp: jogador não sofre dano`);
  assert(impDodge.healthAfterNoDodge === 85, `Sem esquivar, o projétil acerta e o jogador perde 15 HP`);

  // ------------------------------------------------------------------
  suite('4. Minimapa Tático Neon (HUD)');
  // ------------------------------------------------------------------
  const mmInit = await page.evaluate(() => showMinimap);
  assert(mmInit === 1, `Minimapa inicia no modo compacto (showMinimap = ${mmInit})`);

  // Keyboard M cycles 1 → 2 → 0 → 1
  await page.keyboard.press('m');
  const mmAfter1 = await page.evaluate(() => showMinimap);
  await page.keyboard.press('m');
  const mmAfter2 = await page.evaluate(() => showMinimap);
  await page.keyboard.press('m');
  const mmAfter3 = await page.evaluate(() => showMinimap);
  assert(mmAfter1 === 2, `Tecla M alterna compacto → expandido (showMinimap = ${mmAfter1})`);
  assert(mmAfter2 === 0, `Tecla M alterna expandido → desligado (showMinimap = ${mmAfter2})`);
  assert(mmAfter3 === 1, `Tecla M alterna desligado → compacto (showMinimap = ${mmAfter3})`);

  // Expanded mode: pixel sampling (walls ciano, cyber-imp magenta, player amarelo)
  const mmPixels = await page.evaluate(() => {
    showMinimap = 2; // expandido
    initializeGame();
    isPaused = true;
    player.x = 3.5; player.y = 3.5; player.angle = Math.PI * 1.5;
    projectiles = [];
    pickups = [];
    const imp = enemies.find(e => e.type === 'cyber_imp');
    imp.x = 12.5; imp.y = 4.5; imp.state = 'chase';
    enemies.forEach(e => { if (e !== imp) { e.state = 'dead'; } });

    const size = 200, padding = 15;
    const mx = canvas.width - size - padding;
    const my = padding;
    const impRx = Math.floor(mx + imp.x * (size / mapWidth));
    const impRy = Math.floor(my + imp.y * (size / mapHeight));
    const pRx = Math.floor(mx + player.x * (size / mapWidth));
    const pRy = Math.floor(my + player.y * (size / mapHeight));

    renderMinimap();
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const W = canvas.width;

    function hasColor(cx, cy, pred) {
      for (let dx = -5; dx <= 5; dx++) {
        for (let dy = -5; dy <= 5; dy++) {
          const px = cx + dx, py = cy + dy;
          if (px < 0 || py < 0 || px >= W || py >= canvas.height) continue;
          const i = (py * W + px) * 4;
          if (pred(data[i], data[i + 1], data[i + 2])) return true;
        }
      }
      return false;
    }
    const magenta = hasColor(impRx, impRy, (r, g, b) => r > 150 && g < 120 && b > 150);
    const yellow = hasColor(pRx, pRy, (r, g, b) => r > 220 && g > 200 && b < 150);

    return { impRx, impRy, magenta, pRx, pRy, yellow, cx: imp.x, cy: imp.y };
  });
  assert(mmPixels.magenta === true, `Minimapa expandido desenha o Cyber-Imp como ponto magenta #ff00ff nas coordenadas corretas (rx=${mmPixels.impRx}, ry=${mmPixels.impRy})`);
  assert(mmPixels.yellow === true, `Minimapa expandido desenha o jogador como triângulo amarelo #ffeb3b (px=${mmPixels.pRx}, py=${mmPixels.pRy})`);

  // Compact mode draws entities via arc; Off mode skips everything
  const mmArcs = await page.evaluate(() => {
    function countArcs() {
      const ctxObj = ctx;
      const origArc = ctxObj.arc;
      let calls = 0;
      ctxObj.arc = function () { calls++; return origArc.apply(ctxObj, arguments); };
      renderMinimap();
      ctxObj.arc = origArc;
      return calls;
    }
    const compact = (() => { showMinimap = 1; initializeGame(); isPaused = true; return countArcs(); })();
    const off = (() => { showMinimap = 0; return countArcs(); })();
    return { compact, off };
  });
  assert(mmArcs.compact >= 1, `Modo compacto desenha entidades no radar (arc draws = ${mmArcs.compact})`);
  assert(mmArcs.off === 0, `Modo desligado não desenha o minimapa (arc draws = ${mmArcs.off})`);

  // Integrated render stability across all 3 modes
  const renderStable = await page.evaluate(() => {
    const modes = [1, 2, 0, 1];
    const results = modes.map((m) => {
      showMinimap = m;
      try {
        render();
        return true;
      } catch (e) {
        return false;
      }
    });
    return results;
  });
  assert(renderStable.every(Boolean), 'Renderização integrada do jogo estável nos modos compacto, expandido e desligado');

  // ------------------------------------------------------------------
  suite('5. Síntese de Áudio via Web Audio API');
  // ------------------------------------------------------------------
  const audioSynth = await page.evaluate(() => {
    let oscCount = 0, bufCount = 0, filterCount = 0;
    const _osc = audioContext.createOscillator.bind(audioContext);
    audioContext.createOscillator = function () { oscCount++; return _osc(); };
    const _buf = audioContext.createBuffer.bind(audioContext);
    audioContext.createBuffer = function () { bufCount++; return _buf.apply(audioContext, arguments); };
    const _filter = audioContext.createBiquadFilter.bind(audioContext);
    audioContext.createBiquadFilter = function () { filterCount++; return _filter.apply(audioContext, arguments); };

    playPlasmaLaserSound();
    const afterPlasma = oscCount;
    playRocketLaunchSound();
    const afterRocket = oscCount;
    playImpCastSound();
    const afterImpCast = oscCount;
    playExplosionSound();
    return {
      oscillators: oscCount,
      buffers: bufCount,
      filters: filterCount
    };
  });
  assert(audioSynth.oscillators === 3, 'playPlasmaLaserSound()/playRocketLaunchSound()/playImpCastSound() sintetizam 3 osciladores Web Audio (sawtooth/triangle/sine)');
  assert(audioSynth.buffers === 1 && audioSynth.filters === 1, 'playExplosionSound() gera estrondo com ruído branco (createBuffer) + filtro passa-baixa (createBiquadFilter) (buffers=' + audioSynth.buffers + ', filters=' + audioSynth.filters + ')');

  // ------------------------------------------------------------------
  suite('6. Munições de Plasma e Mísseis (Pickups) & Screenshot');
  // ------------------------------------------------------------------
  const pickupsInfo = await page.evaluate(() => {
    initializeGame();
    isPaused = true;
    const pPlasma = pickups.find(p => p.target === 'ammo_plasma');
    const pRocket = pickups.find(p => p.target === 'ammo_rocket');
    return {
      hasPlasma: !!pPlasma,
      plasmaColor: pPlasma && pPlasma.color,
      plasmaAmount: pPlasma && pPlasma.amount,
      hasRocket: !!pRocket,
      rocketColor: pRocket && pRocket.color,
      rocketAmount: pRocket && pRocket.amount
    };
  });
  assert(pickupsInfo.hasPlasma === true, 'Pickup de munição de Plasma (tipo 7) presente no mapa (scanMapForPickups)');
  assert(pickupsInfo.plasmaColor === '#00f3ff', `Munição de Plasma com cor #00f3ff (got ${pickupsInfo.plasmaColor})`);
  assert(pickupsInfo.hasRocket === true, 'Pickup de munição de Mísseis (tipo 8) presente no mapa (scanMapForPickups)');
  assert(pickupsInfo.rocketColor === '#ff3300', `Munição de Mísseis com cor #ff3300 (got ${pickupsInfo.rocketColor})`);

  const pickupCollect = await page.evaluate(() => {
    initializeGame();
    isPaused = true;
    const before = pickups.filter(p => p.target === 'ammo_plasma').length;
    const pPlasma = pickups.find(p => p.target === 'ammo_plasma');
    const tpx = pPlasma.x, tpy = pPlasma.y;
    player.x = pPlasma.x; player.y = pPlasma.y;
    player.weapons['plasma'].ammo = 0;
    const ammoBefore = player.weapons['plasma'].ammo;
    updatePickups(0.016);
    const after = pickups.filter(p => p.target === 'ammo_plasma').length;
    const removed = !pickups.find(p => p.target === 'ammo_plasma' && p.x === tpx && p.y === tpy);
    return { ammoBefore, ammoAfter: player.weapons['plasma'].ammo, removed, before, after };
  });
  assert(pickupCollect.ammoAfter === pickupCollect.ammoBefore + 30, `Coleta de munição Plasma adiciona 30 cartuchos (${pickupCollect.ammoBefore} → ${pickupCollect.ammoAfter})`);
  assert(pickupCollect.removed === true, 'Pickup coletado é removido do mapa (os demais pickups de mesma munição permanecem)');

  // --- Evidence screenshots (expanded minimap w/ rocket; compact minimap w/ plasma) ---
  await page.evaluate(() => {
    initializeGame();
    isPaused = true;
    showMinimap = 2;
    player.x = 3.5; player.y = 3.5; player.angle = Math.PI * 1.5;
    switchWeapon(4);
    player.weapons['rocket'].ammo = 10;
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: SCREENSHOT, fullPage: false });
  console.log(`  📸 Screenshot 1 salva: ${SCREENSHOT}`);

  await page.evaluate(() => {
    showMinimap = 1;
    switchWeapon(3);
    player.weapons['plasma'].ammo = 50;
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: SCREENSHOT2, fullPage: false });
  console.log(`  📸 Screenshot 2 salva: ${SCREENSHOT2}`);

  assert(pageErrors.length === 0, `Nenhum erro fatal no console do navegador durante a execução (pageErrors = ${pageErrors.length})`);

  console.log('\n==========================================================');
  console.log(`🎉 RESULTADO FINAL: ${totalPassed} PASS / ${totalFailed} FAIL`);
  console.log('==========================================================');
  if (totalFailed > 0) {
    throw new Error(`${totalFailed} assertion(s) falharam`);
  }
}

(async () => {
  try {
    await runTests();
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ QA SUITE FALHOU: ${err.message}`);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }
})();