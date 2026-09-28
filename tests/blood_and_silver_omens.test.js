const puppeteer = require('puppeteer');
const path = require('path');
const assert = require('assert');

// Presságios: bloqueados até 2 chefes no total; depois, uma carta antes de cada caçada. Com 3 chefes
// numa caçada ("Tecelão do Destino"), mais uma carta a cada 4 min, até 3. Confere os 10 efeitos.
(async () => {
    console.log('🎴 Testando os Presságios do Sangue & Prata...');
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
        await page.evaluate(() => localStorage.removeItem('blood_and_silver_progression'));
        await page.reload({ waitUntil: 'load' });
        const visible = sel => page.$eval(sel, el => !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none');
        const status = () => page.evaluate(() => window.__game.game.status);
        // Arena calma: sem inimigos novos, chefes ou level-up interferindo nas contas
        const calm = () => page.evaluate(() => {
            const G = window.__game;
            G.player.xpToNext = 1e9;
            G.player.hp = G.player.maxHp;
            G.enemies.forEach(e => { e.alive = false; });
            G.game.spawnTimer = 1e9;
            G.game.bossTimer = 1e9;
        });

        // 1. Sem a conquista: as cartas aparecem bloqueadas na tela inicial e "Iniciar" vai direto para a caçada
        assert.ok((await page.$eval('#omenTeaser', el => el.textContent)).includes('2 Vampiros Anciões'), 'A tela inicial anuncia como liberar os Presságios');
        const minis = await page.$$eval('#omenMinis .omen-mini', els => els.map(e => ({ locked: e.classList.contains('locked'), art: !!e.querySelector('svg'), filter: getComputedStyle(e).filter })));
        assert.strictEqual(minis.length, 10, 'As 10 cartas aparecem na tela inicial');
        assert.ok(minis.every(m => m.locked && m.art && m.filter.includes('grayscale')), `Todas apagadas (bloqueadas): ${JSON.stringify(minis[0])}`);
        await page.hover('#omenMinis .omen-mini:nth-child(7)');
        const lockTip = await page.$eval('#tooltip', el => ({ visible: el.classList.contains('visible'), text: el.textContent }));
        assert.ok(lockTip.visible, 'Passar o mouse mostra o tooltip');
        assert.ok(lockTip.text.includes('O Sino dos Mortos') && lockTip.text.includes('ainda não tem este recurso') && lockTip.text.includes('(0/2)'), `Tooltip de bloqueio (${lockTip.text})`);
        await page.click('#omenMinis .omen-mini:nth-child(7)');
        assert.strictEqual(await status(), 'menu', 'Carta bloqueada não faz nada ao clicar');
        assert.strictEqual(await visible('#omenScreen'), false);
        await page.mouse.move(5, 5);
        console.log('  ✓ Bloqueados: 10 cartas apagadas na tela inicial, tooltip "ainda não tem este recurso (0/2)"');
        await page.click('#startBtn');
        await page.waitForFunction(() => window.__game.game.status === 'playing', { timeout: 5000 });
        assert.strictEqual(await visible('#omenScreen'), false, 'Sem a conquista não há escolha de carta');
        assert.deepStrictEqual(await page.evaluate(() => window.__game.game.omens), []);
        console.log('  ✓ Bloqueados: a caçada começa sem carta');

        // 2. O 2º chefe derrotado (no total) libera "Leitor de Presságios"
        await calm();
        const unlocked = await page.evaluate(() => {
            const G = window.__game;
            G.getProgression().bossKills = 1;
            const e = G.enemies[0];
            Object.assign(e, { alive: true, isBoss: true, x: G.player.x + 400, y: G.player.y, hp: 1, maxHp: 1 });
            G.hitEnemy(e, 10);
            return { list: G.getProgression().unlockedAchievements.slice(), run: G.game.bossKillsRun };
        });
        assert.ok(unlocked.list.includes('omens'), 'O 2º chefe libera os Presságios');
        assert.ok(!unlocked.list.includes('omens_plus'), '1 chefe na caçada ainda não libera o Tecelão do Destino');
        assert.strictEqual(unlocked.run, 1);
        console.log('  ✓ 2º chefe no total libera a conquista "Leitor de Presságios"');

        // 3. Nova caçada: escolha entre as 10 cartas (Esc volta; Enter não "clica" o botão escondido)
        await page.evaluate(() => { const G = window.__game; G.player.hitCooldown = 0; G.player.wardCharges = 0; G.damagePlayer(99999); });
        await page.waitForFunction(() => window.__game.game.status === 'gameover', { timeout: 5000 });
        await page.click('#restartBtn');
        assert.strictEqual(await visible('#omenScreen'), true, 'Com a conquista, "Jogar de novo" abre os Presságios');
        const picker = await page.evaluate(() => ({
            cards: Array.from(document.querySelectorAll('#omenCards .omen-card')).map(c => c.querySelector('.omen-name').textContent),
            art: document.querySelectorAll('#omenCards .omen-card .omen-art svg path, #omenCards .omen-card .omen-art svg circle').length,
            title: document.getElementById('omenTitle').textContent,
            buttons: getComputedStyle(document.getElementById('omenStartButtons')).display
        }));
        assert.strictEqual(picker.cards.length, 10, `10 cartas (${picker.cards})`);
        assert.ok(picker.art >= 20, 'Cada carta tem seu emblema desenhado');
        assert.strictEqual(picker.title, 'PRESSÁGIOS');
        assert.notStrictEqual(picker.buttons, 'none', 'Antes da caçada dá para seguir sem carta ou voltar');
        await page.keyboard.press('Enter');
        assert.strictEqual(await status(), 'gameover', 'Enter não escolhe carta nem inicia');
        await page.keyboard.press('Escape');
        assert.strictEqual(await visible('#omenScreen'), false, 'Esc fecha os Presságios');
        assert.strictEqual(await visible('#gameoverScreen'), true, 'Esc volta para a tela de fim de jogo');
        console.log('  ✓ 10 cartas antes da caçada; Esc volta à tela anterior');

        // 4. Escolhe o Pacto Rubro (9ª carta) pelo clique: +40% de dano, −30% de vida máxima
        await page.click('#restartBtn');
        await page.click('#omenCards .omen-card:nth-child(9)');
        await page.waitForFunction(() => window.__game.game.status === 'playing', { timeout: 5000 });
        let st = await page.evaluate(() => {
            const G = window.__game;
            return { omens: G.game.omens.slice(), might: G.player.stats.might, maxHp: G.player.maxHp, hp: G.player.hp, run: G.game.bossKillsRun, chips: document.querySelectorAll('#omensRow .omen-chip').length, last: G.getProgression().lastOmen, pickerHidden: document.getElementById('omenScreen').classList.contains('hidden') };
        });
        assert.deepStrictEqual(st.omens, ['crimson_pact']);
        assert.ok(Math.abs(st.might - 1.4) < 1e-9, `Dano ×1,4 (${st.might})`);
        assert.deepStrictEqual([st.maxHp, st.hp], [70, 70], 'Vida máxima 100 → 70 e começa cheia');
        assert.strictEqual(st.run, 0, 'A contagem de chefes da caçada zera');
        assert.strictEqual(st.chips, 1, 'O HUD mostra a carta ativa');
        assert.strictEqual(st.last, 'crimson_pact', 'A última carta escolhida fica guardada');
        assert.ok(st.pickerHidden);
        console.log('  ✓ Pacto Rubro escolhido: dano ×1,4, vida máx. 70, carta no HUD');

        // 5. Sem o Tecelão do Destino, os 4 min passam sem nova carta
        await calm();
        await page.evaluate(() => { window.__game.game.time = 239.9; });
        await page.waitForFunction(() => window.__game.game.time > 240.2, { timeout: 3000 });
        assert.strictEqual(await status(), 'playing', 'Sem a 2ª conquista não surge carta nova');
        assert.strictEqual(await page.evaluate(() => window.__game.game.nextOmenAt), 480);
        console.log('  ✓ Sem "Tecelão do Destino": nada aos 4 min');

        // 6. 3 chefes nesta caçada liberam o Tecelão do Destino
        const plus = await page.evaluate(() => {
            const G = window.__game;
            for (let i = 0; i < 3; i++) {
                const e = G.enemies[i];
                Object.assign(e, { alive: true, isBoss: true, x: G.player.x + 400, y: G.player.y + i * 40, hp: 1, maxHp: 1 });
                G.hitEnemy(e, 10);
            }
            G.chests.forEach(c => { c.alive = false; });
            G.xpOrbs.forEach(o => { o.alive = false; });
            return { run: G.game.bossKillsRun, list: G.getProgression().unlockedAchievements.slice() };
        });
        assert.strictEqual(plus.run, 3);
        assert.ok(plus.list.includes('omens_plus'), '3 chefes numa caçada liberam o Tecelão do Destino');
        console.log('  ✓ 3 chefes na mesma caçada liberam "Tecelão do Destino"');

        // 7. Aos 8 min surge a 2ª carta (sem as já ativas); escolhe pelo teclado
        await calm();
        await page.evaluate(() => { window.__game.game.time = 479.9; });
        await page.waitForFunction(() => window.__game.game.status === 'omen', { timeout: 3000 });
        const run = await page.evaluate(() => ({
            cards: Array.from(document.querySelectorAll('#omenCards .omen-card .omen-name')).map(n => n.textContent),
            sub: document.getElementById('omenSubtitle').textContent,
            buttons: getComputedStyle(document.getElementById('omenStartButtons')).display
        }));
        assert.strictEqual(run.cards.length, 9, 'A carta ativa não se repete');
        assert.ok(!run.cards.includes('O Pacto Rubro'));
        assert.ok(run.sub.includes('2 de 3'), `Subtítulo mostra a contagem (${run.sub})`);
        assert.strictEqual(run.buttons, 'none', 'No meio da caçada é preciso escolher');
        const frozenTime = await page.evaluate(() => window.__game.game.time);
        await page.keyboard.press('Escape');
        await new Promise(r => setTimeout(r, 150));
        assert.strictEqual(await status(), 'omen', 'Esc não pula a escolha no meio da caçada');
        assert.strictEqual(await page.evaluate(() => window.__game.game.time), frozenTime, 'O tempo para durante a escolha');
        await page.keyboard.press('1');
        st = await page.evaluate(() => ({ omens: window.__game.game.omens.slice(), status: window.__game.game.status, chips: document.querySelectorAll('#omensRow .omen-chip').length }));
        assert.deepStrictEqual(st.omens, ['crimson_pact', 'raven']);
        assert.strictEqual(st.status, 'playing');
        assert.strictEqual(st.chips, 2);
        console.log('  ✓ 8 min: 2ª carta (9 opções, tecla 1 = Corvo Faminto)');

        // 8. Aos 12 min a 3ª; aos 16 min, com 3 cartas, nenhuma
        await calm();
        await page.evaluate(() => { window.__game.game.time = 719.9; });
        await page.waitForFunction(() => window.__game.game.status === 'omen', { timeout: 3000 });
        assert.strictEqual(await page.$$eval('#omenCards .omen-card', c => c.length), 8);
        const knellIdx = await page.$$eval('#omenCards .omen-name', ns => ns.findIndex(n => n.textContent === 'O Sino dos Mortos') + 1);
        await page.click(`#omenCards .omen-card:nth-child(${knellIdx})`);
        assert.deepStrictEqual(await page.evaluate(() => window.__game.game.omens), ['crimson_pact', 'raven', 'death_knell']);
        await calm();
        await page.evaluate(() => { window.__game.game.time = 959.9; });
        await page.waitForFunction(() => window.__game.game.time > 960.2, { timeout: 3000 });
        assert.strictEqual(await status(), 'playing', 'Máximo de 3 cartas');
        console.log('  ✓ 12 min: 3ª carta; 16 min: nada (máximo de 3)');

        // 9. Efeitos das 10 cartas
        const fx = await page.evaluate(() => {
            const G = window.__game, p = G.player, out = {};
            const set = ids => { G.game.omens = ids; G.recomputeStats(); };
            G.enemies.forEach(e => { e.alive = false; });
            p.weapons = [G.makeWeapon('sword')];
            p.passives = [];
            p.level = 1;

            set([]);
            out.base = { radius: p.collectRadius, cooldown: p.stats.cooldown, might: p.stats.might, speed: p.stats.move_speed, maxHp: p.maxHp };
            set(['raven']);
            out.raven = p.collectRadius;
            set(['broken_clock']);
            out.clock = p.stats.cooldown;
            p.level = 6;
            set(['silver_hourglass']);
            out.hourglass = { might: p.stats.might, speed: p.stats.move_speed };
            p.level = 1;
            set([]);
            out.pityBase = G.chestPityTime();
            set(['lighthouse']);
            out.pityLight = G.chestPityTime();
            // Pacto Rubro no meio da caçada: a vida cai na mesma proporção da vida máxima
            set([]);
            p.hp = 55;
            set(['crimson_pact']);
            out.pact = { max: p.maxHp, hp: p.hp };
            set([]);
            return out;
        });
        assert.ok(Math.abs(fx.raven - fx.base.radius - 120) < 1e-9, `Corvo: atrai de +120 (${fx.base.radius} → ${fx.raven})`);
        assert.ok(Math.abs(fx.clock - fx.base.cooldown * 0.8) < 1e-9, `Relógio: recarga ×0,8 (${fx.clock})`);
        assert.ok(Math.abs(fx.hourglass.might - 1.1) < 1e-9 && Math.abs(fx.hourglass.speed - 1.05) < 1e-9, `Ampulheta nv 6: +10% dano, +5% velocidade (${JSON.stringify(fx.hourglass)})`);
        assert.ok(Math.abs(fx.pityLight - fx.pityBase * 0.6) < 1e-9, `Farol: baú garantido 40% mais cedo (${fx.pityBase} → ${fx.pityLight})`);
        // (os 4 min simulados liberaram as conquistas de tempo: +10% de vida máxima)
        assert.strictEqual(fx.base.maxHp, 110, 'Sem o Pacto, a vida máxima volta ao normal');
        assert.deepStrictEqual(fx.pact, { max: 77, hp: 38.5 }, `Pacto no meio da caçada: 55/110 → 38,5/77 (${JSON.stringify(fx.pact)})`);
        console.log('  ✓ Corvo (+120 de atração), Relógio (×0,8), Ampulheta (nv 6: +10%/+5%), Farol (60 s → 36 s), Pacto proporcional (55/110 → 38,5/77)');

        // Corvo: gema vale +25%
        const xp = await page.evaluate(async () => {
            const G = window.__game, p = G.player;
            G.game.omens = ['raven']; G.recomputeStats();
            p.xp = 0;
            const o = G.xpOrbs.find(x => !x.alive);
            Object.assign(o, { alive: true, x: p.x, y: p.y, value: 4, radius: 6, vacuumed: false });
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            return p.xp;
        });
        assert.strictEqual(xp, 5, `Corvo: gema de 4 vale 5 (${xp})`);
        console.log('  ✓ Corvo: gemas valem +25%');

        // Espelho: +1 projétil no Arco e golpe 30% mais largo
        const mirror = await page.evaluate(async () => {
            const G = window.__game, p = G.player;
            const shots = ids => {
                G.game.omens = ids; G.recomputeStats();
                G.projectiles.forEach(x => { x.alive = false; });
                const w = G.makeWeapon('bow');
                G.fireWeapon(w);
                return G.projectiles.filter(x => x.alive).length;
            };
            G.enemies.forEach(e => { e.alive = false; });
            const e = G.enemies[0];
            Object.assign(e, { alive: true, isBoss: false, type: 'v1', x: p.x + 200, y: p.y, hp: 1e6, maxHp: 1e6, radius: 14 });
            await new Promise(r => requestAnimationFrame(r));
            const r = { plain: shots([]), mirror: shots(['shattered_mirror']) };
            // Espada (±22,5°): inimigo a 26° só é atingido com o Espelho (±29°)
            const hitAt = ids => {
                G.game.omens = ids; G.recomputeStats();
                const a = 26 * Math.PI / 180;
                Object.assign(e, { x: p.x + Math.cos(a) * 60, y: p.y + Math.sin(a) * 60, hp: 1e6 });
                p.facing = 0;
                return new Promise(res => requestAnimationFrame(() => {
                    const hp0 = e.hp;
                    G.fireWeapon(G.makeWeapon('sword'));
                    res(e.hp < hp0);
                }));
            };
            r.swordPlain = await hitAt([]);
            r.swordMirror = await hitAt(['shattered_mirror']);
            G.projectiles.forEach(x => { x.alive = false; });
            e.alive = false;
            return r;
        });
        assert.deepStrictEqual([mirror.plain, mirror.mirror], [1, 2], `Espelho: Arco dispara 2 em vez de 1 (${JSON.stringify(mirror)})`);
        assert.deepStrictEqual([mirror.swordPlain, mirror.swordMirror], [false, true], `Espelho: golpe da Espada mais largo (${JSON.stringify(mirror)})`);
        console.log('  ✓ Espelho: Arco 1 → 2 flechas; Espada alcança 26° só com a carta');

        // Coroa de Espinhos, Lua de Sangue e Chama Sepulcral (sorte fixada)
        const combat = await page.evaluate(async () => {
            const G = window.__game, p = G.player, r = {};
            const spawn = (dx, dy, hp) => {
                const e = G.enemies.find(x => !x.alive);
                Object.assign(e, { alive: true, isBoss: false, type: 'v1', x: p.x + dx, y: p.y + dy, hp: hp, maxHp: hp, radius: 14 });
                return e;
            };
            const frame = () => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
            G.enemies.forEach(e => { e.alive = false; });
            p.hp = p.maxHp = 100;
            // Coroa: golpe de 10 fere com 40 quem está perto; longe, não
            G.game.omens = ['thorn_crown'];
            const near = spawn(80, 0, 1000), far = spawn(400, 0, 1000);
            await frame();
            p.hitCooldown = 0; p.shield = 0; p.wardCharges = 0;
            G.damagePlayer(10);
            r.thorn = { near: 1000 - near.hp, far: 1000 - far.hp };
            near.alive = far.alive = false;
            // Lua de Sangue: com sorte, abate cura 2
            const rnd = Math.random;
            Math.random = () => 0;
            try {
                G.game.omens = ['blood_moon'];
                p.hp = 50;
                const a = spawn(300, 300, 1);
                G.hitEnemy(a, 5);
                r.moon = p.hp;
            } finally {
                Math.random = rnd;
            }
            // Chama: o abatido explode um instante depois e fere o vizinho com metade da vida dele
            G.game.omens = ['grave_flame'];
            const src = spawn(-300, 0, 60), nb = spawn(-300 + 40, 0, 1000), off = spawn(-300 + 200, 0, 1000);
            await frame();
            Math.random = () => 0;
            try { G.hitEnemy(src, 100); } finally { Math.random = rnd; }
            r.flameNow = 1000 - nb.hp;
            await new Promise(res => setTimeout(res, 350));
            r.flame = { nb: 1000 - nb.hp, off: 1000 - off.hp };
            nb.alive = off.alive = false;
            // Horda densa: a cadeia se espalha por vários quadros, no máximo 4 explosões por quadro
            G.enemies.forEach(e => { e.alive = false; });
            const pack = [];
            for (let i = 0; i < 60; i++) pack.push(spawn(-200 + (i % 10) * 12, 200 + Math.floor(i / 10) * 12, 20));
            await frame();
            const perFrame = [];
            let dead0 = 0;
            Math.random = () => 0;   // toda morte explode
            try {
                // duas explosões sobrepostas matam (cada uma tira metade da vida)
                G.hitEnemy(pack[0], 100);
                G.hitEnemy(pack[1], 100);
                for (let f = 0; f < 40; f++) {
                    await new Promise(res => requestAnimationFrame(res));
                    const dead = pack.filter(e => !e.alive).length;
                    perFrame.push(dead - dead0);
                    dead0 = dead;
                }
            } finally {
                Math.random = rnd;
            }
            r.chain = { total: dead0, maxPerFrame: Math.max.apply(null, perFrame) };
            pack.forEach(e => { e.alive = false; });
            return r;
        });
        assert.deepStrictEqual(combat.thorn, { near: 40, far: 0 }, `Coroa: 400% do golpe em quem está perto (${JSON.stringify(combat.thorn)})`);
        assert.strictEqual(combat.moon, 52, `Lua de Sangue: abate cura 2 (${combat.moon})`);
        assert.strictEqual(combat.flameNow, 0, 'A explosão sai um instante depois do abate');
        assert.deepStrictEqual(combat.flame, { nb: 30, off: 0 }, `Chama Sepulcral: vizinho sofre metade da vida do abatido (${JSON.stringify(combat.flame)})`);
        assert.ok(combat.chain.total > 20, `A explosão encadeia pela horda (${JSON.stringify(combat.chain)})`);
        assert.ok(combat.chain.maxPerFrame <= 40, `A cadeia se espalha por vários quadros (${JSON.stringify(combat.chain)})`);
        console.log('  ✓ Coroa (golpe de 10 → 40 ao redor), Lua de Sangue (+2 de vida), Chama Sepulcral (30 no vizinho, cadeia em vários quadros)');

        // Sino dos Mortos: badalo paralisa (sem andar nem ferir) por 2 s
        const knell = await page.evaluate(async () => {
            const G = window.__game, p = G.player;
            G.enemies.forEach(e => { e.alive = false; });
            G.game.omens = ['death_knell'];
            const weapons = p.weapons;
            p.weapons = [];   // sem golpes: o empurrão das armas não conta como andar
            const e = G.enemies[0];
            Object.assign(e, { alive: true, isBoss: false, type: 'v1', x: p.x + 20, y: p.y, hp: 1e6, maxHp: 1e6, radius: 14, damage: 10 });
            p.hp = p.maxHp; p.hitCooldown = 0; p.wardCharges = 0;
            G.game.knellTimer = 0.01;
            await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
            const r = { freeze: G.game.freezeTimer, next: G.game.knellTimer, x0: e.x, hp0: p.hp };
            await new Promise(res => setTimeout(res, 500));
            r.moved = Math.abs(e.x - r.x0);
            r.hp1 = p.hp;
            e.alive = false;
            p.weapons = weapons;
            return r;
        });
        assert.ok(knell.freeze > 1.8 && knell.freeze <= 2, `Paralisia de 2 s (${knell.freeze})`);
        assert.ok(knell.next > 14.5, `Próximo badalo em 15 s (${knell.next})`);
        assert.strictEqual(knell.moved, 0, 'Inimigo paralisado não anda');
        assert.strictEqual(knell.hp1, knell.hp0, 'Inimigo paralisado não fere por contato');
        console.log('  ✓ Sino dos Mortos: badalo a cada 15 s paralisa por 2 s (sem andar nem ferir)');

        // Farol: a roleta do baú comum gira 2 vezes
        const spins = await page.evaluate(() => {
            const G = window.__game;
            G.game.omens = ['lighthouse'];
            G.enemies.forEach(e => { e.alive = false; });
            G.player.weapons = [G.makeWeapon('sword'), G.makeWeapon('bow')];   // o baú comum só melhora o que já se tem
            G.player.passives = [G.makePassive('amulet')];
            const chest = G.chests[0];
            chest.rarity = 'common';
            chest.alive = true;
            G.openChest(chest);
            return document.querySelectorAll('#chestCards .upgrade-card').length;
        });
        assert.strictEqual(spins, 2, `Farol: baú comum sorteia 2 prêmios (${spins})`);
        await page.click('#chestBtn');
        console.log('  ✓ Farol: a roleta gira uma vez a mais');

        // 10. Pausa lista as cartas; a próxima caçada marca a última escolhida
        await page.evaluate(() => { window.__game.game.omens = ['crimson_pact', 'raven', 'death_knell']; });
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => window.__game.game.status === 'paused', { timeout: 2000 });
        const pauseList = await page.$eval('#pauseOmens', el => el.textContent);
        assert.ok(pauseList.includes('O Pacto Rubro') && pauseList.includes('O Sino dos Mortos'), `Pausa lista os presságios (${pauseList})`);
        await page.keyboard.press('Escape');
        await page.evaluate(() => { const G = window.__game; G.player.hitCooldown = 0; G.player.wardCharges = 0; G.damagePlayer(99999); });
        await page.waitForFunction(() => window.__game.game.status === 'gameover', { timeout: 5000 });
        await page.click('#restartBtn');
        const lastCard = await page.$eval('#omenCards .omen-last .omen-name', el => el.textContent);
        assert.strictEqual(lastCard, 'O Pacto Rubro', 'A última carta escolhida vem marcada');
        await page.click('#omenSkipBtn');
        await page.waitForFunction(() => window.__game.game.status === 'playing', { timeout: 5000 });
        st = await page.evaluate(() => ({ omens: window.__game.game.omens.slice(), maxHp: window.__game.player.maxHp, chips: document.querySelectorAll('#omensRow .omen-chip').length }));
        assert.deepStrictEqual(st, { omens: [], maxHp: fx.base.maxHp, chips: 0 }, 'Caçar sem presságio começa sem cartas');
        console.log('  ✓ Pausa lista as cartas; "Caçar sem presságio" começa limpo; última carta marcada');

        // 11. Liberados: na tela inicial as cartas ficam coloridas e um clique abre a escolha
        await page.reload({ waitUntil: 'load' });
        const open = await page.$$eval('#omenMinis .omen-mini', els => els.map(e => e.classList.contains('locked')));
        assert.ok(open.length === 10 && open.every(l => !l), 'Com a conquista, as cartas deixam de estar bloqueadas');
        await page.hover('#omenMinis .omen-mini:nth-child(2)');
        const tip = await page.$eval('#tooltip', el => el.textContent);
        assert.ok(tip.includes('A Lua de Sangue') && !tip.includes('ainda não tem'), `Tooltip da carta liberada (${tip})`);
        await page.click('#omenMinis .omen-mini:nth-child(2)');
        assert.strictEqual(await visible('#omenScreen'), true, 'Clique na carta liberada abre a escolha');
        assert.strictEqual(await page.$eval('#tooltip', el => el.classList.contains('visible')), false, 'O tooltip some ao abrir a escolha');
        console.log('  ✓ Liberados: cartas coloridas na tela inicial; clique abre a escolha');

        assert.strictEqual(pageErrors.length, 0, `Nenhum erro de página deve ocorrer (encontrado: ${pageErrors.join(', ')})`);
        console.log('\n🎉 TESTE DOS PRESSÁGIOS APROVADO!');
    } catch (err) {
        console.error('❌ Erro no teste dos Presságios:', err);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();
