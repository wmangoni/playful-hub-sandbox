const http = require('http');
const assert = require('assert');
const app = require('../server');

const server = http.createServer(app);

function request(path) {
  return new Promise((resolve, reject) => {
    const port = process.env.PORT || 3001;
    const req = http.request({ hostname: '127.0.0.1', port, path, method: 'GET' }, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  const port = process.env.PORT || 3001;
  await new Promise(r => server.listen(port, r));

  try {
    // 1) Health check deve responder 200
    const health = await request('/health');
    assert.strictEqual(health.status, 200, 'Health check deve retornar 200');

    // 2) ads.txt deve responder 200 e conter publisher id
    const ads = await request('/ads.txt');
    assert.strictEqual(ads.status, 200, 'ads.txt deve retornar 200');
    assert.ok(/pub-6741914590073026/.test(ads.body), 'ads.txt deve conter o publisher id');

    // 3) robots.txt deve responder 200
    const robots = await request('/robots.txt');
    assert.strictEqual(robots.status, 200, 'robots.txt deve retornar 200');

    console.log('All smoke tests passed');
    process.exit(0);
  } catch (err) {
    console.error('Smoke tests failed:', err.message || err);
    process.exit(1);
  } finally {
    server.close();
  }
})();


