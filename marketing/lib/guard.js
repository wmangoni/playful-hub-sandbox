// Guardião: nada vai ao ar sem passar por aqui. Roda na CI (todo calendário novo, inclusive os escritos
// por agentes) e de novo, por post, na hora de publicar.
const fs = require('fs');
const path = require('path');
const cfg = require('../config');
const { countedLength } = require('./compose');
const { resolveMedia, missingFiles, insideAssets } = require('./media');

const ID_RE = /^[a-z0-9][a-z0-9-]{2,60}$/;
const SLUG_RE = /^[a-z0-9][a-z0-9_-]{1,40}$/;
const AT_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:\d{2})$/;
const CAMPAIGN_RE = /^[a-z0-9][a-z0-9-]{2,40}$/;

/** ISO 8601 com fuso, estrito: rejeita 30/02, hora 24 e qualquer data que o JavaScript "corrigiria" em silêncio */
function validAt(at) {
    const m = AT_RE.exec(at || '');
    if (!m) return false;
    const [y, mo, d, h, mi, sec] = [m[1], m[2], m[3], m[4], m[5], m[6] || '0'].map(Number);
    const probe = new Date(Date.UTC(y, mo - 1, d, h, mi, sec));
    return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d
        && probe.getUTCHours() === h && probe.getUTCMinutes() === mi && !Number.isNaN(Date.parse(at));
}
const HASHTAG_RE = /^[A-Za-zÀ-ÿ0-9_]{2,30}$/;
// isca de engajamento e spam: o plano é conteúdo que vale por si, nunca pedir curtida/compartilhamento
const BAIT = ['clique aqui', 'link na bio', 'ganhe dinheiro', 'compre agora', 'sorteio', 'siga e ', 'segue de volta',
    'follow back', 'curta e compartilhe', 'marque um amigo', 'marque alguém', 'compartilhe com', 'retweet', 'rt se'];
const CLAIMS = [/melhor jogo do mundo/, /\bn(úmero|º) ?1\b/, /o maior do brasil/, /\bgarantid[oa]s?\b/, /viciante demais/];

const emojiCount = (s) => (s.match(/\p{Extended_Pictographic}/gu) || []).length + (s.match(/\p{Regional_Indicator}{2}/gu) || []).length;

function lintText(text) {
    const p = [];
    const low = text.toLowerCase();
    if (text.trim().length < cfg.MIN_TEXT_LENGTH) p.push(`texto curto demais (mínimo ${cfg.MIN_TEXT_LENGTH} caracteres)`);
    if (/https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|br|io|gg|ly|co|app|dev)\b/i.test(text)) p.push('o texto não pode conter URL ou domínio (o link é montado com UTM automaticamente)');
    if (/(^|\s)@\w/.test(text)) p.push('o texto não pode conter @menção');
    if (/(^|\s)#\p{L}/u.test(text)) p.push('hashtags vão no campo "hashtags", não no texto');
    if (emojiCount(text) > cfg.MAX_EMOJIS) p.push(`mais de ${cfg.MAX_EMOJIS} emojis`);
    if (/!{3,}|\?{3,}/.test(text)) p.push('pontuação exagerada');
    const letters = text.replace(/[^A-Za-zÀ-ÿ]/g, '');
    if (letters.length > 20 && text.replace(/[^A-ZÀ-Ý]/g, '').length / letters.length > 0.4) p.push('texto em CAIXA ALTA');
    BAIT.filter((b) => low.includes(b)).forEach((b) => p.push(`isca de engajamento/spam: "${b.trim()}"`));
    CLAIMS.filter((re) => re.test(low)).forEach((re) => p.push(`afirmação não comprovável: "${low.match(re)[0]}"`));
    return p;
}

function shotExists(game, shot) {
    // game vira nome de arquivo e é dado ao require: só slug, nunca caminho
    if (!SLUG_RE.test(game || '') || typeof shot !== 'string') return false;
    const file = path.resolve(__dirname, '../cineasta/shots', `${game}.js`);
    if (!fs.existsSync(file)) return false;
    return Object.prototype.hasOwnProperty.call(require(file).shots, shot);
}

/**
 * @param mode 'plan' (CI, pré-publicação: clipes ainda podem não ter sido gravados) ou
 *             'publish' (na hora de publicar: os arquivos de mídia precisam existir)
 */
function validatePost(post, { games, mode = 'plan' }) {
    if (!post || typeof post !== 'object') return ['post inválido'];
    const p = [];
    const where = post.id ? post.id : '(sem id)';
    const add = (msg) => p.push(`${where}: ${msg}`);

    if (!ID_RE.test(post.id || '')) add('id deve ser um slug (a-z, 0-9, hífen)');
    if (!validAt(post.at)) add('"at" precisa ser uma data real em ISO com fuso (ex.: 2026-10-14T19:00:00-03:00)');
    if (!CAMPAIGN_RE.test(post.campaign || '')) add('campanha ausente ou inválida (slug em "campaign" do calendário)');
    if (!SLUG_RE.test(post.game || '') || !games.has(post.game)) add(`jogo "${post.game}" não existe em games.json`);
    if (!Array.isArray(post.channels) || !post.channels.length || post.channels.some((c) => !cfg.CHANNELS.includes(c))) add(`"channels" deve ser subconjunto de ${cfg.CHANNELS.join(', ')}`);
    if (typeof post.text !== 'string') { add('texto ausente'); return p; }
    lintText(post.text).forEach(add);

    const tags = post.hashtags || [];
    if (!Array.isArray(tags) || tags.length > cfg.MAX_HASHTAGS) add(`no máximo ${cfg.MAX_HASHTAGS} hashtags`);
    else if (tags.some((t) => !HASHTAG_RE.test(t))) add('hashtag inválida (só letras, números e _; sem "#")');

    if (post.media) {
        const m = post.media;
        if (!m.alt || m.alt.trim().length < 15) add('mídia exige "alt" (descrição de acessibilidade) com ao menos 15 caracteres');
        if (m.clip && !shotExists(m.game || post.game, m.clip)) add(`tomada "${m.clip}" não existe em marketing/cineasta/shots/${m.game || post.game}.js`);
        if (![m.clip, m.video, m.image].filter(Boolean).length) add('mídia sem clip, video ou image');
        const media = resolveMedia(post);
        if (media) {
            // mídia do repositório: só dentro de assets/ e com extensão de mídia
            if (!media.generated) {
                [media.video, media.image, media.poster].filter(Boolean).forEach((f) => {
                    if (!insideAssets(f)) add(`mídia fora de assets/ ou com extensão não permitida: ${path.relative(cfg.ROOT, f)}`);
                });
            }
            // arquivos do repositório precisam existir sempre; clipes gerados só na hora de publicar
            const missing = media.generated && mode === 'plan' ? [] : missingFiles(media);
            missing.forEach((f) => add(`arquivo de mídia não encontrado: ${path.relative(cfg.ROOT, f)}`));
            // clipe gravado só vale se passou no controle de qualidade do Cineasta
            if (media.generated && mode === 'publish' && fs.existsSync(media.report)) {
                let ok = false;
                try { ok = JSON.parse(fs.readFileSync(media.report, 'utf8')).ok === true; } catch (e) { /* relatório ilegível = reprovado */ }
                if (!ok) add(`clipe reprovado (ou sem relatório) no controle de qualidade: ${path.relative(cfg.ROOT, media.report)}`);
            }
            const thumb = media.poster;
            if (thumb && fs.existsSync(thumb) && Array.isArray(post.channels) && post.channels.includes('bluesky') && fs.statSync(thumb).size > cfg.BLUESKY_IMAGE_MAX_BYTES)
                add(`imagem do card do Bluesky acima de ${cfg.BLUESKY_IMAGE_MAX_BYTES} bytes: ${path.relative(cfg.ROOT, thumb)}`);
            if (media.video && fs.existsSync(media.video) && fs.statSync(media.video).size > cfg.VIDEO_MAX_BYTES) add('vídeo acima de 40 MB');
        }
    }

    // tamanho final em cada canal
    if (games.has(post.game) && Array.isArray(post.channels)) {
        for (const ch of post.channels.filter((c) => cfg.CHANNELS.includes(c))) {
            const n = countedLength(post, ch, post.campaign || 'x');
            if (n > cfg.TEXT_LIMITS[ch]) add(`${ch}: ${n} caracteres, o limite é ${cfg.TEXT_LIMITS[ch]}`);
        }
    }
    return p;
}

/** Regras que dependem do conjunto: ids únicos, textos únicos, frequência por canal e por dia. */
function validateCalendar(posts, { games, mode = 'plan' }) {
    const problems = [];
    const seenId = new Set(), seenText = new Set();
    for (const post of posts) {
        problems.push(...validatePost(post, { games, mode }));
        if (seenId.has(post.id)) problems.push(`${post.id}: id duplicado`);
        seenId.add(post.id);
        const key = (post.text || '').trim().toLowerCase();
        if (seenText.has(key)) problems.push(`${post.id}: texto idêntico ao de outro post`);
        seenText.add(key);
    }
    const valid = posts.filter((p) => p.at && !Number.isNaN(Date.parse(p.at)) && Array.isArray(p.channels));
    for (const ch of cfg.CHANNELS) {
        const mine = valid.filter((p) => p.channels.includes(ch)).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
        const perDay = {};
        mine.forEach((p, i) => {
            const day = new Date(Date.parse(p.at) - 3 * 36e5).toISOString().slice(0, 10); // dia no horário de Brasília
            perDay[day] = (perDay[day] || 0) + 1;
            if (perDay[day] === cfg.MAX_POSTS_PER_DAY_PER_CHANNEL + 1) problems.push(`${ch}: mais de ${cfg.MAX_POSTS_PER_DAY_PER_CHANNEL} posts em ${day}`);
            const prev = mine[i - 1];
            if (prev && (Date.parse(p.at) - Date.parse(prev.at)) / 36e5 < cfg.MIN_HOURS_BETWEEN_POSTS_PER_CHANNEL)
                problems.push(`${ch}: ${prev.id} e ${p.id} com menos de ${cfg.MIN_HOURS_BETWEEN_POSTS_PER_CHANNEL} h de intervalo`);
        });
    }
    return problems;
}

module.exports = { validatePost, validateCalendar, lintText };
