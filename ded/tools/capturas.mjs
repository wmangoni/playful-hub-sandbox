// Capturas determinísticas do ded e comparação pixel a pixel (TASK_001).
// Prova que uma mudança de CSS não mexeu no visual: capture antes, mude,
// capture depois e compare.
//
//   node ded/tools/capturas.mjs capturar <pasta> [--raiz <repo>] [--alvo jogo,prototipo,catalogo]
//   node ded/tools/capturas.mjs comparar <pastaA> <pastaB> [--so prefixo] [--tolerancia N]
//
// --raiz captura outro worktree (a referência de um commit anterior).
// --so compara só os arquivos que começam com o prefixo; --tolerancia ignora
// pixels cuja diferença em cada canal é de no máximo N (padrão 0).
//
// Detalhes que tornam as capturas repetíveis:
// - rasterização por software (a da GPU varia alguns pixels entre execuções);
// - animações congeladas: as infinitas no início e as finitas no fim (a entrada
//   das janelas, o carimbo do selo do fim e a subida dos avisos);
// - GTM, Google Fonts e áudio bloqueados;
// - diálogos nativos dispensados (o jogo não abre mais nenhum);
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
// e uma captura não pode herdar o save da anterior. Nenhuma página do ded usa
// mais o Google Fonts; o bloqueio fica para nenhuma captura depender de rede.
async function novaPagina(browser, erros, w, h) {
    const contexto = await browser.createBrowserContext();
    const page = await contexto.newPage();
    page.once('close', () => contexto.close().catch(() => {}));
    await page.setRequestInterception(true);
    const bloqueio = /googletagmanager|google-analytics|fonts\.googleapis|fonts\.gstatic|\.mp3(\?|$)/;
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
// Jogo (ded/index.html). Desde a Fase 4 não há tela legada: a seleção, a
// exploração, o d20, o combate e as janelas (mapa, loja, especialização, diário e
// fim da aventura) vêm todos do kit. As janelas são <dialog> abertos pelas
// funções do jogo; JANELA é a espera para a entrada delas terminar (0,22 s, e o
// carimbo do selo do fim, 0,45 s), antes do congelar() da foto.
const JANELA = 700;

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

// O jogo carregado na seleção, num contexto novo
async function abrirJogo(browser, base, erros, w, h) {
    const page = await novaPagina(browser, erros, w, h);
    await page.goto(base + '/ded/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof scenes === 'object' && Object.keys(scenes).length > 50
        && document.getElementById('image').complete, { timeout: 20000 });
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
// Combate (Fase 3), em 1920x1080, 1366x768 e 390x844, em páginas próprias: a vitória dá XP
// e ouro, escreve na crônica e troca a cena, e o resto do fluxo do jogo não pode
// depender disso.
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

async function capturarCombate(browser, base, pasta, erros, w, h, sufixo) {
    const aguarda = (page, condicao, arg) => page.waitForFunction(condicao, { timeout: 15000 }, arg);
    const clica = (page, id) => page.evaluate(i => document.getElementById(i).click(), id);

    // Guerreiro. O 20 natural tira 16 de vida (1d8 → 8, +3 de Força, +5 do crítico)
    // e mata o Goblin de 12 num golpe; o ataque e o turno do inimigo são contra o chefe
    let page = await abrirJogo(browser, base, erros, w, h);
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
    page = await abrirJogo(browser, base, erros, w, h);
    tira = async nome => foto(page, pasta, `jogo-${nome}${sufixo}`, false);
    await comecar(page, 'wizard');
    await page.evaluate(g => { Math.random = () => 0.96; startInteractiveCombat(g); }, GOBLIN);
    await espera(400);
    await clica(page, 'btn-combat-spell');
    await espera(250);
    await tira('combate-magias');
    await page.close();
}

async function capturarJogo(browser, base, pasta, erros) {
    const tamanhos = [[1920, 1080, ''], [1366, 768, '-768'], [390, 844, '-390']];
    for (const [w, h, sufixo] of tamanhos) {
        const page = await abrirJogo(browser, base, erros, w, h);
        const tira = async nome => foto(page, pasta, `jogo-${nome}${sufixo}`, w < 800);
        await tira('selecao');
        await page.evaluate(() => selectCharacter('wizard'));
        await espera(600);
        await tira('selecao-escolhido');
        await comecar(page, 'warrior');
        await tira('exploracao');

        // O mapa na entrada: você está aqui, três lugares aonde ir
        await page.evaluate(() => document.getElementById('btn-toggle-map').click());
        await espera(JANELA);
        await tira('mapa');
        await page.evaluate(() => { fecharJanela('mapa'); loadScene('crypt'); });
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

        // O fim: a cena da morte e, ~1,2 s depois do texto, a janela do fim que o jogo
        // abre sozinho; depois a vitória, na cena dela, com o resumo da mesma partida
        const esperaJanela = (id, aberta = true) => page.waitForFunction((i, a) => document.getElementById(i).open === a, { timeout: 8000 }, id, aberta);
        await page.evaluate(() => { Math.random = window.__aleatorio; loadScene('death'); skipTyping = true; });
        await espera(300);
        await tira('fim');
        await esperaJanela('fim');
        await espera(JANELA);
        await tira('fim-morte');
        await page.evaluate(() => fecharJanela('fim'));
        await esperaJanela('fim', false); // a saída anima: sem esperar, a janela da morte ainda estaria aberta
        await page.evaluate(() => { loadScene('victory'); skipTyping = true; });
        await esperaJanela('fim');
        await espera(JANELA);
        await tira('fim-vitoria');
        await page.evaluate(() => fecharJanela('fim'));
        await esperaJanela('fim', false);

        // A loja, na cena dela, com 5 de ouro (a poção não cabe no bolso)
        await page.evaluate(() => { gameState.player.gold = 5; loadScene('buy_supplies'); skipTyping = true; });
        await esperaJanela('loja');
        await espera(JANELA);
        await tira('loja');
        // A especialização (sai pela escolha)
        await page.evaluate(() => { fecharJanela('loja'); gameState.player.level = 3; openSpecializationModal(); });
        await espera(JANELA);
        await tira('especializacao');
        await page.evaluate(() => chooseSpecialization(Object.keys(SPECIALIZATIONS[gameState.player.class])[0]));
        await espera(400);
        // O diário, pelo selo
        await page.evaluate(() => document.getElementById('quest-journal-button').click());
        await espera(JANELA);
        await tira('diario');
        // Um aviso sobre o diário aberto (os avisos ficam na frente das janelas)
        await page.evaluate(() => avisar('Mochila cheia! Consuma uma poção para liberar espaço.', { tom: 'falha', icone: 'i-mochila' }));
        await espera(JANELA);
        await tira('aviso');
        await page.close();
        await capturarCombate(browser, base, pasta, erros, w, h, sufixo);
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

async function capturar(pasta, raiz, alvos) {
    fs.mkdirSync(pasta, { recursive: true });
    const srv = await servidor(path.resolve(raiz));
    const base = `http://127.0.0.1:${srv.address().port}`;
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--disable-gpu', '--disable-gpu-rasterization', '--force-color-profile=srgb', '--autoplay-policy=user-gesture-required']
    });
    const erros = [];
    try {
        if (alvos.includes('jogo')) await capturarJogo(browser, base, pasta, erros);
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
if (comando === 'capturar' && resto.length) {
    const raiz = opcao('--raiz') || RAIZ_PADRAO;
    const alvos = (opcao('--alvo') || 'jogo,prototipo,catalogo').split(',');
    await capturar(path.resolve(resto[0]), raiz, alvos);
} else if (comando === 'comparar' && resto.length >= 2) {
    const prefixo = opcao('--so') || '';
    const tolerancia = Number(opcao('--tolerancia') || 0);
    await comparar(path.resolve(resto[0]), path.resolve(resto[1]), prefixo, tolerancia);
} else {
    console.log('Uso:\n  node ded/tools/capturas.mjs capturar <pasta> [--raiz <repo>] [--alvo jogo,prototipo,catalogo]\n' +
        '  node ded/tools/capturas.mjs comparar <pastaA> <pastaB> [--so prefixo] [--tolerancia N]');
    process.exitCode = 2;
}
