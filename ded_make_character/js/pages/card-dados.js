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

/** O catálogo é somente leitura. */
export const carregarCatalogo = umaVez('../../data/catalogo-combate.json');
export const carregarGlossario = umaVez('../../data/glossario-combate.json');

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
