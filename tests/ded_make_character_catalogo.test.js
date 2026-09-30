/**
 * Testes do catálogo de combate (monstros do SRD 3.0 e personagens de Holy Avenger).
 * Executar: node tests/ded_make_character_catalogo.test.js
 */
const assert = require('assert');
const path = require('path');

const root = path.join(__dirname, '..', 'ded_make_character');
const catalogo = require(path.join(root, 'data', 'catalogo-combate.json'));
const { validarCatalogo, validarSecao, EFEITOS } = require(path.join(root, 'tools', 'validar-catalogo.js'));

const clone = obj => JSON.parse(JSON.stringify(obj));

function run() {
  let passed = 0;
  const test = (name, fn) => {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  };

  console.log('--- Catálogo de combate ---');

  test('o catálogo inteiro passa na validação do formato', () => {
    const { erros, avisos } = validarCatalogo(catalogo);
    for (const a of avisos) console.log(`    aviso: ${a}`);
    assert.deepStrictEqual(erros, []);
  });

  test('20 monstros, um por ND de 1 a 20, com o Tarrasque no 20', () => {
    assert.strictEqual(catalogo.monstros.length, 20);
    assert.deepStrictEqual(catalogo.monstros.map(m => m.nd).sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i + 1));
    const t = catalogo.monstros.find(m => m.nd === 20);
    assert.strictEqual(t.id, 'tarrasque');
    assert.strictEqual(t.tamanho, 'Colossal');
  });

  test('Tarrasque com os números do SRD 3.0', () => {
    const t = catalogo.monstros.find(m => m.id === 'tarrasque');
    assert.strictEqual(t.dados_vida, '48d10+576');
    assert.strictEqual(t.pv, 840);
    assert.deepStrictEqual([t.ca.total, t.ca.toque, t.ca.surpresa], [35, 5, 32]);
    assert.deepStrictEqual(t.reducao_dano, { valor: 25, exceto: '+5' });
    assert.strictEqual(t.resistencia_magia, 32);
    assert.strictEqual(t.regeneracao.valor, 40);
    const mordida = t.ataque_total.find(a => a.nome === 'Mordida');
    assert.deepStrictEqual([mordida.bonus, mordida.dano, mordida.critico.margem, mordida.critico.multiplicador], [57, '4d8+17', 18, 3]);
    const efeitos = [...t.ataques_especiais, ...t.qualidades_especiais].map(e => e.mecanica?.efeito);
    for (const ef of ['engolir', 'agarrar-aprimorado', 'presenca-aterradora']) assert.ok(efeitos.includes(ef), ef);
  });

  test('monstros do SRD 3.0: RD no formato 3.0 e fonte no dragon.ee (Product Identity é barrado pelo validador)', () => {
    for (const m of catalogo.monstros) {
      if (m.reducao_dano) assert.ok(!/epic|épic/i.test(m.reducao_dano.exceto), `${m.id}: RD ${m.reducao_dano.exceto}`);
      assert.ok(m.fonte.url.startsWith('http://www.dragon.ee/30srd/'), `${m.id}: ${m.fonte.url}`);
      assert.strictEqual(m.nivel, m.nd);
    }
  });

  test('Holy Avenger: personagens com classes, nível até 20 e fonte na wiki', () => {
    const ha = catalogo.holy_avenger;
    assert.ok(ha.length >= 12, `${ha.length} personagens`);
    for (const c of ha) {
      assert.ok(c.id.startsWith('ha-'), c.id);
      assert.strictEqual(c.categoria, 'holy_avenger');
      assert.ok(c.classes.length > 0, `${c.id} sem classes`);
      assert.ok(c.nivel >= 1 && c.nivel <= 20, `${c.id}: nível ${c.nivel}`);
      assert.ok(/tormenta\.fandom\.com/.test(c.fonte.url), `${c.id}: ${c.fonte.url}`);
    }
    const nomes = ha.map(c => c.nome);
    for (const heroi of ['Sandro Galtran', 'Lisandra', 'Tork']) assert.ok(nomes.includes(heroi), heroi);
  });

  test('o validador pega os erros que deve pegar', () => {
    const semTarrasque = clone(catalogo.monstros).filter(m => m.id !== 'tarrasque');
    assert.ok(validarSecao(semTarrasque, 'monstros').erros.some(e => e.includes('faltam monstros de ND 20')));

    const dadoRuim = clone(catalogo.monstros);
    dadoRuim[0].ataques[0].dano = '2d6 + 1d6 fogo';
    assert.ok(validarSecao(dadoRuim, 'monstros').erros.some(e => e.includes('fora do formato')));

    const repetido = clone(catalogo);
    repetido.holy_avenger[0].id = repetido.monstros[0].id;
    assert.ok(validarCatalogo(repetido).erros.some(e => e.includes('ids repetidos')));

    const rd35 = clone(catalogo.monstros);
    rd35.find(m => m.id === 'tarrasque').reducao_dano = { valor: 15, exceto: 'epic' };
    assert.ok(validarSecao(rd35, 'monstros').avisos.some(a => a.includes('parece da 3.5')));

    const efeitoFantasma = clone(catalogo.monstros);
    efeitoFantasma[1].ataques[0].efeitos = ['nao-existe'];
    assert.ok(validarSecao(efeitoFantasma, 'monstros').erros.some(e => e.includes('"nao-existe"')));

    const multiclasse = clone(catalogo.holy_avenger);
    multiclasse[0].dados_vida = '10d10+10d8+60';
    assert.deepStrictEqual(validarSecao(multiclasse, 'holy_avenger').erros, []);
  });

  test('o validador pega os erros de mecânica, listas fechadas e regras do formato', () => {
    const especiaisDe = c => [...c.ataques_especiais, ...c.qualidades_especiais];
    const achar = (secao, pred) => {
      const lista = clone(catalogo[secao]);
      const c = lista.find(pred);
      assert.ok(c, 'combatente para o teste não encontrado');
      return { lista, c };
    };
    const pega = (secao, lista, trecho) => {
      const { erros } = validarSecao(lista, secao);
      assert.ok(erros.some(e => e.includes(trecho)), `esperava um erro com "${trecho}"; veio: ${erros.slice(0, 3).join(' | ')}`);
    };
    const comEfeito = efeito => c => especiaisDe(c).some(e => e.mecanica?.efeito === efeito);
    const doEfeito = (c, efeito) => especiaisDe(c).find(e => e.mecanica?.efeito === efeito);

    let t = achar('monstros', comEfeito('sopro'));
    delete doEfeito(t.c, 'sopro').mecanica.cd;
    pega('monstros', t.lista, 'sopro sem "cd"');

    t = achar('monstros', comEfeito('veneno'));
    delete doEfeito(t.c, 'veneno').mecanica.inicial;
    pega('monstros', t.lista, 'veneno sem "inicial"');

    t = achar('monstros', comEfeito('veneno'));
    doEfeito(t.c, 'veneno').mecanica.gatilho = ['Ataque Que Não Existe'];
    pega('monstros', t.lista, 'não é um ataque do combatente');

    t = achar('monstros', c => c.ataques.length > 0);
    t.c.ataques[0].magico = 'sim';
    pega('monstros', t.lista, 'magico "sim"');

    t = achar('monstros', c => c.ataques.length > 0);
    t.c.ataques[0].critico.margem = 16;
    pega('monstros', t.lista, 'critico');

    t = achar('monstros', c => c.magias && c.magias.atributo);
    t.c.magias.cd_base += 1;
    pega('monstros', t.lista, 'cd_base');

    t = achar('monstros', c => c.id === 'tarrasque');
    t.c.agarrar -= 1;
    pega('monstros', t.lista, 'agarrar');

    t = achar('monstros', c => especiaisDe(c).length >= 2);
    especiaisDe(t.c)[1].id = especiaisDe(t.c)[0].id;
    pega('monstros', t.lista, 'ids de especial repetidos');

    t = achar('monstros', comEfeito('presenca-aterradora'));
    doEfeito(t.c, 'presenca-aterradora').mecanica.condicao = 'assustadinho';
    pega('monstros', t.lista, 'fora da lista');

    t = achar('monstros', c => c.imunidades.length > 0);
    t.c.imunidades.push('sono mágico');
    pega('monstros', t.lista, 'imunidade "sono mágico"');

    t = achar('holy_avenger', c => c.ca);
    t.c.ca.composicao += ', +1 Esquiva';
    pega('holy_avenger', t.lista, 'Esquiva');

    t = achar('monstros', c => c.nd === 1);
    t.c.nome_original = 'Mind Flayer';
    pega('monstros', t.lista, 'Product Identity');

    t = achar('holy_avenger', c => c.talentos.length > 0);
    t.c.talentos.push('Trespassar Aprimorado');
    pega('holy_avenger', t.lista, 'não existe no compêndio');

    t = achar('monstros', comEfeito('sopro'));
    doEfeito(t.c, 'sopro').mecanica.danos = '10d10';
    pega('monstros', t.lista, 'campo "danos" fora do formato');

    const comBonus = c => (c.magias?.lista || []).some(s => s.mecanica?.bonus);
    t = achar('holy_avenger', comBonus);
    t.c.magias.lista.find(s => s.mecanica?.bonus).mecanica.bonus.ca_magica = 2;
    pega('holy_avenger', t.lista, 'bonus.ca_magica fora da lista');

    t = achar('monstros', comEfeito('presenca-aterradora'));
    doEfeito(t.c, 'presenca-aterradora').mecanica.afeta = { dv_minimo: 3 };
    pega('monstros', t.lista, 'afeta.dv_minimo fora da lista');

    // tendência: sempre com eixo, siglas do eixo, e sem misturar afeta com dano por tendência
    const magiaCom = pred => c => (c.magias?.lista || []).some(s => s.mecanica && pred(s.mecanica));
    const aMagia = (c, pred) => c.magias.lista.find(s => s.mecanica && pred(s.mecanica)).mecanica;
    t = achar('monstros', comEfeito('presenca-aterradora'));
    doEfeito(t.c, 'presenca-aterradora').mecanica.afeta = { tendencia: ['N', 'M'] };
    pega('monstros', t.lista, 'afeta.tendencia fora da lista');
    t = achar('monstros', comEfeito('presenca-aterradora'));
    doEfeito(t.c, 'presenca-aterradora').mecanica.afeta = { moral: ['L'] };
    pega('monstros', t.lista, 'siglas do eixo moral');
    t = achar('monstros', magiaCom(m => m.dano_por_tendencia));
    delete aMagia(t.c, m => m.dano_por_tendencia).dano_por_tendencia.eixo;
    pega('monstros', t.lista, 'precisa de "eixo"');
    t = achar('monstros', magiaCom(m => m.dano_por_tendencia));
    aMagia(t.c, m => m.dano_por_tendencia).afeta = { moral: ['B'] };
    pega('monstros', t.lista, 'a tendência não vai em afeta');

    // campos fora do formato fora da mecânica também são erro
    t = achar('holy_avenger', c => c.ataques.some(a => a.dano_extra?.length));
    t.c.ataques.find(a => a.dano_extra?.length).dano_extra[0].condicao = 'só contra malignos';
    pega('holy_avenger', t.lista, 'dano_extra com campo "condicao"');
    t = achar('monstros', c => c.ataques.length > 0);
    t.c.ataques[0].alcance = 3;
    pega('monstros', t.lista, 'ataque com campo "alcance"');
    t = achar('monstros', c => c.id === 'ogro');
    t.c.tesouro = 'padrão';
    pega('monstros', t.lista, 'campo "tesouro" fora do formato');
    t = achar('monstros', comEfeito('paralisia'));
    doEfeito(t.c, 'paralisia').mecanica.duracao = 'um tempinho';
    pega('monstros', t.lista, 'duracao "um tempinho"');

    // entradas quebradas viram erro, e não exceção
    const quebrado = clone(catalogo.monstros);
    quebrado.push(null);
    quebrado[0].ataques[0] = { nome: 'Sem tipo' };
    quebrado[1].ataques_especiais.push(null);
    const r = validarSecao(quebrado, 'monstros');
    assert.ok(r.erros.some(e => e.includes('combatente inválido')));
    assert.ok(r.erros.some(e => e.includes('especial inválido')));
    assert.ok(r.erros.some(e => e.includes('tipo "undefined"')));
  });

  test('a tabela de efeitos do formato bate com o EFEITOS do validador', () => {
    const doc = require('fs').readFileSync(path.join(root, 'tools', 'catalogo-combate.md'), 'utf8');
    const campos = txt => new Set([...txt.matchAll(/`([a-z_]+)`/g)].map(m => m[1]));
    const linhas = new Map();
    for (const linha of doc.split(/\r?\n/)) {
      const m = /^\| `([a-z-]+)` \| (.*?) \| (.*?) \| (.*?) \| .*\|$/.exec(linha);
      if (m) linhas.set(m[1], { obrigatorios: campos(m[2]), algum: campos(m[3]), opcionais: campos(m[4]) });
    }
    assert.deepStrictEqual([...linhas.keys()].sort(), Object.keys(EFEITOS).sort(), 'efeitos do documento');
    for (const [ef, r] of Object.entries(EFEITOS)) {
      const l = linhas.get(ef);
      assert.deepStrictEqual([...l.obrigatorios].sort(), [...r.obrigatorios].sort(), `${ef}: obrigatórios`);
      assert.deepStrictEqual([...l.algum].sort(), [...new Set((r.algum || []).flat())].sort(), `${ef}: pelo menos um de`);
      assert.deepStrictEqual([...l.opcionais].sort(), [...r.opcionais].sort(), `${ef}: opcionais (rode tools/gerar-tabela-efeitos.js)`);
    }
  });

  console.log(`\n${passed} testes passaram.`);
}

try {
  run();
} catch (err) {
  console.error('❌ FALHA:', err);
  process.exit(1);
}
