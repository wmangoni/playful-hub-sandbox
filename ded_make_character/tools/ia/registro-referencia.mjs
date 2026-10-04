/**
 * Registro de referência da IA clássica (TASK_009 §9, E1).
 *
 * Roda 12.952 lutas fixas e grava o registro de cada uma, evento a evento (`rodada|ator|tipo|texto`):
 * - 10.952 lutas 1 × 1: todo o catálogo contra todo o catálogo, com 2 sementes;
 * - 2.000 lutas em grupo, de 2 × 2 a 4 × 4, com fichas do catálogo e personagens montados com o kit
 *   e as magias padrão, e distância sorteada.
 *
 *   node ded_make_character/tools/ia/registro-referencia.mjs gravar  <arquivo.jsonl.gz>
 *   node ded_make_character/tools/ia/registro-referencia.mjs comparar <arquivo.jsonl.gz> [--eco]
 *
 * `comparar` refaz as lutas e mostra as que mudaram. Com `--eco`, os dois lados usam uma política
 * que lista `candidatas()` antes de cada decisão, confere que a escolha da heurística está entre
 * elas (mesmo tipo, alvo, `ev` e prioridade) e devolve a escolha da heurística: o registro tem de
 * dar igual, porque listar não pode mudar nada.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import * as C from '../../js/rules/combat30.js';
import { createRng } from '../../js/rules/dice.js';
import { montarPersonagem, CLASSES, RACAS } from './personagens.mjs';

const cat = JSON.parse(readFileSync(new URL('../../data/catalogo-combate.json', import.meta.url), 'utf8'));
const CATALOGO = [...cat.monstros, ...cat.holy_avenger];

/** Personagens da referência: as 11 classes em 9 níveis, com a raça sorteada (semente fixa). */
function personagensDaReferencia() {
  const rng = createRng('referencia-personagens');
  const racas = Object.keys(RACAS);
  const out = [];
  for (const classe of Object.keys(CLASSES)) {
    for (const nivel of [1, 2, 4, 6, 9, 12, 15, 18, 20]) {
      const raca = racas[rng.die(racas.length) - 1];
      const ranks = classe === 'bardo' ? { atuacao: nivel + 3 } : {};
      const r = montarPersonagem({ classe, raca, nivel, ranks, nome: `${classe} ${nivel} (${raca})` });
      if (r.ficha) out.push(r.ficha);
    }
  }
  return out;
}

/** As lutas da referência, sempre na mesma ordem. */
export function lutasDaReferencia() {
  const fichas = new Map(CATALOGO.map(e => [e.id, C.fromCatalog(e)]));
  const lutas = [];
  for (const a of CATALOGO) for (const d of CATALOGO) for (const s of [1, 2]) {
    lutas.push({ id: `1x1:${a.id}:${d.id}:${s}`, ladoA: [fichas.get(a.id)], ladoB: [fichas.get(d.id)], semente: `ref:${a.id}:${d.id}:${s}`, distancia: 9 });
  }
  const pjs = personagensDaReferencia();
  const rng = createRng('referencia-grupos');
  const membro = () => (rng.die(2) === 1 ? fichas.get(CATALOGO[rng.die(CATALOGO.length) - 1].id) : pjs[rng.die(pjs.length) - 1]);
  for (let k = 0; k < 2000; k++) {
    const ladoA = Array.from({ length: 1 + rng.die(3) }, membro);
    const ladoB = Array.from({ length: 1 + rng.die(3) }, membro);
    lutas.push({ id: `grupo:${k}`, ladoA, ladoB, semente: `ref:grupo:${k}`, distancia: 1.5 * rng.die(20) });
  }
  return { lutas, personagens: pjs.length };
}

const mesmo = (x, y) => Math.abs(x - y) < 1e-9;
const golpes = a => (a.golpes || []).map(g => `${g.nome}:${g.mao ?? ''}`).join(',');

/** A candidata marcada é a mesma ação que a IA clássica escolheu? Devolve o que difere, ou null. */
export function diferencaDaClassica(x, h) {
  const campos = [
    ['tipo', x.tipo, h.tipo],
    ['alvo', x.alvo?.uid ?? null, h.alvo?.uid ?? null],
    ['magia', x.s?.nome ?? null, h.s?.nome ?? null],
    ['espaço', x.s?.espaco ?? null, h.s?.espaco ?? null],
    ['especial', x.e?.id ?? null, h.e?.id ?? null],
    ['golpes', golpes(x), golpes(h)],
    ['mover', x.mover ?? null, h.mover ?? null],
    ['prioridade', x.prioridade || 0, h.prioridade || 0],
  ];
  const d = campos.filter(([, a, b]) => a !== b).map(([nome, a, b]) => `${nome} ${a} × ${b}`);
  if (!mesmo(x.ev, h.ev)) d.push(`ev ${x.ev} × ${h.ev}`);
  return d.length ? d.join('; ') : null;
}

/**
 * Política "eco": lista as candidatas, confere a escolha da heurística e devolve essa escolha.
 * `parada` conta as decisões em que a heurística não age, mas há o que fazer contra outro alvo
 * (Helena escolhe o Tarrasque, contra quem o sopro não vale nada, e fica parada).
 */
function politicaEco(problemas, parada) {
  return (b, c, ia) => {
    const lista = ia.candidatas(b, c);
    const h = ia.classica(b, c);
    const marcada = lista.filter(x => x.heuristica);
    if (!h) {
      if (marcada.length) problemas.push(`${c.nome}: a heurística não age, mas há candidata marcada`);
      if (lista.length) parada.n++;
      return null;
    }
    const x = marcada[0];
    if (marcada.length !== 1) problemas.push(`${c.nome}: escolha da heurística marcada ${marcada.length} vezes (${h.tipo})`);
    else {
      const d = diferencaDaClassica(x, h);
      if (d) problemas.push(`${c.nome}: a candidata marcada difere da escolha clássica (${d})`);
    }
    return h;
  };
}

function rodar(luta, politicas = null) {
  const b = C.createBattle({ ladoA: luta.ladoA, ladoB: luta.ladoB, semente: luta.semente, distancia: luta.distancia, ...(politicas ? { politicas } : {}) });
  C.runBattle(b);
  return { id: luta.id, vencedor: b.fim.vencedor, eventos: b.eventos.map(e => `${e.rodada}|${e.ator}|${e.tipo}|${e.texto}`) };
}

async function main() {
  const [modo, arquivo, ...resto] = process.argv.slice(2);
  if (!['gravar', 'comparar'].includes(modo) || !arquivo) {
    console.error('uso: registro-referencia.mjs gravar|comparar <arquivo.jsonl.gz> [--eco]');
    process.exit(2);
  }
  const { lutas, personagens } = lutasDaReferencia();
  const t0 = Date.now();
  if (modo === 'gravar') {
    // o cabeçalho diz de que commit é o registro (e se o motor ou os dados tinham mudanças sem commit)
    const git = cmd => execSync(`git ${cmd}`, { cwd: new URL('.', import.meta.url), encoding: 'utf8' }).trim();
    const cabecalho = { commit: git('rev-parse --short HEAD'), motorAlterado: Boolean(git('status --porcelain -- ../../js ../../data')), data: new Date().toISOString(), lutas: lutas.length, personagens };
    const linhas = [JSON.stringify({ cabecalho }), ...lutas.map(l => JSON.stringify(rodar(l)))];
    writeFileSync(arquivo, gzipSync(linhas.join('\n')));
    console.log(`${lutas.length} lutas gravadas (${personagens} personagens) em ${((Date.now() - t0) / 1000).toFixed(1)} s: ${arquivo}`);
    return;
  }
  const eco = resto.includes('--eco');
  if (eco && typeof C.candidatas !== 'function') throw new Error('--eco precisa de candidatas() no motor');
  const referencia = gunzipSync(readFileSync(arquivo)).toString('utf8').split('\n').map(l => JSON.parse(l));
  if (referencia[0]?.cabecalho) {
    const { commit, motorAlterado, data } = referencia.shift().cabecalho;
    console.log(`referência do commit ${commit}${motorAlterado ? ' (com o motor alterado)' : ''}, gravada em ${data}`);
  }
  if (referencia.length !== lutas.length) throw new Error(`a referência tem ${referencia.length} lutas; a lista atual, ${lutas.length}`);
  const problemas = [];
  const parada = { n: 0 };
  const politica = eco ? politicaEco(problemas, parada) : null;
  let diferentes = 0;
  lutas.forEach((l, i) => {
    const ref = referencia[i];
    const agora = rodar(l, politica ? { A: politica, B: politica } : null);
    if (ref.id !== agora.id) throw new Error(`luta ${i}: ${ref.id} × ${agora.id}`);
    const n = Math.max(ref.eventos.length, agora.eventos.length);
    const k = Array.from({ length: n }, (_, j) => j).find(j => ref.eventos[j] !== agora.eventos[j]);
    if (k == null && ref.vencedor === agora.vencedor) return;
    diferentes++;
    if (diferentes <= 5) console.log(`DIFERENTE ${l.id}, evento ${k}:\n  antes: ${ref.eventos[k]}\n  agora: ${agora.eventos[k]}`);
  });
  for (const p of problemas.slice(0, 10)) console.log(`ECO: ${p}`);
  const resumoEco = eco ? `, ${problemas.length} problemas nas candidatas; ${parada.n} decisões em que a heurística fica parada com o que fazer contra outro alvo` : '';
  console.log(`${lutas.length} lutas comparadas${eco ? ' (eco)' : ''} em ${((Date.now() - t0) / 1000).toFixed(1)} s: ${diferentes} diferentes${resumoEco}`);
  if (diferentes || problemas.length) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
