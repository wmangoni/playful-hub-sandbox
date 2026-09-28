// Base procedural do Lazy Gardener: aleatório com semente, ruído, helpers de
// geometria (tubos, folhas, massas de folhagem), texturas em canvas e os shaders
// compartilhados de vento/neve. Tudo gera geometria NÃO indexada com os mesmos
// atributos (position, normal, uv, color) para poder ser mesclado por material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------------------
// Aleatório com semente
// ---------------------------------------------------------------------------
export function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

// mulberry32: rápido, 32 bits, bom o bastante para variação visual
export function makeRng(seed) {
    let a = seed >>> 0;
    const rng = () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    rng.range = (min, max) => min + (max - min) * rng();
    rng.int = (min, max) => Math.floor(min + (max - min + 1) * rng());
    rng.pick = arr => arr[Math.floor(rng() * arr.length)];
    return rng;
}

// ---------------------------------------------------------------------------
// Ruído de valor (2D e 3D) + fBm
// ---------------------------------------------------------------------------
function hash2(ix, iz, seed) {
    let h = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(seed, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
}
function hash3(ix, iy, iz, seed) {
    let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(iz, 2246822519) + Math.imul(seed, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
}
const fade = t => t * t * (3 - 2 * t);

// Retorna [-1, 1]
export function noise2(x, z, seed = 0) {
    const ix = Math.floor(x), iz = Math.floor(z);
    const ux = fade(x - ix), uz = fade(z - iz);
    const a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed);
    const c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed);
    return (a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz) * 2 - 1;
}

export function fbm2(x, z, octaves = 4, seed = 0) {
    let sum = 0, amp = 0.5, freq = 1, norm = 0;
    for (let i = 0; i < octaves; i++) {
        sum += amp * noise2(x * freq, z * freq, seed + i * 17);
        norm += amp;
        amp *= 0.5;
        freq *= 2.03;
    }
    return sum / norm;
}

export function noise3(x, y, z, seed = 0) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const ux = fade(x - ix), uy = fade(y - iy), uz = fade(z - iz);
    const lerp = (a, b, t) => a + (b - a) * t;
    const v = (dx, dy, dz) => hash3(ix + dx, iy + dy, iz + dz, seed);
    const x00 = lerp(v(0, 0, 0), v(1, 0, 0), ux), x10 = lerp(v(0, 1, 0), v(1, 1, 0), ux);
    const x01 = lerp(v(0, 0, 1), v(1, 0, 1), ux), x11 = lerp(v(0, 1, 1), v(1, 1, 1), ux);
    return lerp(lerp(x00, x10, uy), lerp(x01, x11, uy), uz) * 2 - 1;
}

export const smoothstep = (e0, e1, x) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------------------
// Helpers de geometria (sempre não indexada, com position/normal/uv/color)
// ---------------------------------------------------------------------------
const _v = new THREE.Vector3();
const _c = new THREE.Color();

// Garante o formato padrão para mesclagem
export function normalizeGeo(geo) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    g.clearGroups();
    const n = g.attributes.position.count;
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
    if (!g.attributes.color) g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    for (const name of Object.keys(g.attributes)) {
        if (!['position', 'normal', 'uv', 'color'].includes(name)) g.deleteAttribute(name);
    }
    return g;
}

// Pinta a geometria. fn(out: Color, x, y, z, nx, ny, nz, faceIndex) define a cor de cada vértice.
export function paint(geo, fn) {
    const p = geo.attributes.position, nrm = geo.attributes.normal, col = geo.attributes.color;
    for (let i = 0; i < p.count; i++) {
        fn(_c, p.getX(i), p.getY(i), p.getZ(i), nrm.getX(i), nrm.getY(i), nrm.getZ(i), (i / 3) | 0);
        col.setXYZ(i, _c.r, _c.g, _c.b);
    }
    return geo;
}

// Cor sólida com uma leve variação por face (visual low-poly "lapidado")
export function paintSolid(geo, color, rng, jitter = 0.06) {
    const base = new THREE.Color(color);
    let face = -1, k = 1;
    return paint(geo, (out, x, y, z, nx, ny, nz, f) => {
        if (f !== face) { face = f; k = 1 + (rng() * 2 - 1) * jitter; }
        out.copy(base).multiplyScalar(k);
    });
}

// Tubo afinado ao longo de uma polilinha (troncos, galhos, caules, colmos).
// Normais analíticas = sem costura. colorFn(out, t, ringIndex) opcional.
export function tube(points, radii, radialSegs = 6, colorFn = null, uvScale = 1) {
    const rings = points.length;
    const tangents = [], normals = [], binormals = [];
    for (let i = 0; i < rings; i++) {
        const a = points[Math.max(0, i - 1)], b = points[Math.min(rings - 1, i + 1)];
        tangents.push(new THREE.Vector3().subVectors(b, a).normalize());
    }
    // Transporte paralelo do referencial (evita torções)
    const t0 = tangents[0];
    const helper = Math.abs(t0.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    let n = new THREE.Vector3().crossVectors(t0, helper).normalize();
    for (let i = 0; i < rings; i++) {
        const t = tangents[i];
        n = n.clone().sub(_v.copy(t).multiplyScalar(n.dot(t))).normalize();
        normals.push(n);
        binormals.push(new THREE.Vector3().crossVectors(t, n).normalize());
    }
    // Comprimento acumulado para o uv.v
    const lens = [0];
    for (let i = 1; i < rings; i++) lens.push(lens[i - 1] + points[i].distanceTo(points[i - 1]));
    const total = lens[rings - 1] || 1;

    const pos = [], nor = [], uv = [], col = [];
    const ring = (i, k) => {
        const ang = (k / radialSegs) * Math.PI * 2;
        const cx = Math.cos(ang), sx = Math.sin(ang);
        const nx = normals[i].x * cx + binormals[i].x * sx;
        const ny = normals[i].y * cx + binormals[i].y * sx;
        const nz = normals[i].z * cx + binormals[i].z * sx;
        const r = radii[i];
        return { p: [points[i].x + nx * r, points[i].y + ny * r, points[i].z + nz * r], n: [nx, ny, nz], uv: [k / radialSegs, lens[i] * uvScale] };
    };
    const push = (v, i) => {
        pos.push(...v.p); nor.push(...v.n); uv.push(...v.uv);
        if (colorFn) { colorFn(_c, lens[i] / total, i); col.push(_c.r, _c.g, _c.b); } else col.push(1, 1, 1);
    };
    for (let i = 0; i < rings - 1; i++) {
        for (let k = 0; k < radialSegs; k++) {
            const a = ring(i, k), b = ring(i, k + 1), c = ring(i + 1, k), d = ring(i + 1, k + 1);
            push(a, i); push(b, i); push(c, i + 1);
            push(b, i); push(d, i + 1); push(c, i + 1);
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
}

// Caminho levemente curvo: parte de start na direção dir, curvando para bend
export function curvedPath(start, dir, length, segments, bend = null, rng = null, wobble = 0) {
    const pts = [start.clone()];
    const d = dir.clone().normalize();
    const p = start.clone();
    const step = length / segments;
    for (let i = 1; i <= segments; i++) {
        if (bend) d.addScaledVector(bend, 1 / segments).normalize();
        if (rng && wobble) d.add(_v.set(rng.range(-wobble, wobble), rng.range(-wobble, wobble) * 0.5, rng.range(-wobble, wobble))).normalize();
        p.addScaledVector(d, step);
        pts.push(p.clone());
    }
    return pts;
}

// Folha/pétala como faixa com nervura central, deitada ao longo de +Z.
// profile(t) -> largura relativa; curl > 0 curva para baixo (folha caída),
// curl < 0 curva para cima (pétala em concha); fold dobra em "V".
export function leafStrip(length, width, segs = 4, { curl = 0.3, fold = 0.25, profile = null } = {}) {
    const prof = profile || (t => Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, t))), 0.8));
    const L = [], M = [], R = [];
    for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const w = width * 0.5 * prof(t);
        const z = length * t;
        const y = -curl * length * t * t;
        L.push([-w, y - fold * w, z]);
        M.push([0, y, z]);
        R.push([w, y - fold * w, z]);
    }
    const pos = [], uv = [];
    const tri = (a, ua, b, ub, c, uc) => { pos.push(...a, ...b, ...c); uv.push(...ua, ...ub, ...uc); };
    for (let i = 0; i < segs; i++) {
        const v0 = i / segs, v1 = (i + 1) / segs;
        tri(L[i], [0, v0], M[i], [0.5, v0], L[i + 1], [0, v1]);
        tri(M[i], [0.5, v0], M[i + 1], [0.5, v1], L[i + 1], [0, v1]);
        tri(M[i], [0.5, v0], R[i], [1, v0], M[i + 1], [0.5, v1]);
        tri(R[i], [1, v0], R[i + 1], [1, v1], M[i + 1], [0.5, v1]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return normalizeGeo(g);
}

// Massa de folhagem: icosaedro deformado por ruído (mesma posição => mesmo
// deslocamento, então as faces continuam fechadas mesmo sem índice).
export function blob(radius, { detail = 1, jag = 0.22, squash = 1, seed = 0 } = {}) {
    const g = normalizeGeo(new THREE.IcosahedronGeometry(radius, detail));
    const p = g.attributes.position;
    const off = (seed % 1000) * 0.137;
    for (let i = 0; i < p.count; i++) {
        _v.set(p.getX(i), p.getY(i), p.getZ(i)).normalize();
        const n = noise3(_v.x * 1.9 + off, _v.y * 1.9 - off, _v.z * 1.9 + off * 0.5, seed);
        const r = radius * (1 + jag * n);
        p.setXYZ(i, _v.x * r, _v.y * r * squash, _v.z * r);
    }
    g.computeVertexNormals();
    return g;
}

// Superfície de revolução a partir de um perfil [(r, y)]
export function lathe(profile, segments = 12) {
    const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y));
    return normalizeGeo(new THREE.LatheGeometry(pts, segments));
}

// Posiciona/orienta: eixo +Z local vira `dir`, gira `roll` em torno dele
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _m = new THREE.Matrix4();
const _z = new THREE.Vector3(0, 0, 1), _s = new THREE.Vector3();
export function orient(geo, pos, dir, roll = 0, scale = 1) {
    _q.setFromUnitVectors(_z, _v.copy(dir).normalize());
    _q2.setFromAxisAngle(_z, roll);
    _q.multiply(_q2);
    _s.set(scale, scale, scale);
    _m.compose(pos, _q, _s);
    geo.applyMatrix4(_m);
    return geo;
}
// Orienta uma folha/pétala (comprimento em +Z, face em +Y): o comprimento
// aponta para `dir` e a face fica voltada para `up` (ex.: eixo da flor).
const _bx = new THREE.Vector3(), _by = new THREE.Vector3(), _bz = new THREE.Vector3();
const WORLD_UP = new THREE.Vector3(0, 1, 0);
export function orientLeaf(geo, pos, dir, roll = 0, up = WORLD_UP) {
    _bz.copy(dir).normalize();
    _bx.crossVectors(up, _bz);
    if (_bx.lengthSq() < 1e-6) _bx.set(1, 0, 0).cross(_bz);
    _bx.normalize();
    _by.crossVectors(_bz, _bx).normalize();
    if (roll) {
        _q.setFromAxisAngle(_bz, roll);
        _bx.applyQuaternion(_q); _by.applyQuaternion(_q);
    }
    _m.makeBasis(_bx, _by, _bz).setPosition(pos);
    geo.applyMatrix4(_m);
    return geo;
}
export function place(geo, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
    _m.compose(_v.set(x, y, z), _q.setFromEuler(new THREE.Euler(rx, ry, rz)), _s.set(sx, sy, sz));
    geo.applyMatrix4(_m);
    return geo;
}

// Direção a partir de azimute/elevação (elevação 0 = horizontal)
export function dirFrom(az, elev) {
    return new THREE.Vector3(Math.cos(az) * Math.cos(elev), Math.sin(elev), Math.sin(az) * Math.cos(elev));
}

// Acumula geometrias por chave de material e mescla tudo no final:
// cada planta vira 1 a 4 malhas (1 draw call por material).
export class PartBuilder {
    constructor() { this.buckets = new Map(); }
    add(key, geo) {
        if (!this.buckets.has(key)) this.buckets.set(key, []);
        this.buckets.get(key).push(geo);
        return geo;
    }
    build(materials) {
        const group = new THREE.Group();
        for (const [key, list] of this.buckets) {
            if (!list.length) continue;
            const merged = list.length === 1 ? list[0] : mergeGeometries(list, false);
            if (list.length > 1) list.forEach(g => g.dispose());
            merged.computeBoundingSphere();
            const mesh = new THREE.Mesh(merged, materials[key]);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            const mat = materials[key];
            if (mat && mat.userData && mat.userData.shaderOpts) {
                mesh.customDepthMaterial = getWindDepthMaterial(mat.userData.shaderOpts.flutter, mat.alphaTest > 0 ? mat.map : null, mat.alphaTest);
            }
            mesh.userData.part = key;
            group.add(mesh);
        }
        return group;
    }
}

// ---------------------------------------------------------------------------
// Texturas em canvas
// ---------------------------------------------------------------------------
export function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
}

// Normal map a partir de um canal de altura (Sobel), com wrap nas bordas
export function normalMapFromHeight(heightData, w, h, strength = 2) {
    const canvas = makeCanvas(w, h);
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(w, h);
    const H = (x, y) => heightData[((y + h) % h) * w + ((x + w) % w)];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x - 1, y) + H(x - 1, y + 1));
            const dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x, y - 1) + H(x + 1, y - 1));
            _v.set(-dx * strength, -dy * strength, 1).normalize();
            const o = (y * w + x) * 4;
            img.data[o] = (_v.x * 0.5 + 0.5) * 255;
            img.data[o + 1] = (_v.y * 0.5 + 0.5) * 255;
            img.data[o + 2] = (_v.z * 0.5 + 0.5) * 255;
            img.data[o + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
}

export function toTexture(canvas, { srgb = true, repeat = true, anisotropy = 4 } = {}) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = anisotropy;
    return tex;
}

// Lê um canal (0..1) de um canvas
export function readChannel(canvas, channel = 0) {
    const { width: w, height: h } = canvas;
    const data = canvas.getContext('2d').getImageData(0, 0, w, h).data;
    const out = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) out[i] = data[i * 4 + channel] / 255;
    return out;
}

// ---------------------------------------------------------------------------
// Uniforms compartilhados + injeção de vento/neve nos materiais
// ---------------------------------------------------------------------------
export const SHARED_UNIFORMS = {
    uTime: { value: 0 },
    uWind: { value: 1 },   // força do vento (chuva = mais forte)
    uSnow: { value: 0 },   // 1 no bioma glacial: neve nas faces voltadas para cima
    uCyber: { value: 0 }   // 1 no bioma Ciber-Glow: contorno neon nas plantas
};

// Vento: desloca o vértice proporcionalmente à altura local (base fixa no chão).
// flutter adiciona um tremor rápido nas folhas. Mesmo código no passe de sombra.
function windChunk(flutter) {
    return `{
        vec3 wo = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float hgt = clamp(transformed.y, 0.0, 3.0);
        float bendAmt = pow(hgt, 1.5) * 0.022 * uWind;
        float s1 = sin(uTime * 1.3 + wo.x * 0.35 + wo.z * 0.21);
        float s2 = sin(uTime * 2.3 + wo.x * 0.9 - wo.z * 0.6) * 0.35;
        transformed.x += (s1 + s2) * bendAmt;
        transformed.z += (s1 * 0.6 - s2) * bendAmt * 0.7;
        ${flutter > 0 ? `
        vec3 wp = (modelMatrix * vec4(transformed, 1.0)).xyz;
        float fl = sin(uTime * 7.0 + wp.x * 4.1 + wp.y * 5.3 + wp.z * 3.7);
        transformed += normal * fl * ${flutter.toFixed(4)} * uWind * min(hgt * 2.0, 1.0);` : ''}
    }`;
}

export function addPlantShader(material, { flutter = 0, snow = false, noFlip = false } = {}) {
    material.onBeforeCompile = shader => {
        shader.uniforms.uTime = SHARED_UNIFORMS.uTime;
        shader.uniforms.uWind = SHARED_UNIFORMS.uWind;
        shader.uniforms.uSnow = SHARED_UNIFORMS.uSnow;
        shader.uniforms.uCyber = SHARED_UNIFORMS.uCyber;
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>
                uniform float uTime; uniform float uWind;
                varying float vSnowUp;`)
            .replace('#include <begin_vertex>', `#include <begin_vertex>
                ${windChunk(flutter)}`)
            .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
                vSnowUp = normalize(mat3(modelMatrix) * objectNormal).y;`);
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
                uniform float uSnow; uniform float uCyber; varying float vSnowUp;`)
            .replace('#include <color_fragment>', `#include <color_fragment>
                ${snow ? `diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.96, 1.0), uSnow * smoothstep(0.2, 0.62, vSnowUp));` : ''}`)
            // cards de folha: normal "da copa" dos dois lados (sem verso preto contra o sol)
            .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
                ${noFlip ? 'normal = normalize(vNormal);' : ''}`)
            // Ciber-Glow: contorno neon (fresnel) nas plantas
            .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
                if (uCyber > 0.0) {
                    float rim = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 4.0);
                    totalEmissiveRadiance += vec3(0.46, 0.12, 1.0) * rim * uCyber * 1.3;
                }`);
    };
    material.customProgramCacheKey = () => `plant-f${flutter}-s${snow ? 1 : 0}-n${noFlip ? 1 : 0}`;
    material.userData.shaderOpts = { flutter, snow, noFlip };
    return material;
}

// Material do passe de sombra com o mesmo vento (a sombra balança junto com a planta)
const DEPTH_MATS = new Map();
export function getWindDepthMaterial(flutter = 0, map = null, alphaTest = 0) {
    const key = `${flutter}|${map ? map.uuid : ''}|${alphaTest}`;
    if (DEPTH_MATS.has(key)) return DEPTH_MATS.get(key);
    const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest });
    m.onBeforeCompile = shader => {
        shader.uniforms.uTime = SHARED_UNIFORMS.uTime;
        shader.uniforms.uWind = SHARED_UNIFORMS.uWind;
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', `#include <common>
                uniform float uTime; uniform float uWind;`)
            .replace('#include <begin_vertex>', `#include <begin_vertex>
                ${windChunk(flutter)}`);
    };
    m.customProgramCacheKey = () => `plant-depth-f${flutter}`;
    DEPTH_MATS.set(key, m);
    return m;
}

// clone() não copia onBeforeCompile: este helper preserva vento/neve
export function cloneShaderMaterial(material) {
    const m = material.clone();
    if (material.userData.shaderOpts) addPlantShader(m, material.userData.shaderOpts);
    m.userData.owned = true; // descartado junto com a malha da planta
    return m;
}
