// Desafio do Dia: regras (assets/js/desafio-core.js), integridade dos jogos participantes, da página e da home.
// Não usa navegador (o comportamento no navegador está em qa_desafio.test.js).
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const core = require(path.join(ROOT, 'assets/js/desafio-core.js'));
const catalog = JSON.parse(read('games.json'));

// ---- fuso: a data do desafio é a de Brasília (UTC-3), não a do servidor nem a de UTC
assert.strictEqual(core.brtDate(new Date('2026-10-20T02:59:59Z')), '2026-10-19', '23:59 em Brasília ainda é dia 19');
assert.strictEqual(core.brtDate(new Date('2026-10-20T03:00:00Z')), '2026-10-20', 'meia-noite em Brasília vira o dia');
assert.strictEqual(core.brtDate(new Date('2026-12-31T23:30:00-03:00')), '2026-12-31');
assert.strictEqual(core.msUntilNext(new Date('2026-10-20T02:59:59Z')), 1000, 'falta 1 s para o próximo desafio');
assert.strictEqual(core.msUntilNext(new Date('2026-10-20T03:00:00Z')), 86400000, 'recém virou: faltam 24 h');

// ---- datas
for (const ok of ['2026-10-20', '2028-02-29']) assert.ok(core.isDate(ok), ok);
for (const bad of ['2026-02-30', '2026-13-01', '2026-10-32', '20261020', '2026-1-5', '', null, undefined, '2026-10-20T10:00', '2027-02-29']) assert.ok(!core.isDate(bad), `data inválida: ${bad}`);
assert.strictEqual(core.addDays('2026-10-31', 1), '2026-11-01');
assert.strictEqual(core.addDays('2026-03-01', -1), '2026-02-28');
assert.strictEqual(core.addDays('2028-03-01', -1), '2028-02-29');

// ---- rodízio: determinístico, nenhum jogo repetido em dias seguidos, ciclo = nº de jogos
{
    const n = core.GAMES.length;
    assert.ok(n >= 5);
    assert.strictEqual(new Set(core.GAMES.map((g) => g.slug)).size, n, 'slugs únicos');
    const seen = [];
    let d = '2026-10-12';
    for (let i = 0; i < n * 3; i++) {
        const c = core.challengeFor(d);
        assert.strictEqual(core.challengeFor(d).game.slug, c.game.slug, 'mesma data, mesmo jogo');
        if (seen.length) assert.notStrictEqual(c.game.slug, seen[seen.length - 1], 'dias seguidos nunca repetem o jogo');
        if (i >= n) assert.strictEqual(c.game.slug, seen[i - n], 'o ciclo se repete a cada N dias');
        seen.push(c.game.slug);
        d = core.addDays(d, 1);
    }
    assert.strictEqual(new Set(seen.slice(0, n)).size, n, 'em N dias, todos os jogos aparecem');
    assert.strictEqual(core.challengeFor('2026-10-12').edition, 1, 'lançamento é a edição 1');
    assert.strictEqual(core.challengeFor('2026-10-20').edition, 9);
    assert.ok(core.challengeFor('1969-12-31').game, 'datas antes de 1970 também funcionam (módulo negativo)');
    assert.throws(() => core.challengeFor('2026-02-30'), /data inválida/);
    // trava de regressão: mudar a ordem ou o tamanho da lista muda o jogo de todos os dias futuros
    assert.deepStrictEqual(core.GAMES.map((g) => g.slug), ['snake', 'block_stacker', 'space_shooter', 'archer', 'pinball']);
    assert.strictEqual(core.challengeFor('2026-10-20').game.slug, core.GAMES[core.dayNumber('2026-10-20') % 5].slug);
}

// ---- o overlay só vale para o jogo certo, em data recente que já começou
{
    const now = new Date('2026-10-20T15:00:00Z');
    assert.ok(core.acceptsDate('2026-10-20', now));
    assert.ok(core.acceptsDate('2026-10-06', now), '14 dias atrás ainda vale');
    assert.ok(!core.acceptsDate('2026-10-05', now), '15 dias atrás não vale');
    assert.ok(!core.acceptsDate('2026-10-21', now), 'data futura não vale');
    assert.ok(!core.acceptsDate('2026-02-30', now));
    assert.strictEqual(core.slugFromPath('/snake'), 'snake');
    assert.strictEqual(core.slugFromPath('/snake/'), 'snake');
    assert.strictEqual(core.slugFromPath('/snake/index.html'), 'snake');
    assert.strictEqual(core.slugFromPath('/chess/'), null, 'jogo fora do rodízio');
    assert.strictEqual(core.slugFromPath('/'), null);
}

// ---- leitura da pontuação
assert.strictEqual(core.parseScore('Score: 0'), 0);
assert.strictEqual(core.parseScore('Score: 17'), 17);
assert.strictEqual(core.parseScore('🎯 Pontos: 1.250'), 1250, 'ponto de milhar');
assert.strictEqual(core.parseScore('1,250'), 1250);
assert.strictEqual(core.parseScore('12.5'), 12, 'decimal curto não vira milhar');
assert.strictEqual(core.parseScore('  42  '), 42);
assert.strictEqual(core.parseScore('sem número'), null);
assert.strictEqual(core.parseScore(null), null);

// ---- estado, melhor do dia e sequência
{
    const at = (d) => new Date(d + 'T15:00:00Z'); // meio do dia em Brasília
    const s = core.emptyState();
    assert.strictEqual(core.record(s, '2026-10-20', 'snake', 10, at('2026-10-20')).improved, true);
    assert.strictEqual(core.record(s, '2026-10-20', 'snake', 7, at('2026-10-20')).improved, false, 'placar menor não substitui');
    assert.strictEqual(core.record(s, '2026-10-20', 'snake', 25, at('2026-10-20')).improved, true);
    assert.deepStrictEqual(s.days['2026-10-20'], { slug: 'snake', best: 25, live: true }, 'jogado no próprio dia: live');

    // a sequência só conta dias jogados no próprio dia (repetir um desafio antigo é treino)
    const st = core.emptyState();
    ['2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20'].forEach((d) => core.record(st, d, 'snake', 1, at(d)));
    assert.strictEqual(core.streak(st, '2026-10-20'), 4);
    assert.strictEqual(core.streak(st, '2026-10-21'), 4, 'ainda não jogou hoje: a sequência não quebra até o fim do dia');
    assert.strictEqual(core.streak(st, '2026-10-22'), 0, 'passou um dia inteiro sem jogar: recomeça');
    core.record(st, '2026-10-15', 'snake', 1, at('2026-10-15'));
    assert.strictEqual(core.streak(st, '2026-10-20'), 4, 'buraco em 10-16 separa as sequências');
    core.record(st, '2026-10-16', 'snake', 9, at('2026-10-20')); // treino: dia passado jogado hoje
    assert.strictEqual(st.days['2026-10-16'].live, false);
    assert.strictEqual(core.streak(st, '2026-10-20'), 4, 'treino de um dia passado NÃO fecha o buraco nem estende a sequência');
    assert.strictEqual(core.streak(core.emptyState(), '2026-10-20'), 0);

    const big = core.emptyState();
    for (let i = 0; i < 90; i++) core.record(big, core.addDays('2026-01-01', i), 'snake', 1, at('2026-04-01'));
    assert.strictEqual(Object.keys(big.days).length, 60, 'guarda só os últimos 60 dias');
    assert.ok(big.days[core.addDays('2026-01-01', 89)], 'os mais recentes ficam');

    // armazenamento corrompido, adulterado ou indisponível nunca quebra
    const mem = { v: null, getItem() { return this.v; }, setItem(k, v) { this.v = v; } };
    assert.deepStrictEqual(core.loadState(mem), core.emptyState());
    mem.v = '{lixo';
    assert.deepStrictEqual(core.loadState(mem), core.emptyState(), 'JSON corrompido');
    mem.v = JSON.stringify({ version: 2, days: {} });
    assert.deepStrictEqual(core.loadState(mem), core.emptyState(), 'versão desconhecida');
    mem.v = JSON.stringify({ version: 1, days: [1, 2] });
    assert.deepStrictEqual(core.loadState(mem), core.emptyState(), 'days como lista');
    assert.strictEqual(core.saveState(mem, st), true);
    assert.deepStrictEqual(core.loadState(mem).days, st.days, 'ida e volta preserva tudo');
    assert.strictEqual(core.saveState({ setItem() { throw new Error('quota'); } }, st), false, 'sem armazenamento: não lança');
    assert.deepStrictEqual(core.loadState(null), core.emptyState());
    assert.deepStrictEqual(core.loadState({ getItem() { throw new Error('bloqueado'); } }), core.emptyState());

    // sanitização: só entra o que o módulo grava
    const lixo = { version: 1, days: {
        '2026-10-20': { slug: 'snake', best: 'abc' },
        '2026-10-19': { slug: 'snake', best: 1e300 },
        '2026-10-18': { slug: 'snake', best: -5 },
        '2026-10-17': { slug: 'jogo-que-nao-existe', best: 3 },
        '2026-10-16': { slug: 'snake', best: 12.9, live: 'sim' },
        '2026-10-15': null,
        '__proto__': { slug: 'snake', best: 1 },
        'zz-lixo': { slug: 'snake', best: 1 },
        '2026-02-30': { slug: 'snake', best: 1 }
    } };
    mem.v = JSON.stringify(lixo);
    assert.deepStrictEqual(core.loadState(mem).days, { '2026-10-16': { slug: 'snake', best: 12, live: false } }, 'só o registro válido sobrevive, normalizado');
    // chaves lixo não podem apagar datas reais na poda
    const poluido = { version: 1, days: {} };
    for (let i = 0; i < 70; i++) poluido.days['zz' + i] = { slug: 'snake', best: 1 };
    poluido.days['2026-10-20'] = { slug: 'snake', best: 5, live: true };
    mem.v = JSON.stringify(poluido);
    const limpo = core.loadState(mem);
    core.record(limpo, '2026-10-21', 'snake', 9, at('2026-10-21'));
    assert.deepStrictEqual(Object.keys(limpo.days).sort(), ['2026-10-20', '2026-10-21'], 'lixo descartado, datas reais mantidas');
}

// ---- texto compartilhável
{
    const c = core.challengeFor('2026-10-20');
    const one = core.shareText(c, 42, 1);
    const many = core.shareText(c, 42, 5);
    assert.ok(one.includes('Desafio do Dia #9 (20/10)') && one.includes(c.game.name) && one.includes('42 pontos'));
    assert.ok(!one.includes('seguidos'), 'sem sequência para mostrar com 1 dia');
    assert.ok(many.includes('5 dias seguidos'));
    // antes do lançamento (edição <= 0) não pode sair "#-1" nem "#0"
    for (const d of ['2026-10-10', '2026-10-11']) {
        const header = core.shareText(core.challengeFor(d), 5, 1).split('\n')[0];
        assert.ok(!/#/.test(header), 'sem número de edição antes do lançamento: ' + header);
        assert.ok(header.includes(`(${core.formatDM(d)})`));
    }
    assert.ok(core.shareText(core.challengeFor('2026-10-12'), 5, 1).split('\n')[0].includes('#1 '), 'lançamento é a edição #1');
    const link = many.split('\n').pop();
    const u = new URL(link);
    assert.strictEqual(u.origin + u.pathname, 'https://playfulhub.com.br/desafio/');
    assert.strictEqual(u.searchParams.get('utm_source'), 'share');
    assert.strictEqual(u.searchParams.get('utm_campaign'), 'desafio-do-dia');
}

// ---- integridade: cada jogo do rodízio existe, tem o placar e carrega o overlay (uma vez só)
{
    const bySlug = new Map(catalog.games.map((g) => [g.slug, g]));
    for (const g of core.GAMES) {
        const html = read(`${g.slug}/index.html`);
        const sel = g.scoreSelector;
        assert.strictEqual(sel, '#score', `${g.slug}: o teste só entende seletor por id`);
        assert.ok(new RegExp(`id="${sel.slice(1)}"`).test(html), `${g.slug}: sem elemento ${sel} (o desafio lê a pontuação dele)`);
        assert.strictEqual(html.split('/assets/js/desafio.js').length - 1, 1, `${g.slug}: overlay carregado exatamente uma vez`);
        assert.strictEqual(html.split('/assets/js/desafio-core.js').length - 1, 1, `${g.slug}: core carregado exatamente uma vez`);
        assert.ok(html.indexOf('desafio-core.js') < html.indexOf('/assets/js/desafio.js'), `${g.slug}: o core vem antes do overlay`);
        assert.ok(fs.existsSync(path.join(ROOT, g.image.slice(1))), `${g.slug}: imagem de prévia inexistente`);
        assert.ok(fs.existsSync(path.join(ROOT, g.info.slice(1) + '.html')), `${g.slug}: página de informações inexistente`);
        assert.ok(bySlug.has(g.slug), `${g.slug}: fora do games.json`);
        assert.strictEqual(new URL(bySlug.get(g.slug).playUrl).pathname, g.play, `${g.slug}: rota de jogo diferente do games.json`);
        assert.strictEqual(bySlug.get(g.slug).name, g.name, `${g.slug}: nome diferente do games.json`);
    }
    // o overlay não vaza para jogos fora do rodízio
    for (const dir of fs.readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory() && fs.existsSync(path.join(ROOT, d.name, 'index.html')))) {
        if (core.GAMES.some((g) => g.slug === dir.name)) continue;
        if (['node_modules', 'desafio', 'tests', 'reports', 'scratch'].includes(dir.name)) continue;
        assert.ok(!read(`${dir.name}/index.html`).includes('desafio.js'), `${dir.name}: não está no rodízio e não deveria carregar o overlay`);
    }
}

// ---- página /desafio/
{
    const html = read('desafio/index.html');
    assert.ok(html.includes('<link rel="canonical" href="https://playfulhub.com.br/desafio/">'));
    const img = (html.match(/<meta property="og:image" content="([^"]+)"/) || [])[1];
    assert.ok(img && img.startsWith('https://playfulhub.com.br/') && fs.existsSync(path.join(ROOT, new URL(img).pathname.slice(1))), 'og:image absoluto e existente');
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert.strictEqual(ld.length, 1);
    assert.ok(JSON.parse(ld[0][1])['@graph'].length >= 2);
    assert.ok(html.includes('/assets/js/desafio-core.js'));
    // regra do projeto: nada de iframe de jogo (só o noscript do GTM é permitido)
    for (const m of html.matchAll(/<iframe[^>]*>/g)) assert.ok(/googletagmanager\.com/.test(m[0]), 'iframe que não é do GTM: ' + m[0]);
    for (const g of core.GAMES) assert.ok(html.includes(`href="${g.info}"`), `rodízio da página sem link para ${g.info}`);
}

// ---- home: banner e core carregado antes do uso
{
    const html = read('index.html');
    assert.ok(html.includes('id="desafio-banner"') && html.includes('href="./desafio/"'));
    assert.ok(html.indexOf('assets/js/desafio-core.js') > 0 && html.indexOf('assets/js/desafio-core.js') < html.indexOf('window.PHDesafio.challengeFor'), 'core antes do uso');
}

console.log(`Desafio do Dia: regras, integridade (${core.GAMES.length} jogos), página e home ok`);
