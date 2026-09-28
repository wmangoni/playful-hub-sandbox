/**
 * Testes unitários do DataStore copy-on-write do D&D Make Character.
 * Executar: node tests/ded_make_character_store.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const DATA_DIR = path.join(__dirname, '..', 'ded_make_character', 'data');
const TABLES = ['classes', 'races', 'pericias', 'talentos', 'personagens'];

function memoryStorage({ quota = Infinity } = {}) {
  const map = new Map();
  return {
    map,
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      const used = [...map.entries()].reduce((n, [k, v]) => (k === key ? n : n + k.length + v.length), 0);
      if (key !== '__dmc_probe__' && used + key.length + String(value).length > quota) {
        const err = new Error('QuotaExceededError');
        err.name = 'QuotaExceededError';
        throw err;
      }
      map.set(key, String(value));
    },
    removeItem: key => map.delete(key),
  };
}

const fetchJson = async url => JSON.parse(fs.readFileSync(new URL(url), 'utf8'));
const dataUrl = pathToFileURL(DATA_DIR + path.sep).href;

async function run() {
  const { createStore, StoreError } = await import(pathToFileURL(path.join(__dirname, '..', 'ded_make_character', 'js', 'core', 'store.js')).href);
  const make = (opts = {}) => createStore({ dataUrl, tables: TABLES, fetchJson, storage: memoryStorage(), ...opts });
  const originalClassesText = fs.readFileSync(path.join(DATA_DIR, 'classes.json'), 'utf8');
  let passed = 0;
  const test = async (name, fn) => {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  };

  console.log('--- DataStore copy-on-write ---');

  await test('lê do JSON original sem gravar nada no storage', async () => {
    const storage = memoryStorage();
    const store = make({ storage });
    const rows = await store.all('classes');
    assert.strictEqual(rows.length, 15);
    assert.strictEqual(rows[0].nome, 'Bárbaro');
    assert.strictEqual(storage.map.size, 0);
    assert.strictEqual(store.isModified('classes'), false);
    assert.strictEqual((await store.info('classes')).source, 'original');
  });

  await test('primeira escrita copia o original para o storage e aplica a alteração na cópia', async () => {
    const storage = memoryStorage();
    const store = make({ storage });
    const events = [];
    store.subscribe(e => events.push(e));
    const row = await store.insert('classes', { id: 999, nome: 'Cavaleiro Rúnico', dv: 10, bba_tipo: 'bom', resistencia: 'fort', tipo: 'Prestígio', requisitos: null });
    assert.strictEqual(row.id, 16, 'id vem do AUTO_INCREMENT do dump, ignorando o id enviado');
    const copy = JSON.parse(storage.getItem('dmc:v1:classes'));
    assert.strictEqual(copy.rows.length, 16);
    assert.strictEqual(copy.autoIncrement, 17);
    assert.strictEqual(copy.seedVersion, 2, 'versão dos dados originais (TASK_002)');
    assert.ok(copy.copiedAt);
    assert.strictEqual(store.isModified('classes'), true);
    assert.deepStrictEqual(store.modifiedTables(), ['classes']);
    assert.strictEqual(events[0].firstCopy, true);
    assert.strictEqual(fs.readFileSync(path.join(DATA_DIR, 'classes.json'), 'utf8'), originalClassesText, 'JSON original intacto');
    const fresh = make();
    assert.strictEqual((await fresh.all('classes')).length, 15, 'outro storage continua vendo o original');
  });

  await test('update faz merge e remove não reaproveita ids', async () => {
    const store = make();
    await store.update('races', 2, { tamanho: 'Pequeno' });
    const anao = await store.get('races', 2);
    assert.strictEqual(anao.tamanho, 'Pequeno');
    assert.strictEqual(anao.nome, 'Anão');
    await store.remove('races', 7);
    assert.strictEqual(await store.get('races', 7), null);
    const novo = await store.insert('races', { nome: 'Tiefling' });
    assert.strictEqual(novo.id, 8);
    await store.remove('races', 8);
    const outro = await store.insert('races', { nome: 'Aasimar' });
    assert.strictEqual(outro.id, 9, 'AUTO_INCREMENT não volta após exclusão');
    await assert.rejects(store.update('races', 12345, { nome: 'x' }), err => err instanceof StoreError && err.code === 'NOT_FOUND');
    await assert.rejects(store.remove('races', 12345), err => err.code === 'NOT_FOUND');
  });

  await test('restaurar descarta a cópia local e volta aos originais', async () => {
    const storage = memoryStorage();
    const store = make({ storage });
    await store.remove('talentos', 1);
    await store.insert('pericias', { nome: 'Navegação' });
    assert.strictEqual((await store.all('talentos')).length, 319);
    store.restore('talentos');
    assert.strictEqual((await store.all('talentos')).length, 320);
    assert.deepStrictEqual(store.modifiedTables(), ['pericias']);
    store.restoreAll();
    assert.deepStrictEqual(store.modifiedTables(), []);
    assert.strictEqual(storage.map.size, 0);
  });

  await test('falha de quota lança StoreError e não altera os dados', async () => {
    const storage = memoryStorage({ quota: 100 });
    const store = make({ storage });
    await assert.rejects(store.insert('talentos', { nome: 'X' }), err => err instanceof StoreError && err.code === 'WRITE_FAILED');
    assert.strictEqual((await store.all('talentos')).length, 320);
    assert.strictEqual(store.isModified('talentos'), false);
  });

  await test('cópia corrompida é descartada e o original volta a ser usado', async () => {
    const storage = memoryStorage();
    storage.setItem('dmc:v1:classes', '{isto não é json');
    const store = make({ storage });
    const events = [];
    store.subscribe(e => events.push(e));
    const warn = console.warn;
    console.warn = () => {};
    try {
      assert.strictEqual((await store.all('classes')).length, 15);
    } finally {
      console.warn = warn;
    }
    assert.strictEqual(storage.getItem('dmc:v1:classes'), null);
    assert.strictEqual(events[0].type, 'corrupted');
  });

  await test('escritas concorrentes são serializadas', async () => {
    const store = make();
    const [a, b, c] = await Promise.all([
      store.insert('personagens', { nome: 'A' }),
      store.insert('personagens', { nome: 'B' }),
      store.insert('personagens', { nome: 'C' }),
    ]);
    assert.deepStrictEqual([a.id, b.id, c.id], [2, 3, 4]);
    assert.strictEqual((await store.all('personagens')).length, 4);
  });

  await test('leituras devolvem cópias defensivas', async () => {
    const store = make();
    const rows = await store.all('classes');
    rows[0].nome = 'Adulterado';
    assert.strictEqual((await store.get('classes', 1)).nome, 'Bárbaro');
  });

  await test('sem localStorage funciona em memória (persistent = false)', async () => {
    const store = make({ storage: null });
    assert.strictEqual(store.persistent, false);
    const created = await store.insert('personagens', { nome: 'Lidda' });
    const rows = await store.all('personagens');
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(created.id, 2, 'respeita AUTO_INCREMENT=2 do dump');
  });

  await test('tabela desconhecida e falha de carregamento geram StoreError', async () => {
    const store = make();
    await assert.rejects(store.all('magias_proibidas'), err => err.code === 'UNKNOWN_TABLE');
    const broken = make({ fetchJson: async () => { throw new Error('offline'); } });
    await assert.rejects(broken.all('classes'), err => err.code === 'LOAD_FAILED');
  });

  await test('evento storage de outra aba é repassado aos assinantes', async () => {
    const store = make();
    const events = [];
    store.subscribe(e => events.push(e));
    store.handleExternalChange('dmc:v1:races');
    store.handleExternalChange('outra-chave');
    store.handleExternalChange(null);
    assert.deepStrictEqual(events.map(e => [e.type, e.table]), [['external', 'races'], ['external', null]]);
  });

  console.log(`\n${passed} testes passaram.`);
}

run().catch(err => {
  console.error('❌ FALHA:', err);
  process.exit(1);
});
