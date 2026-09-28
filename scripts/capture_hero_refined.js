const http = require('http');
const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.static('.'));
const server = http.createServer(app);

async function main() {
  await new Promise(r => server.listen(3464, '127.0.0.1', r));
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

  await page.goto('http://127.0.0.1:3464/tumbalacatumba/Tumbalacatumba.html?play&notut&t=18.9&dist=4.5', { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => !document.getElementById('boot') || document.getElementById('boot').classList.contains('gone'), { timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  await page.evaluate(() => {
    const g = window.__game;
    if (g && g.post && g.post.bloomPass) {
      g.post.bloomPass.enabled = false;
    }
  });

  // Hide HUD
  await page.keyboard.press('KeyZ');
  await new Promise(r => setTimeout(r, 400));

  const outDir = path.join(__dirname, 'shots_hero');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Variation 1: Vicente facing 3/4 towards camera, standing in plaza
  await page.evaluate(() => {
    const g = window.__game;
    // position player near fountain & mayor
    g.player.teleport(2.2, 13.5, 0.5); // facing south-east towards camera
    g.cam.yaw = 2.95;
    g.cam.pitch = 0.16;
    g.cam.curDist = 4.2;
    g.cam.targetDist = 4.2;
    g.dayNight.setTime(18.95);
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'shot_H1_player_face_34.png') });
  console.log('Saved shot_H1_player_face_34.png');

  // Variation 2: A slightly wider hero shot framed with the streetlamp on right and fountain on left
  await page.evaluate(() => {
    const g = window.__game;
    g.player.teleport(2.0, 13.8, 0.35);
    g.cam.yaw = 2.92;
    g.cam.pitch = 0.19;
    g.cam.curDist = 5.0;
    g.cam.targetDist = 5.0;
    g.dayNight.setTime(19.1);
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'shot_H2_wider_frame.png') });
  console.log('Saved shot_H2_wider_frame.png');

  // Variation 3: Mayor Pumpkin in foreground right, player talking to him, fountain in background
  await page.evaluate(() => {
    const g = window.__game;
    g.player.teleport(4.2, 11.2, 2.2); // facing mayor
    g.cam.yaw = 2.4;
    g.cam.pitch = 0.18;
    g.cam.curDist = 4.0;
    g.cam.targetDist = 4.0;
    g.dayNight.setTime(18.9);
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(outDir, 'shot_H3_dialogue_angle.png') });
  console.log('Saved shot_H3_dialogue_angle.png');

  await browser.close();
  server.close();
  console.log('Hero shots completed!');
}

main().catch(err => {
  console.error(err);
  if (server) server.close();
  process.exit(1);
});
