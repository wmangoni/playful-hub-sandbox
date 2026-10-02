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

  test('Holy Avenger: as 54 fichas do livro Tormenta D20 – Holy Avenger (TASK_008), com as versões de cada personagem', () => {
    const ha = catalogo.holy_avenger;
    assert.strictEqual(ha.length, 54);
    const por = id => ha.find(c => c.id === id);
    for (const c of ha) {
      assert.ok(c.id.startsWith('ha-'), c.id);
      assert.strictEqual(c.categoria, 'holy_avenger');
      // personagem com classe, ou criatura sem classe (Helena, Aspis, Raschid…), com o nível nos DV
      assert.ok(c.classes.length > 0 || c.tipo !== 'Humanoide', `${c.id} sem classes`);
      assert.ok(c.nivel >= c.classes.reduce((s, k) => s + k.nivel, 0), `${c.id}: nível ${c.nivel}`);
      assert.ok(/tormenta\.fandom\.com/.test(c.fonte.url), `${c.id}: ${c.fonte.url}`);
      // a origem é a ficha oficial do livro; o Mestre Arsenal, que o livro não traz, vem da ficha d20 da wiki
      assert.ok(/Holy Avenger \(Talismã\), p\. \d+/.test(c.fonte.referencia) || c.id === 'ha-mestre-arsenal', `${c.id}: ${c.fonte.referencia}`);
    }
    // uma entrada por ficha; a primeira ficha de cada um fica com o id que já existia
    const versoes = prefixo => ha.filter(c => c.id === prefixo || c.id.startsWith(`${prefixo}-`)).length;
    assert.deepStrictEqual(['ha-lisandra', 'ha-tork', 'ha-sandro', 'ha-niele', 'ha-paladino'].map(versoes), [5, 4, 3, 2, 6]);
    assert.deepStrictEqual(['ha-lisandra', 'ha-tork', 'ha-sandro-galtran', 'ha-niele'].map(id => [por(id).nome, por(id).nd]),
      [['Lisandra, Druida', 4], ['Tork, Troglodita Anão', 5], ['Sandro Galtran, Ladrão', 3], ['Niele, Arquimaga', 3]]);
    // ND fracionário, como no livro
    assert.deepStrictEqual([por('ha-petra-tpish').nd, por('ha-hipolita').nd], [0.5, 0.5]);
    // os mais fortes passam do 20: Tarso (43 DV de dragão + Mago 20) tem nível 63 e ND 50
    assert.deepStrictEqual([por('ha-tarso').nd, por('ha-tarso').nivel], [50, 63]);
  });

  test('Paladino de Arton: a ficha das lendas e as 5 formas oficiais do livro', () => {
    const ids = ['ha-paladino-de-arton', 'ha-paladino-desperto', 'ha-paladino-matador-de-dragoes', 'ha-paladino-completo', 'ha-paladino-avancado', 'ha-paladino-extremo'];
    const formas = ids.map(id => catalogo.holy_avenger.find(c => c.id === id));
    assert.ok(formas.every(Boolean), 'as 6 fichas existem');
    assert.deepStrictEqual(formas.map(c => [c.nd, c.nivel, c.classes[0].nivel, c.tamanho, c.tendencia]), [
      [22, 20, 20, 'Médio', 'LB'], [20, 19, 4, 'Médio', 'LN'], [25, 24, 9, 'Médio', 'LN'], [36, 35, 20, 'Médio', 'LN'], [40, 40, 20, 'Imenso', 'LN'], [55, 50, 20, 'Colossal', 'LN'],
    ]);
    // os DV extraplanares dos rubis somam aos níveis de paladino
    assert.deepStrictEqual(formas.map(c => c.dados_vida), ['20d10+60', '15d8+4d10+114', '15d8+9d10+144', '15d8+20d10+210', '20d8+20d10+480', '30d8+20d10+700']);
    assert.deepStrictEqual(formas.map(c => c.reducao_dano && `${c.reducao_dano.valor}/${c.reducao_dano.exceto}`), [null, '30/+5', '30/+5', '30/+5', '15/+3', '40/+5']);
    const efeitos = c => [...c.ataques_especiais, ...c.qualidades_especiais].map(e => e.mecanica?.efeito).filter(Boolean);
    for (const c of formas) {
      assert.ok(efeitos(c).includes('retribuicao'), `${c.id}: Retribuição`);
      assert.ok(efeitos(c).includes('imunidade-magia'), `${c.id}: imunidade a magia`);
      assert.doesNotMatch(c.adaptacao || '', /16 \+ n/, `${c.id}: nada da adaptação antiga (nível 16 + rubis)`);
    }
    // a ficha das lendas: PV 164 do livro, Car 17, Destruir o Mal +3/+20, cura pelas mãos 60
    const [lendas] = formas;
    assert.deepStrictEqual([lendas.pv, lendas.atributos.car], [164, 17]);
    const destruir = lendas.ataques_especiais.find(e => e.id === 'destruir-o-mal').mecanica;
    assert.deepStrictEqual([destruir.bonus_ataque, destruir.bonus_dano], [3, 20]);
    assert.strictEqual(lendas.qualidades_especiais.find(e => e.id === 'cura-pelas-maos').mecanica.pv_por_dia, 60);
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

    // o teto de ND: 20 para monstro, 80 para Holy Avenger; ND fracionário só em Holy Avenger;
    // as classes não passam do nível (DV raciais à parte)
    const ndAlto = clone(catalogo.monstros);
    ndAlto.find(m => m.id === 'tarrasque').nd = 21;
    assert.ok(validarSecao(ndAlto, 'monstros').erros.some(e => e.includes('nd 1–20')));
    const ndMeio = clone(catalogo.monstros);
    ndMeio.find(m => m.id === 'carnical').nd = 0.5;
    assert.ok(validarSecao(ndMeio, 'monstros').erros.some(e => e.includes('nd 1–20')));
    const haAlto = clone(catalogo.holy_avenger);
    haAlto.find(c => c.id === 'ha-paladino-extremo').nd = 81;
    haAlto.find(c => c.id === 'ha-petra-tpish').nd = 0.4;
    const errosAlto = validarSecao(haAlto, 'holy_avenger').erros;
    assert.ok(errosAlto.some(e => e.includes('ha-paladino-extremo: nd 1–80')), errosAlto.join(' | '));
    assert.ok(errosAlto.some(e => e.includes('ha-petra-tpish: nd 1–80 ou fração')), errosAlto.join(' | '));
    const classes = clone(catalogo.holy_avenger);
    classes.find(c => c.id === 'ha-tarso').classes[0].nivel = 64;
    assert.ok(validarSecao(classes, 'holy_avenger').erros.some(e => e.includes('soma dos níveis de classe > nivel')));
    const condicao = clone(catalogo.holy_avenger);
    condicao.find(c => c.id === 'ha-tork-guerreiro-cego').condicoes_iniciais = ['cegueta'];
    assert.ok(validarSecao(condicao, 'holy_avenger').erros.some(e => e.includes('condicoes_iniciais')));
    const semClasse = clone(catalogo.holy_avenger);
    semClasse.find(c => c.id === 'ha-anne').classes = [];
    assert.ok(validarSecao(semClasse, 'holy_avenger').avisos.some(a => a.includes('ha-anne: humanoide sem classes')));
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
