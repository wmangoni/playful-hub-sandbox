/**
 * Dados que o card precisa (TASK_010): o catálogo de combate e o glossário, buscados uma vez por
 * sessão e compartilhados entre a Arena e o Bestiário, e o contexto de textos (compêndio de
 * talentos e glossário) que `rules/card30.js` usa.
 */
import { criarGlossario, indiceDeTalentos } from '../rules/card30.js';

/** Uma busca por sessão; se falhar, a próxima visita tenta de novo. */
function umaVez(url) {
  let promessa = null;
  return () => {
    promessa ||= fetch(new URL(url, import.meta.url), { cache: 'no-cache' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .catch(err => {
        promessa = null;
        throw err;
      });
    return promessa;
  };
}

/** O catálogo completo (compilado) é somente leitura. */
const carregarCatalogoCru = umaVez('../../data/catalogo-combate.json');
export const carregarGlossario = umaVez('../../data/glossario-combate.json');

/** Índice geral leve de combatentes (data/monstros/indice.json). */
export const carregarIndiceCatalogo = umaVez('../../data/monstros/indice.json');

const promessasArquivos = new Map();
const cacheCombatentes = new Map();

/** Popula o cache em memória com combatentes carregados */
function indexarCombatentes(lista) {
  if (Array.isArray(lista)) {
    for (const c of lista) {
      if (c?.id) cacheCombatentes.set(c.id, c);
    }
  }
}

/** Carrega o catálogo completo (com cache transparente em cacheCombatentes). */
export async function carregarCatalogo() {
  const cat = await carregarCatalogoCru();
  indexarCombatentes(cat?.monstros);
  indexarCombatentes(cat?.holy_avenger);
  return cat;
}

/** Carrega um arquivo específico em data/monstros/ (ex.: 'a.json', 'holy_avenger.json'). */
export function carregarArquivoMonstros(arquivo) {
  let promessa = promessasArquivos.get(arquivo);
  if (!promessa) {
    promessa = fetch(new URL(`../../data/monstros/${arquivo}`, import.meta.url), { cache: 'no-cache' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(dados => {
        indexarCombatentes(dados);
        return dados;
      })
      .catch(err => {
        promessasArquivos.delete(arquivo);
        throw err;
      });
    promessasArquivos.set(arquivo, promessa);
  }
  return promessa;
}

/** Carrega os combatentes de uma letra inicial específica ('a' a 'z') ou 'holy_avenger'. */
export function carregarLetra(letra) {
  const norm = String(letra || '').toLowerCase().trim();
  const arquivo = norm === 'holy_avenger' || norm === 'holy' ? 'holy_avenger.json' : `${norm}.json`;
  return carregarArquivoMonstros(arquivo);
}

/**
 * Carrega a ficha completa de um combatente pelo seu ID, buscando sob demanda
 * o arquivo correto apontado pelo índice.
 */
export async function carregarCombatente(id) {
  if (!id) return null;
  if (cacheCombatentes.has(id)) {
    return cacheCombatentes.get(id);
  }

  // Tenta localizar o arquivo de destino pelo índice leve
  try {
    const indice = await carregarIndiceCatalogo();
    const item = Array.isArray(indice) ? indice.find(x => x.id === id) : null;
    if (item?.arquivo) {
      await carregarArquivoMonstros(item.arquivo);
      if (cacheCombatentes.has(id)) {
        return cacheCombatentes.get(id);
      }
    }
  } catch {
    // Falha de rede no índice: tenta fallback
  }

  // Fallback: se não achou pelo índice, tenta carregar o catálogo completo
  try {
    await carregarCatalogo();
    return cacheCombatentes.get(id) || null;
  } catch {
    return null;
  }
}

/** O aviso do card quando as descrições de apoio não carregaram. */
export const AVISO_SEM_GLOSSARIO = 'Não deu para carregar as descrições de magias e habilidades: o card traz só o que o catálogo tem.';

/**
 * `{ glossario, compendio, semGlossario }`: o compêndio de talentos vem do store; sem o glossário
 * (falha de rede), o card sai sem os textos de magias, de habilidades de classe e dos talentos fora
 * do compêndio, e `semGlossario` avisa a tela.
 */
export async function contextoDoCard(store) {
  const [glossario, talentos] = await Promise.all([
    carregarGlossario().then(criarGlossario).catch(() => null),
    store.all('talentos').catch(() => []),
  ]);
  return { glossario, compendio: indiceDeTalentos(talentos), semGlossario: !glossario };
}

/**
 * As faixas de ND do seletor da Arena e do Bestiário. Acima do 20 só há Holy Avenger (o Paladino
 * vai até o ND 55, Tarso tem 50); abaixo de 1, o ND 1/2 (TASK_007, TASK_008).
 */
export const FAIXAS_DE_ND = { todos: [0, Infinity], '1-5': [0, 5], '6-10': [6, 10], '11-15': [11, 15], '16-20': [16, 20], '21+': [21, Infinity] };
export const rotuloFaixa = k => (k === 'todos' ? 'Todos os ND' : k === '21+' ? 'ND 21 ou mais' : k === '1-5' ? 'ND até 5' : `ND ${k.replace('-', ' a ')}`);
