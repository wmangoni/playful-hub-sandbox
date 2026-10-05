/**
 * Card de combatente (TASK_010): da ficha do catálogo ou do personagem da Arena ao modelo que a
 * tela desenha. Sem DOM: o teste confere o modelo sem navegador, e o mesmo modelo serve ao
 * Bestiário e ao popup da Arena.
 *
 * Os números vêm da ficha: o card de catálogo lê o registro do `catalogo-combate.json`, e o de
 * personagem lê `ficha` (o que o motor usa) e `sheet` (a ficha impressa). As únicas contas são as
 * que o motor também faz (o modificador de atributo e a CD da magia: `mecanica.cd` ou
 * `cd_base` + nível), e o teste confere isso com o combatente de `createBattle`. Os textos que o
 * catálogo não traz (magias, talentos fora do compêndio, habilidades de classe e de raça) vêm do
 * `glossario-combate.json`.
 */
import { normalize, signed } from '../core/format.js';
import { TENDENCIAS } from '../entities/options.js';
import { ndRotulo } from './encontro30.js';
import { rotuloItem } from './equipamento30.js';
import { IMUNIDADES_DE_TIPO } from './combat30.js';
import { MAGIAS, bonusLegivel, chavesDeBonus, danoLegivel, magiaPorId } from './magias30.js';

const metros = n => `${String(n).replace('.', ',')} m`;
const rotuloTendencia = sigla => TENDENCIAS.find(t => t.value === sigla)?.label || sigla || '';
const sinal = n => (n == null ? '—' : signed(n));
const modificador = v => (v == null ? '—' : sinal(Math.floor((v - 10) / 2)));

/**
 * "Foco em Arma (espada longa)" → { base: "Foco em Arma", parametro: "espada longa" }. Os parênteses
 * podem aninhar e repetir: "Foco em Perícia (Conhecimento (história)) (regional: Deheon)" →
 * { base: "Foco em Perícia", parametro: "Conhecimento (história); regional: Deheon" }.
 */
export function separarParametro(nome) {
  const texto = String(nome ?? '').trim();
  let fora = '';
  const grupos = [];
  let fundo = 0;
  let atual = '';
  for (const ch of texto) {
    if (ch === '(') {
      if (fundo++ === 0) continue;
    } else if (ch === ')' && fundo > 0) {
      if (--fundo === 0) {
        grupos.push(atual.trim());
        atual = '';
        continue;
      }
    }
    if (fundo > 0) atual += ch;
    else fora += ch;
  }
  if (fundo > 0) grupos.push(atual.trim()); // parêntese que não fecha: o resto é parâmetro
  return { base: fora.replace(/\s+/g, ' ').trim(), parametro: grupos.filter(Boolean).join('; ') };
}

/* ------------------------------------------------------------ glossário */

/**
 * Índices do `glossario-combate.json`: `magia(nome)`, `talento(nome)`, `habilidade(texto)` e
 * `traco(texto)`. A busca ignora maiúsculas e acentos; a de habilidade e a de traço casam o maior
 * nome que abre o texto ("Forma selvagem elemental 3/dia" acha "Forma selvagem elemental", e não
 * "Forma selvagem").
 */
export function criarGlossario(json) {
  const porNome = lista => new Map((lista || []).map(x => [normalize(x.nome), x]));
  const magias = porNome(json?.magias);
  const talentos = porNome(json?.talentos);
  const prefixos = lista => (lista || []).map(x => ({ chave: normalize(x.nome), x })).sort((a, b) => b.chave.length - a.chave.length);
  const classe = prefixos(json?.classe);
  const racas = prefixos(json?.racas);
  const casar = (indice, texto) => {
    const t = normalize(texto);
    return indice.find(({ chave }) => t === chave || (t.startsWith(chave) && /[^a-z0-9]/.test(t[chave.length] ?? ' ')))?.x || null;
  };
  return {
    magia: nome => magias.get(normalize(separarParametro(nome).base)) || null,
    talento: nome => talentos.get(normalize(separarParametro(nome).base)) || null,
    habilidade: texto => casar(classe, texto),
    traco: texto => casar(racas, texto),
    nomes: {
      magias: [...magias.values()].map(x => x.nome),
      talentos: [...talentos.values()].map(x => x.nome),
      classe: classe.map(({ x }) => x.nome),
      racas: racas.map(({ x }) => x.nome),
    },
  };
}

/** O compêndio de talentos (`data/talentos.json`) por nome sem acento e sem parâmetro. */
export const indiceDeTalentos = linhas => new Map((linhas || []).map(t => [normalize(t.nome), t]));

/**
 * O texto da magia: `{ nome, escola, resumo, fonte }` ou null. Uma fonte por magia: a lista curada de
 * `magias30.js` vale primeiro (o card do monstro e o do personagem dizem o mesmo), e o glossário
 * cobre as outras.
 */
const curadas = new Map(MAGIAS.map(m => [normalize(m.nome), m]));
export function textoDaMagia(nome, glossario) {
  const { base } = separarParametro(nome);
  const c = curadas.get(normalize(base));
  if (c) return { nome: c.nome, escola: null, resumo: c.resumo, fonte: c.fonte || null };
  const g = glossario?.magia(base);
  return g ? { nome: g.nome, escola: g.escola || null, resumo: g.resumo, fonte: g.fonte || null } : null;
}

/* ------------------------------------------------------------ pequenas partes */

const NATUREZAS = {
  Ext: ['extraordinária', 'Não é mágica: funciona em campo antimágico e a resistência à magia não a afeta.'],
  Sob: ['sobrenatural', 'É mágica, mas não é magia: a resistência à magia não a afeta, e ela falha em campo antimágico.'],
  SM: ['similar a magia', 'Age como uma magia: a resistência à magia vale contra ela, e ela falha em campo antimágico.'],
};

/** A legenda de cada natureza (Ext, Sob, SM), que a tela mostra quando a ficha tem habilidades dela. */
export const LEGENDA_DAS_NATUREZAS = Object.fromEntries(Object.entries(NATUREZAS).map(([sigla, [nome, explicacao]]) => [sigla, `${sigla} (${nome}): ${explicacao[0].toLowerCase()}${explicacao.slice(1)}`]));

export const naturezaDe = sigla => {
  const n = NATUREZAS[sigla];
  return n ? { sigla, nome: n[0], explicacao: n[1] } : null;
};

const TESTES = { fort: 'Fortitude', ref: 'Reflexos', von: 'Vontade' };
const DADOS_DE_ATRIBUTO = { for: 'For', des: 'Des', con: 'Con', int: 'Int', sab: 'Sab', car: 'Car' };
const ATRIBUTOS = { for: 'Força', des: 'Destreza', con: 'Constituição', int: 'Inteligência', sab: 'Sabedoria', car: 'Carisma' };

/** Crítico no formato do livro: "20/×2", "19–20/×2", "18–20/×3". */
export function textoDoCritico(c) {
  if (!c) return '';
  return `${c.margem >= 20 ? '20' : `${c.margem}–20`}/×${c.multiplicador}`;
}

/** "perfurante e cortante" / "perfurante, cortante e concussão". */
const lista = itens => (itens.length > 1 ? `${itens.slice(0, -1).join(', ')} e ${itens.at(-1)}` : itens[0] || '');

/**
 * Uma linha de ataque: { nome, tipo, bonus, dano, critico, tipoDano, alcance, extras[], efeitos[] }.
 * `especiais`: os especiais do combatente, para dar nome aos `efeitos` (ids) do golpe.
 */
export function linhaDeAtaque(a, especiais = []) {
  const extras = (a.dano_extra || []).map(textoDoDanoExtra);
  if (a.magico) extras.push(`arma mágica ${a.magico}`);
  if (a.material) extras.push(a.material);
  if (a.secundario) extras.push('ataque secundário');
  const distancia = a.incremento_m != null ? `incremento ${metros(a.incremento_m)}` : a.alcance_m != null ? `alcance ${metros(a.alcance_m)}` : '';
  const efeitos = (a.efeitos || []).map(id => especiais.find(s => s.id === id)?.nome || id);
  return {
    nome: a.nome,
    tipo: VALORES[a.tipo] ?? a.tipo,
    bonus: sinal(a.bonus),
    dano: danoLegivel(a.dano),
    critico: textoDoCritico(a.critico),
    tipoDano: lista(a.tipo_dano || []),
    alcance: distancia,
    extras,
    efeitos,
  };
}

/* ------------------------------------------------------------ números de uma mecânica */

const ACRONIMOS = { ca: 'CA', cd: 'CD', pv: 'PV', rd: 'RD', rm: 'RM', dv: 'DV', bba: 'BBA', sm: 'SM', ref: 'Reflexos', fort: 'Fortitude', von: 'Vontade', for: 'For', des: 'Des', con: 'Con', int: 'Int', sab: 'Sab', car: 'Car' };
/** As chaves do catálogo não têm acento: as palavras que o pedem. */
const ACENTOS = {
  acao: 'ação', acoes: 'ações', area: 'área', ate: 'até', automatico: 'automático', bonus: 'bônus', chao: 'chão', condicao: 'condição', constricao: 'constrição',
  continuo: 'contínuo', critico: 'crítico', deflexao: 'deflexão', duracao: 'duração', etico: 'ético', excecoes: 'exceções', execucao: 'execução', expulsao: 'expulsão',
  funcoes: 'funções', lanca: 'lança', maca: 'maça', magico: 'mágico', max: 'máx', minima: 'mínima', nivel: 'nível', niveis: 'níveis', pericia: 'perícia', pericias: 'perícias',
  raca: 'raça', resistencia: 'resistência', resistencias: 'resistências', secundario: 'secundário', senao: 'senão', so: 'só', temporario: 'temporário', temporarios: 'temporários',
  tendencia: 'tendência', tres: 'três', visao: 'visão',
};
/** Rótulos que a regra geral deixa estranhos. */
const ROTULOS = {
  gatilho_texto: 'Gatilho', arremesso_m_por_6_dano: 'Arremesso (m por 6 de dano)', tres_por_dia: 'Três vezes por dia', uma_por_dia: 'Uma vez por dia', uma_vez_por_dia: 'Uma vez por dia',
  dano_atributo: 'Dano de atributo', dano_por_tendencia: 'Dano por tendência', somente_arma: 'Só com a arma', melhoria_arma: 'Melhoria da arma',
};
/** Valores em forma de chave (os gatilhos que não são ataques) e do catálogo sem acento. */
const VALORES = { 'critico-confirmado': 'crítico confirmado', 'ao-atacar': 'ao atacar', 'ao-morrer': 'ao morrer', 'ao-sofrer-dano': 'ao sofrer dano', 'natural-20': 'natural 20', 'toque a distancia': 'toque à distância', distancia: 'à distância', 'mortos-vivos': 'mortos-vivos' };
/** "deslocamento-temporario" → "deslocamento temporário". */
const palavras = t => t.split('-').map(p => ACENTOS[p] ?? p).join(' ');
const MORAL = { B: 'bom', N: 'neutro', M: 'mau' };
const ETICO = { L: 'leal', N: 'neutro', C: 'caótico' };

/** "ca_interna" → "CA interna", "pv_para_sair" → "PV para sair": nunca uma chave crua na tela. */
export function humanizar(chave) {
  if (ROTULOS[chave]) return ROTULOS[chave];
  if (/^n\d$/.test(chave)) return `Nível ${chave[1]}`;
  const texto = String(chave).split('_').filter(Boolean).map(p => ACRONIMOS[p] ?? ACENTOS[p] ?? p).join(' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const decimal = n => String(n).replace('.', ',');
const minuscula = t => (/^[A-ZÀ-Ý]{2}/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1));

/** O texto de um valor da mecânica (número, texto, lista ou objeto); null se não há o que mostrar. */
function valorTexto(v, chave = '', nomes = null) {
  if (v == null || v === false) return null;
  if (v === true) return 'sim';
  if (typeof v === 'number') return /_m$/.test(chave) ? metros(v) : /_pct$/.test(chave) ? `${decimal(v)}%` : decimal(v);
  if (typeof v === 'string') {
    if (chave === 'atributo' && ATRIBUTOS[v]) return ATRIBUTOS[v];
    if (/moral$/.test(chave) && MORAL[v]) return MORAL[v];
    if (/etico$/.test(chave) && ETICO[v]) return ETICO[v];
    if (/^[a-z0-9]+(-[a-z0-9]+)+$/.test(v) && !VALORES[v] && !nomes?.has(v)) return palavras(v);
    return TESTES[v] || VALORES[v] || nomes?.get(v) || danoLegivel(v);
  }
  if (Array.isArray(v)) {
    const itens = v.map(x => valorTexto(x, chave, nomes)).filter(Boolean);
    // uma lista de objetos: cada um entre parênteses, para os separadores não se confundirem
    return (v.some(x => x && typeof x === 'object' && !Array.isArray(x)) ? itens.map(t => `(${t})`).join('; ') : itens.join(', ')) || null;
  }
  // { atributo: 'for', dano: '1d6' } → "1d6 de Força"; { id, nome, … } (uma arma) → o nome
  if (v.atributo && v.dano && Object.keys(v).length === 2) return `${danoLegivel(v.dano)} de ${ATRIBUTOS[v.atributo] ?? v.atributo}`;
  if (v.id && v.nome) return v.nome;
  // a divisão do dano por eixo: { eixo: 'moral', B: 'total', N: 'metade', M: 'nenhum' } → "moral: bom total, neutro metade, mau nenhum"
  if (chave === 'dano_por_tendencia') {
    const nomesDoEixo = v.eixo === 'etico' ? ETICO : MORAL;
    return `${v.eixo === 'etico' ? 'ético' : 'moral'}: ${Object.entries(v).filter(([k]) => k !== 'eixo').map(([k, x]) => `${nomesDoEixo[k] ?? k} ${x}`).join(', ')}`;
  }
  const partes = Object.entries(v).map(([k, x]) => {
    const t = valorTexto(x, k, nomes);
    if (t == null) return null;
    return /^n\d$/.test(k) ? `${minuscula(humanizar(k))}: ${t}` : `${minuscula(humanizar(k))} ${t}`;
  }).filter(Boolean);
  return partes.join(', ') || null;
}

/** "+2d6 de sagrado (moral mau)": um `dano_extra` com a restrição de alvo, se houver. */
function textoDoDanoExtra(d) {
  return `+${danoLegivel(d.dano)} de ${[].concat(d.tipo).join(' e ')}${d.afeta ? ` (${valorTexto(d.afeta, 'afeta')})` : ''}`;
}

/** As chaves com formato próprio; o resto sai depois, com rótulo legível. */
const COM_FORMATO = ['dano', 'tipo_energia', 'cura', 'area', 'tamanho_m', 'raio_m', 'resistencia', 'cd', 'metade_se_passar', 'recarga', 'usos', 'duracao', 'duracao_rodadas', 'condicao', 'pv_por_dia', 'chance_pct', 'bonus', 'dano_extra'];
/** Não são números da habilidade: o tipo do efeito, a nota (que a tela mostra à parte) e o nome da magia. */
const FORA = new Set(['efeito', 'nota', 'magia']);

/**
 * Os números de uma habilidade ou magia, tirados da `mecanica` do catálogo: [{ rotulo, valor }].
 * Toda folha aparece, inclusive a do efeito `outro`: o que não tem formato próprio sai com rótulo
 * legível. O texto (a `descricao`, o resumo da magia e a `nota`) conta a regra; aqui ficam os valores.
 * `nomes`: id → nome dos especiais do combatente (os gatilhos citam ids). `cd`: a CD que vale quando a
 * mecânica não traz a dela (a magia: `cd_base` + nível, a conta do motor).
 */
export function numerosDaMecanica(mec, nomes = null, { cd = null } = {}) {
  if (!mec) return [];
  const out = [];
  const poe = (rotulo, valor) => {
    if (valor != null && valor !== '') out.push({ rotulo, valor: String(valor) });
  };
  const tipos = [].concat(mec.tipo_energia || []);
  const extras = (mec.dano_extra || []).map(textoDoDanoExtra);
  if (mec.dano) poe('Dano', `${danoLegivel(mec.dano)}${tipos.length ? ` de ${tipos.join(' e ')}` : ''}`);
  else if (tipos.length) poe('Energia', tipos.join(' e '));
  if (extras.length) poe('Dano extra', extras.join(' '));
  if (mec.cura) poe('Cura', danoLegivel(mec.cura));
  if (mec.area) poe('Área', [mec.area, mec.tamanho_m != null ? metros(mec.tamanho_m) : null].filter(Boolean).join(' de '));
  else if (mec.tamanho_m != null) poe('Tamanho', metros(mec.tamanho_m));
  poe('Raio', mec.raio_m != null ? metros(mec.raio_m) : null);
  const valeCd = mec.cd ?? (mec.resistencia ? cd : null);
  if (valeCd != null || mec.resistencia) poe('Teste', [[TESTES[mec.resistencia], valeCd != null ? `CD ${valeCd}` : null].filter(Boolean).join(' '), mec.metade_se_passar === true ? 'metade se passar' : null].filter(Boolean).join(', '));
  else if (mec.metade_se_passar === true) poe('Se passar', 'metade do dano');
  if (typeof mec.metade_se_passar === 'string') poe('Se passar', mec.metade_se_passar);
  if (mec.recarga != null) poe('Recarga', typeof mec.recarga === 'number' ? `${mec.recarga} ${mec.recarga === 1 ? 'rodada' : 'rodadas'}` : `${mec.recarga} rodadas`);
  poe('Usos', mec.usos);
  poe('Duração', mec.duracao ?? (mec.duracao_rodadas != null ? `${mec.duracao_rodadas} rodadas` : null));
  poe('Condição', mec.condicao);
  poe('Cura por dia', mec.pv_por_dia != null ? `${mec.pv_por_dia} PV` : null);
  poe('Chance', mec.chance_pct != null ? `${mec.chance_pct}%` : null);
  if (mec.bonus) {
    // "Bônus" para o que é só vantagem; com penalidade ou nível negativo, "Efeito"
    const rotulo = Object.keys(mec.bonus).some(k => ['niveis_negativos', 'penalidade_for', 'penalidade'].includes(k)) ? 'Efeito' : 'Bônus';
    poe(rotulo, Object.keys(mec.bonus).every(k => chavesDeBonus.includes(k)) ? bonusLegivel(mec.bonus) : valorTexto(mec.bonus, 'bonus', nomes));
  }
  for (const [k, v] of Object.entries(mec)) {
    if (FORA.has(k) || COM_FORMATO.includes(k)) continue;
    poe(humanizar(k.replace(/_m$/, '').replace(/_pct$/, '')), valorTexto(v, k, nomes));
  }
  return out;
}

/* ------------------------------------------------------------ modelo do card de catálogo */

/** Cor e ícone do cabeçalho pelo tipo e pelos subtipos. */
export function temaDe(e) {
  const subs = (e.subtipos || []).map(normalize);
  const tipo = normalize(e.tipo);
  if (subs.includes('fogo') || tipo === 'dragao') return 'ember';
  if (subs.includes('frio') || subs.includes('agua') || subs.includes('ar')) return 'azure';
  if (tipo === 'morto-vivo' || tipo === 'aberracao' || tipo === 'extra-planar' || subs.includes('mau')) return 'arcane';
  if (['animal', 'besta', 'besta magica', 'planta', 'verme', 'fada', 'limo'].includes(tipo)) return 'verdant';
  return 'gold';
}

function deslocamentos(d) {
  const partes = [];
  if (d.terrestre != null) partes.push(`terrestre ${metros(d.terrestre)}`);
  if (d.voo != null) partes.push(`voo ${metros(d.voo)}${d.voo_manobrabilidade ? ` (${d.voo_manobrabilidade})` : ''}`);
  if (d.natacao != null) partes.push(`natação ${metros(d.natacao)}`);
  if (d.escalada != null) partes.push(`escalada ${metros(d.escalada)}`);
  if (d.escavacao != null) partes.push(`escavação ${metros(d.escavacao)}`);
  return partes.join(', ') || '—';
}

function defesasDe(e) {
  const out = [];
  const poe = (rotulo, valor) => valor != null && valor !== '' && out.push({ rotulo, valor: String(valor) });
  if (e.reducao_dano) poe('Redução de dano', `${e.reducao_dano.valor}/${e.reducao_dano.exceto}`);
  if (e.resistencia_magia != null) poe('Resistência à magia', e.resistencia_magia);
  const energia = Object.entries(e.resistencias_energia || {});
  poe('Resistência a energia', energia.map(([k, v]) => `${k} ${v}`).join(', '));
  poe('Imunidades', (e.imunidades || []).join(', '));
  poe(`Imunidades do tipo ${e.tipo}`, (IMUNIDADES_DE_TIPO[e.tipo] || []).filter(i => !(e.imunidades || []).includes(i)).join(', '));
  poe('Vulnerabilidades', (e.vulnerabilidades || []).join(', '));
  if (e.regeneracao) {
    const r = e.regeneracao;
    // `exceto`: energias ("fogo") ou uma arma ({ arma: { qualidade, bonus_minimo } })
    const arma = x => `armas ${[].concat(x.qualidade || []).join(' ou ')}${x.bonus_minimo ? ` de bônus +${x.bonus_minimo} ou mais` : ''}`;
    const exceto = lista([].concat(r.exceto || [], r.arma ? [{ arma: r.arma }] : []).map(x => (typeof x === 'string' ? x : arma(x.arma))));
    poe('Regeneração', `${r.valor}${exceto ? ` (só ${exceto} impedem)` : ''}${r.resiste_morte ? '; efeito de morte só o derruba' : ''}`);
  }
  if (e.cura_acelerada != null) poe('Cura acelerada', e.cura_acelerada);
  poe('Começa', (e.condicoes_iniciais || []).join(', '));
  return out;
}

/** A `nota` da mecânica que fala ao leitor: a que cita chaves do catálogo (`dano_extra`) é de quem o mantém. */
const notaLegivel = nota => (nota && !/_|\bmotor\b|\bo efeito\b|\b[a-z]+(-[a-z]+){2,}\b/.test(nota) ? nota : null);

function habilidade(s, glossario, nomes) {
  const m = s.mecanica;
  const sm = m?.efeito === 'magia' && m.magia ? textoDaMagia(m.magia, glossario) : null;
  return {
    id: s.id,
    nome: s.nome,
    natureza: naturezaDe(s.natureza),
    descricao: s.descricao || '',
    numeros: numerosDaMecanica(m, nomes),
    nota: notaLegivel(m?.nota),
    magia: sm ? { nome: sm.nome, escola: sm.escola || null, resumo: sm.resumo, fonte: sm.fonte || null } : null,
  };
}

/** Agrupa os itens por nível de magia, do menor ao maior: [{ nivel, itens }]. */
function agruparPorNivel(itens) {
  const grupos = new Map();
  for (const { nivel, item } of itens) (grupos.get(nivel) || grupos.set(nivel, []).get(nivel)).push(item);
  return [...grupos].sort((a, b) => a[0] - b[0]).map(([nivel, lista2]) => ({ nivel, itens: lista2 }));
}

function magiasDoCatalogo(e, glossario, nomes) {
  const mg = e.magias;
  if (!mg) return null;
  const itens = (mg.lista || []).map(m => {
    const g = textoDaMagia(m.nome, glossario);
    return {
      nivel: m.nivel,
      item: {
        nome: m.nome,
        quantidade: m.quantidade,
        numeros: numerosDaMecanica(m.mecanica, nomes, { cd: (mg.cd_base ?? 0) + m.nivel }),
        nota: notaLegivel(m.mecanica?.nota),
        escola: g?.escola || null,
        resumo: g?.resumo || '',
        fonte: g?.fonte || null,
        variante: separarParametro(m.nome).parametro || null,
      },
    };
  });
  return {
    classe: mg.classe,
    nivelConjurador: mg.nivel_conjurador,
    atributo: DADOS_DE_ATRIBUTO[mg.atributo] || mg.atributo,
    cdBase: mg.cd_base,
    grupos: agruparPorNivel(itens),
  };
}

/** Os talentos com benefício: compêndio primeiro, glossário para os que ele não tem. O mesmo talento repetido vira "×2". */
export function descreverTalentos(nomes, { compendio, glossario }) {
  const out = [];
  for (const nome of nomes || []) {
    // "Usar Armadura (leve)" é o nome inteiro de um talento do compêndio; "Foco em Arma (espada longa)" é um talento com parâmetro
    const inteiro = compendio?.get(normalize(nome));
    const { base, parametro } = inteiro ? { base: String(nome).trim(), parametro: '' } : separarParametro(nome);
    const c = inteiro || compendio?.get(normalize(base));
    const g = c ? null : glossario?.talento(base);
    const igual = out.find(t => t.nome === base && t.parametro === parametro);
    if (igual) {
      igual.vezes++;
      continue;
    }
    out.push({
      nome: base,
      parametro,
      vezes: 1,
      beneficio: c?.beneficio || g?.beneficio || '',
      normal: c?.normal || null,
      requisitos: c?.requisitos || g?.requisitos || null,
      origem: c ? 'compêndio' : g ? 'glossário' : null,
    });
  }
  return out;
}

/**
 * O card de um combatente do catálogo (monstro ou Holy Avenger).
 * `ctx`: `{ compendio: indiceDeTalentos(...), glossario: criarGlossario(...) }`.
 */
export function montarCardCatalogo(e, { compendio = null, glossario = null } = {}) {
  const especiais = [...(e.ataques_especiais || []), ...(e.qualidades_especiais || [])];
  const nomesDosEspeciais = new Map(especiais.map(s => [s.id, s.nome]));
  const ca = e.ca;
  const classes = (e.classes || []).map(c => `${c.classe} ${c.nivel}`).join(' / ');
  const tipo = [e.tipo, e.tamanho && e.tamanho.toLowerCase(), (e.subtipos || []).length ? `(${e.subtipos.join(', ')})` : null].filter(Boolean).join(' ');
  return {
    id: e.id,
    origem: 'catalogo',
    categoria: e.categoria,
    nome: e.nome,
    nomeOriginal: e.nome_original || null,
    tema: temaDe(e),
    icone: e.categoria === 'holy_avenger' ? 'shield' : 'flame',
    selo: `ND ${ndRotulo(e.nd)}`,
    subtitulo: [tipo, e.tendencia ? rotuloTendencia(e.tendencia) : null].filter(Boolean).join(' · '),
    identidade: [classes, e.raca].filter(Boolean).join(' · '),
    resumo: e.resumo || '',
    numeros: [
      { rotulo: 'PV', valor: String(e.pv), detalhe: e.dados_vida },
      { rotulo: 'CA', valor: String(ca.total), detalhe: `toque ${ca.toque}, surpresa ${ca.surpresa}${ca.composicao ? ` · ${ca.composicao}` : ''}` },
      { rotulo: 'Iniciativa', valor: sinal(e.iniciativa) },
      { rotulo: 'Deslocamento', valor: deslocamentos(e.deslocamento) },
      { rotulo: 'BBA / Agarrar', valor: `${sinal(e.bba)} / ${sinal(e.agarrar)}` },
      { rotulo: 'Espaço / Alcance', valor: `${metros(e.espaco)} / ${metros(e.alcance)}` },
      { rotulo: 'Resistências', valor: `Fort ${sinal(e.resistencias.fort)}, Ref ${sinal(e.resistencias.ref)}, Von ${sinal(e.resistencias.von)}` },
    ],
    atributos: Object.entries(DADOS_DE_ATRIBUTO).map(([k, rotulo]) => {
      const v = e.atributos?.[k];
      return { chave: k, rotulo, valor: v == null ? '—' : String(v), mod: modificador(v) };
    }),
    defesas: defesasDe(e),
    ataques: {
      unico: (e.ataques || []).map(a => linhaDeAtaque(a, especiais)),
      total: (e.ataque_total || []).map(a => linhaDeAtaque(a, especiais)),
      distancia: (e.ataque_total_distancia || []).map(a => linhaDeAtaque(a, especiais)),
    },
    habilidades: {
      ataques: (e.ataques_especiais || []).map(s => habilidade(s, glossario, nomesDosEspeciais)),
      qualidades: (e.qualidades_especiais || []).map(s => habilidade(s, glossario, nomesDosEspeciais)),
    },
    magias: magiasDoCatalogo(e, glossario, nomesDosEspeciais),
    talentos: descreverTalentos(e.talentos, { compendio, glossario }),
    pericias: (e.pericias || []).map(p => ({ nome: p.nome, total: sinal(p.total) })),
    equipamento: e.equipamento || [],
    rodape: {
      tatica: e.tatica || '',
      fonte: e.fonte || null,
      adaptacao: e.adaptacao || null,
    },
  };
}

/* ------------------------------------------------------------ modelo do card de personagem */

const SLOTS = [['principal', 'Arma principal'], ['secundaria', 'Mão inábil'], ['distancia', 'À distância'], ['armadura', 'Armadura'], ['escudo', 'Escudo']];

/** O equipamento que o personagem usa na Arena: [{ slot, item }]. */
export function equipamentoDoCard(eq) {
  return SLOTS.map(([slot, rotulo]) => ({ slot: rotulo, item: rotuloItem(eq?.[slot]) })).filter(x => x.item);
}

/**
 * Magias do personagem (a lista curada de `magias30.js`, com o `resumo` e o link do SRD). A mesma
 * magia em dois espaços (paladino) soma as vezes; quem conhece as magias (quantidade interna 99) e
 * a conversão em cura do clérigo não têm "×N".
 */
function magiasDoPersonagem(ficha) {
  const mg = ficha?.magias;
  if (!mg) return null;
  const itens = [];
  for (const m of mg.lista || []) {
    const ilimitada = m.quantidade >= 99;
    const chave = `${m.id}|${m.conversao ? 'c' : ''}|${ilimitada ? 'i' : ''}`;
    const igual = itens.find(x => x.chave === chave);
    if (igual && !ilimitada) {
      igual.item.quantidade += m.quantidade;
      continue;
    }
    const base = magiaPorId(m.id);
    itens.push({
      chave,
      nivel: m.nivel,
      item: {
        nome: m.nome,
        quantidade: ilimitada ? null : m.quantidade,
        numeros: numerosDaMecanica(m.mecanica, null, { cd: mg.cd_base + m.nivel }),
        nota: null,
        escola: null,
        resumo: base?.resumo || '',
        fonte: base?.fonte || null,
        variante: m.conversao ? 'troca por uma magia preparada' : ilimitada ? 'conhecida: usa os espaços do dia' : null,
      },
    });
  }
  return {
    classe: mg.classe,
    nivelConjurador: mg.nivel_conjurador,
    atributo: DADOS_DE_ATRIBUTO[String(mg.atributo).toLowerCase()] || mg.atributo,
    cdBase: mg.cd_base,
    grupos: agruparPorNivel(itens),
  };
}

/**
 * O card de um personagem do jogador na Arena: como ele luta (equipamento e magias salvos).
 * `p`: a entrada da Arena (`{ id, nome, sheet, personagem, ficha, equipamento, erros, avisos, talentos }`).
 * `concedidos`: os talentos que a classe e a raça dão (`grantedFeats`).
 * Sem `ficha` (o personagem não pode lutar), os números vêm da ficha impressa.
 */
export function montarCardPersonagem(p, { compendio = null, glossario = null, concedidos = [] } = {}) {
  const { sheet, ficha } = p;
  const L = sheet.nivel;
  const classe = sheet.identidade.classe;
  const ca = ficha?.ca;
  const especiaisDeClasse = (sheet.habilidadesClasse || []).map(texto => ({ nome: texto, descricao: glossario?.habilidade(texto)?.resumo || '' }));
  const tracos = (sheet.tracosRaciais || []).map(texto => ({ nome: texto, descricao: glossario?.traco(texto)?.resumo || '' }));
  const escolhidos = (p.talentos || []).map(t => (t.parametro ? `${t.nome} (${t.parametro})` : t.nome));
  const dosCompendio = descreverTalentos(escolhidos, { compendio, glossario }).map(t => ({ ...t, origem: 'escolhido' }));
  const jaTem = new Set(dosCompendio.map(t => normalize(t.nome)));
  const novos = concedidos.filter(c => !jaTem.has(normalize(c.nome)));
  const dados = descreverTalentos(novos.map(c => (c.parametro ? `${c.nome} (${c.parametro})` : c.nome)), { compendio, glossario })
    .map((t, i) => ({ ...t, origem: `concedido pela ${novos[i].origem}` }));
  const resist = Object.fromEntries((sheet.resistencias || []).map(r => [r.key, r.total]));
  const pv = ficha?.pvMax ?? sheet.pv?.total ?? null;
  const caTotal = ca?.total ?? sheet.ca?.total ?? null;
  const desloc = ficha ? ficha.deslocamento : { terrestre: sheet.deslocamento ?? null };
  const defesas = [];
  if (ficha?.rd) defesas.push({ rotulo: 'Redução de dano', valor: `${ficha.rd.valor}/${ficha.rd.exceto}` });
  if (ficha?.rm != null) defesas.push({ rotulo: 'Resistência à magia', valor: String(ficha.rm) });
  if (ficha?.imunidades?.length) defesas.push({ rotulo: 'Imunidades', valor: ficha.imunidades.join(', ') });
  if (sheet.condicionais?.length) defesas.push({ rotulo: 'Condicionais', valor: sheet.condicionais.join('; ') });
  return {
    id: p.id,
    origem: 'personagem',
    categoria: 'personagem',
    nome: p.nome,
    nomeOriginal: null,
    tema: 'gold',
    icone: 'hero',
    selo: `Nível ${L}`,
    subtitulo: [[classe ? `${classe} ${L}` : `${L}º nível, sem classe`, sheet.identidade.raca || 'sem raça'].join(' · '), rotuloTendencia(p.personagem?.tendencia)].filter(Boolean).join(' · '),
    identidade: sheet.identidade.tamanho || '',
    resumo: '',
    avisoDeLuta: p.erros?.length ? `Não pode lutar: ${p.erros.join('; ')}.` : '',
    avisos: p.avisos || [],
    numeros: [
      { rotulo: 'PV', valor: pv == null ? '—' : String(pv), detalhe: sheet.pv?.dadoVida ? `${L}${sheet.pv.dadoVida}` : null },
      { rotulo: 'CA', valor: caTotal == null ? '—' : String(caTotal), detalhe: ca ? `toque ${ca.toque}, surpresa ${ca.surpresa}` : null },
      { rotulo: 'Iniciativa', valor: sinal(ficha?.iniciativa ?? sheet.iniciativa?.total) },
      { rotulo: 'Deslocamento', valor: deslocamentos(desloc) },
      { rotulo: 'BBA / Agarrar', valor: ficha ? `${sinal(ficha.bba)} / ${sinal(ficha.agarrar)}` : sinal(sheet.bba?.valor) },
      { rotulo: 'Resistências', valor: `Fort ${sinal(resist.fort)}, Ref ${sinal(resist.ref)}, Von ${sinal(resist.von)}` },
    ],
    atributos: (sheet.atributos || []).map(a => ({ chave: a.key, rotulo: a.abbr[0] + a.abbr.slice(1).toLowerCase(), valor: a.total == null ? '—' : String(a.total), mod: a.mod == null ? '—' : sinal(a.mod) })),
    defesas,
    ataques: {
      unico: (ficha?.ataques || []).map(a => linhaDeAtaque(a)),
      total: (ficha?.ataqueTotal || []).map(a => linhaDeAtaque(a)),
      distancia: (ficha?.ataqueTotalDistancia || []).map(a => linhaDeAtaque(a)),
    },
    habilidades: { ataques: [], qualidades: [], classe: especiaisDeClasse, racas: tracos },
    magias: magiasDoPersonagem(ficha),
    talentos: [...dosCompendio, ...dados],
    pericias: (sheet.pericias || []).filter(x => x.graduacoes > 0).map(x => ({ nome: x.nome, total: sinal(x.total), graduacoes: x.graduacoes })),
    equipamento: equipamentoDoCard(p.equipamento).map(x => `${x.slot}: ${x.item}`),
    rodape: { tatica: '', fonte: null, adaptacao: null, fichaHref: `#/personagens/${String(p.id).replace(/^p:/, '')}/ficha` },
  };
}
