// Gera os ornamentos SVG da "Ficha Iluminada" em ded/ui/ornamentos/.
// Uso: node ded/tools/gerar-ornamentos.mjs
// Os arquivos gerados são versionados; rode de novo só ao mudar este script.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = join(RAIZ, 'ui', 'ornamentos');
mkdirSync(SAIDA, { recursive: true });

const C = {
    tinta: '#2f1f12', tinta2: '#4a3220', sepia: '#6b4a2e',
    bronze: '#8f6c34', bronzeEsc: '#5e4320', ouro: '#c9a14f', ouroClaro: '#e6c983',
    pergaminho: '#efe3c6', pergaminho2: '#dcc79e', pergaminho3: '#c4a979',
    rubro: '#7e2320', rubroEsc: '#4f1512', rubroClaro: '#a33a2c'
};

const n = v => Math.round(v * 100) / 100;
const svg = (w, h, corpo) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${corpo}</svg>\n`;
const grava = (nome, conteudo) => writeFileSync(join(SAIDA, nome), conteudo);
const rad = g => g * Math.PI / 180;

const gradBronze = id => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${C.ouroClaro}"/><stop offset=".45" stop-color="${C.bronze}"/><stop offset="1" stop-color="${C.bronzeEsc}"/></linearGradient>`;
const gradFace = (id, a, b) => `<radialGradient id="${id}" cx=".42" cy=".36" r=".72">
  <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`;

// ---------------------------------------------------------------------------
// Moldura de painel (9-slice, fatia 40): faixa escura com filete de ouro,
// cantos côncavos com um rebite e uma linha interna de sépia.
function retanguloConcavo(o, r, W, H) {
    return `M${o + r},${o}H${W - o - r}A${r},${r} 0 0 0 ${W - o},${o + r}V${H - o - r}` +
        `A${r},${r} 0 0 0 ${W - o - r},${H - o}H${o + r}A${r},${r} 0 0 0 ${o},${H - o - r}` +
        `V${o + r}A${r},${r} 0 0 0 ${o + r},${o}Z`;
}
{
    const W = 120;
    const cantos = [[7, 7], [W - 7, 7], [W - 7, W - 7], [7, W - 7]];
    const rebites = cantos.map(([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="3.4" fill="${C.ouro}" stroke="${C.tinta}" stroke-width="1.1"/>` +
        `<circle cx="${x - 0.9}" cy="${y - 0.9}" r="1" fill="${C.ouroClaro}"/>`).join('');
    const pontos = [[16, 16], [W - 16, 16], [W - 16, W - 16], [16, W - 16]].map(([x, y]) =>
        `<rect x="${x - 2}" y="${y - 2}" width="4" height="4" transform="rotate(45 ${x} ${y})" fill="${C.rubro}"/>`).join('');
    grava('moldura.svg', svg(W, W,
        `<path d="${retanguloConcavo(6.5, 12, W, W)}" fill="none" stroke="${C.tinta}" stroke-width="7"/>` +
        `<path d="${retanguloConcavo(6.5, 12, W, W)}" fill="none" stroke="${C.ouro}" stroke-width="1.2"/>` +
        `<path d="${retanguloConcavo(16, 8, W, W)}" fill="none" stroke="${C.sepia}" stroke-width="1"/>` +
        rebites + pontos));
}

// Moldura da folha inteira (9-slice, fatia 56): faixa larga com bisel
// (luz no alto e à esquerda) e uma roseta de ouro em cada canto.
{
    const W = 160, o = 10, r = 16, a = o + r, b = W - o - r;
    const roseta = (x, y) => Array.from({ length: 8 }, (_, i) =>
        `<ellipse cx="${x + 4.3}" cy="${y}" rx="4.3" ry="1.9" transform="rotate(${i * 45} ${x} ${y})" fill="${C.ouro}" stroke="${C.tinta}" stroke-width=".8"/>`).join('') +
        `<circle cx="${x}" cy="${y}" r="2.5" fill="${C.rubro}" stroke="${C.tinta}" stroke-width=".8"/>`;
    grava('moldura-folha.svg', svg(W, W,
        `<path d="${retanguloConcavo(o, r, W, W)}" fill="none" stroke="${C.tinta}" stroke-width="14"/>` +
        `<path d="M${a},3.7H${b}M3.7,${a}V${b}" stroke="${C.ouroClaro}" stroke-width="1.1" opacity=".75"/>` +
        `<path d="M${a},${W - 3.7}H${b}M${W - 3.7},${a}V${b}" stroke="#0d0805" stroke-width="1.6"/>` +
        `<path d="${retanguloConcavo(o, r, W, W)}" fill="none" stroke="${C.ouro}" stroke-width="1.5"/>` +
        `<path d="${retanguloConcavo(24, 10, W, W)}" fill="none" stroke="${C.sepia}" stroke-width="1.1"/>` +
        `<path d="${retanguloConcavo(27.5, 6.5, W, W)}" fill="none" stroke="${C.sepia}" stroke-width=".5" opacity=".6"/>` +
        roseta(o, o) + roseta(W - o, o) + roseta(W - o, W - o) + roseta(o, W - o)));
}

// ---------------------------------------------------------------------------
// Fitas (9-slice horizontal, fatia 0 44): faixa da frente com pontas
// em rabo de andorinha dobradas para trás.
function fita(nome, frente, frente2, rabo, dobra, filete) {
    const ponta = `<path d="M0,16H36V52H0L10,34Z" fill="${rabo}" stroke="${C.tinta}" stroke-width="1.5" stroke-linejoin="round"/>` +
        `<path d="M22,44H36V52Z" fill="${dobra}" stroke="${C.tinta}" stroke-width="1.2" stroke-linejoin="round"/>`;
    grava(nome, svg(240, 56,
        `<defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${frente}"/>` +
        `<stop offset="1" stop-color="${frente2}"/></linearGradient></defs>` +
        ponta + `<g transform="translate(240 0) scale(-1 1)">${ponta}</g>` +
        `<rect x="22" y="6" width="196" height="38" fill="url(#f)" stroke="${C.tinta}" stroke-width="1.5"/>` +
        `<path d="M27,10.5H213M27,39.5H213" stroke="${filete}" stroke-width=".9"/>`));
}
fita('fita.svg', '#f4ead2', '#d6c094', C.pergaminho3, C.sepia, C.sepia);
fita('fita-rubra.svg', '#9a3028', '#6a1b18', '#5a1714', '#2f0b09', C.ouro);

// ---------------------------------------------------------------------------
// Corrente (repete na horizontal, período 32).
grava('corrente.svg', svg(32, 14,
    `<rect x="16" y="5.6" width="20" height="2.8" rx="1.4" fill="${C.tinta2}"/>` +
    `<rect x="-16" y="5.6" width="20" height="2.8" rx="1.4" fill="${C.tinta2}"/>` +
    `<rect x="2" y="2.5" width="18" height="9" rx="4.5" fill="none" stroke="${C.tinta2}" stroke-width="2.6"/>` +
    `<rect x="3.4" y="3.6" width="15.2" height="6.8" rx="3.4" fill="none" stroke="${C.ouroClaro}" stroke-width=".7" opacity=".55"/>`));

// ---------------------------------------------------------------------------
// Medalhões dos atributos e da vida.
function medalhao(nome, faceA, faceB) {
    const contas = Array.from({ length: 30 }, (_, i) => {
        const a = rad(i * 12);
        return `<circle cx="${n(60 + 51.3 * Math.cos(a))}" cy="${n(60 + 51.3 * Math.sin(a))}" r="1.7" fill="${C.tinta}"/>`;
    }).join('');
    grava(nome, svg(120, 120,
        `<defs>${gradBronze('b')}${gradFace('f', faceA, faceB)}</defs>` +
        `<circle cx="60" cy="60" r="57.5" fill="${C.tinta}"/>` +
        `<circle cx="60" cy="60" r="54" fill="url(#b)"/>` + contas +
        `<circle cx="60" cy="60" r="48.5" fill="${C.tinta2}"/>` +
        `<circle cx="60" cy="60" r="46.5" fill="none" stroke="${C.ouro}" stroke-width="1"/>` +
        `<circle cx="60" cy="60" r="44" fill="none" stroke="${C.bronze}" stroke-width="3.4" stroke-dasharray="2.6 1.6"/>` +
        `<circle cx="60" cy="60" r="41" fill="url(#f)" stroke="${C.tinta}" stroke-width="1.6"/>` +
        `<circle cx="60" cy="60" r="37.5" fill="none" stroke="${C.sepia}" stroke-width=".6" opacity=".55"/>`));
}
medalhao('medalhao.svg', '#f6edd6', '#d4bd8f');
medalhao('medalhao-rubro.svg', '#b8483a', '#5e1814');

// ---------------------------------------------------------------------------
// Escudo (CA) e moeda (ouro).
{
    const escudo = (o) => {
        const x0 = 8 + o, x1 = 92 - o, y0 = 6 + o, base = 111 - o * 1.15;
        return `M${x0},${y0}H${x1}V48C${x1},${82 - o * 0.7} ${72 - o * 0.4},${100 - o} 50,${base}` +
            `C${28 + o * 0.4},${100 - o} ${x0},${82 - o * 0.7} ${x0},48Z`;
    };
    grava('escudo.svg', svg(100, 116,
        `<defs>${gradBronze('b')}${gradFace('f', '#f6edd6', '#d4bd8f')}</defs>` +
        `<path d="${escudo(0)}" fill="${C.tinta}"/>` +
        `<path d="${escudo(3.5)}" fill="url(#b)"/>` +
        `<path d="${escudo(8)}" fill="${C.tinta2}"/>` +
        `<path d="${escudo(10)}" fill="url(#f)"/>` +
        `<path d="${escudo(13.5)}" fill="none" stroke="${C.sepia}" stroke-width=".6" opacity=".55"/>` +
        [[16, 13], [84, 13]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="${C.ouroClaro}" stroke="${C.tinta}" stroke-width=".8"/>`).join('')));

    grava('moeda.svg', svg(100, 100,
        `<defs><linearGradient id="o" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ecd08a"/>` +
        `<stop offset=".55" stop-color="#a8823f"/><stop offset="1" stop-color="#6d4f22"/></linearGradient>` +
        `${gradFace('f', '#f5e2a6', '#c49a4c')}</defs>` +
        `<circle cx="50" cy="50" r="48" fill="${C.tinta}"/>` +
        `<circle cx="50" cy="50" r="46" fill="url(#o)"/>` +
        `<circle cx="50" cy="50" r="43.6" fill="none" stroke="#5e4320" stroke-width="3" stroke-dasharray="1.2 1.7"/>` +
        `<circle cx="50" cy="50" r="40" fill="none" stroke="${C.tinta}" stroke-width="1"/>` +
        `<circle cx="50" cy="50" r="38.5" fill="url(#f)"/>` +
        `<circle cx="50" cy="50" r="34" fill="none" stroke="#8a6a30" stroke-width=".8"/>`));
}

// ---------------------------------------------------------------------------
// Selos de cera (resultado dos testes).
function selo(nome, a, b, c, anelOuro = false) {
    const pts = Array.from({ length: 36 }, (_, i) => {
        const t = i / 36 * Math.PI * 2;
        const r = 53 + 2.6 * Math.sin(t * 5 + 0.7) + 1.6 * Math.sin(t * 11 + 2.1) + 1.1 * Math.cos(t * 17);
        return [60 + r * Math.cos(t), 60 + r * Math.sin(t)];
    });
    // curva suave pelos pontos médios
    const meio = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    let d = `M${meio(pts[35], pts[0]).map(n).join(',')}`;
    pts.forEach((p, i) => { const m = meio(p, pts[(i + 1) % 36]); d += `Q${n(p[0])},${n(p[1])} ${n(m[0])},${n(m[1])}`; });
    grava(nome, svg(120, 120,
        `<defs><radialGradient id="c" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="${a}"/>` +
        `<stop offset=".7" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></radialGradient></defs>` +
        `<path d="${d}Z" fill="url(#c)" stroke="${c}" stroke-width="1.2"/>` +
        `<circle cx="60" cy="60" r="39" fill="none" stroke="${c}" stroke-width="3.2"/>` +
        `<circle cx="60" cy="60" r="41" fill="none" stroke="#ffd9c4" stroke-width=".9" opacity=".28"/>` +
        `<circle cx="60" cy="60" r="35" fill="none" stroke="#ffd9c4" stroke-width=".6" opacity=".2"/>` +
        (anelOuro ? `<circle cx="60" cy="60" r="44.5" fill="none" stroke="${C.ouro}" stroke-width="2"/>` +
            `<circle cx="60" cy="60" r="33.5" fill="none" stroke="${C.ouro}" stroke-width="1.2" opacity=".85"/>` : '')));
}
selo('selo-cera.svg', '#b8483a', '#8a2620', '#4f1512');
selo('selo-cera-escuro.svg', '#5b4038', '#3a2620', '#1c110d');
selo('selo-cera-critico.svg', '#c0503f', '#8a2620', '#4f1512', true);

// ---------------------------------------------------------------------------
// d20 visto de frente (fundo do #dice; o número é o texto do elemento).
// A versão "apagada" (1 natural) troca de arte em vez de usar filter.
function d20(nome, tom) {
    const V = [[60, 6], [106.77, 33], [106.77, 87], [60, 114], [13.23, 87], [13.23, 33]];
    const T = [[60, 28], [88.5, 77], [31.5, 77]];
    const faces = [
        [[V[5], V[0], T[0]], tom('#c2523f'), '8'], [[V[0], V[1], T[0]], tom('#a83f31'), '14'],
        [[V[1], T[1], T[0]], tom('#8e2f26')], [[V[1], V[2], T[1]], tom('#6e2019'), '16'],
        [[V[2], V[3], T[1]], tom('#521512')], [[V[3], T[2], T[1]], tom('#6a1e18'), '12'],
        [[V[3], V[4], T[2]], tom('#7a241d')], [[V[4], V[5], T[2]], tom('#93332a'), '2'],
        [[V[5], T[0], T[2]], tom('#b4473a')], [T, 'url(#frente)']
    ];
    const poli = pts => pts.map(q => q.map(n).join(',')).join(' ');
    const numeros = faces.filter(f => f[2]).map(([pts, , t]) => {
        const cx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3, cy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3;
        return `<text x="${n(cx)}" y="${n(cy + 3)}" text-anchor="middle" font-family="Georgia,serif" font-size="9" fill="${C.ouroClaro}" opacity=".7">${t}</text>`;
    }).join('');
    grava(nome, svg(120, 120,
        `<defs><linearGradient id="frente" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${tom('#c4523f')}"/>` +
        `<stop offset="1" stop-color="${tom('#8a2a22')}"/></linearGradient></defs>` +
        `<polygon points="${poli(V)}" fill="${C.tinta}" stroke="${C.tinta}" stroke-width="5" stroke-linejoin="round"/>` +
        faces.map(([pts, cor]) => `<polygon points="${poli(pts)}" fill="${cor}" stroke="${C.ouro}" stroke-width="1.4" stroke-linejoin="round"/>`).join('') +
        `<polygon points="${poli(T)}" fill="none" stroke="${C.ouroClaro}" stroke-width=".6" opacity=".6" transform="translate(60 60.67) scale(.9) translate(-60 -60.67)"/>` +
        numeros));
}
const apagar = hex => {
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    const cinza = 0.3 * r + 0.59 * g + 0.11 * b;
    return '#' + [r, g, b].map(v => Math.round((v * 0.35 + cinza * 0.65) * 0.62).toString(16).padStart(2, '0')).join('');
};
d20('d20.svg', c => c);
d20('d20-apagado.svg', apagar);

// ---------------------------------------------------------------------------
// Caixa da letra capitular.
grava('capitular.svg', svg(100, 100,
    `<rect x="1.5" y="1.5" width="97" height="97" fill="#e9d9b2" stroke="${C.tinta}" stroke-width="2.4"/>` +
    `<rect x="6" y="6" width="88" height="88" fill="none" stroke="${C.ouro}" stroke-width="1.4"/>` +
    `<rect x="9" y="9" width="82" height="82" fill="none" stroke="${C.sepia}" stroke-width=".6" opacity=".6"/>` +
    [[6, 6], [94, 6], [94, 94], [6, 94]].map(([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="3.2" fill="${C.rubro}" stroke="${C.tinta}" stroke-width=".8"/>`).join('')));

// ---------------------------------------------------------------------------
// Vitral: arco gótico 600 x 800 com faixa de vidros em tons sóbrios.
// A cena fica embaixo, recortada pelo polígono gravado em vitral-recorte.css.
{
    const W = 600, H = 800, S = 360, R = 360, PEITORIL = 768;
    const centroE = [R, S];
    const noArco = (c, r, g) => [c[0] + r * Math.cos(rad(g)), c[1] + r * Math.sin(rad(g))];
    const apice = r => [W / 2, S - Math.sqrt(r * r - (W / 2 - (W - R)) ** 2)];
    const p = pt => pt.map(n).join(',');
    const espelho = pt => [W - pt[0], pt[1]];

    function arco(d, base = H) {
        const r = R - d;
        return `M${d},${base}L${d},${S}A${r},${r} 0 0 1 ${p(apice(r))}A${r},${r} 0 0 1 ${W - d},${S}L${W - d},${base}Z`;
    }
    const anel = (a, b, fill) => `<path d="${arco(a)}${arco(b)}" fill="${fill}" fill-rule="evenodd"/>`;

    // Vidros: peças longas (ouro velho e âmbar, com um losango de palha)
    // intercaladas com peças curtas de vinho, cada uma com um cabochão rubi.
    const VIDROS = { ouro: '#c29448', ambar: '#a3633a', vinho: '#6b2420', rubi: '#8e2a22', palha: '#c39c58' };
    const clarear = (hex, t) => '#' + [1, 3, 5].map(i => {
        const v = parseInt(hex.slice(i, i + 2), 16);
        return Math.round(v + (255 - v) * t).toString(16).padStart(2, '0');
    }).join('');
    const escurecer = (hex, t) => '#' + [1, 3, 5].map(i =>
        Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - t)).toString(16).padStart(2, '0')).join('');
    const defsVidro = Object.entries(VIDROS).map(([nome, c]) => `<radialGradient id="v-${nome}" cx=".38" cy=".3" r=".9">` +
        `<stop offset="0" stop-color="${clarear(c, .24)}"/><stop offset=".55" stop-color="${c}"/>` +
        `<stop offset="1" stop-color="${escurecer(c, .3)}"/></radialGradient>`).join('') +
        `<radialGradient id="luz" cx=".5" cy=".08" r=".75"><stop offset="0" stop-color="#fff6dc" stop-opacity=".14"/>` +
        `<stop offset="1" stop-color="#fff6dc" stop-opacity="0"/></radialGradient>`;

    const CHUMBO = '#1e130b';
    const F = 14, D = 44;                          // faixa de vidro entre os offsets 14 e 44
    const rFora = R - F, rDentro = R - D, rMeio = (rFora + rDentro) / 2;
    const formas = [];    // [d, cor]
    const losangos = [];  // pontos (peças de ouro)
    const quadrifolios = []; // [x, y] (peças de âmbar)
    const cabochoes = []; // [x, y]

    // laterais retas: longa, curta, longa, ... (5 longas e 4 curtas)
    const CURTA = 30, LONGA = (PEITORIL - S - 4 * CURTA) / 5, XM = (F + D) / 2;
    let y = S;
    for (let i = 0; i < 9; i++) {
        const curta = i % 2 === 1, alto = curta ? CURTA : LONGA;
        const cor = curta ? 'vinho' : (i % 4 === 0 ? 'ouro' : 'ambar');
        formas.push([`M${F},${n(y)}H${D}V${n(y + alto)}H${F}Z`, cor]);
        formas.push([`M${W - D},${n(y)}H${W - F}V${n(y + alto)}H${W - D}Z`, cor]);
        if (curta) cabochoes.push([XM, y + alto / 2], [W - XM, y + alto / 2]);
        else if (cor === 'ouro') {
            const l = [[XM, y + 6], [D - 4, y + alto / 2], [XM, y + alto - 6], [F + 4, y + alto / 2]];
            losangos.push(l, l.map(espelho));
        } else quadrifolios.push([XM, y + alto / 2], [W - XM, y + alto / 2]);
        y += alto;
    }
    // arcos: curta, longa, curta, longa, curta, longa, curta (graus)
    const G0 = 180, GK = 246, GC = 5, GL = (GK - G0 - 4 * GC) / 3;
    let g = G0;
    for (let i = 0; i < 7; i++) {
        const longa = i % 2 === 1, dg = longa ? GL : GC, a = g, b = g + dg;
        const cor = longa ? (i === 3 ? 'ambar' : 'ouro') : 'vinho';
        const fa = noArco(centroE, rFora, a), fb = noArco(centroE, rFora, b);
        const da = noArco(centroE, rDentro, a), db = noArco(centroE, rDentro, b);
        formas.push([`M${p(fa)}A${rFora},${rFora} 0 0 1 ${p(fb)}L${p(db)}A${rDentro},${rDentro} 0 0 0 ${p(da)}Z`, cor]);
        formas.push([`M${p(espelho(fa))}A${rFora},${rFora} 0 0 0 ${p(espelho(fb))}L${p(espelho(db))}` +
            `A${rDentro},${rDentro} 0 0 1 ${p(espelho(da))}Z`, cor]);
        if (longa && cor === 'ambar') {
            const c = noArco(centroE, rMeio, (a + b) / 2);
            quadrifolios.push(c, espelho(c));
        } else if (longa) {
            const m = (a + b) / 2;
            const l = [noArco(centroE, rFora - 4, m), noArco(centroE, rMeio, b - 2.2),
                noArco(centroE, rDentro + 4, m), noArco(centroE, rMeio, a + 2.2)];
            losangos.push(l, l.map(espelho));
        } else {
            const c = noArco(centroE, rMeio, (a + b) / 2);
            cabochoes.push(c, espelho(c));
        }
        g = b;
    }
    // fecho (peça do topo, fica sob o medalhão do nível)
    {
        const fk = noArco(centroE, rFora, GK), dk = noArco(centroE, rDentro, GK);
        formas.push([`M${p(fk)}A${rFora},${rFora} 0 0 1 ${p(apice(rFora))}A${rFora},${rFora} 0 0 1 ${p(espelho(fk))}` +
            `L${p(espelho(dk))}A${rDentro},${rDentro} 0 0 0 ${p(apice(rDentro))}A${rDentro},${rDentro} 0 0 0 ${p(dk)}Z`, 'ouro']);
    }
    const chumbo = `stroke="${CHUMBO}" stroke-linejoin="round"`;
    const pecas =
        formas.map(([d, cor]) => `<path d="${d}" fill="url(#v-${cor})"/>`).join('') +
        losangos.map(l => `<polygon points="${l.map(p).join(' ')}" fill="url(#v-palha)" ${chumbo} stroke-width="2.2"/>`).join('') +
        quadrifolios.map(([x, y]) => {
            // quatro lóbulos de raio 4 a 4,5 do centro; o contorno passa pelos encontros dos lóbulos
            const r = 4, k = 3.96, q = (dx, dy) => `${n(x + dx)},${n(y + dy)}`;
            return `<path d="M${q(k, -k)}A${r},${r} 0 1 1 ${q(k, k)}A${r},${r} 0 1 1 ${q(-k, k)}A${r},${r} 0 1 1 ${q(-k, -k)}` +
                `A${r},${r} 0 1 1 ${q(k, -k)}Z" fill="url(#v-palha)" ${chumbo} stroke-width="2"/>`;
        }).join('') +
        `<path d="${arco(F)}${arco(D)}" fill="url(#luz)" fill-rule="evenodd"/>` +
        formas.map(([d]) => `<path d="${d}" fill="none" ${chumbo} stroke-width="3.6"/>`).join('') +
        cabochoes.map(([x, y]) => `<circle cx="${n(x)}" cy="${n(y)}" r="6.6" fill="url(#v-rubi)" ${chumbo} stroke-width="2.4"/>` +
            `<circle cx="${n(x - 2)}" cy="${n(y - 2.2)}" r="1.6" fill="#f3c9a8" opacity=".5"/>`).join('');

    // Peitoril entalhado: bronze com um canal de contas e uma placa central.
    const yc = PEITORIL + (H - PEITORIL) / 2;
    const contas = [];
    for (let x = 22; x < W - 20; x += 16) {
        if (Math.abs(x - W / 2) < 34) continue;
        contas.push(`<circle cx="${x}" cy="${n(yc)}" r="2" fill="${C.ouro}" stroke="${C.tinta}" stroke-width=".7"/>`);
    }
    const peitoril = `<rect x="0" y="${PEITORIL}" width="${W}" height="${H - PEITORIL}" fill="${C.tinta}"/>` +
        `<rect x="3" y="${PEITORIL + 3}" width="${W - 6}" height="${H - PEITORIL - 6}" fill="url(#b)"/>` +
        `<rect x="9" y="${n(yc - 6)}" width="${W - 18}" height="12" rx="6" fill="${C.tinta2}" stroke="${C.tinta}" stroke-width="1"/>` +
        contas.join('') +
        `<path d="M${W / 2},${n(yc - 13)}l22,13l-22,13l-22,-13Z" fill="url(#b)" stroke="${C.tinta}" stroke-width="1.6"/>` +
        `<path d="M${W / 2},${n(yc - 8)}l13,8l-13,8l-13,-8Z" fill="${C.tinta2}"/>` +
        `<circle cx="${W / 2}" cy="${n(yc)}" r="3.4" fill="${C.rubro}" stroke="${C.ouro}" stroke-width="1"/>`;

    grava('vitral.svg', svg(W, H,
        `<defs>${gradBronze('b')}${defsVidro}</defs>` +
        anel(0, 3, C.tinta) + anel(3, 11, 'url(#b)') + anel(11, F, C.tinta) +
        pecas +
        anel(D, 48, C.bronzeEsc) + anel(48, 51, C.tinta) + anel(51, 53, C.ouro) + peitoril));

    // Polígono do recorte da cena (offset 52, em % da caixa 600 x 800).
    const dRec = 52, rRec = R - dRec, base = PEITORIL + 2;
    const pts = [[dRec, base], [dRec, S]];
    const gA = Math.atan2(apice(rRec)[1] - S, apice(rRec)[0] - R) * 180 / Math.PI + 360;
    for (let i = 1; i <= 24; i++) pts.push(noArco(centroE, rRec, 180 + (gA - 180) * i / 24));
    for (let i = 23; i >= 0; i--) { const q = noArco(centroE, rRec, 180 + (gA - 180) * i / 24); pts.push([W - q[0], q[1]]); }
    pts.push([W - dRec, base]);
    const poli = pts.map(([x, y]) => `${n(x / W * 100)}% ${n(y / H * 100)}%`).join(', ');
    writeFileSync(join(SAIDA, 'vitral-recorte.css'),
        `/* Gerado por ded/tools/gerar-ornamentos.mjs: recorte da cena dentro do vitral. */\n` +
        `.vitral-cena { clip-path: polygon(${poli}); }\n`);
}

// ---------------------------------------------------------------------------
// Dragões do cabeçalho: o ícone lorc/dragon-head (game-icons.net, CC BY 3.0),
// em vinho com relevo e contorno de tinta.
{
    const sprite = readFileSync(join(RAIZ, 'ui', 'icones.svg'), 'utf8');
    const d = sprite.match(/id="i-dragao"[^>]*>(?:<!--[^>]*-->)?<path fill="currentColor" d="([^"]+)"/)[1];
    grava('dragao.svg', svg(544, 544,
        '<!-- lorc/dragon-head, game-icons.net, CC BY 3.0 -->' +
        '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c4523f"/>' +
        `<stop offset=".45" stop-color="${C.rubro}"/><stop offset="1" stop-color="${C.rubroEsc}"/></linearGradient></defs>` +
        `<path transform="translate(16 16)" d="${d}" fill="url(#g)" stroke="${C.tinta}" stroke-width="13" stroke-linejoin="round" paint-order="stroke"/>` +
        // colar de bronze: o pescoço do ícone termina num corte reto
        `<defs>${gradBronze('b')}</defs>` +
        `<rect x="22" y="462" width="244" height="56" rx="12" fill="url(#b)" stroke="${C.tinta}" stroke-width="9"/>` +
        `<path d="M34,478H254" stroke="${C.ouroClaro}" stroke-width="3" opacity=".7"/>` +
        [58, 101, 144, 187, 230].map(x => `<circle cx="${x}" cy="497" r="7" fill="${C.ouro}" stroke="${C.tinta}" stroke-width="4"/>`).join('')));
}

console.log('ornamentos gerados em', SAIDA);
