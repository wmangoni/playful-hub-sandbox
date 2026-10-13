// Auditoria de contraste do ded (WCAG 2.2 AA), sem axe: para cada texto à vista,
// a cor computada (com a opacidade dos ancestrais) contra o fundo REALMENTE
// pintado, amostrado de uma captura com todo o texto transparente
// (-webkit-text-fill-color) e sem sombras de texto. Do fundo em volta dos traços de
// cada texto saem os percentis 10 e 90 da luminância; vale a pior razão (a média dos
// decis extremos fica de referência na tabela).
// Também mede o anel de foco e algumas peças não textuais (as barras de vida, os ícones dos
// selos e, em todos os medalhões do mapa e da legenda, a peça que distingue cada estado).
//
//   node ded/tools/contraste.mjs <saida> [--tamanhos 1920x1080,390x844] [--so estado1,estado2] [--raiz <repo>]
//
// Grava <saida>/resultados.json, <saida>/tabela.md (todas as medições, das piores para as
// melhores) e a captura de cada estado. Os controles desabilitados (inativos) saem marcados e
// são isentos (WCAG 1.4.3). Feita na Fase 5 (TASK_001 §12); rode depois de mexer em cores,
// fundos, anéis de foco ou no layout do celular.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const args = process.argv.slice(2);
const saida = path.resolve(args[0] || 'auditoria');
const opc = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const TAMANHOS = (opc('--tamanhos') || '1920x1080,390x844').split(',').map(t => t.split('x').map(Number));
const SO = opc('--so') ? new Set(opc('--so').split(',')) : null;
fs.mkdirSync(saida, { recursive: true });
const RAIZ = path.resolve(opc('--raiz') || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..'));
const espera = ms => new Promise(r => setTimeout(r, ms));

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.woff2': 'font/woff2', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    fs.readFile(path.join(RAIZ, p), (e, d) => {
        if (e) { r.writeHead(404); return r.end(); }
        r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
        r.end(d);
    });
});
await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
const BASE = `http://127.0.0.1:${srv.address().port}`;

const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--disable-gpu', '--disable-gpu-rasterization', '--force-color-profile=srgb', '--autoplay-policy=user-gesture-required']
});
// página auxiliar: decodifica as capturas e amostra os pixels
const aux = await browser.newPage();

const erros = [];
async function novaPagina(w, h) {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    page.once('close', () => ctx.close().catch(() => {}));
    await page.setRequestInterception(true);
    page.on('request', r => (/googletagmanager|google-analytics|\.mp3(\?|$)/.test(r.url()) ? r.abort() : r.continue()));
    page.on('pageerror', e => erros.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) erros.push('console: ' + m.text()); });
    page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('favicon.ico')) erros.push(`${r.status()} ${r.url()}`); });
    await page.setViewport({ width: w, height: h });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    await page.goto(BASE + '/ded/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof scenes === 'object' && Object.keys(scenes).length > 50 && document.getElementById('image').complete, { timeout: 20000 });
    await page.evaluate(() => document.fonts.ready);
    // A captura do celular é a página inteira: a barra presa no rodapé da seleção (sticky)
    // cairia no fim da primeira tela, por cima dos cards, e o texto deles seria medido
    // contra ela. No celular de verdade, o que fica embaixo da barra está coberto.
    if (w < 800) await page.addStyleTag({ content: '.tela-selecao .selecao-acao { position: static !important; }' });
    await espera(400);
    return page;
}

// ---------------------------------------------------------------------------
// No navegador: os textos à vista, com cor, tamanho e caixas
function coletar() {
    const itens = [];
    const modal = document.querySelector('dialog.janela[open]');
    const raizes = [];
    if (modal) raizes.push(modal);
    else raizes.push(...document.querySelectorAll('.folha:not(.hidden):not(.tela-em-espera)'));
    const avisos = document.getElementById('avisos');
    if (avisos && avisos.matches(':popover-open')) raizes.push(avisos);
    const sx = scrollX, sy = scrollY;

    const opacidade = el => { let o = 1; for (let e = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o; };
    // recorte pelos ancestrais com overflow
    const recorte = el => {
        let r = { x0: -1e9, y0: -1e9, x1: 1e9, y1: 1e9 };
        for (let e = el.parentElement; e; e = e.parentElement) {
            const cs = getComputedStyle(e);
            if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
                const b = e.getBoundingClientRect();
                const x0 = b.left + e.clientLeft, y0 = b.top + e.clientTop;
                r = { x0: Math.max(r.x0, x0), y0: Math.max(r.y0, y0), x1: Math.min(r.x1, x0 + e.clientWidth), y1: Math.min(r.y1, y0 + e.clientHeight) };
            }
        }
        return r;
    };
    const nome = el => {
        const um = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + [...e.classList].slice(0, 3).map(c => '.' + c).join('');
        let s = um(el);
        for (let e = el.parentElement, n = 0; e && n < 3; e = e.parentElement) {
            if (e.id || e.classList.length) { s = um(e) + ' > ' + s; n++; if (e.id) break; }
        }
        return s;
    };
    const desabilitado = el => !!el.closest('[aria-disabled="true"], :disabled');
    // o que o popover dos avisos cobre não conta (o aviso fica por cima)
    const cobertas = avisos && avisos.matches(':popover-open') ? [...avisos.querySelectorAll('.aviso:not([hidden])')].map(a => a.getBoundingClientRect()) : [];
    const coberta = (b, el) => !avisos.contains(el) && cobertas.some(c => b.x0 < c.right && b.x1 > c.left && b.y0 < c.bottom && b.y1 > c.top);
    const caixas = (rects, clip, el) => rects.map(r => ({
        x0: Math.max(r.left, clip.x0), y0: Math.max(r.top, clip.y0), x1: Math.min(r.right, clip.x1), y1: Math.min(r.bottom, clip.y1)
    })).filter(b => b.x1 - b.x0 >= 2 && b.y1 - b.y0 >= 4 && !(el && cobertas.length && coberta(b, el))).map(b => [b.x0 + sx, b.y0 + sy, b.x1 + sx, b.y1 + sy]);

    const porEl = new Map();
    const juntar = (el, rects, texto, estilo) => {
        const chave = el;
        if (!porEl.has(chave)) porEl.set(chave, { el, rects: [], texto: '', estilo });
        const it = porEl.get(chave);
        it.rects.push(...rects);
        it.texto += texto;
    };
    for (const raiz of raizes) {
        const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = w.nextNode())) {
            if (!n.data.trim()) continue;
            const el = n.parentElement;
            const cs = getComputedStyle(el);
            if (cs.visibility !== 'visible' || cs.display === 'none') continue;
            if (el.closest('.so-leitor, [hidden], script, style, noscript')) continue;
            const clip = recorte(el);
            // capitular (::first-letter) do texto da cena: medida à parte
            let inicio = 0;
            if (el.id === 'scene-text' && n === el.firstChild || (el.parentElement && el.parentElement.id === 'scene-text' && el === el.parentElement.firstElementChild && n === el.firstChild)) {
                const cena = document.getElementById('scene-text');
                const fl = getComputedStyle(cena, '::first-letter');
                const k = n.data.search(/\S/);
                if (k >= 0) {
                    const rr = document.createRange(); rr.setStart(n, k); rr.setEnd(n, k + 1);
                    const b = caixas([...rr.getClientRects()], clip, cena);
                    if (b.length) juntar({ capitular: true, el: cena }, b, n.data[k], fl);
                    inicio = k + 1;
                }
            }
            const r = document.createRange();
            r.setStart(n, inicio); r.setEnd(n, n.data.length);
            const b = caixas([...r.getClientRects()], clip, el);
            if (b.length) juntar(el, b, n.data.slice(inicio), null);
        }
        // textos de ::before (as listas vazias)
        raiz.querySelectorAll('*').forEach(el => {
            const ps = getComputedStyle(el, '::before');
            if (!/^".*[a-zA-Zà-ú].*"$/.test(ps.content)) return;
            if (getComputedStyle(el).visibility !== 'visible') return;
            const b = el.getBoundingClientRect();
            const lh = parseFloat(ps.lineHeight) || parseFloat(ps.fontSize) * 1.4;
            const bb = caixas([{ left: b.left, top: b.top, right: b.right, bottom: b.top + lh }], recorte(el), el);
            if (bb.length) juntar({ antes: true, el }, bb, ps.content.slice(1, -1), ps);
        });
    }

    for (const [chave, it] of porEl) {
        const el = chave.el && (chave.capitular || chave.antes) ? chave.el : chave;
        const cs = it.estilo || getComputedStyle(el);
        const op = opacidade(el);
        if (op < 0.05) continue;
        const tam = parseFloat(cs.fontSize);
        const peso = Number(cs.fontWeight) || 400;
        const grande = tam >= 24 || (tam >= 18.66 && peso >= 700);
        itens.push({
            elemento: nome(el) + (chave.capitular ? '::first-letter' : chave.antes ? '::before' : ''),
            texto: it.texto.replace(/\s+/g, ' ').trim().slice(0, 48),
            cor: cs.color,
            preenchimento: cs.webkitTextFillColor,
            opacidade: Math.round(op * 1000) / 1000,
            fonte: `${Math.round(tam * 10) / 10}px ${peso}${cs.fontStyle === 'italic' ? ' it' : ''} ${cs.fontFamily.split(',')[0].replace(/['"]/g, '')}`,
            grande,
            sombra: cs.textShadow !== 'none',
            inativo: desabilitado(el),
            rects: it.rects
        });
    }
    return itens;
}

// ---------------------------------------------------------------------------
// Captura com e sem texto, e amostragem na página auxiliar
const SEM_TEXTO = `*, *::before, *::after, *::first-letter, *::first-line, *::marker {
    -webkit-text-fill-color: transparent !important; text-shadow: none !important; caret-color: transparent !important; }`;

async function capturas(page, inteira) {
    const com = await page.screenshot({ encoding: 'base64', fullPage: inteira, captureBeyondViewport: inteira });
    const h = await page.addStyleTag({ content: SEM_TEXTO });
    await espera(60);
    const sem = await page.screenshot({ encoding: 'base64', fullPage: inteira, captureBeyondViewport: inteira });
    await h.evaluate(e => e.remove());
    await espera(30);
    return { com, sem };
}

async function amostrar(com, sem, itens) {
    return aux.evaluate(async (uc, us, itens) => {
        const carrega = u => new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = u; });
        const [ic, is] = await Promise.all([carrega('data:image/png;base64,' + uc), carrega('data:image/png;base64,' + us)]);
        const px = img => { const c = new OffscreenCanvas(img.width, img.height); const g = c.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, img.width, img.height).data; };
        const [pc, ps] = [px(ic), px(is)];
        const W = is.width, H = is.height;
        const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        const razao = (a, b) => { const [x, y] = a > b ? [a, b] : [b, a]; return (x + 0.05) / (y + 0.05); };
        const parse = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return [0, 0, 0, 1]; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
        const media = arr => { const s = [0, 0, 0]; arr.forEach(p => { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; }); return s.map(v => Math.round(v / arr.length)); };
        const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
        // O fundo que conta é o que fica em volta dos traços: os pixels a até R px de um
        // pixel do glifo (a caixa da linha inteira pegaria bordas e filetes vizinhos)
        const R = 3;
        return itens.map(it => {
            const fundo = [], glifo = [], todos = [];
            for (const [x0, y0, x1, y1] of it.rects) {
                const X0 = Math.max(0, Math.floor(x0)), Y0 = Math.max(0, Math.floor(y0));
                const X1 = Math.min(W, Math.ceil(x1)), Y1 = Math.min(H, Math.ceil(y1));
                const w = X1 - X0, h = Y1 - Y0;
                if (w <= 0 || h <= 0) continue;
                const marca = new Uint8Array(w * h);
                for (let y = Y0; y < Y1; y++) {
                    for (let x = X0; x < X1; x++) {
                        const i = (y * W + x) * 4;
                        const f = [ps[i], ps[i + 1], ps[i + 2]];
                        todos.push(f);
                        const d = Math.max(Math.abs(pc[i] - ps[i]), Math.abs(pc[i + 1] - ps[i + 1]), Math.abs(pc[i + 2] - ps[i + 2]));
                        if (d > 24) { glifo.push([pc[i], pc[i + 1], pc[i + 2], d, f]); marca[(y - Y0) * w + (x - X0)] = 1; }
                    }
                }
                // dilata a máscara dos glifos
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        let perto = false;
                        for (let dy = -R; dy <= R && !perto; dy++) {
                            const yy = y + dy; if (yy < 0 || yy >= h) continue;
                            for (let dx = -R; dx <= R; dx++) {
                                const xx = x + dx; if (xx < 0 || xx >= w) continue;
                                if (marca[yy * w + xx]) { perto = true; break; }
                            }
                        }
                        if (perto) { const i = ((y + Y0) * W + (x + X0)) * 4; fundo.push([ps[i], ps[i + 1], ps[i + 2]]); }
                    }
                }
            }
            if (!fundo.length) fundo.push(...todos);
            if (!fundo.length) return { ...it, semAmostra: true };
            fundo.sort((a, b) => lum(...a) - lum(...b));
            const dec = Math.max(1, Math.round(fundo.length * 0.1));
            // o fundo robusto: os percentis 10 e 90 (a média dos decis extremos fica de referência)
            const escuro = fundo[Math.floor(fundo.length * 0.1)], claro = fundo[Math.min(fundo.length - 1, Math.floor(fundo.length * 0.9))], mediano = fundo[Math.floor(fundo.length / 2)];
            const decilEscuro = media(fundo.slice(0, dec)), decilClaro = media(fundo.slice(-dec));
            const cor = parse(it.preenchimento && !/rgba\(0, 0, 0, 0\)/.test(it.preenchimento) && it.preenchimento !== it.cor ? it.preenchimento : it.cor);
            const alfa = cor[3] * it.opacidade;
            const sobre = bg => cor.slice(0, 3).map((v, k) => v * alfa + bg[k] * (1 - alfa));
            const rEsc = razao(lum(...sobre(escuro)), lum(...escuro));
            const rCla = razao(lum(...sobre(claro)), lum(...claro));
            // o que a captura mostra: os 10% de pixels do glifo mais distantes do fundo
            let medido = null;
            if (glifo.length > 6) {
                glifo.sort((a, b) => b[3] - a[3]);
                const nucleo = glifo.slice(0, Math.max(3, Math.round(glifo.length * 0.1)));
                const cg = media(nucleo), cf = media(nucleo.map(g => g[4]));
                medido = { cor: hex(cg), fundo: hex(cf), razao: Math.round(razao(lum(...cg), lum(...cf)) * 100) / 100 };
            }
            const exigido = it.grande ? 3 : 4.5;
            const pior = Math.min(rEsc, rCla);
            return {
                ...it, rects: undefined,
                fundoEscuro: hex(escuro), fundoClaro: hex(claro), fundoMediano: hex(mediano),
                corEfetiva: hex(sobre(mediano)),
                decis: `${hex(decilEscuro)} / ${hex(decilClaro)}`, razaoDecis: Math.round(Math.min(razao(lum(...sobre(decilEscuro)), lum(...decilEscuro)), razao(lum(...sobre(decilClaro)), lum(...decilClaro))) * 100) / 100,
                razao: Math.round(pior * 100) / 100, razaoEscuro: Math.round(rEsc * 100) / 100, razaoClaro: Math.round(rCla * 100) / 100,
                exigido, passa: pior >= exigido, medido
            };
        });
    }, com, sem, itens);
}

const resultados = [];
async function auditar(page, estado, tamanho, { inteira = false } = {}) {
    if (SO && !SO.has(estado)) return;
    // as animações finitas terminam; as infinitas param no começo (como em capturas.mjs)
    await page.evaluate(() => {
        document.getAnimations().forEach(a => { if (a.effect.getTiming().iterations === Infinity) { a.pause(); a.currentTime = 0; } else a.finish(); });
    });
    await espera(120);
    const marca = () => page.evaluate(() => JSON.stringify([gameState.currentScene, gameState.combat && gameState.combat.active, gameState.combat && gameState.combat.turn, gameState.player.health, document.querySelectorAll('#combat-log-text li').length, document.querySelectorAll('#game-log li').length]));
    const antes = await marca();
    const itens = await page.evaluate(coletar);
    const { com, sem } = await capturas(page, inteira);
    if ((await marca()) !== antes) { console.log(`AVISO: ${estado}-${tamanho} mudou durante a captura`); erros.push(`${estado}-${tamanho} mudou durante a captura`); }
    fs.writeFileSync(path.join(saida, `${estado}-${tamanho}.png`), Buffer.from(com, 'base64'));
    const medidos = await amostrar(com, sem, itens);
    medidos.forEach(m => resultados.push({ estado, tamanho, ...m }));
    const falhas = medidos.filter(m => !m.passa && !m.semAmostra);
    console.log(`${estado}-${tamanho}: ${medidos.length} textos, ${falhas.length} abaixo do exigido`);
}

// ---------------------------------------------------------------------------
// Anel de foco e peças não textuais: cor da peça contra o fundo amostrado em volta
async function anelDeFoco(page, estado, tamanho, seletor, { desc } = {}) {
    const inteira = tamanho.startsWith('390');
    if (SO && !SO.has(estado)) return;
    const ok = await page.evaluate(s => { const el = document.querySelector(s); if (!el) return false; el.focus(); return el.matches(':focus-visible'); }, seletor);
    if (!ok) { resultados.push({ estado, tamanho, naoTexto: true, elemento: seletor, erro: 'sem foco visível' }); return; }
    await espera(250);
    // a caixa do anel (outline ou box-shadows espalhadas), as cores e as distâncias
    const info = await page.evaluate(s => {
        const el = document.querySelector(s);
        const alvo = el.matches('.selo') ? el.querySelector('svg') : el.matches('.mapa-no') ? el.querySelector('.mapa-medalhao') : el.closest('.card-heroi') || el;
        const cs = getComputedStyle(alvo);
        const b = alvo.getBoundingClientRect();
        const aneis = []; // [cor, de, ate] em px a partir da borda
        // um contorno transparente é o do modo de alto contraste: o anel são as sombras
        const transparente = /rgba\(.*,\s*0\)$|transparent/.test(cs.outlineColor);
        if (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 && !transparente) {
            const off = parseFloat(cs.outlineOffset), w = parseFloat(cs.outlineWidth);
            aneis.push([cs.outlineColor, off, off + w]);
        } else if (cs.boxShadow !== 'none') {
            let de = 0;
            for (const m of cs.boxShadow.matchAll(/(rgba?\([^)]+\))\s+0px\s+0px\s+0px\s+([\d.]+)px/g)) { aneis.push([m[1], de, parseFloat(m[2])]); de = parseFloat(m[2]); }
        }
        return { aneis, semBaixo: el.matches('.selo, .mapa-no'), semCima: !!el.closest('.card-heroi') || el.matches('.mapa-no'), b: { l: b.left + scrollX, t: b.top + scrollY, r: b.right + scrollX, bt: b.bottom + scrollY } };
    }, seletor);
    if (!info.aneis.length) { resultados.push({ estado, tamanho, naoTexto: true, elemento: seletor, erro: 'sem anel' }); return; }
    // o fundo sem o texto, como no texto: num link no meio da frase, as letras vizinhas não são fundo
    const h = await page.addStyleTag({ content: SEM_TEXTO });
    await espera(60);
    const tela = await page.screenshot({ encoding: 'base64', fullPage: inteira, captureBeyondViewport: inteira });
    await h.evaluate(e => e.remove());
    const r = await aux.evaluate(async (u, info) => {
        const img = await new Promise((ok, e) => { const i = new Image(); i.onload = () => ok(i); i.onerror = e; i.src = 'data:image/png;base64,' + u; });
        const c = new OffscreenCanvas(img.width, img.height); const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, img.width, img.height).data, W = img.width, H = img.height;
        const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        const razao = (a, b) => { const [x, y] = a > b ? [a, b] : [b, a]; return (x + 0.05) / (y + 0.05); };
        const { b } = info;
        const mx = (b.l + b.r) / 2, my = (b.t + b.bt) / 2, lw = Math.min(6, (b.r - b.l) * 0.3), lh = Math.min(6, (b.bt - b.t) * 0.3);
        // faixa a uma distância [de, ate] da borda, nos quatro lados, em volta das linhas do centro
        const faixa = (de, ate) => {
            const out = [];
            const pega = (x, y) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; out.push([d[i], d[i + 1], d[i + 2]]); };
            for (let t = de; t <= ate; t += 1) {
                for (let x = mx - lw; x <= mx + lw; x++) { if (!info.semCima) pega(x, b.t - t); if (!info.semBaixo) pega(x, b.bt - 1 + t); }
                for (let y = my - lh; y <= my + lh; y++) { pega(b.l - t, y); pega(b.r - 1 + t, y); }
            }
            return out;
        };
        const decis = arr => {
            if (!arr.length) return [[NaN, NaN, NaN], [NaN, NaN, NaN]];
            arr.sort((a, c) => lum(...a) - lum(...c));
            const dec = Math.max(1, Math.round(arr.length * 0.1));
            const med = v => { const s = [0, 0, 0]; v.forEach(p => { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; }); return s.map(x => x / v.length); };
            return [med(arr.slice(0, dec)), med(arr.slice(-dec))];
        };
        const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
        const rgb = s => s.match(/rgba?\(([^)]+)\)/)[1].split(/[ ,/]+/).filter(Boolean).map(Number).slice(0, 3);
        const ultimo = info.aneis[info.aneis.length - 1][2];
        const [foraE, foraC] = decis(faixa(ultimo + 1.5, ultimo + 4.5));
        const primeiro = info.aneis[0][1];
        const [dentroE, dentroC] = decis(faixa(primeiro - 3.5, primeiro - 1.5));
        // O anel se vê contra cada lado de fora (o decil escuro e o claro) se algum dos
        // anéis tem 3:1 contra tudo o que fica do lado de fora dele (os anéis de fora e
        // o fundo). Assim um anel de três cores sobre o fundo escuro e o claro passa
        // pelo anel do meio num lado e pelo de fora no outro (técnica C40 generalizada).
        const Ls = info.aneis.map(([cor]) => lum(...rgb(cor)));
        const lado = fundoL => {
            let melhor = 0;
            for (let i = 0; i < Ls.length; i++) {
                let pior = razao(Ls[i], fundoL);
                for (let j = i + 1; j < Ls.length; j++) pior = Math.min(pior, razao(Ls[i], Ls[j]));
                melhor = Math.max(melhor, pior);
            }
            return melhor;
        };
        const rE = lado(lum(...foraE)), rC = lado(lum(...foraC));
        const aneis = info.aneis.map(([cor]) => {
            const L = lum(...rgb(cor));
            return { cor: hex(rgb(cor)), fora: Math.round(Math.min(razao(L, lum(...foraE)), razao(L, lum(...foraC))) * 100) / 100,
                dentro: Number.isFinite(dentroE[0]) ? Math.round(Math.min(razao(L, lum(...dentroE)), razao(L, lum(...dentroC))) * 100) / 100 : null };
        });
        return { cor: aneis.map(a => a.cor).join(' + '), fundoEscuro: hex(foraE), fundoClaro: hex(foraC), dentro: Number.isFinite(dentroE[0]) ? `${hex(dentroE)} / ${hex(dentroC)}` : '',
            razao: Math.round(Math.min(rE, rC) * 100) / 100, aneis: aneis.map(a => `${a.cor}: fora ${a.fora}, dentro ${a.dentro}`).join('; ') };
    }, tela, info);
    resultados.push({ estado, tamanho, naoTexto: true, elemento: `foco ${seletor}`, desc: desc || 'anel de foco', ...r, exigido: 3, passa: r.razao >= 3 });
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
}

// ---------------------------------------------------------------------------
// Peças não textuais por pares de pontos (cor média 3x3 de cada ponto), e ícones
// pelo mesmo método do texto (com e sem o <use>)
async function pares(page, estado, tamanho, gerar) {
    if (SO && !SO.has(estado)) return;
    await espera(150);
    const inteira = tamanho.startsWith('390');
    const lista = (await page.evaluate(gerar)).map(p => ({ ...p, a: p.a, b: p.b }));
    const tela = await page.screenshot({ encoding: 'base64', fullPage: inteira, captureBeyondViewport: inteira });
    const r = await aux.evaluate(async (u, lista) => {
        const img = await new Promise((ok, e) => { const i = new Image(); i.onload = () => ok(i); i.onerror = e; i.src = 'data:image/png;base64,' + u; });
        const c = new OffscreenCanvas(img.width, img.height); const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, img.width, img.height).data, W = img.width;
        const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        const razao = (a, b) => { const [x, y] = a > b ? [a, b] : [b, a]; return (x + 0.05) / (y + 0.05); };
        const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
        const cor = ([x, y]) => { const s = [0, 0, 0]; let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const i = ((Math.round(y) + dy) * W + Math.round(x) + dx) * 4; s[0] += d[i]; s[1] += d[i + 1]; s[2] += d[i + 2]; n++; } return s.map(v => v / n); };
        return lista.map(p => { const a = cor(p.a), b = cor(p.b); return { desc: p.desc, cor: hex(a), fundoEscuro: hex(b), fundoClaro: hex(b), razao: Math.round(razao(lum(...a), lum(...b)) * 100) / 100, exigido: p.exigido || 3 }; });
    }, tela, lista);
    r.forEach(x => resultados.push({ estado, tamanho, naoTexto: true, elemento: x.desc, ...x, passa: x.razao >= x.exigido }));
}

const SEM_ICONE = 'svg.__sem-icone use { visibility: hidden !important; }';
async function icones(page, estado, tamanho, seletores) {
    if (SO && !SO.has(estado)) return;
    await espera(150);
    const itens = await page.evaluate(sels => {
        const out = [];
        for (const s of sels) document.querySelectorAll(s).forEach((svg, k) => {
            const b = svg.getBoundingClientRect();
            if (!b.width) return;
            let op = 1; for (let e = svg; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
            svg.classList.add('__sem-icone-alvo');
            const cs = getComputedStyle(svg);
            out.push({ elemento: `ícone ${s}${k ? ` #${k + 1}` : ''}`, texto: svg.closest('[aria-label]')?.getAttribute('aria-label') || svg.parentElement.textContent.trim().slice(0, 30), cor: cs.color, preenchimento: '', opacidade: op, fonte: 'ícone', grande: true, rects: [[b.left + scrollX, b.top + scrollY, b.right + scrollX, b.bottom + scrollY]] });
        });
        return out;
    }, seletores);
    const inteira = tamanho.startsWith('390');
    const com = await page.screenshot({ encoding: 'base64', fullPage: inteira, captureBeyondViewport: inteira });
    await page.evaluate(() => document.querySelectorAll('.__sem-icone-alvo').forEach(s => s.classList.add('__sem-icone')));
    const h = await page.addStyleTag({ content: SEM_ICONE });
    await espera(60);
    const sem = await page.screenshot({ encoding: 'base64', fullPage: inteira, captureBeyondViewport: inteira });
    await h.evaluate(e => e.remove());
    await page.evaluate(() => document.querySelectorAll('.__sem-icone-alvo').forEach(s => s.classList.remove('__sem-icone', '__sem-icone-alvo')));
    const medidos = await amostrar(com, sem, itens);
    medidos.forEach(m => resultados.push({ estado, tamanho, naoTexto: true, ...m }));
}

// barra de vida (a da ficha ou a do inimigo): o preenchimento contra o vazio
const parBarra = (sel, desc) => new Function(`
    const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return [];
    const b = el.getBoundingClientRect(), v = parseFloat(getComputedStyle(el).getPropertyValue('--v'));
    const y = b.top + b.height / 2;
    return [{ desc: ${JSON.stringify(desc)} + ' (cheio contra vazio, vida ' + Math.round(v * 100) + '%)', a: [b.left + scrollX + b.width * v * 0.45, y + scrollY], b: [b.left + scrollX + b.width * (v + (1 - v) * 0.55), y + scrollY] }];`);

// Medalhões do mapa e da legenda, todos: a peça de fora de cada estado (a cor computada: o anel
// escuro do "pode ir" e do atual, a borda dos outros) contra o fundo em volta, um anel de 3 a 8 px
// fora do medalhão, em todos os ângulos, tirado de uma captura sem os medalhões, os caminhos, as
// alavancas e o texto. Vale o pior de P10 e P90, como no texto. O miolo em bronze do visitado não
// encosta no fundo (fica dentro da borda de tinta): ele é o que o separa do "não visitado" e do
// "pode ir", e é medido contra o miolo deles. No celular, a carta rola dentro da janela: mede por
// trechos.
const SEM_MAPA = SEM_TEXTO + '\n#mapa .mapa-caminhos, #mapa .mapa-alavanca, #mapa .mapa-medalhao { visibility: hidden !important; }';
async function medalhoes(page, estado, tamanho) {
    if (SO && !SO.has(estado)) return;
    await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); }); // o mapa abre com o foco no lugar atual
    const feitos = new Set();
    let total = 0;
    for (let trecho = 0; trecho < 30; trecho++) {
        await espera(150);
        const lista = await page.evaluate(feitos => {
            // o color-mix() sai como color(srgb r g b)
            const paraRgb = s => { const m = s.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/); return m ? `rgba(${m[1] * 255}, ${m[2] * 255}, ${m[3] * 255}, ${m[4] ?? 1})` : s; };
            const miolo = est => paraRgb(getComputedStyle(document.querySelector(`#mapa .mapa-legenda [data-estado="${est}"] > .mapa-medalhao`)).backgroundColor);
            const miolos = { visitado: miolo('visitado'), desconhecido: miolo('desconhecido'), 'pode-ir': miolo('pode-ir') };
            const corpo = document.querySelector('#mapa .janela-corpo').getBoundingClientRect();
            const todos = [...document.querySelectorAll('#mapa .mapa-medalhao')];
            const out = [];
            todos.forEach((m, k) => {
                if (feitos.includes(k)) return;
                const dono = m.closest('[data-estado]'), est = dono.dataset.estado, legenda = !!m.closest('.mapa-legenda');
                const b = m.getBoundingClientRect(), cs = getComputedStyle(m);
                const R = b.width / 2, cx = b.left + R, cy = b.top + b.height / 2;
                // só o que está inteiro à vista, com o anel do fundo
                const lim = legenda ? { left: 0, top: 0, right: innerWidth, bottom: innerHeight } : corpo, f = 12;
                if (!b.width || cx - R - f < Math.max(0, lim.left) || cy - R - f < Math.max(0, lim.top) || cx + R + f > Math.min(innerWidth, lim.right) || cy + R + f > Math.min(innerHeight, lim.bottom)) return;
                let op = 1; for (let e = m; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
                const sombra = cs.boxShadow.match(/^(rgba?\([^)]+\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px/);
                let cor, peca, extra = 0;
                if ((est === 'pode-ir' || est === 'atual') && sombra) { cor = sombra[1]; extra = Number(sombra[5]); peca = 'o anel escuro de fora'; }
                else { cor = cs.borderTopColor; peca = 'a borda'; }
                const nome = legenda ? dono.textContent.trim() : (dono.querySelector('.mapa-no-nome')?.textContent.trim() || '');
                out.push({ k, elemento: `${legenda ? 'legenda' : 'mapa'}: "${est}", ${peca}`, desc: nome, cor: paraRgb(cor), op, cx, cy, de: R + extra + 3, ate: R + extra + 8 });
            });
            return { out, total: todos.length, miolos };
        }, [...feitos]);
        total = lista.total;
        if (trecho === 0) {
            const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
            const rgb = s => s.match(/rgba?\(([^)]+)\)/)[1].split(/[ ,/]+/).filter(Boolean).map(Number).slice(0, 3);
            const lum = s => { const [r, g, b] = rgb(s).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
            const hex = s => '#' + rgb(s).map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
            const razao = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            const { visitado, desconhecido } = lista.miolos, podeIr = lista.miolos['pode-ir'];
            const rD = razao(lum(visitado), lum(desconhecido)), rP = razao(lum(visitado), lum(podeIr));
            const r = Math.round(Math.min(rD, rP) * 100) / 100;
            resultados.push({ estado, tamanho, naoTexto: true, elemento: 'mapa: "visitado", o miolo em bronze contra o miolo dos outros', desc: '"não visitado" e "pode ir" (cores computadas)',
                cor: hex(visitado), fundoEscuro: hex(desconhecido), fundoClaro: hex(podeIr), razao: r, razaoEscuro: Math.round(rD * 100) / 100, razaoClaro: Math.round(rP * 100) / 100, exigido: 3, passa: r >= 3 });
        }
        if (lista.out.length) {
            const h = await page.addStyleTag({ content: SEM_MAPA });
            await espera(60);
            const fundo = await page.screenshot({ encoding: 'base64' });
            await h.evaluate(e => e.remove());
            fs.writeFileSync(path.join(saida, `${estado}-fundo-dos-medalhoes-${tamanho}-${trecho + 1}.png`), Buffer.from(fundo, 'base64'));
            const r = await aux.evaluate(async (u, lista) => {
                const img = await new Promise((ok, e) => { const i = new Image(); i.onload = () => ok(i); i.onerror = e; i.src = 'data:image/png;base64,' + u; });
                const c = new OffscreenCanvas(img.width, img.height); const g = c.getContext('2d'); g.drawImage(img, 0, 0);
                const d = g.getImageData(0, 0, img.width, img.height).data, W = img.width, H = img.height;
                const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
                const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
                const razao = (a, b) => { const [x, y] = a > b ? [a, b] : [b, a]; return (x + 0.05) / (y + 0.05); };
                const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
                const rgb = s => s.match(/rgba?\(([^)]+)\)/)[1].split(/[ ,/]+/).filter(Boolean).map(Number);
                return lista.map(p => {
                    const anel = [];
                    for (let y = Math.floor(p.cy - p.ate); y <= Math.ceil(p.cy + p.ate); y++) {
                        for (let x = Math.floor(p.cx - p.ate); x <= Math.ceil(p.cx + p.ate); x++) {
                            if (x < 0 || y < 0 || x >= W || y >= H) continue;
                            const dist = Math.hypot(x + 0.5 - p.cx, y + 0.5 - p.cy);
                            if (dist >= p.de && dist <= p.ate) { const i = (y * W + x) * 4; anel.push([d[i], d[i + 1], d[i + 2]]); }
                        }
                    }
                    anel.sort((a, b) => lum(...a) - lum(...b));
                    const escuro = anel[Math.floor(anel.length * 0.1)], claro = anel[Math.min(anel.length - 1, Math.floor(anel.length * 0.9))];
                    const [r0, g0, b0, a0 = 1] = rgb(p.cor), alfa = a0 * p.op;
                    const sobre = bg => [r0, g0, b0].map((v, k) => v * alfa + bg[k] * (1 - alfa));
                    const rEsc = razao(lum(...sobre(escuro)), lum(...escuro)), rCla = razao(lum(...sobre(claro)), lum(...claro));
                    return { k: p.k, elemento: p.elemento, desc: p.desc, cor: hex(sobre(escuro)), fundoEscuro: hex(escuro), fundoClaro: hex(claro),
                        razao: Math.round(Math.min(rEsc, rCla) * 100) / 100, razaoEscuro: Math.round(rEsc * 100) / 100, razaoClaro: Math.round(rCla * 100) / 100, pixels: anel.length };
                });
            }, fundo, lista.out);
            r.forEach(({ k, ...x }) => { feitos.add(k); resultados.push({ estado, tamanho, naoTexto: true, ...x, exigido: 3, passa: x.razao >= 3 }); });
        }
        // o próximo trecho da carta (no desktop ela cabe inteira e o laço para aqui)
        const rolou = await page.evaluate(() => { const c = document.querySelector('#mapa .janela-corpo'); const antes = c.scrollTop; c.scrollTop += c.clientHeight * 0.6; return c.scrollTop !== antes; });
        if (!rolou || feitos.size === total) break;
    }
    await page.evaluate(() => { document.querySelector('#mapa .janela-corpo').scrollTop = 0; });
    if (feitos.size !== total) erros.push(`${estado}-${tamanho}: ${total - feitos.size} de ${total} medalhões do mapa não ficaram inteiros à vista`);
}

// ---------------------------------------------------------------------------
// Os estados do jogo
const GOBLIN = { name: 'Goblin', ac: 10, hp: 12, max_hp: 12, str: 10, dex: 10, con: 10, bba: 1 };
const CHEFE = { name: 'Fantasma de Drakmor', ac: 18, hp: 40, max_hp: 40, str: 16, dex: 14, con: 10, bba: 4 };

async function comecar(page, classe) {
    await page.evaluate(c => { ttsEnabled = false; selectCharacter(c); startGame(); }, classe);
    await espera(150);
    await page.evaluate(() => { skipTyping = true; });
    await espera(350);
}
// Segura os setTimeout/setInterval com esses atrasos enquanto a captura acontece
// (o avanço do d20, a vez do inimigo, o fim da luta); soltar roda os retidos.
async function segurar(page, atrasos) {
    await page.evaluate(lista => {
        window.__st = window.__st || window.setTimeout; window.__si = window.__si || window.setInterval;
        window.__retidos = [];
        window.setTimeout = (f, ms, ...a) => (lista.includes(ms) ? (window.__retidos.push(() => f(...a)), 0) : window.__st(f, ms, ...a));
        window.setInterval = (f, ms, ...a) => (lista.includes(ms) ? 0 : window.__si(f, ms, ...a));
    }, atrasos);
}
async function soltar(page) {
    await page.evaluate(() => {
        if (window.__st) { window.setTimeout = window.__st; window.setInterval = window.__si; }
        const r = window.__retidos || []; window.__retidos = []; r.forEach(f => f());
    });
}
async function cena(page, nome) {
    await page.evaluate(n => { loadScene(n); skipTyping = true; }, nome);
    await espera(450);
}
async function teclado(page) { await page.keyboard.press('Shift'); }

async function bandeja(page, aleatorio, momento = null) {
    await cena(page, 'crypt');
    await page.evaluate(() => [...document.querySelectorAll('#choices button')][1].click());
    await espera(300);
    if (aleatorio === undefined) return;
    await segurar(page, momento !== null ? [60, 1300] : [1800]);
    await page.evaluate(v => { window.__al = window.__al || Math.random; Math.random = () => v; document.getElementById('dice-button').click(); }, aleatorio);
    if (momento !== null) {
        await espera(momento);
        await page.evaluate(() => document.getAnimations().forEach(a => a.pause()));
        return;
    }
    await espera(1300 + 700);
}

async function rodada(tamanho, w, h) {
    const inteira = w < 800;
    const A = (page, estado, o = {}) => auditar(page, estado, tamanho, { inteira, ...o });

    // Seleção
    let page = await novaPagina(w, h);
    await A(page, 'selecao');
    await page.hover('.character-card[data-class="warrior"]');
    await espera(250);
    await A(page, 'selecao-hover');
    await page.mouse.move(1, 1);
    await page.evaluate(() => selectCharacter('wizard'));
    await espera(600);
    await A(page, 'selecao-escolhido');
    await teclado(page);
    await anelDeFoco(page, 'selecao-escolhido', tamanho, '#botao-comecar');
    await anelDeFoco(page, 'selecao-escolhido', tamanho, '.tela-selecao [data-musica]');
    await anelDeFoco(page, 'selecao-escolhido', tamanho, '.tela-selecao .creditos a');
    // o card focado: o anel fica no label (:has(input:focus-visible))
    await anelDeFoco(page, 'selecao-foco-card', tamanho, '.character-card[data-class="rogue"] input');
    await page.evaluate(() => document.querySelector('.character-card[data-class="rogue"] input').focus());
    await espera(250);
    await A(page, 'selecao-foco-card');
    await page.evaluate(() => document.activeElement.blur());

    // Exploração
    await comecar(page, 'warrior');
    await A(page, 'exploracao');
    await page.evaluate(() => { gameState.player.health = 10; updateStatsDisplay(); });
    await espera(700);
    await pares(page, 'exploracao', tamanho, parBarra('#barra-vida', 'barra de vida da ficha'));
    await page.evaluate(() => { gameState.player.health = 20; updateStatsDisplay(); });
    await icones(page, 'exploracao', tamanho, ['.tela-exploracao .selo svg']);
    await page.hover('#choices .escolha');
    await espera(250);
    await A(page, 'exploracao-hover-escolha');
    await page.mouse.move(1, 1);
    await teclado(page);
    await anelDeFoco(page, 'exploracao', tamanho, '#choices .escolha:nth-of-type(2)');
    await anelDeFoco(page, 'exploracao', tamanho, '#btn-toggle-map');
    await anelDeFoco(page, 'exploracao', tamanho, '#tts-toggle-button');
    await page.evaluate(() => { gameState.player.inventory = ['Poção de Vida', 'Corda']; updateInventoryDisplay(); });
    await espera(200);
    await anelDeFoco(page, 'exploracao', tamanho, '#inventory-items .slot-usavel');
    await page.evaluate(() => [...document.querySelectorAll('#choices .escolha')][1].focus());
    await espera(250);
    await A(page, 'exploracao-foco-escolha');
    await page.evaluate(() => document.activeElement.blur());
    await page.hover('#btn-toggle-map');
    await espera(250);
    await A(page, 'exploracao-hover-selo');
    await page.mouse.move(1, 1);

    await cena(page, 'crypt_merchant');
    await A(page, 'cena-longa');
    await espera(6500); // o aviso do mercador some

    // d20
    await bandeja(page);
    await A(page, 'dado');
    await anelDeFoco(page, 'dado', tamanho, '#dice-button');
    await bandeja(page, 0.5, 600);
    await A(page, 'dado-rolando');
    await page.evaluate(() => document.getAnimations().forEach(a => a.play()));
    await soltar(page); // o giro termina e o jogo avança sozinho em 1,8 s
    await espera(3300);
    for (const [v, nome] of [[0.8, 'dado-sucesso'], [0.15, 'dado-falha'], [0.96, 'dado-20'], [0, 'dado-1']]) {
        await bandeja(page, v);
        await A(page, nome);
        await soltar(page);
        await espera(600);
    }
    await page.evaluate(() => { if (window.__al) Math.random = window.__al; });

    // Barreira (aviso de falha + linha da crônica) e os avisos de cada tom
    await page.evaluate(() => { gameState.levers = { lever_crystal: false, lever_lake: false }; });
    await cena(page, 'corridor');
    await page.evaluate(() => loadScene('final_chamber_entrance'));
    await espera(700);
    await A(page, 'barreira');
    await espera(6500);
    await page.evaluate(() => avisar('“Over rir, stchruendjah!”', { icone: 'i-ouro' }));
    await espera(700);
    await A(page, 'aviso-neutro');
    await page.evaluate(() => avisar('Você comprou uma tocha.', { tom: 'sucesso', icone: 'i-tocha' }));
    await espera(700);
    await A(page, 'aviso-sucesso');
    await espera(6500);

    // Janelas
    await page.evaluate(() => { gameState.visitedNodes = ['start', 'corridor', 'crystal_chamber']; });
    await cena(page, 'corridor');
    await page.evaluate(() => document.getElementById('btn-toggle-map').click());
    await espera(700);
    await A(page, 'mapa');
    await medalhoes(page, 'mapa', tamanho);
    if (!inteira) await icones(page, 'mapa', tamanho, ['#mapa .janela-fechar svg', '#mapa .mapa-no[data-estado="selado"] .mapa-medalhao svg', '#mapa .mapa-no[data-estado="atual"] .mapa-medalhao svg']);
    await anelDeFoco(page, 'mapa', tamanho, '#mapa .janela-fechar');
    await anelDeFoco(page, 'mapa', tamanho, '#mapa .mapa-no[data-estado="pode-ir"]');
    await page.evaluate(() => fecharJanela('mapa'));
    await espera(400);

    await page.evaluate(() => { gameState.player.gold = 5; gameState.player.inventory = ['Corda']; updateInventoryDisplay(); loadScene('buy_supplies'); skipTyping = true; });
    await page.waitForFunction(() => document.getElementById('loja').open, { timeout: 8000 });
    await espera(700);
    await A(page, 'loja');
    await espera(350);
    await page.evaluate(() => document.querySelector('#loja-mercadorias .escolha').click());
    await espera(150);
    await A(page, 'loja-status-falha');
    await page.evaluate(() => [...document.querySelectorAll('#loja-mercadorias .escolha')].at(-1).click());
    await espera(150);
    await A(page, 'loja-status-sucesso');
    await anelDeFoco(page, 'loja', tamanho, '#loja [data-fechar-janela]');
    await page.evaluate(() => { gameState.player.inventory = ['Corda', 'Corda', 'Corda', 'Corda', 'Corda', 'Corda']; gameState.player.gold = 100; atualizarLoja(); });
    await espera(150);
    await A(page, 'loja-cheia');
    await page.evaluate(() => fecharJanela('loja'));
    await espera(400);
    await page.evaluate(() => { gameState.player.inventory = ['Poção de Vida']; updateInventoryDisplay(); });

    await page.evaluate(() => { gameState.player.level = 3; openSpecializationModal(); });
    await espera(900);
    await A(page, 'especializacao');
    await anelDeFoco(page, 'especializacao', tamanho, '#especializacao .especializacao-opcao:nth-child(2)');
    await page.evaluate(() => chooseSpecialization(Object.keys(SPECIALIZATIONS[gameState.player.class])[0]));
    await espera(500);

    await page.evaluate(() => { activateQuest('decode_runes'); decodeRune('crypt'); activateQuest('purify_crypt'); activateQuest('merchant_amulet'); completeQuest('merchant_amulet'); });
    await espera(300);
    await page.evaluate(() => document.getElementById('quest-journal-button').click());
    await espera(700);
    await A(page, 'diario');
    await anelDeFoco(page, 'diario', tamanho, '#diario .creditos a');
    await page.evaluate(() => avisar('Mochila cheia! Consuma uma poção para liberar espaço.', { tom: 'falha', icone: 'i-mochila' }));
    await espera(700);
    await A(page, 'aviso-falha-sobre-janela');
    await page.evaluate(() => fecharJanela('diario'));
    await espera(6500);

    await page.evaluate(() => { loadScene('death'); skipTyping = true; });
    await page.waitForFunction(() => document.getElementById('fim').open, { timeout: 8000 });
    await espera(800);
    await A(page, 'fim-morte');
    await anelDeFoco(page, 'fim-morte', tamanho, '#fim [data-fechar-janela]');
    await anelDeFoco(page, 'fim-morte', tamanho, '#fim-recomecar');
    await page.evaluate(() => fecharJanela('fim'));
    await espera(400);
    await A(page, 'fim-cena');
    await page.evaluate(() => { loadScene('victory'); skipTyping = true; });
    await page.waitForFunction(() => document.getElementById('fim').open, { timeout: 8000 });
    await espera(800);
    await A(page, 'fim-vitoria');
    await page.close();

    // Combate: guerreiro contra o Goblin, 20 natural sempre
    page = await novaPagina(w, h);
    await comecar(page, 'warrior');
    await page.evaluate(g => { Math.random = () => 0.96; startInteractiveCombat(g); }, GOBLIN);
    await espera(500);
    await A(page, 'combate');
    await page.evaluate(() => { gameState.combat.enemy.hp = 5; updateCombatUi(); });
    await espera(700);
    await pares(page, 'combate', tamanho, parBarra('#combat-enemy-health', 'barra de vida do inimigo'));
    await page.evaluate(() => { gameState.combat.enemy.hp = 12; updateCombatUi(); });
    await espera(600);
    await teclado(page);
    await anelDeFoco(page, 'combate', tamanho, '#btn-combat-flee');
    await segurar(page, [2200]);
    await page.evaluate(() => { gameState.combat.enemy.hp = 1; document.getElementById('btn-combat-attack').click(); });
    await page.waitForFunction(() => document.getElementById('btn-combat-continuar'), { timeout: 8000 });
    await espera(600);
    await A(page, 'combate-vitoria');
    await soltar(page);
    await page.waitForFunction(() => !gameState.combat.active, { timeout: 8000 });
    await espera(500);
    // o chefe: Golpe heroico, a vez dele, a recarga e a derrota
    await page.evaluate(c => { Math.random = () => 0.96; startInteractiveCombat(c); }, CHEFE);
    await espera(500);
    await A(page, 'combate-chefe');
    await segurar(page, [1200]);
    await page.evaluate(() => document.getElementById('btn-combat-spell').click()); // Golpe heroico
    await page.waitForFunction(() => gameState.combat.turn !== 'player', { timeout: 8000 });
    await espera(300);
    await A(page, 'combate-vez-do-inimigo');
    await soltar(page);
    await page.waitForFunction(() => !gameState.combat.active || gameState.combat.turn === 'player', { timeout: 10000 });
    await espera(500);
    await A(page, 'combate-recarga');
    await segurar(page, [2000]);
    await page.evaluate(() => { gameState.player.health = 1; updateStatsDisplay(); document.getElementById('btn-combat-attack').click(); });
    await page.waitForFunction(() => document.getElementById('btn-combat-continuar'), { timeout: 12000 });
    await espera(600);
    await A(page, 'combate-derrota');
    await soltar(page);
    await page.close();

    page = await novaPagina(w, h);
    await comecar(page, 'wizard');
    await page.evaluate(g => { startInteractiveCombat(g); }, GOBLIN);
    await espera(500);
    await page.evaluate(() => document.getElementById('btn-combat-spell').click());
    await espera(300);
    await A(page, 'combate-submenu');
    await page.close();
}

try {
    for (const [w, h] of TAMANHOS) await rodada(`${w}x${h}`, w, h);
} finally {
    fs.writeFileSync(path.join(saida, 'resultados.json'), JSON.stringify(resultados, null, 1));
    await browser.close();
    srv.close();
}

// Tabela: por elemento e cor, o pior caso entre os estados
const grupos = new Map();
for (const r of resultados) {
    if (r.semAmostra || r.erro) continue;
    const chave = `${r.tamanho}|${r.elemento}|${r.cor || ''}|${r.opacidade || ''}|${r.naoTexto ? 'nt' : ''}`;
    const g = grupos.get(chave);
    if (!g || r.razao < g.razao) grupos.set(chave, { ...r, estados: [...(g ? g.estados : []), r.estado] });
    else g.estados.push(r.estado);
}
const linhas = [...grupos.values()].filter(r => Number.isFinite(r.razao)).sort((a, b) => (a.passa - b.passa) || (a.razao - b.razao));
const md = ['| tamanho | estado (pior) | elemento | texto | cor (efetiva) | fundo esc / claro | razão (P10/P90) | razão (decis) | exigido | resultado | medido | obs |', '|---|---|---|---|---|---|---|---|---|---|---|---|'];
for (const r of linhas) {
    md.push(`| ${r.tamanho} | ${r.estado} | \`${r.elemento}\` | ${(r.texto || r.desc || '').replace(/\|/g, '/')} | ${r.cor}${r.corEfetiva ? ` (${r.corEfetiva})` : ''} | ${r.fundoEscuro} / ${r.fundoClaro} | ${r.razao} | ${r.razaoDecis ?? ''} | ${r.exigido} | ${r.passa ? 'passa' : (r.inativo ? 'FALHA (inativo, isento)' : 'FALHA')} | ${r.medido ? `${r.medido.razao} (${r.medido.cor} em ${r.medido.fundo})` : r.aneis || ''} | ${[r.fonte, r.opacidade < 1 ? `opac ${r.opacidade}` : '', r.sombra ? 'sombra' : '', r.inativo ? 'inativo' : ''].filter(Boolean).join(', ')} |`);
}
fs.writeFileSync(path.join(saida, 'tabela.md'), md.join('\n'));
const falhas = linhas.filter(r => !r.passa);
console.log(`\n${linhas.length} linhas; ${falhas.length} abaixo do exigido (${falhas.filter(f => f.inativo).length} inativas)`);
for (const f of falhas) console.log(`${f.tamanho} ${f.estado.padEnd(26)} ${f.razao.toString().padEnd(5)} <${f.exigido}  ${f.elemento}  "${(f.texto || f.desc || '').slice(0, 30)}"  ${f.cor} ${f.inativo ? '(inativo)' : ''}`);
if (erros.length) console.log('ERROS:\n' + [...new Set(erros)].join('\n'));
