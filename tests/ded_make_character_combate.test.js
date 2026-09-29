/**
 * Testes do motor do simulador de combate (TASK_006 §9, regras 3.0).
 * Os dados são fixados com scriptedRng: cada teste diz exatamente o que cada d20/dado tira.
 * Executar: node tests/ded_make_character_combate.test.js
 */
const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const root = path.join(__dirname, '..', 'ded_make_character');
const load = rel => import(pathToFileURL(path.join(root, ...rel.split('/'))).href);
const cat = require(path.join(root, 'data', 'catalogo-combate.json'));

async function run() {
  const C = await load('js/rules/combat30.js');
  const SP = await load('js/rules/combat30-specials.js');
  const { scriptedRng, createRng, roll } = await load('js/rules/dice.js');
  const K = C.rules;
  const entrada = id => [...cat.monstros, ...cat.holy_avenger].find(e => e.id === id);
  const ficha = (id, over = {}) => Object.assign(C.fromCatalog(entrada(id)), over);
  /** Alvo neutro: um ogro de 1000 PV, sem RD nem especiais. */
  const boneco = (over = {}) => ficha('ogro', { nome: 'Boneco', pvMax: 1000, rd: null, especiais: [], talentos: [], ...over });
  const ataque = over => ({ nome: 'Golpe', tipo: 'corpo a corpo', bonus: 10, dano: '1d6+3', critico: { margem: 20, multiplicador: 2 }, tipo_dano: ['cortante'], natural: false, secundario: false, alcance_m: 1.5, incremento_m: null, magico: null, material: null, dano_extra: [], efeitos: [], ...over });
  /** Luta montada com os dados fixados; rodada 2, para ninguém estar surpreso. */
  function luta(ladoA, ladoB, dados = []) {
    const b = C.createBattle({ ladoA: [].concat(ladoA), ladoB: [].concat(ladoB), semente: 1 });
    b.rng = scriptedRng(dados, 99);
    b.rodada = 2;
    return b;
  }
  const textos = b => b.eventos.map(e => e.texto).join('\n');
  let passed = 0;
  const test = (name, fn) => {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  };

  console.log('--- Motor de combate 3.0 ---');

  test('dados: a mesma semente repete a sequência; o crítico multiplica dados e bônus fixos', () => {
    const a = createRng('dragão-42');
    const b = createRng('dragão-42');
    assert.deepStrictEqual([1, 2, 3, 4, 5].map(() => a.die(20)), [1, 2, 3, 4, 5].map(() => b.die(20)));
    const r = roll(scriptedRng([2, 3, 4]), '1d6+3', { vezes: 3, bonus: 1 });
    assert.strictEqual(r.total, 2 + 3 + 4 + 4 * 3);
  });

  test('1 natural sempre erra e 20 natural sempre acerta; o mesmo nos testes de resistência', () => {
    let b = luta(ficha('tarrasque'), boneco(), [1]);
    assert.strictEqual(K.golpe(b, b.get('A1'), b.get('B1'), ataque({ bonus: 99 })).acertou, false);
    b = luta(ficha('carnical'), ficha('tarrasque'), [20, 1, 1]); // 20 natural, confirmação 1, dano 1
    assert.strictEqual(K.golpe(b, b.get('A1'), b.get('B1'), ataque({ bonus: -5 })).acertou, true);
    b = luta(boneco(), boneco(), [20, 1]);
    assert.strictEqual(K.teste(b, b.get('B1'), 'fort', 100).passou, true);
    assert.strictEqual(K.teste(b, b.get('B1'), 'fort', 2).passou, false);
  });

  test('crítico (3.0): multiplica dados e bônus do dano; o dano extra de energia não; imune a crítico não multiplica', () => {
    // 20 ameaça, 15 confirma, dano 1d6+3 ×3 = (2+3+4) + 9, fogo 1d6 = 5 (sem multiplicar)
    let b = luta(boneco(), boneco(), [20, 15, 2, 3, 4, 5]);
    const alvo = b.get('B1');
    const r = K.golpe(b, b.get('A1'), alvo, ataque({ critico: { margem: 20, multiplicador: 3 }, dano_extra: [{ dano: '1d6', tipo: 'fogo' }] }));
    assert.ok(r.critico);
    assert.strictEqual(1000 - alvo.pv, 18 + 5);
    // golem de ferro (constructo): 20 natural acerta, mas sem rolar confirmação nem multiplicar
    b = luta(boneco(), ficha('golem-de-ferro', { rd: null, pvMax: 500 }), [20, 6]);
    const golem = b.get('B1');
    const r2 = K.golpe(b, b.get('A1'), golem, ataque({ bonus: 40, critico: { margem: 20, multiplicador: 3 } }));
    assert.strictEqual(r2.critico, false);
    assert.strictEqual(500 - golem.pv, 9);
    assert.match(textos(b), /imune a crítico/);
  });

  test('RD 3.0: +N pela melhoria; arma mágica vence x/prata; arma natural conta como a RD do dono; magia e energia ignoram', () => {
    const b = luta(ficha('tarrasque'), [boneco({ rd: { valor: 10, exceto: '+1' } }), boneco({ rd: { valor: 10, exceto: 'prata' } }), ficha('balor')]);
    const [um, prata, balor] = ['B1', 'B2', 'B3'].map(b.get);
    const quinze = over => ataque({ dano: '0d0+15', ...over });
    const bater = (alvo, a) => K.causarDano(b, alvo, [{ valor: 15, tipo: 'fisico' }], { fonte: b.get('A1'), ataque: a });
    assert.strictEqual(bater(um, quinze()), 5);
    assert.strictEqual(bater(um, quinze({ magico: '+1' })), 15);
    assert.strictEqual(bater(prata, quinze()), 5);
    assert.strictEqual(bater(prata, quinze({ material: 'prata' })), 15);
    assert.strictEqual(bater(prata, quinze({ magico: '+1' })), 15);
    // mordida do Tarrasque (RD 25/+5) contra a RD 30/+3 do Balor: conta como +5 e passa inteira
    const mordida = entrada('tarrasque').ataque_total.find(a => a.nome === 'Mordida');
    assert.strictEqual(K.causarDano(b, balor, [{ valor: 40, tipo: 'fisico' }], { fonte: b.get('A1'), ataque: mordida }), 40);
    assert.strictEqual(K.venceRD(b.get('A1'), { ...mordida, natural: false }, balor.rd), false);
    // magia (dano sem tipo) e energia ignoram a RD
    assert.strictEqual(K.causarDano(b, um, [{ valor: 15, tipo: 'fisico' }], { fonte: b.get('A1'), ignoraRD: true }), 15);
    assert.strictEqual(K.causarDano(b, um, [{ valor: 15, tipo: 'fogo' }], { fonte: b.get('A1'), ataque: quinze() }), 15);
  });

  test('resistência a energia vale por rodada (4 × 10 de fogo contra resistência 20 perdem só 20); imunidade anula', () => {
    const b = luta(boneco(), [boneco({ resistEnergia: { fogo: 20 } }), boneco({ imunidades: ['fogo'] })]);
    const [resiste, imune] = [b.get('B1'), b.get('B2')];
    let total = 0;
    for (let i = 0; i < 4; i++) total += K.causarDano(b, resiste, [{ valor: 10, tipo: 'fogo' }], { fonte: b.get('A1') });
    assert.strictEqual(total, 20);
    K.inicioDoTurno(b, resiste); // começa o turno dele: a resistência volta a valer inteira
    assert.strictEqual(K.causarDano(b, resiste, [{ valor: 10, tipo: 'fogo' }], { fonte: b.get('A1') }), 0);
    assert.strictEqual(K.causarDano(b, imune, [{ valor: 50, tipo: 'fogo' }], { fonte: b.get('A1') }), 0);
  });

  test('RM: vale contra magia e habilidade similar a magia (SM), não contra sopro (Sob) nem Ext', () => {
    const b = luta(boneco(), boneco({ rm: 30 }), [5, 5]);
    const [c, alvo] = [b.get('A1'), b.get('B1')];
    assert.strictEqual(K.venceRM(b, c, alvo, 20, 'Sob'), true);
    assert.strictEqual(K.venceRM(b, c, alvo, 20, 'Ext'), true);
    assert.strictEqual(b.rng.restantes(), 2); // Sob e Ext não rolam
    assert.strictEqual(K.venceRM(b, c, alvo, 20, 'magia'), false); // 5 + 20 = 25 < 30
    assert.strictEqual(K.venceRM(b, c, alvo, 20, 'SM'), false);
  });

  test('morrendo (3.0): 10% de estabilizar por rodada, senão perde 1 PV; com −10, morre', () => {
    const b = luta(boneco(), [boneco(), boneco()], [5, 50]);
    const [x, y] = [b.get('B1'), b.get('B2')];
    x.pv = -3;
    x.estado = 'morrendo';
    K.inicioDoTurno(b, x);
    assert.strictEqual(x.estado, 'estavel');
    assert.strictEqual(x.pv, -3);
    y.pv = -9;
    y.estado = 'morrendo';
    K.inicioDoTurno(b, y);
    assert.strictEqual(y.estado, 'morto');
    // incapacitado com 0 PV e morrendo abaixo de 0 (menos de 50 por vez: sem dano maciço)
    const b2 = luta(boneco(), boneco({ pvMax: 30 }));
    const z = b2.get('B1');
    K.causarDano(b2, z, [{ valor: 30, tipo: 'fogo' }], { fonte: b2.get('A1') });
    assert.strictEqual(z.estado, 'incapacitado');
    K.causarDano(b2, z, [{ valor: 4, tipo: 'fogo' }], { fonte: b2.get('A1') });
    assert.strictEqual(z.estado, 'morrendo');
    assert.strictEqual(C.podeLutar(z), false);
  });

  test('regeneração do troll: espada vira contusão e o derruba sem matar; fogo mata', () => {
    const b = luta(boneco(), ficha('troll'));
    const troll = b.get('B1');
    K.causarDano(b, troll, [{ valor: 100, tipo: 'fisico' }], { fonte: b.get('A1'), ataque: ataque() });
    assert.strictEqual(troll.pv, troll.pvMax);
    assert.strictEqual(troll.contusao, 100);
    assert.strictEqual(troll.estado, 'inconsciente');
    K.inicioDoTurno(b, troll);
    assert.strictEqual(troll.contusao, 95);
    troll.contusao = 64; // 64 − 5 = 59, abaixo dos 63 PV: volta a lutar
    K.inicioDoTurno(b, troll);
    assert.strictEqual(troll.estado, 'ativo');
    K.causarDano(b, troll, [{ valor: 100, tipo: 'fogo' }], { fonte: b.get('A1') });
    assert.strictEqual(troll.estado, 'morto');
  });

  test('Tarrasque engole quem agarrou, tritura por dentro e é cortado para a vítima sair', () => {
    const b = luta(ficha('tarrasque'), boneco(), [20, 1, 1, 1, 1, 1, 15, 3, 3]);
    const [t, alvo] = [b.get('A1'), b.get('B1')];
    t.agarrando = alvo.uid;
    alvo.agarradoPor = t.uid;
    assert.strictEqual(SP.forcedTurn(K, b, t), true); // teste de agarrar 20 contra 1: engole
    assert.strictEqual(alvo.engolidoPor, t.uid);
    assert.strictEqual(t.agarrando, null);
    SP.startOfTurn(K, b, t); // 2d8+8 (1+1+8) de esmagamento e 2d8+6 (1+1+6) de ácido
    assert.strictEqual(1000 - alvo.pv, 10 + 8);
    alvo.danoInterno = 45;
    SP.forcedTurn(K, b, alvo); // 15 + 8 contra CA interna 20, dano 2d6+7 = 13: passa dos 50 e sai
    assert.strictEqual(alvo.engolidoPor, null);
    assert.match(textos(b), /abre caminho e sai de dentro de Tarrasque/);
  });

  test('medo acumula (3.0): abalado + abalado = amedrontado (foge); + abalado = apavorado', () => {
    const b = luta(boneco(), boneco());
    const x = b.get('B1');
    assert.strictEqual(K.aplicarCondicao(b, x, 'abalado', 5), 'abalado');
    assert.strictEqual(K.aplicarCondicao(b, x, 'abalado', 5), 'amedrontado');
    assert.strictEqual(x.fugindo, true);
    assert.strictEqual(C.podeLutar(x), false);
    assert.strictEqual(K.aplicarCondicao(b, x, 'abalado', 5), 'apavorado');
    assert.deepStrictEqual(Object.keys(x.cond), ['apavorado']);
  });

  test('dano por tendência (Praga Profana): NB conta como boa no eixo moral; neutro leva metade; mau, nada', () => {
    const glabrezu = entrada('glabrezu');
    const praga = glabrezu.ataques_especiais.concat(glabrezu.qualidades_especiais).find(e => e.id === 'praga-profana').mecanica;
    // cada alvo: teste (1, falha), dano 5d8 (1 em cada) e, no bom, a duração do enjoo (1d4 = 2)
    const b = luta(ficha('glabrezu'), [boneco({ tendencia: 'NB' }), boneco({ tendencia: 'N' }), boneco({ tendencia: 'CM' })], [1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1]);
    const [bom, neutro, mau] = ['B1', 'B2', 'B3'].map(b.get);
    for (const x of [bom, neutro, mau]) K.efeitoComTeste(b, b.get('A1'), x, praga, { rotulo: 'Praga Profana' });
    assert.strictEqual(1000 - bom.pv, 5);
    assert.ok(bom.cond.enjoado);
    assert.strictEqual(1000 - neutro.pv, 2);
    assert.ok(!neutro.cond.enjoado);
    assert.strictEqual(mau.pv, 1000);
  });

  test('Blasfêmia só afeta quem não é mau (afeta com eixo moral)', () => {
    const balor = entrada('balor');
    const blas = balor.ataques_especiais.concat(balor.qualidades_especiais).find(e => e.id === 'blasfemia').mecanica;
    const b = luta(ficha('balor'), [boneco({ tendencia: 'CM' }), boneco({ tendencia: 'LB' })]);
    const [mau, bom] = [b.get('B1'), b.get('B2')];
    K.efeitoComTeste(b, b.get('A1'), mau, blas, { rotulo: 'Blasfêmia' });
    K.efeitoComTeste(b, b.get('A1'), bom, blas, { rotulo: 'Blasfêmia' });
    assert.deepStrictEqual(Object.keys(mau.cond), []);
    assert.ok(bom.cond.pasmo); // o boneco (ogro, 4 DV) também é enfraquecido
    assert.ok(bom.danoAtributo.for > 0);
  });

  test('área na distância abstrata: cone de 9 m pega até 4 criaturas Médias', () => {
    const b = C.createBattle({ ladoA: [ficha('dragao-vermelho-adulto')], ladoB: Array.from({ length: 6 }, () => ficha('carnical')), semente: 3 });
    const alvos = K.alvosNaArea(b, b.get('A1'), K.parseArea('cone', 9), b.get('B1'));
    assert.strictEqual(alvos.length, 4);
    assert.strictEqual(alvos[0].uid, 'B1');
    assert.deepStrictEqual(K.parseArea('esfera de 6 m de raio'), { forma: 'raio', tamanho: 6, copias: 1, noConjurador: false });
    assert.strictEqual(K.parseArea('linha de 1,5 m de largura').tamanho, 30);
  });

  test('presença aterradora: quem passa fica imune; com até 4 DV, falhar deixa apavorado; morto-vivo é imune', () => {
    let b = luta(ficha('dragao-vermelho-adulto'), ficha('carnical'), [20]);
    const d = b.get('A1');
    SP.onAttackAction(K, b, d);
    assert.deepStrictEqual(Object.keys(b.get('B1').cond), []);
    assert.ok(b.get('B1').imuneAPresenca.includes(d.uid));
    SP.onAttackAction(K, b, d); // não testa de novo
    assert.strictEqual(b.rng.restantes(), 0);
    b = luta(ficha('dragao-vermelho-adulto'), boneco(), [1, 3, 3, 3, 3]); // ogro de 4 DV
    SP.onAttackAction(K, b, b.get('A1'));
    assert.ok(b.get('B1').cond.apavorado);
    // morto-vivo é imune a medo (efeitos de ação mental): nem testa
    b = luta(ficha('dragao-vermelho-adulto'), ficha('carnical'), [1]);
    SP.onAttackAction(K, b, b.get('A1'));
    assert.deepStrictEqual(Object.keys(b.get('B1').cond), []);
  });

  test('ataque furtivo: só contra quem está sem a Destreza na CA e nunca contra imune a crítico', () => {
    const espada = entrada('ha-leon-galtran').ataques.find(a => a.tipo === 'corpo a corpo');
    let b = luta(ficha('ha-leon-galtran'), boneco(), [15]);
    b.rodada = 1; // o boneco ainda não agiu: está surpreso
    K.golpe(b, b.get('A1'), b.get('B1'), espada);
    assert.match(textos(b), /Ataque furtivo 5d6/);
    b = luta(ficha('ha-leon-galtran'), ficha('golem-de-ferro'), [15]);
    b.rodada = 1;
    K.golpe(b, b.get('A1'), b.get('B1'), { ...espada, bonus: 60 });
    assert.doesNotMatch(textos(b), /Ataque furtivo/);
  });

  test('veneno: Fortitude contra o inicial e, 10 rodadas depois, contra o secundário', () => {
    const b = luta(ficha('naga-guardia'), boneco(), [1, 4, 1, 3, 3]); // a naga não tem olhar (a medusa petrificaria no início do turno)
    const alvo = b.get('B1');
    SP.envenenar(K, b, b.get('A1'), alvo, { inicial: { atributo: 'for', dano: '1d6' }, secundario: { atributo: 'for', dano: '2d6' }, resistencia: 'fort', cd: 14, nome: 'veneno' });
    assert.strictEqual(alvo.danoAtributo.for, 4);
    SP.startOfTurn(K, b, alvo); // ainda não deu 1 minuto
    assert.strictEqual(alvo.danoAtributo.for, 4);
    b.rodada += 10; // 1 minuto depois, no turno do envenenado
    b.turno = b.ordem.indexOf(alvo.uid);
    SP.startOfTurn(K, b, alvo);
    assert.strictEqual(alvo.danoAtributo.for, 10);
  });

  test('espada vorpal do balor decepa no crítico confirmado', () => {
    const espada = entrada('balor').ataques.find(a => /vorpal/i.test(a.nome));
    const b = luta(ficha('balor'), boneco(), [20, 15]);
    K.golpe(b, b.get('A1'), b.get('B1'), espada);
    assert.strictEqual(b.get('B1').estado, 'morto');
    assert.match(textos(b), /decepa a cabeça/);
  });

  test('a mesma semente repete a luta; outra semente muda o registro', () => {
    const lutar = semente => {
      const b = C.createBattle({ ladoA: [ficha('ha-sandro-galtran'), ficha('ha-lisandra')], ladoB: [ficha('troll'), ficha('ogro')], semente });
      C.runBattle(b);
      return textos(b);
    };
    assert.strictEqual(lutar('arena-7'), lutar('arena-7'));
    assert.notStrictEqual(lutar('arena-7'), lutar('arena-8'));
  });

  test('sanidade em lote: o Tarrasque sempre vence o carniçal; lutas espelhadas ficam perto de 50%', () => {
    const t = ficha('tarrasque');
    const g = ficha('carnical');
    assert.strictEqual(C.simulate({ ladoA: [t], ladoB: [g] }, { vezes: 60, semente: 1 }).vitoriasA, 1);
    assert.strictEqual(C.simulate({ ladoA: [g], ladoB: [t] }, { vezes: 60, semente: 2 }).vitoriasB, 1);
    const o = ficha('ogro');
    const espelho = C.simulate({ ladoA: [o], ladoB: [o] }, { vezes: 600, semente: 3 });
    assert.ok(espelho.vitoriasA > 0.38 && espelho.vitoriasA < 0.62, `ogro × ogro: ${espelho.vitoriasA}`);
  });

  test('todo combatente do catálogo luta sem erro, e a luta sempre termina', () => {
    const todos = [...cat.monstros, ...cat.holy_avenger];
    const rivais = ['ogro', 'balor', 'ha-sandro-galtran', 'tarrasque'].map(id => ficha(id));
    let n = 0;
    for (const e of todos) for (const r of rivais) {
      const b = C.createBattle({ ladoA: [C.fromCatalog(e)], ladoB: [r], semente: ++n });
      const fim = C.runBattle(b);
      assert.ok(fim && fim.rodadas <= 50, `${e.id} × ${r.nome}`);
    }
    // lado com vários combatentes, nomes repetidos numerados
    const b = C.createBattle({ ladoA: [ficha('ogro'), ficha('ogro')], ladoB: [ficha('troll')], semente: 5 });
    assert.deepStrictEqual(b.combatentes.map(c => c.nome), ['Ogro 1', 'Ogro 2', 'Troll']);
    C.runBattle(b);
  });

  console.log(`\n${passed} testes passaram.`);
}

run().catch(err => {
  console.error('❌ FALHA:', err);
  process.exit(1);
});
