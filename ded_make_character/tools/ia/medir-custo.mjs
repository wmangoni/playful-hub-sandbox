/**
 * Custo da política "rede" por cenário (TASK_009 §7, E2): uma rede com pesos aleatórios do
 * tamanho planejado (entradas → 128 → 64 → 2) decide pelos dois lados, contra a IA clássica. A
 * razão que importa é a do custo por decisão: a rede aleatória joga mal e muda o tamanho das lutas.
 *
 *   node ded_make_character/tools/ia/medir-custo.mjs [lutas por cenário]
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import * as C from '../../js/rules/combat30.js';
import { createRng } from '../../js/rules/dice.js';
import { criarRede, politicaRede, NOMES_ESTADO, NOMES_ACAO, VERSAO_ENTRADAS } from '../../js/rules/ia30.js';
import { montarPersonagem } from './personagens.mjs';

/** Rede de teste com pesos aleatórios (He), no formato exportado pelo treino. */
export function redeAleatoria(semente = 1, ocultas = [128, 64]) {
  const rng = createRng(semente);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rng.float())) * Math.cos(2 * Math.PI * rng.float());
  const tamanhos = [NOMES_ESTADO.length + NOMES_ACAO.length, ...ocultas, 2];
  const camadas = tamanhos.slice(1).map((saidas, i) => ({
    pesos: Array.from({ length: saidas }, () => Array.from({ length: tamanhos[i] }, () => gauss() * Math.sqrt(2 / tamanhos[i]))),
    vies: Array(saidas).fill(0),
  }));
  const n = tamanhos[0];
  return { formato: 'ded-ia-rede', versaoEntradas: VERSAO_ENTRADAS, perfil: 'teste', geracao: 0, entradas: { estado: NOMES_ESTADO.length, acao: NOMES_ACAO.length }, normalizacao: { media: Array(n).fill(0), desvio: Array(n).fill(1) }, camadas };
}

async function main() {
  const vezes = Number(process.argv[2]) || 200;
  const cat = JSON.parse(readFileSync(new URL('../../data/catalogo-combate.json', import.meta.url), 'utf8'));
  const todos = [...cat.monstros, ...cat.holy_avenger];
  const f = id => C.fromCatalog(todos.find(e => e.id === id));
  const pj = (classe, nivel) => montarPersonagem({ classe, nivel }).ficha;
  const cenarios = {
    '1 × 1': () => ({ ladoA: [pj('mago', 9)], ladoB: [f('troll')] }),
    '3 × 3': () => ({ ladoA: [pj('guerreiro', 8), pj('clerigo', 8), pj('mago', 8)], ladoB: [f('ogro'), f('ogro'), f('troll')] }),
    '10 × 10': () => ({ ladoA: Array.from({ length: 10 }, (_, i) => pj(['guerreiro', 'mago', 'clerigo', 'ladino', 'druida'][i % 5], 6)), ladoB: Array.from({ length: 10 }, (_, i) => f(['ogro', 'troll', 'carnical'][i % 3])) }),
  };
  const rede = criarRede(redeAleatoria());
  for (const [nome, montar] of Object.entries(cenarios)) {
    const luta = montar();
    const medir = politicas => {
      let decisoes = 0;
      const contar = p => (b, c, ia) => (decisoes++, p(b, c, ia));
      const pol = politicas ? { A: contar(politicas), B: contar(politicas) } : { A: contar((b, c, ia) => ia.classica(b, c)), B: contar((b, c, ia) => ia.classica(b, c)) };
      const t0 = performance.now();
      for (let i = 0; i < vezes; i++) C.runBattle(C.createBattle({ ...luta, semente: i, registrar: false, politicas: pol }));
      const ms = performance.now() - t0;
      return { ms, porDecisao: ms / decisoes, decisoes: decisoes / vezes };
    };
    const classica = medir(null);
    const comRede = medir(politicaRede({ marcial: rede, recursos: rede }));
    // a rede aleatória joga mal e alonga as lutas: a razão que vale é a do custo por decisão
    console.log(`${nome}: por decisão, clássica ${classica.porDecisao.toFixed(3)} ms e rede ${comRede.porDecisao.toFixed(3)} ms (${(comRede.porDecisao / classica.porDecisao).toFixed(1)}×); por luta, ${(classica.ms / vezes).toFixed(2)} ms com ${classica.decisoes.toFixed(1)} decisões e ${(comRede.ms / vezes).toFixed(2)} ms com ${comRede.decisoes.toFixed(1)}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
