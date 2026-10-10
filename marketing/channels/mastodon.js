// Mastodon: qualquer instância, token de acesso de um aplicativo com escopo write:media e write:statuses.
// A conta deve estar marcada como "automatizada" (bot) no perfil, como pedem as regras da maioria das instâncias.
const fs = require('fs');
const path = require('path');
const { request, json, sleep } = require('../lib/http');

const name = 'mastodon';
const MIME = { '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };

// https obrigatório: o token de acesso não pode trafegar em texto puro
const isConfigured = (env) => Boolean(/^https:\/\//.test(env.MASTODON_INSTANCE || '') && env.MASTODON_ACCESS_TOKEN);

const blobOf = (file) => new Blob([fs.readFileSync(file)], { type: MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });

async function uploadMedia(base, auth, file, alt, thumbFile, fetchImpl, waitMs) {
    const form = new FormData();
    form.append('file', blobOf(file), path.basename(file));
    if (alt) form.append('description', alt);
    if (thumbFile && fs.existsSync(thumbFile)) form.append('thumbnail', blobOf(thumbFile), path.basename(thumbFile));
    const res = await request(fetchImpl, `${base}/api/v2/media`, { method: 'POST', headers: auth, body: form });
    const media = await json(res);
    if (res.status === 200) return media.id;
    // 202: o servidor ainda processa o vídeo; o GET devolve 206 até ficar pronto
    for (let i = 0; i < 60; i++) {
        await sleep(waitMs);
        const poll = await request(fetchImpl, `${base}/api/v1/media/${media.id}`, { headers: auth }, { expect: [200, 206] });
        if (poll.status === 200) return media.id;
    }
    throw new Error(`Mastodon: processamento da mídia ${media.id} não terminou a tempo`);
}

async function publish({ post, composed, media }, env, fetchImpl = fetch, { pollMs = 2000 } = {}) {
    const base = env.MASTODON_INSTANCE.replace(/\/$/, '');
    const auth = { authorization: `Bearer ${env.MASTODON_ACCESS_TOKEN}` };
    const mediaIds = [];
    if (media) {
        const file = media.video || media.image;
        if (file) mediaIds.push(await uploadMedia(base, auth, file, media.alt, media.video ? media.poster : null, fetchImpl, pollMs));
    }
    const res = await request(fetchImpl, `${base}/api/v1/statuses`, {
        method: 'POST',
        headers: {
            ...auth,
            'content-type': 'application/json',
            // reenvio do mesmo post (ex.: queda depois de publicar) não duplica
            'idempotency-key': `${post.id}:mastodon`
        },
        body: JSON.stringify({ status: composed.text, media_ids: mediaIds, language: 'pt', visibility: 'public' })
    });
    const status = await json(res);
    return { id: status.id, url: status.url };
}

module.exports = { name, isConfigured, publish };
