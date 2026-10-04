/**
 * Personagens sintéticos para o treino da IA (TASK_009 §5.1): classe, raça, nível, atributos,
 * talentos de combate, equipamento com melhoria pelo nível e magias variadas, todos sorteados com
 * semente e montados pelas regras do app (`montarPersonagem`). O mesmo número dá sempre o mesmo
 * personagem: os workers do gerador montam o que precisam sem trocar arquivos.
 */
import { createRng } from '../../js/rules/dice.js';
import { armaPorId, kitPadrao } from '../../js/rules/equipamento30.js';
import { MODO, daClasse, espacosDoDia, conhecidasDoNivel, nivelNaClasse, normalizarMagias } from '../../js/rules/magias30.js';
import { montarPersonagem, atributosDaClasse, CLASSES, RACAS } from './personagens.mjs';

const CHAVE_DA_CLASSE = { barbaro: 'bar', bardo: 'bad', clerigo: 'cle', druida: 'dru', guerreiro: 'gue', monge: 'mon', paladino: 'pal', ranger: 'ran', ladino: 'lad', feiticeiro: 'fei', mago: 'mag' };

/** Talentos de combate que o motor ou a ficha usam, por classe (nomes do compêndio). */
const TALENTOS = {
  marcial: ['ATAQUE PODEROSO', 'TRESPASSAR', 'FOCO EM ARMA', 'INICIATIVA APRIMORADA', 'ESQUIVA', 'LUTAR ÀS CEGAS', 'FORTITUDE MAIOR', 'VONTADE DE FERRO', 'REFLEXOS RÁPIDOS'],
  atirador: ['TIRO CERTEIRO', 'TIRO PRECISO', 'TIRO RÁPIDO', 'FOCO EM ARMA', 'INICIATIVA APRIMORADA', 'ESQUIVA', 'REFLEXOS RÁPIDOS'],
  agil: ['ACUIDADE COM ARMA', 'ESQUIVA', 'INICIATIVA APRIMORADA', 'REFLEXOS RÁPIDOS', 'TIRO CERTEIRO', 'FOCO EM ARMA'],
  conjurador: ['INICIATIVA APRIMORADA', 'ESQUIVA', 'VONTADE DE FERRO', 'FORTITUDE MAIOR', 'REFLEXOS RÁPIDOS'],
};
const POOL = {
  barbaro: TALENTOS.marcial, guerreiro: [...TALENTOS.marcial, 'ESPECIALIZAÇÃO EM ARMA', 'TRESPASSAR MAIOR', 'SUCESSO DECISIVO APRIMORADO'], paladino: TALENTOS.marcial,
  ranger: [...TALENTOS.marcial, ...TALENTOS.atirador], monge: ['ESQUIVA', 'INICIATIVA APRIMORADA', 'LUTAR ÀS CEGAS', 'REFLEXOS RÁPIDOS', 'VONTADE DE FERRO'],
  ladino: TALENTOS.agil, clerigo: [...TALENTOS.conjurador, 'ATAQUE PODEROSO'], druida: TALENTOS.conjurador, bardo: [...TALENTOS.conjurador, 'ACUIDADE COM ARMA'],
  feiticeiro: TALENTOS.conjurador, mago: TALENTOS.conjurador,
};
/** Talentos que pedem a arma como parâmetro. */
const COM_ARMA = new Set(['FOCO EM ARMA', 'ESPECIALIZAÇÃO EM ARMA', 'SUCESSO DECISIVO APRIMORADO', 'ACUIDADE COM ARMA']);
/** Pré-requisitos simples (3.0): o talento só entra depois destes, e a partir do nível. */
const REQUISITOS = {
  TRESPASSAR: { talentos: ['ATAQUE PODEROSO'] },
  'TRESPASSAR MAIOR': { talentos: ['TRESPASSAR'], nivel: 4 },
  'ESPECIALIZAÇÃO EM ARMA': { talentos: ['FOCO EM ARMA'], nivel: 4, classe: 'guerreiro' },
  'SUCESSO DECISIVO APRIMORADO': { nivel: 8 },
  'TIRO PRECISO': { talentos: ['TIRO CERTEIRO'] },
  'TIRO RÁPIDO': { talentos: ['TIRO CERTEIRO'] },
};

const sortear = (rng, lista) => lista[rng.die(lista.length) - 1];

/** 4d6 sem o menor, seis vezes, em ordem decrescente. */
function rolarAtributos(rng) {
  return Array.from({ length: 6 }, () => {
    const d = [rng.die(6), rng.die(6), rng.die(6), rng.die(6)].sort((x, y) => x - y);
    return d[1] + d[2] + d[3];
  }).sort((x, y) => y - x);
}

/** 2 a 4 talentos (2 até o 7º nível, 3 até o 14º, 4 depois), respeitando os pré-requisitos simples. */
function sortearTalentos(rng, classe, nivel, arma) {
  const quantos = 2 + (nivel >= 8 ? 1 : 0) + (nivel >= 15 ? 1 : 0);
  const escolhidos = [];
  for (let tentativa = 0; escolhidos.length < quantos && tentativa < 50; tentativa++) {
    const t = sortear(rng, POOL[classe]);
    const r = REQUISITOS[t] || {};
    if (escolhidos.some(x => x.nome === t) || (r.nivel && nivel < r.nivel) || (r.classe && r.classe !== classe) || (r.talentos || []).some(p => !escolhidos.some(x => x.nome === p))) continue;
    if (COM_ARMA.has(t) && !arma) continue;
    escolhidos.push({ nome: t, parametro: COM_ARMA.has(t) ? arma : '' });
  }
  return escolhidos;
}

/** Magias variadas: a cada espaço (ou conhecida), uma magia da classe sorteada entre as que cabem. */
function sortearMagias(rng, sheet) {
  const ck = sheet.classKey;
  if (!MODO[ck]) return null;
  if (MODO[ck] === 'conhece') {
    const conhecidas = [];
    for (const [nivel, n] of Object.entries(conhecidasDoNivel(sheet))) {
      const lista = daClasse(ck, Number(nivel)).filter(m => nivelNaClasse(m, ck) === Number(nivel)).map(m => m.id);
      for (let i = 0; i < n && lista.length; i++) conhecidas.push(lista.splice(rng.die(lista.length) - 1, 1)[0]);
    }
    return normalizarMagias({ conhecidas }, sheet);
  }
  const preparadas = {};
  for (const [nivel, total] of Object.entries(espacosDoDia(sheet))) {
    const lista = daClasse(ck, Number(nivel)).map(m => m.id);
    if (!lista.length) continue;
    const conta = {};
    for (let i = 0; i < total; i++) {
      const id = sortear(rng, lista);
      conta[id] = (conta[id] || 0) + 1;
    }
    preparadas[nivel] = conta;
  }
  return normalizarMagias({ preparadas }, sheet);
}

/**
 * O personagem sintético de número `n` (com `semente`): `{ ref, classe, raca, nivel, ficha }`.
 * `classes` restringe o sorteio (a reserva de teste tira o ladino e o feiticeiro do treino).
 * `nivel` fixa o nível (a montagem dos confrontos sobe ou desce o nível para equilibrar).
 */
export function personagemSintetico(n, { semente = 'sinteticos', classes = Object.keys(CLASSES), nivel = null } = {}) {
  const rng = createRng(`${semente}:${n}`);
  const classe = sortear(rng, classes);
  const raca = sortear(rng, Object.keys(RACAS));
  const sorteado = rng.die(20); // consumido sempre: o mesmo número em outro nível mantém os outros sorteios
  const nv = nivel ?? sorteado;
  const valores = rolarAtributos(rng);
  // aumentos de atributo (3.0: +1 a cada 4 níveis) no atributo principal
  valores[0] += Math.floor(nv / 4);
  const ck = CHAVE_DA_CLASSE[classe];
  const tamanho = ['gnomo', 'halfling'].includes(raca) ? 'Pequeno' : 'Médio';
  const kit = kitPadrao(ck, tamanho);
  // melhoria pelo nível (+1 a cada 4 níveis, até +5) na arma e na armadura (o kit vem +0)
  const melhoria = Math.min(5, Math.floor(nv / 4));
  for (const k of ['principal', 'secundaria', 'distancia', 'armadura', 'escudo']) if (kit[k]) kit[k] = { ...kit[k], melhoria };
  const arma = kit.principal ? armaPorId(kit.principal.id)?.nome : null;
  const talentos = sortearTalentos(rng, classe, nv, arma);
  const ranks = classe === 'bardo' ? { atuacao: nv + 3 } : {};
  const dados = { classe, raca, nivel: nv, atributos: atributosDaClasse(classe, valores), talentos, ranks, equipamento: kit, id: 100000 + n, nome: `${classe} ${nv} #${n}` };
  // a ficha 3.0 diz os espaços do dia; as magias sorteadas cabem neles
  const magias = sortearMagias(rng, montarPersonagem(dados).sheet);
  const r = montarPersonagem({ ...dados, magias });
  return { ref: `sint:${n}`, classe, raca, nivel: nv, ficha: r.ficha, erros: r.erros };
}
