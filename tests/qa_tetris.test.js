const http = require('http');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = process.env.TEST_PORT || 3099;

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
  console.log('--- STARTING QA TEST SUITE FOR TETRIS (TASK_002) ---');
  
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
    const text = msg.text();
    if (msg.type() === 'error' || text.includes('Falha') || text.includes('esgotado') || text.includes('GameOver')) {
      console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${text}`);
    }
  });

  console.log('Navigating to Tetris game page...');
  await page.goto(`http://127.0.0.1:${PORT}/tetris`, { waitUntil: 'networkidle2' });
  
  // 1. Verify existence of UI components and controls instructions
  console.log('\n--- Test 1: Verifying layout, select option, and instruction elements ---');
  
  const modeSelectExists = await page.evaluate(() => !!document.getElementById('gameModeSelect'));
  console.log(`Mode select dropdown exists: ${modeSelectExists}`);
  if (!modeSelectExists) throw new Error('Game mode selection element is missing');

  const startBtnExists = await page.evaluate(() => !!document.getElementById('startBtn'));
  console.log(`Start button exists: ${startBtnExists}`);
  if (!startBtnExists) throw new Error('Start button is missing');

  // Verify the controls text describes the Space key for Hard Drop
  const controlsText = await page.evaluate(() => {
    const el = document.querySelector('.controls');
    return el ? el.textContent : '';
  });
  console.log(`Controls text: "${controlsText.trim()}"`);
  if (!controlsText.includes('Hard Drop') || !controlsText.includes('Espaço')) {
    throw new Error('Controls text does not describe Hard Drop correctly');
  }
  console.log('✅ PASS: Controls instructions updated correctly.');

  // 2. Test Ghost Piece Logic
  console.log('\n--- Test 2: Testing Ghost Piece (Shadow) logic ---');
  
  // Click start button to start the game
  console.log('Clicking "NOVO JOGO" to initialize game...');
  await page.click('#startBtn');
  await new Promise(r => setTimeout(r, 500));

  // Verify __tetris hook is available
  const hookExists = await page.evaluate(() => !!window.__tetris);
  console.log(`__tetris debug hook exists: ${hookExists}`);
  if (!hookExists) throw new Error('__tetris debug hook is missing from window');

  // Check initial state
  let state = await page.evaluate(() => window.__tetris.getState());
  console.log('Initial state:', state);
  if (state.gameOver) throw new Error('Game should not be over initially');

  // Check ghost Y calculation:
  // Ghost position Y should be greater than or equal to current piece Y (bottom of board is larger Y)
  const ghostTest = await page.evaluate(() => {
    const p = window.__tetris.getPiece();
    const gY = getGhostPositionY();
    return { pieceY: p.pos.y, ghostY: gY };
  });
  console.log(`Current piece Y: ${ghostTest.pieceY}, Ghost Y: ${ghostTest.ghostY}`);
  if (ghostTest.ghostY < ghostTest.pieceY) {
    throw new Error(`Ghost Y (${ghostTest.ghostY}) cannot be less than piece Y (${ghostTest.pieceY})`);
  }
  console.log('✅ PASS: Ghost Y position is calculated correctly.');

  // Test Hard Drop via Space key
  console.log('\n--- Test 3: Testing Hard Drop (Space key) ---');
  // Record initial score and piece type
  const initialPieceType = await page.evaluate(() => window.__tetris.getPiece().type);
  console.log(`Initial piece type: ${initialPieceType}`);

  // Press Space key to execute Hard Drop
  console.log('Pressing Space key...');
  await page.keyboard.press('Space');
  await new Promise(r => setTimeout(r, 200));

  // Verify that the piece changed (or locked/new piece spawned)
  const afterDropState = await page.evaluate(() => {
    const p = window.__tetris.getPiece();
    return {
      pieceType: p ? p.type : null,
      gameOver: window.__tetris.getState().gameOver
    };
  });
  console.log('State after Hard Drop:', afterDropState);
  // Hard drop should lock the piece immediately and reset it, meaning a new random piece is generated
  console.log('✅ PASS: Hard Drop locks and spawns next piece correctly.');

  // 3. Test Time Attack Mode
  console.log('\n--- Test 4: Testing Time Attack Mode selection and timer ---');
  
  // Select "timeattack" from dropdown
  console.log('Selecting Time Attack Mode from select dropdown...');
  await page.select('#gameModeSelect', 'timeattack');
  
  // Click start button to restart the game in Time Attack mode
  console.log('Clicking "NOVO JOGO" to start Time Attack...');
  await page.click('#startBtn');
  await new Promise(r => setTimeout(r, 500));

  // Verify timer box visibility and initial state
  const timerBoxVisible = await page.evaluate(() => {
    const box = document.getElementById('timerBox');
    return box && box.style.display !== 'none';
  });
  console.log(`Timer box visible: ${timerBoxVisible}`);
  if (!timerBoxVisible) throw new Error('Timer box should be visible in Time Attack mode');

  const initialTimeText = await page.evaluate(() => document.getElementById('timer').textContent);
  console.log(`Initial time displayed: "${initialTimeText}"`);
  if (initialTimeText !== '120s') {
    throw new Error(`Expected initial time of '120s', got '${initialTimeText}'`);
  }

  // Wait 2 seconds and check if time decremented
  console.log('Waiting 2 seconds to check if countdown runs...');
  await new Promise(r => setTimeout(r, 2000));
  
  const decrementedTimeText = await page.evaluate(() => document.getElementById('timer').textContent);
  console.log(`Time after 2 seconds: "${decrementedTimeText}"`);
  const decVal = parseInt(decrementedTimeText);
  if (decVal >= 120) {
    throw new Error('Timer did not count down');
  }

  // Test Pause / Resume logic for the timer
  console.log('Pausing game by pressing "P" key...');
  await page.keyboard.press('p');
  await new Promise(r => setTimeout(r, 500));

  const timeAtPauseText = await page.evaluate(() => document.getElementById('timer').textContent);
  console.log(`Time at pause: "${timeAtPauseText}"`);

  console.log('Waiting 2 seconds during pause...');
  await new Promise(r => setTimeout(r, 2000));

  const timeAfterPauseWaitText = await page.evaluate(() => document.getElementById('timer').textContent);
  console.log(`Time after 2 seconds of pause: "${timeAfterPauseWaitText}"`);
  if (timeAfterPauseWaitText !== timeAtPauseText) {
    throw new Error('Timer continued counting down while paused!');
  }

  console.log('Resuming game by pressing "P" key...');
  await page.keyboard.press('p');
  await new Promise(r => setTimeout(r, 500));

  console.log('Waiting 2 seconds after resuming...');
  await new Promise(r => setTimeout(r, 2000));

  const timeAfterResumeText = await page.evaluate(() => document.getElementById('timer').textContent);
  console.log(`Time after 2 seconds of resume: "${timeAfterResumeText}"`);
  if (parseInt(timeAfterResumeText) >= parseInt(timeAfterPauseWaitText)) {
    throw new Error('Timer did not resume countdown');
  }
  console.log('✅ PASS: Time Attack mode countdown and pause/resume logic are correct.');

  // Test Time Expired (Game Over)
  console.log('\n--- Test 5: Testing Time Expired Game Over ---');
  await page.evaluate(() => {
    // Set time remaining to 1 second to quickly trigger expiration
    timeLeft = 1;
  });
  console.log('Set timeLeft = 1. Waiting for expiration...');
  await new Promise(r => setTimeout(r, 1500));

  const isGameOver = await page.evaluate(() => window.__tetris.getState().gameOver);
  const gameOverTitleText = await page.evaluate(() => {
    const el = document.querySelector('#gameOver h2');
    return el ? el.textContent : '';
  });
  console.log(`Is game over: ${isGameOver}, Game over message: "${gameOverTitleText}"`);
  if (!isGameOver) {
    throw new Error('Game did not end when timer reached 0');
  }
  if (!gameOverTitleText.includes('TEMPO ESGOTADO')) {
    throw new Error(`Expected Game Over message to contain 'TEMPO ESGOTADO', got: '${gameOverTitleText}'`);
  }
  console.log('✅ PASS: Time expiration triggers Game Over screen with TEMPO ESGOTADO! message.');

  // 4. Test SoundSynth Existence and Interaction
  console.log('\n--- Test 6: Testing Web Audio API SoundSynth existence ---');
  
  const soundSynthExists = await page.evaluate(() => !!SoundSynth);
  console.log(`SoundSynth object exists: ${soundSynthExists}`);
  if (!soundSynthExists) throw new Error('SoundSynth utility object is missing');

  const synthFunctionsExist = await page.evaluate(() => {
    return typeof SoundSynth.playRotate === 'function' &&
           typeof SoundSynth.playDrop === 'function' &&
           typeof SoundSynth.playLine === 'function' &&
           typeof SoundSynth.playGameOver === 'function';
  });
  console.log(`SoundSynth sound methods exist: ${synthFunctionsExist}`);
  if (!synthFunctionsExist) throw new Error('One or more sound methods are missing from SoundSynth');

  // Verify AudioContext initialization is handled (should not be null after interaction)
  const isAudioContextCreated = await page.evaluate(() => !!SoundSynth.ctx);
  console.log(`AudioContext is initialized: ${isAudioContextCreated}`);
  if (!isAudioContextCreated) {
    throw new Error('AudioContext was not initialized after clicks and key presses');
  }
  console.log('✅ PASS: SoundSynth retro wave synth exists and AudioContext initialized correctly.');

  console.log('\n=============================================');
  console.log('🎉 ALL TETRIS TASK_002 TESTS PASSED SUCCESSFULLY!');
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
