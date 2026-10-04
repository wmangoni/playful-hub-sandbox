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
  console.log('===============================================================');
  console.log('  QA TEST SUITE - PUZZLE MASTER: VISUAL REDESIGN & I18N (PT/EN)');
  console.log('===============================================================');

  const puppeteerModule = await import('puppeteer');
  puppeteer = puppeteerModule.default;

  await startServer();

  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

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

  console.log('\n--- 1. Carregando Puzzle Master (Mind Labyrinth) ---');
  await page.goto(`http://127.0.0.1:${PORT}/puzzle/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => !!window.__puzzle, { timeout: 15000 });

  // -----------------------------------------------------------------
  // Teste 1: Seletor de Idiomas na Inicialização e Alternância PT <-> EN
  // -----------------------------------------------------------------
  console.log('\n--- Teste 1: Seletor de Idiomas e Internacionalização UI ---');

  // Testar seleção de Português
  await page.click('#lang-pt-btn');
  let langCheckPT = await page.evaluate(() => {
    const p = window.__puzzle;
    return {
      currentLang: p.getLanguage(),
      mainTitle: document.getElementById('main-title').textContent,
      campaignTitle: document.getElementById('campaign-title').textContent,
      endlessTitle: document.getElementById('endless-title').textContent,
      timeattackTitle: document.getElementById('timeattack-title').textContent,
      levelLabel: document.getElementById('level-label').textContent,
      scoreLabel: document.getElementById('score-label').textContent,
      savedInStorage: localStorage.getItem('mind_labyrinth_lang'),
      flag: document.getElementById('lang-flag-display').textContent,
      code: document.getElementById('lang-code-display').textContent
    };
  });

  console.log('Resultados em Português:', JSON.stringify(langCheckPT, null, 2));
  if (langCheckPT.currentLang !== 'pt' || 
      langCheckPT.savedInStorage !== 'pt' || 
      !langCheckPT.campaignTitle.includes('Campanha') || 
      !langCheckPT.levelLabel.includes('Nível')) {
    throw new Error('Falha na validação do idioma Português (PT).');
  }

  await page.screenshot({ path: path.join(__dirname, 'puzzle_evidence_pt_start.png') });

  // Testar alternância para Inglês pelo seletor de entrada
  await page.click('#lang-en-btn');
  let langCheckEN = await page.evaluate(() => {
    const p = window.__puzzle;
    return {
      currentLang: p.getLanguage(),
      mainTitle: document.getElementById('main-title').textContent,
      campaignTitle: document.getElementById('campaign-title').textContent,
      endlessTitle: document.getElementById('endless-title').textContent,
      timeattackTitle: document.getElementById('timeattack-title').textContent,
      levelLabel: document.getElementById('level-label').textContent,
      scoreLabel: document.getElementById('score-label').textContent,
      savedInStorage: localStorage.getItem('mind_labyrinth_lang'),
      flag: document.getElementById('lang-flag-display').textContent,
      code: document.getElementById('lang-code-display').textContent
    };
  });

  console.log('Resultados em Inglês:', JSON.stringify(langCheckEN, null, 2));
  if (langCheckEN.currentLang !== 'en' || 
      langCheckEN.savedInStorage !== 'en' || 
      !langCheckEN.campaignTitle.includes('Campaign') || 
      !langCheckEN.levelLabel.includes('Level')) {
    throw new Error('Falha na alternância para o idioma Inglês (EN).');
  }

  await page.screenshot({ path: path.join(__dirname, 'puzzle_evidence_en_start.png') });

  // Testar alternância via botão rápido no cabeçalho
  await page.click('#lang-quick-toggle');
  const toggleBackToPT = await page.evaluate(() => window.__puzzle.getLanguage());
  if (toggleBackToPT !== 'pt') {
    throw new Error(`Falha no botão rápido de alternância: esperado 'pt', obtido '${toggleBackToPT}'.`);
  }
  console.log('✅ Teste 1: Seletor de Idiomas (PT/EN) e persistência em localStorage validados.');

  // -----------------------------------------------------------------
  // Teste 2: Geração de Todos os 6 Puzzles com Textos Bilíngues
  // -----------------------------------------------------------------
  console.log('\n--- Teste 2: Geração de Enigmas Procedurais Bilíngues ---');

  const puzzleI18nResults = await page.evaluate(() => {
    const p = window.__puzzle;
    const gen = p.ProceduralGenerator;

    // Gerar em PT
    p.setLanguage('pt');
    const seqPT = gen.generate('sequence', 2);
    const patPT = gen.generate('pattern', 2);
    const memPT = gen.generate('memory', 2);
    const logPT = gen.generate('logic', 2);
    const perPT = gen.generate('perspective', 2);
    const conPT = gen.generate('constellation', 2);

    const ptTitles = {
      sequence: seqPT.title,
      pattern: patPT.title,
      memory: memPT.title,
      logic: logPT.title,
      perspective: perPT.title,
      constellation: conPT.title
    };

    // Gerar em EN
    p.setLanguage('en');
    const seqEN = gen.generate('sequence', 2);
    const patEN = gen.generate('pattern', 2);
    const memEN = gen.generate('memory', 2);
    const logEN = gen.generate('logic', 2);
    const perEN = gen.generate('perspective', 2);
    const conEN = gen.generate('constellation', 2);

    const enTitles = {
      sequence: seqEN.title,
      pattern: patEN.title,
      memory: memEN.title,
      logic: logEN.title,
      perspective: perEN.title,
      constellation: conEN.title
    };

    // Renderizar Prisma de Perspectiva e validar botão de verificar
    const dummyCb = () => {};
    const perDomEN = perEN.render(dummyCb);
    const verifyBtn = perDomEN.querySelector('.btn-verify');
    const verifyTextEN = verifyBtn ? verifyBtn.textContent : '';

    return {
      ptTitles,
      enTitles,
      verifyTextEN,
      hasDistinctSeq: ptTitles.sequence !== enTitles.sequence,
      hasDistinctPat: ptTitles.pattern !== enTitles.pattern,
      hasDistinctMem: ptTitles.memory !== enTitles.memory,
      hasDistinctLog: ptTitles.logic !== enTitles.logic,
      hasDistinctPer: ptTitles.perspective !== enTitles.perspective,
      hasDistinctCon: ptTitles.constellation !== enTitles.constellation
    };
  });

  console.log('Títulos dos Enigmas (PT vs EN):', JSON.stringify(puzzleI18nResults, null, 2));

  if (!puzzleI18nResults.hasDistinctSeq || 
      !puzzleI18nResults.hasDistinctPat || 
      !puzzleI18nResults.hasDistinctMem || 
      !puzzleI18nResults.hasDistinctLog || 
      !puzzleI18nResults.hasDistinctPer || 
      !puzzleI18nResults.hasDistinctCon ||
      puzzleI18nResults.verifyTextEN !== 'Verify') {
    throw new Error('Falha na geração de enigmas traduzidos dinamicamente.');
  }
  console.log('✅ Teste 2: Todos os 6 enigmas suportam geração e tradução procedural completa.');

  // -----------------------------------------------------------------
  // Teste 3: Grimório de Relíquias Bilíngue e Equipamento
  // -----------------------------------------------------------------
  console.log('\n--- Teste 3: Grimório de Relíquias (Nomes, Lore e Efeitos Traduzidos) ---');

  // Abre grimório em PT
  await page.evaluate(() => {
    window.__puzzle.setLanguage('pt');
    document.getElementById('grimoire-btn').click();
  });

  const grimoirePT = await page.evaluate(() => {
    const title = document.getElementById('grimoire-overlay-title').textContent;
    const cards = Array.from(document.querySelectorAll('#grimoire-grid > div'));
    const firstRelicName = cards[0] ? cards[0].querySelector('span:nth-child(2)').textContent : '';
    return { title, firstRelicName, count: cards.length };
  });

  console.log('Grimório em Português:', JSON.stringify(grimoirePT, null, 2));
  if (!grimoirePT.title.includes('Grimório') || grimoirePT.firstRelicName !== 'Astrolábio Quebrado') {
    throw new Error('Falha na exibição do Grimório em Português.');
  }

  await page.screenshot({ path: path.join(__dirname, 'puzzle_evidence_grimoire.png') });

  // Fecha grimório e muda para EN
  await page.evaluate(() => {
    document.getElementById('close-grimoire-btn').click();
    window.__puzzle.setLanguage('en');
    document.getElementById('grimoire-btn').click();
  });

  const grimoireEN = await page.evaluate(() => {
    const title = document.getElementById('grimoire-overlay-title').textContent;
    const cards = Array.from(document.querySelectorAll('#grimoire-grid > div'));
    const firstRelicName = cards[0] ? cards[0].querySelector('span:nth-child(2)').textContent : '';
    return { title, firstRelicName, count: cards.length };
  });

  console.log('Grimório em Inglês:', JSON.stringify(grimoireEN, null, 2));
  if (!grimoireEN.title.includes('Grimoire') || grimoireEN.firstRelicName !== 'Broken Astrolabe') {
    throw new Error('Falha na exibição do Grimório em Inglês.');
  }

  await page.evaluate(() => document.getElementById('close-grimoire-btn').click());
  console.log('✅ Teste 3: Grimório de Relíquias traduzido e funcional em ambos os idiomas.');

  // -----------------------------------------------------------------
  // Teste 4: Partida em Andamento, Mudança de Idioma em Tempo Real e Feedback
  // -----------------------------------------------------------------
  console.log('\n--- Teste 4: Mudança de Idioma em Tempo Real durante a Partida ---');

  // Iniciar Campanha em PT
  await page.evaluate(() => {
    window.__puzzle.setLanguage('pt');
    window.__puzzle.startGame('campaign');
  });

  const campaignStartPT = await page.evaluate(() => {
    return {
      running: window.__puzzle.gameState.running,
      narrativeText: document.getElementById('narrative').textContent.trim(),
      puzzleTitle: document.querySelector('.puzzle-title').textContent.trim()
    };
  });

  if (!campaignStartPT.running || !campaignStartPT.narrativeText.startsWith('Você se encontra')) {
    throw new Error('Falha ao iniciar campanha em Português.');
  }
  await page.screenshot({ path: path.join(__dirname, 'puzzle_evidence_gameplay_pt.png') });

  // Mudar idioma para Inglês no meio do jogo
  await page.evaluate(() => {
    window.__puzzle.setLanguage('en');
  });

  const campaignSwitchedEN = await page.evaluate(() => {
    return {
      running: window.__puzzle.gameState.running,
      narrativeText: document.getElementById('narrative').textContent.trim(),
      puzzleTitle: document.querySelector('.puzzle-title').textContent.trim(),
      levelLabel: document.getElementById('level-label').textContent.trim()
    };
  });

  console.log('Campanha após troca em tempo real para EN:', JSON.stringify(campaignSwitchedEN, null, 2));
  if (!campaignSwitchedEN.running || 
      !campaignSwitchedEN.narrativeText.startsWith('You find yourself') || 
      campaignSwitchedEN.levelLabel !== 'Level:') {
    throw new Error('Falha na troca de idioma em tempo real durante a partida.');
  }
  await page.screenshot({ path: path.join(__dirname, 'puzzle_evidence_gameplay_en.png') });

  // Responder corretamente e verificar feedback em Inglês
  await page.evaluate(() => {
    window.__puzzle.onAnswer(true);
  });

  const feedbackText = await page.evaluate(() => document.getElementById('feedback').textContent);
  console.log('Feedback após acerto em EN:', feedbackText);
  if (!feedbackText.includes('Correct!')) {
    throw new Error(`Mensagem de acerto esperada em inglês ("Correct!"), recebido: "${feedbackText}".`);
  }

  // -----------------------------------------------------------------
  // Teste 5: Validação Visual de Componentes (Prisma 3D, Cartas de Memória)
  // -----------------------------------------------------------------
  console.log('\n--- Teste 5: Validação Visual dos Componentes ---');

  const componentsCheck = await page.evaluate(() => {
    const gen = window.__puzzle.ProceduralGenerator;
    const memPuzzle = gen.generate('memory', 2);
    const dummy = () => {};
    const memDom = memPuzzle.render(dummy);
    const cells = memDom.querySelectorAll('.memory-cell');
    const firstCellHas3D = !!cells[0].querySelector('.memory-cell-inner');

    const perPuzzle = gen.generate('perspective', 2);
    const perDom = perPuzzle.render(dummy);
    const cube = perDom.querySelector('.rotating-cube');
    const hasFaces = cube && cube.children.length === 6;

    return {
      cellCount: cells.length,
      firstCellHas3D,
      hasPerspectiveCube: !!cube,
      hasSixFaces: hasFaces
    };
  });

  console.log('Inspeção dos Componentes Visuais:', JSON.stringify(componentsCheck, null, 2));
  if (!componentsCheck.firstCellHas3D || !componentsCheck.hasPerspectiveCube || !componentsCheck.hasSixFaces) {
    throw new Error('Falha na renderização dos componentes visuais 3D do Puzzle Master.');
  }

  // Resetar ao menu ao final
  await page.evaluate(() => window.__puzzle.resetToMenu());

  if (consoleErrors.length > 0) {
    console.error('\nErros detectados no console do navegador:', consoleErrors);
    throw new Error(`Detectados ${consoleErrors.length} erros no navegador durante os testes.`);
  }

  console.log('===============================================================');
  console.log('🎉 TODOS OS TESTES DE INTERNACIONALIZAÇÃO E VISUAL PASSARAM!');
  console.log('===============================================================');

  await browser.close();
  server.close();
}

runTests().catch(err => {
  console.error('\n❌ QA TEST SUITE FAILED:', err);
  if (browser) browser.close();
  if (server) server.close();
  process.exit(1);
});
