/**
 * Nível de encontro (NE) da 3.0, para a dica de dificuldade da Arena (TASK_006 §4.1).
 *
 * O Livro do Mestre 3.0 soma criaturas pelo "poder" de cada ND: dois adversários do mesmo ND
 * valem ND + 2, quatro valem ND + 4. A fórmula fechada que reproduz essa tabela é
 * NE = 2·log2(Σ 2^(ND/2)). Personagens do catálogo (Holy Avenger) já trazem o ND de PdM.
 */

/**
 * NE de um grupo, a partir dos NDs de cada combatente (um por combatente, com repetições).
 * ND fracionário (Livro do Mestre 3.0): as criaturas de ND menor que 1 se juntam em grupos que somam 1, e
 * cada grupo conta como uma criatura de ND 1 (duas de ND 1/2 valem uma de ND 1; quatro, duas de ND 1). O que
 * sobra, menos de 1, conta como uma criatura com esse ND.
 */
export function nivelDeEncontro(nds) {
  const validos = nds.map(Number).filter(n => Number.isFinite(n) && n > 0);
  if (!validos.length) return null;
  const fracao = validos.filter(n => n < 1).reduce((s, n) => s + n, 0);
  const grupos = Math.floor(fracao + 1e-9);
  const resto = fracao - grupos;
  const grupo = [...validos.filter(n => n >= 1), ...Array(grupos).fill(1), ...(resto > 1e-9 ? [resto] : [])];
  const poder = grupo.reduce((soma, nd) => soma + 2 ** (nd / 2), 0);
  return 2 * Math.log2(poder);
}

/** ND do catálogo para a tela: fração como no livro ("1/2", Petra e Hipólita), inteiro como está. */
export const ndRotulo = nd => (nd > 0 && nd < 1 ? `1/${Math.round(1 / nd)}` : String(nd));

/** NE calculado para a tela: abaixo de 1, a fração mais próxima ("1/2"); senão, o inteiro mais próximo. */
export const neTexto = ne => (ne == null ? '—' : ne < 1 - 1e-9 ? `1/${Math.max(2, Math.round(1 / ne))}` : String(Math.round(ne + 1e-9)));

/**
 * Dificuldade para o lado A, pela diferença de NE (orientação, não previsão):
 * até −2 fácil, de −1 a +1 justa, +2 e +3 difícil, +4 ou mais mortal.
 */
export function dificuldade(neA, neB) {
  if (neA == null || neB == null) return null;
  const diferenca = Math.round(neB - neA);
  const nivel = diferenca <= -2 ? 'facil' : diferenca <= 1 ? 'justa' : diferenca <= 3 ? 'dificil' : 'mortal';
  return { nivel, diferenca, rotulo: { facil: 'fácil', justa: 'justa', dificil: 'difícil', mortal: 'mortal' }[nivel] };
}
