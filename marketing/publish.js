#!/usr/bin/env node
/**
 * Publicador: lê os calendários, publica o que está na hora nos canais configurados e registra no ledger.
 *
 *   node marketing/publish.js              publica o que está devido
 *   node marketing/publish.js --dry-run    mostra o que seria publicado, sem chamar rede nem gravar o ledger
 *   node marketing/publish.js --plan       imprime em JSON o que está devido e quais clipes faltam gravar
 *   node marketing/publish.js --check      só valida os calendários (Guardião)
 * Opções: --now <ISO> (simula o relógio), --ledger <arquivo>
 *
 * Um canal sem credenciais é ignorado (e o post continua pendente para ele). MARKETING_PAUSED=true desliga tudo.
 * Falha fechada: calendário inválido → nada é publicado.
 */
const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const defaultChannels = require('./channels');
const { loadCalendars, loadGames } = require('./lib/calendar');
const { validateCalendar, validatePost } = require('./lib/guard');
const { classify } = require('./lib/schedule');
const ledgerLib = require('./lib/ledger');
const { resolveMedia, missingFiles } = require('./lib/media');
const { compose } = require('./lib/compose');

function clipsNeeded(due) {
    const seen = new Map();
    for (const { post } of due) {
        const media = resolveMedia(post);
        if (media && media.generated && missingFiles(media).length) {
            const game = post.media.game || post.game;
            seen.set(`${game}/${post.media.clip}`, { game, shot: post.media.clip });
        }
    }
    return [...seen.values()];
}

async function run({
    now = new Date(), env = process.env, dryRun = false, planOnly = false, checkOnly = false,
    ledgerFile = cfg.LEDGER_FILE, calendarDir = cfg.CALENDAR_DIR, channels = defaultChannels,
    fetchImpl = fetch, games = loadGames(), log = console.log
} = {}) {
    if (env.MARKETING_PAUSED === 'true' && !checkOnly) {
        log('⏸  MARKETING_PAUSED=true: nada será publicado.');
        return { paused: true, published: [], skipped: [], failed: [], expired: [] };
    }

    const { posts } = loadCalendars(calendarDir);
    const problems = validateCalendar(posts, { games, mode: 'plan' });
    if (problems.length) {
        const err = new Error(`Guardião reprovou o calendário:\n  - ${problems.join('\n  - ')}`);
        err.problems = problems;
        throw err;
    }
    if (checkOnly) return { ok: true, posts: posts.length };

    const ledger = ledgerLib.load(ledgerFile);
    const { due, expired, future } = classify(posts, ledger, now);
    if (planOnly) {
        return { due: due.map((d) => ({ id: d.post.id, channels: d.channels })), expired: expired.map((p) => p.id), future: future.length, clipsNeeded: clipsNeeded(due) };
    }

    const out = { published: [], skipped: [], failed: [], expired: expired.map((p) => p.id), paused: false };
    expired.forEach((p) => log(`⌛ ${p.id}: passou da janela de ${cfg.STALE_AFTER_HOURS} h, não será publicado`));

    for (const { post, channels: pending } of due) {
        const game = games.get(post.game);
        const media = resolveMedia(post);
        // revalida na hora de publicar, agora exigindo os arquivos de mídia
        const lastCheck = validatePost(post, { games, mode: 'publish' });
        if (lastCheck.length) {
            lastCheck.forEach((m) => log(`❌ ${m}`));
            pending.forEach((c) => out.failed.push({ id: post.id, channel: c, error: lastCheck.join('; ') }));
            continue;
        }
        for (const ch of pending) {
            const adapter = channels[ch];
            if (!adapter.isConfigured(env) && !dryRun) {
                log(`⏭  ${post.id} → ${ch}: canal sem credenciais, ignorado`);
                out.skipped.push({ id: post.id, channel: ch });
                continue;
            }
            const composed = compose(post, ch, post.campaign);
            if (dryRun) {
                log(`🧪 [dry-run] ${post.id} → ${ch}${adapter.isConfigured(env) ? '' : ' (sem credenciais)'}\n${composed.text.replace(/^/gm, '    ')}\n    mídia: ${media ? (media.video || media.image) : 'nenhuma'}\n    link: ${composed.link}`);
                continue;
            }
            try {
                const result = await adapter.publish({ post, composed, game, media }, env, fetchImpl);
                ledgerLib.record(ledger, post.id, ch, result, now);
                ledgerLib.save(ledgerFile, ledger); // grava a cada publicação: uma queda depois não duplica o post
                log(`✅ ${post.id} → ${ch}${result.url ? ' ' + result.url : ''}`);
                out.published.push({ id: post.id, channel: ch, url: result.url });
            } catch (e) {
                log(`❌ ${post.id} → ${ch}: ${e.message}`);
                out.failed.push({ id: post.id, channel: ch, error: e.message });
            }
        }
    }
    return out;
}

function summaryMarkdown(r) {
    if (r.paused) return '### Divulgação\nPausada (`MARKETING_PAUSED=true`).\n';
    const rows = [...r.published.map((p) => `| ✅ publicado | ${p.id} | ${p.channel} | ${p.url || ''} |`),
        ...r.failed.map((p) => `| ❌ falhou | ${p.id} | ${p.channel} | ${p.error.slice(0, 120)} |`),
        ...r.skipped.map((p) => `| ⏭ sem credenciais | ${p.id} | ${p.channel} | |`),
        ...r.expired.map((id) => `| ⌛ vencido | ${id} | | |`)];
    return `### Divulgação\n${rows.length ? '| Resultado | Post | Canal | Detalhe |\n|---|---|---|---|\n' + rows.join('\n') : 'Nada devido nesta execução.'}\n`;
}

if (require.main === module) {
    const argv = process.argv.slice(2);
    const flag = (n) => argv.includes(n);
    const opt = (n) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined);
    run({
        now: opt('--now') ? new Date(opt('--now')) : new Date(),
        dryRun: flag('--dry-run'), planOnly: flag('--plan'), checkOnly: flag('--check'),
        ledgerFile: opt('--ledger') ? path.resolve(opt('--ledger')) : cfg.LEDGER_FILE,
        log: flag('--plan') ? () => {} : console.log
    }).then((r) => {
        if (flag('--plan')) return console.log(JSON.stringify(r));
        if (flag('--check')) return console.log(`Calendários válidos (${r.posts} posts).`);
        if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryMarkdown(r));
        if (r.failed.length) process.exit(1);
    }).catch((e) => { console.error(e.message); process.exit(1); });
}

module.exports = { run, clipsNeeded, summaryMarkdown };
