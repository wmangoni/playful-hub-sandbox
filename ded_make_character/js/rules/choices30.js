/**
 * Escolhas de perícias e talentos pelas regras da 3ª edição (3.0).
 *
 * Funções puras (sem DOM), usadas pelo popup de escolhas e pela ficha:
 * - perícias: pontos, custo (1 por graduação de classe, 2 de outra classe),
 *   graduação máxima e perícias exclusivas;
 * - talentos: vagas por nível (gerais, adicionais de guerreiro e de mago),
 *   talentos concedidos pela classe e pela raça, e a verificação dos
 *   pré-requisitos lidos do texto `requisitos` de cada talento do compêndio;
 * - progressão: cada talento escolhido ocupa uma vaga de um nível em que os
 *   pré-requisitos já eram atendidos (BBA, nível de classe, graduações…), e um
 *   talento nunca vem antes do talento que ele exige.
 *
 * Premissas (TASK_004): os atributos atuais valem para todos os níveis; os pontos
 * de perícia são somados e distribuídos respeitando a graduação máxima do nível
 * atual; o que o sistema não consegue verificar (talento fora do compêndio,
 * domínio, subraça, aval do Mestre…) fica "a confirmar", sem bloquear.
 */
import { normalize as loose } from '../core/format.js';
import { T30 } from './tables30.js';
import { baseAttackBonus, baseSave, maxRanks, skillKey, spellcasting } from './dnd30.js';

const CLASS_BY_NAME = {
  barbaro: 'bar', bardo: 'bad', clerigo: 'cle', druida: 'dru', guerreiro: 'gue', monge: 'mon',
  paladino: 'pal', ranger: 'ran', ladino: 'lad', feiticeiro: 'fei', mago: 'mag',
};
const ARCANE = new Set(['bad', 'fei', 'mag']);
const DIVINE = new Set(['cle', 'dru', 'pal', 'ran']);
const RACES = ['humano', 'anao', 'elfo', 'gnomo', 'meio-elfo', 'meio-orc', 'halfling'];
const ABILITY_BY_WORD = { for: 'for', forca: 'for', des: 'des', destreza: 'des', con: 'con', constituicao: 'con', int: 'int', inteligencia: 'int', sab: 'sab', sabedoria: 'sab', car: 'car', carisma: 'car' };
const GENERIC_PARAM = /\s*\((?:arma escolhida|qualquer[^)]*|tipo de [^)]*|escola escolhida|perícia escolhida)\)$/i;
const MAX_LEVEL = 20;

/* ------------------------------------------------------------------ talentos */

/** Chave de comparação de um talento: sem acento, minúsculo, com os apelidos 3.5 → 3.0. */
export function featKey(nome) {
  const key = loose(nome).replace(/\s+/g, ' ');
  return T30.talentosApelidos[key] || key;
}

const tipoOf = feat => loose(feat.tipo);
const isEpic = feat => /epico/.test(tipoOf(feat));
export const fitsFighter = feat => /\bgue\b/.test(tipoOf(feat));
export const fitsWizard = feat => /metamagico|criacao de item/.test(tipoOf(feat)) || featKey(feat.nome) === 'dominar magia';
export const isMultiple = feat => /varias vezes/.test(loose(feat.beneficio));
export const featParameter = feat => T30.talentosParametro[featKey(feat.nome)] || null;
const needsDmApproval = feat => /exaltado|anarquico/.test(tipoOf(feat));

/** Vagas de talento do 1º nível até o nível atual, cada uma com o nível em que é ganha. */
export function featSlots(level, classKey, isHuman) {
  const slots = [];
  for (let L = 1; L <= level; L++) {
    if (L === 1 || L % 3 === 0) slots.push({ nivel: L, tipo: 'geral' });
    if (L === 1 && isHuman) slots.push({ nivel: 1, tipo: 'geral', humano: true });
    if (classKey === 'gue' && (L === 1 || L % 2 === 0)) slots.push({ nivel: L, tipo: 'guerreiro' });
    if (classKey === 'mag' && L % 5 === 0) slots.push({ nivel: L, tipo: 'mago' });
  }
  return slots;
}

const slotAccepts = (slot, feat) => slot.tipo === 'geral' || (slot.tipo === 'guerreiro' && fitsFighter(feat)) || (slot.tipo === 'mago' && fitsWizard(feat));

/** Talentos que a classe e a raça concedem (não ocupam vaga), com o nível em que são ganhos. */
export function grantedFeats(level, classKey, raceKey) {
  const out = [];
  for (const nome of T30.proficienciasClasse[classKey] || []) out.push({ key: featKey(nome), nome, nivel: 1, origem: 'classe', proficiencia: true });
  for (const [nivel, nome, nota] of T30.talentosClasse[classKey] || []) {
    if (nivel <= level) out.push({ key: featKey(nome), nome, nivel, origem: 'classe', nota: nota || null });
  }
  for (const [nome, parametro] of T30.talentosRaca[raceKey] || []) out.push({ key: featKey(nome), nome, nivel: 1, origem: 'raça', parametro, proficiencia: true });
  return out;
}

/* ------------------------------------------------------------ pré-requisitos */

/** Separa o texto em átomos por vírgula/ponto e vírgula fora de parênteses. */
export function splitAtoms(text) {
  const atoms = [];
  let depth = 0;
  let buf = '';
  for (const ch of String(text || '')) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if ((ch === ',' || ch === ';') && depth === 0) {
      atoms.push(buf);
      buf = '';
    } else buf += ch;
  }
  atoms.push(buf);
  return atoms.map(a => a.trim().replace(/\.$/, '')).filter(Boolean);
}

/** Primeiro nível (1–20) em que `test(L)` é verdadeiro, ou null. */
function firstLevel(test) {
  for (let L = 1; L <= MAX_LEVEL; L++) if (test(L)) return L;
  return null;
}

/**
 * Contexto de avaliação montado a partir da ficha calculada e das escolhas atuais.
 * `chosen` = [{ talento_id, parametro }]; `ranks` = { chave da perícia: graduações }.
 */
export function buildContext({ sheet, personagem, classe, bbaRows, catalog, chosen = [], ranks = {} }) {
  const level = sheet.nivel;
  const classKey = sheet.classKey;
  const scores = Object.fromEntries(sheet.atributos.map(a => [a.key, a.total]));
  const bbaTipo = classKey ? T30.bbaPorClasse[classKey] : classe?.bba_tipo;
  const babAt = L => (classe && bbaTipo ? baseAttackBonus(L, { classKey, bbaTipo, bbaRows }) : null);
  const goodSaves = new Set(classKey ? T30.salvamentosBons[classKey] : String(classe?.resistencia || '').split('/').map(loose));
  const castingScore = classKey && T30.atributoConjuracao[classKey] ? scores[loose(T30.atributoConjuracao[classKey])] : null;
  const castable = L => (spellcasting(classKey, L, castingScore)?.niveis || []).filter(n => n.base != null && !n.bloqueado);
  const kindOk = kind => !kind || (kind === 'arcano' ? ARCANE.has(classKey) : DIVINE.has(classKey));
  const byId = new Map(catalog.map(f => [String(f.id), f]));
  const catalogByKey = new Map();
  for (const f of catalog) if (!catalogByKey.has(featKey(f.nome))) catalogByKey.set(featKey(f.nome), f);
  const chosenFeats = chosen.map(c => ({ ...c, feat: byId.get(String(c.talento_id)) })).filter(c => c.feat);
  const chosenParams = new Map();
  for (const c of chosenFeats) {
    const k = featKey(c.feat.nome);
    chosenParams.set(k, [...(chosenParams.get(k) || []), loose(c.parametro || '')]);
  }
  return {
    level,
    classKey,
    raceKey: sheet.raceKey,
    sizeName: sheet.identidade.tamanho,
    tendencia: String(personagem.tendencia || ''),
    scores,
    babAt,
    goodSaves,
    casterLevelAt: (L, kind) => (classKey && kindOk(kind) && castable(L).length ? (classKey === 'pal' || classKey === 'ran' ? Math.floor(L / 2) : L) : 0),
    spellLevelAt: (L, kind, only) => (classKey && kindOk(kind) && (!only || only === classKey) ? Math.max(-1, ...castable(L).map(n => n.nivel)) : -1),
    skills: sheet.pericias.map(p => ({ key: skillKey(p.nome), nome: p.nome, classe: p.classe })),
    ranks,
    catalog,
    catalogByKey,
    granted: grantedFeats(level, classKey, sheet.raceKey),
    chosenFeats,
    chosenParams,
    traits: sheet.tracosRaciais.map(loose),
    cache: new Map(), // evaluateFeat por talento/parâmetro: a lista do popup avalia cada talento uma vez
  };
}

const CLASS_FEATURES = [
  // [texto (sem acento), classes que têm a habilidade, nível mínimo]
  [/musica de bardo/, ['bad'], 1],
  [/forma selvagem.*grande/, ['dru'], 8],
  [/forma selvagem/, ['dru'], 5],
  [/cinco ou mais inimigos prediletos/, ['ran'], 20],
  [/inimigo predileto/, ['ran'], 1],
  [/destruir o mal/, ['pal'], 2],
  [/ataque furtivo|encontrar armadilhas/, ['lad'], 1],
  [/\bfuria\b|frenesi/, ['bar'], 1],
  [/obter um familiar|capacidade de .*familiar/, ['fei', 'mag'], 1],
  [/companheiro animal/, ['dru'], 1],
  [/remover doen/, ['pal'], 3],
  [/conjurar magias arcanas sem preparacao/, ['fei', 'bad'], 1],
  [/(?:acesso a|pelo menos) (?:pelo menos )?um dominio$/, ['cle'], 1],
];
/** Raças que não existem no Livro do Jogador: um personagem de raça do LdJ nunca as tem. */
const OTHER_RACES = ['forjado belico', 'warforged', 'golias', 'goliath', 'aasimar', 'tiefling', 'genasi', 'kobold', 'hobgoblin', 'drow'];

/**
 * Expulsar × fascinar mortos-vivos (SRD 3.0): o clérigo bom expulsa, o mau fascina e
 * o neutro escolhe (fica "a confirmar"); o paladino só expulsa, a partir do 3º nível.
 */
function undeadAbility(kind, ctx, res) {
  if (!ctx.classKey) return res(null);
  if (ctx.classKey === 'pal') return kind === 'fascinar' ? res(false) : res(ctx.level >= 3, 3);
  if (ctx.classKey !== 'cle') return res(false);
  if (kind === 'qualquer') return res(true);
  const code = ctx.tendencia === 'N' ? 'NN' : ctx.tendencia;
  const moral = code.length === 2 ? code[1] : '';
  if (moral === 'N' || !moral) return res(null);
  return res(kind === 'expulsar' ? moral === 'B' : moral === 'M');
}

/**
 * Avalia um átomo de requisito. Devolve { ok: true|false|null, nivel, rotulo, … }.
 * ok = null quando o sistema não consegue verificar (fica "a confirmar").
 * `selfParam` é o parâmetro da escolha avaliada (ex.: a arma de Especialização em Arma).
 */
function evalAtom(raw, ctx, self, selfParam) {
  const text = raw.trim();
  const full = loose(text);
  const t = full.replace(/\s*\((?:como|exige)[^)]*\)\s*$/, '');
  const res = (ok, nivel = 1, extra = {}) => ({ ok, nivel: ok === false ? null : nivel, rotulo: text, ...extra });

  if (/^nenhum/.test(t)) return res(true);
  if (/mortos-vivos/.test(t) && /expulsar|fascinar|comandar/.test(t)) {
    const kind = /expulsar/.test(t) && /fascinar|comandar/.test(t) ? 'qualquer' : /expulsar/.test(t) ? 'expulsar' : 'fascinar';
    return undeadAbility(kind, ctx, res);
  }
  // alternativas "A ou B" fora de parênteses (ex.: "Anão ou forjado bélico")
  const outside = t.replace(/\([^)]*\)/g, '');
  if (/ ou /.test(outside) && !/^\d|tendencia|tamanho|ascendencia/.test(t)) {
    const parts = text.replace(/\(([^)]*)\)/g, (_, inner) => `(${inner.replace(/ ou /g, '\u0001')})`).split(/ ou /).map(p => p.replace(/\u0001/g, ' ou '));
    if (parts.length > 1) {
      const results = parts.map(p => evalAtom(p, ctx, self, selfParam));
      const hit = results.find(r => r.ok === true);
      if (hit) return { ...hit, rotulo: text };
      return res(results.some(r => r.ok === null) ? null : false);
    }
  }

  let m;
  if ((m = t.match(/^(for|forca|des|destreza|con|constituicao|int|inteligencia|sab|sabedoria|car|carisma) (\d+)(?: ou mais)?$/))) {
    const score = ctx.scores[ABILITY_BY_WORD[m[1]]];
    return res(score == null ? null : score >= Number(m[2]));
  }
  if ((m = t.match(/bonus base de ataque \+?(\d+)/))) {
    if (ctx.babAt(1) == null) return res(null);
    const nivel = firstLevel(L => ctx.babAt(L) >= Number(m[1]));
    return res(nivel != null && nivel <= ctx.level, nivel);
  }
  if ((m = t.match(/bonus base (?:de resistencia )?(?:de )?(fortitude|reflexos|vontade) \+?(\d+)/))) {
    const key = { fortitude: 'fort', reflexos: 'ref', vontade: 'von' }[m[1]];
    const nivel = firstLevel(L => baseSave(L, ctx.goodSaves.has(key)) >= Number(m[2]));
    return res(nivel != null && nivel <= ctx.level, nivel);
  }
  if (/(?:deve ser escolhido|somente|so pode ser escolhido) no 1º nivel/.test(t)) return res(true, 1, { soNoNivel: 1 });
  if ((m = t.match(/(\d+)º nivel de personagem|nivel de personagem (\d+)/))) {
    const N = Number(m[1] || m[2]);
    return res(N <= ctx.level, N);
  }
  if ((m = t.match(/(\d+)º nivel de (\w+)|nivel (\d+) de (\w+)|^(\w+) de (\d+)º nivel$/))) {
    const N = Number(m[1] || m[3] || m[6]);
    const cls = CLASS_BY_NAME[m[2] || m[4] || m[5]];
    if (!cls) return res(null); // especialistas (ilusionista, evocador…) não são distinguidos
    return res(ctx.classKey === cls && ctx.level >= N, N);
  }
  if ((m = t.match(/nivel de conjurador (arcano |divino )?(\d+)º?/))) {
    const kind = m[1]?.trim() || null;
    const nivel = firstLevel(L => ctx.casterLevelAt(L, kind) >= Number(m[2]));
    return res(nivel != null && nivel <= ctx.level, nivel);
  }
  if ((m = t.match(/(?:capaz de|capacidade de) (?:lancar|conjurar) magias (?:(arcanas|divinas) |de (\w+) )?de (\d+)º nivel/))) {
    const kind = m[1] === 'arcanas' ? 'arcano' : m[1] === 'divinas' ? 'divino' : null;
    const only = m[2] ? CLASS_BY_NAME[m[2]] : null;
    const nivel = firstLevel(L => ctx.spellLevelAt(L, kind, only) >= Number(m[3]));
    return res(nivel != null && nivel <= ctx.level, nivel);
  }
  if ((m = t.match(/^(\d+) graduac(?:oes|ao) em (.+)$|^(.+?) (\d+) graduac(?:oes|ao)$|^graduacoes em (.+?) (\d+)$/))) {
    const N = Number(m[1] || m[4] || m[6]);
    const name = (m[2] || m[3] || m[5]).replace(/\s*\(qualquer[^)]*\)/, '').trim();
    const k = skillKey(name);
    const base = skillKey(name.replace(/\s*\(.*\)$/, ''));
    // exato; sem a especialidade; ou singular/plural ("Acrobacia" → "Acrobacias")
    const skill = ctx.skills.find(s => s.key === k) || ctx.skills.find(s => s.key === base)
      || ctx.skills.find(s => base.length >= 5 && (s.key.startsWith(base) || base.startsWith(s.key)));
    if (!skill) return res(null);
    const have = Number(ctx.ranks[skill.key]) || 0;
    const nivel = firstLevel(L => (skill.classe === false ? maxRanks(L).cruzada : maxRanks(L).classe) >= N);
    return res(have >= N && nivel != null, nivel, { pericia: skill.nome });
  }

  // talento do compêndio (com parâmetro opcional entre parênteses)
  const generic = GENERIC_PARAM.test(text);
  const featName = text.replace(GENERIC_PARAM, '');
  const specific = !generic && /\([^)]*\)$/.test(featName) ? loose(featName.match(/\(([^)]*)\)$/)[1]) : '';
  const known = ctx.catalogByKey.get(featKey(featName)) || ctx.catalogByKey.get(featKey(featName.replace(/\s*\([^)]*\)$/, '')));
  if (known && known !== self) {
    const k = featKey(known.nome);
    const grant = ctx.granted.find(g => g.key === k);
    if (grant) return res(true, grant.nivel, { concedido: true });
    const params = ctx.chosenParams.get(k);
    if (!params) return res(false);
    // "(arma escolhida)": o pré-requisito precisa ser da mesma arma da escolha avaliada
    if (generic && selfParam) {
      const want = loose(selfParam);
      return params.includes(want) ? res(true, 1, { depende: k, parametro: want }) : { ...res(false), rotulo: `${titleCase(known.nome)} (${selfParam})` };
    }
    if (specific && featKey(known.nome) !== featKey(featName)) {
      if (params.some(p => p && (p.includes(specific) || specific.includes(p)))) return res(true, 1, { depende: k });
      return res(null, 1, { depende: k }); // escolheu o talento para outra arma: confira
    }
    return res(true, 1, { depende: k });
  }

  for (const [re, classes, min] of CLASS_FEATURES) {
    if (re.test(t)) {
      if (!ctx.classKey) return res(null);
      if (!classes.includes(ctx.classKey)) return res(false);
      return res(ctx.level >= min, min);
    }
  }
  if (/tendencia/.test(t)) {
    const code = ctx.tendencia === 'N' ? 'NN' : ctx.tendencia;
    if (code.length !== 2) return res(null);
    const [ordem, moral] = code;
    if (/nao boa/.test(t)) return res(moral !== 'B');
    if (/\bboa\b/.test(t)) return res(moral === 'B');
    if (/\bma\b|maligna/.test(t)) return res(moral === 'M');
    if (/caotica/.test(t)) return res(ordem === 'C');
    if (/leal/.test(t)) return res(ordem === 'L');
    return res(null);
  }
  if (/tamanho medio ou menor/.test(t)) return res(ctx.sizeName ? ['Pequeno', 'Médio', 'Miúdo', 'Minúsculo', 'Mínimo'].includes(ctx.sizeName) : null);
  if (/^visao no escuro$/.test(t)) return res(ctx.traits.some(x => x.startsWith('visao no escuro')));
  if (/^visao na penumbra$/.test(t)) return res(ctx.traits.some(x => x.startsWith('visao na penumbra')));
  // voo e natação naturais: nenhuma raça do Livro do Jogador tem
  if (/deslocamento de (?:voo|natacao)/.test(t)) return res(ctx.raceKey ? false : null);
  // raças (o texto completo, com "(como meio-elfo ou meio-orc)")
  const races = RACES.filter(r => new RegExp(`(^|[^a-z-])${r}($|[^a-z-])`).test(full));
  if (races.length) {
    if (!ctx.raceKey) return res(null);
    if (races.includes(t)) return res(ctx.raceKey === t);
    if (/ascendencia|como /.test(full)) return res(races.includes(ctx.raceKey));
    return res(races.includes(ctx.raceKey) ? null : false); // subraça ou variante: confira
  }
  if (OTHER_RACES.some(r => t.startsWith(r))) return res(ctx.raceKey ? false : null);
  if (/proficiencia com a arma escolhida/.test(t)) {
    const martial = (T30.proficienciasClasse[ctx.classKey] || []).some(n => featKey(n) === featKey('Usar Arma Comum'));
    return res(martial ? true : null);
  }
  if ((m = t.match(/(qualquer|dois|duas|tres)(?: outro)? talentos? (metamagicos?|de criacao de item)/))) {
    const count = { dois: 2, duas: 2, tres: 3 }[m[1]] || 1;
    const tipo = m[2].startsWith('metamag') ? 'metamagico' : 'criacao de item';
    const have = ctx.chosenFeats.filter(c => c.feat !== self && tipoOf(c.feat).includes(tipo)).length;
    return res(have >= count);
  }
  return res(null); // não verificável pelo sistema (talento fora do compêndio, patrono, domínio…)
}

/**
 * Avalia os requisitos de um talento: { status, falta, confirmar, nivel, depende, soNoNivel }.
 * `parametro` = a arma/perícia da escolha (para requisitos "(arma escolhida)"). Resultado em cache por contexto.
 */
export function evaluateFeat(feat, ctx, { parametro = null } = {}) {
  const cacheKey = `${feat.id}|${loose(parametro || '')}`;
  if (ctx.cache?.has(cacheKey)) return ctx.cache.get(cacheKey);
  let result;
  if (isEpic(feat)) result = { status: 'bloqueado', falta: ['talento épico (só depois do 20º nível)'], confirmar: [], nivel: null, depende: [], soNoNivel: null };
  else {
    const atoms = splitAtoms(feat.requisitos).map(a => evalAtom(a, ctx, feat, parametro));
    const falta = atoms.filter(a => a.ok === false).map(a => a.rotulo);
    const confirmar = atoms.filter(a => a.ok === null).map(a => a.rotulo);
    if (needsDmApproval(feat)) confirmar.push(`aval do Mestre (talento ${loose(feat.tipo).includes('exaltado') ? 'exaltado' : 'anárquico'})`);
    const nivel = Math.max(1, ...atoms.filter(a => a.ok !== false && a.nivel != null).map(a => a.nivel));
    const depende = atoms.filter(a => a.depende).map(a => ({ key: a.depende, parametro: a.parametro || null }));
    const soNoNivel = atoms.find(a => a.soNoNivel)?.soNoNivel ?? null;
    const status = falta.length ? 'bloqueado' : confirmar.length ? 'confirmar' : 'disponivel';
    result = { status, falta, confirmar, nivel, depende, soNoNivel };
  }
  ctx.cache?.set(cacheKey, result);
  return result;
}

/* -------------------------------------------------------- distribuição */

/** A escolha `o` é o pré-requisito `dep` ({ key, parametro })? */
const dependsMatch = (o, dep) => featKey(o.feat.nome) === dep.key && (!dep.parametro || loose(o.parametro || '') === dep.parametro);

/** Emparelhamento talento → vaga (Kuhn): tipo da vaga, nível mínimo e "só no 1º nível". */
function matchSlots(items, slots) {
  const owner = new Array(slots.length).fill(-1);
  const fits = (i, s) => slotAccepts(slots[s], items[i].feat)
    && slots[s].nivel >= items[i].nivel
    && (items[i].soNoNivel == null || slots[s].nivel === items[i].soNoNivel);
  // vagas restritas (guerreiro/mago) e mais cedo primeiro: as gerais ficam para quem só cabe nelas
  const order = slots.map((_, s) => s).sort((a, b) => (slots[a].tipo === 'geral') - (slots[b].tipo === 'geral') || slots[a].nivel - slots[b].nivel);
  const tryAssign = (i, seen) => {
    for (const s of order) {
      if (!fits(i, s) || seen.has(s)) continue;
      seen.add(s);
      if (owner[s] === -1 || tryAssign(owner[s], seen)) {
        owner[s] = i;
        return true;
      }
    }
    return false;
  };
  items.forEach((_, i) => tryAssign(i, new Set()));
  const assigned = new Array(items.length).fill(null);
  owner.forEach((i, s) => { if (i !== -1) assigned[i] = s; });
  // estabilidade: quem foi escolhido antes fica na vaga mais cedo, quando a troca é possível
  for (let changed = true, guard = 0; changed && guard < items.length * items.length; guard++) {
    changed = false;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const [si, sj] = [assigned[i], assigned[j]];
        if (si == null || sj == null || slots[si].nivel <= slots[sj].nivel || !fits(i, sj) || !fits(j, si)) continue;
        [assigned[i], assigned[j]] = [sj, si];
        changed = true;
      }
    }
  }
  // um talento não pode vir antes do pré-requisito: troca as vagas quando os dois cabem
  for (let pass = 0; pass < items.length; pass++) {
    let swapped = false;
    items.forEach((it, i) => {
      for (const dep of it.depende) {
        const j = items.findIndex(o => dependsMatch(o, dep));
        if (j < 0 || assigned[i] == null || assigned[j] == null) continue;
        if (slots[assigned[j]].nivel > slots[assigned[i]].nivel && fits(i, assigned[j]) && fits(j, assigned[i])) {
          [assigned[i], assigned[j]] = [assigned[j], assigned[i]];
          swapped = true;
        }
      }
    });
    if (!swapped) break;
  }
  return assigned;
}

/**
 * Valida as escolhas de talentos: requisitos, repetição, parâmetro e progressão.
 * Devolve { erros, avisos, vagas: [{nivel, tipo, talento}], restantes: {geral, guerreiro, mago} }.
 */
export function validateFeats(ctx, isHuman) {
  const erros = [];
  const avisos = [];
  const slots = featSlots(ctx.level, ctx.classKey, isHuman);
  const items = [];
  const seen = new Set();
  for (const c of ctx.chosenFeats) {
    const { feat } = c;
    const ev = evaluateFeat(feat, ctx, { parametro: c.parametro });
    const label = featLabel(feat, c.parametro);
    const k = featKey(feat.nome);
    const repeat = `${k}|${loose(c.parametro || '')}`;
    // repetir: só talentos "várias vezes"; os que têm parâmetro precisam de outro parâmetro (outra arma…)
    const repeated = !isMultiple(feat) ? seen.has(k) : featParameter(feat) ? seen.has(repeat) : false;
    if (repeated) erros.push(`${label} foi escolhido mais de uma vez${featParameter(feat) && isMultiple(feat) ? ' com o mesmo parâmetro' : ''}.`);
    seen.add(repeat);
    seen.add(k);
    if (ctx.granted.some(g => g.key === k && !g.parametro)) avisos.push(`${label} já é concedido pela classe ou pela raça.`);
    if (ev.status === 'bloqueado') erros.push(`${label}: falta ${ev.falta.join(', ')}.`);
    if (ev.status === 'confirmar') avisos.push(`${label}: confira com o Mestre — ${ev.confirmar.join(', ')}.`);
    if (featParameter(feat) && !String(c.parametro || '').trim()) erros.push(`${label}: informe ${T30.parametroRotulo[featParameter(feat)]}.`);
    items.push({ feat, label, parametro: c.parametro, nivel: ev.nivel ?? 1, soNoNivel: ev.soNoNivel, depende: ev.depende });
  }
  // o talento vem no mesmo nível do pré-requisito escolhido, ou depois
  for (let pass = 0; pass < items.length; pass++) {
    for (const it of items) {
      for (const dep of it.depende) {
        const pre = items.find(o => dependsMatch(o, dep));
        if (pre) it.nivel = Math.max(it.nivel, pre.nivel);
      }
    }
  }
  const assigned = matchSlots(items, slots);
  const vagas = slots.map(s => ({ ...s, talento: null }));
  items.forEach((it, i) => {
    if (assigned[i] == null) {
      const late = it.nivel > 1 ? ` (só poderia ser escolhido a partir do ${it.nivel}º nível)` : '';
      erros.push(`${it.label}: não sobra vaga de talento compatível${late}.`);
    } else Object.assign(vagas[assigned[i]], { talento: it.label, ordem: i });
  });
  const restantes = { geral: 0, guerreiro: 0, mago: 0 };
  for (const v of vagas) if (!v.talento) restantes[v.tipo]++;
  // por nível; dentro do nível, na ordem em que foram escolhidos (pré-requisito antes), vagas livres no fim
  vagas.sort((a, b) => a.nivel - b.nivel || (a.ordem ?? Infinity) - (b.ordem ?? Infinity));
  return { erros: [...new Set(erros)], avisos: [...new Set(avisos)], vagas, restantes };
}

/* ------------------------------------------------------------------ perícias */

/** Regras de compra de cada perícia: custo por graduação, máximo e exclusividade. */
export function skillRules(sheet) {
  const ranks = maxRanks(sheet.nivel);
  return sheet.pericias.map(p => {
    const key = skillKey(p.nome);
    const exclusiva = T30.periciasExclusivas.includes(key);
    const bloqueada = exclusiva && p.classe === false;
    return {
      nome: p.nome,
      key,
      classe: p.classe,
      exclusiva,
      bloqueada,
      custo: p.classe === false ? 2 : 1,
      passo: p.classe === false ? 0.5 : 1,
      max: bloqueada ? 0 : p.classe === false ? ranks.cruzada : ranks.classe,
    };
  });
}

/** Valida a distribuição de graduações: { gastos, total, restantes, erros }. */
export function validateSkills(sheet, ranksByKey) {
  const total = sheet.pontosPericia?.total ?? null;
  const erros = [];
  let gastos = 0;
  for (const r of skillRules(sheet)) {
    const n = Number(ranksByKey[r.key]) || 0;
    if (!n) continue;
    const nome = r.nome;
    if (n < 0) erros.push(`${nome}: graduações não podem ser negativas.`);
    if (r.bloqueada) erros.push(`${nome} é perícia exclusiva de outras classes (3.0).`);
    else if (n > r.max) erros.push(`${nome}: no máximo ${String(r.max).replace('.5', ',5')} graduações no ${sheet.nivel}º nível.`);
    if (r.classe !== false && !Number.isInteger(n)) erros.push(`${nome}: perícia de classe usa graduações inteiras.`);
    if (!Number.isInteger(n * 2)) erros.push(`${nome}: perícia de outra classe usa meias graduações.`);
    gastos += n * r.custo;
  }
  if (total != null && gastos > total) erros.push(`Pontos de perícia gastos (${gastos}) acima do disponível (${total}).`);
  return { gastos, total, restantes: total == null ? null : total - gastos, erros };
}

/* ------------------------------------------------------------------ rótulos */

const SMALL = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'com', 'por', 'a', 'o', 'à', 'às', 'ao', 'um', 'uma', 'no', 'na', 'para', 'ou']);

/** "ATAQUE PODEROSO" → "Ataque Poderoso" (o compêndio grava os nomes em caixa alta). */
export function titleCase(nome) {
  return String(nome || '').toLowerCase().split(/(\s+|\(|\)|\/|-)/).map((w, i) => (
    !w || /^\s+$|^[()/-]$/.test(w) ? w : i > 0 && SMALL.has(w) ? w : w[0].toUpperCase() + w.slice(1)
  )).join('');
}

export const featLabel = (feat, parametro) => `${titleCase(feat.nome)}${parametro ? ` (${parametro})` : ''}`;
