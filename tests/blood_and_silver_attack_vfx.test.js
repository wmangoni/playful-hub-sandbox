const puppeteer = require('puppeteer');
const path = require('path');
const assert = require('assert');

// Efeitos dos ataques: puramente visuais. O dano, o empurrão e a morte continuam instantâneos;
// os efeitos (corte, clarão, números, desintegração, manchas, raios, runas) seguem por conta
// própria, com pools limitados e qualidade adaptativa. Tudo avançado quadro a quadro (__game.step).
(async () => {
    console.log('✨ Testando os efeitos dos ataques do Sangue & Prata...');
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
        // No menu, os sprites dos efeitos são criados e sobem como textura antes do primeiro golpe
        await page.waitForFunction(() => window.__game.fx.prewarmed(), { timeout: 10000 });
        const menuClean = await page.evaluate(() => { const f = window.__game.fx; return f.sparks.n + f.glows.n + f.decals.n + f.events.n + window.__game.damageTexts.length; });
        assert.strictEqual(menuClean, 0, 'O ensaio do menu não deixa efeitos para trás');
        console.log('  ✓ Pré-aquecimento no menu concluído e sem sobras');
        await page.click('#startBtn');
        await page.waitForFunction(() => window.__game.game.status === 'playing', { timeout: 5000 });

        // Arena controlada e pausada: só __game.step avança o tempo
        await page.evaluate(() => {
            const G = window.__game, pl = G.player;
            G.game.status = 'snap';
            pl.xpToNext = 1e9; pl.hp = pl.maxHp = 1e6;
            G.game.spawnTimer = 1e9; G.game.bossTimer = 1e9; G.game.chestTimer = 1e9;
            G.CONFIG.chestDropChance = 0;
            window.__arena = (spots, weapon, evolved) => {
                G.enemies.forEach(e => { e.alive = false; });
                G.projectiles.forEach(p => { p.alive = false; });
                G.damageZones.forEach(z => { z.alive = false; });
                G.xpOrbs.forEach(o => { o.alive = false; });
                const w = G.makeWeapon(weapon);
                w.level = 8; w.timer = 99;
                if (evolved) w.evolved = true;
                pl.weapons = [w];
                pl.facing = 0; pl.row = 3;
                spots.forEach(([dx, dy, hp], i) => {
                    const e = G.enemies[i], t = ['v1', 'v2', 'v3'][i % 3], T = G.ENEMY_TYPES[t];
                    Object.assign(e, { type: t, alive: true, isBoss: false, x: pl.x + dx, y: pl.y + dy, radius: T.radius, hp: hp, maxHp: hp, speed: 0, damage: 0, animTime: 0 });
                });
                G.step(0);   // grade espacial com os inimigos novos
                return w;
            };
            window.__steps = (n) => { for (let i = 0; i < n; i++) { G.step(1 / 60); pl.facing = 0; } };
        });

        // 1. Espada: dano e empurrão na hora; o efeito (clarão, número) chega com a lâmina
        const sword = await page.evaluate(() => {
            const G = window.__game;
            // espaçados (sem sobreposição: a separação da horda não os tira do cone)
            const w = window.__arena([[55, 0, 5], [90, -20, 1000], [90, 20, 1000]], 'sword');
            const e = G.enemies[1], victim = G.enemies[0];
            window.__steps(30);   // efeitos do golpe inicial da partida já terminaram
            const x0 = e.x, texts0 = G.damageTexts.length;
            const rnd = Math.random;
            Math.random = () => 0.999;   // resistência ao empurrão nunca segura (o empurrão é sorteado)
            try { G.fireWeapon(w); } finally { Math.random = rnd; }
            const now = {
                hp: e.hp, moved: e.x - x0, off: e.fxOffX, victimAlive: victim.alive,
                slashes: G.fx.slashes.n, texts: G.damageTexts.length - texts0, standins: G.fx.standins.n, pending: G.fx.events.n
            };
            window.__steps(10);
            const ghosts = G.fx.ghosts.n;
            window.__steps(10);
            return {
                now: now,
                later: { texts: G.damageTexts.length - texts0, off: e.fxOffX, sparks: G.fx.sparks.n, glows: G.fx.glows.n, decals: G.fx.decals.n, ghosts: ghosts, standins: G.fx.standins.n, flashed: G.game.time - e.fxHitT < 1 }
            };
        });
        assert.strictEqual(sword.now.hp, 980, 'O dano da espada continua instantâneo (20)');
        assert.ok(sword.now.moved > 0, 'O empurrão (mecânica) continua instantâneo');
        assert.ok(sword.now.off < 0, 'O desenho segura o inimigo até a lâmina chegar (deslocamento visual)');
        assert.strictEqual(sword.now.victimAlive, false, 'A morte é instantânea na mecânica');
        assert.strictEqual(sword.now.slashes, 1, 'O golpe desenha um corte');
        assert.ok(sword.now.pending > 0, 'Impactos agendados para quando a lâmina passar');
        assert.strictEqual(sword.now.texts, 0, 'Os números esperam a lâmina chegar');
        assert.strictEqual(sword.later.texts, 3, `Um número por acerto, depois do corte (${sword.later.texts})`);
        assert.strictEqual(sword.later.off, 0, 'O deslocamento visual termina');
        assert.ok(sword.later.sparks + sword.later.glows > 5, `Faíscas e brilhos do impacto (${sword.later.sparks}/${sword.later.glows})`);
        assert.ok(sword.later.decals >= 1 && sword.later.ghosts >= 1, `Morte deixa mancha e desintegração (${sword.later.decals}/${sword.later.ghosts})`);
        assert.strictEqual(sword.later.standins, 0, 'Sem "dublês" sobrando');
        console.log('  ✓ Espada: dano/empurrão/morte instantâneos; corte, clarão, números, mancha e desintegração em seguida');

        // 2. Sentido do corte alterna; Espada Rubra desenha o eco
        const evo = await page.evaluate(() => {
            const G = window.__game;
            const w = window.__arena([[70, 0, 1000]], 'sword', true);
            window.__steps(30);
            G.fireWeapon(w);
            const n1 = G.fx.slashes.n, d1 = w.fxDir;
            window.__steps(30);
            G.fireWeapon(w);
            return { n1: n1, d1: d1, d2: w.fxDir };
        });
        assert.strictEqual(evo.n1, 2, 'Espada Rubra: corte + eco carmim');
        assert.strictEqual(evo.d1, -evo.d2, 'O sentido do corte alterna a cada golpe');
        console.log('  ✓ Espada Rubra com eco e sentido alternado');

        // 2b. Horda: só os 6 primeiros acertos têm número; o resto vira "dano ×N" acima deles
        const tag = await page.evaluate(() => {
            const G = window.__game;
            const spots = [];
            for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i / 9 * Math.PI; spots.push([Math.cos(a) * (60 + (i % 2) * 34), Math.sin(a) * (60 + (i % 2) * 34), 1e6]); }
            const w = window.__arena(spots, 'axe', true);
            w.arcHalf = Math.PI / 2; w.range = 100;
            window.__steps(40);
            const t0 = G.damageTexts.length;
            G.fireWeapon(w);
            window.__steps(14);
            const texts = G.damageTexts.slice(t0);
            const plain = texts.filter(d => d.text.indexOf('×') < 0);
            const tags = texts.filter(d => d.text.indexOf('×') >= 0);
            return { plain: plain.length, tags: tags.map(d => d.text), tagY: tags.length ? tags[0].y : null, topY: Math.min.apply(null, plain.map(d => d.y)) };
        });
        assert.strictEqual(tag.plain, 6, `6 números individuais (${JSON.stringify(tag)})`);
        assert.deepStrictEqual(tag.tags, ['34 ×10'], `Rótulo agregado (${JSON.stringify(tag)})`);
        assert.ok(tag.tagY < tag.topY, `O rótulo fica acima dos números (${JSON.stringify(tag)})`);
        console.log('  ✓ Golpe na horda: 6 números + rótulo "34 ×10" acima deles');

        // 3. Machado: impacto no chão (rachaduras, anel); Tempestade solta raios
        const axe = await page.evaluate(() => {
            const G = window.__game;
            let w = window.__arena([[50, 0, 1000], [55, 20, 1000]], 'axe');
            window.__steps(30);
            G.fireWeapon(w);
            window.__steps(14);
            const plain = { cracks: G.fx.cracks.n, rings: G.fx.rings.n };
            window.__steps(60);
            w = window.__arena([[50, 0, 1000], [55, 20, 1000], [45, -20, 1000]], 'axe', true);
            G.fireWeapon(w);
            window.__steps(6);
            let minD = 1e9;
            for (let i = 0; i < G.fx.bolts.n; i++) {
                const b = G.fx.bolts.a[i];
                minD = Math.min(minD, Math.hypot(b.x1 - G.player.x, b.y1 - G.player.y));
            }
            return { plain: plain, bolts: G.fx.bolts.n, minD: minD, clear: G.player.radius + 18 };
        });
        assert.ok(axe.plain.cracks >= 2 && axe.plain.rings >= 1, `Machado racha o chão (${JSON.stringify(axe.plain)})`);
        assert.ok(axe.bolts >= 3, `Machado Tempestade solta raios (${axe.bolts})`);
        assert.ok(axe.minD >= axe.clear, `Os raios nascem fora do corpo do jogador (${axe.minD.toFixed(1)} ≥ ${axe.clear})`);
        console.log(`  ✓ Machado racha o chão (${axe.plain.cracks} rachaduras); Tempestade com ${axe.bolts} raios`);

        // 4. Arco/besta: clarão no disparo, rastro e impacto no alvo
        const bow = await page.evaluate(() => {
            const G = window.__game;
            const w = window.__arena([[200, 0, 1000]], 'crossbow');
            const g0 = G.fx.glows.n;
            G.fireWeapon(w);
            const p = G.projectiles.find(x => x.alive && !x.isEnemy);
            const muzzle = G.fx.glows.n - g0;
            const fxT = p.fxT;
            let hit = false;
            for (let i = 0; i < 40 && !hit; i++) { window.__steps(1); hit = G.enemies[0].hp < 1000; }
            window.__steps(1);
            return { muzzle: muzzle, fxT: fxT === G.game.time || fxT >= 0, hit: hit, rings: G.fx.rings.n, texts: G.damageTexts.length };
        });
        assert.ok(bow.muzzle >= 1, 'Clarão na mão ao disparar');
        assert.ok(bow.fxT, 'O projétil guarda o instante do disparo (rastro)');
        assert.ok(bow.hit && bow.rings >= 1, `Virote perfura com onda de choque (${JSON.stringify(bow)})`);
        console.log('  ✓ Besta: clarão, rastro e onda de choque no alvo');

        // 5. Água benta: vira círculo rúnico e solta brasas enquanto dura
        const holy = await page.evaluate(() => {
            const G = window.__game;
            const w = window.__arena([[60, 0, 1e6], [-60, 0, 1e6], [0, 60, 1e6], [0, -60, 1e6]], 'holy_water', true);
            G.fireWeapon(w);
            const z = G.damageZones.find(x => x.alive);
            const g0 = G.fx.glows.n;
            window.__steps(45);
            return { kind: z.fxKind, glows: G.fx.glows.n, g0: g0, alive: z.alive };
        });
        assert.strictEqual(holy.kind, 'holy_evo', 'Água Sagrada usa a paleta dourada');
        assert.ok(holy.alive && holy.glows > 5, `Brasas subindo da poça (${holy.glows})`);
        console.log('  ✓ Água Sagrada: círculo rúnico dourado com brasas');

        // 6. Chefe: coluna de luz, clarão na tela e ondas de choque
        const boss = await page.evaluate(() => {
            const G = window.__game, pl = G.player;
            window.__arena([], 'sword');
            const e = G.enemies[0];
            Object.assign(e, { alive: true, isBoss: true, x: pl.x + 150, y: pl.y, radius: 40, hp: 1, maxHp: 1, speed: 0, damage: 0, animTime: 0, fxPendT: -9 });
            G.game.activeBoss = e;
            G.hitEnemy(e, 10);
            window.__steps(2);
            return { pillars: G.fx.pillars.n, rings: G.fx.rings.n, decals: G.fx.decals.n, alive: e.alive };
        });
        assert.strictEqual(boss.alive, false);
        assert.ok(boss.pillars >= 1 && boss.rings >= 3, `Morte do chefe com coluna e ondas (${JSON.stringify(boss)})`);
        console.log('  ✓ Morte do chefe: coluna de luz, ondas de choque e sangue');

        // 7. Limites: uma chuva de acertos não estoura os pools nem os números
        const limits = await page.evaluate(() => {
            const G = window.__game;
            const spots = [];
            for (let i = 0; i < 60; i++) spots.push([Math.cos(i) * 60, Math.sin(i) * 60, 3]);
            window.__arena(spots, 'sword');
            for (let k = 0; k < 8; k++) {
                for (let i = 0; i < 60; i++) { const e = G.enemies[i]; e.alive = true; e.hp = 3; G.hitEnemy(e, 5, 3, 0, false, 'axe'); }
                window.__steps(2);
            }
            const f = G.fx;
            return {
                sparks: [f.sparks.n, f.sparks.a.length], glows: [f.glows.n, f.glows.a.length], decals: [f.decals.n, f.decals.a.length],
                ghosts: [f.ghosts.n, f.ghosts.a.length], texts: G.damageTexts.length
            };
        });
        for (const k of ['sparks', 'glows', 'decals', 'ghosts']) assert.ok(limits[k][0] <= limits[k][1], `${k} dentro do pool (${limits[k]})`);
        assert.ok(limits.texts <= 90, `No máximo 90 números na tela (${limits.texts})`);
        console.log(`  ✓ 480 acertos/mortes: pools no limite (faíscas ${limits.sparks[0]}, brilhos ${limits.glows[0]}, manchas ${limits.decals[0]}), ${limits.texts} números`);

        // 8. Qualidade adaptativa: quadros pesados reduzem, leves recuperam
        const q = await page.evaluate(() => {
            const f = window.__game.fx;
            for (let i = 0; i < 200; i++) f.budget(30);
            const low = f.quality();
            for (let i = 0; i < 800; i++) f.budget(1);
            return { low: low, high: f.quality() };
        });
        assert.ok(q.low <= 0.4 && q.high === 1, `Qualidade adaptativa (${JSON.stringify(q)})`);
        console.log(`  ✓ Qualidade adaptativa: ${q.low.toFixed(2)} sob carga, ${q.high} com folga`);

        // 9. Silhueta branca para o clarão (sem erro com o filtro SVG) e nova partida limpa os efeitos
        const sil = await page.evaluate(() => new Promise(res => {
            const img = new Image();
            img.onload = () => { const c = window.__game.fx.silhouette(img); res({ ok: !!c && c.width === img.naturalWidth && c.height === img.naturalHeight }); };
            img.onerror = () => res({ ok: false });
            img.src = '../assets/vampire-4-direction-pixel-character-sprite-pack/PNG/Vampires1/With_shadow/Vampires1_Walk_with_shadow.png';
        }));
        assert.ok(sil.ok, 'Silhueta do sprite gerada');
        await page.evaluate(() => { const G = window.__game; G.game.status = 'playing'; G.player.hp = 1; G.player.hitCooldown = 0; G.player.wardCharges = 0; G.damagePlayer(99999); });
        await page.waitForFunction(() => window.__game.game.status === 'gameover', { timeout: 5000 });
        await page.click('#restartBtn');
        await page.waitForFunction(() => window.__game.game.status === 'playing', { timeout: 5000 });
        // (o primeiro golpe da espada da partida nova pode já ter saído; da partida anterior não sobra nada)
        const clean = await page.evaluate(() => { const f = window.__game.fx; return { old: f.decals.n + f.standins.n + f.ghosts.n + f.pillars.n, slashes: f.slashes.n, events: f.events.n }; });
        assert.strictEqual(clean.old, 0, `Nova partida sem manchas/dublês/desintegrações da anterior (${JSON.stringify(clean)})`);
        assert.ok(clean.slashes <= 1 && clean.events <= 12, `Só o golpe inicial da partida nova (${JSON.stringify(clean)})`);
        console.log('  ✓ Silhueta do clarão gerada; nova partida começa limpa');

        assert.strictEqual(pageErrors.length, 0, `Nenhum erro de página deve ocorrer (encontrado: ${pageErrors.join(', ')})`);
        console.log('\n🎉 TESTE DOS EFEITOS DOS ATAQUES APROVADO!');
    } catch (err) {
        console.error('❌ Erro no teste dos efeitos dos ataques:', err);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();
