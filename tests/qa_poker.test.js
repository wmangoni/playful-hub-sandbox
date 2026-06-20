const http = require('http');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = 3003;

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
  console.log('--- STARTING QA TEST SUITE FOR POKER BOT REMOVAL ---');
  
  console.log('Loading puppeteer (ESM)...');
  const puppeteerModule = await import('puppeteer');
  puppeteer = puppeteerModule.default;
  
  await startServer();
  
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  page = await browser.newPage();
  
  // Handle alerts/dialogs
  page.on('dialog', async dialog => {
    console.log(`[DIALOG] ${dialog.type().toUpperCase()}: ${dialog.message()}`);
    await dialog.accept();
  });

  // Capture browser logs
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('faliu') || msg.text().includes('venceu') || msg.text().includes('iniciada')) {
      console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
    }
  });

  console.log('Navigating to Poker game page...');
  await page.goto(`http://127.0.0.1:${PORT}/poker`, { waitUntil: 'networkidle2' });
  
  // 1. Start single player game
  console.log('Clicking "Single Player" button...');
  await page.click('#single-player');
  await new Promise(r => setTimeout(r, 1000));

  // Check players count initially
  let playersCount = await page.evaluate(() => gameState.players.length);
  console.log(`Initial players count: ${playersCount}`);
  if (playersCount !== 3) {
    throw new Error(`Expected 3 players initially, got ${playersCount}`);
  }

  // 2. Test Case 1: Mock bot 1 bankruptcy
  console.log('\n--- Test Case 1: AI 1 goes bankrupt ---');
  await page.evaluate(() => {
    // Set AI 1 (index 1) chips to 0
    gameState.players[1].chips = 0;
    console.log('Set AI 1 chips to 0.');
    startNewHand();
  });
  await new Promise(r => setTimeout(r, 4000)); // wait for alerts/timers

  playersCount = await page.evaluate(() => gameState.players.length);
  console.log(`Players count after AI 1 bankruptcy: ${playersCount}`);
  if (playersCount !== 2) {
    throw new Error(`Expected 2 players after AI 1 bankruptcy, got ${playersCount}`);
  }
  let ai1Present = await page.evaluate(() => gameState.players.some(p => p.name === 'AI 1'));
  console.log(`Is AI 1 still in the game? ${ai1Present}`);
  if (ai1Present) {
    throw new Error('AI 1 should have been removed from gameState.players');
  }

  // 3. Test Case 2: Mock bot 2 bankruptcy -> Victory!
  console.log('\n--- Test Case 2: AI 2 goes bankrupt (Human Victory) ---');
  await page.evaluate(() => {
    // Set AI 2 (which is now index 1) chips to 0
    gameState.players[1].chips = 0;
    console.log('Set AI 2 chips to 0.');
    startNewHand();
  });
  await new Promise(r => setTimeout(r, 4000)); // wait for alerts/timers

  // The game should have reset to main menu
  let modeSelectVisible = await page.evaluate(() => {
    const el = document.querySelector('.mode-select');
    return el && el.style.display !== 'none';
  });
  console.log(`Is mode select screen visible (Human Won)? ${modeSelectVisible}`);
  if (!modeSelectVisible) {
    throw new Error('Game did not reset to mode selection screen after human victory');
  }

  // 4. Test Case 3: Human bankruptcy -> Game Over
  console.log('\n--- Test Case 3: Human goes bankrupt (Defeat) ---');
  // Restart the game first
  console.log('Clicking "Single Player" button to restart...');
  await page.click('#single-player');
  await new Promise(r => setTimeout(r, 1000));

  await page.evaluate(() => {
    // Set human (index 0) chips to 0
    gameState.players[0].chips = 0;
    console.log('Set Human chips to 0.');
    startNewHand();
  });
  await new Promise(r => setTimeout(r, 4000)); // wait for alerts/timers

  modeSelectVisible = await page.evaluate(() => {
    const el = document.querySelector('.mode-select');
    return el && el.style.display !== 'none';
  });
  console.log(`Is mode select screen visible (Human Bankrupt)? ${modeSelectVisible}`);
  if (!modeSelectVisible) {
    throw new Error('Game did not reset to mode selection screen after human defeat');
  }

  console.log('\n=============================================');
  console.log('🎉 ALL POKER BOT REMOVAL TESTS PASSED SUCCESSFULLY!');
  console.log('=============================================');
}

(async () => {
  try {
    await runTests();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ QA TEST SUITE FAILED:', err.message || err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }
})();
