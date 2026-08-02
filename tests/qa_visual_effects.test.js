process.env.NODE_ENV = 'test';
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
  console.log('--- STARTING QA TEST SUITE FOR STRING CATCHER / VISUAL EFFECTS (TASK_002) ---');
  
  console.log('Loading puppeteer (ESM)...');
  const puppeteerModule = await import('puppeteer');
  puppeteer = puppeteerModule.default;
  
  await startServer();
  
  browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  page = await browser.newPage();
  
  // Capture browser logs & uncaught errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[BROWSER ERROR] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    console.log(`[BROWSER UNCAUGHT EXCEPTION]`, err);
  });

  console.log('Navigating to String Catcher / Visual Effects game page...');
  await page.goto(`http://127.0.0.1:${PORT}/visual_effects`, { waitUntil: 'networkidle2' });

  // ----------------------------------------------------
  // TEST 1: Initial Page Load & UI Elements
  // ----------------------------------------------------
  console.log('\n--- Test 1: Verifying layout, canvas, start buttons & custom music upload button ---');
  
  const canvasExists = await page.evaluate(() => !!document.getElementById('canvas'));
  console.log(`Canvas exists: ${canvasExists}`);
  if (!canvasExists) throw new Error('Canvas element missing');

  const allButtonsText = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => (b.textContent || b.innerText || '').trim());
  });
  console.log('All buttons on page:', allButtonsText);

  const startBtnText = allButtonsText.find(txt => txt.includes('Começar Jogo'));
  console.log(`Start button found: "${startBtnText}"`);
  if (!startBtnText) throw new Error('Start Game button is missing');

  const customBtnText = allButtonsText.find(txt => txt.includes('Carregar Música Customizada'));
  console.log(`Custom music upload button found: "${customBtnText}"`);
  if (!customBtnText) throw new Error('Custom music button is missing');

  console.log('✅ PASS: UI layout and start screen elements verified.');

  // ----------------------------------------------------
  // TEST 2: Custom Music Modal & Template Download (Criterion 1)
  // ----------------------------------------------------
  console.log('\n--- Test 2: Testing Custom Music Upload Modal & JSON Template ---');
  
  // Click the Custom Music button
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const custom = btns.find(b => (b.textContent || b.innerText).includes('Carregar Música Customizada'));
    if (custom) custom.click();
  });
  await new Promise(r => setTimeout(r, 300));

  const modalOverlayExists = await page.evaluate(() => !!document.querySelector('.custom-modal-overlay'));
  console.log(`Modal overlay open: ${modalOverlayExists}`);
  if (!modalOverlayExists) throw new Error('Custom music modal overlay did not open');

  const templateHref = await page.evaluate(() => {
    const link = document.getElementById('downloadTemplate');
    return link ? link.getAttribute('href') : null;
  });
  console.log(`Template download link href: ${templateHref ? templateHref.substring(0, 45) + '...' : null}`);
  if (!templateHref || !templateHref.startsWith('data:text/json')) {
    throw new Error('Template download link missing or invalid data URI');
  }

  const startCustomBtnDisabled = await page.evaluate(() => {
    const btn = document.getElementById('startCustomBtn');
    return btn ? btn.disabled : false;
  });
  console.log(`Start Custom button initially disabled: ${startCustomBtnDisabled}`);
  if (!startCustomBtnDisabled) throw new Error('Start Custom button should be disabled before file upload');

  // Test modal cancellation
  console.log('Clicking cancel button in modal...');
  await page.click('#cancelCustomBtn');
  await new Promise(r => setTimeout(r, 300));

  const modalClosed = await page.evaluate(() => !document.querySelector('.custom-modal-overlay'));
  console.log(`Modal closed successfully: ${modalClosed}`);
  if (!modalClosed) throw new Error('Modal failed to close on cancel');

  console.log('✅ PASS: Custom music upload modal and template download verified.');

  // ----------------------------------------------------
  // TEST 3: Standard Game Loop & Web Audio API Integration (Criterion 3)
  // ----------------------------------------------------
  console.log('\n--- Test 3: Starting Standard Game & Web Audio API Analyser ---');
  
  // Click "Começar Jogo"
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const start = btns.find(b => (b.textContent || b.innerText).includes('Começar Jogo'));
    if (start) start.click();
  });
  await new Promise(r => setTimeout(r, 500));

  const gameActiveState = await page.evaluate(() => gameActive);
  console.log(`Game state active: ${gameActiveState}`);
  if (!gameActiveState) throw new Error('Game did not activate after clicking Start');

  const audioState = await page.evaluate(() => {
    return {
      hasAudioCtx: !!audioCtx,
      hasAnalyser: !!analyser,
      binCount: analyser ? analyser.frequencyBinCount : 0
    };
  });
  console.log(`Web Audio API state:`, audioState);
  if (!audioState.hasAudioCtx || !audioState.hasAnalyser) {
    throw new Error('Web Audio API (AudioContext / AnalyserNode) not initialized');
  }
  if (audioState.binCount !== 128) {
    throw new Error(`Expected frequencyBinCount to be 128 (fftSize 256), got ${audioState.binCount}`);
  }

  // Check Theme Switcher
  console.log('Testing Theme Selector...');
  await page.select('#themeSelect', 'vaporwave');
  let currentThemeVal = await page.evaluate(() => currentTheme);
  console.log(`Current theme after selection: ${currentThemeVal}`);
  if (currentThemeVal !== 'vaporwave') throw new Error('Theme selection failed');

  await page.select('#themeSelect', 'cyberpunk');
  currentThemeVal = await page.evaluate(() => currentTheme);
  console.log(`Current theme reset: ${currentThemeVal}`);

  console.log('✅ PASS: Web Audio API integration and dynamic visual reactive theme validated.');

  // ----------------------------------------------------
  // TEST 4: New Note Mechanics (Hold Notes & Mine Obstacles - Criterion 2)
  // ----------------------------------------------------
  console.log('\n--- Test 4: Testing Hold Notes & Mine Notes Mechanics ---');
  
  // Test Mine Note logic: -150 pts (clamped to 0 min), reset combo, 0 lives lost
  console.log('Testing Mine Note penalty logic...');
  const mineTestResult = await page.evaluate(() => {
    score = 500;
    combo = 10;
    lives = 3;
    
    const fakeMineNote = {
      stringIndex: 0,
      x: canvas.width * 0.8,
      radius: 15,
      active: true,
      type: 'mine'
    };

    hitMine(fakeMineNote);

    return {
      newScore: score,
      newCombo: combo,
      newLives: lives,
      mineDeactivated: !fakeMineNote.active
    };
  });
  console.log('Mine hit result (Score 500 -> expected 350, Combo -> 0, Lives -> 3):', mineTestResult);
  if (mineTestResult.newScore !== 350) throw new Error(`Expected score 350, got ${mineTestResult.newScore}`);
  if (mineTestResult.newCombo !== 0) throw new Error(`Expected combo 0, got ${mineTestResult.newCombo}`);
  if (mineTestResult.newLives !== 3) throw new Error(`Expected lives 3 (unaffected by mine), got ${mineTestResult.newLives}`);

  // Test Mine Note score clamp to 0
  const clampTestResult = await page.evaluate(() => {
    score = 50;
    const fakeMineNote = { stringIndex: 0, x: canvas.width * 0.8, radius: 15, active: true, type: 'mine' };
    hitMine(fakeMineNote);
    return score;
  });
  console.log(`Mine hit with initial score 50 (clamped to min 0): ${clampTestResult}`);
  if (clampTestResult !== 0) throw new Error(`Score should be clamped to 0, got ${clampTestResult}`);

  // Test Hold Note Mechanics
  console.log('Testing Hold Note structure and hold progress handling...');
  const holdTestResult = await page.evaluate(() => {
    score = 100;
    combo = 5;
    mouseDown = true;
    mouse.y = strings[0].points[0].y; // aligned with string 0

    const holdNote = {
      stringIndex: 0,
      x: canvas.width * 0.8,
      radius: 15,
      active: true,
      type: 'hold',
      duration: 1.0,
      tailLength: 100,
      holding: true,
      holdStarted: true,
      holdBroken: false,
      holdComplete: false
    };

    handleHoldProgress(holdNote, strings[0].points[0].y, canvas.width * 0.8);
    const scoreAfterFrame = score;

    // Simulate breaking hold note (mouse released / moved away)
    mouseDown = false;
    mouse.y = strings[0].points[0].y + 100; // far from string 0
    handleHoldProgress(holdNote, strings[0].points[0].y, canvas.width * 0.8);

    return {
      scoreIncreased: scoreAfterFrame > 100,
      holdBroken: holdNote.holdBroken,
      comboReset: combo === 0
    };
  });

  console.log('Hold Note test result:', holdTestResult);
  if (!holdTestResult.scoreIncreased) throw new Error('Hold Note did not increase score during hold');
  if (!holdTestResult.holdBroken || !holdTestResult.comboReset) throw new Error('Hold Note break did not reset combo or break state');

  console.log('✅ PASS: Hold Notes and Mine Notes mechanics operate strictly according to acceptance criteria.');

  console.log('\n=============================================================');
  console.log('🎉 ALL STRING CATCHER / VISUAL EFFECTS (TASK_002) TESTS PASSED!');
  console.log('=============================================================');
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
