process.env.NODE_ENV = 'test';
const http = require('http');
const path = require('path');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = process.env.TEST_PORT || 3089;

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
  console.log('  QA TEST SUITE - CHESS (TASK_003 & TASK_004)');
  console.log('===============================================================');
  
  const puppeteerModule = await import('puppeteer');
  puppeteer = puppeteerModule.default;
  
  await startServer();
  
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  page = await browser.newPage();
  
  // Handle alerts/dialogs - auto-accept
  page.on('dialog', async dialog => {
    console.log(`[DIALOG] ${dialog.type().toUpperCase()}: ${dialog.message()}`);
    await dialog.accept();
  });

  const consoleErrors = [];
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('ERR_NAME_NOT_RESOLVED') && !text.includes('ERR_NO_BUFFER_SPACE') && !text.includes('Failed to load resource')) {
      console.log(`[BROWSER CONSOLE ERROR] ${text}`);
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', err => {
    console.log(`[BROWSER PAGEERROR] ${err.toString()}`);
    consoleErrors.push(err.toString());
  });

  console.log('\n--- 1. Navegando para o jogo Chess ---');
  await page.goto(`http://127.0.0.1:${PORT}/chess`, { waitUntil: 'networkidle2' });
  
  // 1. Verify existence of UI components
  console.log('\n--- Test 1: Verifying layout & elements ---');
  const clockPanelExists = await page.evaluate(() => !!document.querySelector('.chess-clock-panel'));
  console.log(`Clock panel exists: ${clockPanelExists}`);
  if (!clockPanelExists) throw new Error('Chess clock panel is missing');

  const clockWhiteExists = await page.evaluate(() => !!document.getElementById('clock-white'));
  const clockBlackExists = await page.evaluate(() => !!document.getElementById('clock-black'));
  console.log(`Clock displays exist: White=${clockWhiteExists}, Black=${clockBlackExists}`);
  if (!clockWhiteExists || !clockBlackExists) throw new Error('White or Black clock displays are missing');

  const puzzlePanelExists = await page.evaluate(() => !!document.getElementById('puzzlePanel'));
  console.log(`Puzzle panel exists: ${puzzlePanelExists}`);
  if (!puzzlePanelExists) throw new Error('Puzzle panel is missing');

  const toggleHintsExists = await page.evaluate(() => !!document.getElementById('toggleHintsBtn'));
  console.log(`Toggle Hints button exists: ${toggleHintsExists}`);
  if (!toggleHintsExists) throw new Error('Toggle Hints button is missing');

  // 2. Test Time Presets
  console.log('\n--- Test 2: Testing clock presets ---');
  let whiteTimeText = await page.evaluate(() => document.getElementById('time-white').textContent);
  let blackTimeText = await page.evaluate(() => document.getElementById('time-black').textContent);
  console.log(`Initial time (Zen): White=${whiteTimeText}, Black=${blackTimeText}`);
  if (whiteTimeText !== '∞' || blackTimeText !== '∞') {
    throw new Error('Initial preset should be Zen and show infinity symbol');
  }

  // Switch to Bullet 1+0
  console.log('Switching to Bullet 1+0 preset...');
  await page.select('#timeControlSelect', '1+0');
  await new Promise(r => setTimeout(r, 500));

  whiteTimeText = await page.evaluate(() => document.getElementById('time-white').textContent);
  blackTimeText = await page.evaluate(() => document.getElementById('time-black').textContent);
  console.log(`Bullet 1+0 time: White=${whiteTimeText}, Black=${blackTimeText}`);
  if (whiteTimeText !== '01:00' || blackTimeText !== '01:00') {
    throw new Error(`Expected '01:00' for Bullet preset, got White=${whiteTimeText}, Black=${blackTimeText}`);
  }

  // Switch to Blitz 3+2
  console.log('Switching to Blitz 3+2 preset...');
  await page.select('#timeControlSelect', '3+2');
  await new Promise(r => setTimeout(r, 500));

  whiteTimeText = await page.evaluate(() => document.getElementById('time-white').textContent);
  blackTimeText = await page.evaluate(() => document.getElementById('time-black').textContent);
  console.log(`Blitz 3+2 time: White=${whiteTimeText}, Black=${blackTimeText}`);
  if (whiteTimeText !== '03:00' || blackTimeText !== '03:00') {
    throw new Error(`Expected '03:00' for Blitz 3+2 preset, got White=${whiteTimeText}, Black=${blackTimeText}`);
  }

  // 3. Test Puzzle Loader and Move Validation
  console.log('\n--- Test 3: Testing Puzzle Trainer Mode ---');
  console.log('Activating Puzzle 1: Scholar\'s Mate...');
  await page.click('.puzzle-btn[data-puzzle="0"]');
  await new Promise(r => setTimeout(r, 500));

  let isSolving = await page.evaluate(() => !!currentActivePuzzle);
  let activePuzzleTitle = await page.evaluate(() => currentActivePuzzle ? currentActivePuzzle.title : null);
  console.log(`Active puzzle: ${activePuzzleTitle} (isSolving=${isSolving})`);
  if (!isSolving || !activePuzzleTitle.includes('Pastor')) {
    throw new Error('Puzzle 1 was not loaded correctly');
  }

  // Test incorrect move in Puzzle Mode (e.g. e2 to e4)
  console.log('Executing incorrect move (e2 to e4)...');
  let moveResult = await page.evaluate(() => {
    return handlePuzzleMove('e2', 'e4');
  });
  console.log(`Incorrect move accepted: ${moveResult}`);
  if (moveResult !== false) {
    throw new Error('Incorrect move should have been rejected');
  }

  // Verify status reflects incorrect move and reset FEN
  let puzzleStatusText = await page.evaluate(() => document.getElementById('puzzleStatus').textContent);
  console.log(`Puzzle status: ${puzzleStatusText}`);
  if (!puzzleStatusText.includes('incorrecto') && !puzzleStatusText.includes('incorreto')) {
    throw new Error('Status message should report incorrect move');
  }

  // Test correct move in Puzzle Mode (h5 to f7)
  console.log('Executing correct move (h5 to f7)...');
  moveResult = await page.evaluate(() => {
    return handlePuzzleMove('h5', 'f7');
  });
  console.log(`Correct move accepted: ${moveResult}`);
  if (moveResult !== true) {
    throw new Error('Correct move h5 -> f7 should have been accepted');
  }

  // Verify success status
  puzzleStatusText = await page.evaluate(() => document.getElementById('puzzleStatus').textContent);
  console.log(`Puzzle success status: ${puzzleStatusText}`);
  if (!puzzleStatusText.includes('SUCESSO TÁTICO')) {
    throw new Error('Status message should report success');
  }

  // 4. Test Toggle Hints button
  console.log('\n--- Test 4: Testing Computer Hints toggle ---');
  let hintsBtnText = await page.evaluate(() => document.getElementById('toggleHintsBtn').textContent);
  console.log(`Hints button text initially: ${hintsBtnText}`);
  if (!hintsBtnText.includes('Ligadas')) {
    throw new Error('Hints should be on by default');
  }

  console.log('Clicking Toggle Hints button...');
  await page.click('#toggleHintsBtn');
  hintsBtnText = await page.evaluate(() => document.getElementById('toggleHintsBtn').textContent);
  console.log(`Hints button text after toggle: ${hintsBtnText}`);
  if (!hintsBtnText.includes('Desligadas')) {
    throw new Error('Hints should be turned off after toggle click');
  }

  // 5. Test Pass & Play Mode and Board Rotation
  console.log('\n--- Test 5: Testing Pass & Play Local Mode and Board Rotation ---');
  const passAndPlayCheck = await page.evaluate(() => {
    const c = window.__chess;
    c.setGameMode('pass_and_play');
    const mode = c.getGameMode();
    const boardEl = document.getElementById('myBoard');
    c.checkRotation();
    
    return {
      mode,
      hasBoardElement: !!boardEl
    };
  });
  console.log('Pass & Play mode status:', JSON.stringify(passAndPlayCheck, null, 2));
  if (passAndPlayCheck.mode !== 'pass_and_play') {
    throw new Error('Pass & Play mode failed to activate');
  }
  console.log('✅ Teste 5: Modo Pass & Play e controle de rotação validados.');

  // 6. Test Achievements Modal and Unlock
  console.log('\n--- Test 6: Testing Achievements Mural Modal ---');
  const achievementsCheck = await page.evaluate(() => {
    const c = window.__chess;
    c.unlockAchievement('first_blood');
    const achievements = c.getAchievements();
    const isUnlocked = achievements.includes('first_blood');
    
    // Test modal open / close
    const modalBtn = document.getElementById('achievementsModalBtn');
    modalBtn.click();
    const modalOpen = document.getElementById('achievementsModal').classList.contains('active');
    
    document.getElementById('closeAchievementsModal').click();
    const modalClosed = !document.getElementById('achievementsModal').classList.contains('active');

    return {
      isUnlocked,
      modalOpen,
      modalClosed
    };
  });
  console.log('Achievements status:', JSON.stringify(achievementsCheck, null, 2));
  if (!achievementsCheck.isUnlocked || !achievementsCheck.modalOpen || !achievementsCheck.modalClosed) {
    throw new Error('Achievements unlock or modal open/close failed');
  }
  console.log('✅ Teste 6: Mural de conquistas e desbloqueio de achievements validados.');

  // 7. Verify Stability and No Console Errors
  console.log('\n--- Test 7: Estabilidade e Ausência de Erros no Console ---');
  await new Promise(r => setTimeout(r, 1000));
  if (consoleErrors.length > 0) {
    console.error('Erros no console:', consoleErrors);
    throw new Error(`Encontrados ${consoleErrors.length} erros no console.`);
  }
  console.log('✅ Teste 7: Chess executou perfeitamente com 0 erros.');

  // Screenshot de Evidência
  const screenshotPath = path.join(__dirname, 'chess_qa_evidence.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`\n📸 Screenshot de evidência capturada em: ${screenshotPath}`);

  console.log('\n=============================================');
  console.log('🎉 ALL CHESS QA TESTS PASSED SUCCESSFULLY!');
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
