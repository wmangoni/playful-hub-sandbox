/**
 * generate_blood_and_silver_trailer.js
 * 
 * Script cinematográfico de alta fidelidade para o jogo Sangue & Prata:
 * 1. Sintetiza a trilha sonora gótica em chiptune (44.1kHz estéreo) via AudioWorklet do próprio jogo.
 * 2. Orquestra a captura de gameplay cinematográfica em 5 Atos a 60 FPS com MediaRecorder (VP9 a 12Mbps).
 * 3. Aplica letterboxing anamórfico, vinhetas góticas e tipografia Cinzel integrada no canvas.
 * 4. Utiliza FFmpeg para mesclar áudio + vídeo, codificando em MP4 (H.264/AAC faststart) e WebM (VP9/Opus).
 */

const puppeteer = require('puppeteer');
const http = require('http');
const express = require('express');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

function audioBufferToWav(channels, sampleRate) {
    const numChannels = channels.length;
    const length = channels[0].length;
    const byteRate = sampleRate * numChannels * 2;
    const blockAlign = numChannels * 2;
    const buffer = Buffer.alloc(44 + length * numChannels * 2);

    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + length * numChannels * 2, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(length * numChannels * 2, 40);

    let offset = 44;
    for (let i = 0; i < length; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
            let sample = channels[ch][i];
            sample = Math.max(-1, Math.min(1, sample));
            const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            buffer.writeInt16LE(Math.round(intSample), offset);
            offset += 2;
        }
    }
    return buffer;
}

(async () => {
    console.log('🎬 [TRAILER PIPELINE] Iniciando geração do trailer cinematográfico de Sangue & Prata...');
    const outDir = path.resolve(__dirname, '../assets/videos');
    fs.mkdirSync(outDir, { recursive: true });

    const app = express();
    app.use(express.static(path.resolve(__dirname, '..')));
    const server = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
    const port = server.address().port;
    console.log(`🌐 Servidor de captura rodando na porta ${port}`);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--use-gl=angle',
            '--use-angle=d3d11',
            '--enable-webgl',
            '--window-size=1280,720',
            '--autoplay-policy=no-user-gesture-required'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        console.log('📖 Carregando página do jogo...');
        await page.goto(`http://127.0.0.1:${port}/blood_and_silver/index.html`, { waitUntil: 'load' });
        await page.waitForFunction(() => !!window.__game && window.__game.fx.prewarmed(), { timeout: 15000 });

        // ETAPA 1: Sintetizar trilha sonora épica
        console.log('🎵 Sintetizando trilha sonora original (26s) via AudioWorklet...');
        const wavPath = path.join(outDir, 'trailer_soundtrack.wav');
        const audioData = await page.evaluate(async (dur) => {
            const buf = await window.__game.renderMusic('forestBoss', dur, true);
            const ch0 = Array.from(buf.getChannelData(0));
            const ch1 = buf.numberOfChannels > 1 ? Array.from(buf.getChannelData(1)) : ch0;
            return { sampleRate: buf.sampleRate, channels: [ch0, ch1] };
        }, 26.0);

        const wavBuf = audioBufferToWav(audioData.channels, audioData.sampleRate);
        fs.writeFileSync(wavPath, wavBuf);
        console.log(`  ✓ Trilha sonora salva em ${wavPath} (${(wavBuf.length / 1024 / 1024).toFixed(2)} MB)`);

        // ETAPA 2: Configurar o diretor de cena e gancho de renderização cinematográfica
        console.log('🎭 Preparando o diretor de cena e efeitos de pós-processamento...');
        await page.evaluate(() => {
            const G = window.__game;
            const canvas = document.getElementById('game');
            const ctx = canvas.getContext('2d');
            const W = canvas.width;  // 960
            const H = canvas.height; // 540

            // Esconder elementos de HUD HTML padrão para gravação limpa de trailer
            const hud = document.getElementById('hud');
            if (hud) hud.style.display = 'none';
            const touch = document.getElementById('touchJoystick');
            if (touch) touch.style.display = 'none';

            // Configurar o Caçador como imortal e com poderes aprimorados para o espetáculo
            const pl = G.player;
            pl.hp = pl.maxHp = 999999;
            pl.xpToNext = 999999;
            pl.stats.area = 1.35;
            pl.stats.might = 1.8;
            pl.stats.cooldown = 0.55;

            // Iniciar a partida
            document.getElementById('startScreen').classList.add('hidden');
            G.game.status = 'playing';

            // Estado do diretor cinematográfico
            window.__trailerTime = 0;
            window.__trailerRunning = false;
            window.__cinematicState = {
                act: 1,
                bannerTitle: '',
                bannerSub: '',
                bannerAlpha: 0,
                frenzyPulse: 0,
                slowMo: 1.0,
                outroAlpha: 0
            };

            // Hook após a renderização do jogo no canvas
            const origRAF = window.requestAnimationFrame;
            window.requestAnimationFrame = function (cb) {
                return origRAF(function (now) {
                    cb(now);

                    if (!window.__trailerRunning) return;

                    const st = window.__cinematicState;
                    const t = window.__trailerTime;

                    ctx.save();
                    ctx.setTransform(1, 0, 0, 1, 0, 0);

                    // 1. Vinheta gótica sutil
                    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.7);
                    vig.addColorStop(0, 'rgba(0,0,0,0)');
                    vig.addColorStop(1, 'rgba(10, 4, 8, 0.65)');
                    ctx.fillStyle = vig;
                    ctx.fillRect(0, 0, W, H);

                    // 2. Pulso de frenesi quando chefes usam golpe especial
                    if (st.frenzyPulse > 0.01) {
                        ctx.fillStyle = `rgba(232, 67, 91, ${st.frenzyPulse * 0.28})`;
                        ctx.fillRect(0, 0, W, H);
                    }

                    // 3. Barras pretas de cinema (Letterboxing 2.35:1)
                    const barH = 34;
                    ctx.fillStyle = '#0a0508';
                    ctx.fillRect(0, 0, W, barH);
                    ctx.fillRect(0, H - barH, W, barH);
                    ctx.fillStyle = 'rgba(232, 67, 91, 0.4)';
                    ctx.fillRect(0, barH - 1, W, 1);
                    ctx.fillRect(0, H - barH, W, 1);

                    // 4. Tipografia de texto cinematográfica no rodapé da tela
                    if (st.bannerTitle && st.bannerAlpha > 0.02) {
                        ctx.save();
                        ctx.globalAlpha = st.bannerAlpha;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';

                        // Caixa de realce
                        ctx.font = '900 24px "Cinzel", serif, Times';
                        ctx.fillStyle = '#f3e6d3';
                        ctx.shadowColor = 'rgba(232, 67, 91, 0.85)';
                        ctx.shadowBlur = 14;
                        ctx.fillText(st.bannerTitle, W / 2, H - barH - 30);

                        if (st.bannerSub) {
                            ctx.font = '700 13px "Lato", sans-serif, Arial';
                            ctx.fillStyle = '#c79aa4';
                            ctx.shadowBlur = 8;
                            ctx.shadowColor = '#000';
                            ctx.fillText(st.bannerSub, W / 2, H - barH - 12);
                        }
                        ctx.restore();
                    }

                    // 5. Tela de Encerramento (Outro Title Card - Ato 5)
                    if (st.outroAlpha > 0.01) {
                        ctx.save();
                        ctx.globalAlpha = st.outroAlpha;
                        ctx.fillStyle = 'rgba(8, 4, 7, 0.96)';
                        ctx.fillRect(0, 0, W, H);

                        // Brasão / Borda decorativa central
                        ctx.strokeStyle = 'rgba(232, 67, 91, 0.5)';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(W / 2 - 280, H / 2 - 130, 560, 260);
                        ctx.strokeStyle = 'rgba(201, 138, 90, 0.3)';
                        ctx.strokeRect(W / 2 - 274, H / 2 - 124, 548, 248);

                        // Título
                        ctx.textAlign = 'center';
                        ctx.font = '900 48px "Cinzel", serif, Times';
                        ctx.fillStyle = '#f3e6d3';
                        ctx.shadowColor = '#e8435b';
                        ctx.shadowBlur = 24;
                        ctx.fillText('SANGUE & PRATA', W / 2, H / 2 - 40);

                        // Subtítulo
                        ctx.font = '700 16px "Cinzel", serif';
                        ctx.fillStyle = '#e8435b';
                        ctx.shadowBlur = 10;
                        ctx.fillText('ROGUELITE GÓTICO DE SOBREVIVÊNCIA', W / 2, H / 2 + 10);

                        // Call to Action
                        ctx.font = '900 18px "Lato", sans-serif';
                        ctx.fillStyle = '#ffd9a0';
                        ctx.shadowBlur = 12;
                        ctx.shadowColor = '#000';
                        ctx.fillText('⚔️ JOGUE AGORA • 100% GRÁTIS NO NAVEGADOR ⚔️', W / 2, H / 2 + 60);

                        ctx.font = '400 13px "Lato", sans-serif';
                        ctx.fillStyle = '#a68a93';
                        ctx.fillText('Disponível em playfulhub.com.br', W / 2, H / 2 + 90);

                        ctx.restore();
                    }

                    ctx.restore();
                });
            };
        });

        // ETAPA 3: Gravação do trailer coreografado
        console.log('🎥 Iniciando MediaRecorder e roteiro de gravação (25 segundos)...');
        await page.evaluate(() => {
            const canvas = document.getElementById('game');
            const stream = canvas.captureStream(60);
            window.__recordedChunks = [];
            window.__mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9',
                videoBitsPerSecond: 12000000 // 12 Mbps
            });
            window.__mediaRecorder.ondataavailable = e => {
                if (e.data.size > 0) window.__recordedChunks.push(e.data);
            };
            window.__mediaRecorder.start(100);
            window.__trailerRunning = true;
        });

        // Roteiro executado segundo a segundo
        const DURATION_SEC = 25.5;
        const startTime = Date.now();

        // Configuração das armas e fases no decorrer dos segundos
        for (let s = 0; s < DURATION_SEC; s += 0.5) {
            await page.evaluate((currSec) => {
                const G = window.__game;
                const pl = G.player;
                const st = window.__cinematicState;
                window.__trailerTime = currSec;

                // Decaimento suave de efeitos
                st.bannerAlpha = Math.max(0, st.bannerAlpha - 0.05);
                st.frenzyPulse = Math.max(0, st.frenzyPulse - 0.08);

                // ==========================================
                // ATO 1 (0s - 4.5s): O Despertar nas Dunas
                // ==========================================
                if (currSec < 4.5) {
                    st.act = 1;
                    st.bannerTitle = 'A NOITE SEM FIM CAIU...';
                    st.bannerSub = 'Fase I — Dunas do Crepúsculo';
                    st.bannerAlpha = 0.95;

                    // Equipado com Espada básica
                    if (pl.weapons.length === 0 || pl.weapons[0].id !== 'sword') {
                        const sw = G.makeWeapon('sword');
                        sw.level = 4;
                        pl.weapons = [sw];
                    }
                    pl.vx = 35; pl.vy = 0; pl.x += 1.5;

                    // Spawn moderado de vampiros ao redor
                    if (Math.random() < 0.4 && G.enemies.filter(e => e.alive).length < 25) {
                        const angle = Math.random() * Math.PI * 2;
                        const dist = 280 + Math.random() * 100;
                        G.spawnEnemy('v1', pl.x + Math.cos(angle) * dist, pl.y + Math.sin(angle) * dist);
                    }
                }

                // ==========================================
                // ATO 2 (4.5s - 10s): O Massacre & Múltiplas Armas
                // ==========================================
                else if (currSec < 10.0) {
                    st.act = 2;
                    st.bannerTitle = 'SOBREVIVA ÀS HORDAS';
                    st.bannerSub = 'Armas automáticas • Flechas perfurantes • Água Benta';
                    st.bannerAlpha = 0.95;

                    if (pl.weapons.length < 3) {
                        const sw = G.makeWeapon('sword'); sw.level = 8;
                        const bow = G.makeWeapon('bow'); bow.level = 6;
                        const holy = G.makeWeapon('holy_water'); holy.level = 5;
                        pl.weapons = [sw, bow, holy];
                    }

                    // Movimentação em círculo do jogador
                    const a = currSec * 1.5;
                    pl.x += Math.cos(a) * 2;
                    pl.y += Math.sin(a) * 2;

                    // Horda densa convergindo
                    if (G.enemies.filter(e => e.alive).length < 75) {
                        for (let i = 0; i < 4; i++) {
                            const ang = Math.random() * Math.PI * 2;
                            const d = 260 + Math.random() * 120;
                            const t = ['v1', 'v2', 'v3'][Math.floor(Math.random() * 3)];
                            G.spawnEnemy(t, pl.x + Math.cos(ang) * d, pl.y + Math.sin(ang) * d);
                        }
                    }
                }

                // ==========================================
                // ATO 3 (10s - 15.5s): Evolução & Raios da Tempestade
                // ==========================================
                else if (currSec < 15.5) {
                    st.act = 3;
                    st.bannerTitle = 'DESPERTE EVOLUÇÕES LENDÁRIAS';
                    st.bannerSub = 'Tempestade Divina • Eletrocute exércitos inteiros';
                    st.bannerAlpha = 0.95;

                    if (!pl.weapons.some(w => w.evolved)) {
                        const axe = G.makeWeapon('axe');
                        axe.level = 8;
                        axe.evolved = true; // Machado da Tempestade evoluído
                        const sw = G.makeWeapon('sword'); sw.level = 8; sw.evolved = true;
                        const holy = G.makeWeapon('holy_water'); holy.level = 8;
                        pl.weapons = [axe, sw, holy];
                        st.frenzyPulse = 1.0;
                    }

                    // Movimento rápido cortando a horda
                    pl.x += 2.5; pl.y -= 1.0;

                    // Grandes levas de monstros
                    if (G.enemies.filter(e => e.alive).length < 90) {
                        for (let i = 0; i < 6; i++) {
                            const ang = Math.random() * Math.PI * 2;
                            const d = 220 + Math.random() * 140;
                            G.spawnEnemy('v2', pl.x + Math.cos(ang) * d, pl.y + Math.sin(ang) * d);
                        }
                    }
                }

                // ==========================================
                // ATO 4 (15.5s - 21.5s): Chefes & Floresta Amaldiçoada
                // ==========================================
                else if (currSec < 21.5) {
                    st.act = 4;
                    st.bannerTitle = 'ENFRENTE OS MONARCAS DA NOITE';
                    st.bannerSub = 'Rei Lich & Vampiro Ancião • Raio de Sangue e Anel de Maldições';
                    st.bannerAlpha = 0.95;

                    // Troca de cenário para Floresta se ainda não estiver nela
                    if (G.phase !== 2) {
                        G.setPhase(2);
                        st.frenzyPulse = 1.0;
                    }

                    // Forçar surgimento e ataques do chefe
                    const bosses = G.enemies.filter(e => e.alive && e.isBoss);
                    if (bosses.length === 0) {
                        G.spawnEnemy('v3', pl.x + 180, pl.y - 40);
                        const b = G.enemies.find(e => e.alive && e.type === 'v3');
                        if (b) {
                            b.isBoss = true;
                            b.hp = b.maxHp = 8000;
                            b.radius = 48;
                            b.bossFrenzy = true;
                            b.bossBeam = { beamS: 2, angle: Math.PI, halfWidth: 32, beamLen: 600, duration: 2.0 };
                            st.frenzyPulse = 0.8;
                        }
                    } else {
                        const b = bosses[0];
                        b.x = pl.x + 160;
                        b.y = pl.y;
                        if (Math.random() < 0.3) {
                            st.frenzyPulse = 0.6;
                        }
                    }
                }

                // ==========================================
                // ATO 5 (21.5s - 25.5s): Clímax & Title Card
                // ==========================================
                else {
                    st.act = 5;
                    st.bannerAlpha = 0;
                    // Fade in do Title Card cinematográfico
                    st.outroAlpha = Math.min(1.0, (currSec - 21.5) / 1.5);
                }

            }, s);

            // Aguardar 500ms reais
            await new Promise(r => setTimeout(r, 500));
        }

        console.log('🛑 Finalizando gravação e extraindo buffer de vídeo WebM...');
        const videoBase64 = await page.evaluate(async () => {
            window.__trailerRunning = false;
            window.__mediaRecorder.stop();
            await new Promise(r => { window.__mediaRecorder.onstop = r; });
            const blob = new Blob(window.__recordedChunks, { type: 'video/webm' });
            const reader = new FileReader();
            return new Promise(resolve => {
                reader.onloadend = () => {
                    const b64 = reader.result.split(',')[1];
                    resolve(b64);
                };
                reader.readAsDataURL(blob);
            });
        });

        const rawWebmPath = path.join(outDir, 'trailer_raw.webm');
        fs.writeFileSync(rawWebmPath, Buffer.from(videoBase64, 'base64'));
        console.log(`  ✓ Vídeo bruto gravado: ${rawWebmPath} (${(fs.statSync(rawWebmPath).size / 1024 / 1024).toFixed(2)} MB)`);

        // ETAPA 4: Renderização final com FFmpeg
        console.log('🎞️ [FFMPEG] Multiplexando vídeo + trilha sonora com áudio e codificação para web...');
        const finalMp4 = path.join(outDir, 'blood_and_silver_trailer.mp4');
        const finalWebm = path.join(outDir, 'blood_and_silver_trailer.webm');
        const posterJpg = path.join(outDir, 'blood_and_silver_trailer_poster.jpg');

        // 1. Exportar MP4 (H.264 High Profile, AAC, faststart, 60fps)
        const mp4Cmd = `ffmpeg -y -i "${rawWebmPath}" -i "${wavPath}" -filter_complex "[1:a]afade=t=in:ss=0:d=0.5,afade=t=out:st=23.5:d=2.0,volume=0.85[a]" -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 22 -c:a aac -b:a 192k -pix_fmt yuv420p -movflags +faststart -t 25.5 "${finalMp4}"`;
        console.log('  -> Codificando MP4...');
        execSync(mp4Cmd, { stdio: 'inherit' });

        // 2. Exportar WebM (VP9 direto da gravação do Chrome, Opus, 60fps)
        const webmCmd = `ffmpeg -y -i "${rawWebmPath}" -i "${wavPath}" -filter_complex "[1:a]afade=t=in:ss=0:d=0.5,afade=t=out:st=23.5:d=2.0,volume=0.85[a]" -map 0:v -map "[a]" -c:v copy -c:a libopus -b:a 128k -t 25.5 "${finalWebm}"`;
        console.log('  -> Codificando WebM...');
        execSync(webmCmd, { stdio: 'inherit' });

        // 3. Extrair poster cinematográfico em 12s (momento de pico de batalha)
        const posterCmd = `ffmpeg -y -ss 00:00:13.500 -i "${finalMp4}" -vframes 1 -q:v 2 "${posterJpg}"`;
        execSync(posterCmd, { stdio: 'inherit' });

        console.log('🎉 [SUCESSO] Todos os arquivos do trailer foram gerados:');
        console.log(`  - MP4:  ${finalMp4} (${(fs.statSync(finalMp4).size / 1024 / 1024).toFixed(2)} MB)`);
        console.log(`  - WebM: ${finalWebm} (${(fs.statSync(finalWebm).size / 1024 / 1024).toFixed(2)} MB)`);
        console.log(`  - Poster: ${posterJpg} (${(fs.statSync(posterJpg).size / 1024).toFixed(1)} KB)`);

    } finally {
        await browser.close();
        server.close();
    }
})();
