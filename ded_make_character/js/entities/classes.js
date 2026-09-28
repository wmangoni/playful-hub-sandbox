import { html } from '../core/dom.js';
import { isBlank } from '../core/format.js';
import { BBA_TIPOS, DADOS_DE_VIDA, RESISTENCIAS, TIPOS_CLASSE, labelOf } from './options.js';

const TIPO_TONE = { 'Básica': 'neutral', 'Prestígio': 'arcane', 'Épica': 'ember' };
const BBA_LEVEL = { bom: 3, medio: 2, ruim: 1 };

export function tipoBadge(tipo) {
  if (isBlank(tipo)) return html`<span class="cell-muted">—</span>`;
  return html`<span class="badge badge--${TIPO_TONE[tipo] || 'neutral'}">${tipo}</span>`;
}

function bbaMeter(value) {
  const level = BBA_LEVEL[value];
  if (!level) return html`<span>${value ?? '—'}</span>`;
  return html`<span class="meter" data-level="${level}"><span class="meter__pips" aria-hidden="true"><i></i><i></i><i></i></span>${labelOf(BBA_TIPOS, value)}</span>`;
}

function resistances(value) {
  if (isBlank(value)) return html`<span class="cell-muted">—</span>`;
  const active = new Set(String(value).split('/'));
  return html`<span class="saves" aria-label="${labelOf(RESISTENCIAS, value) || value}">${['fort', 'ref', 'von'].map(
    key => html`<span class="saves__item ${active.has(key) ? 'is-on' : ''}" aria-hidden="true">${key}</span>`
  )}</span>`;
}

export default {
  table: 'classes',
  slug: 'classes',
  icon: 'swords',
  group: 'compendio',
  names: { singular: 'Classe', plural: 'Classes', newLabel: 'Nova Classe', created: 'Classe criada', updated: 'Classe atualizada', removed: 'Classe excluída' },
  numLinks: 5,
  texts: {
    list: { title: 'Lista de Classes D&D 3.5', description: 'Aqui você encontra todas as classes disponíveis para seu personagem!' },
    create: { title: 'Crie uma Classe', description: 'Mas não seja muito apelão, pois o Mestre não gosta!!!' },
    edit: { description: 'Altere os campos necessários para melhorar essa classe!!!' },
  },
  columns: [
    { key: 'id', label: 'ID', kind: 'id' },
    { key: 'nome', label: 'Nome da Classe', primary: true },
    { key: 'dv', label: 'Dados de Vida', kind: 'center', cell: r => (isBlank(r.dv) ? '—' : html`<span class="die">d${r.dv}</span>`), text: r => (isBlank(r.dv) ? '' : `d${r.dv} ${r.dv}`) },
    { key: 'bba_tipo', label: 'Tipo de Bônus Base de Ataque', cell: r => bbaMeter(r.bba_tipo), text: r => `${labelOf(BBA_TIPOS, r.bba_tipo) || ''} ${r.bba_tipo || ''}` },
    { key: 'tipo', label: 'Tipo de Classes', cell: r => tipoBadge(r.tipo) },
    { key: 'resistencia', label: 'Resistência', cell: r => resistances(r.resistencia), text: r => `${r.resistencia || ''} ${labelOf(RESISTENCIAS, r.resistencia) || ''}` },
  ],
  expand: {
    label: 'Pré-requisitos',
    when: r => !isBlank(r.requisitos),
    content: r => html`<p class="cell-lore">${r.requisitos}</p>`,
  },
  sections: [
    {
      fields: [
        // Mesma ordem do formulário original: Nome, DV, BBA, Tipo, Requisitos (condicional), Resistência.
        { name: 'nome', label: 'Nome', type: 'text', required: true, placeholder: 'Nome da Classe', maxLength: 100, span: 8 },
        { name: 'dv', label: 'Dados de Vida', type: 'select', required: true, options: DADOS_DE_VIDA, valueType: 'int', span: 4 },
        { name: 'bba_tipo', label: 'Tipo de Bônus Base de Ataque', type: 'select', required: true, options: BBA_TIPOS, span: 6 },
        { name: 'tipo', label: 'Tipo da Classe', type: 'select', required: true, options: TIPOS_CLASSE, span: 6 },
        {
          name: 'requisitos',
          label: 'Requisitos',
          type: 'textarea',
          placeholder: 'Talentos: Ataque Poderoso. BBA: 5+',
          maxLength: 255,
          span: 12,
          hint: 'Exibido para classes de Prestígio e Épicas.',
          visibleWhen: values => !isBlank(values.tipo) && values.tipo !== 'Básica',
        },
        { name: 'resistencia', label: 'Resistência', type: 'select', required: true, options: RESISTENCIAS, span: 6, spanMd: 12, hint: 'Resistências fortes da classe.' },
      ],
    },
  ],
};
