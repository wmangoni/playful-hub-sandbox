#!/usr/bin/env node
/**
 * Converte o dump MySQL do projeto legado "D-D-Make-Character" (CodeIgniter)
 * nos arquivos JSON somente-leitura consumidos pelo app (ded_make_character/data).
 *
 * Uso:
 *   node ded_make_character/tools/sql-to-json.js <caminho/para/bkp_07_04_2016.sql>
 *
 * - Lê todos os CREATE TABLE (colunas + AUTO_INCREMENT) e INSERTs do dump.
 * - Corrige nomes de tabela antigos usados nos INSERTs (personagem → personagens,
 *   usuario → usuarios), exatamente como o código PHP os consultava.
 * - Normaliza quebras de linha (\r\n → \n) em campos de texto.
 * - A tabela `usuarios` NÃO é exportada (TASK_003: sem login, o usuário é quem abre
 *   o site). Além disso, o dump contém e-mail real e hash md5 de senha, que nunca
 *   podem ser publicados num site estático.
 * - Talentos (TASK_002): a coluna `pre_requisito_id` (FK para `tipo_requisito`,
 *   sempre vazia no legado) vira o texto `requisitos`, e `requisitos`, `beneficio`,
 *   `normal` e `fonte` são preenchidos a partir de `talentos-enriquecimento.json`
 *   (pesquisa com referências por talento). `tipo_requisito` deixa de ser exportada.
 * - Talentos (TASK_004): os 74 talentos do Livro do Jogador 3.0 (SRD 3.0), de
 *   `talentos-ldj30.json`, entram depois dos do dump, com ids novos. A tabela
 *   passa à versão 3 (as cópias locais antigas recebem o aviso de dados atualizados).
 * - `fichas` (TASK_004): tabela nova e vazia com as escolhas de perícias e talentos
 *   de cada personagem, gravadas pelo app na cópia local.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const TABLE_ALIASES = { personagem: 'personagens', usuario: 'usuarios' };
const OUTPUT_TABLES = ['classes', 'races', 'pericias', 'talentos', 'personagens', 'bba', 'magias'];
const DATA_VERSION = 2;
/** Versão por tabela quando o conteúdo muda só nela (as demais cópias locais não ficam "desatualizadas"). */
const TABLE_VERSION = { talentos: 3 };
const ENRICHMENT_FILE = path.join(__dirname, 'talentos-enriquecimento.json');
const LDJ30_FILE = path.join(__dirname, 'talentos-ldj30.json');
const FICHAS_COLUMNS = ['id', 'personagem_id', 'pericias', 'talentos', 'atualizado_em'];
const TALENTO_COLUMNS = ['id', 'nome', 'tipo', 'requisitos', 'beneficio', 'normal', 'fonte'];

function readStringLiteral(sql, i) {
  // sql[i] === "'"
  const escapes = { n: '\n', r: '\r', t: '\t', 0: '\0', "'": "'", '"': '"', '\\': '\\', Z: '\x1a' };
  let out = '';
  i++;
  while (i < sql.length) {
    const c = sql[i];
    if (c === '\\') {
      const n = sql[i + 1];
      out += escapes[n] !== undefined ? escapes[n] : n;
      i += 2;
    } else if (c === "'" && sql[i + 1] === "'") {
      out += "'";
      i += 2;
    } else if (c === "'") {
      return [out, i + 1];
    } else {
      out += c;
      i++;
    }
  }
  throw new Error('String literal sem fechamento no dump');
}

function readTuple(sql, i) {
  // sql[i] === '('
  const values = [];
  i++;
  for (;;) {
    while (/\s/.test(sql[i])) i++;
    if (sql[i] === "'") {
      const [value, next] = readStringLiteral(sql, i);
      values.push(value);
      i = next;
    } else {
      let j = i;
      while (sql[j] !== ',' && sql[j] !== ')') j++;
      const token = sql.slice(i, j).trim();
      values.push(/^null$/i.test(token) ? null : Number(token));
      i = j;
    }
    while (/\s/.test(sql[i])) i++;
    if (sql[i] === ',') { i++; continue; }
    if (sql[i] === ')') return [values, i + 1];
    throw new Error(`Caractere inesperado "${sql[i]}" na posição ${i}`);
  }
}

function parseSchema(sql) {
  const schema = {};
  const createRe = /CREATE TABLE `(\w+)` \(([\s\S]*?)\n\)\s*ENGINE=\w+(?:\s+AUTO_INCREMENT=(\d+))?/gi;
  let m;
  while ((m = createRe.exec(sql))) {
    const columns = [...m[2].matchAll(/^\s*`(\w+)`\s/gm)].map(c => c[1]);
    schema[m[1]] = { columns, autoIncrement: m[3] ? Number(m[3]) : null };
  }
  return schema;
}

function parseInserts(sql) {
  const rowsByTable = {};
  const insertRe = /insert\s+into\s+`(\w+)`\s*\(([^)]*)\)\s*values\s*/gi;
  let m;
  while ((m = insertRe.exec(sql))) {
    const table = TABLE_ALIASES[m[1]] || m[1];
    const columns = m[2].split(',').map(c => c.trim().replace(/`/g, ''));
    let i = insertRe.lastIndex;
    while (sql[i] === '(') {
      const [values, next] = readTuple(sql, i);
      const row = {};
      columns.forEach((col, k) => {
        const v = values[k];
        row[col] = typeof v === 'string' ? v.replace(/\r\n?/g, '\n') : v;
      });
      (rowsByTable[table] = rowsByTable[table] || []).push(row);
      i = next;
      while (sql[i] === ',' || /\s/.test(sql[i] || '')) i++;
    }
    insertRe.lastIndex = i;
  }
  return rowsByTable;
}

/** Aplica a pesquisa de talentos (por id, conferindo o nome) sobre os dados do dump. */
function enrichTalentos(rows) {
  const enrichment = fs.existsSync(ENRICHMENT_FILE) ? JSON.parse(fs.readFileSync(ENRICHMENT_FILE, 'utf8')) : [];
  const byId = new Map(enrichment.map(e => [e.id, e]));
  let applied = 0;
  const out = rows.map(({ pre_requisito_id: _legacyFk, ...row }) => {
    const info = byId.get(row.id);
    if (info && info.nome !== row.nome) throw new Error(`Enriquecimento: id ${row.id} é "${row.nome}" no dump, mas "${info.nome}" no arquivo`);
    const found = info && info.confianca !== 'nao_encontrado';
    if (found) applied++;
    return {
      id: row.id,
      nome: row.nome,
      tipo: row.tipo,
      requisitos: found ? info.requisitos ?? null : null,
      beneficio: row.beneficio ?? (found ? info.beneficio ?? null : null),
      normal: row.normal ?? (found ? info.normal ?? null : null),
      fonte: found ? info.fonte ?? null : null,
    };
  });
  console.log(`talentos: enriquecimento aplicado em ${applied}/${rows.length}`);
  return out;
}

/** Acrescenta os talentos do Livro do Jogador 3.0 (ids depois do maior id do dump). */
function appendLdj30(rows) {
  if (!fs.existsSync(LDJ30_FILE)) return rows;
  const loose = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const existing = new Set(rows.map(r => loose(r.nome)));
  let next = rows.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0) + 1;
  const added = [];
  for (const f of JSON.parse(fs.readFileSync(LDJ30_FILE, 'utf8'))) {
    if (existing.has(loose(f.nome))) {
      console.warn(`talentos: "${f.nome}" já existe no dump; mantido o do dump`);
      continue;
    }
    added.push({ id: next++, nome: f.nome, tipo: f.tipo ?? null, requisitos: f.requisitos ?? null, beneficio: f.beneficio ?? null, normal: f.normal ?? null, fonte: f.fonte });
  }
  console.log(`talentos: +${added.length} do Livro do Jogador 3.0`);
  return [...rows, ...added];
}

function main() {
  const source = process.argv[2];
  if (!source) {
    console.error('Uso: node ded_make_character/tools/sql-to-json.js <dump.sql>');
    process.exit(1);
  }
  const sql = fs.readFileSync(source, 'utf8');
  const schema = parseSchema(sql);
  const rows = parseInserts(sql);
  rows.talentos = appendLdj30(enrichTalentos(rows.talentos || []));

  const outDir = path.join(__dirname, '..', 'data');
  fs.mkdirSync(outDir, { recursive: true });

  for (const table of OUTPUT_TABLES) {
    const def = schema[table];
    if (!def) throw new Error(`Tabela ${table} não encontrada no dump`);
    const tableRows = (rows[table] || []).sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    const maxId = tableRows.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0);
    const doc = {
      table,
      version: TABLE_VERSION[table] ?? DATA_VERSION,
      source: path.basename(source),
      autoIncrement: Math.max(def.autoIncrement ?? 0, maxId + 1),
      columns: table === 'talentos' ? TALENTO_COLUMNS : def.columns,
      rows: tableRows,
    };
    fs.writeFileSync(path.join(outDir, `${table}.json`), JSON.stringify(doc, null, 2) + '\n', 'utf8');
    console.log(`${table.padEnd(15)} ${String(tableRows.length).padStart(4)} linhas  (AUTO_INCREMENT=${doc.autoIncrement})`);
  }

  const fichas = { table: 'fichas', version: 1, source: 'TASK_004 (tabela nova, sem origem no dump)', autoIncrement: 1, columns: FICHAS_COLUMNS, rows: [] };
  fs.writeFileSync(path.join(outDir, 'fichas.json'), JSON.stringify(fichas, null, 2) + '\n', 'utf8');
  console.log('fichas             0 linhas  (tabela nova)');
}

main();
