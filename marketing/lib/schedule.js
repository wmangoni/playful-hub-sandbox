const { STALE_AFTER_HOURS } = require('../config');
const { isPosted } = require('./ledger');

/**
 * Separa os posts do calendário em: devidos (hora chegou, dentro da janela, falta algum canal),
 * vencidos (passaram da janela sem terem sido publicados) e futuros.
 */
function classify(posts, ledger, now, { staleAfterHours = STALE_AFTER_HOURS } = {}) {
    const due = [], expired = [], future = [];
    for (const post of posts) {
        const at = new Date(post.at);
        const pending = post.channels.filter((c) => !isPosted(ledger, post.id, c));
        if (!pending.length) continue;
        if (at > now) future.push(post);
        else if ((now - at) / 36e5 > staleAfterHours) expired.push(post);
        else due.push({ post, channels: pending });
    }
    due.sort((a, b) => new Date(a.post.at) - new Date(b.post.at));
    return { due, expired, future };
}

module.exports = { classify };
