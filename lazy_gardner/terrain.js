// Terreno do Lazy Gardener: relevo com ruído (suave no centro, colinas nas
// bordas), textura procedural do chão, canteiros de terra que acompanham o
// relevo e grama 3D instanciada com vento.
import * as THREE from 'three';
import {
    fbm2, noise2, smoothstep, makeRng, makeCanvas, normalMapFromHeight, toTexture,
    SHARED_UNIFORMS
} from './procedural.js';

export const TERRAIN_SIZE = 100;
const TERRAIN_SEGMENTS = 160;

// ---------------------------------------------------------------------------
// Relevo
// ---------------------------------------------------------------------------
// Centro (raio ~14): ondulação de ~20-30 cm para plantar sem rampa.
// Bordas: colinas de até ~6 m que formam o horizonte.
export function getTerrainHeight(x, z) {
    const r = Math.hypot(x, z);
    const gentle = fbm2(x * 0.11 + 3.1, z * 0.11 - 7.7, 3, 11) * 0.42;
    const hillsRaw = fbm2(x * 0.034 - 2.3, z * 0.034 + 5.2, 4, 29) * 0.5 + 0.5;
    const hills = Math.pow(hillsRaw, 1.35) * 7.0 * smoothstep(14, 36, r);
    return gentle + hills;
}

export function getTerrainNormal(x, z, out = new THREE.Vector3()) {
    const e = 0.25;
    const hx = getTerrainHeight(x + e, z) - getTerrainHeight(x - e, z);
    const hz = getTerrainHeight(x, z + e) - getTerrainHeight(x, z - e);
    return out.set(-hx, 2 * e, -hz).normalize();
}

// ---------------------------------------------------------------------------
// Textura de detalhe do chão (tileável)
//   R = detalhe fino (folhinhas/torrões)  G = manchas médias  B = pedrinhas/ruído
// ---------------------------------------------------------------------------
function periodicNoise(x, y, period, seed) {
    // ruído de valor com a grade "enrolada" no período => textura sem emenda
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const h = (a, b) => (noise2(((a % period) + period) % period + 0.5, ((b % period) + period) % period + 0.5, seed) + 1) * 0.5;
    const a = h(ix, iy), b = h(ix + 1, iy), c = h(ix, iy + 1), d = h(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function createGroundDetail(size = 512) {
    const rng = makeRng(90210);
    // Canal R: pinceladas curtas em várias direções (textura de grama vista de cima)
    const strokes = makeCanvas(size, size);
    const sctx = strokes.getContext('2d');
    sctx.fillStyle = 'rgb(128,128,128)';
    sctx.fillRect(0, 0, size, size);
    sctx.lineCap = 'round';
    for (let i = 0; i < 9000; i++) {
        const x = rng() * size, y = rng() * size;
        const len = 3 + rng() * 9, ang = rng() * Math.PI * 2;
        const v = Math.floor(80 + rng() * 120);
        sctx.strokeStyle = `rgb(${v},${v},${v})`;
        sctx.lineWidth = 0.8 + rng() * 1.6;
        const dx = Math.cos(ang) * len, dy = Math.sin(ang) * len;
        // desenha também nas bordas opostas para a textura emendar sem costura
        for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
            if (x + ox < -20 || x + ox > size + 20 || y + oy < -20 || y + oy > size + 20) continue;
            sctx.beginPath();
            sctx.moveTo(x + ox, y + oy);
            sctx.lineTo(x + ox + dx, y + oy + dy);
            sctx.stroke();
        }
    }
    const sdata = sctx.getImageData(0, 0, size, size).data;

    const canvas = makeCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(size, size);
    const height = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = y * size + x, o = i * 4;
            const u = x / size, v = y / size;
            const med = periodicNoise(u * 8, v * 8, 8, 3) * 0.6 + periodicNoise(u * 16, v * 16, 16, 4) * 0.4;
            const fine = periodicNoise(u * 64, v * 64, 64, 5);
            const stroke = sdata[o] / 255;
            const r = Math.min(1, Math.max(0, stroke * 0.75 + fine * 0.25));
            const pebble = periodicNoise(u * 40, v * 40, 40, 6);
            img.data[o] = r * 255;
            img.data[o + 1] = med * 255;
            img.data[o + 2] = (pebble > 0.78 ? 1 : pebble * 0.6) * 255;
            img.data[o + 3] = 255;
            height[i] = r * 0.7 + med * 0.3;
        }
    }
    ctx.putImageData(img, 0, 0);
    return { detail: canvas, normal: normalMapFromHeight(height, size, size, 2.2) };
}

// ---------------------------------------------------------------------------
// Biomas do chão: cor da terra exposta + efeitos especiais
// ---------------------------------------------------------------------------
// Fator de tom compartilhado (chão x terra exposta x grama 3D)
const GROUND_TINT = { value: 1 };

const GROUND_BIOMES = {
    default:   { dirt: 0x76573a, ripple: 0, grid: 0, grass: { base: 0x2f5a1e, tip: 0x8fb552, density: 1.0, emissive: 0x000000 } },
    desert:    { dirt: 0xa0704a, ripple: 1, grid: 0, grass: { base: 0x7a6a3a, tip: 0xd8c27a, density: 0.28, emissive: 0x000000 } },
    glacial:   { dirt: 0xa9b5c1, ripple: 0, grid: 0, grass: { base: 0xdfe8ef, tip: 0xffffff, density: 0.15, emissive: 0x000000 } },
    cyberglow: { dirt: 0x1a1726, ripple: 0, grid: 1, grass: { base: 0x120a24, tip: 0x5a2aa0, density: 0.8, emissive: 0x2a0a55 } }
};

// ---------------------------------------------------------------------------
// Malha do terreno
// ---------------------------------------------------------------------------
export function createTerrain(renderer) {
    const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        pos.setY(i, getTerrainHeight(pos.getX(i), pos.getZ(i)));
    }
    geo.computeVertexNormals();

    // Atributo aGround: x = brilho das manchas grandes de grama, y = máscara de terra exposta
    const nrm = geo.attributes.normal;
    const ground = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        const patches = fbm2(x * 0.07 + 11, z * 0.07 - 3, 3, 51);
        const bright = 0.88 + patches * 0.34 + fbm2(x * 0.3, z * 0.3, 2, 52) * 0.08;
        const slope = 1 - nrm.getY(i);
        const bare = smoothstep(0.6, 0.8, fbm2(x * 0.11 - 5, z * 0.11 + 8, 3, 53) * 0.5 + 0.5);
        const dirt = Math.min(1, smoothstep(0.1, 0.24, slope) * 0.8 + bare * 0.7);
        ground[i * 2] = bright;
        ground[i * 2 + 1] = dirt;
    }
    geo.setAttribute('aGround', new THREE.Float32BufferAttribute(ground, 2));

    const aniso = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;
    const { detail, normal } = createGroundDetail(512);
    const detailTex = toTexture(detail, { srgb: false, anisotropy: aniso });
    const normalTex = toTexture(normal, { srgb: false, anisotropy: aniso });
    // Plano tem uv 0..1 em 100 m; 45 repetições => detalhe a cada ~2,2 m (igual ao shader)
    normalTex.repeat.set(45, 45);

    const uniforms = {
        uDetail: { value: detailTex },
        uDirtColor: { value: new THREE.Color(GROUND_BIOMES.default.dirt) },
        uGroundTint: GROUND_TINT,
        uRipple: { value: 0 },
        uGrid: { value: 0 },
        uGridColor: { value: new THREE.Color(0xb573ff) },
        uTime: SHARED_UNIFORMS.uTime
    };

    const material = new THREE.MeshStandardMaterial({
        color: 0x228B22,
        roughness: 0.96,
        metalness: 0,
        normalMap: normalTex,
        normalScale: new THREE.Vector2(0.6, 0.6)
    });
    material.onBeforeCompile = shader => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>
                attribute vec2 aGround;
                varying vec2 vGround;
                varying vec3 vGWorld;`)
            .replace('#include <begin_vertex>', `#include <begin_vertex>
                vGround = aGround;
                vGWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
                uniform sampler2D uDetail;
                uniform vec3 uDirtColor; uniform float uGroundTint;
                uniform float uRipple; uniform float uGrid; uniform vec3 uGridColor; uniform float uTime;
                varying vec2 vGround;
                varying vec3 vGWorld;`)
            .replace('#include <color_fragment>', `#include <color_fragment>
                vec2 wxz = vGWorld.xz;
                vec4 d1 = texture2D(uDetail, wxz * 0.45);
                vec4 d2 = texture2D(uDetail, wxz * 0.083 + vec2(0.37, 0.71));
                vec4 d3 = texture2D(uDetail, wxz * 0.017 + vec2(0.13, 0.52));
                float fine = mix(0.64, 1.2, d1.r);
                float medium = mix(0.86, 1.1, d2.g) * mix(0.92, 1.06, d3.g);
                vec3 grassCol = diffuseColor.rgb * vGround.x * fine * medium;
                // manchas de grama mais seca/amarelada e mais viçosa
                grassCol = mix(grassCol, grassCol * vec3(1.2, 1.07, 0.6), clamp((d3.g - 0.4) * 1.6, 0.0, 1.0) * 0.8);
                // leve dessaturação: verde mais natural
                grassCol = mix(vec3(dot(grassCol, vec3(0.299, 0.587, 0.114))), grassCol, 0.86);
                grassCol *= 1.0 + uRipple * 0.09 * sin(wxz.x * 5.0 + sin(wxz.y * 0.6) * 3.0 + d2.g * 2.0);
                float dirtMask = smoothstep(0.4, 0.7, vGround.y + (d2.b - 0.5) * 0.55 + (d3.g - 0.5) * 0.35);
                vec3 dirtCol = uDirtColor * uGroundTint * mix(0.7, 1.12, d1.g) * mix(0.85, 1.15, d1.b);
                dirtCol = mix(dirtCol, grassCol, 0.18);
                diffuseColor.rgb = mix(grassCol, dirtCol, dirtMask);`)
            .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
                if (uGrid > 0.0) {
                    vec2 gl = abs(fract(wxz * 0.5) - 0.5);
                    float line = 1.0 - smoothstep(0.0, 0.022, min(gl.x, gl.y));
                    float pulse = 0.65 + 0.35 * sin(uTime * 1.5 + wxz.x * 0.2 + wxz.y * 0.15);
                    totalEmissiveRadiance += uGridColor * line * uGrid * pulse * 0.8;
                }`);
    };
    material.customProgramCacheKey = () => 'lg-ground';

    const mesh = new THREE.Mesh(geo, material);
    mesh.receiveShadow = true;
    mesh.userData.groundUniforms = uniforms;
    return mesh;
}

const _lum = c => c.r * 0.299 + c.g * 0.587 + c.b * 0.114;

// Troca a terra exposta/efeitos do chão conforme o bioma
export function setGroundBiome(groundMesh, biomeId) {
    const b = GROUND_BIOMES[biomeId] || GROUND_BIOMES.default;
    const u = groundMesh.userData.groundUniforms;
    u.uDirtColor.value.setHex(b.dirt);
    u.uRipple.value = b.ripple;
    u.uGrid.value = b.grid;
    groundMesh.userData.baseLum = null;
}

// Mantém terra exposta e grama 3D no mesmo tom (dia/noite/chuva) que o chão
export function syncGroundTint(groundMesh, baseHex) {
    const base = _lum(new THREE.Color(baseHex)) || 1;
    GROUND_TINT.value = Math.min(1.3, _lum(groundMesh.material.color) / base);
}

// ---------------------------------------------------------------------------
// Canteiro de terra (indicador de umidade) que acompanha o relevo
// ---------------------------------------------------------------------------
// Textura de terra revolvida (torrões + sulcos), em tons de cinza: a cor vem do material
function createSoilTextures(size = 256) {
    const rng = makeRng(31337);
    const canvas = makeCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(size, size);
    const height = new Float32Array(size * size);
    // base: ruído periódico em 3 escalas (torrões grandes, médios e grãos)
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const u = x / size, v = y / size;
            const big = periodicNoise(u * 6, v * 6, 6, 21);
            const mid = periodicNoise(u * 18, v * 18, 18, 22);
            const grain = periodicNoise(u * 64, v * 64, 64, 23);
            const val = 105 + big * 85 + mid * 60 + grain * 30; // torrões visíveis no albedo
            const o = (y * size + x) * 4;
            img.data[o] = img.data[o + 1] = img.data[o + 2] = Math.min(255, val);
            img.data[o + 3] = 255;
            height[y * size + x] = big * 0.55 + mid * 0.35 + grain * 0.1;
        }
    }
    ctx.putImageData(img, 0, 0);
    // pedrinhas e grãos irregulares (polígonos pequenos), com wrap nas bordas
    for (let i = 0; i < 260; i++) {
        const x = rng() * size, y = rng() * size, r = 0.5 + rng() * 1.0;
        const v = Math.floor(185 + rng() * 60);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        const pts = 5 + Math.floor(rng() * 3), rot = rng() * Math.PI;
        for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
            const cx = x + ox, cy = y + oy;
            if (cx < -4 || cx > size + 4 || cy < -4 || cy > size + 4) continue;
            ctx.beginPath();
            for (let k = 0; k < pts; k++) {
                const ang = rot + k / pts * Math.PI * 2, rr = r * (0.7 + rng() * 0.5);
                k ? ctx.lineTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr) : ctx.moveTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr);
            }
            ctx.fill();
        }
    }
    const normal = normalMapFromHeight(height, size, size, 0.7);
    return { map: toTexture(canvas, { srgb: true }), normal: toTexture(normal, { srgb: false }) };
}
const SOIL_TEX = createSoilTextures();

export const SOIL_MATERIALS = {
    wet: new THREE.MeshStandardMaterial({ color: 0x5b3b24, vertexColors: true, roughness: 0.7, metalness: 0.02, map: SOIL_TEX.map, normalMap: SOIL_TEX.normal }),
    dry: new THREE.MeshStandardMaterial({ color: 0xb09a7e, vertexColors: true, roughness: 1.0, map: SOIL_TEX.map, normalMap: SOIL_TEX.normal })
};

export function createSoilPatch(x, z, seed = 1) {
    const rng = makeRng(seed ^ 0x5eed);
    const rings = 5, segs = 26, R = 0.5;
    const cy = getTerrainHeight(x, z);
    const edge = [];
    const eo = rng() * 100;
    for (let k = 0; k < segs; k++) {
        // borda irregular porém suave (ruído periódico ao longo do ângulo)
        const a = k / segs * Math.PI * 2;
        edge.push(R * (0.9 + noise2(Math.cos(a) * 1.6 + eo, Math.sin(a) * 1.6, 77) * 0.16));
    }
    const pts = [], cols = [], uvs = [];
    const vert = (ri, k) => {
        if (ri === 0) return [0, getTerrainHeight(x, z) - cy + 0.05, 0];
        const t = ri / rings;
        const ang = (k % segs) / segs * Math.PI * 2;
        const r = edge[k % segs] * t;
        const px = Math.cos(ang) * r, pz = Math.sin(ang) * r;
        const mound = 0.05 * (1 - t * t) + (ri === rings ? 0.004 : 0.012);
        return [px, getTerrainHeight(x + px, z + pz) - cy + mound, pz];
    };
    const col = (ri, k) => {
        const n = noise2((k % segs) * 0.9 + ri * 3.1, ri * 1.7, seed & 1023);
        const v = 0.82 + n * 0.14 + (ri === rings ? -0.12 : 0);
        return [v, v * 0.97, v * 0.94];
    };
    for (let ri = 0; ri < rings; ri++) {
        for (let k = 0; k < segs; k++) {
            const a = vert(ri, k), b = vert(ri + 1, k), c = vert(ri + 1, k + 1), d = vert(ri, k + 1);
            const ca = col(ri, k), cb = col(ri + 1, k), cc = col(ri + 1, k + 1), cd = col(ri, k + 1);
            if (ri === 0) { pts.push(...a, ...c, ...b); cols.push(...ca, ...cc, ...cb); continue; }
            pts.push(...a, ...c, ...b, ...a, ...d, ...c);
            cols.push(...ca, ...cc, ...cb, ...ca, ...cd, ...cc);
        }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    // uv em coordenadas de mundo (~1 repetição da textura a cada 0,7 m)
    for (let i = 0; i < pts.length; i += 3) uvs.push((pts[i] + x) * 0.9, (pts[i + 2] + z) * 0.9);
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, SOIL_MATERIALS.wet);
    mesh.position.set(x, cy, z);
    mesh.receiveShadow = true;
    return mesh;
}

// ---------------------------------------------------------------------------
// Grama 3D instanciada
// ---------------------------------------------------------------------------
function createTuftGeometry({ blades = 5, segs = 2, widthK = 1, seed = 777 } = {}) {
    const rng = makeRng(seed);
    const pos = [], uv = [], nor = [];
    for (let b = 0; b < blades; b++) {
        const ang = (b / blades) * Math.PI * 2 + rng() * 0.6;
        const h = 0.13 + rng() * 0.17;
        const w = (0.022 + rng() * 0.01) * widthK;
        const lean = 0.05 + rng() * 0.1;
        const ox = Math.cos(ang) * 0.035, oz = Math.sin(ang) * 0.035;
        const dx = Math.cos(ang), dz = Math.sin(ang);
        const px = -dz, pz = dx; // largura perpendicular à inclinação
        const ptsL = [], ptsR = [];
        for (let i = 0; i <= segs; i++) {
            const t = i / segs;
            const half = w * 0.5 * (1 - t * 0.85);
            const off = lean * t * t;
            const cx = ox + dx * off, cz = oz + dz * off, cy = h * t;
            ptsL.push([cx - px * half, cy, cz - pz * half, t]);
            ptsR.push([cx + px * half, cy, cz + pz * half, t]);
        }
        const tip = [ox + dx * (lean * 1.25), h * 1.08, oz + dz * (lean * 1.25), 1];
        const push = p => { pos.push(p[0], p[1], p[2]); uv.push(0.5, p[3]); nor.push(0, 1, 0); };
        for (let i = 0; i < segs; i++) {
            push(ptsL[i]); push(ptsR[i]); push(ptsL[i + 1]);
            push(ptsR[i]); push(ptsR[i + 1]); push(ptsL[i + 1]);
        }
        push(ptsL[segs]); push(ptsR[segs]); push(tip);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return g;
}

// Grama em pedaços (chunks) de 7,5 m: cada pedaço é um InstancedMesh com
// frustum culling próprio e LOD por distância da câmera (tufo leve ao longe).
// Instâncias escondidas (clareiras/bioma) saem da contagem em vez de virar escala 0.
export function createGrass({ count = 15000, innerCount = 11000, innerRadius = 13, radius = 30, chunkSize = 7.5, lodDistance = 16 } = {}) {
    const rng = makeRng(4242);
    const geoNear = createTuftGeometry({ blades: 5, segs: 2 });
    const geoFar = createTuftGeometry({ blades: 3, segs: 1, widthK: 1.6, seed: 778 });
    const uniforms = {
        uBaseCol: { value: new THREE.Color(GROUND_BIOMES.default.grass.base) },
        uTipCol: { value: new THREE.Color(GROUND_BIOMES.default.grass.tip) },
        uTime: SHARED_UNIFORMS.uTime,
        uWind: SHARED_UNIFORMS.uWind,
        uGroundTint: GROUND_TINT
    };
    const material = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
    material.onBeforeCompile = shader => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>
                uniform float uTime; uniform float uWind;
                varying float vGH;`)
            .replace('#include <begin_vertex>', `#include <begin_vertex>
                vGH = uv.y;
                {
                    vec3 wo = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
                    float gust = sin(uTime * 0.6 + wo.x * 0.08 + wo.z * 0.05) * 0.5 + 0.5;
                    float sway = sin(uTime * 1.9 + wo.x * 0.45 + wo.z * 0.3) * (0.55 + gust * 0.6)
                               + sin(uTime * 3.3 + wo.x * 1.3 - wo.z * 0.9) * 0.22;
                    float k = uv.y * uv.y * uWind;
                    transformed.x += sway * k * 0.07;
                    transformed.z += sway * k * 0.04;
                }`);
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
                uniform vec3 uBaseCol; uniform vec3 uTipCol; uniform float uGroundTint;
                varying float vGH;`)
            .replace('#include <color_fragment>', `#include <color_fragment>
                diffuseColor.rgb *= mix(uBaseCol, uTipCol, vGH) * mix(0.55, 1.0, vGH) * uGroundTint;`)
            // normal "para cima" dos dois lados da lâmina (sem verso escuro)
            .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
                normal = normalize(vNormal);`);
    };
    material.customProgramCacheKey = () => 'lg-grass';

    // Distribuição: tufos em manchas (ruído), mais densos perto do centro.
    // Cada tufo: [x, y, z, rotY, escala, escalaY, r, g, b, sorteio]
    const tufts = [];
    let tries = 0;
    const total = count + innerCount;
    while (tufts.length < total && tries < total * 20) {
        tries++;
        // primeiro o campo todo; depois um anel interno extra (gramado mais cheio perto da câmera)
        const inner = tufts.length >= count;
        const r = Math.sqrt(rng()) * (inner ? innerRadius : radius);
        // anel interno: densidade some suavemente de ~6,5 m até innerRadius (sem faixa)
        if (inner && rng() < smoothstep(innerRadius * 0.5, innerRadius, r)) continue;
        const a = rng() * Math.PI * 2;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const patch = fbm2(x * 0.18 + 40, z * 0.18 - 12, 3, 61) * 0.5 + 0.5;
        const falloff = 1 - smoothstep(radius * 0.6, radius, r);
        if (rng() > (0.25 + patch * 0.95) * (0.35 + falloff * 0.65)) continue;
        const s = (0.7 + rng() * 0.45) * (0.8 + patch * 0.5);
        const k = 0.82 + rng() * 0.3;
        tufts.push([x, getTerrainHeight(x, z) - 0.01, z, rng() * Math.PI * 2, s, s * (0.85 + rng() * 0.3),
            k, k * (0.96 + rng() * 0.08), k * (0.9 + rng() * 0.1), rng()]);
    }

    // Agrupa por chunk
    const chunkMap = new Map();
    for (const t of tufts) {
        const key = Math.floor(t[0] / chunkSize) + ',' + Math.floor(t[2] / chunkSize);
        if (!chunkMap.has(key)) chunkMap.set(key, []);
        chunkMap.get(key).push(t);
    }
    const group = new THREE.Group();
    const chunks = [];
    for (const list of chunkMap.values()) {
        const mesh = new THREE.InstancedMesh(geoNear, material, list.length);
        mesh.receiveShadow = true;
        mesh.castShadow = false;
        const cx = list.reduce((sum, t) => sum + t[0], 0) / list.length;
        const cz = list.reduce((sum, t) => sum + t[2], 0) / list.length;
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        for (const t of list) { minX = Math.min(minX, t[0]); maxX = Math.max(maxX, t[0]); minZ = Math.min(minZ, t[2]); maxZ = Math.max(maxZ, t[2]); }
        chunks.push({ mesh, list, center: new THREE.Vector3(cx, getTerrainHeight(cx, cz), cz), minX, maxX, minZ, maxZ });
        group.add(mesh);
    }

    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
    let clearings = [];
    let density = 1;
    function refresh(only = null) {
        for (const ch of chunks) {
            if (only && !only.has(ch)) continue;
            let n = 0;
            for (const t of ch.list) {
                // t[9] é um sorteio fixo por tufo: a densidade do bioma esconde um subconjunto uniforme
                if (t[9] >= density) continue;
                let hidden = false;
                for (let j = 0; j < clearings.length; j++) {
                    const cl = clearings[j];
                    const dx = t[0] - cl.x, dz = t[2] - cl.z;
                    if (dx * dx + dz * dz < cl.r * cl.r) { hidden = true; break; }
                }
                if (hidden) continue;
                q.setFromAxisAngle(up, t[3]);
                m.compose(v.set(t[0], t[1], t[2]), q, sc.set(t[4], t[5], t[4]));
                ch.mesh.setMatrixAt(n, m);
                ch.mesh.setColorAt(n, c.setRGB(t[6], t[7], t[8]));
                n++;
            }
            ch.mesh.count = n;
            ch.mesh.visible = n > 0;
            ch.mesh.instanceMatrix.needsUpdate = true;
            if (ch.mesh.instanceColor) ch.mesh.instanceColor.needsUpdate = true;
            ch.mesh.computeBoundingSphere();
        }
    }
    refresh();

    return {
        mesh: group,
        // Abre clareiras onde há canteiros/plantas (lista de {x, z, r})
        setClearings(list) {
            // Reconstrói só os chunks tocados pelas clareiras que entraram/saíram
            const key = c => c.x.toFixed(3) + ',' + c.z.toFixed(3) + ',' + c.r;
            const oldKeys = new Set(clearings.map(key)), newKeys = new Set(list.map(key));
            const changed = [...clearings.filter(c => !newKeys.has(key(c))), ...list.filter(c => !oldKeys.has(key(c)))];
            clearings = list;
            if (!changed.length) return;
            const affected = new Set(chunks.filter(ch => changed.some(c =>
                c.x + c.r >= ch.minX && c.x - c.r <= ch.maxX && c.z + c.r >= ch.minZ && c.z - c.r <= ch.maxZ)));
            if (affected.size) refresh(affected);
        },
        setBiome(biomeId) {
            const g = (GROUND_BIOMES[biomeId] || GROUND_BIOMES.default).grass;
            uniforms.uBaseCol.value.setHex(g.base);
            uniforms.uTipCol.value.setHex(g.tip);
            material.emissive.setHex(g.emissive);
            density = g.density;
            refresh();
        },
        // LOD: chunks distantes da câmera usam o tufo leve (3 lâminas, 1 segmento)
        update(camera) {
            const lod2 = lodDistance * lodDistance;
            for (const ch of chunks) {
                const far = ch.center.distanceToSquared(camera.position) > lod2;
                const geo = far ? geoFar : geoNear;
                if (ch.mesh.geometry !== geo) ch.mesh.geometry = geo;
            }
        }
    };
}
