const http = require('http');
const path = require('path');
const fs = require('fs');
const express = require('express');

const app = express();
const repoDir = path.resolve(__dirname, '..');

app.use(express.static(repoDir));

const server = http.createServer(app);
const PORT = 3456;

async function main() {
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  console.log(`Server listening at http://127.0.0.1:${PORT}`);

  const puppeteer = require('puppeteer');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--ignore-gpu-blocklist'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });

  page.on('console', msg => console.log('[PAGE LOG]', msg.text()));
  page.on('pageerror', err => console.log('[PAGE ERROR]', err.message));

  console.log('Loading Tumbalacatumba.html...');
  await page.goto(`http://127.0.0.1:${PORT}/tumbalacatumba/Tumbalacatumba.html?play&q=alta&t=18.6`, {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  // Wait for loading screen to disappear
  await page.waitForFunction(() => !document.getElementById('boot') || document.getElementById('boot').classList.contains('gone'), { timeout: 15000 });
  console.log('Boot completed! Waiting 3 seconds for world render...');
  await new Promise(r => setTimeout(r, 3000));

  const outDir = path.join(repoDir, 'scripts', 'shots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // 1. First shot with HUD
  await page.screenshot({ path: path.join(outDir, 'shot_1_play_hud.png') });
  console.log('Saved shot_1_play_hud.png');

  // Hide HUD with KeyZ
  await page.keyboard.press('KeyZ');
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(outDir, 'shot_2_play_no_hud.png') });
  console.log('Saved shot_2_play_no_hud.png');

  // Test different time of day
  // Let's test dusk with moon (t=19.2)
  await page.evaluate(() => {
    if (window.__game) {
      window.__game.dayNight.setTime(19.2);
    }
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(outDir, 'shot_3_dusk_19_2.png') });
  console.log('Saved shot_3_dusk_19_2.png');

  // Rotate camera around player to get an epic view of the town & clock tower
  await page.evaluate(() => {
    if (window.__game) {
      // rotate camera
      window.__game.cam.yaw += 1.8;
      window.__game.cam.pitch = 0.25;
      window.__game.cam.curDist = 6.0;
      window.__game.cam.targetDist = 6.0;
    }
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(outDir, 'shot_4_angle_clock_tower.png') });
  console.log('Saved shot_4_angle_clock_tower.png');

  // Rotate camera to see Mayor Pumpkin / Plaza with lanterns
  await page.evaluate(() => {
    if (window.__game) {
      window.__game.cam.yaw += 2.2;
      window.__game.cam.pitch = 0.18;
      window.__game.cam.curDist = 5.0;
      window.__game.cam.targetDist = 5.0;
    }
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(outDir, 'shot_5_plaza_lanterns.png') });
  console.log('Saved shot_5_plaza_lanterns.png');

  // Title screen camera
  const pageTitle = await browser.newPage();
  await pageTitle.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await pageTitle.goto(`http://127.0.0.1:${PORT}/tumbalacatumba/Tumbalacatumba.html?q=alta`, {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  await pageTitle.waitForFunction(() => !document.getElementById('boot') || document.getElementById('boot').classList.contains('gone'), { timeout: 15000 });
  await new Promise(r => setTimeout(r, 3500));
  await pageTitle.screenshot({ path: path.join(outDir, 'shot_6_title_screen.png') });
  console.log('Saved shot_6_title_screen.png');

  await browser.close();
  server.close();
  console.log('Done capturing candidates!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  if (server) server.close();
  process.exit(1);
});
