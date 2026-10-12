const http = require('http');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = Number(process.env.PORT) || 3003; // outra porta quando a 3003 estiver ocupada

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
    // Fase 2: fora de vista a exploração fica em espera (montada e invisível), não .hidden
    return !!el && !el.classList.contains('hidden') && !el.classList.contains('tela-em-espera')
      && getComputedStyle(el).visibility === 'visible';
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
  // Desde a Fase 2 da TASK_001 o modificador fica no medalhão, sem parênteses
  // e com o sinal de menos tipográfico (U+2212).
  const expectedWarriorStats = {
    str: { val: '16', mod: '+3' },
    dex: { val: '12', mod: '+1' },
    con: { val: '15', mod: '+2' },
    int: { val: '8', mod: '−1' },
    wis: { val: '10', mod: '+0' },
    luck: { val: '8', mod: '−1' }
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
    // Fase 2: o ícone do item vem do sprite (ui/icones.svg) em vez do emoji
    const iconEl = slot.querySelector('.item-icone use');
    return {
      occupied: true,
      name: nameEl ? nameEl.textContent : null,
      icon: iconEl ? iconEl.getAttribute('href') : null,
      tooltip: slot.title,
      isUsable: slot.classList.contains('usable')
    };
  });
  
  console.log('Occupied slot details:', itemInSlot);
  if (!itemInSlot || itemInSlot.name !== 'Poção de Vida' || !String(itemInSlot.icon).endsWith('#i-pocao') || !itemInSlot.isUsable) {
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
      // Fase 2: o 1 natural apaga o d20 com a classe .falha-critica (antes era estilo inline)
      critFailureMark: dice ? dice.classList.contains('falha-critica') : false,
      logContainsCritFailure: gameState.log.some(msg => msg.includes('FALHA CRÍTICA') || msg.includes('1 natural'))
    };
  });
  
  console.log('Natural 1 Roll Result Details:', critFailureResult);
  if (critFailureResult.resultText !== '1') {
    throw new Error(`Expected final dice face to show 1, got ${critFailureResult.resultText}`);
  }
  if (!critFailureResult.critFailureMark) {
    throw new Error('Dice was not marked with .falha-critica for natural 1');
  }
  if (!critFailureResult.logContainsCritFailure) {
    throw new Error('Log did not capture the critical failure log message');
  }
  
  // Wait for transition to complete (another 2.0 seconds)
  console.log('Waiting for transition back to narrative scene...');
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('✅ PASS: Critical natural 1 displays red critical failure styles and logs correctly.');

  // ----------------------------------------------------
  // TEST CASE 6: Combate pelo caminho real, com o teclado (Fase 3)
  // ----------------------------------------------------
  // Fica antes do caso dos finais: a cena da poção, visitada lá, agenda a volta para a
  // cena anterior em 4,5 s. Desde a Fase 3 a volta só acontece se o jogador ainda estiver
  // na poção, e uma cena nova encerra a luta; a ordem só evita depender disso.
  console.log('\n--- 6. Testing the combat through the real path, with the keyboard ---');
  const espera = ms => new Promise(r => setTimeout(r, ms));
  // waitForFunction com uma mensagem clara no lugar do TimeoutError genérico
  const aguardar = (condicao, falha, timeout = 3000) =>
    page.waitForFunction(condicao, { timeout }).catch(() => { throw new Error(falha); });
  const dialogos = [];
  const contarDialogo = dialog => dialogos.push(`${dialog.type()}: ${dialog.message()}`);
  page.on('dialog', contarDialogo);

  // Acaso fixo pelo turno: 0,8 dá 17 no d20 do herói (acerto sem crítico contra a
  // armadura 10 do Goblin) e 0,96 dá 20 ao inimigo (acerto). A vida cheia garante
  // que o crítico do inimigo não derruba o herói.
  const preparo = await page.evaluate(() => {
    window.__randomAntesDoCombate = Math.random;
    Math.random = () => (gameState.combat?.turn === 'enemy' ? 0.96 : 0.8);
    gameState.player.health = gameState.player.maxHealth;
    updateStatsDisplay();
    return { xp: gameState.player.xp, nivel: gameState.player.level, vida: gameState.player.health };
  });
  console.log('Hero before the fight:', preparo);

  try {
    // O corredor leva ao Goblin pelo caminho da esquerda (1ª escolha); quem escolhe
    // pelo teclado continua na 1ª escolha da cena nova, "Lutar contra o goblin"
    await page.evaluate(() => loadScene('corridor'));
    await espera(400); // escolhas recém-montadas ignoram ativações por 300 ms
    await page.focus('#choices button');
    await page.keyboard.press('Enter');
    await aguardar(() => gameState.currentScene === 'goblin_encounter'
      && document.activeElement === document.querySelector('#choices button'),
      'Enter on "Pegar o caminho da esquerda" did not reach goblin_encounter with the focus on its first choice');
    await espera(400);
    await page.keyboard.press('Enter'); // "Lutar contra o goblin": teste de combate na bandeja
    await aguardar(() => document.activeElement === document.getElementById('dice-button')
      && !document.getElementById('dice-container').classList.contains('hidden'),
      'The combat check did not open the d20 tray with the focus on the dice button');
    await page.keyboard.press('Enter'); // rola o d20
    await aguardar(() => document.getElementById('dice-button').textContent === 'Enfrentar',
      'The dice button did not turn into "Enfrentar" after the combat check');
    await espera(400); // o "Enfrentar" também ignora ativações por 300 ms (sozinho, avança em 1,8 s)
    const antesDeEnfrentar = await page.evaluate(() => ({
      foco: document.activeElement && document.activeElement.id,
      rotulo: document.getElementById('dice-button').textContent,
      emCombate: !!(gameState.combat && gameState.combat.active)
    }));
    if (antesDeEnfrentar.foco !== 'dice-button' || antesDeEnfrentar.rotulo !== 'Enfrentar' || antesDeEnfrentar.emCombate) {
      throw new Error(`"Enfrentar" was not waiting for the keyboard: ${JSON.stringify(antesDeEnfrentar)}`);
    }

    // 1 e 2. Enter duplo rápido no "Enfrentar": o 1º abre a luta, o 2º não pode atacar
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await aguardar(() => document.activeElement === document.getElementById('btn-combat-attack'),
      'Entering the combat with Enter did not move the focus to #btn-combat-attack', 2000);
    const entrada = await page.evaluate(() => {
      const exibido = id => {
        const el = document.getElementById(id);
        return !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none';
      };
      return {
        narrativa: exibido('narrativa'),
        cronica: exibido('painel-cronica'),
        painel: exibido('combat-screen'),
        relato: exibido('combat-log-box'),
        inimigo: document.getElementById('combat-enemy-name').textContent,
        turno: gameState.combat.turn,
        atacou: document.getElementById('combat-log-text').textContent.includes('Você se prepara')
      };
    });
    console.log('Combat entered:', entrada);
    if (entrada.narrativa || entrada.cronica || !entrada.painel || !entrada.relato) {
      throw new Error('Entering the combat must hide #narrativa and #painel-cronica and show #combat-screen and #combat-log-box');
    }
    if (entrada.inimigo !== 'Goblin') {
      throw new Error(`Expected to fight the Goblin, got "${entrada.inimigo}"`);
    }
    if (entrada.turno !== 'player' || entrada.atacou) {
      throw new Error('A quick double Enter on "Enfrentar" must not attack (the attack ignores activations for 300 ms)');
    }

    // 3. O ataque, depois da pausa: o giro carimba um selo; na vez do inimigo, as
    // ações ficam com aria-disabled e o foco fica no ataque
    await espera(400);
    await page.keyboard.press('Enter');
    const atacou = await page.evaluate(() => document.getElementById('combat-log-text').textContent.includes('Você se prepara'));
    if (!atacou) throw new Error('Enter on the attack (after the pause) did not attack');
    await aguardar(() => !!document.querySelector('#combat-mesa [data-selo].visivel'),
      'No seal was stamped on the combat tray after the hero roll');
    const rolagem = await page.evaluate(() => ({
      selos: [...document.querySelectorAll('#combat-mesa [data-selo].visivel')].map(s => s.dataset.selo),
      dado: document.getElementById('combat-dice').textContent,
      vidaDoInimigo: gameState.combat.enemy.hp
    }));
    console.log('Hero roll:', rolagem);
    if (rolagem.selos.join() !== 'sucesso' || rolagem.dado !== '17' || rolagem.vidaDoInimigo <= 0) {
      throw new Error('The hero roll (17, a hit without a critical) must stamp only the "sucesso" seal and leave the Goblin standing');
    }
    await aguardar(() => gameState.combat.turn === 'enemy', 'The enemy turn did not start after the hero attack');
    const vezDoInimigo = await page.evaluate(() => {
      const acoes = [...document.querySelectorAll('#combat-actions-panel button')];
      return {
        acoes: acoes.length,
        desligadas: acoes.filter(b => b.getAttribute('aria-disabled') === 'true').length,
        focoNoAtaque: document.activeElement === document.getElementById('btn-combat-attack'),
        foco: document.activeElement ? `${document.activeElement.tagName}#${document.activeElement.id}` : null,
        painel: !document.getElementById('combat-screen').classList.contains('hidden'),
        turno: document.getElementById('combat-turno').textContent
      };
    });
    console.log('Enemy turn:', vezDoInimigo);
    if (!vezDoInimigo.painel) throw new Error('The combat panel disappeared in the middle of the fight');
    if (!vezDoInimigo.acoes || vezDoInimigo.desligadas !== vezDoInimigo.acoes) {
      throw new Error('Every combat action must have aria-disabled="true" during the enemy turn');
    }
    if (!vezDoInimigo.focoNoAtaque) {
      throw new Error(`The focus must stay on the attack during the enemy turn, it is on ${vezDoInimigo.foco}`);
    }
    if (!vezDoInimigo.turno.startsWith('Vez')) {
      throw new Error(`#combat-turno must say whose turn it is ("Vez do …"), got "${vezDoInimigo.turno}"`);
    }

    // 4. A vez volta: nenhuma ação desligada e o foco no ataque (remontado)
    await aguardar(() => gameState.combat.turn === 'player'
      && document.activeElement === document.getElementById('btn-combat-attack'),
      'The turn did not come back to the hero with the focus on the attack', 5000);
    const vezDeVolta = await page.evaluate(() => ({
      desligadas: document.querySelectorAll('#combat-actions-panel [aria-disabled]').length,
      turno: document.getElementById('combat-turno').textContent,
      inimigoAcertou: document.getElementById('combat-log-text').textContent.includes('Você levou'),
      vida: gameState.player.health,
      vidaMaxima: gameState.player.maxHealth
    }));
    console.log('Turn back to the hero:', vezDeVolta);
    if (vezDeVolta.desligadas) throw new Error('No combat action may keep aria-disabled when the turn comes back');
    if (vezDeVolta.turno !== 'O que você faz?') throw new Error(`#combat-turno did not come back to "O que você faz?", got "${vezDeVolta.turno}"`);
    if (!vezDeVolta.inimigoAcertou || vezDeVolta.vida >= vezDeVolta.vidaMaxima || vezDeVolta.vida <= 0) {
      throw new Error('The enemy (a natural 20) should have hit the hero without knocking the hero down');
    }

    // 5. A vitória: o Goblin por um fio e o 20 natural forçado
    await page.evaluate(() => {
      gameState.combat.enemy.hp = 1;
      Math.random = () => 0.96;
    });
    await espera(400); // as ações foram remontadas na volta da vez
    await page.keyboard.press('Enter');
    await aguardar(() => !!document.getElementById('btn-combat-continuar')
      && document.activeElement === document.getElementById('btn-combat-continuar'),
      'The victory did not offer #btn-combat-continuar with the focus on it', 5000);
    const continuarEm = Date.now();
    const vitoria = await page.evaluate(() => ({
      seloVitoria: !!document.querySelector('#combat-enemy-card [data-desfecho="vitoria"].visivel'),
      seloCritico: !!document.querySelector('#combat-mesa [data-selo="critico"].visivel'),
      acoes: [...document.querySelectorAll('#combat-actions-panel button')].map(b => b.id),
      turno: document.getElementById('combat-turno').textContent
    }));
    console.log('Victory:', vitoria);
    if (!vitoria.seloVitoria) throw new Error('The victory seal ([data-desfecho="vitoria"].visivel) was not stamped on the enemy card');
    if (!vitoria.seloCritico) throw new Error('The natural 20 did not stamp the "critico" seal on the combat tray');
    if (vitoria.acoes.join() !== 'btn-combat-continuar') {
      throw new Error(`The actions must give way to a single "Continuar", got ${JSON.stringify(vitoria.acoes)}`);
    }

    await espera(400); // o "Continuar" também ignora ativações por 300 ms (sozinho, fecha em 2,2 s)
    await page.keyboard.press('Enter');
    const fechouEmMs = Date.now() - continuarEm;
    const fechamento = await page.evaluate(() => {
      const exibido = id => {
        const el = document.getElementById(id);
        return !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none';
      };
      return {
        painel: exibido('combat-screen'),
        relato: exibido('combat-log-box'),
        narrativa: exibido('narrativa'),
        cronica: exibido('painel-cronica'),
        emCombate: gameState.combat.active,
        cena: gameState.currentScene
      };
    });
    console.log(`After Enter on "Continuar" (${fechouEmMs} ms after it appeared):`, fechamento);
    if (fechouEmMs >= 2000) {
      throw new Error(`Enter on "Continuar" came ${fechouEmMs} ms late: it can no longer be told apart from the 2.2 s auto-close`);
    }
    if (fechamento.painel || fechamento.relato || !fechamento.narrativa || !fechamento.cronica || fechamento.emCombate) {
      throw new Error('Enter on "Continuar" must close the combat: panel and report hidden, narrative and chronicle visible');
    }
    if (fechamento.cena !== 'goblin_fight_success') {
      throw new Error(`The victory must load goblin_fight_success, got "${fechamento.cena}"`);
    }
    await aguardar(() => document.activeElement === document.querySelector('#choices button'),
      'After the combat the focus must go to the first choice of the new scene', 2000);
    const cronica = await page.evaluate(() => document.getElementById('game-log').textContent);
    if (!cronica.includes('Vitória sobre o Goblin')) {
      throw new Error('The chronicle (#game-log) does not record "Vitória sobre o Goblin"');
    }

    // 6. Nada de alert/confirm no caminho todo
    if (dialogos.length) {
      throw new Error(`Native dialogs opened during the combat: ${JSON.stringify(dialogos)}`);
    }
  } finally {
    page.off('dialog', contarDialogo);
    await page.evaluate(() => {
      Math.random = window.__randomAntesDoCombate;
      delete window.__randomAntesDoCombate;
    }).catch(() => {});
  }
  console.log('✅ PASS: The combat opens and closes by keyboard through "Enfrentar", ignores the double Enter, locks the actions on the enemy turn and keeps the focus.');

  // ----------------------------------------------------
  // TEST CASE 7: "Continuar" depois do resultado e finais sem escolhas (Fase 2)
  // ----------------------------------------------------
  console.log('\n--- 7. Testing "Continuar" after the roll and the end scenes ---');
  const continuar = await page.evaluate(async () => {
    loadScene('crypt');
    skipTyping = true;
    await new Promise(r => setTimeout(r, 400)); // escolhas recém-montadas ignoram cliques por 300 ms
    [...document.querySelectorAll('#choices button')][1].click(); // teste de Força
    document.getElementById('dice-button').click();
    await new Promise(r => setTimeout(r, 1700)); // resultado em 1,3 s; "Continuar" aceita clique 300 ms depois
    const rotulo = document.getElementById('dice-button').textContent;
    document.getElementById('dice-button').click(); // avança na hora, sem esperar 1,8 s
    return { rotulo, cena: gameState.currentScene, bandejaOculta: document.getElementById('dice-container').classList.contains('hidden') };
  });
  console.log('After "Continuar":', continuar);
  if (continuar.rotulo !== 'Continuar' || continuar.cena === 'crypt' || !continuar.bandejaOculta) {
    throw new Error('The dice button did not offer "Continuar" or did not advance right away');
  }

  // Só os finais de verdade oferecem o recomeçar; a poção volta sozinha para a cena anterior
  const fins = await page.evaluate(() => {
    const ler = cena => {
      loadScene(cena);
      return {
        titulo: document.querySelector('#choices .escolhas-titulo').textContent,
        recomecar: !!document.querySelector('#choices .botao-secundario')
      };
    };
    const resultado = { pocao: ler('potion_health'), morte: ler('death') };
    // logo depois de montar, o recomeçar ignora o clique (não apaga o save nem recarrega)
    window.__semRecarga = true;
    document.querySelector('#choices .botao-secundario').click();
    resultado.saveIntacto = !!localStorage.getItem('ded_save_v1');
    return resultado;
  });
  const naoRecarregou = await page.evaluate(() => window.__semRecarga === true);
  console.log('End scenes:', fins);
  if (fins.pocao.recomecar || fins.pocao.titulo === 'A aventura terminou') {
    throw new Error('potion_health (a pass-through scene) must not offer "Começar uma nova aventura"');
  }
  if (!fins.morte.recomecar) {
    throw new Error('The death scene must offer "Começar uma nova aventura"');
  }
  if (!fins.saveIntacto || !naoRecarregou) {
    throw new Error('"Começar uma nova aventura" must ignore a click right after the scene is mounted');
  }
  console.log('✅ PASS: "Continuar" advances right away, and only real endings offer a new adventure.');

  // ----------------------------------------------------
  // TEST CASE 8: Submenu, Golpe heroico, derrota e fuga, com o teclado (Fase 3)
  // ----------------------------------------------------
  // A luta abre direto (startInteractiveCombat) com o foco numa escolha, como quem
  // chega pelo teclado: o foco segue para as ações. O herói é o guerreiro do caso 1.
  console.log('\n--- 8. Testing the item submenu, the Heroic Strike, the defeat and the flight, with the keyboard ---');
  const GOBLIN = { name: 'Goblin', ac: 10, hp: 12, max_hp: 12, str: 10, dex: 10, con: 10, bba: 1 };
  // o Math.random que dá a face d no d20 (Math.floor(r * 20) + 1)
  const faceDoD20 = d => (d - 1) / 20 + 0.01;
  const abrirCombate = async (cena, inimigo) => {
    await page.evaluate(c => loadScene(c), cena);
    await espera(400); // escolhas recém-montadas ignoram ativações por 300 ms
    await page.focus('#choices button');
    await page.evaluate(e => startInteractiveCombat(e), inimigo);
    await aguardar(() => gameState.combat.active
      && document.activeElement === document.getElementById('btn-combat-attack'),
      `Opening the combat from a focused choice (scene ${cena}) did not move the focus to #btn-combat-attack`);
    await espera(400); // as ações recém-montadas também ignoram ativações por 300 ms
  };
  const acoesDoPainel = () => page.evaluate(() =>
    [...document.querySelectorAll('#combat-actions-panel button')].map(b => b.id || b.querySelector('.escolha-texto').textContent));
  const estadoDaFolha = () => page.evaluate(() => ({
    painel: !document.getElementById('combat-screen').classList.contains('hidden')
      && getComputedStyle(document.getElementById('combat-screen')).display !== 'none',
    emCombate: gameState.combat.active,
    cena: gameState.currentScene
  }));

  const heroi = await page.evaluate(() => {
    window.__randomAntesDosDesfechos = Math.random;
    gameState.player.health = gameState.player.maxHealth;
    gameState.player.inventory = ['Poção de Vida']; // uma poção e nenhuma arma: as somas do ataque ficam previsíveis
    updateInventoryDisplay();
    updateStatsDisplay();
    return { classe: gameState.player.class, especializacao: gameState.player.specialization || null };
  });
  if (heroi.classe !== 'warrior' || heroi.especializacao) {
    throw new Error(`Case 8 needs the warrior without a specialization (the Heroic Strike), got ${JSON.stringify(heroi)}`);
  }
  dialogos.length = 0;
  page.on('dialog', contarDialogo);

  try {
    // 1. "Usar item" abre o submenu (a poção e "Voltar"); o "Voltar" devolve o foco ao
    // "Usar item" e as quatro ações. O Goblin tem 40 de vida para ficar de pé depois do
    // Golpe heroico do passo 2 (um crítico tira 15).
    await abrirCombate('corridor', { ...GOBLIN, hp: 40, max_hp: 40 });
    await page.focus('#btn-combat-item');
    await page.keyboard.press('Enter');
    await aguardar(() => {
      const botoes = [...document.querySelectorAll('#combat-actions-panel button')];
      return botoes.length === 2 && document.activeElement === botoes[0];
    }, 'Enter on "Usar item" did not open the item submenu with the focus on its first button');
    const submenu = await acoesDoPainel();
    console.log('Item submenu:', submenu);
    if (submenu.join() !== 'Poção de Vida,Voltar') {
      throw new Error(`The item submenu must list the potion and "Voltar", got ${JSON.stringify(submenu)}`);
    }
    await espera(400);
    await page.keyboard.press('Tab');
    const noVoltar = await page.evaluate(() => document.activeElement && document.activeElement.textContent.trim());
    if (noVoltar !== 'Voltar') throw new Error(`Tab from the potion must reach "Voltar", the focus is on "${noVoltar}"`);
    await page.keyboard.press('Enter');
    await aguardar(() => document.activeElement === document.getElementById('btn-combat-item'),
      '"Voltar" in the item submenu did not give the focus back to #btn-combat-item');
    const deVolta = await page.evaluate(() => ({
      acoes: [...document.querySelectorAll('#combat-actions-panel button')].map(b => b.id),
      foco: document.activeElement && document.activeElement.id,
      turno: gameState.combat.turn,
      mochila: [...gameState.player.inventory]
    }));
    console.log('After "Voltar":', deVolta);
    if (deVolta.acoes.join() !== 'btn-combat-attack,btn-combat-spell,btn-combat-item,btn-combat-flee') {
      throw new Error(`"Voltar" must bring back the four main actions, got ${JSON.stringify(deVolta.acoes)}`);
    }
    if (deVolta.foco !== 'btn-combat-item') {
      throw new Error(`The focus must stay on #btn-combat-item after "Voltar", it moved to #${deVolta.foco}`);
    }
    if (deVolta.turno !== 'player' || deVolta.mochila.join() !== 'Poção de Vida') {
      throw new Error('Opening and leaving the item submenu must not spend the turn nor the potion');
    }

    // 2. Golpe heroico: dois d20, fica o maior. O giro também chama Math.random, então
    // uma fila de valores não serve: o acaso muda quando o relato registra o 1º dado.
    // O mesmo valor do 2º dado vale para o dano e para a vez do inimigo (7: erra a armadura 17).
    const PRIMEIRO_DADO = 20, SEGUNDO_DADO = 7;
    const dadoEscolhido = Math.max(PRIMEIRO_DADO, SEGUNDO_DADO);
    const seloDoGolpe = dadoEscolhido === 20 ? 'critico' : 'sucesso';
    await page.evaluate((r1, r2) => {
      Math.random = () => (document.getElementById('combat-log-text').textContent.includes('Primeiro dado') ? r2 : r1);
    }, faceDoD20(PRIMEIRO_DADO), faceDoD20(SEGUNDO_DADO));
    await espera(400); // o "Voltar" remontou as ações
    await page.focus('#btn-combat-spell');
    const habilidade = await page.evaluate(() => document.querySelector('#btn-combat-spell .escolha-texto').textContent);
    if (habilidade !== 'Golpe heroico') throw new Error(`#btn-combat-spell must be the warrior's "Golpe heroico", got "${habilidade}"`);
    await page.keyboard.press('Enter');
    const golpe = await (await aguardar(() => {
      const selos = [...document.querySelectorAll('#combat-mesa [data-selo].visivel')].map(s => s.dataset.selo);
      if (!selos.length) return false;
      const dado = document.getElementById('combat-dice');
      return {
        selos,
        dado: dado.textContent,
        girando: dado.classList.contains('rolling-animation'),
        legenda: document.getElementById('combat-dice-result').textContent.replace(/\s+/g, ' ').trim(),
        vidaDoInimigo: gameState.combat.enemy.hp
      };
    }, 'The Heroic Strike did not stamp a seal on the combat tray', 6000)).jsonValue();
    console.log('Heroic Strike:', golpe);
    const legendaEsperada = `Vantagem: ${PRIMEIRO_DADO} e ${SEGUNDO_DADO} → ${dadoEscolhido}`;
    if (golpe.legenda !== legendaEsperada) {
      throw new Error(`#combat-dice-result must read "${legendaEsperada}", got "${golpe.legenda}"`);
    }
    if (golpe.dado !== String(dadoEscolhido) || golpe.girando) {
      throw new Error(`#combat-dice must rest on the higher die (${dadoEscolhido}), got "${golpe.dado}"`);
    }
    if (golpe.selos.join() !== seloDoGolpe) {
      throw new Error(`The Heroic Strike (${dadoEscolhido}) must stamp only the "${seloDoGolpe}" seal, got ${JSON.stringify(golpe.selos)}`);
    }
    if (golpe.vidaDoInimigo >= 40 || golpe.vidaDoInimigo <= 0) {
      throw new Error(`The Heroic Strike must hit and leave the Goblin standing, its life is ${golpe.vidaDoInimigo}`);
    }
    await aguardar(() => gameState.combat.turn === 'player'
      && document.activeElement === document.getElementById('btn-combat-attack'),
      'The turn did not come back to the hero (focus on the attack) after the Heroic Strike', 8000);

    // 3. Derrota: o herói com 1 de vida erra (2 no d20) e o inimigo acerta (20 natural)
    await page.evaluate(() => {
      gameState.player.health = 1;
      updateStatsDisplay();
      Math.random = () => (gameState.combat?.turn === 'enemy' ? 0.96 : 0.05);
    });
    await espera(400); // as ações foram remontadas na volta da vez
    await page.keyboard.press('Enter');
    await aguardar(() => !!document.getElementById('btn-combat-continuar')
      && document.activeElement === document.getElementById('btn-combat-continuar'),
      'The defeat did not offer #btn-combat-continuar with the focus on it', 10000);
    const continuarDaDerrotaEm = Date.now();
    const derrota = await page.evaluate(() => ({
      selosNoCard: [...document.querySelectorAll('#combat-enemy-card [data-desfecho].visivel')].map(s => s.dataset.desfecho),
      acoes: [...document.querySelectorAll('#combat-actions-panel button')].map(b => b.id),
      turno: document.getElementById('combat-turno').textContent,
      vida: gameState.player.health
    }));
    console.log('Defeat:', derrota);
    if (derrota.selosNoCard.join() !== 'derrota') {
      throw new Error(`The defeat must stamp only the "derrota" seal on the enemy card, got ${JSON.stringify(derrota.selosNoCard)}`);
    }
    if (derrota.acoes.join() !== 'btn-combat-continuar' || derrota.vida > 0) {
      throw new Error('The defeat must leave the hero at 0 and the actions must give way to a single "Continuar"');
    }
    await espera(400); // o "Continuar" ignora ativações por 300 ms (sozinho, fecha em 2 s)
    await page.keyboard.press('Enter');
    const derrotaFechouEmMs = Date.now() - continuarDaDerrotaEm;
    const depoisDaDerrota = await estadoDaFolha();
    console.log(`After Enter on "Continuar" (${derrotaFechouEmMs} ms after it appeared):`, depoisDaDerrota);
    if (derrotaFechouEmMs >= 2000) {
      throw new Error(`Enter on the defeat "Continuar" came ${derrotaFechouEmMs} ms late: it can no longer be told apart from the 2 s auto-close`);
    }
    if (depoisDaDerrota.cena !== 'death' || depoisDaDerrota.painel || depoisDaDerrota.emCombate !== false) {
      throw new Error('Enter on the defeat "Continuar" must close the combat and load the death scene');
    }
    // o foco vai para a 1ª escolha do final (o recomeçar): nenhuma tecla depois disto
    await aguardar(() => document.activeElement === document.querySelector('#choices button'),
      'After the defeat the focus must go to the first choice of the death scene', 2000);

    // De volta a um estado jogável
    await page.evaluate(() => {
      gameState.player.health = gameState.player.maxHealth;
      updateStatsDisplay();
      loadScene('corridor');
    });

    // 4. Fuga: 20 natural + 1 (Destreza) contra 12. A fuga volta para gameState.lastScene;
    // o caso fixa o corredor (de onde se chega ao Goblin) para não depender do caso 7.
    await page.evaluate(() => { gameState.lastScene = 'corridor'; });
    await abrirCombate('goblin_encounter', GOBLIN);
    await page.evaluate(() => { Math.random = () => 0.96; });
    await page.focus('#btn-combat-flee');
    await page.keyboard.press('Enter');
    await aguardar(() => !!document.getElementById('btn-combat-continuar')
      && document.activeElement === document.getElementById('btn-combat-continuar'),
      'The flight did not offer #btn-combat-continuar with the focus on it', 5000);
    const continuarDaFugaEm = Date.now();
    const fuga = await page.evaluate(() => ({
      selosNoCard: [...document.querySelectorAll('#combat-enemy-card [data-desfecho].visivel')].map(s => s.dataset.desfecho),
      derrotado: document.getElementById('combat-enemy-card').classList.contains('derrotado'),
      acoes: [...document.querySelectorAll('#combat-actions-panel button')].map(b => b.id),
      turno: document.getElementById('combat-turno').textContent,
      escapou: document.getElementById('combat-log-text').textContent.includes('Fuga bem-sucedida')
    }));
    console.log('Flight:', fuga);
    if (!fuga.escapou) throw new Error('The natural 20 must make the flight succeed');
    if (fuga.selosNoCard.length || fuga.derrotado) {
      throw new Error(`The flight must not stamp an outcome seal on the enemy card, got ${JSON.stringify(fuga.selosNoCard)}`);
    }
    if (fuga.acoes.join() !== 'btn-combat-continuar') {
      throw new Error(`The actions must give way to a single "Continuar", got ${JSON.stringify(fuga.acoes)}`);
    }
    await espera(400); // o "Continuar" ignora ativações por 300 ms (sozinho, fecha em 1,8 s)
    await page.keyboard.press('Enter');
    const fugaFechouEmMs = Date.now() - continuarDaFugaEm;
    const depoisDaFuga = await estadoDaFolha();
    console.log(`After Enter on "Continuar" (${fugaFechouEmMs} ms after it appeared):`, depoisDaFuga);
    if (fugaFechouEmMs >= 1800) {
      throw new Error(`Enter on the flight "Continuar" came ${fugaFechouEmMs} ms late: it can no longer be told apart from the 1.8 s auto-close`);
    }
    if (depoisDaFuga.painel || depoisDaFuga.emCombate !== false) {
      throw new Error('Enter on the flight "Continuar" must close the combat (panel hidden, combat.active false)');
    }
    if (depoisDaFuga.cena !== 'corridor') {
      throw new Error(`The flight must go back to gameState.lastScene ("corridor"), got "${depoisDaFuga.cena}"`);
    }
    await aguardar(() => document.activeElement === document.querySelector('#choices button'),
      'After the flight the focus must go to the first choice of the loaded scene', 2000);

    // 5. Nada de alert/confirm no caso todo
    if (dialogos.length) {
      throw new Error(`Native dialogs opened during case 8: ${JSON.stringify(dialogos)}`);
    }
  } finally {
    page.off('dialog', contarDialogo);
    await page.evaluate(() => {
      Math.random = window.__randomAntesDosDesfechos;
      delete window.__randomAntesDosDesfechos;
    }).catch(() => {});
  }
  console.log('✅ PASS: "Voltar" gives the focus back to "Usar item", the Heroic Strike keeps the higher die, and the defeat and the flight close by keyboard.');

  // ----------------------------------------------------
  // TEST CASES 9 a 12: as janelas e os avisos (Fase 4), com o teclado
  // ----------------------------------------------------
  // As janelas são <dialog> abertos com showModal(): o foco entra nelas, Escape fecha
  // (menos a especialização, obrigatória) e o foco volta para quem abriu. Nenhum
  // diálogo nativo pode abrir. As esperas de 400 ms cobrem a pausa de 300 ms dos
  // botões recém-montados e a entrada das janelas (0,22 s).
  const pausa = ms => new Promise(r => setTimeout(r, ms));
  const esperarJanela = (id, aberta = true) => page.waitForFunction((i, a) => !!document.getElementById(i).open === a, { timeout: 5000 }, id, aberta)
    .catch(() => { throw new Error(`#${id} did not ${aberta ? 'open' : 'close'} in 5 s`); });
  const focado = () => page.evaluate(() => {
    const el = document.activeElement;
    return el ? { id: el.id, rotulo: el.getAttribute('aria-label'), texto: el.textContent.trim().slice(0, 60), especializacao: el.dataset.especializacao || null, escolha: !!el.closest('#choices') } : null;
  });
  dialogos.length = 0;
  page.on('dialog', contarDialogo);
  try {
    // --- 9. O mapa ---
    console.log('\n--- 9. Testing the map window with the keyboard ---');
    await page.evaluate(() => {
      if (gameState.combat && gameState.combat.active) closeCombatScreen();
      gameState.visitedNodes = ['start'];
      gameState.levers = { lever_crystal: false, lever_lake: false };
      gameState.isPaused = false;
      loadScene('start');
      skipTyping = true;
    });
    await pausa(500);
    await page.focus('#btn-toggle-map');
    await page.keyboard.press('Enter');
    await esperarJanela('mapa');
    await pausa(400);
    const mapa = await page.evaluate(() => ({
      expandido: document.getElementById('btn-toggle-map').getAttribute('aria-expanded'),
      lugares: document.querySelectorAll('#mapa .mapa-no').length,
      podeIr: [...document.querySelectorAll('#mapa .mapa-no:not([aria-disabled="true"])')].map(b => b.dataset.no).sort(),
      portaSelada: document.querySelector('#mapa [data-no="crypt_door"]').getAttribute('aria-disabled')
    }));
    const focoNoMapa = await focado();
    console.log('Map opened:', mapa, focoNoMapa);
    if (mapa.expandido !== 'true' || mapa.lugares !== 23) throw new Error('The map seal must open #mapa with its 23 places and aria-expanded="true"');
    if (focoNoMapa.rotulo !== 'Entrada, você está aqui') throw new Error(`The focus must land on the current place, got ${JSON.stringify(focoNoMapa)}`);
    if (JSON.stringify(mapa.podeIr) !== JSON.stringify(['buy_supplies', 'corridor', 'entrance_inspection'])) throw new Error(`At the entrance the map must offer the shop, the inspection and the corridor, got ${mapa.podeIr}`);
    if (mapa.portaSelada !== 'true') throw new Error('"Porta Selada" (crypt_door) has no scene and must not be offered');
    await page.keyboard.press('Escape');
    await esperarJanela('mapa', false);
    const focoAoFechar = await focado();
    if (focoAoFechar.id !== 'btn-toggle-map') throw new Error(`Escape must give the focus back to the map seal, got ${JSON.stringify(focoAoFechar)}`);
    // Viagem pelo teclado: Tab duas vezes (Loja, Inspeção) e Espaço
    await page.keyboard.press('Enter');
    await esperarJanela('mapa');
    await pausa(400);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const destino = await focado();
    if (!/^Inspeção, pode ir/.test(destino.rotulo || '')) throw new Error(`Two Tabs from "Entrada" must reach "Inspeção", got ${JSON.stringify(destino)}`);
    await page.keyboard.press('Space');
    await esperarJanela('mapa', false);
    await pausa(700);
    const viagem = await page.evaluate(() => gameState.currentScene);
    const focoDepoisDaViagem = await focado();
    if (viagem !== 'entrance_inspection' || !focoDepoisDaViagem.escolha) throw new Error(`Travelling must load entrance_inspection and focus its first choice, got ${viagem} / ${JSON.stringify(focoDepoisDaViagem)}`);
    // A porta sem cena não quebra nada, e no meio da luta o mapa só mostra
    const semCena = await page.evaluate(() => { const antes = gameState.currentScene; teleportToNode('crypt_door'); return antes === gameState.currentScene; });
    if (!semCena) throw new Error('teleportToNode("crypt_door") must not move the hero');
    await page.evaluate(g => startInteractiveCombat(g), GOBLIN);
    await pausa(500);
    await page.evaluate(() => document.getElementById('btn-toggle-map').click());
    await esperarJanela('mapa');
    const naLuta = await page.evaluate(() => ({
      status: document.getElementById('mapa-status').textContent,
      podeIr: document.querySelectorAll('#mapa .mapa-no:not([aria-disabled="true"])').length
    }));
    if (!/combate/i.test(naLuta.status) || naLuta.podeIr !== 0) throw new Error(`During a combat the map must say why and offer nothing, got ${JSON.stringify(naLuta)}`);
    await page.keyboard.press('Escape');
    await esperarJanela('mapa', false);
    await page.evaluate(() => closeCombatScreen());
    console.log('✅ PASS: The map opens by the seal, travels by keyboard, gives the focus back and stays put in combat and on a scene-less node.');

    // --- 10. A loja e a especialização ---
    console.log('\n--- 10. Testing the shop and the specialization windows ---');
    await page.evaluate(() => {
      gameState.player.gold = 5;
      gameState.player.inventory = [];
      updateInventoryDisplay();
      updateStatsDisplay();
      loadScene('buy_supplies');
    });
    await esperarJanela('loja');
    await pausa(400);
    const focoNaLoja = await focado();
    if (!/Poção de Vida/.test(focoNaLoja.texto)) throw new Error(`The shop must focus its first good, got ${JSON.stringify(focoNaLoja)}`);
    await page.keyboard.press('Enter'); // a poção custa 10; há 5
    await pausa(200);
    const semOuro = await page.evaluate(() => ({ status: document.getElementById('loja-status').textContent, tom: document.getElementById('loja-status').dataset.tom, ouro: gameState.player.gold }));
    if (!/faltam 5 de ouro/.test(semOuro.status) || semOuro.tom !== 'falha' || semOuro.ouro !== 5) throw new Error(`An unaffordable good must explain itself in the window, got ${JSON.stringify(semOuro)}`);
    await page.evaluate(() => [...document.querySelectorAll('#loja-mercadorias button')].pop().click()); // a tocha, 2 de ouro
    await pausa(200);
    const comprou = await page.evaluate(() => ({
      ouro: gameState.player.gold,
      mochila: gameState.player.inventory,
      salvo: JSON.parse(localStorage.getItem('ded_save_v1')).player.inventory,
      status: document.getElementById('loja-status').textContent
    }));
    if (comprou.ouro !== 3 || !comprou.mochila.includes('Tocha') || !comprou.salvo.includes('Tocha') || !/Você comprou Tocha/.test(comprou.status)) {
      throw new Error(`Buying the torch must take 2 gold, add it, save the game and say so, got ${JSON.stringify(comprou)}`);
    }
    await page.keyboard.press('Escape');
    await esperarJanela('loja', false);
    await pausa(300);
    const focoForaDaLoja = await focado();
    if (!focoForaDaLoja.escolha) throw new Error(`Closing the shop must leave the focus on the scene choices, got ${JSON.stringify(focoForaDaLoja)}`);
    // Especialização: o nível 3 abre a janela obrigatória
    await page.evaluate(() => { gameState.player.specialization = null; gameState.player.xp = 140; gameState.player.level = 2; changeXP(20); });
    await esperarJanela('especializacao');
    await pausa(400);
    const espec = await page.evaluate(() => ({ obrigatoria: document.getElementById('especializacao').hasAttribute('data-obrigatoria'), pausado: gameState.isPaused }));
    const focoNaEspec = await focado();
    if (!espec.obrigatoria || !espec.pausado || focoNaEspec.especializacao !== 'Paladino') {
      throw new Error(`The specialization window must be mandatory, pause the game and focus the first option, got ${JSON.stringify({ espec, focoNaEspec })}`);
    }
    for (let i = 0; i < 4; i++) { await page.keyboard.press('Escape'); await pausa(250); }
    if (!(await page.evaluate(() => document.getElementById('especializacao').open))) throw new Error('Escape must not close the mandatory specialization window');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await esperarJanela('especializacao', false);
    const escolheu = await page.evaluate(() => ({ espec: gameState.player.specialization, pausado: gameState.isPaused, selo: document.getElementById('specialization-badge').textContent.trim() }));
    if (escolheu.espec !== 'Berserker' || escolheu.pausado || escolheu.selo !== 'Berserker') throw new Error(`Tab + Enter must choose Berserker and resume the game, got ${JSON.stringify(escolheu)}`);
    console.log('✅ PASS: The shop explains, buys and saves by keyboard, and the mandatory specialization survives Escape and is chosen by keyboard.');

    // --- 11. O diário ---
    console.log('\n--- 11. Testing the journal window ---');
    await page.evaluate(() => {
      gameState.quests.purify_crypt.status = 'active';
      gameState.quests.decode_runes.status = 'active';
      gameState.quests.decode_runes.runesFound = ['crypt'];
      gameState.quests.merchant_amulet.status = 'inactive';
    });
    await page.focus('#quest-journal-button');
    await page.keyboard.press('Enter');
    await esperarJanela('diario');
    await pausa(400);
    const diario = await page.evaluate(() => ({
      missoes: [...document.querySelectorAll('#diario .diario-missao')].map(m => m.textContent.replace(/\s+/g, ' ').trim()),
      vazios: document.querySelectorAll('#diario .diario-vazio').length,
      creditos: /Carl Olsen/.test(document.getElementById('diario').textContent)
    }));
    console.log('Journal:', diario);
    if (diario.missoes.length !== 2 || diario.missoes.some(m => /Amuleto/.test(m))) throw new Error('The journal must list the two active quests and hide the inactive one');
    if (!diario.missoes.some(m => /Alavancas/.test(m) && /de 2/.test(m)) || !diario.missoes.some(m => /1 de 3/.test(m))) throw new Error('The journal must show the levers (n de 2) and the runes (1 de 3)');
    if (!diario.creditos) throw new Error('The journal must carry the icon credits, with the up-to-date authors');
    await page.keyboard.press('Escape');
    await esperarJanela('diario', false);
    if ((await focado()).id !== 'quest-journal-button') throw new Error('Escape must give the focus back to the journal seal');
    console.log('✅ PASS: The journal lists only the discovered quests with their progress and the credits, and closes by keyboard.');

    // --- 12. O fim, os avisos, a barreira e a crônica ---
    console.log('\n--- 12. Testing the end window, the toasts, the barrier and the chronicle ---');
    // a janela abre sozinha, por um temporizador: ao fechar, o foco volta para quem o
    // tinha antes dela (aqui, o selo do diário, que o caso 11 acabou de fechar)
    const focoAntesDoFim = await page.evaluate(() => { loadScene('death'); skipTyping = true; return document.activeElement.id; });
    await esperarJanela('fim');
    const fim = await page.evaluate(() => ({
      titulo: document.getElementById('fim-titulo').textContent,
      desfecho: document.getElementById('fim').dataset.desfecho,
      foco: document.activeElement && document.activeElement.textContent.trim()
    }));
    // o foco vai para "Rever a cena", não para o botão que apaga o save
    if (fim.titulo !== 'Você morreu' || fim.desfecho !== 'derrota' || fim.foco !== 'Rever a cena') throw new Error(`The death must open the end window focused on "Rever a cena", got ${JSON.stringify(fim)}`);
    await page.evaluate(() => { window.__semRecarga = true; document.getElementById('fim-recomecar').click(); }); // logo depois de abrir: ignorado
    await pausa(100);
    const intacto = await page.evaluate(() => !!localStorage.getItem('ded_save_v1') && window.__semRecarga === true);
    if (!intacto) throw new Error('A click on "Começar uma nova aventura" right after the end window opens must not start a new adventure');
    await page.keyboard.press('Escape');
    await esperarJanela('fim', false);
    const focoNoFim = await focado();
    if (!focoAntesDoFim || focoNoFim.id !== focoAntesDoFim) throw new Error(`Closing the end window must give the focus back to "${focoAntesDoFim}", got ${JSON.stringify(focoNoFim)}`);
    // uma cena nova antes da hora cancela a janela
    await page.evaluate(() => { loadScene('death'); skipTyping = true; });
    await pausa(300);
    await page.evaluate(() => loadScene('corridor'));
    await pausa(2500);
    if (await page.evaluate(() => document.getElementById('fim').open)) throw new Error('A new scene must cancel the pending end window');
    // avisos no lugar dos alert(): o mercador e a mochila cheia (um aviso só)
    const avisos = () => page.evaluate(() => [...document.querySelectorAll('#avisos .aviso:not([hidden]) .aviso-texto')].map(a => a.textContent));
    await page.evaluate(() => { loadScene('crypt_merchant'); skipTyping = true; });
    await pausa(400);
    const doMercador = await avisos();
    if (!doMercador.some(t => /Over rir/.test(t))) throw new Error(`The merchant must speak through a toast, got ${JSON.stringify(doMercador)}`);
    await pausa(6500); // o aviso some sozinho
    await page.evaluate(() => {
      gameState.player.inventory = ['Corda', 'Corda', 'Corda', 'Corda', 'Corda', 'Corda'];
      updateInventoryDisplay();
      loadScene('check_supplies');
      skipTyping = true;
    });
    await pausa(400);
    const daMochila = (await avisos()).filter(t => /Mochila cheia/.test(t));
    if (daMochila.length !== 1) throw new Error(`A full backpack must raise exactly one toast, got ${JSON.stringify(daMochila)}`);
    // a barreira recusa a passagem com um aviso
    await page.evaluate(() => { gameState.levers = { lever_crystal: false, lever_lake: false }; loadScene('corridor'); });
    await pausa(300);
    const barreira = await page.evaluate(() => { const antes = gameState.currentScene; loadScene('final_chamber_entrance'); return antes === gameState.currentScene; });
    await pausa(400);
    if (!barreira || !(await avisos()).some(t => /barreira/i.test(t))) throw new Error('The barrier must keep the hero out and say so in a toast');
    // a linha só de emojis vira palavras na crônica
    const linha = await page.evaluate(() => { addToLog('💍 👑 💵 💰 🪙 💎'); const li = [...document.querySelectorAll('#game-log li')].pop(); return li.textContent.trim(); });
    if (linha !== 'Anel, coroa, notas, bolsa de ouro, moeda e diamante.') throw new Error(`The emoji-only chronicle line must read in words, got "${linha}"`);
    if (dialogos.length) throw new Error(`Native dialogs opened during cases 9 to 12: ${JSON.stringify(dialogos)}`);
    console.log('✅ PASS: The end window opens after the death focused on "Rever a cena" and can be dismissed, a new scene cancels it, toasts replace the alerts, the barrier says why, and the chronicle reads in words.');
  } finally {
    page.off('dialog', contarDialogo);
  }


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
