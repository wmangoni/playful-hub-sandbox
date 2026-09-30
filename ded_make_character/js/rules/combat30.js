/**
 * Motor do simulador de combate pelas regras da 3ª edição (3.0) — TASK_006 §5.
 *
 * Sem DOM: recebe os combatentes (fichas de combate) e a semente, e devolve eventos com o texto
 * do registro. A tela só desenha os eventos; a simulação em lote só conta os resultados.
 *
 * - `fromCatalog(entrada)` converte um combatente de data/catalogo-combate.json para a ficha de
 *   combate. (O adaptador de personagem do jogador, a partir de computeSheet, é a etapa E4.)
 * - `createBattle({ ladoA, ladoB, semente, distancia, limiteRodadas })` monta a luta.
 * - `nextTurn`, `nextRound` e `runBattle` avançam; `simulate` roda a mesma luta N vezes.
 *
 * Posição por distância abstrata: todos ficam numa reta. O lado A começa no 0 e o lado B na
 * distância inicial; cada combatente tem a sua posição e só ataca corpo a corpo quem estiver ao
 * seu alcance. As regras específicas das habilidades especiais ficam em combat30-specials.js.
 */
import { normalize as loose } from '../core/format.js';
import { createRng, roll, average, parseDice, isZero } from './dice.js';
import * as SP from './combat30-specials.js';

export const TAMANHOS = ['Mínimo', 'Minúsculo', 'Pequeno', 'Médio', 'Grande', 'Enorme', 'Imenso', 'Colossal'];
const sizeIdx = t => Math.max(0, TAMANHOS.indexOf(t));
/** Tipos imunes a crítico e a ataque furtivo (e a dano maciço, quando não têm Constituição). */
const TIPOS_SEM_CRITICO = ['Morto-Vivo', 'Constructo', 'Limo', 'Planta', 'Elemental'];
/** Tipos destruídos com 0 PV (3.0). */
const TIPOS_DESTRUIDOS_EM_ZERO = ['Morto-Vivo', 'Constructo'];
/** Imunidades que o tipo dá na 3.0 (monster_overview do SRD), somadas às do catálogo. */
const MORTO_OU_CONSTRUCTO = ['efeitos de ação mental', 'veneno', 'sono', 'paralisia', 'atordoamento', 'doença', 'efeitos de morte', 'acertos críticos', 'dano de atributo', 'dreno de energia', 'dano por contusão'];
const IMUNIDADES_DE_TIPO = {
  'Morto-Vivo': MORTO_OU_CONSTRUCTO,
  Constructo: MORTO_OU_CONSTRUCTO,
  Limo: ['efeitos de ação mental', 'veneno', 'sono', 'paralisia', 'atordoamento', 'metamorfose', 'acertos críticos'],
  Planta: ['efeitos de ação mental', 'veneno', 'sono', 'paralisia', 'atordoamento', 'metamorfose', 'acertos críticos'],
  Elemental: ['veneno', 'sono', 'paralisia', 'atordoamento', 'acertos críticos'],
};
const MEDO = { abalado: 1, amedrontado: 2, apavorado: 3 };
/** Condições que tiram o combatente da luta enquanto duram. */
const FORA_DE_COMBATE = ['paralisado', 'petrificado', 'imobilizado', 'inconsciente', 'amedrontado', 'apavorado', 'enfeitiçado', 'morto'];
/** Condições que impedem de agir no turno, sem tirar da luta. */
const SEM_ACAO = ['atordoado', 'pasmo', 'nauseado'];
/** Condições em que o combatente perde o bônus de Destreza na CA. */
const PERDE_DES = ['atordoado', 'cego', 'paralisado', 'imobilizado', 'inconsciente', 'petrificado'];
const RODADAS_POR_UNIDADE = { rodada: 1, minuto: 10, hora: 600 };

// ---------------------------------------------------------------------------------------------
// utilidades

const mod = score => (Number.isFinite(score) ? Math.floor((score - 10) / 2) : 0);
const sinal = n => (n < 0 ? `− ${-n}` : `+ ${n}`);
const num = n => (n < 0 ? `−${-n}` : `${n}`);
const hasCond = (c, nome) => Boolean(c.cond[nome]);
const talento = (c, nome) => c.talentos.includes(nome);

/** Quantos dados de vida (DV) tem o combatente: soma dos dados de "10d10+10d8+60". */
export function hitDice(dadosVida) {
  let n = 0;
  for (const [, q] of String(dadosVida).matchAll(/(\d+)d\d+/g)) n += Number(q);
  return n;
}

/** Eixos da tendência: ético (L/N/C) e moral (B/N/M). "N" sozinho é neutro nos dois. */
export function eixos(tendencia) {
  const t = String(tendencia || 'N');
  if (t === 'N') return { etico: 'N', moral: 'N' };
  return { etico: t[0], moral: t[1] || 'N' };
}

/**
 * O combatente atende à restrição `afeta` (ou `condicao_afeta`) do catálogo?
 * `somente` (texto livre) é tratado por quem chama e aqui conta como atendido.
 */
export function atende(c, afeta) {
  if (!afeta) return true;
  const e = eixos(c.tendencia);
  for (const [chave, valor] of Object.entries(afeta)) {
    switch (chave) {
      case 'etico': if (!valor.includes(e.etico)) return false; break;
      case 'exceto_etico': if (valor.includes(e.etico)) return false; break;
      case 'moral': if (!valor.includes(e.moral)) return false; break;
      case 'exceto_moral': if (valor.includes(e.moral)) return false; break;
      case 'tipo': if (!valor.includes(c.tipo)) return false; break;
      case 'exceto_tipo': if (valor.includes(c.tipo)) return false; break;
      case 'exceto_subtipo': if (c.subtipos.some(s => valor.includes(s))) return false; break;
      case 'exceto_raca': {
        // "Elfo" cobre também "Elfo-do-mar", "Elfo aquático"…
        const raca = loose(c.raca || '');
        if (raca && valor.some(r => raca === loose(r) || raca.startsWith(`${loose(r)}-`) || raca.startsWith(`${loose(r)} `))) return false;
        break;
      }
      case 'dv_max': if (c.dv > valor) return false; break;
      case 'pv_max': if (c.pv > valor) return false; break;
      case 'tamanho_max': if (sizeIdx(c.tamanho) > sizeIdx(valor)) return false; break;
      default: break;
    }
  }
  return true;
}

/**
 * Duração em rodadas a partir do texto do catálogo ("1d4 rodadas", "1d6+2 minutos", "permanente").
 * 1 minuto = 10 rodadas. Formas por extenso ("até sair da área") valem 1 rodada; "enquanto…" não
 * acaba sozinha (quem aplica controla).
 */
export function parseDuracao(texto, rng) {
  if (texto == null) return 1;
  const t = loose(texto);
  if (t.startsWith('permanente')) return Infinity;
  if (t.startsWith('instantanea')) return 0;
  const m = /(\d+d\d+(?:[+-]\d+)?|\d+)\s*(rodada|minuto|hora)/.exec(t);
  if (m) {
    const n = /d/.test(m[1]) ? roll(rng, m[1]).total : Number(m[1]);
    return Math.max(1, n) * RODADAS_POR_UNIDADE[m[2]];
  }
  if (t.startsWith('enquanto')) return Infinity;
  return 1;
}

/** Faixa de distância em que um ataque à distância vale, lida do nome ("(até 9 m)", "(além de 9 m)"). */
function faixaDoNome(nome) {
  const num = s => Number(String(s).replace(',', '.'));
  const ate = /até (\d+(?:,\d+)?) m/.exec(nome);
  const alem = /além de (\d+(?:,\d+)?) m/.exec(nome);
  return { min: alem ? num(alem[1]) : 0, max: ate ? num(ate[1]) : Infinity };
}

const isMelee = a => a.tipo === 'corpo a corpo' || a.tipo === 'toque';
const isRanged = a => a.tipo === 'distancia' || a.tipo === 'toque a distancia';
const isTouch = a => a.tipo === 'toque' || a.tipo === 'toque a distancia';

// ---------------------------------------------------------------------------------------------
// ficha de combate a partir do catálogo

/** Converte um combatente do catálogo (monstro ou Holy Avenger) para a ficha de combate do motor. */
export function fromCatalog(e) {
  const clone = v => JSON.parse(JSON.stringify(v));
  const especiais = [
    ...e.ataques_especiais.map(x => ({ ...clone(x), grupo: 'ataque' })),
    ...e.qualidades_especiais.map(x => ({ ...clone(x), grupo: 'qualidade' })),
  ];
  return {
    origem: 'catalogo',
    ref: e.id,
    categoria: e.categoria,
    nome: e.nome,
    tipo: e.tipo,
    subtipos: [...e.subtipos],
    tamanho: e.tamanho,
    tendencia: e.tendencia,
    raca: e.raca || null,
    nd: e.nd,
    nivel: e.nivel,
    dv: Math.max(1, hitDice(e.dados_vida)),
    pvMax: e.pv,
    iniciativa: e.iniciativa,
    deslocamento: { ...e.deslocamento },
    espaco: e.espaco,
    alcance: e.alcance,
    ca: { total: e.ca.total, toque: e.ca.toque, surpresa: e.ca.surpresa },
    bba: e.bba,
    agarrar: e.agarrar,
    ataques: clone(e.ataques),
    ataqueTotal: clone(e.ataque_total),
    ataqueTotalDistancia: e.ataque_total_distancia ? clone(e.ataque_total_distancia) : null,
    especiais,
    magias: e.magias ? clone(e.magias) : null,
    rd: e.reducao_dano ? { ...e.reducao_dano } : null,
    rm: e.resistencia_magia,
    resistEnergia: { ...e.resistencias_energia },
    imunidades: [...new Set([...e.imunidades, ...(IMUNIDADES_DE_TIPO[e.tipo] || [])])],
    // constructos e mortos-vivos (3.0): imunes a qualquer efeito que peça Fortitude e a dano por contusão
    imuneFortitude: TIPOS_DESTRUIDOS_EM_ZERO.includes(e.tipo),
    vulnerabilidades: [...e.vulnerabilidades],
    regeneracao: e.regeneracao ? clone(e.regeneracao) : null,
    curaAcelerada: e.cura_acelerada,
    resistencias: { ...e.resistencias },
    atributos: { ...e.atributos },
    talentos: e.talentos.map(t => loose(String(t).replace(/\s*\(.*\)\s*$/, ''))),
    tatica: e.tatica || '',
    // o catálogo não descreve a armadura: a evasão vale (3.0: só com armadura leve ou nenhuma)
    armaduraLeve: true,
    esquivaSobrenatural: especiais.some(x => /esquiva sobrenatural/.test(loose(`${x.id} ${x.nome}`).replace(/-/g, ' '))),
  };
}

// ---------------------------------------------------------------------------------------------
// montagem da luta

function instanciar(ficha, lado, indice, pos) {
  const c = JSON.parse(JSON.stringify(ficha));
  Object.assign(c, {
    uid: `${lado}${indice + 1}`,
    lado,
    pos,
    pv: c.pvMax,
    contusao: 0,
    pvTemp: 0,
    estado: 'ativo',
    cond: {},
    agiu: false,
    investidaAte: null,
    usos: {},
    recarga: {},
    magiasRestantes: (c.magias?.lista || []).map(s => s.quantidade),
    resistUsada: {},
    agarrando: null,
    agarradoPor: null,
    engolidoPor: null,
    engolfadoPor: null,
    danoInterno: 0,
    imuneAPresenca: [],
    venenos: [],
    danoAtributo: { for: 0, des: 0, con: 0, int: 0, sab: 0, car: 0 },
    niveisNegativos: 0,
    buffs: [],
    alvoEsquiva: null,
    fugindo: false,
    imagens: 0,
    queimando: null,
    stats: { danoCausado: 0, danoRecebido: 0, caiuNaRodada: null, abates: 0 },
  });
  return c;
}

/**
 * Monta a luta. `ladoA` e `ladoB` são listas de fichas de combate (de `fromCatalog` ou do
 * adaptador de personagem). `registrar: false` pula o texto do registro (simulação em lote).
 */
export function createBattle({ ladoA, ladoB, semente = Date.now(), rng = null, distancia = 9, limiteRodadas = 50, registrar = true }) {
  if (!ladoA?.length || !ladoB?.length) throw new Error('cada lado precisa de pelo menos um combatente');
  const gerador = rng || createRng(semente);
  const b = {
    rng: gerador,
    semente: gerador.seed,
    distancia,
    limiteRodadas,
    registrar,
    rodada: 0,
    turno: -1,
    ordem: [],
    combatentes: [...ladoA.map((f, i) => instanciar(f, 'A', i, 0)), ...ladoB.map((f, i) => instanciar(f, 'B', i, distancia))],
    eventos: [],
    fim: null,
  };
  const contagem = {};
  for (const c of b.combatentes) contagem[c.nome] = (contagem[c.nome] || 0) + 1;
  const vistos = {};
  for (const c of b.combatentes) if (contagem[c.nome] > 1) {
    vistos[c.nome] = (vistos[c.nome] || 0) + 1;
    c.nomeBase = c.nome;
    c.nome = `${c.nome} ${vistos[c.nome]}`;
  }
  const byUid = new Map(b.combatentes.map(c => [c.uid, c]));
  b.get = uid => byUid.get(uid) || null;
  // iniciativa: d20 + bônus; empate vai para o maior bônus e depois para a semente
  const iniciativa = b.combatentes.map(c => ({ uid: c.uid, bonus: c.iniciativa, total: b.rng.die(20) + c.iniciativa, desempate: b.rng.float() }));
  iniciativa.sort((x, y) => y.total - x.total || y.bonus - x.bonus || y.desempate - x.desempate);
  b.ordem = iniciativa.map(i => i.uid);
  log(b, null, 'inicio', () => `Iniciativa: ${iniciativa.map(i => `${b.get(i.uid).nome} ${num(i.total)}`).join(', ')}.`);
  for (const c of b.combatentes) SP.onBattleStart(K, b, c);
  return b;
}

// ---------------------------------------------------------------------------------------------
// registro

function log(b, ator, tipo, texto) {
  const ev = { rodada: b.rodada, ator: ator?.uid ?? null, tipo };
  if (b.registrar) ev.texto = String(typeof texto === 'function' ? texto() : texto).replace(/\.{2,}/g, p => (p.length === 2 ? '.' : p));
  b.eventos.push(ev);
  return ev;
}

// ---------------------------------------------------------------------------------------------
// tempo e condições

/** "Tique" absoluto: rodada × combatentes + posição na ordem. Durações expiram num tique. */
const tick = b => b.rodada * b.ordem.length + Math.max(0, b.turno);

/**
 * Expiração de uma duração de N rodadas: no início do turno da fonte (ou do afetado), N rodadas
 * depois — como "1 rodada" na 3.0 dura até o turno seguinte de quem causou o efeito.
 */
function expiraEm(b, rodadas, fonte, afetado) {
  if (rodadas === Infinity) return Infinity;
  const quem = fonte || afetado;
  const idx = Math.max(0, b.ordem.indexOf(quem.uid));
  const agora = tick(b);
  let alvo = (b.rodada + rodadas) * b.ordem.length + idx;
  // efeito aplicado depois do turno da fonte nesta rodada: conta a partir da próxima vez dela
  if (alvo <= agora) alvo += b.ordem.length;
  return alvo;
}

/**
 * Aplica uma condição. `categoria` diz a que imunidade ela pertence ("paralisia", "sono", "medo"…).
 * Medo acumula (3.0): abalado + abalado = amedrontado; abalado ou amedrontado + amedrontado = apavorado.
 * Devolve o nome da condição que ficou (ou null, se imune).
 */
/**
 * O combatente é imune a esta condição? `categoria` é a imunidade do efeito que a causa
 * ("paralisia" para a paralisia do carniçal, "sono" para Sono…); as demais vêm da própria condição.
 */
function imuneACondicao(c, nome, categoria = null) {
  const imune = cat => c.imunidades.includes(cat);
  if (categoria && imune(categoria)) return categoria;
  if (MEDO[nome] && (imune('medo') || imune('efeitos de ação mental'))) return 'medo';
  if ((nome === 'enfeitiçado' || nome === 'confuso') && (imune('enfeitiçar') || imune('efeitos de ação mental'))) return 'efeitos de ação mental';
  if (nome === 'paralisado' && imune('paralisia')) return 'paralisia';
  if (nome === 'atordoado' && imune('atordoamento')) return 'atordoamento';
  if (nome === 'petrificado' && imune('petrificação')) return 'petrificação';
  if (nome === 'morto' && imune('efeitos de morte')) return 'efeitos de morte';
  return null;
}

function aplicarCondicao(b, c, nome, rodadas, { fonte = null, categoria = null, extra = {}, semImunidadeAMorte = false } = {}) {
  if (c.estado === 'morto') return null;
  const imunidade = semImunidadeAMorte && nome === 'morto' ? null : imuneACondicao(c, nome, categoria);
  if (imunidade) {
    log(b, c, 'imune', `${c.nome} é imune (${imunidade}).`);
    return null;
  }
  // "morto" não é uma condição com duração: é a morte (Implosão, veneno mortal, Palavra Sagrada…)
  if (nome === 'morto') {
    // o Tarrasque regenera mesmo morto por magia de morte: cai com −10 PV em contusão (LM 3.0)
    if (c.regeneracao?.resiste_morte) {
      c.contusao = Math.max(c.contusao, c.pv + 10);
      log(b, c, 'regeneracao', `${c.nome} regenera mesmo assim: o efeito de morte só o derruba.`);
      atualizarEstado(b, c, fonte);
      return null;
    }
    morrer(b, c, fonte, TIPOS_DESTRUIDOS_EM_ZERO.includes(c.tipo) ? 'destruído' : 'morto');
    return 'morto';
  }
  if (rodadas === 0) return null;
  let final = nome;
  if (MEDO[nome]) {
    const atual = Object.keys(MEDO).find(m => c.cond[m]);
    if (atual) {
      // abalado + abalado = amedrontado; qualquer outra soma com amedrontado (ou apavorado) = apavorado
      const nivel = MEDO[atual] === 1 && MEDO[nome] === 1 ? 2 : 3;
      final = Object.keys(MEDO).find(m => MEDO[m] === nivel);
      const antes = c.cond[atual];
      delete c.cond[atual];
      c.cond[final] = { expira: Math.max(antes.expira, expiraEm(b, rodadas, fonte, c)), fonte: fonte?.uid ?? null, ...extra };
      aoMudarCondicao(b, c, final);
      return final;
    }
  }
  const expira = expiraEm(b, rodadas, fonte, c);
  const prev = c.cond[final];
  c.cond[final] = { expira: prev ? Math.max(prev.expira, expira) : expira, fonte: fonte?.uid ?? null, ...extra };
  aoMudarCondicao(b, c, final);
  return final;
}

/** "Lisandra: enredado por 3 rodadas (Constrição)." — sem concordância de gênero. */
function anunciarCondicao(b, c, nome, rodadas, origem = '') {
  const dur = rodadas === Infinity || rodadas == null ? '' : ` por ${rodadas} rodada${rodadas === 1 ? '' : 's'}`;
  log(b, c, 'condicao', `${c.nome}: ${nome}${dur}${origem ? ` (${origem})` : ''}.`);
}

function aoMudarCondicao(b, c, nome) {
  if (nome === 'amedrontado' || nome === 'apavorado') {
    if (!c.fugindo) {
      c.fugindo = true;
      soltarAgarrao(b, c);
      log(b, c, 'fuga', `${c.nome} foge da luta (${nome}).`);
    }
  }
  if (FORA_DE_COMBATE.includes(nome)) marcarQueda(b, c);
}

function removerCondicao(b, c, nome) {
  if (!c.cond[nome]) return;
  delete c.cond[nome];
  if ((nome === 'amedrontado' || nome === 'apavorado') && !c.cond.amedrontado && !c.cond.apavorado && c.fugindo) {
    c.fugindo = false;
    c.pos = c.lado === 'A' ? 0 : b.distancia;
    if (c.estado !== 'morto') log(b, c, 'retorno', `${c.nome} se recupera do medo e volta à luta.`);
  }
}

function expirarCondicoes(b, c) {
  const agora = tick(b);
  for (const [nome, info] of Object.entries(c.cond)) if (info.expira <= agora) {
    removerCondicao(b, c, nome);
    if (c.estado !== 'morto') log(b, c, 'condicao-fim', `${c.nome}: fim de ${nome}.`);
  }
  c.buffs = c.buffs.filter(bf => {
    if (bf.expira > agora) return true;
    SP.onBuffEnd(K, b, c, bf);
    return false;
  });
}

// ---------------------------------------------------------------------------------------------
// estado

/** Pode lutar: de pé, sem condição que o tire da luta e sem ter fugido. */
export function podeLutar(c) {
  return c.estado === 'ativo' && !c.fugindo && !FORA_DE_COMBATE.some(n => c.cond[n]);
}

/** Alvo que dá para atacar: em pé e à vista (não engolido nem engolfado). */
const alvoValido = c => podeLutar(c) && !c.engolidoPor && !c.engolfadoPor;

function marcarQueda(b, c) {
  if (c.stats.caiuNaRodada == null && !podeLutar(c)) c.stats.caiuNaRodada = b.rodada;
}

function atualizarEstado(b, c, fonte = null) {
  if (c.estado === 'morto') return;
  const antes = c.estado;
  const destruidoEmZero = TIPOS_DESTRUIDOS_EM_ZERO.includes(c.tipo);
  if (c.pv <= -10 || (destruidoEmZero && c.pv <= 0)) return morrer(b, c, fonte, destruidoEmZero ? 'destruído' : 'morto');
  if (c.pv < 0) c.estado = antes === 'estavel' ? 'estavel' : 'morrendo';
  else if (c.pv === 0) c.estado = 'incapacitado';
  else if (c.contusao > c.pv) c.estado = 'inconsciente';
  else c.estado = 'ativo';
  if (c.estado !== antes) {
    const textos = {
      morrendo: `${c.nome} cai, morrendo (${num(c.pv)} PV).`,
      incapacitado: `${c.nome}: incapacitado (0 PV).`,
      inconsciente: `${c.nome} desmaia: o dano por contusão (${c.contusao}) passou dos PV (${c.pv}).${c.regeneracao ? ' A regeneração vai pôr de pé de novo depois da luta.' : ''}`,
      ativo: `${c.nome} volta a lutar (${c.pv} PV).`,
    };
    if (textos[c.estado]) log(b, c, 'estado', textos[c.estado]);
    marcarQueda(b, c);
    if (antes === 'ativo' && c.estado !== 'ativo') soltarAgarrao(b, c);
  }
}

function morrer(b, c, fonte, como = 'morto') {
  if (c.estado === 'morto') return;
  c.estado = 'morto';
  c.pv = Math.min(c.pv, TIPOS_DESTRUIDOS_EM_ZERO.includes(c.tipo) ? 0 : -10);
  marcarQueda(b, c);
  if (fonte && fonte.lado !== c.lado) fonte.stats.abates++;
  log(b, c, 'morte', `${c.nome}: ${como}.`);
  soltarAgarrao(b, c);
  // quem estava engolido ou engolfado sai
  for (const x of b.combatentes) {
    if (x.engolidoPor === c.uid || x.engolfadoPor === c.uid) {
      x.engolidoPor = null;
      x.engolfadoPor = null;
      x.pos = c.pos;
      log(b, x, 'libertado', `${x.nome} sai de dentro de ${c.nome}.`);
    }
  }
  SP.onDeath(K, b, c);
}

function soltarAgarrao(b, c) {
  if (c.agarrando) {
    const alvo = b.get(c.agarrando);
    if (alvo && alvo.agarradoPor === c.uid) alvo.agarradoPor = null;
    c.agarrando = null;
  }
  if (c.agarradoPor) {
    const quem = b.get(c.agarradoPor);
    if (quem && quem.agarrando === c.uid) quem.agarrando = null;
    c.agarradoPor = null;
  }
}

// ---------------------------------------------------------------------------------------------
// atributos efetivos (dano de atributo, fúria, fadiga, magias de reforço)

/** Diferença de modificador de um atributo entre o valor da ficha e o valor atual. */
function deltaMod(c, attr) {
  const base = c.atributos[attr];
  if (base == null) return 0;
  const buff = c.buffs.reduce((s, bf) => s + (bf.atributos?.[attr] || 0), 0);
  const fadiga = hasCond(c, 'exausto') ? (attr === 'for' || attr === 'des' ? -6 : 0) : hasCond(c, 'fatigado') ? (attr === 'for' || attr === 'des' ? -2 : 0) : 0;
  const atual = base + buff + fadiga - (c.danoAtributo[attr] || 0);
  return mod(atual) - mod(base);
}

function somaBuff(c, chave) {
  return c.buffs.reduce((s, bf) => s + (bf.bonus?.[chave] || 0), 0);
}

// ---------------------------------------------------------------------------------------------
// distância e movimento

export const gap = (a, b) => Math.abs(a.pos - b.pos);
const inimigos = (b, c) => b.combatentes.filter(x => x.lado !== c.lado);
const aliados = (b, c) => b.combatentes.filter(x => x.lado === c.lado);

function velocidade(c) {
  if (c.agarradoPor || c.agarrando || c.engolidoPor || c.engolfadoPor) return 0;
  const d = c.deslocamento || {};
  let v = Math.max(d.terrestre || 0, d.voo || 0);
  if (hasCond(c, 'enredado') || hasCond(c, 'exausto') || hasCond(c, 'cego')) v /= 2;
  return v;
}

/** Aproxima `c` de `alvo` até ficar a `alcance` dele, andando no máximo `max` metros. */
function mover(c, alvo, alcance, max) {
  const falta = Math.max(0, gap(c, alvo) - alcance);
  const m = Math.min(falta, max);
  const dir = Math.sign(alvo.pos - c.pos) || (c.lado === 'A' ? 1 : -1);
  c.pos += dir * m;
  return m;
}

const alcanceDe = (c, a) => (isMelee(a) ? (a.alcance_m ?? c.alcance ?? 1.5) : Infinity);

/** O ataque corpo a corpo alcança o alvo? O à distância cabe no alcance máximo e na faixa do nome? */
function ataqueAlcanca(c, alvo, a) {
  const d = gap(c, alvo);
  if (isMelee(a)) return d <= Math.max(1.5, alcanceDe(c, a)) + 1e-9;
  const faixa = faixaDoNome(a.nome);
  const max = a.alcance_m ?? (a.incremento_m ? a.incremento_m * 10 : 30);
  return d <= max + 1e-9 && d >= faixa.min && d <= faixa.max + 1e-9;
}

// ---------------------------------------------------------------------------------------------
// CA, bônus de ataque e dano

function imuneCritico(c) {
  return TIPOS_SEM_CRITICO.includes(c.tipo) || c.imunidades.includes('acertos críticos');
}

/** O alvo está sem o bônus de Destreza contra este atacante? */
function semDestreza(b, alvo, atacante) {
  if (PERDE_DES.some(n => alvo.cond[n])) return true;
  if (b.rodada === 1 && !alvo.agiu && !alvo.esquivaSobrenatural) return true; // surpreso
  // quem está agarrado perde a Des contra quem não está no agarrão (3.0). Quem segura com o agarrar
  // aprimorado "não é considerado agarrado" e mantém a Des (SRD, Improved Grab).
  if (alvo.agarradoPor && alvo.agarradoPor !== atacante?.uid) return true;
  return false;
}

/** CA do alvo contra este ataque. */
function caContra(b, alvo, atacante, a) {
  const dex = alvo.ca.total - alvo.ca.surpresa; // parte da Destreza (e esquiva) na CA
  const semDes = semDestreza(b, alvo, atacante);
  let ca;
  if (isTouch(a)) ca = alvo.ca.toque - (semDes ? Math.max(0, dex) : 0);
  else ca = semDes ? alvo.ca.surpresa : alvo.ca.total;
  if (!semDes) ca += deltaMod(alvo, 'des');
  if (alvo.investidaAte != null && tick(b) < alvo.investidaAte) ca -= 2;
  if (alvo.alvoEsquiva && atacante && alvo.alvoEsquiva === atacante.uid && talento(alvo, 'esquiva') && !semDes) ca += 1;
  if (hasCond(alvo, 'enredado')) ca -= 2; // −4 Des
  if (hasCond(alvo, 'lento')) ca -= 2;
  if (hasCond(alvo, 'derrubado')) ca += isMelee(a) ? -4 : 4;
  ca += somaBuff(alvo, 'ca') + somaBuff(alvo, 'ca_deflexao') + (isTouch(a) ? 0 : somaBuff(alvo, 'ca_natural'));
  return ca;
}

/** Penalidades e bônus no ataque (fora o bônus do próprio ataque). Devolve { total, partes }. */
function modsDeAtaque(b, c, alvo, a, { investida = false, poderoso = 0 } = {}) {
  const partes = [];
  const add = (v, rotulo) => { if (v) partes.push([v, rotulo]); };
  if (Object.keys(MEDO).some(m => c.cond[m])) add(-2, 'medo');
  if (hasCond(c, 'enjoado')) add(-2, 'enjoado');
  if (hasCond(c, 'enredado')) add(-2, 'enredado');
  if (hasCond(c, 'lento') && isMelee(a)) add(-2, 'lento');
  if (hasCond(c, 'derrubado') && isMelee(a)) add(-4, 'caído');
  if (c.niveisNegativos) add(-c.niveisNegativos, 'níveis negativos');
  // atributo do ataque: For corpo a corpo, Des à distância; o adaptador de personagem marca a Des
  // da Acuidade com Arma (`atributo_ataque`)
  const atributo = a.atributo_ataque || (isMelee(a) ? 'for' : 'des');
  add(deltaMod(c, atributo), atributo === 'for' ? 'Força' : 'Destreza');
  for (const bf of c.buffs) add(bf.bonus?.ataque || 0, bf.rotulo || 'reforço');
  if (investida) add(2, 'investida');
  if (poderoso) add(-poderoso, 'Ataque Poderoso');
  if (isRanged(a)) {
    const d = gap(c, alvo);
    if (a.incremento_m && d > a.incremento_m) add(-2 * (Math.ceil(d / a.incremento_m - 1e-9) - 1), 'distância');
    // Tiro Certeiro dos personagens: +1 até 9 m (o adaptador põe em `ate_9m`)
    if (a.ate_9m?.ataque && d <= 9) add(a.ate_9m.ataque, a.ate_9m.rotulo || 'até 9 m');
    // disparar contra alvo em combate corpo a corpo com um aliado: −4 (3.0), salvo Tiro Preciso
    const emMelee = aliados(b, c).some(x => x !== c && podeLutar(x) && gap(x, alvo) <= Math.max(x.alcance || 1.5, alvo.alcance || 1.5));
    if (emMelee && !talento(c, 'tiro preciso')) add(-4, 'alvo em corpo a corpo');
  }
  // alvo indefeso ou atordoado: +2 (atordoado, cego) / +4 corpo a corpo (caído, paralisado)
  if (hasCond(alvo, 'atordoado') || hasCond(alvo, 'cego')) add(2, 'alvo vulnerável');
  if (isMelee(a) && (hasCond(alvo, 'derrubado') || hasCond(alvo, 'paralisado') || hasCond(alvo, 'imobilizado'))) add(4, 'alvo indefeso');
  for (const [v, r] of SP.attackMods(K, b, c, alvo, a)) add(v, r);
  return { total: partes.reduce((s, [v]) => s + v, 0), partes };
}

function modsDeDano(b, c, alvo, a, { poderoso = 0 } = {}) {
  let v = 0;
  if (a.for_mult != null) {
    // personagem: a For de agora (fúria, dano de atributo) com o mesmo peso do adaptador (×1,5 com as
    // duas mãos, ×0,5 na inábil; arco e funda só a negativa, besta nenhuma)
    const d = deltaMod(c, 'for');
    if (d) {
      const peso = x => (a.for_mult === 0 ? (a.for_negativa ? Math.min(0, x) : 0) : x < 0 ? x : Math.floor(x * a.for_mult));
      const base = mod(c.atributos.for ?? 10);
      v += peso(base + d) - peso(base);
    }
  } else if (isMelee(a) || /arremess/i.test(a.nome)) v += deltaMod(c, 'for');
  // Tiro Certeiro (+1) e Especialização em Arma à distância (+2) só até 9 m (3.0)
  if (isRanged(a) && a.ate_9m?.dano && alvo && gap(c, alvo) <= 9) v += a.ate_9m.dano;
  if (hasCond(c, 'enjoado')) v -= 2;
  if (hasCond(c, 'lento') && isMelee(a)) v -= 2;
  v += somaBuff(c, 'dano');
  v += poderoso;
  v += SP.damageMods(K, b, c, alvo, a);
  return v;
}

// ---------------------------------------------------------------------------------------------
// defesas: RD, energia, regeneração

/** A arma vence a RD do alvo? (3.0: bônus de melhoria, material, arma natural com a RD do dono) */
function venceRD(atacante, a, rd) {
  if (!rd) return true;
  const exceto = String(rd.exceto).trim();
  if (exceto === '—' || exceto === '-') return false;
  let melhoria = a?.magico ? Number(String(a.magico).replace('+', '')) : 0;
  // armas naturais contam como do tipo que vence a RD da própria criatura
  if (a?.natural && atacante?.rd) {
    const proprio = /^\+(\d+)$/.exec(String(atacante.rd.exceto).trim());
    if (proprio) melhoria = Math.max(melhoria, Number(proprio[1]));
  }
  const n = /^\+(\d+)$/.exec(exceto);
  if (n) return melhoria >= Number(n[1]);
  // material (prata…): vence com o material ou com qualquer arma mágica ("mais poderosa")
  if (a?.material && loose(a.material) === loose(exceto)) return true;
  return melhoria >= 1;
}

/** Qualidades de uma arma, para a regeneração do Lorde das Profundezas (sagrada, abençoada). */
function qualidadesDaArma(a) {
  const q = [];
  if (!a) return q;
  const nome = loose(a.nome);
  if (/sagrad/.test(nome) || (a.dano_extra || []).some(d => d.tipo === 'sagrado')) q.push('sagrada');
  if (/abencoad/.test(nome)) q.push('abençoada');
  return q;
}

/** O dano (de uma energia, ou físico com esta arma) passa pela regeneração como dano normal? */
function furaRegeneracao(c, { tipo, ataque }) {
  const reg = c.regeneracao;
  if (!reg) return true;
  for (const x of reg.exceto) {
    if (typeof x === 'string' && x === tipo) return true;
    if (x && typeof x === 'object' && x.arma && tipo === 'fisico' && ataque) {
      const q = qualidadesDaArma(ataque);
      const bonus = ataque.magico ? Number(String(ataque.magico).replace('+', '')) : 0;
      if (x.arma.qualidade.some(k => q.includes(k)) && bonus >= (x.arma.bonus_minimo || 0)) return true;
    }
  }
  return false;
}

/**
 * Dano de energia: imunidade anula; vulnerabilidade (3.0) dobra, salvo quando houve teste para
 * metade e o alvo passou; resistência absorve até N por rodada (desde o início do turno do alvo).
 */
function danoDeEnergia(b, alvo, valor, tipo, { passou = null } = {}) {
  if (valor <= 0) return { valor: 0, nota: null };
  if (alvo.imunidades.includes(tipo)) return { valor: 0, nota: `imune a ${tipo}` };
  let v = valor;
  let nota = null;
  if (alvo.vulnerabilidades.includes(tipo) && passou !== true) {
    v *= 2;
    nota = `vulnerável a ${tipo} (×2)`;
  }
  const resist = alvo.resistEnergia[tipo] || 0;
  if (resist) {
    const usada = alvo.resistUsada[tipo] || 0;
    const absorve = Math.min(v, Math.max(0, resist - usada));
    if (absorve) {
      alvo.resistUsada[tipo] = usada + absorve;
      v -= absorve;
      nota = [nota, `resistência a ${tipo} absorve ${absorve}`].filter(Boolean).join('; ');
    }
  }
  return { valor: v, nota };
}

/**
 * Causa dano. `partes`: [{ valor, tipo: 'fisico' | energia, passou }]. O físico passa pela RD
 * (salvo `ignoraRD`, de magias); a energia pela resistência. Com regeneração, o que não fura
 * vira dano por contusão. Devolve o total que efetivamente tirou do alvo.
 */
function causarDano(b, alvo, partes, { fonte = null, ataque = null, ignoraRD = false, info = null } = {}) {
  if (alvo.estado === 'morto') return 0;
  const notas = [];
  let absorvidoRD = 0;
  let letal = 0;
  let contusao = 0;
  let fisico = 0;
  for (const p of partes) {
    if (!(p.valor > 0)) continue;
    let v = p.valor;
    if (p.tipo === 'fisico') {
      fisico += v;
      continue;
    }
    const r = danoDeEnergia(b, alvo, v, p.tipo, { passou: p.passou });
    if (r.nota) notas.push(r.nota);
    v = r.valor;
    if (v <= 0) continue;
    if (furaRegeneracao(alvo, { tipo: p.tipo })) letal += v;
    else contusao += v;
  }
  if (fisico > 0) {
    if (alvo.rd && !ignoraRD && !venceRD(fonte, ataque, alvo.rd)) {
      const absorve = Math.min(fisico, alvo.rd.valor);
      fisico -= absorve;
      absorvidoRD = absorve;
      if (absorve) notas.push(`RD ${alvo.rd.valor}/${alvo.rd.exceto} absorve ${absorve}`);
    }
    if (fisico > 0) {
      if (furaRegeneracao(alvo, { tipo: 'fisico', ataque })) letal += fisico;
      else contusao += fisico;
    }
  }
  // a RD anulou todo o dano do golpe: anula também a maioria dos efeitos que vêm com ele (SRD)
  if (info) info.anuladoPorRD = absorvidoRD > 0 && letal + contusao === 0;
  if (alvo.pvTemp > 0 && letal > 0) {
    const absorve = Math.min(alvo.pvTemp, letal);
    alvo.pvTemp -= absorve;
    letal -= absorve;
    notas.push(`${absorve} nos PV temporários`);
  }
  const total = letal + contusao;
  if (notas.length) log(b, alvo, 'defesa', `${alvo.nome}: ${notas.join('; ')}.`);
  if (total <= 0) return 0;
  alvo.pv -= letal;
  alvo.contusao += contusao;
  if (letal > 0 && alvo.estado === 'estavel') alvo.estado = 'morrendo'; // dano letal reabre os ferimentos
  alvo.stats.danoRecebido += total;
  if (fonte) fonte.stats.danoCausado += total;
  if (contusao && alvo.regeneracao) log(b, alvo, 'regeneracao', `${alvo.nome} regenera: ${contusao} de dano vira contusão.`);
  // dano maciço (3.0): 50+ num único ataque → Fortitude CD 15 ou morre
  if (letal >= 50 && alvo.pv > -10 && !alvo.imunidades.includes('morte por dano maciço') && !TIPOS_DESTRUIDOS_EM_ZERO.includes(alvo.tipo) && alvo.atributos.con != null) {
    const r = teste(b, alvo, 'fort', 15, { rotulo: 'dano maciço' });
    if (!r.passou) {
      morrer(b, alvo, fonte, 'morto (dano maciço)');
      return total;
    }
  }
  atualizarEstado(b, alvo, fonte);
  return total;
}

function curar(b, c, valor, fonte = null) {
  if (c.estado === 'morto' || valor <= 0) return 0;
  const antes = c.pv;
  c.pv = Math.min(c.pvMax, c.pv + valor);
  const cura = c.pv - antes;
  if (cura > 0) {
    log(b, c, 'cura', `${c.nome} recupera ${cura} PV (${num(c.pv)}/${c.pvMax}).`);
    // qualquer cura estabiliza quem está morrendo, mesmo que continue abaixo de 0 (3.0)
    if (c.pv < 0) c.estado = 'estavel';
    else atualizarEstado(b, c, fonte);
  }
  return cura;
}

// ---------------------------------------------------------------------------------------------
// testes de resistência e testes resistidos

/**
 * Teste de resistência: d20 + bônus + modificadores ≥ CD. O 1 natural sempre falha e o 20 natural
 * sempre passa (3.0). `medo: true` soma os bônus contra medo (inspirar coragem, aura de coragem).
 */
function teste(b, c, tipo, cd, { medo = false, rotulo = '', silencioso = false } = {}) {
  const d = b.rng.die(20);
  let bonus = c.resistencias[tipo] ?? 0;
  if (Object.keys(MEDO).some(m => c.cond[m])) bonus -= 2;
  if (hasCond(c, 'enjoado')) bonus -= 2;
  if (hasCond(c, 'lento') && tipo === 'ref') bonus -= 2;
  bonus -= c.niveisNegativos;
  bonus += { fort: deltaMod(c, 'con'), ref: deltaMod(c, 'des'), von: deltaMod(c, 'sab') }[tipo];
  bonus += somaBuff(c, 'resistencias') + somaBuff(c, tipo);
  bonus += SP.saveMods(K, b, c, tipo, { medo });
  const total = d + bonus;
  const passou = d === 20 || (d !== 1 && total >= cd);
  if (!silencioso) {
    const nomes = { fort: 'Fortitude', ref: 'Reflexos', von: 'Vontade' };
    log(b, c, 'teste', () => `${c.nome} ${passou ? 'passa' : 'falha'} em ${nomes[tipo]}${rotulo ? ` (${rotulo})` : ''}: ${d} ${sinal(bonus)} = ${num(total)} contra CD ${cd}${d === 20 ? ', 20 natural' : d === 1 ? ', 1 natural' : ''}.`);
  }
  return { passou, d, total, cd };
}

/**
 * Teste resistido (agarrar, Força): empate vai para o maior modificador; persistindo, rola de novo.
 * `texto` mostra as duas rolagens ("14 + 12 = 26 contra 9 + 4 = 13").
 */
function resistido(b, bonusA, bonusB) {
  for (let i = 0; i < 5; i++) {
    const ra = b.rng.die(20);
    const rd = b.rng.die(20);
    const a = ra + bonusA;
    const d = rd + bonusB;
    const texto = `${ra} ${sinal(bonusA)} = ${num(a)} contra ${rd} ${sinal(bonusB)} = ${num(d)}`;
    if (a !== d) return { venceu: a > d, a, d, texto };
    if (bonusA !== bonusB) return { venceu: bonusA > bonusB, a, d, texto };
  }
  return { venceu: false, a: 0, d: 0, texto: 'empate' };
}

const agarrarDe = c => c.agarrar + deltaMod(c, 'for') - c.niveisNegativos;

// ---------------------------------------------------------------------------------------------
// ataque

/**
 * Um golpe. Devolve { acertou, critico, dano, derrubou }. `opts`: investida, poderoso (Ataque
 * Poderoso). Bônus de um golpe só (Destruir o Mal) acabam no fim dele, acertando ou não.
 */
function golpe(b, c, alvo, a, opts = {}) {
  const r = golpeInterno(b, c, alvo, a, opts);
  SP.onSwingEnd(K, b, c);
  return r;
}

function golpeInterno(b, c, alvo, a, opts) {
  const ca = caContra(b, alvo, c, a);
  const m = modsDeAtaque(b, c, alvo, a, opts);
  const bonus = a.bonus + m.total;
  const d = b.rng.die(20);
  const total = d + bonus;
  let acertou = d === 20 || (d !== 1 && total >= ca);
  const texto = [`${c.nome} ataca ${alvo.nome} com ${a.nome}: ${d} ${sinal(bonus)} = ${num(total)} contra CA ${ca}`];
  if (m.partes.length && b.registrar) texto[0] += ` (${m.partes.map(([v, r]) => `${v > 0 ? '+' : '−'}${Math.abs(v)} ${r}`).join(', ')})`;
  if (!acertou) {
    texto.push(d === 1 ? '1 natural, erra.' : 'erra.');
    log(b, c, 'ataque', () => texto.join(' — '));
    return { acertou: false, critico: false, dano: 0, derrubou: false };
  }
  // chance de falha: camuflagem do alvo, atacante cego
  const falha = Math.max(SP.missChance(K, b, c, alvo, a), hasCond(c, 'cego') ? 50 : 0);
  if (falha && b.rng.chance(falha)) {
    texto.push(`acertaria, mas erra por ${falha}% de chance de falha.`);
    log(b, c, 'ataque', () => texto.join(' — '));
    return { acertou: false, critico: false, dano: 0, derrubou: false };
  }
  if (alvo.imagens > 0) {
    if (b.rng.die(alvo.imagens + 1) !== 1) {
      alvo.imagens--;
      texto.push(`acerta uma imagem espelhada (restam ${alvo.imagens}).`);
      log(b, c, 'ataque', () => texto.join(' — '));
      return { acertou: false, critico: false, dano: 0, derrubou: false };
    }
  }
  // crítico: ameaça na margem, confirmação contra a mesma CA
  let critico = false;
  const margem = a.critico?.margem ?? 20;
  if (d >= margem && !imuneCritico(alvo)) {
    const d2 = b.rng.die(20);
    critico = d2 === 20 || (d2 !== 1 && d2 + bonus >= ca);
    texto.push(critico ? `ameaça e confirma o crítico (${d2} ${sinal(bonus)} = ${num(d2 + bonus)}), ×${a.critico.multiplicador}` : `ameaça crítico, mas não confirma (${d2} ${sinal(bonus)} = ${num(d2 + bonus)})`);
  } else if (d >= margem) texto.push(`${alvo.nome} é imune a crítico`);
  texto.push('acerta.');
  log(b, c, 'ataque', () => texto.join(' — '));

  const partes = [];
  let fisico = 0;
  if (!isZero(a.dano)) {
    const dm = modsDeDano(b, c, alvo, a, opts);
    const r = roll(b.rng, a.dano, { vezes: critico ? a.critico.multiplicador : 1, bonus: dm });
    fisico = Math.max(1, r.total);
    log(b, c, 'dano', () => `Dano ${a.dano}${dm ? ` ${sinal(dm)}` : ''}${critico ? ` ×${a.critico.multiplicador}` : ''}: ${fisico}.`);
  }
  const extraFisico = SP.extraDamage(K, b, c, alvo, a, { critico }); // ataque furtivo, destruir…
  if (fisico + extraFisico > 0) partes.push({ valor: fisico + extraFisico, tipo: 'fisico' });
  for (const de of a.dano_extra || []) {
    if (de.afeta && !atende(alvo, de.afeta)) continue;
    const r = roll(b.rng, de.dano);
    log(b, c, 'dano', () => `Dano de ${de.tipo} ${de.dano}: ${r.total}.`);
    partes.push({ valor: r.total, tipo: de.tipo });
  }
  const estavaDePe = podeLutar(alvo);
  const info = {};
  const dano = causarDano(b, alvo, partes, { fonte: c, ataque: a, info });
  SP.onHit(K, b, c, alvo, a, { critico, dano, natural: d, anuladoPorRD: info.anuladoPorRD });
  return { acertou: true, critico, dano, derrubou: estavaDePe && !podeLutar(alvo) };
}

/** Escolhe o valor de Ataque Poderoso que maximiza o dano esperado do golpe (3.0: 1 por 1). */
function ataquePoderoso(b, c, alvo, a) {
  if (!talento(c, 'ataque poderoso') || !isMelee(a) || isZero(a.dano)) return 0;
  const ca = caContra(b, alvo, c, a);
  const base = a.bonus + modsDeAtaque(b, c, alvo, a).total;
  const media = average(a.dano);
  let melhor = 0;
  let valor = pAcerto(base, ca) * media;
  for (let x = 1; x <= Math.max(0, c.bba); x++) {
    const v = pAcerto(base - x, ca) * (media + x);
    if (v > valor + 1e-9) { valor = v; melhor = x; }
  }
  return melhor;
}

const pAcerto = (bonus, ca) => Math.min(0.95, Math.max(0.05, (21 - (ca - bonus)) / 20));

/**
 * Sequência de golpes (ataque total ou só um). Se o alvo cai, os golpes seguintes vão para outro
 * inimigo ao alcance; Trespassar dá um golpe extra ao derrubar (uma vez por rodada; Maior, sem limite).
 */
function sequencia(b, c, alvoInicial, golpes, opts = {}) {
  let alvo = alvoInicial;
  const acertos = new Map();
  let trespassou = false;
  c.alvoEsquiva = alvoInicial.uid;
  SP.beforeAttacks(K, b, c, alvoInicial, golpes);
  const fila = [...golpes];
  const primeiroMelee = golpes.find(isMelee);
  const poderosoDaRodada = opts.poderoso ?? (primeiroMelee ? ataquePoderoso(b, c, alvoInicial, primeiroMelee) : 0);
  while (fila.length) {
    const a = fila.shift();
    if (!alvoValido(alvo) || !ataqueAlcanca(c, alvo, a)) {
      alvo = inimigos(b, c).filter(alvoValido).filter(x => ataqueAlcanca(c, x, a)).sort((x, y) => gap(c, x) - gap(c, y))[0];
      if (!alvo) break;
    }
    if (!podeLutar(c) || c.agarradoPor || c.engolidoPor) break;
    const poderoso = isMelee(a) && !isZero(a.dano) ? poderosoDaRodada : 0;
    const r = golpe(b, c, alvo, a, { ...opts, poderoso });
    if (r.acertou) {
      const lista = acertos.get(alvo.uid) || [];
      lista.push(a.nome);
      acertos.set(alvo.uid, lista);
    }
    if (r.derrubou && isMelee(a)) {
      const maior = talento(c, 'trespassar maior');
      if (maior || (talento(c, 'trespassar') && !trespassou)) {
        const outro = inimigos(b, c).filter(alvoValido).find(x => ataqueAlcanca(c, x, a));
        if (outro) {
          trespassou = true;
          log(b, c, 'trespassar', `${c.nome} trespassa e ataca ${outro.nome}.`);
          fila.unshift({ ...a });
          alvo = outro;
        }
      }
    }
  }
  SP.afterAttacks(K, b, c, acertos);
}

// ---------------------------------------------------------------------------------------------
// áreas na distância abstrata (TASK_006 §5.6)

/**
 * Lê o formato da área: { forma: cone | linha | raio | cubo, tamanho, copias, noConjurador }.
 * O texto do catálogo é livre ("esfera de 6 m de raio", "cone de 15 m", "linha 1,5 m × 60 m").
 */
export function parseArea(area, tamanho = null, { noConjurador = false, nivel = 1 } = {}) {
  const t = loose(area || '');
  const nums = [...t.matchAll(/(\d+(?:,\d+)?)\s*m\b/g)].map(m => Number(m[1].replace(',', '.')));
  let forma = 'raio';
  if (/cone/.test(t)) forma = 'cone';
  else if (/semicirculo/.test(t)) forma = 'semicirculo';
  else if (/linha|muralha/.test(t)) forma = 'linha';
  else if (/cubo|quadrado|sob o corpo/.test(t)) forma = 'cubo';
  let medida = tamanho;
  if (medida == null) {
    const maior = nums.length ? Math.max(...nums) : null;
    if (forma === 'linha') medida = maior && maior > 1.5 ? maior : 30; // "linha de 1,5 m de largura": só a largura
    else if (forma === 'cubo') medida = maior || 3;
    else medida = nums[0] || 3;
  }
  let copias = /quatro/.test(t) ? 4 : /dois|duas/.test(t) ? 2 : 1;
  if (/por nivel/.test(t)) copias *= Math.max(1, nivel); // "dois cubos de 3 m por nível" (Tempestade de Fogo)
  return { forma, tamanho: medida, copias, noConjurador: noConjurador || /centrad[oa] nele/.test(t) || forma !== 'raio' };
}

/** Quantos quadrados de 1,5 m a área cobre, e quantos "pesos" de criatura cabem (30% de ocupação). */
function capacidade(area) {
  const s = area.tamanho;
  let quadrados;
  if (area.forma === 'cone') quadrados = (Math.PI * s * s) / 8 / 2.25;
  else if (area.forma === 'semicirculo') quadrados = (Math.PI * s * s) / 2 / 2.25;
  else if (area.forma === 'linha') quadrados = s / 1.5;
  else if (area.forma === 'cubo') quadrados = (s / 1.5) ** 2;
  else quadrados = (Math.PI * s * s) / 2.25;
  return Math.max(1, quadrados * 0.3 * area.copias);
}

const pesoTamanho = c => Math.max(1, Math.round(((c.espaco || 1.5) / 1.5) ** 2));

/**
 * Alvos de uma área: o alvo principal e os aliados dele que estiverem na área, até a capacidade.
 * Cone, linha e cubo saem do conjurador; raio é centrado no alvo (ou no conjurador).
 */
function alvosNaArea(b, c, area, principal) {
  const origem = area.noConjurador ? c : principal;
  const lista = inimigos(b, c)
    .filter(x => x.estado !== 'morto' && !x.fugindo && !x.engolidoPor && !x.engolfadoPor)
    .filter(x => gap(origem, x) <= area.tamanho + 1e-9)
    .sort((x, y) => (x === principal ? -1 : y === principal ? 1 : gap(principal, x) - gap(principal, y)));
  const cap = capacidade(area);
  const alvos = [];
  let usado = 0;
  for (const x of lista) {
    const p = pesoTamanho(x);
    if (alvos.length && usado + p > cap) continue;
    alvos.push(x);
    usado += p;
  }
  return alvos;
}

// ---------------------------------------------------------------------------------------------
// efeitos com teste (sopro, magias, auras…) — usados também pelos especiais

/** Categoria de imunidade de uma condição causada por um efeito (paralisia do carniçal, Sono…). */
const categoriaDaCondicao = (cond, categoria = null) => categoria || (MEDO[cond] ? 'medo' : cond === 'paralisado' ? 'paralisia' : null);

/**
 * O efeito não pode afetar este alvo, antes mesmo de rolar o teste? Devolve o motivo ou null.
 * `afeta` restringe o efeito inteiro; constructos e mortos-vivos são imunes a tudo o que pede
 * Fortitude (3.0); um efeito que é só condição (ou só veneno) não afeta quem é imune a ela.
 */
function efeitoNaoAfeta(alvo, ef, categoria = null) {
  if (ef.afeta && !atende(alvo, ef.afeta)) return 'não atende à restrição';
  if (ef.resistencia === 'fort' && alvo.imuneFortitude) return 'imune a efeitos de Fortitude';
  const danoso = Boolean(ef.dano || ef.dano_extra?.length || ef.efeitos_por_dv);
  if (!danoso && ef.condicao && imuneACondicao(alvo, ef.condicao, categoriaDaCondicao(ef.condicao, categoria))) return `imune (${imuneACondicao(alvo, ef.condicao, categoriaDaCondicao(ef.condicao, categoria))})`;
  if (!danoso && !ef.condicao && ef.veneno && alvo.imunidades.includes('veneno')) return 'imune a veneno';
  return null;
}

/** Duração que depende dos PV do alvo (Palavra de Poder: Atordoar): { "até 50": "4d4 rodadas", … }. */
function duracaoPorPv(tabela, pv) {
  for (const [faixa, duracao] of Object.entries(tabela)) {
    const n = [...loose(faixa).matchAll(/\d+/g)].map(Number);
    const [min, max] = n.length === 1 ? [-Infinity, n[0]] : [n[0], n[1]];
    if (pv >= min && pv <= max) return duracao;
  }
  return null;
}

const fmtFator = f => ({ 0.5: 'metade', 0.25: 'um quarto', 2: 'o dobro' })[f] || String(f).replace('.', ',');

/**
 * Aplica um efeito com teste de resistência a um alvo: dano (energia ou físico), metade se passar,
 * evasão, condição, veneno. `efeito`: { dano, tipo_energia, dano_extra, resistencia, cd,
 * metade_se_passar, condicao, duracao, condicao_afeta, dano_por_tendencia, efeitos_por_dv }.
 * Devolve { passou } (null sem teste; `naoAfeta` quando o alvo nem chega a testar).
 */
function efeitoComTeste(b, c, alvo, ef, { rotulo = '', ignoraRD = true, categoria = null, ataque = null } = {}) {
  if (alvo.estado === 'morto') return { passou: null, naoAfeta: true };
  const motivo = efeitoNaoAfeta(alvo, ef, categoria);
  if (motivo) {
    log(b, alvo, 'imune', `${rotulo || 'O efeito'} não afeta ${alvo.nome} (${motivo}).`);
    return { passou: null, naoAfeta: true };
  }
  let passou = null;
  if (ef.resistencia && ef.cd != null) {
    passou = teste(b, alvo, ef.resistencia, ef.cd, { rotulo, medo: Boolean(ef.condicao && MEDO[ef.condicao]) }).passou;
  }
  // dano, com dano por tendência e metade/evasão
  if (ef.dano || ef.dano_extra) {
    let fator = 1;
    if (ef.dano_por_tendencia) {
      const eixo = ef.dano_por_tendencia.eixo;
      const letra = eixos(alvo.tendencia)[eixo];
      fator = { total: 1, metade: 0.5, nenhum: 0 }[ef.dano_por_tendencia[letra] || 'total'];
    }
    if (passou === true) {
      // evasão (3.0): só em efeito de Reflexos que dá metade; passar anula o dano
      if (ef.resistencia === 'ref' && ef.metade_se_passar && SP.temEvasao(K, alvo)) fator = 0;
      else if (ef.metade_se_passar) fator *= 0.5;
      else fator = 0;
    } else if (passou === false && ef.resistencia === 'ref' && ef.metade_se_passar && SP.temEvasaoAprimorada(K, alvo)) fator *= 0.5;
    if (fator > 0) {
      const partes = [];
      const tipos = Array.isArray(ef.tipo_energia) ? ef.tipo_energia : ef.tipo_energia ? [ef.tipo_energia] : ['fisico'];
      if (ef.dano) {
        const r = roll(b.rng, ef.dano);
        const valor = Math.floor(r.total * fator);
        if (tipos.length > 1) {
          const parte = Math.floor(valor / tipos.length);
          tipos.forEach((t, i) => partes.push({ valor: i === 0 ? valor - parte * (tipos.length - 1) : parte, tipo: t, passou }));
        } else partes.push({ valor, tipo: tipos[0], passou });
        const fixo = parseDice(ef.dano).n === 0;
        log(b, c, 'dano', () => `${rotulo || 'Efeito'} em ${alvo.nome}: ${fixo ? r.total : `${ef.dano} = ${r.total}`}${fator !== 1 ? ` (${fmtFator(fator)}: ${valor})` : ''}${ef.tipo_energia ? ` de ${tipos.join(' e ')}` : ''}.`);
      }
      for (const de of ef.dano_extra || []) {
        const r = roll(b.rng, de.dano);
        partes.push({ valor: Math.floor(r.total * fator), tipo: de.tipo, passou });
      }
      causarDano(b, alvo, partes, { fonte: c, ignoraRD, ataque });
    }
  }
  // condição (só em quem atende a condicao_afeta)
  if (ef.condicao && passou !== true && (!ef.condicao_afeta || atende(alvo, ef.condicao_afeta)) && alvo.estado !== 'morto') {
    const duracao = ef.duracao_por_pv ? duracaoPorPv(ef.duracao_por_pv, alvo.pv) || ef.duracao : ef.duracao;
    const rodadas = parseDuracao(duracao, b.rng);
    const ficou = aplicarCondicao(b, alvo, ef.condicao, rodadas, { fonte: c, categoria: categoriaDaCondicao(ef.condicao, categoria) });
    if (ficou && ficou !== 'morto') anunciarCondicao(b, alvo, ficou, rodadas, rotulo);
  }
  // veneno (sopro do golem): passar no teste inicial não livra do secundário (3.0)
  if (ef.veneno && alvo.estado !== 'morto') SP.envenenar(K, b, c, alvo, { ...ef.veneno, resistencia: 'fort', cd: ef.cd, jaFalhou: passou === false, jaPassou: passou === true, nome: rotulo });
  // efeitos por DV (Palavra Sagrada, Blasfêmia): cumulativos, sem teste. "Morto" não é efeito de morte:
  // mata os vivos e destrói os mortos-vivos (SRD); o constructo, que não é vivo, fica de fora
  for (const p of ef.efeitos_por_dv || []) {
    if (alvo.estado === 'morto') break;
    if (p.dv_max != null && alvo.dv > p.dv_max) continue;
    if (p.condicao) {
      const rodadas = parseDuracao(p.duracao, b.rng);
      const ficou = aplicarCondicao(b, alvo, p.condicao, rodadas, { fonte: c, categoria: categoriaDaCondicao(p.condicao), semImunidadeAMorte: alvo.tipo !== 'Constructo' });
      if (ficou && ficou !== 'morto') anunciarCondicao(b, alvo, ficou, rodadas, rotulo);
    }
    if (p.dano_atributo) {
      const rodadas = p.dano_atributo.duracao ? parseDuracao(p.dano_atributo.duracao, b.rng) : null;
      SP.danoDeAtributo(K, b, alvo, p.dano_atributo.atributo, roll(b.rng, p.dano_atributo.dano).total, c, rotulo, rodadas);
    }
  }
  return { passou };
}

/** Resistência à magia (3.0): d20 + nível de conjurador ≥ RM. Só contra magias e SM. */
function venceRM(b, c, alvo, nivelConjurador, natureza) {
  const rmBuff = alvo.buffs.reduce((m, bf) => Math.max(m, bf.bonus?.rm && eixos(c.tendencia).moral === 'M' ? bf.bonus.rm : 0), 0);
  const rm = Math.max(alvo.rm || 0, rmBuff);
  if (!rm || (natureza !== 'SM' && natureza !== 'magia')) return true;
  const d = b.rng.die(20);
  const ok = d + nivelConjurador >= rm;
  log(b, alvo, 'rm', `Resistência à magia de ${alvo.nome} (${rm}): ${d} + ${nivelConjurador} = ${d + nivelConjurador}, ${ok ? 'a magia passa' : 'a magia é barrada'}.`);
  return ok;
}

// ---------------------------------------------------------------------------------------------
// IA

/** Dano esperado de uma sequência de golpes contra o alvo, descontando a RD que a arma não vence. */
const esperado = (b, c, alvo, golpes) =>
  golpes.reduce((s, a) => {
    if (isZero(a.dano)) return s + 0.5;
    const rd = alvo.rd && !venceRD(c, a, alvo.rd) ? alvo.rd.valor : 0;
    const dano = Math.max(0, average(a.dano) - rd) + (a.dano_extra || []).reduce((t, d) => t + (alvo.imunidades.includes(d.tipo) ? 0 : average(d.dano)), 0);
    return s + pAcerto(a.bonus + modsDeAtaque(b, c, alvo, a).total, caContra(b, alvo, c, a)) * dano;
  }, 0);

function escolherAlvo(b, c) {
  let pool = inimigos(b, c).filter(alvoValido);
  if (!pool.length) return null;
  const perto = (x, y) => gap(c, x) - gap(c, y) || x.pv + x.ca.total - (y.pv + y.ca.total) || x.uid.localeCompare(y.uid);
  if (c.atributos.int != null && c.atributos.int <= 2) return [...pool].sort(perto)[0];
  if (/conjurador/.test(loose(c.tatica))) {
    const conj = pool.filter(x => x.magias);
    if (conj.length) pool = conj;
  }
  const melees = [...c.ataqueTotal, ...c.ataques].filter(isMelee);
  const engajados = pool.filter(x => melees.some(a => ataqueAlcanca(c, x, a)));
  if (engajados.length) return engajados.sort((x, y) => x.pv + x.ca.total - (y.pv + y.ca.total) || perto(x, y))[0];
  return [...pool].sort(perto)[0];
}

const podeFazerAtaqueTotal = c => !hasCond(c, 'lento') && !hasCond(c, 'cambaleante');

function acaoArmada(b, c, alvo) {
  const melee = c.ataqueTotal.filter(isMelee);
  const umMelee = c.ataques.find(isMelee);
  const rangedTotal = (c.ataqueTotalDistancia || c.ataqueTotal.filter(isRanged)).filter(a => ataqueAlcanca(c, alvo, a));
  const umRanged = c.ataques.filter(isRanged).filter(a => ataqueAlcanca(c, alvo, a))[0];
  const opcoes = [];
  const engajado = melee.some(a => ataqueAlcanca(c, alvo, a)) || (umMelee && ataqueAlcanca(c, alvo, umMelee));
  if (engajado) {
    const seq = podeFazerAtaqueTotal(c) ? melee.filter(a => ataqueAlcanca(c, alvo, a)) : [umMelee].filter(Boolean);
    if (seq.length && somaBuff(c, 'acoes_extras') > 0) seq.push({ ...seq[0] });
    if (seq.length) opcoes.push({ tipo: 'ataque', alvo, golpes: seq, ev: esperado(b, c, alvo, seq) });
  }
  if (rangedTotal.length || umRanged) {
    const seq = podeFazerAtaqueTotal(c) && rangedTotal.length ? rangedTotal : [umRanged].filter(Boolean);
    if (seq.length) opcoes.push({ tipo: 'ataque', alvo, golpes: seq, ev: esperado(b, c, alvo, seq) * (engajado ? 0.9 : 1) });
  }
  if (!engajado && (umMelee || melee.length)) {
    const golpeUnico = umMelee || melee[0];
    const alc = Math.max(1.5, alcanceDe(c, golpeUnico));
    const falta = gap(c, alvo) - alc;
    const v = velocidade(c);
    if (v > 0 && falta <= v) opcoes.push({ tipo: 'mover-atacar', alvo, golpes: [golpeUnico], mover: falta, ev: esperado(b, c, alvo, [golpeUnico]) });
    else if (v > 0 && falta <= 2 * v && !hasCond(c, 'enredado') && !hasCond(c, 'fatigado') && !hasCond(c, 'exausto')) {
      const bote = SP.temBote(K, c) && podeFazerAtaqueTotal(c);
      const golpes = bote ? melee : [golpeUnico];
      opcoes.push({ tipo: 'investida', alvo, golpes, mover: falta, ev: esperado(b, c, alvo, golpes) + 0.1 });
    } else if (v > 0) opcoes.push({ tipo: 'mover', alvo, mover: Math.min(falta, 2 * v), ev: 0.01 });
  }
  return opcoes;
}

function decidir(b, c) {
  const alvo = escolherAlvo(b, c);
  const opcoes = [];
  opcoes.push(...SP.options(K, b, c, alvo)); // curas, sopro, magias, engolfar, esmagar, inspirar…
  if (alvo) opcoes.push(...acaoArmada(b, c, alvo));
  // só ataca à distância e o alvo está longe demais: chega até o alcance da melhor arma
  if (!opcoes.length && alvo && velocidade(c) > 0) {
    const alcances = [...c.ataques, ...c.ataqueTotal].filter(isRanged).map(a => Math.min(a.alcance_m ?? Infinity, faixaDoNome(a.nome).max));
    const ate = alcances.length ? Math.max(...alcances) : 1.5;
    const falta = gap(c, alvo) - ate;
    if (falta > 0) opcoes.push({ tipo: 'mover', alvo, mover: Math.min(falta, 2 * velocidade(c)), ev: 0.01 });
  }
  if (!opcoes.length) return null;
  opcoes.sort((x, y) => (y.prioridade || 0) - (x.prioridade || 0) || y.ev - x.ev);
  return opcoes[0];
}

function executar(b, c, acao) {
  const texto = alvo => (alvo ? ` ${alvo.nome}` : '');
  switch (acao.tipo) {
    case 'ataque':
      SP.onAttackAction(K, b, c);
      sequencia(b, c, acao.alvo, acao.golpes);
      break;
    case 'mover-atacar': {
      const m = mover(c, acao.alvo, Math.max(1.5, alcanceDe(c, acao.golpes[0])), velocidade(c));
      if (m > 0) log(b, c, 'movimento', `${c.nome} avança ${fmtM(m)} até${texto(acao.alvo)}.`);
      SP.onAttackAction(K, b, c);
      sequencia(b, c, acao.alvo, acao.golpes);
      break;
    }
    case 'investida': {
      const m = mover(c, acao.alvo, Math.max(1.5, alcanceDe(c, acao.golpes[0])), 2 * velocidade(c));
      log(b, c, 'movimento', `${c.nome} faz uma investida de ${fmtM(m)} contra${texto(acao.alvo)} (+2 no ataque, −2 na CA)${acao.golpes.length > 1 ? ' e dá o bote (ataque total)' : ''}.`);
      c.investidaAte = expiraEm(b, 1, c, c);
      SP.onAttackAction(K, b, c);
      sequencia(b, c, acao.alvo, acao.golpes, { investida: true });
      break;
    }
    case 'mover': {
      const m = mover(c, acao.alvo, 0, acao.mover);
      if (m > 0) log(b, c, 'movimento', `${c.nome} corre ${fmtM(m)} em direção a${texto(acao.alvo)}.`);
      break;
    }
    default:
      SP.execute(K, b, c, acao);
  }
}

const fmtM = m => `${Number(m.toFixed(1)).toLocaleString('pt-BR')} m`;

// ---------------------------------------------------------------------------------------------
// turno

function inicioDoTurno(b, c) {
  c.resistUsada = {};
  if (c.estado === 'morto') return;
  // regeneração (3.0): cura dano por contusão; cura acelerada: PV
  if (c.regeneracao && c.contusao > 0) {
    c.contusao = Math.max(0, c.contusao - c.regeneracao.valor);
    atualizarEstado(b, c);
  }
  if (c.curaAcelerada && c.pv < c.pvMax && c.pv > -10) curar(b, c, c.curaAcelerada);
  // morrendo: 10% de estabilizar, senão perde 1 PV
  if (c.estado === 'morrendo') {
    if (b.rng.chance(10)) {
      c.estado = 'estavel';
      log(b, c, 'estado', `${c.nome} se estabiliza (${num(c.pv)} PV).`);
    } else {
      c.pv -= 1;
      log(b, c, 'estado', `${c.nome} perde 1 PV sangrando (${num(c.pv)}).`);
      atualizarEstado(b, c);
    }
  }
  SP.startOfTurn(K, b, c);
}

function motivoSemAcao(c) {
  if (c.estado !== 'ativo') return { morrendo: 'morrendo', estavel: 'estável', incapacitado: 'incapacitado', inconsciente: 'inconsciente', morto: 'morto' }[c.estado];
  const n = [...FORA_DE_COMBATE, ...SEM_ACAO].find(x => c.cond[x]);
  return n || null;
}

/** Avança um turno (o próximo combatente na ordem de iniciativa). Devolve os eventos do turno. */
export function nextTurn(b) {
  if (b.fim) return [];
  const inicio = b.eventos.length;
  b.turno++;
  if (b.turno >= b.ordem.length || b.rodada === 0) {
    b.turno = 0;
    b.rodada++;
    if (b.rodada > b.limiteRodadas) {
      encerrar(b, null, `limite de ${b.limiteRodadas} rodada${b.limiteRodadas === 1 ? '' : 's'}`);
      return b.eventos.slice(inicio);
    }
    log(b, null, 'rodada', `Rodada ${b.rodada}.`);
  }
  const c = b.get(b.ordem[b.turno]);
  // durações acabam no turno de quem causou o efeito: confere todos a cada turno
  for (const x of b.combatentes) expirarCondicoes(b, x);
  inicioDoTurno(b, c);
  if (c.estado !== 'morto' && c.fugindo) {
    // quem foge fica fora da luta até o medo passar
  } else if (c.estado !== 'morto') {
    const motivo = motivoSemAcao(c);
    if (motivo) log(b, c, 'sem-acao', `${c.nome} não age (${motivo}).`);
    else if (!SP.forcedTurn(K, b, c)) {
      // engolido, agarrado ou agarrando: o turno já foi resolvido pelos especiais
      SP.freeActions(K, b, c); // fúria…
      const acao = decidir(b, c);
      if (acao) executar(b, c, acao);
      else log(b, c, 'sem-acao', `${c.nome} não tem o que fazer.`);
    }
  }
  c.agiu = true;
  verificarFim(b);
  return b.eventos.slice(inicio);
}

/** Avança até o fim da rodada (a atual, ou a próxima se a atual já terminou). */
export function nextRound(b) {
  const inicio = b.eventos.length;
  do nextTurn(b);
  while (!b.fim && b.turno !== b.ordem.length - 1);
  return b.eventos.slice(inicio);
}

/** Roda a luta até o fim e devolve o resultado. */
export function runBattle(b) {
  let guarda = 0;
  while (!b.fim && guarda++ < 100000) nextTurn(b);
  return b.fim;
}

function verificarFim(b) {
  if (b.fim) return;
  const lutaA = b.combatentes.some(c => c.lado === 'A' && podeLutar(c));
  const lutaB = b.combatentes.some(c => c.lado === 'B' && podeLutar(c));
  if (lutaA && lutaB) return;
  encerrar(b, lutaA ? 'A' : lutaB ? 'B' : null, lutaA || lutaB ? 'o outro lado não tem mais quem lute' : 'ninguém ficou de pé');
}

function encerrar(b, vencedor, motivo) {
  b.fim = {
    vencedor,
    motivo,
    rodadas: Math.min(b.rodada, b.limiteRodadas),
    semente: b.semente,
    combatentes: b.combatentes.map(c => ({
      uid: c.uid,
      nome: c.nome,
      lado: c.lado,
      pv: c.pv,
      pvMax: c.pvMax,
      contusao: c.contusao,
      estado: c.estado === 'ativo' && c.fugindo ? 'fugiu' : c.estado, // quem caiu enquanto fugia conta como caído
      condicoes: Object.keys(c.cond),
      ...c.stats,
    })),
  };
  const nomes = lado => b.combatentes.filter(c => c.lado === lado).map(c => c.nome).join(', ');
  log(b, null, 'fim', vencedor ? `Fim da luta: vence o lado ${vencedor} (${nomes(vencedor)}), em ${b.fim.rodadas} rodada${b.fim.rodadas === 1 ? '' : 's'}.` : `Fim da luta: empate (${motivo}).`);
}

// ---------------------------------------------------------------------------------------------
// simulação em lote

/**
 * Roda a mesma luta `vezes` vezes com sementes diferentes (semente + i), sem texto de registro.
 * Devolve as porcentagens de vitória, a média de rodadas, o PV médio restante do vencedor e
 * quantas vezes cada combatente caiu.
 */
export function simulate({ ladoA, ladoB, distancia = 9, limiteRodadas = 50 }, { vezes = 100, semente = 1 } = {}) {
  const base = createRng(semente).seed;
  const res = { vezes, A: 0, B: 0, empate: 0, rodadas: 0, pvVencedor: 0, quedas: {} };
  for (let i = 0; i < vezes; i++) {
    const b = createBattle({ ladoA, ladoB, semente: (base + i) >>> 0, distancia, limiteRodadas, registrar: false });
    const fim = runBattle(b);
    res[fim.vencedor || 'empate']++;
    res.rodadas += fim.rodadas;
    if (fim.vencedor) {
      const lado = fim.combatentes.filter(c => c.lado === fim.vencedor);
      res.pvVencedor += lado.reduce((s, c) => s + Math.max(0, c.pv) / c.pvMax, 0) / lado.length;
    }
    for (const c of fim.combatentes) if (c.caiuNaRodada != null) res.quedas[c.uid] = (res.quedas[c.uid] || 0) + 1;
  }
  const vitorias = res.A + res.B;
  return {
    vezes,
    vitoriasA: res.A / vezes,
    vitoriasB: res.B / vezes,
    empates: res.empate / vezes,
    mediaRodadas: res.rodadas / vezes,
    pvRestanteVencedor: vitorias ? res.pvVencedor / vitorias : 0,
    quedas: res.quedas,
  };
}

// ---------------------------------------------------------------------------------------------
// núcleo exposto aos especiais (combat30-specials.js) e aos testes

const K = {
  log, anunciarCondicao, roll: (b, expr, o) => roll(b.rng, expr, o), average, parseDice, isZero, parseDuracao, parseArea,
  gap, mover, velocidade, inimigos, aliados, alvosNaArea, alvoValido, podeLutar, atende, eixos,
  inicioDoTurno, venceRD, furaRegeneracao, teste, resistido, agarrarDe, aplicarCondicao, imuneACondicao, efeitoNaoAfeta, categoriaDaCondicao, removerCondicao, causarDano, curar, morrer, atualizarEstado,
  efeitoComTeste, venceRM, golpe, sequencia, caContra, modsDeAtaque, modsDeDano, deltaMod, somaBuff, expiraEm, tick,
  soltarAgarrao, imuneCritico, semDestreza, esperado, pAcerto, isMelee, isRanged, isTouch, ataqueAlcanca, alcanceDe,
  hasCond, talento, sizeIdx, mod, sinal, num, MEDO, TIPOS_SEM_CRITICO,
};

/** Para os testes: o núcleo de regras (mesmas funções que os especiais usam). */
export const rules = K;
