#!/usr/bin/env node
/**
 * Gera os artefatos de SEO e de descoberta do PlayfulHub a partir das páginas
 * de informações em `jogos/*.html` (a fonte da verdade, inclusive as escritas à mão):
 *
 *   sitemap.xml  índice para buscadores
 *   llms.txt     resumo do site para mecanismos de resposta e agentes de IA (llmstxt.org)
 *   games.json   catálogo legível por máquina (consumido pelos agentes de divulgação)
 *
 * e injeta nas páginas (`jogos/*.html` e `index.html`) um bloco delimitado com
 * canonical, Twitter Cards e JSON-LD, além de tornar absoluto o `og:image`
 * (scrapers de redes sociais não resolvem caminho relativo).
 *
 * Uso:
 *   node scripts/generate-seo.js          grava os arquivos
 *   node scripts/generate-seo.js --check  falha (exit 1) se algo estiver desatualizado
 *
 * É idempotente e determinístico (sem datas), por isso o --check roda na CI.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://playfulhub.com.br';
const SITE_NAME = 'PlayfulHub';
const DEFAULT_IMAGE = '/assets/images/bg_neon_game.jpeg';
const LOGO = '/favicon_io/android-chrome-512x512.png';
const BLOCK_START = '<!-- seo:begin (gerado por scripts/generate-seo.js, não editar à mão) -->';
const BLOCK_END = '<!-- seo:end -->';

// Páginas do portal que não são jogos (têm head próprio, com canonical/OG/JSON-LD escritos à mão) mas precisam
// estar no sitemap e no llms.txt. O arquivo precisa existir: URL no sitemap sem página é link quebrado.
const EXTRA_PAGES = [
    {
        path: '/desafio/',
        file: 'desafio/index.html',
        name: 'Desafio do Dia',
        description: 'Todo dia um jogo diferente do portal vira o desafio: faça o maior placar, compartilhe o resultado e mantenha a sequência de dias.'
    }
];

// Ferramentas e simulações que não são "jogos" no sentido estrito: o JSON-LD
// descreve cada uma pelo que ela é (WebApplication), não como VideoGame.
const APP_CATEGORY = {
    planning_poker: 'BusinessApplication',
    ded_make_character: 'EntertainmentApplication',
    gameoflife: 'EducationalApplication',
    tabuleiro_galton: 'EducationalApplication',
    threejs_earth: 'EducationalApplication',
    rede_neural_evolutiva: 'EducationalApplication'
};

const decode = s => s
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const escAttr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const escXml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Tudo é processado em LF; o EOL original de cada arquivo é preservado só na hora de gravar
// (no Windows o git faz checkout em CRLF), e a comparação do --check ignora essa diferença.
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

function absolute(url) {
    if (/^https?:\/\//i.test(url)) return url;
    return SITE + '/' + url.replace(/^\.?\/+/, '');
}

function stripBlock(html) {
    const re = new RegExp(`[ \\t]*${BLOCK_START.replace(/[()]/g, '\\$&')}[\\s\\S]*?${BLOCK_END}\\r?\\n?`, 'g');
    return html.replace(re, '');
}

function metaContent(html, attr, key) {
    const re = new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]*)"`, 'i');
    const m = html.match(re);
    return m ? decode(m[1]) : null;
}

function readCatalogData() {
    const control = JSON.parse(read('games_control.json'));
    const names = {};
    control.forEach(g => { names[g.path.replace('/jogos/', '')] = g.name; });
    // gamesData só existe para as páginas geradas pelo template; as demais ficam sem gênero.
    const { gamesData } = require('./generate-game-pages');
    return { names, gamesData };
}

function buildCatalog() {
    const { names, gamesData } = readCatalogData();
    const slugs = fs.readdirSync(path.join(ROOT, 'jogos'))
        .filter(f => f.endsWith('.html')).map(f => f.replace(/\.html$/, '')).sort();

    return slugs.map(slug => {
        const html = stripBlock(read(`jogos/${slug}.html`));
        const title = decode((html.match(/<title>([^<]*)<\/title>/i) || [, slug])[1]).trim();
        const generated = gamesData[slug];
        // Link do preview: `#gameFrame` nas páginas do template, `.game-preview` no Planning Poker.
        const play = html.match(/<a\b[^>]*\b(?:id="gameFrame"|class="game-preview")[^>]*\bhref="([^"]+)"/i);
        const image = metaContent(html, 'property', 'og:image');
        return {
            slug,
            name: names[slug] || (generated && generated.title) || title.split(/\s[-|—]\s/)[0],
            url: `${SITE}/jogos/${slug}`,
            playUrl: play ? absolute(play[1]) : null,
            description: metaContent(html, 'name', 'description') || '',
            genre: generated ? generated.genre : null,
            tags: generated ? generated.tags : [],
            image: absolute(image || DEFAULT_IMAGE),
            pageTitle: title,
            kind: APP_CATEGORY[slug] ? 'app' : 'game'
        };
    });
}

function gameJsonLd(g) {
    const entity = {
        '@type': g.kind === 'game' ? 'VideoGame' : 'WebApplication',
        '@id': `${g.url}#app`,
        name: g.name,
        description: g.description,
        url: g.url,
        image: g.image,
        inLanguage: 'pt-BR',
        isAccessibleForFree: true,
        operatingSystem: 'Any',
        applicationCategory: g.kind === 'game' ? 'GameApplication' : APP_CATEGORY[g.slug],
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL', availability: 'https://schema.org/InStock' },
        publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE + '/' }
    };
    if (g.kind === 'game') entity.gamePlatform = 'Web browser';
    if (g.genre) entity.genre = g.genre;
    if (g.playUrl) entity.potentialAction = { '@type': 'PlayAction', target: g.playUrl };

    return {
        '@context': 'https://schema.org',
        '@graph': [
            entity,
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE + '/' },
                    { '@type': 'ListItem', position: 2, name: g.name, item: g.url }
                ]
            }
        ]
    };
}

function homeJsonLd(catalog) {
    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebSite', '@id': `${SITE}/#website`, name: SITE_NAME, url: SITE + '/',
                inLanguage: 'pt-BR', publisher: { '@id': `${SITE}/#org` }
            },
            { '@type': 'Organization', '@id': `${SITE}/#org`, name: SITE_NAME, url: SITE + '/', logo: SITE + LOGO },
            {
                '@type': 'ItemList', name: 'Jogos e experimentos do PlayfulHub',
                numberOfItems: catalog.length,
                itemListElement: catalog.map((g, i) => ({
                    '@type': 'ListItem', position: i + 1, name: g.name, url: g.url
                }))
            }
        ]
    };
}

// Monta o bloco, pulando o que a página já declara por conta própria.
function buildBlock(html, { url, title, description, image, jsonLd }) {
    const has = (attr, key) => new RegExp(`<meta\\s+${attr}="${key}"`, 'i').test(html);
    const lines = [];
    if (!/<link\s+rel="canonical"/i.test(html)) lines.push(`<link rel="canonical" href="${url}">`);
    if (!has('property', 'og:url')) lines.push(`<meta property="og:url" content="${url}">`);
    if (!has('property', 'og:image')) lines.push(`<meta property="og:image" content="${image}">`);
    if (!has('property', 'og:site_name')) lines.push(`<meta property="og:site_name" content="${SITE_NAME}">`);
    if (!has('property', 'og:locale')) lines.push('<meta property="og:locale" content="pt_BR">');
    if (!has('name', 'twitter:card')) lines.push('<meta name="twitter:card" content="summary_large_image">');
    if (!has('name', 'twitter:title')) lines.push(`<meta name="twitter:title" content="${escAttr(title)}">`);
    if (!has('name', 'twitter:description')) lines.push(`<meta name="twitter:description" content="${escAttr(description)}">`);
    if (!has('name', 'twitter:image')) lines.push(`<meta name="twitter:image" content="${image}">`);
    // "<" escapado: o JSON nunca consegue fechar o <script> por acidente.
    lines.push(`<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`);
    return ['    ' + BLOCK_START, ...lines.map(l => '    ' + l), '    ' + BLOCK_END].join('\n') + '\n';
}

function injectSeo(rawHtml, page) {
    let html = stripBlock(rawHtml);
    // og:image relativo → absoluto
    html = html.replace(/(<meta\s+property="og:image"\s+content=")([^"]+)(")/i,
        (_, a, url, c) => a + absolute(url) + c);

    const ogTitle = metaContent(html, 'property', 'og:title');
    const ogDesc = metaContent(html, 'property', 'og:description');
    const block = buildBlock(html, {
        url: page.url,
        title: ogTitle || page.title,
        description: ogDesc || page.description,
        image: page.image,
        jsonLd: page.jsonLd
    });
    if (!/<\/head>/i.test(html)) throw new Error(`${page.url}: sem </head>`);
    return html.replace(/([ \t]*)<\/head>/i, (m) => block + m);
}

function buildSitemap(catalog) {
    EXTRA_PAGES.forEach(p => {
        if (!fs.existsSync(path.join(ROOT, p.file))) throw new Error(`EXTRA_PAGES: ${p.file} não existe`);
    });
    const urls = [
        { loc: SITE + '/', priority: '1.0' },
        ...EXTRA_PAGES.map(p => ({ loc: SITE + p.path, priority: '0.9' })),
        ...catalog.map(g => ({ loc: g.url, priority: '0.8' }))
    ];
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        urls.map(u => `  <url>\n    <loc>${escXml(u.loc)}</loc>\n    <priority>${u.priority}</priority>\n  </url>\n`).join('') +
        '</urlset>\n';
}

function buildLlmsTxt(catalog) {
    const games = catalog.filter(g => g.kind === 'game');
    const apps = catalog.filter(g => g.kind === 'app');
    const item = g => `- [${g.name}](${g.url}): ${g.description}`;
    return [
        `# ${SITE_NAME}`,
        '',
        `> Portal brasileiro de jogos e experimentos que rodam direto no navegador, grátis e sem cadastro: ${catalog.length} títulos em HTML5, Canvas e Three.js (WebGL), em português.`,
        '',
        'Cada título tem uma página de informações com como jogar, controles e dicas, e um botão PLAY que abre o jogo. Funciona em computador, e vários jogos também em celular e tablet.',
        '',
        '## Jogos',
        '',
        ...games.map(item),
        '',
        '## Ferramentas e simulações',
        '',
        ...apps.map(item),
        '',
        '## Desafio do Dia',
        '',
        ...EXTRA_PAGES.map(p => `- [${p.name}](${SITE}${p.path}): ${p.description}`),
        '',
        '## Dados',
        '',
        `- [Catálogo em JSON](${SITE}/games.json): todos os títulos com URL, URL de jogo, descrição, gênero e imagem`,
        `- [Sitemap](${SITE}/sitemap.xml)`,
        ''
    ].join('\n');
}

function buildGamesJson(catalog) {
    const games = catalog.map(({ slug, name, url, playUrl, description, genre, tags, image, kind }) =>
        ({ slug, name, kind, url, playUrl, description, genre, tags, image }));
    return JSON.stringify({ site: SITE, name: SITE_NAME, language: 'pt-BR', count: games.length, games }, null, 2) + '\n';
}

function computeOutputs() {
    const catalog = buildCatalog();
    const files = {
        'sitemap.xml': buildSitemap(catalog),
        'llms.txt': buildLlmsTxt(catalog),
        'games.json': buildGamesJson(catalog)
    };

    catalog.forEach(g => {
        files[`jogos/${g.slug}.html`] = injectSeo(read(`jogos/${g.slug}.html`), {
            url: g.url, title: g.pageTitle, description: g.description, image: g.image, jsonLd: gameJsonLd(g)
        });
    });

    const home = read('index.html');
    files['index.html'] = injectSeo(home, {
        url: SITE + '/',
        title: decode((home.match(/<title>([^<]*)<\/title>/i) || [, SITE_NAME])[1]).trim(),
        description: metaContent(home, 'name', 'description') || '',
        image: absolute(metaContent(home, 'property', 'og:image') || DEFAULT_IMAGE),
        jsonLd: homeJsonLd(catalog)
    });
    return files;
}

function run({ check = false } = {}) {
    const outputs = computeOutputs();
    const stale = [];
    Object.entries(outputs).forEach(([rel, content]) => {
        const file = path.join(ROOT, rel);
        const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
        if (current !== null && current.replace(/\r\n/g, '\n') === content) return;
        stale.push(rel);
        if (!check) fs.writeFileSync(file, current && current.includes('\r\n') ? content.replace(/\n/g, '\r\n') : content, 'utf8');
    });
    return { total: Object.keys(outputs).length, changed: stale };
}

if (require.main === module) {
    const check = process.argv.includes('--check');
    const { total, changed } = run({ check });
    if (check && changed.length) {
        console.error(`SEO desatualizado em ${changed.length} arquivo(s):\n  ${changed.join('\n  ')}\nRode: npm run seo`);
        process.exit(1);
    }
    console.log(check ? `SEO em dia (${total} arquivos).` : `SEO gerado: ${changed.length} de ${total} arquivos atualizados.`);
}

module.exports = { run, computeOutputs, buildCatalog, SITE, EXTRA_PAGES };
