/** Ponto de entrada: monta o shell, o store copy-on-write e o roteador. */
import { html, render } from './core/dom.js';
import { createRouter } from './core/router.js';
import { createStore } from './core/store.js';
import { AUX_TABLES, ENTITIES, REFERENCE_TABLES, RETIRED_TABLES, TABLES, entityBySlug } from './entities/index.js';
import { renderForm, renderList } from './pages/crud.js';
import { renderHome } from './pages/home.js';
import { renderSheet } from './pages/sheet.js';
import { confirmDialog } from './ui/dialog.js';
import { icon, mountSprite } from './ui/icons.js';
import { emptyState } from './ui/page.js';
import { renderShell } from './ui/shell.js';
import { toast } from './ui/toast.js';

const APP_NAME = 'D&D Make Character';

function safeLocalStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// Remove cópias locais de tabelas que não existem mais (tipo_requisito na TASK_002, usuarios na TASK_003).
try {
  for (const table of RETIRED_TABLES) window.localStorage.removeItem(`dmc:v1:${table}`);
} catch {
  /* armazenamento indisponível */
}

const store = createStore({
  dataUrl: new URL('../data/', import.meta.url).href,
  tables: [...TABLES, ...REFERENCE_TABLES, ...Object.keys(AUX_TABLES)],
  storage: safeLocalStorage(),
  fetchJson,
});

mountSprite();
const shell = renderShell(document.getElementById('app'));
let cleanup = null;
let firstRender = true;

async function refreshChrome() {
  const counts = {};
  await Promise.all(ENTITIES.map(async e => {
    counts[e.table] = await store.count(e.table).catch(() => null);
  }));
  shell.setCounts(counts);
  const modified = store.modifiedTables();
  const infos = await Promise.all(modified.map(t => store.info(t)));
  shell.setDataStatus({ modified, persistent: store.persistent, outdated: infos.filter(i => i.outdated).map(i => i.table) });
}

function mountPage(title, slug) {
  cleanup?.();
  cleanup = null;
  document.title = title ? `${title} · ${APP_NAME}` : `${APP_NAME} · Forja de Heróis`;
  shell.setActive(slug);
  shell.closeDrawer();
  const page = document.createElement('div');
  page.className = 'page';
  shell.content.replaceChildren(page);
  return page;
}

function focusTitle() {
  if (firstRender) {
    firstRender = false;
    return;
  }
  window.scrollTo({ top: 0, behavior: 'auto' });
  const title = shell.content.querySelector('[data-page-title]');
  (title || shell.content).focus({ preventScroll: true });
}

function renderNotFound() {
  const page = mountPage('Página não encontrada', null);
  render(page, html`<section class="card not-found">${emptyState({
    glyph: 'd20',
    title: 'Esta trilha não leva a lugar algum',
    text: 'A página que você procurou não existe. Talvez um mímico tenha devorado o link.',
    action: html`<a class="btn btn--primary" href="#/">${icon('castle')}Voltar ao início</a>`,
    asPageTitle: true,
  })}</section>`);
  focusTitle();
}

const router = createRouter({
  routes: [
    { name: 'home', pattern: '/' },
    { name: 'list', pattern: '/:module' },
    { name: 'create', pattern: '/:module/novo' },
    { name: 'edit', pattern: '/:module/:id/editar' },
    { name: 'sheet', pattern: '/:module/:id/ficha' },
  ],
  async onRoute({ name, params, query }) {
    if (name === 'home') {
      const page = mountPage(null, 'home');
      await renderHome({ root: page, store });
      focusTitle();
      return;
    }
    const entity = entityBySlug(params.module);
    if (!entity) {
      renderNotFound();
      return;
    }
    if (name === 'sheet') {
      if (!entity.sheet) {
        renderNotFound();
        return;
      }
      const page = mountPage(`Ficha · ${entity.names.plural}`, entity.slug);
      cleanup = await renderSheet({ root: page, store, id: params.id, query, router }) || null;
      focusTitle();
      return;
    }
    if (name === 'list') {
      const page = mountPage(entity.names.plural, entity.slug);
      cleanup = await renderList({ root: page, entity, store, router, query }) || null;
    } else {
      const label = name === 'create' ? entity.names.newLabel : `Editar ${entity.names.singular.toLowerCase()}`;
      const page = mountPage(`${label} · ${entity.names.plural}`, entity.slug);
      cleanup = await renderForm({ root: page, entity, store, router, id: name === 'edit' ? params.id : null }) || null;
    }
    focusTitle();
  },
  onNotFound: renderNotFound,
});

/**
 * Fichas (talentos e perícias escolhidos) sem personagem são apagadas. Isso cobre a exclusão
 * e "Restaurar originais" em Personagens: a restauração volta o AUTO_INCREMENT, e um personagem
 * novo com o id antigo não pode herdar as escolhas de outro.
 */
async function pruneOrphanFichas() {
  if (!store.isModified('fichas')) return;
  const [personagens, fichas] = await Promise.all([store.all('personagens'), store.all('fichas')]);
  const ids = new Set(personagens.map(p => String(p.id)));
  for (const ficha of fichas) {
    if (!ids.has(String(ficha.personagem_id))) await store.remove('fichas', ficha.id);
  }
}

store.subscribe(event => {
  if (event.table === 'personagens' && (event.type === 'restore' || event.type === 'corrupted' || event.change?.op === 'remove')) {
    pruneOrphanFichas().catch(err => console.error(err));
  }
  if (event.type === 'corrupted') {
    toast({ type: 'error', title: 'Cópia local descartada', message: 'Os dados salvos neste navegador estavam corrompidos. Voltamos aos dados originais.' });
  }
  if (event.type === 'external') {
    const onForm = ['create', 'edit'].includes(router.current?.name);
    toast({ type: 'info', title: 'Dados alterados em outra aba', message: onForm ? 'Salve ou cancele este formulário para ver as mudanças.' : 'A tela foi atualizada.' });
    if (!onForm) router.reload();
  }
  refreshChrome();
});

window.addEventListener('storage', event => store.handleExternalChange(event.key));

document.addEventListener('click', async event => {
  if (!event.target.closest('[data-action="restore-all"]')) return;
  const ok = await confirmDialog({
    title: 'Restaurar todos os dados originais?',
    message: 'Todas as alterações salvas neste navegador, em todas as tabelas, serão descartadas.',
    confirmLabel: 'Restaurar tudo',
    tone: 'gold',
    glyph: 'restore',
  });
  if (!ok) return;
  store.restoreAll();
  toast({ type: 'info', title: 'Dados originais restaurados', message: 'Todas as tabelas voltaram ao estado original.' });
  if (!['create', 'edit'].includes(router.current?.name)) router.reload();
});

refreshChrome();
router.start();

// Gancho para testes automatizados (padrão window.__* dos jogos do hub).
window.__dmc = { store, router };
