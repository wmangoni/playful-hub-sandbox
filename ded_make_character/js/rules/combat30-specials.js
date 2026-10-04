/**
 * Habilidades especiais do simulador de combate (TASK_006 §5.6), pelo vocabulário de
 * tools/catalogo-combate.md: sopro, agarrar, engolir, veneno, presença aterradora, magia, aura…
 *
 * Este módulo não importa o núcleo: cada função recebe `K`, o conjunto de regras de combat30.js
 * (testes de resistência, dano, condições, áreas), e `b`, a luta. Assim o núcleo decide quando
 * chamar cada gancho, e aqui fica só o que cada efeito faz.
 *
 * `mecanica: null` e `efeito: "outro"` não são simulados: aparecem uma vez no registro.
 */
import { normalize as loose } from '../core/format.js';

// ---------------------------------------------------------------------------------------------
// especiais de um combatente

const todos = c => c._esp || [];
const comEfeito = (c, efeito) => todos(c).filter(e => e.m?.efeito === efeito);
const primeiro = (c, efeito) => comEfeito(c, efeito)[0] || null;

/** O especial dispara neste ataque? (id em `efeitos` do ataque, ou nome do ataque no `gatilho`) */
const disparaCom = (e, a) => (a.efeitos || []).includes(e.id) || (Array.isArray(e.m.gatilho) && e.m.gatilho.includes(a.nome));

/**
 * Usos: "3/dia" → 3; "à vontade", "1/rodada" → sem limite; "1/minuto" → sem limite, com
 * 10 rodadas de recarga; "1 (a bolsa inteira)" → 1. "gasta 1 uso de música de bardo" divide os
 * usos do inspirar coragem.
 */
function parseUsos(usos) {
  const t = loose(usos || '');
  if (!t || /vontade|\/rodada/.test(t)) return { n: Infinity, recarga: null };
  if (/\/minuto/.test(t)) return { n: Infinity, recarga: 10 };
  if (/musica de bardo/.test(t)) return { n: null, compartilha: 'inspirar-coragem' };
  const m = /^(\d+)/.exec(t);
  return { n: m ? Number(m[1]) : Infinity, recarga: null };
}

function usosRestantes(c, e) {
  const u = c.usos[e.id];
  if (u?.compartilha) {
    const dono = primeiro(c, 'inspirar-coragem');
    return dono ? c.usos[dono.id].n : 0;
  }
  return u ? u.n : Infinity;
}

function gastarUso(K, b, c, e) {
  const u = c.usos[e.id];
  if (u?.compartilha) {
    const dono = primeiro(c, 'inspirar-coragem');
    if (dono) c.usos[dono.id].n--;
    return;
  }
  if (u && u.n !== Infinity) u.n--;
  if (u?.recarga) c.recarga[e.id] = K.expiraEm(b, u.recarga, c, c);
}

const disponivel = (b, K, c, e) => usosRestantes(c, e) > 0 && (c.recarga[e.id] == null || c.recarga[e.id] <= K.tick(b));

// ---------------------------------------------------------------------------------------------
// início da luta

export function onBattleStart(K, b, c) {
  c._esp = c.especiais.map(e => ({ id: e.id, nome: e.nome, natureza: e.natureza, m: e.mecanica, grupo: e.grupo }));
  for (const e of c._esp) {
    if (!e.m) continue;
    const u = parseUsos(e.m.usos);
    c.usos[e.id] = u.compartilha ? { compartilha: u.compartilha } : { n: u.n, recarga: u.recarga };
    if (e.m.efeito === 'cura-pelas-maos') c.usos[e.id] = { n: e.m.pv_por_dia, pool: true };
  }
  // cooldown em tiques absolutos (a recarga de 10 rodadas vira um tique futuro)
  // ataques especiais sem mecânica, efeitos "outro" e magias sem mecânica; qualidades sem
  // mecânica (sentidos, traços de tipo) não são listadas
  const rotulo = e => (e.m?.tipo_energia && e.m.bonus && c.imunidades.includes(e.m.tipo_energia) ? `${e.nome} (a imunidade vale; o bônus de ${e.m.bonus.atributo === 'con' ? 'Constituição' : e.m.bonus.atributo} não)` : e.nome);
  const semSimular = [
    ...c._esp.filter(e => (!e.m && e.grupo === 'ataque') || e.m?.efeito === 'outro').map(rotulo),
    ...(c.magias?.lista || []).filter(s => !s.mecanica).map(s => `${s.nome} (magia)`),
  ];
  if (semSimular.length) K.log(b, c, 'nao-simulado', `${c.nome}: não simulado — ${semSimular.join(', ')}.`);
  // condição que a ficha já traz (Tork, Guerreiro Cego): avisa no começo da luta
  const iniciais = Object.keys(c.cond).filter(nome => c.cond[nome].expira === Infinity);
  if (iniciais.length) K.log(b, c, 'condicao', `${c.nome} começa a luta ${iniciais.join(' e ')} (condição da ficha, dura a luta toda).`);
}

// ---------------------------------------------------------------------------------------------
// modificadores pedidos pelo núcleo

export function attackMods(K, b, c) {
  const out = [];
  if (c._destruir) out.push([c._destruir.bonus_ataque, 'Destruir']);
  return out;
}

export function damageMods(K, b, c) {
  return c._destruir ? c._destruir.bonus_dano : 0;
}

export function onSwingEnd(K, b, c) {
  c._destruir = null;
}

/** Chance de o ataque errar: camuflagem do alvo (deslocamento) e magias que dão camuflagem. */
export function missChance(K, b, c, alvo) {
  let pct = 0;
  for (const e of comEfeito(alvo, 'camuflagem')) pct = Math.max(pct, e.m.chance_pct);
  pct = Math.max(pct, ...alvo.buffs.map(bf => bf.bonus?.camuflagem_pct || 0));
  return pct;
}

/** Bônus nos testes de resistência: contra medo (inspirar coragem, aura de coragem de um aliado). */
export function saveMods(K, b, c, tipo, { medo }) {
  if (!medo) return 0;
  let v = K.somaBuff(c, 'contra_medo');
  let aura = 0;
  for (const x of K.aliados(b, c)) {
    if (!K.podeLutar(x)) continue;
    for (const e of comEfeito(x, 'aura')) if (e.m.bonus?.contra_medo && K.gap(x, c) <= e.m.raio_m) aura = Math.max(aura, e.m.bonus.contra_medo);
  }
  return v + aura;
}

export const temEvasao = (K, c) => c.armaduraLeve !== false && comEfeito(c, 'evasao').length > 0;
export const temEvasaoAprimorada = (K, c) => c.armaduraLeve !== false && comEfeito(c, 'evasao').some(e => e.m.aprimorada);
export const temBote = (K, c) => comEfeito(c, 'bote').length > 0;

// ---------------------------------------------------------------------------------------------
// dano extra no golpe: ataque furtivo

export function extraDamage(K, b, c, alvo, a) {
  let extra = 0;
  for (const e of comEfeito(c, 'ataque-furtivo')) {
    if (K.imuneCritico(alvo) || !K.semDestreza(b, alvo, c)) continue;
    if (K.isRanged(a) && K.gap(c, alvo) > 9) continue; // à distância só até 9 m (3.0)
    const r = K.roll(b, e.m.dano);
    extra += r.total;
    K.log(b, c, 'dano', `Ataque furtivo ${e.m.dano}: +${r.total} (${alvo.nome} sem a Destreza na CA).`);
  }
  return extra;
}

// ---------------------------------------------------------------------------------------------
// antes e depois dos golpes

/** Destruir (o Mal): usado no primeiro golpe contra um alvo válido, se for corpo a corpo (3.0: "one normal melee attack"). */
export function beforeAttacks(K, b, c, alvo, golpes = []) {
  if (!golpes.length || !K.isMelee(golpes[0])) return;
  for (const e of comEfeito(c, 'destruir')) {
    if (!disponivel(b, K, c, e) || !alvoDeDestruir(K, alvo, e.m.alvo)) continue;
    gastarUso(K, b, c, e);
    c._destruir = { bonus_ataque: e.m.bonus_ataque, bonus_dano: e.m.bonus_dano };
    K.log(b, c, 'especial', `${c.nome} usa ${e.nome} contra ${alvo.nome} (+${e.m.bonus_ataque} no ataque, +${e.m.bonus_dano} no dano).`);
    return;
  }
}

function alvoDeDestruir(K, alvo, tipo) {
  const e = K.eixos(alvo.tendencia);
  return { maligno: e.moral === 'M', bom: e.moral === 'B', leal: e.etico === 'L', caótico: e.etico === 'C', qualquer: true }[tipo] ?? false;
}

/** Todos os ataques de `requer` (com repetição) estão entre os acertos? */
function acertouTodos(requer, nomes) {
  const sobra = [...nomes];
  return requer.every(n => {
    const i = sobra.indexOf(n);
    if (i < 0) return false;
    sobra.splice(i, 1);
    return true;
  });
}

/**
 * Depois da sequência de golpes: rasgar (todos os ataques exigidos acertaram o mesmo alvo) e
 * agarrar aprimorado que exige mais de um golpe (as duas pancadas do arbusto errante).
 */
export function afterAttacks(K, b, c, acertos) {
  // quem caiu no meio da sequência (a Retribuição do Paladino mata o atacante) não age mais
  if (!K.podeLutar(c)) return;
  for (const e of comEfeito(c, 'agarrar-aprimorado')) {
    if (!e.m.requer) continue;
    for (const [uid, nomes] of acertos) {
      const alvo = b.get(uid);
      if (alvo && alvo.estado !== 'morto' && acertouTodos(e.m.requer, nomes)) agarrarAprimorado(K, b, c, alvo, e);
    }
  }
  for (const e of comEfeito(c, 'rasgar')) {
    for (const [uid, nomes] of acertos) {
      const alvo = b.get(uid);
      if (!acertouTodos(e.m.requer, nomes) || !alvo || alvo.estado === 'morto') continue;
      const r = K.roll(b, e.m.dano);
      K.log(b, c, 'especial', `${c.nome} rasga ${alvo.nome}: ${e.m.dano} = ${r.total}.`);
      K.causarDano(b, alvo, [{ valor: r.total, tipo: 'fisico' }], { fonte: c, ataque: { nome: e.nome, natural: true, magico: null } });
    }
  }
}

/** Presença aterradora (3.0): ao atacar, inimigos com menos DV testam Vontade; quem passa fica imune. */
export function onAttackAction(K, b, c) {
  for (const e of comEfeito(c, 'presenca-aterradora')) {
    const m = e.m;
    for (const x of K.inimigos(b, c)) {
      if (!K.podeLutar(x) || x.imuneAPresenca.includes(c.uid)) continue;
      if (m.raio_m != null && K.gap(c, x) > m.raio_m) continue;
      const dvMax = m.afeta?.dv_max ?? c.dv - 1;
      if (x.dv > dvMax) continue;
      if (m.afeta && !K.atende(x, { ...m.afeta, dv_max: undefined })) continue;
      x.imuneAPresenca.push(c.uid); // um teste por luta: quem passa fica imune; quem falha já está com medo
      if (K.imuneACondicao(x, m.condicao, 'medo')) continue; // morto-vivo, imune a medo: nem testa
      const r = K.teste(b, x, m.resistencia, m.cd, { medo: true, rotulo: e.nome });
      if (r.passou) continue;
      const porDv = (m.efeitos_por_dv || []).find(p => p.dv_max == null || x.dv <= p.dv_max);
      const cond = porDv?.condicao || m.condicao;
      const duracao = porDv?.duracao || m.duracao;
      // "até sair da área": na distância abstrata ninguém sai da área (o raio do Tarrasque é a luta toda)
      const rodadas = /^ate sair/.test(loose(duracao || '')) ? Infinity : K.parseDuracao(duracao, b.rng);
      const ficou = K.aplicarCondicao(b, x, cond, rodadas, { fonte: c, categoria: 'medo' });
      if (ficou) K.anunciarCondicao(b, x, ficou, rodadas, `${e.nome} de ${c.nome}`);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// efeitos ao acertar

export function onHit(K, b, c, alvo, a, { critico, natural, anuladoPorRD = false }) {
  if (alvo.cond.confuso) alvo._revidar = c.uid; // confuso que é atacado ataca quem o atacou (3.0)
  const anulado = e => anuladoPorRD && ANULADOS_PELA_RD.includes(e.m.efeito);
  const perdidos = todos(c).filter(e => e.m && disparaCom(e, a) && anulado(e)).map(e => e.nome);
  if (perdidos.length) K.log(b, alvo, 'defesa', `A RD de ${alvo.nome} anula o golpe e, com ele, ${lista(perdidos)}.`);
  for (const e of todos(c)) {
    if (!e.m || !disparaCom(e, a) || alvo.estado === 'morto' || anulado(e)) continue;
    const m = e.m;
    switch (m.efeito) {
      case 'paralisia':
      case 'condicao-ao-acertar': {
        if (!K.podeLutar(alvo)) break;
        const cond = m.efeito === 'paralisia' ? 'paralisado' : m.condicao;
        const categoria = m.efeito === 'paralisia' ? 'paralisia' : K.MEDO[m.condicao] ? 'medo' : null;
        if (K.efeitoNaoAfeta(alvo, { resistencia: m.resistencia, condicao: cond, afeta: m.afeta }, categoria)) break;
        const r = K.teste(b, alvo, m.resistencia, m.cd, { rotulo: e.nome, medo: categoria === 'medo' });
        if (r.passou) break;
        const rodadas = K.parseDuracao(m.duracao, b.rng);
        const ficou = K.aplicarCondicao(b, alvo, cond, rodadas, { fonte: c, categoria });
        if (ficou) K.anunciarCondicao(b, alvo, ficou, rodadas, e.nome);
        break;
      }
      case 'veneno':
        envenenar(K, b, c, alvo, { inicial: m.inicial, secundario: m.secundario, resistencia: m.resistencia, cd: m.cd, nome: e.nome });
        break;
      case 'agarrar-aprimorado':
        // com "requer", depois da sequência; quem morreu com o golpe (Retribuição) não agarra
        if (!m.requer && K.podeLutar(c)) agarrarAprimorado(K, b, c, alvo, e);
        break;
      case 'queimar':
        pegarFogo(K, b, c, alvo, m, e.nome);
        break;
      case 'enredar':
        enredar(K, b, c, alvo, e);
        break;
      case 'dreno-energia':
        drenar(K, b, c, alvo, m.niveis, e.nome);
        break;
      case 'vorpal':
        if ((m.quando === 'critico-confirmado' && critico) || (m.quando === 'natural-20' && natural === 20)) {
          if (K.imuneCritico(alvo)) break;
          // morte instantânea só ameaça quem regenera se a arma causar dano normal a ele (SRD)
          if (alvo.regeneracao && !K.furaRegeneracao(alvo, { tipo: 'fisico', ataque: a })) {
            K.log(b, c, 'especial', `${e.nome}: a cabeça de ${alvo.nome} volta a se unir (regeneração).`);
            break;
          }
          K.log(b, c, 'especial', `${e.nome}: a lâmina decepa a cabeça de ${alvo.nome}!`);
          K.morrer(b, alvo, c, 'morto (decapitado)');
        }
        break;
      default:
        break;
    }
  }
  // quem acerta o elemental de fogo com arma natural também pode pegar fogo
  if (a.natural) {
    for (const e of comEfeito(alvo, 'queimar')) {
      const q = e.m.ao_ser_atingido;
      if (!q || c.estado === 'morto') continue;
      const r = K.roll(b, q.dano_fogo);
      K.log(b, c, 'especial', `${c.nome} se queima ao tocar ${alvo.nome}: ${q.dano_fogo} = ${r.total} de fogo.`);
      K.causarDano(b, c, [{ valor: r.total, tipo: 'fogo' }], { fonte: alvo });
      if (q.pega_fogo_se_falhar) pegarFogo(K, b, alvo, c, { ...e.m, resistencia: q.resistencia, cd: q.cd }, e.nome);
    }
  }
}

/** Efeitos do golpe que a RD anula quando absorve todo o dano (SRD: veneno de ferimento, atordoar…). */
const ANULADOS_PELA_RD = ['paralisia', 'condicao-ao-acertar', 'veneno', 'vorpal'];

const lista = nomes => (nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}` : nomes[0]);

function pegarFogo(K, b, fonte, alvo, m, nome) {
  if (alvo.estado === 'morto' || alvo.imunidades.includes('fogo')) return;
  const r = K.teste(b, alvo, m.resistencia || 'ref', m.cd, { rotulo: nome });
  if (r.passou) return;
  const rodadas = K.parseDuracao(m.duracao || '1d4 rodadas', b.rng);
  alvo.queimando = { dano: m.dano, tipo: Array.isArray(m.tipo_energia) ? m.tipo_energia[0] : m.tipo_energia || 'fogo', expira: K.expiraEm(b, rodadas, fonte, alvo), fonte: fonte.uid };
  K.anunciarCondicao(b, alvo, 'em chamas', rodadas, nome);
}

function drenar(K, b, c, alvo, niveis, nome) {
  if (alvo.imunidades.includes('dreno de energia')) return;
  alvo.niveisNegativos += niveis;
  alvo.pvMax = Math.max(1, alvo.pvMax - 5 * niveis);
  alvo.pv -= 5 * niveis;
  K.log(b, alvo, 'especial', `${alvo.nome} ganha ${niveis} nível(is) negativo(s) (${nome}): −1 por nível em ataques e testes, −5 PV cada.`);
  if (alvo.niveisNegativos >= alvo.dv) K.morrer(b, alvo, c, 'morto (drenado)');
  else K.atualizarEstado(b, alvo, c);
}

/** Veneno (3.0): Fortitude; se falhar, o dano inicial; 1 minuto (10 rodadas) depois, o secundário. */
export function envenenar(K, b, fonte, alvo, v) {
  if (alvo.estado === 'morto' || alvo.imunidades.includes('veneno') || alvo.imuneFortitude) return;
  const falhou = v.jaPassou ? false : v.jaFalhou || !K.teste(b, alvo, v.resistencia || 'fort', v.cd, { rotulo: v.nome || 'veneno' }).passou;
  if (falhou) efeitoDeVeneno(K, b, fonte, alvo, v.inicial, 'inicial');
  alvo.venenos.push({ expira: K.expiraEm(b, 10, alvo, alvo), cd: v.cd, secundario: v.secundario, fonte: fonte.uid, nome: v.nome || 'veneno' });
}

function efeitoDeVeneno(K, b, fonte, alvo, ef, fase) {
  if (!ef) return;
  if (ef.condicao === 'morto') {
    K.log(b, alvo, 'especial', `O veneno (${fase}) mata ${alvo.nome}.`);
    K.morrer(b, alvo, fonte, 'morto (veneno)');
    return;
  }
  if (ef.condicao) {
    const rodadas = K.parseDuracao(ef.duracao, b.rng);
    const ficou = K.aplicarCondicao(b, alvo, ef.condicao, rodadas, { fonte, categoria: null });
    if (ficou) K.anunciarCondicao(b, alvo, ficou, rodadas, `veneno, ${fase}`);
    return;
  }
  danoDeAtributo(K, b, alvo, ef.atributo, K.roll(b, ef.dano).total, fonte, `veneno (${fase})`);
}

const NOMES_ATRIBUTO = { for: 'Força', des: 'Destreza', con: 'Constituição', int: 'Inteligência', sab: 'Sabedoria', car: 'Carisma' };
const valorAtual = (c, attr) => c.atributos[attr] - c.danoAtributo[attr] + c.buffs.reduce((s, bf) => s + (bf.atributos?.[attr] || 0), 0);

/**
 * Dano de atributo: recalcula os bônus pela diferença de modificador. Força ou Destreza 0 deixam
 * indefeso (paralisado); Constituição 0 mata; Con perdida tira PV (1 por DV a cada ponto de mod.).
 * Com `rodadas`, é uma penalidade temporária (enfraquecimento da Blasfêmia, Raio do
 * Enfraquecimento), que não baixa o atributo de 1 e some quando acaba.
 */
export function danoDeAtributo(K, b, alvo, attr, valor, fonte = null, origem = '', rodadas = null) {
  const base = alvo.atributos[attr];
  if (base == null || valor <= 0 || alvo.estado === 'morto') return;
  if (alvo.imunidades.includes('dano de atributo')) {
    K.log(b, alvo, 'imune', `${alvo.nome} é imune a dano de atributo${origem ? ` (${origem})` : ''}.`);
    return;
  }
  if (rodadas != null) {
    const penalidade = Math.min(valor, Math.max(0, valorAtual(alvo, attr) - 1));
    if (!penalidade) return;
    alvo.buffs.push({ rotulo: origem ? `penalidade de ${NOMES_ATRIBUTO[attr]} (${origem})` : `penalidade de ${NOMES_ATRIBUTO[attr]}`, atributos: { [attr]: -penalidade }, expira: K.expiraEm(b, rodadas, fonte, alvo) });
    K.log(b, alvo, 'especial', `${alvo.nome}: −${penalidade} de ${NOMES_ATRIBUTO[attr]} por ${rodadas} rodada${rodadas === 1 ? '' : 's'}${origem ? ` (${origem})` : ''}.`);
    return;
  }
  const antes = K.deltaMod(alvo, attr);
  alvo.danoAtributo[attr] += valor;
  const depois = K.deltaMod(alvo, attr);
  const nomes = NOMES_ATRIBUTO;
  K.log(b, alvo, 'especial', `${alvo.nome} perde ${valor} de ${nomes[attr]}${origem ? ` (${origem})` : ''}: ${Math.max(0, base - alvo.danoAtributo[attr])}.`);
  if (attr === 'con' && depois < antes) {
    const perda = (antes - depois) * alvo.dv;
    alvo.pvMax = Math.max(1, alvo.pvMax - perda);
    alvo.pv -= perda;
  }
  if (base - alvo.danoAtributo[attr] <= 0) {
    if (attr === 'con') return K.morrer(b, alvo, fonte, 'morto (Constituição 0)');
    const cond = attr === 'for' || attr === 'des' ? 'paralisado' : 'inconsciente';
    K.aplicarCondicao(b, alvo, cond, Infinity, { fonte });
    K.anunciarCondicao(b, alvo, cond, Infinity, `${nomes[attr]} 0`);
  }
  K.atualizarEstado(b, alvo, fonte);
}

// ---------------------------------------------------------------------------------------------
// agarrar, engolir, engolfar, enredar

const tamanhoMaxPadrao = (K, c) => {
  const i = Math.max(0, K.sizeIdx(c.tamanho) - 1);
  return ['Mínimo', 'Minúsculo', 'Pequeno', 'Médio', 'Grande', 'Enorme', 'Imenso', 'Colossal'][i];
};

/** Agarrar aprimorado (3.0): acertou o ataque → teste resistido de agarrar, sem ação. */
function agarrarAprimorado(K, b, c, alvo, e) {
  if (c.agarrando || alvo.agarradoPor || !K.podeLutar(alvo) || !K.podeLutar(c)) return;
  const max = e.m.tamanho_max || tamanhoMaxPadrao(K, c);
  if (K.sizeIdx(alvo.tamanho) > K.sizeIdx(max)) return;
  const r = K.resistido(b, K.agarrarDe(c), K.agarrarDe(alvo));
  K.log(b, c, 'agarrar', `${c.nome} tenta agarrar ${alvo.nome} (${e.nome}): ${r.texto} — ${r.venceu ? 'agarra' : 'não consegue'}.`);
  if (!r.venceu) return;
  c.agarrando = alvo.uid;
  alvo.agarradoPor = c.uid;
  alvo.pos = c.pos;
}

/** Turno de quem está agarrando: engolir, ou teste de agarrar para causar dano (garras, constrição). */
function turnoAgarrando(K, b, c) {
  const alvo = b.get(c.agarrando);
  if (!alvo || alvo.estado === 'morto' || alvo.agarradoPor !== c.uid || !K.podeLutar(c)) {
    K.soltarAgarrao(b, c);
    return false;
  }
  // presa fora de combate: solta e vai atrás de outro
  if (!K.podeLutar(alvo) && K.inimigos(b, c).some(K.alvoValido)) {
    K.soltarAgarrao(b, c);
    return false;
  }
  const engolir = primeiro(c, 'engolir');
  if (engolir && K.sizeIdx(alvo.tamanho) <= K.sizeIdx(engolir.m.tamanho_max)) {
    const r = K.resistido(b, K.agarrarDe(c), K.agarrarDe(alvo));
    K.log(b, c, 'agarrar', `${c.nome} tenta engolir ${alvo.nome}: ${r.texto} — ${r.venceu ? 'engole' : 'não consegue'}.`);
    if (r.venceu) {
      K.soltarAgarrao(b, c);
      alvo.engolidoPor = c.uid;
      alvo.danoInterno = 0;
      alvo.pos = c.pos;
    }
    return true;
  }
  const r = K.resistido(b, K.agarrarDe(c), K.agarrarDe(alvo));
  K.log(b, c, 'agarrar', `${c.nome} aperta ${alvo.nome}: ${r.texto} — ${r.venceu ? 'vence' : 'perde'} o teste de agarrar.`);
  if (!r.venceu) return true;
  const partes = [];
  const garra = primeiro(c, 'agarrar-aprimorado');
  // o dano do ataque que agarrou (o catálogo pode trazê-lo pronto em dano_por_rodada; "0d0+0" = o agarrão não fere,
  // como o bote de Aspis, que só prende e deixa o dano para a constrição)
  const armaDaGarra = garra && [...c.ataqueTotal, ...c.ataques].find(a => (garra.m.requer || garra.m.gatilho || []).includes(a.nome));
  const danoGarra = garra?.m.dano_por_rodada != null
    ? (K.isZero(garra.m.dano_por_rodada) ? null : garra.m.dano_por_rodada)
    : (armaDaGarra && !K.isZero(armaDaGarra.dano) ? armaDaGarra.dano : null);
  if (danoGarra) partes.push(K.roll(b, danoGarra).total);
  const constricao = primeiro(c, 'constricao');
  if (constricao) partes.push(K.roll(b, constricao.m.dano).total);
  if (!partes.length) partes.push(Math.max(1, K.roll(b, '1d3').total + K.mod(c.atributos.for ?? 10) + K.deltaMod(c, 'for')));
  const total = partes.reduce((s, v) => s + v, 0);
  const rotulo = danoGarra || !constricao ? `Dano do agarrão${danoGarra ? ` (${danoGarra})` : ''}${constricao ? ` e da constrição (${constricao.m.dano})` : ''}` : `Dano da constrição (${constricao.m.dano})`;
  K.log(b, c, 'dano', `${rotulo}: ${total}.`);
  K.causarDano(b, alvo, [{ valor: total, tipo: 'fisico' }], { fonte: c, ataque: { nome: 'agarrão', natural: true, magico: null } });
  return true;
}

const LEVE = /adaga|punhal|curta|leve|desarmad|garra|mordida|pancada|chifre|ferrão|ferrao|soco|machadinha/;

/**
 * O golpe que dá para usar agarrado ou engolido (3.0: arma leve ou natural): ataques naturais e armas
 * leves primeiro; sem nenhum, o melhor corpo a corpo (o catálogo não diz o tamanho de toda arma).
 */
function armaLeve(K, c) {
  const melee = [...c.ataques, ...c.ataqueTotal].filter(a => K.isMelee(a) && !K.isZero(a.dano));
  const leves = melee.filter(a => a.natural || LEVE.test(loose(a.nome)));
  return (leves.length ? leves : melee).sort((x, y) => y.bonus - x.bonus)[0] || null;
}

/** Turno de quem está agarrado: tenta escapar (teste de agarrar) ou ataca quem o agarra. */
function turnoAgarrado(K, b, c) {
  const quem = b.get(c.agarradoPor);
  if (!quem || quem.estado === 'morto' || quem.agarrando !== c.uid) {
    c.agarradoPor = null;
    return false;
  }
  const chance = K.pAcerto(K.agarrarDe(c) - K.agarrarDe(quem), 11);
  const golpe = armaLeve(K, c);
  if (chance >= 0.3 || !golpe) {
    const r = K.resistido(b, K.agarrarDe(c), K.agarrarDe(quem));
    K.log(b, c, 'agarrar', `${c.nome} tenta se soltar de ${quem.nome}: ${r.texto} — ${r.venceu ? 'escapa' : 'continua preso'}.`);
    if (r.venceu) K.soltarAgarrao(b, c);
    return true;
  }
  K.golpe(b, c, quem, golpe); // agarrado: um ataque com arma leve ou natural
  return true;
}

/** Engolido: ataca por dentro contra a CA interna; com dano suficiente, abre caminho e sai. */
function turnoEngolido(K, b, c) {
  const quem = b.get(c.engolidoPor);
  const engolir = quem && primeiro(quem, 'engolir');
  if (!quem || quem.estado === 'morto' || !engolir) {
    c.engolidoPor = null;
    return false;
  }
  const golpe = armaLeve(K, c);
  if (!golpe) return true;
  const d = b.rng.die(20);
  const bonus = golpe.bonus + K.modsDeAtaque(b, c, quem, golpe).total;
  const acerta = d === 20 || (d !== 1 && d + bonus >= engolir.m.ca_interna);
  let texto = `${c.nome} ataca de dentro de ${quem.nome} com ${golpe.nome}: ${d} ${K.sinal(bonus)} = ${K.num(d + bonus)} contra CA ${engolir.m.ca_interna}`;
  if (acerta && !K.isZero(golpe.dano)) {
    const r = K.roll(b, golpe.dano);
    const rd = engolir.m.rd_se_aplica && quem.rd && !K.venceRD(c, golpe, quem.rd) ? quem.rd.valor : 0;
    const dano = rd ? Math.max(0, r.total - rd) : Math.max(1, r.total);
    c.danoInterno += dano;
    texto += ` — acerta, ${dano} de dano${rd ? ` (RD ${quem.rd.valor}/${quem.rd.exceto} absorve ${r.total - dano})` : ''} (${c.danoInterno} de ${engolir.m.pv_para_sair} para sair).`;
  } else texto += ' — erra.';
  K.log(b, c, 'ataque', texto);
  if (c.danoInterno >= engolir.m.pv_para_sair) {
    c.engolidoPor = null;
    c.pos = quem.pos;
    K.log(b, c, 'libertado', `${c.nome} abre caminho e sai de dentro de ${quem.nome}!`);
  }
  return true;
}

function turnoEngolfado(K, b, c) {
  const quem = b.get(c.engolfadoPor);
  if (!quem || quem.estado === 'morto') {
    c.engolfadoPor = null;
    return false;
  }
  const golpe = armaLeve(K, c);
  if (golpe) K.golpe(b, c, quem, golpe);
  return true;
}

/** Enredar (chicote do balor, laço): teste resistido de Força; se vencer, o alvo fica enredado. */
function enredar(K, b, c, alvo, e) {
  if (!K.podeLutar(alvo) || alvo.cond.enredado) return;
  const r = K.resistido(b, K.mod(c.atributos.for ?? 10), K.mod(alvo.atributos.for ?? 10));
  K.log(b, c, 'especial', `${e.nome}: ${c.nome} ${r.venceu ? 'enreda' : 'não consegue enredar'} ${alvo.nome} (Força: ${r.texto}).`);
  if (!r.venceu) return;
  K.aplicarCondicao(b, alvo, 'enredado', Infinity, { fonte: c, extra: { por: c.uid, escapar: e.m.escapar || null } });
  if (e.m.puxar) alvo.pos = c.pos;
}

function tentarSeSoltar(K, b, c) {
  const info = c.cond.enredado;
  if (!info?.por) return;
  const quem = b.get(info.por);
  let solta;
  const cd = /CD (\d+)/.exec(info.escapar || '');
  if (!quem || quem.estado === 'morto' || !K.podeLutar(quem)) solta = true;
  else if (cd) {
    const d = b.rng.die(20);
    const bonus = Math.max(K.mod(c.atributos.for ?? 10), K.mod(c.atributos.des ?? 10));
    solta = d + bonus >= Number(cd[1]);
    K.log(b, c, 'especial', `${c.nome} tenta se soltar: ${d} ${K.sinal(bonus)} = ${K.num(d + bonus)} contra CD ${cd[1]} — ${solta ? 'consegue' : 'não consegue'}.`);
  } else {
    const r = K.resistido(b, K.mod(c.atributos.for ?? 10), K.mod(quem.atributos.for ?? 10));
    solta = r.venceu;
    K.log(b, c, 'especial', `${c.nome} puxa para se soltar de ${quem.nome}: ${r.texto} — ${solta ? 'consegue' : 'não consegue'}.`);
  }
  if (solta) K.removerCondicao(b, c, 'enredado');
}

/**
 * Confusão (3.0, d10 a cada rodada): 1 vagueia por 1 minuto; 2–6 não faz nada; 7–9 ataca a
 * criatura mais próxima (de qualquer lado); 10 age normalmente. Quem foi atacado revida.
 */
function turnoConfuso(K, b, c) {
  const vizinhos = b.combatentes.filter(x => x !== c && K.alvoValido(x));
  const perto = [...vizinhos].sort((x, y) => K.gap(c, x) - K.gap(c, y))[0] || null;
  const revide = c._revidar ? b.get(c._revidar) : null;
  c._revidar = null;
  if (c._vagueiaAte != null && c._vagueiaAte > K.tick(b)) {
    K.log(b, c, 'sem-acao', `${c.nome} vagueia sem rumo (confuso).`);
    return true;
  }
  const preso = c.agarradoPor || c.engolidoPor || c.engolfadoPor;
  let alvo = !preso && revide && K.alvoValido(revide) ? revide : null;
  let d = null;
  if (!alvo) {
    d = b.rng.die(10);
    if (preso && (d === 1 || d >= 7)) {
      const quem = b.get(preso);
      K.log(b, c, 'especial', `${c.nome} (confuso) tira ${d}${d === 10 ? ' e age normalmente' : d === 1 ? ': quer vaguear, mas está preso e só se debate' : ` e se volta contra ${quem?.nome ?? 'quem o prende'}`}.`);
      return d === 1; // 7 a 10: o turno de quem está preso (atacar quem o prende ou escapar)
    }
    if (d === 10) {
      K.log(b, c, 'especial', `${c.nome} (confuso) tira 10 e age normalmente.`);
      return false;
    }
    if (d === 1) {
      c._vagueiaAte = K.expiraEm(b, 10, c, c);
      K.log(b, c, 'sem-acao', `${c.nome} (confuso) tira 1 e sai vagueando por 1 minuto.`);
      return true;
    }
    if (d <= 6) {
      K.log(b, c, 'sem-acao', `${c.nome} (confuso) tira ${d} e não faz nada.`);
      return true;
    }
    alvo = perto;
  }
  if (!alvo) return true;
  const golpes = c.ataqueTotal.filter(a => K.isMelee(a) && K.ataqueAlcanca(c, alvo, a));
  K.log(b, c, 'especial', `${c.nome} (confuso${d ? `, tira ${d}` : ', revida'}) ataca ${alvo.nome}${alvo.lado === c.lado ? ', um aliado' : ''}.`);
  if (golpes.length) K.sequencia(b, c, alvo, golpes);
  else {
    const golpe = c.ataques.find(K.isMelee);
    const m = golpe ? K.mover(c, alvo, Math.max(1.5, K.alcanceDe(c, golpe)), K.velocidade(c)) : 0;
    if (golpe && K.ataqueAlcanca(c, alvo, golpe)) K.golpe(b, c, alvo, golpe);
    else if (m) K.log(b, c, 'movimento', `${c.nome} anda ${m.toLocaleString('pt-BR')} m em direção a ${alvo.nome}.`);
  }
  return true;
}

/** Turno já resolvido por um especial (confuso, engolido, engolfado, agarrado, agarrando)? */
export function forcedTurn(K, b, c) {
  if (c.cond.confuso && turnoConfuso(K, b, c)) return true;
  if (c.engolidoPor) return turnoEngolido(K, b, c);
  if (c.engolfadoPor) return turnoEngolfado(K, b, c);
  if (c.agarradoPor) return turnoAgarrado(K, b, c);
  if (c.agarrando) return turnoAgarrando(K, b, c);
  return false;
}

// ---------------------------------------------------------------------------------------------
// início do turno: auras, dano de quem está dentro, fogo, veneno, olhar, enredado

export function startOfTurn(K, b, c) {
  if (c.estado === 'morto') return;
  // quem está queimando
  if (c.queimando) {
    if (c.queimando.expira <= K.tick(b)) c.queimando = null;
    else {
      const r = K.roll(b, c.queimando.dano);
      K.log(b, c, 'dano', `${c.nome} queima: ${c.queimando.dano} = ${r.total} de ${c.queimando.tipo}.`);
      K.causarDano(b, c, [{ valor: r.total, tipo: c.queimando.tipo }], { fonte: b.get(c.queimando.fonte) });
    }
  }
  // dano que continua (Flecha Ácida): conta as rodadas no turno de quem sofre, sem teste
  for (const x of [...(c.continuos || [])]) {
    if (c.estado === 'morto') break;
    const r = K.roll(b, x.dano);
    x.restantes--;
    if (x.restantes <= 0) c.continuos.splice(c.continuos.indexOf(x), 1);
    K.log(b, c, 'dano', `${x.rotulo} continua em ${c.nome}: ${x.dano} = ${r.total} de ${x.tipo}${x.restantes > 0 ? '' : ' (acaba)'}.`);
    K.causarDano(b, c, [{ valor: r.total, tipo: x.tipo }], { fonte: b.get(x.fonte) });
  }
  // veneno secundário
  for (const v of [...c.venenos]) {
    if (v.expira > K.tick(b)) continue;
    c.venenos.splice(c.venenos.indexOf(v), 1);
    const r = K.teste(b, c, 'fort', v.cd, { rotulo: `${v.nome}, efeito secundário` });
    if (!r.passou) efeitoDeVeneno(K, b, b.get(v.fonte), c, v.secundario, 'secundário');
  }
  if (c.estado === 'morto') return;
  // olhar petrificante dos inimigos (3.0: teste no início do turno de quem está ao alcance)
  if (!c.cond.cego && K.podeLutar(c)) {
    for (const g of K.inimigos(b, c)) {
      if (!K.podeLutar(g)) continue;
      for (const e of comEfeito(g, 'petrificacao')) {
        if (e.m.quando !== 'olhar' || K.gap(g, c) > (e.m.alcance_m ?? 9)) continue;
        if (imuneAMagia(c, e.natureza) || K.efeitoNaoAfeta(c, { resistencia: e.m.resistencia, condicao: 'petrificado' })) continue;
        const r = K.teste(b, c, e.m.resistencia, e.m.cd, { rotulo: `${e.nome} de ${g.nome}` });
        if (!r.passou) {
          K.aplicarCondicao(b, c, 'petrificado', e.m.permanente ? Infinity : K.parseDuracao(e.m.duracao, b.rng), { fonte: g });
          K.anunciarCondicao(b, c, 'petrificado', Infinity, `${e.nome} de ${g.nome}`);
          return;
        }
      }
    }
  }
  if (c.cond.enredado) tentarSeSoltar(K, b, c);
  if (!K.podeLutar(c)) return;
  // o que este combatente causa em volta
  for (const x of b.combatentes) {
    if (x.engolidoPor === c.uid) {
      const eng = primeiro(c, 'engolir');
      if (!eng) continue;
      const partes = [{ valor: K.roll(b, eng.m.dano_por_rodada).total, tipo: 'fisico' }];
      for (const de of eng.m.dano_extra || []) partes.push({ valor: K.roll(b, de.dano).total, tipo: de.tipo });
      K.log(b, x, 'dano', `Dentro de ${c.nome}, ${x.nome} sofre ${partes.map(p => `${p.valor}${p.tipo === 'fisico' ? '' : ` de ${p.tipo}`}`).join(' + ')} de dano (${eng.nome}).`);
      K.causarDano(b, x, partes, { fonte: c, ataque: { nome: eng.nome, natural: true, magico: null } });
    }
    if (x.engolfadoPor === c.uid) {
      const eng = primeiro(c, 'engolfar');
      if (!eng?.m.dano_por_rodada) continue;
      const tipo = Array.isArray(eng.m.tipo_energia) ? eng.m.tipo_energia[0] : eng.m.tipo_energia || 'fisico';
      const valor = K.roll(b, eng.m.dano_por_rodada).total;
      K.log(b, x, 'dano', `Dentro de ${c.nome}, ${x.nome} sofre ${valor} de ${tipo === 'fisico' ? 'dano' : tipo} (${eng.nome}).`);
      K.causarDano(b, x, [{ valor, tipo }], { fonte: c, ignoraRD: true });
    }
  }
  for (const e of comEfeito(c, 'aura')) aura(K, b, c, e);
  // inspirar coragem: enquanto o bardo está de pé, o efeito continua (mais 5 rodadas depois)
  for (const x of K.aliados(b, c)) for (const bf of x.buffs) if (bf.bardo === c.uid) bf.expira = K.expiraEm(b, 5, c, x);
}

function aura(K, b, c, e) {
  const m = e.m;
  if (m.bonus && !m.dano && !m.condicao) return; // passiva (aura de coragem): vale nos testes
  let alvos;
  if (m.afeta?.somente) {
    // "quem agarra o balor ou está preso contra ele pelo chicote"
    alvos = b.combatentes.filter(x => x !== c && (x.agarrando === c.uid || x.agarradoPor === c.uid || x.cond.enredado?.por === c.uid));
  } else {
    alvos = K.inimigos(b, c).filter(x => K.podeLutar(x) && K.gap(c, x) <= m.raio_m && K.atende(x, m.afeta));
  }
  for (const x of alvos) {
    if (m.condicao) {
      // um teste por luta: quem passa fica imune (um dia, na 3.0); quem falha sofre o efeito uma vez
      x._imuneAura = x._imuneAura || [];
      if (x._imuneAura.includes(`${c.uid}:${e.id}`)) continue;
      x._imuneAura.push(`${c.uid}:${e.id}`);
      if (K.efeitoNaoAfeta(x, { resistencia: m.resistencia, condicao: m.condicao }, K.MEDO[m.condicao] ? 'medo' : null)) continue;
      const r = K.teste(b, x, m.resistencia, m.cd, { rotulo: `${e.nome} de ${c.nome}`, medo: Boolean(K.MEDO[m.condicao]) });
      if (r.passou) continue;
      const rodadas = K.parseDuracao(m.duracao, b.rng);
      const ficou = K.aplicarCondicao(b, x, m.condicao, rodadas, { fonte: c, categoria: K.MEDO[m.condicao] ? 'medo' : null });
      if (ficou) K.anunciarCondicao(b, x, ficou, rodadas, e.nome);
      if (m.dano_atributo) danoDeAtributo(K, b, x, m.dano_atributo.atributo, K.roll(b, m.dano_atributo.dano).total, c, e.nome);
    } else if (m.dano) {
      const tipo = Array.isArray(m.tipo_energia) ? m.tipo_energia[0] : m.tipo_energia || 'fisico';
      K.efeitoComTeste(b, c, x, { dano: m.dano, tipo_energia: tipo, resistencia: m.resistencia || null, cd: m.cd, metade_se_passar: true }, { rotulo: e.nome });
    }
  }
}

// ---------------------------------------------------------------------------------------------
// ações livres: fúria

export function freeActions(K, b, c) {
  dirigirPersistentes(K, b, c);
  for (const e of comEfeito(c, 'sopro')) {
    if (e.m.acao !== 'livre' || !disponivel(b, K, c, e)) continue;
    const alvo = K.inimigos(b, c).filter(K.alvoValido).sort((x, y) => K.gap(c, x) - K.gap(c, y))[0];
    if (!alvo) continue;
    const plano = planejarArea(K, b, c, alvo, e.m.area, e.m.tamanho_m, { noConjurador: true });
    if (!plano || plano.mover > 0 || !plano.alvos.length) continue;
    if (plano.alvos.reduce((s, x) => s + evDano(K, b, c, x, e.m, { natureza: e.natureza }), 0) <= 0) continue;
    usarSopro(K, b, c, { e, alvo, alvos: plano.alvos, mover: 0 });
  }
  for (const e of comEfeito(c, 'furia')) {
    if (c.buffs.some(bf => bf.nome === 'furia') || c._furiaUsada || !disponivel(b, K, c, e)) continue;
    if (!K.inimigos(b, c).some(K.alvoValido)) continue;
    gastarUso(K, b, c, e);
    c._furiaUsada = true;
    const m = e.m;
    const conAntes = K.mod((c.atributos.con ?? 10) - c.danoAtributo.con);
    const conDepois = K.mod((c.atributos.con ?? 10) - c.danoAtributo.con + m.con);
    const pvExtra = (conDepois - conAntes) * c.dv;
    c.pvMax += pvExtra;
    c.pv += pvExtra;
    c.buffs.push({ nome: 'furia', rotulo: e.nome, atributos: { for: m.for, con: m.con }, bonus: { von: m.von, ca: m.ca }, pvExtra, semFadiga: Boolean(m.sem_fadiga), expira: K.expiraEm(b, m.duracao_rodadas, c, c) });
    K.log(b, c, 'especial', `${c.nome} entra em ${e.nome}: +${m.for} For, +${m.con} Con (+${pvExtra} PV), +${m.von} Vontade, ${m.ca < 0 ? `−${-m.ca}` : `+${m.ca}`} CA, por ${m.duracao_rodadas} rodadas.`);
  }
}

/**
 * Esfera Flamejante: a cada turno do conjurador, enquanto dura, ele a dirige até o alvo (o mesmo,
 * ou o inimigo mais próximo que ela fere, se esse caiu) e ela queima (Reflexos anula). Sem ninguém
 * que ela fira (o golem de ferro, que o fogo cura), fica parada. No SRD dirigi-la é uma ação de
 * movimento; aqui não gasta nada do turno (§8.5). A RM é testada uma vez por alvo.
 */
function dirigirPersistentes(K, b, c) {
  for (const p of [...(c.persistentes || [])]) {
    if (p.expira <= K.tick(b)) {
      c.persistentes.splice(c.persistentes.indexOf(p), 1);
      K.log(b, c, 'condicao-fim', `A ${p.s.nome} de ${c.nome} se apaga.`);
      continue;
    }
    // quem a RM já barrou (resultado guardado em p.chega) também não conta
    const fere = y => p.chega[y.uid] !== 'nao' && evDano(K, b, c, y, { ...p.s.m, cd: p.s.cd }, { natureza: p.s.natureza }) > 0;
    const antes = b.get(p.alvo);
    let x = antes && K.alvoValido(antes) && fere(antes) ? antes : null;
    if (!x) x = K.inimigos(b, c).filter(y => K.alvoValido(y) && fere(y)).sort((u, v) => K.gap(antes || c, u) - K.gap(antes || c, v))[0];
    if (!x) continue;
    p.alvo = x.uid;
    K.log(b, c, 'magia', `${c.nome} dirige a ${p.s.nome} até ${x.nome}.`);
    if (!(x.uid in p.chega)) p.chega[x.uid] = magiaChega(K, b, c, x, p.s);
    const chega = p.chega[x.uid];
    if (chega === 'nao') continue;
    if (chega.excecao) {
      aplicarExcecao(K, b, c, x, p.s.m, chega.excecao, p.s.nome);
      continue;
    }
    K.efeitoComTeste(b, c, chega.refletida ? c : x, { ...p.s.m, cd: p.s.cd }, { rotulo: p.s.nome });
  }
}

export function onBuffEnd(K, b, c, bf) {
  if (bf.nome === 'furia') {
    c.pvMax = Math.max(1, c.pvMax - bf.pvExtra);
    c.pv -= bf.pvExtra;
    K.log(b, c, 'especial', `A fúria de ${c.nome} acaba: perde os ${bf.pvExtra} PV extras${bf.semFadiga ? ' (no 20º nível, não fica fatigado)' : ' (fatigado até o fim da luta)'}.`);
    if (!bf.semFadiga) K.aplicarCondicao(b, c, 'fatigado', Infinity, { fonte: c });
    K.atualizarEstado(b, c);
  } else if (bf.rotulo) K.log(b, c, 'condicao-fim', `${bf.rotulo} acaba para ${c.nome}.`);
}

// ---------------------------------------------------------------------------------------------
// ao sofrer dano: Retribuição (Paladino de Arton)

/**
 * Retribuição (Sob): quem efetivamente tira PV do dono (vencendo imunidades, RD e resistência; os
 * PV temporários não contam) testa Fortitude (CD `cd_base` + o dano) ou morre, num efeito de morte.
 * Passando (ou imune à morte, ou sem morrer, como o Tarrasque), sofre o mesmo dano, como dano divino.
 * O efeito do mesmo golpe (veneno, vorpal) ainda vale, simultâneo; o que viria depois dele (agarrar,
 * rasgar, os golpes seguintes) não, porque o atacante morreu. Vale contra qualquer oponente
 * e qualquer fonte de dano, golpe a golpe. O dano da retribuição não dispara outra retribuição
 * (dois Paladinos não se matam num vaivém), e quem é imune a efeitos sobrenaturais (o golem de
 * ferro) não sofre nada.
 */
export function onDamaged(K, b, alvo, fonte, dano) {
  if (!fonte || fonte === alvo || fonte.lado === alvo.lado || !(dano > 0)) return;
  for (const e of comEfeito(alvo, 'retribuicao')) {
    if (fonte.estado === 'morto') break;
    if (e.m.afeta && !K.atende(fonte, e.m.afeta)) {
      const motivo = e.m.afeta.exceto_moral?.includes('B') && K.eixos(fonte.tendencia).moral === 'B' ? 'criatura bondosa' : 'fora da restrição';
      K.log(b, fonte, 'imune', `A ${e.nome} de ${alvo.nome} não atinge ${fonte.nome} (${motivo}).`);
      continue;
    }
    const cd = (e.m.cd_base ?? 15) + dano;
    const tipo = e.m.tipo_energia || 'divino';
    if (imuneAMagia(fonte, e.natureza)) {
      K.log(b, fonte, 'imune', `A ${e.nome} de ${alvo.nome} não afeta ${fonte.nome} (imune a efeitos sobrenaturais).`);
      continue;
    }
    K.log(b, alvo, 'especial', `${e.nome}: ${fonte.nome} tirou ${dano} PV de ${alvo.nome} e testa Fortitude (CD ${cd}) ou morre.`);
    // efeito de morte: constructo e morto-vivo (imunes a efeitos de Fortitude) e quem é imune a morte não testam
    const imune = fonte.imuneFortitude ? 'imune a efeitos de Fortitude' : K.imuneACondicao(fonte, 'morto') ? 'imune a efeitos de morte' : null;
    if (imune) K.log(b, fonte, 'imune', `${fonte.nome} não testa (${imune}).`);
    else if (!K.teste(b, fonte, 'fort', cd, { rotulo: e.nome }).passou) {
      // falhou: morre. O Tarrasque, que regenera mesmo morto, só cai, e sofre o dano como quem passou
      K.aplicarCondicao(b, fonte, 'morto', null, { fonte: alvo });
      if (fonte.estado === 'morto') continue;
    }
    K.log(b, alvo, 'dano', `${e.nome}: ${fonte.nome} sofre o mesmo dano, ${dano} de dano ${tipo}.`);
    K.causarDano(b, fonte, [{ valor: dano, tipo }], { fonte: alvo, retribuicao: true });
  }
}

// ---------------------------------------------------------------------------------------------
// ao morrer: explosão (espasmos da morte do balor)

export function onDeath(K, b, c) {
  for (const e of comEfeito(c, 'explosao-ao-morrer')) {
    K.log(b, c, 'especial', `${c.nome} explode ao morrer (${e.nome})!`);
    for (const x of b.combatentes) {
      if (x === c || x.estado === 'morto' || x.fugindo || K.gap(c, x) > e.m.raio_m) continue;
      K.efeitoComTeste(b, c, x, e.m, { rotulo: e.nome });
    }
  }
}

// ---------------------------------------------------------------------------------------------
// opções de ação para a IA

const pFalha = (alvo, tipo, cd) => (tipo && cd != null ? Math.min(0.95, Math.max(0.05, (cd - 1 - (alvo.resistencias[tipo] ?? 0)) / 20)) : 1);


const FORA = ['paralisado', 'imobilizado', 'inconsciente', 'petrificado', 'apavorado', 'amedrontado', 'enfeitiçado'];
const SEM_ACAO = ['atordoado', 'pasmo', 'nauseado'];

/** Duração média, em rodadas, de um texto de duração (para a IA; sem rolar dados). */
export function duracaoMedia(K, texto) {
  const t = loose(texto || '');
  if (!t || t.startsWith('permanente') || t.startsWith('enquanto')) return 10;
  const m = /(\d+d\d+(?:[+-]\d+)?|\d+)\s*(rodada|minuto|hora)/.exec(t);
  if (!m) return 1;
  const n = /d/.test(m[1]) ? K.average(m[1]) : Number(m[1]);
  return n * { rodada: 1, minuto: 10, hora: 600 }[m[2]];
}

/**
 * O alvo é imune a um efeito desta natureza pela imunidade a magia? Com `abrange` (golem de ferro),
 * vale o que ela lista; sem ele (Paladino de Arton), só magias e habilidades similares a magia.
 */
function imuneAMagia(alvo, natureza) {
  if (!alvo.imunidades.includes('magia') || natureza === 'Ext') return false;
  const abrange = primeiro(alvo, 'imunidade-magia')?.m.abrange;
  if (!abrange) return natureza === 'magia' || natureza === 'SM';
  return natureza === 'magia' || (natureza === 'SM' && abrange.some(a => /similar/.test(loose(a)))) || (natureza === 'Sob' && abrange.some(a => /sobrenatura/.test(loose(a))));
}

/** Dano que o combatente causa por rodada, em média (o que se evita tirando-o da luta por um tempo). */
const ameaca = (K, x) => x.ataqueTotal.reduce((s, a) => s + (K.isZero(a.dano) ? 0 : K.average(a.dano)), 0) * 0.6;

/**
 * Quanto vale, em "PV do alvo", aplicar esta condição (heurística da IA). Tirar da luta vale quase
 * os PV do alvo; impedir de agir por pouco tempo vale o dano que ele deixaria de causar; condição
 * que ele já tem não vale nada. Sozinho, tirar o alvo de ação por pouco tempo vale bem menos:
 * sem um aliado para aproveitar, a IA "trancaria" o alvo para sempre sem nunca derrubá-lo.
 */
function valorCondicao(K, alvo, cond, duracao, apoio = true, repetido = false) {
  if (alvo.cond[cond]) return 0;
  if (cond === 'morto') return alvo.pv * 1.5;
  const rodadas = duracaoMedia(K, duracao);
  const curto = repetido && !apoio ? 0 : ameaca(K, alvo) * Math.min(rodadas, 3) * (apoio ? 1 : 0.25);
  if (FORA.includes(cond)) return rodadas >= 3 ? alvo.pv * 0.8 : curto;
  if (SEM_ACAO.includes(cond)) return curto;
  return alvo.pv * 0.1;
}

/** Dano esperado de um efeito num alvo, considerando teste, tendência, imunidade e resistência. */
function evDano(K, b, c, alvo, m, { natureza = 'Sob', categoria = null } = {}) {
  if (K.efeitoNaoAfeta(alvo, m, categoria)) return 0;
  const apoio = K.aliados(b, c).some(x => x !== c && K.podeLutar(x));
  const repetido = c._controle?.[alvo.uid] === b.rodada - 1;
  if (imuneAMagia(alvo, natureza)) {
    const excecao = excecaoDeImunidade(alvo, m);
    return excecao ? valorExcecao(K, alvo, m, excecao, apoio, repetido) : 0;
  }
  let ev = 0;
  const pf = pFalha(alvo, m.resistencia, m.cd);
  const metade = m.metade_se_passar ? 0.5 : 0;
  let fator = pf + (1 - pf) * metade;
  if (m.dano_por_tendencia) {
    const letra = K.eixos(alvo.tendencia)[m.dano_por_tendencia.eixo];
    fator *= { total: 1, metade: 0.5, nenhum: 0 }[m.dano_por_tendencia[letra] || 'total'];
  }
  const tipos = Array.isArray(m.tipo_energia) ? m.tipo_energia : m.tipo_energia ? [m.tipo_energia] : ['fisico'];
  if (m.dano) {
    const media = K.average(m.dano) * fator;
    for (const t of tipos) {
      const parte = media / tipos.length;
      if (alvo.imunidades.includes(t)) continue;
      ev += Math.max(0, parte * (alvo.vulnerabilidades.includes(t) ? 2 : 1) - (alvo.resistEnergia[t] || 0));
    }
  }
  for (const de of m.dano_extra || []) if (!alvo.imunidades.includes(de.tipo)) ev += Math.max(0, K.average(de.dano) * fator - (alvo.resistEnergia[de.tipo] || 0));
  // dano que continua nas rodadas seguintes (Flecha Ácida), sem teste
  if (m.continuo && !alvo.imunidades.includes(m.continuo.tipo)) {
    ev += m.continuo.rodadas * Math.max(0, K.average(m.continuo.dano) * (alvo.vulnerabilidades.includes(m.continuo.tipo) ? 2 : 1) - (alvo.resistEnergia[m.continuo.tipo] || 0));
  }
  const imuneCond = m.condicao && K.imuneACondicao(alvo, m.condicao, K.categoriaDaCondicao(m.condicao, categoria));
  if (m.condicao && !imuneCond && (!m.condicao_afeta || K.atende(alvo, m.condicao_afeta))) ev += valorCondicao(K, alvo, m.condicao, m.duracao, apoio, repetido) * pf;
  for (const p of m.efeitos_por_dv || []) {
    const imune = p.condicao === 'morto' ? alvo.tipo === 'Constructo' : p.condicao && K.imuneACondicao(alvo, p.condicao, K.categoriaDaCondicao(p.condicao));
    if ((p.dv_max != null && alvo.dv > p.dv_max) || imune) continue;
    ev = Math.max(ev, p.condicao ? valorCondicao(K, alvo, p.condicao, p.duracao, apoio, repetido) : 2);
  }
  if (m.veneno && !alvo.imunidades.includes('veneno') && !alvo.imuneFortitude) ev += 3 * pf;
  return ev;
}

/**
 * Valor, para a IA, da exceção à imunidade a magia (golem de ferro): deixar lento vale a condição;
 * o fogo, que encerra a lentidão e cura, vale o negativo do que ele curaria.
 */
function valorExcecao(K, alvo, m, excecao, apoio, repetido) {
  const t = loose(excecao.efeito || '');
  const lento = /lento (\d+) rodadas/.exec(t);
  if (lento) return valorCondicao(K, alvo, 'lento', `${lento[1]} rodadas`, apoio, repetido);
  const cura = /cura 1 pv a cada (\d+)/.exec(t);
  if (cura) {
    const pv = Math.min(alvo.pvMax - alvo.pv, (m.dano ? K.average(m.dano) : 0) / Number(cura[1]));
    return -(pv + (alvo.cond.lento ? alvo.pv * 0.1 : 0)) - 0.5;
  }
  return 0;
}

/**
 * Magias e habilidades similares a magia disponíveis: [{ fonte, nome, m, natureza, nivel, cl, cd, idx?,
 * espaco?, gratis? }]. Da lista, cada magia precisa ter preparadas (`quantidade`) e, se diz de que
 * espaços sai (`espaco`, personagens), um espaço livre: o menor que houver. Produzir Chamas ativa
 * (`repete`) volta sem gastar nada (`gratis`).
 */
function magiasDisponiveis(K, b, c) {
  const out = [];
  for (const e of comEfeito(c, 'magia')) {
    if (!disponivel(b, K, c, e)) continue;
    out.push({ tipo: 'especial', e, nome: e.nome, m: e.m, natureza: e.natureza, cl: e.m.nivel_conjurador ?? c.nd, cd: e.m.cd });
  }
  (c.magias?.lista || []).forEach((s, idx) => {
    if (!s.mecanica) return;
    const base = { tipo: 'lista', idx, nome: s.nome, nivel: s.nivel, m: s.mecanica, natureza: 'magia', cl: s.mecanica.nivel_conjurador ?? c.magias.nivel_conjurador, cd: s.mecanica.cd ?? c.magias.cd_base + s.nivel };
    if (s.mecanica.repete && c.ativas?.[idx] > K.tick(b)) {
      out.push({ ...base, gratis: true });
      return;
    }
    if (c.magiasRestantes[idx] <= 0) return;
    const espaco = [].concat(s.espaco || []).find(k => (c.espacosRestantes?.[k] || 0) > 0) || null;
    if (s.espaco && !espaco) return;
    out.push({ ...base, espaco });
  });
  return out;
}

/** Nível do espaço de onde a magia sai ("n3" → 3), ou null (catálogo, sem espaços). */
const numeroDoEspaco = s => (s.espaco ? Number(String(s.espaco).slice(1)) : null);

/**
 * "Curar Ferimentos Leves (espaço de 2º nível)" quando a magia sai de um espaço maior que o nível
 * dela; `extras` entram no mesmo parêntese ("Sono (espaço de 3º nível; 2d4 = 4 DV)").
 */
function rotuloDaMagia(s, extras = []) {
  const n = numeroDoEspaco(s);
  const partes = [...(n && s.nivel != null && n > s.nivel ? [`espaço de ${n}º nível`] : []), ...extras];
  return partes.length ? `${s.nome} (${partes.join('; ')})` : s.nome;
}

/**
 * Sono (3.0): 2d4 DV de criaturas, as de menos DV primeiro (e, empatadas, as mais perto do ponto
 * de origem); o DV que não dá para a próxima se perde. Quem não pode ser afetado não gasta nada.
 */
function porDadosDeVida(K, alvos, principal, m, orcamento, categoria) {
  const validos = alvos
    .filter(x => K.podeLutar(x) && !K.efeitoNaoAfeta(x, m, categoria) && !K.imuneACondicao(x, m.condicao, K.categoriaDaCondicao(m.condicao, categoria)))
    .sort((x, y) => x.dv - y.dv || K.gap(principal, x) - K.gap(principal, y));
  const out = [];
  let resta = orcamento;
  for (const x of validos) {
    if (x.dv > resta) break;
    out.push(x);
    resta -= x.dv;
  }
  return out;
}

const ehBuff = m => !m.dano && !m.condicao && !m.efeitos_por_dv && !m.cura && m.bonus && !m.ataque && !m.resistencia && !(m.bonus.niveis_negativos || m.bonus.penalidade_for);
const ehDebuff = m => m.bonus && (m.bonus.niveis_negativos || m.bonus.penalidade_for);
const podeConjurar = c => !c.agarradoPor && !c.agarrando && !c.engolidoPor && !c.engolfadoPor;

function feridos(K, b, c) {
  return K.aliados(b, c)
    .filter(x => x.estado !== 'morto' && !x.fugindo && !x.engolidoPor && x.tipo !== 'Morto-Vivo' && (x === c || !x.imunidades.includes('magia')))
    .filter(x => x.pv < x.pvMax / 2)
    .sort((x, y) => x.pv / x.pvMax - y.pv / y.pvMax);
}

export function options(K, b, c, alvo) {
  const out = [];
  const conjura = podeConjurar(c);
  const ferido = feridos(K, b, c)[0];
  // curas
  if (ferido) {
    for (const e of comEfeito(c, 'cura-pelas-maos')) {
      if (c.usos[e.id].n > 0 && (ferido === c || K.gap(c, ferido) <= K.velocidade(c) + 1.5)) out.push({ tipo: 'cura-maos', e, alvo: ferido, ev: Math.min(c.usos[e.id].n, ferido.pvMax - ferido.pv), prioridade: 5 });
    }
    const falta = ferido === c ? 0 : Math.max(0, K.gap(c, ferido) - 1.5);
    // a cura que mais cura sem desperdiçar; empatadas, a do espaço menor
    const deficit = ferido.pvMax - ferido.pv;
    if (conjura && falta <= K.velocidade(c)) for (const s of magiasDisponiveis(K, b, c)) if (s.m.cura) out.push({ tipo: 'magia', s, alvo: ferido, alvos: [ferido], mover: falta, ev: Math.min(K.average(s.m.cura), deficit) - 0.01 * (numeroDoEspaco(s) ?? s.nivel ?? 0), prioridade: 5 });
  }
  // inspirar coragem na primeira ação
  for (const e of comEfeito(c, 'inspirar-coragem')) {
    if (!c._inspirou && disponivel(b, K, c, e)) out.push({ tipo: 'inspirar', e, ev: 1, prioridade: 3 });
  }
  if (!alvo) return out;
  // "sem inimigo ao alcance" = ninguém em corpo a corpo com o conjurador (nem ele com alguém): a
  // besta ou o arco alcançam quase sempre, e o conjurador nunca se reforçaria
  const semInimigoAoAlcance = !K.inimigos(b, c).some(x => K.alvoValido(x) && K.gap(c, x) <= Math.max(c.alcance || 1.5, x.alcance || 1.5) + 1e-9);
  if (conjura) {
    for (const s of magiasDisponiveis(K, b, c)) {
      const m = s.m;
      if (m.cura) continue;
      if (ehBuff(m)) {
        const ativa = c.buffs.some(bf => bf.rotulo === s.nome);
        if (!ativa && b.rodada <= 2 && semInimigoAoAlcance) out.push({ tipo: 'magia', s, alvo: c, alvos: [c], ev: 0.5 + valorDoReforco(K, b, c, m), prioridade: 1 });
        continue;
      }
      if (!m.dano && !m.condicao && !m.efeitos_por_dv && !ehDebuff(m)) continue;
      if (m.persistente && c.persistentes?.some(p => p.s.nome === s.nome)) continue; // uma esfera de cada vez
      const plano = planejarArea(K, b, c, alvo, m.area, null, { noConjurador: Boolean(m.efeitos_por_dv) || m.alvo === 'pessoal' });
      if (!plano) continue;
      const categoria = m.condicao === 'inconsciente' ? 'sono' : null;
      if (m.limite_dv) plano.alvos = porDadosDeVida(K, plano.alvos, alvo, m, Math.floor(K.average(m.limite_dv)), categoria);
      let mover = plano.mover;
      if (m.ataque === 'toque') {
        mover = Math.max(mover, K.gap(c, alvo) - 1.5);
        if (mover > K.velocidade(c)) continue;
      }
      const pFalhaMagia = s.gratis ? 0 : chanceFalhaMagia(c, s) / 100;
      let ev = 0;
      for (const x of plano.alvos) {
        const pRm = x.rm && s.natureza !== 'Ext' && s.natureza !== 'Sob' ? Math.min(1, Math.max(0.05, (21 - (x.rm - s.cl)) / 20)) : 1;
        const pAcerto = m.ataque ? K.pAcerto(bonusDeToque(K, c, m.ataque), m.ataque === 'corpo a corpo' ? x.ca.total : x.ca.toque) : 1;
        // Mísseis Mágicos contra quem tem Escudo Arcano: não chegam (a IA não gasta a magia)
        const barrada = m.acerto_automatico && x.buffs.some(bf => (bf.bonus?.anula || '').includes(s.nome));
        const base = barrada ? 0 : evDano(K, b, c, x, { ...m, cd: s.cd }, { natureza: s.natureza, categoria });
        const debuff = ehDebuff(m) && !imuneAMagia(x, s.natureza) && !(m.bonus.penalidade_for && x.imunidades.includes('dano de atributo')) ? 4 : 0;
        ev += (base + debuff) * pRm * pAcerto;
      }
      ev *= 1 - pFalhaMagia;
      // o que continua nas próximas rodadas (a esfera, as chamas na mão) vale um pouco mais (heurística)
      if (m.persistente || (m.repete && !s.gratis)) ev *= 1 + 0.5 * Math.min(2, Math.max(0, duracaoMedia(K, m.duracao) - 1));
      if (ev > 0) out.push({ tipo: 'magia', s, alvo, alvos: plano.alvos, mover, ev });
    }
  }
  // sopro
  for (const e of comEfeito(c, 'sopro')) {
    if (!disponivel(b, K, c, e)) continue;
    const plano = planejarArea(K, b, c, alvo, e.m.area, e.m.tamanho_m, { noConjurador: true });
    if (!plano) continue;
    if (!plano.alvos.length) continue;
    const ev = plano.alvos.reduce((s, x) => s + evDano(K, b, c, x, e.m, { natureza: e.natureza }), 0);
    if (ev <= 0) continue;
    const prioridade = plano.alvos.length >= 2 || b.rodada === 1 ? 2 : 0;
    out.push({ tipo: 'sopro', e, alvo, alvos: plano.alvos, mover: plano.mover, ev, prioridade });
  }
  // engolfar, esmagar, atropelar: criaturas menores ao alcance
  for (const efeito of ['engolfar', 'esmagar', 'atropelar']) {
    for (const e of comEfeito(c, efeito)) {
      const max = e.m.tamanho_max || tamanhoMaxPadrao(K, c);
      const alvos = K.inimigos(b, c).filter(x => K.alvoValido(x) && K.gap(c, x) <= Math.max(1.5, c.alcance) && K.sizeIdx(x.tamanho) <= K.sizeIdx(max));
      if (!alvos.length) continue;
      const pf = x => pFalha(x, e.m.resistencia, e.m.cd);
      // esmagar e atropelar são o corpo (arma natural): a RD que ele não vence sai do dano, como na execução
      const rd = x => (x.rd && !K.venceRD(c, corpoDe(e), x.rd) ? x.rd.valor : 0);
      const dano = e.m.dano ? K.average(e.m.dano) : 0;
      const ev = efeito === 'engolfar'
        ? alvos.reduce((s, x) => s + pf(x) * (x.pv * 0.8 + (e.m.dano_por_rodada ? K.average(e.m.dano_por_rodada) : 0)), 0)
        : alvos.reduce((s, x) => s + pf(x) * Math.max(0, dano - rd(x)) + (1 - pf(x)) * (e.m.metade_se_passar ? Math.max(0, dano / 2 - rd(x)) : 0), 0);
      out.push({ tipo: efeito, e, alvos, ev, prioridade: efeito === 'engolfar' ? 1 : 0 });
    }
  }
  return out;
}

/**
 * Quanto um reforço ajuda, só para ordenar os reforços entre si (todos valem pouco perto de atacar):
 * CA, ataque e dano (vezes os aliados, se é para todos), Força (o modificador vai no ataque e no
 * dano), imagens, ações extras, camuflagem.
 */
function valorDoReforco(K, b, c, m) {
  const bn = m.bonus || {};
  const num = v => (typeof v === 'number' ? v : typeof v === 'string' && /d/.test(v) ? K.average(v) : 0);
  const n = m.alvo === 'aliados' ? K.aliados(b, c).filter(K.podeLutar).length : 1;
  const ca = num(bn.ca) + num(bn.ca_armadura) + num(bn.ca_natural) + num(bn.ca_deflexao);
  const golpe = (num(bn.ataque) + num(bn.dano)) * n + num(bn.for);
  const resto = num(bn.imagens) + 4 * num(bn.acoes_extras) + num(bn.camuflagem_pct) / 10;
  return 0.01 * (ca + golpe + resto);
}

/** Área e alvos de um efeito saindo de `c` contra `alvo`; se estiver longe, quanto precisa andar antes. */
function planejarArea(K, b, c, alvo, areaTexto, tamanho, { noConjurador = false } = {}) {
  if (!areaTexto && tamanho == null) return { alvos: [alvo], mover: 0 };
  const area = K.parseArea(areaTexto, tamanho, { noConjurador });
  let mover = 0;
  if (area.noConjurador) {
    const falta = K.gap(c, alvo) - area.tamanho;
    if (falta > 0) {
      if (falta > K.velocidade(c)) return null;
      mover = falta;
    }
  }
  const pos = c.pos;
  if (mover) c.pos += Math.sign(alvo.pos - c.pos) * mover; // simula a posição depois de andar
  const alvos = K.alvosNaArea(b, c, area, alvo);
  c.pos = pos;
  return { alvos, mover, area };
}

function chanceFalhaMagia(c, s) {
  let pct = c.cond.surdo ? 20 : 0;
  for (const e of comEfeito(c, 'falha-de-magia')) {
    const vale = !e.m.aplica_a || (s.tipo === 'especial' && e.m.aplica_a.includes(s.e.id));
    if (vale) pct = Math.max(pct, e.m.chance_pct);
  }
  return pct;
}

// ---------------------------------------------------------------------------------------------
// execução das ações especiais

export function execute(K, b, c, acao) {
  switch (acao.tipo) {
    case 'sopro': return usarSopro(K, b, c, acao);
    case 'magia': return conjurar(K, b, c, acao);
    case 'inspirar': return inspirar(K, b, c, acao.e);
    case 'cura-maos': return curaPelasMaos(K, b, c, acao);
    case 'engolfar': return engolfar(K, b, c, acao);
    case 'esmagar':
    case 'atropelar': return esmagar(K, b, c, acao);
    default:
      K.log(b, c, 'sem-acao', `${c.nome} hesita.`);
  }
  return undefined;
}

function andarAntes(K, b, c, acao) {
  if (acao.mover > 0 && acao.alvo) {
    const m = K.mover(c, acao.alvo, 0, acao.mover);
    if (m > 0) K.log(b, c, 'movimento', `${c.nome} avança ${m.toLocaleString('pt-BR')} m.`);
  }
}

function usarSopro(K, b, c, acao) {
  const e = acao.e;
  andarAntes(K, b, c, acao);
  const plano = planejarArea(K, b, c, acao.alvo, e.m.area, e.m.tamanho_m, { noConjurador: true });
  const alvos = plano?.alvos?.length ? plano.alvos : acao.alvos.filter(x => x.estado !== 'morto');
  if (!alvos.length) {
    K.log(b, c, 'sem-acao', `${c.nome} não tem ninguém na área de ${e.nome}.`);
    return;
  }
  onAttackAction(K, b, c);
  gastarUso(K, b, c, e);
  const rec = e.m.recarga;
  const rodadas = typeof rec === 'number' ? rec : K.roll(b, rec).total;
  c.recarga[e.id] = K.expiraEm(b, rodadas, c, c);
  if (e.m.compartilhada_com) c.recarga[e.m.compartilhada_com] = c.recarga[e.id];
  K.log(b, c, 'especial', `${c.nome} usa ${e.nome} (${e.m.area} de ${e.m.tamanho_m} m) em ${alvos.map(x => x.nome).join(', ')}. Recarrega em ${rodadas} rodada${rodadas === 1 ? '' : 's'}.`);
  for (const x of alvos) {
    const chega = magiaChega(K, b, c, x, { nome: e.nome, m: e.m, natureza: e.natureza, cl: e.m.nivel_conjurador ?? c.nd });
    if (chega === 'nao') continue;
    if (chega.excecao) {
      aplicarExcecao(K, b, c, x, e.m, chega.excecao, e.nome);
      continue;
    }
    K.efeitoComTeste(b, c, chega.refletida ? c : x, e.m, { rotulo: e.nome, natureza: e.natureza });
  }
}

/** A imunidade a magia do alvo tem exceção para esta magia (ex.: golem de ferro contra eletricidade)? */
function excecaoDeImunidade(alvo, m) {
  const im = primeiro(alvo, 'imunidade-magia');
  if (!im?.m.excecoes) return null;
  const tipos = Array.isArray(m.tipo_energia) ? m.tipo_energia : m.tipo_energia ? [m.tipo_energia] : [];
  return im.m.excecoes.find(x => x.tipo_energia && tipos.includes(x.tipo_energia)) || null;
}

/**
 * A magia chega ao alvo? Imunidade a magia (com exceções), carapaça que reflete, resistência à
 * magia. Devolve 'afeta' | 'nao' | { refletida: true } | { excecao }.
 */
function magiaChega(K, b, c, x, s) {
  const m = s.m;
  if (imuneAMagia(x, s.natureza)) {
    const excecao = excecaoDeImunidade(x, m);
    if (excecao) return { excecao };
    K.log(b, x, 'imune', `${x.nome} é imune a magia: ${s.nome} não tem efeito.`);
    return 'nao';
  }
  const carapaca = primeiro(x, 'refletir-magia');
  if (carapaca && (s.natureza === 'magia' || s.natureza === 'SM')) {
    const forma = K.parseArea(m.area).forma;
    const pega = carapaca.m.afeta.some(a => {
      const t = loose(a);
      return (t === 'raios' && m.ataque === 'toque a distancia') || (t === 'linhas' && m.area && forma === 'linha') || (t === 'cones' && m.area && forma === 'cone') || loose(s.nome) === t;
    });
    if (pega) {
      if (b.rng.chance(carapaca.m.chance_pct)) {
        K.log(b, x, 'especial', `A ${carapaca.nome} de ${x.nome} reflete ${s.nome} de volta para ${c.nome}!`);
        return { refletida: true };
      }
      K.log(b, x, 'especial', `A ${carapaca.nome} de ${x.nome} anula ${s.nome}.`);
      return 'nao';
    }
  }
  if (!K.venceRM(b, c, x, s.cl, s.natureza)) return 'nao';
  return 'afeta';
}

const verbo = s => (s.gratis ? 'arremessa de novo' : s.natureza === 'magia' ? 'conjura' : 'usa');

/**
 * Bônus do ataque de uma magia: toque corpo a corpo usa a Força; à distância, a Destreza (3.0).
 * Reforços no ataque que não são de uma arma (Bênção) também valem.
 */
function bonusDeToque(K, c, tipo) {
  const attr = tipo === 'toque' || tipo === 'corpo a corpo' ? 'for' : 'des';
  return c.bba + K.mod(c.atributos[attr] ?? 10) + K.deltaMod(c, attr) + K.somaBuff(c, 'ataque', bf => !bf.somente_arma);
}

function conjurar(K, b, c, acao) {
  const s = acao.s;
  const m = s.m;
  andarAntes(K, b, c, acao);
  if (s.tipo === 'lista' && !s.gratis) {
    c.magiasRestantes[s.idx]--;
    if (s.espaco) c.espacosRestantes[s.espaco]--;
  } else if (s.tipo !== 'lista') gastarUso(K, b, c, s.e);
  const nome = rotuloDaMagia(s);
  // arremessar de novo as chamas não é conjurar: não tem falha de magia
  const falha = s.gratis ? 0 : chanceFalhaMagia(c, s);
  if (falha && b.rng.chance(falha)) {
    K.log(b, c, 'magia', `${c.nome} tenta usar ${nome}, mas falha (${falha}% de chance de falha).`);
    return;
  }
  // Produzir Chamas: as chamas ficam na mão enquanto a magia dura
  if (m.repete && !s.gratis) c.ativas[s.idx] = K.expiraEm(b, K.parseDuracao(m.duracao, b.rng), c, c);
  // reforço: em si mesmo ou nos aliados
  if (ehBuff(m)) {
    const alvos = m.alvo === 'aliados' ? K.aliados(b, c).filter(x => x.estado !== 'morto' && !x.fugindo) : [c];
    for (const x of alvos) aplicarReforco(K, b, c, x, { ...s, rotulo: nome });
    return;
  }
  if (m.cura) {
    const x = acao.alvo;
    if (x !== c && imuneAMagia(x, s.natureza)) return;
    K.log(b, c, 'magia', `${c.nome} ${verbo(s)} ${nome} ${x === c ? 'em si mesmo' : `em ${x.nome}`}.`);
    K.curar(b, x, K.roll(b, m.cura).total, c);
    return;
  }
  const principal = acao.alvo && K.alvoValido(acao.alvo) ? acao.alvo : K.inimigos(b, c).find(K.alvoValido);
  if (!principal) return;
  const plano = planejarArea(K, b, c, principal, m.area, null, { noConjurador: Boolean(m.efeitos_por_dv) || m.alvo === 'pessoal' });
  let alvos = plano ? plano.alvos : [principal];
  const categoria = m.condicao === 'inconsciente' ? 'sono' : null;
  const extras = [];
  if (m.limite_dv) {
    const r = K.roll(b, m.limite_dv);
    alvos = porDadosDeVida(K, alvos, principal, m, r.total, categoria);
    extras.push(`${m.limite_dv} = ${r.total} DV`);
  }
  K.log(b, c, 'magia', `${c.nome} ${verbo(s)} ${rotuloDaMagia(s, extras)}${alvos.length ? ` em ${alvos.map(x => x.nome).join(', ')}` : ', mas não afeta ninguém'}.`);
  // Esfera Flamejante: fica rolando nas próximas rodadas (dirigida no turno do conjurador)
  if (m.persistente) c.persistentes.push({ s: { ...s }, alvo: principal.uid, expira: K.expiraEm(b, K.parseDuracao(m.duracao, b.rng), c, c), chega: {} });
  const esfera = m.persistente ? c.persistentes.at(-1) : null;
  if (m.condicao || m.efeitos_por_dv) {
    c._controle = c._controle || {};
    for (const x of alvos) c._controle[x.uid] = b.rodada;
  }
  for (const x of alvos) {
    const chega = magiaChega(K, b, c, x, s);
    if (esfera) esfera.chega[x.uid] = chega;
    if (chega === 'nao') continue;
    if (chega.excecao) {
      aplicarExcecao(K, b, c, x, m, chega.excecao, s.nome);
      continue;
    }
    const destino = chega.refletida ? c : x;
    if (m.ataque) {
      const d = b.rng.die(20);
      const bonus = bonusDeToque(K, c, m.ataque);
      const ca = K.caContra(b, destino, c, { tipo: m.ataque, nome: s.nome });
      const acerta = d === 20 || (d !== 1 && d + bonus >= ca);
      const toque = K.isTouch({ tipo: m.ataque });
      K.log(b, c, 'ataque', `${s.nome} (${toque ? 'ataque de toque' : 'ataque'}): ${d} ${K.sinal(bonus)} = ${K.num(d + bonus)} contra CA${toque ? ' de toque' : ''} ${ca} — ${acerta ? 'acerta' : 'erra'}.`);
      if (!acerta) continue;
    }
    if (m.acerto_automatico && destino.buffs.some(bf => (bf.bonus?.anula || '').includes(s.nome))) {
      K.log(b, destino, 'defesa', `${destino.nome} está protegido contra ${s.nome}.`);
      continue;
    }
    const r = K.efeitoComTeste(b, c, destino, { ...m, cd: s.cd }, { rotulo: s.nome, categoria });
    // Flecha Ácida: o ácido continua nas rodadas seguintes
    if (m.continuo && destino.estado !== 'morto' && !r.naoAfeta && !destino.imunidades.includes(m.continuo.tipo)) {
      destino.continuos.push({ rotulo: s.nome, dano: m.continuo.dano, tipo: m.continuo.tipo, restantes: m.continuo.rodadas, fonte: c.uid });
      K.log(b, c, 'magia', `${s.nome} continua a ferir ${destino.nome} por mais ${m.continuo.rodadas} rodada${m.continuo.rodadas === 1 ? '' : 's'}.`);
    }
    if (ehDebuff(m) && destino.estado !== 'morto' && !r.naoAfeta && r.passou !== true) {
      if (m.bonus.niveis_negativos) drenar(K, b, c, destino, K.roll(b, String(m.bonus.niveis_negativos)).total, s.nome);
      if (m.bonus.penalidade_for) danoDeAtributo(K, b, destino, 'for', K.roll(b, String(m.bonus.penalidade_for)).total, c, s.nome, K.parseDuracao(m.duracao || '1 minuto', b.rng));
    }
  }
}

/** Exceção da imunidade a magia: eletricidade deixa o golem lento; fogo encerra a lentidão e cura. */
function aplicarExcecao(K, b, c, x, m, excecao, nome) {
  const t = loose(excecao.efeito || '');
  const lento = /lento (\d+) rodadas/.exec(t);
  if (lento) {
    K.aplicarCondicao(b, x, 'lento', Number(lento[1]), { fonte: c });
    K.log(b, x, 'especial', `${nome} não fere ${x.nome}, mas o deixa lento por ${lento[1]} rodadas.`);
  }
  const cura = /cura 1 pv a cada (\d+)/.exec(t);
  if (cura) {
    K.removerCondicao(b, x, 'lento');
    const dano = m.dano ? K.roll(b, m.dano).total : 0;
    K.log(b, x, 'especial', `${nome} não fere ${x.nome}: o fogo o cura.`);
    K.curar(b, x, Math.floor(dano / Number(cura[1])), c);
  }
}

const NOME_DO_ATRIBUTO = { for: 'Força', des: 'Destreza', con: 'Constituição', int: 'Inteligência', sab: 'Sabedoria', car: 'Carisma' };

/**
 * Reforço num combatente: bônus (somados pelo núcleo, com `tipo_bonus` que não acumula), atributos
 * (número ou dado: Força do Touro rola 1d4+1), PV temporários, imagens. A mesma magia de novo
 * renova a duração em vez de somar (3.0). Arma Mágica leva a arma encantada (`somente_arma`).
 */
function aplicarReforco(K, b, c, x, s) {
  const m = s.m;
  const bonus = { ...m.bonus };
  const atributos = {};
  const rolados = [];
  for (const a of ['for', 'des', 'con', 'int', 'sab', 'car']) {
    if (typeof bonus[a] === 'number') atributos[a] = bonus[a];
    else if (typeof bonus[a] === 'string' && /d/.test(bonus[a])) {
      atributos[a] = K.roll(b, bonus[a]).total;
      rolados.push(`${bonus[a]} = +${atributos[a]} de ${NOME_DO_ATRIBUTO[a]}`);
    } else continue;
    delete bonus[a];
  }
  if (bonus.pv_temporarios) {
    x.pvTemp = Math.max(x.pvTemp, Number(bonus.pv_temporarios) || 0);
    delete bonus.pv_temporarios;
  }
  if (bonus.imagens) {
    x.imagens = K.roll(b, String(bonus.imagens)).total;
    delete bonus.imagens;
  }
  const rodadas = K.parseDuracao(m.duracao || '10 rodadas', b.rng);
  const renova = x.buffs.some(bf => bf.rotulo === s.nome);
  x.buffs = x.buffs.filter(bf => bf.rotulo !== s.nome);
  x.buffs.push({
    rotulo: s.nome,
    bonus,
    atributos,
    expira: K.expiraEm(b, rodadas, c, x),
    ...(m.tipo_bonus ? { tipo_bonus: m.tipo_bonus } : {}),
    ...(m.somente_arma ? { somente_arma: { ...m.somente_arma } } : {}),
    ...(m.melhoria_arma ? { melhoria_arma: m.melhoria_arma } : {}),
  });
  const detalhes = [...(m.somente_arma?.nome ? [m.somente_arma.nome] : []), ...rolados, ...(rodadas === Infinity ? [] : [`${rodadas} ${rodadas === 1 ? 'rodada' : 'rodadas'}`]), ...(renova ? ['renova a duração'] : [])];
  K.log(b, c, 'magia', `${c.nome} ${verbo(s)} ${s.rotulo || s.nome}${x === c ? '' : ` em ${x.nome}`}${detalhes.length ? ` (${detalhes.join('; ')})` : ''}.`);
}

function inspirar(K, b, c, e) {
  c._inspirou = true;
  gastarUso(K, b, c, e);
  const m = e.m;
  const alvos = K.aliados(b, c).filter(x => x.estado !== 'morto' && !x.fugindo);
  // bônus de moral (3.0): não soma com outro de moral (Bênção); vale o maior
  for (const x of alvos) x.buffs.push({ rotulo: e.nome, bardo: c.uid, tipo_bonus: 'moral', bonus: { ataque: m.bonus_ataque, dano: m.bonus_dano, contra_medo: m.bonus_contra_medo || 0 }, expira: K.expiraEm(b, 5, c, x) });
  K.log(b, c, 'especial', `${c.nome} usa ${e.nome}: aliados ganham +${m.bonus_ataque} no ataque e +${m.bonus_dano} no dano${m.bonus_contra_medo ? `, +${m.bonus_contra_medo} contra medo` : ''}.`);
}

function curaPelasMaos(K, b, c, acao) {
  const x = acao.alvo;
  if (x !== c) K.mover(c, x, 1.5, K.velocidade(c));
  const pool = c.usos[acao.e.id];
  const valor = Math.min(pool.n, x.pvMax - x.pv);
  pool.n -= valor;
  K.log(b, c, 'especial', `${c.nome} usa ${acao.e.nome} ${x === c ? 'em si mesmo' : `em ${x.nome}`} (${pool.n} PV restantes hoje).`);
  K.curar(b, x, valor, c);
}

function engolfar(K, b, c, acao) {
  const e = acao.e;
  K.log(b, c, 'especial', `${c.nome} avança sobre ${acao.alvos.map(x => x.nome).join(', ')} (${e.nome}).`);
  for (const x of acao.alvos) {
    const auto = x.cond.paralisado && e.m.nota?.includes('paralisado');
    const passou = auto ? false : K.teste(b, x, e.m.resistencia, e.m.cd, { rotulo: e.nome }).passou;
    if (passou) continue;
    x.engolfadoPor = c.uid;
    x.pos = c.pos;
    K.soltarAgarrao(b, x);
    K.log(b, x, 'especial', `${c.nome} engolfa ${x.nome}.`);
    if (e.m.paralisia && !x.imunidades.includes('paralisia')) {
      const r = K.teste(b, x, e.m.paralisia.resistencia, e.m.paralisia.cd, { rotulo: 'paralisia' });
      if (!r.passou) {
        const rodadas = K.parseDuracao(e.m.paralisia.duracao, b.rng);
        K.aplicarCondicao(b, x, 'paralisado', rodadas, { fonte: c, categoria: 'paralisia' });
        K.anunciarCondicao(b, x, 'paralisado', rodadas, 'engolfado');
      }
    }
  }
}

/** O "ataque" de esmagar e atropelar: o corpo da criatura, arma natural sem bônus de melhoria. */
const corpoDe = e => ({ nome: e.nome, natural: true, magico: null });

function esmagar(K, b, c, acao) {
  const e = acao.e;
  K.log(b, c, 'especial', `${c.nome} usa ${e.nome} sobre ${acao.alvos.map(x => x.nome).join(', ')}.`);
  const corpo = corpoDe(e);
  for (const x of acao.alvos) K.efeitoComTeste(b, c, x, { dano: e.m.dano, resistencia: e.m.resistencia, cd: e.m.cd, metade_se_passar: Boolean(e.m.metade_se_passar) }, { rotulo: e.nome, ignoraRD: false, ataque: corpo });
}
