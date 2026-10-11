// Post diário automático do Desafio do Dia. Não há arquivo de calendário: o post de cada dia é derivado das mesmas
// regras que a página /desafio/ usa (assets/js/desafio-core.js), então o jogo anunciado é sempre o jogo do dia.
//
// Os posts passam pelo Guardião como quaisquer outros. Para nunca bloquear a divulgação por causa de um conflito
// de horário, um post diário que violaria a frequência por canal (2 por dia, 4 h de intervalo) com os posts que já
// existem é simplesmente pulado naquele dia (o calendário editorial tem prioridade).
const path = require('path');
const cfg = require('../config');
const desafio = require(path.join(cfg.ROOT, 'assets/js/desafio-core.js'));

const CAMPAIGN = 'desafio-do-dia';
const HOUR_BRT = '09:00:00'; // manhã: o desafio vale o dia inteiro
const HASHTAGS = ['DesafioDoDia', 'JogosBR'];

// Se a imagem de prévia de um jogo for grande demais para o card do Bluesky (limite ~950 KB), use uma versão menor.
const IMAGE_OVERRIDES = { pinball: 'assets/images/pinball_preview_card.jpg' };

// Variações de texto (rodam por dia). Regras: só o que é verdade, sem URL/@/hashtag (o publicador monta o link com
// UTM e as hashtags), sem pedir curtida nem compartilhamento. {n} = edição, {jogo} = nome, {emoji}, {total} = nº de jogos.
const TEMPLATES = [
    'Desafio do Dia #{n}: hoje o jogo é {jogo}. Faça o maior placar que conseguir e mantenha sua sequência de dias. Grátis, direto no navegador.',
    'Bom dia! O desafio #{n} já está no ar: {jogo}. Quantos pontos você faz hoje?',
    'Hoje é dia de {jogo}. O Desafio do Dia #{n} vale até a meia-noite, no horário de Brasília. Sem instalar nada.',
    '{emoji} {jogo} é o desafio de hoje (#{n}). Sem cadastro: abra, jogue e veja até onde você chega.',
    'Um jogo por dia, o mesmo para todo mundo. Hoje, no Desafio #{n}: {jogo}.',
    'Já jogou hoje? O Desafio do Dia #{n} é {jogo}. O seu melhor placar fica salvo no seu navegador.',
    'Sua sequência continua se você jogar hoje: Desafio #{n}, {jogo}. Só o seu melhor placar do dia conta.',
    'Desafio #{n} no PlayfulHub: {jogo}. Vale o maior placar do dia. Quanto você faz?',
    'Pausa pro café? O desafio de hoje (#{n}) é {jogo}, e dura o tempo que você quiser.',
    'Amanhã o jogo muda, então aproveite: hoje é {jogo} no Desafio do Dia #{n}.',
    '{jogo} é o jogo de hoje. Desafio do Dia #{n}: faça o seu melhor placar e compare com quem você quiser.',
    'Nada de instalar nada: o Desafio #{n} abre direto no navegador. Hoje: {jogo}.',
    'Até onde você vai no {jogo}? É o Desafio do Dia #{n}.',
    'Desafio do Dia #{n}: {jogo}. Jogue uma vez ou dez, vale o seu melhor placar.',
    '{emoji} Hoje no PlayfulHub: {jogo}. É o Desafio do Dia #{n}, um jogo diferente a cada dia.',
    'Começar o dia com um desafio rápido? O de hoje (#{n}) é {jogo}.',
    'O Desafio #{n} já começou: {jogo}. A sequência de dias só cresce se você jogar no próprio dia.',
    'Hoje o rodízio caiu em {jogo}. Desafio do Dia #{n}: faça o seu melhor placar.',
    'Mais um dia, mais um jogo: Desafio do Dia #{n}, {jogo}. Sem cadastro e sem ranking, só você contra o seu recorde.',
    '{jogo} é o desafio de hoje (#{n}). Tente superar o seu melhor placar.',
    'Desafio do Dia #{n}: {jogo}. São {total} jogos em rodízio, um por dia, sempre grátis.',
    'Hoje é {jogo}! Desafio #{n}: abra o jogo, faça os seus pontos e veja o resultado no fim.',
    'Quem joga todo dia mantém a sequência. Hoje: {jogo} (Desafio do Dia #{n}).',
    'O desafio #{n} é {jogo}. O jogo é o mesmo para todo mundo hoje; o placar é só seu.'
];

const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k]));

/** o post do Desafio do Dia de uma data (YYYY-MM-DD, Brasília). Antes do lançamento não há post. */
function dailyPostFor(date) {
    const c = desafio.challengeFor(date);
    if (c.edition < 1) return null;
    const g = c.game;
    const vars = { n: c.edition, jogo: g.name, emoji: g.emoji, total: desafio.GAMES.length };
    const tpl = TEMPLATES[(c.edition - 1) % TEMPLATES.length];
    return {
        id: `desafio-${date}`,
        at: `${date}T${HOUR_BRT}-03:00`,
        game: g.slug,
        campaign: CAMPAIGN,
        text: fill(tpl, vars),
        hashtags: [...HASHTAGS],
        channels: [...cfg.CHANNELS],
        // o clique leva à página do desafio (que abre o jogo do dia), não à página de informações do jogo
        link: {
            path: '/desafio/',
            title: `Desafio do Dia #${c.edition}: ${g.name}`,
            description: 'Todo dia um jogo diferente do PlayfulHub. Faça o maior placar, compartilhe e mantenha a sequência de dias.',
            cta: 'Jogar o desafio de hoje'
        },
        media: {
            image: IMAGE_OVERRIDES[g.slug] || g.image.slice(1),
            alt: `Prévia do jogo ${g.name}, o jogo de hoje no Desafio do Dia do PlayfulHub.`
        },
        generated: 'daily'
    };
}

const brtDay = (iso) => new Date(Date.parse(iso) - 3 * 36e5).toISOString().slice(0, 10);

/** o post diário violaria a frequência por canal com os posts já existentes? */
function conflicts(post, existing) {
    const at = Date.parse(post.at);
    const day = brtDay(post.at);
    for (const ch of post.channels) {
        const mine = existing.filter((p) => p.channels.includes(ch));
        if (mine.filter((p) => brtDay(p.at) === day).length >= cfg.MAX_POSTS_PER_DAY_PER_CHANNEL) return true;
        if (mine.some((p) => Math.abs(Date.parse(p.at) - at) / 36e5 < cfg.MIN_HOURS_BETWEEN_POSTS_PER_CHANNEL)) return true;
    }
    return false;
}

/**
 * Posts diários de `from` a `to` (datas YYYY-MM-DD), pulando os dias em que o calendário editorial já ocupa a
 * frequência permitida. `existing` = posts do calendário (e nada mais).
 */
function dailyPosts({ from, to, existing = [] }) {
    const out = [];
    for (let d = from; d <= to; d = desafio.addDays(d, 1)) {
        const post = dailyPostFor(d);
        if (!post) continue;
        if (conflicts(post, [...existing, ...out])) continue;
        out.push(post);
    }
    return out;
}

/** janela usada na hora de publicar: ontem, hoje e amanhã (em Brasília) bastam para o que está devido */
function dailyWindow(now) {
    const today = desafio.brtDate(now);
    return { from: desafio.addDays(today, -2), to: desafio.addDays(today, 2) };
}

module.exports = { dailyPostFor, dailyPosts, dailyWindow, TEMPLATES, CAMPAIGN, HOUR_BRT, IMAGE_OVERRIDES, conflicts };
