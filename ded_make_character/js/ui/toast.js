import { html, toElement } from '../core/dom.js';
import { icon } from './icons.js';

const ICON_BY_TYPE = { success: 'check', error: 'alert', info: 'info' };
const MAX_VISIBLE = 3;
let container;
let politeRegion;
let alertRegion;

function regions() {
  if (!container) {
    container = document.createElement('div');
    container.className = 'toasts';
    politeRegion = document.createElement('div');
    politeRegion.setAttribute('aria-live', 'polite');
    politeRegion.setAttribute('aria-atomic', 'false');
    politeRegion.style.display = 'contents';
    alertRegion = document.createElement('div');
    alertRegion.setAttribute('role', 'alert');
    alertRegion.style.display = 'contents';
    container.append(alertRegion, politeRegion);
    document.body.append(container);
  }
  return { politeRegion, alertRegion };
}

function dismiss(node) {
  if (!node.isConnected || node.classList.contains('is-leaving')) return;
  node.classList.add('is-leaving');
  const remove = () => node.remove();
  node.addEventListener('animationend', remove, { once: true });
  setTimeout(remove, 400);
}

/** Temporizador que pausa enquanto o mouse ou o foco estão sobre o toast. */
function autoDismiss(node, ttl) {
  let remaining = ttl;
  let started = 0;
  let timer = null;
  const start = () => {
    started = Date.now();
    timer = setTimeout(() => dismiss(node), remaining);
  };
  const pause = () => {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
    remaining = Math.max(800, remaining - (Date.now() - started));
  };
  node.addEventListener('mouseenter', pause);
  node.addEventListener('focusin', pause);
  node.addEventListener('mouseleave', () => { if (!timer && !node.contains(document.activeElement)) start(); });
  node.addEventListener('focusout', () => { if (!timer && !node.matches(':hover')) start(); });
  start();
}

/** Exibe uma notificação curta. type: success | error | info. */
export function toast({ type = 'success', title, message = '', timeout } = {}) {
  const { politeRegion: polite, alertRegion: alert } = regions();
  const node = toElement(html`
    <div class="toast toast--${type}">
      ${icon(ICON_BY_TYPE[type] || 'info')}
      <p class="toast__text">${title ? html`<strong class="toast__title">${title}</strong>` : ''}${message}</p>
      <button type="button" class="icon-btn toast__close" aria-label="Fechar notificação">${icon('x')}</button>
    </div>`);
  node.querySelector('.toast__close').addEventListener('click', () => dismiss(node));
  (type === 'error' ? alert : polite).append(node);

  const visible = [...container.querySelectorAll('.toast:not(.is-leaving)')];
  visible.slice(0, Math.max(0, visible.length - MAX_VISIBLE)).forEach(dismiss);

  const ttl = timeout ?? (type === 'error' ? 7000 : 4200);
  if (ttl > 0) autoDismiss(node, ttl);
  return node;
}
