// Extrai o conteúdo de uma página de informações em português (`jogos/<jogo>.html`), que é a FONTE DA VERDADE
// das versões em outros idiomas. (O `gamesData` do generate-game-pages.js ficou desatualizado em relação às
// páginas editadas à mão: o puzzle, por exemplo, hoje é o "Mind Labyrinth".) Nenhuma dependência.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const text = (html) => decode(html.replace(/<[^>]+>/g, ' '));

function extractPage(slug, root = ROOT) {
    const h = fs.readFileSync(path.join(root, 'jogos', `${slug}.html`), 'utf8').replace(/\r\n/g, '\n');
    const one = (re) => { const m = re.exec(h); return m ? text(m[1]) : null; };
    const many = (re) => [...h.matchAll(re)].map((m) => m.slice(1).map(text));
    const infos = many(/<span class="info-label">([\s\S]*?)<\/span>\s*<span class="info-value">([\s\S]*?)<\/span>/g);
    const info = (label) => (infos.find((i) => i[0] === label) || [])[1] || null;
    return {
        slug,
        title: one(/<h1 class="game-title">([\s\S]*?)<\/h1>/),
        description: one(/<p class="game-description">([\s\S]*?)<\/p>/),
        keywords: (/<meta name="keywords" content="([^"]*)"/.exec(h) || [])[1] ? decode(/<meta name="keywords" content="([^"]*)"/.exec(h)[1]) : null,
        objective: one(/<strong>Objetivo:<\/strong>([\s\S]*?)<\/p>/),
        controls: many(/<div class="control-item">\s*<span class="control-key">([\s\S]*?)<\/span>\s*<span>([\s\S]*?)<\/span>/g),
        tips: many(/<div class="tip-item">\s*<span class="tip-number">[\s\S]*?<\/span>\s*<span>([\s\S]*?)<\/span>/g).map((x) => x[0]),
        genre: info('Gênero'),
        developer: info('Desenvolvedor'),
        features: info('Características'),
        tags: many(/<span class="tag">([\s\S]*?)<\/span>/g).map((x) => x[0]),
        // onde o botão PLAY leva (rota do jogo, não da página de informações)
        play: (/<a id="gameFrame"[^>]*href="([^"]+)"/.exec(h) || [])[1] || null,
        image: (/<img src="\.\.\/assets\/images\/([^"?]+)/.exec(h) || [])[1] || null
    };
}

module.exports = { extractPage };
