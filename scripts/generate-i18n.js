#!/usr/bin/env node
/**
 * Gera as versões em inglês e espanhol das páginas de informações dos jogos e a página-índice de cada idioma:
 *
 *   en/index.html, en/games/<jogo>.html     es/index.html, es/juegos/<jogo>.html
 *
 * Fontes: o conteúdo em português vem da PRÓPRIA página `jogos/<jogo>.html` (i18n/extract.js: o gamesData do
 * generate-game-pages.js ficou desatualizado) e as traduções de `i18n/en.json` e `i18n/es.json`. A estrutura
 * vem do `templates/game-page-template.html` em português: o gerador troca as strings de interface por um mapa e
 * FALHA se alguma não casar exatamente uma vez, então uma mudança no template não passa despercebida. O CSS e o JS
 * continuam numa fonte só.
 *
 * Regras que o gerador impõe (e o tests/i18n.test.js confere): toda tradução tem a mesma estrutura da página em
 * português (mesmo número de controles, dicas e tags), nenhum texto vazio, nada de placeholder sobrando, e cada
 * página tem canonical próprio, hreflang recíproco (pt-BR, en, es, x-default) e og:locale do idioma.
 *
 * Uso:
 *   node scripts/generate-i18n.js          grava os arquivos
 *   node scripts/generate-i18n.js --check  falha (exit 1) se algo estiver desatualizado (roda na CI)
 */
const fs = require('fs');
const path = require('path');
const cfg = require('../i18n/config');
const { extractPage } = require('../i18n/extract');
const seo = require('./generate-seo');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// slots de anúncio: os mesmos do generate-game-pages.js (o AdSense continua igual nas versões traduzidas)
const AD_SLOT_1 = '1892478235';
const AD_SLOT_2 = '1892478236';

function loadTranslations(lang) {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n', `${lang}.json`), 'utf8'));
}

/** Confere a tradução contra a página em português. Devolve a lista de problemas (vazia = ok). */
function validateTranslation(lang, tr, pages) {
    const p = [];
    const need = (cond, msg) => { if (!cond) p.push(`${lang}: ${msg}`); return Boolean(cond); };
    const filled = (v) => typeof v === 'string' && v.trim().length > 0 && !/\{\{|\}\}|\bundefined\b|\bTODO\b|\bFIXME\b/.test(v);
    for (const k of ['htmlLang', 'titleSuffix', 'ogTitleSuffix', 'home', 'games', 'howToPlay', 'goal', 'tips', 'about', 'genre', 'developer', 'features', 'related', 'footer', 'noteToggle']) {
        need(filled(tr.ui && tr.ui[k]), `ui.${k} vazio`);
    }
    for (const k of ['title', 'description', 'keywords', 'h1', 'lead', 'gamesHeading', 'cta', 'more', 'moreLink', 'footer', 'langLabel']) {
        need(filled(tr.hub && tr.hub[k]), `hub.${k} vazio`);
    }
    for (const slug of cfg.slugs) {
        const t = tr.games && tr.games[slug];
        const src = pages[slug];
        if (!need(Boolean(t), `sem tradução para ${slug}`)) continue;
        for (const k of ['title', 'description', 'keywords', 'genre', 'features', 'objective']) need(filled(t[k]), `${slug}.${k} vazio`);
        need(Array.isArray(t.controls) && t.controls.length === src.controls.length, `${slug}: ${src.controls.length} controles no original, ${(t.controls || []).length} na tradução`);
        (t.controls || []).forEach((c, i) => need(Array.isArray(c) && c.length === 2 && filled(c[0]) && filled(c[1]), `${slug}.controls[${i}] inválido`));
        need(Array.isArray(t.tips) && t.tips.length === src.tips.length, `${slug}: ${src.tips.length} dicas no original, ${(t.tips || []).length} na tradução`);
        (t.tips || []).forEach((x, i) => need(filled(x), `${slug}.tips[${i}] vazio`));
        // nota de idioma ESPECÍFICA do jogo (o que está em português), só nos jogos "partial"
        if (cfg.game(slug).ui === 'partial') need(filled(t.uiNote) && t.uiNote.length >= 40, `${slug}: falta uiNote específica (o que está em português dentro do jogo)`);
        else need(t.uiNote === undefined, `${slug}: uiNote só vale para jogos "partial"`);
        need(Array.isArray(t.tags) && t.tags.length === src.tags.length, `${slug}: ${src.tags.length} tags no original, ${(t.tags || []).length} na tradução`);
        (t.tags || []).forEach((x, i) => need(filled(x), `${slug}.tags[${i}] vazio`));
    }
    Object.keys(tr.games || {}).filter((s) => !cfg.has(s)).forEach((s) => p.push(`${lang}: tradução de "${s}", que não está em i18n/config.js`));
    return p;
}

function replaceOnce(html, from, to) {
    const n = html.split(from).length - 1;
    if (n !== 1) throw new Error(`templates/game-page-template.html mudou: "${from.slice(0, 70)}" aparece ${n}x (esperava 1). Atualize scripts/generate-i18n.js.`);
    return html.replace(from, () => to);
}

/** remove contêineres de anúncio, o carregamento do AdSense e os preconnects; falha se o template mudar */
function stripAds(html) {
    const strip = (re, expected, what) => {
        const n = (html.match(re) || []).length;
        if (n !== expected) throw new Error(`templates/game-page-template.html mudou: ${what} aparece ${n}x (esperava ${expected}). Atualize stripAds em scripts/generate-i18n.js.`);
        html = html.replace(re, '');
    };
    strip(/\n[ \t]*<!-- Ad Space \d -->\n[ \t]*<div class="ad-container">[\s\S]*?<\/ins>\s*<\/div>/g, 2, 'contêiner de anúncio');
    strip(/\n[ \t]*\/\/ Google AdSense\n[\s\S]*?\(adsbygoogle = window\.adsbygoogle \|\| \[\]\)\.push\(\{\}\);\n[ \t]*\};/g, 1, 'carregamento do AdSense');
    strip(/\n[ \t]*<link rel="(?:preconnect|dns-prefetch)" href="https:\/\/pagead2\.googlesyndication\.com">/g, 2, 'preconnect do AdSense');
    return html;
}

const controlsHtml = (controls) => controls.map(([key, action]) => `
        <div class="control-item">
            <span class="control-key">${esc(key)}</span>
            <span>${esc(action)}</span>
        </div>
    `).join('');
const tipsHtml = (tips) => tips.map((tip, i) => `
        <div class="tip-item">
            <span class="tip-number">${i + 1}</span>
            <span>${esc(tip)}</span>
        </div>
    `).join('');
const tagsHtml = (tags) => tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('');

function relatedHtml(lang, slug, tr) {
    return cfg.game(slug).related.map((rs) => {
        const g = tr.games[rs];
        return `
            <a href="${cfg.gamePath(lang, rs)}" class="related-game">
                <div class="related-game-icon" style="background: linear-gradient(45deg, #e94560, #ff6b6b);">
                    ${cfg.game(rs).emoji}
                </div>
                <div>
                    <div style="font-weight: bold;">${esc(g.title)}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${esc(g.genre)}</div>
                </div>
            </a>
        `;
    }).join('');
}

function languageLinks(lang, slug) {
    const items = [{ label: 'Português', hreflang: 'pt-BR', href: `/jogos/${slug}` },
        ...cfg.langs.map((l) => ({ label: cfg.LANGS[l].label, hreflang: cfg.LANGS[l].hreflang, href: cfg.gamePath(l, slug) }))];
    return items.map((i) => (i.hreflang === (lang === 'en' ? 'en' : 'es')
        ? `<strong>${i.label}</strong>`
        : `<a href="${i.href}" hreflang="${i.hreflang}" lang="${i.hreflang === 'pt-BR' ? 'pt' : i.hreflang}">${i.label}</a>`)).join(' · ');
}

function renderGame(lang, slug, tr, page) {
    const L = cfg.LANGS[lang];
    const ui = tr.ui;
    const t = tr.games[slug];
    const g = cfg.game(slug);
    const url = cfg.gameUrl(lang, slug);
    const imageUrl = `${cfg.SITE}/assets/images/${page.image}`;

    let html = read('templates/game-page-template.html');
    const R = (from, to) => { html = replaceOnce(html, from, to); };

    // --- cabeçalho e interface (cada string em português do template, trocada pela do idioma)
    R('<html lang="pt-BR">', `<html lang="${ui.htmlLang}">`);
    R('<meta property="og:title" content="{{GAME_TITLE}} - Jogue Grátis no PlayfulHub">', `<meta property="og:title" content="{{GAME_TITLE}} - ${esc(ui.ogTitleSuffix)}">`);
    R('<title>{{GAME_TITLE}} - Jogue Grátis Online no PlayfulHub</title>', `<title>{{GAME_TITLE}} - ${esc(ui.titleSuffix)}</title>`);
    R('<a href="/" class="logo">🎮 PlayfulHub</a>', `<a href="${cfg.hubPath(lang)}" class="logo">🎮 PlayfulHub</a>`);
    R('<a href="/">Início</a>', `<a href="${cfg.hubPath(lang)}">${esc(ui.home)}</a>`);
    R('<a href="/jogos">Jogos</a>', `<a href="${cfg.hubPath(lang)}">${esc(ui.games)}</a>`);
    R('<i class="fas fa-gamepad"></i> Como Jogar</h3>', `<i class="fas fa-gamepad"></i> ${esc(ui.howToPlay)}</h3>`);
    R('<p><strong>Objetivo:</strong> {{GAME_OBJECTIVE}}</p>', `<p><strong>${esc(ui.goal)}:</strong> {{GAME_OBJECTIVE}}</p>`);
    R('<i class="fas fa-lightbulb"></i> Dicas e Estratégias</h3>', `<i class="fas fa-lightbulb"></i> ${esc(ui.tips)}</h3>`);
    R('<i class="fas fa-info-circle"></i> Sobre o Jogo</h3>', `<i class="fas fa-info-circle"></i> ${esc(ui.about)}</h3>`);
    R('<span class="info-label">Gênero</span>', `<span class="info-label">${esc(ui.genre)}</span>`);
    R('<span class="info-label">Desenvolvedor</span>', `<span class="info-label">${esc(ui.developer)}</span>`);
    R('<span class="info-label">Características</span>', `<span class="info-label">${esc(ui.features)}</span>`);
    R('<h3>Jogos Relacionados</h3>', `<h3>${esc(ui.related)}</h3>`);
    R('<p>&copy; 2024 PlayfulHub - Desenvolvido com ☕ por William Mangoni</p>',
        `<p>${ui.footer}</p>\n            <p style="margin-top:8px;font-size:.85rem;">${languageLinks(lang, slug)}</p>`);

    // ressalva honesta sobre o idioma de DENTRO do jogo
    const note = g.ui === 'partial' ? t.uiNote : g.ui === 'toggle' ? ui.noteToggle : null;
    if (note) {
        R('<p class="game-description">{{GAME_DESCRIPTION}}</p>',
            `<p class="game-description">{{GAME_DESCRIPTION}}</p>\n                    <p class="ui-note" style="margin-top:12px;font-size:.9rem;color:var(--text-muted);"><i class="fas fa-language"></i> ${esc(note)}</p>`);
    }

    // o título vai também numa string JS (evento do GA4): precisa ser literal JS seguro (aspas, apóstrofos)
    R("'game_name': '{{GAME_TITLE}}',", `'game_name': ${JSON.stringify(page.title).replace(/</g, '\\u003c')},\n                        'language': '${lang}',`);

    // --- anúncios: fora das páginas traduzidas enquanto o texto não passar por revisão humana (config.ADS_ON_TRANSLATED_PAGES)
    if (!cfg.ADS_ON_TRANSLATED_PAGES) html = stripAds(html);

    // --- conteúdo
    const vars = {
        '{{GAME_TITLE}}': esc(t.title),
        '{{GAME_DESCRIPTION}}': esc(t.description),
        '{{GAME_KEYWORDS}}': esc(t.keywords),
        '{{GAME_GENRE}}': esc(t.genre),
        '{{GAME_DEVELOPER}}': esc(page.developer || 'PlayfulHub'),
        '{{GAME_FEATURES}}': esc(t.features),
        '{{GAME_OBJECTIVE}}': esc(t.objective),
        '{{GAME_PLAY_URL}}': page.play,
        '{{CONTROLS_HTML}}': controlsHtml(t.controls),
        '{{TIPS_HTML}}': tipsHtml(t.tips),
        '{{TAGS_HTML}}': tagsHtml(t.tags),
        '{{RELATED_GAMES_HTML}}': relatedHtml(lang, slug, tr),
        '{{AD_SLOT_1}}': AD_SLOT_1,
        '{{AD_SLOT_2}}': AD_SLOT_2,
        '{{GAME_IMAGE}}': imageUrl,
        // caminho absoluto: a página mora em /en/games/, então "../assets" quebraria
        '{{GAME_PREVIEW_IMAGE}}': `/assets/images/${page.image}`,
        '{{GAME_URL}}': url
    };
    for (const [k, v] of Object.entries(vars)) html = html.split(k).join(v);
    if (/\{\{[A-Z_0-9]+\}\}/.test(html)) throw new Error(`${url}: placeholder sem preencher: ${html.match(/\{\{[A-Z_0-9]+\}\}/)[0]}`);

    const jsonLd = seo.gameJsonLd({
        kind: ['gameoflife'].includes(slug) ? 'app' : 'game',
        slug, name: t.title, description: t.description, url, image: imageUrl, genre: t.genre,
        playUrl: cfg.SITE + page.play, inLanguage: L.code, noOffers: true,
        breadcrumb: [
            { '@type': 'ListItem', position: 1, name: seo.SITE_NAME, item: cfg.hubUrl(lang) },
            { '@type': 'ListItem', position: 2, name: t.title, item: url }
        ]
    });
    return seo.injectSeo(html, { url, title: `${t.title} - ${ui.ogTitleSuffix}`, description: t.description, image: imageUrl, jsonLd, alternates: cfg.gameAlternates(slug), locale: L.locale });
}

const HUB_CSS = `
        :root { --bg: #08090d; --panel: #14162a; --panel-2: #1b1e38; --line: rgba(255,255,255,.1); --text: #f2f3f8; --muted: #aab0c8; --accent: #ff9a3c; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: radial-gradient(1200px 600px at 50% -10%, #241a4a 0%, var(--bg) 60%); color: var(--text); font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; line-height: 1.55; min-height: 100vh; }
        a { color: inherit; }
        .wrap { max-width: 1100px; margin: 0 auto; padding: 0 16px 56px; }
        .top { display: flex; justify-content: space-between; align-items: center; padding: 18px 0; gap: 12px; flex-wrap: wrap; }
        .brand { text-decoration: none; font-weight: 800; font-size: 1.15rem; }
        .langs a, .langs strong { margin-left: 12px; font-size: .95rem; }
        .langs a { color: var(--muted); text-decoration: none; } .langs a:hover { color: var(--text); }
        h1 { font-size: clamp(1.9rem, 5vw, 2.8rem); line-height: 1.1; letter-spacing: -0.02em; margin-top: 8px; }
        .lead { color: var(--muted); margin-top: 12px; max-width: 70ch; }
        h2 { margin: 36px 0 14px; font-size: 1.3rem; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; list-style: none; }
        .card { display: flex; flex-direction: column; height: 100%; background: var(--panel); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; text-decoration: none; transition: transform .15s, background .15s; }
        .card:hover { transform: translateY(-2px); background: var(--panel-2); }
        .card img { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; display: block; background: #000; }
        .card .body { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .card .genre { color: var(--accent); font-size: .8rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
        .card h3 { font-size: 1.15rem; }
        .card p { color: var(--muted); font-size: .92rem; }
        .card .cta { margin-top: auto; padding-top: 8px; color: var(--accent); font-weight: 700; font-size: .92rem; }
        .more { color: var(--muted); margin-top: 28px; max-width: 75ch; }
        .more a { color: var(--accent); }
        .foot { margin-top: 40px; color: var(--muted); font-size: .85rem; }`;

function renderHub(lang, tr, pages) {
    const L = cfg.LANGS[lang];
    const h = tr.hub;
    const url = cfg.hubUrl(lang);
    const cards = cfg.GAMES.map((g) => {
        const t = tr.games[g.slug];
        return `            <li><a class="card" href="${cfg.gamePath(lang, g.slug)}">
                <img src="/assets/images/${pages[g.slug].image}" alt="${esc(t.title)}" loading="lazy" width="950" height="598">
                <span class="body"><span class="genre">${esc(t.genre)}</span><h3>${esc(t.title)}</h3><p>${esc(t.description)}</p><span class="cta">${esc(h.cta)} →</span></span>
            </a></li>`;
    }).join('\n');
    const switcher = [`<a href="/" hreflang="pt-BR" lang="pt">Português</a>`,
        ...cfg.langs.map((l) => (l === lang ? `<strong>${cfg.LANGS[l].label}</strong>` : `<a href="${cfg.hubPath(l)}" hreflang="${cfg.LANGS[l].hreflang}" lang="${l}">${cfg.LANGS[l].label}</a>`))].join('');
    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            { '@type': 'CollectionPage', '@id': `${url}#page`, url, name: h.h1, description: h.description, inLanguage: L.code },
            { '@type': 'ItemList', name: h.gamesHeading, numberOfItems: cfg.GAMES.length, itemListElement: cfg.GAMES.map((g, i) => ({ '@type': 'ListItem', position: i + 1, name: tr.games[g.slug].title, url: cfg.gameUrl(lang, g.slug) })) },
            { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: seo.SITE_NAME, item: cfg.SITE + '/' }, { '@type': 'ListItem', position: 2, name: h.gamesHeading, item: url }] }
        ]
    };
    const html = `<!DOCTYPE html>
<html lang="${L.code}">
<head>
    <!-- Google Tag Manager -->
    <script>
        (function (w, d, s, l, i) {
            w[l] = w[l] || []; w[l].push({
                'gtm.start': new Date().getTime(), event: 'gtm.js'
            }); var f = d.getElementsByTagName(s)[0],
                j = d.createElement(s), dl = l != 'dataLayer' ? '&l=' + l : ''; j.async = true; j.src =
                    'https://www.googletagmanager.com/gtm.js?id=' + i + dl; f.parentNode.insertBefore(j, f);
        })(window, document, 'script', 'dataLayer', 'GTM-KM6SHZXP');
    </script>
    <!-- End Google Tag Manager -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(h.title)}</title>
    <meta name="description" content="${esc(h.description)}">
    <meta name="keywords" content="${esc(h.keywords)}">
    <meta name="theme-color" content="#08090d">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <meta property="og:title" content="${esc(h.title)}">
    <meta property="og:description" content="${esc(h.description)}">
    <meta property="og:image" content="${cfg.SITE}/assets/images/bg_neon_game.jpeg">
    <meta property="og:type" content="website">
    <style>${HUB_CSS}
    </style>
</head>
<body>
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-KM6SHZXP" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <div class="wrap">
        <div class="top">
            <a class="brand" href="${cfg.hubPath(lang)}">🎮 PlayfulHub</a>
            <nav class="langs" aria-label="${esc(h.langLabel)}">${switcher}</nav>
        </div>
        <main>
            <h1>${esc(h.h1)}</h1>
            <p class="lead">${esc(h.lead)}</p>
            <h2>${esc(h.gamesHeading)}</h2>
            <ul class="grid">
${cards}
            </ul>
            <p class="more">${esc(h.more)} <a href="/" hreflang="pt-BR" lang="pt">${esc(h.moreLink)}</a>.</p>
        </main>
        <p class="foot">${h.footer}</p>
    </div>
</body>
</html>
`;
    return seo.injectSeo(html, { url, title: h.title, description: h.description, image: `${cfg.SITE}/assets/images/bg_neon_game.jpeg`, jsonLd, alternates: cfg.homeAlternates(), locale: L.locale });
}

function loadPages() {
    return Object.fromEntries(cfg.slugs.map((s) => [s, extractPage(s)]));
}

function computeOutputs() {
    const pages = loadPages();
    const files = {};
    const problems = [];
    for (const lang of cfg.langs) {
        const tr = loadTranslations(lang);
        problems.push(...validateTranslation(lang, tr, pages));
        if (problems.length) continue;
        files[cfg.hubFile(lang)] = renderHub(lang, tr, pages);
        for (const slug of cfg.slugs) files[cfg.gameFile(lang, slug)] = renderGame(lang, slug, tr, pages[slug]);
    }
    if (problems.length) {
        const err = new Error(`Traduções reprovadas:\n  - ${problems.join('\n  - ')}`);
        err.problems = problems;
        throw err;
    }
    return files;
}

function run({ check = false } = {}) {
    const outputs = computeOutputs();
    const stale = [];
    for (const [rel, content] of Object.entries(outputs)) {
        const file = path.join(ROOT, rel);
        const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
        if (current !== null && current.replace(/\r\n/g, '\n') === content) continue;
        stale.push(rel);
        if (!check) {
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, current && current.includes('\r\n') ? content.replace(/\n/g, '\r\n') : content, 'utf8');
        }
    }
    return { total: Object.keys(outputs).length, changed: stale };
}

if (require.main === module) {
    const check = process.argv.includes('--check');
    try {
        const { total, changed } = run({ check });
        if (check && changed.length) {
            console.error(`i18n desatualizado em ${changed.length} arquivo(s):\n  ${changed.join('\n  ')}\nRode: npm run i18n`);
            process.exit(1);
        }
        console.log(check ? `i18n em dia (${total} arquivos).` : `i18n gerado: ${changed.length} de ${total} arquivos atualizados.`);
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}

module.exports = { run, computeOutputs, validateTranslation, loadTranslations, loadPages };
