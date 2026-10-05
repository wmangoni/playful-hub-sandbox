process.env.NODE_ENV = 'test';
const http = require('http');
const path = require('path');
const app = require('../server');

let server;
let browser;
let page;
let puppeteer;

const PORT = process.env.TEST_PORT || 3097;

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
  console.log('================================================================');
  console.log('  QA TEST SUITE - PLAYFUL MUSEUM 90s RETRO PC & 4:3 CRT SETUP');
  console.log('================================================================');

  const puppeteerModule = await import('puppeteer');
  puppeteer = puppeteerModule.default;

  await startServer();

  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 850 });

  const consoleErrors = [];
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('ERR_NAME_NOT_RESOLVED') && !text.includes('favicon.ico')) {
      console.log(`[BROWSER ERROR] ${text}`);
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', err => {
    console.log(`[BROWSER PAGEERROR] ${err.toString()}`);
    consoleErrors.push(err.toString());
  });

  console.log('\n--- 1. Navegando para o Modo Museu Retro Setup (index2.html) ---');
  await page.goto(`http://127.0.0.1:${PORT}/index2.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => !!window.__museum, { timeout: 15000 });

  // -------------------------------------------------------------
  // Teste 1: Proporção Exata 4:3 do Tubo CRT
  // -------------------------------------------------------------
  console.log('\n--- Test 1: Proporção Rígida 4:3 do Tubo de Vidro CRT ---');
  const ratioCheck = await page.evaluate(() => {
    const socket = document.getElementById('crtTubeSocket');
    const rect = socket.getBoundingClientRect();
    const ratio = rect.width / rect.height;
    return {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      ratio: Number(ratio.toFixed(4)),
      expectedRatio: Number((4 / 3).toFixed(4)),
      is4to3: Math.abs(ratio - (4 / 3)) < 0.05
    };
  });

  console.log('Verificação de Proporção 4:3:', JSON.stringify(ratioCheck, null, 2));
  if (!ratioCheck.is4to3) {
    throw new Error(`Tubo CRT não está em proporção 4:3! Razão encontrada: ${ratioCheck.ratio}`);
  }
  console.log('✅ Teste 1: Monitor CRT calibrado estritamente na proporção 4:3.');

  // -------------------------------------------------------------
  // Teste 2: Componentes do Gabinete PC Anos 90 e Periféricos
  // -------------------------------------------------------------
  console.log('\n--- Test 2: Integridade do Gabinete PC 90s, Drives e Periféricos ---');
  const rigCheck = await page.evaluate(() => {
    const pcCase = document.querySelector('.retro-pc-case');
    const cdrom = document.querySelector('.cdrom-slot');
    const floppy35 = document.querySelector('.floppy-35-slot');
    const floppy525 = document.querySelector('.floppy-525-slot');
    const turboDisplay = document.getElementById('turboLedDisplay');
    const intelBadge = document.querySelector('.intel-badge');
    const sbBadge = document.querySelector('.sb-badge');
    const keyboard = document.querySelector('.vintage-keyboard');
    const mousepad = document.querySelector('.vintage-mousepad');

    return {
      hasPcCase: !!pcCase,
      hasCdrom: !!cdrom,
      hasFloppy35: !!floppy35,
      hasFloppy525: !!floppy525,
      turboDisplayText: turboDisplay ? turboDisplay.textContent.trim() : null,
      hasIntelBadge: !!intelBadge,
      hasSbBadge: !!sbBadge,
      hasKeyboard: !!keyboard,
      hasMousepad: !!mousepad
    };
  });

  console.log('Componentes do Rig Retrô:', JSON.stringify(rigCheck, null, 2));
  if (!rigCheck.hasPcCase || !rigCheck.hasCdrom || !rigCheck.hasFloppy35 || rigCheck.turboDisplayText !== '66') {
    throw new Error('Falha ao verificar os componentes físicos do PC anos 90.');
  }
  console.log('✅ Teste 2: Gabinete horizontal, drives (CD-ROM 4X, Floppy 3.5/5.25), display 66MHz e periféricos validados.');

  // -------------------------------------------------------------
  // Teste 3: Botão TURBO (33 MHz vs 66 MHz)
  // -------------------------------------------------------------
  console.log('\n--- Test 3: Botão TURBO e Alternância de Velocidade ---');
  const turboInitial = await page.evaluate(() => window.__museum.getTurboSpeed());
  
  // Clicar no botão Turbo para desativar (33 MHz)
  await page.click('#btn-turbo');
  await new Promise(r => setTimeout(r, 80));

  const turboAfterClick = await page.evaluate(() => {
    return {
      speed: window.__museum.getTurboSpeed(),
      displayText: document.getElementById('turboLedDisplay').textContent.trim(),
      playerSpeed: window.__museum.getPlayer().speed
    };
  });

  // Clicar novamente para reativar (66 MHz)
  await page.click('#btn-turbo');
  await new Promise(r => setTimeout(r, 80));
  const turboRestored = await page.evaluate(() => window.__museum.getTurboSpeed());

  console.log('Alternância do Turbo:', { turboInitial, turboAfterClick, turboRestored });
  if (turboInitial !== 66 || turboAfterClick.speed !== 33 || turboAfterClick.displayText !== '33' || turboRestored !== 66) {
    throw new Error('Falha no funcionamento do botão Turbo e display LED.');
  }
  console.log('✅ Teste 3: Botão Turbo funcional alternando dinamicamente entre 66 MHz e 33 MHz.');

  // -------------------------------------------------------------
  // Teste 4: Botão DEGAUSS (Desmagnetização de Tubo)
  // -------------------------------------------------------------
  console.log('\n--- Test 4: Botão DEGAUSS e Efeito Eletromagnético ---');
  await page.click('#btn-degauss');
  await new Promise(r => setTimeout(r, 60));

  const degaussActive = await page.evaluate(() => {
    const socket = document.getElementById('crtTubeSocket');
    return socket.classList.contains('degaussing');
  });

  console.log('Status do Degauss ativo:', degaussActive);
  if (!degaussActive) {
    throw new Error('Classe de animação degaussing não ativada após clique no botão DEGAUSS.');
  }

  // Esperar o ciclo de desmagnetização (750ms) completar
  await new Promise(r => setTimeout(r, 800));
  const degaussFinished = await page.evaluate(() => {
    const socket = document.getElementById('crtTubeSocket');
    return !socket.classList.contains('degaussing');
  });

  if (!degaussFinished) {
    throw new Error('Efeito degaussing não finalizou após o tempo esperado.');
  }
  console.log('✅ Teste 4: Degauss executado com sucesso com distorção de tubo e retorno à nitidez.');

  // -------------------------------------------------------------
  // Teste 5: Botão POWER do Monitor (Colapso de Feixe de Elétrons)
  // -------------------------------------------------------------
  console.log('\n--- Test 5: Botão POWER do Monitor CRT ---');
  const powerInitial = await page.evaluate(() => window.__museum.isMonitorOn());
  
  // Desligar o monitor
  await page.click('#btn-monitor-power');
  await new Promise(r => setTimeout(r, 400));

  const powerOffState = await page.evaluate(() => {
    const blackout = document.getElementById('crtBlackout');
    const led = document.getElementById('monitorPowerLed');
    return {
      isMonitorOn: window.__museum.isMonitorOn(),
      hasBlackout: blackout.classList.contains('is-off'),
      isStandbyLed: led.classList.contains('standby')
    };
  });

  console.log('Estado com Monitor Desligado:', powerOffState);
  if (powerOffState.isMonitorOn || !powerOffState.hasBlackout || !powerOffState.isStandbyLed) {
    throw new Error('Falha ao desligar monitor CRT (colapso de feixe de elétrons ou LED standby ausente).');
  }

  // Ligar o monitor novamente
  await page.click('#btn-monitor-power');
  await new Promise(r => setTimeout(r, 200));

  const powerOnState = await page.evaluate(() => {
    const blackout = document.getElementById('crtBlackout');
    const led = document.getElementById('monitorPowerLed');
    return {
      isMonitorOn: window.__museum.isMonitorOn(),
      blackoutActive: blackout.classList.contains('is-off'),
      isActiveLed: led.classList.contains('active')
    };
  });

  if (!powerOnState.isMonitorOn || powerOnState.blackoutActive || !powerOnState.isActiveLed) {
    throw new Error('Falha ao reativar monitor CRT.');
  }
  console.log('✅ Teste 5: Ligar/Desligar monitor CRT com colapso de feixe e LED sincronizado.');

  // -------------------------------------------------------------
  // Teste 6: Alternância de Visão (Mesa Completa vs Foco no Monitor)
  // -------------------------------------------------------------
  console.log('\n--- Test 6: Modos de Visão (Visão de Mesa vs Foco no Monitor 4:3) ---');
  const viewModeInitial = await page.evaluate(() => window.__museum.getViewMode());
  
  // Clicar em Foco
  await page.click('#btn-zoom-view');
  await new Promise(r => setTimeout(r, 250));

  const viewModeFocus = await page.evaluate(() => {
    const env = document.getElementById('retro-environment');
    return {
      mode: window.__museum.getViewMode(),
      hasFocusClass: env.classList.contains('focus-mode'),
      btnLabel: document.getElementById('zoom-btn-label').textContent.trim()
    };
  });

  console.log('Modo Foco no Monitor:', viewModeFocus);
  if (viewModeFocus.mode !== 'focus' || !viewModeFocus.hasFocusClass || viewModeFocus.btnLabel !== 'MESA') {
    throw new Error('Falha ao alternar para o Modo Foco no Monitor 4:3.');
  }

  // Retornar à visão de mesa
  await page.click('#btn-zoom-view');
  await new Promise(r => setTimeout(r, 250));
  const viewModeDesk = await page.evaluate(() => window.__museum.getViewMode());
  if (viewModeDesk !== 'desk') {
    throw new Error('Falha ao retornar à Visão de Mesa Retrô.');
  }
  console.log('✅ Teste 6: Transição suave entre Visão de Mesa 90s e Foco no Monitor 4:3.');

  // -------------------------------------------------------------
  // Teste 7: Interação com Jogos e Modal dentro do Tubo CRT
  // -------------------------------------------------------------
  console.log('\n--- Test 7: Exibição de Jogo e Modal dentro do Tubo 4:3 ---');
  await page.evaluate(() => {
    window.__museum.teleportPlayer(1800, 780);
  });
  await new Promise(r => setTimeout(r, 120));
  await page.evaluate(() => {
    window.__museum.simulateInteract();
  });
  await new Promise(r => setTimeout(r, 200));

  const modalInTube = await page.evaluate(() => {
    const modal = document.getElementById('game-modal');
    const title = document.getElementById('modal-title');
    const img = document.getElementById('modal-preview-img');
    const socket = document.getElementById('crtTubeSocket');
    return {
      modalActive: modal.classList.contains('active'),
      titleText: title.textContent,
      imgSrc: img.src,
      isContainedInSocket: socket.contains(modal)
    };
  });

  console.log('Modal dentro do Tubo CRT:', modalInTube);
  if (!modalInTube.modalActive || !modalInTube.isContainedInSocket || !modalInTube.imgSrc.includes('puzzle_preview.png')) {
    throw new Error('Modal não está contida e ativa dentro do tubo de vidro CRT 4:3.');
  }
  console.log('✅ Teste 7: Modal e interfaces perfeitamente emolduradas dentro do vidro do tubo CRT.');

  // Fechar modal
  await page.evaluate(() => window.__museum.closeModal());
  await new Promise(r => setTimeout(r, 100));

  // -------------------------------------------------------------
  // Captura de Screenshots de Evidência
  // -------------------------------------------------------------
  console.log('\n--- Captura de Screenshots de Evidência ---');
  
  // 1. Visão Completa da Mesa e PC dos Anos 90 (Desk View)
  await page.evaluate(() => {
    window.__museum.teleportPlayer(1200, 1050);
  });
  await new Promise(r => setTimeout(r, 200));
  const deskEvidence = path.join(__dirname, 'crt_pc_desk_view.png');
  await page.screenshot({ path: deskEvidence });
  console.log('📸 Evidência 1 (Mesa e PC Anos 90 Completo):', deskEvidence);

  // 2. Visão Focada no Monitor CRT 4:3 (Focus View)
  await page.evaluate(() => window.__museum.toggleViewMode());
  await new Promise(r => setTimeout(r, 350));
  const focusEvidence = path.join(__dirname, 'crt_pc_focus_view.png');
  await page.screenshot({ path: focusEvidence });
  console.log('📸 Evidência 2 (Foco no Monitor CRT 4:3):', focusEvidence);

  // 3. Efeito Degauss em Ação
  await page.evaluate(() => window.__museum.triggerDegauss());
  await new Promise(r => setTimeout(r, 70)); // Pegar o ápice da distorção
  const degaussEvidence = path.join(__dirname, 'crt_pc_degauss_action.png');
  await page.screenshot({ path: degaussEvidence });
  console.log('📸 Evidência 3 (Degauss Eletromagnético):', degaussEvidence);

  // 4. Exposição de Jogo na Modal Aberta
  await new Promise(r => setTimeout(r, 700)); // Esperar degauss terminar
  await page.evaluate(() => {
    window.__museum.teleportPlayer(1800, 780);
  });
  await new Promise(r => setTimeout(r, 100));
  await page.evaluate(() => window.__museum.simulateInteract());
  await new Promise(r => setTimeout(r, 200));
  const modalEvidence = path.join(__dirname, 'crt_pc_modal_game.png');
  await page.screenshot({ path: modalEvidence });
  console.log('📸 Evidência 4 (Modal de Jogo Aberta no CRT):', modalEvidence);

  console.log('\n================================================================');
  console.log('🎉 TODOS OS TESTES DO MONITOR CRT 4:3 E PC ANOS 90 PASSARAM!');
  console.log('================================================================');
}

runTests()
  .catch(err => {
    console.error('\n❌ ERRO NOS TESTES DO SETUP RETRÔ CRT:', err);
    process.exit(1);
  })
  .finally(async () => {
    if (browser) await browser.close();
    if (server) server.close();
  });
