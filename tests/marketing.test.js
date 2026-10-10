// Divulgação automatizada: Cineasta (câmera e legendas), Guardião, agenda, ledger, canais (com fetch simulado)
// e o fluxo completo do publicador. Não usa rede, navegador nem ffmpeg.
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const M = path.resolve(__dirname, '../marketing');
const { sample, sampleVec, clamp01 } = require(`${M}/cineasta/lib/spline`);
const { frameState, captionAt } = require(`${M}/cineasta/record`);
const { postLink } = require(`${M}/lib/links`);
const { compose, countedLength, graphemes } = require(`${M}/lib/compose`);
const { lintText, validatePost, validateCalendar } = require(`${M}/lib/guard`);
const { classify } = require(`${M}/lib/schedule`);
const ledgerLib = require(`${M}/lib/ledger`);
const { request, HttpError } = require(`${M}/lib/http`);
const { loadCalendars, loadGames } = require(`${M}/lib/calendar`);
const bluesky = require(`${M}/channels/bluesky`);
const mastodon = require(`${M}/channels/mastodon`);
const telegram = require(`${M}/channels/telegram`);
const { run, clipsNeeded } = require(`${M}/publish`);

const games = loadGames();
const jsonRes = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mkt-'));
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
        // no modo publish o arquivo do clipe gravado precisa existir (confere nos dois sentidos, com ou sem gravação local)
        const clipPost = goodPost({ media: { clip: 'lago-lamentoso', game: 'tumbalacatumba', alt: 'descrição suficientemente longa' } });
        const rendered = fs.existsSync(path.join(M, 'out/clips/tumbalacatumba--lago-lamentoso.mp4')) && fs.existsSync(path.join(M, 'out/clips/tumbalacatumba--lago-lamentoso.jpg'));
        assert.strictEqual(validatePost(clipPost, { games, mode: 'publish' }).length === 0, rendered, 'modo publish exige o clipe gravado');
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

        write([...posts, goodPost({ id: 'e2e-03', at: '2026-10-16T20:00:00-03:00', text: 'Clique aqui para jogar a cobrinha clássica que roda direto no navegador.' })]);
        await assert.rejects(run({ ...base, now: new Date('2026-10-16T20:30:00-03:00') }), /Guardião reprovou/, 'calendário inválido: falha fechada');
        assert.strictEqual(sent.length, 3, 'nada publicado com calendário reprovado');

        // clipes necessários para os posts devidos
        const clipPost = goodPost({ id: 'clip-01', media: { clip: 'moinho-ao-por-do-sol', game: 'tumbalacatumba', alt: 'descrição suficientemente longa' } });
        const need = clipsNeeded([{ post: clipPost, channels: ['bluesky'] }]);
        const clipFile = path.join(M, 'out/clips/tumbalacatumba--moinho-ao-por-do-sol.mp4');
        assert.deepStrictEqual(need, fs.existsSync(clipFile) ? [] : [{ game: 'tumbalacatumba', shot: 'moinho-ao-por-do-sol' }]);
        console.log('✓ publicador de ponta a ponta');
    }

    fs.rmSync(tmp, { recursive: true, force: true });
    console.log('\nMarketing: todos os testes passaram');
})().catch((e) => {
    console.error(e);
    process.exit(1);
});
