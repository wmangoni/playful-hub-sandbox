// Benchmark de FPS do Lazy Gardener em Full HD (1920x1080) com a cena estressada:
// ~42 plantas maduras de todas as espécies. Mede o frame time com rAF sem limite
// de FPS, com a CPU normal e com throttle de 4x. Uso:
//   node tests/perf_lazy_gardener.js [pasta-das-screenshots]
process.env.NODE_ENV = 'test';
const http = require('http');
const path = require('path');
const app = require('../server');

const PORT = process.env.TEST_PORT || 3111;
const SHOT_DIR = process.argv[2] || null;
const MEASURE_MS = 8000;

function stats(deltas) {
  const sorted = [...deltas].sort((a, b) => a - b);
  const avg = deltas.reduce((s, d) => s + d, 0) / deltas.length;
  const pct = p => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  return {
    frames: deltas.length,
    avgFps: +(1000 / avg).toFixed(1),
    p50ms: +pct(0.5).toFixed(2),
    p99ms: +pct(0.99).toFixed(2),
    maxMs: +sorted[sorted.length - 1].toFixed(2),
    p99Fps: +(1000 / pct(0.99)).toFixed(1),
    over20ms: deltas.filter(d => d > 20.8).length, // < 48 FPS
    over33ms: deltas.filter(d => d > 33.3).length
  };
}

(async () => {
  const puppeteer = (await import('puppeteer')).default;
  const server = http.createServer(app);
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--use-gl=angle', '--use-angle=d3d11',
      // PERF_VSYNC=1 mede com vsync (60 Hz, como o jogador vê); padrão = sem limite (folga)
      ...(process.env.PERF_VSYNC ? [] : ['--disable-frame-rate-limit', '--disable-gpu-vsync']),
      '--window-size=1920,1080', '--enable-precise-memory-info'
    ]
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.toString()));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_NAME_NOT_RESOLVED')) errors.push(m.text()); });
  page.on('dialog', d => d.accept());

  const url = `http://127.0.0.1:${PORT}/lazy_gardner/index.html`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__garden, { timeout: 20000 });

  // Cena de estresse: 6 plantas de cada uma das 7 espécies, em anéis ao redor do centro
  const planted = await page.evaluate(() => {
    const g = window.__garden;
    g.gardenState.gold = 1e7;
    document.getElementById('welcomeModal').style.display = 'none';
    const types = ['flower', 'tree', 'pinetree', 'mushroom', 'bamboo', 'berrybush', 'lotus'];
    let n = 0;
    for (let ring = 0; ring < 6; ring++) {
      types.forEach((t, i) => {
        const a = (i / types.length) * Math.PI * 2 + ring * 0.45;
        const r = 2.2 + ring * 1.6;
        g.plantAt(Math.cos(a) * r, Math.sin(a) * r, t);
        n++;
      });
    }
    // Força a maturidade: o loop sobe um estágio por frame até o último
    g.plants.forEach(p => { p.growTimer = 1e6; p.moisture = 100; });
    return n;
  });
  await page.waitForFunction(() => window.__garden.plants.every(p => window.__garden.isPlantMature(p)), { timeout: 20000 });
  await new Promise(r => setTimeout(r, 1500)); // pop-in e compilação de shaders

  // Diagnóstico A/B: PERF_HIDE=grass | shadows
  if (process.env.PERF_HIDE) {
    await page.evaluate(what => {
      const g = window.__garden;
      if (what.includes('grass')) g.getGrass().mesh.visible = false;
      if (what.includes('shadows')) g.getRenderer().shadowMap.enabled = false;
    }, process.env.PERF_HIDE);
  }
  if (SHOT_DIR) await page.screenshot({ path: path.join(SHOT_DIR, 'perf_scene.png') });

  const cdp = await page.createCDPSession();
  const results = {};
  for (const rate of [1, 4]) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    await new Promise(r => setTimeout(r, 800));
    const { deltas, spikes } = await page.evaluate(ms => new Promise(resolve => {
      const out = [], spikes = []; let last = performance.now(); const end = last + ms;
      let lastHeap = performance.memory ? performance.memory.usedJSHeapSize : 0;
      const g = window.__garden;
      function tick(t) {
        const d = t - last;
        const heap = performance.memory ? performance.memory.usedJSHeapSize : 0;
        // diagnóstico dos picos: queda de heap = GC; clima = troca de clima/chuva
        if (d > 20.8 && out.length > 5) spikes.push({ ms: +d.toFixed(1), heapDeltaKB: Math.round((heap - lastHeap) / 1024), weather: g.getWeather() });
        lastHeap = heap;
        out.push(d); last = t;
        if (t < end) requestAnimationFrame(tick); else resolve({ deltas: out.slice(5), spikes });
      }
      requestAnimationFrame(tick);
    }), MEASURE_MS);
    results[`cpu${rate}x`] = { ...stats(deltas), spikes: spikes.slice(0, 8) };
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

  const info = await page.evaluate(() => {
    const r = window.__garden.getRenderer ? window.__garden.getRenderer() : null;
    return r ? { calls: r.info.render.calls, triangles: r.info.render.triangles, geometries: r.info.memory.geometries, textures: r.info.memory.textures } : null;
  });

  const hybridEvents = await page.evaluate(() => window.__garden.plants.filter(p => p.hasHybridSeed).length);
  console.log(JSON.stringify({ planted, results, renderInfo: info, hybridEvents, errors }, null, 2));
  await browser.close();
  server.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
