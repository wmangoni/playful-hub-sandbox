process.env.NODE_ENV = 'test';
const puppeteer = require('puppeteer');
const http = require('http');
const path = require('path');
const fs = require('fs');
const assert = require('assert');
const app = require('../server');

(async () => {
    console.log('🧪 [TEST] Testando integração do trailer cinematográfico de Sangue & Prata...');
    const server = http.createServer(app);
    const port = await new Promise(r => {
        server.listen(0, '127.0.0.1', () => r(server.address().port));
    });

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required']
    });

    const errors = [];

    try {
        // 1. Verificar se os arquivos de vídeo existem e não estão vazios
        const mp4Path = path.resolve(__dirname, '../assets/videos/blood_and_silver_trailer.mp4');
        const webmPath = path.resolve(__dirname, '../assets/videos/blood_and_silver_trailer.webm');
        const posterPath = path.resolve(__dirname, '../assets/videos/blood_and_silver_trailer_poster.jpg');

        assert.ok(fs.existsSync(mp4Path), 'Arquivo MP4 do trailer existe');
        assert.ok(fs.statSync(mp4Path).size > 1000000, 'Arquivo MP4 tem tamanho válido (>1MB)');
        assert.ok(fs.existsSync(webmPath), 'Arquivo WebM do trailer existe');
        assert.ok(fs.statSync(webmPath).size > 1000000, 'Arquivo WebM tem tamanho válido (>1MB)');
        assert.ok(fs.existsSync(posterPath), 'Poster do trailer existe');
        console.log('  ✓ Arquivos de vídeo e poster validados em disco');

        // 2. Verificar requisições HTTP aos vídeos servidos pelo Express
        const checkHttp = (urlPath) => new Promise((resolve, reject) => {
            http.get(`http://127.0.0.1:${port}${urlPath}`, (res) => {
                resolve({ status: res.statusCode, headers: res.headers });
            }).on('error', reject);
        });

        const mp4Http = await checkHttp('/assets/videos/blood_and_silver_trailer.mp4');
        assert.strictEqual(mp4Http.status, 200, 'HTTP 200 para MP4');
        assert.strictEqual(mp4Http.headers['content-type'], 'video/mp4', 'Content-Type video/mp4');

        const webmHttp = await checkHttp('/assets/videos/blood_and_silver_trailer.webm');
        assert.strictEqual(webmHttp.status, 200, 'HTTP 200 para WebM');
        assert.strictEqual(webmHttp.headers['content-type'], 'video/webm', 'Content-Type video/webm');
        console.log('  ✓ Servidor Express entrega os vídeos com Content-Type correto');

        // 3. Abrir a página do jogo http://localhost:3000/jogos/blood_and_silver no Puppeteer
        const page = await browser.newPage();
        page.on('pageerror', err => errors.push(err.toString()));

        await page.goto(`http://127.0.0.1:${port}/jogos/blood_and_silver`, { waitUntil: 'load' });

        // Validar presença e estrutura do trailer
        const trailerData = await page.evaluate(() => {
            const v = document.getElementById('gameTrailer');
            const frame = document.getElementById('gameFrame');
            const audioBtn = document.getElementById('toggleTrailerAudio');
            const playBtn = document.getElementById('toggleTrailerPlay');
            const sources = Array.from(v ? v.querySelectorAll('source') : []).map(s => s.getAttribute('src'));

            return {
                hasVideo: !!v,
                autoplay: v ? v.autoplay : false,
                muted: v ? v.muted : false,
                loop: v ? v.loop : false,
                playsinline: v ? v.hasAttribute('playsinline') : false,
                poster: v ? v.getAttribute('poster') : null,
                sources: sources,
                frameHref: frame ? frame.getAttribute('href') : null,
                hasAudioBtn: !!audioBtn,
                hasPlayBtn: !!playBtn
            };
        });

        assert.ok(trailerData.hasVideo, 'Tag <video id="gameTrailer"> está presente');
        assert.ok(trailerData.autoplay, 'Vídeo está configurado para autoplay');
        assert.ok(trailerData.muted, 'Vídeo está mutado por padrão (browser policy)');
        assert.ok(trailerData.loop, 'Vídeo está configurado para loop');
        assert.ok(trailerData.playsinline, 'Vídeo possui playsinline para mobile');
        assert.ok(trailerData.sources.some(s => s.includes('.webm')), 'Possui fonte WebM');
        assert.ok(trailerData.sources.some(s => s.includes('.mp4')), 'Possui fonte MP4');
        assert.strictEqual(trailerData.frameHref, '/blood_and_silver/', 'Link do container aponta para /blood_and_silver/');
        console.log('  ✓ Estrutura DOM e atributos do trailer validados');

        // 4. Testar clique no botão de desmutar áudio
        const audioToggled = await page.evaluate(() => {
            const audioBtn = document.getElementById('toggleTrailerAudio');
            const video = document.getElementById('gameTrailer');
            const initialMuted = video.muted;
            audioBtn.click();
            const afterClickMuted = video.muted;
            return { initialMuted, afterClickMuted };
        });
        assert.strictEqual(audioToggled.initialMuted, true, 'Inicialmente mutado');
        assert.strictEqual(audioToggled.afterClickMuted, false, 'Após clique, o áudio é ativado');
        console.log('  ✓ Controle de áudio (mutar/desmutar) funcional');

        // 5. Testar clique no botão de pausar/reproduzir
        const playToggled = await page.evaluate(() => {
            const playBtn = document.getElementById('toggleTrailerPlay');
            const video = document.getElementById('gameTrailer');
            playBtn.click();
            const pausedAfterClick = video.paused;
            playBtn.click();
            return { pausedAfterClick };
        });
        assert.strictEqual(playToggled.pausedAfterClick, true, 'Pausa ao clicar no botão');
        console.log('  ✓ Controle de reprodução (play/pause) funcional');

        assert.strictEqual(errors.length, 0, `Nenhum erro de console: ${errors.join(', ')}`);
        console.log('✅ [PASS] Todos os testes do trailer passaram com sucesso!');

    } finally {
        await browser.close();
        server.close();
        process.exit(errors.length ? 1 : 0);
    }
})();
