import { html } from '../core/dom.js';
import { isBlank } from '../core/format.js';
import { ATRIBUTOS, CLASS_COLUMNS, SIM_NAO, labelOf } from './options.js';

const ATRIBUTO_OPTIONS = [...ATRIBUTOS, { value: 'N/A', label: 'N/A · Nenhum' }];

function attrChip(value) {
  if (isBlank(value)) return html`<span class="cell-muted">—</span>`;
  return html`<span class="attr ${value === 'N/A' ? 'attr--none' : ''}">${value}</span>`;
}

function trainedBadge(value) {
  if (value === 'S') return html`<span class="badge badge--verdant">Sim</span>`;
  if (value === 'N') return html`<span class="badge badge--neutral">Não</span>`;
  return isBlank(value) ? html`<span class="cell-muted">—</span>` : value;
}

const classSkillColumns = CLASS_COLUMNS.map(c => ({
  key: c.key,
  label: c.abbr,
  title: c.label,
  kind: 'center',
  desktopOnly: true,
  cell: r => (Number(r[c.key]) === 1
    ? html`<span class="dot" role="img" aria-label="${c.label}: perícia de classe"></span>`
    : html`<span class="dot dot--off" role="img" aria-label="${c.label}: não"></span>`),
  text: r => (Number(r[c.key]) === 1 ? c.label : ''),
  searchable: false,
}));

export default {
  table: 'pericias',
  slug: 'pericias',
  icon: 'book',
  group: 'compendio',
  names: { singular: 'Perícia', plural: 'Perícias', newLabel: 'Nova Perícia', created: 'Perícia criada', updated: 'Perícia atualizada', removed: 'Perícia excluída' },
  numLinks: 5,
  texts: {
    list: { title: 'Lista de perícias D&D 3.5', description: 'Aqui você encontra todas as perícias disponíveis para seu personagem!' },
    create: { title: 'Crie uma perícia', description: 'Mas não seja muito apelão, pois o Mestre não gosta!!!' },
    edit: { description: 'Altere os campos necessários para melhorar essa perícia!!!' },
  },
  tableClass: 'data-table--matrix',
  columns: [
    { key: 'id', label: 'ID', kind: 'id' },
    { key: 'nome', label: 'Nome', primary: true },
    { key: 'atributo', label: 'Atributo', cell: r => attrChip(r.atributo) },
    { key: 'sem_treinamento', label: 'Sem treinamento', cell: r => trainedBadge(r.sem_treinamento), text: r => `${labelOf(SIM_NAO, r.sem_treinamento) || ''} ${r.sem_treinamento || ''}` },
    ...classSkillColumns,
    {
      key: 'classes_de_pericia',
      label: 'Perícia de classe',
      mobileOnly: true,
      cell: r => {
        const list = CLASS_COLUMNS.filter(c => Number(r[c.key]) === 1);
        return list.length
          ? html`<span class="chip-list">${list.map(c => html`<span class="badge badge--neutral">${c.label}</span>`)}</span>`
          : html`<span class="cell-muted">Nenhuma</span>`;
      },
      text: r => CLASS_COLUMNS.filter(c => Number(r[c.key]) === 1).map(c => c.label).join(' '),
    },
  ],
  searchFields: [
    { key: 'id', label: 'Id' },
    { key: 'nome', label: 'Nome' },
    { key: 'atributo', label: 'Atributo' },
    { key: 'sem_treinamento', label: 'Sem treinamento' },
    { key: 'classes_de_pericia', label: 'Perícia de classe' },
  ],
  sections: [
    {
      fields: [
        { name: 'nome', label: 'Nome', type: 'text', required: true, placeholder: 'Nome da Perícia', maxLength: 100, span: 6, spanMd: 12 },
        { name: 'atributo', label: 'Atributo', type: 'select', options: ATRIBUTO_OPTIONS, emptyLabel: 'Não definido', span: 3, spanMd: 6, hint: 'Atributo-chave da perícia.' },
        { name: 'sem_treinamento', label: 'Sem treinamento', type: 'select', options: SIM_NAO, emptyLabel: 'Não definido', span: 3, spanMd: 6, hint: 'Pode ser usada sem graduações?' },
      ],
    },
    {
      title: 'Perícia de classe',
      hint: 'Marque as classes para as quais esta é uma perícia de classe.',
      fields: [{ name: 'classes', type: 'flags', items: CLASS_COLUMNS.map(c => ({ name: c.key, label: c.label })) }],
    },
  ],
};
