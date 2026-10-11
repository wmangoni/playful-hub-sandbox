const { STALE_AFTER_HOURS } = require('../config');
const { isPosted } = require('./ledger');

/**
 * Separa os posts do calendário em: devidos (hora chegou, dentro da janela, falta algum canal),
 * vencidos (passaram da janela sem terem sido publicados) e futuros.
 */
function classify(posts, ledger, now, { staleAfterHours = STALE_AFTER_HOURS } = {}) {
    // relógio inválido (ex.: --now digitado errado) faria toda comparação dar falso e todo post virar "devido"
    if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new Error('relógio inválido (now)');
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

/**
 * No máximo um post por canal por execução: o mais recente. Os anteriores ainda devidos naquele canal viram
 * "superseded". Assim, se o workflow ficou parado e voltou, ele não despeja vários posts de uma vez
 * (o Guardião só garante o intervalo entre posts no calendário, não na hora de recuperar atraso).
 */
function onePerChannel(due) {
    const latest = new Map();
    for (const { post, channels } of due) for (const c of channels) latest.set(c, post.id); // due está em ordem de `at`
    const keep = [], superseded = [];
    for (const d of due) {
        const channels = d.channels.filter((c) => latest.get(c) === d.post.id);
        d.channels.filter((c) => !channels.includes(c)).forEach((c) => superseded.push({ id: d.post.id, channel: c }));
        if (channels.length) keep.push({ post: d.post, channels });
    }
    return { due: keep, superseded };
}

module.exports = { classify, onePerChannel };
