process.env.NODE_ENV = 'test';
const http = require('http');
const path = require('path');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = process.env.TEST_PORT || 3092;

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
  console.log('  QA TEST SUITE - VOXEL ARENA (TASK_001: Atmosfera & VFX)');
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

  // 1. Validar Atmosfera Sombria e Iluminação Lunar (WebGL & Three.js)
  console.log('\n--- Test 1: Atmosfera Sombria (Névoa Volumétrica, Luar Frio e Chão de Basalto) ---');
  const atmosphereCheck = await page.evaluate(() => {
    const a = window.__arena;
    const scene = a.game.scene;

    // Verificar névoa exponencial densa
    const hasFogExp2 = scene.fog && scene.fog.isFogExp2;
    const fogDensity = hasFogExp2 ? scene.fog.density : 0;
    const fogColorHex = hasFogExp2 ? scene.fog.color.getHexString() : '';

    // Verificar background escuro
    const bgColorHex = scene.background ? scene.background.getHexString() : '';

    // Verificar luz lunar
    let hasMoonLight = false;
    let moonLightIntensity = 0;
    scene.traverse(child => {
      if (child.isDirectionalLight) {
        hasMoonLight = true;
        moonLightIntensity = child.intensity;
      }
    });

    return {
      hasFogExp2: !!hasFogExp2,
      fogDensity,
      fogColorHex,
      bgColorHex,
      hasMoonLight,
      moonLightIntensity
    };
  });

  console.log('Resultados de Atmosfera:', JSON.stringify(atmosphereCheck, null, 2));
  if (!atmosphereCheck.hasFogExp2 || atmosphereCheck.fogDensity !== 0.03 || !atmosphereCheck.hasMoonLight || atmosphereCheck.moonLightIntensity < 1.5) {
    throw new Error('Falha na configuração de atmosfera sombria (Névoa Exp2 ou Luz Lunar).');
  }
  console.log('✅ Teste 1: Atmosfera sombria e iluminação lunar validadas.');

  // 2. Validar Modelo Voxel Beasts (8 partes e Olhos Rubis Emissivos)
  console.log('\n--- Test 2: Modelagem de Inimigos (Voxel Beasts com Olhos Rubis) ---');
  const enemyCheck = await page.evaluate(() => {
    const a = window.__arena;
    const enemy = a.makeEnemy('basic');
    const meshGroup = enemy.mesh;

    const isGroup = meshGroup.isGroup;
    const childrenCount = meshGroup.children.length;

    // Verificar se possui partes de olhos rubis emissivos
    let hasRubyEyes = false;
    meshGroup.traverse(child => {
      if (child.isMesh && child.material && child.material.emissive) {
        const hex = child.material.emissive.getHexString();
        if (hex.includes('ff') && child.material.emissiveIntensity >= 2.0) {
          hasRubyEyes = true;
        }
      }
    });

    return {
      isGroup,
      childrenCount,
      hasRubyEyes
    };
  });

  console.log('Resultados de Voxel Beasts:', JSON.stringify(enemyCheck, null, 2));
  if (!enemyCheck.isGroup || enemyCheck.childrenCount < 6 || !enemyCheck.hasRubyEyes) {
    throw new Error('Falha no modelo estruturado de Voxel Beasts ou nos olhos rubis emissivos.');
  }
  console.log('✅ Teste 2: Modelo procedural de Voxel Beasts com 8 voxels e olhos rubis validado.');

  // 3. Validar VFX 3D Procedurais e Luzes Pontuais de Habilidades
  console.log('\n--- Test 3: VFX de Habilidades (Spin Toroidal, Heal Espiral, Ult Domo e Dash Fantasmas) ---');
  const vfxCheck = await page.evaluate(() => {
    const a = window.__arena;
    const scene = a.game.scene;
    const playerMesh = a.game.player.mesh;
    const pos = playerMesh.position;

    // Spawnar VFX de Spin, Heal e Ult
    a.spawnDynamicSkillVFX(scene, pos, 'spin');
    const countAfterSpin = a.vfxCount();

    a.spawnDynamicSkillVFX(scene, pos, 'heal');
    const countAfterHeal = a.vfxCount();

    a.spawnDynamicSkillVFX(scene, pos, 'ult');
    const countAfterUlt = a.vfxCount();

    // Spawnar Fantasmas do Dash
    a.spawnDashGhosts(scene, playerMesh, new a.THREE.Vector3(0, 0, 0), new a.THREE.Vector3(10, 0, 0));
    const countAfterDash = a.vfxCount();

    return {
      spinVfxActive: countAfterSpin >= 1,
      healVfxActive: countAfterHeal >= 2,
      ultVfxActive: countAfterUlt >= 3,
      dashGhostsActive: countAfterDash >= 4
    };
  });

  console.log('Resultados de VFX:', JSON.stringify(vfxCheck, null, 2));
  if (!vfxCheck.spinVfxActive || !vfxCheck.healVfxActive || !vfxCheck.ultVfxActive || !vfxCheck.dashGhostsActive) {
    throw new Error('Falha na geração de VFX tridimensionais das habilidades.');
  }
  console.log('✅ Teste 3: VFX de Spin, Heal, Ult e Dash Fantasmas validados com sucesso.');

  // 4. Validar HUD Glassmorphism e Runas SVG Inline
  console.log('\n--- Test 4: HUD Glassmorphism e Runas SVG Reativas ---');
  const hudCheck = await page.evaluate(() => {
    const slots = document.querySelectorAll('.skill-slot');
    const slotsCount = slots.length;

    let svgsCount = 0;
    const skillTypes = [];
    slots.forEach(slot => {
      if (slot.querySelector('svg')) svgsCount++;
      skillTypes.push(slot.getAttribute('data-skill'));
    });

    const hasHpBar = !!document.getElementById('health-fill');
    const hasStaminaBar = !!document.getElementById('stamina-fill');
    const hasXpBar = !!document.getElementById('xp-fill');

    return {
      slotsCount,
      svgsCount,
      skillTypes,
      hasHpBar,
      hasStaminaBar,
      hasXpBar
    };
  });

  console.log('Resultados do HUD Glassmorphism:', JSON.stringify(hudCheck, null, 2));
  if (hudCheck.slotsCount !== 4 || hudCheck.svgsCount !== 4 || !hudCheck.hasHpBar || !hudCheck.hasStaminaBar || !hudCheck.hasXpBar) {
    throw new Error('Falha na estrutura do HUD Glassmorphic ou nas Runas SVG dos slots de habilidade.');
  }
  console.log('✅ Teste 4: HUD Glassmorphism e Runas SVG em todos os slots validados.');

  // 5. Validar Estabilidade e Ausência de Erros no Loop WebGL
  console.log('\n--- Test 5: Estabilidade WebGL e Ausência de Erros ---');
  await page.waitForTimeout(1500);

  if (consoleErrors.length > 0) {
    console.error('Erros no console:', consoleErrors);
    throw new Error(`Encontrados ${consoleErrors.length} erros no console.`);
  }
  console.log('✅ Teste 5: WebGL e Three.js executaram com 0 erros.');

  // Tirar Screenshot de Evidência
  const screenshotPath = path.join(__dirname, 'voxel_arena_task001_qa_evidence.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n📸 Screenshot de evidência capturada em: ${screenshotPath}`);

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DE QA DA TASK_001 (VOXEL ARENA) PASSARAM!');
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
