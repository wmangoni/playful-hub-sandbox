const http = require('http');
const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.static('.'));
const server = http.createServer(app);

async function main() {
  await new Promise(r => server.listen(3463, '127.0.0.1', r));
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=d3d11'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });

  await page.goto('http://127.0.0.1:3463/tumbalacatumba/Tumbalacatumba.html?play&notut&t=20.2&dist=5', { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => !document.getElementById('boot') || document.getElementById('boot').classList.contains('gone'), { timeout: 20000 });
  await new Promise(r => setTimeout(r, 2500));

  // Disable bloom pass
  await page.evaluate(() => {
    const g = window.__game;
    if (g && g.post && g.post.bloomPass) {
      g.post.bloomPass.enabled = false;
    }
  });

  // Hide HUD
  await page.keyboard.press('KeyZ');
  await new Promise(r => setTimeout(r, 500));

  const outDir = path.join(__dirname, 'shots_moon');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Let's find the moon direction and point camera towards it!
  const moonInfo = await page.evaluate(() => {
    const g = window.__game;
    const m = g.dayNight.moonDir;
    // Calculate yaw to face moon
    const moonYaw = Math.atan2(-m.x, -m.z);
    return { moonDir: m, moonYaw };
  });
  console.log('Moon info:', moonInfo);

  // Shot M1: Camera facing moon from behind player
  await page.evaluate((my) => {
    const g = window.__game;
    g.player.teleport(3, 10, my);
    g.cam.yaw = my;
    g.cam.pitch = 0.22;
    g.cam.curDist = 5.5;
    g.cam.targetDist = 5.5;
  }, moonInfo.moonYaw);
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, 'shot_M1_moon_view.png') });
  console.log('Saved shot_M1_moon_view.png');

  // Shot M2: Player in plaza with Mayor Pumpkin, angled to catch the glowing town and moon
  await page.evaluate(() => {
    const g = window.__game;
    // Walk player close to Mayor Pumpkin (at 5.5, 10)
    g.player.teleport(3.5, 12.0, 0.4);
    g.cam.yaw = 0.8;
    g.cam.pitch = 0.16;
    g.cam.curDist = 4.2;
    g.cam.targetDist = 4.2;
    g.dayNight.setTime(19.8);
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, 'shot_M2_mayor_and_player.png') });
  console.log('Saved shot_M2_mayor_and_player.png');

  // Shot M3: Spiral Hill iconic viewpoint
  await page.evaluate(() => {
    const g = window.__game;
    // Move near Spiral Hill: { x: -102, z: -98 }
    g.player.teleport(-85, -80, -2.4);
    g.cam.yaw = -2.2;
    g.cam.pitch = 0.18;
    g.cam.curDist = 6.0;
    g.cam.targetDist = 6.0;
    g.dayNight.setTime(20.4);
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(outDir, 'shot_M3_spiral_hill.png') });
  console.log('Saved shot_M3_spiral_hill.png');

  // Shot M4: Closer camera on Plaza with the fountain, mayor and player
  await page.evaluate(() => {
    const g = window.__game;
    g.player.teleport(1.5, 15, Math.PI - 0.25);
    g.cam.yaw = 2.9;
    g.cam.pitch = 0.20;
    g.cam.curDist = 4.8;
    g.cam.targetDist = 4.8;
    g.dayNight.setTime(18.9);
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(outDir, 'shot_M4_golden_dusk_fountain.png') });
  console.log('Saved shot_M4_golden_dusk_fountain.png');

  // Shot M5: Plaza with WoW HUD ON (no tutorial popup, clean HUD)
  await page.keyboard.press('KeyZ'); // toggle HUD back on
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(outDir, 'shot_M5_hud_clean.png') });
  console.log('Saved shot_M5_hud_clean.png');

  await browser.close();
  server.close();
  console.log('Moon and hero shots done!');
}

main().catch(err => {
  console.error('Failed:', err);
  if (server) server.close();
  process.exit(1);
});
