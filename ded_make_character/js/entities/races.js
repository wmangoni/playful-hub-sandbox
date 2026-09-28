import { html } from '../core/dom.js';
import { isBlank, signed } from '../core/format.js';
import { ATRIBUTOS, TAMANHOS, canonicalLabel } from './options.js';

function adjustment(value, attribute, tone) {
  const n = Number(value);
  if ((isBlank(value) || n === 0) && isBlank(attribute)) return html`<span class="cell-muted">—</span>`;
  const amount = tone === 'neg' ? -Math.abs(n) : n;
  return html`<span class="adjust"><span class="mod mod--${tone}">${signed(amount)}</span>${isBlank(attribute) ? '' : html` <span class="attr">${attribute}</span>`}</span>`;
}

const adjustmentText = (value, attribute, tone) => {
  const n = Number(value);
  if ((isBlank(value) || n === 0) && isBlank(attribute)) return '';
  return `${tone === 'neg' ? '-' : '+'}${Math.abs(n) || 0} ${attribute || ''}`;
};

function favouredClass(row, ctx) {
  if (row.classe_favorecida == null) return html`<span class="cell-muted">Qualquer uma</span>`;
  const classe = ctx.lookups.classes?.get(String(row.classe_favorecida));
  return classe ? classe.nome : html`<span class="cell-muted" title="Classe removida">#${row.classe_favorecida}</span>`;
}

export default {
  table: 'races',
  slug: 'racas',
  icon: 'shield',
  group: 'compendio',
  lookups: ['classes'],
  names: { singular: 'Raça', plural: 'Raças', newLabel: 'Nova Raça', created: 'Raça criada', updated: 'Raça atualizada', removed: 'Raça excluída' },
  numLinks: 5,
  texts: {
    list: { title: 'Lista de raças D&D 3.5', description: 'Aqui você encontra todas as raças disponíveis para seu personagem!' },
    create: { title: 'Crie sua Raça', description: 'Mas não seja muito apelão, pois o Mestre não gosta!!!' },
    edit: { description: 'Altere os campos necessários para aprimorar esta raça!!!' },
  },
  columns: [
    { key: 'id', label: 'ID', kind: 'id' },
    { key: 'nome', label: 'Nome da Raça', primary: true },
    { key: 'bonus', label: 'Bônus', cell: r => adjustment(r.bonus, r.atributo_bonus, 'pos'), text: r => adjustmentText(r.bonus, r.atributo_bonus, 'pos') },
    { key: 'desvantagem', label: 'Desvantagem', cell: r => adjustment(r.desvantagem, r.atributo_desvantagem, 'neg'), text: r => adjustmentText(r.desvantagem, r.atributo_desvantagem, 'neg') },
    {
      key: 'tamanho',
      label: 'Tamanho',
      cell: r => (isBlank(r.tamanho) ? html`<span class="cell-muted">—</span>` : canonicalLabel(TAMANHOS, r.tamanho)),
      text: r => `${canonicalLabel(TAMANHOS, r.tamanho) ?? ''} ${r.tamanho ?? ''}`,
    },
    {
      key: 'classe_favorecida',
      label: 'Classe Favorecida',
      cell: favouredClass,
      text: (r, ctx) => (r.classe_favorecida == null ? 'Qualquer uma' : ctx.lookups.classes?.get(String(r.classe_favorecida))?.nome || ''),
    },
  ],
  // Mesma ordem do formulário original: Nome, Bônus, Atributo bônus, Desvantagem,
  // Atributo desvantagem, Tamanho, Classe Favorecida.
  sections: [
    {
      fields: [{ name: 'nome', label: 'Nome', type: 'text', required: true, placeholder: 'Nome da Raça', maxLength: 100, span: 6 }],
    },
    {
      title: 'Ajustes de atributo',
      hint: 'Modificadores raciais aplicados aos atributos do personagem.',
      fields: [
        { name: 'bonus', label: 'Bônus', type: 'number', integer: true, placeholder: 'Bônus de atributo', span: 3, spanMd: 4 },
        { name: 'atributo_bonus', label: 'Atributo bônus', type: 'select', options: ATRIBUTOS, emptyLabel: 'Nenhum', span: 3, spanMd: 8, hint: 'Atributo que receberá o bônus.' },
        { name: 'desvantagem', label: 'Desvantagem', type: 'number', integer: true, placeholder: 'Desvantagem da raça', span: 3, spanMd: 4 },
        { name: 'atributo_desvantagem', label: 'Atributo desvantagem', type: 'select', options: ATRIBUTOS, emptyLabel: 'Nenhum', span: 3, spanMd: 8 },
      ],
    },
    {
      title: 'Porte e afinidade',
      fields: [
        { name: 'tamanho', label: 'Tamanho', type: 'select', required: true, options: TAMANHOS, span: 5, spanMd: 5 },
        {
          name: 'classe_favorecida',
          label: 'Classe Favorecida',
          type: 'select',
          required: true,
          valueType: 'int',
          nullOption: 'Qualquer uma',
          options: ctx => ctx.tables.classes.map(c => ({ value: c.id, label: c.nome })),
          span: 7,
          spanMd: 7,
        },
      ],
    },
  ],
};
