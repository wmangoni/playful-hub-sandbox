const puppeteer = require('puppeteer');
const path = require('path');
const assert = require('assert');

// Tumbalacatumba no celular: dedos de verdade (eventos de toque do Chrome via CDP, não TouchEvent sintético),
// celular deitado com tela de toque. Os toques passam pelo elemento que estiver por cima, como no aparelho.
// Confere que o jogo escolhe sozinho o preset leve e o modo toque, que a interface cabe (passo toqueHud do
// e2e), e que joystick, câmera, pinça, toque em PNJ, botões, dois dedos ao mesmo tempo, corrida travada e o
// aviso de celular em pé funcionam. No fim, um desktop comum continua sem nada disso.
const GAME = 'file:///' + path.resolve(__dirname, '../tumbalacatumba/Tumbalacatumba.html').split(path.sep).join('/');
const E2E = path.resolve(__dirname, '../tumbalacatumba/tools/e2e_sync.js');
const PHONE = { width: 844, height: 390, isMobile: true, hasTouch: true, isLandscape: true };

// no Windows o compilador de shader do Direct3D (ANGLE) avisa no FXAA do three (X3595 e X4000): não é erro do jogo
const realErrors = (list) => list.filter((e) => !(/Program Info Log:/.test(e) && /warning X(3595|4000)/.test(e) && !/error/i.test(e.replace(/warning X\d+[^\n]*/g, ''))));

(async () => {
    console.log('🚀 Iniciando testes do Tumbalacatumba no celular...');
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    try {
        const page = await browser.newPage();
        const pageErrors = [];
        page.on('pageerror', (e) => pageErrors.push(e.message));
        await page.setViewport(PHONE);
        await page.goto(GAME + '?play&notut&t=12', { waitUntil: 'load' });
        await page.waitForFunction(() => window.__game && window.__game.state === 'play' && window.__game.combat && window.__game.touchBar, { timeout: 20000 });
        // avança a simulação sem esperar o relógio (como o e2e): n quadros de 1/30 s
        const step = (n) => page.evaluate((k) => { const g = window.__game; for (let i = 0; i < k; i++) { g.time += 1 / 30; g.update(1 / 30); g.input.endFrame(); } }, n);
        const rect = (sel) => page.$eval(sel, (el) => { const r = el.getBoundingClientRect(); return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2, w: r.width, h: r.height }; });
        await page.evaluate(() => { window.__game.debug.peace(true); window.__game.progress.save = () => {}; });

        // 1. sozinho: preset leve e modo toque
        console.log('\n[1/10] Celular deitado: preset e modo toque automáticos...');
        const boot = await page.evaluate(() => ({ q: window.__game.qualityName, touch: document.body.classList.contains('touch'), coarse: matchMedia('(pointer: coarse)').matches }));
        assert.strictEqual(boot.coarse, true, 'a emulação deveria ter tela de toque');
        assert.strictEqual(boot.q, 'movel', 'sem qualidade salva, o celular deveria começar no preset movel');
        assert.strictEqual(boot.touch, true, 'o modo toque deveria ligar sozinho');
        console.log('  ✓ preset movel e modo toque ligados.');

        // 2. layout de toque: tudo dentro da tela, nada sobreposto, alvos ≥ 44 px (passo toqueHud do e2e)
        console.log('\n[2/10] Layout e ações da interface de toque (passo toqueHud)...');
        await page.addScriptTag({ path: E2E });
        const hud = await page.evaluate(() => window.__T.run('toqueHud'));
        assert.strictEqual(hud, 'ok', 'toqueHud: ' + hud);
        console.log('  ✓ ' + (await page.evaluate(() => window.__T.log.at(-1).split('; ')[0])));

        // posição de partida: praça, câmera atrás do personagem, nenhuma janela por cima dos dedos
        const reset = () => page.evaluate(() => {
            const g = window.__game;
            g.ui.dialog.close();
            g.input.lastPointer = 'touch';
            g.touch.reset();
            g.player.teleport(1.5, 19.5, Math.PI - 0.25);
            g.cam.snapBehind(g.player);
        });
        const SX = PHONE.width * 0.2, SY = PHONE.height * 0.72;

        // 3. joystick: polegar no lado esquerdo e arrastado para cima anda para a frente da câmera
        console.log('\n[3/10] Joystick com o polegar de verdade...');
        await reset();
        await step(10);
        const a = await page.evaluate(() => ({ x: window.__game.player.pos.x, z: window.__game.player.pos.z, yaw: window.__game.cam.yaw }));
        const thumb = await page.touchscreen.touchStart(SX, SY);
        for (let k = 1; k <= 5; k++) await thumb.move(SX, SY - k * 10);
        await step(45);
        const b = await page.evaluate(() => ({ x: window.__game.player.pos.x, z: window.__game.player.pos.z }));
        await thumb.end();
        await step(5);
        const moved = Math.hypot(b.x - a.x, b.z - a.z);
        const along = ((b.x - a.x) * Math.sin(a.yaw) + (b.z - a.z) * Math.cos(a.yaw)) / (moved || 1);
        assert.ok(moved > 4 && along > 0.9, `o joystick deveria andar para a frente da câmera (andou ${moved.toFixed(1)} m, alinhamento ${along.toFixed(2)})`);
        const stopped = await page.evaluate(() => window.__game.input.move.m);
        assert.strictEqual(stopped, 0, 'soltar o polegar deveria parar');
        console.log(`  ✓ andou ${moved.toFixed(1)} m para a frente da câmera (alinhamento ${along.toFixed(2)}) e parou ao soltar.`);

        // 4. câmera: arrastar o lado direito gira (sem andar); dois dedos se afastando aproximam
        console.log('\n[4/10] Câmera no dedo e pinça...');
        await reset();
        await step(5);
        const c0 = await page.evaluate(() => ({ yaw: window.__game.cam.yaw, d: window.__game.cam.targetDist, x: window.__game.player.pos.x, z: window.__game.player.pos.z }));
        const LX = PHONE.width * 0.7, LY = PHONE.height * 0.45;
        const look = await page.touchscreen.touchStart(LX, LY);
        for (let k = 1; k <= 8; k++) await look.move(LX + k * 15, LY);
        await look.end();
        await step(3);
        const c1 = await page.evaluate(() => ({ yaw: window.__game.cam.yaw, x: window.__game.player.pos.x, z: window.__game.player.pos.z }));
        const turned = Math.abs(Math.atan2(Math.sin(c1.yaw - c0.yaw), Math.cos(c1.yaw - c0.yaw)));
        assert.ok(turned > 0.2 && Math.hypot(c1.x - c0.x, c1.z - c0.z) < 0.05, `arrastar o lado direito deveria girar a câmera sem andar (girou ${turned.toFixed(2)} rad)`);
        const p1 = await page.touchscreen.touchStart(PHONE.width * 0.64, LY);
        const p2 = await page.touchscreen.touchStart(PHONE.width * 0.76, LY);
        for (let k = 1; k <= 6; k++) {
            await p1.move(PHONE.width * 0.64 - k * 12, LY);
            await p2.move(PHONE.width * 0.76 + k * 12, LY);
        }
        await p1.end();
        await p2.end();
        await step(10);
        const zoom = await page.evaluate(() => window.__game.cam.targetDist);
        assert.ok(zoom < c0.d - 0.5, `afastar dois dedos deveria aproximar a câmera (${c0.d.toFixed(1)} → ${zoom.toFixed(1)} m)`);
        console.log(`  ✓ a câmera girou ${turned.toFixed(2)} rad sem o personagem andar; a pinça aproximou de ${c0.d.toFixed(1)} para ${zoom.toFixed(1)} m.`);

        // 5. toque num PNJ conversa; perto dele, o botão contextual diz "Falar" e também conversa
        console.log('\n[5/10] Toque no Prefeito Abóbora e botão Falar...');
        const npc = await page.evaluate(() => {
            const g = window.__game, n = g.questWorld.npcs.prefeito;
            g.player.teleport(n.pos.x + Math.sin(n.homeYaw) * 3, n.pos.z + Math.cos(n.homeYaw) * 3, n.homeYaw + Math.PI);
            g.cam.snapBehind(g.player);
            for (let i = 0; i < 10; i++) { g.time += 1 / 30; g.update(1 / 30); g.input.endFrame(); }
            const v = n.pos.clone(); v.y += 1.2; v.project(g.camera);
            return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight };
        });
        await page.touchscreen.tap(npc.x, npc.y);
        await step(10);
        const talk = await page.evaluate(() => window.__game.ui.dialog.open);
        assert.strictEqual(talk, true, 'tocar no prefeito deveria abrir a conversa');
        await page.evaluate(() => window.__game.ui.dialog.close());
        await step(8);
        const ctx = await page.evaluate(() => { const B = window.__game.touchBar; return { label: B.ctxLabel.textContent, hidden: B.ctx.classList.contains('hidden') }; });
        assert.ok(!ctx.hidden && ctx.label === 'Falar', `perto do prefeito, o botão contextual deveria dizer "Falar" (${JSON.stringify(ctx)})`);
        const ctxBtn = await rect('#touch .tb.ctx');
        await page.touchscreen.tap(ctxBtn.x, ctxBtn.y);
        await step(5);
        const talk2 = await page.evaluate(() => window.__game.ui.dialog.open);
        assert.strictEqual(talk2, true, 'o botão Falar deveria abrir a conversa');
        await page.evaluate(() => window.__game.ui.dialog.close());
        console.log('  ✓ a conversa abriu pelo toque no prefeito e pelo botão Falar.');

        // 6. botões: Lanternada sem criatura avisa; o Buu! do arco dispara; Pular pula
        console.log('\n[6/10] Botões de habilidade e Pular...');
        await reset();
        await step(5);
        const atk = await rect('#touch .tb.atk');
        assert.ok(atk.w >= 44 && atk.h >= 44, 'Lanternada menor que 44 px');
        // (a mensagem de um passo anterior ainda pode estar na tela: limpa antes)
        await page.evaluate(() => window.__game.ui.errors.replaceChildren());
        await page.touchscreen.tap(atk.x, atk.y);
        await step(3);
        const warned = await page.evaluate(() => window.__game.ui.errors.textContent.includes('Nenhuma criatura'));
        assert.strictEqual(warned, true, 'sem criatura, a Lanternada deveria avisar');
        const boo = await page.evaluate(() => {
            const B = window.__game.touchBar, i = B.arcIds.indexOf('boo');
            if (i < 0) return null;
            const r = B.arc[i].el.getBoundingClientRect();
            return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 };
        });
        assert.ok(boo, 'o Buu! deveria estar no arco de botões');
        await page.evaluate(() => { window.__game.touchBar.byId.boo.cdLeft = 0; });
        await page.touchscreen.tap(boo.x, boo.y);
        await step(3);
        const booCd = await page.evaluate(() => window.__game.touchBar.byId.boo.cdLeft);
        assert.ok(booCd > 0, 'tocar no Buu! deveria usar a habilidade');
        await step(30);
        const jump = await rect('#touch .tbtn.jump');
        await page.touchscreen.tap(jump.x, jump.y);
        await step(4);
        const air = await page.evaluate(() => ({ grounded: window.__game.player.grounded, vy: window.__game.player.vel.y }));
        assert.ok(!air.grounded || air.vy > 0, 'o botão Pular deveria pular');
        console.log('  ✓ Lanternada avisa sem criatura, o Buu! dispara e o Pular pula.');

        // 7. dois dedos: polegar no joystick e o outro dedo abre a mochila no menu do topo
        console.log('\n[7/10] Polegar no joystick + toque na mochila...');
        await step(30);
        await reset();
        const t1 = await page.touchscreen.touchStart(SX, SY);
        await t1.move(SX, SY - 30);
        const bag = await rect('#micro button.bag');
        const t2 = await page.touchscreen.touchStart(bag.x, bag.y);
        await t2.end();
        await step(3);
        const bagOpen = await page.evaluate(() => window.__game.ui.bags.open);
        await t1.end();
        await step(3);
        assert.strictEqual(bagOpen, true, 'com o polegar no joystick, o toque na mochila deveria abri-la');
        await page.evaluate(() => window.__game.ui.bags.toggle(false));
        console.log('  ✓ a mochila abriu com o polegar no joystick.');

        // 8. corrida travada: joystick para cima até o cadeado e soltar; tocar no joystick para
        console.log('\n[8/10] Corrida travada no cadeado...');
        await reset();
        await page.evaluate(() => { const g = window.__game; g.player.teleport(5, 40, 0); g.cam.yaw = 0; g.cam.snapBehind(g.player); });
        await step(5);
        const lockThumb = await page.touchscreen.touchStart(SX, SY);
        for (let k = 1; k <= 11; k++) await lockThumb.move(SX, SY - k * 10);
        const armed = await page.evaluate(() => window.__game.touch.lockEl.classList.contains('armed'));
        await lockThumb.end();
        await step(2);
        const q0 = await page.evaluate(() => window.__game.player.pos.clone());
        await step(30);
        const run = await page.evaluate((q) => ({ lock: window.__game.touch.runLock, d: window.__game.player.pos.distanceTo(q) }), q0);
        assert.ok(armed && run.lock && run.d > 4, `a corrida deveria travar (armou ${armed}, travou ${run.lock}, andou ${run.d.toFixed(1)} m em 1 s)`);
        await page.touchscreen.tap(SX, SY);
        await step(10);
        const q1 = await page.evaluate(() => window.__game.player.pos.clone());
        await step(15);
        const halt = await page.evaluate((q) => ({ lock: window.__game.touch.runLock, d: window.__game.player.pos.distanceTo(q), lockIcon: getComputedStyle(window.__game.touch.lockEl).display }), q1);
        assert.ok(!halt.lock && halt.d < 0.05 && halt.lockIcon === 'none', 'tocar no joystick deveria parar a corrida e apagar o cadeado');
        console.log(`  ✓ travou e correu ${run.d.toFixed(1)} m sozinho; o toque no joystick parou.`);

        // 9. celular em pé: aviso para virar e o jogo para
        console.log('\n[9/10] Celular em pé...');
        await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, isLandscape: false });
        await step(3);
        const portrait = await page.evaluate(() => ({ rotate: getComputedStyle(document.getElementById('rotate')).display, paused: window.__game.portraitPaused }));
        assert.ok(portrait.rotate !== 'none' && portrait.paused, 'em pé deveria aparecer "Vire o celular" e o jogo parar');
        await page.setViewport(PHONE);
        await step(3);
        const back = await page.evaluate(() => ({ rotate: getComputedStyle(document.getElementById('rotate')).display, paused: window.__game.portraitPaused }));
        assert.ok(back.rotate === 'none' && !back.paused, 'deitado de novo, o jogo deveria voltar');
        const errs = [...pageErrors, ...realErrors(await page.evaluate(() => window.__errors))];
        assert.deepStrictEqual(errs, [], 'erros na página: ' + errs.join(' | '));
        console.log('  ✓ aviso em pé e volta ao deitar; nenhum erro na página.');
        await page.close();

        // 10. desktop comum: preset média e, com o mundo carregado, sem modo toque
        console.log('\n[10/10] Desktop sem tela de toque...');
        const desk = await browser.newPage();
        const deskErrors = [];
        desk.on('pageerror', (e) => deskErrors.push(e.message));
        await desk.setViewport({ width: 1280, height: 720 });
        await desk.goto(GAME + '?play&notut&t=12', { waitUntil: 'load' });
        await desk.waitForFunction(() => window.__game && window.__game.state === 'play', { timeout: 20000 });
        const d = await desk.evaluate(() => ({ q: window.__game.qualityName, touch: document.body.classList.contains('touch'), mode: window.__game.touchMode }));
        assert.ok(d.q === 'media' && !d.touch && !d.mode, `o desktop deveria ficar na qualidade média e sem modo toque (${JSON.stringify(d)})`);
        const deskAll = [...deskErrors, ...realErrors(await desk.evaluate(() => window.__errors))];
        assert.deepStrictEqual(deskAll, [], 'erros na página do desktop: ' + deskAll.join(' | '));
        console.log('  ✓ desktop na qualidade média, sem modo toque e sem erros.');

        console.log('\n✅ Tumbalacatumba no celular: tudo certo.');
    } catch (err) {
        console.error('\n❌ Falha:', err.message);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();
