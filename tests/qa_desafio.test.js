// QA do Desafio do Dia no navegador: página /desafio/, banner da home e o overlay dentro de cada jogo.
// Usa o servidor real (server.js). SHOTS_DIR=<pasta> salva capturas de tela para inspeção visual.
process.env.NODE_ENV = 'test';
const puppeteer = require('puppeteer');
const http = require('http');
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const app = require('../server');
const core = require('../assets/js/desafio-core.js');

const PORT = 3071;
const BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = process.env.SHOTS_DIR;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = (page, name) => (SHOTS ? page.screenshot({ path: path.join(SHOTS, name + '.png') }) : null);

// pageerror de terceiros (CDNs fora do ar etc.) não é culpa do desafio: só conta o que vier do nosso script
const ours = (m) => /desafio/i.test(m);

(async () => {
    const server = http.createServer(app);
    await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const today = core.brtDate();
    const todays = core.challengeFor(today);
    const track = (page) => {
        const errs = [];
        page.on('pageerror', (e) => errs.push(e.message));
        return errs;
    };
    const overlay = (page) => page.evaluate(() => {
        const host = document.querySelector('[data-desafio]');
        if (!host) return null;
        const r = host.shadowRoot;
        return { tag: r.querySelector('.tag').textContent, best: r.querySelector('.best b').textContent, wrapHidden: r.querySelector('.wrap').hidden, miniHidden: r.querySelector('.mini').hidden };
    });
    const stored = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), core.STORAGE_KEY);

    try {
        // ================= 1) página /desafio/
        console.log('[1/6] Página /desafio/ ...');
        const page = await browser.newPage();
        const errs = track(page);
        await page.setViewport({ width: 1100, height: 800 });
        await page.goto(`${BASE}/desafio`, { waitUntil: 'domcontentloaded' }); // sem barra final: o Express redireciona
        await page.waitForFunction(() => { const i = document.getElementById('today-img'); return i && i.complete && i.naturalWidth > 0; }, { timeout: 8000 });
        assert.ok(page.url().endsWith('/desafio/'), 'redireciona para /desafio/');
        const v = await page.evaluate(() => ({
            name: document.getElementById('today-name').textContent,
            edition: document.getElementById('today-edition').textContent,
            href: document.getElementById('today-play').getAttribute('href'),
            mediaHref: document.getElementById('today-media').getAttribute('href'),
            imgOk: document.getElementById('today-img').naturalWidth > 0,
            streak: document.getElementById('st-streak').textContent,
            best: document.getElementById('st-best').textContent,
            shareDisabled: document.getElementById('share').disabled,
            history: [...document.querySelectorAll('#history a')].map((a) => ({ href: a.getAttribute('href'), text: a.textContent })),
            next: document.getElementById('st-next').textContent,
            todayVisible: !document.getElementById('today').hidden
        }));
        assert.ok(v.todayVisible, 'o desafio de hoje aparece');
        assert.strictEqual(v.name, `${todays.game.emoji} ${todays.game.name}`);
        assert.strictEqual(v.href, `${todays.game.play}?desafio=${today}`);
        assert.strictEqual(v.mediaHref, v.href, 'a imagem de prévia leva ao mesmo link do botão (nunca iframe)');
        assert.ok(v.imgOk, 'imagem de prévia carregou');
        assert.ok(v.edition.includes(core.formatDM(today)));
        assert.strictEqual(v.streak, '0 dias');
        assert.strictEqual(v.best, '—');
        assert.strictEqual(v.shareDisabled, true, 'sem placar não há o que compartilhar');
        assert.strictEqual(v.history.length, 7);
        assert.ok(/^\d\d:\d\d:\d\d$/.test(v.next), 'contagem regressiva ' + v.next);
        assert.ok(v.history[0].text.includes('(hoje)'));
        assert.strictEqual(await page.$('iframe:not([src*="googletagmanager"])'), null, 'nenhum iframe de jogo na página');
        await shot(page, 'desafio-pagina-desktop');

        // sequência e compartilhamento, com o estado de 3 dias seguidos gravado como o overlay faria
        await page.evaluate((k, days, slug) => {
            const st = { version: 1, days: {} };
            days.forEach((d, i) => { st.days[d] = { slug, best: 10 + i, live: true }; });
            localStorage.setItem(k, JSON.stringify(st));
        }, core.STORAGE_KEY, [core.addDays(today, -2), core.addDays(today, -1), today], todays.game.slug);
        await page.reload({ waitUntil: 'domcontentloaded' });
        // o histórico só mostra placar quando o jogo gravado é o jogo daquele dia; aqui basta hoje
        const v2 = await page.evaluate(() => ({ streak: document.getElementById('st-streak').textContent, best: document.getElementById('st-best').textContent, shareDisabled: document.getElementById('share').disabled }));
        assert.strictEqual(v2.streak, '3 dias');
        assert.strictEqual(v2.best, '12');
        assert.strictEqual(v2.shareDisabled, false);
        await page.evaluate(() => { window.__copied = null; Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); navigator.clipboard.writeText = (t) => { window.__copied = t; return Promise.resolve(); }; });
        await page.click('#share');
        const copied = await page.evaluate(() => window.__copied);
        assert.ok(copied && copied.includes(todays.game.name) && copied.includes('12 pontos') && copied.includes('3 dias seguidos') && copied.includes('utm_campaign=desafio-do-dia'), 'texto compartilhado: ' + copied);
        assert.ok((await page.$eval('#share-msg', (e) => e.textContent)).length > 0, 'avisa que copiou');
        await page.setViewport({ width: 390, height: 844 });
        await page.reload({ waitUntil: 'domcontentloaded' });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem horizontal no celular');
        await shot(page, 'desafio-pagina-celular');
        assert.deepStrictEqual(errs.filter(ours), [], 'sem erros nossos na página');
        await page.close();

        // ================= 2) banner da home
        console.log('[2/6] Banner na home ...');
        const home = await browser.newPage();
        const herrs = track(home);
        await home.setViewport({ width: 1280, height: 900 });
        await home.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
        const bt = await home.$eval('#desafio-banner-text', (e) => e.textContent);
        assert.ok(bt.includes(todays.game.name), 'banner mostra o jogo de hoje: ' + bt);
        assert.strictEqual(await home.$eval('#desafio-banner', (e) => e.getAttribute('href')), './desafio/');
        await shot(home, 'home-banner');
        assert.deepStrictEqual(herrs.filter(ours), []);
        await home.close();

        // ================= 3) overlay em cada um dos 5 jogos
        console.log('[3/6] Overlay em cada jogo ...');
        for (const g of core.GAMES) {
            let date = today;
            while (core.challengeFor(date).game.slug !== g.slug) date = core.addDays(date, -1); // último dia em que esse jogo foi o desafio
            const p = await browser.newPage();
            const perrs = track(p);
            await p.setViewport({ width: 1100, height: 800 });
            // limpa só na primeira carga da aba (o reload precisa enxergar o que foi gravado)
            await p.evaluateOnNewDocument(() => { window.PHDesafioConfig = { collapseMs: 0 }; });
            await p.evaluateOnNewDocument(() => { try { if (!sessionStorage.getItem('__limpo')) { localStorage.clear(); sessionStorage.setItem('__limpo', '1'); } } catch (e) { /* ok */ } });
            await p.goto(`${BASE}${g.play}?desafio=${date}`, { waitUntil: 'domcontentloaded' });
            await p.waitForSelector('[data-desafio]', { timeout: 8000 });
            const o = await overlay(p);
            assert.ok(o.tag.includes(core.formatDM(date)), `${g.slug}: etiqueta do overlay`);
            assert.strictEqual(o.best, '0');

            // o jogo atualiza o placar: o overlay acompanha e guarda o melhor
            const setScore = (txt) => p.evaluate((sel, t) => { document.querySelector(sel).textContent = t; }, g.scoreSelector, txt);
            await setScore('Score: 42');
            await p.waitForFunction(() => document.querySelector('[data-desafio]').shadowRoot.querySelector('.best b').textContent === '42', { timeout: 4000 });
            await setScore('Score: 10');
            await new Promise((r) => setTimeout(r, 400)); // o MutationObserver lê na hora; isto só dá folga
            assert.strictEqual((await overlay(p)).best, '42', `${g.slug}: placar menor não substitui o melhor`);
            await setScore('Pontos: 1.250');
            await p.waitForFunction(() => document.querySelector('[data-desafio]').shadowRoot.querySelector('.best b').textContent === '1250', { timeout: 4000 });
            const st = await stored(p);
            assert.deepStrictEqual(st.days[date], { slug: g.slug, best: 1250, live: date === today && date >= core.LAUNCH }, `${g.slug}: gravou o melhor do dia`);
            await shot(p, `overlay-${g.slug}`);

            // minimizar / reabrir
            const toggle = async (sel) => { const h = await p.evaluateHandle((s) => document.querySelector('[data-desafio]').shadowRoot.querySelector(s), sel); const b = await h.boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); };
            await toggle('.x');
            let t = await overlay(p);
            assert.ok(t.wrapHidden && !t.miniHidden, `${g.slug}: minimizou`);
            await toggle('.mini');
            t = await overlay(p);
            assert.ok(!t.wrapHidden && t.miniHidden, `${g.slug}: reabriu`);

            // compartilhar copia o texto; o foco não fica no botão (Espaço/Enter do jogo não podem apertá-lo de novo)
            await p.evaluate(() => { window.__copied = null; Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); try { navigator.clipboard.writeText = (x) => { window.__copied = x; return Promise.resolve(); }; } catch (e) { /* ok */ } });
            await toggle('.share');
            const text = await p.evaluate(() => window.__copied);
            assert.ok(text && text.includes('1250 pontos') && text.includes(g.name), `${g.slug}: texto de compartilhar: ${text}`);
            const focused = await p.evaluate(() => { const r = document.querySelector('[data-desafio]').shadowRoot; return Boolean(r.activeElement); });
            assert.strictEqual(focused, false, `${g.slug}: o foco não pode ficar em botão do overlay`);

            // o melhor do dia sobrevive a recarregar a página
            await p.reload({ waitUntil: 'domcontentloaded' });
            await p.waitForSelector('[data-desafio]');
            assert.strictEqual((await overlay(p)).best, '1250', `${g.slug}: restaurou o melhor do dia`);
            assert.deepStrictEqual(perrs.filter(ours), [], `${g.slug}: sem erros do overlay`);
            await p.close();
            console.log(`  ✓ ${g.slug}`);
        }

        // ================= 4) casos em que o overlay NÃO pode aparecer
        console.log('[4/6] Overlay inativo fora das regras ...');
        const clean = await browser.createBrowserContext(); // armazenamento limpo: nada das partidas anteriores
        const snake = core.gameBySlug('snake');
        let snakeDay = today;
        while (core.challengeFor(snakeDay).game.slug !== 'snake') snakeDay = core.addDays(snakeDay, -1);
        let otherDay = today;
        while (core.challengeFor(otherDay).game.slug === 'snake') otherDay = core.addDays(otherDay, -1);
        // "data futura" só prova a regra de futuro se for um dia em que o snake É o desafio (senão passaria por "jogo errado")
        let futureSnakeDay = core.addDays(today, 1);
        while (core.challengeFor(futureSnakeDay).game.slug !== 'snake') futureSnakeDay = core.addDays(futureSnakeDay, 1);
        const cases = {
            'sem o parâmetro': `${snake.play}`,
            'parâmetro vazio': `${snake.play}?desafio=`,
            'data inválida': `${snake.play}?desafio=2026-02-30`,
            'data futura (de um dia em que o snake é o desafio)': `${snake.play}?desafio=${futureSnakeDay}`,
            'data antiga demais': `${snake.play}?desafio=${core.addDays(snakeDay, -35)}`,
            'dia em que o desafio era outro jogo': `${snake.play}?desafio=${otherDay}`,
            'lixo no parâmetro': `${snake.play}?desafio=<script>alert(1)</script>`
        };
        await Promise.all(Object.entries(cases).map(async ([label, url]) => {
            const p = await clean.newPage();
            const perrs = track(p);
            await p.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded' });
            await new Promise((r) => setTimeout(r, 700));
            assert.strictEqual(await p.$('[data-desafio]'), null, `não deveria haver overlay: ${label}`);
            assert.strictEqual(await stored(p), null, `não deveria gravar nada: ${label}`);
            assert.deepStrictEqual(perrs.filter(ours), [], label);
            await p.close();
        }));
        // jogo fora do rodízio nunca carrega o overlay
        const chess = await clean.newPage();
        await chess.goto(`${BASE}/chess/?desafio=${today}`, { waitUntil: 'domcontentloaded' });
        assert.strictEqual(await chess.$('[data-desafio]'), null, 'xadrez não participa');
        assert.strictEqual(await chess.evaluate(() => typeof window.PHDesafio), 'undefined', 'e nem carrega o módulo');
        await chess.close();

        // o rótulo do botão volta ao normal mesmo com cliques seguidos (bug: guardava a mensagem como rótulo)
        {
            const p = await clean.newPage();
            await p.evaluateOnNewDocument(() => { window.PHDesafioConfig = { collapseMs: 0 }; });
            await p.setViewport({ width: 1100, height: 800 });
            await p.goto(`${BASE}${snake.play}?desafio=${snakeDay}`, { waitUntil: 'domcontentloaded' });
            await p.waitForSelector('[data-desafio]');
            const click = async () => { const h = await p.evaluateHandle(() => document.querySelector('[data-desafio]').shadowRoot.querySelector('.share')); const b = await h.boundingBox(); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); };
            await click(); await click(); // sem placar: "Jogue primeiro", duas vezes seguidas
            await p.waitForFunction(() => document.querySelector('[data-desafio]').shadowRoot.querySelector('.share').textContent === 'Compartilhar', { timeout: 4000 });
            await p.close();
        }

        // ================= 5) armazenamento indisponível não derruba o jogo
        console.log('[5/6] Sem localStorage ...');
        {
            const p = await clean.newPage();
            const perrs = track(p);
            await p.evaluateOnNewDocument(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqueado'); } }); });
            await p.goto(`${BASE}${snake.play}?desafio=${snakeDay}`, { waitUntil: 'domcontentloaded' });
            await p.waitForSelector('[data-desafio]', { timeout: 8000 });
            await p.evaluate(() => { document.querySelector('#score').textContent = 'Score: 7'; });
            await p.waitForFunction(() => document.querySelector('[data-desafio]').shadowRoot.querySelector('.best b').textContent === '7', { timeout: 4000 });
            assert.deepStrictEqual(perrs.filter(ours), [], 'sem erro mesmo sem armazenamento');
            await p.close();
        }

        // ================= 5b) recolhimento automático da pílula (padrão do produto: não cobrir o jogo)
        console.log('[5b] Recolhimento automático ...');
        {
            const p = await clean.newPage();
            await p.evaluateOnNewDocument(() => { window.PHDesafioConfig = { collapseMs: 400 }; });
            await p.goto(`${BASE}${snake.play}?desafio=${snakeDay}`, { waitUntil: 'domcontentloaded' });
            await p.waitForSelector('[data-desafio]');
            assert.strictEqual((await overlay(p)).wrapHidden, false, 'começa aberta');
            await p.waitForFunction(() => document.querySelector('[data-desafio]').shadowRoot.querySelector('.wrap').hidden === true, { timeout: 3000 });
            const o = await overlay(p);
            assert.ok(o.wrapHidden && !o.miniHidden, 'recolheu sozinha para o botão compacto');
            await p.evaluate(() => { document.querySelector('#score').textContent = 'Score: 33'; });
            await p.waitForFunction(() => document.querySelector('[data-desafio]').shadowRoot.querySelector('.mini b').textContent === '33', { timeout: 3000 });
            await p.close();
        }

        // ================= 6) o overlay não adiciona nada ao documento além do host (o texto fica no Shadow DOM)
        console.log('[6/6] O overlay não vaza para o documento do jogo ...');
        {
            const p = await clean.newPage();
            await p.setViewport({ width: 1100, height: 800 });
            await p.goto(`${BASE}${snake.play}?desafio=${snakeDay}`, { waitUntil: 'domcontentloaded' });
            await p.waitForSelector('[data-desafio]');
            assert.ok(await p.$('canvas'), 'canvas do jogo presente');
            const before = await p.evaluate(() => document.body.children.length);
            assert.ok(before > 1);
            // o único elemento que o overlay adiciona ao documento é o host (e o texto dele fica no shadow root)
            assert.strictEqual(await p.$$eval('[data-desafio]', (e) => e.length), 1);
            assert.ok(!(await p.evaluate(() => document.body.innerText)).includes('Compartilhar'), 'texto do overlay não vaza para fora do shadow DOM');
            await p.close();
        }
        // ================= 7) overlay em celular: nada pode ficar fora da tela
        console.log('[7] Overlay em celular ...');
        // 320 px é mais estreito do que qualquer fonte do sistema exigiria: prova que a pílula encolhe em vez de depender da fonte (no Linux da CI a fonte é mais larga)
        for (const width of [320, 360, 390]) {
            const p = await clean.newPage();
            await p.evaluateOnNewDocument(() => { window.PHDesafioConfig = { collapseMs: 0 }; });
            await p.setViewport({ width, height: 800, isMobile: true, hasTouch: true });
            await p.goto(`${BASE}${snake.play}?desafio=${snakeDay}`, { waitUntil: 'domcontentloaded' });
            await p.waitForSelector('[data-desafio]');
            const box = await p.evaluate(() => {
                const r = document.querySelector('[data-desafio]').shadowRoot;
                const rect = (sel) => { const b = r.querySelector(sel).getBoundingClientRect(); return { l: b.left, r: b.right, w: b.width }; };
                return { wrap: rect('.wrap'), x: rect('.x'), share: rect('.share'), link: getComputedStyle(r.querySelector('a.link')).display, vw: window.innerWidth };
            });
            assert.strictEqual(box.link, 'none', `${width}px: o link "Desafio" some em tela estreita`);
            assert.ok(box.wrap.l >= 0 && box.wrap.r <= box.vw, `${width}px: a pílula cabe na tela (${JSON.stringify(box.wrap)} em ${box.vw})`);
            assert.ok(box.x.r <= box.vw && box.share.r <= box.vw, `${width}px: botões dentro da tela`);
            await p.close();
        }

        // ================= 8) sem JavaScript a página não mostra o jogo errado
        console.log('[8] Página sem JavaScript ...');
        {
            const p = await clean.newPage();
            await p.setJavaScriptEnabled(false);
            await p.goto(`${BASE}/desafio/`, { waitUntil: 'domcontentloaded' });
            const vis = await p.evaluate(() => ({
                today: getComputedStyle(document.getElementById('today')).display,
                stats: getComputedStyle(document.getElementById('stats')).display,
                history: getComputedStyle(document.getElementById('history-section')).display
            }));
            assert.deepStrictEqual(vis, { today: 'none', stats: 'none', history: 'none' }, 'cards dependentes de JS ficam ocultos');
            assert.ok((await p.evaluate(() => document.body.innerText)).includes('Ative o JavaScript'), 'mostra o aviso');
            assert.strictEqual(await p.$$eval('.rotation a', (a) => a.length), 5, 'o rodízio (links para os jogos) aparece sem JS');
            await p.close();
        }

        // ================= 9) treino de um dia passado não conta para a sequência (na página)
        console.log('[9] Treino não estende a sequência ...');
        {
            const p = await clean.newPage();
            await p.setViewport({ width: 1100, height: 800 });
            await p.goto(`${BASE}/desafio/`, { waitUntil: 'domcontentloaded' });
            const yesterday = core.addDays(today, -1);
            await p.evaluate((k, t, y, slug, ySlug) => {
                localStorage.setItem(k, JSON.stringify({ version: 1, days: { [t]: { slug, best: 5, live: true }, [y]: { slug: ySlug, best: 9, live: false } } }));
            }, core.STORAGE_KEY, today, yesterday, todays.game.slug, core.challengeFor(yesterday).game.slug);
            await p.reload({ waitUntil: 'domcontentloaded' });
            assert.strictEqual(await p.$eval('#st-streak', (e) => e.textContent), '1 dia', 'ontem foi treino: a sequência é só hoje');
            await p.close();
        }

        await clean.close();
        console.log('\nQA do Desafio do Dia: todos os testes passaram');
    } finally {
        await browser.close();
        server.close();
    }
    process.exit(0);
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
