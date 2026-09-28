import classes from './classes.js';
import personagens from './personagens.js';
import pericias from './pericias.js';
import races from './races.js';
import talentos from './talentos.js';

/** Ordem do menu lateral do sistema original. */
export const ENTITIES = [personagens, classes, talentos, pericias, races];

/** Tabelas que existiram em versões anteriores (cópias locais órfãs são apagadas). */
export const RETIRED_TABLES = ['tipo_requisito', 'usuarios'];

export const NAV_GROUPS = [
  { key: 'aventura', label: 'Aventura' },
  { key: 'compendio', label: 'Compêndio' },
];

export const TABLES = ENTITIES.map(e => e.table);

/** Tabelas de referência (somente leitura, sem tela própria) usadas pela ficha. */
export const REFERENCE_TABLES = ['bba'];

/** Tabelas sem CRUD próprio que o app grava (copy-on-write, como as demais), com o rótulo do status de dados. */
export const AUX_TABLES = { fichas: 'Fichas (talentos e perícias escolhidos)' };

export const entityBySlug = slug => ENTITIES.find(e => e.slug === slug) || null;
export const entityByTable = table => ENTITIES.find(e => e.table === table) || null;
export const tableLabel = table => entityByTable(table)?.names.plural || AUX_TABLES[table] || null;
