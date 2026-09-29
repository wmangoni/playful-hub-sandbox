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
  const semSimular = c._esp.filter(e => (!e.m && e.grupo === 'ataque') || e.m?.efeito === 'outro').map(e => e.nome);
  if (semSimular.length) K.log(b, c, 'nao-simulado', `${c.nome}: não simulado — ${semSimular.join(', ')}.`);
}

// ---------------------------------------------------------------------------------------------
// modificadores pedidos pelo núcleo

export function acMod() {
  return 0;
}

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

/** Destruir (o Mal): usado no primeiro golpe contra um alvo válido. */
export function beforeAttacks(K, b, c, alvo) {
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

/** Rasgar: todos os ataques exigidos acertaram o mesmo alvo nesta sequência. */
export function afterAttacks(K, b, c, acertos) {
  for (const e of comEfeito(c, 'rasgar')) {
    for (const [uid, nomes] of acertos) {
      const sobra = [...nomes];
      const ok = e.m.requer.every(n => {
        const i = sobra.indexOf(n);
        if (i < 0) return false;
        sobra.splice(i, 1);
        return true;
      });
      const alvo = b.get(uid);
      if (!ok || !alvo || alvo.estado === 'morto') continue;
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
      const r = K.teste(b, x, m.resistencia, m.cd, { medo: true, rotulo: e.nome });
      if (r.passou) continue;
      const porDv = (m.efeitos_por_dv || []).find(p => p.dv_max == null || x.dv <= p.dv_max);
      const cond = porDv?.condicao || m.condicao;
      const rodadas = K.parseDuracao(porDv?.duracao || m.duracao, b.rng);
      const ficou = K.aplicarCondicao(b, x, cond, rodadas, { fonte: c, categoria: 'medo' });
      if (ficou) K.anunciarCondicao(b, x, ficou, rodadas, `${e.nome} de ${c.nome}`);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// efeitos ao acertar

export function onHit(K, b, c, alvo, a, { critico, natural }) {
  for (const e of todos(c)) {
    if (!e.m || !disparaCom(e, a) || alvo.estado === 'morto') continue;
    const m = e.m;
    switch (m.efeito) {
      case 'paralisia':
      case 'condicao-ao-acertar': {
        if (!K.podeLutar(alvo) || (m.afeta && !K.atende(alvo, m.afeta))) break;
        const categoria = m.efeito === 'paralisia' ? 'paralisia' : K.MEDO[m.condicao] ? 'medo' : null;
        if (categoria && alvo.imunidades.includes(categoria)) break;
        const r = K.teste(b, alvo, m.resistencia, m.cd, { rotulo: e.nome, medo: categoria === 'medo' });
        if (r.passou) break;
        const cond = m.efeito === 'paralisia' ? 'paralisado' : m.condicao;
        const rodadas = K.parseDuracao(m.duracao, b.rng);
        const ficou = K.aplicarCondicao(b, alvo, cond, rodadas, { fonte: c, categoria });
        if (ficou) K.anunciarCondicao(b, alvo, ficou, rodadas, e.nome);
        break;
      }
      case 'veneno':
        envenenar(K, b, c, alvo, { inicial: m.inicial, secundario: m.secundario, resistencia: m.resistencia, cd: m.cd, nome: e.nome });
        break;
      case 'agarrar-aprimorado':
        agarrarAprimorado(K, b, c, alvo, e);
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

export function onDamaged() {}

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
  if (alvo.estado === 'morto' || alvo.imunidades.includes('veneno')) return;
  const falhou = v.jaFalhou || !K.teste(b, alvo, v.resistencia || 'fort', v.cd, { rotulo: v.nome || 'veneno' }).passou;
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

/**
 * Dano de atributo: recalcula os bônus pela diferença de modificador. Força ou Destreza 0 deixam
 * indefeso (paralisado); Constituição 0 mata; Con perdida tira PV (1 por DV a cada ponto de mod.).
 */
export function danoDeAtributo(K, b, alvo, attr, valor, fonte = null, origem = '') {
  const base = alvo.atributos[attr];
  if (base == null || valor <= 0 || alvo.estado === 'morto') return;
  const antes = K.deltaMod(alvo, attr);
  alvo.danoAtributo[attr] += valor;
  const depois = K.deltaMod(alvo, attr);
  const nomes = { for: 'Força', des: 'Destreza', con: 'Constituição', int: 'Inteligência', sab: 'Sabedoria', car: 'Carisma' };
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
  K.log(b, c, 'agarrar', `${c.nome} tenta agarrar ${alvo.nome} (${e.nome}): ${r.a} contra ${r.d} — ${r.venceu ? 'agarra' : 'não consegue'}.`);
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
    K.log(b, c, 'agarrar', `${c.nome} tenta engolir ${alvo.nome}: ${r.a} contra ${r.d} — ${r.venceu ? 'engole!' : 'não consegue'}.`);
    if (r.venceu) {
      K.soltarAgarrao(b, c);
      alvo.engolidoPor = c.uid;
      alvo.danoInterno = 0;
      alvo.pos = c.pos;
    }
    return true;
  }
  const r = K.resistido(b, K.agarrarDe(c), K.agarrarDe(alvo));
  K.log(b, c, 'agarrar', `${c.nome} aperta ${alvo.nome}: ${r.a} contra ${r.d} — ${r.venceu ? 'vence' : 'perde'} o teste de agarrar.`);
  if (!r.venceu) return true;
  const partes = [];
  const garra = primeiro(c, 'agarrar-aprimorado');
  if (garra?.m.dano_por_rodada) partes.push(K.roll(b, garra.m.dano_por_rodada).total);
  const constricao = primeiro(c, 'constricao');
  if (constricao) partes.push(K.roll(b, constricao.m.dano).total);
  if (!partes.length) partes.push(Math.max(1, K.roll(b, '1d3').total + K.mod(c.atributos.for ?? 10) + K.deltaMod(c, 'for')));
  const total = partes.reduce((s, v) => s + v, 0);
  K.log(b, c, 'dano', `Dano do agarrão${constricao ? ' e constrição' : ''}: ${total}.`);
  K.causarDano(b, alvo, [{ valor: total, tipo: 'fisico' }], { fonte: c, ataque: { nome: 'agarrão', natural: true, magico: null } });
  return true;
}

/** Turno de quem está agarrado: tenta escapar (teste de agarrar) ou ataca quem o agarra. */
function turnoAgarrado(K, b, c) {
  const quem = b.get(c.agarradoPor);
  if (!quem || quem.estado === 'morto' || quem.agarrando !== c.uid) {
    c.agarradoPor = null;
    return false;
  }
  const chance = K.pAcerto(K.agarrarDe(c) - K.agarrarDe(quem), 11);
  const golpe = c.ataques.find(K.isMelee);
  if (chance >= 0.3 || !golpe) {
    const r = K.resistido(b, K.agarrarDe(c), K.agarrarDe(quem));
    K.log(b, c, 'agarrar', `${c.nome} tenta se soltar de ${quem.nome}: ${r.a} contra ${r.d} — ${r.venceu ? 'escapa' : 'continua preso'}.`);
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
  const golpe = [...c.ataques].filter(K.isMelee).sort((x, y) => y.bonus - x.bonus)[0];
  if (!golpe) return true;
  const d = b.rng.die(20);
  const bonus = golpe.bonus + K.modsDeAtaque(b, c, quem, golpe).total;
  const acerta = d === 20 || (d !== 1 && d + bonus >= engolir.m.ca_interna);
  let texto = `${c.nome}, engolido, ataca o interior de ${quem.nome}: ${d} ${K.sinal(bonus)} = ${d + bonus} contra CA ${engolir.m.ca_interna}`;
  if (acerta && !K.isZero(golpe.dano)) {
    const r = K.roll(b, golpe.dano);
    c.danoInterno += Math.max(1, r.total);
    texto += ` — acerta, ${Math.max(1, r.total)} de dano (${c.danoInterno} de ${engolir.m.pv_para_sair} para sair).`;
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
  const golpe = c.ataques.find(K.isMelee);
  if (golpe) K.golpe(b, c, quem, golpe);
  return true;
}

/** Enredar (chicote do balor, laço): teste resistido de Força; se vencer, o alvo fica enredado. */
function enredar(K, b, c, alvo, e) {
  if (!K.podeLutar(alvo) || alvo.cond.enredado) return;
  const r = K.resistido(b, K.mod(c.atributos.for ?? 10), K.mod(alvo.atributos.for ?? 10));
  K.log(b, c, 'especial', `${e.nome}: ${c.nome} ${r.venceu ? 'enreda' : 'não consegue enredar'} ${alvo.nome} (Força ${r.a} contra ${r.d}).`);
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
    K.log(b, c, 'especial', `${c.nome} tenta se soltar: ${d} ${K.sinal(bonus)} = ${d + bonus} contra CD ${cd[1]} — ${solta ? 'consegue' : 'não consegue'}.`);
  } else {
    const r = K.resistido(b, K.mod(c.atributos.for ?? 10), K.mod(quem.atributos.for ?? 10));
    solta = r.venceu;
    K.log(b, c, 'especial', `${c.nome} puxa para se soltar de ${quem.nome}: ${r.a} contra ${r.d} — ${solta ? 'consegue' : 'não consegue'}.`);
  }
  if (solta) K.removerCondicao(b, c, 'enredado');
}

/** Turno já resolvido por um especial (engolido, engolfado, agarrado, agarrando)? */
export function forcedTurn(K, b, c) {
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
        if (e.m.quando !== 'olhar' || K.gap(g, c) > (e.m.alcance_m ?? 9) || c.imunidades.includes('petrificação')) continue;
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
      K.log(b, x, 'dano', `${x.nome} é triturado dentro de ${c.nome}.`);
      K.causarDano(b, x, partes, { fonte: c, ataque: { nome: eng.nome, natural: true, magico: null } });
    }
    if (x.engolfadoPor === c.uid) {
      const eng = primeiro(c, 'engolfar');
      if (!eng?.m.dano_por_rodada) continue;
      const tipo = Array.isArray(eng.m.tipo_energia) ? eng.m.tipo_energia[0] : eng.m.tipo_energia || 'fisico';
      K.log(b, x, 'dano', `${x.nome} é dissolvido dentro de ${c.nome}.`);
      K.causarDano(b, x, [{ valor: K.roll(b, eng.m.dano_por_rodada).total, tipo }], { fonte: c, ignoraRD: true });
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
      x._imuneAura = x._imuneAura || [];
      if (x._imuneAura.includes(`${c.uid}:${e.id}`)) continue;
      const r = K.teste(b, x, m.resistencia, m.cd, { rotulo: `${e.nome} de ${c.nome}`, medo: Boolean(K.MEDO[m.condicao]) });
      if (r.passou) {
        x._imuneAura.push(`${c.uid}:${e.id}`); // quem passa fica imune (um dia, na 3.0)
        continue;
      }
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
    c.buffs.push({ nome: 'furia', rotulo: e.nome, atributos: { for: m.for, con: m.con }, bonus: { von: m.von, ca: m.ca }, pvExtra, expira: K.expiraEm(b, m.duracao_rodadas, c, c) });
    K.log(b, c, 'especial', `${c.nome} entra em ${e.nome}: +${m.for} For, +${m.con} Con (+${pvExtra} PV), +${m.von} Vontade, ${m.ca} CA, por ${m.duracao_rodadas} rodadas.`);
  }
}

export function onBuffEnd(K, b, c, bf) {
  if (bf.nome === 'furia') {
    c.pvMax = Math.max(1, c.pvMax - bf.pvExtra);
    c.pv -= bf.pvExtra;
    K.log(b, c, 'especial', `A fúria de ${c.nome} acaba: perde os ${bf.pvExtra} PV extras (fatigado até o fim da luta).`);
    K.aplicarCondicao(b, c, 'fatigado', Infinity, { fonte: c });
    K.atualizarEstado(b, c);
  } else if (b.registrar && bf.rotulo) K.log(b, c, 'condicao-fim', `${bf.rotulo} acaba para ${c.nome}.`);
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
function duracaoMedia(K, texto) {
  const t = loose(texto || '');
  if (!t || t.startsWith('permanente') || t.startsWith('enquanto')) return 10;
  const m = /(\d+d\d+(?:[+-]\d+)?|\d+)\s*(rodada|minuto|hora)/.exec(t);
  if (!m) return 1;
  const n = /d/.test(m[1]) ? K.average(m[1]) : Number(m[1]);
  return n * { rodada: 1, minuto: 10, hora: 600 }[m[2]];
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
function evDano(K, b, c, alvo, m) {
  if (m.afeta && !K.atende(alvo, m.afeta)) return 0;
  const apoio = K.aliados(b, c).some(x => x !== c && K.podeLutar(x));
  const repetido = c._controle?.[alvo.uid] === b.rodada - 1;
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
      ev += Math.max(0, parte * (alvo.vulnerabilidades.includes(t) ? 1.5 : 1) - (alvo.resistEnergia[t] || 0));
    }
  }
  for (const de of m.dano_extra || []) if (!alvo.imunidades.includes(de.tipo)) ev += Math.max(0, K.average(de.dano) * fator - (alvo.resistEnergia[de.tipo] || 0));
  if (m.condicao && (!m.condicao_afeta || K.atende(alvo, m.condicao_afeta))) ev += valorCondicao(K, alvo, m.condicao, m.duracao, apoio, repetido) * pf;
  for (const p of m.efeitos_por_dv || []) if (p.dv_max == null || alvo.dv <= p.dv_max) ev = Math.max(ev, p.condicao ? valorCondicao(K, alvo, p.condicao, p.duracao, apoio, repetido) : 2);
  if (m.veneno) ev += 3 * pf;
  return ev;
}

/** Magias e habilidades similares a magia disponíveis: [{ fonte, nome, m, natureza, nivel, cl, cd, idx? }]. */
function magiasDisponiveis(K, b, c) {
  const out = [];
  for (const e of comEfeito(c, 'magia')) {
    if (!disponivel(b, K, c, e)) continue;
    out.push({ tipo: 'especial', e, nome: e.nome, m: e.m, natureza: e.natureza, cl: e.m.nivel_conjurador ?? c.nd, cd: e.m.cd });
  }
  (c.magias?.lista || []).forEach((s, idx) => {
    if (!s.mecanica || c.magiasRestantes[idx] <= 0) return;
    out.push({ tipo: 'lista', idx, nome: s.nome, m: s.mecanica, natureza: 'magia', cl: s.mecanica.nivel_conjurador ?? c.magias.nivel_conjurador, cd: s.mecanica.cd ?? c.magias.cd_base + s.nivel });
  });
  return out;
}

const ehBuff = m => !m.dano && !m.condicao && !m.efeitos_por_dv && !m.cura && m.bonus && !m.ataque && !m.resistencia && !(m.bonus.niveis_negativos || m.bonus.penalidade_for);
const ehDebuff = m => m.bonus && (m.bonus.niveis_negativos || m.bonus.penalidade_for);
const podeConjurar = c => !c.agarradoPor && !c.agarrando && !c.engolidoPor && !c.engolfadoPor;

function feridos(K, b, c) {
  return K.aliados(b, c)
    .filter(x => x.estado !== 'morto' && !x.fugindo && !x.engolidoPor && x.tipo !== 'Morto-Vivo' && !x.imunidades.includes('magia'))
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
    if (conjura) for (const s of magiasDisponiveis(K, b, c)) if (s.m.cura) out.push({ tipo: 'magia', s, alvo: ferido, alvos: [ferido], ev: K.average(s.m.cura), prioridade: 5 });
  }
  // inspirar coragem na primeira ação
  for (const e of comEfeito(c, 'inspirar-coragem')) {
    if (!c._inspirou && disponivel(b, K, c, e)) out.push({ tipo: 'inspirar', e, ev: 1, prioridade: 3 });
  }
  if (!alvo) return out;
  const semInimigoAoAlcance = !K.inimigos(b, c).some(x => K.alvoValido(x) && [...c.ataqueTotal, ...c.ataques].some(a => K.ataqueAlcanca(c, x, a)));
  if (conjura) {
    for (const s of magiasDisponiveis(K, b, c)) {
      const m = s.m;
      if (m.cura) continue;
      if (ehBuff(m)) {
        const ativa = c.buffs.some(bf => bf.rotulo === s.nome);
        if (!ativa && b.rodada <= 2 && semInimigoAoAlcance) out.push({ tipo: 'magia', s, alvo: c, alvos: [c], ev: 0.5, prioridade: 1 });
        continue;
      }
      if (!m.dano && !m.condicao && !m.efeitos_por_dv && !ehDebuff(m)) continue;
      const plano = planejarArea(K, b, c, alvo, m.area, null, { noConjurador: Boolean(m.efeitos_por_dv) || m.alvo === 'pessoal' });
      if (!plano) continue;
      if (m.ataque === 'toque' && K.gap(c, alvo) - 1.5 > K.velocidade(c)) continue;
      const pFalhaMagia = chanceFalhaMagia(c, s) / 100;
      let ev = 0;
      for (const x of plano.alvos) {
        if (x.imunidades.includes('magia') && !excecaoDeImunidade(x, m)) continue;
        const pRm = x.rm && s.natureza !== 'Ext' && s.natureza !== 'Sob' ? Math.min(1, Math.max(0.05, (21 - (x.rm - s.cl)) / 20)) : 1;
        const pAcerto = m.ataque ? K.pAcerto(c.bba + K.mod(c.atributos.des ?? 10), x.ca.toque) : 1;
        ev += evDano(K, b, c, x, { ...m, cd: s.cd }) * pRm * pAcerto + (ehDebuff(m) ? 4 * pRm * pAcerto : 0);
      }
      ev *= 1 - pFalhaMagia;
      if (ev > 0) out.push({ tipo: 'magia', s, alvo, alvos: plano.alvos, mover: plano.mover, ev });
    }
  }
  // sopro
  for (const e of comEfeito(c, 'sopro')) {
    if (!disponivel(b, K, c, e)) continue;
    const plano = planejarArea(K, b, c, alvo, e.m.area, e.m.tamanho_m, { noConjurador: true });
    if (!plano) continue;
    const ev = plano.alvos.reduce((s, x) => s + evDano(K, b, c, x, e.m), 0);
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
      const ev = efeito === 'engolfar'
        ? alvos.reduce((s, x) => s + pf(x) * (x.pv * 0.8 + (e.m.dano_por_rodada ? K.average(e.m.dano_por_rodada) : 0)), 0)
        : alvos.reduce((s, x) => s + K.average(e.m.dano) * (pf(x) + (1 - pf(x)) * (e.m.metade_se_passar ? 0.5 : 0)), 0);
      out.push({ tipo: efeito, e, alvos, ev, prioridade: efeito === 'engolfar' ? 1 : 0 });
    }
  }
  return out;
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
  onAttackAction(K, b, c);
  gastarUso(K, b, c, e);
  const rec = e.m.recarga;
  const rodadas = typeof rec === 'number' ? rec : K.roll(b, rec).total;
  c.recarga[e.id] = K.expiraEm(b, rodadas, c, c);
  if (e.m.compartilhada_com) c.recarga[e.m.compartilhada_com] = c.recarga[e.id];
  const plano = planejarArea(K, b, c, acao.alvo, e.m.area, e.m.tamanho_m, { noConjurador: true });
  const alvos = plano ? plano.alvos : acao.alvos;
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
  const abrange = primeiro(x, 'imunidade-magia')?.m.abrange;
  const cobre = x.imunidades.includes('magia') && (!abrange || s.natureza === 'magia' || (s.natureza === 'SM' && abrange.some(a => /similar/.test(loose(a)))) || (s.natureza === 'Sob' && abrange.some(a => /sobrenatura/.test(loose(a)))));
  if (cobre && s.natureza !== 'Ext') {
    const excecao = excecaoDeImunidade(x, m);
    if (excecao) return { excecao };
    K.log(b, x, 'imune', `${x.nome} é imune a magia: ${s.nome} não o afeta.`);
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

const verbo = s => (s.natureza === 'magia' ? 'conjura' : 'usa');

function conjurar(K, b, c, acao) {
  const s = acao.s;
  const m = s.m;
  andarAntes(K, b, c, acao);
  if (s.tipo === 'lista') c.magiasRestantes[s.idx]--;
  else gastarUso(K, b, c, s.e);
  const falha = chanceFalhaMagia(c, s);
  if (falha && b.rng.chance(falha)) {
    K.log(b, c, 'magia', `${c.nome} tenta usar ${s.nome}, mas falha (${falha}% de chance de falha).`);
    return;
  }
  // reforço: em si mesmo ou nos aliados
  if (ehBuff(m)) {
    const alvos = m.alvo === 'aliados' ? K.aliados(b, c).filter(x => x.estado !== 'morto' && !x.fugindo) : [c];
    for (const x of alvos) aplicarReforco(K, b, c, x, s);
    return;
  }
  if (m.cura) {
    const x = acao.alvo;
    if (x.imunidades.includes('magia')) return;
    K.log(b, c, 'magia', `${c.nome} ${verbo(s)} ${s.nome} em ${x.nome}.`);
    K.curar(b, x, K.roll(b, m.cura).total, c);
    return;
  }
  const principal = acao.alvo && K.alvoValido(acao.alvo) ? acao.alvo : K.inimigos(b, c).find(K.alvoValido);
  if (!principal) return;
  const plano = planejarArea(K, b, c, principal, m.area, null, { noConjurador: Boolean(m.efeitos_por_dv) || m.alvo === 'pessoal' });
  const alvos = plano ? plano.alvos : [principal];
  K.log(b, c, 'magia', `${c.nome} ${verbo(s)} ${s.nome}${alvos.length ? ` em ${alvos.map(x => x.nome).join(', ')}` : ''}.`);
  if (m.condicao || m.efeitos_por_dv) {
    c._controle = c._controle || {};
    for (const x of alvos) c._controle[x.uid] = b.rodada;
  }
  for (const x of alvos) {
    const chega = magiaChega(K, b, c, x, s);
    if (chega === 'nao') continue;
    if (chega.excecao) {
      aplicarExcecao(K, b, c, x, m, chega.excecao, s.nome);
      continue;
    }
    const destino = chega.refletida ? c : x;
    if (m.ataque) {
      const d = b.rng.die(20);
      const bonus = c.bba + K.mod(c.atributos.des ?? 10) + K.deltaMod(c, 'des');
      const ca = K.caContra(b, destino, c, { tipo: m.ataque, nome: s.nome });
      const acerta = d === 20 || (d !== 1 && d + bonus >= ca);
      K.log(b, c, 'ataque', `${s.nome} (ataque de toque): ${d} ${K.sinal(bonus)} = ${d + bonus} contra CA de toque ${ca} — ${acerta ? 'acerta' : 'erra'}.`);
      if (!acerta) continue;
    }
    if (m.acerto_automatico && destino.buffs.some(bf => (bf.bonus?.anula || '').includes(s.nome))) {
      K.log(b, destino, 'defesa', `${destino.nome} está protegido contra ${s.nome}.`);
      continue;
    }
    K.efeitoComTeste(b, c, destino, { ...m, cd: s.cd }, { rotulo: s.nome, natureza: s.natureza, categoria: m.condicao === 'inconsciente' ? 'sono' : null });
    if (ehDebuff(m) && destino.estado !== 'morto') {
      if (m.bonus.niveis_negativos) drenar(K, b, c, destino, K.roll(b, String(m.bonus.niveis_negativos)).total, s.nome);
      if (m.bonus.penalidade_for) danoDeAtributo(K, b, destino, 'for', K.roll(b, String(m.bonus.penalidade_for)).total, c, s.nome);
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

function aplicarReforco(K, b, c, x, s) {
  const m = s.m;
  const bonus = { ...m.bonus };
  const atributos = {};
  for (const a of ['for', 'des', 'con', 'int', 'sab', 'car']) if (typeof bonus[a] === 'number') { atributos[a] = bonus[a]; delete bonus[a]; }
  if (bonus.pv_temporarios) {
    x.pvTemp = Math.max(x.pvTemp, Number(bonus.pv_temporarios) || 0);
    delete bonus.pv_temporarios;
  }
  if (bonus.imagens) {
    x.imagens = K.roll(b, String(bonus.imagens)).total;
    delete bonus.imagens;
  }
  const rodadas = K.parseDuracao(m.duracao || '10 rodadas', b.rng);
  x.buffs.push({ rotulo: s.nome, bonus, atributos, expira: K.expiraEm(b, rodadas, c, x) });
  K.log(b, c, 'magia', `${c.nome} ${verbo(s)} ${s.nome}${x === c ? '' : ` em ${x.nome}`}${rodadas === Infinity ? '' : ` (${rodadas} rodadas)`}.`);
}

function inspirar(K, b, c, e) {
  c._inspirou = true;
  gastarUso(K, b, c, e);
  const m = e.m;
  const alvos = K.aliados(b, c).filter(x => x.estado !== 'morto' && !x.fugindo);
  for (const x of alvos) x.buffs.push({ rotulo: e.nome, bardo: c.uid, bonus: { ataque: m.bonus_ataque, dano: m.bonus_dano, contra_medo: m.bonus_contra_medo || 0 }, expira: K.expiraEm(b, 5, c, x) });
  K.log(b, c, 'especial', `${c.nome} usa ${e.nome}: aliados ganham +${m.bonus_ataque} no ataque e +${m.bonus_dano} no dano${m.bonus_contra_medo ? `, +${m.bonus_contra_medo} contra medo` : ''}.`);
}

function curaPelasMaos(K, b, c, acao) {
  const x = acao.alvo;
  if (x !== c) K.mover(c, x, 1.5, K.velocidade(c));
  const pool = c.usos[acao.e.id];
  const valor = Math.min(pool.n, x.pvMax - x.pv);
  pool.n -= valor;
  K.log(b, c, 'especial', `${c.nome} usa ${acao.e.nome} em ${x.nome} (${pool.n} PV restantes hoje).`);
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

function esmagar(K, b, c, acao) {
  const e = acao.e;
  K.log(b, c, 'especial', `${c.nome} usa ${e.nome} sobre ${acao.alvos.map(x => x.nome).join(', ')}.`);
  const corpo = { nome: e.nome, natural: true, magico: null };
  for (const x of acao.alvos) K.efeitoComTeste(b, c, x, { dano: e.m.dano, resistencia: e.m.resistencia, cd: e.m.cd, metade_se_passar: Boolean(e.m.metade_se_passar) }, { rotulo: e.nome, ignoraRD: false, ataque: corpo });
}
