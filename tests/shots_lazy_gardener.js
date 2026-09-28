// Screenshots de inspeção visual do Lazy Gardener (visão geral, close de cada
// espécie, estágios de crescimento, biomas e noite). Uso:
//   node tests/shots_lazy_gardener.js <pasta-de-saida> [filtro]
process.env.NODE_ENV = 'test';
const http = require('http');
const path = require('path');
const fs = require('fs');
const app = require('../server');

const PORT = process.env.TEST_PORT || 3112;
const OUT = process.argv[2];
const FILTER = process.argv[3] || '';
if (!OUT) { console.error('uso: node tests/shots_lazy_gardener.js <pasta>'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

const SPECIES = [
    { type: 'flower', x: -2.2, z: 2.4, stage: 3, cam: [0.55, 0.35, 0.7], look: 0.3 },
    { type: 'mushroom', x: -0.6, z: 3.2, stage: 2, cam: [0.8, 0.45, 0.9], look: 0.2 },
    { type: 'bamboo', x: 1.8, z: 2.6, stage: 3, cam: [2.2, 1.6, 2.8], look: 1.2 },
    { type: 'berrybush', x: 3.6, z: 1.2, stage: 3, cam: [1.1, 0.8, 1.3], look: 0.35 },
    { type: 'lotus', x: 0.6, z: 0.9, stage: 3, cam: [0.7, 0.55, 0.8], look: 0.08 },
    { type: 'tree', x: -4.5, z: -2.5, stage: 3, cam: [4.2, 2.4, 5.4], look: 2.2 },
    { type: 'pinetree', x: 5, z: -5, stage: 4, cam: [9, 4, 11], look: 5 }
];

(async () => {
    const puppeteer = (await import('puppeteer')).default;
    const server = http.createServer(app);
    await new Promise(r => server.listen(PORT, '127.0.0.1', r));
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--use-gl=angle', '--use-angle=d3d11', '--window-size=1920,1080']
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

    const wait = ms => new Promise(r => setTimeout(r, ms));
    const shot = async (name) => {
        if (FILTER && !name.includes(FILTER)) return;
        await wait(350);
        await page.screenshot({ path: path.join(OUT, name + '.png') });
    };

    await page.evaluate((species) => {
        const g = window.__garden;
        g.gardenState.gold = 1e7;
        document.getElementById('welcomeModal').style.display = 'none';
        g.setWeather('sunny');
        g.setDayProgress(0.16);
        species.forEach(s => {
            g.plantAt(s.x, s.z, s.type);
            const p = g.plants[g.plants.length - 1];
            p.growTimer = -1e9;
            g.setPlantStage(p, s.stage);
        });
    }, SPECIES);
    await wait(800);
    await shot('01_overview_day');

    // Closes (sem UI)
    await page.evaluate(() => { document.getElementById('ui').style.display = 'none'; });
    for (const s of SPECIES) {
        await page.evaluate((s) => {
            const g = window.__garden, cam = g.getCamera();
            const y = g.getTerrainHeight(s.x, s.z);
            cam.position.set(s.x + s.cam[0], y + s.cam[1], s.z + s.cam[2]);
            cam.lookAt(s.x, y + s.look, s.z);
        }, s);
        await shot(`02_close_${s.type}`);
    }

    // Estágios de crescimento lado a lado
    await page.evaluate(() => {
        const g = window.__garden;
        const rows = [
            { type: 'tree', stages: [0, 1, 2, 3], z: 8, gap: 2.6 },
            { type: 'flower', stages: [0, 1, 2, 3], z: 11, gap: 0.6 },
            { type: 'bamboo', stages: [0, 1, 2, 3], z: 12.2, gap: 1.0 },
            { type: 'mushroom', stages: [0, 1, 2], z: 10, gap: 0.8 },
            { type: 'berrybush', stages: [0, 1, 2, 3], z: 9.5, gap: 1.2 }
        ];
        rows.forEach(r => r.stages.forEach((st, i) => {
            const x = 14 + i * r.gap;
            g.plantAt(x, r.z, r.type);
            const p = g.plants[g.plants.length - 1];
            p.growTimer = -1e9;
            g.setPlantStage(p, st);
        }));
        const cam = g.getCamera();
        const y = g.getTerrainHeight(17, 10);
        cam.position.set(17.5, y + 3.2, 16.5);
        cam.lookAt(17.5, y + 0.6, 9.5);
    });
    await shot('03_stages');

    // Biomas e noite (câmera padrão do jogo)
    const resetCam = () => page.evaluate(() => { const c = window.__garden.getCamera(); c.position.set(0, 5, 10); c.lookAt(0, 0, 0); });
    await resetCam();
    for (const b of ['desert', 'glacial', 'cyberglow']) {
        await page.evaluate(b => { const g = window.__garden; g.buyGreenhouse(b); g.switchGreenhouse(b); }, b);
        await shot(`04_biome_${b}`);
    }
    await page.evaluate(() => { const g = window.__garden; g.switchGreenhouse('default'); g.setDayProgress(0.75); });
    await wait(600);
    await shot('05_night');
    await page.evaluate(() => { const g = window.__garden; g.setDayProgress(0.49); });
    await wait(600);
    await shot('06_evening');
    await page.evaluate(() => { const g = window.__garden; g.setDayProgress(0.16); g.setWeather('rainy'); });
    await wait(600);
    await shot('07_rain');

    console.log(JSON.stringify({ out: OUT, errors }, null, 2));
    await browser.close();
    server.close();
    process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
