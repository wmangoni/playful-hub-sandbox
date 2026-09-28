/**
 * Validação declarativa dos campos de formulário.
 * Cada campo do schema pode declarar: required, minLength, maxLength, email,
 * integer, min, max, before ('today') e validate(valor, valores) → mensagem|null.
 */
import { isBlank, todayISO } from './format.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INTEGER_RE = /^[+-]?\d+$/;
const DECIMAL_RE = /^[+-]?\d+([.,]\d+)?$/;

export const MESSAGES = {
  required: 'Preencha este campo.',
  requiredChoice: 'Selecione uma opção.',
  number: 'Informe um número válido.',
  integer: 'Informe um número inteiro.',
  email: 'Informe um e-mail válido.',
  maxLength: max => `Use no máximo ${max} caracteres.`,
  minLength: min => `Use pelo menos ${min} caracteres.`,
  min: min => `O valor mínimo é ${min}.`,
  max: max => `O valor máximo é ${max}.`,
};

/** Valida um campo. `raw` é o valor como veio do controle (string). */
export function validateField(field, raw, values = {}, { now = new Date() } = {}) {
  const text = typeof raw === 'string' ? raw.trim() : raw;
  const empty = isBlank(text);

  if (field.required && empty) {
    return field.messages?.required || (field.type === 'select' ? MESSAGES.requiredChoice : MESSAGES.required);
  }
  if (empty) return null;

  if (field.type === 'number') {
    const str = String(text);
    if (!DECIMAL_RE.test(str)) return field.messages?.number || MESSAGES.number;
    if (field.integer && !INTEGER_RE.test(str)) return field.messages?.integer || MESSAGES.integer;
    const n = Number(str.replace(',', '.'));
    if (field.min != null && n < field.min) return MESSAGES.min(field.min);
    if (field.max != null && n > field.max) return MESSAGES.max(field.max);
  }

  if (typeof text === 'string') {
    if (field.minLength != null && text.length < field.minLength) return field.messages?.minLength || MESSAGES.minLength(field.minLength);
    if (field.maxLength != null && text.length > field.maxLength) return MESSAGES.maxLength(field.maxLength);
    if (field.email && !EMAIL_RE.test(text)) return field.messages?.email || MESSAGES.email;
    if (field.before === 'today' && !(text < todayISO(now))) return field.messages?.before || 'Informe uma data anterior a hoje.';
  }

  if (typeof field.validate === 'function') return field.validate(text, values) || null;
  return null;
}

/** Valida todos os campos visíveis; devolve { nome: mensagem }. */
export function validateAll(fields, rawValues, options) {
  const errors = {};
  for (const field of fields) {
    if (field.type === 'flags') continue;
    if (field.visibleWhen && !field.visibleWhen(rawValues)) continue;
    const message = validateField(field, rawValues[field.name], rawValues, options);
    if (message) errors[field.name] = message;
  }
  return errors;
}
