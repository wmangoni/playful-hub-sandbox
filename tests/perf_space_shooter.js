// Benchmark de Performance do Space Shooter em Full HD (1920x1080)
// Requisito mínimo (SLA): >= 60 FPS em Full HD em pelo menos 80% do tempo de jogo.
//
// Mede o frame rate real (rAF delta), percentil de frame time (P50, P80, P95, P99),
// % do tempo de jogo em >= 60 FPS e métricas internas do Blink/V8 via CDP
// (LayoutCount, RecalcStyleCount, LayoutDuration, ScriptDuration, TaskDuration, DOM Nodes)
// em 3 cenários representativos de gameplay:
//   1. Combate Intenso (Fase Normal + Tiro Triplo + Homing + Explosões/Partículas)
//   2. Arsenal Pesado (Plasma Cannon Splash + Tesla Chain Lightning + Propulsores)
//   3. Clímax Boss & Eventos (Dreadnought Prime + Buraco Negro + Escolta Goliath + Hyperbeam)
//
// Uso:
//   node tests/perf_space_shooter.js [--cpu=1] [--json]
process.env.NODE_ENV = 'test';
const http = require('http');
const app = require('../server');

const PORT = process.env.TEST_PORT || 3115;
const JSON_ONLY = process.argv.includes('--json');
const cpuArg = process.argv.find((a) => a.startsWith('--cpu='));
const CPU_THROTTLE = cpuArg ? parseFloat(cpuArg.split('=')[1]) : 1;

// No agendador VSync 60Hz do Chromium (16.67ms teóricos), pequenas variações de timer
// do SO ficam até ~17.5ms; qualquer frame drop real salta para >= 22-33ms (< 55 FPS).
const FRAME_BUDGET_60FPS_MS = 17.5;
const MIN_PASS_TIME_PCT = 80.0; // Mínimo de 80% do tempo de jogo em >= 60 FPS

function computeMetrics(deltas) {
  if (!deltas || deltas.length === 0) {
    return {
      frames: 0,
      totalTimeMs: 0,
      avgFrameMs: 0,
      avgFps: 0,
      p50Ms: 0,
      p80Ms: 0,
      p95Ms: 0,
      p99Ms: 0,
      maxMs: 0,
      fpsAtP80: 0,
      framesAt60FpsPct: 0,
      timeAt60FpsPct: 0,
      passed80Pct60Fps: false
    };
  }

  const sorted = [...deltas].sort((a, b) => a - b);
  const totalTimeMs = deltas.reduce((acc, d) => acc + d, 0);
  const avgFrameMs = totalTimeMs / deltas.length;
  const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];

  let framesWithinBudget = 0;
  let timeWithinBudgetMs = 0;
  for (const d of deltas) {
    if (d <= FRAME_BUDGET_60FPS_MS) {
      framesWithinBudget++;
      timeWithinBudgetMs += d;
    }
  }

  const framesAt60FpsPct = +((framesWithinBudget / deltas.length) * 100).toFixed(2);
  const timeAt60FpsPct = +((timeWithinBudgetMs / totalTimeMs) * 100).toFixed(2);
  const p80Ms = +pct(0.80).toFixed(2);

  return {
    frames: deltas.length,
    totalTimeMs: +totalTimeMs.toFixed(1),
    avgFrameMs: +avgFrameMs.toFixed(2),
    avgFps: +(1000 / avgFrameMs).toFixed(1),
    p50Ms: +pct(0.50).toFixed(2),
    p80Ms,
    p95Ms: +pct(0.95).toFixed(2),
    p99Ms: +pct(0.99).toFixed(2),
    maxMs: +sorted[sorted.length - 1].toFixed(2),
    fpsAtP80: +(1000 / Math.max(16.67, p80Ms)).toFixed(1),
    framesAt60FpsPct,
    timeAt60FpsPct,
    passed80Pct60Fps: timeAt60FpsPct >= MIN_PASS_TIME_PCT
  };
}

function diffCdpMetrics(before, after) {
  const mapB = Object.fromEntries(before.map((m) => [m.name, m.value]));
  const mapA = Object.fromEntries(after.map((m) => [m.name, m.value]));
  const diff = (key) => (mapA[key] || 0) - (mapB[key] || 0);
  return {
    layoutCount: diff('LayoutCount'),
    recalcStyleCount: diff('RecalcStyleCount'),
    layoutDurationMs: +(diff('LayoutDuration') * 1000).toFixed(2),
    recalcStyleDurationMs: +(diff('RecalcStyleDuration') * 1000).toFixed(2),
    scriptDurationMs: +(diff('ScriptDuration') * 1000).toFixed(2),
    taskDurationMs: +(diff('TaskDuration') * 1000).toFixed(2)
  };
}

(async () => {
  const puppeteer = (await import('puppeteer')).default;
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));

  const browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: 60000,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1920,1080',
      '--enable-precise-memory-info',
      '--mute-audio'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  const cdp = await page.createCDPSession();
  await cdp.send('Performance.enable');
  if (CPU_THROTTLE > 1) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE });
  }

  const errors = [];
  page.on('pageerror', (e) => errors.push(e.toString()));
  page.on('console', (m) => {
    const t = m.text();
    if (
      m.type() === 'error' &&
      !t.includes('ERR_NAME_NOT_RESOLVED') &&
      !t.includes('ERR_NO_BUFFER_SPACE') &&
      !t.includes('Failed to load resource')
    ) {
      errors.push(t);
    }
  });

  const url = `http://127.0.0.1:${PORT}/space_shooter/index.html`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => !!window.__spaceShooter, { timeout: 15000 });

  // Silencia elementos de áudio durante o benchmark para evitar gargalo de decode de mídia no headless
  await page.evaluate(() => {
    document.querySelectorAll('audio').forEach((a) => {
      a.muted = true;
      a.pause();
    });
    if (typeof playSound === 'function') {
      window.__origPlaySound = playSound;
      playSound = function () {};
    }
    if (typeof getAudioContext === 'function') {
      try {
        getAudioContext();
      } catch (e) {}
    }
  });

  await new Promise((r) => setTimeout(r, 400));

  async function runScenario(name, durationMs, setupFn, stepFnBody) {
    if (!JSON_ONLY) console.log(`⏳ Executando cenário: ${name} (${durationMs}ms)...`);
    await page.evaluate(setupFn);
    // Aguarda 2 frames pós-resetGame para estabilizar o setup antes de iniciar a coleta
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

    const cdpBefore = (await cdp.send('Performance.getMetrics')).metrics;

    const raw = await page.evaluate(
      ({ ms, stepCode }) =>
        new Promise((resolve) => {
          const stepFn = new Function('frameIdx', 'elapsedMs', 'state', stepCode);
          const deltas = [];
          const domNodeSamples = [];
          const state = { lastShot: 0, lastSpawn: 0, lastExplosion: 0, lastTrail: 0 };
          let last = performance.now();
          const start = last;
          let frameIdx = 0;
          let finished = false;

          const startHeap = performance.memory ? performance.memory.usedJSHeapSize : 0;

          function finish() {
            if (finished) return;
            finished = true;
            const tailStall = performance.now() - last;
            if (tailStall > 25) {
              deltas.push(tailStall);
            }
            if (domNodeSamples.length === 0) {
              const container = document.getElementById('game-container');
              domNodeSamples.push(container ? container.querySelectorAll('*').length : 0);
            }
            const endHeap = performance.memory ? performance.memory.usedJSHeapSize : 0;
            resolve({
              deltas,
              avgDomNodes: domNodeSamples.length
                ? Math.round(domNodeSamples.reduce((a, b) => a + b, 0) / domNodeSamples.length)
                : 0,
              maxDomNodes: domNodeSamples.length ? Math.max(...domNodeSamples) : 0,
              heapDeltaKB: Math.round((endHeap - startHeap) / 1024)
            });
          }

          const safetyTimer = setTimeout(finish, ms + 400);

          function measureTick() {
            if (finished) return;
            const now = performance.now();
            const d = now - last;
            last = now;
            const elapsedMs = now - start;
            deltas.push(d);
            try {
              stepFn(frameIdx, elapsedMs, state);
            } catch (err) {
              // ignora falhas pontuais de simulação
            }
            if (frameIdx % 20 === 0) {
              const container = document.getElementById('game-container');
              domNodeSamples.push(container ? container.querySelectorAll('*').length : 0);
            }
            frameIdx++;
            if (elapsedMs < ms) {
              requestAnimationFrame(measureTick);
            } else {
              clearTimeout(safetyTimer);
              finish();
            }
          }

          requestAnimationFrame(measureTick);
        }),
      { ms: durationMs, stepCode: stepFnBody }
    );

    const cdpAfter = (await cdp.send('Performance.getMetrics')).metrics;
    const cdpStats = diffCdpMetrics(cdpBefore, cdpAfter);
    const metrics = computeMetrics(raw.deltas);

    return {
      scenario: name,
      ...metrics,
      avgDomNodes: raw.avgDomNodes,
      maxDomNodes: raw.maxDomNodes,
      heapDeltaKB: raw.heapDeltaKB,
      cdp: cdpStats,
      rawDeltas: raw.deltas
    };
  }

  // Cenário 1: Combate Intenso em Fase Normal + Explosões/Partículas
  const scenario1 = await runScenario(
    '1_combate_intenso_particulas',
    3000,
    () => {
      const s = window.__spaceShooter;
      s.resetGame();
      s.setPhase(3);
      s.setCoins(1000);
      s.equipWeapon('vulcan');
      s.triggerSpecial();
      if (typeof activateHoming === 'function') activateHoming();
    },
    `
      playerCurrentHP = 100;
      isLeftPressed = Math.sin(elapsedMs * 0.005) < 0;
      isRightPressed = !isLeftPressed;
      if (elapsedMs - state.lastShot > 120) {
        state.lastShot = elapsedMs;
        window.__spaceShooter.fireBullet();
      }
      const w = typeof containerWidth !== 'undefined' ? containerWidth : 1920;
      const h = typeof containerHeight !== 'undefined' ? containerHeight : 1080;
      if (elapsedMs - state.lastSpawn > 260 && (enemies.length + summonedEnemies.length) < 12) {
        state.lastSpawn = elapsedMs;
        createEnemy(true, 60 + ((frameIdx * 137) % Math.max(200, w - 120)), -20);
      }
      if (elapsedMs - state.lastExplosion > 280) {
        state.lastExplosion = elapsedMs;
        const ex = 100 + ((frameIdx * 173) % Math.max(200, w - 200));
        const ey = 80 + ((frameIdx * 97) % Math.max(150, Math.floor(h * 0.6)));
        createExplosion(ex, ey);
      }
    `
  );

  // Cenário 2: Arsenal Pesado (Plasma Splash + Tesla Lightning + Propulsores)
  const scenario2 = await runScenario(
    '2_arsenal_plasma_tesla_trails',
    3000,
    () => {
      const s = window.__spaceShooter;
      s.resetGame();
      s.setCoins(2000);
      s.buyWeapon('plasma');
      s.buyWeapon('tesla');
    },
    `
      playerCurrentHP = 100;
      isLeftPressed = Math.cos(elapsedMs * 0.006) < 0;
      isRightPressed = !isLeftPressed;
      const w = typeof containerWidth !== 'undefined' ? containerWidth : 1920;
      if (elapsedMs - state.lastSpawn > 240 && (enemies.length + summonedEnemies.length) < 12) {
        state.lastSpawn = elapsedMs;
        createEnemy(true, (w * 0.35) + ((frameIdx * 73) % Math.max(200, Math.floor(w * 0.3))), 60 + ((frameIdx * 29) % 180));
      }
      if (elapsedMs - state.lastShot > 280) {
        state.lastShot = elapsedMs;
        if (Math.floor(elapsedMs / 280) % 2 === 0) {
          window.equipWeapon('plasma');
        } else {
          window.equipWeapon('tesla');
        }
        window.__spaceShooter.fireBullet();
      }
      if (typeof spawnEngineParticles === 'function' && elapsedMs - state.lastTrail > 32) {
        state.lastTrail = elapsedMs;
        spawnEngineParticles(playerX + 18, playerY + 35, '#00ffff');
      }
      if (typeof updateEngineTrails === 'function') {
        updateEngineTrails();
      }
    `
  );

  // Cenário 3: Clímax (Dreadnought Prime + Buraco Negro + Escolta Goliath + Hyperbeam)
  const scenario3 = await runScenario(
    '3_climax_dreadnought_blackhole_escort',
    3000,
    () => {
      const s = window.__spaceShooter;
      s.resetGame();
      s.initEscortMode();
      s.spawnDreadnoughtPrime(800);
      s.spawnBlackHole();
    },
    `
      playerCurrentHP = 100;
      goliathHP = 200;
      isLeftPressed = Math.sin(elapsedMs * 0.007) < 0;
      isRightPressed = !isLeftPressed;
      if (elapsedMs > 1000 && bossPhase === 1) {
        bossGenerators.forEach(g => {
          if (g.element && g.element.parentNode) g.element.parentNode.removeChild(g.element);
        });
        bossGenerators = [];
      }
      if (elapsedMs > 2000 && bossPhase === 2) {
        bossData.currentHP = bossData.maxHP * 0.25;
      }
      if (elapsedMs - state.lastShot > 150) {
        state.lastShot = elapsedMs;
        window.__spaceShooter.fireBullet();
      }
      if (typeof updateEngineTrails === 'function') {
        updateEngineTrails();
      }
    `
  );

  const allDeltas = [
    ...scenario1.rawDeltas,
    ...scenario2.rawDeltas,
    ...scenario3.rawDeltas
  ];
  delete scenario1.rawDeltas;
  delete scenario2.rawDeltas;
  delete scenario3.rawDeltas;

  const overall = computeMetrics(allDeltas);
  const report = {
    resolution: '1920x1080 (Full HD)',
    cpuThrottle: `${CPU_THROTTLE}x`,
    frameBudgetMs: FRAME_BUDGET_60FPS_MS,
    slaTarget: '>= 60 FPS in at least 80% of gameplay time',
    overall,
    scenarios: [scenario1, scenario2, scenario3],
    errors
  };

  if (JSON_ONLY) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('\n=========================================================================================');
    console.log(' 🚀 BENCHMARK DE PERFORMANCE - SPACE SHOOTER (FULL HD 1920x1080)');
    console.log('=========================================================================================');
    console.log(`Resolução / CPU : 1920x1080 (Full HD) | CPU Throttle: ${CPU_THROTTLE}x | Orçamento 60FPS <= ${FRAME_BUDGET_60FPS_MS}ms`);
    console.log(`Meta de SLA     : >= 60 FPS em pelo menos ${MIN_PASS_TIME_PCT}% do tempo de jogo\n`);

    for (const s of report.scenarios) {
      const status = s.passed80Pct60Fps ? '✅ PASS' : '❌ FAIL';
      console.log(
        `[${status}] ${s.scenario.padEnd(37)} | ` +
          `Tempo >=60FPS: ${String(s.timeAt60FpsPct).padStart(6)}% | ` +
          `Avg: ${String(s.avgFps).padStart(5)} FPS (${s.avgFrameMs}ms) | ` +
          `P80: ${s.p80Ms}ms | P95: ${s.p95Ms}ms | DOM: ${s.maxDomNodes} | Layouts: ${s.cdp.layoutCount}`
      );
    }

    console.log('-----------------------------------------------------------------------------------------');
    const overallStatus = overall.passed80Pct60Fps ? '✅ APROVADO' : '❌ REPROVADO';
    console.log(
      `RESULTADO GERAL : ${overallStatus} | ` +
        `Tempo em >=60 FPS: ${overall.timeAt60FpsPct}% (Frames >=60 FPS: ${overall.framesAt60FpsPct}%) | ` +
        `FPS Médio: ${overall.avgFps} FPS | P50: ${overall.p50Ms}ms | P80: ${overall.p80Ms}ms | P95: ${overall.p95Ms}ms | P99: ${overall.p99Ms}ms`
    );
    console.log('=========================================================================================');
  }

  await browser.close();
  server.close();

  if (errors.length > 0 || !overall.passed80Pct60Fps) {
    process.exit(1);
  }
  process.exit(0);
})().catch((err) => {
  console.error('Erro fatal no benchmark:', err);
  process.exit(1);
});
