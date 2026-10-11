/*
 * Desafio do Dia: regras compartilhadas pela página /desafio/, pelo overlay dos jogos (desafio.js), pela home
 * e pelo publicador de divulgação (marketing/). Sem dependências; roda no navegador (window.PHDesafio) e no Node.
 *
 * Regra do desafio: todo dia (data de Brasília) um jogo da lista abaixo é o "jogo do dia", em rodízio fixo.
 * O jogador faz o maior placar que conseguir e compartilha. Os placares ficam só no navegador de quem jogou
 * (localStorage); não há servidor, ranking nem verificação: é um desafio de honra e de sequência de dias.
 *
 * Para entrar na lista, o jogo precisa ter um elemento com a pontuação numérica visível (scoreSelector).
 * Ao renomear esse elemento num jogo, atualize aqui.
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.PHDesafio = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    var SITE = 'https://playfulhub.com.br';
    var STORAGE_KEY = 'ph-desafio-v1';
    var BRT_OFFSET_MS = -3 * 3600 * 1000; // Brasília (sem horário de verão desde 2019)
    var DAY_MS = 86400000;
    var LAUNCH = '2026-10-12'; // edição nº 1
    // A sequência é calculada a partir dos dias guardados: podar abaixo do comprimento da sequência a truncaria.
    // ~13 meses de histórico, ocupando poucos KB no localStorage.
    var KEEP_DAYS = 400;
    var MAX_SCORE = 1e12; // acima disso o placar não é plausível (e viraria notação científica no texto)

    // Ordem fixa: cada jogo volta a cada GAMES.length dias. Mexer na ordem muda o jogo de todos os dias futuros.
    var GAMES = [
        { slug: 'snake', name: 'Snake Game', emoji: '🐍', play: '/snake/', info: '/jogos/snake', image: '/assets/images/snake_preview.png', scoreSelector: '#score' },
        { slug: 'block_stacker', name: 'Block Stacker', emoji: '🧱', play: '/block_stacker/', info: '/jogos/block_stacker', image: '/assets/images/block_stacker_preview.png', scoreSelector: '#score' },
        { slug: 'space_shooter', name: 'Space Shooter', emoji: '🚀', play: '/space_shooter/', info: '/jogos/space_shooter', image: '/assets/images/space_shooter_preview.png', scoreSelector: '#score' },
        { slug: 'archer', name: 'The Archer', emoji: '🏹', play: '/archer/', info: '/jogos/archer', image: '/assets/images/archer_preview.png', scoreSelector: '#score' },
        { slug: 'pinball', name: 'Pinball', emoji: '🎱', play: '/pinball/', info: '/jogos/pinball', image: '/assets/images/pinball_preview.png', scoreSelector: '#score' }
    ];

    /** 'YYYY-MM-DD' em Brasília */
    function brtDate(now) {
        return new Date((now || new Date()).getTime() + BRT_OFFSET_MS).toISOString().slice(0, 10);
    }

    /** data real no formato YYYY-MM-DD (rejeita 2026-02-30, que o JavaScript "corrigiria" para março) */
    function isDate(s) {
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
        if (!m) return false;
        var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
        return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
    }

    function dayNumber(date) {
        var p = date.split('-');
        return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / DAY_MS);
    }

    function addDays(date, n) {
        return new Date((dayNumber(date) + n) * DAY_MS).toISOString().slice(0, 10);
    }

    /** o desafio de uma data: { date, edition, game } */
    function challengeFor(date) {
        if (!isDate(date)) throw new Error('data inválida: ' + date);
        var n = dayNumber(date);
        var i = ((n % GAMES.length) + GAMES.length) % GAMES.length;
        return { date: date, edition: n - dayNumber(LAUNCH) + 1, game: GAMES[i] };
    }

    function gameBySlug(slug) {
        for (var i = 0; i < GAMES.length; i++) if (GAMES[i].slug === slug) return GAMES[i];
        return null;
    }

    /** slug do jogo a partir do caminho da página (/snake, /snake/, /snake/index.html) */
    function slugFromPath(pathname) {
        var seg = String(pathname || '').split('/')[1] || '';
        return gameBySlug(seg) ? seg : null;
    }

    /** o overlay só registra placar de uma data recente e que já começou (não vale data futura) */
    function acceptsDate(date, now, maxAgeDays) {
        if (!isDate(date)) return false;
        var today = brtDate(now);
        var age = dayNumber(today) - dayNumber(date);
        return age >= 0 && age <= (maxAgeDays == null ? 14 : maxAgeDays);
    }

    /** milissegundos até a próxima meia-noite de Brasília */
    function msUntilNext(now) {
        now = now || new Date();
        var next = (dayNumber(brtDate(now)) + 1) * DAY_MS - BRT_OFFSET_MS;
        return next - now.getTime();
    }

    /** 'Score: 1.250' → 1250. Só números inteiros; ponto/vírgula seguidos de 3 dígitos são milhar. */
    function parseScore(text) {
        var m = /\d+(?:[.,]\d{3})*/.exec(String(text || ''));
        if (!m) return null;
        var n = parseInt(m[0].replace(/[.,]/g, ''), 10);
        return isFinite(n) && n <= MAX_SCORE ? n : null;
    }

    /** { days: { 'YYYY-MM-DD': { slug, best } } } */
    function emptyState() { return { version: 1, days: {} }; }

    /**
     * Só aceita o que o próprio módulo grava: chaves de data reais, jogo do rodízio e placar numérico finito.
     * O localStorage é editável (e pode estar corrompido); lixo nele nunca pode derrubar a página nem apagar
     * dados válidos na poda.
     */
    function sanitize(s) {
        var out = emptyState();
        if (!s || s.version !== 1 || !s.days || typeof s.days !== 'object' || Array.isArray(s.days)) return out;
        Object.keys(s.days).forEach(function (k) {
            var v = s.days[k];
            if (isDate(k) && v && typeof v.slug === 'string' && gameBySlug(v.slug) && typeof v.best === 'number' && isFinite(v.best) && v.best >= 0 && v.best <= MAX_SCORE) {
                out.days[k] = { slug: v.slug, best: Math.floor(v.best), live: v.live === true };
            }
        });
        return out;
    }

    function loadState(storage) {
        try {
            var raw = storage && storage.getItem(STORAGE_KEY);
            return sanitize(raw ? JSON.parse(raw) : null);
        } catch (e) { return emptyState(); /* localStorage indisponível ou corrompido: começa do zero */ }
    }

    function saveState(storage, state) {
        try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
    }

    /**
     * registra um placar; só guarda se for o melhor do dia. `live` = foi jogado no próprio dia do desafio
     * (e não numa repetição de um dia passado): só dias "live" contam para a sequência.
     */
    function record(state, date, slug, score, now) {
        // placar inválido (NaN, negativo, absurdo) nunca é gravado
        score = Math.floor(score);
        if (!(score >= 0 && score <= MAX_SCORE)) return { state: state, improved: false };
        // antes do lançamento (edição < 1) tudo é treino: não conta para a sequência
        var live = date === brtDate(now) && date >= LAUNCH;
        var cur = state.days[date];
        var improved = !cur || cur.slug !== slug || score > cur.best;
        if (improved) state.days[date] = { slug: slug, best: score, live: live || Boolean(cur && cur.slug === slug && cur.live) };
        var dates = Object.keys(state.days).sort();
        while (dates.length > KEEP_DAYS) delete state.days[dates.shift()];
        return { state: state, improved: improved };
    }

    /** dias seguidos jogando no próprio dia, terminando hoje (ou ontem, se hoje ainda não jogou: a sequência não quebra até o dia acabar) */
    function streak(state, today) {
        var d = state.days[today] && state.days[today].live ? today : addDays(today, -1);
        var n = 0;
        while (state.days[d] && state.days[d].live) { n++; d = addDays(d, -1); }
        return n;
    }

    function formatDM(date) { return date.slice(8, 10) + '/' + date.slice(5, 7); }

    function url(path, content) {
        return SITE + path + '?utm_source=share&utm_medium=desafio&utm_campaign=desafio-do-dia' + (content ? '&utm_content=' + content : '');
    }

    /** texto compartilhável (sem spoiler: só o placar) */
    function shareText(c, best, streakDays) {
        var lines = [
            'PlayfulHub · Desafio do Dia' + (c.edition >= 1 ? ' #' + c.edition : '') + ' (' + formatDM(c.date) + ') 🎯',
            c.game.emoji + ' ' + c.game.name + ': ' + best + ' pontos'
        ];
        if (streakDays > 1) lines.push('🔥 ' + streakDays + ' dias seguidos');
        lines.push(url('/desafio/'));
        return lines.join('\n');
    }

    return {
        SITE: SITE, STORAGE_KEY: STORAGE_KEY, GAMES: GAMES, LAUNCH: LAUNCH,
        brtDate: brtDate, isDate: isDate, dayNumber: dayNumber, addDays: addDays, challengeFor: challengeFor,
        gameBySlug: gameBySlug, slugFromPath: slugFromPath, acceptsDate: acceptsDate, msUntilNext: msUntilNext,
        parseScore: parseScore, emptyState: emptyState, loadState: loadState, saveState: saveState, record: record,
        streak: streak, formatDM: formatDM, shareText: shareText, url: url
    };
});
