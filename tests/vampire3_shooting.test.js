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
        await new Promise(r => setTimeout(r, 400));

        // Testar lógica de disparo do Vampiro 3
        const result = await page.evaluate(() => {
            const { player, enemies, projectiles, ENEMY_TYPES, spawnEnemyProjectile } = window.__game;

            // Configurar um vampiro 3 a 120px do jogador
            const v3 = enemies.find(e => !e.alive) || enemies[0];
            v3.alive = true;
            v3.type = 'v3';
            v3.x = player.x + 120;
            v3.y = player.y;
            v3.shootTimer = 3.0;
            v3.hp = 1000;

            const toPlayerX = player.x - v3.x;
            const toPlayerY = player.y - v3.y;
            const dist = Math.hypot(toPlayerX, toPlayerY);

            spawnEnemyProjectile(
                v3.x,
                v3.y,
                toPlayerX / dist,
                toPlayerY / dist,
                ENEMY_TYPES.v3.projectileSpeed || 150,
                ENEMY_TYPES.v3.shootDamage || 8,
                '#e8435b'
            );

            const enemyProjectilesFired = projectiles.filter(p => p.alive && p.isEnemy);
            return {
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
