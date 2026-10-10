const { SITE, SITE_HOST } = require('../config');

/** URL completa da página de informações do jogo, com UTMs que o GA4 lê sem nenhum código extra. */
function postLink({ game, campaign, postId }, channel) {
    const q = new URLSearchParams({
        utm_source: channel,
        utm_medium: 'social',
        utm_campaign: campaign,
        utm_content: postId
    });
    return `${SITE}/jogos/${game}?${q.toString()}`;
}

/** Forma curta e legível para mostrar no texto (o clique usa o link completo). */
const displayLink = (game) => `${SITE_HOST}/jogos/${game}`;

module.exports = { postLink, displayLink };
