// Texturas do interior desenhadas em canvas (uma vez, no carregamento). Nada de arquivo externo.
import * as THREE from 'three';
import { RNG } from '../../util/rng.js';
import { TAU, clamp, lerp } from '../../util/math.js';

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}
function tex(c, { repeat = true, aniso = 4, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  t.needsUpdate = true;
  return t;
}
/** granulado + manchas de umidade por cima do que já foi desenhado */
function grime(g, w, h, rng, { speck = 0.06, stains = 6, dark = 0.18 } = {}) {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng.next() - 0.5) * 255 * speck;
    d[i] = clamp(d[i] + n, 0, 255);
    d[i + 1] = clamp(d[i + 1] + n, 0, 255);
    d[i + 2] = clamp(d[i + 2] + n, 0, 255);
  }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < stains; i++) {
    const x = rng.range(0, w), y = rng.range(0, h), r = rng.range(w * 0.05, w * 0.18);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(40,26,20,${dark})`);
    grd.addColorStop(1, 'rgba(40,26,20,0)');
    g.fillStyle = grd;
    // repete nas bordas para a textura continuar sem emenda
    for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) g.fillRect(x - r + ox, y - r + oy, r * 2, r * 2);
  }
}
/** desenha fn em 9 posições (para padrões que atravessam a borda) */
function wrap9(w, h, fn) {
  for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) fn(ox, oy);
}

/** morcego estilizado centrado em (x,y), envergadura s */
export function batPath(g, x, y, s) {
  g.beginPath();
  g.moveTo(x, y - s * 0.12);
  g.quadraticCurveTo(x + s * 0.12, y - s * 0.28, x + s * 0.18, y - s * 0.1);
  g.quadraticCurveTo(x + s * 0.32, y - s * 0.3, x + s * 0.5, y - s * 0.22);
  g.quadraticCurveTo(x + s * 0.42, y - s * 0.05, x + s * 0.44, y + s * 0.1);
  g.quadraticCurveTo(x + s * 0.34, y + 0.0, x + s * 0.28, y + s * 0.12);
  g.quadraticCurveTo(x + s * 0.2, y + s * 0.02, x + s * 0.12, y + s * 0.14);
  g.quadraticCurveTo(x + s * 0.06, y + s * 0.06, x, y + s * 0.2);
  g.quadraticCurveTo(x - s * 0.06, y + s * 0.06, x - s * 0.12, y + s * 0.14);
  g.quadraticCurveTo(x - s * 0.2, y + s * 0.02, x - s * 0.28, y + s * 0.12);
  g.quadraticCurveTo(x - s * 0.34, y + 0.0, x - s * 0.44, y + s * 0.1);
  g.quadraticCurveTo(x - s * 0.42, y - s * 0.05, x - s * 0.5, y - s * 0.22);
  g.quadraticCurveTo(x - s * 0.32, y - s * 0.3, x - s * 0.18, y - s * 0.1);
  g.quadraticCurveTo(x - s * 0.12, y - s * 0.28, x, y - s * 0.12);
  g.closePath();
}

// ---------------------------------------------------------------------------
// Papéis de parede (claros: a cor de cada cômodo vem da cor por vértice)
// ---------------------------------------------------------------------------
function damask(rng) {
  const S = 512;
  const [c, g] = canvas(S);
  const bgd = g.createLinearGradient(0, 0, S, 0);
  bgd.addColorStop(0, '#c8c2cc');
  bgd.addColorStop(0.5, '#d2ccd4');
  bgd.addColorStop(1, '#c8c2cc');
  g.fillStyle = bgd;
  g.fillRect(0, 0, S, S);
  const motif = (x, y) => {
    g.save();
    g.translate(x, y);
    g.fillStyle = 'rgba(92,80,104,0.62)';
    g.strokeStyle = 'rgba(92,80,104,0.62)';
    g.lineWidth = 5;
    // medalhão: gota dupla com volutas
    g.beginPath();
    g.moveTo(0, -120);
    g.bezierCurveTo(70, -90, 80, -20, 40, 30);
    g.bezierCurveTo(20, 60, 30, 100, 0, 124);
    g.bezierCurveTo(-30, 100, -20, 60, -40, 30);
    g.bezierCurveTo(-80, -20, -70, -90, 0, -120);
    g.closePath();
    g.stroke();
    g.beginPath();
    g.moveTo(0, -96);
    g.bezierCurveTo(50, -70, 58, -18, 28, 22);
    g.bezierCurveTo(12, 46, 20, 80, 0, 98);
    g.bezierCurveTo(-20, 80, -12, 46, -28, 22);
    g.bezierCurveTo(-58, -18, -50, -70, 0, -96);
    g.closePath();
    g.globalAlpha = 0.35;
    g.fill();
    g.globalAlpha = 1;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(s * 40, 30);
      g.bezierCurveTo(s * 95, 20, s * 110, -40, s * 80, -60);
      g.bezierCurveTo(s * 60, -72, s * 50, -50, s * 64, -40);
      g.stroke();
      g.beginPath();
      g.arc(s * 64, -46, 8, 0, TAU);
      g.fill();
      // folhas
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.ellipse(s * (20 + i * 10), 60 + i * 18, 6, 16, s * (0.6 + i * 0.2), 0, TAU);
        g.fill();
      }
    }
    batPath(g, 0, -8, 86);
    g.fillStyle = 'rgba(60,48,72,0.8)';
    g.fill();
    g.beginPath();
    g.arc(0, 64, 9, 0, TAU);
    g.fill();
    g.restore();
  };
  wrap9(S, S, (ox, oy) => {
    motif(S * 0.25 + ox, S * 0.25 + oy);
    motif(S * 0.75 + ox, S * 0.75 + oy);
  });
  // flor-de-lis pequena entre os medalhões
  g.fillStyle = 'rgba(92,80,104,0.45)';
  wrap9(S, S, (ox, oy) => {
    for (const [x, y] of [[S * 0.75, S * 0.25], [S * 0.25, S * 0.75]]) {
      g.beginPath();
      g.arc(x + ox, y + oy, 10, 0, TAU);
      g.fill();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU;
        g.beginPath();
        g.ellipse(x + ox + Math.cos(a) * 22, y + oy + Math.sin(a) * 22, 7, 14, a + Math.PI / 2, 0, TAU);
        g.fill();
      }
    }
  });
  grime(g, S, S, rng, { speck: 0.05, stains: 5, dark: 0.14 });
  return tex(c);
}

function stripes(rng) {
  const S = 256;
  const [c, g] = canvas(S);
  g.fillStyle = '#d6d0c8';
  g.fillRect(0, 0, S, S);
  g.fillStyle = '#9a948c';
  g.fillRect(0, 0, S * 0.38, S);
  g.fillStyle = '#b8b2aa';
  g.fillRect(S * 0.38, 0, 8, S);
  g.fillRect(S * 0.95, 0, 8, S);
  g.fillStyle = '#7a746c';
  g.fillRect(S * 0.66, 0, 4, S);
  // losangos com morceguinho na faixa clara
  g.fillStyle = 'rgba(110,100,96,0.7)';
  for (let y = 0; y < S; y += 64) {
    batPath(g, S * 0.66, y + 32, 34);
    g.fill();
  }
  g.fillStyle = 'rgba(230,224,216,0.55)';
  for (let y = 0; y < S; y += 32) {
    g.beginPath();
    g.moveTo(S * 0.19, y + 6);
    g.lineTo(S * 0.19 + 7, y + 16);
    g.lineTo(S * 0.19, y + 26);
    g.lineTo(S * 0.19 - 7, y + 16);
    g.closePath();
    g.fill();
  }
  grime(g, S, S, rng, { speck: 0.05, stains: 3, dark: 0.12 });
  return tex(c);
}

function plaster(rng) {
  const S = 256;
  const [c, g] = canvas(S);
  g.fillStyle = '#e2dcd0';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    const x = rng.range(0, S), y = rng.range(0, S), r = rng.range(6, 30);
    g.fillStyle = `rgba(${rng.pick(['150,130,110', '200,190,170', '120,110,100'])},${rng.range(0.04, 0.1)})`;
    wrap9(S, S, (ox, oy) => {
      g.beginPath();
      g.arc(x + ox, y + oy, r, 0, TAU);
      g.fill();
    });
  }
  // rachaduras finas
  g.strokeStyle = 'rgba(80,64,54,0.35)';
  g.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    let x = rng.range(0, S), y = rng.range(0, S);
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 7; k++) {
      x += rng.range(-14, 14);
      y += rng.range(4, 16);
      g.lineTo(x, y);
    }
    g.stroke();
  }
  grime(g, S, S, rng, { speck: 0.07, stains: 4, dark: 0.12 });
  return tex(c);
}

// ---------------------------------------------------------------------------
// Pisos
// ---------------------------------------------------------------------------
function parquet(rng) {
  // espinha de peixe: tábuas 4:1 a 45°
  const S = 512;
  const [c, g] = canvas(S);
  g.fillStyle = '#3a2418';
  g.fillRect(0, 0, S, S);
  const L = S / 4, Wd = L / 4;
  const tones = ['#8a5a3a', '#7a4e32', '#94643e', '#6e4428', '#835636'];
  g.save();
  g.translate(S / 2, S / 2);
  g.rotate(Math.PI / 4);
  const step = Wd;
  for (let i = -24; i < 24; i++) {
    for (let j = -12; j < 12; j++) {
      // duas tábuas em "V" por célula
      const x = j * L - i * step, y = i * step + j * L * 0 + j * 0;
      for (const [rx, ry, w, h] of [[x, i * Wd * 2, L, Wd], [x + L, i * Wd * 2 - L + Wd, Wd, L]]) {
        g.fillStyle = rng.pick(tones);
        g.fillRect(rx + 1, ry + 1, w - 2, h - 2);
        g.strokeStyle = 'rgba(40,20,10,0.25)';
        g.lineWidth = 1;
        for (let k = 0; k < 3; k++) {
          g.beginPath();
          const vertical = h > w;
          if (vertical) {
            const gx = rx + rng.range(3, w - 3);
            g.moveTo(gx, ry + 2);
            g.bezierCurveTo(gx + rng.range(-3, 3), ry + h * 0.3, gx + rng.range(-3, 3), ry + h * 0.7, gx, ry + h - 2);
          } else {
            const gy = ry + rng.range(3, h - 3);
            g.moveTo(rx + 2, gy);
            g.bezierCurveTo(rx + w * 0.3, gy + rng.range(-3, 3), rx + w * 0.7, gy + rng.range(-3, 3), rx + w - 2, gy);
          }
          g.stroke();
        }
      }
    }
  }
  g.restore();
  // verniz gasto
  grime(g, S, S, rng, { speck: 0.08, stains: 5, dark: 0.16 });
  return tex(c);
}

function marble(rng) {
  // xadrez preto e creme com veios (2x2 lajotas por repetição)
  const S = 512;
  const [c, g] = canvas(S);
  const half = S / 2;
  for (const [x, y, dark] of [[0, 0, true], [half, half, true], [half, 0, false], [0, half, false]]) {
    g.fillStyle = dark ? '#2c2634' : '#d8d0c2';
    g.fillRect(x, y, half, half);
    // veios
    g.save();
    g.beginPath();
    g.rect(x, y, half, half);
    g.clip();
    for (let v = 0; v < 5; v++) {
      g.strokeStyle = dark ? `rgba(150,130,170,${rng.range(0.15, 0.35)})` : `rgba(120,100,110,${rng.range(0.12, 0.3)})`;
      g.lineWidth = rng.range(0.8, 2.4);
      let px = x + rng.range(0, half), py = y + rng.range(0, half * 0.2);
      g.beginPath();
      g.moveTo(px, py);
      for (let k = 0; k < 12; k++) {
        px += rng.range(-18, 22);
        py += rng.range(10, 30);
        g.lineTo(px, py);
      }
      g.stroke();
    }
    const sh = g.createLinearGradient(x, y, x + half, y + half);
    sh.addColorStop(0, 'rgba(255,255,255,0.08)');
    sh.addColorStop(1, 'rgba(0,0,0,0.08)');
    g.fillStyle = sh;
    g.fillRect(x, y, half, half);
    g.restore();
  }
  g.strokeStyle = '#6a5a60';
  g.lineWidth = 3;
  g.strokeRect(1.5, 1.5, half - 3, half - 3);
  g.strokeRect(half + 1.5, half + 1.5, half - 3, half - 3);
  g.strokeRect(half + 1.5, 1.5, half - 3, half - 3);
  g.strokeRect(1.5, half + 1.5, half - 3, half - 3);
  grime(g, S, S, rng, { speck: 0.04, stains: 3, dark: 0.1 });
  return tex(c);
}

function stone(rng, { flag = false } = {}) {
  const S = 512;
  const [c, g] = canvas(S);
  g.fillStyle = '#3a363e';
  g.fillRect(0, 0, S, S);
  const rows = flag ? 4 : 8;
  const rh = S / rows;
  for (let r = 0; r < rows; r++) {
    let x = r % 2 ? -rng.range(10, 60) : 0;
    while (x < S) {
      const w = flag ? rng.range(90, 150) : rng.range(50, 120);
      const base = rng.range(96, 136);
      const tint = rng.range(-10, 10);
      const col = `rgb(${base + tint},${base - 4},${base + 8 + tint})`;
      const draw = (ox) => {
        g.fillStyle = col;
        g.beginPath();
        const x0 = x + 3 + ox, y0 = r * rh + 3, x1 = x + w - 3 + ox, y1 = (r + 1) * rh - 3;
        const k = 7;
        g.moveTo(x0 + k, y0);
        g.lineTo(x1 - k, y0 + rng.range(-1, 1));
        g.quadraticCurveTo(x1, y0, x1, y0 + k);
        g.lineTo(x1 + rng.range(-1, 1), y1 - k);
        g.quadraticCurveTo(x1, y1, x1 - k, y1);
        g.lineTo(x0 + k, y1);
        g.quadraticCurveTo(x0, y1, x0, y1 - k);
        g.lineTo(x0, y0 + k);
        g.quadraticCurveTo(x0, y0, x0 + k, y0);
        g.fill();
        // luz de cima, sombra embaixo (dá relevo)
        g.fillStyle = 'rgba(255,255,255,0.08)';
        g.fillRect(x0 + 4, y0 + 2, x1 - x0 - 8, 4);
        g.fillStyle = 'rgba(0,0,0,0.16)';
        g.fillRect(x0 + 4, y1 - 5, x1 - x0 - 8, 4);
      };
      draw(0);
      if (x + w > S) draw(-S);
      if (x < 0) draw(S);
      x += w;
    }
  }
  grime(g, S, S, rng, { speck: 0.12, stains: 9, dark: 0.22 });
  // musgo/umidade no porão
  for (let i = 0; i < 14; i++) {
    const x = rng.range(0, S), y = rng.range(0, S);
    g.fillStyle = `rgba(80,110,70,${rng.range(0.05, 0.14)})`;
    g.beginPath();
    g.arc(x, y, rng.range(8, 26), 0, TAU);
    g.fill();
  }
  return tex(c);
}

function tiles(rng, { checker = false, n = 8, a = '#e8e4dc', b = '#1e1a22', grout = '#8a8478' } = {}) {
  const S = 256;
  const [c, g] = canvas(S);
  g.fillStyle = grout;
  g.fillRect(0, 0, S, S);
  const t = S / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const dark = checker && (i + j) % 2 === 1;
      const base = new THREE.Color(dark ? b : a).offsetHSL(0, 0, rng.range(-0.04, 0.03));
      g.fillStyle = `#${base.getHexString()}`;
      g.fillRect(i * t + 1.5, j * t + 1.5, t - 3, t - 3);
      const hl = g.createLinearGradient(i * t, j * t, i * t + t, j * t + t);
      hl.addColorStop(0, 'rgba(255,255,255,0.22)');
      hl.addColorStop(0.5, 'rgba(255,255,255,0)');
      hl.addColorStop(1, 'rgba(0,0,0,0.12)');
      g.fillStyle = hl;
      g.fillRect(i * t + 1.5, j * t + 1.5, t - 3, t - 3);
      if (rng.chance(0.06)) {
        g.strokeStyle = 'rgba(40,30,30,0.5)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(i * t + rng.range(2, t - 2), j * t + 2);
        g.lineTo(i * t + rng.range(2, t - 2), j * t + t - 2);
        g.stroke();
      }
    }
  }
  grime(g, S, S, rng, { speck: 0.04, stains: 3, dark: 0.1 });
  return tex(c);
}

function planks(rng) {
  const S = 512;
  const [c, g] = canvas(S);
  const n = 6;
  const w = S / n;
  for (let i = 0; i < n; i++) {
    let y = -rng.range(0, 200);
    while (y < S) {
      const len = rng.range(180, 320);
      const tone = rng.range(0.82, 1.12);
      const col = `rgb(${Math.round(128 * tone)},${Math.round(96 * tone)},${Math.round(70 * tone)})`;
      const draw = (oy) => {
        g.fillStyle = col;
        g.fillRect(i * w + 1.5, y + oy + 1.5, w - 3, len - 3);
        g.strokeStyle = 'rgba(60,36,24,0.3)';
        g.lineWidth = 1;
        for (let k = 0; k < 5; k++) {
          const gx = i * w + rng.range(4, w - 4);
          g.beginPath();
          g.moveTo(gx, y + oy + 2);
          g.bezierCurveTo(gx + rng.range(-5, 5), y + oy + len * 0.3, gx + rng.range(-5, 5), y + oy + len * 0.7, gx, y + oy + len - 2);
          g.stroke();
        }
        if (rng.chance(0.5)) {
          const kx = i * w + rng.range(12, w - 12), ky = y + oy + rng.range(20, len - 20);
          g.fillStyle = 'rgba(60,34,20,0.55)';
          g.beginPath();
          g.ellipse(kx, ky, 5, 9, 0, 0, TAU);
          g.fill();
        }
        g.fillStyle = '#2a2024';
        for (const ny of [y + oy + 10, y + oy + len - 12]) for (const nx of [i * w + 8, i * w + w - 8]) g.fillRect(nx - 1.5, ny - 1.5, 3, 3);
      };
      draw(0);
      if (y + len > S) draw(-S);
      if (y < 0) draw(S);
      y += len;
    }
  }
  grime(g, S, S, rng, { speck: 0.1, stains: 7, dark: 0.2 });
  return tex(c);
}

function carpet(rng) {
  const S = 512;
  const [c, g] = canvas(S);
  g.fillStyle = '#6a1a26';
  g.fillRect(0, 0, S, S);
  g.strokeStyle = '#8a2a36';
  g.lineWidth = 10;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const x = i * 128 + 64, y = j * 128 + 64;
      g.beginPath();
      g.moveTo(x, y - 46);
      g.lineTo(x + 46, y);
      g.lineTo(x, y + 46);
      g.lineTo(x - 46, y);
      g.closePath();
      g.stroke();
      g.fillStyle = (i + j) % 2 ? '#b8903a' : '#3a1a3a';
      g.beginPath();
      g.arc(x, y, 12, 0, TAU);
      g.fill();
    }
  }
  // pelo do carpete
  const img = g.getImageData(0, 0, S, S);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng.next() - 0.5) * 34;
    d[i] = clamp(d[i] + n, 0, 255);
    d[i + 1] = clamp(d[i + 1] + n * 0.6, 0, 255);
    d[i + 2] = clamp(d[i + 2] + n * 0.6, 0, 255);
  }
  g.putImageData(img, 0, 0);
  return tex(c);
}

function woodPanel(rng) {
  const S = 256;
  const [c, g] = canvas(S);
  g.fillStyle = '#5a3a28';
  g.fillRect(0, 0, S, S);
  g.strokeStyle = 'rgba(30,16,8,0.35)';
  for (let k = 0; k < 40; k++) {
    const x = rng.range(0, S);
    g.lineWidth = rng.range(0.6, 2);
    g.beginPath();
    g.moveTo(x, 0);
    g.bezierCurveTo(x + rng.range(-10, 10), S * 0.33, x + rng.range(-10, 10), S * 0.66, x, S);
    g.stroke();
  }
  grime(g, S, S, rng, { speck: 0.06, stains: 3, dark: 0.15 });
  return tex(c);
}

// ---------------------------------------------------------------------------
// Tapetes (atlas 2x2, sem repetição): 0 persa vermelho, 1 roxo com morcegos, 2 passadeira, 3 verde gasto
// ---------------------------------------------------------------------------
function rugs(rng) {
  const S = 1024, H = S / 2;
  const [c, g] = canvas(S);
  const rugAt = (ox, oy, pal, style) => {
    g.save();
    g.translate(ox, oy);
    g.fillStyle = pal[0];
    g.fillRect(0, 0, H, H);
    // bordas
    for (let i = 0; i < 3; i++) {
      g.strokeStyle = pal[1 + (i % 2)];
      g.lineWidth = 14 - i * 3;
      g.strokeRect(18 + i * 22, 18 + i * 22, H - 36 - i * 44, H - 36 - i * 44);
    }
    // gregas na borda
    g.fillStyle = pal[2];
    for (let k = 0; k < 20; k++) {
      const t = 40 + (k * (H - 80)) / 20;
      for (const [x, y] of [[t, 50], [t, H - 50], [50, t], [H - 50, t]]) {
        g.beginPath();
        g.moveTo(x, y - 7);
        g.lineTo(x + 7, y);
        g.lineTo(x, y + 7);
        g.lineTo(x - 7, y);
        g.closePath();
        g.fill();
      }
    }
    // centro
    const cx = H / 2, cy = H / 2;
    if (style === 'medal') {
      for (let r = 5; r > 0; r--) {
        g.fillStyle = r % 2 ? pal[1] : pal[3];
        g.beginPath();
        for (let i = 0; i <= 16; i++) {
          const a = (i / 16) * TAU;
          const rr = r * 26 * (i % 2 ? 0.8 : 1.0);
          g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8);
        }
        g.fill();
      }
      g.fillStyle = pal[2];
      for (const [x, y] of [[110, 110], [H - 110, 110], [110, H - 110], [H - 110, H - 110]]) {
        g.beginPath();
        g.arc(x, y, 26, 0, TAU);
        g.fill();
      }
    } else if (style === 'bats') {
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          batPath(g, 140 + i * 116, 150 + j * 110, 90);
          g.fillStyle = (i + j) % 2 ? pal[2] : pal[3];
          g.fill();
        }
      }
    } else if (style === 'runner') {
      for (let k = 0; k < 6; k++) {
        const y = 90 + k * 60;
        g.fillStyle = k % 2 ? pal[3] : pal[1];
        g.beginPath();
        g.moveTo(cx, y - 22);
        g.lineTo(cx + 60, y);
        g.lineTo(cx, y + 22);
        g.lineTo(cx - 60, y);
        g.closePath();
        g.fill();
      }
    } else {
      g.strokeStyle = pal[3];
      g.lineWidth = 6;
      for (let r = 40; r < 200; r += 34) {
        g.beginPath();
        g.ellipse(cx, cy, r, r * 0.7, 0, 0, TAU);
        g.stroke();
      }
    }
    g.restore();
  };
  rugAt(0, 0, ['#7a1e24', '#c89a4a', '#1e2848', '#a8303a'], 'medal');
  rugAt(H, 0, ['#3a2248', '#8a5aa0', '#d8b860', '#1e1228'], 'bats');
  rugAt(0, H, ['#8a1e2a', '#d8a84a', '#e8d8b0', '#5a1018'], 'runner');
  rugAt(H, H, ['#2e4a3a', '#8aa86a', '#d8c890', '#1a2a22'], 'rings');
  // gasto no meio e franja clara nas pontas
  const img = g.getImageData(0, 0, S, S);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng.next() - 0.5) * 30;
    d[i] = clamp(d[i] + n, 0, 255);
    d[i + 1] = clamp(d[i + 1] + n, 0, 255);
    d[i + 2] = clamp(d[i + 2] + n, 0, 255);
  }
  g.putImageData(img, 0, 0);
  return tex(c, { repeat: false });
}

// ---------------------------------------------------------------------------
// Retratos dos antepassados (atlas 4 x 2 de 256 x 512)
// ---------------------------------------------------------------------------
export const PORTRAITS = {
  conde: 0, tia: 1, vovo: 2, bisa: 3, mansao: 4, familia: 5, formatura: 6, gato: 7,
};
function portraits(rng) {
  const W = 256, H = 512;
  const [c, g] = canvas(W * 4, H * 2);
  const oil = (x0, y0, c1, c2) => {
    const grd = g.createRadialGradient(x0 + W * 0.5, y0 + H * 0.4, 20, x0 + W * 0.5, y0 + H * 0.5, H * 0.7);
    grd.addColorStop(0, c1);
    grd.addColorStop(1, c2);
    g.fillStyle = grd;
    g.fillRect(x0, y0, W, H);
  };
  const face = (x, y, r, skin, ry = 1.18) => {
    g.fillStyle = skin;
    g.beginPath();
    g.ellipse(x, y, r, r * ry, 0, 0, TAU);
    g.fill();
    // sombra lateral
    g.fillStyle = 'rgba(40,20,60,0.22)';
    g.beginPath();
    g.ellipse(x + r * 0.35, y + r * 0.1, r * 0.6, r * ry * 0.95, 0, -1.2, 1.2);
    g.fill();
  };
  const eyes = (x, y, sep, r, pupil = '#b01020', lids = false) => {
    for (const s of [-1, 1]) {
      g.fillStyle = '#f4ecd8';
      g.beginPath();
      g.ellipse(x + s * sep, y, r, r * 0.72, 0, 0, TAU);
      g.fill();
      g.fillStyle = pupil;
      g.beginPath();
      g.arc(x + s * sep, y + 1, r * 0.45, 0, TAU);
      g.fill();
      if (lids) {
        g.fillStyle = 'rgba(40,20,40,0.6)';
        g.fillRect(x + s * sep - r, y - r * 0.9, r * 2, r * 0.6);
      }
    }
  };
  const fangs = (x, y, s = 1) => {
    g.fillStyle = '#fffaf0';
    for (const k of [-1, 1]) {
      g.beginPath();
      g.moveTo(x + k * 7 * s, y);
      g.lineTo(x + k * 12 * s, y);
      g.lineTo(x + k * 9.5 * s, y + 14 * s);
      g.closePath();
      g.fill();
    }
  };
  const mouth = (x, y, w) => {
    g.strokeStyle = '#3a1020';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x - w, y);
    g.quadraticCurveTo(x, y + w * 0.5, x + w, y);
    g.stroke();
  };
  const shoulders = (x0, y0, col, collar = '#8a1a2a') => {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(x0 + 10, y0 + H);
    g.bezierCurveTo(x0 + 20, y0 + 330, x0 + 60, y0 + 300, x0 + W / 2, y0 + 300);
    g.bezierCurveTo(x0 + W - 60, y0 + 300, x0 + W - 20, y0 + 330, x0 + W - 10, y0 + H);
    g.fill();
    g.fillStyle = collar;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(x0 + W / 2 + s * 30, y0 + 300);
      g.lineTo(x0 + W / 2 + s * 100, y0 + 220);
      g.lineTo(x0 + W / 2 + s * 70, y0 + 330);
      g.closePath();
      g.fill();
    }
  };
  const cell = (i) => [(i % 4) * W, Math.floor(i / 4) * H];

  // 0 · Conde Dentúcio jovem
  {
    const [x0, y0] = cell(0);
    oil(x0, y0, '#4a3a5a', '#120c1a');
    shoulders(x0, y0, '#16121c');
    g.fillStyle = '#e8e2d8';
    g.fillRect(x0 + W / 2 - 18, y0 + 300, 36, 60);
    face(x0 + W / 2, y0 + 210, 62, '#c8d0e0');
    g.fillStyle = '#0e0c12';
    g.beginPath();
    g.moveTo(x0 + W / 2 - 66, y0 + 190);
    g.quadraticCurveTo(x0 + W / 2, y0 + 110, x0 + W / 2 + 66, y0 + 190);
    g.lineTo(x0 + W / 2 + 60, y0 + 160);
    g.quadraticCurveTo(x0 + W / 2 + 10, y0 + 130, x0 + W / 2, y0 + 168);
    g.quadraticCurveTo(x0 + W / 2 - 10, y0 + 130, x0 + W / 2 - 60, y0 + 160);
    g.closePath();
    g.fill();
    eyes(x0 + W / 2, y0 + 205, 24, 12);
    mouth(x0 + W / 2, y0 + 250, 18);
    fangs(x0 + W / 2, y0 + 252);
  }
  // 1 · Tia Morcegália (coque em forma de morcego, óculos gatinho, colar de pérolas)
  {
    const [x0, y0] = cell(1);
    oil(x0, y0, '#5a3a4a', '#1a0c14');
    shoulders(x0, y0, '#3a1a3a', '#5a2a5a');
    g.fillStyle = '#f0ece0';
    for (let i = 0; i < 11; i++) {
      const a = Math.PI * (0.15 + (i / 10) * 0.7);
      g.beginPath();
      g.arc(x0 + W / 2 + Math.cos(a) * 58, y0 + 290 + Math.sin(a) * 30, 7, 0, TAU);
      g.fill();
    }
    face(x0 + W / 2, y0 + 220, 56, '#d8c8d8');
    g.fillStyle = '#2a2230';
    batPath(g, x0 + W / 2, y0 + 130, 200);
    g.fill();
    g.strokeStyle = '#d8a83a';
    g.lineWidth = 4;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(x0 + W / 2 + s * 8, y0 + 212);
      g.lineTo(x0 + W / 2 + s * 44, y0 + 204);
      g.lineTo(x0 + W / 2 + s * 36, y0 + 226);
      g.closePath();
      g.stroke();
    }
    eyes(x0 + W / 2, y0 + 215, 22, 9, '#6a1a4a');
    g.fillStyle = '#9a2a4a';
    g.beginPath();
    g.ellipse(x0 + W / 2, y0 + 258, 14, 6, 0, 0, TAU);
    g.fill();
  }
  // 2 · Vovô Dentúcio I (monóculo e bigodão)
  {
    const [x0, y0] = cell(2);
    oil(x0, y0, '#3a4a4a', '#0c1414');
    shoulders(x0, y0, '#1a2222', '#3a4a3a');
    face(x0 + W / 2, y0 + 210, 64, '#b8c0c8', 1.25);
    g.fillStyle = '#d8d8d8';
    g.beginPath();
    g.ellipse(x0 + W / 2, y0 + 138, 60, 18, 0, 0, TAU);
    g.fill();
    eyes(x0 + W / 2, y0 + 200, 26, 11, '#8a1a1a', true);
    g.strokeStyle = '#d8b04a';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(x0 + W / 2 + 26, y0 + 200, 17, 0, TAU);
    g.stroke();
    g.beginPath();
    g.moveTo(x0 + W / 2 + 43, y0 + 204);
    g.quadraticCurveTo(x0 + W / 2 + 60, y0 + 260, x0 + W / 2 + 50, y0 + 320);
    g.stroke();
    g.fillStyle = '#e8e8e0';
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(x0 + W / 2, y0 + 240);
      g.bezierCurveTo(x0 + W / 2 + s * 40, y0 + 228, x0 + W / 2 + s * 70, y0 + 240, x0 + W / 2 + s * 86, y0 + 216);
      g.bezierCurveTo(x0 + W / 2 + s * 70, y0 + 262, x0 + W / 2 + s * 30, y0 + 256, x0 + W / 2, y0 + 250);
      g.fill();
    }
    fangs(x0 + W / 2, y0 + 252, 0.8);
  }
  // 3 · Bisa Dentúcia (penteado altíssimo e gola rendada)
  {
    const [x0, y0] = cell(3);
    oil(x0, y0, '#4a3a2a', '#140c06');
    shoulders(x0, y0, '#2a1a12', '#e8e0d0');
    g.fillStyle = '#2a1a2a';
    g.beginPath();
    g.ellipse(x0 + W / 2, y0 + 110, 56, 110, 0, 0, TAU);
    g.fill();
    g.strokeStyle = '#4a2a4a';
    g.lineWidth = 6;
    for (let k = 0; k < 6; k++) {
      g.beginPath();
      g.ellipse(x0 + W / 2, y0 + 40 + k * 26, 44 - k * 2, 10, 0, 0, Math.PI);
      g.stroke();
    }
    face(x0 + W / 2, y0 + 236, 50, '#d0c8c0');
    eyes(x0 + W / 2, y0 + 230, 20, 9, '#7a1a2a', true);
    mouth(x0 + W / 2, y0 + 262, 12);
    g.fillStyle = '#f0e8d8';
    for (let i = 0; i < 14; i++) {
      const a = Math.PI * (i / 13);
      g.beginPath();
      g.arc(x0 + W / 2 + Math.cos(a) * 70, y0 + 300 - Math.sin(a) * 20, 14, 0, TAU);
      g.fill();
    }
  }
  // 4 · paisagem: a mansão na colina sob a lua
  {
    const [x0, y0] = cell(4);
    const sky = g.createLinearGradient(0, y0, 0, y0 + H);
    sky.addColorStop(0, '#0e1236');
    sky.addColorStop(0.7, '#4a3070');
    sky.addColorStop(1, '#2a1a30');
    g.fillStyle = sky;
    g.fillRect(x0, y0, W, H);
    g.fillStyle = '#f4ecc4';
    g.beginPath();
    g.arc(x0 + 180, y0 + 110, 40, 0, TAU);
    g.fill();
    g.fillStyle = '#2a1a36';
    g.beginPath();
    g.moveTo(x0, y0 + 400);
    g.quadraticCurveTo(x0 + W / 2, y0 + 250, x0 + W, y0 + 420);
    g.lineTo(x0 + W, y0 + H);
    g.lineTo(x0, y0 + H);
    g.fill();
    g.fillStyle = '#161020';
    g.fillRect(x0 + 80, y0 + 250, 100, 80);
    for (const x of [74, 186]) {
      g.fillRect(x0 + x - 14, y0 + 200, 28, 130);
      g.beginPath();
      g.moveTo(x0 + x - 20, y0 + 204);
      g.lineTo(x0 + x + 8, y0 + 130);
      g.lineTo(x0 + x + 20, y0 + 204);
      g.fill();
    }
    g.beginPath();
    g.moveTo(x0 + 74, y0 + 252);
    g.lineTo(x0 + 130, y0 + 205);
    g.lineTo(x0 + 186, y0 + 252);
    g.fill();
    g.fillStyle = '#ff9a4a';
    for (const [x, y] of [[100, 270], [130, 270], [160, 270], [115, 300], [145, 300]]) g.fillRect(x0 + x, y0 + y, 8, 12);
    g.fillStyle = '#0c0a12';
    for (let i = 0; i < 6; i++) {
      batPath(g, x0 + rng.range(20, 230), y0 + rng.range(60, 200), rng.range(20, 34));
      g.fill();
    }
  }
  // 5 · família de morcegos pendurados
  {
    const [x0, y0] = cell(5);
    oil(x0, y0, '#6a5a3a', '#1a140a');
    g.strokeStyle = '#3a2a1a';
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(x0 + 10, y0 + 110);
    g.lineTo(x0 + W - 10, y0 + 110);
    g.stroke();
    for (const [x, s] of [[60, 1.1], [128, 1.4], [196, 0.9]]) {
      g.save();
      g.translate(x0 + x, y0 + 110);
      g.scale(s, s);
      g.fillStyle = '#1a1422';
      g.beginPath();
      g.ellipse(0, 60, 26, 52, 0, 0, TAU);
      g.fill();
      g.fillStyle = '#f4ecd8';
      g.beginPath();
      g.arc(-9, 88, 6, 0, TAU);
      g.arc(9, 88, 6, 0, TAU);
      g.fill();
      g.fillStyle = '#b01020';
      g.beginPath();
      g.arc(-9, 88, 2.5, 0, TAU);
      g.arc(9, 88, 2.5, 0, TAU);
      g.fill();
      g.restore();
    }
  }
  // 6 · retrato de formatura do Conde (capelo e diploma "Doutor em Sustos")
  {
    const [x0, y0] = cell(6);
    oil(x0, y0, '#3a3a5a', '#0e0e1a');
    shoulders(x0, y0, '#101018', '#3a3a6a');
    face(x0 + W / 2, y0 + 220, 58, '#c8d0e0');
    g.fillStyle = '#101018';
    g.fillRect(x0 + W / 2 - 80, y0 + 138, 160, 16);
    g.fillRect(x0 + W / 2 - 40, y0 + 154, 80, 26);
    g.strokeStyle = '#d8b04a';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(x0 + W / 2 + 40, y0 + 146);
    g.lineTo(x0 + W / 2 + 70, y0 + 200);
    g.stroke();
    eyes(x0 + W / 2, y0 + 214, 22, 11);
    mouth(x0 + W / 2, y0 + 256, 20);
    fangs(x0 + W / 2, y0 + 258);
    g.fillStyle = '#e8dcc0';
    g.fillRect(x0 + 150, y0 + 380, 70, 26);
    g.fillStyle = '#b01020';
    g.fillRect(x0 + 180, y0 + 380, 8, 26);
  }
  // 7 · o gato-morcego de estimação
  {
    const [x0, y0] = cell(7);
    oil(x0, y0, '#4a5a4a', '#0e140e');
    g.fillStyle = '#1a1a1a';
    g.beginPath();
    g.ellipse(x0 + W / 2, y0 + 320, 80, 90, 0, 0, TAU);
    g.fill();
    g.beginPath();
    g.arc(x0 + W / 2, y0 + 210, 56, 0, TAU);
    g.fill();
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(x0 + W / 2 + s * 20, y0 + 170);
      g.lineTo(x0 + W / 2 + s * 56, y0 + 130);
      g.lineTo(x0 + W / 2 + s * 50, y0 + 196);
      g.fill();
      g.beginPath();
      g.moveTo(x0 + W / 2 + s * 60, y0 + 290);
      g.quadraticCurveTo(x0 + W / 2 + s * 130, y0 + 230, x0 + W / 2 + s * 120, y0 + 330);
      g.quadraticCurveTo(x0 + W / 2 + s * 100, y0 + 300, x0 + W / 2 + s * 70, y0 + 340);
      g.fill();
    }
    g.fillStyle = '#d8e04a';
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(x0 + W / 2 + s * 22, y0 + 206, 12, 9, 0, 0, TAU);
      g.fill();
    }
    g.fillStyle = '#101010';
    for (const s of [-1, 1]) g.fillRect(x0 + W / 2 + s * 22 - 2, y0 + 198, 4, 16);
  }
  // pinceladas e craquelê por cima de tudo
  const img = g.getImageData(0, 0, W * 4, H * 2);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng.next() - 0.5) * 22;
    d[i] = clamp(d[i] + n, 0, 255);
    d[i + 1] = clamp(d[i + 1] + n, 0, 255);
    d[i + 2] = clamp(d[i + 2] + n, 0, 255);
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(20,12,8,0.18)';
  g.lineWidth = 0.8;
  for (let k = 0; k < 500; k++) {
    let x = rng.range(0, W * 4), y = rng.range(0, H * 2);
    g.beginPath();
    g.moveTo(x, y);
    for (let s = 0; s < 3; s++) {
      x += rng.range(-10, 10);
      y += rng.range(-10, 10);
      g.lineTo(x, y);
    }
    g.stroke();
  }
  // verniz amarelado
  g.fillStyle = 'rgba(160,120,40,0.12)';
  g.fillRect(0, 0, W * 4, H * 2);
  return tex(c, { repeat: false });
}

// ---------------------------------------------------------------------------
// Rótulos e placas (atlas de 8 x 8 células de 128 x 64 com texto)
// ---------------------------------------------------------------------------
export const LABELS = [
  ['SANGUE', 'tipo O+', '#e8dcc0', '#8a1a1a'],
  ['SANGUE', 'tipo A−', '#e8dcc0', '#8a1a1a'],
  ['SANGUE', 'tipo B+', '#e8dcc0', '#8a1a1a'],
  ['Suco de', 'TOMATE', '#f0e0c0', '#c8401a'],
  ['PROIBIDO', 'ALHO!', '#f4ecd8', '#b01010'],
  ['Safra', '1703', '#d8c8a0', '#3a1a1a'],
  ['Sabão', 'Fantasma', '#d8e8f0', '#2a4a6a'],
  ['Vovô', 'Dentúcio I', '#b8b0a0', '#1a1410'],
  ['Bisa', 'Dentúcia', '#b8b0a0', '#1a1410'],
  ['Tio', 'Morcegão', '#b8b0a0', '#1a1410'],
  ['FESTA DOS', 'MORCEGOS', '#f0d060', '#6a1a6a'],
  ['CONDE', 'DENTÚCIO', '#d8b04a', '#1a1008'],
  ['Tia', 'Morcegália', '#d8b04a', '#1a1008'],
  ['Farinha', 'de Osso', '#e8e0d0', '#5a4a3a'],
  ['Pó de', 'Morcego', '#e0d0e8', '#4a2a5a'],
  ['Sal', 'Grosso', '#f0f0f0', '#3a3a4a'],
  ['Manual do', 'Mordomo', '#6a1a2a', '#e8d8a8'],
  ['NÃO', 'ABRIR', '#e8dcc0', '#1a1a1a'],
  ['Doutor em', 'Sustos', '#e8dcc0', '#3a2a1a'],
  ['Bis', 'Dentúcio', '#b8b0a0', '#1a1410'],
  ['Sopa', 'do Dia', '#f4ecd8', '#6a2a1a'],
  ['Geladeira', 'de Sangue', '#e8f0f8', '#8a1a1a'],
  ['Capas', 'Limpas', '#e8e8f0', '#2a2a4a'],
  ['Meias', '(pares)', '#f0e8e0', '#4a3a3a'],
];
function labels() {
  const CW = 128, CH = 64, N = 8;
  const [c, g] = canvas(CW * N, CH * N);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  LABELS.forEach(([a, b, bg, fg], i) => {
    const x = (i % N) * CW, y = Math.floor(i / N) * CH;
    g.fillStyle = bg;
    g.fillRect(x + 2, y + 2, CW - 4, CH - 4);
    g.strokeStyle = fg;
    g.lineWidth = 2;
    g.strokeRect(x + 6, y + 6, CW - 12, CH - 12);
    g.fillStyle = fg;
    g.font = '400 18px "IM Fell English", serif';
    g.fillText(a, x + CW / 2, y + 22);
    g.font = '700 21px "Mountains of Christmas", serif';
    g.fillText(b, x + CW / 2, y + 44);
  });
  return tex(c, { repeat: false });
}
/** uv [su, sv, ou, ov] da etiqueta i no atlas (para UVBuilder.add com t.uv) */
export function labelUV(i) {
  const N = 8;
  return [1 / N, 1 / N, (i % N) / N, 1 - (Math.floor(i / N) + 1) / N];
}
export function portraitUV(i) {
  return [1 / 4, 1 / 2, (i % 4) / 4, 1 - (Math.floor(i / 4) + 1) / 2];
}
export function rugUV(i) {
  return [0.5, 0.5, (i % 2) * 0.5, 1 - (Math.floor(i / 2) + 1) * 0.5];
}

// ---------------------------------------------------------------------------
// Vitral, teia, vista da janela, facho de luz
// ---------------------------------------------------------------------------
function roseWindow() {
  const S = 512;
  const [c, g] = canvas(S);
  const cx = S / 2, R = S / 2 - 6;
  const pal = ['#7a2aa8', '#c83a3a', '#e8a83a', '#2a8a9a', '#5a3ac8', '#d86a2a'];
  for (let i = 0; i < 12; i++) {
    const a0 = (i / 12) * TAU, a1 = ((i + 1) / 12) * TAU;
    for (const [r0, r1, off] of [[R * 0.72, R, 0], [R * 0.36, R * 0.72, 2]]) {
      g.fillStyle = pal[(i + off) % pal.length];
      g.beginPath();
      g.arc(cx, cx, r1, a0, a1);
      g.arc(cx, cx, r0, a1, a0, true);
      g.closePath();
      g.fill();
    }
  }
  g.fillStyle = '#e8d890';
  g.beginPath();
  g.arc(cx, cx, R * 0.36, 0, TAU);
  g.fill();
  g.fillStyle = '#1a1020';
  batPath(g, cx, cx + 6, R * 0.62);
  g.fill();
  g.strokeStyle = '#120a12';
  g.lineWidth = 9;
  for (const r of [R * 0.36, R * 0.72, R - 3]) {
    g.beginPath();
    g.arc(cx, cx, r, 0, TAU);
    g.stroke();
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * R * 0.36, cx + Math.sin(a) * R * 0.36);
    g.lineTo(cx + Math.cos(a) * R, cx + Math.sin(a) * R);
    g.stroke();
  }
  // fora do círculo: transparente
  g.globalCompositeOperation = 'destination-in';
  g.fillStyle = '#000';
  g.beginPath();
  g.arc(cx, cx, R, 0, TAU);
  g.fill();
  g.globalCompositeOperation = 'source-over';
  return tex(c, { repeat: false });
}

function cobweb(rng) {
  const S = 256;
  const [c, g] = canvas(S);
  g.strokeStyle = 'rgba(235,235,245,0.75)';
  g.lineWidth = 1.4;
  const spokes = 9;
  const ang = [];
  for (let i = 0; i < spokes; i++) ang.push((i / (spokes - 1)) * (Math.PI / 2) + rng.range(-0.04, 0.04));
  for (const a of ang) {
    g.beginPath();
    g.moveTo(2, 2);
    g.lineTo(2 + Math.cos(a) * S * 1.1, 2 + Math.sin(a) * S * 1.1);
    g.stroke();
  }
  for (let r = 18; r < S * 1.05; r += rng.range(14, 22)) {
    g.beginPath();
    for (let i = 0; i < spokes; i++) {
      const a = ang[i];
      const rr = r * (0.94 + rng.range(-0.04, 0.04));
      const x = 2 + Math.cos(a) * rr, y = 2 + Math.sin(a) * rr;
      if (i === 0) g.moveTo(x, y);
      else {
        const am = (ang[i - 1] + a) / 2;
        g.quadraticCurveTo(2 + Math.cos(am) * rr * 0.9, 2 + Math.sin(am) * rr * 0.9, x, y);
      }
    }
    g.stroke();
  }
  return tex(c, { repeat: false });
}

function windowView(rng, night) {
  const W = 256, H = 512;
  const [c, g] = canvas(W, H);
  const sky = g.createLinearGradient(0, 0, 0, H);
  if (night) {
    sky.addColorStop(0, '#0a0c2a');
    sky.addColorStop(0.6, '#2a2458');
    sky.addColorStop(1, '#4a3268');
  } else {
    sky.addColorStop(0, '#5a86c8');
    sky.addColorStop(0.65, '#c8d8e0');
    sky.addColorStop(1, '#e8d8b8');
  }
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  if (night) {
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(255,255,240,${rng.range(0.3, 1)})`;
      g.fillRect(rng.range(0, W), rng.range(0, H * 0.7), 2, 2);
    }
    g.fillStyle = '#f8f0c8';
    g.beginPath();
    g.arc(W * 0.66, H * 0.22, 30, 0, TAU);
    g.fill();
    g.fillStyle = '#0a0c2a';
    g.beginPath();
    g.arc(W * 0.66 + 12, H * 0.22 - 8, 26, 0, TAU);
    g.fill();
  } else {
    g.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 5; i++) {
      const x = rng.range(0, W), y = rng.range(40, H * 0.5);
      for (let k = 0; k < 4; k++) {
        g.beginPath();
        g.ellipse(x + k * 18, y + rng.range(-5, 5), 26, 12, 0, 0, TAU);
        g.fill();
      }
    }
  }
  // colinas e árvores retorcidas no horizonte
  g.fillStyle = night ? '#140e20' : '#4a5a4a';
  g.beginPath();
  g.moveTo(0, H * 0.78);
  for (let x = 0; x <= W; x += 16) g.lineTo(x, H * 0.76 + Math.sin(x * 0.03) * 16 + rng.range(-3, 3));
  g.lineTo(W, H);
  g.lineTo(0, H);
  g.fill();
  g.strokeStyle = g.fillStyle;
  g.lineWidth = 4;
  for (let i = 0; i < 4; i++) {
    const x = rng.range(10, W - 10), y = H * 0.77;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + rng.range(-10, 10), y - 30, x + rng.range(-16, 16), y - 56);
    g.stroke();
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x, y - 30);
    g.quadraticCurveTo(x + 14, y - 40, x + 22, y - 36);
    g.stroke();
    g.lineWidth = 4;
  }
  return tex(c, { repeat: false });
}

function shaft() {
  const [c, g] = canvas(64, 256);
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, 'rgba(255,255,255,0.9)');
  grd.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 256);
  const side = g.createLinearGradient(0, 0, 64, 0);
  side.addColorStop(0, 'rgba(0,0,0,1)');
  side.addColorStop(0.25, 'rgba(0,0,0,0)');
  side.addColorStop(0.75, 'rgba(0,0,0,0)');
  side.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = side;
  g.fillRect(0, 0, 64, 256);
  return tex(c, { repeat: false });
}

/** gera todas as texturas do interior (as fontes precisam estar carregadas para os rótulos) */
export async function makeInteriorTextures(renderer) {
  try {
    await Promise.all([document.fonts.load('400 18px "IM Fell English"'), document.fonts.load('700 21px "Mountains of Christmas"')]);
  } catch {
    /* sem fontes: os rótulos saem na fonte padrão */
  }
  const rng = new RNG(1703);
  const aniso = Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() ?? 4);
  const T = {
    damask: damask(rng), stripes: stripes(rng), plaster: plaster(rng), parquet: parquet(rng), marble: marble(rng),
    stone: stone(rng), stoneTile: stone(rng, { flag: true }), tile: tiles(rng, { a: '#dcd6c8', n: 8, grout: '#7a7468' }),
    tileBath: tiles(rng, { a: '#e0ecec', n: 8, grout: '#9aa4a4' }), checker: tiles(rng, { checker: true, n: 6 }),
    planks: planks(rng), carpet: carpet(rng), woodPanel: woodPanel(rng), rugs: rugs(rng), portraits: portraits(rng),
    labels: labels(), rose: roseWindow(), cobweb: cobweb(rng), viewNight: windowView(rng, true), viewDay: windowView(rng, false), shaft: shaft(),
  };
  for (const k of ['parquet', 'marble', 'stone', 'stoneTile', 'checker', 'planks', 'carpet', 'tile', 'tileBath']) T[k].anisotropy = aniso;
  return T;
}

export const TEX_TILE = {
  damask: 1.4, stripes: 0.9, plaster: 1.6, panel: 1.2, woodPanel: 1.2, parquet: 1.6, marble: 1.4, stone: 2.2, stoneTile: 2.4,
  tile: 1.1, tileBath: 1.1, checker: 0.9, planks: 2.4, carpet: 2.0,
};
export { lerp };
