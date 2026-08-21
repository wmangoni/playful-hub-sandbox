process.env.NODE_ENV = 'test';
const http = require('http');
const path = require('path');
const fs = require('fs');
const app = require('../server');

(async () => {
  const server = http.createServer(app);
  await new Promise(r => server.listen(3108, '127.0.0.1', r));
  console.log('Server listening on 3108');

  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 800, deviceScaleFactor: 2 });

  await page.goto('http://127.0.0.1:3108/pinball/index.html', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 600));

  // Lançar a bola para capturar a mesa em ação com luzes e rastro
  await page.keyboard.down(' ');
  await new Promise(r => setTimeout(r, 250));
  await page.keyboard.up(' ');
  await new Promise(r => setTimeout(r, 500));

  // Localizar o canvas
  const canvasElement = await page.$('canvas');
  const targetPath = path.join(__dirname, '..', 'assets', 'images', 'pinball_preview.png');

  if (canvasElement) {
    await canvasElement.screenshot({ path: targetPath });
  } else {
    await page.screenshot({ path: targetPath });
  }

  console.log('Saved preview to:', targetPath, 'Size:', fs.statSync(targetPath).size, 'bytes');

  await browser.close();
  server.close();
  process.exit(0);
})();
