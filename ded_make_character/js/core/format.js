/** Formatadores e utilidades de texto usados pelas listas e formulários. */

/** Minúsculas e sem acentos, para busca e comparação tolerante. */
export function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export const isBlank = value => value == null || (typeof value === 'string' && value.trim() === '');

/** "+2", "−2" (sinal de menos tipográfico), "0". */
export function signed(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? '');
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return '0';
}

/** Modificador de atributo de D&D: floor((valor − 10) / 2). */
export function abilityModifier(score) {
  if (isBlank(score) || !/^[+-]?\d+$/.test(String(score).trim())) return null;
  return Math.floor((Number(score) - 10) / 2);
}

/** 'AAAA-MM-DD' → 'DD/MM/AAAA'. Datas zeradas do MySQL ('0000-00-00') viram null. */
export function formatDate(value) {
  if (isBlank(value) || /^0{4}-0{2}-0{2}/.test(value)) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value);
}

export function todayISO(now = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function formatNumber(value, { decimals } = {}) {
  if (isBlank(value)) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString('pt-BR', decimals == null ? undefined : { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function plural(count, singular, pluralForm) {
  return `${count.toLocaleString('pt-BR')} ${count === 1 ? singular : pluralForm}`;
}

export const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
