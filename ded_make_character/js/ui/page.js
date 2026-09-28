/** Blocos de página compartilhados: breadcrumb, cabeçalho e estados vazios. */
import { html } from '../core/dom.js';
import { icon } from './icons.js';

export function breadcrumb(items) {
  return html`<nav aria-label="Trilha de navegação"><ol class="breadcrumb">
    ${items.map((item, i) => html`<li>${item.href && i < items.length - 1 ? html`<a href="${item.href}">${item.label}</a>` : html`<span aria-current="${i === items.length - 1 ? 'page' : 'false'}">${item.label}</span>`}</li>`)}
  </ol></nav>`;
}

export function pageHead({ eyebrow, eyebrowIcon, title, lead, actions, glyph }) {
  return html`<header class="page-head">
    ${glyph ? html`<span class="page-head__glyph" aria-hidden="true">${icon(glyph)}</span>` : ''}
    <div>
      ${eyebrow ? html`<p class="eyebrow">${eyebrowIcon ? icon(eyebrowIcon) : ''}${eyebrow}</p>` : ''}
      <h1 class="page-head__title" tabindex="-1" data-page-title>${title}</h1>
      ${lead ? html`<p class="page-head__lead">${lead}</p>` : ''}
    </div>
    ${actions ? html`<div class="page-head__actions">${actions}</div>` : ''}
  </header>`;
}

export function emptyState({ glyph = 'feather', title, text, action, asPageTitle = false }) {
  return html`<div class="empty">
    <span class="empty__glyph" aria-hidden="true">${icon(glyph)}</span>
    ${asPageTitle
      ? html`<h1 class="empty__title" tabindex="-1" data-page-title>${title}</h1>`
      : html`<h2 class="empty__title">${title}</h2>`}
    ${text ? html`<p class="empty__text">${text}</p>` : ''}
    ${action || ''}
  </div>`;
}

export function loadingState(rows = 6) {
  return html`<section class="card table-card" aria-busy="true" aria-label="Carregando">
    <div class="toolbar"><span class="skeleton" style="width: 320px; height: 40px"></span></div>
    <div class="skeleton-rows">
      ${Array.from({ length: rows }, (_, i) => html`<div class="skeleton-row"><span class="skeleton" style="width: ${40 + ((i * 17) % 45)}%"></span><span class="skeleton" style="width: 12%"></span><span class="skeleton" style="width: 18%"></span></div>`)}
    </div>
  </section>`;
}
