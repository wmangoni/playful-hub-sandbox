/**
 * QA E2E do Bestiário e do card de combatente (TASK_010), em Puppeteer.
 * Executar: node tests/qa_ded_card.test.js
 */
const http = require('http');
const assert = require('assert');
const app = require('../server');

const PORT = 3018;
const BASE = `http://127.0.0.1:${PORT}/ded_make_character/`;

let server;
let browser;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  const puppeteer = (await import('puppeteer')).default;
  server = http.createServer(app).listen(PORT, '127.0.0.1');
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(err.message));
  page.on('dialog', d => d.dismiss());

  const go = async hash => {
    await page.evaluate(h => { location.hash = h; }, hash);
    await sleep(500);
  };
  const text = sel => page.$eval(sel, el => el.textContent.trim());
  const abertos = () => page.$$eval('dialog[open]', ds => ds.map(d => d.className.replace('dialog ', '')));
  const focoEm = sel => page.evaluate(s => document.activeElement?.matches(s), sel);
  const esperaCard = () => page.waitForSelector('.fc-dialog[open]', { timeout: 5000 });
  const semCard = async () => { await sleep(250); assert.deepStrictEqual((await abertos()).filter(c => c.includes('fc-dialog')), []); };
  let passed = 0;
  const step = async (name, fn) => {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  };

  console.log('--- QA Bestiário e card (TASK_010) ---');
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });

  await step('menu: "Bestiário" no Compêndio, depois de Raças, e um tile na página inicial', async () => {
    const grupo = await page.$$eval('.nav__group', gs => gs.map(g => [g.querySelector('.nav__group-label').textContent.trim(), [...g.querySelectorAll('.nav__link span:first-of-type')].map(s => s.textContent.trim())]));
    const compendio = grupo.find(([nome]) => /Compêndio/i.test(nome));
    assert.deepStrictEqual(compendio[1].slice(-2), ['Raças', 'Bestiário']);
    assert.ok(await page.$('.tile[href="#/bestiario"]'), 'tile na página inicial');
    await page.click('.nav__link[data-nav="bestiario"]');
    await sleep(600);
    assert.strictEqual(await page.$eval('.nav__link[data-nav="bestiario"]', e => e.getAttribute('aria-current')), 'page');
    assert.strictEqual(await text('h1'), 'Bestiário');
    assert.match(await page.title(), /Bestiário/);
  });

  await step('galeria: 20 monstros e 54 de Holy Avenger, busca sem acento, faixa de ND e contagem', async () => {
    assert.strictEqual((await page.$$('.bc')).length, 20);
    assert.match(await text('[data-slot="contagem"]'), /^20 fichas$/);
    await page.click('[data-aba="holy"]');
    await sleep(200);
    assert.strictEqual((await page.$$('.bc')).length, 54);
    assert.match(page.url(), /aba=holy/);
    assert.ok(await focoEm('[data-aba="holy"]'), 'o foco fica na aba');
    await page.type('[data-busca]', 'paladao');
    await sleep(300);
    assert.deepStrictEqual(await page.$$eval('.bc__abrir', els => els.map(e => e.firstChild.textContent)).then(l => l.every(n => /Paladino/.test(n))), true, 'a busca sem acento acha Paladino');
    assert.match(page.url(), /q=paladao/);
    await page.$eval('[data-busca]', e => { e.value = ''; e.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.select('[data-nd]', '21+');
    await sleep(200);
    const nds = await page.$$eval('.bc__selo', els => els.map(e => e.textContent));
    assert.ok(nds.length > 5 && nds.every(n => Number(n.replace('ND ', '')) >= 21), 'só ND 21 ou mais');
    assert.match(await text('[data-slot="contagem"]'), /^\d+ de 54 fichas$/);
    await page.select('[data-nd]', '1-5');
    await page.type('[data-busca]', 'zzzz');
    await sleep(250);
    assert.match(await text('.arena-picker__empty'), /Nenhuma ficha/);
  });

  await step('card: abre pelo cartão, com o link, o Esc fecha e o foco volta ao cartão', async () => {
    await go('#/bestiario');
    await page.focus('.bc[data-card="troll"] .bc__abrir');
    await page.keyboard.press('Enter');
    await esperaCard();
    assert.match(page.url(), /ver=troll/);
    assert.strictEqual(await text('.fc-head__nome'), 'Troll');
    assert.strictEqual(await text('.fc-head__selo'), 'ND 5');
    assert.ok(await focoEm('[data-fechar-card]'), 'o foco vai ao Fechar');
    await page.keyboard.press('Escape');
    await semCard();
    assert.doesNotMatch(page.url(), /ver=/);
    assert.ok(await focoEm('.bc[data-card="troll"] .bc__abrir'), 'o foco volta ao cartão');
    // clicar fora (no fundo) também fecha
    await page.click('.bc[data-card="ogro"] .bc__abrir');
    await esperaCard();
    await page.mouse.click(5, 5);
    await semCard();
  });

  await step('card: tem as estatísticas, cada habilidade com a descrição e os números, as magias e os talentos com texto', async () => {
    await go('#/bestiario?ver=troll');
    await esperaCard();
    const secoes = await page.$$eval('.fc-sec__titulo > span', els => els.map(e => e.textContent));
    assert.deepStrictEqual(secoes.slice(0, 2), ['Números', 'Defesas']);
    assert.ok(secoes.includes('Ataques') && secoes.includes('Habilidades') && secoes.includes('Talentos'));
    assert.strictEqual(await page.$$eval('.fc-abil__item', els => els.length), 6);
    const corpo = await text('.fc-dialog__corpo');
    for (const trecho of ['63', '6d8+36', 'Fort +11', 'Rasgar', 'Se as duas garras acertarem', 'Regeneração 5', 'Prontidão', 'Vontade de Ferro', 'Como luta.', 'Fonte.']) assert.ok(corpo.includes(trecho), `falta "${trecho}"`);
    assert.ok(await page.$eval('.fc-nota--fonte a', a => a.target === '_blank' && /noopener/.test(a.rel)), 'link da fonte em outra aba');
    await page.keyboard.press('Escape');
    // um conjurador: cada magia com o resumo e o link do SRD; um talento de Tormenta com o benefício
    await go('#/bestiario?aba=holy&ver=ha-vladislav-tpish');
    await esperaCard();
    const magias = await page.$$eval('.fc-hab__desc', els => els.map(e => e.textContent));
    assert.ok(magias.length > 8, 'as magias e as habilidades têm texto');
    assert.ok(await page.$('.fc-hab__desc a[href^="http://www.dragon.ee/30srd/"]'), 'link do SRD 3.0');
    assert.strictEqual(await page.$$eval('.fc-hab__desc', els => els.filter(e => !e.textContent.trim()).length), 0);
    await page.keyboard.press('Escape');
    await go('#/bestiario?aba=holy&ver=ha-sandro-gladiador');
    await esperaCard();
    assert.match(await text('.fc-dialog__corpo'), /Torcida/);
    assert.match(await text('.fc-dialog__corpo'), /plateia/);
    await page.keyboard.press('Escape');
  });

  await step('link direto: abre o card na aba certa; ver desconhecido avisa e não abre nada', async () => {
    await go('#/bestiario?ver=ha-tarso');
    await esperaCard();
    assert.strictEqual(await text('.fc-head__nome'), 'Tarso');
    assert.strictEqual(await page.$eval('[data-aba="holy"]', e => e.getAttribute('aria-selected')), 'true');
    await page.keyboard.press('Escape');
    await semCard();
    await go('#/bestiario?ver=nao-existe');
    await sleep(300);
    assert.deepStrictEqual(await abertos(), []);
    assert.match(await page.$$eval('.toast__text', els => els.map(e => e.textContent).join(' ')), /Ficha não encontrada/);
    assert.doesNotMatch(page.url(), /ver=/);
  });

  await step('sair do Bestiário com o card aberto não deixa popup órfão nem mexe na URL da página nova', async () => {
    await go('#/bestiario?ver=troll');
    await esperaCard();
    await page.evaluate(() => window.__dmc.router.navigate('/classes'));
    await sleep(500);
    assert.deepStrictEqual(await abertos(), []);
    assert.strictEqual(await page.evaluate(() => location.hash), '#/classes');
  });

  await step('bestiário: card aberto segura o recarregamento de "dados alterados em outra aba" (a rolagem fica; recarrega ao fechar)', async () => {
    await go('#/bestiario?ver=ha-tarso');
    await esperaCard();
    await page.evaluate(() => {
      document.querySelector('.page').dataset.marca = 'antes';
      document.querySelector('.fc-dialog__corpo').scrollTop = 800;
    });
    await page.evaluate(() => window.__dmc.store.handleExternalChange('dmc:v1:talentos'));
    await sleep(400);
    assert.strictEqual((await abertos()).filter(c => c.includes('fc-dialog')).length, 1, 'o card segue aberto');
    assert.strictEqual(await page.$eval('.page', e => e.dataset.marca), 'antes', 'a página não recarregou com o card aberto');
    assert.ok((await page.$eval('.fc-dialog__corpo', e => e.scrollTop)) >= 700, 'a rolagem do card ficou');
    assert.match(await page.$$eval('.toast__text', els => els.map(e => e.textContent).join(' ')), /O Bestiário se atualiza quando você fechar o card/);
    await page.keyboard.press('Escape');
    await sleep(600);
    assert.strictEqual(await page.$eval('.page', e => e.dataset.marca || null), null, 'recarregou ao fechar o card');
    assert.deepStrictEqual(await abertos(), []);
  });

  await step('celular (375 px): card em tela cheia, sem rolagem horizontal, e o Fechar fica visível ao rolar', async () => {
    await page.setViewport({ width: 375, height: 800 });
    await go('#/bestiario');
    assert.ok((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0, 'galeria sem rolagem horizontal');
    await go('#/bestiario?aba=holy&ver=ha-avatar-de-sszzaas');
    await esperaCard();
    const caixa = await page.$eval('.fc-dialog', d => { const r = d.getBoundingClientRect(); return { w: r.width, h: r.height }; });
    assert.ok(caixa.w >= 374 && caixa.h >= 790, `tela cheia (${caixa.w}×${caixa.h})`);
    assert.ok((await page.$eval('.fc-dialog__corpo', e => e.scrollWidth - e.clientWidth)) <= 0, 'o card não rola na horizontal');
    const ordem = await page.$$eval('.fc-sec', els => els.map(e => ({ nome: e.querySelector('.fc-sec__titulo > span').textContent, y: e.getBoundingClientRect().top })).sort((a, b) => a.y - b.y).map(x => x.nome));
    assert.deepStrictEqual(ordem.slice(0, 5), ['Números', 'Defesas', 'Ataques', 'Habilidades', 'Magias'], 'no celular: ataques e habilidades antes dos talentos');
    assert.strictEqual(ordem[5], 'Talentos');
    await page.$eval('.fc-dialog__corpo', e => { e.scrollTop = e.scrollHeight; });
    await sleep(200);
    const fechar = await page.$eval('[data-fechar-card]', e => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; });
    assert.ok(fechar.top >= 0 && fechar.bottom <= 800, 'o Fechar continua à vista com o corpo rolado');
    assert.ok((await page.$$('.fc-hab')).length > 40, 'o card do Avatar de Sszzaas (muitas magias e talentos) está inteiro');
    await page.keyboard.press('Escape');
    await page.setViewport({ width: 1440, height: 900 });
  });

  console.log('--- Arena ---');

  await step('arena: o botão do card ao lado do nome, sem mudar o texto do nome, na lista de cada lado', async () => {
    await go('#/arena?a=ogro*2,p:1&b=troll');
    assert.deepStrictEqual(await page.$$eval('.arena-roster__name', els => els.map(e => e.textContent.trim())), ['Ogro', 'Jonh', 'Troll']);
    assert.deepStrictEqual(await page.$$eval('.arena-roster [data-card]', els => els.map(e => e.getAttribute('aria-label'))), ['Ver o card de Ogro', 'Ver o card de Jonh', 'Ver o card de Troll']);
    assert.strictEqual(await page.$$eval('.arena-roster [data-card]', els => els.filter(e => e.textContent.trim() !== '').length), 0, 'só o ícone, sem texto');
    await page.click('.arena-roster [data-card="troll"]');
    await esperaCard();
    assert.strictEqual(await text('.fc-head__nome'), 'Troll');
    await page.keyboard.press('Escape');
    await semCard();
    assert.ok(await focoEm('.arena-roster [data-card="troll"]'), 'o foco volta ao botão');
  });

  await step('arena: o card do seu personagem mostra como ele luta (equipamento) e abre a ficha completa em outra aba', async () => {
    await page.click('.arena-roster [data-card="p:1"]');
    await esperaCard();
    assert.strictEqual(await text('.fc-head__nome'), 'Jonh');
    assert.match(await text('.fc-head__sub'), /Guerreiro 4 · Humano/);
    assert.strictEqual(await text('.fc-head__selo'), 'Nível 4');
    const corpo = await text('.fc-dialog__corpo');
    for (const trecho of ['Espada longa', 'Arco longo', 'Usar Arma Simples', 'Usar Armadura (leve)', 'concedido pela classe']) assert.ok(corpo.includes(trecho), `falta "${trecho}"`);
    const link = await page.$eval('[data-ficha-completa]', a => ({ href: a.getAttribute('href'), alvo: a.target }));
    assert.match(link.href, /#\/personagens\/1\/ficha$/);
    assert.strictEqual(link.alvo, '_blank');
    await page.keyboard.press('Escape');
    await semCard();
  });

  await step('arena: no seletor o card abre por cima, o Esc fecha só ele e o foco volta ao botão do seletor', async () => {
    await page.click('[data-action="adicionar"][data-lado="B"]');
    await page.waitForSelector('.arena-picker[open]');
    await page.type('[data-busca]', 'dragao');
    await sleep(300);
    await page.click('.arena-picker [data-card="dragao-vermelho-adulto"]');
    await esperaCard();
    assert.deepStrictEqual(await abertos(), ['arena-picker', 'fc-dialog']);
    await page.keyboard.press('Escape');
    await semCard();
    assert.deepStrictEqual(await abertos(), ['arena-picker'], 'o seletor continua aberto');
    assert.ok(await focoEm('.arena-picker [data-card="dragao-vermelho-adulto"]'));
    await page.keyboard.press('Escape');
    await sleep(250);
    assert.deepStrictEqual(await abertos(), []);
  });

  await step('arena: o botão também está na luta, no resultado e no lote, sempre do combatente certo', async () => {
    await go('#/arena?a=ogro&b=troll&semente=7');
    await page.$eval('[data-action="comecar"]', el => el.click());
    await page.waitForSelector('[data-action="fim"]');
    assert.deepStrictEqual(await page.$$eval('.arena-fighter [data-card]', els => els.map(e => e.dataset.card).sort()), ['ogro', 'troll']);
    await page.click('.arena-fighter [data-card="ogro"]');
    await esperaCard();
    assert.strictEqual(await text('.fc-head__nome'), 'Ogro');
    await page.keyboard.press('Escape');
    await semCard();
    await page.$eval('[data-action="fim"]', el => el.click());
    await page.waitForSelector('.arena-stat');
    assert.deepStrictEqual(await page.$$eval('.arena-stat [data-card]', els => els.map(e => e.dataset.card).sort()), ['ogro', 'troll']);
    assert.deepStrictEqual(await page.$$eval('.arena-stat__name', els => els.map(e => e.textContent.replace(/Lado [AB]: /, '').replace(/^[AB]/, '').trim()).sort()), ['Ogro', 'Troll'], 'o texto do nome não muda');
    await page.$eval('[data-action="montagem"]', el => el.click());
    await sleep(300);
    await page.$eval('[data-action="lote"][data-vezes="100"]', el => el.click());
    await page.waitForSelector('#arena-lote-res', { timeout: 60000 });
    assert.deepStrictEqual(await page.$$eval('.arena-lote__quedas [data-card]', els => els.map(e => e.dataset.card).sort()), ['ogro', 'troll']);
    // a montagem muda depois do lote: o botão do resultado antigo continua apontando para quem lutou
    await page.$eval('[data-qtd="1"][data-lado="A"]', el => el.click());
    await sleep(200);
    assert.deepStrictEqual(await page.$$eval('.arena-lote__quedas [data-card]', els => els.map(e => e.dataset.card).sort()), ['ogro', 'troll']);
  });

  await step('arena: card aberto segura o aviso de "dados alterados em outra aba" (a recarga acontece ao fechar)', async () => {
    await go('#/arena?a=ogro&b=troll');
    await page.evaluate(() => { document.querySelector('.page').dataset.marca = 'antes'; });
    await page.click('.arena-roster [data-card="ogro"]');
    await esperaCard();
    await page.evaluate(() => window.__dmc.store.handleExternalChange('dmc:v1:personagens'));
    await sleep(400);
    assert.deepStrictEqual((await abertos()).filter(c => c.includes('fc-dialog')), ['fc-dialog'], 'o card segue aberto');
    assert.strictEqual(await page.$eval('.page', e => e.dataset.marca), 'antes', 'a página não recarregou com o card aberto');
    await page.keyboard.press('Escape');
    await sleep(600);
    assert.strictEqual(await page.$eval('.page', e => e.dataset.marca || null), null, 'recarregou ao fechar o card');
    assert.deepStrictEqual(await abertos(), []);
  });

  await step('arena: sair da página com o card aberto não deixa popup órfão', async () => {
    await page.click('.arena-roster [data-card="troll"]');
    await esperaCard();
    await page.evaluate(() => window.__dmc.router.navigate('/'));
    await sleep(500);
    assert.deepStrictEqual(await abertos(), []);
  });

  await step('arena @375px: o botão cabe ao lado do nome, sem rolagem horizontal, e o card abre em tela cheia', async () => {
    await page.setViewport({ width: 375, height: 800 });
    await go('#/arena?a=ogro,p:1&b=troll');
    assert.ok((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0, 'sem rolagem horizontal');
    const alvo = await page.$eval('.arena-roster [data-card="troll"]', e => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height }; });
    assert.ok(alvo.w >= 24 && alvo.h >= 24, `alvo de toque (${alvo.w}×${alvo.h})`);
    await page.click('.arena-roster [data-card="p:1"]');
    await esperaCard();
    assert.ok((await page.$eval('.fc-dialog__corpo', e => e.scrollWidth - e.clientWidth)) <= 0);
    await page.keyboard.press('Escape');
    await page.setViewport({ width: 1440, height: 900 });
  });

  await step('teclado: setas, Home e End trocam de aba; os títulos seguem a hierarquia (h1, h2 nos cartões, h3 nas subseções do card)', async () => {
    await go('#/bestiario');
    await page.focus('[data-aba="monstros"]');
    await page.keyboard.press('End');
    await sleep(200);
    assert.strictEqual(await page.$eval('[data-aba="holy"]', e => e.getAttribute('aria-selected')), 'true');
    assert.ok(await focoEm('[data-aba="holy"]'));
    await page.keyboard.press('Home');
    await sleep(200);
    assert.strictEqual(await page.$eval('[data-aba="monstros"]', e => e.getAttribute('aria-selected')), 'true');
    assert.deepStrictEqual(await page.$$eval('main h1, main h2, main h3', els => [...new Set(els.map(e => e.tagName))]), ['H1', 'H2'], 'a galeria: h1 e h2, sem h3');
    await page.click('.bc[data-card="troll"] .bc__abrir');
    await esperaCard();
    assert.deepStrictEqual(await page.$$eval('.fc-dialog h1, .fc-dialog h2, .fc-dialog h3, .fc-dialog h4', els => [...new Set(els.map(e => e.tagName))]), ['H2', 'H3'], 'o card: h2 e h3, sem salto');
    assert.strictEqual(await page.$eval('.bc[data-card="troll"] .bc__abrir', e => e.textContent), 'Troll', 'o nome do botão é só o nome');
    await page.keyboard.press('Escape');
    await semCard();
  });

  await step('popup: soltar o mouse fora depois de selecionar texto dentro não fecha o card; clicar de fato no fundo fecha', async () => {
    await go('#/bestiario?ver=troll');
    await esperaCard();
    const alvo = await page.$eval('.fc-lore', e => { const r = e.getBoundingClientRect(); return { x: r.x + 20, y: r.y + r.height / 2 }; });
    await page.mouse.move(alvo.x, alvo.y);
    await page.mouse.down();
    await page.mouse.move(5, 5, { steps: 6 });
    await page.mouse.up();
    await sleep(250);
    assert.strictEqual((await abertos()).filter(c => c.includes('fc-dialog')).length, 1, 'o card continua aberto');
    await page.mouse.click(5, 5);
    await semCard();
  });

  await step('glossário que não carrega: o card abre sem os textos de apoio, e o aviso aparece dentro dele (não atrás)', async () => {
    const outra = await browser.newPage();
    await outra.setViewport({ width: 1440, height: 900 });
    await outra.setRequestInterception(true);
    outra.on('request', req => (/glossario-combate\.json/.test(req.url()) ? req.abort() : req.continue()));
    await outra.goto(`${BASE}#/bestiario?aba=holy&ver=ha-vladislav-tpish`, { waitUntil: 'networkidle0' });
    await outra.waitForSelector('.fc-dialog[open]', { timeout: 5000 });
    assert.match(await outra.$eval('.fc-aviso--topo', e => e.textContent), /Não deu para carregar as descrições/);
    assert.ok(await outra.$('.fc-aviso:not(.fc-aviso--topo)'), 'o aviso da página também fica');
    assert.ok(await outra.$$eval('.fc-hab', els => els.length > 5), 'o card traz o que o catálogo tem');
    assert.strictEqual(await outra.$$eval('.fc-hab__magia', els => els.length), 0, 'sem os resumos das magias');
    // a Arena: o mesmo aviso dentro do card
    await outra.goto(`${BASE}#/arena?a=ogro&b=troll`, { waitUntil: 'networkidle0' });
    await outra.waitForSelector('.arena-roster [data-card="troll"]', { timeout: 5000 });
    await outra.click('.arena-roster [data-card="troll"]');
    await outra.waitForSelector('.fc-dialog[open]', { timeout: 5000 });
    assert.match(await outra.$eval('.fc-aviso--topo', e => e.textContent), /Não deu para carregar/);
    await outra.close();
  });

  await step('arena: lote com vários por lado: cada botão aponta para o combatente certo', async () => {
    await go('#/arena?a=ogro*2,troll&b=carnical*3');
    await page.$eval('[data-action="lote"][data-vezes="100"]', el => el.click());
    await page.waitForSelector('#arena-lote-res', { timeout: 60000 });
    const botoes = await page.$$eval('.arena-lote__quedas li', els => els.map(li => ({ nome: li.querySelector('.arena-lote__quem').textContent.replace(/Lado [AB]: /, '').trim(), ref: li.querySelector('[data-card]').dataset.card })));
    assert.strictEqual(botoes.length, 6);
    for (const b of botoes) assert.strictEqual(b.nome.replace(/ \d+$/, '').toLowerCase().replace('á', 'a').replace('ç', 'c'), { ogro: 'ogro', troll: 'troll', carnical: 'carnical' }[b.ref] || b.ref, `${b.nome} → ${b.ref}`);
  });

  await step('nenhum erro de console durante a jornada', async () => {
    assert.deepStrictEqual(consoleErrors, [], JSON.stringify(consoleErrors));
  });

  console.log(`\n${passed} verificações passaram.`);
}

run()
  .catch(err => {
    console.error('❌ FALHA:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    if (server) server.close();
  });
