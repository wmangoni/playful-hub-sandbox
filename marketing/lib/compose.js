// Monta o texto final de cada canal a partir do post do calendário.
const { postLink, displayLink } = require('./links');
const { MASTODON_LINK_LENGTH } = require('../config');
const { langOf, CTA } = require('./lang');

const tagsLine = (post) => (post.hashtags || []).map((t) => `#${t}`).join(' ');

/** conta graphemas (um emoji com modificadores conta 1), como o Bluesky faz */
function graphemes(text) {
    return [...new Intl.Segmenter('pt', { granularity: 'grapheme' }).segment(text)].length;
}

/** @returns {{text: string, link: string, shown: string, tags: string, cta: string}} */
function compose(post, channel, campaign) {
    const dest = post.link && post.link.path; // destino alternativo (ex.: /desafio/); padrão = página do jogo
    const lang = langOf(post);
    const link = postLink({ game: post.game, path: dest, campaign, postId: post.id, lang }, channel);
    const shown = displayLink(post.game, dest, lang);
    const cta = (post.link && post.link.cta) || CTA[lang];
    const tags = tagsLine(post);
    let text;
    if (channel === 'bluesky') text = [post.text, shown, tags].filter(Boolean).join('\n\n');
    else if (channel === 'mastodon') text = [post.text, link, tags].filter(Boolean).join('\n\n');
    else text = [post.text, `▶ ${cta}`, tags].filter(Boolean).join('\n\n');
    return { text, link, shown, tags, cta };
}

/** tamanho como cada plataforma conta */
function countedLength(post, channel, campaign) {
    const { text, link } = compose(post, channel, campaign);
    if (channel === 'mastodon') return graphemes(text.replace(link, 'x'.repeat(MASTODON_LINK_LENGTH)));
    return graphemes(text);
}

module.exports = { compose, countedLength, graphemes, tagsLine };
