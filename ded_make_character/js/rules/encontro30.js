/**
 * Nível de encontro (NE) da 3.0, para a dica de dificuldade da Arena (TASK_006 §4.1).
 *
 * O Livro do Mestre 3.0 soma criaturas pelo "poder" de cada ND: dois adversários do mesmo ND
 * valem ND + 2, quatro valem ND + 4. A fórmula fechada que reproduz essa tabela é
 * NE = 2·log2(Σ 2^(ND/2)). Personagens do catálogo (Holy Avenger) já trazem o ND de PdM.
 */

/** NE de um grupo, a partir dos NDs de cada combatente (um por combatente, com repetições). */
export function nivelDeEncontro(nds) {
  const validos = nds.map(Number).filter(n => Number.isFinite(n) && n > 0);
  if (!validos.length) return null;
  const poder = validos.reduce((soma, nd) => soma + 2 ** (nd / 2), 0);
  return 2 * Math.log2(poder);
}

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
