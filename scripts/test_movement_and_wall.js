const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

async function testMovements() {
  const app = express();
  app.use(express.static(path.join(__dirname, '..')));
  let server;
  await new Promise(r => { server = app.listen(3098, () => r()); });

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 600 });

  await page.goto('http://localhost:3098/3d_shooter/index.html');
  await page.waitForSelector('#startButton');
  await page.click('#startButton');
  await new Promise(r => setTimeout(r, 600));

  const gameContainer = await page.$('#gameContainer');

  // 1. Close-up to Brick Wall (distance 0.25)
  await page.evaluate(() => {
    player.x = 1.25;
    player.y = 2.5;
    player.angle = Math.PI; // Face west towards wall 1
  });
  await new Promise(r => setTimeout(r, 300));
  await gameContainer.screenshot({ path: path.join(__dirname, '..', '3d_shooter', 'test_close_wall_brick.png') });

  // 2. Close-up to Stone Wall (distance 0.25)
  await page.evaluate(() => {
    player.x = 2.25;
    player.y = 2.0;
    player.angle = 0; // Face east towards wall 2
  });
  await new Promise(r => setTimeout(r, 300));
  await gameContainer.screenshot({ path: path.join(__dirname, '..', '3d_shooter', 'test_close_wall_stone.png') });

  // 3. Close-up to Metal Door (distance 0.35)
  await page.evaluate(() => {
    player.x = 3.5;
    player.y = 4.65;
    player.angle = Math.PI / 2; // Face south towards door
  });
  await new Promise(r => setTimeout(r, 300));
  await gameContainer.screenshot({ path: path.join(__dirname, '..', '3d_shooter', 'test_close_door.png') });

  // 4. Floor: Step 1 (y = 2.5)
  await page.evaluate(() => {
    player.x = 3.5;
    player.y = 2.5;
    player.angle = Math.PI / 2;
  });
  await new Promise(r => setTimeout(r, 300));
  await gameContainer.screenshot({ path: path.join(__dirname, '..', '3d_shooter', 'test_floor_walk1.png') });

  // 5. Floor: Step 2 (y = 3.2, moved forward 0.7 units)
  await page.evaluate(() => {
    player.y = 3.2;
  });
  await new Promise(r => setTimeout(r, 300));
  await gameContainer.screenshot({ path: path.join(__dirname, '..', '3d_shooter', 'test_floor_walk2.png') });

  // 6. Demon close-up
  await page.evaluate(() => {
    enemies.length = 0;
    enemies.push({
      x: 3.5,
      y: 4.2,
      type: 'demon',
      health: 150,
      currentHealth: 150,
      size: 0.7,
      speed: 0,
      damage: 0,
      scoreValue: 250,
      color: '#D21D1D',
      state: 'chasing',
      stateTimer: 0,
      isHit: false,
      lastHitTimestamp: 0,
      attackCooldown: 10
    });
    player.x = 3.5;
    player.y = 2.9;
    player.angle = Math.PI / 2;
  });
  await new Promise(r => setTimeout(r, 300));
  await gameContainer.screenshot({ path: path.join(__dirname, '..', '3d_shooter', 'test_monster_demon.png') });

  // 7. Cyber Imp close-up
  await page.evaluate(() => {
    enemies[0].type = 'cyber_imp';
    enemies[0].health = 80;
    enemies[0].currentHealth = 80;
    enemies[0].size = 0.6;
    enemies[0].color = '#ff00ff';
  });
  await new Promise(r => setTimeout(r, 300));
  await gameContainer.screenshot({ path: path.join(__dirname, '..', '3d_shooter', 'test_monster_imp.png') });

  // 8. Grunt close-up
  await page.evaluate(() => {
    enemies[0].type = 'grunt';
    enemies[0].health = 50;
    enemies[0].currentHealth = 50;
    enemies[0].size = 0.5;
    enemies[0].color = '#1E6F5C';
  });
  await new Promise(r => setTimeout(r, 300));
  await gameContainer.screenshot({ path: path.join(__dirname, '..', '3d_shooter', 'test_monster_grunt.png') });

  console.log('All tests completed successfully!');

  await browser.close();
  server.close();
  process.exit(0);
}

testMovements();
