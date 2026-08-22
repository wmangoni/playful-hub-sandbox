const puppeteer = require('puppeteer');
const path = require('path');
const assert = require('assert');

(async () => {
    console.log('📦 Testando novo sistema de visual e tiers dos Baús (TASK_015)...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const filePath = 'file:///' + path.resolve(__dirname, '../blood_and_silver/index.html').replace(/\\/g, '/');
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        await page.goto(filePath, { waitUntil: 'load' });

        // Iniciar jogo
        await page.click('#startBtn');
        await new Promise(r => setTimeout(r, 400));

        // Testar configuração e progressão de tiers
        const tierData = await page.evaluate(() => {
            const { CHEST_TIERS, chests, player } = window.__game;

            // 1. Validar definições de tiers
            const common = CHEST_TIERS.common;
            const rare = CHEST_TIERS.rare;
            const legendary = CHEST_TIERS.legendary;

            // 2. Forçar spawn de 3 baús de raridades diferentes
            const c1 = chests[0];
            const c2 = chests[1];
            const c3 = chests[2];

            c1.alive = true; c1.rarity = 'common'; c1.x = player.x + 30; c1.y = player.y; c1.radius = common.radius;
            c2.alive = true; c2.rarity = 'rare'; c2.x = player.x + 80; c2.y = player.y; c2.radius = rare.radius;
            c3.alive = true; c3.rarity = 'legendary'; c3.x = player.x + 140; c3.y = player.y; c3.radius = legendary.radius;

            return {
                commonW: common.w,
                commonH: common.h,
                commonR: common.radius,
                rareW: rare.w,
                rareH: rare.h,
                rareR: rare.radius,
                legendaryW: legendary.w,
                legendaryH: legendary.h,
                legendaryR: legendary.radius,
                c1Radius: c1.radius,
                c2Radius: c2.radius,
                c3Radius: c3.radius
            };
        });

        // Verificações de progressão de tamanho
        assert.ok(tierData.commonW < tierData.rareW, 'Largura Comum deve ser menor que Rara');
        assert.ok(tierData.rareW < tierData.legendaryW, 'Largura Rara deve ser menor que Lendária');
        assert.ok(tierData.commonH < tierData.rareH, 'Altura Comum deve ser menor que Rara');
        assert.ok(tierData.rareH < tierData.legendaryH, 'Altura Rara deve ser menor que Lendária');
        assert.ok(tierData.commonR < tierData.rareR, 'Raio de colisão Comum deve ser menor que Raro');
        assert.ok(tierData.rareR < tierData.legendaryR, 'Raio de colisão Raro deve ser menor que Lendário');
        assert.strictEqual(tierData.c1Radius, 14, 'Raio do baú comum no jogo deve ser 14px');
        assert.strictEqual(tierData.c2Radius, 18, 'Raio do baú raro no jogo deve ser 18px');
        assert.strictEqual(tierData.c3Radius, 24, 'Raio do baú lendário no jogo deve ser 24px');

        console.log('  ✓ Progressão de tamanho verificada com sucesso:');
        console.log(`    - 🪵 Baú Comum: ${tierData.commonW}x${tierData.commonH}px (Raio: ${tierData.commonR}px)`);
        console.log(`    - 🥈 Baú Raro: ${tierData.rareW}x${tierData.rareH}px (Raio: ${tierData.rareR}px)`);
        console.log(`    - 👑 Baú Lendário: ${tierData.legendaryW}x${tierData.legendaryH}px (Raio: ${tierData.legendaryR}px)`);

        // Testar abertura de baú lendário e modal estilizado
        await page.evaluate(() => {
            const { chests, openChest } = window.__game;
            const c3 = chests[2];
            c3.alive = true;
            c3.rarity = 'legendary';
            openChest(c3);
        });

        await new Promise(r => setTimeout(r, 200));

        const chestModalVisible = await page.$eval('#chestScreen', el => !el.classList.contains('hidden'));
        assert.strictEqual(chestModalVisible, true, 'Modal de Baú deveria estar visível');

        const chestTitleText = await page.$eval('#chestTitle', el => el.textContent);
        console.log('  ✓ Título do modal de baú:', chestTitleText);
        assert.ok(chestTitleText.includes('LENDÁRIO'), 'Título deveria indicar Baú Lendário');

        await page.click('#chestBtn');
        await new Promise(r => setTimeout(r, 200));
        console.log('  ✓ Coleta de baú concluída e jogo retomado.');

        console.log('\n🎉 TODOS OS TESTES DE VISUAL E TIERS DE BAÚ PASSARAM COM SUCESSO!');
    } catch (err) {
        console.error('❌ Erro no teste dos baús:', err);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();
