/**
 * Domínios fixos usados pelos formulários. Os `value` são exatamente os valores
 * gravados pelo sistema original; os `label` são apenas a apresentação.
 */

export const ATRIBUTOS = [
  { value: 'FOR', label: 'FOR · Força' },
  { value: 'DES', label: 'DES · Destreza' },
  { value: 'CON', label: 'CON · Constituição' },
  { value: 'INT', label: 'INT · Inteligência' },
  { value: 'SAB', label: 'SAB · Sabedoria' },
  { value: 'CAR', label: 'CAR · Carisma' },
];

/** As 11 classes básicas, na ordem das colunas de `pericias` e `bba`. */
export const CLASS_COLUMNS = [
  { key: 'bar', label: 'Bárbaro', abbr: 'Bár' },
  { key: 'bad', label: 'Bardo', abbr: 'Brd' },
  { key: 'cle', label: 'Clérigo', abbr: 'Clé' },
  { key: 'dru', label: 'Druida', abbr: 'Dru' },
  { key: 'gue', label: 'Guerreiro', abbr: 'Gue' },
  { key: 'mon', label: 'Monge', abbr: 'Mon' },
  { key: 'pal', label: 'Paladino', abbr: 'Pal' },
  { key: 'ran', label: 'Ranger', abbr: 'Ran' },
  { key: 'lad', label: 'Ladino', abbr: 'Lad' },
  { key: 'fei', label: 'Feiticeiro', abbr: 'Fei' },
  { key: 'mag', label: 'Mago', abbr: 'Mag' },
];

export const DADOS_DE_VIDA = [4, 6, 8, 10, 12].map(n => ({ value: n, label: `d${n}` }));

export const BBA_TIPOS = [
  { value: 'bom', label: 'Bom' },
  { value: 'medio', label: 'Médio' },
  { value: 'ruim', label: 'Ruim' },
];

export const TIPOS_CLASSE = [
  { value: 'Básica', label: 'Básica' },
  { value: 'Prestígio', label: 'Prestígio' },
  { value: 'Épica', label: 'Épica' },
];

const RES = { fort: 'Fortitude', ref: 'Reflexos', von: 'Vontade' };
export const RESISTENCIAS = ['fort', 'ref', 'von', 'fort/ref', 'fort/von', 'ref/von', 'fort/ref/von'].map(value => ({
  value,
  label: value.split('/').map(part => RES[part]).join(' / '),
}));

export const TAMANHOS = ['Mínimo', 'Minúsculo', 'Pequeno', 'Médio', 'Grande', 'Enorme', 'Imenso', 'Colossal'].map(value => ({ value, label: value }));

/** Tendências gravadas como código de 2 letras (coluna VARCHAR(2) do banco). */
export const TENDENCIAS = [
  { value: 'LB', label: 'Leal e Bom' },
  { value: 'NB', label: 'Neutro e Bom' },
  { value: 'CB', label: 'Caótico e Bom' },
  { value: 'LN', label: 'Leal e Neutro' },
  { value: 'N', label: 'Neutro' },
  { value: 'CN', label: 'Caótico e Neutro' },
  { value: 'LM', label: 'Leal e Mau' },
  { value: 'NM', label: 'Neutro e Mau' },
  { value: 'CM', label: 'Caótico e Mau' },
];

export const SEXOS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Feminino' },
];

export const SIM_NAO = [
  { value: 'S', label: 'Sim' },
  { value: 'N', label: 'Não' },
];

export const labelOf = (options, value) => options.find(o => String(o.value) === String(value))?.label ?? null;

const loose = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** Rótulo da opção equivalente ignorando acentos/caixa (ex.: legado "Medio" → "Médio"). */
export const canonicalLabel = (options, value) =>
  labelOf(options, value) ?? options.find(o => loose(o.value) === loose(value))?.label ?? value;
