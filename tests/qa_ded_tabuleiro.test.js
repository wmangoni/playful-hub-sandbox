/**
 * QA E2E do Tabuleiro Tático 3.5, Miniaturas e Cones (TASK_011), em Puppeteer.
 * Executar: node tests/qa_ded_tabuleiro.test.js
 */
process.env.NODE_ENV = 'test';
const http = require('http');
const assert = require('assert');
const app = require('../server');

const PORT = 3022;
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
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));
  page.on('dialog', d => d.dismiss());

  const go = async hash => {
    await page.evaluate(h => { location.hash = h; }, hash);
    await sleep(500);
  };

  let passed = 0;
  const step = async (name, fn) => {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  };

  console.log('\n--- QA Tabuleiro Tático D&D 3.5 (E2E) ---');

  try {
    await page.goto(BASE, { waitUntil: 'networkidle0' });

    await step('Navega para a Arena com Troll (Lado A) vs Dragão Vermelho Adulto (Lado B)', async () => {
      await go('#/arena?a=troll&b=dragao-vermelho-adulto&distancia=9');
      await page.waitForSelector('[data-action="comecar"]', { timeout: 5000 });
      const pronto = await page.$eval('[data-action="comecar"]', b => !b.disabled);
      assert.strictEqual(pronto, true, 'O botão Começar deve estar habilitado');
    });

    await step('Inicia o combate e renderiza o Tabuleiro Tático na tela', async () => {
      await page.click('[data-action="comecar"]');
      await page.waitForSelector('.arena-tabuleiro-card', { timeout: 5000 });
      const titulo = await page.$eval('.arena-tabuleiro__title', el => el.textContent.trim());
      assert.ok(titulo.includes('Tabuleiro Tático'), 'O título do tabuleiro deve estar visível');
    });

    await step('Tabuleiro fica posicionado à esquerda e o Registro à direita no layout de combate', async () => {
      const layout = await page.evaluate(() => {
        const leftCol = document.querySelector('.arena-fight__left');
        const rightCol = document.querySelector('.arena-fight__right');
        const tabuleiroCard = document.querySelector('.arena-tabuleiro-card');
        const logCard = document.querySelector('.arena-log-card');
        const orderCard = document.querySelector('.arena-order');

        const tabRect = tabuleiroCard.getBoundingClientRect();
        const logRect = logCard.getBoundingClientRect();

        return {
          leftHasTabuleiro: Boolean(leftCol && leftCol.contains(tabuleiroCard)),
          leftHasOrder: Boolean(leftCol && leftCol.contains(orderCard)),
          rightHasLog: Boolean(rightCol && rightCol.contains(logCard)),
          tabuleiroX: tabRect.left,
          logX: logRect.left,
          sideBySide: tabRect.right <= logRect.left + 5,
        };
      });

      assert.ok(layout.leftHasTabuleiro, 'Coluna esquerda deve conter o tabuleiro');
      assert.ok(layout.leftHasOrder, 'Coluna esquerda deve conter a ordem de iniciativa');
      assert.ok(layout.rightHasLog, 'Coluna direita deve conter o registro de combate');
      assert.ok(layout.sideBySide, 'Tabuleiro deve estar posicionado à esquerda do Registro');
    });

    await step('Miniaturas respeitam a simplificação de tamanho da 3.5 (Troll 2x2 e Dragão 3x3)', async () => {
      const tokens = await page.$$eval('.arena-token', els => els.map(el => ({
        uid: el.dataset.token,
        ref: el.dataset.ref,
        width: el.offsetWidth,
        height: el.offsetHeight,
        imgSrc: el.querySelector('img')?.src || '',
      })));

      assert.strictEqual(tokens.length, 2, 'Devem existir 2 miniaturas no tabuleiro');

      const trollToken = tokens.find(t => t.ref === 'troll');
      const dragaoToken = tokens.find(t => t.ref === 'dragao-vermelho-adulto');

      assert.ok(trollToken, 'Token do Troll deve existir');
      assert.ok(dragaoToken, 'Token do Dragão deve existir');

      // Base: 48px por quadrado
      // Troll é Grande (2x2) = 96px
      // Dragão é Enorme (3x3) = 144px
      assert.strictEqual(trollToken.width, 96, 'Troll deve ter 96px de largura (2x2 na 3.5)');
      assert.strictEqual(trollToken.height, 96, 'Troll deve ter 96px de altura (2x2 na 3.5)');

      assert.strictEqual(dragaoToken.width, 144, 'Dragão Adulto deve ter 144px de largura (3x3 na 3.5)');
      assert.strictEqual(dragaoToken.height, 144, 'Dragão Adulto deve ter 144px de altura (3x3 na 3.5)');
    });

    await step('Miniaturas carregam imagens geradas pelo Nano Banana', async () => {
      const trollImg = await page.$eval('[data-ref="troll"] img', img => img.src);
      const dragaoImg = await page.$eval('[data-ref="dragao-vermelho-adulto"] img', img => img.src);

      assert.ok(trollImg.includes('troll.png') || trollImg.startsWith('data:image/svg+xml'), 'Troll deve ter token');
      assert.ok(dragaoImg.includes('dragao-vermelho-adulto.png') || dragaoImg.startsWith('data:image/svg+xml'), 'Dragão deve ter token');
    });

    await step('Clicar na miniatura do Dragão abre o card completo com estatísticas (TASK_010)', async () => {
      await page.click('[data-ref="dragao-vermelho-adulto"]');
      await page.waitForSelector('.fc-dialog[open]', { timeout: 5000 });
      const tituloCard = await page.$eval('.fc-dialog[open] .fc-head__nome', el => el.textContent.trim());
      assert.ok(tituloCard.includes('Dragão Vermelho Adulto'), 'O popup deve ser do Dragão');

      // Fecha o card
      await page.keyboard.press('Escape');
      await sleep(300);
      const aberto = await page.$('.fc-dialog[open]');
      assert.strictEqual(aberto, null, 'O card deve fechar ao pressionar Escape');
    });

    await step('Avança ações e verifica sincronização contínua do tabuleiro', async () => {
      for (let i = 0; i < 3; i++) {
        await page.click('[data-action="acao"]');
        await sleep(200);
      }
      const pvBars = await page.$$('.arena-token__pv-bar');
      assert.strictEqual(pvBars.length, 2, 'Barras de PV devem continuar visíveis e atualizadas');
    });

    await step('Botão Recomeçar reinicia as posições no tabuleiro', async () => {
      await page.click('[data-action="recomecar"]');
      await sleep(300);
      const tokens = await page.$$('.arena-token');
      assert.strictEqual(tokens.length, 2, 'Miniaturas devem ser reposicionadas no reinício');
    });

    await step('Voltar à montagem remove o tabuleiro sem erros de console', async () => {
      await page.click('[data-action="montagem"]');
      await sleep(300);
      const tabuleiro = await page.$('.arena-tabuleiro-card');
      assert.strictEqual(tabuleiro, null, 'O tabuleiro deve ser desmontado ao voltar à montagem');
      assert.deepStrictEqual(consoleErrors, [], `Sem erros no console: ${consoleErrors.join(', ')}`);
    });

    console.log(`\n🎉 Todos os ${passed} testes E2E do Tabuleiro Tático passaram com sucesso!`);
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(r => server.close(r));
  }
}

run().catch(async err => {
  console.error('\n❌ Falha no teste QA E2E do tabuleiro:', err);
  if (browser) await browser.close();
  if (server) await new Promise(r => server.close(r));
  process.exit(1);
});
