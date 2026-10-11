/*
 * Overlay do Desafio do Dia, carregado pelos jogos que participam (veja GAMES em desafio-core.js).
 *
 * Fica INATIVO a menos que a URL tenha ?desafio=YYYY-MM-DD e que aquele seja o jogo do dia dessa data
 * (e a data seja recente e já tenha começado). Fora disso não faz nada: não toca no jogo, não cria elemento
 * nenhum. Quando ativo, só LÊ a pontuação do elemento do placar, guarda o melhor do dia no localStorage e mostra
 * uma pílula pequena com o botão de compartilhar. Nunca altera a lógica do jogo.
 */
(function () {
    'use strict';
    var core = window.PHDesafio;
    if (!core) return;

    var params;
    try { params = new URLSearchParams(location.search); } catch (e) { return; }
    var date = params.get('desafio');
    if (!date || !core.acceptsDate(date)) return;
    var slug = core.slugFromPath(location.pathname);
    if (!slug) return;
    var challenge = core.challengeFor(date);
    var openedAt = new Date(); // o dia vale pela hora em que a partida começou, mesmo que vire a meia-noite jogando
    if (challenge.game.slug !== slug) return;

    var game = challenge.game;
    var store = null;
    try { store = window.localStorage; } catch (e) { /* sem armazenamento: o overlay funciona, mas não lembra */ }
    var state = core.loadState(store);
    var saved = state.days[date];
    var best = saved && saved.slug === slug ? saved.best : 0;

    function track(name) {
        try {
            (window.dataLayer = window.dataLayer || []).push({ event: name, game_slug: slug, desafio_data: date });
        } catch (e) { /* analytics nunca pode atrapalhar o jogo */ }
    }

    // ---- interface (Shadow DOM: o CSS do jogo não vaza para cá nem o nosso para o jogo)
    var host = document.createElement('div');
    host.setAttribute('data-desafio', '');
    var root = host.attachShadow({ mode: 'open' });
    root.innerHTML =
        '<style>' +
        ':host{all:initial}' +
        '*{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
        '.wrap{position:fixed;left:50%;bottom:10px;transform:translateX(-50%);z-index:2147483000;display:flex;gap:8px;align-items:center;' +
        'background:rgba(18,12,36,.92);color:#fff4dc;border:1px solid rgba(255,154,60,.7);border-radius:999px;padding:6px 8px 6px 14px;' +
        'font-size:13px;line-height:1;box-shadow:0 4px 18px rgba(0,0,0,.45);max-width:calc(100vw - 16px);white-space:nowrap}' +
        '.wrap[hidden],.mini[hidden]{display:none}' +
        // a etiqueta encolhe (com reticências) antes de a pílula passar da tela; botões e placar nunca encolhem
        '.tag{font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis}' +
        '.best b{color:#ff9a3c;font-variant-numeric:tabular-nums}' +
        'button,a.link{all:unset;cursor:pointer;border-radius:999px;padding:7px 11px;background:#ff9a3c;color:#1b0e2e;font-weight:700;font-size:12px}' +
        'a.link{background:transparent;color:#fff4dc;text-decoration:underline;font-weight:500}' +
        // depois do all:unset (mesma especificidade: o que vem por último vence); placar e botões nunca encolhem
        '.best,button,a.link{flex:none}' +
        'button.x{background:transparent;color:#fff4dc;padding:4px 8px;font-size:16px}' +
        'button:focus-visible,a.link:focus-visible{outline:2px solid #fff4dc;outline-offset:2px}' +
        '.mini{position:fixed;left:10px;bottom:10px;z-index:2147483000;min-width:36px;height:30px;padding:0 10px;text-align:center;line-height:30px;' +
        'background:rgba(18,12,36,.85);color:#fff4dc;border:1px solid rgba(255,154,60,.7);font-size:13px;font-weight:600;white-space:nowrap}' +
        '.mini b{color:#ff9a3c;font-variant-numeric:tabular-nums}' +
        '@media (max-width:520px){a.link{display:none}.tag{font-size:12px}}' +
        '</style>' +
        '<div class="wrap" role="group" aria-label="Desafio do Dia">' +
        '<span class="tag"></span><span class="best">Melhor: <b>0</b></span>' +
        '<button class="share" type="button">Compartilhar</button>' +
        '<a class="link" href="/desafio/">Desafio</a>' +
        '<button class="x" type="button" aria-label="Minimizar o Desafio do Dia">×</button></div>' +
        '<button class="mini" type="button" aria-label="Abrir o Desafio do Dia" hidden>🎯 <b></b></button>';
    var $ = function (s) { return root.querySelector(s); };
    $('.tag').textContent = '🎯 Desafio do Dia · ' + core.formatDM(date);
    var bestEl = $('.best b');
    var miniBest = $('.mini b');
    var shareBtn = $('.share');
    var wrap = $('.wrap');
    var mini = $('.mini');

    function render() {
        bestEl.textContent = String(best);
        miniBest.textContent = String(best);
        shareBtn.style.opacity = best > 0 ? '1' : '.55';
    }
    render();

    // clicar não pode deixar o foco em um botão: Espaço/Enter do jogo apertariam o botão de novo
    function release(el) { el.addEventListener('mouseup', function () { el.blur(); }); }
    [shareBtn, $('.x'), mini].forEach(release);

    // A pílula completa aparece por alguns segundos e depois vira um botão compacto no canto, para não cobrir
    // textos do jogo (cada jogo tem uma interface diferente). Clicar no botão compacto abre a pílula de novo.
    // window.PHDesafioConfig.collapseMs existe para os testes (0 = nunca recolhe sozinho).
    var cfg = window.PHDesafioConfig || {};
    var collapseMs = typeof cfg.collapseMs === 'number' ? cfg.collapseMs : 5000;
    var collapseTimer = null;
    function collapse() { wrap.hidden = true; mini.hidden = false; }
    function expand() {
        wrap.hidden = false; mini.hidden = true;
        clearTimeout(collapseTimer);
        if (collapseMs > 0) collapseTimer = setTimeout(collapse, collapseMs * 3); // aberta de propósito: fica mais tempo
    }
    $('.x').addEventListener('click', function () { clearTimeout(collapseTimer); collapse(); });
    mini.addEventListener('click', expand);
    wrap.addEventListener('mouseenter', function () { clearTimeout(collapseTimer); });
    wrap.addEventListener('mouseleave', function () { if (collapseMs > 0) collapseTimer = setTimeout(collapse, collapseMs); });

    var flashTimer = null;
    function flash(msg) {
        // rótulo fixo (e não "o texto de agora"): dois cliques seguidos não podem guardar a mensagem como se fosse o rótulo
        clearTimeout(flashTimer);
        shareBtn.textContent = msg;
        flashTimer = setTimeout(function () { shareBtn.textContent = 'Compartilhar'; }, 1800);
    }

    function copyFallback(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { /* sem cópia */ }
        ta.remove();
        return ok;
    }

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () { flash('Copiado!'); }, function () { flash(copyFallback(text) ? 'Copiado!' : 'Não consegui copiar'); });
        } else {
            flash(copyFallback(text) ? 'Copiado!' : 'Não consegui copiar');
        }
    }

    shareBtn.addEventListener('click', function () {
        if (best <= 0) { flash('Jogue primeiro'); return; }
        var text = core.shareText(challenge, best, core.streak(state, date));
        track('desafio_share');
        if (navigator.share) {
            navigator.share({ text: text }).catch(function (e) {
                if (e && e.name === 'AbortError') return; // a pessoa cancelou
                copyText(text);
            });
        } else {
            copyText(text);
        }
    });

    // ---- leitura da pontuação (só leitura: nada no jogo é alterado)
    function read() {
        var el = document.querySelector(game.scoreSelector);
        var n = el ? core.parseScore(el.textContent) : null;
        if (n != null && n > best) {
            best = n;
            if (store) state = core.loadState(store); // outra aba pode ter gravado desde a última vez
            core.record(state, date, slug, best, openedAt);
            core.saveState(store, state);
            render();
        }
    }

    function start() {
        document.body.appendChild(host);
        track('desafio_view');
        if (collapseMs > 0) collapseTimer = setTimeout(collapse, collapseMs);
        read();
        // o jogo pode trocar o elemento do placar; consulta periódica é barata e à prova disso
        setInterval(read, 700);
        var el = document.querySelector(game.scoreSelector);
        if (el && window.MutationObserver) new MutationObserver(read).observe(el, { childList: true, characterData: true, subtree: true });
    }

    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start);
})();
