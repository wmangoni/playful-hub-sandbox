// Garante que o sitemap, o llms.txt, o catálogo e o bloco de SEO das páginas
// estão completos e coerentes. A checagem de "arquivos em dia" fica em `npm run seo:check`.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://playfulhub.com.br';
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const pages = fs.readdirSync(path.join(ROOT, 'jogos')).filter(f => f.endsWith('.html')).map(f => f.replace('.html', ''));

assert.ok(pages.length >= 27, 'esperava ao menos 27 páginas de jogos em jogos/');

// sitemap.xml: home + toda página de jogo, URLs absolutas e únicas
const sitemap = read('sitemap.xml');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
assert.strictEqual(new Set(locs).size, locs.length, 'sitemap com URLs duplicadas');
assert.ok(locs.includes(SITE + '/'), 'sitemap sem a home');
pages.forEach(p => assert.ok(locs.includes(`${SITE}/jogos/${p}`), `sitemap sem /jogos/${p}`));
assert.strictEqual(locs.length, pages.length + 1, 'sitemap com URLs além da home e dos jogos');
locs.forEach(u => assert.ok(u.startsWith(SITE), `URL fora do domínio: ${u}`));

// robots.txt aponta para o sitemap
assert.ok(read('robots.txt').includes(`Sitemap: ${SITE}/sitemap.xml`), 'robots.txt sem a linha Sitemap');

// llms.txt e games.json listam todos os títulos
const llms = read('llms.txt');
const catalog = JSON.parse(read('games.json'));
assert.strictEqual(catalog.count, pages.length);
pages.forEach(p => {
    assert.ok(llms.includes(`${SITE}/jogos/${p}`), `llms.txt sem /jogos/${p}`);
    assert.ok(catalog.games.some(g => g.slug === p), `games.json sem ${p}`);
});
catalog.games.forEach(g => {
    assert.ok(g.name && g.description, `${g.slug}: sem nome ou descrição`);
    assert.ok(g.playUrl && g.playUrl.startsWith(SITE), `${g.slug}: sem playUrl absoluta`);
});

// Cada página (e a home): canonical, og:image absoluto que existe em disco, JSON-LD válido, um único bloco
const allPages = pages.map(p => ({ rel: `jogos/${p}.html`, url: `${SITE}/jogos/${p}` }))
    .concat([{ rel: 'index.html', url: SITE + '/' }]);

allPages.forEach(({ rel, url }) => {
    const html = read(rel);
    assert.strictEqual(html.split('<!-- seo:begin').length - 1, 1, `${rel}: bloco de SEO ausente ou duplicado`);
    assert.strictEqual((html.match(/<link rel="canonical"/g) || []).length, 1, `${rel}: precisa de exatamente um canonical`);
    assert.ok(html.includes(`<link rel="canonical" href="${url}">`), `${rel}: canonical incorreto`);

    const image = (html.match(/<meta property="og:image" content="([^"]+)"/) || [])[1];
    assert.ok(image && image.startsWith(SITE + '/'), `${rel}: og:image precisa ser absoluto`);
    const file = path.join(ROOT, decodeURIComponent(image.slice(SITE.length).split('?')[0]));
    assert.ok(fs.existsSync(file), `${rel}: og:image aponta para arquivo inexistente (${image})`);
    assert.ok(html.includes('name="twitter:card"'), `${rel}: sem twitter:card`);

    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    assert.strictEqual(ld.length, 1, `${rel}: precisa de um JSON-LD`);
    const data = JSON.parse(ld[0][1]);
    assert.ok(Array.isArray(data['@graph']) && data['@graph'].length >= 2, `${rel}: JSON-LD sem @graph`);
});

// O preview continua sendo link, nunca iframe (regra do projeto)
pages.forEach(p => assert.ok(!/<iframe[^>]*gameFrame/i.test(read(`jogos/${p}.html`)), `${p}: gameFrame não pode ser iframe`));

console.log(`SEO ok: ${pages.length} jogos, sitemap com ${locs.length} URLs`);
