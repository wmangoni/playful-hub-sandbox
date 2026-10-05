/**
 * Sprite SVG inline (sem dependências externas). Traço 24×24, estilo linha.
 * `icon('swords')` devolve o markup de uso (Raw, seguro para html``);
 * `mountSprite()` injeta os símbolos uma única vez no <body>.
 */
import { raw } from '../core/dom.js';

const ICONS = {
  d20: `<path d="M12 2 20.66 7v10L12 22 3.34 17V7Z"/><path d="M12 7.2 16.9 15.6H7.1Z"/><path d="M12 2v5.2M20.66 7 12 7.2M3.34 7 12 7.2M20.66 7l-3.76 8.6M20.66 17l-3.76-1.4M12 22l4.9-6.4M12 22l-4.9-6.4M3.34 17l3.76-1.4M3.34 7l3.76 8.6"/>`,
  castle: `<path d="M3 21V8h3v2.5h2.5V8h3v2.5H14V8h3v2.5h.5V8H21v13Z"/><path d="M10 21v-3.5a2 2 0 0 1 4 0V21"/><path d="M3 14h18"/>`,
  hero: `<circle cx="12" cy="7.5" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/><path d="M8.2 6.2 12 3.5l3.8 2.7"/>`,
  swords: `<path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6M16 16l4 4M19 21l2-2"/><path d="M14.5 6.5 18 3h3v3l-3.5 3.5"/><path d="m5 14 4 4M7 17l-3 3M3 19l2 2"/>`,
  sparkles: `<path d="M11 3.5 12.9 8.6 18 10.5l-5.1 1.9L11 17.5l-1.9-5.1L4 10.5l5.1-1.9Z"/><path d="M18.5 15v5M16 17.5h5M19 3v3M17.5 4.5h3"/>`,
  book: `<path d="M2.5 4.5h6a3.5 3.5 0 0 1 3.5 3.5v12.5a2.6 2.6 0 0 0-2.6-2.6H2.5Z"/><path d="M21.5 4.5h-6A3.5 3.5 0 0 0 12 8v12.5a2.6 2.6 0 0 1 2.6-2.6h6.9Z"/>`,
  shield: `<path d="M12 21.5s7.5-3.2 7.5-9.5V5.2L12 2.5 4.5 5.2V12c0 6.3 7.5 9.5 7.5 9.5Z"/><path d="m8.5 9.5 3.5 3 3.5-3"/><path d="m8.5 13.5 3.5 3 3.5-3"/>`,
  scroll: `<path d="M8 21h11a2 2 0 0 0 2-2v-1.5H10.5V19a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2.5h4"/><path d="M18.5 17.5V5A2 2 0 0 0 16.5 3h-12"/><path d="M15 8h-4.5M15 12h-4.5"/>`,
  users: `<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>`,
  plus: `<path d="M12 5v14M5 12h14"/>`,
  pencil: `<path d="M16.8 3.7a2.1 2.1 0 0 1 3 3L8.5 18l-4 1 1-4Z"/><path d="m14.5 6 3.5 3.5"/>`,
  trash: `<path d="M3.5 6h17"/><path d="M8.5 6V4.5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5V6"/><path d="M18.5 6 17.7 19.1a2 2 0 0 1-2 1.9H8.3a2 2 0 0 1-2-1.9L5.5 6"/><path d="M10 10.5v6M14 10.5v6"/>`,
  search: `<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.5-4.5"/>`,
  x: `<path d="M18 6 6 18M6 6l12 12"/>`,
  'chevron-left': `<path d="m15 18-6-6 6-6"/>`,
  'chevron-right': `<path d="m9 18 6-6-6-6"/>`,
  'chevrons-left': `<path d="m11 17-5-5 5-5M18 17l-5-5 5-5"/>`,
  'chevrons-right': `<path d="m13 17 5-5-5-5M6 17l5-5-5-5"/>`,
  'chevron-down': `<path d="m6 9 6 6 6-6"/>`,
  menu: `<path d="M4 7h16M4 12h16M4 17h16"/>`,
  restore: `<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>`,
  check: `<path d="M20 6 9 17l-5-5"/>`,
  alert: `<path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>`,
  info: `<circle cx="12" cy="12" r="9"/><path d="M12 16v-4.5M12 8h.01"/>`,
  database: `<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>`,
  'arrow-left': `<path d="M19 12H5M12 19l-7-7 7-7"/>`,
  feather: `<path d="M20.2 12.2A6 6 0 0 0 11.8 3.8L5 10.6V19h8.4Z"/><path d="M16 8 2 22M17.5 15H9"/>`,
  flame: `<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4.1 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3.3a2.5 2.5 0 0 0 2.5 2.8Z"/>`,
  filter: `<path d="M3 5h18l-7 8.5V19l-4 2v-7.5Z"/>`,
  // Arena (TASK_006): coliseu, controles da luta e resultado
  arena: `<path d="M2.5 20.5h19"/><path d="M4 20.5v-9M20 20.5v-9"/><ellipse cx="12" cy="9" rx="9" ry="3.5"/><path d="M8 20.5v-3.5a1.5 1.5 0 0 1 3 0v3.5M13 20.5v-3.5a1.5 1.5 0 0 1 3 0v3.5"/><path d="M4 14.5h16"/>`,
  play: `<path d="M7 4.5v15l12-7.5Z"/>`,
  'step-forward': `<path d="M6 5v14l9.5-7Z"/><path d="M18.5 5v14"/>`,
  'fast-forward': `<path d="M3.5 6v12l8-6Z"/><path d="M12.5 6v12l8-6Z"/>`,
  'skip-forward': `<path d="M3.5 6v12l7-6Z"/><path d="M10.5 6v12l7-6Z"/><path d="M20.5 6v12"/>`,
  copy: `<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3"/>`,
  minus: `<path d="M5 12h14"/>`,
  // Bestiário e card (TASK_010): caveira (menu) e ficha com cabeçalho (botão ao lado do nome)
  skull: `<path d="M12 3a8 8 0 0 0-8 8c0 2.6 1.2 4.2 3 5.4V20h10v-3.6c1.8-1.2 3-2.8 3-5.4a8 8 0 0 0-8-8Z"/><circle cx="9" cy="11.5" r="1.6"/><circle cx="15" cy="11.5" r="1.6"/><path d="M10.5 20v-2.5M13.5 20v-2.5"/>`,
  card: `<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M4 9.5h16"/><path d="M7.5 6.5h4"/><path d="M8 13.5h8M8 17h5"/>`,
  trophy: `<path d="M8 21h8M12 16.5V21"/><path d="M7 3.5h10V9a5 5 0 0 1-10 0Z"/><path d="M7 5.5H4a3 3 0 0 0 3 4.3M17 5.5h3a3 3 0 0 1-3 4.3"/>`,
};

export const ICON_NAMES = Object.keys(ICONS);

/** Gradientes da marca d20, definidos uma única vez para todas as instâncias. */
const BRAND_DEFS = `<defs>
  <linearGradient id="bm-face" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2f20"/><stop offset="1" stop-color="#1b1610"/></linearGradient>
  <linearGradient id="bm-edge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1d796"/><stop offset=".55" stop-color="#d4b26a"/><stop offset="1" stop-color="#8e6d32"/></linearGradient>
</defs>`;

export function mountSprite(doc = document) {
  if (doc.getElementById('dmc-icon-sprite')) return;
  const symbols = Object.entries(ICONS)
    .map(([name, body]) => `<symbol id="i-${name}" viewBox="0 0 24 24">${body}</symbol>`)
    .join('');
  const wrapper = doc.createElement('div');
  wrapper.innerHTML = `<svg id="dmc-icon-sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">${BRAND_DEFS}${symbols}</svg>`;
  doc.body.prepend(wrapper.firstElementChild);
}

export function icon(name, className = '') {
  if (!ICONS[name]) throw new Error(`Ícone desconhecido: ${name}`);
  return raw(`<svg class="icon${className ? ` ${className}` : ''}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`);
}
