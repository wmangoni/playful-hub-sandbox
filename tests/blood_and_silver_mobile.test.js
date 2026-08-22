const puppeteer = require('puppeteer');
const path = require('path');
const assert = require('assert');

(async () => {
    console.log('🚀 Iniciando bateria de testes do Sangue & Prata (Mobile & Desktop)...');
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const filePath = 'file:///' + path.resolve(__dirname, '../blood_and_silver/index.html').replace(/\\/g, '/');
        const page = await browser.newPage();

        // 1. TESTE DESKTOP: Carregamento e início
        console.log('\n[1/5] Testando carregamento Desktop e tela inicial...');
        await page.setViewport({ width: 1280, height: 720 });
        await page.goto(filePath, { waitUntil: 'load' });

        const title = await page.title();
        console.log('  ✓ Título da página:', title);
        assert.ok(title.includes('Sangue & Prata'), 'Título incorreto');

        const startBtnVisible = await page.$eval('#startBtn', el => !el.closest('.overlay').classList.contains('hidden'));
        assert.strictEqual(startBtnVisible, true, 'StartScreen deveria estar visível');
        console.log('  ✓ Menu inicial com botões carregado corretamente.');

        // 2. TESTE MODAIS NO MENU: Conquistas e Reset Modal
        console.log('\n[2/5] Testando modal de Conquistas e Modal de Reset...');
        await page.click('#achievementsBtn');
        let achModalVisible = await page.$eval('#achievementsScreen', el => !el.classList.contains('hidden'));
        assert.strictEqual(achModalVisible, true, 'Modal de Conquistas deveria estar aberto');
        console.log('  ✓ Modal de Conquistas abriu com sucesso.');

        await page.click('#closeAchievementsBtn');
        achModalVisible = await page.$eval('#achievementsScreen', el => !el.classList.contains('hidden'));
        assert.strictEqual(achModalVisible, false, 'Modal de Conquistas deveria estar fechado');
        console.log('  ✓ Modal de Conquistas fechou com sucesso.');

        await page.click('#resetProgressBtn');
        const resetModalVisible = await page.$eval('#resetModalScreen', el => !el.classList.contains('hidden'));
        assert.strictEqual(resetModalVisible, true, 'Modal de Reset deveria estar visível');
        console.log('  ✓ Modal de confirmação de Reset abriu.');

        await page.click('#cancelResetBtn');
        const resetModalClosed = await page.$eval('#resetModalScreen', el => el.classList.contains('hidden'));
        assert.strictEqual(resetModalClosed, true, 'Modal de Reset deveria fechar no cancelar');
        console.log('  ✓ Cancelamento de Reset funcionou.');

        // 3. TESTE MOBILE: Viewport Mobile e Emulação de Touch
        console.log('\n[3/5] Testando emulação Mobile (iPhone 13 - 390x844 com touch habilitado)...');
        await page.setViewport({
            width: 390,
            height: 844,
            isMobile: true,
            hasTouch: true
        });

        // Iniciar jogo
        await page.click('#startBtn');
        await page.waitForFunction(() => !document.getElementById('hud').style.opacity || document.getElementById('hud').style.opacity === '1');
        console.log('  ✓ Jogo iniciado com sucesso no mobile.');

        // 4. TESTE TOUCH JOYSTICK DRAG
        console.log('\n[4/5] Testando Joystick Virtual Dinâmico e movimentação por toque...');
        // Toque inicial no centro inferior da tela
        await page.touchscreen.tap(195, 500);

        // Disparar touch drag para a direita
        const touchSession = await page.evaluate(() => {
            const stage = document.getElementById('stage');
            const touchStart = new Touch({
                identifier: 1,
                target: stage,
                clientX: 195,
                clientY: 500,
                radiusX: 5,
                radiusY: 5,
                rotationAngle: 0,
                force: 1
            });

            const touchEventStart = new TouchEvent('touchstart', {
                cancelable: true,
                bubbles: true,
                touches: [touchStart],
                targetTouches: [touchStart],
                changedTouches: [touchStart]
            });
            window.dispatchEvent(touchEventStart);

            const joystickActive = document.getElementById('touchJoystick').classList.contains('active');
            const initialFacing = window.player ? window.player.facing : null;

            // Mover 50px para a direita
            const touchMove = new Touch({
                identifier: 1,
                target: stage,
                clientX: 245,
                clientY: 500,
                radiusX: 5,
                radiusY: 5,
                rotationAngle: 0,
                force: 1
            });
            const touchEventMove = new TouchEvent('touchmove', {
                cancelable: true,
                bubbles: true,
                touches: [touchMove],
                targetTouches: [touchMove],
                changedTouches: [touchMove]
            });
            window.dispatchEvent(touchEventMove);

            // Finalizar toque
            const touchEventEnd = new TouchEvent('touchend', {
                cancelable: true,
                bubbles: true,
                touches: [],
                targetTouches: [],
                changedTouches: [touchMove]
            });
            window.dispatchEvent(touchEventEnd);

            const joystickClosed = !document.getElementById('touchJoystick').classList.contains('active');

            return { joystickActive, joystickClosed };
        });

        assert.strictEqual(touchSession.joystickActive, true, 'Joystick deveria ter sido ativado no touch');
        assert.strictEqual(touchSession.joystickClosed, true, 'Joystick deveria fechar no touchend');
        console.log('  ✓ Touch drag ativou e movimentou o joystick virtual perfeitamente!');

        // 5. TESTE BOTÃO DE PAUSE NO MOBILE
        console.log('\n[5/5] Testando botão de pausa [⏸️] no HUD Mobile...');
        await page.click('#mobilePauseBtn');
        const pauseVisible = await page.$eval('#pauseScreen', el => !el.classList.contains('hidden'));
        assert.strictEqual(pauseVisible, true, 'Tela de pause deveria estar visível após clicar no botão do HUD');
        console.log('  ✓ Botão de pausa touch abriu a tela de pausa.');

        // Despausar com botão Continuar ou Enter
        await page.click('#resumeBtn');
        const pauseHidden = await page.$eval('#pauseScreen', el => el.classList.contains('hidden'));
        assert.strictEqual(pauseHidden, true, 'Tela de pause deveria fechar ao clicar em Continuar');
        console.log('  ✓ Jogo despausado com sucesso via botão touch de continuar.');

        console.log('\n🎉 TODOS OS TESTES (MOBILE, TOUCH JOYSTICK, DESKTOP, ACHIEVEMENTS) PASSARAM COM SUCESSO!');
    } catch (err) {
        console.error('❌ Erro no teste:', err);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();
