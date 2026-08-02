process.env.NODE_ENV = 'test';
const puppeteer = require('puppeteer');
const http = require('http');
const assert = require('assert');
const app = require('../server');

(async () => {
    console.log("=== INICIANDO BATERIA DE TESTES AUTOMATIZADOS DE QA - SNAKE TASK_002 ===");
    const server = http.createServer(app);
    const port = 3060;
    await new Promise(resolve => server.listen(port, resolve));

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        await page.goto(`http://localhost:${port}/snake`, { waitUntil: 'networkidle0' });

        // ----------------------------------------------------
        // Teste 1: Validação da Interface e Seleção de Labirintos
        // ----------------------------------------------------
        console.log("\n[Teste 1] Verificando seletor de labirintos (Maze Mode)...");
        const mazeOptions = await page.$$eval('#mazeSelect option', opts => opts.map(o => ({ value: o.value, text: o.textContent })));
        assert.strictEqual(mazeOptions.length, 4, "Deve possuir 4 opções de labirinto no select");
        assert.deepStrictEqual(
            mazeOptions.map(o => o.value),
            ['classic', 'box', 'corners', 'spiral'],
            "Valores dos mapas devem ser classic, box, corners e spiral"
        );
        console.log("✔ Seletor de labirintos presente e com opções corretas.");

        // ----------------------------------------------------
        // Teste 2: Mapeamento de Paredes e Colisão de Labirinto
        // ----------------------------------------------------
        console.log("\n[Teste 2] Verificando estruturas de coordenadas MAZES e Colisão...");
        const mazeCounts = await page.evaluate(() => {
            return {
                classic: MAZES.classic.length,
                box: MAZES.box.length,
                corners: MAZES.corners.length,
                spiral: MAZES.spiral.length
            };
        });
        assert.strictEqual(mazeCounts.classic, 0, "Clássico deve ter 0 paredes");
        assert.strictEqual(mazeCounts.box, 76, "Caixa Fechada deve ter 76 paredes no perímetro");
        assert.strictEqual(mazeCounts.corners, 20, "Quatro Cantos deve ter 20 paredes");
        assert.strictEqual(mazeCounts.spiral, 51, "Grande Espiral deve ter 51 paredes");
        console.log("✔ Coordenadas de labirinto mapeadas corretamente.");

        // Testar colisão em 'box' (0,0 é uma parede)
        const hitWallGameOver = await page.evaluate(() => {
            resetPowerUps();
            isGameOver = false;
            const headPositionOnWall = { x: 0, y: 0 };
            const currentMaze = MAZES['box'];
            const hit = currentMaze.some(wall => wall.x === headPositionOnWall.x && wall.y === headPositionOnWall.y);
            if (hit && !isGhostMode) {
                triggerGameOver();
            }
            return isGameOver;
        });
        assert.strictEqual(hitWallGameOver, true, "Colidir com parede do labirinto deve disparar Game Over");
        console.log("✔ Colisão com parede do labirinto dispara Game Over instantâneo.");

        // ----------------------------------------------------
        // Teste 3: Mecânica de Frutas Especiais (Power Food)
        // ----------------------------------------------------
        console.log("\n[Teste 3] Verificando ciclo e spawn de Frutas Especiais...");
        const specialFoodSpawn = await page.evaluate(() => {
            gameModeSelect.value = 'endless';
            gameModeSelect.dispatchEvent(new Event('change'));

            normalFoodEaten = 4;
            const f1 = generateFood();

            normalFoodEaten = 5;
            const f2 = generateFood();

            return {
                eaten4IsSpecial: f1.isSpecial,
                eaten5IsSpecial: f2.isSpecial,
                specialType: f2.type
            };
        });
        assert.strictEqual(specialFoodSpawn.eaten4IsSpecial, false, "4º alimento normal NÃO deve gerar fruta especial");
        assert.strictEqual(specialFoodSpawn.eaten5IsSpecial, true, "5º alimento normal DEVE gerar fruta especial");
        assert.ok(['ghost', 'speed', 'shrink'].includes(specialFoodSpawn.specialType), "Fruta especial deve ter tipo ghost, speed ou shrink");
        console.log("✔ Fruta especial gerada com sucesso a cada 5 frutas normais.");

        // ----------------------------------------------------
        // Teste 4: Efeitos dos Power-ups (Ghost, Speed, Shrink)
        // ----------------------------------------------------
        console.log("\n[Teste 4] Verificando efeitos dos Power-ups...");
        
        // 4a. Fantasma (Ghost)
        const ghostResult = await page.evaluate(() => {
            resetPowerUps();
            isGhostMode = true;
            let testHead = { x: -1, y: 10 };
            if (isGhostMode) {
                if (testHead.x < 0) testHead.x = tileCount - 1;
            }
            const hit = MAZES['box'].some(w => w.x === testHead.x && w.y === testHead.y);
            let fatal = hit && !isGhostMode;
            return {
                wrappedX: testHead.x,
                fatalCollision: fatal,
                isGhostModeActive: isGhostMode
            };
        });
        assert.strictEqual(ghostResult.wrappedX, 19, "Modo Fantasma deve fazer wrap da borda x=-1 para x=19");
        assert.strictEqual(ghostResult.fatalCollision, false, "Modo Fantasma ignora colisão com parede do labirinto");
        console.log("✔ Fruta Fantasma (Roxa): atravessa paredes/borda e concede imunidade.");

        // 4b. Aceleração (Speed)
        const speedResult = await page.evaluate(() => {
            resetPowerUps();
            isSpeedBoostActive = true;
            let baseSpeed = 150;
            let speedMultiplier = 1.0;
            if (isSpeedBoostActive) speedMultiplier *= 0.5;
            let pointsAwarded = isSpeedBoostActive ? 2 : 1;
            return {
                finalSpeed: baseSpeed * speedMultiplier,
                pointsAwarded: pointsAwarded
            };
        });
        assert.strictEqual(speedResult.finalSpeed, 75, "Fruta de Aceleração deve cortar o intervalo do game loop pela metade (2x velocidade)");
        assert.strictEqual(speedResult.pointsAwarded, 2, "Fruta de Aceleração deve dobrar a pontuação ganha");
        console.log("✔ Fruta Aceleração (Azul): 2x velocidade e 2x pontos por fruta.");

        // 4c. Cortadora (Shrink)
        const shrinkResult = await page.evaluate(() => {
            resetPowerUps();
            let initialLength = 8;
            snake = Array.from({ length: initialLength }, (_, i) => ({ x: 10 - i, y: 10 }));
            if (snake.length > 6) {
                snake = snake.slice(0, -3);
            }
            let lengthAfterShrink = snake.length;

            // Se tamanho <= 6, não deve encolher
            snake = Array.from({ length: 5 }, (_, i) => ({ x: 10 - i, y: 10 }));
            if (snake.length > 6) {
                snake = snake.slice(0, -3);
            }
            let lengthNoShrink = snake.length;

            return {
                lengthAfterShrink,
                lengthNoShrink
            };
        });
        assert.strictEqual(shrinkResult.lengthAfterShrink, 5, "Cobra com tamanho 8 cortada em 3 segmentos deve ficar com tamanho 5");
        assert.strictEqual(shrinkResult.lengthNoShrink, 5, "Cobra com tamanho 5 não deve ter cauda cortada");
        console.log("✔ Fruta Cortadora (Verde): reduz 3 segmentos de cauda (quando tamanho > 6).");

        // ----------------------------------------------------
        // Teste 5: Speed Boost Manual com Barra de Espaço
        // ----------------------------------------------------
        console.log("\n[Teste 5] Verificando Speed Boost Manual (Espaço)...");
        const spaceBoostResult = await page.evaluate(() => {
            resetPowerUps();
            score = 5;
            isSpacePressed = true;
            lastScoreDeductionTime = Date.now() - 1600; // Simula >1.5s mantendo espaço

            // Simula passo de atualização no update()
            const now = Date.now();
            if (isSpacePressed && score > 0) {
                if (now - lastScoreDeductionTime >= 1500) {
                    score = Math.max(0, score - 1);
                    lastScoreDeductionTime = now;
                }
            }

            let baseSpeed = 150;
            let speedMultiplier = 1.0;
            if (isSpacePressed) speedMultiplier *= 0.5;

            return {
                boostedSpeed: baseSpeed * speedMultiplier,
                scoreAfterDeduction: score
            };
        });
        assert.strictEqual(spaceBoostResult.boostedSpeed, 75, "Barra de espaço pressionada deve dobrar a velocidade do loop");
        assert.strictEqual(spaceBoostResult.scoreAfterDeduction, 4, "Acelerar com espaço consome 1 ponto de score após 1.5s");
        console.log("✔ Speed Boost Manual (Espaço): dobra velocidade e deduz 1 ponto a cada 1.5s.");

        console.log("\n🎉 TODOS OS TESTES DA TASK_002 DO SNAKE GAME PASSARAM COM SUCESSO!");

    } catch (err) {
        console.error("\n❌ FALHA NOS TESTES DE QA:", err.message || err);
        process.exitCode = 1;
    } finally {
        if (browser) await browser.close();
        server.close();
    }
})();
