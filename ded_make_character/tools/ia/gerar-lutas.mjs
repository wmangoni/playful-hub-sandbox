/**
 * Gerador das lutas de treino da IA (TASK_009 §5 e §6), em workers.
 *
 *   node ded_make_character/tools/ia/gerar-lutas.mjs --geracao 0 --saida D:/…/ded-ia-dados/g0 \
 *     [--confrontos 37000] [--inicio 0] [--pontos 10] [--workers 10] \
 *     [--rede-marcial arquivo.json --rede-recursos arquivo.json --delta 0.2]
 *
 * Cada confronto (montado e equilibrado por `confrontos.mjs`) dá `--pontos` pontos de ramificação
 * (`ramificacao.mjs`), cada um com 4 caminhos. As gerações usam faixas de confrontos diferentes
 * (`--inicio`). Na geração 0, π é a IA clássica; nas seguintes, a rede dos arquivos, e em 20% dos
 * confrontos um lado joga com a clássica sem ensinar (§6.2).
 *
 * Grava, por worker: `ramos-<w>.f32` e `extras-<w>.f32` (float32, linhas nas colunas de
 * `COLUNAS_RAMOS` e `COLUNAS_EXTRAS`) e `confrontos-<w>.jsonl`; no fim, `resumo.json`.
 */
import { appendFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { createRng } from '../../js/rules/dice.js';
import { criarRede, VERSAO_ENTRADAS, DELTA_PADRAO } from '../../js/rules/ia30.js';
import { CATALOGO, reservaDeTeste, confrontoDeTreino } from './confrontos.mjs';
import { pontoDeRamificacao, COLUNAS_RAMOS, COLUNAS_EXTRAS } from './ramificacao.mjs';

/** Lê `--nome valor` da linha de comando. */
function argumentos(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') || argv[i + 1] == null ? true : argv[++i];
  return out;
}

/** O π de cada lado no confronto `i`. */
function politicasDoConfronto(i, { geracao, redes, delta }) {
  if (!geracao) return { A: { tipo: 'classica' }, B: { tipo: 'classica' } };
  const rede = { tipo: 'rede', redes, delta };
  const rng = createRng(`adversario:${i}`);
  if (rng.die(100) > 20) return { A: rede, B: rede };
  return rng.die(2) === 1 ? { A: rede, B: { tipo: 'classica', adversario: true } } : { A: { tipo: 'classica', adversario: true }, B: rede };
}

/** O trabalho de um worker: os confrontos i com i ≡ w (mod W). */
function trabalhar({ w, W, inicio, confrontos, pontos, geracao, saida, arquivosRedes, delta }) {
  const reserva = new Set(reservaDeTeste());
  const treino = CATALOGO.filter(e => !reserva.has(e.id));
  const redes = Object.fromEntries(Object.entries(arquivosRedes).map(([perfil, f]) => [perfil, criarRede(JSON.parse(readFileSync(f, 'utf8')))]));
  const arquivo = nome => `${saida}/${nome}-${w}`;
  for (const nome of ['ramos', 'extras']) rmSync(`${arquivo(nome)}.f32`, { force: true });
  rmSync(`${arquivo('confrontos')}.jsonl`, { force: true });
  const gravar = (nome, linhas, colunas) => {
    if (!linhas.length) return;
    const buf = new Float32Array(linhas.length * colunas);
    linhas.forEach((l, k) => {
      if (l.length !== colunas) throw new Error(`${nome}: linha com ${l.length} colunas, esperava ${colunas}`);
      buf.set(l, k * colunas);
    });
    appendFileSync(`${arquivo(nome)}.f32`, Buffer.from(buf.buffer));
  };
  let feitos = 0;
  let ramos = 0;
  let extras = 0;
  for (let i = inicio + w; i < inicio + confrontos; i += W) {
    // metade dos confrontos tem uma ficha do catálogo em rodízio (as cotas por ficha, §5.2)
    const ancora = i % 2 === 0 ? treino[(i / 2) % treino.length].id : null;
    const conf = confrontoDeTreino(i, { catalogo: treino, ancora });
    const pis = politicasDoConfronto(i, { geracao, redes, delta });
    const infos = [];
    for (let p = 0; p < pontos; p++) {
      const r = pontoDeRamificacao(conf, p, { pis, geracao });
      gravar('ramos', r.ramos, COLUNAS_RAMOS.length);
      gravar('extras', r.extras, COLUNAS_EXTRAS.length);
      ramos += r.ramos.length;
      extras += r.extras.length;
      infos.push(r.info);
    }
    appendFileSync(`${arquivo('confrontos')}.jsonl`, `${JSON.stringify({ indice: i, id: conf.id, formato: conf.formato, ladoA: conf.ladoA, ladoB: conf.ladoB, distancia: conf.distancia, preTeste: conf.preTeste, ajustes: conf.ajustes, equilibrado: conf.equilibrado, tentativas: conf.tentativas, adversario: Boolean(pis.A.adversario || pis.B.adversario), pontos: infos })}\n`);
    feitos++;
    if (feitos % 20 === 0) parentPort?.postMessage({ w, feitos, ramos, extras });
  }
  parentPort?.postMessage({ w, feitos, ramos, extras, fim: true });
}

async function main() {
  const a = argumentos(process.argv.slice(2));
  const geracao = Number(a.geracao ?? 0);
  const saida = a.saida;
  if (!saida) throw new Error('falta --saida');
  // ~3,3 caminhos por ponto (pontos com 4 candidatas ou menos têm menos): 37.000 confrontos dão as
  // 1.200.000 lutas da G0, e 12.500, as 400.000 de cada geração seguinte (§6.2)
  const confrontos = Number(a.confrontos ?? (geracao ? 12500 : 37000));
  const inicio = Number(a.inicio ?? (geracao ? 37000 + (geracao - 1) * 12500 : 0));
  const pontos = Number(a.pontos ?? 10);
  const W = Number(a.workers ?? Math.max(1, availableParallelism() - 2));
  const arquivosRedes = {};
  if (a['rede-marcial']) arquivosRedes.marcial = a['rede-marcial'];
  if (a['rede-recursos']) arquivosRedes.recursos = a['rede-recursos'];
  if (geracao && !Object.keys(arquivosRedes).length) throw new Error('a geração 1 em diante precisa de --rede-marcial e/ou --rede-recursos');
  const delta = Number(a.delta ?? DELTA_PADRAO);
  mkdirSync(saida, { recursive: true });
  // uma geração de cada vez por pasta: as sobras de outra execução (com outros workers) saem
  for (const f of readdirSync(saida)) if (/^(ramos|extras)-\d+\.f32$|^confrontos-\d+\.jsonl$|^resumo\.json$/.test(f)) rmSync(`${saida}/${f}`);
  const t0 = Date.now();
  const estado = {};
  console.log(`geração ${geracao}: confrontos ${inicio}–${inicio + confrontos - 1}, ${pontos} pontos cada, ${W} workers → ${saida}`);
  const relogio = setInterval(() => {
    const soma = Object.values(estado).reduce((s, x) => ({ feitos: s.feitos + x.feitos, ramos: s.ramos + x.ramos, extras: s.extras + x.extras }), { feitos: 0, ramos: 0, extras: 0 });
    const min = (Date.now() - t0) / 60000;
    console.log(`  ${soma.feitos}/${confrontos} confrontos, ${soma.ramos} ramos, ${soma.extras} extras, ${min.toFixed(1)} min (faltam ~${soma.feitos ? ((confrontos - soma.feitos) * min / soma.feitos).toFixed(0) : '?'} min)`);
  }, 60000);
  await Promise.all(Array.from({ length: W }, (_, w) => new Promise((ok, falha) => {
    const worker = new Worker(fileURLToPath(import.meta.url), { workerData: { w, W, inicio, confrontos, pontos, geracao, saida, arquivosRedes, delta } });
    worker.on('message', m => (estado[m.w] = m));
    worker.on('error', falha);
    worker.on('exit', codigo => (codigo ? falha(new Error(`worker ${w} saiu com ${codigo}`)) : ok()));
  })));
  clearInterval(relogio);
  const soma = Object.values(estado).reduce((s, x) => ({ feitos: s.feitos + x.feitos, ramos: s.ramos + x.ramos, extras: s.extras + x.extras }), { feitos: 0, ramos: 0, extras: 0 });
  const git = cmd => execSync(`git ${cmd}`, { cwd: new URL('.', import.meta.url), encoding: 'utf8' }).trim();
  const resumo = {
    geracao, inicio, confrontos, pontos, workers: W, delta, redes: arquivosRedes, versaoEntradas: VERSAO_ENTRADAS,
    colunasRamos: COLUNAS_RAMOS, colunasExtras: COLUNAS_EXTRAS, ...soma, lutas: soma.ramos,
    minutos: (Date.now() - t0) / 60000, commit: git('rev-parse --short HEAD'), alterado: Boolean(git('status --porcelain -- ../../js ../../data .')), data: new Date().toISOString(),
  };
  writeFileSync(`${saida}/resumo.json`, JSON.stringify(resumo, null, 2));
  console.log(`pronto: ${soma.feitos} confrontos, ${soma.ramos} ramos (lutas), ${soma.extras} extras em ${resumo.minutos.toFixed(1)} min`);
}

if (!isMainThread) trabalhar(workerData);
else if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => {
  console.error(e);
  process.exit(1);
});
