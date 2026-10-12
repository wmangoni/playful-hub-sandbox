// Medição do tempo de quadro do ded (TASK_001 §6): nenhum quadro acima de
// 20,8 ms (48 FPS) em Full HD com CPU 1x. A CPU 4x sai junto, só para informar.
//
//   node ded/tools/desempenho.mjs [--cenarios a,b,c] [--execucoes 30] [--repeticoes 10] [--cpu 1|4|ambos]
//                                 [--json saida.json] [--raiz <repo>] [--perfil <pasta>]
//                                 [--movimento padrao|reduzido] [--sem-rastreio] [--rastreios <pasta>]
//                                 [--aquecimento d20|combate|nenhum]
//
// A aba de aquecimento joga o teste de d20 com o 20 natural (d20, o padrão); com combate, também
// abre uma luta e vence; com nenhum, só mede o intervalo de atualização, com a sessão fria.
// O rastreio de cada execução com um quadro acima do limite fica guardado em --rastreios (o padrão
// é ded-desempenho-rastreios na pasta temporária do sistema), e o relatório diz o arquivo.
//
// Em CPU 1x, cada cenário roda --repeticoes vezes (10), cada vez numa aba nova; o primeiro clique
// roda --execucoes vezes (30) e a abertura, uma. Em CPU 4x, que só informa, cada um roda uma vez.
//
// Cenários (todos em CPU 1x; os marcados com * repetem em 4x):
//   abertura          da carga da página até a seleção parada (2 s depois das fontes). Só informa:
//                     é a pintura a frio e fica fora do veredito.
//   exploracao *      selectCharacter + startGame e 3 s da cena inicial com a máquina de escrever
//                     rodando (inclui a troca da seleção para a exploração e a chama do vitral).
//   texto-longo *     loadScene da cena de texto mais longo do scenes.json e 4 s de máquina de escrever.
//   teste-d20 *       na crypt, o clique no teste de Força (abre a bandeja), "Rolar" 300 ms depois e
//                     3,4 s de giro, resultado, selo de cera e avanço automático para a próxima cena.
//   critico-20 *      o mesmo, com o 20 natural forçado (Math.random = () => 0.96 durante a rolagem).
//   critico-1 *       o mesmo, com o 1 natural forçado (Math.random = () => 0).
//   combate-entrada * o caminho real até a luta: na sala do Goblin, a escolha de lutar abre a bandeja, o d20
//                     rola e o botão vira "Enfrentar". Do clique nele até 2 s depois: a narrativa e a crônica
//                     dão lugar ao painel de combate e ao relato, e as ações são montadas.
//   combate *         guerreiro contra o Goblin, aberto com startInteractiveCombat 800 ms antes. Do clique
//                     em "Ataque" até 6 s depois, a rodada inteira: o d20 (~1,3 s), o acerto (clarão e
//                     barra do inimigo), o turno do inimigo (~2,8 s), o golpe dele (~4 s: tremor, clarão
//                     vermelho e barra do jogador) e a volta da vez para o jogador (~5,5 s). O Math.random
//                     depende só do turno: 0,8 no do jogador (17, acerto sem crítico; o Goblin fica com 2
//                     de 12) e 0,96 no do inimigo (o 20 natural, que sempre acerta).
//   combate-vitoria * o mesmo começo, com o Goblin em 1 de vida e o 20 natural forçado: 7,5 s do clique, com a
//                     vitória (~2,8 s: selo, XP, ouro e o nível novo), a volta para uma cena (~5 s) e o
//                     segundo seguinte, quando a GPU limpa o que o painel deixou.
//   combate-derrota * o mesmo começo, com o jogador em 1 de vida: o ataque (0,2) não derruba o Goblin, ele
//                     acerta o 20 natural (~4 s), vem a derrota (~5,5 s) e a cena da morte (~7,5 s); 9 s do clique.
//   combate-fuga *    o mesmo começo, com "Fugir" e o 20 natural: a fuga dá certo (~1,3 s) e a cena anterior
//                     volta (~3,1 s); 5,5 s do clique.
//   primeiro-clique   o aceite: --execucoes (30) rodadas, cada uma numa aba nova, com o save apagado e
//                     jogo novo, do primeiro clique no teste até 1,8 s depois de rolar (a primeira vez
//                     que a bandeja e a arte do dado aparecem naquela página).
//
// Cada cenário informa quadros, mediana, p95, p99, máximo, quantos passaram do limite, quantos
// desses foram a limpeza ociosa da GPU (ver as armadilhas), o pior bloqueio do LoAF
// (long-animation-frame; o Chrome só registra quadros acima de 50 ms) e em que momento começou o
// pior quadro, contado da ação; com mais de uma execução, também o máximo de cada uma. A última
// linha é APROVADO ou REPROVADO, só com os cenários de CPU 1x (fora a abertura), e diz quantos
// quadros ficaram fora do veredito na limpeza da GPU; reprovado ou erro de medição saem com código 1.
//
// Do jogo, o script usa só a API estável: selectCharacter, startGame, loadScene, gameState, scenes,
// skipTyping, ttsEnabled, .character-card[data-class], o primeiro <button> de #character-select (o
// de começar), os <button> de #choices, #dice-container e #dice-button. O #dice e a
// classe .rolling-animation entram apenas em conferências que viram aviso. No combate:
// startInteractiveCombat, gameState.combat (active, turn, enemy.hp), gameState.player (health, xp) e
// #btn-combat-attack e #btn-combat-flee; na entrada, scenes.goblin_encounter (a escolha com checkType
// "combat") e o rótulo "Enfrentar" do #dice-button. As conferências do combate leem o gameState
// depois da janela medida.
//
// Armadilhas da medição (aprendidas neste projeto):
// - GPU de verdade, sem --disable-gpu. O Puppeteer abre o Chrome com o processo de GPU frio, que gera
//   picos de 300 a 800 ms nos primeiros ~500 ms sem culpa da página. Por isso: perfil persistente
//   (--perfil; o padrão fica na pasta temporária do sistema) e uma aba de aquecimento que joga uma
//   vez e fecha. Cada medição é feita depois, numa aba nova do mesmo navegador.
// - Chrome com janela (headless: false), para os quadros seguirem o vsync de uma tela de verdade, e
//   viewport de 1920x1080. Num monitor de 144 Hz os quadros vêm em múltiplos de ~6,94 ms e 3 vsyncs
//   (20,83 ms) é o máximo aceito. O timestamp do rAF oscila ~±0,5 ms em volta do vsync (aqui, quadros
//   de 6,5 a 7,4 ms a 144 Hz): 3 vsyncs aparecem como até ~21,7 ms e 4 começam em ~26,9. A folga de
//   1,5 ms (FOLGA_MS) separa os dois sem aceitar um vsync a mais em 60, 75, 100, 120, 144, 165 ou 240 Hz.
//   O intervalo de atualização medido sai no relatório.
// - A janela não pode ser minimizada: sem quadros, não há rAF. Coberta por outras janelas ela continua
//   pintando (CalculateNativeWinOcclusion desligado), mas o ideal é deixá-la à vista e o PC quieto.
// - O ambiente tem ruído próprio. Na máquina do projeto (GTX 1660 SUPER, 144 Hz), uma página vazia
//   só com um translateX teve uma parada de ~500 ms uns 120 s depois de o Chrome abrir, além de
//   quadros soltos de 28 a 42 ms a cada ~30 s. Para separar página de ambiente, o relatório lista
//   cada quadro acima do limite com o início contado da ação: os da página se repetem no mesmo
//   momento do fluxo (no clique, na revelação); os do ambiente caem em qualquer lugar, com o LoAF
//   sem script nem render. O JSON traz aposLancamentoMs de cada medição. Uma execução com um quadro
//   acima de 100 ms em que o LoAF não tem script nem render (até 2 ms de script e 5 de render, o do
//   próprio quadro) é refeita uma vez, com aviso no relatório.
// - A limpeza ociosa da GPU. Cerca de 1 s depois de a página parar de rasterizar, o processo de GPU
//   do Chrome (Graphite sobre Dawn/D3D11) roda GraphiteCacheController::ScheduleCleanUpAllResources
//   e devolve ao driver as texturas que o compositor descartou. Nesta máquina essa tarefa leva de 30
//   a 70 ms na thread principal da GPU, e o quadro que cai nela atrasa junto, sem nenhum trabalho da
//   página naquele quadro. Ela só aparece quando a página fica parada mais de 1 s dentro da janela
//   (a vitória do combate, entre o selo e a volta para a cena); o combate antigo não a mostrava porque
//   repintava a tela em todo quadro. Por isso cada medição grava um rastreio leve (só as tarefas de
//   cada thread e a marca da ação). Um quadro acima do limite sai da conta do veredito só quando as
//   três coisas valem: a tarefa roda na thread principal da GPU (CrGpuMain) durante o quadro; o
//   quadro, sem o trecho da tarefa que cai dentro dele, caberia no limite; e a thread principal da
//   página trabalhou menos de 3 ms nesse intervalo. O relatório lista esses quadros à parte, com o
//   trecho da tarefa e o trabalho da página, e o veredito diz quantos foram. A página influencia esse
//   custo (ele cresce com as texturas descartadas), então uma aprovação que dependa dessa exclusão é
//   decisão do dono do projeto. Se o Chrome mudar o nome da tarefa, os quadros voltam a contar contra
//   a página. --sem-rastreio desliga o rastreio (para medir o custo dele): aí tudo conta.
// - Movimento padrão emulado (prefers-reduced-motion: no-preference). Com as animações do Windows
//   desligadas, o Chrome pede movimento reduzido e o jogo pularia a máquina de escrever, o giro do
//   d20 e a chama do vitral, que são justamente o que se quer medir. --movimento reduzido mede o outro caminho.
// - O save (localStorage 'ded_save_v1') é apagado antes de cada página; com ele o jogo pularia a seleção.
// - GTM, Google Analytics e os .mp3 bloqueados; os alert() dispensados; o áudio sintetizado toca, mudo.
// - O tempo do quadro é a diferença entre os timestamps do rAF (mesma base do performance.now()), que
//   caem no vsync. O performance.now() lido dentro do callback oscila alguns ms e daria falsos 21 ms.
import { execFileSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const RAIZ_PADRAO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let MOVIMENTO = 'no-preference'; // prefers-reduced-motion emulado (--movimento reduzido troca para 'reduce')
const PERFIL_PADRAO = path.join(os.tmpdir(), 'ded-desempenho-perfil');
const LIMITE_MS = 1000 / 48;
const FOLGA_MS = 1.5; // ruído do timestamp do rAF; ver o cabeçalho
const CENARIOS = ['abertura', 'exploracao', 'texto-longo', 'teste-d20', 'critico-20', 'critico-1', 'combate-entrada', 'combate',
    'combate-vitoria', 'combate-derrota', 'combate-fuga', 'primeiro-clique'];
const EM_4X = new Set(['exploracao', 'texto-longo', 'teste-d20', 'critico-20', 'critico-1', 'combate-entrada', 'combate',
    'combate-vitoria', 'combate-derrota', 'combate-fuga']);
const SO_INFORMA = new Set(['abertura']);
const FORCAR = { 'teste-d20': null, 'critico-20': 0.96, 'critico-1': 0 }; // floor(0,96 * 20) + 1 = 20
// Combate: o desfecho esperado, a ação clicada, o Math.random no turno do jogador e no do
// inimigo, as vidas antes do clique (null mantém a cheia) e a janela medida, contada do clique
const COMBATE = {
    combate: { tipo: 'rodada', acao: 'btn-combat-attack', jogador: 0.8, inimigo: 0.96, vidaInimigo: null, vidaJogador: null, janela: 6000 },
    'combate-vitoria': { tipo: 'vitoria', acao: 'btn-combat-attack', jogador: 0.96, inimigo: 0.96, vidaInimigo: 1, vidaJogador: null, janela: 7500 },
    'combate-derrota': { tipo: 'derrota', acao: 'btn-combat-attack', jogador: 0.2, inimigo: 0.96, vidaInimigo: null, vidaJogador: 1, janela: 9000 },
    'combate-fuga': { tipo: 'fuga', acao: 'btn-combat-flee', jogador: 0.96, inimigo: 0.96, vidaInimigo: null, vidaJogador: null, janela: 5500 }
};
const GOBLIN = { name: 'Goblin', ac: 10, hp: 12, max_hp: 12, str: 10, dex: 10, con: 10, bba: 1 }; // o do scenes.json
const BLOQUEIO = /googletagmanager|google-analytics|\.mp3(\?|$)/;
const MIME = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.webp': 'image/webp',
    '.json': 'application/json', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg'
};
const espera = ms => new Promise(r => setTimeout(r, ms));
const passou = d => d > LIMITE_MS + FOLGA_MS;
const TRABALHO_MAX_MS = 3; // trabalho da página tolerado num quadro atribuído à limpeza da GPU
let RASTREAR = true; // --sem-rastreio desliga
let AQUECIMENTO = 'd20'; // --aquecimento
let PASTA_RASTREIOS = path.join(os.tmpdir(), 'ded-desempenho-rastreios'); // --rastreios

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

// ---------------------------------------------------------------------------
// Dentro da página. Instalado antes dos scripts do jogo (evaluateOnNewDocument):
// apaga o save e deixa window.__desempenho com iniciar/marcar/parar.
function instalarMedidor(autoIniciar) {
    if (window !== window.top) return;
    try { localStorage.clear(); } catch { /* sem armazenamento */ }
    const tipos = (window.PerformanceObserver && PerformanceObserver.supportedEntryTypes) || [];
    const m = window.__desempenho = { loafSuportado: tipos.includes('long-animation-frame'), ativo: false };
    let ultimo = null, observador = null, pronto = null;
    const guardaLoaf = lista => { for (const e of lista) m.loaf.push(e); };
    const passo = ts => {
        if (!m.ativo) return;
        if (ultimo !== null) { m.quadros.push(ts - ultimo); m.fins.push(ts); }
        ultimo = ts;
        if (pronto && m.quadros.length >= 2) { setTimeout(pronto, 0); pronto = null; }
        requestAnimationFrame(passo);
    };
    // Resolve depois de dois quadros medidos: a ação só começa com o laço já rodando. A ação roda
    // numa tarefa própria (setTimeout), como um clique de verdade; resolvida dentro do rAF, ela
    // cairia no começo do quadro e o LoAF atribuiria o trabalho do jogo ao FrameRequestCallback.
    m.iniciar = () => new Promise(ok => {
        Object.assign(m, { quadros: [], fins: [], loaf: [], ativo: true, t0: performance.now(), tFim: Infinity });
        m.tAcao = m.t0;
        ultimo = null;
        pronto = ok;
        if (m.loafSuportado) {
            observador?.disconnect();
            observador = new PerformanceObserver(l => guardaLoaf(l.getEntries()));
            observador.observe({ type: 'long-animation-frame', buffered: true });
        }
        requestAnimationFrame(passo);
    });
    m.marcar = () => { m.tAcao = performance.now(); performance.mark('desempenho:acao'); };
    m.parar = async () => {
        m.ativo = false;
        m.tFim = performance.now();
        await new Promise(r => setTimeout(r, 150)); // o LoAF chega depois do fim do quadro
        if (observador) { guardaLoaf(observador.takeRecords()); observador.disconnect(); observador = null; }
        const loaf = m.loaf.filter(e => e.startTime + e.duration >= m.t0 && e.startTime <= m.tFim).map(e => {
            const fim = e.startTime + e.duration;
            const scripts = e.scripts || [];
            const maior = scripts.reduce((a, s) => (!a || s.duration > a.duration ? s : a), null);
            return {
                inicio: e.startTime - m.tAcao, duracao: e.duration, bloqueio: e.blockingDuration,
                scripts: scripts.reduce((t, s) => t + s.duration, 0),
                render: e.renderStart ? fim - e.renderStart : 0,
                estiloLayout: e.styleAndLayoutStart ? fim - e.styleAndLayoutStart : 0,
                fonte: maior ? `${[maior.invoker, maior.sourceFunctionName].filter(Boolean).join(' ')} (${Math.round(maior.duration)} ms)` : ''
            };
        });
        return { quadros: m.quadros, fins: m.fins.map(f => f - m.tAcao), loaf, loafSuportado: m.loafSuportado, epoca: performance.timeOrigin + m.tAcao };
    };
    if (autoIniciar) m.iniciar();
}

// Dentro da página: o teste de Força da crypt. Clica na 2ª escolha (abre a bandeja),
// rola rolarApos ms depois e mede até janela ms depois da rolagem.
async function fluxoDado({ forcar, rolarApos, janela }) {
    const m = window.__desempenho;
    const dorme = ms => new Promise(ok => setTimeout(ok, ms));
    // Conferências só por classe e atributo: getClientRects() e getComputedStyle()
    // forçariam estilo e layout dentro da janela medida, no quadro do clique.
    const visivel = el => !!el && !el.hidden && !el.classList.contains('hidden');
    const cenaAntes = gameState.currentScene;
    const escolha = [...document.querySelectorAll('#choices button')][1];
    if (!escolha) throw new Error(`#choices não tem o 2º botão (o teste de Força da ${cenaAntes})`);
    await m.iniciar();
    m.marcar();
    escolha.click();
    await dorme(rolarApos);
    const rolar = document.getElementById('dice-button');
    if (!visivel(document.getElementById('dice-container'))) throw new Error('a bandeja (#dice-container) não abriu com o clique no teste');
    if (!rolar || rolar.disabled || rolar.getAttribute('aria-disabled') === 'true') throw new Error('#dice-button ausente ou desabilitado com a bandeja aberta');
    const original = Math.random;
    let comecou = false, resultado = null;
    if (forcar !== null) Math.random = () => forcar;
    try {
        rolar.click();
        await dorme(150);
        comecou = rolar.disabled || rolar.getAttribute('aria-disabled') === 'true'
            || !!document.getElementById('dice')?.classList.contains('rolling-animation');
        await dorme(1350); // o giro dura 1,3 s: aqui o resultado já está no dado
        resultado = document.getElementById('dice')?.textContent.trim() ?? null;
        await dorme(janela - 1500);
    } finally {
        Math.random = original;
    }
    const r = await m.parar();
    return { ...r, comecou, resultado, cenaAntes, cena: gameState.currentScene };
}

// Dentro da página: uma ação (ataque ou fuga) no combate já aberto, medida do clique até
// janela ms depois. O Math.random forçado sai do turno (gameState.combat.turn), e não da ordem
// das chamadas nem do tempo: o áudio também sorteia, e a animação do dado pode passar a sortear.
// A ferramenta não confere nada dentro da janela: o estado do combate sai antes e depois dela.
async function fluxoCombate({ acao, jogador, inimigo, vidaInimigo, vidaJogador, janela }) {
    const m = window.__desempenho;
    const c = gameState.combat;
    if (!c || !c.active) throw new Error('startInteractiveCombat não abriu o combate (gameState.combat.active)');
    if (c.turn !== 'player') throw new Error(`o combate abriu no turno "${c.turn}", e não no do jogador`);
    const atacar = document.getElementById(acao);
    if (!atacar || atacar.disabled || atacar.getAttribute('aria-disabled') === 'true') {
        throw new Error(`#${acao} ausente ou desabilitado no turno do jogador`);
    }
    if (vidaInimigo !== null) c.enemy.hp = vidaInimigo;
    if (vidaJogador !== null) { gameState.player.health = vidaJogador; updateStatsDisplay(); }
    const retrato = () => ({
        inimigo: gameState.combat.enemy.hp, jogador: gameState.player.health, xp: gameState.player.xp,
        turno: gameState.combat.turn, ativo: gameState.combat.active
    });
    const antes = retrato();
    const cenaAntes = gameState.currentScene;
    const original = Math.random;
    await m.iniciar();
    m.marcar();
    Math.random = () => (gameState.combat?.turn === 'enemy' ? inimigo : jogador);
    try {
        atacar.click();
        await new Promise(ok => setTimeout(ok, janela));
    } finally {
        Math.random = original;
    }
    const r = await m.parar();
    return { ...r, combate: { antes, depois: retrato() }, cenaAntes, cena: gameState.currentScene };
}

// ---------------------------------------------------------------------------
// Uma aba nova do navegador aquecido, com o save apagado e o jogo pronto na seleção.
async function abrirJogo(browser, base, cpu, reg, autoIniciar = false) {
    const page = await browser.newPage();
    await page.bringToFront();
    page.on('dialog', d => d.dismiss().catch(() => {}));
    page.on('pageerror', e => reg.avisos.push(`erro na página: ${e.message}`));
    page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('favicon.ico')) reg.avisos.push(`${r.status()} ${r.url()}`); });
    await page.setRequestInterception(true);
    page.on('request', r => (BLOQUEIO.test(r.url()) ? r.abort() : r.continue()));
    await page.evaluateOnNewDocument(instalarMedidor, autoIniciar);
    // O padrão é medir o movimento completo: com as animações do Windows desligadas,
    // o Chrome informa prefers-reduced-motion e o jogo pularia a máquina de escrever,
    // o giro do d20 e a chama do vitral. --movimento reduzido mede o outro caminho.
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: MOVIMENTO }]);
    await page.emulateCPUThrottling(cpu === 1 ? null : cpu); // Emulation.setCPUThrottlingRate
    await page.goto(base + '/ded/', { waitUntil: 'domcontentloaded' });
    try {
        await page.waitForFunction(() => typeof scenes === 'object' && scenes && Object.keys(scenes).length > 50, { timeout: 30000 });
    } catch {
        throw new Error('as cenas (scenes) não carregaram em 30 s');
    }
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => { ttsEnabled = false; });
    return page;
}

// Pula a máquina de escrever até as escolhas aparecerem; depois espera as imagens.
async function prontoParaEscolher(page) {
    try {
        await page.waitForFunction(() => {
            const b = [...document.querySelectorAll('#choices button')];
            const prontas = b.length >= 2 && b.every(x => !x.disabled);
            if (!prontas) skipTyping = true;
            return prontas;
        }, { timeout: 15000, polling: 50 });
    } catch {
        throw new Error('as escolhas (#choices button) não apareceram em 15 s');
    }
    await page.waitForFunction(() => [...document.images].every(i => i.complete), { timeout: 5000 }).catch(() => {});
}

// Começa como um jogador, com cliques de verdade no card e no botão de começar (o
// primeiro <button> da seleção). A primeira interação da página liga o Web Audio e
// a voz (~10 ms de script); no jogo isso acontece na seleção, não no teste de dado.
async function novoJogo(page) {
    await page.click('.character-card[data-class="warrior"]');
    await page.click('#character-select button');
    await prontoParaEscolher(page);
}

async function naCripta(page) {
    await novoJogo(page);
    await page.evaluate(() => loadScene('crypt'));
    await prontoParaEscolher(page);
    await espera(400);
}

// Dentro da página: o "Enfrentar" da bandeja (o teste de combate já rolado) abre o combate.
// Mede do clique até janela ms depois.
async function fluxoEntrada({ janela }) {
    const m = window.__desempenho;
    const botao = document.getElementById('dice-button');
    if (!botao || !/Enfrentar/.test(botao.textContent)) throw new Error(`o #dice-button não ofereceu "Enfrentar" (diz "${botao && botao.textContent}")`);
    await m.iniciar();
    m.marcar();
    botao.click();
    await new Promise(ok => setTimeout(ok, janela));
    const r = await m.parar();
    return { ...r, combate: { ativo: !!(gameState.combat && gameState.combat.active) } };
}

// Rastreio leve da janela medida: as tarefas de cada thread ('toplevel') e a marca da ação, de onde
// saem as limpezas ociosas da GPU e o trabalho da thread principal da página (ver as armadilhas),
// em ms contados da ação.
async function comRastreio(page, executar) {
    if (!RASTREAR) return Object.assign(await executar(), { limpezas: null, trabalho: null });
    const arq = path.join(os.tmpdir(), `ded-desempenho-${process.pid}-${Date.now()}.json`);
    await page.tracing.start({ path: arq, categories: ['toplevel', 'blink.user_timing'] });
    let r;
    try {
        r = await executar();
    } finally {
        await page.tracing.stop().catch(() => {});
    }
    Object.assign(r, lerRastreio(arq));
    // o rastreio de uma execução que passou do limite fica guardado, para achar a causa
    if (r.quadros.some(passou)) {
        fs.mkdirSync(PASTA_RASTREIOS, { recursive: true });
        r.rastreioGuardado = path.join(PASTA_RASTREIOS, path.basename(arq));
        fs.copyFileSync(arq, r.rastreioGuardado);
    }
    fs.rmSync(arq, { force: true });
    return r;
}

function lerRastreio(arq) {
    let eventos;
    try { eventos = JSON.parse(fs.readFileSync(arq, 'utf8')).traceEvents; } catch { return { limpezas: null, trabalho: null }; }
    const marca = eventos.find(e => e.name === 'desempenho:acao');
    if (!marca) return { limpezas: null, trabalho: null };
    const threads = new Map();
    for (const e of eventos) if (e.name === 'thread_name') threads.set(`${e.pid}:${e.tid}`, e.args && e.args.name);
    const ms = ts => (ts - marca.ts) / 1000;
    const tarefas = eventos.filter(e => e.ph === 'X' && e.name === 'ThreadControllerImpl::RunTask');
    return {
        limpezas: tarefas.filter(e => e.dur >= 5000 && e.args?.src_func === 'ScheduleCleanUpAllResources'
            && threads.get(`${e.pid}:${e.tid}`) === 'CrGpuMain').map(e => ({ inicio: ms(e.ts), duracao: e.dur / 1000 })),
        // a thread principal da página é a da marca
        trabalho: tarefas.filter(e => e.pid === marca.pid && e.tid === marca.tid && e.dur >= 100).map(e => [ms(e.ts), ms(e.ts + e.dur)])
    };
}

// Um quadro acima do limite é da limpeza ociosa da GPU quando a tarefa roda durante ele, quando
// ele caberia no limite sem o trecho dela que cai dentro do quadro e quando a página quase não
// trabalhou nesse intervalo (menos de TRABALHO_MAX_MS na thread principal).
const sobreposicao = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
const intervalo = (e, i) => [e.fins[i] - e.quadros[i], e.fins[i]];
function trechoDaLimpeza(e, i) {
    const [inicio, fim] = intervalo(e, i);
    return Math.max(0, ...(e.limpezas || []).map(l => sobreposicao(inicio, fim, l.inicio, l.inicio + l.duracao)));
}
function trabalhoDaPagina(e, i) {
    const [inicio, fim] = intervalo(e, i);
    return (e.trabalho || []).reduce((t, [a, b]) => t + sobreposicao(inicio, fim, a, b), 0);
}
function daLimpeza(e, i) {
    if (!passou(e.quadros[i]) || !e.limpezas || !e.trabalho) return false;
    const trecho = trechoDaLimpeza(e, i);
    return trecho > 0 && e.quadros[i] - trecho <= LIMITE_MS + FOLGA_MS && trabalhoDaPagina(e, i) < TRABALHO_MAX_MS;
}
const daPagina = (e, i) => passou(e.quadros[i]) && !daLimpeza(e, i);

async function cenarioAbertura(browser, base, cpu, reg) {
    const page = await abrirJogo(browser, base, cpu, reg, true);
    try {
        await espera(2000);
        reg.execucoes.push(await page.evaluate(() => window.__desempenho.parar()));
    } finally { await page.close().catch(() => {}); }
}

async function cenarioExploracao(browser, base, cpu, reg) {
    const page = await abrirJogo(browser, base, cpu, reg);
    try {
        await espera(1000); // seleção parada
        const r = await comRastreio(page, () => page.evaluate(async janela => {
            const m = window.__desempenho;
            await m.iniciar();
            m.marcar();
            selectCharacter('warrior');
            startGame();
            await new Promise(ok => setTimeout(ok, janela));
            return { ...(await m.parar()), cena: gameState.currentScene };
        }, 3000));
        if (r.cena !== 'start') reg.avisos.push(`startGame() deixou o jogo em "${r.cena}", não em "start"`);
        reg.execucoes.push(r);
    } finally { await page.close().catch(() => {}); }
}

async function cenarioTextoLongo(browser, base, cpu, reg) {
    const page = await abrirJogo(browser, base, cpu, reg);
    try {
        await novoJogo(page);
        await espera(400);
        const alvo = await page.evaluate(() => {
            const [id, s] = Object.entries(scenes).filter(([, c]) => c && typeof c.text === 'string')
                .reduce((a, b) => (b[1].text.length > a[1].text.length ? b : a));
            return { id, tamanho: s.text.length };
        });
        reg.nota = `cena ${alvo.id} (${alvo.tamanho} caracteres)`;
        const r = await comRastreio(page, () => page.evaluate(async ({ id, janela }) => {
            const m = window.__desempenho;
            await m.iniciar();
            m.marcar();
            loadScene(id);
            await new Promise(ok => setTimeout(ok, janela));
            return { ...(await m.parar()), cena: gameState.currentScene };
        }, { id: alvo.id, janela: 4000 }));
        if (r.cena !== alvo.id) throw new Error(`loadScene('${alvo.id}') não entrou na cena (ficou em "${r.cena}")`);
        reg.execucoes.push(r);
    } finally { await page.close().catch(() => {}); }
}

// teste-d20, critico-20, critico-1 e cada rodada do primeiro-clique.
async function cenarioDado(browser, base, cpu, reg, forcar, janela) {
    const page = await abrirJogo(browser, base, cpu, reg);
    try {
        await naCripta(page);
        const r = await comRastreio(page, () => page.evaluate(fluxoDado, { forcar, rolarApos: 300, janela }));
        if (!r.comecou && r.cena === r.cenaAntes) throw new Error('o clique em #dice-button não rolou o dado');
        if (forcar !== null) {
            const n = forcar === 0 ? 1 : 20;
            if (r.resultado === null) reg.avisos.push('não deu para ler o resultado no #dice');
            else if (!new RegExp(`(^|\\D)${n}(\\D|$)`).test(r.resultado)) reg.avisos.push(`o #dice mostrou "${r.resultado}", e o forçado era ${n}`);
        }
        if (janela >= 3400 && r.cena === r.cenaAntes) reg.avisos.push(`a cena não saiu de "${r.cenaAntes}" sozinha depois do dado (há um "Continuar"?)`);
        reg.execucoes.push(r);
        return r;
    } finally { await page.close().catch(() => {}); }
}

// combate-entrada: na sala do Goblin, a escolha de lutar, o d20 e o "Enfrentar", que é clicado
// depois da pausa de ativação (o avanço sozinho viria em 1,8 s).
async function cenarioEntrada(browser, base, cpu, reg) {
    const page = await abrirJogo(browser, base, cpu, reg);
    try {
        await novoJogo(page);
        await page.evaluate(() => loadScene('goblin_encounter'));
        await prontoParaEscolher(page);
        await espera(400);
        await page.evaluate(() => {
            const i = scenes.goblin_encounter.choices.findIndex(c => c.checkType === 'combat');
            if (i < 0) throw new Error('goblin_encounter não tem a escolha de combate (checkType "combat")');
            [...document.querySelectorAll('#choices button')][i].click();
        });
        await espera(400);
        await page.evaluate(() => document.getElementById('dice-button').click());
        await page.waitForFunction(() => /Enfrentar/.test(document.getElementById('dice-button').textContent), { timeout: 5000 })
            .catch(() => { throw new Error('o d20 do teste de combate não ofereceu "Enfrentar" em 5 s'); });
        await espera(400);
        const r = await comRastreio(page, () => page.evaluate(fluxoEntrada, { janela: 2000 }));
        if (!r.combate.ativo) reg.avisos.push('o "Enfrentar" não abriu o combate');
        reg.execucoes.push(r);
        return r;
    } finally { await page.close().catch(() => {}); }
}

// combate, vitória, derrota e fuga: jogo novo de guerreiro, o Goblin, 800 ms com o combate
// parado (depois das imagens) e uma ação. As conferências viram aviso; só um clique que não
// mexe em nada é erro.
async function cenarioCombate(browser, base, cpu, reg, { tipo, acao, jogador, inimigo, vidaInimigo, vidaJogador, janela }) {
    const page = await abrirJogo(browser, base, cpu, reg);
    try {
        await novoJogo(page);
        await page.evaluate(g => startInteractiveCombat(g), GOBLIN);
        await page.waitForFunction(() => [...document.images].every(i => i.complete), { timeout: 5000 }).catch(() => {});
        await espera(800);
        const r = await comRastreio(page, () => page.evaluate(fluxoCombate, { acao, jogador, inimigo, vidaInimigo, vidaJogador, janela }));
        const { antes, depois } = r.combate;
        if (depois.ativo && depois.inimigo === antes.inimigo && depois.jogador === antes.jogador && tipo !== 'fuga') {
            throw new Error(`o clique em #${acao} não fez nada (nenhuma vida mudou)`);
        }
        if (tipo === 'derrota') {
            reg.nota = `vida do jogador ${antes.jogador} → ${depois.jogador}, cena "${r.cenaAntes}" → "${r.cena}"`;
            if (depois.ativo) reg.avisos.push(`em ${janela} ms o combate não fechou`);
            else if (r.cena !== 'death') reg.avisos.push(`a derrota levou à cena "${r.cena}", e não à "death"`);
        } else if (tipo === 'fuga') {
            reg.nota = `cena "${r.cenaAntes}" → "${r.cena}"`;
            if (depois.ativo) reg.avisos.push(`em ${janela} ms a fuga não fechou o combate`);
        } else if (tipo === 'rodada') {
            reg.nota = `vida do Goblin ${antes.inimigo} → ${depois.inimigo}, do jogador ${antes.jogador} → ${depois.jogador}`;
            if (depois.inimigo <= 0) reg.avisos.push('o ataque forçado matou o Goblin: a rodada ficou sem o turno do inimigo');
            else if (depois.inimigo >= antes.inimigo) reg.avisos.push('o ataque forçado não tirou vida do Goblin');
            if (depois.jogador >= antes.jogador) reg.avisos.push('o Goblin não acertou o jogador (sem tremor nem clarão vermelho)');
            if (depois.ativo && depois.turno !== 'player') reg.avisos.push(`em ${janela} ms a vez não voltou para o jogador (turno "${depois.turno}")`);
        } else {
            reg.nota = `XP ${antes.xp} → ${depois.xp}, cena "${r.cenaAntes}" → "${r.cena}"`;
            if (depois.xp <= antes.xp) reg.avisos.push('a vitória não deu XP');
            if (depois.ativo) reg.avisos.push(`em ${janela} ms o combate não fechou (sem a volta para uma cena)`);
            else if (r.cena === r.cenaAntes) reg.avisos.push(`o combate fechou, mas a cena continuou "${r.cena}"`);
        }
        reg.execucoes.push(r);
        return r;
    } finally { await page.close().catch(() => {}); }
}

// Joga uma vez (o 20 natural, o caminho com mais arte) para aquecer a GPU, os
// caches e o perfil, e mede o intervalo de atualização com a página parada.
async function aquecer(browser, base, modo) {
    const reg = { avisos: [] };
    const page = await abrirJogo(browser, base, 1, reg);
    try {
        try {
            if (modo !== 'nenhum') {
                await naCripta(page);
                await page.evaluate(fluxoDado, { forcar: 0.96, rolarApos: 300, janela: 3400 });
            }
            if (modo === 'combate') {
                // uma luta aberta e vencida (o 20 natural no Goblin com 1 de vida)
                await page.evaluate(g => startInteractiveCombat(g), GOBLIN);
                await espera(800);
                await page.evaluate(() => {
                    gameState.combat.enemy.hp = 1;
                    Math.random = () => 0.96;
                    document.getElementById('btn-combat-attack').click();
                });
                await espera(5500);
            }
        } catch (e) { reg.avisos.push(`aquecimento incompleto: ${e.message}`); }
        await espera(500);
        const r = await page.evaluate(async () => {
            const m = window.__desempenho;
            await m.iniciar();
            await new Promise(ok => setTimeout(ok, 1000));
            return m.parar();
        });
        // A mediana oscila com o ruído; a média dos quadros normais dá a taxa da tela.
        const mediana = estatistica([r]).mediana;
        const normais = r.quadros.filter(d => d > mediana / 2 && d < mediana * 1.5);
        const intervalo = normais.reduce((a, b) => a + b, 0) / normais.length;
        return { intervalo, mediana, loafSuportado: r.loafSuportado, avisos: reg.avisos };
    } finally { await page.close().catch(() => {}); }
}

// ---------------------------------------------------------------------------
function estatistica(execucoes) {
    const quadros = execucoes.flatMap(e => e.quadros);
    const ord = [...quadros].sort((a, b) => a - b);
    const q = p => (ord.length ? ord[Math.max(0, Math.ceil(p * ord.length) - 1)] : NaN);
    let pior = null;
    for (const e of execucoes) e.quadros.forEach((d, i) => { if (!pior || d > pior.d) pior = { d, inicio: e.fins[i] - d }; });
    const loafs = execucoes.flatMap(e => e.loaf);
    const conta = f => execucoes.reduce((t, e) => t + e.quadros.filter((_, i) => f(e, i)).length, 0);
    return {
        quadros: quadros.length, mediana: q(0.5), p95: q(0.95), p99: q(0.99), max: pior ? pior.d : NaN,
        acima: conta(daPagina), limpeza: conta(daLimpeza), piorEm: pior ? pior.inicio : NaN,
        loafBloqueio: execucoes.some(e => e.loafSuportado) ? Math.max(0, ...loafs.map(l => l.bloqueio)) : null,
        loafDuracao: execucoes.some(e => e.loafSuportado) ? Math.max(0, ...loafs.map(l => l.duracao)) : null
    };
}

const num = (v, casas = 1) => (Number.isFinite(v) ? v.toFixed(casas).replace('.', ',') : '—');
const LARGURAS = [22, 4, 8, 8, 7, 7, 7, 6, 4, 6, 10];
const linha = cols => cols.map((c, i) => String(c)[i === 0 ? 'padEnd' : 'padStart'](LARGURAS[i])).join(' ');

function imprimir(resultados, meta) {
    console.log('\n' + linha(['cenário', 'CPU', 'quadros', 'mediana', 'p95', 'p99', 'máx', '>20,8', 'GPU', 'LoAF', 'pior em']));
    console.log('-'.repeat(LARGURAS.reduce((a, b) => a + b + 1, -1)));
    for (const r of resultados) {
        const nome = r.cenario + (SO_INFORMA.has(r.cenario) ? ' (info)' : r.tentativas > 1 ? ` ×${r.tentativas}` : '');
        if (!r.execucoes.length) { console.log(linha([nome, `${r.cpu}x`, 'ERRO', '', '', '', '', '', '', '', ''])); continue; }
        const s = r.resumo;
        console.log(linha([nome, `${r.cpu}x`, s.quadros, num(s.mediana), num(s.p95), num(s.p99), num(s.max), s.acima, s.limpeza,
            s.loafBloqueio === null ? '—' : Math.round(s.loafBloqueio), `${s.piorEm >= 0 ? '+' : ''}${Math.round(s.piorEm)} ms`]));
    }
    console.log('\nTempos em ms. ">20,8": quadros acima do limite que contam contra a página. "GPU": os acima do limite');
    console.log('que caíram na limpeza ociosa da GPU e ficam fora do veredito (ver o cabeçalho do script). "pior em":');
    console.log('início do quadro mais lento, contado da ação (na abertura, do início do documento).');
    console.log('LoAF: pior bloqueio (ms) entre os quadros acima de 50 ms. Um LoAF longo com pouco script e pouco');
    console.log('render quer dizer que a thread principal esperou a GPU, a rasterização ou a decodificação de imagem.');
    for (const r of resultados) {
        const rotulo = `${r.cenario} ${r.cpu}x`;
        if (r.nota) console.log(`${rotulo}: ${r.nota}`);
        const pior = r.execucoes.flatMap(e => e.loaf).reduce((a, l) => (!a || l.duracao > a.duracao ? l : a), null);
        if (pior) {
            console.log(`${rotulo}: pior LoAF ${num(pior.duracao, 0)} ms em ${pior.inicio >= 0 ? '+' : ''}${Math.round(pior.inicio)} ms ` +
                `(bloqueio ${num(pior.bloqueio, 0)}, scripts ${num(pior.scripts, 0)}, render ${num(pior.render, 0)}, ` +
                `estilo e layout ${num(pior.estiloLayout, 0)})${pior.fonte ? `; maior script: ${pior.fonte}` : ''}`);
        }
        const quadrosDe = f => r.execucoes.flatMap((e, k) => e.quadros.map((d, i) => ({ d, inicio: e.fins[i] - d, k, e, i })).filter(x => f(x.e, x.i)));
        const fmt = x => `${num(x.d)}@${x.inicio >= 0 ? '+' : ''}${Math.round(x.inicio)}${r.execucoes.length > 1 ? ` (exec ${x.k + 1})` : ''}`;
        const acima = quadrosDe(daPagina);
        if (acima.length) console.log(`${rotulo}: acima do limite (ms@início): ${acima.slice(0, 40).map(fmt).join(', ')}${acima.length > 40 ? ', …' : ''}`);
        const guardados = [...new Set(acima.map(x => x.e.rastreioGuardado).filter(Boolean))];
        if (guardados.length) console.log(`${rotulo}: rastreio guardado: ${guardados.join(', ')}`);
        const naLimpeza = quadrosDe(daLimpeza);
        if (naLimpeza.length) {
            console.log(`${rotulo}: na limpeza ociosa da GPU, fora do veredito (ms@início, trecho da tarefa no quadro, trabalho da página): ` +
                naLimpeza.map(x => `${fmt(x)} ${num(trechoDaLimpeza(x.e, x.i))} ${num(trabalhoDaPagina(x.e, x.i))}`).join(', '));
        }
        if (RASTREAR && r.execucoes.some(e => e.limpezas === null)) r.avisos.push('sem o rastreio da GPU em alguma execução: os quadros dela contam todos contra a página');
        if (r.execucoes.length > 1) {
            const maximos = r.execucoes.map(e => Math.max(...e.quadros));
            const comPagina = r.execucoes.filter(e => e.quadros.some((_, i) => daPagina(e, i))).length;
            console.log(`${rotulo}: máximo por execução: ${maximos.map(v => num(v)).join(' ')}`);
            console.log(`${rotulo}: execuções com quadro da página acima de 20,8 ms: ${comPagina}/${maximos.length}; pior ${num(Math.max(...maximos))} ms`);
        }
        const erros = new Map();
        for (const e of r.erros) { const msg = e.replace(/^execução \d+: /, ''); erros.set(msg, (erros.get(msg) || 0) + 1); }
        for (const [msg, n] of erros) console.log(`${rotulo}: ERRO${n > 1 ? ` (${n} execuções)` : ''} ${msg}`);
        for (const a of new Set(r.avisos)) console.log(`${rotulo}: aviso: ${a}`);
    }
    for (const a of new Set(meta.avisosAquecimento)) console.log(`aquecimento: aviso: ${a}`);
    const hz = meta.intervaloMs ? Math.round(1000 / meta.intervaloMs) : NaN;
    const codigo = meta.commit ? `${meta.commit}${meta.sujo ? ` + ${meta.alterados.length} alterado(s)` : ''}` : 'fora do git';
    console.log(`\ncódigo ${codigo} | movimento ${MOVIMENTO === 'reduce' ? 'reduzido' : 'padrão'} | aquecimento ${AQUECIMENTO} | ${meta.chrome} | intervalo de atualização medido ${num(meta.intervaloMs, 2)} ms (~${hz} Hz; ` +
        `mediana ${num(meta.intervaloMedianaMs, 2)}) | LoAF ${meta.loafSuportado ? 'disponível' : 'indisponível'} | ` +
        `limite ${num(LIMITE_MS, 2)} ms + folga ${num(FOLGA_MS)} ms`);
}

function veredito(resultados) {
    const contam = resultados.filter(r => r.cpu === 1 && !SO_INFORMA.has(r.cenario));
    if (!contam.length) return { texto: 'SEM VEREDITO (nenhum cenário de aceite em CPU 1x)', aprovado: true };
    const acima = contam.reduce((t, r) => t + (r.execucoes.length ? r.resumo.acima : 0), 0);
    const naLimpeza = contam.reduce((t, r) => t + (r.execucoes.length ? r.resumo.limpeza : 0), 0);
    const erros = contam.reduce((t, r) => t + r.erros.length, 0);
    const fora = naLimpeza ? `${naLimpeza} ${naLimpeza === 1 ? 'quadro' : 'quadros'} na limpeza da GPU, fora do veredito` : '';
    if (!acima && !erros) return { texto: `APROVADO${fora ? ` (${fora})` : ''}`, aprovado: true };
    const partes = [`${acima} ${acima === 1 ? 'quadro' : 'quadros'} acima de 20,8 ms em CPU 1x`];
    if (erros) partes.push(`${erros} erro(s) de medição`);
    if (fora) partes.push(fora);
    return { texto: `REPROVADO (${partes.join('; ')})`, aprovado: false };
}

// Parada do ambiente: um quadro de mais de 100 ms em que a thread principal não
// trabalhou (todo LoAF longo sem script nem render). Ela aparece até numa página
// vazia, uns 120 s depois de o Chrome abrir. A execução é refeita uma vez, e o
// relatório avisa. Um quadro longo com script ou render é da página e fica.
function paradaDoAmbiente(e) {
    const longos = (e.loaf || []).filter(l => l.duracao > 100);
    // render até 5 ms: é o do próprio quadro (uma parada de 503 ms teve 3,2)
    return Math.max(...e.quadros) > 100 && longos.length > 0 && longos.every(l => l.scripts <= 2 && l.render <= 5);
}

async function comRefacao(reg, executar) {
    const antes = reg.execucoes.length;
    const r = await executar();
    const e = reg.execucoes[reg.execucoes.length - 1];
    if (reg.execucoes.length > antes && paradaDoAmbiente(e)) {
        reg.execucoes.pop();
        reg.avisos.push(`execução refeita: parada do ambiente de ${Math.round(Math.max(...e.quadros))} ms ` +
            '(LoAF sem script nem render)');
        return executar();
    }
    return r;
}

// Qual código foi medido: o commit da raiz servida e os arquivos alterados fora dele
function versaoDoCodigo(raiz) {
    const git = (...args) => execFileSync('git', args, { cwd: raiz, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    try {
        const alterados = git('status', '--porcelain').split('\n').filter(Boolean).map(l => l.slice(3));
        return { commit: git('rev-parse', '--short', 'HEAD').trim(), sujo: alterados.length > 0, alterados };
    } catch {
        return { commit: null, sujo: null, alterados: [] }; // raiz fora de um repositório (cópia solta)
    }
}

async function medir({ cenarios, execucoes, repeticoes, cpus, json, raiz, perfil }) {
    const srv = await servidor(path.resolve(raiz));
    const base = `http://127.0.0.1:${srv.address().port}`;
    fs.mkdirSync(perfil, { recursive: true });
    const lancamento = Date.now(); // o JSON guarda quando cada medição começou, contado daqui
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: perfil,
        defaultViewport: { width: 1920, height: 1080 },
        args: ['--window-size=1920,1160', '--window-position=0,0', '--autoplay-policy=no-user-gesture-required',
            '--mute-audio', '--disable-features=CalculateNativeWinOcclusion']
    });
    const resultados = [];
    let meta;
    try {
        console.log('aquecendo...');
        const aq = await aquecer(browser, base, AQUECIMENTO);
        meta = {
            ...versaoDoCodigo(path.resolve(raiz)),
            chrome: await browser.version(), intervaloMs: aq.intervalo, intervaloMedianaMs: aq.mediana,
            loafSuportado: aq.loafSuportado, avisosAquecimento: aq.avisos
        };
        for (const cpu of cpus) {
            for (const cenario of cenarios) {
                if (cpu !== 1 && !EM_4X.has(cenario)) continue;
                const vezes = cenario === 'primeiro-clique' ? execucoes : cenario === 'abertura' || cpu !== 1 ? 1 : repeticoes;
                const reg = { cenario, cpu, tentativas: vezes, execucoes: [], erros: [], avisos: [], nota: '' };
                resultados.push(reg);
                process.stdout.write(`${cenario} ${cpu}x... `);
                const executar = {
                    exploracao: () => cenarioExploracao(browser, base, cpu, reg),
                    'texto-longo': () => cenarioTextoLongo(browser, base, cpu, reg),
                    'combate-entrada': () => cenarioEntrada(browser, base, cpu, reg),
                    'primeiro-clique': () => cenarioDado(browser, base, cpu, reg, null, 1800)
                }[cenario] || (cenario in FORCAR ? () => cenarioDado(browser, base, cpu, reg, FORCAR[cenario], 3400)
                    : cenario in COMBATE ? () => cenarioCombate(browser, base, cpu, reg, COMBATE[cenario]) : null);
                if (cenario === 'abertura') {
                    try { await cenarioAbertura(browser, base, cpu, reg); } catch (e) { reg.erros.push(e.message.split('\n')[0]); }
                } else {
                    for (let i = 0; i < vezes; i++) {
                        try {
                            await comRefacao(reg, executar);
                            if (vezes > 1) process.stdout.write(`${num(Math.max(...reg.execucoes[reg.execucoes.length - 1].quadros))} `);
                        } catch (e) {
                            reg.erros.push(`${vezes > 1 ? `execução ${i + 1}: ` : ''}${e.message.split('\n')[0]}`);
                            if (vezes > 1) process.stdout.write('x ');
                        }
                        await espera(300);
                    }
                }
                if (reg.execucoes.length) reg.resumo = estatistica(reg.execucoes);
                console.log(reg.erros.length ? `→ ${reg.erros.length} erro(s)` : `→ máx ${num(reg.resumo.max)} ms`);
                await espera(300);
            }
        }
    } finally {
        await browser.close();
        srv.close();
    }
    imprimir(resultados, meta);
    const v = veredito(resultados);
    console.log(v.texto);
    if (json) {
        const r2 = v => Math.round(v * 100) / 100;
        const saida = {
            data: new Date().toISOString(), ...meta, limiteMs: LIMITE_MS, folgaMs: FOLGA_MS, viewport: '1920x1080', veredito: v.texto,
            resultados: resultados.map(r => ({
                cenario: r.cenario, cpu: r.cpu, nota: r.nota, resumo: r.resumo ?? null, erros: r.erros, avisos: [...new Set(r.avisos)],
                execucoes: r.execucoes.map(e => ({
                    aposLancamentoMs: Math.round(e.epoca - lancamento), quadros: e.quadros.map(r2), fins: e.fins.map(r2), loaf: e.loaf,
                    limpezasGpu: e.limpezas && e.limpezas.map(l => ({ inicio: r2(l.inicio), duracao: r2(l.duracao) })),
                    quadrosNaLimpeza: e.quadros.map((_, i) => i).filter(i => daLimpeza(e, i)),
                    rastreio: !!(e.limpezas && e.trabalho), rastreioGuardado: e.rastreioGuardado || null,
                    comecou: e.comecou, resultado: e.resultado, cenaAntes: e.cenaAntes, cena: e.cena, combate: e.combate
                }))
            }))
        };
        fs.writeFileSync(path.resolve(json), JSON.stringify(saida, null, 1));
        console.log(`JSON em ${path.resolve(json)}`);
    }
    if (!v.aprovado) process.exitCode = 1;
}

// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
let invalido = args.includes('--ajuda') || args.includes('-h');
const opcao = nome => {
    const i = args.indexOf(nome);
    if (i < 0) return null;
    const v = args.splice(i, 2)[1];
    if (v === undefined) invalido = true;
    return v ?? null;
};
const cenarios = (opcao('--cenarios') || CENARIOS.join(',')).split(',').map(s => s.trim()).filter(Boolean);
const execucoes = Number(opcao('--execucoes') ?? 30);
const repeticoes = Number(opcao('--repeticoes') ?? 10);
if (args.includes('--sem-rastreio')) { args.splice(args.indexOf('--sem-rastreio'), 1); RASTREAR = false; }
const pastaRastreios = opcao('--rastreios');
if (pastaRastreios) PASTA_RASTREIOS = path.resolve(pastaRastreios);
AQUECIMENTO = opcao('--aquecimento') ?? 'd20';
const cpu = opcao('--cpu') ?? 'ambos';
const json = opcao('--json');
const raiz = opcao('--raiz') || RAIZ_PADRAO;
const perfil = path.resolve(opcao('--perfil') || PERFIL_PADRAO);
const movimento = opcao('--movimento') ?? 'padrao';
MOVIMENTO = movimento === 'reduzido' ? 'reduce' : 'no-preference';
const desconhecidos = cenarios.filter(c => !CENARIOS.includes(c));
if (invalido || args.length || desconhecidos.length || !Number.isInteger(execucoes) || execucoes < 1
    || !Number.isInteger(repeticoes) || repeticoes < 1 || !['1', '4', 'ambos'].includes(cpu)
    || !['d20', 'combate', 'nenhum'].includes(AQUECIMENTO)
    || !['padrao', 'reduzido'].includes(movimento)) {
    if (desconhecidos.length) console.log(`Cenário(s) desconhecido(s): ${desconhecidos.join(', ')}`);
    console.log('Uso:\n  node ded/tools/desempenho.mjs [--cenarios a,b,c] [--execucoes 30] [--repeticoes 10] [--cpu 1|4|ambos]\n' +
        '                                [--json saida.json] [--raiz <repo>] [--perfil <pasta>]\n' +
        '                                [--movimento padrao|reduzido] [--sem-rastreio] [--rastreios <pasta>]\n' +
        '                                [--aquecimento d20|combate|nenhum]\n' +
        `Cenários (* repete em CPU 4x): ${CENARIOS.map(c => c + (EM_4X.has(c) ? ' *' : '')).join(', ')}`);
    process.exitCode = 2;
} else {
    await medir({ cenarios, execucoes, repeticoes, cpus: cpu === 'ambos' ? [1, 4] : [Number(cpu)], json, raiz, perfil });
}
