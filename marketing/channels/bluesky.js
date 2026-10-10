// Bluesky (AT Protocol). Conta própria, autenticada com senha de aplicativo (nunca a senha da conta).
// Publica texto com link e hashtags clicáveis e um card (título, descrição e imagem) que leva ao jogo.
// Vídeo nativo no Bluesky exige outro fluxo (serviço de vídeo); por ora o card usa o poster do clipe.
const fs = require('fs');
const path = require('path');
const { request, json } = require('../lib/http');

const name = 'bluesky';
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };

const isConfigured = (env) => Boolean(env.BLUESKY_HANDLE && env.BLUESKY_APP_PASSWORD);

/** posição de `needle` em `text` em bytes UTF-8 (o Bluesky indexa facets em bytes, não em caracteres) */
function byteRange(text, needle) {
    const i = text.indexOf(needle);
    if (i < 0) return null;
    const start = Buffer.byteLength(text.slice(0, i));
    return { byteStart: start, byteEnd: start + Buffer.byteLength(needle) };
}

/** links e hashtags clicáveis */
function buildFacets(text, composed) {
    const facets = [];
    const link = byteRange(text, composed.shown);
    if (link) facets.push({ index: link, features: [{ $type: 'app.bsky.richtext.facet#link', uri: composed.link }] });
    for (const tag of composed.tags ? composed.tags.split(' ') : []) {
        const r = byteRange(text, tag);
        if (r) facets.push({ index: r, features: [{ $type: 'app.bsky.richtext.facet#tag', tag: tag.slice(1) }] });
    }
    return facets;
}

const truncate = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…');

async function publish({ post, composed, game, media }, env, fetchImpl = fetch) {
    const service = (env.BLUESKY_SERVICE || 'https://bsky.social').replace(/\/$/, '');
    const session = await json(await request(fetchImpl, `${service}/xrpc/com.atproto.server.createSession`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: env.BLUESKY_HANDLE, password: env.BLUESKY_APP_PASSWORD })
    }));
    const auth = { authorization: `Bearer ${session.accessJwt}` };

    const external = { uri: composed.link, title: game.name, description: truncate(game.description || '', 280) };
    const thumbFile = media && media.poster && fs.existsSync(media.poster) ? media.poster : null;
    if (thumbFile) {
        const mime = MIME[path.extname(thumbFile).toLowerCase()];
        if (mime) {
            const up = await json(await request(fetchImpl, `${service}/xrpc/com.atproto.repo.uploadBlob`, {
                method: 'POST',
                headers: { ...auth, 'content-type': mime },
                body: fs.readFileSync(thumbFile)
            }));
            external.thumb = up.blob;
        }
    }

    const record = {
        $type: 'app.bsky.feed.post',
        text: composed.text,
        createdAt: new Date().toISOString(),
        langs: ['pt'],
        facets: buildFacets(composed.text, composed),
        embed: { $type: 'app.bsky.embed.external', external }
    };
    const created = await json(await request(fetchImpl, `${service}/xrpc/com.atproto.repo.createRecord`, {
        method: 'POST',
        headers: { ...auth, 'content-type': 'application/json' },
        body: JSON.stringify({ repo: session.did, collection: 'app.bsky.feed.post', record })
    }));
    const rkey = String(created.uri).split('/').pop();
    return { id: created.uri, url: `https://bsky.app/profile/${session.handle || env.BLUESKY_HANDLE}/post/${rkey}` };
}

module.exports = { name, isConfigured, publish, buildFacets, byteRange };
