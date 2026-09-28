const puppeteer = require('puppeteer');
const path = require('path');
const assert = require('assert');

// Égide de Prata (bloqueia golpes inteiros e se refaz) e minimapa (terreno, região e zoom).
(async () => {
    console.log('⚜️ Testando a Égide de Prata e o minimapa do Sangue & Prata...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const pageErrors = [];

    try {
        const filePath = 'file:///' + path.resolve(__dirname, '../blood_and_silver/index.html').replace(/\\/g, '/');
        const page = await browser.newPage();
        page.on('pageerror', err => pageErrors.push(err.toString()));
        await page.setViewport({ width: 1280, height: 720 });
        await page.goto(filePath, { waitUntil: 'load' });
        await page.click('#startBtn');
        await page.waitForFunction(() => window.__game.game.status === 'playing', { timeout: 5000 });
        await page.evaluate(() => {
            const G = window.__game;
            G.player.xpToNext = 1e9;
            G.enemies.forEach(e => { e.alive = false; });
            G.game.spawnTimer = 1e9;   // sem inimigos novos atrapalhando as contas de vida
        });
        const ward = () => page.evaluate(() => {
            const p = window.__game.player;
            return { charges: p.wardCharges, max: p.wardMax, regen: p.wardRegen, timer: p.wardTimer, hp: p.hp };
        });
        const hit = dmg => page.evaluate(d => {
            const G = window.__game;
            G.player.hitCooldown = 0;
            G.player.shield = 0;
            G.damagePlayer(d);
        }, dmg);

        // 1. Nível 1: bloqueia 1 golpe inteiro, some e se refaz em 5 s
        await page.evaluate(() => window.__game.grantUpgrade('passive', 'aegis'));
        let w = await ward();
        assert.deepStrictEqual([w.charges, w.max, w.regen], [1, 1, 5], `Nível 1 deve bloquear 1 golpe e refazer em 5s (${JSON.stringify(w)})`);
        await hit(30);
        w = await ward();
        assert.strictEqual(w.hp, 100, 'O golpe bloqueado não deve tirar vida');
        assert.strictEqual(w.charges, 0, 'O escudo some depois de bloquear');
        assert.ok(Math.abs(w.timer - 5) < 0.2, `Recarga começa em 5s (${w.timer})`);
        await hit(30);
        w = await ward();
        assert.strictEqual(w.hp, 70, 'Sem escudo, o golpe tira vida normalmente');
        await page.evaluate(() => { window.__game.player.wardTimer = 0.05; });
        await page.waitForFunction(() => window.__game.player.wardCharges === 1, { timeout: 2000 });
        console.log('  ✓ Nível 1: bloqueia 1 golpe, some e volta após a recarga');

        // 2. Evolução até o nível 8 (+1 golpe OU -0,5 s, alternando pela recarga)
        const expected = [[1, 5], [1, 4.5], [2, 4.5], [2, 4], [3, 4], [3, 3.5], [4, 3.5], [4, 3]];
        for (let lvl = 2; lvl <= 8; lvl++) {
            await page.evaluate(() => window.__game.grantUpgrade('passive', 'aegis'));
            w = await ward();
            assert.deepStrictEqual([w.max, w.regen], expected[lvl - 1], `Nível ${lvl} incorreto: ${JSON.stringify(w)}`);
            assert.strictEqual(w.charges, w.max, `Com o escudo ativo, o golpe extra entra na hora (nv ${lvl})`);
        }
        const level = await page.evaluate(() => window.__game.player.passives.find(p => p.id === 'aegis').level);
        assert.strictEqual(level, 8, 'Nível máximo é 8');
        await page.evaluate(() => window.__game.grantUpgrade('passive', 'aegis'));
        w = await ward();
        assert.deepStrictEqual([w.max, w.regen], [4, 3], 'Não passa do nível 8');
        console.log('  ✓ Evolução 1→8: ' + expected.map(e => e[0] + 'g/' + e[1] + 's').join(' → '));

        // 3. Nível 8: 4 golpes seguidos bloqueados, o 5º passa; recarga de 3 s
        const hp0 = (await ward()).hp;
        for (let i = 0; i < 4; i++) await hit(20);
        w = await ward();
        assert.strictEqual(w.hp, hp0, 'Os 4 golpes devem ser bloqueados');
        assert.strictEqual(w.charges, 0);
        assert.ok(Math.abs(w.timer - 3) < 0.2, `Recarga do nível 8 é 3s (${w.timer})`);
        await hit(20);
        assert.strictEqual((await ward()).hp, hp0 - 20, 'O 5º golpe passa');
        console.log('  ✓ Nível 8: 4 golpes bloqueados, o 5º passa, recarga de 3s');

        // 4. Nova partida zera a Égide
        await page.evaluate(() => { const G = window.__game; G.player.hitCooldown = 0; G.player.wardCharges = 0; G.damagePlayer(99999); });
        await page.waitForFunction(() => window.__game.game.status === 'gameover', { timeout: 5000 });
        await page.click('#restartBtn');
        await page.waitForFunction(() => window.__game.game.status === 'playing', { timeout: 5000 });
        w = await ward();
        assert.deepStrictEqual([w.charges, w.max], [0, 0], 'A Égide some numa nova partida');
        console.log('  ✓ Nova partida zera a Égide');

        // 5. Minimapa: terreno gerado, marcadores desenhados e nome da região
        await page.waitForFunction(() => window.__game.minimap.overviewStored >= 500, { timeout: 15000 });
        await page.evaluate(() => { const G = window.__game; G.player.x = 3150; G.player.y = 2700; G.enemies.forEach(e => { e.alive = false; }); });
        await page.waitForFunction(() => document.getElementById('minimapZone').textContent === 'Oásis Rubro', { timeout: 3000 });
        const map = await page.evaluate(() => {
            const c = document.getElementById('minimapCanvas');
            const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
            let lit = 0, colors = new Set();
            for (let i = 0; i < d.length; i += 16) {
                if (d[i] + d[i + 1] + d[i + 2] > 60) lit++;
                colors.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4));
            }
            return { lit: lit / (d.length / 16), colors: colors.size, visible: getComputedStyle(document.getElementById('minimap')).opacity };
        });
        assert.ok(map.lit > 0.5, `O minimapa deve mostrar o terreno (${(map.lit * 100).toFixed(0)}% iluminado)`);
        assert.ok(map.colors > 8, `O minimapa deve ter terreno variado (${map.colors} tons)`);
        console.log(`  ✓ Minimapa: terreno com ${map.colors} tons, região "Oásis Rubro" junto ao lago`);
        await page.evaluate(() => { const G = window.__game; G.player.x = 2000; G.player.y = 2000; });
        await page.waitForFunction(() => document.getElementById('minimapZone').textContent === 'Arena do Crepúsculo', { timeout: 3000 });
        console.log('  ✓ Região "Arena do Crepúsculo" no centro do mapa');

        // 6. Zoom pelos botões e teclado (com limites) e M para esconder
        const zoom = () => page.evaluate(() => window.__game.minimap.zoom);
        assert.strictEqual(await zoom(), 1, 'Zoom padrão é o intermediário');
        await page.click('#minimapZoomIn');
        assert.strictEqual(await zoom(), 0);
        assert.ok(await page.$eval('#minimapZoomIn', b => b.disabled), 'Botão + desativa no zoom máximo');
        await page.keyboard.press('-');
        await page.keyboard.press('-');
        await page.keyboard.press('-');
        assert.strictEqual(await zoom(), 2, 'Zoom não passa do limite');
        await page.keyboard.press('m');
        assert.strictEqual(await page.evaluate(() => window.__game.minimap.visible), false, 'M esconde o minimapa');
        await page.keyboard.press('m');
        assert.strictEqual(await page.evaluate(() => window.__game.minimap.visible), true, 'M mostra de novo');
        console.log('  ✓ Zoom por botões e teclado, com limites; M mostra/esconde');

        assert.strictEqual(pageErrors.length, 0, `Nenhum erro de página deve ocorrer (encontrado: ${pageErrors.join(', ')})`);
        console.log('\n🎉 TESTE DA ÉGIDE DE PRATA E DO MINIMAPA APROVADO!');
    } catch (err) {
        console.error('❌ Erro no teste da Égide/minimapa:', err);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();
