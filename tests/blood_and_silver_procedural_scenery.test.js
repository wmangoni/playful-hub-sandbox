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
    const pageErrors = [];

    try {
        const page = await browser.newPage();
        page.on('pageerror', err => pageErrors.push(err.toString()));
        await page.setViewport({ width: 1280, height: 720 });
        const url = `http://localhost:${server.address().port}/blood_and_silver/index.html`;
        await page.goto(url, { waitUntil: 'networkidle0' });

        // 1. Vegetação gerada, fora do spawn e dos lagos
        const flora = await page.evaluate(() => {
            const { flora } = window.__game;
            const ponds = [{ x: 850, y: 1150, radius: 140 }, { x: 3150, y: 2850, radius: 180 }, { x: 2600, y: 650, radius: 120 }];
            return {
                total: flora.length,
                bushes: flora.filter(f => f.canvas).length,
                trees: flora.filter(f => /^(tree|deadTree)/.test(f.flora)).length,
                nearSpawn: flora.filter(f => Math.hypot(f.x - 2000, f.y - 2000) < 150).length,
                inPonds: flora.filter(f => ponds.some(p => Math.hypot(f.x - p.x, f.y - p.y) < p.radius)).length,
                signature: flora.map(f => f.flora + ':' + f.x + ',' + f.y).join('|')
            };
        });
        assert.ok(flora.total > 300, `Deve haver mais de 300 elementos de vegetação (encontrado: ${flora.total})`);
        assert.ok(flora.bushes > 100, 'Deve haver arbustos procedurais');
        assert.ok(flora.trees > 30, 'Deve haver árvores');
        assert.strictEqual(flora.nearSpawn, 0, 'Nenhuma vegetação colada ao ponto de spawn');
        assert.strictEqual(flora.inPonds, 0, 'Nenhuma vegetação dentro dos lagos');
        console.log(`  ✓ Vegetação: ${flora.total} elementos (${flora.bushes} arbustos procedurais, ${flora.trees} árvores)`);

        // 2. Geração determinística (mesma semente → mesmo mapa)
        await page.reload({ waitUntil: 'networkidle0' });
        const signature2 = await page.evaluate(() => window.__game.flora.map(f => f.flora + ':' + f.x + ',' + f.y).join('|'));
        assert.strictEqual(signature2, flora.signature, 'A vegetação deve ser idêntica entre carregamentos');
        console.log('  ✓ Geração determinística entre recarregamentos');

        // 3. Streaming de chunks ao atravessar o mapa: cache e canvases limitados
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
        assert.ok(stats.maxStageMs < 40, `Etapa de bake deve ser curta (máx: ${stats.maxStageMs.toFixed(1)}ms)`);
        console.log(`  ✓ Chunks: ${stats.baked} assados, ${stats.cached} em cache, ${stats.allocated} canvases, etapa mais lenta ${stats.maxStageMs.toFixed(1)}ms`);

        // 4. Solo texturizado e com luminância que preserva a leitura de personagens e orbes
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
