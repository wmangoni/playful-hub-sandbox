import { html } from '../core/dom.js';
import { abilityModifier, formatNumber, isBlank, signed } from '../core/format.js';
import { SEXOS, TENDENCIAS, labelOf } from './options.js';

const ABILITIES = [
  { name: 'for', label: 'Força', abbr: 'FOR' },
  { name: 'des', label: 'Destreza', abbr: 'DES' },
  { name: 'con', label: 'Constituição', abbr: 'CON' },
  { name: 'int', label: 'Inteligência', abbr: 'INT' },
  { name: 'sab', label: 'Sabedoria', abbr: 'SAB' },
  { name: 'car', label: 'Carisma', abbr: 'CAR' },
];

const refName = (table, id, ctx) => (id == null ? null : ctx.lookups[table]?.get(String(id))?.nome ?? `#${id}`);
const orDash = value => (isBlank(value) ? html`<span class="cell-muted">—</span>` : value);

function abilityCell(row, key) {
  if (isBlank(row[key])) return html`<span class="cell-muted">—</span>`;
  const mod = abilityModifier(row[key]);
  return html`<span class="score">${row[key]}<small class="mod ${mod > 0 ? 'mod--pos' : mod < 0 ? 'mod--neg' : ''}">${signed(mod)}</small></span>`;
}

const DETAILS = [
  { key: 'divindade', label: 'Divindade' },
  { key: 'idade', label: 'Idade', format: v => `${v} anos` },
  { key: 'sexo', label: 'Sexo', format: v => labelOf(SEXOS, v) || v },
  { key: 'altura', label: 'Altura', format: v => `${formatNumber(v, { decimals: 2 })} m` },
  { key: 'peso', label: 'Peso', format: v => `${formatNumber(v)} kg` },
  { key: 'olhos', label: 'Olhos' },
  { key: 'cabelos', label: 'Cabelos' },
];

export default {
  table: 'personagens',
  slug: 'personagens',
  icon: 'hero',
  group: 'aventura',
  lookups: ['races', 'classes'],
  // Ficha de personagem D&D 3.0 (TASK_003): botão "Salvar e gerar ficha" e ação por linha.
  sheet: true,
  rowLinks: [{ icon: 'scroll', label: 'Ficha', href: r => `#/personagens/${r.id}/ficha` }],
  names: { singular: 'Personagem', plural: 'Personagens', newLabel: 'Novo Personagem', created: 'Personagem criado', updated: 'Personagem atualizado', removed: 'Personagem excluído' },
  numLinks: 5,
  texts: {
    list: { title: 'Lista de Personagens D&D 3.5', description: 'Aqui você encontra todos os personagens criados por você!' },
    create: { title: 'Crie um Personagem', description: 'Mas não seja muito apelão, pois o Mestre não gosta!!!' },
    edit: { description: 'Altere os campos necessários do personagem!!!' },
  },
  columns: [
    { key: 'id', label: 'ID', kind: 'id' },
    { key: 'nome', label: 'Nome', primary: true },
    { key: 'race_id', label: 'Raça', cell: (r, ctx) => orDash(refName('races', r.race_id, ctx)), text: (r, ctx) => refName('races', r.race_id, ctx) ?? '' },
    { key: 'classe_id', label: 'Classe', cell: (r, ctx) => orDash(refName('classes', r.classe_id, ctx)), text: (r, ctx) => refName('classes', r.classe_id, ctx) ?? '' },
    { key: 'nivel', label: 'Nível', kind: 'num' },
    { key: 'tendencia', label: 'Tendência', cell: r => orDash(labelOf(TENDENCIAS, r.tendencia) || r.tendencia), text: r => `${labelOf(TENDENCIAS, r.tendencia) || ''} ${r.tendencia || ''}` },
    ...ABILITIES.map(a => ({ key: a.name, label: a.abbr, title: a.label, kind: 'num', cell: r => abilityCell(r, a.name) })),
    { key: 'iniciativa', label: 'Inic.', title: 'Iniciativa', kind: 'num', cell: r => (isBlank(r.iniciativa) ? '—' : signed(r.iniciativa)) },
    { key: 'pvs', label: 'PVs', title: 'Pontos de vida', kind: 'num', cell: r => orDash(r.pvs) },
  ],
  searchFields: [
    { key: 'id', label: 'Id' },
    { key: 'nome', label: 'Nome' },
    { key: 'race_id', label: 'Raça' },
    { key: 'classe_id', label: 'Classe' },
    { key: 'nivel', label: 'Nível' },
    { key: 'tendencia', label: 'Tendência' },
    ...DETAILS.map(d => ({ key: d.key, label: d.label, text: r => (isBlank(r[d.key]) ? '' : `${d.format ? d.format(r[d.key]) : r[d.key]}`) })),
  ],
  expand: {
    label: 'Detalhes',
    when: () => true,
    content: r => html`<dl class="detail-grid">${DETAILS.map(d => html`<div><dt>${d.label}</dt><dd>${isBlank(r[d.key]) ? html`<span class="cell-muted">—</span>` : d.format ? d.format(r[d.key]) : r[d.key]}</dd></div>`)}</dl>`,
  },
  sections: [
    {
      title: 'Identidade',
      fields: [
        { name: 'nome', label: 'Nome', type: 'text', required: true, placeholder: 'Nome do Personagem', maxLength: 255, span: 4, spanMd: 12 },
        { name: 'race_id', label: 'Raça', type: 'select', required: true, valueType: 'int', options: ctx => ctx.tables.races.map(r => ({ value: r.id, label: r.nome })), span: 3, spanMd: 4 },
        { name: 'classe_id', label: 'Classe', type: 'select', required: true, valueType: 'int', options: ctx => ctx.tables.classes.map(c => ({ value: c.id, label: c.nome })), span: 5, spanMd: 8 },
        { name: 'tendencia', label: 'Tendência', type: 'select', required: true, options: TENDENCIAS, span: 4 },
        { name: 'divindade', label: 'Divindade', type: 'text', required: true, placeholder: 'Nome da Divindade', maxLength: 100, span: 8 },
      ],
    },
    {
      title: 'Detalhes',
      fields: [
        { name: 'nivel', label: 'Nível', type: 'number', required: true, integer: true, placeholder: '4', span: 3 },
        { name: 'idade', label: 'Idade', type: 'number', required: true, integer: true, placeholder: '28', span: 3 },
        { name: 'sexo', label: 'Sexo', type: 'select', required: true, options: SEXOS, span: 3 },
        { name: 'altura', label: 'Altura', type: 'number', required: true, step: '0.01', valueType: 'float', placeholder: '1,72', hint: 'Em metros.', span: 3 },
        { name: 'peso', label: 'Peso', type: 'number', required: true, integer: true, placeholder: '82', hint: 'Em quilos.', span: 4 },
        { name: 'olhos', label: 'Olhos', type: 'text', required: true, placeholder: 'Cor dos olhos', maxLength: 40, span: 4 },
        { name: 'cabelos', label: 'Cabelos', type: 'text', required: true, placeholder: 'Cor dos cabelos', maxLength: 40, span: 4 },
      ],
    },
    {
      title: 'Atributos',
      hint: 'Informe os valores base, sem os ajustes da raça (a ficha os aplica). O modificador é calculado automaticamente: (valor − 10) ÷ 2.',
      fields: ABILITIES.map(a => ({ name: a.name, label: a.label, type: 'number', required: true, integer: true, span: 2, modifier: true })),
    },
    {
      title: 'Combate',
      fields: [
        { name: 'iniciativa', label: 'Iniciativa', type: 'number', required: true, integer: true, span: 3, hint: 'Modificadores diversos; a ficha soma a Destreza.' },
        { name: 'pvs', label: 'PVs', type: 'number', required: true, integer: true, span: 3, hint: 'Pontos de vida.' },
      ],
    },
  ],
};
