/**
 * Avaliação da IA treinada (TASK_009 §7), em workers: o "espelho".
 *
 *   node ded_make_character/tools/ia/avaliar.mjs --redes D:/…/redes/v1 --conjunto teste|validacao|vitrine \
 *     [--confrontos 500] [--lutas 200] [--delta 0.2] [--workers 10] [--saida relatorio.json]  *     [--semente outra] [--modos recursos,marcial,ambas]
 *
 * `--semente` monta outros confrontos com as mesmas fichas do conjunto (uma rodada nova e
 * independente); `--modos` roda só os modos dados.
 *
 * Para cada confronto, as mesmas sementes rodam com a rede de um lado (o lado A nos confrontos pares,
 * o B nos ímpares) e com a IA clássica dos dois lados; o ganho é a diferença na vitória do lado da
 * rede. As lutas usam um fluxo de dados por combatente, que mantém os dados casados por mais tempo.
 * Três modos: só a rede de recursos, só a marcial, e as duas.
 *
 * - `teste`: confrontos montados só com as fichas reservadas (§5.1): 15 do catálogo e os sintéticos
 *   de ladino e feiticeiro. Ninguém ali entrou no treino.
 * - `validacao`: confrontos novos com as fichas do treino (escolher a geração e o δ, §6.3).
 * - `vitrine`: os confrontos da Arena (Paladino × Tarrasque, Mestre Arsenal, Nekapeth…).
 *
 * O ganho médio é calculado nos confrontos com a vitória de base (pelo pré-teste) entre 20% e 80%;
 * nos modos de uma rede só, apenas nos confrontos em que o lado da rede tem alguém daquele perfil
 * (nos outros a rede não age e o ganho seria 0 por construção).
 * Perda num confronto, em duas etapas (§7): suspeito se o ganho nas lutas ficar abaixo de −5 p.p.;
 * confirmado se, com 2.000 sementes novas, o limite superior do intervalo unilateral de 95% ficar
 * abaixo de −5 p.p., com a correção de Benjamini–Hochberg entre os suspeitos.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import * as C from '../../js/rules/combat30.js';
import { criarRede, politicaRede, perfilDe, DELTA_PADRAO } from '../../js/rules/ia30.js';
import { CATALOGO, reservaDeTeste, montarConfronto, equilibrar, preTeste, fichaDe } from './confrontos.mjs';
import { montarPersonagem } from './personagens.mjs';

const MODOS = ['recursos', 'marcial', 'ambas'];
const VITRINE = [
  ['ha-paladino-de-arton', 'tarrasque'], ['ha-paladino-de-arton', 'ha-mestre-arsenal'], ['ha-paladino-de-arton', 'ha-nekapeth'],
  ['ha-paladino-de-arton', 'balor'], ['ha-paladino-de-arton', 'dragao-de-prata-antigo'], ['ha-paladino-desperto', 'ha-paladino-matador-de-dragoes'],
  ['ha-paladino-completo', 'ha-paladino-avancado'], ['ha-nekapeth', 'ha-mestre-arsenal'], ['dragao-vermelho-adulto', 'balor'],
  ['ha-lisandra-ex-druida', 'dragao-azul-antigo'], ['ha-niele-extraplanar', 'ha-tork-dragao-verde'], ['tarrasque', 'dragao-de-prata-antigo'],
];

function argumentos(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') || argv[i + 1] == null ? true : argv[++i];
  return out;
}

/**
 * O confronto k do conjunto. Teste e validação são montados e equilibrados como no treino (§5.2), com
 * outra semente, e remontados (até 20 vezes) até equilibrar; a vitrine fica como está (o pré-teste só
 * mede a vitória de base).
 */
function confrontoDo(conjunto, k, semente = conjunto) {
  if (conjunto === 'vitrine') {
    const [a, b] = VITRINE[k];
    const conf = { id: `vitrine:${a}×${b}`, semente: `vitrine:${k}`, formato: '1x1', ladoA: [{ ref: `cat:${a}` }], ladoB: [{ ref: `cat:${b}` }], distancia: 9 };
    return { ...conf, preTeste: preTeste(conf) };
  }
  const reserva = new Set(reservaDeTeste());
  const teste = conjunto === 'teste';
  const catalogo = CATALOGO.filter(e => reserva.has(e.id) === teste);
  let conf = null;
  for (let t = 0; t < 20 && !conf?.equilibrado; t++) conf = { ...equilibrar(montarConfronto(t ? `${k}.${t}` : k, { semente, catalogo, reservado: teste }), { catalogo }), tentativas: t + 1 };
  return conf;
}

const vitoria = (fim, lado) => (fim.vencedor === lado ? 1 : fim.vencedor ? 0 : 0.5);

/** As lutas de um confronto com as sementes `${semente}:${prefixo}:s` e as políticas dadas. */
function lutar(conf, politicas, lutas, prefixo) {
  const ladoA = conf.ladoA.map(fichaDe);
  const ladoB = conf.ladoB.map(fichaDe);
  return Array.from({ length: lutas }, (_, s) => C.runBattle(C.createBattle({ ladoA, ladoB, semente: `${conf.semente}:${prefixo}:${s}`, distancia: conf.distancia, registrar: false, rngPorCombatente: true, politicas })));
}

/** Ganho da rede num confronto: as mesmas sementes com a rede de um lado e com a clássica (`base`, já jogada). */
function espelho(conf, politica, ladoDaRede, base, prefixo) {
  const com = lutar(conf, { [ladoDaRede]: politica }, base.length, prefixo);
  const diferencas = com.map((fim, s) => vitoria(fim, ladoDaRede) - vitoria(base[s], ladoDaRede));
  const empatesRede = com.filter(fim => !fim.vencedor).length;
  const empatesClassica = base.filter(fim => !fim.vencedor).length;
  const n = diferencas.length;
  const media = diferencas.reduce((s, x) => s + x, 0) / n;
  const dp = Math.sqrt(diferencas.reduce((s, x) => s + (x - media) ** 2, 0) / Math.max(1, n - 1));
  return { ganho: media, ep: dp / Math.sqrt(n), empatesRede: empatesRede / n, empatesClassica: empatesClassica / n };
}

/** Φ (normal padrão acumulada), pela aproximação de Abramowitz–Stegun. */
function phi(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

function trabalhar({ w, W, conjunto, n, lutas, redes: arquivos, delta, semente, modos }) {
  const redes = Object.fromEntries(Object.entries(arquivos).map(([p, f]) => [p, criarRede(JSON.parse(readFileSync(f, 'utf8')))]));
  const politicas = { recursos: politicaRede({ recursos: redes.recursos }, { delta }), marcial: politicaRede({ marcial: redes.marcial }, { delta }), ambas: politicaRede(redes, { delta }) };
  const total = conjunto === 'vitrine' ? VITRINE.length : n;
  parentPort.on('message', ({ fase, itens }) => {
    if (fase === 'espelho') {
      for (let k = w; k < total; k += W) {
        const conf = confrontoDo(conjunto, k, semente);
        const lado = k % 2 === 0 ? 'A' : 'B';
        const base = lado === 'A' ? conf.preTeste : 1 - conf.preTeste;
        const perfis = [...new Set((lado === 'A' ? conf.ladoA : conf.ladoB).map(r => perfilDe(fichaDe(r))))];
        const classica = lutar(conf, null, lutas, 'aval');
        const ganhos = Object.fromEntries(modos.map(m => [m, espelho(conf, politicas[m], lado, classica, 'aval')]));
        parentPort.postMessage({ tipo: 'confronto', k, id: conf.id, formato: conf.formato, lado, base, perfis, tentativas: conf.tentativas ?? 1, tamanho: conf.ladoA.length + conf.ladoB.length, conf, modos: ganhos });
      }
    } else {
      for (const { k, conf, lado, modo } of itens.filter((_, j) => j % W === w)) {
        parentPort.postMessage({ tipo: 'suspeito', k, modo, ...espelho(conf, politicas[modo], lado, lutar(conf, null, 2000, 'confirma'), 'confirma') });
      }
    }
    parentPort.postMessage({ tipo: 'fim' });
  });
}

/** Tempo de 1.000 lutas com a clássica e com a rede nos dois lados (1 × 1 e 3 × 3, §7). */
function medirLote(redes, delta) {
  const cat = id => C.fromCatalog(CATALOGO.find(e => e.id === id));
  const pj = (classe, nivel) => montarPersonagem({ classe, nivel }).ficha;
  const pol = politicaRede(redes, { delta });
  const cenarios = { '1 × 1': { ladoA: [pj('mago', 9)], ladoB: [cat('troll')] }, '3 × 3': { ladoA: [pj('guerreiro', 8), pj('clerigo', 8), pj('mago', 8)], ladoB: [cat('ogro'), cat('ogro'), cat('troll')] } };
  const out = {};
  for (const [nome, luta] of Object.entries(cenarios)) {
    const tempo = politicas => {
      const t0 = performance.now();
      C.simulate({ ...luta, politicas }, { vezes: 1000, semente: 1 });
      return performance.now() - t0;
    };
    const classica = tempo(null);
    const rede = tempo({ A: pol, B: pol });
    out[nome] = { classicaMs: classica, redeMs: rede, razao: rede / classica };
  }
  return out;
}

async function main() {
  const a = argumentos(process.argv.slice(2));
  const conjunto = a.conjunto || 'teste';
  const n = Number(a.confrontos ?? 500);
  const lutas = Number(a.lutas ?? 200);
  const delta = Number(a.delta ?? DELTA_PADRAO);
  const W = Number(a.workers ?? Math.max(1, availableParallelism() - 2));
  const semente = a.semente || conjunto;
  const modos = String(a.modos || MODOS.join(',')).split(',').filter(m => MODOS.includes(m));
  const redes = { marcial: `${a.redes}/rede-marcial.json`, recursos: `${a.redes}/rede-recursos.json` };
  const t0 = Date.now();
  const resultados = [];
  const confirmacoes = [];
  const workers = Array.from({ length: W }, (_, w) => new Worker(fileURLToPath(import.meta.url), { workerData: { w, W, conjunto, n, lutas, redes, delta, semente, modos } }));
  const fase = (nome, itens = []) => Promise.all(workers.map(wk => new Promise((ok, falha) => {
    const ouvir = m => {
      if (m.tipo === 'confronto') {
        resultados.push(m);
        if (resultados.length % 25 === 0) console.log(`  ${resultados.length} confrontos (${((Date.now() - t0) / 60000).toFixed(1)} min)`);
      } else if (m.tipo === 'suspeito') confirmacoes.push(m);
      else if (m.tipo === 'fim') {
        wk.off('message', ouvir);
        ok();
      }
    };
    wk.on('message', ouvir);
    wk.once('error', falha);
    wk.postMessage({ fase: nome, itens });
  })));
  console.log(`avaliação "${conjunto}" (semente "${semente}"; modos ${modos.join(', ')}): ${conjunto === 'vitrine' ? VITRINE.length : n} confrontos, ${lutas} lutas por modo, δ = ${delta}, ${W} workers`);
  await fase('espelho');
  // etapa 2 das perdas: os suspeitos rodam de novo com 2.000 sementes novas
  const suspeitos = resultados.flatMap(r => modos.filter(m => r.modos[m].ganho < -0.05).map(m => ({ k: r.k, conf: r.conf, lado: r.lado, modo: m })));
  if (suspeitos.length) {
    console.log(`  ${suspeitos.length} suspeitos de perda: confirmando com 2.000 sementes`);
    await fase('confirmar', suspeitos);
  }
  await Promise.all(workers.map(wk => wk.terminate()));
  // Benjamini–Hochberg (q = 0,05) sobre os p-valores unilaterais de "ganho < −5 p.p."
  const ps = confirmacoes.map(x => ({ ...x, p: phi((x.ganho + 0.05) / Math.max(1e-9, x.ep)) })).sort((x, y) => x.p - y.p);
  const m = ps.length;
  let corte = -1;
  ps.forEach((x, i) => {
    if (x.p <= ((i + 1) / m) * 0.05) corte = i;
  });
  const perdas = ps.slice(0, corte + 1).map(x => ({ id: resultados.find(r => r.k === x.k).id, modo: x.modo, ganho: x.ganho, ep: x.ep, p: x.p }));
  const resumo = {};
  for (const modo of modos) {
    // só recursos (ou só marcial): os confrontos em que o lado da rede tem alguém do perfil
    const age = r => modo === 'ambas' || r.perfis.includes(modo);
    const equilibrados = resultados.filter(r => r.base >= 0.2 && r.base <= 0.8 && age(r)).map(r => r.modos[modo]);
    const g = equilibrados.map(x => x.ganho);
    const media = g.reduce((s, x) => s + x, 0) / Math.max(1, g.length);
    const dp = Math.sqrt(g.reduce((s, x) => s + (x - media) ** 2, 0) / Math.max(1, g.length - 1));
    const ep = dp / Math.sqrt(Math.max(1, g.length));
    resumo[modo] = {
      confrontos: resultados.length, // comOPerfil e equilibrados são deste modo; desequilibradosNoTotal conta todos os confrontos
      comOPerfil: resultados.filter(age).length, desequilibradosNoTotal: resultados.filter(r => r.base < 0.2 || r.base > 0.8).length, equilibrados: g.length, ganho: media, ic95: [media - 1.96 * ep, media + 1.96 * ep],
      empates: { rede: equilibrados.reduce((s, x) => s + x.empatesRede, 0) / Math.max(1, g.length), classica: equilibrados.reduce((s, x) => s + x.empatesClassica, 0) / Math.max(1, g.length) },
      suspeitos: suspeitos.filter(x => x.modo === modo).length, perdas: perdas.filter(x => x.modo === modo).length,
    };
    console.log(`${modo}: ganho ${(100 * media).toFixed(2)} p.p. [${(100 * (media - 1.96 * ep)).toFixed(2)}, ${(100 * (media + 1.96 * ep)).toFixed(2)}] em ${g.length} confrontos equilibrados; empates ${(100 * resumo[modo].empates.rede).toFixed(1)}% × ${(100 * resumo[modo].empates.classica).toFixed(1)}%; suspeitos ${resumo[modo].suspeitos}, perdas confirmadas ${resumo[modo].perdas}`);
  }
  const lote = conjunto === 'teste' ? medirLote(Object.fromEntries(Object.entries(redes).map(([p, f]) => [p, criarRede(JSON.parse(readFileSync(f, 'utf8')))])), delta) : null;
  if (lote) for (const [nome, x] of Object.entries(lote)) console.log(`lote de 1.000 lutas, ${nome}: clássica ${(x.classicaMs / 1000).toFixed(1)} s, rede ${(x.redeMs / 1000).toFixed(1)} s (${x.razao.toFixed(1)}×)`);
  const relatorio = { conjunto, semente, modos, lutas, delta, redes, minutos: (Date.now() - t0) / 60000, resumo, perdas, lote, confrontos: resultados.map(({ conf, ...r }) => ({ ...r, ladoA: conf.ladoA, ladoB: conf.ladoB, distancia: conf.distancia })), confirmacoes };
  if (a.saida) writeFileSync(a.saida, JSON.stringify(relatorio, null, 2));
  console.log(`pronto em ${relatorio.minutos.toFixed(1)} min${a.saida ? `: ${a.saida}` : ''}`);
}

if (!isMainThread) trabalhar(workerData);
else if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => {
  console.error(e);
  process.exit(1);
});
