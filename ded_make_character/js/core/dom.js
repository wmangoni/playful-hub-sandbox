/**
 * Template HTML com escape automático.
 * html`<p>${texto}</p>` escapa as interpolações; use raw() para markup confiável.
 */
export class Raw {
  constructor(value) {
    this.value = String(value);
  }

  toString() {
    return this.value;
  }
}

export const raw = value => new Raw(value);

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(value) {
  return String(value).replace(/[&<>"']/g, ch => ESCAPES[ch]);
}

function renderValue(value) {
  if (value == null || value === false) return '';
  if (value instanceof Raw) return value.value;
  if (Array.isArray(value)) return value.map(renderValue).join('');
  return esc(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += renderValue(values[i]) + strings[i + 1];
  return new Raw(out);
}

/** Substitui o conteúdo de um elemento por um template html``. */
export function render(target, template) {
  target.innerHTML = renderValue(template);
  return target;
}

/** Converte um template em um único elemento. */
export function toElement(template) {
  const tpl = document.createElement('template');
  tpl.innerHTML = renderValue(template).trim();
  return tpl.content.firstElementChild;
}

let uid = 0;
export const nextId = (prefix = 'dmc') => `${prefix}-${++uid}`;

export function debounce(fn, wait = 180) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
