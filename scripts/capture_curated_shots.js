const http = require('http');
const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.static('.'));
const server = http.createServer(app);

async function main() {
  await new Promise(r => server.listen(3462, '127.0.0.1', r));
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
  // 16:9 ratio, crisp high resolution
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });

  // Navigate with play, alta quality, no tutorial popup, specific dusk time
  console.log('Loading game with ?play&notut&t=18.8...');
  await page.goto('http://127.0.0.1:3462/tumbalacatumba/Tumbalacatumba.html?play&notut&t=18.8&dist=6', { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => !document.getElementById('boot') || document.getElementById('boot').classList.contains('gone'), { timeout: 20000 });
  await new Promise(r => setTimeout(r, 2500));

  // Configure passes: disable bloom pass which causes black screen in D3D11 headless, keep outline and grade passes
  await page.evaluate(() => {
    const g = window.__game;
    if (g && g.post && g.post.bloomPass) {
      g.post.bloomPass.enabled = false;
    }
  });
  await new Promise(r => setTimeout(r, 800));

  const outDir = path.join(__dirname, 'shots_curated');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Shot A: Default camera with full WoW HUD and zone text
  await page.screenshot({ path: path.join(outDir, 'shot_A_gameplay_hud.png') });
  console.log('Saved shot_A_gameplay_hud.png');

  // Hide HUD for cinematic shots
  await page.keyboard.press('KeyZ');
  await new Promise(r => setTimeout(r, 600));

  // Shot B: Cinematic town plaza at dusk (no HUD, player looking at fountain and town)
  await page.screenshot({ path: path.join(outDir, 'shot_B_cinematic_plaza_dusk.png') });
  console.log('Saved shot_B_cinematic_plaza_dusk.png');

  // Shot C: Camera angled slightly lower, looking up towards the clock tower, festive lights, and starry sky
  await page.evaluate(() => {
    const g = window.__game;
    g.cam.pitch = 0.28;
    g.cam.curDist = 5.2;
    g.cam.targetDist = 5.2;
    g.dayNight.setTime(19.2); // nightfall with stars and full lamps
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'shot_C_cinematic_night_lights.png') });
  console.log('Saved shot_C_cinematic_night_lights.png');

  // Shot D: Front-three-quarter view of character, Mayor Pumpkin, and glowing fountain
  await page.evaluate(() => {
    const g = window.__game;
    g.cam.yaw = Math.PI - 0.9;
    g.cam.pitch = 0.18;
    g.cam.curDist = 4.8;
    g.cam.targetDist = 4.8;
    g.dayNight.setTime(18.9);
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'shot_D_character_hero.png') });
  console.log('Saved shot_D_character_hero.png');

  // Shot E: Orbit view from plaza showing crooked houses, market stalls, and cobblestone
  await page.evaluate(() => {
    const g = window.__game;
    g.cam.yaw = Math.PI * 0.45;
    g.cam.pitch = 0.22;
    g.cam.curDist = 6.5;
    g.cam.targetDist = 6.5;
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'shot_E_plaza_panoramic.png') });
  console.log('Saved shot_E_plaza_panoramic.png');

  // Shot F: Title screen with orbiting camera and glowing logo
  const pageTitle = await browser.newPage();
  await pageTitle.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await pageTitle.goto('http://127.0.0.1:3462/tumbalacatumba/Tumbalacatumba.html', { waitUntil: 'networkidle2' });
  await pageTitle.waitForFunction(() => !document.getElementById('boot') || document.getElementById('boot').classList.contains('gone'), { timeout: 20000 });
  await pageTitle.evaluate(() => {
    const g = window.__game;
    if (g && g.post && g.post.bloomPass) {
      g.post.bloomPass.enabled = false;
    }
  });
  await new Promise(r => setTimeout(r, 3000));
  await pageTitle.screenshot({ path: path.join(outDir, 'shot_F_title_screen.png') });
  console.log('Saved shot_F_title_screen.png');

  await browser.close();
  server.close();
  console.log('All curated shots captured successfully!');
}

main().catch(err => {
  console.error('Curated capture failed:', err);
  if (server) server.close();
  process.exit(1);
});
