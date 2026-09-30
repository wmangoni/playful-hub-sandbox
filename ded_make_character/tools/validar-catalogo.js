/**
 * Valida o catálogo de combate (data/catalogo-combate.json) contra o formato de tools/catalogo-combate.md
 * (os itens marcados com ✔ no documento).
 * Uso: node ded_make_character/tools/validar-catalogo.js [arquivo.json] [monstros|holy_avenger]
 *   Sem argumento, valida data/catalogo-combate.json. Com um array puro, informe a seção.
 */
const fs = require('fs');
const path = require('path');

const TAMANHOS = ['Mínimo', 'Minúsculo', 'Pequeno', 'Médio', 'Grande', 'Enorme', 'Imenso', 'Colossal'];
const AGARRAR_TAMANHO = { Mínimo: -16, Minúsculo: -8, Pequeno: -4, Médio: 0, Grande: 4, Enorme: 8, Imenso: 12, Colossal: 16 };
const TENDENCIAS = ['LB', 'NB', 'CB', 'LN', 'N', 'CN', 'LM', 'NM', 'CM'];
const TIPOS = ['Aberração', 'Animal', 'Besta', 'Besta Mágica', 'Constructo', 'Dragão', 'Elemental', 'Fada', 'Gigante', 'Humanoide', 'Humanoide Monstruoso', 'Limo', 'Extra-Planar', 'Planta', 'Morto-Vivo', 'Verme'];
const TIPOS_ATAQUE = ['corpo a corpo', 'distancia', 'toque', 'toque a distancia'];
const TIPOS_DANO = ['cortante', 'perfurante', 'concussão'];
const MATERIAIS = ['prata', 'adamante', 'mitral'];
const NATUREZAS = ['Ext', 'Sob', 'SM'];
const RESISTENCIAS = ['fort', 'ref', 'von'];
const ENERGIAS = ['fogo', 'frio', 'eletricidade', 'ácido', 'sônico', 'energia', 'energia negativa', 'energia positiva', 'divino', 'sagrado', 'profano', 'caótico', 'leal'];
const CONDICOES = ['abalado', 'amedrontado', 'apavorado', 'atordoado', 'cambaleante', 'cego', 'confuso', 'derrubado', 'enfeitiçado', 'enjoado', 'enredado', 'fatigado', 'exausto', 'imobilizado', 'inconsciente', 'lento', 'nauseado', 'paralisado', 'pasmo', 'petrificado', 'surdo', 'morto'];
/** Eixos de tendência: ético (Leal/Neutro/Caótico) e moral (Bom/Neutro/Mau). A tendência "N" é neutra nos dois. */
const EIXOS = { etico: ['L', 'N', 'C'], moral: ['B', 'N', 'M'] };
/** Duração: dado ou número + unidade, ou uma das formas por extenso. */
const DURACAO = /^((\d+d\d+([+-]\d+)?|\d+) (rodadas?|minutos?|horas?)\b|permanente|instantânea|concentração|até |enquanto )/;
/** Campos aceitos no combatente, no ataque e no dano extra (qualquer outro é erro). */
const CAMPOS_COMBATENTE = ['id', 'nome', 'nome_original', 'categoria', 'nd', 'nivel', 'classes', 'raca', 'tipo', 'subtipos', 'tamanho', 'tendencia', 'resumo', 'dados_vida', 'pv', 'iniciativa', 'deslocamento', 'espaco', 'alcance', 'ca', 'bba', 'agarrar', 'ataques', 'ataque_total', 'ataque_total_distancia', 'ataques_especiais', 'qualidades_especiais', 'reducao_dano', 'resistencia_magia', 'resistencias_energia', 'imunidades', 'vulnerabilidades', 'regeneracao', 'cura_acelerada', 'resistencias', 'atributos', 'pericias', 'talentos', 'equipamento', 'magias', 'tatica', 'fonte', 'adaptacao'];
const CAMPOS_ATAQUE = ['nome', 'tipo', 'bonus', 'dano', 'critico', 'tipo_dano', 'natural', 'secundario', 'alcance_m', 'incremento_m', 'magico', 'material', 'dano_extra', 'efeitos'];
const CAMPOS_DANO_EXTRA = ['dano', 'tipo', 'afeta'];
/** Chaves aceitas em `bonus` (efeitos de magias e auras). */
const BONUS = ['ca', 'ca_natural', 'ca_deflexao', 'ataque', 'dano', 'resistencias', 'fort', 'ref', 'von', 'for', 'des', 'con', 'int', 'sab', 'car', 'pv_temporarios', 'camuflagem_pct', 'niveis_negativos', 'penalidade_for', 'imagens', 'acoes_extras', 'pericias', 'anula', 'rm', 'bba_efetivo', 'for_minima', 'tamanho', 'dano_arma', 'contra_medo'];
/** Chaves aceitas em `afeta` (restrição de quem sofre o efeito). */
const AFETA = ['etico', 'exceto_etico', 'moral', 'exceto_moral', 'tipo', 'exceto_tipo', 'exceto_subtipo', 'exceto_raca', 'exceto_estado', 'dv_max', 'pv_max', 'tamanho_max', 'somente'];
const IMUNIDADES = [...ENERGIAS, 'veneno', 'sono', 'paralisia', 'atordoamento', 'doença', 'acertos críticos', 'dano por contusão', 'dano de atributo', 'dreno de energia', 'efeitos de ação mental', 'morte por dano maciço', 'efeitos de morte', 'metamorfose', 'medo', 'enfeitiçar', 'derrubar', 'petrificação', 'magia'];
const QUANDO = ['ao-atacar', 'olhar', 'ao-morrer', 'ao-sofrer-dano', 'critico-confirmado', 'natural-20'];
const ALVOS_DESTRUIR = ['maligno', 'bom', 'leal', 'caótico', 'qualquer'];
const AREAS_SOPRO = ['cone', 'linha', 'cubo', 'raio'];
const MARGENS = [15, 17, 18, 19, 20];
/** Monstros que são Product Identity da Wizards e ficaram fora do SRD 3.0 (nome em inglês). */
const PRODUCT_IDENTITY = ['beholder', 'mind flayer', 'illithid', 'githyanki', 'githzerai', 'displacer beast', 'carrion crawler', 'yuan-ti', 'kuo-toa', 'slaad', 'umber hulk', 'gauth', 'beholder mage'];
/** Talentos fora do compêndio aceitos: de monstro (Monster Manual 3.0) e de Tormenta usados por fichas oficiais. */
const TALENTOS_EXTRAS = ['ATAQUES MÚLTIPLOS', 'ATAQUE EM VOO', 'MULTIDESTREZA', 'COMBATER COM MÚLTIPLAS ARMAS', 'TRAPACEIRO NATO', 'FÚRIA GUERREIRA'];

/**
 * Campos por efeito: `obrigatorios` sempre; `algum` = pelo menos um destes grupos (cada grupo é uma lista de campos
 * que precisam vir juntos); `opcionais` = os demais aceitos. Qualquer outro campo é erro (exceto `nota`, aceita em
 * todos, e no efeito `outro`, que é livre). Os valores de cada campo são conferidos em `conferirCampo`.
 */
const EFEITOS = {
  sopro: { obrigatorios: ['area', 'tamanho_m', 'resistencia', 'cd', 'recarga'], algum: [['dano', 'tipo_energia'], ['condicao'], ['veneno']], opcionais: ['metade_se_passar', 'duracao', 'afeta', 'condicao_afeta', 'compartilhada_com', 'acao', 'primeiro_uso', 'nuvem_dura'] },
  'agarrar-aprimorado': { obrigatorios: ['gatilho'], opcionais: ['tamanho_max', 'dano_por_rodada', 'requer'] },
  constricao: { obrigatorios: ['dano', 'tipo_dano'], opcionais: ['tamanho_max'] },
  engolir: { obrigatorios: ['tamanho_max', 'dano_por_rodada', 'ca_interna', 'pv_para_sair'], opcionais: ['dano_extra', 'capacidade'] },
  engolfar: { obrigatorios: ['tamanho_max', 'resistencia', 'cd'], opcionais: ['dano_por_rodada', 'tipo_energia', 'condicao', 'duracao', 'paralisia', 'acao'] },
  rasgar: { obrigatorios: ['requer', 'dano'], opcionais: [] },
  bote: { obrigatorios: [], opcionais: [] },
  atropelar: { obrigatorios: ['dano', 'resistencia', 'cd'], opcionais: ['metade_se_passar', 'tamanho_max'] },
  esmagar: { obrigatorios: ['tamanho_max', 'dano', 'resistencia', 'cd'], opcionais: ['tipo_dano', 'acao', 'area'] },
  veneno: { obrigatorios: ['gatilho', 'resistencia', 'cd', 'inicial', 'secundario'], opcionais: [] },
  'presenca-aterradora': { obrigatorios: ['quando', 'raio_m', 'resistencia', 'cd', 'condicao', 'duracao'], opcionais: ['afeta', 'efeitos_por_dv'] },
  paralisia: { obrigatorios: ['gatilho', 'resistencia', 'cd', 'duracao'], opcionais: ['afeta'] },
  'condicao-ao-acertar': { obrigatorios: ['gatilho', 'resistencia', 'cd', 'condicao', 'duracao'], opcionais: ['afeta'] },
  'dreno-energia': { obrigatorios: ['gatilho', 'niveis', 'cd'], opcionais: [] },
  petrificacao: { obrigatorios: ['resistencia', 'cd'], algum: [['quando'], ['gatilho']], opcionais: ['alcance_m', 'permanente'] },
  magia: {
    obrigatorios: ['magia', 'usos'],
    algum: [['dano'], ['cura'], ['condicao'], ['bonus'], ['efeitos_por_dv']],
    opcionais: ['nivel_conjurador', 'cd', 'tipo_energia', 'dano_extra', 'area', 'alvo', 'resistencia', 'metade_se_passar', 'duracao', 'afeta', 'condicao_afeta', 'ataque', 'acerto_automatico', 'dano_por_tendencia', 'duracao_por_pv', 'pv_temporarios', 'tempo_de_execucao'],
  },
  aura: { obrigatorios: ['raio_m'], algum: [['dano', 'tipo_energia'], ['condicao'], ['bonus'], ['dano_atributo']], opcionais: ['resistencia', 'cd', 'duracao', 'afeta', 'condicao_afeta', 'alvo', 'acao'] },
  queimar: { obrigatorios: ['gatilho', 'resistencia', 'cd', 'dano', 'tipo_energia'], opcionais: ['duracao', 'apagar', 'ao_ser_atingido'] },
  'ataque-furtivo': { obrigatorios: ['dano'], opcionais: [] },
  evasao: { obrigatorios: [], opcionais: ['aprimorada'] },
  furia: { obrigatorios: ['usos', 'for', 'con', 'von', 'ca', 'duracao_rodadas'], opcionais: ['maior', 'sem_fadiga'] },
  destruir: { obrigatorios: ['usos', 'bonus_ataque', 'bonus_dano', 'alvo'], opcionais: [] },
  'inspirar-coragem': { obrigatorios: ['usos', 'bonus_ataque', 'bonus_dano'], opcionais: ['bonus_contra_medo', 'duracao'] },
  camuflagem: { obrigatorios: ['chance_pct'], opcionais: [] },
  'falha-de-magia': { obrigatorios: ['chance_pct'], opcionais: ['aplica_a', 'retorna_ao_dono'] },
  vorpal: { obrigatorios: ['gatilho', 'quando'], opcionais: ['resultado'] },
  'explosao-ao-morrer': { obrigatorios: ['quando', 'raio_m', 'dano', 'resistencia', 'cd'], opcionais: ['tipo_energia', 'metade_se_passar'] },
  'imunidade-magia': { obrigatorios: [], opcionais: ['abrange', 'excecoes'] },
  'refletir-magia': { obrigatorios: ['afeta', 'chance_pct'], opcionais: ['senao', 'ordem'] },
  enredar: { obrigatorios: ['gatilho', 'condicao'], opcionais: ['escapar', 'puxar', 'alcance_max_m', 'incremento_m', 'pv_chicote'] },
  'cura-pelas-maos': { obrigatorios: ['pv_por_dia'], opcionais: [] },
  outro: { obrigatorios: [], opcionais: [] },
};

const DADO = /^\d+d\d+([+-]\d+)?$/;
const DADOS_VIDA = /^\d+d\d+(\+\d+d\d+)*([+-]\d+)?$/; // ex.: 10d10+10d8+60 (multiclasse)
const ATRIB = ['for', 'des', 'con', 'int', 'sab', 'car'];

const isInt = v => Number.isInteger(v);
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const isStr = v => typeof v === 'string' && v.trim().length > 0;
const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const mod = s => (isInt(s) ? Math.floor((s - 10) / 2) : 0);
const media = dados => {
  const s = String(dados).replace(/\s/g, '');
  if (!DADOS_VIDA.test(s)) return null;
  let total = 0;
  for (const [, n, d] of s.matchAll(/(\d+)d(\d+)/g)) total += (Number(n) * (Number(d) + 1)) / 2;
  const fixo = /([+-]\d+)$/.exec(s.replace(/\d+d\d+/g, 'X'));
  return Math.floor(total) + (fixo ? Number(fixo[1]) : 0);
};
const semParametro = nome => String(nome).replace(/\s*\(.*\)\s*$/, '').trim().toUpperCase();

let talentosCompendio = null;
function compendio() {
  if (!talentosCompendio) {
    const doc = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'talentos.json'), 'utf8'));
    talentosCompendio = new Set(doc.rows.map(r => String(r.nome).toUpperCase()));
  }
  return talentosCompendio;
}

/** Valida uma seção ("monstros" ou "holy_avenger"). Devolve { erros, avisos }. */
function validarSecao(lista, secao) {
  const erros = [];
  const avisos = [];
  if (!['monstros', 'holy_avenger'].includes(secao)) return { erros: [`seção desconhecida "${secao}"`], avisos };
  if (!Array.isArray(lista)) return { erros: [`seção "${secao}" não é um array`], avisos };

  const energia = (v, onde) => {
    const lista = Array.isArray(v) ? v : [v];
    if (!lista.length || lista.some(e => !ENERGIAS.includes(e))) erros.push(`${onde}: energia ${JSON.stringify(v)} fora da lista`);
  };

  function ataque(a, onde) {
    if (!isObj(a)) return erros.push(`${onde}: ataque inválido`);
    if (!isStr(a.nome)) erros.push(`${onde}: nome`);
    if (!TIPOS_ATAQUE.includes(a.tipo)) erros.push(`${onde}: tipo "${a.tipo}"`);
    if (!isInt(a.bonus)) erros.push(`${onde}: bonus deve ser inteiro`);
    if (!DADO.test(String(a.dano))) erros.push(`${onde}: dano "${a.dano}" fora do formato NdM+K`);
    if (!isObj(a.critico) || !MARGENS.includes(a.critico.margem) || ![2, 3, 4].includes(a.critico.multiplicador)) erros.push(`${onde}: critico ${JSON.stringify(a.critico)}`);
    const toque = a.tipo === 'toque' || a.tipo === 'toque a distancia';
    if (!Array.isArray(a.tipo_dano) || a.tipo_dano.some(t => !TIPOS_DANO.includes(t)) || (!a.tipo_dano.length && !toque)) erros.push(`${onde}: tipo_dano ${JSON.stringify(a.tipo_dano)}`);
    if (typeof a.natural !== 'boolean') erros.push(`${onde}: natural (bool)`);
    if (typeof a.secundario !== 'boolean') erros.push(`${onde}: secundario (bool)`);
    if ((a.tipo === 'distancia' || a.tipo === 'toque a distancia') && !isNum(a.incremento_m)) erros.push(`${onde}: ataque à distância sem incremento_m`);
    if (a.magico != null && !/^\+[1-6]$/.test(a.magico)) erros.push(`${onde}: magico ${JSON.stringify(a.magico)} (null ou "+1" a "+6")`);
    if (a.material != null && !MATERIAIS.includes(a.material)) erros.push(`${onde}: material ${JSON.stringify(a.material)}`);
    if (a.dano_extra !== undefined && !Array.isArray(a.dano_extra)) erros.push(`${onde}: dano_extra (array)`);
    for (const d of Array.isArray(a.dano_extra) ? a.dano_extra : []) {
      if (!isObj(d) || !DADO.test(String(d.dano))) { erros.push(`${onde}: dano_extra ${JSON.stringify(d)}`); continue; }
      energia(d.tipo, `${onde} dano_extra`);
      for (const k of Object.keys(d)) if (!CAMPOS_DANO_EXTRA.includes(k)) erros.push(`${onde}: dano_extra com campo "${k}" fora do formato`);
      if (d.afeta !== undefined) conferirAfeta(d.afeta, `${onde} dano_extra.afeta`);
    }
    if (!Array.isArray(a.efeitos)) erros.push(`${onde}: efeitos (array)`);
    for (const k of Object.keys(a)) if (!CAMPOS_ATAQUE.includes(k)) erros.push(`${onde}: ataque com campo "${k}" fora do formato`);
  }

  function conferirAfeta(v, onde) {
    if (!isObj(v)) return erros.push(`${onde} (objeto)`);
    for (const [chave, valor] of Object.entries(v)) {
      if (!AFETA.includes(chave)) { erros.push(`${onde}.${chave} fora da lista`); continue; }
      const eixo = chave.replace('exceto_', '');
      if (EIXOS[eixo] && (!Array.isArray(valor) || !valor.length || valor.some(s => !EIXOS[eixo].includes(s)))) erros.push(`${onde}.${chave} ${JSON.stringify(valor)} (siglas do eixo ${eixo}: ${EIXOS[eixo].join(', ')})`);
      if (['dv_max', 'pv_max'].includes(chave) && !isInt(valor)) erros.push(`${onde}.${chave} deve ser inteiro`);
      if (chave === 'tamanho_max' && !TAMANHOS.includes(valor)) erros.push(`${onde}.tamanho_max "${valor}"`);
      if (['tipo', 'exceto_tipo', 'exceto_subtipo', 'exceto_raca', 'exceto_estado'].includes(chave) && (!Array.isArray(valor) || !valor.every(isStr))) erros.push(`${onde}.${chave} (array de nomes)`);
    }
  }

  function conferirCampo(m, k, onde, nomesAtaques, idsEspeciais = new Set()) {
    const v = m[k];
    switch (k) {
      case 'dano': case 'dano_por_rodada':
        if (!DADO.test(String(v))) erros.push(`${onde}: ${k} "${v}"`); break;
      case 'cd': case 'ca_interna': case 'pv_para_sair': case 'niveis': case 'chance_pct': case 'pv_por_dia': case 'bonus_ataque': case 'bonus_dano': case 'duracao_rodadas':
      case 'for': case 'con': case 'von': case 'ca':
        if (!isInt(v)) erros.push(`${onde}: ${k} deve ser inteiro`); break;
      case 'tamanho_m': case 'alcance_m':
        if (!isNum(v)) erros.push(`${onde}: ${k} deve ser número`); break;
      case 'raio_m':
        if (!(v === null || isNum(v))) erros.push(`${onde}: raio_m deve ser número ou null`); break;
      case 'resistencia':
        if (!RESISTENCIAS.includes(v)) erros.push(`${onde}: resistencia "${v}"`); break;
      case 'tipo_energia':
        energia(v, `${onde} tipo_energia`); break;
      case 'condicao':
        if (!CONDICOES.includes(v)) erros.push(`${onde}: condicao "${v}" fora da lista`); break;
      case 'tamanho_max':
        if (!TAMANHOS.includes(v)) erros.push(`${onde}: tamanho_max "${v}"`); break;
      case 'tipo_dano':
        if (!Array.isArray(v) || !v.length || v.some(t => !TIPOS_DANO.includes(t))) erros.push(`${onde}: tipo_dano ${JSON.stringify(v)}`); break;
      case 'gatilho': case 'requer':
        if (!Array.isArray(v) || !v.length) erros.push(`${onde}: ${k} deve ser um array com nomes de ataques`);
        else for (const n of v) if (!nomesAtaques.has(n)) erros.push(`${onde}: ${k} "${n}" não é um ataque do combatente`);
        break;
      case 'quando':
        if (!QUANDO.includes(v)) erros.push(`${onde}: quando "${v}"`); break;
      case 'recarga':
        if (!(isInt(v) || DADO.test(String(v)))) erros.push(`${onde}: recarga "${v}" (dado como "1d4" ou inteiro de rodadas)`); break;
      case 'area':
        if (m.efeito === 'sopro' && !AREAS_SOPRO.includes(v)) erros.push(`${onde}: area "${v}"`);
        else if (!isStr(v)) erros.push(`${onde}: area`);
        break;
      case 'usos':
        if (!isStr(v)) erros.push(`${onde}: usos (texto, ex.: "3/dia")`); break;
      case 'alvo':
        if (m.efeito === 'destruir' ? !ALVOS_DESTRUIR.includes(v) : !isStr(v)) erros.push(`${onde}: alvo "${v}"`); break;
      case 'afeta': case 'condicao_afeta':
        if (k === 'afeta' && m.efeito === 'refletir-magia') { if (!Array.isArray(v) || !v.length) erros.push(`${onde}: afeta (array)`); }
        else conferirAfeta(v, `${onde} ${k}`);
        if (k === 'condicao_afeta' && m.condicao === undefined) erros.push(`${onde}: condicao_afeta sem condicao`);
        break;
      case 'duracao':
        if (!isStr(v) || !DURACAO.test(v)) erros.push(`${onde}: duracao "${v}" (ex.: "1d4 rodadas", "10 minutos", "permanente")`); break;
      case 'cura':
        if (!DADO.test(String(v))) erros.push(`${onde}: cura "${v}"`); break;
      case 'nivel_conjurador':
        if (!isInt(v)) erros.push(`${onde}: nivel_conjurador deve ser inteiro`); break;
      case 'bonus':
        if (!isObj(v)) erros.push(`${onde}: bonus (objeto)`);
        else for (const chave of Object.keys(v)) if (!BONUS.includes(chave)) erros.push(`${onde}: bonus.${chave} fora da lista`);
        break;
      case 'efeitos_por_dv':
        if (!Array.isArray(v) || !v.length) { erros.push(`${onde}: efeitos_por_dv (array)`); break; }
        v.forEach((x, j) => {
          if (!isObj(x) || (x.condicao === undefined && x.dano_atributo === undefined)) return erros.push(`${onde}: efeitos_por_dv[${j}] precisa de condicao ou dano_atributo`);
          if (x.dv_max !== undefined && !isInt(x.dv_max)) erros.push(`${onde}: efeitos_por_dv[${j}].dv_max`);
          if (x.condicao !== undefined && !CONDICOES.includes(x.condicao)) erros.push(`${onde}: efeitos_por_dv[${j}].condicao "${x.condicao}" fora da lista`);
          if (x.dano_atributo !== undefined) conferirCampo(x, 'dano_atributo', `${onde} efeitos_por_dv[${j}]`, nomesAtaques);
          for (const chave of Object.keys(x)) if (!['dv_max', 'condicao', 'duracao', 'dano_atributo'].includes(chave)) erros.push(`${onde}: efeitos_por_dv[${j}].${chave} fora do formato`);
        });
        break;
      case 'dano_atributo':
        if (!isObj(v) || !ATRIB.includes(v.atributo) || !DADO.test(String(v.dano))) erros.push(`${onde}: dano_atributo ${JSON.stringify(v)}`); break;
      case 'paralisia':
        if (!isObj(v) || !RESISTENCIAS.includes(v.resistencia) || !isInt(v.cd) || !isStr(v.duracao)) erros.push(`${onde}: paralisia { resistencia, cd, duracao }`); break;
      case 'dano_extra':
        if (!Array.isArray(v) || v.some(d => !isObj(d) || !DADO.test(String(d.dano)))) erros.push(`${onde}: dano_extra ${JSON.stringify(v)}`);
        else for (const d of v) energia(d.tipo, `${onde} dano_extra`);
        break;
      case 'dano_por_tendencia': {
        const siglas = isObj(v) ? EIXOS[v.eixo] : null;
        if (!siglas) { erros.push(`${onde}: dano_por_tendencia precisa de "eixo" ("etico" ou "moral")`); break; }
        const resto = Object.entries(v).filter(([t]) => t !== 'eixo');
        if (!resto.length || resto.some(([t, x]) => !siglas.includes(t) || !['total', 'metade', 'nenhum'].includes(x))) erros.push(`${onde}: dano_por_tendencia ${JSON.stringify(v)} (siglas do eixo ${v.eixo}: ${siglas.join(', ')})`);
        if (m.afeta && ['etico', 'moral', 'exceto_etico', 'exceto_moral'].some(e => m.afeta[e])) erros.push(`${onde}: com dano_por_tendencia, a tendência não vai em afeta (use condicao_afeta para a condição)`);
        break;
      }
      case 'ataque':
        if (!TIPOS_ATAQUE.includes(v)) erros.push(`${onde}: ataque "${v}"`); break;
      case 'aplica_a':
        if (!Array.isArray(v) || v.some(id => !idsEspeciais.has(id))) erros.push(`${onde}: aplica_a deve listar ids de especiais do combatente`); break;
      case 'metade_se_passar': case 'acerto_automatico': case 'aprimorada': case 'maior': case 'permanente': case 'retorna_ao_dono':
        if (typeof v !== 'boolean') erros.push(`${onde}: ${k} (bool)`); break;
      case 'inicial': case 'secundario':
        if (!isObj(v)) { erros.push(`${onde}: ${k} (objeto)`); break; }
        if (v.condicao !== undefined) { if (!CONDICOES.includes(v.condicao)) erros.push(`${onde}: ${k}.condicao "${v.condicao}"`); }
        else if (!ATRIB.includes(v.atributo) || !DADO.test(String(v.dano))) erros.push(`${onde}: ${k} ${JSON.stringify(v)} ({ atributo, dano } ou { condicao })`);
        break;
      case 'veneno':
        if (!isObj(v)) erros.push(`${onde}: veneno (objeto)`);
        else for (const p of ['inicial', 'secundario']) conferirCampo(v, p, `${onde} veneno`, nomesAtaques);
        break;
      default:
        if (v === undefined) erros.push(`${onde}: falta ${k}`);
    }
  }

  function especial(e, onde, nomesAtaques, idsEspeciais) {
    if (!isObj(e)) return erros.push(`${onde}: especial inválido`);
    if (!isStr(e.id) || !/^[a-z0-9-]+$/.test(e.id)) erros.push(`${onde}: id "${e.id}"`);
    if (!isStr(e.nome)) erros.push(`${onde}: nome`);
    if (!NATUREZAS.includes(e.natureza)) erros.push(`${onde}: natureza "${e.natureza}"`);
    if (!isStr(e.descricao)) erros.push(`${onde}: descricao`);
    if (e.mecanica === null) return;
    mecanica(e.mecanica, onde, nomesAtaques, idsEspeciais, false);
  }

  function mecanica(m, onde, nomesAtaques, idsEspeciais, daLista) {
    if (!isObj(m) || !EFEITOS[m.efeito]) return erros.push(`${onde}: mecanica.efeito "${m?.efeito}"`);
    const regra = EFEITOS[m.efeito];
    const obrigatorios = daLista && m.efeito === 'magia' ? [] : regra.obrigatorios;
    for (const k of obrigatorios) if (m[k] === undefined) erros.push(`${onde}: ${m.efeito} sem "${k}"`);
    if (regra.algum && !regra.algum.some(grupo => grupo.every(k => m[k] !== undefined && m[k] !== null))) {
      erros.push(`${onde}: ${m.efeito} precisa de ${regra.algum.map(g => g.join(' + ')).join(' ou ')}`);
    }
    if (m.efeito === 'outro') return;
    const conhecidos = new Set(['efeito', 'nota', ...regra.obrigatorios, ...(regra.algum || []).flat(), ...regra.opcionais]);
    for (const k of Object.keys(m)) if (!conhecidos.has(k)) erros.push(`${onde}: ${m.efeito} com campo "${k}" fora do formato`);
    if (m.nota !== undefined && !isStr(m.nota)) erros.push(`${onde}: nota (texto)`);
    for (const k of Object.keys(m)) if (k !== 'efeito' && k !== 'nota' && m[k] !== null && m[k] !== undefined) conferirCampo(m, k, onde, nomesAtaques, idsEspeciais);
    if (m.compartilhada_com != null && !idsEspeciais.has(m.compartilhada_com)) erros.push(`${onde}: compartilhada_com "${m.compartilhada_com}" não existe`);
  }

  const ids = new Set();
  lista.forEach((c, i) => {
    if (!isObj(c)) return erros.push(`${secao}[${i}]: combatente inválido`);
    const onde = `${secao}[${i}] ${c.id || c.nome || '?'}`;
    for (const k of Object.keys(c)) if (!CAMPOS_COMBATENTE.includes(k)) erros.push(`${onde}: campo "${k}" fora do formato`);
    if (!isStr(c.id) || !/^[a-z0-9-]+$/.test(c.id)) erros.push(`${onde}: id`);
    if (ids.has(c.id)) erros.push(`${onde}: id repetido`);
    ids.add(c.id);
    for (const k of ['nome', 'tipo', 'tamanho', 'tendencia', 'resumo', 'dados_vida', 'tatica']) if (!isStr(c[k])) erros.push(`${onde}: ${k}`);
    const cat = secao === 'monstros' ? 'monstro' : 'holy_avenger';
    if (c.categoria !== cat) erros.push(`${onde}: categoria deve ser "${cat}"`);
    if (!isInt(c.nd) || c.nd < 1 || c.nd > 20) erros.push(`${onde}: nd 1–20`);
    if (!isInt(c.nivel) || c.nivel < 1 || c.nivel > 20) erros.push(`${onde}: nivel 1–20`);
    if (secao === 'monstros') {
      if (c.nivel !== c.nd) erros.push(`${onde}: nivel deve ser igual ao nd`);
      if (PRODUCT_IDENTITY.some(p => String(c.nome_original || '').toLowerCase().includes(p))) erros.push(`${onde}: "${c.nome_original}" é Product Identity, fora do SRD`);
    }
    if (!TAMANHOS.includes(c.tamanho)) erros.push(`${onde}: tamanho "${c.tamanho}"`);
    if (!TENDENCIAS.includes(c.tendencia)) erros.push(`${onde}: tendencia "${c.tendencia}"`);
    if (!TIPOS.includes(c.tipo)) erros.push(`${onde}: tipo "${c.tipo}"`);
    if (!Array.isArray(c.subtipos)) erros.push(`${onde}: subtipos`);
    if (!Array.isArray(c.classes)) erros.push(`${onde}: classes`);
    else {
      for (const k of c.classes) if (!isObj(k) || !isStr(k.classe) || !isInt(k.nivel)) erros.push(`${onde}: classes ${JSON.stringify(k)}`);
      if (secao === 'holy_avenger') {
        if (!c.classes.length) avisos.push(`${onde}: personagem sem classes`);
        else if (c.classes.reduce((s, k) => s + (k?.nivel || 0), 0) > 20) erros.push(`${onde}: soma dos níveis de classe > 20`);
      }
    }
    if (typeof c.resumo === 'string' && c.resumo.length > 300) erros.push(`${onde}: resumo com ${c.resumo.length} caracteres (máx. 300)`);
    if (!DADOS_VIDA.test(String(c.dados_vida).replace(/\s/g, ''))) erros.push(`${onde}: dados_vida "${c.dados_vida}"`);
    if (!isInt(c.pv) || c.pv < 1) erros.push(`${onde}: pv`);
    else if (secao === 'monstros') {
      const m = media(c.dados_vida);
      if (m != null && m !== c.pv) avisos.push(`${onde}: pv ${c.pv} ≠ média de ${c.dados_vida} (${m})`);
    }
    if (!isInt(c.iniciativa)) erros.push(`${onde}: iniciativa`);
    const d = c.deslocamento;
    if (!isObj(d) || !['terrestre', 'voo', 'natacao', 'escalada', 'escavacao'].every(k => d[k] === null || isNum(d[k]))) erros.push(`${onde}: deslocamento`);
    if (!isNum(c.espaco) || !isNum(c.alcance)) erros.push(`${onde}: espaco/alcance em metros`);
    if (!isObj(c.ca) || !isInt(c.ca.total) || !isInt(c.ca.toque) || !isInt(c.ca.surpresa) || !isStr(c.ca.composicao)) erros.push(`${onde}: ca`);
    else {
      if (c.ca.toque > c.ca.total) avisos.push(`${onde}: CA de toque maior que a total`);
      if (/esquiva/i.test(c.ca.composicao)) erros.push(`${onde}: a CA não deve incluir Esquiva (o motor a soma contra o alvo escolhido)`);
    }
    if (!isInt(c.bba)) erros.push(`${onde}: bba`);
    if (!isInt(c.agarrar)) erros.push(`${onde}: agarrar`);
    else if (isInt(c.bba) && c.atributos && AGARRAR_TAMANHO[c.tamanho] !== undefined) {
      const esperado = c.bba + AGARRAR_TAMANHO[c.tamanho] + mod(c.atributos.for);
      if (esperado !== c.agarrar) erros.push(`${onde}: agarrar ${c.agarrar} ≠ BBA + tamanho + For (${esperado})`);
    }

    const golpes = [];
    for (const campo of ['ataques', 'ataque_total']) {
      if (!Array.isArray(c[campo]) || !c[campo].length) erros.push(`${onde}: ${campo} vazio`);
      else c[campo].forEach((a, j) => { ataque(a, `${onde} ${campo}[${j}]`); golpes.push(a); });
    }
    if (c.ataque_total_distancia !== undefined && c.ataque_total_distancia !== null) {
      if (!Array.isArray(c.ataque_total_distancia) || !c.ataque_total_distancia.length) erros.push(`${onde}: ataque_total_distancia deve ser null ou um array com golpes`);
      else c.ataque_total_distancia.forEach((a, j) => {
        ataque(a, `${onde} ataque_total_distancia[${j}]`);
        golpes.push(a);
        if (isObj(a) && !['distancia', 'toque a distancia'].includes(a.tipo)) erros.push(`${onde} ataque_total_distancia[${j}]: golpe que não é à distância`);
      });
    }
    const nomesAtaques = new Set(golpes.filter(isObj).map(a => a.nome));

    if (!Array.isArray(c.ataques_especiais) || !Array.isArray(c.qualidades_especiais)) erros.push(`${onde}: ataques_especiais/qualidades_especiais`);
    const especiais = [...(Array.isArray(c.ataques_especiais) ? c.ataques_especiais : []), ...(Array.isArray(c.qualidades_especiais) ? c.qualidades_especiais : [])];
    const idsEsp = especiais.filter(isObj).map(e => e.id);
    const repetidos = idsEsp.filter((x, k) => idsEsp.indexOf(x) !== k);
    if (repetidos.length) erros.push(`${onde}: ids de especial repetidos: ${[...new Set(repetidos)].join(', ')}`);
    const setEsp = new Set(idsEsp);
    especiais.forEach((e, j) => especial(e, `${onde} especial[${j}] ${e?.id}`, nomesAtaques, setEsp));
    for (const a of golpes) for (const ef of (isObj(a) && Array.isArray(a.efeitos) ? a.efeitos : [])) if (!setEsp.has(ef)) erros.push(`${onde}: ataque "${a.nome}" dispara "${ef}", que não está nos especiais`);

    if (c.reducao_dano !== null && !(isObj(c.reducao_dano) && isInt(c.reducao_dano.valor) && isStr(c.reducao_dano.exceto))) erros.push(`${onde}: reducao_dano`);
    if (isObj(c.reducao_dano) && /epic|épic|magic$|mágic[ao]$|ferro frio/i.test(c.reducao_dano.exceto)) avisos.push(`${onde}: RD "${c.reducao_dano.exceto}" parece da 3.5 (na 3.0 é "+N")`);
    if (c.resistencia_magia !== null && !isInt(c.resistencia_magia)) erros.push(`${onde}: resistencia_magia`);
    if (!isObj(c.resistencias_energia) || Object.values(c.resistencias_energia).some(v => !isInt(v))) erros.push(`${onde}: resistencias_energia`);
    else for (const k of Object.keys(c.resistencias_energia)) energia(k, `${onde} resistencias_energia`);
    if (!Array.isArray(c.imunidades) || !Array.isArray(c.vulnerabilidades)) erros.push(`${onde}: imunidades/vulnerabilidades`);
    else {
      for (const im of c.imunidades) if (!IMUNIDADES.includes(im)) erros.push(`${onde}: imunidade "${im}" fora da lista`);
      for (const v of c.vulnerabilidades) energia(v, `${onde} vulnerabilidades`);
    }
    if (c.regeneracao !== null && !(isObj(c.regeneracao) && isInt(c.regeneracao.valor) && Array.isArray(c.regeneracao.exceto) && [undefined, true].includes(c.regeneracao.resiste_morte))) erros.push(`${onde}: regeneracao`);
    else if (c.regeneracao) for (const x of c.regeneracao.exceto) {
      // energia, ou arma com qualidade: { "arma": { "qualidade": ["sagrada", "abençoada"], "bonus_minimo": 3 } }
      if (isObj(x)) {
        const a = x.arma;
        if (!isObj(a) || !Array.isArray(a.qualidade) || !a.qualidade.length || !(a.bonus_minimo === undefined || isInt(a.bonus_minimo))) erros.push(`${onde}: regeneracao.exceto ${JSON.stringify(x)}`);
      } else energia(x, `${onde} regeneracao.exceto`);
    }
    if (c.cura_acelerada !== null && !isInt(c.cura_acelerada)) erros.push(`${onde}: cura_acelerada`);
    if (!isObj(c.resistencias) || !RESISTENCIAS.every(k => isInt(c.resistencias[k]))) erros.push(`${onde}: resistencias`);
    if (!isObj(c.atributos) || !ATRIB.every(k => c.atributos[k] === null || isInt(c.atributos[k]))) erros.push(`${onde}: atributos`);
    if (!Array.isArray(c.pericias) || c.pericias.some(p => !isObj(p) || !isStr(p.nome) || !isInt(p.total))) erros.push(`${onde}: pericias`);
    if (!Array.isArray(c.talentos)) erros.push(`${onde}: talentos`);
    else for (const t of c.talentos) {
      const base = semParametro(t);
      if (!compendio().has(base) && !TALENTOS_EXTRAS.includes(base)) erros.push(`${onde}: talento "${t}" não existe no compêndio`);
    }
    if (!Array.isArray(c.equipamento)) erros.push(`${onde}: equipamento`);
    if (c.magias !== null) {
      const m = c.magias;
      if (!isObj(m) || !isStr(m.classe) || !isInt(m.nivel_conjurador) || !isInt(m.cd_base) || !Array.isArray(m.lista)) erros.push(`${onde}: magias`);
      else {
        if (m.atributo !== undefined) {
          if (!ATRIB.includes(m.atributo)) erros.push(`${onde}: magias.atributo "${m.atributo}"`);
          else if (c.atributos && 10 + mod(c.atributos[m.atributo]) !== m.cd_base) erros.push(`${onde}: magias.cd_base ${m.cd_base} ≠ 10 + mod. de ${m.atributo} (${10 + mod(c.atributos[m.atributo])})`);
        }
        m.lista.forEach((s, j) => {
          if (!isObj(s) || !isInt(s.nivel) || !isStr(s.nome) || !isInt(s.quantidade)) return erros.push(`${onde}: magias.lista[${j}]`);
          if (s.mecanica === null) return;
          if (!isObj(s.mecanica) || s.mecanica.efeito !== 'magia') return erros.push(`${onde}: magias.lista[${j}].mecanica.efeito deve ser "magia"`);
          mecanica(s.mecanica, `${onde} magias.lista[${j}] ${s.nome}`, nomesAtaques, setEsp, true);
        });
      }
    }
    if (!isObj(c.fonte) || !isStr(c.fonte.referencia) || !/^https?:\/\//.test(c.fonte.url || '')) erros.push(`${onde}: fonte { referencia, url }`);
    if (c.adaptacao !== null && !isStr(c.adaptacao)) erros.push(`${onde}: adaptacao (string ou null)`);
  });

  if (secao === 'monstros') {
    const nds = lista.filter(isObj).map(c => c.nd).sort((a, b) => a - b);
    const faltam = Array.from({ length: 20 }, (_, i) => i + 1).filter(n => !nds.includes(n));
    if (faltam.length) erros.push(`faltam monstros de ND ${faltam.join(', ')}`);
    const repetidos = nds.filter((n, i) => nds.indexOf(n) !== i);
    if (repetidos.length) erros.push(`ND repetido: ${[...new Set(repetidos)].join(', ')}`);
    const t = lista.find(c => isObj(c) && c.nd === 20);
    if (t && t.id !== 'tarrasque') erros.push('o monstro de ND 20 deve ser o Tarrasque (id "tarrasque")');
  }
  return { erros, avisos };
}

/** Valida o catálogo inteiro: as duas seções e os ids únicos entre elas. */
function validarCatalogo(catalogo) {
  if (!isObj(catalogo)) return { erros: ['o catálogo deve ser um objeto'], avisos: [] };
  const erros = [];
  const avisos = [];
  if (!Number.isInteger(catalogo.versao) || catalogo.versao < 1) erros.push('versao deve ser um inteiro ≥ 1');
  if (!isStr(catalogo.descricao)) erros.push('descricao');
  for (const secao of ['monstros', 'holy_avenger']) {
    if (!Array.isArray(catalogo[secao])) { erros.push(`seção "${secao}" ausente`); continue; }
    const r = validarSecao(catalogo[secao], secao);
    erros.push(...r.erros);
    avisos.push(...r.avisos);
  }
  const todos = [...(catalogo.monstros || []), ...(catalogo.holy_avenger || [])].filter(isObj).map(c => c.id);
  const repetidos = todos.filter((id, i) => todos.indexOf(id) !== i);
  if (repetidos.length) erros.push(`ids repetidos entre as seções: ${[...new Set(repetidos)].join(', ')}`);
  return { erros, avisos };
}

module.exports = { validarSecao, validarCatalogo, EFEITOS, ENERGIAS, CONDICOES, IMUNIDADES };

if (require.main === module) {
  const [arquivo = path.join(__dirname, '..', 'data', 'catalogo-combate.json'), secaoArg] = process.argv.slice(2);
  const raw = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  const { erros, avisos } = Array.isArray(raw) ? validarSecao(raw, secaoArg) : validarCatalogo(raw);
  for (const a of avisos) console.log('AVISO ', a);
  for (const e of erros) console.log('ERRO  ', e);
  console.log(`${erros.length} erro(s), ${avisos.length} aviso(s).`);
  process.exit(erros.length ? 1 : 0);
}
