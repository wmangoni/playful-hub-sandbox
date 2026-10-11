// Configuração única das versões em inglês e espanhol: o gerador (scripts/generate-i18n.js), o SEO
// (scripts/generate-seo.js: hreflang, sitemap, llms.txt, games.json) e o servidor (server.js) leem daqui.
//
// Só entram jogos cuja interface DENTRO do jogo é majoritariamente em inglês ou não depende de idioma
// (a página traduzida leva o visitante para o jogo, então não adianta prometer "em inglês" para um jogo cujos
// menus são todos em português). Para cada jogo, `ui` diz como é a interface dele:
//   full    interface em inglês (ou sem texto): nenhuma ressalva
//   partial alguns rótulos do jogo estão em português: a página avisa
//   toggle  o jogo tem um botão PT/EN para trocar o idioma: a página avisa
const SITE = 'https://playfulhub.com.br';

const LANGS = {
    en: { code: 'en', hreflang: 'en', locale: 'en_US', gamesDir: 'games', label: 'English', currency: 'USD' },
    es: { code: 'es', hreflang: 'es', locale: 'es_LA', gamesDir: 'juegos', label: 'Español', currency: 'USD' }
};

// `related`: sempre outros jogos DESTA lista (a página traduzida só linka para páginas traduzidas).
const GAMES = [
    { slug: 'snake', ui: 'partial', emoji: '🐍', related: ['space_shooter', 'pinball', 'puzzle'] },
    { slug: 'space_shooter', ui: 'partial', emoji: '🚀', related: ['3d_shooter', 'snake', 'pinball'] },
    { slug: 'pinball', ui: 'full', emoji: '🎱', related: ['snake', 'space_shooter', 'visual_effects'] },
    { slug: '3d_shooter', ui: 'full', emoji: '🔫', related: ['space_shooter', 'voxel_arena', 'voxel_city'] },
    { slug: 'voxel_city', ui: 'partial', emoji: '🏙️', related: ['voxel_arena', '3d_shooter', 'space_shooter'] },
    { slug: 'voxel_arena', ui: 'partial', emoji: '⚔️', related: ['voxel_city', '3d_shooter', 'space_shooter'] },
    { slug: 'visual_effects', ui: 'full', emoji: '✨', related: ['pinball', 'space_shooter', 'snake'] },
    { slug: 'gameoflife', ui: 'partial', emoji: '🧬', related: ['puzzle', 'rubiks_cube', 'visual_effects'] },
    { slug: 'rubiks_cube', ui: 'partial', emoji: '🎲', related: ['puzzle', 'gameoflife', 'snake'] },
    { slug: 'puzzle', ui: 'toggle', emoji: '🧩', related: ['rubiks_cube', 'gameoflife', 'snake'] }
];

const langs = Object.keys(LANGS);
const slugs = GAMES.map((g) => g.slug);
const has = (slug) => slugs.includes(slug);
const game = (slug) => GAMES.find((g) => g.slug === slug);

const gamePath = (lang, slug) => `/${lang}/${LANGS[lang].gamesDir}/${slug}`;
const gameUrl = (lang, slug) => SITE + gamePath(lang, slug);
const gameFile = (lang, slug) => `${lang}/${LANGS[lang].gamesDir}/${slug}.html`;
const hubPath = (lang) => `/${lang}/`;
const hubUrl = (lang) => SITE + hubPath(lang);
const hubFile = (lang) => `${lang}/index.html`;

/** hreflang de um jogo traduzido: o x-default é a versão em português (o portal é brasileiro) */
function gameAlternates(slug) {
    return [
        { hreflang: 'pt-BR', href: `${SITE}/jogos/${slug}` },
        ...langs.map((l) => ({ hreflang: LANGS[l].hreflang, href: gameUrl(l, slug) })),
        { hreflang: 'x-default', href: `${SITE}/jogos/${slug}` }
    ];
}

/** hreflang da home: a versão em cada idioma é a página-índice dos jogos traduzidos */
function homeAlternates() {
    return [
        { hreflang: 'pt-BR', href: SITE + '/' },
        ...langs.map((l) => ({ hreflang: LANGS[l].hreflang, href: hubUrl(l) })),
        { hreflang: 'x-default', href: SITE + '/' }
    ];
}

/** rotas que o servidor precisa servir (URL limpa → arquivo gerado) */
function routes() {
    const out = [];
    for (const l of langs) {
        out.push({ url: `/${l}`, file: hubFile(l) }, { url: hubPath(l), file: hubFile(l) });
        for (const slug of slugs) out.push({ url: gamePath(l, slug), file: gameFile(l, slug) });
    }
    return out;
}

module.exports = { SITE, LANGS, GAMES, langs, slugs, has, game, gamePath, gameUrl, gameFile, hubPath, hubUrl, hubFile, gameAlternates, homeAlternates, routes };
