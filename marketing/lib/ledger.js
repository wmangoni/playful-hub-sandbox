// Ledger: registro do que já foi publicado, por post e por canal.
// Fica numa branch própria (marketing-ledger) para o histórico do código não encher de commits de robô.
const fs = require('fs');
const path = require('path');

function load(file) {
    if (!fs.existsSync(file)) return { version: 1, posts: {} };
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (data.version !== 1 || typeof data.posts !== 'object') throw new Error(`ledger inválido: ${file}`);
    return data;
}

const isPosted = (ledger, postId, channel) => Boolean(ledger.posts[postId] && ledger.posts[postId][channel]);

function record(ledger, postId, channel, result, now = new Date()) {
    ledger.posts[postId] = ledger.posts[postId] || {};
    ledger.posts[postId][channel] = { at: now.toISOString(), id: result.id || null, url: result.url || null };
    return ledger;
}

function save(file, ledger) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    // grava em arquivo temporário e renomeia: uma queda no meio não deixa o ledger pela metade
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(ledger, null, 2) + '\n');
    fs.renameSync(tmp, file);
}

module.exports = { load, save, record, isPosted };
