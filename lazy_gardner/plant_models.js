// Modelos procedurais das plantas do Lazy Gardener (estilo low-poly realista).
// Cada planta usa um aleatório com semente própria (plantData.shapeSeed): a
// mesma planta mantém a identidade ao crescer e ao recarregar o save.
// As peças são mescladas por material => poucas draw calls por planta.
import * as THREE from 'three';
import {
    makeRng, hashString, noise2, normalizeGeo, paint, paintSolid, tube, curvedPath,
    leafStrip, blob, lathe, orient, orientLeaf, place, dirFrom, PartBuilder, makeCanvas,
    normalMapFromHeight, readChannel, toTexture, addPlantShader
} from './procedural.js';

const TAU = Math.PI * 2;
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const _c = new THREE.Color();
const _c2 = new THREE.Color();

// ---------------------------------------------------------------------------
// Texturas (casca e cachos de folhas) e materiais compartilhados
// ---------------------------------------------------------------------------
function createBarkTextures() {
    const w = 128, h = 256;
    const rng = makeRng(1337);
    const canvas = makeCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgb(214,204,192)';
    ctx.fillRect(0, 0, w, h);
    // manchas de tom
    for (let i = 0; i < 90; i++) {
        const v = 170 + rng() * 70;
        ctx.fillStyle = `rgba(${v},${v * 0.95},${v * 0.9},0.35)`;
        const x = rng() * w, y = rng() * h;
        for (const ox of [-w, 0, w]) ctx.fillRect(x + ox, y, 4 + rng() * 14, 10 + rng() * 40);
    }
    // fissuras verticais onduladas (desenhadas com wrap horizontal e vertical)
    ctx.lineCap = 'round';
    for (let i = 0; i < 20; i++) {
        const x0 = rng() * w;
        const width = 1.2 + rng() * 3.2;
        const dark = 45 + rng() * 40;
        ctx.strokeStyle = `rgba(${dark},${dark * 0.8},${dark * 0.65},0.85)`;
        ctx.lineWidth = width;
        for (const ox of [-w, 0, w]) {
            ctx.beginPath();
            let x = x0 + ox;
            ctx.moveTo(x, -10);
            for (let y = 0; y <= h + 10; y += 12) {
                x += (rng() - 0.5) * 5;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }
    // rachaduras horizontais curtas
    for (let i = 0; i < 40; i++) {
        ctx.strokeStyle = 'rgba(70,56,46,0.7)';
        ctx.lineWidth = 1 + rng();
        const x = rng() * w, y = rng() * h, len = 4 + rng() * 10;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y + (rng() - 0.5) * 3); ctx.stroke();
    }
    const height = readChannel(canvas, 0);
    const normal = normalMapFromHeight(height, w, h, 3.2);
    return { map: toTexture(canvas, { srgb: true }), normal: toTexture(normal, { srgb: false }) };
}

// Cacho de folhas quase neutro (cinza-esverdeado): a cor vem da cor de vértice
function createLeafClusterTexture() {
    const s = 256;
    const rng = makeRng(2024);
    const canvas = makeCanvas(s, s);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, s, s);
    const cx = s / 2, cy = s / 2;
    for (let i = 0; i < 85; i++) {
        const r = Math.sqrt(rng()) * s * 0.4;
        const a = rng() * TAU;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        const len = 13 + rng() * 12, wid = 5 + rng() * 4;
        const rot = a + (rng() - 0.5) * 1.4;
        const l = 62 + rng() * 34;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.fillStyle = `hsl(${85 + rng() * 25}, ${12 + rng() * 14}%, ${l}%)`;
        ctx.beginPath();
        ctx.moveTo(-len, 0);
        ctx.quadraticCurveTo(0, -wid * 1.4, len, 0);
        ctx.quadraticCurveTo(0, wid * 1.4, -len, 0);
        ctx.fill();
        ctx.strokeStyle = `hsla(90, 20%, ${l - 22}%, 0.8)`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-len * 0.9, 0); ctx.lineTo(len * 0.8, 0); ctx.stroke();
        ctx.restore();
    }
    const tex = toTexture(canvas, { srgb: true, repeat: false });
    return tex;
}

let MATS = null;
export function getPlantMaterials() {
    if (MATS) return MATS;
    const bark = createBarkTextures();
    const leafTex = createLeafClusterTexture();
    MATS = {
        bark: addPlantShader(new THREE.MeshStandardMaterial({ vertexColors: true, map: bark.map, normalMap: bark.normal, roughness: 0.95 })),
        wood: addPlantShader(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 })),
        foliage: addPlantShader(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), { snow: true }),
        leafCard: addPlantShader(new THREE.MeshStandardMaterial({ vertexColors: true, map: leafTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 }), { flutter: 0.012, snow: true, noFlip: true }),
        soft: addPlantShader(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.62 }), { flutter: 0.004 }),
        solid: addPlantShader(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78 })),
        gloss: addPlantShader(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3 })),
        lotusGlow: addPlantShader(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.5, emissive: 0xFF1493, emissiveIntensity: 0.2 }), { flutter: 0.003 }),
        water: new THREE.MeshStandardMaterial({ color: 0x3d7480, roughness: 0.22, metalness: 0, emissive: 0x0b2a33, emissiveIntensity: 0.6 })
    };
    return MATS;
}

// Todos os materiais de planta (para pré-compilar os shaders na inicialização)
export function getAllPlantMaterials() {
    return [...Object.values(getPlantMaterials()), ...['firelotus', 'crystalbamboo', 'goldpine'].map(getHybridMaterial)];
}

// Brilho noturno de todas as lótus floridas (um único material compartilhado)
export function setLotusGlow(intensity) {
    getPlantMaterials().lotusGlow.emissiveIntensity = intensity;
}

// Materiais dos híbridos (gradiente metálico/emissivo), um por tipo
const HYBRID_MATS = {};
function getHybridMaterial(type) {
    if (HYBRID_MATS[type]) return HYBRID_MATS[type];
    const canvas = makeCanvas(16, 128);
    const c = canvas.getContext('2d');
    const grad = c.createLinearGradient(0, 128, 0, 0); // uv.v = 0 embaixo, 1 em cima
    if (type === 'firelotus') { grad.addColorStop(0, '#ff3300'); grad.addColorStop(0.5, '#ff9900'); grad.addColorStop(1, '#ffea00'); }
    else if (type === 'crystalbamboo') { grad.addColorStop(0, '#00ffff'); grad.addColorStop(0.5, '#0088ff'); grad.addColorStop(1, '#9900ff'); }
    else { grad.addColorStop(0, '#ffd700'); grad.addColorStop(0.5, '#ffa500'); grad.addColorStop(1, '#ffffff'); }
    c.fillStyle = grad; c.fillRect(0, 0, 16, 128);
    const tex = toTexture(canvas, { srgb: true, repeat: false });
    const emissive = type === 'firelotus' ? 0x661100 : type === 'crystalbamboo' ? 0x004488 : 0x554400;
    const opts = type === 'crystalbamboo'
        ? { map: tex, roughness: 0.08, metalness: 0.35, transparent: true, opacity: 0.88 }
        : { map: tex, roughness: 0.2, metalness: 0.8 };
    HYBRID_MATS[type] = addPlantShader(new THREE.MeshStandardMaterial({
        ...opts, side: THREE.DoubleSide, emissive: new THREE.Color(emissive), emissiveIntensity: 1.0
    }), { flutter: 0.002 });
    return HYBRID_MATS[type];
}

// ---------------------------------------------------------------------------
// Helpers de cor e orientação
// ---------------------------------------------------------------------------
// Cor ao longo do comprimento (uv.v 0..1): folhas, pétalas
function paintAlong(geo, fn) {
    const uv = geo.attributes.uv, col = geo.attributes.color;
    for (let i = 0; i < uv.count; i++) {
        fn(_c, uv.getY(i), uv.getX(i));
        col.setXYZ(i, _c.r, _c.g, _c.b);
    }
    return geo;
}
function gradient(geo, baseHex, tipHex, rng, jitter = 0.05, pow = 1) {
    const a = new THREE.Color(baseHex), b = new THREE.Color(tipHex);
    const k = 1 + (rng() * 2 - 1) * jitter;
    return paintAlong(geo, (out, v) => out.copy(a).lerp(b, Math.pow(Math.min(1, Math.max(0, v)), pow)).multiplyScalar(k));
}

// Folhagem: sombreamento fake (mais escuro embaixo e por dentro da copa) + variação por face
function shadeFoliage(geo, baseColor, rng, center, radius, { aoMin = 0.45, jitter = 0.07, warmTop = 0.06 } = {}) {
    const base = new THREE.Color(baseColor);
    const warm = base.clone().offsetHSL(0.035, 0.05, 0.06);
    let face = -1, k = 1;
    return paint(geo, (out, x, y, z, nx, ny, nz, f) => {
        if (f !== face) { face = f; k = 1 + (rng() * 2 - 1) * jitter; }
        const hy = (y - center.y) / radius;               // -1..1 na copa
        const dx = x - center.x, dz = z - center.z;
        const radial = Math.min(1, Math.sqrt(dx * dx + dz * dz) / radius);
        let shade = aoMin + (1 - aoMin) * Math.min(1, Math.max(0, 0.45 + hy * 0.35 + ny * 0.2 + radial * 0.25));
        out.copy(base).lerp(warm, Math.max(0, ny) * warmTop * 4).multiplyScalar(shade * k);
    });
}

// Direção relativa a um eixo: az gira em volta do eixo, elev inclina em direção a ele
function frameDir(axis, az, elev) {
    const a = axis.clone().normalize();
    const helper = Math.abs(a.y) < 0.95 ? V3(0, 1, 0) : V3(1, 0, 0);
    const u = V3().crossVectors(a, helper).normalize();
    const v = V3().crossVectors(a, u).normalize();
    return u.multiplyScalar(Math.cos(az) * Math.cos(elev))
        .addScaledVector(v, Math.sin(az) * Math.cos(elev))
        .addScaledVector(a, Math.sin(elev))
        .normalize();
}

// Ponto numa polilinha por fração 0..1 (por índice)
function pointAt(pts, f) {
    const x = f * (pts.length - 1);
    const i = Math.min(pts.length - 2, Math.floor(x));
    return pts[i].clone().lerp(pts[i + 1], x - i);
}

function card(size) {
    return normalizeGeo(new THREE.PlaneGeometry(size, size));
}

// ---------------------------------------------------------------------------
// Estágio de semente (comum a todas as espécies)
// ---------------------------------------------------------------------------
function buildSeed(B, rng, seedHex) {
    const mound = blob(0.085, { detail: 1, jag: 0.3, squash: 0.32, seed: rng.int(0, 99999) });
    place(mound, 0, 0.055, 0);
    B.add('solid', paintSolid(mound, 0x4a3222, rng, 0.12));
    const seed = blob(0.034, { detail: 1, jag: 0.08, seed: rng.int(0, 99999) });
    place(seed, 0.012, 0.09, -0.008, rng.range(-0.5, 0.5), rng() * TAU, 0.5, 1, 0.7, 1.35);
    B.add('solid', paintSolid(seed, seedHex, rng, 0.05));
    for (let i = 0; i < 3; i++) {
        const cr = blob(0.016, { detail: 0, jag: 0.3, seed: rng.int(0, 99999) });
        const a = rng() * TAU;
        place(cr, Math.cos(a) * 0.07, 0.07, Math.sin(a) * 0.07);
        B.add('solid', paintSolid(cr, 0x3b2819, rng, 0.1));
    }
}

// ---------------------------------------------------------------------------
// Árvore frondosa
// ---------------------------------------------------------------------------
function buildTree(pd, rng, B) {
    const st = pd.growthStage, sv = pd.sizeVariation || 1;
    // Genoma: sempre as mesmas chamadas, para a árvore manter a forma ao crescer
    const leanAz = rng() * TAU, lean = rng.range(0.04, 0.12);
    const nB = rng.int(4, 6);
    const branches = [];
    for (let i = 0; i < 6; i++) {
        branches.push({
            az: (i / nB) * TAU + rng.range(-0.45, 0.45), el: rng.range(0.35, 0.75),
            h: rng.range(0.5, 0.8), len: rng.range(0.4, 0.56), subAz: rng.range(-0.9, 0.9) || 0.4,
            blobR: rng.range(0.85, 1.15)
        });
    }
    const hue = rng.range(-0.035, 0.03), light = rng.range(-0.04, 0.04);
    const leafBase = new THREE.Color(0x4f8f33).offsetHSL(hue, 0, light);
    const barkBase = new THREE.Color(0x8c7156).offsetHSL(0, 0, rng.range(-0.04, 0.03));
    const rootAz = rng() * TAU;
    if (st === 0) return buildSeed(B, rng, 0x7a5230);

    const H = [0, 0.9, 1.7, 3.1][st] * sv;
    const R = [0, 0.035, 0.085, 0.2][st] * sv;
    const C = [0, 0.42, 0.85, 1.55][st] * sv;
    const barkFn = (out, t) => out.copy(barkBase).multiplyScalar(0.78 + 0.3 * t);

    // Tronco com base alargada, inclinação e leve ondulação
    const leanDir = V3(Math.cos(leanAz), 0, Math.sin(leanAz));
    const trunk = [], trunkR = [];
    const N = 7;
    for (let i = 0; i < N; i++) {
        const t = i / (N - 1);
        const wob = noise2(t * 3.1, leanAz, 7) * 0.05 * H;
        trunk.push(V3(leanDir.x * lean * H * t * t + wob * leanDir.z, -0.06 + t * H, leanDir.z * lean * H * t * t - wob * leanDir.x));
        trunkR.push(R * (i === 0 ? 1.5 : (i === 1 ? 1.12 : 1 - t * 0.5)));
    }
    trunkR[N - 1] = R * 0.42;
    B.add('bark', tube(trunk, trunkR, 8, barkFn, 1 / (TAU * R)));

    const tips = [];
    const top = trunk[N - 1];
    if (st === 1) {
        // Muda: dois raminhos finos
        for (let i = 0; i < 2; i++) {
            const b = branches[i];
            const start = pointAt(trunk, 0.62 + i * 0.12);
            const pts = curvedPath(start, dirFrom(b.az, 0.7), H * 0.32, 2, V3(0, 0.5, 0));
            B.add('bark', tube(pts, [R * 0.45, R * 0.3, R * 0.12], 4, barkFn, 1 / (TAU * R)));
            tips.push({ p: pts[2], r: C * 0.42 });
        }
    } else {
        for (let i = 0; i < nB; i++) {
            const b = branches[i];
            const start = pointAt(trunk, b.h);
            const L = b.len * H * (st === 2 ? 0.78 : 1);
            const pts = curvedPath(start, dirFrom(b.az, b.el), L, 3, V3(0, 0.55, 0), rng, 0.08);
            const rr = R * 0.52;
            B.add('bark', tube(pts, [rr, rr * 0.72, rr * 0.48, rr * 0.2], 5, barkFn, 1 / (TAU * rr)));
            tips.push({ p: pts[3], r: C * 0.5 * b.blobR });
            if (st === 3) {
                const p2 = curvedPath(pts[1], dirFrom(b.az + b.subAz, b.el + 0.3), L * 0.55, 2, V3(0, 0.5, 0), rng, 0.1);
                B.add('bark', tube(p2, [rr * 0.45, rr * 0.28, rr * 0.1], 4, barkFn, 1 / (TAU * rr)));
                tips.push({ p: p2[2], r: C * 0.36 * b.blobR });
            }
        }
        // Raízes aparentes
        for (let i = 0; i < 4; i++) {
            const a = rootAz + (i / 4) * TAU + rng.range(-0.3, 0.3);
            const start = V3(Math.cos(a) * R * 0.5, 0.08 * sv * (st === 3 ? 1.4 : 1), Math.sin(a) * R * 0.5);
            const pts = curvedPath(start, dirFrom(a, -0.45), R * 3.2, 2, V3(0, -0.4, 0));
            B.add('bark', tube(pts, [R * 0.5, R * 0.28, R * 0.06], 5, barkFn, 1 / (TAU * R)));
        }
    }
    tips.push({ p: top.clone().add(V3(0, C * 0.28, 0)), r: C * 0.62 });
    // Massas de preenchimento entre os galhos: copa mais cheia e irregular
    const fillers = st === 3 ? 4 : (st === 2 ? 2 : 0);
    for (let i = 0; i < fillers; i++) {
        const a = tips[i % tips.length].p, b = tips[(i * 3 + 1) % tips.length].p;
        const p = a.clone().lerp(b, 0.5).add(V3(rng.range(-0.2, 0.2), rng.range(0, 0.25), rng.range(-0.2, 0.2)).multiplyScalar(C));
        tips.push({ p, r: C * rng.range(0.34, 0.44) });
    }

    // Copa: massas deformadas nas pontas dos galhos + cards de folhas no contorno
    const center = V3();
    tips.forEach(t => center.add(t.p));
    center.divideScalar(tips.length);
    let canopyR = 0;
    tips.forEach(t => { canopyR = Math.max(canopyR, t.p.distanceTo(center) + t.r); });
    const cardsPer = st === 3 ? 9 : (st === 2 ? 6 : 3);
    for (const t of tips) {
        const g = blob(t.r, { detail: t.r > 0.35 ? 2 : 1, jag: 0.36, squash: rng.range(0.72, 0.9), seed: rng.int(0, 99999) });
        place(g, t.p.x, t.p.y, t.p.z, 0, rng() * TAU, 0);
        B.add('foliage', shadeFoliage(g, leafBase, rng, center, canopyR, { aoMin: 0.5 }));
        for (let k = 0; k < cardsPer; k++) {
            const d = dirFrom(rng() * TAU, rng.range(-0.75, 1.05)); // também na parte de baixo da copa
            const p = t.p.clone().addScaledVector(d, t.r * 0.9);
            const cg = orient(card(t.r * 1.3), p, d, rng() * TAU);
            const shade = 0.72 + 0.35 * Math.max(0, d.y);
            _c.copy(leafBase).multiplyScalar(shade * rng.range(0.9, 1.12));
            B.add('leafCard', paint(cg, out => out.copy(_c)));
        }
    }
}

// ---------------------------------------------------------------------------
// Pinheiro
// ---------------------------------------------------------------------------
// Camada de galhos: "saia" em estrela com pontas caídas, com fundo mais escuro
function pineSkirt(Rl, Hl, yTop, points, rot, rng, baseColor, { rings = 4 } = {}) {
    const M = points * 2;
    const rimR = [], rimDrop = [];
    for (let k = 0; k < M; k++) {
        rimR.push((k % 2 === 0 ? 1 : 0.62) * rng.range(0.82, 1.14));
        rimDrop.push(k % 2 === 0 ? rng.range(0.04, 0.24) : 0.02);
    }
    const P = (j, k) => {
        const t = j / rings, kk = k % M;
        const ang = rot + (kk / M) * TAU;
        const r = Rl * t * (1 + (rimR[kk] - 1) * t);
        const y = yTop - Hl * Math.pow(t, 1.35) - rimDrop[kk] * Hl * t * t;
        return [Math.cos(ang) * r, y, Math.sin(ang) * r];
    };
    const pos = [], uv = [], cols = [];
    const tip = baseColor.clone().offsetHSL(0.04, 0.05, 0.08);
    const pushV = (p, j, k, under = false) => {
        pos.push(...p);
        const t = j / rings;
        uv.push((k % M) / M, 1 - t);
        if (under) { _c.copy(baseColor).multiplyScalar(0.34); }
        else {
            _c.copy(baseColor).lerp(tip, t * t * (k % 2 === 0 ? 1 : 0.4)).multiplyScalar(0.55 + 0.45 * t);
        }
        cols.push(_c.r, _c.g, _c.b);
    };
    for (let j = 0; j < rings; j++) {
        for (let k = 0; k < M; k++) {
            const a = P(j, k), b = P(j + 1, k), c = P(j + 1, k + 1), d = P(j, k + 1);
            pushV(a, j, k); pushV(c, j + 1, k + 1); pushV(b, j + 1, k);
            if (j > 0) { pushV(a, j, k); pushV(d, j, k + 1); pushV(c, j + 1, k + 1); }
        }
    }
    const U = [0, yTop - Hl * 0.62, 0];
    for (let k = 0; k < M; k++) {
        pushV(P(rings, k), rings, k, true); pushV(P(rings, k + 1), rings, k + 1, true); pushV(U, 0, k, true);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.computeVertexNormals();
    // variação por face
    const col = g.attributes.color;
    for (let i = 0; i < col.count; i += 3) {
        const k = 1 + (rng() * 2 - 1) * 0.07;
        for (let j = 0; j < 3; j++) col.setXYZ(i + j, col.getX(i + j) * k, col.getY(i + j) * k, col.getZ(i + j) * k);
    }
    return g;
}

function buildPine(pd, rng, B, { foliageKey = 'foliage', scale = 1 } = {}) {
    const st = pd.growthStage, sv = (pd.sizeVariation || 1) * scale;
    const leanAz = rng() * TAU, lean = rng.range(0.01, 0.04);
    const points = rng.int(10, 13);
    const twist = rng() * TAU;
    const jit = [];
    for (let i = 0; i < 8; i++) jit.push(rng.range(0.9, 1.1));
    const green = new THREE.Color(0x2f5c2c).offsetHSL(rng.range(-0.02, 0.02), 0, rng.range(-0.03, 0.03));
    const barkBase = new THREE.Color(0x5e3b27);
    if (st === 0) return buildSeed(B, rng, 0x5a3a22);

    const PH = [0, 1.4, 3.0, 5.0, 8.4][st] * sv;
    const PR = [0, 0.035, 0.08, 0.15, 0.26][st] * sv;
    const nLayers = [0, 2, 4, 6, 8][st];
    const ancient = st === 4;
    const moss = new THREE.Color(0x4c6a2a);
    const barkFn = (out, t) => {
        out.copy(barkBase).multiplyScalar(0.75 + 0.35 * t);
        if (ancient && t < 0.22) out.lerp(moss, (0.22 - t) / 0.22 * 0.7);
    };

    const leanDir = V3(Math.cos(leanAz), 0, Math.sin(leanAz));
    const trunk = [], radii = [];
    for (let i = 0; i < 6; i++) {
        const t = i / 5;
        trunk.push(V3(leanDir.x * lean * PH * t, -0.06 + t * PH * 0.96, leanDir.z * lean * PH * t));
        radii.push(PR * (i === 0 ? 1.4 : 1 - t * 0.85));
    }
    B.add('bark', tube(trunk, radii, 8, barkFn, 1 / (TAU * PR)));

    const layers = [];
    for (let i = 0; i < nLayers; i++) {
        const t = nLayers === 1 ? 0 : i / (nLayers - 1);
        const yTop = PH * (0.3 + 0.68 * t) + (st === 1 ? PH * 0.08 : 0);
        const Rl = PH * 0.3 * (1 - t * 0.74) * jit[i];
        const Hl = Rl * 0.95 + PH * 0.05;
        const layerColor = green.clone().multiplyScalar(ancient ? 0.8 : 1).offsetHSL(0, 0, t * 0.03);
        const g = pineSkirt(Rl, Hl, yTop, points, twist + i * 0.7, rng, layerColor);
        const off = pointAt(trunk, Math.min(1, yTop / PH));
        place(g, off.x, 0, off.z);
        B.add(foliageKey, normalizeGeo(g));
        layers.push({ yTop, Rl, Hl, off });
    }
    // Ponteira
    const leader = lathe([[PH * 0.028, 0], [PH * 0.018, PH * 0.05], [0.001, PH * 0.09]], 6);
    place(leader, trunk[5].x, PH * 0.97, trunk[5].z);
    B.add(foliageKey, paintSolid(leader, green.clone().offsetHSL(0.03, 0, 0.06), rng));

    if (st >= 3) {
        // Raízes e pinhas
        for (let i = 0; i < (ancient ? 5 : 3); i++) {
            const a = twist + (i / 5) * TAU + rng.range(-0.3, 0.3);
            const pts = curvedPath(V3(Math.cos(a) * PR * 0.5, 0.1 * sv, Math.sin(a) * PR * 0.5), dirFrom(a, -0.5), PR * 3, 2, V3(0, -0.4, 0));
            B.add('bark', tube(pts, [PR * 0.5, PR * 0.26, PR * 0.05], 5, barkFn, 1 / (TAU * PR)));
        }
        const cones = ancient ? 10 : 5;
        for (let i = 0; i < cones; i++) {
            const L = layers[rng.int(0, Math.min(layers.length - 1, 4))];
            const a = rng() * TAU, r = L.Rl * rng.range(0.45, 0.7);
            const cone = blob(0.045 * sv, { detail: 1, jag: 0.25, seed: rng.int(0, 99999) });
            place(cone, L.off.x + Math.cos(a) * r, L.yTop - L.Hl * 0.75, L.off.z + Math.sin(a) * r, 0, rng() * TAU, 0, 0.7, 1.4, 0.7);
            B.add('solid', paintSolid(cone, 0x6b4526, rng, 0.12));
        }
    }
}

// ---------------------------------------------------------------------------
// Flor
// ---------------------------------------------------------------------------
function buildFlower(pd, rng, B) {
    const st = pd.growthStage, sv = pd.sizeVariation || 1;
    const bowAz = rng() * TAU, bow = rng.range(0.05, 0.16);
    const petals = rng.pick([5, 5, 6, 8]);
    const doubleRing = rng() < 0.45;
    const tilt = rng.range(0.15, 0.45);
    const leafAz = rng() * TAU;
    const leafCount = rng.int(3, 4);
    const sideBud = rng() < 0.5;
    const petalK = rng.range(0.9, 1.12);
    const petalRot = rng() * TAU;
    if (st === 0) return buildSeed(B, rng, 0x5b3a1e);

    const bloom = new THREE.Color(pd.bloomColor ?? 0xFF69B4);
    const SH = [0, 0.13, 0.36, 0.5][st] * sv;
    const bowDir = V3(Math.cos(bowAz), 0, Math.sin(bowAz));
    const stem = [];
    for (let i = 0; i <= 5; i++) {
        const t = i / 5;
        stem.push(V3(bowDir.x * bow * SH * Math.sin(t * 2.2), -0.03 + SH * t, bowDir.z * bow * SH * Math.sin(t * 2.2)));
    }
    const stemR = [0.014, 0.013, 0.012, 0.011, 0.01, 0.009].map(r => r * sv);
    const green = new THREE.Color(0x3f7a2a);
    B.add('soft', tube(stem, stemR, 5, (out, t) => out.copy(green).multiplyScalar(0.7 + 0.4 * t)));

    const top = stem[5];
    const axis = V3().subVectors(stem[5], stem[4]).normalize().addScaledVector(bowDir, tilt).normalize();
    const leafShape = t => Math.pow(Math.sin(Math.PI * Math.min(1, t)), 0.75);

    if (st === 1) {
        // Broto: dois cotilédones
        for (let i = 0; i < 2; i++) {
            const lg = leafStrip(0.065 * sv, 0.036 * sv, 3, { curl: 0.2, fold: 0.15 });
            orientLeaf(lg, top, dirFrom(leafAz + i * Math.PI, 0.45), 0);
            B.add('soft', gradient(lg, 0x5c9a36, 0x9fd06a, rng));
        }
        return;
    }
    for (let i = 0; i < leafCount; i++) {
        const lg = leafStrip(0.16 * sv, 0.048 * sv, 5, { curl: 0.5, fold: 0.3, profile: leafShape });
        const at = pointAt(stem, 0.1 + i * 0.17);
        orientLeaf(lg, at, dirFrom(leafAz + i * 2.4, 0.55 + i * 0.08), rng.range(-0.3, 0.3));
        B.add('soft', gradient(lg, 0x2f6a22, 0x5f9d3a, rng));
    }

    // Sépalas
    for (let k = 0; k < 5; k++) {
        const sg = leafStrip(0.035 * sv, 0.018 * sv, 2, { curl: 0.2, fold: 0.1 });
        orientLeaf(sg, top, frameDir(axis, petalRot + k / 5 * TAU, st === 2 ? 0.9 : -0.5), 0, axis);
        B.add('soft', gradient(sg, 0x2f6a22, 0x4f8a32, rng));
    }

    // ponta arredondada: meia elipse que ainda tem largura em t = 1
    const petalProfile = t => Math.sqrt(Math.max(0, 1 - Math.pow((Math.min(1, t) - 0.55) / 0.56, 2)));
    const lightBase = bloom.clone().lerp(new THREE.Color(0xffffff), 0.12);
    const deepBase = bloom.clone().multiplyScalar(0.78);
    const isWhite = bloom.getHex() === 0xffffff;

    if (st === 2) {
        // Botão fechado: pétalas quase paralelas ao eixo, base esverdeada
        for (let k = 0; k < 5; k++) {
            const pg = leafStrip(0.075 * sv, 0.045 * sv, 3, { curl: -0.15, fold: 0.12, profile: petalProfile });
            orientLeaf(pg, top, frameDir(axis, petalRot + k / 5 * TAU, 1.2), 0, axis);
            B.add('soft', gradient(pg, 0x6d9a3e, bloom.getHex(), rng, 0.05, 0.8));
        }
        return;
    }

    // Flor aberta: 1 ou 2 anéis de pétalas em concha + miolo
    const center = top.clone().addScaledVector(axis, 0.012 * sv);
    const ringsDef = [{ n: petals, len: 0.155, w: 0.09, elev: 0.25, off: 0 }];
    if (doubleRing) ringsDef.push({ n: petals, len: 0.11, w: 0.075, elev: 0.6, off: 0.5 });
    for (const rd of ringsDef) {
        for (let k = 0; k < rd.n; k++) {
            const pg = leafStrip(rd.len * sv * petalK, rd.w * sv, 5, { curl: -0.26, fold: 0.07, profile: petalProfile });
            const d = frameDir(axis, petalRot + (k + rd.off) / rd.n * TAU, rd.elev + rng.range(-0.08, 0.08));
            orientLeaf(pg, center, d, rng.range(-0.12, 0.12), axis);
            B.add('soft', gradient(pg, isWhite ? 0xf3e7b0 : deepBase.getHex(), isWhite ? 0xffffff : lightBase.getHex(), rng, 0.05, 0.7));
        }
    }
    const darkCenter = [0xFFD700, 0xFF4500].includes(bloom.getHex());
    const cg = blob(0.026 * sv, { detail: 1, jag: 0.3, squash: 0.35, seed: rng.int(0, 99999) });
    const qm = new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), axis));
    cg.applyMatrix4(qm);
    place(cg, center.x, center.y + 0.006 * sv, center.z);
    B.add('solid', paintSolid(cg, darkCenter ? 0x6b4424 : 0xE9B820, rng, 0.15));
    // Estames em volta do miolo
    const stamenCol = darkCenter ? 0xf2c14a : 0xfff0a0;
    for (let k = 0; k < 12; k++) {
        const s = leafStrip(0.05 * sv, 0.007 * sv, 2, { curl: -0.25, fold: 0 });
        orientLeaf(s, center, frameDir(axis, k / 12 * TAU, 0.5), 0, axis);
        B.add('soft', paint(s, out => out.setHex(stamenCol)));
    }
    // Botão lateral (metade das flores)
    if (sideBud) {
        const from = pointAt(stem, 0.55);
        const bs = curvedPath(from, dirFrom(leafAz + Math.PI, 1.0), SH * 0.32, 3, V3(0, 0.6, 0));
        B.add('soft', tube(bs, [0.008, 0.007, 0.006, 0.005].map(r => r * sv), 4, out => out.copy(green)));
        const tip = bs[3], bAxis = V3().subVectors(bs[3], bs[2]).normalize();
        for (let k = 0; k < 5; k++) {
            const pg = leafStrip(0.045 * sv, 0.028 * sv, 2, { curl: -0.15, fold: 0.12, profile: petalProfile });
            orientLeaf(pg, tip, frameDir(bAxis, k / 5 * TAU, 1.2), 0, bAxis);
            B.add('soft', gradient(pg, 0x6d9a3e, bloom.getHex(), rng, 0.05, 0.8));
        }
    }
}

// ---------------------------------------------------------------------------
// Cogumelo
// ---------------------------------------------------------------------------
function capHeightAt(profile, r) {
    for (let i = 0; i < profile.length - 1; i++) {
        const [r0, y0] = profile[i], [r1, y1] = profile[i + 1];
        if (r >= r0 && r <= r1) return y0 + (y1 - y0) * ((r - r0) / (r1 - r0 || 1));
    }
    return profile[profile.length - 1][1];
}

function makeMushroom(B, rng, ox, oz, H, CR, kind, tilt, tiltAz) {
    const parts = [];
    const add = (key, g) => parts.push([key, g]);
    const amanita = kind === 'amanita';
    const SR = CR * (amanita ? 0.22 : 0.34);
    const stem = lathe([[SR * 1.55, -0.03], [SR * 1.6, H * 0.08], [SR * 1.22, H * 0.22], [SR * 1.02, H * 0.46], [SR * 0.92, H * 0.8], [SR * 0.88, H], [0.001, H + 0.001]], 10);
    const stemCol = new THREE.Color(amanita ? 0xefe6d2 : 0xe2cfa8), baseCol = new THREE.Color(0x8a7454);
    add('solid', paint(stem, (out, x, y) => out.copy(stemCol).lerp(baseCol, Math.max(0, 1 - y / (H * 0.25)) * 0.6)));
    if (amanita) {
        const skirt = lathe([[SR * 0.95, H * 0.8], [SR * 1.6, H * 0.72], [SR * 1.85, H * 0.63]], 12);
        add('soft', paintSolid(skirt, 0xf1ebdc, rng, 0.05));
    }
    const prof = amanita
        ? [[0.001, H + CR * 0.42], [CR * 0.3, H + CR * 0.4], [CR * 0.6, H + CR * 0.31], [CR * 0.85, H + CR * 0.16], [CR * 0.98, H + CR * 0.03], [CR * 0.97, H - CR * 0.04], [CR * 0.88, H - CR * 0.03]]
        : [[0.001, H + CR * 0.55], [CR * 0.35, H + CR * 0.52], [CR * 0.68, H + CR * 0.4], [CR * 0.9, H + CR * 0.2], [CR * 1.0, H + CR * 0.04], [CR * 0.95, H - CR * 0.03], [CR * 0.85, H - CR * 0.01]];
    // perfil da borda de baixo até o topo => faces voltadas para fora
    const cap = lathe([...prof].reverse(), 18);
    const capTop = new THREE.Color(amanita ? 0x8e1812 : 0x5e3a1e);
    const capRim = new THREE.Color(amanita ? 0xd8452a : 0xa36a3a);
    add('gloss', paint(cap, (out, x, y, z) => out.copy(capTop).lerp(capRim, Math.min(1, Math.hypot(x, z) / CR) ** 1.5)));
    // Lamelas: listras radiais por baixo do chapéu
    // perfil de dentro para fora => faces voltadas para baixo
    const gills = lathe([[SR * 0.95, H + CR * 0.07], [CR * 0.5, H + CR * 0.04], [CR * 0.88, H - CR * 0.03]], 48);
    const gillCol = new THREE.Color(amanita ? 0xf2e9d6 : 0xc9a86c);
    add('solid', paint(gills, (out, x, y, z) => {
        const a = Math.atan2(z, x) + Math.PI;
        const stripe = Math.floor(a / (TAU / 48)) % 2;
        out.copy(gillCol).multiplyScalar(stripe ? 0.72 : 1);
    }));
    if (amanita) {
        const nSpots = rng.int(9, 15);
        for (let i = 0; i < nSpots; i++) {
            const r = CR * rng.range(0.08, 0.86);
            const a = rng() * TAU;
            const y = capHeightAt(prof, r);
            const n = V3(Math.cos(a) * r, (y - (H - CR * 0.25)), Math.sin(a) * r).normalize();
            const sp = blob(CR * rng.range(0.05, 0.085), { detail: 0, jag: 0.3, seed: rng.int(0, 99999) });
            sp.scale(1, 0.4, 1);
            const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), n);
            sp.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q));
            place(sp, Math.cos(a) * r, y + CR * 0.01, Math.sin(a) * r);
            add('solid', paintSolid(sp, 0xf6f1e7, rng, 0.04));
        }
    }
    const m = new THREE.Matrix4().compose(
        V3(ox, 0, oz),
        new THREE.Quaternion().setFromAxisAngle(V3(Math.cos(tiltAz), 0, Math.sin(tiltAz)), tilt),
        V3(1, 1, 1)
    );
    for (const [key, g] of parts) { g.applyMatrix4(m); B.add(key, g); }
}

function buildMushroom(pd, rng, B) {
    const st = pd.growthStage, sv = pd.sizeVariation || 1;
    const kind = rng() < 0.68 ? 'amanita' : 'porcini';
    const tilt = rng.range(0.02, 0.14), tiltAz = rng() * TAU;
    const comp = [];
    for (let i = 0; i < 2; i++) comp.push({ a: rng() * TAU, d: rng.range(0.22, 0.34), s: rng.range(0.36, 0.52), tilt: rng.range(0.1, 0.3) });
    if (st === 0) {
        for (let i = 0; i < 4; i++) {
            const nub = blob(0.018, { detail: 0, jag: 0.25, seed: rng.int(0, 99999) });
            const a = rng() * TAU, d = rng.range(0, 0.07);
            place(nub, Math.cos(a) * d, 0.065, Math.sin(a) * d, 0, 0, 0, 1, 1.3, 1);
            B.add('solid', paintSolid(nub, 0xe8dcc0, rng, 0.08));
        }
        return;
    }
    const k = kind === 'amanita' ? 1 : 0.82;
    const H = [0, 0.17, 0.34][st] * sv * k;
    const CR = [0, 0.17, 0.36][st] * sv * (kind === 'amanita' ? 1 : 1.05);
    makeMushroom(B, rng, 0, 0, H, CR, kind, tilt, tiltAz);
    if (st === 2) {
        for (const c of comp) {
            makeMushroom(B, rng, Math.cos(c.a) * c.d * sv, Math.sin(c.a) * c.d * sv, H * c.s, CR * c.s, kind, c.tilt, c.a);
        }
    }
}

// ---------------------------------------------------------------------------
// Bambu
// ---------------------------------------------------------------------------
function buildBamboo(pd, rng, B) {
    const st = pd.growthStage, sv = pd.sizeVariation || 1;
    const culms = [];
    for (let i = 0; i < 9; i++) {
        culms.push({
            a: rng() * TAU, d: i === 0 ? 0.02 : rng.range(0.07, 0.3), hK: i === 0 ? 1.12 : rng.range(0.72, 1.12),
            leanAz: rng() * TAU, lean: rng.range(0.02, 0.1), seed: rng.int(0, 1e9), old: rng() < 0.3
        });
    }
    if (st === 0) return buildSeed(B, rng, 0x6b5a2a);

    const Hb = [0, 0.5, 1.4, 2.6][st] * sv;
    const r = (st === 3 ? 0.034 : 0.028) * sv;
    if (st === 1) {
        // Broto com bainhas
        const shoot = lathe([[r * 1.9, -0.03], [r * 1.65, Hb * 0.3], [r * 1.15, Hb * 0.68], [0.002, Hb]], 8);
        const c1 = new THREE.Color(0x6c6a2e), c2 = new THREE.Color(0x9aa84a);
        B.add('wood', paint(shoot, (out, x, y, z) => {
            const band = Math.floor(y / (Hb * 0.18)) % 2;
            out.copy(c1).lerp(c2, y / Hb).multiplyScalar(band ? 0.82 : 1);
        }));
        for (let i = 0; i < 3; i++) {
            const lg = leafStrip(0.12 * sv, 0.03 * sv, 3, { curl: 0.1, fold: 0.2 });
            orientLeaf(lg, V3(0, Hb * (0.3 + i * 0.2), 0), dirFrom(i * 2.1, 1.1), 0);
            B.add('soft', gradient(lg, 0x7a7a34, 0xa9b85a, rng));
        }
        return;
    }
    const count = [0, 1, 4, 9][st];
    const nodeGap = 0.21 * sv;
    for (let ci = 0; ci < count; ci++) {
        const c = culms[ci];
        const cr = makeRng(c.seed);
        const h = Hb * c.hK;
        const nodes = Math.max(3, Math.round(h / nodeGap));
        const leanDir = V3(Math.cos(c.leanAz), 0, Math.sin(c.leanAz));
        const bx = Math.cos(c.a) * c.d * sv, bz = Math.sin(c.a) * c.d * sv;
        const at = y => V3(bx + leanDir.x * c.lean * y * y / h, y, bz + leanDir.z * c.lean * y * y / h);
        const pts = [at(-0.04)], radii = [r * 1.05], nodeRing = [false];
        for (let n = 1; n <= nodes; n++) {
            const y = h * n / nodes;
            const rr = r * (1 - 0.35 * (n / nodes));
            if (n < nodes) {
                pts.push(at(y - 0.012), at(y), at(y + 0.012));
                radii.push(rr, rr * 1.2, rr);
                nodeRing.push(false, true, false);
            } else {
                pts.push(at(y));
                radii.push(rr * 0.35);
                nodeRing.push(false);
            }
        }
        const green = new THREE.Color(c.old && st === 3 ? 0x8f9a3a : 0x5f8f2a);
        const nodeCol = new THREE.Color(0x9a8f48);
        B.add('wood', tube(pts, radii, 6, (out, t, i) => {
            out.copy(green).multiplyScalar(0.78 + 0.35 * t);
            if (nodeRing[i]) out.copy(nodeCol).multiplyScalar(0.8);
        }));
        // Folhas em leque nos nós superiores
        const firstLeafNode = Math.floor(nodes * 0.42);
        for (let n = firstLeafNode; n <= nodes; n++) {
            if ((n - firstLeafNode) % 2 === 1 && n !== nodes) continue;
            const p = at(h * n / nodes);
            const k = n === nodes ? 3 : cr.int(3, 5);
            const baseAz = cr() * TAU;
            for (let j = 0; j < k; j++) {
                const lg = leafStrip(0.17 * sv * cr.range(0.8, 1.2), 0.03 * sv, 4, {
                    curl: 0.55, fold: 0.25, profile: t => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.6)), 0.9)
                });
                orientLeaf(lg, p, dirFrom(baseAz + j * (TAU / k) + cr.range(-0.3, 0.3), cr.range(-0.05, 0.4)), cr.range(-0.4, 0.4));
                const yellow = st === 3 && cr() < 0.08;
                B.add('soft', gradient(lg, yellow ? 0xa89a45 : 0x4f8a2a, yellow ? 0xd8c56a : 0x8fbf4a, cr));
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Arbusto de frutas
// ---------------------------------------------------------------------------
function buildBerryBush(pd, rng, B) {
    const st = pd.growthStage, sv = pd.sizeVariation || 1;
    const blobsG = [];
    for (let i = 0; i < 8; i++) blobsG.push({ az: (i / 8) * TAU + rng.range(-0.3, 0.3), el: rng.range(0.05, 0.6), r: rng.range(0.19, 0.26) });
    const clusters = [];
    for (let i = 0; i < 14; i++) clusters.push({ az: rng() * TAU, el: rng.range(-0.15, 0.85), n: rng.int(3, 4), unripe: rng() < 0.12 });
    const leafBase = new THREE.Color(0x2f6a25).offsetHSL(rng.range(-0.02, 0.02), 0, rng.range(-0.03, 0.02));
    if (st === 0) return buildSeed(B, rng, 0x4a2a1a);

    const woodCol = new THREE.Color(0x5a4030);
    const woodFn = (out, t) => out.copy(woodCol).multiplyScalar(0.8 + 0.3 * t);
    if (st === 1) {
        const pts = curvedPath(V3(0, -0.03, 0), V3(0.05, 1, 0), 0.3 * sv, 3, null, rng, 0.08);
        B.add('bark', tube(pts, [0.02, 0.016, 0.012, 0.008].map(x => x * sv), 5, woodFn, 8));
        const center = pts[3].clone();
        for (let i = 0; i < 3; i++) {
            const g = blob(0.1 * sv, { detail: 1, jag: 0.3, seed: rng.int(0, 99999) });
            const a = i / 3 * TAU;
            place(g, center.x + Math.cos(a) * 0.06 * sv, center.y + (i === 0 ? 0.05 : -0.02) * sv, center.z + Math.sin(a) * 0.06 * sv);
            B.add('foliage', shadeFoliage(g, leafBase, rng, center, 0.18 * sv));
        }
        for (let i = 0; i < 5; i++) {
            const d = dirFrom(rng() * TAU, rng.range(-0.2, 1));
            const cg = orient(card(0.13 * sv), center.clone().addScaledVector(d, 0.1 * sv), d, rng() * TAU);
            _c.copy(leafBase).multiplyScalar(rng.range(0.85, 1.15));
            B.add('leafCard', paint(cg, out => out.copy(_c)));
        }
        return;
    }

    const cy = 0.3 * sv, dome = 0.3 * sv;
    const center = V3(0, cy, 0);
    // Galhos na base
    for (let i = 0; i < 5; i++) {
        const a = i / 5 * TAU + rng.range(-0.3, 0.3);
        const pts = curvedPath(V3(0, -0.03, 0), dirFrom(a, 1.05), 0.3 * sv, 2, null, rng, 0.1);
        B.add('bark', tube(pts, [0.022, 0.015, 0.008].map(x => x * sv), 4, woodFn, 8));
    }
    const main = blob(0.3 * sv, { detail: 2, jag: 0.28, squash: 0.8, seed: rng.int(0, 99999) });
    place(main, 0, cy + 0.03 * sv, 0);
    B.add('foliage', shadeFoliage(main, leafBase, rng, center, 0.55 * sv));
    const surface = [];
    for (const b of blobsG) {
        const d = dirFrom(b.az, b.el);
        const p = center.clone().addScaledVector(d, dome).add(V3(0, -0.05 * sv, 0));
        p.y = Math.max(p.y, 0.14 * sv);
        const g = blob(b.r * sv, { detail: 2, jag: 0.3, squash: 0.85, seed: rng.int(0, 99999) });
        place(g, p.x, p.y, p.z, 0, rng() * TAU, 0);
        B.add('foliage', shadeFoliage(g, leafBase, rng, center, 0.55 * sv));
        surface.push({ p, r: b.r * sv });
    }
    for (let i = 0; i < 30; i++) {
        const s = surface[i % surface.length];
        const d = dirFrom(rng() * TAU, rng.range(-0.15, 1.1));
        const cg = orient(card(s.r * 1.15), s.p.clone().addScaledVector(d, s.r * 0.85), d, rng() * TAU);
        _c.copy(leafBase).multiplyScalar((0.75 + 0.35 * Math.max(0, d.y)) * rng.range(0.9, 1.12));
        B.add('leafCard', paint(cg, out => out.copy(_c)));
    }
    if (st === 3) {
        const red = new THREE.Color(0xb3122b), orange = new THREE.Color(0xe0782a);
        // Casca externa da folhagem: distância, a partir do centro, até a última
        // massa atravessada pelo raio (as frutas ficam visíveis, nem soltas nem enterradas)
        const shells = [{ p: V3(0, cy + 0.03 * sv, 0), r: 0.3 * sv }, ...surface].map(s => ({ p: s.p, r: s.r * 1.05 }));
        const shellDistance = d => {
            let best = 0;
            for (const s of shells) {
                const oc = center.clone().sub(s.p);
                const b = oc.dot(d), c = oc.lengthSq() - s.r * s.r;
                const disc = b * b - c;
                if (disc >= 0) best = Math.max(best, -b + Math.sqrt(disc));
            }
            return best;
        };
        clusters.forEach(cl => {
            const d = dirFrom(cl.az, Math.min(cl.el, 0.6));
            const p = center.clone().addScaledVector(d, shellDistance(d) * 0.97);
            p.y = Math.max(p.y, 0.12 * sv);
            for (let j = 0; j < cl.n; j++) {
                const b = blob(0.034 * sv, { detail: 1, jag: 0.06, seed: rng.int(0, 99999) });
                const o = V3(rng.range(-1, 1), rng.range(-1, 0.3), rng.range(-1, 1)).normalize().multiplyScalar(0.036 * sv);
                place(b, p.x + o.x, p.y + o.y, p.z + o.z);
                const base = cl.unripe ? orange : red;
                B.add('gloss', paintSolid(b, _c2.copy(base).multiplyScalar(rng.range(0.8, 1.1)), rng, 0.04));
            }
        });
    }
}

// ---------------------------------------------------------------------------
// Lótus
// ---------------------------------------------------------------------------
function lotusPad(radius, notch, rng) {
    const segs = 20, rings = 3;
    const a0 = notch / 2, a1 = TAU - notch / 2;
    const P = (j, k) => {
        const t = j / rings;
        const a = a0 + (a1 - a0) * (k / segs);
        const r = radius * t * (1 + noise2(k * 0.7, j, 5) * 0.03);
        const y = 0.004 + 0.008 * (j / rings); // sempre acima da água, borda erguida
        return [Math.cos(a) * r, y, Math.sin(a) * r];
    };
    const pos = [], cols = [];
    const green = new THREE.Color(0x2f7f35), vein = new THREE.Color(0x4f9f4a), rim = new THREE.Color(0x6d4a2a);
    const colAt = (j, k) => {
        _c.copy(k % 2 === 0 ? vein : green);
        if (j === rings) _c.lerp(rim, 0.35);
        _c.multiplyScalar(0.9 + 0.1 * (j / rings));
        return [_c.r, _c.g, _c.b];
    };
    for (let j = 0; j < rings; j++) {
        for (let k = 0; k < segs; k++) {
            const a = P(j, k), b = P(j + 1, k), c = P(j + 1, k + 1), d = P(j, k + 1);
            const ca = colAt(j, k), cb = colAt(j + 1, k), cc = colAt(j + 1, k + 1), cd = colAt(j, k + 1);
            pos.push(...a, ...c, ...b); cols.push(...ca, ...cc, ...cb);
            if (j > 0) { pos.push(...a, ...d, ...c); cols.push(...ca, ...cd, ...cc); }
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return normalizeGeo(g);
}

function lotusFlower(B, rng, at, sv, petalKey, glowColors = true) {
    const rings = [
        { n: 8, len: 0.17, w: 0.075, elev: 0.28, off: 0 },
        { n: 8, len: 0.15, w: 0.07, elev: 0.62, off: 0.5 },
        { n: 6, len: 0.11, w: 0.06, elev: 1.0, off: 0.25 }
    ];
    const rot = rng() * TAU;
    const up = V3(0, 1, 0);
    rings.forEach((rd, ri) => {
        for (let k = 0; k < rd.n; k++) {
            const pg = leafStrip(rd.len * sv, rd.w * sv, 4, { curl: -0.35, fold: 0.15, profile: t => Math.pow(Math.sin(Math.PI * Math.min(1, t)), 0.85) });
            orientLeaf(pg, at, frameDir(up, rot + (k + rd.off) / rd.n * TAU, rd.elev + rng.range(-0.06, 0.06)), rng.range(-0.1, 0.1));
            if (glowColors) B.add(petalKey, gradient(pg, ri === 2 ? 0xfff6f8 : 0xffe8f0, ri === 2 ? 0xff7fb4 : 0xff4f9a, rng, 0.04, 1.3));
            else B.add(petalKey, pg);
        }
    });
    const pod = lathe([[0.001, 0.0], [0.03, 0.004], [0.043, 0.036], [0.04, 0.045], [0.001, 0.045]].map(([r, y]) => [r * sv, y * sv]), 12);
    place(pod, at.x, at.y, at.z);
    B.add('solid', paint(pod, (out, x, y) => out.setHex(y > 0.04 * sv ? 0xc9c24a : 0xe9c43b)));
    for (let k = 0; k < 14; k++) {
        const s = leafStrip(0.035 * sv, 0.008 * sv, 1, { curl: -0.2, fold: 0 });
        orientLeaf(s, at.clone().add(V3(0, 0.01 * sv, 0)), frameDir(up, k / 14 * TAU, 0.9), 0);
        B.add('soft', paint(s, out => out.setHex(0xf2d24a)));
    }
}

function buildLotus(pd, rng, B, { petalKey = 'lotusGlow', glowColors = true, forceStage = null } = {}) {
    const st = forceStage ?? pd.growthStage, sv = pd.sizeVariation || 1;
    const pads = [];
    for (let i = 0; i < 3; i++) pads.push({ az: rng() * TAU, d: i === 0 ? rng.range(0, 0.06) : rng.range(0.16, 0.24), r: rng.range(0.16, 0.24), rot: rng() * TAU, notch: rng.range(0.35, 0.6) });
    const stemAz = rng() * TAU;
    if (st === 0) return buildSeed(B, rng, 0x4B0082);

    const WY = 0.07;
    // Pequena poça sob a lótus
    const pts = [], segs = 22, R = 0.4 * sv;
    for (let k = 0; k < segs; k++) {
        const a0 = k / segs * TAU, a1 = (k + 1) / segs * TAU;
        const r0 = R * (0.9 + noise2(k * 0.8, 1.3, 9) * 0.1), r1 = R * (0.9 + noise2((k + 1) % segs * 0.8, 1.3, 9) * 0.1);
        pts.push(0, WY, 0, Math.cos(a1) * r1, WY, Math.sin(a1) * r1, Math.cos(a0) * r0, WY, Math.sin(a0) * r0);
    }
    const water = new THREE.BufferGeometry();
    water.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    water.computeVertexNormals();
    B.add('water', normalizeGeo(water));

    const nPads = Math.min(3, st);
    for (let i = 0; i < nPads; i++) {
        const p = pads[i];
        const g = lotusPad(p.r * sv, p.notch, rng);
        const d = Math.min(p.d, Math.max(0, 0.36 - p.r)); // folha inteira dentro da poça (raio 0,4)
        place(g, Math.cos(p.az) * d * sv, WY + 0.004 + i * 0.002, Math.sin(p.az) * d * sv, 0, p.rot, 0);
        B.add('soft', g);
    }
    if (st === 2) {
        const stem = curvedPath(V3(0, WY - 0.02, 0), V3(Math.cos(stemAz) * 0.2, 1, Math.sin(stemAz) * 0.2), 0.16 * sv, 3);
        B.add('soft', tube(stem, [0.012, 0.011, 0.01, 0.009].map(x => x * sv), 5, out => out.setHex(0x4f8a32)));
        const top = stem[3];
        for (let k = 0; k < 6; k++) {
            const pg = leafStrip(0.09 * sv, 0.05 * sv, 3, { curl: -0.2, fold: 0.2 });
            orientLeaf(pg, top, frameDir(V3(0, 1, 0), k / 6 * TAU, 1.15), 0);
            if (glowColors) B.add(petalKey === 'lotusGlow' ? 'soft' : petalKey, gradient(pg, 0xd8ecc0, 0xff5f9f, rng, 0.04, 1.2));
            else B.add(petalKey, pg);
        }
    }
    if (st >= 3) {
        const at = V3(0, WY + 0.05 * sv, 0);
        lotusFlower(B, rng, at, sv, petalKey, glowColors);
    }
}

// ---------------------------------------------------------------------------
// Híbridos (TASK_003)
// ---------------------------------------------------------------------------
function buildHybrid(pd, rng, B) {
    const stages = ['seed', 'sprout', 'bloom'];
    const stage = stages[pd.growthStage] || 'seed';
    const sv = pd.sizeVariation || 1;
    if (stage === 'seed') return buildSeed(B, rng, 0x8B4513);
    if (pd.type === 'firelotus') {
        buildLotus({ ...pd, sizeVariation: sv }, rng, B, { petalKey: 'hybrid', glowColors: false, forceStage: stage === 'sprout' ? 2 : 3 });
        return;
    }
    if (pd.type === 'goldpine') {
        buildPine({ ...pd, growthStage: stage === 'sprout' ? 2 : 3, sizeVariation: sv }, rng, B, { foliageKey: 'hybrid', scale: stage === 'sprout' ? 0.2 : 0.24 });
        return;
    }
    // crystalbamboo: cristais prismáticos em cacho + algumas folhas de bambu
    const n = stage === 'sprout' ? 3 : 7;
    const hMax = (stage === 'sprout' ? 0.3 : 0.8) * sv;
    for (let i = 0; i < n; i++) {
        const h = hMax * (i === 0 ? 1 : rng.range(0.45, 0.85));
        const r = h * 0.1;
        const a = rng() * TAU, d = i === 0 ? 0 : rng.range(0.05, 0.16) * sv;
        const prism = normalizeGeo(new THREE.CylinderGeometry(r, r * 1.1, h, 6, 1, true));
        prism.translate(0, h / 2, 0);
        const tip = normalizeGeo(new THREE.ConeGeometry(r, r * 2.4, 6, 1, true));
        tip.translate(0, h + r * 1.2, 0);
        const m = new THREE.Matrix4().compose(V3(Math.cos(a) * d, -0.03, Math.sin(a) * d),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(rng.range(-0.25, 0.25), rng() * TAU, rng.range(-0.25, 0.25))), V3(1, 1, 1));
        prism.applyMatrix4(m); tip.applyMatrix4(m);
        B.add('hybrid', prism); B.add('hybrid', tip);
    }
    for (let i = 0; i < 5; i++) {
        const lg = leafStrip(0.15 * sv, 0.028 * sv, 4, { curl: 0.5, fold: 0.25 });
        orientLeaf(lg, V3(0, hMax * rng.range(0.2, 0.5), 0), dirFrom(rng() * TAU, rng.range(0, 0.4)), 0);
        B.add('soft', gradient(lg, 0x4f8a2a, 0x8fbf4a, rng));
    }
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
export function shapeSeedFor(pd) {
    if (pd.shapeSeed == null) pd.shapeSeed = hashString(`${pd.type}:${(pd.position?.x ?? 0).toFixed(2)}:${(pd.position?.z ?? 0).toFixed(2)}`);
    return pd.shapeSeed;
}

export function buildPlantModel(pd) {
    const rng = makeRng(shapeSeedFor(pd));
    const B = new PartBuilder();
    if (pd.isHybrid) buildHybrid(pd, rng, B);
    else {
        switch (pd.type) {
            case 'flower': buildFlower(pd, rng, B); break;
            case 'tree': buildTree(pd, rng, B); break;
            case 'pinetree': buildPine(pd, rng, B); break;
            case 'mushroom': buildMushroom(pd, rng, B); break;
            case 'bamboo': buildBamboo(pd, rng, B); break;
            case 'berrybush': buildBerryBush(pd, rng, B); break;
            case 'lotus': buildLotus(pd, rng, B); break;
            default: buildSeed(B, rng, 0x8B4513);
        }
    }
    const mats = getPlantMaterials();
    const group = B.build(pd.isHybrid ? { ...mats, hybrid: getHybridMaterial(pd.type) } : mats);
    group.userData.isPlantModel = true;
    return group;
}

// Toco seco deixado por uma praga
export function createDeadStump(pd) {
    const rng = makeRng((shapeSeedFor(pd) ^ 0xdead) >>> 0);
    const B = new PartBuilder();
    const grey = new THREE.Color(0x6d6358);
    const fn = (out, t) => out.copy(grey).multiplyScalar(0.75 + 0.3 * t);
    const H = 0.26;
    const pts = [V3(0, -0.05, 0), V3(0.005, 0.06, 0), V3(0.01, 0.16, 0.005), V3(0.012, H, 0.006)];
    B.add('bark', tube(pts, [0.15, 0.125, 0.115, 0.11], 9, fn, 1.5));
    const cap = lathe([[0.11, H], [0.075, H + 0.004], [0.04, H + 0.006], [0.001, H + 0.006]], 9);
    place(cap, 0.012, 0, 0.006);
    const ringA = new THREE.Color(0xb8a58a), ringB = new THREE.Color(0x8f7b62);
    B.add('solid', paint(cap, (out, x, y, z) => {
        const r = Math.hypot(x - 0.012, z - 0.006);
        out.copy(Math.floor(r / 0.018) % 2 ? ringA : ringB).multiplyScalar(r < 0.02 ? 0.8 : 1);
    }));
    for (let i = 0; i < 2; i++) {
        const a = rng() * TAU;
        const tw = curvedPath(V3(Math.cos(a) * 0.1, 0.12 + i * 0.07, Math.sin(a) * 0.1), dirFrom(a, 0.6), 0.14, 2, null, rng, 0.2);
        B.add('bark', tube(tw, [0.022, 0.012, 0.004], 4, fn, 4));
    }
    for (let i = 0; i < 3; i++) {
        const a = rng() * TAU;
        const rt = curvedPath(V3(Math.cos(a) * 0.1, 0.03, Math.sin(a) * 0.1), dirFrom(a, -0.4), 0.18, 2, V3(0, -0.3, 0));
        B.add('bark', tube(rt, [0.05, 0.028, 0.006], 5, fn, 3));
    }
    return B.build(getPlantMaterials());
}

// Libera a GPU: geometrias sempre; materiais só os clonados para esta planta
export function disposePlantMesh(obj) {
    if (!obj) return;
    obj.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material && o.material.userData && o.material.userData.owned) o.material.dispose();
    });
}
