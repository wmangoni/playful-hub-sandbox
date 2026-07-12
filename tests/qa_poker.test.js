const http = require('http');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = process.env.TEST_PORT || 3088;

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
  if (playersCount !== 4) {
    throw new Error(`Expected 4 players initially, got ${playersCount}`);
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
  if (playersCount !== 3) {
    throw new Error(`Expected 3 players after AI 1 bankruptcy, got ${playersCount}`);
  }
  let ai1Present = await page.evaluate(() => gameState.players.some(p => p.name === 'Arthur "The Shark"'));
  console.log(`Is AI 1 still in the game? ${ai1Present}`);
  if (ai1Present) {
    throw new Error('AI 1 should have been removed from gameState.players');
  }

  // 3. Test Case 2: Mock bot 2 bankruptcy -> Victory!
  console.log('\n--- Test Case 2: AI 2 goes bankrupt (Human Victory) ---');
  await page.evaluate(() => {
    // Set both remaining AI opponents (indices 1 and 2) chips to 0
    gameState.players[1].chips = 0;
    gameState.players[2].chips = 0;
    console.log('Set remaining AIs chips to 0.');
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

  // 5. Test Case 4: Verify Tournament Selection Overlay & Wallet
  console.log('\n--- Test Case 4: Verify Tournament Selection Overlay & Wallet ---');
  console.log('Clicking "Modo Torneio" button...');
  await page.click('#tournament-mode');
  await new Promise(r => setTimeout(r, 500));

  let tournamentOverlayVisible = await page.evaluate(() => {
    const el = document.getElementById('tournamentOverlay');
    return el && el.classList.contains('show');
  });
  console.log(`Is tournament overlay visible? ${tournamentOverlayVisible}`);
  if (!tournamentOverlayVisible) {
    throw new Error('Tournament overlay is not visible after clicking Modo Torneio');
  }

  let walletValue = await page.evaluate(() => {
    const el = document.getElementById('walletDisplay');
    return el ? el.textContent.trim() : '';
  });
  console.log(`Wallet display: ${walletValue}`);
  if (walletValue !== '$1000') {
    throw new Error(`Expected wallet to display $1000 initially, got ${walletValue}`);
  }

  let tournamentCardsCount = await page.evaluate(() => {
    return document.querySelectorAll('.tournament-card').length;
  });
  console.log(`Number of tournament cards: ${tournamentCardsCount}`);
  if (tournamentCardsCount !== 3) {
    throw new Error(`Expected 3 tournament cards, got ${tournamentCardsCount}`);
  }

  console.log('Clicking tournament overlay "Voltar" button...');
  await page.click('#tournamentClose');
  await new Promise(r => setTimeout(r, 500));

  tournamentOverlayVisible = await page.evaluate(() => {
    const el = document.getElementById('tournamentOverlay');
    return el && el.classList.contains('show');
  });
  console.log(`Is tournament overlay visible after closing? ${tournamentOverlayVisible}`);
  if (tournamentOverlayVisible) {
    throw new Error('Tournament overlay is still visible after clicking Voltar');
  }

  // 6. Test Case 5: Verify Profile Modal & Trophy Gallery
  console.log('\n--- Test Case 5: Verify Profile Modal & Trophy Gallery ---');
  console.log('Clicking "Perfil & Troféus" button...');
  await page.click('#openProfileBtn');
  await new Promise(r => setTimeout(r, 500));

  let profileOverlayVisible = await page.evaluate(() => {
    const el = document.getElementById('profileOverlay');
    return el && el.classList.contains('show');
  });
  console.log(`Is profile overlay visible? ${profileOverlayVisible}`);
  if (!profileOverlayVisible) {
    throw new Error('Profile overlay is not visible after clicking Perfil & Troféus');
  }

  let trophySlotsCount = await page.evaluate(() => {
    return document.querySelectorAll('.trophy-slot').length;
  });
  console.log(`Number of trophy slots: ${trophySlotsCount}`);
  if (trophySlotsCount !== 3) {
    throw new Error(`Expected 3 trophy slots, got ${trophySlotsCount}`);
  }

  console.log('Clicking profile overlay "Fechar" button...');
  await page.click('#profileClose');
  await new Promise(r => setTimeout(r, 500));

  profileOverlayVisible = await page.evaluate(() => {
    const el = document.getElementById('profileOverlay');
    return el && el.classList.contains('show');
  });
  console.log(`Is profile overlay visible after closing? ${profileOverlayVisible}`);
  if (profileOverlayVisible) {
    throw new Error('Profile overlay is still visible after clicking Fechar');
  }

  // 7. Test Case 6: Verify 3D Chip Stacks calculation
  console.log('\n--- Test Case 6: Verify 3D Chip Stacks calculation ---');
  let chipCalculation = await page.evaluate(() => {
    return calculateChipsForAmount(1280);
  });
  console.log(`Chip calculation for $1280: ${JSON.stringify(chipCalculation)}`);
  if (chipCalculation.black !== 2 || chipCalculation.green !== 2 || chipCalculation.blue !== 1 || chipCalculation.red !== 3) {
    throw new Error(`Unexpected chip stack calculation: ${JSON.stringify(chipCalculation)}`);
  }

  // 8. Test Case 7: Start Tournament & Check HUD, Blinds and Roles
  console.log('\n--- Test Case 7: Start Tournament & Check HUD, Blinds and Roles ---');
  console.log('Opening tournament overlay again...');
  await page.click('#tournament-mode');
  await new Promise(r => setTimeout(r, 500));

  console.log('Clicking Bronze Pub Cup tournament card...');
  await page.evaluate(() => {
    // Click the first tournament card (Bronze Pub Cup)
    const cards = document.querySelectorAll('.tournament-card');
    if (cards.length > 0) cards[0].click();
  });
  await new Promise(r => setTimeout(r, 1000));

  let blindsHudStyle = await page.evaluate(() => {
    const el = document.getElementById('blindsHud');
    return el ? getComputedStyle(el).display : 'none';
  });
  console.log(`Blinds HUD display style: ${blindsHudStyle}`);
  if (blindsHudStyle === 'none') {
    throw new Error('Blinds HUD is not visible in tournament mode');
  }

  let blindsText = await page.evaluate(() => {
    const el = document.getElementById('bhBlinds');
    return el ? el.textContent.trim() : '';
  });
  console.log(`Blinds HUD text: ${blindsText}`);
  if (blindsText !== '10 / 20') {
    throw new Error(`Expected blinds to be 10 / 20, got ${blindsText}`);
  }

  let currentOpponents = await page.evaluate(() => {
    return gameState.players.map(p => p.name);
  });
  console.log(`Active players in tournament: ${JSON.stringify(currentOpponents)}`);
  // Expected opponents for Bronze Pub Cup: Arthur "The Shark", Beatriz "Calling Station", Caio "The Maniac"
  if (currentOpponents.length !== 4) {
    throw new Error(`Expected 4 players in tournament, got ${currentOpponents.length}`);
  }

  let hasBlindRoles = await page.evaluate(() => {
    return gameState.players.every(p => p._blindRole === 'SB' || p._blindRole === 'BB' || p._blindRole === 'D' || p._blindRole === null);
  });
  console.log(`Do all players have correct blind roles? ${hasBlindRoles}`);
  if (!hasBlindRoles) {
    throw new Error('Some players have invalid blind roles assigned');
  }

  let dealerExists = await page.evaluate(() => {
    return gameState.players.some(p => p._blindRole === 'D');
  });
  let sbExists = await page.evaluate(() => {
    return gameState.players.some(p => p._blindRole === 'SB');
  });
  let bbExists = await page.evaluate(() => {
    return gameState.players.some(p => p._blindRole === 'BB');
  });
  console.log(`Tokens assigned - Dealer: ${dealerExists}, SB: ${sbExists}, BB: ${bbExists}`);
  if (!dealerExists || !sbExists || !bbExists) {
    throw new Error('Missing D, SB, or BB role assignment on active hands');
  }

  console.log('\n=============================================');
  console.log('🎉 ALL POKER TASK_003 TESTS PASSED SUCCESSFULLY!');
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
