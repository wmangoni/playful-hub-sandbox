/**
 * A IA treinada na Arena (TASK_009 §8): carrega as redes sob demanda e monta as políticas de cada
 * lado. Sem DOM: a página usa estas funções, e os testes também.
 */
import { rules } from '../rules/combat30.js';
import { criarRede, politicaRede, rotuloDaAcao } from '../rules/ia30.js';

/**
 * As redes que a Arena usa. Só a de recursos: na avaliação final (TASK_009 §12, E5), a marcial não
 * ganhou nada (+0,1 p.p.) e respondeu por 11 das 16 perdas confirmadas; sem ela, quem só luta com
 * armas fica com a IA clássica (a política devolve a clássica para o perfil sem rede).
 */
export const PERFIS_DA_ARENA = ['recursos'];

/** As redes (de `tools/ia/treinar.py`): uma busca por sessão, só quando alguém escolhe a treinada. */
let redes = null;
export function carregarRedes(buscar = fetch) {
  redes ||= Promise.all(PERFIS_DA_ARENA.map(perfil => buscar(new URL(`../../data/ia/rede-${perfil}.json`, import.meta.url), { cache: 'no-cache' })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(criarRede)))
    .then(lista => Object.fromEntries(PERFIS_DA_ARENA.map((perfil, i) => [perfil, lista[i]])))
    .catch(err => {
      redes = null;
      throw err;
    });
  return redes;
}

const pct = x => `${Math.round(x * 100)}%`;

/**
 * "Por que", no registro da luta assistida: só quando a rede troca a escolha clássica (com a margem
 * δ = 0,20 ela a mantém em ~90% das decisões, e uma linha a cada turno viraria ruído). Diz a escolha,
 * a chance de vitória que a rede estima, e a escolha clássica que ela deixou, com a chance dela.
 */
export function porQue({ b, c, lista, vitoria, escolhida }) {
  if (lista.length < 2 || lista[escolhida]?.heuristica) return;
  const h = lista.findIndex(a => a.heuristica);
  const deixou = h >= 0 ? ` A clássica faria ${rotuloDaAcao(c, lista[h])}, ${pct(vitoria[h])}.` : ' A clássica não teria o que fazer.';
  rules.log(b, c, 'ia', `IA treinada de ${c.nome}: ${rotuloDaAcao(c, lista[escolhida])}, com ${pct(vitoria[escolhida])} de vitória estimada.${deixou}`);
}

/**
 * As políticas da luta: { A, B } com a treinada nos lados que a pedem (`ia[lado] === 'rede'`) e as
 * redes carregadas; os outros ficam com a clássica. `registrar` põe o "por que" no registro.
 */
export function politicasDaArena(ia, redesCarregadas, { registrar = false } = {}) {
  if (!redesCarregadas) return null;
  const politica = politicaRede(redesCarregadas, registrar ? { aoDecidir: porQue } : {});
  const out = {};
  for (const lado of ['A', 'B']) if (ia?.[lado] === 'rede') out[lado] = politica;
  return Object.keys(out).length ? out : null;
}
