import { html } from '../core/dom.js';
import { collator, isBlank } from '../core/format.js';

function tipoBadges(tipo) {
  if (isBlank(tipo)) return html`<span class="cell-muted">—</span>`;
  const parts = String(tipo).split(',').map(p => p.trim()).filter(Boolean);
  return html`<span class="chip-list">${parts.map(p => html`<span class="badge ${/ÉPICO|EPICO/i.test(p) ? 'badge--ember' : /DIVINO|EXALTADO|PURIFICA/i.test(p) ? 'badge--azure' : /METAM|MAGO|DRAC/i.test(p) ? 'badge--arcane' : ''}">${p}</span>`)}</span>`;
}

function longText(value) {
  if (isBlank(value)) return html`<span class="cell-muted">—</span>`;
  return html`<span class="clamp" title="${value}">${value}</span>`;
}

const DETAILS = [
  { key: 'requisitos', label: 'Requisitos' },
  { key: 'beneficio', label: 'Benefício' },
  { key: 'normal', label: 'Normal' },
  { key: 'fonte', label: 'Fonte' },
];

export default {
  table: 'talentos',
  slug: 'talentos',
  icon: 'sparkles',
  group: 'compendio',
  names: { singular: 'Talento', plural: 'Talentos', newLabel: 'Novo Talento', created: 'Talento criado', updated: 'Talento atualizado', removed: 'Talento excluído' },
  numLinks: 2,
  sort: (a, b) => collator.compare(a.nome ?? '', b.nome ?? ''),
  texts: {
    list: { title: 'Lista de talentos D&D 3.5', description: 'Aqui você encontra todos os talentos disponíveis para seu personagem!' },
    create: { title: 'Crie um talento', description: 'Lembre-se de dosar os benefícios com pré-requisitos.' },
    edit: { description: 'Altere os campos necessários para melhorar esse Talento!!!' },
  },
  columns: [
    { key: 'id', label: 'ID', kind: 'id' },
    { key: 'nome', label: 'Nome do Talento', primary: true },
    { key: 'tipo', label: 'Tipo', cell: r => tipoBadges(r.tipo) },
    { key: 'requisitos', label: 'Requisitos', cell: r => longText(r.requisitos), className: 'col-text' },
    { key: 'beneficio', label: 'Benefício', cell: r => longText(r.beneficio), className: 'col-text' },
    { key: 'normal', label: 'Normal', cell: r => longText(r.normal), className: 'col-text' },
  ],
  // Os textos longos aparecem truncados na lista; a linha expande com o conteúdo completo.
  expand: {
    label: 'Detalhes do talento',
    when: r => DETAILS.some(d => !isBlank(r[d.key])),
    content: r => html`<dl class="detail-list">${DETAILS.filter(d => !isBlank(r[d.key])).map(d => html`<div><dt>${d.label}</dt><dd class="cell-lore">${r[d.key]}</dd></div>`)}</dl>`,
  },
  sections: [
    {
      fields: [
        { name: 'nome', label: 'Nome', type: 'text', required: true, placeholder: 'Nome do Talento', maxLength: 100, span: 6, spanMd: 12 },
        {
          name: 'tipo',
          label: 'Tipo de talento',
          type: 'text',
          placeholder: 'Ex: Divino, Normal, etc...',
          maxLength: 40,
          span: 6,
          spanMd: 12,
          suggestions: ctx => [...new Set(ctx.tables.talentos.map(t => t.tipo).filter(v => !isBlank(v)))].sort(collator.compare),
        },
        {
          name: 'requisitos',
          label: 'Requisitos',
          type: 'textarea',
          rows: 3,
          placeholder: 'Ex.: For 13, Ataque Poderoso, bônus base de ataque +1 (ou "Nenhum")',
          span: 12,
        },
        { name: 'beneficio', label: 'Benefício', type: 'textarea', placeholder: 'O que o talento concede.', span: 6 },
        { name: 'normal', label: 'Normal', type: 'textarea', placeholder: 'Como funciona sem o talento.', span: 6 },
      ],
    },
  ],
};
