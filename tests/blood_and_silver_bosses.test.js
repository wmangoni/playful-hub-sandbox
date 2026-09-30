const puppeteer = require('puppeteer');
const express = require('express');
const path = require('path');
const assert = require('assert');

// Chefes mais perigosos (TASK_020): perseguem ~3× mais rápido, têm mais vida, reaparecem do outro
// lado da tela quando ficam para trás (teleporte), disparam um raio telegrafado (recarga de 6 s) e,
// abaixo de metade da vida, entram em frenesi (mais rápidos, raio a cada 3 s). A Fase II ficou um
// pouco mais dura (multiplicadores da horda em PHASES[2].diff) e a Fase I não muda.
(async () => {
    console.log('👑 Testando os chefes (teleporte, raio, frenesi) e a dificuldade das fases...');
    const app = express();
    app.use(express.static(path.resolve(__dirname, '..')));
    const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const url = `http://localhost:${server.address().port}/blood_and_silver/index.html`;
    const pageErrors = [];

    // Abre uma caçada na fase pedida com a simulação sob controle do teste (__game.step)
    async function hunt(phase) {
        const page = await browser.newPage();
        page.on('pageerror', err => pageErrors.push(err.toString()));
        await page.setViewport({ width: 1280, height: 720 });
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.evaluate(p => {
            localStorage.clear();
            localStorage.setItem('blood_and_silver_progression', JSON.stringify({ bestTime: 700, lastPhase: p }));
        }, phase);
        await page.reload({ waitUntil: 'networkidle0' });
        await page.waitForFunction(() => window.__game && !window.__game.sceneryBuilding, { timeout: 30000 });
        await page.click('#startBtn');
        await page.evaluate(() => {
            const G = window.__game, P = G.player, g = G.game;
            g.status = 'paused';                     // só __game.step avança
            P.xpToNext = 1e9; g.spawnTimer = 1e9; g.chestTimer = 1e9;
            G.enemies.forEach(e => { e.alive = false; });
            window.__steps = n => { for (let i = 0; i < n; i++) G.step(1 / 60); };
            window.__key = (k, on) => window.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { key: k }));
            window.__boss = () => {                  // chefe novo na tela, pronto para o teste
                if (g.activeBoss) { g.activeBoss.alive = false; g.activeBoss = null; }
                g.bossTimer = 0.001;
                G.step(1 / 60);
                const b = g.activeBoss;
                b.x = P.x + 260; b.y = P.y; b.seen = true;
                P.hp = P.maxHp = 1e5; P.hitCooldown = 0;
                return b;
            };
        });
        return page;
    }

    try {
        // 1. Números: ~3× mais rápido, mais vida, todo chefe com raio
        const page1 = await hunt(1);
        const cfg = await page1.evaluate(() => {
            const G = window.__game;
            return { speed: G.CONFIG.boss.speed, hp: G.CONFIG.boss.baseHp, beams: Object.keys(G.BOSS_TYPES).map(k => !!G.BOSS_TYPES[k].beam), B: G.BOSS_BEAM, diff1: G.PHASES[1].diff, diff2: G.PHASES[2].diff };
        });
        assert.ok(cfg.speed >= 28 && cfg.speed <= 42, `Chefe 2–3× mais rápido que os 14 de antes (${cfg.speed})`);
        assert.ok(cfg.hp > 800, `Chefe com mais vida que os 800 de antes (${cfg.hp})`);
        assert.ok(cfg.beams.every(Boolean), 'Todos os chefes têm o raio');
        assert.strictEqual(cfg.B.cooldown, 6, 'Raio com recarga de 6 s');
        assert.strictEqual(cfg.B.frenzyCooldown, 3, 'Raio a cada 3 s no frenesi');
        console.log(`  ✓ Chefes: velocidade ${cfg.speed} (antes 14), vida base ${cfg.hp} (antes 800), raio em todos (6 s → 3 s no frenesi)`);

        // 2. Dificuldade: a Fase I não muda; a Fase II vem mais forte
        for (const k of ['hp', 'speed', 'damage', 'spawn', 'boss']) assert.strictEqual(cfg.diff1[k], 1, `Fase I sem multiplicador de ${k}`);
        assert.ok(cfg.diff2.hp > 1 && cfg.diff2.speed > 1 && cfg.diff2.damage > 1 && cfg.diff2.spawn < 1 && cfg.diff2.boss > 1, `Fase II mais dura (${JSON.stringify(cfg.diff2)})`);
        const horde1 = await page1.evaluate(() => {
            const G = window.__game, g = G.game;
            g.time = 100;
            const out = {};
            for (const k of ['v1', 'v2', 'v3']) {
                const e = G.spawnEnemy(k, 0), T = G.ENEMY_TYPES[k];
                out[k] = { hp: e.hp === T.hp * (1 + 100 * 0.032), speed: e.speed === T.speed * (1 + 100 * 0.008), damage: e.damage === T.damage };
                e.alive = false;
            }
            return out;
        });
        for (const k in horde1) assert.deepStrictEqual(horde1[k], { hp: true, speed: true, damage: true }, `Fase I: ${k} igual ao de antes`);
        const page2 = await hunt(2);
        const horde2 = await page2.evaluate(() => {
            const G = window.__game, g = G.game, d = G.PHASES[2].diff;
            g.time = 100;
            const out = {};
            for (const k of ['skeleton', 'zombie', 'mummy', 'bat']) {
                const e = G.spawnEnemy(k, 0), T = G.ENEMY_TYPES[k];
                out[k] = { hp: +(e.hp / (T.hp * (1 + 100 * 0.032))).toFixed(3), speed: +(e.speed / (T.speed * (1 + 100 * 0.008))).toFixed(3), damage: e.damage === Math.round(T.damage * d.damage) };
                e.alive = false;
            }
            return { out: out, d: d };
        });
        for (const k in horde2.out) {
            assert.strictEqual(horde2.out[k].hp, horde2.d.hp, `Fase II: ${k} com +vida`);
            assert.strictEqual(horde2.out[k].speed, horde2.d.speed, `Fase II: ${k} mais rápido`);
            assert.ok(horde2.out[k].damage, `Fase II: ${k} com +dano (inteiro)`);
        }
        console.log(`  ✓ Fase I idêntica; Fase II: vida ×${horde2.d.hp}, velocidade ×${horde2.d.speed}, dano ×${horde2.d.damage}, levas ×${horde2.d.spawn}, chefe ×${horde2.d.boss}`);

        // 3. Teleporte: o caçador corre para a direita, o chefe some pela esquerda e surge à frente
        const tp = await page1.evaluate(() => {
            const G = window.__game, P = G.player, b = window.__boss(), T = G.BOSS_TP;
            b.beamT = 99;
            window.__key('d', true);
            window.__steps(2);
            b.x = G.camera.x - 180; b.y = P.y;       // ficou para trás, fora da tela
            let n = 0;
            while (!(b.tpT > 0) && n++ < 120) window.__steps(1);
            const warned = b.tpT > 0, waitedSteps = n;
            const dest = { dx: b.tpX - P.x, sx: b.tpX - G.camera.x, sy: b.tpY - G.camera.y };
            const hidden = G.game.activeBoss === b && b.tpT > 0;
            n = 0;
            while (b.tpT > 0 && n++ < 120) window.__steps(1);
            window.__key('d', false);
            return { warned: warned, waitedSteps: waitedSteps, hidden: hidden, dest: dest, arrived: Math.hypot(b.x - b.tpX, b.y - b.tpY) < 60, onScreenX: b.x - G.camera.x, cd: b.tpCd, warn: T.warn, hide: T.hideAfter };
        });
        assert.ok(tp.warned, 'O chefe que fica para trás some (teleporte)');
        assert.ok(tp.waitedSteps / 60 <= tp.hide + 0.1, `Some logo depois de sair da tela (${(tp.waitedSteps / 60).toFixed(2)} s)`);
        assert.ok(tp.dest.dx > 150, `Reaparece à frente de quem corre para a direita (${Math.round(tp.dest.dx)} px)`);
        assert.ok(tp.dest.sx > 0 && tp.dest.sx < 960 && tp.dest.sy > 0 && tp.dest.sy < 540, `O destino fica dentro da tela (${Math.round(tp.dest.sx)}, ${Math.round(tp.dest.sy)})`);
        assert.ok(tp.arrived && tp.onScreenX > 480 && tp.onScreenX < 960, `Surge do outro lado da tela (${Math.round(tp.onScreenX)} px)`);
        assert.ok(tp.cd > 0, 'Depois de surgir espera antes de outro teleporte');
        console.log(`  ✓ Teleporte: sumiu ${(tp.waitedSteps / 60).toFixed(2)} s após sair da tela e surgiu ${Math.round(tp.dest.dx)} px à frente (aviso de ${tp.warn} s)`);

        // 4. Raio: carga seguindo o caçador, mira travada, dano em quem fica na linha, recarga de 6 s
        const beam = await page1.evaluate(() => {
            const G = window.__game, P = G.player, B = G.BOSS_BEAM, b = window.__boss();
            b.speed = 0;
            b.beamT = 0.001;
            window.__steps(1);
            const started = b.beamS === 1;
            // enquanto segue: o caçador anda 30 px para baixo e a mira acompanha
            const a0 = b.beamAng;
            P.y += 30;
            window.__steps(6);
            const followed = Math.abs(b.beamAng - a0) > 0.05;
            while (b.beamClock < B.charge - B.lock + 0.02) window.__steps(1);
            const aLock = b.beamAng;
            P.y += 6;                                 // travada: não segue mais (6 px, ainda na linha)
            window.__steps(3);
            const locked = b.beamAng === aLock;
            const hp0 = P.hp;
            let n = 0;
            while (b.beamS !== 0 && n++ < 90) window.__steps(1);
            return { started: started, followed: followed, locked: locked, dmg: hp0 - P.hp, cd: b.beamT, def: b.def.beam.damage };
        });
        assert.ok(beam.started, 'O raio começa com o chefe à vista');
        assert.ok(beam.followed, 'Na carga a mira segue o caçador');
        assert.ok(beam.locked, 'No fim da carga a mira trava');
        assert.ok(Math.abs(beam.dmg - beam.def) < 1, `Quem fica na linha leva o raio (${beam.dmg.toFixed(1)} de ${beam.def})`);
        assert.ok(beam.cd > 5.9 && beam.cd <= 6, `Recarga de 6 s depois do raio (${beam.cd.toFixed(2)})`);
        const dodge = await page1.evaluate(() => {
            const G = window.__game, P = G.player, B = G.BOSS_BEAM, b = G.game.activeBoss;
            P.hitCooldown = 0;
            b.beamT = 0.001;
            window.__steps(1);
            while (b.beamClock < B.charge - B.lock + 0.02) window.__steps(1);
            P.y += 45;                                // travou: um passo para o lado basta
            const hp0 = P.hp;
            let n = 0;
            while (b.beamS !== 0 && n++ < 90) window.__steps(1);
            const dodged = hp0 - P.hp;
            // fora da tela ele não atira
            b.x = G.camera.x - 300; b.beamT = 0.001; b.tpCd = 99;
            window.__steps(5);
            return { dodged: dodged, offscreen: b.beamS };
        });
        assert.ok(dodge.dodged < 1, `Desviando de lado depois da trava, o raio erra (${dodge.dodged})`);
        assert.strictEqual(dodge.offscreen, 0, 'Com o chefe fora da tela o raio não começa');
        console.log(`  ✓ Raio: mira segue, trava e acerta ${beam.def} em quem fica na linha; um passo de lado desvia; recarga de 6 s; nada de tiro de fora da tela`);

        // 5. Frenesi abaixo de metade da vida: aviso, mais rápido e raio a cada 3 s
        const fr = await page1.evaluate(() => {
            const G = window.__game, P = G.player, B = G.BOSS_BEAM, b = window.__boss();
            b.beamT = 99;
            const x0 = b.x; window.__steps(30); const calm = Math.abs(b.x - x0) / 0.5;
            b.x = P.x + 260; b.y = P.y;
            b.hp = b.maxHp * 0.49;
            window.__steps(1);
            const on = b.frenzy, bar = document.querySelector('.boss-bar').classList.contains('frenzy'), cdNow = b.beamT;
            const x1 = b.x; window.__steps(30); const fast = Math.abs(b.x - x1) / 0.5;
            b.x = P.x + 260; b.y = P.y; P.hitCooldown = 0;
            b.beamT = 0.001;
            let n = 0;
            window.__steps(1);
            while (b.beamS !== 0 && n++ < 90) window.__steps(1);
            return { on: on, bar: bar, cdNow: cdNow, calm: calm, fast: fast, cdAfter: b.beamT, charge: B.frenzyCharge };
        });
        assert.ok(fr.on && fr.bar, 'Abaixo de metade da vida o chefe entra em frenesi (e a barra avisa)');
        assert.ok(fr.cdNow <= 3, `O raio que esperava volta em até 3 s (${fr.cdNow.toFixed(2)})`);
        assert.ok(fr.fast > fr.calm * 1.3, `Frenesi mais rápido (${fr.calm.toFixed(0)} → ${fr.fast.toFixed(0)} px/s)`);
        assert.ok(fr.cdAfter > 2.9 && fr.cdAfter <= 3, `No frenesi a recarga do raio cai para 3 s (${fr.cdAfter.toFixed(2)})`);
        console.log(`  ✓ Frenesi: ${fr.calm.toFixed(0)} → ${fr.fast.toFixed(0)} px/s e raio a cada 3 s`);

        // 6. Rei Lich: raio verde que amaldiçoa, anel mais rápido no frenesi; o Sino dos Mortos desfaz o raio
        const lich = await page2.evaluate(() => {
            const G = window.__game, P = G.player, B = G.BOSS_BEAM, b = window.__boss();
            b.speed = 0; b.shootTimer = 99;
            b.beamT = 0.001;
            window.__steps(1);
            while (b.beamS !== 0) window.__steps(1);
            const cursed = P.cursedT > 0;
            b.hp = b.maxHp * 0.4; window.__steps(1);
            b.shootTimer = 0.001; window.__steps(1);
            const ring = b.shootTimer;
            b.beamT = 0.001; window.__steps(2);
            const charging = b.beamS === 1;
            G.game.freezeTimer = 1; window.__steps(1);
            const cancelled = b.beamS === 0;
            G.game.freezeTimer = 0;
            return { id: b.def.id, cursed: cursed, ring: ring, interval: b.def.ring.interval, charging: charging, cancelled: cancelled };
        });
        assert.strictEqual(lich.id, 'lich');
        assert.ok(lich.cursed, 'O raio do Rei Lich amaldiçoa (deixa o caçador lento)');
        assert.ok(lich.ring < lich.interval * 0.8, `No frenesi o anel do Lich vem mais rápido (${lich.ring.toFixed(2)} s)`);
        assert.ok(lich.charging && lich.cancelled, 'O Sino dos Mortos desfaz o raio em carga');
        console.log('  ✓ Rei Lich: raio que amaldiçoa, anel mais rápido no frenesi; Sino dos Mortos desfaz o raio');

        assert.deepStrictEqual(pageErrors, [], 'Sem erros na página');
        console.log('\n🎉 TESTE DOS CHEFES APROVADO!');
    } catch (err) {
        console.error('❌ Erro no teste dos chefes:', err);
        if (pageErrors.length) console.error('Erros da página:', pageErrors);
        process.exitCode = 1;
    } finally {
        await browser.close();
        server.close();
    }
})();
