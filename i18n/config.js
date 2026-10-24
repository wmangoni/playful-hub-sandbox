// Configuração única das versões em inglês e espanhol: o gerador (scripts/generate-i18n.js), o SEO
// (scripts/generate-seo.js: hreflang, sitemap, llms.txt, games.json) e o servidor (server.js) leem daqui.
//
// Só entram jogos cuja interface DENTRO do jogo é majoritariamente em inglês ou não depende de idioma
// (a página traduzida leva o visitante para o jogo, então não adianta prometer "em inglês" para um jogo cujos
// menus são todos em português). Para cada jogo, `ui` diz como é a interface dele:
//   full    interface em inglês (ou sem texto): nenhuma ressalva
//   partial alguns rótulos do jogo estão em português: a página avisa, com uma nota ESPECÍFICA do jogo
//           (`uiNote` em i18n/<idioma>.json: diga o que está em português, não "alguns rótulos")
//   toggle  o jogo tem um botão PT/EN para trocar o idioma: a página avisa
// Confira SEMPRE abrindo o jogo (inclusive textos desenhados no canvas e telas de instrução/ranking): um jogo cuja
// tela de instruções é em português não é "full". O tests/i18n.test.js checa a classificação contra o código do jogo.
const SITE = 'https://playfulhub.com.br';

const LANGS = {
    en: { code: 'en', hreflang: 'en', locale: 'en_US', gamesDir: 'games', label: 'English', englishName: 'English' },
    // es_LA (América Latina): o vocabulário das traduções é latino-americano (auto, presionar, mouse), não peninsular
    es: { code: 'es', hreflang: 'es', locale: 'es_LA', gamesDir: 'juegos', label: 'Español', englishName: 'Spanish' }
};

// As páginas traduzidas NÃO carregam anúncios (AdSense): o texto foi traduzido por IA e ainda não passou por revisão de um
// falante nativo, caso que as políticas de spam/conteúdo do Google e do AdSense citam. Quando houver revisão humana, ligue
// aqui (o gerador então mantém os slots do template em português).
const ADS_ON_TRANSLATED_PAGES = false;

// `related`: sempre outros jogos DESTA lista (a página traduzida só linka para páginas traduzidas).
const GAMES = [
    { slug: 'snake', ui: 'partial', emoji: '🐍', related: ['space_shooter', 'pinball', 'puzzle'] },
    { slug: 'space_shooter', ui: 'partial', emoji: '🚀', related: ['3d_shooter', 'snake', 'pinball'] },
    { slug: 'pinball', ui: 'partial', emoji: '🎱', related: ['snake', 'space_shooter', '3d_shooter'] },
    { slug: '3d_shooter', ui: 'full', emoji: '🔫', related: ['space_shooter', 'voxel_arena', 'voxel_city'] },
    { slug: 'voxel_city', ui: 'partial', emoji: '🏙️', related: ['voxel_arena', '3d_shooter', 'space_shooter'] },
    { slug: 'voxel_arena', ui: 'partial', emoji: '⚔️', related: ['voxel_city', '3d_shooter', 'space_shooter'] },
    { slug: 'gameoflife', ui: 'partial', emoji: '🧬', related: ['puzzle', 'rubiks_cube', 'snake'] },
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

/**
 * rotas que o servidor precisa servir. `file` = página gerada; `redirect` = 301 para outro caminho.
 * (/en e /es sem barra o próprio express.static já redireciona para o índice.)
 */
function routes() {
    const out = [];
    for (const l of langs) {
        out.push({ url: hubPath(l), file: hubFile(l) });
        // a pasta /en/games não tem índice: sem isto o static redireciona para /en/games/ e dá 404
        out.push({ url: `/${l}/${LANGS[l].gamesDir}`, redirect: hubPath(l) }, { url: `/${l}/${LANGS[l].gamesDir}/`, redirect: hubPath(l) });
        for (const slug of slugs) out.push({ url: gamePath(l, slug), file: gameFile(l, slug) });
    }
    return out;
}

module.exports = { SITE, LANGS, ADS_ON_TRANSLATED_PAGES, GAMES, langs, slugs, has, game, gamePath, gameUrl, gameFile, hubPath, hubUrl, hubFile, gameAlternates, homeAlternates, routes };
