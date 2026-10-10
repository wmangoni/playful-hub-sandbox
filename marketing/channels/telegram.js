// Telegram: canal público onde o bot é administrador. TELEGRAM_CHAT_ID é o @usuario do canal (ou o id numérico).
const fs = require('fs');
const path = require('path');
const { request, json } = require('../lib/http');

const name = 'telegram';

const isConfigured = (env) => Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const blobOf = (file, type) => new Blob([fs.readFileSync(file)], { type });

/** legenda em HTML do Telegram: texto escapado + link com UTM + hashtags */
function buildCaption(post, composed) {
    return [esc(post.text), `<a href="${esc(composed.link)}">▶ Jogar grátis no navegador</a>`, esc(composed.tags)].filter(Boolean).join('\n\n');
}

async function publish({ post, composed, media }, env, fetchImpl = fetch) {
    const api = (method) => `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`;
    const caption = buildCaption(post, composed);
    const form = new FormData();
    form.append('chat_id', env.TELEGRAM_CHAT_ID);
    form.append('parse_mode', 'HTML');
    let method;
    if (media && media.video) {
        method = 'sendVideo';
        form.append('video', blobOf(media.video, 'video/mp4'), path.basename(media.video));
        form.append('supports_streaming', 'true');
        if (media.poster && fs.existsSync(media.poster)) form.append('thumbnail', blobOf(media.poster, 'image/jpeg'), 'thumb.jpg');
        if (media.report && fs.existsSync(media.report)) {
            const r = JSON.parse(fs.readFileSync(media.report, 'utf8'));
            form.append('width', String(r.width));
            form.append('height', String(r.height));
            form.append('duration', String(Math.round(r.duration)));
        }
        form.append('caption', caption);
    } else if (media && media.image) {
        method = 'sendPhoto';
        form.append('photo', blobOf(media.image, /\.jpe?g$/i.test(media.image) ? 'image/jpeg' : 'image/png'), path.basename(media.image));
        form.append('caption', caption);
    } else {
        method = 'sendMessage';
        form.append('text', caption);
    }
    // sem retentativa: o Telegram não tem chave de idempotência, e repetir um send* cuja resposta se perdeu duplicaria o post
    const res = await json(await request(fetchImpl, api(method), { method: 'POST', body: form }, { retries: 0 }));
    if (!res.ok) throw new Error(`Telegram: ${res.description || 'resposta sem ok'}`);
    const id = res.result.message_id;
    const chat = String(env.TELEGRAM_CHAT_ID);
    return { id: String(id), url: chat.startsWith('@') ? `https://t.me/${chat.slice(1)}/${id}` : null };
}

module.exports = { name, isConfigured, publish, buildCaption };
