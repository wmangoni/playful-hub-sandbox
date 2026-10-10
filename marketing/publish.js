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
const { classify, onePerChannel } = require('./lib/schedule');
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
    fetchImpl = fetch, games = loadGames(), log = console.log, afterPublish = null
} = {}) {
    if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new Error('--now inválido: use data ISO com fuso (ex.: 2026-10-14T19:30:00-03:00)');
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
    const classified = classify(posts, ledger, now);
    const { expired, future } = classified;
    const { due, superseded } = onePerChannel(classified.due);
    if (planOnly) {
        return { due: due.map((d) => ({ id: d.post.id, channels: d.channels })), expired: expired.map((p) => p.id), superseded, future: future.length, clipsNeeded: clipsNeeded(due) };
    }

    const out = { published: [], skipped: [], failed: [], expired: expired.map((p) => p.id), superseded, paused: false };
    expired.forEach((p) => log(`⌛ ${p.id}: passou da janela de ${cfg.STALE_AFTER_HOURS} h, não será publicado`));
    superseded.forEach((x) => log(`⏩ ${x.id} → ${x.channel}: há um post mais recente devido neste canal; só o mais recente sai por execução`));

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
            let result;
            try {
                result = await adapter.publish({ post, composed, game, media }, env, fetchImpl);
            } catch (e) {
                log(`❌ ${post.id} → ${ch}: ${e.message}`);
                out.failed.push({ id: post.id, channel: ch, error: e.message });
                continue;
            }
            // A partir daqui o post JÁ está no ar. Se não der para registrar, o erro é fatal: seguir publicando
            // outros posts sem ledger arrisca duplicar tudo na próxima execução.
            ledgerLib.record(ledger, post.id, ch, result, now);
            ledgerLib.save(ledgerFile, ledger);
            log(`✅ ${post.id} → ${ch}${result.url ? ' ' + result.url : ''}`);
            out.published.push({ id: post.id, channel: ch, url: result.url });
            if (afterPublish) await afterPublish(); // ex.: enviar o ledger ao remoto agora, não só no fim do job
        }
    }
    return out;
}

const cell = (t) => String(t).replace(/[|\r\n]+/g, ' ').slice(0, 120);

function summaryMarkdown(r) {
    if (r.paused) return '### Divulgação\nPausada (`MARKETING_PAUSED=true`).\n';
    const rows = [...r.published.map((p) => `| ✅ publicado | ${p.id} | ${p.channel} | ${p.url || ''} |`),
        ...r.failed.map((p) => `| ❌ falhou | ${p.id} | ${p.channel} | ${cell(p.error)} |`),
        ...r.skipped.map((p) => `| ⏭ sem credenciais | ${p.id} | ${p.channel} | |`),
        ...r.expired.map((id) => `| ⌛ vencido | ${id} | | |`),
        ...(r.superseded || []).map((p) => `| ⏩ adiado (há post mais recente) | ${p.id} | ${p.channel} | |`)];
    return `### Divulgação\n${rows.length ? '| Resultado | Post | Canal | Detalhe |\n|---|---|---|---|\n' + rows.join('\n') : 'Nada devido nesta execução.'}\n`;
}

if (require.main === module) {
    const argv = process.argv.slice(2);
    const flag = (n) => argv.includes(n);
    const opt = (n) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined);
    // --now só simula: com publicação de verdade ele gravaria no ledger um horário falso e publicaria posts "do futuro"
    if (opt('--now') && !flag('--dry-run') && !flag('--plan') && !flag('--check')) {
        console.error('--now só pode ser usado com --dry-run, --plan ou --check.');
        process.exit(2);
    }
    // MARKETING_LEDGER_PUSH=true (o workflow liga): envia o ledger ao remoto logo após cada publicação
    const afterPublish = process.env.MARKETING_LEDGER_PUSH === 'true'
        ? () => require('child_process').execFileSync('bash', [path.join(__dirname, 'scripts/ledger.sh'), 'commit'], { stdio: 'inherit' })
        : null;
    run({
        now: opt('--now') ? new Date(opt('--now')) : new Date(),
        dryRun: flag('--dry-run'), planOnly: flag('--plan'), checkOnly: flag('--check'),
        ledgerFile: opt('--ledger') ? path.resolve(opt('--ledger')) : cfg.LEDGER_FILE,
        log: flag('--plan') ? () => {} : console.log,
        afterPublish
    }).then((r) => {
        if (flag('--plan')) return console.log(JSON.stringify(r));
        if (flag('--check')) return console.log(`Calendários válidos (${r.posts} posts).`);
        if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryMarkdown(r));
        if (r.failed.length) process.exit(1);
    }).catch((e) => { console.error(e.message); process.exit(1); });
}

module.exports = { run, clipsNeeded, summaryMarkdown };
