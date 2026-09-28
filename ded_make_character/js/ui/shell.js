/** Estrutura fixa da aplicação: sidebar (gaveta no celular), topbar e rodapé. */
import { html, raw, render } from '../core/dom.js';
import { ENTITIES, NAV_GROUPS, tableLabel } from '../entities/index.js';
import { icon } from './icons.js';

/** Marca: d20 em ouro com o "20" gravado (gradientes definidos no sprite de ícones). */
export const BRAND_MARK = raw(`<svg class="brand__mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
  <path d="M24 3 42.2 13.5v21L24 45 5.8 34.5v-21Z" fill="url(#bm-face)" stroke="url(#bm-edge)" stroke-width="2" stroke-linejoin="round"/>
  <path d="M24 13.6 34.2 31.2H13.8Z" fill="rgba(212,178,106,.10)" stroke="url(#bm-edge)" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M24 3v10.6M42.2 13.5 24 13.6M5.8 13.5 24 13.6M42.2 13.5l-8 17.7M42.2 34.5l-8-3.3M24 45l10.2-13.8M24 45 13.8 31.2M5.8 34.5l8-3.3M5.8 13.5l8 17.7" fill="none" stroke="url(#bm-edge)" stroke-width="1.1" stroke-linecap="round" opacity=".75"/>
  <text x="24" y="28.6" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-weight="700" font-size="9.5" fill="#ecce88">20</text>
</svg>`);

function brand(extraClass = '') {
  return html`<a class="brand ${extraClass}" href="#/" aria-label="D&amp;D Make Character — início">
    ${BRAND_MARK}
    <span class="brand__text"><span class="brand__name">D&amp;D Make Character</span><span class="brand__tagline">Forja de Heróis · 3ª edição</span></span>
  </a>`;
}

export function renderShell(root) {
  render(root, html`
    <a class="skip-link" href="#conteudo" data-skip>Pular para o conteúdo</a>
    <div class="app" data-drawer="closed">
      <aside class="sidebar" id="menu-lateral" aria-label="Menu principal">
        <div class="sidebar__head">
          ${brand()}
          <button type="button" class="icon-btn sidebar__close" data-action="close-drawer" aria-label="Fechar menu">${icon('x')}</button>
        </div>
        <nav class="nav" aria-label="Módulos">
          <ul class="nav__list">
            <li><a class="nav__link" href="#/" data-nav="home">${icon('castle')}<span>Início</span></a></li>
          </ul>
          ${NAV_GROUPS.map(group => html`<div class="nav__group">
            <p class="nav__group-label" id="nav-${group.key}">${group.label}</p>
            <ul class="nav__list" aria-labelledby="nav-${group.key}">
              ${ENTITIES.filter(e => e.group === group.key).map(e => html`<li>
                <a class="nav__link" href="#/${e.slug}" data-nav="${e.slug}">${icon(e.icon)}<span>${e.names.plural}</span><span class="nav__count" data-count="${e.table}"></span></a>
              </li>`)}
            </ul>
          </div>`)}
        </nav>
        <div class="sidebar__footer">
          <div class="data-status" data-slot="data-status"></div>
          <a class="nav__link nav__link--back" href="/">${icon('arrow-left')}<span>Voltar ao PlayfulHub</span></a>
        </div>
      </aside>
      <div class="scrim" data-action="close-drawer"></div>
      <div class="main">
        <header class="topbar">
          <button type="button" class="icon-btn" data-action="open-drawer" aria-controls="menu-lateral" aria-expanded="false" aria-label="Abrir menu">${icon('menu')}</button>
          ${brand('brand--compact')}
        </header>
        <main id="conteudo" class="content" tabindex="-1"></main>
        <footer class="app-footer">
          <span class="ornament app-footer__ornament" aria-hidden="true"><span class="ornament__gem"></span></span>
          <p>D&amp;D Make Character · migrado do projeto original de 2016 para o <a href="/">PlayfulHub</a> · por William Mangoni</p>
        </footer>
      </div>
    </div>`);

  const app = root.querySelector('.app');
  const sidebar = root.querySelector('.sidebar');
  const main = root.querySelector('.main');
  const opener = root.querySelector('[data-action="open-drawer"]');
  const closer = root.querySelector('.sidebar__close');
  const skip = root.querySelector('[data-skip]');
  const mobile = window.matchMedia('(max-width: 1023.98px)');

  // Gaveta modal no celular: fechada → sidebar inerte; aberta → o conteúdo por trás fica inerte.
  const syncInert = () => {
    const open = app.dataset.drawer === 'open';
    sidebar.toggleAttribute('inert', mobile.matches && !open);
    main.toggleAttribute('inert', mobile.matches && open);
    skip.toggleAttribute('inert', mobile.matches && open);
    sidebar.setAttribute('aria-modal', String(mobile.matches && open));
    if (mobile.matches) sidebar.setAttribute('role', 'dialog');
    else sidebar.removeAttribute('role');
  };

  const setDrawer = open => {
    app.dataset.drawer = open ? 'open' : 'closed';
    opener.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open && mobile.matches ? 'hidden' : '';
    syncInert();
    if (open) closer.focus();
  };

  const closeAndReturn = () => {
    setDrawer(false);
    opener.focus();
  };

  opener.addEventListener('click', () => setDrawer(true));
  closer.addEventListener('click', closeAndReturn);
  root.querySelector('.scrim').addEventListener('click', closeAndReturn);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && app.dataset.drawer === 'open') closeAndReturn();
  });
  mobile.addEventListener('change', () => {
    if (!mobile.matches) setDrawer(false);
    syncInert();
  });
  root.querySelector('[data-skip]').addEventListener('click', event => {
    event.preventDefault();
    root.querySelector('#conteudo').focus();
  });
  syncInert();

  return {
    content: root.querySelector('#conteudo'),
    closeDrawer: () => app.dataset.drawer === 'open' && setDrawer(false),
    setActive(slug) {
      for (const link of root.querySelectorAll('[data-nav]')) {
        if (link.dataset.nav === slug) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
    },
    setCounts(counts) {
      for (const [table, count] of Object.entries(counts)) {
        const el = root.querySelector(`[data-count="${table}"]`);
        if (el) {
          el.textContent = count == null ? '' : count.toLocaleString('pt-BR');
          el.setAttribute('aria-label', count == null ? '' : `${count} registros`);
        }
      }
    },
    setDataStatus({ modified, persistent, outdated }) {
      const slot = root.querySelector('[data-slot="data-status"]');
      const signature = JSON.stringify({ modified, persistent, outdated });
      if (slot.dataset.signature === signature) return;
      slot.dataset.signature = signature;
      const names = modified.map(tableLabel).filter(Boolean);
      if (!persistent) {
        slot.dataset.state = 'volatile';
        render(slot, html`<p class="data-status__row">${icon('alert')}<strong>Armazenamento indisponível</strong></p>
          <p class="data-status__detail">Seu navegador bloqueou o armazenamento local. As alterações valem só enquanto esta página estiver aberta: recarregar ou fechar descarta tudo.</p>`);
        return;
      }
      if (!modified.length) {
        slot.dataset.state = 'original';
        render(slot, html`<p class="data-status__row">${icon('database')}<strong>Dados originais</strong></p>
          <p class="data-status__detail">Somente leitura. Ao criar, editar ou excluir, uma cópia da tabela é salva neste navegador.</p>`);
        return;
      }
      slot.dataset.state = 'local';
      render(slot, html`<p class="data-status__row">${icon('feather')}<strong>Cópia local ativa</strong></p>
        <p class="data-status__detail">${names.length === 1 ? 'Tabela alterada' : `${names.length} tabelas alteradas`}: ${names.join(', ')}.${outdated.length ? ' Os dados originais foram atualizados desde a sua cópia.' : ''}</p>
        <button type="button" class="btn btn--outline btn--sm btn--block" data-action="restore-all">${icon('restore')}Restaurar tudo</button>`);
    },
  };
}
