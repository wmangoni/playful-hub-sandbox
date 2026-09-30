/**
 * Testes da Arena (TASK_006, E5): nível de encontro 3.0 da dica de dificuldade e a montagem da
 * luta guardada na URL. A tela em si é coberta pelo E2E (qa_ded_make_character.test.js).
 * Executar: node tests/ded_make_character_arena.test.js
 */
const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.join(__dirname, '..', 'ded_make_character');
const load = rel => import(pathToFileURL(path.join(root, ...rel.split('/'))).href);

async function run() {
  const { nivelDeEncontro, dificuldade } = await load('js/rules/encontro30.js');
  const S = await load('js/pages/arena-setup.js');
  let passed = 0;
  const test = (name, fn) => {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  };
  const perto = (a, b) => Math.abs(a - b) < 1e-9;

  console.log('--- Arena ---');

  test('nível de encontro (3.0): um vale o ND; dois iguais, ND + 2; quatro iguais, ND + 4', () => {
    assert.ok(perto(nivelDeEncontro([5]), 5));
    assert.ok(perto(nivelDeEncontro([5, 5]), 7));
    assert.ok(perto(nivelDeEncontro([2, 2, 2, 2]), 6));
    // mistura: o maior pesa mais (ND 7 + dois ND 2 fica pouco acima de 7)
    const misto = nivelDeEncontro([7, 2, 2]);
    assert.ok(misto > 7 && misto < 8, String(misto));
    assert.strictEqual(nivelDeEncontro([]), null);
  });

  test('dificuldade para o lado A pela diferença de NE: fácil, justa, difícil, mortal', () => {
    assert.strictEqual(dificuldade(8, 5).nivel, 'facil');
    assert.strictEqual(dificuldade(5, 6).nivel, 'justa');
    assert.strictEqual(dificuldade(5, 5).nivel, 'justa');
    assert.strictEqual(dificuldade(5, 7).nivel, 'dificil');
    assert.strictEqual(dificuldade(5, 9).nivel, 'mortal');
    assert.strictEqual(dificuldade(5, 9).rotulo, 'mortal');
    assert.strictEqual(dificuldade(null, 3), null);
  });

  const existe = id => ['ogro', 'troll', 'tarrasque', 'ha-lisandra'].includes(id);

  test('lê a montagem da query: quantidades, ids desconhecidos ignorados e contados, padrões', () => {
    const m = S.lerMontagem(new URLSearchParams('a=ogro*2,ha-lisandra&b=troll,sumiu*3&semente=dragao-42'), existe);
    assert.deepStrictEqual(m.A, [{ ref: 'ogro', qtd: 2 }, { ref: 'ha-lisandra', qtd: 1 }]);
    assert.deepStrictEqual(m.B, [{ ref: 'troll', qtd: 1 }]);
    assert.strictEqual(m.ignorados, 1);
    assert.strictEqual(m.semente, 'dragao-42');
    assert.strictEqual(m.distancia, 9);
    assert.strictEqual(m.limite, 50);
    const vazio = S.lerMontagem(new URLSearchParams(''), existe);
    assert.deepStrictEqual([vazio.A, vazio.B, vazio.semente, vazio.ignorados], [[], [], null, 0]);
  });

  test('limites: no máximo 10 por lado; distância em passos de 1,5 m entre 0 e 120; rodadas entre 1 e 200', () => {
    const m = S.lerMontagem(new URLSearchParams('a=ogro*8,troll*5&dist=10&limite=999'), existe);
    assert.strictEqual(S.totalDoLado(m.A), 10);
    assert.deepStrictEqual(m.A, [{ ref: 'ogro', qtd: 8 }, { ref: 'troll', qtd: 2 }]);
    assert.strictEqual(m.excedentes, 3, 'o que passou do limite é contado para o aviso');
    const zero = S.lerMontagem(new URLSearchParams('a=ogro*0,troll*50'), existe);
    assert.deepStrictEqual(zero.A, [{ ref: 'troll', qtd: 10 }], 'quantidade 0 ignora a entrada');
    assert.strictEqual(zero.excedentes, 40);
    assert.strictEqual(m.distancia, 10.5);
    assert.strictEqual(m.limite, 200);
    assert.strictEqual(S.distanciaValida('4,5'), 4.5);
    assert.strictEqual(S.distanciaValida('-3'), 0);
    assert.strictEqual(S.distanciaValida('500'), 120);
    assert.strictEqual(S.distanciaValida(''), 9);
    assert.strictEqual(S.distanciaValida('abc'), 9);
    assert.strictEqual(S.rodadasValidas('0'), 1);
    assert.strictEqual(S.rodadasValidas(''), 50, 'campo apagado volta ao padrão, como a distância');
    assert.strictEqual(S.rodadasValidas('x'), 50);
    assert.strictEqual(S.sementeValida('  a'.padEnd(60, 'b')).length, 40);
  });

  test('adicionar e mudar a quantidade respeitam o limite do lado; quantidade 0 remove', () => {
    const lado = [];
    for (let i = 0; i < 12; i++) S.adicionar(lado, i < 6 ? 'ogro' : 'troll');
    assert.deepStrictEqual(lado, [{ ref: 'ogro', qtd: 6 }, { ref: 'troll', qtd: 4 }]);
    assert.strictEqual(S.adicionar(lado, 'tarrasque'), false);
    S.mudarQuantidade(lado, 'troll', 9); // só cabem 4
    assert.deepStrictEqual(lado[1], { ref: 'troll', qtd: 4 });
    S.mudarQuantidade(lado, 'ogro', 0);
    assert.deepStrictEqual(lado, [{ ref: 'troll', qtd: 4 }]);
  });

  test('escreve a query só com o que difere do padrão, e ler de volta dá a mesma montagem', () => {
    const montagem = { A: [{ ref: 'ogro', qtd: 2 }], B: [{ ref: 'troll', qtd: 1 }, { ref: 'tarrasque', qtd: 1 }], distancia: 9, limite: 50, semente: '123456' };
    const q = S.escreverMontagem(montagem);
    assert.deepStrictEqual(q, { a: 'ogro*2', b: 'troll,tarrasque', dist: null, limite: null, semente: '123456' });
    const params = new URLSearchParams(Object.entries(q).filter(([, v]) => v != null));
    const volta = S.lerMontagem(params, existe);
    assert.deepStrictEqual({ A: volta.A, B: volta.B, distancia: volta.distancia, limite: volta.limite, semente: volta.semente }, montagem);
    assert.deepStrictEqual(S.escreverMontagem({ ...montagem, distancia: 30, limite: 20 }).dist, '30');
  });

  test('semente nova: 6 dígitos', () => {
    assert.strictEqual(S.novaSemente(() => 0), '100000');
    assert.strictEqual(S.novaSemente(() => 0.999999), '999999');
    assert.match(S.novaSemente(), /^\d{6}$/);
  });

  console.log(`\n${passed} testes passaram.`);
}

run().catch(err => {
  console.error('❌ FALHA:', err);
  process.exit(1);
});
