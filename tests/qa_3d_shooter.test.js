const http = require('http');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = 3002;

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
  console.log('--- STARTING QA TEST SUITE FOR 3D SHOOTER ---');
  
  // Dynamic import of ESM Puppeteer in CommonJS environment
  console.log('Loading puppeteer (ESM)...');
  const puppeteerModule = await import('puppeteer');
  puppeteer = puppeteerModule.default;
  
  await startServer();
  
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  page = await browser.newPage();
  
  // Capturar logs do console do navegador para nos ajudar no debug
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('Starting game') || msg.text().includes('Setting up') || msg.text().includes('HIT')) {
      console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
    }
  });

  // Acessar o jogo
  console.log('Navigating to 3D Shooter game page...');
  await page.goto(`http://127.0.0.1:${PORT}/3d_shooter`, { waitUntil: 'networkidle2' });
  
  // 1. Verificar se a tela inicial está visível e clicar para iniciar o jogo
  console.log('Verifying start screen and clicking "BEGIN CARNAGE"...');
  const startButton = await page.$('#startButton');
  if (!startButton) {
    throw new Error('Start button not found on the screen');
  }
  
  await page.click('#startButton');
  
  // Esperar o jogo iniciar e inicializar as variáveis
  await new Promise(r => setTimeout(r, 1000));
  
  // Verificar se o estado do jogo foi inicializado
  const isStarted = await page.evaluate(() => gameStarted);
  console.log(`Is game started? ${isStarted}`);
  if (!isStarted) {
    throw new Error('Game did not start successfully');
  }

  // 2. Testar Muzzle Flash (Clarão do Disparo)
  console.log('\n--- 1. Testing Muzzle Flash (Discharge Glow) ---');
  
  // Garantir estado limpo para o teste
  await page.evaluate(() => {
    player.muzzleFlashTimer = 0;
    particlePool.forEach(p => p.active = false);
  });
  
  // Inicialmente o muzzleFlashTimer deve ser 0
  const initialMuzzleTimer = await page.evaluate(() => player.muzzleFlashTimer);
  console.log(`Initial muzzle flash timer: ${initialMuzzleTimer}`);
  if (initialMuzzleTimer !== 0) {
    throw new Error('Muzzle flash timer should be 0 initially');
  }
  
  // Disparar a arma chamando a função shoot() do jogo diretamente
  console.log('Calling shoot() function directly...');
  await page.evaluate(() => shoot());
  
  // Imediatamente ler o muzzleFlashTimer (deve ser > 0, especificamente 0.05)
  const activeMuzzleTimer = await page.evaluate(() => player.muzzleFlashTimer);
  console.log(`Active muzzle flash timer right after shot: ${activeMuzzleTimer}`);
  if (activeMuzzleTimer <= 0) {
    throw new Error('Muzzle flash was not triggered on weapon discharge');
  }
  
  // Avançar o tempo programaticamente em 100ms via update(0.1)
  console.log('Avançando o clock do motor do jogo manualmente em 100ms via update(0.1)...');
  await page.evaluate(() => update(0.1));
  
  const postMuzzleTimer = await page.evaluate(() => player.muzzleFlashTimer);
  console.log(`Muzzle flash timer after update(0.1): ${postMuzzleTimer}`);
  if (postMuzzleTimer !== 0) {
    throw new Error('Muzzle flash did not auto-expire after 2-3 frames');
  }
  console.log('✅ PASS: Muzzle Flash triggers and expires correctly within 2-3 frames.');

  // 3. Testar Sistema de Partículas de Impacto na Parede
  console.log('\n--- 2. Testing Wall Impact Particles (Yellow Sparks) ---');
  
  // Garantir isolamento limpando o pool de partículas antes do teste
  await page.evaluate(() => {
    particlePool.forEach(p => p.active = false);
    player.lastShotTimestamp = 0;
  });
  
  // Verificar se há partículas ativas antes do tiro
  const activeParticlesBefore = await page.evaluate(() => 
    particlePool.filter(p => p.active).length
  );
  console.log(`Active particles before wall shot: ${activeParticlesBefore}`);
  if (activeParticlesBefore !== 0) {
    throw new Error('There should be no active particles before shooting');
  }
  
  // Atirar na parede chamando shoot() diretamente
  console.log('Calling shoot() directly at the wall...');
  await page.evaluate(() => shoot());
  
  // Ler partículas ativas e suas cores logo após o tiro
  const wallParticlesInfo = await page.evaluate(() => {
    const active = particlePool.filter(p => p.active);
    return {
      count: active.length,
      colors: active.map(p => ({ r: p.r, g: p.g, b: p.b }))
    };
  });
  
  console.log(`Active particles immediately after wall shot: ${wallParticlesInfo.count}`);
  if (wallParticlesInfo.count < 8 || wallParticlesInfo.count > 15) {
    throw new Error(`Wall impact should produce between 8 and 15 particles, got: ${wallParticlesInfo.count}`);
  }
  
  // Verificar se as cores correspondem às faíscas amarelas/laranjas/brancas de parede:
  // '#FFFFDD' (255, 255, 221), '#FFA500' (255, 165, 0), '#FF4500' (255, 69, 0)
  const isYellowOrOrange = wallParticlesInfo.colors.every(c => 
    c.r === 255 && (c.g === 255 || c.g === 165 || c.g === 69)
  );
  console.log(`Are wall particles yellow/orange/white sparks? ${isYellowOrOrange}`);
  if (!isYellowOrOrange) {
    throw new Error('Wall particles do not match expected yellow/orange/white colors');
  }
  
  // Avançar o tempo manualmente chamando update(0.5) duas vezes para decair as partículas (vida útil total < 1s)
  console.log('Avançando o clock do motor em 1 segundo (update(0.5) x2)...');
  await page.evaluate(() => {
    update(0.5);
    update(0.5);
  });
  
  const activeParticlesAfterWall = await page.evaluate(() => 
    particlePool.filter(p => p.active).length
  );
  console.log(`Active particles 1 second after wall shot: ${activeParticlesAfterWall}`);
  if (activeParticlesAfterWall !== 0) {
    throw new Error('Particles did not fade out and deactivate after their lifetime');
  }
  console.log('✅ PASS: Wall impact produces 8-15 yellow/orange spark particles that fade out correctly.');

  // 4. Testar Sistema de Partículas de Impacto no Inimigo (Sangue Vermelho)
  console.log('\n--- 3. Testing Enemy Impact Particles (Red Blood) ---');
  
  // Garantir isolamento
  await page.evaluate(() => {
    particlePool.forEach(p => p.active = false);
  });
  
  // Teletransportar o primeiro inimigo para a frente do jogador
  // E IMPORTANTE: limpar a parede da célula map[2][3] definindo-a como 0
  // para que o inimigo não fique oculto/obstruído dentro da parede pelo raycast!
  console.log('Teleporting an enemy directly in front of the player (3.5, 2.5) and removing wall block map[2][3]...');
  const enemyGeometry = await page.evaluate(() => {
    map[2][3] = 0; // Desativa a parede na célula de colisão do raycast
    
    const enemy = enemies[0];
    enemy.x = 3.5;
    enemy.y = 2.5; // Entre o jogador (3.5, 3.5) e a parede de fora
    enemy.currentHealth = 50;
    enemy.state = 'chase';
    
    // Recalcular as distâncias e ângulos de todos os sprites
    renderSprites();
    
    return {
      x: enemy.x,
      y: enemy.y,
      dist: enemy.dist,
      angle: enemy.angle,
      isVisible: enemy.isVisible,
      playerX: player.x,
      playerY: player.y,
      playerAngle: player.angle
    };
  });
  
  console.log('Enemy Geometry:', enemyGeometry);
  
  // Resetar timers de disparo para evitar rate-limit interno do jogo
  await page.evaluate(() => {
    player.lastShotTimestamp = 0;
  });
  
  // Atirar no inimigo
  console.log('Calling shoot() directly at the enemy...');
  await page.evaluate(() => shoot());
  
  // Ler partículas de sangue logo após o tiro
  const enemyParticlesInfo = await page.evaluate(() => {
    const active = particlePool.filter(p => p.active);
    return {
      count: active.length,
      colors: active.map(p => ({ r: p.r, g: p.g, b: p.b }))
    };
  });
  
  console.log(`Active particles immediately after enemy shot: ${enemyParticlesInfo.count}`);
  console.log('Colors generated:', enemyParticlesInfo.colors);
  
  if (enemyParticlesInfo.count < 10 || enemyParticlesInfo.count > 18) {
    throw new Error(`Enemy impact should produce between 10 and 18 particles, got: ${enemyParticlesInfo.count}`);
  }
  
  // Verificar se as cores são predominantemente vermelhas de sangue de grunt/demon:
  // '#8B0000' (139, 0, 0), '#B22222' (178, 34, 34), '#FF0000' (255, 0, 0)
  const isRedBlood = enemyParticlesInfo.colors.every(c => 
    (c.r === 139 || c.r === 178 || c.r === 255) && (c.g === 0 || c.g === 34) && (c.b === 0 || c.b === 34)
  );
  console.log(`Are enemy particles red blood? ${isRedBlood}`);
  if (!isRedBlood) {
    throw new Error('Enemy particles do not match expected red blood color');
  }
  
  // Avançar o tempo manualmente chamando update(0.5) duas vezes para desativar as partículas
  console.log('Avançando o clock do motor em 1 segundo (update(0.5) x2)...');
  await page.evaluate(() => {
    update(0.5);
    update(0.5);
  });
  
  const activeParticlesAfterEnemy = await page.evaluate(() => 
    particlePool.filter(p => p.active).length
  );
  console.log(`Active particles 1 second after enemy shot: ${activeParticlesAfterEnemy}`);
  if (activeParticlesAfterEnemy !== 0) {
    throw new Error('Enemy blood particles did not fade out and deactivate');
  }
  console.log('✅ PASS: Enemy impact produces 10-18 red blood particles that fade out correctly.');

  // Restaura a parede após o teste
  await page.evaluate(() => {
    map[2][3] = 2;
  });

  // 5. Testar Object Pooling (Reutilização de Partículas)
  console.log('\n--- 4. Testing Object Pooling ---');
  
  // Garantir isolamento
  await page.evaluate(() => {
    particlePool.forEach(p => p.active = false);
  });
  
  // Verificar se o tamanho do pool de partículas permanece fixo
  const poolSize = await page.evaluate(() => particlePool.length);
  console.log(`Particle pool size: ${poolSize}`);
  if (poolSize !== 250) {
    throw new Error(`Particle pool size should be constant at 250 (since OPTIMIZE_MODE=1), got: ${poolSize}`);
  }
  
  // Disparar várias vezes seguidas rapidamente para forçar alta quantidade de partículas ativas
  console.log('Firing multiple times rapidly with shoot()...');
  for (let i = 0; i < 15; i++) {
    await page.evaluate(() => {
      player.lastShotTimestamp = 0; // Ignorar fireRate rate limit para fins de teste
      shoot();
    });
  }
  
  const poolSizeAfterRapidFire = await page.evaluate(() => particlePool.length);
  console.log(`Particle pool size after rapid fire: ${poolSizeAfterRapidFire}`);
  if (poolSizeAfterRapidFire !== 250) {
    throw new Error('Particle pool size changed! Object pooling is not working correctly.');
  }
  console.log('✅ PASS: Particle pool size remains constant, demonstrating robust Object Pooling.');

  // 6. Testar Otimização em Performance Máxima (OPTIMIZE_MODE = 2)
  console.log('\n--- 5. Testing Performance Max Mode (OPTIMIZE_MODE = 2) ---');
  
  // Garantir isolamento
  await page.evaluate(() => {
    particlePool.forEach(p => p.active = false);
  });
  
  // Alterar o modo de otimização em tempo real no navegador
  console.log('Setting OPTIMIZE_MODE = 2 in real-time...');
  await page.evaluate(() => {
    OPTIMIZE_MODE = 2; // Configura o modo de otimização máxima no motor
    // Reduz o pool para simular o limite físico de 50 partículas
    particlePool = particlePool.slice(0, 50);
  });
  
  const optimizedPoolSize = await page.evaluate(() => particlePool.length);
  console.log(`Optimized pool size: ${optimizedPoolSize}`);
  if (optimizedPoolSize !== 50) {
    throw new Error('Failed to simulate optimized pool size of 50');
  }
  
  // Teletransportar o inimigo e atirar no modo otimizado
  await page.evaluate(() => {
    map[2][3] = 0; // Remove a parede de novo
    const enemy = enemies[0];
    enemy.x = 3.5;
    enemy.y = 2.5;
    enemy.currentHealth = 50;
    player.lastShotTimestamp = 0;
    renderSprites();
  });
  
  console.log('Firing at enemy in OPTIMIZE_MODE = 2...');
  await page.evaluate(() => shoot());
  
  const optimizedParticlesInfo = await page.evaluate(() => {
    const active = particlePool.filter(p => p.active);
    return {
      count: active.length
    };
  });
  
  console.log(`Active particles on enemy impact in OPTIMIZE_MODE = 2: ${optimizedParticlesInfo.count}`);
  if (optimizedParticlesInfo.count < 3 || optimizedParticlesInfo.count > 5) {
    throw new Error(`Impact in OPTIMIZE_MODE=2 should produce between 3 and 5 particles, got: ${optimizedParticlesInfo.count}`);
  }
  console.log('✅ PASS: Impact in OPTIMIZE_MODE = 2 generates reduced particles (3 to 5), complying with performance guidelines.');

  // 6. Testar Vitória (Eliminação de todos os monstros)
  console.log('\n--- 6. Testing Victory Condition (Eliminating all enemies) ---');
  
  // Definir vida de todos os inimigos como 0, e estado como dying com timer pequeno para que morram imediatamente
  await page.evaluate(() => {
    enemies.forEach(enemy => {
      enemy.currentHealth = 0;
      enemy.state = 'dying';
      enemy.dyingTimer = 0.05;
    });
  });
  
  // Avançar o tempo manualmente chamando update(0.1) para processar a morte de todos
  console.log('Avançando o clock do motor em 100ms via update(0.1) para processar mortes...');
  await page.evaluate(() => {
    update(0.1);
  });
  
  // Verificar se isVictory é true
  const isVictoryActive = await page.evaluate(() => isVictory);
  console.log(`Is victory state active? ${isVictoryActive}`);
  if (!isVictoryActive) {
    throw new Error('Victory state was not triggered after all enemies died');
  }
  
  // Verificar se o overlay de vitória está com a classe 'show'
  const victoryScreenVisible = await page.evaluate(() => {
    const el = document.getElementById('victoryScreen');
    return el && el.classList.contains('show');
  });
  console.log(`Is victory overlay visible? ${victoryScreenVisible}`);
  if (!victoryScreenVisible) {
    throw new Error('Victory screen overlay is not visible');
  }
  console.log('✅ PASS: Victory condition triggers victory state and displays victory screen overlay correctly.');

  // Restaura a parede e o OPTIMIZE_MODE no fim de tudo
  await page.evaluate(() => {
    map[2][3] = 2;
    OPTIMIZE_MODE = 1;
  });

  console.log('\n=============================================');
  console.log('🎉 ALL QA TEST CASES PASSED SUCCESSFULLY FOR 3D SHOOTER!');
  console.log('=============================================');
}

(async () => {
  try {
    await runTests();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ QA TEST SUITE FAILED:', err.message || err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }
})();
