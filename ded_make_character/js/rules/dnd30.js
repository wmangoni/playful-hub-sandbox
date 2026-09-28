/**
 * Motor de regras D&D 3ª edição (3.0) para a ficha de personagem.
 * Funções puras (sem DOM): recebem os dados do compêndio e devolvem os valores
 * derivados. As tabelas numéricas vêm de ./tables30.js (pesquisa documentada).
 *
 * Premissas (documentadas na TASK_003):
 * - Os atributos cadastrados são os valores BASE (rolados); a ficha aplica os
 *   ajustes raciais (3.0 para as raças do Livro do Jogador; compêndio para as demais).
 * - O campo "Iniciativa" do personagem é o modificador diverso (misc) da ficha:
 *   Iniciativa total = modificador de Des + misc.
 * - Sem equipamento cadastrado: CA sem armadura/escudo; os campos de armas,
 *   armaduras e perícias graduadas ficam em branco para preencher à mão.
 * - Classes básicas seguem a 3.0 (DV, resistências boas, BBA, perícias de classe,
 *   habilidades); quando o compêndio (3.5) diverge, a ficha avisa. Classes de
 *   prestígio/personalizadas usam os dados do compêndio.
 * - Dado ausente (raça, classe, atributo) deixa em branco o que depende dele: a
 *   ficha nunca inventa um valor. O nível é limitado a 1–20 (a ficha avisa).
 */
import { normalize as loose } from '../core/format.js';
import { T30 } from './tables30.js';

export const ABILITIES = [
  { key: 'for', abbr: 'FOR', label: 'Força' },
  { key: 'des', abbr: 'DES', label: 'Destreza' },
  { key: 'con', abbr: 'CON', label: 'Constituição' },
  { key: 'int', abbr: 'INT', label: 'Inteligência' },
  { key: 'sab', abbr: 'SAB', label: 'Sabedoria' },
  { key: 'car', abbr: 'CAR', label: 'Carisma' },
];

/** Nome da classe → chave das colunas das tabelas (bar, bad, cle…). */
const CLASS_KEY_BY_NAME = {
  barbaro: 'bar', bardo: 'bad', clerigo: 'cle', druida: 'dru', guerreiro: 'gue', monge: 'mon',
  paladino: 'pal', ranger: 'ran', ladino: 'lad', feiticeiro: 'fei', mago: 'mag',
};
const CLASS_KEY_BY_ID = ['bar', 'bad', 'cle', 'dru', 'gue', 'mon', 'pal', 'ran', 'lad', 'fei', 'mag'];

export function classKeyOf(classe) {
  if (!classe) return null;
  return CLASS_KEY_BY_NAME[loose(classe.nome)] || null;
}

/** Classe básica pelo nome; o id só serve de desempate para classes renomeadas. */
export function classKeyWithFallback(classe) {
  return classKeyOf(classe) || (classe && classe.id >= 1 && classe.id <= 11 && loose(classe.tipo) === 'basica' ? CLASS_KEY_BY_ID[classe.id - 1] : null);
}

const RACE_KEY_BY_ID = ['humano', 'anao', 'elfo', 'gnomo', 'meio-elfo', 'meio-orc', 'halfling'];

/** Raça do Livro do Jogador pelo nome; o id (1–7 do compêndio original) cobre raças renomeadas. */
export function raceKeyOf(race) {
  if (!race) return null;
  const byName = loose(race.nome);
  if (T30.racas[byName]) return byName;
  return race.id >= 1 && race.id <= RACE_KEY_BY_ID.length ? RACE_KEY_BY_ID[race.id - 1] : null;
}

/** Nome da perícia para comparação (o dump grava "Usar Intrumento Mágico"). */
export const skillKey = nome => loose(nome).replace('intrumento', 'instrumento');

export const mod = score => (Number.isFinite(score) ? Math.floor((score - 10) / 2) : null);
export const signed = n => (n == null ? '—' : n >= 0 ? `+${n}` : `−${Math.abs(n)}`);
const num = value => (value === null || value === undefined || value === '' ? null : Number(value));
const clampLevel = level => Math.max(1, Math.min(20, Number(level) || 1));
/** Soma que propaga a ausência: qualquer parcela desconhecida deixa o total em branco. */
const sum = (...parts) => (parts.some(p => p == null || Number.isNaN(p)) ? null : parts.reduce((a, b) => a + b, 0));

/** Aplica os ajustes raciais (bônus em um atributo, desvantagem em outro). */
export function abilityScores(personagem, race, rules = null) {
  return ABILITIES.map(a => {
    const base = num(personagem[a.key]);
    let racial = 0;
    if (rules) racial = rules[a.key] ?? 0;
    else {
      if (race && loose(race.atributo_bonus) === a.key && num(race.bonus)) racial += Math.abs(num(race.bonus));
      if (race && loose(race.atributo_desvantagem) === a.key && num(race.desvantagem)) racial -= Math.abs(num(race.desvantagem));
    }
    const total = base == null || Number.isNaN(base) ? null : base + racial;
    return { ...a, base, racial, total, mod: mod(total) };
  });
}

/** Bônus base de ataque: tabela `bba` do banco para classes básicas; fórmula para as demais. */
export function baseAttackBonus(level, { classKey, bbaTipo, bbaRows } = {}) {
  const L = Math.max(1, Number(level) || 1);
  const row = classKey && bbaRows ? bbaRows.find(r => r.id === clampLevel(L)) : null;
  if (row && row[classKey] != null && L <= 20) return Number(row[classKey]);
  const tipo = loose(bbaTipo);
  if (tipo === 'bom') return L;
  if (tipo === 'medio') return Math.floor((L * 3) / 4);
  return Math.floor(L / 2);
}

/** Ataques adicionais a cada +5 de BBA a partir de +6 (máx. 4 ataques). */
export function iterativeAttacks(bab) {
  if (bab == null) return [];
  const attacks = [bab];
  for (let next = bab - 5; next >= 1 && attacks.length < 4; next -= 5) attacks.push(next);
  return attacks;
}

export const baseSave = (level, good) => {
  const L = Math.max(1, Number(level) || 1);
  return good ? 2 + Math.floor(L / 2) : Math.floor(L / 3);
};

export const xpForLevel = level => (1000 * level * (level - 1)) / 2;

export function maxRanks(level) {
  const L = Math.max(1, Number(level) || 1);
  return { classe: L + 3, cruzada: (L + 3) / 2 };
}

/** Pontos de perícia: (base + Int) × 4 no 1º nível e (base + Int) por nível depois (mín. 1). Humano +4/+1. */
export function skillPoints(level, classKey, intMod, isHuman) {
  const base = classKey ? T30.pontosPericia[classKey] : null;
  if (base == null || intMod == null) return null;
  const L = Math.max(1, Number(level) || 1);
  const perLevel = Math.max(1, base + intMod);
  const first = perLevel * 4 + (isHuman ? 4 : 0);
  const later = (perLevel + (isHuman ? 1 : 0)) * (L - 1);
  return { base, perLevel: perLevel + (isHuman ? 1 : 0), first, total: first + later };
}

/** Talentos: 1 no 1º nível e +1 a cada 3 níveis; humano +1; guerreiro e mago ganham adicionais. */
export function featsAvailable(level, classKey, isHuman) {
  const L = Math.max(1, Number(level) || 1);
  const general = 1 + Math.floor(L / 3) + (isHuman ? 1 : 0);
  let bonus = 0;
  let bonusLabel = null;
  if (classKey === 'gue') {
    bonus = 1 + Math.floor(L / 2);
    bonusLabel = 'talentos adicionais de guerreiro';
  } else if (classKey === 'mag') {
    bonus = Math.floor(L / 5);
    bonusLabel = 'talentos adicionais de mago (5º, 10º, 15º, 20º)';
  }
  return { general, bonus, bonusLabel, total: general + bonus };
}

export const abilityIncreases = level => Math.floor((Math.max(1, Number(level) || 1)) / 4);

/** Capacidade de carga (em kg) pela Força e pelo tamanho. */
export function carryingCapacity(strength, sizeFactor = 1) {
  const table = T30.capacidadeCargaLb;
  if (!Number.isFinite(strength) || strength < 1 || !Number.isFinite(sizeFactor)) return null;
  let s = strength;
  let multiplier = 1;
  while (s > 29) {
    s -= 10;
    multiplier *= 4;
  }
  const [light, medium, heavy] = table[s].map(lb => lb * multiplier * sizeFactor);
  const kg = lb => Math.round(lb * T30.kgPorLibra);
  return {
    leve: kg(light),
    media: kg(medium),
    pesada: kg(heavy),
    acimaCabeca: kg(heavy),
    doChao: kg(heavy * 2),
    empurrar: kg(heavy * 5),
  };
}

/** Magias por dia: tabela da classe + magias adicionais pelo atributo de conjuração. */
export function spellcasting(classKey, level, abilityScore) {
  const table = classKey ? T30.magiasPorDia[classKey] : null;
  const abilityKey = classKey ? T30.atributoConjuracao[classKey] : null;
  if (!table || !abilityKey) return null;
  const L = clampLevel(level);
  const row = table[L - 1];
  const known = Number.isFinite(abilityScore);
  const abilityMod = mod(abilityScore);
  const levels = row.map((base, spellLevel) => {
    const canCast = base != null && known && abilityScore >= 10 + spellLevel;
    const bonus = spellLevel > 0 && base != null && abilityMod != null && abilityMod >= spellLevel ? 1 + Math.floor((abilityMod - spellLevel) / 4) : 0;
    return {
      nivel: spellLevel,
      base,
      bonus: canCast ? bonus : 0,
      dominio: base != null && classKey === 'cle' && spellLevel > 0 && (canCast || !known) ? 1 : 0,
      total: canCast ? base + bonus : null,
      cd: abilityMod == null ? null : 10 + spellLevel + abilityMod,
      bloqueado: base != null && known && !canCast,
    };
  });
  const knownTable = T30.magiasConhecidas[classKey]?.[L - 1] || null;
  if (knownTable) levels.forEach(l => { l.conhecidas = knownTable[l.nivel] ?? null; });
  const any = levels.some(l => l.base != null);
  return any ? { atributo: abilityKey, modificador: abilityMod, niveis: levels, conhecidas: Boolean(knownTable) } : null;
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const attacksText = list => list.map(signed).join('/');
const range = n => Array.from({ length: n }, (_, i) => i);

/** Redução de dano de classe (3.0): bárbaro 1/— a 4/— (11º, 14º, 17º, 20º); monge 20/+1 no 20º. */
export function damageReduction(classKey, level) {
  const L = clampLevel(level);
  if (classKey === 'bar' && L >= 11) return `${L >= 20 ? 4 : L >= 17 ? 3 : L >= 14 ? 2 : 1}/—`;
  if (classKey === 'mon' && L >= 20) return '20/+1';
  return null;
}

/** Resistência à magia de classe (3.0): monge a partir do 13º = nível + 10. */
export const spellResistance = (classKey, level) => (classKey === 'mon' && clampLevel(level) >= 13 ? clampLevel(level) + 10 : null);

/** Esquiva sobrenatural 3.0 (bárbaro a partir do 2º; ladino a partir do 3º). */
function uncannyDodge(L, [dexAt, flankAt, trapsAt]) {
  const parts = ['mantém a Des na CA'];
  if (L >= flankAt) parts.push('não pode ser flanqueado');
  const traps = L >= trapsAt ? 1 + Math.floor((L - trapsAt) / 3) : 0;
  if (traps) parts.push(`+${Math.min(4, traps)} contra armadilhas`);
  return L >= dexAt ? `Esquiva sobrenatural: ${parts.join('; ')}` : null;
}

/**
 * Habilidades de classe com números que dependem do nível (SRD 3.0 / Livro do Jogador 3.0).
 * `mods` pode ter valores nulos (atributo não cadastrado): o texto mostra a fórmula no lugar do número.
 */
export function classFeatures(classKey, level, mods, { small = false, sizeAttack = 0 } = {}) {
  const L = clampLevel(level);
  const out = [];
  const add = (...items) => out.push(...items.filter(Boolean));
  switch (classKey) {
    case 'bar': {
      const uses = L >= 20 ? 6 : 1 + Math.floor(L / 4);
      add(`Fúria ${uses}/dia (+4 For, +4 Con, +2 em Vontade, −2 na CA)`);
      if (L >= 15) add('Fúria maior: +6 For, +6 Con, +3 em Vontade');
      if (L >= 20) add('Não fica mais fatigado depois da fúria');
      add('Movimento rápido: +3 m (sem armadura pesada)', uncannyDodge(L, [2, 5, 10]));
      if (L >= 11) add(`Redução de dano ${damageReduction('bar', L)}`);
      add('Analfabeto (2 pontos de perícia para aprender a ler e escrever)');
      break;
    }
    case 'bad': {
      const ranks = L + 3; // canções exigem graduações em Atuação; mostra as alcançáveis no nível
      add(`Música de bardo ${plural(L, 'vez', 'vezes')}/dia`, `Conhecimento de bardo ${mods.int == null ? '(nível + Int)' : signed(L + mods.int)}`);
      add('Inspirar coragem: +2 contra enfeitiçar e medo, +1 no ataque e no dano (Atuação 3+)', 'Contracanto e fascinar (Atuação 3+)');
      if (ranks >= 6) add('Inspirar competência (Atuação 6+)');
      if (ranks >= 9) add('Sugestão (Atuação 9+)');
      if (ranks >= 12) add('Inspirar grandeza (Atuação 12+)');
      break;
    }
    case 'cle':
      add(`Expulsar ou fascinar mortos-vivos ${mods.car == null ? '3 + Car' : Math.max(0, 3 + mods.car)}/dia`, '2 domínios (+1 magia de domínio por nível de magia)', 'Conversão espontânea em magias de curar/infligir');
      break;
    case 'dru': {
      add('Companheiro animal', 'Senso da natureza');
      if (L >= 2) add('Caminho da floresta');
      if (L >= 3) add('Rastro invisível');
      if (L >= 4) add('Resistir à tentação da natureza');
      if (L >= 5) {
        const uses = L >= 18 ? 6 : L >= 14 ? 5 : L >= 10 ? 4 : L >= 7 ? 3 : L >= 6 ? 2 : 1;
        const sizes = [L >= 11 && 'Miúdo', 'Pequeno', 'Médio', L >= 8 && 'Grande', L >= 15 && 'Enorme'].filter(Boolean);
        add(`Forma selvagem ${uses}/dia (animal ${sizes.join(', ')}${L >= 12 ? '; atroz' : ''})`);
        if (L >= 16) add(`Forma selvagem elemental ${L >= 18 ? 3 : 1}/dia`);
      }
      if (L >= 9) add('Imunidade a venenos');
      if (L >= 13) add('Mil faces');
      if (L >= 15) add('Corpo atemporal');
      break;
    }
    case 'mon': {
      const i = L - 1;
      const base = T30.monge.ataqueDesarmado[i];
      const totals = base.map(b => sum(b, mods.for, sizeAttack));
      const dano = (small ? T30.monge.danoDesarmadoPequeno : T30.monge.danoDesarmado)[i];
      add(totals.every(t => t != null)
        ? `Ataque desarmado ${attacksText(totals)} (base ${attacksText(base)} + For e tamanho) · dano ${dano}`
        : `Ataque desarmado base ${attacksText(base)} · dano ${dano}`);
      add(`Ataque atordoante ${L}/dia (Fortitude CD ${mods.sab == null ? '10 + ½ nível + Sab' : 10 + Math.floor(L / 2) + mods.sab})`, 'Rajada de golpes (+1 ataque, −2 em todos)', L >= 9 ? 'Evasão aprimorada' : 'Evasão');
      if (mods.sab != null) add(`Bônus na CA sem armadura: Sab ${signed(Math.max(0, mods.sab))}${L >= 5 ? ` e +${Math.floor(L / 5)} de nível` : ''} (já somados)`);
      if (L >= 3) add('Mente tranquila (+2 contra encantamento)');
      if (L >= 4) add(`Queda lenta: ${L >= 18 ? 'qualquer distância' : L >= 8 ? '15 m' : L >= 6 ? '9 m' : '6 m'}`);
      if (L >= 5) add('Pureza corporal (imune a doenças)');
      if (L >= 7) add(`Integridade corporal: cura ${2 * L} PV/dia em si mesmo`, 'Salto das nuvens');
      if (L >= 10) add(`Golpe ki +${L >= 16 ? 3 : L >= 13 ? 2 : 1}`);
      if (L >= 11) add('Corpo de diamante (imune a venenos)');
      if (L >= 12) add('Passo etéreo: porta dimensional 1/dia');
      if (L >= 13) add(`Alma de diamante: resistência à magia ${spellResistance('mon', L)}`);
      if (L >= 15) add(`Palma vibrante 1/semana (Fortitude CD ${mods.sab == null ? '10 + ½ nível + Sab' : 10 + Math.floor(L / 2) + mods.sab})`);
      if (L >= 17) add('Corpo atemporal', 'Língua do sol e da lua');
      if (L >= 19) add(`Corpo vazio: etéreo ${L} rodadas/dia`);
      if (L >= 20) add(`Eu perfeito: extraplanar, redução de dano ${damageReduction('mon', L)}`);
      break;
    }
    case 'pal':
      add(
        `Graça divina: ${mods.car == null ? 'Car' : `Car ${signed(Math.max(0, mods.car))}`} nos testes de resistência (já somado)`,
        `Cura pelas mãos: ${mods.car == null ? 'Car × nível' : Math.max(0, mods.car * L)} PV/dia`,
        'Detectar o mal',
        'Saúde divina',
      );
      if (L >= 2) add('Aura de coragem', `Destruir o mal 1/dia (+Car no ataque, +${L} no dano)`);
      if (L >= 3) add(`Remover doença ${Math.floor(L / 3)}/semana`, 'Expulsar mortos-vivos (como clérigo 2 níveis abaixo)');
      if (L >= 5) add('Montaria especial');
      break;
    case 'ran': {
      // cada novo inimigo predileto (5º, 10º, 15º, 20º) aumenta em +1 o bônus dos anteriores
      const inimigos = 1 + Math.floor(L / 5);
      const bonus = range(inimigos).map(k => `+${inimigos - k}`);
      const lista = bonus.length > 1 ? `${bonus.slice(0, -1).join(', ')} e ${bonus.at(-1)}` : bonus[0];
      add(`Inimigo predileto: ${plural(inimigos, 'inimigo', 'inimigos')} (${lista} em Blefar, Ouvir, Sentir Motivação, Observar, Sobrevivência e no dano)`);
      break;
    }
    case 'lad':
      add(`Ataque furtivo +${Math.ceil(L / 2)}d6`, 'Encontrar armadilhas');
      if (L >= 2) add('Evasão');
      add(uncannyDodge(L, [3, 6, 11]));
      if (L >= 10) add(`Habilidades especiais de ladino: ${1 + Math.floor((L - 10) / 3)} à escolha`);
      break;
    case 'fei':
      add('Familiar', 'Magias conhecidas limitadas (veja a tabela de magias)');
      break;
    case 'mag':
      add('Familiar');
      if (L >= 5) add('Talentos adicionais de mago: metamágicos, de criação de item ou Dominar Magia');
      break;
    default:
      break;
  }
  return out;
}

/** Deslocamento: racial; monge sem armadura usa a tabela própria (Pequeno/anão: tabela lenta do SRD 3.0); bárbaro +3 m. */
function speedFor(raceTraits, classKey, level, sizeName) {
  const racial = raceTraits?.deslocamento ?? null;
  if (racial == null) return null;
  if (classKey === 'mon') {
    const slow = racial < 9 || loose(sizeName) === 'pequeno';
    return (slow ? T30.monge.deslocamentoPequeno : T30.monge.deslocamento)[clampLevel(level) - 1];
  }
  if (classKey === 'bar') return racial + 3;
  return racial;
}

const SIZE_BY_NAME = { minimo: 'Mínimo', minusculo: 'Minúsculo', pequeno: 'Pequeno', medio: 'Médio', grande: 'Grande', enorme: 'Enorme', imenso: 'Imenso', colossal: 'Colossal' };

/** Perícias de classe da 3.0 para uma classe básica (null para as demais). */
function classSkillTest(classKey) {
  const list = classKey ? T30.periciasClasse[classKey] : null;
  if (!list) return null;
  const allKnowledge = list.includes('conhecimento (*)');
  return key => list.includes(key) || (allKnowledge && key.startsWith('conhecimento'));
}

/**
 * Efeitos numéricos dos talentos escolhidos (tabela `efeitosTalentos`).
 * `talentos` = [{ nome, parametro }]; devolve bônus por alvo e textos para a ficha.
 */
export function featEffects(talentos = []) {
  const fx = { iniciativa: 0, resistencias: { fort: 0, ref: 0, von: 0 }, pericias: {}, condicionais: [], notas: [], pv: 0, vezesPv: 0 };
  for (const t of talentos) {
    const e = T30.efeitosTalentos[loose(t.nome).replace(/\s+/g, ' ')];
    if (!e) continue;
    fx.iniciativa += e.iniciativa || 0;
    for (const [k, n] of Object.entries(e.resistencias || {})) fx.resistencias[k] += n;
    for (const [k, n] of Object.entries(e.pericias || {})) fx.pericias[k] = (fx.pericias[k] || 0) + n;
    if (e.periciaDoParametro && t.parametro) {
      const k = skillKey(t.parametro);
      fx.pericias[k] = (fx.pericias[k] || 0) + e.periciaDoParametro;
    }
    if (e.condicional) fx.condicionais.push(e.condicional);
    if (e.pv) {
      fx.pv += e.pv;
      fx.vezesPv += 1;
    }
  }
  // Vitalidade escolhida várias vezes vira uma nota só ("+9 PV (Vitalidade ×3)")
  if (fx.pv) fx.notas.push(`+${fx.pv} PV (Vitalidade${fx.vezesPv > 1 ? ` ×${fx.vezesPv}` : ''}): confira se já estão nos PV cadastrados`);
  return fx;
}

/**
 * Monta todo o conteúdo calculado da ficha.
 * `escolhas` (opcional) = { ranks: { chave da perícia: graduações }, talentos: [{ nome, parametro }] }.
 */
export function computeSheet(personagem, { race, classe, bbaRows, pericias = [], escolhas = null }) {
  const fx = featEffects(escolhas?.talentos);
  const chosenRanks = escolhas?.ranks || {};
  // sinergias: +2 com 5 graduações (as situacionais viram nota)
  const skillName = key => pericias.find(p => skillKey(p.nome) === key)?.nome || key;
  const hasFive = key => (Number(chosenRanks[key]) || 0) >= 5;
  const synergy = {};
  const sinergias = [];
  for (const s of T30.sinergias) {
    const from = s.de.filter(hasFive);
    if (!from.length) continue;
    synergy[s.para] = 2;
    sinergias.push(`${skillName(s.para)} +2 (${from.map(skillName).join(' ou ')} 5+)`);
  }
  const sinergiasTexto = [
    sinergias.length ? `Sinergias (já somadas): ${sinergias.join('; ')}` : null,
    ...T30.sinergiasSituacionais.filter(s => hasFive(s.de)).map(s => `Sinergia: ${s.texto}`),
  ].filter(Boolean);
  const nivelCadastrado = num(personagem.nivel);
  const level = clampLevel(nivelCadastrado);
  const nivelForaDaFaixa = !(Number.isInteger(nivelCadastrado) && nivelCadastrado >= 1 && nivelCadastrado <= 20);
  const classKey = classKeyWithFallback(classe);
  const raceKey = raceKeyOf(race);
  const raceTraits = raceKey ? T30.racas[raceKey] : null;
  const isHuman = raceKey === 'humano';
  const compendiumSize = race ? SIZE_BY_NAME[loose(race.tamanho)] || race.tamanho || null : null;
  const sizeName = raceTraits?.tamanho ? SIZE_BY_NAME[raceTraits.tamanho] : compendiumSize;
  const size = sizeName ? T30.tamanho[loose(sizeName)] ?? null : null;

  // Raças do Livro do Jogador seguem a 3.0 (o compêndio só guarda um bônus e uma penalidade).
  const abilities = abilityScores(personagem, race, raceTraits?.ajustes ?? null);
  const divergenciasRaca = [];
  if (raceTraits && race) {
    const adjText = list => list.filter(a => a.racial).map(a => `${signed(a.racial)} ${a.abbr}`).join(', ') || 'nenhum';
    const official = adjText(abilities);
    const compendium = adjText(abilityScores(personagem, race));
    if (official !== compendium) divergenciasRaca.push(`ajustes de atributo ${official} (o compêndio registra ${compendium})`);
    if (sizeName !== compendiumSize) divergenciasRaca.push(`tamanho ${sizeName} (o compêndio registra ${compendiumSize ?? '—'})`);
  }
  const byKey = Object.fromEntries(abilities.map(a => [a.key, a]));
  const m = key => byKey[key].mod;

  const bbaTipo = classKey ? T30.bbaPorClasse[classKey] : classe?.bba_tipo;
  const bab = classe && bbaTipo ? baseAttackBonus(level, { classKey, bbaTipo, bbaRows }) : null;
  const compendiumSaves = String(classe?.resistencia || '').split('/').map(loose).filter(Boolean);
  const goodSaves = new Set(classKey ? T30.salvamentosBons[classKey] : compendiumSaves);
  const hitDie = classKey ? T30.dadoVida[classKey] : num(classe?.dv);
  const isClassSkill = classSkillTest(classKey);
  const divergencias = [];
  if (classKey && classe) {
    if (num(classe.dv) !== T30.dadoVida[classKey]) divergencias.push(`dado de vida d${T30.dadoVida[classKey]} (o compêndio registra d${classe.dv})`);
    const a = [...compendiumSaves].sort().join('/');
    const b = [...T30.salvamentosBons[classKey]].sort().join('/');
    if (a !== b) divergencias.push(`resistências boas ${b.replace(/\//g, ', ')} (o compêndio registra ${a.replace(/\//g, ', ') || '—'})`);
    const skillDiffs = pericias.filter(p => (Number(p[classKey]) === 1) !== isClassSkill(skillKey(p.nome))).map(p => p.nome);
    if (skillDiffs.length) {
      const names = skillDiffs.slice(0, 4).join(', ') + (skillDiffs.length > 4 ? '…' : '');
      divergencias.push(`perícias de classe pela lista da 3.0 (o compêndio difere em ${skillDiffs.length}: ${names})`);
    }
  }
  const car = m('car');
  const graceBonus = classKey === 'pal' ? (car == null ? null : Math.max(0, car)) : 0;
  const raceSaveBonus = raceTraits?.bonusResistencias ?? 0;
  const saves = [
    { key: 'fort', label: 'Fortitude', ability: 'CON', abilityLabel: 'Constituição', abilityMod: m('con') },
    { key: 'ref', label: 'Reflexos', ability: 'DES', abilityLabel: 'Destreza', abilityMod: m('des') },
    { key: 'von', label: 'Vontade', ability: 'SAB', abilityLabel: 'Sabedoria', abilityMod: m('sab') },
  ].map(s => {
    const base = classe ? baseSave(level, goodSaves.has(s.key)) : null;
    const misc = sum(raceSaveBonus, graceBonus, fx.resistencias[s.key]);
    return { ...s, base, good: goodSaves.has(s.key), misc, total: sum(base, s.abilityMod, misc) };
  });

  const dex = m('des');
  const sab = m('sab');
  const monkAc = classKey === 'mon' ? (sab == null ? null : Math.max(0, sab) + Math.floor(level / 5)) : 0;
  const ac = { base: 10, armadura: 0, escudo: 0, destreza: dex, tamanho: size?.ca ?? null, natural: 0, diversos: monkAc };
  ac.total = sum(ac.base, ac.armadura, ac.escudo, ac.destreza, ac.tamanho, ac.natural, ac.diversos);

  const initMisc = (num(personagem.iniciativa) ?? 0) + fx.iniciativa;
  const ranks = maxRanks(level);
  const skills = pericias
    .map(p => {
      const key = skillKey(p.nome);
      const abilityMod = byKey[loose(p.atributo)]?.mod ?? null;
      const racial = raceTraits?.pericias?.[key] ?? 0;
      const sizeBonus = key === 'esconder-se' || key === 'esconder' ? size?.esconder ?? null : 0;
      const graduacoes = Number(chosenRanks[key]) || 0;
      const diversos = sum(racial, sizeBonus, fx.pericias[key] || 0, synergy[key] || 0);
      return {
        nome: p.nome,
        atributo: p.atributo,
        classe: isClassSkill ? isClassSkill(key) : null,
        semTreinamento: p.sem_treinamento === 'S',
        modAtributo: abilityMod,
        graduacoes,
        diversos,
        // meia graduação (outra classe) conta para o máximo, mas não soma no teste
        total: sum(abilityMod, Math.floor(graduacoes), diversos),
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const castingKey = classKey ? loose(T30.atributoConjuracao[classKey]) : null;
  return {
    nivel: level,
    nivelCadastrado,
    nivelForaDaFaixa,
    classKey,
    raceKey,
    identidade: {
      nome: personagem.nome,
      classe: classe?.nome ?? null,
      raca: race?.nome ?? null,
      tamanho: sizeName,
    },
    atributos: abilities,
    pv: { total: num(personagem.pvs), dadoVida: hitDie ? `d${hitDie}` : null, modCon: m('con') },
    reducaoDano: damageReduction(classKey, level),
    resistenciaMagia: spellResistance(classKey, level),
    deslocamento: speedFor(raceTraits, classKey, level, sizeName),
    divergencias,
    divergenciasRaca,
    habilidadesClasse: classFeatures(classKey, level, Object.fromEntries(abilities.map(a => [a.key, a.mod])), {
      small: loose(sizeName) === 'pequeno',
      sizeAttack: size?.ataque ?? null,
    }),
    ca: ac,
    iniciativa: { total: sum(dex, initMisc), destreza: dex, diversos: initMisc },
    resistencias: saves,
    condicionais: raceTraits?.condicionais ?? [],
    condicionaisCombate: [...(raceTraits?.condicionaisCombate ?? []), ...fx.condicionais],
    notasTalentos: fx.notas,
    sinergias: sinergiasTexto,
    bba: { valor: bab, ataques: iterativeAttacks(bab) },
    corpoACorpo: { bba: bab, forca: m('for'), tamanho: size?.ataque ?? null, total: sum(bab, m('for'), size?.ataque) },
    distancia: { bba: bab, destreza: dex, tamanho: size?.ataque ?? null, total: sum(bab, dex, size?.ataque) },
    pericias: skills,
    pontosPericia: skillPoints(level, classKey, byKey.int.mod, isHuman),
    graduacaoMaxima: ranks,
    talentos: featsAvailable(level, classKey, isHuman),
    aumentosAtributo: abilityIncreases(level),
    xp: { atual: xpForLevel(level), proximo: level < 20 ? xpForLevel(level + 1) : null },
    carga: size ? carryingCapacity(byKey.for.total, size.carga) : null,
    magias: spellcasting(classKey, level, castingKey ? byKey[castingKey]?.total : null),
    idiomas: raceTraits?.idiomas ?? null,
    tracosRaciais: raceTraits?.tracos ?? [],
  };
}
