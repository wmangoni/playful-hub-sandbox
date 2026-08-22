const puppeteer = require('puppeteer');
const path = require('path');
const assert = require('assert');

(async () => {
    console.log('🦇 Testando disparo do Vampiro 3...');
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
        await new Promise(r => setTimeout(r, 600));

        // Testar lógica de disparo do Vampiro 3 dentro do jogo
        const result = await page.evaluate(async () => {
            const { player, enemies, projectiles, ENEMY_TYPES } = window.__game;

            // Configurar um vampiro 3 próximo ao herói com timer prestes a disparar
            const v3 = enemies.find(e => !e.alive) || enemies[0];
            v3.alive = true;
            v3.type = 'v3';
            v3.x = player.x + 80;
            v3.y = player.y;
            v3.shootTimer = 0.05; // Disparará quase imediatamente
            v3.hp = 500;

            const initialHp = player.hp;

            // Aguardar 300ms para o loop rodar, disparar e o projétil se deslocar
            await new Promise(r => setTimeout(r, 300));

            const enemyProjectilesFired = projectiles.filter(p => p.alive && p.isEnemy);
            return {
                initialHp,
                hasEnemyProjectile: enemyProjectilesFired.length > 0,
                projectileType: enemyProjectilesFired[0] ? enemyProjectilesFired[0].weaponId : null,
                shootInterval: ENEMY_TYPES.v3.shootInterval
            };
        });

        assert.strictEqual(result.shootInterval, 3.0, 'Intervalo de disparo do Vampiro 3 deve ser 3s');
        assert.strictEqual(result.hasEnemyProjectile, true, 'Vampiro 3 deveria ter gerado um projétil inimigo');
        assert.strictEqual(result.projectileType, 'enemy_bolt', 'Projétil gerado deveria ser do tipo enemy_bolt');
        console.log('  ✓ Intervalo de disparo verificado: a cada 3.0 segundos.');
        console.log('  ✓ Vampiro 3 disparou o Orbe de Sangue (enemy_bolt) em direção ao jogador.');

        console.log('\n🎉 TESTE DE DISPARO DO VAMPIRO 3 APROVADO COM SUCESSO!');
    } catch (err) {
        console.error('❌ Erro no teste do Vampiro 3:', err);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();
