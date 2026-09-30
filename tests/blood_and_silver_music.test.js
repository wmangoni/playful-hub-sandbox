const puppeteer = require('puppeteer');
const express = require('express');
const path = require('path');
const assert = require('assert');

// Trilha sonora do Sangue & Prata: temas compostos (menu, Fase I, Fase II e um para cada chefe)
// tocados por um sequenciador/sintetizador num AudioWorklet. Confere as composições, uma prévia
// de cada tema (sem silêncio nem clipping) e as trocas no jogo: menu → caçada → chefe → volta →
// pausa → game over → menu, a Fase II, e o botão/tecla N que liga e desliga (e é lembrado).
(async () => {
    console.log('🎵 Testando a trilha sonora do Sangue & Prata...');
    const app = express();
    app.use(express.static(path.resolve(__dirname, '..')));
    const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required'] });
    const url = `http://localhost:${server.address().port}/blood_and_silver/index.html`;
    const pageErrors = [];
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    try {
        const page = await browser.newPage();
        page.on('pageerror', err => pageErrors.push(err.toString()));
        await page.setViewport({ width: 1280, height: 720 });
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => { localStorage.removeItem('blood_and_silver_progression'); localStorage.removeItem('blood_and_silver_music'); });
        await page.reload({ waitUntil: 'networkidle0' });
        const music = () => page.evaluate(() => {
            const m = window.__game.music;
            return {
                track: m.track, pending: m.pending, enabled: m.enabled,
                label: document.getElementById('musicName').textContent,
                btn: document.getElementById('musicBtn').textContent,
                hidden: document.getElementById('musicCtl').classList.contains('hidden')
            };
        });
        const until = (fn, arg) => page.waitForFunction(fn, { timeout: 4000 }, arg);

        // 1. Composições: cada compasso fecha a conta de tempos e cada tema tem melodia e cifras
        const tracks = await page.evaluate(() => Object.keys(window.__game.MUSIC_TRACKS).map(id => {
            const t = window.__game.MUSIC_TRACKS[id];
            return { id: id, bars: t.chords.length, melody: t.melody.length, bpm: t.bpm };
        }));
        assert.deepStrictEqual(tracks.map(t => t.id).sort(), ['dunes', 'dunesBoss', 'forest', 'forestBoss', 'menu']);
        for (const t of tracks) assert.strictEqual(t.bars, t.melody, `${t.id}: um compasso de melodia por cifra`);
        console.log('  ✓ 5 temas compostos: ' + tracks.map(t => `${t.id} (${t.bars} compassos, ${t.bpm} BPM)`).join(', '));

        // 2. Prévia de cada tema (mesmo AudioWorklet do jogo, fora do tempo real): som, sem clipping
        const renders = await page.evaluate(async () => {
            const out = [];
            for (const id of Object.keys(window.__game.MUSIC_TRACKS)) {
                const t0 = performance.now();
                const buf = await window.__game.renderMusic(id, 6, true);
                const ms = performance.now() - t0;
                let peak = 0, sum = 0, bad = 0;
                for (let c = 0; c < buf.numberOfChannels; c++) {
                    const d = buf.getChannelData(c);
                    for (let i = 0; i < d.length; i++) {
                        const v = d[i];
                        if (!isFinite(v)) { bad++; continue; }
                        const a = Math.abs(v);
                        if (a > peak) peak = a;
                        sum += v * v;
                    }
                }
                out.push({ id: id, peak: peak, rmsDb: 10 * Math.log10(sum / (buf.length * buf.numberOfChannels)), bad: bad, ms: ms });
            }
            return out;
        });
        for (const r of renders) {
            assert.strictEqual(r.bad, 0, `${r.id}: nenhuma amostra inválida`);
            assert.ok(r.rmsDb > -40, `${r.id}: tem som (${r.rmsDb.toFixed(1)} dB RMS)`);
            assert.ok(r.peak < 0.95, `${r.id}: sem clipping (pico ${r.peak.toFixed(2)})`);
        }
        console.log('  ✓ Prévias: ' + renders.map(r => `${r.id} ${r.rmsDb.toFixed(0)} dB/pico ${r.peak.toFixed(2)}`).join(', '));

        // 3. Menu: o tema da tela inicial começa no 1º gesto; o botão mostra o nome
        await page.mouse.click(5, 5);
        await until(() => window.__game.music.track === 'menu');
        let m = await music();
        assert.ok(m.enabled && !m.hidden && m.label.includes('A Noite Sem Fim') && m.btn === '🎵', `Menu com o tema e o botão (${JSON.stringify(m)})`);

        // 4. Caçada na Fase I, chefe entrando na virada do compasso e voltando quando morre
        await page.click('#startBtn');
        await until(() => window.__game.music.track === 'dunes');
        assert.ok((await music()).hidden, 'O botão da música some durante a caçada');
        // registra a sequência de estados da trilha a cada 2 ms (a espera pela virada é curta)
        await page.evaluate(() => {
            const G = window.__game;
            window.__seq = [];
            window.__seqTimer = setInterval(() => {
                const k = G.music.track + '|' + G.music.pending;
                if (window.__seq[window.__seq.length - 1] !== k) window.__seq.push(k);
            }, 2);
            G.player.xpToNext = 1e9; G.game.spawnTimer = 1e9; G.game.bossTimer = 0.01;
        });
        await until(() => window.__game.music.track === 'dunesBoss');
        const seq = await page.evaluate(() => { clearInterval(window.__seqTimer); return window.__seq; });
        assert.ok(seq.indexOf('dunes|dunesBoss') >= 0 && seq[seq.length - 1] === 'dunesBoss|null', `O tema do chefe espera a virada do compasso (${seq.join(' → ')})`);
        await page.evaluate(() => { const G = window.__game; G.hitEnemy(G.game.activeBoss, 1e9, 0, 0, true); });
        await until(() => window.__game.music.track === 'dunes');
        console.log('  ✓ Menu → "Dança Rubra das Dunas" → "O Ancião Desperta" no compasso seguinte → volta ao tema da fase');

        // 5. Pausa mostra o botão; tecla N desliga/liga e a escolha fica salva
        await page.keyboard.press('Escape');
        assert.ok(!(await music()).hidden, 'Na pausa o botão da música aparece');
        await page.keyboard.press('Escape');
        await page.keyboard.press('n');
        m = await music();
        assert.ok(!m.enabled && m.btn === '🔇', 'Tecla N desliga a música');
        assert.strictEqual(await page.evaluate(() => localStorage.getItem('blood_and_silver_music')), '0', 'A escolha fica salva');
        await page.reload({ waitUntil: 'networkidle0' });
        assert.ok(!(await music()).enabled, 'Ao recarregar, a música continua desligada');
        await page.click('#musicBtn');
        assert.ok((await music()).enabled, 'O botão liga de novo');

        // 6. Game over silencia a trilha; "Escolher Fase" volta ao tema do menu; Fase II e o Rei Lich
        await page.mouse.click(5, 5);
        await page.click('#startBtn');
        await until(() => window.__game.music.track === 'dunes');
        await page.evaluate(() => window.__game.damagePlayer(1e6));
        await until(() => window.__game.music.track === null);
        await page.click('#phaseMenuBtn');
        await until(() => window.__game.music.track === 'menu');
        await page.evaluate(() => { const p = window.__game.getProgression(); p.bestTime = 700; });
        await page.evaluate(() => window.__game.selectPhase(2));
        await page.waitForFunction(() => window.__game.sceneryTheme === 'floresta' && !window.__game.sceneryBuilding, { timeout: 4000 });
        await page.click('#startBtn');
        await until(() => window.__game.music.track === 'forest');
        assert.ok((await music()).label.includes('Danse Macabre'), 'Fase II toca a valsa macabra');
        await page.evaluate(() => { const G = window.__game; G.player.xpToNext = 1e9; G.player.hp = G.player.maxHp = 1e9; G.game.bossTimer = 0.01; });
        await until(() => window.__game.music.track === 'forestBoss');
        console.log('  ✓ Pausa/tecla N/botão (lembrado ao recarregar), game over em silêncio, menu, Fase II e "Coroação do Rei Lich"');

        await sleep(200);
        assert.deepStrictEqual(pageErrors, [], 'Sem erros na página');
        console.log('\n🎉 TESTE DA TRILHA SONORA APROVADO!');
    } catch (err) {
        console.error('❌ Erro no teste da trilha sonora:', err);
        if (pageErrors.length) console.error('Erros da página:', pageErrors);
        process.exitCode = 1;
    } finally {
        await browser.close();
        server.close();
    }
})();
