// Versões em inglês e espanhol: configuração, traduções (estrutura e idioma), páginas geradas (SEO, hreflang
// recíproco, ressalva de idioma, links), sitemap/llms/games.json, servidor e regressões nas páginas em português.
process.env.NODE_ENV = 'test';
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const cfg = require('../i18n/config');
const { extractPage } = require('../i18n/extract');
const gen = require('../scripts/generate-i18n');
const seoGen = require('../scripts/generate-seo');

const SITE = cfg.SITE;
const catalog = JSON.parse(read('games.json'));
const pages = gen.loadPages();
const T = Object.fromEntries(cfg.langs.map((l) => [l, gen.loadTranslations(l)]));
const abs = (url) => url.startsWith(SITE) ? url.slice(SITE.length) : url;

(async () => {
    // ---- configuração
    {
        assert.deepStrictEqual(cfg.langs, ['en', 'es']);
        assert.strictEqual(new Set(cfg.slugs).size, cfg.slugs.length, 'slugs únicos');
        const bySlug = new Map(catalog.games.map((g) => [g.slug, g]));
        for (const g of cfg.GAMES) {
            assert.ok(exists(`jogos/${g.slug}.html`), `${g.slug}: página em português inexistente`);
            assert.ok(bySlug.has(g.slug), `${g.slug}: fora do games.json`);
            assert.ok(['full', 'partial', 'toggle'].includes(g.ui), `${g.slug}: ui inválida`);
            assert.ok(g.emoji, `${g.slug}: sem emoji`);
            assert.ok(g.related.length === 3 && g.related.every((r) => cfg.has(r) && r !== g.slug), `${g.slug}: related precisa ser outros jogos traduzidos`);
            assert.ok(pages[g.slug].play && pages[g.slug].image && exists(`assets/images/${pages[g.slug].image}`), `${g.slug}: sem PLAY/imagem na página original`);
        }
        assert.strictEqual(cfg.routes().length, cfg.langs.length * (cfg.slugs.length + 2));
        assert.strictEqual(cfg.gameUrl('en', 'snake'), `${SITE}/en/games/snake`);
        assert.strictEqual(cfg.gameUrl('es', 'snake'), `${SITE}/es/juegos/snake`);
        assert.deepStrictEqual(cfg.gameAlternates('snake').map((a) => a.hreflang), ['pt-BR', 'en', 'es', 'x-default']);
        assert.strictEqual(cfg.gameAlternates('snake').pop().href, `${SITE}/jogos/snake`, 'x-default é a versão em português');
        console.log('✓ configuração');
    }

    // ---- o extrator lê a página real (e não o gamesData desatualizado)
    {
        const p = extractPage('puzzle');
        assert.ok(/Santuário Astral/.test(p.description), 'puzzle: conteúdo real do Mind Labyrinth, não o do gamesData antigo');
        assert.strictEqual(p.controls.length, 3);
        assert.strictEqual(extractPage('snake').tips.length, 4);
        console.log('✓ extrator');
    }

    // ---- validação das traduções (positivo e negativo)
    {
        for (const l of cfg.langs) assert.deepStrictEqual(gen.validateTranslation(l, T[l], pages), [], `${l}: traduções reprovadas`);
        const clone = () => JSON.parse(JSON.stringify(T.en));
        const bad = (mut) => { const c = clone(); mut(c); return gen.validateTranslation('en', c, pages); };
        assert.ok(bad((c) => c.games.snake.controls.pop()).some((m) => m.includes('controles')), 'controle faltando');
        assert.ok(bad((c) => c.games.snake.tips.push('extra')).some((m) => m.includes('dicas')), 'dica a mais');
        assert.ok(bad((c) => c.games.snake.tags.pop()).some((m) => m.includes('tags')), 'tag faltando');
        assert.ok(bad((c) => { c.games.snake.description = '  '; }).length, 'descrição vazia');
        assert.ok(bad((c) => { c.games.snake.title = 'TODO'; }).length, 'marcador TODO');
        assert.ok(bad((c) => { c.games.snake.objective = 'Value is {{GAME_TITLE}}'; }).length, 'placeholder sobrando');
        assert.ok(bad((c) => { delete c.games.pinball; }).some((m) => m.includes('pinball')), 'jogo sem tradução');
        assert.ok(bad((c) => { c.games.chess = c.games.snake; }).some((m) => m.includes('chess')), 'tradução de jogo fora da config');
        assert.ok(bad((c) => { delete c.ui.home; }).length, 'ui faltando');
        assert.deepStrictEqual(bad((c) => { c.games.snake.tips[0] = 'Es todo lo que necesitas, TODOS los días'; }), [], '"todo/todos" em espanhol não é marcador (regressão)');
        console.log('✓ validação das traduções');
    }

    // ---- idioma: nada de português nas traduções, e nada deixado sem traduzir
    {
        const PT_ONLY = /\b(você|vocês|não|jogo|jogos|jogar|pontuação|também|então|aqui|ação)\b/i;
        const texts = (l) => {
            const out = [];
            const walk = (v, p) => { if (typeof v === 'string') out.push([p, v]); else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`)); else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, `${p}.${k}`)); };
            walk(T[l], l);
            return out;
        };
        for (const l of cfg.langs) {
            for (const [where, text] of texts(l)) {
                if (/\.(htmlLang)$/.test(where)) continue;
                assert.ok(!PT_ONLY.test(text), `${where}: palavra em português: "${text.slice(0, 80)}"`);
                assert.ok(!/[ãõç]/i.test(text), `${where}: caractere de português (ã/õ/ç): "${text.slice(0, 80)}"`);
            }
        }
        for (const [where, text] of texts('en')) assert.ok(!/[ñ¿¡]/.test(text), `${where}: caractere de espanhol no inglês`);
        for (const slug of cfg.slugs) {
            for (const l of cfg.langs) {
                const t = T[l].games[slug];
                assert.notStrictEqual(t.description, pages[slug].description, `${l}/${slug}: descrição igual à do português (não traduzida)`);
                assert.notStrictEqual(t.objective, pages[slug].objective, `${l}/${slug}: objetivo não traduzido`);
                t.tips.forEach((tip, i) => assert.notStrictEqual(tip, pages[slug].tips[i], `${l}/${slug}: dica ${i + 1} não traduzida`));
            }
        }
        // en e es são diferentes entre si (não copiaram o mesmo texto)
        for (const slug of cfg.slugs) assert.notStrictEqual(T.en.games[slug].description, T.es.games[slug].description);
        console.log('✓ idioma das traduções');
    }

    // ---- páginas geradas
    const PT_TEMPLATE_STRINGS = ['Como Jogar', 'Dicas e Estratégias', 'Sobre o Jogo', 'Jogos Relacionados', 'Desenvolvedor', 'Características', 'Gênero', 'Objetivo:', 'Jogue Grátis', 'Desenvolvido com'];
    // palavras da interface em português que também existem em espanhol (iguais): não servem para detectar sobra
    const SAME_IN_ES = ['Características', 'Objetivo:'];
    const leftovers = (lang) => PT_TEMPLATE_STRINGS.filter((x) => !(lang === 'es' && SAME_IN_ES.includes(x)));
    const links = (html) => [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map((m) => [m[1], m[2]]);
    const jsonLd = (html) => { const m = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]; assert.strictEqual(m.length, 1, 'um único JSON-LD'); return JSON.parse(m[0][1]); };
    for (const lang of cfg.langs) {
        const L = cfg.LANGS[lang];
        for (const slug of cfg.slugs) {
            const rel = cfg.gameFile(lang, slug);
            const where = `${lang}/${slug}`;
            assert.ok(exists(rel), `${where}: página não gerada (npm run i18n)`);
            const html = read(rel);
            const url = cfg.gameUrl(lang, slug);
            const t = T[lang].games[slug];
            assert.ok(html.includes(`<html lang="${lang}">`), `${where}: <html lang>`);
            assert.strictEqual(html.split('<!-- seo:begin').length - 1, 1, `${where}: um único bloco de SEO`);
            assert.deepStrictEqual([...html.matchAll(/<link rel="canonical" href="([^"]+)">/g)].map((m) => m[1]), [url], `${where}: canonical`);
            assert.ok(html.includes(`<meta property="og:url" content="${url}">`), `${where}: og:url`);
            assert.ok(html.includes(`<meta property="og:locale" content="${L.locale}">`), `${where}: og:locale`);
            const img = (html.match(/<meta property="og:image" content="([^"]+)"/) || [])[1];
            assert.ok(img && img.startsWith(SITE + '/') && exists(abs(img).slice(1)), `${where}: og:image absoluto e existente`);
            assert.deepStrictEqual(links(html), cfg.gameAlternates(slug).map((a) => [a.hreflang, a.href]), `${where}: hreflang`);
            assert.ok(!/\{\{[A-Z_0-9]+\}\}/.test(html), `${where}: placeholder sobrando`);
            for (const s of leftovers(lang)) assert.ok(!html.includes(s), `${where}: sobrou texto de interface em português: "${s}"`);
            assert.ok(html.includes(`<title>${t.title.replace(/&/g, '&amp;')} - ${T[lang].ui.titleSuffix}</title>`), `${where}: <title>`);
            assert.ok(html.includes(`<h1 class="game-title">${t.title.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}</h1>`), `${where}: h1`);

            // JSON-LD
            const ld = jsonLd(html);
            const entity = ld['@graph'].find((x) => ['VideoGame', 'WebApplication'].includes(x['@type']));
            assert.strictEqual(entity.inLanguage, lang, `${where}: JSON-LD inLanguage`);
            assert.strictEqual(entity.name, t.title);
            assert.strictEqual(entity.url, url);
            assert.strictEqual(entity.offers.price, '0');
            assert.strictEqual(ld['@graph'].find((x) => x['@type'] === 'BreadcrumbList').itemListElement.length, 3);

            // regra do projeto: preview com PLAY levando ao jogo, nunca iframe
            const frame = html.match(/<a id="gameFrame"[^>]*href="([^"]+)">\s*<img src="([^"]+)"/);
            assert.ok(frame, `${where}: bloco do preview`);
            assert.strictEqual(frame[1], pages[slug].play, `${where}: PLAY leva à rota do jogo`);
            assert.ok(frame[2].startsWith('/assets/images/') && exists(frame[2].slice(1)), `${where}: imagem do preview absoluta e existente (a página mora em /${lang}/.../)`);
            assert.ok(html.includes('<div class="game-overlay"><span class="game-overlay-text">PLAY</span></div>'));
            for (const m of html.matchAll(/<iframe[^>]*>/g)) assert.ok(/googletagmanager\.com/.test(m[0]), `${where}: iframe que não é do GTM`);

            // conteúdo traduzido presente (controles, dicas, tags)
            t.controls.forEach(([k, a]) => assert.ok(html.includes(`>${k.replace(/&/g, '&amp;')}</span>`) && html.includes(a), `${where}: controle "${k}"`));
            t.tips.forEach((tip) => assert.ok(html.includes(tip.replace(/&/g, '&amp;').replace(/"/g, '&quot;')) || html.includes(tip), `${where}: dica`));
            assert.strictEqual((html.match(/<span class="tag">/g) || []).length, t.tags.length);

            // ressalva sobre o idioma de DENTRO do jogo
            const uiKind = cfg.game(slug).ui;
            const hasNote = html.includes('class="ui-note"');
            assert.strictEqual(hasNote, uiKind !== 'full', `${where}: ressalva de idioma (${uiKind})`);
            if (uiKind === 'partial') assert.ok(html.includes(T[lang].ui.notePartial));
            if (uiKind === 'toggle') assert.ok(html.includes(T[lang].ui.noteToggle));

            // relacionados: só páginas traduzidas do mesmo idioma
            const related = [...html.matchAll(/<a href="([^"]+)" class="related-game">/g)].map((m) => m[1]);
            assert.deepStrictEqual(related, cfg.game(slug).related.map((r) => cfg.gamePath(lang, r)), `${where}: relacionados`);
            assert.ok(!/href="\/jogos\//.test(html.replace(/hreflang="pt-BR"[^>]*href="[^"]*"|<a href="\/jogos\/[a-z0-9_]+" hreflang="pt-BR"[^>]*>[^<]*<\/a>/g, '')), `${where}: link para /jogos/ fora do seletor de idioma`);
            // GA4: o título numa string JS precisa ser literal válido (apóstrofo em "Conway's")
            const gaLiteral = (html.match(/'game_name': ("(?:[^"\\]|\\.)*"),/) || [])[1];
            assert.strictEqual(JSON.parse(gaLiteral), t.title, `${where}: título no evento do GA4`);
        }

        // hub
        const hubRel = cfg.hubFile(lang);
        assert.ok(exists(hubRel), `${lang}: hub não gerado`);
        const hub = read(hubRel);
        assert.ok(hub.includes(`<html lang="${lang}">`));
        assert.deepStrictEqual([...hub.matchAll(/<link rel="canonical" href="([^"]+)">/g)].map((m) => m[1]), [cfg.hubUrl(lang)]);
        assert.deepStrictEqual(links(hub), cfg.homeAlternates().map((a) => [a.hreflang, a.href]));
        for (const slug of cfg.slugs) assert.ok(hub.includes(`href="${cfg.gamePath(lang, slug)}"`), `${lang}: hub sem ${slug}`);
        const hubLd = jsonLd(hub);
        assert.strictEqual(hubLd['@graph'].find((x) => x['@type'] === 'ItemList').numberOfItems, cfg.slugs.length);
        for (const s of leftovers(lang)) assert.ok(!hub.includes(s));
        for (const m of hub.matchAll(/<iframe[^>]*>/g)) assert.ok(/googletagmanager\.com/.test(m[0]));
        for (const m of hub.matchAll(/<img src="([^"]+)"/g)) assert.ok(exists(m[1].slice(1)), `${lang}: imagem do hub inexistente ${m[1]}`);
    }
    console.log(`✓ páginas geradas (${cfg.langs.length * (cfg.slugs.length + 1)})`);

    // ---- reciprocidade: português ↔ inglês ↔ espanhol (o Google ignora alternates sem volta)
    {
        for (const slug of cfg.slugs) {
            const pt = read(`jogos/${slug}.html`);
            const want = JSON.stringify(cfg.gameAlternates(slug).map((a) => [a.hreflang, a.href]));
            assert.strictEqual(JSON.stringify(links(pt)), want, `${slug}: hreflang na página em português`);
            for (const l of cfg.langs) assert.strictEqual(JSON.stringify(links(read(cfg.gameFile(l, slug)))), want, `${slug}/${l}: grupo de hreflang diferente do da página em português`);
            // cada URL do grupo existe de verdade
            for (const a of cfg.gameAlternates(slug)) {
                const p = abs(a.href);
                const file = p.startsWith('/jogos/') ? `${p.slice(1)}.html` : `${p.slice(1)}.html`;
                assert.ok(exists(file), `${slug}: ${a.hreflang} aponta para ${a.href}, mas ${file} não existe`);
            }
        }
        const home = read('index.html');
        assert.deepStrictEqual(links(home), cfg.homeAlternates().map((a) => [a.hreflang, a.href]), 'home com hreflang');
        // regressão: jogo sem tradução NÃO ganha hreflang (apontaria para páginas inexistentes)
        for (const g of catalog.games.filter((x) => !cfg.has(x.slug))) {
            assert.deepStrictEqual(links(read(`jogos/${g.slug}.html`)), [], `${g.slug}: não está traduzido e não pode ter hreflang`);
        }
        console.log('✓ hreflang recíproco');
    }

    // ---- sitemap, llms.txt, games.json
    {
        const sm = read('sitemap.xml');
        assert.ok(sm.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'));
        const entries = [...sm.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
        const byLoc = new Map(entries.map((e) => [(e.match(/<loc>([^<]+)<\/loc>/) || [])[1], e]));
        const need = [...cfg.langs.map((l) => cfg.hubUrl(l)), ...cfg.langs.flatMap((l) => cfg.slugs.map((s) => cfg.gameUrl(l, s)))];
        for (const u of need) {
            assert.ok(byLoc.has(u), `sitemap sem ${u}`);
            assert.strictEqual((byLoc.get(u).match(/<xhtml:link /g) || []).length, 4, `${u}: 4 alternates (pt-BR, en, es, x-default)`);
        }
        for (const s of cfg.slugs) assert.strictEqual((byLoc.get(`${SITE}/jogos/${s}`).match(/<xhtml:link /g) || []).length, 4, `${s}: a página em português também lista os alternates`);
        assert.strictEqual(entries.length, new Set(entries.map((e) => e.match(/<loc>([^<]+)<\/loc>/)[1])).size, 'sem URLs duplicadas');
        const llms = read('llms.txt');
        for (const l of cfg.langs) assert.ok(llms.includes(cfg.hubUrl(l)), `llms.txt sem o hub ${l}`);
        const games = JSON.parse(read('games.json')).games;
        for (const g of games) {
            if (cfg.has(g.slug)) assert.deepStrictEqual(g.translations, { en: cfg.gameUrl('en', g.slug), es: cfg.gameUrl('es', g.slug) }, `${g.slug}: translations no games.json`);
            else assert.strictEqual(g.translations, undefined, `${g.slug}: não traduzido`);
        }
        console.log('✓ sitemap, llms.txt e games.json');
    }

    // ---- tudo em dia (o que a CI também confere)
    {
        assert.deepStrictEqual(gen.run({ check: true }).changed, [], 'npm run i18n (páginas desatualizadas)');
        assert.deepStrictEqual(seoGen.run({ check: true }).changed, [], 'npm run seo (SEO desatualizado)');
        console.log('✓ geradores em dia');
    }

    // ---- servidor
    {
        const app = require('../server');
        const server = http.createServer(app);
        await new Promise((r) => server.listen(3094, '127.0.0.1', r));
        const get = (p) => new Promise((resolve, reject) => http.get({ host: '127.0.0.1', port: 3094, path: p }, (res) => {
            let b = ''; res.on('data', (d) => (b += d)); res.on('end', () => resolve({ status: res.statusCode, body: b, type: res.headers['content-type'] || '' }));
        }).on('error', reject));
        try {
            for (const lang of cfg.langs) {
                const hub = await get(cfg.hubPath(lang));
                assert.strictEqual(hub.status, 200);
                assert.ok(hub.body.includes(`<html lang="${lang}">`));
                assert.strictEqual((await get(`/${lang}`)).status, 301, 'sem barra final: redireciona para o hub');
                for (const slug of cfg.slugs) {
                    const r = await get(cfg.gamePath(lang, slug));
                    assert.strictEqual(r.status, 200, `${cfg.gamePath(lang, slug)}: ${r.status}`);
                    assert.ok(/text\/html/.test(r.type) && r.body.includes(`<html lang="${lang}">`));
                    // o botão PLAY leva a uma rota que existe
                    assert.strictEqual((await get(pages[slug].play)).status, 200, `${slug}: rota do jogo ${pages[slug].play}`);
                }
            }
            for (const p of ['/en/games/chess', '/es/juegos/chess', '/en/juegos/snake', '/es/games/snake', '/en/games/..%2fserver', '/xx/games/snake', '/en/games/snake%00']) {
                const r = await get(p);
                assert.ok(r.status === 404 || r.status === 400, `${p}: deveria ser 404/400 (veio ${r.status})`);
                assert.ok(!r.body.includes('require('), `${p}: não pode vazar código`);
            }
        } finally {
            server.close();
        }
        console.log('✓ servidor');
    }

    console.log('\nI18n: todos os testes passaram');
    process.exit(0);
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
