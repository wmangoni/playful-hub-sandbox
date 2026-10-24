// Idioma dos posts: página de destino, CTA, cartão do link e conferência do texto.
const fs = require('fs');
const path = require('path');
const i18n = require('../../i18n/config');

const DEFAULT_LANG = 'pt';
const langOf = (post) => (post && post.lang) || DEFAULT_LANG;

const CTA = { pt: 'Jogar grátis no navegador', en: 'Play free in your browser', es: 'Jugar gratis en el navegador' };

/** caminho da página do portal para o jogo no idioma do post */
const gamePagePath = (game, lang) => (lang && lang !== DEFAULT_LANG ? i18n.gamePath(lang, game) : `/jogos/${game}`);

const cache = {};
/** título e descrição do cartão do link no idioma do post (os de games.json são em português) */
function cardFor(game, lang) {
    if (!lang || lang === DEFAULT_LANG) return game;
    cache[lang] = cache[lang] || JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../i18n/${lang}.json`), 'utf8'));
    const t = cache[lang].games[game.slug];
    return t ? { ...game, name: t.title, description: t.description } : game;
}

// Conferência barata de que o texto está no idioma declarado (o Guardião não traduz nada: só pega engano de copiar e colar)
// \b do JavaScript não entende letras acentuadas ("você" nunca fecharia), então o limite de palavra é por \p{L}
const words = (list) => new RegExp(String.raw`(?<![\p{L}\p{N}])(?:${list.join('|')})(?![\p{L}\p{N}])`, 'iu');
const PT_WORDS = words(['você', 'vocês', 'não', 'também', 'jogo', 'jogos', 'jogar', 'grátis', 'de graça', 'sem precisar', 'nesse', 'nessa']);
const ES_WORDS = words(['el', 'los', 'las', 'una', 'para', 'gratis', 'juego', 'juegos', 'jugar', 'navegador', 'sin', 'tu', 'con']);
const EN_WORDS = words(['the', 'and', 'free', 'your', 'with', 'play', 'game', 'browser', 'without']);
// só inglês: "hack and slash", "Game of Life" e nomes de jogos são válidos em espanhol, então ficam fora
const EN_ONLY = words(['the', 'your', 'with', 'free', 'without']);

/** @returns {string[]} problemas */
function langProblems(text, lang) {
    if (lang === 'en') {
        if (PT_WORDS.test(text) || ES_WORDS.test(text)) return [`texto não parece estar em inglês (lang: "en"): "${(text.match(PT_WORDS) || text.match(ES_WORDS))[0]}"`];
        if (!EN_WORDS.test(text)) return ['texto não parece estar em inglês (lang: "en")'];
    }
    if (lang === 'es') {
        if (PT_WORDS.test(text) || EN_ONLY.test(text)) return [`texto não parece estar em espanhol (lang: "es"): "${(text.match(PT_WORDS) || text.match(EN_ONLY))[0]}"`];
        if (!ES_WORDS.test(text)) return ['texto não parece estar em espanhol (lang: "es")'];
    }
    return [];
}

module.exports = { DEFAULT_LANG, langOf, CTA, gamePagePath, cardFor, langProblems, has: (slug) => i18n.has(slug) };
