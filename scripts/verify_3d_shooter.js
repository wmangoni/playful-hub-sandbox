const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

async function testGame() {
  const app = express();
  app.use(express.static(path.join(__dirname, '..')));
  
  const server = await new Promise(resolve => {
    const s = app.listen(3096, () => resolve(s));
  });

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 768 });

  try {
    await page.goto('http://localhost:3096/3d_shooter/index.html', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#startButton', { timeout: 5000 });
    await page.click('#startButton');
    await new Promise(r => setTimeout(r, 600));

    const gameContainer = await page.$('#gameContainer');

    // 1. Look at Demon
    await page.evaluate(() => {
      const demon = enemies.find(e => e.type === 'demon');
      if (demon) {
        player.x = demon.x - 2.5;
        player.y = demon.y;
        player.angle = 0;
      }
    });
    await new Promise(r => setTimeout(r, 800));
    await gameContainer.screenshot({ path: path.join(__dirname, '..', '3d_shooter', 'game_view_demon.png') });
    console.log('Captured demon screenshot');

    // 2. Look at Cyber Imp
    await page.evaluate(() => {
      const imp = enemies.find(e => e.type === 'cyber_imp');
      if (imp) {
        player.x = imp.x - 2.5;
        player.y = imp.y;
        player.angle = 0;
      }
    });
    await new Promise(r => setTimeout(r, 800));
    await gameContainer.screenshot({ path: path.join(__dirname, '..', '3d_shooter', 'game_view_imp.png') });
    console.log('Captured imp screenshot');

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
    server.close();
  }
}

testGame();
