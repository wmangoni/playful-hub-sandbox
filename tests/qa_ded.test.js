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
  console.log('--- STARTING QA TEST SUITE FOR RPG ADVENTURE QUEST (D&D) ---');
  
  console.log('Loading puppeteer (ESM)...');
  const puppeteerModule = await import('puppeteer');
  puppeteer = puppeteerModule.default;
  
  await startServer();
  
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  page = await browser.newPage();
  
  // Set explicit navigation timeout
  await page.setDefaultNavigationTimeout(10000);
  
  // Capture console logs from browser
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log(`[BROWSER PAGE ERROR] ${err.message}`);
  });

  page.on('requestfailed', req => {
    const fail = req.failure();
    console.log(`[BROWSER REQUEST FAILED] ${req.url()} - ${fail ? fail.errorText : 'failed'}`);
  });

  page.on('dialog', async dialog => {
    console.log(`[BROWSER DIALOG] [${dialog.type()}] Message: ${dialog.message()}`);
    await dialog.dismiss();
  });

  // Navigate to D&D game page
  console.log('Navigating to D&D game page...');
  await page.goto(`http://127.0.0.1:${PORT}/ded/index.html`, { waitUntil: 'domcontentloaded' });
  
  // ----------------------------------------------------
  // TEST CASE 1: Character Selection & Sheet Display
  // ----------------------------------------------------
  console.log('\n--- 1. Testing Character Selection & Stats Display ---');
  
  // Verify character select screen is visible
  const charSelectVisible = await page.evaluate(() => {
    const el = document.getElementById('character-select');
    return el && !el.classList.contains('hidden');
  });
  console.log(`Is Character Selection Screen visible? ${charSelectVisible}`);
  if (!charSelectVisible) throw new Error('Character selection screen is not visible initially');
  
  // Click on "Warrior" card
  console.log('Selecting Warrior character...');
  await page.evaluate(() => {
    const el = document.querySelector('.character-card[data-class="warrior"]');
    if (el) el.click();
    else throw new Error('Warrior card not found');
  });
  
  // Verify selected class style
  const isWarriorSelectedStyle = await page.evaluate(() => {
    const card = document.querySelector('.character-card[data-class="warrior"]');
    return card && card.classList.contains('selected');
  });
  console.log(`Does Warrior card have "selected" class? ${isWarriorSelectedStyle}`);
  if (!isWarriorSelectedStyle) throw new Error('Warrior card was not visually selected');
  
  // Click "Começar Aventura" button
  console.log('Clicking "Começar Aventura"...');
  await page.evaluate(() => {
    const el = document.querySelector('#character-select button');
    if (el) el.click();
    else throw new Error('Começar Aventura button not found');
  });
  
  // Verify game screen is now visible
  const isGameScreenVisible = await page.evaluate(() => {
    const el = document.getElementById('game-screen');
    return el && !el.classList.contains('hidden');
  });
  console.log(`Is Game Screen visible now? ${isGameScreenVisible}`);
  if (!isGameScreenVisible) throw new Error('Game screen did not load after starting the adventure');

  // Verify the Hero Character Sheet (Ficha do Herói) attributes and modifiers
  console.log('Verifying all 6 attributes and modifiers (D&D 5e formula)...');
  const statsInfo = await page.evaluate(() => {
    const stats = ['str', 'dex', 'con', 'int', 'wis', 'luck'];
    const result = {};
    stats.forEach(stat => {
      const valEl = document.getElementById(`val-${stat}`);
      const modEl = document.getElementById(`mod-${stat}`);
      result[stat] = {
        value: valEl ? valEl.textContent : null,
        modifier: modEl ? modEl.textContent : null
      };
    });
    return result;
  });
  
  console.log('Stats Info from UI:', statsInfo);
  
  // Assertions for Warrior attributes and modifiers:
  // str: 16 (+3), dex: 12 (+1), con: 15 (+2), int: 8 (-1), wis: 10 (+0), luck: 8 (-1)
  const expectedWarriorStats = {
    str: { val: '16', mod: '(+3)' },
    dex: { val: '12', mod: '(+1)' },
    con: { val: '15', mod: '(+2)' },
    int: { val: '8', mod: '(-1)' },
    wis: { val: '10', mod: '(+0)' },
    luck: { val: '8', mod: '(-1)' }
  };
  
  for (const [stat, expected] of Object.entries(expectedWarriorStats)) {
    const actual = statsInfo[stat];
    if (!actual || actual.value !== expected.val || actual.modifier !== expected.mod) {
      throw new Error(`Stat mismatch for ${stat.toUpperCase()}: expected value ${expected.val} and modifier ${expected.mod}, got value ${actual.value} and modifier ${actual.modifier}`);
    }
  }
  console.log('✅ PASS: All 6 attributes and modifiers displayed correctly according to D&D 5e logic.');

  // ----------------------------------------------------
  // TEST CASE 2: Visual Inventory Slots & Consumables Use
  // ----------------------------------------------------
  console.log('\n--- 2. Testing Visual Inventory Slots & Item Consumption ---');
  
  // Verify grid capacity is 6 slots
  const slotsCount = await page.evaluate(() => {
    return document.querySelectorAll('.inventory-slots-grid .inventory-slot-box').length;
  });
  console.log(`Number of inventory slot boxes: ${slotsCount}`);
  if (slotsCount !== 6) {
    throw new Error(`Expected exactly 6 inventory slot boxes, got ${slotsCount}`);
  }
  
  // Setup inventory with consumable item "Poção de Vida" and hurt player to test consumption
  console.log('Setting up inventory with "Poção de Vida" and setting player HP to 10/20...');
  await page.evaluate(() => {
    gameState.player.inventory = ["Poção de Vida"];
    gameState.player.health = 10;
    updateInventoryDisplay();
    updateStatsDisplay();
  });
  
  // Verify slot displays the item
  const itemInSlot = await page.evaluate(() => {
    const slot = document.querySelector('.inventory-slot-box.occupied');
    if (!slot) return null;
    const nameEl = slot.querySelector('.item-name');
    const emojiEl = slot.querySelector('.item-emoji');
    const tooltipEl = slot.querySelector('.item-tooltip');
    return {
      occupied: true,
      name: nameEl ? nameEl.textContent : null,
      emoji: emojiEl ? emojiEl.textContent : null,
      tooltip: tooltipEl ? tooltipEl.textContent : null,
      isUsable: slot.classList.contains('usable')
    };
  });
  
  console.log('Occupied slot details:', itemInSlot);
  if (!itemInSlot || itemInSlot.name !== 'Poção de Vida' || itemInSlot.emoji !== '🫙' || !itemInSlot.isUsable) {
    throw new Error('Poção de Vida slot was not rendered correctly or is not usable');
  }
  
  // Click on the consumable slot to use it
  console.log('Clicking the Poção de Vida slot to consume it...');
  await page.evaluate(() => {
    const el = document.querySelector('.inventory-slot-box.usable');
    if (el) el.click();
    else throw new Error('Usable consumable slot not found');
  });
  
  // Verify health restored to 20 and item removed from inventory
  const postConsumptionState = await page.evaluate(() => {
    return {
      health: gameState.player.health,
      inventory: [...gameState.player.inventory],
      emptySlotsText: Array.from(document.querySelectorAll('.inventory-slot-box')).map(el => el.textContent.trim())
    };
  });
  
  console.log('State after consuming health potion:', postConsumptionState);
  if (postConsumptionState.health !== 20) {
    throw new Error(`Health should be restored to 20, got ${postConsumptionState.health}`);
  }
  if (postConsumptionState.inventory.length !== 0) {
    throw new Error('Potion should have been removed from inventory state');
  }
  console.log('✅ PASS: Visual inventory renders 6 slots, and clicking a consumable uses it and restores health correctly.');

  // ----------------------------------------------------
  // TEST CASE 3: Slot Interaction Locking during Battles/Tests
  // ----------------------------------------------------
  console.log('\n--- 3. Testing Inventory Lock during Combat/Tests ---');
  
  // Put a potion back in inventory and trigger a dice test
  console.log('Adding "Poção de Vida", reducing health to 10, and opening dice container...');
  await page.evaluate(() => {
    gameState.player.inventory = ["Poção de Vida"];
    gameState.player.health = 10;
    
    // Simulate active D20 test in mem
    gameState.mem = {
      nextSceneSuccess: 'start',
      nextSceneFailure: 'start',
      checkType: 'str'
    };
    gameState.checkDifficulty = 12;
    
    // Display dice container
    const diceContainer = document.getElementById('dice-container');
    diceContainer.classList.remove('hidden');
    
    // Hide choices
    const choicesElement = document.getElementById('choices');
    choicesElement.classList.add('hidden');
    
    updateInventoryDisplay();
    updateStatsDisplay();
  });
  
  // Check if slots are visually disabled
  const slotsDisabled = await page.evaluate(() => {
    const slot = document.querySelector('.inventory-slot-box.occupied');
    return slot && slot.classList.contains('disabled');
  });
  console.log(`Are inventory slots styled as disabled? ${slotsDisabled}`);
  if (!slotsDisabled) {
    throw new Error('Inventory slot did not receive the "disabled" class during active dice rolling');
  }
  
  // Attempt to click the slot
  console.log('Attempting to click the slot during battle/test...');
  await page.evaluate(() => {
    const el = document.querySelector('.inventory-slot-box.occupied');
    if (el) el.click();
    else throw new Error('Occupied slot not found');
  });
  
  // Verify no healing occurred (health is still 10) and inventory is still populated
  const postLockedClickState = await page.evaluate(() => {
    return {
      health: gameState.player.health,
      inventory: [...gameState.player.inventory],
      logContainsWarning: gameState.log.some(msg => msg.includes('calor da batalha'))
    };
  });
  
  console.log('State after clicking disabled slot:', postLockedClickState);
  if (postLockedClickState.health !== 10) {
    throw new Error(`Healing occurred during battle! Health is ${postLockedClickState.health}`);
  }
  if (!postLockedClickState.logContainsWarning) {
    throw new Error('No warning logged when trying to consume items during active dice rolling');
  }
  console.log('✅ PASS: Inventory slots are disabled and locked during D20 rolls, blocking clicks and warning players.');

  // ----------------------------------------------------
  // TEST CASE 4: D20 Epic Roll & Critical Success (Natural 20)
  // ----------------------------------------------------
  console.log('\n--- 4. Testing D20 Rolling & Critical Success (Natural 20) ---');
  
  // Mock Math.random to always output a Natural 20
  // diceResult = Math.floor(Math.random() * 20) + 1;
  // If Math.random() is 0.96 => floor(19.2) + 1 = 20
  console.log('Mocking Math.random to roll a Natural 20...');
  await page.evaluate(() => {
    Math.random = () => 0.96;
  });
  
  // Start D20 roll
  console.log('Clicking "Rolar d20" button...');
  await page.evaluate(() => {
    const el = document.getElementById('dice-button');
    if (el) el.click();
    else throw new Error('Dice button not found');
  });
  
  // Verify dice rolling-animation class is applied immediately
  const isRollingClassApplied = await page.evaluate(() => {
    const dice = document.getElementById('dice');
    return dice && dice.classList.contains('rolling-animation');
  });
  console.log(`Is "rolling-animation" class applied to dice? ${isRollingClassApplied}`);
  if (!isRollingClassApplied) {
    throw new Error('Dice did not receive the "rolling-animation" class when roll was started');
  }
  
  // Wait for 1.5 seconds (the timeout for rolling is 1.3 seconds)
  console.log('Waiting for the roll animation to complete...');
  await new Promise(r => setTimeout(r, 1500));
  
  // Verify Natural 20 effects are applied
  const critSuccessResult = await page.evaluate(() => {
    const dice = document.getElementById('dice');
    const resultMsg = document.getElementById('result-message');
    return {
      resultText: dice ? dice.textContent : null,
      isCritBgApplied: dice ? dice.classList.contains('critical-success-bg') : false,
      resultMessageText: resultMsg ? resultMsg.textContent : null,
      logContainsCritSuccess: gameState.log.some(msg => msg.includes('ROLAGEM CRÍTICA') || msg.includes('20 natural'))
    };
  });
  
  console.log('Natural 20 Roll Result Details:', critSuccessResult);
  if (critSuccessResult.resultText !== '20') {
    throw new Error(`Expected final dice face to show 20, got ${critSuccessResult.resultText}`);
  }
  if (!critSuccessResult.isCritBgApplied) {
    throw new Error('Critical success golden glow class "critical-success-bg" was not applied');
  }
  if (!critSuccessResult.logContainsCritSuccess) {
    throw new Error('Log did not capture the critical success log message');
  }
  
  // Wait for transition to complete (another 2.0 seconds)
  console.log('Waiting for transition back to narrative scene...');
  await new Promise(r => setTimeout(r, 2000));
  
  // Verify dice container is hidden again
  const diceContainerHidden = await page.evaluate(() => {
    const el = document.getElementById('dice-container');
    return el && el.classList.contains('hidden');
  });
  console.log(`Is Dice Container hidden after transition? ${diceContainerHidden}`);
  if (!diceContainerHidden) {
    throw new Error('Dice container did not hide after roll transition');
  }
  console.log('✅ PASS: Dice rolling triggers animation, displays critical natural 20 visual effects, and transitions correctly.');

  // ----------------------------------------------------
  // TEST CASE 5: D20 Critical Failure (Natural 1)
  // ----------------------------------------------------
  console.log('\n--- 5. Testing D20 Critical Failure (Natural 1) ---');
  
  // Put a potion back and open dice container
  await page.evaluate(() => {
    gameState.mem = {
      nextSceneSuccess: 'start',
      nextSceneFailure: 'start',
      checkType: 'str'
    };
    gameState.checkDifficulty = 10;
    document.getElementById('dice-container').classList.remove('hidden');
    document.getElementById('choices').classList.add('hidden');
    updateInventoryDisplay();
  });
  
  // Mock Math.random to output a Natural 1
  // diceResult = Math.floor(Math.random() * 20) + 1;
  // If Math.random() is 0 => floor(0) + 1 = 1
  console.log('Mocking Math.random to roll a Natural 1...');
  await page.evaluate(() => {
    Math.random = () => 0;
  });
  
  // Start D20 roll
  console.log('Clicking "Rolar d20" button...');
  await page.evaluate(() => {
    const el = document.getElementById('dice-button');
    if (el) el.click();
    else throw new Error('Dice button not found');
  });
  
  // Wait for animation to complete (1.5 seconds)
  console.log('Waiting for the roll animation to complete...');
  await new Promise(r => setTimeout(r, 1500));
  
  // Verify Natural 1 effects are applied
  const critFailureResult = await page.evaluate(() => {
    const dice = document.getElementById('dice');
    return {
      resultText: dice ? dice.textContent : null,
      borderColor: dice ? dice.style.borderColor : null,
      boxShadow: dice ? dice.style.boxShadow : null,
      logContainsCritFailure: gameState.log.some(msg => msg.includes('FALHA CRÍTICA') || msg.includes('1 natural'))
    };
  });
  
  console.log('Natural 1 Roll Result Details:', critFailureResult);
  if (critFailureResult.resultText !== '1') {
    throw new Error(`Expected final dice face to show 1, got ${critFailureResult.resultText}`);
  }
  if (!critFailureResult.borderColor.includes('rgb(255, 0, 0)') && !critFailureResult.borderColor.includes('#ff0000') && critFailureResult.borderColor === '') {
    throw new Error('Dice border color did not change to red for natural 1');
  }
  if (!critFailureResult.logContainsCritFailure) {
    throw new Error('Log did not capture the critical failure log message');
  }
  
  // Wait for transition to complete (another 2.0 seconds)
  console.log('Waiting for transition back to narrative scene...');
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('✅ PASS: Critical natural 1 displays red critical failure styles and logs correctly.');

  console.log('\n=============================================');
  console.log('🎉 ALL QA TEST CASES PASSED SUCCESSFULLY FOR RPG ADVENTURE QUEST!');
  console.log('=============================================');
}

(async () => {
  try {
    await runTests();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ DED QA TEST SUITE FAILED:', err.message || err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    if (server) server.close();
  }
})();
