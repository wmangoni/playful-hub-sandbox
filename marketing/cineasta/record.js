#!/usr/bin/env node
/**
 * Cineasta: grava as tomadas definidas em marketing/cineasta/shots/<jogo>.js como vídeo vertical (MP4 H.264).
 *
 * Como funciona: o jogo é aberto no Puppeteer e conduzido quadro a quadro pela API de depuração dele
 * (`__game.tick(dt)` com dt fixo de 1/30 s). Cada quadro é fotografado e enviado ao ffmpeg. O tempo é do
 * jogo, não do relógio: o vídeo sai sempre com 30 fps cravados, mesmo numa máquina lenta (CI sem GPU).
 * O jogo não é alterado; legendas e CTA são DOM injetado só nesta página de gravação.
 *
 * Uso:
 *   node marketing/cineasta/record.js tumbalacatumba mansao-ao-anoitecer
 *   node marketing/cineasta/record.js tumbalacatumba --all
 *   node marketing/cineasta/record.js tumbalacatumba --all --stills     (só fotos de 5 em 5 s, para ensaiar enquadramento)
 * Opções: --out <dir> (padrão marketing/out/clips)  --fast (10 fps, só para ensaio)
 * Ambiente: CINEASTA_GL=swiftshader força renderização por software (CI sem GPU); CINEASTA_HEADFUL=1.
 * Requer ffmpeg e ffprobe no PATH e o puppeteer instalado (devDependency).
 */
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync, execFileSync } = require('child_process');
const { sampleVec, clamp01 } = require('./lib/spline');

const ROOT = path.resolve(__dirname, '../..');
// Saída sempre 720x1280. O perfil define como chegar lá:
//  gpu:      máquina com placa de vídeo. Renderiza em 720x1280, qualidade "alta", 30 fps.
//  software: CI sem GPU (SwiftShader). Medido: "alta" a 720x1280 leva ~8 s por quadro (mais de 1 h por clipe);
//            "baixa" a 540x960, ~1,2 s. Renderiza em 540x960, qualidade "baixa", 24 fps e amplia no ffmpeg.
const OUTPUT = { width: 720, height: 1280 };
const PROFILES = {
    gpu: { width: 720, height: 1280, fps: 30, quality: 'alta' },
    software: { width: 540, height: 960, fps: 24, quality: 'baixa' }
};
const profileName = () => process.env.CINEASTA_PROFILE || (process.env.CINEASTA_GL === 'swiftshader' ? 'software' : 'gpu');
const FPS = PROFILES.gpu.fps;
const MIN_BRIGHTNESS = 18; // média de luma (0-255) abaixo disso = quadro preto/estragado

// avisos do compilador de shader do Direct3D (ANGLE) no FXAA do three não são erro do jogo (ver tumbalacatumba/CLAUDE.md)
const realErrors = (list) => list.filter((e) => !/warning X(3595|4000)/.test(e));

function loadShots(game) {
    const file = path.join(__dirname, 'shots', `${game}.js`);
    if (!fs.existsSync(file)) throw new Error(`Cineasta: sem tomadas para "${game}" (${path.relative(ROOT, file)})`);
    return require(file);
}

function clipPaths(outDir, game, shotId) {
    const base = path.join(outDir, `${game}--${shotId}`);
    return { video: base + '.mp4', poster: base + '.jpg', report: base + '.json' };
}

// Estilo e DOM de legenda/CTA. Fica na faixa central do quadro: o topo e o rodapé de Shorts/Reels/TikTok
// são cobertos pela interface das plataformas.
const OVERLAY_CSS = `
  body > *:not(#app):not(#cineasta) { display: none !important; }
  #cineasta { position: fixed; inset: 0; pointer-events: none; z-index: 99999; font-family: 'Mountains of Christmas', 'IM Fell English', Georgia, serif; }
  #cineasta .vig { position: absolute; inset: 0; background:
      linear-gradient(to bottom, rgba(8,4,18,.55) 0%, rgba(8,4,18,0) 26%, rgba(8,4,18,0) 62%, rgba(8,4,18,.7) 100%); }
  #cineasta .cap { position: absolute; left: 6%; right: 6%; top: 15%; text-align: center; color: #fff4dc; font-weight: 700;
      font-size: calc(60px * var(--k)); line-height: 1.12; letter-spacing: .5px; opacity: 0; text-wrap: balance;
      text-shadow: 0 calc(3px * var(--k)) 0 #1b0e2e, 0 0 calc(18px * var(--k)) rgba(255,140,40,.55), 0 0 calc(4px * var(--k)) #000; }
  #cineasta .cta { position: absolute; left: 0; right: 0; top: 76%; text-align: center; opacity: 0; }
  #cineasta .cta b { display: inline-block; background: #ff9a3c; color: #1b0e2e; font-size: calc(40px * var(--k));
      padding: calc(8px * var(--k)) calc(26px * var(--k)) calc(6px * var(--k)); border-radius: 6px 14px 8px 12px;
      transform: rotate(-1.6deg); box-shadow: 0 calc(4px * var(--k)) 0 #1b0e2e, 0 0 0 calc(3px * var(--k)) #fff4dc; letter-spacing: .5px; }
  #cineasta .cta span { display: block; margin-top: calc(12px * var(--k)); color: #fff4dc; font-size: calc(34px * var(--k));
      text-shadow: 0 calc(2px * var(--k)) 0 #1b0e2e, 0 0 calc(6px * var(--k)) #000; }
`;

async function openPage(browser, shots, firstHour, profile) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewport({ width: profile.width, height: profile.height, deviceScaleFactor: 1 });
    const url = 'file:///' + path.resolve(ROOT, shots.file).split(path.sep).join('/');
    await page.goto(`${url}?${shots.query}&q=${profile.quality}&t=${firstHour}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__game && window.__game.state === 'play', { timeout: 90000 });
    await page.addStyleTag({ content: OVERLAY_CSS });
    await page.evaluate((cta, url, k) => {
        document.documentElement.style.setProperty('--k', String(k));
        const d = document.createElement('div');
        d.id = 'cineasta';
        d.innerHTML = `<div class="vig"></div><div class="cap"></div><div class="cta"><b></b><span></span></div>`;
        d.querySelector('.cta b').textContent = cta;
        d.querySelector('.cta span').textContent = url;
        document.body.appendChild(d);
        const g = window.__game;
        // salvar jogo não interessa: a página é descartável
        g.progress.save = () => {};
        // resolução adaptativa fora: o carregamento em máquina lenta já a teria derrubado, e a gravação
        // quer sempre a resolução cheia do preset (o dt do tick é simulado, não mede desempenho real)
        g._adapt = () => {};
        if (g.dynScale !== undefined && g.dynScale !== 1) {
            g.dynScale = 1;
            g.renderer.setPixelRatio(Math.min(devicePixelRatio, g.quality.maxPR) * g.quality.scale);
            g.resize();
        }
    }, shots.cta, shots.url, profile.width / 720);
    await page.evaluate(() => document.fonts.ready);
    return { page, errors };
}

/** o que muda a cada quadro: câmera, hora, legenda. Roda dentro da página. */
function frameInPage({ pos, look, hour, caption, capOpacity, ctaOpacity, dt }) {
    const g = window.__game;
    const V = g.camera.position.constructor;
    const gy = (x, z) => g.world.groundHeight(x, z);
    const [px, pz, ph] = pos, [lx, lz, lh] = look;
    // câmera nunca abaixo do chão (inclui a vegetação baixa)
    const y = Math.max(gy(px, pz) + ph, gy(px, pz) + 1.1);
    g.cam.override = { pos: new V(px, y, pz), look: new V(lx, gy(lx, lz) + lh, lz) };
    g.dayNight.setTime(hour);
    // raw = 1/120: faz a resolução adaptativa ver "120 fps" e nunca reduzir a resolução da gravação
    g.tick(dt, 1 / 120);
    const cap = document.querySelector('#cineasta .cap');
    cap.textContent = caption || '';
    cap.style.opacity = caption ? String(capOpacity) : '0';
    document.querySelector('#cineasta .cta').style.opacity = String(ctaOpacity);
}

function captionAt(captions, t) {
    for (const c of captions || []) {
        if (t >= c.from && t <= c.to) return { text: c.text, opacity: clamp01(Math.min((t - c.from) / 0.45, (c.to - t) / 0.45)) };
    }
    return { text: '', opacity: 0 };
}

function frameState(shot, t) {
    const keys = shot.camera;
    const pos = sampleVec(keys.map((k) => ({ t: k.t, v: k.pos })), t);
    const look = sampleVec(keys.map((k) => ({ t: k.t, v: k.look })), t);
    const hour = shot.hour[0] + (shot.hour[1] - shot.hour[0]) * clamp01(t / shot.duration);
    const cap = captionAt(shot.captions, t);
    // CTA entra no 1º segundo e fica até o fim, com uma piscada de saída nos últimos 0,4 s
    const ctaOpacity = clamp01((t - 0.8) / 0.5) * clamp01((shot.duration - t) / 0.4);
    return { pos, look, hour, caption: cap.text, capOpacity: cap.opacity, ctaOpacity };
}

function startFfmpeg(videoFile, fps, upscale) {
    const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
        ...(upscale ? ['-vf', `scale=${OUTPUT.width}:${OUTPUT.height}:flags=lanczos`] : []),
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-pix_fmt', 'yuv420p', '-r', String(fps), '-movflags', '+faststart', '-an', videoFile];
    const proc = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((resolve, reject) => {
        proc.on('error', reject);
        proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg saiu com código ${code}`))));
    });
    proc.stdin.on('error', () => {}); // erro real aparece no 'close'
    return { stdin: proc.stdin, done };
}

const writeFrame = (stdin, buf) => new Promise((resolve) => (stdin.write(buf) ? resolve() : stdin.once('drain', resolve)));

function probe(videoFile) {
    const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets',
        '-show_entries', 'stream=width,height,nb_read_packets,r_frame_rate:format=duration,size', '-of', 'json', videoFile], { encoding: 'utf8' });
    const j = JSON.parse(out);
    const [n, d] = j.streams[0].r_frame_rate.split('/').map(Number);
    return { width: j.streams[0].width, height: j.streams[0].height, frames: Number(j.streams[0].nb_read_packets),
        fps: n / d, duration: Number(j.format.duration), bytes: Number(j.format.size) };
}

/** brilho médio (0-255) de uma imagem, via ffmpeg signalstats */
function brightnessOf(imageFile) {
    const r = spawnSync('ffmpeg', ['-v', 'info', '-i', imageFile, '-vf', 'signalstats,metadata=print:key=lavfi.signalstats.YAVG', '-f', 'null', '-'], { encoding: 'utf8' });
    const m = /YAVG=([\d.]+)/.exec((r.stdout || '') + (r.stderr || ''));
    return m ? Number(m[1]) : NaN;
}

async function recordShot(browser, shots, shotId, outDir, { fast = false, stills = false } = {}) {
    const shot = shots.shots[shotId];
    if (!shot) throw new Error(`Cineasta: tomada "${shotId}" não existe em ${shots.game} (há: ${Object.keys(shots.shots).join(', ')})`);
    fs.mkdirSync(outDir, { recursive: true });
    const paths = clipPaths(outDir, shots.game, shotId);
    const profile = PROFILES[profileName()];
    if (!profile) throw new Error(`Cineasta: perfil desconhecido "${profileName()}" (use gpu ou software)`);
    const fps = fast ? 10 : profile.fps;
    const total = Math.round(shot.duration * fps);
    const dt = 1 / fps;

    const { page, errors } = await openPage(browser, shots, shot.hour[0], profile);
    // aquecimento: deixa luz, neblina e LOD assentarem na posição inicial antes do primeiro quadro gravado
    for (let i = 0; i < 12; i++) await page.evaluate(frameInPage, { ...frameState(shot, 0), dt });

    const enc = stills ? null : startFfmpeg(paths.video, fps, profile.width !== OUTPUT.width);
    const posterIndex = Math.round(total * (shot.poster ?? 0.4));
    let posterBuf = null;
    const started = Date.now();
    for (let i = 0; i < total; i++) {
        const t = i * dt;
        await page.evaluate(frameInPage, { ...frameState(shot, t), dt });
        const buf = await page.screenshot({ type: 'jpeg', quality: fast ? 70 : 93, encoding: 'binary' });
        if (i === posterIndex) posterBuf = Buffer.from(buf);
        if (stills) {
            if (i % (5 * fps) === 0) fs.writeFileSync(path.join(outDir, `${shots.game}--${shotId}--t${Math.round(t)}.jpg`), buf);
        } else {
            await writeFrame(enc.stdin, buf);
        }
        if (i % (fps * 3) === 0) console.log(`  ${shotId}: ${i}/${total} quadros (${Math.round((Date.now() - started) / 1000)} s)`);
    }
    const gameErrors = realErrors(await page.evaluate(() => (window.__errors || []).map(String)).catch(() => []))
        .concat(realErrors(errors));
    await page.close();
    if (stills) return { shotId, stills: true };

    enc.stdin.end();
    await enc.done;
    fs.writeFileSync(paths.poster, posterBuf);

    // controle de qualidade: se falhar, o clipe não pode ser publicado
    const info = probe(paths.video);
    const luma = brightnessOf(paths.poster);
    const problems = [];
    if (info.width !== OUTPUT.width || info.height !== OUTPUT.height) problems.push(`resolução ${info.width}x${info.height}`);
    if (info.frames !== total) problems.push(`${info.frames} quadros em vez de ${total}`);
    if (Math.abs(info.duration - shot.duration) > 0.25) problems.push(`duração ${info.duration.toFixed(2)} s`);
    if (!(luma >= MIN_BRIGHTNESS)) problems.push(`poster escuro demais (luma ${luma})`);
    if (gameErrors.length) problems.push(`erros no jogo: ${gameErrors.slice(0, 3).join(' | ')}`);
    const report = { game: shots.game, shot: shotId, profile: profileName(), fps, ...info, posterLuma: luma, problems, ok: problems.length === 0 };
    fs.writeFileSync(paths.report, JSON.stringify(report, null, 2));
    if (!report.ok) throw new Error(`Cineasta: ${shotId} reprovada no controle de qualidade: ${problems.join('; ')}`);
    return report;
}

async function launch() {
    const puppeteer = require('puppeteer');
    const args = ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required'];
    if (process.env.CINEASTA_GL === 'swiftshader') args.push('--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist');
    return puppeteer.launch({ headless: process.env.CINEASTA_HEADFUL ? false : 'new', args });
}

/** Grava as tomadas pedidas, reaproveitando um único navegador. Devolve os relatórios. */
async function recordShots(game, shotIds, outDir, opts = {}) {
    const shots = loadShots(game);
    const ids = shotIds.includes('--all') ? Object.keys(shots.shots) : shotIds;
    const browser = await launch();
    const reports = [];
    try {
        for (const id of ids) {
            console.log(`🎬 ${game} / ${id}`);
            reports.push(await recordShot(browser, shots, id, outDir, opts));
        }
    } finally {
        await browser.close();
    }
    return reports;
}

if (require.main === module) {
    const argv = process.argv.slice(2);
    const flag = (n) => argv.includes(n);
    const opt = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
    const outDir = path.resolve(opt('--out', path.join(ROOT, 'marketing/out/clips')));
    const rest = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--out');
    const [game, ...ids] = rest;
    if (!game || (!ids.length && !flag('--all'))) {
        console.error('Uso: node marketing/cineasta/record.js <jogo> <tomada...|--all> [--stills] [--fast] [--out dir]');
        process.exit(2);
    }
    recordShots(game, flag('--all') ? ['--all'] : ids, outDir, { fast: flag('--fast'), stills: flag('--stills') })
        .then((r) => console.log(r.map((x) => (x.stills ? `${x.shotId}: fotos` : `${x.shot}: ${x.duration.toFixed(1)} s, ${(x.bytes / 1e6).toFixed(2)} MB`)).join('\n')))
        .catch((e) => { console.error(e.message); process.exit(1); });
}

module.exports = { recordShots, clipPaths, loadShots, frameState, captionAt, PROFILES, OUTPUT, FPS };
