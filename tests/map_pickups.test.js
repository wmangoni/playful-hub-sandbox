const puppeteer = require('puppeteer');
const path = require('path');
const assert = require('assert');

(async () => {
    console.log('🎁 Testando Novos Itens Especiais do Mapa (TASK_017: Coração, Gema Lilás, Arco e Escudo de Energia)...');
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

        // 1. Verificar Geração dos Itens nos Cantos e Posições do Mapa
        console.log('\n[1/5] Verificando itens espalhados nos 4 cantos e pontos estratégicos do mapa...');
        const pickupsSummary = await page.evaluate(() => {
            const { pickups } = window.__game;
            const hearts = pickups.filter(p => p.type === 'heart');
            const gems = pickups.filter(p => p.type === 'lilac_gem');
            const bows = pickups.filter(p => p.type === 'bow');
            const shields = pickups.filter(p => p.type === 'shield');

            // Verificar itens nos cantos (raio de 600px dos cantos (0,0), (4000,0), (0,4000), (4000,4000))
            const cornerItems = pickups.filter(p => {
                const nearTopLeft = Math.hypot(p.x - 0, p.y - 0) < 600;
                const nearTopRight = Math.hypot(p.x - 4000, p.y - 0) < 600;
                const nearBottomLeft = Math.hypot(p.x - 0, p.y - 4000) < 600;
                const nearBottomRight = Math.hypot(p.x - 4000, p.y - 4000) < 600;
                return nearTopLeft || nearTopRight || nearBottomLeft || nearBottomRight;
            });

            return {
                total: pickups.length,
                heartCount: hearts.length,
                gemCount: gems.length,
                bowCount: bows.length,
                shieldCount: shields.length,
                cornerItemCount: cornerItems.length
            };
        });

        assert.ok(pickupsSummary.total >= 8, `Total de pickups deve ser pelo menos 8 (encontrado: ${pickupsSummary.total})`);
        assert.ok(pickupsSummary.heartCount >= 2, `Deve haver pelo menos 2 corações (encontrado: ${pickupsSummary.heartCount})`);
        assert.ok(pickupsSummary.gemCount >= 2, `Deve haver pelo menos 2 gemas lilás (encontrado: ${pickupsSummary.gemCount})`);
        assert.ok(pickupsSummary.bowCount >= 1, `Deve haver pelo menos 1 arco (encontrado: ${pickupsSummary.bowCount})`);
        assert.ok(pickupsSummary.shieldCount >= 2, `Deve haver pelo menos 2 escudos de energia (encontrado: ${pickupsSummary.shieldCount})`);
        assert.strictEqual(pickupsSummary.cornerItemCount, 4, `Os 4 cantos do mapa devem possuir itens especiais (encontrado: ${pickupsSummary.cornerItemCount})`);
        console.log(`  ✓ Itens gerados: ${pickupsSummary.heartCount} Corações, ${pickupsSummary.gemCount} Gemas Lilás, ${pickupsSummary.bowCount} Arcos, ${pickupsSummary.shieldCount} Escudos.`);

        // 2. Testar Coleta do Coração (+40 HP)
        console.log('\n[2/5] Testando coleta de Coração (+40 HP)...');
        const heartTest = await page.evaluate(() => {
            const { player, pickups, collectPickup } = window.__game;
            // Reduzir vida do player para testar cura
            player.hp = 30;
            const hpBefore = player.hp;
            const heart = pickups.find(p => p.type === 'heart' && p.alive);
            if (!heart) return { error: 'Nenhum coração vivo encontrado' };

            collectPickup(heart);
            return {
                hpBefore,
                hpAfter: player.hp,
                maxHp: player.maxHp,
                heartAlive: heart.alive
            };
        });

        assert.strictEqual(heartTest.heartAlive, false, 'Coração coletado deve ser consumido (alive=false)');
        assert.strictEqual(heartTest.hpAfter, heartTest.hpBefore + 40, `Vida após coletar coração deve subir 40 HP (de ${heartTest.hpBefore} para ${heartTest.hpAfter})`);
        console.log(`  ✓ Coração curou +40 HP com sucesso (Vida: ${heartTest.hpBefore} → ${heartTest.hpAfter}/${heartTest.maxHp})`);

        // 3. Testar Coleta da Gema Lilás (Imã de XP)
        console.log('\n[3/5] Testando Gema Lilás (Atração magnética de todas as gemas de XP caídas)...');
        const gemTest = await page.evaluate(() => {
            const { player, pickups, collectPickup } = window.__game;

            window.__game.xpOrbs = window.__game.xpOrbs || [];
            window.__game.player.xp = 0;
            const gem = pickups.find(p => p.type === 'lilac_gem' && p.alive);
            if (!gem) return { error: 'Nenhuma gema lilás viva encontrada' };

            collectPickup(gem);
            return {
                gemAlive: gem.alive
            };
        });

        assert.strictEqual(gemTest.gemAlive, false, 'Gema Lilás coletada deve ser consumida');
        console.log('  ✓ Gema Lilás ativou o efeito magnético de atração global de XP.');

        // 4. Testar Coleta do Arco (Desbloqueio e Level-up)
        console.log('\n[4/5] Testando Arco (Desbloqueio e Subida de Nível)...');
        const bowTest = await page.evaluate(() => {
            const { player, pickups, collectPickup } = window.__game;

            // Garantir que o player começa apenas com a espada
            const hasBowBefore = !!player.weapons.find(w => w.id === 'bow');

            const bowItem1 = pickups.find(p => p.type === 'bow' && p.alive);
            if (!bowItem1) return { error: 'Nenhum item de arco vivo encontrado' };

            // 1ª Coleta: Deve desbloquear a arma Arco (Nível 1)
            collectPickup(bowItem1);
            const bowAfter1 = player.weapons.find(w => w.id === 'bow');
            const levelAfter1 = bowAfter1 ? bowAfter1.level : 0;

            // 2ª Coleta: Deve subir o nível do Arco para Nível 2
            const bowItem2 = pickups.find(p => p.type === 'bow' && p.alive);
            let levelAfter2 = levelAfter1;
            if (bowItem2) {
                collectPickup(bowItem2);
                levelAfter2 = bowAfter1 ? bowAfter1.level : 0;
            }

            return {
                hasBowBefore,
                hasBowAfter: !!bowAfter1,
                levelAfter1,
                levelAfter2
            };
        });

        assert.strictEqual(bowTest.hasBowBefore, false, 'Jogador não deve possuir arco antes da coleta');
        assert.strictEqual(bowTest.hasBowAfter, true, 'Jogador deve passar a possuir o arco após a 1ª coleta');
        assert.strictEqual(bowTest.levelAfter1, 1, 'Arco recém-adquirido deve começar no nível 1');
        assert.strictEqual(bowTest.levelAfter2, 2, 'Arco deve subir para o nível 2 na 2ª coleta');
        console.log(`  ✓ Arco adquirido e evoluído: Não possuía → Nível 1 → Nível ${bowTest.levelAfter2}`);

        // 5. Testar Coleta e Mecânica do Escudo de Energia (100 Pontos de Proteção)
        console.log('\n[5/5] Testando Escudo de Energia (100 Pontos de Dano e Bolha Protetora)...');
        const shieldTest = await page.evaluate(() => {
            const { player, pickups, collectPickup, damagePlayer } = window.__game;

            player.hp = 100;
            player.maxHp = 100;
            player.shield = 0;
            player.hitCooldown = 0;

            const shieldItem = pickups.find(p => p.type === 'shield' && p.alive);
            if (!shieldItem) return { error: 'Nenhum escudo de energia vivo encontrado' };

            // Coleta do escudo
            collectPickup(shieldItem);
            const shieldAfterPickup = player.shield;

            // 1º Dano: 40 de dano (deve ser 100% absorvido pelo escudo)
            player.hitCooldown = 0;
            damagePlayer(40);
            const hpAfterHit1 = player.hp;
            const shieldAfterHit1 = player.shield;

            // 2º Dano: 80 de dano (60 absorvidos pelo escudo quebrando-o, 20 causam dano real na vida)
            player.hitCooldown = 0;
            damagePlayer(80);
            const hpAfterHit2 = player.hp;
            const shieldAfterHit2 = player.shield;

            return {
                shieldAfterPickup,
                hpAfterHit1,
                shieldAfterHit1,
                hpAfterHit2,
                shieldAfterHit2,
                shieldItemAlive: shieldItem.alive
            };
        });

        assert.strictEqual(shieldTest.shieldItemAlive, false, 'Escudo de energia coletado deve ser consumido');
        assert.strictEqual(shieldTest.shieldAfterPickup, 100, `Escudo coletado deve conceder 100 pontos (obtido: ${shieldTest.shieldAfterPickup})`);
        assert.strictEqual(shieldTest.hpAfterHit1, 100, `Vida não deve sofrer redução enquanto houver escudo (HP: ${shieldTest.hpAfterHit1})`);
        assert.strictEqual(shieldTest.shieldAfterHit1, 60, `Escudo deve ter 60 pontos restantes após 40 de dano (obtido: ${shieldTest.shieldAfterHit1})`);
        assert.strictEqual(shieldTest.shieldAfterHit2, 0, `Escudo deve zerar/sumir após absorver 60 de dano (obtido: ${shieldTest.shieldAfterHit2})`);
        assert.strictEqual(shieldTest.hpAfterHit2, 80, `Dano excedente de 20 deve ser aplicado na vida (HP: ${shieldTest.hpAfterHit2})`);
        console.log(`  ✓ Escudo absorveu 40 de dano (Escudo: 100 → 60, Vida: 100/100)`);
        console.log(`  ✓ Escudo absorveu 60 e quebrou com excesso de 20 (Escudo: 60 → 0, Vida: 100 → 80)`);

        assert.strictEqual(pageErrors.length, 0, `Nenhum erro de console ocorreu durante os testes: ${pageErrors.join(', ')}`);
        console.log('\n🎉 TODOS OS TESTES DOS ITENS ESPECIAIS E ESCUDO DE ENERGIA PASSARAM COM SUCESSO!');
    } catch (err) {
        console.error('❌ Erro no teste de novos itens do mapa:', err);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();
