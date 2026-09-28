/** Páginas genéricas de lista e formulário para qualquer entidade do schema. */
import { debounce, html, render } from '../core/dom.js';
import { columnText, filterRows, paginate, paginationModel, PER_PAGE, searchFieldsOf, sortRows } from '../core/listing.js';
import { plural } from '../core/format.js';
import { confirmDialog } from '../ui/dialog.js';
import { bindForm, flattenFields, formSections } from '../ui/form.js';
import { icon } from '../ui/icons.js';
import { breadcrumb, emptyState, loadingState, pageHead } from '../ui/page.js';
import { dataTable, fitTable, measureTableWidth, paginationNav } from '../ui/table.js';
import { toast } from '../ui/toast.js';

const GROUP_LABEL = { aventura: 'Aventura', compendio: 'Compêndio', mesa: 'Mesa' };

/** Limiar tabela × cartões por módulo, por versão dos dados e estado das fontes. */
const tableWidthCache = new Map();

/**
 * Amostra que reproduz a largura da tabela completa: para cada coluna, a linha
 * com o texto mais longo (max-content) e a com a palavra mais longa (min-content).
 * Poucas linhas em vez de todas.
 */
function widestRows(entity, rows, ctx) {
  const picked = new Set();
  const longestWord = text => text.split(/\s+/).reduce((max, word) => Math.max(max, word.length), 0);
  for (const column of entity.columns) {
    let byText = null;
    let byWord = null;
    let textMax = -1;
    let wordMax = -1;
    for (const row of rows) {
      const text = columnText(column, row, ctx);
      if (text.length > textMax) {
        byText = row;
        textMax = text.length;
      }
      const word = longestWord(text);
      if (word > wordMax) {
        byWord = row;
        wordMax = word;
      }
    }
    if (byText) picked.add(byText);
    if (byWord) picked.add(byWord);
  }
  return [...picked];
}
const listPath = entity => `/${entity.slug}`;
const listHref = entity => `#${listPath(entity)}`;

async function loadContext(store, entity, { withOwn = false } = {}) {
  const needed = new Set(entity.lookups || []);
  if (withOwn) needed.add(entity.table);
  const tables = {};
  const lookups = {};
  await Promise.all([...needed].map(async table => {
    const rows = await store.all(table);
    tables[table] = rows;
    lookups[table] = new Map(rows.map(r => [String(r.id), r]));
  }));
  return { tables, lookups };
}

function sourcePill(info) {
  if (info.source === 'local') {
    const when = info.updatedAt ? new Date(info.updatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';
    return html`<span class="source-pill source-pill--local" title="Esta tabela está sendo lida da cópia salva no seu navegador.">${icon('feather')}Cópia local${when ? html` · <span class="source-pill__when">editada em ${when}</span>` : ''}</span>`;
  }
  return html`<span class="source-pill" title="Esta tabela está sendo lida dos dados originais (somente leitura).">${icon('database')}Dados originais</span>`;
}

function errorState(message, retryHref) {
  return html`<section class="card">${emptyState({
    glyph: 'alert',
    title: 'Não foi possível carregar os dados',
    text: message,
    action: html`<a class="btn btn--outline" href="${retryHref}">${icon('restore')}Tentar novamente</a>`,
  })}</section>`;
}

/* ------------------------------------------------------------------------ */
/* Lista                                                                     */
/* ------------------------------------------------------------------------ */
export async function renderList({ root, entity, store, router, query }) {
  const state = {
    page: Number(query.get('pagina')) || 1,
    field: query.get('campo') || 'todos',
    term: query.get('q') || '',
    highlight: query.get('destaque'),
    expanded: new Set(),
  };
  const fields = searchFieldsOf(entity);
  if (state.field !== 'todos' && !fields.some(f => f.key === state.field)) state.field = 'todos';

  render(root, html`
    ${breadcrumb([{ label: 'Início', href: '#/' }, { label: entity.names.plural }])}
    <div data-slot="head">${pageHead({ eyebrow: GROUP_LABEL[entity.group], eyebrowIcon: entity.icon, title: entity.texts.list.title, lead: entity.texts.list.description, glyph: entity.icon })}</div>
    <div data-slot="body">${loadingState()}</div>`);

  let rows;
  let ctx;
  try {
    [rows, ctx] = await Promise.all([store.all(entity.table), loadContext(store, entity)]);
  } catch (err) {
    render(root.querySelector('[data-slot="body"]'), errorState(err.message, listHref(entity)));
    return;
  }
  if (!root.isConnected) return;
  let sorted = sortRows(rows, entity);

  // Ao voltar de um "salvar", abre a página onde o registro está.
  if (state.highlight && !query.get('pagina')) {
    const index = sorted.findIndex(r => String(r.id) === String(state.highlight));
    if (index >= 0) state.page = Math.floor(index / PER_PAGE) + 1;
  }

  const info = await store.info(entity.table);
  const headSlot = root.querySelector('[data-slot="head"]');
  const drawHead = current => render(headSlot, pageHead({
    eyebrow: GROUP_LABEL[entity.group],
    eyebrowIcon: entity.icon,
    title: entity.texts.list.title,
    lead: entity.texts.list.description,
    glyph: entity.icon,
    actions: html`
      ${current.source === 'local' && !current.outdated ? html`<button type="button" class="btn btn--outline" data-action="restore">${icon('restore')}Restaurar originais</button>` : ''}
      <a class="btn btn--primary" href="#/${entity.slug}/novo">${icon('plus')}${entity.names.newLabel}</a>`,
  }));
  drawHead(info);

  const body = root.querySelector('[data-slot="body"]');
  render(body, html`${info.outdated ? html`<div class="notice" role="status">
      ${icon('alert')}
      <p>Os dados originais de <strong>${entity.names.plural}</strong> foram atualizados depois que a sua cópia local foi criada. Você continua vendo a sua cópia; restaure os originais para receber a versão nova.</p>
      <button type="button" class="btn btn--outline btn--sm" data-action="restore">${icon('restore')}Restaurar originais</button>
    </div>` : ''}
    <section class="card table-card">
    <form class="toolbar" role="search" data-search>
      <div class="search">
        <label class="visually-hidden" for="search-field">Filtrar por</label>
        <select class="search__select" id="search-field" name="campo">
          <option value="todos">Todos os campos</option>
          ${fields.map(f => html`<option value="${f.key}" ${f.key === state.field ? 'selected' : ''}>${f.label}</option>`)}
        </select>
        <div class="search__field">
          ${icon('search')}
          <label class="visually-hidden" for="search-term">Termo de busca</label>
          <input class="search__input" id="search-term" name="q" type="search" placeholder="Buscar ${entity.names.plural.toLowerCase()}…" value="${state.term}" autocomplete="off" enterkeyhint="search">
        </div>
        <button type="button" class="icon-btn search__clear" data-action="clear-search" aria-label="Limpar busca" ${state.term ? '' : 'hidden'}>${icon('x')}</button>
      </div>
      <p class="toolbar__meta"><span data-slot="count" aria-live="polite"></span><span data-slot="source">${sourcePill(info)}</span></p>
    </form>
    <div data-slot="results"></div>
  </section>`);

  const results = body.querySelector('[data-slot="results"]');
  // Largura mínima da tabela com todos os registros (ver fitTable), em cache.
  // A chave inclui as tabelas relacionadas: as colunas exibem nomes vindos delas.
  let tableMinWidth = 0;
  const lookupInfos = await Promise.all((entity.lookups || []).map(t => store.info(t)));
  const lookupVersion = lookupInfos.map(i => `${i.table}:${i.source}:${i.updatedAt || ''}:${ctx.tables[i.table]?.length ?? 0}`).join(',');
  let dataVersion = `${info.source}|${info.updatedAt || ''}|${sorted.length}|${lookupVersion}`;
  const measureTable = () => {
    const fontsReady = !document.fonts || document.fonts.status === 'loaded';
    const key = `${entity.table}|${dataVersion}|${fontsReady ? 'fonts' : 'fallback'}`;
    if (!tableWidthCache.has(key)) {
      const sample = widestRows(entity, sorted, ctx);
      tableWidthCache.set(key, sample.length ? measureTableWidth(results, dataTable({ entity, rows: sample, ctx, editHref: () => '#' })) : 0);
    }
    tableMinWidth = tableWidthCache.get(key);
  };
  const countSlot = body.querySelector('[data-slot="count"]');
  const searchForm = body.querySelector('[data-search]');
  const termInput = searchForm.elements.q;
  const clearBtn = searchForm.querySelector('[data-action="clear-search"]');

  function syncQuery() {
    router.replaceQuery({ pagina: state.page, campo: state.field === 'todos' ? '' : state.field, q: state.term });
  }

  function drawResults() {
    const filtered = filterRows(sorted, { entity, ctx, field: state.field, term: state.term });
    const pageData = paginate(filtered, state.page);
    state.page = pageData.current;
    countSlot.textContent = state.term
      ? `${plural(filtered.length, 'resultado', 'resultados')} de ${sorted.length}`
      : plural(sorted.length, 'registro', 'registros');

    if (!sorted.length) {
      render(results, emptyState({
        glyph: entity.icon,
        title: `Nenhum registro em ${entity.names.plural}`,
        text: entity.texts.empty || 'Comece cadastrando o primeiro registro.',
        action: html`<a class="btn btn--primary" href="#/${entity.slug}/novo">${icon('plus')}${entity.names.newLabel}</a>`,
      }));
      return;
    }
    if (!filtered.length) {
      render(results, emptyState({
        glyph: 'search',
        title: 'Nada encontrado',
        text: html`Nenhum registro contém “${state.term}”${state.field !== 'todos' ? html` em <strong>${fields.find(f => f.key === state.field)?.label}</strong>` : ''}.`,
        action: html`<button type="button" class="btn btn--outline" data-action="clear-search">${icon('x')}Limpar busca</button>`,
      }));
      return;
    }
    const model = paginationModel(pageData.current, pageData.pages, entity.numLinks);
    const currentQuery = { campo: state.field === 'todos' ? '' : state.field, q: state.term };
    render(results, html`
      ${dataTable({ entity, rows: pageData.items, ctx, editHref: row => `#/${entity.slug}/${row.id}/editar`, highlightId: state.highlight, expandedIds: state.expanded })}
      ${paginationNav({ model, path: listPath(entity), query: currentQuery, total: filtered.length, offset: pageData.offset, count: pageData.items.length })}`);
    fitTable(results.querySelector('.table-wrap'), tableMinWidth);

    if (state.highlight) {
      const row = results.querySelector(`tr[data-id="${CSS.escape(String(state.highlight))}"]`);
      row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      state.highlight = null;
    }
  }

  const onSearch = debounce(() => {
    state.term = termInput.value.trim();
    state.page = 1;
    clearBtn.hidden = !state.term;
    syncQuery();
    drawResults();
  }, 160);

  termInput.addEventListener('input', onSearch);
  searchForm.addEventListener('submit', event => {
    event.preventDefault();
    onSearch();
  });
  searchForm.elements.campo.addEventListener('change', () => {
    state.field = searchForm.elements.campo.value;
    state.page = 1;
    syncQuery();
    drawResults();
    termInput.focus();
  });

  root.addEventListener('click', async event => {
    const target = event.target.closest('[data-action], .row-toggle');
    if (!target || !root.contains(target)) return;

    if (target.classList.contains('row-toggle')) {
      const detail = document.getElementById(target.getAttribute('aria-controls'));
      const open = target.getAttribute('aria-expanded') !== 'true';
      target.setAttribute('aria-expanded', String(open));
      detail.hidden = !open;
      const id = target.closest('tr').dataset.id;
      if (open) state.expanded.add(id);
      else state.expanded.delete(id);
      return;
    }

    const action = target.dataset.action;
    if (action === 'clear-search') {
      termInput.value = '';
      state.term = '';
      state.page = 1;
      clearBtn.hidden = true;
      syncQuery();
      drawResults();
      termInput.focus();
    } else if (action === 'delete') {
      const row = sorted.find(r => String(r.id) === target.dataset.id);
      if (!row) return;
      const ok = await confirmDialog({
        title: `Excluir ${entity.names.singular.toLowerCase()}?`,
        message: html`<strong>${row.nome ?? `#${row.id}`}</strong> será removido da sua cópia local. Os dados originais continuam intactos e podem ser restaurados a qualquer momento.`,
        confirmLabel: 'Excluir',
      });
      if (!ok) return;
      try {
        const visibleIds = [...results.querySelectorAll('tr[data-id]')].map(tr => tr.dataset.id);
        const position = visibleIds.indexOf(String(row.id));
        await store.remove(entity.table, row.id);
        sorted = sorted.filter(r => String(r.id) !== String(row.id));
        state.expanded.delete(String(row.id));
        const current = await store.info(entity.table);
        dataVersion = `${current.source}|${current.updatedAt || ''}|${sorted.length}|${lookupVersion}`;
        measureTable();
        drawResults();
        drawHead(current);
        render(body.querySelector('[data-slot="source"]'), sourcePill(current));
        // Mantém a posição: foco na linha que ocupou o lugar da excluída (ou na anterior).
        const rowsNow = [...results.querySelectorAll('tr[data-id]')];
        const next = rowsNow[Math.min(position, rowsNow.length - 1)];
        (next?.querySelector('.row-actions a') || headSlot.querySelector('.btn--primary'))?.focus();
        toast({ type: 'success', title: entity.names.removed, message: row.nome ?? `#${row.id}` });
      } catch (err) {
        toast({ type: 'error', title: 'Não foi possível excluir', message: err.message });
      }
    } else if (action === 'restore') {
      const ok = await confirmDialog({
        title: `Restaurar ${entity.names.plural.toLowerCase()}?`,
        message: 'Todas as alterações locais desta tabela serão descartadas e os dados originais voltarão a ser exibidos.',
        confirmLabel: 'Restaurar originais',
        tone: 'gold',
        glyph: 'restore',
      });
      if (!ok) return;
      store.restore(entity.table);
      toast({ type: 'info', title: 'Dados originais restaurados', message: entity.names.plural });
      router.navigate(listPath(entity));
    }
  });

  measureTable();
  drawResults();

  // Reavalia tabela × cartões quando a largura muda; remede quando as fontes carregam.
  let frame = 0;
  const refit = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => fitTable(results.querySelector('.table-wrap'), tableMinWidth));
  };
  window.addEventListener('resize', refit);
  // Só remede se as fontes ainda estavam carregando na primeira medição.
  if (document.fonts && document.fonts.status !== 'loaded') {
    document.fonts.ready.then(() => {
      if (!root.isConnected) return;
      measureTable();
      refit();
    });
  }
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', refit);
  };
}

/* ------------------------------------------------------------------------ */
/* Formulário (criar / editar)                                               */
/* ------------------------------------------------------------------------ */
export async function renderForm({ root, entity, store, router, id }) {
  const mode = id == null ? 'create' : 'edit';
  render(root, html`${loadingState(4)}`);

  let row = null;
  let ctx;
  try {
    [ctx, row] = await Promise.all([loadContext(store, entity, { withOwn: true }), mode === 'edit' ? store.get(entity.table, id) : Promise.resolve(null)]);
  } catch (err) {
    render(root, errorState(err.message, location.hash));
    return undefined;
  }
  if (!root.isConnected) return undefined;

  if (mode === 'edit' && !row) {
    render(root, html`
      ${breadcrumb([{ label: 'Início', href: '#/' }, { label: entity.names.plural, href: listHref(entity) }, { label: 'Não encontrado' }])}
      <section class="card">${emptyState({
        glyph: 'scroll',
        title: 'Registro não encontrado',
        text: html`Não existe ${entity.names.singular.toLowerCase()} com o id <strong>#${id}</strong>. Ele pode ter sido excluído da sua cópia local.`,
        action: html`<a class="btn btn--outline" href="${listHref(entity)}">${icon('arrow-left')}Voltar para ${entity.names.plural}</a>`,
        asPageTitle: true,
      })}</section>`);
    document.title = `Registro não encontrado · ${entity.names.plural} · D&D Make Character`;
    return undefined;
  }

  const initialRow = row || Object.fromEntries(flattenFields(entity).filter(f => f.default !== undefined).map(f => [f.name, f.default]));
  const title = mode === 'create' ? entity.texts.create.title : row.nome ?? `${entity.names.singular} #${row.id}`;
  const lead = mode === 'create' ? entity.texts.create.description : entity.texts.edit.description;

  render(root, html`
    ${breadcrumb([{ label: 'Início', href: '#/' }, { label: entity.names.plural, href: listHref(entity) }, { label: mode === 'create' ? entity.names.newLabel : 'Editar' }])}
    ${pageHead({
      eyebrow: `${entity.names.plural} · ${mode === 'create' ? 'Novo registro' : `Editar #${row.id}`}`,
      eyebrowIcon: mode === 'create' ? 'plus' : 'pencil',
      title,
      lead,
      glyph: entity.icon,
    })}
    <form class="card form-card" novalidate data-entity-form>
      <div class="form-summary" data-visible="false" role="alert" tabindex="-1">
        ${icon('alert')}<div class="form-summary__body"></div>
      </div>
      ${formSections(entity, ctx, initialRow)}
      <div class="form-actions">
        <p class="form-actions__note"><span class="field__req" aria-hidden="true">*</span> Campos obrigatórios</p>
        <a class="btn btn--ghost" href="${listHref(entity)}">Cancelar</a>
        ${entity.sheet && mode === 'edit' ? html`<a class="btn btn--ghost" href="#/${entity.slug}/${row.id}/ficha">${icon('scroll')}Ver ficha</a>` : ''}
        ${entity.sheet
          ? html`<button type="submit" class="btn btn--outline" data-intent="save">${icon('check')}Salvar</button>
             <button type="submit" class="btn btn--primary" data-intent="sheet">${icon('scroll')}Salvar e gerar ficha</button>`
          : html`<button type="submit" class="btn btn--primary">${icon('check')}Salvar</button>`}
      </div>
    </form>`);

  const form = root.querySelector('[data-entity-form]');
  const beforeUnload = event => {
    event.preventDefault();
    event.returnValue = '';
  };

  const formState = bindForm(form, entity, {
    onDirtyChange(dirty) {
      if (!form.isConnected) return;
      if (dirty) {
        router.setGuard(() => confirmDialog({
          title: 'Descartar alterações?',
          message: 'As alterações feitas neste formulário ainda não foram salvas.',
          confirmLabel: 'Descartar',
          cancelLabel: 'Continuar editando',
          glyph: 'alert',
        }));
        window.addEventListener('beforeunload', beforeUnload);
      } else {
        router.clearGuard();
        window.removeEventListener('beforeunload', beforeUnload);
      }
    },
    async onSubmit(values, { intent } = {}) {
      const toSheet = intent === 'sheet' && entity.sheet;
      if (mode === 'edit' && !formState.dirty) {
        // Nada mudou: não grava (e não cria cópia local à toa).
        if (toSheet) {
          router.navigate(`/${entity.slug}/${row.id}/ficha`, { escolher: 1 });
          return;
        }
        toast({ type: 'info', title: 'Nenhuma alteração para salvar', message: row.nome ?? `#${row.id}` });
        router.navigate(listPath(entity), { destaque: row.id });
        return;
      }
      const payload = entity.beforeSave ? entity.beforeSave(values, { mode, row }) : values;
      try {
        const saved = mode === 'create' ? await store.insert(entity.table, payload) : await store.update(entity.table, row.id, payload);
        router.clearGuard();
        window.removeEventListener('beforeunload', beforeUnload);
        toast({ type: 'success', title: mode === 'create' ? entity.names.created : entity.names.updated, message: saved.nome ?? `#${saved.id}` });
        if (toSheet) router.navigate(`/${entity.slug}/${saved.id}/ficha`, { escolher: 1 });
        else router.navigate(listPath(entity), { destaque: saved.id });
      } catch (err) {
        toast({ type: 'error', title: 'Não foi possível salvar', message: err.message });
        throw err;
      }
    },
  });

  return () => {
    router.clearGuard();
    window.removeEventListener('beforeunload', beforeUnload);
  };
}
