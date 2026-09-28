/** Tabela de dados + paginação a partir das colunas do schema. */
import { html } from '../core/dom.js';
import { buildHash } from '../core/router.js';
import { icon } from './icons.js';

function headerCell(col) {
  const classes = [col.kind === 'num' ? 'num' : '', col.kind === 'center' ? 'center' : '', col.kind === 'id' ? 'col-id' : '', col.desktopOnly ? 'desktop-only' : '', col.mobileOnly ? 'mobile-only' : '', col.className || '']
    .filter(Boolean)
    .join(' ');
  return html`<th scope="col" class="${classes}">${col.title ? html`<abbr title="${col.title}">${col.label}</abbr>` : col.label}</th>`;
}

function bodyCell(col, row, ctx, { expandId, expanded, canExpand }) {
  const classes = [
    col.kind === 'num' ? 'num' : '',
    col.kind === 'center' ? 'center' : '',
    col.kind === 'id' ? 'col-id' : '',
    col.primary ? 'cell-primary' : '',
    col.desktopOnly ? 'desktop-only' : '',
    col.mobileOnly ? 'mobile-only' : '',
    col.className || '',
  ].filter(Boolean).join(' ');

  let content;
  if (col.primary && canExpand) {
    content = html`<button type="button" class="row-toggle" aria-expanded="${expanded ? 'true' : 'false'}" aria-controls="${expandId}">
      <span class="cell-title">${row[col.key]}</span>${icon('chevron-down')}
    </button>`;
  } else if (col.primary) {
    content = html`<span class="cell-title">${row[col.key]}</span>`;
  } else if (typeof col.cell === 'function') {
    content = col.cell(row, ctx);
  } else {
    const value = row[col.key];
    content = value == null || value === '' ? html`<span class="cell-muted">—</span>` : value;
  }
  const label = col.primary || col.kind === 'id' ? null : col.title || col.label;
  return html`<td class="${classes}" ${label ? html`data-label="${label}"` : ''}>${content}</td>`;
}

/** Linhas da tabela. `expandedIds` guarda quais linhas estão abertas. */
export function dataTable({ entity, rows, ctx, editHref, highlightId, expandedIds = new Set() }) {
  const cols = entity.columns;
  const colspan = cols.filter(c => !c.mobileOnly).length + 1;
  return html`<div class="table-wrap">
    <table class="data-table ${entity.tableClass || ''}">
      <caption class="visually-hidden">${entity.names.plural}</caption>
      <thead><tr>${cols.map(headerCell)}<th scope="col" class="col-actions"><span class="visually-hidden">Ações</span></th></tr></thead>
      <tbody>
        ${rows.map(row => {
          const canExpand = Boolean(entity.expand?.when(row));
          const expandId = `row-detail-${entity.table}-${row.id}`;
          const expanded = canExpand && expandedIds.has(String(row.id));
          return html`<tr data-id="${row.id}" class="${String(row.id) === String(highlightId) ? 'is-highlight' : ''}">
              ${cols.map(col => bodyCell(col, row, ctx, { expandId, expanded, canExpand }))}
              <td class="col-actions">
                <span class="row-actions">
                  ${(entity.rowLinks || []).map(link => html`<a class="icon-btn icon-btn--gold" href="${link.href(row)}" aria-label="${link.label} de ${row.nome ?? `#${row.id}`}" title="${link.label}">${icon(link.icon)}</a>`)}
                  <a class="icon-btn" href="${editHref(row)}" aria-label="Editar ${row.nome ?? `#${row.id}`}" title="Editar">${icon('pencil')}</a>
                  <button type="button" class="icon-btn icon-btn--danger" data-action="delete" data-id="${row.id}" aria-label="Excluir ${row.nome ?? `#${row.id}`}" title="Excluir">${icon('trash')}</button>
                </span>
              </td>
            </tr>
            ${canExpand ? html`<tr class="row-detail" id="${expandId}" ${expanded ? '' : 'hidden'}>
              <td colspan="${colspan}"><div class="row-detail__inner">
                <p class="row-detail__label">${entity.expand.label}</p>
                ${entity.expand.content(row, ctx)}
              </div></td>
            </tr>` : ''}`;
        })}
      </tbody>
    </table>
  </div>`;
}

/**
 * Largura mínima (min-content) da tabela com TODOS os registros da entidade.
 * Medida uma vez por conjunto de dados, torna a escolha tabela × cartões
 * independente da página ou da busca atual (sem alternância ao paginar).
 */
export function measureTableWidth(container, markup) {
  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:absolute;left:0;top:0;width:1px;visibility:hidden;pointer-events:none;';
  probe.innerHTML = String(markup);
  container.append(probe);
  const table = probe.querySelector('.data-table');
  table.dataset.stacked = 'false';
  table.style.width = '1px'; // a tabela cresce até o seu min-content
  const min = table.offsetWidth;
  table.style.width = 'max-content';
  const max = table.offsetWidth;
  probe.remove();
  // Limiar confortável: no mínimo absoluto todos os cabeçalhos quebrariam palavra a palavra.
  return Math.round(min + (max - min) * 0.15);
}

/**
 * Mostra a tabela só quando ela cabe inteira na largura disponível; senão usa
 * o modo cartões (nunca há rolagem horizontal escondendo as ações).
 */
export function fitTable(wrap, minWidth) {
  const table = wrap?.querySelector('.data-table');
  if (!table) return;
  const stacked = wrap.clientWidth + 1 < minWidth;
  table.dataset.stacked = stacked ? 'true' : 'false';
  // Rede de segurança: se, apesar do limiar, a tabela não couber (dado atípico,
  // ex.: palavra enorme sem espaços), usa cartões para nunca esconder as ações.
  if (!stacked && table.offsetWidth > wrap.clientWidth + 1) table.dataset.stacked = 'true';
}

/** Paginação no estilo do sistema original (Primeira ‹ 1 2 3 › Última). */
export function paginationNav({ model, path, query, total, offset, count }) {
  const info = html`<p class="pagination__info">Página <strong>${model ? model.current : 1}</strong> de <strong>${model ? model.pages : 1}</strong> · ${offset + 1}–${offset + count} de ${total}</p>`;
  if (!model) return html`<div class="pagination">${info}</div>`;
  const href = page => buildHash(path, { ...query, pagina: page });
  const item = (page, label, { iconName, rel, aria } = {}) => html`<li>${page == null
    ? html`<span class="page-link" aria-disabled="true">${iconName ? icon(iconName) : label}<span class="visually-hidden">${aria || label}</span></span>`
    : html`<a class="page-link" href="${href(page)}" ${rel ? html`rel="${rel}"` : ''} aria-label="${aria || `Página ${label}`}">${iconName ? icon(iconName) : label}</a>`}</li>`;
  return html`<nav class="pagination" aria-label="Paginação">
    ${info}
    <ul class="pagination__list">
      ${model.first ? item(model.first, 'Primeira', { iconName: 'chevrons-left', rel: 'start', aria: 'Primeira página' }) : ''}
      ${item(model.prev, 'Anterior', { iconName: 'chevron-left', rel: 'prev', aria: 'Página anterior' })}
      ${model.numbers.map(n => (n === model.current
        ? html`<li><span class="page-link" aria-current="page">${n}</span></li>`
        : item(n, String(n))))}
      ${item(model.next, 'Próxima', { iconName: 'chevron-right', rel: 'next', aria: 'Próxima página' })}
      ${model.last ? item(model.last, 'Última', { iconName: 'chevrons-right', aria: 'Última página' }) : ''}
    </ul>
  </nav>`;
}
