const puppeteer = require('puppeteer');
const path = require('path');
const assert = require('assert');

(async () => {
    console.log('🏜️ Testando Solo Arenoso e Sistema de Cenografia Inteligente (TASK_016)...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const pageErrors = [];

    try {
        const filePath = 'file:///' + path.resolve(__dirname, '../blood_and_silver/index.html').replace(/\\/g, '/');
        const page = await browser.newPage();
        page.on('pageerror', err => {
            pageErrors.push(err.toString());
        });

        await page.setViewport({ width: 1280, height: 720 });
        await page.goto(filePath, { waitUntil: 'load' });

        // Iniciar jogo
        await page.click('#startBtn');
        await new Promise(r => setTimeout(r, 600));

        assert.strictEqual(pageErrors.length, 0, `Nenhum erro de console deve ocorrer (encontrado: ${pageErrors.join(', ')})`);

        const sceneryData = await page.evaluate(() => {
            const { scenery, player, WORLD_W, WORLD_H } = window.__game;

            const shrines = scenery.filter(s => s.category === 'shrine');
            const graveyards = scenery.filter(s => s.category === 'graveyard');
            const outposts = scenery.filter(s => s.category === 'outpost');
            const relics = scenery.filter(s => s.category === 'relic');
            const groundCracks = scenery.filter(s => s.isGroundCrack);
            const fireBraziers = scenery.filter(s => s.isFire && s.hasLight);

            // Verificar se algum objeto foi colocado sobre a área de spawn central (raio 220px)
            const centerX = 2000;
            const centerY = 2000;
            const centerObstacles = scenery.filter(s => {
                const dist = Math.hypot(s.x - centerX, s.y - centerY);
                return dist < 220;
            });

            return {
                totalScenery: scenery.length,
                shrineCount: shrines.length,
                graveyardCount: graveyards.length,
                outpostCount: outposts.length,
                relicCount: relics.length,
                groundCracksCount: groundCracks.length,
                fireBraziersCount: fireBraziers.length,
                centerObstaclesCount: centerObstacles.length
            };
        });

        assert.ok(sceneryData.totalScenery > 50, 'Deve haver mais de 50 elementos cenográficos gerados');
        assert.ok(sceneryData.shrineCount > 0, 'Deve haver altares/ruínas arcanas geradas');
        assert.ok(sceneryData.graveyardCount > 0, 'Deve haver cemitérios do deserto gerados');
        assert.ok(sceneryData.outpostCount > 0, 'Deve haver acampamentos/postos de caravanas gerados');
        assert.ok(sceneryData.relicCount > 0, 'Deve haver nichos de relíquias e urnas gerados');
        assert.ok(sceneryData.groundCracksCount > 0, 'Deve haver fissuras no solo arenoso geradas');
        assert.ok(sceneryData.fireBraziersCount > 0, 'Deve haver braseiros/tochas com fogo animado e iluminação');
        assert.strictEqual(sceneryData.centerObstaclesCount, 0, 'Área central de spawn deve permanecer desimpedida');

        console.log('  ✓ Cenografia Inteligente gerada com sucesso:');
        console.log(`    - 🏛️ Altares & Ruínas Arcanas: ${sceneryData.shrineCount} objetos`);
        console.log(`    - ⚰️ Cemitérios & Catacumbas: ${sceneryData.graveyardCount} objetos`);
        console.log(`    - 📦 Acampamentos & Caravanas: ${sceneryData.outpostCount} objetos`);
        console.log(`    - 🏺 Relíquias & Urnas Antigas: ${sceneryData.relicCount} objetos`);
        console.log(`    - 🏜️ Fissuras no Solo Arenoso: ${sceneryData.groundCracksCount} rachaduras`);
        console.log(`    - 🔥 Braseiros & Tochas Animadas: ${sceneryData.fireBraziersCount} fontes de luz`);
        console.log(`    - 🛡️ Área Central de Spawn: Limpa (${sceneryData.centerObstaclesCount} obstáculos)`);

        console.log('\n🎉 TESTE DE SOLO ARENOSO E CENOGRAFIA INTELIGENTE APROVADO COM ZERO ERROS!');
    } catch (err) {
        console.error('❌ Erro no teste do mapa e cenografia:', err);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();
