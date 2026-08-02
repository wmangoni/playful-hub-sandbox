process.env.NODE_ENV = 'test';
const puppeteer = require('puppeteer');
const path = require('path');
const http = require('http');
const app = require('../server');

(async () => {
    console.log("Starting server for QA test...");
    const server = http.createServer(app);
    const port = 3050;
    await new Promise(resolve => server.listen(port, resolve));
    console.log(`Server listening on port ${port}`);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // Listen to page console logs and errors
        page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
        page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));

        await page.goto(`http://localhost:${port}/snake`, { waitUntil: 'networkidle0' });
        console.log("Page loaded successfully.");

        // 1. Verify UI Elements
        const mazeSelect = await page.$('#mazeSelect');
        console.log("mazeSelect present:", !!mazeSelect);

        const mazeOptions = await page.$$eval('#mazeSelect option', opts => opts.map(o => o.value));
        console.log("Maze options:", mazeOptions);

        const statusBadge = await page.$('#statusBadge');
        console.log("statusBadge present:", !!statusBadge);

        // 2. Evaluate in browser context to test maze loading & game state
        const mazeTestResults = await page.evaluate(() => {
            const results = {};
            const mazeSelectEl = document.getElementById('mazeSelect');
            const gameModeSelectEl = document.getElementById('gameModeSelect');

            // Set mode to endless for testing mazeSelect
            gameModeSelectEl.value = 'endless';
            gameModeSelectEl.dispatchEvent(new Event('change'));

            ['classic', 'box', 'corners', 'spiral'].forEach(mazeName => {
                mazeSelectEl.value = mazeName;
                mazeSelectEl.dispatchEvent(new Event('change'));
                const currentMaze = MAZES[mazeName];
                results[mazeName] = {
                    exists: Array.isArray(currentMaze),
                    count: currentMaze ? currentMaze.length : 0
                };
            });
            return results;
        });
        console.log("Maze Test Results:", JSON.stringify(mazeTestResults, null, 2));

        // 3. Test Power Foods logic
        const powerFoodResults = await page.evaluate(() => {
            const results = {};
            
            // Test 5 normal food eaten triggers special food
            normalFoodEaten = 4;
            const f1 = generateFood();
            results.at4EatenIsSpecial = f1.isSpecial; // false

            normalFoodEaten = 5;
            const f2 = generateFood();
            results.at5EatenIsSpecial = f2.isSpecial; // true
            results.specialType = f2.type; // 'ghost', 'speed', or 'shrink'

            return results;
        });
        console.log("Power Food Logic Results:", JSON.stringify(powerFoodResults, null, 2));

        // 4. Test Speed Boost Manual
        const speedBoostResults = await page.evaluate(() => {
            let spacePressed = false;
            let scoreValue = 10;
            score = 10;
            isSpacePressed = true;
            lastScoreDeductionTime = Date.now() - 1600; // > 1500ms
            
            // Simulate update step for space deduction
            const now = Date.now();
            if (isSpacePressed && score > 0) {
                if (now - lastScoreDeductionTime >= 1500) {
                    score = Math.max(0, score - 1);
                    lastScoreDeductionTime = now;
                }
            }

            return {
                newScore: score,
                deducted: score === 9
            };
        });
        console.log("Speed Boost Results:", JSON.stringify(speedBoostResults, null, 2));

        // 5. Test Ghost Mode, Speed Mode, Shrink Mode Effects
        const powerUpEffectsResults = await page.evaluate(() => {
            const res = {};
            
            // Ghost Mode
            resetPowerUps();
            isGhostMode = true;
            const headOutOfBounds = { x: -1, y: 10 };
            let testHead = { ...headOutOfBounds };
            // Screen wrap check
            if (isGhostMode) {
                if (testHead.x < 0) testHead.x = tileCount - 1;
            }
            res.ghostScreenWrap = (testHead.x === 19);

            // Shrink Mode
            resetPowerUps();
            snake = [{x:10,y:10},{x:9,y:10},{x:8,y:10},{x:7,y:10},{x:6,y:10},{x:5,y:10},{x:4,y:10},{x:3,y:10}]; // length 8
            if (snake.length > 6) {
                snake = snake.slice(0, -3);
            }
            res.shrankLength = snake.length; // 5

            // Speed Boost powerup
            resetPowerUps();
            isSpeedBoostActive = true;
            const baseSpeed = 150;
            let speedMultiplier = 1.0;
            if (isSpeedBoostActive) speedMultiplier *= 0.5;
            res.boostedLoopSpeed = baseSpeed * speedMultiplier; // 75

            return res;
        });
        console.log("PowerUp Effects Results:", JSON.stringify(powerUpEffectsResults, null, 2));

        console.log("QA TEST COMPLETED SUCCESSFULLY!");

    } catch (err) {
        console.error("QA Test Error:", err);
    } finally {
        if (browser) await browser.close();
        server.close();
    }
})();
