/**
 * Montagem da luta da Arena ↔ query da URL (#/arena?a=ogro*2,troll&b=tarrasque&dist=9…).
 * Sem DOM: a página usa estas funções, e os testes também.
 */

export const LIMITES = {
  porLado: 10, // combatentes somados num lado
  distancia: { min: 0, max: 120, padrao: 9 },
  rodadas: { min: 1, max: 200, padrao: 50 },
  semente: 40, // caracteres
};

const inteiro = (valor, { min, max, padrao }) => {
  if (String(valor ?? '').trim() === '') return padrao;
  const n = Number(valor);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : padrao;
};

/** Distância em metros, em passos de 1,5 m (um quadrado), dentro dos limites. */
export function distanciaValida(valor) {
  const { min, max, padrao } = LIMITES.distancia;
  const n = Number(String(valor ?? '').replace(',', '.'));
  if (!Number.isFinite(n) || String(valor ?? '').trim() === '') return padrao;
  return Math.min(max, Math.max(min, Math.round(n / 1.5) * 1.5));
}

export const rodadasValidas = valor => inteiro(valor, LIMITES.rodadas);

export const sementeValida = valor => String(valor ?? '').trim().slice(0, LIMITES.semente);

/** Semente nova, de 6 dígitos (fácil de ler e de copiar). */
export const novaSemente = (random = Math.random) => String(100000 + Math.floor(random() * 900000));

/** Quantos combatentes há num lado. */
export const totalDoLado = lado => lado.reduce((s, x) => s + x.qtd, 0);

/**
 * Adiciona um combatente ao lado (soma na entrada que já existe). Devolve false se o lado
 * já está cheio.
 */
export function adicionar(lado, ref) {
  if (totalDoLado(lado) >= LIMITES.porLado) return false;
  const atual = lado.find(x => x.ref === ref);
  if (atual) atual.qtd++;
  else lado.push({ ref, qtd: 1 });
  return true;
}

/** Muda a quantidade de uma entrada (0 remove); respeita o limite do lado. */
export function mudarQuantidade(lado, ref, qtd) {
  const i = lado.findIndex(x => x.ref === ref);
  if (i < 0) return;
  const outros = totalDoLado(lado) - lado[i].qtd;
  const n = Math.max(0, Math.min(Math.round(qtd), LIMITES.porLado - outros));
  if (n === 0) lado.splice(i, 1);
  else lado[i].qtd = n;
}

/** Lê um lado ("ogro*2,troll"). `excedentes`: quantos o link pedia além do limite do lado. */
function lerLado(texto, existe) {
  const lado = [];
  let pedidos = 0;
  for (const parte of String(texto || '').split(',')) {
    const [ref, vezes] = parte.trim().split('*');
    if (!ref || !existe(ref)) continue;
    const qtd = vezes == null ? 1 : Math.max(0, Math.round(Number(vezes)) || 0);
    pedidos += qtd;
    for (let i = 0; i < Math.min(qtd, LIMITES.porLado); i++) adicionar(lado, ref);
  }
  return { lado, excedentes: pedidos - totalDoLado(lado) };
}

/**
 * Lê a montagem da query. `existe(ref)` diz se o id está no catálogo: ids desconhecidos
 * (catálogo mudou, link editado à mão) são ignorados e contados em `ignorados`; quantidade 0
 * ignora a entrada, e o que passa de 10 por lado fica de fora, contado em `excedentes`.
 */
export function lerMontagem(query, existe) {
  const get = k => (typeof query.get === 'function' ? query.get(k) : query[k]);
  const refs = ['a', 'b'].flatMap(k => String(get(k) || '').split(',').map(p => p.trim().split('*')[0]).filter(Boolean));
  const semente = sementeValida(get('semente'));
  const A = lerLado(get('a'), existe);
  const B = lerLado(get('b'), existe);
  return {
    A: A.lado,
    B: B.lado,
    excedentes: A.excedentes + B.excedentes,
    distancia: distanciaValida(get('dist')),
    limite: rodadasValidas(get('limite') || LIMITES.rodadas.padrao),
    semente: semente || null,
    ignorados: refs.filter(r => !existe(r)).length,
  };
}

/** Query da montagem (só o que difere do padrão, para a URL ficar curta). */
export function escreverMontagem({ A, B, distancia, limite, semente }) {
  const lado = l => l.map(x => (x.qtd > 1 ? `${x.ref}*${x.qtd}` : x.ref)).join(',');
  return {
    a: lado(A) || null,
    b: lado(B) || null,
    dist: distancia === LIMITES.distancia.padrao ? null : String(distancia),
    limite: limite === LIMITES.rodadas.padrao ? null : String(limite),
    semente: semente || null,
  };
}
