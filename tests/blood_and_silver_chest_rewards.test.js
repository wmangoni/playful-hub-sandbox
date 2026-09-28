const puppeteer = require('puppeteer');
const path = require('path');
const assert = require('assert');

// Recompensas do baú: a roleta melhora armas E passivos; com tudo no máximo, o baú oferece
// uma escolha entre velocidade de movimento e vida, com valores pelo tier.
(async () => {
    console.log('🎁 Testando as recompensas dos baús do Sangue & Prata...');
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

        // Arsenal controlado + abre um baú do tier pedido; devolve o estado do popup
        const openWith = (setup, rarity) => page.evaluate((setupSrc, rarity) => {
            const G = window.__game;
            new Function('G', setupSrc)(G);
            G.enemies.forEach(e => { e.alive = false; });
            const chest = G.chests[0];
            chest.rarity = rarity;
            chest.alive = true;
            G.openChest(chest);
            return {
                status: G.game.status,
                title: document.getElementById('chestTitle').textContent,
                subtitle: document.getElementById('chestSubtitle').textContent,
                cards: Array.from(document.querySelectorAll('#chestCards .upgrade-card')).map(c => c.textContent),
                buttonVisible: getComputedStyle(document.getElementById('chestBtn')).display !== 'none'
            };
        }, setup.toString().replace(/^[^{]*{|}$/g, ''), rarity);

        // 1. Espada no máximo (sem a Joia para evoluir) e Amuleto nv 1: o baú comum melhora o Amuleto
        let popup = await openWith(function () {
            const sword = G.player.weapons[0];
            while (sword.level < sword.maxLevel) sword.level++;
            G.player.passives = [G.makePassive('amulet')];
        }, 'common');
        let amulet = await page.evaluate(() => window.__game.player.passives.find(p => p.id === 'amulet').level);
        assert.strictEqual(amulet, 2, 'O baú deve subir o nível do passivo quando as armas estão no máximo');
        assert.ok(popup.cards.length === 1 && popup.cards[0].includes('Amuleto') && popup.cards[0].includes('Nível 1 → 2'), `Carta do passivo esperada (recebido: ${popup.cards})`);
        await page.click('#chestBtn');
        console.log('  ✓ Baú comum melhorou o passivo Amuleto (nível 1 → 2)');

        // 2. Tudo no máximo, baú comum: escolha entre +2% de velocidade e +15 de vida
        const speedBefore = await page.evaluate(() => window.__game.player.stats.move_speed);
        popup = await openWith(function () {
            G.player.passives = [G.makePassive('amulet')];
            G.player.passives[0].level = G.player.passives[0].maxLevel;
        }, 'common');
        assert.strictEqual(popup.status, 'chest');
        assert.strictEqual(popup.cards.length, 2, 'Com tudo no máximo o baú deve oferecer 2 escolhas');
        assert.ok(popup.cards[0].includes('+2% de velocidade') && popup.cards[1].includes('+15 de vida'), `Valores do baú comum incorretos: ${popup.cards}`);
        assert.strictEqual(popup.buttonVisible, false, 'O botão Coletar não deve pular a escolha');
        await page.keyboard.press('Enter');
        assert.strictEqual(await page.evaluate(() => window.__game.game.status), 'chest', 'Enter não deve fechar o baú sem escolher');
        await page.click('#chestCards .upgrade-card:nth-child(1)');
        const afterSpeed = await page.evaluate(() => ({ speed: window.__game.player.stats.move_speed, status: window.__game.game.status }));
        assert.ok(Math.abs(afterSpeed.speed - speedBefore - 0.02) < 1e-9, `Velocidade deve subir 2% (antes ${speedBefore}, depois ${afterSpeed.speed})`);
        assert.strictEqual(afterSpeed.status, 'playing', 'O jogo deve voltar após a escolha');
        assert.ok(await page.$eval('#chestBtn', el => getComputedStyle(el).display !== 'none'), 'O botão Coletar volta para os próximos baús');
        console.log('  ✓ Baú comum com tudo no máximo: +2% de velocidade escolhido');

        // 3. Baú raro (prata): +4% OU +25 de vida — escolhe vida pelo teclado
        popup = await openWith(function () { G.player.hp = 10; }, 'rare');
        assert.ok(popup.cards[0].includes('+4% de velocidade') && popup.cards[1].includes('+25 de vida'), `Valores do baú raro incorretos: ${popup.cards}`);
        await page.keyboard.press('2');
        const hp = await page.evaluate(() => window.__game.player.hp);
        assert.strictEqual(hp, 35, `Vida deve ir de 10 para 35 (recebido: ${hp})`);
        console.log('  ✓ Baú raro com tudo no máximo: +25 de vida escolhido pelo teclado');

        // 4. Baú de ouro com o arsenal inteiro no máximo e evoluído: +8% OU +50 de vida
        const bonusBefore = await page.evaluate(() => window.__game.player.chestSpeedBonus);
        popup = await openWith(function () {
            G.player.weapons = Object.keys(G.WEAPONS).map(id => {
                const w = G.makeWeapon(id);
                w.level = w.maxLevel;
                w.evolved = true;
                return w;
            });
            G.player.passives = Object.keys(G.PASSIVES).map(id => {
                const p = G.makePassive(id);
                p.level = p.maxLevel;
                return p;
            });
        }, 'legendary');
        assert.ok(popup.title.includes('LENDÁRIO'), 'Título do baú de ouro');
        assert.ok(popup.cards[0].includes('+8% de velocidade') && popup.cards[1].includes('+50 de vida'), `Valores do baú de ouro incorretos: ${popup.cards}`);
        await page.keyboard.press('1');
        const gold = await page.evaluate(() => {
            const G = window.__game;
            const ring = G.PASSIVES.boar_ring;   // o Anel do Javali (nv máx) também soma velocidade
            return { bonus: G.player.chestSpeedBonus, speed: G.player.stats.move_speed, ring: ring.amount * ring.maxLevel };
        });
        assert.ok(Math.abs(gold.bonus - bonusBefore - 0.08) < 1e-9, `Bônus dos baús deve subir 8% (antes ${bonusBefore}, depois ${gold.bonus})`);
        assert.ok(Math.abs(gold.speed - (1 + gold.ring + gold.bonus)) < 1e-9, `Velocidade = base + anel + baús (recebido: ${gold.speed})`);
        console.log('  ✓ Baú de ouro com tudo no máximo: +8% de velocidade escolhido');

        // 5. Com algo a melhorar, o baú de ouro segue sorteando 3 prêmios (armas e passivos)
        popup = await openWith(function () {
            G.player.weapons = [G.makeWeapon('sword')];
            G.player.passives = [];
        }, 'legendary');
        assert.strictEqual(popup.cards.length, 3, 'Baú de ouro com espaço para melhorar sorteia 3 prêmios');
        await page.click('#chestBtn');
        console.log('  ✓ Baú de ouro normal: 3 prêmios sorteados');

        // 6. Nova partida zera as bênçãos de velocidade
        // (a roleta acima pode ter dado a Égide de Prata, que bloquearia o golpe)
        await page.evaluate(() => { const p = window.__game.player; p.hitCooldown = 0; p.shield = 0; p.wardCharges = 0; window.__game.damagePlayer(99999); });
        await page.waitForFunction(() => window.__game.game.status === 'gameover', { timeout: 5000 });
        await page.click('#restartBtn');
        await page.waitForFunction(() => window.__game.game.status === 'playing', { timeout: 5000 });
        const reset = await page.evaluate(() => ({ bonus: window.__game.player.chestSpeedBonus, speed: window.__game.player.stats.move_speed }));
        assert.strictEqual(reset.bonus, 0, 'O bônus de velocidade dos baús deve zerar numa nova partida');
        assert.strictEqual(reset.speed, 1, 'A velocidade volta ao normal numa nova partida');
        console.log('  ✓ Nova partida zera o bônus de velocidade dos baús');

        assert.strictEqual(pageErrors.length, 0, `Nenhum erro de página deve ocorrer (encontrado: ${pageErrors.join(', ')})`);
        console.log('\n🎉 TESTE DAS RECOMPENSAS DOS BAÚS APROVADO!');
    } catch (err) {
        console.error('❌ Erro no teste das recompensas dos baús:', err);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();
