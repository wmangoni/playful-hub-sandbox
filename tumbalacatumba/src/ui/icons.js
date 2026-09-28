// Ícones desenhados em canvas: arte num quadrado de cantos tortos, com contorno de tinta e pontos de costura.
const cache = new Map();
const S = 64;
const INK = '#16101d';

function bg(g, c1, c2) {
  const grd = g.createRadialGradient(S * 0.4, S * 0.35, 4, S / 2, S / 2, S * 0.75);
  grd.addColorStop(0, c1);
  grd.addColorStop(1, c2);
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);
}
/** retângulo de cantos tortos (cada canto com um raio) */
function crookedRect(g, x, y, w, h, [a, b, c, d]) {
  g.beginPath();
  g.moveTo(x + a, y);
  g.lineTo(x + w - b, y);
  g.quadraticCurveTo(x + w, y, x + w, y + b);
  g.lineTo(x + w, y + h - c);
  g.quadraticCurveTo(x + w, y + h, x + w - c, y + h);
  g.lineTo(x + d, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - d);
  g.lineTo(x, y + a);
  g.quadraticCurveTo(x, y, x + a, y);
  g.closePath();
}
/** moldura dos ícones: recorte de cantos tortos, vinheta, contorno de tinta e pontos de costura */
function frame(g) {
  const R = [13, 5, 14, 6];
  g.globalCompositeOperation = 'destination-in';
  crookedRect(g, 1, 1, S - 2, S - 2, R);
  g.fill();
  g.globalCompositeOperation = 'source-over';
  const v = g.createRadialGradient(S * 0.45, S * 0.4, S * 0.2, S / 2, S / 2, S * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(12,8,18,0.5)');
  g.fillStyle = v;
  crookedRect(g, 1, 1, S - 2, S - 2, R);
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = '#16101d';
  crookedRect(g, 2, 2, S - 4, S - 4, R);
  g.stroke();
  g.setLineDash([4, 4]);
  g.lineWidth = 1.4;
  g.strokeStyle = 'rgba(239,230,210,0.6)';
  crookedRect(g, 6.5, 6.5, S - 13, S - 13, [9, 3, 10, 4]);
  g.stroke();
  g.setLineDash([]);
}
function ink(g, w = 3) {
  g.lineWidth = w;
  g.strokeStyle = '#120a14';
  g.lineJoin = 'round';
  g.lineCap = 'round';
}
function circle(g, x, y, r, fill, stroke = true) {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) g.stroke();
}
function glow(g, x, y, r, col) {
  const grd = g.createRadialGradient(x, y, 0, x, y, r);
  grd.addColorStop(0, col);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}
function ghostShape(g, x, y, s) {
  g.beginPath();
  g.moveTo(x - 14 * s, y + 16 * s);
  g.lineTo(x - 14 * s, y - 2 * s);
  g.bezierCurveTo(x - 14 * s, y - 20 * s, x + 14 * s, y - 20 * s, x + 14 * s, y - 2 * s);
  g.lineTo(x + 14 * s, y + 16 * s);
  for (let i = 0; i < 4; i++) {
    const x0 = x + 14 * s - (i + 0.5) * 7 * s;
    g.quadraticCurveTo(x0, y + (i % 2 ? 20 : 11) * s, x0 - 3.5 * s, y + 16 * s);
  }
  g.closePath();
}

const DRAW = {
  boo(g) {
    bg(g, '#8a5ab8', '#2a1440');
    glow(g, 32, 30, 30, 'rgba(220,200,255,0.5)');
    ink(g);
    ghostShape(g, 32, 32, 1.35);
    g.fillStyle = '#f4f0ff';
    g.fill();
    g.stroke();
    circle(g, 25, 27, 4, '#1a1020', false);
    circle(g, 39, 27, 4, '#1a1020', false);
    g.beginPath();
    g.ellipse(32, 38, 5, 7, 0, 0, Math.PI * 2);
    g.fillStyle = '#1a1020';
    g.fill();
  },
  dance(g) {
    bg(g, '#3a8a8a', '#0e2a30');
    ink(g, 4);
    g.strokeStyle = '#f0ece0';
    g.beginPath();
    g.arc(32, 16, 7, 0, Math.PI * 2);
    g.moveTo(32, 23); g.lineTo(30, 40);
    g.moveTo(31, 28); g.lineTo(18, 18);
    g.moveTo(31, 28); g.lineTo(45, 20);
    g.moveTo(30, 40); g.lineTo(20, 52);
    g.moveTo(30, 40); g.lineTo(42, 50);
    g.stroke();
    g.fillStyle = '#ffd84a';
    g.font = 'bold 18px serif';
    g.fillText('♪', 44, 40);
    g.fillText('♫', 8, 44);
  },
  lantern(g) {
    bg(g, '#2a3a6a', '#0a0e20');
    glow(g, 32, 36, 26, 'rgba(255,190,90,0.8)');
    ink(g, 3);
    g.fillStyle = '#2a2632';
    g.beginPath(); g.moveTo(20, 22); g.lineTo(44, 22); g.lineTo(38, 14); g.lineTo(26, 14); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.arc(32, 12, 6, Math.PI, 0); g.stroke();
    g.fillStyle = 'rgba(255,210,120,0.9)';
    g.fillRect(22, 22, 20, 22);
    g.strokeRect(22, 22, 20, 22);
    g.beginPath(); g.moveTo(32, 22); g.lineTo(32, 44); g.stroke();
    g.fillStyle = '#2a2632';
    g.fillRect(19, 44, 26, 6);
    g.strokeRect(19, 44, 26, 6);
  },
  lanternada(g) {
    bg(g, '#c85a2a', '#2a0804');
    // rastro do golpe
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(255,200,110,0.55)';
    g.lineWidth = 9;
    g.beginPath(); g.arc(30, 44, 24, Math.PI * 1.02, Math.PI * 1.72); g.stroke();
    g.strokeStyle = 'rgba(255,250,220,0.95)';
    g.lineWidth = 3;
    g.beginPath(); g.arc(30, 44, 24, Math.PI * 1.1, Math.PI * 1.68); g.stroke();
    glow(g, 44, 22, 17, 'rgba(255,190,90,0.95)');
    ink(g, 3);
    // lanterna inclinada no fim do golpe
    g.save();
    g.translate(44, 24);
    g.rotate(0.55);
    g.fillStyle = '#2a2632';
    g.beginPath(); g.moveTo(-9, -8); g.lineTo(9, -8); g.lineTo(6, -13); g.lineTo(-6, -13); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.arc(0, -15, 4, Math.PI, 0); g.stroke();
    g.fillStyle = 'rgba(255,214,120,0.95)';
    g.fillRect(-7, -8, 14, 15); g.strokeRect(-7, -8, 14, 15);
    g.fillStyle = '#2a2632';
    g.fillRect(-9, 7, 18, 4); g.strokeRect(-9, 7, 18, 4);
    g.restore();
    // estrelinhas do impacto
    g.fillStyle = '#fff4c0';
    for (const [x, y, r] of [[13, 47, 4], [21, 55, 2.5], [9, 36, 2.5]]) {
      g.beginPath();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, rr = i % 2 ? r * 0.4 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      g.closePath(); g.fill();
    }
  },
  potion(g) {
    // frasco do tônico capilar, com fios de cabelo brotando da rolha
    bg(g, '#5aa87a', '#0e2a1a');
    glow(g, 32, 40, 22, 'rgba(180,240,90,0.6)');
    ink(g);
    g.fillStyle = 'rgba(200,230,255,0.35)';
    g.beginPath(); g.arc(32, 41, 15, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#9ee05a';
    g.beginPath(); g.arc(32, 41, 15, 0.15, Math.PI - 0.15); g.closePath(); g.fill();
    g.beginPath(); g.arc(32, 41, 15, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(200,230,255,0.35)';
    g.fillRect(27, 17, 10, 11); g.strokeRect(27, 17, 10, 11);
    g.fillStyle = '#8a5a32';
    g.fillRect(25.5, 12, 13, 6); g.strokeRect(25.5, 12, 13, 6);
    g.lineWidth = 2;
    for (const [x, c] of [[28, -1], [32, 0.3], [36, 1]]) { g.beginPath(); g.moveTo(x, 12); g.quadraticCurveTo(x + c * 6, 6, x + c * 3, 2); g.stroke(); }
    g.fillStyle = '#e8ffc0';
    for (const [x, y, r] of [[26, 44, 2.2], [36, 38, 1.6], [31, 48, 1.4]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  },
  cape(g) {
    // capa de veludo roída, com gola alta e forro vermelho
    bg(g, '#8a2a3a', '#1a0408');
    ink(g);
    g.fillStyle = '#b8283a';
    g.beginPath(); g.moveTo(18, 14); g.lineTo(10, 10); g.lineTo(20, 24); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(46, 14); g.lineTo(54, 10); g.lineTo(44, 24); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#2a1430';
    g.beginPath(); g.moveTo(20, 14); g.lineTo(44, 14); g.lineTo(54, 52);
    for (let i = 0; i < 5; i++) g.quadraticCurveTo(52 - i * 8 - 4, 46, 50 - (i + 1) * 8, 54);
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#8a2a3a';
    for (const [x, y, r] of [[27, 38, 2.4], [40, 30, 2], [34, 46, 1.8]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#e0b048';
    g.beginPath(); g.arc(32, 16, 3, 0, Math.PI * 2); g.fill(); g.stroke();
  },
  bouquet(g) {
    // buquê de flores murchas com laço
    bg(g, '#8a8ab8', '#1a1a2a');
    ink(g, 2.5);
    g.strokeStyle = '#3a5a2a';
    for (const [x, y] of [[22, 20], [32, 16], [42, 20], [27, 26], [38, 26]]) { g.beginPath(); g.moveTo(32, 52); g.quadraticCurveTo((x + 32) / 2, 36, x, y); g.stroke(); }
    g.strokeStyle = '#120a14';
    const flower = (x, y, c) => {
      g.fillStyle = c;
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.6; g.beginPath(); g.ellipse(x + Math.cos(a) * 4, y + Math.sin(a) * 4 + 2, 3.6, 2.4, a, 0, Math.PI * 2); g.fill(); g.stroke(); }
      g.fillStyle = '#e0c060';
      g.beginPath(); g.arc(x, y + 2, 2, 0, Math.PI * 2); g.fill();
    };
    flower(22, 20, '#a898c0'); flower(42, 20, '#b8a8b0'); flower(32, 15, '#c8b8d8'); flower(27, 27, '#9a8aa8'); flower(38, 27, '#b0a0c0');
    g.fillStyle = '#f4ecd8';
    g.beginPath(); g.moveTo(32, 44); g.lineTo(22, 40); g.lineTo(24, 50); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(32, 44); g.lineTo(42, 40); g.lineTo(40, 50); g.closePath(); g.fill(); g.stroke();
  },
  chick(g) {
    bg(g, '#e88a3a', '#6a1a10');
    ink(g);
    circle(g, 32, 36, 18, '#c8342a');
    circle(g, 25, 33, 6, '#fff');
    circle(g, 39, 33, 6, '#fff');
    circle(g, 26, 34, 3, '#111', false);
    circle(g, 38, 34, 3, '#111', false);
    g.fillStyle = '#f0a040';
    g.beginPath(); g.moveTo(28, 42); g.lineTo(36, 42); g.lineTo(32, 50); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#2a1010';
    g.beginPath(); g.moveTo(20, 22); g.lineTo(24, 10); g.lineTo(27, 20); g.fill();
    g.beginPath(); g.moveTo(44, 22); g.lineTo(40, 10); g.lineTo(37, 20); g.fill();
    glow(g, 32, 12, 10, 'rgba(255,170,60,0.9)');
  },
  broom(g) {
    bg(g, '#4a3a8a', '#10082a');
    g.fillStyle = '#fff8c0';
    for (const [x, y] of [[12, 12], [50, 18], [44, 8], [20, 52], [54, 46]]) { g.fillRect(x, y, 2, 2); }
    ink(g, 4);
    g.strokeStyle = '#7a5a3a';
    g.beginPath(); g.moveTo(12, 50); g.lineTo(46, 16); g.stroke();
    ink(g, 3);
    g.fillStyle = '#d8b04a';
    g.beginPath(); g.moveTo(44, 12); g.lineTo(58, 8); g.lineTo(56, 22); g.lineTo(50, 24); g.closePath();
    g.beginPath(); g.moveTo(40, 22); g.quadraticCurveTo(56, 4, 62, 14); g.quadraticCurveTo(58, 28, 42, 26); g.closePath(); g.fill(); g.stroke();
  },
  hearth(g) {
    bg(g, '#3a6a4a', '#0a1a14');
    ink(g, 3);
    g.fillStyle = '#8a8a96';
    g.beginPath(); g.moveTo(16, 54); g.lineTo(16, 24); g.arc(32, 24, 16, Math.PI, 0); g.lineTo(48, 54); g.closePath(); g.fill(); g.stroke();
    glow(g, 32, 32, 16, 'rgba(120,255,190,0.9)');
    g.strokeStyle = '#baffd8';
    g.lineWidth = 3;
    g.beginPath();
    for (let a = 0; a < 12; a += 0.3) g.lineTo(32 + Math.cos(a) * a * 1.0, 32 + Math.sin(a) * a * 1.0);
    g.stroke();
  },
  biscuit(g) {
    bg(g, '#8a6a4a', '#2a1a10');
    ink(g);
    g.fillStyle = '#d8a860';
    g.beginPath(); g.ellipse(28, 32, 18, 11, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(44, 32); g.lineTo(56, 22); g.lineTo(56, 42); g.closePath(); g.fill(); g.stroke();
    circle(g, 18, 29, 2.5, '#111', false);
    for (const x of [26, 32, 38]) { g.beginPath(); g.arc(x, 32, 5, -1, 1); g.stroke(); }
  },
  pumpkinhat(g) {
    bg(g, '#c86a2a', '#3a1206');
    ink(g);
    g.fillStyle = '#ec8a2a';
    g.beginPath(); g.ellipse(32, 38, 20, 15, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(32, 38, 8, 15, 0, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#4d5a2a';
    g.fillRect(29, 16, 6, 9);
    g.strokeRect(29, 16, 6, 9);
    g.fillStyle = '#1a1020';
    g.fillRect(20, 12, 24, 5);
  },
  kneecap(g) {
    bg(g, '#6a6a6a', '#1a1a1a');
    ink(g);
    g.fillStyle = '#e8e0cc';
    g.beginPath(); g.ellipse(32, 32, 16, 13, 0.3, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.arc(30, 30, 6, 0.5, 2.5); g.stroke();
  },
  fangs(g) {
    bg(g, '#8a1a2a', '#200408');
    ink(g);
    g.fillStyle = '#d83a4a';
    g.beginPath(); g.moveTo(10, 26); g.quadraticCurveTo(32, 12, 54, 26); g.lineTo(54, 32); g.quadraticCurveTo(32, 22, 10, 32); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#fffaf0';
    for (const x of [18, 44]) { g.beginPath(); g.moveTo(x - 5, 30); g.lineTo(x + 5, 30); g.lineTo(x, 48); g.closePath(); g.fill(); g.stroke(); }
  },
  feather(g) {
    bg(g, '#7a7a8a', '#1a1a24');
    ink(g, 2);
    g.fillStyle = '#1a1822';
    g.beginPath(); g.moveTo(14, 54); g.quadraticCurveTo(20, 10, 52, 8); g.quadraticCurveTo(40, 40, 14, 54); g.fill(); g.stroke();
    g.strokeStyle = '#6a6a7a';
    g.beginPath(); g.moveTo(14, 54); g.quadraticCurveTo(30, 30, 50, 10); g.stroke();
  },
  letter(g) {
    bg(g, '#d8a8c8', '#5a2a4a');
    ink(g);
    g.fillStyle = '#f4ecd8';
    g.fillRect(12, 20, 40, 28);
    g.strokeRect(12, 20, 40, 28);
    g.beginPath(); g.moveTo(12, 20); g.lineTo(32, 36); g.lineTo(52, 20); g.stroke();
    g.fillStyle = '#c8342a';
    g.beginPath(); g.moveTo(32, 32); g.bezierCurveTo(24, 24, 24, 38, 32, 42); g.bezierCurveTo(40, 38, 40, 24, 32, 32); g.fill();
  },
  letter2(g) {
    bg(g, '#a8c8e8', '#1a2a4a');
    ink(g);
    g.fillStyle = '#f4ecd8';
    g.beginPath(); g.moveTo(14, 14); g.lineTo(50, 14); g.lineTo(50, 50); g.lineTo(14, 50); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#1a1a2a';
    g.font = 'bold 16px serif';
    g.fillText('SIM', 18, 36);
    g.fillStyle = 'rgba(200,40,60,0.8)';
    g.beginPath(); g.ellipse(40, 42, 7, 4, -0.3, 0, Math.PI * 2); g.fill();
  },
  dentures(g) {
    bg(g, '#c8a040', '#3a2a08');
    ink(g);
    g.fillStyle = '#c8342a';
    g.beginPath(); g.ellipse(32, 34, 22, 13, 0, Math.PI, 0); g.fill(); g.stroke();
    for (let i = 0; i < 7; i++) {
      const x = 14 + i * 6;
      g.fillStyle = i % 3 === 0 ? '#f0d060' : '#fffaf0';
      g.fillRect(x, 30, 5, 10);
      g.strokeRect(x, 30, 5, 10);
    }
  },
  bone(g) {
    bg(g, '#6a5a8a', '#1a1428');
    ink(g);
    g.fillStyle = '#ece6d4';
    g.save();
    g.translate(32, 32);
    g.rotate(-0.7);
    g.fillRect(-16, -5, 32, 10);
    g.strokeRect(-16, -5, 32, 10);
    for (const x of [-18, 18]) for (const y of [-6, 6]) circle(g, x, y, 6, '#ece6d4');
    g.restore();
  },
  ember(g) {
    bg(g, '#8a2a14', '#1a0604');
    glow(g, 32, 34, 26, 'rgba(255,120,40,0.9)');
    ink(g);
    g.fillStyle = '#3a2018';
    g.beginPath(); g.moveTo(14, 44); g.lineTo(22, 22); g.lineTo(40, 16); g.lineTo(52, 32); g.lineTo(44, 50); g.lineTo(24, 52); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = '#ffb040';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(22, 30); g.lineTo(32, 36); g.lineTo(28, 46); g.moveTo(32, 36); g.lineTo(44, 30); g.stroke();
  },
  mushroom(g) {
    bg(g, '#b86aa8', '#2a0a24');
    glow(g, 32, 26, 24, 'rgba(255,150,230,0.8)');
    ink(g);
    g.fillStyle = '#ff8ae0';
    g.beginPath(); g.arc(32, 30, 20, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#f0e8d8';
    g.fillRect(26, 30, 12, 20);
    g.strokeRect(26, 30, 12, 20);
    circle(g, 29, 38, 1.8, '#111', false);
    circle(g, 35, 38, 1.8, '#111', false);
    g.beginPath(); g.arc(32, 42, 3, 0.2, Math.PI - 0.2); g.stroke();
  },
  firefly(g) {
    bg(g, '#2a4a2a', '#060e06');
    ink(g);
    g.fillStyle = 'rgba(200,230,255,0.25)';
    g.beginPath(); g.moveTo(18, 18); g.lineTo(46, 18); g.lineTo(48, 52); g.lineTo(16, 52); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#6a4a2a';
    g.fillRect(20, 12, 24, 7);
    g.strokeRect(20, 12, 24, 7);
    for (const [x, y] of [[26, 30], [38, 38], [30, 44], [36, 26]]) glow(g, x, y, 7, 'rgba(210,255,110,1)');
  },
  cat(g) {
    bg(g, '#5a4a7a', '#140e20');
    ink(g);
    g.fillStyle = '#1e1a26';
    g.beginPath(); g.moveTo(14, 26); g.lineTo(18, 8); g.lineTo(28, 20); g.lineTo(36, 20); g.lineTo(46, 8); g.lineTo(50, 26); g.quadraticCurveTo(52, 54, 32, 54); g.quadraticCurveTo(12, 54, 14, 26); g.fill(); g.stroke();
    for (const [x, y] of [[24, 34], [40, 34], [32, 25]]) { circle(g, x, y, 4.5, '#ffe14a', false); g.fillStyle = '#111'; g.fillRect(x - 1, y - 3, 2, 6); }
  },
  egg(g) {
    bg(g, '#e8704a', '#3a0806');
    ink(g);
    g.fillStyle = '#9a1e1e';
    g.beginPath(); g.ellipse(32, 36, 16, 21, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#2a0e10';
    for (const [x, y, r] of [[26, 30, 4], [38, 40, 5], [30, 46, 3]]) circle(g, x, y, r, '#2a0e10', false);
    g.strokeStyle = '#ffb040';
    g.beginPath(); g.moveTo(22, 26); g.lineTo(28, 32); g.lineTo(24, 38); g.stroke();
  },
  crow(g) {
    bg(g, '#8a8a9a', '#2a2a34');
    ink(g, 2);
    g.fillStyle = '#16141c';
    g.beginPath(); g.ellipse(30, 38, 14, 10, -0.3, 0, Math.PI * 2); g.fill();
    circle(g, 42, 24, 8, '#16141c', false);
    g.fillStyle = '#d8a040';
    g.beginPath(); g.moveTo(48, 22); g.lineTo(60, 26); g.lineTo(48, 28); g.fill();
    circle(g, 44, 22, 2, '#fff', false);
  },
  bag(g) {
    bg(g, '#8a6a3a', '#2a1a08');
    ink(g);
    g.fillStyle = '#6a4a2a';
    g.beginPath(); g.moveTo(16, 24); g.quadraticCurveTo(10, 56, 32, 56); g.quadraticCurveTo(54, 56, 48, 24); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#5a3a1a';
    g.fillRect(18, 18, 28, 10);
    g.strokeRect(18, 18, 28, 10);
    g.beginPath(); g.moveTo(24, 18); g.quadraticCurveTo(32, 4, 40, 18); g.stroke();
    circle(g, 32, 34, 4, '#c8a24a');
  },
  questlog(g) {
    bg(g, '#c8a060', '#4a3010');
    ink(g);
    g.fillStyle = '#f0e0b8';
    g.fillRect(14, 12, 36, 42);
    g.strokeRect(14, 12, 36, 42);
    g.fillStyle = '#ffd100';
    g.font = 'bold 30px serif';
    g.fillText('!', 27, 44);
  },
  map(g) {
    bg(g, '#8aa870', '#1a2a10');
    ink(g);
    g.fillStyle = '#e8d8a8';
    g.beginPath(); g.moveTo(10, 16); g.lineTo(24, 12); g.lineTo(40, 18); g.lineTo(54, 12); g.lineTo(54, 50); g.lineTo(40, 56); g.lineTo(24, 50); g.lineTo(10, 54); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(24, 12); g.lineTo(24, 50); g.moveTo(40, 18); g.lineTo(40, 56); g.stroke();
    g.strokeStyle = '#b8342a';
    g.beginPath(); g.moveTo(30, 28); g.lineTo(36, 34); g.moveTo(36, 28); g.lineTo(30, 34); g.stroke();
  },
  menu(g) {
    bg(g, '#6a6a8a', '#14141e');
    ink(g);
    g.fillStyle = '#c8c0d8';
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, r = i % 2 ? 20 : 15;
      g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
    }
    g.closePath(); g.fill(); g.stroke();
    circle(g, 32, 32, 6, '#3a3a4a');
  },
  help(g) {
    bg(g, '#5a8ab8', '#0a1a2a');
    g.fillStyle = '#fff';
    g.font = 'bold 40px serif';
    g.textAlign = 'center';
    g.fillText('?', 32, 46);
  },
  skull(g) {
    bg(g, '#8a8a7a', '#1a1a14');
    ink(g);
    circle(g, 32, 28, 16, '#ece6d4');
    g.fillStyle = '#ece6d4';
    g.fillRect(24, 38, 16, 12);
    g.strokeRect(24, 38, 16, 12);
    circle(g, 26, 28, 5, '#111', false);
    circle(g, 38, 28, 5, '#111', false);
  },
  empty(g) {
    g.fillStyle = 'rgba(0,0,0,0)';
    g.fillRect(0, 0, S, S);
  },
};

export function icon(name) {
  if (cache.has(name)) return cache.get(name);
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  (DRAW[name] || DRAW.skull)(g);
  if (name !== 'empty') frame(g);
  const url = c.toDataURL();
  cache.set(name, url);
  return url;
}

/** cursores: mão de esqueleto (padrão), balão (conversar), baldinho de abóbora (pegar), chave (usar) e forcado (atacar) */
export function cursorURL(kind) {
  const key = 'cur-' + kind;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.lineJoin = 'round';
  g.lineWidth = 1.6;
  g.strokeStyle = INK;
  // traço com contorno de tinta (osso, cabo, haste)
  const bone = (x0, y0, x1, y1, w, col = '#f1e8d4') => {
    g.lineCap = 'round';
    for (const [c2, lw] of [[INK, w + 2.6], [col, w]]) {
      g.strokeStyle = c2;
      g.lineWidth = lw;
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
    }
    g.strokeStyle = INK;
    g.lineWidth = 1.6;
  };
  if (kind === 'talk') {
    g.fillStyle = '#f4ecd8';
    g.beginPath(); g.ellipse(16, 12, 13, 9, -0.12, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(9, 18); g.lineTo(3, 29); g.lineTo(15, 20); g.fill(); g.stroke();
    g.fillStyle = INK;
    for (const x of [10, 16, 22]) { g.beginPath(); g.arc(x, 12 - (x - 16) * 0.12, 1.8, 0, Math.PI * 2); g.fill(); }
  } else if (kind === 'loot') {
    // baldinho de abóbora das gostosuras
    g.lineWidth = 2;
    g.beginPath(); g.arc(16, 13, 9, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
    g.lineWidth = 1.6;
    g.fillStyle = '#ff8a2a';
    g.beginPath(); g.ellipse(16, 20, 12, 9.5, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = INK;
    g.beginPath(); g.moveTo(9, 19); g.lineTo(12, 15); g.lineTo(14, 19); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(18, 19); g.lineTo(20, 15); g.lineTo(23, 19); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(9, 22); g.lineTo(12, 25); g.lineTo(14, 23); g.lineTo(16, 26); g.lineTo(18, 23); g.lineTo(20, 25); g.lineTo(23, 22); g.lineTo(16, 24); g.closePath(); g.fill();
  } else if (kind === 'attack') {
    // forcado do Seu Custódio apontando para o canto
    bone(11, 11, 29, 29, 3.2, '#8a5a32');
    bone(15, 5, 5, 15, 2.2, '#cfd0d8');
    bone(10, 10, 2.5, 2.5, 2, '#cfd0d8');
    bone(15, 5, 9, 0.8, 2, '#cfd0d8');
    bone(5, 15, 0.8, 9, 2, '#cfd0d8');
  } else if (kind === 'use') {
    // chave de esqueleto com caveirinha na argola
    bone(12, 12, 27, 27, 2.8, '#cbbf9f');
    bone(24, 24, 21, 27, 2.4, '#cbbf9f');
    bone(27, 21, 24, 24, 2.4, '#cbbf9f');
    g.fillStyle = '#efe6d2';
    g.beginPath(); g.arc(8.5, 8.5, 7, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = INK;
    for (const x of [6.2, 10.8]) { g.beginPath(); g.arc(x, 8, 1.7, 0, Math.PI * 2); g.fill(); }
    g.fillRect(7.6, 11.4, 1.8, 1.8);
  } else {
    // mão de esqueleto apontando (a ponta do dedo é o clique)
    bone(19, 12, 23, 15, 3.2);
    bone(21.5, 15.5, 24.5, 19, 3.2);
    bone(21.5, 19.5, 23.5, 23, 3);
    bone(12, 19.5, 7.5, 22, 3.2);
    bone(21, 23, 27.5, 29.5, 4);
    g.fillStyle = '#f1e8d4';
    g.beginPath(); g.ellipse(16.5, 17.5, 6.2, 5, Math.PI / 4, 0, Math.PI * 2); g.fill(); g.stroke();
    bone(9.6, 9.6, 14, 14, 3.6);
    bone(3, 3, 8.4, 8.4, 3.4);
  }
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

export function coinsHTML(copper) {
  const g = Math.floor(copper / 10000), s = Math.floor((copper % 10000) / 100), c = copper % 100;
  const parts = [];
  if (g) parts.push(`<span class="coin">${g}<i class="c-gold"></i></span>`);
  if (s || g) parts.push(`<span class="coin">${s}<i class="c-silver"></i></span>`);
  parts.push(`<span class="coin">${c}<i class="c-copper"></i></span>`);
  return parts.join(' ');
}

/** marcadores de missão: "!" e "?" cor de abóbora, tortinhos e com contorno de tinta (cinza = em andamento) */
const Q_PATH = 'M9 17 Q9 5 18 5 Q27 5 27 14 Q27 20 21 23.5 Q18 25.5 18 31';
const BANG = 'M6 5 Q15 -1 24 4 Q21 20 19 34 Q15 37 11 34 Q9 20 6 5 Z';
const MK = { top: '#ffe0b0', mid: '#ff8a2a', bot: '#b8420e', grey: ['#f4f4f4', '#b8b8b8', '#6a6a6a'] };
const TILT = { avail: -7, ready: 7, wip: 7 };
export function markerSVG(kind) {
  const grey = kind === 'wip';
  const [top, mid, bot] = grey ? MK.grey : [MK.top, MK.mid, MK.bot];
  const id = 'mg' + kind;
  const grad = `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="52" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${top}"/><stop offset=".45" stop-color="${mid}"/><stop offset="1" stop-color="${bot}"/></linearGradient>`;
  if (kind === 'avail') {
    const st = `fill="url(#${id})" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"`;
    return `<svg viewBox="0 0 30 52" width="30" height="52"><defs>${grad}</defs><g transform="rotate(${TILT.avail} 15 26)"><path d="${BANG}" ${st}/><circle cx="15.5" cy="44" r="5.8" ${st}/></g></svg>`;
  }
  return `<svg viewBox="0 0 36 52" width="36" height="52"><defs>${grad}</defs><g transform="rotate(${TILT[kind] ?? 7} 18 26)">
    <path d="${Q_PATH}" fill="none" stroke="${INK}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${Q_PATH}" fill="none" stroke="url(#${id})" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="18" cy="44" r="5.8" fill="url(#${id})" stroke="${INK}" stroke-width="3.2"/></g></svg>`;
}

/** mesmo marcador desenhado num canvas 2D (minimapa/mapa) */
export function drawMarker(ctx, kind, x, y, h) {
  const k = h / 52;
  const w = kind === 'avail' ? 15 : 18;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(((TILT[kind] ?? 7) * Math.PI) / 180);
  ctx.translate(-w * k, -26 * k);
  ctx.scale(k, k);
  const grey = kind === 'wip';
  const [top, mid, bot] = grey ? MK.grey : [MK.top, MK.mid, MK.bot];
  const g = ctx.createLinearGradient(0, 0, 0, 52);
  g.addColorStop(0, top);
  g.addColorStop(0.45, mid);
  g.addColorStop(1, bot);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  if (kind === 'avail') {
    const p = new Path2D(BANG);
    ctx.fillStyle = g;
    ctx.lineWidth = 3.6;
    ctx.stroke(p);
    ctx.fill(p);
  } else {
    const p = new Path2D(Q_PATH);
    ctx.lineWidth = 14;
    ctx.stroke(p);
    ctx.lineWidth = 8;
    ctx.strokeStyle = g;
    ctx.stroke(p);
    ctx.strokeStyle = INK;
  }
  ctx.fillStyle = g;
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  ctx.arc(kind === 'avail' ? 15.5 : 18, 44, 5.8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}
