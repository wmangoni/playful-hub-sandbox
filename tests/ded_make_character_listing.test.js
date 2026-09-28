/**
 * Testes unitários de listagem do D&D Make Character: paginação no padrão do
 * CI_Pagination (CodeIgniter 3), busca sem acento e ordenação.
 * Executar: node tests/ded_make_character_listing.test.js
 */
const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const mod = file => import(pathToFileURL(path.join(__dirname, '..', 'ded_make_character', 'js', ...file.split('/'))).href);

async function run() {
  const { paginationModel, paginate, filterRows, sortRows, searchFieldsOf } = await mod('core/listing.js');
  const { default: talentos } = await mod('entities/talentos.js');
  const { default: races } = await mod('entities/races.js');
  let passed = 0;
  const test = (name, fn) => {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  };

  console.log('--- Listagem (paginação CI3, busca, ordenação) ---');

  test('sem links quando há uma página ou menos', () => {
    assert.strictEqual(paginationModel(1, 1, 5), null);
    assert.strictEqual(paginationModel(1, 0, 5), null);
  });

  test('janela de números segue start/end do CI_Pagination', () => {
    // lista de 13 páginas com num_links 2 (como talentos antes da TASK_004)
    assert.deepStrictEqual(paginationModel(1, 13, 2).numbers, [1, 2, 3]);
    assert.deepStrictEqual(paginationModel(3, 13, 2).numbers, [2, 3, 4, 5]);
    assert.deepStrictEqual(paginationModel(7, 13, 2).numbers, [6, 7, 8, 9]);
    assert.deepStrictEqual(paginationModel(13, 13, 2).numbers, [12, 13]);
    // pericias: 45 linhas → 3 páginas, num_links 5
    assert.deepStrictEqual(paginationModel(2, 3, 5).numbers, [1, 2, 3]);
  });

  test('Primeira/Última/Anterior/Próxima aparecem nas mesmas condições do original', () => {
    const p1 = paginationModel(1, 13, 2);
    assert.deepStrictEqual([p1.first, p1.prev, p1.next, p1.last], [null, null, 2, 13]);
    const p3 = paginationModel(3, 13, 2);
    assert.strictEqual(p3.first, null, 'cur > num_links+1 é falso em 3');
    const p4 = paginationModel(4, 13, 2);
    assert.strictEqual(p4.first, 1);
    const p11 = paginationModel(11, 13, 2);
    assert.strictEqual(p11.last, null, 'cur+num_links < pages é falso em 11');
    const p13 = paginationModel(13, 13, 2);
    assert.deepStrictEqual([p13.next, p13.last], [null, null]);
  });

  test('paginate fatia 20 por página e limita a página ao intervalo', () => {
    const rows = Array.from({ length: 45 }, (_, i) => ({ id: i + 1 }));
    const last = paginate(rows, 3);
    assert.deepStrictEqual([last.current, last.pages, last.items.length, last.offset], [3, 3, 5, 40]);
    assert.strictEqual(paginate(rows, 99).current, 3);
    assert.strictEqual(paginate(rows, 'abc').current, 1);
    assert.strictEqual(paginate([], 1).pages, 1);
  });

  test('talentos ordenados por nome (pt-BR) e demais por id', () => {
    const sorted = sortRows([{ id: 1, nome: 'ÚLTIMO' }, { id: 2, nome: 'ábaco' }, { id: 3, nome: 'Bravura' }], talentos);
    assert.deepStrictEqual(sorted.map(r => r.id), [2, 3, 1]);
    const byId = sortRows([{ id: 3 }, { id: 1 }, { id: 2 }], races);
    assert.deepStrictEqual(byId.map(r => r.id), [1, 2, 3]);
  });

  test('busca "contém" sem diferenciar maiúsculas e acentos, por coluna ou em todos os campos', () => {
    const ctx = { lookups: { classes: new Map([['11', { id: 11, nome: 'Mago' }]]) } };
    const rows = [
      { id: 1, nome: 'Anão', bonus: 2, atributo_bonus: 'CON', tamanho: 'Médio', classe_favorecida: null },
      { id: 2, nome: 'Elfo', bonus: 2, atributo_bonus: 'DES', tamanho: 'Medio', classe_favorecida: 11 },
    ];
    assert.deepStrictEqual(filterRows(rows, { entity: races, ctx, term: 'anao' }).map(r => r.id), [1]);
    assert.deepStrictEqual(filterRows(rows, { entity: races, ctx, term: 'MEDIO' }).map(r => r.id), [1, 2]);
    assert.deepStrictEqual(filterRows(rows, { entity: races, ctx, field: 'classe_favorecida', term: 'mago' }).map(r => r.id), [2]);
    assert.deepStrictEqual(filterRows(rows, { entity: races, ctx, field: 'classe_favorecida', term: 'qualquer' }).map(r => r.id), [1]);
    assert.deepStrictEqual(filterRows(rows, { entity: races, ctx, field: 'nome', term: 'con' }).map(r => r.id), [], 'coluna específica não olha outras');
    assert.strictEqual(filterRows(rows, { entity: races, ctx, term: '  ' }).length, 2);
  });

  test('seletor "Filtrar por" oferece as colunas do schema', () => {
    assert.deepStrictEqual(searchFieldsOf(talentos).map(f => f.key), ['id', 'nome', 'tipo', 'requisitos', 'beneficio', 'normal']);
  });

  console.log(`\n${passed} testes passaram.`);
}

run().catch(err => {
  console.error('❌ FALHA:', err);
  process.exit(1);
});
