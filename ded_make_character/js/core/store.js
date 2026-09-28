/**
 * DataStore "copy-on-write".
 *
 * Os dados originais (migrados do MySQL legado) vivem em arquivos JSON
 * somente-leitura em `data/<tabela>.json`. Enquanto o usuário apenas consulta,
 * tudo é lido desses arquivos. Na PRIMEIRA escrita (inserir, editar ou excluir)
 * em uma tabela, o JSON original daquela tabela é copiado para o localStorage e
 * a alteração é aplicada nessa cópia. A partir daí, a tabela passa a ser lida da
 * cópia local. Os arquivos originais do servidor nunca são alterados, e o
 * usuário pode restaurar os dados originais a qualquer momento.
 *
 * Formato de cada JSON original:
 *   { table, version, source, autoIncrement, columns: [...], rows: [...] }
 * Formato da cópia local (chave `<namespace>:v1:<tabela>`):
 *   { table, seedVersion, autoIncrement, copiedAt, updatedAt, rows: [...] }
 *
 * O contador `autoIncrement` imita o AUTO_INCREMENT do MySQL: ids excluídos
 * nunca são reaproveitados.
 */

const STORAGE_SCHEMA = 'v1';

export class StoreError extends Error {
  constructor(message, { cause, code } = {}) {
    super(message);
    this.name = 'StoreError';
    this.code = code || 'STORE_ERROR';
    if (cause) this.cause = cause;
  }
}

const clone = value => (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

export function createStore({ dataUrl, tables, storage, fetchJson, namespace = 'dmc', now = () => new Date() }) {
  const originals = new Map(); // tabela -> Promise<doc original>
  const listeners = new Set();
  const storageAvailable = probeStorage(storage);
  const volatile = new Map(); // fallback em memória quando o localStorage não está disponível
  let writeQueue = Promise.resolve();

  /** Serializa as escritas: evita que duas operações partam do mesmo rascunho. */
  function serial(task) {
    const run = writeQueue.then(task);
    writeQueue = run.catch(() => {});
    return run;
  }

  const keyOf = table => `${namespace}:${STORAGE_SCHEMA}:${table}`;

  function assertTable(table) {
    if (!tables.includes(table)) throw new StoreError(`Tabela desconhecida: ${table}`, { code: 'UNKNOWN_TABLE' });
  }

  function emit(event) {
    for (const listener of listeners) {
      try { listener(event); } catch (err) { console.error(err); }
    }
  }

  function loadOriginal(table) {
    if (!originals.has(table)) {
      const url = new URL(`${table}.json`, dataUrl).href;
      const pending = Promise.resolve()
        .then(() => fetchJson(url))
        .then(doc => {
          if (!doc || !Array.isArray(doc.rows)) throw new Error('JSON sem a lista "rows"');
          return doc;
        })
        .catch(cause => {
          originals.delete(table);
          throw new StoreError(`Não foi possível carregar os dados de "${table}".`, { cause, code: 'LOAD_FAILED' });
        });
      originals.set(table, pending);
    }
    return originals.get(table);
  }

  function readLocal(table) {
    if (!storageAvailable) return volatile.get(table) || null;
    let raw;
    try {
      raw = storage.getItem(keyOf(table));
    } catch {
      return null;
    }
    if (raw == null) return null;
    try {
      const copy = JSON.parse(raw);
      if (!copy || !Array.isArray(copy.rows)) throw new Error('formato inválido');
      return copy;
    } catch (cause) {
      // Cópia corrompida: descarta e volta a usar o original, avisando a UI.
      try { storage.removeItem(keyOf(table)); } catch { /* ignora */ }
      emit({ type: 'corrupted', table });
      console.warn(`[store] cópia local de "${table}" estava corrompida e foi descartada`, cause);
      return null;
    }
  }

  function writeLocal(table, copy) {
    if (!storageAvailable) {
      volatile.set(table, copy);
      return;
    }
    try {
      storage.setItem(keyOf(table), JSON.stringify(copy));
    } catch (cause) {
      throw new StoreError('O armazenamento local do navegador está cheio ou indisponível. A alteração não foi salva.', { cause, code: 'WRITE_FAILED' });
    }
  }

  async function snapshot(table) {
    assertTable(table);
    const local = readLocal(table);
    if (local) return { rows: local.rows, source: 'local', copy: local };
    const original = await loadOriginal(table);
    return { rows: original.rows, source: 'original', copy: null };
  }

  /** Garante a cópia local (copy-on-write) e devolve um rascunho mutável dela. */
  async function draftOf(table) {
    const local = readLocal(table);
    if (local) return clone(local);
    const original = await loadOriginal(table);
    const maxId = original.rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0);
    const stamp = now().toISOString();
    return {
      table,
      seedVersion: original.version ?? 1,
      autoIncrement: Math.max(Number(original.autoIncrement) || 0, maxId + 1),
      copiedAt: stamp,
      updatedAt: stamp,
      rows: clone(original.rows),
    };
  }

  async function commit(table, draft, change) {
    const firstCopy = !readLocal(table);
    draft.updatedAt = now().toISOString();
    writeLocal(table, draft); // lança StoreError sem alterar nada se falhar
    emit({ type: 'change', table, change, firstCopy });
  }

  function findIndex(rows, id) {
    const target = String(id);
    return rows.findIndex(row => String(row.id) === target);
  }

  async function insertRow(table, values) {
    const draft = await draftOf(table);
    const { id: _ignored, ...rest } = values;
    const row = { id: draft.autoIncrement, ...rest };
    draft.autoIncrement += 1;
    draft.rows.push(row);
    await commit(table, draft, { op: 'insert', id: row.id });
    return clone(row);
  }

  async function updateRow(table, id, values) {
    const draft = await draftOf(table);
    const index = findIndex(draft.rows, id);
    if (index === -1) throw new StoreError('Registro não encontrado. Ele pode ter sido excluído.', { code: 'NOT_FOUND' });
    const { id: _ignored, ...rest } = values;
    draft.rows[index] = { ...draft.rows[index], ...rest };
    await commit(table, draft, { op: 'update', id: draft.rows[index].id });
    return clone(draft.rows[index]);
  }

  async function removeRow(table, id) {
    const draft = await draftOf(table);
    const index = findIndex(draft.rows, id);
    if (index === -1) throw new StoreError('Registro não encontrado. Ele pode já ter sido excluído.', { code: 'NOT_FOUND' });
    const [removed] = draft.rows.splice(index, 1);
    await commit(table, draft, { op: 'remove', id: removed.id });
    return clone(removed);
  }

  return {
    tables: [...tables],

    get persistent() { return storageAvailable; },

    /** Todas as linhas (cópias defensivas), vindas da cópia local se existir. */
    async all(table) {
      const { rows } = await snapshot(table);
      return clone(rows);
    },

    async get(table, id) {
      const { rows } = await snapshot(table);
      const row = rows[findIndex(rows, id)];
      return row ? clone(row) : null;
    },

    async count(table) {
      const { rows } = await snapshot(table);
      return rows.length;
    },

    /** Insere uma linha nova com id auto-incrementado. Devolve a linha gravada. */
    insert(table, values) {
      assertTable(table);
      return serial(() => insertRow(table, values));
    },

    /** Atualiza (merge) os campos informados da linha `id`. */
    update(table, id, values) {
      assertTable(table);
      return serial(() => updateRow(table, id, values));
    },

    remove(table, id) {
      assertTable(table);
      return serial(() => removeRow(table, id));
    },

    /** Metadados da tabela: origem dos dados e datas da cópia local. */
    async info(table) {
      assertTable(table);
      const local = readLocal(table);
      const original = await loadOriginal(table).catch(() => null);
      return {
        table,
        source: local ? 'local' : 'original',
        copiedAt: local?.copiedAt ?? null,
        updatedAt: local?.updatedAt ?? null,
        outdated: Boolean(local && original && (original.version ?? 1) !== local.seedVersion),
      };
    },

    isModified(table) {
      assertTable(table);
      return Boolean(readLocal(table));
    },

    modifiedTables() {
      return tables.filter(table => Boolean(readLocal(table)));
    },

    /** Descarta a cópia local de uma tabela, voltando aos dados originais. */
    restore(table) {
      assertTable(table);
      if (storageAvailable) {
        try { storage.removeItem(keyOf(table)); } catch { /* ignora */ }
      } else {
        volatile.delete(table);
      }
      emit({ type: 'restore', table });
    },

    restoreAll() {
      for (const table of tables) {
        if (storageAvailable) {
          try { storage.removeItem(keyOf(table)); } catch { /* ignora */ }
        } else {
          volatile.delete(table);
        }
      }
      emit({ type: 'restore', table: null });
    },

    /** Notifica mudanças feitas em outra aba (evento `storage` do navegador). */
    handleExternalChange(key) {
      const prefix = `${namespace}:${STORAGE_SCHEMA}:`;
      if (key === null) {
        emit({ type: 'external', table: null });
      } else if (typeof key === 'string' && key.startsWith(prefix)) {
        const table = key.slice(prefix.length);
        if (tables.includes(table)) emit({ type: 'external', table });
      }
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function probeStorage(storage) {
  if (!storage) return false;
  try {
    const probe = '__dmc_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
