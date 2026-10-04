/**
 * IA de combate com rede neural (TASK_009 §4): perfis, entradas, inferência e a política "rede".
 *
 * Roda no navegador e no Node. A rede só escolhe entre as ações legais que o motor lista
 * (`IA.candidatas`); as regras continuam no motor. Os pesos vêm de `data/ia/rede-<perfil>.json`
 * (`tools/ia/treinar.py`). Sem a rede do perfil, a política devolve a escolha da IA clássica.
 *
 * As entradas nunca usam o nome da magia ou da criatura, só o que elas fazem, e nunca rolam dados.
 */
import { rules as K, TAMANHOS } from './combat30.js';
import { duracaoMedia } from './combat30-specials.js';

/** Muda sempre que as entradas mudarem: a rede de outra versão é recusada. */
export const VERSAO_ENTRADAS = 1;
/** Teto de candidatas por decisão (§4.1). */
export const MAX_CANDIDATAS = 32;
/** Peso da margem na nota da ação (§4.4). */
export const PESO_MARGEM = 0.1;
/**
 * Margem δ: a rede só troca a escolha clássica se a melhor nota passar a dela por isso. Calibrada
 * no espelho da validação com a rede final (TASK_009 §12, E5): com 0,20 o ganho fica e as perdas
 * grandes quase somem.
 */
export const DELTA_PADRAO = 0.2;

// ---------------------------------------------------------------------------------------------
// perfis

const PODERES_ATIVOS = new Set(['sopro', 'magia', 'engolfar', 'esmagar', 'atropelar', 'cura-pelas-maos', 'inspirar-coragem']);
/** Efeitos dos especiais: da luta (`_esp`) ou da ficha (`especiais[].mecanica`). */
const efeitos = c => (c._esp ? c._esp.map(e => e.m?.efeito) : (c.especiais || []).map(e => e.mecanica?.efeito)).filter(Boolean);

/**
 * Qual rede decide pelo combatente (§4.2): "recursos" se ele tem magias da lista (com mecânica) ou
 * algum poder ativo; senão, "marcial". Vale para a ficha montada e para o combatente da luta.
 */
export function perfilDe(c) {
  if ((c.magias?.lista || []).some(s => s.mecanica)) return 'recursos';
  return efeitos(c).some(e => PODERES_ATIVOS.has(e)) ? 'recursos' : 'marcial';
}

// ---------------------------------------------------------------------------------------------
// medidas do estado (sem rolar dados)

const FORA = ['paralisado', 'petrificado', 'imobilizado', 'inconsciente', 'amedrontado', 'apavorado', 'enfeitiçado'];
const SEM_ACAO = ['atordoado', 'pasmo', 'nauseado'];
const CONDICOES_PROPRIAS = ['cego', 'surdo', 'abalado', 'lento', 'enredado', 'fatigado', 'exausto', 'cambaleante', 'derrubado', 'enjoado'];

const log1p = x => Math.log1p(Math.max(0, x));
const limitar = (x, min, max) => Math.min(max, Math.max(min, x));
/** PV que contam (sem a contusão), de 0 a 1; quem não pode lutar vale 0. */
export const saude = x => (K.podeLutar(x) ? limitar((x.pv - (x.contusao || 0)) / x.pvMax, 0, 1) : 0);
const ativos = lista => lista.filter(x => K.podeLutar(x) && !x.fugindo);
const efeitoDe = (c, nome) => (c._esp || []).filter(e => e.m?.efeito === nome);
const tem = (c, nome) => efeitoDe(c, nome).length > 0;

/** Dano médio de um dado ("2d6+3"), 0 se não houver. */
const media = d => (d && !K.isZero(d) ? K.average(d) : 0);

/** Chance de o alvo falhar no teste (a mesma conta da IA clássica); 1 sem teste. */
const pFalha = (alvo, tipo, cd) => (tipo && cd != null ? limitar((cd - 1 - (alvo.resistencias?.[tipo] ?? 0)) / 20, 0.05, 0.95) : 1);

/** Nível de onde sai a magia: o espaço ("n3" → 3) ou o nível da magia; 0 para especiais. */
const nivelDaMagia = s => (s?.espaco ? Number(String(s.espaco).slice(1)) : s?.nivel ?? 0);

/** O maior nível de magia que o combatente tem (espaços dos personagens ou níveis da lista). */
function maiorNivel(c) {
  const espacos = Object.keys(c.magias?.espacos || {}).map(k => Number(k.slice(1)));
  const lista = (c.magias?.lista || []).map(s => s.nivel ?? 0);
  return Math.max(1, ...espacos, ...lista);
}

/** Recursos de magia por faixa de nível (0–3, 4–6, 7–9): [restantes, total]. */
function recursosDeMagia(c) {
  const faixas = [[0, 0], [0, 0], [0, 0]];
  const faixa = n => (n <= 3 ? 0 : n <= 6 ? 1 : 2);
  const espacos = c.magias?.espacos || {};
  if (Object.keys(espacos).length) {
    for (const [k, total] of Object.entries(espacos)) {
      const f = faixas[faixa(Number(k.slice(1)))];
      f[0] += c.espacosRestantes?.[k] || 0;
      f[1] += total;
    }
  } else {
    (c.magias?.lista || []).forEach((s, i) => {
      if (!s.mecanica || !Number.isFinite(s.quantidade)) return;
      const f = faixas[faixa(s.nivel ?? 0)];
      f[0] += c.magiasRestantes?.[i] || 0;
      f[1] += s.quantidade;
    });
  }
  return faixas;
}

/** Usos que restam do especial (o mesmo critério do motor: a música de bardo divide os usos). */
function usosRestantes(c, e) {
  const u = c.usos[e.id];
  if (u?.compartilha) {
    const dono = efeitoDe(c, u.compartilha)[0];
    return dono ? c.usos[dono.id]?.n ?? 0 : 0;
  }
  return u ? u.n : Infinity;
}
const recarregando = (b, c, e) => c.recarga[e.id] != null && c.recarga[e.id] > K.tick(b);

/** Poderes ativos prontos agora (com usos e sem recarga) e o estado do sopro. */
function poderes(b, c) {
  let prontos = 0;
  let soproPronto = 0;
  let soproRecarga = 0;
  for (const e of c._esp || []) {
    if (!PODERES_ATIVOS.has(e.m?.efeito)) continue;
    // inspirar coragem só é oferecido uma vez por luta
    const pronto = usosRestantes(c, e) > 0 && !recarregando(b, c, e) && !(e.m.efeito === 'inspirar-coragem' && c._inspirou);
    if (pronto) prontos++;
    if (e.m.efeito === 'sopro') {
      if (pronto) soproPronto = 1;
      else if (recarregando(b, c, e)) soproRecarga = 1;
    }
  }
  return { prontos, soproPronto, soproRecarga };
}

/**
 * Ameaça do combatente: o dano médio por rodada que ele causa (ataque total, ou a maior magia,
 * sopro ou habilidade de dano pronta agora), sem contar acerto nem defesas. Só para comparar grandezas.
 */
function ameaca(b, x) {
  const armas = x.ataqueTotal.reduce((s, a) => s + media(a.dano), 0);
  let magia = 0;
  (x.magias?.lista || []).forEach((s, i) => {
    if (s.mecanica?.dano && (x.magiasRestantes?.[i] ?? 1) > 0) magia = Math.max(magia, media(s.mecanica.dano));
  });
  for (const e of x._esp || []) {
    if (['sopro', 'magia'].includes(e.m?.efeito) && e.m.dano && usosRestantes(x, e) > 0 && !recarregando(b, x, e)) magia = Math.max(magia, media(e.m.dano));
  }
  return Math.max(armas, magia);
}

const ehConjurador = x => (x.magias?.lista || []).some(s => s.mecanica);
/** O efeito ativo enfraquece (penalidade de atributo)? */
const enfraquece = bf => Object.values(bf.atributos || {}).some(v => v < 0);

/** Medidas reaproveitadas na mesma decisão (por combatente e por alvo). */
function contexto(b, c) {
  const ameacas = new Map(b.combatentes.map(x => [x.uid, ameaca(b, x)]));
  const aliados = ativos(K.aliados(b, c)).filter(x => x !== c);
  const inimigos = ativos(K.inimigos(b, c));
  return { ameacas, aliados, inimigos, pvInimigos: inimigos.reduce((s, x) => s + Math.max(0, x.pv), 0), coordenacao: new Map() };
}

/**
 * Coordenação (§4.3): quantos aliados agem antes do próximo turno do alvo e o alcançam com armas, e
 * o dano esperado deles nele: o ataque total se já alcançam (ou atiram), um golpe se precisam andar.
 * Quem não age (atordoado, pasmo, nauseado) não conta; as magias dos aliados ficam de fora.
 */
function coordenacao(b, c, alvo, ctx) {
  if (ctx.coordenacao.has(alvo.uid)) return ctx.coordenacao.get(alvo.uid);
  const n = b.ordem.length;
  const depois = uid => (b.ordem.indexOf(uid) - b.turno + n) % n || n;
  const vez = depois(alvo.uid);
  let quantos = 0;
  let dano = 0;
  for (const x of ctx.aliados) {
    if (depois(x.uid) >= vez || SEM_ACAO.some(n => x.cond[n])) continue;
    let golpes = x.ataqueTotal.filter(a => K.isMelee(a) && K.ataqueAlcanca(x, alvo, a));
    if (!golpes.length) golpes = (x.ataqueTotalDistancia || x.ataqueTotal.filter(K.isRanged)).filter(a => K.ataqueAlcanca(x, alvo, a));
    if (!golpes.length) {
      const um = x.ataques.find(K.isMelee);
      golpes = um && K.gap(x, alvo) <= K.alcanceDe(x, um) + K.velocidade(x) ? [um] : [];
    }
    if (!golpes.length) continue;
    quantos++;
    dano += K.esperado(b, x, alvo, golpes);
  }
  const r = [quantos, log1p(dano)];
  ctx.coordenacao.set(alvo.uid, r);
  return r;
}

// ---------------------------------------------------------------------------------------------
// entradas

export const NOMES_ESTADO = [
  'saude', 'pv_log', 'ca', 'ataque', 'fort', 'ref', 'von', 'rd', 'rm', 'dv_log', 'tamanho', 'velocidade',
  ...CONDICOES_PROPRIAS.map(n => `cond_${n}`), 'reforcos', 'enfraquecimentos', 'em_furia',
  'magia_0a3', 'magia_4a6', 'magia_7a9', 'magia_restante_log', 'poderes_prontos', 'sopro_pronto', 'sopro_recarga',
  'rodada', 'dist_inimigo', 'perfil_recursos',
  'aliados_n', 'aliados_saude', 'aliados_ameaca_log', 'aliados_pv_log', 'aliados_conjuradores',
  'inimigos_n', 'inimigos_saude', 'inimigos_ameaca_log', 'inimigos_ameaca_max_log', 'inimigos_pv_min_log', 'inimigos_pv_log', 'inimigos_conjuradores', 'inimigos_ca',
  'vantagem',
];

export const TIPOS_DE_ACAO = ['corpo-a-corpo', 'distancia', 'mover-atacar', 'investida', 'mover', 'dano', 'controle', 'reforco', 'cura', 'sopro', 'corpo-especial', 'inspirar'];

export const NOMES_ACAO = [
  ...TIPOS_DE_ACAO.map(t => `tipo_${t}`),
  'golpes', 'ev_log', 'ev_alvo', 'ev_grupo', 'prioridade', 'heuristica',
  'inimigos_atingidos', 'aliados_atingidos', 'tem_teste', 'falha_teste', 'cond_fora', 'cond_sem_acao', 'cond_outra', 'duracao', 'dano_log', 'mover',
  'custo_nivel', 'usa_poder', 'recarga', 'gratis', 'continua',
  'tem_alvo', 'alvo_aliado', 'alvo_saude', 'alvo_pv_log', 'alvo_ameaca_log', 'alvo_ca', 'alvo_conjurador', 'derruba_se_acertar', 'alvo_controlado', 'alvo_camuflagem',
  'alvo_retribuicao', 'alvo_regeneracao', 'alvo_imune_magia', 'alvo_reflete_magia', 'furtivo', 'dist_alvo',
  'aliados_antes', 'aliados_dano_log',
];

/** Entradas do estado de quem decide (§4.3), na ordem de `NOMES_ESTADO`. */
export function entradasDoEstado(b, c, ctx = contexto(b, c)) {
  const { aliados, inimigos, ameacas } = ctx;
  const soma = (lista, f) => lista.reduce((s, x) => s + f(x), 0);
  const ataque = Math.max(0, ...[...c.ataqueTotal, ...c.ataques].map(a => a.bonus ?? 0));
  const rec = recursosDeMagia(c);
  const pod = poderes(b, c);
  const nos = [c, ...aliados];
  const ameacaNossa = soma(nos, x => ameacas.get(x.uid));
  const ameacaDeles = soma(inimigos, x => ameacas.get(x.uid));
  const pvNosso = soma(nos, x => Math.max(0, x.pv));
  // quantas rodadas cada lado levaria para derrubar o outro (bem por alto): log da razão
  const vantagem = Math.log((pvNosso / Math.max(1, ameacaDeles) + 1) / (ctx.pvInimigos / Math.max(1, ameacaNossa) + 1));
  return [
    saude(c), log1p(c.pvMax), c.ca.total, ataque, c.resistencias?.fort ?? 0, c.resistencias?.ref ?? 0, c.resistencias?.von ?? 0,
    c.rd?.valor || 0, c.rm || 0, log1p(c.dv), TAMANHOS.indexOf(c.tamanho), K.velocidade(c),
    // agarrado, agarrando ou engolido não entram: esses turnos são do motor, sem decisão (§4.1)
    ...CONDICOES_PROPRIAS.map(n => (c.cond[n] ? 1 : 0)),
    c.buffs.filter(bf => bf.nome !== 'furia' && !enfraquece(bf)).length, c.buffs.filter(enfraquece).length + (c.niveisNegativos > 0 ? 1 : 0) + (Object.values(c.danoAtributo || {}).some(v => v > 0) ? 1 : 0), c.buffs.some(bf => bf.nome === 'furia') ? 1 : 0,
    ...rec.map(([r, t]) => (t ? r / t : 0)), log1p(rec.reduce((s, [r]) => s + r, 0)), pod.prontos, pod.soproPronto, pod.soproRecarga,
    Math.min(b.rodada, 20), inimigos.length ? Math.min(...inimigos.map(x => K.gap(c, x))) : 0, perfilDe(c) === 'recursos' ? 1 : 0,
    Math.min(aliados.length, 10), aliados.length ? soma(aliados, saude) / aliados.length : 0, log1p(soma(aliados, x => ameacas.get(x.uid))), log1p(soma(aliados, x => Math.max(0, x.pv))), aliados.filter(ehConjurador).length,
    Math.min(inimigos.length, 10), inimigos.length ? soma(inimigos, saude) / inimigos.length : 0, log1p(ameacaDeles), log1p(Math.max(0, ...inimigos.map(x => ameacas.get(x.uid)))),
    log1p(inimigos.length ? Math.min(...inimigos.map(x => Math.max(0, x.pv))) : 0), log1p(ctx.pvInimigos), inimigos.filter(ehConjurador).length,
    inimigos.length ? soma(inimigos, x => x.ca.total) / inimigos.length : 0,
    vantagem,
  ];
}

/** Tipo da ação (índice em `TIPOS_DE_ACAO`). */
function tipoDaAcao(a) {
  switch (a.tipo) {
    case 'ataque': return K.isMelee(a.golpes[0]) ? 0 : 1;
    case 'mover-atacar': return 2;
    case 'investida': return 3;
    case 'mover': return 4;
    case 'sopro': return 9;
    case 'engolfar': case 'esmagar': case 'atropelar': return 10;
    case 'inspirar': return 11;
    case 'cura-maos': return 8;
    case 'magia': {
      const m = a.s.m;
      if (m.cura) return 8;
      if (m.condicao || m.efeitos_por_dv || (m.bonus && (m.bonus.niveis_negativos || m.bonus.penalidade_for))) return 6;
      if (!m.dano && m.bonus) return 7;
      return 5;
    }
    default: return 5;
  }
}

/** Mecânica da ação (magia, sopro, engolfar…) e o CD dela, quando há. */
const mecanica = a => (a.s ? { ...a.s.m, cd: a.s.cd ?? a.s.m.cd } : a.e?.m || null);

/** Entradas de uma candidata (§4.3), na ordem de `NOMES_ACAO`. */
export function entradasDaAcao(b, c, a, ctx = contexto(b, c)) {
  const tipo = tipoDaAcao(a);
  const m = mecanica(a) || {};
  const alvo = a.alvo || (a.alvos || []).find(x => x.lado !== c.lado) || null;
  const atingidos = a.alvos || (alvo ? [alvo] : []);
  const ev = Math.max(0, a.ev || 0);
  const conds = [m.condicao, ...(m.efeitos_por_dv || []).map(p => p.condicao)].filter(Boolean);
  const nivel = a.s ? nivelDaMagia(a.s) : 0;
  const amigo = alvo && alvo.lado === c.lado;
  const coord = alvo && !amigo ? coordenacao(b, c, alvo, ctx) : [0, 0];
  const golpes = a.golpes || [];
  // ataque furtivo (como o motor): golpe de arma contra quem está sem a Destreza; à distância, até 9 m
  const furtivo = alvo && !amigo && tipo <= 3 && golpes.length && tem(c, 'ataque-furtivo') && !K.imuneCritico(alvo) && K.semDestreza(b, alvo, c) && (tipo !== 1 || K.gap(c, alvo) <= 9) ? 1 : 0;
  // derruba se acertar: o dano médio de quem acerta (sem a RD que a arma não vence) contra o PV que resta
  const danoSeAcertar = golpes.length
    ? golpes.reduce((t, g) => t + Math.max(0, media(g.dano) - (alvo?.rd && !K.venceRD(c, g, alvo.rd) ? alvo.rd.valor : 0)) + (g.dano_extra || []).reduce((u, d) => u + media(d.dano), 0), 0)
    : media(m.dano) + (m.dano_extra || []).reduce((u, d) => u + media(d.dano), 0);
  const duracoes = [m.duracao, ...(m.efeitos_por_dv || []).map(p => p.duracao)].filter(Boolean);
  return [
    ...TIPOS_DE_ACAO.map((_, i) => (i === tipo ? 1 : 0)),
    a.golpes?.length || 0, log1p(ev), alvo ? Math.min(3, ev / Math.max(1, alvo.pv)) : 0, Math.min(2, ev / Math.max(1, ctx.pvInimigos)), a.prioridade || 0, a.heuristica ? 1 : 0,
    atingidos.filter(x => x.lado !== c.lado).length, atingidos.filter(x => x.lado === c.lado && x !== c).length,
    // sem teste, o efeito vale sempre (falha_teste 1); tem_teste separa isso de "falha certa"
    m.resistencia && m.cd != null ? 1 : 0, alvo && !amigo ? pFalha(alvo, m.resistencia, m.cd) : 0,
    conds.some(n => FORA.includes(n) || n === 'morto') ? 1 : 0, conds.some(n => SEM_ACAO.includes(n)) ? 1 : 0, conds.some(n => !FORA.includes(n) && !SEM_ACAO.includes(n) && n !== 'morto') ? 1 : 0,
    conds.length ? Math.min(10, Math.max(...(duracoes.length ? duracoes : [null]).map(t => duracaoMedia(K, t)))) : 0, log1p(media(m.dano)), a.mover || 0,
    a.s && !a.s.gratis ? nivel / maiorNivel(c) : 0, a.e || a.s?.tipo === 'especial' ? 1 : 0, a.tipo === 'sopro' ? 1 : 0, a.s?.gratis ? 1 : 0, m.persistente || m.repete || m.continuo ? 1 : 0,
    alvo ? 1 : 0, amigo ? 1 : 0, alvo ? saude(alvo) : 0, alvo ? log1p(alvo.pv) : 0, alvo ? log1p(ctx.ameacas.get(alvo.uid)) : 0,
    alvo ? (golpes.length && !amigo ? K.caContra(b, alvo, c, golpes[0]) : alvo.ca.total) : 0, alvo && ehConjurador(alvo) ? 1 : 0,
    alvo && !amigo && danoSeAcertar >= Math.max(1, alvo.pv - (alvo.contusao || 0)) ? 1 : 0, alvo && [...FORA, ...SEM_ACAO].some(n => alvo.cond[n]) ? 1 : 0,
    alvo ? Math.max(0, ...efeitoDe(alvo, 'camuflagem').map(e => e.m.chance_pct || 0), ...alvo.buffs.map(bf => bf.bonus?.camuflagem_pct || 0)) / 100 : 0,
    alvo && tem(alvo, 'retribuicao') ? 1 : 0, alvo?.regeneracao ? 1 : 0, alvo?.imunidades.includes('magia') ? 1 : 0, alvo && tem(alvo, 'refletir-magia') ? 1 : 0, furtivo,
    alvo ? K.gap(c, alvo) : 0,
    ...coord,
  ];
}

/** As entradas de uma decisão: o estado e cada candidata, com as medidas calculadas uma vez. */
export function entradasDaDecisao(b, c, lista) {
  const ctx = contexto(b, c);
  return { estado: entradasDoEstado(b, c, ctx), acoes: lista.map(a => entradasDaAcao(b, c, a, ctx)) };
}

// ---------------------------------------------------------------------------------------------
// teto de candidatas

/** Nota barata para cortar a lista (§4.1): prioridade e o `ev` relativo ao alvo (ou aos inimigos). */
export function preNota(a, pvInimigos) {
  const ref = a.alvo ? Math.max(1, a.alvo.pv) : Math.max(1, pvInimigos);
  return (a.prioridade || 0) + Math.min(1.5, Math.max(0, a.ev || 0) / ref);
}

/** As `max` melhores pela pré-nota, sempre com a escolha da IA clássica; na ordem original. */
export function limitarCandidatas(b, c, lista, max = MAX_CANDIDATAS) {
  if (lista.length <= max) return lista;
  const pv = ativos(K.inimigos(b, c)).reduce((s, x) => s + Math.max(0, x.pv), 0);
  const ordenada = [...lista].sort((x, y) => (y.heuristica ? 1 : 0) - (x.heuristica ? 1 : 0) || preNota(y, pv) - preNota(x, pv) || x.ordem - y.ordem);
  return ordenada.slice(0, max).sort((x, y) => x.ordem - y.ordem);
}

// ---------------------------------------------------------------------------------------------
// rede (inferência)

/**
 * Rede a partir do JSON exportado pelo treino:
 * `{ formato: 'ded-ia-rede', versaoEntradas, perfil, geracao, entradas: { estado, acao },
 *    normalizacao: { media, desvio }, camadas: [{ pesos: [[…]], vies: […] }…] }`.
 * A primeira camada recebe [estado, ação]; a última dá [logit da vitória, margem]. Lança erro se a
 * versão das entradas ou os tamanhos não baterem.
 */
export function criarRede(json) {
  if (json?.formato !== 'ded-ia-rede') throw new Error('não é uma rede da IA de combate');
  if (json.versaoEntradas !== VERSAO_ENTRADAS) throw new Error(`rede para as entradas v${json.versaoEntradas}; o motor usa v${VERSAO_ENTRADAS}`);
  const NE = NOMES_ESTADO.length;
  const NA = NOMES_ACAO.length;
  if (json.entradas?.estado !== NE || json.entradas?.acao !== NA) throw new Error(`rede com ${json.entradas?.estado}+${json.entradas?.acao} entradas; o motor usa ${NE}+${NA}`);
  // com os nomes (o treino grava), confere também a ordem das entradas
  if (json.entradas.nomes && json.entradas.nomes.join('|') !== [...NOMES_ESTADO, ...NOMES_ACAO].join('|')) throw new Error('rede com entradas em outra ordem ou com outros nomes');
  const camadas = (json.camadas || []).map(l => ({ saidas: l.vies.length, entradas: l.pesos[0].length, w: Float64Array.from(l.pesos.flat()), b: Float64Array.from(l.vies) }));
  // pelo menos uma camada oculta: a primeira tem ReLU, a última não
  if (camadas.length < 2 || camadas[0].entradas !== NE + NA || camadas.at(-1).saidas !== 2) throw new Error('formato das camadas inesperado');
  if (camadas.some(l => l.w.length !== l.saidas * l.entradas)) throw new Error('matriz de pesos com linhas de tamanhos diferentes');
  camadas.forEach((l, i) => {
    if (i && l.entradas !== camadas[i - 1].saidas) throw new Error(`camada ${i}: ${l.entradas} entradas para ${camadas[i - 1].saidas} saídas`);
  });
  const finitos = v => Array.isArray(v) && v.every(Number.isFinite);
  if (json.camadas.some(l => !l.pesos.every(finitos) || !finitos(l.vies))) throw new Error('peso ou viés que não é número');
  const { media: mediaJson, desvio: desvioJson } = json.normalizacao || {};
  if (!finitos(mediaJson) || !finitos(desvioJson) || mediaJson.length !== NE + NA || desvioJson.length !== NE + NA) throw new Error(`a normalização precisa de ${NE + NA} médias e desvios`);
  const mu = Float64Array.from(mediaJson);
  const sd = Float64Array.from(desvioJson, v => (v > 1e-9 ? v : 1));
  const [primeira, ...resto] = camadas;
  const H = primeira.saidas;
  const pesoMargem = json.pesoMargem ?? PESO_MARGEM;

  // vetores de trabalho, reaproveitados a cada avaliação (a inferência é síncrona)
  const N = NE + NA;
  const base = new Float64Array(H);
  const x = new Float64Array(NA);
  const camadasOcultas = [new Float64Array(H), ...resto.map(l => new Float64Array(l.saidas))];
  const w1 = primeira.w;

  /** Notas das ações num estado: { notas, vitoria, margem } (uma posição por ação). */
  function avaliar(estado, acoes) {
    // parte do estado da primeira camada: uma vez por decisão
    base.set(primeira.b);
    for (let j = 0; j < NE; j++) {
      const v = (estado[j] - mu[j]) / sd[j];
      if (v === 0) continue;
      for (let h = 0; h < H; h++) base[h] += w1[h * N + j] * v;
    }
    const notas = new Float64Array(acoes.length);
    const vitoria = new Float64Array(acoes.length);
    const margem = new Float64Array(acoes.length);
    for (let i = 0; i < acoes.length; i++) {
      const acao = acoes[i];
      for (let j = 0; j < NA; j++) x[j] = (acao[j] - mu[NE + j]) / sd[NE + j];
      let atual = camadasOcultas[0];
      for (let h = 0; h < H; h++) {
        let s = base[h];
        const o = h * N + NE;
        for (let j = 0; j < NA; j++) s += w1[o + j] * x[j];
        atual[h] = s > 0 ? s : 0;
      }
      for (let k = 0; k < resto.length; k++) {
        const l = resto[k];
        const out = camadasOcultas[k + 1];
        const ultima = k === resto.length - 1;
        for (let o = 0; o < l.saidas; o++) {
          let s = l.b[o];
          const off = o * l.entradas;
          for (let j = 0; j < l.entradas; j++) s += l.w[off + j] * atual[j];
          out[o] = ultima || s > 0 ? s : 0;
        }
        atual = out;
      }
      vitoria[i] = 1 / (1 + Math.exp(-atual[0]));
      margem[i] = Math.tanh(atual[1]);
      notas[i] = vitoria[i] + pesoMargem * margem[i];
    }
    return { notas, vitoria, margem };
  }
  return { perfil: json.perfil, geracao: json.geracao, avaliar };
}

// ---------------------------------------------------------------------------------------------
// política

/** Ordem de desempate: a escolha clássica primeiro, depois prioridade, `ev` e a ordem da lista. */
const desempate = (x, y) => (y.heuristica ? 1 : 0) - (x.heuristica ? 1 : 0) || (y.prioridade || 0) - (x.prioridade || 0) || (y.ev || 0) - (x.ev || 0) || x.ordem - y.ordem;

/**
 * A escolha da rede entre as candidatas (§4.4): a maior nota, desempatando na ordem da clássica; a
 * escolha clássica só é trocada se a melhor nota passar a dela por `delta` (com nota que não é
 * número, fica a clássica). Devolve `{ escolhida, notas, vitoria, margem }`.
 */
export function escolherPelaRede(rede, lista, { estado, acoes }, { delta = DELTA_PADRAO } = {}) {
  const { notas, vitoria, margem } = rede.avaliar(estado, acoes);
  const ordem = lista.map((_, i) => i).sort((i, j) => desempate(lista[i], lista[j]));
  let escolhida = ordem[0];
  for (const i of ordem) if (notas[i] > notas[escolhida]) escolhida = i;
  const h = lista.findIndex(a => a.heuristica);
  if (h >= 0 && escolhida !== h && !(notas[escolhida] >= notas[h] + delta)) escolhida = h;
  return { escolhida, notas, vitoria, margem };
}

/**
 * Política "rede" (§4.4): `redes` = { marcial, recursos } (de `criarRede`; uma pode faltar). A rede
 * do perfil dá nota a cada candidata; troca a escolha clássica só se a melhor nota passar a dela por
 * `delta`. `aoDecidir({ b, c, lista, notas, escolhida })` recebe cada decisão (o "por que" no
 * registro e o gerador de dados).
 */
export function politicaRede(redes, { delta = DELTA_PADRAO, max = MAX_CANDIDATAS, aoDecidir = null } = {}) {
  return (b, c, IA) => {
    const rede = redes[perfilDe(c)];
    if (!rede) return IA.classica(b, c);
    const lista = limitarCandidatas(b, c, IA.candidatas(b, c), max);
    if (!lista.length) return null;
    const { escolhida, notas, vitoria, margem } = escolherPelaRede(rede, lista, entradasDaDecisao(b, c, lista), { delta });
    aoDecidir?.({ b, c, lista, notas, vitoria, margem, escolhida });
    return lista[escolhida];
  };
}

// ---------------------------------------------------------------------------------------------
// texto

/** A ação em poucas palavras, para o "por que" no registro da Arena ("Bola de Fogo em Ogro 2 (3 alvos)"). */
export function rotuloDaAcao(c, a) {
  const alvo = a.alvo && a.alvo !== c ? a.alvo.nome : null;
  const em = alvo ? ` em ${alvo}` : '';
  const area = (a.alvos?.length || 0) > 1 ? ` (${a.alvos.length} alvos)` : '';
  switch (a.tipo) {
    case 'magia': return `${a.s.nome}${em}${area}`;
    case 'sopro': return `${a.e.nome}${em}${area}`;
    case 'ataque': return `${a.golpes.length > 1 ? 'ataque total' : 'ataque'}${K.isMelee(a.golpes[0]) ? '' : ' à distância'}${alvo ? ` contra ${alvo}` : ''}`;
    case 'mover-atacar': return `avançar e atacar ${alvo}`;
    case 'investida': return `investida contra ${alvo}`;
    case 'mover': return `andar até ${alvo}`;
    case 'engolfar': case 'esmagar': case 'atropelar': return `${a.e.nome}${area}`;
    case 'inspirar': return 'inspirar coragem';
    case 'cura-maos': return `cura pelas mãos${alvo ? ` em ${alvo}` : ''}`;
    default: return a.tipo;
  }
}
