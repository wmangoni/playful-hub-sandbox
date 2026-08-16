process.env.NODE_ENV = 'test';
const http = require('http');
const path = require('path');
const fs = require('fs');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = process.env.TEST_PORT || 3103;

async function startServer() {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`Test server running on http://127.0.0.1:${PORT}`);
      resolve();
    });
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('  QA TEST SUITE - CATALOG, MENU & GAME PAGES VERIFICATION');
  console.log('===============================================================');

  const puppeteerModule = await import('puppeteer');
  puppeteer = puppeteerModule.default;

  await startServer();

  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  page = await browser.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('ERR_NAME_NOT_RESOLVED')) {
      console.log(`[BROWSER ERROR] ${text}`);
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', err => {
    console.log(`[BROWSER PAGEERROR] ${err.toString()}`);
    consoleErrors.push(err.toString());
  });

  console.log('\n--- 1. Navegando para o Menu Principal (index.html) ---');
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });

  // 1. Validar contagem e presença de todos os cards de jogos no menu
  console.log('\n--- Test 1: Verificação dos Cards do Menu Principal ---');
  const menuCards = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('.game-grid a.play-button'));
    return links.map(link => {
      const title = link.querySelector('.game-title')?.textContent?.trim();
      const href = link.getAttribute('href');
      const icon = link.querySelector('.icon-centered')?.textContent?.trim();
      return { title, href, icon };
    });
  });

  console.log(`Total de jogos encontrados no menu principal: ${menuCards.length}`);
  console.log('Lista de Jogos no Menu:', menuCards.map(c => `${c.icon} ${c.title} (${c.href})`));

  const hasPinball = menuCards.some(c => c.href.includes('pinball'));
  const hasEarth = menuCards.some(c => c.href.includes('threejs_earth'));

  if (!hasPinball || !hasEarth || menuCards.length !== 22) {
    throw new Error(`Menu principal deve conter exatamente 22 jogos, incluindo Pinball e Three.js Earth. Encontrados: ${menuCards.length}`);
  }
  console.log('✅ Teste 1: Todos os 22 jogos (incluindo Pinball e Three.js Earth) estão presentes no menu principal.');

  // 2. Validar que todas as 22 páginas em /jogos/ respondem com sucesso
  console.log('\n--- Test 2: Validação de Acesso a Todas as Páginas de Jogos (/jogos/...) ---');
  const gamesControl = JSON.parse(fs.readFileSync(path.join(__dirname, '../games_control.json'), 'utf8'));
  console.log(`Total de jogos cadastrados em games_control.json: ${gamesControl.length}`);

  for (const game of gamesControl) {
    const url = `http://127.0.0.1:${PORT}${game.path}`;
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
    const status = res.status();
    const title = await page.title();
    console.log(`  - [${status}] ${game.name} -> URL: ${game.path} | Título: "${title}"`);
    if (status !== 200) {
      throw new Error(`Falha ao carregar página do jogo ${game.name} em ${url} (Status: ${status})`);
    }
  }
  console.log('✅ Teste 2: Todas as 22 páginas de jogos responderam com status 200 HTTP.');

  // 3. Validar integridade da nova página de Three.js Earth
  console.log('\n--- Test 3: Verificação Específica da Nova Página Three.js Earth ---');
  await page.goto(`http://127.0.0.1:${PORT}/jogos/threejs_earth`, { waitUntil: 'domcontentloaded', timeout: 10000 });
  const earthPageDetails = await page.evaluate(() => {
    const h1 = document.querySelector('h1')?.textContent?.trim();
    const playBtn = document.querySelector('a.play-btn, a[href*="threejs-earth-main"]');
    const playUrl = playBtn?.getAttribute('href');
    const relatedCount = document.querySelectorAll('.related-game').length;
    return { h1, playUrl, relatedCount };
  });

  console.log('Detalhes da página Three.js Earth:', earthPageDetails);
  if (!earthPageDetails.playUrl || !earthPageDetails.playUrl.includes('threejs-earth-main')) {
    throw new Error('Link de jogar em Three.js Earth deve apontar para /threejs-earth-main/');
  }
  console.log('✅ Teste 3: Página Three.js Earth possui layout canônico e link correto para a simulação 3D.');

  // Tirar Screenshot de Evidência
  const screenshotPath = path.join(__dirname, 'catalog_and_menu_qa_evidence.png');
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n📸 Screenshot de evidência do Menu Principal capturada em: ${screenshotPath}`);

  console.log('\n===============================================================');
  console.log('🎉 TODOS OS TESTES DE QA DO CATÁLOGO E MENU PRINCIPAL PASSARAM!');
  console.log('===============================================================');
}

runTests()
  .then(async () => {
    if (browser) await browser.close();
    if (server) server.close();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('❌ QA TEST SUITE FAILED:', err);
    if (browser) await browser.close();
    if (server) server.close();
    process.exit(1);
  });
