// Divulgação automatizada: Cineasta (câmera e legendas), Guardião, agenda, ledger, canais (com fetch simulado)
// e o fluxo completo do publicador. Não usa rede, navegador nem ffmpeg.
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

// clipes de teste vivem numa pasta temporária: os testes não dependem do que há (ou não) em marketing/out
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mkt-'));
process.env.MARKETING_CLIPS_DIR = path.join(tmp, 'clips');
fs.mkdirSync(process.env.MARKETING_CLIPS_DIR);

const M = path.resolve(__dirname, '../marketing');
const { spawnSync } = require('child_process');
const { sample, sampleVec, clamp01 } = require(`${M}/cineasta/lib/spline`);
const { frameState, captionAt } = require(`${M}/cineasta/record`);
const { postLink } = require(`${M}/lib/links`);
const { compose, countedLength, graphemes } = require(`${M}/lib/compose`);
const { lintText, validatePost, validateCalendar } = require(`${M}/lib/guard`);
const { classify, onePerChannel } = require(`${M}/lib/schedule`);
const ledgerLib = require(`${M}/lib/ledger`);
const { request, HttpError, safePath } = require(`${M}/lib/http`);
const { insideAssets } = require(`${M}/lib/media`);
const { loadCalendars, loadGames } = require(`${M}/lib/calendar`);
const bluesky = require(`${M}/channels/bluesky`);
const mastodon = require(`${M}/channels/mastodon`);
const telegram = require(`${M}/channels/telegram`);
const { run, clipsNeeded } = require(`${M}/publish`);

const games = loadGames();
const jsonRes = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
const quiet = () => {};

const goodPost = (over = {}) => ({
    id: 'teste-01-snake', at: '2026-10-14T19:00:00-03:00', game: 'snake', campaign: 'teste',
    text: 'A cobrinha clássica, com visual moderno, direto no navegador e sem precisar instalar nada.',
    hashtags: ['JogosBR'], channels: ['bluesky', 'mastodon', 'telegram'], ...over
});

(async () => {
    // ---- spline: a câmera passa pelas chaves, sem estourar entre elas
    {
        const keys = [{ t: 0, v: 0 }, { t: 5, v: 10 }, { t: 15, v: 40 }];
        assert.strictEqual(sample(keys, 0), 0);
        assert.ok(Math.abs(sample(keys, 5) - 10) < 1e-9, 'passa exatamente pela chave');
        assert.strictEqual(sample(keys, 99), 40, 'depois da última chave, fica nela');
        assert.strictEqual(sample(keys, -3), 0, 'antes da primeira, fica nela');
        const two = [{ t: 0, v: 0 }, { t: 10, v: 10 }];
        for (let t = 0; t <= 10; t += 0.5) assert.ok(sample(two, t) >= -1e-9 && sample(two, t) <= 10 + 1e-9, 'duas chaves não repuxam');
        assert.deepStrictEqual(sampleVec([{ t: 0, v: [0, 5] }, { t: 2, v: [4, 5] }], 1), [2, 5]);
        assert.strictEqual(clamp01(2), 1);
        console.log('✓ spline');
    }

    // ---- tomadas: todas têm câmera dentro da duração, legendas coerentes e hora válida
    {
        const shots = require(`${M}/cineasta/shots/tumbalacatumba`);
        const names = Object.keys(shots.shots);
        assert.ok(names.length >= 8, 'esperava ao menos 8 tomadas');
        for (const [id, s] of Object.entries(shots.shots)) {
            assert.ok(s.duration >= 10 && s.duration <= 20, `${id}: duração de 10 a 20 s`);
            assert.strictEqual(s.camera[0].t, 0, `${id}: câmera começa em t=0`);
            assert.ok(s.camera[s.camera.length - 1].t >= s.duration - 1e-9, `${id}: câmera cobre a duração`);
            assert.ok(s.hour.every((h) => h >= 0 && h < 24), `${id}: hora válida`);
            s.captions.forEach((c) => assert.ok(c.from < c.to && c.to <= s.duration && c.text.length <= 60, `${id}: legenda curta e dentro da duração`));
            const mid = frameState(s, s.duration / 2);
            assert.ok(mid.pos.every(Number.isFinite) && mid.look.every(Number.isFinite), `${id}: câmera finita`);
        }
        assert.strictEqual(captionAt([{ from: 1, to: 5, text: 'x' }], 0).text, '');
        assert.strictEqual(captionAt([{ from: 1, to: 5, text: 'x' }], 3).opacity, 1);
        assert.ok(captionAt([{ from: 1, to: 5, text: 'x' }], 1.1).opacity < 1, 'legenda entra com fade');
        console.log(`✓ tomadas (${names.length})`);
    }

    // ---- links com UTM
    {
        const u = new URL(postLink({ game: 'snake', campaign: 'c1', postId: 'p1' }, 'mastodon'));
        assert.strictEqual(u.origin + u.pathname, 'https://playfulhub.com.br/jogos/snake');
        assert.strictEqual(u.searchParams.get('utm_source'), 'mastodon');
        assert.strictEqual(u.searchParams.get('utm_medium'), 'social');
        assert.strictEqual(u.searchParams.get('utm_campaign'), 'c1');
        assert.strictEqual(u.searchParams.get('utm_content'), 'p1');
        console.log('✓ links');
    }

    // ---- contagem de caracteres como cada plataforma conta
    {
        assert.strictEqual(graphemes('a🎃b'), 3, 'emoji conta 1');
        assert.strictEqual(graphemes('👨‍👩‍👧'), 1, 'emoji composto conta 1');
        const p = goodPost();
        const mast = countedLength(p, 'mastodon', 'teste');
        assert.ok(compose(p, 'mastodon', 'teste').text.length > mast + 40, 'na Mastodon o link conta só 23');
        assert.ok(compose(p, 'bluesky', 'teste').text.includes('playfulhub.com.br/jogos/snake'), 'Bluesky mostra o link curto');
        assert.ok(!compose(p, 'bluesky', 'teste').text.includes('utm_'), 'link curto não carrega UTM visível');
        console.log('✓ composição de texto');
    }

    // ---- Guardião: texto
    {
        const bad = {
            url: 'veja https://exemplo.com agora mesmo neste jogo incrível de verdade',
            mention: 'olha só o que o @fulano disse sobre esse jogo bem divertido aqui',
            hashtag: 'um jogo muito divertido de cobrinha #jogos para o navegador',
            bait: 'Clique aqui para jogar essa cobrinha clássica que roda no navegador',
            caps: 'JOGUE AGORA ESSE JOGO INCRIVEL QUE RODA NO NAVEGADOR SEM INSTALAR',
            emoji: 'Jogo de cobrinha 🐍🐍🐍🐍 que roda no navegador sem instalar nada',
            claim: 'O melhor jogo do mundo de cobrinha, roda direto no navegador mesmo',
            short: 'Jogue agora',
            excl: 'Jogo de cobrinha que roda direto no navegador, sem instalar nada!!!'
        };
        for (const [k, t] of Object.entries(bad)) assert.ok(lintText(t).length > 0, `lint deveria reprovar: ${k}`);
        assert.deepStrictEqual(lintText(goodPost().text), [], 'texto bom passa');
        console.log('✓ Guardião: texto');
    }

    // ---- Guardião: post e calendário
    {
        const ok = (p) => validatePost(p, { games });
        assert.deepStrictEqual(ok(goodPost()), []);
        assert.ok(ok(goodPost({ at: '2026-10-14T19:00:00' })).length, 'data sem fuso reprova');
        assert.ok(ok(goodPost({ game: 'nao-existe' })).length, 'jogo inexistente reprova');
        assert.ok(ok(goodPost({ hashtags: ['a', 'b', 'c', 'd'] })).length, 'mais de 3 hashtags reprova');
        assert.ok(ok(goodPost({ hashtags: ['#errada'] })).length, 'hashtag com # reprova');
        assert.ok(ok(goodPost({ channels: ['orkut'] })).length, 'canal desconhecido reprova');
        assert.ok(ok(goodPost({ media: { image: 'assets/images/snake_preview.png' } })).length, 'mídia sem alt reprova');
        assert.ok(ok(goodPost({ media: { image: 'assets/images/nao_existe.png', alt: 'descrição suficientemente longa' } })).length, 'imagem inexistente reprova');
        assert.ok(ok(goodPost({ media: { clip: 'tomada-fantasma', alt: 'descrição suficientemente longa' } })).length, 'tomada inexistente reprova');
        assert.deepStrictEqual(ok(goodPost({ media: { clip: 'campo-de-abobora', game: 'tumbalacatumba', alt: 'descrição suficientemente longa' } })), [], 'clipe ainda não gravado passa no modo plan');
        // no modo publish o clipe gravado precisa existir E ter passado no controle de qualidade
        const clipPost = goodPost({ media: { clip: 'lago-lamentoso', game: 'tumbalacatumba', alt: 'descrição suficientemente longa' } });
        const clipBase = path.join(process.env.MARKETING_CLIPS_DIR, 'tumbalacatumba--lago-lamentoso');
        assert.ok(validatePost(clipPost, { games, mode: 'publish' }).some((m) => m.includes('não encontrado')), 'sem o clipe gravado: reprova');
        fs.writeFileSync(clipBase + '.mp4', Buffer.alloc(8)); fs.writeFileSync(clipBase + '.jpg', Buffer.alloc(8));
        assert.ok(validatePost(clipPost, { games, mode: 'publish' }).some((m) => m.includes('não encontrado')), 'sem o relatório de QC: reprova');
        fs.writeFileSync(clipBase + '.json', JSON.stringify({ ok: false, problems: ['x'] }));
        assert.ok(validatePost(clipPost, { games, mode: 'publish' }).some((m) => m.includes('reprovado')), 'relatório com ok:false: reprova');
        fs.writeFileSync(clipBase + '.json', JSON.stringify({ ok: true }));
        assert.deepStrictEqual(validatePost(clipPost, { games, mode: 'publish' }), [], 'clipe gravado e aprovado passa');
        const long = goodPost({ text: 'Jogo muito divertido de cobrinha. '.repeat(10).trim() });
        assert.ok(ok(long).some((m) => m.includes('bluesky')), 'texto acima do limite do Bluesky reprova');

        const a = goodPost({ id: 'cal-a' });
        const sameText = goodPost({ id: 'cal-b', at: '2026-10-16T19:00:00-03:00' });
        assert.ok(validateCalendar([a, sameText], { games }).some((m) => m.includes('idêntico')), 'texto repetido reprova');
        const close = goodPost({ id: 'cal-c', at: '2026-10-14T20:00:00-03:00', text: 'Outro texto diferente sobre o jogo da cobrinha, bem leve e divertido.' });
        assert.ok(validateCalendar([a, close], { games }).some((m) => m.includes('intervalo')), 'menos de 4 h de intervalo reprova');
        const day = ['2026-10-14T08:00:00-03:00', '2026-10-14T13:00:00-03:00', '2026-10-14T19:00:00-03:00'].map((at, i) => goodPost({ id: `cal-d${i}`, at, text: `Texto ${i} bem diferente sobre a cobrinha clássica no navegador, número ${i}.` }));
        assert.ok(validateCalendar(day, { games }).some((m) => m.includes('mais de 2 posts')), 'mais de 2 posts por dia reprova');
        assert.ok(validateCalendar([a, a], { games }).some((m) => m.includes('duplicado')), 'id repetido reprova');
        console.log('✓ Guardião: post e calendário');
    }

    // ---- calendários versionados: tudo que está no repositório precisa passar
    {
        const { posts, calendars } = loadCalendars();
        assert.ok(calendars.length >= 1 && posts.length >= 10, 'esperava ao menos um calendário com 10 posts');
        const problems = validateCalendar(posts, { games });
        assert.deepStrictEqual(problems, [], 'calendários do repositório reprovados:\n' + problems.join('\n'));
        assert.ok(posts.every((p) => p.media && p.media.alt), 'todo post do repositório tem mídia com alt');
        console.log(`✓ calendários do repositório (${posts.length} posts)`);
    }

    // ---- agenda
    {
        const posts = [goodPost({ id: 'ag-1', at: '2026-10-14T19:00:00-03:00' }), goodPost({ id: 'ag-2', at: '2026-10-10T19:00:00-03:00' }), goodPost({ id: 'ag-3', at: '2026-10-20T19:00:00-03:00' })];
        const ledger = { version: 1, posts: {} };
        const now = new Date('2026-10-14T20:00:00-03:00');
        let r = classify(posts, ledger, now);
        assert.deepStrictEqual(r.due.map((d) => d.post.id), ['ag-1']);
        assert.deepStrictEqual(r.expired.map((p) => p.id), ['ag-2'], 'passou de 36 h: vencido');
        assert.deepStrictEqual(r.future.map((p) => p.id), ['ag-3']);
        ledgerLib.record(ledger, 'ag-1', 'bluesky', { id: 'x' }, now);
        r = classify(posts, ledger, now);
        assert.deepStrictEqual(r.due[0].channels, ['mastodon', 'telegram'], 'canal já publicado não repete');
        ['mastodon', 'telegram'].forEach((c) => ledgerLib.record(ledger, 'ag-1', c, { id: 'y' }, now));
        assert.strictEqual(classify(posts, ledger, now).due.length, 0, 'tudo publicado: nada devido');
        console.log('✓ agenda');
    }

    // ---- ledger: ida e volta no disco, sem arquivo pela metade
    {
        const file = path.join(tmp, 'sub', 'ledger.json');
        assert.deepStrictEqual(ledgerLib.load(file), { version: 1, posts: {} }, 'sem arquivo: ledger vazio');
        const l = ledgerLib.load(file);
        ledgerLib.record(l, 'p', 'telegram', { id: '7', url: 'https://t.me/c/7' });
        ledgerLib.save(file, l);
        assert.ok(!fs.existsSync(file + '.tmp'), 'sem temporário sobrando');
        assert.strictEqual(ledgerLib.load(file).posts.p.telegram.id, '7');
        fs.writeFileSync(file, '{"version":2}');
        assert.throws(() => ledgerLib.load(file), /ledger inválido/);
        console.log('✓ ledger');
    }

    // ---- http: retenta falha transitória, não retenta erro de cliente
    {
        let n = 0;
        const flaky = async () => (++n < 3 ? new Response('erro', { status: 503 }) : new Response('{}', { status: 200 }));
        const res = await request(flaky, 'https://x.test/a', {}, { baseDelayMs: 1 });
        assert.strictEqual(res.status, 200);
        assert.strictEqual(n, 3, '2 falhas e 1 sucesso');
        n = 0;
        await assert.rejects(request(async () => { n++; return new Response('ruim', { status: 400 }); }, 'https://x.test/b', {}, { baseDelayMs: 1 }), (e) => e instanceof HttpError && e.status === 400);
        assert.strictEqual(n, 1, '4xx não repete');
        console.log('✓ http');
    }

    // ---- Bluesky: facets em BYTES UTF-8 (acentos e emoji antes do link deslocam os índices)
    {
        const text = 'Mansão 🎃 do Vale\n\nplayfulhub.com.br/jogos/tumbalacatumba\n\n#Halloween #JogosBR';
        const composed = { text, shown: 'playfulhub.com.br/jogos/tumbalacatumba', link: 'https://playfulhub.com.br/jogos/tumbalacatumba?utm_source=bluesky', tags: '#Halloween #JogosBR' };
        const facets = bluesky.buildFacets(text, composed);
        assert.strictEqual(facets.length, 3);
        const buf = Buffer.from(text, 'utf8');
        for (const f of facets) {
            const slice = buf.subarray(f.index.byteStart, f.index.byteEnd).toString('utf8');
            const feature = f.features[0];
            if (feature.$type.endsWith('#link')) assert.strictEqual(slice, composed.shown);
            else assert.strictEqual(slice, '#' + feature.tag);
        }
        assert.ok(Buffer.byteLength(text) > text.length, 'o texto de teste tem caracteres multibyte');

        const calls = [];
        const poster = path.join(tmp, 'poster.jpg');
        fs.writeFileSync(poster, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
        const fetchImpl = async (url, init) => {
            calls.push({ url, init });
            if (url.endsWith('createSession')) return jsonRes({ accessJwt: 'jwt', did: 'did:plc:abc', handle: 'playful.bsky.social' });
            if (url.endsWith('uploadBlob')) return jsonRes({ blob: { $type: 'blob', ref: { $link: 'bafk' }, mimeType: 'image/jpeg', size: 4 } });
            if (url.endsWith('createRecord')) return jsonRes({ uri: 'at://did:plc:abc/app.bsky.feed.post/3kabc', cid: 'c' });
            throw new Error('chamada inesperada ' + url);
        };
        const post = goodPost({ game: 'tumbalacatumba' });
        const res = await bluesky.publish({ post, composed: compose(post, 'bluesky', 'teste'), game: games.get('tumbalacatumba'), media: { poster } },
            { BLUESKY_HANDLE: 'playful.bsky.social', BLUESKY_APP_PASSWORD: 'app-pass' }, fetchImpl);
        assert.deepStrictEqual(calls.map((c) => c.url.split('/').pop()), ['com.atproto.server.createSession', 'com.atproto.repo.uploadBlob', 'com.atproto.repo.createRecord']);
        assert.strictEqual(calls[1].init.headers.authorization, 'Bearer jwt');
        const rec = JSON.parse(calls[2].init.body).record;
        assert.strictEqual(rec.embed.$type, 'app.bsky.embed.external');
        assert.ok(rec.embed.external.uri.includes('utm_source=bluesky'));
        assert.ok(rec.embed.external.thumb, 'card leva a imagem');
        assert.deepStrictEqual(rec.langs, ['pt']);
        assert.strictEqual(res.url, 'https://bsky.app/profile/playful.bsky.social/post/3kabc');
        assert.strictEqual(bluesky.isConfigured({}), false);
        console.log('✓ Bluesky');
    }

    // ---- Mastodon: upload assíncrono do vídeo (202 → 206 → 200), idempotência e texto
    {
        const calls = [];
        let polls = 0;
        const video = path.join(tmp, 'v.mp4');
        fs.writeFileSync(video, Buffer.alloc(64));
        const fetchImpl = async (url, init = {}) => {
            calls.push({ url, init });
            if (url.endsWith('/api/v2/media')) return jsonRes({ id: '55', url: null }, 202);
            if (url.endsWith('/api/v1/media/55')) return jsonRes({ id: '55' }, ++polls < 3 ? 206 : 200);
            if (url.endsWith('/api/v1/statuses')) return jsonRes({ id: '999', url: 'https://mastodon.example/@playful/999' });
            throw new Error('chamada inesperada ' + url);
        };
        const post = goodPost();
        const res = await mastodon.publish({ post, composed: compose(post, 'mastodon', 'teste'), media: { video, poster: null, alt: 'descrição do vídeo' } },
            { MASTODON_INSTANCE: 'https://mastodon.example/', MASTODON_ACCESS_TOKEN: 't' }, fetchImpl, { pollMs: 1 });
        assert.strictEqual(polls, 3, 'espera o processamento terminar');
        const upload = calls[0].init.body;
        assert.strictEqual(upload.get('description'), 'descrição do vídeo');
        const status = calls[calls.length - 1];
        assert.strictEqual(status.init.headers['idempotency-key'], 'teste-01-snake:mastodon');
        const body = JSON.parse(status.init.body);
        assert.deepStrictEqual(body.media_ids, ['55']);
        assert.strictEqual(body.language, 'pt');
        assert.ok(body.status.includes('utm_source=mastodon'));
        assert.strictEqual(res.url, 'https://mastodon.example/@playful/999');
        console.log('✓ Mastodon');
    }

    // ---- Telegram: vídeo com legenda HTML escapada e link com UTM
    {
        const video = path.join(tmp, 't.mp4');
        fs.writeFileSync(video, Buffer.alloc(32));
        let sent;
        const fetchImpl = async (url, init) => { sent = { url, form: init.body }; return jsonRes({ ok: true, result: { message_id: 42 } }); };
        const post = goodPost({ text: 'Cobrinha <b>clássica</b> & divertida, direto no navegador e sem instalar nada.' });
        const res = await telegram.publish({ post, composed: compose(post, 'telegram', 'teste'), media: { video, alt: 'x' } },
            { TELEGRAM_BOT_TOKEN: '123:abc', TELEGRAM_CHAT_ID: '@playfulhub' }, fetchImpl);
        assert.ok(sent.url.endsWith('/bot123:abc/sendVideo'));
        assert.strictEqual(sent.form.get('chat_id'), '@playfulhub');
        assert.strictEqual(sent.form.get('parse_mode'), 'HTML');
        const cap = sent.form.get('caption');
        assert.ok(cap.includes('&lt;b&gt;clássica&lt;/b&gt; &amp;'), 'HTML escapado');
        assert.ok(/<a href="https:\/\/playfulhub\.com\.br\/jogos\/snake\?[^"]*utm_source=telegram/.test(cap.replace(/&amp;/g, '&')), 'link com UTM');
        assert.strictEqual(res.url, 'https://t.me/playfulhub/42');
        await assert.rejects(telegram.publish({ post, composed: compose(post, 'telegram', 'teste'), media: null }, { TELEGRAM_BOT_TOKEN: 'x', TELEGRAM_CHAT_ID: '@c' },
            async () => jsonRes({ ok: false, description: 'chat not found' })), /chat not found/);
        console.log('✓ Telegram');
    }

    // ---- publicador de ponta a ponta (calendário temporário, canais simulados)
    {
        const dir = path.join(tmp, 'cal');
        fs.mkdirSync(dir);
        const write = (posts) => fs.writeFileSync(path.join(dir, 'c.json'), JSON.stringify({ campaign: 'teste', posts }));
        const posts = [
            goodPost({ id: 'e2e-01', at: '2026-10-14T19:00:00-03:00' }),
            goodPost({ id: 'e2e-02', at: '2026-10-16T19:00:00-03:00', text: 'Outro texto sobre a cobrinha clássica, agora para a sexta-feira, no navegador.' })
        ];
        write(posts);
        const ledgerFile = path.join(tmp, 'e2e-ledger.json');
        const sent = [];
        const mk = (name, { configured = true, fail = false } = {}) => ({
            name, isConfigured: () => configured,
            publish: async ({ post }) => { if (fail) throw new Error('falhou de propósito'); sent.push(`${post.id}:${name}`); return { id: `${name}-${post.id}`, url: `https://${name}.test/${post.id}` }; }
        });
        const channels = { bluesky: mk('bluesky'), mastodon: mk('mastodon', { configured: false }), telegram: mk('telegram', { fail: true }) };
        const base = { calendarDir: dir, ledgerFile, channels, games, log: quiet, env: {} };

        let r = await run({ ...base, now: new Date('2026-10-14T19:30:00-03:00') });
        assert.deepStrictEqual(sent, ['e2e-01:bluesky']);
        assert.strictEqual(r.skipped.length, 1, 'canal sem credenciais é ignorado');
        assert.strictEqual(r.failed.length, 1, 'falha em um canal é relatada');
        assert.strictEqual(ledgerLib.load(ledgerFile).posts['e2e-01'].bluesky.url, 'https://bluesky.test/e2e-01');

        r = await run({ ...base, now: new Date('2026-10-14T20:30:00-03:00') });
        assert.deepStrictEqual(sent, ['e2e-01:bluesky'], 'ledger impede repostar o que já foi publicado');
        assert.strictEqual(r.failed.length, 1, 'o canal que falhou é tentado de novo');

        channels.telegram = mk('telegram');
        channels.mastodon = mk('mastodon');
        r = await run({ ...base, now: new Date('2026-10-14T21:30:00-03:00') });
        assert.deepStrictEqual(sent.slice(1).sort(), ['e2e-01:mastodon', 'e2e-01:telegram'], 'canais corrigidos recuperam o post dentro da janela');

        r = await run({ ...base, now: new Date('2026-10-14T19:30:00-03:00'), dryRun: true });
        assert.strictEqual(sent.length, 3, 'dry-run não publica');

        r = await run({ ...base, now: new Date('2026-10-20T10:00:00-03:00') });
        assert.deepStrictEqual(r.expired, ['e2e-02'], 'passou da janela: vencido, não publicado');
        assert.strictEqual(sent.length, 3);

        const plan = await run({ ...base, now: new Date('2026-10-16T20:00:00-03:00'), planOnly: true });
        assert.deepStrictEqual(plan.due.map((d) => d.id), ['e2e-02']);

        r = await run({ ...base, now: new Date('2026-10-16T20:00:00-03:00'), env: { MARKETING_PAUSED: 'true' } });
        assert.strictEqual(r.paused, true, 'kill switch');
        assert.strictEqual(sent.length, 3);

        const baited = goodPost({ id: 'e2e-03', at: '2026-10-22T20:00:00-03:00', text: 'Clique aqui para jogar a cobrinha clássica que roda direto no navegador.' });
        assert.ok(validateCalendar([...posts, baited], { games }).some((m) => m.includes('isca')), 'o motivo da reprovação é a isca de engajamento');
        write([...posts, baited]);
        await assert.rejects(run({ ...base, now: new Date('2026-10-16T20:30:00-03:00') }), /Guardião reprovou/, 'calendário inválido: falha fechada');
        assert.strictEqual(sent.length, 3, 'nada publicado com calendário reprovado');

        // clipes necessários para os posts devidos
        const clipPost = goodPost({ id: 'clip-01', media: { clip: 'moinho-ao-por-do-sol', game: 'tumbalacatumba', alt: 'descrição suficientemente longa' } });
        const need = clipsNeeded([{ post: clipPost, channels: ['bluesky'] }]);
        assert.deepStrictEqual(need, [{ game: 'tumbalacatumba', shot: 'moinho-ao-por-do-sol' }], 'clipe não gravado é pedido ao Cineasta');
        console.log('✓ publicador de ponta a ponta');
    }


    // ---- review: relógio inválido, --now só em simulação
    {
        assert.throws(() => classify([], { version: 1, posts: {} }, new Date('14/10/2026 19:30')), /relógio inválido/);
        await assert.rejects(run({ calendarDir: path.join(M, 'calendar'), ledgerFile: path.join(tmp, 'x.json'), now: new Date('lixo'), games, log: quiet, env: {} }), /--now inválido/);
        const cli = spawnSync(process.execPath, [`${M}/publish.js`, '--now', '2026-10-14T19:30:00-03:00'], { encoding: 'utf8' });
        assert.strictEqual(cli.status, 2, '--now sem --dry-run/--plan/--check é recusado');
        assert.ok(/só pode ser usado/.test(cli.stderr));
        console.log('✓ --now: validação');
    }

    // ---- review: um post por canal por execução (sem despejar atraso acumulado)
    {
        const mkPost = (id, at, channels) => goodPost({ id, at, channels });
        const dueList = [
            { post: mkPost('a', '2026-10-14T19:00:00-03:00', ['bluesky', 'telegram']), channels: ['bluesky', 'telegram'] },
            { post: mkPost('b', '2026-10-15T19:00:00-03:00', ['bluesky']), channels: ['bluesky'] },
            { post: mkPost('c', '2026-10-16T19:00:00-03:00', ['bluesky', 'mastodon']), channels: ['bluesky', 'mastodon'] }
        ];
        const r = onePerChannel(dueList);
        assert.deepStrictEqual(r.due.map((d) => [d.post.id, d.channels]), [['a', ['telegram']], ['c', ['bluesky', 'mastodon']]]);
        assert.deepStrictEqual(r.superseded.map((x) => `${x.id}:${x.channel}`).sort(), ['a:bluesky', 'b:bluesky']);

        const dir = path.join(tmp, 'cal-backlog');
        fs.mkdirSync(dir);
        fs.writeFileSync(path.join(dir, 'c.json'), JSON.stringify({ campaign: 'teste', posts: [
            goodPost({ id: 'bk-1', at: '2026-10-14T19:00:00-03:00', channels: ['bluesky'] }),
            goodPost({ id: 'bk-2', at: '2026-10-15T09:00:00-03:00', channels: ['bluesky'], text: 'Outro texto bem diferente sobre a cobrinha clássica, no navegador, grátis.' })
        ] }));
        const sent = [];
        const channels = { bluesky: { name: 'bluesky', isConfigured: () => true, publish: async ({ post }) => { sent.push(post.id); return { id: post.id }; } }, mastodon: {}, telegram: {} };
        const res = await run({ calendarDir: dir, ledgerFile: path.join(tmp, 'bk-ledger.json'), channels, games, log: quiet, env: {}, now: new Date('2026-10-15T12:00:00-03:00') });
        assert.deepStrictEqual(sent, ['bk-2'], 'só o mais recente sai');
        assert.deepStrictEqual(res.superseded, [{ id: 'bk-1', channel: 'bluesky' }]);
        console.log('✓ um post por canal por execução');
    }

    // ---- review: ledger enviado ao remoto a cada publicação; falha ao registrar é fatal
    {
        const dir = path.join(tmp, 'cal-hook');
        fs.mkdirSync(dir);
        fs.writeFileSync(path.join(dir, 'c.json'), JSON.stringify({ campaign: 'teste', posts: [goodPost({ id: 'hk-1', at: '2026-10-14T19:00:00-03:00', channels: ['bluesky', 'mastodon', 'telegram'] })] }));
        const mk = (n) => ({ name: n, isConfigured: () => true, publish: async () => ({ id: n }) });
        const channels = { bluesky: mk('bluesky'), mastodon: mk('mastodon'), telegram: mk('telegram') };
        let pushes = 0;
        await run({ calendarDir: dir, ledgerFile: path.join(tmp, 'hk1.json'), channels, games, log: quiet, env: {}, now: new Date('2026-10-14T20:00:00-03:00'), afterPublish: async () => { pushes++; } });
        assert.strictEqual(pushes, 3, 'um envio do ledger por publicação');

        let calls = 0;
        const ledgerFile = path.join(tmp, 'hk2.json');
        await assert.rejects(run({ calendarDir: dir, ledgerFile, channels, games, log: quiet, env: {}, now: new Date('2026-10-14T20:00:00-03:00'), afterPublish: async () => { if (++calls === 2) throw new Error('push rejeitado'); } }), /push rejeitado/, 'envio do ledger falhou: o job para');
        assert.strictEqual(calls, 2, 'não segue publicando depois da falha');
        assert.ok(Object.keys(ledgerLib.load(ledgerFile).posts['hk-1']).length >= 2, 'o que já foi ao ar está no ledger local');
        console.log('✓ ledger a cada publicação');
    }

    // ---- review: token do Telegram não vaza; POST não idempotente não é repetido
    {
        const token = '123456789:AAHSECRETSECRETSECRET';
        assert.ok(!safePath(`https://api.telegram.org/bot${token}/sendMessage`).includes('SECRET'));
        assert.strictEqual(safePath(`https://api.telegram.org/bot${token}/sendMessage`), '/bot***/sendMessage');
        const post = goodPost();
        let n = 0;
        const bad = async () => { n++; return new Response('boom', { status: 400 }); };
        let err;
        try { await telegram.publish({ post, composed: compose(post, 'telegram', 'teste'), media: null }, { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: '@c' }, bad); } catch (e) { err = e; }
        assert.ok(err && !err.message.includes('SECRET'), 'mensagem de erro sem o token');

        n = 0;
        const flaky = async () => { n++; return new Response('bad gateway', { status: 502 }); };
        await assert.rejects(telegram.publish({ post, composed: compose(post, 'telegram', 'teste'), media: null }, { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: '@c' }, flaky));
        assert.strictEqual(n, 1, 'Telegram: 502 não repete o envio');

        const urls = [];
        const bskyFetch = async (url) => {
            urls.push(url.split('/').pop());
            if (url.endsWith('createSession')) return jsonRes({ accessJwt: 'j', did: 'did:plc:x', handle: 'h.bsky.social' });
            return new Response('bad gateway', { status: 502 });
        };
        await assert.rejects(bluesky.publish({ post, composed: compose(post, 'bluesky', 'teste'), game: games.get('snake'), media: null }, { BLUESKY_HANDLE: 'h', BLUESKY_APP_PASSWORD: 'p' }, bskyFetch));
        assert.strictEqual(urls.filter((u) => u === 'com.atproto.repo.createRecord').length, 1, 'Bluesky: 502 não repete o createRecord');

        let signal;
        await request(async (u, init) => { signal = init.signal; return new Response('{}', { status: 200 }); }, 'https://x.test/t', {}, {});
        assert.ok(signal, 'toda requisição leva timeout (AbortSignal)');
        assert.strictEqual(mastodon.isConfigured({ MASTODON_INSTANCE: 'http://m.example', MASTODON_ACCESS_TOKEN: 't' }), false, 'Mastodon exige https');
        console.log('✓ token, retentativa e timeout');
    }

    // ---- review: Guardião mais estrito
    {
        const ok = (p) => validatePost(p, { games });
        for (const at of ['2026-02-30T10:00:00-03:00', '2026-10-14T24:00:00Z', '2026-13-01T10:00:00Z', '2026-10-14 19:00:00-03:00', '2026-10-14T19:00:00']) assert.ok(ok(goodPost({ at })).length, `data inválida deveria reprovar: ${at}`);
        assert.deepStrictEqual(ok(goodPost({ at: '2026-10-14T19:00:00Z' })), []);
        assert.deepStrictEqual(ok(goodPost({ at: '2026-10-14T19:00-03:00' })), [], 'sem segundos é válido');
        assert.ok(ok(goodPost({ campaign: undefined })).length, 'campanha ausente reprova (evita utm_campaign=undefined)');

        const alt = 'descrição suficientemente longa';
        assert.ok(ok(goodPost({ media: { image: 'package.json', alt } })).length, 'package.json fora de assets/ reprova');
        assert.ok(ok(goodPost({ media: { video: 'tests/smoke.test.js', alt } })).length, 'qualquer arquivo fora de assets/ reprova');
        assert.ok(ok(goodPost({ media: { image: 'assets/../package.json', alt } })).length, 'caminho com .. reprova');
        assert.ok(ok(goodPost({ media: { image: 'assets/images/snake_preview.png', alt } })).length === 0, 'imagem de assets/ passa');
        assert.ok(ok(goodPost({ media: { clip: 'constructor', game: 'tumbalacatumba', alt } })).length, 'tomada "constructor" não existe');
        assert.ok(ok(goodPost({ media: { clip: 'mansao-ao-anoitecer', game: '../../x', alt } })).length, 'game com caminho reprova');
        assert.strictEqual(insideAssets(path.resolve(__dirname, '../assets/images/snake_preview.png')), true);
        assert.strictEqual(insideAssets(path.resolve(__dirname, '../assets/notas.txt')), false, 'extensão não permitida');

        assert.deepStrictEqual(lintText('Para o número 12 da lista, o jogo roda direto no navegador, sem instalar nada.'), [], 'número 12 não é "número 1"');
        assert.ok(lintText('O número 1 dos jogos de cobrinha, direto no navegador e sem instalar nada.').length, 'número 1 reprova');
        assert.deepStrictEqual(lintText('Um jogo feito com C# e três.js, roda no navegador sem instalar nada aqui.'), [], 'C# no meio do texto não é hashtag');
        assert.ok(lintText('Jogue em foo.com agora mesmo, roda direto no navegador sem instalar nada.').length, 'domínio sem http reprova');
        assert.ok(lintText('Jogo brasileiro 🇧🇷🇧🇷🇧🇷🇧🇷 que roda direto no navegador sem instalar nada.').length, 'bandeiras contam como emoji');
        console.log('✓ Guardião estrito');
    }

    // ---- review: Bluesky, hashtag que é prefixo de outra; calendário malformado
    {
        const text = 'texto\n\nplayfulhub.com.br/jogos/snake\n\n#JogosBR #Jogos';
        const composed = { text, shown: 'playfulhub.com.br/jogos/snake', link: 'https://x/', tags: '#Jogos #JogosBR' };
        const f = bluesky.buildFacets(text, composed);
        const buf = Buffer.from(text);
        const tagsFound = f.filter((x) => x.features[0].tag).map((x) => buf.subarray(x.index.byteStart, x.index.byteEnd).toString());
        assert.deepStrictEqual(tagsFound.sort(), ['#Jogos', '#JogosBR'], '#Jogos não casa dentro de #JogosBR');
        const bad = path.join(tmp, 'cal-bad');
        fs.mkdirSync(bad);
        fs.writeFileSync(path.join(bad, 'x.json'), JSON.stringify({ campaign: 'c1', psots: [] }));
        assert.throws(() => loadCalendars(bad), /"posts" precisa ser uma lista/);
        console.log('✓ facets e calendário malformado');
    }

    // ---- review: ledger.sh contra um remoto git local (precisa de bash e git 2.42+)
    {
        const have = (cmd) => spawnSync(cmd, ['--version'], { encoding: 'utf8' }).status === 0;
        const gitVer = (spawnSync('git', ['--version'], { encoding: 'utf8' }).stdout.match(/(\d+)\.(\d+)/) || []).slice(1).map(Number);
        if (!have('bash') || !have('git') || gitVer[0] < 2 || (gitVer[0] === 2 && gitVer[1] < 42)) {
            console.log('⏭ ledger.sh: pulado (sem bash ou git 2.42+)');
        } else {
            const script = path.join(M, 'scripts/ledger.sh');
            const git = (cwd, ...args) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, encoding: 'utf8' });
            const sh = (cwd, mode) => spawnSync('bash', [script, mode], { cwd, encoding: 'utf8' });
            const origin = path.join(tmp, 'origin.git');
            git(tmp, 'init', '-q', '--bare', origin);
            const w1 = path.join(tmp, 'w1');
            git(tmp, 'clone', '-q', origin, w1);
            git(w1, 'commit', '-q', '--allow-empty', '-m', 'init');
            git(w1, 'push', '-q', 'origin', 'HEAD:main');

            // 1) remoto sem a branch: cria a órfã com ledger vazio
            assert.strictEqual(sh(w1, 'checkout').status, 0);
            assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(w1, '.ledger/ledger.json'), 'utf8')), { version: 1, posts: {} });
            fs.writeFileSync(path.join(w1, '.ledger/ledger.json'), JSON.stringify({ version: 1, posts: { p1: { bluesky: { id: '1' } } } }));
            assert.strictEqual(sh(w1, 'commit').status, 0);
            assert.ok(git(origin, 'branch', '--list', 'marketing-ledger').stdout.includes('marketing-ledger'));
            assert.strictEqual(sh(w1, 'commit').status, 0, 'sem mudança: ok e sem commit novo');

            // 2) branch existente: o checkout traz o ledger de volta
            const w2 = path.join(tmp, 'w2');
            git(tmp, 'clone', '-q', origin, w2);
            assert.strictEqual(sh(w2, 'checkout').status, 0);
            assert.ok(fs.readFileSync(path.join(w2, '.ledger/ledger.json'), 'utf8').includes('"p1"'), 'ledger existente restaurado');

            // 3) o caso do review: remoto inacessível NÃO pode virar um ledger vazio
            const w3 = path.join(tmp, 'w3');
            git(tmp, 'clone', '-q', origin, w3);
            git(w3, 'remote', 'set-url', 'origin', path.join(tmp, 'nao-existe.git'));
            const r3 = sh(w3, 'checkout');
            assert.notStrictEqual(r3.status, 0, 'remoto inacessível: aborta');
            assert.ok(!fs.existsSync(path.join(w3, '.ledger')), 'e não cria ledger vazio');

            // 4) push rejeitado falha alto (outro ledger gravou antes) em vez de divergir
            fs.writeFileSync(path.join(w2, '.ledger/ledger.json'), JSON.stringify({ version: 1, posts: { p2: {} } }));
            assert.strictEqual(sh(w2, 'commit').status, 0);
            fs.writeFileSync(path.join(w1, '.ledger/ledger.json'), JSON.stringify({ version: 1, posts: { p3: {} } }));
            assert.notStrictEqual(sh(w1, 'commit').status, 0, 'push rejeitado: o script falha');
            console.log('✓ ledger.sh');
        }
    }

    fs.rmSync(tmp, { recursive: true, force: true });
    console.log('\nMarketing: todos os testes passaram');
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
