#!/usr/bin/env node
/**
 * Grava os clipes que os posts devidos precisam e ainda não existem (cache em marketing/out/clips).
 *   node marketing/render.js              grava o que falta para os posts devidos agora
 *   node marketing/render.js --all        grava todas as tomadas de todos os jogos (ensaio/pré-visualização)
 * Reaproveita o ledger e o calendário do publicador; requer ffmpeg e puppeteer.
 */
const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const { run } = require('./publish');

async function main() {
    const { recordShots } = require('./cineasta/record');
    const all = process.argv.includes('--all');
    let wanted;
    if (all) {
        const games = fs.readdirSync(path.join(__dirname, 'cineasta/shots')).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, ''));
        wanted = games.map((g) => ({ game: g, shots: Object.keys(require(`./cineasta/shots/${g}.js`).shots) }));
    } else {
        const plan = await run({ planOnly: true, env: { ...process.env, MARKETING_PAUSED: 'false' } });
        const byGame = {};
        plan.clipsNeeded.forEach(({ game, shot }) => (byGame[game] = byGame[game] || []).push(shot));
        wanted = Object.entries(byGame).map(([game, shots]) => ({ game, shots }));
    }
    if (!wanted.length) return console.log('Nenhum clipe a gravar.');
    for (const { game, shots } of wanted) {
        const reports = await recordShots(game, shots, cfg.CLIPS_DIR);
        reports.forEach((r) => console.log(`✅ ${r.game}/${r.shot}: ${r.duration.toFixed(1)} s, ${(r.bytes / 1e6).toFixed(2)} MB`));
    }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
