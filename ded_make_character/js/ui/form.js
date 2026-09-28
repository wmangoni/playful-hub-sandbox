/**
 * Renderizador genérico de formulários a partir do schema da entidade.
 * Responsável por: controles, preservação de valores legados em selects,
 * leitura/coerção dos valores, validação inline e campos condicionais.
 */
import { html, nextId } from '../core/dom.js';
import { abilityModifier, isBlank, normalize, signed } from '../core/format.js';
import { validateAll, validateField } from '../core/validation.js';
import { icon } from './icons.js';

const NULL_VALUE = '__null__';

export const flattenFields = entity => entity.sections.flatMap(section => section.fields);

/** Resolve opções (estáticas ou dependentes do contexto) e preserva valores legados. */
function resolveOptions(field, ctx, current) {
  const base = typeof field.options === 'function' ? field.options(ctx) : field.options || [];
  const options = base.map(o => ({ value: o.value, label: o.label }));
  let selected = null;

  if (current === null && field.nullOption) selected = NULL_VALUE;
  else if (current != null && current !== '') {
    const exact = options.find(o => String(o.value) === String(current));
    if (exact) selected = String(exact.value);
    else {
      const loose = options.find(o => normalize(o.value) === normalize(current) || normalize(o.label) === normalize(current));
      if (loose) selected = String(loose.value);
      else {
        options.push({ value: current, label: `${current} (valor legado)`, legacy: true });
        selected = String(current);
      }
    }
  }
  return { options, selected };
}

function controlFor(field, ctx, value, ids) {
  const common = {
    id: ids.control,
    name: field.name,
    describedBy: [field.hint ? ids.hint : null, ids.error].filter(Boolean).join(' '),
  };

  if (field.type === 'select') {
    const { options, selected } = resolveOptions(field, ctx, value);
    const placeholder = field.required ? 'Selecione…' : field.emptyLabel || 'Nenhum';
    return html`<select class="select" id="${common.id}" name="${common.name}" aria-describedby="${common.describedBy}" ${field.required ? html`required aria-required="true"` : ''}>
      <option value="" ${selected == null ? 'selected' : ''} ${field.required ? 'disabled' : ''}>${placeholder}</option>
      ${field.nullOption ? html`<option value="${NULL_VALUE}" ${selected === NULL_VALUE ? 'selected' : ''}>${field.nullOption}</option>` : ''}
      ${options.map(o => html`<option value="${o.value}" ${String(o.value) === selected ? 'selected' : ''}>${o.label}</option>`)}
    </select>`;
  }

  if (field.type === 'textarea') {
    return html`<textarea class="textarea ${field.rows && field.rows < 5 ? 'textarea--short' : ''}" id="${common.id}" name="${common.name}" rows="${field.rows || 5}" placeholder="${field.placeholder || ''}" aria-describedby="${common.describedBy}" ${field.maxLength ? html`maxlength="${field.maxLength}"` : ''} ${field.required ? html`required aria-required="true"` : ''}>${value ?? ''}</textarea>`;
  }

  const type = field.type === 'number' ? 'text' : field.type;
  const suggestions = typeof field.suggestions === 'function' ? field.suggestions(ctx) : null;
  const listId = suggestions?.length ? `${common.id}-list` : null;
  const numeric = field.type === 'number';
  const inputMode = numeric ? (field.integer ? 'numeric' : 'decimal') : null;
  const decimals = field.step && String(field.step).includes('.') ? String(field.step).split('.')[1].length : null;
  const displayValue = value == null || value === ''
    ? ''
    : numeric && !field.integer
      ? (decimals != null && Number.isFinite(Number(value)) ? Number(value).toFixed(decimals) : String(value)).replace('.', ',')
      : value;

  return html`<input class="input" id="${common.id}" name="${common.name}" type="${type}" value="${displayValue}" ${type === 'date' ? html`data-empty="${displayValue === '' ? 'true' : 'false'}"` : ''}
      placeholder="${field.placeholder || ''}" aria-describedby="${common.describedBy}" autocomplete="off"
      ${inputMode ? html`inputmode="${inputMode}"` : ''}
      ${numeric ? html`data-numeric="${field.integer ? 'int' : 'float'}"` : ''}
      ${field.maxLength ? html`maxlength="${field.maxLength}"` : ''}
      ${listId ? html`list="${listId}"` : ''}
      ${field.required ? html`required aria-required="true"` : ''}>
    ${listId ? html`<datalist id="${listId}">${suggestions.map(s => html`<option value="${s}"></option>`)}</datalist>` : ''}`;
}

function flagsField(field, row) {
  return html`<fieldset class="field field--12 flags" data-field="${field.name}">
    <legend class="visually-hidden">${field.label || 'Opções'}</legend>
    <div class="check-grid">
      ${field.items.map(item => html`<label class="check">
        <input type="checkbox" name="${item.name}" value="1" ${Number(row?.[item.name]) === 1 ? 'checked' : ''}>
        <span class="check__box">${icon('check')}</span>
        <span>${item.label}</span>
      </label>`)}
    </div>
  </fieldset>`;
}

function fieldBlock(field, ctx, row) {
  if (field.type === 'flags') return flagsField(field, row);
  const base = nextId('f');
  const ids = { control: `${base}-${field.name}`, hint: `${base}-hint`, error: `${base}-err` };
  const value = row ? row[field.name] : undefined;
  const modifier = field.modifier ? abilityModifier(value) : null;
  const hidden = field.visibleWhen && !field.visibleWhen(row || {});
  return html`<div class="field field--${field.span || 12}" data-field="${field.name}" ${field.spanMd ? html`data-span-md="${field.spanMd}"` : ''} ${field.visibleWhen ? 'data-conditional' : ''} ${hidden ? 'hidden' : ''}>
    <label class="field__label" for="${ids.control}">${field.label}${field.required ? html`<span class="field__req" aria-hidden="true">*</span>` : ''}</label>
    ${controlFor(field, ctx, value, ids)}
    ${field.modifier ? html`<p class="field__hint field__mod" id="${ids.hint}" aria-live="polite">${modifier == null ? 'Modificador —' : html`Modificador <strong class="mod ${modifier > 0 ? 'mod--pos' : modifier < 0 ? 'mod--neg' : ''}">${signed(modifier)}</strong>`}</p>` : ''}
    ${field.hint && !field.modifier ? html`<p class="field__hint" id="${ids.hint}">${field.hint}</p>` : ''}
    <p class="field__error" id="${ids.error}">${icon('alert')}<span></span></p>
  </div>`;
}

/** Markup das seções do formulário. */
export function formSections(entity, ctx, row) {
  return entity.sections.map(section => html`<fieldset class="form-section">
    ${section.title ? html`<legend class="form-section__title"><span class="ornament__gem" aria-hidden="true"></span>${section.title}</legend>` : ''}
    ${section.hint ? html`<p class="form-section__hint">${section.hint}</p>` : ''}
    <div class="form-grid">${section.fields.map(field => fieldBlock(field, ctx, row))}</div>
  </fieldset>`);
}

/** Lê os valores crus (strings) do formulário, incluindo flags como '1'/'0'. */
export function readRaw(form, fields) {
  const raw = {};
  for (const field of fields) {
    if (field.type === 'flags') {
      for (const item of field.items) raw[item.name] = form.elements[item.name]?.checked ? '1' : '0';
    } else {
      const el = form.elements[field.name];
      raw[field.name] = el ? el.value : '';
    }
  }
  return raw;
}

/** Converte os valores crus nos tipos gravados no banco. */
export function coerce(fields, raw) {
  const out = {};
  for (const field of fields) {
    if (field.type === 'flags') {
      for (const item of field.items) out[item.name] = raw[item.name] === '1' ? 1 : 0;
      continue;
    }
    const value = typeof raw[field.name] === 'string' ? raw[field.name].trim() : raw[field.name];
    if (isBlank(value) || value === NULL_VALUE) {
      out[field.name] = null;
    } else if (field.type === 'number') {
      out[field.name] = Number(String(value).replace(',', '.'));
    } else if (field.type === 'select' && (field.valueType === 'int' || field.valueType === 'float')) {
      const n = Number(value);
      out[field.name] = Number.isFinite(n) ? n : value; // valor legado não numérico é preservado
    } else if (field.type === 'textarea') {
      out[field.name] = String(raw[field.name]).replace(/\s+$/, '');
    } else {
      out[field.name] = value;
    }
  }
  return out;
}

function setFieldError(form, name, message) {
  const wrapper = form.querySelector(`[data-field="${CSS.escape(name)}"]`);
  if (!wrapper) return;
  const control = wrapper.querySelector('input, select, textarea');
  wrapper.dataset.invalid = message ? 'true' : 'false';
  wrapper.querySelector('.field__error span').textContent = message || '';
  if (control) control.setAttribute('aria-invalid', message ? 'true' : 'false');
}

/**
 * Liga o comportamento do formulário: validação ao sair do campo e após a
 * primeira tentativa de envio, campos condicionais, modificadores e "sujo".
 */
export function bindForm(form, entity, { onSubmit, onDirtyChange }) {
  const fields = flattenFields(entity);
  const byName = new Map(fields.map(f => [f.name, f]));
  const touched = new Set();
  let attempted = false;
  let submitted = false;
  const initial = JSON.stringify(readRaw(form, fields));
  let dirty = false;

  const summary = form.querySelector('.form-summary');

  function applyConditionals() {
    const raw = readRaw(form, fields);
    for (const field of fields) {
      if (!field.visibleWhen) continue;
      const wrapper = form.querySelector(`[data-field="${CSS.escape(field.name)}"]`);
      const visible = Boolean(field.visibleWhen(raw));
      if (visible === !wrapper.hidden) continue;
      wrapper.hidden = !visible;
      if (visible) {
        wrapper.classList.remove('is-revealed');
        void wrapper.offsetWidth; // reinicia a animação
        wrapper.classList.add('is-revealed');
      } else {
        setFieldError(form, field.name, null);
      }
    }
  }

  function updateModifier(field) {
    if (!field?.modifier) return;
    const wrapper = form.querySelector(`[data-field="${CSS.escape(field.name)}"]`);
    const mod = abilityModifier(form.elements[field.name].value.trim());
    const hint = wrapper.querySelector('.field__mod');
    hint.innerHTML = String(mod == null ? 'Modificador —' : html`Modificador <strong class="mod ${mod > 0 ? 'mod--pos' : mod < 0 ? 'mod--neg' : ''}">${signed(mod)}</strong>`);
  }

  function validateOne(name) {
    const field = byName.get(name);
    if (!field || field.type === 'flags') return null;
    const wrapper = form.querySelector(`[data-field="${CSS.escape(name)}"]`);
    if (wrapper?.hidden) return null;
    const raw = readRaw(form, fields);
    const message = validateField(field, raw[name], raw);
    setFieldError(form, name, message);
    return message;
  }

  function showSummary(errors) {
    const entries = Object.entries(errors);
    if (!summary) return;
    if (!entries.length) {
      summary.dataset.visible = 'false';
      return;
    }
    const list = entries.map(([name]) => {
      const control = form.elements[name];
      return html`<li><a href="#${control?.id || ''}" data-focus="${control?.id || ''}">${byName.get(name).label}</a></li>`;
    });
    summary.querySelector('.form-summary__body').innerHTML = String(html`<strong>${entries.length === 1 ? 'Revise o campo destacado.' : `Revise os ${entries.length} campos destacados.`}</strong><ul>${list}</ul>`);
    summary.dataset.visible = 'true';
  }

  function refreshDirty() {
    // Eventos disparados durante a desmontagem (ex.: change ao remover o foco) são ignorados.
    if (submitted || !form.isConnected) return;
    const now = JSON.stringify(readRaw(form, fields)) !== initial;
    if (now !== dirty) {
      dirty = now;
      onDirtyChange?.(dirty);
    }
  }

  form.addEventListener('input', event => {
    if (event.target.type === 'date') event.target.dataset.empty = String(event.target.value === '');
    const name = event.target.name;
    if (byName.has(name)) {
      updateModifier(byName.get(name));
      if (attempted || touched.has(name)) validateOne(name);
    }
    applyConditionals();
    refreshDirty();
  });

  form.addEventListener('change', event => {
    const name = event.target.name;
    if (byName.has(name) && (attempted || event.target.tagName === 'SELECT')) {
      touched.add(name);
      validateOne(name);
    }
    applyConditionals();
    refreshDirty();
  });

  form.addEventListener('focusout', event => {
    const name = event.target.name;
    if (!byName.has(name)) return;
    // Só valida ao sair se o usuário digitou algo (evita erro ao apenas tabular).
    if (event.target.value !== '' || attempted) {
      touched.add(name);
      validateOne(name);
    }
  });

  summary?.addEventListener('click', event => {
    const link = event.target.closest('[data-focus]');
    if (!link) return;
    event.preventDefault();
    document.getElementById(link.dataset.focus)?.focus();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    attempted = true;
    const raw = readRaw(form, fields);
    const visibleFields = fields.filter(f => {
      const wrapper = form.querySelector(`[data-field="${CSS.escape(f.name)}"]`);
      return !wrapper?.hidden;
    });
    const errors = validateAll(visibleFields, raw);
    for (const field of fields) if (field.type !== 'flags') setFieldError(form, field.name, errors[field.name] || null);
    showSummary(errors);
    const firstInvalid = Object.keys(errors)[0];
    if (firstInvalid) {
      form.elements[firstInvalid]?.focus();
      return;
    }
    const buttons = [...form.querySelectorAll('[type="submit"]')];
    const submit = event.submitter && buttons.includes(event.submitter) ? event.submitter : buttons[0];
    buttons.forEach(button => { button.disabled = true; });
    submit.setAttribute('aria-busy', 'true');
    try {
      await onSubmit(coerce(fields, raw), { intent: submit.dataset.intent || 'save' });
      submitted = true;
      dirty = false;
      onDirtyChange?.(false);
    } catch {
      // O chamador já informou o erro ao usuário; o formulário continua editável.
    } finally {
      buttons.forEach(button => { if (button.isConnected) button.disabled = false; });
      if (submit.isConnected) submit.removeAttribute('aria-busy');
    }
  });

  applyConditionals();
  return {
    get dirty() {
      return dirty;
    },
  };
}
