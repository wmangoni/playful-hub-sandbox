const fs = require('fs');
const path = require('path');
const { CALENDAR_DIR } = require('../config');

/** Lê todos os calendários e devolve os posts com a campanha anexada. */
function loadCalendars(dir = CALENDAR_DIR) {
    const calendars = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((file) => {
        const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
        return { file, campaign: data.campaign, posts: data.posts };
    });
    const posts = calendars.flatMap((c) => (Array.isArray(c.posts) ? c.posts.map((p) => ({ ...p, campaign: c.campaign })) : []));
    return { calendars, posts };
}

/** catálogo de jogos (games.json, gerado pelo SEO) indexado por slug */
function loadGames(root = path.resolve(__dirname, '../..')) {
    const data = JSON.parse(fs.readFileSync(path.join(root, 'games.json'), 'utf8'));
    return new Map(data.games.map((g) => [g.slug, g]));
}

module.exports = { loadCalendars, loadGames };
