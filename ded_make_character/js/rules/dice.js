/**
 * Dados com semente, para o simulador de combate (TASK_006 §5.9).
 *
 * A mesma semente dá sempre a mesma sequência de rolagens: é o que permite repetir uma luta
 * e escrever testes determinísticos. Nos testes, `scriptedRng` fixa os resultados dos dados.
 */

/** mulberry32: gerador pequeno, rápido e bom o bastante para jogo. Devolve floats em [0, 1). */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Semente a partir de qualquer texto ("dragão-42") ou número; sempre um inteiro de 32 bits sem sinal. */
export function seedFrom(value) {
  if (Number.isInteger(value)) return value >>> 0;
  const text = String(value ?? '');
  if (/^\d+$/.test(text)) return Number(text) >>> 0;
  let h = 2166136261; // FNV-1a
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Gerador com semente: `die(n)` rola 1dn; `chance(pct)` é verdadeiro com pct% de probabilidade. */
export function createRng(seed) {
  const semente = seedFrom(seed);
  const next = mulberry32(semente);
  const rng = {
    seed: semente,
    float: next,
    die: n => 1 + Math.floor(next() * n),
    chance: pct => rng.die(100) <= pct,
  };
  return rng;
}

/**
 * Gerador para testes: cada `die(n)` consome o próximo valor da fila (que precisa caber em 1..n).
 * Com a fila vazia, continua com um gerador comum de semente `fallbackSeed`.
 */
export function scriptedRng(values, fallbackSeed = 1) {
  const fila = [...values];
  const reserva = createRng(fallbackSeed);
  const rng = {
    seed: reserva.seed,
    float: reserva.float,
    restantes: () => fila.length,
    die: n => {
      if (!fila.length) return reserva.die(n);
      const v = fila.shift();
      if (!Number.isInteger(v) || v < 1 || v > n) throw new Error(`scriptedRng: ${v} não cabe em 1d${n}`);
      return v;
    },
    chance: pct => rng.die(100) <= pct,
  };
  return rng;
}

const DICE = /^(\d+)d(\d+)([+-]\d+)?$/;

/** "2d6+3" → { n: 2, d: 6, mod: 3 }; aceita "0d0+50" (dano fixo). */
export function parseDice(expr) {
  const m = DICE.exec(String(expr).replace(/\s/g, ''));
  if (!m) throw new Error(`dado inválido: "${expr}"`);
  return { n: Number(m[1]), d: Number(m[2]), mod: Number(m[3] || 0) };
}

/** Média de uma expressão de dados (sem arredondar). */
export function average(expr) {
  const { n, d, mod } = parseDice(expr);
  return (n * (d + 1)) / 2 + mod;
}

/**
 * Rola uma expressão. `vezes` rola os dados e soma o modificador várias vezes (crítico ×2, ×3…),
 * como manda a regra 3.0 ("roll the damage more than once"). `bonus` é somado ao modificador e,
 * como ele, também se multiplica no crítico (Força, bônus mágico, Destruir o Mal…).
 * Devolve o total e as parcelas.
 */
export function roll(rng, expr, { vezes = 1, bonus = 0 } = {}) {
  const { n, d, mod } = parseDice(expr);
  const dados = [];
  for (let k = 0; k < vezes; k++) for (let i = 0; i < n; i++) dados.push(d > 0 ? rng.die(d) : 0);
  const fixo = (mod + bonus) * vezes;
  const total = dados.reduce((s, v) => s + v, 0) + fixo;
  return { total, dados, mod: fixo, expr };
}

/** A expressão não tem dano nenhum ("0d0", "0d0+0"): ataques de toque que só carregam um efeito. */
export function isZero(expr) {
  const { n, d, mod } = parseDice(expr);
  return (n === 0 || d === 0) && mod <= 0;
}

/** d20 com o resultado natural à parte (para 1 e 20 naturais). */
export function d20(rng) {
  return rng.die(20);
}
