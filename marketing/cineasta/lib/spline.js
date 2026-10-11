// Interpolação de câmera do Cineasta: trajetória suave entre chaves, sem dependências.
// Cada chave tem um tempo `t` (segundos) e valores numéricos; as demais propriedades são vetores de números.

const smoothstep = (x) => x * x * (3 - 2 * x);
const clamp01 = (x) => Math.min(1, Math.max(0, x));

/** Hermite cúbico com tangentes de Catmull-Rom (não uniforme): passa por todas as chaves, sem repuxar. */
function hermite(p0, p1, m0, m1, u) {
    const u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * m1;
}

/** Valor de uma série de chaves `[{t, v}]` no tempo `t`. Fora do intervalo, fica na primeira/última chave. */
function sample(keys, t) {
    if (!keys.length) throw new Error('spline: sem chaves');
    if (t <= keys[0].t) return keys[0].v;
    const last = keys[keys.length - 1];
    if (t >= last.t) return last.v;
    let i = 0;
    while (keys[i + 1].t < t) i++;
    const a = keys[i], b = keys[i + 1];
    const prev = keys[i - 1] || a, next = keys[i + 2] || b;
    const dt = b.t - a.t;
    const u = (t - a.t) / dt;
    // tangente em a e em b, em unidades por segundo, convertida para o intervalo [a, b]
    const tan = (p, q, r) => (r.t === p.t ? 0 : (r.v - p.v) / (r.t - p.t));
    const m0 = tan(prev, a, b) * dt;
    const m1 = tan(a, b, next) * dt;
    return hermite(a.v, b.v, m0, m1, u);
}

/** Série de vetores: `keys = [{t, v: [x, z, h]}]` → vetor no tempo `t`. */
function sampleVec(keys, t) {
    const n = keys[0].v.length;
    return Array.from({ length: n }, (_, c) => sample(keys.map((k) => ({ t: k.t, v: k.v[c] })), t));
}

module.exports = { sample, sampleVec, smoothstep, clamp01 };
