// Idioma dos posts: página de destino, CTA, cartão do link e conferência do texto.
const fs = require('fs');
const path = require('path');
const i18n = require('../../i18n/config');

const DEFAULT_LANG = 'pt';
const langOf = (post) => (post && post.lang) || DEFAULT_LANG;

/** caminho da página do portal para o jogo no idioma do post */
const gamePagePath = (game, lang) => (lang && lang !== DEFAULT_LANG ? i18n.gamePath(lang, game) : `/jogos/${game}`);

const cache = {};
const translations = (lg) => (cache[lg] = cache[lg] || JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../i18n/${lg}.json`), 'utf8')));
/** título e descrição do cartão do link no idioma do post (os de games.json são em português) */
function cardFor(game, lang) {
    if (!lang || lang === DEFAULT_LANG) return game;
    const t = translations(lang).games[game.slug];
    return t ? { ...game, name: t.title, description: t.description } : game;
}

// Conferência barata de que o texto está no idioma declarado (o Guardião não traduz nada: só pega engano de copiar e colar)
// \b do JavaScript não entende letras acentuadas ("você" nunca fecharia), então o limite de palavra é por \p{L}
const words = (list) => new RegExp(String.raw`(?<![\p{L}\p{N}])(?:${list.join('|')})(?![\p{L}\p{N}])`, 'iu');
// palavras só do português (ficam de fora as que também são espanhol ou inglês: para, dos, no, do, que, nos, com...)
const PT_WORDS = words(['você', 'vocês', 'não', 'também', 'jogo', 'jogos', 'jogar', 'grátis', 'de graça', 'sem precisar', 'nesse', 'nessa',
    'um', 'uma', 'pra', 'das', 'pelo', 'pela', 'seu', 'sua', 'tudo', 'direto', 'mais', 'muito', 'inimigos']);
// ã, õ e ç não existem em inglês nem em espanhol (qualquer uma delas é português)
const PT_LETTERS = /[ãõç]/i;
const ES_WORDS = words(['el', 'los', 'las', 'una', 'para', 'gratis', 'juego', 'juegos', 'jugar', 'navegador', 'sin', 'tu', 'con']);
const EN_WORDS = words(['the', 'and', 'free', 'your', 'with', 'play', 'game', 'browser', 'without']);
// só inglês: "hack and slash", "Game of Life" e nomes de jogos são válidos em espanhol, então ficam fora
const EN_ONLY = words(['the', 'your', 'with', 'free', 'without']);

/** @returns {string[]} problemas */
function langProblems(text, lang) {
    if (lang === 'en') {
        const pt = text.match(PT_WORDS) || text.match(PT_LETTERS);
        if (pt || ES_WORDS.test(text)) return [`texto não parece estar em inglês (lang: "en"): "${(pt || text.match(ES_WORDS))[0]}"`];
        if (!EN_WORDS.test(text)) return ['texto não parece estar em inglês (lang: "en")'];
    }
    if (lang === 'es') {
        const pt = text.match(PT_WORDS) || text.match(PT_LETTERS);
        if (pt || EN_ONLY.test(text)) return [`texto não parece estar em espanhol (lang: "es"): "${(pt || text.match(EN_ONLY))[0]}"`];
        if (!ES_WORDS.test(text)) return ['texto não parece estar em espanhol (lang: "es")'];
    }
    return [];
}

/** o jogo tem página traduzida E texto traduzido em i18n/<lang>.json (sem o texto, o cartão do link cairia em português em silêncio) */
function hasTranslation(slug, lg) {
    if (!i18n.has(slug)) return false;
    try { return Boolean(translations(lg).games[slug]); } catch (e) { return false; }
}

/** jogos cuja interface DENTRO do jogo não é toda em inglês/sem texto: o post precisa avisar (como a página faz) */
const needsLanguageNote = (slug) => i18n.game(slug).ui !== 'full';
const MENTIONS_PORTUGUESE = /portugu(?:e|é)s/i; // "Portuguese" e "portugués"

module.exports = { DEFAULT_LANG, langOf, gamePagePath, cardFor, langProblems, hasTranslation, needsLanguageNote, MENTIONS_PORTUGUESE };
