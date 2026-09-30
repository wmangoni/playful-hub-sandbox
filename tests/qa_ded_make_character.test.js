/**
 * QA E2E do D&D Make Character (Puppeteer).
 * Executar: node tests/qa_ded_make_character.test.js
 */
const http = require('http');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const app = require('../server');

const PORT = 3017;
const BASE = `http://127.0.0.1:${PORT}/ded_make_character/`;
const DATA_DIR = path.join(__dirname, '..', 'ded_make_character', 'data');

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

  const racesOriginal = fs.readFileSync(path.join(DATA_DIR, 'races.json'), 'utf8');
  const go = async hash => {
    await page.evaluate(h => { location.hash = h; }, hash);
    await sleep(350);
  };
  const text = sel => page.$eval(sel, el => el.textContent.trim());
  // Clique via DOM: toasts de passos anteriores podem cobrir botões no canto inferior.
  const domClick = sel => page.$eval(sel, el => el.click());
  const rowCount = () => page.$$eval('.data-table tbody tr[data-id]', rows => rows.length);
  const storageKeys = () => page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('dmc:')));
  let passed = 0;
  const step = async (name, fn) => {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  };

  console.log('--- QA D&D Make Character ---');
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });

  await step('rota SEO /jogos/ded_make_character responde 200', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/jogos/ded_make_character`);
    assert.strictEqual(res.status, 200);
    assert.match(await res.text(), /ded_make_character/);
  });

  await step('home carrega com contagens do banco original e sem escrever no storage', async () => {
    assert.match(await text('h1'), /Bem-vindo ao D&D Make Character!/);
    const counts = await page.$$eval('.tile__count', els => els.map(e => e.textContent.trim()));
    assert.deepStrictEqual(counts, ['1 registro', '15 registros', '320 registros', '45 registros', '7 registros']);
    assert.deepStrictEqual(await storageKeys(), []);
  });

  await step('listas: contagens e paginação (20 por página, num_links do original)', async () => {
    await go('#/classes');
    assert.strictEqual(await rowCount(), 15);
    assert.strictEqual(await page.$('.pagination__list'), null, 'sem links com 15 registros');
    await go('#/pericias');
    assert.strictEqual(await rowCount(), 20);
    await go('#/talentos?pagina=7');
    assert.strictEqual(await rowCount(), 20);
    const numbers = await page.$$eval('.pagination__list .page-link', els => els.map(e => e.textContent.trim()).filter(Boolean));
    assert.deepStrictEqual(numbers, ['6', '7', '8', '9'], 'num_links=2 em talentos');
    assert.match(await text('.pagination__info'), /Página 7 de 16/);
    await go('#/talentos?pagina=16');
    assert.strictEqual(await rowCount(), 20, '246 do dump + 74 do Livro do Jogador 3.0 = 320');
  });

  await step('talentos ordenados por nome (ORDER BY nome ASC)', async () => {
    await go('#/talentos');
    const names = await page.$$eval('.data-table tbody .cell-title', els => els.map(e => e.textContent.trim()));
    const sorted = [...names].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    assert.deepStrictEqual(names, sorted);
  });

  await step('busca por "todos os campos" e por coluna, sem acento', async () => {
    await go('#/talentos');
    await page.type('#search-term', 'dracon');
    await sleep(400);
    const found = await page.$$eval('.data-table tbody .cell-title', els => els.map(e => e.textContent.trim()));
    assert.ok(found.length > 0 && found.some(n => /DRAC/.test(n)), 'encontra por nome ou tipo sem acento');
    await page.select('#search-field', 'tipo');
    await sleep(300);
    const tipos = await page.$$eval('.data-table tbody tr[data-id] td:nth-child(3)', els => els.map(e => e.textContent));
    assert.ok(tipos.every(t => /DRAC[ÔO]NICO/i.test(t)), 'filtrado apenas pela coluna Tipo');
    assert.match(page.url(), /campo=tipo/);
    assert.match(page.url(), /q=dracon/);
    await page.click('[data-action="clear-search"]');
    await sleep(300);
    assert.strictEqual(await rowCount(), 20);
  });

  await step('classes: linha expansível mostra os pré-requisitos', async () => {
    await go('#/classes');
    const toggle = await page.$('tr[data-id="13"] .row-toggle');
    await toggle.click();
    const detail = await page.$eval('#row-detail-classes-13', el => ({ hidden: el.hidden, text: el.textContent }));
    assert.strictEqual(detail.hidden, false);
    assert.match(detail.text, /Ataque Poderoso, Trespassar/);
  });

  await step('validação: obrigatórios do original bloqueiam o envio', async () => {
    await go('#/racas/novo');
    await page.click('button[type="submit"]');
    await sleep(150);
    const invalid = await page.$$eval('.field[data-invalid="true"]', els => els.map(e => e.dataset.field));
    assert.deepStrictEqual(invalid.sort(), ['classe_favorecida', 'nome', 'tamanho']);
    assert.strictEqual(await page.$eval('.form-summary', el => el.dataset.visible), 'true');
    assert.deepStrictEqual(await storageKeys(), []);
  });

  await step('criar raça: copia a tabela para o localStorage e usa o AUTO_INCREMENT (id 8)', async () => {
    await page.type('input[name="nome"]', 'Tiefling');
    await page.select('select[name="tamanho"]', 'Médio');
    await page.select('select[name="classe_favorecida"]', '11');
    await page.type('input[name="bonus"]', '2');
    await page.select('select[name="atributo_bonus"]', 'INT');
    await page.click('button[type="submit"]');
    await sleep(600);
    assert.match(page.url(), /#\/racas\?destaque=8/);
    assert.strictEqual(await rowCount(), 8);
    const row = await page.$eval('tr[data-id="8"]', el => el.textContent);
    assert.match(row, /Tiefling/);
    assert.match(row, /\+2\s*INT/);
    assert.match(row, /Mago/);
    assert.deepStrictEqual(await storageKeys(), ['dmc:v1:races']);
    assert.match(await text('.source-pill'), /Cópia local/);
    assert.strictEqual(fs.readFileSync(path.join(DATA_DIR, 'races.json'), 'utf8'), racesOriginal, 'JSON original intacto');
    const served = await (await fetch(`${BASE}data/races.json`)).json();
    assert.strictEqual(served.rows.length, 7, 'servidor continua entregando o original');
  });

  await step('editar raça preserva a classe favorecida e casa "Medio" legado com "Médio"', async () => {
    await go('#/racas/2/editar');
    assert.strictEqual(await page.$eval('select[name="tamanho"]', el => el.value), 'Médio');
    assert.strictEqual(await page.$eval('select[name="classe_favorecida"]', el => el.value), '__null__');
    await page.$eval('input[name="nome"]', el => { el.value = ''; });
    await page.type('input[name="nome"]', 'Anão da Montanha');
    await page.click('button[type="submit"]');
    await sleep(600);
    const row = await page.$eval('tr[data-id="2"]', el => el.textContent);
    assert.match(row, /Anão da Montanha/);
    assert.match(row, /Qualquer uma/);
  });

  await step('excluir pede confirmação e remove da cópia local', async () => {
    await go('#/racas');
    await domClick('tr[data-id="7"] [data-action="delete"]');
    await sleep(200);
    assert.ok(await page.$('dialog[open]'));
    await page.click('dialog [value="cancel"]');
    await sleep(200);
    assert.strictEqual(await rowCount(), 8, 'cancelar não exclui');
    await domClick('tr[data-id="7"] [data-action="delete"]');
    await sleep(200);
    await page.click('dialog [value="confirm"]');
    await sleep(600);
    assert.strictEqual(await rowCount(), 7);
    assert.strictEqual(await page.$('tr[data-id="7"]'), null);
  });

  await step('classes: painel Requisitos aparece só quando o tipo não é Básica', async () => {
    await go('#/classes/novo');
    const hidden = () => page.$eval('[data-field="requisitos"]', el => el.hidden);
    assert.strictEqual(await hidden(), true);
    await page.select('select[name="tipo"]', 'Prestígio');
    await sleep(100);
    assert.strictEqual(await hidden(), false);
    await page.select('select[name="tipo"]', 'Básica');
    await sleep(100);
    assert.strictEqual(await hidden(), true);
    await page.select('select[name="tipo"]', 'Épica');
    await sleep(100);
    assert.strictEqual(await hidden(), false);
  });

  await step('guarda de alterações não salvas ao sair do formulário', async () => {
    await page.type('input[name="nome"]', 'Cavaleiro Rúnico');
    await page.evaluate(() => { location.hash = '#/classes'; });
    await sleep(300);
    assert.ok(await page.$('dialog[open]'), 'pergunta antes de descartar');
    await page.click('dialog [value="cancel"]');
    await sleep(300);
    assert.match(page.url(), /#\/classes\/novo/);
    assert.strictEqual(await page.$eval('input[name="nome"]', el => el.value), 'Cavaleiro Rúnico');
    await page.select('select[name="dv"]', '10');
    await page.select('select[name="bba_tipo"]', 'bom');
    await page.select('select[name="resistencia"]', 'fort/von');
    await page.type('textarea[name="requisitos"]', 'BBA +6');
    await page.click('button[type="submit"]');
    await sleep(600);
    assert.match(page.url(), /destaque=16/, 'primeira classe criada recebe id 16');
  });

  await step('módulos removidos (Usuários e Tipos de Requisito) não aparecem e as rotas antigas dão 404', async () => {
    const nav = await page.$$eval('[data-nav]', els => els.map(e => e.dataset.nav));
    assert.ok(!nav.includes('usuarios') && !nav.includes('tipos-requisito'), `menu: ${nav}`);
    for (const hash of ['#/usuarios', '#/tipos-requisito']) {
      await go(hash);
      assert.match(await page.$eval('.page', el => el.textContent), /Esta trilha não leva a lugar algum/, hash);
    }
  });

  await step('formulário sujo: "Descartar" libera a navegação sem gravar nada', async () => {
    await go('#/racas/novo');
    await page.type('input[name="nome"]', 'Draconato');
    await page.evaluate(() => { location.hash = '#/'; });
    await sleep(300);
    assert.ok(await page.$('dialog[open]'));
    await page.click('dialog [value="confirm"]');
    await sleep(500);
    assert.match(page.url(), /#\/$/);
    const races = await page.evaluate(() => JSON.parse(localStorage.getItem('dmc:v1:races') || '{"rows":[]}').rows.map(r => r.nome));
    assert.ok(!races.includes('Draconato'), 'nada gravado ao descartar');
  });

  await step('perícias: flags de classe gravam 0/1', async () => {
    await go('#/pericias/1/editar');
    await page.click('input[name="lad"]');
    await page.click('button[type="submit"]');
    await sleep(600);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('dmc:v1:pericias')).rows.find(r => r.id === 1));
    assert.strictEqual(stored.lad, 1);
    assert.strictEqual(stored.pal, 1);
    assert.strictEqual(stored.bar, 0);
  });

  await step('ficha: "Salvar e gerar ficha" grava o personagem e abre a ficha calculada pela 3.0', async () => {
    await go('#/personagens/novo');
    for (const [name, value] of Object.entries({ nome: 'Thora', divindade: 'Moradin', nivel: '5', idade: '80', altura: '1.30', peso: '70', olhos: 'cinza', cabelos: 'negros', for: '14', des: '10', con: '14', int: '10', sab: '17', car: '12', iniciativa: '0', pvs: '38' })) {
      await page.type(`[name="${name}"]`, value);
    }
    await page.select('select[name="race_id"]', '2');
    await page.select('select[name="classe_id"]', '3');
    await page.select('select[name="tendencia"]', 'LB');
    await page.select('select[name="sexo"]', 'F');
    await domClick('button[data-intent="sheet"]');
    await sleep(900);
    assert.match(page.url(), /#\/personagens\/2\/ficha$/);
    assert.ok((await storageKeys()).includes('dmc:v1:personagens'));
    assert.strictEqual(await page.$$eval('.sf-page', els => els.length), 2);
    const sheet = await page.evaluate(() => {
      const t = sel => document.querySelector(sel)?.textContent.trim();
      const row = lvl => [...document.querySelectorAll('.sf-spell-table tbody tr')][lvl].querySelectorAll('.sf-cell__box');
      return {
        title: document.title,
        pv: t('.sf-row--hp .is-total .sf-cell__box'),
        ca: t('.sf-row--ac .is-total .sf-cell__box'),
        bab: t('.is-bab .sf-cell__box'),
        speed: t('.sf-speed .sf-cell__box'),
        con: [...document.querySelectorAll('.sf-ability')][2].querySelector('.sf-score').firstChild.textContent,
        fort: t('.sf-save .is-total'),
        spell1: [...row(1)].map(b => b.textContent.trim()),
        overflow: [...document.querySelectorAll('.sf-page')].some(p => p.scrollHeight > p.clientHeight + 1),
      };
    });
    assert.deepStrictEqual(sheet, {
      title: 'Ficha de Thora · D&D Make Character',
      pv: '38', ca: '10', bab: '+3', speed: '6 m', con: '16', fort: '+7',
      spell1: ['14', '3+1', '1'], // CD 10+1+Sab 3; 3 do clérigo 5º + 1 de domínio; 1 adicional (Sab 17)
      overflow: false,
    });
  });

  await step('popup: pontos de perícia, limites e exclusivas da anã clériga 5', async () => {
    assert.ok(await page.$('dialog.choices[open]'), '"Salvar e gerar ficha" abre o popup');
    assert.match(page.url(), /#\/personagens\/2\/ficha$/, 'a query ?escolher some da URL');
    const badge = tab => page.$eval(`dialog.choices [data-tab="${tab}"] .choices__badge`, el => el.textContent.trim());
    assert.match(await text('dialog.choices .choices__who'), /Thora · Clérigo 5º nível · Anão/);
    assert.strictEqual(await badge('pericias'), '16 de 16 pontos', '(2 + Int 0) × 4 + 2 × 4');
    const setRank = (nome, value) => page.evaluate(({ nome, value }) => {
      const input = document.querySelector(`dialog.choices input[aria-label="Graduações em ${nome}"]`);
      input.value = value;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, { nome, value });
    await setRank('Concentração', 8);
    await setRank('Cura', 12); // acima do máximo (8): fica em 8
    assert.strictEqual(await page.$eval('dialog.choices input[aria-label="Graduações em Cura"]', el => el.value), '8');
    assert.strictEqual(await badge('pericias'), '0 de 16 pontos');
    await domClick('dialog.choices button[aria-label="Aumentar Blefar"]');
    assert.strictEqual(await page.$eval('dialog.choices input[aria-label="Graduações em Blefar"]', el => el.value), '0.5', 'outra classe: meia graduação');
    assert.match(await text('dialog.choices .choices__status'), /acima do disponível/);
    assert.strictEqual(await page.$eval('dialog.choices [data-action="save"]', el => el.disabled), true);
    await domClick('dialog.choices button[aria-label="Diminuir Blefar"]');
    assert.strictEqual(await page.$eval('dialog.choices input[aria-label="Graduações em Decifrar Escrita"]', el => el.disabled), true, 'exclusiva de bardo/ladino');
    assert.match(await text('dialog.choices .choices__status'), /Escolhas válidas/);
  });

  await step('popup: talentos com requisitos, vagas e salvar na ficha', async () => {
    await domClick('dialog.choices [data-tab="talentos"]');
    await sleep(150);
    assert.strictEqual(await page.$eval('dialog.choices [data-tab="talentos"] .choices__badge', el => el.textContent.trim()), '2 de 2 vagas livres', 'gerais no 1º e no 3º nível');
    await page.select('dialog.choices select[data-action="filtro"]', 'todos');
    await page.type('dialog.choices input[data-action="busca"]', 'trespassar');
    await sleep(200);
    const trespassar = await page.$$eval('dialog.choices .feat', els => els.map(el => ({ nome: el.querySelector('.feat__name').textContent.trim(), disabled: el.querySelector('input[type="checkbox"]').disabled, status: el.querySelector('.feat__line').textContent.trim() })).find(f => f.nome === 'Trespassar'));
    assert.deepStrictEqual(trespassar, { nome: 'Trespassar', disabled: true, status: 'falta: Ataque Poderoso' });
    await page.$eval('dialog.choices input[data-action="busca"]', el => { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.select('dialog.choices select[data-action="filtro"]', 'elegiveis');
    const pick = nome => page.evaluate(nome => {
      const li = [...document.querySelectorAll('dialog.choices .feat')].find(el => el.querySelector('.feat__name').textContent.trim() === nome);
      li.querySelector('input[type="checkbox"]').click();
    }, nome);
    await pick('Expulsão Adicional');
    await pick('Magias em Combate');
    await sleep(150);
    assert.strictEqual(await page.$eval('dialog.choices [data-tab="talentos"] .choices__badge', el => el.textContent.trim()), '0 de 2 vagas livres');
    await domClick('dialog.choices [data-action="save"]');
    await sleep(700);
    assert.strictEqual(await page.$('dialog.choices'), null, 'popup fechado');
    assert.ok((await storageKeys()).includes('dmc:v1:fichas'));
    const sheet = await page.evaluate(() => ({
      talentos: [...document.querySelectorAll('.sf-ruled__text li')].slice(0, 2).map(li => li.textContent.trim()),
      concentracao: [...document.querySelectorAll('.sf-skill')].find(li => /concentração/i.test(li.textContent)).querySelectorAll('.sf-skill__box')[0].textContent.trim(),
      graduacoes: [...document.querySelectorAll('.sf-skill')].find(li => /concentração/i.test(li.textContent)).querySelectorAll('.sf-skill__box')[2].textContent.trim(),
    }));
    assert.deepStrictEqual(sheet, { talentos: ['Talento: Expulsão Adicional · 1º', 'Talento: Magias em Combate · 3º'], concentracao: '+11', graduacoes: '8' }, 'um talento por linha, na ordem das vagas; Con 16 (+3) + 8 graduações');
  });

  await step('popup: reabre com as escolhas salvas; Cancelar com alterações pede confirmação', async () => {
    await domClick('[data-action="choices"]');
    await sleep(300);
    assert.strictEqual(await page.$eval('dialog.choices input[aria-label="Graduações em Concentração"]', el => el.value), '8');
    await domClick('dialog.choices button[aria-label="Diminuir Concentração"]');
    await domClick('dialog.choices [data-action="cancel"]');
    await sleep(250);
    assert.ok(await page.$('dialog.dialog:not(.choices)[open]'), 'confirmação de descarte');
    await page.click('dialog.dialog:not(.choices) [value="confirm"]');
    await sleep(300);
    assert.strictEqual(await page.$('dialog.choices'), null);
    const graduacoes = await page.evaluate(() => [...document.querySelectorAll('.sf-skill')].find(li => /concentração/i.test(li.textContent)).querySelectorAll('.sf-skill__box')[2].textContent.trim());
    assert.strictEqual(graduacoes, '8', 'nada foi salvo');
  });

  await step('ficha: escolhas que deixaram de valer são apontadas; excluir o personagem apaga as escolhas', async () => {
    // rebaixada ao 1º nível, a anã clériga não pode ter 8 graduações (máximo 4) nem um talento do 3º nível
    await page.evaluate(() => window.__dmc.store.update('personagens', 2, { nivel: 1 }));
    await go('#/personagens');
    await go('#/personagens/2/ficha');
    await sleep(300);
    const notes = await page.$eval('.sheet-toolbar__notes', el => el.textContent);
    assert.match(notes, /As escolhas salvas não valem mais para este personagem/);
    assert.match(notes, /Concentração: no máximo 4 graduações/);
    assert.ok(await page.$('[data-action="choices"].is-alert'), 'botão Talentos e perícias em alerta');
    assert.ok(await page.$('.sf-page--one .sf-foot__warn'), 'a ficha impressa também sai marcada "a revisar"');
    await page.evaluate(() => window.__dmc.store.update('personagens', 2, { nivel: 5 }));
    // um personagem novo, com escolhas, excluído pela lista: a ficha dele some de "fichas"
    const temp = await page.evaluate(async () => {
      const p = await window.__dmc.store.insert('personagens', { nome: 'Temporário', race_id: 1, classe_id: 5, nivel: 1, for: 10, des: 10, con: 10, int: 10, sab: 10, car: 10, iniciativa: 0, pvs: 10 });
      await window.__dmc.store.insert('fichas', { personagem_id: p.id, pericias: {}, talentos: [], atualizado_em: new Date().toISOString() });
      return p.id;
    });
    await go('#/personagens');
    await domClick(`tr[data-id="${temp}"] [data-action="delete"]`);
    await sleep(250);
    await page.click('dialog [value="confirm"]');
    await sleep(600);
    const orphans = await page.evaluate(async id => (await window.__dmc.store.all('fichas')).filter(f => f.personagem_id === id).length, temp);
    assert.strictEqual(orphans, 0);
  });

  await step('ficha: link na lista, impressão e ids/módulos sem ficha', async () => {
    await go('#/personagens');
    await domClick('tr[data-id="1"] a[href="#/personagens/1/ficha"]');
    await sleep(600);
    assert.strictEqual(await page.$('dialog.choices'), null, 'o link Ficha não abre o popup');
    assert.match(await page.$eval('.sf-field__value', el => el.textContent), /Jonh/);
    await page.evaluate(() => { window.__prints = 0; window.print = () => { window.__prints++; }; });
    await domClick('[data-action="print"]');
    assert.strictEqual(await page.evaluate(() => window.__prints), 1);
    await go('#/personagens/999/ficha');
    assert.match(await page.$eval('.page', el => el.textContent), /Personagem não encontrado/);
    await go('#/classes/1/ficha');
    assert.match(await page.$eval('.page', el => el.textContent), /Esta trilha não leva a lugar algum/);
  });

  await step('ficha: editar → "Salvar e gerar ficha" recalcula; "Ver ficha" abre sem salvar', async () => {
    await go('#/personagens/2/editar');
    await page.$eval('input[name="pvs"]', el => { el.value = ''; });
    await page.type('input[name="pvs"]', '41');
    await domClick('button[data-intent="sheet"]');
    await sleep(900);
    assert.match(page.url(), /#\/personagens\/2\/ficha$/);
    assert.strictEqual(await text('.sf-row--hp .is-total .sf-cell__box'), '41');
    assert.strictEqual(await page.$eval('dialog.choices input[aria-label="Graduações em Cura"]', el => el.value), '8', 'popup abre com as escolhas salvas');
    await domClick('dialog.choices [data-action="cancel"]');
    await sleep(250);
    assert.strictEqual(await page.$('dialog.choices'), null, 'sem alterações, Cancelar fecha direto');
    // Jonh (seed) tem divindade nula e não passa na validação do legado; o link abre a ficha mesmo assim.
    await go('#/personagens/1/editar');
    await domClick('a[href="#/personagens/1/ficha"]');
    await sleep(600);
    assert.match(page.url(), /#\/personagens\/1\/ficha$/);
    assert.strictEqual(await page.$$eval('.sf-page', els => els.length), 2);
  });

  await step('ficha: nenhum bloco transborda nem invade outro em perfis variados', async () => {
    const base = { divindade: 'X', idade: 30, sexo: 'F', altura: 1.5, peso: 60, olhos: 'verdes', cabelos: 'ruivos', tendencia: 'N', iniciativa: 0 };
    const perfis = [
      { nome: 'Nome muito longo de uma personagem para testar o ajuste do campo de identificação', race_id: 7, classe_id: 6, nivel: 6, for: 12, des: 16, con: 12, int: 10, sab: 15, car: 8, pvs: 33 },
      { nome: 'Bard', race_id: 4, classe_id: 2, nivel: 14, for: 10, des: 14, con: 12, int: 12, sab: 10, car: 18, pvs: 60 },
      { nome: 'Druida', race_id: 3, classe_id: 4, nivel: 18, for: 10, des: 14, con: 12, int: 12, sab: 20, car: 10, pvs: 90 },
      { nome: 'Algoz', race_id: 6, classe_id: 13, nivel: 25, for: 16, des: 10, con: 14, int: 8, sab: 12, car: 14, pvs: 80 },
      { nome: 'Sem raça', race_id: 99, classe_id: 99, nivel: 3, for: 10, des: 10, con: 10, int: 10, sab: 10, car: 10, pvs: 12 },
      { nome: 'Monge anão 20 (a lista mais longa de habilidades especiais)', race_id: 2, classe_id: 6, nivel: 20, for: 14, des: 16, con: 14, int: 10, sab: 18, car: 8, pvs: 150 },
    ];
    const ids = [];
    for (const p of perfis) ids.push((await page.evaluate(row => window.__dmc.store.insert('personagens', row), { ...base, ...p })).id);
    // o monge anão 20 recebe 7 talentos válidos: a lista mais longa de Habilidades especiais
    await page.evaluate(async personagemId => {
      const talentos = await window.__dmc.store.all('talentos');
      const nomes = ['ESQUIVA', 'MOBILIDADE', 'ATAQUE EM MOVIMENTO', 'REFLEXOS DE COMBATE', 'INICIATIVA APRIMORADA', 'VONTADE DE FERRO', 'VITALIDADE'];
      const escolhidos = nomes.map(n => ({ talento_id: talentos.find(t => t.nome === n).id, parametro: null }));
      await window.__dmc.store.insert('fichas', { personagem_id: personagemId, pericias: {}, talentos: escolhidos, atualizado_em: new Date().toISOString() });
    }, ids[5]);
    for (const id of ids) {
      await go(`#/personagens/${id}/ficha`);
      await sleep(250);
      const problems = await page.evaluate(() => {
        const out = [];
        for (const pg of document.querySelectorAll('.sf-page')) if (pg.scrollHeight > pg.clientHeight + 1) out.push(`página transborda (${pg.scrollHeight})`);
        const ruled = document.querySelector('.sf-ruled');
        if (ruled.querySelector('.sf-ruled__text').scrollHeight > ruled.clientHeight + 1) out.push('habilidades especiais cortadas');
        // as três colunas da página 2 cabem (Idiomas não passa do rodapé)
        document.querySelectorAll('.sf-p2__col').forEach((col, i) => {
          if (col.scrollHeight > col.clientHeight + 1) out.push(`coluna ${i + 1} da página 2 transborda (${col.scrollHeight - col.clientHeight}px)`);
        });
        const foot = document.querySelector('.sf-page--two .sf-foot').getBoundingClientRect();
        const lastLang = [...document.querySelectorAll('.sf-page--two .sf-written li')].at(-1).getBoundingClientRect();
        if (lastLang.bottom > foot.top + 1) out.push('Idiomas invade o rodapé da página 2');
        // cada área da grade (página 1) ocupa só o próprio retângulo
        const areas = [...document.querySelectorAll('.sf-p1 > *')].map(area => {
          const r = area.getBoundingClientRect();
          const box = { l: r.left, t: r.top, r: r.right, b: r.bottom };
          for (const el of area.querySelectorAll('*')) {
            const e = el.getBoundingClientRect();
            if (!e.width || !e.height) continue;
            box.l = Math.min(box.l, e.left); box.t = Math.min(box.t, e.top); box.r = Math.max(box.r, e.right); box.b = Math.max(box.b, e.bottom);
          }
          return { name: area.className, box };
        });
        for (let i = 0; i < areas.length; i++) {
          for (let j = i + 1; j < areas.length; j++) {
            const a = areas[i].box;
            const b = areas[j].box;
            const overlap = Math.min(a.r, b.r) - Math.max(a.l, b.l) > 1 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 1;
            if (overlap) out.push(`${areas[i].name} × ${areas[j].name}`);
          }
        }
        return out;
      });
      assert.deepStrictEqual(problems, [], `personagem ${id}`);
    }
    await go(`#/personagens/${ids[4]}/ficha`);
    const notes = await page.$eval('.sheet-toolbar__notes', el => el.textContent);
    assert.match(notes, /Raça e classe ausentes: os valores que dependem delas ficaram em branco/);
    await go(`#/personagens/${ids[3]}/ficha`);
    assert.match(await page.$eval('.sheet-toolbar__notes', el => el.textContent), /fora da faixa do Livro do Jogador \(1º a 20º\): a ficha foi calculada para o 20º nível/);
    const nivelZero = await page.evaluate(row => window.__dmc.store.insert('personagens', row), { ...base, ...perfis[0], nome: 'Nível zero', nivel: 0 });
    await go(`#/personagens/${nivelZero.id}/ficha`);
    assert.match(await page.$eval('.sheet-toolbar__notes', el => el.textContent), /O nível cadastrado \(0\) está fora da faixa/);
    const monge = await page.evaluate(row => window.__dmc.store.insert('personagens', row), { ...base, ...perfis[0], nome: 'Monge 20', race_id: 2, nivel: 20 });
    await go(`#/personagens/${monge.id}/ficha`);
    assert.deepStrictEqual(await page.evaluate(() => ['redução de dano', 'resist. à magia'].map(label => {
      const box = [...document.querySelectorAll('.sf-cell')].find(c => c.querySelector('small')?.textContent === label);
      return box.querySelector('.sf-cell__box').textContent.trim();
    })), ['20/+1', '30'], 'RD e RM do monge 20 nas caixas da página 1');
  });

  await step('ficha: impressão gera exatamente 2 páginas A4', async () => {
    await go('#/personagens/1/ficha');
    await page.emulateMediaType('print');
    const pdf = Buffer.from(await page.pdf({ preferCSSPageSize: true, printBackground: true }));
    await page.emulateMediaType('screen');
    const raw = pdf.toString('latin1');
    assert.strictEqual((raw.match(/\/Type\s*\/Page(?!s)/g) || []).length, 2);
    assert.match(raw, /\/MediaBox\s*\[0 0 59[45]\.\d+ 84[12]\.\d+\]/, 'A4 (595 × 842 pt)');
  });

  await step('id inexistente mostra "Registro não encontrado" e rota inválida mostra 404', async () => {
    await go('#/racas/999/editar');
    assert.match(await page.$eval('.page', el => el.textContent), /Registro não encontrado/);
    await go('#/magias');
    assert.match(await page.$eval('.page', el => el.textContent), /Esta trilha não leva a lugar algum/);
  });

  await step('restaurar tudo volta aos dados originais', async () => {
    await go('#/');
    assert.match(await text('[data-slot="data-status"]'), /Cópia local ativa/);
    await domClick('[data-action="restore-all"]');
    await sleep(200);
    await page.click('dialog [value="confirm"]');
    await sleep(600);
    assert.deepStrictEqual(await storageKeys(), []);
    await go('#/racas');
    assert.strictEqual(await rowCount(), 7);
    assert.match(await page.$eval('tr[data-id="2"]', el => el.textContent), /Anão/);
  });

  await step('tabelas: ações visíveis e sem rolagem interna de 768 a 1440px (tabela ou cartões)', async () => {
    for (const width of [1440, 1366, 1280, 1024, 768]) {
      await page.setViewport({ width, height: 900 });
      for (const slug of ['personagens', 'pericias', 'classes', 'talentos']) {
        await go(`#/${slug}`);
        await sleep(150);
        const check = await page.evaluate(() => {
          const wrap = document.querySelector('.table-wrap');
          const table = wrap.querySelector('.data-table');
          const btn = table.querySelector('tbody tr[data-id] [data-action="delete"]');
          const r = btn.getBoundingClientRect();
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return {
            fits: table.offsetWidth <= wrap.clientWidth + 1,
            reachable: btn.contains(hit),
            stacked: table.dataset.stacked,
          };
        });
        assert.ok(check.fits, `${slug} @${width}px: tabela maior que o contêiner`);
        assert.ok(check.reachable, `${slug} @${width}px: botão Excluir coberto/fora da área visível (stacked=${check.stacked})`);
      }
    }
    await page.setViewport({ width: 1440, height: 900 });
  });

  await step('modo tabela × cartões não muda ao paginar (decidido só pela largura)', async () => {
    for (const width of [1250, 1280, 1440]) {
      await page.setViewport({ width, height: 900 });
      const modes = new Set();
      for (let p = 1; p <= 16; p++) {
        await go(`#/talentos?pagina=${p}`);
        modes.add(await page.$eval('.data-table', t => t.dataset.stacked));
      }
      assert.strictEqual(modes.size, 1, `talentos @${width}px alterna entre modos: ${[...modes]}`);
    }
    await page.setViewport({ width: 1440, height: 900 });
  });

  await step('guarda: salto de vários passos no histórico (history.go(-2)) e cancelar mantém a URL do formulário', async () => {
    await go('#/racas');
    await go('#/classes');
    await go('#/classes/novo');
    await page.type('input[name="nome"]', 'Salto');
    await page.evaluate(() => history.go(-2));
    await sleep(500);
    assert.ok(await page.$('dialog[open]'), 'pede confirmação');
    await page.click('dialog [value="cancel"]');
    await sleep(500);
    assert.match(page.url(), /#\/classes\/novo$/, 'URL volta ao formulário');
    assert.strictEqual(await page.$eval('input[name="nome"]', el => el.value), 'Salto');
    await page.evaluate(() => history.go(-2));
    await sleep(500);
    await page.click('dialog [value="confirm"]');
    await sleep(700);
    assert.match(page.url(), /#\/racas$/, 'descartar repete o salto de 2 passos');
  });

  await step('limiar em cache considera tabelas relacionadas (nome de classe enorme em Raças @768px)', async () => {
    await page.setViewport({ width: 768, height: 1024 });
    await page.evaluate(() => window.__dmc.store.update('races', 2, { classe_favorecida: 1 }));
    await go('#/racas');
    await go('#/classes');
    await page.evaluate(() => window.__dmc.store.update('classes', 1, { nome: 'BárbaroBerserkerDasTerrasCongeladasDoNorte' }));
    await go('#/racas');
    const check = await page.evaluate(() => {
      const wrap = document.querySelector('.table-wrap');
      const table = wrap.querySelector('.data-table');
      const btn = table.querySelector('tr[data-id="2"] [data-action="delete"]');
      const r = btn.getBoundingClientRect();
      return { fits: table.offsetWidth <= wrap.clientWidth + 1, reachable: btn.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)) };
    });
    assert.ok(check.fits && check.reachable, JSON.stringify(check));
    await page.evaluate(() => window.__dmc.store.restoreAll());
    await page.setViewport({ width: 1440, height: 900 });
  });

  await step('cabeçalho da tabela fica fixo ao rolar (matriz de perícias)', async () => {
    await go('#/pericias');
    await page.evaluate(() => window.scrollTo(0, 700));
    await sleep(150);
    const top = await page.$eval('.data-table thead th', el => el.getBoundingClientRect().top);
    assert.ok(Math.abs(top) <= 2, `th deveria estar colado no topo (top=${top})`);
    await page.evaluate(() => window.scrollTo(0, 0));
  });

  const logDaArena = () => page.$$eval('.arena-log > li', els => els.map(e => e.textContent.trim()).join('\n'));

  await step('arena: menu lateral e montagem pelo seletor (busca sem acento, abas, ND, quantidade, URL)', async () => {
    await go('#/arena');
    await sleep(300);
    assert.match(await text('h1'), /Arena/);
    assert.strictEqual(await page.$eval('[data-nav="arena"]', el => el.getAttribute('aria-current')), 'page');
    assert.ok(await page.$eval('[data-action="comecar"]', el => el.disabled), 'sem combatentes, não começa');
    await domClick('[data-action="adicionar"][data-lado="A"]');
    await sleep(300);
    assert.ok(await page.$('dialog.arena-picker[open]'));
    await page.type('[data-busca]', 'carnical');
    await sleep(150);
    assert.deepStrictEqual(await page.$$eval('.arena-pick__name', els => els.map(e => e.textContent.trim())), ['Carniçal']);
    await domClick('[data-add="carnical"]');
    await domClick('[data-add="carnical"]');
    assert.match(await text('[data-contagem="carnical"]'), /2 no lado A/);
    await domClick('[data-aba="holy"]');
    await sleep(100);
    assert.strictEqual(await page.$eval('[data-busca]', el => el.value), 'carnical', 'a busca vale para as duas abas');
    assert.match(await text('.arena-picker__empty'), /Nenhum combatente/);
    await page.$eval('[data-busca]', el => {
      el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.select('[data-nd]', '16-20');
    await sleep(100);
    assert.deepStrictEqual(await page.$$eval('.arena-pick__name', els => els.map(e => e.textContent.trim())), ['Mestre Arsenal', 'Nekapeth', 'Paladino de Arton']);
    await domClick('[data-aba="meus"]');
    await sleep(100);
    assert.match(await text('.arena-picker__empty'), /Nenhum combatente com esses filtros/, 'o filtro de ND vale também para os seus personagens');
    await page.select('[data-nd]', 'todos');
    await sleep(100);
    assert.deepStrictEqual(await page.$$eval('.arena-pick__name', els => els.map(e => e.textContent.trim())), ['Jonh']);
    assert.match(await text('.arena-pick__meta'), /Nível 4.*Guerreiro 4 · Humano/);
    await page.focus('[data-aba="meus"]');
    await page.keyboard.press('ArrowRight');
    await sleep(100);
    assert.strictEqual(await page.evaluate(() => document.activeElement.dataset.aba), 'monstros', 'setas giram entre as abas');
    await page.keyboard.press('End');
    await sleep(100);
    assert.strictEqual(await page.$eval('[aria-selected="true"]', el => el.dataset.aba), 'meus');
    assert.strictEqual(await page.$eval('[data-aba="holy"]', el => el.getAttribute('aria-selected')), 'false');
    await page.keyboard.press('Escape');
    await sleep(200);
    assert.strictEqual(await page.$('dialog.arena-picker'), null, 'Esc fecha o seletor');
    assert.strictEqual(await page.evaluate(() => document.activeElement.dataset.action + document.activeElement.dataset.lado), 'adicionarA', 'foco volta ao botão que abriu');
    await domClick('[data-action="adicionar"][data-lado="B"]');
    await sleep(300);
    await page.type('[data-busca]', 'troll');
    await sleep(150);
    await domClick('[data-add="troll"]');
    await domClick('dialog.arena-picker .btn--primary[data-action="fechar"]');
    await sleep(200);
    assert.match(page.url(), /#\/arena\?a=carnical\*2&b=troll&semente=\d{6}$/);
    await domClick('[data-qtd="1"][data-ref="carnical"]');
    assert.strictEqual(await text('.arena-side--a .arena-qty__n'), '3');
    await domClick('[data-qtd="-1"][data-ref="carnical"]');
    assert.strictEqual(await text('.arena-side--a .arena-qty__n'), '2');
    assert.match(await text('.arena-difficulty'), /Para o lado A, a luta parece/);
    const semente = await page.$eval('#arena-semente', el => el.value);
    await page.click('#arena-semente', { clickCount: 1 });
    await page.keyboard.press('End');
    for (let i = 0; i < 6; i++) await page.keyboard.press('Backspace');
    await page.keyboard.press('Tab');
    await sleep(100);
    assert.strictEqual(await page.$eval('#arena-semente', el => el.value), semente, 'semente apagada volta à anterior');
    assert.match(page.url(), new RegExp(`semente=${semente}$`));
    assert.ok(!(await page.$eval('[data-action="comecar"]', el => el.disabled)));
    // lado A cheio e B vazio: fechar o seletor leva o foco ao "Adicionar" do lado B
    await go('#/arena?a=ogro*9&semente=1');
    await sleep(300);
    await domClick('[data-action="adicionar"][data-lado="A"]');
    await sleep(300);
    await page.type('[data-busca]', 'troll');
    await sleep(150);
    await domClick('[data-add="troll"]');
    await page.keyboard.press('Escape');
    await sleep(200);
    assert.strictEqual(await page.evaluate(() => document.activeElement.dataset.action + document.activeElement.dataset.lado), 'adicionarB');
    // Voltar do navegador com o seletor aberto: o diálogo sai junto com a página
    await domClick('[data-action="adicionar"][data-lado="B"]');
    await sleep(300);
    await page.evaluate(() => history.back());
    await sleep(500);
    assert.strictEqual(await page.$('dialog.arena-picker'), null);
    assert.doesNotMatch(page.url(), /#\/arena\?a=ogro\*9/);
  });

  await step('arena: passo a passo, até o fim, e recomeçar com a mesma semente repete o registro', async () => {
    await go('#/arena?a=ogro*2&b=troll&semente=580669');
    await sleep(400);
    await domClick('[data-action="comecar"]');
    await sleep(100);
    assert.match(await text('[data-slot="situacao"]'), /Pronto para começar/);
    assert.deepStrictEqual(await page.$$eval('.arena-log > li', els => els.length), 1, 'só a iniciativa');
    await domClick('[data-action="acao"]');
    await sleep(80);
    assert.ok((await page.$$eval('.arena-log > li', els => els.length)) >= 3);
    assert.ok(await page.$('.arena-fighter.is-turn'), 'marca quem agiu');
    assert.match(await text('[data-slot="situacao"]'), /Rodada 1 · a seguir:/);
    await domClick('[data-action="rodada"]');
    await domClick('[data-action="fim"]');
    await sleep(150);
    const final = await logDaArena();
    assert.match(final, /Fim da luta: /);
    assert.match(await text('.arena-result h2'), /Vence o lado|Empate/);
    assert.ok(await page.$eval('[data-action="acao"]', el => el.disabled));
    await domClick('[data-action="recomecar"]');
    await sleep(80);
    assert.strictEqual(await page.$('.arena-result'), null);
    await domClick('[data-action="fim"]');
    await sleep(150);
    assert.strictEqual(await logDaArena(), final, 'a mesma semente repete a luta');
    // dados mudados em outra aba não apagam a luta em andamento (a recarga fica para a volta à montagem)
    await page.evaluate(() => window.__dmc.store.handleExternalChange('dmc:v1:races'));
    await sleep(300);
    assert.strictEqual(await logDaArena(), final, 'o evento de outra aba não recarrega a Arena');
    await domClick('[data-action="nova-luta"]');
    await sleep(80);
    assert.doesNotMatch(page.url(), /semente=580669/);
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(300);
    assert.deepStrictEqual(await page.$$eval('.arena-roster__name', els => els.map(e => e.textContent.trim())), ['Ogro', 'Troll'], 'recarregar mantém a montagem');
    assert.strictEqual(await text('.arena-side--a .arena-qty__n'), '2');
  });

  await step('arena: seus personagens (aba, equipamento salvo em fichas e usado na luta, atalhos da lista e da ficha)', async () => {
    await go('#/personagens');
    assert.strictEqual(await page.$eval('tr[data-id="1"] a[href="#/arena?a=p:1"]', el => el.getAttribute('aria-label')), 'Arena de Jonh');
    await go('#/personagens/1/ficha');
    await sleep(300);
    assert.ok(await page.$('.sheet-toolbar a[href="#/arena?a=p:1"]'), 'ficha: Levar à arena');
    await go('#/arena?a=p:1&semente=580669');
    await sleep(400);
    assert.match(await text('.arena-side--a .arena-roster__name'), /Jonh/);
    assert.match(await text('.arena-side--a .arena-roster__equip'), /^Espada longa · Escudo grande de madeira · Cota de malha · Arco longo$/, 'kit padrão do guerreiro');
    assert.match(await text('.arena-side--a .arena-roster__meta'), /PV 42 · CA 19/);
    // a mesma pessoa só entra uma vez por lado
    await domClick('[data-action="adicionar"][data-lado="A"]');
    await sleep(300);
    await domClick('[data-aba="meus"]');
    await sleep(100);
    assert.ok(await page.$eval('[data-add="p:1"]', el => el.disabled));
    await page.keyboard.press('Escape');
    await sleep(200);
    // equipamento: espada grande com escudo é erro; sem escudo, salva
    await domClick('[data-action="equipamento"][data-ref="p:1"]');
    await sleep(300);
    assert.ok(await page.$('dialog.arena-equip[open]'));
    await page.select('[data-item="principal"]', 'espada-grande');
    await sleep(100);
    assert.match(await text('.arena-equip__erros'), /pede as duas mãos/);
    assert.ok(await page.$eval('[data-action="salvar"]', el => el.disabled));
    await page.select('[data-item="escudo"]', '');
    await page.select('[data-melhoria="principal"]', '1');
    await sleep(100);
    assert.ok(!(await page.$eval('[data-action="salvar"]', el => el.disabled)));
    assert.match(await text('.arena-equip__nums'), /CA\s*17.*Espada grande \+1 \+9 \(2d6\+7, 19–20\/×2\)/s, 'prévia: CA sem escudo e a espada com as duas mãos');
    await domClick('[data-action="salvar"]');
    await sleep(400);
    assert.strictEqual(await page.$('dialog.arena-equip'), null);
    assert.match(await text('.arena-side--a .arena-roster__equip'), /^Espada grande \+1 · Cota de malha · Arco longo$/);
    const salvo = await page.evaluate(async () => (await window.__dmc.store.all('fichas')).find(f => f.personagem_id === 1)?.equipamento);
    assert.deepStrictEqual(salvo.principal, { id: 'espada-grande', melhoria: 1, material: null });
    assert.strictEqual(salvo.escudo, null);
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(300);
    assert.match(await text('.arena-side--a .arena-roster__equip'), /^Espada grande \+1/, 'o equipamento fica salvo');
    // a luta usa o equipamento salvo
    await domClick('[data-action="adicionar"][data-lado="B"]');
    await sleep(300);
    await page.type('[data-busca]', 'ogro');
    await sleep(150);
    await domClick('[data-add="ogro"]');
    // (com a busca preenchida, o primeiro Esc só limpa o campo, que é o comportamento nativo)
    await domClick('dialog.arena-picker .btn--primary[data-action="fechar"]');
    await sleep(200);
    assert.strictEqual(await page.$('dialog.arena-picker'), null);
    await domClick('[data-action="comecar"]');
    await domClick('[data-action="fim"]');
    await sleep(200);
    assert.match(await logDaArena(), /Jonh ataca Ogro com Espada grande \+1: /);
    // dados mudados em outra aba com a luta em andamento: a luta fica, e a Arena recarrega ao voltar à montagem
    const final = await logDaArena();
    await page.evaluate(() => { document.querySelector('.page').dataset.marca = 'antes'; });
    await page.evaluate(() => window.__dmc.store.handleExternalChange('dmc:v1:personagens'));
    await sleep(300);
    assert.strictEqual(await logDaArena(), final);
    assert.strictEqual(await page.$eval('.page', el => el.dataset.marca), 'antes', 'não recarregou com a luta aberta');
    await domClick('[data-action="montagem"]');
    await sleep(400);
    assert.strictEqual(await page.$eval('.page', el => el.dataset.marca || null), null, 'recarregou ao voltar à montagem');
    assert.match(await text('.arena-side--a .arena-roster__name'), /Jonh/);
    // o personagem é excluído em outra aba com o diálogo aberto: o salvar não grava e a Arena recarrega
    await domClick('[data-action="equipamento"][data-ref="p:1"]');
    await sleep(300);
    await page.evaluate(async () => {
      await window.__dmc.store.remove('personagens', 1);
      window.__dmc.store.handleExternalChange('dmc:v1:personagens');
    });
    await sleep(300);
    assert.ok(await page.$('dialog.arena-equip[open]'), 'o diálogo continua aberto (a recarga fica para depois)');
    await page.select('[data-melhoria="principal"]', '2');
    await domClick('[data-action="salvar"]');
    await sleep(700);
    assert.strictEqual(await page.$('dialog.arena-equip'), null);
    const depois = await page.evaluate(() => window.__dmc.store.all('fichas'));
    assert.ok(!depois.some(f => f.equipamento?.principal?.melhoria === 2), 'não gravou para um personagem que não existe mais');
    assert.match(await text('.notice'), /personagem do link não existe neste navegador/);
    await page.evaluate(() => window.__dmc.store.restore('personagens'));
    await page.evaluate(() => window.__dmc.store.restore('fichas'));
  });

  await step('arena: simulação em lote (fatias com progresso, cancelar, resultado, assistir a uma luta do lote)', async () => {
    await go('#/arena?a=ogro*2&b=troll&semente=580669');
    await sleep(400);
    await domClick('[data-action="lote"][data-vezes="1000"]');
    await sleep(80);
    const meio = await page.$eval('[data-slot="lote-barra"]', el => Number(el.getAttribute('aria-valuenow')));
    assert.ok(meio > 0 && meio < 1000, `em fatias, com progresso (${meio} de 1.000)`);
    assert.ok(await page.$eval('[data-action="comecar"]', el => el.disabled), 'sem luta enquanto o lote roda');
    await domClick('[data-action="lote-cancelar"]');
    await sleep(100);
    assert.match(await text('.arena-lote__h3'), /^Parcial: [\d.]+ de 1\.000 lutas$/);
    await domClick('[data-action="lote"][data-vezes="100"]');
    await page.waitForSelector('#arena-lote-res', { timeout: 20000 });
    await sleep(50);
    assert.match(await text('.arena-lote__h3'), /^100 lutas$/);
    assert.match(await text('.arena-lote__sub'), /Sementes 580669 a 580768/);
    const pcts = await page.$$eval('.arena-lote__nums dd', els => els.slice(0, 3).map(e => parseFloat(e.textContent.replace(',', '.'))));
    assert.ok(Math.abs(pcts.reduce((a, b) => a + b, 0) - 100) < 0.2, `A + B + empates = 100%: ${pcts}`);
    assert.strictEqual(await page.$$eval('.arena-lote__quedas li', els => els.length), 3);
    assert.strictEqual(await page.evaluate(() => document.activeElement.id), 'arena-lote-res', 'o foco vai para o resultado');
    // assistir a uma vitória do lado B: a semente dela vira a da montagem
    const semente = await page.$eval('[data-action="ver-semente"][data-resultado="B"]', el => el.dataset.semente);
    await domClick('[data-action="ver-semente"][data-resultado="B"]');
    await sleep(150);
    await domClick('[data-action="fim"]');
    await sleep(200);
    assert.match(await logDaArena(), /Fim da luta: vence o lado B/);
    assert.match(page.url(), new RegExp(`semente=${semente}`));
    await domClick('[data-action="montagem"]');
    await sleep(200);
    assert.match(await text('.arena-lote__h3'), /^100 lutas$/, 'o resultado do lote continua na montagem');
    // mudar a semente depois do lote: o resultado segue valendo (ele guarda as dele) e diz de onde partiu
    await page.$eval('#arena-semente', el => {
      el.value = 'outra';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(100);
    assert.match(await text('.arena-lote__sub'), /a partir da semente “580669”; a da montagem mudou depois/);
    assert.ok(await page.$('[data-action="ver-semente"]'), 'mudar a semente não invalida o resultado');
    // o limite muda depois do lote: o resultado fica marcado como antigo na hora, sem os "Ver…"
    await page.$eval('#arena-limite', el => {
      el.value = '1';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(100);
    assert.match(await text('.arena-lote__aviso'), /montagem mudou/);
    assert.strictEqual(await page.$('[data-action="ver-semente"]'), null);
    await page.$eval('#arena-limite', el => {
      el.value = '50';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(100);
    assert.ok(await page.$('[data-action="ver-semente"]'), 'voltando à montagem do lote, o resultado vale de novo');
    // com o resultado na tela, editar uma opção e clicar com o mouse de verdade (mousedown → blur →
    // change): o 1º clique vale, em "Ver…" e em "Começar"
    await page.$eval('#arena-semente', el => {
      el.focus();
      el.select();
    });
    await page.keyboard.type('mouse-1');
    await page.click('[data-action="ver-semente"][data-resultado="B"]');
    await sleep(200);
    assert.ok(await page.$('[data-slot="situacao"]'), 'o 1º clique em "Ver…" abriu a luta');
    await domClick('[data-action="montagem"]');
    await sleep(200);
    await page.$eval('#arena-distancia', el => {
      el.focus();
      el.select();
    });
    await page.keyboard.type('12');
    await page.click('[data-action="comecar"]');
    await sleep(200);
    assert.ok(await page.$('[data-slot="situacao"]'), 'o 1º clique em "Começar" abriu a luta');
    assert.match(await text('.arena-bar__info'), /Começa a 12 m/);
    await domClick('[data-action="montagem"]');
    await sleep(200);
    await page.$eval('#arena-distancia', el => {
      el.value = '9';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(100);
    // mudar a montagem marca o resultado como de uma montagem anterior
    await domClick('[data-qtd="1"][data-ref="ogro"]');
    assert.match(await text('.arena-lote__aviso'), /montagem mudou/);
    assert.strictEqual(await page.$('[data-action="ver-semente"]'), null);
  });

  await step('arena: lote com mudanças no meio (distância cancela sem travar, digitar a semente, equipamento, outra aba)', async () => {
    const lenta = '#/arena?a=ha-lisandra&b=ha-lisandra&limite=200&semente=1';
    // a distância muda com o lote rodando: cancela e destrava a tela
    await go(lenta);
    await sleep(400);
    await domClick('[data-action="lote"][data-vezes="1000"]');
    await sleep(80);
    await page.$eval('#arena-distancia', el => {
      el.value = '30';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await sleep(100);
    assert.match(await text('.arena-lote__h3'), /^Parcial: /);
    assert.match(await text('.arena-lote__sub'), /cancelada: a montagem mudou/);
    assert.ok(!(await page.$eval('[data-action="comecar"]', el => el.disabled)), 'Começar volta a funcionar');
    assert.ok(!(await page.$eval('[data-action="lote"][data-vezes="100"]', el => el.disabled)));
    // digitar a semente enquanto o lote termina: o campo e o foco ficam
    await go(lenta);
    await sleep(400);
    await domClick('[data-action="lote"][data-vezes="100"]');
    await page.$eval('#arena-semente', el => {
      el.focus();
      el.select();
    });
    await page.keyboard.type('777');
    await page.waitForSelector('#arena-lote-res', { timeout: 30000 });
    await sleep(100);
    assert.strictEqual(await page.$eval('#arena-semente', el => el.value), '777');
    assert.strictEqual(await page.evaluate(() => document.activeElement.id), 'arena-semente', 'o foco segue no campo');
    assert.match(await text('.arena-lote__h3'), /^100 lutas$/, 'mudar a semente não cancela o lote (ele guarda as dele)');
    // o equipamento muda depois do lote: o resultado fica marcado como antigo e sem "Ver…"
    await go('#/arena?a=p:1&b=ogro*2&semente=580669');
    await sleep(400);
    await domClick('[data-action="lote"][data-vezes="100"]');
    await page.waitForSelector('#arena-lote-res', { timeout: 20000 });
    assert.ok(await page.$('[data-action="ver-semente"]'));
    await domClick('[data-action="equipamento"][data-ref="p:1"]');
    await sleep(300);
    await domClick('[data-action="salvar"]'); // salvar o mesmo kit não muda a luta
    await sleep(400);
    assert.strictEqual(await page.$('.arena-lote__aviso'), null, 'salvar o mesmo equipamento não marca o resultado como antigo');
    assert.ok(await page.$('[data-action="ver-semente"]'));
    await domClick('[data-action="equipamento"][data-ref="p:1"]');
    await sleep(300);
    await page.select('[data-item="principal"]', 'clava');
    await domClick('[data-action="salvar"]');
    await sleep(400);
    assert.match(await text('.arena-lote__aviso'), /montagem mudou/);
    assert.strictEqual(await page.$('[data-action="ver-semente"]'), null);
    // dados mudados em outra aba com o lote rodando: recarrega na hora e avisa que cancelou
    await domClick('[data-action="lote"][data-vezes="1000"]');
    await sleep(80);
    await page.evaluate(() => { document.querySelector('.page').dataset.marca = 'antes'; });
    await page.evaluate(() => window.__dmc.store.handleExternalChange('dmc:v1:personagens'));
    await sleep(400);
    assert.strictEqual(await page.$eval('.page', el => el.dataset.marca || null), null, 'recarregou');
    assert.ok(await page.$$eval('.toast', els => els.some(e => /simulação em lote foi cancelada/.test(e.textContent))));
    assert.strictEqual(await page.$('.arena-lote__res, [data-slot="lote-barra"]'), null, 'o lote não continua depois da recarga');
    await page.evaluate(() => window.__dmc.store.restore('fichas'));
  });

  await step('arena @375px: montagem, seletor e luta sem rolagem horizontal; abas numa linha', async () => {
    // viewport simples (sem isMobile): com isMobile o Chrome encolhe a página e esconde o overflow
    await page.setViewport({ width: 375, height: 812 });
    await go('#/arena?a=ogro*2,ha-lisandra&b=troll&semente=580669');
    await sleep(400);
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(await overflow() <= 0, 'montagem');
    await domClick('[data-action="adicionar"][data-lado="B"]');
    await sleep(300);
    const abas = await page.$$eval('.arena-picker [role="tab"]', els => els.map(e => e.getBoundingClientRect().top));
    assert.strictEqual(new Set(abas).size, 1, `abas em uma linha: ${abas}`);
    assert.ok(await page.$eval('dialog.arena-picker', el => el.getBoundingClientRect().right <= innerWidth));
    await page.keyboard.press('Escape');
    await sleep(200);
    await domClick('[data-action="comecar"]');
    await domClick('[data-action="fim"]');
    await sleep(200);
    assert.ok(await overflow() <= 0, 'luta');
    // semente de 40 caracteres sem espaço (o campo aceita qualquer texto)
    await go('#/arena?a=ogro&b=troll&semente=SementeMuitoLongaSemEspacosParaQuebrar40');
    await sleep(300);
    await domClick('[data-action="comecar"]');
    await domClick('[data-action="fim"]');
    await sleep(200);
    assert.ok(await overflow() <= 0, 'semente longa no resultado');
    // o resultado do lote cabe a 375 px
    await domClick('[data-action="montagem"]');
    await sleep(200);
    await domClick('[data-action="lote"][data-vezes="100"]');
    await page.waitForSelector('#arena-lote-res', { timeout: 20000 });
    assert.ok(await overflow() <= 0, 'resultado do lote');
    await page.setViewport({ width: 1440, height: 900 });
  });

  await step('mobile: gaveta abre/fecha e tabelas viram cartões sem rolagem horizontal', async () => {
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await page.reload({ waitUntil: 'networkidle0' });
    await go('#/personagens');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 0, `sem overflow horizontal (${overflow}px)`);
    assert.strictEqual(await page.$eval('.data-table thead', el => getComputedStyle(el).display), 'none');
    await page.click('[data-action="open-drawer"]');
    await sleep(400);
    assert.strictEqual(await page.$eval('.app', el => el.dataset.drawer), 'open');
    await page.keyboard.press('Escape');
    await sleep(400);
    assert.strictEqual(await page.$eval('.app', el => el.dataset.drawer), 'closed');
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
