const { SITE, SITE_HOST } = require('../config');
const { gamePagePath } = require('./lang');

/**
 * URL completa com UTMs que o GA4 lê sem nenhum código extra. Por padrão leva à página de informações do jogo;
 * `path` (ex.: '/desafio/', validado pelo Guardião) leva a outra página do portal; `lang` (en/es) leva à página traduzida do jogo.
 */
function postLink({ game, path, campaign, postId, lang }, channel) {
    const q = new URLSearchParams({
        utm_source: channel,
        utm_medium: 'social',
        utm_campaign: campaign,
        utm_content: postId
    });
    return `${SITE}${path || gamePagePath(game, lang)}?${q.toString()}`;
}

/** Forma curta e legível para mostrar no texto (o clique usa o link completo). */
const displayLink = (game, path, lang) => `${SITE_HOST}${path || gamePagePath(game, lang)}`;

module.exports = { postLink, displayLink };
