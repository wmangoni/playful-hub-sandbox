// Capturas determinísticas do ded e comparação pixel a pixel (TASK_001).
// Prova que uma mudança de CSS não mexeu no visual: capture antes, mude,
// capture depois e compare.
//
//   node ded/tools/capturas.mjs capturar <pasta> [--raiz <repo>] [--alvo jogo,prototipo,catalogo] [--kit]
//   node ded/tools/capturas.mjs comparar <pastaA> <pastaB> [--so prefixo] [--tolerancia N]
//
// --kit injeta o CSS do kit (fontes, tokens, base, componentes, exploracao e o
// recorte do vitral) depois do legado no jogo. Serve para capturar a referência
// num worktree de antes da Fase 2 (--raiz) com o kit carregado, como o jogo
// carrega hoje: os recortes legado-*.png das telas antigas têm de sair
// idênticos (comparar ... --so legado).
// --so compara só os arquivos que começam com o prefixo; --tolerancia ignora
// pixels cuja diferença em cada canal é de no máximo N (padrão 0).
//
// Detalhes que tornam as capturas repetíveis:
// - rasterização por software (a da GPU varia alguns pixels entre execuções);
// - animações congeladas: as infinitas no início e as finitas no fim;
// - GTM e áudio bloqueados; no jogo, também o Google Fonts (a Outfit das telas
//   legadas chegava em momentos diferentes e mudava o texto entre capturas
//   iguais; sem ela, o legado usa a fonte de reserva nas duas pontas);
// - o alert() da abertura do jogo dispensado;
// - o acaso forçado: Math.random preso nos testes de d20 e no combate;
// - movimento padrão forçado (prefers-reduced-motion: no-preference), porque o
//   Windows com as animações desligadas faz o Chrome pedir movimento reduzido.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const RAIZ_PADRAO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIME = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.webp': 'image/webp',
    '.json': 'application/json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg'
};
const espera = ms => new Promise(r => setTimeout(r, ms));

function servidor(raiz) {
    return new Promise(resolve => {
        const srv = http.createServer((req, res) => {
            let p = decodeURIComponent(req.url.split('?')[0]);
            if (p.endsWith('/')) p += 'index.html';
            const arquivo = path.join(raiz, p);
            if (!arquivo.startsWith(raiz)) { res.writeHead(403); return res.end(); }
            fs.readFile(arquivo, (e, d) => {
                if (e) { res.writeHead(404); return res.end(); }
                res.writeHead(200, { 'Content-Type': MIME[path.extname(arquivo)] || 'application/octet-stream' });
                res.end(d);
            });
        });
        srv.listen(0, '127.0.0.1', () => resolve(srv));
    });
}

// Congela as animações CSS/Web Animations e as SMIL dos SVGs. As finitas vão para o
// fim; com instante (ms), param nesse ponto, para mostrar um efeito no meio.
function congelar(instante = null) {
    document.getAnimations().forEach(a => {
        if (a.effect.getTiming().iterations === Infinity) { a.pause(); a.currentTime = 0; }
        else if (instante === null) a.finish();
        else { a.pause(); a.currentTime = Math.min(instante, a.effect.getComputedTiming().endTime); }
    });
    document.querySelectorAll('svg').forEach(s => { try { s.pauseAnimations(); s.setCurrentTime(0); } catch { /* sem SMIL */ } });
    document.querySelectorAll('audio').forEach(a => a.pause());
}

// Cada captura num contexto próprio: o jogo grava o progresso no localStorage
// e uma captura não pode herdar o save da anterior. semGoogleFonts vale para
// as telas legadas (a Outfit); o protótipo da Fase 0 ainda dependia do Google.
async function novaPagina(browser, erros, w, h, semGoogleFonts = false) {
    const contexto = await browser.createBrowserContext();
    const page = await contexto.newPage();
    page.once('close', () => contexto.close().catch(() => {}));
    await page.setRequestInterception(true);
    const bloqueio = semGoogleFonts
        ? /googletagmanager|google-analytics|fonts\.googleapis|fonts\.gstatic|\.mp3(\?|$)/
        : /googletagmanager|google-analytics|\.mp3(\?|$)/;
    page.on('request', r => (bloqueio.test(r.url()) ? r.abort() : r.continue()));
    page.on('dialog', d => d.dismiss());
    page.on('pageerror', e => erros.push(e.message));
    page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('favicon.ico')) erros.push(`${r.status()} ${r.url()}`); });
    await page.setViewport({ width: w, height: h });
    // Movimento padrão, qualquer que seja o sistema: com as animações do Windows
    // desligadas, o Chrome informa prefers-reduced-motion e o jogo pula a máquina
    // de escrever, apaga a chama do vitral e para o brilho do 20 natural
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    return page;
}

async function foto(page, pasta, nome, inteira, instante = null) {
    await page.evaluate(congelar, instante);
    await espera(150);
    await page.screenshot({ path: path.join(pasta, `${nome}.png`), fullPage: inteira });
    console.log('  ', nome);
}

// ---------------------------------------------------------------------------
// Jogo (ded/index.html). Desde a Fase 2 a seleção, a exploração e o d20 vêm
// do kit, e desde a Fase 3 o combate também. As telas que seguem legadas (loja,
// especialização e diário) também saem recortadas em legado-*.png (1920x1080) e
// legado-*-768.png (1366x768), só o overlay e sem os cantos arredondados: o
// fundo atrás delas mudou, mas elas têm de sair idênticas a uma referência de
// antes da migração capturada com --kit.
// Mesma ordem de carga da Fase 2, depois do legado
const KIT = ['css/fontes.css', 'css/tokens.css', 'css/base.css', 'css/componentes.css', 'css/exploracao.css', 'ui/ornamentos/vitral-recorte.css'];
const LEGADOS = {
    loja: ['#shop-modal .modal-content', 0],
    especializacao: ['#specialization-modal .modal-content', 14],
    diario: ['#quest-journal', 12]
};

async function recorte(page, pasta, nome, sufixo) {
    const [seletor, canto] = LEGADOS[nome];
    const caixa = await page.evaluate(s => {
        const r = document.querySelector(s).getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
    }, seletor);
    await page.screenshot({
        path: path.join(pasta, `legado-${nome}${sufixo}.png`),
        clip: { x: caixa.x + canto, y: caixa.y + canto, width: caixa.width - 2 * canto, height: caixa.height - 2 * canto }
    });
    console.log('  ', `legado-${nome}${sufixo}`);
}

// Teste de Força na cripta (2ª escolha) com o resultado forçado
async function rolar(page, aleatorio) {
    await page.evaluate(() => { loadScene('crypt'); skipTyping = true; });
    await espera(400); // escolhas recém-montadas ignoram cliques por 300 ms
    await page.evaluate(() => [...document.querySelectorAll('#choices button')][1].click());
    await espera(250);
    await page.evaluate(v => {
        window.__aleatorio = Math.random;
        Math.random = () => v;
        document.getElementById('dice-button').click();
    }, aleatorio);
    await espera(1300 + 700); // giro + carimbo do selo
}

// O jogo carregado na seleção (com o kit injetado, se --kit), num contexto novo
async function abrirJogo(browser, base, erros, w, h, comKit) {
    const page = await novaPagina(browser, erros, w, h, true);
    await page.goto(base + '/ded/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof scenes === 'object' && Object.keys(scenes).length > 50
        && document.getElementById('image').complete, { timeout: 20000 });
    if (comKit) {
        await page.evaluate(async folhas => {
            for (const f of folhas) {
                const l = document.createElement('link');
                l.rel = 'stylesheet';
                l.href = f;
                await new Promise((ok, erro) => { l.onload = ok; l.onerror = erro; document.head.append(l); });
            }
        }, KIT);
    }
    await page.evaluate(() => document.fonts.ready);
    await espera(500);
    return page;
}

// Jogo novo com a classe dada, já na cena inicial com o texto inteiro
async function comecar(page, classe) {
    await page.evaluate(c => { ttsEnabled = false; selectCharacter(c); startGame(); }, classe);
    await espera(150);
    await page.evaluate(() => { skipTyping = true; });
    await espera(300);
}

// ---------------------------------------------------------------------------
// Combate (Fase 3), em 1920x1080 e 1366x768. Roda em páginas próprias, fora do
// fluxo das telas legadas: a vitória dá XP e ouro, escreve na crônica e troca a
// cena, e a especialização (de fundo translúcido) tem de continuar saindo sobre
// o fundo de sempre para bater com a referência.
// O Math.random fica preso em 0,96 do começo ao fim: o d20 dá 20 natural dos dois
// lados e o dano sai sempre o mesmo. Cada foto espera o estado do jogo mudar
// (vida, XP, turno) e só depois conta o próprio atraso; as animações finitas
// terminam no congelar(), então alguns ms a mais ou a menos não mudam a captura.
// As fotos "-golpe" e "-ganhos" param os efeitos no meio (clarão, brilho, tremor e
// números que sobem), num instante fixo das animações. As ações ignoram cliques nos
// 300 ms depois de montadas, então os cliques esperam 400 ms.
// Inimigos do scenes.json: o Goblin da entrada e o chefe da cripta
const GOBLIN = { name: 'Goblin', ac: 10, hp: 12, max_hp: 12, str: 10, dex: 10, con: 10, bba: 1 };
const CHEFE = { name: 'Fantasma de Drakmor', ac: 18, hp: 40, max_hp: 40, str: 16, dex: 14, con: 10, bba: 4 };

async function capturarCombate(browser, base, pasta, erros, comKit, w, h, sufixo) {
    const aguarda = (page, condicao, arg) => page.waitForFunction(condicao, { timeout: 15000 }, arg);
    const clica = (page, id) => page.evaluate(i => document.getElementById(i).click(), id);

    // Guerreiro. O 20 natural tira 16 de vida (1d8 → 8, +3 de Força, +5 do crítico)
    // e mata o Goblin de 12 num golpe; o ataque e o turno do inimigo são contra o chefe
    let page = await abrirJogo(browser, base, erros, w, h, comKit);
    let tira = async nome => foto(page, pasta, `jogo-${nome}${sufixo}`, false);
    await comecar(page, 'warrior');
    await page.evaluate(g => { Math.random = () => 0.96; startInteractiveCombat(g); }, GOBLIN);
    await espera(400);
    await tira('combate');

    // Vitória: o Goblin com 1 de vida. Os ganhos sobem logo que a vitória é declarada
    // (o XP sobe); a foto da vitória sai 0,6 s depois, com o selo e o "Continuar". A
    // volta para a cena vem 2,2 s depois da vitória.
    const xp = await page.evaluate(() => { gameState.combat.enemy.hp = 1; return gameState.player.xp; });
    await clica(page, 'btn-combat-attack');
    await aguarda(page, x => gameState.player.xp > x, xp);
    await foto(page, pasta, `jogo-combate-ganhos${sufixo}`, false, 400);
    await espera(600);
    await tira('combate-vitoria');
    await aguarda(page, () => !gameState.combat.active);
    await page.evaluate(() => { skipTyping = true; });
    await espera(300);

    await page.evaluate(c => startInteractiveCombat(c), CHEFE);
    await espera(400);
    await tira('combate-chefe');
    // 20 natural contra o chefe (sobram 24 de 40): o resultado no dado, 0,3 s depois
    // de a vida dele cair (~1,6 s do clique)
    await clica(page, 'btn-combat-attack');
    await aguarda(page, () => gameState.combat.enemy.hp < gameState.combat.enemy.max_hp);
    await espera(300);
    await tira('combate-ataque');
    // O turno do chefe: o 20 natural dele (9 de dano), 0,3 s depois do golpe
    const vida = await page.evaluate(() => gameState.player.health);
    await aguarda(page, v => gameState.player.health < v, vida);
    await foto(page, pasta, `jogo-combate-golpe${sufixo}`, false, 110);
    await espera(300);
    await tira('combate-inimigo');
    await aguarda(page, () => gameState.combat.turn === 'player');
    await page.close();

    // Mago, num jogo próprio (a ficha e os atributos são os dele): o submenu de magias
    page = await abrirJogo(browser, base, erros, w, h, comKit);
    tira = async nome => foto(page, pasta, `jogo-${nome}${sufixo}`, false);
    await comecar(page, 'wizard');
    await page.evaluate(g => { Math.random = () => 0.96; startInteractiveCombat(g); }, GOBLIN);
    await espera(400);
    await clica(page, 'btn-combat-spell');
    await espera(250);
    await tira('combate-magias');
    await page.close();
}

async function capturarJogo(browser, base, pasta, erros, comKit) {
    const tamanhos = [[1920, 1080, ''], [1366, 768, '-768'], [390, 844, '-390']];
    for (const [w, h, sufixo] of tamanhos) {
        const page = await abrirJogo(browser, base, erros, w, h, comKit);
        const tira = async nome => foto(page, pasta, `jogo-${nome}${sufixo}`, w < 800);
        await tira('selecao');
        await page.evaluate(() => selectCharacter('wizard'));
        await espera(600);
        await tira('selecao-escolhido');
        await comecar(page, 'warrior');
        await tira('exploracao');
        if (sufixo === '-390') { await page.close(); continue; } // o celular é da Fase 5

        await page.evaluate(() => document.getElementById('btn-toggle-map').click());
        await espera(250);
        await tira('mapa');
        await page.evaluate(() => { document.getElementById('btn-toggle-map').click(); loadScene('crypt'); });
        await espera(150);
        await page.evaluate(() => { skipTyping = true; });
        await espera(300);
        await page.evaluate(() => [...document.querySelectorAll('#choices button')][1].click());
        await espera(250);
        await tira('dado');

        // os dois críticos; depois de cada um o jogo avança sozinho para a cena seguinte
        await rolar(page, 0.96);
        await tira('dado-20');
        await espera(1600);
        await rolar(page, 0);
        await tira('dado-1');
        await espera(1600);
        await page.evaluate(() => { Math.random = window.__aleatorio; loadScene('death'); skipTyping = true; });
        await espera(300);
        await tira('fim');

        // O foco sai do "Começar uma nova aventura", como saía quando o combate abria e
        // fechava aqui (até a Fase 3): a loja, a especialização e o diário seguem iguais às referências
        await page.evaluate(() => {
            document.activeElement?.blur();
            document.getElementById('shop-modal').classList.remove('hidden');
        });
        await espera(250);
        await tira('loja');
        await recorte(page, pasta, 'loja', sufixo);
        await page.evaluate(() => {
            document.getElementById('shop-modal').classList.add('hidden');
            gameState.player.level = 3;
            openSpecializationModal();
        });
        await espera(250);
        await tira('especializacao');
        await recorte(page, pasta, 'especializacao', sufixo);
        await page.evaluate(() => {
            document.getElementById('specialization-modal').classList.add('hidden');
            document.getElementById('quest-journal-button').click();
        });
        await espera(250);
        await tira('diario');
        await recorte(page, pasta, 'diario', sufixo);
        await page.close();
        await capturarCombate(browser, base, pasta, erros, comKit, w, h, sufixo);
    }
}

// ---------------------------------------------------------------------------
// Protótipo da exploração (ded/prototipo/): escolhas e os dois críticos do d20.
async function capturarPrototipo(browser, base, pasta, erros) {
    const casos = [
        ['escolhas', 1920, 1080, null], ['teste20', 1920, 1080, '20'], ['teste1', 1920, 1080, '1'],
        ['escolhas-768', 1366, 768, null], ['escolhas-390', 390, 844, null]
    ];
    for (const [nome, w, h, forcar] of casos) {
        const page = await novaPagina(browser, erros, w, h);
        await page.goto(base + '/ded/prototipo/', { waitUntil: 'networkidle0' });
        await page.evaluate(() => document.fonts.ready);
        if (forcar) {
            await page.evaluate(v => document.querySelector(`[data-forcar="${v}"]`).click(), forcar);
            await espera(1900);
        }
        await foto(page, pasta, `prototipo-${nome}`, w < 800);
        await page.close();
    }
}

// Catálogo do kit (ded/prototipo/componentes.html), página inteira.
async function capturarCatalogo(browser, base, pasta, erros) {
    for (const [nome, w, h] of [['catalogo', 1920, 1080], ['catalogo-390', 390, 844]]) {
        const page = await novaPagina(browser, erros, w, h);
        await page.goto(base + '/ded/prototipo/componentes.html', { waitUntil: 'networkidle0' });
        await page.evaluate(() => document.fonts.ready);
        await espera(300);
        const largura = await page.evaluate(() => document.documentElement.scrollWidth);
        if (largura > w) erros.push(`${nome}: rolagem horizontal (${largura}px em ${w}px)`);
        await foto(page, pasta, nome, true);
        await page.close();
    }
}

async function capturar(pasta, raiz, alvos, comKit) {
    fs.mkdirSync(pasta, { recursive: true });
    const srv = await servidor(path.resolve(raiz));
    const base = `http://127.0.0.1:${srv.address().port}`;
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--disable-gpu', '--disable-gpu-rasterization', '--force-color-profile=srgb', '--autoplay-policy=user-gesture-required']
    });
    const erros = [];
    try {
        if (alvos.includes('jogo')) await capturarJogo(browser, base, pasta, erros, comKit);
        if (alvos.includes('prototipo')) await capturarPrototipo(browser, base, pasta, erros);
        if (alvos.includes('catalogo')) await capturarCatalogo(browser, base, pasta, erros);
    } finally {
        await browser.close();
        srv.close();
    }
    if (erros.length) {
        console.log('ERROS:\n' + [...new Set(erros)].join('\n'));
        process.exitCode = 1;
    }
}

// ---------------------------------------------------------------------------
// Comparação: decodifica os PNGs num canvas do Chrome e conta os pixels diferentes.
async function comparar(pastaA, pastaB, prefixo = '', tolerancia = 0) {
    const nomes = fs.readdirSync(pastaA).filter(n => n.endsWith('.png') && n.startsWith(prefixo)).sort();
    const browser = await puppeteer.launch({ headless: 'new' });
    let diferentes = 0;
    try {
        const page = await browser.newPage();
        for (const nome of nomes) {
            const b = path.join(pastaB, nome);
            if (!fs.existsSync(b)) { console.log(`${nome.padEnd(34)} sem par em ${pastaB}`); diferentes++; continue; }
            const [da, db] = [path.join(pastaA, nome), b].map(f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64'));
            const r = await page.evaluate(async (ua, ub, tol) => {
                const carrega = u => new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = u; });
                const [ia, ib] = await Promise.all([carrega(ua), carrega(ub)]);
                if (ia.width !== ib.width || ia.height !== ib.height) return { tamanho: `${ia.width}x${ia.height} x ${ib.width}x${ib.height}` };
                const px = img => { const c = new OffscreenCanvas(img.width, img.height); const g = c.getContext('2d'); g.drawImage(img, 0, 0); return g.getImageData(0, 0, img.width, img.height).data; };
                const [pa, pb] = [px(ia), px(ib)];
                let n = 0, x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
                for (let i = 0; i < pa.length; i += 4) {
                    if (Math.abs(pa[i] - pb[i]) > tol || Math.abs(pa[i + 1] - pb[i + 1]) > tol || Math.abs(pa[i + 2] - pb[i + 2]) > tol) {
                        n++;
                        const p = i / 4, x = p % ia.width, y = (p - x) / ia.width;
                        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
                    }
                }
                return { n, caixa: n ? [x0, y0, x1, y1] : null };
            }, da, db, tolerancia);
            if (r.tamanho) { console.log(`${nome.padEnd(34)} TAMANHO ${r.tamanho}`); diferentes++; continue; }
            if (r.n) diferentes++;
            console.log(`${nome.padEnd(34)} ${r.n ? `${r.n} px diferentes, caixa ${JSON.stringify(r.caixa)}` : 'idêntico'}`);
        }
    } finally {
        await browser.close();
    }
    console.log(diferentes ? `${diferentes} captura(s) com diferença` : 'TUDO IDÊNTICO');
}

// ---------------------------------------------------------------------------
const [comando, ...resto] = process.argv.slice(2);
const opcao = nome => { const i = resto.indexOf(nome); return i >= 0 ? resto.splice(i, 2)[1] : null; };
const bandeira = nome => { const i = resto.indexOf(nome); return i >= 0 && resto.splice(i, 1).length > 0; };
if (comando === 'capturar' && resto.length) {
    const raiz = opcao('--raiz') || RAIZ_PADRAO;
    const alvos = (opcao('--alvo') || 'jogo,prototipo,catalogo').split(',');
    const comKit = bandeira('--kit');
    await capturar(path.resolve(resto[0]), raiz, alvos, comKit);
} else if (comando === 'comparar' && resto.length >= 2) {
    const prefixo = opcao('--so') || '';
    const tolerancia = Number(opcao('--tolerancia') || 0);
    await comparar(path.resolve(resto[0]), path.resolve(resto[1]), prefixo, tolerancia);
} else {
    console.log('Uso:\n  node ded/tools/capturas.mjs capturar <pasta> [--raiz <repo>] [--alvo jogo,prototipo,catalogo] [--kit]\n' +
        '  node ded/tools/capturas.mjs comparar <pastaA> <pastaB> [--so prefixo] [--tolerancia N]');
    process.exitCode = 2;
}
