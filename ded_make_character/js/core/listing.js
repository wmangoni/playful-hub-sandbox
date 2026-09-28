/**
 * Regras de listagem: busca, ordenação e paginação.
 * A paginação reproduz as regras do CI_Pagination (CodeIgniter 3) usadas pelo
 * sistema original: 20 itens por página e janela de `numLinks` números.
 */
import { normalize } from './format.js';

export const PER_PAGE = 20;

/**
 * Modelo da paginação para a página `current` (1-based) de `pages`.
 * - Nada quando há 1 página ou menos.
 * - Números de start = cur-numLinks>0 ? cur-(numLinks-1) : 1 até min(cur+numLinks, pages).
 * - "Primeira" quando cur > numLinks+1; "Última" quando cur+numLinks < pages.
 * - Anterior quando cur ≠ 1; Próxima quando cur < pages.
 */
export function paginationModel(current, pages, numLinks) {
  if (pages <= 1) return null;
  const cur = Math.min(Math.max(1, current), pages);
  const start = cur - numLinks > 0 ? cur - (numLinks - 1) : 1;
  const end = cur + numLinks < pages ? cur + numLinks : pages;
  const numbers = [];
  for (let n = start; n <= end; n++) numbers.push(n);
  return {
    current: cur,
    pages,
    first: cur > numLinks + 1 ? 1 : null,
    prev: cur !== 1 ? cur - 1 : null,
    numbers,
    next: cur < pages ? cur + 1 : null,
    last: cur + numLinks < pages ? pages : null,
  };
}

/** Texto pesquisável de uma coluna (usa o formatador `text` quando houver). */
export function columnText(column, row, ctx) {
  if (typeof column.text === 'function') return String(column.text(row, ctx) ?? '');
  const value = row[column.key];
  return value == null ? '' : String(value);
}

/** Campos oferecidos no seletor "Filtrar por". */
export function searchFieldsOf(entity) {
  if (entity.searchFields) return entity.searchFields;
  return entity.columns.filter(c => c.searchable !== false && !c.mobileOnly).map(c => ({ key: c.key, label: c.key === 'id' ? 'Id' : c.label }));
}

/** Filtra por "contém", sem diferenciar maiúsculas e acentos. field = 'todos' | chave. */
export function filterRows(rows, { entity, ctx, field = 'todos', term = '' }) {
  const needle = normalize(term);
  if (!needle) return rows;
  const byKey = new Map(entity.columns.map(c => [c.key, c]));
  const fields = searchFieldsOf(entity);
  const searchByKey = new Map(fields.map(f => [f.key, f]));
  const keys = field === 'todos' ? fields.map(f => f.key) : [field];
  const accessors = keys.map(key => {
    const searchField = searchByKey.get(key);
    return searchField?.text ? searchField : byKey.get(key) || searchField || { key };
  });
  return rows.filter(row => accessors.some(col => normalize(columnText(col, row, ctx)).includes(needle)));
}

export function sortRows(rows, entity) {
  const sorted = [...rows];
  if (entity.sort) sorted.sort(entity.sort);
  else sorted.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
  return sorted;
}

export function paginate(rows, page, perPage = PER_PAGE) {
  const pages = Math.max(1, Math.ceil(rows.length / perPage));
  const current = Math.min(Math.max(1, Number(page) || 1), pages);
  const offset = (current - 1) * perPage;
  return { current, pages, offset, items: rows.slice(offset, offset + perPage), total: rows.length };
}
