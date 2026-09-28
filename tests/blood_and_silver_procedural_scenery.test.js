const puppeteer = require('puppeteer');
const express = require('express');
const path = require('path');
const assert = require('assert');

// Servido por HTTP (e não file://) para poder ler os pixels do canvas sem "tainting".
(async () => {
    console.log('🌿 Testando o cenário procedural do Sangue & Prata (solo, vegetação e chunks)...');
    const app = express();
    app.use(express.static(path.resolve(__dirname, '..')));
    const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const url = `http://localhost:${server.address().port}/blood_and_silver/index.html`;
    const pageErrors = [];
    const newPage = async () => {
        const page = await browser.newPage();
        page.on('pageerror', err => pageErrors.push(err.toString()));
        await page.setViewport({ width: 1280, height: 720 });
        return page;
    };
    const frames = (page, n) => page.evaluate(count => new Promise(resolve => {
        const step = () => (--count <= 0 ? resolve() : requestAnimationFrame(step));
        requestAnimationFrame(step);
    }), n);

    try {
        // 1. Largada imediata: clicar antes da geração terminar não trava nem deixa o chão vazio
        const quick = await newPage();
        await quick.evaluateOnNewDocument(() => {
            // custo de cada frame já em jogo (callback do requestAnimationFrame)
            const raf = window.requestAnimationFrame.bind(window);
            window.__playingFrames = [];
            window.requestAnimationFrame = cb => raf(t => {
                const t0 = performance.now();
                cb(t);
                if (window.__game && window.__game.game.status === 'playing') window.__playingFrames.push(performance.now() - t0);
            });
        });
        await quick.goto(url, { waitUntil: 'domcontentloaded' });
        await quick.click('#startBtn');
        await quick.waitForFunction(() => window.__playingFrames.length >= 20, { timeout: 5000 });
        const quickStats = await quick.evaluate(() => Object.assign({ first: window.__playingFrames.slice(0, 5) }, window.__game.chunkStats));
        const firstMax = Math.max.apply(null, quickStats.first);
        assert.strictEqual(quickStats.worker, true, 'O bake deve rodar no Web Worker (se cair para a thread principal, algo quebrou)');
        assert.strictEqual(quickStats.fallbackDraws, 0, 'Nenhum chunk sem textura deve aparecer durante o jogo');
        assert.ok(firstMax < 50, `Os primeiros frames da partida não devem travar (máx: ${firstMax.toFixed(1)}ms)`);
        console.log(`  ✓ Largada imediata: 1ºs frames ≤ ${firstMax.toFixed(1)}ms, nenhum quadrado vazio, bake no worker`);
        await quick.close();

        // 2. Sprites atrasados: o chão aparece na hora e os chunks são reassados quando chegam
        const late = await newPage();
        await late.setRequestInterception(true);
        late.on('request', req => {
            if (req.url().includes('skeleton-top-down-pixel-art')) setTimeout(() => req.continue().catch(() => {}), 1200);
            else req.continue().catch(() => {});
        });
        await late.goto(url, { waitUntil: 'domcontentloaded' });
        await late.click('#startBtn');
        await new Promise(r => setTimeout(r, 3500));
        const lateStats = await late.evaluate(() => {
            let stale = 0;
            window.__game.chunkCache.forEach(ch => { if (ch.stale) stale++; });
            return { fallback: window.__game.chunkStats.fallbackDraws, stale: stale };
        });
        assert.strictEqual(lateStats.fallback, 0, 'Com sprites atrasados, nenhum chunk sem textura durante o jogo');
        assert.strictEqual(lateStats.stale, 0, 'Chunks assados sem os sprites devem ser reassados quando eles carregam');
        console.log('  ✓ Sprites atrasados: chão contínuo e chunks reassados sem flush');
        await late.close();

        // 3. Vegetação gerada, fora do spawn e dos lagos
        const page = await newPage();
        await page.goto(url, { waitUntil: 'networkidle0' });
        const flora = await page.evaluate(() => {
            const { flora, PONDS } = window.__game;
            return {
                total: flora.length,
                bushes: flora.filter(f => f.canvas).length,
                trees: flora.filter(f => /^(tree|deadTree)/.test(f.flora)).length,
                nearSpawn: flora.filter(f => Math.hypot(f.x - 2000, f.y - 2000) < 150).length,
                inPonds: flora.filter(f => PONDS.some(p => Math.hypot(f.x - p.x, f.y - p.y) < p.radius)).length,
                signature: flora.map(f => f.flora + ':' + f.x + ',' + f.y).join('|')
            };
        });
        assert.ok(flora.total > 300, `Deve haver mais de 300 elementos de vegetação (encontrado: ${flora.total})`);
        assert.ok(flora.bushes > 100, 'Deve haver arbustos procedurais');
        assert.ok(flora.trees > 30, 'Deve haver árvores');
        assert.strictEqual(flora.nearSpawn, 0, 'Nenhuma vegetação colada ao ponto de spawn');
        assert.strictEqual(flora.inPonds, 0, 'Nenhuma vegetação dentro dos lagos');
        console.log(`  ✓ Vegetação: ${flora.total} elementos (${flora.bushes} arbustos procedurais, ${flora.trees} árvores)`);

        // 4. Geração determinística (mesma semente → mesmo mapa)
        await page.reload({ waitUntil: 'networkidle0' });
        const signature2 = await page.evaluate(() => window.__game.flora.map(f => f.flora + ':' + f.x + ',' + f.y).join('|'));
        assert.strictEqual(signature2, flora.signature, 'A vegetação deve ser idêntica entre carregamentos');
        console.log('  ✓ Geração determinística entre recarregamentos');

        // 5. Streaming de chunks ao atravessar o mapa: cache, canvases e fatias de bake limitados
        await page.click('#startBtn');
        await page.evaluate(() => { window.__game.player.xpToNext = 1e9; });
        await page.keyboard.down('d');
        await page.keyboard.down('s');
        await new Promise(r => setTimeout(r, 3500));
        await page.keyboard.up('d');
        await page.keyboard.up('s');
        const stats = await page.evaluate(() => Object.assign({ cached: window.__game.chunkCache.size }, window.__game.chunkStats));
        assert.ok(stats.baked > 0, 'Chunks devem ter sido assados');
        assert.ok(stats.cached <= 48, `Cache de chunks limitado a 48 (encontrado: ${stats.cached})`);
        assert.ok(stats.allocated <= 48, `Canvases de chunk reciclados, no máximo 48 (encontrado: ${stats.allocated})`);
        assert.ok(stats.maxSliceMs < 12, `Cada fatia de bake deve ser curta (máx: ${stats.maxSliceMs.toFixed(1)}ms)`);
        assert.strictEqual(stats.fallbackDraws, 0, 'Nenhum chunk sem textura ao atravessar o mapa');
        console.log(`  ✓ Chunks: ${stats.baked} assados, ${stats.cached} em cache, ${stats.allocated} canvases, fatia mais lenta ${stats.maxSliceMs.toFixed(1)}ms`);

        // 6. Solo texturizado e com luminância que preserva a leitura de personagens e orbes
        const ground = await page.evaluate(() => {
            window.__game.enemies.forEach(e => { e.alive = false; });
            return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => {
                const c = document.getElementById('game');
                const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
                let sum = 0, sum2 = 0, n = 0;
                for (let i = 0; i < d.length; i += 4 * 97) {
                    const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
                    sum += l; sum2 += l * l; n++;
                }
                const mean = sum / n;
                resolve({ mean: mean, sd: Math.sqrt(sum2 / n - mean * mean) });
            })));
        });
        assert.ok(ground.mean > 30 && ground.mean < 110, `Luminância média do cenário fora da faixa legível (${ground.mean.toFixed(1)})`);
        assert.ok(ground.sd > 4, `O solo deve ter textura, não cor chapada (desvio: ${ground.sd.toFixed(1)})`);
        console.log(`  ✓ Solo: luminância média ${ground.mean.toFixed(1)}, desvio ${ground.sd.toFixed(1)}`);

        assert.strictEqual(pageErrors.length, 0, `Nenhum erro de página deve ocorrer (encontrado: ${pageErrors.join(', ')})`);
        console.log('\n🎉 TESTE DO CENÁRIO PROCEDURAL APROVADO!');
    } catch (err) {
        console.error('❌ Erro no teste do cenário procedural:', err);
        process.exitCode = 1;
    } finally {
        await browser.close();
        server.close();
    }
})();
