/**
 * Ramificação (TASK_009 §6.1): como uma luta vira exemplos de treino.
 *
 * 1. O caminho 0 joga a luta inteira com a política atual π, anotando cada decisão (as candidatas,
 *    a escolha de π e o ranking).
 * 2. Sorteia o ponto: uma decisão de π com 2 candidatas ou mais (70% das vezes, de recursos).
 * 3. Os caminhos 1 a 3 refazem a luta até o ponto (o motor é determinístico dadas a semente e as
 *    decisões), fazem lá uma alternativa e seguem com π até o fim. As entradas do ponto (o estado e
 *    cada candidata) saem do caminho 1, no mesmo estado do caminho 0.
 * Cada caminho dá um exemplo (estado, ação, resultado) do ponto. As decisões de π que seguem até o
 * fim (o caminho 0 inteiro e o depois do ponto nos outros) dão os exemplos extras de Q^π(s, π(s)),
 * uma fração sorteada delas.
 *
 * As lutas usam um fluxo de dados por combatente (`rngPorCombatente`), e os sorteios do ponto, das
 * alternativas e dos extras usam geradores próprios, nunca o da luta. As entradas só são calculadas
 * onde são usadas: a IA clássica decide sem elas.
 */
import * as C from '../../js/rules/combat30.js';
import { createRng } from '../../js/rules/dice.js';
import { perfilDe, limitarCandidatas, entradasDaDecisao, escolherPelaRede, preNota, NOMES_ESTADO, NOMES_ACAO } from '../../js/rules/ia30.js';
import { fichaDe } from './confrontos.mjs';

export const CAMINHOS = 4;
export const TAU = 2;
/** Fração das decisões de π gravadas como exemplos extras, por perfil (§5.3). */
export const EXTRAS = { recursos: 1 / 2, marcial: 1 / 6 };
const FORA = ['paralisado', 'petrificado', 'imobilizado', 'inconsciente', 'amedrontado', 'apavorado', 'enfeitiçado', 'morto'];
const LIMITE_RODADAS = 50;

/** Colunas das linhas gravadas (o treino lê pelo nome). */
export const COLUNAS_RAMOS = ['perfil', 'confronto', 'ponto', 'caminho', 'eh_pi', 'eh_classica', 'vitoria', 'margem', 'rodadas', ...NOMES_ESTADO, ...NOMES_ACAO];
export const COLUNAS_EXTRAS = ['perfil', 'confronto', 'vitoria', 'margem', 'rodadas', ...NOMES_ESTADO, ...NOMES_ACAO];

const limitar = (x, min, max) => Math.min(max, Math.max(min, x));

/**
 * Resultado de uma luta para o lado de quem decidiu (§4.4): vitória (1, 0 ou 0,5 no empate) e
 * margem: a saúde do próprio lado menos a do outro (PV sem a contusão; quem não pode lutar vale 0),
 * mais um pequeno bônus por vencer cedo (ou por perder tarde), limitada a [−1, 1].
 */
export function rotulo(fim, lado) {
  const vitoria = fim.vencedor === lado ? 1 : fim.vencedor ? 0 : 0.5;
  const saude = l => {
    const xs = fim.combatentes.filter(x => x.lado === l);
    return xs.reduce((s, x) => s + (x.estado === 'ativo' && !x.condicoes.some(n => FORA.includes(n)) ? limitar((x.pv - (x.contusao || 0)) / x.pvMax, 0, 1) : 0), 0) / xs.length;
  };
  const tempo = 1 - fim.rodadas / LIMITE_RODADAS;
  const bonus = vitoria === 1 ? 0.2 * tempo : vitoria === 0 ? -0.2 * tempo : 0;
  return { vitoria, margem: limitar(saude(lado) - saude(lado === 'A' ? 'B' : 'A') + bonus, -1, 1), rodadas: fim.rodadas };
}

/** Ranking das candidatas (índices, da melhor para a pior) por uma nota. */
const ranking = notas => notas.map((_, i) => i).sort((i, j) => notas[j] - notas[i] || i - j);

/**
 * Uma decisão de π. `pi` = { tipo: 'classica' } ou { tipo: 'rede', redes, delta }; um π com
 * `adversario` (a IA clássica contra a rede, §6.2) decide, mas não ensina. Com `anotar`, devolve a
 * lista, a escolha e o ranking (a pré-nota na clássica; a nota na rede); com `entradas`, também as
 * entradas da escolha (o estado e a ação escolhida). Sem nenhum dos dois, a clássica decide sem
 * listar as candidatas.
 */
function decisao(pi, b, c, IA, { anotar = false, entradas = false } = {}) {
  const rede = pi.tipo === 'rede' ? pi.redes[perfilDe(c)] : null;
  if (!rede && !anotar && !entradas) return { acao: IA.classica(b, c) };
  const lista = limitarCandidatas(b, c, IA.candidatas(b, c));
  if (!lista.length) return { acao: null, lista };
  let escolhida;
  let ordem;
  let ent = null;
  if (rede) {
    ent = entradasDaDecisao(b, c, lista);
    const r = escolherPelaRede(rede, lista, ent, { delta: pi.delta });
    escolhida = r.escolhida;
    ordem = ranking([...r.notas]);
  } else {
    escolhida = lista.findIndex(a => a.heuristica);
    const pv = C.rules.inimigos(b, c).filter(C.podeLutar).reduce((s, x) => s + Math.max(0, x.pv), 0);
    ordem = ranking(lista.map(a => preNota(a, pv)));
  }
  const out = { acao: escolhida >= 0 ? lista[escolhida] : null, lista, escolhida, ranking: ordem, classica: lista.findIndex(a => a.heuristica) };
  if (entradas && escolhida >= 0) {
    const e = ent || entradasDaDecisao(b, c, [lista[escolhida]]);
    out.entradas = { estado: e.estado, acao: ent ? ent.acoes[escolhida] : e.acoes[0] };
  }
  return out;
}

/** Joga o confronto com a semente; `decidir(b, c, IA, k)` recebe o índice k de cada decisão. */
function jogar(conf, semente, decidir) {
  let k = 0;
  const politica = (b, c, IA) => decidir(b, c, IA, k++);
  const b = C.createBattle({
    ladoA: conf.ladoA.map(fichaDe), ladoB: conf.ladoB.map(fichaDe), semente, distancia: conf.distancia,
    limiteRodadas: LIMITE_RODADAS, registrar: false, rngPorCombatente: true, politicas: { A: politica, B: politica },
  });
  C.runBattle(b);
  return b;
}

/** As alternativas do ponto (§6.1): π, a clássica (G1 e G2), uma uniforme e o resto pelo ranking. */
export function alternativas(d, sorte, { geracao }) {
  const n = d.n;
  if (n <= CAMINHOS) return [d.escolhida, ...Array.from({ length: n }, (_, i) => i).filter(i => i !== d.escolhida)];
  const out = [d.escolhida];
  if (geracao > 0 && d.classica >= 0 && d.classica !== d.escolhida) out.push(d.classica);
  const fora = () => Array.from({ length: n }, (_, i) => i).filter(i => !out.includes(i));
  const uniforme = fora();
  out.push(uniforme[sorte.die(uniforme.length) - 1]);
  const posicao = new Map(d.ranking.map((i, p) => [i, p]));
  while (out.length < CAMINHOS) {
    const resto = fora();
    const pesos = resto.map(i => Math.exp(-posicao.get(i) / TAU));
    let r = sorte.float() * pesos.reduce((s, w) => s + w, 0);
    let k = 0;
    while (k < resto.length - 1 && (r -= pesos[k]) > 0) k++;
    out.push(resto[k]);
  }
  return out;
}

/**
 * Um ponto de ramificação do confronto: `{ ramos, extras, info }`. `ramos` e `extras` são listas de
 * linhas (arrays de números, nas colunas de `COLUNAS_RAMOS` e `COLUNAS_EXTRAS`); `info` diz o ponto
 * escolhido (ou por que não houve). `pis` = { A, B } (π de cada lado); `extras` = fração das
 * decisões de π gravadas como extras, por perfil.
 */
export function pontoDeRamificacao(conf, ponto, { pis, geracao = 0, extras: fracao = EXTRAS }) {
  const semente = `${conf.semente}:p${ponto}`;
  const sorte = createRng(`${semente}:sorte`);
  const extras = [];
  /** Decide por π e, se for sorteada, guarda a decisão como exemplo extra (até o rótulo sair). */
  const decidirComExtras = (b, c, IA, sorteioExtras, pendentes, k) => {
    const pi = pis[c.lado];
    const perfil = perfilDe(c);
    const sorteada = !pi.adversario && sorteioExtras.float() < fracao[perfil];
    const d = decisao(pi, b, c, IA, { anotar: sorteada, entradas: sorteada });
    if (sorteada && d.entradas && d.lista.length >= 2) pendentes.push({ k, lado: c.lado, perfil, entradas: d.entradas });
    return d;
  };
  const gravarExtras = (pendentes, fim, pular = -1) => {
    for (const x of pendentes) {
      if (x.k === pular) continue;
      const r = rotulo(fim, x.lado);
      extras.push([x.perfil === 'recursos' ? 1 : 0, conf.indice ?? 0, r.vitoria, r.margem, r.rodadas, ...x.entradas.estado, ...x.entradas.acao]);
    }
  };

  // caminho 0: a luta inteira com π, anotando as decisões
  const decisoes = [];
  const pendentes0 = [];
  const extras0 = createRng(`${semente}:extras:0`);
  const b0 = jogar(conf, semente, (b, c, IA, k) => {
    const pi = pis[c.lado];
    const d = decidirComExtras(b, c, IA, extras0, pendentes0, k);
    // a anotação do ponto (as candidatas e o ranking) só nas decisões de quem ensina
    const anotada = d.lista ? d : pi.adversario ? null : decisao(pi, b, c, IA, { anotar: true });
    if (anotada?.lista?.length && !pi.adversario) decisoes.push({ k, uid: c.uid, lado: c.lado, perfil: perfilDe(c), n: anotada.lista.length, chaves: anotada.lista.map(a => a.chave), escolhida: anotada.escolhida, classica: anotada.classica, ranking: anotada.ranking });
    return d.acao;
  });
  const elegiveis = decisoes.filter(d => d.escolhida >= 0 && d.n >= 2);
  if (!elegiveis.length) return { ramos: [], extras, info: { sem: 'nenhuma decisão com 2 candidatas ou mais', decisoes: decisoes.length } };
  const deRecursos = elegiveis.filter(d => d.perfil === 'recursos');
  const deMarcial = elegiveis.filter(d => d.perfil === 'marcial');
  const pool = deRecursos.length && (!deMarcial.length || sorte.float() < 0.7) ? deRecursos : deMarcial;
  const d = pool[sorte.die(pool.length) - 1];
  const caminhos = alternativas(d, sorte, { geracao });
  const r0 = rotulo(b0.fim, d.lado);
  gravarExtras(pendentes0, b0.fim, d.k);

  // caminhos 1 a 3: refazem até o ponto, fazem a alternativa e seguem com π
  let noPonto = null;
  const ramos = [];
  for (let j = 1; j < caminhos.length; j++) {
    const pendentes = [];
    const sorteioExtras = createRng(`${semente}:extras:${j}`);
    const bj = jogar(conf, semente, (b, c, IA, k) => {
      if (k < d.k) return decisao(pis[c.lado], b, c, IA).acao;
      if (k === d.k) {
        if (c.uid !== d.uid) throw new Error(`${semente}: o caminho ${j} chegou ao ponto com ${c.uid}, não ${d.uid} (a luta não se repetiu)`);
        const lista = limitarCandidatas(b, c, IA.candidatas(b, c));
        if (lista.length !== d.n || lista.some((a, i) => a.chave !== d.chaves[i])) throw new Error(`${semente}: as candidatas do ponto mudaram no caminho ${j}`);
        noPonto ??= entradasDaDecisao(b, c, lista);
        return lista[caminhos[j]];
      }
      return decidirComExtras(b, c, IA, sorteioExtras, pendentes, k).acao;
    });
    ramos.push({ j, idx: caminhos[j], r: rotulo(bj.fim, d.lado) });
    gravarExtras(pendentes, bj.fim);
  }
  const linha = (j, idx, r) => [d.perfil === 'recursos' ? 1 : 0, conf.indice ?? 0, ponto, j, j === 0 ? 1 : 0, idx === d.classica ? 1 : 0, r.vitoria, r.margem, r.rodadas, ...noPonto.estado, ...noPonto.acoes[idx]];
  return {
    ramos: [linha(0, caminhos[0], r0), ...ramos.map(x => linha(x.j, x.idx, x.r))],
    extras,
    info: { k: d.k, uid: d.uid, perfil: d.perfil, candidatas: d.n, caminhos: caminhos.length, decisoes: decisoes.length },
  };
}
