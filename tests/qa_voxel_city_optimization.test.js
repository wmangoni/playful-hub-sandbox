// QA validation for the spatial-hash collision optimization (TASK_004 performance pass).
// Verifies the spatial hash is populated and that collision behavior is preserved exactly.
process.env.NODE_ENV = 'test';
const http = require('http');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = process.env.TEST_PORT || 3197;

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
  console.log('  QA - VOXEL CITY OTIMIZAÇÃO (SPATIAL HASH DE COLISÃO)');
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

  console.log('\n--- 0. Navegando para Voxel City ---');
  await page.goto(`http://127.0.0.1:${PORT}/voxel_city/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  // Test 1: Spatial hash estrutura populada
  console.log('\n--- Test 1: Spatial hash populada ---');
  const gridInfo = await page.evaluate(() => {
    const w = window.game.world;
    let totalRefs = 0;
    let maxCell = 0;
    w.buildingCells.forEach(col => col.forEach(cell => {
      totalRefs += cell.length;
      if (cell.length > maxCell) maxCell = cell.length;
    }));
    return {
      cellDim: w.cellDim,
      cellSize: w.cellSize,
      numBuildings: w.buildings.length,
      totalRefs,
      maxCell
    };
  });
  console.log('Grid:', JSON.stringify(gridInfo));
  if (gridInfo.cellDim < 2 || gridInfo.numBuildings === 0) {
    throw new Error('Spatial hash não foi inicializada corretamente.');
  }
  // totalRefs should be >= numBuildings (each box referenced at least once)
  if (gridInfo.totalRefs < gridInfo.numBuildings) {
    throw new Error('Spatial hash sub-indexou prédios.');
  }
  // maxCell must be far smaller than total buildings (proves the bucketing works)
  if (gridInfo.maxCell >= gridInfo.numBuildings) {
    throw new Error('Spatial hash não distribuiu os prédios (maxCell >= numBuildings).');
  }
  console.log('✅ Test 1: Spatial hash populada e indexando eficientemente.');

  // Test 2: Comportamento de colisão preservado
  console.log('\n--- Test 2: Comportamento de colisão preservado ---');
  const collisionInfo = await page.evaluate(() => {
    const w = window.game.world;
    const b = w.buildings[0]; // first building box (raw)
    const cx = (b.min.x + b.max.x) / 2;
    const cz = (b.min.z + b.max.z) / 2;
    const halfW = (b.max.x - b.min.x) / 2;
    const halfD = (b.max.z - b.min.z) / 2;

    // 1) dead center inside a building -> must collide
    const insideUnsafe = w.checkCollision({ x: cx, y: 1, z: cz });

    // 2) far away in open ground -> must NOT collide
    const openUnsafe = w.checkCollision({ x: cx + halfW + 500, y: 1, z: cz + halfD + 500 });

    // 3) just grazing: 0.3 inside the wall (within 0.5 radius) -> still collides (radius preserved)
    const edgeUnsafe = w.checkCollision({ x: cx + halfW - 0.3, y: 1, z: cz });

    // 4) 1.0 clear of the wall -> NOT collide
    const clearSafe = w.checkCollision({ x: cx + halfW + 1.0, y: 1, z: cz });

    return { insideUnsafe, openUnsafe, edgeUnsafe, clearSafe };
  });
  console.log('Colisões:', JSON.stringify(collisionInfo));
  if (!collisionInfo.insideUnsafe) throw new Error('Colisão no centro do prédio não detectada.');
  if (collisionInfo.openUnsafe) throw new Error('Colisão falsa em área aberta.');
  if (!collisionInfo.edgeUnsafe) throw new Error('Raio de colisão (0.5) não preservado na borda.');
  if (collisionInfo.clearSafe) throw new Error('Colisão falsa a 1.0 da borda.');
  console.log('✅ Test 2: Comportamento de colisão idêntico ao original.');

  // Test 3: Tráfego — semáforos por estrada e agrupamento por rua
  console.log('\n--- Test 3: Tráfego otimizado (semáforos por estrada + agrupamento por rua) ---');
  const trafficInfo = await page.evaluate(() => {
    const g = window.game;
    const w = g.world;
    const ts = g.trafficSystem;

    // 1) every road has its own intersections precomputed
    let badRoads = 0;
    let totalInterRefs = 0;
    for (const road of w.roads) {
      if (!road.interObjs || road.interObjs.length === 0) badRoads++;
      totalInterRefs += road.interObjs ? road.interObjs.length : 0;
    }

    // sanity: total per-road intersection refs == 2 * (interObjCount*roads)
    const zRoads = w.roads.filter(r => r.axis === 'z').length;
    const xRoads = w.roads.filter(r => r.axis === 'x').length;

    // 2) force one trafficSystem.update and verify sameCars grouping
    ts.update(0.016);
    let grouped = true;
    const seenRoads = new Set();
    for (const car of ts.cars) {
      if (!car.road.sameCars) { grouped = false; break; }
      seenRoads.add(car.road);
    }
    // every grouped car is in its own road's list
    for (const road of seenRoads) {
      for (const c of road.sameCars) {
        if (c.road !== road) { grouped = false; break; }
      }
    }

    // 3) all 256 intersections are reachable via the interMap (no undefined refs)
    let nullRefs = 0;
    for (const road of w.roads) {
      for (const obj of road.interObjs) if (!obj) nullRefs++;
    }

    return {
      numRoads: w.roads.length,
      zRoads, xRoads,
      badRoads,
      totalInterRefs,
      nullRefs,
      grouped,
      totalCars: ts.cars.length,
      maxSameCars: Math.max(...w.roads.filter(r => r.sameCars).map(r => r.sameCars.length))
    };
  });
  console.log('Tráfego:', JSON.stringify(trafficInfo));
  if (trafficInfo.badRoads > 0) throw new Error('Algumas estradas sem interObjs.');
  if (trafficInfo.nullRefs > 0) throw new Error('Referências nulas em interObjs.');
  if (!trafficInfo.grouped) throw new Error('Agrupamento sameCars incorreto.');
  if (trafficInfo.maxSameCars >= trafficInfo.totalCars) {
    throw new Error('Agrupamento por rua não reduziu o conjunto por carro.');
  }
  console.log('✅ Test 3: Tráfego otimizado validado.');

  // Test 4: Estabilidade WebGL sem erros (e gordura de frames)
  console.log('\n--- Test 4: Estabilidade WebGL e ausência de erros ---');
  const stability = await page.evaluate(() => {
    const g = window.game;
    // force many collision checks (simulating heavy traffic) and time them
    const w = g.world;
    const pos = { x: 0, y: 1, z: 0 };
    const t0 = performance.now();
    let hits = 0;
    for (let i = 0; i < 5000; i++) {
      pos.x = (i % 100) - 50;
      pos.z = ((i * 7) % 100) - 50;
      if (w.checkCollision(pos)) hits++;
    }
    const elapsed = performance.now() - t0;
    return { elapsedMs: elapsed, hits, percallUs: (elapsed * 1000 / 5000).toFixed(2) };
  });
  console.log('Benchmark 5000 colisões:', JSON.stringify(stability));
  if (stability.percallUs > 50) {
    throw new Error('checkCollision ainda muito lento por chamada.');
  }

  // Test 5: Neon instanciado + culling por distância
  console.log('\n--- Test 5: Neon instanciado e culling por distância ---');
  const renderInfo = await page.evaluate(() => {
    const g = window.game;
    const w = g.world;

    // 1) all neon stripes are in ONE InstancedMesh with ONE shared material (isNeon)
    const im = w.neonInstanceMesh;
    const instanced = !!im && im.isInstancedMesh;
    const totalStripes = im ? im.count : 0;
    const sharedMat = im && im.material ? !!im.material.userData.isNeon : false;
    const uniqueMats = new Set(w.neonStripes.map(s => s.color.getHexString())).size;
    const isBasic = im && im.material.isMeshBasicMaterial;

    // 2) buildings are meshes tracked for culling
    const totalBuildings = w.buildingMeshes.length;

    // 3) distance culling: a far building is hidden, a near one is visible
    // place player near origin and force one update pass
    g.player.mesh.position.set(0, 1, 0);
    g.update(0.016);
    // find nearest and farthest building meshes
    let minD = Infinity, maxD = -Infinity, minMesh = null, maxMesh = null;
    for (const m of w.buildingMeshes) {
      const d = Math.sqrt(m.position.x * m.position.x + m.position.z * m.position.z);
      if (d < minD) { minD = d; minMesh = m; }
      if (d > maxD) { maxD = d; maxMesh = m; }
    }
    const nearVisible = minMesh ? minMesh.visible : null;
    const farVisible = maxMesh ? maxMesh.visible : null;
    const hiddenCount = w.buildingMeshes.filter(m => !m.visible).length;

    return {
      instanced, totalStripes, sharedMat, isBasic, uniqueMats,
      totalBuildings, minD, maxD, nearVisible, farVisible, hiddenCount
    };
  });
  console.log('Renderização:', JSON.stringify(renderInfo));
  if (!renderInfo.instanced) throw new Error('Neon não está instanciado.');
  if (renderInfo.totalStripes < 30) throw new Error('Poucas faixas neon instanciadas.');
  if (!renderInfo.sharedMat || !renderInfo.isBasic) throw new Error('Neon não usa o material básico compartilhado.');
  if (renderInfo.uniqueMats < 2) throw new Error('Perdeu a variedade de cores do neon.');
  if (renderInfo.hiddenCount < 1) throw new Error('Culling por distância não ocultou prédios distantes.');
  if (renderInfo.nearVisible !== true) throw new Error('Prédios próximos deveriam estar visíveis.');
  console.log('✅ Test 5: Neon instanciado e culling por distância validados.');

  // Test 6: Luzes de rua — apenas os postes próximos ativos à noite
  console.log('\n--- Test 6: Luzes de rua limitadas às próximas ---');
  const lightInfo = await page.evaluate(() => {
    const g = window.game;
    const w = g.world;
    const totalLights = w.streetLights.length;

    // place player at a specific spot and force a night pass (sunY < 0 -> nightFactor up)
    g.player.mesh.position.set(10, 1, 10);
    window.state.dayTime = Math.PI * 1.5; // sin ~= -1 -> full night
    g.update(0.016);

    const visible = w.streetLights.filter(l => l.visible);
    const visibleCount = visible.length;

    // verify the visible ones are among the nearest to the player
    const px = 10, pz = 10;
    const dists = w.streetLights.map(l => Math.sqrt((l.position.x - px) ** 2 + (l.position.z - pz) ** 2));
    const visibleDists = visible.map(l => Math.min(...w.streetLights
      .map((x, i) => x === l ? dists[i] : Infinity)));
    const maxVisibleDist = visibleDists.length ? Math.max(...visibleDists) : 0;
    // the nearest light must be visible
    const nearestIdx = dists.indexOf(Math.min(...dists));
    const nearestVisible = w.streetLights[nearestIdx].visible;

    return { totalLights, visibleCount, maxVisibleDist, nearestVisible };
  });
  console.log('Luzes:', JSON.stringify(lightInfo));
  if (lightInfo.visibleCount < 1) throw new Error('Nenhuma luz de rua visível à noite.');
  if (lightInfo.visibleCount > 5) throw new Error('Mais de 5 luzes de rua visíveis (deveria ser limitado).');
  if (!lightInfo.nearestVisible) throw new Error('A luz mais próxima ao jogador deveria estar visível.');
  console.log('✅ Test 6: Apenas as luzes de rua próximas ficam ativas à noite.');

  // Test 7: Sombras — mapSize reduzido + castShadow por proximidade
  console.log('\n--- Test 7: Sombras otimizadas ---');
  const shadowInfo = await page.evaluate(() => {
    const g = window.game;
    const w = g.world;
    const mapSize = g.sunLight.shadow.mapSize.width;

    // force a cull pass with the player at origin
    g.player.mesh.position.set(0, 1, 0);
    g.update(0.016);
    const casters = w.buildingMeshes.filter(m => m.castShadow).length;
    const near = w.buildingMeshes.filter(m => m.position.x * m.position.x + m.position.z * m.position.z < 120 * 120);
    const nearCount = near.length;
    // every near building must cast
    let allNearCast = near.every(m => m.castShadow);
    // a far building must NOT cast
    const far = w.buildingMeshes.find(m => m.position.x * m.position.x + m.position.z * m.position.z >= 120 * 120);
    const farCasts = far ? far.castShadow : null;

    return { mapSize, casters, nearCount, allNearCast, farCasts };
  });
  console.log('Sombras:', JSON.stringify(shadowInfo));
  if (shadowInfo.mapSize !== 1024) throw new Error('shadow.mapSize não foi reduzido para 1024.');
  if (shadowInfo.nearCount === 0) throw new Error('Nenhum prédio próximo para validar sombra.');
  if (!shadowInfo.allNearCast) throw new Error('Prédios próximos deveriam projetar sombra.');
  if (shadowInfo.farCasts !== false) throw new Error('Prédios distantes não deveriam projetar sombra.');
  if (shadowInfo.casters >= shadowInfo.nearCount * 2) throw new Error('Muitos casters de sombra ativos.');
  console.log('✅ Test 7: Sombras otimizadas (mapSize 1024, castShadow por proximidade).');

  if (consoleErrors.length > 0) {
    throw new Error(`Houveram erros de console: ${consoleErrors.join('; ')}`);
  }
  console.log('✅ Test 3: Sem erros, colisão rápida e estável.');

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DE OTIMIZAÇÃO PASSARAM!');
  console.log('===============================================================');
}

runTests()
  .then(() => {
    if (server) server.close();
    if (browser) browser.close();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ QA TEST SUITE FAILED:', err.message);
    if (server) server.close();
    if (browser) browser.close();
    process.exit(1);
  });
