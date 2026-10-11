const { SITE, SITE_HOST } = require('../config');

/**
 * URL completa com UTMs que o GA4 lê sem nenhum código extra. Por padrão leva à página de informações do jogo;
 * `path` (ex.: '/desafio/', validado pelo Guardião) leva a outra página do portal.
 */
function postLink({ game, path, campaign, postId }, channel) {
    const q = new URLSearchParams({
        utm_source: channel,
        utm_medium: 'social',
        utm_campaign: campaign,
        utm_content: postId
    });
    return `${SITE}${path || `/jogos/${game}`}?${q.toString()}`;
}

/** Forma curta e legível para mostrar no texto (o clique usa o link completo). */
const displayLink = (game, path) => `${SITE_HOST}${path || `/jogos/${game}`}`;

module.exports = { postLink, displayLink };
