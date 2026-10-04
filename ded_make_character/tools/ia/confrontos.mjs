/**
 * Confrontos para o treino e a avaliação da IA (TASK_009 §5.1 e §5.2): a reserva de teste, a
 * montagem dos lados e o equilíbrio pelo resultado (pré-teste com a IA clássica).
 *
 * Tudo sai da semente: o confronto de número `i` é sempre o mesmo, e os workers do gerador montam
 * cada um o seu sem trocar arquivos. Os combatentes são referências:
 * - `{ ref: 'cat:<id>', pv }`: ficha do catálogo, com os PV rolados pelos dados de vida (ou a média);
 * - `{ ref: 'sint:<n>', nivel }`: personagem sintético de número n, no nível dado.
 */
import { readFileSync } from 'node:fs';
import * as C from '../../js/rules/combat30.js';
import { createRng } from '../../js/rules/dice.js';
import { nivelDeEncontro } from '../../js/rules/encontro30.js';
import { perfilDe } from '../../js/rules/ia30.js';
import { personagemSintetico } from './personagens-sinteticos.mjs';
import { CLASSES } from './personagens.mjs';

const cat = JSON.parse(readFileSync(new URL('../../data/catalogo-combate.json', import.meta.url), 'utf8'));
export const CATALOGO = [...cat.monstros, ...cat.holy_avenger];
const porId = new Map(CATALOGO.map(e => [e.id, e]));

/** Classes reservadas para o teste (§5.1): nunca entram no treino. */
export const CLASSES_RESERVADAS = ['ladino', 'feiticeiro'];
export const CLASSES_DE_TREINO = Object.keys(CLASSES).filter(c => !CLASSES_RESERVADAS.includes(c));

// ---------------------------------------------------------------------------------------------
// reserva de teste

/** O que a ficha tem de mecânica: os efeitos dos especiais e o que as magias fazem. */
export function marcasDe(e) {
  const f = C.fromCatalog(e);
  const marcas = new Set(f.especiais.map(x => x.mecanica?.efeito).filter(Boolean));
  for (const s of f.magias?.lista || []) {
    const m = s.mecanica;
    if (!m) continue;
    for (const k of ['repete', 'persistente', 'continuo', 'limite_dv', 'efeitos_por_dv', 'cura']) if (m[k]) marcas.add(`magia:${k}`);
    if (m.condicao) marcas.add(`magia:condicao:${m.condicao}`);
  }
  if (f.regeneracao) marcas.add('regeneracao');
  return marcas;
}

const ehPaladino = e => /^paladino/i.test(e.nome);

/**
 * As 15 fichas do catálogo reservadas para o teste (§5.1), sorteadas com duas regras:
 * - cada mecânica continua no treino em pelo menos 60% das fichas que a têm (e em pelo menos uma):
 *   a única portadora nunca sai; das 3 com Produzir Chamas, ficam 2; das 4 com ataque furtivo, 3;
 * - no máximo 1 Paladino.
 */
export function reservaDeTeste({ semente = 'reserva-de-teste', quantas = 15 } = {}) {
  const rng = createRng(semente);
  const marcas = new Map(CATALOGO.map(e => [e.id, marcasDe(e)]));
  const portadoras = {};
  for (const ms of marcas.values()) for (const m of ms) portadoras[m] = (portadoras[m] || 0) + 1;
  const minimo = m => Math.max(1, Math.ceil(0.6 * portadoras[m]));
  const restantes = { ...portadoras };
  const ordem = CATALOGO.map(e => e.id);
  for (let i = ordem.length - 1; i > 0; i--) {
    const j = rng.die(i + 1) - 1;
    [ordem[i], ordem[j]] = [ordem[j], ordem[i]];
  }
  const reservadas = [];
  for (const id of ordem) {
    if (reservadas.length >= quantas) break;
    const e = porId.get(id);
    if (ehPaladino(e) && reservadas.some(r => ehPaladino(porId.get(r)))) continue;
    const ms = marcas.get(id);
    if ([...ms].some(m => restantes[m] - 1 < minimo(m))) continue;
    for (const m of ms) restantes[m]--;
    reservadas.push(id);
  }
  return reservadas;
}

// ---------------------------------------------------------------------------------------------
// fichas

/** Rola dados de vida com vários termos ("3d10+1d4+4"); sem `rng`, devolve a média. */
export function rolarDadosDeVida(rng, texto) {
  let total = 0;
  for (const [, sinal, termo] of String(texto).replace(/\s/g, '').matchAll(/([+-]?)([^+-]+)/g)) {
    const m = /^(\d+)d(\d+)$/.exec(termo);
    const dados = m && (rng ? Array.from({ length: Number(m[1]) }, () => rng.die(Number(m[2]))).reduce((s, x) => s + x, 0) : (Number(m[1]) * (Number(m[2]) + 1)) / 2);
    const v = m ? dados : Number(termo);
    total += sinal === '-' ? -v : v;
  }
  return rng ? Math.max(1, total) : total;
}

/**
 * PV rolados de uma ficha do catálogo, centrados nos PV dela: a rolagem dos dados de vida mais a
 * diferença entre os PV da ficha e a média dos dados. Nas fichas de Holy Avenger, os dados de vida
 * não trazem a Constituição nem o máximo do 1º nível, e a rolagem sozinha ficaria até 40% abaixo.
 */
export function pvRolados(rng, e) {
  return Math.max(1, Math.round(rolarDadosDeVida(rng, e.dados_vida) + (e.pv - rolarDadosDeVida(null, e.dados_vida))));
}

const cacheCatalogo = new Map();
const cacheSinteticos = new Map();

/** Ficha de combate de uma referência de combatente. */
export function fichaDe(r) {
  if (r.ref.startsWith('cat:')) {
    const id = r.ref.slice(4);
    if (!cacheCatalogo.has(id)) cacheCatalogo.set(id, C.fromCatalog(porId.get(id)));
    const f = cacheCatalogo.get(id);
    return r.pv ? { ...f, pvMax: r.pv } : f;
  }
  const chave = `${r.ref}@${r.nivel}${r.reservado ? ':reservado' : ''}`;
  if (!cacheSinteticos.has(chave)) {
    const n = Number(r.ref.slice(5));
    cacheSinteticos.set(chave, personagemSintetico(n, { nivel: r.nivel, classes: r.reservado ? CLASSES_RESERVADAS : CLASSES_DE_TREINO }).ficha);
  }
  return cacheSinteticos.get(chave);
}

/** "Força" de um combatente para montar lados parecidos: o ND da ficha (ou o nível do personagem). */
const forca = r => (r.ref.startsWith('cat:') ? porId.get(r.ref.slice(4)).nd : r.nivel);

// ---------------------------------------------------------------------------------------------
// montagem

const FORMATOS = [['1x1', 35], ['grupo-pj', 35], ['misto', 20], ['grande', 10]];

/**
 * O confronto de número `i`. `catalogo` são as fichas permitidas (o treino tira as reservadas, o
 * teste usa só elas); `ancora` (opcional) é o id da ficha que tem de estar no lado A (as cotas por
 * ficha: o gerador passa as fichas em rodízio). `reservado` monta os sintéticos com as classes de
 * teste. Devolve `{ id, semente, formato, ladoA, ladoB, distancia }`, ainda sem o pré-teste.
 */
export function montarConfronto(i, { semente = 'confrontos', catalogo, ancora = null, reservado = false }) {
  const rng = createRng(`${semente}:${i}`);
  const sorteio = rng.die(100);
  let acumulado = 0;
  const formato = FORMATOS.find(([, p]) => (acumulado += p) >= sorteio)[0];
  const catalogoComPv = id => {
    const e = porId.get(id);
    // em metade das vezes, os PV rolados pelos dados de vida (a rede não decora "o troll tem 63 PV")
    return { ref: `cat:${id}`, pv: rng.die(2) === 1 ? pvRolados(rng, e) : null };
  };
  const sintetico = nivel => ({ ref: `sint:${rng.die(1e9)}`, nivel: Math.min(20, Math.max(1, Math.round(nivel))), ...(reservado ? { reservado: true } : {}) });
  /** Alguém de força parecida com `alvo`: do catálogo (de ND até 2 de diferença) ou sintético. */
  const parecido = alvo => {
    const perto = catalogo.filter(e => Math.abs(e.nd - alvo) <= 2);
    if (alvo > 20 || (perto.length && rng.die(2) === 1)) {
      const pool = perto.length ? perto : [...catalogo].sort((x, y) => Math.abs(x.nd - alvo) - Math.abs(y.nd - alvo)).slice(0, 5);
      return catalogoComPv(pool[rng.die(pool.length) - 1].id);
    }
    return sintetico(alvo + rng.die(5) - 3);
  };
  const qualquer = () => (rng.die(2) === 1 ? catalogoComPv(catalogo[rng.die(catalogo.length) - 1].id) : sintetico(rng.die(20)));
  // a âncora nunca sai no equilíbrio (é a cota da ficha)
  const primeiro = ancora ? { ...catalogoComPv(ancora), ancora: true } : qualquer();
  let ladoA = [primeiro];
  let ladoB = [];
  if (formato === '1x1') ladoB = [parecido(forca(primeiro))];
  else if (formato === 'grupo-pj') {
    // um grupo de personagens contra criaturas; a âncora (se houver) fica entre as criaturas
    const nivel = ancora ? Math.min(20, Math.max(1, Math.round(forca(primeiro)))) : rng.die(20);
    const grupo = Array.from({ length: 1 + rng.die(3) }, () => sintetico(nivel));
    const criaturas = [primeiro];
    while (criaturas.length < 6 && nivelDeEncontro(criaturas.map(forca)) < nivel + 1) criaturas.push(parecido(Math.max(1, nivel - 2)));
    [ladoA, ladoB] = [criaturas, grupo];
  } else {
    const tamanho = formato === 'misto' ? 1 + rng.die(3) : 4 + rng.die(6);
    while (ladoA.length < tamanho) ladoA.push(rng.die(2) === 1 ? parecido(forca(primeiro)) : qualquer());
    const ne = nivelDeEncontro(ladoA.map(forca));
    while (ladoB.length < tamanho) ladoB.push(parecido(Math.max(1, ne - 2 * Math.log2(tamanho))));
  }
  return { id: `${semente}:${i}`, semente: `${semente}:${i}`, formato, ladoA, ladoB, distancia: 1.5 * rng.die(20) };
}

/**
 * Vitória do lado A em `vezes` lutas rápidas com a IA clássica (sementes do pré-teste). Se as
 * primeiras 8 tiverem todas o mesmo vencedor, para ali: o confronto está desequilibrado de qualquer jeito.
 */
export function preTeste(conf, vezes = 16) {
  const ladoA = conf.ladoA.map(fichaDe);
  const ladoB = conf.ladoB.map(fichaDe);
  let a = 0;
  for (let k = 0; k < vezes; k++) {
    const fim = C.runBattle(C.createBattle({ ladoA, ladoB, semente: `${conf.semente}:pre:${k}`, distancia: conf.distancia, registrar: false }));
    a += fim.vencedor === 'A' ? 1 : fim.vencedor ? 0 : 0.5;
    if (k === 7 && (a === 0 || a === 8)) return a / 8;
  }
  return a / vezes;
}

/**
 * Equilibra pelo resultado (§5.2): enquanto a vitória de A no pré-teste estiver fora de 20%–80%,
 * enfraquece o lado forte ou fortalece o fraco (até 6 ajustes): tira ou põe um membro (até 10 por
 * lado), ou muda em 2 a 4 o nível de um personagem sintético. Devolve o confronto com `preTeste`,
 * `ajustes` e `equilibrado`.
 */
export function equilibrar(conf, { catalogo }) {
  const rng = createRng(`${conf.semente}:ajuste`);
  const atual = { ...conf, ladoA: [...conf.ladoA], ladoB: [...conf.ladoB] };
  let v = preTeste(atual);
  let ajustes = 0;
  for (; ajustes < 6 && (v < 0.2 || v > 0.8); ajustes++) {
    const forte = v > 0.8 ? 'ladoA' : 'ladoB';
    const fraco = forte === 'ladoA' ? 'ladoB' : 'ladoA';
    const lado = rng.die(2) === 1 ? forte : fraco;
    const lista = atual[lado];
    const sinteticos = lista.map((r, k) => [r, k]).filter(([r]) => r.ref.startsWith('sint:'));
    const delta = (lado === forte ? -1 : 1) * (1 + rng.die(3));
    if (sinteticos.length && rng.die(2) === 1) {
      const [r, k] = sinteticos[rng.die(sinteticos.length) - 1];
      lista[k] = { ...r, nivel: Math.min(20, Math.max(1, r.nivel + delta)) };
    } else if (lado === forte && lista.filter(r => !r.ancora).length && lista.length > 1) {
      const removiveis = lista.map((r, k) => [r, k]).filter(([r]) => !r.ancora);
      lista.splice(removiveis[rng.die(removiveis.length) - 1][1], 1);
    } else if (lado === fraco && lista.length < 10) {
      const modelo = lista[rng.die(lista.length) - 1];
      const { ancora: _, ...copia } = modelo;
      lista.push(modelo.ref.startsWith('cat:') ? copia : { ...copia, ref: `sint:${rng.die(1e9)}` });
    } else continue;
    v = preTeste(atual);
  }
  return { ...atual, preTeste: v, ajustes, equilibrado: v >= 0.2 && v <= 0.8 };
}

/** Algum combatente do confronto é do perfil recursos? */
export const temRecursos = conf => [...conf.ladoA, ...conf.ladoB].some(r => perfilDe(fichaDe(r)) === 'recursos');

/**
 * Confronto de treino de número `i` (§5.2): montado, com pelo menos 80% dos confrontos com alguém
 * do perfil recursos, e equilibrado pelo pré-teste. Dos que não equilibram, 15% ficam (a cabeça de
 * margem aprende a jogar bem com a vitória certa); os outros são trocados por uma nova montagem.
 */
export function confrontoDeTreino(i, { semente = 'treino', catalogo, ancora = null }) {
  const rng = createRng(`${semente}:${i}:aceite`);
  let conf = null;
  for (let t = 0; t < 20; t++) {
    conf = montarConfronto(t ? `${i}.${t}` : i, { semente, catalogo, ancora });
    if (!temRecursos(conf) && rng.die(100) <= 75) continue;
    conf = equilibrar(conf, { catalogo });
    if (!conf.equilibrado && rng.die(100) > 15) continue;
    return { ...conf, indice: i, tentativas: t + 1 };
  }
  return { ...conf, indice: i, tentativas: 20 };
}
