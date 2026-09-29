const puppeteer = require('puppeteer');
const express = require('express');
const path = require('path');
const assert = require('assert');

// Fase II (Floresta Amaldiçoada): bloqueada até 10 min de sobrevivência na Fase I, escolhida na
// tela inicial, com cenário próprio (tema trocado em tempo real, também no worker do bake), uma
// horda de monstros procedurais (esqueleto, zumbi, múmia e morcego) e o Rei Lich como chefe.
// A Fase I não muda.
(async () => {
    console.log('🌲 Testando a Fase II do Sangue & Prata (Floresta Amaldiçoada)...');
    const app = express();
    app.use(express.static(path.resolve(__dirname, '..')));
    const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const url = `http://localhost:${server.address().port}/blood_and_silver/index.html`;
    const pageErrors = [];

    try {
        const page = await browser.newPage();
        page.on('pageerror', err => pageErrors.push(err.toString()));
        await page.setViewport({ width: 1280, height: 720 });
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => localStorage.removeItem('blood_and_silver_progression'));
        await page.reload({ waitUntil: 'networkidle0' });
        const G = fn => page.evaluate(fn);
        const cards = () => page.$$eval('.phase-card', els => els.map(e => ({
            phase: e.dataset.phase, locked: e.classList.contains('locked'), selected: e.classList.contains('selected'),
            disabled: e.getAttribute('aria-disabled') === 'true', padlock: !!e.querySelector('.phase-lock canvas'),
            tab: e.tabIndex, text: e.textContent
        })));
        const floraSig = () => G(() => window.__game.flora.map(f => f.flora + ':' + f.x + ',' + f.y).join('|'));
        // fase trocada e cenário novo pronto (a troca roda em fatias sob o menu)
        const theme = t => page.waitForFunction(x => window.__game.sceneryTheme === x && !window.__game.pendingPhase && !window.__game.sceneryBuilding, { timeout: 3000 }, t);
        const status = () => G(() => window.__game.game.status);

        // 1. Progresso novo: Fase II com cadeado, sem seleção possível (clique, teclado, atrás de modal)
        let c = await cards();
        assert.strictEqual(c.length, 2, 'A tela inicial mostra as duas fases');
        assert.ok(c[0].selected && !c[0].locked && c[0].tab === 0, 'Fase I liberada, selecionada e com o foco do grupo');
        assert.ok(c[1].locked && c[1].disabled && c[1].padlock && !c[1].selected && c[1].tab === -1, 'Fase II bloqueada, com cadeado em pixel art');
        assert.ok(c[1].text.includes('10:00') && c[1].text.includes('Fase I'), `O cartão diz como liberar (${c[1].text})`);
        const desertFlora = await floraSig();
        await page.click('.phase-card[data-phase="2"]');
        await page.keyboard.press('2');
        await page.keyboard.press('ArrowRight');
        assert.strictEqual(await G(() => window.__game.phase), 1, 'Fase bloqueada não é selecionada');
        assert.ok(await page.$eval('.phase-card[data-phase="2"]', e => e.classList.contains('shake')), 'O cartão bloqueado treme ao clicar');
        console.log('  ✓ Progresso novo: Fase II com cadeado; clique, tecla 2 e seta não a selecionam');

        // 2. Aos 10:00 na Fase I a Fase II é liberada na hora (aviso + progresso salvo)
        await page.click('#startBtn');
        await page.waitForFunction(() => window.__game.game.status === 'playing', { timeout: 5000 });
        const types1 = await G(() => {
            const W = window.__game;
            W.player.xpToNext = 1e9;
            W.game.bossTimer = 1e9;
            W.enemies.forEach(e => { e.alive = false; });
            const seen = {};
            for (const t of [5, 60, 120, 400]) {
                W.game.time = t;
                for (let i = 0; i < 40; i++) W.spawnEnemy();
                W.enemies.forEach(e => { if (e.alive) seen[e.type] = true; e.alive = false; });
            }
            W.game.time = 599.5;
            W.game.spawnTimer = 1e9;
            W.step(0.3);
            const before = JSON.parse(localStorage.getItem('blood_and_silver_progression') || '{}').bestTime || 0;
            W.step(0.3);
            return { seen: Object.keys(seen).sort(), before: before, saved: JSON.parse(localStorage.getItem('blood_and_silver_progression')).bestTime };
        });
        assert.deepStrictEqual(types1.seen, ['v1', 'v2', 'v3'], 'A Fase I só tem vampiros');
        assert.ok(types1.before < 600 && types1.saved >= 600, `O recorde de 10 min é salvo na hora (${types1.before} → ${types1.saved})`);
        const toast = await page.$eval('#toastContainer', el => el.textContent);
        assert.ok(toast.includes('NOVA FASE LIBERADA') && toast.includes('Floresta Amaldiçoada'), `Aviso de fase liberada (${toast})`);
        await G(() => window.__game.damagePlayer(1e6));
        await page.waitForFunction(() => window.__game.game.status === 'gameover', { timeout: 3000 });
        assert.ok((await page.$eval('#goPhase', e => e.textContent)).includes('Dunas do Crepúsculo'), 'O game over diz a fase');
        await page.click('#phaseMenuBtn');
        c = await cards();
        assert.ok(!c[1].locked && !c[1].padlock, 'De volta ao menu, a Fase II aparece liberada');
        console.log('  ✓ 10:00 na Fase I: aviso "Nova fase liberada", recorde salvo e cartão destrancado');

        // 3. Teclas de fase não agem atrás do modal de Conquistas
        await page.click('#achievementsBtn');
        await page.keyboard.press('2');
        await page.keyboard.press('ArrowRight');
        assert.strictEqual(await G(() => window.__game.pendingPhase || window.__game.phase), 1, 'Com as Conquistas abertas, as teclas não trocam a fase');
        await page.keyboard.press('Escape');
        assert.strictEqual(await status(), 'menu');
        // Enter num botão focado aciona o botão (abre as Conquistas), não inicia a caçada
        await page.focus('#achievementsBtn');
        await page.keyboard.press('Enter');
        assert.ok(await page.$eval('#achievementsScreen', e => !e.classList.contains('hidden')), 'Enter em "Conquistas" focado abre o modal');
        assert.strictEqual(await status(), 'menu', 'Enter em "Conquistas" focado não inicia a caçada');
        await page.keyboard.press('Escape');

        // 4. Tab até o cartão da Fase II + Enter escolhe a fase (não inicia a caçada)
        await page.focus('.phase-card[data-phase="1"]');
        await page.keyboard.press('ArrowRight');       // seta com o foco no grupo: escolhe e leva o foco
        await theme('floresta');
        assert.ok(await page.$eval('.phase-card[data-phase="2"]', e => e === document.activeElement), 'O foco acompanha a fase escolhida');
        await page.focus('.phase-card[data-phase="1"]');
        await page.keyboard.press('Enter');
        await theme('deserto');
        await page.focus('.phase-card[data-phase="2"]');
        await page.keyboard.press('Space');
        await theme('floresta');
        assert.strictEqual(await status(), 'menu', 'Enter/Espaço num cartão focado não iniciam a caçada');
        const building = await G(() => { window.__game.setPhase(1); return window.__game.sceneryBuilding; });
        assert.ok(building, 'A troca de fase gera o cenário em fatias (não trava o menu num bloco só)');
        await theme('deserto');
        await page.keyboard.press('2');
        await theme('floresta');
        console.log('  ✓ Modal bloqueia as teclas; Enter em botão focado aciona o botão; Tab + Enter/Espaço/setas escolhem a fase sem iniciar; troca em fatias');

        // 5. A Fase II troca o cenário (tema, pântanos, vegetação) e é lembrada
        const forest = await G(() => {
            const W = window.__game;
            const inPond = (x, y) => W.PONDS.some(p => Math.hypot(x - p.x, y - p.y) < p.radius);
            return {
                phase: W.phase, ponds: W.PONDS.length,
                trees: W.flora.filter(f => /^tree_/.test(f.flora)).length,
                floraInPonds: W.flora.filter(f => inPond(f.x, f.y)).length,
                pickupsInPonds: W.pickups.filter(p => inPond(p.x, p.y)).length,
                lich: W.scenery.some(o => o.category === 'lich'),
                cauldrons: W.scenery.filter(o => o.glow).length,
                cracks: W.scenery.filter(o => o.isGroundCrack).length,
                saved: JSON.parse(localStorage.getItem('blood_and_silver_progression')).lastPhase
            };
        });
        assert.strictEqual(forest.phase, 2);
        assert.strictEqual(forest.ponds, 4, 'A floresta tem os seus 4 pântanos');
        assert.ok(forest.trees > 300, `Floresta fechada: árvores procedurais (${forest.trees})`);
        assert.strictEqual(forest.floraInPonds, 0, 'Nenhuma vegetação dentro dos pântanos');
        assert.strictEqual(forest.pickupsInPonds, 0, 'Nenhum item do mapa dentro dos pântanos');
        assert.ok(forest.lich, 'O Trono do Rei Lich está no mapa');
        assert.ok(forest.cauldrons >= 6, `Altares das bruxas com caldeirões (${forest.cauldrons})`);
        assert.strictEqual(forest.cracks, 0, 'Sem as peças de piso de masmorra no chão da mata');
        assert.strictEqual(forest.saved, 2, 'A escolha fica salva');
        console.log(`  ✓ Fase II escolhida: 4 pântanos, ${forest.trees} árvores, Trono do Lich, ${forest.cauldrons} caldeirões; escolha salva`);

        // 6. Spritesheets procedurais no formato dos vampiros (6×4 quadros de 64 px, direita = espelho)
        const sheets = await G(() => ['skeleton', 'zombie', 'mummy', 'bat', 'lich'].map(k => {
            const s = window.__game.monsterSheet(k);
            const d = s.getContext('2d').getImageData(0, 0, s.width, s.height).data;
            let frames = 0, mirrored = true;
            for (let r = 0; r < 4; r++) {
                for (let f = 0; f < 6; f++) {
                    let solid = 0;
                    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (d[((r * 64 + y) * s.width + f * 64 + x) * 4 + 3] === 255) solid++;
                    if (solid > 150) frames++;
                }
            }
            for (let y = 0; y < 64 && mirrored; y++) {
                for (let x = 0; x < 64; x++) {
                    const a = ((2 * 64 + y) * s.width + x) * 4, b = ((3 * 64 + y) * s.width + 63 - x) * 4;
                    if (d[a + 3] !== d[b + 3] || d[a] !== d[b]) { mirrored = false; break; }
                }
            }
            return { k: k, w: s.width, h: s.height, frames: frames, mirrored: mirrored };
        }));
        for (const s of sheets) {
            assert.ok(s.w === 384 && s.h === 256, `${s.k}: spritesheet 384×256`);
            assert.strictEqual(s.frames, 24, `${s.k}: 24 quadros desenhados`);
            assert.ok(s.mirrored, `${s.k}: a direita espelha a esquerda`);
        }
        console.log('  ✓ Esqueleto, zumbi, múmia, morcego e Rei Lich: spritesheets 6×4 de 64 px, direita espelhada');

        // 7. Caçada na floresta: só a horda da Fase II e os comportamentos de cada monstro
        await page.click('#startBtn');
        await page.waitForFunction(() => window.__game.game.status === 'playing', { timeout: 5000 });
        const hunt = await G(() => {
            const W = window.__game, pl = W.player;
            pl.xpToNext = 1e9;
            W.game.bossTimer = 1e9;
            W.game.spawnTimer = 1e9;
            const seen = {};
            for (const t of [5, 60, 120, 400]) {
                W.enemies.forEach(e => { e.alive = false; });
                W.game.time = t;
                for (let i = 0; i < 40; i++) W.spawnEnemy();
                W.enemies.forEach(e => { if (e.alive) seen[e.type] = true; });
            }
            // um morcego sorteado pela tabela chega com o bando (2–3 de uma vez)
            W.game.time = 60;
            let flock = 0;
            for (let i = 0; i < 400 && !flock; i++) {
                W.enemies.forEach(e => { e.alive = false; });
                W.spawnEnemy();
                flock = W.enemies.filter(e => e.alive && e.type === 'bat').length;
            }
            W.enemies.forEach(e => { e.alive = false; });
            // zumbi a 300 px: avança em arrancos
            const z = W.spawnEnemy('zombie', Math.PI);
            z.x = pl.x - 300; z.y = pl.y; z.hp = z.maxHp = 1e6;
            const z0 = z.x, steps = [];
            for (let i = 0; i < 60; i++) { const x = z.x; W.step(1 / 60); steps.push(z.x - x); }
            z.alive = false;
            // múmia a 200 px: dispara a maldição âmbar no tempo dela
            const m = W.spawnEnemy('mummy', 0);
            m.x = pl.x + 200; m.y = pl.y; m.hp = m.maxHp = 1e6; m.shootTimer = 0.02;
            W.step(1 / 60); W.step(1 / 60);
            const bolt = W.projectiles.find(p => p.alive && p.isEnemy);
            m.alive = false;
            W.projectiles.forEach(p => { p.alive = false; });
            return { seen: Object.keys(seen).sort(), flock: flock, bolt: bolt ? bolt.color : null, zombieMoved: z.x - z0, zombieMin: Math.min.apply(null, steps), zombieMax: Math.max.apply(null, steps) };
        });
        assert.deepStrictEqual(hunt.seen, ['bat', 'mummy', 'skeleton', 'zombie'], `A Fase II só tem a sua horda (${hunt.seen})`);
        assert.ok(hunt.flock >= 2 && hunt.flock <= 3, `Morcegos chegam em bandos de 2–3 (${hunt.flock})`);
        assert.strictEqual(hunt.bolt, '#f0c04a', 'A múmia dispara a maldição âmbar (não se confunde com as gemas verdes)');
        assert.ok(hunt.zombieMoved > 3, 'O zumbi avança até o jogador');
        assert.ok(hunt.zombieMax > hunt.zombieMin * 2.5, `O zumbi cambaleia em arrancos (${hunt.zombieMin.toFixed(2)}..${hunt.zombieMax.toFixed(2)} px/quadro)`);

        // Maldição: o golpe que entra deixa o caçador ~35% mais lento por uns segundos
        const curse = await G(() => {
            const W = window.__game, pl = W.player;
            const walk = () => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' }));
                const x0 = pl.x;
                for (let i = 0; i < 20; i++) W.step(1 / 60);
                window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd' }));
                return pl.x - x0;
            };
            pl.x = 2000; pl.y = 2000; pl.hitCooldown = 0; pl.hp = pl.maxHp;
            const free = walk();
            pl.x = 2000; pl.hitCooldown = 0;
            W.spawnEnemyProjectile(pl.x + 8, pl.y, -1, 0, 60, 1, 'curse');
            W.step(1 / 60);
            const cursedT = pl.cursedT;
            const slow = walk();
            return { free: free, slow: slow, cursedT: cursedT };
        });
        assert.ok(curse.cursedT > 1, `A maldição pega (${curse.cursedT.toFixed(2)} s)`);
        assert.ok(curse.slow < curse.free * 0.75 && curse.slow > curse.free * 0.55, `Amaldiçoado anda ~35% mais devagar (${curse.slow.toFixed(1)} × ${curse.free.toFixed(1)} px)`);

        // Esqueleto Chocalhante: os ossos ficam no chão e ele se levanta uma vez, com menos vida
        const bones = await G(() => {
            const W = window.__game, pl = W.player;
            W.game.time = 30;
            pl.cursedT = 0;
            const rnd = Math.random;
            const kill = e => { Math.random = () => 0.1; W.hitEnemy(e, 1e6, 0, 0, true); Math.random = rnd; };
            const s = W.spawnEnemy('skeleton', 0);
            s.x = pl.x + 150; s.y = pl.y;
            const freshHp = s.maxHp;
            kill(s);
            const piles = W.bonePiles.filter(b => b.alive).length;
            for (let i = 0; i < 120; i++) W.step(1 / 60);
            const risen = W.enemies.find(e => e.alive && e.type === 'skeleton');
            const res = { piles: piles, risen: !!risen, revived: risen && risen.revived, hpRatio: risen ? risen.maxHp / freshHp : 0 };
            if (risen) kill(risen);
            res.pilesAfter = W.bonePiles.filter(b => b.alive).length;
            return res;
        });
        assert.strictEqual(bones.piles, 1, 'O esqueleto desmontado deixa um montinho de ossos');
        assert.ok(bones.risen && bones.revived, 'Os ossos se remontam num esqueleto');
        assert.ok(Math.abs(bones.hpRatio - 0.6) < 0.05, `Remontado com 60% da vida (${bones.hpRatio.toFixed(2)})`);
        assert.strictEqual(bones.pilesAfter, 0, 'Só se remonta uma vez');
        console.log(`  ✓ Horda: 4 tipos, bando de ${hunt.flock} morcegos, zumbi em arrancos, maldição âmbar que deixa lento, esqueleto que se remonta`);

        // 8. Chefe da floresta: o Rei Lich, com rajadas em anel de maldições
        const lich = await G(() => {
            const W = window.__game;
            W.enemies.forEach(e => { e.alive = false; });
            W.projectiles.forEach(p => { p.alive = false; });
            W.game.bossTimer = 0.01;
            W.step(1 / 60);
            const boss = W.game.activeBoss;
            boss.shootTimer = 0.01;
            W.step(1 / 60);
            const bolts = W.projectiles.filter(p => p.alive && p.isEnemy && p.color === '#f0c04a').length;
            const name = document.getElementById('bossName').textContent;
            boss.alive = false;
            W.game.activeBoss = null;
            W.projectiles.forEach(p => { p.alive = false; });
            return { name: name, sheet: boss.def.sheet, bolts: bolts };
        });
        assert.strictEqual(lich.name, 'REI LICH', 'O chefe da Fase II é o Rei Lich');
        assert.strictEqual(lich.sheet, 'lich');
        assert.strictEqual(lich.bolts, 8, 'O Rei Lich dispara um anel de 8 maldições');
        console.log('  ✓ Chefe da Fase II: Rei Lich com anel de 8 maldições');

        // 9. Mortes com o material de cada monstro e cenário sem buracos durante a caçada
        const fx = await G(() => {
            const W = window.__game;
            W.game.time = 30;
            for (const k of ['skeleton', 'zombie', 'mummy', 'bat']) {
                const e = W.spawnEnemy(k, 0);
                e.x = W.player.x + 60; e.y = W.player.y; e.revived = true;
                W.hitEnemy(e, 1e6, 0, 0, false, 'sword');
            }
            W.step(1 / 60);
            return { alive: W.enemies.filter(e => e.alive).length, decals: W.fx.decals.n, fallback: W.chunkStats.fallbackDraws, worker: W.chunkStats.worker };
        });
        assert.strictEqual(fx.alive, 0, 'Os quatro monstros morrem');
        assert.ok(fx.decals >= 4, 'Cada morte deixa a sua mancha no chão');
        assert.strictEqual(fx.worker, true, 'O bake da floresta roda no worker');
        assert.strictEqual(fx.fallback, 0, 'Nenhum chunk sem textura na floresta');
        console.log('  ✓ Mortes com mancha própria; floresta assada no worker, sem chunks vazios');

        // 10. Sobreviver na Fase II conta só para o recorde dela
        const rec = await G(() => {
            const W = window.__game, P = W.getProgression();
            const before = P.bestTime;
            W.game.time = 700;
            W.step(1 / 60);
            W.damagePlayer(1e6);
            return { before: before, after: P.bestTime, second: P.bestTime2 };
        });
        await page.waitForFunction(() => window.__game.game.status === 'gameover', { timeout: 3000 });
        assert.strictEqual(rec.after, rec.before, 'O recorde da Fase I não muda na Fase II');
        assert.ok(rec.second >= 700, 'A Fase II tem o seu recorde');
        assert.ok((await page.$eval('#goPhase', e => e.textContent)).includes('Floresta Amaldiçoada'), 'O game over diz a Fase II');
        console.log('  ✓ Recorde da Fase II separado (não mexe no desbloqueio)');

        // 11. Voltar à Fase I restaura o deserto idêntico; recarregar lembra a última fase
        await page.click('#phaseMenuBtn');
        await page.keyboard.press('1');
        await theme('deserto');
        assert.strictEqual(await floraSig(), desertFlora, 'O deserto volta idêntico');
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.phase-card');
        c = await cards();
        assert.ok(c[0].selected, 'Ao recarregar, a última fase escolhida (I) continua escolhida');
        await page.keyboard.press('2');
        await theme('floresta');
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.phase-card');
        c = await cards();
        assert.ok(c[1].selected && (await G(() => window.__game.sceneryTheme)) === 'floresta', 'Ao recarregar, a Fase II continua escolhida');
        console.log('  ✓ Fase I volta idêntica; a última escolha é lembrada');

        // 12. No celular, "Iniciar Caçada" cabe na primeira tela (em pé e deitado)
        for (const [w, h] of [[390, 844], [375, 667], [844, 390], [667, 375]]) {
            await page.setViewport({ width: w, height: h });
            const box = await page.evaluate(() => {
                const r = document.getElementById('startBtn').getBoundingClientRect();
                const a = document.querySelector('.phase-card[data-phase="1"]').getBoundingClientRect();
                const b = document.querySelector('.phase-card[data-phase="2"]').getBoundingClientRect();
                return { top: r.top, bottom: r.bottom, vh: innerHeight, sideBySide: Math.abs(a.top - b.top) < 2 };
            });
            assert.ok(box.top >= 0 && box.bottom <= box.vh, `${w}×${h}: "Iniciar Caçada" visível sem rolar (${Math.round(box.bottom)} ≤ ${box.vh})`);
            assert.ok(box.sideBySide, `${w}×${h}: os cartões ficam lado a lado`);
        }
        await page.setViewport({ width: 1280, height: 720 });
        console.log('  ✓ Celular (390×844, 375×667, 844×390, 667×375): "Iniciar Caçada" na primeira tela');

        // 13. Resetar o progresso tranca a Fase II de novo e volta para a Fase I
        await page.click('#resetProgressBtn');
        await page.keyboard.press('2');   // modal aberto: a tecla não faz nada
        await page.click('#confirmResetBtn');
        c = await cards();
        assert.ok(c[1].locked && c[0].selected, 'Depois de resetar, a Fase II volta a ficar trancada');
        assert.strictEqual(await G(() => window.__game.sceneryTheme), 'deserto');
        console.log('  ✓ Resetar progresso tranca a Fase II e volta ao deserto');

        assert.deepStrictEqual(pageErrors, [], 'Sem erros na página');
        console.log('\n🎉 TESTE DA FASE II (FLORESTA AMALDIÇOADA) APROVADO!');
    } catch (err) {
        console.error('❌ Erro no teste da Fase II:', err);
        if (pageErrors.length) console.error('Erros da página:', pageErrors);
        process.exitCode = 1;
    } finally {
        await browser.close();
        server.close();
    }
})();
